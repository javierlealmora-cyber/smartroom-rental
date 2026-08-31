import type { ConvSession } from '../fixtures/sessions.fixture.js';
import type { IdentityLevel } from '../fixtures/identity.fixture.js';

/**
 * Crea una sesión de test con valores por defecto sobreescribibles.
 * No persiste en ninguna base de datos.
 */
export function createMockSession(overrides: Partial<ConvSession> = {}): ConvSession {
  const defaults: ConvSession = {
    id: `sess-mock-${Date.now()}`,
    client_account_id: 'aaaa-0001-test-tenant-a',
    channel: 'whatsapp',
    external_id: '+34600000099',
    identity_level: 'NO_MATCH',
    identity_attempts: 0,
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { ...defaults, ...overrides } as ConvSession;
}

/**
 * Crea una sesión con un nivel de identidad específico.
 */
export function createMockSessionWithIdentity(
  identityLevel: IdentityLevel,
  overrides: Partial<ConvSession> = {}
): ConvSession {
  return createMockSession({ identity_level: identityLevel, ...overrides });
}

/**
 * Crea un mensaje normalizado de test.
 */
export function createMockMessage(overrides: Record<string, unknown> = {}) {
  return {
    channel: 'whatsapp' as const,
    client_account_id: 'aaaa-0001-test-tenant-a',
    session_id: `sess-mock-${Date.now()}`,
    external_message_id: `wamid.mock-${Date.now()}`,
    content: 'Mensaje de prueba',
    content_type: 'text' as const,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Crea un tenant de test con valores mínimos.
 */
export function createMockTenant(overrides: Record<string, unknown> = {}) {
  return {
    client_account_id: `test-tenant-${Date.now()}`,
    name: 'Residencia Test Mock',
    wasender_session_id: `wa-session-mock-${Date.now()}`,
    webhook_secret: 'mock-webhook-secret-xxx',
    ...overrides,
  };
}
