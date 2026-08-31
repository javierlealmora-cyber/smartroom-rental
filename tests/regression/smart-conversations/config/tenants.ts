/**
 * Tenants de prueba predefinidos para el regression harness.
 * No corresponden a tenants de producción.
 */

export const TEST_TENANT_A = {
  client_account_id: 'aaaa-0001-test-tenant-a',
  name: 'Residencia Test Sol',
  wasender_session_id: 'wa-session-test-a',
  webhook_secret: 'mock-webhook-secret-xxx',
} as const;

export const TEST_TENANT_B = {
  client_account_id: 'bbbb-0002-test-tenant-b',
  name: 'Residencia Test Luna',
  wasender_session_id: 'wa-session-test-b',
  webhook_secret: 'mock-webhook-secret-yyy',
} as const;

/** Tenant sin suscripción activa (para tests de rechazo) */
export const TEST_TENANT_INACTIVE = {
  client_account_id: 'cccc-0003-test-tenant-inactive',
  name: 'Residencia Test Inactiva',
  wasender_session_id: 'wa-session-test-c',
  webhook_secret: 'mock-webhook-secret-zzz',
} as const;

export type TestTenant = typeof TEST_TENANT_A;
