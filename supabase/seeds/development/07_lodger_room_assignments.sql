-- ============================================================================
-- SEEDS: lodger_room_assignments
-- Ambiente: DEVELOPMENT
-- Fecha: 2026-03-25
-- Descripción: Asignar inquilinos a habitaciones con diferentes estados para pruebas
-- ============================================================================

-- Limpiar asignaciones existentes
DELETE FROM public.lodger_room_assignments;

-- Asignar inquilinos a habitaciones con diferentes estados
WITH numbered_lodgers AS (
  SELECT 
    p.id as lodger_id,
    p.client_account_id,
    p.email,
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
  WHERE r.is_maintenance = false
)
INSERT INTO public.lodger_room_assignments (
  client_account_id, lodger_id, room_id, accommodation_id,
  move_in_date, move_out_date, billing_start_date, monthly_rent,
  deposit_amount, commission_amount, first_month_amount, checkout_notes
)
SELECT 
  l.client_account_id,
  l.lodger_id,
  r.room_id,
  r.accommodation_id,
  -- Diferentes fechas según el número de inquilino para crear diferentes estados
  CASE 
    WHEN l.rn = 1 THEN '2025-01-15'::date  -- Activo (sin move_out_date)
    WHEN l.rn = 2 THEN '2025-03-20'::date  -- Activo (sin move_out_date)
    WHEN l.rn = 3 THEN '2024-06-01'::date  -- Pendiente de baja (move_out_date futuro)
    WHEN l.rn = 4 THEN '2024-01-01'::date  -- Inactivo (move_out_date pasado)
    ELSE '2025-02-01'::date
  END as move_in_date,
  -- move_out_date: NULL para activos, futuro para pendiente baja, pasado para inactivos
  CASE 
    WHEN l.rn = 1 THEN NULL                -- Activo
    WHEN l.rn = 2 THEN NULL                -- Activo
    WHEN l.rn = 3 THEN '2026-06-30'::date  -- Pendiente de baja (futuro)
    WHEN l.rn = 4 THEN '2025-12-31'::date  -- Inactivo (pasado)
    ELSE NULL
  END as move_out_date,
  CASE 
    WHEN l.rn = 1 THEN '2025-01-15'::date
    WHEN l.rn = 2 THEN '2025-03-20'::date
    WHEN l.rn = 3 THEN '2024-06-01'::date
    WHEN l.rn = 4 THEN '2024-01-01'::date
    ELSE '2025-02-01'::date
  END as billing_start_date,
  r.monthly_rent,
  -- Fianza: 2 meses de renta
  r.monthly_rent * 2 as deposit_amount,
  -- Comisión: 10% del primer mes (solo algunos)
  CASE WHEN l.rn <= 2 THEN r.monthly_rent * 0.10 ELSE NULL END as commission_amount,
  -- Importe primer mes (algunos con descuento)
  CASE WHEN l.rn = 1 THEN r.monthly_rent * 0.5 ELSE r.monthly_rent END as first_month_amount,
  -- Notas de checkout solo para los que tienen move_out_date
  CASE 
    WHEN l.rn = 3 THEN 'Check-out programado. Habitación en buen estado.'
    WHEN l.rn = 4 THEN 'Check-out completado. Se devolvió fianza completa menos consumos.'
    ELSE NULL
  END as checkout_notes
FROM numbered_lodgers l
JOIN numbered_rooms r ON l.client_account_id = r.client_account_id AND l.rn = r.rn
ON CONFLICT DO NOTHING;

-- Añadir asignaciones históricas para algunos inquilinos (para probar múltiples asignaciones)
INSERT INTO public.lodger_room_assignments (
  client_account_id, lodger_id, room_id, accommodation_id,
  move_in_date, move_out_date, billing_start_date, monthly_rent,
  deposit_amount, checkout_notes
)
SELECT 
  l.client_account_id,
  l.lodger_id,
  r.room_id,
  r.accommodation_id,
  '2023-01-01'::date as move_in_date,
  '2024-12-31'::date as move_out_date,
  '2023-01-01'::date as billing_start_date,
  r.monthly_rent,
  r.monthly_rent * 2 as deposit_amount,
  'Asignación histórica. Cambio de habitación.' as checkout_notes
FROM numbered_lodgers l
JOIN numbered_rooms r ON l.client_account_id = r.client_account_id AND l.rn = r.rn
WHERE l.rn = 2  -- Solo para el segundo inquilino
ON CONFLICT DO NOTHING;

-- Verificación
SELECT 'Asignaciones de lodgers creadas:' as status;
SELECT COUNT(*) as total_assignments FROM public.lodger_room_assignments;
SELECT
  CASE
    WHEN move_out_date IS NULL THEN 'Activo (sin checkout)'
    WHEN move_out_date > CURRENT_DATE THEN 'Pendiente de baja (checkout futuro)'
    ELSE 'Inactivo (checkout pasado)'
  END as estado_dinamico,
  COUNT(*) as count
FROM public.lodger_room_assignments
GROUP BY estado_dinamico;
