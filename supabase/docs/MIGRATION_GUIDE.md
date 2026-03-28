# Guía de Migraciones SQL

## 📋 Crear Nueva Migración

### 1. Usar Script Helper
```bash
./scripts/development/create-migration.sh schema "add_new_column"
```

### 2. Estructura de Archivo

```sql
-- ============================================================================
-- MIGRACIÓN: [Título descriptivo]
-- Fecha: YYYY-MM-DD
-- Tipo: [Schema|Data|Security|Performance]
-- Descripción: [Descripción detallada]
-- ============================================================================

-- PARTE 1: VALIDACIONES PRE-MIGRACIÓN
DO $$
BEGIN
  IF EXISTS (...) THEN
    RAISE NOTICE 'Ya existe, saltando';
    RETURN;
  END IF;
END $$;

-- PARTE 2: CAMBIOS DE ESTRUCTURA
ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...;

-- PARTE 3: MIGRACIÓN DE DATOS (si aplica)
UPDATE ... SET ... WHERE ...;

-- PARTE 4: CONSTRAINTS
ALTER TABLE ... ADD CONSTRAINT ...;

-- PARTE 5: ÍNDICES
CREATE INDEX IF NOT EXISTS ...;

-- PARTE 6: SEGURIDAD (RLS)
CREATE POLICY ... ON ... FOR SELECT ...;

-- PARTE 7: COMENTARIOS
COMMENT ON TABLE ... IS '...';
```

## 🎯 Tipos de Migraciones

### Schema (migrations/schema/)
Cambios de estructura: tablas, columnas, tipos.

**Prefijos:**
- `add_*` - Añadir columna/tabla
- `alter_*` - Modificar estructura
- `rename_*` - Renombrar
- `drop_*` - Eliminar

### Data (migrations/data/)
Migraciones de datos: backfills, limpieza.

**Prefijos:**
- `backfill_*` - Rellenar datos
- `migrate_*` - Migrar entre tablas
- `cleanup_*` - Limpiar obsoletos

### Security (migrations/security/)
Seguridad: RLS, constraints, permisos.

**Prefijos:**
- `add_rls_*` - Políticas RLS
- `add_constraint_*` - Constraints

### Performance (migrations/performance/)
Optimizaciones: índices, vistas, funciones.

**Prefijos:**
- `add_index_*` - Índices
- `add_materialized_view_*` - Vistas materializadas

## ✅ Checklist Pre-Deployment

- [ ] Migración es idempotente (puede ejecutarse múltiples veces)
- [ ] Usa `IF NOT EXISTS` / `IF EXISTS`
- [ ] Incluye comentarios explicativos
- [ ] Probada en local con `supabase db reset`
- [ ] No contiene secretos ni datos sensibles
- [ ] Sigue convención de nombres
- [ ] Documentada en commit message

## 🚀 Aplicar Migraciones

### Local
```bash
supabase db reset
```

### Staging/Producción
```bash
# Backup primero
./scripts/maintenance/backup-database.sh

# Aplicar migraciones
supabase db push
```

## 🔄 Rollback

Si una migración falla:

1. Restaurar desde backup
2. Corregir migración
3. Volver a aplicar

## 📝 Mejores Prácticas

1. **Una migración = un cambio lógico**
2. **Siempre idempotente**
3. **Probar en local primero**
4. **Backup antes de producción**
5. **Documentar cambios complejos**
