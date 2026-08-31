#!/usr/bin/env node
/** smoke-n8n.mjs — Smoke test integración n8n (Fase 11C1). */
import { smokeLog, checkDevEnvironment, checkIntegrationMode, checkSecretsPresent, smokeOfflineResult } from './smoke-runner.mjs';
smokeLog('n8n', 'start', 'RUNNING');
const isDev = checkDevEnvironment();
const mode = checkIntegrationMode('n8n', 'N8N_INTEGRATION_MODE');
const secretsOk = checkSecretsPresent('n8n', ['N8N_BASE_URL', 'N8N_SERVICE_TOKEN']);
if (!isDev || mode === 'mock') { const r = smokeOfflineResult('n8n', mode); process.exit(r.ok ? 0 : 1); }
if (!secretsOk) { smokeLog('n8n', 'result', 'DEV_CONFIGURATION_PENDING', 'Secrets not configured'); process.exit(0); }
smokeLog('n8n', 'result', 'DEV_CANARY_READY', 'DEV available — run canary activation manually');
process.exit(0);
