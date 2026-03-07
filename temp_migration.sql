-- ============================================================================
-- MIGRATION CONSOLIDADA: Eliminar company_id y tabla companies
-- ============================================================================

-- PASO 1: Eliminar políticas RLS que dependen de company_id en profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage company profiles" ON public.profiles;

-- PASO 2: Eliminar índices relacionados con company_id en profiles
DROP INDEX IF EXISTS public.idx_profiles_company_id;
DROP INDEX IF EXISTS public.idx_profiles_company;

-- PASO 3: Eliminar foreign key constraint en profiles
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_company_id_fkey;

-- PASO 4: Eliminar columna company_id de profiles
ALTER TABLE IF EXISTS public.profiles DROP COLUMN IF EXISTS company_id;

-- PASO 5: Eliminar políticas RLS de client_accounts que usan company_id
DROP POLICY IF EXISTS "client_accounts_select_policy" ON public.client_accounts;
DROP POLICY IF EXISTS "client_accounts_insert_policy" ON public.client_accounts;
DROP POLICY IF EXISTS "client_accounts_update_policy" ON public.client_accounts;

-- PASO 6: Eliminar foreign key en client_accounts
ALTER TABLE IF EXISTS public.client_accounts DROP CONSTRAINT IF EXISTS client_accounts_company_id_fkey;

-- PASO 7: Eliminar columna company_id de client_accounts
ALTER TABLE IF EXISTS public.client_accounts DROP COLUMN IF EXISTS company_id;

-- PASO 8: Eliminar tabla companies
DROP TABLE IF EXISTS public.companies CASCADE;

-- PASO 9: Recrear políticas RLS para profiles (sin company_id)
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'superadmin', 'api')
    )
  );

CREATE POLICY "Admins can update profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'superadmin', 'api')
    )
  );

-- PASO 10: Recrear políticas RLS para client_accounts (sin company_id)
CREATE POLICY "client_accounts_select_policy"
  ON public.client_accounts
  FOR SELECT
  USING (
    get_my_role() = 'superadmin'
    OR id = get_my_client_account_id()
  );

CREATE POLICY "client_accounts_insert_policy"
  ON public.client_accounts
  FOR INSERT
  WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "client_accounts_update_policy"
  ON public.client_accounts
  FOR UPDATE
  USING (
    get_my_role() = 'superadmin'
    OR id = get_my_client_account_id()
  );

-- PASO 11: Marcar migraciones como aplicadas
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES 
  ('20260305200000', 'remove_company_id_from_profiles', ARRAY['Applied manually']),
  ('20260305200001', 'remove_companies_table', ARRAY['Applied manually'])
ON CONFLICT (version) DO NOTHING;
