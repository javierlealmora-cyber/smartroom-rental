-- ============================================================================
-- SEEDS: entities
-- Ambiente: DEVELOPMENT
-- Fecha: 2026-03-15
-- Descripción: Entidades fiscales (payer/owner) - idempotente
-- ============================================================================

-- Crear entidades PAYER para todas las cuentas (1 por cuenta = 8 entidades)
INSERT INTO public.entities (client_account_id, type, status, legal_type, legal_name, tax_id, billing_email, phone, country, province, city, zip, street, street_number)
SELECT 
  ca.id,
  'payer',
  'active',
  CASE 
    WHEN ca.plan_code = 'basic' THEN 'persona_fisica'
    ELSE 'persona_juridica'
  END,
  ca.name || ' - Payer Entity',
  'TAX-' || SUBSTRING(ca.id::text, 1, 8),
  'billing@' || ca.slug || '.com',
  '+34600000000',
  'España',
  'Madrid',
  'Madrid',
  '28001',
  'Calle Principal',
  '1'
FROM client_accounts ca
ON CONFLICT DO NOTHING;

-- Crear entidades OWNER adicionales para planes no-basic (6 entidades)
INSERT INTO public.entities (client_account_id, type, status, legal_type, legal_name, tax_id, billing_email, phone, country, province, city, zip, street, street_number)
SELECT 
  ca.id,
  'owner',
  'active',
  'persona_juridica',
  ca.name || ' - Owner Entity',
  'OWN-' || SUBSTRING(ca.id::text, 1, 8),
  'owner@' || ca.slug || '.com',
  '+34601000000',
  'España',
  'Barcelona',
  'Barcelona',
  '08001',
  'Calle Secundaria',
  '10'
FROM client_accounts ca
WHERE ca.plan_code IN ('investor', 'business', 'agency')
ON CONFLICT DO NOTHING
;

-- Verificación
SELECT 'Entidades creadas:' as status;
SELECT 
  e.legal_name,
  e.type,
  ca.name as client_account,
  ca.plan_code
FROM public.entities e
JOIN public.client_accounts ca ON e.client_account_id = ca.id
ORDER BY ca.plan_code, e.type, e.legal_name;

-- Resumen por tipo
SELECT 
  ca.plan_code,
  e.type,
  COUNT(*) as count
FROM public.entities e
JOIN public.client_accounts ca ON e.client_account_id = ca.id
GROUP BY ca.plan_code, e.type
ORDER BY ca.plan_code, e.type;
