# Configuración de Producción - Guía Completa

## 🎯 Información del Proyecto

### Producción (NUEVO)
- **Project ID:** `oeofdvkilcuidxainuow`
- **URL:** `https://oeofdvkilcuidxainuow.supabase.co`
- **Entorno:** Production
- **Rama Git:** `master`

### Staging
- **Project ID:** `lopdwrsmkmtboeczxotj`
- **URL:** `https://lopdwrsmkmtboeczxotj.supabase.co`
- **Entorno:** Preview
- **Rama Git:** `staging`

---

## 🚀 Opción 1: Script Automatizado (Recomendado)

```bash
# Desde la raíz del proyecto
cd c:\Users\javie\SmartRoom-Rental\Proyecto\smartroom-rental

# Ejecutar script de setup
bash scripts/setup-production.sh
```

El script hará automáticamente:
- ✅ Link del proyecto producción
- ✅ Aplicar todas las migraciones (9 migraciones)
- ✅ Desplegar Edge Functions (8 funciones)

---

## 🔧 Opción 2: Configuración Manual Paso a Paso

### Paso 1: Link del Proyecto

```bash
npx supabase link --project-ref oeofdvkilcuidxainuow
```

### Paso 2: Aplicar Todas las Migraciones

```bash
npx supabase db push
```

**Esto aplicará las 9 migraciones en orden:**
1. `create_base_schema` - Companies, profiles, funciones RLS
2. `create_plans_catalog` - Catálogo de planes + 4 planes seed
3. `create_client_accounts` - Cuentas de cliente
4. `create_entities` - Entidades (payer/owner)
5. `alter_profiles_add_client_account` - Columnas tenant
6. `rls_new_tables` - RLS para nuevas tablas
7. `adapt_plans_add_stripe_events` - Stripe events
8. `rename_student_to_lodger` - Renombrar rol
9. `complete_rls_policies` - RLS FASE 1 completo

### Paso 3: Verificar Migraciones

```bash
npx supabase migration list --project-ref oeofdvkilcuidxainuow
```

Deberías ver 9 migraciones aplicadas.

### Paso 4: Desplegar Edge Functions

```bash
# Desplegar todas las funciones
npx supabase functions deploy --project-ref oeofdvkilcuidxainuow

# O una por una
npx supabase functions deploy whoami --project-ref oeofdvkilcuidxainuow
npx supabase functions deploy manage_accommodation --project-ref oeofdvkilcuidxainuow
npx supabase functions deploy manage_lodger --project-ref oeofdvkilcuidxainuow
npx supabase functions deploy manage_entity --project-ref oeofdvkilcuidxainuow
npx supabase functions deploy provision_company --project-ref oeofdvkilcuidxainuow
npx supabase functions deploy update_company --project-ref oeofdvkilcuidxainuow
npx supabase functions deploy delete_company --project-ref oeofdvkilcuidxainuow
npx supabase functions deploy wizard_submit --project-ref oeofdvkilcuidxainuow
```

### Paso 5: Verificar Edge Functions

```bash
npx supabase functions list --project-ref oeofdvkilcuidxainuow
```

Deberías ver 8 funciones desplegadas.

---

## 🔐 Configurar Secrets en Supabase

### Obtener Service Role Key

1. Ve a **Supabase Dashboard** → Proyecto `oeofdvkilcuidxainuow`
2. **Settings** → **API**
3. Copia el **service_role key**

### Configurar Secrets

```bash
# Service Role Key (CRÍTICO)
npx supabase secrets set --project-ref oeofdvkilcuidxainuow \
  SUPABASE_SERVICE_ROLE_KEY=[service_role key aquí]

# Stripe PRODUCCIÓN (claves LIVE)
npx supabase secrets set --project-ref oeofdvkilcuidxainuow \
  STRIPE_SECRET_KEY=sk_live_xxx

npx supabase secrets set --project-ref oeofdvkilcuidxainuow \
  STRIPE_WEBHOOK_SECRET=whsec_xxx

# Verificar
npx supabase secrets list --project-ref oeofdvkilcuidxainuow
```

---

## 🌐 Configurar Variables en Vercel

Ve a **Vercel Dashboard** → Proyecto → **Settings** → **Environment Variables**

### Para **Production** (rama master):

| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://oeofdvkilcuidxainuow.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | [anon key de producción] |
| `VITE_FN_PROVISION_COMPANY` | `provision_company` |
| `VITE_FN_UPDATE_COMPANY` | `update_company` |
| `VITE_FN_DELETE_COMPANY` | `delete_company` |
| `VITE_FN_MANAGE_ACCOMMODATION` | `manage_accommodation` |
| `VITE_FN_MANAGE_LODGER` | `manage_lodger` |
| `VITE_FN_MANAGE_ENTITY` | `manage_entity` |
| `VITE_FN_WIZARD_SUBMIT` | `wizard_submit` |
| `VITE_FN_WHOAMI` | `whoami` |
| `VITE_ENABLE_DEBUG` | `false` |

**IMPORTANTE:** Selecciona **Production** como entorno.

---

## 🔒 Configurar Auth URLs en Supabase

Ve a **Supabase Dashboard** → Producción → **Authentication** → **URL Configuration**

### Site URL:
```
https://smartroomrentalplatform.com
```

### Redirect URLs (añadir todas):
```
https://smartroomrentalplatform.com/**
https://*.vercel.app/**
http://localhost:5173/**
http://localhost:3000/**
```

---

## 📊 Configurar Rama de Producción en Vercel

Ve a **Vercel Dashboard** → Proyecto → **Settings** → **Git**

- **Production Branch:** `master`
- **Preview Branches:** `staging`, `develop`

---

## ✅ Verificación Final

### 1. Verificar Migraciones
```bash
npx supabase migration list --project-ref oeofdvkilcuidxainuow
```
✅ Deberías ver 9 migraciones

### 2. Verificar Tablas
```bash
npx supabase db execute --project-ref oeofdvkilcuidxainuow \
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
```
✅ Deberías ver 9 tablas

### 3. Verificar Edge Functions
```bash
npx supabase functions list --project-ref oeofdvkilcuidxainuow
```
✅ Deberías ver 8 funciones

### 4. Verificar Secrets
```bash
npx supabase secrets list --project-ref oeofdvkilcuidxainuow
```
✅ Deberías ver `SUPABASE_SERVICE_ROLE_KEY`

### 5. Verificar Planes Seed
```bash
npx supabase db execute --project-ref oeofdvkilcuidxainuow \
  "SELECT code, name, monthly_price FROM plans_catalog"
```
✅ Deberías ver 4 planes (basic, investor, business, agency)

---

## 🎯 Checklist Completo

- [ ] Proyecto linked con CLI
- [ ] 9 migraciones aplicadas
- [ ] 9 tablas creadas con RLS
- [ ] 4 planes seed insertados
- [ ] 8 Edge Functions desplegadas
- [ ] Secrets configurados (SUPABASE_SERVICE_ROLE_KEY)
- [ ] Stripe keys configurados (LIVE mode)
- [ ] Variables de entorno en Vercel (Production)
- [ ] Auth URLs configuradas
- [ ] Rama master configurada como Production
- [ ] Deploy de producción exitoso
- [ ] Test de login funcionando
- [ ] Test de creación de datos funcionando

---

## 🔍 Troubleshooting

### Error: "Failed to link project"
**Solución:** Verifica que tienes acceso al proyecto en Supabase Dashboard.

### Error: "relation does not exist"
**Solución:** Las migraciones no se aplicaron correctamente.
```bash
npx supabase db push --project-ref oeofdvkilcuidxainuow
```

### Error: Edge Function returns 500
**Solución:** Verifica que los secrets están configurados.
```bash
npx supabase secrets list --project-ref oeofdvkilcuidxainuow
npx supabase functions logs [function-name] --project-ref oeofdvkilcuidxainuow
```

### Error: "Redirect URL not allowed"
**Solución:** Añade la URL de producción a las Redirect URLs en Supabase Auth.

---

## 📊 Comparación de Entornos

| Aspecto | Staging | Producción |
|---------|---------|------------|
| **Project ID** | lopdwrsmkmtboeczxotj | oeofdvkilcuidxainuow |
| **URL** | lopdwrsmkmtboeczxotj.supabase.co | oeofdvkilcuidxainuow.supabase.co |
| **Rama Git** | `staging` | `master` |
| **Vercel Env** | Preview | Production |
| **Datos** | Testing/Demo | Real |
| **Stripe** | Test Mode | **Live Mode** |
| **Debug Logs** | Habilitado | **Deshabilitado** |
| **Site URL** | Vercel Preview URL | smartroomrentalplatform.com |

---

## ⚠️ IMPORTANTE - Producción

1. **Usa claves de Stripe LIVE** (no test)
2. **Desactiva logs de debug** (`VITE_ENABLE_DEBUG=false`)
3. **Configura backups automáticos** en Supabase
4. **Monitorea logs** regularmente
5. **Prueba todo en staging primero**

---

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs de Vercel: **Deployments** → Click en deploy → **Logs**
2. Revisar logs de Supabase: `npx supabase functions logs [function] --project-ref oeofdvkilcuidxainuow`
3. Verificar variables de entorno en Vercel
4. Verificar secrets en Supabase
