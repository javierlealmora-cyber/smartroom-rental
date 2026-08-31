/**
 * smoke-n8n-wf92.mjs — Fase 11C4
 * WF-92 WebChat Outbound: mutable, sin shadow, sin Realtime real.
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

console.log('\n=== smoke-n8n-wf92.mjs — WF-92 WebChat Outbound ===\n');

const regSrc = fs.readFileSync(path.join(ROOT, `${SHARED}/n8n-workflow-registry.ts`), 'utf8');
const adpSrc = fs.readFileSync(path.join(ROOT, `${SHARED}/adapters/n8n-adapter.ts`), 'utf8');
const adpClean = adpSrc.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');

step('wf92.webchat_out registrado', () => { if (!regSrc.includes("'wf92.webchat_out'")) throw new Error('ausente'); });
step('mutable: true', () => { const block = regSrc.split("'wf92.webchat_out'").slice(1)[0]; if (!block.includes('mutable:            true')) throw new Error('no mutable'); });
step('shadow_allowed: false', () => { const block = regSrc.split("'wf92.webchat_out'").slice(1)[0]; if (!block.includes('shadow_allowed:     false')) throw new Error('shadow no false'); });
step('timeout 10000ms', () => { const block = regSrc.split("'wf92.webchat_out'").slice(1)[0]; if (!block.includes('10_000')) throw new Error('timeout no 10000'); });
step('MUTABLE_RETRY aplicado', () => { if (!regSrc.includes('MUTABLE_RETRY')) throw new Error('MUTABLE_RETRY no encontrado'); });
step('caller: conv-web-deliver', () => { if (!regSrc.includes('conv-web-deliver')) throw new Error('caller ausente'); });
step('sin Realtime real en adapter', () => { if (adpClean.includes('supabase.channel(') || adpClean.includes('realtime.publish(')) throw new Error('Realtime real en adapter'); });

console.log(`\n=== ${passed} OK / ${failed} FAIL ===`);
console.log(`Estado: ${failed === 0 ? 'WF92_OFFLINE_READY' : 'WF92_CONFIG_ERROR'}\n`);
if (failed > 0) process.exit(1);
