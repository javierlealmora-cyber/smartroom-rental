#!/usr/bin/env node
/** smoke-incidents-addon.mjs — Smoke test integración incidents-addon (Fase 11C1). */
import { smokeLog, checkDevEnvironment, checkIntegrationMode, checkSecretsPresent, smokeOfflineResult } from './smoke-runner.mjs';
smokeLog('incidents-addon', 'start', 'RUNNING');
const isDev = checkDevEnvironment();
const mode = checkIntegrationMode('incidents-addon', 'INCIDENTS_ADDON_INTEGRATION_MODE');
const secretsOk = checkSecretsPresent('incidents-addon', ['INCIDENTS_ADDON_BASE_URL', 'INCIDENTS_ADDON_SERVICE_TOKEN']);
if (!isDev || mode === 'mock') { const r = smokeOfflineResult('incidents-addon', mode); process.exit(r.ok ? 0 : 1); }
if (!secretsOk) { smokeLog('incidents-addon', 'result', 'DEV_CONFIGURATION_PENDING', 'Secrets not configured'); process.exit(0); }
smokeLog('incidents-addon', 'result', 'DEV_CANARY_READY', 'DEV available — run canary activation manually');
process.exit(0);
