# Gestión de Secretos - SmartRoom Rental

**Consolidado desde:** `CONFIGURACION_ENTORNOS.md`  
**Última actualización:** 2026-03-28  
**Versión:** 1.0

---

## 🔐 Variables de Entorno

SmartRoom Rental utiliza variables de entorno para gestionar secretos y configuración por entorno.

---

## 📝 Archivo Único: `.env.local`

Este proyecto usa un **único archivo** `.env.local` para todas las configuraciones de entorno local.

### Ubicación
```
smartroom-rental/
└── .env.local  ← Raíz del proyecto
```

### Contenido Requerido

```env
# Supabase (Development)
VITE_SUPABASE_URL=https://lqwyyyttjamirccdtlvl.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key-aqui>

# Supabase Service Role (SOLO para scripts locales)
DEV_SUPABASE_SERVICE_KEY=<tu-service-role-key-aqui>

# Stripe (Development)
VITE_STRIPE_PUBLISHABLE_KEY=<pk_test_...>

# Analytics (Development)
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
```

---

## 🔑 Tipos de Keys

### 1. Supabase ANON Key

**Propósito:** Acceso público a Supabase desde frontend  
**Seguridad:** Pública (puede exponerse en frontend)  
**Protección:** RLS en base de datos  
**Ubicación:** `.env.local`, Vercel Dashboard

**Cómo obtener:**
1. Ve a: https://supabase.com/dashboard/project/lqwyyyttjamirccdtlvl/settings/api
2. Busca: "Project API keys"
3. Copia: **"anon" / "public"** key

### 2. Supabase Service Role Key

**Propósito:** Acceso completo a Supabase (bypass RLS)  
**Seguridad:** ⚠️ **PRIVADA** - Nunca exponer en frontend  
**Uso:** Solo en Edge Functions y scripts de servidor  
**Ubicación:** `.env.local` (local), Supabase Edge Functions (automático)

**Cómo obtener:**
1. Ve a: https://supabase.com/dashboard/project/lqwyyyttjamirccdtlvl/settings/api
2. Busca: "Project API keys"
3. Copia: **"service_role"** key

**⚠️ CRÍTICO:**
- NUNCA commitear en Git
- NUNCA usar en frontend
- NUNCA hardcodear en código
- Solo usar en Edge Functions y scripts de servidor

### 3. Stripe Publishable Key

**Propósito:** Inicializar Stripe en frontend  
**Seguridad:** Pública (puede exponerse)  
**Ubicación:** `.env.local`, Vercel Dashboard

**Cómo obtener:**
1. Ve a: https://dashboard.stripe.com/test/apikeys
2. Copia: **"Publishable key"** (pk_test_... o pk_live_...)

### 4. Stripe Secret Key

**Propósito:** Operaciones de servidor con Stripe  
**Seguridad:** ⚠️ **PRIVADA** - Nunca exponer  
**Uso:** Solo en Edge Functions  
**Ubicación:** Supabase Edge Functions Secrets

**Cómo obtener:**
1. Ve a: https://dashboard.stripe.com/test/apikeys
2. Copia: **"Secret key"** (sk_test_... o sk_live_...)

---

## 🛠️ Configuración por Entorno

### Development (Local)

**Archivo:** `.env.local`

```env
# Supabase Development
VITE_SUPABASE_URL=https://lqwyyyttjamirccdtlvl.supabase.co
VITE_SUPABASE_ANON_KEY=<dev-anon-key>
DEV_SUPABASE_SERVICE_KEY=<dev-service-key>

# Stripe Test
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Debug
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
```

### Staging (Vercel)

**Configurar en:** Vercel Dashboard → Project → Settings → Environment Variables → Preview

```env
VITE_SUPABASE_URL=https://lopdwrsmkmtboeczxotj.supabase.co
VITE_SUPABASE_ANON_KEY=<staging-anon-key>
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=false
```

### Production (Vercel)

**Configurar en:** Vercel Dashboard → Project → Settings → Environment Variables → Production

```env
VITE_SUPABASE_URL=https://oeofdvkilcuidxainuow.supabase.co
VITE_SUPABASE_ANON_KEY=<prod-anon-key>
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG=false
```

---

## 🔒 Secretos en Edge Functions

### Configurar en Supabase Dashboard

**Ubicación:** Supabase Dashboard → Edge Functions → Secrets

**Secretos requeridos:**
```
STRIPE_SECRET_KEY=sk_test_... (o sk_live_... en prod)
SITE_URL=https://smartroomrentalplatform.com
```

### Acceder en Edge Function

```typescript
// En cualquier Edge Function
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
const siteUrl = Deno.env.get('SITE_URL');

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY not configured');
}
```

---

## 🔐 GitHub Secrets

### Secretos Requeridos

**Ubicación:** GitHub → Settings → Secrets and variables → Actions

```
VERCEL_TOKEN=<tu-vercel-token>
VERCEL_ORG_ID=<tu-org-id>
DEV_VERCEL_PROJECT_ID=<project-id-dev>
STAGING_VERCEL_PROJECT_ID=<project-id-staging>
```

### Cómo Obtener

**VERCEL_TOKEN:**
1. Ve a: https://vercel.com/account/tokens
2. Crea un nuevo token
3. Copia el valor

**VERCEL_ORG_ID:**
1. Ve a: https://vercel.com/[tu-usuario]/settings
2. Copia el "Team ID" o "User ID"

**VERCEL_PROJECT_ID:**
1. Ve al proyecto en Vercel
2. Settings → General → Project ID
3. Copia el valor

---

## ✅ Verificación de Configuración

### Verificar `.env.local`

```powershell
# Verificar que el archivo existe
Test-Path .env.local

# Verificar que contiene las variables necesarias
Get-Content .env.local | Select-String "VITE_SUPABASE_URL"
Get-Content .env.local | Select-String "VITE_SUPABASE_ANON_KEY"
```

### Verificar Variables en Vercel

```bash
# Listar variables de entorno
vercel env ls

# Añadir variable
vercel env add VITE_SUPABASE_URL production

# Eliminar variable
vercel env rm VITE_SUPABASE_URL production
```

### Verificar Secretos en Supabase

```bash
# Listar secretos de Edge Functions
supabase secrets list --project-ref lqwyyyttjamirccdtlvl

# Añadir secreto
supabase secrets set STRIPE_SECRET_KEY=sk_test_... --project-ref lqwyyyttjamirccdtlvl

# Eliminar secreto
supabase secrets unset STRIPE_SECRET_KEY --project-ref lqwyyyttjamirccdtlvl
```

---

## 🚨 Seguridad

### Reglas de Oro

1. ✅ **`.env.local` está en `.gitignore`**
2. ❌ **NUNCA commitear `.env.local` a Git**
3. ❌ **NUNCA hardcodear keys en código**
4. ❌ **NUNCA compartir service_role keys públicamente**
5. ✅ **Rotar keys periódicamente**
6. ✅ **Usar keys diferentes por entorno**

### Si Expones una Key Accidentalmente

**Service Role Key:**
1. Ve a Supabase Dashboard → Settings → API
2. Click en "Reset" junto a service_role key
3. Actualiza `.env.local` y Edge Functions secrets
4. Re-deploy Edge Functions

**Stripe Secret Key:**
1. Ve a Stripe Dashboard → Developers → API keys
2. Click en "Roll key" junto a la key expuesta
3. Actualiza Edge Functions secrets
4. Re-deploy Edge Functions

**Vercel Token:**
1. Ve a Vercel → Account → Tokens
2. Elimina el token comprometido
3. Crea un nuevo token
4. Actualiza GitHub Secrets

---

## 📋 Checklist de Setup

### Setup Local

- [ ] Crear `.env.local` en raíz del proyecto
- [ ] Añadir `VITE_SUPABASE_URL`
- [ ] Añadir `VITE_SUPABASE_ANON_KEY`
- [ ] Añadir `DEV_SUPABASE_SERVICE_KEY` (si usas scripts)
- [ ] Añadir `VITE_STRIPE_PUBLISHABLE_KEY`
- [ ] Verificar que `.env.local` está en `.gitignore`
- [ ] Ejecutar `npm run dev` para verificar

### Setup Vercel (Staging)

- [ ] Ir a Vercel Dashboard → Proyecto Staging
- [ ] Settings → Environment Variables
- [ ] Añadir variables para "Preview"
- [ ] Verificar deployment

### Setup Vercel (Production)

- [ ] Ir a Vercel Dashboard → Proyecto Production
- [ ] Settings → Environment Variables
- [ ] Añadir variables para "Production"
- [ ] Usar keys de producción (pk_live_, etc.)
- [ ] Verificar deployment

### Setup Supabase Edge Functions

- [ ] Configurar `STRIPE_SECRET_KEY`
- [ ] Configurar `SITE_URL`
- [ ] Re-deploy Edge Functions
- [ ] Verificar logs

### Setup GitHub Actions

- [ ] Añadir `VERCEL_TOKEN`
- [ ] Añadir `VERCEL_ORG_ID`
- [ ] Añadir `DEV_VERCEL_PROJECT_ID`
- [ ] Añadir `STAGING_VERCEL_PROJECT_ID`
- [ ] Verificar workflow

---

## 🔄 Rotación de Keys

### Frecuencia Recomendada

- **Service Role Keys:** Cada 6 meses
- **Stripe Keys:** Cada 12 meses o tras incidente
- **Vercel Tokens:** Cada 12 meses
- **ANON Keys:** No requiere rotación regular

### Proceso de Rotación

1. **Generar nueva key** en el servicio correspondiente
2. **Actualizar en todos los entornos:**
   - `.env.local` (local)
   - Vercel Dashboard (staging/prod)
   - Supabase Secrets (Edge Functions)
   - GitHub Secrets (CI/CD)
3. **Verificar que todo funciona** con la nueva key
4. **Eliminar key antigua** del servicio
5. **Documentar** la rotación (fecha, motivo)

---

## 📞 Troubleshooting

### Error: "Invalid API key"

**Causa:** Key incorrecta o expirada

**Solución:**
1. Verificar que la key está correctamente copiada
2. Verificar que no hay espacios extra
3. Regenerar key si es necesaria

### Error: "Unauthorized"

**Causa:** Usando ANON key donde se requiere Service Role

**Solución:**
1. Verificar que estás usando la key correcta
2. En Edge Functions, usar Service Role automáticamente disponible
3. En frontend, solo usar ANON key

### Variables no se cargan en Vercel

**Causa:** Variables no configuradas o entorno incorrecto

**Solución:**
1. Verificar en Vercel Dashboard → Environment Variables
2. Verificar que están en el entorno correcto (Preview/Production)
3. Re-deploy después de añadir variables

---

## 🔗 Referencias

- **Deployment:** `docs/devops/deployment.md`
- **Environments:** `docs/devops/environments.md`
- **Vercel Config:** `docs/devops/vercel-config.md`

---

**Consolidado desde:** `CONFIGURACION_ENTORNOS.md`  
**Última actualización:** 2026-03-28  
**Versión:** 1.0
