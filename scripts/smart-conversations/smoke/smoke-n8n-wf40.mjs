/**
 * smoke-n8n-wf40.mjs — Fase 11C4
 * WF-40 Ayuda: no mutable, shadow permitido, READ_RETRY.
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

console.log('\n=== smoke-n8n-wf40.mjs — WF-40 Ayuda ===\n');

const regSrc = fs.readFileSync(path.join(ROOT, `${SHARED}/n8n-workflow-registry.ts`), 'utf8');
step('wf40.help registrado', () => { if (!regSrc.includes("'wf40.help'")) throw new Error('ausente'); });
step('mutable: false', () => { const block = regSrc.split("'wf40.help'").slice(1)[0]; if (!block.includes('mutable:            false')) throw new Error('mutable no false'); });
step('shadow_allowed: true (no mutable)', () => { const block = regSrc.split("'wf40.help'").slice(1)[0]; if (!block.includes('shadow_allowed:     true')) throw new Error('shadow no true'); });
step('timeout 10000ms', () => { const block = regSrc.split("'wf40.help'").slice(1)[0]; if (!block.includes('10_000')) throw new Error('timeout no 10000'); });
step('READ_RETRY con max_attempts 3', () => { if (!regSrc.includes('READ_RETRY') || !regSrc.includes('max_attempts: 3')) throw new Error('READ_RETRY no ok'); });
step('shadow en enabled_modes', () => { const block = regSrc.split("'wf40.help'").slice(1)[0]; if (!block.includes("'shadow'")) throw new Error('shadow no en enabled_modes'); });
step('caller: conv-core-query-help-kb', () => { if (!regSrc.includes('conv-core-query-help-kb')) throw new Error('caller ausente'); });

console.log(`\n=== ${passed} OK / ${failed} FAIL ===`);
console.log(`Estado: ${failed === 0 ? 'WF40_OFFLINE_READY' : 'WF40_CONFIG_ERROR'}\n`);
if (failed > 0) process.exit(1);
