# 🚀 Flujo Completo de Desarrollo: De Issue a Producción

**Proyecto**: SmartRoom Rental Platform  
**Última actualización**: 2026-03-07  
**Versión**: 2.1 (Workflows corregidos y validados)

---

## 📋 Índice

1. [Arquitectura de Entornos](#arquitectura-de-entornos)
2. [Estructura de Branches](#estructura-de-branches)
3. [Actores del Proceso](#actores-del-proceso)
4. [Flujo Completo Paso a Paso](#flujo-completo-paso-a-paso)
5. [Tests Automáticos](#tests-automáticos)
6. [Cambios de Base de Datos](#cambios-de-base-de-datos)
7. [Rollback y Recuperación](#rollback-y-recuperación)
8. [Comandos Rápidos](#comandos-rápidos)

---

## 🏗️ Arquitectura de Entornos

### Local (Tu Máquina)
```
├── Git: Solo branch develop + feat/*
├── Node.js: Para ejecutar app y tests
├── Windsurf/Cascade: Para desarrollo automatizado
└── NO hay deployments locales
```

### Cloud (GitHub + Vercel + Supabase)

| Entorno | Branch GitHub | Vercel URL | Supabase Project ID | Auto-Deploy |
|---------|---------------|------------|---------------------|-------------|
| **DEV** | `develop` | dev.smartroom-rental.vercel.app | lqwyyyttjamirccdtlvl | ✅ Sí |
| **STAGING** | `staging` | staging.smartroomrentalplatform.com | lopdwrsmkmtboeczxotj | ✅ Sí |
| **PRODUCTION** | `main` | smartroomrentalplatform.com | oeofdvkilcuidxainuow | ✅ Sí |

---

## 🌿 Estructura de Branches

### Git Local
```
develop (única branch permanente)
  └── feat/* (branches temporales para features)
```

### Git Remoto (GitHub)
```
develop  → Auto-deploy a DEV
staging  → Auto-deploy a STAGING
main     → Auto-deploy a PRODUCTION
```

**Importante**: Las branches `staging` y `main` **NO existen en local**, solo en GitHub.

---

## 👥 Actores del Proceso

1. **Product Owner/Cliente** - Crea issues y define requisitos
2. **Desarrollador (Tú)** - Das instrucciones a Cascade
3. **Cascade (AI)** - Implementa cambios, crea PRs, ejecuta tests
4. **GitHub Actions** - CI/CD automático
5. **Vercel** - Deploy automático de frontend
6. **Supabase** - Base de datos (3 instancias)
7. **Claude AI** - Análisis de código y validación
8. **Playwright** - Tests E2E automáticos

---

## 🔄 Flujo Completo Paso a Paso

### FASE 1: Planificación (GitHub)

#### 1.1 Crear Issue
**Actor**: Product Owner/Cliente  
**Dónde**: GitHub Web

```
1. GitHub → Issues → New Issue
2. Título: [FEATURE] Descripción breve
3. Descripción: Detalles completos
4. Labels: feature, database, priority-high
5. Milestone: FASE X
6. Asignar a desarrollador
```

**Ejemplo**:
```
Título: [FEATURE] Eliminar tabla companies
Labels: feature, database, priority-high
Milestone: FASE 6
```

---

### FASE 2: Desarrollo Local

#### 2.1 Iniciar Feature
**Actor**: Tú + Cascade  
**Dónde**: Local

**Tú dices**: "Cascade, implementa feature X según issue #5"

**Cascade ejecuta automáticamente**:
```bash
# 1. Actualizar develop
git checkout develop
git pull origin develop

# 2. Crear branch de feature
git checkout -b feat/remove-companies-table

# 3. Implementar cambios
# - Editar código
# - Crear cambios de BBDD si es necesario
# - Actualizar seeds
# - Crear/actualizar tests
```

#### 2.2 Cambios de Base de Datos (Si aplica)

Si la feature requiere cambios en BBDD:

```bash
# Cascade crea archivos en:
supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql

# Ejemplo:
supabase/migrations/20260305200000_remove_company_id_from_profiles.sql
supabase/migrations/20260305200001_remove_companies_table.sql
```

**CRÍTICO**: Si el cambio es destructivo (DROP TABLE, DROP COLUMN):

```bash
# 1. Cascade exporta datos ANTES
npx supabase db dump --data-only --table companies > backup_companies_data.sql

# 2. Cascade crea migración de rollback CON DATOS
supabase/migrations/20260305200002_rollback_remove_companies.sql
# (Incluye CREATE TABLE + INSERT statements de datos)
```

#### 2.3 Tests Locales

**Cascade ejecuta automáticamente**:
```bash
npm run lint           # ESLint
npm run test           # Vitest (unit tests)
npm run test:e2e       # Playwright (E2E local)
```

#### 2.4 Commit y Push

**Cascade ejecuta automáticamente**:
```bash
git add .
git commit -m "feat(database): remove companies table

- Remove company_id from profiles table
- Remove company_id from client_accounts table  
- Remove companies table
- Update seeds to reflect changes
- Add rollback migration with data backup
- Update RLS policies

Closes #5"

git push origin feat/remove-companies-table
```

#### 2.5 Crear Pull Request

**Cascade ejecuta automáticamente**:
```bash
gh pr create \
  --base develop \
  --head feat/remove-companies-table \
  --title "[FEATURE] Remove companies table" \
  --label "auto-merge" \
  --body "Implementa eliminación de tabla companies según issue #5

## Cambios realizados
- ✅ Eliminada tabla companies
- ✅ Eliminado company_id de profiles
- ✅ Eliminado company_id de client_accounts
- ✅ Actualizadas políticas RLS
- ✅ Creada migración de rollback con datos

## Plan de rollback
- Migración: 20260305200002_rollback_remove_companies.sql
- Incluye estructura + datos existentes

## Checklist de validación
- [ ] Tests unitarios pasan
- [ ] Tests E2E pasan
- [ ] Migración aplicada en DEV
- [ ] Rollback testeado en DEV

Closes #5"
```

---

### FASE 3: CI/CD en Pull Request

#### 3.1 GitHub Actions - PR Checks
**Actor**: GitHub Actions (Automático)  
**Workflow**: `.github/workflows/pr-checks.yml`

```yaml
┌─────────────────────────────────────────────────────────┐
│ 🏗️ Job 1: Build & Lint                                 │
├─────────────────────────────────────────────────────────┤
│ ✅ npm ci                                               │
│ ✅ npm run lint                                         │
│ ✅ npm run build                                        │
│ ✅ Upload build artifacts                               │
│ ⏱️ Duración: ~3 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🧪 Job 2: Unit Tests (Vitest)                          │
├─────────────────────────────────────────────────────────┤
│ ✅ npm run test:run                                     │
│ ✅ npm run test:coverage                                │
│ ✅ Upload coverage to Codecov                           │
│ ✅ Check coverage threshold (>80%)                      │
│ ⏱️ Duración: ~2 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🎯 Job 3: BDD Tests (Cucumber)                         │
├─────────────────────────────────────────────────────────┤
│ ✅ npm run test:features                                │
│ ✅ Upload BDD test results                              │
│ ⏱️ Duración: ~2 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🤖 Job 4: AI Code Review con Claude                    │
├─────────────────────────────────────────────────────────┤
│ Análisis automático de:                                │
│ ✅ Best practices React/TypeScript                      │
│ ✅ Seguridad (XSS, SQL injection, etc.)                 │
│ ✅ Performance (re-renders, memory leaks)               │
│ ✅ Accesibilidad (a11y)                                 │
│ ✅ Code smells y anti-patterns                          │
│ ✅ Arquitectura y organización                          │
│                                                         │
│ Output:                                                 │
│ - Severidad: CRITICAL, HIGH, MEDIUM, LOW                │
│ - Ubicación exacta del problema                         │
│ - Sugerencia de corrección                             │
│ - Comentario automático en PR                           │
│ ⏱️ Duración: ~1 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🌐 Job 5: E2E Smoke Tests (Playwright)                 │
├─────────────────────────────────────────────────────────┤
│ ✅ npx playwright install --with-deps                   │
│ ✅ npm run build                                        │
│ ✅ npm run test:e2e:smoke                               │
│                                                         │
│ Tests ejecutados:                                       │
│ - tests/e2e/smoke/auth.spec.ts (Login/Logout)          │
│ - tests/e2e/smoke/navigation.spec.ts (Navegación)      │
│ - tests/e2e/smoke/critical-path.spec.ts (Flujo crítico)│
│                                                         │
│ ✅ Upload Playwright report                             │
│ ✅ Upload screenshots/videos (si falla)                 │
│ ⏱️ Duración: ~3 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🔒 Job 6: Security Scan (Snyk)                         │
├─────────────────────────────────────────────────────────┤
│ ✅ Snyk vulnerability scan                              │
│ ✅ Upload SARIF results                                 │
│ ⏱️ Duración: ~2 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🗄️ Job 7: Database Schema Check                        │
├─────────────────────────────────────────────────────────┤
│ ✅ Validate migration files exist                       │
│ ✅ Check SQL syntax                                     │
│ ✅ Verify rollback migration exists                     │
│ ⏱️ Duración: ~1 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 📊 Job 8: Performance Check                            │
├─────────────────────────────────────────────────────────┤
│ ✅ Analyze bundle size                                  │
│ ✅ Check if < 5MB                                       │
│ ⏱️ Duración: ~1 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ✅ Job 9: PR Summary                                    │
├─────────────────────────────────────────────────────────┤
│ ✅ Collect all results                                  │
│ ✅ Comment on PR with summary table                     │
│ ✅ Show pass/fail status                                │
│ ⏱️ Duración: ~30 seg                                    │
└─────────────────────────────────────────────────────────┘

⏱️ Tiempo total: ~15 minutos
```

#### 3.2 Auto-Merge
**Actor**: GitHub Actions (Automático)  
**Workflow**: `.github/workflows/auto-merge-pr.yml`

```
Si TODOS los checks ✅ pasan:
  → Auto-merge feat/remove-companies-table → develop
  → Delete branch feat/remove-companies-table
```

---

### FASE 4: Deploy Automático a DEV

#### 4.1 Deploy a Vercel DEV
**Actor**: GitHub Actions + Vercel (Automático)  
**Workflow**: `.github/workflows/deploy-dev.yml`  
**Trigger**: Push a branch `develop`

```yaml
┌─────────────────────────────────────────────────────────┐
│ 🏗️ Job 1: Build for DEV                                │
├─────────────────────────────────────────────────────────┤
│ ✅ npm ci                                               │
│ ✅ npm run lint                                         │
│ ✅ npm run test:run                                     │
│ ✅ npm run build:dev                                    │
│ ✅ Upload build artifacts                               │
│ ⏱️ Duración: ~5 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🚀 Job 2: Deploy to Vercel DEV                         │
├─────────────────────────────────────────────────────────┤
│ ✅ Deploy to dev.smartroom-rental.vercel.app            │
│ ✅ Wait for deployment ready                            │
│ ✅ Health check (curl /)                                │
│ ⏱️ Duración: ~2 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🗄️ Job 3: Apply Database Changes                       │
├─────────────────────────────────────────────────────────┤
│ ✅ npx supabase db push --project-id lopdwrsmkmtboeczxotj│
│ ✅ Apply static data if needed                          │
│ ⏱️ Duración: ~1 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🌐 Job 4: E2E Tests COMPLETOS contra DEV               │
├─────────────────────────────────────────────────────────┤
│ ✅ npm run test:e2e:dev                                 │
│                                                         │
│ Tests ejecutados (50+ tests):                           │
│ - tests/e2e/dev/auth/*.spec.ts                          │
│   • Login, Register, Password Reset                     │
│ - tests/e2e/dev/properties/*.spec.ts                    │
│   • List, Create, Edit, Delete                          │
│ - tests/e2e/dev/bookings/*.spec.ts                      │
│   • Create booking, Manage bookings                     │
│ - tests/e2e/dev/admin/*.spec.ts                         │
│   • Dashboard, User management                          │
│                                                         │
│ ✅ Upload Playwright report                             │
│ ✅ Upload screenshots/videos                            │
│ ✅ Upload trace files                                   │
│ ⏱️ Duración: ~10 min                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🤖 Job 5: AI Validation con Claude                     │
├─────────────────────────────────────────────────────────┤
│ ✅ Fetch deployment logs                                │
│ ✅ Fetch Vercel metrics                                 │
│ ✅ Fetch Supabase logs                                  │
│                                                         │
│ Claude analiza:                                         │
│ - Logs de errores                                       │
│ - Métricas de performance                               │
│ - Anomalías en comportamiento                           │
│ - Errores críticos                                      │
│                                                         │
│ Output:                                                 │
│ - ✅ Deployment saludable                               │
│ - ⚠️ Warnings detectados                                │
│ - ❌ Problemas críticos                                 │
│ - 📊 Reporte de calidad                                 │
│ ⏱️ Duración: ~2 min                                     │
└─────────────────────────────────────────────────────────┘

⏱️ Tiempo total: ~20 minutos
```

#### 4.2 Validación Manual en DEV
**Actor**: Tú + Cascade  
**Dónde**: Local

**Tú dices**: "Cascade, valida DEV"

**Cascade ejecuta**:
```bash
npm run validate:dev
```

**Cascade muestra**:
```
═══════════════════════════════════════════════════════
💾 Validación Post-Deploy: DEV
═══════════════════════════════════════════════════════

📊 Resultados de E2E Tests:
✅ 52/52 tests passed
✅ 0 tests failed

🤖 Reporte de Claude AI:
✅ Deployment saludable
✅ No se detectaron errores críticos
⚠️ 2 warnings menores (ver detalles)

📋 Checklist Manual:
1. ¿La app carga sin errores? [SI/NO]
2. ¿Las funcionalidades críticas funcionan? [SI/NO]
3. ¿Los cambios de BBDD se aplicaron correctamente? [SI/NO]

Decisión: [OK para continuar / KO para rollback]
```

**Tú decides**: OK o KO

---

### FASE 5: Promoción a STAGING

#### 5.1 Promover a STAGING
**Actor**: Tú + Cascade  
**Dónde**: Local

**Tú dices**: "Cascade, promover a staging"

**Cascade ejecuta**:
```bash
gh pr create \
  --base staging \
  --head develop \
  --title "chore: promote to staging" \
  --label "auto-merge" \
  --body "Promoting develop to staging for validation

## Changes included
- Feature X (issue #5)
- Feature Y (issue #6)

## Validation plan
- Monitor 24-48 hours
- Run full regression tests
- Validate with real-like data"
```

#### 5.2 CI/CD en PR a STAGING
**Actor**: GitHub Actions (Automático)

```
- Ejecuta pr-checks.yml de nuevo
- Si ✅ pasa → Auto-merge develop → staging
```

#### 5.3 Deploy a Vercel STAGING
**Actor**: GitHub Actions + Vercel (Automático)  
**Workflow**: `.github/workflows/deploy-staging.yml`

```yaml
┌─────────────────────────────────────────────────────────┐
│ 🏗️ Build for STAGING                                   │
├─────────────────────────────────────────────────────────┤
│ ✅ npm ci                                               │
│ ✅ npm run build:staging                                │
│ ⏱️ Duración: ~5 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🚀 Deploy to Vercel STAGING                            │
├─────────────────────────────────────────────────────────┤
│ ✅ Deploy to staging.smartroomrentalplatform.com        │
│ ⏱️ Duración: ~2 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🔴 CRITICAL: Backup Data BEFORE Changes                │
├─────────────────────────────────────────────────────────┤
│ ✅ Backup tables affected by migrations                 │
│ ✅ Store backup in safe location                        │
│ ⏱️ Duración: ~2 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🗄️ Apply Database Changes                              │
├─────────────────────────────────────────────────────────┤
│ ✅ npx supabase db push --project-id [STAGING_ID]       │
│ ⏱️ Duración: ~1 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🌐 E2E Regression Tests contra STAGING                 │
├─────────────────────────────────────────────────────────┤
│ ✅ npm run test:e2e:staging                             │
│                                                         │
│ Tests ejecutados:                                       │
│ - Full regression suite (todos los tests)              │
│ - Performance tests                                     │
│ - Load time tests                                       │
│ - Lighthouse audit                                      │
│                                                         │
│ ⏱️ Duración: ~15 min                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🤖 AI Monitoring Setup con Claude                      │
├─────────────────────────────────────────────────────────┤
│ ✅ Setup monitoring job (runs every 6 hours)            │
│                                                         │
│ Claude monitoreará (24-48h):                            │
│ - Logs de errores                                       │
│ - Patrones de uso                                       │
│ - Anomalías en comportamiento                           │
│ - Métricas de performance                               │
│                                                         │
│ Alertas automáticas si detecta:                         │
│ - Errores críticos                                      │
│ - Degradación de performance                            │
│ - Comportamiento anómalo                                │
│ ⏱️ Duración: ~1 min setup                               │
└─────────────────────────────────────────────────────────┘

⏱️ Tiempo total: ~26 minutos
```

#### 5.4 Monitoreo en STAGING (24-48 horas)
**Actor**: Claude AI (Automático) + Tú (Manual)  
**Workflow**: `.github/workflows/claude-monitor-staging.yml` (cron cada 6h)

**Claude AI ejecuta cada 6 horas**:
```
1. Fetch logs de Vercel
2. Fetch logs de Supabase
3. Fetch métricas de performance
4. Analizar patrones
5. Detectar anomalías
6. Generar reporte
7. Alertar si hay problemas
```

**Tú revisas manualmente**:
```
- Probar funcionalidades críticas
- Revisar reportes de Claude
- Monitorear métricas
- Validar con datos realistas
```

#### 5.5 Validación Final STAGING
**Actor**: Tú + Cascade

**Tú dices**: "Cascade, valida staging"

**Cascade ejecuta**:
```bash
npm run validate:staging
```

**Decisión**: OK → Continuar a PRODUCTION | KO → Rollback

---

### FASE 6: Deploy a PRODUCTION

#### 6.1 Promover a PRODUCTION
**Actor**: Tú + Cascade

**Tú dices**: "Cascade, promover a production"

**Cascade ejecuta**:
```bash
gh pr create \
  --base main \
  --head staging \
  --title "chore: promote to production" \
  --body "Promoting staging to production

## Changes validated in staging
- Feature X (issue #5) - ✅ Validated 48h
- Feature Y (issue #6) - ✅ Validated 48h

## Pre-deployment checklist
- [x] All tests passed
- [x] Staging validated 48h
- [x] No critical issues
- [x] Backup plan ready
- [x] Rollback tested

**Requires manual approval before merge**"
```

**IMPORTANTE**: Este PR **NO tiene auto-merge**. Requiere aprobación manual.

#### 6.2 Aprobación Manual
**Actor**: Tú  
**Dónde**: GitHub Web

```
1. Revisar PR en GitHub
2. Verificar que todo está OK
3. Aprobar PR manualmente
4. Merge a main
```

#### 6.3 Deploy a Vercel PRODUCTION
**Actor**: GitHub Actions + Vercel (Automático)  
**Workflow**: `.github/workflows/deploy-production.yml`

```yaml
┌─────────────────────────────────────────────────────────┐
│ 🔴 CRITICAL: Full Backup                               │
├─────────────────────────────────────────────────────────┤
│ ✅ Full database backup                                 │
│ ✅ Backup affected tables data                          │
│ ✅ Save previous deployment ID                          │
│ ⏱️ Duración: ~5 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🚀 Deploy to Vercel PRODUCTION                         │
├─────────────────────────────────────────────────────────┤
│ ✅ Deploy to smartroomrentalplatform.com                │
│ ⏱️ Duración: ~3 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🗄️ Apply Database Changes (MANUAL CONFIRMATION)        │
├─────────────────────────────────────────────────────────┤
│ ⚠️ Requires manual execution:                           │
│ npm run cambios-bbdd:prod                               │
│ (Ejecutar en horario de bajo tráfico)                   │
│ ⏱️ Duración: ~2 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🌐 E2E Smoke Tests (Non-Destructive)                   │
├─────────────────────────────────────────────────────────┤
│ ✅ npm run test:e2e:prod:smoke                          │
│                                                         │
│ Tests ejecutados (solo lectura):                        │
│ - Health check                                          │
│ - Login (test user)                                     │
│ - Navigation                                            │
│ - Read operations only                                  │
│                                                         │
│ ⏱️ Duración: ~3 min                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🤖 AI Real-time Monitoring con Claude (1 hora)         │
├─────────────────────────────────────────────────────────┤
│ Claude monitorea en tiempo real:                        │
│ ✅ Logs de errores (cada 5 min)                         │
│ ✅ Métricas de performance                              │
│ ✅ Tasa de errores                                      │
│ ✅ Latencia de requests                                 │
│ ✅ Comportamiento de usuarios                           │
│                                                         │
│ Alerta INMEDIATA si detecta:                            │
│ - Errores críticos                                      │
│ - Spike de errores                                      │
│ - Degradación severa                                    │
│                                                         │
│ Recomendación automática:                               │
│ - ✅ Deployment OK                                      │
│ - ❌ ROLLBACK RECOMENDADO                               │
│ ⏱️ Duración: 1 hora continua                            │
└─────────────────────────────────────────────────────────┘

⏱️ Tiempo total: ~13 minutos + 1 hora monitoring
```

#### 6.4 Aplicar Cambios de BBDD en PRODUCTION
**Actor**: Tú  
**Dónde**: Local (horario de bajo tráfico)

```bash
npm run cambios-bbdd:prod
```

**El script pregunta**:
```
⚠️  ADVERTENCIA: Ambiente de PRODUCCIÓN
Project ID: lqwyyyttjamirccdtlvl

¿Confirmas que quieres aplicar cambios en PRODUCTION? (SI/NO):
```

**Tú escribes**: SI

#### 6.5 Validación CRÍTICA en PRODUCTION
**Actor**: Tú + Cascade

**Tú dices**: "Cascade, valida production"

**Cascade ejecuta**:
```bash
npm run validate:prod
```

**Cascade muestra**:
```
═══════════════════════════════════════════════════════
🔴 Validación Post-Deploy: PRODUCTION
═══════════════════════════════════════════════════════

🤖 Reporte de Claude AI (Real-time monitoring):
✅ No se detectaron errores críticos
✅ Performance normal
✅ Tasa de errores: 0.1% (normal)
✅ Latencia promedio: 250ms (normal)

📋 Checklist CRÍTICO:
1. ¿La app carga sin errores? [SI/NO]
2. ¿Los usuarios pueden acceder? [SI/NO]
3. ¿Las funcionalidades críticas funcionan? [SI/NO]
4. ¿Los cambios de BBDD se aplicaron correctamente? [SI/NO]
5. ¿No hay errores en logs? [SI/NO]
6. ¿Performance es aceptable? [SI/NO]

Decisión CRÍTICA: [OK / ROLLBACK INMEDIATO]
```

**Tú decides**: OK o ROLLBACK

---

### FASE 7: Cierre

#### 7.1 Cerrar Issue
**Actor**: Tú o Cascade  
**Dónde**: GitHub Web

```
1. GitHub → Issue #5
2. Comentar: "✅ Deployed to production successfully"
3. Cerrar issue
4. Agregar label: deployed
```

#### 7.2 Actualizar Documentación
**Actor**: Cascade

```
- Actualizar CHANGELOG.md
- Actualizar release notes
- Actualizar migration history
```

#### 7.3 Notificar Stakeholders
**Actor**: Tú

```
- Email/Slack a stakeholders
- Comunicar feature deployed
- Documentar cambios para usuarios
```

---

## 🧪 Tests Automáticos Detallados

### Tests en PR Checks

#### Unit Tests (Vitest)
```
Ubicación: tests/unit/**/*.test.ts
Cobertura mínima: 80%
Duración: ~2 min

Ejemplos:
- tests/unit/components/PropertyCard.test.tsx
- tests/unit/hooks/useAuth.test.ts
- tests/unit/utils/formatters.test.ts
```

#### BDD Tests (Cucumber)
```
Ubicación: tests/features/**/*.feature
Duración: ~2 min

Ejemplos:
- tests/features/authentication.feature
- tests/features/booking.feature
- tests/features/property-management.feature
```

#### E2E Smoke Tests (Playwright)
```
Ubicación: tests/e2e/smoke/**/*.spec.ts
Duración: ~3 min
Tests: 5-10 tests críticos

Ejemplos:
- tests/e2e/smoke/auth.spec.ts
- tests/e2e/smoke/navigation.spec.ts
- tests/e2e/smoke/critical-path.spec.ts
```

#### AI Code Review (Claude)
```
Modelo: claude-3-5-sonnet-20241022
Duración: ~1 min

Analiza:
- Best practices
- Seguridad
- Performance
- Accesibilidad
- Code smells
- Arquitectura
```

### Tests en Deploy DEV

#### E2E Full Suite (Playwright)
```
Ubicación: tests/e2e/dev/**/*.spec.ts
Duración: ~10 min
Tests: 50+ tests

Categorías:
- Authentication (login, register, reset password)
- Properties (list, create, edit, delete)
- Bookings (create, manage, cancel)
- Payments (mock Stripe)
- Admin (dashboard, users, settings)
```

#### AI Deployment Validation (Claude)
```
Duración: ~2 min

Analiza:
- Deployment logs
- Error logs
- Performance metrics
- Anomalías
- Health status
```

### Tests en Deploy STAGING

#### E2E Regression Suite (Playwright)
```
Ubicación: tests/e2e/staging/**/*.spec.ts
Duración: ~15 min
Tests: Todos los tests

Incluye:
- Full regression
- Performance tests
- Load time tests
- Lighthouse audit
```

#### AI Continuous Monitoring (Claude)
```
Frecuencia: Cada 6 horas durante 24-48h
Duración: ~2 min por ejecución

Monitorea:
- Error logs
- Usage patterns
- Anomalías
- Performance degradation
```

### Tests en Deploy PRODUCTION

#### E2E Smoke Tests (Playwright)
```
Ubicación: tests/e2e/production/smoke/**/*.spec.ts
Duración: ~3 min
Tests: 3-5 tests no destructivos

Solo lectura:
- Health check
- Login (test user)
- Navigation
- Read operations
```

#### AI Real-time Monitoring (Claude)
```
Duración: 1 hora continua
Frecuencia: Cada 5 minutos

Monitorea:
- Error logs
- Performance metrics
- Error rate
- Request latency
- User behavior

Alerta si detecta problemas críticos
```

---

## 🗄️ Cambios de Base de Datos

### Tipos de Cambios

#### 1. Cambios No Destructivos
```sql
-- No requieren backup de datos
CREATE TABLE nueva_tabla (...);
ALTER TABLE tabla ADD COLUMN nueva_columna tipo;
CREATE INDEX idx_nombre ON tabla(columna);
CREATE POLICY "policy_name" ON tabla ...;
```

**Rollback**: Solo estructura

#### 2. Cambios Destructivos
```sql
-- REQUIEREN backup de datos
DROP TABLE tabla;
DROP COLUMN columna;
TRUNCATE TABLE tabla;
ALTER TABLE tabla DROP CONSTRAINT ...;
```

**Rollback**: Estructura + DATOS

### Proceso para Cambios Destructivos

#### ANTES de crear la migración:

```bash
# 1. Exportar estructura
npx supabase db dump \
  --project-id [PROJECT_ID] \
  --schema public \
  --table [TABLA] \
  > backup_[tabla]_structure.sql

# 2. Exportar DATOS
npx supabase db dump \
  --project-id [PROJECT_ID] \
  --data-only \
  --schema public \
  --table [TABLA] \
  > backup_[tabla]_data.sql
```

#### Crear migración de rollback:

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_rollback_descripcion.sql

-- PASO 1: Recrear estructura
CREATE TABLE IF NOT EXISTS public.tabla (...);

-- PASO 2: Insertar datos existentes
INSERT INTO public.tabla (col1, col2, col3)
VALUES 
  ('val1', 'val2', 'val3'),
  ('val1', 'val2', 'val3');
  -- ... todos los registros

-- PASO 3: Recrear índices
CREATE INDEX IF NOT EXISTS idx_tabla_col ON public.tabla(col);

-- PASO 4: Recrear constraints
ALTER TABLE public.tabla ADD CONSTRAINT ...;

-- PASO 5: Recrear políticas RLS
ALTER TABLE public.tabla ENABLE ROW LEVEL SECURITY;
CREATE POLICY "policy_name" ON public.tabla ...;

-- VERIFICACIÓN
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.tabla) != [N_ESPERADO] THEN
    RAISE WARNING 'Se esperaban [N_ESPERADO] registros';
  END IF;
END $$;
```

### Comandos Disponibles

```bash
# Aplicar cambios
npm run cambios-bbdd:dev
npm run cambios-bbdd:staging
npm run cambios-bbdd:prod

# Backup de datos
npm run backup:data [env] [tabla]

# Generar rollback con datos
npm run generate:rollback:with-data [env] [tabla]

# Rollback solo BBDD
npm run rollback:dev
npm run rollback:staging
npm run rollback:prod

# Rollback completo (Código + BBDD)
npm run rollback:full:dev
npm run rollback:full:staging
npm run rollback:full:prod
```

---

## 🔙 Rollback y Recuperación

### Tipos de Rollback

#### 1. Rollback de Código (Vercel)
```bash
# Revertir a deployment anterior
npm run rollback:code:[env]

# O manualmente en Vercel Dashboard:
# Deployments → Select previous → Promote to Production
```

#### 2. Rollback de BBDD
```bash
# Aplicar migración de rollback
npm run rollback:[env]

# O restaurar desde backup
npx supabase db restore backup_[fecha].sql
```

#### 3. Rollback Completo (Código + BBDD)
```bash
# Rollback de ambos
npm run rollback:full:[env]
```

### Proceso de Rollback

#### En DEV/STAGING:
```bash
# 1. Ejecutar rollback
npm run rollback:full:staging

# 2. Verificar
npm run validate:staging

# 3. Investigar problema
# - Revisar logs
# - Identificar causa
# - Corregir en development
```

#### En PRODUCTION (CRÍTICO):
```bash
# 1. Decisión inmediata
npm run rollback:full:prod

# 2. Confirmar escribiendo: ROLLBACK

# 3. Verificar que funciona
npm run validate:prod

# 4. Notificar stakeholders

# 5. Post-mortem
# - Documentar incidente
# - Causa raíz
# - Plan de corrección
# - Prevención futura
```

---

## ⚡ Comandos Rápidos

### Desarrollo
```bash
# Iniciar desarrollo local
npm run dev

# Tests
npm run lint
npm run test
npm run test:e2e

# Validar
npm run validate:dev
npm run validate:staging
npm run validate:prod
```

### Cambios de BBDD
```bash
# Aplicar cambios
npm run cambios-bbdd:dev
npm run cambios-bbdd:staging
npm run cambios-bbdd:prod

# Backup
npm run backup:data [env] [tabla]

# Rollback
npm run rollback:dev
npm run rollback:staging
npm run rollback:prod
```

### Promoción entre Entornos
```bash
# Cascade ejecuta estos comandos automáticamente
# cuando le dices "promover a [env]"

gh pr create --base staging --head develop --label "auto-merge"
gh pr create --base main --head staging
```

### Rollback Completo
```bash
npm run rollback:full:dev
npm run rollback:full:staging
npm run rollback:full:prod
```

---

## 📊 Tiempos Estimados

| Fase | Tiempo Activo | Tiempo Pasivo | Total |
|------|---------------|---------------|-------|
| **Desarrollo Local** | 2-8 horas | - | 2-8 horas |
| **PR Checks** | - | 15 min | 15 min |
| **Deploy DEV** | 5 min | 20 min | 25 min |
| **Validación DEV** | 10 min | - | 10 min |
| **Deploy STAGING** | 5 min | 26 min | 31 min |
| **Monitoreo STAGING** | 30 min | 24-48 horas | 24-48 horas |
| **Deploy PRODUCTION** | 15 min | 13 min + 1h | 1h 28 min |
| **Validación PROD** | 15 min | - | 15 min |
| **Cierre** | 15 min | - | 15 min |
| **TOTAL** | **3-9 horas** | **25-49 horas** | **28-58 horas** |

**Tiempo activo del desarrollador**: 3-9 horas  
**Tiempo de automatización**: 25-49 horas

---

## 🎯 Checklist Rápido

### Antes de Cada Deploy

- [ ] Tests locales pasan
- [ ] PR checks pasan
- [ ] Cambios de BBDD tienen rollback
- [ ] Rollback testeado en DEV
- [ ] Backup creado (staging/prod)
- [ ] Plan de rollback documentado

### Después de Cada Deploy

- [ ] Validación ejecutada
- [ ] Tests E2E pasan
- [ ] Claude AI no reporta problemas
- [ ] Funcionalidades críticas OK
- [ ] Logs sin errores críticos

### Antes de PRODUCTION

- [ ] Validado 24-48h en STAGING
- [ ] Backup completo creado
- [ ] Rollback plan listo
- [ ] Horario de bajo tráfico
- [ ] Stakeholders notificados

---

## 🔧 Correcciones Aplicadas a Workflows (v2.1)

### Bugs Críticos Corregidos

#### 1. Preview Deploy a Producción ❌→✅
**Problema**: PRs desplegaban a producción en vez de preview  
**Solución**: Eliminado `vercel-args: '--prod'` de `pr-checks.yml`

#### 2. Bug Confirmación Production ❌→✅
**Problema**: Referencia incorrecta en workflow  
**Solución**: Cambiado a `needs.confirm-deployment.outputs` en `deploy-production.yml`

#### 3. Endpoints API Inexistentes ❌→✅
**Problema**: Health checks a `/api/*` que no existen  
**Solución**: Reemplazados por `curl -f https://[URL]/`

#### 4. Migraciones DB No Aplicadas ❌→✅
**Problema**: Comandos comentados  
**Solución**: Implementado `npx supabase db push --project-ref $PROJECT_REF`

### Mejoras Implementadas

- ✅ Añadidas dependencias: `@playwright/test`, `@vitest/coverage-v8`, `@axe-core/playwright`
- ✅ Fix `playwright.config.js` para leer `BASE_URL`
- ✅ Añadido `staging` a branches del PR trigger
- ✅ URLs unificadas a `staging.smartroomrentalplatform.com`
- ✅ Eliminado job Lighthouse CI (no configurado)
- ✅ Creado workflow `auto-merge-pr.yml`
- ✅ Añadido `continue-on-error` a tests con tags inexistentes
- ✅ Eliminado trigger duplicado en `e2e-tests.yml` (solo schedule y manual)
- ✅ Corregida instalación de axe-core (ahora usa `@axe-core/playwright`)

---

## 🔑 Configuración de Secrets en GitHub

**Ubicación**: GitHub Settings > Secrets and variables > Actions

### Secrets Requeridos

```bash
# Vercel
VERCEL_TOKEN                      # Token de Vercel
VERCEL_ORG_ID                     # ID de organización
VERCEL_PROJECT_ID                 # ID del proyecto

# Supabase - Project Refs (para CLI)
DEV_SUPABASE_PROJECT_REF          # lqwyyyttjamirccdtlvl
STAGING_SUPABASE_PROJECT_REF      # lopdwrsmkmtboeczxotj
PRODUCTION_SUPABASE_PROJECT_REF   # oeofdvkilcuidxainuow
SUPABASE_ACCESS_TOKEN             # Token personal de Supabase CLI

# Supabase - URLs y Keys por entorno
DEV_SUPABASE_URL
DEV_SUPABASE_ANON_KEY
STAGING_SUPABASE_URL
STAGING_SUPABASE_ANON_KEY
PRODUCTION_SUPABASE_URL
PRODUCTION_SUPABASE_ANON_KEY

# Stripe
STAGING_STRIPE_PUBLISHABLE_KEY
PRODUCTION_STRIPE_PUBLISHABLE_KEY

# Opcionales
SNYK_TOKEN                        # Para security scans
SLACK_WEBHOOK_URL                 # Para notificaciones
```

### Cómo Obtener los Tokens

**Vercel Token**:
```bash
1. Ir a Vercel Dashboard → Settings → Tokens
2. Create Token → Scope: Full Account
3. Copiar y guardar en GitHub Secrets
```

**Supabase Access Token**:
```bash
1. Ir a Supabase Dashboard → Account → Access Tokens
2. Generate New Token → Name: "GitHub Actions"
3. Copiar y guardar en GitHub Secrets
```

**Supabase Project Refs**:
```bash
# Obtener desde URL del proyecto en Supabase Dashboard
# Ejemplo: https://supabase.com/dashboard/project/lqwyyyttjamirccdtlvl
# Los IDs son:
# DEV: lqwyyyttjamirccdtlvl
# STAGING: lopdwrsmkmtboeczxotj
# PRODUCTION: oeofdvkilcuidxainuow
```

---

## 📝 Notas Importantes

1. **Project IDs Supabase**: DEV=`lqwyyyttjamirccdtlvl`, STAGING=`lopdwrsmkmtboeczxotj`, PROD=`oeofdvkilcuidxainuow`
2. **Auto-merge**: Añade label `auto-merge` a PRs para activar merge automático
3. **Tests con tags**: Jobs tienen `continue-on-error: true` hasta crear tests con `@regression`, `@accessibility`, `@performance`, `@visual`
4. **Errores de lint**: Los warnings sobre `secrets` en workflows son normales y no afectan funcionalidad

---

**Última actualización**: 2026-03-07  
**Versión**: 2.1 (Workflows corregidos y validados)  
**Mantenido por**: Cascade AI
