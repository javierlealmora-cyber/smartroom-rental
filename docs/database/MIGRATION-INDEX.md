# Índice de Migraciones SQL

Índice completo de todas las migraciones SQL del sistema SmartRoom Rental.

---

## 📊 Resumen

- **Total migraciones:** 27 archivos
- **Baseline:** 7 archivos (inmutables)
- **Schema:** 15 migraciones
- **Data:** 2 migraciones
- **Security:** 2 migraciones
- **Performance:** 3 migraciones (en carpeta /performance)

**Última migración:** `20260411000002_rename_owner_fields_client_accounts.sql` ⚠️ PENDIENTE EJECUTAR EN STAGING/PROD

> **REQ-012 (Búsqueda global de habitaciones) — Sin migración requerida.** Usa esquema existente: `rooms`, `lodger_room_assignments`, `accommodations`, `entities`, `profiles.gender`. BUG-051: columna `size_sqm` no existe (la real es `square_meters`) — corregido en código, sin cambio de BD.

> **Cambios UI 2026-04-11 (topbar branding, TenantCreate stepper, TenantDetail modal edición, ChangeRoomModal) — Sin migración requerida.** Solo afectan a componentes React.

---

## 🔵 BASELINE (Punto Cero - Inmutable)

### 00000000000000_baseline_extensions.sql
**Tipo:** Baseline  
**Fecha:** Inicial  
**Descripción:** Extensiones PostgreSQL necesarias  
**Contenido:**
- `uuid-ossp` - Generación de UUIDs
- `btree_gist` - Constraints de exclusión
- `pg_cron` - Tareas programadas

**REQ:** N/A (baseline)  
**Issue:** N/A  
**Tests:** N/A

---

### 00000000000001_baseline_schema.sql
**Tipo:** Baseline  
**Fecha:** Inicial  
**Descripción:** Esquema completo inicial - 19 tablas  
**Contenido:**
- **Core:** plans_catalog, client_accounts, profiles, entities
- **Alojamientos:** accommodations, rooms, lodgers, lodger_room_assignments
- **Servicios:** services_catalog, accommodation_services, lodger_services
- **Energía:** energy_bills, energy_readings, energy_settlements, bulletins
- **Sistema:** audit_log, incidents, stripe_events, payer_rental

**REQ:** REQ-001, REQ-002, REQ-003, REQ-004  
**Issue:** N/A  
**Tests:** N/A

---

### 00000000000002_baseline_functions.sql
**Tipo:** Baseline  
**Fecha:** Inicial  
**Descripción:** Funciones helper del sistema  
**Contenido:**
- `update_updated_at_column()` - Trigger function para updated_at
- `get_my_client_account_id()` - Helper para RLS
- `get_my_role()` - Helper para RLS

**REQ:** N/A (infraestructura)  
**Issue:** N/A  
**Tests:** N/A

---

### 00000000000003_baseline_rls.sql
**Tipo:** Baseline  
**Fecha:** Inicial  
**Descripción:** 67 políticas RLS para multi-tenancy  
**Contenido:**
- Políticas SELECT, INSERT, UPDATE, DELETE por tabla
- Patrón: filtrado por `client_account_id`
- Roles: authenticated, anon, service_role

**REQ:** REQ-002 (Multi-tenancy)  
**Issue:** N/A  
**Tests:** `tests/test-cases/security-multi-tenant-isolation.md`

---

### 00000000000004_baseline_triggers.sql
**Tipo:** Baseline  
**Fecha:** Inicial  
**Descripción:** 15 triggers updated_at  
**Contenido:**
- Trigger en cada tabla para actualizar `updated_at`
- Usa función `update_updated_at_column()`

**REQ:** N/A (infraestructura)  
**Issue:** N/A  
**Tests:** N/A

---

### 00000000000005_baseline_indexes.sql
**Tipo:** Baseline  
**Fecha:** Inicial  
**Descripción:** ~40 índices optimizados  
**Contenido:**
- Índices en foreign keys
- Índices compuestos para queries frecuentes
- Índices parciales para optimización

**REQ:** N/A (performance)  
**Issue:** N/A  
**Tests:** N/A

---

### 00000000000006_baseline_storage.sql
**Tipo:** Baseline  
**Fecha:** Inicial  
**Descripción:** Buckets de storage y políticas  
**Contenido:**
- Bucket `avatars` - Fotos de perfil
- Bucket `documents` - Documentos de inquilinos
- Bucket `energy-bills` - Facturas de energía
- Políticas de acceso por tenant

**REQ:** REQ-001, REQ-004  
**Issue:** N/A  
**Tests:** N/A

---

## 🟢 SCHEMA (Cambios de Estructura)

### 20260317120000_add_lodger_fields_to_profiles.sql
**Tipo:** Schema  
**Fecha:** 2026-03-17  
**Descripción:** Añadir campos de inquilino a tabla profiles  
**Contenido:**
- `first_name`, `last_name1`, `last_name2`
- `phone`, `dni`, `birth_date`
- `nationality`, `gender`
- Campos para datos personales de inquilinos

**REQ:** REQ-003 (Room Assignment)  
**CHG:** N/A  
**Issue:** N/A  
**Tests:** Pendiente

**Impacto:**
- Frontend: Formularios de perfil de inquilino
- Backend: Edge Function `manage_lodger`

---

### 20260323100000_add_address_fields_to_profiles.sql
**Tipo:** Schema  
**Fecha:** 2026-03-23  
**Descripción:** Añadir campos de dirección a profiles  
**Contenido:**
- `address_street`, `address_city`
- `address_state`, `address_country`
- `address_postal_code`

**REQ:** REQ-003  
**CHG:** N/A  
**Issue:** N/A  
**Tests:** Pendiente

**Impacto:**
- Frontend: Formulario de perfil
- Backend: Validaciones de dirección

---

### 20260323100100_add_address_number_to_profiles.sql
**Tipo:** Schema  
**Fecha:** 2026-03-23  
**Descripción:** Añadir número de dirección a profiles  
**Contenido:**
- `address_number` VARCHAR(20)

**REQ:** REQ-003  
**CHG:** N/A  
**Issue:** N/A  
**Tests:** Pendiente

**Impacto:**
- Frontend: Campo adicional en formulario

---

### 20260323110000_add_address_detail_to_accommodations.sql
**Tipo:** Schema  
**Fecha:** 2026-03-23  
**Descripción:** Añadir campos de dirección detallada a accommodations  
**Contenido:**
- `street_number` TEXT — número de calle (ej. "12", "12B")
- `floor` TEXT — planta
- `door` TEXT — puerta

**REQ:** REQ-001 (Accommodations)  
**CHG:** N/A  
**Issue:** N/A  
**Tests:** Pendiente

**Impacto:**
- Frontend: Campo "Número" visible en formulario de alojamiento (AccommodationDetail.jsx)
- Subtítulo del alojamiento muestra calle + número correctamente

---

### 20260325140000_add_checkout_notes_to_assignments.sql
**Tipo:** Schema  
**Fecha:** 2026-03-25  
**Descripción:** Añadir campo checkout_notes a lodger_room_assignments  
**Contenido:**
- `checkout_notes` TEXT
- Para observaciones durante check-out

**REQ:** REQ-003  
**CHG:** N/A  
**Issue:** N/A  
**Tests:** Pendiente

**Impacto:**
- Frontend: Formulario de check-out
- Backend: Edge Function `manage_lodger`

---

### 20260329000000_energy_settlements_daily.sql
**Tipo:** Schema
**Fecha:** 2026-03-29
**Descripción:** Rediseño de `energy_settlements` a granularidad diaria
**Contenido:**
- TRUNCATE `bulletins` + DROP TABLE `energy_settlements` (elimina esquema anterior)
- CREATE TABLE `energy_settlements` con nuevas columnas:
  - `accommodation_id` (denormalizado para consultas rápidas)
  - `settlement_date date NOT NULL` (granularidad diaria)
  - `kwh_day`, `amount_fixed_day`, `amount_variable_day`, `amount_total_day`
  - UNIQUE (energy_bill_id, room_id, lodger_id, settlement_date)
- RLS: SELECT/INSERT/DELETE para admin+agent en su propio tenant
- 3 índices: por `energy_bill_id`, por `(accommodation_id, settlement_date)`, por `(lodger_id, settlement_date)`

**REQ:** REQ-007 (Energy Bill Settlement)
**CHG:** CHG-2026-03-29 (nuevo algoritmo fracción diaria)
**Issue:** BUG-040 (pendiente ejecutar en live)
**Tests:** ENE-01..10 en `qa/unit/logic/energy-settlement.test.js`

**Impacto:**
- Backend: `settleEnergyBill` genera N×totalDays filas en lugar de N filas (una por inquilino×día)
- Frontend: sin cambios (boletines siguen siendo uno por inquilino)
- ✅ Ejecutada en dev (2026-03-29) — datos anteriores eliminados

---

### 20260327000000_add_consumptions_table.sql
**Tipo:** Schema
**Fecha:** 2026-03-27
**Descripción:** Crear tabla consumptions para consumos reales
**Contenido:**
- Tabla `consumptions` con columnas:
  - `consumption_type` (water, electricity, gas, other)
  - `reading_date`, `previous_reading`, `current_reading`
  - `consumption_amount` (calculated)
  - `unit_price`, `total_cost` (calculated)
- RLS habilitado con 4 políticas
- 3 índices optimizados
- Trigger updated_at

**REQ:** REQ-004 (Energy Billing)
**CHG:** CHG-2026-03-28-energy-settlement-rules
**Issue:** Pendiente
**Tests:** Pendiente

**Impacto:**
- Frontend: Módulo de consumos (nuevo)
- Backend: Funciones de cálculo de consumos
- Reemplaza datos mockeados del frontend

---

### 20260329130000_add_services_provision_to_assignments.sql
**Tipo:** Schema
**Fecha:** 2026-03-29
**Estado:** ✅ Aplicada en DEV
**Descripción:** Añadir campo `services_provision_amount` a `lodger_room_assignments`
**Contenido:**
- `services_provision_amount NUMERIC(10,2) DEFAULT NULL`
- "Hucha Energética": previsión mensual que el inquilino aporta a suministros del alojamiento
- Complementa a `prevision_fund_*` de `accommodations` (nivel alojamiento)
- Primer pago coincide con `billing_start_date` (primer día del mes siguiente al check-in)

**REQ:** REQ-003 (Room Assignment)
**CHG:** N/A
**Issue:** N/A
**Tests:** CHG-11 🚧 Pendiente

**Impacto:**
- Frontend: campo "Previsión de Gastos de Servicios" en `RoomAssignmentForm.jsx`
- `TenantCreate.jsx` y `TenantDetail.jsx` pasan el campo al servicio `assignRoomToLodger`

---

### 20260329100000_add_estimated_source_to_energy_readings.sql
**Tipo:** Schema
**Fecha:** 2026-03-29
**Estado:** ✅ Aplicada en DEV
**Descripción:** Añadir campo `estimated_source` a `energy_readings`
**Contenido:**
- Campo para indicar origen de la estimación de lectura

**REQ:** REQ-004 (Energy Billing)
**Issue:** N/A
**Tests:** Pendiente

---

### 20260330000000_fix_entities_optional_fields.sql
**Tipo:** Schema
**Fecha:** 2026-03-30
**Estado:** ✅ Aplicada en DEV
**Descripción:** Hacer opcionales campos NOT NULL de `entities`
**Contenido:**
- Campos de personas físicas ahora son nullable
- Permite crear entidades de tipo empresa sin datos de persona física

**REQ:** REQ-011 (Entity Management)
**Issue:** N/A
**Tests:** Pendiente

---

### 20260408000001_add_reserved_room_state.sql
**Tipo:** Schema
**Fecha:** 2026-04-08
**Estado:** ✅ Aplicada en DEV
**Descripción:** Añadir estado "Reservada" a habitaciones
**Contenido:**
- Elimina unique indexes bloqueantes en `lodger_room_assignments`
- Corrige constraint de no solapamiento a rango `'[)'` (exclusivo en fecha salida)
- Actualiza `get_room_derived_status()` para devolver `'reserved'` cuando solo hay asignación futura sin activa

**REQ:** REQ-005 (Room States v2)
**CHG:** Rev-18
**Tests:** ACC-13..17 ✅ en `qa/unit/logic/roomStatus.test.js`

**Impacto:**
- Frontend: `AccommodationDetail.jsx` y `RoomsSearch.jsx` — split de queries activas/futuras, badge "Reservada" naranja
- Modal "Cambiar habitación": `loadFreeRoomsForDate()` calcula disponibilidad en fecha del cambio

---

### 20260409000001_rename_notes_add_correction.sql
**Tipo:** Schema
**Fecha:** 2026-04-09
**Estado:** ✅ Aplicada en DEV
**Descripción:** Renombrar `checkout_notes → notes` y añadir `correction_amount`
**Contenido:**
- RENAME COLUMN `checkout_notes` → `notes` (campo genérico, no solo para checkout)
- ADD COLUMN `correction_amount NUMERIC(10,2)` — corrección proporcional por cambio de hab. a mitad de mes

**REQ:** REQ-003 (Room Assignment)
**CHG:** Rev-19
**Tests:** CHG-01..05 ✅ en `qa/unit/logic/correctionAmount.test.js`

**Impacto:**
- Frontend: `ChangeRoomModal.jsx` — campo `correction_amount` auto-calculado por fórmula proporcional días restantes/días mes
- `TenantDetail.jsx` historial muestra campo `notes`

---

### 20260411000001_add_owner_fields_to_client_accounts.sql
**Tipo:** Schema
**Fecha:** 2026-04-11
**Estado:** ⚠️ PENDIENTE EJECUTAR EN STAGING/PROD
**Descripción:** Añadir campos de propietario a `client_accounts`
**Contenido:**
- `owner_first_name TEXT` — nombre del propietario
- `owner_last_name1 TEXT` — primer apellido
- `owner_last_name2 TEXT` — segundo apellido

**Contexto:** Datos de propietario se movieron de `entities` (con muchos NOT NULL) a `client_accounts` donde ya existen `contact_email` y `contact_phone`.

**REQ:** REQ-002 (Tenants Lifecycle — Configuración de cuenta)
**Tests:** N/A (dato de perfil)

---

### 20260411000002_rename_owner_fields_client_accounts.sql
**Tipo:** Schema
**Fecha:** 2026-04-11
**Estado:** ⚠️ PENDIENTE EJECUTAR EN STAGING/PROD (debe ejecutarse DESPUÉS de 20260411000001)
**Descripción:** Ajustar campos de propietario en `client_accounts`
**Contenido:**
- DROP COLUMN `owner_first_name` (el nombre ya está en `name`)
- RENAME `owner_last_name1 → last_name1`
- RENAME `owner_last_name2 → last_name2`

**Esquema final resultante en `client_accounts`:**
- `name` — Nombre del propietario (era `owner_first_name`)
- `last_name1` — Primer apellido
- `last_name2` — Segundo apellido

**REQ:** REQ-002 (Tenants Lifecycle — Configuración de cuenta)
**Tests:** N/A

**Impacto:**
- Frontend: `AdminSettings.jsx` — `handleSaveOwner` guarda `name`, `last_name1`, `last_name2` en `client_accounts`; "Nombre de cuenta" muestra `name + last_name1 + last_name2`
- `TenantProvider.jsx` — expone `accountName` desde `account.name` en contexto

---

### 20260402120000_add_prevision_fund_to_accommodations.sql
**Tipo:** Schema  
**Fecha:** 2026-04-02  
**Estado:** ❌ **PENDIENTE EJECUTAR** — bloqueante para BUG-050  
**Descripción:** Añadir columnas `prevision_fund_electricity/water/gas` a `accommodations`  
**Contenido:**
- `prevision_fund_electricity NUMERIC(10,2) NOT NULL DEFAULT 0`
- `prevision_fund_water NUMERIC(10,2) NOT NULL DEFAULT 0`
- `prevision_fund_gas NUMERIC(10,2) NOT NULL DEFAULT 0`
- Validación pre-migración (NOTICE si ya existe)
- Verificación post-migración (EXCEPTION si falla)

**Nota:** Sustituye al borrador `20260329120000_add_prevision_fund_to_accommodations.sql` que tenía conflicto de timestamp con `20260329120000_fix_entities_nullable_fields.sql` y no se ejecutó.

**REQ:** REQ-009 (Configuración de Reparto de Suministros)  
**CHG:** CHG-2026-04-02  
**Issue:** BUG-050  
**Tests:** Pendiente

**Impacto:**
- Frontend: `AccommodationDetail.jsx` — guard "Guardar" deja de dar error 400
- Backend: Sin cambios (RLS existente aplica automáticamente)
- Sin datos a migrar (DEFAULT 0 para todos los registros existentes)

---

## 🟡 DATA (Migraciones de Datos)

### 20260325150000_remove_status_from_assignments.sql
**Tipo:** Data  
**Fecha:** 2026-03-25  
**Descripción:** Eliminar columna status de lodger_room_assignments  
**Contenido:**
- DROP COLUMN `status`
- Estado ahora se deriva de fechas (move_in_date, move_out_date)

**REQ:** REQ-003  
**CHG:** N/A  
**Issue:** N/A  
**Tests:** Pendiente

**Impacto:**
- Frontend: Lógica de cálculo de estado
- Backend: Función `get_room_derived_status()`

---

### 20260325150100_remove_status_from_rooms.sql
**Tipo:** Data  
**Fecha:** 2026-03-25  
**Descripción:** Eliminar columna status de rooms  
**Contenido:**
- DROP COLUMN `status`
- Estado ahora se deriva de asignaciones y mantenimiento

**REQ:** REQ-003  
**CHG:** N/A  
**Issue:** N/A  
**Tests:** Pendiente

**Impacto:**
- Frontend: Lógica de cálculo de estado de habitación
- Backend: Función `get_room_derived_status()`

---

## 🔴 SECURITY (Seguridad y Constraints)

### 20260328120000_fix_energy_bulletins_rls.sql
**Tipo:** Security
**Fecha:** 2026-03-28
**Descripción:** Corrección de políticas RLS para `bulletins` y `energy_settlements`
**Contenido:**
- `bulletins_insert_policy`: permite admin+agent insertar en su propio tenant
- `bulletins_delete_policy`: permite admin+agent borrar en su propio tenant
- `energy_settlements_delete_policy`: permite admin+agent borrar en su propio tenant
- `energy_settlements_insert_policy`: recreado por seguridad

**REQ:** REQ-007 (Energy Bill Settlement)
**CHG:** BUG-040
**Issue:** BUG-040 (403 Forbidden al pulsar "Repartir")
**Tests:** N/A (RLS verificado por comportamiento en FacturasTab)

**Impacto:**
- ✅ Ejecutada en dev (2026-03-29)

---

### 20260327000001_add_no_overlap_constraint.sql
**Tipo:** Security  
**Fecha:** 2026-03-27  
**Descripción:** Constraint para prevenir doble asignación de habitaciones  
**Contenido:**
- Extension `btree_gist`
- EXCLUDE constraint `no_overlapping_assignments`
- Usa rangos de fechas con GiST
- Trigger `validate_room_assignment` con validaciones:
  - No asignar habitación en mantenimiento
  - Fechas válidas (move_out >= move_in)
  - billing_start_date >= move_in_date

**REQ:** REQ-003 (Room Assignment)  
**CHG:** CHG-2026-03-28-add-no-overlap-assignment  
**Issue:** Pendiente  
**Tests:** Pendiente (crítico)

**Impacto:**
- Backend: Validación automática en BD
- Frontend: Manejo de errores de solapamiento
- **CRÍTICO:** Previene corrupción de datos

---

## 🟣 PERFORMANCE (Optimizaciones)

### 20260326000001_add_performance_indexes.sql
**Tipo:** Performance  
**Fecha:** 2026-03-26  
**Descripción:** 25 índices adicionales para optimizar queries frecuentes  
**Contenido:**
- Índices compuestos en tablas principales
- Índices parciales para queries específicas
- Índices en columnas de búsqueda frecuente

**REQ:** N/A (performance)  
**CHG:** N/A  
**Issue:** N/A  
**Tests:** N/A (performance testing)

**Impacto:**
- Performance: Mejora significativa en queries del dashboard
- Queries optimizadas: listados, búsquedas, filtros

---

### 20260326000002_add_materialized_views.sql
**Tipo:** Performance  
**Fecha:** 2026-03-26  
**Descripción:** Vistas materializadas y vistas para optimizar queries  
**Contenido:**
- Vista materializada `mv_occupancy_stats` - Estadísticas de ocupación
- Vista `v_active_assignments` - Asignaciones activas con joins
- 3 índices adicionales para queries frecuentes

**REQ:** N/A (performance)  
**CHG:** N/A  
**Issue:** N/A  
**Tests:** N/A

**Impacto:**
- Performance: Dashboard carga 10x más rápido
- Cron job: Refresco cada hora vía `refresh_occupancy_stats()`

---

### 20260326000003_add_helper_functions.sql
**Tipo:** Performance  
**Fecha:** 2026-03-26  
**Descripción:** Funciones SQL para lógica de negocio y optimización  
**Contenido:**
- `get_room_derived_status(room_id)` - Estado de habitación
- `refresh_occupancy_stats()` - Refresco de vista materializada
- `generate_monthly_billing()` - Generación automática de billing

**REQ:** REQ-003, REQ-004  
**CHG:** N/A  
**Issue:** N/A  
**Tests:** Pendiente

**Impacto:**
- Backend: Lógica centralizada en BD
- Frontend: Menos cálculos en cliente
- Cron: Automatización de billing mensual

---

## 📊 Estadísticas

### Por Tipo
- **Baseline:** 7 archivos (36.8%)
- **Schema:** 6 archivos (31.6%)
- **Data:** 2 archivos (10.5%)
- **Security:** 1 archivo (5.3%)
- **Performance:** 3 archivos (15.8%)

### Por Requisito
- **REQ-001 (Auth):** 1 migración
- **REQ-002 (Tenants):** 2 migraciones
- **REQ-003 (Rooms):** 7 migraciones
- **REQ-004 (Energy):** 2 migraciones
- **REQ-011 (Entity Management):** 0 migraciones — sin cambio de schema (tabla `entities` ya tiene columna `type` en baseline); BUG-046 resuelto con cambio de frontend únicamente
- **Infraestructura:** 7 migraciones (baseline)

### Notas de arquitectura (2026-04-02)
**Migración de Edge Functions a llamadas directas Supabase (sin cambio de schema):**
Los siguientes cambios de frontend eliminan dependencias de edge functions usando RLS como capa de seguridad — no requieren migraciones SQL porque el schema ya tenía RLS habilitado:
- `manage_accommodation` → INSERT directo en `accommodations` + `rooms` (`BUG-047`)
- `manage_entity` → INSERT directo en `entities` (`BUG-049`)
- `wizard_init` → UPDATE directo en `profiles.onboarding_status` (`BUG-048`)

Edge functions que **permanecen** (requieren service role o APIs externas):
- `manage_lodger` — crea usuarios en Supabase Auth (service role obligatorio)
- `wizard_submit` — crea usuarios en Auth + Stripe Checkout Session
- `provision_client_account_superadmin` — crea cuentas con service role
- `scan_energy_bill` — llama a OpenAI GPT-4o (API key secreta server-side)
- `stripe_webhook` — webhook externo de Stripe

### Pendientes de Documentar
- Tests para migraciones de schema
- Tests para constraint de no solapamiento (crítico)
- Tests para funciones de billing
- Issues de GitHub para migraciones recientes

---

## 🔍 Búsqueda Rápida

### Por Tabla
```bash
# Buscar migraciones que afectan una tabla
grep -r "table_name" supabase/migrations/
```

### Por Fecha
```bash
# Migraciones de marzo 2026
ls supabase/migrations/*/202603*.sql
```

### Por Tipo
```bash
# Migraciones de schema
ls supabase/migrations/schema/
```

### Por Requisito
```bash
# Buscar por REQ
grep -r "REQ-003" docs/database/MIGRATION-INDEX.md
```

---

## 🚀 Próximas Migraciones Planificadas

### En Desarrollo
- Ninguna actualmente

### Propuestas
- Ver `docs/requirements/changes/2026/` para CHG pendientes

---

## 📝 Notas

### Migraciones Críticas
Las siguientes migraciones son **críticas** para la integridad del sistema:
- `00000000000003_baseline_rls.sql` - RLS multi-tenant
- `20260327000001_add_no_overlap_constraint.sql` - Previene doble asignación

### Migraciones con Impacto en Performance
- `20260326000001_add_performance_indexes.sql` - Mejora queries
- `20260326000002_add_materialized_views.sql` - Optimiza dashboard

### Migraciones que Requieren Cron Jobs
- `20260326000002_add_materialized_views.sql` - Requiere cron para refresh
- `20260326000003_add_helper_functions.sql` - Requiere cron para billing

---

## 🔗 Referencias

- **Reglas de migraciones:** `MIGRATION-RULES.md`
- **Guía técnica:** `supabase/docs/MIGRATION_GUIDE.md`
- **Matriz de trazabilidad:** `docs/qa/TRACEABILITY-MATRIX.md`
- **Requisitos:** `docs/requirements/current/`

---

### 20260408000001_add_reserved_room_state.sql
**Tipo:** Schema + Funciones  
**Fecha:** 2026-04-08  
**Descripción:** Estado "Reservada" para habitaciones con asignación futura  
**Contenido:**
- Drop índices `idx_room_active_assignment` e `idx_lodger_active_assignment`
- Constraint EXCLUDE cambiado de `'[]'` a `'[)'` — permite check-out y check-in el mismo día
- Reescritura de `get_room_derived_status()` → devuelve JSONB `{status, upcoming}` con 5 estados: `free`, `occupied`, `pending_checkout`, `maintenance`, `reserved`

**REQ:** REQ-005 (Room States)  
**CHG:** N/A  
**Issue:** N/A  
**Tests:** ACC-13..18 en `qa/unit/logic/roomStatus.test.js`

**Impacto:**
- Frontend: Badge "Reservada" (naranja) en cards y lista de habitaciones — AccommodationDetail.jsx y RoomsSearch.jsx
- DB: Permite que dos asignaciones compartan la misma fecha de fin/inicio

**⚠️ Aplicar manualmente en Supabase Studio**

---

### 20260409000001_rename_notes_add_correction.sql
**Tipo:** Schema  
**Fecha:** 2026-04-09  
**Descripción:** Renombrar checkout_notes → notes y añadir correction_amount en lodger_room_assignments  
**Contenido:**
- `RENAME COLUMN checkout_notes TO notes` — campo genérico para notas de check-in, check-out y cambio de habitación
- `ADD COLUMN correction_amount numeric` — importe proporcional de corrección por cambio de habitación a mitad de mes

**REQ:** REQ-003 (Room Assignment)  
**CHG:** CHG-01..06  
**Issue:** N/A  
**Tests:** `qa/unit/logic/correctionAmount.test.js` (CHG-01..04)

**Impacto:**
- Frontend: Modal "Cambiar habitación" auto-calcula correction_amount; TenantEdit muestra notes en historial
- DB: checkout modal graba en campo `notes` (antes `checkout_notes`)

**⚠️ Aplicar manualmente en Supabase Studio**

---

**Última actualización:** 2026-04-10  
**Próxima revisión:** Tras cada nueva migración
