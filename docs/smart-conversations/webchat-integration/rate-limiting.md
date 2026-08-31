# Rate Limiting WebChat (Fase 10F)

## Descripción

El rate limiting controla el número de mensajes inbound que un widget puede enviar,
protegiendo `conv-ingest` de abuso.

## Cuándo se aplica

En `conv-web-message`, **antes** de llamar a `conv-ingest`. Si se supera el límite,
se devuelve HTTP 429 sin procesar el mensaje ni llamar a dispatch.

## Modos

| `WEBCHAT_RATE_LIMIT_MODE` | Comportamiento |
|---------------------------|----------------|
| `mock` (default)          | Siempre permite. Sin consultas a DB. |
| `database`                | Cuenta mensajes inbound en `conv_messages`. |

## Límites (modo database)

| Límite | Default | Variable |
|--------|---------|----------|
| Por sesión/minuto | 30 | `WEBCHAT_RATE_LIMIT_PER_SESSION_PER_MINUTE` |
| Por tenant/minuto | 300 | `WEBCHAT_RATE_LIMIT_PER_TENANT_PER_MINUTE` |
| Ventana | 60 segundos | `WEBCHAT_RATE_LIMIT_WINDOW_SECONDS` |

## Respuesta 429

```json
{
  "ok": false,
  "error": {
    "code": "WEBCHAT_RATE_LIMIT_SESSION_EXCEEDED",
    "message": "Limite de mensajes por sesion excedido",
    "detail": {
      "retry_after_seconds": 45
    }
  }
}
```

Códigos de error:
- `WEBCHAT_RATE_LIMIT_SESSION_EXCEEDED` — límite de sesión.
- `WEBCHAT_RATE_LIMIT_TENANT_EXCEEDED` — límite de tenant.
- `WEBCHAT_RATE_LIMIT_CONFIG_ERROR` — error en consulta (HTTP 500).

## Privacidad

- El rate limiter usa `count: 'exact', head: true` — no lee `message_text`.
- El 429 no contiene el texto del mensaje enviado.
- No se registra en Activity Log.
- No llama `conv-ingest` ni `conv-dispatch-message`.

## Variables de entorno

```env
WEBCHAT_RATE_LIMIT_MODE=mock
```
