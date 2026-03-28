-- ============================================================================
-- EJECUTAR ESTE SCRIPT COMPLETO EN SUPABASE SQL EDITOR
-- URL: https://supabase.com/dashboard/project/lqwyyyttjamirccdtlvl/sql/new
-- ============================================================================
-- Usuario: super-admin-test@housingspacesolutions.com
-- Password: @2#H2s060722
-- ============================================================================

-- PASO 1: Insertar usuario directamente en auth.users
-- NOTA: Esto usa crypt() de pgcrypto para hashear la contraseña
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'super-admin-test@housingspacesolutions.com',
  crypt('@2#H2s060722', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Super Admin Test"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE email = 'super-admin-test@housingspacesolutions.com'
);

-- PASO 2: Crear perfil en public.profiles
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
SELECT 
  u.id,
  'super-admin-test@housingspacesolutions.com',
  'Super Admin Test',
  'superadmin',
  'active',
  true,
  now(),
  now()
FROM auth.users u
WHERE u.email = 'super-admin-test@housingspacesolutions.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'superadmin',
  is_primary_admin = true,
  onboarding_status = 'active',
  full_name = 'Super Admin Test',
  updated_at = now();

-- PASO 3: Verificar creación
SELECT 
  '✅ USUARIO CREADO EXITOSAMENTE' as status,
  u.id,
  u.email,
  u.created_at as auth_created,
  u.email_confirmed_at as confirmed,
  p.full_name,
  p.role,
  p.is_primary_admin,
  p.onboarding_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE u.email = 'super-admin-test@housingspacesolutions.com';

-- RESULTADO ESPERADO:
-- ✅ status: "USUARIO CREADO EXITOSAMENTE"
-- ✅ email: super-admin-test@housingspacesolutions.com
-- ✅ confirmed: [timestamp actual]
-- ✅ role: superadmin
-- ✅ is_primary_admin: true
-- ✅ onboarding_status: active
