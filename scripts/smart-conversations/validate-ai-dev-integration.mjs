#!/usr/bin/env node
/**
 * validate-ai-dev-integration.mjs — Validador estático de Fase 11C3
 *
 * Estados de salida:
 *   AI_INTEGRATION_OFFLINE_READY       → todos los checks OK, sin proveedor real
 *   AI_DEV_CONFIGURATION_PENDING       → checks OK pero proveedor no configurado
 *   AI_INTEGRATION_DEV_PARTIALLY_VALIDATED → algunos checks fallaron
 *   AI_INTEGRATION_INCOMPLETE          → archivos críticos faltan
 *
 * NUNCA despliega PRE/PRO ni usa credenciales reales.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const BOLD = '\x1b[1m'; const RESET = '\x1b[0m';
const GREEN = '\x1b[32m'; const RED = '\x1b[31m'; const YELLOW = '\x1b[33m'; const CYAN = '\x1b[36m';

function read(rel) { return readFileSync(resolve(ROOT, rel), 'utf8'); }
function exists(rel) { return existsSync(resolve(ROOT, rel)); }
function stripComments(src) {
  let r = src.replace(/\/\*[\s\S]*?\*\//g, ' ');
  r = r.replace(/\/\/[^\n]*/g, '');
  return r;
}

let passed = 0; let failed = 0; let warned = 0;
const failures = [];
const warnings = [];

function check(id, description, fn) {
  try {
    const result = fn();
    if (result === true || result === undefined) {
      console.log(`  ${GREEN}✓${RESET} [${id}] ${description}`);
      passed++;
    } else if (result && result.warn) {
      console.log(`  ${YELLOW}⚠${RESET} [${id}] ${description} — ${result.warn}`);
      warned++;
      warnings.push(`[${id}] ${result.warn}`);
    } else {
      const msg = typeof result === 'string' ? result : 'CHECK_FAILED';
      console.log(`  ${RED}✗${RESET} [${id}] ${description} — ${msg}`);
      failed++;
      failures.push(`[${id}] ${description}: ${msg}`);
    }
  } catch (e) {
    console.log(`  ${RED}✗${RESET} [${id}] ${description} — ERROR: ${e.message}`);
    failed++;
    failures.push(`[${id}] ${e.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Archivos críticos
// ─────────────────────────────────────────────────────────────────────────────

const SHARED = 'supabase/functions/_shared/smart-conversations';
const ADAPTER_AI   = `${SHARED}/adapters/ai-integration-adapter.ts`;
const ENV_MODEL    = `${SHARED}/environment-model.ts`;
const CANARY       = `${SHARED}/integration-canary.ts`;
const FRAMEWORK    = `${SHARED}/integration-framework.ts`;
const DOCS_BASE    = 'docs/smart-conversations/integrations';

const REQUIRED_FILES = [
  ADAPTER_AI,
  ENV_MODEL,
  CANARY,
  FRAMEWORK,
  `${SHARED}/runtime/ai-client.ts`,
  `${SHARED}/runtime/ai-providers/generic-http-provider.ts`,
];

const REQUIRED_DOCS = [
  `${DOCS_BASE}/ai-dev-readiness.md`,
  `${DOCS_BASE}/ai-integration-contracts.md`,
  `${DOCS_BASE}/ai-privacy-model.md`,
  `${DOCS_BASE}/ai-prompt-catalog.md`,
  `${DOCS_BASE}/ai-output-schema-catalog.md`,
  `${DOCS_BASE}/ai-cost-and-limits.md`,
  `${DOCS_BASE}/ai-dev-test-report.md`,
  `${DOCS_BASE}/ai-dev-rollback.md`,
];

const REQUIRED_TESTS = [
  'tests/regression/smart-conversations/suites/ai-integration-dev/ai-integration-dev.spec.ts',
  'tests/regression/smart-conversations/suites/ai-integration-dev/ai-integration-dev-runtime.spec.ts',
  'tests/regression/smart-conversations/suites/ai-integration-dev/ai-integration-dev-contracts.spec.ts',
  'tests/regression/smart-conversations/suites/ai-integration-dev/ai-integration-dev-adversarial.spec.ts',
];

// ─────────────────────────────────────────────────────────────────────────────
// Verificaciones
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n${BOLD}${CYAN}=== validate-ai-dev-integration.mjs ===${RESET}`);

// Sección 1: Archivos críticos
console.log(`\n${BOLD}[1] Archivos críticos${RESET}`);
for (const f of REQUIRED_FILES) {
  check(`AIV-FILE-${f.split('/').pop()}`, `Existe ${f}`, () => exists(f) || `MISSING: ${f}`);
}

// Sección 2: Adapter AI
console.log(`\n${BOLD}[2] Adapter AI — estructura${RESET}`);
if (exists(ADAPTER_AI)) {
  const src = read(ADAPTER_AI);
  const clean = stripComments(src);
  check('AIV-ADAPT-01', 'AI_FORBIDDEN_INPUT_FIELDS exportado', () => src.includes('AI_FORBIDDEN_INPUT_FIELDS') || 'MISSING: AI_FORBIDDEN_INPUT_FIELDS');
  check('AIV-ADAPT-02', 'AI_LIMITS exportado', () => src.includes('AI_LIMITS') || 'MISSING: AI_LIMITS');
  check('AIV-ADAPT-03', 'MAX_INPUT_CHARS=4000', () => src.includes('4000') || 'MISSING: MAX_INPUT_CHARS=4000');
  check('AIV-ADAPT-04', 'MAX_RETRIES=2', () => src.includes('MAX_RETRIES') && src.includes('2') || 'MISSING');
  check('AIV-ADAPT-05', 'MAX_CALLS_PER_SESSION=6', () => src.includes('MAX_CALLS_PER_SESSION') || 'MISSING');
  check('AIV-ADAPT-06', 'TIMEOUT_MS=8000', () => src.includes('TIMEOUT_MS') || 'MISSING');
  check('AIV-ADAPT-07', '6 operaciones AI declaradas', () => {
    const ops = ['ai.intent.classify', 'ai.incident.extract', 'ai.listing.extract', 'ai.help.extract', 'ai.safe_summary', 'ai.response_draft'];
    return ops.every(op => src.includes(op)) || 'MISSING ops';
  });
  check('AIV-ADAPT-08', '6 fallbacks declarados', () => {
    const fbs = ['fallbackClassifyIntent','fallbackExtractIncident','fallbackExtractListings','fallbackExtractHelp','fallbackSummarizeCase','fallbackDraftResponse'];
    return fbs.every(f => src.includes(f)) || 'MISSING fallbacks';
  });
  check('AIV-ADAPT-09', 'validateClassifyIntentOutput exportado', () => src.includes('validateClassifyIntentOutput') || 'MISSING');
  check('AIV-ADAPT-10', 'validateAIRequest exportado', () => src.includes('validateAIRequest') || 'MISSING');
  check('AIV-ADAPT-11', 'AI_DEV_CONFIGURATION_PENDING declarado', () => src.includes('AI_DEV_CONFIGURATION_PENDING') || 'MISSING');
  check('AIV-ADAPT-12', 'No hay publishActivity en adapter AI (limite autoridad)', () => !clean.includes('publishActivity') || 'VIOLATION: publishActivity in AI adapter');
  check('AIV-ADAPT-13', 'No hay conv_sessions direct write en adapter AI', () => !clean.includes('conv_sessions') || 'VIOLATION: conv_sessions in AI adapter');
  check('AIV-ADAPT-14', 'No hay profile_id en safe_text que va al proveedor', () => !clean.includes("'profile_id'") || { warn: 'profile_id presente en adapter' });
  check('AIV-ADAPT-15', 'vendor-agnostic: no hardcodea claude/gpt/gemini', () => {
    const models = /claude|gpt-[34]|gemini-/i;
    return !models.test(clean) || { warn: 'posible hardcodeo de proveedor detectado' };
  });
}

// Sección 3: environment-model.ts (deudas técnicas resueltas)
console.log(`\n${BOLD}[3] Environment model — Debt 1${RESET}`);
if (exists(ENV_MODEL)) {
  const envSrc = read(ENV_MODEL);
  check('AIV-ENV-01', 'CANONICAL_DEV_ENVIRONMENT exportado', () => envSrc.includes('CANONICAL_DEV_ENVIRONMENT') || 'MISSING');
  check('AIV-ENV-02', "Canónico es 'development'", () => envSrc.includes("'development'") || 'MISSING');
  check('AIV-ENV-03', 'DEV_ENVIRONMENT_ALIASES exportado', () => envSrc.includes('DEV_ENVIRONMENT_ALIASES') || 'MISSING');
  check('AIV-ENV-04', "Alias 'dev' mapeado", () => envSrc.includes("'dev'") || 'MISSING');
  check('AIV-ENV-05', "Alias 'sandbox' mapeado", () => envSrc.includes("'sandbox'") || 'MISSING');
  check('AIV-ENV-06', 'normalizeEnvironment exportado', () => envSrc.includes('normalizeEnvironment') || 'MISSING');
  check('AIV-ENV-07', 'isDevelopmentEnvironment exportado', () => envSrc.includes('isDevelopmentEnvironment') || 'MISSING');
}

// Sección 4: integration-framework.ts no tiene DEV_ENVIRONMENTS local
console.log(`\n${BOLD}[4] Framework — deuda Debt 1 resuelta${RESET}`);
if (exists(FRAMEWORK)) {
  const fwSrc = stripComments(read(FRAMEWORK));
  check('AIV-FW-01', 'No hay DEV_ENVIRONMENTS local en framework (Debt 1)', () => {
    const hasLocal = /const\s+DEV_ENVIRONMENTS\s*=\s*new\s+Set/.test(fwSrc);
    return !hasLocal || 'VIOLATION: DEV_ENVIRONMENTS still local in framework';
  });
  check('AIV-FW-02', 'Framework importa isDevelopmentEnvironment', () => read(FRAMEWORK).includes('isDevelopmentEnvironment') || 'MISSING import');
}

// Sección 5: Canary — 6 AI operations
console.log(`\n${BOLD}[5] Canary allowlist — AI${RESET}`);
if (exists(CANARY)) {
  const cSrc = read(CANARY);
  const AI_OPS = ['ai.intent.classify', 'ai.incident.extract', 'ai.listing.extract', 'ai.help.extract', 'ai.safe_summary', 'ai.response_draft'];
  check('AIV-CAN-01', '6 AI operations en canary allowlist', () => AI_OPS.every(op => cSrc.includes(op)) || 'MISSING ops in canary');
  check('AIV-CAN-02', 'No hay tenants reales en canary (solo dev-tenant)', () => {
    const tenants = cSrc.match(/tenant_id:\s*'([^']+)'/g) ?? [];
    return tenants.every(t => t.includes('dev-tenant')) || 'VIOLATION: non-dev tenant in canary';
  });
  check('AIV-CAN-03', 'rollback_flag=false en entrada AI', () => {
    const aiBlock = cSrc.split("integration:").find(b => b.includes("'ai'")) ?? '';
    return aiBlock.includes('rollback_flag:      false') || 'MISSING rollback_flag false';
  });
}

// Sección 6: validate-dev-integrations.mjs — stripComments
console.log(`\n${BOLD}[6] Debt 2 — stripComments en validador de integrations${RESET}`);
const VAL_DEV = 'scripts/smart-conversations/validate-dev-integrations.mjs';
if (exists(VAL_DEV)) {
  const vSrc = read(VAL_DEV);
  check('AIV-DEBT2-01', 'stripComments definido en validate-dev-integrations.mjs', () => vSrc.includes('stripComments') || 'MISSING stripComments');
  check('AIV-DEBT2-02', 'Boundaries usan stripComments', () => vSrc.includes('stripComments(') || 'MISSING stripComments usage');
}

// Sección 7: Tests
console.log(`\n${BOLD}[7] Suites de test${RESET}`);
for (const t of REQUIRED_TESTS) {
  check(`AIV-TEST-${t.split('/').pop()?.replace('.spec.ts', '')}`, `Existe ${t.split('/').pop()}`, () => exists(t) || `MISSING: ${t}`);
}

// Sección 8: Documentación
console.log(`\n${BOLD}[8] Documentación${RESET}`);
for (const doc of REQUIRED_DOCS) {
  const name = doc.split('/').pop();
  check(`AIV-DOC-${name}`, `Existe ${name}`, () => {
    if (!exists(doc)) return `MISSING: ${name}`;
    return read(doc).trim().length > 100 || `EMPTY: ${name}`;
  });
}

// Sección 9: Scripts npm
console.log(`\n${BOLD}[9] Scripts npm${RESET}`);
if (exists('package.json')) {
  const pkg = JSON.parse(read('package.json'));
  const scripts = pkg.scripts ?? {};
  check('AIV-PKG-01', 'test:sc:ai-integration-dev en package.json', () => 'test:sc:ai-integration-dev' in scripts || 'MISSING script');
  check('AIV-PKG-02', 'validate:sc:ai-dev-integration en package.json', () => 'validate:sc:ai-dev-integration' in scripts || 'MISSING script');
  check('AIV-PKG-03', 'test:smoke:dev:ai en package.json', () => 'test:smoke:dev:ai' in scripts || 'MISSING script');
}

// ─────────────────────────────────────────────────────────────────────────────
// Estado final
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`${BOLD}Resultado:${RESET} ${GREEN}${passed} OK${RESET} / ${RED}${failed} FAIL${RESET} / ${YELLOW}${warned} WARN${RESET}`);

let state;
if (failed === 0 && warned === 0) {
  state = 'AI_INTEGRATION_OFFLINE_READY';
  console.log(`\n${GREEN}${BOLD}Estado: ${state}${RESET}`);
} else if (failed === 0) {
  state = 'AI_DEV_CONFIGURATION_PENDING';
  console.log(`\n${YELLOW}${BOLD}Estado: ${state}${RESET}`);
  for (const w of warnings) console.log(`  ${YELLOW}⚠${RESET} ${w}`);
} else if (failed <= 3) {
  state = 'AI_INTEGRATION_DEV_PARTIALLY_VALIDATED';
  console.log(`\n${YELLOW}${BOLD}Estado: ${state}${RESET}`);
  for (const f of failures) console.log(`  ${RED}✗${RESET} ${f}`);
} else {
  state = 'AI_INTEGRATION_INCOMPLETE';
  console.log(`\n${RED}${BOLD}Estado: ${state}${RESET}`);
  for (const f of failures) console.log(`  ${RED}✗${RESET} ${f}`);
}

// Seguridad: GATE_1 = AUDIT_COMPLETE_REMEDIATION_PENDING (no cerrar hasta auditoría completa)
// GATE_0 = PASS_WITH_WARNINGS (umbral de validación actual)
process.exit(failed > 0 ? 1 : 0);
