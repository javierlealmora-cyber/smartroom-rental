-- ============================================================================
-- Migración: Catálogo de Servicios SaaS (Add-ons)
-- Fecha: 2026-04-12
-- REQ: REQ-013 (SaaS Services Catalog)
--
-- Crea el sistema genérico de add-ons SaaS para la plataforma.
-- El primer consumidor es SmartAccessLock (REQ-014).
-- ============================================================================

-- ─── saas_services ───────────────────────────────────────────────────────────
-- Catálogo de servicios adicionales disponibles en la plataforma.
-- Gestionado exclusivamente por superadmin.

CREATE TABLE IF NOT EXISTS public.saas_services (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                        text        NOT NULL UNIQUE,
  name                        text        NOT NULL,
  description                 text,
  icon_url                    text,
  status                      text        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','active','deprecated','disabled')),
  visible_in_catalog          boolean     NOT NULL DEFAULT false,
  requires_manual_activation  boolean     NOT NULL DEFAULT true,
  sort_order                  int         NOT NULL DEFAULT 0,
  metadata                    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saas_services_status
  ON public.saas_services (status);

CREATE INDEX IF NOT EXISTS idx_saas_services_visible
  ON public.saas_services (visible_in_catalog) WHERE visible_in_catalog = true;

-- ─── saas_service_plans ──────────────────────────────────────────────────────
-- Planes de pricing por servicio SaaS.

CREATE TABLE IF NOT EXISTS public.saas_service_plans (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  saas_service_id             uuid        NOT NULL REFERENCES public.saas_services(id),
  code                        text        NOT NULL,
  name                        text        NOT NULL,
  description                 text,
  billing_period              text        NOT NULL DEFAULT 'monthly'
                              CHECK (billing_period IN ('monthly','annual','one_time')),
  price_amount                numeric(10,2) NOT NULL DEFAULT 0,
  price_currency              text        NOT NULL DEFAULT 'EUR',
  setup_fee                   numeric(10,2) NOT NULL DEFAULT 0,
  stripe_price_id             text,
  is_active                   boolean     NOT NULL DEFAULT true,
  sort_order                  int         NOT NULL DEFAULT 0,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (saas_service_id, code)
);

CREATE INDEX IF NOT EXISTS idx_saas_service_plans_service
  ON public.saas_service_plans (saas_service_id);

-- ─── saas_service_features ───────────────────────────────────────────────────
-- Feature flags habilitados por plan. Permiten diferenciación funcional
-- entre planes sin cambios de código.

CREATE TABLE IF NOT EXISTS public.saas_service_features (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  saas_service_plan_id        uuid        NOT NULL REFERENCES public.saas_service_plans(id),
  feature_code                text        NOT NULL,
  is_enabled                  boolean     NOT NULL DEFAULT false,
  config                      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (saas_service_plan_id, feature_code)
);

CREATE INDEX IF NOT EXISTS idx_saas_service_features_plan
  ON public.saas_service_features (saas_service_plan_id);

-- ─── saas_service_subscriptions ──────────────────────────────────────────────
-- Suscripciones de client_accounts a servicios add-on.
-- Reutiliza el stripe_customer_id del client_account (no crea customer nuevo).
-- Se modela como subscription item en la suscripción Stripe existente del cliente.

CREATE TABLE IF NOT EXISTS public.saas_service_subscriptions (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id           uuid        NOT NULL REFERENCES public.client_accounts(id),
  saas_service_id             uuid        NOT NULL REFERENCES public.saas_services(id),
  saas_service_plan_id        uuid        REFERENCES public.saas_service_plans(id),
  status                      text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','active','suspended','cancelled')),
  -- Stripe: reutiliza el stripe_customer del client_account
  stripe_subscription_id      text,
  stripe_subscription_item_id text,
  -- Periodos de facturación
  trial_ends_at               timestamptz,
  billing_starts_at           timestamptz,
  current_period_start        timestamptz,
  current_period_end          timestamptz,
  -- Ciclo de vida
  activated_at                timestamptz,
  activated_by                text,
  suspended_at                timestamptz,
  cancelled_at                timestamptz,
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  -- Un cliente solo puede tener una suscripción activa por servicio
  UNIQUE (client_account_id, saas_service_id)
);

CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_client
  ON public.saas_service_subscriptions (client_account_id);

CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_service
  ON public.saas_service_subscriptions (saas_service_id);

CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_status
  ON public.saas_service_subscriptions (status) WHERE status = 'active';

-- ─── Triggers updated_at ─────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER saas_services_updated_at
  BEFORE UPDATE ON public.saas_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER saas_service_plans_updated_at
  BEFORE UPDATE ON public.saas_service_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER saas_service_subscriptions_updated_at
  BEFORE UPDATE ON public.saas_service_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Seed: SmartAccessLock en catálogo ───────────────────────────────────────

INSERT INTO public.saas_services (code, name, description, status, visible_in_catalog, requires_manual_activation, sort_order)
VALUES (
  'smart_access_lock',
  'SmartAccessLock',
  'Gestión de accesos inteligentes para alojamientos. Cerraduras, habitaciones y zonas comunes conectadas.',
  'draft',
  false,
  true,
  10
) ON CONFLICT (code) DO NOTHING;

-- ─── Verificación post-migración ─────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.saas_services WHERE code = 'smart_access_lock') THEN
    RAISE EXCEPTION 'Seed de saas_services falló — smart_access_lock no encontrado';
  END IF;
  RAISE NOTICE 'Migración 20260412000001 completada correctamente';
END $$;
