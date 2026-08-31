# Matriz de Trazabilidad — SmartRent QA

Conecta requisitos, código, migraciones SQL y tests. Para la cobertura funcional operativa, ver también [qa/COVERAGE.md](../../qa/COVERAGE.md).

**Jerarquía documental** (para no competir como fuentes de verdad divergentes):
1. [docs/requirements/domain-index.md](../requirements/domain-index.md) — nivel dominio (REQ → código → doc-módulo → prefijo test)
2. Este documento — nivel REQ (REQ → código → migración → test)
3. [qa/COVERAGE.md](../../qa/COVERAGE.md) — nivel test-ID (ID de caso → fichero de test)

**Última actualización:** 2026-04-12 (rev24)

---

## Resumen

| Elemento | Total | Con Tests | Sin Tests |
|----------|-------|-----------|-----------|
| Requisitos (REQ) | 14 | 4 | 10 |
| Cambios (CHG) | 6 | 1 | 5 |
| Migraciones schema | 12 | 0 | 12 |
| Migraciones security | 2 | 1 | 1 |
| Edge Functions activas | 5 | 1 | 4 |
| Edge Functions SAL (diseño) | 13 | 0 | 13 |
| Edge Functions migradas a RLS directo | 3 | — | — |

**Cobertura funcional:** 39% completa, 50% con parciales (detalle en [qa/COVERAGE.md](../../qa/COVERAGE.md))

---

## REQUISITOS ACTUALES (REQ)

### REQ-001 — Auth Portals

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Requisito | `docs/requirements/current/REQ-001-auth-portals.md` | ✅ Documentado |
| Código principal | `src/providers/AuthProvider.jsx`, `src/router/RequireAuth.jsx`, `src/router/RequireRole.jsx` | ✅ Implementado |
| Migraciones | `00000000000001_baseline_schema.sql` (profiles), `00000000000003_baseline_rls.sql` | ✅ Aplicadas |
| Tests unitarios | `qa/unit/components/guards/RequireAuth.test.jsx` (AUTH-04), `qa/unit/components/guards/RequireRole.test.jsx` (AUTH-05) | ✅ Cubierto |
| Tests E2E | `qa/e2e/specs/auth.spec.js` (AUTH-01..06), `qa/e2e/specs/smoke.spec.js` | ⚠️ Parcial (AUTH-03, AUTH-06 requieren credenciales) |
| Cobertura | AUTH-04, AUTH-05 ✅ · AUTH-01, AUTH-02 ⚠️ · AUTH-03, AUTH-06 🚧 | 33% completa, 50% parcial |

---

### REQ-002 — Tenants Lifecycle

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Requisito | `docs/requirements/current/REQ-002-tenants-lifecycle.md` | ✅ Documentado |
| Código principal | `src/pages/v2/admin/tenants/TenantsList.jsx`, `src/services/lodgers.service.js`, `src/utils/lodgerStatus.js` | ✅ Implementado |
| Migraciones | `00000000000001_baseline_schema.sql`, `20260317120000_add_lodger_fields_to_profiles.sql`, `20260323100000_add_address_fields_to_profiles.sql`, `20260325140000_add_checkout_notes_to_assignments.sql` | ✅ Aplicadas |
| Tests unitarios | `qa/unit/logic/lodgerStatus.test.js` (TEN-01..04), `qa/unit/services/lodgers.service.test.js` (TEN-06..08) | ✅ Cubierto |
| Tests E2E | `qa/e2e/specs/tenants.spec.js` (TEN-05/06 — **bloqueado por BUG-033**) | ❌ Bloqueado |
| Tests seguridad | `qa/unit/security/multi-tenant-isolation.test.js` (SEC-01..04) | ✅ Cubierto |
| Fix BUG-052 | `TenantDetail`: `photoBottom` usa imagen libre si sin asignación activa | ✅ 2026-04-07 |
| Fix BUG-053 | `TenantsList`: botón "Ver Consumos" `disabled` si `getLodgerStatus === "invited"` | ✅ 2026-04-07 |
| Fix BUG-054 | `TenantDetail`: estado badge usa `getLodgerStatus()` en lugar de `profiles.onboarding_status` — fuente única de verdad | ✅ 2026-04-07 |
| Nota diseño | `profiles.onboarding_status` permanece en BD pero **no se usa en UI** para mostrar el estado. La fuente canónica es `getLodgerStatus()` calculado desde `lodger_room_assignments`. Migración no necesaria. | — |
| Cobertura | TEN-01..04, TEN-07, TEN-08 ✅ · TEN-05/06 ❌ (BUG-033) · TEN-09/10/11 🚧 | 55% funcional |
| Fix BUG-055 | `AccommodationDetail`: modal "Cambiar habitación" carga todos los alojamientos (`listAccommodations`) y habitaciones libres dinámicamente por alojamiento desde Supabase. Label incluye precio. | ✅ 2026-04-07 |
| Fix BUG-056 | Modal "Cambiar habitación" rediseñado con secciones Check-Out / Check-In. Info fija actual (entidad, aloj., hab., precio). Validaciones: checkout >= hoy, check-in > checkout. Selector entidad → aloj. filtrado → hab. libres. Checkbox prorrateo. Fianza obligatoria. Modal sin scroll. | ✅ 2026-04-07 |
| Cobertura | ACC-01..04 ✅ · ACC-05 ⚠️ · ACC-07..12 🚧 | — |

---

### REQ-003 — Room Assignment

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Requisito | `docs/requirements/current/REQ-003-room-assignment.md` | ✅ Documentado |
| Código principal | `src/pages/v2/admin/accommodations/AccommodationDetail.jsx`, `src/pages/v2/admin/tenants/components/RoomAssignmentForm.jsx`, `supabase/functions/manage_lodger/` | ✅ Implementado |
| Rutas unificadas | `/editar` y `/habitaciones` redirigen al mismo `AccommodationDetail`; botón "Editar" en lista navega a `/habitaciones` | ✅ 2026-03-29 |
| Migraciones | `20260325150000_remove_status_from_assignments.sql`, `20260325150100_remove_status_from_rooms.sql`, `20260327000001_add_no_overlap_constraint.sql` | ✅ Aplicadas |
| Tests unitarios | `qa/unit/logic/roomStatus.test.js` (ACC-01..04, ACC-13..18) | ✅ Cubierto |
| Tests E2E | `qa/e2e/specs/accommodations.spec.js`, `qa/e2e/specs/room-status-and-checkout.spec.js` | ⚠️ Parcial |
| Gap crítico | Constraint de no solapamiento (`20260408000001`) sin test de integración | ❌ FALTA |
| Gap UI | ACC-09: `billing_start_date` siempre visible en RoomAssignmentForm; ACC-10: botón "Editar" navega a `/habitaciones` | 🚧 Tests pendientes |
| Cobertura | ACC-01..04 ✅ · ACC-13..17 ✅ · CHG-01..05 ✅ · ACC-05 ⚠️ · ACC-06/09/10/18 · CHG-06..11 🚧 | 68% completa |
| Cambio 2026-04-08 (rev18) | Estado "Reservada" (REQ-005 v2): migración `20260408000001_add_reserved_room_state.sql` — elimina unique indexes bloqueantes, corrige constraint `'[)'`, actualiza `get_room_derived_status()`. Frontend: split active/future queries, `getRoomStatus()` y `getRoomUpcoming()` actualizadas en `AccommodationDetail.jsx` y `RoomsSearch.jsx`. Badge secundario violeta en room cards. Modal "Cambiar habitación": campo único "Fecha del cambio", `loadFreeRoomsForDate()` calcula disponibilidad en la fecha del cambio (no hoy). | ✅ 2026-04-08 |
| Cambio 2026-04-09 (rev19) | Cambio de habitación mejorado: migración `20260409000001_rename_notes_add_correction.sql` — renombra `checkout_notes→notes` (campo genérico), añade `correction_amount`. Modal reassign: elimina checkbox prorrateo y campo "hasta fin de mes" (solo en este modal, se mantienen en alta nueva), añade `correction_amount` auto-calculado por fórmula proporcional, auto-fill fianza desde asignación actual, `notes` auto-generado en ambas asignaciones. TenantEdit: historial muestra `notes`. Tests: `qa/unit/logic/correctionAmount.test.js` (CHG-01..05). | ✅ 2026-04-09 |
| Cambio 2026-04-10 (rev20) | Vista lista en AccommodationDetail habitaciones: toggle cards/lista con persistencia localStorage. Badge "Reservada" cambiado a naranja. Cards reservadas muestran nombre del futuro inquilino y fecha de entrada. Campo `street_number` (número de calle) añadido al formulario de alojamiento — columna ya existía en DB (`20260323110000`) pero no se usaba en el frontend. Subtítulo del alojamiento incluye número de calle. | ✅ 2026-04-10 |
| Cambio 2026-04-11 (rev21) | **TenantCreate stepper 2 pasos:** paso 1 = datos personales (`LodgerFormFields`) → guarda inquilino → paso 2 = asignación habitación (`RoomAssignmentForm`, opcional, "Saltar" disponible). **TenantDetail edición modal:** botón "Editar" abre modal con `LodgerFormFields` pre-rellenados; llama `updateLodger` y recarga detalle — ya no navega a `/editar`. **ChangeRoomModal.jsx (nuevo componente):** modal reutilizable con secciones Check-Out/Check-In, selector entidad→aloj.→hab.libres en fecha del cambio, auto-cálculo `correction_amount`, disponible desde `TenantDetail` (botón "Cambiar") y `AccommodationDetail`. **Fix:** referencia `openReassignModal` undefined en `TenantDetail` (página en blanco). **AdminSettings:** `handleSaveOwner` guarda `client_accounts.name`; "Nombre de cuenta" muestra nombre + apellidos. **V2Layout:** topbar fondo color secundario del branding, textos color primario; email del usuario bajo el nombre; botones ⚙️/Salir en gris neutro; anchura fija en botones nav (evita desplazamiento al cambiar activo); `scrollbar-gutter: stable`. **Fix:** `RoomsSearch.jsx` y `DashboardAdminV3New.jsx` ya pasan `companyBranding`/`userName` a `V2Layout`. Migraciones nuevas: `20260411000001` + `20260411000002` (campos propietario en `client_accounts`) ⚠️ pendientes de ejecutar. | ✅ 2026-04-11 |

**Cambios UI 2026-03-29:**
- `billing_start_date` ("Fecha del primer pago de la mensualidad") ahora **siempre visible** en `RoomAssignmentForm`, independiente del checkbox "pagar hasta fin de mes". Valor calculado: `move_in_date + 1 mes, inicio de mes`. Nota en UI: "También de la previsión de Gastos de Servicios".
- Nuevo campo `services_provision_amount` ("Previsión de Gastos de Servicios — Hucha Energética"): importe mensual estimado que el inquilino aporta a la hucha de suministros. Persiste en `lodger_room_assignments.services_provision_amount` (migración `20260329130000`).
- `billing_start_date` en `TenantCreate` corregido: antes usaba `moveInDate`, ahora calcula `move_in_date.add(1, 'month').startOf('month')` consistente con la UI.
- Campo "Importe a pagar hasta fin de mes" sigue condicional al checkbox.
- Botón "Editar" en `AccommodationsList` navega a `/habitaciones` (URL canónica) en lugar de `/editar`.

---

### REQ-004 — Energy Billing / REQ-007 — Energy Bill Settlement

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Requisito | `docs/requirements/current/REQ-007-energy-bill-settlement.md` | ✅ Documentado |
| Algoritmo | Fracción diaria: `fraction[lodger] += 1/totalDays/n_activos_hoy`. Sin modos separados (equal/prorated/meter eliminados). | ✅ |
| Código principal | `src/services/energy.service.js` — `settleEnergyBill`, `unsettleEnergyBill` | ✅ Implementado |
| Migración BD | `20260329000000_energy_settlements_daily.sql` — rediseño a granularidad diaria | ✅ Ejecutada en dev |
| RLS fix | `20260328120000_fix_energy_bulletins_rls.sql` — INSERT/DELETE admin para bulletins y energy_settlements | ✅ Ejecutada en dev |
| Tests unitarios | `qa/unit/logic/energy-settlement.test.js` (ENE-01..10, 8 describe × tests), `qa/unit/services/energy.service.test.js` (ENE-07..08) | ✅ Cubierto |
| Tests E2E | `qa/e2e/specs/energy.spec.js` (ENE-11/12 requieren TEST_ACC_ID) | ⚠️ Parcial |
| Cobertura | ENE-01..10 ✅ · ENE-11/12 🚧 | 83% completa |

---

### REQ-008 — Visor de Consumos con Filtro de Período

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Requisito | `docs/requirements/current/REQ-008-consumption-viewer.md` | ✅ Documentado |
| Código principal | `src/pages/v2/admin/accommodations/tabs/ConsumoTab.jsx` — función `VisorConsumo` | ✅ Implementado |
| Migración BD | `20260329100000_add_estimated_source_to_energy_readings.sql` — amplía CHECK constraint de `source` para incluir `'estimated'` (necesaria para que el Visor tenga datos cuando no hay contadores reales) | ✅ Ejecutada en dev |
| Tests unitarios | — (lógica de pivot cubierta via E2E) | ❌ Sin tests unitarios |
| Tests E2E | `qa/e2e/specs/consumos.spec.js` — CON-01..05 (pendientes) | 🚧 Pendiente |
| Bugs corregidos | CA-008: etiquetas eje X en español · CA-009: fallback solo facturas `settled` · CA-010: `lineKeys` de todos los puntos · CA-011: `strokeDasharray` para líneas solapadas | ✅ |
| Cobertura | CON-01..05 🚧 | 0% (E2E pendiente) |

**Aclaraciones sobre lecturas estimadas iguales por habitación:**
Cuando `settleEnergyBill` genera lecturas estimadas, todas las habitaciones activas el mismo día
reciben **el mismo kWh/día**. Los totales mensuales pueden diferir si las habitaciones tienen
distintas fechas de entrada/salida dentro del mes. Desde el mes donde todas están activas el mes
completo, los valores son iguales — esto es correcto y esperado (no es un bug del gráfico).

---

### REQ-009 — Configuración de Reparto de Suministros por Alojamiento

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Requisito | `docs/requirements/current/REQ-009-utility-split-config.md` | ✅ Documentado |
| Código — UI | `AccommodationDetail.jsx` — sección "Configuración de Consumo" rediseñada: 3 columnas por suministro, exclusión mutua Igualitario/Medidor, Previsión Fondo, Periodo Pago en extras | ✅ |
| Código — servicio | `energy.service.js` — `settleEnergyBill` lee `split_mode_X` del alojamiento; `hasReadings` solo `true` en modo `meter` con lecturas reales; lecturas estimadas se generan por `kwhTotal === 0` (antes `!hasReadings`) | ✅ |
| Migración BD | `20260402120000_add_prevision_fund_to_accommodations.sql` — añade `prevision_fund_electricity/water/gas` (BUG-050) | ❌ **PENDIENTE EJECUTAR por Cascade** |
| Tests unitarios | ENE-11/ENE-12 pendientes (modo equal vs meter en settleEnergyBill) | ❌ Falta |
| Tests E2E | ACC-07 (toggle inclusión/exclusión + etiqueta dinámica), ACC-08 (guardar/cargar inversión `included_X ↔ split_X`) — pendientes | 🚧 Pendiente |
| Tests unit | ENE-11 (modo equal ignora kWh), ENE-12 (modo meter usa kWh) — pendientes | ❌ Falta |
| Cobertura | 0% (tests pendientes) | — |

**Reglas de negocio clave:**
- Toggle UI: `included_X = true` (verde, defecto) → BD `split_X = false` → "Incluido en el Alquiler", sin opciones de reparto
- Toggle UI: `included_X = false` → BD `split_X = true` → "No Incluido", aparecen Previsión Fondo + modos de reparto
- `split_mode = 'equal'` → `hasReadings = false` → fracción diaria siempre (ignora kWh reales)
- `split_mode = 'meter'` → `hasReadings = true` solo si hay lecturas reales → proporcional a kWh
- Lecturas estimadas: generadas cuando `kwhTotal === 0 && total_kwh > 0` (independiente del modo)
- Exclusión mutua UI: Igualitario ON → Medidor deshabilitado; Medidor ON → Igualitario OFF

---

### REQ-010 — Dashboard Admin V3 con Visualizaciones 3D

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Requisito | `docs/requirements/current/REQ-010-dashboard-admin-v3.md` | ✅ Documentado |
| Código principal | `src/pages/v2/admin/DashboardAdminV3New.jsx`, `src/components/charts/GraficoGenero3D.jsx`, `src/components/charts/GraficoIngresos3D.jsx`, `src/components/charts/GraficoHorizontal3D.jsx` | ✅ Implementado |
| Ruta | `/v2/admin/dashboard-v3` en `src/App.jsx` | ✅ Configurada |
| Migraciones | Ninguna (usa esquema existente) | N/A |
| Tests unitarios | ❌ Pendiente | 🚧 |
| Tests E2E | ❌ Pendiente | 🚧 |
| Backup | `src/pages/v2/admin/DashboardAdmin.jsx.backup-v3` | ✅ Creado |
| Cobertura | 0% (implementación inicial sin tests) | 🚧 |

---

### REQ-012 — Búsqueda Global de Habitaciones

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Requisito | `docs/requirements/current/REQ-012-room-search.md` | ✅ Documentado |
| Código principal | `src/pages/v2/admin/rooms/RoomsSearch.jsx` | ✅ Implementado (2026-04-06) |
| Ruta | `/v2/admin/habitaciones` en `src/App.jsx` | ✅ Configurada |
| Icono nav | `Icon3DHabitaciones` en `NavIcons3D.jsx` + entrada en `V2Layout.jsx` ADMIN_NAV | ✅ |
| Servicios | `listAccommodations()`, `listEntities({ type: "owner" })`, Supabase directo para rooms+assignments | ✅ |
| Migraciones | Ninguna — usa esquema existente (`rooms`, `lodger_room_assignments`, `profiles.gender`) | N/A |
| Persistencia filtros | `localStorage` clave `smartrent_rooms_filters` — filtros + estado de búsqueda (RF-012-09) | ✅ |
| Búsqueda diferida | Sin filtros activos → no muestra resultados (RF-012-08 revisado) | ✅ |
| Tests unitarios | — | ❌ Sin tests unitarios |
| Tests E2E | `qa/e2e/specs/rooms-search.spec.js` (RSE-01..16 — pendientes) | 🚧 Pendiente |
| Cobertura | RSE-01..16 🚧 | 0% (tests pendientes) |

---

### REQ-011 — Gestión de Entidades: Propietaria (owner) y Pagadora (payer)

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Requisito | `docs/requirements/current/REQ-011-entity-management.md` | ✅ Documentado |
| Código principal | `src/pages/v2/admin/settings/AdminSettings.jsx` — tabs "Entidad Propietaria" y "Entidad Pagadora" | ✅ Implementado (2026-04-02) |
| Servicio | `src/services/entities.service.js` — `createEntity()` migrada a INSERT directo (BUG-049) | ✅ |
| Migraciones | Ninguna — `entities.type` ya existe en `00000000000001_baseline_schema.sql` | N/A |
| Defectos cerrados | BUG-046 (tab owner faltante + filtro type payer), BUG-049 (createEntity via edge function) | ✅ |
| Tests unitarios | ENT-01..07 — pendientes | 🚧 |
| Tests E2E | `qa/e2e/specs/settings.spec.js` — pendiente | 🚧 |
| Cobertura | 0% (ENT-01..07 pendientes) | 🚧 |

---

### REQ-013 — Catálogo de Servicios SaaS (Add-ons)

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Requisito | `docs/requirements/current/REQ-013-saas-services-catalog.md` | ✅ Documentado (2026-04-12) |
| Estado implementación | Diseño completado — sin implementación frontend todavía | 🟡 Diseño |
| Migraciones | `20260412000001_create_saas_services_catalog.sql` — tablas + seed smart_access_lock | 🟡 Pendiente ejecutar |
| RLS | `20260412000004_smart_access_lock_rls.sql` — catálogo SELECT público; suscripciones por tenant | 🟡 Pendiente ejecutar |
| Edge Functions | `sal-activate-subscription` (diseño) — activa/desactiva suscripción + Stripe item | 🟡 No implementada |
| Tests unitarios | SaaS-01..07 — pendientes | 🚧 |
| Tests E2E | `qa/e2e/specs/superadmin-saas.spec.js` — pendiente | 🚧 |
| Dependencias | REQ-002 (client_accounts, stripe_customer_id), REQ-014 (primer consumidor) | — |
| Cobertura | 0% (diseño completado, sin implementación) | 🚧 |

---

### REQ-014 — SmartAccessLock

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Requisito | `docs/requirements/current/REQ-014-smart-access-lock.md` | ✅ Documentado (2026-04-12) |
| Estado implementación | Diseño completado — sin implementación frontend todavía | 🟡 Diseño |
| Migraciones Core | `20260412000002_create_smart_access_lock_core.sql` — lock_integrations, locks, common_areas, lock_placements | 🟡 Pendiente ejecutar |
| Migraciones Acceso | `20260412000003_create_smart_access_lock_access.sql` — lock_access_actors, groups, members, scopes, grants, credentials, records, notifications | 🟡 Pendiente ejecutar |
| RLS | `20260412000004_smart_access_lock_rls.sql` — RLS en todas las tablas SAL | 🟡 Pendiente ejecutar |
| Tablas nuevas | 12 tablas (4 core + 8 acceso) + 4 tablas SaaS = 16 tablas con RLS | 🟡 |
| Edge Functions (diseño) | sal-sync-locks, sal-issue-credential, sal-revoke-credential, sal-assign-lodger-grants, sal-revoke-lodger-grants, sal-remote-unlock, sal-sync-events, sal-resolve-active-grants, sal-renew-credentials, sal-activate-subscription, sal-deactivate-subscription, sal-send-notification, sal-sync-records-cron | 🟡 No implementadas |
| Proveedor inicial | TTLock — arquitectura vendor-agnostic (campo `provider` en lock_integrations y locks) | — |
| Seguridad crítica | `lock_credentials.credential_value` (PINs) — debe cifrarse con Supabase Vault antes de producción | ⚠️ Pendiente |
| Tests unitarios | SAL-01..20 — pendientes | 🚧 |
| Tests E2E | `qa/e2e/specs/sal-integration.spec.js`, `sal-actors.spec.js`, `sal-grants.spec.js` — pendientes | 🚧 |
| Dependencias | REQ-013 (suscripción activa requerida), REQ-003 (lodger_room_assignments → grants automáticos) | — |
| Cobertura | 0% (diseño completado, sin implementación) | 🚧 |
| Cambio 2026-04-12 (rev22) | **Diseño completo del módulo SmartAccessLock:** REQ-013 + REQ-014 documentados. 4 migraciones SQL creadas (20260412000001..000004): catálogo SaaS, tablas core locks, tablas de acceso, RLS. 12 tablas nuevas, 13 Edge Functions diseñadas, 3 pg_cron jobs. Patrón vendor-agnostic con TTLock como proveedor inicial. Seguridad: credential_value requiere Vault antes de producción. Tests SAL-01..20 y SaaS-01..07 añadidos en COVERAGE.md. | 🟡 2026-04-12 |

---

## CAMBIOS EN CURSO (CHG)

### CHG-2026-03-28 — Add No Overlap Assignment

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Cambio | `docs/requirements/changes/2026/CHG-2026-03-28-add-no-overlap-assignment.md` | ✅ Documentado |
| Migración | `20260327000001_add_no_overlap_constraint.sql` | ✅ Aplicada |
| Test de integración | Verificar que intento de doble asignación retorna error | ❌ **FALTA — CRÍTICO** |
| Impacto sin test | Constraint puede silenciar errores si no está validado en E2E | Alto |

### CHG-2026-03-29b — Room Assignment Form UX + Route Unification

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Cambio | `RoomAssignmentForm`: `billing_start_date` siempre visible + nuevo campo `services_provision_amount`. Rutas `/editar` y `/habitaciones` unificadas en `AccommodationDetail`. Botón "Editar" en lista usa `/habitaciones`. `billing_start_date` en `TenantCreate` corregido a primer día mes siguiente. | ✅ Implementado |
| Archivos modificados | `RoomAssignmentForm.jsx`, `TenantCreate.jsx`, `lodgers.service.js`, `manage_lodger/index.ts`, `AccommodationsList.jsx`, `App.jsx` | ✅ |
| Migración BD | `20260329130000_add_services_provision_to_assignments.sql` — añade `services_provision_amount NUMERIC(10,2)` a `lodger_room_assignments` | ⚠️ Pendiente ejecutar en dev |
| Tests | ACC-09 (billing_start_date visible siempre, valor = 1º mes siguiente), ACC-10 (botón Editar → `/habitaciones`), ACC-11 (services_provision_amount guarda y carga) | 🚧 Pendiente |
| Archivo huérfano | `AccommodationEdit.jsx` — ya no está referenciado por ninguna ruta | ⚠️ Pendiente eliminar |

### CHG-2026-04-06-room-search — Nueva página global de búsqueda de habitaciones

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Cambio | Nueva sección en el portal admin para buscar habitaciones de forma global (todos los alojamientos y entidades) con filtros en cascada y dos vistas | ✅ Implementado |
| Archivos nuevos | `src/pages/v2/admin/rooms/RoomsSearch.jsx`, `docs/requirements/current/REQ-012-room-search.md` | ✅ |
| Archivos modificados | `NavIcons3D.jsx` (+Icon3DHabitaciones), `V2Layout.jsx` (+ADMIN_NAV entry), `App.jsx` (+ruta) | ✅ |
| Filtros | Entidad propietaria → Alojamiento (cascada) → Estado → Baño → Cocina | ✅ |
| Vistas | Cards (grid xs/sm/md/xl) + Lista (Table Ant Design) con toggle | ✅ |
| Acciones | Ver detalle, Editar inquilino, Cambiar hab. (→ AccommodationDetail), Check-out (→ AccommodationDetail), Asignar (→ AccommodationDetail con ?assignRoom=) | ✅ |
| Imagen genérica | Misma lógica de gender-aware image que AccommodationDetail | ✅ |
| Bug fix | BUG-051: columna `size_sqm` no existe → eliminada de query, columna real es `square_meters` | ✅ Cerrado |
| Build | `npm run build` limpio — sin errores | ✅ |
| Tests afectados | RSE-01..14 añadidos en COVERAGE.md | 🚧 Pendientes de implementar |

---

### CHG-2026-04-06 — Iteraciones de diseño tarjeta de habitación + modal asignar inquilino

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Cambio | Refinamiento visual de la room card y mejoras de UX en asignación de inquilinos | ✅ Implementado |
| Room card — layout | Cabecera blanca separada (título+precio) / imagen grande / badge inquilino superpuesto abajo-izq / sin separador imagen-contenido | ✅ |
| Room card — imágenes | `Habitación sin Inquilino en la cama.png` (libre) · `Habitación con Inquilino en la cama.png` (ocupado-M) · `Habitación con Inqulina en la cama.png` (ocupado-F, según `profiles.gender`) | ✅ |
| Room card — género | Query de lodger ampliada con campo `gender` para selección de imagen | ✅ |
| Room card — iconos | `cocina-icono.webp` / `baño-icono.webp` en lugar de texto "Cocina" / "Baño" | ✅ |
| Room card — sombra | `drop-shadow` en imagen para efecto 3D | ✅ |
| Room card — número | Detección de prefijo HAB- existente para evitar duplicación "HAB-HAB-XXX" | ✅ |
| Botón asignar | Dos botones (Crear Inquilino Nuevo + Buscar Existente) unificados en "Asignar Inquilino" → abre modal | ✅ |
| Modal asignar | Añadido botón "Crear Inquilino" en el modal que navega al formulario con acc+room preseleccionados | ✅ |
| Build | `npm run build` limpio en cada iteración | ✅ |
| Tests afectados | UI-01..13 actualizados en COVERAGE.md | 🚧 Pendientes de implementar |

---

### CHG-2026-04-05 — Unificación de tarjetas de alojamiento y rediseño de tarjeta de habitación

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Cambio | Eliminadas dos implementaciones paralelas de tarjeta de alojamiento. Creado componente compartido `AccommodationCard`. | ✅ Implementado |
| Componente nuevo | `src/components/AccommodationCard.jsx` — base EntityDetail card + imagen `Alojamiento Dashboard.png` + subtítulos de dirección en 2 líneas + hover elevation | ✅ |
| Archivos modificados | `src/pages/v2/admin/accommodations/AccommodationsList.jsx`, `src/pages/v2/admin/entities/EntityDetail.jsx` — inline card JSX eliminado, sustituido por `<AccommodationCard>` | ✅ |
| Room card rediseñada | `src/pages/v2/admin/accommodations/AccommodationDetail.jsx` — imagen `habitacion-icono-model.webp`, formato `HAB-XXX`, solo Cocina+Baño, footer Alojamiento+Entidad | ✅ |
| Filtros habitaciones | `AccommodationDetail.jsx` — panel siempre visible con 3 selectores (Estado, Baño, Cocina) + link "Limpiar". Filtros se resetean al entrar al tab. Sustituye al antiguo buscador por número+estado colapsable. | ✅ 2026-04-07 |
| Código eliminado | ~140 líneas de JSX duplicado en AccommodationsList + EntityDetail. Eliminadas constantes `ACC_CARD_IMAGE`, `getStats`, `STATUS_COLOR/LABEL/TAG` en ambos archivos | ✅ |
| Build | `npm run build` limpio — sin errores (solo warnings pre-existentes de chunk size) | ✅ |
| Tests afectados | UI-01..06 añadidos en COVERAGE.md (pendientes de implementar) | 🚧 |

---

### CHG-2026-04-02 — Migración de Edge Functions a llamadas directas Supabase

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Cambio | `docs/requirements/changes/2026/CHG-2026-04-02-migrate-edge-functions-to-direct-supabase.md` | ✅ Documentado |
| ADR actualizado | `docs/architecture/adr/ADR-004-edge-functions-for-business-logic.md` — estado cambiado a "Parcialmente Supersedido" | ✅ |
| Archivos modificados | `src/services/accommodations.service.js`, `src/services/entities.service.js`, `src/services/clientAccounts.service.js` | ✅ |
| Migraciones SQL | Ninguna — RLS ya estaba configurado en baseline | N/A |
| Defectos cerrados | BUG-047 (`manage_accommodation`), BUG-048 (`wizard_init`), BUG-049 (`manage_entity`) | ✅ |
| Tests afectados | SEC-04 actualizado en COVERAGE.md: "RLS valida tenant en escrituras directas" | ✅ |
| Edge functions activas restantes | `manage_lodger`, `wizard_submit`, `provision_client_account_superadmin`, `scan_energy_bill`, `stripe_webhook` | 🔴 Permanecen |

---

### CHG-2026-03-29 — Energy Settlement Algorithm (fracción diaria)

| Aspecto | Detalle | Estado |
|---------|---------|--------|
| Cambio | Nuevo algoritmo único de reparto por fracción diaria. Elimina modos `equal`/`prorated`/`meter`. | ✅ Implementado |
| Tabla BD | `energy_settlements` rediseñada a granularidad diaria (una fila por día × inquilino). | ⚠️ Migración pendiente en live |
| Servicio | `src/services/energy.service.js` — `settleEnergyBill` completamente reescrito | ✅ |
| Tests | `qa/unit/logic/energy-settlement.test.js` — ENE-01..10 (algoritmo día/fracción, kWh opcional, reconciliación) | ✅ Cubierto |
| GAP-ENE-10 cerrado | Modo meter sin lecturas ya no lanza error — el algoritmo cae de forma natural a fracción sin divisor cero | ✅ Cerrado |

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
| `20260323100000_add_address_fields_to_profiles.sql` | REQ-002 | `qa/e2e/specs/tenant-address-fields.spec.js` ✅ | ✅ |
| `20260325150000_remove_status_from_assignments.sql` | REQ-003 | Indirecto en lodgerStatus.test.js | ✅ |
| `20260325150100_remove_status_from_rooms.sql` | REQ-003 | Indirecto en roomStatus.test.js | ✅ |
| `20260327000000_add_consumptions_table.sql` | REQ-004, CHG | ENE-xx tests | ✅ |
| `20260327000001_add_no_overlap_constraint.sql` | REQ-003, CHG | ❌ **CRÍTICO — FALTA** | ✅ aplicada |
| `20260329000000_energy_settlements_daily.sql` | REQ-007, CHG-2026-03-29 | ENE-01..10 (lógica) | ⚠️ Pendiente en live |
| `20260329100000_add_estimated_source_to_energy_readings.sql` | REQ-007, REQ-008 | Indirecto via ENE-xx y CON-xx | ✅ Ejecutada en dev |
| `20260329120000_add_prevision_fund_to_accommodations.sql` | — | — | ⚠️ Borrador — conflicto de timestamp, sustituido por 20260402120000 |
| `20260402120000_add_prevision_fund_to_accommodations.sql` | REQ-009, BUG-050 | — | ✅ Ejecutada en dev — BUG-050 cerrado 2026-04-05 |
| `20260329130000_add_services_provision_to_assignments.sql` | REQ-003 | ACC-11 (pendiente) | ⚠️ Pendiente ejecutar en dev |
| `20260330000000_fix_entities_optional_fields.sql` | BUG-042 | — | ⚠️ Pendiente ejecutar en dev |

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
| `qa/e2e/specs/smoke.spec.js` | REQ-001..003 | ✅ Activo | Sin credenciales |
| `qa/e2e/specs/admin-basic.spec.js` | REQ-001..003 | ✅ Activo | Requiere credenciales |
| `qa/e2e/specs/entities.spec.js` | REQ-002 | ⚠️ Parcial | BUG-031, BUG-032 bloquean algunos |
| `qa/e2e/specs/accommodations.spec.js` | REQ-003 | ⚠️ Parcial | — |
| `qa/e2e/specs/tenants.spec.js` | REQ-002 | ❌ Bloqueado | BUG-033 |
| `qa/e2e/specs/room-status-and-checkout.spec.js` | REQ-003 | ⚠️ Parcial | BUG-036 |
| `qa/e2e/specs/tenant-address-fields.spec.js` | REQ-002 | ✅ Activo | — |
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
