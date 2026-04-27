-- ============================================================================
-- Migración: SAL — Shard Pool y tablas de ciclo de vida de hardware
-- Fecha: 2026-04-19
-- REQ: REQ-014 (SmartAccessLock §15)
--
-- Crea las tablas necesarias para la arquitectura de shard pool:
--
--   provider_account_pools       → Cuentas TTLock propias de SmartRoom (shards)
--   provider_account_assignments → Asignación de cliente a shard
--   gateways                     → Gateways físicos TTLock
--   lock_claim_sessions          → Proceso de claim de cerradura nueva
--   gateway_claim_sessions       → Proceso de claim de gateway nuevo
--   lock_sync_commands           → Cola de comandos a TTLock
--   gateway_lock_links           → Vínculos físicos gateway ↔ lock
--
-- Requiere: 20260412000001–20260412000007 ejecutadas
-- ============================================================================

-- ─── provider_account_pools ──────────────────────────────────────────────────
-- Pool de cuentas TTLock propias de SmartRoom (shards).
-- Cada shard agrupa un subconjunto de clientes y sus cerraduras.
-- Solo el superadmin puede gestionar shards directamente.

CREATE TABLE IF NOT EXISTS public.provider_account_pools (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shard_code              text        NOT NULL UNIQUE,
  provider                text        NOT NULL DEFAULT 'ttlock',
  ttlock_email            text        NOT NULL,
  provider_client_id      text        NOT NULL,
  -- Referencia al secreto en Vault: password_md5, access_token, refresh_token
  vault_key_ref           uuid,
  status                  text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','full','compromised','retired')),
  region                  text,
  max_locks               int         NOT NULL DEFAULT 500,
  max_clients             int         NOT NULL DEFAULT 50,
  current_locks_count     int         NOT NULL DEFAULT 0,
  current_clients_count   int         NOT NULL DEFAULT 0,
  -- Bloqueo de nuevas operaciones (incidente de seguridad)
  is_blocked              boolean     NOT NULL DEFAULT false,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  last_token_refresh_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_provider_pools_status
  ON public.provider_account_pools (status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_provider_pools_region
  ON public.provider_account_pools (region) WHERE region IS NOT NULL;

-- ─── provider_account_assignments ────────────────────────────────────────────
-- Asigna un cliente a un shard concreto.
-- Un cliente solo puede tener una asignación activa por proveedor.

CREATE TABLE IF NOT EXISTS public.provider_account_assignments (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id       uuid        NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  pool_id                 uuid        NOT NULL REFERENCES public.provider_account_pools(id),
  provider                text        NOT NULL DEFAULT 'ttlock',
  assigned_at             timestamptz NOT NULL DEFAULT now(),
  assigned_by             uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  status                  text        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','migrating','migrated')),
  migration_target_pool_id uuid       REFERENCES public.provider_account_pools(id),
  notes                   text
);

-- Un cliente solo puede tener una asignación activa por proveedor
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_assignments_active_unique
  ON public.provider_account_assignments (client_account_id, provider)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_provider_assignments_client
  ON public.provider_account_assignments (client_account_id);

CREATE INDEX IF NOT EXISTS idx_provider_assignments_pool
  ON public.provider_account_assignments (pool_id);

-- ─── gateways ────────────────────────────────────────────────────────────────
-- Gateways físicos TTLock que actúan como puente BLE-WiFi.
-- Prerequisito operativo para remote unlock y creación de PINs.

CREATE TABLE IF NOT EXISTS public.gateways (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id       uuid        NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  pool_id                 uuid        REFERENCES public.provider_account_pools(id),
  provider_gateway_id     text        NOT NULL,
  name                    text        NOT NULL,
  accommodation_id        uuid        REFERENCES public.accommodations(id) ON DELETE SET NULL,
  status                  text        NOT NULL DEFAULT 'claim_pending'
                          CHECK (status IN (
                            'claim_pending','active','offline_error',
                            'offboarding','offboarded'
                          )),
  is_online               boolean     NOT NULL DEFAULT false,
  last_seen_at            timestamptz,
  wifi_ssid               text,
  firmware_version        text,
  pairing_source          text        NOT NULL DEFAULT 'app_paired'
                          CHECK (pairing_source IN ('app_paired','imported')),
  paired_at               timestamptz,
  paired_by               uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  synced_at               timestamptz,
  -- Capacidad recomendada (4-6 locks por gateway por límite BLE)
  max_locks_recommended   int         NOT NULL DEFAULT 5,
  current_linked_locks    int         NOT NULL DEFAULT 0,
  last_connectivity_test_at timestamptz,
  connectivity_test_result  jsonb,
  raw_data                jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pool_id, provider_gateway_id)
);

CREATE INDEX IF NOT EXISTS idx_gateways_client
  ON public.gateways (client_account_id);

CREATE INDEX IF NOT EXISTS idx_gateways_accommodation
  ON public.gateways (accommodation_id) WHERE accommodation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gateways_status
  ON public.gateways (status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_gateways_pool
  ON public.gateways (pool_id);

-- ─── lock_claim_sessions ─────────────────────────────────────────────────────
-- Controla el proceso de claim de una cerradura nueva.
-- Toda lock pasa por una claim session antes de activarse.

CREATE TABLE IF NOT EXISTS public.lock_claim_sessions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id       uuid        NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  pool_id                 uuid        REFERENCES public.provider_account_pools(id),
  lock_id                 uuid        REFERENCES public.locks(id) ON DELETE SET NULL,
  provider_lock_id        text,
  lock_mac                text,
  claim_type              text        NOT NULL DEFAULT 'app_paired'
                          CHECK (claim_type IN ('app_paired','transfer_import')),
  status                  text        NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open','confirmed','failed','expired')),
  initiated_by            uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  initiated_at            timestamptz NOT NULL DEFAULT now(),
  confirmed_at            timestamptz,
  confirmed_by            uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at              timestamptz NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  validation_metadata     jsonb,
  error_reason            text
);

CREATE INDEX IF NOT EXISTS idx_claim_sessions_client
  ON public.lock_claim_sessions (client_account_id);

CREATE INDEX IF NOT EXISTS idx_claim_sessions_status
  ON public.lock_claim_sessions (status) WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_claim_sessions_provider_lock
  ON public.lock_claim_sessions (provider_lock_id) WHERE provider_lock_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_claim_sessions_expires
  ON public.lock_claim_sessions (expires_at) WHERE status = 'open';

-- ─── gateway_claim_sessions ───────────────────────────────────────────────────
-- Controla el proceso de claim de un gateway nuevo.
-- Análogo a lock_claim_sessions.

CREATE TABLE IF NOT EXISTS public.gateway_claim_sessions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id       uuid        NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  pool_id                 uuid        REFERENCES public.provider_account_pools(id),
  gateway_id              uuid        REFERENCES public.gateways(id) ON DELETE SET NULL,
  provider_gateway_id     text,
  status                  text        NOT NULL DEFAULT 'open'
                          CHECK (status IN (
                            'open','wifi_configured','confirmed','failed','expired'
                          )),
  initiated_by            uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  initiated_at            timestamptz NOT NULL DEFAULT now(),
  confirmed_at            timestamptz,
  wifi_ssid               text,
  expires_at              timestamptz NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  error_reason            text
);

CREATE INDEX IF NOT EXISTS idx_gateway_claim_sessions_client
  ON public.gateway_claim_sessions (client_account_id);

CREATE INDEX IF NOT EXISTS idx_gateway_claim_sessions_status
  ON public.gateway_claim_sessions (status) WHERE status IN ('open','wifi_configured');

CREATE INDEX IF NOT EXISTS idx_gateway_claim_sessions_expires
  ON public.gateway_claim_sessions (expires_at) WHERE status IN ('open','wifi_configured');

-- ─── lock_sync_commands ───────────────────────────────────────────────────────
-- Cola de comandos pendientes de ejecutar en TTLock.
-- n8n procesa esta cola con la EF sal-execute-command.

CREATE TABLE IF NOT EXISTS public.lock_sync_commands (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id       uuid        NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  lock_id                 uuid        NOT NULL REFERENCES public.locks(id) ON DELETE CASCADE,
  pool_id                 uuid        NOT NULL REFERENCES public.provider_account_pools(id),
  command_type            text        NOT NULL
                          CHECK (command_type IN (
                            'create_pin','revoke_pin','remote_unlock',
                            'sync_lock','sync_records'
                          )),
  command_payload         jsonb       NOT NULL DEFAULT '{}',
  status                  text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN (
                            'pending','executing','completed','failed','cancelled'
                          )),
  -- 1=urgente (unlock), 2=normal, 3=batch
  priority                int         NOT NULL DEFAULT 2
                          CHECK (priority IN (1, 2, 3)),
  created_at              timestamptz NOT NULL DEFAULT now(),
  scheduled_for           timestamptz,
  executed_at             timestamptz,
  completed_at            timestamptz,
  attempt_count           int         NOT NULL DEFAULT 0,
  max_attempts            int         NOT NULL DEFAULT 5,
  error_message           text,
  result_payload          jsonb,
  -- Para evitar comandos duplicados (ej: PIN ya pendiente para el mismo grant)
  dedupe_key              text        UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_sync_commands_pending
  ON public.lock_sync_commands (status, priority, created_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_sync_commands_lock
  ON public.lock_sync_commands (lock_id);

CREATE INDEX IF NOT EXISTS idx_sync_commands_client
  ON public.lock_sync_commands (client_account_id);

CREATE INDEX IF NOT EXISTS idx_sync_commands_executing
  ON public.lock_sync_commands (executed_at)
  WHERE status = 'executing';

-- ─── gateway_lock_links ───────────────────────────────────────────────────────
-- Vínculos físicos entre gateway y lock.
-- Fuente de verdad de la topología: qué gateway cubre qué lock.
-- Cada lock activa tiene exactamente un vínculo activo.

CREATE TABLE IF NOT EXISTS public.gateway_lock_links (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id                  uuid        NOT NULL REFERENCES public.gateways(id) ON DELETE CASCADE,
  lock_id                     uuid        NOT NULL REFERENCES public.locks(id) ON DELETE CASCADE,
  client_account_id           uuid        NOT NULL REFERENCES public.client_accounts(id) ON DELETE CASCADE,
  is_active                   boolean     NOT NULL DEFAULT false,
  -- Estado de validación física del vínculo
  physical_validation_status  text        NOT NULL DEFAULT 'not_validated'
                              CHECK (physical_validation_status IN (
                                'not_validated','validated','degraded','failed'
                              )),
  last_validated_at           timestamptz,
  validation_test_result      jsonb,
  invalidation_reason         text,
  linked_at                   timestamptz NOT NULL DEFAULT now(),
  linked_by                   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes                       text
);

-- INVARIANTE: una lock solo puede tener UN vínculo activo a la vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_gateway_lock_links_one_active
  ON public.gateway_lock_links (lock_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_gateway_lock_links_gateway
  ON public.gateway_lock_links (gateway_id);

CREATE INDEX IF NOT EXISTS idx_gateway_lock_links_lock
  ON public.gateway_lock_links (lock_id);

CREATE INDEX IF NOT EXISTS idx_gateway_lock_links_client
  ON public.gateway_lock_links (client_account_id);

CREATE INDEX IF NOT EXISTS idx_gateway_lock_links_validation
  ON public.gateway_lock_links (physical_validation_status)
  WHERE is_active = true;

-- ─── RLS: provider_account_pools ─────────────────────────────────────────────
-- Solo superadmin puede ver y gestionar shards.
-- n8n usa service_role → bypasa RLS.

ALTER TABLE public.provider_account_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_pools_select_superadmin"
ON public.provider_account_pools FOR SELECT TO authenticated
USING (get_my_role() = 'superadmin');

CREATE POLICY "provider_pools_insert_superadmin"
ON public.provider_account_pools FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "provider_pools_update_superadmin"
ON public.provider_account_pools FOR UPDATE TO authenticated
USING (get_my_role() = 'superadmin');

-- ─── RLS: provider_account_assignments ───────────────────────────────────────
-- Solo superadmin puede gestionar asignaciones.
-- Admins del cliente pueden VER su propia asignación (para SmartAccessTab).

ALTER TABLE public.provider_account_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_assignments_select"
ON public.provider_account_assignments FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

CREATE POLICY "provider_assignments_insert_superadmin"
ON public.provider_account_assignments FOR INSERT TO authenticated
WITH CHECK (get_my_role() = 'superadmin');

CREATE POLICY "provider_assignments_update_superadmin"
ON public.provider_account_assignments FOR UPDATE TO authenticated
USING (get_my_role() = 'superadmin');

-- ─── RLS: gateways ───────────────────────────────────────────────────────────

ALTER TABLE public.gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gateways_select"
ON public.gateways FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

CREATE POLICY "gateways_insert_admin"
ON public.gateways FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() IN ('admin','superadmin')
  AND client_account_id = get_my_client_account_id()
);

CREATE POLICY "gateways_update_admin"
ON public.gateways FOR UPDATE TO authenticated
USING (
  get_my_role() IN ('admin','superadmin')
  AND client_account_id = get_my_client_account_id()
);

-- ─── RLS: lock_claim_sessions ─────────────────────────────────────────────────

ALTER TABLE public.lock_claim_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "claim_sessions_select"
ON public.lock_claim_sessions FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

CREATE POLICY "claim_sessions_insert_admin"
ON public.lock_claim_sessions FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() IN ('admin','superadmin')
  AND client_account_id = get_my_client_account_id()
);

CREATE POLICY "claim_sessions_update_admin"
ON public.lock_claim_sessions FOR UPDATE TO authenticated
USING (
  get_my_role() IN ('admin','superadmin')
  AND client_account_id = get_my_client_account_id()
);

-- ─── RLS: gateway_claim_sessions ─────────────────────────────────────────────

ALTER TABLE public.gateway_claim_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gateway_claim_sessions_select"
ON public.gateway_claim_sessions FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

CREATE POLICY "gateway_claim_sessions_insert_admin"
ON public.gateway_claim_sessions FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() IN ('admin','superadmin')
  AND client_account_id = get_my_client_account_id()
);

CREATE POLICY "gateway_claim_sessions_update_admin"
ON public.gateway_claim_sessions FOR UPDATE TO authenticated
USING (
  get_my_role() IN ('admin','superadmin')
  AND client_account_id = get_my_client_account_id()
);

-- ─── RLS: lock_sync_commands ──────────────────────────────────────────────────
-- Admins pueden ver comandos (lectura). Escritura solo vía EF (service_role).

ALTER TABLE public.lock_sync_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sync_commands_select"
ON public.lock_sync_commands FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

-- INSERT/UPDATE solo vía service_role (EFs y n8n). Los admins no escriben directamente.

-- ─── RLS: gateway_lock_links ─────────────────────────────────────────────────

ALTER TABLE public.gateway_lock_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gateway_lock_links_select"
ON public.gateway_lock_links FOR SELECT TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR client_account_id = get_my_client_account_id()
);

CREATE POLICY "gateway_lock_links_insert_admin"
ON public.gateway_lock_links FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() IN ('admin','superadmin')
  AND client_account_id = get_my_client_account_id()
);

CREATE POLICY "gateway_lock_links_update_admin"
ON public.gateway_lock_links FOR UPDATE TO authenticated
USING (
  get_my_role() IN ('admin','superadmin')
  AND client_account_id = get_my_client_account_id()
);
