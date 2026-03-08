-- ============================================================================
-- SEEDS: profiles
-- Ambiente: STAGING
-- Fecha: 2026-03-08
-- Descripción: Perfiles de usuarios (idempotente)
-- ============================================================================

-- ⚠️ IMPORTANTE: PRIMERO debes ejecutar el script de creación de usuarios:
--    node supabase/scripts/create-auth-users-staging.js
--
-- Este script sincroniza los profiles con los usuarios ya creados en auth.users
-- NO intentes crear usuarios directamente en SQL - ver 00_IMPORTANTE_USUARIOS.md

-- Limpiar profiles existentes (excepto super-admin-test si existe)
DELETE FROM public.profiles 
WHERE id NOT IN (
  SELECT id FROM auth.users WHERE email = 'super-admin-test@housingspacesolutions.com'
);

-- Sincronizar profiles con auth.users
-- Esto crea profiles para TODOS los usuarios que ya existen en auth.users
INSERT INTO public.profiles (id, email, full_name, role, client_account_id, onboarding_status, is_primary_admin)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  COALESCE(u.raw_user_meta_data->>'role', 'user'),
  NULL,  -- Se actualizará en 02_client_accounts.sql
  'active',
  CASE 
    WHEN u.raw_user_meta_data->>'role' IN ('superadmin', 'admin') THEN true
    ELSE false
  END
FROM auth.users u
WHERE u.email LIKE '%@housingspacesolutions.com'
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  onboarding_status = EXCLUDED.onboarding_status,
  updated_at = now();

-- NOTA: Los client_account_id se actualizarán en el siguiente script (02_client_accounts.sql)
-- usando UPDATE statements después de crear las cuentas

-- Verificación
SELECT 'Perfiles insertados/actualizados:' as status;
SELECT email, role, onboarding_status FROM public.profiles ORDER BY role, email;
