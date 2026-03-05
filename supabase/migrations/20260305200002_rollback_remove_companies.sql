-- ============================================================================
-- ROLLBACK MIGRATION: Restaurar tabla companies y company_id
-- Fecha: 2026-03-05
-- Descripción: Revierte las migraciones 20260305200000 y 20260305200001
--              Restaura tabla companies y columna company_id en profiles y client_accounts
-- ============================================================================

-- ============================================================================
-- PASO 1: Recrear tabla companies
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tax_id text,
  email text,
  phone text,
  address text,
  city text,
  state text,
  country text DEFAULT 'ES',
  postal_code text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- PASO 2: Recrear company_id en profiles
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN company_id uuid REFERENCES public.companies(id);
  END IF;
END $$;

-- ============================================================================
-- PASO 3: Recrear company_id en client_accounts
-- ============================================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_accounts' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.client_accounts ADD COLUMN company_id uuid REFERENCES public.companies(id);
  END IF;
END $$;

-- ============================================================================
-- PASO 4: Recrear índices
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_client_accounts_company_id ON public.client_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_tax_id ON public.companies(tax_id);

-- ============================================================================
-- PASO 5: Recrear trigger de updated_at para companies
-- ============================================================================
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PASO 6: Habilitar RLS en companies
-- ============================================================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 7: Recrear políticas RLS de companies
-- ============================================================================
DROP POLICY IF EXISTS "Companies are viewable by members" ON public.companies;
CREATE POLICY "Companies are viewable by members"
  ON public.companies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.company_id = companies.id
      AND p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Companies are editable by admins" ON public.companies;
CREATE POLICY "Companies are editable by admins"
  ON public.companies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.company_id = companies.id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'superadmin')
    )
  );

-- ============================================================================
-- PASO 8: Actualizar políticas RLS de profiles para incluir company_id
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

CREATE POLICY "Users can view profiles in their company"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id 
    OR company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage company profiles"
  ON public.profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'superadmin')
      AND p.company_id = profiles.company_id
    )
  );

-- ============================================================================
-- PASO 9: Comentarios de documentación
-- ============================================================================
COMMENT ON TABLE public.companies IS 'Empresas - Restaurada en rollback 20260305200002';
COMMENT ON COLUMN public.profiles.company_id IS 'Relación con empresa - Restaurada en rollback';
COMMENT ON COLUMN public.client_accounts.company_id IS 'Relación con empresa - Restaurada en rollback';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
    RAISE EXCEPTION 'ERROR: La tabla companies no fue creada';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'company_id'
  ) THEN
    RAISE EXCEPTION 'ERROR: La columna company_id no fue agregada a profiles';
  END IF;
  
  RAISE NOTICE 'OK: Rollback completado exitosamente';
END $$;
