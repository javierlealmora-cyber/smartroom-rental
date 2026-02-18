-- ============================================================================
-- MIGRACION: Agregar columnas de tenant/onboarding a profiles
-- Fecha: 2026-02-11
-- Descripcion: Anade client_account_id, onboarding_status e is_primary_admin
--              a la tabla profiles existente. NO elimina company_id (legacy).
--              Ambas columnas coexisten durante la transicion.
-- ============================================================================

-- ============================================================================
-- PASO 1: Agregar columnas nuevas
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS client_account_id uuid REFERENCES public.client_accounts(id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'none'
    CHECK (onboarding_status IN ('none','in_progress','payment_pending','active'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_primary_admin boolean NOT NULL DEFAULT false;

-- ============================================================================
-- PASO 2: Indice para client_account_id
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_client_account ON public.profiles (client_account_id);
