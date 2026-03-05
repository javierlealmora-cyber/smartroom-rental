-- ============================================================================
-- SEED: Rooms (Habitaciones)
-- Ambiente: development
-- Descripción: Habitaciones de ejemplo para los alojamientos
-- ============================================================================

-- Insertar habitaciones de ejemplo
INSERT INTO public.rooms (
  id,
  accommodation_id,
  client_account_id,
  number,
  monthly_rent,
  square_meters,
  bathroom_type,
  kitchen_type,
  status,
  notes,
  created_at,
  updated_at
)
VALUES
  -- Piso Centro Madrid (4 habitaciones)
  (
    'r1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '101',
    450.00,
    12.5,
    'shared',
    'shared',
    'occupied',
    'Habitación exterior con balcón',
    now(),
    now()
  ),
  (
    'r1111111-1111-1111-1111-111111111112',
    'a1111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '102',
    420.00,
    11.0,
    'shared',
    'shared',
    'occupied',
    'Habitación interior tranquila',
    now(),
    now()
  ),
  (
    'r1111111-1111-1111-1111-111111111113',
    'a1111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '103',
    480.00,
    14.0,
    'private',
    'shared',
    'free',
    'Habitación grande con baño privado',
    now(),
    now()
  ),
  (
    'r1111111-1111-1111-1111-111111111114',
    'a1111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '104',
    400.00,
    10.0,
    'shared',
    'shared',
    'free',
    'Habitación acogedora',
    now(),
    now()
  ),
  
  -- Residencia Universitaria Barcelona (10 habitaciones - solo algunas de ejemplo)
  (
    'r2222222-2222-2222-2222-222222222221',
    'a2222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'A101',
    380.00,
    10.0,
    'private',
    'shared',
    'occupied',
    'Habitación individual con baño',
    now(),
    now()
  ),
  (
    'r2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'A102',
    380.00,
    10.0,
    'private',
    'shared',
    'occupied',
    'Habitación individual con baño',
    now(),
    now()
  ),
  (
    'r2222222-2222-2222-2222-222222222223',
    'a2222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'A103',
    380.00,
    10.0,
    'private',
    'shared',
    'free',
    'Habitación individual con baño',
    now(),
    now()
  ),
  (
    'r2222222-2222-2222-2222-222222222224',
    'a2222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'A104',
    380.00,
    10.0,
    'private',
    'shared',
    'free',
    'Habitación individual con baño',
    now(),
    now()
  ),
  (
    'r2222222-2222-2222-2222-222222222225',
    'a2222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'B201',
    420.00,
    12.0,
    'suite',
    'private',
    'reserved',
    'Suite con cocina y baño privado',
    now(),
    now()
  ),
  
  -- Apartamento Malasaña (2 habitaciones)
  (
    'r3333333-3333-3333-3333-333333333331',
    'a3333333-3333-3333-3333-333333333333',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '1',
    500.00,
    15.0,
    'shared',
    'shared',
    'occupied',
    'Habitación principal',
    now(),
    now()
  ),
  (
    'r3333333-3333-3333-3333-333333333332',
    'a3333333-3333-3333-3333-333333333333',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '2',
    450.00,
    12.0,
    'shared',
    'shared',
    'free',
    'Habitación secundaria',
    now(),
    now()
  ),
  
  -- Piso Estudiantes Valencia (3 habitaciones)
  (
    'r4444444-4444-4444-4444-444444444441',
    'a4444444-4444-4444-4444-444444444444',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'A',
    350.00,
    11.0,
    'shared',
    'shared',
    'occupied',
    'Habitación A - Exterior',
    now(),
    now()
  ),
  (
    'r4444444-4444-4444-4444-444444444442',
    'a4444444-4444-4444-4444-444444444444',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'B',
    350.00,
    11.0,
    'shared',
    'shared',
    'occupied',
    'Habitación B - Interior',
    now(),
    now()
  ),
  (
    'r4444444-4444-4444-4444-444444444443',
    'a4444444-4444-4444-4444-444444444444',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'C',
    380.00,
    13.0,
    'private',
    'shared',
    'free',
    'Habitación C - Grande con baño privado',
    now(),
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  accommodation_id = EXCLUDED.accommodation_id,
  client_account_id = EXCLUDED.client_account_id,
  number = EXCLUDED.number,
  monthly_rent = EXCLUDED.monthly_rent,
  square_meters = EXCLUDED.square_meters,
  bathroom_type = EXCLUDED.bathroom_type,
  kitchen_type = EXCLUDED.kitchen_type,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = now();

-- Verificación
SELECT 
  r.id,
  a.name as accommodation_name,
  r.number,
  r.monthly_rent,
  r.status,
  r.bathroom_type
FROM public.rooms r
JOIN public.accommodations a ON r.accommodation_id = a.id
ORDER BY a.name, r.number;
