/**
 * smoke-n8n-wf20.mjs — Fase 11C4
 * WF-20 Incidencias: mutable, sin shadow, retry conservador.
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

console.log('\n=== smoke-n8n-wf20.mjs — WF-20 Incidencias ===\n');

const regSrc = fs.readFileSync(path.join(ROOT, `${SHARED}/n8n-workflow-registry.ts`), 'utf8');
step('wf20.incidents registrado', () => { if (!regSrc.includes("'wf20.incidents'")) throw new Error('ausente'); });
step('mutable: true', () => { const block = regSrc.split("'wf20.incidents'").slice(1)[0]; if (!block.includes('mutable:            true')) throw new Error('mutable no es true'); });
step('shadow_allowed: false (mutable)', () => { const block = regSrc.split("'wf20.incidents'").slice(1)[0]; if (!block.includes('shadow_allowed:     false')) throw new Error('shadow no es false'); });
step('timeout 15000ms', () => { const block = regSrc.split("'wf20.incidents'").slice(1)[0]; if (!block.includes('15_000')) throw new Error('timeout no 15000'); });
step('retry max 2 (MUTABLE_RETRY)', () => { if (!regSrc.includes('MUTABLE_RETRY') || !regSrc.includes('max_attempts: 2')) throw new Error('MUTABLE_RETRY no encontrado'); });
step('no shadow en enabled_modes', () => { const block = regSrc.split("'wf20.incidents'").slice(1)[0]; const modesMatch = block.match(/enabled_modes:\s+\[([^\]]+)\]/); if (modesMatch && modesMatch[1].includes("'shadow'")) throw new Error('shadow en enabled_modes de wf20'); });
step('caller: conv-core-create-incident', () => { if (!regSrc.includes('conv-core-create-incident')) throw new Error('caller no declarado'); });

console.log(`\n=== ${passed} OK / ${failed} FAIL ===`);
console.log(`Estado: ${failed === 0 ? 'WF20_OFFLINE_READY' : 'WF20_CONFIG_ERROR'}\n`);
if (failed > 0) process.exit(1);
