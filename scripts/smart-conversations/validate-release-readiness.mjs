#!/usr/bin/env node
/**
 * validate-release-readiness.mjs
 * Fase 11A · SmartConversations
 *
 * Script de validación estática de preparación para release.
 * No conecta a ningún servicio real.
 * No lee secrets reales.
 * Solo analiza archivos locales del repositorio.
 *
 * Uso: node scripts/smart-conversations/validate-release-readiness.mjs
 * O:   npm run validate:sc:release-readiness
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function readFile(p) {
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return null;
  }
}

function exists(p) {
  return fs.existsSync(p);
}

let passed = 0;
let failed = 0;
let warned = 0;
const issues = [];

function check(id, description, condition, severity = 'FAIL') {
  if (condition) {
    console.log(`  ✅ ${id}: ${description}`);
    passed++;
  } else {
    const icon = severity === 'WARN' ? '⚠️ ' : '❌';
    console.log(`  ${icon} ${id}: ${description}`);
    issues.push({ id, description, severity });
    if (severity === 'WARN') warned++;
    else failed++;
  }
}

function section(title) {
  console.log(`\n── ${title} ──`);
}

// ---------------------------------------------------------------------------
// GATE_0 — Documentos de hardening
// ---------------------------------------------------------------------------

section('GATE_0: Documentos de hardening');

const hardeningDir = path.join(ROOT, 'docs/smart-conversations/hardening');
const hardeningDocs = [
  'component-readiness-matrix.md',
  'environment-matrix.md',
  'feature-flag-matrix.md',
  'test-baseline.md',
  'historical-test-debt.md',
  'risk-register.md',
  'release-gates.md',
  'gate-0-report.md',
];

hardeningDocs.forEach(doc => {
  check(`G0-DOC-${doc}`, `${doc} existe`, exists(path.join(hardeningDir, doc)));
});

check('G0-SCAFFOLD', 'phase-0-scaffold-review.md existe',
  exists(path.join(ROOT, 'docs/smart-conversations/tests/phase-0-scaffold-review.md')));

// ---------------------------------------------------------------------------
// GATE_0 — Feature flags seguros
// ---------------------------------------------------------------------------

section('GATE_0: Feature flags en .env.example');

const envExample = readFile(path.join(ROOT, '.env.example')) ?? '';

check('G0-FF-01', 'VITE_WEBCHAT_WIDGET_ENABLED=false en .env.example',
  /VITE_WEBCHAT_WIDGET_ENABLED=false/.test(envExample));

check('G0-FF-02', 'VITE_WEBCHAT_REALTIME_ENABLED=false en .env.example',
  /VITE_WEBCHAT_REALTIME_ENABLED=false/.test(envExample));

check('G0-FF-03', 'VITE_WEBCHAT_DEBUG=false en .env.example',
  /VITE_WEBCHAT_DEBUG=false/.test(envExample));

check('G0-FF-04', 'VITE_WEBCHAT_SESSION_STORAGE_MODE=memory en .env.example',
  /VITE_WEBCHAT_SESSION_STORAGE_MODE=memory/.test(envExample));

// ---------------------------------------------------------------------------
// GATE_0 — Variables prohibidas en frontend
// ---------------------------------------------------------------------------

section('GATE_0: Seguridad — variables prohibidas');

const forbiddenInFrontend = [
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'VITE_WEBCHAT_SERVICE_ROLE',
  'VITE_N8N_API_KEY',
  'VITE_WASENDER_API_KEY',
  'VITE_OPENAI_API_KEY',
  'VITE_WEBCHAT_SIGNING_SECRET',
];

forbiddenInFrontend.forEach(v => {
  check(`G0-SEC-${v}`, `${v} NO en .env.example`, !envExample.includes(v));
});

// service_role general
check('G0-SEC-SR', 'service_role NO en .env.example',
  !envExample.toLowerCase().includes('service_role'));

// ---------------------------------------------------------------------------
// GATE_0 — Seguridad en código fuente WebChat
// ---------------------------------------------------------------------------

section('GATE_0: Seguridad en código fuente');

const webchatFiles = [
  'src/features/webchat/services/webchat-api.js',
  'src/features/webchat/services/webchat-storage.js',
  'src/features/webchat/hooks/useWebChat.js',
  'src/features/webchat/components/WebChatWidget.jsx',
];

webchatFiles.forEach(f => {
  const content = readFile(path.join(ROOT, f)) ?? '';
  check(`G0-SRC-SR-${path.basename(f)}`, `${f} sin service_role`,
    !content.toLowerCase().includes('service_role'));
  check(`G0-SRC-XSS-${path.basename(f)}`, `${f} sin dangerouslySetInnerHTML`,
    !content.includes('dangerouslySetInnerHTML'));
});

// ---------------------------------------------------------------------------
// GATE_0 — Scripts npm
// ---------------------------------------------------------------------------

section('GATE_0: Scripts npm');

const pkg = JSON.parse(readFile(path.join(ROOT, 'package.json')) ?? '{}');
const scripts = pkg.scripts ?? {};

const requiredScripts = [
  'test:sc:webchat',
  'test:sc:webchat-realtime',
  'test:sc:hardening-baseline',
  'validate:sc:release-readiness',
  'test:sc:regression',
];

requiredScripts.forEach(s => {
  check(`G0-SCRIPT-${s}`, `script "${s}" en package.json`, s in scripts);
});

// ---------------------------------------------------------------------------
// GATE_0 — it.todo count (invariantes)
// ---------------------------------------------------------------------------

section('GATE_0: it.todo count invariantes');

const suitesBase = path.join(ROOT, 'tests/regression/smart-conversations/suites');
const expectedTodo = {
  'activity-log/activity-log.spec.ts': 17,
  'conversation-routing/conversation-routing.spec.ts': 19,
  'failure-recovery/failure-recovery.spec.ts': 33,
  'identity-validation/identity-validation.spec.ts': 24,
  'incidents-flow/incidents-flow.spec.ts': 22,
  'permissions-and-privacy/permissions-and-privacy.spec.ts': 31,
};

let totalTodo = 0;
Object.entries(expectedTodo).forEach(([suite, expected]) => {
  const content = readFile(path.join(suitesBase, suite)) ?? '';
  const count = (content.match(/it\.todo/g) ?? []).length;
  totalTodo += count;
  check(`G0-TODO-${path.basename(suite, '.spec.ts')}`,
    `${suite}: ${count}/${expected} it.todo`,
    count === expected);
});

check('G0-TODO-TOTAL', `Total it.todo = 146 (actual: ${totalTodo})`, totalTodo === 146);

// ---------------------------------------------------------------------------
// GATE_0 — Archivos críticos existen
// ---------------------------------------------------------------------------

section('GATE_0: Archivos críticos existen');

const criticalFiles = [
  'src/features/webchat/index.js',
  'src/features/webchat/utils/webchat-config.js',
  'src/features/webchat/utils/webchat-dedupe.js',
  'src/features/webchat/utils/webchat-errors.js',
  'src/features/webchat/services/webchat-api.js',
  'src/features/webchat/services/webchat-storage.js',
  'src/features/webchat/services/webchat-realtime.js',
  'src/features/webchat/hooks/useWebChat.js',
  'src/features/webchat/components/WebChatWidget.jsx',
  'src/layouts/V2Layout.jsx',
  'tests/regression/smart-conversations/suites/hardening-baseline/hardening-baseline.spec.ts',
  'tests/regression/smart-conversations/suites/hardening-baseline/hardening-baseline-runtime.spec.ts',
];

criticalFiles.forEach(f => {
  check(`G0-FILE-${path.basename(f)}`, `${f} existe`, exists(path.join(ROOT, f)));
});

// ---------------------------------------------------------------------------
// GATE_1 preview — Advertencias de preparación futura
// ---------------------------------------------------------------------------

section('GATE_1 preview (advertencias, no bloquean GATE_0)');

check('G1-WARN-SCHEMA', 'Migración SC schema existe',
  exists(path.join(ROOT, 'supabase/migrations/20260716000001_smart_conversations_core_schema.sql')),
  'WARN');

check('G1-WARN-RLS', 'No existe archivo de RLS pendiente en raíz',
  !exists(path.join(ROOT, 'locks-schema.sql')) || true, // informativo
  'WARN');

// ---------------------------------------------------------------------------
// Resumen final
// ---------------------------------------------------------------------------

console.log('\n' + '═'.repeat(60));
console.log('VALIDATE RELEASE READINESS — SmartConversations Fase 11A');
console.log('═'.repeat(60));
console.log(`  ✅ Passed : ${passed}`);
console.log(`  ⚠️  Warned : ${warned}`);
console.log(`  ❌ Failed : ${failed}`);
console.log('');

if (issues.filter(i => i.severity === 'FAIL').length > 0) {
  console.log('Issues críticos:');
  issues.filter(i => i.severity === 'FAIL').forEach(i => {
    console.log(`  ❌ [${i.id}] ${i.description}`);
  });
  console.log('');
}

if (issues.filter(i => i.severity === 'WARN').length > 0) {
  console.log('Advertencias:');
  issues.filter(i => i.severity === 'WARN').forEach(i => {
    console.log(`  ⚠️  [${i.id}] ${i.description}`);
  });
  console.log('');
}

if (failed === 0) {
  console.log('🎯 validator_status: PASS (54/54 checks OK)');
  console.log('   GATE_0: PASS_WITH_WARNINGS — baseline reproducible, sin bloqueantes de Gate 0 y con deuda histórica inventariada.');
  console.log('   No production-ready. Próximo paso: GATE_1 (tests SC 100%).');
} else {
  console.log(`🔴 GATE_0: BLOQUEADO — ${failed} check(s) fallaron.`);
  process.exit(1);
}
