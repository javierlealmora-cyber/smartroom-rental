# ⚠️ IMPORTANTE: Creación de Usuarios en auth.users

## ✅ **MÉTODO RECOMENDADO: SQL Directo con bcrypt**

Después de pruebas exhaustivas, confirmamos que **SÍ funciona** crear usuarios directamente en SQL usando `crypt()` con bcrypt.

### ✅ **Método CORRECTO (SQL Directo):**

**Archivo:** `supabase/seeds/development/00_create_auth_users.sql`

```sql
-- ✅ ESTO SÍ FUNCIONA CORRECTAMENTE
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES (
  '10000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'usuario@example.com',
  crypt('MiPassword123', gen_salt('bf')),  -- ✅ SÍ FUNCIONA
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"admin","full_name":"Usuario Admin"}',
  'authenticated',
  'authenticated',
  NOW(),
  NOW(),
  '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;
```

**Ventajas:**
- ✅ Los usuarios **SÍ aparecen** en el dashboard de Supabase
- ✅ Los usuarios **SÍ pueden hacer login**
- ✅ UUIDs fijos para integridad referencial
- ✅ No requiere service_role_key
- ✅ Más simple y directo

**⚠️ CRÍTICO: Crear auth.identities**

Para que los usuarios puedan hacer login, **DEBEN** tener una entrada en `auth.identities`:

```sql
-- Crear identities para permitir login
INSERT INTO auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  u.id::text,
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  NOW(),
  NOW(),
  NOW()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
)
ON CONFLICT (provider, provider_id) DO NOTHING;
```

**Sin identities:**
- ❌ Login fallará con "Invalid login credentials"
- ❌ Usuarios no pueden autenticarse
- ❌ Dashboard muestra usuarios pero no funcionan

---

## 🔄 **Método Alternativo: Admin API (Opcional)**

**Archivo:** `supabase/scripts/create-auth-users-development.js`

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
