-- ============================================================================
-- SEEDS: rooms
-- Ambiente: STAGING
-- Fecha: 2026-03-08
-- Descripción: Habitaciones (195 total: 4+5+6 por alojamiento) - idempotente
-- Patrón: Aloj 1 = 4 hab, Aloj 2 = 5 hab, Aloj 3 = 6 hab
-- ============================================================================

-- Función helper para generar habitaciones de un alojamiento
CREATE OR REPLACE FUNCTION create_rooms_for_accommodation(
  p_accommodation_id uuid,
  p_client_account_id uuid,
  p_num_rooms int,
  p_base_rent numeric DEFAULT 350
) RETURNS void AS $$
DECLARE
  i int;
  room_number text;
  floor_num int;
  rent numeric;
BEGIN
  FOR i IN 1..p_num_rooms LOOP
    -- Número de habitación: 101, 102, 103, 201, 202, etc.
    floor_num := ((i - 1) / 3) + 1;
    room_number := (floor_num * 100 + ((i - 1) % 3) + 1)::text;
    
    -- Renta varía ligeramente
    rent := p_base_rent + (i * 10);
    
    INSERT INTO public.rooms (
      id, accommodation_id, client_account_id, number, monthly_rent,
      square_meters, bathroom_type, kitchen_type, status
    ) VALUES (
      gen_random_uuid(),
      p_accommodation_id,
      p_client_account_id,
      room_number,
      rent,
      15 + (i * 2), -- 17, 19, 21, 23, 25, 27 m²
      CASE WHEN i % 2 = 0 THEN 'private' ELSE 'shared' END,
      'shared',
      'free'
    )
    ON CONFLICT (accommodation_id, number) DO UPDATE SET
      monthly_rent = EXCLUDED.monthly_rent,
      square_meters = EXCLUDED.square_meters,
      bathroom_type = EXCLUDED.bathroom_type,
      kitchen_type = EXCLUDED.kitchen_type,
      status = EXCLUDED.status,
      updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Crear habitaciones para todos los alojamientos
-- Patrón: 4 habitaciones en primer aloj, 5 en segundo, 6 en tercero

-- BASIC USER 1
SELECT create_rooms_for_accommodation('acc-basic1-1'::uuid, 'ca-basic-user1-0001'::uuid, 4, 350);
SELECT create_rooms_for_accommodation('acc-basic1-2'::uuid, 'ca-basic-user1-0001'::uuid, 5, 380);
SELECT create_rooms_for_accommodation('acc-basic1-3'::uuid, 'ca-basic-user1-0001'::uuid, 6, 320);

-- BASIC USER 2
SELECT create_rooms_for_accommodation('acc-basic2-1'::uuid, 'ca-basic-user2-0002'::uuid, 4, 400);
SELECT create_rooms_for_accommodation('acc-basic2-2'::uuid, 'ca-basic-user2-0002'::uuid, 5, 420);
SELECT create_rooms_for_accommodation('acc-basic2-3'::uuid, 'ca-basic-user2-0002'::uuid, 6, 380);

-- INVESTOR ENTITY 1 - Premium Properties
SELECT create_rooms_for_accommodation('acc-inv1-1-1'::uuid, 'ca-investor-ent1-0003'::uuid, 4, 450);
SELECT create_rooms_for_accommodation('acc-inv1-1-2'::uuid, 'ca-investor-ent1-0003'::uuid, 5, 480);
SELECT create_rooms_for_accommodation('acc-inv1-1-3'::uuid, 'ca-investor-ent1-0003'::uuid, 6, 420);

-- INVESTOR ENTITY 1 - Elite Residences
SELECT create_rooms_for_accommodation('acc-inv1-2-1'::uuid, 'ca-investor-ent1-0003'::uuid, 4, 500);
SELECT create_rooms_for_accommodation('acc-inv1-2-2'::uuid, 'ca-investor-ent1-0003'::uuid, 5, 520);
SELECT create_rooms_for_accommodation('acc-inv1-2-3'::uuid, 'ca-investor-ent1-0003'::uuid, 6, 480);

-- INVESTOR ENTITY 4 - Smart Housing
SELECT create_rooms_for_accommodation('acc-inv4-1-1'::uuid, 'ca-investor-ent4-0004'::uuid, 4, 380);
SELECT create_rooms_for_accommodation('acc-inv4-1-2'::uuid, 'ca-investor-ent4-0004'::uuid, 5, 400);
SELECT create_rooms_for_accommodation('acc-inv4-1-3'::uuid, 'ca-investor-ent4-0004'::uuid, 6, 360);

-- INVESTOR ENTITY 4 - Modern Living
SELECT create_rooms_for_accommodation('acc-inv4-2-1'::uuid, 'ca-investor-ent4-0004'::uuid, 4, 420);
SELECT create_rooms_for_accommodation('acc-inv4-2-2'::uuid, 'ca-investor-ent4-0004'::uuid, 5, 440);
SELECT create_rooms_for_accommodation('acc-inv4-2-3'::uuid, 'ca-investor-ent4-0004'::uuid, 6, 400);

-- BUSINESS ENTITY 2 - Corporate Housing
SELECT create_rooms_for_accommodation('acc-bus2-1-1'::uuid, 'ca-business-ent2-0005'::uuid, 4, 360);
SELECT create_rooms_for_accommodation('acc-bus2-1-2'::uuid, 'ca-business-ent2-0005'::uuid, 5, 380);
SELECT create_rooms_for_accommodation('acc-bus2-1-3'::uuid, 'ca-business-ent2-0005'::uuid, 6, 340);

-- BUSINESS ENTITY 2 - Business Suites
SELECT create_rooms_for_accommodation('acc-bus2-2-1'::uuid, 'ca-business-ent2-0005'::uuid, 4, 390);
SELECT create_rooms_for_accommodation('acc-bus2-2-2'::uuid, 'ca-business-ent2-0005'::uuid, 5, 410);
SELECT create_rooms_for_accommodation('acc-bus2-2-3'::uuid, 'ca-business-ent2-0005'::uuid, 6, 370);

-- BUSINESS ENTITY 5 - Executive Rentals
SELECT create_rooms_for_accommodation('acc-bus5-1-1'::uuid, 'ca-business-ent5-0006'::uuid, 4, 410);
SELECT create_rooms_for_accommodation('acc-bus5-1-2'::uuid, 'ca-business-ent5-0006'::uuid, 5, 430);
SELECT create_rooms_for_accommodation('acc-bus5-1-3'::uuid, 'ca-business-ent5-0006'::uuid, 6, 390);

-- BUSINESS ENTITY 5 - Professional Housing
SELECT create_rooms_for_accommodation('acc-bus5-2-1'::uuid, 'ca-business-ent5-0006'::uuid, 4, 440);
SELECT create_rooms_for_accommodation('acc-bus5-2-2'::uuid, 'ca-business-ent5-0006'::uuid, 5, 460);
SELECT create_rooms_for_accommodation('acc-bus5-2-3'::uuid, 'ca-business-ent5-0006'::uuid, 6, 420);

-- AGENCY ENTITY 3 - Global Property
SELECT create_rooms_for_accommodation('acc-age3-1-1'::uuid, 'ca-agency-ent3-0007'::uuid, 4, 370);
SELECT create_rooms_for_accommodation('acc-age3-1-2'::uuid, 'ca-agency-ent3-0007'::uuid, 5, 390);
SELECT create_rooms_for_accommodation('acc-age3-1-3'::uuid, 'ca-agency-ent3-0007'::uuid, 6, 350);

-- AGENCY ENTITY 3 - International Housing
SELECT create_rooms_for_accommodation('acc-age3-2-1'::uuid, 'ca-agency-ent3-0007'::uuid, 4, 400);
SELECT create_rooms_for_accommodation('acc-age3-2-2'::uuid, 'ca-agency-ent3-0007'::uuid, 5, 420);
SELECT create_rooms_for_accommodation('acc-age3-2-3'::uuid, 'ca-agency-ent3-0007'::uuid, 6, 380);

-- AGENCY ENTITY 6 - Worldwide Rentals
SELECT create_rooms_for_accommodation('acc-age6-1-1'::uuid, 'ca-agency-ent6-0008'::uuid, 4, 340);
SELECT create_rooms_for_accommodation('acc-age6-1-2'::uuid, 'ca-agency-ent6-0008'::uuid, 5, 360);
SELECT create_rooms_for_accommodation('acc-age6-1-3'::uuid, 'ca-agency-ent6-0008'::uuid, 6, 320);

-- AGENCY ENTITY 6 - Universal Housing
SELECT create_rooms_for_accommodation('acc-age6-2-1'::uuid, 'ca-agency-ent6-0008'::uuid, 4, 370);
SELECT create_rooms_for_accommodation('acc-age6-2-2'::uuid, 'ca-agency-ent6-0008'::uuid, 5, 390);
SELECT create_rooms_for_accommodation('acc-age6-2-3'::uuid, 'ca-agency-ent6-0008'::uuid, 6, 350);

-- Limpiar función helper
DROP FUNCTION IF EXISTS create_rooms_for_accommodation(uuid, uuid, int, numeric);

-- Verificación
SELECT 'Habitaciones insertadas/actualizadas:' as status;
SELECT COUNT(*) as total_rooms FROM public.rooms;

SELECT 
  ca.plan_code,
  a.name as accommodation,
  COUNT(r.id) as num_rooms
FROM public.rooms r
JOIN public.accommodations a ON r.accommodation_id = a.id
JOIN public.client_accounts ca ON r.client_account_id = ca.id
GROUP BY ca.plan_code, a.name
ORDER BY ca.plan_code, a.name;

-- Resumen por client account
SELECT 
  ca.name as client_account,
  ca.plan_code,
  COUNT(DISTINCT a.id) as num_accommodations,
  COUNT(r.id) as num_rooms
FROM public.client_accounts ca
LEFT JOIN public.accommodations a ON ca.id = a.client_account_id
LEFT JOIN public.rooms r ON a.id = r.accommodation_id
GROUP BY ca.id, ca.name, ca.plan_code
ORDER BY ca.plan_code, ca.name;
