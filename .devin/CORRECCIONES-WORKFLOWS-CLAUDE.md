# Correcciones requeridas — Workflows y configuracion de tests
# Analisis realizado por Claude — 2026-03-07

---

## DECISIONES TOMADAS (aplicar en todos los cambios)

1. **BDD usa Vitest** (NO Cucumber). Archivos `.test.js` en `src/tests/features/`. Formato Given-When-Then con Vitest.
2. **E2E tests se amplian por modulo** de forma progresiva, no de golpe.

---

## 1. DEPENDENCIAS QUE FALTAN EN package.json

Anadir a `devDependencies`:

```json
"@playwright/test": "^1.50.0",
"@vitest/coverage-v8": "^2.1.9"
```

| Dependencia | Motivo | Workflows afectados |
|-------------|--------|---------------------|
| `@playwright/test` | No esta en devDependencies. `npx playwright install` falla sin ella | pr-checks, deploy-staging, deploy-production, e2e-tests |
| `@vitest/coverage-v8` | `npm run test:coverage` falla sin esta dependencia | pr-checks, deploy-staging, deploy-production |

---

## 2. FIX REQUERIDO EN playwright.config.js

**Problema**: Todos los workflows setean la variable `BASE_URL` pero `playwright.config.js` solo lee `VITE_APP_URL`. Los tests apuntan a `localhost:5173` en CI en vez de al entorno correcto.

**Cambiar linea actual**:
```js
baseURL: process.env.VITE_APP_URL || 'http://localhost:5173',
```

**Por**:
```js
baseURL: process.env.BASE_URL || process.env.VITE_APP_URL || 'http://localhost:5173',
```

---

## 3. BUGS EN pr-checks.yml

### Bug critico: preview-deploy despliega a produccion
**Job**: `preview-deploy`
**Problema**: Usa `vercel-args: '--prod'` en un PR preview. Esto despliega a produccion en cada PR.
**Fix**: Quitar `vercel-args: '--prod'` del job `preview-deploy`.

### Bug: PR trigger no incluye staging
**Problema**: El workflow solo escucha PRs a `main` y `develop`. Falta `staging`.
**Fix**:
```yaml
on:
  pull_request:
    branches: [ main, develop, staging ]
```

### Informacion: BDD job pasara vacio hasta que existan tests
**Job**: `bdd-tests`
**Estado**: `src/tests/features/` solo tiene README.md. El job pasara vacio. No es un error, se llenara cuando Cascade implemente los tests de features por issue.

---

## 4. BUGS EN deploy-dev.yml

### Bug: output deployment_id no existe
**Step**: "Update deployment status"
**Problema**: `${{ steps.deploy.outputs.deployment_id }}` — `amondnet/vercel-action` no expone `deployment_id` como output. El step falla.
**Fix**: Eliminar el step "Update deployment status" o usar la API de GitHub de forma diferente.

### Pendiente: migraciones DB no se aplican realmente
**Jobs**: `database-update`
**Problema**: Los comandos reales estan comentados (`# npx supabase db push --linked`). Solo hace `echo`. No aplica nada a la BBDD.
**Fix**: Implementar con Supabase CLI usando secrets:
```bash
npx supabase db push --project-ref $SUPABASE_PROJECT_REF
```
Requiere secret: `DEV_SUPABASE_PROJECT_REF` y `SUPABASE_ACCESS_TOKEN`.

---

## 5. BUGS EN deploy-staging.yml

### Bug critico: endpoints /api/* no existen
**Jobs**: `post-deploy-validation`
**Problema**: Hace curl a:
- `https://staging.smartroom-rental.vercel.app/api/auth/login`
- `https://staging.smartroom-rental.vercel.app/api/health`

**Estos endpoints NO EXISTEN**. SmartRoom es una SPA con Supabase. No tiene API REST propia.
**Fix**: Reemplazar por health check simple:
```bash
curl -f https://staging.smartroomrentalplatform.com/ || exit 1
```

### Bug: Lighthouse CI sin configuracion
**Job**: `security-performance`
**Problema**: Usa `lhci autorun` pero no existe `lighthouserc.js` en el proyecto. Fallara.
**Opciones**:
- A) Eliminar el job de Lighthouse por ahora
- B) Crear `.lighthouserc.json` con configuracion basica

### Bug: URL de staging inconsistente
**Problema**: El workflow usa `staging.smartroom-rental.vercel.app` pero el documento FLUJO-COMPLETO-SDLC.md dice `staging.smartroomrentalplatform.com`.
**Fix**: Unificar a `staging.smartroomrentalplatform.com` en todo el workflow.

### Pendiente: migraciones DB no se aplican realmente
Mismo problema que en deploy-dev.yml. Comandos comentados. No aplica nada real.

---

## 6. BUGS EN deploy-production.yml

### Bug critico: logica de confirmacion rota
**Job**: `pre-deployment-checks`
**Problema**: La condicion `if` referencia `steps.confirm-deployment.outputs.confirmed` pero los outputs entre jobs se referencian con `needs.job-id.outputs.X`.
**Fix**:
```yaml
if: |
  github.event_name == 'push' ||
  (github.event_name == 'workflow_dispatch' && needs.confirm-deployment.outputs.confirmed == 'true')
```

### Bug critico: endpoints /api/* no existen (igual que staging)
**Jobs**: `post-deployment-validation`
**Problema**: Hace curl a `/api/auth/login`, `/api/health`, `/api/stripe/health`.
**Fix**: Reemplazar por health checks reales contra la app SPA.

### Bug: health check staging usa endpoint inexistente
**Job**: `pre-deployment-checks`
**Problema**: `curl -f https://staging.smartroom-rental.vercel.app/health` — endpoint no existe.
**Fix**: `curl -f https://staging.smartroomrentalplatform.com/`

### Pendiente: migraciones DB no se aplican realmente
Mismo problema que en los otros deploys.

---

## 7. BUGS EN e2e-tests.yml

### Bug: tests con tags inexistentes
**Jobs**: `regression-tests`, `accessibility-tests`, `performance-tests`, `visual-regression`
**Problema**: Buscan tests con tags `@regression`, `@accessibility`, `@performance`, `@visual`. Ningun test tiene estos tags actualmente. Los jobs pasaran vacios.
**Estado**: Aceptable por ahora. Se llenaran cuando se creen los tests por modulo.
**Accion**: Anadir `continue-on-error: true` a estos jobs hasta que existan los tests.

### Bug: trigger duplicado
**Problema**: El workflow se dispara en push a `main`, `develop`, `staging` — duplicando los E2E que ya corren en deploy-dev.yml y deploy-staging.yml.
**Fix**: Cambiar el trigger para que solo se ejecute `workflow_dispatch` y `schedule`, no en push.

### Bug: axe-core instalado incorrectamente
**Job**: `accessibility-tests`
**Problema**: `npm install -g axe-core` no es la forma de usar axe con Playwright.
**Fix**: Instalar `@axe-core/playwright` como devDependency y usarlo dentro de los tests.

---

## 8. ARCHIVOS QUE NO EXISTEN Y DEBEN CREARSE

| Archivo | Urgencia | Descripcion |
|---------|----------|-------------|
| `.github/workflows/auto-merge-pr.yml` | Media | Auto-merge de feat/* a develop cuando todos los checks pasan |
| `lighthouserc.json` | Baja | Config para Lighthouse CI en deploy-staging (o eliminar el job) |
| `src/tests/features/*.test.js` | Alta | Tests BDD con Vitest. Se crean uno por issue segun el SDLC |
| `supabase/static-data/01_plans_catalog.sql` | Media | Datos estaticos idempotentes |
| `supabase/static-data/02_service_types.sql` | Media | Datos estaticos idempotentes |
| `supabase/static-data/03_system_config.sql` | Media | Datos estaticos idempotentes |

**NO crear** `claude-monitor-staging.yml` — requiere integracion compleja con API Anthropic, posponer para fase posterior.

---

## 9. SECRETS NECESARIOS EN GITHUB (configurar en Settings > Secrets)

```
# Vercel
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID

# Supabase por entorno
DEV_SUPABASE_URL
DEV_SUPABASE_ANON_KEY
DEV_SUPABASE_PROJECT_REF        # para CLI (ej: lopdwrsmkmtboeczxotj)
STAGING_SUPABASE_URL
STAGING_SUPABASE_ANON_KEY
STAGING_SUPABASE_PROJECT_REF    # para CLI
PRODUCTION_SUPABASE_URL
PRODUCTION_SUPABASE_ANON_KEY
PRODUCTION_SUPABASE_PROJECT_REF # para CLI (lqwyyyttjamirccdtlvl)
SUPABASE_ACCESS_TOKEN           # token personal de Supabase CLI

# Stripe
STAGING_STRIPE_PUBLISHABLE_KEY
PRODUCTION_STRIPE_PUBLISHABLE_KEY

# Opcionales
SNYK_TOKEN
SLACK_WEBHOOK_URL
```

---

## 10. PRIORIDAD DE CORRECCIONES

### Prioridad CRITICA (bloquean CI/CD)
1. Anadir `@playwright/test` y `@vitest/coverage-v8` a devDependencies
2. Fix `playwright.config.js` para leer `BASE_URL`
3. Fix `preview-deploy` job — quitar `--prod`
4. Fix `deploy-production.yml` — referencia `needs.confirm-deployment.outputs` no `steps`
5. Eliminar/reemplazar health checks `/api/*` en staging y production (no existen)

### Prioridad IMPORTANTE (workflows incompletos)
6. Implementar migraciones DB reales en los 3 workflows de deploy
7. Fix `deployment_id` output en deploy-dev.yml
8. Unificar URL de staging: usar `staging.smartroomrentalplatform.com` en todos los workflows
9. Fix trigger en e2e-tests.yml (evitar duplicacion)

### Prioridad BAJA (opcional/futuro)
10. Crear `auto-merge-pr.yml`
11. Decidir Lighthouse CI: crear config o eliminar el job
12. Anadir `@axe-core/playwright` cuando se creen tests de accesibilidad

---

## NOTA SOBRE SUPABASE PROJECT IDs

Segun FLUJO-COMPLETO-SDLC.md hay un typo en el ID de DEV Supabase:
- Documento dice: `lopdwrsmkmtboeczxotj`
- ID real segun historial del proyecto: `lcpdwrsmkmtboeczxotj`

Verificar cual es el correcto antes de configurar los secrets.
