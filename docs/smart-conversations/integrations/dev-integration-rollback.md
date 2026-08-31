# DEV Integration Rollback — SmartConversations Fase 11C1

## Principios

- Cada integración puede volver a mock sin despliegue destructivo.
- No borrar recursos externos automáticamente como rollback.
- Preservar correlation_id y logs para diagnóstico.
- El rollback flag está en memoria (integration-canary.ts) — persiste hasta restart.

---

## Por integración

### core

| campo | valor |
|-------|-------|
| variable | CORE_INTEGRATION_MODE |
| valor mock | mock |
| valor canary | canary |
| valor real | real |
| cómo desactivar | Cambiar var de entorno a `mock` y restart EFs |
| datos externos posibles | Ninguno (core.identity.validate y query son solo lectura) |
| cómo evitar duplicados | N/A (operaciones de lectura) |
| cómo comprobar recuperación | `npm run smoke:dev:core` en modo mock |
| rollback programático | `activateRollback('dev-tenant-a', 'core')` |
| responsable | SmartConversations dev team |

### ai

| campo | valor |
|-------|-------|
| variable | AI_INTEGRATION_MODE |
| valor mock | mock |
| valor canary | canary |
| valor real | real |
| cómo desactivar | Cambiar var a `mock` y restart |
| datos externos posibles | Consultas a API del proveedor IA (lectura, sin escritura) |
| cómo evitar duplicados | N/A (clasificación es sin estado) |
| cómo comprobar recuperación | `npm run smoke:dev:ai` en modo mock |
| rollback programático | `activateRollback('dev-tenant-a', 'ai')` |
| responsable | SmartConversations dev team |

### n8n

| campo | valor |
|-------|-------|
| variable | N8N_INTEGRATION_MODE |
| valor mock | mock |
| valor canary | canary |
| valor real | real |
| cómo desactivar | Cambiar var a `mock` y restart |
| datos externos posibles | Ejecuciones de workflow en n8n DEV |
| cómo evitar duplicados | idempotency_key en todas las llamadas |
| cómo comprobar recuperación | `npm run smoke:dev:n8n` en modo mock |
| rollback programático | `activateRollback('dev-tenant-a', 'n8n')` |
| responsable | SmartConversations dev team |

### incidents_addon

| campo | valor |
|-------|-------|
| variable | INCIDENTS_ADDON_INTEGRATION_MODE |
| valor mock | mock |
| valor canary | canary |
| valor real | real |
| cómo desactivar | Cambiar var a `mock` y restart |
| datos externos posibles | Incidencias creadas en add-on DEV |
| cómo evitar duplicados | idempotency_key — el retry devuelve el mismo incident_id |
| cómo comprobar recuperación | `npm run smoke:dev:incidents-addon` en modo mock |
| rollback programático | `activateRollback('dev-tenant-a', 'incidents_addon')` |
| responsable | SmartConversations dev team + Equipo add-on |

### listings_addon

| campo | valor |
|-------|-------|
| variable | LISTINGS_ADDON_INTEGRATION_MODE |
| valor mock | mock |
| valor canary | canary |
| valor real | real |
| cómo desactivar | Cambiar var a `mock` y restart |
| datos externos posibles | Leads creados en add-on DEV |
| cómo evitar duplicados | idempotency_key — el retry devuelve el mismo lead_id |
| cómo comprobar recuperación | `npm run smoke:dev:listings-addon` en modo mock |
| rollback programático | `activateRollback('dev-tenant-a', 'listings_addon')` |
| responsable | SmartConversations dev team + Equipo add-on |

### realtime

| campo | valor |
|-------|-------|
| variable | REALTIME_INTEGRATION_MODE |
| valor mock | mock |
| valor canary | canary |
| valor real | real |
| cómo desactivar | Cambiar var a `mock` y restart |
| datos externos posibles | Suscripciones Supabase Realtime DEV (cleanup automático) |
| cómo evitar duplicados | N/A (suscripciones son sin estado) |
| cómo comprobar recuperación | `npm run smoke:dev:realtime` — WebChat cae a polling |
| rollback programático | `activateRollback('dev-tenant-a', 'realtime')` |
| responsable | SmartConversations dev team |

### wasender

| campo | valor |
|-------|-------|
| variable | WASENDER_INTEGRATION_MODE |
| valor mock | mock |
| valor canary | canary |
| valor real | real |
| cómo desactivar | Cambiar var a `mock` y restart |
| datos externos posibles | Mensajes WhatsApp enviados desde número DEV (no recuperables) |
| cómo evitar duplicados | idempotency_key en outbound + dedup por provider_message_id en inbound |
| cómo comprobar recuperación | `npm run smoke:dev:wasender` en modo mock |
| rollback programático | `activateRollback('dev-tenant-a', 'wasender')` |
| responsable | SmartConversations dev team |

---

## Procedimiento general de rollback

1. Detectar fallo (smoke fail, error en canary, degradación de métricas).
2. Preservar `correlation_id` y logs del incidente.
3. Activar rollback programático: `activateRollback(DEV_TENANT_A, integration)`.
4. Verificar que el modo efectivo ha vuelto a mock.
5. Ejecutar smoke en modo mock para confirmar recuperación.
6. Investigar causa raíz antes de reactivar.
7. Documentar en `dev-integration-test-report.md`.
