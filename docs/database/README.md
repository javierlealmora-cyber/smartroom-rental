# Documentación de Base de Datos

Documentación técnica de la base de datos PostgreSQL del sistema SmartRoom Rental.

---

## 📁 Estructura

```
database/
├── README.md              # Este archivo
├── MIGRATION-RULES.md     # Reglas para crear migraciones
└── MIGRATION-INDEX.md     # Índice de todas las migraciones
```

---

## 🗄️ Arquitectura de Base de Datos

### Tecnología
- **Motor:** PostgreSQL 17
- **Plataforma:** Supabase
- **Project ID:** lqwyyyttjamirccdtlvl
- **Extensiones:** btree_gist, uuid-ossp, pg_cron

### Patrón Multi-Tenant
Todas las tablas principales incluyen `client_account_id` para aislamiento de datos.

**RLS (Row Level Security):** Habilitado en todas las tablas con políticas por tenant.

---

## 📊 Esquema Actual

### Tablas Core (19 tablas)

#### Gestión de Tenants
1. **plans_catalog** - Catálogo de planes de suscripción
2. **client_accounts** - Cuentas de cliente (tenants)
3. **profiles** - Perfiles de usuario (auth.users)
4. **entities** - Entidades fiscales (payer/owner)

#### Alojamientos
5. **accommodations** - Alojamientos/propiedades
6. **rooms** - Habitaciones
7. **lodgers** - Inquilinos
8. **lodger_room_assignments** - Asignaciones habitación-inquilino

#### Servicios
9. **services_catalog** - Catálogo de servicios
10. **accommodation_services** - Servicios por alojamiento
11. **lodger_services** - Servicios consumidos por inquilino

#### Energía y Facturación
12. **energy_bills** - Facturas de energía
13. **energy_readings** - Lecturas de contadores
14. **energy_settlements** - Liquidaciones de energía
15. **consumptions** - Consumos reales (agua, luz, gas)
16. **bulletins** - Boletines para inquilinos

#### Sistema
17. **audit_log** - Registro de auditoría
18. **incidents** - Sistema de incidencias
19. **stripe_events** - Webhooks de Stripe

### Vistas

#### Vistas Normales
- **v_active_assignments** - Asignaciones activas con datos relacionados
- **payer_entities_view** - Vista de entidades pagadoras
- **owner_entities_view** - Vista de entidades propietarias

#### Vistas Materializadas
- **mv_occupancy_stats** - Estadísticas de ocupación pre-calculadas

### Funciones SQL

#### Lógica de Negocio
- **get_room_derived_status(room_id)** - Calcula estado real de habitación
- **generate_monthly_billing()** - Genera billing mensual automático
- **refresh_occupancy_stats()** - Refresca vista materializada

#### Helpers
- **update_updated_at_column()** - Trigger function para updated_at

### Triggers
- **updated_at** en 15 tablas
- **validate_room_assignment** - Validaciones pre-insert/update

### Constraints Críticos
- **no_overlapping_assignments** - Previene doble asignación de habitaciones (EXCLUDE constraint)

---

## 🔄 Migraciones SQL

### Ubicación
```
supabase/migrations/
├── baseline/          # Punto cero (inmutable)
├── schema/            # Cambios de estructura
├── data/              # Migraciones de datos
├── security/          # RLS y constraints
└── performance/       # Índices y optimizaciones
```

### Herramientas
```bash
# Crear migración
./supabase/scripts/development/create-migration.sh [tipo] "descripcion"

# Aplicar en local
supabase db reset

# Aplicar en remoto
supabase db push
```

### Documentación
- **Reglas:** `MIGRATION-RULES.md`
- **Índice completo:** `MIGRATION-INDEX.md`
- **Guía técnica:** `supabase/docs/MIGRATION_GUIDE.md`

---

## 🔒 Seguridad

### Row Level Security (RLS)
**Estado:** Habilitado en todas las tablas

**Patrón estándar:**
```sql
-- Lectura
CREATE POLICY "table_select_by_tenant"
ON table_name FOR SELECT TO authenticated
USING (client_account_id = get_my_client_account_id());

-- Escritura
CREATE POLICY "table_insert_by_tenant"
ON table_name FOR INSERT TO authenticated
WITH CHECK (client_account_id = get_my_client_account_id());
```

**Total políticas:** 67 políticas RLS activas

### Roles
- **authenticated** - Usuarios autenticados
- **anon** - Acceso público (muy limitado)
- **service_role** - Backend/Edge Functions

---

## 📈 Performance

### Índices
**Total:** ~50 índices optimizados

**Tipos:**
- Índices simples en foreign keys
- Índices compuestos para queries frecuentes
- Índices parciales (WHERE clause)
- Índices GIN para búsqueda full-text
- Índices GiST para rangos de fechas

### Vistas Materializadas
- **mv_occupancy_stats** - Refrescada cada hora vía cron

### Cron Jobs
```sql
-- Refrescar estadísticas (cada hora)
SELECT cron.schedule('refresh-occupancy-stats', '0 * * * *', 
  $$SELECT refresh_occupancy_stats()$$);

-- Generar billing (día 1 de cada mes)
SELECT cron.schedule('generate-monthly-billing', '0 0 1 * *', 
  $$SELECT generate_monthly_billing()$$);
```

---

## 🔗 Relación con Requisitos

Cada tabla/función/constraint debe estar documentada en:
1. **Requisito funcional** (`docs/requirements/current/REQ-XXX.md`)
2. **Migración SQL** (`supabase/migrations/`)
3. **Índice de migraciones** (`MIGRATION-INDEX.md`)
4. **Matriz de trazabilidad** (`docs/qa/TRACEABILITY-MATRIX.md`)

---

## 📝 Convenciones

### Nombres de Tablas
- Plural en inglés: `lodgers`, `rooms`, `assignments`
- Snake_case: `lodger_room_assignments`

### Nombres de Columnas
- Snake_case: `client_account_id`, `move_in_date`
- Sufijos estándar:
  - `_id` para foreign keys
  - `_at` para timestamps
  - `_date` para dates
  - `_amount` para decimales monetarios

### Nombres de Constraints
- Primary key: `table_name_pkey`
- Foreign key: `table_name_column_fkey`
- Check: `table_name_column_check`
- Unique: `table_name_column_key`
- Exclude: `descriptive_name` (ej: `no_overlapping_assignments`)

### Nombres de Índices
- `idx_table_column` para índices simples
- `idx_table_col1_col2` para índices compuestos
- Sufijo `_partial` si es parcial

---

## 🚀 Inicio Rápido

### Consultar Esquema Actual
```sql
-- Listar tablas
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Ver estructura de tabla
\d table_name

-- Ver políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'table_name';

-- Ver índices
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename = 'table_name';
```

### Crear Nueva Migración
```bash
# 1. Decidir tipo (schema/data/security/performance)
# 2. Crear archivo
./supabase/scripts/development/create-migration.sh schema "add_new_column"

# 3. Editar migración
# 4. Probar en local
supabase db reset

# 5. Documentar en MIGRATION-INDEX.md
# 6. Vincular con REQ/CHG en matriz
```

### Backup y Restore
```bash
# Backup
./supabase/scripts/maintenance/backup-database.sh

# Restore
./supabase/scripts/maintenance/restore-database.sh [backup-file]
```

---

## 📚 Referencias

- **Migraciones:** `supabase/migrations/README.md`
- **Reglas de migraciones:** `MIGRATION-RULES.md`
- **Índice de migraciones:** `MIGRATION-INDEX.md`
- **Guía técnica Supabase:** `supabase/docs/MIGRATION_GUIDE.md`
- **Proceso de deployment:** `supabase/docs/DEPLOYMENT_PROCESS.md`

---

## 🔍 Herramientas de Análisis

### Supabase Dashboard
- **URL:** https://supabase.com/dashboard/project/lqwyyyttjamirccdtlvl
- **SQL Editor:** Para queries ad-hoc
- **Table Editor:** Para ver datos
- **Database:** Para ver esquema

### CLI Local
```bash
# Conectar a DB local
supabase db connect

# Ver migraciones aplicadas
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC;

# Analizar performance
EXPLAIN ANALYZE SELECT ...;
```

---

## ⚠️ Consideraciones Importantes

### Inmutabilidad del Baseline
Los archivos en `supabase/migrations/baseline/` son **inmutables**.
Nunca modificar, solo añadir nuevas migraciones.

### Multi-Tenancy
Toda nueva tabla debe incluir:
- Columna `client_account_id UUID NOT NULL`
- Foreign key a `client_accounts(id)`
- RLS habilitado
- Políticas RLS por tenant

### Idempotencia
Todas las migraciones deben ser idempotentes:
```sql
CREATE TABLE IF NOT EXISTS ...
ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...
CREATE INDEX IF NOT EXISTS ...
```

---

**Última actualización:** 2026-03-28  
**Versión del esquema:** Baseline + 12 migraciones
