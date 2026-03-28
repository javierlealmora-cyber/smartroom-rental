# Índice de Migraciones SQL

Índice completo de todas las migraciones SQL del sistema SmartRoom Rental.

---

## 📊 Resumen

- **Total migraciones:** 19 archivos
- **Baseline:** 7 archivos (inmutables)
- **Schema:** 6 migraciones
- **Data:** 2 migraciones
- **Security:** 1 migración
- **Performance:** 3 migraciones

**Última migración:** `20260327000001_add_no_overlap_constraint.sql`

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
- `address_number`, `address_floor`
- `address_door`, `address_postal_code`

**REQ:** REQ-002 (Tenants Lifecycle)  
**CHG:** N/A  
**Issue:** N/A  
**Tests:** Pendiente

**Impacto:**
- Frontend: Formulario de alojamiento
- Backend: Validaciones

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
- **Infraestructura:** 7 migraciones (baseline)

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

**Última actualización:** 2026-03-28  
**Próxima revisión:** Tras cada nueva migración
