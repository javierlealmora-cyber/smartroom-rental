-- ============================================================================
-- SEEDS: lodger_room_assignments
-- Ambiente: DEVELOPMENT
-- Fecha: 2026-03-15
-- Descripción: Asignar inquilinos a habitaciones ocupadas
-- ============================================================================

-- Asignar cada lodger a una habitación ocupada de su cuenta
WITH numbered_lodgers AS (
  SELECT 
    p.id as lodger_id,
    p.client_account_id,
    ROW_NUMBER() OVER (PARTITION BY p.client_account_id ORDER BY p.email) as rn
  FROM profiles p
  WHERE p.role = 'lodger' AND p.client_account_id IS NOT NULL
),
numbered_rooms AS (
  SELECT 
    r.id as room_id,
    r.client_account_id,
    r.accommodation_id,
    r.monthly_rent,
    ROW_NUMBER() OVER (PARTITION BY r.client_account_id ORDER BY r.id) as rn
  FROM rooms r
  WHERE r.status = 'occupied'
)
INSERT INTO public.lodger_room_assignments (
  client_account_id, lodger_id, room_id, accommodation_id,
  move_in_date, billing_start_date, monthly_rent, status
)
SELECT 
  l.client_account_id,
  l.lodger_id,
  r.room_id,
  r.accommodation_id,
  '2024-01-01'::date,
  '2024-01-01'::date,
  r.monthly_rent,
  'active'
FROM numbered_lodgers l
JOIN numbered_rooms r ON l.client_account_id = r.client_account_id AND l.rn = r.rn
ON CONFLICT DO NOTHING;

-- Verificación
SELECT 'Asignaciones de lodgers creadas:' as status;
SELECT COUNT(*) as total_assignments FROM public.lodger_room_assignments;
SELECT status, COUNT(*) as count FROM public.lodger_room_assignments GROUP BY status;
