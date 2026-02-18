-- ============================================================================
-- MIGRACION: Adaptar plans_catalog + client_accounts + stripe_events
-- Fecha: 2026-02-13
-- Descripcion: Anadir campos para web comercial publica (is_featured, features)
--              y tabla auditoria Stripe (stripe_events). Agregar RLS anon a plans.
-- ============================================================================

-- ============================================================================
-- PASO 1: plans_catalog — anadir is_featured + features jsonb
-- ============================================================================
ALTER TABLE public.plans_catalog
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

ALTER TABLE public.plans_catalog
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ============================================================================
-- PASO 2: client_accounts — anadir contact_email + contact_phone
-- ============================================================================
ALTER TABLE public.client_accounts
  ADD COLUMN IF NOT EXISTS contact_email text;

ALTER TABLE public.client_accounts
  ADD COLUMN IF NOT EXISTS contact_phone text;

-- ============================================================================
-- PASO 3: Seed data — marcar investor como featured + poblar features
-- ============================================================================
UPDATE public.plans_catalog
SET is_featured = true
WHERE code = 'investor';

UPDATE public.plans_catalog
SET features = '["Hasta 3 alojamientos","Hasta 20 habitaciones","1 usuario admin","Encuestas incluidas","Soporte email"]'::jsonb
WHERE code = 'basic';

UPDATE public.plans_catalog
SET features = '["Hasta 8 alojamientos","Hasta 60 habitaciones","2 usuarios admin","Encuestas + Lavanderia + Tickets","Branding personalizado","Soporte prioritario"]'::jsonb
WHERE code = 'investor';

UPDATE public.plans_catalog
SET features = '["Alojamientos ilimitados","Habitaciones ilimitadas","3 usuarios admin","Todos los servicios incluidos","Branding completo","Informes avanzados","Soporte premium"]'::jsonb
WHERE code = 'business';

UPDATE public.plans_catalog
SET features = '["Todo ilimitado","Gestion multi-empresa","Cambio de propietarios","Todos los servicios","API avanzada","Soporte dedicado"]'::jsonb
WHERE code = 'agency';

-- ============================================================================
-- PASO 4: RLS — permitir SELECT anonimo para planes visibles (web publica)
-- ============================================================================
CREATE POLICY "plans_catalog_select_anon"
ON public.plans_catalog FOR SELECT TO anon
USING (status = 'active' AND visible_for_new_accounts = true);

-- ============================================================================
-- PASO 5: Crear tabla stripe_events (auditoria webhooks)
-- Solo accesible via service_role (sin policies = denegado para todos los demas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Indice para busqueda por stripe_event_id (idempotencia)
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id
ON public.stripe_events (stripe_event_id);
