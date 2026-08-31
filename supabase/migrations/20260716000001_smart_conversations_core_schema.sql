-- =============================================================================
-- SmartConversations — Fase 1: Modelo de datos principal
-- Migración: 20260716000001_smart_conversations_core_schema.sql
--
-- Tablas creadas (todas con prefijo conv_):
--   conv_service_activations
--   conv_wa_sessions
--   conv_wc_configs
--   conv_sessions
--   conv_cases
--   conv_messages
--   conv_send_queue
--   conv_admin_notifications
--
-- Separación con SmartRoom Core:
--   - No se crea ni modifica ninguna tabla del Core.
--   - client_account_id (uuid) es el único punto de enlace con el Core.
--   - Las FKs a tablas del Core se implementarán en Fase 9 (Integration API)
--     mediante EFs conv-core-*; no se crean aquí.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. conv_service_activations
--    Nivel 3 de activación: tenant × servicio × canal
--    Fuente: rules-20 §4.1, rules-10 §4.1/4.2/4.3
-- ---------------------------------------------------------------------------

CREATE TABLE conv_service_activations (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id   uuid        NOT NULL,
  service_code        text        NOT NULL
                      CHECK (service_code IN ('conv_incidencias', 'conv_publicaciones', 'conv_ayuda')),
  channel             text        NOT NULL
                      CHECK (channel IN ('whatsapp', 'webchat')),
  is_active           boolean     NOT NULL DEFAULT true,
  config              jsonb,                        -- config por servicio×canal (fallback texts, etc.)
  deactivated_at      timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (client_account_id, service_code, channel)
);

CREATE INDEX idx_conv_svc_act_tenant  ON conv_service_activations (client_account_id);
CREATE INDEX idx_conv_svc_act_active  ON conv_service_activations (client_account_id, channel) WHERE is_active = true;

ALTER TABLE conv_service_activations ENABLE ROW LEVEL SECURITY;

-- Política: solo service_role puede leer/escribir directamente.
-- EFs conv-* usan service_role; n8n nunca accede directamente.
CREATE POLICY "conv_service_activations: service_role only"
  ON conv_service_activations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE conv_service_activations IS
  'Activación de servicios conversacionales por tenant × servicio × canal. Nivel 3 de activación (rules-20).';

-- ---------------------------------------------------------------------------
-- 2. conv_wa_sessions
--    Nivel 2 de activación: sesión Wasender por tenant
--    Fuente: rules-20 §4.3/4.4, rules-30, skill-whatsapp-wasender-integration
-- ---------------------------------------------------------------------------

CREATE TABLE conv_wa_sessions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id     uuid        NOT NULL UNIQUE,      -- un número por tenant (rules-10 §3.4)
  wasender_session_id   text        NOT NULL UNIQUE,
  status                text        NOT NULL DEFAULT 'disconnected'
                        CHECK (status IN ('disconnected', 'connecting', 'active', 'error')),
  webhook_secret        text        NOT NULL,             -- HMAC secret para verificar firma Wasender
  -- La API key de Wasender nunca se almacena aquí en texto claro.
  -- Se referencia como nombre de secreto (Supabase Vault en Fase 9).
  api_key_secret_name   text,                            -- nombre del secreto en Vault
  connected_at          timestamptz,
  disconnected_at       timestamptz,
  last_webhook_at       timestamptz,
  config                jsonb,                           -- metadatos adicionales (phone, display_name)
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conv_wa_sessions_tenant ON conv_wa_sessions (client_account_id);
CREATE INDEX idx_conv_wa_sessions_status ON conv_wa_sessions (status);

ALTER TABLE conv_wa_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_wa_sessions: service_role only"
  ON conv_wa_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE conv_wa_sessions IS
  'Sesión Wasender por tenant. Nivel 2 de activación WhatsApp (rules-20 §4.4). La API key se referencia por nombre de secreto, nunca en texto claro.';

COMMENT ON COLUMN conv_wa_sessions.webhook_secret IS
  'HMAC secret para verificar la firma X-Wasender-Signature. Gestionado por service_role.';

COMMENT ON COLUMN conv_wa_sessions.api_key_secret_name IS
  'Nombre del secreto en Supabase Vault que contiene la API key de Wasender. No es la API key en sí.';

-- ---------------------------------------------------------------------------
-- 3. conv_wc_configs
--    Nivel 2 de activación: configuración del canal WebChat por tenant
--    Fuente: rules-20 §4.7, rules-31
-- ---------------------------------------------------------------------------

CREATE TABLE conv_wc_configs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id   uuid        NOT NULL UNIQUE,
  is_active           boolean     NOT NULL DEFAULT false,
  allowed_origins     text[]      NOT NULL DEFAULT '{}',  -- CORS origins permitidos
  widget_title        text,
  widget_color        text,                               -- color hex del widget (UX)
  config              jsonb,                              -- configuración visual extendida
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conv_wc_configs_tenant ON conv_wc_configs (client_account_id);
CREATE INDEX idx_conv_wc_configs_active ON conv_wc_configs (client_account_id) WHERE is_active = true;

ALTER TABLE conv_wc_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_wc_configs: service_role only"
  ON conv_wc_configs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- TODO (Fase 7 — WebChat): añadir política de lectura pública limitada
-- para que conv-web-session pueda verificar allowed_origins con anon key.
-- Nunca exponer config ni campos de configuración sensibles a anon.

COMMENT ON TABLE conv_wc_configs IS
  'Configuración del canal WebChat por tenant. Nivel 2 de activación WebChat (rules-20 §4.7).';

-- ---------------------------------------------------------------------------
-- 4. conv_sessions
--    Tabla central de sesiones conversacionales
--    Fuente: contract-case-state-machine §5.1, skill-data-model-and-state §6.1,
--            rules-40 §4.1/4.8, rules-80 §4.8
-- ---------------------------------------------------------------------------

CREATE TABLE conv_sessions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id     uuid        NOT NULL,
  channel               text        NOT NULL
                        CHECK (channel IN ('whatsapp', 'webchat')),
  -- sender_ref: identificador del remitente dentro del canal.
  --   WhatsApp: teléfono normalizado en formato internacional sin @c.us (p.ej. "+34612345678").
  --   WebChat: referencia opaca de sesión o widget.
  -- Dato sensible: no se envía a n8n, IA ni logs. Solo EFs con service_role lo usan.
  -- @c.us se añade únicamente en conv-send-wa al construir el campo `to` para Wasender.
  sender_ref            text        NOT NULL,
  state                 text        NOT NULL DEFAULT 'NEW'
                        CHECK (state IN (
                          'NEW', 'SELECTING_SERVICE', 'IN_SERVICE',
                          'AWAITING_USER', 'ESCALATED', 'IDLE', 'EXPIRED', 'CLOSED'
                        )),
  identity_level        text        NOT NULL DEFAULT 'NO_MATCH'
                        CHECK (identity_level IN (
                          'NO_MATCH', 'MATCH_INACTIVE',
                          'PARTIAL_MATCH_ACTIVE', 'STRONG_MATCH_ACTIVE', 'UNVERIFIED_LEAD'
                        )),
  -- profile_id: almacenado por EF tras validación; NUNCA reenviado a n8n (rules-80 §3.4)
  profile_id            uuid,
  -- identity_data: flags y datos declarados por el usuario; sin phone_number en texto claro
  identity_data         jsonb       NOT NULL DEFAULT '{}',
  -- identity_attempts: contador de intentos de WF-IDENTITY (max 3, rules-40 §3.7)
  identity_attempts     integer     NOT NULL DEFAULT 0
                        CHECK (identity_attempts >= 0 AND identity_attempts <= 3),
  active_service_code   text
                        CHECK (active_service_code IN ('conv_incidencias', 'conv_publicaciones', 'conv_ayuda')),
  active_case_id        uuid,                -- FK a conv_cases; se añade constraint tras crear conv_cases
  open_cases_ids        uuid[]      NOT NULL DEFAULT '{}',
  last_active_at        timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  -- Una sesión por canal por usuario en el mismo tenant
  UNIQUE (client_account_id, channel, sender_ref)
);

CREATE INDEX idx_conv_sessions_tenant        ON conv_sessions (client_account_id);
CREATE INDEX idx_conv_sessions_active_case   ON conv_sessions (active_case_id) WHERE active_case_id IS NOT NULL;
CREATE INDEX idx_conv_sessions_state         ON conv_sessions (state);
CREATE INDEX idx_conv_sessions_last_active   ON conv_sessions (last_active_at);

ALTER TABLE conv_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_sessions: service_role only"
  ON conv_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- TODO (Fase 7 — WebChat/Realtime): política de lectura restringida para anon
-- limitada a columnas no sensibles (state, identity_level) por session_id verificado.
-- NUNCA exponer profile_id, identity_data ni sender_ref a clientes no autenticados.

COMMENT ON TABLE conv_sessions IS
  'Sesión conversacional por canal por usuario. Estado de enrutado y punteros a casos activos. EFs con service_role son el único actor autorizado para UPDATE de state e identity_level.';

COMMENT ON COLUMN conv_sessions.sender_ref IS
  'Identificador del remitente dentro del canal. WhatsApp: teléfono normalizado internacional sin @c.us. WebChat: referencia opaca de sesión o widget. Dato sensible: no se envía a n8n, IA ni logs. Solo EFs con service_role lo usan.';

COMMENT ON COLUMN conv_sessions.profile_id IS
  'FK al perfil en SmartRoom Core. Almacenado por EF tras conv-core-validate-identity. NUNCA se pasa a n8n ni a la IA.';

COMMENT ON COLUMN conv_sessions.identity_data IS
  'Datos declarados por el usuario durante identificación progresiva. No almacena phone_number en texto claro. Solo accesible por EFs con service_role.';

-- ---------------------------------------------------------------------------
-- 5. conv_cases
--    Tabla central de casos conversacionales
--    Fuente: contract-case-state-machine §5.3/6, skill-data-model-and-state §6.2
-- ---------------------------------------------------------------------------

CREATE TABLE conv_cases (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id   uuid        NOT NULL,
  session_id          uuid        NOT NULL REFERENCES conv_sessions(id),
  service_code        text        NOT NULL
                      CHECK (service_code IN ('conv_incidencias', 'conv_publicaciones', 'conv_ayuda')),
  status              text        NOT NULL DEFAULT 'open'
                      CHECK (status IN (
                        'open', 'waiting_user', 'waiting_internal',
                        'escalated', 'resolved', 'closed'
                      )),
  case_ref_type       text        NOT NULL
                      CHECK (case_ref_type IN ('incident', 'lead', 'help_ticket')),
  -- case_ref: referencia legible asignada por el Core (INC-2026-NNNN, LEAD-2026-NNNN)
  case_ref            text,
  summary             text,
  -- metadata: datos del caso sin PII estructurada; contiene urgency, incident_type, interest_type…
  metadata            jsonb       NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conv_cases_tenant    ON conv_cases (client_account_id);
CREATE INDEX idx_conv_cases_session   ON conv_cases (session_id);
CREATE INDEX idx_conv_cases_status    ON conv_cases (status);
CREATE INDEX idx_conv_cases_service   ON conv_cases (service_code);
CREATE INDEX idx_conv_cases_open      ON conv_cases (client_account_id, status) WHERE status NOT IN ('resolved', 'closed');

ALTER TABLE conv_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_cases: service_role only"
  ON conv_cases
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE conv_cases IS
  'Caso conversacional por intención del usuario. Estados: open, waiting_user, waiting_internal, escalated, resolved, closed. "closed" es final (contract-case-state-machine).';

COMMENT ON COLUMN conv_cases.status IS
  'Estado del caso. Transiciones solo ejecutadas por EFs con service_role. closed es un estado final absoluto.';

-- Ahora que conv_cases existe, añadir la FK de conv_sessions.active_case_id
ALTER TABLE conv_sessions
  ADD CONSTRAINT fk_conv_sessions_active_case
  FOREIGN KEY (active_case_id) REFERENCES conv_cases(id)
  DEFERRABLE INITIALLY DEFERRED;

-- ---------------------------------------------------------------------------
-- 6. conv_messages
--    Registro de todos los mensajes (entrantes y salientes)
--    Fuente: skill-data-model-and-state §6.5, rules-80 §4.7, rules-90 §4.2
-- ---------------------------------------------------------------------------

CREATE TABLE conv_messages (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id     uuid        NOT NULL,
  session_id            uuid        NOT NULL REFERENCES conv_sessions(id),
  case_id               uuid        REFERENCES conv_cases(id),
  channel               text        NOT NULL
                        CHECK (channel IN ('whatsapp', 'webchat')),
  sender_type           text        NOT NULL
                        CHECK (sender_type IN ('user', 'bot', 'admin')),
  direction             text        NOT NULL
                        CHECK (direction IN ('inbound', 'outbound')),
  text                  text,
  status                text        NOT NULL DEFAULT 'received'
                        CHECK (status IN ('received', 'processing', 'sent', 'failed')),
  -- wasender_message_id: solo para WhatsApp; NULL para WebChat
  wasender_message_id   text,
  -- raw_payload: payload completo del webhook; retención 30 días (rules-80 §4.7)
  -- NUNCA exponer a n8n ni a la IA
  raw_payload           jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Índice parcial de deduplicación para WhatsApp (skill-data-model-and-state §6.5)
-- Excluye NULL para que WebChat no interfiera (índice parcial, no constraint convencional).
CREATE UNIQUE INDEX uq_wa_message_id
  ON conv_messages (client_account_id, wasender_message_id)
  WHERE wasender_message_id IS NOT NULL;

CREATE INDEX idx_conv_messages_session    ON conv_messages (session_id);
CREATE INDEX idx_conv_messages_case       ON conv_messages (case_id) WHERE case_id IS NOT NULL;
CREATE INDEX idx_conv_messages_status     ON conv_messages (status);
CREATE INDEX idx_conv_messages_created    ON conv_messages (created_at);
-- Índice para el job de reconciliación (rules-90 §4.4)
CREATE INDEX idx_conv_messages_reconcile  ON conv_messages (client_account_id, status, created_at)
  WHERE status = 'received';

ALTER TABLE conv_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_messages: service_role only"
  ON conv_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- TODO (Fase 7 — WebChat/Realtime): política de lectura por session_id verificado.
-- NUNCA exponer raw_payload a clientes. Columnas seguras: id, text, sender_type,
-- direction, status, created_at.

COMMENT ON TABLE conv_messages IS
  'Registro de mensajes entrantes y salientes. raw_payload se elimina a los 30 días (rules-80). Deduplicación WhatsApp por uq_wa_message_id (índice parcial, excluye NULL de WebChat).';

COMMENT ON COLUMN conv_messages.raw_payload IS
  'Payload completo del webhook (Wasender) o mensaje WebChat. Retención: 30 días. Solo accesible con service_role. NUNCA pasar a n8n ni a la IA.';

-- ---------------------------------------------------------------------------
-- 7. conv_send_queue
--    Cola de reintentos de envío saliente al usuario
--    Fuente: rules-90 §4.2 — DDL OFICIAL; skill-data-model-and-state §6.6
--    NOTA: esta DDL replica exactamente la especificada en rules-90 §4.2.
-- ---------------------------------------------------------------------------

CREATE TABLE conv_send_queue (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid        NOT NULL REFERENCES conv_sessions(id),
  client_account_id   uuid        NOT NULL,
  channel             text        NOT NULL
                      CHECK (channel IN ('whatsapp', 'webchat')),
  message_id          uuid        REFERENCES conv_messages(id),
  payload             jsonb       NOT NULL,   -- datos de envío (sin PII en texto claro)
  attempts            integer     NOT NULL DEFAULT 0,
  max_retries         integer     NOT NULL DEFAULT 3,
  next_attempt_at     timestamptz NOT NULL DEFAULT now(),
  last_error          text,
  status              text        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'succeeded', 'failed')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Nomenclatura oficial (rules-90 §4.2): "next_attempt_at" y "attempts".
-- Cualquier variante alternativa queda fuera de la especificación.

CREATE INDEX idx_conv_send_queue_status       ON conv_send_queue (status);
CREATE INDEX idx_conv_send_queue_next_attempt ON conv_send_queue (next_attempt_at) WHERE status = 'pending';
CREATE INDEX idx_conv_send_queue_session      ON conv_send_queue (session_id);
-- Índice para el job de reconciliación WF-C00-RECONCILE
CREATE INDEX idx_conv_send_queue_pending_due  ON conv_send_queue (next_attempt_at, client_account_id)
  WHERE status = 'pending';

ALTER TABLE conv_send_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_send_queue: service_role only"
  ON conv_send_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE conv_send_queue IS
  'Cola de reintentos de mensajes salientes al usuario. Backoff: 1s→5s→30s, max 3 intentos. Solo para mensajes salientes, no para reintentos del Core (rules-90 §4.2).';

COMMENT ON COLUMN conv_send_queue.attempts IS
  'Número de intentos realizados. Nomenclatura según rules-90 §4.2.';

COMMENT ON COLUMN conv_send_queue.next_attempt_at IS
  'Timestamp del próximo intento de envío. Nomenclatura según rules-90 §4.2.';

-- ---------------------------------------------------------------------------
-- 8. conv_admin_notifications
--    Alertas y notificaciones internas al admin
--    Fuente: rules-90 §4.8
--    Restricción: NUNCA incluir PII del inquilino.
-- ---------------------------------------------------------------------------

CREATE TABLE conv_admin_notifications (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_account_id   uuid        NOT NULL,
  event_type          text        NOT NULL
                      CHECK (event_type IN (
                        'wa_session_disconnected',
                        'send_queue_failed',
                        'messages_stalled',
                        'core_api_errors',
                        'reconcile_job_stalled',
                        'case_auto_escalated',
                        'delivery_failed_batch'
                      )),
  severity            text        NOT NULL DEFAULT 'medium'
                      CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  -- context: datos no PII del evento (session_id opaco, case_id, counts, timestamps)
  context             jsonb       NOT NULL DEFAULT '{}',
  is_read             boolean     NOT NULL DEFAULT false,
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conv_admin_notif_tenant   ON conv_admin_notifications (client_account_id);
CREATE INDEX idx_conv_admin_notif_unread   ON conv_admin_notifications (client_account_id, is_read)
  WHERE is_read = false;
CREATE INDEX idx_conv_admin_notif_severity ON conv_admin_notifications (severity, created_at);

ALTER TABLE conv_admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conv_admin_notifications: service_role only"
  ON conv_admin_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- TODO (Fase 9 — Panel admin): política de lectura para rol 'admin' del tenant
-- filtrada por client_account_id. No antes de que el panel esté implementado.

COMMENT ON TABLE conv_admin_notifications IS
  'Notificaciones internas al admin. NUNCA incluir PII del inquilino. context contiene solo IDs opacos, contadores y enums (rules-90 §4.8).';
