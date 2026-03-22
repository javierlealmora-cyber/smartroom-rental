-- ============================================================================
-- SEEDS: payer_rental
-- Ambiente: DEVELOPMENT
-- Fecha: 2026-03-22
-- Descripción: Relaciones entre inquilinos y pagadores (idempotente)
-- ============================================================================

-- Limpiar datos existentes
DELETE FROM public.payer_rental;

-- Insertar relaciones de ejemplo
-- NOTA: Estos UUIDs deben coincidir con los creados en otros seeds
-- Ajustar según los datos reales de tu entorno de desarrollo

-- Ejemplo: Inquilino Francisco Morillo tiene como pagador a la entidad Basic Rentals 1
INSERT INTO public.payer_rental (
  client_account_id,
  lodger_id,
  entity_id,
  is_active
)
SELECT 
  ca.id as client_account_id,
  p.id as lodger_id,
  e.id as entity_id,
  true as is_active
FROM public.client_accounts ca
CROSS JOIN public.profiles p
CROSS JOIN public.entities e
WHERE ca.company_name = 'Basic Rentals 1'
  AND p.email LIKE '%lodger%' 
  AND p.role = 'lodger'
  AND e.type = 'payer'
  AND e.client_account_id = ca.id
LIMIT 3
ON CONFLICT (lodger_id, entity_id) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Verificación
SELECT 'Relaciones payer_rental insertadas:' as status;
SELECT 
  pr.id,
  ca.company_name,
  p.email as lodger_email,
  e.legal_name as payer_name,
  pr.is_active
FROM public.payer_rental pr
JOIN public.client_accounts ca ON pr.client_account_id = ca.id
JOIN public.profiles p ON pr.lodger_id = p.id
LEFT JOIN public.entities e ON pr.entity_id = e.id
ORDER BY ca.company_name, p.email;
