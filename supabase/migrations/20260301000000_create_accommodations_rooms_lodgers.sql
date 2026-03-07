-- ============================================================================
-- MIGRATION: Crear tablas accommodations, rooms, lodgers
-- Fecha: 2026-03-01
-- Descripcion: Tablas core para gestión de alojamientos e inquilinos
-- ============================================================================

-- ============================================================================
-- PASO 1: Crear tabla accommodations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.accommodations (
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
-- PASO 2: Crear tabla rooms
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rooms (
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
-- PASO 3: Crear tabla lodgers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.lodgers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id uuid NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  
  -- Datos personales
  full_name text NOT NULL,
  first_name text,
  last_name1 text,
  last_name2 text,
  email text NOT NULL,
  phone text,
  document_id text,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  
  -- Estado
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'inactive', 'blocked')),
  notes text,
  
  -- Auditoria
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- PASO 4: Indices
-- ============================================================================
-- Accommodations
CREATE INDEX IF NOT EXISTS idx_accommodations_client_account ON public.accommodations (client_account_id);
CREATE INDEX IF NOT EXISTS idx_accommodations_owner ON public.accommodations (owner_entity_id);
CREATE INDEX IF NOT EXISTS idx_accommodations_status ON public.accommodations (status);

-- Rooms
CREATE INDEX IF NOT EXISTS idx_rooms_accommodation ON public.rooms (accommodation_id);
CREATE INDEX IF NOT EXISTS idx_rooms_client_account ON public.rooms (client_account_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms (status);

-- Lodgers
CREATE INDEX IF NOT EXISTS idx_lodgers_client_account ON public.lodgers (client_account_id);
CREATE INDEX IF NOT EXISTS idx_lodgers_email ON public.lodgers (email);
CREATE INDEX IF NOT EXISTS idx_lodgers_status ON public.lodgers (status);

-- ============================================================================
-- PASO 5: Triggers updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS update_accommodations_updated_at ON public.accommodations;
CREATE TRIGGER update_accommodations_updated_at
  BEFORE UPDATE ON public.accommodations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_lodgers_updated_at ON public.lodgers;
CREATE TRIGGER update_lodgers_updated_at
  BEFORE UPDATE ON public.lodgers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
