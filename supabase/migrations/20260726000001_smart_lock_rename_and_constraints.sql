-- ============================================================================
-- 20260716000001_smart_lock_rename_and_constraints.sql
-- ============================================================================
-- Fase 1a del roadmap SmartLock (docs/smart-lock/).
--
-- Objetivo:
--   1) Uniformar el naming del módulo SAL con el prefijo lock_* obligatorio
--      (rules-30-schema-isolation.md §4.3).
--   2) Añadir CHECK en lock_integrations.provider (rules-10 §4.4).
--   3) Ampliar CHECK en lock_integrations.status para soportar los estados
--      pending_release y released (rules-70 §4.5 — offboarding con liberación).
--
-- Contexto:
--   - Ninguna FK del core apunta a tablas lock_*/gateway_*/provider_account_* (verificado).
--   - Todas las tablas afectadas están vacías (0 filas), operación segura.
--   - RLS activa en todas las tablas afectadas.
--
-- Referencias:
--   - docs/smart-lock/rules/rules-30-schema-isolation.md §4.3
--   - docs/smart-lock/rules/rules-10-provider-model.md §4.4
--   - docs/smart-lock/rules/rules-70-subscription-cancellation-and-lock-release.md §4.5
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. RENOMBRADO DE TABLAS
-- ----------------------------------------------------------------------------

ALTER TABLE public.gateways                     RENAME TO lock_gateways;
ALTER TABLE public.gateway_lock_links           RENAME TO lock_gateway_links;
ALTER TABLE public.gateway_claim_sessions       RENAME TO lock_gateway_claim_sessions;
ALTER TABLE public.provider_account_pools       RENAME TO lock_provider_pools;
ALTER TABLE public.provider_account_assignments RENAME TO lock_provider_pool_assignments;

-- ----------------------------------------------------------------------------
-- 2. RENOMBRADO DE CONSTRAINTS (por consistencia; funcionalmente no requerido)
-- ----------------------------------------------------------------------------

-- lock_gateways (antes gateways)
ALTER TABLE public.lock_gateways
  RENAME CONSTRAINT gateways_pkey                            TO lock_gateways_pkey;
ALTER TABLE public.lock_gateways
  RENAME CONSTRAINT gateways_accommodation_id_fkey           TO lock_gateways_accommodation_id_fkey;
ALTER TABLE public.lock_gateways
  RENAME CONSTRAINT gateways_client_account_id_fkey          TO lock_gateways_client_account_id_fkey;
ALTER TABLE public.lock_gateways
  RENAME CONSTRAINT gateways_paired_by_fkey                  TO lock_gateways_paired_by_fkey;
ALTER TABLE public.lock_gateways
  RENAME CONSTRAINT gateways_pool_id_fkey                    TO lock_gateways_pool_id_fkey;
ALTER TABLE public.lock_gateways
  RENAME CONSTRAINT gateways_pool_id_provider_gateway_id_key TO lock_gateways_pool_id_provider_gateway_id_key;
ALTER TABLE public.lock_gateways
  RENAME CONSTRAINT gateways_pairing_source_check            TO lock_gateways_pairing_source_check;
ALTER TABLE public.lock_gateways
  RENAME CONSTRAINT gateways_status_check                    TO lock_gateways_status_check;

-- lock_gateway_links (antes gateway_lock_links)
ALTER TABLE public.lock_gateway_links
  RENAME CONSTRAINT gateway_lock_links_pkey                            TO lock_gateway_links_pkey;
ALTER TABLE public.lock_gateway_links
  RENAME CONSTRAINT gateway_lock_links_client_account_id_fkey          TO lock_gateway_links_client_account_id_fkey;
ALTER TABLE public.lock_gateway_links
  RENAME CONSTRAINT gateway_lock_links_gateway_id_fkey                 TO lock_gateway_links_gateway_id_fkey;
ALTER TABLE public.lock_gateway_links
  RENAME CONSTRAINT gateway_lock_links_linked_by_fkey                  TO lock_gateway_links_linked_by_fkey;
ALTER TABLE public.lock_gateway_links
  RENAME CONSTRAINT gateway_lock_links_lock_id_fkey                    TO lock_gateway_links_lock_id_fkey;
ALTER TABLE public.lock_gateway_links
  RENAME CONSTRAINT gateway_lock_links_physical_validation_status_check TO lock_gateway_links_physical_validation_status_check;

-- lock_gateway_claim_sessions (antes gateway_claim_sessions)
ALTER TABLE public.lock_gateway_claim_sessions
  RENAME CONSTRAINT gateway_claim_sessions_pkey                   TO lock_gateway_claim_sessions_pkey;
ALTER TABLE public.lock_gateway_claim_sessions
  RENAME CONSTRAINT gateway_claim_sessions_client_account_id_fkey TO lock_gateway_claim_sessions_client_account_id_fkey;
ALTER TABLE public.lock_gateway_claim_sessions
  RENAME CONSTRAINT gateway_claim_sessions_gateway_id_fkey        TO lock_gateway_claim_sessions_gateway_id_fkey;
ALTER TABLE public.lock_gateway_claim_sessions
  RENAME CONSTRAINT gateway_claim_sessions_initiated_by_fkey      TO lock_gateway_claim_sessions_initiated_by_fkey;
ALTER TABLE public.lock_gateway_claim_sessions
  RENAME CONSTRAINT gateway_claim_sessions_pool_id_fkey           TO lock_gateway_claim_sessions_pool_id_fkey;
ALTER TABLE public.lock_gateway_claim_sessions
  RENAME CONSTRAINT gateway_claim_sessions_status_check           TO lock_gateway_claim_sessions_status_check;

-- lock_provider_pools (antes provider_account_pools)
ALTER TABLE public.lock_provider_pools
  RENAME CONSTRAINT provider_account_pools_pkey            TO lock_provider_pools_pkey;
ALTER TABLE public.lock_provider_pools
  RENAME CONSTRAINT provider_account_pools_shard_code_key  TO lock_provider_pools_shard_code_key;
ALTER TABLE public.lock_provider_pools
  RENAME CONSTRAINT provider_account_pools_status_check    TO lock_provider_pools_status_check;

-- lock_provider_pool_assignments (antes provider_account_assignments)
ALTER TABLE public.lock_provider_pool_assignments
  RENAME CONSTRAINT provider_account_assignments_pkey                        TO lock_provider_pool_assignments_pkey;
ALTER TABLE public.lock_provider_pool_assignments
  RENAME CONSTRAINT provider_account_assignments_assigned_by_fkey            TO lock_provider_pool_assignments_assigned_by_fkey;
ALTER TABLE public.lock_provider_pool_assignments
  RENAME CONSTRAINT provider_account_assignments_client_account_id_fkey      TO lock_provider_pool_assignments_client_account_id_fkey;
ALTER TABLE public.lock_provider_pool_assignments
  RENAME CONSTRAINT provider_account_assignments_migration_target_pool_id_fkey TO lock_provider_pool_assignments_migration_target_pool_id_fkey;
ALTER TABLE public.lock_provider_pool_assignments
  RENAME CONSTRAINT provider_account_assignments_pool_id_fkey                TO lock_provider_pool_assignments_pool_id_fkey;
ALTER TABLE public.lock_provider_pool_assignments
  RENAME CONSTRAINT provider_account_assignments_status_check                TO lock_provider_pool_assignments_status_check;

-- ----------------------------------------------------------------------------
-- 3. RENOMBRADO DE ÍNDICES
-- ----------------------------------------------------------------------------

ALTER INDEX public.idx_gateways_accommodation           RENAME TO idx_lock_gateways_accommodation;
ALTER INDEX public.idx_gateways_client                  RENAME TO idx_lock_gateways_client;
ALTER INDEX public.idx_gateways_pool                    RENAME TO idx_lock_gateways_pool;
ALTER INDEX public.idx_gateways_status                  RENAME TO idx_lock_gateways_status;

ALTER INDEX public.idx_gateway_lock_links_client        RENAME TO idx_lock_gateway_links_client;
ALTER INDEX public.idx_gateway_lock_links_gateway       RENAME TO idx_lock_gateway_links_gateway;
ALTER INDEX public.idx_gateway_lock_links_lock          RENAME TO idx_lock_gateway_links_lock;
ALTER INDEX public.idx_gateway_lock_links_one_active    RENAME TO idx_lock_gateway_links_one_active;
ALTER INDEX public.idx_gateway_lock_links_validation    RENAME TO idx_lock_gateway_links_validation;

ALTER INDEX public.idx_gateway_claim_sessions_client    RENAME TO idx_lock_gateway_claim_sessions_client;
ALTER INDEX public.idx_gateway_claim_sessions_expires   RENAME TO idx_lock_gateway_claim_sessions_expires;
ALTER INDEX public.idx_gateway_claim_sessions_status    RENAME TO idx_lock_gateway_claim_sessions_status;

ALTER INDEX public.idx_provider_pools_region            RENAME TO idx_lock_provider_pools_region;
ALTER INDEX public.idx_provider_pools_status            RENAME TO idx_lock_provider_pools_status;

ALTER INDEX public.idx_provider_assignments_active_unique RENAME TO idx_lock_provider_pool_assignments_active_unique;
ALTER INDEX public.idx_provider_assignments_client        RENAME TO idx_lock_provider_pool_assignments_client;
ALTER INDEX public.idx_provider_assignments_pool          RENAME TO idx_lock_provider_pool_assignments_pool;

-- ----------------------------------------------------------------------------
-- 4. RENOMBRADO DE POLÍTICAS RLS
-- ----------------------------------------------------------------------------

ALTER POLICY gateways_select                     ON public.lock_gateways                 RENAME TO lock_gateways_select;
ALTER POLICY gateways_insert_admin               ON public.lock_gateways                 RENAME TO lock_gateways_insert_admin;
ALTER POLICY gateways_update_admin               ON public.lock_gateways                 RENAME TO lock_gateways_update_admin;

ALTER POLICY gateway_lock_links_select           ON public.lock_gateway_links            RENAME TO lock_gateway_links_select;
ALTER POLICY gateway_lock_links_insert_admin     ON public.lock_gateway_links            RENAME TO lock_gateway_links_insert_admin;
ALTER POLICY gateway_lock_links_update_admin     ON public.lock_gateway_links            RENAME TO lock_gateway_links_update_admin;

ALTER POLICY gateway_claim_sessions_select       ON public.lock_gateway_claim_sessions   RENAME TO lock_gateway_claim_sessions_select;
ALTER POLICY gateway_claim_sessions_insert_admin ON public.lock_gateway_claim_sessions   RENAME TO lock_gateway_claim_sessions_insert_admin;
ALTER POLICY gateway_claim_sessions_update_admin ON public.lock_gateway_claim_sessions   RENAME TO lock_gateway_claim_sessions_update_admin;

ALTER POLICY provider_pools_select_superadmin    ON public.lock_provider_pools           RENAME TO lock_provider_pools_select_superadmin;
ALTER POLICY provider_pools_insert_superadmin    ON public.lock_provider_pools           RENAME TO lock_provider_pools_insert_superadmin;
ALTER POLICY provider_pools_update_superadmin    ON public.lock_provider_pools           RENAME TO lock_provider_pools_update_superadmin;

ALTER POLICY provider_assignments_select           ON public.lock_provider_pool_assignments RENAME TO lock_provider_pool_assignments_select;
ALTER POLICY provider_assignments_insert_superadmin ON public.lock_provider_pool_assignments RENAME TO lock_provider_pool_assignments_insert_superadmin;
ALTER POLICY provider_assignments_update_superadmin ON public.lock_provider_pool_assignments RENAME TO lock_provider_pool_assignments_update_superadmin;

-- ----------------------------------------------------------------------------
-- 5. RENOMBRADO DE FKs EN locks (referencian a lock_gateways/lock_gateway_links)
-- ----------------------------------------------------------------------------

ALTER TABLE public.locks
  RENAME CONSTRAINT locks_gateway_id_fkey       TO locks_lock_gateway_id_fkey;
ALTER TABLE public.locks
  RENAME CONSTRAINT locks_gateway_link_id_fkey  TO locks_lock_gateway_link_id_fkey;

-- ----------------------------------------------------------------------------
-- 6. CHECK NUEVO: lock_integrations.provider ∈ ('ttlock','ttlock_ble','nuki')
-- ----------------------------------------------------------------------------

ALTER TABLE public.lock_integrations
  ADD CONSTRAINT lock_integrations_provider_check
  CHECK (provider IN ('ttlock', 'ttlock_ble', 'nuki'));

-- ----------------------------------------------------------------------------
-- 7. AMPLIACIÓN CHECK: lock_integrations.status incluye pending_release, released
-- ----------------------------------------------------------------------------

ALTER TABLE public.lock_integrations
  DROP CONSTRAINT lock_integrations_status_check;

ALTER TABLE public.lock_integrations
  ADD CONSTRAINT lock_integrations_status_check
  CHECK (status IN ('connected', 'disconnected', 'error', 'syncing', 'pending_release', 'released'));

-- ----------------------------------------------------------------------------
-- 8. Refrescar el schema cache de PostgREST
-- ----------------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';

COMMIT;
