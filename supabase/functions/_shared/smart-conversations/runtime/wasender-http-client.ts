/**
 * wasender-http-client.ts -- Adapter HTTP controlado para Wasender.
 *
 * WASENDER_INTEGRATION_MODE=mock (default) | real
 *
 * En mode=mock: nunca llama fetch externo. Devuelve respuesta simulada.
 * En mode=real: llama a la API de Wasender via fetch mockeable en tests.
 *
 * JID handling:
 *   - buildWasenderRecipientJid() solo existe aqui -- nunca fuera del adapter.
 *   - @s.whatsapp.net y @c.us nunca se persisten en conv_sessions ni conv_messages.
 *   - JID no se loguea. Telefono no se loguea. message_text no se loguea.
 *
 * Privacidad:
 *   - WASENDER_API_KEY nunca se loguea.
 *   - Authorization nunca se loguea.
 *   - recipient_ref (telefono) no se loguea.
 *   - text (mensaje) no se loguea.
 *
 * Retry: 429 / 5xx / AbortError = retry controlado (max WASENDER_MAX_RETRIES, default 3).
 * 4xx (salvo 429): sin retry.
 * Campos de cola: attempts, max_retries, next_attempt_at -- nunca attempt_count/next_retry_at.
 *
 * Webhook:
 *   - verifyWasenderWebhookSignature() valida HMAC-SHA256.
 *   - normalizeWasenderRemoteJid() elimina @s.whatsapp.net y @c.us.
 *
 * La IA no decide routing. Wasender no valida identidad. Core no conoce Wasender.
 * n8n no envia WhatsApp directamente. Frontend no llama Wasender directamente.
 *
 * Fuente: SmartConversations Fase 10D, rules-90, contract-normalized-message 8.4.
 */

// ---------------------------------------------------------------------------
// Tipos publicos
// ---------------------------------------------------------------------------

export type WasenderIntegrationMode = 'mock' | 'real';

export interface WasenderSendRequest {
  client_account_id:   string;
  wa_session_id:       string;
  /** sender_ref: telefono internacional limpio, sin sufijo JID. */
  recipient_ref:       string;
  /** Texto a enviar. Sensible -- no loguear. */
  text:                string;
  provider_message_id?: string;
}

export interface WasenderSendResponse {
  ok:                   boolean;
  provider_message_id?: string;
  status?:              'sent' | 'queued' | 'failed';
  error_code?:          string;
  retryable?:           boolean;
}

// ---------------------------------------------------------------------------
// Lectura de configuracion -- Deno.env en Edge Functions, stub en tests
// ---------------------------------------------------------------------------

function _getEnv(key: string): string | undefined {
  try {
    // @ts-ignore -- Deno.env disponible en Edge Functions
    if (typeof Deno !== 'undefined') return Deno.env.get(key);
  } catch { /**/ }
  return undefined;
}

export function getWasenderIntegrationMode(): WasenderIntegrationMode {
  const raw = _getEnv('WASENDER_INTEGRATION_MODE') ?? 'mock';
  return raw === 'real' ? 'real' : 'mock';
}

function _getApiKey(): string | null {
  return _getEnv('WASENDER_API_KEY') ?? null;
}

function _getBaseUrl(): string | null {
  return _getEnv('WASENDER_BASE_URL') ?? null;
}

function _getTimeoutMs(): number {
  const raw = _getEnv('WASENDER_TIMEOUT_MS') ?? '8000';
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 8_000;
}

function _getMaxRetries(): number {
  const raw = _getEnv('WASENDER_MAX_RETRIES') ?? '3';
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 3;
}

function _getRetryBackoffMs(): number[] {
  const raw = _getEnv('WASENDER_RETRY_BACKOFF_SECONDS') ?? '1,5,30';
  return raw.split(',').map(s => {
    const n = parseFloat(s.trim());
    return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) : 1000;
  });
}

function _sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// JID handling -- solo dentro de este adapter
// ---------------------------------------------------------------------------

/**
 * buildWasenderRecipientJid -- convierte telefono a JID Wasender/Baileys.
 * Solo se llama justo antes de fetch. NUNCA se loguea, NUNCA se persiste.
 * "+34612345678" -> "34612345678@s.whatsapp.net"
 */
function buildWasenderRecipientJid(recipientRef: string): string {
  const phone = recipientRef.startsWith('+') ? recipientRef.slice(1) : recipientRef;
  return phone + '@s.whatsapp.net';
}

/**
 * normalizeWasenderRemoteJid -- elimina sufijo JID del proveedor.
 * Devuelve telefono en formato internacional con +.
 * Se usa en webhook inbound para obtener sender_ref persistible.
 */
export function normalizeWasenderRemoteJid(remoteJid: string): string {
  let phone = remoteJid ?? '';
  if (phone.includes('@s.whatsapp.net')) phone = phone.split('@s.whatsapp.net')[0];
  if (phone.includes('@c.us'))           phone = phone.split('@c.us')[0];
  if (!phone || phone.length < 7)        return '';
  if (!phone.startsWith('+'))            phone = '+' + phone;
  return phone;
}

// ---------------------------------------------------------------------------
// Verificacion de firma webhook (HMAC-SHA256)
// ---------------------------------------------------------------------------

export async function verifyWasenderWebhookSignature(
  rawBody:   string,
  signature: string,
  secret:    string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const sigHex = signature.startsWith('sha256=') ? signature.slice(7) : signature;
    if (!sigHex || sigHex.length % 2 !== 0) return false;
    const len = Math.floor(sigHex.length / 2);
    const sigBytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      sigBytes[i] = parseInt(sigHex.substring(i * 2, i * 2 + 2), 16);
    }
    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(rawBody));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// sendWasenderMessage -- punto de entrada publico
// ---------------------------------------------------------------------------

export async function sendWasenderMessage(req: WasenderSendRequest): Promise<WasenderSendResponse> {
  const mode = getWasenderIntegrationMode();

  // Mode mock: nunca llama fetch
  if (mode === 'mock') {
    return {
      ok:                   true,
      provider_message_id:  `mock_msg_${Math.random().toString(36).slice(2)}`,
      status:               'sent',
      retryable:            false,
    };
  }

  // Mode real: validar configuracion
  const apiKey = _getApiKey();
  if (!apiKey) {
    return { ok: false, status: 'failed', error_code: 'WASENDER_API_KEY_MISSING', retryable: false };
  }
  const baseUrl = _getBaseUrl();
  if (!baseUrl) {
    return { ok: false, status: 'failed', error_code: 'WASENDER_BASE_URL_MISSING', retryable: false };
  }

  // JID solo se construye aqui, justo antes de enviar -- nunca se persiste
  const recipientJid = buildWasenderRecipientJid(req.recipient_ref);

  return _sendReal(req, apiKey, baseUrl, recipientJid);
}

// ---------------------------------------------------------------------------
// Llamada HTTP real con retry controlado
// ---------------------------------------------------------------------------

async function _sendReal(
  req:          WasenderSendRequest,
  apiKey:       string,
  baseUrl:      string,
  recipientJid: string,
): Promise<WasenderSendResponse> {
  const maxRetries  = _getMaxRetries();
  const maxAttempts = maxRetries + 1;
  const backoffs    = _getRetryBackoffMs();
  const timeoutMs   = _getTimeoutMs();

  // URL del endpoint de envio de mensajes
  const url = `${baseUrl}/api/sendText`;

  // Body: JID solo aqui, no sale del adapter de otra forma
  const body = JSON.stringify({
    session_id: req.wa_session_id,
    to:         recipientJid,
    text:       req.text,
  });

  let lastErrorCode = 'WASENDER_UNKNOWN_ERROR';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch(url, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      // 4xx sin retry (salvo 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return {
          ok:         false,
          status:     'failed',
          error_code: `WASENDER_HTTP_${response.status}`,
          retryable:  false,
        };
      }

      // 429 rate limit: retry
      if (response.status === 429) {
        lastErrorCode = 'WASENDER_RATE_LIMITED';
        if (attempt < maxAttempts - 1) {
          await _sleep(backoffs[attempt] ?? backoffs[backoffs.length - 1] ?? 1000);
          continue;
        }
        return { ok: false, status: 'failed', error_code: 'WASENDER_RATE_LIMITED_EXHAUSTED', retryable: false };
      }

      // 2xx exito
      if (response.ok) {
        let data: Record<string, unknown> = {};
        try { data = await response.json(); } catch { /**/ }
        return {
          ok:                  true,
          status:              'sent',
          provider_message_id: typeof data['messageId'] === 'string' ? data['messageId'] : undefined,
          retryable:           false,
        };
      }

      // 5xx retry
      lastErrorCode = `WASENDER_HTTP_${response.status}`;
      if (attempt < maxAttempts - 1) {
        await _sleep(backoffs[attempt] ?? backoffs[backoffs.length - 1] ?? 1000);
        continue;
      }
      return { ok: false, status: 'failed', error_code: `${lastErrorCode}_EXHAUSTED`, retryable: false };

    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      lastErrorCode = isAbort ? 'WASENDER_TIMEOUT' : 'WASENDER_NETWORK_ERROR';
      if (attempt < maxAttempts - 1) {
        await _sleep(backoffs[attempt] ?? backoffs[backoffs.length - 1] ?? 1000);
        continue;
      }
      return {
        ok:         false,
        status:     'failed',
        error_code: `${lastErrorCode}_EXHAUSTED`,
        retryable:  false,
      };
    }
  }

  return { ok: false, status: 'failed', error_code: 'WASENDER_UNEXPECTED_ERROR', retryable: false };
}
