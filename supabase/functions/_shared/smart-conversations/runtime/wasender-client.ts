/**
 * wasender-client -- Adapter Wasender (compatibilidad + feature flag Fase 10D).
 *
 * Interfaz legacy mantenida para conv-send-wa y conv-process-send-queue.
 * Delega en wasender-http-client que implementa WASENDER_INTEGRATION_MODE=mock|real.
 *
 * En mode=mock (default): nunca llama fetch externo.
 * En mode=real: usa wasender-http-client con fetch mockeable en tests.
 *
 * JID handling:
 *   - buildWasenderJid solo existe dentro de este modulo / wasender-http-client.
 *   - @s.whatsapp.net nunca se persiste en conv_sessions ni conv_messages.
 *
 * Privacidad: senderRef, text y tokens no se loguean.
 * Fuente: contract-normalized-message 8.4, rules-20 4.4, Fase 10D.
 */

import {
  sendWasenderMessage as _sendViaHttpClient,
} from './wasender-http-client.ts';

// ---------------------------------------------------------------------------
// Tipos publicos del adapter (interfaz legacy -- compatible con EFs existentes)
// ---------------------------------------------------------------------------

export interface WasenderSendInput {
  /** client_account_id real del tenant -- nunca placeholder hardcodeado */
  clientAccountId:  string;
  /** wasender_session_id de conv_wa_sessions */
  wasenderSessionId: string;
  /** sender_ref limpio: telefono en formato internacional sin sufijo JID */
  senderRef: string;
  /** Texto del mensaje. Sensible -- no loguear. */
  text: string;
}

export interface WasenderSendResult {
  ok: boolean;
  provider_message_id?: string;
  error_code?: string;
  retryable?: boolean;
}

// ---------------------------------------------------------------------------
// sendWasenderMessage -- delega en wasender-http-client (mode mock|real)
// ---------------------------------------------------------------------------

export async function sendWasenderMessage(input: WasenderSendInput): Promise<WasenderSendResult> {
  const result = await _sendViaHttpClient({
    client_account_id: input.clientAccountId,
    wa_session_id:     input.wasenderSessionId,
    recipient_ref:     input.senderRef,
    text:              input.text,
  });
  return {
    ok:                  result.ok,
    provider_message_id: result.provider_message_id,
    error_code:          result.error_code,
    retryable:           result.retryable,
  };
}
