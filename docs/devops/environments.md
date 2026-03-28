# Entornos - SmartRoom Rental

**Última actualización:** 2026-03-28  
**Versión:** 1.0

---

## 🌍 Entornos Disponibles

SmartRoom Rental utiliza 3 entornos separados para desarrollo, testing y producción.

---

## 🔵 Development (Local)

### Propósito
Desarrollo local en máquina del desarrollador.

### Configuración

**Frontend:**
- **URL:** http://localhost:5173
- **Framework:** Vite dev server
- **Hot reload:** Habilitado

**Backend:**
- **Supabase Project:** `lqwyyyttjamirccdtlvl`
- **URL:** https://lqwyyyttjamirccdtlvl.supabase.co
- **Database:** PostgreSQL (compartido con otros devs)

**Variables de Entorno:**
```env
# .env.local
VITE_SUPABASE_URL=https://lqwyyyttjamirccdtlvl.supabase.co
VITE_SUPABASE_ANON_KEY=<dev-anon-key>
DEV_SUPABASE_SERVICE_KEY=<dev-service-key>
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
```

### Comandos

```bash
# Iniciar dev server
npm run dev

# Ejecutar tests
npm run test

# Aplicar migraciones locales
supabase db push --project-ref lqwyyyttjamirccdtlvl
```

### Características

- ✅ Hot module replacement (HMR)
- ✅ Source maps completos
- ✅ Debug mode habilitado
- ✅ Analytics deshabilitado
- ✅ Logs verbose en consola

---

## 🟡 Staging (Pre-producción)

### Propósito
Testing de features antes de producción. Ambiente lo más similar posible a producción.

### Configuración

**Frontend:**
- **URL:** https://smartroom-rental-staging.vercel.app
- **Deployment:** Automático desde rama `staging`
- **CDN:** Vercel Edge Network

**Backend:**
- **Supabase Project:** `lopdwrsmkmtboeczxotj`
- **URL:** https://lopdwrsmkmtboeczxotj.supabase.co
- **Database:** PostgreSQL dedicado

**Variables de Entorno:**
```env
# Configuradas en Vercel Dashboard
VITE_SUPABASE_URL=https://lopdwrsmkmtboeczxotj.supabase.co
VITE_SUPABASE_ANON_KEY=<staging-anon-key>
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=false
```

### Deployment

```bash
# Merge develop a staging
git checkout staging
git merge develop
git push origin staging

# Vercel auto-deploya
# Verificar en: https://smartroom-rental-staging.vercel.app
```

### Características

- ✅ Build optimizado
- ✅ Source maps limitados
- ✅ Debug mode deshabilitado
- ✅ Analytics deshabilitado
- ✅ Logs normales
- ✅ Password protection desactivada (para tests E2E)

### Testing

```bash
# Ejecutar tests E2E contra staging
npm run test:e2e:staging

# Ejecutar smoke tests
npm run test:e2e:smoke
```

---

## 🟢 Production

### Propósito
Aplicación en vivo para usuarios finales.

### Configuración

**Frontend:**
- **URL:** https://smartroomrentalplatform.com
- **Deployment:** Automático desde rama `main`
- **CDN:** Vercel Edge Network

**Backend:**
- **Supabase Project:** `oeofdvkilcuidxainuow`
- **URL:** https://oeofdvkilcuidxainuow.supabase.co
- **Database:** PostgreSQL dedicado

**Variables de Entorno:**
```env
# Configuradas en Vercel Dashboard
VITE_SUPABASE_URL=https://oeofdvkilcuidxainuow.supabase.co
VITE_SUPABASE_ANON_KEY=<prod-anon-key>
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=false
```

### Deployment

```bash
# Merge staging a main
git checkout main
git merge staging
git push origin main

# Vercel auto-deploya
# Verificar en: https://smartroomrentalplatform.com
```

### Características

- ✅ Build optimizado y minificado
- ✅ Source maps deshabilitados
- ✅ Debug mode deshabilitado
- ✅ Analytics habilitado
- ✅ Logs mínimos (solo errores)
- ✅ SSL/HTTPS automático
- ✅ Dominio custom configurado

### Monitoreo

- Vercel Analytics
- Supabase Dashboard
- Error tracking (Sentry - opcional)

---

## 📊 Comparación de Entornos

| Característica | Development | Staging | Production |
|----------------|-------------|---------|------------|
| **URL** | localhost:5173 | staging.vercel.app | smartroomrentalplatform.com |
| **Supabase Project** | lqwyyyttjamirccdtlvl | lopdwrsmkmtboeczxotj | oeofdvkilcuidxainuow |
| **Stripe** | Test keys | Test keys | Live keys |
| **Analytics** | ❌ | ❌ | ✅ |
| **Debug** | ✅ | ❌ | ❌ |
| **Source Maps** | Completos | Limitados | ❌ |
| **Hot Reload** | ✅ | ❌ | ❌ |
| **Build** | Dev | Optimizado | Optimizado |
| **SSL** | ❌ | ✅ | ✅ |
| **CDN** | ❌ | ✅ | ✅ |
| **Deployment** | Manual | Auto (staging) | Auto (main) |

---

## 🔄 Flujo de Promoción

```
Development (local)
    ↓ git push origin develop
Staging (auto-deploy)
    ↓ Testing + QA
    ↓ git merge staging → main
Production (auto-deploy)
```

### Criterios para Promoción a Production

**Checklist obligatorio:**
- [ ] Tests E2E pasando en staging
- [ ] No hay bugs críticos abiertos
- [ ] Funcionalidad verificada manualmente
- [ ] Performance aceptable
- [ ] Logs sin errores críticos
- [ ] Aprobación de Product Owner
- [ ] Documentación actualizada

---

## 🔐 Gestión de Secretos por Entorno

### Development
- **Ubicación:** `.env.local` (no commitear)
- **Acceso:** Solo desarrollador local
- **Rotación:** No requerida

### Staging
- **Ubicación:** Vercel Dashboard → Environment Variables (Preview)
- **Acceso:** Team con acceso a Vercel
- **Rotación:** Cada 6 meses

### Production
- **Ubicación:** Vercel Dashboard → Environment Variables (Production)
- **Acceso:** Solo admins
- **Rotación:** Cada 6 meses o tras incidente

---

## 🗄️ Base de Datos por Entorno

### Development
- **Compartida:** Sí (entre desarrolladores)
- **Migraciones:** Aplicar manualmente
- **Seed data:** Disponible
- **Backups:** Automáticos (Supabase)

### Staging
- **Compartida:** No (dedicada)
- **Migraciones:** Aplicar antes de merge a staging
- **Seed data:** Datos de prueba realistas
- **Backups:** Automáticos (Supabase)

### Production
- **Compartida:** No (dedicada)
- **Migraciones:** Aplicar con proceso controlado
- **Seed data:** Solo datos iniciales necesarios
- **Backups:** Automáticos + manuales antes de cambios críticos

---

## 📝 Configuración Específica por Entorno

### Supabase Auth

**Development:**
```
Site URL: http://localhost:5173
Redirect URLs:
  - http://localhost:5173/**
  - http://localhost:3000/**
```

**Staging:**
```
Site URL: https://smartroom-rental-staging.vercel.app
Redirect URLs:
  - https://smartroom-rental-staging.vercel.app/**
```

**Production:**
```
Site URL: https://smartroomrentalplatform.com
Redirect URLs:
  - https://smartroomrentalplatform.com/**
  - http://localhost:5173/** (para desarrollo)
```

### Edge Functions

**Variables de entorno en Supabase:**

**Development/Staging:**
```
STRIPE_SECRET_KEY=sk_test_...
SITE_URL=https://smartroom-rental-staging.vercel.app
```

**Production:**
```
STRIPE_SECRET_KEY=sk_live_...
SITE_URL=https://smartroomrentalplatform.com
```

---

## 🚨 Troubleshooting por Entorno

### Development

**Problema:** "Cannot connect to Supabase"

**Solución:**
```bash
# Verificar .env.local
cat .env.local | grep VITE_SUPABASE_URL

# Verificar conectividad
curl https://lqwyyyttjamirccdtlvl.supabase.co
```

### Staging

**Problema:** "Build fails on Vercel"

**Solución:**
1. Verificar variables de entorno en Vercel Dashboard
2. Verificar logs de build en Vercel
3. Probar build localmente: `npm run build`

### Production

**Problema:** "Users report errors"

**Solución:**
1. Verificar logs en Vercel Dashboard
2. Verificar logs en Supabase Dashboard
3. Verificar métricas de error rate
4. Considerar rollback si es crítico

---

## 🔗 Referencias

- **Deployment:** `docs/devops/deployment.md`
- **Secrets:** `docs/devops/secrets.md`
- **Vercel Config:** `docs/devops/vercel-config.md`

---

**Última actualización:** 2026-03-28  
**Versión:** 1.0
