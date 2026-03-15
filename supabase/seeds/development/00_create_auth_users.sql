-- ============================================================================
-- CREAR USUARIOS EN AUTH.USERS - DEVELOPMENT
-- ============================================================================
-- Este script crea usuarios directamente en auth.users usando bcrypt
-- Los usuarios creados con este método SÍ aparecen en el dashboard de Supabase
-- ============================================================================

-- Crear 8 admins con UUIDs fijos
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
  -- Admin Basic 1
  ('10000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 
   'admin.basic1@housingspacesolutions.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), 
   '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Admin Basic 1"}', 
   'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  
  -- Admin Basic 2
  ('10000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 
   'admin.basic2@housingspacesolutions.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), 
   '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Admin Basic 2"}', 
   'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  
  -- Admin Investor 1
  ('10000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 
   'admin.investor1@housingspacesolutions.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), 
   '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Admin Investor 1"}', 
   'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  
  -- Admin Investor 2
  ('10000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 
   'admin.investor2@housingspacesolutions.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), 
   '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Admin Investor 2"}', 
   'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  
  -- Admin Business 1
  ('10000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 
   'admin.business1@housingspacesolutions.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), 
   '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Admin Business 1"}', 
   'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  
  -- Admin Business 2
  ('10000000-0000-0000-0000-000000000006'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 
   'admin.business2@housingspacesolutions.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), 
   '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Admin Business 2"}', 
   'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  
  -- Admin Agency 1
  ('10000000-0000-0000-0000-000000000007'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 
   'admin.agency1@housingspacesolutions.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), 
   '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Admin Agency 1"}', 
   'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  
  -- Admin Agency 2
  ('10000000-0000-0000-0000-000000000008'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 
   'admin.agency2@housingspacesolutions.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), 
   '{"provider":"email","providers":["email"]}', '{"role":"admin","full_name":"Admin Agency 2"}', 
   'authenticated', 'authenticated', NOW(), NOW(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Crear 12 lodgers con UUIDs fijos
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, aud, role, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES
  ('20000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'lodger1@example.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"lodger","full_name":"Inquilino 1"}', 'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  ('20000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'lodger2@example.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"lodger","full_name":"Inquilino 2"}', 'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  ('20000000-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'lodger3@example.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"lodger","full_name":"Inquilino 3"}', 'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  ('20000000-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'lodger4@example.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"lodger","full_name":"Inquilino 4"}', 'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  ('20000000-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'lodger5@example.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"lodger","full_name":"Inquilino 5"}', 'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  ('20000000-0000-0000-0000-000000000006'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'lodger6@example.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"lodger","full_name":"Inquilino 6"}', 'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  ('20000000-0000-0000-0000-000000000007'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'lodger7@example.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"lodger","full_name":"Inquilino 7"}', 'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  ('20000000-0000-0000-0000-000000000008'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'lodger8@example.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"lodger","full_name":"Inquilino 8"}', 'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  ('20000000-0000-0000-0000-000000000009'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'lodger9@example.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"lodger","full_name":"Inquilino 9"}', 'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  ('20000000-0000-0000-0000-00000000000a'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'lodger10@example.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"lodger","full_name":"Inquilino 10"}', 'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  ('20000000-0000-0000-0000-00000000000b'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'lodger11@example.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"lodger","full_name":"Inquilino 11"}', 'authenticated', 'authenticated', NOW(), NOW(), '', '', '', ''),
  ('20000000-0000-0000-0000-00000000000c'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'lodger12@example.com', crypt('@2#H2s060722', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"role":"lodger","full_name":"Inquilino 12"}', 'authenticated', 'authenticated', NOW(), NOW(), '', '', '', '')
ON CONFLICT (id) DO NOTHING;

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
AND (u.email LIKE '%@housingspacesolutions.com' OR u.email LIKE '%@example.com')
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Verificación
SELECT 
  'Usuarios creados' as status,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE raw_user_meta_data->>'role' = 'admin') as admins,
  COUNT(*) FILTER (WHERE raw_user_meta_data->>'role' = 'lodger') as lodgers,
  COUNT(i.id) as con_identity
FROM auth.users u
LEFT JOIN auth.identities i ON u.id = i.user_id
WHERE u.email LIKE '%@housingspacesolutions.com' OR u.email LIKE '%@example.com';
