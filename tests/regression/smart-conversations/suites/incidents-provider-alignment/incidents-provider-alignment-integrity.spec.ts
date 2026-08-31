/**
 * incidents-provider-alignment-integrity.spec.ts — Fase 11C5E-CONTRACT-INTEGRITY-CHECK (Suite 5/5)
 *
 * Tests de integridad del contrato: external_request_reference en raíz, HMAC idempotency opacity,
 * y separación estricta entre replay (200) y conflicto (409).
 *
 * Clasificación de tests:
 *   RUNTIME_BEHAVIOR — buildProviderRequest, deriveIncidentIdempotencyKey, createIncident (HTTP mock)
 *
 * Total: 27 tests activos (sin it.todo).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  buildProviderRequest,
  createIncident,
} from '../../../../../supabase/functions/_shared/smart-conversations/adapters/incidents-addon-adapter.ts';

import {
  deriveIncidentIdempotencyKey,
} from '../../../../../supabase/functions/_shared/smart-conversations/incidents-integration-port.ts';

import type {
  InternalCreateIncidentCommand,
} from '../../../../../supabase/functions/_shared/smart-conversations/incidents-integration-port.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeCmd(overrides: Partial<InternalCreateIncidentCommand> = {}): InternalCreateIncidentCommand {
  return {
    contract_version: '1.0',
    client_account_id: 'client-acct-abc123',
    request_id: 'req-id-001',
    correlation_id: 'corr-id-001',
    idempotency_key: 'test-idempotency-key',
    source_system: 'smart_conversations',
    source_channel: 'whatsapp',
    actor: { type: 'system_service', service_name: 'test-ef' },
    requester_profile_id: 'profile-xyz',
    incident: {
      accommodation_id: 'acc-001',
      room_id: 'room-101',
      category: 'maintenance',
      title: 'Fuga de agua en baño',
      description: 'Hay una fuga visible debajo del lavabo que moja el suelo.',
      urgency_proposal: 'medium',
    },
    ...overrides,
  };
}

const MOCK_SECRET = 'test-hmac-secret-for-offline-tests';

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-INTEGRITY-EXTREF — external_request_reference en raíz (buildProviderRequest)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-INTEGRITY-EXTREF — external_request_reference en raíz (RUNTIME_BEHAVIOR)', () => {
  it('N11C5E-INTEGRITY-EXTREF-01: external_request_reference: null en raíz del payload provider', () => {
    const result = buildProviderRequest(makeCmd(), 'normal');
    expect(result.external_request_reference).toBeNull();
  });

  it('N11C5E-INTEGRITY-EXTREF-02: external_request_reference no anidado dentro de incident', () => {
    const result = buildProviderRequest(makeCmd(), 'normal');
    const incident = result.incident as Record<string, unknown>;
    expect(incident['external_request_reference']).toBeUndefined();
  });

  it('N11C5E-INTEGRITY-EXTREF-03: requester_profile_id en raíz del payload provider', () => {
    const cmd = makeCmd();
    const result = buildProviderRequest(cmd, 'normal');
    expect(result.requester_profile_id).toBe(cmd.requester_profile_id);
  });

  it('N11C5E-INTEGRITY-EXTREF-04: requester_profile_id no anidado dentro de incident', () => {
    const result = buildProviderRequest(makeCmd(), 'normal');
    const incident = result.incident as Record<string, unknown>;
    expect(incident['requester_profile_id']).toBeUndefined();
  });

  it('N11C5E-INTEGRITY-EXTREF-05: source_system = smart_conversations en raíz', () => {
    const result = buildProviderRequest(makeCmd(), 'normal');
    expect(result.source_system).toBe('smart_conversations');
  });

  it('N11C5E-INTEGRITY-EXTREF-06: priority normal se refleja en incident.priority', () => {
    const result = buildProviderRequest(makeCmd(), 'normal');
    expect(result.incident.priority).toBe('normal');
  });

  it('N11C5E-INTEGRITY-EXTREF-07: priority urgent se refleja en incident.priority', () => {
    const result = buildProviderRequest(makeCmd(), 'urgent');
    expect(result.incident.priority).toBe('urgent');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-INTEGRITY-HMAC — HMAC idempotency opacity (deriveIncidentIdempotencyKey)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-INTEGRITY-HMAC — HMAC idempotency opacity (RUNTIME_BEHAVIOR)', () => {
  it('N11C5E-INTEGRITY-HMAC-01: output tiene exactamente 64 caracteres', async () => {
    const key = await deriveIncidentIdempotencyKey('acct-001', 'case-001', MOCK_SECRET);
    expect(key).toHaveLength(64);
  });

  it('N11C5E-INTEGRITY-HMAC-02: output es hexadecimal válido (solo [0-9a-f])', async () => {
    const key = await deriveIncidentIdempotencyKey('acct-001', 'case-001', MOCK_SECRET);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('N11C5E-INTEGRITY-HMAC-03: output no contiene clientAccountId en claro', async () => {
    const acct = 'my-account-id';
    const key = await deriveIncidentIdempotencyKey(acct, 'case-abc', MOCK_SECRET);
    expect(key).not.toContain(acct);
  });

  it('N11C5E-INTEGRITY-HMAC-04: output no contiene convCaseId en claro', async () => {
    const caseId = 'conv-case-xyz-789';
    const key = await deriveIncidentIdempotencyKey('acct-001', caseId, MOCK_SECRET);
    expect(key).not.toContain(caseId);
  });

  it("N11C5E-INTEGRITY-HMAC-05: output no contiene 'create_incident' en claro", async () => {
    const key = await deriveIncidentIdempotencyKey('acct-001', 'case-001', MOCK_SECRET);
    expect(key).not.toContain('create_incident');
  });

  it("N11C5E-INTEGRITY-HMAC-06: output no contiene ':' (separador del input)", async () => {
    const key = await deriveIncidentIdempotencyKey('acct-001', 'case-001', MOCK_SECRET);
    expect(key).not.toContain(':');
  });

  it('N11C5E-INTEGRITY-HMAC-07: determinista — mismos inputs + mismo secreto → misma clave', async () => {
    const key1 = await deriveIncidentIdempotencyKey('acct-A', 'case-B', MOCK_SECRET);
    const key2 = await deriveIncidentIdempotencyKey('acct-A', 'case-B', MOCK_SECRET);
    expect(key1).toBe(key2);
  });

  it('N11C5E-INTEGRITY-HMAC-08: clientAccountIds distintos → claves distintas', async () => {
    const key1 = await deriveIncidentIdempotencyKey('acct-AAA', 'case-X', MOCK_SECRET);
    const key2 = await deriveIncidentIdempotencyKey('acct-BBB', 'case-X', MOCK_SECRET);
    expect(key1).not.toBe(key2);
  });

  it('N11C5E-INTEGRITY-HMAC-09: convCaseIds distintos → claves distintas', async () => {
    const key1 = await deriveIncidentIdempotencyKey('acct-X', 'case-AAA', MOCK_SECRET);
    const key2 = await deriveIncidentIdempotencyKey('acct-X', 'case-BBB', MOCK_SECRET);
    expect(key1).not.toBe(key2);
  });

  it('N11C5E-INTEGRITY-HMAC-10: secretos distintos → claves distintas (opacidad del secreto)', async () => {
    const key1 = await deriveIncidentIdempotencyKey('acct-X', 'case-Y', 'secret-alpha');
    const key2 = await deriveIncidentIdempotencyKey('acct-X', 'case-Y', 'secret-beta');
    expect(key1).not.toBe(key2);
  });

  it('N11C5E-INTEGRITY-HMAC-11: secreto offline-mock-not-real produce clave hex de 64 chars', async () => {
    const key = await deriveIncidentIdempotencyKey('acct-001', 'case-001', 'offline-mock-not-real');
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('N11C5E-INTEGRITY-HMAC-12: secreto largo (>64 chars) produce clave válida', async () => {
    const longSecret = 'a'.repeat(128);
    const key = await deriveIncidentIdempotencyKey('acct-001', 'case-001', longSecret);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('N11C5E-INTEGRITY-HMAC-13: clave no tiene caracteres mayúsculos (hex lowercase)', async () => {
    const key = await deriveIncidentIdempotencyKey('acct-001', 'case-001', MOCK_SECRET);
    expect(key).toBe(key.toLowerCase());
  });

  it('N11C5E-INTEGRITY-HMAC-14: clientAccountId con caracteres especiales produce clave válida', async () => {
    const key = await deriveIncidentIdempotencyKey('acct-001@tenant.es/v2', 'case-001', MOCK_SECRET);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('N11C5E-INTEGRITY-HMAC-15: convCaseId vacío → error INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED', async () => {
    await expect(deriveIncidentIdempotencyKey('acct-001', '', MOCK_SECRET))
      .rejects.toThrow('INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-INTEGRITY-REPLAY — Separación estricta Replay vs Conflict (RUNTIME_BEHAVIOR)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-INTEGRITY-REPLAY — Separación Replay (200) vs Conflict (409) (RUNTIME_BEHAVIOR)', () => {
  beforeEach(() => {
    process.env['APP_ENVIRONMENT'] = 'dev';
    process.env['INCIDENTS_ADDON_BASE_URL'] = 'http://mock-addon';
    process.env['INCIDENTS_ADDON_SERVICE_TOKEN'] = 'test-svc-token';
  });

  afterEach(() => {
    delete process.env['APP_ENVIRONMENT'];
    delete process.env['INCIDENTS_ADDON_BASE_URL'];
    delete process.env['INCIDENTS_ADDON_SERVICE_TOKEN'];
  });

  it('N11C5E-INTEGRITY-REPLAY-01: HTTP 409 → result.ok = false (no es éxito)', async () => {
    const mockFetch = async () => new Response(null, { status: 409 });
    const result = await createIncident(makeCmd(), { mode_override: 'real', _fetchImpl: mockFetch });
    expect(result.ok).toBe(false);
  });

  it('N11C5E-INTEGRITY-REPLAY-02: HTTP 409 → error.code = IDEMPOTENCY_CONFLICT', async () => {
    const mockFetch = async () => new Response(null, { status: 409 });
    const result = await createIncident(makeCmd(), { mode_override: 'real', _fetchImpl: mockFetch });
    expect(result.ok).toBe(false);
    const errResult = result as { ok: false; error: { code: string } };
    expect(errResult.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('N11C5E-INTEGRITY-REPLAY-03: HTTP 200 + idempotent_replay:true → result.ok = true (replay válido)', async () => {
    const replayBody = JSON.stringify({
      incident_id: 'inc-replay-001',
      incident_reference: 'INC-0042',
      status: 'new',
      created_at: new Date().toISOString(),
      idempotent_replay: true,
    });
    const mockFetch = async () => new Response(replayBody, { status: 200, headers: { 'Content-Type': 'application/json' } });
    const result = await createIncident(makeCmd(), { mode_override: 'real', _fetchImpl: mockFetch });
    expect(result.ok).toBe(true);
  });

  it('N11C5E-INTEGRITY-REPLAY-04: HTTP 200 + idempotent_replay:true → data.idempotent_replay = true', async () => {
    const replayBody = JSON.stringify({
      incident_id: 'inc-replay-001',
      incident_reference: 'INC-0042',
      status: 'new',
      created_at: new Date().toISOString(),
      idempotent_replay: true,
    });
    const mockFetch = async () => new Response(replayBody, { status: 200, headers: { 'Content-Type': 'application/json' } });
    const result = await createIncident(makeCmd(), { mode_override: 'real', _fetchImpl: mockFetch });
    expect(result.ok).toBe(true);
    expect(result.data?.idempotent_replay).toBe(true);
  });

  it('N11C5E-INTEGRITY-REPLAY-05: HTTP 201 (incidente nuevo) → result.ok = true, idempotent_replay = false', async () => {
    const newBody = JSON.stringify({
      incident_id: 'inc-new-001',
      incident_reference: 'INC-0043',
      status: 'new',
      created_at: new Date().toISOString(),
      idempotent_replay: false,
    });
    const mockFetch = async () => new Response(newBody, { status: 201, headers: { 'Content-Type': 'application/json' } });
    const result = await createIncident(makeCmd(), { mode_override: 'real', _fetchImpl: mockFetch });
    expect(result.ok).toBe(true);
    expect(result.data?.idempotent_replay).toBe(false);
  });
});
