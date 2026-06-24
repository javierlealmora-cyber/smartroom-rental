# Skill — Gateway WebChat

## 1. Objetivo

Este skill explica cómo implementar las dos Edge Functions del canal WebChat: `conv-web-session` (creación y renovación de sesiones) y `conv-web-message` (recepción de mensajes). Cubre la validación de origen, los flujos de usuario anónimo y autenticado, la renovación del token de sesión y la entrega de respuestas mediante Supabase Realtime.

## 2. Cuándo usar este skill

Usar este skill cuando se necesite:

- implementar o revisar `conv-web-session`
- implementar o revisar `conv-web-message`
- depurar errores 403 o 503 en la creación de sesión
- depurar mensajes rechazados con 401 o 422
- configurar la suscripción Supabase Realtime en el widget React
- entender cómo el JWT del portal lodger se convierte en nivel de identidad

## 3. Preconditions

Antes de usar este skill, leer:

- `rules-31-webchat-channel.md` — fuente de verdad de todas las reglas del canal
- `rules-20-tenant-activation-and-lifecycle.md` — jerarquía de activación de tres niveles
- `rules-40-identity-validation.md` — validación de identidad para sesiones con JWT
- `rules-80-data-and-privacy.md` — restricciones de PII en sesiones WebChat

## 4. Restricciones de origen

Este skill respeta las siguientes decisiones cerradas en las rules:

- `data-services` es una pista de UX, no la fuente de verdad. El backend siempre usa `conv-core-get-tenant-features`.
- Un JWT válido del portal lodger acredita autenticación pero no tenencia activa. La tenencia activa siempre requiere llamar a `conv-core-validate-identity`.
- Las sesiones anónimas se crean con `identity_level = 'NO_MATCH'` sin excepción.
- Cuando `conv_wc_configs.is_active = false`, `conv-web-session` devuelve HTTP 503 sin revelar el motivo.
- Las respuestas al widget siempre se entregan por Supabase Realtime. No se usa polling.
- El widget carga en un iframe aislado. No tiene acceso a cookies ni al DOM de la página host.

## 5. Estrategia de implementación

El canal WebChat tiene dos EFs con responsabilidades distintas:

1. **`conv-web-session`** — crea o renueva la sesión. Valida el origen, evalúa los niveles 1 y 2 de activación, resuelve el JWT si está presente y emite el `session_token`.
2. **`conv-web-message`** — acepta mensajes del widget. Valida el `session_token`, evalúa los tres niveles de activación y entrega el mensaje normalizado a `conv-ingest`.

## 6. Pasos recomendados

### Paso 1 — Implementar `conv-web-session` para usuario anónimo

```
INPUT: { tenant_id: client_account_id, origin: <header Origin> }

1. Obtener conv_wc_configs para el tenant
2. Si origin no está en conv_wc_configs.allowed_origins → HTTP 403 (mensaje genérico)
3. Si conv_wc_configs.is_active = false → HTTP 503 (mensaje genérico, no revelar causa)
4. [NIVEL 1] Verificar saas_service_subscriptions WHERE service_code='smart_conversations'
   AND status='active'. Si inactiva → HTTP 503
5. Generar session_id UUID
6. INSERT conv_sessions: {
     channel: 'webchat',
     sender_ref: session_id,
     identity_level: 'NO_MATCH',
     state: 'NEW',
     client_account_id
   }
7. Emitir session_token (JWT firmado, clave propia del add-on, TTL 1h)
   Payload: { session_id, client_account_id }
8. OUTPUT: { session_token, session_id, is_identified: false, identity_level: 'NO_MATCH' }
```

### Paso 2 — Implementar `conv-web-session` para usuario autenticado (JWT del portal lodger)

```
INPUT: { tenant_id, origin, lodger_jwt }

1-4. Mismas comprobaciones de origen y niveles que el flujo anónimo

5. Validar lodger_jwt con Supabase Auth → obtener profile_id
   Si JWT inválido o expirado → crear sesión anónima (NO_MATCH) sin revelar el error al widget
6. Llamar conv-core-validate-identity con { client_account_id, profile_id }
   → Obtener identity_level real
7. INSERT conv_sessions: {
     channel: 'webchat',
     sender_ref: session_id,
     profile_id,
     identity_level,
     state: 'NEW',
     client_account_id
   }
   Almacenar profile_id y demás campos del IdentityValidationResult en conv_sessions.
   No reenviar estos campos fuera de la EF.
8. Emitir session_token (JWT firmado, TTL 1h)
9. OUTPUT: { session_token, session_id, is_identified: true, identity_level }
```

**Importante:** el `session_token` que emite esta EF es distinto del JWT del portal lodger. Usa una clave secreta propia del add-on y solo contiene `session_id` y `client_account_id`.

### Paso 3 — Renovación del `session_token` expirado

El `session_token` tiene TTL de 1 hora. Cuando expira:

```
1. El widget recibe HTTP 401 con { error: 'token_expired' } de conv-web-message
2. El widget llama a conv-web-session con { session_id: <existente>, tenant_id }
3. conv-web-session verifica si conv_sessions con ese session_id sigue válida
   Si válida → emitir nuevo session_token para la misma sesión (sin crear nueva)
   Si expirada (TTL de sesión superado) → crear nueva sesión con state='NEW'
4. Si el lodger_jwt del usuario también ha expirado → nueva sesión como anónima (NO_MATCH)
```

El widget debe manejar el 401 de forma transparente al usuario: renovar el token y reintentar el envío del mensaje automáticamente.

### Paso 4 — Implementar `conv-web-message`

```
INPUT: { session_token, text, media_url?, service_code? }

1. Validar session_token (JWT firmado por esta EF, no expirado)
   Si inválido → HTTP 401 { error: 'invalid_token' }
   Si expirado → HTTP 401 { error: 'token_expired' }
2. Extraer session_id y client_account_id del token
3. [NIVEL 1] Verificar saas_service_subscriptions → si inactiva → HTTP 503
4. [NIVEL 2] Verificar conv_wc_configs.is_active = true → si false → HTTP 503
5. [NIVEL 3] Verificar conv_service_activations WHERE channel='webchat' AND is_active=true
   Si ninguna fila → HTTP 503
6. Si service_code presente: verificar que tiene fila activa en conv_service_activations
   WHERE channel='webchat'. Si no → HTTP 422 { error: 'service_not_active' }
7. INSERT conv_messages: {
     channel: 'webchat',
     sender_type: 'user',
     direction: 'inbound',
     text,
     session_id,
     client_account_id
   }
8. Llamar a conv-ingest con { channel: 'webchat', client_account_id, normalized_message }
OUTPUT: { message_id, status: 'received' }
```

Los tres niveles (pasos 3, 4, 5) deben evaluarse en ese orden. Omitir cualquiera está prohibido.

### Paso 5 — Configurar la suscripción Supabase Realtime en el widget

El widget se suscribe a insercciones en `conv_messages` para la sesión actual:

```javascript
const channel = supabase
  .channel(`conv:session:${session_id}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'conv_messages',
    filter: `session_id=eq.${session_id} AND sender_type=in.(bot,admin)`
  }, payload => appendMessage(payload.new))
  .subscribe();

// Cancelar suscripción al desmontar el widget
return () => supabase.removeChannel(channel);
```

No usar polling. Las respuestas del bot y del admin llegan vía Realtime sin ningún intervalo de consulta.

### Paso 6 — Validar la configuración de `allowed_origins`

La comparación de origen es exacta: esquema + dominio + puerto. No se admiten wildcards en V1.

```
Ejemplo:
allowed_origins = ['https://residencia-sol.es', 'https://admin.residencia-sol.es']

origin: 'https://residencia-sol.es'       → permitido
origin: 'http://residencia-sol.es'        → denegado (esquema distinto)
origin: 'https://residencia-sol.es:8080'  → denegado (puerto distinto)
origin: 'https://sub.residencia-sol.es'   → denegado (subdominio distinto)
```

Registrar en logs el dominio rechazado (sin token ni datos personales) para facilitar el diagnóstico.

## 7. Datos / contratos involucrados

- `conv_wc_configs` — `is_active`, `allowed_origins`, configuración del canal por tenant
- `conv_sessions` — sesión WebChat con `session_id`, `profile_id`, `identity_level`, `state`
- `conv_messages` — mensajes entrantes del usuario y mensajes de bot/admin que el widget recibe por Realtime
- `conv_service_activations` — verificación de nivel 3
- `saas_service_subscriptions` — verificación de nivel 1
- `contract-identity-validation-result.md` — resultado de `conv-core-validate-identity` para sesiones con JWT

## 8. Errores comunes

- **Asumir `STRONG_MATCH_ACTIVE` por JWT válido:** el JWT solo acredita autenticación. La tenencia activa siempre requiere llamar a `conv-core-validate-identity`. Un usuario puede tener JWT válido y `MATCH_INACTIVE` si su contrato finalizó.
- **Usar `data-services` en la lógica del backend:** este atributo solo tiene efecto en la UI del widget. El backend nunca lo lee para tomar decisiones de enrutado o autorización.
- **Crear sesión desde dominio no autorizado:** si `allowed_origins` no incluye el origen, la respuesta debe ser HTTP 403 sin crear sesión ni revelar detalles del tenant.
- **Polling en lugar de Realtime:** el widget no debe hacer peticiones periódicas para obtener respuestas. La suscripción Realtime es obligatoria.
- **No cancelar la suscripción Realtime al desmontar el widget:** causa memory leaks y suscripciones huérfanas en el servidor de Supabase.
- **Revelar el motivo de desactivación del canal:** cuando `is_active = false`, el mensaje al usuario debe ser genérico. No exponer configuración interna del tenant.
- **Emitir `session_token` con la clave JWT de Supabase:** el `session_token` del add-on usa una clave secreta propia para que Supabase Auth no pueda validarlo como sesión de usuario.

## 9. Qué no debe hacerse

- Crear sesiones WebChat desde dominios no listados en `allowed_origins`.
- Propagar `profile_id`, `assignment_id`, `room_label` u otros campos del `IdentityValidationResult` fuera de la EF hacia n8n.
- Usar `data-services` como variable de decisión en el backend.
- Devolver HTTP 4xx a `conv-web-message` sin el campo `error` descriptivo (el widget necesita saber cómo reaccionar).
- Omitir cualquiera de los tres niveles de activación antes de aceptar un mensaje.
- Incluir `raw_payload` o datos de `conv_wc_configs` en los payloads enviados a n8n.

## 10. Escenarios mínimos de prueba

1. **Dominio no autorizado → HTTP 403:**
   `conv-web-session` con `origin` no incluido en `allowed_origins` → HTTP 403, sin sesión creada.

2. **Canal desactivado → HTTP 503:**
   `conv_wc_configs.is_active = false` → HTTP 503 con mensaje genérico, sin revelar la causa.

3. **Sesión anónima → `identity_level = 'NO_MATCH'`:**
   Llamada sin `lodger_jwt` → sesión creada con `identity_level = 'NO_MATCH'` e `is_identified: false`.

4. **Sesión con JWT válido → nivel real del Core:**
   Llamada con JWT que resuelve un `profile_id` con contrato activo → `STRONG_MATCH_ACTIVE` almacenado en `conv_sessions`.

5. **JWT válido + ex-inquilino → `MATCH_INACTIVE`:**
   JWT válido pero perfil sin asignación activa → sesión creada con `identity_level = 'MATCH_INACTIVE'`, no con `STRONG_MATCH_ACTIVE`.

6. **Token expirado → HTTP 401:**
   `session_token` con TTL superado → HTTP 401 `{ error: 'token_expired' }`.

7. **Servicio no activo → HTTP 422:**
   `conv-web-message` con `service_code` no presente en `conv_service_activations` para `webchat` → HTTP 422.

8. **Mensajes entrantes → Realtime al widget:**
   INSERT en `conv_messages` con `sender_type='bot'` → el widget recibe el mensaje vía la suscripción Supabase Realtime sin polling.

## 11. Criterio de done

La implementación se considera correctamente hecha cuando:

- `conv-web-session` rechaza con HTTP 403 las peticiones desde dominios no incluidos en `allowed_origins`
- `conv-web-session` devuelve HTTP 503 cuando `conv_wc_configs.is_active = false`, sin revelar el motivo
- `conv-web-session` llama a `conv-core-validate-identity` cuando hay JWT, sin asumir ningún nivel
- Las sesiones anónimas se crean con `identity_level = 'NO_MATCH'`
- `conv-web-message` evalúa los tres niveles de activación en orden antes de aceptar un mensaje
- `conv-web-message` rechaza con HTTP 422 mensajes para `service_code` no activos en `webchat`
- El `session_token` tiene TTL de 1 hora y el widget puede renovarlo de forma transparente
- Las respuestas del bot se entregan mediante Supabase Realtime sin polling
- `profile_id` y demás campos del `IdentityValidationResult` se almacenan en `conv_sessions` y nunca se reenvían a n8n

## 12. Documentos relacionados

- `rules-31-webchat-channel.md` — reglas del canal WebChat
- `rules-20-tenant-activation-and-lifecycle.md` — jerarquía de activación
- `rules-40-identity-validation.md` — validación de identidad al crear sesión con JWT
- `rules-80-data-and-privacy.md` — política de PII en sesiones WebChat
- `contract-identity-validation-result.md` — estructura del resultado de validación de identidad
- `skill-identity-validation.md` — detalles del flujo de validación progresiva para sesiones WebChat

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
