# Skill — Integración WhatsApp con Wasender

## 1. Objetivo

Este skill explica cómo implementar las tres Edge Functions del canal WhatsApp: `conv-wa-webhook` (recepción de mensajes entrantes), `conv-send-wa` (envío de mensajes salientes) y `conv-offboard-wa-session` (ciclo de vida de la sesión). Cubre también la integración con la API REST de Wasender, la deduplicación de mensajes y el tratamiento del audio.

## 2. Cuándo usar este skill

Usar este skill cuando se necesite:

- implementar o revisar `conv-wa-webhook`
- implementar o revisar `conv-send-wa`
- implementar o revisar `conv-offboard-wa-session`
- depurar mensajes que llegan pero no se procesan
- depurar mensajes salientes que no se entregan
- gestionar el offboarding de un tenant de WhatsApp

## 3. Preconditions

Antes de usar este skill, leer:

- `rules-30-whatsapp-channel.md` — fuente de verdad de todas las reglas del canal
- `rules-20-tenant-activation-and-lifecycle.md` — jerarquía de activación de tres niveles
- `rules-80-data-and-privacy.md` — restricciones de PII para teléfonos y mensajes
- `contract-normalized-message.md` — estructura del `NormalizedMessage` que produce este canal

## 4. Restricciones de origen

Este skill respeta las siguientes decisiones cerradas en las rules:

- Wasender es el único proveedor de WhatsApp permitido. No se evalúan alternativas.
- El webhook siempre responde HTTP 200, incluso cuando descarta el mensaje. No se devuelve 4xx a Wasender bajo ninguna circunstancia.
- La respuesta 200 se envía **antes** de cualquier procesamiento, incluida la validación de firma.
- La autenticación usa el header `X-Webhook-Signature` con comparación directa de cadenas. No se usa HMAC.
- El envío saliente usa el body `{ sessionId, to: "<phone>@c.us", text }`. Los nombres de campo alternativos están prohibidos.
- n8n no puede llamar a la API de Wasender directamente. Siempre debe pasar por `conv-send-wa`.

## 5. Estrategia de implementación

La integración se divide en tres EFs independientes con responsabilidades claras:

1. **`conv-wa-webhook`** — puerta de entrada pura: autentica, valida jerarquía, deduplica y delega a `conv-ingest`. No contiene lógica de servicio.
2. **`conv-send-wa`** — único camino válido para mensajes salientes. Gestiona el formato correcto, verifica estado de la sesión y entra en `conv_send_queue` si falla.
3. **`conv-offboard-wa-session`** — gestiona la desconexión (logout) o eliminación definitiva (delete) de la sesión Wasender con semántica diferente para cada modo.

## 6. Pasos recomendados

### Paso 1 — Implementar `conv-wa-webhook`

La secuencia de operaciones es estricta:

```
1. Extraer X-Webhook-Signature del header
2. Responder HTTP 200 INMEDIATAMENTE (antes de cualquier otra comprobación)
3. Si X-Webhook-Signature ausente → log + detener silenciosamente
4. Obtener wasender_session_id del payload → buscar conv_wa_sessions
5. Si no existe sesión → log + detener silenciosamente
6. Comparar X-Webhook-Signature directamente con conv_wa_sessions.webhook_secret
   Si no coincide → log + detener silenciosamente
7. [NIVEL 1] Verificar saas_service_subscriptions WHERE service_code='smart_conversations'
   AND status='active' AND client_account_id = <resuelto>
   Si inactiva → detener silenciosamente
8. [NIVEL 2] Verificar conv_wa_sessions.status = 'active'
   Si no activa → detener silenciosamente
9. [NIVEL 3] Verificar conv_service_activations WHERE channel='whatsapp' AND is_active=true
   Si ninguna fila activa → detener silenciosamente
10. Deduplicar: SELECT id FROM conv_messages WHERE client_account_id=X AND wasender_message_id=Y LIMIT 1
    Si existe → detener silenciosamente
11. Si mensaje de tipo 'audioMessage' → encolar en WF-C00-TRANSCRIBE → esperar transcripción
12. Normalizar el payload a NormalizedMessage (ver §7)
13. Llamar conv-ingest con { channel:'whatsapp', client_account_id, normalized_message }
```

**Importante:** el paso 2 (responder 200) ocurre antes del paso 3 (validar firma). Wasender no debe recibir información sobre el estado interno del sistema.

### Paso 2 — Normalizar el mensaje a `NormalizedMessage`

El tipo de mensaje Wasender determina el tratamiento:

| Tipo Wasender | Campo `text` | Notas |
|---|---|---|
| `conversation` | `message.conversation` | Caso más común |
| `extendedTextMessage` | `message.extendedTextMessage.text` | Capturar también `reply_to_id` |
| `audioMessage` | Transcripción devuelta por WF-C00-TRANSCRIBE | `is_transcribed: true` |
| `imageMessage` | `message.imageMessage.caption` (puede ser vacío) | Guardar `media_url` |
| `documentMessage` | No normalizar | Log informativo, ignorar |

El campo `sender_ref` del `NormalizedMessage` debe contener el número de teléfono **sin** el sufijo `@c.us`.

### Paso 3 — Implementar `conv-send-wa`

```
INPUT: { session_id, text, client_account_id }

1. Obtener wasender_session_id y wasender_api_key de conv_wa_sessions
2. Verificar conv_wa_sessions.status = 'active'
   Si no activa → INSERT conv_send_queue con max_retries=3 → retornar
3. Obtener el número de teléfono del usuario desde conv_sessions.sender_ref
4. POST https://api.wasender.com/api/send-message
   Headers: { Authorization: "Bearer <wasender_api_key>" }
   Body: { sessionId: <wasender_session_id>, to: "<phone>@c.us", text: <text> }
5. Si HTTP 200 → UPDATE conv_messages.status = 'sent'
6. Si fallo → INSERT conv_send_queue con backoff: 1s → 5s → 30s, max_retries=3
   Tras 3 fallos → UPDATE conv_messages.status = 'failed'
```

### Paso 4 — Implementar `conv-offboard-wa-session`

```
INPUT: { client_account_id, mode: 'logout' | 'delete' }

1. Obtener wasender_session_id y wasender_api_key de conv_wa_sessions

Si mode = 'logout':
2a. POST https://api.wasender.com/api/sessions/{wasender_session_id}/disconnect
    → Cierra la sesión del número. El slot de sesión se conserva en Wasender.
    → El número se puede reconectar escaneando QR de nuevo.

Si mode = 'delete':
2b. DELETE https://api.wasender.com/api/sessions/{wasender_session_id}
    → Elimina la sesión definitivamente de Wasender.
    → Requiere crear una nueva sesión para reconectar.

3. UPDATE conv_wa_sessions SET status='disconnected', disconnected_at=now()
4. UPDATE conv_service_activations SET is_active=false, deactivated_at=now()
   WHERE client_account_id=X AND channel='whatsapp'
5. INSERT audit_log: action='wa_session_offboarded', client_account_id, mode

OUTPUT: { offboarded: true, mode }
```

| Situación del admin | mode recomendado |
|---|---|
| Pausa temporal del canal (sin desconectar) | No usar esta EF; solo `is_active=false` en `conv_service_activations` |
| Cierre de sesión con posible reconexión futura | `logout` |
| Cancelación definitiva del contrato | `delete` |

### Paso 5 — Gestionar errores de la API de Wasender

| Código de respuesta Wasender | Tratamiento |
|---|---|
| 200 | Éxito; actualizar `conv_messages.status = 'sent'` |
| 401 / 403 | `wasender_api_key` inválida o caducada; log de alerta; no reintentar |
| 429 | Rate limit; insertar en `conv_send_queue` con backoff exponencial |
| 5xx | Error temporal; insertar en `conv_send_queue`; reintentar hasta 3 veces |
| Timeout de red | Tratar como 5xx |

## 7. Datos / contratos involucrados

- `conv_wa_sessions` — `wasender_session_id`, `wasender_api_key`, `webhook_secret`, `status`
- `conv_messages` — `wasender_message_id` (índice parcial único para deduplicación: `CREATE UNIQUE INDEX uq_wa_message_id ON conv_messages (client_account_id, wasender_message_id) WHERE wasender_message_id IS NOT NULL;`)
- `conv_send_queue` — cola exclusiva de reintentos de envío saliente
- `conv_service_activations` — verificación de nivel 3 y gestión de offboarding
- `saas_service_subscriptions` — verificación de nivel 1
- `contract-normalized-message.md` — estructura del `NormalizedMessage` producido por este canal

## 8. Errores comunes

Evitar estos errores al implementar la integración:

- **Responder 200 tarde:** el 200 debe enviarse al inicio del handler, antes de cualquier consulta a base de datos o validación. Si el proceso tarda demasiado, Wasender puede reenviar el webhook.
- **Usar `@s.whatsapp.net` en el campo `to`:** Wasender usa `@c.us` para números de usuario. El sufijo incorrecto causa error silencioso o rechazo de entrega.
- **Usar el campo `message` en lugar de `text`:** el nombre del campo es `text`. La API no devuelve error explícito pero el mensaje no llega.
- **No deduplicar antes de insertar en `conv_messages`:** sin deduplicación, un webhook reenviado por Wasender crea un mensaje duplicado y dispara WF-10 dos veces.
- **Normalizar audio antes de la transcripción:** el `NormalizedMessage` de un `audioMessage` solo puede construirse cuando la transcripción ha finalizado. No usar el `audioMessage` crudo como texto.
- **Verificar firma antes de responder 200:** el orden correcto es 200 primero, validación después.
- **Propagar el número de teléfono a n8n:** el número de teléfono usado en el fast-path de identidad no debe salir de la capa de EFs.

## 9. Qué no debe hacerse

- Llamar a la API de Wasender directamente desde n8n (siempre usar `conv-send-wa`).
- Devolver HTTP 4xx a Wasender por cualquier motivo.
- Usar `X-Wasender-Token` o cualquier header distinto de `X-Webhook-Signature`.
- Tener más de una sesión Wasender activa para el mismo tenant.
- Modificar el número de teléfono del campo `sender_ref` añadiendo o quitando sufijos en el `NormalizedMessage` (el sufijo `@c.us` se elimina en la normalización, no en el envío).
- Publicar el texto bruto de los mensajes en el activity log del Core.
- Llamar a endpoints de Wasender no documentados en `rules-30-whatsapp-channel.md`.

## 10. Escenarios mínimos de prueba

1. **Firma válida → mensaje procesado:**
   Webhook con `X-Webhook-Signature` correcto, sesión activa, niveles 1-2-3 superados, `wasender_message_id` nuevo → se crea registro en `conv_messages` y se llama a `conv-ingest`.

2. **Firma inválida → descarte silencioso:**
   Webhook con `X-Webhook-Signature` incorrecto → respuesta 200, sin registro en `conv_messages`, sin llamada a `conv-ingest`.

3. **Mensaje duplicado → descarte silencioso:**
   Mismo `wasender_message_id` enviado dos veces → el segundo se descarta sin error; no se crea registro duplicado.

4. **Nivel 2 inactivo → descarte silencioso:**
   `conv_wa_sessions.status = 'disconnected'` → respuesta 200, sin procesamiento posterior.

5. **Envío exitoso:**
   `conv-send-wa` llama a Wasender con body correcto (`to`, `@c.us`, `text`) → `conv_messages.status = 'sent'`.

6. **Fallo de envío → entra en cola:**
   Wasender devuelve 5xx → se inserta en `conv_send_queue` con `max_retries=3`; no se actualiza `status='sent'`.

7. **Offboarding logout:**
   `mode='logout'` → llama a `POST .../disconnect` → `conv_wa_sessions.status='disconnected'`, `conv_service_activations.is_active=false`.

8. **Audio → espera transcripción:**
   Webhook de `audioMessage` → no se llama a `conv-ingest` hasta que WF-C00-TRANSCRIBE devuelva el texto; el `NormalizedMessage` tiene `is_transcribed: true`.

## 11. Criterio de done

La integración se considera correctamente implementada cuando:

- `conv-wa-webhook` responde HTTP 200 en todos los casos sin excepción
- La comprobación de jerarquía (niveles 1, 2, 3) se realiza en ese orden y un fallo en cualquier nivel detiene el procesamiento silenciosamente
- La deduplicación por `wasender_message_id` impide la creación de mensajes duplicados
- El cuerpo de envío saliente usa exactamente `{ sessionId, to: "<phone>@c.us", text }`
- Los mensajes de audio se encolan para transcripción y no se normalizan hasta tener el texto
- `conv-send-wa` verifica el estado de la sesión antes de llamar a Wasender
- Los fallos de envío se insertan en `conv_send_queue` con backoff configurado
- `conv-offboard-wa-session` soporta `mode: 'logout'` y `mode: 'delete'` con semánticas distintas
- El número de teléfono nunca sale de la capa de EFs hacia n8n

## 12. Documentos relacionados

- `rules-30-whatsapp-channel.md` — reglas del canal WhatsApp
- `rules-20-tenant-activation-and-lifecycle.md` — jerarquía de activación
- `rules-80-data-and-privacy.md` — política de PII
- `rules-90-observability-and-failure-handling.md` — `conv_send_queue` y reconciliación
- `contract-normalized-message.md` — estructura del NormalizedMessage
- `skill-identity-validation.md` — fast-path por teléfono que `conv-ingest` ejecuta antes de WF-01
- `rules-02-project-structure-and-addons.md` — convención de namespace de las EFs `conv-wa-*`

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`
