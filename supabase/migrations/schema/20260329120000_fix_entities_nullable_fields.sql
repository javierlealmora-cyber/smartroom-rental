-- ============================================================================
-- FIX: Permitir NULL en last_name2 y gender de entities
-- Detectado: 2026-03-24 (BUG-031)
-- Motivo: Persona física puede no tener segundo apellido ni género especificado
-- ============================================================================

ALTER TABLE public.entities 
  ALTER COLUMN last_name2 DROP NOT NULL;

ALTER TABLE public.entities 
  ALTER COLUMN gender DROP NOT NULL;

COMMENT ON COLUMN public.entities.last_name2 IS 'Segundo apellido (opcional para persona física)';
COMMENT ON COLUMN public.entities.gender IS 'Género (opcional)';
