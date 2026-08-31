#!/usr/bin/env node
/** smoke-wasender.mjs — Smoke test integración wasender (Fase 11C1). */
import { smokeLog, checkDevEnvironment, checkIntegrationMode, checkSecretsPresent, smokeOfflineResult } from './smoke-runner.mjs';
smokeLog('wasender', 'start', 'RUNNING');
const isDev = checkDevEnvironment();
const mode = checkIntegrationMode('wasender', 'WASENDER_INTEGRATION_MODE');
const secretsOk = checkSecretsPresent('wasender', ['WASENDER_API_URL', 'WASENDER_API_KEY']);
if (!isDev || mode === 'mock') { const r = smokeOfflineResult('wasender', mode); process.exit(r.ok ? 0 : 1); }
if (!secretsOk) { smokeLog('wasender', 'result', 'DEV_CONFIGURATION_PENDING', 'Secrets not configured'); process.exit(0); }
smokeLog('wasender', 'result', 'DEV_CANARY_READY', 'DEV available — run canary activation manually');
process.exit(0);
