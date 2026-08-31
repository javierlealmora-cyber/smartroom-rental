/**
 * intent-classifier -- Adapter de clasificacion de intencion para WF-10.
 *
 * Mode=mock (default): heuristica de palabras clave sin fetch externo.
 * Mode=real: llama al proveedor de IA via ai-client con operacion allowlisted.
 *
 * Privacidad: message_text es sensible -- nunca loguear dentro del adapter.
 * La IA no valida identidad. La IA no decide permisos.
 * Fuente: rules-50, rules-80 §4.7
 */

import { aiCall, validateIntentOutput, getAiIntegrationMode } from './ai-client.ts';
import type { AiIntegrationMode } from './ai-client.ts';

export type ClassifiableServiceCode = 'conv_incidencias' | 'conv_publicaciones' | 'conv_ayuda';
export type ClassifyChannel = 'whatsapp' | 'webchat';

export interface IntentClassifyInput {
  /** Texto del mensaje. Sensible -- no loguear. */
  message_text:       string;
  services_active:    string[];
  channel:            ClassifyChannel;
  session_id?:        string;
  client_account_id?: string;
}

export interface IntentClassifyResult {
  service_code: ClassifiableServiceCode | 'unknown';
  confidence:   number;
}

export type IntentClassifier = {
  classify(input: IntentClassifyInput): Promise<IntentClassifyResult>;
};

// ---------------------------------------------------------------------------
// Mock classifier -- heuristica local sin fetch externo
// ---------------------------------------------------------------------------

const mockClassifier: IntentClassifier = {
  async classify(input: IntentClassifyInput): Promise<IntentClassifyResult> {
    // Nunca loguear input.message_text
    const t = input.message_text.toLowerCase();

    if (
      t.includes('gotera') || t.includes('averia') || t.includes('roto') ||
      t.includes('incidencia') || t.includes('fuga') || t.includes('estropeado') ||
      t.includes('averiado') || t.includes('problema con')
    ) {
      return { service_code: 'conv_incidencias', confidence: 0.93 };
    }
    if (
      t.includes('publicar') || t.includes('anuncio') || t.includes('publicacion') ||
      t.includes('piso disponible') || t.includes('habitacion libre')
    ) {
      return { service_code: 'conv_publicaciones', confidence: 0.90 };
    }
    if (
      t.includes('ayuda') || t.includes('duda') || t.includes('pregunta') ||
      t.includes('como') || t.includes('informacion') || t.includes('help')
    ) {
      return { service_code: 'conv_ayuda', confidence: 0.88 };
    }

    return { service_code: 'unknown', confidence: 0.0 };
  },
};

// ---------------------------------------------------------------------------
// Real classifier -- usa ai-client con operacion allowlisted
// La IA no valida identidad. La IA no decide permisos. La IA no escribe BD.
// ---------------------------------------------------------------------------

const realClassifier: IntentClassifier = {
  async classify(input: IntentClassifyInput): Promise<IntentClassifyResult> {
    // Nunca loguear message_text
    const resp = await aiCall<{ service_code: string; confidence: number }>({
      operation:         'ai.intent.classify',
      client_account_id: input.client_account_id ?? 'unknown',
      session_id:        input.session_id ?? 'unknown',
      channel:           input.channel,
      // safe_input: texto sin PII adicional -- message_text ya viene sanitizado por caller
      safe_input: input.message_text.slice(0, 1000),
    });

    if (!resp.ok || !resp.data) {
      // Fallback seguro a unknown en cualquier error IA
      return { service_code: 'unknown', confidence: 0 };
    }

    const validated = validateIntentOutput(resp.data);
    return {
      service_code: validated.service_code as ClassifiableServiceCode | 'unknown',
      confidence:   validated.confidence,
    };
  },
};

// ---------------------------------------------------------------------------
// Factory -- selecciona implementacion segun modo
// ---------------------------------------------------------------------------

export function buildIntentClassifier(mode?: AiIntegrationMode): IntentClassifier {
  const resolved = mode ?? getAiIntegrationMode();
  return resolved === 'real' ? realClassifier : mockClassifier;
}

/** Default export: siempre mock para backward compatibility */
export const defaultClassifier: IntentClassifier = mockClassifier;
