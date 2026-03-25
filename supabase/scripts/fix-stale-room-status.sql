-- fix-stale-room-status.sql
-- Corrige habitaciones con status incorrecto según la regla de negocio:
--
-- Una habitación está LIBRE si:
--   a) No tiene ningún registro en lodger_room_assignments, O
--   b) Todos sus registros tienen move_in_date Y move_out_date informados
--      con move_out_date en el pasado (≤ hoy)
--
-- Una habitación está PENDIENTE DE BAJA si:
--   Tiene algún registro con move_in_date y move_out_date > hoy
--
-- Una habitación está OCUPADA si:
--   Tiene algún registro con move_in_date informado y move_out_date NULL
--
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Entorno: DEV / STAGING (verificar antes de producción)
-- Detectado: 2026-03-25 — BUG-036

-- ─── 1. DRY-RUN: ver qué estado debería tener cada habitación ───────────────
SELECT
  r.id,
  r.number,
  r.accommodation_id,
  r.status                        AS status_actual,
  CASE
    -- Sin ningún registro → libre
    WHEN NOT EXISTS (
      SELECT 1 FROM lodger_room_assignments lra WHERE lra.room_id = r.id
    ) THEN 'free'
    -- Tiene algún registro con move_out_date futuro → pendiente de baja
    WHEN EXISTS (
      SELECT 1 FROM lodger_room_assignments lra
      WHERE lra.room_id = r.id
        AND lra.move_in_date IS NOT NULL
        AND lra.move_out_date IS NOT NULL
        AND lra.move_out_date > CURRENT_DATE
    ) THEN 'pending_checkout'
    -- Tiene algún registro con move_in_date pero sin move_out_date → ocupada
    WHEN EXISTS (
      SELECT 1 FROM lodger_room_assignments lra
      WHERE lra.room_id = r.id
        AND lra.move_in_date IS NOT NULL
        AND lra.move_out_date IS NULL
    ) THEN 'occupied'
    -- Todos los registros tienen move_in_date y move_out_date pasados → libre
    ELSE 'free'
  END                             AS status_correcto
FROM rooms r
ORDER BY r.accommodation_id, r.number;

-- ─── 2. CORRECCIÓN: actualizar solo las habitaciones con estado incorrecto ──
-- (Descomentar para ejecutar)
/*
UPDATE rooms
SET status = CASE
  WHEN NOT EXISTS (
    SELECT 1 FROM lodger_room_assignments lra WHERE lra.room_id = rooms.id
  ) THEN 'free'
  WHEN EXISTS (
    SELECT 1 FROM lodger_room_assignments lra
    WHERE lra.room_id = rooms.id
      AND lra.move_in_date IS NOT NULL
      AND lra.move_out_date IS NOT NULL
      AND lra.move_out_date > CURRENT_DATE
  ) THEN 'pending_checkout'
  WHEN EXISTS (
    SELECT 1 FROM lodger_room_assignments lra
    WHERE lra.room_id = rooms.id
      AND lra.move_in_date IS NOT NULL
      AND lra.move_out_date IS NULL
  ) THEN 'occupied'
  ELSE 'free'
END
WHERE status != CASE
  WHEN NOT EXISTS (
    SELECT 1 FROM lodger_room_assignments lra WHERE lra.room_id = rooms.id
  ) THEN 'free'
  WHEN EXISTS (
    SELECT 1 FROM lodger_room_assignments lra
    WHERE lra.room_id = rooms.id
      AND lra.move_in_date IS NOT NULL
      AND lra.move_out_date IS NOT NULL
      AND lra.move_out_date > CURRENT_DATE
  ) THEN 'pending_checkout'
  WHEN EXISTS (
    SELECT 1 FROM lodger_room_assignments lra
    WHERE lra.room_id = rooms.id
      AND lra.move_in_date IS NOT NULL
      AND lra.move_out_date IS NULL
  ) THEN 'occupied'
  ELSE 'free'
END;
*/
