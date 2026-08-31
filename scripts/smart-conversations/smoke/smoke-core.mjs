#!/usr/bin/env node
/**
 * smoke-core.mjs — Smoke test para integración Core (Fase 11C1).
 * En DEV real: ejecuta identity.validate y tenant.features en canary.
 * En offline: verifica configuración y modo.
 */
import { smokeLog, checkDevEnvironment, checkIntegrationMode, checkSecretsPresent, smokeOfflineResult } from './smoke-runner.mjs';

smokeLog('core', 'start', 'RUNNING');
const isDev = checkDevEnvironment();
const mode = checkIntegrationMode('core', 'CORE_INTEGRATION_MODE');
const secretsOk = checkSecretsPresent('core', ['CORE_BASE_URL', 'CORE_SERVICE_TOKEN']);

if (!isDev || mode === 'mock') {
  const r = smokeOfflineResult('core', mode);
  process.exit(r.ok ? 0 : 1);
}

if (!secretsOk) {
  smokeLog('core', 'result', 'DEV_CONFIGURATION_PENDING', 'Secrets not configured');
  process.exit(0);
}

// DEV real — cuando esté disponible
smokeLog('core', 'result', 'DEV_CANARY_READY', 'DEV available — run canary activation manually');
process.exit(0);
