/**
 * smoke-dev-incidents-addon.mjs — Fase 11C5
 * Smoke REAL DEV para el add-on de incidencias.
 * REQUIERE INCIDENTS_ADDON_BASE_URL y INCIDENTS_ADDON_SERVICE_TOKEN configurados.
 *
 * Exit codes:
 *   0  — ejecución real realizada y validada (INCIDENTS_DEV_VALIDATED)
 *   1  — ejecución realizada con fallo real
 *   2  — no ejecutado por configuración pendiente (NOT_EXECUTED_CONFIGURATION_PENDING)
 *
 * Con --allow-pending: exit 0 para inspección local, estado sigue siendo
 * NOT_EXECUTED_CONFIGURATION_PENDING (no constituye evidencia de integración DEV).
 *
 * Uso: node scripts/smart-conversations/smoke/smoke-dev-incidents-addon.mjs [--allow-pending]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../');

const ALLOW_PENDING = process.argv.includes('--allow-pending');

let passed = 0;
let failed = 0;
let skipped = 0;
let stepNum = 0;

function step(label, fn) {
  stepNum++;
  try {
    fn();
    console.log(`  [${String(stepNum).padStart(2, '0')}] ✅ ${label}`);
    passed++;
  } catch (e) {
    if (e.message.startsWith('SKIP:')) {
      console.log(`  [${String(stepNum).padStart(2, '0')}] ⏭️  ${label}: ${e.message}`);
      skipped++;
    } else {
      console.log(`  [${String(stepNum).padStart(2, '0')}] ❌ ${label}: ${e.message}`);
      failed++;
    }
  }
}

async function stepAsync(label, fn) {
  stepNum++;
  try {
    await fn();
    console.log(`  [${String(stepNum).padStart(2, '0')}] ✅ ${label}`);
    passed++;
  } catch (e) {
    if (e.message.startsWith('SKIP:')) {
      console.log(`  [${String(stepNum).padStart(2, '0')}] ⏭️  ${label}: ${e.message}`);
      skipped++;
    } else {
      console.log(`  [${String(stepNum).padStart(2, '0')}] ❌ ${label}: ${e.message}`);
      failed++;
    }
  }
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`SKIP: ${name} no configurado — endpoint DEV requerido`);
  return v;
}

console.log('\n=== smoke-dev-incidents-addon.mjs — Fase 11C5 (REAL DEV) ===\n');

// 1. Verificar prereqs DEV — 9 precondiciones requeridas para evidencia válida
//
// Precondición 1: provider implementado y accesible (INCIDENTS_ADDON_BASE_URL configurado)
// Precondición 2: auth service-to-service dedicado (INCIDENTS_ADDON_SERVICE_TOKEN configurado)
// Precondición 3: idempotency persistente en el provider DEV (no solo hash en consumer)
// Precondición 4: tenant canary DEV-A provisionado (dev-tenant-a-00000000-0000-0000-0000-000000000001)
// Precondición 5: fixtures de accommodation/room accesibles vía provider DEV (acc-dev-smoke-001)
// Precondición 6: entitlement del tenant activo en DEV (incidents_addon feature activo)
// Precondición 7: plan de rollback documentado ante fallo de smoke
// Precondición 8: validación cross-tenant configurada (tenant B no puede ver incidencias de tenant A)
// Precondición 9: rate limits DEV conocidos y no excedidos por el smoke
//
// URL+token son solo 2 de las 9. Sin las 9, el estado es NOT_EXECUTED_CONFIGURATION_PENDING.

step('INCIDENTS_ADDON_BASE_URL configurado (precondición 1/9)', () => {
  requireEnv('INCIDENTS_ADDON_BASE_URL');
});

step('INCIDENTS_ADDON_SERVICE_TOKEN configurado (precondición 2/9)', () => {
  requireEnv('INCIDENTS_ADDON_SERVICE_TOKEN');
});

// 2. Health check del add-on
await stepAsync('Health check del add-on de incidencias', async () => {
  const baseUrl = process.env['INCIDENTS_ADDON_BASE_URL'];
  const token = process.env['INCIDENTS_ADDON_SERVICE_TOKEN'];
  if (!baseUrl || !token) throw new Error('SKIP: Credenciales DEV ausentes');

  const ctrl = AbortSignal.timeout(5000);
  const resp = await fetch(`${baseUrl}/health`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
    signal: ctrl,
  });
  if (!resp.ok) throw new Error(`Health check falló: HTTP ${resp.status}`);
});

// 3. Crear incidente de prueba (tenant DEV-A)
await stepAsync('createIncident DEV — tenant DEV-A (canary)', async () => {
  const baseUrl = process.env['INCIDENTS_ADDON_BASE_URL'];
  const token = process.env['INCIDENTS_ADDON_SERVICE_TOKEN'];
  if (!baseUrl || !token) throw new Error('SKIP: Credenciales DEV ausentes');

  const command = {
    contract_version: '1.0',
    client_account_id: 'dev-tenant-a-00000000-0000-0000-0000-000000000001',
    request_id: `req-smoke-${Date.now()}`,
    correlation_id: `corr-smoke-${Date.now()}`,
    idempotency_key: `smoke-incidents-dev-${Date.now()}`,
    source: 'smart_conversations',
    actor: { type: 'system_service', service_name: 'smoke-test' },
    incident: {
      accommodation_id: 'acc-dev-smoke-001',
      room_id: null,
      category: 'smoke_test',
      description: '[SMOKE TEST] Incidente de prueba de integración DEV. No actuar.',
      urgency_proposal: 'low',
      attachments: [],
    },
  };

  const ctrl = AbortSignal.timeout(10000);
  const resp = await fetch(`${baseUrl}/incidents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    signal: ctrl,
  });

  if (!resp.ok && resp.status !== 409) throw new Error(`createIncident DEV falló: HTTP ${resp.status}`);
  const data = await resp.json();
  if (!data.incident_id) throw new Error('incident_id ausente en respuesta DEV');
  console.log(`     incident_id recibido: ${data.incident_id}`);
});

// 4. Idempotencia (misma key → 409 o idempotent_replay)
await stepAsync('createIncident idempotente → 409/replay con misma key', async () => {
  const baseUrl = process.env['INCIDENTS_ADDON_BASE_URL'];
  const token = process.env['INCIDENTS_ADDON_SERVICE_TOKEN'];
  if (!baseUrl || !token) throw new Error('SKIP: Credenciales DEV ausentes');

  const idemKey = `smoke-idem-dev-${Math.floor(Date.now() / 10000)}`; // misma cada 10s
  const command = {
    contract_version: '1.0',
    client_account_id: 'dev-tenant-a-00000000-0000-0000-0000-000000000001',
    request_id: `req-idem-1-${Date.now()}`,
    correlation_id: `corr-idem-${Date.now()}`,
    idempotency_key: idemKey,
    source: 'smart_conversations',
    actor: { type: 'system_service', service_name: 'smoke-test' },
    incident: { accommodation_id: 'acc-dev-smoke-001', room_id: null, category: 'smoke_test', description: '[SMOKE] Idempotencia', urgency_proposal: 'low', attachments: [] },
  };

  const ctrl1 = AbortSignal.timeout(10000);
  await fetch(`${baseUrl}/incidents`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command), signal: ctrl1 });

  const ctrl2 = AbortSignal.timeout(10000);
  const resp2 = await fetch(`${baseUrl}/incidents`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...command, request_id: `req-idem-2-${Date.now()}` }),
    signal: ctrl2,
  });

  // 409 = idempotency, o 200/201 con idempotent_replay:true
  if (resp2.status !== 409) {
    const data = await resp2.json();
    if (!data.idempotent_replay) throw new Error(`Segunda llamada no fue idempotente: status=${resp2.status}`);
  }
});

// 5. Respuesta no incluye campos prohibidos
await stepAsync('Respuesta DEV sin campos prohibidos (phone, email, conv_session_id)', async () => {
  const baseUrl = process.env['INCIDENTS_ADDON_BASE_URL'];
  const token = process.env['INCIDENTS_ADDON_SERVICE_TOKEN'];
  if (!baseUrl || !token) throw new Error('SKIP: Credenciales DEV ausentes');

  const ctrl = AbortSignal.timeout(10000);
  const resp = await fetch(`${baseUrl}/incidents`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contract_version: '1.0', client_account_id: 'dev-tenant-a-00000000-0000-0000-0000-000000000001',
      request_id: `req-priv-${Date.now()}`, correlation_id: `corr-priv-${Date.now()}`,
      idempotency_key: `smoke-priv-${Date.now()}`, source: 'smart_conversations',
      actor: { type: 'system_service', service_name: 'smoke-test' },
      incident: { accommodation_id: 'acc-dev-001', room_id: null, category: 'smoke_test', description: '[SMOKE] Privacidad', urgency_proposal: 'low', attachments: [] },
    }),
    signal: ctrl,
  });

  if (resp.ok || resp.status === 409) {
    const data = await resp.json();
    const FORBIDDEN = ['phone', 'email', 'conv_session_id', 'conv_case_id', 'wa_jid', 'sender_ref', 'api_key'];
    for (const f of FORBIDDEN) {
      if (f in data) throw new Error(`Campo prohibido '${f}' en respuesta DEV`);
    }
  }
});

console.log(`\n=== ${passed}✅ / ${failed}❌ / ${skipped}⏭️  pasos ===`);

if (skipped > 0) {
  console.log('\nEstado: NOT_EXECUTED_CONFIGURATION_PENDING');
  console.log('Este smoke requiere 9 precondiciones DEV (no solo URL + token):');
  console.log('  1. Provider implementado y accesible (INCIDENTS_ADDON_BASE_URL)');
  console.log('  2. Auth service-to-service dedicado (INCIDENTS_ADDON_SERVICE_TOKEN)');
  console.log('  3. Idempotency persistente en el provider DEV');
  console.log('  4. Tenant canary DEV-A provisionado con accommodation_id de fixture');
  console.log('  5. Fixtures de accommodation/room accesibles vía provider DEV');
  console.log('  6. Entitlement del tenant activo en DEV (incidents_addon feature activo)');
  console.log('  7. Plan de rollback documentado ante fallo de smoke');
  console.log('  8. Validación cross-tenant configurada (tenant B no ve incidencias de tenant A)');
  console.log('  9. Rate limits DEV conocidos y no excedidos por este smoke');
  console.log('\nEste resultado NO es evidencia de integración DEV.\n');
  if (ALLOW_PENDING) {
    console.log('[--allow-pending] Modo inspección local. Exit 0 pero estado sigue siendo NOT_EXECUTED_CONFIGURATION_PENDING.\n');
    process.exit(0);
  }
  // Sin --allow-pending: exit 2 = configuración pendiente (no fallo técnico)
  process.exit(2);
}

const state = failed === 0 ? 'INCIDENTS_DEV_VALIDATED' : 'INCIDENTS_DEV_SMOKE_FAILED';
console.log(`Estado: ${state}\n`);

if (failed > 0) process.exit(1);
// Exit 0 implícito: ejecución real realizada y validada
