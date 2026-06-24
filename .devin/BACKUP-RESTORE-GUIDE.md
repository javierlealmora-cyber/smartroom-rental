# 💾 Guía de Backup y Restore de Base de Datos

Guía completa para hacer backups y restaurar las bases de datos de Supabase en los 3 entornos.

---

## 🎯 Ambientes

| Ambiente | Proyecto Supabase | URL Base de Datos |
|----------|-------------------|-------------------|
| **Development** | `lopdwrsmkmtboeczxotj` | `https://lopdwrsmkmtboeczxotj.supabase.co` |
| **Staging** | `lopdwrsmkmtboeczxotj` | `https://lopdwrsmkmtboeczxotj.supabase.co` |
| **Production** | `lqwyyyttjamirccdtlvl` | `https://lqwyyyttjamirccdtlvl.supabase.co` |

---

## 📋 PASO 1: Configurar Variables de Entorno

Antes de hacer backups, configura las URLs de conexión:

### Development
```bash
export DATABASE_URL_DEV="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
```

### Staging
```bash
export DATABASE_URL_STAGING="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
```

### Production
```bash
export DATABASE_URL_PRODUCTION="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
```

**¿Dónde obtener la URL?**
1. Ve a tu proyecto en Supabase Dashboard
2. Settings → Database
3. Copia "Connection string" (modo "Transaction")
4. Reemplaza `[YOUR-PASSWORD]` con tu password real

---

## 💾 PASO 2: Crear Backups

### Opción 1: Usar Script Automático (Recomendado)

```bash
# Development
bash supabase/scripts/backup-database.sh development

# Staging
bash supabase/scripts/backup-database.sh staging

# Production
bash supabase/scripts/backup-database.sh production
```

### Opción 2: Usar Supabase CLI

```bash
# Development (local)
supabase db dump -f supabase/backups/development/backup_dev_$(date +%Y%m%d_%H%M%S).sql

# Staging/Production (remoto)
supabase db dump --db-url "$DATABASE_URL_PRODUCTION" -f backup_prod_$(date +%Y%m%d_%H%M%S).sql
```

### Opción 3: Desde Supabase Dashboard

1. Ve a tu proyecto en Supabase Dashboard
2. Database → Backups
3. Click en "Create backup"
4. Espera a que se complete
5. Descarga el backup

---

## 📦 Estructura de Backups

```
supabase/backups/
├── development/
│   ├── backup_development_20260305_191500.sql.gz
│   ├── backup_development_20260305_120000.sql.gz
│   └── ...
├── staging/
│   ├── backup_staging_20260305_191500.sql.gz
│   └── ...
└── production/
    ├── backup_production_20260305_191500.sql.gz
    └── ...
```

**Nota**: Los backups se comprimen automáticamente con gzip para ahorrar espacio.

---

## 🔄 PASO 3: Restaurar Backups

### ⚠️ ADVERTENCIA
**Restaurar un backup BORRARÁ todos los datos actuales de la base de datos.**

### Proceso de Restauración

#### 1. Descomprimir el backup
```bash
gunzip supabase/backups/production/backup_production_20260305_191500.sql.gz
```

#### 2. Restaurar en la base de datos
```bash
# Development
psql $DATABASE_URL_DEV < supabase/backups/development/backup_development_20260305_191500.sql

# Staging
psql $DATABASE_URL_STAGING < supabase/backups/staging/backup_staging_20260305_191500.sql

# Production
psql $DATABASE_URL_PRODUCTION < supabase/backups/production/backup_production_20260305_191500.sql
```

#### 3. Verificar la restauración
```bash
# Conectar a la base de datos
psql $DATABASE_URL_PRODUCTION

# Verificar tablas
\dt

# Verificar datos
SELECT COUNT(*) FROM public.companies;
SELECT COUNT(*) FROM public.profiles;
```

---

## 🚨 Proceso de Backup ANTES de Cambios Importantes

### Antes de aplicar migraciones destructivas:

```bash
# 1. Hacer backup de los 3 entornos
bash supabase/scripts/backup-database.sh development
bash supabase/scripts/backup-database.sh staging
bash supabase/scripts/backup-database.sh production

# 2. Verificar que los backups se crearon
ls -lh supabase/backups/development/
ls -lh supabase/backups/staging/
ls -lh supabase/backups/production/

# 3. Anotar los nombres de los archivos de backup
echo "Backup Development: backup_development_YYYYMMDD_HHMMSS.sql.gz"
echo "Backup Staging: backup_staging_YYYYMMDD_HHMMSS.sql.gz"
echo "Backup Production: backup_production_YYYYMMDD_HHMMSS.sql.gz"

# 4. Proceder con los cambios
```

---

## 📊 Verificación de Backups

### Verificar que el backup está completo:

```bash
# Descomprimir temporalmente
gunzip -c backup_production_20260305_191500.sql.gz > temp_backup.sql

# Verificar contenido
grep -c "CREATE TABLE" temp_backup.sql
grep -c "INSERT INTO" temp_backup.sql

# Limpiar
rm temp_backup.sql
```

### Verificar tamaño del backup:

```bash
# Listar backups con tamaños
ls -lh supabase/backups/production/

# Un backup típico debería tener:
# - Development: 1-10 MB (comprimido)
# - Staging: 5-50 MB (comprimido)
# - Production: 10-100+ MB (comprimido)
```

---

## 🔐 Seguridad de Backups

### ✅ Mejores Prácticas

1. **No commitear backups a Git**
   - Los backups están en `.gitignore`
   - Contienen datos sensibles

2. **Almacenar backups de forma segura**
   - Usar almacenamiento encriptado
   - AWS S3 con encriptación
   - Google Cloud Storage
   - Azure Blob Storage

3. **Rotación de backups**
   - Mantener backups diarios por 7 días
   - Mantener backups semanales por 4 semanas
   - Mantener backups mensuales por 12 meses

4. **Testear restauración**
   - Probar restaurar backups regularmente
   - Verificar integridad de datos

---

## 📅 Política de Backups Recomendada

### Development
- **Frecuencia**: Antes de cambios importantes
- **Retención**: 7 días
- **Automático**: No (manual cuando sea necesario)

### Staging
- **Frecuencia**: Diario (automático)
- **Retención**: 30 días
- **Automático**: Sí (via cron job o GitHub Actions)

### Production
- **Frecuencia**: Cada 6 horas (automático)
- **Retención**: 90 días
- **Automático**: Sí (via Supabase Dashboard)
- **Backup manual**: Antes de cada deploy importante

---

## 🛠️ Scripts de Utilidad

### Backup Automático de los 3 Entornos

```bash
#!/bin/bash
# backup-all-environments.sh

echo "🔄 Haciendo backup de todos los entornos..."

bash supabase/scripts/backup-database.sh development
bash supabase/scripts/backup-database.sh staging
bash supabase/scripts/backup-database.sh production

echo "✅ Backups completados"
```

### Limpiar Backups Antiguos

```bash
#!/bin/bash
# cleanup-old-backups.sh

# Eliminar backups de development mayores a 7 días
find supabase/backups/development -name "*.sql.gz" -mtime +7 -delete

# Eliminar backups de staging mayores a 30 días
find supabase/backups/staging -name "*.sql.gz" -mtime +30 -delete

# Eliminar backups de production mayores a 90 días
find supabase/backups/production -name "*.sql.gz" -mtime +90 -delete

echo "✅ Backups antiguos eliminados"
```

---

## 🚀 Proceso Completo: Backup → Cambio → Restore

### Escenario: Eliminar tabla companies

```bash
# 1. BACKUP de los 3 entornos
bash supabase/scripts/backup-database.sh development
bash supabase/scripts/backup-database.sh staging
bash supabase/scripts/backup-database.sh production

# 2. Anotar nombres de backups
BACKUP_DEV="backup_development_20260305_191500.sql.gz"
BACKUP_STAGING="backup_staging_20260305_191500.sql.gz"
BACKUP_PROD="backup_production_20260305_191500.sql.gz"

# 3. Crear migración
npm run db:migration:new "remove_companies_table"

# 4. Editar migración con SQL para eliminar tabla

# 5. Testear en development
supabase db reset

# 6. Si algo sale mal, restaurar
gunzip supabase/backups/development/$BACKUP_DEV
psql $DATABASE_URL_DEV < supabase/backups/development/backup_development_20260305_191500.sql

# 7. Si todo está bien, crear PR y mergear
git add supabase/migrations/
git commit -m "feat(db): remove companies table"
git push

# 8. CI/CD aplicará cambios automáticamente
```

---

## 📞 Contacto en Caso de Emergencia

Si necesitas restaurar un backup de producción:

1. **NO ENTRAR EN PÁNICO**
2. Verificar que tienes el backup correcto
3. Hacer un backup del estado actual (por si acaso)
4. Restaurar el backup
5. Verificar que todo funciona
6. Documentar qué pasó y por qué

---

## 📚 Recursos

- [Supabase Backups Docs](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL psql](https://www.postgresql.org/docs/current/app-psql.html)

---

## ✅ Checklist de Backup

Antes de hacer cambios importantes:

- [ ] Backup de development creado
- [ ] Backup de staging creado
- [ ] Backup de production creado
- [ ] Nombres de backups anotados
- [ ] Backups verificados (tamaño correcto)
- [ ] Plan de rollback documentado
- [ ] Equipo notificado de los cambios
