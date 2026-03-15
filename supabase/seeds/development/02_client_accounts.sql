-- ============================================================================
-- SEEDS: client_accounts
-- Ambiente: DEVELOPMENT
-- Fecha: 2026-03-15
-- Descripción: Cuentas de cliente y vinculación con admins (idempotente)
-- ============================================================================

-- Crear 8 cuentas cliente (2 de cada plan)
-- Plan Basic: SIN branding personalizado (usa default)
-- Otros planes: CON branding personalizado
INSERT INTO public.client_accounts (
  name, slug, plan_code, billing_cycle, status, start_date, end_date,
  branding_name, branding_primary_color, branding_secondary_color
) VALUES
  -- Basic: sin branding personalizado
  ('Basic Rentals 1', 'basic-rentals-1', 'basic', 'monthly', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', NULL, NULL, NULL),
  ('Basic Rentals 2', 'basic-rentals-2', 'basic', 'monthly', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 month', NULL, NULL, NULL),
  -- Investor: con branding personalizado
  ('Investor Properties 1', 'investor-properties-1', 'investor', 'annual', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'Investor Properties 1', '#111827', '#3B82F6'),
  ('Investor Properties 2', 'investor-properties-2', 'investor', 'annual', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'Investor Properties 2', '#111827', '#3B82F6'),
  -- Business: con branding personalizado
  ('Business Housing 1', 'business-housing-1', 'business', 'annual', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'Business Housing 1', '#111827', '#3B82F6'),
  ('Business Housing 2', 'business-housing-2', 'business', 'annual', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'Business Housing 2', '#111827', '#3B82F6'),
  -- Agency: con branding personalizado
  ('Agency Rentals 1', 'agency-rentals-1', 'agency', 'annual', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'Agency Rentals 1', '#111827', '#3B82F6'),
  ('Agency Rentals 2', 'agency-rentals-2', 'agency', 'annual', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'Agency Rentals 2', '#111827', '#3B82F6')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  plan_code = EXCLUDED.plan_code,
  billing_cycle = EXCLUDED.billing_cycle,
  status = EXCLUDED.status,
  start_date = EXCLUDED.start_date,
  updated_at = now();

-- Vincular profiles de admins con sus cuentas cliente
-- Cada admin se vincula a su cuenta correspondiente por email
UPDATE public.profiles p
SET client_account_id = ca.id, is_primary_admin = true
FROM client_accounts ca
WHERE p.email = 'admin.basic1@housingspacesolutions.com' AND ca.slug = 'basic-1';

UPDATE public.profiles p
SET client_account_id = ca.id, is_primary_admin = true
FROM client_accounts ca
WHERE p.email = 'admin.basic2@housingspacesolutions.com' AND ca.slug = 'basic-2';

UPDATE public.profiles p
SET client_account_id = ca.id, is_primary_admin = true
FROM client_accounts ca
WHERE p.email = 'admin.investor1@housingspacesolutions.com' AND ca.slug = 'investor-1';

UPDATE public.profiles p
SET client_account_id = ca.id, is_primary_admin = true
FROM client_accounts ca
WHERE p.email = 'admin.investor2@housingspacesolutions.com' AND ca.slug = 'investor-2';

UPDATE public.profiles p
SET client_account_id = ca.id, is_primary_admin = true
FROM client_accounts ca
WHERE p.email = 'admin.business1@housingspacesolutions.com' AND ca.slug = 'business-1';

UPDATE public.profiles p
SET client_account_id = ca.id, is_primary_admin = true
FROM client_accounts ca
WHERE p.email = 'admin.business2@housingspacesolutions.com' AND ca.slug = 'business-2';

UPDATE public.profiles p
SET client_account_id = ca.id, is_primary_admin = true
FROM client_accounts ca
WHERE p.email = 'admin.agency1@housingspacesolutions.com' AND ca.slug = 'agency-1';

UPDATE public.profiles p
SET client_account_id = ca.id, is_primary_admin = true
FROM client_accounts ca
WHERE p.email = 'admin.agency2@housingspacesolutions.com' AND ca.slug = 'agency-2';

-- Verificación
SELECT 'Client accounts insertados/actualizados:' as status;
SELECT name, slug, plan_code, status FROM public.client_accounts ORDER BY plan_code, name;

SELECT 'Profiles actualizados con client_account_id:' as status;
SELECT email, role, client_account_id FROM public.profiles WHERE client_account_id IS NOT NULL ORDER BY email;
