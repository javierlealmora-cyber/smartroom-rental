# Token de Sesión WebChat (Fase 10F)

## Descripción

El token de sesión WebChat es un JWT simplificado firmado con HMAC-SHA256 que permite
autenticar las peticiones del widget en modo `signed_token`.

## Modos de autenticación

| `WEBCHAT_AUTH_MODE` | Comportamiento |
|----------------------|----------------|
| `legacy` (default)  | Sin token. Compatible con Fase 10E. |
| `signed_token`      | Token requerido en `Authorization: Bearer`. |

## Estructura del token

```
base64url(payload).base64url(signature)
```

### Claims del payload

```json
{
  "client_account_id": "uuid-del-tenant",
  "session_id": "uuid-de-la-sesion",
  "sender_ref": "wc_<32hex>",
  "channel": "webchat",
  "issued_at": 1719000000,
  "expires_at": 1719007200,
  "token_version": 1
}
```

**Sin PII**: no contiene nombre, email, teléfono ni datos de identidad.

## Variables de entorno

```env
WEBCHAT_AUTH_MODE=signed_token
WEBCHAT_SESSION_SIGNING_SECRET=<secreto-de-al-menos-32-caracteres>
WEBCHAT_SESSION_TOKEN_TTL_MINUTES=120
```

## Flujo

1. Widget llama `conv-web-session` con `client_account_id`.
2. Si `WEBCHAT_AUTH_MODE=signed_token`, la respuesta incluye `webchat_session_token`.
3. Widget almacena el token localmente.
4. En cada petición a `conv-web-message` o `conv-web-poll`, incluye:
   ```
   Authorization: Bearer <webchat_session_token>
   ```
5. La EF verifica la firma y las claims antes de procesar.

## Verificación

El helper `verifyWebchatSessionToken()` en `webchat-session-token.ts`:
- Verifica la firma HMAC-SHA256.
- Verifica que `expires_at` no ha pasado.
- Devuelve `{ valid: true, claims }` o `{ valid: false, reason }`.

Razones de fallo:
- `INVALID_FORMAT` — token malformado.
- `INVALID_SIGNATURE` — firma no coincide.
- `EXPIRED` — token caducado.
- `INVALID_CLAIMS` — claims faltantes o tipo incorrecto.
- `MISSING_SECRET` — `signingSecret` vacío en configuración.

## Seguridad

- El signing secret nunca se devuelve al widget.
- El token no se loguea.
- El token no se devuelve en respuestas de error.
- Las claims se verifican contra el body de la petición (tenant, sesión, sender).
