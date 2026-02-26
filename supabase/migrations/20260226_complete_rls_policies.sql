-- ============================================================================
-- MIGRACION: Completar RLS para tablas faltantes
-- Fecha: 2026-02-26
-- Descripcion: Añadir RLS a services_catalog, accommodation_services, 
--              lodger_services y stripe_events
-- ============================================================================

-- ============================================================================
-- TABLA: services_catalog
-- ============================================================================
ALTER TABLE public.services_catalog ENABLE ROW LEVEL SECURITY;

-- SELECT: superadmin ve todo, admin ve su tenant
CREATE POLICY "services_catalog_select_policy"
ON public.services_catalog
FOR SELECT
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

-- INSERT: superadmin o admin de su tenant
CREATE POLICY "services_catalog_insert_policy"
ON public.services_catalog
FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (
    get_my_role() IN ('admin', 'api')
    AND client_account_id = get_my_client_account_id()
  )
);

-- UPDATE: superadmin o admin de su tenant
CREATE POLICY "services_catalog_update_policy"
ON public.services_catalog
FOR UPDATE
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (
    get_my_role() IN ('admin', 'api')
    AND client_account_id = get_my_client_account_id()
  )
)
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (
    get_my_role() IN ('admin', 'api')
    AND client_account_id = get_my_client_account_id()
  )
);

-- DELETE: superadmin o admin de su tenant
CREATE POLICY "services_catalog_delete_policy"
ON public.services_catalog
FOR DELETE
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (
    get_my_role() IN ('admin', 'api')
    AND client_account_id = get_my_client_account_id()
  )
);

-- ============================================================================
-- TABLA: accommodation_services
-- ============================================================================
ALTER TABLE public.accommodation_services ENABLE ROW LEVEL SECURITY;

-- SELECT: superadmin ve todo, admin ve su tenant
CREATE POLICY "accommodation_services_select_policy"
ON public.accommodation_services
FOR SELECT
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

-- INSERT: superadmin o admin de su tenant
CREATE POLICY "accommodation_services_insert_policy"
ON public.accommodation_services
FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (
    get_my_role() IN ('admin', 'api')
    AND client_account_id = get_my_client_account_id()
  )
);

-- UPDATE: superadmin o admin de su tenant
CREATE POLICY "accommodation_services_update_policy"
ON public.accommodation_services
FOR UPDATE
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (
    get_my_role() IN ('admin', 'api')
    AND client_account_id = get_my_client_account_id()
  )
)
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (
    get_my_role() IN ('admin', 'api')
    AND client_account_id = get_my_client_account_id()
  )
);

-- DELETE: superadmin o admin de su tenant
CREATE POLICY "accommodation_services_delete_policy"
ON public.accommodation_services
FOR DELETE
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (
    get_my_role() IN ('admin', 'api')
    AND client_account_id = get_my_client_account_id()
  )
);

-- ============================================================================
-- TABLA: lodger_services
-- ============================================================================
ALTER TABLE public.lodger_services ENABLE ROW LEVEL SECURITY;

-- SELECT: superadmin ve todo, admin ve su tenant, lodger ve sus propios servicios
CREATE POLICY "lodger_services_select_policy"
ON public.lodger_services
FOR SELECT
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
  OR (
    -- Lodger puede ver sus propios servicios
    get_my_role() = 'lodger'
    AND lodger_id IN (
      SELECT id FROM lodgers WHERE profile_id = auth.uid()
    )
  )
);

-- INSERT: superadmin o admin de su tenant
CREATE POLICY "lodger_services_insert_policy"
ON public.lodger_services
FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (
    get_my_role() IN ('admin', 'api')
    AND client_account_id = get_my_client_account_id()
  )
);

-- UPDATE: superadmin o admin de su tenant
CREATE POLICY "lodger_services_update_policy"
ON public.lodger_services
FOR UPDATE
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (
    get_my_role() IN ('admin', 'api')
    AND client_account_id = get_my_client_account_id()
  )
)
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (
    get_my_role() IN ('admin', 'api')
    AND client_account_id = get_my_client_account_id()
  )
);

-- DELETE: superadmin o admin de su tenant
CREATE POLICY "lodger_services_delete_policy"
ON public.lodger_services
FOR DELETE
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (
    get_my_role() IN ('admin', 'api')
    AND client_account_id = get_my_client_account_id()
  )
);

-- ============================================================================
-- TABLA: stripe_events
-- ============================================================================
-- Solo service_role puede acceder (sin políticas = denegado a todos los usuarios)
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- No se crean políticas para stripe_events
-- Solo service_role (backend) puede acceder a esta tabla
-- Los usuarios autenticados NO tienen acceso

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON POLICY "services_catalog_select_policy" ON public.services_catalog IS 
'Superadmin ve todo, admin ve servicios de su tenant';

COMMENT ON POLICY "accommodation_services_select_policy" ON public.accommodation_services IS 
'Superadmin ve todo, admin ve servicios de alojamientos de su tenant';

COMMENT ON POLICY "lodger_services_select_policy" ON public.lodger_services IS 
'Superadmin ve todo, admin ve su tenant, lodger ve sus propios servicios';

COMMENT ON TABLE public.stripe_events IS 
'Solo accesible por service_role. RLS habilitado sin políticas = denegado a usuarios autenticados';
