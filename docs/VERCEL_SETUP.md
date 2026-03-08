# Vercel Setup - Configuración Requerida

## 🔴 CRÍTICO: Desactivar Password Protection

La URL de preview de Vercel está protegida con contraseña, lo que impide que las pruebas E2E funcionen.

### Pasos para desactivar:

1. Ve a: https://vercel.com/dashboard
2. Selecciona el proyecto: `smartroom-rental`
3. Ve a: **Settings** → **Security**
4. Busca: **Password Protection**
5. **Desactiva** la protección con contraseña
6. Guarda los cambios

---

## 📋 Secrets Requeridos en GitHub

Después de los fixes aplicados, necesitas configurar estos secrets en GitHub:

### Secrets de Vercel

```
VERCEL_TOKEN=<tu_vercel_token>
VERCEL_ORG_ID=<tu_org_id>
DEV_VERCEL_PROJECT_ID=<project_id_para_dev>
STAGING_VERCEL_PROJECT_ID=<project_id_para_staging>
```

**Nota:** Anteriormente usábamos un solo `VERCEL_PROJECT_ID` para dev y staging, lo que causaba conflictos. Ahora están separados.

### Cómo obtener los valores:

**VERCEL_TOKEN:**
- Ve a: https://vercel.com/account/tokens
- Crea un nuevo token
- Copia el valor

**VERCEL_ORG_ID:**
- Ve a: https://vercel.com/[tu-usuario]/settings
- Copia el "Team ID" o "User ID"

**DEV_VERCEL_PROJECT_ID:**
- Ve al proyecto de DEV en Vercel
- Settings → General → Project ID

**STAGING_VERCEL_PROJECT_ID:**
- Ve al proyecto de STAGING en Vercel
- Settings → General → Project ID

---

## 🔧 Variables de Entorno en Vercel Dashboard

Para cada proyecto (DEV y STAGING), configura estas variables de entorno:

### Para STAGING:

```
VITE_SUPABASE_URL=https://lopdwrsmkmtboeczxotj.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key_de_staging>
VITE_STRIPE_PUBLISHABLE_KEY=<pk_test_...>
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=false
```

### Para DEV:

```
VITE_SUPABASE_URL=<url_de_dev>
VITE_SUPABASE_ANON_KEY=<anon_key_de_dev>
VITE_STRIPE_PUBLISHABLE_KEY=<pk_test_...>
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG=true
```

---

## ✅ Verificación

Después de aplicar estos cambios:

1. **Password Protection desactivada** ✓
2. **Secrets configurados en GitHub** ✓
3. **Variables de entorno en Vercel** ✓
4. **Re-deploy manual o via PR** ✓

Entonces podrás ejecutar:

```bash
npm run test:e2e:smoke
```

Y los tests deberían pasar correctamente.

---

## 📝 Cambios Aplicados en el Código

### 1. `vercel.json`
- ✅ Cambiado `build:maintenance` → `build:pre`

### 2. `.github/workflows/deploy-staging.yml`
- ✅ Cambiado `VERCEL_PROJECT_ID` → `STAGING_VERCEL_PROJECT_ID`
- ✅ Eliminado `vercel-args: '--prod'`
- ✅ Eliminado `alias-domains`

### 3. `.github/workflows/deploy-dev.yml`
- ✅ Cambiado `VERCEL_PROJECT_ID` → `DEV_VERCEL_PROJECT_ID`

---

## 🚀 Próximos Pasos

1. Desactiva Password Protection en Vercel Dashboard
2. Configura los secrets en GitHub (si vas a usar workflows)
3. Re-despliega manualmente: `vercel deploy`
4. Ejecuta tests E2E: `npm run test:e2e:smoke`
