import { TEST_TENANT_B } from '../config/tenants.js';

/** Listing/habitación disponible */
export const fixtureListing = {
  id: 'listing-mock-0001',
  client_account_id: TEST_TENANT_B.client_account_id,
  name: 'Habitación individual 101',
  type: 'individual' as const,
  price_monthly: 450,
  available: true,
  created_at: '2026-01-15T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
} as const;

/** Conv case de tipo lead */
export const fixtureCaseLead = {
  id: 'conv-case-lead-0001',
  client_account_id: TEST_TENANT_B.client_account_id,
  session_id: 'sess-wc-0001',
  channel: 'webchat' as const,
  case_ref_type: 'lead' as const,
  status: 'open' as const,
  created_at: '2026-07-16T10:06:00.000Z',
  updated_at: '2026-07-16T10:06:00.000Z',
} as const;

/**
 * Payload oficial del evento conv_lead_created (rules-75).
 * NO incluye session_id ni PII del usuario.
 */
export const fixtureEventLeadCreated = {
  lead_id: 'lead-mock-0001',
  lead_ref: 'LEAD-2026-0001',
  listing_id: fixtureListing.id,
  conv_case_id: fixtureCaseLead.id,
  channel: 'webchat' as const,
  interest_type: 'availability_inquiry',
} as const;

export type EventLeadCreated = typeof fixtureEventLeadCreated;
