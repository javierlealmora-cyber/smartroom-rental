/**
 * validate-addons-dev-integration.mjs — Fase 11C5
 * Valida la integración DEV offline de add-ons (incidencias + publicaciones).
 * Uso: node scripts/smart-conversations/validate-addons-dev-integration.mjs
 *
 * Estados posibles:
 *   ADDONS_INTEGRATION_OFFLINE_READY         — todo OK sin warns
 *   ADDONS_DEV_CONFIGURATION_PENDING         — OK offline, endpoints DEV ausentes
 *   ADDONS_INTEGRATION_DEV_PARTIALLY_VALIDATED — algunos checks fallidos
 *   ADDONS_INTEGRATION_INCOMPLETE            — múltiples fallos
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');

let ok = 0;
let fail = 0;
let warn = 0;

function check(label, value, isWarn = false) {
  if (value) {
    console.log(`  ✅ ${label}`);
    ok++;
  } else if (isWarn) {
    console.log(`  ⚠️  ${label}`);
    warn++;
  } else {
    console.log(`  ❌ ${label}`);
    fail++;
  }
}

function existsFile(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function stripComments(s) {
  return s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
}

console.log('\n=== validate-addons-dev-integration.mjs — Fase 11C5 ===\n');

const SHARED = 'supabase/functions/_shared/smart-conversations';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Infraestructura de puertos (Fase 11C5)
// ─────────────────────────────────────────────────────────────────────────────

console.log('--- 1. Puertos neutrales ---');

check('canonical-actor.ts existe', existsFile(`${SHARED}/canonical-actor.ts`));
check('incidents-integration-port.ts existe', existsFile(`${SHARED}/incidents-integration-port.ts`));
check('listings-integration-port.ts existe', existsFile(`${SHARED}/listings-integration-port.ts`));

const actorSrc = readFile(`${SHARED}/canonical-actor.ts`);
check("CanonicalActor exportado", actorSrc.includes('CanonicalActor'));
check("variante unverified_lead en canonical-actor", actorSrc.includes("'unverified_lead'"));
check("variante system_service en canonical-actor", actorSrc.includes("'system_service'"));
check("CANONICAL_ACTOR_FORBIDDEN_FIELDS declarado", actorSrc.includes('CANONICAL_ACTOR_FORBIDDEN_FIELDS'));
check("validateCanonicalActor exportado", actorSrc.includes('validateCanonicalActor'));

const incPortSrc = readFile(`${SHARED}/incidents-integration-port.ts`);
check("IncidentIntegrationPort exportado", incPortSrc.includes('IncidentIntegrationPort'));
check("contract_version '1.0' en CreateIncidentCommand", incPortSrc.includes("contract_version: '1.0'"));
check("INCIDENT_FORBIDDEN_OUTPUT_FIELDS declarado", incPortSrc.includes('INCIDENT_FORBIDDEN_OUTPUT_FIELDS'));
check("validateIncidentResult exportado", incPortSrc.includes('validateIncidentResult'));

const lstPortSrc = readFile(`${SHARED}/listings-integration-port.ts`);
check("ListingsIntegrationPort exportado", lstPortSrc.includes('ListingsIntegrationPort'));
check("contract_version '1.0' en CreateLeadCommand", lstPortSrc.includes("contract_version: '1.0'"));
check("LISTINGS_FORBIDDEN_OUTPUT_FIELDS declarado", lstPortSrc.includes('LISTINGS_FORBIDDEN_OUTPUT_FIELDS'));
check("LISTING_PRIVATE_FIELDS declarado", lstPortSrc.includes('LISTING_PRIVATE_FIELDS'));

// ─────────────────────────────────────────────────────────────────────────────
// 2. Adapters existentes (Fase 11C1, precheck 11C5)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 2. Adapters (Fase 11C1) ---');

check('incidents-addon-adapter.ts existe', existsFile(`${SHARED}/adapters/incidents-addon-adapter.ts`));
check('listings-addon-adapter.ts existe', existsFile(`${SHARED}/adapters/listings-addon-adapter.ts`));

const incAdpSrc = readFile(`${SHARED}/adapters/incidents-addon-adapter.ts`);
const incAdpClean = stripComments(incAdpSrc);
check('INCIDENTS_ADDON_INTEGRATION_MODE en adapter', incAdpSrc.includes('INCIDENTS_ADDON_INTEGRATION_MODE'));
check('INCIDENTS_ADDON_BASE_URL en adapter', incAdpSrc.includes('INCIDENTS_ADDON_BASE_URL'));
check('INCIDENTS_ADDON_SERVICE_TOKEN en adapter', incAdpSrc.includes('INCIDENTS_ADDON_SERVICE_TOKEN'));
check('validateIncidentCommand en adapter', incAdpSrc.includes('validateIncidentCommand'));
check('checkCircuit en incidents adapter', incAdpSrc.includes('checkCircuit'));
check('AbortSignal.timeout en incidents adapter', incAdpSrc.includes('AbortSignal.timeout'));
check('Sin SUPABASE_SERVICE_ROLE_KEY en incidents adapter', !incAdpClean.includes('SUPABASE_SERVICE_ROLE_KEY'));
check('Sin createClient() en incidents adapter', !incAdpClean.includes('createClient('));

const lstAdpSrc = readFile(`${SHARED}/adapters/listings-addon-adapter.ts`);
const lstAdpClean = stripComments(lstAdpSrc);
check('LISTINGS_ADDON_INTEGRATION_MODE en adapter', lstAdpSrc.includes('LISTINGS_ADDON_INTEGRATION_MODE'));
check('LISTINGS_ADDON_BASE_URL en adapter', lstAdpSrc.includes('LISTINGS_ADDON_BASE_URL'));
check('LISTINGS_ADDON_SERVICE_TOKEN en adapter', lstAdpSrc.includes('LISTINGS_ADDON_SERVICE_TOKEN'));
check('validateListingActor en adapter', lstAdpSrc.includes('validateListingActor'));
check('FORBIDDEN_INTERNAL_ENUMS con UNVERIFIED_LEAD', lstAdpSrc.includes('FORBIDDEN_INTERNAL_ENUMS') && lstAdpSrc.includes('UNVERIFIED_LEAD'));
check('checkCircuit en listings adapter', lstAdpSrc.includes('checkCircuit'));
check('AbortSignal.timeout en listings adapter', lstAdpSrc.includes('AbortSignal.timeout'));
check('Sin SUPABASE_SERVICE_ROLE_KEY en listings adapter', !lstAdpClean.includes('SUPABASE_SERVICE_ROLE_KEY'));
check('Sin createClient() en listings adapter', !lstAdpClean.includes('createClient('));

// ─────────────────────────────────────────────────────────────────────────────
// 3. Privacidad en adapters
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 3. Privacidad ---');

check('INCIDENT_FORBIDDEN_ACTOR_FIELDS declarado en adapter incidents', incAdpSrc.includes('INCIDENT_FORBIDDEN_ACTOR_FIELDS'));
check('INCIDENT_FORBIDDEN_ACTOR_FIELDS incluye sender_ref', incAdpSrc.includes('sender_ref'));
check('INCIDENT_FORBIDDEN_ACTOR_FIELDS incluye wa_jid', incAdpSrc.includes('wa_jid'));
check('INCIDENT_FORBIDDEN_ACTOR_FIELDS incluye STRONG_MATCH_ACTIVE', incAdpSrc.includes('STRONG_MATCH_ACTIVE'));
check('Puerto incidents: conv_session_id en forbidden output', incPortSrc.includes('conv_session_id'));
check('Puerto incidents: conv_case_id en forbidden output', incPortSrc.includes('conv_case_id'));
check('Puerto listings: tenant_ids en private fields', lstPortSrc.includes('tenant_ids'));

// ─────────────────────────────────────────────────────────────────────────────
// 4. Frontera n8n / add-ons
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 4. Frontera n8n / add-ons ---');

const n8nAdpSrc = readFile(`${SHARED}/adapters/n8n-adapter.ts`);
check('n8n-adapter NO importa incidents-addon-adapter', !n8nAdpSrc.includes('incidents-addon-adapter'));
check('n8n-adapter NO importa listings-addon-adapter', !n8nAdpSrc.includes('listings-addon-adapter'));
check('incidents-addon-adapter NO importa n8n-adapter', !incAdpSrc.includes('n8n-adapter'));
check('listings-addon-adapter NO importa n8n-adapter', !lstAdpSrc.includes('n8n-adapter'));
check('canonical-actor NO importa orchestration-port', !actorSrc.includes('orchestration-port'));

// ─────────────────────────────────────────────────────────────────────────────
// 5. Actor canónico — campos prohibidos
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 5. Actor canónico ---');

const REQUIRED_FORBIDDEN = ['identity_level', 'STRONG_MATCH_ACTIVE', 'sender_ref', 'wa_jid', 'phone', 'email', 'UNVERIFIED_LEAD'];
for (const f of REQUIRED_FORBIDDEN) {
  check(`CANONICAL_ACTOR_FORBIDDEN_FIELDS incluye '${f}'`, actorSrc.includes(`'${f}'`));
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Suites de test
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 6. Suites de test ---');

const SUITES_DIR = 'tests/regression/smart-conversations/suites/addons-integration-dev';
const SUITES = [
  'addons-integration-dev.spec.ts',
  'addons-integration-dev-runtime.spec.ts',
  'addons-integration-dev-contracts.spec.ts',
  'addons-integration-dev-adversarial.spec.ts',
];

for (const s of SUITES) {
  check(`Suite existe: ${s}`, existsFile(`${SUITES_DIR}/${s}`));
}

let totalTests = 0;
for (const s of SUITES) {
  const content = readFile(`${SUITES_DIR}/${s}`);
  const count = (content.match(/^\s+it\(/gm) ?? []).length;
  totalTests += count;
}
check(`Total tests ≥ 220 (contados: ${totalTests})`, totalTests >= 220);

// ─────────────────────────────────────────────────────────────────────────────
// 7. Documentación
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 7. Documentación (9 docs) ---');

const DOCS_DIR = 'docs/smart-conversations/integrations';
const REQUIRED_DOCS = [
  'addons-dev-readiness.md',
  'incidents-integration-contract.md',
  'listings-integration-contract.md',
  'leads-integration-contract.md',
  'canonical-actor-contract.md',
  'addons-authentication-model.md',
  'addons-privacy-model.md',
  'addons-dev-test-report.md',
  'addons-dev-rollback.md',
];

for (const doc of REQUIRED_DOCS) {
  check(`Doc existe: ${doc}`, existsFile(`${DOCS_DIR}/${doc}`));
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Scripts npm y smokes
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 8. Scripts npm y smokes ---');

const pkgSrc = readFile('package.json');
const REQUIRED_SCRIPTS = [
  'test:sc:addons-integration-dev',
  'validate:sc:addons-dev-integration',
  'test:smoke:offline:incidents-addon',
  'test:smoke:offline:listings-addon',
  'test:smoke:dev:incidents-addon',
  'test:smoke:dev:listings-addon',
  'test:smoke:dev:addons',
];
for (const s of REQUIRED_SCRIPTS) {
  check(`Script npm "${s}"`, pkgSrc.includes(`"${s}"`));
}

const SMOKE_SCRIPTS = [
  'scripts/smart-conversations/smoke/smoke-offline-incidents-addon.mjs',
  'scripts/smart-conversations/smoke/smoke-offline-listings-addon.mjs',
  'scripts/smart-conversations/smoke/smoke-dev-incidents-addon.mjs',
  'scripts/smart-conversations/smoke/smoke-dev-listings-addon.mjs',
  'scripts/smart-conversations/smoke/smoke-dev-addons.mjs',
];
for (const s of SMOKE_SCRIPTS) {
  check(`Smoke existe: ${path.basename(s)}`, existsFile(s));
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. CI
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 9. CI ---');

const ciSrc = readFile('.github/workflows/pr-checks.yml');
check('CI incluye addons-integration-dev', ciSrc.includes('addons-integration-dev'));
check('CI incluye validate:sc:addons-dev-integration', ciSrc.includes('validate:sc:addons-dev-integration'));

// ─────────────────────────────────────────────────────────────────────────────
// 10. Configuración DEV (warn si ausente — esperado en offline)
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n--- 10. Configuración DEV (warn si ausente) ---');

// Usar mensajes inequívocos: la etiqueta refleja el estado real de la variable.
// "no configurada/o" cuando está ausente — nunca usar formulación positiva sin negación.
check(
  !!process.env['INCIDENTS_ADDON_BASE_URL']
    ? 'INCIDENTS_ADDON_BASE_URL configurada'
    : 'INCIDENTS_ADDON_BASE_URL no configurada',
  !!process.env['INCIDENTS_ADDON_BASE_URL'],
  true,
);
check(
  !!process.env['INCIDENTS_ADDON_SERVICE_TOKEN']
    ? 'INCIDENTS_ADDON_SERVICE_TOKEN configurado'
    : 'INCIDENTS_ADDON_SERVICE_TOKEN no configurado',
  !!process.env['INCIDENTS_ADDON_SERVICE_TOKEN'],
  true,
);
check(
  !!process.env['LISTINGS_ADDON_BASE_URL']
    ? 'LISTINGS_ADDON_BASE_URL configurada'
    : 'LISTINGS_ADDON_BASE_URL no configurada',
  !!process.env['LISTINGS_ADDON_BASE_URL'],
  true,
);
check(
  !!process.env['LISTINGS_ADDON_SERVICE_TOKEN']
    ? 'LISTINGS_ADDON_SERVICE_TOKEN configurado'
    : 'LISTINGS_ADDON_SERVICE_TOKEN no configurado',
  !!process.env['LISTINGS_ADDON_SERVICE_TOKEN'],
  true,
);

// ─────────────────────────────────────────────────────────────────────────────
// Resultado final
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n=== Resultado: ${ok} OK / ${fail} FAIL / ${warn} WARN ===`);

let state;
if (fail === 0 && warn === 0) {
  state = 'ADDONS_INTEGRATION_OFFLINE_READY';
} else if (fail === 0) {
  state = 'ADDONS_DEV_CONFIGURATION_PENDING';
} else if (fail <= 3) {
  state = 'ADDONS_INTEGRATION_DEV_PARTIALLY_VALIDATED';
} else {
  state = 'ADDONS_INTEGRATION_INCOMPLETE';
}

console.log(`Estado: ${state}\n`);

if (fail > 0) process.exit(1);

// Seguridad: GATE_1 = AUDIT_COMPLETE_REMEDIATION_PENDING (no cerrar hasta auditoría completa)
