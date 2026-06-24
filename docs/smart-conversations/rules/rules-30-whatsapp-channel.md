# rules-30-whatsapp-channel.md — SmartConversations: Canal WhatsApp (Wasender)

## 1. Propósito

Este documento define todas las reglas que gobiernan el canal WhatsApp: autenticación del webhook, recepción de mensajes, deduplicación, tipos de mensaje soportados, formato de envío saliente, ciclo de vida de la sesión y la contribución de este canal al activity log de SmartRoom Core.

Las referencias de implementación para `conv-wa-webhook`, `conv-send-wa` y `conv-offboard-wa-session` derivan de este documento.

---

## 2. Alcance

Este documento aplica a:

- EF `conv-wa-webhook` (receptor del webhook entrante)
- EF `conv-send-wa` (emisor de mensajes salientes)
- EF `conv-offboard-wa-session` (gestión del ciclo de vida de la sesión)
- Tabla `conv_wa_sessions`
- Tabla `conv_messages` (campos específicos de WhatsApp)
- Llamadas a la REST API de Wasender

---

## 3. Decisiones No Negociables

1. **El canal WhatsApp debe usar Wasender exclusivamente.** Ningún otro proveedor de WhatsApp está permitido.

2. **Una sesión Wasender por tenant.** Un tenant mapea exactamente a un `wasender_session_id`. Múltiples sesiones para el mismo tenant están prohibidas.

3. **La separación de servicios dentro de WhatsApp es lógica, no física.** Todos los servicios (`conv_incidencias`, `conv_publicaciones`, `conv_ayuda`) comparten el mismo número. El enrutado lo realiza WF-10, no la capa de canal.

4. **El webhook siempre debe responder 200.** Independientemente de la validez de la firma, el estado de activación del tenant o la duplicación del mensaje. El sistema nunca debe devolver 4xx a Wasender.

5. **La respuesta 200 debe enviarse antes de comenzar cualquier procesamiento.** El procesamiento ocurre de forma asíncrona después de entregar el 200.

6. **El formato del cuerpo del mensaje saliente es fijo.** El endpoint `/api/send-message` de Wasender usa `to`, `text` y `sessionId`. No se admiten nombres de campo alternativos.

---

## 4. Reglas Obligatorias

### 4.1 Autenticación del webhook

El webhook entrante de Wasender lleva el header `X-Webhook-Signature`.

Procedimiento de autenticación:
1. Extraer `X-Webhook-Signature` de los headers de la petición.
2. Compararlo directamente (igualdad de cadenas) con `conv_wa_sessions.webhook_secret` de la sesión correspondiente.
3. Si la comparación falla o el header está ausente: responder 200 silencioso, registrar el evento y detener el procesamiento.
4. No se usa HMAC. La comparación es igualdad directa de cadenas.

### 4.2 Temporización de la respuesta

La respuesta 200 debe enviarse a Wasender antes de que comience cualquier comprobación de activación, deduplicación o procesamiento de mensaje.

El procesamiento es asíncrono y ocurre después de devolver el 200. Si el procesamiento falla tras enviar el 200, Wasender no reintenta la entrega. Estos fallos de procesamiento entrante se recuperan mediante `conv_messages.status` y el job de reconciliación (`WF-C00-RECONCILE`): el mensaje permanece en `status = 'received'` y el job lo reintenta según `rules-90-observability-and-failure-handling.md` §4.4. `conv_send_queue` (Sección 4.7) es exclusivamente la cola de reintentos de envío saliente al usuario; no interviene en la recuperación de fallos de procesamiento de mensajes entrantes.

### 4.3 Comprobación de la jerarquía de tres niveles

Tras responder 200, `conv-wa-webhook` debe evaluar en orden:

```
1. Resolver wasender_session_id del payload → buscar client_account_id en conv_wa_sessions
   Si no se encuentra sesión → log + detener

2. Nivel 1: saas_service_subscriptions WHERE service_code='smart_conversations'
   AND status='active' AND client_account_id = <resuelto>
   Si inactiva → detener silenciosamente

3. Nivel 2: conv_wa_sessions.status = 'active'
   Si no activa → detener silenciosamente

4. Nivel 3: conv_service_activations WHERE channel='whatsapp' AND is_active=true
   AND client_account_id = <resuelto>
   Debe existir al menos una fila → si ninguna → detener silenciosamente
```

Véase `rules-20-tenant-activation-and-lifecycle.md` para la definición completa de la jerarquía.

### 4.4 Deduplicación de mensajes

Antes de crear cualquier registro en `conv_messages`, el webhook debe comprobar si `wasender_message_id` ya existe para ese `client_account_id`.

```sql
SELECT id FROM conv_messages
WHERE client_account_id = <X>
AND wasender_message_id = <Y>
LIMIT 1
```

Si se encuentra una fila: detener silenciosamente. No procesar el duplicado.

La base de datos debe reforzar esto con un constraint único parcial:

```sql
UNIQUE (client_account_id, wasender_message_id) NULLS NOT DISTINCT
```

### 4.5 Tipos de mensaje soportados

| Tipo Wasender | Tratamiento | Transcripción de audio |
|---|---|---|
| `conversation` | Normalizar directamente como `text` | No |
| `extendedTextMessage` | Extraer `text` + capturar `reply_to_id` del mensaje citado | No |
| `audioMessage` | Descargar audio → encolar para transcripción (WF-C00-TRANSCRIBE) → normalizar con texto transcrito | Sí |
| `imageMessage` | Guardar URL de imagen + caption como `text` | No |
| `documentMessage` | Ignorar en V1, log informativo | No |

Los tipos no listados deben ignorarse silenciosamente con un log informativo. No deben generar una respuesta de error ni una respuesta del bot al usuario.

Un mensaje de audio no debe normalizarse hasta que la transcripción esté completa. El `NormalizedMessage` producido para un mensaje de audio debe tener `is_transcribed: true` y `text` con el resultado de la transcripción.

### 4.6 Formato del mensaje saliente (EF `conv-send-wa`)

El endpoint de envío de Wasender:

```
POST https://api.wasender.com/api/send-message
Headers: { Authorization: "Bearer <wasender_api_key>" }
Body:
{
  "sessionId": "<wasender_session_id>",
  "to": "<phone_number>@c.us",
  "text": "<message_text>"
}
```

Reglas:
- El campo `to` debe usar el sufijo `@c.us`. El sufijo `@s.whatsapp.net` está prohibido.
- El campo de texto del mensaje se llama `text`, no `message`.
- El número de teléfono en `to` debe estar en formato internacional con el sufijo `@c.us` y sin espacios.
- `conv-send-wa` debe verificar `conv_wa_sessions.status = 'active'` antes de llamar a la API de Wasender.
- Si la sesión no está activa, el envío debe fallar inmediatamente e insertarse en `conv_send_queue` con `max_retries = 3`.

### 4.7 Cola de reintentos de envío

Si un envío falla, el mensaje se inserta en `conv_send_queue`:

- `max_retries = 3`
- Backoff: 1s → 5s → 30s (exponencial)
- Tras 3 fallos: `UPDATE conv_messages.status = 'failed'`

Un job de reconciliación de n8n debe procesar las entradas de `conv_send_queue` y reintentar los envíos fallidos.

### 4.8 Ciclo de vida de la sesión

Véase `rules-20-tenant-activation-and-lifecycle.md` Sección 4.6 para las reglas completas de offboarding.

Resumen:
- `mode: 'logout'` — llama a `POST .../disconnect`. El slot de sesión se conserva en Wasender.
- `mode: 'delete'` — llama a `DELETE .../sessions/{id}`. La sesión se elimina permanentemente de Wasender.

Ambos modos establecen `conv_wa_sessions.status = 'disconnected'` y `conv_service_activations.is_active = false` para el canal `whatsapp`.

### 4.9 Contribución del canal WhatsApp al activity log del Core

Los siguientes eventos desencadenados por el canal WhatsApp deben publicarse en el activity log de SmartRoom Core mediante Integration API:

| Desencadenante | Evento publicado |
|---|---|
| Primer mensaje de una sesión que supera los tres niveles de activación | `conv_conversation_started` |
| Identidad validada mediante fast-path por coincidencia de teléfono | `conv_identity_validated` |
| Incidencia oficial creada a raíz de una conversación de WhatsApp | `conv_incident_created` |
| Lead registrado a raíz de una consulta de anuncio por WhatsApp | `conv_lead_created` |
| Caso escalado a un admin humano desde WhatsApp | `conv_case_escalated` |
| Caso resuelto o cerrado | `conv_case_closed` |

El canal WhatsApp nunca debe publicar el contenido individual de los mensajes en el activity log del Core. Los eventos de actividad contienen únicamente metadatos funcionales: IDs, enums, timestamps y referencias. Véase `rules-75-activity-log.md` para el formato completo del evento y el catálogo.

---

## 5. Casos Permitidos

- La sesión WhatsApp de un tenant en estado `disconnected` mientras la suscripción umbrella está activa (webhooks ignorados silenciosamente en el nivel 2).
- Un `audioMessage` en cola para transcripción; la conversación continúa con mensajes de texto mientras el audio está pendiente.
- Un webhook de Wasender que llega con un `wasender_message_id` ya presente en `conv_messages`; el duplicado se descarta silenciosamente.
- Un fallo de envío que resulta en una inserción en `conv_send_queue` y su posterior reintento.

---

## 6. Casos Prohibidos

- Devolver HTTP 4xx a Wasender por cualquier motivo.
- Usar `X-Wasender-Token` o cualquier header distinto a `X-Webhook-Signature` para la autenticación.
- Usar `chatId`, `@s.whatsapp.net` o `message` en el cuerpo del envío de Wasender.
- Procesar un mensaje sin verificar los tres niveles de activación.
- Insertar en `conv_messages` sin deduplicación previa.
- Llamar a la API de Wasender directamente desde n8n (debe hacerse siempre a través de `conv-send-wa`).
- Normalizar un mensaje de audio antes de que la transcripción esté completa.
- Tener más de una sesión Wasender activa para el mismo tenant.
- Publicar el texto bruto de los mensajes en el activity log del Core.

---

## 7. Impacto en el Diseño

- `conv-wa-webhook` es una puerta pura: autentica, valida, deduplica y transfiere a `conv-ingest`. No contiene lógica de servicio.
- `conv-send-wa` es el único camino válido para los mensajes salientes de WhatsApp. n8n nunca debe llamar a Wasender directamente.
- El `NormalizedMessage` producido a partir de mensajes de WhatsApp no debe incluir el sufijo `@c.us` en `sender_ref`.
- El tratamiento del audio requiere un paso de transcripción asíncrono antes de que el mensaje entre en el motor conversacional.

---

## 8. Impacto en la Implementación

- El endpoint del webhook de Wasender debe registrarse como público (sin auth de Supabase requerida) pero debe realizar su propia comprobación de firma.
- `conv-wa-webhook` debe registrar el `wasender_session_id` y un tipo de mensaje saneado para cada webhook recibido, incluso los ignorados silenciosamente.
- Los workflows de n8n que envían mensajes de WhatsApp deben llamar a `conv-send-wa` mediante HTTP POST, no a la API de Wasender directamente.
- La publicación en el activity log debe ocurrir dentro de la EF correspondiente tras completarse con éxito la operación en el Core, no desde n8n.

---

## 9. Dependencias

- `rules-00-scope-and-principles.md` — principios P1, P3, P7, P8
- `rules-20-tenant-activation-and-lifecycle.md` — jerarquía de activación y offboarding
- `rules-75-activity-log.md` — eventos del activity log para el canal WhatsApp
- `rules-90-observability-and-failure-handling.md` — recuperación de fallos de procesamiento entrante mediante `conv_messages.status` y job de reconciliación
- `rules-80-data-and-privacy.md` — tratamiento de PII para números de teléfono y contenido de mensajes
- `contract-normalized-message.md` — estructura del NormalizedMessage producido por este canal
- `rules-02-project-structure-and-addons.md` — convención de namespace de las EFs `conv-wa-webhook`, `conv-send-wa`, `conv-offboard-wa-session`

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`

---

## 10. Checklist de Validación

- [ ] `conv-wa-webhook` responde 200 en todos los casos
- [ ] La respuesta 200 se envía antes de que comiencen las comprobaciones de activación
- [ ] La autenticación usa `X-Webhook-Signature` con comparación directa de cadenas
- [ ] Los niveles 1, 2 y 3 se comprueban en orden después de responder 200
- [ ] `wasender_message_id` se deduplica antes de cualquier insert
- [ ] El cuerpo saliente usa `to`, `@c.us` y `text` (no `chatId`, `@s.whatsapp.net`, `message`)
- [ ] Los mensajes de audio se encolan para transcripción; no se normalizan hasta que la transcripción esté completa
- [ ] `conv-send-wa` comprueba el estado de la sesión antes de llamar a Wasender
- [ ] Los eventos del activity log se publican mediante Integration API, no como registros brutos de mensajes
- [ ] Ningún workflow de n8n llama directamente a la API de Wasender

---

## 11. Notas de Control de Cambios

Si Wasender cambia el nombre del header de autenticación, este documento debe actualizarse y debe definirse una ruta de migración para los valores `webhook_secret` de los tenants existentes.

Si Wasender cambia la ruta del endpoint de envío o el esquema del cuerpo, tanto este documento como `skill-whatsapp-wasender-integration.md` deben actualizarse conjuntamente.
