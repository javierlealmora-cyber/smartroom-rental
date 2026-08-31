/**
 * Fase 9C — n8n Contracts Regression
 * Verifica: estructura de stubs, contratos de interfaz, restricciones de privacidad,
 * límites de n8n y ausencia de credenciales/PII en archivos de configuración.
 * Todos los tests son estáticos (readFileSync). No se conecta a n8n real.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------

const N8N_DIR       = resolve(__dirname, '../../../../../docs/smart-conversations/n8n');
const WORKFLOWS_DIR = resolve(N8N_DIR, 'workflows');
const CONTRACTS_DIR = resolve(N8N_DIR, 'contracts');
const README_PATH   = resolve(N8N_DIR, 'README.md');
const ENV_PATH      = resolve(N8N_DIR, 'env.example.md');

// Workflow stubs
const STUB_WF10       = resolve(WORKFLOWS_DIR, 'SC-WF-10-routing.stub.json');
const STUB_WF20       = resolve(WORKFLOWS_DIR, 'SC-WF-20-incidents.stub.json');
const STUB_WF30       = resolve(WORKFLOWS_DIR, 'SC-WF-30-listings.stub.json');
const STUB_WF40       = resolve(WORKFLOWS_DIR, 'SC-WF-40-help.stub.json');
const STUB_IDENTITY   = resolve(WORKFLOWS_DIR, 'SC-WF-IDENTITY.stub.json');
const STUB_C00        = resolve(WORKFLOWS_DIR, 'SC-WF-C00-reconcile.stub.json');

// Contract JSONs
const CONTRACT_WF10      = resolve(CONTRACTS_DIR, 'wf10-routing.contract.json');
const CONTRACT_WF20      = resolve(CONTRACTS_DIR, 'wf20-incidents.contract.json');
const CONTRACT_WF30      = resolve(CONTRACTS_DIR, 'wf30-listings.contract.json');
const CONTRACT_WF40      = resolve(CONTRACTS_DIR, 'wf40-help.contract.json');
const CONTRACT_IDENTITY  = resolve(CONTRACTS_DIR, 'wf-identity.contract.json');
const CONTRACT_C00       = resolve(CONTRACTS_DIR, 'wf-c00-reconcile.contract.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const PII_FIELDS = ['phone', 'email', 'profile_id', 'sender_ref', 'message_text', 'identity_data', 'raw_payload'];
const SECRET_FIELDS = ['service_role_key', 'api_key', 'password', 'token', 'SUPABASE_SERVICE_ROLE_KEY', 'WASENDER_API_KEY', 'ANTHROPIC_API_KEY'];
// URLs de producción reales del cliente — estos NO deben aparecer en ningún stub ni doc
const REAL_URLS_PATTERNS = ['hstgr.cloud', 'n8n.srv'];
// En env.example los placeholders genéricos (supabase.co, api.anthropic.com) son esperados
const REAL_URLS_STUBS_ONLY = ['hstgr.cloud', 'n8n.srv', 'supabase.co', 'api.anthropic.com', 'wasender.app'];

function containsSecret(json: Record<string, unknown>): boolean {
  const str = JSON.stringify(json);
  // Check for exact JSON key match: "field_name": — avoids false positives on substrings
  // e.g. "no_api_keys" contains "api_key" but "api_key": does not match there
  return SECRET_FIELDS.some(f => new RegExp(`"${f}"\\s*:`).test(str));
}

function stubHasPII(json: Record<string, unknown>): boolean {
  const str = JSON.stringify(json);
  return PII_FIELDS.some(f => {
    // Must appear as a value, not inside prohibited_ arrays
    const idx = str.indexOf(`"${f}"`);
    if (idx < 0) return false;
    const context = str.slice(Math.max(0, idx - 100), idx + f.length + 50);
    if (context.includes('prohibited_') || context.includes('allowed_')) return false;
    return true;
  });
}

function hasRealUrl(str: string, patterns = REAL_URLS_PATTERNS): boolean {
  return patterns.some(u => str.includes(u));
}

// ---------------------------------------------------------------------------
// N8N-FILES — existencia de todos los archivos
// ---------------------------------------------------------------------------

describe('N8N-FILES: todos los archivos existen', () => {
  it('N8N-F-01 README existe', () => { expect(existsSync(README_PATH)).toBe(true); });
  it('N8N-F-02 env.example existe', () => { expect(existsSync(ENV_PATH)).toBe(true); });
  it('N8N-F-03 stub SC-WF-10-routing existe', () => { expect(existsSync(STUB_WF10)).toBe(true); });
  it('N8N-F-04 stub SC-WF-20-incidents existe', () => { expect(existsSync(STUB_WF20)).toBe(true); });
  it('N8N-F-05 stub SC-WF-30-listings existe', () => { expect(existsSync(STUB_WF30)).toBe(true); });
  it('N8N-F-06 stub SC-WF-40-help existe', () => { expect(existsSync(STUB_WF40)).toBe(true); });
  it('N8N-F-07 stub SC-WF-IDENTITY existe', () => { expect(existsSync(STUB_IDENTITY)).toBe(true); });
  it('N8N-F-08 stub SC-WF-C00-reconcile existe', () => { expect(existsSync(STUB_C00)).toBe(true); });
  it('N8N-F-09 contract wf10-routing existe', () => { expect(existsSync(CONTRACT_WF10)).toBe(true); });
  it('N8N-F-10 contract wf20-incidents existe', () => { expect(existsSync(CONTRACT_WF20)).toBe(true); });
  it('N8N-F-11 contract wf30-listings existe', () => { expect(existsSync(CONTRACT_WF30)).toBe(true); });
  it('N8N-F-12 contract wf40-help existe', () => { expect(existsSync(CONTRACT_WF40)).toBe(true); });
  it('N8N-F-13 contract wf-identity existe', () => { expect(existsSync(CONTRACT_IDENTITY)).toBe(true); });
  it('N8N-F-14 contract wf-c00-reconcile existe', () => { expect(existsSync(CONTRACT_C00)).toBe(true); });
});

// ---------------------------------------------------------------------------
// N8N-WORKFLOWS — todos los stubs tienen active:false
// ---------------------------------------------------------------------------

describe('N8N-WORKFLOWS: todos los stubs son inactive', () => {
  let wf10: Record<string, unknown>;
  let wf20: Record<string, unknown>;
  let wf30: Record<string, unknown>;
  let wf40: Record<string, unknown>;
  let wfId: Record<string, unknown>;
  let wfC0: Record<string, unknown>;

  beforeAll(() => {
    wf10 = readJson(STUB_WF10);
    wf20 = readJson(STUB_WF20);
    wf30 = readJson(STUB_WF30);
    wf40 = readJson(STUB_WF40);
    wfId = readJson(STUB_IDENTITY);
    wfC0 = readJson(STUB_C00);
  });

  it('N8N-W-01 SC-WF-10 active=false', () => { expect(wf10.active).toBe(false); });
  it('N8N-W-02 SC-WF-20 active=false', () => { expect(wf20.active).toBe(false); });
  it('N8N-W-03 SC-WF-30 active=false', () => { expect(wf30.active).toBe(false); });
  it('N8N-W-04 SC-WF-40 active=false', () => { expect(wf40.active).toBe(false); });
  it('N8N-W-05 SC-WF-IDENTITY active=false', () => { expect(wfId.active).toBe(false); });
  it('N8N-W-06 SC-WF-C00 active=false', () => { expect(wfC0.active).toBe(false); });

  it('N8N-W-07 SC-WF-10 _stub_security.active=false', () => {
    expect((wf10._stub_security as Record<string,unknown>).active).toBe(false);
  });
  it('N8N-W-08 SC-WF-20 _stub_security.active=false', () => {
    expect((wf20._stub_security as Record<string,unknown>).active).toBe(false);
  });
  it('N8N-W-09 SC-WF-30 _stub_security.active=false', () => {
    expect((wf30._stub_security as Record<string,unknown>).active).toBe(false);
  });
  it('N8N-W-10 SC-WF-40 _stub_security.active=false', () => {
    expect((wf40._stub_security as Record<string,unknown>).active).toBe(false);
  });
  it('N8N-W-11 SC-WF-IDENTITY _stub_security.active=false', () => {
    expect((wfId._stub_security as Record<string,unknown>).active).toBe(false);
  });
  it('N8N-W-12 SC-WF-C00 _stub_security.active=false', () => {
    expect((wfC0._stub_security as Record<string,unknown>).active).toBe(false);
  });

  it('N8N-W-13 SC-WF-10 tiene meta.status=stub-only', () => {
    expect((wf10.meta as Record<string,unknown>).status).toBe('stub-only');
  });
  it('N8N-W-14 SC-WF-20 tiene meta.status=stub-only', () => {
    expect((wf20.meta as Record<string,unknown>).status).toBe('stub-only');
  });
  it('N8N-W-15 SC-WF-30 tiene meta.status=stub-only', () => {
    expect((wf30.meta as Record<string,unknown>).status).toBe('stub-only');
  });
  it('N8N-W-16 SC-WF-40 tiene meta.status=stub-only', () => {
    expect((wf40.meta as Record<string,unknown>).status).toBe('stub-only');
  });
  it('N8N-W-17 SC-WF-IDENTITY tiene meta.status=stub-only', () => {
    expect((wfId.meta as Record<string,unknown>).status).toBe('stub-only');
  });
  it('N8N-W-18 SC-WF-C00 tiene meta.status=stub-only', () => {
    expect((wfC0.meta as Record<string,unknown>).status).toBe('stub-only');
  });

  it('N8N-W-19 SC-WF-40 nota excluye conv_help_escalated', () => {
    const notes = JSON.stringify((wf40.meta as Record<string,unknown>).notes ?? '');
    expect(notes.toLowerCase()).toContain('conv_help_escalated');
  });

  it('N8N-W-20 SC-WF-IDENTITY nota excluye WEAK_MATCH', () => {
    const notes = JSON.stringify((wfId.meta as Record<string,unknown>).notes ?? '');
    expect(notes).toContain('WEAK_MATCH');
  });

  it('N8N-W-21 SC-WF-C00 es manualTrigger (no cron)', () => {
    const nodes = wfC0.nodes as Array<Record<string,unknown>>;
    expect(nodes.some(n => (n.type as string).includes('manualTrigger'))).toBe(true);
  });

  it('N8N-W-22 SC-WF-C00 _stub_security.no_cron=true', () => {
    expect((wfC0._stub_security as Record<string,unknown>).no_cron).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// N8N-CONTRACTS — estructura y campos de los contratos
// ---------------------------------------------------------------------------

describe('N8N-CONTRACTS: estructura de contratos', () => {
  let c10: Record<string, unknown>;
  let c20: Record<string, unknown>;
  let c30: Record<string, unknown>;
  let c40: Record<string, unknown>;
  let cId: Record<string, unknown>;
  let cC0: Record<string, unknown>;

  beforeAll(() => {
    c10 = readJson(CONTRACT_WF10);
    c20 = readJson(CONTRACT_WF20);
    c30 = readJson(CONTRACT_WF30);
    c40 = readJson(CONTRACT_WF40);
    cId = readJson(CONTRACT_IDENTITY);
    cC0 = readJson(CONTRACT_C00);
  });

  const requiredFields = ['contract_id', 'workflow', 'version', 'allowed_input_fields',
    'prohibited_input_fields', 'allowed_output_fields', 'prohibited_output_fields', 'boundaries'];

  for (const field of requiredFields) {
    it(`N8N-C-01x SC-WF-10 tiene campo '${field}'`, () => { expect(c10[field]).toBeDefined(); });
  }

  it('N8N-C-02 SC-WF-20 tiene los 8 campos requeridos', () => {
    for (const f of requiredFields) expect(c20[f]).toBeDefined();
  });
  it('N8N-C-03 SC-WF-30 tiene los 8 campos requeridos', () => {
    for (const f of requiredFields) expect(c30[f]).toBeDefined();
  });
  it('N8N-C-04 SC-WF-40 tiene los 8 campos requeridos', () => {
    for (const f of requiredFields) expect(c40[f]).toBeDefined();
  });
  it('N8N-C-05 SC-WF-IDENTITY tiene los 8 campos requeridos', () => {
    for (const f of requiredFields) expect(cId[f]).toBeDefined();
  });
  it('N8N-C-06 SC-WF-C00 tiene los 8 campos requeridos', () => {
    for (const f of requiredFields) expect(cC0[f]).toBeDefined();
  });

  it('N8N-C-07 WF-10 routing_map define 3 servicios', () => {
    const map = c10.routing_map as Record<string,string>;
    expect(map['conv_incidencias']).toBe('conv-wf20-incidents');
    expect(map['conv_publicaciones']).toBe('conv-wf30-listings');
    expect(map['conv_ayuda']).toBe('conv-wf40-help');
  });

  it('N8N-C-08 WF-20 valid_response_types incluye identity_required', () => {
    const types = c20.valid_response_types as string[];
    expect(types).toContain('identity_required');
  });

  it('N8N-C-09 WF-30 valid_interest_types incluye los 3 intereses', () => {
    const types = c30.valid_interest_types as string[];
    expect(types).toContain('search_listing');
    expect(types).toContain('leave_contact');
    expect(types).toContain('request_visit');
  });

  it('N8N-C-10 WF-40 kb_threshold es 0.80', () => {
    expect(c40.kb_threshold).toBe(0.80);
  });

  it('N8N-C-11 WF-40 notes incluye ayuda sobre help_answer_no_case', () => {
    const notes = c40.notes as Record<string,string>;
    expect(notes.help_answer_no_case).toBeDefined();
    expect(notes.help_answer_no_case).toContain('conv_case');
  });

  it('N8N-C-12 WF-IDENTITY prohibited_identity_levels incluye WEAK_MATCH', () => {
    const prohibited = cId.prohibited_identity_levels as string[];
    expect(prohibited).toContain('WEAK_MATCH');
  });

  it('N8N-C-13 WF-IDENTITY boundaries menciona conv-core-validate-identity', () => {
    const str = JSON.stringify(cId.boundaries);
    expect(str).toContain('conv-core-validate-identity');
  });

  it('N8N-C-14 WF-C00 notes incluye activation_gate', () => {
    const notes = cC0.notes as Record<string,string>;
    expect(notes.activation_gate).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// N8N-PRIVACY — stubs no contienen PII ni credenciales reales
// ---------------------------------------------------------------------------

describe('N8N-PRIVACY: stubs sin PII ni credenciales', () => {
  let wf10: Record<string, unknown>;
  let wf20: Record<string, unknown>;
  let wf30: Record<string, unknown>;
  let wf40: Record<string, unknown>;
  let wfId: Record<string, unknown>;
  let wfC0: Record<string, unknown>;

  beforeAll(() => {
    wf10 = readJson(STUB_WF10);
    wf20 = readJson(STUB_WF20);
    wf30 = readJson(STUB_WF30);
    wf40 = readJson(STUB_WF40);
    wfId = readJson(STUB_IDENTITY);
    wfC0 = readJson(STUB_C00);
  });

  it('N8N-P-01 SC-WF-10 no contiene service_role_key como valor', () => {
    expect(containsSecret(wf10)).toBe(false);
  });
  it('N8N-P-02 SC-WF-20 no contiene service_role_key como valor', () => {
    expect(containsSecret(wf20)).toBe(false);
  });
  it('N8N-P-03 SC-WF-30 no contiene service_role_key como valor', () => {
    expect(containsSecret(wf30)).toBe(false);
  });
  it('N8N-P-04 SC-WF-40 no contiene service_role_key como valor', () => {
    expect(containsSecret(wf40)).toBe(false);
  });
  it('N8N-P-05 SC-WF-IDENTITY no contiene service_role_key como valor', () => {
    expect(containsSecret(wfId)).toBe(false);
  });
  it('N8N-P-06 SC-WF-C00 no contiene service_role_key como valor', () => {
    expect(containsSecret(wfC0)).toBe(false);
  });

  it('N8N-P-07 SC-WF-10 _stub_security.no_credentials=true', () => {
    expect((wf10._stub_security as Record<string,unknown>).no_credentials).toBe(true);
  });
  it('N8N-P-08 SC-WF-20 _stub_security.no_credentials=true', () => {
    expect((wf20._stub_security as Record<string,unknown>).no_credentials).toBe(true);
  });
  it('N8N-P-09 SC-WF-30 _stub_security.no_credentials=true', () => {
    expect((wf30._stub_security as Record<string,unknown>).no_credentials).toBe(true);
  });
  it('N8N-P-10 SC-WF-40 _stub_security.no_credentials=true', () => {
    expect((wf40._stub_security as Record<string,unknown>).no_credentials).toBe(true);
  });
  it('N8N-P-11 SC-WF-IDENTITY _stub_security.no_credentials=true', () => {
    expect((wfId._stub_security as Record<string,unknown>).no_credentials).toBe(true);
  });
  it('N8N-P-12 SC-WF-C00 _stub_security.no_credentials=true', () => {
    expect((wfC0._stub_security as Record<string,unknown>).no_credentials).toBe(true);
  });

  it('N8N-P-13 env.example no contiene URLs de producción reales', () => {
    const env = readFileSync(ENV_PATH, 'utf8');
    expect(hasRealUrl(env)).toBe(false);
  });

  it('N8N-P-14 SC-WF-10 no contiene URLs de producción reales', () => {
    expect(hasRealUrl(JSON.stringify(wf10), REAL_URLS_STUBS_ONLY)).toBe(false);
  });
  it('N8N-P-15 SC-WF-IDENTITY no contiene URLs de producción reales', () => {
    expect(hasRealUrl(JSON.stringify(wfId), REAL_URLS_STUBS_ONLY)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// N8N-BOUNDARIES — contratos prohíben las operaciones que n8n no debe hacer
// ---------------------------------------------------------------------------

describe('N8N-BOUNDARIES: restricciones en contratos', () => {
  let c20: Record<string, unknown>;
  let c30: Record<string, unknown>;
  let c40: Record<string, unknown>;
  let cId: Record<string, unknown>;
  let cC0: Record<string, unknown>;

  beforeAll(() => {
    c20 = readJson(CONTRACT_WF20);
    c30 = readJson(CONTRACT_WF30);
    c40 = readJson(CONTRACT_WF40);
    cId = readJson(CONTRACT_IDENTITY);
    cC0 = readJson(CONTRACT_C00);
  });

  it('N8N-B-01 WF-20 boundaries.n8n_cannot_do menciona conv_cases', () => {
    const str = JSON.stringify((c20.boundaries as Record<string,unknown>).n8n_cannot_do);
    expect(str).toContain('conv_cases');
  });

  it('N8N-B-02 WF-20 boundaries menciona profile_id prohibido', () => {
    const str = JSON.stringify(c20.boundaries);
    expect(str).toContain('profile_id');
  });

  it('N8N-B-03 WF-30 boundaries menciona Core prohibido', () => {
    const str = JSON.stringify((c30.boundaries as Record<string,unknown>).n8n_cannot_do);
    expect(str).toContain('Core');
  });

  it('N8N-B-04 WF-30 notes.conv_lead_created aclara que NO existe', () => {
    const notes = c30.notes as Record<string,string>;
    expect(notes.conv_lead_created).toBeDefined();
    expect(notes.conv_lead_created.toUpperCase()).toContain('NO');
  });

  it('N8N-B-05 WF-40 boundaries.n8n_cannot_do menciona conv_help_escalated', () => {
    const str = JSON.stringify((c40.boundaries as Record<string,unknown>).n8n_cannot_do);
    expect(str).toContain('conv_help_escalated');
  });

  it('N8N-B-06 WF-40 notes.escalation_event menciona conv_case_escalated', () => {
    const notes = c40.notes as Record<string,string>;
    expect(notes.escalation_event).toContain('conv_case_escalated');
  });

  it('N8N-B-07 WF-40 notes.escalation_event dice que conv_help_escalated NO existe', () => {
    const notes = c40.notes as Record<string,string>;
    expect(notes.escalation_event.toUpperCase()).toContain('NO');
    expect(notes.escalation_event).toContain('conv_help_escalated');
  });

  it('N8N-B-08 WF-IDENTITY boundaries menciona WEAK_MATCH prohibido', () => {
    const str = JSON.stringify(cId.boundaries);
    expect(str).toContain('WEAK_MATCH');
  });

  it('N8N-B-09 WF-IDENTITY boundaries menciona que la decisión es del EF', () => {
    const str = JSON.stringify((cId.boundaries as Record<string,unknown>).n8n_cannot_do);
    expect(str).toContain('identidad final');
  });

  it('N8N-B-10 WF-C00 boundaries menciona que no hay reconciliación sin activación', () => {
    const str = JSON.stringify((cC0.boundaries as Record<string,unknown>).n8n_cannot_do);
    expect(str).toContain('activación');
  });

  it('N8N-B-11 WF-C00 notes.no_cron aclara que no hay cron en stub', () => {
    const notes = cC0.notes as Record<string,string>;
    expect(notes.no_cron).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// N8N-RESTRICTIONS — PII prohibido en contratos
// ---------------------------------------------------------------------------

describe('N8N-RESTRICTIONS: PII prohibido en contratos', () => {
  const contracts = [
    { label: 'WF-10', path: CONTRACT_WF10 },
    { label: 'WF-20', path: CONTRACT_WF20 },
    { label: 'WF-30', path: CONTRACT_WF30 },
    { label: 'WF-40', path: CONTRACT_WF40 },
    { label: 'WF-ID', path: CONTRACT_IDENTITY },
    { label: 'WF-C0', path: CONTRACT_C00 },
  ];

  for (const { label, path } of contracts) {
    it(`N8N-R-${label} prohibited_input_fields contiene phone`, () => {
      const c = readJson(path);
      expect(c.prohibited_input_fields as string[]).toContain('phone');
    });
    it(`N8N-R-${label} prohibited_input_fields contiene profile_id`, () => {
      const c = readJson(path);
      expect(c.prohibited_input_fields as string[]).toContain('profile_id');
    });
    it(`N8N-R-${label} prohibited_input_fields contiene message_text`, () => {
      const c = readJson(path);
      expect(c.prohibited_input_fields as string[]).toContain('message_text');
    });
    it(`N8N-R-${label} prohibited_output_fields contiene service_role_key`, () => {
      const c = readJson(path);
      expect(c.prohibited_output_fields as string[]).toContain('service_role_key');
    });
  }
});

// ---------------------------------------------------------------------------
// N8N-REGRESSION — checks cruzados de invariantes
// ---------------------------------------------------------------------------

describe('N8N-REGRESSION: invariantes cruzadas', () => {
  it('N8N-REG-01 README menciona los 6 workflows', () => {
    const readme = readFileSync(README_PATH, 'utf8');
    expect(readme).toContain('SC-WF-10');
    expect(readme).toContain('SC-WF-20');
    expect(readme).toContain('SC-WF-30');
    expect(readme).toContain('SC-WF-40');
    expect(readme).toContain('SC-WF-IDENTITY');
    expect(readme).toContain('SC-WF-C00');
  });

  it('N8N-REG-02 README menciona que todos son inactive/stub', () => {
    const readme = readFileSync(README_PATH, 'utf8').toLowerCase();
    expect(readme).toMatch(/inactiv|stub/);
  });

  it('N8N-REG-03 README no contiene URLs de producción reales', () => {
    expect(hasRealUrl(readFileSync(README_PATH, 'utf8'))).toBe(false);
  });

  it('N8N-REG-04 WF-40 stub_note en nodo valida menciona NO conv_help_escalated', () => {
    const wf40 = readJson(STUB_WF40);
    const str = JSON.stringify(wf40.nodes);
    expect(str).toContain('conv_help_escalated');
    // Y que dice NO
    const idx = str.indexOf('conv_help_escalated');
    const snippet = str.slice(Math.max(0, idx - 10), idx + 40);
    expect(snippet.toUpperCase()).toContain('NO');
  });

  it('N8N-REG-05 WF-IDENTITY stub_note menciona NO WEAK_MATCH', () => {
    const wfId = readJson(STUB_IDENTITY);
    const str = JSON.stringify(wfId.nodes);
    expect(str).toContain('WEAK_MATCH');
  });

  it('N8N-REG-06 WF-IDENTITY stub_note menciona NO phone', () => {
    const wfId = readJson(STUB_IDENTITY);
    const str = JSON.stringify(wfId.nodes);
    expect(str.toLowerCase()).toContain('phone');
  });

  it('N8N-REG-07 todos los stubs tienen nodes array', () => {
    for (const p of [STUB_WF10, STUB_WF20, STUB_WF30, STUB_WF40, STUB_IDENTITY, STUB_C00]) {
      const w = readJson(p);
      expect(Array.isArray(w.nodes)).toBe(true);
      expect((w.nodes as unknown[]).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('N8N-REG-08 todos los stubs tienen connections object', () => {
    for (const p of [STUB_WF10, STUB_WF20, STUB_WF30, STUB_WF40, STUB_IDENTITY, STUB_C00]) {
      const w = readJson(p);
      expect(typeof w.connections).toBe('object');
    }
  });

  it('N8N-REG-09 contratos WF-40 escalation_reasons incluye no_kb_match y admin_requested', () => {
    const c40 = readJson(CONTRACT_WF40);
    const reasons = (c40.notes as Record<string,unknown>).escalation_reasons as string[];
    expect(reasons).toContain('no_kb_match');
    expect(reasons).toContain('admin_requested');
  });

  it('N8N-REG-10 contrato WF-IDENTITY notes.NO_PII_IN_FLOW está definido', () => {
    const cId = readJson(CONTRACT_IDENTITY);
    const notes = cId.notes as Record<string,string>;
    expect(notes.NO_PII_IN_FLOW).toBeDefined();
  });
});
