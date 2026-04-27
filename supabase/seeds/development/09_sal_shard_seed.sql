-- ============================================================================
-- SEEDS: SAL — Infraestructura completa para desarrollo
-- Ambiente: DEVELOPMENT
-- Fecha: 2026-04-26
-- Descripción:
--   Crea todo lo necesario para probar el módulo SAL en desarrollo sin
--   hardware físico ni app móvil:
--
--   1. Shard de desarrollo (provider_account_pools)
--   2. Servicio SAL en catálogo (saas_services)
--   3. Plan SAL básico (saas_service_plans)
--   4. Suscripción SAL para Business Housing 1
--   5. Asignación del cliente al shard
--   6. Integración TTLock conectada (lock_integrations)
--   7. Gateway de prueba (status='active', is_online=true)
--   8. Cerradura de prueba (status='active', installation_complete=true)
--   9. Vínculo gateway ↔ lock (gateway_lock_links, validated)
--  10. Actualización de contadores en lock_integrations
--
-- IDEMPOTENTE: se puede ejecutar múltiples veces sin duplicar datos.
-- PREREQUISITO: Migraciones 20260419000001 y 20260419000002 aplicadas.
-- ============================================================================

-- ─── 1. Shard de desarrollo ───────────────────────────────────────────────────

INSERT INTO public.provider_account_pools (
  shard_code,
  provider,
  ttlock_email,
  provider_client_id,
  vault_key_ref,
  status,
  region,
  max_locks,
  max_clients,
  notes
) VALUES (
  'shard-dev-001',
  'ttlock',
  'sal-shard-001@smartroomrental.com',
  'PENDING_TTLOCK_CLIENT_ID',
  NULL,
  'active',
  NULL,
  500,
  50,
  'Shard de desarrollo. Actualizar provider_client_id y vault_key_ref antes de usar en producción.'
)
ON CONFLICT (shard_code) DO UPDATE SET
  status = EXCLUDED.status,
  notes  = EXCLUDED.notes;

-- ─── 2. Servicio SAL en catálogo ──────────────────────────────────────────────

INSERT INTO public.saas_services (
  code,
  name,
  description,
  status,
  visible_in_catalog,
  requires_manual_activation,
  sort_order
) VALUES (
  'smart_access_lock',
  'SmartAccessLock',
  'Gestión remota de cerraduras inteligentes. Control de accesos, PINs automáticos y registro de entradas.',
  'active',
  true,
  true,
  10
)
ON CONFLICT (code) DO UPDATE SET
  status             = EXCLUDED.status,
  visible_in_catalog = EXCLUDED.visible_in_catalog,
  name               = EXCLUDED.name;

-- ─── 3. Plan básico SAL ───────────────────────────────────────────────────────

INSERT INTO public.saas_service_plans (
  saas_service_id,
  code,
  name,
  description,
  billing_period,
  price_amount,
  price_currency,
  is_active
) VALUES (
  (SELECT id FROM public.saas_services WHERE code = 'smart_access_lock'),
  'sal_starter',
  'SAL Starter',
  'Hasta 10 cerraduras, 1 gateway. Soporte básico.',
  'monthly',
  49.00,
  'EUR',
  true
)
ON CONFLICT (saas_service_id, code) DO NOTHING;

-- ─── 4. Suscripción SAL para Business Housing 1 ───────────────────────────────

INSERT INTO public.saas_service_subscriptions (
  client_account_id,
  saas_service_id,
  saas_service_plan_id,
  status,
  activated_at,
  billing_starts_at,
  notes
) VALUES (
  (SELECT id FROM public.client_accounts WHERE slug = 'business-housing-1'),
  (SELECT id FROM public.saas_services     WHERE code = 'smart_access_lock'),
  (SELECT id FROM public.saas_service_plans WHERE code = 'sal_starter'),
  'active',
  now(),
  now(),
  'Activado por seed de desarrollo para pruebas SAL.'
)
ON CONFLICT (client_account_id, saas_service_id) DO UPDATE SET
  status = 'active',
  notes  = EXCLUDED.notes;

-- ─── 5. Asignación del cliente al shard de desarrollo ────────────────────────

INSERT INTO public.provider_account_assignments (
  client_account_id,
  pool_id,
  provider,
  status,
  notes
) VALUES (
  (SELECT id FROM public.client_accounts     WHERE slug       = 'business-housing-1'),
  (SELECT id FROM public.provider_account_pools WHERE shard_code = 'shard-dev-001'),
  'ttlock',
  'active',
  'Asignado por seed de desarrollo.'
)
ON CONFLICT DO NOTHING;

-- ─── 6. Integración TTLock conectada ─────────────────────────────────────────
-- Simula haber ejecutado sal-connect-integration exitosamente.
-- vault_key_ref = NULL (no se necesita para probar la UI web).
-- ttlock_platform = 'eu' (España → euapi.ttlock.com).

INSERT INTO public.lock_integrations (
  client_account_id,
  provider,
  status,
  provider_account_id,
  provider_client_id,
  pool_id,
  ttlock_platform,
  installation_status,
  connectivity_status,
  validation_status,
  active_locks_count,
  gateway_count,
  validated_locks_count,
  unvalidated_locks_count,
  locks_synced_count
) VALUES (
  (SELECT id FROM public.client_accounts       WHERE slug       = 'business-housing-1'),
  'ttlock',
  'connected',
  'test@ttlock.dev',
  'DEV_CLIENT_ID',
  (SELECT id FROM public.provider_account_pools WHERE shard_code = 'shard-dev-001'),
  'eu',
  'operativa',
  'ok',
  'fully_validated',
  1, 1, 1, 0, 1
)
ON CONFLICT (client_account_id, provider) DO UPDATE SET
  status                  = 'connected',
  pool_id                 = EXCLUDED.pool_id,
  ttlock_platform         = EXCLUDED.ttlock_platform,
  installation_status     = 'operativa',
  connectivity_status     = 'ok',
  validation_status       = 'fully_validated',
  active_locks_count      = 1,
  gateway_count           = 1,
  validated_locks_count   = 1,
  unvalidated_locks_count = 0,
  locks_synced_count      = 1;

-- ─── 7. Gateway de prueba ─────────────────────────────────────────────────────
-- pairing_source='imported': indica que no se emparejó por BLE (es un registro
-- de prueba creado directamente en BD, no desde la app móvil).

INSERT INTO public.gateways (
  client_account_id,
  pool_id,
  provider_gateway_id,
  name,
  accommodation_id,
  status,
  is_online,
  pairing_source,
  firmware_version,
  max_locks_recommended,
  current_linked_locks
)
SELECT
  ca.id,
  (SELECT id FROM public.provider_account_pools WHERE shard_code = 'shard-dev-001'),
  'GW-DEV-001',
  'Gateway Prueba Dev',
  (SELECT id FROM public.accommodations
   WHERE  client_account_id = ca.id
   ORDER  BY created_at
   LIMIT  1),
  'active',
  true,
  'imported',
  '1.0.0-test',
  5,
  1
FROM public.client_accounts ca
WHERE ca.slug = 'business-housing-1'
ON CONFLICT (pool_id, provider_gateway_id) DO UPDATE SET
  status            = 'active',
  is_online         = true,
  client_account_id = EXCLUDED.client_account_id,
  accommodation_id  = EXCLUDED.accommodation_id;

-- ─── 8. Cerradura de prueba ───────────────────────────────────────────────────
-- status='active': cerradura operativa completa.
-- pairing_source='synced': como si se hubiera sincronizado desde la API TTLock.
-- installation_complete=true: instalación finalizada.
-- supports_remote_unlock=true: permite el botón de apertura remota en la UI.

INSERT INTO public.locks (
  client_account_id,
  lock_integration_id,
  provider,
  provider_lock_id,
  name,
  is_online,
  battery_level,
  supports_remote_unlock,
  pool_id,
  status,
  pairing_source,
  installation_complete,
  gateway_id,
  gateway_validation_status
)
SELECT
  ca.id,
  li.id,
  'ttlock',
  'LOCK-DEV-001',
  'Cerradura Prueba Dev',
  true,
  85,
  true,
  (SELECT id FROM public.provider_account_pools WHERE shard_code = 'shard-dev-001'),
  'active',
  'synced',
  true,
  (SELECT id FROM public.gateways
   WHERE  client_account_id  = ca.id
     AND  provider_gateway_id = 'GW-DEV-001'),
  'validated'
FROM public.client_accounts ca
JOIN public.lock_integrations li
  ON  li.client_account_id = ca.id
  AND li.provider           = 'ttlock'
WHERE ca.slug = 'business-housing-1'
ON CONFLICT (lock_integration_id, provider_lock_id) DO UPDATE SET
  status                    = 'active',
  is_online                 = true,
  installation_complete     = true,
  client_account_id         = EXCLUDED.client_account_id,
  pool_id                   = EXCLUDED.pool_id,
  gateway_id                = EXCLUDED.gateway_id,
  gateway_validation_status = 'validated';

-- ─── 9. Vínculo gateway ↔ lock (gateway_lock_links) ──────────────────────────
-- Inserta solo si no existe ya un vínculo activo para esta lock.
-- La invariante del sistema es: máximo 1 vínculo activo por lock.

INSERT INTO public.gateway_lock_links (
  gateway_id,
  lock_id,
  client_account_id,
  is_active,
  physical_validation_status,
  last_validated_at
)
SELECT
  g.id,
  l.id,
  ca.id,
  true,
  'validated',
  now()
FROM public.client_accounts ca
JOIN public.lock_integrations li
  ON  li.client_account_id = ca.id AND li.provider = 'ttlock'
JOIN public.locks l
  ON  l.lock_integration_id  = li.id
  AND l.provider_lock_id     = 'LOCK-DEV-001'
JOIN public.gateways g
  ON  g.client_account_id   = ca.id
  AND g.provider_gateway_id = 'GW-DEV-001'
WHERE ca.slug = 'business-housing-1'
  AND NOT EXISTS (
        SELECT 1
        FROM   public.gateway_lock_links gll
        WHERE  gll.lock_id   = l.id
          AND  gll.is_active = true
      );

-- ─── 10. Actualizar gateway_link_id en la cerradura ──────────────────────────
-- Denormalización para joins rápidos: locks.gateway_link_id apunta al vínculo activo.
-- Nota: Postgres NO permite referenciar el alias del target de UPDATE dentro de
-- JOINs del FROM clause, por lo que se usa una CTE para resolver lock_id+link_id
-- antes del UPDATE.

WITH target AS (
  SELECT l.id AS lock_id, gll.id AS link_id
  FROM   public.locks                l
  JOIN   public.lock_integrations    li  ON li.id  = l.lock_integration_id
  JOIN   public.client_accounts      ca  ON ca.id  = l.client_account_id
  JOIN   public.gateway_lock_links   gll ON gll.lock_id = l.id AND gll.is_active = true
  WHERE  l.provider_lock_id   = 'LOCK-DEV-001'
    AND  ca.slug              = 'business-housing-1'
    AND  l.gateway_link_id    IS NULL
)
UPDATE public.locks
SET    gateway_link_id = target.link_id
FROM   target
WHERE  locks.id = target.lock_id;

-- ─── Verificación ─────────────────────────────────────────────────────────────

SELECT 'SAL seed completado' AS status;

SELECT
  ca.slug                              AS cliente,
  pap.shard_code,
  paa.status                           AS asignacion,
  sss.status                           AS suscripcion,
  li.status                            AS integracion,
  li.installation_status,
  (SELECT COUNT(*) FROM public.gateways g
   WHERE g.client_account_id = ca.id AND g.status = 'active')
                                       AS gateways_activos,
  (SELECT COUNT(*) FROM public.locks lk
   JOIN public.lock_integrations li2 ON li2.id = lk.lock_integration_id
   WHERE li2.client_account_id = ca.id AND lk.status = 'active')
                                       AS locks_activas
FROM public.client_accounts ca
JOIN public.provider_account_assignments paa ON paa.client_account_id = ca.id
JOIN public.provider_account_pools       pap ON pap.id                = paa.pool_id
JOIN public.saas_service_subscriptions   sss ON sss.client_account_id = ca.id
JOIN public.saas_services                ss  ON ss.id                 = sss.saas_service_id
                                            AND ss.code               = 'smart_access_lock'
JOIN public.lock_integrations            li  ON li.client_account_id  = ca.id
                                            AND li.provider            = 'ttlock'
WHERE ca.slug = 'business-housing-1';
