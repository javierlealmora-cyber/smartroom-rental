import { TEST_TENANT_A, TEST_TENANT_B } from '../config/tenants.js';

/** Sesión WhatsApp activa con identidad STRONG_MATCH_ACTIVE */
export const fixtureSessionWhatsAppStrong = {
  id: 'sess-wa-0001',
  client_account_id: TEST_TENANT_A.client_account_id,
  channel: 'whatsapp',
  external_id: '+34600000001',
  identity_level: 'STRONG_MATCH_ACTIVE',
  identity_attempts: 0,
  status: 'active',
  created_at: '2026-07-16T10:00:00.000Z',
  updated_at: '2026-07-16T10:00:00.000Z',
} as const;

/** Sesión WhatsApp con identidad PARTIAL_MATCH_ACTIVE */
export const fixtureSessionWhatsAppPartial = {
  id: 'sess-wa-0002',
  client_account_id: TEST_TENANT_A.client_account_id,
  channel: 'whatsapp',
  external_id: '+34600000002',
  identity_level: 'PARTIAL_MATCH_ACTIVE',
  identity_attempts: 0,
  status: 'active',
  created_at: '2026-07-16T10:00:00.000Z',
  updated_at: '2026-07-16T10:00:00.000Z',
} as const;

/** Sesión WhatsApp con identidad NO_MATCH (no reconocido) */
export const fixtureSessionWhatsAppNoMatch = {
  id: 'sess-wa-0003',
  client_account_id: TEST_TENANT_A.client_account_id,
  channel: 'whatsapp',
  external_id: '+34600000003',
  identity_level: 'NO_MATCH',
  identity_attempts: 0,
  status: 'active',
  created_at: '2026-07-16T10:00:00.000Z',
  updated_at: '2026-07-16T10:00:00.000Z',
} as const;

/** Sesión WhatsApp con identidad MATCH_INACTIVE (ex-residente) */
export const fixtureSessionWhatsAppMatchInactive = {
  id: 'sess-wa-0004',
  client_account_id: TEST_TENANT_A.client_account_id,
  channel: 'whatsapp',
  external_id: '+34600000004',
  identity_level: 'MATCH_INACTIVE',
  identity_attempts: 0,
  status: 'active',
  created_at: '2026-07-16T10:00:00.000Z',
  updated_at: '2026-07-16T10:00:00.000Z',
} as const;

/** Sesión WebChat activa */
export const fixtureSessionWebChat = {
  id: 'sess-wc-0001',
  client_account_id: TEST_TENANT_B.client_account_id,
  channel: 'webchat',
  external_id: 'browser-fingerprint-abc123',
  identity_level: 'NO_MATCH',
  identity_attempts: 0,
  status: 'active',
  created_at: '2026-07-16T10:00:00.000Z',
  updated_at: '2026-07-16T10:00:00.000Z',
} as const;

export type ConvSession = typeof fixtureSessionWhatsAppStrong;
