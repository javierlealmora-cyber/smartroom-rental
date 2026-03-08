-- ============================================================================
-- SEEDS: client_accounts
-- Ambiente: STAGING
-- Fecha: 2026-03-08
-- Descripción: Cuentas de cliente (idempotente)
-- ============================================================================

-- Insertar o actualizar client accounts
INSERT INTO public.client_accounts (id, name, slug, plan_code, billing_cycle, status, start_date)
VALUES
  -- Basic accounts
  ('ca-basic-user1-0001'::uuid, 'Basic User 1 Account', 'basic-user-1', 'basic', 'monthly', 'active', '2024-01-01'),
  ('ca-basic-user2-0002'::uuid, 'Basic User 2 Account', 'basic-user-2', 'basic', 'monthly', 'active', '2024-01-01'),
  
  -- Investor accounts
  ('ca-investor-ent1-0003'::uuid, 'Investor Entity 1 Account', 'investor-entity-1', 'investor', 'annual', 'active', '2024-01-01'),
  ('ca-investor-ent4-0004'::uuid, 'Investor Entity 4 Account', 'investor-entity-4', 'investor', 'annual', 'active', '2024-01-01'),
  
  -- Business accounts
  ('ca-business-ent2-0005'::uuid, 'Business Entity 2 Account', 'business-entity-2', 'business', 'annual', 'active', '2024-01-01'),
  ('ca-business-ent5-0006'::uuid, 'Business Entity 5 Account', 'business-entity-5', 'business', 'annual', 'active', '2024-01-01'),
  
  -- Agency accounts
  ('ca-agency-ent3-0007'::uuid, 'Agency Entity 3 Account', 'agency-entity-3', 'agency', 'annual', 'active', '2024-01-01'),
  ('ca-agency-ent6-0008'::uuid, 'Agency Entity 6 Account', 'agency-entity-6', 'agency', 'annual', 'active', '2024-01-01')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  plan_code = EXCLUDED.plan_code,
  billing_cycle = EXCLUDED.billing_cycle,
  status = EXCLUDED.status,
  start_date = EXCLUDED.start_date,
  updated_at = now();

-- Actualizar profiles con client_account_id
UPDATE public.profiles SET client_account_id = 'ca-basic-user1-0001'::uuid WHERE id = '00000000-0000-0000-0000-000000000002'::uuid;
UPDATE public.profiles SET client_account_id = 'ca-basic-user2-0002'::uuid WHERE id = '00000000-0000-0000-0000-000000000003'::uuid;
UPDATE public.profiles SET client_account_id = 'ca-investor-ent1-0003'::uuid WHERE id = '00000000-0000-0000-0000-000000000004'::uuid;
UPDATE public.profiles SET client_account_id = 'ca-investor-ent4-0004'::uuid WHERE id = '00000000-0000-0000-0000-000000000005'::uuid;
UPDATE public.profiles SET client_account_id = 'ca-business-ent2-0005'::uuid WHERE id = '00000000-0000-0000-0000-000000000006'::uuid;
UPDATE public.profiles SET client_account_id = 'ca-business-ent5-0006'::uuid WHERE id = '00000000-0000-0000-0000-000000000007'::uuid;
UPDATE public.profiles SET client_account_id = 'ca-agency-ent3-0007'::uuid WHERE id = '00000000-0000-0000-0000-000000000008'::uuid;
UPDATE public.profiles SET client_account_id = 'ca-agency-ent6-0008'::uuid WHERE id = '00000000-0000-0000-0000-000000000009'::uuid;

-- Verificación
SELECT 'Client accounts insertados/actualizados:' as status;
SELECT name, slug, plan_code, status FROM public.client_accounts ORDER BY plan_code, name;

SELECT 'Profiles actualizados con client_account_id:' as status;
SELECT email, role, client_account_id FROM public.profiles WHERE client_account_id IS NOT NULL ORDER BY email;
