#!/usr/bin/env node
/** smoke-listings-addon.mjs — Smoke test integración listings-addon (Fase 11C1). */
import { smokeLog, checkDevEnvironment, checkIntegrationMode, checkSecretsPresent, smokeOfflineResult } from './smoke-runner.mjs';
smokeLog('listings-addon', 'start', 'RUNNING');
const isDev = checkDevEnvironment();
const mode = checkIntegrationMode('listings-addon', 'LISTINGS_ADDON_INTEGRATION_MODE');
const secretsOk = checkSecretsPresent('listings-addon', ['LISTINGS_ADDON_BASE_URL', 'LISTINGS_ADDON_SERVICE_TOKEN']);
if (!isDev || mode === 'mock') { const r = smokeOfflineResult('listings-addon', mode); process.exit(r.ok ? 0 : 1); }
if (!secretsOk) { smokeLog('listings-addon', 'result', 'DEV_CONFIGURATION_PENDING', 'Secrets not configured'); process.exit(0); }
smokeLog('listings-addon', 'result', 'DEV_CANARY_READY', 'DEV available — run canary activation manually');
process.exit(0);
