-- ============================================================================
-- SEEDS: Asignar lodgers a cuentas cliente
-- Ambiente: DEVELOPMENT
-- Fecha: 2026-03-22
-- Descripción: Vincula los perfiles de inquilinos (role='lodger') con sus
--              cuentas cliente. Sin este paso, 07_lodger_room_assignments.sql
--              inserta 0 filas porque filtra por client_account_id IS NOT NULL.
-- Distribución: 12 lodgers en 8 cuentas (1-2 por cuenta)
-- ============================================================================

-- Basic Rentals 1 → lodger1, lodger2
UPDATE public.profiles p
SET client_account_id = ca.id
FROM public.client_accounts ca
WHERE ca.slug = 'basic-rentals-1'
  AND p.email IN ('lodger1@example.com', 'lodger2@example.com');

-- Basic Rentals 2 → lodger3, lodger4
UPDATE public.profiles p
SET client_account_id = ca.id
FROM public.client_accounts ca
WHERE ca.slug = 'basic-rentals-2'
  AND p.email IN ('lodger3@example.com', 'lodger4@example.com');

-- Investor Properties 1 → lodger5, lodger6
UPDATE public.profiles p
SET client_account_id = ca.id
FROM public.client_accounts ca
WHERE ca.slug = 'investor-properties-1'
  AND p.email IN ('lodger5@example.com', 'lodger6@example.com');

-- Investor Properties 2 → lodger7
UPDATE public.profiles p
SET client_account_id = ca.id
FROM public.client_accounts ca
WHERE ca.slug = 'investor-properties-2'
  AND p.email = 'lodger7@example.com';

-- Business Housing 1 → lodger8, lodger9
UPDATE public.profiles p
SET client_account_id = ca.id
FROM public.client_accounts ca
WHERE ca.slug = 'business-housing-1'
  AND p.email IN ('lodger8@example.com', 'lodger9@example.com');

-- Business Housing 2 → lodger10
UPDATE public.profiles p
SET client_account_id = ca.id
FROM public.client_accounts ca
WHERE ca.slug = 'business-housing-2'
  AND p.email = 'lodger10@example.com';

-- Agency Rentals 1 → lodger11
UPDATE public.profiles p
SET client_account_id = ca.id
FROM public.client_accounts ca
WHERE ca.slug = 'agency-rentals-1'
  AND p.email = 'lodger11@example.com';

-- Agency Rentals 2 → lodger12
UPDATE public.profiles p
SET client_account_id = ca.id
FROM public.client_accounts ca
WHERE ca.slug = 'agency-rentals-2'
  AND p.email = 'lodger12@example.com';

-- Verificación
SELECT 'Lodgers vinculados a cuentas cliente:' as status;
SELECT
  p.email,
  p.role,
  ca.name as client_account,
  ca.plan_code
FROM public.profiles p
JOIN public.client_accounts ca ON p.client_account_id = ca.id
WHERE p.role = 'lodger'
ORDER BY ca.slug, p.email;

SELECT
  ca.name as client_account,
  ca.plan_code,
  COUNT(p.id) as num_lodgers
FROM public.client_accounts ca
LEFT JOIN public.profiles p ON p.client_account_id = ca.id AND p.role = 'lodger'
GROUP BY ca.id, ca.name, ca.plan_code
ORDER BY ca.plan_code, ca.name;
