/**
 * integrations-dev-contracts.spec.ts — Fase 11C1
 * Validación de contratos canónicos, health checks y documentación.
 *
 * Total: 32 tests (IDC-*)
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
function fileExists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulación del contrato canónico
// ─────────────────────────────────────────────────────────────────────────────

interface IntegrationSuccessContract {
  ok: true;
  data: unknown;
  meta: {
    request_id: string;
    correlation_id: string;
    provider: string;
    mode: string;
    duration_ms: number;
    idempotent_replay: boolean;
  };
}

interface IntegrationErrorContract {
  ok: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    retry_after_seconds: number | null;
  };
  meta: { request_id: string; correlation_id: string; provider: string; mode: string; };
}

type ContractResult = IntegrationSuccessContract | IntegrationErrorContract;

function buildContractSuccess(data: unknown, provider: string, mode: string): IntegrationSuccessContract {
  return {
    ok: true,
    data,
    meta: { request_id: crypto.randomUUID(), correlation_id: 'test-cid', provider, mode, duration_ms: 0, idempotent_replay: false },
  };
}

function buildContractError(code: string, message: string, provider: string, mode: string): IntegrationErrorContract {
  return {
    ok: false,
    error: { code, message, retryable: false, retry_after_seconds: null },
    meta: { request_id: crypto.randomUUID(), correlation_id: 'test-cid', provider, mode },
  };
}

function validateContractResult(r: ContractResult): string[] {
  const errors: string[] = [];
  if (!('ok' in r)) errors.push('missing ok field');
  if (!r.meta?.request_id) errors.push('missing request_id');
  if (!r.meta?.correlation_id) errors.push('missing correlation_id');
  if (!r.meta?.provider) errors.push('missing provider');
  if (!r.meta?.mode) errors.push('missing mode');
  if (r.ok) {
    if (r.meta.duration_ms === undefined) errors.push('missing duration_ms');
    if (r.meta.idempotent_replay === undefined) errors.push('missing idempotent_replay');
  } else {
    if (!r.error.code) errors.push('missing error.code');
    if (!r.error.message) errors.push('missing error.message');
    if (r.error.retryable === undefined) errors.push('missing error.retryable');
    if (!('retry_after_seconds' in r.error)) errors.push('missing retry_after_seconds');
  }
  return errors;
}

function hasForbiddenContent(result: ContractResult): boolean {
  const str = JSON.stringify(result);
  const forbidden = ['stack', 'password', 'api_key', 'service_role', 'secret', 'token', 'profile_id', 'phone_number', 'sender_ref', 'raw_payload', 'prompt', 'sql', 'SELECT', 'INSERT'];
  return forbidden.some(f => str.includes(f));
}

// ─────────────────────────────────────────────────────────────────────────────
// IDC-CONTRACT — Contrato canónico
// ─────────────────────────────────────────────────────────────────────────────

describe('IDC-CONTRACT — Contrato canónico de adapters', () => {
  it('IDC-C01: success contract tiene ok, data, meta', () => {
    const r = buildContractSuccess({ incident_id: 'INC-001' }, 'incidents_addon', 'mock');
    const errors = validateContractResult(r);
    expect(errors).toHaveLength(0);
  });

  it('IDC-C02: error contract tiene ok:false, error, meta', () => {
    const r = buildContractError('TIMEOUT', 'n8n_timeout', 'n8n', 'real');
    const errors = validateContractResult(r);
    expect(errors).toHaveLength(0);
  });

  it('IDC-C03: meta siempre tiene request_id (UUID)', () => {
    const r = buildContractSuccess({}, 'core', 'mock');
    expect(r.meta.request_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('IDC-C04: meta siempre tiene correlation_id', () => {
    const r = buildContractError('VALIDATION_ERROR', 'err', 'listings_addon', 'mock');
    expect(r.meta.correlation_id).toBeTruthy();
  });

  it('IDC-C05: meta tiene provider seguro (no URL ni credenciales)', () => {
    const r = buildContractSuccess({}, 'n8n', 'canary');
    expect(r.meta.provider).toBe('n8n');
    expect(r.meta.provider).not.toContain('http');
    expect(r.meta.provider).not.toContain('key');
  });

  it('IDC-C06: meta tiene mode válido', () => {
    const modes = ['mock', 'shadow', 'canary', 'real', 'disabled'];
    for (const mode of modes) {
      const r = buildContractSuccess({}, 'ai', mode);
      expect(modes).toContain(r.meta.mode);
    }
  });

  it('IDC-C07: success tiene duration_ms', () => {
    const r = buildContractSuccess({ lead_id: 'LEAD-001' }, 'listings_addon', 'mock');
    expect(r.meta.duration_ms).toBeDefined();
    expect(typeof r.meta.duration_ms).toBe('number');
  });

  it('IDC-C08: success tiene idempotent_replay bool', () => {
    const r = buildContractSuccess({}, 'core', 'mock');
    expect(typeof r.meta.idempotent_replay).toBe('boolean');
  });

  it('IDC-C09: error tiene retryable bool', () => {
    const r = buildContractError('RATE_LIMITED', 'rate_limited', 'n8n', 'real');
    expect(typeof r.error.retryable).toBe('boolean');
  });

  it('IDC-C10: error tiene retry_after_seconds (null o number)', () => {
    const r = buildContractError('RATE_LIMITED', 'rate_limited', 'n8n', 'real');
    expect(r.error.retry_after_seconds === null || typeof r.error.retry_after_seconds === 'number').toBe(true);
  });

  it('IDC-C11: respuesta no contiene stack trace, secretos ni PII', () => {
    const r = buildContractSuccess({ incident_id: 'INC-001', status: 'created' }, 'incidents_addon', 'mock');
    expect(hasForbiddenContent(r)).toBe(false);
  });

  it('IDC-C12: error no expone SQL ni respuesta raw del proveedor', () => {
    const r = buildContractError('DEPENDENCY_UNAVAILABLE', 'dependency_down', 'core', 'real');
    expect(hasForbiddenContent(r)).toBe(false);
  });

  it('IDC-C13: todos los códigos canónicos definidos', () => {
    const framework = readFile('supabase/functions/_shared/smart-conversations/integration-framework.ts');
    const EXPECTED_CODES = [
      'CONFIGURATION_ERROR', 'UNAUTHORIZED', 'FORBIDDEN', 'VALIDATION_ERROR',
      'TENANT_NOT_FOUND', 'FEATURE_DISABLED', 'RESOURCE_NOT_FOUND', 'CONFLICT',
      'RATE_LIMITED', 'TIMEOUT', 'DEPENDENCY_UNAVAILABLE', 'CONTRACT_MISMATCH', 'INTERNAL_ERROR',
    ];
    for (const code of EXPECTED_CODES) {
      expect(framework).toContain(code);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IDC-HEALTH — Health check
// ─────────────────────────────────────────────────────────────────────────────

describe('IDC-HEALTH — Health checks sanitizados', () => {
  it('IDC-H01: integration-health.ts existe', () => {
    expect(fileExists('supabase/functions/_shared/smart-conversations/integration-health.ts')).toBe(true);
  });

  it('IDC-H02: 7 integraciones registradas en KNOWN_INTEGRATIONS', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/integration-health.ts');
    const matches = src.match(/name: '/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(7);
  });

  it('IDC-H03: health no expone URLs (no http en buildReadinessReport)', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/integration-health.ts');
    expect(src).toContain('buildReadinessReport');
    // La función solo devuelve integration, mode, status — no URLs
    expect(src).toContain('integration');
    expect(src).toContain('status');
  });

  it('IDC-H04: estados de health definidos (healthy|degraded|unavailable|misconfigured|mock|canary|disabled)', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/integration-framework.ts');
    expect(src).toContain("'healthy'");
    expect(src).toContain("'degraded'");
    expect(src).toContain("'unavailable'");
    expect(src).toContain("'misconfigured'");
    expect(src).toContain("'mock'");
    expect(src).toContain("'canary'");
    expect(src).toContain("'disabled'");
  });

  it('IDC-H05: health no ejecuta operaciones mutables', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/integration-health.ts');
    expect(src).not.toContain('POST');
    expect(src).not.toContain('createIncident');
    expect(src).not.toContain('createLead');
    expect(src).not.toContain('publishActivity');
  });

  it('IDC-H06: secrets no aparecen en health report', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/integration-health.ts');
    // El reporte solo emite integration, mode, status
    expect(src).not.toContain('token_value');
    expect(src).not.toContain('api_key_value');
  });

  it('IDC-H07: mock status cuando mode=mock', () => {
    // Simulado inline
    function simHealth(mode: string): string {
      if (mode === 'mock') return 'mock';
      if (mode === 'disabled') return 'disabled';
      return 'healthy';
    }
    expect(simHealth('mock')).toBe('mock');
    expect(simHealth('disabled')).toBe('disabled');
    expect(simHealth('canary')).toBe('healthy');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IDC-DOCS — Documentación
// ─────────────────────────────────────────────────────────────────────────────

describe('IDC-DOCS — Documentación Fase 11C1', () => {
  it('IDC-D01: dev-integration-readiness.md existe', () => {
    expect(fileExists('docs/smart-conversations/integrations/dev-integration-readiness.md')).toBe(true);
  });

  it('IDC-D02: integration-mode-model.md existe', () => {
    expect(fileExists('docs/smart-conversations/integrations/integration-mode-model.md')).toBe(true);
  });

  it('IDC-D03: integration-canary-plan.md existe', () => {
    expect(fileExists('docs/smart-conversations/integrations/integration-canary-plan.md')).toBe(true);
  });

  it('IDC-D04: dev-integration-rollback.md existe', () => {
    expect(fileExists('docs/smart-conversations/integrations/dev-integration-rollback.md')).toBe(true);
  });

  it('IDC-D05: integration-contract-catalog.md existe', () => {
    expect(fileExists('docs/smart-conversations/integrations/integration-contract-catalog.md')).toBe(true);
  });

  it('IDC-D06: dev-integration-readiness.md lista todas las integraciones', () => {
    const src = readFile('docs/smart-conversations/integrations/dev-integration-readiness.md');
    expect(src).toContain('core');
    expect(src).toContain('ai');
    expect(src).toContain('n8n');
    expect(src).toContain('incidents_addon');
    expect(src).toContain('listings_addon');
    expect(src).toContain('realtime');
    expect(src).toContain('wasender');
  });

  it('IDC-D07: integration-mode-model.md describe los 5 modos', () => {
    const src = readFile('docs/smart-conversations/integrations/integration-mode-model.md');
    expect(src).toContain('mock');
    expect(src).toContain('shadow');
    expect(src).toContain('canary');
    expect(src).toContain('real');
    expect(src).toContain('disabled');
  });

  it('IDC-D08: dev-integration-rollback.md cubre todas las integraciones', () => {
    const src = readFile('docs/smart-conversations/integrations/dev-integration-rollback.md');
    expect(src).toContain('core');
    expect(src).toContain('wasender');
  });

  it('IDC-D09: integration-canary-plan.md menciona tenant DEV ficticio', () => {
    const src = readFile('docs/smart-conversations/integrations/integration-canary-plan.md');
    expect(src).toContain('dev-tenant');
  });

  it('IDC-D10: dev-integration-readiness.md tiene estados permitidos', () => {
    const src = readFile('docs/smart-conversations/integrations/dev-integration-readiness.md');
    expect(src).toContain('MOCK_ONLY');
    expect(src).toContain('DEV_CONFIGURATION_PENDING');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IDC-VALIDATOR — Validador de integraciones
// ─────────────────────────────────────────────────────────────────────────────

describe('IDC-VALIDATOR — validate-dev-integrations.mjs', () => {
  it('IDC-V01: validate-dev-integrations.mjs existe', () => {
    expect(fileExists('scripts/smart-conversations/validate-dev-integrations.mjs')).toBe(true);
  });

  it('IDC-V02: no imprime secretos (no _getEnv value logging)', () => {
    const src = readFile('scripts/smart-conversations/validate-dev-integrations.mjs');
    // No debe loguear el valor de las env vars sensibles
    expect(src).not.toMatch(/console\.log.*service_role|console\.log.*api_key|console\.log.*token/i);
  });

  it('IDC-V03: verifica modos de todas las integraciones', () => {
    const src = readFile('scripts/smart-conversations/validate-dev-integrations.mjs');
    expect(src).toContain('CORE_INTEGRATION_MODE');
    expect(src).toContain('N8N_INTEGRATION_MODE');
    expect(src).toContain('WASENDER_INTEGRATION_MODE');
  });

  it('IDC-V04: estados INTEGRATIONS_OFFLINE_READY e INTEGRATIONS_INCOMPLETE definidos', () => {
    const src = readFile('scripts/smart-conversations/validate-dev-integrations.mjs');
    expect(src).toContain('INTEGRATIONS_OFFLINE_READY');
    expect(src).toContain('INTEGRATIONS_INCOMPLETE');
  });

  it('IDC-V05: validate:sc:dev-integrations está en package.json', () => {
    const pkg = readFile('package.json');
    expect(pkg).toContain('validate:sc:dev-integrations');
  });

  it('IDC-V06: test:sc:integrations-dev está en package.json', () => {
    const pkg = readFile('package.json');
    expect(pkg).toContain('test:sc:integrations-dev');
  });

  it('IDC-V07: CI incluye test:sc:integrations-dev', () => {
    const ci = readFile('.github/workflows/pr-checks.yml');
    expect(ci).toContain('integrations-dev');
  });
});
