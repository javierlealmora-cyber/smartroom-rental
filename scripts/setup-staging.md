# Setup Staging Environment - Supabase

Guía para configurar completamente el entorno de staging de Supabase.

## Información del Proyecto Staging

- **Project ID:** lopdwrsmkmtboeczxotj
- **URL:** https://lopdwrsmkmtboeczxotj.supabase.co
- **Región:** (verificar en dashboard)

---

## Paso 1: Link del Proyecto Staging (CLI)

```bash
# Navegar al directorio del proyecto
cd c:\Users\javie\SmartRoom-Rental\Proyecto\smartroom-rental

# Link al proyecto staging
npx supabase link --project-ref lopdwrsmkmtboeczxotj

# Esto te pedirá la contraseña de la base de datos
```

---

## Paso 2: Aplicar Migraciones

```bash
# Aplicar todas las migraciones locales a staging
npx supabase db push

# Esto aplicará automáticamente todas las migraciones en orden:
# - 20260122_fix_rls_recursion.sql
# - 20260126_add_contact_fields_companies.sql
# - 20260211120000_create_plans_catalog.sql
# - 20260211120001_create_client_accounts.sql
# - 20260211120002_create_entities.sql
# - 20260211120003_alter_profiles.sql
# - 20260211120004_rls_new_tables.sql
# - 20260213120000_adapt_plans_add_stripe_events.sql
# - 20260214120000_rename_student_to_lodger.sql
# - 20260226_complete_rls_policies.sql
```

---

## Paso 3: Configurar Secrets en Supabase Dashboard

Ve a **Supabase Dashboard** → Proyecto Staging → **Settings** → **API**

### Copiar estos valores:

1. **Project URL:** `https://lopdwrsmkmtboeczxotj.supabase.co`
2. **anon/public key:** (copiar de dashboard)
3. **service_role key:** (copiar de dashboard - ⚠️ NUNCA exponer en frontend)

---

## Paso 4: Configurar Variables de Entorno en Vercel

Ve a **Vercel Dashboard** → Proyecto → **Settings** → **Environment Variables**

### Para Preview (Staging):

```bash
VITE_SUPABASE_URL=https://lopdwrsmkmtboeczxotj.supabase.co
VITE_SUPABASE_ANON_KEY=[copiar anon key de Supabase dashboard]

# Edge Functions
VITE_FN_PROVISION_COMPANY=provision_company
VITE_FN_UPDATE_COMPANY=update_company
VITE_FN_DELETE_COMPANY=delete_company
VITE_FN_MANAGE_ACCOMMODATION=manage_accommodation
VITE_FN_MANAGE_LODGER=manage_lodger
VITE_FN_MANAGE_ENTITY=manage_entity
VITE_FN_WIZARD_SUBMIT=wizard_submit
VITE_FN_WHOAMI=whoami

# Opcional
VITE_ENABLE_DEBUG=true
NODE_ENV=staging
```

---

## Paso 5: Desplegar Edge Functions a Staging

```bash
# Desplegar todas las Edge Functions
npx supabase functions deploy --project-ref lopdwrsmkmtboeczxotj

# O desplegar una por una:
npx supabase functions deploy provision_company --project-ref lopdwrsmkmtboeczxotj
npx supabase functions deploy update_company --project-ref lopdwrsmkmtboeczxotj
npx supabase functions deploy delete_company --project-ref lopdwrsmkmtboeczxotj
npx supabase functions deploy manage_accommodation --project-ref lopdwrsmkmtboeczxotj
npx supabase functions deploy manage_lodger --project-ref lopdwrsmkmtboeczxotj
npx supabase functions deploy manage_entity --project-ref lopdwrsmkmtboeczxotj
npx supabase functions deploy wizard_submit --project-ref lopdwrsmkmtboeczxotj
npx supabase functions deploy whoami --project-ref lopdwrsmkmtboeczxotj
```

---

## Paso 6: Configurar Secrets para Edge Functions

```bash
# Configurar secrets necesarios para Edge Functions
npx supabase secrets set --project-ref lopdwrsmkmtboeczxotj \
  SUPABASE_SERVICE_ROLE_KEY=[copiar service_role key de dashboard]

# Si usas Stripe en staging:
npx supabase secrets set --project-ref lopdwrsmkmtboeczxotj \
  STRIPE_SECRET_KEY=[tu stripe test key]

npx supabase secrets set --project-ref lopdwrsmkmtboeczxotj \
  STRIPE_WEBHOOK_SECRET=[tu stripe webhook secret]
```

---

## Paso 7: Configurar Auth en Supabase

Ve a **Supabase Dashboard** → Staging → **Authentication** → **URL Configuration**

### Site URL:
```
https://smartroom-rental-staging.vercel.app
```
(o la URL que Vercel asigne a staging)

### Redirect URLs (añadir):
```
https://smartroom-rental-staging.vercel.app/**
http://localhost:5173/**
http://localhost:3000/**
```

---

## Paso 8: Seed Data (Opcional)

Si necesitas datos de prueba en staging:

```bash
# Crear un archivo de seed
# supabase/seed.sql

# Aplicar seed
npx supabase db reset --project-ref lopdwrsmkmtboeczxotj
```

---

## Verificación

### 1. Verificar Migraciones
```bash
npx supabase migration list --project-ref lopdwrsmkmtboeczxotj
```

### 2. Verificar Edge Functions
```bash
npx supabase functions list --project-ref lopdwrsmkmtboeczxotj
```

### 3. Verificar Secrets
```bash
npx supabase secrets list --project-ref lopdwrsmkmtboeczxotj
```

### 4. Test de Conexión
```bash
# Desde el proyecto, ejecutar:
npm run dev

# Cambiar temporalmente .env.local para apuntar a staging:
# VITE_SUPABASE_URL=https://lopdwrsmkmtboeczxotj.supabase.co
# VITE_SUPABASE_ANON_KEY=[anon key de staging]

# Verificar que la app se conecta correctamente
```

---

## Troubleshooting

### Error: "relation does not exist"
- Verificar que las migraciones se aplicaron: `npx supabase migration list`
- Re-aplicar migraciones: `npx supabase db push`

### Error: Edge Function no responde
- Verificar que los secrets están configurados
- Ver logs: `npx supabase functions logs [function-name] --project-ref lopdwrsmkmtboeczxotj`

### Error: Auth redirect no funciona
- Verificar que la Site URL y Redirect URLs están configuradas en Supabase Auth
- Verificar que Vercel tiene las variables de entorno correctas

---

## Comandos Útiles

```bash
# Ver logs de Edge Functions
npx supabase functions logs whoami --project-ref lopdwrsmkmtboeczxotj

# Ver estado de la base de datos
npx supabase db diff --project-ref lopdwrsmkmtboeczxotj

# Ejecutar query en staging
npx supabase db execute --project-ref lopdwrsmkmtboeczxotj "SELECT * FROM profiles LIMIT 5"
```

---

## Checklist Final

- [ ] Proyecto linked con CLI
- [ ] Migraciones aplicadas (10 migraciones)
- [ ] Variables de entorno configuradas en Vercel
- [ ] Edge Functions desplegadas (8 funciones)
- [ ] Secrets configurados en Supabase
- [ ] Auth URLs configuradas
- [ ] Deploy de staging funcionando en Vercel
- [ ] Test de login exitoso
- [ ] Test de creación de datos exitoso
