/**
 * help-intent-extractor -- Adapter para extraer intencion de ayuda de un mensaje.
 *
 * Mode=mock (default): heuristica sin fetch externo.
 * Mode=real: llama al proveedor de IA via ai-client con operacion allowlisted.
 *
 * Privacidad: message_text es sensible -- nunca loguear.
 * La IA no puede recibir profile_id, phone, sender_ref, identity_data.
 * La IA no puede devolver datos contractuales ni datos personales.
 * Fuente: rules-80, SmartConversations WF-40.
 */

import { aiCall, validateHelpOutput, getAiIntegrationMode } from './ai-client.ts';
import type { AiIntegrationMode } from './ai-client.ts';

export type HelpIntentType =
  | 'faq'
  | 'account_specific'
  | 'request_human'
  | 'complaint'
  | 'unknown';

export type HelpTopic =
  | 'login'
  | 'payments'
  | 'contract'
  | 'maintenance'
  | 'platform'
  | 'other';

export interface HelpExtraction {
  intent_type:         HelpIntentType;
  topic?:              HelpTopic;
  confidence:          number;
  is_account_specific: boolean;
  requires_human:      boolean;
  missing_fields?:     string[];
}

export type HelpIntentExtractor = {
  extract(messageText: string): HelpExtraction;
};

export type AsyncHelpIntentExtractor = {
  extract(messageText: string, ctx?: { client_account_id?: string; session_id?: string; channel?: 'whatsapp' | 'webchat' }): Promise<HelpExtraction>;
};

// ---------------------------------------------------------------------------
// Mock extractor -- heuristica local sin fetch externo
// ---------------------------------------------------------------------------

const mockHelpIntentExtractor: HelpIntentExtractor = {
  extract(messageText: string): HelpExtraction {
    // No loguear messageText
    const text = messageText.toLowerCase();

    if (
      text.includes('hablar con una persona') || text.includes('agente humano') ||
      text.includes('quiero hablar con alguien') || text.includes('necesito un agente') ||
      text.includes('persona real') || text.includes('atencion humana')
    ) {
      return {
        intent_type: 'request_human', topic: 'other',
        confidence: 0.95, is_account_specific: false, requires_human: true,
      };
    }

    if (
      text.includes('mi contrato') || text.includes('mi cuenta') ||
      text.includes('mi factura') || text.includes('mi pago') ||
      text.includes('mi habitacion') || text.includes('mi alojamiento') ||
      text.includes('mi deuda') || text.includes('mi reserva')
    ) {
      const topic: HelpTopic =
        text.includes('factura') || text.includes('pago') || text.includes('deuda') ? 'payments' :
        text.includes('contrato') || text.includes('reserva') ? 'contract' : 'other';
      return {
        intent_type: 'account_specific', topic,
        confidence: 0.88, is_account_specific: true, requires_human: false,
      };
    }

    if (
      text.includes('queja') || text.includes('reclamacion') ||
      text.includes('no funciona') || text.includes('problema grave') ||
      text.includes('insatisfecho')
    ) {
      return {
        intent_type: 'complaint', topic: 'platform',
        confidence: 0.82, is_account_specific: false, requires_human: true,
      };
    }

    let topic: HelpTopic = 'other';
    let confidence = 0.0;

    if (text.includes('contrasena') || text.includes('acceso') || text.includes('login') || text.includes('entrar')) {
      topic = 'login'; confidence = 0.90;
    } else if (text.includes('pago') || text.includes('cobro') || text.includes('precio') || text.includes('coste')) {
      topic = 'payments'; confidence = 0.87;
    } else if (text.includes('contrato') || text.includes('duracion') || text.includes('plazo')) {
      topic = 'contract'; confidence = 0.85;
    } else if (text.includes('mantenimiento') || text.includes('averia') || text.includes('reparacion')) {
      topic = 'maintenance'; confidence = 0.84;
    } else if (text.includes('plataforma') || text.includes('app') || text.includes('web') || text.includes('como')) {
      topic = 'platform'; confidence = 0.80;
    } else if (text.includes('ayuda') || text.includes('pregunta') || text.includes('duda') || text.includes('informacion')) {
      topic = 'other'; confidence = 0.75;
    }

    if (confidence > 0) {
      return {
        intent_type: 'faq', topic, confidence,
        is_account_specific: false, requires_human: false,
      };
    }

    return {
      intent_type:         'unknown',
      confidence:          0.0,
      is_account_specific: false,
      requires_human:      false,
    };
  },
};

// ---------------------------------------------------------------------------
// Real extractor -- usa ai-client con operacion allowlisted
// La IA NO recibe profile_id, phone, sender_ref ni identity_data.
// La IA NO puede devolver datos contractuales ni datos personales.
// ---------------------------------------------------------------------------

const realHelpIntentExtractor: AsyncHelpIntentExtractor = {
  async extract(messageText, ctx = {}): Promise<HelpExtraction> {
    const resp = await aiCall<Record<string, unknown>>({
      operation:         'ai.help.extract',
      client_account_id: ctx.client_account_id ?? 'unknown',
      session_id:        ctx.session_id ?? 'unknown',
      channel:           ctx.channel ?? 'webchat',
      // safe_input: texto sin PII -- no enviar profile_id, phone, sender_ref
      safe_input: messageText.slice(0, 1000),
    });

    if (!resp.ok || !resp.data) {
      return mockHelpIntentExtractor.extract(messageText);
    }

    const validated = validateHelpOutput(resp.data);
    const mockResult = mockHelpIntentExtractor.extract(messageText);

    return {
      intent_type:         (validated['help_intent'] as HelpIntentType) ?? mockResult.intent_type,
      confidence:          typeof validated['safe_summary'] === 'string' ? 0.9 : mockResult.confidence,
      is_account_specific: mockResult.is_account_specific,
      requires_human:      typeof validated['request_human'] === 'boolean'
        ? validated['request_human']
        : mockResult.requires_human,
      missing_fields: mockResult.missing_fields,
    };
  },
};

// ---------------------------------------------------------------------------
// Factory -- devuelve adapter async (mock envuelto o real)
// ---------------------------------------------------------------------------

export function buildHelpIntentExtractor(mode?: AiIntegrationMode): AsyncHelpIntentExtractor {
  const resolved = mode ?? getAiIntegrationMode();
  if (resolved === 'real') return realHelpIntentExtractor;
  return {
    extract: async (text, _ctx) => mockHelpIntentExtractor.extract(text),
  };
}

/** Default export: siempre mock para backward compatibility */
export const defaultHelpIntentExtractor: HelpIntentExtractor = mockHelpIntentExtractor;
