-- ============================================================================
-- Migración: Añadir campos de propietario a client_accounts
-- Fecha: 2026-04-11
--
-- Contexto:
--   Los datos del propietario de la cuenta (nombre, apellidos) se almacenaban
--   en la tabla entities con type='owner', lo que causaba problemas por los
--   muchos campos NOT NULL de esa tabla.
--   Se mueven a client_accounts donde ya existen contact_email y contact_phone.
-- ============================================================================

ALTER TABLE public.client_accounts
  ADD COLUMN IF NOT EXISTS owner_first_name  text,
  ADD COLUMN IF NOT EXISTS owner_last_name1  text,
  ADD COLUMN IF NOT EXISTS owner_last_name2  text;

COMMENT ON COLUMN public.client_accounts.owner_first_name IS 'Nombre de pila del propietario de la cuenta';
COMMENT ON COLUMN public.client_accounts.owner_last_name1  IS 'Primer apellido del propietario de la cuenta';
COMMENT ON COLUMN public.client_accounts.owner_last_name2  IS 'Segundo apellido del propietario de la cuenta';
