-- ============================================================================
-- Migración: SmartAccessLock — Tablas Core (integración, locks, zonas, mapeo)
-- Fecha: 2026-04-12
-- REQ: REQ-014 (SmartAccessLock)
--
-- Crea las tablas de infraestructura del módulo:
-- lock_integrations, locks, common_areas, lock_placements
--
-- IMPORTANTE: Requiere btree_gist extension para EXCLUDE constraint
-- en lock_placements. Verificar disponibilidad en Supabase.
-- ============================================================================

-- ─── lock_integrations ───────────────────────────────────────────────────────
-- Conexión de un client_account con un proveedor de locks (TTLock, Nuki, etc.)
-- ⚠️ provider_credentials DEBE cifrarse con Supabase Vault antes de producción

CREATE TABLE IF NOT EXISTS public.lock_integrations (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id           uuid        NOT NULL REFERENCES public.client_accounts(id),
  provider                    text        NOT NULL DEFAULT 'ttlock',
  status                      text        NOT NULL DEFAULT 'disconnected'
                              CHECK (status IN ('connected','disconnected','error','syncing')),
  provider_account_id         text,
  provider_client_id          text,
  -- Credenciales del proveedor (cifrar con Vault antes de persistir)
  provider_credentials        jsonb,
  -- Webhooks (futuro — no requerido en Fase 1)
  webhook_configured          boolean     NOT NULL DEFAULT false,
  webhook_url                 text,
  webhook_secret              text,
  -- Estado de sincronización
  last_sync_at                timestamptz,
  last_sync_status            text        CHECK (last_sync_status IN ('success','partial','error')),
  last_sync_error             text,
  locks_synced_count          int         NOT NULL DEFAULT 0,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  -- Un proveedor por cuenta (escalar a múltiples en versiones futuras si necesario)
  UNIQUE (client_account_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_lock_integrations_client
  ON public.lock_integrations (client_account_id);

CREATE INDEX IF NOT EXISTS idx_lock_integrations_status
  ON public.lock_integrations (status) WHERE status = 'connected';

-- ─── locks ───────────────────────────────────────────────────────────────────
-- Dispositivos de cerradura sincronizados del proveedor.
-- La web NO crea locks — solo las sincroniza desde el proveedor.

CREATE TABLE IF NOT EXISTS public.locks (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id           uuid        NOT NULL REFERENCES public.client_accounts(id),
  lock_integration_id         uuid        NOT NULL REFERENCES public.lock_integrations(id),
  provider                    text        NOT NULL,
  provider_lock_id            text        NOT NULL,
  name                        text        NOT NULL,
  display_name                text,
  model                       text,
  -- Estado (actualizado en cada sync)
  battery_level               int         CHECK (battery_level BETWEEN 0 AND 100),
  is_online                   boolean     NOT NULL DEFAULT false,
  last_seen_at                timestamptz,
  firmware_version            text,
  -- Capacidades del dispositivo
  supports_remote_unlock      boolean     NOT NULL DEFAULT false,
  supports_auto_lock          boolean     NOT NULL DEFAULT false,
  supports_passage_mode       boolean     NOT NULL DEFAULT false,
  -- Datos raw del proveedor (para debugging y futuras capacidades)
  raw_data                    jsonb,
  synced_at                   timestamptz,
  is_active                   boolean     NOT NULL DEFAULT true,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lock_integration_id, provider_lock_id)
);

CREATE INDEX IF NOT EXISTS idx_locks_client
  ON public.locks (client_account_id);

CREATE INDEX IF NOT EXISTS idx_locks_integration
  ON public.locks (lock_integration_id);

CREATE INDEX IF NOT EXISTS idx_locks_active
  ON public.locks (client_account_id, is_active) WHERE is_active = true;

-- ─── common_areas ────────────────────────────────────────────────────────────
-- Zonas comunes de un alojamiento (lavandería, cuarto bicicletas, etc.)
-- Nuevo concepto añadido por SmartAccessLock.

CREATE TABLE IF NOT EXISTS public.common_areas (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id           uuid        NOT NULL REFERENCES public.client_accounts(id),
  accommodation_id            uuid        NOT NULL REFERENCES public.accommodations(id),
  name                        text        NOT NULL,
  area_type                   text        NOT NULL DEFAULT 'custom'
                              CHECK (area_type IN (
                                'laundry','bicycle_room','luggage_room','storage',
                                'gym','terrace','parking','kitchen','common_room','custom'
                              )),
  description                 text,
  is_active                   boolean     NOT NULL DEFAULT true,
  sort_order                  int         NOT NULL DEFAULT 0,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_common_areas_client
  ON public.common_areas (client_account_id);

CREATE INDEX IF NOT EXISTS idx_common_areas_accommodation
  ON public.common_areas (accommodation_id);

-- ─── lock_placements ─────────────────────────────────────────────────────────
-- Mapea cada lock física a su ubicación lógica en el alojamiento.
-- Una lock activa solo puede estar en un lugar a la vez (EXCLUDE constraint).
-- Define propósito y si se asigna automáticamente a inquilinos.

CREATE TABLE IF NOT EXISTS public.lock_placements (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id           uuid        NOT NULL REFERENCES public.client_accounts(id),
  lock_id                     uuid        NOT NULL REFERENCES public.locks(id),
  -- Ubicación
  placement_type              text        NOT NULL
                              CHECK (placement_type IN ('accommodation_entry','room','common_area')),
  accommodation_id            uuid        REFERENCES public.accommodations(id),
  room_id                     uuid        REFERENCES public.rooms(id),
  common_area_id              uuid        REFERENCES public.common_areas(id),
  -- Propósito funcional de esta lock en este lugar
  lock_purpose                text        NOT NULL DEFAULT 'entry_door'
                              CHECK (lock_purpose IN (
                                'entry_door','parcel_locker','safe_box',
                                'common_area_entry','storage_lock','custom'
                              )),
  display_name                text,
  -- Reglas de asignación automática
  auto_assign_to_lodger       boolean     NOT NULL DEFAULT true,
  -- Meta
  sort_order                  int         NOT NULL DEFAULT 0,
  notes                       text,
  is_active                   boolean     NOT NULL DEFAULT true,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  -- Una lock física no puede estar asignada activamente a más de un lugar
  -- (requiere btree_gist; si no disponible, usar unique index parcial alternativo)
  CONSTRAINT lock_placements_type_coherence CHECK (
    (placement_type = 'accommodation_entry'
      AND accommodation_id IS NOT NULL
      AND room_id IS NULL
      AND common_area_id IS NULL)
    OR
    (placement_type = 'room'
      AND room_id IS NOT NULL
      AND accommodation_id IS NOT NULL
      AND common_area_id IS NULL)
    OR
    (placement_type = 'common_area'
      AND common_area_id IS NOT NULL
      AND accommodation_id IS NOT NULL
      AND room_id IS NULL)
  )
);

-- Índice único parcial: una lock activa solo puede tener un placement activo
CREATE UNIQUE INDEX IF NOT EXISTS idx_lock_placements_one_active
  ON public.lock_placements (lock_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_lock_placements_client
  ON public.lock_placements (client_account_id);

CREATE INDEX IF NOT EXISTS idx_lock_placements_lock
  ON public.lock_placements (lock_id);

CREATE INDEX IF NOT EXISTS idx_lock_placements_room
  ON public.lock_placements (room_id)
  WHERE room_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lock_placements_accommodation
  ON public.lock_placements (accommodation_id);

CREATE INDEX IF NOT EXISTS idx_lock_placements_common_area
  ON public.lock_placements (common_area_id)
  WHERE common_area_id IS NOT NULL;

-- ─── Triggers updated_at ─────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER lock_integrations_updated_at
  BEFORE UPDATE ON public.lock_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER locks_updated_at
  BEFORE UPDATE ON public.locks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER common_areas_updated_at
  BEFORE UPDATE ON public.common_areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER lock_placements_updated_at
  BEFORE UPDATE ON public.lock_placements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Verificación ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public'
                 AND table_name = 'lock_integrations') THEN
    RAISE EXCEPTION 'Tabla lock_integrations no creada';
  END IF;
  RAISE NOTICE 'Migración 20260412000002 completada correctamente';
END $$;
