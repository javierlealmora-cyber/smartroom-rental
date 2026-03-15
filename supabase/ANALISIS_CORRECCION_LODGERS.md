# Análisis y Corrección: Modelo de Datos Lodgers

## 🔴 PROBLEMA IDENTIFICADO

### 1. **Tabla `lodgers` Incorrecta**
La tabla actual `lodgers` NO tiene relación con `auth.users`, lo que significa:
- ❌ Los inquilinos NO pueden hacer login
- ❌ No tienen credenciales de acceso
- ❌ No pueden acceder al dashboard de inquilinos
- ❌ Rompe la integridad del modelo de datos

### 2. **Seeds/Development Incorrectos**
Los seeds actuales:
- ❌ NO crean usuarios en `auth.users`
- ❌ NO crean perfiles en `profiles`
- ❌ Crean entidades sin usuarios asociados
- ❌ Rompen la integridad referencial

---

## ✅ SOLUCIÓN

### **Modelo Correcto: Lodgers = Usuarios con Login**

Los inquilinos (lodgers) DEBEN ser usuarios del sistema:
1. **Registro en `auth.users`** con email y password
2. **Perfil en `profiles`** con role='lodger'
3. **Datos adicionales** en tabla específica si es necesario

---

## 🔧 CAMBIOS REQUERIDOS

### **A. Baseline (01_schema.sql)**

#### **Opción 1: Eliminar tabla `lodgers` completamente**
```sql
-- ELIMINAR: La tabla lodgers ya no es necesaria
-- Los datos de inquilinos estarán en profiles con role='lodger'
DROP TABLE IF EXISTS public.lodgers CASCADE;
```

#### **Opción 2: Convertir `lodgers` en tabla de datos extendidos**
```sql
-- MODIFICAR: lodgers como extensión de profiles
CREATE TABLE public.lodgers (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  
  -- Datos adicionales específicos de inquilinos
  document_id text,
  emergency_contact_name text,
  emergency_contact_phone text,
  
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Los datos básicos (nombre, email, phone) están en profiles
```

**RECOMENDACIÓN:** Usar **Opción 2** para mantener datos adicionales de inquilinos.

---

### **B. Seeds/Development**

#### **1. Crear Script Node.js para Usuarios**
**Archivo:** `supabase/scripts/create-auth-users-development.js`

```javascript
#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.DEV_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.DEV_SUPABASE_SERVICE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const users = [
  // Superadmin
  { email: 'superadmin@housingspacesolutions.com', password: 'Admin123!', role: 'superadmin', full_name: 'Super Admin' },
  
  // Admins de cuentas cliente (8 usuarios)
  { email: 'admin.basic1@housingspacesolutions.com', password: 'Admin123!', role: 'admin', full_name: 'Admin Basic 1' },
  { email: 'admin.basic2@housingspacesolutions.com', password: 'Admin123!', role: 'admin', full_name: 'Admin Basic 2' },
  { email: 'admin.investor1@housingspacesolutions.com', password: 'Admin123!', role: 'admin', full_name: 'Admin Investor 1' },
  { email: 'admin.investor2@housingspacesolutions.com', password: 'Admin123!', role: 'admin', full_name: 'Admin Investor 2' },
  { email: 'admin.business1@housingspacesolutions.com', password: 'Admin123!', role: 'admin', full_name: 'Admin Business 1' },
  { email: 'admin.business2@housingspacesolutions.com', password: 'Admin123!', role: 'admin', full_name: 'Admin Business 2' },
  { email: 'admin.agency1@housingspacesolutions.com', password: 'Admin123!', role: 'admin', full_name: 'Admin Agency 1' },
  { email: 'admin.agency2@housingspacesolutions.com', password: 'Admin123!', role: 'admin', full_name: 'Admin Agency 2' },
  
  // Inquilinos (lodgers) - 12 usuarios con login
  ...Array.from({ length: 12 }, (_, i) => ({
    email: `lodger${i + 1}@example.com`,
    password: 'Lodger123!',
    role: 'lodger',
    full_name: `Inquilino ${i + 1}`
  }))
]

async function createUsers() {
  console.log('🚀 Creando usuarios en auth.users...\n')
  
  for (const user of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { role: user.role, full_name: user.full_name }
    })
    
    if (error) {
      if (error.message.includes('already')) {
        console.log(`⚠️  Ya existe: ${user.email}`)
      } else {
        console.error(`❌ Error: ${user.email}:`, error.message)
      }
    } else {
      console.log(`✅ Creado: ${user.email} (${user.role})`)
    }
  }
  
  console.log('\n✅ Proceso completado')
}

createUsers().catch(err => {
  console.error('❌ Error fatal:', err)
  process.exit(1)
})
```

#### **2. Seed 01: Profiles**
```sql
-- Sincronizar profiles con auth.users
INSERT INTO public.profiles (id, email, full_name, role, onboarding_status)
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name',
  u.raw_user_meta_data->>'role',
  'active'
FROM auth.users u
WHERE u.email LIKE '%@housingspacesolutions.com' OR u.email LIKE '%@example.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  updated_at = now();
```

#### **3. Seed 02: Client Accounts**
```sql
-- Crear cuentas y vincular con profiles de admins
INSERT INTO public.client_accounts (id, name, slug, plan_code, billing_cycle, status, start_date)
VALUES
  (gen_random_uuid(), 'Basic Account 1', 'basic-1', 'basic', 'monthly', 'active', '2024-01-01'),
  (gen_random_uuid(), 'Basic Account 2', 'basic-2', 'basic', 'monthly', 'active', '2024-01-01'),
  (gen_random_uuid(), 'Investor Account 1', 'investor-1', 'investor', 'annual', 'active', '2024-01-01'),
  (gen_random_uuid(), 'Investor Account 2', 'investor-2', 'investor', 'annual', 'active', '2024-01-01'),
  (gen_random_uuid(), 'Business Account 1', 'business-1', 'business', 'annual', 'active', '2024-01-01'),
  (gen_random_uuid(), 'Business Account 2', 'business-2', 'business', 'annual', 'active', '2024-01-01'),
  (gen_random_uuid(), 'Agency Account 1', 'agency-1', 'agency', 'annual', 'active', '2024-01-01'),
  (gen_random_uuid(), 'Agency Account 2', 'agency-2', 'agency', 'annual', 'active', '2024-01-01')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  plan_code = EXCLUDED.plan_code,
  updated_at = now();

-- Vincular profiles de admins con sus cuentas
UPDATE public.profiles p
SET client_account_id = ca.id
FROM client_accounts ca
WHERE p.email = 'admin.basic1@housingspacesolutions.com' AND ca.slug = 'basic-1';

UPDATE public.profiles p
SET client_account_id = ca.id
FROM client_accounts ca
WHERE p.email = 'admin.basic2@housingspacesolutions.com' AND ca.slug = 'basic-2';

-- ... (repetir para todos los admins)
```

#### **4. Seed 06: Lodgers (Vincular con Cuentas)**
```sql
-- Vincular inquilinos con cuentas cliente
-- Distribuir 12 inquilinos entre las 8 cuentas

-- Asignar inquilinos a cuentas
WITH lodger_users AS (
  SELECT id, email, ROW_NUMBER() OVER (ORDER BY email) as rn
  FROM auth.users
  WHERE email LIKE 'lodger%@example.com'
),
accounts AS (
  SELECT id, slug, ROW_NUMBER() OVER (ORDER BY slug) as rn
  FROM client_accounts
)
UPDATE public.profiles p
SET client_account_id = a.id
FROM lodger_users lu
JOIN accounts a ON (lu.rn - 1) % 8 + 1 = a.rn
WHERE p.id = lu.id;

-- Crear datos extendidos de lodgers (si usamos Opción 2)
INSERT INTO public.lodgers (id, client_account_id, document_id)
SELECT 
  p.id,
  p.client_account_id,
  'DNI-' || LPAD((10000000 + ROW_NUMBER() OVER (ORDER BY p.email))::text, 8, '0')
FROM profiles p
WHERE p.role = 'lodger';
```

---

## 📋 ORDEN DE EJECUCIÓN CORRECTO

```bash
# 1. Limpiar datos existentes
psql $DATABASE_URL -f supabase/seeds/development/00_cleanup.sql

# 2. Crear usuarios en auth.users (Node.js)
node supabase/scripts/create-auth-users-development.js

# 3. Ejecutar seeds SQL en orden
01_profiles.sql                  # Sincroniza profiles
02_client_accounts.sql           # Crea cuentas y vincula admins
03_entities.sql                  # Crea entidades
04_accommodations.sql            # Crea alojamientos
05_rooms.sql                     # Crea habitaciones
06_lodgers.sql                   # Vincula lodgers con cuentas
07_lodger_room_assignments.sql  # Asigna lodgers a habitaciones
```

---

## ✅ VERIFICACIÓN

Después de ejecutar los seeds, verificar:

```sql
-- 1. Usuarios creados
SELECT COUNT(*) FROM auth.users; -- Debe ser 21 (1 superadmin + 8 admins + 12 lodgers)

-- 2. Profiles creados
SELECT role, COUNT(*) FROM profiles GROUP BY role;
-- superadmin: 1
-- admin: 8
-- lodger: 12

-- 3. Cuentas con admins
SELECT COUNT(*) FROM client_accounts WHERE id IN (
  SELECT DISTINCT client_account_id FROM profiles WHERE role = 'admin'
); -- Debe ser 8

-- 4. Lodgers vinculados
SELECT COUNT(*) FROM profiles WHERE role = 'lodger' AND client_account_id IS NOT NULL;
-- Debe ser 12
```

---

## 🎯 RESULTADO ESPERADO

- ✅ **21 usuarios** en `auth.users` con contraseñas funcionales
- ✅ **21 perfiles** en `profiles` (1 superadmin + 8 admins + 12 lodgers)
- ✅ **8 cuentas cliente** cada una con su admin principal
- ✅ **12 inquilinos** distribuidos entre las cuentas, con login funcional
- ✅ **Integridad referencial** completa
- ✅ **Dashboard de inquilinos** accesible para lodgers
