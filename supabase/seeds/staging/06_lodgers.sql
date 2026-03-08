-- ============================================================================
-- SEEDS: lodgers
-- Ambiente: STAGING
-- Fecha: 2026-03-08
-- Descripción: Inquilinos asignados y sin asignar - idempotente
-- Patrón ocupación: Aloj 1 = 50%, Aloj 2 = 100%, Aloj 3 = 5 inquilinos fijos
-- Fechas de check-in aleatorias en el último año
-- ============================================================================

-- Función helper para fecha aleatoria en último año
CREATE OR REPLACE FUNCTION random_date_last_year()
RETURNS date AS $$
BEGIN
  RETURN current_date - (random() * 365)::int;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Nombres españoles para inquilinos
CREATE TEMP TABLE nombres_temp (nombre text, apellido1 text, apellido2 text, genero text);
INSERT INTO nombres_temp VALUES
  ('Juan', 'García', 'López', 'male'),
  ('María', 'Martínez', 'González', 'female'),
  ('Pedro', 'Rodríguez', 'Fernández', 'male'),
  ('Ana', 'Sánchez', 'Pérez', 'female'),
  ('Carlos', 'López', 'Martín', 'male'),
  ('Laura', 'González', 'Jiménez', 'female'),
  ('David', 'Fernández', 'Ruiz', 'male'),
  ('Elena', 'Díaz', 'Hernández', 'female'),
  ('Miguel', 'Pérez', 'Moreno', 'male'),
  ('Sara', 'Ruiz', 'Muñoz', 'female'),
  ('Javier', 'Moreno', 'Álvarez', 'male'),
  ('Carmen', 'Muñoz', 'Romero', 'female'),
  ('Antonio', 'Álvarez', 'Alonso', 'male'),
  ('Isabel', 'Romero', 'Gutiérrez', 'female'),
  ('Francisco', 'Alonso', 'Navarro', 'male'),
  ('Patricia', 'Gutiérrez', 'Torres', 'female'),
  ('José', 'Navarro', 'Domínguez', 'male'),
  ('Lucía', 'Torres', 'Vázquez', 'female'),
  ('Manuel', 'Domínguez', 'Ramos', 'male'),
  ('Marta', 'Vázquez', 'Gil', 'female');

-- Función para crear inquilinos en habitaciones de un alojamiento
CREATE OR REPLACE FUNCTION create_lodgers_for_accommodation(
  p_accommodation_id uuid,
  p_client_account_id uuid,
  p_occupancy_percent int, -- 50, 100, o -1 para 5 fijos
  p_counter int -- contador para nombres únicos
) RETURNS int AS $$
DECLARE
  v_room record;
  v_nombre record;
  v_rooms_to_fill int;
  v_total_rooms int;
  v_filled int := 0;
  v_counter int := p_counter;
BEGIN
  -- Contar habitaciones del alojamiento
  SELECT COUNT(*) INTO v_total_rooms
  FROM public.rooms
  WHERE accommodation_id = p_accommodation_id;
  
  -- Calcular cuántas habitaciones llenar
  IF p_occupancy_percent = -1 THEN
    v_rooms_to_fill := 5; -- 5 inquilinos fijos
  ELSE
    v_rooms_to_fill := CEIL(v_total_rooms * p_occupancy_percent / 100.0);
  END IF;
  
  -- Asignar inquilinos a habitaciones
  FOR v_room IN 
    SELECT id FROM public.rooms 
    WHERE accommodation_id = p_accommodation_id 
    ORDER BY number 
    LIMIT v_rooms_to_fill
  LOOP
    -- Obtener nombre aleatorio
    SELECT * INTO v_nombre FROM nombres_temp ORDER BY random() LIMIT 1;
    
    -- Insertar inquilino
    INSERT INTO public.lodgers (
      id, client_account_id, room_id,
      full_name, first_name, last_name1, last_name2,
      email, phone, gender, status, check_in_date
    ) VALUES (
      gen_random_uuid(),
      p_client_account_id,
      v_room.id,
      v_nombre.nombre || ' ' || v_nombre.apellido1 || ' ' || v_nombre.apellido2,
      v_nombre.nombre,
      v_nombre.apellido1,
      v_nombre.apellido2,
      'lodger' || v_counter || '@staging.test',
      '+346' || LPAD((600000000 + v_counter)::text, 9, '0'),
      v_nombre.genero,
      'active',
      random_date_last_year()
    )
    ON CONFLICT DO NOTHING;
    
    -- Actualizar estado de habitación a ocupada
    UPDATE public.rooms SET status = 'occupied' WHERE id = v_room.id;
    
    v_filled := v_filled + 1;
    v_counter := v_counter + 1;
  END LOOP;
  
  RETURN v_counter;
END;
$$ LANGUAGE plpgsql;

-- Crear inquilinos para todos los alojamientos
-- Patrón: Aloj 1 = 50%, Aloj 2 = 100%, Aloj 3 = 5 inquilinos

DO $$
DECLARE
  v_counter int := 1;
BEGIN
  -- BASIC USER 1
  v_counter := create_lodgers_for_accommodation('acc-basic1-1'::uuid, 'ca-basic-user1-0001'::uuid, 50, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-basic1-2'::uuid, 'ca-basic-user1-0001'::uuid, 100, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-basic1-3'::uuid, 'ca-basic-user1-0001'::uuid, -1, v_counter);
  
  -- BASIC USER 2
  v_counter := create_lodgers_for_accommodation('acc-basic2-1'::uuid, 'ca-basic-user2-0002'::uuid, 50, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-basic2-2'::uuid, 'ca-basic-user2-0002'::uuid, 100, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-basic2-3'::uuid, 'ca-basic-user2-0002'::uuid, -1, v_counter);
  
  -- INVESTOR ENTITY 1 - Premium Properties
  v_counter := create_lodgers_for_accommodation('acc-inv1-1-1'::uuid, 'ca-investor-ent1-0003'::uuid, 50, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-inv1-1-2'::uuid, 'ca-investor-ent1-0003'::uuid, 100, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-inv1-1-3'::uuid, 'ca-investor-ent1-0003'::uuid, -1, v_counter);
  
  -- INVESTOR ENTITY 1 - Elite Residences
  v_counter := create_lodgers_for_accommodation('acc-inv1-2-1'::uuid, 'ca-investor-ent1-0003'::uuid, 50, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-inv1-2-2'::uuid, 'ca-investor-ent1-0003'::uuid, 100, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-inv1-2-3'::uuid, 'ca-investor-ent1-0003'::uuid, -1, v_counter);
  
  -- INVESTOR ENTITY 4 - Smart Housing
  v_counter := create_lodgers_for_accommodation('acc-inv4-1-1'::uuid, 'ca-investor-ent4-0004'::uuid, 50, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-inv4-1-2'::uuid, 'ca-investor-ent4-0004'::uuid, 100, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-inv4-1-3'::uuid, 'ca-investor-ent4-0004'::uuid, -1, v_counter);
  
  -- INVESTOR ENTITY 4 - Modern Living
  v_counter := create_lodgers_for_accommodation('acc-inv4-2-1'::uuid, 'ca-investor-ent4-0004'::uuid, 50, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-inv4-2-2'::uuid, 'ca-investor-ent4-0004'::uuid, 100, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-inv4-2-3'::uuid, 'ca-investor-ent4-0004'::uuid, -1, v_counter);
  
  -- BUSINESS ENTITY 2 - Corporate Housing
  v_counter := create_lodgers_for_accommodation('acc-bus2-1-1'::uuid, 'ca-business-ent2-0005'::uuid, 50, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-bus2-1-2'::uuid, 'ca-business-ent2-0005'::uuid, 100, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-bus2-1-3'::uuid, 'ca-business-ent2-0005'::uuid, -1, v_counter);
  
  -- BUSINESS ENTITY 2 - Business Suites
  v_counter := create_lodgers_for_accommodation('acc-bus2-2-1'::uuid, 'ca-business-ent2-0005'::uuid, 50, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-bus2-2-2'::uuid, 'ca-business-ent2-0005'::uuid, 100, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-bus2-2-3'::uuid, 'ca-business-ent2-0005'::uuid, -1, v_counter);
  
  -- BUSINESS ENTITY 5 - Executive Rentals
  v_counter := create_lodgers_for_accommodation('acc-bus5-1-1'::uuid, 'ca-business-ent5-0006'::uuid, 50, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-bus5-1-2'::uuid, 'ca-business-ent5-0006'::uuid, 100, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-bus5-1-3'::uuid, 'ca-business-ent5-0006'::uuid, -1, v_counter);
  
  -- BUSINESS ENTITY 5 - Professional Housing
  v_counter := create_lodgers_for_accommodation('acc-bus5-2-1'::uuid, 'ca-business-ent5-0006'::uuid, 50, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-bus5-2-2'::uuid, 'ca-business-ent5-0006'::uuid, 100, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-bus5-2-3'::uuid, 'ca-business-ent5-0006'::uuid, -1, v_counter);
  
  -- AGENCY ENTITY 3 - Global Property
  v_counter := create_lodgers_for_accommodation('acc-age3-1-1'::uuid, 'ca-agency-ent3-0007'::uuid, 50, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-age3-1-2'::uuid, 'ca-agency-ent3-0007'::uuid, 100, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-age3-1-3'::uuid, 'ca-agency-ent3-0007'::uuid, -1, v_counter);
  
  -- AGENCY ENTITY 3 - International Housing
  v_counter := create_lodgers_for_accommodation('acc-age3-2-1'::uuid, 'ca-agency-ent3-0007'::uuid, 50, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-age3-2-2'::uuid, 'ca-agency-ent3-0007'::uuid, 100, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-age3-2-3'::uuid, 'ca-agency-ent3-0007'::uuid, -1, v_counter);
  
  -- AGENCY ENTITY 6 - Worldwide Rentals
  v_counter := create_lodgers_for_accommodation('acc-age6-1-1'::uuid, 'ca-agency-ent6-0008'::uuid, 50, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-age6-1-2'::uuid, 'ca-agency-ent6-0008'::uuid, 100, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-age6-1-3'::uuid, 'ca-agency-ent6-0008'::uuid, -1, v_counter);
  
  -- AGENCY ENTITY 6 - Universal Housing
  v_counter := create_lodgers_for_accommodation('acc-age6-2-1'::uuid, 'ca-agency-ent6-0008'::uuid, 50, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-age6-2-2'::uuid, 'ca-agency-ent6-0008'::uuid, 100, v_counter);
  v_counter := create_lodgers_for_accommodation('acc-age6-2-3'::uuid, 'ca-agency-ent6-0008'::uuid, -1, v_counter);
END $$;

-- Crear 5 inquilinos SIN asignar habitación (room_id = NULL)
INSERT INTO public.lodgers (
  id, client_account_id, room_id,
  full_name, first_name, last_name1, last_name2,
  email, phone, gender, status, check_in_date
) VALUES
  (gen_random_uuid(), 'ca-basic-user1-0001'::uuid, NULL, 'Roberto Torres Vega', 'Roberto', 'Torres', 'Vega', 'inquilino-libre1@staging.test', '+34602000001', 'male', 'invited', NULL),
  (gen_random_uuid(), 'ca-basic-user2-0002'::uuid, NULL, 'Patricia Moreno Castro', 'Patricia', 'Moreno', 'Castro', 'inquilino-libre2@staging.test', '+34602000002', 'female', 'invited', NULL),
  (gen_random_uuid(), 'ca-investor-ent1-0003'::uuid, NULL, 'Alberto Jiménez Ortiz', 'Alberto', 'Jiménez', 'Ortiz', 'inquilino-libre3@staging.test', '+34602000003', 'male', 'invited', NULL),
  (gen_random_uuid(), 'ca-business-ent2-0005'::uuid, NULL, 'Carmen Navarro Silva', 'Carmen', 'Navarro', 'Silva', 'inquilino-libre4@staging.test', '+34602000004', 'female', 'invited', NULL),
  (gen_random_uuid(), 'ca-agency-ent3-0007'::uuid, NULL, 'Francisco Romero Blanco', 'Francisco', 'Romero', 'Blanco', 'inquilino-libre5@staging.test', '+34602000005', 'male', 'invited', NULL)
ON CONFLICT DO NOTHING;

-- Limpiar funciones y tablas temporales
DROP FUNCTION IF EXISTS random_date_last_year();
DROP FUNCTION IF EXISTS create_lodgers_for_accommodation(uuid, uuid, int, int);
DROP TABLE IF EXISTS nombres_temp;

-- Verificación
SELECT 'Inquilinos insertados/actualizados:' as status;
SELECT COUNT(*) as total_lodgers FROM public.lodgers;
SELECT COUNT(*) as lodgers_assigned FROM public.lodgers WHERE room_id IS NOT NULL;
SELECT COUNT(*) as lodgers_unassigned FROM public.lodgers WHERE room_id IS NULL;

-- Resumen por alojamiento
SELECT 
  a.name as accommodation,
  COUNT(l.id) as num_lodgers,
  COUNT(r.id) as num_rooms,
  ROUND(COUNT(l.id)::numeric / NULLIF(COUNT(r.id), 0) * 100, 0) as occupancy_percent
FROM public.accommodations a
LEFT JOIN public.rooms r ON a.id = r.accommodation_id
LEFT JOIN public.lodgers l ON r.id = l.room_id
GROUP BY a.id, a.name
ORDER BY a.name;

-- Resumen por client account
SELECT 
  ca.name as client_account,
  ca.plan_code,
  COUNT(DISTINCT a.id) as num_accommodations,
  COUNT(DISTINCT r.id) as num_rooms,
  COUNT(DISTINCT l.id) as num_lodgers
FROM public.client_accounts ca
LEFT JOIN public.accommodations a ON ca.id = a.client_account_id
LEFT JOIN public.rooms r ON a.id = r.accommodation_id
LEFT JOIN public.lodgers l ON r.id = l.room_id
GROUP BY ca.id, ca.name, ca.plan_code
ORDER BY ca.plan_code, ca.name;
