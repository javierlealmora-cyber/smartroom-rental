# Convenciones de Nomenclatura

## 📝 Formato de Migraciones

```
YYYYMMDDHHMMSS_descripcion_semantica.sql
```

**Componentes:**
- `YYYY` - Año (4 dígitos)
- `MM` - Mes (2 dígitos)
- `DD` - Día (2 dígitos)
- `HH` - Hora (2 dígitos, 00-23)
- `MM` - Minuto (2 dígitos)
- `SS` - Segundo (2 dígitos)
- `descripcion_semantica` - Descripción en snake_case

**Ejemplos:**
```
20260327143000_add_consumptions_table.sql
20260327143100_add_consumption_indexes.sql
20260327150000_backfill_consumption_data.sql
```

## 🎯 Prefijos por Tipo

### Schema Migrations
```
add_*           - Añadir columna/tabla
create_*        - Crear nueva entidad
alter_*         - Modificar estructura existente
rename_*        - Renombrar columna/tabla
drop_*          - Eliminar (raro, documentar bien)
```

**Ejemplos:**
- `add_checkout_notes_to_assignments.sql`
- `alter_profiles_add_address_fields.sql`
- `rename_status_to_onboarding_status.sql`

### Data Migrations
```
backfill_*      - Rellenar datos en columnas nuevas
migrate_*       - Migrar datos entre tablas
update_*        - Actualizar datos existentes
cleanup_*       - Limpiar datos obsoletos
normalize_*     - Normalizar datos
```

**Ejemplos:**
- `backfill_consumption_data.sql`
- `migrate_old_assignments_to_new_table.sql`
- `cleanup_orphaned_records.sql`

### Security Migrations
```
add_rls_*       - Añadir políticas RLS
update_rls_*    - Actualizar políticas RLS
add_constraint_* - Añadir constraints
revoke_*        - Revocar permisos
grant_*         - Otorgar permisos
```

**Ejemplos:**
- `add_rls_consumptions_table.sql`
- `add_constraint_no_overlap.sql`

### Performance Migrations
```
add_index_*     - Añadir índices
add_materialized_view_* - Vistas materializadas
optimize_*      - Optimizaciones generales
add_function_*  - Funciones helper
```

**Ejemplos:**
- `add_index_assignments_date_range.sql`
- `add_materialized_view_occupancy_stats.sql`
- `add_function_get_room_status.sql`

## 📁 Nombres de Archivos

### Seeds
```
static/
  01_plans_catalog.sql
  02_service_catalog.sql

development/
  01_dev_client_accounts.sql
  02_dev_profiles.sql

staging/
  01_staging_client_accounts.sql
```

**Reglas:**
- Prefijo numérico para orden de ejecución
- Descripción clara del contenido
- Snake_case

### Scripts
```
deployment/
  deploy-baseline.sh
  deploy-migrations.sh

development/
  create-migration.sh
  reset-local-db.sh

maintenance/
  backup-database.sh
  restore-database.sh
```

**Reglas:**
- Kebab-case para scripts
- Verbos descriptivos
- Sin prefijos numéricos

## ✅ Buenas Prácticas

### ✓ Buenos Nombres
```
add_checkout_notes_to_assignments.sql
backfill_lodger_status_from_assignments.sql
add_index_profiles_role_tenant.sql
add_rls_consumptions_multi_tenant.sql
```

### ✗ Malos Nombres
```
migration.sql                    # Muy genérico
fix.sql                          # No descriptivo
20260327.sql                     # Falta descripción
add_column.sql                   # Qué columna?
update_data.sql                  # Qué datos?
```

## 🔍 Ejemplos Completos

### Schema Migration
```
20260327143000_add_consumptions_table.sql
```
Añade nueva tabla `consumptions` con columnas, constraints e índices.

### Data Migration
```
20260327150000_backfill_lodger_status.sql
```
Rellena columna `status` basándose en asignaciones activas.

### Security Migration
```
20260327160000_add_no_overlap_constraint.sql
```
Añade constraint de exclusión para prevenir doble asignación.

### Performance Migration
```
20260327170000_add_performance_indexes.sql
```
Añade 25 índices compuestos para optimizar queries frecuentes.
