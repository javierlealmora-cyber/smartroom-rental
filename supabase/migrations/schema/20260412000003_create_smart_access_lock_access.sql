-- ============================================================================
-- Migración: SmartAccessLock — Tablas de Acceso
-- Fecha: 2026-04-12
-- REQ: REQ-014 (SmartAccessLock)
--
-- Crea las tablas de gestión de accesos:
-- lock_access_actors, lock_access_groups, lock_access_group_members,
-- lock_access_group_scopes, lock_access_grants, lock_credentials,
-- lock_records, lock_notifications
--
-- Requiere: 20260412000002 ejecutada primero
-- ============================================================================

-- ─── lock_access_actors ──────────────────────────────────────────────────────
-- Actores no-inquilinos que pueden tener acceso a locks.
-- Se registran a nivel client_account (no por alojamiento).

CREATE TABLE IF NOT EXISTS public.lock_access_actors (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id           uuid        NOT NULL REFERENCES public.client_accounts(id),
  actor_type                  text        NOT NULL
                              CHECK (actor_type IN (
                                'owner','manager','leasing_agent',
                                'cleaning','maintenance','service_company','custom'
                              )),
  full_name                   text        NOT NULL,
  email                       text,
  phone                       text,
  notes                       text,
  is_active                   boolean     NOT NULL DEFAULT true,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lock_actors_client
  ON public.lock_access_actors (client_account_id);

CREATE INDEX IF NOT EXISTS idx_lock_actors_active
  ON public.lock_access_actors (client_account_id, is_active) WHERE is_active = true;

-- ─── lock_access_groups ──────────────────────────────────────────────────────
-- Grupos de acceso reutilizables para actores.
-- El acceso efectivo de un actor = UNIÓN de los scopes de todos sus grupos activos.

CREATE TABLE IF NOT EXISTS public.lock_access_groups (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id           uuid        NOT NULL REFERENCES public.client_accounts(id),
  name                        text        NOT NULL,
  description                 text,
  -- Política de credencial por defecto para este grupo
  -- type: 'pin' | 'card' | 'app_key' | 'qr'
  -- validity: 'permanent' | 'time_limited' | 'single_use'
  -- validity_days: número (si time_limited)
  -- auto_renew: boolean
  credential_policy           jsonb       NOT NULL DEFAULT '{
    "type": "pin",
    "validity": "permanent",
    "auto_renew": false
  }'::jsonb,
  is_active                   boolean     NOT NULL DEFAULT true,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lock_groups_client
  ON public.lock_access_groups (client_account_id);

-- ─── lock_access_group_members ───────────────────────────────────────────────
-- Pertenencia de actores a grupos. Un actor puede estar en múltiples grupos.

CREATE TABLE IF NOT EXISTS public.lock_access_group_members (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_access_group_id        uuid        NOT NULL REFERENCES public.lock_access_groups(id),
  lock_access_actor_id        uuid        NOT NULL REFERENCES public.lock_access_actors(id),
  valid_from                  timestamptz NOT NULL DEFAULT now(),
  valid_to                    timestamptz,
  is_active                   boolean     NOT NULL DEFAULT true,
  added_by                    text,
  notes                       text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lock_access_group_id, lock_access_actor_id)
);

CREATE INDEX IF NOT EXISTS idx_lock_group_members_group
  ON public.lock_access_group_members (lock_access_group_id);

CREATE INDEX IF NOT EXISTS idx_lock_group_members_actor
  ON public.lock_access_group_members (lock_access_actor_id);

-- ─── lock_access_group_scopes ────────────────────────────────────────────────
-- Define a qué entidades tiene acceso un grupo.
-- Jerarquía: all_accommodations > accommodation > room / common_area > lock

CREATE TABLE IF NOT EXISTS public.lock_access_group_scopes (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lock_access_group_id        uuid        NOT NULL REFERENCES public.lock_access_groups(id),
  client_account_id           uuid        NOT NULL REFERENCES public.client_accounts(id),
  -- Tipo de scope
  scope_type                  text        NOT NULL
                              CHECK (scope_type IN (
                                'all_accommodations','accommodation','room','common_area','lock'
                              )),
  accommodation_id            uuid        REFERENCES public.accommodations(id),
  room_id                     uuid        REFERENCES public.rooms(id),
  common_area_id              uuid        REFERENCES public.common_areas(id),
  lock_id                     uuid        REFERENCES public.locks(id),
  -- Política de horario (enforcement dependiente del proveedor)
  -- Formato: {"days": ["mon","tue","wed","thu","fri"], "hours": {"from": "08:00", "to": "18:00"}}
  time_policy                 jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lock_group_scopes_coherence CHECK (
    (scope_type = 'all_accommodations'  AND accommodation_id IS NULL AND room_id IS NULL AND common_area_id IS NULL AND lock_id IS NULL) OR
    (scope_type = 'accommodation'       AND accommodation_id IS NOT NULL AND room_id IS NULL AND common_area_id IS NULL AND lock_id IS NULL) OR
    (scope_type = 'room'                AND room_id IS NOT NULL AND common_area_id IS NULL AND lock_id IS NULL) OR
    (scope_type = 'common_area'         AND common_area_id IS NOT NULL AND room_id IS NULL AND lock_id IS NULL) OR
    (scope_type = 'lock'                AND lock_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_lock_group_scopes_group
  ON public.lock_access_group_scopes (lock_access_group_id);

CREATE INDEX IF NOT EXISTS idx_lock_group_scopes_client
  ON public.lock_access_group_scopes (client_account_id);

-- ─── lock_access_grants ──────────────────────────────────────────────────────
-- Grant efectivo resuelto: una persona (lodger o actor) tiene acceso a una lock.
-- Se crean automáticamente al asignar habitación (lodger) o al cambiar grupo (actor).

CREATE TABLE IF NOT EXISTS public.lock_access_grants (
  id                              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id               uuid        NOT NULL REFERENCES public.client_accounts(id),
  -- Quién tiene el acceso (XOR: lodger o actor, nunca ambos)
  grant_type                      text        NOT NULL CHECK (grant_type IN ('lodger','actor')),
  lodger_id                       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  lock_access_actor_id            uuid        REFERENCES public.lock_access_actors(id),
  -- Origen del grant (para actores que acceden vía grupo)
  lock_access_group_id            uuid        REFERENCES public.lock_access_groups(id),
  lock_access_group_member_id     uuid        REFERENCES public.lock_access_group_members(id),
  -- A qué lock
  lock_id                         uuid        NOT NULL REFERENCES public.locks(id),
  lock_placement_id               uuid        REFERENCES public.lock_placements(id),
  -- Vigencia
  valid_from                      timestamptz NOT NULL DEFAULT now(),
  valid_to                        timestamptz,
  -- Estado del grant
  status                          text        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','active','revoked','expired')),
  -- Trazabilidad del origen del grant
  source_type                     text        NOT NULL
                                  CHECK (source_type IN ('room_assignment','group_membership','manual')),
  source_id                       uuid,   -- lodger_room_assignments.id o lock_access_group_members.id
  -- Revocación
  revoked_at                      timestamptz,
  revoked_by                      text,
  revoke_reason                   text,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lock_grants_actor_xor CHECK (
    (grant_type = 'lodger'  AND lodger_id IS NOT NULL AND lock_access_actor_id IS NULL) OR
    (grant_type = 'actor'   AND lock_access_actor_id IS NOT NULL AND lodger_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_lock_grants_client
  ON public.lock_access_grants (client_account_id);

CREATE INDEX IF NOT EXISTS idx_lock_grants_lodger
  ON public.lock_access_grants (lodger_id) WHERE lodger_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lock_grants_actor
  ON public.lock_access_grants (lock_access_actor_id) WHERE lock_access_actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lock_grants_lock
  ON public.lock_access_grants (lock_id);

CREATE INDEX IF NOT EXISTS idx_lock_grants_active
  ON public.lock_access_grants (client_account_id, status) WHERE status = 'active';

-- ─── lock_credentials ────────────────────────────────────────────────────────
-- Credenciales emitidas para cada grant (PIN, tarjeta, app key, etc.)
-- ⚠️ SEGURIDAD CRÍTICA: credential_value DEBE cifrarse con Supabase Vault
-- antes de persistir. Nunca almacenar PINs en texto plano.

CREATE TABLE IF NOT EXISTS public.lock_credentials (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id           uuid        NOT NULL REFERENCES public.client_accounts(id),
  lock_access_grant_id        uuid        NOT NULL REFERENCES public.lock_access_grants(id),
  lock_id                     uuid        NOT NULL REFERENCES public.locks(id),
  -- Tipo y valor de la credencial
  credential_type             text        NOT NULL
                              CHECK (credential_type IN ('pin','card','app_key','qr','remote_only')),
  -- ⚠️ CIFRAR antes de persistir (Supabase Vault o AES en Edge Function)
  credential_value            text,
  provider_credential_id      text,
  -- Ciclo de vida
  status                      text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','active','revoked','expired')),
  issued_at                   timestamptz,
  expires_at                  timestamptz,
  revoked_at                  timestamptz,
  -- Sincronización con el proveedor
  provider_sync_status        text        NOT NULL DEFAULT 'pending'
                              CHECK (provider_sync_status IN ('synced','pending','error')),
  provider_synced_at          timestamptz,
  provider_sync_error         text,
  provider_sync_retries       int         NOT NULL DEFAULT 0,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lock_credentials_grant
  ON public.lock_credentials (lock_access_grant_id);

CREATE INDEX IF NOT EXISTS idx_lock_credentials_lock
  ON public.lock_credentials (lock_id);

CREATE INDEX IF NOT EXISTS idx_lock_credentials_active
  ON public.lock_credentials (status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_lock_credentials_pending_sync
  ON public.lock_credentials (provider_sync_status) WHERE provider_sync_status IN ('pending','error');

-- ─── lock_records ────────────────────────────────────────────────────────────
-- Log de eventos sincronizados del proveedor (desbloqueos, fallos, batería, etc.)
-- UNIQUE (lock_id, provider_record_id) evita duplicados en re-sincronizaciones.

CREATE TABLE IF NOT EXISTS public.lock_records (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id           uuid        NOT NULL REFERENCES public.client_accounts(id),
  lock_id                     uuid        NOT NULL REFERENCES public.locks(id),
  lock_credential_id          uuid        REFERENCES public.lock_credentials(id),
  -- Evento
  event_type                  text        NOT NULL
                              CHECK (event_type IN (
                                'unlock','lock','failed_attempt','battery_low',
                                'online','offline','tamper','door_open','door_close','remote_unlock'
                              )),
  event_at                    timestamptz NOT NULL,
  actor_description           text,
  -- Deduplicación contra re-syncs repetidas
  provider_record_id          text        NOT NULL,
  raw_data                    jsonb,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lock_id, provider_record_id)
);

CREATE INDEX IF NOT EXISTS idx_lock_records_client
  ON public.lock_records (client_account_id);

CREATE INDEX IF NOT EXISTS idx_lock_records_lock_time
  ON public.lock_records (lock_id, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_lock_records_event_type
  ON public.lock_records (event_type, event_at DESC);

-- ─── lock_notifications ──────────────────────────────────────────────────────
-- Trazabilidad de notificaciones enviadas (credenciales, revocaciones, etc.)
-- Fase 1: solo canal 'email'. Futuro: sms, whatsapp, push.

CREATE TABLE IF NOT EXISTS public.lock_notifications (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id           uuid        NOT NULL REFERENCES public.client_accounts(id),
  lock_access_actor_id        uuid        REFERENCES public.lock_access_actors(id),
  lodger_id                   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  lock_credential_id          uuid        REFERENCES public.lock_credentials(id),
  -- Destinatario
  recipient_email             text,
  recipient_phone             text,
  -- Contenido
  notification_type           text        NOT NULL
                              CHECK (notification_type IN (
                                'credential_issued','credential_expiring','credential_revoked',
                                'access_denied','service_activated','sync_error'
                              )),
  channel                     text        NOT NULL DEFAULT 'email'
                              CHECK (channel IN ('email','sms','whatsapp','push','ui')),
  template_code               text        NOT NULL,
  payload                     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  -- Estado de envío
  status                      text        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','sent','failed','cancelled')),
  sent_at                     timestamptz,
  retry_count                 int         NOT NULL DEFAULT 0,
  last_error                  text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lock_notifications_client
  ON public.lock_notifications (client_account_id);

CREATE INDEX IF NOT EXISTS idx_lock_notifications_pending
  ON public.lock_notifications (status, retry_count) WHERE status IN ('pending','failed');

CREATE INDEX IF NOT EXISTS idx_lock_notifications_actor
  ON public.lock_notifications (lock_access_actor_id) WHERE lock_access_actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lock_notifications_lodger
  ON public.lock_notifications (lodger_id) WHERE lodger_id IS NOT NULL;

-- ─── Triggers updated_at ─────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER lock_access_actors_updated_at
  BEFORE UPDATE ON public.lock_access_actors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER lock_access_groups_updated_at
  BEFORE UPDATE ON public.lock_access_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER lock_access_group_members_updated_at
  BEFORE UPDATE ON public.lock_access_group_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER lock_access_group_scopes_updated_at
  BEFORE UPDATE ON public.lock_access_group_scopes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER lock_access_grants_updated_at
  BEFORE UPDATE ON public.lock_access_grants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER lock_credentials_updated_at
  BEFORE UPDATE ON public.lock_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER lock_notifications_updated_at
  BEFORE UPDATE ON public.lock_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Verificación ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = 'lock_access_grants') THEN
    RAISE EXCEPTION 'Tabla lock_access_grants no creada';
  END IF;
  RAISE NOTICE 'Migración 20260412000003 completada correctamente';
END $$;
