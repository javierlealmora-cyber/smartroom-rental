-- =============================================================================
-- SmartConversations Fase 11B2B — Remediación de seguridad (local/test only)
-- Migración: 20260721000001_sc_security_remediation_b2b.sql
--
-- Cambios incluidos:
--   1. conv_wc_configs: widget_public_key, auth_mode, rate_limit_mode, expires_at
--   2. conv_sessions:   expires_at (TTL de sesión persistido)
--   3. REVOKE directo sobre anon/authenticated en todas las tablas conv_*
--   4. Grants explícitos backend (service_role)
--   5. conv_rate_limit_buckets: tabla de rate limiting para poll/session
--   6. increment_rate_limit_bucket: función atómica de incremento
--
-- RESTRICCIONES:
--   - NO modificar migraciones históricas
--   - NO crear policies anon/authenticated (USING true) sobre conv_*
--   - NO aplicar en Supabase remoto sin haber validado localmente
--   - Fase 11B2B: local/test únicamente
--
-- ROLLBACK: ver docs/smart-conversations/security/phase-11b2b-rollback.md
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. conv_wc_configs: columnas de seguridad
-- ---------------------------------------------------------------------------

-- widget_public_key: identificador público del tenant para el widget WebChat.
-- El widget envía este valor en lugar de client_account_id.
-- La EF conv-web-session lo usa para resolver client_account_id desde DB.
-- En mode=real: OBLIGATORIO. En mode=mock/local: opcional (legacy fallback).
ALTER TABLE conv_wc_configs
  ADD COLUMN IF NOT EXISTS widget_public_key  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS auth_mode          TEXT NOT NULL DEFAULT 'legacy'
                           CHECK (auth_mode IN ('legacy', 'signed_token')),
  ADD COLUMN IF NOT EXISTS rate_limit_mode    TEXT NOT NULL DEFAULT 'mock'
                           CHECK (rate_limit_mode IN ('mock', 'database'));

COMMENT ON COLUMN conv_wc_configs.widget_public_key IS
  'Identificador público del widget para resolver tenant. No es la service_role key. Opaco, único por tenant.';
COMMENT ON COLUMN conv_wc_configs.auth_mode IS
  'Modo de autenticación del token de sesión WebChat. legacy: sin token. signed_token: HMAC-SHA256.';
COMMENT ON COLUMN conv_wc_configs.rate_limit_mode IS
  'Modo de rate limiting. mock: sin límite (solo local). database: conteo real en conv_messages.';

-- Índice para lookup eficiente por widget_public_key (usado en conv-web-session)
CREATE INDEX IF NOT EXISTS idx_conv_wc_configs_widget_key
  ON conv_wc_configs (widget_public_key)
  WHERE widget_public_key IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. conv_sessions: columna expires_at
-- ---------------------------------------------------------------------------

-- expires_at: TTL de sesión WebChat persistido en DB.
-- Permite assertSessionOwnership verificar expiración sin parámetros externos.
-- En WhatsApp: NULL (las sesiones WA no expiran por TTL).
-- En WebChat:  calculated at creation = NOW() + WEBCHAT_SESSION_TTL_MINUTES.
ALTER TABLE conv_sessions
  ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ;

COMMENT ON COLUMN conv_sessions.expires_at IS
  'Expiración de la sesión WebChat. NULL para WhatsApp. Conv-web-session la establece al crear.';

CREATE INDEX IF NOT EXISTS idx_conv_sessions_expires_at
  ON conv_sessions (expires_at)
  WHERE expires_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. REVOKE directo sobre anon/authenticated en todas las tablas conv_*
--
-- Justificación (documentada en target-database-access-model.md):
--   - Las 8 tablas conv_* son internal_only.
--   - No existe acceso frontend directo legítimo.
--   - Todas las EFs usan service_role (BYPASSRLS).
--   - Las policies "service_role only" ya bloquean anon/authenticated via RLS.
--   - REVOKE explícito es defense-in-depth adicional:
--     previene acceso si RLS se desactiva accidentalmente en el futuro.
-- ---------------------------------------------------------------------------

-- conv_service_activations
REVOKE SELECT, INSERT, UPDATE, DELETE
  ON conv_service_activations
  FROM anon, authenticated;

-- conv_wa_sessions
REVOKE SELECT, INSERT, UPDATE, DELETE
  ON conv_wa_sessions
  FROM anon, authenticated;

-- conv_wc_configs
REVOKE SELECT, INSERT, UPDATE, DELETE
  ON conv_wc_configs
  FROM anon, authenticated;

-- conv_sessions
REVOKE SELECT, INSERT, UPDATE, DELETE
  ON conv_sessions
  FROM anon, authenticated;

-- conv_cases
REVOKE SELECT, INSERT, UPDATE, DELETE
  ON conv_cases
  FROM anon, authenticated;

-- conv_messages
REVOKE SELECT, INSERT, UPDATE, DELETE
  ON conv_messages
  FROM anon, authenticated;

-- conv_send_queue
REVOKE SELECT, INSERT, UPDATE, DELETE
  ON conv_send_queue
  FROM anon, authenticated;

-- conv_admin_notifications
REVOKE SELECT, INSERT, UPDATE, DELETE
  ON conv_admin_notifications
  FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Grants explícitos backend (service_role)
--
-- Supabase garantiza estos grants por defecto, pero se documentan
-- explícitamente como parte del modelo de permisos verificado.
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE
  ON conv_service_activations,
     conv_wa_sessions,
     conv_wc_configs,
     conv_sessions,
     conv_cases,
     conv_messages,
     conv_send_queue,
     conv_admin_notifications
  TO service_role;

-- ---------------------------------------------------------------------------
-- 5. conv_rate_limit_buckets
--
-- Justificación de nueva tabla (documentada en target-database-access-model.md §8):
--   - conv_messages: válida para rate limit de mensajes (dirección inbound).
--   - conv_sessions: válida para rate limit de session creation (created_at count).
--   - Las operaciones de POLL son reads puros: no crean conv_messages ni
--     modifican conv_sessions. No existe tabla preexistente compatible.
--   - Una tabla dedicada permite control atómico sin PII y con TTL.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS conv_rate_limit_buckets (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id   UUID        NOT NULL,             -- tenant (sin PII)
  bucket_key          TEXT        NOT NULL,             -- hash(tenant:session:operation)
  operation           TEXT        NOT NULL              -- 'poll', 'session', 'message'
                      CHECK (operation IN ('poll', 'session', 'message')),
  window_start        TIMESTAMPTZ NOT NULL,             -- inicio de la ventana
  request_count       INTEGER     NOT NULL DEFAULT 1
                      CHECK (request_count >= 0),
  expires_at          TIMESTAMPTZ NOT NULL,             -- para cleanup automático
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Un bucket por (tenant, clave, ventana)
  UNIQUE (bucket_key, window_start)
);

-- Índices para operaciones de rate limit
CREATE INDEX IF NOT EXISTS idx_rl_buckets_key_window
  ON conv_rate_limit_buckets (bucket_key, window_start DESC);

CREATE INDEX IF NOT EXISTS idx_rl_buckets_expires
  ON conv_rate_limit_buckets (expires_at)
  WHERE expires_at < now() + INTERVAL '1 hour';

CREATE INDEX IF NOT EXISTS idx_rl_buckets_tenant
  ON conv_rate_limit_buckets (client_account_id);

-- RLS: solo backend (service_role)
ALTER TABLE conv_rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_rate_limit_buckets: service_role only"
  ON conv_rate_limit_buckets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- REVOKE para anon/authenticated (defense-in-depth)
REVOKE SELECT, INSERT, UPDATE, DELETE
  ON conv_rate_limit_buckets
  FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON conv_rate_limit_buckets
  TO service_role;

COMMENT ON TABLE conv_rate_limit_buckets IS
  'Buckets de rate limiting para operaciones WebChat (poll, session, message). Sin PII. Solo backend.';

COMMENT ON COLUMN conv_rate_limit_buckets.bucket_key IS
  'Clave del bucket: derivada de tenant:session:operation. No contiene valores PII.';

-- ---------------------------------------------------------------------------
-- 6. Función increment_rate_limit_bucket (atómica)
--
-- INSERT en la ventana actual o UPDATE del contador existente.
-- Usa ON CONFLICT (bucket_key, window_start) DO UPDATE para atomicidad.
-- SET search_path fijado como best practice (SECURITY DEFINER no necesario).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION increment_rate_limit_bucket(
  p_client_account_id  UUID,
  p_bucket_key         TEXT,
  p_operation          TEXT,
  p_window_start       TIMESTAMPTZ,
  p_expires_at         TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE SQL
SET search_path = public
AS $$
  INSERT INTO conv_rate_limit_buckets
    (client_account_id, bucket_key, operation, window_start, request_count, expires_at)
  VALUES
    (p_client_account_id, p_bucket_key, p_operation, p_window_start, 1, p_expires_at)
  ON CONFLICT (bucket_key, window_start) DO UPDATE
    SET request_count = conv_rate_limit_buckets.request_count + 1,
        updated_at    = now()
  RETURNING request_count;
$$;

-- Grants para la función
GRANT EXECUTE ON FUNCTION increment_rate_limit_bucket(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ)
  TO service_role;

REVOKE EXECUTE ON FUNCTION increment_rate_limit_bucket(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ)
  FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Cleanup de buckets expirados (función de mantenimiento)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cleanup_rate_limit_buckets()
RETURNS INTEGER
LANGUAGE SQL
SET search_path = public
AS $$
  WITH deleted AS (
    DELETE FROM conv_rate_limit_buckets
    WHERE expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER FROM deleted;
$$;

GRANT EXECUTE ON FUNCTION cleanup_rate_limit_buckets()
  TO service_role;

REVOKE EXECUTE ON FUNCTION cleanup_rate_limit_buckets()
  FROM anon, authenticated;

-- =============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN (ejecutar manualmente en local)
-- =============================================================================

-- 1. Verificar que widget_public_key existe en conv_wc_configs:
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'conv_wc_configs' AND column_name = 'widget_public_key';

-- 2. Verificar REVOKE aplicado (anon no puede SELECT):
--    SET ROLE anon;
--    SELECT COUNT(*) FROM conv_sessions;  -- debe fallar con permiso denegado
--    RESET ROLE;

-- 3. Verificar función increment_rate_limit_bucket:
--    SELECT increment_rate_limit_bucket(
--      gen_random_uuid(), 'test:session:poll', 'poll', now(), now() + interval '1 minute'
--    );

-- =============================================================================
-- NOTA: Este es el último bloque. Rollback en phase-11b2b-rollback.md.
-- =============================================================================
