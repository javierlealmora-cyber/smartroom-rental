# 📋 Resumen de Configuración Completa - SmartRoom Rental

**Fecha:** 2026-02-27  
**Estado:** Staging ✅ Completo | Producción ⏳ Pendiente

---

## 🎯 Proyectos Supabase

### ✅ Staging (COMPLETADO)
- **Project ID:** `lopdwrsmkmtboeczxotj`
- **URL:** https://lopdwrsmkmtboeczxotj.supabase.co
- **Rama Git:** `staging`
- **Vercel Environment:** Preview
- **Estado Base de Datos:**
  - ✅ 9 migraciones aplicadas
  - ✅ 9 tablas creadas con RLS
  - ✅ 4 planes seed insertados
  - ✅ ~40 políticas RLS activas
  - ✅ Funciones helper creadas

### ⏳ Producción (PENDIENTE CONFIGURACIÓN)
- **Project ID:** `oeofdvkilcuidxainuow`
- **URL:** https://oeofdvkilcuidxainuow.supabase.co
- **Rama Git:** `master`
- **Vercel Environment:** Production
- **Estado Base de Datos:**
  - ⏳ Migraciones pendientes de aplicar
  - ⏳ Edge Functions pendientes de desplegar
  - ⏳ Secrets pendientes de configurar

---

## 📊 Esquema de Base de Datos (Ambos Entornos)

### Tablas Principales (9 tablas)

| Tabla | RLS | Descripción | Rows (Staging) |
|-------|-----|-------------|----------------|
| `plans_catalog` | ✅ | Planes de suscripción | 4 |
| `client_accounts` | ✅ | Cuentas de cliente (tenants) | 0 |
| `entities` | ✅ | Entidades pagadoras/propietarias | 0 |
| `companies` | ✅ | Empresas (legacy) | 0 |
| `profiles` | ✅ | Perfiles de usuario | 0 |
| `stripe_events` | ✅ | Eventos Stripe (solo service_role) | 0 |
| `services_catalog` | ✅ | Catálogo de servicios | 0 |
| `accommodation_services` | ✅ | Servicios por alojamiento | 0 |
| `lodger_services` | ✅ | Servicios por inquilino | 0 |

### Funciones Helper (4 funciones)

- `get_my_role()` - Obtiene rol del usuario autenticado
- `get_my_company_id()` - Obtiene company_id del usuario
- `get_my_client_account_id()` - Obtiene client_account_id del usuario
- `update_updated_at_column()` - Trigger para updated_at

### Políticas RLS (~40 políticas activas)

**Patrón de seguridad:**
- Superadmin: Acceso total
- Admin: Acceso a datos de su tenant
- API/Agent: Acceso limitado según rol
- Lodger: Solo lectura de sus datos
- Anon: Solo lectura de planes públicos

---

## 🔐 Configuración de Secrets

### Staging (lopdwrsmkmtboeczxotj)
- ⏳ `SUPABASE_SERVICE_ROLE_KEY` - Pendiente
- ⏳ `STRIPE_SECRET_KEY` (test mode) - Opcional
- ⏳ `STRIPE_WEBHOOK_SECRET` (test mode) - Opcional

### Producción (oeofdvkilcuidxainuow)
- ⏳ `SUPABASE_SERVICE_ROLE_KEY` - **CRÍTICO**
- ⏳ `STRIPE_SECRET_KEY` (live mode) - **CRÍTICO**
- ⏳ `STRIPE_WEBHOOK_SECRET` (live mode) - **CRÍTICO**

**Comando para configurar:**
```bash
npx supabase secrets set --project-ref [PROJECT_ID] SUPABASE_SERVICE_ROLE_KEY=xxx
```

---

## 🌐 Variables de Entorno en Vercel

### Production (rama master)
```env
VITE_SUPABASE_URL=https://oeofdvkilcuidxainuow.supabase.co
VITE_SUPABASE_ANON_KEY=[obtener de dashboard]
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

### Preview (rama staging)
```env
VITE_SUPABASE_URL=https://lopdwrsmkmtboeczxotj.supabase.co
VITE_SUPABASE_ANON_KEY=[obtener de dashboard]
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

## 🔒 Auth URLs en Supabase

### Producción
- **Site URL:** `https://smartroomrentalplatform.com`
- **Redirect URLs:**
  - `https://smartroomrentalplatform.com/**`
  - `https://*.vercel.app/**`
  - `http://localhost:5173/**`

### Staging
- **Site URL:** [URL de Vercel Preview]
- **Redirect URLs:**
  - `https://*.vercel.app/**`
  - `http://localhost:5173/**`

---

## ⚡ Edge Functions (8 funciones)

| Función | Descripción | Estado Staging | Estado Prod |
|---------|-------------|----------------|-------------|
| `whoami` | Obtener info del usuario | ⏳ Pendiente | ⏳ Pendiente |
| `provision_company` | Crear nueva empresa | ⏳ Pendiente | ⏳ Pendiente |
| `update_company` | Actualizar empresa | ⏳ Pendiente | ⏳ Pendiente |
| `delete_company` | Eliminar empresa | ⏳ Pendiente | ⏳ Pendiente |
| `manage_accommodation` | CRUD alojamientos | ⏳ Pendiente | ⏳ Pendiente |
| `manage_lodger` | CRUD inquilinos | ⏳ Pendiente | ⏳ Pendiente |
| `manage_entity` | CRUD entidades | ⏳ Pendiente | ⏳ Pendiente |
| `wizard_submit` | Onboarding wizard | ⏳ Pendiente | ⏳ Pendiente |

**Comando para desplegar:**
```bash
npx supabase functions deploy --project-ref [PROJECT_ID]
```

---

## 📝 Planes Seed (4 planes)

| Código | Nombre | Precio Mensual | Featured | Estado |
|--------|--------|----------------|----------|--------|
| `basic` | Basic | €29.99 | No | Active |
| `investor` | Investor | €79.99 | **Sí** | Active |
| `business` | Business | €149.99 | No | Active |
| `agency` | Agencia | €299.99 | No | Active |

---

## 📚 Scripts Disponibles

### Configuración de Producción
- **PowerShell:** `scripts/setup-production.ps1`
- **Bash:** `scripts/setup-production.sh`

### Configuración de Staging
- **PowerShell:** `scripts/setup-staging.ps1` (crear si es necesario)
- **Bash:** `scripts/deploy-staging-quick.sh`

### Guías de Documentación
- `scripts/QUICK-START.md` - Inicio rápido
- `scripts/PRODUCTION-SETUP-GUIDE.md` - Guía completa de producción
- `scripts/STAGING-CONFIGURATION-COMPLETE.md` - Resumen de staging
- `scripts/STAGING-SETUP-INSTRUCTIONS.md` - Guía completa de staging
- `docs/DEPLOYMENT.md` - Deployment en Vercel

---

## ✅ Checklist de Configuración Completa

### Staging
- [x] Proyecto Supabase creado
- [x] Migraciones aplicadas (9/9)
- [x] Tablas creadas con RLS (9/9)
- [x] Funciones helper creadas (4/4)
- [x] Planes seed insertados (4/4)
- [ ] Edge Functions desplegadas (0/8)
- [ ] Secrets configurados
- [ ] Variables en Vercel (Preview)
- [ ] Auth URLs configuradas
- [ ] Deploy verificado

### Producción
- [x] Proyecto Supabase creado
- [ ] Migraciones aplicadas (0/9)
- [ ] Tablas creadas con RLS (0/9)
- [ ] Funciones helper creadas (0/4)
- [ ] Planes seed insertados (0/4)
- [ ] Edge Functions desplegadas (0/8)
- [ ] Secrets configurados (0/3)
- [ ] Variables en Vercel (Production)
- [ ] Auth URLs configuradas
- [ ] Deploy verificado

---

## 🚀 Pasos Siguientes (Orden Recomendado)

### 1. Configurar Producción (CRÍTICO)
```bash
# Ejecutar script de configuración
.\scripts\setup-production.ps1
# O manualmente
npx supabase link --project-ref oeofdvkilcuidxainuow
npx supabase db push
npx supabase functions deploy --project-ref oeofdvkilcuidxainuow
```

### 2. Configurar Secrets en Supabase
```bash
# Producción
npx supabase secrets set --project-ref oeofdvkilcuidxainuow SUPABASE_SERVICE_ROLE_KEY=xxx
npx supabase secrets set --project-ref oeofdvkilcuidxainuow STRIPE_SECRET_KEY=sk_live_xxx

# Staging
npx supabase secrets set --project-ref lopdwrsmkmtboeczxotj SUPABASE_SERVICE_ROLE_KEY=xxx
```

### 3. Configurar Variables en Vercel
- Ve a Vercel Dashboard → Settings → Environment Variables
- Añade variables para Production y Preview según la tabla anterior

### 4. Configurar Auth URLs
- Ve a Supabase Dashboard → Authentication → URL Configuration
- Configura Site URL y Redirect URLs para ambos proyectos

### 5. Deploy y Verificación
```bash
# Deploy a staging
git push origin staging

# Deploy a producción
git push origin master
```

---

## 🔍 Comandos de Verificación

```bash
# Ver estado de migraciones
npx supabase migration list --project-ref oeofdvkilcuidxainuow
npx supabase migration list --project-ref lopdwrsmkmtboeczxotj

# Ver tablas creadas
npx supabase db execute --project-ref oeofdvkilcuidxainuow "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"

# Ver Edge Functions
npx supabase functions list --project-ref oeofdvkilcuidxainuow

# Ver secrets
npx supabase secrets list --project-ref oeofdvkilcuidxainuow
```

---

## ⚠️ Notas Importantes

1. **Staging está configurado** pero faltan Edge Functions y secrets
2. **Producción está vacía** - requiere configuración completa
3. **Stripe:** Usar test keys en staging, live keys en producción
4. **Debug:** Habilitado en staging, deshabilitado en producción
5. **Backups:** Configurar en Supabase Dashboard para producción
6. **Monitoreo:** Revisar logs regularmente en ambos entornos

---

## 📞 Soporte y Troubleshooting

Ver documentación completa en:
- `scripts/QUICK-START.md`
- `scripts/PRODUCTION-SETUP-GUIDE.md`
- `scripts/STAGING-SETUP-INSTRUCTIONS.md`
