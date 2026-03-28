# Matriz de Trazabilidad — SmartRent QA

Última actualización: 2026-03-28

## Leyenda de estado
- ✅ Cubierto
- ⚠️ Parcial (test existe pero no cubre todos los casos)
- 🚧 Pendiente de implementar
- ❌ No aplica / fuera de scope

---

## AUTH — Autenticación y Sesión

| ID      | Funcionalidad                              | Unit (lógica/guard)                        | Unit (servicio)              | E2E                         | Estado  |
|---------|--------------------------------------------|--------------------------------------------|------------------------------|-----------------------------|---------|
| AUTH-01 | Login válido → redirect correcto por rol   | —                                          | auth.service.test.js         | e2e/specs/auth.spec.js      | ⚠️ Parcial |
| AUTH-02 | Login inválido → mensaje de error          | —                                          | auth.service.test.js         | e2e/specs/auth.spec.js      | 🚧 Pendiente |
| AUTH-03 | Portal cruzado → "Acceso no permitido"     | —                                          | —                            | e2e/specs/auth.spec.js      | 🚧 Pendiente |
| AUTH-04 | RequireAuth redirige sin sesión            | guards/RequireAuth.test.jsx                | —                            | —                           | ✅ Cubierto |
| AUTH-05 | RequireRole redirige con rol incorrecto    | guards/RequireRole.test.jsx                | —                            | —                           | ✅ Cubierto |
| AUTH-06 | Logout redirige al portal correcto         | —                                          | —                            | e2e/specs/auth.spec.js      | 🚧 Pendiente |

---

## TEN — Inquilinos

| ID      | Funcionalidad                              | Unit (lógica)                              | Unit (servicio)                  | E2E                              | Estado  |
|---------|--------------------------------------------|--------------------------------------------|----------------------------------|----------------------------------|---------|
| TEN-01  | Estado activo: sin move_out_date           | logic/lodgerStatus.test.js                 | services/lodgers.service.test.js | e2e/specs/tenants.spec.js        | ✅ Cubierto |
| TEN-02  | Estado pending_checkout: fecha futura      | logic/lodgerStatus.test.js                 | services/lodgers.service.test.js | e2e/specs/tenants.spec.js        | ✅ Cubierto |
| TEN-03  | Estado inactive: fecha pasada              | logic/lodgerStatus.test.js                 | —                                | —                                | ✅ Cubierto |
| TEN-04  | Estado invited: sin asignaciones           | logic/lodgerStatus.test.js                 | —                                | —                                | ✅ Cubierto |
| TEN-05  | Crear inquilino con habitación             | src/tests/inquilinos/lodger-creation       | services/lodgers.service.test.js | e2e/specs/tenants.spec.js ⚠️fixme | ⚠️ Parcial |
| TEN-06  | Checkout → move_out_date guardada          | —                                          | services/lodgers.service.test.js | e2e/specs/tenants.spec.js ⚠️fixme | 🚧 Pendiente |
| TEN-07  | updateLodger filtra campos inmutables      | src/tests/inquilinos/lodger-creation       | —                                | —                                | ✅ Cubierto |
| TEN-08  | listLodgers filtra por client_account_id   | —                                          | services/lodgers.service.test.js | —                                | ✅ Cubierto |

---

## ACC — Alojamientos y Habitaciones

| ID      | Funcionalidad                              | Unit (lógica)                              | Unit (servicio)                         | E2E                                  | Estado  |
|---------|--------------------------------------------|--------------------------------------------|------------------------------------------|--------------------------------------|---------|
| ACC-01  | Estado libre: sin asignaciones activas     | logic/roomStatus.test.js                   | —                                        | —                                    | ✅ Cubierto |
| ACC-02  | Estado ocupada: asignación sin move_out    | logic/roomStatus.test.js                   | —                                        | —                                    | ✅ Cubierto |
| ACC-03  | Estado pending_checkout: fecha futura      | logic/roomStatus.test.js                   | —                                        | —                                    | ✅ Cubierto |
| ACC-04  | Estado mantenimiento: is_maintenance=true  | logic/roomStatus.test.js                   | —                                        | —                                    | ✅ Cubierto |
| ACC-05  | Crear alojamiento con habitaciones         | —                                          | src/tests/alojamientos/accommodations    | e2e/specs/accommodations.spec.js     | ⚠️ Parcial |
| ACC-06  | split_mode por tipo de suministro          | —                                          | —                                        | —                                    | 🚧 Pendiente |

---

## ENE — Energía y Facturas

| ID      | Funcionalidad                              | Unit (lógica)                              | Unit (servicio)                 | E2E                         | Estado  |
|---------|--------------------------------------------|--------------------------------------------|----------------------------------|-----------------------------|---------|
| ENE-01  | days_present: overlap correcto             | logic/energy-settlement.test.js            | —                                | —                           | ✅ Cubierto |
| ENE-02  | days_present: inquilino fuera del período  | logic/energy-settlement.test.js            | —                                | —                           | ✅ Cubierto |
| ENE-03  | Reparto equal: partes iguales              | logic/energy-settlement.test.js            | —                                | —                           | ✅ Cubierto |
| ENE-04  | Reparto prorated: por días                 | logic/energy-settlement.test.js            | —                                | —                           | ✅ Cubierto |
| ENE-05  | Reparto meter: por kWh                     | logic/energy-settlement.test.js            | —                                | —                           | ✅ Cubierto |
| ENE-06  | Reconciliación: SUM == total exacto        | logic/energy-settlement.test.js            | —                                | —                           | ✅ Cubierto |
| ENE-07  | settleEnergyBill llama Edge Function       | —                                          | services/energy.service.test.js  | —                           | ✅ Cubierto |
| ENE-08  | Subir factura manual                       | —                                          | —                                | e2e/specs/energy.spec.js    | 🚧 Pendiente |
| ENE-09  | Botón Repartir genera settlements+bulletins| —                                          | —                                | e2e/specs/energy.spec.js    | 🚧 Pendiente |
| ENE-10  | Modo meter sin lecturas → error claro      | logic/energy-settlement.test.js            | services/energy.service.test.js  | —                           | 🚧 Pendiente |

---

## SEC — Seguridad y Multi-tenant

| ID      | Funcionalidad                              | Unit (seguridad)                           | E2E                              | Estado  |
|---------|--------------------------------------------|--------------------------------------------|----------------------------------|---------|
| SEC-01  | RLS activo en tablas críticas              | security/multi-tenant-isolation.test.js    | —                                | ✅ Cubierto |
| SEC-02  | Queries incluyen client_account_id         | security/multi-tenant-isolation.test.js    | —                                | ✅ Cubierto |
| SEC-03  | Tenant A no ve datos de Tenant B           | security/multi-tenant-isolation.test.js    | e2e/specs/security (🚧 futuro)   | ⚠️ Parcial |
| SEC-04  | Edge Functions validan JWT + tenant        | security/multi-tenant-isolation.test.js    | —                                | ⚠️ Parcial |

---

## PERF — Rendimiento

| ID       | Funcionalidad                              | Test                                               | Estado  |
|----------|--------------------------------------------|-----------------------------------------------------|---------|
| PERF-01  | listAccommodations con 1.000 registros     | src/tests/rendimiento/volumetria.test.js            | ✅ Cubierto |
| PERF-02  | Circuit breaker abre/cierra correctamente  | src/tests/rendimiento/concurrencia-breaker.test.js  | ✅ Cubierto |
| PERF-03  | invokeWithAuth bajo concurrencia           | src/tests/rendimiento/concurrencia.test.js          | ✅ Cubierto |

---

## Resumen de cobertura

| Módulo       | Total funcionalidades | Cubiertas | Parciales | Pendientes |
|--------------|-----------------------|-----------|-----------|------------|
| AUTH         | 6                     | 2         | 1         | 3          |
| TEN          | 8                     | 4         | 2         | 2          |
| ACC          | 6                     | 4         | 1         | 1          |
| ENE          | 10                    | 7         | 0         | 3          |
| SEC          | 4                     | 1         | 3         | 0          |
| PERF         | 3                     | 3         | 0         | 0          |
| **TOTAL**    | **37**                | **21**    | **7**     | **9**      |

**Cobertura actual: 57% completa, 76% con parciales**

---

## Gaps críticos (P1)

1. **AUTH-03 E2E** — Login con portal cruzado no tiene spec activo
2. **TEN-05/06 E2E** — BUG-033 bloquea todos los tests de creación/checkout de inquilinos
3. **ENE-08/09 E2E** — Flujo completo de factura+reparto sin spec

## Gaps P2 para siguiente iteración

4. **ACC-06** — Tests del modo split_mode de energía por alojamiento
5. **ENE-10** — Modo meter sin lecturas: fallo silencioso documentado pero sin test
