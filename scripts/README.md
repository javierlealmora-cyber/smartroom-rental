# Scripts de Operaciones - SmartRoom Rental

**Propósito:** Scripts ejecutables para operaciones de DevOps, deployment, migraciones y mantenimiento.

---

## 📋 Índice de Scripts

### 🚀 Deployment y Setup

| Script | Descripción | Uso |
|--------|-------------|-----|
| `setup-production.sh` | Setup completo de producción | `bash scripts/setup-production.sh` |
| `setup-production.ps1` | Setup de producción (PowerShell) | `.\scripts\setup-production.ps1` |
| `deploy-staging-quick.sh` | Deploy rápido a staging | `bash scripts/deploy-staging-quick.sh` |
| `validate-deployment.js` | Validar deployment | `node scripts/validate-deployment.js` |

---

### 📊 Migraciones

| Script | Descripción | Uso |
|--------|-------------|-----|
| `apply-migration.js` | Aplicar migraciones a entornos | `node scripts/apply-migration.js [dev\|staging\|prod]` |
| `backup-data-before-migration.js` | Backup antes de migración | `node scripts/backup-data-before-migration.js` |
| `rollback-migracion-bbdd.js` | Rollback de migración | `node scripts/rollback-migracion-bbdd.js` |
| `generate-rollback-with-data.js` | Generar script de rollback | `node scripts/generate-rollback-with-data.js` |

---

### 🔍 Verificación y Debugging

| Script | Descripción | Uso |
|--------|-------------|-----|
| `check-schema.js` | Verificar esquema de BD | `node scripts/check-schema.js` |
| `detailed-schema.js` | Esquema detallado | `node scripts/detailed-schema.js` |
| `inspect-rls.js` | Inspeccionar políticas RLS | `node scripts/inspect-rls.js` |
| `verify-rls-status.js` | Verificar estado de RLS | `node scripts/verify-rls-status.js` |
| `apply-rls-fix.js` | Aplicar fix de RLS | `node scripts/apply-rls-fix.js` |
| `list-users.js` | Listar usuarios | `node scripts/list-users.js` |

---

### 🔧 Mantenimiento

| Script | Descripción | Uso |
|--------|-------------|-----|
| `enable-maintenance.js` | Activar modo mantenimiento | `node scripts/enable-maintenance.js` |
| `rollback-deployment-all.js` | Rollback completo de deployment | `node scripts/rollback-deployment-all.js` |

---

### 📁 Datos

| Script | Descripción | Uso |
|--------|-------------|-----|
| `copy-dev-to-staging.sql` | Copiar datos de dev a staging | `psql -f scripts/copy-dev-to-staging.sql` |

---

## 🎯 Uso Común

### Setup de Producción

```bash
# Opción 1: Bash (Linux/Mac/Git Bash)
bash scripts/setup-production.sh

# Opción 2: PowerShell (Windows)
.\scripts\setup-production.ps1
```

### Aplicar Migración

```bash
# Development
node scripts/apply-migration.js dev

# Staging
node scripts/apply-migration.js staging

# Production (requiere confirmación)
node scripts/apply-migration.js prod
```

### Verificar Esquema

```bash
# Esquema básico
node scripts/check-schema.js

# Esquema detallado
node scripts/detailed-schema.js
```

### Verificar RLS

```bash
# Inspeccionar políticas
node scripts/inspect-rls.js

# Verificar estado
node scripts/verify-rls-status.js
```

---

## ⚠️ Precauciones

### Scripts de Producción

**Requieren confirmación explícita:**
- `apply-migration.js prod`
- `rollback-deployment-all.js`
- `setup-production.sh`

**Siempre hacer backup antes:**
```bash
node scripts/backup-data-before-migration.js
```

### Variables de Entorno

**Requeridas:**
- `SUPABASE_SERVICE_ROLE_KEY` - Para operaciones administrativas
- `SUPABASE_PROJECT_REF` - ID del proyecto (opcional, se puede pasar como argumento)

**Configurar en `.env.local`:**
```env
DEV_SUPABASE_SERVICE_KEY=<service-key-dev>
STAGING_SUPABASE_SERVICE_KEY=<service-key-staging>
PROD_SUPABASE_SERVICE_KEY=<service-key-prod>
```

---

## 📚 Documentación Relacionada

Para guías detalladas de uso, consultar:

- **Deployment:** `docs/devops/deployment.md`
- **Migraciones:** `docs/database/MIGRATION-RULES.md`
- **Setup de Producción:** `docs/devops/production-setup.md`
- **Setup de Staging:** `docs/devops/staging-setup.md`
- **Modo Mantenimiento:** `docs/devops/maintenance-mode.md`

---

## 🔗 Entornos

### Development
- **Project ID:** `lqwyyyttjamirccdtlvl`
- **URL:** https://lqwyyyttjamirccdtlvl.supabase.co

### Staging
- **Project ID:** `lopdwrsmkmtboeczxotj`
- **URL:** https://lopdwrsmkmtboeczxotj.supabase.co

### Production
- **Project ID:** `oeofdvkilcuidxainuow`
- **URL:** https://smartroomrentalplatform.com

---

## 🚨 Troubleshooting

### Error: "Project not linked"

```bash
# Link del proyecto
npx supabase link --project-ref <project-id>
```

### Error: "Service role key not found"

```bash
# Configurar secret
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key> --project-ref <project-id>
```

### Error: "Migration already applied"

```bash
# Verificar migraciones aplicadas
npx supabase migration list --project-ref <project-id>
```

---

## 📝 Convenciones

### Nombres de Scripts

- **Verbos en inglés:** `apply-`, `check-`, `verify-`, `generate-`
- **Kebab-case:** `apply-migration.js`, `check-schema.js`
- **Extensión clara:** `.js` (Node.js), `.sh` (Bash), `.ps1` (PowerShell), `.sql` (SQL)

### Salida de Scripts

- ✅ Éxito: Exit code 0
- ❌ Error: Exit code 1
- 🟡 Warning: Exit code 0 con mensaje de advertencia

---

**Última actualización:** 2026-03-28  
**Responsable:** DevOps / Staff Engineer
