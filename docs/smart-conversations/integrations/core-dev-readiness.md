# Core DEV Readiness — Fase 11C2

Estado: **CORE_INTEGRATION_OFFLINE_READY**
Fecha: 2026-07-23
GATE_0: PASS_WITH_WARNINGS
GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING (no cerrar)

---

## Capacidades Core activables en DEV

| Capacidad | Adapter | Estado | Notas |
|-----------|---------|--------|-------|
| Identity validate | `core-identity-adapter.ts` | OFFLINE_READY | 4 niveles canónicos |
| Tenant features | `core-features-adapter.ts` | OFFLINE_READY | cache por tenant |
| Activity publish | `core-activity-adapter.ts` | OFFLINE_READY | fire-and-log, 13 eventos |
| Accommodation info | — | **BLOCKED_BY_CORE** | `conv-core-get-accommodation-info` no existe en Core API |

### BLOCKED_BY_CORE — Accommodation info

El endpoint `conv-core-get-accommodation-info` no existe en la API de Core DEV.
Esta capacidad permanece bloqueada hasta que Core provea el endpoint.
SmartConversations usa datos de accommodation provenientes de sus propias tablas.

---

## Entornos DEV válidos

```
DEV_ENVIRONMENTS = { 'sandbox', 'dev', 'development' }
```

- `sandbox` es el entorno canónico en tests.
- Ningún entorno PRE o PRO puede activar integraciones Core.
- Target guard: `runCoreTargetGuard()` en `core-target-guard.ts`.

---

## Tenant canary DEV

| Tenant | ID | Integración canary |
|--------|----|--------------------|
| dev-tenant-a | `dev-tenant-a-00000000-0000-0000-0000-000000000001` | core, ai, n8n, incidents_addon, listings_addon, realtime |
| dev-tenant-b | `dev-tenant-b-00000000-0000-0000-0000-000000000002` | solo mock (cross-tenant tests) |

---

## Modos de integración

| Modo | Descripción |
|------|-------------|
| `mock` | Respuesta simulada. Por defecto. |
| `shadow` | Llama a Core real pero devuelve mock al caller. Prohibido para Activity Log. |
| `canary` | Real solo para tenants en CANARY_ALLOWLIST. |
| `real` | Real para todos (solo en DEV con target guard). |
| `disabled` | Rechaza con error. |

---

## Variables de entorno requeridas

```bash
APP_ENVIRONMENT=sandbox        # o dev / development
CORE_BASE_URL=https://...      # no PRE, no PRO
CORE_SERVICE_TOKEN=<token>     # Bearer, no placeholder, no VITE_
```

---

## Rollback

Ver [core-dev-rollback.md](core-dev-rollback.md).
Rollback inmediato: `CORE_INTEGRATION_MODE=mock` sin redespliegue destructivo.
