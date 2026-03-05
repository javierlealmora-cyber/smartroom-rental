-- ============================================================================
-- MIGRATION: Eliminar tabla companies
-- Fecha: 2026-03-05
-- Descripción: Elimina la tabla companies y todas sus dependencias
--              (índices, triggers, políticas RLS, foreign keys)
-- ============================================================================

-- ============================================================================
-- PASO 1: Eliminar foreign keys que referencian companies
-- ============================================================================
-- Eliminar FK de client_accounts si existe
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'client_accounts_company_id_fkey' 
    AND table_name = 'client_accounts'
  ) THEN
    ALTER TABLE public.client_accounts DROP CONSTRAINT client_accounts_company_id_fkey;
  END IF;
END $$;

-- Eliminar cualquier otra FK que pueda referenciar companies
DO $$ 
DECLARE
  fk_record RECORD;
BEGIN
  FOR fk_record IN 
    SELECT 
      tc.table_name, 
      tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name = 'companies' 
    AND tc.constraint_type = 'FOREIGN KEY'
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', 
      fk_record.table_name, 
      fk_record.constraint_name
    );
    RAISE NOTICE 'Eliminado FK: %.%', fk_record.table_name, fk_record.constraint_name;
  END LOOP;
END $$;

-- ============================================================================
-- PASO 2: Eliminar políticas RLS de companies
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Superadmins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Companies are viewable by members" ON public.companies;
DROP POLICY IF EXISTS "Companies are editable by admins" ON public.companies;

-- ============================================================================
-- PASO 3: Eliminar triggers de companies
-- ============================================================================
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
DROP TRIGGER IF EXISTS companies_updated_at_trigger ON public.companies;

-- ============================================================================
-- PASO 4: Eliminar índices de companies
-- ============================================================================
DROP INDEX IF EXISTS public.idx_companies_status;
DROP INDEX IF EXISTS public.idx_companies_tax_id;
DROP INDEX IF EXISTS public.idx_companies_email;
DROP INDEX IF EXISTS public.idx_companies_created_at;

-- ============================================================================
-- PASO 5: Eliminar tabla companies
-- ============================================================================
DROP TABLE IF EXISTS public.companies CASCADE;

-- ============================================================================
-- PASO 6: Actualizar client_accounts para eliminar company_id
-- ============================================================================
-- Eliminar índice de company_id en client_accounts
DROP INDEX IF EXISTS public.idx_client_accounts_company_id;
DROP INDEX IF EXISTS public.idx_client_accounts_company;

-- Eliminar columna company_id de client_accounts
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_accounts' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.client_accounts DROP COLUMN company_id;
  END IF;
END $$;

-- ============================================================================
-- PASO 7: Recrear políticas RLS de client_accounts sin company_id
-- ============================================================================
-- Habilitar RLS
ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;

-- Política: Superadmins pueden ver todas las cuentas
DROP POLICY IF EXISTS "Superadmins can view all client accounts" ON public.client_accounts;
CREATE POLICY "Superadmins can view all client accounts"
  ON public.client_accounts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'superadmin'
    )
  );

-- Política: Admins pueden ver cuentas de su client_account
DROP POLICY IF EXISTS "Admins can view their client accounts" ON public.client_accounts;
CREATE POLICY "Admins can view their client accounts"
  ON public.client_accounts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'api', 'agent', 'viewer')
      AND p.client_account_id = client_accounts.id
    )
  );

-- Política: Superadmins pueden actualizar todas las cuentas
DROP POLICY IF EXISTS "Superadmins can update client accounts" ON public.client_accounts;
CREATE POLICY "Superadmins can update client accounts"
  ON public.client_accounts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'superadmin'
    )
  );

-- Política: Admins pueden actualizar su propia cuenta
DROP POLICY IF EXISTS "Admins can update their client account" ON public.client_accounts;
CREATE POLICY "Admins can update their client account"
  ON public.client_accounts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'api')
      AND p.client_account_id = client_accounts.id
    )
  );

-- ============================================================================
-- PASO 8: Comentarios de documentación
-- ============================================================================
COMMENT ON TABLE public.client_accounts IS 'Cuentas de cliente - company_id eliminado, companies table eliminada en migración 20260305200001';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- Verificar que la tabla companies fue eliminada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'companies'
  ) THEN
    RAISE EXCEPTION 'ERROR: La tabla companies todavía existe';
  ELSE
    RAISE NOTICE 'OK: La tabla companies fue eliminada exitosamente';
  END IF;
  
  -- Verificar que company_id fue eliminado de client_accounts
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'client_accounts' 
    AND column_name = 'company_id'
  ) THEN
    RAISE EXCEPTION 'ERROR: La columna company_id todavía existe en client_accounts';
  ELSE
    RAISE NOTICE 'OK: La columna company_id fue eliminada de client_accounts';
  END IF;
END $$;
