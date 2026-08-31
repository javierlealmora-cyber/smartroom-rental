/**
 * webchat-polling.ts -- Tipos y configuracion del polling WebChat.
 *
 * El polling es el mecanismo de recuperacion y fallback ante fallos Realtime.
 * La fuente de verdad es siempre conv_messages (no el payload Realtime).
 *
 * Modos:
 *   WEBCHAT_POLLING_MODE=mock     (default) -- devuelve lista vacia, sin DB
 *   WEBCHAT_POLLING_MODE=database           -- consulta conv_messages real
 *
 * Reglas:
 *   - Solo direction='outbound'
 *   - Solo channel='webchat'
 *   - Solo mensajes de la sesion validada
 *   - Orden estable: created_at ASC, id ASC
 *   - Limite maximo obligatorio (WEBCHAT_POLL_MAX_MESSAGES, default 50)
 *   - Limite por defecto (WEBCHAT_POLL_DEFAULT_MESSAGES, default 20)
 *   - Lookback maximo (WEBCHAT_POLL_MAX_LOOKBACK_HOURS, default 24)
 *   - Cursor: after_created_at + after_message_id (desempate)
 *   - Polling no modifica conv_messages
 *   - Polling no crea eventos Activity Log
 *
 * Campos permitidos en cada mensaje de respuesta:
 *   message_id, direction, sender_type, message_text, created_at, status (si disponible)
 *
 * Campos prohibidos en respuesta:
 *   sender_ref, profile_id, identity_data, raw_payload, phone, room_id,
 *   assignment_id, wasender_message_id, service_role, authorization, token,
 *   client_account_id (por mensaje), session_id (por mensaje)
 *
 * Fuente: SmartConversations Fase 10F, rules-31, rules-80.
 */

// ── Env helper ────────────────────────────────────────────────────────────

function _getEnv(key: string): string | undefined {
  if (typeof Deno !== 'undefined') return Deno.env.get(key);
  return undefined;
}

// ── Tipos exportados ──────────────────────────────────────────────────────

export type WebchatPollingMode = 'mock' | 'database';

export interface WebchatPollingConfig {
  mode:             WebchatPollingMode;
  maxMessages:      number;
  defaultMessages:  number;
  maxLookbackHours: number;
}

/** Mensaje permitido en respuesta de polling. Sin PII ni metadatos internos. */
export interface WebchatPollMessage {
  message_id:   string;
  direction:    'outbound';
  sender_type:  string;
  message_text: string;
  created_at:   string;
  status?:      string;
}

/** Cursor opaco para paginacion determinista. */
export interface WebchatPollCursor {
  after_message_id?: string;
  after_created_at?: string;
}

export interface WebchatPollResult {
  messages:    WebchatPollMessage[];
  next_cursor: WebchatPollCursor;
  has_more:    boolean;
}

// ── Feature flag y config ─────────────────────────────────────────────────

export function getWebchatPollingMode(): WebchatPollingMode {
  const raw = _getEnv('WEBCHAT_POLLING_MODE') ?? 'mock';
  return raw === 'database' ? 'database' : 'mock';
}

export function getWebchatPollingConfig(): WebchatPollingConfig {
  const mode = getWebchatPollingMode();
  const maxMessages     = parseInt(_getEnv('WEBCHAT_POLL_MAX_MESSAGES') ?? '50', 10);
  const defaultMessages = parseInt(_getEnv('WEBCHAT_POLL_DEFAULT_MESSAGES') ?? '20', 10);
  const maxLookbackHours = parseInt(_getEnv('WEBCHAT_POLL_MAX_LOOKBACK_HOURS') ?? '24', 10);
  return {
    mode,
    maxMessages:      isNaN(maxMessages)     ? 50 : maxMessages,
    defaultMessages:  isNaN(defaultMessages) ? 20 : defaultMessages,
    maxLookbackHours: isNaN(maxLookbackHours) ? 24 : maxLookbackHours,
  };
}

// ── Validacion de limite ──────────────────────────────────────────────────

/**
 * Normaliza el limit proporcionado por el widget al rango [1, maxMessages].
 * Un limit invalido (null, 0, negativo, string) devuelve el default.
 */
export function normalizePollingLimit(
  rawLimit: unknown,
  cfg: WebchatPollingConfig,
): number {
  if (rawLimit === null || rawLimit === undefined) return cfg.defaultMessages;
  const n = typeof rawLimit === 'number' ? rawLimit : parseInt(String(rawLimit), 10);
  if (isNaN(n) || n <= 0) return cfg.defaultMessages;
  return Math.min(n, cfg.maxMessages);
}

// ── Constructor de siguiente cursor ──────────────────────────────────────

/**
 * Construye el cursor a partir del ultimo mensaje devuelto.
 * El cursor permite recuperacion determinista en la siguiente llamada.
 */
export function buildNextCursor(lastMessage: WebchatPollMessage): WebchatPollCursor {
  return {
    after_message_id: lastMessage.message_id,
    after_created_at: lastMessage.created_at,
  };
}
