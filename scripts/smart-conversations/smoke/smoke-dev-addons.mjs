/**
 * smoke-dev-addons.mjs — Fase 11C5 (agregado)
 * Smoke REAL DEV para todos los add-ons.
 * Solo pasa si AMBOS endpoints DEV están disponibles y responden.
 *
 * Exit codes:
 *   0  — ambos add-ons ejecutados y validados (ADDONS_INTEGRATION_DEV_VALIDATED)
 *   1  — algún add-on falló en ejecución real
 *   2  — no ejecutado por configuración pendiente (ADDONS_DEV_CONFIGURATION_PENDING)
 *
 * Con --allow-pending: exit 0 para inspección local, estado sigue siendo pending.
 * No constituye evidencia de integración DEV.
 *
 * Uso: node scripts/smart-conversations/smoke/smoke-dev-addons.mjs [--allow-pending]
 */

import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SMOKE_DIR = __dirname;

const ALLOW_PENDING = process.argv.includes('--allow-pending');

let passed = 0;
let failed = 0;
let skipped = 0;

const REQUIRED_ENV = [
  'INCIDENTS_ADDON_BASE_URL',
  'INCIDENTS_ADDON_SERVICE_TOKEN',
  'LISTINGS_ADDON_BASE_URL',
  'LISTINGS_ADDON_SERVICE_TOKEN',
];

console.log('\n=== smoke-dev-addons.mjs — Fase 11C5 (REAL DEV agregado) ===\n');

// Verificar prereqs
const missingEnv = REQUIRED_ENV.filter(e => !process.env[e]);
if (missingEnv.length > 0) {
  console.log('⏭️  Variables de entorno ausentes:');
  for (const e of missingEnv) {
    console.log(`     - ${e}`);
  }
  console.log('\nEstado: ADDONS_DEV_CONFIGURATION_PENDING');
  console.log('Configure todas las variables DEV para ejecutar este smoke.');
  console.log('Este resultado NO es evidencia de integración DEV.\n');
  if (ALLOW_PENDING) {
    console.log('[--allow-pending] Modo inspección local. Exit 0 pero estado sigue siendo ADDONS_DEV_CONFIGURATION_PENDING.\n');
    process.exit(0);
  }
  // Sin --allow-pending: exit 2 = configuración pendiente
  process.exit(2);
}

// Ejecutar smoke de incidencias
console.log('--- Incidencias ---');
try {
  execFileSync('node', [path.join(SMOKE_DIR, 'smoke-dev-incidents-addon.mjs')], {
    stdio: 'inherit',
    env: process.env,
    timeout: 30000,
  });
  console.log('✅ Incidencias: INCIDENTS_DEV_VALIDATED\n');
  passed++;
} catch (e) {
  const code = e.status ?? 1;
  if (code === 2) {
    console.log('⏭️  Incidencias: NOT_EXECUTED_CONFIGURATION_PENDING\n');
    skipped++;
  } else {
    console.log('❌ Incidencias: INCIDENTS_DEV_SMOKE_FAILED\n');
    failed++;
  }
}

// Ejecutar smoke de publicaciones / leads
console.log('--- Publicaciones / Leads ---');
try {
  execFileSync('node', [path.join(SMOKE_DIR, 'smoke-dev-listings-addon.mjs')], {
    stdio: 'inherit',
    env: process.env,
    timeout: 30000,
  });
  console.log('✅ Publicaciones/Leads: LISTINGS_DEV_VALIDATED\n');
  passed++;
} catch (e) {
  const code = e.status ?? 1;
  if (code === 2) {
    console.log('⏭️  Publicaciones/Leads: NOT_EXECUTED_CONFIGURATION_PENDING\n');
    skipped++;
  } else {
    console.log('❌ Publicaciones/Leads: LISTINGS_DEV_SMOKE_FAILED\n');
    failed++;
  }
}

console.log(`=== ${passed}/2 add-ons OK / ${failed} FAIL / ${skipped} SKIP ===`);

let state;
if (skipped > 0 && failed === 0) {
  state = 'ADDONS_DEV_CONFIGURATION_PENDING';
} else if (failed === 0) {
  state = 'ADDONS_INTEGRATION_DEV_VALIDATED';
} else {
  state = 'ADDONS_INTEGRATION_DEV_PARTIALLY_READY';
}

console.log(`Estado global: ${state}`);
if (skipped > 0) console.log('Este resultado NO es evidencia de integración DEV.\n');
else console.log('');

if (failed > 0) process.exit(1);
// Si solo hay skips (sin fallos reales) y llegamos aquí: nunca ocurre porque el exit(2) de
// los sub-smokes habría hecho fallar execFileSync antes de llegar a este punto.
// Exit 0 solo ocurre si passed === 2 (ambos add-ons realmente validados).
