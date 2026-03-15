# Seeds de Development - SmartRoom Rental Platform

⚠️ **IMPORTANTE:** Los inquilinos (lodgers) son usuarios con login. NO existe tabla `lodgers` separada.

## � Ejecución Automática (Recomendado)

### **Método 1: Script Todo-en-Uno**

```powershell
# 1. Configurar variables de entorno
$env:DEV_SUPABASE_URL = "https://lqwyyyttjamirccdtlvl.supabase.co"
$env:DEV_SUPABASE_SERVICE_KEY = "tu-service-role-key"

# 2. Ejecutar desde la raíz del proyecto
.\supabase\seeds\development\run-all-seeds.ps1
```

Este script ejecuta automáticamente:
1. ✅ Limpieza de datos (preserva superadmin)
2. ✅ Creación de usuarios vía Admin API
3. ✅ Ejecución de seeds SQL en orden

---

## 📋 Ejecución Manual (Paso a Paso)

### **PASO 1: Limpiar Datos**

```bash
psql $env:DATABASE_URL -f supabase/seeds/development/00_cleanup_client_data.sql
```

### **PASO 2: Crear Usuarios con SQL** ⚠️ **OBLIGATORIO**

```bash
psql $env:DATABASE_URL -f supabase/seeds/development/00_create_auth_users.sql
```

**✅ CONFIRMADO:** Este método SQL directo con bcrypt funciona perfectamente:
- Los usuarios SÍ aparecen en el dashboard de Supabase
- Los usuarios SÍ pueden hacer login
- UUIDs fijos para integridad referencial

### **PASO 3: Ejecutar Seeds SQL**

```bash
# Orden de ejecución:
01_profiles.sql                  # Sincroniza profiles con auth.users
02_client_accounts.sql           # Crea 8 cuentas cliente
03_entities.sql                  # Crea 14 entidades legales
04_accommodations.sql            # Crea 8 alojamientos
05_rooms.sql                     # Crea 24 habitaciones
07_lodger_room_assignments.sql  # Asigna 8 lodgers a habitaciones
```

**Ejecutar todos:**
```powershell
Get-ChildItem supabase\seeds\development\*.sql | Where-Object { $_.Name -match '^\d+_' } | Sort-Object Name | ForEach-Object {
    Write-Host "Ejecutando $($_.Name)..." -ForegroundColor Green
    psql $env:DATABASE_URL -f $_.FullName
}
```

## 📊 Datos que se Crearán

- **21 Usuarios en auth.users** (1 superadmin + 8 admins + 12 lodgers)
- **8 Cuentas Cliente** (2 Basic, 2 Investor, 2 Business, 2 Agency)
- **14 Entidades Legales** (8 payer + 6 owner)
- **8 Alojamientos** (1 por cuenta cliente)
- **24 Habitaciones** (16 libres + 8 ocupadas)
- **12 Lodgers** (como profiles con role='lodger')
- **8 Asignaciones** activas de lodgers a habitaciones

## ⚠️ Notas Importantes

1. **NO ejecutar en producción** - Solo para desarrollo
2. **Backup antes de ejecutar** - Por si necesitas revertir
3. **Orden de ejecución** - Respetar el orden numérico de los archivos
4. **Usuarios primero** - Siempre crear usuarios de auth antes de los seeds SQL

## 🔍 Verificación

Después de ejecutar los seeds, verifica:

```sql
-- Verificar cuentas
SELECT name, slug, status FROM client_accounts;

-- Verificar entidades
SELECT e.name, ca.name as cuenta 
FROM entities e 
JOIN client_accounts ca ON e.account_id = ca.id;

-- Verificar alojamientos
SELECT a.name, e.name as entidad 
FROM accommodations a 
JOIN entities e ON a.entity_id = e.id;

-- Verificar habitaciones
SELECT r.name, a.name as alojamiento, r.status
FROM rooms r 
JOIN accommodations a ON r.accommodation_id = a.id;

-- Verificar inquilinos
SELECT l.first_name, l.last_name, ca.name as cuenta
FROM lodgers l
JOIN client_accounts ca ON l.account_id = ca.id;
```

## 🚀 Ejecución Rápida (Todo en Uno)

```bash
# 1. Limpiar datos
psql $env:DATABASE_URL -f supabase/seeds/dev/00_cleanup_client_data.sql

# 2. Crear usuarios (requiere script Node.js)
node supabase/scripts/create-auth-users-dev.js

# 3. Ejecutar todos los seeds
Get-ChildItem supabase/seeds/dev/*.sql | Where-Object { $_.Name -match '^\d+_' } | Sort-Object Name | ForEach-Object {
    psql $env:DATABASE_URL -f $_.FullName
}
```
