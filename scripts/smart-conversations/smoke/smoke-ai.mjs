#!/usr/bin/env node
/** smoke-ai.mjs — Smoke test integración ai (Fase 11C1). */
import { smokeLog, checkDevEnvironment, checkIntegrationMode, checkSecretsPresent, smokeOfflineResult } from './smoke-runner.mjs';
smokeLog('ai', 'start', 'RUNNING');
const isDev = checkDevEnvironment();
const mode = checkIntegrationMode('ai', 'AI_INTEGRATION_MODE');
const secretsOk = checkSecretsPresent('ai', ['AI_PROVIDER_URL', 'AI_API_KEY']);
if (!isDev || mode === 'mock') { const r = smokeOfflineResult('ai', mode); process.exit(r.ok ? 0 : 1); }
if (!secretsOk) { smokeLog('ai', 'result', 'DEV_CONFIGURATION_PENDING', 'Secrets not configured'); process.exit(0); }
smokeLog('ai', 'result', 'DEV_CANARY_READY', 'DEV available — run canary activation manually');
process.exit(0);
