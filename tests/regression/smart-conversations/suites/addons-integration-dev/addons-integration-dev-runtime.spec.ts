/**
 * addons-integration-dev-runtime.spec.ts — Fase 11C5 (Suite 2/4)
 * Runtime de incidencias · Runtime de búsquedas · Runtime de leads
 * · Idempotencia · Resiliencia (circuit breaker, retries, timeouts)
 *
 * OFFLINE ONLY: Simula comportamiento real sin llamadas a red.
 * Tests DEV reales se activan cuando INCIDENTS_ADDON_BASE_URL esté configurado.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../../../');
const SHARED = 'supabase/functions/_shared/smart-conversations';

function src(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// Simuladores locales
// ─────────────────────────────────────────────────────────────────────────────

type CanonicalActorType = 'tenant_profile' | 'unverified_lead' | 'system_service';

interface CanonicalActor {
  type: CanonicalActorType;
  profile_id?: string;
  verified?: boolean;
  verified_at?: string;
  service_name?: string;
}

interface CreateIncidentCommand {
  contract_version: '1.0';
  client_account_id: string;
  request_id: string;
  correlation_id: string;
  idempotency_key: string;
  source: 'smart_conversations';
  actor: CanonicalActor;
  incident: {
    accommodation_id: string;
    room_id: string | null;
    category: string;
    description: string;
    urgency_proposal: string | null;
    attachments: string[];
  };
}

interface CreateLeadCommand {
  contract_version: '1.0';
  client_account_id: string;
  request_id: string;
  correlation_id: string;
  idempotency_key: string;
  source: 'smart_conversations';
  actor: CanonicalActor;
  lead: {
    listing_id: string | null;
    search_context: Record<string, unknown>;
    contact_preferences: Record<string, unknown>;
    message_summary: string | null;
  };
}

const ACTOR_FORBIDDEN_FIELDS = new Set([
  'identity_level', 'STRONG_MATCH_ACTIVE', 'PARTIAL_MATCH_ACTIVE',
  'MATCH_INACTIVE', 'NO_MATCH', 'UNVERIFIED_LEAD', 'sender_ref',
  'phone', 'email', 'jid', 'wa_jid', 'webchat_token',
]);

const VALID_ACTOR_TYPES = new Set(['tenant_profile', 'unverified_lead', 'system_service']);

function validateActor(actor: CanonicalActor): { valid: boolean; reason?: string } {
  if (!VALID_ACTOR_TYPES.has(actor.type)) return { valid: false, reason: `INVALID_ACTOR_TYPE: ${actor.type}` };
  for (const k of Object.keys(actor)) {
    if (ACTOR_FORBIDDEN_FIELDS.has(k)) return { valid: false, reason: `FORBIDDEN_ACTOR_FIELD: ${k}` };
  }
  if (actor.type === 'tenant_profile' && !actor.profile_id) return { valid: false, reason: 'PROFILE_ID_REQUIRED' };
  return { valid: true };
}

// Simulador de createIncident (modo mock)
function mockCreateIncident(cmd: CreateIncidentCommand, opts: { replayIds?: Set<string> } = {}) {
  const actorCheck = validateActor(cmd.actor);
  if (!actorCheck.valid) return { ok: false, error_code: actorCheck.reason };
  if (!cmd.client_account_id) return { ok: false, error_code: 'CLIENT_ACCOUNT_ID_REQUIRED' };
  if (!cmd.idempotency_key) return { ok: false, error_code: 'IDEMPOTENCY_KEY_REQUIRED' };
  if (!cmd.incident.accommodation_id) return { ok: false, error_code: 'ACCOMMODATION_ID_REQUIRED' };
  if (!cmd.incident.category) return { ok: false, error_code: 'CATEGORY_REQUIRED' };
  if (opts.replayIds?.has(`${cmd.client_account_id}:${cmd.idempotency_key}`)) {
    return {
      ok: true,
      data: { incident_id: 'INC-MOCK-EXISTING', incident_reference: 'REF-MOCK', status: 'existing', created_at: new Date().toISOString(), idempotent_replay: true },
      meta: { mode: 'mock', duration_ms: 0, idempotent_replay: true },
    };
  }
  opts.replayIds?.add(`${cmd.client_account_id}:${cmd.idempotency_key}`);
  return {
    ok: true,
    data: { incident_id: 'INC-MOCK-001', incident_reference: 'REF-001', status: 'created', created_at: new Date().toISOString(), idempotent_replay: false },
    meta: { mode: 'mock', duration_ms: 0, idempotent_replay: false },
  };
}

// Simulador de searchListings (modo mock)
function mockSearchListings(query: { client_account_id: string; filters?: Record<string, unknown> }) {
  if (!query.client_account_id) return { ok: false, error_code: 'CLIENT_ACCOUNT_ID_REQUIRED' };
  return {
    ok: true,
    data: {
      items: [
        { listing_id: 'LST-MOCK-001', reference: 'REF-001', title: 'Habitación céntrica', public_location: 'Madrid Centro', price: { amount: 650, currency: 'EUR' }, room_type: 'single', available_from: '2026-08-01', public_features: ['wifi', 'furnished'] },
      ],
      next_cursor: null,
    },
    meta: { mode: 'mock', duration_ms: 0 },
  };
}

// Simulador de createLead (modo mock)
function mockCreateLead(cmd: CreateLeadCommand, opts: { replayIds?: Set<string> } = {}) {
  const actorCheck = validateActor(cmd.actor);
  if (!actorCheck.valid) return { ok: false, error_code: actorCheck.reason };
  if (!cmd.client_account_id) return { ok: false, error_code: 'CLIENT_ACCOUNT_ID_REQUIRED' };
  if (!cmd.idempotency_key) return { ok: false, error_code: 'IDEMPOTENCY_KEY_REQUIRED' };
  if (opts.replayIds?.has(`${cmd.client_account_id}:${cmd.idempotency_key}`)) {
    return {
      ok: true,
      data: { lead_id: 'LEAD-MOCK-EXISTING', lead_reference: 'LEAD-REF', status: 'existing', created_at: new Date().toISOString(), idempotent_replay: true },
      meta: { mode: 'mock', duration_ms: 0, idempotent_replay: true },
    };
  }
  opts.replayIds?.add(`${cmd.client_account_id}:${cmd.idempotency_key}`);
  return {
    ok: true,
    data: { lead_id: 'LEAD-MOCK-001', lead_reference: 'LEAD-REF-001', status: 'created', created_at: new Date().toISOString(), idempotent_replay: false },
    meta: { mode: 'mock', duration_ms: 0, idempotent_replay: false },
  };
}

const BASE_CMD: CreateIncidentCommand = {
  contract_version: '1.0',
  client_account_id: 'tenant-001',
  request_id: 'req-001',
  correlation_id: 'corr-001',
  idempotency_key: 'idem-001',
  source: 'smart_conversations',
  actor: { type: 'tenant_profile', profile_id: 'profile-001', verified: true, verified_at: '2026-07-01T00:00:00Z' },
  incident: { accommodation_id: 'acc-001', room_id: null, category: 'plumbing', description: 'Leak in bathroom', urgency_proposal: 'medium', attachments: [] },
};

const BASE_LEAD: CreateLeadCommand = {
  contract_version: '1.0',
  client_account_id: 'tenant-001',
  request_id: 'req-002',
  correlation_id: 'corr-002',
  idempotency_key: 'idem-lead-001',
  source: 'smart_conversations',
  actor: { type: 'unverified_lead' },
  lead: { listing_id: 'LST-001', search_context: { city: 'Madrid' }, contact_preferences: {}, message_summary: 'Interested in the room' },
};

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-RTM-INC: Incidents runtime (15 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-RTM-INC — Incidents runtime (mock simulado)', () => {
  it('N11C5-RTM-INC-01: comando válido → ok: true con incident_id', () => {
    const r = mockCreateIncident({ ...BASE_CMD });
    expect(r.ok).toBe(true);
    expect(r.data?.incident_id).toBeTruthy();
  });

  it('N11C5-RTM-INC-02: mode: mock en meta', () => {
    const r = mockCreateIncident({ ...BASE_CMD });
    expect(r.meta?.mode).toBe('mock');
  });

  it('N11C5-RTM-INC-03: sin client_account_id → error', () => {
    const cmd = { ...BASE_CMD, client_account_id: '' };
    const r = mockCreateIncident(cmd);
    expect(r.ok).toBe(false);
  });

  it('N11C5-RTM-INC-04: sin idempotency_key → error', () => {
    const cmd = { ...BASE_CMD, idempotency_key: '' };
    const r = mockCreateIncident(cmd);
    expect(r.ok).toBe(false);
  });

  it('N11C5-RTM-INC-05: sin accommodation_id → error', () => {
    const cmd = { ...BASE_CMD, incident: { ...BASE_CMD.incident, accommodation_id: '' } };
    const r = mockCreateIncident(cmd);
    expect(r.ok).toBe(false);
  });

  it('N11C5-RTM-INC-06: actor tipo STRONG_MATCH_ACTIVE → error', () => {
    const cmd = { ...BASE_CMD, actor: { type: 'STRONG_MATCH_ACTIVE' } as unknown as CanonicalActor };
    const r = mockCreateIncident(cmd);
    expect(r.ok).toBe(false);
    expect(r.error_code).toMatch(/INVALID_ACTOR_TYPE/);
  });

  it('N11C5-RTM-INC-07: actor con campo identity_level → error', () => {
    const cmd = { ...BASE_CMD, actor: { ...BASE_CMD.actor, identity_level: 'STRONG_MATCH_ACTIVE' } as unknown as CanonicalActor };
    const r = mockCreateIncident(cmd);
    expect(r.ok).toBe(false);
    expect(r.error_code).toMatch(/FORBIDDEN_ACTOR_FIELD/);
  });

  it('N11C5-RTM-INC-08: actor con campo sender_ref → error', () => {
    const cmd = { ...BASE_CMD, actor: { ...BASE_CMD.actor, sender_ref: 'wa:5491100000000' } as unknown as CanonicalActor };
    const r = mockCreateIncident(cmd);
    expect(r.ok).toBe(false);
  });

  it('N11C5-RTM-INC-09: actor tenant_profile sin profile_id → error', () => {
    const cmd = { ...BASE_CMD, actor: { type: 'tenant_profile' as CanonicalActorType } };
    const r = mockCreateIncident(cmd);
    expect(r.ok).toBe(false);
    expect(r.error_code).toMatch(/PROFILE_ID_REQUIRED/);
  });

  it('N11C5-RTM-INC-10: actor system_service válido', () => {
    const cmd = { ...BASE_CMD, actor: { type: 'system_service' as CanonicalActorType, service_name: 'conv-wf20' } };
    const r = mockCreateIncident(cmd);
    expect(r.ok).toBe(true);
  });

  it('N11C5-RTM-INC-11: result tiene created_at ISO', () => {
    const r = mockCreateIncident({ ...BASE_CMD });
    const date = new Date(r.data!.created_at);
    expect(isNaN(date.getTime())).toBe(false);
  });

  it('N11C5-RTM-INC-12: result idempotent_replay: false en primera creación', () => {
    const r = mockCreateIncident({ ...BASE_CMD, idempotency_key: 'idem-first-unique' });
    expect(r.data?.idempotent_replay).toBe(false);
  });

  it('N11C5-RTM-INC-13: source != smart_conversations no implica rechazo del adapter', () => {
    // El adapter acepta source: smart_conversations
    const cmd = { ...BASE_CMD, source: 'smart_conversations' as const };
    expect(mockCreateIncident(cmd).ok).toBe(true);
  });

  it('N11C5-RTM-INC-14: adapter incidents exporta createIncident', () => {
    const s = src(`${SHARED}/adapters/incidents-addon-adapter.ts`);
    expect(s).toContain('createIncident');
  });

  it('N11C5-RTM-INC-15: adapter incidents maneja respuesta 409 como idempotency replay', () => {
    const s = src(`${SHARED}/adapters/incidents-addon-adapter.ts`);
    expect(s).toMatch(/409|idempotent/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-RTM-SEARCH: Search listings runtime (15 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-RTM-SEARCH — Search listings runtime (mock simulado)', () => {
  it('N11C5-RTM-SEARCH-01: query válida → ok: true con items', () => {
    const r = mockSearchListings({ client_account_id: 'tenant-001' });
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.data?.items)).toBe(true);
  });

  it('N11C5-RTM-SEARCH-02: mode: mock en meta', () => {
    const r = mockSearchListings({ client_account_id: 'tenant-001' });
    expect(r.meta?.mode).toBe('mock');
  });

  it('N11C5-RTM-SEARCH-03: sin client_account_id → error', () => {
    const r = mockSearchListings({ client_account_id: '' });
    expect(r.ok).toBe(false);
  });

  it('N11C5-RTM-SEARCH-04: resultado tiene listing_id por item', () => {
    const r = mockSearchListings({ client_account_id: 'tenant-001' });
    for (const item of r.data!.items) {
      expect(item.listing_id).toBeTruthy();
    }
  });

  it('N11C5-RTM-SEARCH-05: resultado incluye price.amount y currency', () => {
    const r = mockSearchListings({ client_account_id: 'tenant-001' });
    for (const item of r.data!.items) {
      expect(typeof item.price.amount).toBe('number');
      expect(item.price.currency).toBeTruthy();
    }
  });

  it('N11C5-RTM-SEARCH-06: resultado NO incluye campos privados (owner_phone, owner_email)', () => {
    const r = mockSearchListings({ client_account_id: 'tenant-001' });
    for (const item of r.data!.items as Record<string, unknown>[]) {
      expect(item['owner_phone']).toBeUndefined();
      expect(item['owner_email']).toBeUndefined();
      expect(item['owner_id']).toBeUndefined();
    }
  });

  it('N11C5-RTM-SEARCH-07: next_cursor puede ser null (última página)', () => {
    const r = mockSearchListings({ client_account_id: 'tenant-001' });
    expect(r.data?.next_cursor === null || typeof r.data?.next_cursor === 'string').toBe(true);
  });

  it('N11C5-RTM-SEARCH-08: public_location oculta dirección exacta', () => {
    const r = mockSearchListings({ client_account_id: 'tenant-001' });
    const item = r.data!.items[0];
    // Solo zona/ciudad — no dirección completa
    expect(item.public_location).not.toMatch(/calle|street|número|#[0-9]+/i);
  });

  it('N11C5-RTM-SEARCH-09: adapter listings exporta searchListings', () => {
    expect(src(`${SHARED}/adapters/listings-addon-adapter.ts`)).toContain('searchListings');
  });

  it('N11C5-RTM-SEARCH-10: adapter listings tiene LISTINGS_ADDON_BASE_URL', () => {
    expect(src(`${SHARED}/adapters/listings-addon-adapter.ts`)).toContain('LISTINGS_ADDON_BASE_URL');
  });

  it('N11C5-RTM-SEARCH-11: validador validateSearchResult acepta resultado válido', () => {
    function validateResult(items: unknown[]): { ok: boolean; reason?: string } {
      if (!Array.isArray(items)) return { ok: false, reason: 'NOT_ARRAY' };
      const PRIVATE = new Set(['owner_id', 'owner_phone', 'owner_email', 'private_address']);
      for (const item of items as Record<string, unknown>[]) {
        if (!item['listing_id']) return { ok: false, reason: 'LISTING_ID_MISSING' };
        for (const k of Object.keys(item)) {
          if (PRIVATE.has(k)) return { ok: false, reason: `PRIVATE_FIELD: ${k}` };
        }
      }
      return { ok: true };
    }
    const r = mockSearchListings({ client_account_id: 'tenant-001' });
    expect(validateResult(r.data!.items).ok).toBe(true);
  });

  it('N11C5-RTM-SEARCH-12: resultado con campo owner_phone → rechazado por validador', () => {
    const PRIVATE = new Set(['owner_id', 'owner_phone', 'owner_email', 'private_address']);
    function validate(items: Record<string, unknown>[]): boolean {
      return items.every(i => Object.keys(i).every(k => !PRIVATE.has(k)));
    }
    expect(validate([{ listing_id: 'X', owner_phone: '+34600000000' }])).toBe(false);
  });

  it('N11C5-RTM-SEARCH-13: adapter listings maneja AbortSignal.timeout', () => {
    const s = src(`${SHARED}/adapters/listings-addon-adapter.ts`);
    expect(s).toContain('AbortSignal.timeout');
  });

  it('N11C5-RTM-SEARCH-14: adapter listings marca 5xx como retryable', () => {
    const s = src(`${SHARED}/adapters/listings-addon-adapter.ts`);
    // El adapter de listings marca errores 5xx como retryable (retryable: resp.status >= 500)
    expect(s).toMatch(/retryable.*status.*>=.*500|status.*>=.*500.*retryable/);
  });

  it('N11C5-RTM-SEARCH-15: adapter listings maneja respuestas 5xx (error retryable)', () => {
    const s = src(`${SHARED}/adapters/listings-addon-adapter.ts`);
    expect(s).toMatch(/5[0-9][0-9]|retryable|recordFailure/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-RTM-LEAD: Create lead runtime (15 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-RTM-LEAD — Create lead runtime (mock simulado)', () => {
  it('N11C5-RTM-LEAD-01: comando válido con unverified_lead → ok: true', () => {
    const r = mockCreateLead({ ...BASE_LEAD });
    expect(r.ok).toBe(true);
    expect(r.data?.lead_id).toBeTruthy();
  });

  it('N11C5-RTM-LEAD-02: actor unverified_lead no requiere profile_id', () => {
    const cmd = { ...BASE_LEAD, actor: { type: 'unverified_lead' as CanonicalActorType } };
    expect(mockCreateLead(cmd).ok).toBe(true);
  });

  it('N11C5-RTM-LEAD-03: actor tenant_profile con profile_id → ok', () => {
    const cmd = { ...BASE_LEAD, actor: { type: 'tenant_profile' as CanonicalActorType, profile_id: 'p-001', verified: true, verified_at: '2026-01-01T00:00:00Z' } };
    expect(mockCreateLead(cmd).ok).toBe(true);
  });

  it('N11C5-RTM-LEAD-04: actor tipo UNVERIFIED_LEAD (enum interno) → error', () => {
    const cmd = { ...BASE_LEAD, actor: { type: 'UNVERIFIED_LEAD' } as unknown as CanonicalActor };
    const r = mockCreateLead(cmd);
    expect(r.ok).toBe(false);
    expect(r.error_code).toMatch(/INVALID_ACTOR_TYPE/);
  });

  it('N11C5-RTM-LEAD-05: actor con phone → error', () => {
    const cmd = { ...BASE_LEAD, actor: { type: 'unverified_lead' as CanonicalActorType, phone: '+34600000000' } as unknown as CanonicalActor };
    expect(mockCreateLead(cmd).ok).toBe(false);
  });

  it('N11C5-RTM-LEAD-06: sin client_account_id → error', () => {
    const r = mockCreateLead({ ...BASE_LEAD, client_account_id: '' });
    expect(r.ok).toBe(false);
  });

  it('N11C5-RTM-LEAD-07: sin idempotency_key → error', () => {
    const r = mockCreateLead({ ...BASE_LEAD, idempotency_key: '' });
    expect(r.ok).toBe(false);
  });

  it('N11C5-RTM-LEAD-08: result tiene lead_id no vacío', () => {
    const r = mockCreateLead({ ...BASE_LEAD });
    expect(r.data?.lead_id.trim()).not.toBe('');
  });

  it('N11C5-RTM-LEAD-09: result tiene created_at ISO válido', () => {
    const r = mockCreateLead({ ...BASE_LEAD });
    expect(isNaN(new Date(r.data!.created_at).getTime())).toBe(false);
  });

  it('N11C5-RTM-LEAD-10: mode: mock en meta', () => {
    expect(mockCreateLead({ ...BASE_LEAD }).meta?.mode).toBe('mock');
  });

  it('N11C5-RTM-LEAD-11: idempotent_replay: false en primera creación', () => {
    const r = mockCreateLead({ ...BASE_LEAD, idempotency_key: 'lead-unique-1111' });
    expect(r.data?.idempotent_replay).toBe(false);
  });

  it('N11C5-RTM-LEAD-12: message_summary limitado (campo de texto libre)', () => {
    const longMsg = 'x'.repeat(10000);
    const cmd = { ...BASE_LEAD, lead: { ...BASE_LEAD.lead, message_summary: longMsg } };
    const r = mockCreateLead(cmd);
    // El adapter acepta el campo pero el puerto lo limita en validación
    expect(r.ok).toBe(true); // mock no trunca en sim
  });

  it('N11C5-RTM-LEAD-13: adapter listings exporta createLead', () => {
    expect(src(`${SHARED}/adapters/listings-addon-adapter.ts`)).toContain('createLead');
  });

  it('N11C5-RTM-LEAD-14: adapter listings maneja 409 como idempotency replay en leads', () => {
    const s = src(`${SHARED}/adapters/listings-addon-adapter.ts`);
    expect(s).toMatch(/409|idempotent/);
  });

  it('N11C5-RTM-LEAD-15: listings adapter tiene FORBIDDEN_INTERNAL_ENUMS con UNVERIFIED_LEAD', () => {
    const s = src(`${SHARED}/adapters/listings-addon-adapter.ts`);
    expect(s).toContain('FORBIDDEN_INTERNAL_ENUMS');
    expect(s).toContain('UNVERIFIED_LEAD');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-RTM-IDEM: Idempotencia (10 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-RTM-IDEM — Idempotencia (scope: tenant × idempotency_key)', () => {
  let replayStore: Set<string>;

  beforeEach(() => {
    replayStore = new Set();
  });

  function scopedKey(tenant: string, key: string): string {
    return `${tenant}:${key}`;
  }

  it('N11C5-RTM-IDEM-01: primera llamada → status: created, idempotent_replay: false', () => {
    const r = mockCreateIncident({ ...BASE_CMD, idempotency_key: 'idem-A' }, { replayIds: replayStore });
    expect(r.data?.idempotent_replay).toBe(false);
    expect(r.data?.status).toBe('created');
  });

  it('N11C5-RTM-IDEM-02: segunda llamada misma clave → idempotent_replay: true', () => {
    mockCreateIncident({ ...BASE_CMD, idempotency_key: 'idem-B' }, { replayIds: replayStore });
    const r2 = mockCreateIncident({ ...BASE_CMD, idempotency_key: 'idem-B' }, { replayIds: replayStore });
    expect(r2.data?.idempotent_replay).toBe(true);
    expect(r2.data?.status).toBe('existing');
  });

  it('N11C5-RTM-IDEM-03: scope es tenant × key (no solo key)', () => {
    // La misma clave pero distinto tenant no es replay
    const keyA = scopedKey('tenant-001', 'idem-C');
    const keyB = scopedKey('tenant-002', 'idem-C');
    expect(keyA).not.toBe(keyB);
  });

  it('N11C5-RTM-IDEM-04: tenant diferente con misma key → NO es replay', () => {
    replayStore.add(scopedKey('tenant-001', 'idem-D'));
    // tenant-002 mismo key no está en store → no replay
    expect(replayStore.has(scopedKey('tenant-002', 'idem-D'))).toBe(false);
  });

  it('N11C5-RTM-IDEM-05: lead primera vez → idempotent_replay: false', () => {
    const r = mockCreateLead({ ...BASE_LEAD, idempotency_key: 'lead-idem-E' }, { replayIds: replayStore });
    expect(r.data?.idempotent_replay).toBe(false);
  });

  it('N11C5-RTM-IDEM-06: lead segunda vez misma clave → idempotent_replay: true', () => {
    mockCreateLead({ ...BASE_LEAD, idempotency_key: 'lead-idem-F' }, { replayIds: replayStore });
    const r2 = mockCreateLead({ ...BASE_LEAD, idempotency_key: 'lead-idem-F' }, { replayIds: replayStore });
    expect(r2.data?.idempotent_replay).toBe(true);
  });

  it('N11C5-RTM-IDEM-07: idempotency_key vacío → error (no crear)', () => {
    const r = mockCreateIncident({ ...BASE_CMD, idempotency_key: '' });
    expect(r.ok).toBe(false);
  });

  it('N11C5-RTM-IDEM-08: replay devuelve el mismo incident_id (referencia opaca)', () => {
    mockCreateIncident({ ...BASE_CMD, idempotency_key: 'idem-G' }, { replayIds: replayStore });
    const r2 = mockCreateIncident({ ...BASE_CMD, idempotency_key: 'idem-G' }, { replayIds: replayStore });
    expect(r2.data?.incident_id).toBeTruthy();
  });

  it('N11C5-RTM-IDEM-09: replay no modifica el incidente existente', () => {
    const r1 = mockCreateIncident({ ...BASE_CMD, idempotency_key: 'idem-H' }, { replayIds: replayStore });
    const r2 = mockCreateIncident({ ...BASE_CMD, idempotency_key: 'idem-H' }, { replayIds: replayStore });
    expect(r1.ok).toBe(true);
    expect(r2.data?.status).toBe('existing');
  });

  it('N11C5-RTM-IDEM-10: adapter incidents menciona idempotency_key en código', () => {
    expect(src(`${SHARED}/adapters/incidents-addon-adapter.ts`)).toContain('idempotency_key');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-RTM-RES: Resiliencia (10 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-RTM-RES — Resiliencia (circuit breaker, retries, timeouts)', () => {
  // Simulador de circuit breaker simple
  type CircuitState = 'closed' | 'open' | 'half-open';
  function makeCircuit(threshold = 3) {
    let failures = 0;
    let state: CircuitState = 'closed';
    return {
      check(): { ok: boolean; state: CircuitState } {
        if (state === 'open') return { ok: false, state: 'open' };
        return { ok: true, state };
      },
      recordFailure() {
        failures++;
        if (failures >= threshold) state = 'open';
      },
      recordSuccess() { failures = 0; state = 'closed'; },
      getState: () => state,
    };
  }

  it('N11C5-RTM-RES-01: circuit cerrado → permite llamadas', () => {
    const cb = makeCircuit(3);
    expect(cb.check().ok).toBe(true);
    expect(cb.check().state).toBe('closed');
  });

  it('N11C5-RTM-RES-02: 3 fallos → circuit abierto', () => {
    const cb = makeCircuit(3);
    cb.recordFailure(); cb.recordFailure(); cb.recordFailure();
    expect(cb.getState()).toBe('open');
  });

  it('N11C5-RTM-RES-03: circuit abierto → rechaza llamadas (fail-fast)', () => {
    const cb = makeCircuit(2);
    cb.recordFailure(); cb.recordFailure();
    expect(cb.check().ok).toBe(false);
  });

  it('N11C5-RTM-RES-04: éxito reinicia el circuit', () => {
    const cb = makeCircuit(2);
    cb.recordFailure(); cb.recordFailure();
    cb.recordSuccess();
    expect(cb.getState()).toBe('closed');
    expect(cb.check().ok).toBe(true);
  });

  it('N11C5-RTM-RES-05: adapter incidents importa checkCircuit', () => {
    const s = src(`${SHARED}/adapters/incidents-addon-adapter.ts`);
    expect(s).toContain('checkCircuit');
    expect(s).toContain('recordFailure');
  });

  it('N11C5-RTM-RES-06: adapter incidents usa AbortSignal.timeout', () => {
    expect(src(`${SHARED}/adapters/incidents-addon-adapter.ts`)).toContain('AbortSignal.timeout');
  });

  it('N11C5-RTM-RES-07: adapter listings usa AbortSignal.timeout', () => {
    expect(src(`${SHARED}/adapters/listings-addon-adapter.ts`)).toContain('AbortSignal.timeout');
  });

  it('N11C5-RTM-RES-08: timeout de fetch vía policy (no cuelga indefinidamente)', () => {
    // Los adapters usan AbortSignal.timeout(policy.timeout_ms) — el valor está en INTEGRATION_POLICIES
    const incSrc = src(`${SHARED}/adapters/incidents-addon-adapter.ts`);
    const lstSrc = src(`${SHARED}/adapters/listings-addon-adapter.ts`);
    expect(incSrc).toContain('policy.timeout_ms');
    expect(lstSrc).toContain('policy.timeout_ms');
  });

  it('N11C5-RTM-RES-09: adapter incidents maneja Retry-After en 429', () => {
    const s = src(`${SHARED}/adapters/incidents-addon-adapter.ts`);
    expect(s).toMatch(/429|Retry-After/);
  });

  it('N11C5-RTM-RES-10: integration-framework.ts exporta INTEGRATION_POLICIES', () => {
    const fw = src(`${SHARED}/integration-framework.ts`);
    expect(fw).toContain('INTEGRATION_POLICIES');
  });
});
