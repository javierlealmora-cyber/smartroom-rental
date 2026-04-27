-- ============================================================================
-- Migración: SAL — Columnas nuevas en tablas existentes (shard pool)
-- Fecha: 2026-04-19
-- REQ: REQ-014 (SmartAccessLock §15.5.7, §15.5.8, §15.E)
--
-- Añade columnas a tablas existentes para soportar la arquitectura
-- de shard pool, ciclo de vida de locks y validación de vínculos:
--
--   locks            → pool_id, status lifecycle, pairing_source, claim session,
--                       gateway_id, gateway_link_id, gateway_validation_status,
--                       installation_complete, quarantine_reason, offboarding ts
--   lock_integrations → pool_id, installation_status, connectivity_status,
--                        validation_status, counters de validación
--
-- Requiere: 20260419000001_sal_shard_pool ejecutada
-- ============================================================================

-- ─── locks: columnas del shard pool ──────────────────────────────────────────

-- Shard TTLock al que pertenece esta lock
ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS pool_id uuid
    REFERENCES public.provider_account_pools(id) ON DELETE SET NULL;

-- Ciclo de vida completo de la cerradura
-- discovered → quarantine → claim_pending → ready_for_activation → active → offboarding → offboarded / error
ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'discovered'
    CHECK (status IN (
      'discovered','quarantine','claim_pending',
      'ready_for_activation','active',
      'offboarding','offboarded','error'
    ));

-- Origen del emparejamiento inicial
ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS pairing_source text NOT NULL DEFAULT 'synced'
    CHECK (pairing_source IN ('app_paired','transferred','synced'));

-- Fecha y usuario del emparejamiento BLE
ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS paired_at timestamptz;

ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS paired_by uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Sesión de claim activa sobre esta lock
ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS claim_session_id uuid
    REFERENCES public.lock_claim_sessions(id) ON DELETE SET NULL;

-- Gateway asociado para operativa remota (denormalizado de gateway_lock_links activo)
ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS gateway_id uuid
    REFERENCES public.gateways(id) ON DELETE SET NULL;

-- Referencia al vínculo activo (denormalizado para joins rápidos)
ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS gateway_link_id uuid
    REFERENCES public.gateway_lock_links(id) ON DELETE SET NULL;

-- Estado del vínculo con el gateway (denormalizado)
ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS gateway_validation_status text NOT NULL DEFAULT 'not_validated'
    CHECK (gateway_validation_status IN (
      'not_validated','validated','degraded','failed'
    ));

-- Referencia Vault del lockKey BLE (cifrado, nunca en claro)
ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS lock_key_vault_ref uuid;

-- La instalación de esta lock está completa (gateway vinculado y validado)
ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS installation_complete boolean NOT NULL DEFAULT false;

-- Motivo de cuarentena si status='quarantine'
ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS quarantine_reason text;

-- Timestamps de offboarding
ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS offboarding_initiated_at timestamptz;

ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS offboarding_completed_at timestamptz;

-- Última operación remota exitosa
ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS last_remote_operation_at timestamptz;

ALTER TABLE public.locks
  ADD COLUMN IF NOT EXISTS last_remote_operation_result text
    CHECK (last_remote_operation_result IN ('ok','gateway_unreachable','timeout'));

-- ─── locks: índices nuevos ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_locks_status
  ON public.locks (client_account_id, status);

CREATE INDEX IF NOT EXISTS idx_locks_pool
  ON public.locks (pool_id) WHERE pool_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_locks_quarantine
  ON public.locks (status) WHERE status = 'quarantine';

CREATE INDEX IF NOT EXISTS idx_locks_active_status
  ON public.locks (client_account_id) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_locks_gateway
  ON public.locks (gateway_id) WHERE gateway_id IS NOT NULL;

-- ─── lock_integrations: columnas del shard pool ───────────────────────────────

-- Shard asignado al cliente (copia de provider_account_assignments para joins rápidos)
ALTER TABLE public.lock_integrations
  ADD COLUMN IF NOT EXISTS pool_id uuid
    REFERENCES public.provider_account_pools(id) ON DELETE SET NULL;

-- Estado de la instalación: ¿el hardware mínimo está configurado?
ALTER TABLE public.lock_integrations
  ADD COLUMN IF NOT EXISTS installation_status text NOT NULL DEFAULT 'incomplete'
    CHECK (installation_status IN ('incomplete','partial','operativa'));

-- Estado de conectividad actual del hardware
ALTER TABLE public.lock_integrations
  ADD COLUMN IF NOT EXISTS connectivity_status text NOT NULL DEFAULT 'unknown'
    CHECK (connectivity_status IN (
      'unknown','ok','degraded','no_gateway','error'
    ));

-- Estado de validación física de vínculos gateway-lock
ALTER TABLE public.lock_integrations
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'not_validated'
    CHECK (validation_status IN (
      'not_validated','partially_validated','fully_validated'
    ));

-- Contadores (mantenidos por triggers o n8n)
ALTER TABLE public.lock_integrations
  ADD COLUMN IF NOT EXISTS validated_locks_count int NOT NULL DEFAULT 0;

ALTER TABLE public.lock_integrations
  ADD COLUMN IF NOT EXISTS unvalidated_locks_count int NOT NULL DEFAULT 0;

ALTER TABLE public.lock_integrations
  ADD COLUMN IF NOT EXISTS gateway_count int NOT NULL DEFAULT 0;

ALTER TABLE public.lock_integrations
  ADD COLUMN IF NOT EXISTS active_locks_count int NOT NULL DEFAULT 0;

-- ─── lock_integrations: índices nuevos ───────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_lock_integrations_pool
  ON public.lock_integrations (pool_id) WHERE pool_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lock_integrations_installation
  ON public.lock_integrations (installation_status);
