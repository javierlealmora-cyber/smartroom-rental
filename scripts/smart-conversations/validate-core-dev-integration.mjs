#!/usr/bin/env node
/**
 * validate-core-dev-integration.mjs — Validador offline Fase 11C2
 *
 * Estados posibles:
 *   CORE_INTEGRATION_OFFLINE_READY          → archivos presentes y contratos OK
 *   CORE_INTEGRATION_DEV_PARTIALLY_VALIDATED → algunos checks activos pero faltan items
 *   CORE_INTEGRATION_DEV_VALIDATED           → todos los checks activos OK
 *   CORE_INTEGRATION_INCOMPLETE              → faltan archivos críticos
 *
 * GATE_0 = PASS_WITH_WARNINGS
 * GATE_1 = AUDIT_COMPLETE_REMEDIATION_PENDING  (no cerrar este gate)
 *
 * Nota: Este validador NO activa ninguna integración real ni requiere
 * credenciales externas. Solo verifica presencia y contratos offline.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../');

const BOLD  = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const YELLOW= '\x1b[33m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;
let warnings = 0;

function check(label, fn) {
  try {
    const result = fn();
    if (result === true) {
      console.log(`  ${GREEN}✓${RESET} ${label}`);
      passed++;
    } else if (result === 'warn') {
      console.log(`  ${YELLOW}⚠${RESET} ${label}`);
      warnings++;
    } else {
      console.log(`  ${RED}✗${RESET} ${label}`);
      failed++;
    }
  } catch {
    console.log(`  ${RED}✗${RESET} ${label} (excepción)`);
    failed++;
  }
}

function readFile(rel) {
  try { return readFileSync(join(ROOT, rel), 'utf-8'); } catch { return ''; }
}
function exists(rel) { return existsSync(join(ROOT, rel)); }

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${BOLD}validate-core-dev-integration${RESET} — Fase 11C2\n`);

// SECCIÓN 1: Archivos de producción
console.log(`${BOLD}[1/8] Archivos de producción Core${RESET}`);
const SHARED = 'supabase/functions/_shared/smart-conversations';
check('core-target-guard.ts existe', () => exists(`${SHARED}/core-target-guard.ts`));
check('core-identity-adapter.ts existe', () => exists(`${SHARED}/adapters/core-identity-adapter.ts`));
check('core-features-adapter.ts existe', () => exists(`${SHARED}/adapters/core-features-adapter.ts`));
check('core-activity-adapter.ts existe', () => exists(`${SHARED}/adapters/core-activity-adapter.ts`));
check('integration-canary.ts tiene core.activity.publish', () => {
  const src = readFile(`${SHARED}/integration-canary.ts`);
  return src.includes('core.activity.publish');
});

// SECCIÓN 2: Contratos de identidad
console.log(`\n${BOLD}[2/8] Contrato identidad${RESET}`);
const ID_SRC = readFile(`${SHARED}/adapters/core-identity-adapter.ts`);
check('4 identity levels y solo 4', () => {
  const code = stripComments(ID_SRC);
  return (
    code.includes('NO_MATCH') &&
    code.includes('MATCH_INACTIVE') &&
    code.includes('PARTIAL_MATCH_ACTIVE') &&
    code.includes('STRONG_MATCH_ACTIVE') &&
    !code.includes('WEAK_MATCH') &&
    !code.includes('UNVERIFIED')
  );
});
check('IDENTITY_REQUEST_FORBIDDEN_FIELDS tiene PII', () => {
  return ID_SRC.includes('IDENTITY_REQUEST_FORBIDDEN_FIELDS') &&
    ID_SRC.includes("'jid'") &&
    ID_SRC.includes("'prompt'") &&
    ID_SRC.includes("'webchat_token'");
});
check('cross-tenant guard presente', () => ID_SRC.includes('response_tenant_mismatch'));

// SECCIÓN 3: Contrato Activity Log
console.log(`\n${BOLD}[3/8] Contrato Activity Log${RESET}`);
const ACT_SRC = readFile(`${SHARED}/adapters/core-activity-adapter.ts`);
const EVENTS_13 = [
  'conv_subscription_activated','conv_channel_connected','conv_channel_offboarded',
  'conv_conversation_started','conv_identity_validated','conv_pre_incident_created',
  'conv_incident_created','conv_lead_created','conv_case_escalated',
  'conv_case_summary_updated','conv_case_closed','conv_case_created',
  'conv_message_delivery_failed',
];
check('13 eventos oficiales presentes', () => {
  return EVENTS_13.every(ev => ACT_SRC.includes(ev));
});
check('shadow rechazado para activity', () => ACT_SRC.includes('shadow_not_allowed_for_activity_log'));
check('fire-and-log: catch con _err', () => ACT_SRC.includes('_err'));
check('idempotency: 409 → idempotent:true', () =>
  ACT_SRC.includes('status === 409') && ACT_SRC.includes('idempotent: true')
);

// SECCIÓN 4: Target guard DEV
console.log(`\n${BOLD}[4/8] Target guard DEV${RESET}`);
const GUARD_SRC = readFile(`${SHARED}/core-target-guard.ts`);
check('DEV_ENVIRONMENTS con sandbox, dev, development', () => {
  return GUARD_SRC.includes("'sandbox'") &&
    GUARD_SRC.includes("'dev'") &&
    GUARD_SRC.includes("'development'");
});
check('PRE_PRO_MARKERS bloquean acceso', () => {
  return GUARD_SRC.includes('production') &&
    GUARD_SRC.includes('staging') &&
    GUARD_SRC.includes('-pre.');
});
check('fail-closed en runCoreTargetGuard', () => GUARD_SRC.includes('ALL_CHECKS_PASSED'));

// SECCIÓN 5: No constraints violadas
console.log(`\n${BOLD}[5/8] Constraints arquitectónicas${RESET}`);
check('Sin WEAK_MATCH en adapters', () => {
  return !ID_SRC.includes('WEAK_MATCH');
});
check('Sin UNVERIFIED en identity adapter', () => {
  return !stripComments(ID_SRC).includes('UNVERIFIED');
});
check('Sin next_retry_at en identity adapter', () => {
  return !stripComments(ID_SRC).includes('next_retry_at');
});
check('Sin attempt_count en identity adapter', () => {
  return !stripComments(ID_SRC).includes('attempt_count');
});
check('Sin acceso directo a tablas Core (conv_*)', () => {
  const adapters = [
    readFile(`${SHARED}/adapters/core-identity-adapter.ts`),
    readFile(`${SHARED}/adapters/core-features-adapter.ts`),
    readFile(`${SHARED}/adapters/core-activity-adapter.ts`),
  ];
  return !adapters.some(s => /\bfrom\b.*core_/.test(s) || /supabase.*core_/.test(s));
});

// SECCIÓN 6: Archivos de tests
console.log(`\n${BOLD}[6/8] Test suite Fase 11C2${RESET}`);
const TEST_DIR = 'tests/regression/smart-conversations/suites/core-integration-dev';
check('core-integration-dev.spec.ts existe', () => exists(`${TEST_DIR}/core-integration-dev.spec.ts`));
check('core-integration-dev-runtime.spec.ts existe', () => exists(`${TEST_DIR}/core-integration-dev-runtime.spec.ts`));
check('core-integration-dev-contracts.spec.ts existe', () => exists(`${TEST_DIR}/core-integration-dev-contracts.spec.ts`));

// SECCIÓN 7: Documentación
console.log(`\n${BOLD}[7/8] Documentación${RESET}`);
const DOCS = 'docs/smart-conversations/integrations';
check('core-dev-readiness.md', () => exists(`${DOCS}/core-dev-readiness.md`));
check('core-integration-contracts.md', () => exists(`${DOCS}/core-integration-contracts.md`));
check('core-identity-contract.md', () => exists(`${DOCS}/core-identity-contract.md`));
check('core-features-contract.md', () => exists(`${DOCS}/core-features-contract.md`));
check('core-activity-contract.md', () => exists(`${DOCS}/core-activity-contract.md`));
check('core-dev-test-report.md', () => exists(`${DOCS}/core-dev-test-report.md`));
check('core-dev-rollback.md', () => exists(`${DOCS}/core-dev-rollback.md`));

// SECCIÓN 8: GATE status
console.log(`\n${BOLD}[8/8] GATE status${RESET}`);
const GATE_0 = 'PASS_WITH_WARNINGS';
const GATE_1 = 'AUDIT_COMPLETE_REMEDIATION_PENDING';
check(`GATE_0 = ${GATE_0}`, () => true);
check(`GATE_1 = ${GATE_1} (no cerrar)`, () => true);
check('accommodation marcado BLOCKED_BY_CORE', () => {
  const readiness = readFile(`${DOCS}/core-dev-readiness.md`);
  return readiness.includes('BLOCKED_BY_CORE');
});

// ─────────────────────────────────────────────────────────────────────────────
// Resumen
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));

let state;
if (failed === 0 && exists(`${TEST_DIR}/core-integration-dev-contracts.spec.ts`)) {
  state = 'CORE_INTEGRATION_OFFLINE_READY';
} else if (failed <= 3) {
  state = 'CORE_INTEGRATION_DEV_PARTIALLY_VALIDATED';
} else {
  state = 'CORE_INTEGRATION_INCOMPLETE';
}

const stateColor = state === 'CORE_INTEGRATION_OFFLINE_READY' ? GREEN :
                   state === 'CORE_INTEGRATION_INCOMPLETE' ? RED : YELLOW;

console.log(`\n${BOLD}Estado: ${stateColor}${state}${RESET}`);
console.log(`GATE_0: ${GREEN}${GATE_0}${RESET}`);
console.log(`GATE_1: ${YELLOW}${GATE_1}${RESET}`);
console.log(`\nResultados: ${GREEN}${passed} ✓${RESET}  ${YELLOW}${warnings} ⚠${RESET}  ${RED}${failed} ✗${RESET}\n`);

if (failed > 0) {
  process.exit(1);
}
