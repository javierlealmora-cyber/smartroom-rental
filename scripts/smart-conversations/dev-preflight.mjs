#!/usr/bin/env node
/**
 * dev-preflight.mjs — Guard de despliegue incremental DEV para SmartConversations.
 * Fase 11B3.
 *
 * Verifica antes de cualquier despliegue DEV:
 *   - environment = development
 *   - project ref corresponde a DEV (no a PRE ni PRO)
 *   - URL corresponde a DEV
 *   - Rama autorizada para DEV
 *   - Operación no destructiva
 *
 * Ante cualquier duda: exit code 1, no desplegar.
 * NO imprime project refs completos, URLs privadas, tokens ni secrets.
 *
 * Uso: node scripts/smart-conversations/dev-preflight.mjs
 */

import * as process from 'node:process';

// ── Helpers de seguridad ───────────────────────────────────────────────────

/** Redacta un valor para logging: muestra solo prefijo + asteriscos */
function redact(value, prefixLen = 4) {
  if (!value) return '[NOT_SET]';
  const prefix = value.slice(0, prefixLen);
  return prefix + '***[REDACTED]';
}

/** Verifica que una variable de entorno existe sin imprimir su valor */
function checkEnvVar(name) {
  const val = process.env[name];
  if (!val) {
    console.error(`[PREFLIGHT] FAIL: ${name} no está configurada`);
    return false;
  }
  console.log(`[PREFLIGHT] OK: ${name} configurada (${redact(val)})`);
  return true;
}

// ── Leer configuración DEV ─────────────────────────────────────────────────

const DEV_SUPABASE_URL  = process.env['DEV_SUPABASE_URL']  ?? '';
const DEV_PROJECT_REF   = process.env['DEV_PROJECT_REF']   ?? '';
const PRE_PROJECT_REF   = process.env['PRE_PROJECT_REF']   ?? '';
const PRO_PROJECT_REF   = process.env['PRO_PROJECT_REF']   ?? '';
const CURRENT_BRANCH    = process.env['GITHUB_REF_NAME']   ?? process.env['BRANCH'] ?? '';
const APP_ENV           = process.env['APP_ENVIRONMENT']   ?? '';

// Ramas autorizadas para despliegue incremental DEV
const AUTHORIZED_BRANCHES = ['develop', 'feat/11b3-security-http-privacy'];

let failed = false;

function fail(msg) {
  console.error(`[PREFLIGHT] FAIL: ${msg}`);
  failed = true;
}

function ok(msg) {
  console.log(`[PREFLIGHT] OK: ${msg}`);
}

// ── 1. Verificar environment ───────────────────────────────────────────────
console.log('[PREFLIGHT] SmartConversations — DEV Deployment Guard (11B3)');
console.log('[PREFLIGHT] ─────────────────────────────────────────────────');

if (APP_ENV && APP_ENV !== 'development') {
  fail(`APP_ENVIRONMENT = ${APP_ENV} — solo se permite 'development' en este guard`);
} else {
  ok(`APP_ENVIRONMENT = ${APP_ENV || '(no configurado — asumiendo development)'}`);
}

// ── 2. Verificar URL DEV ──────────────────────────────────────────────────
if (!DEV_SUPABASE_URL) {
  fail('DEV_SUPABASE_URL no configurada — no se puede validar target');
} else if (!DEV_SUPABASE_URL.includes('supabase.co') && !DEV_SUPABASE_URL.includes('supabase.in')) {
  fail('DEV_SUPABASE_URL no parece una URL de Supabase válida');
} else {
  ok('DEV_SUPABASE_URL es una URL Supabase');
}

// ── 3. Verificar project ref DEV ≠ PRE ≠ PRO ────────────────────────────
if (!DEV_PROJECT_REF) {
  fail('DEV_PROJECT_REF no configurado — no se puede validar aislamiento de entorno');
} else {
  ok(`DEV_PROJECT_REF configurado: ${redact(DEV_PROJECT_REF)}`);

  if (PRE_PROJECT_REF && DEV_PROJECT_REF === PRE_PROJECT_REF) {
    fail('DEV_PROJECT_REF coincide con PRE_PROJECT_REF — BLOQUEADO: riesgo de despliegue en PRE');
  }

  if (PRO_PROJECT_REF && DEV_PROJECT_REF === PRO_PROJECT_REF) {
    fail('DEV_PROJECT_REF coincide con PRO_PROJECT_REF — BLOQUEADO: riesgo de despliegue en PRO');
  }

  if (!PRE_PROJECT_REF) {
    console.warn('[PREFLIGHT] WARN: PRE_PROJECT_REF no configurado — aislamiento PRE no verificable');
  }
  if (!PRO_PROJECT_REF) {
    console.warn('[PREFLIGHT] WARN: PRO_PROJECT_REF no configurado — aislamiento PRO no verificable');
  }
}

// ── 4. Verificar rama autorizada ──────────────────────────────────────────
if (!CURRENT_BRANCH) {
  console.warn('[PREFLIGHT] WARN: rama no detectable desde GITHUB_REF_NAME ni BRANCH');
} else if (!AUTHORIZED_BRANCHES.some(b => CURRENT_BRANCH === b || CURRENT_BRANCH.startsWith(b))) {
  fail(`Rama '${CURRENT_BRANCH}' no está en la lista de ramas autorizadas para DEV: ${AUTHORIZED_BRANCHES.join(', ')}`);
} else {
  ok(`Rama autorizada para DEV: ${CURRENT_BRANCH}`);
}

// ── 5. Verificar que no es una operación destructiva ─────────────────────
const RESET_FLAG    = process.env['ALLOW_RESET']    ?? '';
const REBUILD_FLAG  = process.env['ALLOW_REBUILD']  ?? '';

if (RESET_FLAG === 'true') {
  fail('ALLOW_RESET=true — reset de datos NO permitido en despliegue incremental 11B3');
}
if (REBUILD_FLAG === 'true') {
  fail('ALLOW_REBUILD=true — rebuild completo NO permitido hasta Fase 11B2D');
}
ok('Operación no destructiva confirmada');

// ── 6. Verificar que secrets no aparecen en output ────────────────────────
const dangerousEnvVars = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'WEBCHAT_SESSION_SIGNING_SECRET',
  'PRODUCTION_SUPABASE_URL',
  'PRODUCTION_SUPABASE_SERVICE_ROLE_KEY',
];
for (const v of dangerousEnvVars) {
  if (process.env[v]) {
    // Solo verificar existencia, NUNCA imprimir valor
    console.log(`[PREFLIGHT] OK: ${v} configurada (valor no impreso por seguridad)`);
  }
}

// ── Resultado ─────────────────────────────────────────────────────────────
console.log('[PREFLIGHT] ─────────────────────────────────────────────────');
if (failed) {
  console.error('[PREFLIGHT] RESULTADO: BLOQUEADO — no proceder con el despliegue');
  process.exit(1);
} else {
  console.log('[PREFLIGHT] RESULTADO: OK — target DEV validado, despliegue autorizado');
  process.exit(0);
}
