-- ============================================================================
-- MIGRACION: Crear tabla plans_catalog
-- Fecha: 2026-02-11
-- Descripcion: Catalogo de planes de suscripcion para SmartRent SaaS.
--              NO afecta tablas legacy (companies, profiles).
-- ============================================================================

-- ============================================================================
-- PASO 1: Crear tabla plans_catalog
-- ============================================================================
CREATE TABLE public.plans_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,

  -- Estado y vigencia
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','deprecated','expired','disabled')),
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  deactivated_at timestamptz,

  -- Pricing
  monthly_price numeric NOT NULL,
  annual_discount_months int NOT NULL DEFAULT 2,
  annual_price numeric GENERATED ALWAYS AS (monthly_price * (12 - annual_discount_months)) STORED,
  tax_percent numeric NOT NULL DEFAULT 21,

  -- Limites de recursos
  max_owners int NOT NULL DEFAULT 1,
  max_accommodations int NOT NULL DEFAULT 3,
  max_rooms int NOT NULL DEFAULT 20,
  max_admin_users int NOT NULL DEFAULT 3,
  max_associated_admins int NOT NULL DEFAULT 2,
  max_api_users int NOT NULL DEFAULT 1,
  max_viewer_users int NOT NULL DEFAULT 0,

  -- Branding
  branding_enabled boolean NOT NULL DEFAULT false,
  logo_allowed boolean NOT NULL DEFAULT false,
  theme_editable boolean NOT NULL DEFAULT false,

  -- Reglas funcionales
  allows_multi_owner boolean NOT NULL DEFAULT false,
  allows_owner_change boolean NOT NULL DEFAULT false,
  allows_receipt_upload boolean NOT NULL DEFAULT false,

  -- Servicios incluidos (dinamico)
  services jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Visibilidad
  visible_for_new_accounts boolean NOT NULL DEFAULT true,

  -- Stripe price IDs (placeholders hasta tener claves PRO)
  stripe_price_monthly_id text,
  stripe_price_annual_id text,

  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PASO 2: Trigger updated_at
-- ============================================================================
-- Reutiliza la funcion update_updated_at_column() creada en migracion anterior

DROP TRIGGER IF EXISTS update_plans_catalog_updated_at ON public.plans_catalog;

CREATE TRIGGER update_plans_catalog_updated_at
  BEFORE UPDATE ON public.plans_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PASO 3: Indices
-- ============================================================================
CREATE INDEX idx_plans_catalog_status ON public.plans_catalog (status);
CREATE INDEX idx_plans_catalog_visible ON public.plans_catalog (visible_for_new_accounts) WHERE status = 'active';

-- ============================================================================
-- PASO 4: Seed data — planes iniciales (del mock)
-- ============================================================================
INSERT INTO public.plans_catalog (
  name, code, description, status, start_date,
  monthly_price, annual_discount_months, tax_percent,
  max_owners, max_accommodations, max_rooms,
  max_admin_users, max_associated_admins, max_api_users, max_viewer_users,
  branding_enabled, logo_allowed, theme_editable,
  allows_multi_owner, allows_owner_change, allows_receipt_upload,
  services, visible_for_new_accounts
) VALUES
(
  'Basic', 'basic',
  'Plan basico para pequenos propietarios con hasta 3 alojamientos',
  'active', '2024-01-01',
  29.99, 2, 21,
  1, 3, 20,
  1, 0, 0, 0,
  false, false, false,
  false, false, true,
  '["encuestas"]'::jsonb,
  true
),
(
  'Investor', 'investor',
  'Plan para inversores con multiples propiedades y empresas fiscales',
  'active', '2024-01-01',
  79.99, 2, 21,
  5, 8, 60,
  2, 1, 1, 0,
  true, true, true,
  true, false, true,
  '["encuestas","lavanderia","tickets_incidencias"]'::jsonb,
  true
),
(
  'Business', 'business',
  'Plan empresarial con alojamientos ilimitados y servicios avanzados',
  'active', '2024-01-01',
  149.99, 2, 21,
  10, -1, -1,
  3, 2, 3, 0,
  true, true, true,
  true, false, true,
  '["encuestas","lavanderia","limpieza","tickets_incidencias","informes_avanzados"]'::jsonb,
  true
),
(
  'Agencia', 'agency',
  'Plan para agencias con gestion multi-empresa y cambio de propietarios',
  'active', '2024-01-01',
  299.99, 2, 21,
  -1, -1, -1,
  3, 2, 5, -1,
  true, true, true,
  true, true, true,
  '["encuestas","lavanderia","limpieza","tickets_incidencias","whatsapp_soporte","informes_avanzados"]'::jsonb,
  true
);
