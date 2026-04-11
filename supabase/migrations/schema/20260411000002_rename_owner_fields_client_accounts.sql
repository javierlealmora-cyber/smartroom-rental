-- ============================================================================
-- Migración: Ajustar campos de propietario en client_accounts
-- Fecha: 2026-04-11
--
-- Cambios:
--   - Eliminar owner_first_name (el nombre ya está en el campo 'name')
--   - Renombrar owner_last_name1 → last_name1
--   - Renombrar owner_last_name2 → last_name2
-- ============================================================================

ALTER TABLE public.client_accounts
  DROP   COLUMN IF EXISTS owner_first_name,
  RENAME COLUMN owner_last_name1 TO last_name1,
  RENAME COLUMN owner_last_name2 TO last_name2;

COMMENT ON COLUMN public.client_accounts.last_name1 IS 'Primer apellido del propietario de la cuenta';
COMMENT ON COLUMN public.client_accounts.last_name2 IS 'Segundo apellido del propietario de la cuenta';
