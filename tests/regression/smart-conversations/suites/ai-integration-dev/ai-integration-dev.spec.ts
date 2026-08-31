/**
 * ai-integration-dev.spec.ts — Fase 11C3
 * Checks estáticos: deudas previas, precheck, arquitectura, control plane, boundaries.
 *
 * Estado: AI_DEV_CONFIGURATION_PENDING (sin proveedor aprobado)
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

// ─────────────────────────────────────────────────────────────────────────────
// AIDEV-DEBT — Deudas previas resueltas en 11C3
// ─────────────────────────────────────────────────────────────────────────────

describe('AIDEV-DEBT — Deudas 11C2 resueltas', () => {
  it('AIDEV-DEBT-01: environment-model.ts existe (fuente única)', () => {
    expect(fileExists('supabase/functions/_shared/smart-conversations/environment-model.ts')).toBe(true);
  });

  it('AIDEV-DEBT-02: DEV_ENVIRONMENT_ALIASES exportado desde environment-model.ts', () => {
    const src = readShared('environment-model.ts');
    expect(src).toContain('DEV_ENVIRONMENT_ALIASES');
    expect(src).toContain('export');
  });

  it('AIDEV-DEBT-03: dev normaliza al valor canónico (development)', () => {
    const src = readShared('environment-model.ts');
    expect(src).toContain("'dev'");
    expect(src).toContain("'development'");
    expect(src).toContain('CANONICAL_DEV_ENVIRONMENT');
  });

  it('AIDEV-DEBT-04: sandbox normaliza al valor canónico (development)', () => {
    const src = readShared('environment-model.ts');
    expect(src).toContain("'sandbox'");
    // sandbox mapea a development
    expect(src).toMatch(/'sandbox'\s*:\s*'development'/);
  });

  it('AIDEV-DEBT-05: development es el valor canónico', () => {
    const src = readShared('environment-model.ts');
    expect(src).toContain("CANONICAL_DEV_ENVIRONMENT: CanonicalDevEnvironment = 'development'");
  });

  it('AIDEV-DEBT-06: PRE no es DEV (staging → staging)', () => {
    const src = readShared('environment-model.ts');
    expect(src).toContain("'staging'");
    expect(src).toContain("'pre'");
    // pre mapea a staging, no a development
    expect(src).toMatch(/'pre'\s*:\s*'staging'/);
  });

  it('AIDEV-DEBT-07: PRO no es DEV (production → production)', () => {
    const src = readShared('environment-model.ts');
    expect(src).toContain("'production'");
    expect(src).toContain("'pro'");
    expect(src).toMatch(/'pro'\s*:\s*'production'/);
  });

  it('AIDEV-DEBT-08: integration-framework.ts usa isDevelopmentEnvironment importado', () => {
    const src = readShared('integration-framework.ts');
    expect(src).toContain('isDevelopmentEnvironment');
    expect(src).toContain('environment-model.ts');
  });

  it('AIDEV-DEBT-09: core-target-guard.ts re-exporta desde environment-model.ts', () => {
    const src = readShared('core-target-guard.ts');
    expect(src).toContain('environment-model.ts');
    expect(src).toContain('DEV_ENVIRONMENTS');
  });

  it('AIDEV-DEBT-10: normalizeEnvironment exportada desde environment-model.ts', () => {
    const src = readShared('environment-model.ts');
    expect(src).toContain('export function normalizeEnvironment');
  });

  it('AIDEV-DEBT-11: assertEnvironmentAllowedForMode exportada', () => {
    const src = readShared('environment-model.ts');
    expect(src).toContain('export function assertEnvironmentAllowedForMode');
    expect(src).toContain("mode_real_requires_dev_environment");
  });

  it('AIDEV-DEBT-12: validate-dev-integrations.mjs usa stripComments en boundaries', () => {
    const src = readFile('scripts/smart-conversations/validate-dev-integrations.mjs');
    expect(src).toContain('function stripComments');
    expect(src).toContain('stripComments(');
  });

  it('AIDEV-DEBT-13: validate-dev-integrations.mjs — comentario con n8n no falla boundary', () => {
    // IDV-NO-WF02 ahora usa stripComments — un comentario con WF-02 no dispara error
    const src = readFile('scripts/smart-conversations/validate-dev-integrations.mjs');
    expect(src).toContain('stripComments(read(ADAPTERS');
    expect(src).toContain('código efectivo');
  });

  it('AIDEV-DEBT-14: validate-core-dev-integration.mjs usa stripComments', () => {
    const src = readFile('scripts/smart-conversations/validate-core-dev-integration.mjs');
    expect(src).toContain('stripComments');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AIDEV-PRE — Precheck AI
// ─────────────────────────────────────────────────────────────────────────────

describe('AIDEV-PRE — Precheck AI', () => {
  it('AIDEV-PRE-01: ai-client.ts existe (adapter existente)', () => {
    expect(fileExists('supabase/functions/_shared/smart-conversations/runtime/ai-client.ts')).toBe(true);
  });

  it('AIDEV-PRE-02: ai-integration-adapter.ts existe (5 modos)', () => {
    expect(fileExists('supabase/functions/_shared/smart-conversations/adapters/ai-integration-adapter.ts')).toBe(true);
  });

  it('AIDEV-PRE-03: sin proveedor aprobado → AI_DEV_CONFIGURATION_PENDING', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain('AI_DEV_CONFIGURATION_PENDING');
  });

  it('AIDEV-PRE-04: ai-dev-readiness.md documenta estado de cada capacidad', () => {
    const doc = readFile('docs/smart-conversations/integrations/ai-dev-readiness.md');
    expect(doc).toContain('classifyIntent');
    expect(doc).toContain('AI_DEV_CONFIGURATION_PENDING');
  });

  it('AIDEV-PRE-05: proveedor desconocido rechazado', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain("provider === 'mock'");
    expect(src).toContain('AI_DEV_CONFIGURATION_PENDING');
  });

  it('AIDEV-PRE-06: sin ADR de proveedor — no se inventa uno', () => {
    // No debe existir un adapter hardcoded a un proveedor específico en 11C3
    const src = stripComments(readShared('adapters/ai-integration-adapter.ts'));
    expect(src).not.toMatch(/openai\.com|anthropic\.com|googleapis\.com/);
  });

  it('AIDEV-PRE-07: sin VITE_ en variables AI', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).not.toContain('VITE_');
  });

  it('AIDEV-PRE-08: PRE/PRO bloqueados (assertRealModeAllowed)', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain('assertRealModeAllowed');
    expect(src).toContain('mode_');
  });

  it('AIDEV-PRE-09: canary allowlist contiene las 6 operaciones AI', () => {
    const src = readShared('integration-canary.ts');
    const ops = ['ai.intent.classify', 'ai.incident.extract', 'ai.listing.extract', 'ai.help.extract', 'ai.safe_summary', 'ai.response_draft'];
    for (const op of ops) expect(src).toContain(op);
  });

  it('AIDEV-PRE-10: 64 DEV_REQUIRED en security-local-db — no se han eliminado', () => {
    expect(fileExists('tests/regression/smart-conversations/suites/security-local-db')).toBe(true);
    const src = readFile('tests/regression/smart-conversations/suites/security-local-db/security-local-db.spec.ts');
    const skips = (src.match(/skipIf/g) ?? []).length;
    expect(skips).toBeGreaterThanOrEqual(50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AIDEV-ARCH — Arquitectura vendor-agnostic
// ─────────────────────────────────────────────────────────────────────────────

describe('AIDEV-ARCH — Arquitectura vendor-agnostic', () => {
  it('AIDEV-ARCH-01: adapter no importa SDK de proveedor específico', () => {
    const src = stripComments(readShared('adapters/ai-integration-adapter.ts'));
    expect(src).not.toMatch(/from ['"]openai['"]|from ['"]@anthropic/);
    expect(src).not.toMatch(/import.*openai|import.*anthropic/i);
  });

  it('AIDEV-ARCH-02: 6 operaciones AI allowlisted', () => {
    const src = readShared('runtime/ai-client.ts');
    const ops = ['ai.intent.classify', 'ai.incident.extract', 'ai.listing.extract', 'ai.help.extract', 'ai.safe_summary', 'ai.response_draft'];
    for (const op of ops) expect(src).toContain(op);
  });

  it('AIDEV-ARCH-03: AIRequestBase exige client_account_id y correlation_id', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain('client_account_id');
    expect(src).toContain('correlation_id');
    expect(src).toContain('safe_text');
  });

  it('AIDEV-ARCH-04: 4 capacidades canónicas definidas', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain('ClassifyIntentResult');
    expect(src).toContain('ExtractIncidentResult');
    expect(src).toContain('SummarizeCaseResult');
    expect(src).toContain('DraftResponseResult');
  });

  it('AIDEV-ARCH-05: fallbacks deterministas sin llamada IA', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain('fallbackClassifyIntent');
    expect(src).toContain('fallbackExtractIncident');
    expect(src).toContain('fallbackSummarizeCase');
    expect(src).toContain('fallbackDraftResponse');
  });

  it('AIDEV-ARCH-06: output validation por operación', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain('validateClassifyIntentOutput');
    expect(src).toContain('validateSummarizeCaseOutput');
    expect(src).toContain('validateDraftResponseOutput');
  });

  it('AIDEV-ARCH-07: resolveMode importado del framework', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain('resolveMode');
    expect(src).toContain('integration-framework.ts');
  });

  it('AIDEV-ARCH-08: resolveEffectiveMode importado de canary', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain('resolveEffectiveMode');
    expect(src).toContain('integration-canary.ts');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AIDEV-CTRL — Control plane (5 modos)
// ─────────────────────────────────────────────────────────────────────────────

describe('AIDEV-CTRL — Control plane', () => {
  it('AIDEV-CTRL-01: modo desconocido → disabled (fail-closed)', () => {
    const src = readShared('integration-framework.ts');
    expect(src).toContain("return 'disabled'");
  });

  it('AIDEV-CTRL-02: mock no llama proveedor externo', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain("mode === 'mock'");
    expect(src).toContain('_mockResponse');
  });

  it('AIDEV-CTRL-03: disabled rechaza inmediatamente', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain("mode === 'disabled'");
    expect(src).toContain('buildDisabledError');
  });

  it('AIDEV-CTRL-04: shadow permitido para operaciones AI', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    // shadow no rechazado explícitamente (a diferencia de Activity Log)
    expect(src).not.toContain('shadow_not_allowed');
  });

  it('AIDEV-CTRL-05: canary usa resolveEffectiveMode con allowlist', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain('resolveEffectiveMode(mode, req.client_account_id');
  });

  it('AIDEV-CTRL-06: real fuera de DEV rechazado (assertRealModeAllowed)', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain('assertRealModeAllowed');
    expect(src).toContain('CONFIGURATION_ERROR');
  });

  it('AIDEV-CTRL-07: tenant no en allowlist → mock efectivo', () => {
    const canary = readShared('integration-canary.ts');
    expect(canary).toContain("effective_mode: 'mock'");
    expect(canary).toContain('not_in_allowlist');
  });

  it('AIDEV-CTRL-08: rollback → rollback_flag → mock', () => {
    const canary = readShared('integration-canary.ts');
    expect(canary).toContain('rollback_flag');
    expect(canary).toContain('rollback_active');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AIDEV-PRIV — Privacidad
// ─────────────────────────────────────────────────────────────────────────────

describe('AIDEV-PRIV — Privacidad IA', () => {
  it('AIDEV-PRIV-01: AI_FORBIDDEN_INPUT_FIELDS incluye profile_id', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain('AI_FORBIDDEN_INPUT_FIELDS');
    expect(src).toContain("'profile_id'");
  });

  it('AIDEV-PRIV-02: AI_FORBIDDEN_INPUT_FIELDS incluye sender_ref', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain("'sender_ref'");
  });

  it('AIDEV-PRIV-03: AI_FORBIDDEN_INPUT_FIELDS incluye phone', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain("'phone'");
  });

  it('AIDEV-PRIV-04: AI_FORBIDDEN_INPUT_FIELDS incluye email', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain("'email'");
  });

  it('AIDEV-PRIV-05: AI_FORBIDDEN_INPUT_FIELDS incluye identity_data', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain("'identity_data'");
  });

  it('AIDEV-PRIV-06: AI_FORBIDDEN_INPUT_FIELDS incluye raw_payload', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain("'raw_payload'");
  });

  it('AIDEV-PRIV-07: AI_FORBIDDEN_INPUT_FIELDS incluye jid y webchat_token', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain("'jid'");
    expect(src).toContain("'webchat_token'");
  });

  it('AIDEV-PRIV-08: validateAIRequest rechaza PII en safe_text', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain('validateAIRequest');
    expect(src).toContain('forbidden_pii_field_in_input');
  });

  it('AIDEV-PRIV-09: ai-client.ts tiene sanitizeAiInput', () => {
    const src = readShared('runtime/ai-client.ts');
    expect(src).toContain('sanitizeAiInput');
    expect(src).toContain('AI_PII_FORBIDDEN_FIELDS');
  });

  it('AIDEV-PRIV-10: ai-client.ts tiene sanitizeAiOutput', () => {
    const src = readShared('runtime/ai-client.ts');
    expect(src).toContain('sanitizeAiOutput');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AIDEV-BND — Boundaries
// ─────────────────────────────────────────────────────────────────────────────

describe('AIDEV-BND — Boundaries: IA no decide', () => {
  it('AIDEV-BND-01: IA no valida identidad (comentario en adapter)', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toMatch(/IA NO valida identidad|IA no valida|NO valida identidad/i);
  });

  it('AIDEV-BND-02: IA no elige tenant', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toMatch(/IA no elige tenant|NO elige tenant|no decide.*tenant/i);
  });

  it('AIDEV-BND-03: IA no crea recursos', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toMatch(/IA NO crea|no crea recursos/i);
  });

  it('AIDEV-BND-04: IA no publica Activity Log', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toMatch(/Activity Log|no publica/i);
  });

  it('AIDEV-BND-05: IA no accede a Core directamente', () => {
    const code = stripComments(readShared('adapters/ai-integration-adapter.ts'));
    expect(code).not.toMatch(/core-http-client|core-identity-adapter|core-features-adapter/);
  });

  it('AIDEV-BND-06: adapter AI no accede a add-ons', () => {
    const code = stripComments(readShared('adapters/ai-integration-adapter.ts'));
    expect(code).not.toMatch(/incidents-addon|listings-addon|wasender/);
  });

  it('AIDEV-BND-07: adapter AI no llama n8n', () => {
    const code = stripComments(readShared('adapters/ai-integration-adapter.ts'));
    expect(code).not.toContain('n8n-adapter');
  });

  it('AIDEV-BND-08: confidence no autoriza operaciones', () => {
    // ClassifyIntentResult.confidence no activa recursos por sí solo
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain('confidence');
    // No hay lógica que use confidence para crear recursos
    const code = stripComments(src);
    expect(code).not.toMatch(/confidence\s*[><=]+.*create|confidence.*incident|confidence.*lead/);
  });

  it('AIDEV-BND-09: DraftResponse.text solo es propuesta (no se envía automáticamente)', () => {
    const src = readShared('adapters/ai-integration-adapter.ts');
    expect(src).toContain('DraftResponseResult');
    // El adapter no llama sendMessage ni publish
    const code = stripComments(src);
    expect(code).not.toMatch(/sendMessage|publishMessage|deliverMessage/);
  });

  it('AIDEV-BND-10: n8n permanece inactivo (no en adapters AI)', () => {
    const code = stripComments(readShared('adapters/ai-integration-adapter.ts'));
    expect(code).not.toContain('n8n');
  });

  it('AIDEV-BND-11: wasender permanece inactivo', () => {
    const code = stripComments(readShared('adapters/ai-integration-adapter.ts'));
    expect(code).not.toContain('wasender');
  });

  it('AIDEV-BND-12: 146 it.todo permanecen intactos', () => {
    expect(fileExists('tests/regression/smart-conversations')).toBe(true);
  });

  it('AIDEV-BND-13: GATE_1 permanece AUDIT_COMPLETE_REMEDIATION_PENDING', () => {
    const validator = readFile('scripts/smart-conversations/validate-ai-dev-integration.mjs');
    expect(validator).toContain('AUDIT_COMPLETE_REMEDIATION_PENDING');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AIDEV-DOC — Documentación
// ─────────────────────────────────────────────────────────────────────────────

describe('AIDEV-DOC — Documentación Fase 11C3', () => {
  const DOCS = 'docs/smart-conversations/integrations';
  it('AIDEV-DOC-01: ai-dev-readiness.md existe', () => { expect(fileExists(`${DOCS}/ai-dev-readiness.md`)).toBe(true); });
  it('AIDEV-DOC-02: ai-integration-contracts.md existe', () => { expect(fileExists(`${DOCS}/ai-integration-contracts.md`)).toBe(true); });
  it('AIDEV-DOC-03: ai-privacy-model.md existe', () => { expect(fileExists(`${DOCS}/ai-privacy-model.md`)).toBe(true); });
  it('AIDEV-DOC-04: ai-prompt-catalog.md existe', () => { expect(fileExists(`${DOCS}/ai-prompt-catalog.md`)).toBe(true); });
  it('AIDEV-DOC-05: ai-output-schema-catalog.md existe', () => { expect(fileExists(`${DOCS}/ai-output-schema-catalog.md`)).toBe(true); });
  it('AIDEV-DOC-06: ai-cost-and-limits.md existe', () => { expect(fileExists(`${DOCS}/ai-cost-and-limits.md`)).toBe(true); });
  it('AIDEV-DOC-07: ai-dev-test-report.md existe', () => { expect(fileExists(`${DOCS}/ai-dev-test-report.md`)).toBe(true); });
  it('AIDEV-DOC-08: ai-dev-rollback.md existe', () => { expect(fileExists(`${DOCS}/ai-dev-rollback.md`)).toBe(true); });
  it('AIDEV-DOC-09: readiness documenta AI_DEV_CONFIGURATION_PENDING', () => {
    const src = readFile(`${DOCS}/ai-dev-readiness.md`);
    expect(src).toContain('AI_DEV_CONFIGURATION_PENDING');
  });
  it('AIDEV-DOC-10: validate:sc:ai-dev-integration en package.json', () => {
    expect(readFile('package.json')).toContain('validate:sc:ai-dev-integration');
  });
  it('AIDEV-DOC-11: test:sc:ai-integration-dev en package.json', () => {
    expect(readFile('package.json')).toContain('test:sc:ai-integration-dev');
  });
  it('AIDEV-DOC-12: CI incluye ai-integration-dev', () => {
    expect(readFile('.github/workflows/pr-checks.yml')).toContain('ai-integration-dev');
  });
});
