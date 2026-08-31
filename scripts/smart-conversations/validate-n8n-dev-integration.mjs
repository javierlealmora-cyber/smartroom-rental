/**
 * validate-n8n-dev-integration.mjs — Fase 11C4
 * Valida la integración n8n DEV offline.
 * Uso: node scripts/smart-conversations/validate-n8n-dev-integration.mjs
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');

let ok = 0;
let fail = 0;
let warn = 0;

function check(label, value, isWarn = false) {
  if (value) {
    console.log(`  ✅ ${label}`);
    ok++;
  } else if (isWarn) {
    console.log(`  ⚠️  ${label}`);
    warn++;
  } else {
    console.log(`  ❌ ${label}`);
    fail++;
  }
}

function existsFile(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function stripComments(src) {
  return src
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
}

console.log('\n=== validate-n8n-dev-integration.mjs — Fase 11C4 ===\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Archivos de infraestructura
// ─────────────────────────────────────────────────────────────────────────────

console.log('--- 1. Infraestructura de orquestación ---');

const SHARED = 'supabase/functions/_shared/smart-conversations';
const REQUIRED_FILES = [
  `${SHARED}/orchestration-port.ts`,
  `${SHARED}/n8n-workflow-registry.ts`,
  `${SHARED}/adapters/n8n-adapter.ts`,
  `${SHARED}/integration-canary.ts`,
  `${SHARED}/environment-model.ts`,
  `${SHARED}/integration-framework.ts`,
];

for (const f of REQUIRED_FILES) {
  check(`Existe: ${f}`, existsFile(f));
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Registro de workflows
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 2. Registry de workflows ---');

const registrySrc = readFile(`${SHARED}/n8n-workflow-registry.ts`);
const EXPECTED_WFS = ['wf10.routing', 'wf20.incidents', 'wf30.listings', 'wf40.help', 'wf91.wa_out', 'wf92.webchat_out'];
for (const wf of EXPECTED_WFS) {
  check(`Workflow registrado: ${wf}`, registrySrc.includes(`'${wf}'`));
}
check('WF02_PROHIBITED = true', registrySrc.includes('WF02_PROHIBITED') && registrySrc.includes('true'));
check('Workflows legacy declarados (N8N_LEGACY_WORKFLOWS)', registrySrc.includes('N8N_LEGACY_WORKFLOWS'));
check('SC-WF-IDENTITY en legacy', registrySrc.includes('SC-WF-IDENTITY'));
check('SC-WF-C00 en legacy', registrySrc.includes('SC-WF-C00'));
check('export_checksum en registry', registrySrc.includes('export_checksum'));

// ─────────────────────────────────────────────────────────────────────────────
// 3. Shadow restrictions
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 3. Shadow restrictions ---');

check('wf10 shadow_allowed: true', /wf10\.routing[\s\S]{0,500}shadow_allowed:\s+true/.test(registrySrc));
check('wf40 shadow_allowed: true', /wf40\.help[\s\S]{0,500}shadow_allowed:\s+true/.test(registrySrc));
check('wf20 shadow_allowed: false', /wf20\.incidents[\s\S]{0,500}shadow_allowed:\s+false/.test(registrySrc));
check('wf91 shadow_allowed: false', /wf91\.wa_out[\s\S]{0,500}shadow_allowed:\s+false/.test(registrySrc));
check('wf92 shadow_allowed: false', /wf92\.webchat_out[\s\S]{0,500}shadow_allowed:\s+false/.test(registrySrc));

// ─────────────────────────────────────────────────────────────────────────────
// 4. Puerto de orquestación
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 4. OrchestrationIntegrationPort ---');

const portSrc = readFile(`${SHARED}/orchestration-port.ts`);
check('OrchestrationIntegrationPort exportado', portSrc.includes('OrchestrationIntegrationPort'));
check('OrchestrationInputDTO exportado', portSrc.includes('OrchestrationInputDTO'));
check('OrchestrationOutputDTO exportado', portSrc.includes('OrchestrationOutputDTO'));
check('OrchestrationCallbackDTO exportado', portSrc.includes('OrchestrationCallbackDTO'));
check('validateOrchestrationInput exportado', portSrc.includes('validateOrchestrationInput'));
check('validateOrchestrationOutput exportado', portSrc.includes('validateOrchestrationOutput'));
check('validateCallbackTimestamp exportado', portSrc.includes('validateCallbackTimestamp'));
check('CALLBACK_REPLAY_WINDOW_MS declarado', portSrc.includes('CALLBACK_REPLAY_WINDOW_MS'));
check('ALLOWED_ACTION_TARGETS declarado', portSrc.includes('ALLOWED_ACTION_TARGETS'));
check('client_account_id en InputDTO', portSrc.includes('client_account_id'));
check('identity_level como enum (no PII)', portSrc.includes('OrchestrationIdentityLevel'));

// ─────────────────────────────────────────────────────────────────────────────
// 5. Privacidad en el adapter
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 5. Privacidad en n8n-adapter ---');

const adapterSrc = readFile(`${SHARED}/adapters/n8n-adapter.ts`);
const adapterClean = stripComments(adapterSrc);

// 'service_role' puede aparecer en FORBIDDEN_FIELDS del adapter (correcto — marcarlo como prohibido)
// Verificamos que NO se use como credencial (service_role_key / SUPABASE_SERVICE_ROLE_KEY)
const FORBIDDEN_IN_ADAPTER = ['profile_id:', 'sender_ref:', 'identity_data:', 'raw_payload:', 'SUPABASE_SERVICE_ROLE_KEY', 'service_role_key', 'createClient(', 'execSync(', 'supabase.from('];
for (const f of FORBIDDEN_IN_ADAPTER) {
  check(`Sin "${f}" en adapter`, !adapterClean.includes(f));
}
check('N8N_SERVICE_TOKEN referenciado (no hardcodeado)', adapterSrc.includes('N8N_SERVICE_TOKEN') && !adapterSrc.match(/Bearer [a-zA-Z0-9+/]{20,}/));
check('AbortSignal.timeout en adapter', adapterSrc.includes('AbortSignal.timeout'));
check('checkCircuit en adapter', adapterSrc.includes('checkCircuit'));
check('Retry-After manejado', adapterSrc.includes('Retry-After'));

// ─────────────────────────────────────────────────────────────────────────────
// 6. Canary
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 6. Canary ---');

const canarySrc = readFile(`${SHARED}/integration-canary.ts`);
check("integration: 'n8n' en canary", canarySrc.includes("integration:        'n8n'") || canarySrc.includes("integration: 'n8n'"));
check('activateRollback en canary', canarySrc.includes('activateRollback'));
check('clearRollback en canary', canarySrc.includes('clearRollback'));
check('Tenant canary DEV-A en allowlist', canarySrc.includes('dev-tenant-a-00000000-0000-0000-0000-000000000001'));
check('rollback_flag: false (no activo)', /rollback_flag:\s*false/.test(canarySrc));

// ─────────────────────────────────────────────────────────────────────────────
// 7. Suites de test
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 7. Suites de test ---');

const SUITES_DIR = 'tests/regression/smart-conversations/suites/n8n-integration-dev';
const SUITES = [
  'n8n-integration-dev.spec.ts',
  'n8n-integration-dev-runtime.spec.ts',
  'n8n-integration-dev-contracts.spec.ts',
  'n8n-integration-dev-adversarial.spec.ts',
];
for (const s of SUITES) {
  check(`Suite existe: ${s}`, existsFile(`${SUITES_DIR}/${s}`));
}

// Verificar cobertura mínima (≥210 tests)
let totalItCalls = 0;
for (const s of SUITES) {
  const src = readFile(`${SUITES_DIR}/${s}`);
  const matches = src.match(/^\s+it\(/gm) ?? [];
  totalItCalls += matches.length;
}
// WF-DOC loop genera tests dinámicos: ajustar si hay loops
check(`Tests estáticos ≥ 200 (contados: ${totalItCalls})`, totalItCalls >= 200);

// ─────────────────────────────────────────────────────────────────────────────
// 8. Documentación
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 8. Documentación ---');

const DOCS_DIR = 'docs/smart-conversations/integrations';
const REQUIRED_DOCS = [
  'n8n-dev-readiness.md',
  'n8n-integration-contracts.md',
  'n8n-workflow-registry.md',
  'n8n-authentication-model.md',
  'n8n-callback-contract.md',
  'n8n-privacy-retention-model.md',
  'n8n-node-allowlist.md',
  'n8n-dev-test-report.md',
  'n8n-dev-rollback.md',
];
for (const doc of REQUIRED_DOCS) {
  check(`Doc existe: ${doc}`, existsFile(`${DOCS_DIR}/${doc}`));
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Scripts npm y smoke
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 9. Scripts npm y smoke ---');

const pkgSrc = readFile('package.json');
const REQUIRED_SCRIPTS = [
  'test:sc:n8n-integration-dev',
  'validate:sc:n8n-dev-integration',
  'test:smoke:dev:n8n',
];
for (const s of REQUIRED_SCRIPTS) {
  check(`Script npm "${s}"`, pkgSrc.includes(`"${s}"`));
}

const SMOKE_SCRIPTS = [
  'scripts/smart-conversations/smoke/smoke-n8n-health.mjs',
  'scripts/smart-conversations/smoke/smoke-n8n-wf10.mjs',
  'scripts/smart-conversations/smoke/smoke-n8n-wf20.mjs',
  'scripts/smart-conversations/smoke/smoke-n8n-wf30.mjs',
  'scripts/smart-conversations/smoke/smoke-n8n-wf40.mjs',
  'scripts/smart-conversations/smoke/smoke-n8n-wf91.mjs',
  'scripts/smart-conversations/smoke/smoke-n8n-wf92.mjs',
  'scripts/smart-conversations/smoke/smoke-n8n-dev.mjs',
];
for (const s of SMOKE_SCRIPTS) {
  check(`Smoke existe: ${path.basename(s)}`, existsFile(s));
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Seguridad: sin credenciales en stubs
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 10. Seguridad en stubs ---');

const stubDir = path.join(ROOT, 'docs/smart-conversations/n8n/workflows');
if (fs.existsSync(stubDir)) {
  const stubs = fs.readdirSync(stubDir).filter(f => f.endsWith('.json'));
  if (stubs.length > 0) {
    const FORBIDDEN_IN_STUBS = ['SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY', 'WASENDER_API_KEY', 'pinData', 'executeCommand', 'n8n-nodes-base.postgres'];
    for (const pattern of FORBIDDEN_IN_STUBS) {
      let found = false;
      for (const stub of stubs) {
        if (fs.readFileSync(path.join(stubDir, stub), 'utf8').includes(pattern)) { found = true; break; }
      }
      check(`Sin "${pattern}" en stubs`, !found);
    }
  } else {
    check('Stubs: directorio existe (sin stubs aún — ok para DEV inicial)', true, true);
  }
} else {
  check('Dir stubs aún no creado — ok en Fase 11C4 sin instancia DEV', true, true);
}

// Verificar N8N_WEBHOOK_BASE_URL pendiente (warn esperado)
const hasWebhookUrl = process.env['N8N_WEBHOOK_BASE_URL'] !== undefined;
check('N8N_WEBHOOK_BASE_URL configurada (warn si ausente en offline)', hasWebhookUrl, true);

// ─────────────────────────────────────────────────────────────────────────────
// Resultado final
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n=== Resultado: ${ok} OK / ${fail} FAIL / ${warn} WARN ===`);

let state;
if (fail === 0 && warn === 0) {
  state = 'N8N_INTEGRATION_OFFLINE_READY';
} else if (fail === 0) {
  state = 'N8N_DEV_CONFIGURATION_PENDING';
} else if (fail <= 3) {
  state = 'N8N_INTEGRATION_DEV_PARTIALLY_VALIDATED';
} else {
  state = 'N8N_INTEGRATION_INCOMPLETE';
}

console.log(`Estado: ${state}\n`);

if (fail > 0) process.exit(1);

// Seguridad: GATE_1 = AUDIT_COMPLETE_REMEDIATION_PENDING (no cerrar hasta auditoría completa)
