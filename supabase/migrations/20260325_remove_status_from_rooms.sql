-- ============================================================================
-- Migración: eliminar rooms.status — estado calculado desde asignaciones
-- Fecha: 2026-03-25
--
-- rooms.status era redundante con lodger_room_assignments:
--   IS NULL move_out_date  → ocupada
--   move_out_date > hoy    → pendiente baja
--   sin asignación activa  → libre
--
-- El único estado que era genuinamente almacenado era 'maintenance'.
-- Se sustituye por rooms.is_maintenance (boolean).
-- ============================================================================

-- 1. Añadir campo de mantenimiento
ALTER TABLE public.rooms
  ADD COLUMN is_maintenance boolean NOT NULL DEFAULT false;

-- 2. Migrar habitaciones en mantenimiento
UPDATE public.rooms
  SET is_maintenance = true
  WHERE status = 'maintenance';

-- 3. Eliminar columna status e índice asociado
DROP INDEX IF EXISTS public.idx_rooms_status;
ALTER TABLE public.rooms DROP COLUMN status;
