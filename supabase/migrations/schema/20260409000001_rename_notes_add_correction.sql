-- ============================================================
-- 20260409000001_rename_notes_add_correction.sql
-- REQ-003 v3 — Notas en asignaciones + corrección por cambio de habitación
--
-- Cambios:
--   1. Renombrar checkout_notes → notes (campo general para cualquier nota
--      asociada a una asignación: check-in, check-out, cambio de hab.)
--   2. Añadir correction_amount: importe de corrección proporcional al cambiar
--      de habitación a mitad de mes.
-- ============================================================

-- 1. Renombrar checkout_notes → notes
ALTER TABLE public.lodger_room_assignments
  RENAME COLUMN checkout_notes TO notes;

COMMENT ON COLUMN public.lodger_room_assignments.notes IS
  'Nota libre asociada a la asignación. Se rellena automáticamente en cambios
   de habitación ("HAB-001 → HAB-002 el DD/MM/YYYY") y en el proceso de check-out.
   También editable manualmente.';

-- 2. Añadir correction_amount
ALTER TABLE public.lodger_room_assignments
  ADD COLUMN IF NOT EXISTS correction_amount numeric;

COMMENT ON COLUMN public.lodger_room_assignments.correction_amount IS
  'Importe de corrección por cambio de habitación a mitad de mes.
   Fórmula: (nueva_renta - renta_anterior) × días_restantes_mes / días_del_mes.
   Positivo = el inquilino debe pagar más ese mes.
   Negativo = el inquilino tiene un descuento ese mes.
   0 si el cambio es el día 1 del mes.
   NULL si no aplica (alta normal, checkout sin cambio).';
