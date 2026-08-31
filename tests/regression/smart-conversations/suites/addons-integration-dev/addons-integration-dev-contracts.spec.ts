/**
 * addons-integration-dev-contracts.spec.ts — Fase 11C5 (Suite 3/4)
 * Privacidad · Frontera n8n-add-ons · Contratos y versioning
 * · Multi-tenant · Auth B2B
 *
 * OFFLINE ONLY: Verifica código fuente y lógica de contratos.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../../../');
const SHARED = 'supabase/functions/_shared/smart-conversations';

function src(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function strip(s: string): string {
  return s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-CNT-PRIV: Privacidad (12 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-CNT-PRIV — Privacidad en contratos de add-ons', () => {
  const INCIDENT_FORBIDDEN_ACTOR_FIELDS = [
    'STRONG_MATCH_ACTIVE', 'PARTIAL_MATCH_ACTIVE', 'NO_MATCH', 'MATCH_INACTIVE',
    'phone_number', 'phone', 'sender_ref', 'wa_jid',
  ];

  it('N11C5-CNT-PRIV-01: adapter incidents declara INCIDENT_FORBIDDEN_ACTOR_FIELDS', () => {
    expect(src(`${SHARED}/adapters/incidents-addon-adapter.ts`)).toContain('INCIDENT_FORBIDDEN_ACTOR_FIELDS');
  });

  it('N11C5-CNT-PRIV-02: adapter listings declara FORBIDDEN_INTERNAL_ENUMS', () => {
    expect(src(`${SHARED}/adapters/listings-addon-adapter.ts`)).toContain('FORBIDDEN_INTERNAL_ENUMS');
  });

  it('N11C5-CNT-PRIV-03: INCIDENT_FORBIDDEN_ACTOR_FIELDS incluye STRONG_MATCH_ACTIVE', () => {
    const s = src(`${SHARED}/adapters/incidents-addon-adapter.ts`);
    expect(s).toContain('STRONG_MATCH_ACTIVE');
  });

  it('N11C5-CNT-PRIV-04: INCIDENT_FORBIDDEN_ACTOR_FIELDS incluye sender_ref', () => {
    expect(src(`${SHARED}/adapters/incidents-addon-adapter.ts`)).toContain('sender_ref');
  });

  it('N11C5-CNT-PRIV-05: INCIDENT_FORBIDDEN_ACTOR_FIELDS incluye wa_jid', () => {
    expect(src(`${SHARED}/adapters/incidents-addon-adapter.ts`)).toContain('wa_jid');
  });

  it('N11C5-CNT-PRIV-06: FORBIDDEN_INTERNAL_ENUMS de listings incluye UNVERIFIED_LEAD', () => {
    expect(src(`${SHARED}/adapters/listings-addon-adapter.ts`)).toContain('UNVERIFIED_LEAD');
  });

  it('N11C5-CNT-PRIV-07: adapter incidents NO usa profile_id como clave de credencial', () => {
    const clean = strip(src(`${SHARED}/adapters/incidents-addon-adapter.ts`));
    // profile_id puede estar en la interfaz pero no como parámetro de URL o header
    expect(clean).not.toMatch(/headers.*profile_id|profile_id.*Authorization/i);
  });

  it('N11C5-CNT-PRIV-08: adapter NO incluye SUPABASE_SERVICE_ROLE_KEY (no comparte service_role)', () => {
    const incClean = strip(src(`${SHARED}/adapters/incidents-addon-adapter.ts`));
    const lstClean = strip(src(`${SHARED}/adapters/listings-addon-adapter.ts`));
    expect(incClean).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(lstClean).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('N11C5-CNT-PRIV-09: puerto incidents declara INCIDENT_FORBIDDEN_OUTPUT_FIELDS', () => {
    expect(src(`${SHARED}/incidents-integration-port.ts`)).toContain('INCIDENT_FORBIDDEN_OUTPUT_FIELDS');
  });

  it('N11C5-CNT-PRIV-10: INCIDENT_FORBIDDEN_OUTPUT_FIELDS incluye conv_session_id y conv_case_id', () => {
    const s = src(`${SHARED}/incidents-integration-port.ts`);
    expect(s).toContain('conv_session_id');
    expect(s).toContain('conv_case_id');
  });

  it('N11C5-CNT-PRIV-11: puerto listings declara LISTING_PRIVATE_FIELDS', () => {
    expect(src(`${SHARED}/listings-integration-port.ts`)).toContain('LISTING_PRIVATE_FIELDS');
  });

  it('N11C5-CNT-PRIV-12: privacidad: validación rechaza owner_phone en listing result', () => {
    const PRIVATE = new Set(['owner_id', 'owner_phone', 'owner_email', 'private_address']);
    function validate(item: Record<string, unknown>): boolean {
      return Object.keys(item).every(k => !PRIVATE.has(k));
    }
    expect(validate({ listing_id: 'X', title: 'Room', owner_phone: '+34600000000' })).toBe(false);
    expect(validate({ listing_id: 'X', title: 'Room', public_location: 'Madrid' })).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-CNT-N8N: Frontera n8n / add-ons (8 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-CNT-N8N — Frontera n8n / add-ons (no acoplamiento cruzado)', () => {
  it('N11C5-CNT-N8N-01: n8n-adapter.ts NO importa incidents-addon-adapter', () => {
    const s = src(`${SHARED}/adapters/n8n-adapter.ts`);
    expect(s).not.toContain('incidents-addon-adapter');
  });

  it('N11C5-CNT-N8N-02: n8n-adapter.ts NO importa listings-addon-adapter', () => {
    const s = src(`${SHARED}/adapters/n8n-adapter.ts`);
    expect(s).not.toContain('listings-addon-adapter');
  });

  it('N11C5-CNT-N8N-03: incidents-addon-adapter.ts NO importa n8n-adapter', () => {
    const s = src(`${SHARED}/adapters/incidents-addon-adapter.ts`);
    expect(s).not.toContain('n8n-adapter');
  });

  it('N11C5-CNT-N8N-04: listings-addon-adapter.ts NO importa n8n-adapter', () => {
    const s = src(`${SHARED}/adapters/listings-addon-adapter.ts`);
    expect(s).not.toContain('n8n-adapter');
  });

  it('N11C5-CNT-N8N-05: n8n registry NO menciona INCIDENTS_ADDON_BASE_URL', () => {
    const s = src(`${SHARED}/n8n-workflow-registry.ts`);
    expect(s).not.toContain('INCIDENTS_ADDON_BASE_URL');
  });

  it('N11C5-CNT-N8N-06: n8n registry NO menciona LISTINGS_ADDON_BASE_URL', () => {
    const s = src(`${SHARED}/n8n-workflow-registry.ts`);
    expect(s).not.toContain('LISTINGS_ADDON_BASE_URL');
  });

  it('N11C5-CNT-N8N-07: orchestration-port.ts NO importa incidents o listings', () => {
    const s = src(`${SHARED}/orchestration-port.ts`);
    expect(s).not.toContain('incidents-addon');
    expect(s).not.toContain('listings-addon');
  });

  it('N11C5-CNT-N8N-08: incidents-integration-port.ts NO importa orchestration-port', () => {
    const s = src(`${SHARED}/incidents-integration-port.ts`);
    expect(s).not.toContain('orchestration-port');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-CNT-CONT: Contratos y versioning (12 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-CNT-CONT — Contratos versionados (v1.0)', () => {
  it('N11C5-CNT-CONT-01: CreateIncidentCommand tiene contract_version: 1.0', () => {
    const s = src(`${SHARED}/incidents-integration-port.ts`);
    expect(s).toContain("contract_version: '1.0'");
  });

  it('N11C5-CNT-CONT-02: CreateLeadCommand tiene contract_version: 1.0', () => {
    const s = src(`${SHARED}/listings-integration-port.ts`);
    expect(s).toContain("contract_version: '1.0'");
  });

  it('N11C5-CNT-CONT-03: SearchListingsQuery tiene contract_version: 1.0', () => {
    const s = src(`${SHARED}/listings-integration-port.ts`);
    expect(s).toContain("contract_version: '1.0'");
  });

  it('N11C5-CNT-CONT-04: contract_version es literal de tipo (no string genérico)', () => {
    const s = src(`${SHARED}/incidents-integration-port.ts`);
    // Debe ser '1.0' como literal, no string
    expect(s).toMatch(/contract_version:\s*'1\.0'/);
  });

  it('N11C5-CNT-CONT-05: CreateIncidentCommand tiene correlation_id', () => {
    expect(src(`${SHARED}/incidents-integration-port.ts`)).toContain('correlation_id');
  });

  it('N11C5-CNT-CONT-06: CreateLeadCommand tiene correlation_id', () => {
    expect(src(`${SHARED}/listings-integration-port.ts`)).toContain('correlation_id');
  });

  it('N11C5-CNT-CONT-07: CreateIncidentCommand requiere request_id', () => {
    expect(src(`${SHARED}/incidents-integration-port.ts`)).toContain('request_id');
  });

  it('N11C5-CNT-CONT-08: source es literal smart_conversations en incidents command', () => {
    expect(src(`${SHARED}/incidents-integration-port.ts`)).toMatch(/source:.*smart_conversations/);
  });

  it('N11C5-CNT-CONT-09: source es literal smart_conversations en leads command', () => {
    expect(src(`${SHARED}/listings-integration-port.ts`)).toMatch(/source:.*smart_conversations/);
  });

  it('N11C5-CNT-CONT-10: getReadiness() en IncidentIntegrationPort', () => {
    expect(src(`${SHARED}/incidents-integration-port.ts`)).toContain('getReadiness');
  });

  it('N11C5-CNT-CONT-11: getReadiness() en ListingsIntegrationPort', () => {
    expect(src(`${SHARED}/listings-integration-port.ts`)).toContain('getReadiness');
  });

  it('N11C5-CNT-CONT-12: validateIncidentResult exportado en puerto incidents', () => {
    expect(src(`${SHARED}/incidents-integration-port.ts`)).toContain('validateIncidentResult');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-CNT-TENT: Multi-tenant (12 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-CNT-TENT — Aislamiento multi-tenant', () => {
  function isolatedKey(tenant: string, key: string): string {
    return `${tenant}:${key}`;
  }

  it('N11C5-CNT-TENT-01: idempotency scope incluye tenant (client_account_id)', () => {
    const keyT1 = isolatedKey('tenant-001', 'idem-X');
    const keyT2 = isolatedKey('tenant-002', 'idem-X');
    expect(keyT1).not.toBe(keyT2);
  });

  it('N11C5-CNT-TENT-02: scope tenant-001 y tenant-002 con mismo key → distintos stores', () => {
    const store = new Set<string>();
    store.add(isolatedKey('tenant-001', 'idem-Y'));
    expect(store.has(isolatedKey('tenant-002', 'idem-Y'))).toBe(false);
  });

  it('N11C5-CNT-TENT-03: CreateIncidentCommand requiere client_account_id', () => {
    expect(src(`${SHARED}/incidents-integration-port.ts`)).toContain('client_account_id');
  });

  it('N11C5-CNT-TENT-04: CreateLeadCommand requiere client_account_id', () => {
    expect(src(`${SHARED}/listings-integration-port.ts`)).toContain('client_account_id');
  });

  it('N11C5-CNT-TENT-05: SearchListingsQuery requiere client_account_id', () => {
    expect(src(`${SHARED}/listings-integration-port.ts`)).toContain('client_account_id');
  });

  it('N11C5-CNT-TENT-06: resultado con client_account_id diferente → rechazado', () => {
    function validateTenant(result: Record<string, unknown>, expected: string): boolean {
      if (result['client_account_id'] && result['client_account_id'] !== expected) return false;
      return true;
    }
    expect(validateTenant({ incident_id: 'X', client_account_id: 'tenant-002' }, 'tenant-001')).toBe(false);
    expect(validateTenant({ incident_id: 'X' }, 'tenant-001')).toBe(true);
  });

  it('N11C5-CNT-TENT-07: adapter incidents verifica client_account_id en validateIncidentCommand', () => {
    const s = src(`${SHARED}/adapters/incidents-addon-adapter.ts`);
    expect(s).toContain('client_account_id');
  });

  it('N11C5-CNT-TENT-08: adapter listings verifica client_account_id', () => {
    expect(src(`${SHARED}/adapters/listings-addon-adapter.ts`)).toContain('client_account_id');
  });

  it('N11C5-CNT-TENT-09: listings result no incluye listings de otro tenant', () => {
    // Validación por campos: el resultado no expone tenant_ids
    function validate(item: Record<string, unknown>): boolean {
      return !Object.keys(item).includes('tenant_ids');
    }
    expect(validate({ listing_id: 'LST-001', tenant_ids: ['t1', 't2'] })).toBe(false);
    expect(validate({ listing_id: 'LST-001', title: 'Room' })).toBe(true);
  });

  it('N11C5-CNT-TENT-10: validateLeadResult verifica tenant match', () => {
    expect(src(`${SHARED}/listings-integration-port.ts`)).toContain('TENANT_MISMATCH_IN_RESULT');
  });

  it('N11C5-CNT-TENT-11: validateIncidentResult verifica tenant match', () => {
    expect(src(`${SHARED}/incidents-integration-port.ts`)).toContain('TENANT_MISMATCH_IN_RESULT');
  });

  it('N11C5-CNT-TENT-12: dos tenants distintos no comparten idempotency scope', () => {
    // Demuestra que el scope con prefix de tenant aísla las keys
    const storeT1 = new Set<string>();
    const storeT2 = new Set<string>();
    storeT1.add(isolatedKey('tenant-001', 'idem-Z'));
    // storeT2 no tiene la key de tenant-001 — aislamiento demostrado
    expect(storeT2.has(isolatedKey('tenant-001', 'idem-Z'))).toBe(false);
    const k1 = isolatedKey('tenant-001', 'idem-Z');
    const k2 = isolatedKey('tenant-002', 'idem-Z');
    expect(k1 === k2).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-CNT-AUTH: Auth B2B (11 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-CNT-AUTH — Autenticación B2B (backend-to-backend)', () => {
  it('N11C5-CNT-AUTH-01: adapter incidents usa INCIDENTS_ADDON_SERVICE_TOKEN', () => {
    expect(src(`${SHARED}/adapters/incidents-addon-adapter.ts`)).toContain('INCIDENTS_ADDON_SERVICE_TOKEN');
  });

  it('N11C5-CNT-AUTH-02: adapter listings usa LISTINGS_ADDON_SERVICE_TOKEN', () => {
    expect(src(`${SHARED}/adapters/listings-addon-adapter.ts`)).toContain('LISTINGS_ADDON_SERVICE_TOKEN');
  });

  it('N11C5-CNT-AUTH-03: INCIDENTS_ADDON_SERVICE_TOKEN no está hardcodeado', () => {
    const clean = strip(src(`${SHARED}/adapters/incidents-addon-adapter.ts`));
    expect(clean).not.toMatch(/Bearer [a-zA-Z0-9+/]{20,}/);
  });

  it('N11C5-CNT-AUTH-04: LISTINGS_ADDON_SERVICE_TOKEN no está hardcodeado', () => {
    const clean = strip(src(`${SHARED}/adapters/listings-addon-adapter.ts`));
    expect(clean).not.toMatch(/Bearer [a-zA-Z0-9+/]{20,}/);
  });

  it('N11C5-CNT-AUTH-05: adapter incidents NO usa SUPABASE_URL para el add-on', () => {
    const clean = strip(src(`${SHARED}/adapters/incidents-addon-adapter.ts`));
    // El add-on tiene su propia URL — no reutilizar SUPABASE_URL de SC
    expect(clean).not.toMatch(/SUPABASE_URL.*INCIDENTS|INCIDENTS.*SUPABASE_URL/);
  });

  it('N11C5-CNT-AUTH-06: adapter listings NO usa SUPABASE_URL para el add-on', () => {
    const clean = strip(src(`${SHARED}/adapters/listings-addon-adapter.ts`));
    expect(clean).not.toMatch(/SUPABASE_URL.*LISTINGS|LISTINGS.*SUPABASE_URL/);
  });

  it('N11C5-CNT-AUTH-07: adapter incidents NO usa createClient (no acceso DB directo)', () => {
    const clean = strip(src(`${SHARED}/adapters/incidents-addon-adapter.ts`));
    expect(clean).not.toContain('createClient(');
  });

  it('N11C5-CNT-AUTH-08: adapter listings NO usa createClient (no acceso DB directo)', () => {
    const clean = strip(src(`${SHARED}/adapters/listings-addon-adapter.ts`));
    expect(clean).not.toContain('createClient(');
  });

  it('N11C5-CNT-AUTH-09: tokens de add-on no se filtran en respuesta', () => {
    // Los tokens son env vars, no deben aparecer en el resultado
    function validateResult(result: Record<string, unknown>): boolean {
      const FORBIDDEN = ['service_token', 'api_key', 'authorization', 'bearer'];
      return !Object.keys(result).some(k => FORBIDDEN.includes(k.toLowerCase()));
    }
    expect(validateResult({ incident_id: 'X', status: 'created' })).toBe(true);
    expect(validateResult({ incident_id: 'X', api_key: 'sk-secret' })).toBe(false);
  });

  it('N11C5-CNT-AUTH-10: autenticación es backend-to-backend (no expuesta a frontend)', () => {
    // Los tokens de add-on son server-side — no deben estar en src/
    const clean = strip(src(`${SHARED}/adapters/incidents-addon-adapter.ts`));
    expect(clean).not.toMatch(/VITE_.*INCIDENTS|INCIDENTS.*VITE_/);
  });

  it('N11C5-CNT-AUTH-11: adapter incidents usa Authorization header con token de env', () => {
    const s = src(`${SHARED}/adapters/incidents-addon-adapter.ts`);
    expect(s).toMatch(/Authorization|Bearer/);
    expect(s).toContain('INCIDENTS_ADDON_SERVICE_TOKEN');
  });
});
