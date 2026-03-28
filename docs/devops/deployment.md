# Deployment - SmartRoom Rental

**Consolidado desde:** `docs/DEPLOYMENT.md`  
**Última actualización:** 2026-03-28  
**Versión:** 1.0

---

## 📊 Proyectos Supabase

| Entorno | Project ID | URL |
|---------|------------|-----|
| **Development** | `lqwyyyttjamirccdtlvl` | https://lqwyyyttjamirccdtlvl.supabase.co |
| **Staging** | `lopdwrsmkmtboeczxotj` | https://lopdwrsmkmtboeczxotj.supabase.co |
| **Production** | `oeofdvkilcuidxainuow` | https://oeofdvkilcuidxainuow.supabase.co |

---

## 🌳 Estructura de Ramas

```
main (producción)  ← Deploy automático a producción
  ↑
staging            ← Deploy automático a staging (pre-producción)
  ↑
develop            ← Desarrollo local
```

**Regla:** Todo el trabajo nuevo va en `develop` → PR → `staging` → PR → `main`

---

## 🌍 Entornos de Deployment

### 🔵 Development (Local)

- **Rama:** `develop`
- **Frontend:** http://localhost:5173
- **Supabase:** Project `lqwyyyttjamirccdtlvl`
- **Propósito:** Desarrollo local
- **Variables:** `.env.local`

### 🟡 Staging (Pre-producción)

- **Rama:** `staging`
- **URL Frontend:** https://smartroom-rental-staging.vercel.app
- **Supabase:** Project `lopdwrsmkmtboeczxotj`
- **Propósito:** Testing de features antes de producción
- **Variables:** Configuradas en Vercel Dashboard

### 🟢 Production

- **Rama:** `main`
- **URL Frontend:** https://smartroomrentalplatform.com
- **Supabase:** Project `oeofdvkilcuidxainuow`
- **Propósito:** Aplicación en vivo para usuarios finales
- **Variables:** Configuradas en Vercel Dashboard

---

## 🔄 Flujo de Trabajo

### 1. Desarrollo Local

```bash
# Trabajar en rama develop
git checkout develop

# Hacer cambios y commits
git add .
git commit -m "feat: nueva funcionalidad"

# Push a develop
git push origin develop
```

### 2. Deploy a Staging

```bash
# Merge develop a staging
git checkout staging
git merge develop

# Resolver conflictos si existen
# git mergetool

# Push a staging (deploy automático)
git push origin staging
```

**Vercel detectará el push y desplegará automáticamente a staging.**

### 3. Testing en Staging

**Checklist de verificación:**
- [ ] Verificar funcionalidad nueva
- [ ] Ejecutar tests: `npm run test:run`
- [ ] Verificar que no hay bugs críticos
- [ ] Revisar `tests/defects/OPEN-DEFECTS.md`
- [ ] Verificar logs en Vercel
- [ ] Verificar logs en Supabase

### 4. Deploy a Producción

```bash
# Si staging está OK, merge a main
git checkout main
git merge staging

# Push a main (deploy automático a producción)
git push origin main
```

**Vercel detectará el push y desplegará automáticamente a producción.**

---

## ⚙️ Configuración de Variables de Entorno

### Variables Comunes

Todas las variables deben configurarse en Vercel Dashboard para cada proyecto.

**Staging:**
```env
VITE_SUPABASE_URL=https://lopdwrsmkmtboeczxotj.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key_de_staging>
VITE_STRIPE_PUBLISHABLE_KEY=<pk_test_...>
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=false
```

**Production:**
```env
VITE_SUPABASE_URL=https://oeofdvkilcuidxainuow.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key_de_production>
VITE_STRIPE_PUBLISHABLE_KEY=<pk_live_...>
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=false
```

### Cómo Configurar en Vercel

1. Ir a Vercel Dashboard → Proyecto → Settings → Environment Variables
2. Añadir variables para el entorno correspondiente:
   - **Preview:** Para staging
   - **Production:** Para producción
3. Guardar cambios
4. Re-deploy si es necesario

---

## 🚀 Proceso de Deployment Completo

### Deployment a Staging

```bash
# 1. Asegurar que develop está actualizado
git checkout develop
git pull origin develop

# 2. Crear rama de feature (si es nueva funcionalidad)
git checkout -b feature/nueva-funcionalidad

# 3. Desarrollar y commitear
git add .
git commit -m "feat: implementar nueva funcionalidad"

# 4. Push de feature
git push origin feature/nueva-funcionalidad

# 5. Crear PR de feature → develop
# (En GitHub UI)

# 6. Tras aprobación, merge a develop
git checkout develop
git pull origin develop

# 7. Merge develop a staging
git checkout staging
git pull origin staging
git merge develop

# 8. Push a staging (trigger auto-deploy)
git push origin staging

# 9. Verificar deployment en Vercel
# URL: https://smartroom-rental-staging.vercel.app
```

### Deployment a Production

```bash
# 1. Verificar que staging está OK
# - Tests pasando
# - Sin bugs críticos
# - Funcionalidad verificada

# 2. Merge staging a main
git checkout main
git pull origin main
git merge staging

# 3. Push a main (trigger auto-deploy)
git push origin main

# 4. Verificar deployment en Vercel
# URL: https://smartroomrentalplatform.com

# 5. Monitorear logs y métricas
# - Vercel Dashboard
# - Supabase Dashboard
# - Sentry (si configurado)
```

---

## 🔍 Verificación Post-Deployment

### Checklist de Verificación

**Frontend:**
- [ ] Página carga correctamente
- [ ] Login funciona
- [ ] Navegación funciona
- [ ] No hay errores en consola
- [ ] Assets cargan correctamente (imágenes, CSS)

**Backend:**
- [ ] Edge Functions responden
- [ ] Base de datos accesible
- [ ] RLS funciona correctamente
- [ ] Storage accesible

**Integración:**
- [ ] Auth flow completo funciona
- [ ] CRUD operations funcionan
- [ ] Stripe (si aplica) funciona
- [ ] Emails se envían correctamente

### Comandos de Verificación

```bash
# Ver logs de Vercel
vercel logs <deployment-url>

# Ver logs de Supabase Edge Function
supabase functions logs <function-name> --project-ref <project-id>

# Ejecutar tests E2E contra staging
npm run test:e2e:staging

# Ejecutar tests E2E contra production (smoke tests)
npm run test:e2e:smoke
```

---

## 🔙 Rollback

### Rollback en Vercel

**Opción 1: Desde Dashboard**
1. Ir a Vercel Dashboard → Proyecto → Deployments
2. Encontrar deployment anterior estable
3. Click en "..." → "Promote to Production"

**Opción 2: Desde Git**
```bash
# Revertir último commit en main
git checkout main
git revert HEAD
git push origin main

# O revertir a commit específico
git checkout main
git reset --hard <commit-hash>
git push origin main --force
```

### Rollback en Supabase

**Migraciones:**
```bash
# Revertir última migración
supabase db reset --project-ref <project-id>

# O aplicar migración específica
supabase db push --project-ref <project-id> --include-all --up-to <migration-version>
```

**Edge Functions:**
```bash
# Deploy versión anterior
git checkout <previous-commit>
supabase functions deploy <function-name> --project-ref <project-id>
git checkout main
```

---

## 📊 Monitoreo

### Métricas a Monitorear

**Vercel:**
- Build time
- Deployment status
- Error rate
- Response time

**Supabase:**
- Database connections
- Edge Function invocations
- Storage usage
- API requests

### Herramientas

- **Vercel Analytics:** Métricas de performance
- **Supabase Dashboard:** Métricas de backend
- **Sentry:** Error tracking (opcional)
- **LogRocket:** Session replay (opcional)

---

## 🚨 Troubleshooting

### Build Falla en Vercel

**Problema:** Build falla con error de dependencias

**Solución:**
```bash
# Limpiar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
npm run build

# Si funciona localmente, verificar versión de Node en Vercel
# Settings → General → Node.js Version
```

### Edge Function No Responde

**Problema:** Edge Function retorna 500

**Solución:**
```bash
# Ver logs
supabase functions logs <function-name> --project-ref <project-id>

# Verificar variables de entorno en Supabase Dashboard
# Settings → Edge Functions → Secrets

# Re-deploy function
supabase functions deploy <function-name> --project-ref <project-id>
```

### RLS Bloquea Queries

**Problema:** Queries retornan vacío o error de permisos

**Solución:**
```sql
-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'nombre_tabla';

-- Verificar que usuario tiene client_account_id
SELECT client_account_id FROM profiles WHERE id = auth.uid();

-- Temporalmente deshabilitar RLS para debug (SOLO EN DEV)
ALTER TABLE nombre_tabla DISABLE ROW LEVEL SECURITY;
```

---

## 📝 Checklist de Deployment

### Pre-Deployment

- [ ] Tests locales pasando
- [ ] Código revisado (PR aprobado)
- [ ] Migraciones probadas en dev
- [ ] Variables de entorno configuradas
- [ ] Changelog actualizado

### Durante Deployment

- [ ] Build exitoso en Vercel
- [ ] Migraciones aplicadas en Supabase
- [ ] Edge Functions desplegadas
- [ ] Verificación de smoke tests

### Post-Deployment

- [ ] Verificación funcional completa
- [ ] Logs sin errores críticos
- [ ] Métricas normales
- [ ] Notificar al equipo
- [ ] Actualizar documentación si aplica

---

## 🔗 Referencias

- **Vercel Config:** `docs/devops/vercel-config.md`
- **Edge Functions:** `docs/devops/edge-functions.md`
- **Secrets:** `docs/devops/secrets.md`
- **Environments:** `docs/devops/environments.md`

---

**Consolidado desde:** `docs/DEPLOYMENT.md`  
**Última actualización:** 2026-03-28  
**Versión:** 1.0
