-- ============================================================================
-- SEEDS: accommodations
-- Ambiente: DEVELOPMENT
-- Fecha: 2026-03-15
-- Descripción: Alojamientos (1 por entidad owner = 14 total) - idempotente
-- ============================================================================

-- Crear alojamientos para cada entidad owner
INSERT INTO public.accommodations (
  client_account_id, owner_entity_id, name, 
  address_line1, city, province, postal_code, country, status,
  utilities_included
)
SELECT 
  e.client_account_id,
  e.id,
  e.legal_name || ' - Apartamento Principal',
  'Calle Principal 123',
  'Madrid',
  'Madrid',
  '28001',
  'España',
  'active',
  true
FROM entities e
WHERE e.type = 'owner'
ON CONFLICT DO NOTHING;

-- Crear alojamientos para cuentas basic (usan entidad payer)
INSERT INTO public.accommodations (
  client_account_id, owner_entity_id, name, 
  address_line1, city, province, postal_code, country, status,
  utilities_included
)
SELECT 
  e.client_account_id,
  e.id,
  e.legal_name || ' - Apartamento Principal',
  'Calle Principal 123',
  'Madrid',
  'Madrid',
  '28001',
  'España',
  'active',
  true
FROM entities e
JOIN client_accounts ca ON e.client_account_id = ca.id
WHERE e.type = 'payer' AND ca.plan_code = 'basic'
ON CONFLICT DO NOTHING
;

-- Verificación
SELECT 'Alojamientos insertados/actualizados:' as status;
SELECT COUNT(*) as total_accommodations FROM public.accommodations;

SELECT 
  ca.plan_code,
  e.legal_name as entity,
  COUNT(a.id) as num_accommodations
FROM public.accommodations a
JOIN public.entities e ON a.owner_entity_id = e.id
JOIN public.client_accounts ca ON a.client_account_id = ca.id
GROUP BY ca.plan_code, e.legal_name
ORDER BY ca.plan_code, e.legal_name;
