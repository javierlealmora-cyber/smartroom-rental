-- ============================================================================
-- BASELINE CERO: Políticas RLS (Row Level Security)
-- Descripción: Políticas de seguridad a nivel de fila para todas las tablas
-- ============================================================================

-- ============================================================================
-- TABLA: plans_catalog
-- ============================================================================
ALTER TABLE public.plans_catalog ENABLE ROW LEVEL SECURITY;

-- SELECT: cualquier usuario autenticado puede ver planes activos y visibles
CREATE POLICY "plans_catalog_select_public"
ON public.plans_catalog
FOR SELECT
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR
  (status = 'active' AND visible_for_new_accounts = true)
);

-- SELECT: usuarios anónimos pueden ver planes activos y visibles
CREATE POLICY "plans_catalog_select_anon"
ON public.plans_catalog FOR SELECT TO anon
USING (status = 'active' AND visible_for_new_accounts = true);

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
-- TABLA: client_accounts
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
-- TABLA: profiles
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: usuarios pueden ver su propio perfil
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- SELECT: admins y superadmins pueden ver todos los perfiles
CREATE POLICY "profiles_select_admins"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'superadmin', 'api')
  )
);

-- SELECT: admins pueden ver perfiles de su client_account
CREATE POLICY "profiles_select_by_client_account"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  get_my_role() = 'admin'
  AND client_account_id IS NOT NULL
  AND client_account_id = get_my_client_account_id()
);

-- UPDATE: usuarios pueden actualizar su propio perfil
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- UPDATE: admins y superadmins pueden actualizar perfiles
CREATE POLICY "profiles_update_admins"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'superadmin', 'api')
  )
);

-- UPDATE: admins pueden actualizar perfiles de su client_account
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

-- ============================================================================
-- TABLA: entities
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
-- TABLA: accommodations
-- ============================================================================
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;

-- SELECT: superadmin ve todo; admin ve alojamientos de su cuenta
CREATE POLICY "accommodations_select_policy"
ON public.accommodations
FOR SELECT
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR
  client_account_id = get_my_client_account_id()
);

-- INSERT: superadmin o admin de la misma cuenta
CREATE POLICY "accommodations_insert_policy"
ON public.accommodations
FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR
  client_account_id = get_my_client_account_id()
);

-- UPDATE: superadmin o admin de la misma cuenta
CREATE POLICY "accommodations_update_policy"
ON public.accommodations
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
CREATE POLICY "accommodations_delete_superadmin"
ON public.accommodations
FOR DELETE
TO authenticated
USING (get_my_role() = 'superadmin');

-- ============================================================================
-- TABLA: rooms
-- ============================================================================
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- SELECT: superadmin ve todo; admin ve habitaciones de su cuenta
CREATE POLICY "rooms_select_policy"
ON public.rooms
FOR SELECT
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR
  client_account_id = get_my_client_account_id()
);

-- INSERT: superadmin o admin de la misma cuenta
CREATE POLICY "rooms_insert_policy"
ON public.rooms
FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR
  client_account_id = get_my_client_account_id()
);

-- UPDATE: superadmin o admin de la misma cuenta
CREATE POLICY "rooms_update_policy"
ON public.rooms
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
CREATE POLICY "rooms_delete_superadmin"
ON public.rooms
FOR DELETE
TO authenticated
USING (get_my_role() = 'superadmin');

-- ============================================================================
-- TABLA: lodgers
-- ============================================================================
ALTER TABLE public.lodgers ENABLE ROW LEVEL SECURITY;

-- SELECT: superadmin ve todo; admin ve inquilinos de su cuenta
CREATE POLICY "lodgers_select_policy"
ON public.lodgers
FOR SELECT
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR
  client_account_id = get_my_client_account_id()
);

-- INSERT: superadmin o admin de la misma cuenta
CREATE POLICY "lodgers_insert_policy"
ON public.lodgers
FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR
  client_account_id = get_my_client_account_id()
);

-- UPDATE: superadmin o admin de la misma cuenta
CREATE POLICY "lodgers_update_policy"
ON public.lodgers
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
CREATE POLICY "lodgers_delete_superadmin"
ON public.lodgers
FOR DELETE
TO authenticated
USING (get_my_role() = 'superadmin');

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
  OR
  client_account_id = get_my_client_account_id()
);

-- INSERT: superadmin o admin de su tenant
CREATE POLICY "services_catalog_insert_policy"
ON public.services_catalog
FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR
  (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- UPDATE: superadmin o admin de su tenant
CREATE POLICY "services_catalog_update_policy"
ON public.services_catalog
FOR UPDATE
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR
  (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
)
WITH CHECK (
  get_my_role() = 'superadmin'
  OR
  (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- DELETE: superadmin o admin de su tenant
CREATE POLICY "services_catalog_delete_policy"
ON public.services_catalog
FOR DELETE
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR
  (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
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
  OR
  client_account_id = get_my_client_account_id()
);

-- INSERT: superadmin o admin de su tenant
CREATE POLICY "accommodation_services_insert_policy"
ON public.accommodation_services
FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR
  (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- UPDATE: superadmin o admin de su tenant
CREATE POLICY "accommodation_services_update_policy"
ON public.accommodation_services
FOR UPDATE
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR
  (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
)
WITH CHECK (
  get_my_role() = 'superadmin'
  OR
  (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- DELETE: superadmin o admin de su tenant
CREATE POLICY "accommodation_services_delete_policy"
ON public.accommodation_services
FOR DELETE
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR
  (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- ============================================================================
-- TABLA: lodger_services
-- ============================================================================
ALTER TABLE public.lodger_services ENABLE ROW LEVEL SECURITY;

-- SELECT: superadmin ve todo, admin ve su tenant
CREATE POLICY "lodger_services_select_policy"
ON public.lodger_services
FOR SELECT
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR
  client_account_id = get_my_client_account_id()
);

-- INSERT: superadmin o admin de su tenant
CREATE POLICY "lodger_services_insert_policy"
ON public.lodger_services
FOR INSERT
TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR
  (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- UPDATE: superadmin o admin de su tenant
CREATE POLICY "lodger_services_update_policy"
ON public.lodger_services
FOR UPDATE
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR
  (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
)
WITH CHECK (
  get_my_role() = 'superadmin'
  OR
  (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- DELETE: superadmin o admin de su tenant
CREATE POLICY "lodger_services_delete_policy"
ON public.lodger_services
FOR DELETE
TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR
  (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- ============================================================================
-- TABLA: stripe_events
-- ============================================================================
-- Solo service_role puede acceder (sin políticas = denegado a todos los usuarios)
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- No se crean políticas para stripe_events
-- Solo service_role (backend) puede acceder a esta tabla

-- ============================================================================
-- TABLA: energy_bills
-- ============================================================================
ALTER TABLE public.energy_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "energy_bills_select_policy" ON public.energy_bills FOR SELECT TO authenticated
USING (get_my_role() = 'superadmin' OR client_account_id = get_my_client_account_id());

CREATE POLICY "energy_bills_insert_policy" ON public.energy_bills FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'superadmin' OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id()));

CREATE POLICY "energy_bills_update_policy" ON public.energy_bills FOR UPDATE TO authenticated
USING (get_my_role() = 'superadmin' OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id()))
WITH CHECK (get_my_role() = 'superadmin' OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id()));

CREATE POLICY "energy_bills_delete_policy" ON public.energy_bills FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin' OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id()));

-- ============================================================================
-- TABLA: energy_readings
-- ============================================================================
ALTER TABLE public.energy_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "energy_readings_select_policy" ON public.energy_readings FOR SELECT TO authenticated
USING (get_my_role() = 'superadmin' OR client_account_id = get_my_client_account_id());

CREATE POLICY "energy_readings_insert_policy" ON public.energy_readings FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'superadmin' OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id()));

CREATE POLICY "energy_readings_update_policy" ON public.energy_readings FOR UPDATE TO authenticated
USING (get_my_role() = 'superadmin' OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id()));

CREATE POLICY "energy_readings_delete_policy" ON public.energy_readings FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin' OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id()));

-- ============================================================================
-- TABLA: energy_settlements
-- ============================================================================
ALTER TABLE public.energy_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "energy_settlements_select_policy" ON public.energy_settlements FOR SELECT TO authenticated
USING (get_my_role() = 'superadmin' OR client_account_id = get_my_client_account_id());

CREATE POLICY "energy_settlements_insert_policy" ON public.energy_settlements FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'superadmin' OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id()));

CREATE POLICY "energy_settlements_delete_policy" ON public.energy_settlements FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- ============================================================================
-- TABLA: bulletins
-- ============================================================================
ALTER TABLE public.bulletins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bulletins_select_policy" ON public.bulletins FOR SELECT TO authenticated
USING (get_my_role() = 'superadmin' OR client_account_id = get_my_client_account_id());

CREATE POLICY "bulletins_insert_policy" ON public.bulletins FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'superadmin' OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id()));

CREATE POLICY "bulletins_update_policy" ON public.bulletins FOR UPDATE TO authenticated
USING (get_my_role() = 'superadmin' OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id()))
WITH CHECK (get_my_role() = 'superadmin' OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id()));

CREATE POLICY "bulletins_delete_policy" ON public.bulletins FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- ============================================================================
-- TABLA: audit_log
-- ============================================================================
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_policy" ON public.audit_log FOR SELECT TO authenticated
USING (get_my_role() = 'superadmin' OR client_account_id = get_my_client_account_id());

-- ============================================================================
-- TABLA: incidents
-- ============================================================================
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incidents_select_policy" ON public.incidents FOR SELECT TO authenticated
USING (get_my_role() = 'superadmin' OR client_account_id = get_my_client_account_id());

CREATE POLICY "incidents_insert_policy" ON public.incidents FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'superadmin' OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id()));

CREATE POLICY "incidents_update_policy" ON public.incidents FOR UPDATE TO authenticated
USING (get_my_role() = 'superadmin' OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id()))
WITH CHECK (get_my_role() = 'superadmin' OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id()));

CREATE POLICY "incidents_delete_policy" ON public.incidents FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- ============================================================================
-- TABLA: lodger_room_assignments
-- ============================================================================
ALTER TABLE public.lodger_room_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lodger_room_assignments_select_policy" ON public.lodger_room_assignments FOR SELECT TO authenticated
USING (get_my_role() = 'superadmin' OR client_account_id = get_my_client_account_id());

CREATE POLICY "lodger_room_assignments_insert_policy" ON public.lodger_room_assignments FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'superadmin' OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id()));

CREATE POLICY "lodger_room_assignments_update_policy" ON public.lodger_room_assignments FOR UPDATE TO authenticated
USING (get_my_role() = 'superadmin' OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id()))
WITH CHECK (get_my_role() = 'superadmin' OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id()));

CREATE POLICY "lodger_room_assignments_delete_policy" ON public.lodger_room_assignments FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- ============================================================================
-- COMENTARIOS
-- ============================================================================
COMMENT ON POLICY "plans_catalog_select_public" ON public.plans_catalog IS 
'Usuarios autenticados ven planes activos y visibles, superadmin ve todos';

COMMENT ON POLICY "client_accounts_select_policy" ON public.client_accounts IS 
'Superadmin ve todas las cuentas, usuarios ven solo su cuenta';

COMMENT ON POLICY "entities_select_policy" ON public.entities IS 
'Superadmin ve todas las entidades, admin ve entidades de su cuenta';

-- Verificación
SELECT 'Políticas RLS creadas exitosamente' as status;
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
