import { expect } from 'vitest';

/**
 * Catálogo oficial de eventos del activity log (rules-75).
 */
export const ACTIVITY_LOG_EVENTS = [
  'conv_session_started',
  'conv_message_received',
  'conv_intent_classified',
  'conv_identity_requested',
  'conv_identity_resolved',
  'conv_incident_created',
  'conv_lead_created',
  'conv_help_provided',
  'conv_case_escalated',
  'conv_case_created',
  'conv_message_delivery_failed',
] as const;

export type ActivityLogEvent = (typeof ACTIVITY_LOG_EVENTS)[number];

/**
 * Verifica que un evento de activity log pertenece al catálogo oficial.
 */
export function assertActivityEvent(
  eventName: string,
  payload: Record<string, unknown>
): void {
  expect(
    ACTIVITY_LOG_EVENTS as readonly string[],
    `"${eventName}" no pertenece al catálogo oficial de activity log (rules-75)`
  ).toContain(eventName);

  expect(payload, 'El payload del evento debe ser un objeto').toBeTypeOf('object');
  expect(payload).not.toBeNull();
}

/**
 * Verifica el payload específico de conv_incident_created.
 * Campos obligatorios: incident_id, incident_ref, conv_case_id, channel, incident_type, urgency.
 * Campo prohibido: session_id.
 */
export function assertIncidentCreatedPayload(payload: Record<string, unknown>): void {
  const required = ['incident_id', 'incident_ref', 'conv_case_id', 'channel', 'incident_type', 'urgency'];
  for (const field of required) {
    expect(payload, `conv_incident_created payload debe incluir "${field}"`).toHaveProperty(field);
  }
  expect(payload, 'conv_incident_created NO debe incluir session_id').not.toHaveProperty('session_id');
}

/**
 * Verifica el payload específico de conv_lead_created.
 * Campos obligatorios: lead_id, lead_ref, listing_id, conv_case_id, channel, interest_type.
 * Campo prohibido: session_id.
 */
export function assertLeadCreatedPayload(payload: Record<string, unknown>): void {
  const required = ['lead_id', 'lead_ref', 'listing_id', 'conv_case_id', 'channel', 'interest_type'];
  for (const field of required) {
    expect(payload, `conv_lead_created payload debe incluir "${field}"`).toHaveProperty(field);
  }
  expect(payload, 'conv_lead_created NO debe incluir session_id').not.toHaveProperty('session_id');
}

/**
 * Verifica que el nombre del evento de escalado es conv_case_escalated (rules-75 §4.2).
 * Fuente oficial: rules-75 §4.2 — "conv_case_escalated | Un caso es escalado a un admin humano"
 */
export function assertEscalationEventName(eventName: string): void {
  expect(eventName, 'El evento de escalado debe llamarse "conv_case_escalated" (rules-75 §4.2)').toBe('conv_case_escalated');
  expect(eventName, '"conv_help_escalated" no es el nombre oficial del evento (rules-75 §4.2)').not.toBe('conv_help_escalated');
}
