-- ============================================================================
-- 20260716000002_smart_lock_plan_features_seed.sql
-- ============================================================================
-- Fase 1b/4 — Poblado inicial de features para los planes SmartAccessLock
-- existentes (basic y sal_starter).
--
-- Contexto:
--   El servicio saas_services.code = 'smart_access_lock' ya existe en DEV con
--   2 planes (basic, sal_starter) pero SIN filas en saas_service_features.
--   Sin features, `resolveSalPlanConfiguration()` devuelve valores por defecto
--   restrictivos (todos false / 0), lo que efectivamente bloquea toda la
--   operativa del módulo.
--
-- Referencias:
--   docs/smart-lock/rules/rules-21-subscription-plan-configuration.md §4.1
--   docs/smart-lock/contracts/contract-subscription-plan-configuration.md
--
-- Idempotencia:
--   Los INSERT usan ON CONFLICT (saas_service_plan_id, feature_code) DO UPDATE
--   para permitir re-ejecución (en DEV los features aún no tienen ese UNIQUE,
--   pero lo añadimos primero como parte de esta migración; si ya existe es
--   no-op).
-- ============================================================================

BEGIN;

-- Índice único para permitir upsert idempotente
CREATE UNIQUE INDEX IF NOT EXISTS uq_saas_service_features_plan_code
  ON public.saas_service_features (saas_service_plan_id, feature_code);

-- Helper CTE con los IDs de los planes de smart_access_lock
WITH sal_service AS (
    SELECT id FROM public.saas_services WHERE code = 'smart_access_lock'
),
plans AS (
    SELECT p.id, p.code
    FROM public.saas_service_plans p
    JOIN sal_service s ON p.saas_service_id = s.id
),
plan_basic   AS (SELECT id FROM plans WHERE code = 'basic'),
plan_starter AS (SELECT id FROM plans WHERE code = 'sal_starter'),
-- ---------------------------------------------------------------------------
-- Plan BÁSICO — capacidades limitadas
-- ---------------------------------------------------------------------------
features_basic (feature_code, is_enabled, config) AS (
    VALUES
        ('provider_integration',    TRUE,  '{}'::jsonb),
        ('common_areas',            FALSE, '{}'::jsonb),
        ('multiple_locks_per_room', FALSE, '{}'::jsonb),
        ('multiple_locks_per_area', FALSE, '{}'::jsonb),
        ('actors',                  TRUE,  '{}'::jsonb),
        ('access_groups',           FALSE, '{}'::jsonb),
        ('lodger_auto_grant',       TRUE,  '{}'::jsonb),
        ('group_auto_grant',        FALSE, '{}'::jsonb),
        ('remote_unlock',           TRUE,  '{}'::jsonb),
        ('audit_logs',              FALSE, '{}'::jsonb),
        ('notifications_email',     TRUE,  '{}'::jsonb),
        ('notifications_sms',       FALSE, '{}'::jsonb),
        ('notifications_whatsapp',  FALSE, '{}'::jsonb),
        ('provider_local_ble',      FALSE, '{}'::jsonb),
        ('max_locks',               TRUE,  '{"value": 20}'::jsonb),
        ('max_actors',              TRUE,  '{"value": 5}'::jsonb),
        ('max_groups',              TRUE,  '{"value": 0}'::jsonb),
        ('max_gateways',            TRUE,  '{"value": 0}'::jsonb)
),
-- ---------------------------------------------------------------------------
-- Plan STARTER/PREMIUM — todo habilitado, sin límites
-- ---------------------------------------------------------------------------
features_starter (feature_code, is_enabled, config) AS (
    VALUES
        ('provider_integration',    TRUE,  '{}'::jsonb),
        ('common_areas',            TRUE,  '{}'::jsonb),
        ('multiple_locks_per_room', TRUE,  '{}'::jsonb),
        ('multiple_locks_per_area', TRUE,  '{}'::jsonb),
        ('actors',                  TRUE,  '{}'::jsonb),
        ('access_groups',           TRUE,  '{}'::jsonb),
        ('lodger_auto_grant',       TRUE,  '{}'::jsonb),
        ('group_auto_grant',        TRUE,  '{}'::jsonb),
        ('remote_unlock',           TRUE,  '{}'::jsonb),
        ('audit_logs',              TRUE,  '{}'::jsonb),
        ('notifications_email',     TRUE,  '{}'::jsonb),
        ('notifications_sms',       FALSE, '{}'::jsonb),
        ('notifications_whatsapp',  FALSE, '{}'::jsonb),
        -- provider_local_ble desactivado por ahora (Fase 2 lo activará)
        ('provider_local_ble',      FALSE, '{}'::jsonb),
        ('max_locks',               TRUE,  '{"value": null}'::jsonb),
        ('max_actors',              TRUE,  '{"value": null}'::jsonb),
        ('max_groups',              TRUE,  '{"value": null}'::jsonb),
        ('max_gateways',            TRUE,  '{"value": null}'::jsonb)
)
INSERT INTO public.saas_service_features (saas_service_plan_id, feature_code, is_enabled, config)
SELECT plan_basic.id, feature_code, is_enabled, config FROM plan_basic, features_basic
UNION ALL
SELECT plan_starter.id, feature_code, is_enabled, config FROM plan_starter, features_starter
ON CONFLICT (saas_service_plan_id, feature_code)
DO UPDATE SET
    is_enabled = EXCLUDED.is_enabled,
    config     = EXCLUDED.config;

NOTIFY pgrst, 'reload schema';

COMMIT;
