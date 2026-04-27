-- ============================================================================
-- Migración: SmartAccessLock — Row Level Security para todas las tablas SAL
-- Fecha: 2026-04-12
-- REQ: REQ-014 (SmartAccessLock)
--
-- Habilita RLS y crea políticas para las 16 tablas SAL creadas en
-- 000001 (catálogo SaaS) + 000002 (core) + 000003 (acceso).
--
-- Tabla de permisos definitiva (agente = personal operativo):
--   INSERT/UPDATE lock_integrations          → admin/superadmin
--   INSERT/UPDATE lock_placements            → admin/superadmin
--   INSERT/UPDATE lock_access_groups         → admin/superadmin
--   INSERT/UPDATE lock_access_group_scopes   → admin/superadmin
--   INSERT/UPDATE lock_access_actors         → admin/agent/superadmin
--   INSERT/UPDATE lock_access_group_members  → admin/agent/superadmin
--   INSERT lock_access_grants (manual)       → admin/superadmin
--   UPDATE lock_access_grants (revocar)      → admin/superadmin
--   locks / lock_credentials / lock_records  → solo vía EF (service_role)
--   saas_services / plans / features         → solo superadmin
--
-- NOTA: 000006 hace DROP IF EXISTS + RECREATE de algunas políticas para
-- corregir/endurecer reglas post-diseño. Los nombres aquí son los mismos
-- que en 000006 para que el DROP IF EXISTS sea efectivo.
--
-- Requiere: 20260412000001, 000002, 000003 ejecutadas
-- ============================================================================

-- ─── FUNCIONES HELPER (deben existir en el baseline) ─────────────────────────
-- get_my_role()            → text   (rol del perfil del usuario autenticado)
-- get_my_client_account_id() → uuid  (client_account_id del perfil autenticado)
-- Se asumen existentes desde el schema baseline.

-- ─── 1. CATÁLOGO SAAS ────────────────────────────────────────────────────────

ALTER TABLE public.saas_services            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_service_plans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_service_features    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_service_subscriptions ENABLE ROW LEVEL SECURITY;

-- saas_services SELECT
-- NOTA: corregido en 000006 para excluir servicios en draft.
-- El nombre de la policy es el mismo que 000006 usa en DROP IF EXISTS.
CREATE POLICY "saas_services_select_policy"
ON public.saas_services FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (status = 'active' AND visible_in_catalog = true)
);

-- saas_services INSERT / UPDATE / DELETE → solo superadmin
CREATE POLICY "saas_services_insert_policy"
ON public.saas_services FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "saas_services_update_policy"
ON public.saas_services FOR UPDATE TO authenticated
USING (get_my_role() = 'superadmin');

CREATE POLICY "saas_services_delete_policy"
ON public.saas_services FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- saas_service_plans SELECT
CREATE POLICY "saas_service_plans_select_policy"
ON public.saas_service_plans FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR EXISTS (
    SELECT 1 FROM public.saas_services s
    WHERE s.id = saas_service_id
      AND s.status = 'active'
      AND s.visible_in_catalog = true
  )
);

CREATE POLICY "saas_service_plans_insert_policy"
ON public.saas_service_plans FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "saas_service_plans_update_policy"
ON public.saas_service_plans FOR UPDATE TO authenticated
USING (get_my_role() = 'superadmin');

CREATE POLICY "saas_service_plans_delete_policy"
ON public.saas_service_plans FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- saas_service_features SELECT
CREATE POLICY "saas_service_features_select_policy"
ON public.saas_service_features FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR EXISTS (
    SELECT 1 FROM public.saas_service_plans p
    JOIN public.saas_services s ON s.id = p.saas_service_id
    WHERE p.id = saas_service_plan_id
      AND s.status = 'active'
      AND s.visible_in_catalog = true
  )
);

CREATE POLICY "saas_service_features_insert_policy"
ON public.saas_service_features FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "saas_service_features_update_policy"
ON public.saas_service_features FOR UPDATE TO authenticated
USING (get_my_role() = 'superadmin');

CREATE POLICY "saas_service_features_delete_policy"
ON public.saas_service_features FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- saas_service_subscriptions SELECT
CREATE POLICY "saas_subscriptions_select_policy"
ON public.saas_service_subscriptions FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

-- saas_service_subscriptions INSERT / UPDATE → solo superadmin + EF (service_role bypasa RLS)
CREATE POLICY "saas_subscriptions_insert_policy"
ON public.saas_service_subscriptions FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "saas_subscriptions_update_policy"
ON public.saas_service_subscriptions FOR UPDATE TO authenticated
USING (get_my_role() = 'superadmin');

-- ─── 2. LOCK_INTEGRATIONS ────────────────────────────────────────────────────

ALTER TABLE public.lock_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_integrations_select_policy"
ON public.lock_integrations FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

-- INSERT/UPDATE: admin y superadmin (agent no configura infraestructura)
-- NOTA: DROP IF EXISTS + RECREATE en 000006 con el mismo nombre — no hay conflicto.
CREATE POLICY "lock_integrations_insert_policy"
ON public.lock_integrations FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_integrations_update_policy"
ON public.lock_integrations FOR UPDATE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_integrations_delete_policy"
ON public.lock_integrations FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- ─── 3. LOCKS ────────────────────────────────────────────────────────────────
-- Las locks se crean/actualizan SOLO vía sal-sync-locks (service_role).
-- El frontend solo las lee.

ALTER TABLE public.locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locks_select_policy"
ON public.locks FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

-- No hay INSERT/UPDATE policy para authenticated → fuerza uso de service_role en EF.

-- ─── 4. COMMON_AREAS ─────────────────────────────────────────────────────────

ALTER TABLE public.common_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "common_areas_select_policy"
ON public.common_areas FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

CREATE POLICY "common_areas_insert_policy"
ON public.common_areas FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "common_areas_update_policy"
ON public.common_areas FOR UPDATE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "common_areas_delete_policy"
ON public.common_areas FOR DELETE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

-- ─── 5. LOCK_PLACEMENTS ──────────────────────────────────────────────────────

ALTER TABLE public.lock_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_placements_select_policy"
ON public.lock_placements FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

-- INSERT/UPDATE: admin y superadmin (agent no asigna locks a ubicaciones)
CREATE POLICY "lock_placements_insert_policy"
ON public.lock_placements FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_placements_update_policy"
ON public.lock_placements FOR UPDATE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_placements_delete_policy"
ON public.lock_placements FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- ─── 6. LOCK_ACCESS_ACTORS ───────────────────────────────────────────────────

ALTER TABLE public.lock_access_actors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_access_actors_select_policy"
ON public.lock_access_actors FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

-- admin y agent pueden registrar actores
CREATE POLICY "lock_access_actors_insert_policy"
ON public.lock_access_actors FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_access_actors_update_policy"
ON public.lock_access_actors FOR UPDATE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_access_actors_delete_policy"
ON public.lock_access_actors FOR DELETE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

-- ─── 7. LOCK_ACCESS_GROUPS ───────────────────────────────────────────────────

ALTER TABLE public.lock_access_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_access_groups_select_policy"
ON public.lock_access_groups FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

-- Solo admin: los grupos son configuración de infraestructura
CREATE POLICY "lock_access_groups_insert_policy"
ON public.lock_access_groups FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_access_groups_update_policy"
ON public.lock_access_groups FOR UPDATE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_access_groups_delete_policy"
ON public.lock_access_groups FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- ─── 8. LOCK_ACCESS_GROUP_MEMBERS ────────────────────────────────────────────

ALTER TABLE public.lock_access_group_members ENABLE ROW LEVEL SECURITY;

-- Para SELECT: admin/agent ven miembros si tienen acceso al grupo
CREATE POLICY "lock_access_group_members_select_policy"
ON public.lock_access_group_members FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR EXISTS (
    SELECT 1 FROM public.lock_access_groups g
    WHERE g.id = lock_access_group_id
      AND (get_my_role() = 'superadmin' OR g.client_account_id = get_my_client_account_id())
  )
);

-- admin y agent pueden gestionar membresías
CREATE POLICY "lock_access_group_members_insert_policy"
ON public.lock_access_group_members FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR EXISTS (
    SELECT 1 FROM public.lock_access_groups g
    WHERE g.id = lock_access_group_id
      AND g.client_account_id = get_my_client_account_id()
      AND get_my_role() IN ('admin', 'agent')
  )
);

CREATE POLICY "lock_access_group_members_update_policy"
ON public.lock_access_group_members FOR UPDATE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR EXISTS (
    SELECT 1 FROM public.lock_access_groups g
    WHERE g.id = lock_access_group_id
      AND g.client_account_id = get_my_client_account_id()
      AND get_my_role() IN ('admin', 'agent')
  )
);

CREATE POLICY "lock_access_group_members_delete_policy"
ON public.lock_access_group_members FOR DELETE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR EXISTS (
    SELECT 1 FROM public.lock_access_groups g
    WHERE g.id = lock_access_group_id
      AND g.client_account_id = get_my_client_account_id()
      AND get_my_role() IN ('admin', 'agent')
  )
);

-- ─── 9. LOCK_ACCESS_GROUP_SCOPES ─────────────────────────────────────────────

ALTER TABLE public.lock_access_group_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_access_group_scopes_select_policy"
ON public.lock_access_group_scopes FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

-- Solo admin: los scopes definen arquitectura de acceso
CREATE POLICY "lock_access_group_scopes_insert_policy"
ON public.lock_access_group_scopes FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_access_group_scopes_update_policy"
ON public.lock_access_group_scopes FOR UPDATE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_access_group_scopes_delete_policy"
ON public.lock_access_group_scopes FOR DELETE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

-- ─── 10. LOCK_ACCESS_GRANTS ──────────────────────────────────────────────────

ALTER TABLE public.lock_access_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_access_grants_select_policy"
ON public.lock_access_grants FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

-- Solo admin puede crear grants manuales (los automáticos usan EF via service_role)
CREATE POLICY "lock_access_grants_insert_policy"
ON public.lock_access_grants FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

-- Solo admin puede revocar (UPDATE status='revoked')
CREATE POLICY "lock_access_grants_update_policy"
ON public.lock_access_grants FOR UPDATE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

-- Grants no se eliminan, solo se revocan
CREATE POLICY "lock_access_grants_delete_policy"
ON public.lock_access_grants FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- ─── 11. LOCK_CREDENTIALS ────────────────────────────────────────────────────
-- Solo lectura para frontend. Escritura solo vía EF (service_role).

ALTER TABLE public.lock_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_credentials_select_policy"
ON public.lock_credentials FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

-- No INSERT/UPDATE policy para authenticated (solo EF via service_role)

-- ─── 12. LOCK_RECORDS ────────────────────────────────────────────────────────
-- Solo lectura. Escritura solo vía sal-sync-lock-records (service_role).

ALTER TABLE public.lock_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_records_select_policy"
ON public.lock_records FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

-- ─── 13. LOCK_NOTIFICATIONS ──────────────────────────────────────────────────
-- Solo lectura para frontend. Escritura solo vía sal-send-notification (service_role).

ALTER TABLE public.lock_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_notifications_select_policy"
ON public.lock_notifications FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

-- ─── Verificación ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  tbl text;
  rls_tables text[] := ARRAY[
    'saas_services', 'saas_service_plans', 'saas_service_features',
    'saas_service_subscriptions', 'lock_integrations', 'locks',
    'common_areas', 'lock_placements', 'lock_access_actors',
    'lock_access_groups', 'lock_access_group_members',
    'lock_access_group_scopes', 'lock_access_grants',
    'lock_credentials', 'lock_records', 'lock_notifications'
  ];
BEGIN
  FOREACH tbl IN ARRAY rls_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = tbl
        AND rowsecurity = true
    ) THEN
      RAISE EXCEPTION 'RLS no habilitado en tabla: %', tbl;
    END IF;
  END LOOP;
  RAISE NOTICE 'Migración 20260412000004 completada — RLS habilitado en 16 tablas SAL';
END $$;
