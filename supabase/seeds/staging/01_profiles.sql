-- ============================================================================
-- SEEDS: profiles
-- Ambiente: STAGING
-- Fecha: 2026-03-08
-- Descripción: Perfiles de usuarios (idempotente)
-- NOTA: Los IDs deben coincidir con los usuarios creados en auth.users
-- ============================================================================

-- IMPORTANTE: Este script asume que los usuarios ya fueron creados en auth.users
-- Los UUIDs deben obtenerse después de crear los usuarios
-- Por ahora usamos UUIDs fijos que se actualizarán después

-- Insertar o actualizar perfiles
-- NOTA: Los IDs reales se obtendrán del script create-auth-users-staging.js

-- Superadmin
INSERT INTO public.profiles (id, email, full_name, role, client_account_id, onboarding_status, is_primary_admin)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'javierlealmora@housingspacesolutions.com', 'Javier Leal Mora', 'superadmin', NULL, 'active', true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  onboarding_status = EXCLUDED.onboarding_status,
  updated_at = now();

-- Basic users (se actualizará client_account_id después)
INSERT INTO public.profiles (id, email, full_name, role, client_account_id, onboarding_status, is_primary_admin)
VALUES
  ('00000000-0000-0000-0000-000000000002'::uuid, 'basicuser1@housingspacesolutions.com', 'Basic User 1', 'admin', NULL, 'active', true),
  ('00000000-0000-0000-0000-000000000003'::uuid, 'basicuser2@housingspacesolutions.com', 'Basic User 2', 'admin', NULL, 'active', true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  onboarding_status = EXCLUDED.onboarding_status,
  updated_at = now();

-- Investor users
INSERT INTO public.profiles (id, email, full_name, role, client_account_id, onboarding_status, is_primary_admin)
VALUES
  ('00000000-0000-0000-0000-000000000004'::uuid, 'investorentidad1@housingspacesolutions.com', 'Investor Entity 1', 'admin', NULL, 'active', true),
  ('00000000-0000-0000-0000-000000000005'::uuid, 'investorentidad4@housingspacesolutions.com', 'Investor Entity 4', 'admin', NULL, 'active', true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  onboarding_status = EXCLUDED.onboarding_status,
  updated_at = now();

-- Business users
INSERT INTO public.profiles (id, email, full_name, role, client_account_id, onboarding_status, is_primary_admin)
VALUES
  ('00000000-0000-0000-0000-000000000006'::uuid, 'businessentidad2@housingspacesolutions.com', 'Business Entity 2', 'admin', NULL, 'active', true),
  ('00000000-0000-0000-0000-000000000007'::uuid, 'businessentidad5@housingspacesolutions.com', 'Business Entity 5', 'admin', NULL, 'active', true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  onboarding_status = EXCLUDED.onboarding_status,
  updated_at = now();

-- Agency users
INSERT INTO public.profiles (id, email, full_name, role, client_account_id, onboarding_status, is_primary_admin)
VALUES
  ('00000000-0000-0000-0000-000000000008'::uuid, 'agententidad3@housingspacesolutions.com', 'Agent Entity 3', 'admin', NULL, 'active', true),
  ('00000000-0000-0000-0000-000000000009'::uuid, 'agententidad6@housingspacesolutions.com', 'Agent Entity 6', 'admin', NULL, 'active', true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  onboarding_status = EXCLUDED.onboarding_status,
  updated_at = now();

-- Lodgers (inquilinos)
INSERT INTO public.profiles (id, email, full_name, role, client_account_id, onboarding_status, is_primary_admin)
VALUES
  ('00000000-0000-0000-0000-000000000010'::uuid, 'inquilino1@housingspacesolutions.com', 'Inquilino 1', 'lodger', NULL, 'active', false),
  ('00000000-0000-0000-0000-000000000011'::uuid, 'inquilino2@housingspacesolutions.com', 'Inquilino 2', 'lodger', NULL, 'active', false),
  ('00000000-0000-0000-0000-000000000012'::uuid, 'inquilino3@housingspacesolutions.com', 'Inquilino 3', 'lodger', NULL, 'active', false),
  ('00000000-0000-0000-0000-000000000013'::uuid, 'inquilino4@housingspacesolutions.com', 'Inquilino 4', 'lodger', NULL, 'active', false),
  ('00000000-0000-0000-0000-000000000014'::uuid, 'inquilino5@housingspacesolutions.com', 'Inquilino 5', 'lodger', NULL, 'active', false)
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
