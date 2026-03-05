# 🔴 Backup de Datos para Migraciones Destructivas

**REGLA CRÍTICA**: Si tu migración elimina datos (DROP TABLE, DROP COLUMN, TRUNCATE), el rollback DEBE incluir los datos existentes, no solo la estructura.

---

## 🎯 Principio Fundamental

> **"El rollback debe restaurar EXACTAMENTE el estado anterior: estructura Y datos"**

Un rollback que solo restaura la estructura pero pierde los datos NO es un rollback válido.

---

## 📋 Tipos de Migraciones que Requieren Backup de Datos

### 🔴 Requieren Backup de Datos

- ❌ `DROP TABLE` - Elimina tabla completa
- ❌ `DROP COLUMN` - Elimina columna y sus datos
- ❌ `TRUNCATE TABLE` - Elimina todos los registros
- ❌ `ALTER TABLE ... DROP CONSTRAINT` - Si afecta datos existentes
- ❌ Cualquier cambio que pueda causar pérdida de datos

### ✅ No Requieren Backup de Datos

- ✅ `CREATE TABLE` - Solo crea estructura
- ✅ `ALTER TABLE ADD COLUMN` - Solo agrega columna
- ✅ `CREATE INDEX` - Solo crea índice
- ✅ `CREATE POLICY` - Solo crea política RLS

---

## 🔄 Proceso Completo: Migración Destructiva con Rollback de Datos

### PASO 1: Antes de Crear la Migración Destructiva

#### 1.1 Identificar Tablas Afectadas

```bash
# Listar tablas que serán modificadas
# Ejemplo: companies, profiles (company_id), client_accounts (company_id)
```

#### 1.2 Exportar Datos de Cada Tabla

```bash
# Para cada tabla afectada:

# Exportar estructura
npx supabase db dump \
  --project-id [PROJECT_ID] \
  --schema public \
  --table [TABLA] \
  > supabase/backups/[tabla]_structure.sql

# Exportar DATOS
npx supabase db dump \
  --project-id [PROJECT_ID] \
  --data-only \
  --schema public \
  --table [TABLA] \
  > supabase/backups/[tabla]_data.sql
```

**Ejemplo real**:
```bash
# Backup de companies
npx supabase db dump --project-id lopdwrsmkmtboeczxotj --schema public --table companies > supabase/backups/companies_structure.sql
npx supabase db dump --project-id lopdwrsmkmtboeczxotj --data-only --schema public --table companies > supabase/backups/companies_data.sql

# Backup de profiles (solo company_id)
npx supabase db dump --project-id lopdwrsmkmtboeczxotj --data-only --schema public --table profiles > supabase/backups/profiles_data.sql
```

#### 1.3 Verificar Backups

```bash
# Verificar que los archivos existen y tienen contenido
ls -lh supabase/backups/

# Verificar cantidad de registros
grep -c "INSERT INTO" supabase/backups/[tabla]_data.sql
```

---

### PASO 2: Crear Migración de Rollback con Datos

#### 2.1 Opción Automática: Usar Generador

```bash
# Generar rollback automáticamente
node scripts/generate-rollback-with-data.js [env] [tabla]

# Ejemplo:
node scripts/generate-rollback-with-data.js staging companies
```

Esto genera:
- Estructura de la tabla
- INSERT statements de todos los datos
- Índices y constraints
- Políticas RLS
- Verificación de cantidad de registros

#### 2.2 Opción Manual: Crear Migración

```sql
-- ============================================================================
-- ROLLBACK MIGRATION: Restaurar [tabla] con datos
-- Fecha: YYYY-MM-DD
-- Registros: [N]
-- ============================================================================

-- PASO 1: Recrear estructura
CREATE TABLE IF NOT EXISTS public.[tabla] (
  -- Copiar de [tabla]_structure.sql
);

-- PASO 2: Insertar datos existentes
-- ⚠️  CRÍTICO: Copiar de [tabla]_data.sql
INSERT INTO public.[tabla] (col1, col2, col3, ...)
VALUES 
  ('val1', 'val2', 'val3', ...),
  ('val1', 'val2', 'val3', ...),
  -- ... todos los registros

-- PASO 3: Recrear índices
CREATE INDEX IF NOT EXISTS idx_[tabla]_col ON public.[tabla](col);

-- PASO 4: Recrear constraints
ALTER TABLE public.[tabla] ADD CONSTRAINT fk_... FOREIGN KEY (...) REFERENCES ...;

-- PASO 5: Recrear políticas RLS
ALTER TABLE public.[tabla] ENABLE ROW LEVEL SECURITY;
CREATE POLICY "policy_name" ON public.[tabla] ...;

-- VERIFICACIÓN
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.[tabla]) != [N_ESPERADO] THEN
    RAISE WARNING 'ADVERTENCIA: Se esperaban [N_ESPERADO] registros, hay %', (SELECT COUNT(*) FROM public.[tabla]);
  END IF;
  
  RAISE NOTICE 'OK: Rollback completado con % registros', (SELECT COUNT(*) FROM public.[tabla]);
END $$;
```

---

### PASO 3: Crear Migración Destructiva

Ahora sí, crear la migración que elimina datos:

```sql
-- ============================================================================
-- MIGRATION: Eliminar tabla companies
-- Fecha: YYYY-MM-DD
-- ⚠️  DESTRUCTIVA: Elimina datos
-- Rollback: YYYYMMDDHHMMSS_rollback_companies_with_data.sql
-- ============================================================================

-- PASO 1: Eliminar foreign keys
ALTER TABLE public.profiles DROP COLUMN IF EXISTS company_id CASCADE;

-- PASO 2: Eliminar tabla
DROP TABLE IF EXISTS public.companies CASCADE;
```

---

### PASO 4: Testear Rollback en Development

```bash
# 1. Aplicar migración destructiva
npm run migrate:dev

# 2. Verificar que los datos fueron eliminados
# (conectar a DB y verificar)

# 3. Aplicar rollback
npm run rollback:dev

# 4. Verificar que los datos fueron restaurados EXACTAMENTE
SELECT COUNT(*) FROM companies;  -- Debe ser el mismo número
SELECT * FROM companies LIMIT 10;  -- Verificar datos
```

---

### PASO 5: Aplicar en Staging/Production

Solo después de verificar en development:

```bash
# Staging
npm run migrate:staging
npm run validate:staging
# Si OK, continuar. Si KO, rollback inmediato.

# Production (después de 24-48h en staging)
npm run migrate:prod
npm run validate:prod
# Si KO, rollback inmediato.
```

---

## 📊 Ejemplo Real: Eliminar Tabla Companies

### Archivos de Backup Generados

```
supabase/backups/
├── companies_structure.sql       # Estructura de la tabla
├── companies_data.sql            # INSERT statements de datos
├── profiles_data.sql             # Datos de profiles (para company_id)
└── client_accounts_data.sql      # Datos de client_accounts (para company_id)
```

### Migración de Rollback

```sql
-- supabase/migrations/20260305200002_rollback_remove_companies.sql

-- PASO 1: Recrear tabla companies
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tax_id text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  country text DEFAULT 'ES',
  postal_code text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- PASO 2: Insertar datos existentes
-- Ejemplo con 3 empresas:
INSERT INTO public.companies (id, name, tax_id, email, phone, status, created_at, updated_at)
VALUES 
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Empresa Demo 1', 'B12345678', 'demo1@example.com', '+34600000001', 'active', '2024-01-01 10:00:00+00', '2024-01-01 10:00:00+00'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'Empresa Demo 2', 'B87654321', 'demo2@example.com', '+34600000002', 'active', '2024-01-02 11:00:00+00', '2024-01-02 11:00:00+00'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Empresa Demo 3', 'B11111111', 'demo3@example.com', '+34600000003', 'inactive', '2024-01-03 12:00:00+00', '2024-01-03 12:00:00+00');

-- PASO 3: Recrear company_id en profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- PASO 4: Restaurar relaciones (si había datos)
-- UPDATE public.profiles SET company_id = 'a1b2c3d4-...' WHERE id = '...';

-- PASO 5: Recrear índices
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);

-- VERIFICACIÓN
DO $$
DECLARE
  count_companies INT;
BEGIN
  SELECT COUNT(*) INTO count_companies FROM public.companies;
  
  IF count_companies != 3 THEN
    RAISE WARNING 'ADVERTENCIA: Se esperaban 3 empresas, hay %', count_companies;
  ELSE
    RAISE NOTICE 'OK: Rollback completado con % empresas', count_companies;
  END IF;
END $$;
```

---

## ✅ Checklist de Verificación

### Antes de Aplicar Migración Destructiva

- [ ] Backup de estructura exportado para cada tabla
- [ ] Backup de datos exportado para cada tabla
- [ ] Migración de rollback creada con INSERT statements
- [ ] Cantidad de registros documentada
- [ ] Rollback testeado en development
- [ ] Datos verificados después del rollback en dev

### Durante el Rollback

- [ ] Estructura de tabla restaurada
- [ ] Datos insertados correctamente
- [ ] Cantidad de registros coincide
- [ ] Índices recreados
- [ ] Constraints recreados
- [ ] Políticas RLS recreadas
- [ ] Relaciones (foreign keys) restauradas

### Después del Rollback

- [ ] Verificar cantidad de registros: `SELECT COUNT(*) FROM [tabla]`
- [ ] Verificar datos de muestra: `SELECT * FROM [tabla] LIMIT 10`
- [ ] Verificar relaciones: `SELECT * FROM [tabla] WHERE [fk] IS NOT NULL`
- [ ] Ejecutar tests E2E
- [ ] Validar funcionalidad de la aplicación

---

## 🚨 Errores Comunes

### ❌ Error 1: Rollback sin Datos

```sql
-- MAL: Solo estructura, sin datos
CREATE TABLE public.companies (...);
-- Falta: INSERT statements
```

**Consecuencia**: Se pierde toda la información de las empresas.

### ❌ Error 2: Datos Parciales

```sql
-- MAL: Solo algunos registros
INSERT INTO public.companies VALUES (...);  -- Solo 1 registro
-- Falta: Los otros 99 registros
```

**Consecuencia**: Se pierden 99 empresas.

### ❌ Error 3: No Verificar Cantidad

```sql
-- MAL: No hay verificación
-- Falta: DO $$ ... verificar COUNT(*)
```

**Consecuencia**: No sabes si el rollback fue completo.

---

## 📝 Scripts Disponibles

```bash
# Guía de backup de datos
npm run backup:data [env] [tabla]

# Generar rollback automático con datos
npm run generate:rollback:with-data [env] [tabla]

# Aplicar rollback
npm run rollback:[env]
```

---

## 🔗 Referencias

- Rollback Policy: `.windsurf/ROLLBACK-POLICY.md`
- SDLC Migraciones: `.windsurf/DATABASE-MIGRATIONS-FASE6.md`
- Ambientes: `.windsurf/ENVIRONMENTS.md`

---

## 📅 Última Actualización

- **Fecha**: 2026-03-05
- **Versión**: 1.0
- **Por**: Sistema de Backup de Datos para Rollback
