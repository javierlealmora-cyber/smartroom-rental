-- ============================================================================
-- Migración: SAL — Columnas planas en lock_access_groups
-- Fecha: 2026-04-26
--
-- El campo credential_policy (jsonb) almacenaba tipo, vigencia y auto_renew,
-- pero el frontend necesita columnas planas para consultas y filtros simples.
-- Se añaden columnas planas que reemplazan el jsonb para simplicidad de UI.
-- ============================================================================

ALTER TABLE public.lock_access_groups
  ADD COLUMN IF NOT EXISTS credential_type text NOT NULL DEFAULT 'pin'
    CHECK (credential_type IN ('pin', 'card', 'app_key', 'qr'));

ALTER TABLE public.lock_access_groups
  ADD COLUMN IF NOT EXISTS validity_days int NOT NULL DEFAULT 30;

ALTER TABLE public.lock_access_groups
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT false;

-- Migrar datos existentes del jsonb a columnas planas (si hay filas)
UPDATE public.lock_access_groups
SET
  credential_type = COALESCE(
    (credential_policy->>'type')::text, 'pin'
  ),
  validity_days = COALESCE(
    (credential_policy->>'validity_days')::int, 30
  ),
  auto_renew = COALESCE(
    (credential_policy->>'auto_renew')::boolean, false
  )
WHERE credential_policy IS NOT NULL;

-- Recargar schema cache de PostgREST para que las nuevas columnas sean visibles
NOTIFY pgrst, 'reload schema';
