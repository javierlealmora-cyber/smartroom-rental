-- ============================================================================
-- BASELINE CERO: Schema Completo - SmartRoom Rental
-- Descripción: Estructura completa de base de datos (19 tablas)
-- Última actualización: 2026-03-22
-- Cambios en esta versión:
--   - Añadidos campos de inquilino a tabla profiles (first_name, last_name1, etc.)
--   - Añadida tabla payer_rental con campos directos (sin entity_id)
--   - Actualizado constraint onboarding_status en profiles
-- ============================================================================

-- ============================================================================
-- TABLA 1: plans_catalog
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

  -- Stripe price IDs
  stripe_price_monthly_id text,
  stripe_price_annual_id text,

  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLA 2: client_accounts
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
-- TABLA 3: profiles
-- ============================================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  
  -- Role
  role text NOT NULL DEFAULT 'lodger'
    CHECK (role IN ('superadmin','admin','agent','viewer','api','lodger')),
  
  -- Client account (multi-tenant)
  client_account_id uuid REFERENCES public.client_accounts(id) ON DELETE SET NULL,
  
  -- Onboarding
  onboarding_status text NOT NULL DEFAULT 'none'
    CHECK (onboarding_status IN ('none','in_progress','payment_pending','active','invited','pending_checkout','inactive')),
  is_primary_admin boolean NOT NULL DEFAULT false,
  
  -- Campos de inquilino (añadidos 2026-03-17)
  first_name text,
  last_name1 text,
  last_name2 text,
  nickname text,
  document_type text CHECK (document_type IN ('dni','nie','passport','other')),
  document_id text,
  gender text CHECK (gender IN ('male','female','other')),
  birth_date date,
  nationality text,
  phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLA 4: entities
-- ============================================================================
CREATE TABLE public.entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,

  -- Tipo de entidad
  type text NOT NULL CHECK (type IN ('payer','owner')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),

  -- Tipo legal
  legal_type text NOT NULL CHECK (legal_type IN ('autonomo','persona_fisica','persona_juridica')),

  -- Datos de la entidad
  legal_name text,
  first_name text,
  last_name1 text,
  last_name2 text NOT NULL,
  nickname text,
  gender text NOT NULL,
  tax_id text NOT NULL,
  billing_email text NOT NULL,
  phone text NOT NULL,

  -- Direccion
  country text NOT NULL DEFAULT 'España',
  province text NOT NULL,
  city text NOT NULL,
  zip text NOT NULL,
  street text NOT NULL,
  street_number text NOT NULL,
  address_extra text,

  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLA 5: accommodations
-- ============================================================================
CREATE TABLE public.accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  owner_entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE RESTRICT,
  
  -- Datos básicos
  name text NOT NULL,
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  province text,
  country text DEFAULT 'España',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  notes text,
  
  -- Configuración de utilities
  utilities_included boolean NOT NULL DEFAULT true,
  split_electricity boolean NOT NULL DEFAULT false,
  split_water boolean NOT NULL DEFAULT false,
  split_gas boolean NOT NULL DEFAULT false,
  split_mode_electricity text NOT NULL DEFAULT 'equal' CHECK (split_mode_electricity IN ('equal', 'prorated', 'meter')),
  split_mode_water text NOT NULL DEFAULT 'equal' CHECK (split_mode_water IN ('equal', 'prorated', 'meter')),
  split_mode_gas text NOT NULL DEFAULT 'equal' CHECK (split_mode_gas IN ('equal', 'prorated', 'meter')),
  extra_costs jsonb NOT NULL DEFAULT '[]'::jsonb,
  has_individual_meters boolean NOT NULL DEFAULT false,
  
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLA 6: rooms
-- ============================================================================
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id uuid NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  
  -- Datos básicos
  number text NOT NULL,
  monthly_rent numeric NOT NULL DEFAULT 0,
  square_meters numeric,
  bathroom_type text NOT NULL DEFAULT 'shared' CHECK (bathroom_type IN ('shared', 'private', 'suite')),
  kitchen_type text NOT NULL DEFAULT 'shared' CHECK (kitchen_type IN ('shared', 'private', 'suite')),
  status text NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'maintenance', 'reserved')),
  notes text,
  
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraint: número único por alojamiento
  UNIQUE (accommodation_id, number)
);

-- ============================================================================
-- NOTA: TABLA lodgers ELIMINADA
-- ============================================================================
-- Los inquilinos ahora son solo usuarios con role='lodger' en la tabla profiles
-- No se necesita tabla separada para datos extendidos de inquilinos
-- ============================================================================

-- ============================================================================
-- TABLA 8: services_catalog
-- ============================================================================
CREATE TABLE public.services_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  
  -- Datos del servicio
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('cleaning', 'laundry', 'maintenance', 'other')),
  price numeric NOT NULL DEFAULT 0,
  billing_type text NOT NULL DEFAULT 'one_time' CHECK (billing_type IN ('one_time', 'recurring')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLA 9: accommodation_services
-- ============================================================================
CREATE TABLE public.accommodation_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accommodation_id uuid NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services_catalog(id) ON DELETE CASCADE,
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  
  -- Configuración
  enabled boolean NOT NULL DEFAULT true,
  custom_price numeric,
  
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraint: servicio único por alojamiento
  UNIQUE (accommodation_id, service_id)
);

-- ============================================================================
-- TABLA 10: lodger_services
-- ============================================================================
CREATE TABLE public.lodger_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lodger_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services_catalog(id) ON DELETE CASCADE,
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  
  -- Datos de uso
  usage_date date NOT NULL DEFAULT current_date,
  quantity numeric NOT NULL DEFAULT 1,
  total_price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'billed', 'paid')),
  notes text,
  
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLA 11: payer_rental (añadida 2026-03-22)
-- ============================================================================
CREATE TABLE public.payer_rental (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  lodger_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Tipo de pagador
  payer_type text NOT NULL CHECK (payer_type IN ('individual', 'company')),
  
  -- Datos de persona física
  first_name text,
  last_name1 text,
  last_name2 text,
  
  -- Datos de empresa
  legal_name text,
  
  -- Observaciones
  notes text,
  
  -- Estado
  is_active boolean NOT NULL DEFAULT true,
  
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLA 12: stripe_events
-- ============================================================================
CREATE TABLE public.stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  type text NOT NULL,
  data jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLA 13: energy_bills
-- ============================================================================
CREATE TABLE public.energy_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  accommodation_id uuid NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
  
  -- Datos del proveedor
  supplier text NOT NULL,
  bill_number text,
  reference text,
  
  -- Fechas
  issue_date date NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  
  -- Consumo y costos
  total_kwh numeric,
  amount_energy numeric NOT NULL DEFAULT 0,
  amount_power numeric NOT NULL DEFAULT 0,
  amount_meter numeric NOT NULL DEFAULT 0,
  amount_discounts numeric NOT NULL DEFAULT 0,
  amount_other numeric NOT NULL DEFAULT 0,
  amount_taxes numeric NOT NULL DEFAULT 0,
  amount_total numeric NOT NULL,
  
  -- Almacenamiento y metadatos
  storage_path text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'settled')),
  notes text,
  utility_type text CHECK (utility_type IN ('electricity', 'water', 'gas')),
  scan_result jsonb,
  
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLA 14: energy_readings
-- ============================================================================
CREATE TABLE public.energy_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  accommodation_id uuid NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  
  -- Datos de lectura
  reading_date date NOT NULL,
  kwh numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'api', 'import')),
  
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLA 15: energy_settlements
-- ============================================================================
CREATE TABLE public.energy_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  energy_bill_id uuid NOT NULL REFERENCES public.energy_bills(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  lodger_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Datos de liquidación
  days_present int NOT NULL DEFAULT 0,
  kwh_assigned numeric NOT NULL DEFAULT 0,
  amount_fixed numeric NOT NULL DEFAULT 0,
  amount_variable numeric NOT NULL DEFAULT 0,
  amount_total numeric NOT NULL DEFAULT 0,
  
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLA 16: bulletins
-- ============================================================================
CREATE TABLE public.bulletins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  accommodation_id uuid NOT NULL REFERENCES public.accommodations(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  lodger_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  energy_bill_id uuid REFERENCES public.energy_bills(id) ON DELETE SET NULL,
  
  -- Periodo y datos
  period_start date NOT NULL,
  period_end date NOT NULL,
  days_present int NOT NULL DEFAULT 0,
  kwh_consumed numeric NOT NULL DEFAULT 0,
  
  -- Montos
  amount_fixed numeric NOT NULL DEFAULT 0,
  amount_variable numeric NOT NULL DEFAULT 0,
  amount_services numeric NOT NULL DEFAULT 0,
  amount_total numeric NOT NULL DEFAULT 0,
  
  -- Estado y fechas
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'acknowledged')),
  published_at timestamptz,
  acknowledged_at timestamptz,
  notes text,
  
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLA 17: audit_log
-- ============================================================================
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  
  -- Actor
  actor_user_id uuid,
  actor_role text,
  
  -- Entidad afectada
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  
  -- Cambios
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLA 18: incidents
-- ============================================================================
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  lodger_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  accommodation_id uuid REFERENCES public.accommodations(id) ON DELETE SET NULL,
  
  -- Datos de la incidencia
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLA 19: lodger_room_assignments
-- ============================================================================
CREATE TABLE public.lodger_room_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  lodger_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  
  -- Periodo de asignación
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- VISTAS
-- ============================================================================
-- Vistas con security_invoker para heredar RLS de la tabla base
CREATE VIEW public.payer_entities_view 
WITH (security_invoker=true) AS
  SELECT * FROM public.entities WHERE type = 'payer';

CREATE VIEW public.owner_entities_view 
WITH (security_invoker=true) AS
  SELECT * FROM public.entities WHERE type = 'owner';

-- ============================================================================
-- CONSTRAINTS ADICIONALES
-- ============================================================================
-- Exactamente 1 payer por client_account
CREATE UNIQUE INDEX idx_entities_one_payer_per_account
  ON public.entities (client_account_id)
  WHERE type = 'payer';

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON TABLE public.plans_catalog IS 'Catálogo de planes de suscripción SaaS';
COMMENT ON TABLE public.client_accounts IS 'Cuentas de cliente (multi-tenant)';
COMMENT ON TABLE public.profiles IS 'Perfiles de usuario extendiendo auth.users';
COMMENT ON TABLE public.entities IS 'Entidades fiscales (payer/owner)';
COMMENT ON TABLE public.accommodations IS 'Alojamientos gestionados';
COMMENT ON TABLE public.rooms IS 'Habitaciones de alojamientos';
COMMENT ON TABLE public.lodgers IS 'Inquilinos';
COMMENT ON TABLE public.services_catalog IS 'Catálogo de servicios adicionales';
COMMENT ON TABLE public.accommodation_services IS 'Servicios habilitados por alojamiento';
COMMENT ON TABLE public.lodger_services IS 'Servicios consumidos por inquilinos';
COMMENT ON TABLE public.stripe_events IS 'Auditoría de webhooks de Stripe';
COMMENT ON TABLE public.energy_bills IS 'Facturas de energía (electricidad, agua, gas)';
COMMENT ON TABLE public.energy_readings IS 'Lecturas de contadores de energía';
COMMENT ON TABLE public.energy_settlements IS 'Liquidaciones de energía por habitación/inquilino';
COMMENT ON TABLE public.bulletins IS 'Boletines mensuales para inquilinos';
COMMENT ON TABLE public.audit_log IS 'Registro de auditoría de acciones';
COMMENT ON TABLE public.incidents IS 'Sistema de gestión de incidencias';
COMMENT ON TABLE public.lodger_room_assignments IS 'Historial de asignaciones inquilino-habitación';

-- Verificación
SELECT 'Schema creado exitosamente. 18 Tablas:' as status;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
