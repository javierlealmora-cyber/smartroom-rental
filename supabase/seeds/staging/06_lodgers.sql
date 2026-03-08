-- ============================================================================
-- SEEDS: lodgers
-- Ambiente: STAGING
-- Fecha: 2026-03-08
-- Descripción: Inquilinos (registros de datos) - idempotente
-- IMPORTANTE: Los inquilinos NO tienen room_id ni check_in_date
-- La asignación a habitaciones se hace en lodger_room_assignments
-- Los primeros 20 inquilinos tienen usuario en auth.users (inquilino1-20@housingspacesolutions.com)
-- Password común: Test123456!
-- ============================================================================

-- Nombres españoles para inquilinos
CREATE TEMP TABLE nombres_temp (nombre text, apellido1 text, apellido2 text, genero text);
INSERT INTO nombres_temp VALUES
  ('Juan', 'García', 'López', 'male'),
  ('María', 'Martínez', 'González', 'female'),
  ('Pedro', 'Rodríguez', 'Fernández', 'male'),
  ('Ana', 'Sánchez', 'Pérez', 'female'),
  ('Carlos', 'López', 'Martín', 'male'),
  ('Laura', 'González', 'Jiménez', 'female'),
  ('David', 'Fernández', 'Ruiz', 'male'),
  ('Elena', 'Díaz', 'Hernández', 'female'),
  ('Miguel', 'Pérez', 'Moreno', 'male'),
  ('Sara', 'Ruiz', 'Muñoz', 'female'),
  ('Javier', 'Moreno', 'Álvarez', 'male'),
  ('Carmen', 'Muñoz', 'Romero', 'female'),
  ('Antonio', 'Álvarez', 'Alonso', 'male'),
  ('Isabel', 'Romero', 'Gutiérrez', 'female'),
  ('Francisco', 'Alonso', 'Navarro', 'male'),
  ('Patricia', 'Gutiérrez', 'Torres', 'female'),
  ('José', 'Navarro', 'Domínguez', 'male'),
  ('Lucía', 'Torres', 'Vázquez', 'female'),
  ('Manuel', 'Domínguez', 'Ramos', 'male'),
  ('Marta', 'Vázquez', 'Gil', 'female');

-- ⚠️ IMPORTANTE: Este script sincroniza lodgers con auth.users
-- Primero ejecuta: node supabase/scripts/create-auth-users-staging.js
-- Ver 00_IMPORTANTE_USUARIOS.md para más detalles

-- Limpiar lodgers existentes
DELETE FROM public.lodgers;

-- Crear lodgers usando los IDs reales de auth.users
-- Esto asegura que cada lodger tenga un usuario válido para login
INSERT INTO public.lodgers (
  id, client_account_id, full_name, first_name, last_name1, last_name2,
  email, phone, document_id, gender, status
) 
SELECT 
  u.id,  -- ✅ Usar ID real de auth.users
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY u.email) % 8 = 1 THEN '10000000-0000-0000-0000-000000000001'::uuid
    WHEN ROW_NUMBER() OVER (ORDER BY u.email) % 8 = 2 THEN '10000000-0000-0000-0000-000000000002'::uuid
    WHEN ROW_NUMBER() OVER (ORDER BY u.email) % 8 = 3 THEN '10000000-0000-0000-0000-000000000003'::uuid
    WHEN ROW_NUMBER() OVER (ORDER BY u.email) % 8 = 4 THEN '10000000-0000-0000-0000-000000000004'::uuid
    WHEN ROW_NUMBER() OVER (ORDER BY u.email) % 8 = 5 THEN '10000000-0000-0000-0000-000000000005'::uuid
    WHEN ROW_NUMBER() OVER (ORDER BY u.email) % 8 = 6 THEN '10000000-0000-0000-0000-000000000006'::uuid
    WHEN ROW_NUMBER() OVER (ORDER BY u.email) % 8 = 7 THEN '10000000-0000-0000-0000-000000000007'::uuid
    ELSE '10000000-0000-0000-0000-000000000008'::uuid
  END,
  u.raw_user_meta_data->>'full_name',
  split_part(u.raw_user_meta_data->>'full_name', ' ', 1),
  split_part(u.raw_user_meta_data->>'full_name', ' ', 2),
  'Test',
  u.email,
  '+346' || LPAD((600000000 + ROW_NUMBER() OVER (ORDER BY u.email))::text, 9, '0'),
  LPAD(ROW_NUMBER() OVER (ORDER BY u.email)::text, 8, '0') || 'X',
  CASE WHEN ROW_NUMBER() OVER (ORDER BY u.email) % 2 = 0 THEN 'female' ELSE 'male' END,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY u.email) % 20 = 0 THEN 'invited'
    WHEN ROW_NUMBER() OVER (ORDER BY u.email) % 25 = 0 THEN 'inactive'
    ELSE 'active'
  END
FROM auth.users u
WHERE u.email LIKE 'inquilino%@housingspacesolutions.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  status = EXCLUDED.status,
  updated_at = now();


-- Limpiar tabla temporal
DROP TABLE IF EXISTS nombres_temp;

-- Verificación
SELECT 'Inquilinos insertados/actualizados:' as status;
SELECT COUNT(*) as total_lodgers FROM public.lodgers;

-- Resumen por estado
SELECT status, COUNT(*) as count
FROM public.lodgers
GROUP BY status
ORDER BY status;

-- Resumen por client account
SELECT 
  ca.name as client_account,
  ca.plan_code,
  COUNT(l.id) as num_lodgers
FROM public.client_accounts ca
LEFT JOIN public.lodgers l ON ca.id = l.client_account_id
GROUP BY ca.id, ca.name, ca.plan_code
ORDER BY ca.plan_code, ca.name;

-- Todos los inquilinos (80 total)
SELECT 
  l.email,
  l.full_name,
  l.status,
  ca.name as client_account
FROM public.lodgers l
JOIN public.client_accounts ca ON l.client_account_id = ca.id
ORDER BY l.email
LIMIT 20;
