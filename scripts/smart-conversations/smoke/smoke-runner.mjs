/**
 * smoke-runner.mjs — Runner base para smokes de integración (Fase 11C1).
 *
 * Ejecuta preflight, verifica target, corre health offline.
 * En modo offline (sin DEV real), solo verifica configuración.
 * En modo DEV real (cuando esté disponible), ejecuta llamadas reales.
 *
 * No imprime secretos, URLs privadas ni PII.
 */

import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

export function smokeLog(integration, step, status, details = '') {
  const safe_details = details.replace(/[A-Za-z0-9+/]{32,}={0,2}/g, '[REDACTED]');
  process.stderr.write(`[smoke:${integration}] ${step}: ${status}${safe_details ? ' — ' + safe_details : ''}\n`);
}

export function checkDevEnvironment() {
  const appEnv = process.env.APP_ENVIRONMENT ?? '';
  const DEV = new Set(['sandbox', 'dev', 'development']);
  if (!DEV.has(appEnv.toLowerCase())) {
    smokeLog('preflight', 'environment', 'SKIP', `APP_ENVIRONMENT=${appEnv || '(unset)'} — offline mode`);
    return false;
  }
  smokeLog('preflight', 'environment', 'OK', `DEV (${appEnv})`);
  return true;
}

export function checkIntegrationMode(integration, envVar) {
  const mode = process.env[envVar] ?? 'mock';
  smokeLog(integration, 'mode', mode.toUpperCase(), `${envVar}=${mode}`);
  return mode;
}

export function checkSecretsPresent(integration, secretNames) {
  const missing = secretNames.filter(name => !process.env[name]);
  if (missing.length > 0) {
    smokeLog(integration, 'secrets', 'MISSING', `${missing.length} secret(s) not configured`);
    return false;
  }
  smokeLog(integration, 'secrets', 'OK', `${secretNames.length} secret(s) configured`);
  return true;
}

export function smokeOfflineResult(integration, mode) {
  if (mode === 'mock') {
    smokeLog(integration, 'result', 'MOCK_ONLY', 'No DEV activation — mock mode active');
    return { ok: true, mode: 'mock', result: 'MOCK_ONLY' };
  }
  if (mode === 'disabled') {
    smokeLog(integration, 'result', 'DISABLED', 'Integration is disabled');
    return { ok: false, mode: 'disabled', result: 'DISABLED' };
  }
  smokeLog(integration, 'result', 'DEV_CONFIGURATION_PENDING', 'DEV environment required for real smoke');
  return { ok: true, mode, result: 'DEV_CONFIGURATION_PENDING' };
}
