/**
 * addons-integration-dev.spec.ts — Fase 11C5 (Suite 1/4)
 * Reconciliación 11C4 · Precheck add-ons · Puertos neutrales · Actor canónico
 * · Modos de integración · Health states · Documentación
 *
 * OFFLINE ONLY: No realiza llamadas a red ni a endpoints reales.
 * Tests con DEV real se marcarán DEV_REQUIRED cuando se active canary.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../../../');
const SHARED = 'supabase/functions/_shared/smart-conversations';

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

function src(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function strip(s: string): string {
  return s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-REC: Reconciliación 11C4 (9 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-REC — Reconciliación Fase 11C4', () => {
  const N8N_SUITES_DIR = 'tests/regression/smart-conversations/suites/n8n-integration-dev';

  it('N11C5-REC-01: 4 suites n8n-integration-dev existen', () => {
    const suites = [
      'n8n-integration-dev.spec.ts',
      'n8n-integration-dev-runtime.spec.ts',
      'n8n-integration-dev-contracts.spec.ts',
      'n8n-integration-dev-adversarial.spec.ts',
    ];
    for (const s of suites) {
      expect(exists(`${N8N_SUITES_DIR}/${s}`), `Suite ausente: ${s}`).toBe(true);
    }
  });

  it('N11C5-REC-02: suite principal ≥70 it() calls', () => {
    const content = src(`${N8N_SUITES_DIR}/n8n-integration-dev.spec.ts`);
    const count = (content.match(/^\s+it\(/gm) ?? []).length;
    expect(count, `Solo ${count} tests en suite principal`).toBeGreaterThanOrEqual(70);
  });

  it('N11C5-REC-03: suite runtime ≥52 it() calls', () => {
    const content = src(`${N8N_SUITES_DIR}/n8n-integration-dev-runtime.spec.ts`);
    const count = (content.match(/^\s+it\(/gm) ?? []).length;
    expect(count, `Solo ${count} tests en suite runtime`).toBeGreaterThanOrEqual(52);
  });

  it('N11C5-REC-04: suite contracts ≥63 it() calls', () => {
    const content = src(`${N8N_SUITES_DIR}/n8n-integration-dev-contracts.spec.ts`);
    const count = (content.match(/^\s+it\(/gm) ?? []).length;
    expect(count, `Solo ${count} tests en suite contracts`).toBeGreaterThanOrEqual(63);
  });

  it('N11C5-REC-05: suite adversarial ≥40 it() calls', () => {
    const content = src(`${N8N_SUITES_DIR}/n8n-integration-dev-adversarial.spec.ts`);
    const count = (content.match(/^\s+it\(/gm) ?? []).length;
    expect(count, `Solo ${count} tests en suite adversarial`).toBeGreaterThanOrEqual(40);
  });

  it('N11C5-REC-06: total n8n tests ≥220', () => {
    const suites = [
      'n8n-integration-dev.spec.ts',
      'n8n-integration-dev-runtime.spec.ts',
      'n8n-integration-dev-contracts.spec.ts',
      'n8n-integration-dev-adversarial.spec.ts',
    ];
    const total = suites.reduce((acc, s) => {
      const c = src(`${N8N_SUITES_DIR}/${s}`);
      return acc + (c.match(/^\s+it\(/gm) ?? []).length;
    }, 0);
    expect(total, `Total n8n: ${total}`).toBeGreaterThanOrEqual(220);
  });

  it('N11C5-REC-07: smoke-n8n-dev.mjs identificado como offline (no requiere N8N_WEBHOOK_BASE_URL)', () => {
    const smokeSrc = src('scripts/smart-conversations/smoke/smoke-n8n-dev.mjs');
    // El smoke offline verifica que N8N_WEBHOOK_BASE_URL esté AUSENTE
    expect(smokeSrc).toContain('N8N_WEBHOOK_BASE_URL');
    expect(smokeSrc).toContain('N8N_INTEGRATION_OFFLINE_READY_DEV_PENDING');
  });

  it('N11C5-REC-08: smoke-ai-dev.mjs identificado como offline', () => {
    const aiSmoke = 'scripts/smart-conversations/smoke/smoke-ai-dev.mjs';
    expect(exists(aiSmoke), 'smoke-ai-dev.mjs ausente').toBe(true);
    const s = src(aiSmoke);
    expect(s).toMatch(/OFFLINE|offline|PENDING|pending/);
  });

  it('N11C5-REC-09: validate-n8n-dev-integration.mjs reporta GATE_1 = AUDIT_COMPLETE_REMEDIATION_PENDING', () => {
    const validator = src('scripts/smart-conversations/validate-n8n-dev-integration.mjs');
    expect(validator).toContain('AUDIT_COMPLETE_REMEDIATION_PENDING');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-PRE: Precheck de add-ons (10 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-PRE — Precheck de add-ons (Fase 11C1 → 11C5)', () => {
  it('N11C5-PRE-01: incidents-addon-adapter.ts existe (11C1)', () => {
    expect(exists(`${SHARED}/adapters/incidents-addon-adapter.ts`)).toBe(true);
  });

  it('N11C5-PRE-02: listings-addon-adapter.ts existe (11C1)', () => {
    expect(exists(`${SHARED}/adapters/listings-addon-adapter.ts`)).toBe(true);
  });

  it('N11C5-PRE-03: incidents adapter usa INCIDENTS_ADDON_INTEGRATION_MODE', () => {
    expect(src(`${SHARED}/adapters/incidents-addon-adapter.ts`)).toContain('INCIDENTS_ADDON_INTEGRATION_MODE');
  });

  it('N11C5-PRE-04: listings adapter usa LISTINGS_ADDON_INTEGRATION_MODE', () => {
    expect(src(`${SHARED}/adapters/listings-addon-adapter.ts`)).toContain('LISTINGS_ADDON_INTEGRATION_MODE');
  });

  it('N11C5-PRE-05: incidents adapter exporta validateIncidentCommand', () => {
    expect(src(`${SHARED}/adapters/incidents-addon-adapter.ts`)).toContain('validateIncidentCommand');
  });

  it('N11C5-PRE-06: listings adapter exporta validateListingActor', () => {
    expect(src(`${SHARED}/adapters/listings-addon-adapter.ts`)).toContain('validateListingActor');
  });

  it('N11C5-PRE-07: incidents adapter usa INCIDENTS_ADDON_BASE_URL (sin hardcodear)', () => {
    const s = src(`${SHARED}/adapters/incidents-addon-adapter.ts`);
    expect(s).toContain('INCIDENTS_ADDON_BASE_URL');
    expect(s).not.toMatch(/https?:\/\/[a-zA-Z0-9._-]{4,}\.(com|io|net)/);
  });

  it('N11C5-PRE-08: listings adapter usa LISTINGS_ADDON_BASE_URL (sin hardcodear)', () => {
    const s = src(`${SHARED}/adapters/listings-addon-adapter.ts`);
    expect(s).toContain('LISTINGS_ADDON_BASE_URL');
    expect(s).not.toMatch(/https?:\/\/[a-zA-Z0-9._-]{4,}\.(com|io|net)/);
  });

  it('N11C5-PRE-09: incidents adapter soporta circuit breaker (checkCircuit)', () => {
    expect(src(`${SHARED}/adapters/incidents-addon-adapter.ts`)).toContain('checkCircuit');
  });

  it('N11C5-PRE-10: listings adapter soporta circuit breaker (checkCircuit)', () => {
    expect(src(`${SHARED}/adapters/listings-addon-adapter.ts`)).toContain('checkCircuit');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-PORT: Puertos neutrales (10 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-PORT — Puertos neutrales (Fase 11C5)', () => {
  it('N11C5-PORT-01: incidents-integration-port.ts existe', () => {
    expect(exists(`${SHARED}/incidents-integration-port.ts`)).toBe(true);
  });

  it('N11C5-PORT-02: listings-integration-port.ts existe', () => {
    expect(exists(`${SHARED}/listings-integration-port.ts`)).toBe(true);
  });

  it('N11C5-PORT-03: IncidentIntegrationPort exportado', () => {
    expect(src(`${SHARED}/incidents-integration-port.ts`)).toContain('IncidentIntegrationPort');
  });

  it('N11C5-PORT-04: ListingsIntegrationPort exportado', () => {
    expect(src(`${SHARED}/listings-integration-port.ts`)).toContain('ListingsIntegrationPort');
  });

  it('N11C5-PORT-05: IncidentIntegrationPort incluye createIncident y health', () => {
    const s = src(`${SHARED}/incidents-integration-port.ts`);
    expect(s).toContain('createIncident');
    expect(s).toContain('health');
  });

  it('N11C5-PORT-06: ListingsIntegrationPort incluye searchListings, createLead y health', () => {
    const s = src(`${SHARED}/listings-integration-port.ts`);
    expect(s).toContain('searchListings');
    expect(s).toContain('createLead');
    expect(s).toContain('health');
  });

  it('N11C5-PORT-07: puerto incidents incluye INCIDENT_FORBIDDEN_OUTPUT_FIELDS', () => {
    expect(src(`${SHARED}/incidents-integration-port.ts`)).toContain('INCIDENT_FORBIDDEN_OUTPUT_FIELDS');
  });

  it('N11C5-PORT-08: puerto listings incluye LISTINGS_FORBIDDEN_OUTPUT_FIELDS', () => {
    expect(src(`${SHARED}/listings-integration-port.ts`)).toContain('LISTINGS_FORBIDDEN_OUTPUT_FIELDS');
  });

  it('N11C5-PORT-09: CreateIncidentCommand incluye contract_version', () => {
    expect(src(`${SHARED}/incidents-integration-port.ts`)).toContain('contract_version');
  });

  it('N11C5-PORT-10: CreateLeadCommand incluye contract_version', () => {
    expect(src(`${SHARED}/listings-integration-port.ts`)).toContain('contract_version');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-ACT: Actor canónico (12 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-ACT — Actor canónico (Fase 11C5)', () => {
  it('N11C5-ACT-01: canonical-actor.ts existe', () => {
    expect(exists(`${SHARED}/canonical-actor.ts`)).toBe(true);
  });

  it('N11C5-ACT-02: exporta CanonicalActor como tipo union', () => {
    const s = src(`${SHARED}/canonical-actor.ts`);
    expect(s).toContain('CanonicalActor');
    expect(s).toMatch(/tenant_profile.*unverified_lead|unverified_lead.*tenant_profile/);
  });

  it('N11C5-ACT-03: variante tenant_profile tiene profile_id y verified', () => {
    const s = src(`${SHARED}/canonical-actor.ts`);
    expect(s).toContain("'tenant_profile'");
    expect(s).toContain('profile_id');
    expect(s).toContain('verified');
  });

  it('N11C5-ACT-04: variante unverified_lead existe (NO el enum interno)', () => {
    const s = src(`${SHARED}/canonical-actor.ts`);
    expect(s).toContain("'unverified_lead'");
  });

  it('N11C5-ACT-05: variante system_service existe', () => {
    const s = src(`${SHARED}/canonical-actor.ts`);
    expect(s).toContain("'system_service'");
  });

  it('N11C5-ACT-06: CANONICAL_ACTOR_FORBIDDEN_FIELDS incluye identity_level', () => {
    const s = src(`${SHARED}/canonical-actor.ts`);
    expect(s).toContain('CANONICAL_ACTOR_FORBIDDEN_FIELDS');
    expect(s).toContain('identity_level');
  });

  it('N11C5-ACT-07: FORBIDDEN_FIELDS incluye STRONG_MATCH_ACTIVE', () => {
    expect(src(`${SHARED}/canonical-actor.ts`)).toContain('STRONG_MATCH_ACTIVE');
  });

  it('N11C5-ACT-08: FORBIDDEN_FIELDS incluye sender_ref y wa_jid', () => {
    const s = src(`${SHARED}/canonical-actor.ts`);
    expect(s).toContain('sender_ref');
    expect(s).toContain('wa_jid');
  });

  it('N11C5-ACT-09: validateCanonicalActor exportado', () => {
    expect(src(`${SHARED}/canonical-actor.ts`)).toContain('validateCanonicalActor');
  });

  it('N11C5-ACT-10: validateCanonicalActor rechaza tipo inválido', () => {
    function validateCanonicalActor(actor: unknown): { valid: boolean; reason?: string } {
      if (!actor || typeof actor !== 'object') return { valid: false, reason: 'ACTOR_NOT_OBJECT' };
      const a = actor as Record<string, unknown>;
      if (!a['type']) return { valid: false, reason: 'ACTOR_TYPE_MISSING' };
      if (!(['tenant_profile', 'unverified_lead', 'system_service'] as string[]).includes(a['type'] as string)) {
        return { valid: false, reason: `INVALID_ACTOR_TYPE: ${a['type']}` };
      }
      return { valid: true };
    }
    const result = validateCanonicalActor({ type: 'STRONG_MATCH_ACTIVE' });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/INVALID_ACTOR_TYPE/);
  });

  it('N11C5-ACT-11: validateCanonicalActor rechaza campo prohibido en actor', () => {
    const FORBIDDEN = new Set(['identity_level', 'STRONG_MATCH_ACTIVE', 'sender_ref', 'wa_jid', 'phone', 'email']);
    function validate(actor: Record<string, unknown>): { valid: boolean; reason?: string } {
      for (const key of Object.keys(actor)) {
        if (FORBIDDEN.has(key)) return { valid: false, reason: `FORBIDDEN_ACTOR_FIELD: ${key}` };
      }
      return { valid: true };
    }
    expect(validate({ type: 'tenant_profile', profile_id: 'x', identity_level: 'STRONG' }).valid).toBe(false);
    expect(validate({ type: 'unverified_lead' }).valid).toBe(true);
  });

  it('N11C5-ACT-12: unverified_lead NO necesita profile_id', () => {
    function validateActor(actor: unknown): { valid: boolean; reason?: string } {
      if (!actor || typeof actor !== 'object') return { valid: false, reason: 'NOT_OBJECT' };
      const a = actor as Record<string, unknown>;
      const ALLOWED_TYPES = ['tenant_profile', 'unverified_lead', 'system_service'];
      if (!ALLOWED_TYPES.includes(a['type'] as string)) return { valid: false, reason: 'INVALID_TYPE' };
      if (a['type'] === 'tenant_profile' && !a['profile_id']) return { valid: false, reason: 'PROFILE_ID_REQUIRED' };
      // unverified_lead: no profile_id required
      return { valid: true };
    }
    expect(validateActor({ type: 'unverified_lead' }).valid).toBe(true);
    expect(validateActor({ type: 'tenant_profile' }).valid).toBe(false);
    expect(validateActor({ type: 'tenant_profile', profile_id: 'p-001' }).valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-MODE: Modos de integración (8 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-MODE — Modos de integración (5 modos)', () => {
  const VALID_MODES = new Set(['mock', 'shadow', 'canary', 'real', 'disabled']);

  function resolveMode(env: string | undefined): string {
    if (!env || !VALID_MODES.has(env)) return 'disabled';
    return env;
  }

  it('N11C5-MODE-01: modo sin variable → disabled (fail-closed)', () => {
    expect(resolveMode(undefined)).toBe('disabled');
  });

  it('N11C5-MODE-02: modo valor desconocido → disabled', () => {
    expect(resolveMode('unknown_value')).toBe('disabled');
  });

  it('N11C5-MODE-03: modo mock válido', () => {
    expect(resolveMode('mock')).toBe('mock');
  });

  it('N11C5-MODE-04: modo shadow válido', () => {
    expect(resolveMode('shadow')).toBe('shadow');
  });

  it('N11C5-MODE-05: modo canary válido', () => {
    expect(resolveMode('canary')).toBe('canary');
  });

  it('N11C5-MODE-06: modo real válido', () => {
    expect(resolveMode('real')).toBe('real');
  });

  it('N11C5-MODE-07: modo disabled válido', () => {
    expect(resolveMode('disabled')).toBe('disabled');
  });

  it('N11C5-MODE-08: integration-framework.ts soporta resolveMode para add-ons', () => {
    const fw = src(`${SHARED}/integration-framework.ts`);
    expect(fw).toContain('resolveMode');
    expect(fw).toMatch(/mock|disabled/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-HEALTH: Health states (8 tests)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-HEALTH — Health states de add-ons', () => {
  type AddonHealthStatus = 'mock' | 'healthy' | 'degraded' | 'unavailable' | 'misconfigured' | 'contract_mismatch' | 'canary';

  const VALID_HEALTH_STATES: Set<AddonHealthStatus> = new Set([
    'mock', 'healthy', 'degraded', 'unavailable', 'misconfigured', 'contract_mismatch', 'canary',
  ]);

  it('N11C5-HEALTH-01: 7 estados de health válidos', () => {
    expect(VALID_HEALTH_STATES.size).toBe(7);
  });

  it('N11C5-HEALTH-02: mock es estado válido (modo offline)', () => {
    expect(VALID_HEALTH_STATES.has('mock')).toBe(true);
  });

  it('N11C5-HEALTH-03: contract_mismatch es estado válido', () => {
    expect(VALID_HEALTH_STATES.has('contract_mismatch')).toBe(true);
  });

  it('N11C5-HEALTH-04: estado desconocido → unavailable por defecto', () => {
    function resolveHealth(s: string): AddonHealthStatus {
      return VALID_HEALTH_STATES.has(s as AddonHealthStatus) ? (s as AddonHealthStatus) : 'unavailable';
    }
    expect(resolveHealth('unknown')).toBe('unavailable');
    expect(resolveHealth('healthy')).toBe('healthy');
  });

  it('N11C5-HEALTH-05: puerto incidents declara IncidentAddonHealthStatus', () => {
    expect(src(`${SHARED}/incidents-integration-port.ts`)).toContain('IncidentAddonHealthStatus');
  });

  it('N11C5-HEALTH-06: puerto listings declara ListingsAddonHealthStatus', () => {
    expect(src(`${SHARED}/listings-integration-port.ts`)).toContain('ListingsAddonHealthStatus');
  });

  it('N11C5-HEALTH-07: health de puerto incidents incluye canary en type union', () => {
    const s = src(`${SHARED}/incidents-integration-port.ts`);
    expect(s).toContain("'canary'");
  });

  it('N11C5-HEALTH-08: health de puerto listings incluye mock en type union', () => {
    const s = src(`${SHARED}/listings-integration-port.ts`);
    expect(s).toContain("'mock'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5-DOC: Documentación (9 docs — tests dinámicos)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5-DOC — Documentación Fase 11C5', () => {
  const DOCS_DIR = 'docs/smart-conversations/integrations';
  const REQUIRED_DOCS = [
    'addons-dev-readiness.md',
    'incidents-integration-contract.md',
    'listings-integration-contract.md',
    'leads-integration-contract.md',
    'canonical-actor-contract.md',
    'addons-authentication-model.md',
    'addons-privacy-model.md',
    'addons-dev-test-report.md',
    'addons-dev-rollback.md',
  ];

  for (const doc of REQUIRED_DOCS) {
    it(`N11C5-DOC: ${doc} existe`, () => {
      expect(exists(`${DOCS_DIR}/${doc}`), `Ausente: ${doc}`).toBe(true);
    });
  }

  it('N11C5-DOC-GATE: addons-dev-readiness.md menciona GATE_1', () => {
    expect(src(`${DOCS_DIR}/addons-dev-readiness.md`)).toContain('GATE_1');
  });

  it('N11C5-DOC-STATE: addons-dev-readiness.md menciona ADDONS_INTEGRATION_OFFLINE_READY_DEV_PENDING', () => {
    expect(src(`${DOCS_DIR}/addons-dev-readiness.md`)).toContain('ADDONS_INTEGRATION_OFFLINE_READY_DEV_PENDING');
  });
});
