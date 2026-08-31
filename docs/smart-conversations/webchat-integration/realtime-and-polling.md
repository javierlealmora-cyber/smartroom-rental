# Realtime y Polling Fallback WebChat (Fase 10F)

## Principio fundamental

**`conv_messages` es la fuente de verdad.** Realtime solo notifica que hay mensajes;
el widget SIEMPRE recupera el contenido via polling (`conv-web-poll`), nunca del payload Realtime.

## Realtime (best-effort)

`conv-web-deliver` intenta publicar una notificación Realtime después de persistir el mensaje.

### Notificación Realtime

```json
{
  "event_type": "webchat_message_available",
  "client_account_id": "uuid-del-tenant",
  "session_id": "uuid-de-la-sesion",
  "message_id": "uuid-del-mensaje",
  "created_at": "2026-07-19T10:00:00.000Z",
  "channel": "webchat"
}
```

**No contiene**: `message_text`, `sender_ref`, `profile_id` ni datos PII.

### Modos de Realtime

| `WEBCHAT_REALTIME_MODE` | Comportamiento |
|--------------------------|----------------|
| `mock` (default)        | Devuelve `{ published: true }` sin conexión real. |
| `real`                  | Devuelve `{ published: false, error: 'REALTIME_PROVIDER_NOT_CONFIGURED' }`. |

### Fallo de Realtime

- NO se hace rollback del mensaje persistido.
- Se loguea un warning sanitizado.
- La respuesta sigue siendo HTTP 200.
- `realtime_notified: false` en la respuesta.

## Polling fallback (`conv-web-poll`)

El widget puede llamar periódicamente para recuperar mensajes aunque Realtime falle.

### Input

```json
{
  "client_account_id": "uuid-del-tenant",
  "session_id": "uuid-de-la-sesion",
  "sender_ref": "wc_<32hex>",
  "after_created_at": "2026-07-19T09:00:00.000Z",
  "after_message_id": "uuid-del-ultimo-mensaje",
  "limit": 20
}
```

### Output

```json
{
  "ok": true,
  "data": {
    "messages": [
      {
        "message_id": "...",
        "direction": "outbound",
        "sender_type": "bot",
        "message_text": "Respuesta del sistema",
        "created_at": "...",
        "status": "sent"
      }
    ],
    "next_cursor": {
      "after_message_id": "...",
      "after_created_at": "..."
    },
    "has_more": false
  }
}
```

### Filtros

- Solo mensajes `direction='outbound'` y `channel='webchat'`.
- Solo mensajes de la sesión del `sender_ref` autenticado.
- Cursor determinístico: `after_created_at` + `after_message_id`.
- `has_more`: detectado via consulta `limit+1`.

### Límites

| Variable | Default |
|----------|---------|
| `WEBCHAT_POLLING_MODE` | `mock` |
| Max mensajes por llamada | 50 |
| Default si no se especifica | 20 |
| Lookback máximo | 24 horas |

## Variables de entorno

```env
WEBCHAT_REALTIME_MODE=mock
WEBCHAT_POLLING_MODE=mock
```
