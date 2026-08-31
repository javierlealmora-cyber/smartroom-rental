import { TEST_TENANT_A } from '../config/tenants.js';

/** Conv case de tipo incidencia, nacido como pre-incidencia (PARTIAL_MATCH_ACTIVE) */
export const fixtureCasePreIncident = {
  id: 'conv-case-pre-0001',
  client_account_id: TEST_TENANT_A.client_account_id,
  session_id: 'sess-wa-0002',
  channel: 'whatsapp' as const,
  case_ref_type: 'incident' as const,
  status: 'open' as const,
  created_at: '2026-07-16T10:10:00.000Z',
  updated_at: '2026-07-16T10:10:00.000Z',
} as const;

/** Conv case de tipo incidencia, confirmado (STRONG_MATCH_ACTIVE) */
export const fixtureCaseIncidentConfirmed = {
  id: 'conv-case-inc-0001',
  client_account_id: TEST_TENANT_A.client_account_id,
  session_id: 'sess-wa-0001',
  channel: 'whatsapp' as const,
  case_ref_type: 'incident' as const,
  status: 'open' as const,
  created_at: '2026-07-16T10:08:00.000Z',
  updated_at: '2026-07-16T10:08:00.000Z',
} as const;

/** Conv case escalado */
export const fixtureCaseEscalated = {
  id: 'conv-case-esc-0001',
  client_account_id: TEST_TENANT_A.client_account_id,
  session_id: 'sess-wa-0004',
  channel: 'whatsapp' as const,
  case_ref_type: 'incident' as const,
  status: 'escalated' as const,
  created_at: '2026-07-16T10:15:00.000Z',
  updated_at: '2026-07-16T10:15:00.000Z',
} as const;

/**
 * Payload oficial del evento conv_incident_created (rules-75).
 * NO incluye session_id.
 */
export const fixtureEventIncidentCreated = {
  incident_id: 'inc-mock-0001',
  incident_ref: 'INC-2026-0001',
  conv_case_id: fixtureCaseIncidentConfirmed.id,
  channel: 'whatsapp' as const,
  incident_type: 'maintenance',
  urgency: 'high',
} as const;

export type ConvCase = typeof fixtureCaseIncidentConfirmed;
export type EventIncidentCreated = typeof fixtureEventIncidentCreated;
