# n8n Callback Contract — Fase 11C4

## Flujo de callback

```
SmartConversations → n8n: OrchestrationInputDTO (con idempotency_key, correlation_id)
n8n               → EF:  OrchestrationCallbackDTO (con timestamp_iso, mismos IDs)
EF               → n8n:  HTTP 200 OK | 400 Bad Request
```

## OrchestrationCallbackDTO

```typescript
{
  contract_version: '1.0',
  workflow_code: string,         // mismo WF que la invocación
  workflow_version: string,
  correlation_id: string,        // requerido
  idempotency_key: string,       // requerido — deduplicación
  client_account_id: string,     // n8n NO puede cambiarlo
  timestamp_iso: string,         // ISO 8601 UTC — anti-replay
  ok: boolean,
  data: OrchestrationCallbackData,
  meta: Record<string, unknown>
}
```

## Validación de timestamp

| Condición | Resultado |
|-----------|-----------|
| `now - ts ≤ 5 min` | ✅ válido |
| `now - ts > 5 min` | ❌ `TIMESTAMP_TOO_OLD` |
| `ts - now > 60 s` | ❌ `TIMESTAMP_TOO_FUTURE` |
| `ts` no es fecha válida | ❌ `INVALID_TIMESTAMP` |
| `timestamp_iso` ausente | ❌ `TIMESTAMP_MISSING` |

Ventana: `CALLBACK_REPLAY_WINDOW_MS = 300_000` (5 min).

## Deduplicación de callback

El `idempotency_key` enviado por SC a n8n debe retornarse igual en el callback.
Si SC ya procesó ese `idempotency_key`, ignora el callback (idempotente).

Scope del idempotency_key: `${client_account_id}:${workflow_code}:${idempotency_key}`
Garantiza aislamiento entre tenants y entre workflows.

## Restricciones del callback

- `client_account_id` no puede cambiar respecto al de la invocación original
- `workflow_code` debe existir en el registry
- `correlation_id` requerido
- `allowed_callbacks` del registry define qué EFs pueden recibir el callback

## Errores retornados a n8n

| HTTP | Código | Descripción |
|------|--------|-------------|
| 200 | — | Callback procesado |
| 400 | `TIMESTAMP_TOO_OLD` | Fuera de ventana |
| 400 | `TIMESTAMP_MISSING` | Falta timestamp |
| 400 | `TENANT_MISMATCH` | client_account_id no coincide |
| 400 | `CORRELATION_ID_MISSING` | Falta correlation_id |
| 403 | `WORKFLOW_NOT_ALLOWED` | WF no en allowed_callbacks |
| 409 | `REPLAY_DETECTED` | idempotency_key ya procesado |
