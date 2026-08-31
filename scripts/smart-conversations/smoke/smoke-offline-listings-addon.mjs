/**
 * smoke-offline-listings-addon.mjs — Fase 11C5
 * Smoke OFFLINE para el add-on de publicaciones/leads.
 * Verifica infraestructura, contratos y privacidad SIN llamadas a red.
 *
 * ESTADO ESPERADO: LISTINGS_OFFLINE_READY_DEV_PENDING
 * Uso: node scripts/smart-conversations/smoke/smoke-offline-listings-addon.mjs
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    console.log(`  [${String(stepNum).padStart(2, '0')}] ✅ ${label}`);
    passed++;
  } catch (e) {
    console.log(`  [${String(stepNum).padStart(2, '0')}] ❌ ${label}: ${e.message}`);
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

function notContains(rel, str) {
  const clean = src(rel).replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
  if (clean.includes(str)) throw new Error(`"${str}" PRESENTE (prohibido) en ${rel}`);
}

console.log('\n=== smoke-offline-listings-addon.mjs — Fase 11C5 ===\n');

// 1. Puerto neutral existe
step('listings-integration-port.ts existe', () => {
  exists(`${SHARED}/listings-integration-port.ts`);
});

// 2. Puerto exporta ListingsIntegrationPort
step('ListingsIntegrationPort exportado', () => {
  contains(`${SHARED}/listings-integration-port.ts`, 'ListingsIntegrationPort');
});

// 3. searchListings y createLead en puerto
step('searchListings y createLead en puerto', () => {
  const s = src(`${SHARED}/listings-integration-port.ts`);
  if (!s.includes('searchListings')) throw new Error('searchListings ausente');
  if (!s.includes('createLead')) throw new Error('createLead ausente');
});

// 4. contract_version v1.0
step("contract_version: '1.0' en CreateLeadCommand", () => {
  contains(`${SHARED}/listings-integration-port.ts`, "contract_version: '1.0'");
});

// 5. LISTING_PRIVATE_FIELDS declarado
step('LISTING_PRIVATE_FIELDS declarado en puerto', () => {
  contains(`${SHARED}/listings-integration-port.ts`, 'LISTING_PRIVATE_FIELDS');
});

// 6. tenant_ids en LISTING_PRIVATE_FIELDS
step("tenant_ids en LISTING_PRIVATE_FIELDS", () => {
  const s = src(`${SHARED}/listings-integration-port.ts`);
  if (!s.includes('tenant_ids')) throw new Error('tenant_ids ausente');
});

// 7. Actor canónico existe
step('canonical-actor.ts existe', () => {
  exists(`${SHARED}/canonical-actor.ts`);
});

// 8. Adapter exists (11C1)
step('listings-addon-adapter.ts existe (11C1)', () => {
  exists(`${SHARED}/adapters/listings-addon-adapter.ts`);
});

// 9. FORBIDDEN_INTERNAL_ENUMS con UNVERIFIED_LEAD
step("FORBIDDEN_INTERNAL_ENUMS incluye 'UNVERIFIED_LEAD' (enum ≠ tipo)", () => {
  const s = src(`${SHARED}/adapters/listings-addon-adapter.ts`);
  if (!s.includes('FORBIDDEN_INTERNAL_ENUMS')) throw new Error('FORBIDDEN_INTERNAL_ENUMS ausente');
  if (!s.includes('UNVERIFIED_LEAD')) throw new Error("'UNVERIFIED_LEAD' ausente en forbidden enums");
});

// 10. Adapter sin SUPABASE_SERVICE_ROLE_KEY
step('Sin SUPABASE_SERVICE_ROLE_KEY en adapter listings', () => {
  notContains(`${SHARED}/adapters/listings-addon-adapter.ts`, 'SUPABASE_SERVICE_ROLE_KEY');
});

// 11. Adapter sin createClient()
step('Sin createClient() en adapter listings', () => {
  notContains(`${SHARED}/adapters/listings-addon-adapter.ts`, 'createClient(');
});

// 12. Adapter usa AbortSignal.timeout
step('AbortSignal.timeout en adapter listings', () => {
  contains(`${SHARED}/adapters/listings-addon-adapter.ts`, 'AbortSignal.timeout');
});

// 13. Frontera n8n: adapter listings NO importa n8n
step('listings-addon-adapter NO importa n8n-adapter', () => {
  if (src(`${SHARED}/adapters/listings-addon-adapter.ts`).includes('n8n-adapter')) {
    throw new Error('Acoplamiento n8n → listings detectado');
  }
});

// 14. Sin endpoint real (offline esperado)
step('LISTINGS_ADDON_BASE_URL ausente → modo offline esperado', () => {
  if (process.env['LISTINGS_ADDON_BASE_URL']) {
    throw new Error('LISTINGS_ADDON_BASE_URL configurada → ejecutar smoke DEV real');
  }
});

// 15. Suite de test existe
step('Suite addons-integration-dev.spec.ts existe', () => {
  exists('tests/regression/smart-conversations/suites/addons-integration-dev/addons-integration-dev.spec.ts');
});

console.log(`\n=== ${passed}/15 pasos OK / ${failed} FAIL ===`);

const state = failed === 0
  ? 'LISTINGS_OFFLINE_READY_DEV_PENDING'
  : 'LISTINGS_SMOKE_DEGRADED';

console.log(`Estado: ${state}`);
console.log('Siguiente: configurar LISTINGS_ADDON_BASE_URL y ejecutar smoke-dev-listings-addon.mjs\n');

if (failed > 0) process.exit(1);
