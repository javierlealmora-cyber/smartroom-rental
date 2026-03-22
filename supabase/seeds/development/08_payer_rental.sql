-- ============================================================================
-- SEEDS: payer_rental
-- Ambiente: DEVELOPMENT
-- Fecha: 2026-03-22
-- Descripción: Pagadores de inquilinos con datos directos (idempotente)
-- ============================================================================

-- Limpiar datos existentes
DELETE FROM public.payer_rental;

-- Insertar pagadores de ejemplo
-- NOTA: Los lodger_id deben coincidir con profiles creados en 01_profiles.sql

-- Pagador 1: Padre de inquilino (Persona Física)
INSERT INTO public.payer_rental (
  client_account_id,
  lodger_id,
  payer_type,
  first_name,
  last_name1,
  last_name2,
  legal_name,
  notes,
  is_active
)
SELECT 
  ca.id as client_account_id,
  p.id as lodger_id,
  'individual' as payer_type,
  'Rafael' as first_name,
  'Martínez' as last_name1,
  'Sánchez' as last_name2,
  NULL as legal_name,
  'Padre del inquilino' as notes,
  true as is_active
FROM public.client_accounts ca
CROSS JOIN public.profiles p
WHERE ca.company_name = 'Basic Rentals 1'
  AND p.email = 'lodger1@basicrentals.com'
  AND p.role = 'lodger'
LIMIT 1;

-- Pagador 2: Empresa empleadora (Empresa)
INSERT INTO public.payer_rental (
  client_account_id,
  lodger_id,
  payer_type,
  first_name,
  last_name1,
  last_name2,
  legal_name,
  notes,
  is_active
)
SELECT 
  ca.id as client_account_id,
  p.id as lodger_id,
  'company' as payer_type,
  NULL as first_name,
  NULL as last_name1,
  NULL as last_name2,
  'Tech Solutions S.L.' as legal_name,
  'Empresa empleadora - Pago directo de nómina' as notes,
  true as is_active
FROM public.client_accounts ca
CROSS JOIN public.profiles p
WHERE ca.company_name = 'Basic Rentals 1'
  AND p.email = 'lodger2@basicrentals.com'
  AND p.role = 'lodger'
LIMIT 1;

-- Pagador 3: Madre de inquilino (Persona Física)
INSERT INTO public.payer_rental (
  client_account_id,
  lodger_id,
  payer_type,
  first_name,
  last_name1,
  last_name2,
  legal_name,
  notes,
  is_active
)
SELECT 
  ca.id as client_account_id,
  p.id as lodger_id,
  'individual' as payer_type,
  'Carmen' as first_name,
  'López' as last_name1,
  'García' as last_name2,
  NULL as legal_name,
  'Madre del inquilino - Avalista' as notes,
  true as is_active
FROM public.client_accounts ca
CROSS JOIN public.profiles p
WHERE ca.company_name = 'Basic Rentals 1'
  AND p.email = 'lodger3@basicrentals.com'
  AND p.role = 'lodger'
LIMIT 1;

-- Verificación
SELECT 'Pagadores insertados:' as status;
SELECT 
  pr.id,
  ca.company_name,
  p.email as lodger_email,
  pr.payer_type,
  CASE 
    WHEN pr.payer_type = 'individual' THEN pr.first_name || ' ' || pr.last_name1 || COALESCE(' ' || pr.last_name2, '')
    ELSE pr.legal_name
  END as payer_name,
  pr.notes,
  pr.is_active
FROM public.payer_rental pr
JOIN public.client_accounts ca ON pr.client_account_id = ca.id
JOIN public.profiles p ON pr.lodger_id = p.id
ORDER BY ca.company_name, p.email;
