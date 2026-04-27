-- ============================================================================
-- Migración: SAL — Correcciones post-diseño
-- Fecha: 2026-04-12
-- REQ: REQ-014 (SmartAccessLock)
--
-- Correcciones al modelo SAL creado en migraciones 000001–000004:
--
--   1. Añade columna group_type a lock_access_groups
--   2. Cambia DEFAULT de lock_placements.auto_assign_to_lodger a false
--   3. Crea vista pública saas_catalog_public (solo servicios activos y visibles)
--   4. Corrige política SELECT de saas_services (filtra servicios en draft)
--   5. Restringe INSERT/UPDATE en tablas de infraestructura SAL:
--      agent NO puede modificar: lock_integrations, lock_placements,
--      lock_access_groups, lock_access_group_scopes
--
-- Requiere: 20260412000001–20260412000004 ejecutadas
-- ============================================================================

-- ─── 1. group_type en lock_access_groups ─────────────────────────────────────
-- Clasificación explícita del grupo para filtros, reporting y restricciones de plan.
-- Coherente con lock_access_actors.actor_type.

ALTER TABLE public.lock_access_groups
  ADD COLUMN IF NOT EXISTS group_type text NOT NULL DEFAULT 'custom'
    CHECK (group_type IN (
      'leasing_agent', 'cleaning', 'maintenance',
      'service_company', 'owner', 'custom'
    ));

-- ─── 2. auto_assign_to_lodger DEFAULT false ───────────────────────────────────
-- El DEFAULT true era peligroso: concedía acceso automático a cajas fuertes,
-- lockers técnicos, etc. El admin debe confirmar explícitamente.
-- La UI sugerirá true solo cuando lock_purpose = 'entry_door'.

ALTER TABLE public.lock_placements
  ALTER COLUMN auto_assign_to_lodger SET DEFAULT false;

-- ─── 3. Vista pública del catálogo SaaS ──────────────────────────────────────
-- El frontend de clientes (admin/agent) usa esta vista — nunca la tabla directa.
-- Excluye servicios en draft y planes inactivos.

CREATE OR REPLACE VIEW public.saas_catalog_public AS
  SELECT
    s.id,
    s.code,
    s.name,
    s.description,
    s.icon_url,
    s.requires_manual_activation,
    s.created_at,
    p.id             AS plan_id,
    p.name           AS plan_name,
    p.billing_period,
    p.price_amount,
    p.price_currency,
    p.stripe_price_id
  FROM public.saas_services s
  LEFT JOIN public.saas_service_plans p
    ON p.saas_service_id = s.id
    AND p.is_active = true
  WHERE s.status = 'active'
    AND s.visible_in_catalog = true;

GRANT SELECT ON public.saas_catalog_public TO authenticated;

-- ─── 4. Corregir política SELECT de saas_services (filtrar drafts) ───────────
-- USING (true) de 000004 exponía servicios en draft a cualquier autenticado.

DROP POLICY IF EXISTS "saas_services_select_policy" ON public.saas_services;

-- Solo status = 'active' — 'deprecated' y 'disabled' no se exponen aunque visible_in_catalog sea true.
CREATE POLICY "saas_services_select_policy"
ON public.saas_services FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (status = 'active' AND visible_in_catalog = true)
);

-- ─── 5. Corregir permisos de agent en tablas de infraestructura SAL ──────────
--
-- El agente es personal operativo, NO configura infraestructura.
-- Puede:     registrar actores, añadir/quitar miembros de grupos (correcto en 000004).
-- No puede:  crear/editar integrations, placements, groups, scopes.
--
-- Tabla de permisos definitiva:
--   INSERT/UPDATE lock_integrations          → admin/superadmin
--   INSERT/UPDATE lock_placements            → admin/superadmin
--   INSERT/UPDATE lock_access_groups         → admin/superadmin
--   INSERT/UPDATE lock_access_group_scopes   → admin/superadmin
--   INSERT/UPDATE lock_access_actors         → admin/agent/superadmin  (sin cambio)
--   INSERT/UPDATE lock_access_group_members  → admin/agent/superadmin  (sin cambio)
--   INSERT lock_access_grants (manual)       → admin/superadmin        (correcto en 000004)
--   UPDATE lock_access_grants (revocar)      → admin/superadmin        (correcto en 000004)

-- lock_integrations ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "lock_integrations_insert_policy" ON public.lock_integrations;
DROP POLICY IF EXISTS "lock_integrations_update_policy" ON public.lock_integrations;

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

-- lock_placements ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "lock_placements_insert_policy" ON public.lock_placements;
DROP POLICY IF EXISTS "lock_placements_update_policy" ON public.lock_placements;

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

-- lock_access_groups ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "lock_access_groups_insert_policy" ON public.lock_access_groups;
DROP POLICY IF EXISTS "lock_access_groups_update_policy" ON public.lock_access_groups;

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

-- lock_access_group_scopes ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "lock_access_group_scopes_insert_policy" ON public.lock_access_group_scopes;
DROP POLICY IF EXISTS "lock_access_group_scopes_update_policy" ON public.lock_access_group_scopes;

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

-- ─── Verificación ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Verificar columna group_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'lock_access_groups'
      AND column_name  = 'group_type'
  ) THEN
    RAISE EXCEPTION 'Columna group_type no añadida a lock_access_groups';
  END IF;

  -- Verificar vista saas_catalog_public
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name   = 'saas_catalog_public'
  ) THEN
    RAISE EXCEPTION 'Vista saas_catalog_public no creada';
  END IF;

  RAISE NOTICE 'Migración 20260412000006 completada correctamente';
END $$;
