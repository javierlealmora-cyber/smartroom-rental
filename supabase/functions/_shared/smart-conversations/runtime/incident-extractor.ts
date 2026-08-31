/**
 * incident-extractor -- Adapter para extraer datos de incidencia de un mensaje.
 *
 * Mode=mock (default): heuristica sin fetch externo.
 * Mode=real: llama al proveedor de IA via ai-client con operacion allowlisted.
 *
 * Privacidad: message_text es sensible -- nunca loguear dentro del adapter.
 * La IA no puede devolver profile_id, phone, room_id, sender_ref.
 * Fuente: rules-75, SmartConversations WF-20.
 */

import { aiCall, validateIncidentOutput, getAiIntegrationMode } from './ai-client.ts';
import type { AiIntegrationMode } from './ai-client.ts';

export type IncidentType = 'maintenance' | 'security' | 'cleaning' | 'other';
export type Urgency      = 'low' | 'medium' | 'high';

export interface IncidentExtraction {
  incident_type:   IncidentType;
  urgency:         Urgency;
  description:     string;
  is_complete:     boolean;
  missing_fields?: string[];
}

export type IncidentExtractor = {
  extract(messageText: string): IncidentExtraction;
};

export type AsyncIncidentExtractor = {
  extract(messageText: string, ctx?: { client_account_id?: string; session_id?: string; channel?: 'whatsapp' | 'webchat' }): Promise<IncidentExtraction>;
};

// ---------------------------------------------------------------------------
// Mock extractor -- heuristica local sin fetch externo
// ---------------------------------------------------------------------------

const mockIncidentExtractor: IncidentExtractor = {
  extract(messageText: string): IncidentExtraction {
    // No loguear messageText
    const text = messageText.toLowerCase();

    let incident_type: IncidentType = 'other';
    if (text.includes('gotera') || text.includes('mantenimiento') ||
        text.includes('averia') || text.includes('roto') || text.includes('dano')) {
      incident_type = 'maintenance';
    } else if (text.includes('seguridad') || text.includes('robo') ||
               text.includes('acceso') || text.includes('peligro')) {
      incident_type = 'security';
    } else if (text.includes('limpieza') || text.includes('sucio') ||
               text.includes('basura') || text.includes('suciedad')) {
      incident_type = 'cleaning';
    }

    let urgency: Urgency = 'low';
    if (text.includes('urgente') || text.includes('inmediato') ||
        text.includes('grave') || text.includes('emergencia')) {
      urgency = 'high';
    } else if (text.includes('pronto') || text.includes('importante') ||
               text.includes('necesito')) {
      urgency = 'medium';
    }

    const description    = messageText.slice(0, 500).trim();
    const is_complete    = description.length > 5;
    const missing_fields = is_complete ? [] : ['description'];

    return { incident_type, urgency, description, is_complete, missing_fields };
  },
};

// ---------------------------------------------------------------------------
// Real extractor -- usa ai-client con operacion allowlisted
// La IA no puede devolver profile_id, phone, room_id, sender_ref.
// ---------------------------------------------------------------------------

const realIncidentExtractor: AsyncIncidentExtractor = {
  async extract(messageText, ctx = {}): Promise<IncidentExtraction> {
    const resp = await aiCall<Record<string, unknown>>({
      operation:         'ai.incident.extract',
      client_account_id: ctx.client_account_id ?? 'unknown',
      session_id:        ctx.session_id ?? 'unknown',
      channel:           ctx.channel ?? 'webchat',
      // safe_input: texto sin PII -- no enviar profile_id, phone, sender_ref
      safe_input: messageText.slice(0, 1000),
    });

    if (!resp.ok || !resp.data) {
      return mockIncidentExtractor.extract(messageText);
    }

    const validated = validateIncidentOutput(resp.data);
    return {
      incident_type: (validated['incident_type'] as IncidentType) ?? 'other',
      urgency:       (validated['urgency'] as Urgency) ?? 'low',
      description:   typeof validated['safe_summary'] === 'string'
        ? validated['safe_summary']
        : messageText.slice(0, 500),
      is_complete:   true,
      missing_fields: (validated['missing_fields'] as string[]) ?? [],
    };
  },
};

// ---------------------------------------------------------------------------
// Factory -- devuelve adapter async (mock envuelto o real)
// ---------------------------------------------------------------------------

export function buildIncidentExtractor(mode?: AiIntegrationMode): AsyncIncidentExtractor {
  const resolved = mode ?? getAiIntegrationMode();
  if (resolved === 'real') return realIncidentExtractor;
  return {
    extract: async (text, _ctx) => mockIncidentExtractor.extract(text),
  };
}

/** Default export: siempre mock para backward compatibility */
export const defaultIncidentExtractor: IncidentExtractor = mockIncidentExtractor;
