/**
 * e2e-dispatch-sim — Simulador Node.js de conv-dispatch-message.
 *
 * Implementa los mismos contratos conductuales que la Edge Function de Deno:
 *   - Idempotencia basada SOLO en el status del inbound (nunca en outboundCount).
 *   - UPDATE condicional: solo si status='received'.
 *   - Routing → WF correcto según service_code.
 *   - Outbound correcto según canal (whatsapp → conv-send-wa; webchat → conv-web-deliver).
 *   - Payload outbound: SOLO {client_account_id, session_id, text} — sin PII.
 *   - No llama a n8n, Claude, Core, Wasender ni WebChat real.
 *   - No introduce: WF-02, conv_help_escalated, WEAK_MATCH, UNVERIFIED standalone,
 *     next_retry_at, attempt_count, nuevos estados, nuevos eventos Activity Log.
 */

import { MemoryStore } from './e2e-memory-store';
import { CallTracker  } from './e2e-call-tracker';
import {
  simulateWf20, simulateWf30, simulateWf40,
  WfInput, Wf20Config, Wf30Config, Wf40Config,
} from './e2e-wf-sims';

// ── Routing config ─────────────────────────────────────────────────────────

export type RoutingResponseType =
  | 'routed'
  | 'menu'
  | 'no_service'
  | 'context_switch_confirmation';

export interface RoutingConfig {
  responseType: RoutingResponseType;
  serviceCode?: string;
  options?:     Array<{ service_code: string; label: string }>;
}

// ── WF config ──────────────────────────────────────────────────────────────

export interface WfConfig {
  incidents?: Wf20Config;
  listings?:  Wf30Config;
  help?:      Wf40Config;
}

// ── Dispatch input / result ────────────────────────────────────────────────

export interface DispatchInput {
  client_account_id: string;
  session_id:        string;
  message_id:        string;
  force?:            boolean;
  routing:           RoutingConfig;
  wf?:               WfConfig;
}

export interface DispatchResult {
  idempotent?:    boolean;
  decision?:      string;
  dispatched?:    boolean;
  response_type?: string;
  outboundText?:  string;
  wfResult?:      Record<string, unknown>;
  error?:         string;
}

// ── Text mappers (mirrors dispatch-response-mapper.ts) ─────────────────────

const FALLBACK_TEXT: Record<string, string> = {
  success:             'Tu incidencia ha sido registrada correctamente.',
  pending_input:       'Necesitamos más información para gestionar tu incidencia.',
  identity_required:   'Para continuar necesitamos verificar tu identidad.',
  escalated:           'Tu solicitud ha sido derivada a nuestro equipo.',
  listing_results:     'Aquí tienes las publicaciones disponibles.',
  lead_created:        'Hemos registrado tu interés. Nos pondremos en contacto contigo.',
  help_answer:         'Espero que esta información te haya sido útil.',
  help_ticket_created: 'Tu solicitud de ayuda ha sido registrada. Nuestro equipo te atenderá pronto.',
  waiting_internal:    'Tu solicitud ha sido recibida. Nuestro equipo te atenderá pronto.',
  error:               'Ha ocurrido un problema. Por favor, intenta de nuevo en unos minutos.',
};

const MARKER_RE = /\{[a-z_]+\}/;

function mapWfResponseToText(wf: { response_type: string }): string {
  const text = FALLBACK_TEXT[wf.response_type] ?? FALLBACK_TEXT['error'];
  return MARKER_RE.test(text) ? FALLBACK_TEXT['error'] : text;
}

function buildMenuText(opts: Array<{ service_code: string; label: string }>): string {
  if (!opts.length) return '¿En qué puedo ayudarte?';
  return `¿En qué puedo ayudarte?\n${opts.map((o, i) => `${i + 1}. ${o.label}`).join('\n')}`;
}

const buildNoServiceText      = (): string => 'Este canal no tiene servicios activos actualmente.';
const buildContextSwitchText  = (): string =>
  '¿Seguro que quieres cambiar de servicio? Responde "sí" para confirmar.';
const SAFE_ERROR_TEXT          = FALLBACK_TEXT['error'];

// ── Routers (mirrors dispatch-service-router.ts, dispatch-outbound-router.ts) ──

const SERVICE_TO_WF: Readonly<Record<string, string>> = {
  conv_incidencias:   'conv-wf20-incidents',
  conv_publicaciones: 'conv-wf30-listings',
  conv_ayuda:         'conv-wf40-help',
};
const CHANNEL_TO_OUTBOUND: Readonly<Record<string, string>> = {
  whatsapp: 'conv-send-wa',
  webchat:  'conv-web-deliver',
};

function getWfName(svc: string):   string | null { return SERVICE_TO_WF[svc]      ?? null; }
function getOutboundEf(ch: string): string | null { return CHANNEL_TO_OUTBOUND[ch] ?? null; }

// ── Idempotency (mirrors dispatch-idempotency.ts) ──────────────────────────
// NUNCA usa outboundCount — genera falso positivo en multi-turn.

function evaluateIdempotency(status: string): { alreadyDispatched: boolean; decision: string } {
  switch (status) {
    case 'received':    return { alreadyDispatched: false, decision: 'proceed' };
    case 'processing':  return { alreadyDispatched: true,  decision: 'already_processing' };
    case 'sent':        return { alreadyDispatched: true,  decision: 'already_sent' };
    case 'failed':      return { alreadyDispatched: true,  decision: 'previously_failed' };
    default:            return { alreadyDispatched: false, decision: 'proceed' };
  }
}

// ── Main dispatch simulator ────────────────────────────────────────────────

export function simulateDispatch(
  store:   MemoryStore,
  tracker: CallTracker,
  input:   DispatchInput,
): DispatchResult {
  const { client_account_id, session_id, message_id, force = false } = input;

  // Load + validate
  const session = store.getSession(session_id);
  if (!session) return { error: 'Sesión no encontrada' };
  if (session.client_account_id !== client_account_id) return { error: 'Tenant mismatch' };

  const msg = store.getMessage(message_id);
  if (!msg)                                          return { error: 'Mensaje no encontrado' };
  if (msg.session_id !== session_id)                 return { error: 'El mensaje no pertenece a la sesión indicada' };
  if (msg.client_account_id !== client_account_id)   return { error: 'El mensaje no pertenece al tenant indicado' };
  if (msg.direction !== 'inbound')                   return { error: 'Solo se pueden despachar mensajes inbound' };

  const channel = session.channel ?? msg.channel;
  if (!channel || !['whatsapp', 'webchat'].includes(channel)) return { error: 'Canal inválido' };
  if (!msg.message_text?.trim())                     return { error: 'El mensaje no tiene texto para enrutar' };

  // ── Idempotencia: SOLO status del inbound (nunca outboundCount) ─────────────
  const idemp = evaluateIdempotency(msg.status);
  if (!force && idemp.alreadyDispatched) {
    return { idempotent: true, decision: idemp.decision };
  }

  // ── UPDATE condicional: solo si status='received' ───────────────────────────
  const updated = store.conditionalUpdateToProcessing(message_id);
  if (!force && !updated) {
    return { idempotent: true, decision: 'already_processing' };
  }

  // ── Llamar a conv-routing-engine ────────────────────────────────────────────
  const routingCfg = input.routing;
  tracker.record('conv-routing-engine', {
    client_account_id, session_id, message_id, channel,
    // message_text se pasa internamente — no aparece en el payload registrado
  }, { response_type: routingCfg.responseType, service_code: routingCfg.serviceCode });

  const responseType = routingCfg.responseType;
  let outboundText: string;
  let wfResult: Record<string, unknown> | undefined;

  // ── Interpretar respuesta de routing ────────────────────────────────────────
  if (responseType === 'routed') {
    const svc    = routingCfg.serviceCode ?? '';
    const wfName = getWfName(svc);

    if (!wfName) {
      outboundText = SAFE_ERROR_TEXT;
    } else {
      const wfInput: WfInput = {
        client_account_id, session_id, message_id, channel, service_code: svc,
      };
      const wfCfg = input.wf ?? {};

      // Registrar dispatch → WF antes de ejecutar el WF
      // El payload outbound al WF no contiene: profile_id, identity_data, sender_ref, raw_payload
      tracker.record(wfName, {
        client_account_id, session_id, message_id, channel, service_code: svc,
      }, {});

      let wfRes: { response_type: string; [k: string]: unknown } = { response_type: 'error' };

      if (wfName === 'conv-wf20-incidents') {
        wfRes = simulateWf20(store, tracker, wfInput, wfCfg.incidents ?? {});
      } else if (wfName === 'conv-wf30-listings') {
        wfRes = simulateWf30(store, tracker, wfInput,
          wfCfg.listings ?? { intent: 'search_listing' });
      } else if (wfName === 'conv-wf40-help') {
        wfRes = simulateWf40(store, tracker, wfInput,
          wfCfg.help ?? { intent: 'faq', confidence: 0.9 });
      }

      wfResult     = wfRes;
      outboundText = mapWfResponseToText(wfRes);
    }

  } else if (responseType === 'menu') {
    outboundText = buildMenuText(routingCfg.options ?? []);

  } else if (responseType === 'no_service') {
    outboundText = buildNoServiceText();

  } else if (responseType === 'context_switch_confirmation') {
    // NO cambia active_service_code — solo confirmar al usuario
    outboundText = buildContextSwitchText();

  } else {
    outboundText = SAFE_ERROR_TEXT;
  }

  // ── Llamar a EF outbound ────────────────────────────────────────────────────
  const outboundEf = getOutboundEf(channel);
  if (!outboundEf) {
    store.updateMessageStatus(message_id, 'failed');
    return { error: 'Canal sin EF de outbound registrada' };
  }

  // Payload outbound: SOLO {client_account_id, session_id, text}
  // NUNCA: profile_id, identity_data, sender_ref, raw_payload, phone
  const outboundPayload = { client_account_id, session_id, text: outboundText };
  store.recordOutbound({ ef_name: outboundEf, ...outboundPayload });
  tracker.record(outboundEf, outboundPayload, { message_id: 'out-mock' });

  // ── Actualizar status del inbound ───────────────────────────────────────────
  store.updateMessageStatus(message_id, 'sent');

  return { dispatched: true, response_type: responseType, outboundText, wfResult };
}
