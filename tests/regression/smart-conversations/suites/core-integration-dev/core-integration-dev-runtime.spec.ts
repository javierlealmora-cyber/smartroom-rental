/**
 * core-integration-dev-runtime.spec.ts — Fase 11C2
 * Simulación runtime de adapters Core: identidad, features, Activity Log, resiliencia.
 *
 * Todas las funciones se simulan inline — sin imports Deno, sin llamadas de red.
 * Total: 56 tests (IDR-C*)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../../../');

// ─────────────────────────────────────────────────────────────────────────────
// Constantes DEV
// ─────────────────────────────────────────────────────────────────────────────

const DEV_TENANT_A = 'dev-tenant-a-00000000-0000-0000-0000-000000000001';
const DEV_TENANT_B = 'dev-tenant-b-00000000-0000-0000-0000-000000000002';
const REAL_TENANT  = 'real-tenant-uuid-00000000-0000-0000-0000-999999999999';

type IdentityLevel = 'NO_MATCH' | 'MATCH_INACTIVE' | 'PARTIAL_MATCH_ACTIVE' | 'STRONG_MATCH_ACTIVE';
type IntegrationMode = 'mock' | 'shadow' | 'canary' | 'real' | 'disabled';
type CanonicalErrorCode =
  | 'CONFIGURATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'VALIDATION_ERROR'
  | 'TENANT_NOT_FOUND' | 'FEATURE_DISABLED' | 'RESOURCE_NOT_FOUND' | 'CONFLICT'
  | 'RATE_LIMITED' | 'TIMEOUT' | 'DEPENDENCY_UNAVAILABLE' | 'CONTRACT_MISMATCH' | 'INTERNAL_ERROR';

// ─────────────────────────────────────────────────────────────────────────────
// Framework simulado
// ─────────────────────────────────────────────────────────────────────────────

const DEV_ENVIRONMENTS = new Set(['sandbox', 'dev', 'development']);
const VALID_IDENTITY_LEVELS = new Set(['NO_MATCH', 'MATCH_INACTIVE', 'PARTIAL_MATCH_ACTIVE', 'STRONG_MATCH_ACTIVE']);

function simAssertRealModeAllowed(mode: IntegrationMode, appEnv?: string): boolean {
  if (mode !== 'real' && mode !== 'canary') return true;
  return DEV_ENVIRONMENTS.has((appEnv ?? '').toLowerCase());
}

function buildOk<T>(data: T, mode: IntegrationMode, provider: string, duration_ms = 0) {
  return {
    ok: true as const,
    data,
    meta: { request_id: 'test-rid', correlation_id: 'test-cid', provider, mode, duration_ms, idempotent_replay: false },
  };
}

function buildErr(code: CanonicalErrorCode, message: string, mode: IntegrationMode, provider: string) {
  return {
    ok: false as const,
    error: { code, message, retryable: code === 'TIMEOUT' || code === 'DEPENDENCY_UNAVAILABLE', retry_after_seconds: null },
    meta: { request_id: 'test-rid', correlation_id: 'test-cid', provider, mode, duration_ms: 0, idempotent_replay: false },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulación target guard
// ─────────────────────────────────────────────────────────────────────────────

function simTargetGuard(env: { APP_ENVIRONMENT?: string; CORE_BASE_URL?: string; CORE_SERVICE_TOKEN?: string }) {
  if (!env.APP_ENVIRONMENT) return { ok: false, reason: 'APP_ENVIRONMENT_NOT_SET' };
  if (!DEV_ENVIRONMENTS.has(env.APP_ENVIRONMENT.toLowerCase())) return { ok: false, reason: 'APP_ENVIRONMENT_NOT_DEV' };
  if (!env.CORE_BASE_URL) return { ok: false, reason: 'CORE_BASE_URL_NOT_SET' };
  const low = env.CORE_BASE_URL.toLowerCase();
  if (low.includes('production') || low.includes('staging')) return { ok: false, reason: 'CORE_URL_NOT_DEV' };
  if (!env.CORE_SERVICE_TOKEN) return { ok: false, reason: 'CORE_SERVICE_TOKEN_NOT_SET' };
  if (env.CORE_SERVICE_TOKEN === 'mock') return { ok: false, reason: 'CORE_SERVICE_TOKEN_IS_PLACEHOLDER' };
  return { ok: true, reason: 'ALL_CHECKS_PASSED' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulación circuit breaker
// ─────────────────────────────────────────────────────────────────────────────

type CircuitState = 'closed' | 'open' | 'half_open';
interface Circuit { state: CircuitState; failures: number; opened_at: number | null; }
const _circuits = new Map<string, Circuit>();

function simGetCircuit(name: string): Circuit {
  if (!_circuits.has(name)) _circuits.set(name, { state: 'closed', failures: 0, opened_at: null });
  return _circuits.get(name)!;
}
function simFailCircuit(name: string, threshold = 3) {
  const c = simGetCircuit(name);
  c.failures++;
  if (c.state === 'closed' && c.failures >= threshold) {
    c.state = 'open';
    c.opened_at = Date.now();
  }
}
function simCheckCircuit(name: string, half_open_after_ms = 30000): boolean {
  const c = simGetCircuit(name);
  if (c.state === 'closed') return true;
  if (c.state === 'open') {
    if (Date.now() - (c.opened_at ?? 0) >= half_open_after_ms) { c.state = 'half_open'; return true; }
    return false;
  }
  return true; // half_open: probe
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulación identity adapter
// ─────────────────────────────────────────────────────────────────────────────

interface IdentityRequest { client_account_id: string; correlation_id: string; identity_input: { provided_name: string | null; provided_phone: string | null; accommodation_reference: string | null; room_reference: string | null; }; }
interface IdentityResult { identity_level: IdentityLevel; profile_id: string | null; matched_fields: string[]; missing_fields: string[]; }

const IDENTITY_FORBIDDEN_FIELDS = new Set(['conversation', 'raw_payload', 'jid', 'webchat_token', 'prompt', 'full_name', 'authorization']);

function simValidateIdentityReq(req: IdentityRequest) {
  if (!req.client_account_id) return { valid: false, reason: 'client_account_id_required' };
  if (!req.correlation_id) return { valid: false, reason: 'correlation_id_required' };
  if (!req.identity_input) return { valid: false, reason: 'identity_input_required' };
  for (const key of Object.keys(req)) {
    if (IDENTITY_FORBIDDEN_FIELDS.has(key.toLowerCase())) return { valid: false, reason: `forbidden_field: ${key}` };
  }
  return { valid: true };
}

function simValidateIdentityResp(raw: unknown): raw is IdentityResult {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  return VALID_IDENTITY_LEVELS.has(r['identity_level'] as string) && Array.isArray(r['matched_fields']) && Array.isArray(r['missing_fields']);
}

function simMockIdentity(req: IdentityRequest) {
  const { provided_name, provided_phone } = req.identity_input;
  if (provided_name && provided_phone) return buildOk<IdentityResult>({ identity_level: 'STRONG_MATCH_ACTIVE', profile_id: 'mock-profile', matched_fields: ['name','phone'], missing_fields: [] }, 'mock', 'core');
  if (provided_name || provided_phone) return buildOk<IdentityResult>({ identity_level: 'PARTIAL_MATCH_ACTIVE', profile_id: 'mock-profile', matched_fields: provided_name ? ['name'] : ['phone'], missing_fields: provided_name ? ['phone'] : ['name'] }, 'mock', 'core');
  return buildOk<IdentityResult>({ identity_level: 'NO_MATCH', profile_id: null, matched_fields: [], missing_fields: ['name','phone'] }, 'mock', 'core');
}

function simCallIdentity(
  req: IdentityRequest,
  opts: { mode: IntegrationMode; appEnv?: string; core_response?: unknown; http_status?: number; timeout?: boolean }
) {
  if (!simAssertRealModeAllowed(opts.mode, opts.appEnv)) {
    return buildErr('CONFIGURATION_ERROR', 'real_mode_requires_dev_environment', opts.mode, 'core');
  }
  const v = simValidateIdentityReq(req);
  if (!v.valid) return buildErr('VALIDATION_ERROR', v.reason ?? 'invalid', opts.mode, 'core');
  if (opts.mode === 'mock') return simMockIdentity(req);
  if (!simCheckCircuit('core')) return buildErr('DEPENDENCY_UNAVAILABLE', 'circuit_open', opts.mode, 'core');
  if (opts.timeout) return buildErr('TIMEOUT', 'core_identity_timeout', opts.mode, 'core');
  if (opts.http_status === 401) return buildErr('UNAUTHORIZED', 'core_auth_failed', opts.mode, 'core');
  if (opts.http_status === 404) return buildErr('TENANT_NOT_FOUND', 'tenant_not_found', opts.mode, 'core');
  if (opts.core_response) {
    const raw = opts.core_response as Record<string, unknown>;
    if (typeof raw['client_account_id'] === 'string' && raw['client_account_id'] !== req.client_account_id) {
      return buildErr('FORBIDDEN', 'response_tenant_mismatch', opts.mode, 'core');
    }
    if (!simValidateIdentityResp(raw)) return buildErr('CONTRACT_MISMATCH', 'identity_response_invalid', opts.mode, 'core');
    return buildOk(raw as IdentityResult, opts.mode, 'core');
  }
  return buildErr('DEPENDENCY_UNAVAILABLE', 'no_real_fetch_in_test', opts.mode, 'core');
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulación features adapter
// ─────────────────────────────────────────────────────────────────────────────

function simCallFeatures(client_account_id: string, opts: { mode: IntegrationMode; appEnv?: string; http_status?: number; response?: unknown }) {
  if (!simAssertRealModeAllowed(opts.mode, opts.appEnv)) return buildErr('CONFIGURATION_ERROR', 'real_mode_requires_dev_environment', opts.mode, 'core');
  if (!client_account_id) return buildErr('VALIDATION_ERROR', 'client_account_id_required', opts.mode, 'core');
  if (opts.mode === 'mock') {
    return buildOk({ smart_conversations: client_account_id.startsWith('dev-tenant'), services: { conv_incidencias: true, conv_publicaciones: false, conv_ayuda: true }, channels: { webchat: true, whatsapp: false } }, 'mock', 'core');
  }
  if (opts.http_status === 404) return buildErr('TENANT_NOT_FOUND', 'tenant_not_found', opts.mode, 'core');
  if (opts.http_status === 401) return buildErr('UNAUTHORIZED', 'core_auth_failed', opts.mode, 'core');
  if (opts.response) {
    const raw = opts.response as Record<string, unknown>;
    if (typeof raw['client_account_id'] === 'string' && raw['client_account_id'] !== client_account_id) return buildErr('FORBIDDEN', 'response_tenant_mismatch', opts.mode, 'core');
    if (typeof raw['smart_conversations'] !== 'boolean') return buildErr('CONTRACT_MISMATCH', 'features_response_invalid', opts.mode, 'core');
    return buildOk(raw, opts.mode, 'core');
  }
  return buildErr('DEPENDENCY_UNAVAILABLE', 'no_real_fetch_in_test', opts.mode, 'core');
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulación Activity Log adapter
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_EVENTS = new Set([
  'conv_subscription_activated','conv_channel_connected','conv_channel_offboarded',
  'conv_conversation_started','conv_identity_validated','conv_pre_incident_created',
  'conv_incident_created','conv_lead_created','conv_case_escalated',
  'conv_case_summary_updated','conv_case_closed','conv_case_created',
  'conv_message_delivery_failed',
]);
const FORBIDDEN_META = new Set(['message_text','phone','email','sender_ref','profile_id','jid','raw_payload']);

function simPublishActivity(
  req: { event_type: string; client_account_id: string; idempotency_key: string; metadata?: Record<string,unknown> },
  opts: { mode: IntegrationMode; appEnv?: string; dup_store?: Set<string>; shadow_reject?: boolean; http_status?: number }
) {
  if (opts.mode === 'shadow') return buildErr('CONFIGURATION_ERROR', 'shadow_not_allowed_for_activity_log', 'shadow', 'core');
  if (!ALLOWED_EVENTS.has(req.event_type)) return buildErr('VALIDATION_ERROR', `unknown_event_type: ${req.event_type}`, opts.mode, 'core');
  if (!simAssertRealModeAllowed(opts.mode, opts.appEnv)) return buildErr('CONFIGURATION_ERROR', 'real_mode_requires_dev_environment', opts.mode, 'core');
  if (req.metadata) {
    for (const k of Object.keys(req.metadata)) if (FORBIDDEN_META.has(k)) return buildErr('VALIDATION_ERROR', `forbidden_metadata_field: ${k}`, opts.mode, 'core');
  }
  if (opts.mode === 'mock') return buildOk({ published: true, idempotent: false }, 'mock', 'core');
  // idempotency
  if (opts.dup_store) {
    const key = `${req.client_account_id}:${req.idempotency_key}`;
    if (opts.dup_store.has(key)) return buildOk({ published: true, idempotent: true }, opts.mode, 'core');
    opts.dup_store.add(key);
  }
  if (opts.http_status && opts.http_status >= 500) return buildOk({ published: false, idempotent: false }, opts.mode, 'core'); // fire-and-log
  return buildOk({ published: true, idempotent: false }, opts.mode, 'core');
}

// ─────────────────────────────────────────────────────────────────────────────
// IDR-CENV — Entorno runtime
// ─────────────────────────────────────────────────────────────────────────────

describe('IDR-CENV — Target guard runtime', () => {
  it('IDR-CENV-01: sandbox → DEV_CONFIRMED', () => {
    const r = simTargetGuard({ APP_ENVIRONMENT: 'sandbox', CORE_BASE_URL: 'https://dev.api.example.com', CORE_SERVICE_TOKEN: 'real-token-abc' });
    expect(r.ok).toBe(true);
  });
  it('IDR-CENV-02: dev → DEV_CONFIRMED', () => {
    const r = simTargetGuard({ APP_ENVIRONMENT: 'dev', CORE_BASE_URL: 'https://dev.api.example.com', CORE_SERVICE_TOKEN: 'real-token-abc' });
    expect(r.ok).toBe(true);
  });
  it('IDR-CENV-03: development → DEV_CONFIRMED', () => {
    const r = simTargetGuard({ APP_ENVIRONMENT: 'development', CORE_BASE_URL: 'https://dev.api.example.com', CORE_SERVICE_TOKEN: 'real-token-abc' });
    expect(r.ok).toBe(true);
  });
  it('IDR-CENV-04: production → NOT_DEV (bloqueado)', () => {
    const r = simTargetGuard({ APP_ENVIRONMENT: 'production', CORE_BASE_URL: 'https://api.example.com', CORE_SERVICE_TOKEN: 'real-token-abc' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('APP_ENVIRONMENT_NOT_DEV');
  });
  it('IDR-CENV-05: staging → NOT_DEV (bloqueado)', () => {
    const r = simTargetGuard({ APP_ENVIRONMENT: 'staging', CORE_BASE_URL: 'https://api.example.com', CORE_SERVICE_TOKEN: 'real-token-abc' });
    expect(r.ok).toBe(false);
  });
  it('IDR-CENV-06: URL producción → CORE_URL_NOT_DEV', () => {
    const r = simTargetGuard({ APP_ENVIRONMENT: 'sandbox', CORE_BASE_URL: 'https://production.api.example.com', CORE_SERVICE_TOKEN: 'real-token-abc' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('CORE_URL_NOT_DEV');
  });
  it('IDR-CENV-07: token ausente → CORE_SERVICE_TOKEN_NOT_SET', () => {
    const r = simTargetGuard({ APP_ENVIRONMENT: 'sandbox', CORE_BASE_URL: 'https://dev.api.example.com' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('CORE_SERVICE_TOKEN_NOT_SET');
  });
  it('IDR-CENV-08: token placeholder → CORE_SERVICE_TOKEN_IS_PLACEHOLDER', () => {
    const r = simTargetGuard({ APP_ENVIRONMENT: 'sandbox', CORE_BASE_URL: 'https://dev.api.example.com', CORE_SERVICE_TOKEN: 'mock' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('CORE_SERVICE_TOKEN_IS_PLACEHOLDER');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IDR-CID — Identity runtime
// ─────────────────────────────────────────────────────────────────────────────

describe('IDR-CID — Identity runtime simulation', () => {
  beforeEach(() => { _circuits.clear(); });

  const baseReq: IdentityRequest = {
    client_account_id: DEV_TENANT_A,
    correlation_id: 'test-cid-001',
    identity_input: { provided_name: 'Juan Prueba', provided_phone: '600000001', accommodation_reference: 'ALJ-DEV-001', room_reference: null },
  };

  it('IDR-CID-01: strong match (name + phone)', () => {
    const r = simCallIdentity(baseReq, { mode: 'mock' });
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.data.identity_level).toBe('STRONG_MATCH_ACTIVE'); expect(r.data.profile_id).toBeTruthy(); }
  });
  it('IDR-CID-02: partial match (solo name)', () => {
    const req = { ...baseReq, identity_input: { ...baseReq.identity_input, provided_phone: null } };
    const r = simCallIdentity(req, { mode: 'mock' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.identity_level).toBe('PARTIAL_MATCH_ACTIVE');
  });
  it('IDR-CID-03: no match (sin datos)', () => {
    const req = { ...baseReq, identity_input: { provided_name: null, provided_phone: null, accommodation_reference: null, room_reference: null } };
    const r = simCallIdentity(req, { mode: 'mock' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.identity_level).toBe('NO_MATCH');
  });
  it('IDR-CID-04: enum desconocido → CONTRACT_MISMATCH', () => {
    const r = simCallIdentity(baseReq, { mode: 'canary', appEnv: 'sandbox', core_response: { identity_level: 'WEAK_MATCH', matched_fields: [], missing_fields: [] } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('CONTRACT_MISMATCH');
  });
  it('IDR-CID-05: cross-tenant en respuesta → FORBIDDEN response_tenant_mismatch', () => {
    const r = simCallIdentity(baseReq, { mode: 'canary', appEnv: 'sandbox', core_response: { client_account_id: DEV_TENANT_B, identity_level: 'STRONG_MATCH_ACTIVE', profile_id: 'other', matched_fields: [], missing_fields: [] } });
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.error.code).toBe('FORBIDDEN'); expect(r.error.message).toBe('response_tenant_mismatch'); }
  });
  it('IDR-CID-06: timeout → TIMEOUT canónico', () => {
    const r = simCallIdentity(baseReq, { mode: 'canary', appEnv: 'sandbox', timeout: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('TIMEOUT');
  });
  it('IDR-CID-07: 401 → UNAUTHORIZED', () => {
    const r = simCallIdentity(baseReq, { mode: 'canary', appEnv: 'sandbox', http_status: 401 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('UNAUTHORIZED');
  });
  it('IDR-CID-08: tenant no existe → TENANT_NOT_FOUND', () => {
    const req = { ...baseReq, client_account_id: 'nonexistent-tenant' };
    const r = simCallIdentity(req, { mode: 'canary', appEnv: 'sandbox', http_status: 404 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('TENANT_NOT_FOUND');
  });
  it('IDR-CID-09: circuit abierto → DEPENDENCY_UNAVAILABLE', () => {
    for (let i = 0; i < 3; i++) simFailCircuit('core');
    const r = simCallIdentity(baseReq, { mode: 'canary', appEnv: 'sandbox' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('DEPENDENCY_UNAVAILABLE');
  });
  it('IDR-CID-10: campo prohibido en request → VALIDATION_ERROR', () => {
    const req = { ...baseReq, conversation: 'esto es PII' } as unknown as IdentityRequest;
    const r = simCallIdentity(req, { mode: 'mock' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('VALIDATION_ERROR');
  });
  it('IDR-CID-11: real sin DEV env → CONFIGURATION_ERROR', () => {
    const r = simCallIdentity(baseReq, { mode: 'real', appEnv: undefined });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('CONFIGURATION_ERROR');
  });
  it('IDR-CID-12: canary sin DEV env → CONFIGURATION_ERROR', () => {
    const r = simCallIdentity(baseReq, { mode: 'canary', appEnv: 'production' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('CONFIGURATION_ERROR');
  });
  it('IDR-CID-13: correlation_id ausente → VALIDATION_ERROR', () => {
    const req = { ...baseReq, correlation_id: '' };
    const r = simCallIdentity(req, { mode: 'mock' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('VALIDATION_ERROR');
  });
  it('IDR-CID-14: retry técnico no incrementa intentos conversacionales', () => {
    // SmartConversations gestiona los intentos; Core solo responde al HTTP call
    // Un retry HTTP no puede contabilizarse como nuevo intento de identidad
    let retries = 0;
    function simRetry(req: IdentityRequest, maxRetries: number) {
      let r;
      do {
        r = simCallIdentity(req, { mode: 'mock' });
        retries++;
      } while (!r.ok && retries < maxRetries);
      return { result: r, http_retries: retries };
    }
    const { result, http_retries } = simRetry(baseReq, 3);
    expect(result.ok).toBe(true);
    expect(http_retries).toBe(1); // mock siempre ok al primer intento
  });
  it('IDR-CID-15: Core no devuelve instrucciones de diálogo', () => {
    const r = simCallIdentity(baseReq, { mode: 'mock' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data).not.toHaveProperty('dialog_instruction');
      expect(r.data).not.toHaveProperty('next_message');
      expect(r.data).not.toHaveProperty('suggested_response');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IDR-CFEA — Features runtime
// ─────────────────────────────────────────────────────────────────────────────

describe('IDR-CFEA — Features runtime simulation', () => {
  it('IDR-CFEA-01: Tenant A → smart_conversations:true', () => {
    const r = simCallFeatures(DEV_TENANT_A, { mode: 'mock' });
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.data as Record<string,unknown>)['smart_conversations']).toBe(true);
  });
  it('IDR-CFEA-02: Tenant real → smart_conversations:false (mock)', () => {
    const r = simCallFeatures(REAL_TENANT, { mode: 'mock' });
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.data as Record<string,unknown>)['smart_conversations']).toBe(false);
  });
  it('IDR-CFEA-03: tenant inexistente (404) → TENANT_NOT_FOUND', () => {
    const r = simCallFeatures('nonexistent', { mode: 'canary', appEnv: 'sandbox', http_status: 404 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('TENANT_NOT_FOUND');
  });
  it('IDR-CFEA-04: respuesta de tenant ajeno → FORBIDDEN', () => {
    const r = simCallFeatures(DEV_TENANT_A, { mode: 'canary', appEnv: 'sandbox', response: { client_account_id: DEV_TENANT_B, smart_conversations: true, services: {}, channels: {} } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('FORBIDDEN');
  });
  it('IDR-CFEA-05: respuesta incompleta → CONTRACT_MISMATCH', () => {
    const r = simCallFeatures(DEV_TENANT_A, { mode: 'canary', appEnv: 'sandbox', response: { services: {}, channels: {} } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('CONTRACT_MISMATCH');
  });
  it('IDR-CFEA-06: servicio inactivo en respuesta', () => {
    const r = simCallFeatures(DEV_TENANT_A, { mode: 'mock' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const d = r.data as Record<string, unknown>;
      const services = d['services'] as Record<string, boolean>;
      expect(services['conv_publicaciones']).toBe(false);
    }
  });
  it('IDR-CFEA-07: canal inactivo en respuesta', () => {
    const r = simCallFeatures(DEV_TENANT_A, { mode: 'mock' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const channels = (r.data as Record<string, unknown>)['channels'] as Record<string, boolean>;
      expect(channels['whatsapp']).toBe(false);
    }
  });
  it('IDR-CFEA-08: auth inválida (401) → UNAUTHORIZED', () => {
    const r = simCallFeatures(DEV_TENANT_A, { mode: 'canary', appEnv: 'sandbox', http_status: 401 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('UNAUTHORIZED');
  });
  it('IDR-CFEA-09: client_account_id ausente → VALIDATION_ERROR', () => {
    const r = simCallFeatures('', { mode: 'mock' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('VALIDATION_ERROR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IDR-CACT — Activity Log runtime
// ─────────────────────────────────────────────────────────────────────────────

describe('IDR-CACT — Activity Log runtime simulation', () => {
  const makeReq = (event_type: string, metadata?: Record<string,unknown>) => ({
    event_type,
    client_account_id: DEV_TENANT_A,
    idempotency_key: `key-${event_type}-001`,
    metadata,
  });

  const ALL_EVENTS = [
    'conv_subscription_activated','conv_channel_connected','conv_channel_offboarded',
    'conv_conversation_started','conv_identity_validated','conv_pre_incident_created',
    'conv_incident_created','conv_lead_created','conv_case_escalated',
    'conv_case_summary_updated','conv_case_closed','conv_case_created',
    'conv_message_delivery_failed',
  ];

  it('IDR-CACT-01: los 13 eventos permiten publicación en mock', () => {
    for (const event of ALL_EVENTS) {
      const r = simPublishActivity(makeReq(event), { mode: 'mock' });
      expect(r.ok).toBe(true);
    }
  });

  it('IDR-CACT-02: evento desconocido → VALIDATION_ERROR', () => {
    const r = simPublishActivity(makeReq('conv_unknown_event'), { mode: 'mock' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('VALIDATION_ERROR');
  });

  it('IDR-CACT-03: metadata con message_text → VALIDATION_ERROR', () => {
    const r = simPublishActivity(makeReq('conv_conversation_started', { message_text: 'texto privado' }), { mode: 'mock' });
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.error.code).toBe('VALIDATION_ERROR'); expect(r.error.message).toContain('forbidden_metadata_field'); }
  });

  it('IDR-CACT-04: metadata con profile_id → VALIDATION_ERROR', () => {
    const r = simPublishActivity(makeReq('conv_identity_validated', { profile_id: 'uuid' }), { mode: 'mock' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('VALIDATION_ERROR');
  });

  it('IDR-CACT-05: idempotencia — mismo key devuelve idempotent:true', () => {
    const store = new Set<string>();
    const req = makeReq('conv_case_created');
    const r1 = simPublishActivity(req, { mode: 'canary', appEnv: 'sandbox', dup_store: store });
    const r2 = simPublishActivity(req, { mode: 'canary', appEnv: 'sandbox', dup_store: store });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok) expect((r1.data as Record<string,unknown>)['idempotent']).toBe(false);
    if (r2.ok) expect((r2.data as Record<string,unknown>)['idempotent']).toBe(true);
  });

  it('IDR-CACT-06: fire-and-log — fallo Core no propaga al caller', () => {
    const r = simPublishActivity(makeReq('conv_case_closed'), { mode: 'canary', appEnv: 'sandbox', http_status: 503 });
    // Fire-and-log: ok:true incluso con Core caído
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.data as Record<string,unknown>)['published']).toBe(false);
  });

  it('IDR-CACT-07: shadow rechazado (mutante)', () => {
    const r = simPublishActivity(makeReq('conv_lead_created'), { mode: 'shadow' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('shadow_not_allowed_for_activity_log');
  });

  it('IDR-CACT-08: canary sin DEV env → CONFIGURATION_ERROR', () => {
    const r = simPublishActivity(makeReq('conv_incident_created'), { mode: 'canary', appEnv: 'production' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('CONFIGURATION_ERROR');
  });

  it('IDR-CACT-09: metadata con jid → VALIDATION_ERROR', () => {
    const r = simPublishActivity(makeReq('conv_channel_connected', { jid: '34600@s.whatsapp.net' }), { mode: 'mock' });
    expect(r.ok).toBe(false);
  });

  it('IDR-CACT-10: metadata con sender_ref → VALIDATION_ERROR', () => {
    const r = simPublishActivity(makeReq('conv_conversation_started', { sender_ref: 'ref-001' }), { mode: 'mock' });
    expect(r.ok).toBe(false);
  });

  it('IDR-CACT-11: idempotency key aislada por tenant', () => {
    const store = new Set<string>();
    const key = 'shared-key-001';
    simPublishActivity({ ...makeReq('conv_lead_created'), client_account_id: DEV_TENANT_A, idempotency_key: key }, { mode: 'canary', appEnv: 'sandbox', dup_store: store });
    // Mismo key para Tenant B NO es duplicado (diferente client_account_id)
    const r = simPublishActivity({ ...makeReq('conv_lead_created'), client_account_id: DEV_TENANT_B, idempotency_key: key }, { mode: 'canary', appEnv: 'sandbox', dup_store: store });
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.data as Record<string,unknown>)['idempotent']).toBe(false);
  });

  it('IDR-CACT-12: metadata permitida (outcome, integration, request_id)', () => {
    const r = simPublishActivity(makeReq('conv_case_escalated', { outcome: 'escalated', integration: 'webchat', request_id: 'rid-001' }), { mode: 'mock' });
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.data as Record<string,unknown>)['published']).toBe(true);
  });

  it('IDR-CACT-13: phone en metadata → VALIDATION_ERROR', () => {
    const r = simPublishActivity(makeReq('conv_identity_validated', { phone: '600000001' }), { mode: 'mock' });
    expect(r.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IDR-CRES — Resiliencia
// ─────────────────────────────────────────────────────────────────────────────

describe('IDR-CRES — Resiliencia y circuit breaker', () => {
  beforeEach(() => { _circuits.clear(); });

  const baseReq: IdentityRequest = {
    client_account_id: DEV_TENANT_A,
    correlation_id: 'test-cid-res',
    identity_input: { provided_name: 'Test', provided_phone: '600', accommodation_reference: null, room_reference: null },
  };

  it('IDR-CRES-01: circuit abierto tras 3 fallos', () => {
    for (let i = 0; i < 3; i++) simFailCircuit('core');
    expect(simCheckCircuit('core')).toBe(false);
  });

  it('IDR-CRES-02: circuit closed → request permitido', () => {
    expect(simCheckCircuit('core')).toBe(true);
  });

  it('IDR-CRES-03: half-open tras timeout del circuit breaker', () => {
    for (let i = 0; i < 3; i++) simFailCircuit('core');
    const c = simGetCircuit('core');
    c.opened_at = Date.now() - 35000; // 35s > 30s half_open_after
    expect(simCheckCircuit('core', 30000)).toBe(true);
    expect(simGetCircuit('core').state).toBe('half_open');
  });

  it('IDR-CRES-04: fallo 4xx no retryable (funcional)', () => {
    const r = simCallIdentity(baseReq, { mode: 'canary', appEnv: 'sandbox', http_status: 401 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.retryable).toBe(false);
  });

  it('IDR-CRES-05: DEPENDENCY_UNAVAILABLE es retryable', () => {
    for (let i = 0; i < 3; i++) simFailCircuit('core');
    const r = simCallIdentity(baseReq, { mode: 'canary', appEnv: 'sandbox' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.retryable).toBe(true);
  });

  it('IDR-CRES-06: TIMEOUT es retryable', () => {
    const r = simCallIdentity(baseReq, { mode: 'canary', appEnv: 'sandbox', timeout: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.retryable).toBe(true);
  });

  it('IDR-CRES-07: Core caído no convierte identidad en positiva', () => {
    for (let i = 0; i < 3; i++) simFailCircuit('core');
    const r = simCallIdentity(baseReq, { mode: 'canary', appEnv: 'sandbox' });
    // NUNCA se transforma un fallo en STRONG_MATCH_ACTIVE
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('DEPENDENCY_UNAVAILABLE');
  });

  it('IDR-CRES-08: respuesta raw de Core no se expone (error canónico)', () => {
    const r = simCallIdentity(baseReq, { mode: 'canary', appEnv: 'sandbox', http_status: 401 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).not.toHaveProperty('stack');
      expect(r.error).not.toHaveProperty('raw_response');
    }
  });
});
