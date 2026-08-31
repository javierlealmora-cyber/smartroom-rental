/**
 * smoke-n8n-wf30.mjs — Fase 11C4
 * WF-30 Publicaciones: mutable, sin shadow, timeout 15s.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../');
const SHARED = 'supabase/functions/_shared/smart-conversations';

let passed = 0; let failed = 0;
function step(label, fn) {
  try { fn(); console.log(`  ✅ ${label}`); passed++; }
  catch (e) { console.log(`  ❌ ${label}: ${e.message}`); failed++; }
}

console.log('\n=== smoke-n8n-wf30.mjs — WF-30 Publicaciones ===\n');

const regSrc = fs.readFileSync(path.join(ROOT, `${SHARED}/n8n-workflow-registry.ts`), 'utf8');
step('wf30.listings registrado', () => { if (!regSrc.includes("'wf30.listings'")) throw new Error('ausente'); });
step('mutable: true', () => { const block = regSrc.split("'wf30.listings'").slice(1)[0]; if (!block.includes('mutable:            true')) throw new Error('no mutable'); });
step('shadow_allowed: false', () => { const block = regSrc.split("'wf30.listings'").slice(1)[0]; if (!block.includes('shadow_allowed:     false')) throw new Error('shadow no false'); });
step('timeout 15000ms', () => { const block = regSrc.split("'wf30.listings'").slice(1)[0]; if (!block.includes('15_000')) throw new Error('timeout no 15000'); });
step('MUTABLE_RETRY aplicado', () => { if (!regSrc.includes('MUTABLE_RETRY')) throw new Error('MUTABLE_RETRY no encontrado'); });
step('callers: conv-core-query-listings y conv-core-create-lead', () => {
  if (!regSrc.includes('conv-core-query-listings') || !regSrc.includes('conv-core-create-lead')) throw new Error('callers ausentes');
});
step('canary_allowed: true', () => { const block = regSrc.split("'wf30.listings'").slice(1)[0]; if (!block.includes('canary_allowed:     true')) throw new Error('canary no true'); });

console.log(`\n=== ${passed} OK / ${failed} FAIL ===`);
console.log(`Estado: ${failed === 0 ? 'WF30_OFFLINE_READY' : 'WF30_CONFIG_ERROR'}\n`);
if (failed > 0) process.exit(1);
