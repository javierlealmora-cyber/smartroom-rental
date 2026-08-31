/**
 * smoke-n8n-wf10.mjs — Fase 11C4
 * WF-10 Routing: verifica registro, shadow eligibility y mock mode.
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

console.log('\n=== smoke-n8n-wf10.mjs — WF-10 Routing ===\n');

const regSrc = fs.readFileSync(path.join(ROOT, `${SHARED}/n8n-workflow-registry.ts`), 'utf8');
step('wf10.routing registrado', () => { if (!regSrc.includes("'wf10.routing'")) throw new Error('wf10.routing no en registry'); });
step('mutable: false', () => { const block = regSrc.split("'wf10.routing'").slice(1)[0]; if (!block.includes('mutable:            false')) throw new Error('mutable no es false'); });
step('shadow_allowed: true', () => { const block = regSrc.split("'wf10.routing'").slice(1)[0]; if (!block.includes('shadow_allowed:     true')) throw new Error('shadow_allowed no es true'); });
step('timeout 10000ms', () => { const block = regSrc.split("'wf10.routing'").slice(1)[0]; if (!block.includes('10_000')) throw new Error('timeout no 10000'); });
step('retry max 3 (READ_RETRY)', () => { if (!regSrc.includes('READ_RETRY') || !regSrc.includes('max_attempts: 3')) throw new Error('READ_RETRY no encontrado'); });
step('enabled_modes incluye shadow', () => { const block = regSrc.split("'wf10.routing'").slice(1)[0]; if (!block.includes("'shadow'")) throw new Error('shadow no en enabled_modes'); });
step('allowed_callers declarados', () => { if (!regSrc.includes('conv-routing-engine')) throw new Error('callers no declarados'); });

console.log(`\n=== ${passed} OK / ${failed} FAIL ===`);
const state = failed === 0 ? 'WF10_OFFLINE_READY' : 'WF10_CONFIG_ERROR';
console.log(`Estado: ${state}\n`);
if (failed > 0) process.exit(1);
