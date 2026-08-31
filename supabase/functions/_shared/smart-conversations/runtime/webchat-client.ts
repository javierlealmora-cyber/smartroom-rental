/**
 * webchat-client.ts -- Feature flag y helpers del canal WebChat.
 *
 * WEBCHAT_INTEGRATION_MODE=mock (default) | real
 *
 * En mode=mock: comportamiento actual sin validaciones estrictas de origen.
 * En mode=real: validaciones estrictas de origin/widget key activas.
 *
 * sender_ref WebChat: siempre opaco, formato wc_<32hex>.
 * No contiene telefono, profile_id ni datos PII.
 * No construye JID (@s.whatsapp.net ni @c.us).
 *
 * Privacidad: message_text, sender_ref, profile_id, phone no se loguean.
 * WebChat no decide routing. WebChat no valida identidad.
 * WebChat no crea casos directamente. WebChat no publica Activity Log directamente.
 * WebChat no llama Core real. WebChat no llama IA real.
 * WebChat no llama n8n real. WebChat no llama Wasender.
 * WebChat no accede a conv_wa_sessions.
 *
 * Campos oficiales de cola: attempts, max_retries, next_attempt_at.
 * Nunca attempt_count. Nunca next_retry_at.
 * No introduce WF-02. No introduce conv_help_escalated.
 * No introduce WEAK_MATCH. No introduce UNVERIFIED standalone.
 *
 * Fuente: SmartConversations Fase 10E, rules-31, contract-normalized-message 8.4.
 */

// ---------------------------------------------------------------------------
// Env helper -- Deno en Edge Functions, mockeable en tests
// ---------------------------------------------------------------------------

function _getEnv(key: string): string | undefined {
  if (typeof Deno !== 'undefined') return Deno.env.get(key);
  return undefined;
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type WebchatIntegrationMode = 'mock' | 'real';

export interface WebchatConfig {
  mode:               WebchatIntegrationMode;
  allowedOrigins:     string[];
  widgetPublicKey:    string;
  sessionTtlMinutes:  number;
  rateLimitPerMinute: number;
  maxMessageLength:   number;
}

// ---------------------------------------------------------------------------
// Feature flag
// ---------------------------------------------------------------------------

export function getWebchatIntegrationMode(): WebchatIntegrationMode {
  const raw = _getEnv('WEBCHAT_INTEGRATION_MODE') ?? 'mock';
  return raw === 'real' ? 'real' : 'mock';
}

// ---------------------------------------------------------------------------
// Configuracion
// ---------------------------------------------------------------------------

export function readWebchatConfig(): WebchatConfig {
  const mode = getWebchatIntegrationMode();

  const rawOrigins = _getEnv('WEBCHAT_ALLOWED_ORIGINS') ?? '';
  const allowedOrigins = rawOrigins
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const widgetPublicKey    = _getEnv('WEBCHAT_WIDGET_PUBLIC_KEY') ?? '';
  const sessionTtlMinutes  = parseInt(_getEnv('WEBCHAT_SESSION_TTL_MINUTES') ?? '120', 10);
  const rateLimitPerMinute = parseInt(_getEnv('WEBCHAT_RATE_LIMIT_PER_MINUTE') ?? '30', 10);
  const maxMessageLength   = parseInt(_getEnv('WEBCHAT_MAX_MESSAGE_LENGTH') ?? '2000', 10);

  return {
    mode,
    allowedOrigins,
    widgetPublicKey,
    sessionTtlMinutes:   isNaN(sessionTtlMinutes)  ? 120  : sessionTtlMinutes,
    rateLimitPerMinute:  isNaN(rateLimitPerMinute) ? 30   : rateLimitPerMinute,
    maxMessageLength:    isNaN(maxMessageLength)   ? 2000 : maxMessageLength,
  };
}

// ---------------------------------------------------------------------------
// sender_ref opaco WebChat -- nunca expone telefono ni PII
// ---------------------------------------------------------------------------

export function generateWebchatSenderRef(): string {
  const id = typeof crypto !== 'undefined'
    ? crypto.randomUUID().replace(/-/g, '')
    : Math.random().toString(36).slice(2).padEnd(32, '0');
  return 'wc_' + id;
}

export function isOpaqueSenderRef(ref: string): boolean {
  return /^wc_[0-9a-f]{32}$/i.test(ref);
}

// ---------------------------------------------------------------------------
// Validacion de origin
// ---------------------------------------------------------------------------

export function validateOrigin(origin: string, allowedOrigins: string[]): boolean {
  if (!origin) return true;              // sin origin: server-side, permitido
  if (allowedOrigins.length === 0) return true;  // lista vacia: cualquier origin
  return allowedOrigins.includes(origin);
}

// ---------------------------------------------------------------------------
// TTL de sesion
// ---------------------------------------------------------------------------

export function getSessionExpiresAt(ttlMinutes: number): string {
  return new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
}
