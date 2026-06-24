# contract-normalized-message.md — NormalizedMessage

## 1. Propósito

`NormalizedMessage` es la estructura canónica a la que se convierte cualquier mensaje entrante, independientemente del canal de origen (WhatsApp vía Wasender o WebChat).

Es el contrato de interfaz entre la capa de recepción de canal (EFs) y el motor conversacional (n8n). Cualquier consumidor de `NormalizedMessage` debe tratarlo como una representación estable y agnóstica al canal de un único mensaje de usuario.

---

## 2. Cuándo se utiliza

Este contrato aplica cada vez que `conv-ingest` recibe un mensaje de cualquier EF de canal y produce un payload para despachar a n8n (WF-01 para WhatsApp, WF-02 para WebChat).

También rige lo que se almacena como registro primario del mensaje en `conv_messages` y lo que se despacha a los workflows de n8n posteriores (WF-10 y los workflows de servicio).

---

## 3. Productor

**EF `conv-ingest`** es el único productor de instancias de `NormalizedMessage`.

`conv-ingest` es llamado internamente por:
- `conv-wa-webhook` (para mensajes de WhatsApp)
- `conv-web-message` (para mensajes de WebChat)

Las EFs específicas de canal pasan sus entradas en bruto a `conv-ingest`. `conv-ingest` es responsable de la normalización completa, incluyendo la extracción de los resultados de transcripción de la cola de audio.

---

## 4. Consumidor

**n8n WF-01** (workflow de entrada de WhatsApp) y **n8n WF-02** (workflow de entrada de WebChat) consumen `NormalizedMessage` como su entrada principal.

Desde WF-01 y WF-02, una versión enriquecida con contexto del mensaje se pasa a **WF-10** (motor conversacional). WF-10 y los workflows de servicio (WF-20, WF-30, WF-40) también acceden a `message_type`, `text`, `is_transcribed` y `channel` del payload normalizado.

**`conv_messages`** almacena los campos del mensaje normalizado junto al `raw_payload` (que no forma parte de `NormalizedMessage` en sí).

---

## 5. Estructura

```typescript
interface NormalizedMessage {
  // Identidad
  message_id:         string;         // UUID generado por conv-ingest
  external_id?:       string;         // wasender_message_id o ID de mensaje del cliente web

  // Contexto de tenant y canal
  client_account_id:  string;         // UUID del tenant
  channel:            'whatsapp' | 'webchat';

  // Contexto de sesión
  session_id?:        string;         // UUID de conv_sessions (puede estar ausente en el primer mensaje)
  sender_ref:         string;         // número de teléfono (WhatsApp) o session_id web (WebChat)

  // Contenido del mensaje
  message_type:       'text' | 'audio' | 'image' | 'document' | 'system';
  text?:              string;         // texto del mensaje o transcripción si es audio
  audio_url?:         string;         // URL del audio original (solo para audio)
  image_url?:         string;         // URL de la imagen (solo para image)
  media_caption?:     string;         // caption para imagen o documento
  is_transcribed:     boolean;        // true cuando text proviene de transcripción de audio

  // Contexto de cita/respuesta
  reply_to_id?:       string;         // external_id del mensaje al que se responde

  // Timestamps
  received_at:        string;         // ISO 8601 — cuando llegó el mensaje al webhook o gateway
}
```

`raw_payload` se almacena en `conv_messages.raw_payload` pero no forma parte de `NormalizedMessage`. Nunca debe aparecer en el payload enviado a n8n.

---

## 6. Campos Obligatorios

| Campo | Tipo | Obligatorio | Descripción | Notas |
|---|---|---|---|---|
| `message_id` | `string (UUID v4)` | Siempre | Identificador interno del mensaje generado por `conv-ingest` | Generado por el sistema. Inmutable tras la creación. |
| `client_account_id` | `string (UUID v4)` | Siempre | UUID del tenant | Debe coincidir con una fila en `client_accounts`. |
| `channel` | `'whatsapp' \| 'webchat'` | Siempre | Canal de entrega de origen | Enum fijo. Ningún otro valor es válido. |
| `sender_ref` | `string` | Siempre | Identificador del remitente en este canal | Teléfono (WhatsApp, sin sufijo) o UUID de sesión (WebChat). |
| `message_type` | `'text' \| 'audio' \| 'image' \| 'document' \| 'system'` | Siempre | Tipo de contenido del mensaje | Enum fijo. |
| `is_transcribed` | `boolean` | Siempre | Indica si `text` es una transcripción de audio | Debe ser `true` cuando `message_type = 'audio'`. |
| `received_at` | `string (ISO 8601)` | Siempre | Timestamp de llegada al webhook o gateway | Debe estar en UTC. |

---

## 7. Campos Opcionales

| Campo | Tipo | Obligatorio cuando | Descripción | Si ausente |
|---|---|---|---|---|
| `external_id` | `string` | Siempre presente en WhatsApp | `wasender_message_id` usado para deduplicación | Ausente en mensajes WebChat sin ID externo |
| `session_id` | `string (UUID)` | Tras la creación de sesión | UUID de la fila en `conv_sessions` | Ausente en el primer mensaje de una sesión nueva |
| `text` | `string` | Obligatorio cuando `message_type IN ('text', 'audio')` | Texto del mensaje o transcripción de audio | Ausente para `image` sin caption, `document`, `system` |
| `audio_url` | `string (URL)` | Obligatorio cuando `message_type = 'audio'` | URL del archivo de audio original | Ausente para todos los demás tipos |
| `image_url` | `string (URL)` | Obligatorio cuando `message_type = 'image'` | URL del archivo de imagen | Ausente para todos los demás tipos |
| `media_caption` | `string` | Opcional | Caption adjunto a imagen o documento | Ausente cuando no hay caption |
| `reply_to_id` | `string` | Opcional | `external_id` del mensaje que se cita o al que se responde | Ausente cuando no es una respuesta |

---

## 8. Reglas de Validación

1. `message_id` debe ser un UUID v4. No puede ser nulo. No puede ser igual a `external_id`.

2. `client_account_id` debe estar siempre presente. No puede ser nulo.

3. `channel` debe ser uno de `'whatsapp'` o `'webchat'`. Ningún otro valor es válido.

4. `sender_ref` para WhatsApp debe ser un número de teléfono en formato internacional (por ejemplo, `+34612345678`). No debe incluir `@c.us`, `@s.whatsapp.net` ni ningún otro sufijo. Esos sufijos se usan únicamente en las llamadas a la API de Wasender, no en este contrato.

5. `sender_ref` para WebChat es el UUID del `session_id`.

6. Cuando `message_type = 'audio'`, `text` debe estar presente y contener la transcripción. `is_transcribed` debe ser `true`. Un `NormalizedMessage` para un mensaje de audio no debe producirse hasta que la transcripción esté completa.

7. Cuando `message_type = 'text'`, `text` debe estar presente y no debe ser una cadena vacía.

8. Cuando `message_type = 'image'`, `image_url` debe estar presente.

9. `is_transcribed` debe ser `false` para todos los valores de `message_type` excepto `audio`.

10. `received_at` debe ser una cadena de fecha y hora ISO 8601 válida en UTC.

11. `raw_payload` nunca debe aparecer en el payload de `NormalizedMessage`. Se almacena por separado en `conv_messages.raw_payload`.

12. Este contrato no debe transportar PII del remitente más allá de `sender_ref`. No debe incluir `full_name`, `profile_id`, `room_label`, `residence_name` ni `assignment_id`.

13. Cuando `channel = 'webchat'`, `message_type` no puede ser `'audio'` ni `'document'` en V1. Estos tipos no están soportados en WebChat V1 y deben rechazarse en `conv-web-message` antes de la normalización.

---

## 9. Ejemplos Válidos

### Mensaje de texto de WhatsApp (completamente poblado)

```json
{
  "message_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "external_id": "3EB0C767D1B3A3B012AC",
  "client_account_id": "550e8400-e29b-41d4-a716-446655440000",
  "channel": "whatsapp",
  "session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "sender_ref": "+34612345678",
  "message_type": "text",
  "text": "Hola, tengo una avería en el baño",
  "is_transcribed": false,
  "received_at": "2026-05-10T14:32:01Z"
}
```

### Mensaje de audio de WhatsApp (tras transcripción)

```json
{
  "message_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "external_id": "3EB1D868E2C4B4C123BD",
  "client_account_id": "550e8400-e29b-41d4-a716-446655440000",
  "channel": "whatsapp",
  "sender_ref": "+34612345678",
  "message_type": "audio",
  "text": "Tengo un problema con el grifo del baño, está goteando desde ayer",
  "audio_url": "https://storage.example.com/audio/3EB1D868.ogg",
  "is_transcribed": true,
  "received_at": "2026-05-10T14:35:15Z"
}
```

### Mensaje de texto de WebChat (sesión anónima)

```json
{
  "message_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "client_account_id": "550e8400-e29b-41d4-a716-446655440000",
  "channel": "webchat",
  "session_id": "d4e5f6a7-b8c9-0123-defa-234567890123",
  "sender_ref": "d4e5f6a7-b8c9-0123-defa-234567890123",
  "message_type": "text",
  "text": "¿Cuándo es el próximo pago del alquiler?",
  "is_transcribed": false,
  "received_at": "2026-05-10T14:40:00Z"
}
```

### Mensaje de WhatsApp en respuesta a otro mensaje (quoted)

```json
{
  "message_id": "e5f6a7b8-c9d0-1234-efab-345678901234",
  "external_id": "3EB2E979F3D5C5D234CE",
  "client_account_id": "550e8400-e29b-41d4-a716-446655440000",
  "channel": "whatsapp",
  "session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "sender_ref": "+34612345678",
  "message_type": "text",
  "text": "Sí, como le dije antes, es el grifo del baño",
  "reply_to_id": "3EB0C767D1B3A3B012AC",
  "is_transcribed": false,
  "received_at": "2026-05-10T14:43:00Z"
}
```

---

## 10. Ejemplos Inválidos

### Audio sin transcripción

```json
{
  "message_type": "audio",
  "text": null,
  "is_transcribed": false
}
```

**Inválido porque:** `text` debe contener la transcripción cuando `message_type = 'audio'`. `is_transcribed` debe ser `true`. Un `NormalizedMessage` para audio solo debe producirse después de que la transcripción esté completa.

### Teléfono con sufijo de Wasender en sender_ref

```json
{
  "channel": "whatsapp",
  "sender_ref": "+34612345678@c.us"
}
```

**Inválido porque:** `sender_ref` debe ser el número de teléfono sin sufijo. El sufijo `@c.us` se usa únicamente en las llamadas de envío a la API de Wasender.

### raw_payload incluido en el payload

```json
{
  "message_id": "...",
  "raw_payload": { "key": "value" }
}
```

**Inválido porque:** `raw_payload` no forma parte de `NormalizedMessage`. Se almacena por separado y nunca debe enviarse a n8n.

### PII en el contexto de sender_ref

```json
{
  "channel": "whatsapp",
  "sender_ref": "+34612345678",
  "full_name": "María González",
  "profile_id": "a1b2c3d4-..."
}
```

**Inválido porque:** `full_name` y `profile_id` no son campos de este contrato. Este contrato no debe transportar PII más allá de `sender_ref`.

### Mensaje de audio de WebChat en V1

```json
{
  "channel": "webchat",
  "message_type": "audio"
}
```

**Inválido porque:** `message_type = 'audio'` no está soportado para WebChat en V1. Debe rechazarse antes de la normalización.

### Texto vacío en mensaje de tipo text

```json
{
  "message_type": "text",
  "text": "",
  "is_transcribed": false
}
```

**Inválido porque:** `text` no puede ser una cadena vacía cuando `message_type = 'text'`.

---

## 11. Notas de Versionado

Esta es la versión 1.0 del contrato `NormalizedMessage`.

- Añadir nuevos campos opcionales es un cambio no disruptivo. Los consumidores deben gestionar los campos opcionales desconocidos de forma elegante (ignorar, no generar error).
- Eliminar o renombrar cualquier campo obligatorio es un breaking change y requiere incrementar la versión.
- Cambiar la semántica de `sender_ref` (por ejemplo, cambiar su formato) es un breaking change.
- Añadir un nuevo valor al enum `message_type` requiere actualizaciones simultáneas en: este contrato, el constraint `CHECK` de `conv_messages`, la lógica de normalización en `conv-ingest` y el tratamiento en WF-01/WF-02.
- Los consumidores no deben fallar ante la presencia de campos opcionales desconocidos. Deben ignorarlos silenciosamente.
- `raw_payload` nunca se añadirá a este contrato. Pertenece únicamente a `conv_messages`.

**Nota de privacidad:** este contrato transporta `sender_ref` (teléfono o UUID de sesión). Nunca debe transportar `full_name`, `profile_id`, `assignment_id`, `room_label` ni `residence_name`. Esos campos son resultados de la resolución de identidad, no contenido del mensaje. Los consumidores que necesiten contexto de identidad deben leerlo desde `conv_sessions`, no desde este contrato.

---

## 12. Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`
