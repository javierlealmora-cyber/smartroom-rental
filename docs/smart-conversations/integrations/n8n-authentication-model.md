# n8n Authentication Model — Fase 11C4

## Token de servicio (N8N_SERVICE_TOKEN)

Todas las llamadas del adapter a n8n incluyen:

```
Authorization: Bearer ${N8N_SERVICE_TOKEN}
```

El token está almacenado en los secrets de las Edge Functions (Supabase Vault).
**Nunca aparece en código fuente ni en stubs de workflow.**

### Obtención del token

- DEV: configurar en `.env.local` con `N8N_SERVICE_TOKEN=dev-token-placeholder`
- PRE/PRO: gestionar mediante Vault (no en este repo)

### Rotación

Si el token se compromete, rotar en Vault y redeploy de EFs.

## Validación de callbacks (n8n → EF)

Los callbacks de n8n hacia las Edge Functions se autentican con:

1. **Timestamp anti-replay**: `timestamp_iso` en el cuerpo (ISO 8601 UTC)
   - Rechazado si `now - ts > 5 minutos`
   - Rechazado si `ts - now > 60 segundos` (futuro excesivo)

2. **HMAC-SHA256** (a implementar con instancia real):
   - Header: `X-N8N-Signature: sha256=<hmac>`
   - Secret: `N8N_CALLBACK_SIGNING_SECRET` en Vault
   - Body: raw bytes del payload JSON

3. **idempotency_key**: UUID único que el adapter envía y n8n retorna.
   Evita procesar el mismo callback dos veces.

4. **correlation_id**: Identifica la sesión/caso. Requerido en todo callback.

## Restricciones de transporte

- Solo HTTPS
- Sin tokens en query params
- Sin credenciales en logs
- `N8N_WEBHOOK_BASE_URL` no contiene credenciales

## Estado DEV

| Mecanismo | Estado |
|-----------|--------|
| `N8N_SERVICE_TOKEN` | ⏳ configurar en DEV |
| Timestamp anti-replay | ✅ implementado en `orchestration-port.ts` |
| HMAC-SHA256 callback | ⏳ activar con instancia real |
| idempotency_key | ✅ validado |
| correlation_id | ✅ validado |
