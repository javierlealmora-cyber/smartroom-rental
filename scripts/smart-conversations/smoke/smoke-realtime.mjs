#!/usr/bin/env node
/** smoke-realtime.mjs — Smoke test integración realtime (Fase 11C1). */
import { smokeLog, checkDevEnvironment, checkIntegrationMode, checkSecretsPresent, smokeOfflineResult } from './smoke-runner.mjs';
smokeLog('realtime', 'start', 'RUNNING');
const isDev = checkDevEnvironment();
const mode = checkIntegrationMode('realtime', 'REALTIME_INTEGRATION_MODE');
const secretsOk = checkSecretsPresent('realtime', ['SUPABASE_URL', 'SUPABASE_ANON_KEY']);
if (!isDev || mode === 'mock') { const r = smokeOfflineResult('realtime', mode); process.exit(r.ok ? 0 : 1); }
if (!secretsOk) { smokeLog('realtime', 'result', 'DEV_CONFIGURATION_PENDING', 'Secrets not configured'); process.exit(0); }
smokeLog('realtime', 'result', 'DEV_CANARY_READY', 'DEV available — run canary activation manually');
process.exit(0);
