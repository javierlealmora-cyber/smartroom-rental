# Seeds de Staging - SmartRoom Rental Platform

## 📋 Orden de Ejecución

### **PASO 1: Crear Usuarios con Contraseñas** ⚠️ **OBLIGATORIO PRIMERO**

```bash
# Configurar variables de entorno
$env:STAGING_SUPABASE_URL="https://lopdwrsmkmtboeczxotj.supabase.co"
$env:STAGING_SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Ejecutar script de creación de usuarios
node supabase/scripts/create-auth-users-staging.js
```

**⚠️ IMPORTANTE:** Lee `00_IMPORTANTE_USUARIOS.md` para entender por qué NO debes crear usuarios directamente en SQL.

### **PASO 2: Ejecutar Seeds SQL en Orden**

```bash
# Ejecutar en orden:
01_profiles.sql                  # Sincroniza profiles con auth.users
02_client_accounts.sql           # Crea cuentas de cliente
03_entities.sql                  # Crea entidades (payers/owners)
04_accommodations.sql            # Crea alojamientos
05_rooms.sql                     # Crea habitaciones
06_lodgers.sql                   # Sincroniza lodgers con auth.users
07_lodger_room_assignments.sql  # Asigna inquilinos a habitaciones
```

---

## 🔑 Credenciales de Staging

### **Superadmins/Admins:**
- Password: `@2#H2s060722`
- Usuarios:
  - `javierlealmora@housingspacesolutions.com`
  - `basicuser1@housingspacesolutions.com`
  - `basicuser2@housingspacesolutions.com`
  - `investorentidad1@housingspacesolutions.com`
  - `investorentidad4@housingspacesolutions.com`
  - `businessentidad2@housingspacesolutions.com`
  - `businessentidad5@housingspacesolutions.com`
  - `agententidad3@housingspacesolutions.com`
  - `agententidad6@housingspacesolutions.com`

### **Inquilinos (80 usuarios):**
- Password: `Test123456!`
- Emails: `inquilino1@housingspacesolutions.com` a `inquilino80@housingspacesolutions.com`

---

## 📊 Datos que se Crean

| Tabla | Cantidad | Descripción |
|-------|----------|-------------|
| `auth.users` | 90 | Usuarios con contraseñas válidas |
| `profiles` | 90 | Perfiles sincronizados con auth.users |
| `plans_catalog` | 4 | Planes de suscripción (basic, investor, business, agency) |
| `client_accounts` | 8 | Cuentas de cliente |
| `entities` | 14 | Entidades (payers/owners) |
| `accommodations` | 42 | Alojamientos |
| `rooms` | 210 | Habitaciones |
| `lodgers` | 80 | Inquilinos con usuarios válidos |
| `lodger_room_assignments` | ~85 | Asignaciones activas + historial |

---

## ⚠️ Notas Importantes

1. **NUNCA** crees usuarios directamente en `auth.users` con SQL
2. **SIEMPRE** usa el script Node.js con Supabase Admin API
3. Los scripts SQL sincronizan datos con los usuarios ya creados
4. Los IDs en `profiles` y `lodgers` deben coincidir con `auth.users`

---

## 🔧 Service Role Key

Para obtener el `service_role_key`:

1. Ve a: https://supabase.com/dashboard/project/lopdwrsmkmtboeczxotj/settings/api
2. Copia el **service_role** key (secret)
3. **NUNCA** la expongas en el frontend o en código versionado

---

## 🚀 Verificación

Después de ejecutar todos los seeds:

```sql
-- Verificar usuarios
SELECT COUNT(*) FROM auth.users;  -- Debe ser 90

-- Verificar profiles
SELECT COUNT(*) FROM public.profiles;  -- Debe ser 90

-- Verificar lodgers
SELECT COUNT(*) FROM public.lodgers;  -- Debe ser 80

-- Verificar que los IDs coinciden
SELECT COUNT(*) 
FROM public.lodgers l
JOIN auth.users u ON l.id = u.id;  -- Debe ser 80
```

---

## 📝 Archivos Importantes

- `00_IMPORTANTE_USUARIOS.md` - **LEE ESTO PRIMERO** - Explica por qué NO usar SQL para crear usuarios
- `create-auth-users-staging.js` - Script para crear usuarios con contraseñas
- `01_profiles.sql` - Sincroniza profiles con auth.users
- `06_lodgers.sql` - Sincroniza lodgers con auth.users
