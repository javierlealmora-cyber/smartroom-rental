# 🗄️ FASE 6: Database Migrations System

**Objetivo**: Sistema profesional de gestión de migraciones SQL para Supabase con idempotencia, seeds de datos y CI/CD.

---

## 📋 Estructura del Sistema

```
supabase/
├── migrations/                    # Migraciones SQL versionadas
│   ├── 20260122_fix_rls_recursion.sql
│   ├── 20260301000000_create_accommodations_rooms_lodgers.sql
│   └── ...
├── seeds/                         # Seeds de datos por ambiente
│   ├── development/               # Datos para desarrollo
│   │   ├── 01_companies.sql
│   │   ├── 02_profiles.sql
│   │   ├── 03_accommodations.sql
│   │   └── README.md
│   ├── staging/                   # Datos para staging
│   │   ├── 01_companies.sql
│   │   └── README.md
│   └── production/                # Seeds mínimos para producción
│       └── README.md
├── scripts/                       # Scripts de utilidad
│   ├── apply-migration.sh         # Aplicar una migración
│   ├── create-migration.sh        # Crear nueva migración
│   ├── seed-database.sh           # Aplicar seeds
│   └── validate-migrations.sh     # Validar sintaxis SQL
└── config.toml                    # Configuración de Supabase
```

---

## 🎯 Convenciones de Naming

### Migraciones
```
YYYYMMDDHHMMSS_descripcion_corta.sql
```

**Ejemplos**:
- `20260301000000_create_accommodations_rooms_lodgers.sql`
- `20260305120000_add_payment_methods.sql`
- `20260310150000_alter_profiles_add_timezone.sql`

### Seeds
```
NN_nombre_tabla.sql
```

**Ejemplos**:
- `01_companies.sql`
- `02_profiles.sql`
- `03_accommodations.sql`

---

## ✅ Principios de Idempotencia

Todas las migraciones deben ser **idempotentes** (ejecutables múltiples veces sin errores):

### ✅ Crear Tablas
```sql
CREATE TABLE IF NOT EXISTS public.my_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);
```

### ✅ Agregar Columnas
```sql
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'my_table' AND column_name = 'new_column'
  ) THEN
    ALTER TABLE public.my_table ADD COLUMN new_column text;
  END IF;
END $$;
```

### ✅ Crear Índices
```sql
CREATE INDEX IF NOT EXISTS idx_my_table_name ON public.my_table (name);
```

### ✅ Crear Triggers
```sql
DROP TRIGGER IF EXISTS update_my_table_updated_at ON public.my_table;
CREATE TRIGGER update_my_table_updated_at
  BEFORE UPDATE ON public.my_table
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
```

### ✅ Crear Funciones
```sql
CREATE OR REPLACE FUNCTION public.my_function()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Function body
END;
$$;
```

### ✅ Políticas RLS
```sql
DROP POLICY IF EXISTS "policy_name" ON public.my_table;
CREATE POLICY "policy_name"
  ON public.my_table
  FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 📝 Template de Migración

```sql
-- ============================================================================
-- MIGRATION: [Descripción breve]
-- Fecha: YYYY-MM-DD
-- Descripción: [Descripción detallada de los cambios]
-- ============================================================================

-- ============================================================================
-- PASO 1: [Nombre del paso]
-- ============================================================================
-- Descripción de lo que hace este paso

-- SQL idempotente aquí

-- ============================================================================
-- PASO 2: [Siguiente paso]
-- ============================================================================
-- Descripción

-- SQL idempotente aquí

-- ============================================================================
-- PASO 3: Índices
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_table_column ON public.table (column);

-- ============================================================================
-- PASO 4: Triggers
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_name ON public.table;
CREATE TRIGGER trigger_name
  BEFORE UPDATE ON public.table
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PASO 5: RLS Policies
-- ============================================================================
ALTER TABLE public.table ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policy_name" ON public.table;
CREATE POLICY "policy_name"
  ON public.table
  FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================================
-- PASO 6: Comentarios (Documentación)
-- ============================================================================
COMMENT ON TABLE public.table IS 'Descripción de la tabla';
COMMENT ON COLUMN public.table.column IS 'Descripción de la columna';
```

---

## 🌱 Seeds de Datos

### Development Seeds
Datos completos para desarrollo local:
- Empresas de ejemplo
- Usuarios de prueba (todos los roles)
- Alojamientos de ejemplo
- Habitaciones y inquilinos
- Datos de consumos

### Staging Seeds
Datos similares a producción pero anonimizados:
- Empresas de prueba
- Usuarios de prueba
- Datos representativos

### Production Seeds
Solo datos esenciales:
- Configuraciones del sistema
- Catálogos de referencia
- Datos maestros

---

## 🔄 Workflow de Migraciones

### 1. Crear Nueva Migración

```bash
# Usando script
./supabase/scripts/create-migration.sh "add_payment_methods"

# Manual
# Crear archivo: supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql
```

### 2. Escribir SQL Idempotente

Seguir el template y principios de idempotencia.

### 3. Validar Localmente

```bash
# Validar sintaxis
./supabase/scripts/validate-migrations.sh

# Aplicar en desarrollo
supabase db reset
```

### 4. Commit y Push

```bash
git add supabase/migrations/
git commit -m "feat(db): add payment methods table"
git push
```

### 5. CI/CD Valida Automáticamente

El workflow `pr-checks.yml` valida:
- ✅ Sintaxis SQL correcta
- ✅ Migraciones idempotentes
- ✅ No hay conflictos

### 6. Merge a Develop

Migración se aplica automáticamente en desarrollo.

### 7. Aplicar en Development

```bash
npm run migrate:dev
# Confirmar Project ID: lopdwrsmkmtboeczxotj
```

### 8. Validación Post-Deploy en Development

```bash
npm run validate:dev
```

**Checklist de validación**:
- ✅ Migraciones aplicadas sin errores
- ✅ Estructura de tablas correcta
- ✅ Políticas RLS funcionando
- ✅ Seeds aplicados correctamente
- ✅ Tests pasando

**Si la validación falla**: Ejecutar `npm run rollback:dev`

### 9. Deploy a Staging

Solo después de validar exitosamente en development:

```bash
npm run migrate:staging
# Confirmar Project ID: lqwyyyttjamirccdtlvl
```

### 10. Validación Post-Deploy en Staging

```bash
npm run validate:staging
```

**Monitorear por 24-48 horas antes de ir a producción.**

**Si la validación falla**: Ejecutar `npm run rollback:staging`

### 11. Deploy a Production

Solo después de validar exitosamente en staging:

```bash
npm run migrate:prod
# Confirmar Project ID: [PRODUCTION_PROJECT_ID]
```

### 12. Validación Post-Deploy en Production

```bash
npm run validate:prod
```

**Monitoreo activo por al menos 1 hora.**

**Si la validación falla**: Ejecutar `npm run rollback:prod` INMEDIATAMENTE

---

## 🔍 Validación de Migraciones

### Checks Automáticos

1. **Sintaxis SQL**: `pg_format` valida sintaxis
2. **Idempotencia**: Verificar uso de `IF NOT EXISTS`, `IF EXISTS`, etc.
3. **Naming Convention**: Formato `YYYYMMDDHHMMSS_descripcion.sql`
4. **No DROP sin IF EXISTS**: Evitar errores en re-ejecución
5. **Comentarios**: Documentación adecuada

### Validación Manual

```bash
# Aplicar migración en DB de prueba
supabase db reset

# Aplicar de nuevo (debe ser idempotente)
supabase db reset

# Verificar que no hay errores
```

---

## 🚀 Aplicar Migraciones

### Desarrollo (Automático)

```bash
# Reset completo (borra todo y aplica todas las migraciones)
supabase db reset

# Aplicar solo nuevas migraciones
supabase migration up
```

### Staging/Production (Manual con Aprobación)

```bash
# 1. Backup de la base de datos
supabase db dump > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Aplicar migración
supabase db push

# 3. Verificar
supabase db diff

# 4. Rollback si es necesario
psql < backup_YYYYMMDD_HHMMSS.sql
```

---

## 📊 Tracking de Migraciones

Supabase mantiene un registro automático en la tabla `supabase_migrations.schema_migrations`:

```sql
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC;
```

Cada migración aplicada se registra con:
- `version`: Timestamp de la migración
- `name`: Nombre del archivo
- `statements`: SQL ejecutado

---

## 🔐 Seguridad

### Principios

1. **Nunca incluir datos sensibles** en migraciones
2. **Usar variables de entorno** para secrets
3. **Validar permisos RLS** en cada tabla
4. **Auditar cambios** en producción
5. **Backup antes de aplicar** en staging/production

### RLS (Row Level Security)

Todas las tablas deben tener RLS habilitado:

```sql
ALTER TABLE public.my_table ENABLE ROW LEVEL SECURITY;

-- Política de ejemplo
CREATE POLICY "users_can_read_own_data"
  ON public.my_table
  FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 📈 Mejores Prácticas

### ✅ DO

- ✅ Usar `IF NOT EXISTS` y `IF EXISTS`
- ✅ Crear índices para foreign keys
- ✅ Documentar con comentarios SQL
- ✅ Validar localmente antes de commit
- ✅ Hacer migraciones pequeñas y atómicas
- ✅ Incluir rollback plan en comentarios
- ✅ Usar transacciones cuando sea posible
- ✅ Testear en desarrollo primero

### ❌ DON'T

- ❌ No usar `DROP TABLE` sin `IF EXISTS`
- ❌ No incluir datos sensibles
- ❌ No hacer cambios destructivos sin backup
- ❌ No modificar migraciones ya aplicadas
- ❌ No omitir validación de sintaxis
- ❌ No aplicar directamente en producción
- ❌ No ignorar errores de RLS

---

## 🛠️ Scripts de Utilidad

### create-migration.sh
Crea una nueva migración con el formato correcto.

### apply-migration.sh
Aplica una migración específica.

### seed-database.sh
Aplica seeds de datos según el ambiente.

### validate-migrations.sh
Valida sintaxis SQL de todas las migraciones.

---

## 📚 Recursos

- [Supabase Migrations Docs](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

## 🎯 Checklist de Migración

Antes de hacer merge de una migración:

- [ ] Sintaxis SQL validada
- [ ] Migración es idempotente
- [ ] Naming convention correcta
- [ ] Comentarios y documentación incluidos
- [ ] Índices creados para foreign keys
- [ ] RLS policies definidas
- [ ] Triggers de `updated_at` configurados
- [ ] Testada localmente con `supabase db reset`
- [ ] Re-ejecutada para verificar idempotencia
- [ ] Rollback plan documentado

---

## � Rollback Obligatorio

### Regla Crítica

> **"Si no puedes hacer rollback, no puedes hacer deploy"**

TODO deployment DEBE tener un plan de rollback definido y probado ANTES de aplicar.

### Tipos de Rollback

1. **Rollback Solo BBDD**: `npm run rollback:[ambiente]`
2. **Rollback Completo (Código + BBDD)**: `npm run rollback:full:[ambiente]`

### Proceso de Rollback

```bash
# 1. Detectar problema durante validación
npm run validate:[ambiente]
# Responder: NO (para iniciar rollback)

# 2. Ejecutar rollback completo
npm run rollback:full:[ambiente]
# Confirmar escribiendo: ROLLBACK

# 3. Verificar que rollback fue exitoso
npm run validate:[ambiente]
```

### Checklist Pre-Deployment

Antes de ANY deployment a staging/production:

- [ ] **Migración de rollback creada** (si aplica cambios en BBDD)
- [ ] **🔴 CRÍTICO: Backup de DATOS exportado** (si migración es destructiva)
- [ ] **INSERT statements incluidos en rollback** (para restaurar datos exactos)
- [ ] **Rollback testeado en development CON DATOS**
- [ ] **Backup de BBDD completo creado**
- [ ] **Deployment ID anterior identificado**
- [ ] **Criterios de KO/OK documentados**
- [ ] **Plan de rollback documentado**

### 🔴 Proceso para Migraciones Destructivas

**Si tu migración incluye DROP TABLE, DROP COLUMN, o TRUNCATE:**

#### 1. Exportar Datos ANTES de la Migración

```bash
# Exportar estructura de la tabla
npx supabase db dump --project-id [PROJECT_ID] --schema public --table [TABLA] > backup_[tabla]_structure.sql

# Exportar DATOS de la tabla
npx supabase db dump --project-id [PROJECT_ID] --data-only --schema public --table [TABLA] > backup_[tabla]_data.sql
```

#### 2. Generar Rollback con Datos

```bash
# Opción 1: Usar generador automático
node scripts/generate-rollback-with-data.js [env] [tabla]

# Opción 2: Manual
# - Copiar estructura de backup_[tabla]_structure.sql
# - Copiar INSERT statements de backup_[tabla]_data.sql
# - Crear migración de rollback que incluya AMBOS
```

#### 3. Verificar Rollback Completo

La migración de rollback DEBE incluir:
- ✅ CREATE TABLE (estructura)
- ✅ INSERT statements (TODOS los datos existentes)
- ✅ CREATE INDEX (índices)
- ✅ ALTER TABLE (constraints)
- ✅ CREATE POLICY (políticas RLS)
- ✅ Verificación de cantidad de registros

#### 4. Testear Rollback en Development

```bash
# Aplicar migración destructiva
npm run migrate:dev

# Aplicar rollback
npm run rollback:dev

# Verificar que los datos están EXACTAMENTE igual
SELECT COUNT(*) FROM [tabla];
SELECT * FROM [tabla] LIMIT 10;
```

Ver documentación completa: `.windsurf/ROLLBACK-POLICY.md`

---

## �� Próximos Pasos

1. ✅ Crear seeds de datos para desarrollo
2. ✅ Configurar CI/CD para validación automática
3. ✅ Documentar proceso de rollback
4. ✅ Crear scripts de utilidad
5. Implementar backup automático antes de migraciones
