-- ============================================================================
-- MIGRACIÓN: Añadir campo checkout_notes a lodger_room_assignments
-- Fecha: 2026-03-25
-- Descripción: Añade campo para almacenar observaciones del check-out
-- ============================================================================

-- Añadir campo checkout_notes
ALTER TABLE public.lodger_room_assignments
ADD COLUMN IF NOT EXISTS checkout_notes text;

-- Comentario
COMMENT ON COLUMN public.lodger_room_assignments.checkout_notes IS 'Observaciones y notas del proceso de check-out';

-- Verificación
SELECT 'Campo checkout_notes añadido exitosamente' as status;
