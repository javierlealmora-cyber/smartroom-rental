-- ============================================================
-- SmartConversations — Migración de Seguridad 11B3
-- 20260723000001_sc_security_b3.sql
-- ============================================================
-- Alcance:
--   1. Idempotencia de mensajes WebChat: client_message_id en conv_messages
--   2. Referencia segura de webhook_secret: webhook_secret_prev para rotación
--   3. Purga de raw_payload: función de retención controlada
--   4. FORCE ROW LEVEL SECURITY: SEC-001 (defense-in-depth)
--   5. EF internal: get_wa_webhook_secret (acceso exclusivo service_role)
--
-- NO modifica migraciones históricas.
-- NO añade acceso anon/authenticated a conv_*.
-- NO elimina webhook_secret existente (migración progresiva).
-- Toda función SECURITY DEFINER tiene SET search_path = public.
-- ============================================================

BEGIN;

-- ── 1. Idempotencia: client_message_id en conv_messages ────────────────────
-- SEC-027: permite deduplicar mensajes WebChat por clave de idempotencia del cliente.
-- Aislado por client_account_id + session_id + client_message_id.
-- Constraint UNIQUE evita duplicados incluso en condiciones de carrera.

ALTER TABLE public.conv_messages
  ADD COLUMN IF NOT EXISTS client_message_id TEXT;

-- Índice único parcial: solo cuando client_message_id no es NULL.
-- Garantiza unicidad per-tenant per-sesión cuando el cliente envía el ID.
CREATE UNIQUE INDEX IF NOT EXISTS
  conv_messages_idempotency_idx
  ON public.conv_messages (client_account_id, session_id, client_message_id)
  WHERE client_message_id IS NOT NULL;

COMMENT ON COLUMN public.conv_messages.client_message_id IS
  'Clave de idempotencia generada por el cliente. Si se proporciona, '
  'deduplicación garantizada por client_account_id + session_id + client_message_id. '
  'Fuente: SEC-027, Fase 11B3.';

-- ── 2. Referencia segura de webhook_secret: soporte rotación current/prev ──
-- SEC-005: permite rotación de webhook_secret sin downtime.
-- Estrategia de rotación:
--   a) Escribir nuevo secret en webhook_secret.
--   b) Mover el anterior a webhook_secret_prev.
--   c) Dar un período de gracia (WASENDER_WEBHOOK_PREV_SECRET_GRACE_MINUTES).
--   d) Después del período, poner webhook_secret_prev = NULL.
-- La EF verifica current primero, luego prev durante período de gracia.

ALTER TABLE public.conv_wa_sessions
  ADD COLUMN IF NOT EXISTS webhook_secret_prev TEXT,
  ADD COLUMN IF NOT EXISTS webhook_secret_rotated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.conv_wa_sessions.webhook_secret_prev IS
  'Secret anterior de webhook para soporte de rotación. '
  'Válido solo durante el período de gracia definido. '
  'Poner NULL después del período de gracia. Fuente: SEC-005, Fase 11B3.';

COMMENT ON COLUMN public.conv_wa_sessions.webhook_secret_rotated_at IS
  'Timestamp de la última rotación de webhook_secret. '
  'Usado para controlar el período de gracia del secret anterior.';

-- ── 3. RPC segura para obtener webhook_secret (acceso backend únicamente) ──
-- Esta función centraliza el acceso al secret y aplica tenant isolation.
-- Solo accesible con service_role (REVOKE de anon y authenticated).
-- SECURITY DEFINER con search_path fijo.

CREATE OR REPLACE FUNCTION public.get_wa_webhook_secret(
  p_session_id UUID,
  p_client_account_id UUID
)
RETURNS TABLE (
  current_secret TEXT,
  previous_secret TEXT,
  rotated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
    SELECT
      s.webhook_secret,
      s.webhook_secret_prev,
      s.webhook_secret_rotated_at
    FROM public.conv_wa_sessions s
    WHERE s.id = p_session_id
      AND s.client_account_id = p_client_account_id
    LIMIT 1;
END;
$$;

-- Revocar acceso público a la función (anon y authenticated no pueden llamarla)
REVOKE ALL ON FUNCTION public.get_wa_webhook_secret(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_wa_webhook_secret(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_wa_webhook_secret(UUID, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_wa_webhook_secret(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.get_wa_webhook_secret IS
  'Acceso centralizado y seguro al webhook_secret de Wasender. '
  'Solo accesible con service_role. '
  'Incluye tenant isolation (client_account_id obligatorio). '
  'Fuente: SEC-005, Fase 11B3.';

-- ── 4. Purga de raw_payload — función de retención controlada ──────────────
-- SEC-007: elimina raw_payload de mensajes más antiguos de X días.
-- Características:
--   - Idempotente: puede ejecutarse múltiples veces sin efecto adicional.
--   - Por lotes (batch_size) para no bloquear tablas.
--   - dry_run=true para inspección sin modificar datos.
--   - Devuelve el número de filas afectadas.
--   - No imprime contenido — devuelve solo métricas.
--   - Conserva metadata necesaria para idempotencia (client_message_id, id).

CREATE OR REPLACE FUNCTION public.purge_old_raw_payloads(
  p_retention_days INT DEFAULT 30,
  p_batch_size INT DEFAULT 500,
  p_dry_run BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  affected_rows BIGINT,
  dry_run BOOLEAN,
  retention_days INT,
  cutoff_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_count BIGINT;
BEGIN
  v_cutoff := NOW() - (p_retention_days || ' days')::INTERVAL;

  IF p_dry_run THEN
    -- Solo cuenta — no modifica
    SELECT COUNT(*)
    INTO v_count
    FROM public.conv_messages
    WHERE created_at < v_cutoff
      AND raw_payload IS NOT NULL;
  ELSE
    -- Purgar en lotes para no bloquear
    WITH target AS (
      SELECT id
      FROM public.conv_messages
      WHERE created_at < v_cutoff
        AND raw_payload IS NOT NULL
      ORDER BY created_at ASC
      LIMIT p_batch_size
    )
    UPDATE public.conv_messages
    SET raw_payload = NULL
    WHERE id IN (SELECT id FROM target);

    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  RETURN QUERY SELECT v_count, p_dry_run, p_retention_days, v_cutoff;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_raw_payloads(INT, INT, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_old_raw_payloads(INT, INT, BOOLEAN) FROM anon;
REVOKE EXECUTE ON FUNCTION public.purge_old_raw_payloads(INT, INT, BOOLEAN) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_raw_payloads(INT, INT, BOOLEAN) TO service_role;

COMMENT ON FUNCTION public.purge_old_raw_payloads IS
  'Purga raw_payload de conv_messages más antiguos que p_retention_days. '
  'Idempotente, por lotes, con dry_run. Solo service_role. '
  'Fuente: SEC-007, Fase 11B3.';

-- ── 5. FORCE ROW LEVEL SECURITY — defense-in-depth ────────────────────────
-- SEC-001: FORCE RLS impide que el propietario de tabla use SET row_security=off.
-- El vector de ataque real requiere credenciales de DB del proyecto (nivel catastrófico
-- independiente). FORCE RLS es buena práctica de defense-in-depth.

ALTER TABLE public.conv_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conv_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conv_wa_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conv_wc_configs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conv_admin_notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conv_send_queue FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conv_case_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.conv_rate_limit_buckets FORCE ROW LEVEL SECURITY;

COMMIT;
