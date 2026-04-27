-- ============================================================================
-- Migración: Añadir ttlock_platform a lock_integrations
-- Fecha: 2026-04-16
-- REQ: REQ-014 (SmartAccessLock)
--
-- Contexto:
--   TTLock tiene dos plataformas con endpoints distintos:
--     - Internacional (lock2.ttlock.com) → api.ttlock.com         [DEFAULT]
--     - Europa        (lock.ttlock.com)  → euapi.ttlock.com
--   La plataforma elegida al conectar se persiste aquí para que todos los
--   EFs posteriores (sync, unlock, grant, etc.) usen el endpoint correcto.
-- ============================================================================

ALTER TABLE public.lock_integrations
  ADD COLUMN IF NOT EXISTS ttlock_platform text
    NOT NULL DEFAULT 'intl'
    CHECK (ttlock_platform IN ('intl', 'eu'));

COMMENT ON COLUMN public.lock_integrations.ttlock_platform IS
  'Plataforma TTLock: intl = lock2.ttlock.com (api.ttlock.com) | eu = lock.ttlock.com (euapi.ttlock.com)';
