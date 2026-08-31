# DEV Integration Test Report — SmartConversations Fase 11C1

Estado: INTEGRATIONS_OFFLINE_READY_DEV_PENDING
Fase: 11C1
Fecha: 2026-07-23

---

## Tests offline creados (Fase 11C1)

### Suite integrations-dev (162 tests activos, 0 it.todo)

| archivo | tests | categorías |
|---------|-------|------------|
| integrations-dev.spec.ts | 88 | IDV-FW (10), IDV-CORE (10), IDV-AI (10), IDV-N8N (10), IDV-INC (10), IDV-LST (10), IDV-RT (8), IDV-WAS (10), IDV-BND (10) |
| integrations-dev-runtime.spec.ts | 42 | IDR-FW (10), IDR-CORE (10), IDR-AI (10), IDR-N8N (10), IDR-INC (10), IDR-LST (7), IDR-CB (3) |
| integrations-dev-contracts.spec.ts | 32 | IDC-C (13), IDC-H (7), IDC-D (10), IDC-V (7) - actualizado: 5+6+10+7 |

**Total: 162 tests activos**

---

## Validador offline

`validate-dev-integrations.mjs`:
- Secciones: framework, canary, adapters (×7), real-mode guard, boundaries, docs, tests, CI
- Estado esperado: INTEGRATIONS_OFFLINE_READY

---

## Estado por integración

| integración | offline_tests | adapter_ready | contrato | estado_DEV | bloqueante |
|------------|--------------|--------------|---------|------------|-----------|
| core | ✅ IDV-CORE + IDR-CORE | ✅ core-http-client.ts | ✅ CORE_OPERATION_PATHS | MOCK_ONLY | URL DEV |
| ai | ✅ IDV-AI + IDR-AI | ✅ ai-client.ts | ✅ AiOperation | DEV_CONFIGURATION_PENDING | Sin proveedor |
| n8n | ✅ IDV-N8N + IDR-N8N | ✅ n8n-adapter.ts | ✅ ALLOWED_WORKFLOWS | DEV_CONFIGURATION_PENDING | n8n DEV |
| incidents_addon | ✅ IDV-INC + IDR-INC | ✅ incidents-addon-adapter.ts | ✅ CreateIncidentCommand | BLOCKED_EXTERNAL_DEPENDENCY | Endpoint DEV |
| listings_addon | ✅ IDV-LST + IDR-LST | ✅ listings-addon-adapter.ts | ✅ SearchListingsQuery | BLOCKED_EXTERNAL_DEPENDENCY | Endpoint DEV |
| realtime | ✅ IDV-RT | ✅ webchat-realtime-client.ts | ✅ canal privado | DEV_CONFIGURATION_PENDING | Config canary |
| wasender | ✅ IDV-WAS | ✅ wasender-http-client.ts | ✅ HMAC+dedup | DEV_CONFIGURATION_PENDING | Cuenta DEV |

---

## Validaciones DEV reales (pendientes Fase 11B2D)

Para cada integración disponible:

1. Preflight DEV (`npm run dev:preflight`)
2. Confirmar target DEV (APP_ENVIRONMENT=sandbox)
3. Confirmar tenant canary (dev-tenant-a)
4. Activar canary
5. Health check sanitizado
6. Smoke (casos normales)
7. Casos de error (timeout, 4xx, 5xx)
8. Cross-tenant (tenant-a no accede a datos de tenant-b)
9. Rollback a mock
10. Confirmar recuperación
11. Reactivar canary solo si aprobado

---

## Regresión completa tras Fase 11C1

- test:sc:regression: 2909+ tests (0 failed, 146 todo — intactos)
- test:sc:integrations-dev: ≥162 tests (0 failed, 0 todo)
- validate:sc:dev-integrations: 0 blockers
- build: limpio
