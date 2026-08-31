# SmartConversations -- WebChat: Contrato del widget

Contrato de la API publica del widget WebChat embebible.
El widget es un cliente frontend que se comunica con las Edge Functions.

## Flujo (Opcion A -- dispatch sincrono controlado)

```
Widget           conv-web-session    conv-web-message    conv-ingest    conv-dispatch-message    conv-web-deliver
  |                    |                   |                  |                 |                       |
  |-- POST /session -->|                   |                  |                 |                       |
  |<-- {session_id} --|                   |                  |                 |                       |
  |                    |                   |                  |                 |                       |
  |-- POST /message ---|------------------>|                  |                 |                       |
  |                    |              valida sesion           |                 |                       |
  |                    |              isOpaqueSenderRef       |                 |                       |
  |                    |              longitud maxima         |                 |                       |
  |                    |                   |-- POST /ingest -->|                |                       |
  |                    |                   |<-- {message_id}--|                 |                       |
  |                    |                   |-- POST /dispatch ----------------->|                       |
  |                    |                   |    (session_id, message_id)        |                       |
  |                    |                   |                   routing/WF/outbound--->|                 |
  |                    |                   |                                          |-- /web-deliver -->|
  |<-- {ok, received}-|-------------------|                                                             |
```

**conv-ingest** registra/normaliza el mensaje. **conv-dispatch-message** es el unico orquestador que llama routing, WF-20/30/40 y outbound. El widget recibe `{ ok: true, message_id, status: 'received' }` sin esperar el resultado del dispatch.

## POST /functions/v1/conv-web-session

Crea una sesion WebChat opaca para el tenant.

### Input

```json
{
  "client_account_id": "uuid-del-tenant",
  "origin": "https://example.com",
  "widget_public_key": "clave-publica-opcional"
}
```

### Campos PROHIBIDOS en el input del widget publico

Los siguientes campos son rechazados con HTTP 400. El widget no puede enviar datos de identidad sin JWT firmado:

| Campo | Razon |
|-------|-------|
| `profile_id` | Requiere JWT firmado para identidad autenticada |
| `phone` | PII no aceptada desde frontend sin autenticacion |
| `phone_number` | PII |
| `identity_data` | Solo puede ser establecida por el backend |
| `room_id` | ID interno, no aceptado desde frontend |
| `assignment_id` | ID interno, no aceptado desde frontend |
| `raw_payload` | Payload tecnico, nunca desde frontend |
| `tokens` / `jwt` / `authorization` / `service_role` | Credenciales, nunca desde frontend |

**Nota**: La identidad WebChat autenticada (para clientes que inician sesion) se implementara en una fase posterior usando JWT firmado por Supabase Auth. Hasta entonces, toda sesion WebChat inicia con `identity_level=NO_MATCH`.

### Output exitoso (200)

```json
{
  "ok": true,
  "data": {
    "session_id": "uuid-de-la-sesion",
    "sender_ref": "wc_<32hex>",
    "channel": "webchat",
    "expires_at": "2026-07-19T14:00:00.000Z",
    "services_available": ["conv_incidencias", "conv_publicaciones", "conv_ayuda"],
    "status": "ready"
  }
}
```

### Nunca se devuelve

- `service_role`
- `profile_id`
- `phone` / `phone_number`
- `identity_data`
- `raw_payload`
- `room_id`
- `assignment_id`
- `tokens` / `authorization` / `jwt`

### Errores posibles

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| VALIDATION | 400 | client_account_id ausente o invalido |
| ACCOUNT_INACTIVE | 403 | WebChat no activo para el tenant |
| FORBIDDEN | 403 | Origin no permitido |
| INTERNAL | 500 | Error al crear sesion |

## POST /functions/v1/conv-web-message

Envia un mensaje del usuario al sistema SmartConversations.

### Input

```json
{
  "client_account_id": "uuid-del-tenant",
  "session_id": "uuid-de-la-sesion",
  "sender_ref": "wc_<32hex>",
  "message_text": "Texto del mensaje del usuario"
}
```

### Output exitoso (200)

```json
{
  "ok": true,
  "data": {
    "ok": true,
    "message_id": "uuid-del-mensaje",
    "status": "received"
  }
}
```

### Nunca se devuelve

- JSON tecnico interno
- Errores internos con traza
- Datos PII del tenant o del usuario

### Errores posibles

| Codigo | HTTP | Descripcion |
|--------|------|-------------|
| VALIDATION | 400 | Campo obligatorio ausente, sender_ref invalido, o mensaje demasiado largo |
| ACCOUNT_INACTIVE | 403 | WebChat no activo |
| FORBIDDEN | 403 | sender_ref no pertenece a la sesion |
| NOT_FOUND | 404 | Sesion no encontrada o no pertenece al tenant |
| INTERNAL | 500 | Error al procesar |

## Reglas del sender_ref

- Siempre comienza por `wc_` seguido de 32 caracteres hexadecimales.
- El widget NO puede inventarse un sender_ref -- debe usar el devuelto por conv-web-session.
- El sender_ref no contiene telefono, profile_id ni ningun dato PII.
- El sender_ref no es un JID de WhatsApp (@s.whatsapp.net ni @c.us).

## Servicios disponibles

Los tres servicios oficiales de SmartConversations estan disponibles en WebChat:

| Servicio | Descripcion |
|----------|-------------|
| `conv_incidencias` | Registro de incidencias de la vivienda |
| `conv_publicaciones` | Consultas sobre publicaciones y alquileres |
| `conv_ayuda` | Ayuda y FAQ general |

El routing entre servicios lo decide `conv-dispatch-message` -- el widget no decide routing.
