/**
 * smoke-n8n-wf91.mjs — Fase 11C4
 * WF-91 WhatsApp Outbound: mutable, sin shadow, sin Wasender real.
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

console.log('\n=== smoke-n8n-wf91.mjs — WF-91 WA Outbound ===\n');

const regSrc = fs.readFileSync(path.join(ROOT, `${SHARED}/n8n-workflow-registry.ts`), 'utf8');
const adpSrc = fs.readFileSync(path.join(ROOT, `${SHARED}/adapters/n8n-adapter.ts`), 'utf8');
const adpClean = adpSrc.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');

step('wf91.wa_out registrado', () => { if (!regSrc.includes("'wf91.wa_out'")) throw new Error('ausente'); });
step('mutable: true', () => { const block = regSrc.split("'wf91.wa_out'").slice(1)[0]; if (!block.includes('mutable:            true')) throw new Error('no mutable'); });
step('shadow_allowed: false (outbound mutable)', () => { const block = regSrc.split("'wf91.wa_out'").slice(1)[0]; if (!block.includes('shadow_allowed:     false')) throw new Error('shadow no false'); });
step('timeout 12000ms', () => { const block = regSrc.split("'wf91.wa_out'").slice(1)[0]; if (!block.includes('12_000')) throw new Error('timeout no 12000'); });
step('MUTABLE_RETRY aplicado', () => { if (!regSrc.includes('MUTABLE_RETRY')) throw new Error('MUTABLE_RETRY no encontrado'); });
step('caller: conv-send-wa', () => { if (!regSrc.includes('conv-send-wa')) throw new Error('caller ausente'); });
step('sin Wasender real en adapter', () => { if (adpClean.includes('WASENDER_API_KEY') || adpClean.includes('wasender.send(')) throw new Error('Wasender real en adapter'); });

console.log(`\n=== ${passed} OK / ${failed} FAIL ===`);
console.log(`Estado: ${failed === 0 ? 'WF91_OFFLINE_READY' : 'WF91_CONFIG_ERROR'}\n`);
if (failed > 0) process.exit(1);
