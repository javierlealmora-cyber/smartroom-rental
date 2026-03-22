-- ============================================================================
-- SEEDS: lodger_room_assignments
-- Ambiente: STAGING
-- Fecha: 2026-03-08
-- Descripción: Asignaciones de inquilinos a habitaciones con historial
-- Patrón: ~60% habitaciones ocupadas, algunas con historial de cambios
-- ============================================================================

-- Función para asignar inquilinos a habitaciones de un alojamiento
CREATE OR REPLACE FUNCTION assign_lodgers_to_accommodation(
  p_accommodation_id uuid,
  p_client_account_id uuid,
  p_occupancy_percent int
) RETURNS void AS $$
DECLARE
  v_room record;
  v_lodger_id uuid;
  v_rooms_to_fill int;
  v_total_rooms int;
  v_filled int := 0;
  v_move_in_date date;
BEGIN
  -- Contar habitaciones del alojamiento
  SELECT COUNT(*) INTO v_total_rooms
  FROM public.rooms
  WHERE accommodation_id = p_accommodation_id;
  
  -- Calcular cuántas habitaciones llenar
  v_rooms_to_fill := CEIL(v_total_rooms * p_occupancy_percent / 100.0);
  
  -- Asignar inquilinos a habitaciones
  FOR v_room IN 
    SELECT id FROM public.rooms 
    WHERE accommodation_id = p_accommodation_id 
    ORDER BY number 
    LIMIT v_rooms_to_fill
  LOOP
    -- Obtener un inquilino aleatorio del mismo client_account que esté disponible
    SELECT p.id INTO v_lodger_id
    FROM public.profiles p
    WHERE p.client_account_id = p_client_account_id
      AND p.role = 'lodger'
      AND p.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM public.lodger_room_assignments lra
        WHERE lra.lodger_id = p.id AND lra.status = 'active'
      )
    ORDER BY random()
    LIMIT 1;
    
    -- Si encontramos un inquilino disponible
    IF v_lodger_id IS NOT NULL THEN
      -- Fecha de entrada aleatoria en los últimos 12 meses
      v_move_in_date := current_date - (random() * 365)::int;
      
      -- Crear asignación activa
      INSERT INTO public.lodger_room_assignments (
        id, client_account_id, lodger_id, room_id, accommodation_id,
        move_in_date, move_out_date, billing_start_date, monthly_rent, status
      ) VALUES (
        gen_random_uuid(),
        p_client_account_id,
        v_lodger_id,
        v_room.id,
        p_accommodation_id,
        v_move_in_date,
        NULL, -- Asignación activa
        v_move_in_date,
        (SELECT monthly_rent FROM public.rooms WHERE id = v_room.id),
        'active'
      )
      ON CONFLICT DO NOTHING;
      
      -- Actualizar estado de habitación a ocupada
      UPDATE public.rooms SET status = 'occupied' WHERE id = v_room.id;
      
      -- 20% de probabilidad de crear historial (asignación anterior finalizada)
      IF random() < 0.2 THEN
        INSERT INTO public.lodger_room_assignments (
          id, client_account_id, lodger_id, room_id, accommodation_id,
          move_in_date, move_out_date, billing_start_date, monthly_rent, status
        ) VALUES (
          gen_random_uuid(),
          p_client_account_id,
          v_lodger_id,
          v_room.id,
          p_accommodation_id,
          v_move_in_date - (random() * 365 + 30)::int, -- Entrada anterior
          v_move_in_date - 1, -- Salida 1 día antes de la entrada actual
          v_move_in_date - (random() * 365 + 30)::int,
          (SELECT monthly_rent FROM public.rooms WHERE id = v_room.id) - 20,
          'ended'
        )
        ON CONFLICT DO NOTHING;
      END IF;
      
      v_filled := v_filled + 1;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Asignar inquilinos a todos los alojamientos
-- Patrón: 50-70% de ocupación variada

-- BASIC USER 1
SELECT assign_lodgers_to_accommodation('acc-basic1-1'::uuid, 'ca-basic-user1-0001'::uuid, 50);
SELECT assign_lodgers_to_accommodation('acc-basic1-2'::uuid, 'ca-basic-user1-0001'::uuid, 80);
SELECT assign_lodgers_to_accommodation('acc-basic1-3'::uuid, 'ca-basic-user1-0001'::uuid, 67);

-- BASIC USER 2
SELECT assign_lodgers_to_accommodation('acc-basic2-1'::uuid, 'ca-basic-user2-0002'::uuid, 50);
SELECT assign_lodgers_to_accommodation('acc-basic2-2'::uuid, 'ca-basic-user2-0002'::uuid, 60);
SELECT assign_lodgers_to_accommodation('acc-basic2-3'::uuid, 'ca-basic-user2-0002'::uuid, 83);

-- INVESTOR ENTITY 1 - Premium Properties
SELECT assign_lodgers_to_accommodation('acc-inv1-1-1'::uuid, 'ca-investor-ent1-0003'::uuid, 75);
SELECT assign_lodgers_to_accommodation('acc-inv1-1-2'::uuid, 'ca-investor-ent1-0003'::uuid, 60);
SELECT assign_lodgers_to_accommodation('acc-inv1-1-3'::uuid, 'ca-investor-ent1-0003'::uuid, 67);

-- INVESTOR ENTITY 1 - Elite Residences
SELECT assign_lodgers_to_accommodation('acc-inv1-2-1'::uuid, 'ca-investor-ent1-0003'::uuid, 50);
SELECT assign_lodgers_to_accommodation('acc-inv1-2-2'::uuid, 'ca-investor-ent1-0003'::uuid, 80);
SELECT assign_lodgers_to_accommodation('acc-inv1-2-3'::uuid, 'ca-investor-ent1-0003'::uuid, 50);

-- INVESTOR ENTITY 4 - Smart Housing
SELECT assign_lodgers_to_accommodation('acc-inv4-1-1'::uuid, 'ca-investor-ent4-0004'::uuid, 75);
SELECT assign_lodgers_to_accommodation('acc-inv4-1-2'::uuid, 'ca-investor-ent4-0004'::uuid, 60);
SELECT assign_lodgers_to_accommodation('acc-inv4-1-3'::uuid, 'ca-investor-ent4-0004'::uuid, 67);

-- INVESTOR ENTITY 4 - Modern Living
SELECT assign_lodgers_to_accommodation('acc-inv4-2-1'::uuid, 'ca-investor-ent4-0004'::uuid, 50);
SELECT assign_lodgers_to_accommodation('acc-inv4-2-2'::uuid, 'ca-investor-ent4-0004'::uuid, 80);
SELECT assign_lodgers_to_accommodation('acc-inv4-2-3'::uuid, 'ca-investor-ent4-0004'::uuid, 67);

-- BUSINESS ENTITY 2 - Corporate Housing
SELECT assign_lodgers_to_accommodation('acc-bus2-1-1'::uuid, 'ca-business-ent2-0005'::uuid, 75);
SELECT assign_lodgers_to_accommodation('acc-bus2-1-2'::uuid, 'ca-business-ent2-0005'::uuid, 60);
SELECT assign_lodgers_to_accommodation('acc-bus2-1-3'::uuid, 'ca-business-ent2-0005'::uuid, 50);

-- BUSINESS ENTITY 2 - Business Suites
SELECT assign_lodgers_to_accommodation('acc-bus2-2-1'::uuid, 'ca-business-ent2-0005'::uuid, 50);
SELECT assign_lodgers_to_accommodation('acc-bus2-2-2'::uuid, 'ca-business-ent2-0005'::uuid, 80);
SELECT assign_lodgers_to_accommodation('acc-bus2-2-3'::uuid, 'ca-business-ent2-0005'::uuid, 67);

-- BUSINESS ENTITY 5 - Executive Rentals
SELECT assign_lodgers_to_accommodation('acc-bus5-1-1'::uuid, 'ca-business-ent5-0006'::uuid, 75);
SELECT assign_lodgers_to_accommodation('acc-bus5-1-2'::uuid, 'ca-business-ent5-0006'::uuid, 60);
SELECT assign_lodgers_to_accommodation('acc-bus5-1-3'::uuid, 'ca-business-ent5-0006'::uuid, 67);

-- BUSINESS ENTITY 5 - Professional Housing
SELECT assign_lodgers_to_accommodation('acc-bus5-2-1'::uuid, 'ca-business-ent5-0006'::uuid, 50);
SELECT assign_lodgers_to_accommodation('acc-bus5-2-2'::uuid, 'ca-business-ent5-0006'::uuid, 80);
SELECT assign_lodgers_to_accommodation('acc-bus5-2-3'::uuid, 'ca-business-ent5-0006'::uuid, 50);

-- AGENCY ENTITY 3 - Global Property
SELECT assign_lodgers_to_accommodation('acc-age3-1-1'::uuid, 'ca-agency-ent3-0007'::uuid, 75);
SELECT assign_lodgers_to_accommodation('acc-age3-1-2'::uuid, 'ca-agency-ent3-0007'::uuid, 60);
SELECT assign_lodgers_to_accommodation('acc-age3-1-3'::uuid, 'ca-agency-ent3-0007'::uuid, 67);

-- AGENCY ENTITY 3 - International Housing
SELECT assign_lodgers_to_accommodation('acc-age3-2-1'::uuid, 'ca-agency-ent3-0007'::uuid, 50);
SELECT assign_lodgers_to_accommodation('acc-age3-2-2'::uuid, 'ca-agency-ent3-0007'::uuid, 80);
SELECT assign_lodgers_to_accommodation('acc-age3-2-3'::uuid, 'ca-agency-ent3-0007'::uuid, 67);

-- AGENCY ENTITY 6 - Worldwide Rentals
SELECT assign_lodgers_to_accommodation('acc-age6-1-1'::uuid, 'ca-agency-ent6-0008'::uuid, 75);
SELECT assign_lodgers_to_accommodation('acc-age6-1-2'::uuid, 'ca-agency-ent6-0008'::uuid, 60);
SELECT assign_lodgers_to_accommodation('acc-age6-1-3'::uuid, 'ca-agency-ent6-0008'::uuid, 50);

-- AGENCY ENTITY 6 - Universal Housing
SELECT assign_lodgers_to_accommodation('acc-age6-2-1'::uuid, 'ca-agency-ent6-0008'::uuid, 50);
SELECT assign_lodgers_to_accommodation('acc-age6-2-2'::uuid, 'ca-agency-ent6-0008'::uuid, 80);
SELECT assign_lodgers_to_accommodation('acc-age6-2-3'::uuid, 'ca-agency-ent6-0008'::uuid, 67);

-- Limpiar función helper
DROP FUNCTION IF EXISTS assign_lodgers_to_accommodation(uuid, uuid, int);

-- Verificación
SELECT 'Asignaciones creadas:' as status;
SELECT COUNT(*) as total_assignments FROM public.lodger_room_assignments;
SELECT COUNT(*) as active_assignments FROM public.lodger_room_assignments WHERE status = 'active';
SELECT COUNT(*) as ended_assignments FROM public.lodger_room_assignments WHERE status = 'ended';

-- Resumen por alojamiento
SELECT 
  a.name as accommodation,
  COUNT(DISTINCT lra.id) FILTER (WHERE lra.status = 'active') as active_lodgers,
  COUNT(DISTINCT r.id) as total_rooms,
  ROUND(COUNT(DISTINCT lra.id) FILTER (WHERE lra.status = 'active')::numeric / NULLIF(COUNT(DISTINCT r.id), 0) * 100, 0) as occupancy_percent
FROM public.accommodations a
LEFT JOIN public.rooms r ON a.id = r.accommodation_id
LEFT JOIN public.lodger_room_assignments lra ON r.id = lra.room_id AND lra.status = 'active'
GROUP BY a.id, a.name
ORDER BY a.name;

-- Inquilinos con historial de asignaciones
SELECT 
  p.full_name,
  p.email,
  COUNT(lra.id) as total_assignments,
  COUNT(lra.id) FILTER (WHERE lra.status = 'active') as active_assignments,
  COUNT(lra.id) FILTER (WHERE lra.status = 'ended') as ended_assignments
FROM public.profiles p
LEFT JOIN public.lodger_room_assignments lra ON p.id = lra.lodger_id
WHERE p.role = 'lodger' 
  AND p.email LIKE '%@housingspacesolutions.com'
GROUP BY p.id, p.full_name, p.email
HAVING COUNT(lra.id) > 0
ORDER BY total_assignments DESC, p.email
LIMIT 10;
