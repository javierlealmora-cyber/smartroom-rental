# Reglas de Migraciones SQL

Reglas y mejores prácticas para crear migraciones SQL en SmartRoom Rental.

---

## 🎯 Principios Fundamentales

### 1. Idempotencia
Toda migración debe poder ejecutarse múltiples veces sin errores.

```sql
-- ✅ BIEN
CREATE TABLE IF NOT EXISTS table_name (...);
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name TYPE;

-- ❌ MAL
CREATE TABLE table_name (...);
ALTER TABLE table_name ADD COLUMN column_name TYPE;
```

### 2. Inmutabilidad del Baseline
Los archivos en `supabase/migrations/baseline/` son **inmutables**.
- Nunca modificar
- Solo añadir nuevas migraciones incrementales

### 3. Versionado Estricto
Usar timestamp como versión: `YYYYMMDDHHMMSS_descripcion.sql`

### 4. Separación por Tipo
Organizar migraciones en subdirectorios según su propósito:
- `baseline/` - Punto cero (inmutable)
- `schema/` - Cambios de estructura
- `data/` - Migraciones de datos
- `security/` - RLS y constraints
- `performance/` - Índices y optimizaciones

---

## ✅ QUÉ SÍ PUEDE IR EN MIGRACIONES

### Estructura de Base de Datos
- ✅ CREATE/ALTER/DROP TABLE
- ✅ ADD/DROP/ALTER COLUMN
- ✅ PRIMARY KEY, FOREIGN KEY, UNIQUE
- ✅ CHECK CONSTRAINTS
- ✅ NOT NULL CONSTRAINTS
- ✅ EXCLUDE CONSTRAINTS
- ✅ DEFAULT VALUES

### Índices y Performance
- ✅ CREATE INDEX (normal, compuesto, único, parcial)
- ✅ CREATE INDEX USING GIN/GiST
- ✅ CLUSTER, ANALYZE

### Tipos y Esquemas
- ✅ CREATE TYPE (ENUM, COMPOSITE)
- ✅ CREATE SCHEMA
- ✅ CREATE EXTENSION

### Vistas y Funciones
- ✅ CREATE VIEW
- ✅ CREATE MATERIALIZED VIEW
- ✅ CREATE FUNCTION (SQL/plpgsql)
- ✅ CREATE TRIGGER
- ✅ CREATE PROCEDURE

### Seguridad
- ✅ ENABLE ROW LEVEL SECURITY
- ✅ CREATE POLICY / ALTER POLICY
- ✅ GRANT / REVOKE (roles del sistema)

### Datos Maestros Estables
- ✅ Catálogos del sistema (planes, estados, tipos)
- ✅ Configuración base de la aplicación
- ✅ Datos de referencia inmutables

### Migraciones de Datos
- ✅ UPDATE para backfill de columnas nuevas
- ✅ INSERT para normalización de datos
- ✅ DELETE para cleanup de datos obsoletos

---

## ❌ QUÉ NO PUEDE IR EN MIGRACIONES

### Secretos y Credenciales
- ❌ Passwords
- ❌ API Keys
- ❌ OAuth Client Secrets
- ❌ Tokens de autenticación
- ❌ Claves de cifrado

### Configuración de Entorno
- ❌ URLs específicas de entorno (dev/staging/prod)
- ❌ Variables de entorno
- ❌ Configuración de SMTP
- ❌ Feature flags específicos de entorno

### Datos de Clientes
- ❌ Datos reales de usuarios
- ❌ Datos de producción
- ❌ Información personal (PII)

### Scripts Temporales
- ❌ Queries de debugging
- ❌ Análisis ad-hoc
- ❌ Scripts de un solo uso

---

## 📝 Estructura de una Migración

```sql
-- ============================================================================
-- MIGRACIÓN: [Título descriptivo]
-- Fecha: YYYY-MM-DD
-- Tipo: [Schema|Data|Security|Performance]
-- REQ/CHG: [REQ-XXX o CHG-YYYY-MM-DD-xxx]
-- Issue: [#123 o N/A]
-- Descripción: [Descripción detallada del cambio]
-- ============================================================================

-- ============================================================================
-- PARTE 1: VALIDACIONES PRE-MIGRACIÓN
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'table' AND column_name = 'column'
  ) THEN
    RAISE NOTICE 'La columna ya existe, saltando migración';
    RETURN;
  END IF;
END $$;

-- ============================================================================
-- PARTE 2: CAMBIOS DE ESTRUCTURA
-- ============================================================================

-- Añadir columnas (sin constraints aún)
ALTER TABLE table_name
ADD COLUMN IF NOT EXISTS column_name TYPE;

-- Crear tablas nuevas
CREATE TABLE IF NOT EXISTS new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id UUID NOT NULL REFERENCES client_accounts(id),
  -- ... más columnas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PARTE 3: MIGRACIÓN DE DATOS (BACKFILL)
-- ============================================================================

-- Rellenar datos en columnas nuevas
UPDATE table_name
SET column_name = valor
WHERE condition;

-- ============================================================================
-- PARTE 4: CONSTRAINTS Y VALIDACIONES
-- ============================================================================

-- Añadir constraints después del backfill
ALTER TABLE table_name
ADD CONSTRAINT constraint_name CHECK (condition);

-- Añadir NOT NULL después de verificar datos
ALTER TABLE table_name
ALTER COLUMN column_name SET NOT NULL;

-- ============================================================================
-- PARTE 5: ÍNDICES
-- ============================================================================

-- Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_name 
ON table_name(column_name);

-- Índices compuestos
CREATE INDEX IF NOT EXISTS idx_table_col1_col2
ON table_name(col1, col2);

-- ============================================================================
-- PARTE 6: SEGURIDAD (RLS)
-- ============================================================================

-- Habilitar RLS si es tabla nueva
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "table_select_by_tenant"
ON table_name FOR SELECT TO authenticated
USING (client_account_id = get_my_client_account_id());

CREATE POLICY "table_insert_by_tenant"
ON table_name FOR INSERT TO authenticated
WITH CHECK (client_account_id = get_my_client_account_id());

-- ============================================================================
-- PARTE 7: TRIGGERS
-- ============================================================================

-- Trigger para updated_at
CREATE TRIGGER set_table_updated_at
BEFORE UPDATE ON table_name
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PARTE 8: COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE table_name IS 'Descripción de la tabla';
COMMENT ON COLUMN table_name.column_name IS 'Descripción de la columna';

-- ============================================================================
-- PARTE 9: VERIFICACIÓN POST-MIGRACIÓN
-- ============================================================================

DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM table_name WHERE condition) > 0,
    'Error: No se encontraron datos esperados';
END $$;
```

---

## 🔄 Orden de Ejecución Interno

1. **Validaciones** - Verificar si ya existe
2. **Estructura** - Crear/modificar tablas y columnas
3. **Datos** - Backfill y migraciones de datos
4. **Constraints** - Añadir restricciones
5. **Índices** - Optimizar queries
6. **Seguridad** - RLS y políticas
7. **Triggers** - Automatizaciones
8. **Comentarios** - Documentación inline
9. **Verificación** - Validar resultado

---

## 🎨 Convenciones de Nomenclatura

### Archivos de Migración
```
YYYYMMDDHHMMSS_descripcion_semantica.sql

Ejemplos:
20260328143000_add_consumptions_table.sql
20260328143100_add_consumption_indexes.sql
20260328150000_backfill_lodger_status.sql
```

### Tablas
- Plural en inglés: `lodgers`, `rooms`
- Snake_case: `lodger_room_assignments`
- Incluir `client_account_id` para multi-tenancy

### Columnas
- Snake_case: `move_in_date`, `monthly_rent`
- Sufijos estándar:
  - `_id` para foreign keys
  - `_at` para timestamps
  - `_date` para dates
  - `_amount` para decimales monetarios
  - `_status` para estados

### Constraints
- Primary key: `table_name_pkey` (automático)
- Foreign key: `table_name_column_fkey` (automático)
- Check: `table_name_column_check`
- Unique: `table_name_column_key`
- Exclude: nombre descriptivo (ej: `no_overlapping_assignments`)

### Índices
- Simple: `idx_table_column`
- Compuesto: `idx_table_col1_col2`
- Parcial: `idx_table_column_partial`
- Único: `idx_table_column_unique`

### Políticas RLS
```
table_select_by_tenant
table_insert_by_tenant
table_update_by_tenant
table_delete_by_tenant
```

---

## 🔒 Reglas de Seguridad Multi-Tenant

### Toda Tabla Nueva Debe Incluir

```sql
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ✅ OBLIGATORIO: Multi-tenancy
  client_account_id UUID NOT NULL REFERENCES client_accounts(id) ON DELETE CASCADE,
  
  -- ... otras columnas
  
  -- ✅ OBLIGATORIO: Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ✅ OBLIGATORIO: RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- ✅ OBLIGATORIO: Políticas por tenant
CREATE POLICY "new_table_select_by_tenant"
ON new_table FOR SELECT TO authenticated
USING (client_account_id = (
  SELECT client_account_id FROM profiles WHERE id = auth.uid()
));

-- Repetir para INSERT, UPDATE, DELETE

-- ✅ OBLIGATORIO: Trigger updated_at
CREATE TRIGGER set_new_table_updated_at
BEFORE UPDATE ON new_table
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ✅ OBLIGATORIO: Índice en client_account_id
CREATE INDEX idx_new_table_tenant 
ON new_table(client_account_id);
```

---

## 📊 Tipos de Migraciones por Carpeta

### baseline/
**Propósito:** Punto cero inmutable del sistema

**Contenido:**
- Extensiones PostgreSQL
- Esquema completo inicial
- Funciones base
- Políticas RLS iniciales
- Triggers base
- Índices iniciales
- Storage buckets

**Regla:** NUNCA modificar

### schema/
**Propósito:** Cambios de estructura

**Contenido:**
- CREATE/ALTER/DROP TABLE
- ADD/DROP/RENAME COLUMN
- CREATE TYPE
- Cambios de estructura

**Prefijos:**
- `add_*` - Añadir
- `alter_*` - Modificar
- `rename_*` - Renombrar
- `drop_*` - Eliminar

### data/
**Propósito:** Migraciones de datos

**Contenido:**
- UPDATE para backfill
- INSERT para normalización
- DELETE para cleanup
- Transformaciones de datos

**Prefijos:**
- `backfill_*`
- `migrate_*`
- `cleanup_*`
- `normalize_*`

### security/
**Propósito:** Seguridad y constraints

**Contenido:**
- CREATE/ALTER POLICY
- GRANT/REVOKE
- Constraints complejos
- Validaciones

**Prefijos:**
- `add_rls_*`
- `add_constraint_*`
- `update_policy_*`

### performance/
**Propósito:** Optimizaciones

**Contenido:**
- CREATE INDEX
- CREATE MATERIALIZED VIEW
- Funciones de optimización
- ANALYZE, CLUSTER

**Prefijos:**
- `add_index_*`
- `add_materialized_view_*`
- `optimize_*`

---

## ✅ Checklist Pre-Commit

Antes de commitear una migración:

- [ ] Archivo en carpeta correcta (schema/data/security/performance)
- [ ] Nombre sigue convención YYYYMMDDHHMMSS_descripcion.sql
- [ ] Header completo con REQ/CHG, Issue, Descripción
- [ ] Migración es idempotente (IF NOT EXISTS, IF EXISTS)
- [ ] Incluye validaciones pre-migración
- [ ] Incluye verificación post-migración
- [ ] Comentarios en SQL para partes complejas
- [ ] Si crea tabla: incluye client_account_id, RLS, políticas, trigger updated_at
- [ ] Si añade columna: considera backfill si es NOT NULL
- [ ] Probada en local con `supabase db reset`
- [ ] Documentada en `docs/database/MIGRATION-INDEX.md`
- [ ] Vinculada en `docs/qa/TRACEABILITY-MATRIX.md`
- [ ] No contiene secretos ni datos sensibles

---

## 🚀 Proceso de Creación

### 1. Crear Archivo
```bash
./supabase/scripts/development/create-migration.sh [tipo] "descripcion"
```

### 2. Editar Migración
Seguir estructura estándar documentada arriba

### 3. Probar en Local
```bash
supabase db reset
```

### 4. Documentar
- Añadir entrada en `MIGRATION-INDEX.md`
- Vincular con REQ/CHG en `TRACEABILITY-MATRIX.md`

### 5. Commit
```bash
git add supabase/migrations/
git commit -m "feat(db): descripción

Refs: #issue-number
Docs: REQ-XXX o CHG-YYYY-MM-DD
Migration: YYYYMMDDHHMMSS_nombre.sql"
```

---

## 🔍 Verificación y Testing

### Verificar Migración Aplicada
```sql
SELECT * FROM supabase_migrations.schema_migrations 
WHERE version = 'YYYYMMDDHHMMSS'
ORDER BY version DESC;
```

### Verificar Estructura
```sql
-- Ver tabla
\d table_name

-- Ver políticas
SELECT * FROM pg_policies WHERE tablename = 'table_name';

-- Ver índices
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename = 'table_name';
```

### Rollback
Si una migración falla:
1. Restaurar desde backup
2. Corregir migración
3. Volver a aplicar

---

## 📚 Referencias

- **Guía técnica:** `supabase/docs/MIGRATION_GUIDE.md`
- **Índice de migraciones:** `MIGRATION-INDEX.md`
- **Proceso de deployment:** `supabase/docs/DEPLOYMENT_PROCESS.md`
- **Reglas de seguridad:** `supabase/docs/SECURITY_RULES.md`

---

**Última actualización:** 2026-03-28
