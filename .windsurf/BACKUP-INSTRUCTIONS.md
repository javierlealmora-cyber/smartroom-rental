# 💾 INSTRUCCIONES RÁPIDAS: Backup de los 3 Entornos

**Objetivo**: Hacer backup completo de Development, Staging y Production antes de eliminar tabla `companies`.

---

## 🎯 URLs de Conexión a Configurar

### 1. Obtener Connection Strings de Supabase

#### Development/Staging (Proyecto: lopdwrsmkmtboeczxotj)
1. Ve a: https://supabase.com/dashboard/project/lopdwrsmkmtboeczxotj
2. Settings → Database → Connection string
3. Selecciona "Transaction" mode
4. Copia la URL

#### Production (Proyecto: lqwyyyttjamirccdtlvl)
1. Ve a: https://supabase.com/dashboard/project/lqwyyyttjamirccdtlvl
2. Settings → Database → Connection string
3. Selecciona "Transaction" mode
4. Copia la URL

---

## 🚀 OPCIÓN 1: Backup desde Supabase Dashboard (MÁS FÁCIL)

### Development/Staging
1. Ve a: https://supabase.com/dashboard/project/lopdwrsmkmtboeczxotj/database/backups
2. Click en **"Create backup"**
3. Espera a que se complete (1-2 minutos)
4. Click en **"Download"** para guardar el backup
5. Guarda como: `backup_dev_20260305_191500.sql`

### Production
1. Ve a: https://supabase.com/dashboard/project/lqwyyyttjamirccdtlvl/database/backups
2. Click en **"Create backup"**
3. Espera a que se complete (1-2 minutos)
4. Click en **"Download"** para guardar el backup
5. Guarda como: `backup_prod_20260305_191500.sql`

**✅ LISTO! Ya tienes los 3 backups.**

---

## 🚀 OPCIÓN 2: Backup con Supabase CLI (Más Técnico)

### Prerequisitos
```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Verificar instalación
supabase --version
```

### Hacer Backups

```bash
# 1. Development (local)
supabase db dump --db-url "postgresql://postgres.lopdwrsmkmtboeczxotj:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" -f backup_dev_$(date +%Y%m%d_%H%M%S).sql

# 2. Staging (mismo proyecto que dev)
supabase db dump --db-url "postgresql://postgres.lopdwrsmkmtboeczxotj:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" -f backup_staging_$(date +%Y%m%d_%H%M%S).sql

# 3. Production
supabase db dump --db-url "postgresql://postgres.lqwyyyttjamirccdtlvl:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" -f backup_prod_$(date +%Y%m%d_%H%M%S).sql
```

**Reemplaza `[PASSWORD]` con tu password real de Supabase.**

---

## 📋 Verificar que los Backups se Crearon

```bash
# Listar archivos
ls -lh backup_*.sql

# Deberías ver algo como:
# backup_dev_20260305_191500.sql      (1-5 MB)
# backup_staging_20260305_191500.sql  (1-5 MB)
# backup_prod_20260305_191500.sql     (1-10 MB)
```

---

## ✅ Checklist de Backups

- [ ] Backup de Development creado ✅
- [ ] Backup de Staging creado ✅
- [ ] Backup de Production creado ✅
- [ ] Archivos verificados (tamaño > 0) ✅
- [ ] Nombres de archivos anotados ✅

---

## 🔄 Si Necesitas Restaurar

### Desde Supabase Dashboard
1. Ve a Database → Backups
2. Selecciona el backup que descargaste
3. Click en "Restore"

### Desde CLI
```bash
psql "postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres" < backup_prod_20260305_191500.sql
```

---

## 🎯 Próximo Paso

Una vez que tengas los 3 backups:

1. ✅ Backups completados
2. ➡️ Crear migración para eliminar `company_id` de `profiles`
3. ➡️ Crear migración para eliminar tabla `companies`
4. ➡️ Actualizar seeds
5. ➡️ Crear PR y validar CI/CD

---

## 📞 ¿Problemas?

Si tienes problemas para hacer los backups:
- Verifica que tienes acceso a los proyectos de Supabase
- Verifica que el password es correcto
- Usa la opción del Dashboard (es más fácil)
