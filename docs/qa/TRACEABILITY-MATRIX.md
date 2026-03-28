# Matriz de Trazabilidad — SmartRent QA

Conecta requisitos, código, migraciones SQL y tests. Para la cobertura funcional operativa, ver también [qa/COVERAGE.md](../../qa/COVERAGE.md).

**Última actualización:** 2026-03-28

---

## Resumen

| Elemento | Total | Con Tests | Sin Tests |
|----------|-------|-----------|-----------|
| Requisitos (REQ) | 4 | 4 | 0 |
| Cambios (CHG) | 2 | 1 | 1 |
| Migraciones schema | 6 | 0 | 6 |
| Migraciones security | 1 | 1 | 0 |
| Edge Functions críticas | 3 | 2 | 1 |

**Cobertura funcional:** 57% completa, 76% con parciales (detalle en [qa/COVERAGE.md](../../qa/COVERAGE.md))

---

## REQUISITOS ACTUALES (REQ)

### REQ-001 — Auth Portals

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Requisito | `docs/requirements/current/REQ-001-auth-portals.md` | ✅ Documentado |
| Código principal | `src/providers/AuthProvider.jsx`, `src/router/RequireAuth.jsx`, `src/router/RequireRole.jsx` | ✅ Implementado |
| Migraciones | `00000000000001_baseline_schema.sql` (profiles), `00000000000003_baseline_rls.sql` | ✅ Aplicadas |
| Tests unitarios | `qa/unit/components/guards/RequireAuth.test.jsx` (AUTH-04), `qa/unit/components/guards/RequireRole.test.jsx` (AUTH-05) | ✅ Cubierto |
| Tests E2E | `qa/e2e/specs/auth.spec.js` (AUTH-01..06), `tests/e2e/specs/smoke.spec.js` | ⚠️ Parcial (AUTH-03, AUTH-06 requieren credenciales) |
| Cobertura | AUTH-04, AUTH-05 ✅ · AUTH-01, AUTH-02 ⚠️ · AUTH-03, AUTH-06 🚧 | 33% completa, 50% parcial |

---

### REQ-002 — Tenants Lifecycle

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Requisito | `docs/requirements/current/REQ-002-tenants-lifecycle.md` | ✅ Documentado |
| Código principal | `src/pages/v2/admin/tenants/TenantsList.jsx`, `src/services/lodgers.service.js`, `src/utils/lodgerStatus.js` | ✅ Implementado |
| Migraciones | `00000000000001_baseline_schema.sql`, `20260317120000_add_lodger_fields_to_profiles.sql`, `20260323100000_add_address_fields_to_profiles.sql`, `20260325140000_add_checkout_notes_to_assignments.sql` | ✅ Aplicadas |
| Tests unitarios | `qa/unit/logic/lodgerStatus.test.js` (TEN-01..04), `qa/unit/services/lodgers.service.test.js` (TEN-06..08) | ✅ Cubierto |
| Tests E2E | `tests/e2e/specs/tenants.spec.js` (TEN-05/06 — **bloqueado por BUG-033**) | ❌ Bloqueado |
| Tests seguridad | `qa/unit/security/multi-tenant-isolation.test.js` (SEC-01..04) | ✅ Cubierto |
| Cobertura | TEN-01..04, TEN-07, TEN-08 ✅ · TEN-05/06 ❌ (BUG-033) | 75% funcional |

---

### REQ-003 — Room Assignment

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Requisito | `docs/requirements/current/REQ-003-room-assignment.md` | ✅ Documentado |
| Código principal | `src/pages/v2/admin/accommodations/AccommodationDetail.jsx`, `supabase/functions/manage_lodger/` | ✅ Implementado |
| Migraciones | `20260325150000_remove_status_from_assignments.sql`, `20260325150100_remove_status_from_rooms.sql`, `20260327000001_add_no_overlap_constraint.sql` | ✅ Aplicadas |
| Tests unitarios | `qa/unit/logic/roomStatus.test.js` (ACC-01..04) | ✅ Cubierto |
| Tests E2E | `tests/e2e/specs/accommodations.spec.js`, `tests/e2e/specs/room-status-and-checkout.spec.js` | ⚠️ Parcial |
| Gap crítico | Constraint de no solapamiento (`20260327000001`) sin test de integración | ❌ FALTA |
| Cobertura | ACC-01..04 ✅ · ACC-05 ⚠️ · ACC-06 🚧 | 67% completa |

---

### REQ-004 — Energy Billing

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Requisito | `docs/requirements/current/REQ-004-energy-billing.md` | ✅ Documentado |
| Código principal | `src/services/energy.service.js`, `supabase/functions/settle_energy_bill/index.ts` | ✅ Implementado |
| Migraciones | `00000000000001_baseline_schema.sql` (energy_bills, energy_readings, energy_settlements), `20260327000000_add_consumptions_table.sql` | ✅ Aplicadas |
| Tests unitarios | `qa/unit/logic/energy-settlement.test.js` (ENE-01..06), `qa/unit/services/energy.service.test.js` (ENE-07) | ✅ Cubierto |
| Tests E2E | `qa/e2e/specs/energy.spec.js` (ENE-08/09 requieren `TEST_ACC_ID`; ENE-10 fixme) | ⚠️ Parcial |
| Cobertura | ENE-01..07 ✅ · ENE-08/09 🚧 · ENE-10 fixme | 70% completa |

---

## CAMBIOS EN CURSO (CHG)

### CHG-2026-03-28 — Add No Overlap Assignment

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Cambio | `docs/requirements/changes/2026/CHG-2026-03-28-add-no-overlap-assignment.md` | ✅ Documentado |
| Migración | `20260327000001_add_no_overlap_constraint.sql` | ✅ Aplicada |
| Test de integración | Verificar que intento de doble asignación retorna error | ❌ **FALTA — CRÍTICO** |
| Impacto sin test | Constraint puede silenciar errores si no está validado en E2E | Alto |

### CHG-2026-03-28 — Energy Settlement Rules

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Cambio | `docs/requirements/changes/2026/CHG-2026-03-28-energy-settlement-rules.md` | ✅ Documentado |
| Implementación | `supabase/functions/settle_energy_bill/index.ts` | ✅ Implementado |
| Tests | `qa/unit/logic/energy-settlement.test.js`, `qa/unit/services/energy.service.test.js` | ✅ Cubierto unitariamente |
| Gap | Modo `meter` sin lecturas no tiene test E2E (GAP-ENE-10 en `qa/defects/OPEN-DEFECTS.md`) | ⚠️ Pendiente |

---

## MIGRACIONES SQL

### Baseline (Inmutables)

| Migración | REQ | Tests | Estado |
|-----------|-----|-------|--------|
| `00000000000000_baseline_extensions.sql` | N/A | N/A | ✅ |
| `00000000000001_baseline_schema.sql` | REQ-001..004 | Parcial | ✅ |
| `00000000000002_baseline_functions.sql` | N/A | N/A | ✅ |
| `00000000000003_baseline_rls.sql` | REQ-002..004 | `qa/unit/security/multi-tenant-isolation.test.js` ✅ | ✅ |
| `00000000000004_baseline_triggers.sql` | N/A | N/A | ✅ |
| `00000000000005_baseline_indexes.sql` | N/A | N/A | ✅ |
| `00000000000006_baseline_storage.sql` | REQ-001, REQ-004 | Parcial | ✅ |

### Schema / Data

| Migración | REQ/CHG | Tests | Estado |
|-----------|---------|-------|--------|
| `20260317120000_add_lodger_fields_to_profiles.sql` | REQ-002 | Indirecto en TEN-xx | ✅ |
| `20260323100000_add_address_fields_to_profiles.sql` | REQ-002 | `tests/e2e/specs/tenant-address-fields.spec.js` ✅ | ✅ |
| `20260325150000_remove_status_from_assignments.sql` | REQ-003 | Indirecto en lodgerStatus.test.js | ✅ |
| `20260325150100_remove_status_from_rooms.sql` | REQ-003 | Indirecto en roomStatus.test.js | ✅ |
| `20260327000000_add_consumptions_table.sql` | REQ-004, CHG | ENE-xx tests | ✅ |
| `20260327000001_add_no_overlap_constraint.sql` | REQ-003, CHG | ❌ **CRÍTICO — FALTA** | ✅ aplicada |

### Performance / Security

| Migración | REQ/CHG | Tests | Estado |
|-----------|---------|-------|--------|
| `20260326000001_add_performance_indexes.sql` | N/A | `src/tests/rendimiento/volumetria.test.js` (PERF-01) | ✅ |
| `20260326000002_add_materialized_views.sql` | N/A | N/A | ✅ |
| `20260326000003_add_helper_functions.sql` | REQ-003, REQ-004 | ❌ Falta test de funciones SQL | ✅ |

---

## TESTS ACTUALES (2026-03-28)

### Tests Unitarios (qa/unit/)

| Test | REQ | Cobertura |
|------|-----|-----------|
| `qa/unit/logic/lodgerStatus.test.js` | REQ-002 | TEN-01..04 — 17 tests ✅ |
| `qa/unit/logic/roomStatus.test.js` | REQ-003 | ACC-01..04 — 8 tests ✅ |
| `qa/unit/logic/energy-settlement.test.js` | REQ-004, CHG | ENE-01..06 — 16 tests ✅ |
| `qa/unit/services/lodgers.service.test.js` | REQ-002 | TEN-06..08 — 7 tests ✅ |
| `qa/unit/services/energy.service.test.js` | REQ-004 | ENE-07 — 8 tests ✅ |
| `qa/unit/components/guards/RequireAuth.test.jsx` | REQ-001 | AUTH-04 — 4 tests ✅ |
| `qa/unit/components/guards/RequireRole.test.jsx` | REQ-001 | AUTH-05 — 8 tests ✅ |
| `qa/unit/security/multi-tenant-isolation.test.js` | REQ-002..004 | SEC-01..04 — 15 tests ✅ |

**Total qa/unit/: 83 tests pasando**

### Tests Legacy (src/tests/ — en transición a qa/unit/)

| Test | REQ | Estado |
|------|-----|--------|
| `src/tests/auth/auth.service.test.js` | REQ-001 | ✅ Activo |
| `src/tests/alojamientos/accommodations.service.test.js` | REQ-003 | ✅ Activo |
| `src/tests/entidades/entities.service.test.js` | REQ-002 | ✅ Activo |
| `src/tests/inquilinos/lodger-creation.test.js` | REQ-002 | ✅ Activo |
| `src/tests/rendimiento/*.test.js` | PERF | ✅ Activo |

### Tests E2E (Playwright)

| Test | REQ | Estado | Notas |
|------|-----|--------|-------|
| `tests/e2e/specs/smoke.spec.js` | REQ-001..003 | ✅ Activo | Sin credenciales |
| `tests/e2e/specs/admin-basic.spec.js` | REQ-001..003 | ✅ Activo | Requiere credenciales |
| `tests/e2e/specs/entities.spec.js` | REQ-002 | ⚠️ Parcial | BUG-031, BUG-032 bloquean algunos |
| `tests/e2e/specs/accommodations.spec.js` | REQ-003 | ⚠️ Parcial | — |
| `tests/e2e/specs/tenants.spec.js` | REQ-002 | ❌ Bloqueado | BUG-033 |
| `tests/e2e/specs/room-status-and-checkout.spec.js` | REQ-003 | ⚠️ Parcial | BUG-036 |
| `tests/e2e/specs/tenant-address-fields.spec.js` | REQ-002 | ✅ Activo | — |
| `qa/e2e/specs/auth.spec.js` | REQ-001 | ⚠️ Parcial | AUTH-03/06 requieren credenciales |
| `qa/e2e/specs/energy.spec.js` | REQ-004 | ⚠️ Parcial | ENE-08/09 requieren TEST_ACC_ID |

---

## GAPS CRÍTICOS (P1)

| Gap | REQ/CHG | Tests bloqueantes | Solución |
|-----|---------|-------------------|----------|
| Constraint no solapamiento sin test | REQ-003, CHG-no-overlap | — | Crear test de integración con doble INSERT |
| BUG-033 bloquea E2E de inquilinos | REQ-002 | TEN-05, TEN-06 | Fix TenantCreate.jsx |
| ENE-08/09 sin credenciales de staging | REQ-004 | ENE-08, ENE-09 | Configurar TEST_ACC_ID en .env.e2e |

---

## Cómo usar esta matriz

- **Antes de un PR**: verificar que el REQ afectado tiene tests
- **Tras resolver un bug**: crear test de regresión y actualizar estado aquí
- **Cobertura diaria**: ver [qa/COVERAGE.md](../../qa/COVERAGE.md) (operacional)
- **Defectos abiertos**: ver [qa/defects/OPEN-DEFECTS.md](../../qa/defects/OPEN-DEFECTS.md)
