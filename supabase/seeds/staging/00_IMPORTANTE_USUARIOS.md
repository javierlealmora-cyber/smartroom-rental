# ⚠️ IMPORTANTE: Creación de Usuarios en auth.users

## 🚫 NO CREAR USUARIOS DIRECTAMENTE EN SQL

**NUNCA** uses `INSERT INTO auth.users` directamente en scripts SQL para crear usuarios con contraseñas.

### ❌ **Método INCORRECTO (NO USAR):**

```sql
-- ❌ ESTO NO FUNCIONA CORRECTAMENTE
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at, ...
)
VALUES (
  gen_random_uuid(),
  'usuario@example.com',
  crypt('MiPassword123', gen_salt('bf')),  -- ❌ NO FUNCIONA
  now(),
  ...
);
```

**Problema:** Aunque `crypt()` encripta la contraseña, Supabase Auth usa un formato y proceso específico que no es compatible con `crypt()` directo. Los usuarios creados así **NO PODRÁN HACER LOGIN**.

---

## ✅ **Método CORRECTO:**

### **Usar el Script Node.js con Supabase Admin API**

**Archivo:** `supabase/scripts/create-auth-users-staging.js`

```bash
# 1. Configurar variables de entorno
$env:STAGING_SUPABASE_URL="https://lopdwrsmkmtboeczxotj.supabase.co"
$env:STAGING_SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 2. Ejecutar el script
node supabase/scripts/create-auth-users-staging.js
```

**El script usa:**
```javascript
await supabase.auth.admin.createUser({
  email: user.email,
  password: user.password,  // ✅ Contraseña en texto plano
  email_confirm: true,
  user_metadata: { 
    role: user.role,
    full_name: user.full_name
  }
})
```

---

## 📋 **Flujo Correcto para Seeds de Staging:**

### **1. Crear usuarios en auth.users (con contraseñas):**
```bash
node supabase/scripts/create-auth-users-staging.js
```

### **2. Crear profiles usando los IDs de auth.users:**
```sql
-- ✅ CORRECTO: Sincronizar profiles con auth.users
INSERT INTO public.profiles (id, email, full_name, role, ...)
SELECT 
  u.id,  -- ✅ Usar el ID real de auth.users
  u.email,
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'role',
  ...
FROM auth.users u
WHERE u.email LIKE '%@housingspacesolutions.com'
ON CONFLICT (id) DO UPDATE SET ...;
```

### **3. Crear lodgers usando los IDs de auth.users:**
```sql
-- ✅ CORRECTO: Crear lodgers con IDs reales
INSERT INTO public.lodgers (id, email, ...)
SELECT 
  u.id,  -- ✅ Usar el ID real de auth.users
  u.email,
  ...
FROM auth.users u
WHERE u.email LIKE 'inquilino%@housingspacesolutions.com';
```

---

## 🔑 **Contraseñas Definidas:**

### **Staging:**
- **Superadmins/Admins:** `@2#H2s060722`
- **Inquilinos:** `Test123456!`

### **Producción:**
- Usar contraseñas seguras únicas
- Nunca hardcodear en el código

---

## 📝 **Orden de Ejecución de Seeds:**

```bash
# 1. Crear usuarios con contraseñas (Node.js)
node supabase/scripts/create-auth-users-staging.js

# 2. Ejecutar seeds SQL en orden
01_profiles.sql          # Sincroniza profiles con auth.users
02_client_accounts.sql   # Crea cuentas de cliente
03_entities.sql          # Crea entidades
04_accommodations.sql    # Crea alojamientos
05_rooms.sql             # Crea habitaciones
06_lodgers.sql           # Sincroniza lodgers con auth.users
07_lodger_room_assignments.sql  # Asigna inquilinos a habitaciones
```

---

## ⚠️ **Recordatorio:**

**SIEMPRE** usa el Admin API de Supabase para crear usuarios con contraseñas.
**NUNCA** uses `INSERT INTO auth.users` directamente en SQL para usuarios que necesiten login.

---

## 🔧 **Service Role Key:**

Para ejecutar el script necesitas el `service_role_key` de Supabase:

1. Ve a: https://supabase.com/dashboard/project/lopdwrsmkmtboeczxotj/settings/api
2. Copia el **service_role** key (secret)
3. Configúrala como variable de entorno: `STAGING_SUPABASE_SERVICE_KEY`

**⚠️ NUNCA** expongas esta key en el frontend o en el código versionado.
