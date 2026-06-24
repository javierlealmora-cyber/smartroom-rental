# rules-31-webchat-channel.md — SmartConversations: Canal WebChat

## 1. Propósito

Este documento define todas las reglas que gobiernan el canal WebChat: creación y ciclo de vida de sesiones, autenticación de usuarios, validación de identidad, recepción de mensajes, comportamiento cuando el canal está desactivado y la contribución del canal al activity log de SmartRoom Core.

Las referencias de implementación para `conv-web-session`, `conv-web-message` y `conv_wc_configs` derivan de este documento.

---

## 2. Alcance

Este documento aplica a:

- EF `conv-web-session` (creación de sesión WebChat)
- EF `conv-web-message` (recepción de mensajes WebChat)
- Tabla `conv_wc_configs` (configuración del canal por tenant)
- Tabla `conv_sessions` (estado de sesión WebChat)
- Widget React embebible (script tag del tenant)
- Supabase Realtime (entrega de respuestas al widget)

---

## 3. Decisiones No Negociables

1. **`data-services` es una pista de UX, no la fuente de verdad.** El atributo del script tag permite al tenant sugerir qué servicios mostrar en la UI del widget. La fuente de verdad siempre es el backend: `conv-core-get-tenant-features` determina qué servicios están realmente activos para el tenant. Si `data-services` lista un servicio no contratado, `conv-web-message` debe rechazarlo.

2. **Un JWT válido del portal lodger no acredita que el usuario siga siendo inquilino activo.** El JWT acredita autenticación. La confirmación de tenencia activa siempre requiere una llamada a `conv-core-validate-identity` contra SmartRoom Core.

3. **Una sesión WebChat en usuario anónimo se crea con `identity_level = 'NO_MATCH'`.** No se asume ningún nivel de identidad sin validación explícita.

4. **`conv-web-session` debe verificar `allowed_origins` antes de crear una sesión.** Un dominio no incluido en `conv_wc_configs.allowed_origins` debe recibir HTTP 403, nunca una sesión válida.

5. **Cuando `conv_wc_configs.is_active = false`, `conv-web-session` devuelve 503** con un mensaje genérico de servicio no disponible. No debe revelar por qué el canal está desactivado.

6. **La respuesta al widget siempre se entrega vía Supabase Realtime.** Los mensajes del bot y del admin se insertan en `conv_messages` y el widget los recibe por suscripción a cambios. No se usa polling.

7. **El widget WebChat carga un iframe aislado.** La comunicación con la página host se limita a `postMessage` para tamaño del iframe y badge de mensajes nuevos. El widget no tiene acceso a cookies ni al DOM de la página host.

---

## 4. Reglas Obligatorias

### 4.1 Validación de origen (`allowed_origins`)

`conv-web-session` debe extraer el origen de la petición del header `Origin` y verificarlo contra `conv_wc_configs.allowed_origins` para el tenant identificado por `data-tenant-id`.

```
1. Extraer origin del header `Origin`
2. Obtener conv_wc_configs.allowed_origins para el tenant
3. Si origin no está en la lista → devolver HTTP 403 con mensaje genérico
4. Si conv_wc_configs.is_active = false → devolver HTTP 503 con mensaje genérico
5. Si origen válido y canal activo → continuar con creación de sesión
```

Las comparaciones de origen deben ser exactas (esquema + dominio + puerto). No se admiten wildcards en V1.

### 4.2 Comportamiento cuando el WebChat está desactivado

Cuando `conv_wc_configs.is_active = false`:
- `conv-web-session` devuelve HTTP 503 con `{ error: 'service_unavailable', message: 'El servicio de chat no está disponible en este momento.' }`.
- `conv-web-message` rechaza todos los mensajes con HTTP 503.
- El widget muestra el mensaje genérico de servicio no disponible sin exponer detalles técnicos ni estado de la configuración del tenant.
- No se crea ninguna sesión mientras el canal está desactivado.

No se requiere ningún cambio de código ni redespliegue para activar o desactivar el canal.

### 4.3 Creación de sesión — usuario anónimo

Cuando no se proporciona JWT:

```
1. Verificar allowed_origins y is_active (Sección 4.1)
2. Verificar nivel 1 umbrella: saas_service_subscriptions WHERE service_code='smart_conversations' AND status='active'
3. Verificar nivel 2: conv_wc_configs.is_active = true
4. Generar session_id UUID
5. INSERT conv_sessions: { channel='webchat', sender_ref=session_id, identity_level='NO_MATCH', state='NEW' }
6. Emitir session_token (JWT firmado, TTL 1h) que contiene { session_id, client_account_id }
7. Output: { session_token, session_id, is_identified: false, identity_level: 'NO_MATCH' }
```

### 4.4 Creación de sesión — usuario autenticado (portal lodger con JWT)

Cuando se proporciona JWT del portal lodger:

```
1. Verificar allowed_origins y is_active (Sección 4.1)
2. Verificar nivel 1 umbrella
3. Verificar nivel 2: conv_wc_configs.is_active = true
4. Validar JWT Supabase → obtener profile_id
5. Llamar conv-core-validate-identity con { client_account_id, profile_id }
   → Obtener identity_level real (puede ser STRONG_MATCH_ACTIVE / PARTIAL_MATCH_ACTIVE / MATCH_INACTIVE / NO_MATCH)
6. INSERT o recuperar conv_sessions: { channel='webchat', sender_ref=session_id, profile_id, identity_level }
7. Emitir session_token (JWT firmado, TTL 1h)
8. Output: { session_token, session_id, is_identified: true, identity_level }
```

La validación contra el Core en el paso 5 es obligatoria. No se puede asumir `STRONG_MATCH_ACTIVE` basándose únicamente en que el JWT sea válido. Un usuario puede tener JWT válido y `MATCH_INACTIVE` si su contrato finalizó.

### 4.5 `data-services` como pista de UX

El atributo `data-services` del script tag permite al tenant sugerir qué servicios mostrar en la interfaz del widget. Este atributo tiene dos efectos concretos:

- **Efecto en UI:** el widget muestra solo los servicios listados en `data-services` que también estén activos en el backend.
- **Efecto en backend:** ninguno. El backend siempre consulta `conv-core-get-tenant-features` para determinar los servicios reales.

Si `data-services` lista un servicio que el tenant no tiene contratado, el widget no lo muestra. Si el widget intentara enviar un mensaje para ese servicio, `conv-web-message` lo rechazaría con HTTP 422.

Si `data-services` omite un servicio contratado, el widget no lo muestra en la UI, pero el servicio sigue disponible si se llama a la API directamente.

**Regla de precedencia:** el backend siempre prevalece sobre `data-services`.

### 4.6 Recepción de mensajes — EF `conv-web-message`

```
INPUT: { session_token, text, media_url?, service_code? }
PASOS:
  1. Validar session_token (JWT firmado por conv-web-session, no expirado)
  2. Extraer session_id y client_account_id del token
  3. Verificar nivel 1 umbrella
  4. Verificar nivel 2: conv_wc_configs.is_active = true
  5. Verificar nivel 3: al menos 1 servicio activo para canal 'webchat' en conv_service_activations
  6. Si service_code presente en la petición: verificar que tiene fila activa en conv_service_activations
     WHERE channel='webchat' AND is_active=true. Si no → HTTP 422.
  7. INSERT conv_messages (channel='webchat', sender_type='user', direction='inbound', text, session_id)
  8. POST n8n WF-02 con { normalized_message, client_account_id, session_id, channel: 'webchat' }
OUTPUT: { message_id, status: 'received' }
```

Los tres niveles de activación (pasos 3, 4, 5) deben evaluarse en ese orden. Omitir cualquiera está prohibido.

### 4.7 Expiración del `session_token`

El `session_token` tiene TTL de 1 hora. Cuando expira:
- El widget debe solicitar un nuevo `session_token` enviando el `session_id` existente a `conv-web-session`.
- Si la sesión `conv_sessions` sigue válida (dentro de la ventana de inactividad), se emite un nuevo token para la misma sesión sin crear una nueva.
- Si el JWT del portal lodger también ha expirado, la nueva sesión se crea como anónima hasta que el usuario se reautentique.

`conv-web-message` debe devolver HTTP 401 con `{ error: 'token_expired' }` cuando el token ha expirado, para que el widget pueda renovarlo de forma transparente al usuario.

### 4.8 Entrega de respuestas mediante Supabase Realtime

El widget se suscribe a inserciones en `conv_messages` donde `session_id = <session_id>` y `sender_type IN ('bot', 'admin')`. Esta suscripción se establece inmediatamente tras recibir el `session_token`.

```javascript
supabase
  .channel(`conv:session:${session_id}`)
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public',
    table: 'conv_messages',
    filter: `session_id=eq.${session_id} AND sender_type=in.(bot,admin)`
  }, payload => appendMessage(payload.new))
  .subscribe();
```

Los mensajes del bot y del admin se insertan en `conv_messages` por los workflows de n8n (WF-92) y la EF `conv-admin-reply`. Supabase Realtime los entrega al widget sin necesidad de polling.

### 4.9 Contribución del canal WebChat al activity log del Core

Los siguientes eventos desencadenados por el canal WebChat deben publicarse en el activity log de SmartRoom Core mediante Integration API:

| Desencadenante | Evento publicado |
|---|---|
| Primer mensaje de una sesión que supera los tres niveles de activación | `conv_conversation_started` |
| Identidad validada en la creación de sesión con JWT | `conv_identity_validated` |
| Incidencia oficial creada a raíz de una conversación WebChat | `conv_incident_created` |
| Lead registrado a raíz de una consulta de anuncio por WebChat | `conv_lead_created` |
| Caso escalado a un admin humano desde WebChat | `conv_case_escalated` |
| Caso resuelto o cerrado | `conv_case_closed` |

El canal WebChat nunca debe publicar el contenido individual de los mensajes en el activity log del Core. Véase `rules-75-activity-log.md` para el formato completo y el catálogo de eventos.

---

## 5. Casos Permitidos

- Un usuario anónimo que inicia sesión WebChat con `identity_level = 'NO_MATCH'` y consulta el FAQ público.
- Un usuario autenticado con JWT válido que recibe `MATCH_INACTIVE` porque su contrato finalizó; la sesión se crea con ese nivel y el acceso queda restringido.
- Un usuario autenticado que renueva el `session_token` cada hora sin interrumpir la sesión conversacional.
- Un tenant con `conv_wc_configs.is_active = false` cuyo widget muestra el mensaje de servicio no disponible sin exponer detalles técnicos.
- Un dominio no autorizado que recibe HTTP 403 sin obtener ningún dato del tenant.
- Un mensaje WebChat rechazado con HTTP 422 porque solicita un `service_code` que no está en `conv_service_activations` para ese tenant.

---

## 6. Casos Prohibidos

- Asumir `STRONG_MATCH_ACTIVE` o cualquier nivel de identidad basándose únicamente en que el JWT del portal lodger sea válido.
- Usar `data-services` como fuente autoritativa para permitir o denegar el acceso a un servicio en el backend.
- Crear una sesión WebChat desde un dominio no incluido en `conv_wc_configs.allowed_origins`.
- Devolver HTTP 4xx a `conv-web-message` sin el campo `error` descriptivo (el widget debe saber cómo reaccionar).
- Revelar al usuario por qué el canal WebChat está desactivado.
- Omitir la validación de niveles 1, 2 o 3 antes de aceptar un mensaje.
- Entregar respuestas del bot mediante polling en lugar de Supabase Realtime.
- Incluir el `raw_payload` o datos de `conv_wc_configs` en los payloads enviados a n8n.

---

## 7. Impacto en el Diseño

- `conv-web-session` es la única puerta de entrada al canal WebChat. Ninguna EF ni workflow debe crear sesiones WebChat directamente.
- `data-services` no debe usarse como variable de decisión en ningún código del backend.
- La lógica de `allowed_origins` vive en `conv-web-session`. El widget no debe intentar proteger esto.
- El widget debe manejar los HTTP 401 (token expirado) y los HTTP 503 (canal desactivado) de forma transparente para el usuario final.
- La desactivación del WebChat mediante `conv_wc_configs.is_active = false` es la única operación de control del canal en el nivel 2. No se requiere redeploy ni cambio de código.

---

## 8. Impacto en la Implementación

- `conv-web-session` debe registrar en logs el origen rechazado (sin el token, solo el dominio) para facilitar el diagnóstico cuando un tenant reporta que su widget no carga.
- El `session_token` debe ser JWT firmado con una clave secreta del add-on, distinta de la clave de Supabase. Su payload debe contener únicamente `session_id` y `client_account_id`.
- `conv-web-message` debe responder con el `message_id` en el output para que el widget pueda correlacionar el mensaje enviado con el que eventualmente aparecerá en la suscripción Realtime.
- La suscripción Realtime del widget debe cancelarse cuando el widget se desmonta (cierre del chat o navegación fuera de la página).

---

## 9. Dependencias

- `rules-00-scope-and-principles.md` — principios P1, P3, P6, P7
- `rules-10-service-catalog.md` — códigos de servicio y de canal
- `rules-20-tenant-activation-and-lifecycle.md` — jerarquía de activación y comportamiento del nivel 2
- `rules-40-identity-validation.md` — validación de identidad para usuarios autenticados
- `rules-75-activity-log.md` — eventos del activity log para el canal WebChat
- `rules-80-data-and-privacy.md` — restricciones de PII y tratamiento de datos de sesión
- `contract-normalized-message.md` — estructura del NormalizedMessage producido por este canal

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`

---

## 10. Checklist de Validación

- [ ] `conv-web-session` rechaza con HTTP 403 las peticiones desde dominios no incluidos en `allowed_origins`
- [ ] `conv-web-session` devuelve HTTP 503 cuando `conv_wc_configs.is_active = false`
- [ ] `conv-web-session` llama a `conv-core-validate-identity` cuando hay JWT presente, sin asumir ningún nivel
- [ ] Las sesiones anónimas se crean con `identity_level = 'NO_MATCH'`
- [ ] `conv-web-message` evalúa los tres niveles de activación en orden antes de aceptar un mensaje
- [ ] `conv-web-message` rechaza con HTTP 422 los mensajes para `service_code` no activos
- [ ] `data-services` no se usa en ninguna lógica de decisión del backend
- [ ] El `session_token` tiene TTL de 1h y el widget lo renueva de forma transparente
- [ ] Las respuestas del bot se entregan mediante Supabase Realtime, sin polling
- [ ] Los eventos del activity log se publican mediante Integration API, no como registros brutos de mensajes

---

## 11. Notas de Control de Cambios

Si se añade soporte para wildcards en `allowed_origins`, debe actualizarse la lógica de validación en `conv-web-session` y este documento debe reflejar el nuevo comportamiento junto con sus implicaciones de seguridad.

Si el TTL del `session_token` se modifica, debe coordinarse con el widget React para ajustar la lógica de renovación.

Cualquier cambio en el comportamiento de `conv_wc_configs.is_active` debe ser coherente con la tabla de pausa vs desactivación en `rules-20-tenant-activation-and-lifecycle.md`.
