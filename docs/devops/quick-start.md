# 🚀 Quick Start - Configuración Completa de Entornos

## 📊 Resumen de Proyectos

| Entorno | Project ID | URL | Rama Git | Estado |
|---------|------------|-----|----------|--------|
| **Producción** | `oeofdvkilcuidxainuow` | https://oeofdvkilcuidxainuow.supabase.co | `master` | ⏳ Pendiente |
| **Staging** | `lopdwrsmkmtboeczxotj` | https://lopdwrsmkmtboeczxotj.supabase.co | `staging` | ✅ Configurado |

---

## ⚡ Configuración Rápida de Producción

### Opción 1: Script PowerShell (Windows - Recomendado)

```powershell
cd c:\Users\javie\SmartRoom-Rental\Proyecto\smartroom-rental
.\scripts\setup-production.ps1
```

### Opción 2: Script Bash (Git Bash/WSL)

```bash
cd c:\Users\javie\SmartRoom-Rental\Proyecto\smartroom-rental
bash scripts/setup-production.sh
```

### Opción 3: Comandos Manuales

```bash
# 1. Link proyecto
npx supabase link --project-ref oeofdvkilcuidxainuow

# 2. Aplicar migraciones (9 migraciones)
npx supabase db push

# 3. Desplegar Edge Functions (8 funciones)
npx supabase functions deploy --project-ref oeofdvkilcuidxainuow

# 4. Verificar
npx supabase migration list --project-ref oeofdvkilcuidxainuow
npx supabase functions list --project-ref oeofdvkilcuidxainuow
```

---

## 🔐 Configurar Secrets (CRÍTICO)

### 1. Obtener Service Role Key

Ve a **Supabase Dashboard** → Proyecto Producción → **Settings** → **API** → Copia **service_role key**

### 2. Configurar en Supabase

```bash
npx supabase secrets set --project-ref oeofdvkilcuidxainuow SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

### 3. Configurar Stripe (Producción - LIVE)

```bash
npx supabase secrets set --project-ref oeofdvkilcuidxainuow STRIPE_SECRET_KEY=sk_live_xxx
npx supabase secrets set --project-ref oeofdvkilcuidxainuow STRIPE_WEBHOOK_SECRET=whsec_xxx
```

---

## 🌐 Configurar Vercel

### Variables de Entorno para PRODUCTION

Ve a **Vercel Dashboard** → Proyecto → **Settings** → **Environment Variables**

Selecciona **Production** y añade:

```env
VITE_SUPABASE_URL=https://oeofdvkilcuidxainuow.supabase.co
VITE_SUPABASE_ANON_KEY=[obtener de Supabase Dashboard → Settings → API]
VITE_FN_PROVISION_COMPANY=provision_company
VITE_FN_UPDATE_COMPANY=update_company
VITE_FN_DELETE_COMPANY=delete_company
VITE_FN_MANAGE_ACCOMMODATION=manage_accommodation
VITE_FN_MANAGE_LODGER=manage_lodger
VITE_FN_MANAGE_ENTITY=manage_entity
VITE_FN_WIZARD_SUBMIT=wizard_submit
VITE_FN_WHOAMI=whoami
VITE_ENABLE_DEBUG=false
```

### Variables de Entorno para PREVIEW (Staging)

Selecciona **Preview** y añade:

```env
VITE_SUPABASE_URL=https://lopdwrsmkmtboeczxotj.supabase.co
VITE_SUPABASE_ANON_KEY=[obtener de Supabase Dashboard → Settings → API]
VITE_FN_PROVISION_COMPANY=provision_company
VITE_FN_UPDATE_COMPANY=update_company
VITE_FN_DELETE_COMPANY=delete_company
VITE_FN_MANAGE_ACCOMMODATION=manage_accommodation
VITE_FN_MANAGE_LODGER=manage_lodger
VITE_FN_MANAGE_ENTITY=manage_entity
VITE_FN_WIZARD_SUBMIT=wizard_submit
VITE_FN_WHOAMI=whoami
VITE_ENABLE_DEBUG=true
```

---

## 🔒 Configurar Auth URLs

### Producción

Ve a **Supabase Dashboard** → Producción → **Authentication** → **URL Configuration**

- **Site URL:** `https://smartroomrentalplatform.com`
- **Redirect URLs:**
  ```
  https://smartroomrentalplatform.com/**
  https://*.vercel.app/**
  http://localhost:5173/**
  ```

### Staging

Ve a **Supabase Dashboard** → Staging → **Authentication** → **URL Configuration**

- **Site URL:** [URL de Vercel Preview]
- **Redirect URLs:**
  ```
  https://*.vercel.app/**
  http://localhost:5173/**
  ```

---

## ✅ Checklist de Verificación

### Producción
- [ ] Proyecto linked (`npx supabase link --project-ref oeofdvkilcuidxainuow`)
- [ ] 9 migraciones aplicadas (`npx supabase db push`)
- [ ] 8 Edge Functions desplegadas
- [ ] Service Role Key configurado
- [ ] Stripe keys configurados (LIVE mode)
- [ ] Variables en Vercel (Production)
- [ ] Auth URLs configuradas
- [ ] Deploy exitoso en Vercel
- [ ] Test de producción funcionando

### Staging
- [x] Proyecto linked
- [x] 9 migraciones aplicadas
- [x] Tablas creadas con RLS
- [ ] Variables en Vercel (Preview)
- [ ] Auth URLs configuradas
- [ ] Deploy exitoso en Vercel

---

## 🔍 Comandos de Verificación

```bash
# Ver migraciones aplicadas
npx supabase migration list --project-ref oeofdvkilcuidxainuow

# Ver tablas creadas
npx supabase db execute --project-ref oeofdvkilcuidxainuow "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"

# Ver Edge Functions
npx supabase functions list --project-ref oeofdvkilcuidxainuow

# Ver secrets configurados
npx supabase secrets list --project-ref oeofdvkilcuidxainuow

# Ver planes seed
npx supabase db execute --project-ref oeofdvkilcuidxainuow "SELECT code, name, monthly_price FROM plans_catalog"
```

---

## 📚 Documentación Completa

- **`PRODUCTION-SETUP-GUIDE.md`** - Guía detallada de producción
- **`STAGING-CONFIGURATION-COMPLETE.md`** - Resumen de staging
- **`STAGING-SETUP-INSTRUCTIONS.md`** - Guía detallada de staging
- **`docs/DEPLOYMENT.md`** - Guía de deployment en Vercel

---

## 🎯 Próximos Pasos

1. **Ejecutar script de producción** (`setup-production.ps1` o `setup-production.sh`)
2. **Configurar secrets** en Supabase
3. **Configurar variables** en Vercel (Production y Preview)
4. **Configurar Auth URLs** en Supabase
5. **Deploy a master** para activar producción
6. **Probar aplicación** en producción

---

## ⚠️ IMPORTANTE

- **Producción usa Stripe LIVE** - Verifica las claves
- **Desactiva debug en producción** - `VITE_ENABLE_DEBUG=false`
- **Prueba todo en staging primero** antes de deploy a master
- **Configura backups** en Supabase Dashboard

---

## 📞 Troubleshooting

### Error: "Failed to link project"
```bash
# Verifica que tienes acceso al proyecto en Supabase Dashboard
# Intenta con --debug
npx supabase link --project-ref oeofdvkilcuidxainuow --debug
```

### Error: "relation does not exist"
```bash
# Las migraciones no se aplicaron
npx supabase db push --project-ref oeofdvkilcuidxainuow
```

### Error: Edge Function 500
```bash
# Verifica secrets
npx supabase secrets list --project-ref oeofdvkilcuidxainuow
# Ver logs
npx supabase functions logs whoami --project-ref oeofdvkilcuidxainuow
```
