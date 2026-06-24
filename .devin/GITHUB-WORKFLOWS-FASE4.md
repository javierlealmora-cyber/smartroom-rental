# 🚀 GitHub Workflows - FASE 4 SDLC

Workflows de GitHub Actions implementados para CI/CD en SmartRoom Rental.

---

## 🗂️ Estructura de Workflows

```
.github/
└── workflows/
    ├── pr-checks.yml           # CI en Pull Requests
    ├── deploy-dev.yml          # Deploy a desarrollo
    ├── deploy-staging.yml      # Deploy a staging
    ├── deploy-production.yml   # Deploy a producción
    └── e2e-tests.yml          # Suite de E2E tests
```

---

## 📋 pr-checks.yml - CI en Pull Requests

### Triggers
- Pull Request a `main` y `develop`
- Eventos: `opened`, `synchronize`, `reopened`

### Jobs

#### 🏗️ Build & Lint
- Checkout y setup Node.js 20
- Install dependencies con cache
- Lint con ESLint
- Build para producción
- Upload artifacts para reutilizar

#### 🧪 Unit Tests
- Ejecutar tests unitarios
- Generar reporte de coverage
- Validar threshold >= 80%
- Upload a Codecov

#### 🎯 BDD Tests
- Ejecutar tests BDD (features)
- Upload resultados y coverage

#### 🌐 E2E Smoke Tests
- Instalar Playwright browsers
- Ejecutar tests smoke (@smoke)
- Upload resultados y screenshots

#### 🔒 Security Scan
- Snyk security scan
- Upload SARIF a GitHub

#### 🗄️ Database Schema Check
- Validar archivos de migración
- Sintaxis SQL básica
- Solo se ejecuta si hay cambios en DB

#### ⚡ Performance Check
- Analizar tamaño del bundle
- Validar límites (< 5MB)

#### 📊 PR Summary
- Descargar todos los artifacts
- Crear comentario en PR con resultados
- Tabla de status de todos los checks

#### 🚀 Preview Deploy
- Deploy automático a Vercel Preview
- URL única por PR: `pr-{number}.smartroom-rental.vercel.app`
- Comentario con preview URL

### Características
- **Paralelización**: Jobs corren en paralelo cuando es posible
- **Cache**: Dependencies y build artifacts cacheados
- **Conditional**: Jobs específicos según labels o cambios
- **Reporting**: Comentarios automáticos en PRs

---

## 🚀 deploy-dev.yml - Deploy a Desarrollo

### Triggers
- Push a `develop`
- Workflow dispatch con opción de force deploy

### Jobs

#### 🧪 Test & Build
- Tests unitarios y lint
- Build para desarrollo
- Upload artifacts

#### 🚀 Deploy
- Deploy a Vercel Development
- Health check post-deploy
- Smoke tests contra dev

#### 🗄️ Database Update
- Aplicar migraciones si hay cambios
- Aplicar datos estáticos si hay cambios

#### 📢 Notify Team
- Slack notification
- GitHub Release (opcional)
- Deployment status

### Environment
- **URL**: `https://dev.smartroom-rental.vercel.app`
- **Variables**: DEV_SUPABASE_URL, DEV_SUPABASE_ANON_KEY
- **Protection**: Sin protección (desarrollo)

---

## 🎯 deploy-staging.yml - Deploy a Staging

### Triggers
- Push a `staging`
- Workflow dispatch con opciones avanzadas

### Jobs

#### 🧪 Comprehensive Tests
- Unit tests con coverage
- BDD tests
- E2E smoke tests
- Upload resultados

#### 🔒 Security & Performance
- Security audit
- Snyk scan
- Bundle size analysis
- Lighthouse CI

#### 🗄️ Database Operations
- Validar y aplicar migraciones
- Validar y aplicar datos estáticos
- Verificar estado de DB

#### 🏗️ Build & Deploy
- Build para staging
- Deploy a Vercel Staging
- Health checks extensivos
- Smoke tests contra staging

#### 🔍 Post-Deployment Validation
- Validar flujos críticos
- Verificar conectividad DB
- Validar performance

#### 📊 Notify & Report
- Reporte completo de deployment
- Slack notification
- GitHub Issue si falla
- Dashboard updates

### Environment
- **URL**: `https://staging.smartroom-rental.vercel.app`
- **Variables**: STAGING_SUPABASE_URL, STAGING_SUPABASE_ANON_KEY
- **Protection**: Protegido con checks requeridos

---

## 🏭 deploy-production.yml - Deploy a Producción

### Triggers
- Push a `main`
- Workflow dispatch con confirmación manual

### Jobs

#### ✅ Confirm Deployment
- Confirmación manual: escribir "PRODUCTION"
- Solo para workflow dispatch

#### 🔍 Pre-deployment Checks
- Health check de staging
- Validar aprobaciones requeridas
- Verificar issues bloqueantes
- Validar backups de DB

#### 🧪 Comprehensive Tests
- Suite completa de tests
- Coverage report
- Upload resultados extensivos

#### 🔒 Security & Compliance
- Security audit
- Snyk scan
- TruffleHog (secrets detection)
- GDPR y compliance checks

#### 🗄️ Database Operations
- **Backup automático** antes de migraciones
- Validación estricta de migraciones
- Validación de datos estáticos
- Verificación post-migración

#### 🏗️ Build & Deploy
- Build para producción
- Deploy a Vercel Production
- Health checks extensivos
- Smoke tests contra producción

#### 🔍 Post-Deployment Validation
- Validar flujos críticos
- Verificar conectividad DB
- Validar performance (< 2s)
- Validar security headers
- Validar analytics

#### 🔄 Rollback (si es necesario)
- Opción de rollback automático
- Notificación de rollback
- Issue creation

#### 📊 Notify & Report
- Reporte completo
- Slack notification
- Email notification
- GitHub Release
- Issue creation si falla
- Dashboard updates

### Environment
- **URL**: `https://smartroomrentalplatform.com`
- **Variables**: PRODUCTION_SUPABASE_URL, PRODUCTION_SUPABASE_ANON_KEY
- **Protection**: Máxima protección con confirmación manual

---

## 🧪 e2e-tests.yml - Suite de E2E Tests

### Triggers
- Push a `main`, `develop`, `staging`
- Pull Request
- Schedule diario (2 AM UTC)
- Workflow dispatch

### Jobs

#### 🏗️ Setup & Build
- Build aplicación
- Determinar entorno de testing
- Deploy preview para PRs

#### 🚪 Smoke Tests
- Browsers: Chromium, Firefox, WebKit
- Tests con tag @smoke
- Paralelización por browser

#### 🔄 Regression Tests
- Browsers: Chromium, Firefox
- Tests con tag @regression
- Validación de funcionalidades existentes

#### ♿ Accessibility Tests
- Browser: Chromium
- Tests con tag @accessibility
- Integración con axe-core

#### ⚡ Performance Tests
- Browser: Chromium
- Tests con tag @performance
- Integración con Lighthouse

#### 👁️ Visual Regression Tests
- Browser: Chromium
- Tests con tag @visual
- Comparación de screenshots

#### 📊 Test Results Summary
- Consolidar resultados de todos los jobs
- Comentario en PR con resumen
- Upload de artifacts

#### 📢 Notify on Failure
- Slack notification si falla
- GitHub Issue automático
- Detalles de tests fallidos

#### 🧹 Cleanup
- Cleanup de preview deployments

### Características
- **Paralelización**: Tests corren en paralelo por browser
- **Flexibilidad**: Opción de ejecutar suites específicas
- **Reporting**: Reportes detallados y consolidados
- **Automatización**: Schedule diario y triggers automáticos

---

## 🔧 Configuración y Secrets

### Secrets Requeridos

#### Vercel
```
VERCEL_TOKEN=vercel_token
VERCEL_ORG_ID=vercel_org_id
VERCEL_PROJECT_ID=vercel_project_id
```

#### Supabase
```
DEV_SUPABASE_URL=https://dev.supabase.co
DEV_SUPABASE_ANON_KEY=dev_anon_key
STAGING_SUPABASE_URL=https://staging.supabase.co
STAGING_SUPABASE_ANON_KEY=staging_anon_key
PRODUCTION_SUPABASE_URL=https://prod.supabase.co
PRODUCTION_SUPABASE_ANON_KEY=prod_anon_key
```

#### Stripe
```
STAGING_STRIPE_PUBLISHABLE_KEY=pk_staging
PRODUCTION_STRIPE_PUBLISHABLE_KEY=pk_production
```

#### Integraciones
```
SNYK_TOKEN=snyk_token
SLACK_WEBHOOK_URL=slack_webhook
LHCI_GITHUB_APP_TOKEN=lhci_token
EMAIL_SENDER=email_config
```

### Variables de Entorno

#### Generales
```
NODE_VERSION=20
CACHE_VERSION=v1
PLAYWRIGHT_BROWSERS=chromium firefox webkit
```

#### Específicas por Entorno
```
VERCEL_ENV=development|staging|production
SUPABASE_ENV=development|staging|production
```

---

## 📊 Métricas y Monitoring

### KPIs de Deployments
- **Deployment Frequency**: Frecuencia de deployments
- **Lead Time**: Tiempo desde commit a producción
- **Change Failure Rate**: % de deployments que fallan
- **Mean Time to Recovery**: Tiempo para recuperar de fallos

### KPIs de Tests
- **Test Coverage**: Cobertura de código
- **Test Pass Rate**: % de tests que pasan
- **Test Duration**: Tiempo de ejecución de tests
- **Flaky Tests Rate**: % de tests inconsistentes

### Alerts y Thresholds
- **Deployment Failure**: Alerta inmediata a Slack
- **Test Failure**: Issue automático en GitHub
- **Performance Degradation**: Alerta si load time > 2s
- **Security Vulnerability**: Alerta crítica

---

## 🔄 Integración con SDLC

### Pull Request Workflow
1. **Developer** crea PR
2. **CI** ejecuta pr-checks.yml
3. **Preview** deploy automático
4. **Tests** E2E contra preview
5. **Review** manual con checklist
6. **Merge** a main/develop

### Development Workflow
1. **Push** a develop
2. **CI** ejecuta tests
3. **Deploy** automático a dev
4. **Smoke tests** contra dev
5. **Notificación** al equipo

### Staging Workflow
1. **Push** a staging
2. **CI** ejecuta suite completa
3. **Security** y performance checks
4. **Deploy** a staging
5. **Validación** completa
6. **Aprobación** para producción

### Production Workflow
1. **Push** a main
2. **Pre-deployment** checks
3. **Confirmación** manual
4. **Deploy** a producción
5. **Validación** exhaustiva
6. **Monitoring** post-deploy

---

## 🛡️ Security y Compliance

### Security Measures
- **Secrets Management**: GitHub Secrets encryption
- **Vulnerability Scanning**: Snyk y npm audit
- **Secrets Detection**: TruffleHog scanning
- **Dependency Checks**: Audit de dependencias

### Compliance
- **GDPR**: Validación de protección de datos
- **Accessibility**: Tests WCAG compliance
- **Performance**: Lighthouse CI integration
- **Code Quality**: ESLint y coverage requirements

### Backup y Recovery
- **Database Backups**: Automáticos antes de cambios
- **Rollback Capability**: Opción de rollback rápido
- **Disaster Recovery**: Procedimientos documentados

---

## 📈 Mejores Prácticas

### Para Developers
1. **Commits descriptivos** con cambios relevantes
2. **Tags en tests** (@smoke, @regression, @accessibility)
3. **Environment variables** correctamente configuradas
4. **Tests locales** antes de push

### Para Ops
1. **Secrets rotación** regular
2. **Monitoring** de métricas clave
3. **Alert configuration** optimizada
4. **Documentation** actualizada

### Para QA
1. **Test cases** bien definidos
2. **Regression suite** mantenida
3. **Performance baselines** establecidos
4. **Accessibility standards** seguidos

---

## ✅ FASE 4 Completada

### Implementación
- ✅ 5 workflows creados y configurados
- ✅ CI/CD completo implementado
- ✅ Integración con Vercel, Supabase, Slack
- ✅ Security y compliance checks
- ✅ Monitoring y alerting

### Beneficios
- 🚀 **Automatización completa** del deployment
- 🛡️ **Security checks** automáticos
- 📊 **Métricas y monitoring** integrados
- 🔄 **Rollback capability** inmediato
- 📋 **Reporting** detallado

### Próximo Paso
**FASE 5**: Quality Gates y métricas avanzadas para asegurar calidad en cada etapa del proceso.

---

## 📝 Notas para Claude AI

1. **Revisar workflows** antes de ejecutar deployments
2. **Validar secrets** configurados correctamente
3. **Verificar environment variables** por entorno
4. **Monitorear execution logs** para troubleshooting
5. **Documentar cualquier cambio** en los workflows

---

## 🔗 Referencias

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vercel Deployment Guide](https://vercel.com/docs)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- [Playwright Testing](https://playwright.dev/)
- [SmartRoom SDLC Plan](./sdlc-enterprise-saas-9f1066.md)
- [Testing Structure](./ESTRUCTURA-TESTING-FASE1.md)
- [Issue Templates](./GITHUB-ISSUE-TEMPLATES-FASE2.md)
- [PR Template](./PULL-REQUEST-TEMPLATE-FASE3.md)
