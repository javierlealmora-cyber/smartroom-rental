-- ============================================================================
-- MIGRACION: Crear tabla client_accounts
-- Fecha: 2026-02-11
-- Descripcion: Cuentas de cliente (tenants SaaS). Cada cuenta tiene un plan,
--              branding, datos Stripe y estado de suscripcion.
--              NO afecta tablas legacy (companies, profiles).
-- ============================================================================

-- ============================================================================
-- PASO 1: Crear tabla client_accounts
-- ============================================================================
CREATE TABLE public.client_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,

  -- Plan y ciclo de facturacion
  plan_code text NOT NULL
    CHECK (plan_code IN ('basic','investor','business','agency')),
  billing_cycle text NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly','annual')),

  -- Estado de la cuenta
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('draft','pending_payment','active','suspended','canceled')),
  start_date date NOT NULL DEFAULT current_date,
  end_date date,

  -- Branding
  branding_name text,
  branding_primary_color text,
  branding_secondary_color text,
  branding_logo_url text,

  -- Stripe
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,

  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PASO 2: Trigger updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS update_client_accounts_updated_at ON public.client_accounts;

CREATE TRIGGER update_client_accounts_updated_at
  BEFORE UPDATE ON public.client_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PASO 3: Indices
-- ============================================================================
CREATE INDEX idx_client_accounts_slug ON public.client_accounts (slug);
CREATE INDEX idx_client_accounts_status ON public.client_accounts (status);
CREATE INDEX idx_client_accounts_plan_code ON public.client_accounts (plan_code);
