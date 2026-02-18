-- ============================================================================
-- MIGRACION: Crear tabla entities + vistas (payer/owner)
-- Fecha: 2026-02-11
-- Descripcion: Tabla unica de entidades con type=payer|owner.
--              Restriccion: exactamente 1 payer por client_account.
--              Vistas SQL para facilitar consultas por tipo.
--              NO afecta tablas legacy (companies, profiles).
-- ============================================================================

-- ============================================================================
-- PASO 1: Crear tabla entities
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
  last_name2 text,
  tax_id text,
  billing_email text,
  phone text,

  -- Direccion
  country text DEFAULT 'Espana',
  province text,
  city text,
  zip text,
  street text,
  street_number text,
  address_extra text,

  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PASO 2: Restriccion — exactamente 1 payer por client_account
-- ============================================================================
CREATE UNIQUE INDEX idx_entities_one_payer_per_account
  ON public.entities (client_account_id)
  WHERE type = 'payer';

-- ============================================================================
-- PASO 3: Vistas para facilitar consultas
-- ============================================================================
CREATE VIEW public.payer_entities_view AS
  SELECT * FROM public.entities WHERE type = 'payer';

CREATE VIEW public.owner_entities_view AS
  SELECT * FROM public.entities WHERE type = 'owner';

-- ============================================================================
-- PASO 4: Trigger updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS update_entities_updated_at ON public.entities;

CREATE TRIGGER update_entities_updated_at
  BEFORE UPDATE ON public.entities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PASO 5: Indices
-- ============================================================================
CREATE INDEX idx_entities_client_account ON public.entities (client_account_id);
CREATE INDEX idx_entities_type ON public.entities (type);
CREATE INDEX idx_entities_client_type ON public.entities (client_account_id, type);
