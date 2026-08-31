/**
 * smoke-n8n-dev.mjs — Fase 11C4 (agregado)
 * Ejecuta todos los checks de la integración n8n DEV en 19 pasos offline.
 * Uso: node scripts/smart-conversations/smoke/smoke-n8n-dev.mjs
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../');
const SHARED = 'supabase/functions/_shared/smart-conversations';

let passed = 0;
let failed = 0;
let stepNum = 0;

function step(label, fn) {
  stepNum++;
  try {
    fn();
    console.log(`  [${stepNum.toString().padStart(2, '0')}] ✅ ${label}`);
    passed++;
  } catch (e) {
    console.log(`  [${stepNum.toString().padStart(2, '0')}] ❌ ${label}: ${e.message}`);
    failed++;
  }
}

function exists(rel) {
  if (!fs.existsSync(path.join(ROOT, rel))) throw new Error(`No existe: ${rel}`);
}

function src(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function contains(rel, str) {
  if (!src(rel).includes(str)) throw new Error(`"${str}" ausente en ${rel}`);
}

console.log('\n=== smoke-n8n-dev.mjs — Fase 11C4 (19 pasos) ===\n');

// 1. Infraestructura
step('adapter, registry y port existen', () => {
  exists(`${SHARED}/adapters/n8n-adapter.ts`);
  exists(`${SHARED}/n8n-workflow-registry.ts`);
  exists(`${SHARED}/orchestration-port.ts`);
});

// 2. 6 workflows registrados
step('6 workflows en registry (WF-10/20/30/40/91/92)', () => {
  const r = src(`${SHARED}/n8n-workflow-registry.ts`);
  ['wf10.routing', 'wf20.incidents', 'wf30.listings', 'wf40.help', 'wf91.wa_out', 'wf92.webchat_out']
    .forEach(c => { if (!r.includes(`'${c}'`)) throw new Error(`${c} ausente`); });
});

// 3. WF02 prohibido
step('WF-02 explícitamente prohibido', () => {
  contains(`${SHARED}/n8n-workflow-registry.ts`, 'WF02_PROHIBITED');
  const r = src(`${SHARED}/n8n-workflow-registry.ts`);
  if (r.includes("'wf02.")) throw new Error('wf02 presente en registry');
});

// 4. Shadow solo para no mutables
step('Shadow solo para WF-10 y WF-40', () => {
  const r = src(`${SHARED}/n8n-workflow-registry.ts`);
  if (!/wf10\.routing[\s\S]{0,500}shadow_allowed:\s+true/.test(r)) throw new Error('wf10 shadow no true');
  if (!/wf40\.help[\s\S]{0,500}shadow_allowed:\s+true/.test(r)) throw new Error('wf40 shadow no true');
  if (!/wf20\.incidents[\s\S]{0,500}shadow_allowed:\s+false/.test(r)) throw new Error('wf20 shadow no false');
});

// 5. Sin PII en adapter
step('Sin PII como credencial en adapter (profile_id, identity_data, service_role_key)', () => {
  const a = src(`${SHARED}/adapters/n8n-adapter.ts`)
    .replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
  // service_role puede aparecer en FORBIDDEN_FIELDS (correcto), pero no como credencial
  ['profile_id:', 'identity_data:', 'SUPABASE_SERVICE_ROLE_KEY', 'service_role_key', 'supabase.from('].forEach(f => {
    if (a.includes(f)) throw new Error(`"${f}" en adapter`);
  });
});

// 6. Circuit breaker
step('checkCircuit y recordFailure en adapter', () => {
  contains(`${SHARED}/adapters/n8n-adapter.ts`, 'checkCircuit');
  contains(`${SHARED}/adapters/n8n-adapter.ts`, 'recordFailure');
});

// 7. AbortSignal.timeout
step('AbortSignal.timeout en adapter (no cuelga)', () => {
  contains(`${SHARED}/adapters/n8n-adapter.ts`, 'AbortSignal.timeout');
});

// 8. Canary n8n declarado
step('Canary n8n con tenant DEV-A', () => {
  const c = src(`${SHARED}/integration-canary.ts`);
  if (!c.includes("'n8n'") && !c.includes('"n8n"')) throw new Error('n8n no en canary');
  if (!c.includes('dev-tenant-a-00000000-0000-0000-0000-000000000001')) throw new Error('tenant DEV-A ausente');
});

// 9. rollback_flag: false
step('rollback_flag: false (no activo en DEV inicial)', () => {
  if (!/rollback_flag:\s*false/.test(src(`${SHARED}/integration-canary.ts`))) throw new Error('rollback_flag no false');
});

// 10. CALLBACK_REPLAY_WINDOW_MS
step('Anti-replay window declarada en orchestration-port', () => {
  contains(`${SHARED}/orchestration-port.ts`, 'CALLBACK_REPLAY_WINDOW_MS');
});

// 11. ALLOWED_ACTION_TARGETS
step('ALLOWED_ACTION_TARGETS en orchestration-port', () => {
  contains(`${SHARED}/orchestration-port.ts`, 'ALLOWED_ACTION_TARGETS');
});

// 12. N8N_SERVICE_TOKEN en adapter (no hardcodeado)
step('N8N_SERVICE_TOKEN: referenciado, no hardcodeado', () => {
  const a = src(`${SHARED}/adapters/n8n-adapter.ts`);
  if (!a.includes('N8N_SERVICE_TOKEN')) throw new Error('N8N_SERVICE_TOKEN no referenciado');
  if (/Bearer [a-zA-Z0-9+/]{20,}/.test(a)) throw new Error('token hardcodeado');
});

// 13. 4 suites de test
step('4 suites de test n8n-integration-dev', () => {
  const dir = 'tests/regression/smart-conversations/suites/n8n-integration-dev';
  ['n8n-integration-dev.spec.ts', 'n8n-integration-dev-runtime.spec.ts',
   'n8n-integration-dev-contracts.spec.ts', 'n8n-integration-dev-adversarial.spec.ts']
    .forEach(s => exists(`${dir}/${s}`));
});

// 14. 9 documentos
step('9 documentos n8n en docs/integrations/', () => {
  const d = 'docs/smart-conversations/integrations';
  ['n8n-dev-readiness.md', 'n8n-integration-contracts.md', 'n8n-workflow-registry.md',
   'n8n-authentication-model.md', 'n8n-callback-contract.md', 'n8n-privacy-retention-model.md',
   'n8n-node-allowlist.md', 'n8n-dev-test-report.md', 'n8n-dev-rollback.md']
    .forEach(doc => exists(`${d}/${doc}`));
});

// 15. Scripts smoke individuales
step('7 smokes individuales + 1 agregado', () => {
  const sd = 'scripts/smart-conversations/smoke';
  ['smoke-n8n-health.mjs', 'smoke-n8n-wf10.mjs', 'smoke-n8n-wf20.mjs', 'smoke-n8n-wf30.mjs',
   'smoke-n8n-wf40.mjs', 'smoke-n8n-wf91.mjs', 'smoke-n8n-wf92.mjs', 'smoke-n8n-dev.mjs']
    .forEach(s => exists(`${sd}/${s}`));
});

// 16. Scripts npm en package.json
step('Scripts npm n8n en package.json', () => {
  const pkg = src('package.json');
  ['test:sc:n8n-integration-dev', 'validate:sc:n8n-dev-integration', 'test:smoke:dev:n8n']
    .forEach(s => { if (!pkg.includes(`"${s}"`)) throw new Error(`Script "${s}" ausente`); });
});

// 17. CI actualizado
step('CI incluye n8n-integration-dev', () => {
  contains('.github/workflows/pr-checks.yml', 'n8n-integration-dev');
});

// 18. Sin instancia DEV real (DEV_CONFIGURATION_PENDING esperado)
step('N8N_WEBHOOK_BASE_URL: ausente → modo offline esperado', () => {
  const hasUrl = !!process.env['N8N_WEBHOOK_BASE_URL'];
  if (hasUrl) throw new Error('N8N_WEBHOOK_BASE_URL configurada → salir de smoke offline');
  // Ausente es el estado correcto para la Fase 11C4
});

// 19. Validador existe
step('validate-n8n-dev-integration.mjs existe', () => {
  exists('scripts/smart-conversations/validate-n8n-dev-integration.mjs');
});

console.log(`\n=== ${passed}/19 pasos OK / ${failed} FAIL ===`);

const state = failed === 0
  ? 'N8N_INTEGRATION_OFFLINE_READY_DEV_PENDING'
  : 'N8N_SMOKE_DEGRADED';

console.log(`Estado: ${state}`);
console.log('Siguiente paso: activar instancia n8n DEV y configurar N8N_WEBHOOK_BASE_URL\n');

if (failed > 0) process.exit(1);
