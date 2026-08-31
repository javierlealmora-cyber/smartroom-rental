# Integration Canary Plan — SmartConversations Fase 11C1

## Principios

- Solo tenants ficticios de DEV en la allowlist.
- Sin UUIDs reales de PRE/PRO.
- Activación individual por integración.
- Rollback disponible en cualquier momento sin despliegue.
- Expiración configurada para evitar canary permanente.

## Tenant canary DEV

```
dev-tenant-a-00000000-0000-0000-0000-000000000001  → Tenant principal canary
dev-tenant-b-00000000-0000-0000-0000-000000000002  → Solo para tests cross-tenant (no en canary)
```

Estos UUIDs son ficticios. No corresponden a ningún tenant de PRE o PRO.

## Allowlist por integración

| integración | tenant | operaciones | activado | expira | responsable | rollback |
|------------|--------|-------------|---------|--------|-------------|---------|
| core | dev-tenant-a | identity.validate, listings.query, help.kb.query, tenant.features | 2026-07-23 | 2026-12-31 | dev-team | ✅ automático |
| ai | dev-tenant-a | intent.classify, listing.extract, help.extract | 2026-07-23 | 2026-12-31 | dev-team | ✅ automático |
| n8n | dev-tenant-a | wf10..wf92 | 2026-07-23 | 2026-12-31 | dev-team | ✅ automático |
| incidents_addon | dev-tenant-a | incident.create | 2026-07-23 | 2026-12-31 | dev-team | ✅ automático |
| listings_addon | dev-tenant-a | listings.search, lead.create | 2026-07-23 | 2026-12-31 | dev-team | ✅ automático |
| realtime | dev-tenant-a | subscribe, unsubscribe | 2026-07-23 | 2026-12-31 | dev-team | ✅ automático |
| wasender | — | — | pendiente | — | — | n/a |

## Ciclo de vida canary por integración

```
mock
  → contract test (offline)
  → preflight DEV
  → real canary (dev-tenant-a)
  → smoke (casos normales)
  → errores y timeouts
  → aislamiento cross-tenant
  → rollback a mock (verificado)
  → aprobación individual → DEV_VALIDATED
```

Una integración no puede avanzar al siguiente paso sin superar el anterior.

## Rollback automático

Si el smoke de una integración falla:
1. `activateRollback(DEV_TENANT_A, integration)` → rollback_flag = true
2. Todos los requests de ese tenant+integración → modo mock automático
3. Sin despliegue destructivo ni borrado de recursos externos

Para reactivar:
1. Investigar causa raíz
2. `clearRollback(DEV_TENANT_A, integration)` → rollback_flag = false
3. Repetir smoke antes de reactivar canary

## Tenant fuera de allowlist

- Siempre recibe modo mock.
- Nunca entra accidentalmente en modo real.
- El check es explícito en `checkCanaryAllowlist`.
