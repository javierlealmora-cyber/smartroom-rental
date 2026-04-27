-- ============================================================================
-- Migración: SmartAccessLock — Políticas RLS
-- Fecha: 2026-04-12
-- REQ: REQ-013 (SaaS Services Catalog), REQ-014 (SmartAccessLock)
--
-- Habilita RLS y crea políticas para las tablas del módulo SAL:
--   Catálogo SaaS:  saas_services, saas_service_plans, saas_service_features,
--                   saas_service_subscriptions
--   Core locks:     lock_integrations, locks, common_areas, lock_placements
--   Acceso:         lock_access_actors, lock_access_groups,
--                   lock_access_group_members, lock_access_group_scopes,
--                   lock_access_grants, lock_credentials,
--                   lock_records, lock_notifications
--
-- Patrón de roles:
--   superadmin    → acceso total a todas las tablas
--   admin/agent   → acceso a filas de su propio client_account_id
--   service_role  → acceso total (Edge Functions, pg_cron)
--   authenticated → SELECT en catálogo público (saas_services, plans, features)
-- ============================================================================

-- ─── CATÁLOGO SAAS ───────────────────────────────────────────────────────────

-- saas_services — catálogo público de add-ons
ALTER TABLE public.saas_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saas_services_select_policy"
ON public.saas_services FOR SELECT TO authenticated
USING (true);   -- catálogo público (filtrado de draft se hace en código)

CREATE POLICY "saas_services_insert_policy"
ON public.saas_services FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "saas_services_update_policy"
ON public.saas_services FOR UPDATE TO authenticated
USING (get_my_role() = 'superadmin');

CREATE POLICY "saas_services_delete_policy"
ON public.saas_services FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- saas_service_plans
ALTER TABLE public.saas_service_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saas_service_plans_select_policy"
ON public.saas_service_plans FOR SELECT TO authenticated
USING (true);

CREATE POLICY "saas_service_plans_insert_policy"
ON public.saas_service_plans FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "saas_service_plans_update_policy"
ON public.saas_service_plans FOR UPDATE TO authenticated
USING (get_my_role() = 'superadmin');

CREATE POLICY "saas_service_plans_delete_policy"
ON public.saas_service_plans FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- saas_service_features
ALTER TABLE public.saas_service_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saas_service_features_select_policy"
ON public.saas_service_features FOR SELECT TO authenticated
USING (true);

CREATE POLICY "saas_service_features_insert_policy"
ON public.saas_service_features FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "saas_service_features_update_policy"
ON public.saas_service_features FOR UPDATE TO authenticated
USING (get_my_role() = 'superadmin');

CREATE POLICY "saas_service_features_delete_policy"
ON public.saas_service_features FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- saas_service_subscriptions — suscripciones por cliente
ALTER TABLE public.saas_service_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saas_service_subscriptions_select_policy"
ON public.saas_service_subscriptions FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- Solo superadmin activa/suspende suscripciones (o Edge Function con service_role)
CREATE POLICY "saas_service_subscriptions_insert_policy"
ON public.saas_service_subscriptions FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "saas_service_subscriptions_update_policy"
ON public.saas_service_subscriptions FOR UPDATE TO authenticated
USING (get_my_role() = 'superadmin');

CREATE POLICY "saas_service_subscriptions_delete_policy"
ON public.saas_service_subscriptions FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- ─── LOCK CORE ────────────────────────────────────────────────────────────────

-- lock_integrations — conexión proveedor por cuenta
ALTER TABLE public.lock_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_integrations_select_policy"
ON public.lock_integrations FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_integrations_insert_policy"
ON public.lock_integrations FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_integrations_update_policy"
ON public.lock_integrations FOR UPDATE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_integrations_delete_policy"
ON public.lock_integrations FOR DELETE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

-- locks — dispositivos sincronizados
ALTER TABLE public.locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locks_select_policy"
ON public.locks FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "locks_insert_policy"
ON public.locks FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "locks_update_policy"
ON public.locks FOR UPDATE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "locks_delete_policy"
ON public.locks FOR DELETE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

-- common_areas — zonas comunes de alojamientos
ALTER TABLE public.common_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "common_areas_select_policy"
ON public.common_areas FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
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

-- lock_placements — mapeo lock ↔ ubicación
ALTER TABLE public.lock_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_placements_select_policy"
ON public.lock_placements FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_placements_insert_policy"
ON public.lock_placements FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_placements_update_policy"
ON public.lock_placements FOR UPDATE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_placements_delete_policy"
ON public.lock_placements FOR DELETE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

-- ─── LOCK ACCESS ─────────────────────────────────────────────────────────────

-- lock_access_actors — actores no-inquilinos
ALTER TABLE public.lock_access_actors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_access_actors_select_policy"
ON public.lock_access_actors FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

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

-- lock_access_groups
ALTER TABLE public.lock_access_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_access_groups_select_policy"
ON public.lock_access_groups FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_access_groups_insert_policy"
ON public.lock_access_groups FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_access_groups_update_policy"
ON public.lock_access_groups FOR UPDATE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_access_groups_delete_policy"
ON public.lock_access_groups FOR DELETE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

-- lock_access_group_members
ALTER TABLE public.lock_access_group_members ENABLE ROW LEVEL SECURITY;

-- JOIN a lock_access_groups para obtener client_account_id
CREATE POLICY "lock_access_group_members_select_policy"
ON public.lock_access_group_members FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR EXISTS (
    SELECT 1 FROM public.lock_access_groups g
    WHERE g.id = lock_access_group_id
      AND (get_my_role() IN ('admin', 'agent') AND g.client_account_id = get_my_client_account_id())
  )
);

CREATE POLICY "lock_access_group_members_insert_policy"
ON public.lock_access_group_members FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR EXISTS (
    SELECT 1 FROM public.lock_access_groups g
    WHERE g.id = lock_access_group_id
      AND (get_my_role() IN ('admin', 'agent') AND g.client_account_id = get_my_client_account_id())
  )
);

CREATE POLICY "lock_access_group_members_update_policy"
ON public.lock_access_group_members FOR UPDATE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR EXISTS (
    SELECT 1 FROM public.lock_access_groups g
    WHERE g.id = lock_access_group_id
      AND (get_my_role() IN ('admin', 'agent') AND g.client_account_id = get_my_client_account_id())
  )
);

CREATE POLICY "lock_access_group_members_delete_policy"
ON public.lock_access_group_members FOR DELETE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR EXISTS (
    SELECT 1 FROM public.lock_access_groups g
    WHERE g.id = lock_access_group_id
      AND (get_my_role() = 'admin' AND g.client_account_id = get_my_client_account_id())
  )
);

-- lock_access_group_scopes
ALTER TABLE public.lock_access_group_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_access_group_scopes_select_policy"
ON public.lock_access_group_scopes FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_access_group_scopes_insert_policy"
ON public.lock_access_group_scopes FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_access_group_scopes_update_policy"
ON public.lock_access_group_scopes FOR UPDATE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_access_group_scopes_delete_policy"
ON public.lock_access_group_scopes FOR DELETE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

-- lock_access_grants — grants efectivos resueltos
-- ⚠️ Los grants los crean Edge Functions (service_role). Admin solo lee y revoca.
ALTER TABLE public.lock_access_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_access_grants_select_policy"
ON public.lock_access_grants FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- INSERT lo hace service_role (Edge Functions). Authenticated solo si es admin (operaciones manuales).
CREATE POLICY "lock_access_grants_insert_policy"
ON public.lock_access_grants FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

-- UPDATE para revocación manual (admin)
CREATE POLICY "lock_access_grants_update_policy"
ON public.lock_access_grants FOR UPDATE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_access_grants_delete_policy"
ON public.lock_access_grants FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- lock_credentials
-- ⚠️ SEGURIDAD CRÍTICA: credenciales cifradas. INSERT/UPDATE solo Edge Functions (service_role).
ALTER TABLE public.lock_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_credentials_select_policy"
ON public.lock_credentials FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- authenticated NO puede insertar credenciales directamente — solo service_role (Edge Function)
-- Esta política queda vacía intencionalmente para que solo service_role pueda insertar.
-- La política para service_role no requiere definición explícita (service_role bypasa RLS por defecto).

CREATE POLICY "lock_credentials_update_policy"
ON public.lock_credentials FOR UPDATE TO authenticated
USING (get_my_role() = 'superadmin');

CREATE POLICY "lock_credentials_delete_policy"
ON public.lock_credentials FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- lock_records — log de eventos del proveedor
-- INSERT solo por Edge Functions (service_role). Authenticated solo lee.
ALTER TABLE public.lock_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_records_select_policy"
ON public.lock_records FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- No se permite INSERT/UPDATE/DELETE desde authenticated.
-- Todos los eventos llegan vía Edge Function sal-sync-events (service_role).

-- lock_notifications — trazabilidad de notificaciones
ALTER TABLE public.lock_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lock_notifications_select_policy"
ON public.lock_notifications FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_notifications_insert_policy"
ON public.lock_notifications FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_notifications_update_policy"
ON public.lock_notifications FOR UPDATE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() = 'admin' AND client_account_id = get_my_client_account_id())
);

CREATE POLICY "lock_notifications_delete_policy"
ON public.lock_notifications FOR DELETE TO authenticated
USING (get_my_role() = 'superadmin');

-- ─── Verificación ─────────────────────────────────────────────────────────────

DO $$
DECLARE
  tables_with_rls text[] := ARRAY[
    'saas_services', 'saas_service_plans', 'saas_service_features',
    'saas_service_subscriptions', 'lock_integrations', 'locks',
    'common_areas', 'lock_placements', 'lock_access_actors',
    'lock_access_groups', 'lock_access_group_members',
    'lock_access_group_scopes', 'lock_access_grants',
    'lock_credentials', 'lock_records', 'lock_notifications'
  ];
  t text;
  rls_enabled boolean;
BEGIN
  FOREACH t IN ARRAY tables_with_rls LOOP
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = t AND relnamespace = 'public'::regnamespace;

    IF NOT rls_enabled THEN
      RAISE EXCEPTION 'RLS no habilitado en tabla: %', t;
    END IF;
  END LOOP;
  RAISE NOTICE 'Migración 20260412000004 completada — RLS habilitado en 16 tablas SAL';
END $$;
