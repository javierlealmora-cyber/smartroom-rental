# AI Integration — DEV Readiness

**Fase:** 11C3  
**Estado:** `AI_DEV_CONFIGURATION_PENDING` (infraestructura lista, proveedor pendiente)  
**Fecha:** 2026-07-24

## Resumen

La capa de integración AI está completa en código y tests. No hay proveedor aprobado para DEV, por lo que todas las llamadas no-mock devuelven `AI_DEV_CONFIGURATION_PENDING`.

## Checklist de readiness

| # | Componente | Estado |
|---|-----------|--------|
| 1 | `ai-integration-adapter.ts` | READY |
| 2 | `environment-model.ts` (Debt 1) | READY |
| 3 | `validate-dev-integrations.mjs` stripComments (Debt 2) | READY |
| 4 | Canary allowlist 6 ops AI | READY |
| 5 | 4 suites test (≥170 tests) | READY |
| 6 | Validator `validate-ai-dev-integration.mjs` | READY |
| 7 | Smoke `smoke-ai-dev.mjs` (18 pasos) | READY |
| 8 | 8 documentos | READY |
| 9 | Scripts npm + CI | READY |
| 10 | Proveedor AI aprobado | PENDIENTE |

## Estado por operación

| Operación | Estado | Fallback |
|-----------|--------|---------|
| `classifyIntent` (ai.intent.classify) | `AI_DEV_CONFIGURATION_PENDING` | `unknown, confidence=0` |
| `extractIncident` (ai.incident.extract) | `AI_DEV_CONFIGURATION_PENDING` | `missing_fields, is_complete=false` |
| `extractListings` (ai.listing.extract) | `AI_DEV_CONFIGURATION_PENDING` | `missing_fields, is_complete=false` |
| `extractHelp` (ai.help.extract) | `AI_DEV_CONFIGURATION_PENDING` | `requires_private_data=false` |
| `summarizeCase` (ai.safe_summary) | `AI_DEV_CONFIGURATION_PENDING` | `facts=[], uncertainties=['ai_unavailable']` |
| `draftResponse` (ai.response_draft) | `AI_DEV_CONFIGURATION_PENDING` | `text='¿Puede indicarme en qué puedo ayudarle?'` |

## Para activar proveedor

1. Obtener aprobación de proveedor AI para DEV
2. Configurar `AI_PROVIDER` en Supabase secrets DEV
3. Actualizar `AI_DEV_CONFIGURATION_PENDING` → proveedor real en `ai-integration-adapter.ts`
4. Ejecutar `test:sc:ai-integration-dev` para confirmar

## Constraints

- No desplegar PRE/PRO hasta pruebas DEV completas
- No usar datos personales reales en tests
- El proveedor no recibe: `profile_id`, `sender_ref`, `email`, ni ningún campo de `AI_FORBIDDEN_INPUT_FIELDS`
