/**
 * Mock de respuestas de Claude (IA).
 * Los tests no llaman a la API real de Claude en Fase 0.
 */

export type ClaudeIntentResult = {
  intent: 'incident' | 'listing' | 'help' | 'unknown' | 'context_change';
  confidence: number;
  extracted_data: Record<string, unknown>;
};

export const mockClaudeIntentIncident: ClaudeIntentResult = {
  intent: 'incident',
  confidence: 0.95,
  extracted_data: {
    description: 'Fuga de agua en baño',
    urgency: 'high',
    incident_type: 'maintenance',
  },
};

export const mockClaudeIntentListing: ClaudeIntentResult = {
  intent: 'listing',
  confidence: 0.90,
  extracted_data: {
    interest_type: 'availability_inquiry',
    room_type: 'individual',
  },
};

export const mockClaudeIntentHelp: ClaudeIntentResult = {
  intent: 'help',
  confidence: 0.88,
  extracted_data: {
    topic: 'payment',
  },
};

export const mockClaudeIntentUnknown: ClaudeIntentResult = {
  intent: 'unknown',
  confidence: 0.40,
  extracted_data: {},
};

/** Detecta cambio de contexto (caso abierto + servicio diferente) */
export const mockClaudeIntentContextChange: ClaudeIntentResult = {
  intent: 'context_change',
  confidence: 0.92,
  extracted_data: {
    current_case_type: 'incident',
    new_intent: 'listing',
  },
};

/** Respuesta generada por Claude para help flow */
export const mockClaudeGeneratedHelpText =
  'Para pagar la mensualidad puedes utilizar los siguientes métodos: transferencia bancaria, domiciliación o pago en recepción.';

/** Marcadores oficiales del catálogo (rules-80) — NO incluye {user_name} */
export const OFFICIAL_TEMPLATE_MARKERS = [
  '{incident_ref}',
  '{lead_ref}',
  '{due_date}',
  '{amount}',
  '{bot_name}',
] as const;
