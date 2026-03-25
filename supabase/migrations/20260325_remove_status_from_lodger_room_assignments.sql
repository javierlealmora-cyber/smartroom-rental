-- 20260325_remove_status_from_lodger_room_assignments.sql
-- Elimina el campo `status` de lodger_room_assignments.
-- El estado de una asignación se calcula desde move_in_date / move_out_date:
--   move_out_date IS NULL                       → activa
--   move_out_date IS NOT NULL AND > CURRENT_DATE → pendiente de baja
--   move_out_date IS NOT NULL AND ≤ CURRENT_DATE → finalizada

-- 1. Eliminar columna status
ALTER TABLE public.lodger_room_assignments DROP COLUMN IF EXISTS status;

-- 2. Eliminar índice simple por status (ya no existe la columna)
DROP INDEX IF EXISTS public.idx_assignments_status;

-- 3. Reemplazar índice único parcial idx_lodger_active_assignment:
--    Antes: WHERE (status = 'active')
--    Ahora: WHERE (move_out_date IS NULL)   ← mismo significado, sin la columna status
DROP INDEX IF EXISTS public.idx_lodger_active_assignment;
CREATE UNIQUE INDEX idx_lodger_active_assignment
  ON public.lodger_room_assignments (lodger_id)
  WHERE (move_out_date IS NULL);
