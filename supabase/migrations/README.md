# Migraciones SQL - SmartRoom Rental

## 📁 Estructura de Migraciones

Las migraciones están organizadas por tipo para facilitar su localización y mantenimiento:

```
migrations/
├── baseline/          🔵 Baseline inicial (punto cero, inmutable)
├── schema/            🟢 Cambios de estructura de base de datos
├── data/              🟡 Migraciones de datos (backfills, cleanups)
├── security/          🔴 Cambios de seguridad (RLS, constraints)
└── performance/       🟣 Optimizaciones (índices, vistas, funciones)
```

## 🔵 Baseline

Punto cero de la base de datos. **Inmutable** - no modificar estos archivos.

- `00000000000000_baseline_extensions.sql` - Extensiones PostgreSQL
- `00000000000001_baseline_schema.sql` - 18 tablas completas
- `00000000000002_baseline_functions.sql` - Funciones helper
- `00000000000003_baseline_rls.sql` - 67 políticas RLS
- `00000000000004_baseline_triggers.sql` - 15 triggers
- `00000000000005_baseline_indexes.sql` - Índices optimizados
- `00000000000006_baseline_storage.sql` - Buckets y políticas

## 🟢 Schema

Cambios de estructura: tablas, columnas, tipos, constraints.

**Archivos actuales:**
- `20260317120000_add_lodger_fields_to_profiles.sql`
- `20260323100000_add_address_fields_to_profiles.sql`
- `20260323100100_add_address_number_to_profiles.sql`
- `20260323110000_add_address_detail_to_accommodations.sql`
- `20260325140000_add_checkout_notes_to_assignments.sql`
- `20260327000000_add_consumptions_table.sql`

**Prefijos comunes:**
- `add_*` - Añadir columna/tabla
- `alter_*` - Modificar estructura
- `rename_*` - Renombrar
- `drop_*` - Eliminar (raro, documentar bien)

## 🟡 Data

Migraciones de datos: backfills, limpieza, normalización.

**Archivos actuales:**
- `20260325150000_remove_status_from_assignments.sql`
- `20260325150100_remove_status_from_rooms.sql`

**Prefijos comunes:**
- `backfill_*` - Rellenar datos en columnas nuevas
- `migrate_*` - Migrar datos entre tablas
- `cleanup_*` - Limpiar datos obsoletos
- `normalize_*` - Normalizar datos

## 🔴 Security

Cambios de seguridad: RLS, constraints, permisos.

**Archivos actuales:**
- `20260327000001_add_no_overlap_constraint.sql`

**Prefijos comunes:**
- `add_rls_*` - Añadir políticas RLS
- `add_constraint_*` - Añadir constraints
- `revoke_*` / `grant_*` - Permisos

## 🟣 Performance

Optimizaciones: índices, vistas materializadas, funciones.

**Archivos actuales:**
- `20260326000001_add_performance_indexes.sql`
- `20260326000002_add_materialized_views.sql`
- `20260326000003_add_helper_functions.sql`

**Prefijos comunes:**
- `add_index_*` - Añadir índices
- `add_materialized_view_*` - Vistas materializadas
- `add_helper_functions_*` - Funciones de optimización

## 📝 Convención de Nombres

```
YYYYMMDDHHMMSS_descripcion_semantica.sql
```

**Ejemplo:** `20260327143000_add_consumptions_table.sql`

## 🚀 Aplicar Migraciones

### Desarrollo Local
```bash
supabase db reset
```

### Staging/Producción
```bash
supabase db push
```

## 📖 Documentación Completa

Ver `docs/MIGRATION_GUIDE.md` para guía completa de creación de migraciones.
