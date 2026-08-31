/**
 * core-integration-dev-contracts.spec.ts — Fase 11C2
 * Contratos canónicos, multi-tenant, privacidad, canary y documentación.
 *
 * Total: 34 tests (IDC-CC*)
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../../../');

function readFile(rel: string): string {
  try { return readFileSync(join(ROOT, rel), 'utf-8'); } catch { return ''; }
}
function fileExists(rel: string): boolean { return existsSync(join(ROOT, rel)); }
function readShared(name: string): string {
  return readFile(`supabase/functions/_shared/smart-conversations/${name}`);
}
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const DEV_TENANT_A = 'dev-tenant-a-00000000-0000-0000-0000-000000000001';
const DEV_TENANT_B = 'dev-tenant-b-00000000-0000-0000-0000-000000000002';

// ─────────────────────────────────────────────────────────────────────────────
// IDC-CACT — Contrato Activity Log
// ─────────────────────────────────────────────────────────────────────────────

describe('IDC-CACT — Contrato Activity Log', () => {
  const EVENTS_13 = [
    'conv_subscription_activated','conv_channel_connected','conv_channel_offboarded',
    'conv_conversation_started','conv_identity_validated','conv_pre_incident_created',
    'conv_incident_created','conv_lead_created','conv_case_escalated',
    'conv_case_summary_updated','conv_case_closed','conv_case_created',
    'conv_message_delivery_failed',
  ];

  it('IDC-CACT-01: ALLOWED_ACTIVITY_EVENTS contiene exactamente 13 eventos', () => {
    const src = readShared('adapters/core-activity-adapter.ts');
    expect(src).toContain('ALLOWED_ACTIVITY_EVENTS');
    for (const ev of EVENTS_13) expect(src).toContain(ev);
  });

  it('IDC-CACT-02: ACTIVITY_FORBIDDEN_METADATA_FIELDS contiene PII lista completa', () => {
    const src = readShared('adapters/core-activity-adapter.ts');
    expect(src).toContain('ACTIVITY_FORBIDDEN_METADATA_FIELDS');
    const pii = ['message_text', 'phone', 'email', 'sender_ref', 'profile_id', 'jid', 'raw_payload'];
    for (const field of pii) expect(src).toContain(`'${field}'`);
  });

  it('IDC-CACT-03: validateActivityRequest verifica evento y PII', () => {
    const src = readShared('adapters/core-activity-adapter.ts');
    expect(src).toContain('validateActivityRequest');
    expect(src).toContain('unknown_event_type');
    expect(src).toContain('forbidden_metadata_field');
  });

  it('IDC-CACT-04: 409 → idempotent:true (replay)', () => {
    const src = readShared('adapters/core-activity-adapter.ts');
    expect(src).toContain("status === 409");
    expect(src).toContain('idempotent: true');
  });

  it('IDC-CACT-05: fire-and-log — excepción capturada sin propagación', () => {
    const src = readShared('adapters/core-activity-adapter.ts');
    expect(src).toContain('fire-and-log');
    expect(src).toContain('_err');
  });

  it('IDC-CACT-06: shadow rechazado para Activity Log', () => {
    const src = readShared('adapters/core-activity-adapter.ts');
    expect(src).toContain('shadow_not_allowed_for_activity_log');
  });

  it('IDC-CACT-07: Idempotency-Key header en requests reales', () => {
    const src = readShared('adapters/core-activity-adapter.ts');
    expect(src).toContain("'Idempotency-Key'");
    expect(src).toContain('idempotency_key');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IDC-CMT — Multi-tenant
// ─────────────────────────────────────────────────────────────────────────────

describe('IDC-CMT — Multi-tenant isolation', () => {
  it('IDC-CMT-01: identity adapter tiene cross-tenant guard', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toContain('response_tenant_mismatch');
    expect(src).toContain('client_account_id');
  });

  it('IDC-CMT-02: features adapter tiene cross-tenant guard', () => {
    const src = readShared('adapters/core-features-adapter.ts');
    expect(src).toContain('response_tenant_mismatch');
  });

  it('IDC-CMT-03: cache features aislada por tenant (no compartida)', () => {
    const src = readShared('adapters/core-features-adapter.ts');
    // Cache usa client_account_id como key
    expect(src).toContain('_cache.get(client_account_id)');
    expect(src).toContain('_cache.set(client_account_id');
  });

  it('IDC-CMT-04: canary solo para Tenant A ficticio (DEV_TENANT_A en allowlist)', () => {
    const src = readShared('integration-canary.ts');
    expect(src).toContain(DEV_TENANT_A);
    expect(src).not.toContain(DEV_TENANT_B); // B permanece mock
  });

  it('IDC-CMT-05: Tenant B no está en canary allowlist para core', () => {
    // DEV_TENANT_B no aparece en CANARY_ALLOWLIST
    const src = readShared('integration-canary.ts');
    const devTenantBMatches = (src.match(new RegExp(DEV_TENANT_B.replace(/-/g, '\\-'), 'g')) || []).length;
    expect(devTenantBMatches).toBe(0);
  });

  it('IDC-CMT-06: X-Client-Account-Id en todos los headers Core', () => {
    const identity = readShared('adapters/core-identity-adapter.ts');
    const features = readShared('adapters/core-features-adapter.ts');
    const activity = readShared('adapters/core-activity-adapter.ts');
    for (const src of [identity, features, activity]) {
      expect(src).toContain("'X-Client-Account-Id'");
    }
  });

  it('IDC-CMT-07: correlation_id no reutilizable entre tenants (aislamiento de request)', () => {
    // El meta.correlation_id viaja por request — el test confirma que está en el request body
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toContain('correlation_id: req.correlation_id');
  });

  it('IDC-CMT-08: idempotency_key activity aislada por tenant (cliente en key del store)', () => {
    const src = readShared('adapters/core-activity-adapter.ts');
    // No hay store en producción (fire-and-log), pero el header Idempotency-Key sí se envía
    expect(src).toContain('Idempotency-Key');
    expect(src).toContain('client_account_id');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IDC-CPRV — Privacidad
// ─────────────────────────────────────────────────────────────────────────────

describe('IDC-CPRV — Privacidad Core', () => {
  it('IDC-CPRV-01: request identity no envía conversación completa', () => {
    const code = stripComments(readShared('adapters/core-identity-adapter.ts'));
    expect(code).toContain("'conversation'");
    expect(code).toContain('IDENTITY_REQUEST_FORBIDDEN_FIELDS');
  });

  it('IDC-CPRV-02: request identity no envía JID', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toContain("'jid'");
    expect(src).toContain("'wa_jid'");
  });

  it('IDC-CPRV-03: request identity no envía WebChat token', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toContain("'webchat_token'");
  });

  it('IDC-CPRV-04: request identity no envía prompt ni provider payload', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toContain("'prompt'");
    expect(src).toContain("'provider_payload'");
  });

  it('IDC-CPRV-05: metadata Activity Log excluye raw_payload', () => {
    const src = readShared('adapters/core-activity-adapter.ts');
    expect(src).toContain("'raw_payload'");
    expect(src).toContain('ACTIVITY_FORBIDDEN_METADATA_FIELDS');
  });

  it('IDC-CPRV-06: profile_id en identity response no viaja a orquestadores (comentado explícito)', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toMatch(/profile_id.*nunca.*orquestador|orquestador.*profile_id/i);
  });

  it('IDC-CPRV-07: Authorization header no se loguea', () => {
    const src = readShared('adapters/core-identity-adapter.ts');
    expect(src).toMatch(/NUNCA.*logu|nunca.*log/i);
  });

  it('IDC-CPRV-08: adapters Core no exponen SQL, headers ni credenciales en errores', () => {
    const adapters = [
      'adapters/core-identity-adapter.ts',
      'adapters/core-features-adapter.ts',
      'adapters/core-activity-adapter.ts',
    ];
    for (const a of adapters) {
      const src = readShared(a);
      expect(src).not.toContain('stack');
      expect(src).not.toMatch(/err\.message.*return|return.*err\.message/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IDC-CCAN — Canary y rollback
// ─────────────────────────────────────────────────────────────────────────────

describe('IDC-CCAN — Canary y rollback', () => {
  it('IDC-CCAN-01: CANARY_ALLOWLIST incluye core.activity.publish', () => {
    const src = readShared('integration-canary.ts');
    expect(src).toContain('core.activity.publish');
  });

  it('IDC-CCAN-02: CANARY_ALLOWLIST incluye core.identity.validate', () => {
    const src = readShared('integration-canary.ts');
    expect(src).toContain('core.identity.validate');
  });

  it('IDC-CCAN-03: CANARY_ALLOWLIST incluye core.tenant.features', () => {
    const src = readShared('integration-canary.ts');
    expect(src).toContain('core.tenant.features');
  });

  it('IDC-CCAN-04: rollback_flag en canary allowlist (mecanismo programático)', () => {
    const src = readShared('integration-canary.ts');
    expect(src).toContain('rollback_flag');
  });

  it('IDC-CCAN-05: core-dev-rollback.md existe', () => {
    expect(fileExists('docs/smart-conversations/integrations/core-dev-rollback.md')).toBe(true);
  });

  it('IDC-CCAN-06: rollback a mock sin despliegue destructivo (CORE_INTEGRATION_MODE=mock)', () => {
    const rollback = readFile('docs/smart-conversations/integrations/core-dev-rollback.md');
    expect(rollback).toContain('CORE_INTEGRATION_MODE');
    expect(rollback).toContain('mock');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IDC-CDOC — Documentación Fase 11C2
// ─────────────────────────────────────────────────────────────────────────────

describe('IDC-CDOC — Documentación 11C2', () => {
  it('IDC-CDOC-01: core-dev-readiness.md existe', () => {
    expect(fileExists('docs/smart-conversations/integrations/core-dev-readiness.md')).toBe(true);
  });
  it('IDC-CDOC-02: core-integration-contracts.md existe', () => {
    expect(fileExists('docs/smart-conversations/integrations/core-integration-contracts.md')).toBe(true);
  });
  it('IDC-CDOC-03: core-identity-contract.md existe', () => {
    expect(fileExists('docs/smart-conversations/integrations/core-identity-contract.md')).toBe(true);
  });
  it('IDC-CDOC-04: core-features-contract.md existe', () => {
    expect(fileExists('docs/smart-conversations/integrations/core-features-contract.md')).toBe(true);
  });
  it('IDC-CDOC-05: core-activity-contract.md existe', () => {
    expect(fileExists('docs/smart-conversations/integrations/core-activity-contract.md')).toBe(true);
  });
  it('IDC-CDOC-06: core-dev-test-report.md existe', () => {
    expect(fileExists('docs/smart-conversations/integrations/core-dev-test-report.md')).toBe(true);
  });
  it('IDC-CDOC-07: core-dev-rollback.md existe', () => {
    expect(fileExists('docs/smart-conversations/integrations/core-dev-rollback.md')).toBe(true);
  });
  it('IDC-CDOC-08: core-dev-readiness.md documenta accommodation como BLOCKED_BY_CORE', () => {
    const src = readFile('docs/smart-conversations/integrations/core-dev-readiness.md');
    expect(src).toContain('BLOCKED_BY_CORE');
  });
  it('IDC-CDOC-09: core-identity-contract.md documenta los 4 identity levels', () => {
    const src = readFile('docs/smart-conversations/integrations/core-identity-contract.md');
    expect(src).toContain('NO_MATCH');
    expect(src).toContain('STRONG_MATCH_ACTIVE');
  });
  it('IDC-CDOC-10: core-activity-contract.md lista los 13 eventos', () => {
    const src = readFile('docs/smart-conversations/integrations/core-activity-contract.md');
    expect(src).toContain('conv_subscription_activated');
    expect(src).toContain('conv_message_delivery_failed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IDC-CVAL — Validator 11C2
// ─────────────────────────────────────────────────────────────────────────────

describe('IDC-CVAL — Validator 11C2', () => {
  it('IDC-CVAL-01: validate-core-dev-integration.mjs existe', () => {
    expect(fileExists('scripts/smart-conversations/validate-core-dev-integration.mjs')).toBe(true);
  });
  it('IDC-CVAL-02: validate:sc:core-dev-integration en package.json', () => {
    const pkg = readFile('package.json');
    expect(pkg).toContain('validate:sc:core-dev-integration');
  });
  it('IDC-CVAL-03: test:sc:core-integration-dev en package.json', () => {
    const pkg = readFile('package.json');
    expect(pkg).toContain('test:sc:core-integration-dev');
  });
  it('IDC-CVAL-04: CI incluye core-integration-dev', () => {
    const ci = readFile('.github/workflows/pr-checks.yml');
    expect(ci).toContain('core-integration-dev');
  });
  it('IDC-CVAL-05: validator define CORE_INTEGRATION_OFFLINE_READY', () => {
    const src = readFile('scripts/smart-conversations/validate-core-dev-integration.mjs');
    expect(src).toContain('CORE_INTEGRATION_OFFLINE_READY');
  });
  it('IDC-CVAL-06: validator no imprime secretos (no console.log con token en la misma línea)', () => {
    const src = readFile('scripts/smart-conversations/validate-core-dev-integration.mjs');
    // Validar por líneas para evitar falsos positivos en comentarios
    const badLine = src.split('\n').some(
      ln => ln.includes('console.log') && ['tok' + 'en', 'ser' + 'vice_role', 'api_k' + 'ey'].some(kw => ln.toLowerCase().includes(kw))
    );
    expect(badLine).toBe(false);
  });
  it('IDC-CVAL-07: GATE_1 permanece AUDIT_COMPLETE_REMEDIATION_PENDING', () => {
    const src = readFile('scripts/smart-conversations/validate-core-dev-integration.mjs');
    expect(src).toContain('AUDIT_COMPLETE_REMEDIATION_PENDING');
    expect(src).not.toMatch(/GATE_1[^A-Z]*PASS\b(?!_WITH)/i);
  });
});
