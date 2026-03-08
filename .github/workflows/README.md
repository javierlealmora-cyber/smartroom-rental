# GitHub Actions Workflows

## 📋 Workflows Disponibles

### 1. `deploy-edge-functions.yml` - Edge Functions Deployment

Despliega automáticamente las Edge Functions de Supabase a STAGING o PRODUCTION.

**Triggers:**
- Push a `develop` → Despliega a STAGING
- Push a `main` → Despliega a PRODUCTION
- Manual (`workflow_dispatch`) → Elige ambiente y funciones específicas

**Funciones detectadas automáticamente:**
- `manage_accommodation`
- `manage_entity`
- `provision_client_account_superadmin`
- `stripe_webhook`
- `whoami`
- `wizard_init`
- `wizard_submit`

**Uso manual:**
```bash
# Desde GitHub UI: Actions → Deploy Edge Functions → Run workflow
# Seleccionar:
# - Environment: staging | production
# - Functions: all | manage_accommodation,stripe_webhook (comma-separated)
```

**Secrets requeridos:**
- `SUPABASE_ACCESS_TOKEN` - Token de acceso a Supabase
- `STAGING_SUPABASE_PROJECT_REF` - Project ID de STAGING
- `STAGING_SUPABASE_ANON_KEY` - Anon key de STAGING
- `PRODUCTION_SUPABASE_PROJECT_REF` - Project ID de PRODUCTION
- `PRODUCTION_SUPABASE_ANON_KEY` - Anon key de PRODUCTION
- `SLACK_WEBHOOK_URL` (opcional) - Para notificaciones

---

### 2. `deploy-staging.yml` - Full Staging Deployment

Despliega la aplicación completa a STAGING (frontend + database).

**Triggers:**
- Push a `staging` branch
- Manual con opciones avanzadas

**Incluye:**
- Tests comprehensivos (unit, BDD, E2E)
- Security scans
- Database migrations
- Static data
- Build & deploy a Vercel
- Smoke tests post-deployment

---

### 3. `deploy-production.yml` - Production Deployment

Despliega a PRODUCTION con validaciones estrictas.

---

### 4. `deploy-dev.yml` - Development Deployment

Despliega a ambiente de desarrollo.

---

### 5. `e2e-tests.yml` - E2E Testing

Ejecuta tests end-to-end con Playwright.

---

### 6. `pr-checks.yml` - Pull Request Checks

Validaciones automáticas en PRs (lint, tests, security).

---

### 7. `auto-merge-pr.yml` - Auto-merge PRs

Merge automático de PRs que pasan todas las validaciones.

---

## 🔧 Configuración de Secrets

### Secrets de Supabase

```bash
# STAGING
STAGING_SUPABASE_PROJECT_REF=lopdwrsmkmtboeczxotj
STAGING_SUPABASE_URL=https://lopdwrsmkmtboeczxotj.supabase.co
STAGING_SUPABASE_ANON_KEY=<anon_key_staging>

# PRODUCTION
PRODUCTION_SUPABASE_PROJECT_REF=lqwyyyttjamirccdtlvl
PRODUCTION_SUPABASE_URL=https://lqwyyyttjamirccdtlvl.supabase.co
PRODUCTION_SUPABASE_ANON_KEY=<anon_key_production>

# Access Token (compartido)
SUPABASE_ACCESS_TOKEN=<access_token>
```

### Secrets de Vercel

```bash
VERCEL_TOKEN=<vercel_token>
VERCEL_ORG_ID=<org_id>
VERCEL_PROJECT_ID=<project_id>
```

### Secrets de Stripe

```bash
STAGING_STRIPE_PUBLISHABLE_KEY=<pk_test_...>
PRODUCTION_STRIPE_PUBLISHABLE_KEY=<pk_live_...>
```

### Secrets opcionales

```bash
SLACK_WEBHOOK_URL=<webhook_url>
SNYK_TOKEN=<snyk_token>
```

---

## 🚀 Flujo de Deployment

### Desarrollo → Staging

1. Desarrollar en rama feature
2. PR a `develop`
3. Merge a `develop`
4. **Edge Functions** se despliegan automáticamente a STAGING
5. Para desplegar frontend: merge `develop` → `staging`

### Staging → Production

1. Validar en STAGING
2. PR de `staging` → `main`
3. Merge a `main`
4. **Edge Functions** se despliegan automáticamente a PRODUCTION
5. Frontend se despliega automáticamente a PRODUCTION

---

## 📝 Notas Importantes

### Edge Functions

- Las Edge Functions se despliegan **independientemente** del frontend
- Cambios en `supabase/functions/**` activan deployment automático
- Verificación JWT habilitada por defecto (`--no-verify-jwt false`)
- Se verifica que las funciones respondan después del deployment

### Database Migrations

- Las migraciones están en `supabase/baseline/` (baseline cero)
- Nuevas migraciones irán en `supabase/migrations/`
- Se aplican automáticamente en el workflow de staging/production

### Static Data

- Datos estáticos en `supabase/static-data/staging/`
- Se aplican después de las migraciones
- Deben ser idempotentes (usar `ON CONFLICT`)

---

## 🔍 Troubleshooting

### Edge Function deployment falla

```bash
# Verificar localmente
supabase functions deploy <function_name> --project-ref <project_ref>

# Ver logs
supabase functions logs <function_name> --project-ref <project_ref>
```

### Database migration falla

```bash
# Verificar estado de la base de datos
supabase db diff --linked

# Aplicar manualmente
supabase db push --project-ref <project_ref>
```

### Tests E2E fallan

```bash
# Ejecutar localmente
npm run test:e2e:smoke

# Ver reporte
npx playwright show-report
```

---

## 📚 Referencias

- [Supabase CLI Docs](https://supabase.com/docs/reference/cli)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vercel Deployment](https://vercel.com/docs/deployments)
