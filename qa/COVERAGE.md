# Cobertura de Tests — SmartRent QA

Nivel test-ID (ID de caso → fichero de test). Para el nivel dominio, ver [docs/requirements/domain-index.md](../docs/requirements/domain-index.md); para el nivel REQ → código → migración → test, ver [docs/qa/TRACEABILITY-MATRIX.md](../docs/qa/TRACEABILITY-MATRIX.md).

Última actualización: 2026-04-12

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
| TEN-09  | Botón "Ver Consumos" deshabilitado si estado=invited | —                              | —                                | qa/e2e/specs/tenants.spec.js     | 🚧 Pendiente |
| TEN-10  | TenantDetail foto cama = libre si sin asignación activa | —                         | —                                | qa/e2e/specs/tenants.spec.js     | 🚧 Pendiente |
| TEN-11  | TenantDetail badge estado = getLodgerStatus() no onboarding_status | —           | —                                | qa/e2e/specs/tenants.spec.js     | 🚧 Pendiente |
| TEN-12  | TenantCreate stepper — paso 1 registra inquilino y avanza a paso 2 | —          | —                                | qa/e2e/specs/tenants.spec.js     | 🚧 Pendiente |
| TEN-13  | TenantCreate stepper — paso 2 asigna habitación y navega a detalle | —          | —                                | qa/e2e/specs/tenants.spec.js     | 🚧 Pendiente |
| TEN-14  | TenantCreate stepper — "Saltar" en paso 2 navega a detalle sin habitación | —   | —                                | qa/e2e/specs/tenants.spec.js     | 🚧 Pendiente |
| TEN-15  | TenantDetail — botón "Editar" abre modal con datos pre-rellenados | —            | —                                | qa/e2e/specs/tenants.spec.js     | 🚧 Pendiente |
| TEN-16  | TenantDetail — modal edición guarda cambios vía updateLodger y recarga | —       | —                                | qa/e2e/specs/tenants.spec.js     | 🚧 Pendiente |
| TEN-17  | TenantDetail — línea gris muestra alojamiento + habitación actual (o "Sin habitación") | — | —                       | qa/e2e/specs/tenants.spec.js     | 🚧 Pendiente |
| TEN-18  | ChangeRoomModal se cierra al confirmar cambio (no queda abierto vacío) — BUG-063      | — | —                       | qa/e2e/specs/tenants.spec.js     | 🚧 Pendiente |
| TEN-19  | URL ?action=reassign limpiada tras cambio de habitación (no reabre modal) — BUG-063   | — | —                       | qa/e2e/specs/tenants.spec.js     | 🚧 Pendiente |
| TEN-20  | Cambio de habitación genera entrada en audit_log → visible en "Actividad Reciente" — BUG-064 | — | —                  | qa/e2e/specs/tenants.spec.js     | ⚠️ Parcial (fix en RPC, test E2E pendiente) |
| TEN-21  | reassign_lodger_room RPC es atómica: cierra asignación + crea nueva + escribe audit_log en 1 TX | — | —              | —                                | 🚧 Pendiente |

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
| ACC-07  | Modal cambiar hab. — sección Check-Out: info fija (entidad, aloj., hab., precio) | — | —                               | qa/e2e/specs/accommodations.spec.js  | 🚧 Pendiente |
| ACC-08  | Modal cambiar hab. — fecha Check-Out >= hoy (disabledDate)        | —           | —                                        | qa/e2e/specs/accommodations.spec.js  | 🚧 Pendiente |
| ACC-09  | Modal cambiar hab. — sección Check-In: entidad → aloj. → hab. libres con precio | — | —                               | qa/e2e/specs/accommodations.spec.js  | 🚧 Pendiente |
| ACC-10  | Modal cambiar hab. — fecha Check-In > fecha Check-Out             | —           | —                                        | qa/e2e/specs/accommodations.spec.js  | 🚧 Pendiente |
| ACC-11  | Modal cambiar hab. — checkbox "pagar hasta fin de mes" habilita campo importe | — | —                                | qa/e2e/specs/accommodations.spec.js  | 🚧 Pendiente |
| ACC-12  | Modal cambiar hab. — fianza obligatoria, renta se autocompleta con precio de la hab. | — | —                           | qa/e2e/specs/accommodations.spec.js  | 🚧 Pendiente |
| ACC-13  | Estado reservada: solo asignación futura, sin activa → reserved            | logic/roomStatus.test.js           | —                                        | —                                    | ✅ Cubierto |
| ACC-14  | getRoomUpcoming devuelve asignación futura o null (badge secundario)        | logic/roomStatus.test.js           | —                                        | —                                    | ✅ Cubierto |
| ACC-15  | Combo occupied + reservada futura → estado principal occupied + upcoming presente | logic/roomStatus.test.js       | —                                        | —                                    | ✅ Cubierto |
| ACC-16  | Combo pending_checkout + reservada futura → pending_checkout + upcoming presente | logic/roomStatus.test.js        | —                                        | —                                    | ✅ Cubierto |
| ACC-17  | Múltiples asignaciones futuras → reserved, upcoming = primera en el tiempo  | logic/roomStatus.test.js           | —                                        | —                                    | ✅ Cubierto |
| ACC-18  | Modal cambiar hab. — selector habitaciones libres calcula disponibilidad en la fecha del cambio (no hoy) | — | —                     | qa/e2e/specs/accommodations.spec.js  | 🚧 Pendiente |
| ACC-19  | Formulario alojamiento — campo `street_number` (número de calle) se guarda y carga correctamente | — | —                          | qa/e2e/specs/accommodations.spec.js  | 🚧 Pendiente |
| ACC-20  | Subtítulo del alojamiento muestra "Calle + Número, CP, Ciudad"              | —                                  | —                                        | qa/e2e/specs/accommodations.spec.js  | 🚧 Pendiente |
| ACC-21  | Toggle vista cards/lista en AccommodationDetail — persiste en localStorage  | —                                  | —                                        | qa/e2e/specs/accommodations.spec.js  | 🚧 Pendiente |
| ACC-22  | Vista lista — columna Inquilino muestra futuro inquilino en naranja cuando estado = Reservada | — | —                        | qa/e2e/specs/accommodations.spec.js  | 🚧 Pendiente |

---

## CHG — Cambio de habitación

| ID      | Funcionalidad                                                                | Unit (lógica)                          | Unit (servicio) | E2E                                  | Estado  |
|---------|------------------------------------------------------------------------------|----------------------------------------|-----------------|--------------------------------------|---------|
| CHG-01  | `calcCorrectionAmount` día 1 del mes → 0                                    | logic/correctionAmount.test.js         | —               | —                                    | ✅ Cubierto |
| CHG-02  | `calcCorrectionAmount` nueva renta mayor → resultado positivo                | logic/correctionAmount.test.js         | —               | —                                    | ✅ Cubierto |
| CHG-03  | `calcCorrectionAmount` nueva renta menor → resultado negativo                | logic/correctionAmount.test.js         | —               | —                                    | ✅ Cubierto |
| CHG-04  | `calcCorrectionAmount` misma renta → 0                                       | logic/correctionAmount.test.js         | —               | —                                    | ✅ Cubierto |
| CHG-05  | `calcCorrectionAmount` sin fecha o sin renta → null                          | logic/correctionAmount.test.js         | —               | —                                    | ✅ Cubierto |
| CHG-06  | Modal reassign: fianza se auto-rellena con valor de asignación actual        | —                                      | —               | qa/e2e/specs/accommodations.spec.js  | 🚧 Pendiente |
| CHG-07  | Modal reassign: `correction_amount` se auto-calcula al cambiar hab. o fecha | —                                      | —               | qa/e2e/specs/accommodations.spec.js  | 🚧 Pendiente |
| CHG-08  | Modal reassign graba `notes` en ambas asignaciones (origen y destino)        | —                                      | —               | qa/e2e/specs/accommodations.spec.js  | 🚧 Pendiente |
| CHG-09  | TenantEdit historial muestra campo `notes` de cambio de habitación           | —                                      | —               | qa/e2e/specs/tenants.spec.js         | 🚧 Pendiente |
| CHG-10  | Checkout modal graba `notes` (campo renombrado desde checkout_notes)         | —                                      | —               | qa/e2e/specs/accommodations.spec.js  | 🚧 Pendiente |
| CHG-11  | Alta normal de inquilino (TenantCreate): checkbox prorrateo y campo importe se mantienen | —                           | —               | qa/e2e/specs/tenants.spec.js         | 🚧 Pendiente |
| CHG-12  | ChangeRoomModal disponible desde TenantDetail (botón "Cambiar") — misma lógica que AccommodationDetail | —           | —               | qa/e2e/specs/tenants.spec.js         | 🚧 Pendiente |

---

## ENE — Energía y Facturas

Algoritmo: **fracción diaria** (fracción[lodger] = Σ 1/totalDays/n_activos_hoy).
Lecturas kWh opcionales: si existen → variable proporcional a kWh; si no → proporcional a fracción.

| ID      | Funcionalidad                                      | Unit (lógica)                    | Unit (servicio)                 | E2E                         | Estado  |
|---------|----------------------------------------------------|-----------------------------------|---------------------------------|-----------------------------|---------|
| ENE-01  | buildDayMap: mapa día → inquilinos activos         | logic/energy-settlement.test.js   | —                               | —                           | ✅ Cubierto |
| ENE-02  | calcFractions: 3 inquilinos período completo = 1/3 | logic/energy-settlement.test.js   | —                               | —                           | ✅ Cubierto |
| ENE-03  | calcFractions: solapamientos parciales             | logic/energy-settlement.test.js   | —                               | —                           | ✅ Cubierto |
| ENE-04  | Variable proporcional a kWh (con lecturas)         | logic/energy-settlement.test.js   | services/energy.service.test.js | —                           | ✅ Cubierto |
| ENE-05  | Variable proporcional a fracción (sin lecturas)    | logic/energy-settlement.test.js   | services/energy.service.test.js | —                           | ✅ Cubierto |
| ENE-06  | Reconciliación: SUM == total exacto                | logic/energy-settlement.test.js   | —                               | —                           | ✅ Cubierto |
| ENE-07  | settleEnergyBill: llamadas a Supabase correctas    | —                                 | services/energy.service.test.js | —                           | ✅ Cubierto |
| ENE-08  | unsettleEnergyBill: borrar reparto                 | —                                 | services/energy.service.test.js | —                           | ✅ Cubierto |
| ENE-09  | Propiedad global: 3 inquilinos → suma exacta       | logic/energy-settlement.test.js   | —                               | —                           | ✅ Cubierto |
| ENE-10  | Propiedad global: inquilino parcial → A > B, suma  | logic/energy-settlement.test.js   | —                               | —                           | ✅ Cubierto |
| ENE-11  | Subir factura manual (UI)                          | —                                 | —                               | e2e/specs/energy.spec.js    | 🚧 Pendiente |
| ENE-12  | Botón Repartir genera settlements+bulletins (UI)   | —                                 | —                               | e2e/specs/energy.spec.js    | 🚧 Pendiente |

---

## CON — Consumos (Visor de Período)

Funcionalidad: `src/pages/v2/admin/accommodations/tabs/ConsumoTab.jsx` — `VisorConsumo`
Requisito: REQ-008

| ID      | Funcionalidad                                         | Unit (lógica) | E2E                                  | Estado  |
|---------|-------------------------------------------------------|---------------|--------------------------------------|---------|
| CON-01  | Modo "Últimos 12 meses" → gráfico con 12 puntos       | —             | qa/e2e/specs/consumos.spec.js        | 🚧 Pendiente |
| CON-02  | Modo "Año completo" → selector año + meses Ene–Dic    | —             | qa/e2e/specs/consumos.spec.js        | 🚧 Pendiente |
| CON-03  | Modo "Mes específico" → selector mes + puntos por día | —             | qa/e2e/specs/consumos.spec.js        | 🚧 Pendiente |

---

## SEC — Seguridad y Multi-tenant

| ID      | Funcionalidad                              | Unit (seguridad)                           | E2E                              | Estado  |
|---------|--------------------------------------------|--------------------------------------------|----------------------------------|---------|
| SEC-01  | RLS activo en tablas críticas              | security/multi-tenant-isolation.test.js    | —                                | ✅ Cubierto |
| SEC-02  | Queries incluyen client_account_id         | security/multi-tenant-isolation.test.js    | —                                | ✅ Cubierto |
| SEC-03  | Tenant A no ve datos de Tenant B           | security/multi-tenant-isolation.test.js    | e2e/specs/security (🚧 futuro)   | ⚠️ Parcial |
| SEC-04  | RLS valida tenant en escrituras directas   | security/multi-tenant-isolation.test.js    | —                                | ⚠️ Parcial |

---

## PERF — Rendimiento

| ID       | Funcionalidad                              | Test                                               | Estado  |
|----------|--------------------------------------------|-----------------------------------------------------|---------|
| PERF-01  | listAccommodations con 1.000 registros     | src/tests/rendimiento/volumetria.test.js            | ✅ Cubierto |
| PERF-02  | Circuit breaker abre/cierra correctamente  | src/tests/rendimiento/concurrencia-breaker.test.js  | ✅ Cubierto |
| PERF-03  | invokeWithAuth bajo concurrencia           | src/tests/rendimiento/concurrencia.test.js          | ✅ Cubierto |

---

## ENT — Gestión de Entidades (Owner / Payer)

Funcionalidad: `src/pages/v2/admin/settings/AdminSettings.jsx` — tabs Entidad Propietaria y Entidad Pagadora  
Requisito: REQ-011

| ID      | Funcionalidad                                          | Unit (lógica) | E2E                                     | Estado  |
|---------|--------------------------------------------------------|---------------|-----------------------------------------|---------|
| ENT-01  | Crear entidad owner desde Configuración (plan Basic)   | —             | qa/e2e/specs/settings.spec.js           | 🚧 Pendiente |
| ENT-02  | Editar entidad owner existente                         | —             | qa/e2e/specs/settings.spec.js           | 🚧 Pendiente |
| ENT-03  | Tab Entidad Pagadora carga solo entidad type='payer'   | —             | qa/e2e/specs/settings.spec.js           | 🚧 Pendiente |
| ENT-04  | Crear entidad payer si no existe                       | —             | qa/e2e/specs/settings.spec.js           | 🚧 Pendiente |
| ENT-05  | Editar entidad payer existente                         | —             | qa/e2e/specs/settings.spec.js           | 🚧 Pendiente |
| ENT-06  | Sin owner → AccommodationCreate bloquea creación       | —             | qa/e2e/specs/accommodations.spec.js     | 🚧 Pendiente |
| ENT-07  | Con owner creado → AccommodationCreate permite flujo   | —             | qa/e2e/specs/accommodations.spec.js     | 🚧 Pendiente |

---

## UI — Interfaz de Alojamientos y Habitaciones

Funcionalidad: `src/components/AccommodationCard.jsx` (nuevo), `src/pages/v2/admin/accommodations/AccommodationDetail.jsx`  
Cambio: CHG-2026-04-05

| ID      | Funcionalidad                                                       | Unit | E2E                                        | Estado        |
|---------|---------------------------------------------------------------------|------|--------------------------------------------|---------------|
| UI-01   | AccommodationCard unificado — AccommodationsList usa card nueva     | —    | qa/e2e/specs/accommodations.spec.js        | 🚧 Pendiente  |
| UI-02   | AccommodationCard unificado — EntityDetail usa card nueva           | —    | qa/e2e/specs/entities.spec.js              | 🚧 Pendiente  |
| UI-03   | Room card — cabecera blanca con título+precio separados de imagen   | —    | qa/e2e/specs/accommodations.spec.js        | 🚧 Pendiente  |
| UI-04   | Room card — formato HAB-XXX sin duplicar prefijo                    | —    | qa/e2e/specs/accommodations.spec.js        | 🚧 Pendiente  |
| UI-05   | Room card — imagen dinámica por estado (libre/ocupado-M/ocupado-F)  | —    | qa/e2e/specs/accommodations.spec.js        | 🚧 Pendiente  |
| UI-06   | Room card — badge inquilino superpuesto en imagen (abajo-izq)       | —    | qa/e2e/specs/accommodations.spec.js        | 🚧 Pendiente  |
| UI-07   | Room card — iconos cocina-icono.webp / baño-icono.webp              | —    | qa/e2e/specs/accommodations.spec.js        | 🚧 Pendiente  |
| UI-08   | Room card — footer Alojamiento + Entidad truncado a 1 línea         | —    | qa/e2e/specs/accommodations.spec.js        | 🚧 Pendiente  |
| UI-09   | Room card — sombra 3D en imagen (drop-shadow)                       | —    | —                                          | 🚧 Pendiente  |
| UI-10   | Panel filtros habitaciones — select Estado siempre visible          | —    | qa/e2e/specs/accommodations.spec.js        | 🚧 Pendiente  |
| UI-11   | Panel filtros habitaciones — select Baño siempre visible            | —    | qa/e2e/specs/accommodations.spec.js        | 🚧 Pendiente  |
| UI-12   | Panel filtros habitaciones — select Cocina siempre visible          | —    | qa/e2e/specs/accommodations.spec.js        | 🚧 Pendiente  |
| UI-13   | Panel filtros habitaciones — "Limpiar" aparece solo si hay filtro   | —    | qa/e2e/specs/accommodations.spec.js        | 🚧 Pendiente  |
| UI-14   | Panel filtros habitaciones — se limpian al entrar al tab            | —    | qa/e2e/specs/accommodations.spec.js        | 🚧 Pendiente  |
| UI-15   | Room card libre — botón único "Asignar Inquilino" abre modal        | —    | qa/e2e/specs/accommodations.spec.js        | 🚧 Pendiente  |
| UI-16   | Modal asignar — botón "Crear Inquilino" navega a formulario         | —    | qa/e2e/specs/accommodations.spec.js        | 🚧 Pendiente  |

---

## RSE — Búsqueda Global de Habitaciones

Funcionalidad: `src/pages/v2/admin/rooms/RoomsSearch.jsx`  
Requisito: REQ-012  
Cambio: CHG-2026-04-06-room-search

| ID      | Funcionalidad                                                           | Unit | E2E                                        | Estado        |
|---------|-------------------------------------------------------------------------|------|--------------------------------------------|---------------|
| RSE-01  | Icono "Habitaciones" aparece en barra de nav admin                      | —    | qa/e2e/specs/rooms-search.spec.js          | 🚧 Pendiente  |
| RSE-02  | Clic en icono navega a `/v2/admin/habitaciones`                         | —    | qa/e2e/specs/rooms-search.spec.js          | 🚧 Pendiente  |
| RSE-03  | Sin búsqueda activa → no muestra resultados (mensaje orientativo)       | —    | qa/e2e/specs/rooms-search.spec.js          | 🚧 Pendiente  |
| RSE-04  | Filtro Entidad → selector Alojamiento muestra solo sus alojamientos     | —    | qa/e2e/specs/rooms-search.spec.js          | 🚧 Pendiente  |
| RSE-05  | Cambio de Entidad limpia Alojamiento si ya no aplica                    | —    | qa/e2e/specs/rooms-search.spec.js          | 🚧 Pendiente  |
| RSE-06  | Filtro Estado=Libre → solo habitaciones libres                          | —    | qa/e2e/specs/rooms-search.spec.js          | 🚧 Pendiente  |
| RSE-07  | Filtro Baño=Compartido → solo habitaciones con baño compartido          | —    | qa/e2e/specs/rooms-search.spec.js          | 🚧 Pendiente  |
| RSE-08  | Filtro Cocina=Privada → solo habitaciones con cocina privada            | —    | qa/e2e/specs/rooms-search.spec.js          | 🚧 Pendiente  |
| RSE-09  | "Limpiar campos" resetea filtros, resultados y localStorage             | —    | qa/e2e/specs/rooms-search.spec.js          | 🚧 Pendiente  |
| RSE-10  | Toggle lista/cards — cambia vista sin perder filtros                    | —    | qa/e2e/specs/rooms-search.spec.js          | 🚧 Pendiente  |
| RSE-11  | Vista lista — columnas Alojamiento, Entidad, Estado, Precio, Baño, Cocina | —  | qa/e2e/specs/rooms-search.spec.js          | 🚧 Pendiente  |
| RSE-12  | Card libre → botón "Asignar Inquilino" navega al alojamiento            | —    | qa/e2e/specs/rooms-search.spec.js          | 🚧 Pendiente  |
| RSE-13  | Card ocupada — Ver detalle navega a `/v2/admin/inquilinos/:id/detalle`  | —    | qa/e2e/specs/rooms-search.spec.js          | 🚧 Pendiente  |
| RSE-14  | Card ocupada — imagen femenina si gender=female                         | —    | qa/e2e/specs/rooms-search.spec.js          | 🚧 Pendiente  |
| RSE-15  | Filtros persisten al navegar a otra página y volver                     | —    | qa/e2e/specs/rooms-search.spec.js          | 🚧 Pendiente  |
| RSE-16  | "Limpiar campos" → vuelve a estado inicial sin resultados               | —    | qa/e2e/specs/rooms-search.spec.js          | 🚧 Pendiente  |

---

---

## SAL — SmartAccessLock

Funcionalidad: REQ-013 (SaaS Services Catalog) + REQ-014 (SmartAccessLock)  
Migraciones: `20260412000001..20260412000004` (diseño completado — pendientes ejecutar)

### SAL-SaaS — Catálogo y Suscripciones

| ID       | Funcionalidad                                                                     | Unit | E2E                                         | Estado        |
|----------|-----------------------------------------------------------------------------------|------|---------------------------------------------|---------------|
| SaaS-01  | Superadmin crea servicio → visible en lista saas_services                         | —    | qa/e2e/specs/superadmin-saas.spec.js        | 🚧 Pendiente  |
| SaaS-02  | Servicio en draft → no visible para client_account                                | —    | qa/e2e/specs/superadmin-saas.spec.js        | 🚧 Pendiente  |
| SaaS-03  | Plan se vincula al servicio correctamente (UNIQUE service+code)                   | —    | qa/e2e/specs/superadmin-saas.spec.js        | 🚧 Pendiente  |
| SaaS-04  | Feature flag habilitado en plan → accesible desde la API                          | —    | qa/e2e/specs/superadmin-saas.spec.js        | 🚧 Pendiente  |
| SaaS-05  | Superadmin activa suscripción para client → status = active                       | —    | qa/e2e/specs/superadmin-saas.spec.js        | 🚧 Pendiente  |
| SaaS-06  | Client sin suscripción activa no puede acceder al módulo SAL                      | —    | qa/e2e/specs/superadmin-saas.spec.js        | 🚧 Pendiente  |
| SaaS-07  | UNIQUE (client_account_id, saas_service_id) — no duplicar suscripción             | —    | —                                           | 🚧 Pendiente  |

### SAL-INT — Integración y Sincronización de Locks

| ID       | Funcionalidad                                                                     | Unit | E2E                                         | Estado        |
|----------|-----------------------------------------------------------------------------------|------|---------------------------------------------|---------------|
| SAL-01   | Guardar integración TTLock (client_account + provider) — UNIQUE por cuenta        | —    | qa/e2e/specs/sal-integration.spec.js        | 🚧 Pendiente  |
| SAL-02   | Sincronizar locks desde TTLock → crea/actualiza filas en `locks`                  | —    | —                                           | 🚧 Pendiente  |
| SAL-03   | lock sincronizada no duplica si provider_lock_id ya existe (UNIQUE)               | —    | —                                           | 🚧 Pendiente  |
| SAL-04   | Placement activo único por lock (UNIQUE partial idx_lock_placements_one_active)   | —    | —                                           | 🚧 Pendiente  |
| SAL-05   | CHECK constraint placement_type_coherence: room → room_id NOT NULL                | —    | —                                           | 🚧 Pendiente  |
| SAL-06   | Zona común se crea y asocia a alojamiento correctamente                           | —    | qa/e2e/specs/sal-integration.spec.js        | 🚧 Pendiente  |

### SAL-ACC — Actores, Grupos y Scopes

| ID       | Funcionalidad                                                                     | Unit | E2E                                         | Estado        |
|----------|-----------------------------------------------------------------------------------|------|---------------------------------------------|---------------|
| SAL-07   | Crear actor (tipo limpieza) y asociarlo a client_account                          | —    | qa/e2e/specs/sal-actors.spec.js             | 🚧 Pendiente  |
| SAL-08   | Crear grupo con credential_policy jsonb correcta                                  | —    | qa/e2e/specs/sal-actors.spec.js             | 🚧 Pendiente  |
| SAL-09   | Añadir actor a grupo (UNIQUE actor+grupo)                                         | —    | qa/e2e/specs/sal-actors.spec.js             | 🚧 Pendiente  |
| SAL-10   | Scope all_accommodations: coherence check — accommodation_id IS NULL              | —    | —                                           | 🚧 Pendiente  |
| SAL-11   | Scope room: coherence check — room_id NOT NULL                                    | —    | —                                           | 🚧 Pendiente  |

### SAL-GRN — Grants y Credenciales

| ID       | Funcionalidad                                                                     | Unit | E2E                                         | Estado        |
|----------|-----------------------------------------------------------------------------------|------|---------------------------------------------|---------------|
| SAL-12   | Grant auto-creado al asignar habitación a inquilino (source_type = room_assignment)| —   | —                                           | 🚧 Pendiente  |
| SAL-13   | XOR constraint: grant type=lodger → lodger_id NOT NULL, actor_id IS NULL          | —    | —                                           | 🚧 Pendiente  |
| SAL-14   | Revocar grant → status = revoked, revoked_at populated                            | —    | qa/e2e/specs/sal-grants.spec.js             | 🚧 Pendiente  |
| SAL-15   | Credencial emitida (PIN) vinculada a grant y lock                                 | —    | —                                           | 🚧 Pendiente  |
| SAL-16   | lock_records no duplica evento con mismo provider_record_id (UNIQUE)              | —    | —                                           | 🚧 Pendiente  |
| SAL-17   | Notificación credential_issued → status = sent tras envío email                   | —    | —                                           | 🚧 Pendiente  |

### SAL-SEC — Seguridad y Multi-tenancy

| ID       | Funcionalidad                                                                     | Unit | E2E                                         | Estado        |
|----------|-----------------------------------------------------------------------------------|------|---------------------------------------------|---------------|
| SAL-18   | RLS: admin solo ve locks de su client_account                                     | —    | —                                           | 🚧 Pendiente  |
| SAL-19   | RLS: catálogo saas_services visible para todo authenticated                       | —    | —                                           | 🚧 Pendiente  |
| SAL-20   | RLS: lock_records — INSERT solo service_role (authenticated no puede insertar)    | —    | —                                           | 🚧 Pendiente  |

---

## Resumen de cobertura

| Módulo       | Total funcionalidades | Cubiertas | Parciales | Pendientes |
|--------------|-----------------------|-----------|-----------|------------|
| AUTH         | 6                     | 2         | 1         | 3          |
| TEN          | 11                    | 4         | 2         | 5          |
| ACC          | 12                    | 4         | 1         | 7          |
| ENE          | 12                    | 10        | 0         | 2          |
| CON          | 3                     | 0         | 0         | 3          |
| SEC          | 4                     | 1         | 3         | 0          |
| PERF         | 3                     | 3         | 0         | 0          |
| ENT          | 7                     | 0         | 0         | 7          |
| UI           | 16                    | 0         | 0         | 16         |
| RSE          | 16                    | 0         | 0         | 16         |
| SaaS         | 7                     | 0         | 0         | 7          |
| SAL          | 20                    | 0         | 0         | 20         |
| **TOTAL**    | **117**               | **24**    | **7**     | **86**     |

**Cobertura actual: 26% completa, 33% con parciales**

---

## Gaps críticos (P1)

1. **AUTH-03 E2E** — Login con portal cruzado no tiene spec activo
2. **TEN-05/06 E2E** — BUG-033 bloquea todos los tests de creación/checkout de inquilinos
3. **ENE-11/12 E2E** — Flujo completo de factura+reparto+borrar en browser sin spec activo
4. **ENT-01/06/07** — Crear entidad owner → crear alojamiento: flujo crítico post-BUG-046/049 sin test E2E

## Gaps P2 para siguiente iteración

5. **ACC-06** — Tests de configuración `has_individual_meters` por alojamiento
6. **ENT-02..05** — Editar owner/payer, tab payer filtra correctamente
7. **ENE-11/12 E2E** — Flujo completo de factura + reparto + borrar reparto en browser
