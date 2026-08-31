# Variables de entorno — SmartConversations Core Integration

Variables para la integración controlada con SmartRoom Core.
**No incluir valores reales. No commitear secrets.**

## Control de modo

```dotenv
# Modo de integración con Core: 'mock' (default) o 'real'
# Si no se define, el sistema usa mock — nunca llama al Core real.
CORE_INTEGRATION_MODE=mock
```

## Configuración de Core (solo si CORE_INTEGRATION_MODE=real)

```dotenv
# URL base del SmartRoom Core (sin trailing slash)
# Ejemplo de formato — NO poner URL real aquí
CORE_BASE_URL=https://core.your-instance.example.com

# Token de servicio para autenticar llamadas internas EF→Core
# Generar con: openssl rand -hex 32
# NUNCA enviar a n8n, IA, logs ni Activity Log
CORE_SERVICE_TOKEN=REPLACE_WITH_SERVICE_TOKEN

# Timeout por llamada en milisegundos (default: 5000)
CORE_TIMEOUT_MS=5000

# Máximo de reintentos para errores 5xx/timeout (default: 3)
# No configurar más de 3 — el backoff es 1s/5s/30s
CORE_MAX_RETRIES=3
```

## Headers de integración (opcionales)

```dotenv
# Nombre del header de autenticación (default: Authorization)
CORE_AUTH_HEADER_NAME=Authorization

# Nombre del header de tenant (default: X-Client-Account-Id)
CORE_TENANT_HEADER_NAME=X-Client-Account-Id

# Nombre del header de request ID (default: X-Request-Id)
CORE_REQUEST_ID_HEADER_NAME=X-Request-Id
```

## Operaciones permitidas (allowlist interna)

Las siguientes operaciones están en el allowlist de `core-http-client.ts`.
No se puede llamar a ningún path arbitrario — solo estos paths internos:

| Operación | Path relativo |
|---|---|
| `core.identity.validate` | `/smartroom/conversations/identity/validate` |
| `core.incidents.create` | `/smartroom/conversations/incidents` |
| `core.listings.query` | `/smartroom/conversations/listings/search` |
| `core.leads.create` | `/smartroom/conversations/leads` |
| `core.help.kb.query` | `/smartroom/conversations/help/kb/search` |
| `core.help.tickets.create` | `/smartroom/conversations/help/tickets` |

**Nota:** Los paths son placeholders hasta que se confirme el contrato Core real.
No activar `CORE_INTEGRATION_MODE=real` hasta confirmar endpoints con el equipo Core.

## Notas de seguridad

1. `CORE_SERVICE_TOKEN` nunca debe aparecer en logs, stubs n8n, Activity Log ni payloads hacia n8n.
2. Si `CORE_INTEGRATION_MODE` no está definida, el sistema usa `mock` automáticamente.
3. En modo `real`, si falta `CORE_BASE_URL`, las llamadas devuelven `CORE_CONFIG_MISSING` sin crash.
4. Los endpoints `core.*` solo son accesibles desde Edge Functions con service_role.
5. n8n **no** llama directamente a Core — pasa siempre por EF internas.
6. El frontend **no** llama directamente a Core para SmartConversations.
7. Rotar `CORE_SERVICE_TOKEN` tras cualquier exposición accidental.
8. No hardcodear `CORE_BASE_URL` ni `CORE_SERVICE_TOKEN` en código fuente.

## Política de retry

| Tipo de error | Retry | Backoff |
|---|---|---|
| 4xx (400–499) | No | — |
| 401/403 | No | — |
| 404 | No | — |
| 422 | No | — |
| 5xx (500–599) | Sí, máx 3 | 1s / 5s / 30s |
| Timeout | Sí, máx 3 | 1s / 5s / 30s |

No se usa `next_retry_at` ni `attempt_count`. El retry es variable local por llamada.
