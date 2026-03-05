# 🔗 Vercel Integration Setup

Guía para configurar la integración entre GitHub Actions y Vercel para deployments automáticos.

---

## 🎯 Problema Actual

Los workflows de GitHub Actions están creados pero Vercel no está conectado, por lo tanto:
- ❌ Los deployments automáticos no funcionarán
- ❌ Los preview deploys no se crearán
- ❌ Las environment variables no se sincronizarán
- ❌ Los health checks fallarán

---

## 🔧 Solución: GitHub Integration

### Paso 1: Conectar GitHub a Vercel

#### 1.1 Ir a Vercel Dashboard
```
https://vercel.com/dashboard
```

#### 1.2 Importar Proyecto desde GitHub
1. **"Add New..." → "Project"**
2. **"Import Git Repository"**
3. **Buscar**: `javierlealmora-cyber/smartroom-rental`
4. **"Import"**

#### 1.3 Configurar Proyecto
```
Project Name: smartroom-rental
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: dist
Install Command: npm ci
```

#### 1.4 Environment Variables por Entorno

##### Development
```bash
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxx
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
VITE_ENABLE_LOGGING=true
VITE_ENVIRONMENT=development
```

##### Staging
```bash
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxx
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=false
VITE_ENABLE_LOGGING=true
VITE_ENVIRONMENT=staging
```

##### Production
```bash
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxx
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=false
VITE_ENABLE_LOGGING=false
VITE_ENVIRONMENT=production
```

### Paso 2: Configurar GitHub Integration

#### 2.1 Instalar Vercel GitHub App
1. **Vercel Dashboard → Settings → GitHub**
2. **"Install GitHub App"**
3. **Seleccionar repositorio**: `smartroom-rental`
4. **Permitir**: `Read and write` permissions

#### 2.2 Configurar Branches
1. **Vercel Project → Settings → Git**
2. **Production Branch**: `main`
3. **Preview Branches**: `staging`, `develop`
4. **Auto-deploy**: Desactivar (usaremos GitHub Actions)

### Paso 3: Obtener Vercel Credentials para GitHub Actions

#### 3.1 Vercel CLI Setup
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

#### 3.2 GitHub Secrets
```
# GitHub → Repository → Settings → Secrets and variables → Actions
VERCEL_TOKEN=vpc_xxxxxxxxxxxxxx
VERCEL_ORG_ID=org_xxxxxxxxxxxxxx
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxx
```

### Paso 4: Configurar Deployment Protection

#### 4.1 GitHub Branch Protection
1. **GitHub → Repository → Settings → Branches**
2. **"Add rule"** para `main`
3. **Require status checks**: 
   - `deployment/production`
   - `deployment/staging`
   - `tests/unit`
   - `tests/e2e`

#### 4.2 Vercel Deployment Protection
1. **Vercel Project → Settings → Git**
2. **"Require approval for deployments to production"**
3. **"Require approval for deployments to preview"**

---

## 🔄 Flujo de Deployments Configurado

### Development (develop branch)
```
Push to develop → GitHub Actions (deploy-dev.yml) → Vercel Dev
```

### Staging (staging branch)
```
Push to staging → GitHub Actions (deploy-staging.yml) → Vercel Staging
```

### Production (main branch)
```
Push to main → GitHub Actions (deploy-production.yml) → Vercel Production
```

### Pull Requests
```
PR opened → GitHub Actions (pr-checks.yml) → Vercel Preview
```

---

## 🧪 Validación de la Integración

### Test 1: Deploy Automático
```bash
# 1. Hacer un cambio simple
git checkout develop
echo "// Test change" >> src/test.js
git add src/test.js
git commit -m "test: verify deployment"
git push origin develop

# 2. Verificar que se ejecuta deploy-dev.yml
# 3. Verificar deploy en https://dev.smartroom-rental.vercel.app
```

### Test 2: Preview Deploy
```bash
# 1. Crear PR
git checkout -b test-preview
echo "// Preview test" >> src/preview.js
git add src/preview.js
git commit -m "test: preview deploy"
git push origin test-preview

# 2. Crear PR en GitHub
# 3. Verificar preview URL en PR
```

### Test 3: Production Deploy
```bash
# 1. Merge a main (después de pruebas)
git checkout main
git merge develop
git push origin main

# 2. Verificar que pide confirmación "PRODUCTION"
# 3. Verificar deploy en https://smartroomrentalplatform.com
```

---

## 🔍 Troubleshooting

### Error: "Invalid Vercel token"
```
Cause: Token expirado o incorrecto
Solution: Regenerar token en Vercel Dashboard → Settings → Tokens
```

### Error: "Project not found"
```
Cause: Project ID incorrecto o no acceso
Solution: Verificar project ID y permisos del GitHub App
```

### Error: "Build failed"
```
Cause: Build command incorrecto o dependencies faltantes
Solution: Verificar package.json y build command
```

### Error: "Environment variables not found"
```
Cause: Variables no configuradas en Vercel
Solution: Configurar variables en Vercel Dashboard → Settings → Environment Variables
```

---

## 📋 Checklist de Configuración

### Vercel Setup
- [ ] Proyecto importado desde GitHub
- [ ] Build command configurado (`npm run build`)
- [ ] Output directory configurado (`dist`)
- [ ] Environment variables configuradas (21 variables)
- [ ] GitHub App instalado
- [ ] Branches configuradas (main, staging, develop)
- [ ] Auto-deploy desactivado
- [ ] Deployment protection configurada

### GitHub Setup
- [ ] Vercel secrets configurados (3 secrets)
- [ ] Branch protection rules configuradas
- [ ] Status checks requeridos
- [ ] Workflows funcionando

### Integration Test
- [ ] Deploy a development funciona
- [ ] Deploy a staging funciona
- [ ] Preview deploy funciona
- [ ] Production deploy con confirmación
- [ ] Environment variables funcionan
- [ ] Health checks pasan

---

## 🚀 Comandos Útiles

### Vercel CLI
```bash
# Verificar proyectos
npx vercel projects ls

# Verificar deployment
npx vercel ls

# Verificar logs
npx vercel logs

# Re-deploy manual
npx vercel --prod
```

### GitHub CLI
```bash
# Verificar workflows
gh workflow list

# Verificar secrets
gh secret list

# Verificar deployments
gh api repos/javierlealmora-cyber/smartroom-rental/deployments
```

---

## 📊 URLs de Referencia

### Vercel
- **Dashboard**: https://vercel.com/dashboard
- **Project**: https://vercel.com/javierlealmora-cyber/smartroom-rental
- **Settings**: https://vercel.com/javierlealmora-cyber/smartroom-rental/settings
- **Environment Variables**: https://vercel.com/javierlealmora-cyber/smartroom-rental/settings/environment-variables

### GitHub
- **Repository**: https://github.com/javierlealmora-cyber/smartroom-rental
- **Actions**: https://github.com/javierlealmora-cyber/smartroom-rental/actions
- **Settings**: https://github.com/javierlealmora-cyber/smartroom-rental/settings
- **Secrets**: https://github.com/javierlealmora-cyber/smartroom-rental/settings/secrets/actions

### Environments
- **Development**: https://dev.smartroom-rental.vercel.app
- **Staging**: https://staging.smartroom-rental.vercel.app
- **Production**: https://smartroomrentalplatform.com

---

## ⚠️ Notas Importantes

1. **No usar auto-deploy de Vercel**: Usar GitHub Actions para control total
2. **Proteger producción**: Siempre requerir confirmación manual
3. **Monitorear deployments**: Verificar logs y health checks
4. **Rotar tokens**: Actualizar Vercel token regularmente
5. **Backup configuración**: Guardar configuración de variables

---

## ✅ Estado Actual

### Configuración Pendiente
- [ ] Importar proyecto en Vercel desde GitHub
- [ ] Configurar environment variables
- [ ] Instalar Vercel GitHub App
- [ ] Configurar Vercel credentials en GitHub secrets
- [ ] Configurar branch protection
- [ ] Validar integración completa

### Próximos Pasos
1. **Importar proyecto en Vercel**
2. **Configurar variables de entorno**
3. **Instalar GitHub App**
4. **Configurar secrets**
5. **Test deployments automáticos**

---

*Esta configuración es esencial para que los workflows de GitHub Actions funcionen correctamente con Vercel.*
