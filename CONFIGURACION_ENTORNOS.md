# 🔐 Configuración de Entornos - Service Role Keys

## 📝 Instrucciones para Configurar las Credenciales

### **Archivo Único: `.env.local`**

Este proyecto usa un **único archivo** `.env.local` para todas las configuraciones de entorno.

### **Paso 1: Verificar que existe `.env.local`**

El archivo `.env.local` ya existe en la raíz del proyecto y contiene todas las variables necesarias.

### **Paso 2: Agregar Service Role Key**

Abre `.env.local` y asegúrate de que contiene una de estas variables:

**Opción A - Variables específicas por entorno:**
```env
# Development
DEV_SUPABASE_URL=https://lqwyyyttjamirccdtlvl.supabase.co
DEV_SUPABASE_SERVICE_KEY=tu-service-role-key-aqui

# Staging
STAGING_SUPABASE_URL=https://lopdwrsmkmtboeczxotj.supabase.co
STAGING_SUPABASE_SERVICE_KEY=tu-service-role-key-aqui
```

**Opción B - Variables genéricas (si ya existen):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://lqwyyyttjamirccdtlvl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```

### **Paso 3: Obtener Service Role Key**

1. Ve a: https://supabase.com/dashboard/project/lqwyyyttjamirccdtlvl/settings/api
2. Busca la sección "Project API keys"
3. Copia el valor de **"service_role"** (NO el "anon" key)
4. Pégalo en `.env.local`

---

## ✅ Verificar Configuración

Después de agregar la service_role key, verifica que todo esté correcto:

```powershell
# Verificar que el archivo existe
Test-Path .env.local

# Ejecutar script de development (debería funcionar sin errores)
node supabase/scripts/create-auth-users-development.js
```

---

## 🔒 Seguridad

### **IMPORTANTE:**
- ✅ El archivo `.env.local` está en `.gitignore`
- ✅ NUNCA subas `.env.local` a Git
- ✅ NUNCA compartas las service_role keys públicamente
- ✅ Las service_role keys tienen acceso TOTAL a la base de datos

### **Si accidentalmente expones una key:**
1. Ve al dashboard de Supabase
2. Settings > API
3. Regenera la service_role key
4. Actualiza `.env.local`

---

## 📋 Uso de las Configuraciones

### **Development:**
```powershell
# El script carga automáticamente .env.local
node supabase/scripts/create-auth-users-development.js

# O ejecuta el proceso completo
.\supabase\seeds\development\run-all-seeds.ps1
```

### **Staging:**
```powershell
# El script carga automáticamente .env.local
node supabase/scripts/create-auth-users-staging.js
```

---

## 🎯 Resumen

1. **Abre** `.env.local` (ya existe en el proyecto)
2. **Agrega** una de estas variables:
   - `DEV_SUPABASE_SERVICE_KEY` o
   - `SUPABASE_SERVICE_ROLE_KEY`
3. **Pega** tu service_role key
4. **Ejecuta** los scripts (cargarán automáticamente desde `.env.local`)

**¡Listo!** Los scripts usarán las credenciales de `.env.local` automáticamente.
