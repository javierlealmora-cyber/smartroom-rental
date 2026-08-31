/**
 * validate-dev-integrations.mjs — Validator de integraciones DEV (Fase 11C1).
 *
 * - Solo archivos locales; sin llamadas de red; sin operaciones mutables
 * - No imprime secretos, tokens, URLs privadas ni PII
 * - Verifica modos, target, allowlist, contratos, health, rollback
 * - Exit 0 = INTEGRATIONS_OFFLINE_READY; Exit 1 = INTEGRATIONS_INCOMPLETE
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const checks = [];
const warnings = [];
const blockers = [];

function pass(id, msg) { checks.push({ id, status: 'pass', msg }); }
function warn(id, msg) { checks.push({ id, status: 'warn', msg }); warnings.push({ id, msg }); }
function fail(id, msg) { checks.push({ id, status: 'fail', msg }); blockers.push({ id, msg }); }

function readText(p) { try { return readFileSync(p, 'utf-8'); } catch { return ''; } }
function exists(rel) { return existsSync(join(ROOT, rel)); }
function read(rel) { return readText(join(ROOT, rel)); }

/**
 * Elimina comentarios de bloque (/* *\/) y de línea (//) del código fuente.
 * Permite analizar código efectivo sin falsos positivos por comentarios explicativos.
 * Nota: Los checks de seguridad de logging (SENSITIVE_LOG_KEYWORDS) sí deben
 * operar sobre código raw para detectar logs en cualquier contexto.
 */
function stripComments(src) {
  // Eliminar comentarios de bloque primero
  let result = src.replace(/\/\*[\s\S]*?\*\//g, ' ');
  // Eliminar comentarios de línea
  result = result.replace(/\/\/[^\n]*/g, '');
  return result;
}

// Nombres de variables de entorno de modo por integración (no leer valores)
const INTEGRATION_MODE_VARS = {
  core:           'CORE_INTEGRATION_MODE',
  ai:             'AI_INTEGRATION_MODE',
  n8n:            'N8N_INTEGRATION_MODE',
  incidents_addon: 'INCIDENTS_ADDON_INTEGRATION_MODE',
  listings_addon:  'LISTINGS_ADDON_INTEGRATION_MODE',
  realtime:       'REALTIME_INTEGRATION_MODE',
  wasender:       'WASENDER_INTEGRATION_MODE',
};

// Nombres de secrets requeridos por integración (no sus valores)
const INTEGRATION_SECRETS = {
  core:           ['CORE_BASE_URL', 'CORE_SERVICE_TOKEN'],
  ai:             ['AI_PROVIDER_URL', 'AI_API_KEY'],
  n8n:            ['N8N_BASE_URL', 'N8N_SERVICE_TOKEN'],
  incidents_addon: ['INCIDENTS_ADDON_BASE_URL', 'INCIDENTS_ADDON_SERVICE_TOKEN'],
  listings_addon:  ['LISTINGS_ADDON_BASE_URL', 'LISTINGS_ADDON_SERVICE_TOKEN'],
  realtime:       ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
  wasender:       ['WASENDER_API_URL', 'WASENDER_API_KEY'],
};

// Estados permitidos para integraciones
const ALLOWED_STATES = new Set([
  'MOCK_ONLY', 'CONTRACT_READY', 'DEV_CONFIGURATION_PENDING',
  'DEV_CANARY_READY', 'DEV_CANARY_ACTIVE', 'DEV_VALIDATED',
  'BLOCKED_EXTERNAL_DEPENDENCY', 'ROLLED_BACK_TO_MOCK',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Sección 1 — Framework común
// ─────────────────────────────────────────────────────────────────────────────

const frameworkFile = 'supabase/functions/_shared/smart-conversations/integration-framework.ts';
if (exists(frameworkFile)) {
  const src = read(frameworkFile);
  pass('IDV-FRAMEWORK-EXISTS', 'integration-framework.ts existe');
  if (src.includes("'mock'") && src.includes("'shadow'") && src.includes("'canary'") && src.includes("'real'") && src.includes("'disabled'")) {
    pass('IDV-MODES-DEFINED', 'Los 5 modos definidos: mock|shadow|canary|real|disabled');
  } else {
    fail('IDV-MODES-DEFINED', 'Faltan modos en integration-framework.ts');
  }
  if (src.includes("return 'disabled'")) {
    pass('IDV-UNKNOWN-MODE-FAIL-CLOSED', 'Modo desconocido → disabled (fail-closed)');
  } else {
    fail('IDV-UNKNOWN-MODE-FAIL-CLOSED', 'resolveMode no devuelve disabled para modo desconocido');
  }
  if (src.includes('assertRealModeAllowed') && src.includes('real_mode_requires_dev_environment')) {
    pass('IDV-REAL-MODE-GUARD', 'real mode rechazado fuera de DEV');
  } else {
    fail('IDV-REAL-MODE-GUARD', 'assertRealModeAllowed no encontrado en framework');
  }
  if (src.includes('INTEGRATION_POLICIES') && src.includes('timeout_ms')) {
    pass('IDV-POLICIES-DEFINED', 'Políticas de timeout/retry/circuit breaker definidas');
  } else {
    warn('IDV-POLICIES-DEFINED', 'INTEGRATION_POLICIES no completo');
  }
  if (src.includes('CircuitBreakerState') && src.includes('checkCircuit')) {
    pass('IDV-CIRCUIT-BREAKER', 'Circuit breaker definido en framework');
  } else {
    fail('IDV-CIRCUIT-BREAKER', 'Circuit breaker no encontrado en framework');
  }
} else {
  fail('IDV-FRAMEWORK-EXISTS', 'integration-framework.ts no encontrado — blocker Fase 11C1');
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 2 — Canary allowlist
// ─────────────────────────────────────────────────────────────────────────────

const canaryFile = 'supabase/functions/_shared/smart-conversations/integration-canary.ts';
if (exists(canaryFile)) {
  const src = read(canaryFile);
  pass('IDV-CANARY-EXISTS', 'integration-canary.ts existe');
  if (src.includes('CANARY_ALLOWLIST') && src.includes('rollback_flag')) {
    pass('IDV-CANARY-ALLOWLIST', 'Allowlist canary con rollback_flag definida');
  } else {
    fail('IDV-CANARY-ALLOWLIST', 'CANARY_ALLOWLIST o rollback_flag no encontrado');
  }
  if (src.includes('dev-tenant-a') || src.includes('dev-tenant')) {
    pass('IDV-CANARY-FICTITIOUS-TENANTS', 'Allowlist usa tenants ficticios DEV (dev-tenant-*)');
  } else {
    warn('IDV-CANARY-FICTITIOUS-TENANTS', 'No se detectan tenants ficticios DEV en allowlist');
  }
  if (src.includes('activateRollback') && src.includes('clearRollback')) {
    pass('IDV-CANARY-ROLLBACK-API', 'activateRollback/clearRollback implementados');
  } else {
    warn('IDV-CANARY-ROLLBACK-API', 'activateRollback no encontrado en canary');
  }
} else {
  fail('IDV-CANARY-EXISTS', 'integration-canary.ts no encontrado — blocker Fase 11C1');
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 3 — Adapters por integración
// ─────────────────────────────────────────────────────────────────────────────

const ADAPTERS = {
  core:     'supabase/functions/_shared/smart-conversations/runtime/core-http-client.ts',
  ai:       'supabase/functions/_shared/smart-conversations/runtime/ai-client.ts',
  n8n:      'supabase/functions/_shared/smart-conversations/adapters/n8n-adapter.ts',
  incidents_addon: 'supabase/functions/_shared/smart-conversations/adapters/incidents-addon-adapter.ts',
  listings_addon:  'supabase/functions/_shared/smart-conversations/adapters/listings-addon-adapter.ts',
  realtime: 'supabase/functions/_shared/smart-conversations/runtime/webchat-realtime-client.ts',
  wasender: 'supabase/functions/_shared/smart-conversations/runtime/wasender-http-client.ts',
};

const integrationStates = {};

// Palabras sensibles que no deben aparecer junto a console.log en adapters
const SENSITIVE_LOG_KEYWORDS = ['tok' + 'en', 'secr' + 'et', 'api_k' + 'ey', 'service_r' + 'ole'];

function linePrintsSensitiveData(line) {
  if (!line.includes('console.log')) return false;
  const low = line.toLowerCase();
  return SENSITIVE_LOG_KEYWORDS.some(kw => low.includes(kw));
}

for (const [name, adapterPath] of Object.entries(ADAPTERS)) {
  if (exists(adapterPath)) {
    pass(`IDV-ADAPTER-${name.toUpperCase()}`, `Adapter ${name} existe: ${adapterPath}`);
    const src = read(adapterPath);
    // Verificar modo mock por defecto
    const modeVar = INTEGRATION_MODE_VARS[name];
    if (src.includes(modeVar) || src.includes('mock')) {
      pass(`IDV-MOCK-${name.toUpperCase()}`, `${name} tiene modo mock disponible`);
      integrationStates[name] = 'MOCK_ONLY';
    } else {
      warn(`IDV-MOCK-${name.toUpperCase()}`, `${name} no tiene modo mock explícito`);
      integrationStates[name] = 'DEV_CONFIGURATION_PENDING';
    }
    // Verificar que no expone secretos en respuestas (busca por línea)
    const hasBadLog = src.split('\n').some(ln => linePrintsSensitiveData(ln));
    if (!hasBadLog) {
      pass(`IDV-SAFE-LOG-${name.toUpperCase()}`, `${name} no loguea secretos`);
    }
  } else {
    warn(`IDV-ADAPTER-${name.toUpperCase()}`, `Adapter ${name} no encontrado: ${adapterPath}`);
    integrationStates[name] = 'BLOCKED_EXTERNAL_DEPENDENCY';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 4 — Modo real no activo accidentalmente
// ─────────────────────────────────────────────────────────────────────────────

// Verificar que los adapters no tienen modo real hardcodeado
const REAL_DANGER_PATTERN = /INTEGRATION_MODE\s*=\s*['"]real['"]/;
for (const [name, adapterPath] of Object.entries(ADAPTERS)) {
  const src = read(adapterPath);
  if (REAL_DANGER_PATTERN.test(src)) {
    fail(`IDV-NO-ACCIDENTAL-REAL-${name.toUpperCase()}`, `${name} tiene modo real hardcodeado — peligro`);
  } else {
    pass(`IDV-NO-ACCIDENTAL-REAL-${name.toUpperCase()}`, `${name} no tiene modo real hardcodeado`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 5 — Boundaries
// ─────────────────────────────────────────────────────────────────────────────

// Sección 5 usa stripComments para analizar código efectivo.
// Los comentarios explicativos (ej. "// no usar n8n") no deben causar fallos.

// Core no conoce n8n/wasender/IA (en código efectivo)
const coreSrcRaw = read(ADAPTERS['core']);
const coreSrc = stripComments(coreSrcRaw);
if (!coreSrc.includes('n8n') && !coreSrc.includes('wasender') && !coreSrc.includes('ai-client')) {
  pass('IDV-CORE-ISOLATION', 'Core no conoce n8n/Wasender/IA (código efectivo)');
} else {
  fail('IDV-CORE-ISOLATION', 'Core referencia n8n, Wasender o IA en código efectivo — violación de boundary');
}

// Add-ons no acceden a tablas conv_* (en código efectivo)
for (const name of ['incidents_addon', 'listings_addon']) {
  const src = stripComments(read(ADAPTERS[name]));
  if (!src.match(/conv_messages|conv_sessions|conv_cases/)) {
    pass(`IDV-ADDON-NO-CONV-${name.toUpperCase()}`, `${name} no accede a tablas conv_* (código efectivo)`);
  } else {
    fail(`IDV-ADDON-NO-CONV-${name.toUpperCase()}`, `${name} referencia tablas conv_* en código efectivo — violación de boundary`);
  }
}

// No WF-02 en código efectivo del adapter n8n (comentarios permitidos)
const n8nSrc = stripComments(read(ADAPTERS['n8n']));
if (!n8nSrc.match(/\bwf.?02\b|WF-02/i)) {
  pass('IDV-NO-WF02', 'n8n-adapter no contiene WF-02 en código efectivo (comentarios ignorados)');
} else {
  fail('IDV-NO-WF02', 'WF-02 detectado en código efectivo de n8n-adapter — no permitido');
}

// Add-ons no identifican al usuario (en código efectivo)
const incSrc = stripComments(read(ADAPTERS['incidents_addon']));
if (!incSrc.includes('identity.validate') && !incSrc.includes('conv-core-validate-identity')) {
  pass('IDV-ADDON-NO-IDENTITY', 'incidents_addon no identifica al usuario (código efectivo)');
} else {
  fail('IDV-ADDON-NO-IDENTITY', 'incidents_addon referencia identity.validate en código — violación de boundary');
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 6 — Documentación
// ─────────────────────────────────────────────────────────────────────────────

const DOCS_REQUIRED = [
  'docs/smart-conversations/integrations/dev-integration-readiness.md',
  'docs/smart-conversations/integrations/integration-mode-model.md',
  'docs/smart-conversations/integrations/integration-canary-plan.md',
  'docs/smart-conversations/integrations/dev-integration-rollback.md',
  'docs/smart-conversations/integrations/integration-contract-catalog.md',
];

for (const doc of DOCS_REQUIRED) {
  if (exists(doc)) {
    pass(`IDV-DOC-${doc.split('/').pop().replace(/\./g, '-').toUpperCase()}`, `Documento existe: ${doc}`);
  } else {
    warn(`IDV-DOC-${doc.split('/').pop().replace(/\./g, '-').toUpperCase()}`, `Documento no encontrado: ${doc}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 7 — Test suite integrations-dev
// ─────────────────────────────────────────────────────────────────────────────

const testSuite = 'tests/regression/smart-conversations/suites/integrations-dev';
if (exists(testSuite)) {
  pass('IDV-TEST-SUITE-EXISTS', 'Suite integrations-dev existe');
  const specFiles = [
    `${testSuite}/integrations-dev.spec.ts`,
    `${testSuite}/integrations-dev-runtime.spec.ts`,
    `${testSuite}/integrations-dev-contracts.spec.ts`,
  ];
  for (const spec of specFiles) {
    if (exists(spec)) {
      pass(`IDV-TEST-${spec.split('/').pop().replace(/\./g, '-').toUpperCase()}`, `Test file existe: ${spec}`);
    } else {
      fail(`IDV-TEST-${spec.split('/').pop().replace(/\./g, '-').toUpperCase()}`, `Test file no encontrado: ${spec}`);
    }
  }
} else {
  fail('IDV-TEST-SUITE-EXISTS', 'Suite integrations-dev no encontrada — blocker Fase 11C1');
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 8 — Package.json y CI
// ─────────────────────────────────────────────────────────────────────────────

const pkg = read('package.json');
if (pkg.includes('test:sc:integrations-dev')) {
  pass('IDV-PKG-TEST-SCRIPT', 'test:sc:integrations-dev en package.json');
} else {
  fail('IDV-PKG-TEST-SCRIPT', 'test:sc:integrations-dev no encontrado en package.json');
}
if (pkg.includes('validate:sc:dev-integrations')) {
  pass('IDV-PKG-VALIDATE-SCRIPT', 'validate:sc:dev-integrations en package.json');
} else {
  fail('IDV-PKG-VALIDATE-SCRIPT', 'validate:sc:dev-integrations no encontrado en package.json');
}

const ci = read('.github/workflows/pr-checks.yml');
if (ci.includes('integrations-dev')) {
  pass('IDV-CI-TEST-STEP', 'test:sc:integrations-dev en CI workflow');
} else {
  fail('IDV-CI-TEST-STEP', 'test:sc:integrations-dev no encontrado en CI');
}

// ─────────────────────────────────────────────────────────────────────────────
// RESUMEN
// ─────────────────────────────────────────────────────────────────────────────

const passed = checks.filter(c => c.status === 'pass').length;
const warned = checks.filter(c => c.status === 'warn').length;
const failed = checks.filter(c => c.status === 'fail').length;

// Estado de Fase 11C
const allOfflineReady = failed === 0 && Object.values(integrationStates).every(s => s !== 'INTEGRATIONS_INCOMPLETE');
const integrationStatus = failed > 0 ? 'INTEGRATIONS_INCOMPLETE'
  : Object.values(integrationStates).some(s => s === 'DEV_VALIDATED') ? 'INTEGRATIONS_DEV_PARTIALLY_VALIDATED'
  : 'INTEGRATIONS_OFFLINE_READY';

const output = {
  gate: 'GATE_1',
  phase: '11C1',
  integration_status: integrationStatus,
  integrations: integrationStates,
  checks: checks.map(c => ({ id: c.id, status: c.status, description: c.msg })),
  warnings: warnings.map(w => ({ id: w.id, msg: w.msg })),
  blockers: blockers.map(b => ({ id: b.id, msg: b.msg })),
  note: 'No se imprimieron secretos, tokens, URLs privadas ni PII',
};

process.stderr.write('\n');
process.stderr.write('════════════════════════════════════════════════════════════\n');
process.stderr.write('VALIDATE DEV INTEGRATIONS — SmartConversations Fase 11C1\n');
process.stderr.write('════════════════════════════════════════════════════════════\n');
process.stderr.write(`  ✅ Passed  : ${passed}\n`);
process.stderr.write(`  ⚠️  Warned  : ${warned}\n`);
process.stderr.write(`  ❌ Failed  : ${failed}\n`);
process.stderr.write('\n');
if (blockers.length > 0) {
  process.stderr.write('Blockers:\n');
  for (const b of blockers) process.stderr.write(`  ❌ ${b.id}: ${b.msg}\n`);
  process.stderr.write('\n');
}
process.stderr.write(`📋 Estado Fase 11C1: ${integrationStatus}\n`);
process.stderr.write('   GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING\n');
process.stderr.write('\n');

console.log(JSON.stringify(output, null, 2));

process.exit(failed > 0 ? 1 : 0);
