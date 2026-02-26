# Configuración Completa de Staging - Instrucciones Paso a Paso

## 🎯 Objetivo
Configurar completamente el entorno de staging de Supabase para testing antes de producción.

---

## 📋 Información del Entorno

### Staging
- **Project ID:** `lopdwrsmkmtboeczxotj`
- **URL:** `https://lopdwrsmkmtboeczxotj.supabase.co`

### Producción
- **Project ID:** `lqwyyyttjamirccdtlvl`
- **URL:** `https://lqwyyyttjamirccdtlvl.supabase.co`

---

## 🚀 Opción 1: Script Automatizado (Recomendado)

```bash
# Desde la raíz del proyecto
cd c:\Users\javie\SmartRoom-Rental\Proyecto\smartroom-rental

# Ejecutar script de setup
bash scripts/deploy-staging-quick.sh
```

El script hará automáticamente:
- ✅ Link del proyecto staging
- ✅ Aplicar todas las migraciones
- ✅ Desplegar Edge Functions

---

## 🔧 Opción 2: Configuración Manual

### Paso 1: Obtener Credenciales de Staging

Ve a **Supabase Dashboard** → Proyecto Staging (lopdwrsmkmtboeczxotj) → **Settings** → **API**

Copia estos valores:
```
Project URL: https://lopdwrsmkmtboeczxotj.supabase.co
anon key: [copiar de dashboard]
service_role key: [copiar de dashboard - SECRETO]
```

---

### Paso 2: Configurar Variables en Vercel

Ve a **Vercel Dashboard** → smartroom-rental → **Settings** → **Environment Variables**

#### Añadir para **Preview** (rama staging):

| Variable | Valor |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://lopdwrsmkmtboeczxotj.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | [anon key de staging] |
| `VITE_FN_PROVISION_COMPANY` | `provision_company` |
| `VITE_FN_UPDATE_COMPANY` | `update_company` |
| `VITE_FN_DELETE_COMPANY` | `delete_company` |
| `VITE_FN_MANAGE_ACCOMMODATION` | `manage_accommodation` |
| `VITE_FN_MANAGE_LODGER` | `manage_lodger` |
| `VITE_FN_MANAGE_ENTITY` | `manage_entity` |
| `VITE_FN_WIZARD_SUBMIT` | `wizard_submit` |
| `VITE_FN_WHOAMI` | `whoami` |
| `VITE_ENABLE_DEBUG` | `true` |

**IMPORTANTE:** Selecciona **Preview** como entorno, NO Production.

---

### Paso 3: Aplicar Migraciones con CLI

```bash
# Link del proyecto
npx supabase link --project-ref lopdwrsmkmtboeczxotj

# Aplicar todas las migraciones
npx supabase db push

# Verificar que se aplicaron
npx supabase migration list --project-ref lopdwrsmkmtboeczxotj
```

**Migraciones que se aplicarán (10 total):**
1. ✅ `20260122_fix_rls_recursion.sql` - Políticas RLS base
2. ✅ `20260126_add_contact_fields_companies.sql` - Campos de contacto
3. ✅ `20260211120000_create_plans_catalog.sql` - Catálogo de planes
4. ✅ `20260211120001_create_client_accounts.sql` - Cuentas de cliente
5. ✅ `20260211120002_create_entities.sql` - Entidades
6. ✅ `20260211120003_alter_profiles.sql` - Actualizar profiles
7. ✅ `20260211120004_rls_new_tables.sql` - RLS para nuevas tablas
8. ✅ `20260213120000_adapt_plans_add_stripe_events.sql` - Stripe events
9. ✅ `20260214120000_rename_student_to_lodger.sql` - Renombrar student
10. ✅ `20260226_complete_rls_policies.sql` - Completar RLS (FASE 1)

---

### Paso 4: Desplegar Edge Functions

```bash
# Desplegar todas las funciones
npx supabase functions deploy --project-ref lopdwrsmkmtboeczxotj

# Verificar deployment
npx supabase functions list --project-ref lopdwrsmkmtboeczxotj
```

**Edge Functions a desplegar (8 total):**
- ✅ `provision_company`
- ✅ `update_company`
- ✅ `delete_company`
- ✅ `manage_accommodation`
- ✅ `manage_lodger`
- ✅ `manage_entity`
- ✅ `wizard_submit`
- ✅ `whoami`

---

### Paso 5: Configurar Secrets

```bash
# Service Role Key (CRÍTICO)
npx supabase secrets set --project-ref lopdwrsmkmtboeczxotj \
  SUPABASE_SERVICE_ROLE_KEY=[service_role key de dashboard]

# Si usas Stripe (opcional para staging)
npx supabase secrets set --project-ref lopdwrsmkmtboeczxotj \
  STRIPE_SECRET_KEY=sk_test_xxx

npx supabase secrets set --project-ref lopdwrsmkmtboeczxotj \
  STRIPE_WEBHOOK_SECRET=whsec_xxx

# Verificar secrets
npx supabase secrets list --project-ref lopdwrsmkmtboeczxotj
```

---

### Paso 6: Configurar Auth URLs

Ve a **Supabase Dashboard** → Staging → **Authentication** → **URL Configuration**

#### Site URL:
```
https://smartroom-rental-git-staging-javierlealmora-3633s-projects.vercel.app
```
(o la URL que Vercel asigne a staging)

#### Redirect URLs (añadir todas):
```
https://smartroom-rental-git-staging-javierlealmora-3633s-projects.vercel.app/**
https://*.vercel.app/**
http://localhost:5173/**
http://localhost:3000/**
```

---

### Paso 7: Configurar Rama de Producción en Vercel

Ve a **Vercel Dashboard** → Proyecto → **Settings** → **Git**

- **Production Branch:** `master`
- **Preview Branches:** `staging`, `develop`

---

## ✅ Verificación Final

### 1. Verificar Migraciones
```bash
npx supabase migration list --project-ref lopdwrsmkmtboeczxotj
```
Deberías ver 10 migraciones aplicadas.

### 2. Verificar Edge Functions
```bash
npx supabase functions list --project-ref lopdwrsmkmtboeczxotj
```
Deberías ver 8 funciones desplegadas.

### 3. Verificar Secrets
```bash
npx supabase secrets list --project-ref lopdwrsmkmtboeczxotj
```
Deberías ver `SUPABASE_SERVICE_ROLE_KEY` configurado.

### 4. Test de Deploy en Vercel

1. Ve a **Vercel Dashboard** → **Deployments**
2. Busca el deploy de la rama `staging`
3. Click en la URL del deploy
4. Verificar que la app carga correctamente

### 5. Test de Funcionalidad

1. Abrir la URL de staging
2. Intentar hacer login (debería funcionar)
3. Verificar que los datos se cargan correctamente
4. Crear un registro de prueba
5. Verificar que se guarda en la base de datos de staging

---

## 🔍 Troubleshooting

### Error: "Failed to link project"
**Solución:** Verifica que tienes acceso al proyecto en Supabase Dashboard.

### Error: "relation does not exist"
**Solución:** Las migraciones no se aplicaron correctamente.
```bash
npx supabase db push --project-ref lopdwrsmkmtboeczxotj
```

### Error: Edge Function returns 500
**Solución:** Verifica que los secrets están configurados.
```bash
npx supabase secrets list --project-ref lopdwrsmkmtboeczxotj
npx supabase functions logs [function-name] --project-ref lopdwrsmkmtboeczxotj
```

### Error: "Redirect URL not allowed"
**Solución:** Añade la URL de Vercel a las Redirect URLs en Supabase Auth.

### Error: Vercel build falla
**Solución:** Verifica que las variables de entorno están configuradas en Vercel para Preview.

---

## 📊 Comparación Entornos

| Aspecto | Staging | Producción |
|---------|---------|------------|
| **Rama Git** | `staging` | `master` |
| **Supabase Project** | lopdwrsmkmtboeczxotj | lqwyyyttjamirccdtlvl |
| **Vercel Environment** | Preview | Production |
| **Datos** | Testing/Demo | Real |
| **Stripe** | Test Mode | Live Mode |
| **Debug Logs** | Habilitado | Deshabilitado |

---

## 🎯 Checklist Completo

- [ ] Credenciales de Supabase staging copiadas
- [ ] Variables de entorno configuradas en Vercel (Preview)
- [ ] Proyecto linked con CLI
- [ ] 10 migraciones aplicadas
- [ ] 8 Edge Functions desplegadas
- [ ] Secrets configurados (SUPABASE_SERVICE_ROLE_KEY)
- [ ] Auth URLs configuradas
- [ ] Rama de producción configurada en Vercel (master)
- [ ] Deploy de staging exitoso en Vercel
- [ ] Test de login funcionando
- [ ] Test de creación de datos funcionando

---

## 📞 Soporte

Si encuentras problemas:
1. Revisar logs de Vercel: **Deployments** → Click en deploy → **Logs**
2. Revisar logs de Supabase: `npx supabase functions logs [function] --project-ref lopdwrsmkmtboeczxotj`
3. Verificar variables de entorno en Vercel
4. Verificar secrets en Supabase
