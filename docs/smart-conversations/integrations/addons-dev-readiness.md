# Add-ons DEV Readiness — Fase 11C5

**Fecha de cierre documental:** 2026-07-25
**Estado global:** `ADDONS_INTEGRATION_OFFLINE_READY_DEV_PENDING`
**GATE_0:** `PASS_WITH_WARNINGS`
**GATE_1:** `AUDIT_COMPLETE_REMEDIATION_PENDING` — no cerrar hasta auditoría externa completa

---

## 1. Estados posibles

| Estado | Significado |
|--------|------------|
| `MOCK_ONLY` | Solo modo mock activo; ningún endpoint DEV configurado |
| `CONTRACT_READY` | Puertos y contratos definidos; sin endpoint real |
| `DEV_CONFIGURATION_PENDING` | Contratos listos, endpoint DEV no configurado |
| `DEV_CANARY_READY` | Endpoint configurado, canary habilitado, sin activo |
| `DEV_CANARY_ACTIVE` | Canary activo para tenant DEV-A |
| `DEV_VALIDATED` | Smoke DEV real pasó para todos los add-ons |
| `BLOCKED_BY_ADDON` | Problema en el add-on externo impide activar |
| `CONTRACT_MISMATCH` | El add-on devolvió una respuesta fuera del contrato |
| `ROLLED_BACK_TO_MOCK` | Se revirtió a mock por fallo en DEV |
| `NOT_EXECUTED_CONFIGURATION_PENDING` | Smoke DEV no ejecutado — falta configuración |

---

## 2. Estado por operación (Fase 11C5)

| Operación | Estado offline | Estado DEV | Estado combinado |
|-----------|---------------|-----------|-----------------|
| `createIncident` | `INCIDENTS_INTEGRATION_OFFLINE_READY` | `INCIDENTS_DEV_CONFIGURATION_PENDING` | `INCIDENTS_INTEGRATION_OFFLINE_READY_DEV_PENDING` |
| `searchListings` | `LISTINGS_SEARCH_OFFLINE_READY` | `LISTINGS_SEARCH_DEV_CONFIGURATION_PENDING` | `LISTINGS_SEARCH_OFFLINE_READY_DEV_PENDING` |
| `createLead` | `LEAD_CREATION_OFFLINE_READY` | `LEAD_CREATION_DEV_CONFIGURATION_PENDING` | `LEAD_CREATION_OFFLINE_READY_DEV_PENDING` |

Smokes reales por operación: todos en `NOT_EXECUTED_CONFIGURATION_PENDING`.

---

## 3. Estado por add-on (Fase 11C5)

| Add-on | Estado actual | Env var URL | Env var TOKEN |
|--------|--------------|-------------|---------------|
| Incidencias | `INCIDENTS_DEV_CONFIGURATION_PENDING` | `INCIDENTS_ADDON_BASE_URL` ❌ no configurada | `INCIDENTS_ADDON_SERVICE_TOKEN` ❌ no configurado |
| Publicaciones | `LISTINGS_SEARCH_DEV_CONFIGURATION_PENDING` | `LISTINGS_ADDON_BASE_URL` ❌ no configurada | `LISTINGS_ADDON_SERVICE_TOKEN` ❌ no configurado |
| Leads (via listings) | `LEAD_CREATION_DEV_CONFIGURATION_PENDING` | (mismo que listings) | (mismo que listings) |

**Estado global: `ADDONS_INTEGRATION_OFFLINE_READY_DEV_PENDING`**

---

## 4. Smokes y exit codes

| Script | Tipo | Exit sin config | Exit con config | Exit con `--allow-pending` |
|--------|------|----------------:|----------------:|---------------------------:|
| `smoke-offline-incidents-addon.mjs` | Offline | 0 (15/15) | N/A | N/A |
| `smoke-offline-listings-addon.mjs` | Offline | 0 (15/15) | N/A | N/A |
| `smoke-dev-incidents-addon.mjs` | Real DEV | **2** | 0 si validado | 0, estado sigue pending |
| `smoke-dev-listings-addon.mjs` | Real DEV | **2** | 0 si validado | 0, estado sigue pending |
| `smoke-dev-addons.mjs` | Agregado DEV | **2** | 0 si ambos validados | 0, estado sigue pending |

Exit code 2 = `NOT_EXECUTED_CONFIGURATION_PENDING`. No es un fallo técnico.
`--allow-pending` no cambia el estado a validado ni constituye evidencia de integración DEV.

---

## 5. Archivos creados en Fase 11C1 (descubiertos en precheck 11C5)

| Archivo | Estado |
|---------|--------|
| `supabase/functions/_shared/smart-conversations/adapters/incidents-addon-adapter.ts` | Completo (11C1) |
| `supabase/functions/_shared/smart-conversations/adapters/listings-addon-adapter.ts` | Completo (11C1) |
| `supabase/functions/conv-core-create-incident/` | Existe |
| `supabase/functions/conv-core-create-lead/` | Existe |
| `supabase/functions/conv-core-query-listings/` | Existe |
| `supabase/functions/conv-wf20-incidents/` | Existe |
| `supabase/functions/conv-wf30-listings/` | Existe |

---

## 6. Archivos creados en Fase 11C5

| Archivo | Propósito |
|---------|-----------|
| `canonical-actor.ts` | Actor canónico unificado (tenant_profile, unverified_lead, system_service) |
| `incidents-integration-port.ts` | Puerto neutral IncidentIntegrationPort v1.0 |
| `listings-integration-port.ts` | Puerto neutral ListingsIntegrationPort v1.0 |

---

## 7. Cobertura de tests (offline) — conteo runtime

| Suite | Declaraciones estáticas | Tests runtime |
|-------|------------------------:|--------------:|
| `addons-integration-dev.spec.ts` | 60 | 68 |
| `addons-integration-dev-runtime.spec.ts` | 65 | 65 |
| `addons-integration-dev-contracts.spec.ts` | 55 | 55 |
| `addons-integration-dev-adversarial.spec.ts` | 45 | 45 |
| `addons-dev-closure.spec.ts` (cierre documental) | 28 | 28 |
| **Total 11C5** | **253** | **261** |

---

## 8. Histórico de regresión (canónico)

| Punto | Incremento | Passed acumulados |
|-------|------------|-------------------|
| Cierre Fase 11C3 | — | 3476 |
| Fase 11C4 — n8n | +234 | 3710 |
| Fase 11C5 — add-ons (suites 1–4) | +233 | 3943 |
| Fase 11C5 — cierre documental | +28 | **3971** |

3476 + 234 + 233 + 28 = **3971**

---

## 9. Restricciones de seguridad absolutas

- No desplegar PRE / No desplegar PRO / No resetear DEV
- No usar datos personales reales en tests ni smokes
- No activar IA real / No activar Wasender real / No activar Realtime real
- No dar acceso directo a n8n sobre los add-ons
- No dar acceso directo a SmartConversations sobre tablas de add-ons
- No dar acceso a add-ons sobre tablas `conv_*`
- No crear claves foráneas entre proyectos
- No compartir `service_role` entre proyectos
- No exponer credenciales en frontend

---

## 10. Próximos pasos para activar DEV

1. Levantar instancia DEV de incidencias → configurar `INCIDENTS_ADDON_BASE_URL` y `INCIDENTS_ADDON_SERVICE_TOKEN`
2. Levantar instancia DEV de publicaciones → configurar `LISTINGS_ADDON_BASE_URL` y `LISTINGS_ADDON_SERVICE_TOKEN`
3. Ejecutar `npm run test:smoke:dev:incidents-addon` → verificar exit 0 y estado `INCIDENTS_DEV_VALIDATED`
4. Ejecutar `npm run test:smoke:dev:listings-addon` → verificar exit 0 y estado `LISTINGS_DEV_VALIDATED`
5. Activar canary para tenant DEV-A con `INCIDENTS_ADDON_INTEGRATION_MODE=canary`
6. Ejecutar `npm run test:smoke:dev:addons` → estado final `ADDONS_INTEGRATION_DEV_VALIDATED`
