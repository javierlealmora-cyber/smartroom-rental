# n8n Integration DEV Test Report — Fase 11C4

## Resumen de cobertura

| Suite | Grupo | Tests activos | DEV_REQUIRED |
|-------|-------|---------------|--------------|
| `n8n-integration-dev.spec.ts` | N11C3-REC (reconciliación) | 10 | No |
| `n8n-integration-dev.spec.ts` | N11C4-PRE (precheck) | 16 | No |
| `n8n-integration-dev.spec.ts` | N11C4-REG (registry) | 15 | No |
| `n8n-integration-dev.spec.ts` | N11C4-CTL (control plane) | 8 | No |
| `n8n-integration-dev.spec.ts` | N11C4-PORT (port) | 12 | No |
| `n8n-integration-dev.spec.ts` | N11C4-PRIV (privacy) | 7 | No |
| `n8n-integration-dev.spec.ts` | N11C4-DOC (docs/scripts) | 11 | No |
| **Subtotal** | | **79** | |
| `n8n-integration-dev-runtime.spec.ts` | N11C4-RTM-MODOS | 11 | No |
| `n8n-integration-dev-runtime.spec.ts` | N11C4-RTM-CONT | 12 | No |
| `n8n-integration-dev-runtime.spec.ts` | N11C4-RTM-CALL | 10 | No |
| `n8n-integration-dev-runtime.spec.ts` | N11C4-RTM-IDEM | 9 | No |
| `n8n-integration-dev-runtime.spec.ts` | N11C4-RTM-RES | 10 | No |
| **Subtotal** | | **52** | |
| `n8n-integration-dev-contracts.spec.ts` | N11C4-CNT-MT (multi-tenant) | 10 | No |
| `n8n-integration-dev-contracts.spec.ts` | N11C4-CNT-WFB (boundaries) | 13 | No |
| `n8n-integration-dev-contracts.spec.ts` | N11C4-CNT-DB (DB) | 6 | No |
| `n8n-integration-dev-contracts.spec.ts` | N11C4-CNT-RET (retención) | 8 | No |
| `n8n-integration-dev-contracts.spec.ts` | N11C4-CNT-VER (versioning) | 6 | No |
| `n8n-integration-dev-contracts.spec.ts` | N11C4-CNT-CAN (canary) | 8 | No |
| `n8n-integration-dev-contracts.spec.ts` | N11C4-CNT-BND (generales) | 12 | No |
| **Subtotal** | | **63** | |
| `n8n-integration-dev-adversarial.spec.ts` | N11C4-ADV-INJ (inyección) | 15 | No |
| `n8n-integration-dev-adversarial.spec.ts` | N11C4-ADV-AUTH (auth/replay) | 10 | No |
| `n8n-integration-dev-adversarial.spec.ts` | N11C4-ADV-BND (boundaries) | 10 | No |
| `n8n-integration-dev-adversarial.spec.ts` | N11C4-ADV-NODE (node allowlist) | 5 | No |
| **Subtotal** | | **40** | |
| **TOTAL n8n DEV** | | **234** | 0 |

## Baseline de regresión (post-11C4)

- `test:sc:regression`: 3476 passed / 64 skipped / 146 todo (invariante)
- `test:sc:ai-integration-dev`: 223/223 (post-11C3)

## Tests DEV_REQUIRED (pendientes de instancia n8n)

Todos los tests de la Fase 11C4 son offline. Los siguientes escenarios requieren instancia DEV real:
- Smoke scripts con modo `real`
- Tests de shadow con llamada real paralela
- Validación de callback HMAC-SHA256 real
- Canary con tenant ficticio sobre instancia activa

Estos se añadirán en la Fase 11C5 cuando se active la instancia DEV.

## Estado: N8N_INTEGRATION_OFFLINE_READY_DEV_PENDING

234 tests pasan offline. 0 tests DEV_REQUIRED activos.
La instancia n8n DEV es prerrequisito para pasar a `N8N_INTEGRATION_DEV_VALIDATED`.
