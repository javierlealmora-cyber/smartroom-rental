# 🗑️ Eliminación de Tabla Companies - Resumen

**Fecha**: 2026-03-05  
**Objetivo**: Eliminar la tabla `companies` y su campo de relación `company_id` en `profiles` y `client_accounts`

---

## 📋 Cambios Realizados

### 1. **Migraciones SQL Creadas** ✅

#### Migración 1: `20260305200000_remove_company_id_from_profiles.sql`
**Objetivo**: Eliminar `company_id` de la tabla `profiles`

**Acciones**:
- ✅ Eliminar políticas RLS que usan `company_id`
- ✅ Eliminar índices relacionados (`idx_profiles_company_id`, `idx_profiles_company`)
- ✅ Eliminar foreign key constraint `profiles_company_id_fkey`
- ✅ Eliminar columna `company_id`
- ✅ Recrear políticas RLS sin `company_id`
- ✅ Verificación automática de eliminación

#### Migración 2: `20260305200001_remove_companies_table.sql`
**Objetivo**: Eliminar tabla `companies` y limpiar dependencias

**Acciones**:
- ✅ Eliminar foreign keys que referencian `companies`
- ✅ Eliminar políticas RLS de `companies`
- ✅ Eliminar triggers de `companies`
- ✅ Eliminar índices de `companies`
- ✅ Eliminar tabla `companies` con CASCADE
- ✅ Eliminar `company_id` de `client_accounts`
- ✅ Recrear políticas RLS de `client_accounts` sin `company_id`
- ✅ Verificación automática de eliminación

---

### 2. **Seeds Actualizados** ✅

#### `01_companies.sql` - DEPRECATED
- ✅ Archivo comentado completamente
- ✅ Marcado como DEPRECATED
- ✅ Referencia a migración de eliminación
- ✅ Mantenido solo como referencia histórica

#### `02_client_accounts.sql` - ACTUALIZADO
- ✅ Eliminada columna `company_id` del INSERT
- ✅ Eliminado JOIN con `companies` en verificación
- ✅ Actualizado comentario de descripción

#### `README.md` - ACTUALIZADO
- ✅ Marcado `01_companies.sql` como DEPRECATED
- ✅ Agregada nota sobre eliminación de tabla

---

### 3. **Documentación de Backup** ✅

#### Scripts Creados:
- ✅ `supabase/scripts/backup-database.sh` - Script automático de backup
- ✅ `.windsurf/BACKUP-RESTORE-GUIDE.md` - Guía completa
- ✅ `.windsurf/BACKUP-INSTRUCTIONS.md` - Instrucciones rápidas

---

## 🎯 Impacto de los Cambios

### Tablas Afectadas

| Tabla | Cambio | Impacto |
|-------|--------|---------|
| `companies` | **ELIMINADA** | Tabla completa eliminada |
| `profiles` | Columna `company_id` eliminada | Políticas RLS actualizadas |
| `client_accounts` | Columna `company_id` eliminada | Políticas RLS actualizadas |

### Políticas RLS Actualizadas

#### Profiles (Antes)
- ❌ "Users can view profiles in their company"
- ❌ "Users can update profiles in their company"
- ❌ "Admins can manage company profiles"

#### Profiles (Después)
- ✅ "Users can view own profile"
- ✅ "Users can update own profile"
- ✅ "Admins can view all profiles"
- ✅ "Admins can update profiles"

#### Client Accounts (Después)
- ✅ "Superadmins can view all client accounts"
- ✅ "Admins can view their client accounts"
- ✅ "Superadmins can update client accounts"
- ✅ "Admins can update their client account"

---

## ✅ Características de las Migraciones

### Idempotencia ✅
- Todas las operaciones usan `IF EXISTS` o `IF NOT EXISTS`
- Pueden ejecutarse múltiples veces sin errores
- Verificación automática al final

### Seguridad ✅
- Uso de `DO $$ ... END $$` para operaciones condicionales
- Eliminación de dependencias antes de eliminar tablas
- Uso de `CASCADE` donde es necesario

### Documentación ✅
- Comentarios detallados en cada paso
- Explicación del propósito de cada operación
- Verificación automática con mensajes informativos

---

## 🚀 Proceso de Aplicación

### 1. Backup (OBLIGATORIO)
```bash
# Hacer backup de los 3 entornos
bash supabase/scripts/backup-database.sh development
bash supabase/scripts/backup-database.sh staging
bash supabase/scripts/backup-database.sh production
```

### 2. Aplicar en Development (Local)
```bash
# Reset completo (aplica todas las migraciones)
supabase db reset

# Verificar que funcionó
supabase db diff
```

### 3. Verificar Seeds
```bash
# Aplicar seeds (sin 01_companies.sql)
npm run db:seed:dev

# Verificar datos
psql $DATABASE_URL -c "SELECT COUNT(*) FROM client_accounts;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM entities;"
```

### 4. Crear PR
```bash
git checkout -b feat/remove-companies-table
git add supabase/migrations/
git add supabase/seeds/
git commit -m "feat(db): remove companies table and company_id references"
git push origin feat/remove-companies-table
```

### 5. CI/CD Validará
- ✅ Sintaxis SQL correcta
- ✅ Migraciones idempotentes
- ✅ No hay conflictos
- ✅ Workflows pasan

### 6. Merge a Develop
- Migración se aplica automáticamente en desarrollo

### 7. Deploy a Staging/Production
- Migraciones se aplican con aprobación manual

---

## 🔄 Plan de Rollback

Si algo sale mal, restaurar desde backup:

```bash
# 1. Descomprimir backup
gunzip supabase/backups/production/backup_production_YYYYMMDD_HHMMSS.sql.gz

# 2. Restaurar
psql $DATABASE_URL_PRODUCTION < supabase/backups/production/backup_production_YYYYMMDD_HHMMSS.sql

# 3. Verificar
psql $DATABASE_URL_PRODUCTION -c "\dt"
psql $DATABASE_URL_PRODUCTION -c "SELECT COUNT(*) FROM companies;"
```

---

## 📊 Verificación Post-Migración

### Verificar que companies fue eliminada
```sql
-- Debe devolver 0 filas
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'companies';
```

### Verificar que company_id fue eliminado
```sql
-- Debe devolver 0 filas
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'company_id';

SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'client_accounts' AND column_name = 'company_id';
```

### Verificar políticas RLS
```sql
-- Ver políticas de profiles
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Ver políticas de client_accounts
SELECT * FROM pg_policies WHERE tablename = 'client_accounts';
```

---

## 🎯 Próximos Pasos

1. ✅ **Hacer backups de los 3 entornos** (OBLIGATORIO)
2. ✅ **Testear migraciones localmente**
3. ✅ **Crear PR con los cambios**
4. ✅ **Validar que CI/CD pasa**
5. ✅ **Mergear a develop**
6. ✅ **Verificar deployment en dev**
7. ✅ **Aplicar en staging (con backup previo)**
8. ✅ **Aplicar en production (con backup previo)**

---

## 📝 Notas Importantes

- ⚠️ **SIEMPRE hacer backup antes de aplicar en staging/production**
- ⚠️ **Las migraciones son destructivas** (eliminan datos)
- ⚠️ **No se puede deshacer sin restaurar desde backup**
- ✅ **Las migraciones son idempotentes** (se pueden re-ejecutar)
- ✅ **Verificación automática incluida**
- ✅ **Políticas RLS actualizadas correctamente**

---

## 🎉 Resultado Esperado

Después de aplicar las migraciones:

- ❌ Tabla `companies` no existe
- ❌ Columna `company_id` no existe en `profiles`
- ❌ Columna `company_id` no existe en `client_accounts`
- ✅ Políticas RLS funcionando sin `company_id`
- ✅ Seeds actualizados y funcionando
- ✅ CI/CD pasando correctamente
