-- ============================================================================
-- FIX: Hacer opcionales campos no críticos en entities
-- Detectado: 2026-03-30 (BUG-042)
-- Motivo: Campos de dirección y teléfono marcados como NOT NULL en BD pero
--         sin validación required en UI, causando inconsistencia.
--         Solo deben ser obligatorios: tax_id, billing_email
-- ============================================================================

-- Hacer opcional el teléfono
ALTER TABLE public.entities 
  ALTER COLUMN phone DROP NOT NULL;

-- Hacer opcionales los campos de dirección
ALTER TABLE public.entities 
  ALTER COLUMN country DROP NOT NULL,
  ALTER COLUMN province DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN zip DROP NOT NULL,
  ALTER COLUMN street DROP NOT NULL,
  ALTER COLUMN street_number DROP NOT NULL;

-- Mantener valor por defecto en country pero permitir NULL
ALTER TABLE public.entities 
  ALTER COLUMN country SET DEFAULT 'España';

-- Comentarios actualizados
COMMENT ON COLUMN public.entities.phone IS 'Teléfono de contacto (opcional)';
COMMENT ON COLUMN public.entities.country IS 'País (opcional, por defecto España)';
COMMENT ON COLUMN public.entities.province IS 'Provincia (opcional)';
COMMENT ON COLUMN public.entities.city IS 'Ciudad (opcional)';
COMMENT ON COLUMN public.entities.zip IS 'Código postal (opcional)';
COMMENT ON COLUMN public.entities.street IS 'Calle (opcional)';
COMMENT ON COLUMN public.entities.street_number IS 'Número de calle (opcional)';
