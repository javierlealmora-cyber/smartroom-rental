-- ============================================================================
-- MIGRACIÓN: 20260412160000_reassign_room_rpc.sql
-- Función SECURITY DEFINER para reasignación de habitación de inquilino.
--
-- Objetivo: Ejecutar el cambio de habitación de forma atómica desde el
-- frontend via supabase.rpc(), registrando la operación en audit_log
-- sin requerir una Edge Function (que dispararía getSession() y podría
-- causar un logout si el token está próximo a caducar).
--
-- La clave es SECURITY DEFINER: la función corre con permisos del dueño
-- de la función (service role o superuser que la crea), lo que le permite
-- hacer INSERT en audit_log aunque el RLS solo tenga política SELECT para
-- usuarios autenticados. auth.uid() sigue disponible via el contexto JWT
-- que PostgREST inyecta en cada llamada.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reassign_lodger_room(
  p_lodger_id            uuid,
  p_current_asgn_id      uuid,       -- NULL si el inquilino no tiene asignación activa
  p_new_room_id          uuid,
  p_new_accommodation_id uuid,
  p_change_date          date,
  p_monthly_rent         numeric     DEFAULT NULL,
  p_deposit_amount       numeric     DEFAULT NULL,
  p_commission_amount    numeric     DEFAULT NULL,
  p_correction_amount    numeric     DEFAULT NULL,
  p_client_account_id    uuid,
  p_notes                text        DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_asgn_id  uuid;
  v_old_asgn     jsonb;
  v_new_asgn     jsonb;
  v_actor_id     uuid;
  v_actor_role   text;
  v_note         text;
BEGIN
  -- Obtener identidad del llamante desde el contexto JWT (PostgREST)
  v_actor_id := auth.uid();

  SELECT role INTO v_actor_role
  FROM public.profiles
  WHERE id = v_actor_id;

  -- 1. Cerrar asignación actual (move_out_date + nota)
  IF p_current_asgn_id IS NOT NULL THEN
    SELECT to_jsonb(lra) INTO v_old_asgn
    FROM public.lodger_room_assignments lra
    WHERE id = p_current_asgn_id;

    v_note := COALESCE(
      p_notes,
      'Cambio de habitación el ' || to_char(p_change_date, 'DD/MM/YYYY')
    );

    UPDATE public.lodger_room_assignments
    SET move_out_date = p_change_date,
        notes         = v_note
    WHERE id = p_current_asgn_id;
  END IF;

  -- 2. Crear nueva asignación
  INSERT INTO public.lodger_room_assignments (
    lodger_id,
    room_id,
    accommodation_id,
    client_account_id,
    move_in_date,
    billing_start_date,
    monthly_rent,
    deposit_amount,
    commission_amount,
    correction_amount
  ) VALUES (
    p_lodger_id,
    p_new_room_id,
    p_new_accommodation_id,
    p_client_account_id,
    p_change_date,
    p_change_date,
    p_monthly_rent,
    p_deposit_amount,
    p_commission_amount,
    p_correction_amount
  )
  RETURNING id INTO v_new_asgn_id;

  -- Capturar nueva fila para audit
  SELECT to_jsonb(lra) INTO v_new_asgn
  FROM public.lodger_room_assignments lra
  WHERE id = v_new_asgn_id;

  -- 3. Registrar en audit_log (SECURITY DEFINER evita restricción RLS INSERT)
  INSERT INTO public.audit_log (
    client_account_id,
    actor_user_id,
    actor_role,
    entity_type,
    entity_id,
    action,
    old_values,
    new_values
  ) VALUES (
    p_client_account_id,
    v_actor_id,
    v_actor_role,
    'lodger_assignment',
    v_new_asgn_id,
    'reassign_room',
    v_old_asgn,
    v_new_asgn
  );

  RETURN v_new_asgn_id;
END;
$$;

-- Solo usuarios autenticados pueden invocar la función
REVOKE ALL ON FUNCTION public.reassign_lodger_room(
  uuid, uuid, uuid, uuid, date,
  numeric, numeric, numeric, numeric,
  uuid, text
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.reassign_lodger_room(
  uuid, uuid, uuid, uuid, date,
  numeric, numeric, numeric, numeric,
  uuid, text
) TO authenticated;
