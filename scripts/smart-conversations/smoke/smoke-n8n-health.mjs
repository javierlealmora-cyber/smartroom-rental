/**
 * smoke-n8n-health.mjs — Fase 11C4
 * Verifica el estado de salud de la integración n8n (offline).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../');
const SHARED = 'supabase/functions/_shared/smart-conversations';

let passed = 0;
let failed = 0;

function step(label, fn) {
  try {
    fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${label}: ${e.message}`);
    failed++;
  }
}

function existsFile(rel) {
  if (!fs.existsSync(path.join(ROOT, rel))) throw new Error(`No existe: ${rel}`);
}

function containsStr(rel, str) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  if (!src.includes(str)) throw new Error(`"${str}" no encontrado en ${rel}`);
}

console.log('\n=== smoke-n8n-health.mjs — n8n DEV Health ===\n');

step('adapter existe', () => existsFile(`${SHARED}/adapters/n8n-adapter.ts`));
step('registry existe', () => existsFile(`${SHARED}/n8n-workflow-registry.ts`));
step('orchestration-port existe', () => existsFile(`${SHARED}/orchestration-port.ts`));
step('integration-canary existe', () => existsFile(`${SHARED}/integration-canary.ts`));
step('6 workflows en registry', () => {
  const src = fs.readFileSync(path.join(ROOT, `${SHARED}/n8n-workflow-registry.ts`), 'utf8');
  const codes = ['wf10.routing', 'wf20.incidents', 'wf30.listings', 'wf40.help', 'wf91.wa_out', 'wf92.webchat_out'];
  codes.forEach(c => { if (!src.includes(c)) throw new Error(`${c} ausente`); });
});
step('WF02_PROHIBITED declarado', () => containsStr(`${SHARED}/n8n-workflow-registry.ts`, 'WF02_PROHIBITED'));
step('circuit breaker en adapter', () => containsStr(`${SHARED}/adapters/n8n-adapter.ts`, 'checkCircuit'));
step('canary n8n declarado', () => {
  const src = fs.readFileSync(path.join(ROOT, `${SHARED}/integration-canary.ts`), 'utf8');
  if (!src.includes("'n8n'") && !src.includes('"n8n"')) throw new Error('n8n no en canary');
});

console.log(`\n=== ${passed} OK / ${failed} FAIL ===`);
const state = failed === 0 ? 'N8N_INTEGRATION_OFFLINE_READY' : 'N8N_HEALTH_DEGRADED';
console.log(`Estado: ${state}\n`);
if (failed > 0) process.exit(1);
