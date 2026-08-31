import { TEST_TENANT_A, TEST_TENANT_B, TEST_TENANT_INACTIVE } from '../config/tenants.js';

/** Fila simulada de conv_service_activations para tenant activo */
export const fixtureServiceActivationActive = {
  id: 'svc-act-0001',
  client_account_id: TEST_TENANT_A.client_account_id,
  channel: 'whatsapp',
  status: 'active',
  wasender_session_id: TEST_TENANT_A.wasender_session_id,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
} as const;

export const fixtureServiceActivationInactive = {
  id: 'svc-act-0002',
  client_account_id: TEST_TENANT_INACTIVE.client_account_id,
  channel: 'whatsapp',
  status: 'inactive',
  wasender_session_id: TEST_TENANT_INACTIVE.wasender_session_id,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
} as const;

export const fixtureWebchatConfig = {
  id: 'wc-cfg-0001',
  client_account_id: TEST_TENANT_B.client_account_id,
  status: 'active',
  allowed_origins: ['https://residencia-luna.example.com'],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
} as const;

export { TEST_TENANT_A, TEST_TENANT_B, TEST_TENANT_INACTIVE };
