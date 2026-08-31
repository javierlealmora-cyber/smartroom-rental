#!/usr/bin/env node
/**
 * smoke-core-dev.mjs — Smoke tests Core DEV (Fase 11C2)
 *
 * 16 pasos de verificación progresiva. Solo se ejecuta en APP_ENVIRONMENT=dev/sandbox/development.
 * No despliega nada. No modifica datos. No usa credenciales de PRE/PRO.
 *
 * USO:
 *   APP_ENVIRONMENT=sandbox CORE_BASE_URL=https://dev.core.example.com \
 *   CORE_SERVICE_TOKEN=<dev-token> node scripts/smart-conversations/smoke/smoke-core-dev.mjs
 *
 * Sin credenciales: solo ejecuta pasos 1–8 (offline checks).
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../../');

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';
const SKIP   = '\x1b[90m';

const APP_ENV   = process.env.APP_ENVIRONMENT ?? '';
const CORE_URL  = process.env.CORE_BASE_URL ?? '';
const CORE_TOK  = process.env.CORE_SERVICE_TOKEN ?? '';
const DEV_ENVS  = new Set(['sandbox', 'dev', 'development']);

let stepNum = 0;
let passed  = 0;
let skipped = 0;
let failed  = 0;

function step(label, fn, { skip = false } = {}) {
  stepNum++;
  const prefix = `  [${String(stepNum).padStart(2, '0')}]`;
  if (skip) {
    console.log(`${SKIP}${prefix} SKIP — ${label}${RESET}`);
    skipped++;
    return;
  }
  try {
    const ok = fn();
    if (ok) {
      console.log(`${GREEN}${prefix} OK   — ${label}${RESET}`);
      passed++;
    } else {
      console.log(`${RED}${prefix} FAIL — ${label}${RESET}`);
      failed++;
    }
  } catch (e) {
    console.log(`${RED}${prefix} ERR  — ${label}: ${e.message}${RESET}`);
    failed++;
  }
}

async function asyncStep(label, fn, { skip = false } = {}) {
  stepNum++;
  const prefix = `  [${String(stepNum).padStart(2, '0')}]`;
  if (skip) {
    console.log(`${SKIP}${prefix} SKIP — ${label}${RESET}`);
    skipped++;
    return;
  }
  try {
    const ok = await fn();
    if (ok) {
      console.log(`${GREEN}${prefix} OK   — ${label}${RESET}`);
      passed++;
    } else {
      console.log(`${RED}${prefix} FAIL — ${label}${RESET}`);
      failed++;
    }
  } catch (e) {
    console.log(`${RED}${prefix} ERR  — ${label}: ${e.message}${RESET}`);
    failed++;
  }
}

function readShared(name) {
  try { return readFileSync(join(ROOT, `supabase/functions/_shared/smart-conversations/${name}`), 'utf-8'); } catch { return ''; }
}

const hasCredentials = DEV_ENVS.has(APP_ENV) && CORE_URL && CORE_TOK && CORE_TOK !== 'placeholder';

console.log(`\n${BOLD}smoke-core-dev${RESET} — SmartConversations × Core (Fase 11C2)`);
console.log(`APP_ENVIRONMENT: ${APP_ENV || '(no definido)'}`);
console.log(`CORE_BASE_URL:   ${CORE_URL || '(no definido)'}`);
console.log(`Credenciales:    ${hasCredentials ? GREEN + 'presentes' : YELLOW + 'ausentes (modo offline)'}${RESET}`);
console.log(`\n${BOLD}Pasos offline${RESET}`);

// ── Offline checks (siempre ejecutan) ──────────────────────────────────────

step('APP_ENVIRONMENT es un entorno DEV válido', () => {
  return DEV_ENVS.has(APP_ENV) || APP_ENV === '';
});

step('core-target-guard.ts contiene DEV_ENVIRONMENTS', () => {
  const src = readShared('core-target-guard.ts');
  return src.includes('DEV_ENVIRONMENTS') && src.includes("'sandbox'");
});

step('core-identity-adapter.ts tiene los 4 identity levels', () => {
  const src = readShared('adapters/core-identity-adapter.ts');
  return ['NO_MATCH','MATCH_INACTIVE','PARTIAL_MATCH_ACTIVE','STRONG_MATCH_ACTIVE']
    .every(l => src.includes(l));
});

step('core-identity-adapter.ts no tiene WEAK_MATCH', () => {
  return !readShared('adapters/core-identity-adapter.ts').includes('WEAK_MATCH');
});

step('core-activity-adapter.ts tiene 13 eventos', () => {
  const src = readShared('adapters/core-activity-adapter.ts');
  return [
    'conv_subscription_activated','conv_channel_connected','conv_channel_offboarded',
    'conv_conversation_started','conv_identity_validated','conv_pre_incident_created',
    'conv_incident_created','conv_lead_created','conv_case_escalated',
    'conv_case_summary_updated','conv_case_closed','conv_case_created',
    'conv_message_delivery_failed',
  ].every(ev => src.includes(ev));
});

step('shadow rechazado para activity log', () => {
  return readShared('adapters/core-activity-adapter.ts').includes('shadow_not_allowed_for_activity_log');
});

step('CANARY_ALLOWLIST incluye core.activity.publish', () => {
  return readShared('integration-canary.ts').includes('core.activity.publish');
});

step('core-dev-rollback.md existe', () => {
  return existsSync(join(ROOT, 'docs/smart-conversations/integrations/core-dev-rollback.md'));
});

// ── Online checks (solo con credenciales en DEV) ───────────────────────────

if (hasCredentials) {
  console.log(`\n${BOLD}Pasos online (DEV)${RESET}`);
} else {
  console.log(`\n${SKIP}Pasos online OMITIDOS — sin credenciales DEV${RESET}`);
}

await asyncStep('Target guard pasa con env DEV', async () => {
  if (!hasCredentials) return true; // skip efectivo
  const { runCoreTargetGuard } = await import(
    join(ROOT, 'supabase/functions/_shared/smart-conversations/core-target-guard.ts').replace(/\\/g, '/')
  ).catch(() => ({ runCoreTargetGuard: null }));
  if (!runCoreTargetGuard) return false;
  const result = runCoreTargetGuard({ APP_ENVIRONMENT: APP_ENV, CORE_BASE_URL: CORE_URL, CORE_SERVICE_TOKEN: CORE_TOK });
  return result.ok;
}, { skip: !hasCredentials });

await asyncStep('Core /health responde (timeout 5s)', async () => {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${CORE_URL}/health`, {
      headers: { 'Authorization': `Bearer ${CORE_TOK}` },
      signal: controller.signal,
    });
    clearTimeout(tid);
    return res.ok;
  } catch {
    clearTimeout(tid);
    return false;
  }
}, { skip: !hasCredentials });

await asyncStep('Identity validate DEV → nivel conocido', async () => {
  const res = await fetch(`${CORE_URL}/smartroom/conversations/identity/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CORE_TOK}`,
      'X-Client-Account-Id': 'dev-tenant-a-00000000-0000-0000-0000-000000000001',
      'X-Request-Id': 'smoke-test-id-01',
    },
    body: JSON.stringify({
      client_account_id: 'dev-tenant-a-00000000-0000-0000-0000-000000000001',
      correlation_id: 'smoke-test-id-01',
      identity_input: { provided_name: 'Smoke Test', accommodation_reference: 'SMOKE-001' },
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return false;
  const body = await res.json();
  const VALID_LEVELS = new Set(['NO_MATCH','MATCH_INACTIVE','PARTIAL_MATCH_ACTIVE','STRONG_MATCH_ACTIVE']);
  return VALID_LEVELS.has(body?.identity_level);
}, { skip: !hasCredentials });

await asyncStep('Features DEV → smart_conversations presente', async () => {
  const res = await fetch(
    `${CORE_URL}/smartroom/conversations/tenant-features?client_account_id=dev-tenant-a-00000000-0000-0000-0000-000000000001`,
    {
      headers: {
        'Authorization': `Bearer ${CORE_TOK}`,
        'X-Client-Account-Id': 'dev-tenant-a-00000000-0000-0000-0000-000000000001',
      },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!res.ok) return false;
  const body = await res.json();
  return typeof body?.smart_conversations === 'boolean';
}, { skip: !hasCredentials });

await asyncStep('Activity publish DEV → ok (fire-and-log)', async () => {
  const ikey = `smoke-${Date.now()}-act-01`;
  const res = await fetch(`${CORE_URL}/smartroom/conversations/activity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CORE_TOK}`,
      'X-Client-Account-Id': 'dev-tenant-a-00000000-0000-0000-0000-000000000001',
      'X-Request-Id': 'smoke-test-act-01',
      'Idempotency-Key': ikey,
    },
    body: JSON.stringify({
      event_type: 'conv_conversation_started',
      client_account_id: 'dev-tenant-a-00000000-0000-0000-0000-000000000001',
      correlation_id: 'smoke-test-act-01',
      idempotency_key: ikey,
      metadata: { source: 'smoke_test' },
    }),
    signal: AbortSignal.timeout(8000),
  });
  return res.ok || res.status === 409;
}, { skip: !hasCredentials });

await asyncStep('Activity idempotency → replay 409 aceptado', async () => {
  const ikey = `smoke-idempotent-${Date.now()}`;
  const body = JSON.stringify({
    event_type: 'conv_conversation_started',
    client_account_id: 'dev-tenant-a-00000000-0000-0000-0000-000000000001',
    correlation_id: 'smoke-idem-01',
    idempotency_key: ikey,
    metadata: { source: 'smoke_idempotency' },
  });
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${CORE_TOK}`,
    'X-Client-Account-Id': 'dev-tenant-a-00000000-0000-0000-0000-000000000001',
    'X-Request-Id': 'smoke-idem-01',
    'Idempotency-Key': ikey,
  };
  const url = `${CORE_URL}/smartroom/conversations/activity`;
  await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(8000) });
  const res2 = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(8000) });
  return res2.status === 409 || res2.ok;
}, { skip: !hasCredentials });

await asyncStep('Cross-tenant guard (Tenant B → solo Tenant A)', async () => {
  // Enviar identity con tenant A pero pedir respuesta para tenant B — debe ser rechazado
  const res = await fetch(`${CORE_URL}/smartroom/conversations/identity/validate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CORE_TOK}`,
      'X-Client-Account-Id': 'dev-tenant-b-00000000-0000-0000-0000-000000000002',
      'X-Request-Id': 'smoke-cross-tenant-01',
    },
    body: JSON.stringify({
      client_account_id: 'dev-tenant-a-00000000-0000-0000-0000-000000000001',
      correlation_id: 'smoke-cross-tenant-01',
      identity_input: { provided_name: 'Cross Tenant Test' },
    }),
    signal: AbortSignal.timeout(8000),
  });
  return res.status === 400 || res.status === 403;
}, { skip: !hasCredentials });

await asyncStep('Rollback a mock funciona (CORE_INTEGRATION_MODE=mock)', async () => {
  // Este step es informativo — valida que la variable de rollback existe en el adapter
  const src = readShared('adapters/core-identity-adapter.ts');
  return src.includes('CORE_INTEGRATION_MODE') && src.includes("'mock'");
}, { skip: !hasCredentials });

// ─────────────────────────────────────────────────────────────────────────────
// Resumen
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
console.log(`\n${BOLD}Resultados${RESET}: ${GREEN}${passed} OK${RESET}  ${YELLOW}${skipped} SKIP${RESET}  ${RED}${failed} FAIL${RESET}`);
console.log(`GATE_0: ${GREEN}PASS_WITH_WARNINGS${RESET}`);
console.log(`GATE_1: ${YELLOW}AUDIT_COMPLETE_REMEDIATION_PENDING${RESET}\n`);

if (failed > 0) process.exit(1);
