-- Añadir campos de inquilino a profiles (migración post-eliminación tabla lodgers)
-- La tabla lodgers fue eliminada el 2026-03-15; estos campos se mueven a profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS document_id text,
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female', 'other'));

-- Ampliar onboarding_status para incluir el ciclo de vida del inquilino
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_onboarding_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_onboarding_status_check
  CHECK (onboarding_status IN (
    'none', 'in_progress', 'payment_pending', 'active',
    'invited', 'pending_checkout', 'inactive'
  ));
