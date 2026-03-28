# ✅ Configuración de Staging Completada

**Fecha:** 2026-02-26  
**Proyecto Staging:** lopdwrsmkmtboeczxotj  
**URL:** https://lopdwrsmkmtboeczxotj.supabase.co

---

## 📊 Resumen de Configuración

### ✅ Migraciones Aplicadas (9 total)

1. ✅ `create_plans_catalog` - Catálogo de planes con 4 planes seed
2. ✅ `create_client_accounts` - Cuentas de cliente (tenants)
3. ✅ `create_entities` - Entidades (payer/owner)
4. ✅ `create_base_schema` - Tablas base (companies, profiles) + funciones RLS
5. ✅ `alter_profiles_add_client_account` - Columnas tenant en profiles
6. ✅ `rls_new_tables` - Políticas RLS para nuevas tablas
7. ✅ `adapt_plans_add_stripe_events` - Stripe events + features
8. ✅ `rename_student_to_lodger` - Renombrar rol student → lodger
9. ✅ `complete_rls_policies_staging` - RLS para services (FASE 1)

### ✅ Tablas Creadas (9 total)

| Tabla | RLS | Rows | Descripción |
|-------|-----|------|-------------|
| `plans_catalog` | ✅ | 4 | Planes de suscripción (basic, investor, business, agency) |
| `client_accounts` | ✅ | 0 | Cuentas de cliente (tenants) |
| `entities` | ✅ | 0 | Entidades pagadoras y propietarias |
| `companies` | ✅ | 0 | Empresas (legacy) |
| `profiles` | ✅ | 0 | Perfiles de usuario |
| `stripe_events` | ✅ | 0 | Eventos de Stripe (solo service_role) |
| `services_catalog` | ✅ | 0 | Catálogo de servicios |
| `accommodation_services` | ✅ | 0 | Servicios por alojamiento |
| `lodger_services` | ✅ | 0 | Servicios por inquilino |

### ✅ Funciones Helper Creadas

- `get_my_role()` - Obtiene rol del usuario autenticado
- `get_my_company_id()` - Obtiene company_id del usuario
- `get_my_client_account_id()` - Obtiene client_account_id del usuario
- `update_updated_at_column()` - Trigger para updated_at

### ✅ Políticas RLS Implementadas

**Total:** ~40 políticas RLS activas

- **plans_catalog:** SELECT (anon + authenticated), INSERT/UPDATE/DELETE (superadmin)
- **client_accounts:** SELECT/UPDATE (superadmin + admin de su cuenta), INSERT/DELETE (superadmin)
- **entities:** SELECT/INSERT/UPDATE (superadmin + admin de su cuenta), DELETE (superadmin)
- **companies:** SELECT/UPDATE (superadmin + admin), INSERT/DELETE (superadmin)
- **profiles:** SELECT/UPDATE (superadmin + admin + self), INSERT (self + superadmin), DELETE (superadmin)
- **services_catalog:** SELECT/INSERT/UPDATE/DELETE (superadmin + admin de su tenant)
- **accommodation_services:** SELECT/INSERT/UPDATE/DELETE (superadmin + admin de su tenant)
- **lodger_services:** SELECT/INSERT/UPDATE/DELETE (superadmin + admin de su tenant)
- **stripe_events:** Sin políticas (solo service_role)

---

## 🔧 Pasos Finales Pendientes

### 1. Configurar Variables de Entorno en Vercel

Ve a **Vercel Dashboard** → Proyecto → **Settings** → **Environment Variables**

Añade para **Preview** (rama staging):

```bash
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

### 2. Obtener Credenciales de Supabase

Ve a **Supabase Dashboard** → Proyecto Staging (lopdwrsmkmtboeczxotj) → **Settings** → **API**

Copia:
- ✅ **Project URL:** `https://lopdwrsmkmtboeczxotj.supabase.co`
- ✅ **anon/public key:** [copiar y pegar en Vercel]
- ✅ **service_role key:** [copiar para secrets - ⚠️ NUNCA exponer en frontend]

### 3. Desplegar Edge Functions (Opcional)

Si necesitas Edge Functions en staging:

```bash
# Desplegar todas las funciones
npx supabase functions deploy --project-ref lopdwrsmkmtboeczxotj

# O una por una
npx supabase functions deploy whoami --project-ref lopdwrsmkmtboeczxotj
npx supabase functions deploy manage_accommodation --project-ref lopdwrsmkmtboeczxotj
# ... etc
```

### 4. Configurar Secrets para Edge Functions

```bash
# Service Role Key (CRÍTICO)
npx supabase secrets set --project-ref lopdwrsmkmtboeczxotj \
  SUPABASE_SERVICE_ROLE_KEY=[service_role key de dashboard]

# Verificar
npx supabase secrets list --project-ref lopdwrsmkmtboeczxotj
```

### 5. Configurar Auth URLs en Supabase

Ve a **Supabase Dashboard** → Staging → **Authentication** → **URL Configuration**

- **Site URL:** [URL que Vercel asigne a staging]
- **Redirect URLs:** Añadir:
  - `https://*.vercel.app/**`
  - `http://localhost:5173/**`
  - `http://localhost:3000/**`

### 6. Verificar Deploy en Vercel

1. Ve a **Vercel Dashboard** → **Deployments**
2. Busca el deploy de la rama `staging`
3. Verifica que el build sea exitoso
4. Click en la URL del deploy para probar

---

## 🎯 Checklist de Verificación

- [x] 9 migraciones aplicadas en staging
- [x] 9 tablas creadas con RLS habilitado
- [x] 4 planes seed insertados (basic, investor, business, agency)
- [x] Funciones helper creadas
- [x] ~40 políticas RLS activas
- [ ] Variables de entorno configuradas en Vercel (Preview)
- [ ] Credenciales de Supabase copiadas
- [ ] Edge Functions desplegadas (opcional)
- [ ] Secrets configurados en Supabase
- [ ] Auth URLs configuradas
- [ ] Deploy de staging verificado en Vercel

---

## 📝 Datos de Seed Disponibles

### Planes Catalog (4 planes)

| Código | Nombre | Precio Mensual | Featured |
|--------|--------|----------------|----------|
| `basic` | Basic | €29.99 | No |
| `investor` | Investor | €79.99 | **Sí** |
| `business` | Business | €149.99 | No |
| `agency` | Agencia | €299.99 | No |

Todos los planes están `active` y `visible_for_new_accounts = true`.

---

## 🔍 Comandos Útiles

```bash
# Ver migraciones aplicadas
npx supabase migration list --project-ref lopdwrsmkmtboeczxotj

# Ver tablas
npx supabase db execute --project-ref lopdwrsmkmtboeczxotj \
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"

# Ver políticas RLS
npx supabase db execute --project-ref lopdwrsmkmtboeczxotj \
  "SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'"

# Ver planes seed
npx supabase db execute --project-ref lopdwrsmkmtboeczxotj \
  "SELECT code, name, monthly_price, is_featured FROM plans_catalog"
```

---

## 🚀 Próximos Pasos

1. **Configurar variables en Vercel** (paso más importante)
2. **Verificar que el deploy de staging funciona**
3. **Crear un usuario de prueba en staging**
4. **Probar flujo de onboarding completo**
5. **Verificar que RLS funciona correctamente** (usuario A no ve datos de usuario B)

---

## 📞 Soporte

Si encuentras problemas:

1. **Logs de Vercel:** Deployments → Click en deploy → Logs
2. **Logs de Supabase:** Dashboard → Logs
3. **Verificar variables:** Vercel → Settings → Environment Variables
4. **Verificar secrets:** `npx supabase secrets list --project-ref lopdwrsmkmtboeczxotj`

---

## ✅ Estado Final

**Staging está listo para recibir deployments desde la rama `staging`.**

La base de datos está completamente configurada con:
- ✅ Esquema completo
- ✅ RLS habilitado en todas las tablas
- ✅ Funciones helper
- ✅ Datos seed (planes)
- ✅ Políticas de seguridad (FASE 1)

**Falta solo configurar las variables de entorno en Vercel para que la aplicación se conecte correctamente.**
