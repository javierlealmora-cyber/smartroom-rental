# Core Integration Contracts — Fase 11C2

Catálogo de contratos de integración SmartConversations → Core DEV.

Fecha: 2026-07-23

---

## Contratos activos

| Contrato | Adapter | Documento |
|----------|---------|-----------|
| Identity Validate | `core-identity-adapter.ts` | [core-identity-contract.md](core-identity-contract.md) |
| Tenant Features | `core-features-adapter.ts` | [core-features-contract.md](core-features-contract.md) |
| Activity Publish | `core-activity-adapter.ts` | [core-activity-contract.md](core-activity-contract.md) |

## Contratos bloqueados

| Contrato | Razón | Documento |
|----------|-------|-----------|
| Accommodation Info | BLOCKED_BY_CORE — endpoint no existe | [core-dev-readiness.md](core-dev-readiness.md) |

---

## Principios comunes

1. **Auth backend-to-backend**: `CORE_SERVICE_TOKEN` como Bearer. Nunca `VITE_`. Nunca desde request de usuario.
2. **Cross-tenant guard**: Toda respuesta Core verifica que `client_account_id` de la respuesta coincide con el solicitado.
3. **X-Client-Account-Id**: Header mandatorio en todas las peticiones Core.
4. **X-Request-Id**: Header de correlación en todas las peticiones.
5. **Fail-closed**: Target guard rechaza si no se cumplen todos los checks.
6. **Sin acceso directo a tablas Core**: SmartConversations no consulta tablas `core_*` directamente.
7. **Sin acceso Core a tablas conv_***: Core no conoce el esquema de SmartConversations.

---

## Flujo de activación progresiva

```
CORE_INTEGRATION_MODE=mock       → sin llamadas reales
CORE_INTEGRATION_MODE=shadow     → dual-write (prohibido para Activity Log)
CORE_INTEGRATION_MODE=canary     → real solo para CANARY_ALLOWLIST
CORE_INTEGRATION_MODE=real       → real para todos (solo DEV con target guard)
```
