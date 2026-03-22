-- =====================================================
-- LIMPIEZA DE DATOS DE CUENTAS CLIENTE EN DEVELOPMENT
-- =====================================================
-- Este script elimina TODOS los datos relacionados con cuentas cliente
-- PRESERVA: Datos de superadmin, planes, y datos estáticos
-- =====================================================

-- Deshabilitar triggers temporalmente para evitar problemas de cascada
SET session_replication_role = 'replica';

-- 1. Eliminar asignaciones de inquilinos a habitaciones
DELETE FROM lodger_room_assignments;

-- 2. Eliminar habitaciones
DELETE FROM rooms;

-- 4. Eliminar alojamientos
DELETE FROM accommodations;

-- 5. Eliminar entidades
DELETE FROM entities;

-- 6. Eliminar cuentas cliente
DELETE FROM client_accounts;

-- 7. Eliminar profiles de usuarios que NO son superadmin
DELETE FROM profiles
WHERE role != 'superadmin';

-- 8. Eliminar usuarios de auth.users que NO son superadmin
DELETE FROM auth.users
WHERE id NOT IN (
  SELECT id FROM profiles WHERE role = 'superadmin'
);

-- Rehabilitar triggers
SET session_replication_role = 'origin';

-- Verificación de limpieza
SELECT 
  'client_accounts' as tabla, COUNT(*) as registros FROM client_accounts
UNION ALL
SELECT 'entities', COUNT(*) FROM entities
UNION ALL
SELECT 'accommodations', COUNT(*) FROM accommodations
UNION ALL
SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL
SELECT 'lodger_room_assignments', COUNT(*) FROM lodger_room_assignments
UNION ALL
SELECT 'profiles (no superadmin)', COUNT(*) FROM profiles WHERE role != 'superadmin'
UNION ALL
SELECT 'auth.users (no superadmin)', COUNT(*) FROM auth.users WHERE id NOT IN (SELECT id FROM profiles WHERE role = 'superadmin');

SELECT '✅ Base de datos limpia - Solo queda superadmin' as status;
