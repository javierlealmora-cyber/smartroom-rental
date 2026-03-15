-- ============================================================================
-- CREAR USUARIOS EN AUTH.USERS - STAGING
-- ============================================================================
-- Este script crea usuarios directamente en auth.users usando bcrypt
-- Los usuarios creados con este método SÍ aparecen en el dashboard de Supabase
-- ============================================================================

-- Crear superadmin (si no existe)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000'::uuid, 
   'javierlealmora@housingspacesolutions.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), 
   '{"provider":"email","providers":["email"]}', '{"role":"superadmin","full_name":"Javier Leal Mora"}', 
   'authenticated', 'authenticated', NOW(), NOW(), '', '', '', '')
ON CONFLICT (email) DO NOTHING;

-- Crear admins Basic
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000'::uuid, 
   'basicuser1@housingspacesolutions.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), 
   '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Basic User 1"}', 
   'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000'::uuid, 
   'basicuser2@housingspacesolutions.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), 
   '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Basic User 2"}', 
   'authenticated', 'authenticated', NOW(), NOW(), '', '', '', '')
ON CONFLICT (email) DO NOTHING;

-- Crear admins Investor
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000'::uuid, 
   'investorentidad1@housingspacesolutions.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), 
   '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Investor Entity 1"}', 
   'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000'::uuid, 
   'investorentidad4@housingspacesolutions.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), 
   '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Investor Entity 4"}', 
   'authenticated', 'authenticated', NOW(), NOW(), '', '', '', '')
ON CONFLICT (email) DO NOTHING;

-- Crear admins Business
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000'::uuid, 
   'businessentidad2@housingspacesolutions.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), 
   '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Business Entity 2"}', 
   'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000'::uuid, 
   'businessentidad5@housingspacesolutions.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), 
   '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Business Entity 5"}', 
   'authenticated', 'authenticated', NOW(), NOW(), '', '', '', '')
ON CONFLICT (email) DO NOTHING;

-- Crear admins Agency
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000'::uuid, 
   'agententidad3@housingspacesolutions.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), 
   '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Agent Entity 3"}', 
   'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000'::uuid, 
   'agententidad6@housingspacesolutions.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), 
   '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Agent Entity 6"}', 
   'authenticated', 'authenticated', NOW(), NOW(), '', '', '', '')
ON CONFLICT (email) DO NOTHING;

-- Crear 80 lodgers (inquilinos)
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'inquilino' || n || '@housingspacesolutions.com',
  crypt('Test123456!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('role', 'lodger', 'full_name', 'Inquilino ' || n),
  'authenticated',
  'authenticated',
  NOW(),
  NOW(),
  '', '', '', ''
FROM generate_series(1, 80) AS n
ON CONFLICT (email) DO NOTHING;

-- Crear identities para que los usuarios puedan hacer login
-- CRÍTICO: Sin identities, los usuarios NO pueden autenticarse
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
AND u.email LIKE '%@housingspacesolutions.com'
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Verificación
SELECT 
  'Usuarios creados en STAGING' as status,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE raw_user_meta_data->>'role' = 'superadmin') as superadmin,
  COUNT(*) FILTER (WHERE raw_user_meta_data->>'role' = 'admin') as admins,
  COUNT(*) FILTER (WHERE raw_user_meta_data->>'role' = 'lodger') as lodgers,
  COUNT(i.id) as con_identity
FROM auth.users u
LEFT JOIN auth.identities i ON u.id = i.user_id
WHERE u.email LIKE '%@housingspacesolutions.com';
