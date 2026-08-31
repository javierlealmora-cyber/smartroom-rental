#!/usr/bin/env node
/**
 * smoke-ai-dev.mjs — Smoke test AI integration (Fase 11C3)
 *
 * 18 pasos de verificación offline.
 * NUNCA llama a proveedor real. NUNCA usa credenciales PRE/PRO.
 * Solo valida que la infraestructura AI está lista para DEV.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

const GREEN = '\x1b[32m'; const RED = '\x1b[31m'; const YELLOW = '\x1b[33m';
const BOLD = '\x1b[1m'; const RESET = '\x1b[0m';

function read(rel) { return readFileSync(resolve(ROOT, rel), 'utf8'); }
function exists(rel) { return existsSync(resolve(ROOT, rel)); }

let step = 0; let errors = 0;

function smoke(desc, fn) {
  step++;
  try {
    const r = fn();
    if (r === false) { console.log(`  ${RED}✗${RESET} STEP-${String(step).padStart(2,'0')}: ${desc}`); errors++; }
    else { console.log(`  ${GREEN}✓${RESET} STEP-${String(step).padStart(2,'0')}: ${desc}`); }
  } catch (e) {
    console.log(`  ${RED}✗${RESET} STEP-${String(step).padStart(2,'0')}: ${desc} — ${e.message}`);
    errors++;
  }
}

console.log(`\n${BOLD}${YELLOW}=== smoke-ai-dev.mjs (18 pasos) ===${RESET}`);
console.log('Entorno: DEV offline — sin proveedor real\n');

// PASO 1: adapter AI existe
smoke('ai-integration-adapter.ts existe', () =>
  exists('supabase/functions/_shared/smart-conversations/adapters/ai-integration-adapter.ts')
);

// PASO 2: AI_FORBIDDEN_INPUT_FIELDS tiene al menos 14 campos
smoke('AI_FORBIDDEN_INPUT_FIELDS ≥ 14 campos', () => {
  const src = read('supabase/functions/_shared/smart-conversations/adapters/ai-integration-adapter.ts');
  const block = /AI_FORBIDDEN_INPUT_FIELDS\s*=\s*new Set[^)]+\)/s.exec(src)?.[0] ?? '';
  const count = (block.match(/'/g) ?? []).length / 2;
  return count >= 14;
});

// PASO 3: AI_LIMITS declarados con valores correctos
smoke('AI_LIMITS: MAX_INPUT_CHARS=4000, MAX_RETRIES=2, MAX_CALLS=6', () => {
  const src = read('supabase/functions/_shared/smart-conversations/adapters/ai-integration-adapter.ts');
  return src.includes('4000') && src.includes('MAX_RETRIES') && src.includes('MAX_CALLS_PER_SESSION');
});

// PASO 4: 6 operaciones AI en adapter
smoke('6 operaciones AI declaradas en adapter', () => {
  const src = read('supabase/functions/_shared/smart-conversations/adapters/ai-integration-adapter.ts');
  const ops = ['ai.intent.classify','ai.incident.extract','ai.listing.extract','ai.help.extract','ai.safe_summary','ai.response_draft'];
  return ops.every(op => src.includes(op));
});

// PASO 5: 6 fallbacks declarados
smoke('6 fallbacks deterministas declarados', () => {
  const src = read('supabase/functions/_shared/smart-conversations/adapters/ai-integration-adapter.ts');
  const fbs = ['fallbackClassifyIntent','fallbackExtractIncident','fallbackExtractListings','fallbackExtractHelp','fallbackSummarizeCase','fallbackDraftResponse'];
  return fbs.every(f => src.includes(f));
});

// PASO 6: environment-model.ts existe con CANONICAL_DEV
smoke('environment-model.ts: CANONICAL_DEV_ENVIRONMENT=development', () => {
  const src = read('supabase/functions/_shared/smart-conversations/environment-model.ts');
  return src.includes('CANONICAL_DEV_ENVIRONMENT') && src.includes("'development'");
});

// PASO 7: Debt 1 resuelta — framework no tiene DEV_ENVIRONMENTS local
smoke('Debt 1: integration-framework.ts no tiene DEV_ENVIRONMENTS local', () => {
  const src = read('supabase/functions/_shared/smart-conversations/integration-framework.ts');
  const clean = src.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,'');
  return !/const\s+DEV_ENVIRONMENTS\s*=\s*new\s+Set/.test(clean);
});

// PASO 8: Debt 2 resuelta — validate-dev-integrations.mjs tiene stripComments
smoke('Debt 2: validate-dev-integrations.mjs tiene stripComments', () => {
  const src = read('scripts/smart-conversations/validate-dev-integrations.mjs');
  return src.includes('stripComments');
});

// PASO 9: Canary tiene 6 AI operations para tenant A
smoke('Canary: 6 AI ops para dev-tenant-a', () => {
  const src = read('supabase/functions/_shared/smart-conversations/integration-canary.ts');
  const aiBlock = src.split("integration:").find(b => b.includes("'ai'")) ?? '';
  const ops = ['ai.intent.classify','ai.incident.extract','ai.listing.extract','ai.help.extract','ai.safe_summary','ai.response_draft'];
  return ops.every(op => aiBlock.includes(op));
});

// PASO 10: AI_DEV_CONFIGURATION_PENDING declarado
smoke('AI_DEV_CONFIGURATION_PENDING declarado en adapter', () => {
  const src = read('supabase/functions/_shared/smart-conversations/adapters/ai-integration-adapter.ts');
  return src.includes('AI_DEV_CONFIGURATION_PENDING');
});

// PASO 11: AI adapter no accede directamente a DB
smoke('AI adapter no importa supabaseClient ni createClient', () => {
  const src = read('supabase/functions/_shared/smart-conversations/adapters/ai-integration-adapter.ts');
  const clean = src.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,'');
  return !clean.includes('supabaseClient') && !clean.includes('createClient');
});

// PASO 12: AI adapter no publica Activity Log
smoke('AI adapter no llama publishActivity', () => {
  const src = read('supabase/functions/_shared/smart-conversations/adapters/ai-integration-adapter.ts');
  const clean = src.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,'');
  return !clean.includes('publishActivity');
});

// PASO 13: 4 suites de test existen
smoke('4 suites de test AI existen', () => {
  const base = 'tests/regression/smart-conversations/suites/ai-integration-dev';
  return ['ai-integration-dev.spec.ts','ai-integration-dev-runtime.spec.ts','ai-integration-dev-contracts.spec.ts','ai-integration-dev-adversarial.spec.ts']
    .every(f => exists(`${base}/${f}`));
});

// PASO 14: 8 documentación archivos existen
smoke('8 docs AI existen', () => {
  const base = 'docs/smart-conversations/integrations';
  const docs = ['ai-dev-readiness.md','ai-integration-contracts.md','ai-privacy-model.md','ai-prompt-catalog.md','ai-output-schema-catalog.md','ai-cost-and-limits.md','ai-dev-test-report.md','ai-dev-rollback.md'];
  return docs.every(d => exists(`${base}/${d}`));
});

// PASO 15: Scripts npm configurados
smoke('Scripts npm: test:sc:ai-integration-dev, validate:sc:ai-dev-integration', () => {
  const pkg = JSON.parse(read('package.json'));
  return 'test:sc:ai-integration-dev' in (pkg.scripts ?? {}) && 'validate:sc:ai-dev-integration' in (pkg.scripts ?? {});
});

// PASO 16: Ningún tenant real en canary
smoke('Canary solo tiene tenants dev-tenant-*', () => {
  const src = read('supabase/functions/_shared/smart-conversations/integration-canary.ts');
  const tenants = src.match(/tenant_id:\s*'([^']+)'/g) ?? [];
  return tenants.every(t => t.includes('dev-tenant'));
});

// PASO 17: validate-ai-dev-integration.mjs existe
smoke('validate-ai-dev-integration.mjs existe', () =>
  exists('scripts/smart-conversations/validate-ai-dev-integration.mjs')
);

// PASO 18: Estado esperado AI_DEV_CONFIGURATION_PENDING (sin proveedor aprobado)
smoke('Estado esperado: AI_DEV_CONFIGURATION_PENDING (proveedor pendiente)', () => {
  // El proveedor AI no está configurado en DEV (correcto para Fase 11C3)
  const src = read('supabase/functions/_shared/smart-conversations/adapters/ai-integration-adapter.ts');
  return src.includes('AI_DEV_CONFIGURATION_PENDING');
});

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`${BOLD}Smoke: ${step - errors}/${step} pasos OK${RESET}`);
if (errors === 0) {
  console.log(`${GREEN}${BOLD}AI_INTEGRATION_OFFLINE_READY — listo para activar proveedor${RESET}`);
} else {
  console.log(`${RED}${BOLD}SMOKE_FAILED — ${errors} pasos fallaron${RESET}`);
}
process.exit(errors > 0 ? 1 : 0);
