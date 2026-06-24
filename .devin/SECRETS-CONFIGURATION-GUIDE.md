# 🔐 Secrets Configuration Guide

Guía completa para configurar los secrets necesarios en GitHub y Vercel para los workflows del SDLC.

---

## 🎯 Overview

Los workflows de GitHub Actions necesitan acceso a:
- **Vercel**: Para deployments y preview environments
- **Supabase**: Para database operations y auth
- **Stripe**: Para pagos y suscripciones
- **Integraciones**: Slack, Codecov, Snyk, Email

---

## 🔑 GitHub Secrets Configuration

### 1. Vercel Configuration

#### Obtener Vercel Credentials

```bash
# 1. Login en Vercel CLI
npx vercel login

# 2. Obtener Organization ID
npx vercel projects ls
# Output: org_xxxxxxxxxxxxxx

# 3. Obtener Project ID
npx vercel link
# Output: prj_xxxxxxxxxxxxxx

# 4. Crear Personal Access Token
# Vercel Dashboard → Settings → Tokens
# Token: vpc_xxxxxxxxxxxxxx
```

#### GitHub Secrets - Vercel

```yaml
# GitHub → Repository → Settings → Secrets and variables → Actions
VERCEL_TOKEN=vpc_xxxxxxxxxxxxxx
VERCEL_ORG_ID=org_xxxxxxxxxxxxxx
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxx
```

### 2. Supabase Configuration

#### Obtener Supabase Credentials

```bash
# 1. Development Environment
# Supabase Dashboard → Project → Settings → API
DEV_SUPABASE_URL=https://dev-project.supabase.co
DEV_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 2. Staging Environment
# Supabase Dashboard → Staging Project → Settings → API
STAGING_SUPABASE_URL=https://staging-project.supabase.co
STAGING_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 3. Production Environment
# Supabase Dashboard → Production Project → Settings → API
PRODUCTION_SUPABASE_URL=https://prod-project.supabase.co
PRODUCTION_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### GitHub Secrets - Supabase

```yaml
DEV_SUPABASE_URL=https://dev-project.supabase.co
DEV_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STAGING_SUPABASE_URL=https://staging-project.supabase.co
STAGING_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PRODUCTION_SUPABASE_URL=https://prod-project.supabase.co
PRODUCTION_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Stripe Configuration

#### Obtener Stripe Keys

```bash
# 1. Staging Environment
# Stripe Dashboard → Developers → API Keys
STAGING_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxx

# 2. Production Environment
# Stripe Dashboard → Developers → API Keys
PRODUCTION_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxx
```

#### GitHub Secrets - Stripe

```yaml
STAGING_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxx
PRODUCTION_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxx
```

### 4. Integration Services

#### Snyk Security Scanning

```bash
# 1. Crear cuenta en Snyk
# 2. Conectar GitHub repository
# 3. Obtener token
# Snyk Account → Account Settings → API Token
SNYK_TOKEN=snYk_xxxxxxxxxxxxxx
```

#### Slack Notifications

```bash
# 1. Crear Slack App
# Slack → Apps → Create New App → Incoming Webhooks
# 2. Activar Incoming Webhooks
# 3. Crear Webhook URL
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR_SLACK_WEBHOOK_URL
```

#### Codecov Coverage

```bash
# 1. Conectar GitHub repository a Codecov
# 2. Upload token
# Codecov Dashboard → Repository → Settings
LHCI_GITHUB_APP_TOKEN=v1.xxxxxxxxxxxxxx
```

#### Email Notifications

```bash
# 1. Configurar servicio de email (SendGrid, AWS SES, etc.)
# 2. Obtener credentials
EMAIL_SENDER=smtp://user:password@smtp.example.com:587
```

---

## 🌐 Vercel Environment Variables

### 1. Development Environment

#### Vercel Dashboard → Project → Settings → Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxx

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
VITE_ENABLE_LOGGING=true

# Environment
NODE_ENV=development
VITE_ENVIRONMENT=development
```

### 2. Staging Environment

```bash
# Supabase
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxx

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=false
VITE_ENABLE_LOGGING=true

# Environment
NODE_ENV=production
VITE_ENVIRONMENT=staging
```

### 3. Production Environment

```bash
# Supabase
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxx

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=false
VITE_ENABLE_LOGGING=false

# Environment
NODE_ENV=production
VITE_ENVIRONMENT=production
```

---

## 🔧 Configuración Paso a Paso

### Paso 1: GitHub Secrets

1. **Ir al repository**: https://github.com/javierlealmora-cyber/smartroom-rental
2. **Settings → Secrets and variables → Actions**
3. **"New repository secret"** para cada secret

#### Lista Completa de Secrets:

```yaml
# Vercel
VERCEL_TOKEN=vpc_xxxxxxxxxxxxxx
VERCEL_ORG_ID=org_xxxxxxxxxxxxxx
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxx

# Supabase
DEV_SUPABASE_URL=https://dev-project.supabase.co
DEV_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STAGING_SUPABASE_URL=https://staging-project.supabase.co
STAGING_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PRODUCTION_SUPABASE_URL=https://prod-project.supabase.co
PRODUCTION_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
STAGING_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxx
PRODUCTION_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxx

# Integraciones
SNYK_TOKEN=snYk_xxxxxxxxxxxxxx
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR_SLACK_WEBHOOK_URL
LHCI_GITHUB_APP_TOKEN=v1.xxxxxxxxxxxxxx
EMAIL_SENDER=smtp://user:password@smtp.example.com:587
```

### Paso 2: Vercel Environment Variables

1. **Ir a Vercel Dashboard**: https://vercel.com/dashboard
2. **Seleccionar proyecto**: smartroom-rental
3. **Settings → Environment Variables**
4. **Configurar por entorno**:

#### Development Variables:
```bash
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxx
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
VITE_ENABLE_LOGGING=true
NODE_ENV=development
VITE_ENVIRONMENT=development
```

#### Staging Variables:
```bash
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxx
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=false
VITE_ENABLE_LOGGING=true
NODE_ENV=production
VITE_ENVIRONMENT=staging
```

#### Production Variables:
```bash
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxx
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=false
VITE_ENABLE_LOGGING=false
NODE_ENV=production
VITE_ENVIRONMENT=production
```

---

## ✅ Validación de Configuración

### 1. GitHub Actions Test

```bash
# 1. Crear un PR de prueba
# 2. Verificar que pr-checks.yml se ejecuta
# 3. Validar que todos los secrets funcionan
```

### 2. Vercel Deployment Test

```bash
# 1. Hacer push a develop
# 2. Verificar deploy-dev.yml se ejecuta
# 3. Validar que el deploy funciona
```

### 3. Environment Variables Test

```bash
# 1. Acceder a cada entorno
# Development: https://dev.smartroom-rental.vercel.app
# Staging: https://staging.smartroom-rental.vercel.app
# Production: https://smartroomrentalplatform.com

# 2. Verificar console.log de variables
# 3. Validar que Supabase y Stripe funcionan
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. Vercel Token Invalid
```
Error: Invalid Vercel token
Solution: Regenerar token en Vercel Dashboard
```

#### 2. Supabase Connection Failed
```
Error: Invalid Supabase URL or key
Solution: Verificar URL y keys en Supabase Dashboard
```

#### 3. Stripe API Key Invalid
```
Error: Invalid Stripe API key
Solution: Verificar modo test/live y key correcta
```

#### 4. Slack Webhook Failed
```
Error: Slack webhook failed
Solution: Verificar webhook URL y permisos del bot
```

### Debug Commands

```bash
# Verificar GitHub Secrets
gh secret list

# Verificar Vercel CLI
npx vercel whoami

# Verificar Supabase CLI
npx supabase projects list

# Test environment variables
curl https://dev.smartroom-rental.vercel.app/api/env-check
```

---

## 📋 Checklist de Configuración

### GitHub Secrets
- [ ] VERCEL_TOKEN configurado
- [ ] VERCEL_ORG_ID configurado
- [ ] VERCEL_PROJECT_ID configurado
- [ ] DEV_SUPABASE_URL configurado
- [ ] DEV_SUPABASE_ANON_KEY configurado
- [ ] STAGING_SUPABASE_URL configurado
- [ ] STAGING_SUPABASE_ANON_KEY configurado
- [ ] PRODUCTION_SUPABASE_URL configurado
- [ ] PRODUCTION_SUPABASE_ANON_KEY configurado
- [ ] STAGING_STRIPE_PUBLISHABLE_KEY configurado
- [ ] PRODUCTION_STRIPE_PUBLISHABLE_KEY configurado
- [ ] SNYK_TOKEN configurado
- [ ] SLACK_WEBHOOK_URL configurado
- [ ] LHCI_GITHUB_APP_TOKEN configurado
- [ ] EMAIL_SENDER configurado

### Vercel Environment Variables
- [ ] Development variables configuradas
- [ ] Staging variables configuradas
- [ ] Production variables configuradas
- [ ] Feature flags configurados
- [ ] Environment indicators configurados

### Validación
- [ ] PR checks funcionan
- [ ] Deploy a development funciona
- [ ] Deploy a staging funciona
- [ ] Deploy a production funciona
- [ ] E2E tests ejecutan
- [ ] Slack notifications llegan
- [ ] Codecov reporta coverage

---

## 🔄 Mantenimiento

### Rotación de Secrets
- **Vercel Token**: Cada 90 días
- **Supabase Keys**: Anualmente o si hay compromiso
- **Stripe Keys**: Anualmente
- **Snyk Token**: Anualmente

### Actualización de Variables
- **Feature flags**: Según necesidades del negocio
- **API endpoints**: Cuando cambian servicios
- **Terceros**: Cuando actualizan APIs

### Monitoring
- **GitHub Actions**: Verificar ejecuciones exitosas
- **Vercel**: Monitorear deployments
- **Supabase**: Verificar conexión y límites
- **Slack**: Validar notificaciones

---

## 📞 Soporte

### Documentación
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Supabase Authentication](https://supabase.com/docs/guides/auth)
- [Stripe API Keys](https://stripe.com/docs/keys)

### Contactos
- **GitHub Issues**: Para problemas con workflows
- **Vercel Support**: Para problemas de deployment
- **Supabase Support**: Para problemas de database
- **Slack Channel**: #devops para equipo

---

## ✅ Estado Actual

### Configuración Pendiente
- [ ] GitHub secrets por configurar
- [ ] Vercel environment variables por configurar
- [ ] Integraciones por conectar (Snyk, Slack, Codecov)

### Próximos Pasos
1. **Configurar GitHub secrets**
2. **Configurar Vercel variables**
3. **Validar con PR de prueba**
4. **Test deployments automáticos**
5. **Documentar cualquier ajuste**

---

## 📝 Notas Importantes

1. **Nunca compartir secrets** en código o commits
2. **Usar tokens específicos** por entorno
3. **Rotar secrets regularmente**
4. **Monitorear acceso y uso**
5. **Tener backup de configuración**

---

*Esta guía debe ser actualizada cada vez que se añaden nuevos servicios o se modifican las configuraciones existentes.*
