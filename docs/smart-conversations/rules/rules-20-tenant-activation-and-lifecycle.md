# rules-20-tenant-activation-and-lifecycle.md — SmartConversations: Activación y Ciclo de Vida del Tenant

## 1. Propósito

Este documento define la jerarquía de activación de tres niveles, la secuencia de alta de un tenant, los estados operativos de cada canal y las reglas que gobiernan la pausa, desactivación y offboarding.

Cualquier componente del sistema que decida si procesar o ignorar un mensaje entrante, o que modifique el estado de activación de un tenant, debe conformarse a este documento.

---

## 2. Alcance

Este documento aplica a:

- `saas_service_subscriptions` (nivel 1 — umbrella)
- `conv_wa_sessions` (nivel 2 — estado del canal WhatsApp)
- `conv_wc_configs` (nivel 2 — estado del canal WebChat)
- `conv_service_activations` (nivel 3 — servicio × canal)
- EF `conv-wa-webhook` (puerta de activación para WhatsApp)
- EF `conv-web-session` (puerta de activación para WebChat)
- EF `conv-web-message` (puerta de aceptación de mensajes WebChat)
- EF `conv-offboard-wa-session` (offboarding de WhatsApp)
- EF `conv-activate-subscription` (activación de la suscripción umbrella)

---

## 3. Decisiones No Negociables

1. **La activación opera en exactamente tres niveles.** Un nivel superior inactivo bloquea todos los niveles inferiores sin necesidad de desactivarlos individualmente.

2. **Los registros de configuración de los niveles 2 y 3 deben conservarse cuando el nivel 1 queda inactivo.** Deshabilitar la suscripción umbrella no debe eliminar los registros de `conv_service_activations`, `conv_wa_sessions` ni `conv_wc_configs`. La recuperación requiere únicamente reactivar la umbrella.

3. **`conv-offboard-wa-session` nunca debe llamarse para una pausa temporal.** Está reservado para la desactivación definitiva o la cancelación del contrato.

4. **Los webhooks de Wasender siempre reciben una respuesta 200 independientemente del estado de activación.** El sistema nunca debe devolver 4xx a Wasender. El estado del tenant no debe revelarse a remitentes externos.

5. **El nivel 1 debe comprobarse en tiempo real.** El estado de la suscripción umbrella debe leerse desde `saas_service_subscriptions` en cada petición, no desde una caché en memoria.

6. **`conv-offboard-wa-session` acepta un parámetro `mode`.** `mode: 'logout'` desconecta la sesión pero conserva el slot en Wasender. `mode: 'delete'` elimina la sesión de Wasender de forma permanente.

---

## 4. Reglas Obligatorias

### 4.1 Jerarquía de activación de tres niveles

```
Nivel 1 — Suscripción umbrella
  saas_service_subscriptions
    WHERE service_code = 'smart_conversations'
    AND status = 'active'
    AND client_account_id = <X>
  Si inactiva → ignorar todos los mensajes para este tenant. Responder 200 silencioso.

Nivel 2 — Estado operativo del canal
  WhatsApp: conv_wa_sessions.status = 'active'
  WebChat:  conv_wc_configs.is_active = true
  Si inactivo → ignorar todos los mensajes de este canal.

Nivel 3 — Servicio × canal activo
  conv_service_activations
    WHERE client_account_id = <X>
    AND channel = <Y>
    AND is_active = true
  Debe existir al menos una fila.
  Si no hay ninguna → ignorar silenciosamente.
```

### 4.2 Orden de evaluación

`conv-wa-webhook` debe evaluar los niveles 1, 2 y 3 en ese orden exacto después de responder 200.

`conv-web-session` debe evaluar los niveles 1 y 2 antes de crear una sesión.

`conv-web-message` debe evaluar el nivel 3 antes de aceptar un mensaje.

Omitir cualquier nivel está prohibido.

### 4.3 Secuencia de alta de un nuevo tenant

Los siguientes pasos deben ejecutarse en orden:

```
Paso 1: El superadmin activa la suscripción umbrella
  EF conv-activate-subscription
  INSERT saas_service_subscriptions (service_code='smart_conversations', status='active')

Paso 2: El superadmin registra la sesión Wasender del tenant
  INSERT conv_wa_sessions (wasender_session_id, webhook_secret, status='disconnected')

Paso 3: El admin del tenant activa servicios por canal
  INSERT conv_service_activations (service_code, channel, is_active=true)
  Una fila por cada combinación servicio × canal deseada.

Paso 4: Conectar la sesión WhatsApp
  El tenant escanea el QR o usa el token de API.
  UPDATE conv_wa_sessions.status = 'active'

Paso 5: Instalar el widget WebChat (si aplica)
  INSERT conv_wc_configs (allowed_origins, is_active=true)
  El tenant instala el script tag en su web.
```

Hasta que el paso 4 se completa, los webhooks entrantes de WhatsApp se ignoran silenciosamente en el nivel 2.

### 4.4 Estados del canal WhatsApp

| Estado | Significado | Mensajes procesados |
|---|---|---|
| `disconnected` | Sin sesión activa | No |
| `connecting` | QR generado, esperando escaneo | No |
| `active` | Sesión activa y recibiendo mensajes | Sí (sujeto a los niveles 1 y 3) |
| `error` | Error de sesión reportado por Wasender | No |

### 4.5 Pausa vs desactivación vs offboarding

| Acción | Nivel modificado | API Wasender llamada | Webhooks entrantes | Recuperación |
|---|---|---|---|---|
| Pausar un servicio en un canal | Nivel 3: `is_active = false` en `conv_service_activations` | No | Sí, ignorados silenciosamente | `UPDATE is_active = true` |
| Deshabilitar el canal WebChat | Nivel 2: `conv_wc_configs.is_active = false` | No | No aplica | `UPDATE is_active = true` |
| Logout de WhatsApp | Nivel 2: `conv_wa_sessions.status = 'disconnected'` | `POST .../disconnect` | No | Reconectar mediante QR |
| Delete de WhatsApp | Nivel 2: `conv_wa_sessions.status = 'disconnected'` | `DELETE .../sessions/{id}` | No | Requiere nueva sesión |
| Desactivar umbrella | Nivel 1: `status ≠ 'active'` | No | Sí, ignorados silenciosamente en el nivel 1 | Reactivar umbrella |

### 4.6 EF `conv-offboard-wa-session`

Esta EF debe llamarse únicamente cuando el tenant desactiva definitivamente el canal WhatsApp (cancelación del contrato o eliminación explícita del canal). Nunca debe llamarse para pausas temporales.

**`mode: 'logout'`**
```
POST https://api.wasender.com/api/sessions/{wasender_session_id}/disconnect
Headers: { Authorization: "Bearer <wasender_api_key>" }
```
Efecto: el número de teléfono se libera de la sesión. El slot de sesión permanece registrado en Wasender y puede reconectarse escaneando un nuevo QR.

**`mode: 'delete'`**
```
DELETE https://api.wasender.com/api/sessions/{wasender_session_id}
Headers: { Authorization: "Bearer <wasender_api_key>" }
```
Efecto: la sesión se elimina permanentemente de Wasender. La reconexión requiere crear una nueva sesión desde cero.

Ambos modos deben, en caso de éxito:
1. `UPDATE conv_wa_sessions.status = 'disconnected'`
2. `UPDATE conv_service_activations SET is_active = false, deactivated_at = now() WHERE client_account_id = X AND channel = 'whatsapp'`
3. `INSERT audit_log: action='wa_session_offboarded', client_account_id, mode`

### 4.7 Desactivación del canal WebChat

Establecer `conv_wc_configs.is_active = false` produce:
- El widget carga pero muestra un mensaje genérico de servicio no disponible.
- `conv-web-session` devuelve 503 con un mensaje genérico (sin exponer detalles técnicos).
- `conv-web-message` rechaza todos los mensajes entrantes.

No se requiere ningún cambio de código ni redespliegue.

### 4.8 Events del activity log en eventos de ciclo de vida

Los siguientes eventos de ciclo de vida deben publicar un hito en el activity log de SmartRoom Core mediante Integration API:

| Evento | Cuándo |
|---|---|
| `conv_subscription_activated` | La suscripción umbrella se activa por primera vez |
| `conv_channel_connected` | `conv_wa_sessions.status` pasa a `active` |
| `conv_channel_offboarded` | `conv-offboard-wa-session` completa con éxito |

Véase `rules-75-activity-log.md` para el formato de evento y las reglas de publicación.

---

## 5. Casos Permitidos

- Umbrella activa sin filas en `conv_service_activations` (la comprobación del nivel 3 pasa silenciosamente).
- Un servicio activo en `whatsapp` y un servicio diferente activo en `webchat`, para el mismo tenant.
- Reactivar una suscripción umbrella y encontrar toda la configuración previa de servicios y canales intacta.
- Llamar a `conv-offboard-wa-session` con `mode: 'logout'` y posteriormente reconectar el mismo número mediante QR.
- Pausar todos los servicios en `whatsapp` poniendo `is_active = false` en todas las filas de ese canal, sin desconectar la sesión Wasender.

---

## 6. Casos Prohibidos

- Devolver HTTP 4xx a un webhook de Wasender por cualquier motivo relacionado con el estado de activación del tenant.
- Llamar a `conv-offboard-wa-session` para una pausa temporal.
- Eliminar filas de `conv_service_activations` en lugar de poner `is_active = false`.
- Eliminar filas de `conv_wa_sessions` o `conv_wc_configs` cuando se desactiva la suscripción umbrella.
- Evaluar únicamente el nivel 3 sin comprobar antes los niveles 1 y 2.
- Cachear el resultado de la comprobación del nivel 1 umbrella más allá de la petición actual.

---

## 7. Impacto en el Diseño

- Toda puerta de procesamiento de mensajes debe implementar la comprobación de tres niveles antes de realizar cualquier acción.
- El modelo de datos debe conservar la configuración en todos los niveles incluso cuando los niveles superiores están inactivos.
- El panel de administración debe distinguir claramente entre pausa (nivel 3), desactivación de canal (nivel 2) y offboarding (`conv-offboard-wa-session`).
- La desactivación del WebChat debe poder realizarse mediante una sola actualización de flag en `conv_wc_configs`.

---

## 8. Impacto en la Implementación

- `conv-wa-webhook` debe responder 200 antes de iniciar cualquier lógica de comprobación de activación.
- `conv-web-session` debe devolver 503 con un mensaje no técnico cuando `conv_wc_configs.is_active = false`.
- La EF `conv-offboard-wa-session` debe aceptar `mode` como parámetro requerido y fallar si está ausente.
- Las entradas del audit log para el offboarding deben incluir el campo `mode`.

---

## 9. Dependencias

- `rules-00-scope-and-principles.md` — principios P4, P7
- `rules-10-service-catalog.md` — códigos válidos de servicio y canal
- `rules-30-whatsapp-channel.md` — procesamiento del webhook de Wasender
- `rules-31-webchat-channel.md` — comportamiento del gateway WebChat
- `rules-75-activity-log.md` — eventos del activity log de ciclo de vida

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`

---

## 10. Checklist de Validación

- [ ] `conv-wa-webhook` responde 200 en todos los casos, incluido cuando el tenant está inactivo
- [ ] `conv-wa-webhook` comprueba los niveles 1, 2 y 3 en secuencia antes de procesar
- [ ] `conv-web-session` devuelve 503 (no 200) cuando `conv_wc_configs.is_active = false`
- [ ] `conv-offboard-wa-session` requiere el parámetro `mode`
- [ ] `mode: 'logout'` usa `POST .../disconnect`; `mode: 'delete'` usa `DELETE .../sessions/{id}`
- [ ] La desactivación de la umbrella no elimina filas de `conv_service_activations` ni de `conv_wa_sessions`
- [ ] Reactivar la umbrella restaura toda la funcionalidad sin necesidad de reconfiguración
- [ ] Los eventos de ciclo de vida se publican en el activity log del Core mediante Integration API

---

## 11. Notas de Control de Cambios

Los cambios en la lógica de modo de offboarding deben coordinarse con la documentación de la API de Wasender. Si Wasender modifica las rutas de sus endpoints, este documento y `rules-30-whatsapp-channel.md` deben actualizarse conjuntamente.

Cualquier cambio en la lógica de jerarquía de tres niveles debe actualizar también `rules-00-scope-and-principles.md` Sección 4.4.
