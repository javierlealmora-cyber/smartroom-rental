-- ============================================================================
-- MIGRACION: RLS para tablas nuevas (plans_catalog, client_accounts, entities)
-- Fecha: 2026-02-11
-- Descripcion: Politicas RLS siguiendo el mismo patron de helpers SECURITY DEFINER.
--              NO modifica politicas existentes de companies/profiles legacy.
-- ============================================================================

-- ============================================================================
-- PASO 1: Helper function — get_my_client_account_id()
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_client_account_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT client_account_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_client_account_id() TO authenticated;

-- ============================================================================
-- PASO 2: RLS para plans_catalog
-- ============================================================================
ALTER TABLE public.plans_catalog ENABLE ROW LEVEL SECURITY;

-- SELECT: cualquier usuario autenticado puede ver planes activos y visibles
CREATE POLICY "plans_catalog_select_public"
ON public.plans_catalog
FOR SELECT
TO authenticated
USING (
  -- Superadmin ve todos los planes (incluidos draft, deprecated, etc.)
  get_my_role() = 'superadmin'
  OR
  -- Usuarios normales solo ven planes activos y visibles
  (status = 'active' AND visible_for_new_accounts = true)
);

-- INSERT/UPDATE/DELETE: solo superadmin
CREATE POLICY "plans_catalog_insert_superadmin"
ON public.plans_catalog
FOR INSERT
TO authenticated
WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "plans_catalog_update_superadmin"
ON public.plans_catalog
FOR UPDATE
TO authenticated
USING (get_my_role() = 'superadmin')
WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "plans_catalog_delete_superadmin"
ON public.plans_catalog
FOR DELETE
TO authenticated
USING (get_my_role() = 'superadmin');

-- ============================================================================
-- PASO 3: RLS para client_accounts
-- ============================================================================
ALTER TABLE public.client_accounts ENABLE ROW LEVEL SECURITY;

-- SELECT: superadmin ve todo; admin/tenant ven solo su cuenta
CREATE POLICY "client_accounts_select_policy"
ON public.client_accounts
FOR SELECT
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR
  id = get_my_client_account_id()
);

-- INSERT: solo superadmin (la creacion por autoregistro va via Edge Function con service_role)
CREATE POLICY "client_accounts_insert_superadmin"
ON public.client_accounts
FOR INSERT
TO authenticated
WITH CHECK (get_my_role() = 'superadmin');

-- UPDATE: superadmin puede todas; admin solo la suya
CREATE POLICY "client_accounts_update_policy"
ON public.client_accounts
FOR UPDATE
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR
  (get_my_role() = 'admin' AND id = get_my_client_account_id())
)
WITH CHECK (
  get_my_role() = 'superadmin'
  OR
  (get_my_role() = 'admin' AND id = get_my_client_account_id())
);

-- DELETE: solo superadmin
CREATE POLICY "client_accounts_delete_superadmin"
ON public.client_accounts
FOR DELETE
TO authenticated
USING (get_my_role() = 'superadmin');

-- ============================================================================
-- PASO 4: RLS para entities
-- ============================================================================
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

-- SELECT: superadmin ve todo; admin ve entidades de su cuenta
CREATE POLICY "entities_select_policy"
ON public.entities
FOR SELECT
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR
  client_account_id = get_my_client_account_id()
);

-- INSERT: superadmin o admin de la misma cuenta
CREATE POLICY "entities_insert_policy"
ON public.entities
FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR
  client_account_id = get_my_client_account_id()
);

-- UPDATE: superadmin o admin de la misma cuenta
CREATE POLICY "entities_update_policy"
ON public.entities
FOR UPDATE
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR
  client_account_id = get_my_client_account_id()
)
WITH CHECK (
  get_my_role() = 'superadmin'
  OR
  client_account_id = get_my_client_account_id()
);

-- DELETE: solo superadmin
CREATE POLICY "entities_delete_superadmin"
ON public.entities
FOR DELETE
TO authenticated
USING (get_my_role() = 'superadmin');

-- ============================================================================
-- PASO 5: Politica adicional en profiles para client_account_id
-- (Sin romper las politicas legacy basadas en company_id)
-- ============================================================================
-- Ya existe profiles_select_policy, profiles_update_policy, etc.
-- Estas ya permiten:
--   - Superadmin ver/editar todo
--   - Admin ver/editar perfiles de su company_id
--   - Usuario ver/editar su propio perfil
--
-- Para el nuevo sistema, los admins de client_account tambien necesitan ver
-- perfiles de su client_account. Creamos una politica adicional (permissive OR).

CREATE POLICY "profiles_select_by_client_account"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  get_my_role() = 'admin'
  AND client_account_id IS NOT NULL
  AND client_account_id = get_my_client_account_id()
);

CREATE POLICY "profiles_update_by_client_account"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  get_my_role() = 'admin'
  AND client_account_id IS NOT NULL
  AND client_account_id = get_my_client_account_id()
)
WITH CHECK (
  get_my_role() = 'admin'
  AND client_account_id IS NOT NULL
  AND client_account_id = get_my_client_account_id()
);
