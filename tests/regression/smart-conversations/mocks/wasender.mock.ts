import { TEST_TENANT_A } from '../config/tenants.js';

/**
 * 9 escenarios de Wasender para el regression harness.
 * Ninguno realiza llamadas HTTP reales.
 */

// ── Escenario 1: webhook válido ──────────────────────────────────────────────

export const mockWasenderWebhookValid = {
  session: TEST_TENANT_A.wasender_session_id,
  event: 'message',
  data: {
    id: 'wamid.mock-valid-0001',
    from: '+34600000001',
    type: 'text',
    text: { body: 'Hola, tengo una incidencia' },
    timestamp: 1752653100,
  },
};

// ── Escenario 2: firma inválida ──────────────────────────────────────────────

export const mockWasenderInvalidSignatureHeaders = {
  'x-wasender-signature': 'sha256=invalid-signature-value',
};

// ── Escenario 3: mensaje duplicado ──────────────────────────────────────────

export const mockWasenderWebhookDuplicate = {
  ...mockWasenderWebhookValid,
  data: {
    ...mockWasenderWebhookValid.data,
    id: 'wamid.mock-valid-0001',
  },
};

// ── Escenario 4: envío exitoso ───────────────────────────────────────────────

export const mockWasenderSendSuccess = {
  ok: true,
  status: 200,
  body: {
    success: true,
    messageId: 'wamid.sent-mock-0001',
  },
};

// ── Escenario 5: envío fallido (4xx) ────────────────────────────────────────

export const mockWasenderSendFailure = {
  ok: false,
  status: 400,
  body: {
    success: false,
    error: 'Invalid phone number format',
  },
};

// ── Escenario 6: sesión desconectada ────────────────────────────────────────

export const mockWasenderSessionDisconnected = {
  ok: false,
  status: 401,
  body: {
    success: false,
    error: 'Session disconnected',
    code: 'SESSION_DISCONNECTED',
  },
};

// ── Escenario 7: rate limit ──────────────────────────────────────────────────

export const mockWasenderRateLimit = {
  ok: false,
  status: 429,
  body: {
    success: false,
    error: 'Rate limit exceeded',
    retryAfter: 60,
  },
};

// ── Escenario 8: error 5xx recuperable ──────────────────────────────────────

export const mockWasender5xxError = {
  ok: false,
  status: 503,
  body: {
    success: false,
    error: 'Service temporarily unavailable',
  },
};

// ── Escenario 9: timeout (sin respuesta) ────────────────────────────────────

export const mockWasenderTimeout = {
  simulateTimeout: true,
  timeoutMs: 30_000,
};

// ── Helper: construir cabeceras válidas de webhook ───────────────────────────

export function buildWasenderWebhookHeaders(secret: string, body: string) {
  return {
    'content-type': 'application/json',
    'x-wasender-signature': `sha256=mock-hmac-of-${secret}-${body.length}`,
  };
}
