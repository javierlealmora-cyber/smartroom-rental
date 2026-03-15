-- ============================================================================
-- SEEDS: rooms
-- Ambiente: DEVELOPMENT
-- Fecha: 2026-03-15
-- Descripción: Habitaciones (3 por alojamiento = ~42 total) - idempotente
-- ============================================================================

-- Crear 3 habitaciones por cada alojamiento
INSERT INTO public.rooms (
  accommodation_id, client_account_id, number,
  monthly_rent, square_meters, bathroom_type, kitchen_type, status
)
SELECT 
  a.id,
  a.client_account_id,
  'HAB-101',
  450.00,
  15.0,
  'private',
  'shared',
  'free'
FROM accommodations a
ON CONFLICT DO NOTHING;

INSERT INTO public.rooms (
  accommodation_id, client_account_id, number,
  monthly_rent, square_meters, bathroom_type, kitchen_type, status
)
SELECT 
  a.id,
  a.client_account_id,
  'HAB-102',
  350.00,
  12.0,
  'shared',
  'shared',
  'free'
FROM accommodations a
ON CONFLICT DO NOTHING;

INSERT INTO public.rooms (
  accommodation_id, client_account_id, number,
  monthly_rent, square_meters, bathroom_type, kitchen_type, status
)
SELECT 
  a.id,
  a.client_account_id,
  'HAB-103',
  400.00,
  14.0,
  'private',
  'shared',
  'occupied'
FROM accommodations a
ON CONFLICT DO NOTHING;

-- Verificación
SELECT 'Habitaciones creadas:' as status;
SELECT COUNT(*) as total_rooms FROM public.rooms;
SELECT status, COUNT(*) as count FROM public.rooms GROUP BY status;
