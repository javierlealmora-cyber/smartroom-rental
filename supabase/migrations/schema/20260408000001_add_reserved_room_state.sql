-- ============================================================
-- 20260408000001_add_reserved_room_state.sql
-- REQ-005 v2 — Estado "Reservada" para habitaciones
--
-- Cambios:
--   1. Elimina unique indexes que impiden 2ª asignación futura
--      por habitación/inquilino
--   2. Reemplaza constraint no-overlap '[]' → '[)' para permitir
--      que el checkout de A y el checkin de B sean el mismo día
--   3. Actualiza get_room_derived_status() para devolver JSONB
--      con status principal + upcoming (reserva futura)
-- ============================================================

-- ── 1. Eliminar unique partial indexes ──────────────────────
-- Estos índices solo permiten UNA asignación sin move_out_date
-- por habitación/inquilino, bloqueando la reserva futura.
-- La protección contra solapamiento la da el EXCLUDE constraint.

DROP INDEX IF EXISTS public.idx_room_active_assignment;
DROP INDEX IF EXISTS public.idx_lodger_active_assignment;

-- ── 2. Reemplazar constraint no-overlap ─────────────────────
-- '[]' (inclusive-inclusive) → '[)' (inclusive-exclusive)
-- Permite: salida de A el día T + entrada de B el día T

ALTER TABLE public.lodger_room_assignments
  DROP CONSTRAINT IF EXISTS no_overlapping_assignments;

ALTER TABLE public.lodger_room_assignments
  ADD CONSTRAINT no_overlapping_assignments
  EXCLUDE USING gist (
    room_id WITH =,
    daterange(
      move_in_date,
      COALESCE(move_out_date, '9999-12-31'::date),
      '[)'
    ) WITH &&
  );

-- ── 3. Actualizar función get_room_derived_status ────────────
-- Devuelve JSONB: { status, upcoming }
-- status:   'free' | 'occupied' | 'pending_checkout' | 'maintenance' | 'reserved'
-- upcoming: fecha ISO de la reserva futura (o null)

CREATE OR REPLACE FUNCTION get_room_derived_status(p_room_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_is_maintenance BOOLEAN;
  v_current        RECORD;
  v_upcoming       RECORD;
  v_today          DATE := CURRENT_DATE;
BEGIN
  SELECT is_maintenance INTO v_is_maintenance
  FROM rooms WHERE id = p_room_id;

  IF v_is_maintenance THEN
    RETURN jsonb_build_object('status', 'maintenance', 'upcoming', null);
  END IF;

  -- Asignación activa hoy: ya empezó, no ha terminado
  SELECT * INTO v_current
  FROM lodger_room_assignments
  WHERE room_id = p_room_id
    AND move_in_date <= v_today
    AND (move_out_date IS NULL OR move_out_date > v_today)
  ORDER BY move_in_date DESC
  LIMIT 1;

  -- Asignación futura: aún no ha empezado
  SELECT * INTO v_upcoming
  FROM lodger_room_assignments
  WHERE room_id = p_room_id
    AND move_in_date > v_today
  ORDER BY move_in_date ASC
  LIMIT 1;

  IF v_current IS NULL AND v_upcoming IS NULL THEN
    RETURN jsonb_build_object('status', 'free', 'upcoming', null);

  ELSIF v_current IS NULL AND v_upcoming IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'reserved', 'upcoming', v_upcoming.move_in_date);

  ELSIF v_current IS NOT NULL AND v_current.move_out_date IS NULL THEN
    -- Ocupada (sin fecha de salida)
    RETURN jsonb_build_object(
      'status', 'occupied',
      'upcoming', CASE WHEN v_upcoming IS NOT NULL THEN v_upcoming.move_in_date ELSE null END
    );

  ELSE
    -- Pte. Baja (con fecha de salida futura)
    RETURN jsonb_build_object(
      'status', 'pending_checkout',
      'upcoming', CASE WHEN v_upcoming IS NOT NULL THEN v_upcoming.move_in_date ELSE null END
    );
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ── 4. Comentario en tabla ───────────────────────────────────
COMMENT ON FUNCTION get_room_derived_status(UUID) IS
  'Devuelve JSONB {status, upcoming}. Status: free|occupied|pending_checkout|maintenance|reserved. Upcoming: fecha ISO de reserva futura o null.';
