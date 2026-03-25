-- ============================================================================
-- Script para crear usuario super-admin de prueba en DEV
-- Email: super-admin-test@housingspacesolutions.com
-- Password: @2#H2s060722
-- ============================================================================

-- ============================================================================
-- PASO 1: Crear usuario en Auth Dashboard (MANUAL)
-- ============================================================================
-- 1. Ir a: https://supabase.com/dashboard/project/lqwyyyttjamirccdtlvl/auth/users
-- 2. Click en "Add user" → "Create new user"
-- 3. Email: super-admin-test@housingspacesolutions.com
-- 4. Password: @2#H2s060722
-- 5. ✅ Marcar "Auto Confirm User"
-- 6. Click "Create user"
-- 
-- LUEGO ejecutar el resto de este script en SQL Editor:
-- https://supabase.com/dashboard/project/lqwyyyttjamirccdtlvl/sql/new
-- ============================================================================

-- PASO 2: Crear perfil en public.profiles
-- Primero obtenemos el UUID del usuario recién creado
DO $$
DECLARE
  user_uuid uuid;
BEGIN
  -- Obtener UUID del usuario
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = 'super-admin-test@housingspacesolutions.com';

  -- Si el usuario existe, crear/actualizar su perfil
  IF user_uuid IS NOT NULL THEN
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      role,
      onboarding_status,
      is_primary_admin,
      created_at,
      updated_at
    )
    VALUES (
      user_uuid,
      'super-admin-test@housingspacesolutions.com',
      'Super Admin Test',
      'superadmin',
      'active',
      true,
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      role = 'superadmin',
      is_primary_admin = true,
      onboarding_status = 'active',
      updated_at = now();

    RAISE NOTICE 'Perfil de super-admin creado/actualizado para UUID: %', user_uuid;
  ELSE
    RAISE EXCEPTION 'Usuario no encontrado. Por favor, créalo primero en Auth Dashboard.';
  END IF;
END $$;

-- PASO 3: Verificar creación
SELECT 
  u.id,
  u.email,
  u.created_at as auth_created_at,
  u.confirmed_at,
  p.full_name,
  p.role,
  p.is_primary_admin,
  p.onboarding_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'super-admin-test@housingspacesolutions.com';

-- RESULTADO ESPERADO:
-- ✅ Usuario existe en auth.users
-- ✅ Usuario confirmado (confirmed_at no es NULL)
-- ✅ Perfil existe en public.profiles
-- ✅ role = 'superadmin'
-- ✅ is_primary_admin = true
-- ✅ onboarding_status = 'active'
