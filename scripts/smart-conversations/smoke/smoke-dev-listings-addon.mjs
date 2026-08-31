/**
 * smoke-dev-listings-addon.mjs — Fase 11C5
 * Smoke REAL DEV para el add-on de publicaciones y leads.
 * REQUIERE LISTINGS_ADDON_BASE_URL y LISTINGS_ADDON_SERVICE_TOKEN configurados.
 *
 * Exit codes:
 *   0  — ejecución real realizada y validada (LISTINGS_DEV_VALIDATED)
 *   1  — ejecución realizada con fallo real
 *   2  — no ejecutado por configuración pendiente (NOT_EXECUTED_CONFIGURATION_PENDING)
 *
 * Con --allow-pending: exit 0 para inspección local, estado sigue siendo
 * NOT_EXECUTED_CONFIGURATION_PENDING (no constituye evidencia de integración DEV).
 *
 * Uso: node scripts/smart-conversations/smoke/smoke-dev-listings-addon.mjs [--allow-pending]
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

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`SKIP: ${name} no configurado — endpoint DEV requerido`);
  return v;
}

const LISTING_PRIVATE_FIELDS = new Set([
  'owner_id', 'owner_phone', 'owner_email', 'tenant_ids',
  'private_address', 'financial_data', 'internal_notes',
]);

console.log('\n=== smoke-dev-listings-addon.mjs — Fase 11C5 (REAL DEV) ===\n');

// 1. Prereqs
step('LISTINGS_ADDON_BASE_URL configurado', () => requireEnv('LISTINGS_ADDON_BASE_URL'));
step('LISTINGS_ADDON_SERVICE_TOKEN configurado', () => requireEnv('LISTINGS_ADDON_SERVICE_TOKEN'));

// 2. Health check
await stepAsync('Health check del add-on de publicaciones', async () => {
  const baseUrl = process.env['LISTINGS_ADDON_BASE_URL'];
  const token = process.env['LISTINGS_ADDON_SERVICE_TOKEN'];
  if (!baseUrl || !token) throw new Error('SKIP: Credenciales DEV ausentes');
  const resp = await fetch(`${baseUrl}/health`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
  if (!resp.ok) throw new Error(`Health falló: HTTP ${resp.status}`);
});

// 3. searchListings DEV
await stepAsync('searchListings DEV — tenant DEV-A', async () => {
  const baseUrl = process.env['LISTINGS_ADDON_BASE_URL'];
  const token = process.env['LISTINGS_ADDON_SERVICE_TOKEN'];
  if (!baseUrl || !token) throw new Error('SKIP: Credenciales DEV ausentes');
  const query = {
    contract_version: '1.0',
    client_account_id: 'dev-tenant-a-00000000-0000-0000-0000-000000000001',
    request_id: `req-search-${Date.now()}`,
    correlation_id: `corr-search-${Date.now()}`,
    filters: { location: null, price_min: null, price_max: null, room_type: null, move_in_date: null, preferences: [] },
    pagination: { cursor: null, limit: 5 },
  };
  const resp = await fetch(`${baseUrl}/listings/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`searchListings DEV falló: HTTP ${resp.status}`);
  const data = await resp.json();
  if (!Array.isArray(data.items)) throw new Error('items no es array en respuesta DEV');
  console.log(`     ${data.items.length} listing(s) retornados`);
});

// 4. Resultado sin campos privados
await stepAsync('searchListings resultado sin campos privados', async () => {
  const baseUrl = process.env['LISTINGS_ADDON_BASE_URL'];
  const token = process.env['LISTINGS_ADDON_SERVICE_TOKEN'];
  if (!baseUrl || !token) throw new Error('SKIP: Credenciales DEV ausentes');
  const query = {
    contract_version: '1.0',
    client_account_id: 'dev-tenant-a-00000000-0000-0000-0000-000000000001',
    request_id: `req-priv-${Date.now()}`, correlation_id: `corr-priv-${Date.now()}`,
    filters: { location: null, price_min: null, price_max: null, room_type: null, move_in_date: null, preferences: [] },
    pagination: { cursor: null, limit: 3 },
  };
  const resp = await fetch(`${baseUrl}/listings/search`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  for (const item of (data.items ?? [])) {
    for (const k of Object.keys(item)) {
      if (LISTING_PRIVATE_FIELDS.has(k)) throw new Error(`Campo privado '${k}' en listing DEV`);
    }
  }
});

// 5. createLead DEV con unverified_lead
await stepAsync('createLead DEV — actor unverified_lead', async () => {
  const baseUrl = process.env['LISTINGS_ADDON_BASE_URL'];
  const token = process.env['LISTINGS_ADDON_SERVICE_TOKEN'];
  if (!baseUrl || !token) throw new Error('SKIP: Credenciales DEV ausentes');
  const command = {
    contract_version: '1.0',
    client_account_id: 'dev-tenant-a-00000000-0000-0000-0000-000000000001',
    request_id: `req-lead-${Date.now()}`, correlation_id: `corr-lead-${Date.now()}`,
    idempotency_key: `smoke-lead-dev-${Date.now()}`,
    source: 'smart_conversations',
    actor: { type: 'unverified_lead' },
    lead: { listing_id: null, search_context: { city: 'Madrid' }, contact_preferences: {}, message_summary: '[SMOKE TEST] Lead de prueba DEV. No actuar.' },
  };
  const resp = await fetch(`${baseUrl}/leads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok && resp.status !== 409) throw new Error(`createLead DEV falló: HTTP ${resp.status}`);
  const data = await resp.json();
  if (!data.lead_id) throw new Error('lead_id ausente en respuesta DEV');
  console.log(`     lead_id recibido: ${data.lead_id}`);
});

// 6. Idempotencia lead
await stepAsync('createLead idempotente → replay con misma key', async () => {
  const baseUrl = process.env['LISTINGS_ADDON_BASE_URL'];
  const token = process.env['LISTINGS_ADDON_SERVICE_TOKEN'];
  if (!baseUrl || !token) throw new Error('SKIP: Credenciales DEV ausentes');
  const idemKey = `smoke-lead-idem-${Math.floor(Date.now() / 10000)}`;
  const base = {
    contract_version: '1.0',
    client_account_id: 'dev-tenant-a-00000000-0000-0000-0000-000000000001',
    idempotency_key: idemKey, source: 'smart_conversations',
    actor: { type: 'unverified_lead' },
    lead: { listing_id: null, search_context: {}, contact_preferences: {}, message_summary: '[SMOKE] Idem lead' },
  };
  await fetch(`${baseUrl}/leads`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...base, request_id: `r1-${Date.now()}`, correlation_id: `c1` }), signal: AbortSignal.timeout(10000) });
  const resp2 = await fetch(`${baseUrl}/leads`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...base, request_id: `r2-${Date.now()}`, correlation_id: `c2` }),
    signal: AbortSignal.timeout(10000),
  });
  if (resp2.status !== 409) {
    const d = await resp2.json();
    if (!d.idempotent_replay) throw new Error(`Segunda llamada no idempotente: ${resp2.status}`);
  }
});

console.log(`\n=== ${passed}✅ / ${failed}❌ / ${skipped}⏭️  pasos ===`);

if (skipped > 0) {
  console.log('\nEstado: NOT_EXECUTED_CONFIGURATION_PENDING');
  console.log('Configure LISTINGS_ADDON_BASE_URL y LISTINGS_ADDON_SERVICE_TOKEN.');
  console.log('Este resultado NO es evidencia de integración DEV.\n');
  if (ALLOW_PENDING) {
    console.log('[--allow-pending] Modo inspección local. Exit 0 pero estado sigue siendo NOT_EXECUTED_CONFIGURATION_PENDING.\n');
    process.exit(0);
  }
  process.exit(2);
}

const state = failed === 0 ? 'LISTINGS_DEV_VALIDATED' : 'LISTINGS_DEV_SMOKE_FAILED';
console.log(`Estado: ${state}\n`);
if (failed > 0) process.exit(1);
// Exit 0 implícito: ejecución real realizada y validada
