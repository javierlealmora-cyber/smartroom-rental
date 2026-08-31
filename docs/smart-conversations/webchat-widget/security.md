# Seguridad del Widget WebChat

## Principios

1. **Sin `service_role` en el frontend.** El widget usa el anon key de Supabase o un `webchat_session_token` firmado.
2. **Sin PII en sesión.** Solo se almacena `session_id`, `sender_ref` (opaco), `client_account_id` y `expires_at`.
3. **Sin `message_text` en sesión.** Los mensajes solo se almacenan en `conv_messages` (backend).
4. **Sin `dangerouslySetInnerHTML`.** El contenido de los mensajes se renderiza como texto plano.
5. **`VITE_WEBCHAT_DEBUG=false` por defecto.** Los logs se desactivan en producción.

## Flujo de autenticación

```
Widget → conv-web-session (POST, anon) → { session_id, sender_ref, webchat_session_token }
Widget → conv-web-message (POST, Bearer <token>) → mensaje encolado
Widget → conv-web-poll    (POST, Bearer <token>) → mensajes recibidos
```

El `webchat_session_token` es un HMAC-SHA256 firmado en el backend. El widget lo usa como Bearer token pero nunca puede generarlo ni verificarlo.

## Variables prohibidas en VITE_

- `VITE_SUPABASE_SERVICE_ROLE_KEY` — nunca incluir
- Signing secrets — nunca incluir
- Claves privadas — nunca incluir
- Credenciales de Wasender, IA o n8n — nunca incluir

## CORS

El backend valida el `Origin` del widget contra `conv_wc_configs.allowed_origins`. Configurar en producción para evitar accesos no autorizados.
