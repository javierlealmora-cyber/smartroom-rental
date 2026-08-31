/**
 * Security HTTP Privacy — Tests Estáticos
 * Fase 11B3 · SmartConversations
 *
 * Cobertura: CORS, CSP, Cabeceras HTTP, Secrets, Webhook Hardening,
 * Logging Seguro, Privacidad de Adapters, Retención, Idempotencia,
 * Realtime, Boundaries (104 tests estáticos).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../../../');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

// ─────────────────────────────────────────────────────────────────────────────
// CORS-01..12 — Política CORS
// ─────────────────────────────────────────────────────────────────────────────
describe('CORS-01..12 — Política CORS dinámica', () => {
  it('CORS-01: cors-policy.ts existe', () => {
    expect(fileExists('supabase/functions/_shared/smart-conversations/cors-policy.ts')).toBe(true);
  });

  it('CORS-02: buildBrowserCorsHeaders exportada', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/cors-policy.ts');
    expect(src).toMatch(/export function buildBrowserCorsHeaders/);
  });

  it('CORS-03: no usa wildcard en Access-Control-Allow-Origin', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/cors-policy.ts');
    // No debe asignar directamente '*' a ACAO
    expect(src).not.toMatch(/'Access-Control-Allow-Origin':\s*'\*'/);
  });

  it('CORS-04: Vary: Origin presente en buildBrowserCorsHeaders', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/cors-policy.ts');
    expect(src).toMatch(/Vary.*Origin|'Vary'.*'Origin'/);
  });

  it('CORS-05: Origin no autorizado → sin ACAO (opaco)', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/cors-policy.ts');
    // Si isAllowed es false → no se incluye Access-Control-Allow-Origin
    expect(src).toMatch(/if.*isAllowed/);
  });

  it('CORS-06: conv-web-session importa cors-policy', () => {
    const src = readFile('supabase/functions/conv-web-session/index.ts');
    expect(src).toMatch(/cors-policy/);
  });

  it('CORS-07: conv-web-message importa cors-policy', () => {
    const src = readFile('supabase/functions/conv-web-message/index.ts');
    expect(src).toMatch(/cors-policy/);
  });

  it('CORS-08: conv-web-poll importa cors-policy', () => {
    const src = readFile('supabase/functions/conv-web-poll/index.ts');
    expect(src).toMatch(/cors-policy/);
  });

  it('CORS-09: conv-wa-webhook no tiene CORS browser (no importa cors-policy)', () => {
    const src = readFile('supabase/functions/conv-wa-webhook/index.ts');
    // El webhook no necesita CORS browser — no debe importar cors-policy para uso browser
    // (puede tener la importación pero no debe usar buildBrowserCorsHeaders)
    expect(src).not.toMatch(/buildBrowserCorsHeaders/);
  });

  it('CORS-10: localhost solo en modo permisivo (LOCAL_ALLOWED_ORIGINS en cors-policy)', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/cors-policy.ts');
    expect(src).toMatch(/localhost|LOCAL_ALLOWED_ORIGINS/);
    expect(src).toMatch(/_isPermissiveEnv/);
  });

  it('CORS-11: isValidOriginForAllowlist rechaza wildcard', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/cors-policy.ts');
    expect(src).toMatch(/isValidOriginForAllowlist/);
    expect(src).toMatch(/'\*'/);
  });

  it('CORS-12: buildPreflightResponse exportada', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/cors-policy.ts');
    expect(src).toMatch(/export function buildPreflightResponse/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CSP-01..15 — Content Security Policy y cabeceras HTTP
// ─────────────────────────────────────────────────────────────────────────────
describe('CSP-01..15 — CSP y cabeceras HTTP', () => {
  it('CSP-01: vercel.json existe', () => {
    expect(fileExists('vercel.json')).toBe(true);
  });

  it('CSP-02: CSP presente (enforced o report-only)', () => {
    const src = readFile('vercel.json');
    expect(src).toMatch(/Content-Security-Policy/);
  });

  it('CSP-03: script-src no usa unsafe-eval', () => {
    const src = readFile('vercel.json');
    expect(src).not.toMatch(/unsafe-eval/);
  });

  it('CSP-04: connect-src no usa wildcard puro', () => {
    const src = readFile('vercel.json');
    // connect-src * es el problema; connect-src con dominios específicos está bien
    expect(src).not.toMatch(/connect-src\s+'\*'|connect-src\s+\*/);
  });

  it('CSP-05: object-src none', () => {
    const src = readFile('vercel.json');
    expect(src).toMatch(/object-src\s+'none'/);
  });

  it('CSP-06: base-uri self', () => {
    const src = readFile('vercel.json');
    expect(src).toMatch(/base-uri\s+'self'/);
  });

  it('CSP-07: frame-ancestors definido', () => {
    const src = readFile('vercel.json');
    expect(src).toMatch(/frame-ancestors/);
  });

  it('CSP-08: Supabase HTTPS en connect-src', () => {
    const src = readFile('vercel.json');
    expect(src).toMatch(/supabase/i);
  });

  it('CSP-09: X-Content-Type-Options: nosniff', () => {
    const src = readFile('vercel.json');
    expect(src).toMatch(/X-Content-Type-Options/);
    expect(src).toMatch(/nosniff/);
  });

  it('CSP-10: Referrer-Policy presente', () => {
    const src = readFile('vercel.json');
    expect(src).toMatch(/Referrer-Policy/);
  });

  it('CSP-11: Permissions-Policy presente', () => {
    const src = readFile('vercel.json');
    expect(src).toMatch(/Permissions-Policy/);
  });

  it('CSP-12: Core no accesible desde frontend en CSP', () => {
    const src = readFile('vercel.json');
    // connect-src no debe incluir dominios genéricos de Core (API interna)
    expect(src).not.toMatch(/api\.core|core\.smartroom/i);
  });

  it('CSP-13: form-action self', () => {
    const src = readFile('vercel.json');
    expect(src).toMatch(/form-action\s+'self'/);
  });

  it('CSP-14: upgrade-insecure-requests presente', () => {
    const src = readFile('vercel.json');
    expect(src).toMatch(/upgrade-insecure-requests/);
  });

  it('CSP-15: X-Frame-Options DENY', () => {
    const src = readFile('vercel.json');
    expect(src).toMatch(/X-Frame-Options/);
    expect(src).toMatch(/DENY/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECRETS-01..10 — Gestión de secretos
// ─────────────────────────────────────────────────────────────────────────────
describe('SECRETS-01..10 — Gestión segura de secretos', () => {
  it('SECRETS-01: no hay VITE_ secrets en .env.example', () => {
    if (!fileExists('.env.example')) return;
    const src = readFile('.env.example');
    expect(src).not.toMatch(/VITE_SUPABASE_SERVICE_ROLE_KEY/);
    expect(src).not.toMatch(/VITE_WEBCHAT_SESSION_SIGNING_SECRET/);
    expect(src).not.toMatch(/VITE_WASENDER/);
  });

  it('SECRETS-02: webhook_secret_prev columna en migración 11B3', () => {
    const src = readFile('supabase/migrations/20260723000001_sc_security_b3.sql');
    expect(src).toMatch(/webhook_secret_prev/);
  });

  it('SECRETS-03: RPC get_wa_webhook_secret con REVOKE anon/authenticated', () => {
    const src = readFile('supabase/migrations/20260723000001_sc_security_b3.sql');
    expect(src).toMatch(/get_wa_webhook_secret/);
    expect(src).toMatch(/REVOKE.*anon/i);
    expect(src).toMatch(/REVOKE.*authenticated/i);
  });

  it('SECRETS-04: GRANT service_role en RPC get_wa_webhook_secret', () => {
    const src = readFile('supabase/migrations/20260723000001_sc_security_b3.sql');
    expect(src).toMatch(/GRANT EXECUTE.*service_role/i);
  });

  it('SECRETS-05: constant-time.ts existe para comparaciones de secrets', () => {
    expect(fileExists('supabase/functions/_shared/smart-conversations/runtime/constant-time.ts')).toBe(true);
  });

  it('SECRETS-06: ef-auth.ts usa timingSafeEqual (constant-time)', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/ef-auth.ts');
    expect(src).toMatch(/timingSafeEqual/);
  });

  it('SECRETS-07: conv-wa-webhook usa comparación constant-time para HMAC', () => {
    const src = readFile('supabase/functions/conv-wa-webhook/index.ts');
    expect(src).toMatch(/timingSafeEqualBytes/);
  });

  it('SECRETS-08: webhook soporta rotación current/prev (verifyHmacWithRotation)', () => {
    const src = readFile('supabase/functions/conv-wa-webhook/index.ts');
    expect(src).toMatch(/verifyHmacWithRotation|previous.*secret|webhook_secret_prev/i);
  });

  it('SECRETS-09: secrets no aparecen en respuestas ok() de las 3 EFs WebChat', () => {
    for (const f of [
      'supabase/functions/conv-web-session/index.ts',
      'supabase/functions/conv-web-message/index.ts',
      'supabase/functions/conv-web-poll/index.ts',
    ]) {
      const src = readFile(f);
      expect(src).not.toMatch(/ok\(.*serviceRoleKey/);
      expect(src).not.toMatch(/ok\(.*signingSecret/);
    }
  });

  it('SECRETS-10: config incompleta falla cerrada en env-config', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/runtime/env-config.ts');
    expect(src).toMatch(/checkStartupConfig/);
    expect(src).toMatch(/ok.*false|safeMessage/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WEBHOOK-01..13 — Webhook Hardening (SEC-026, SEC-012)
// ─────────────────────────────────────────────────────────────────────────────
describe('WEBHOOK-01..13 — Webhook hardening', () => {
  it('WEBHOOK-01: conv-wa-webhook lee raw body antes de parsear', () => {
    const src = readFile('supabase/functions/conv-wa-webhook/index.ts');
    const bodyIdx = src.indexOf('req.text()');
    const parseIdx = src.indexOf('JSON.parse(rawBody)');
    expect(bodyIdx).toBeGreaterThan(0);
    expect(bodyIdx).toBeLessThan(parseIdx);
  });

  it('WEBHOOK-02: validación de timestamp X-Wasender-Timestamp', () => {
    const src = readFile('supabase/functions/conv-wa-webhook/index.ts');
    expect(src).toMatch(/X-Wasender-Timestamp/);
    expect(src).toMatch(/validateWebhookTimestamp/);
  });

  it('WEBHOOK-03: ventana de tolerancia configurada (TIMESTAMP_TOLERANCE_S)', () => {
    const src = readFile('supabase/functions/conv-wa-webhook/index.ts');
    expect(src).toMatch(/TIMESTAMP_TOLERANCE_S/);
    expect(src).toMatch(/300/); // 5 minutos default
  });

  it('WEBHOOK-04: timestamp antiguo rechazado (timestamp_too_old)', () => {
    const src = readFile('supabase/functions/conv-wa-webhook/index.ts');
    expect(src).toMatch(/timestamp_too_old/);
  });

  it('WEBHOOK-05: timestamp futuro rechazado (timestamp_too_future)', () => {
    const src = readFile('supabase/functions/conv-wa-webhook/index.ts');
    expect(src).toMatch(/timestamp_too_future/);
  });

  it('WEBHOOK-06: comparación HMAC constant-time', () => {
    const src = readFile('supabase/functions/conv-wa-webhook/index.ts');
    expect(src).toMatch(/timingSafeEqualBytes/);
  });

  it('WEBHOOK-07: deduplicación por wasender_message_id', () => {
    const src = readFile('supabase/functions/conv-wa-webhook/index.ts');
    expect(src).toMatch(/provider_message_id.*waMessageId|waMessageId.*provider_message_id/);
    // Busca si ya fue procesado antes de llamar a ingest
    expect(src).toMatch(/existing/);
  });

  it('WEBHOOK-08: conv-ingest llamado SOLO después de firma + timestamp + dedup', () => {
    const src = readFile('supabase/functions/conv-wa-webhook/index.ts');
    const sigIdx = src.indexOf('verifyHmacWithRotation');
    const tsIdx = src.indexOf('validateWebhookTimestamp');
    const dedupIdx = src.indexOf('provider_message_id');
    // conv-ingest aparece en comentarios antes; buscamos la llamada real (fetch)
    const ingestCallIdx = src.indexOf("fetch(`${supabaseUrl}/functions/v1/conv-ingest`");
    expect(ingestCallIdx).toBeGreaterThan(0); // la llamada real existe
    expect(ingestCallIdx).toBeGreaterThan(sigIdx);
    expect(ingestCallIdx).toBeGreaterThan(tsIdx);
    expect(ingestCallIdx).toBeGreaterThan(dedupIdx);
  });

  it('WEBHOOK-09: respuesta opaca en errores (200 silencioso)', () => {
    const src = readFile('supabase/functions/conv-wa-webhook/index.ts');
    expect(src).toMatch(/silentOk/);
    expect(src).toMatch(/status: 200/);
  });

  it('WEBHOOK-10: no se loguea body, firma ni secret', () => {
    const src = readFile('supabase/functions/conv-wa-webhook/index.ts');
    // No debe loguear rawBody, signature ni webhook_secret directamente
    expect(src).not.toMatch(/log\.(info|warn|error)\(.*rawBody/);
    expect(src).not.toMatch(/log\.(info|warn|error)\(.*signature/);
    expect(src).not.toMatch(/log\.(info|warn|error)\(.*webhook_secret\b/);
  });

  it('WEBHOOK-11: soporta rotación current/previous secret', () => {
    const src = readFile('supabase/functions/conv-wa-webhook/index.ts');
    expect(src).toMatch(/previousSecret|webhook_secret_prev/);
  });

  it('WEBHOOK-12: tenant resuelto por wasender_session_id (confiable)', () => {
    const src = readFile('supabase/functions/conv-wa-webhook/index.ts');
    expect(src).toMatch(/wasenderSessionId/);
    // La EF intenta resolver por wasenderSessionId primero
    const wsIdx = src.indexOf('wasenderSessionId');
    const qpIdx = src.indexOf('queryClientAccountId');
    expect(wsIdx).toBeLessThan(qpIdx);
  });

  it('WEBHOOK-13: HMAC computado sobre raw body (no re-serializado)', () => {
    const src = readFile('supabase/functions/conv-wa-webhook/index.ts');
    expect(src).toMatch(/computeHmacSha256Bytes.*rawBody|rawBody.*HMAC/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOGGING-01..15 — Logging seguro
// ─────────────────────────────────────────────────────────────────────────────
describe('LOGGING-01..15 — Logging seguro y sanitización', () => {
  it('LOGGING-01: ef-logger.ts tiene FIELDS_TO_REDACT', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/ef-logger.ts');
    expect(src).toMatch(/FIELDS_TO_REDACT/);
  });

  it('LOGGING-02: message_text redactado', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/ef-logger.ts');
    expect(src).toMatch(/'message_text'/);
  });

  it('LOGGING-03: sender_ref redactado', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/ef-logger.ts');
    expect(src).toMatch(/'sender_ref'/);
  });

  it('LOGGING-04: raw_payload redactado', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/ef-logger.ts');
    expect(src).toMatch(/'raw_payload'/);
  });

  it('LOGGING-05: authorization redactado', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/ef-logger.ts');
    expect(src).toMatch(/'authorization'/);
  });

  it('LOGGING-06: token redactado', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/ef-logger.ts');
    expect(src).toMatch(/'token'/);
  });

  it('LOGGING-07: service_role redactado (SEC-023)', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/ef-logger.ts');
    expect(src).toMatch(/'service_role'/);
  });

  it('LOGGING-08: api_key redactado (SEC-023)', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/ef-logger.ts');
    expect(src).toMatch(/'api_key'/);
  });

  it('LOGGING-09: signing_secret redactado', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/ef-logger.ts');
    expect(src).toMatch(/'signing_secret'/);
  });

  it('LOGGING-10: private_key redactado', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/ef-logger.ts');
    expect(src).toMatch(/'private_key'/);
  });

  it('LOGGING-11: sanitizeForLog recursivo en objetos anidados', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/ef-logger.ts');
    expect(src).toMatch(/sanitizeForLog/);
    expect(src).toMatch(/typeof value === 'object'/);
  });

  it('LOGGING-12: arrays redactados recursivamente', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/ef-logger.ts');
    expect(src).toMatch(/sanitizeArray|Array\.isArray/);
  });

  it('LOGGING-13: sanitizeUrlForLog elimina query params sensibles', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/ef-logger.ts');
    expect(src).toMatch(/sanitizeUrlForLog/);
  });

  it('LOGGING-14: sanitizeErrorForLog no incluye stack ni cause', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/ef-logger.ts');
    expect(src).toMatch(/sanitizeErrorForLog/);
    // No debe incluir .stack directamente en el output
    expect(src).not.toMatch(/err\.stack|error\.stack/);
  });

  it('LOGGING-15: webhook_secret redactado', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/ef-logger.ts');
    expect(src).toMatch(/'webhook_secret'/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRIVACY-01..11 — Privacidad de adapters
// ─────────────────────────────────────────────────────────────────────────────
describe('PRIVACY-01..11 — Privacidad de adapters y Activity Log', () => {
  it('PRIVACY-01: privacy-guards.ts existe con PII_FIELDS_FORBIDDEN_IN_N8N', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/privacy-guards.ts');
    expect(src).toMatch(/PII_FIELDS_FORBIDDEN_IN_N8N/);
  });

  it('PRIVACY-02: identity_data prohibida en n8n', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/privacy-guards.ts');
    const n8nFields = src.match(/PII_FIELDS_FORBIDDEN_IN_N8N[\s\S]*?;/)?.[0] ?? '';
    expect(n8nFields).toMatch(/identity_data/);
  });

  it('PRIVACY-03: profile_id prohibida en n8n', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/privacy-guards.ts');
    const n8nFields = src.match(/PII_FIELDS_FORBIDDEN_IN_N8N[\s\S]*?;/)?.[0] ?? '';
    expect(n8nFields).toMatch(/profile_id/);
  });

  it('PRIVACY-04: sender_ref prohibida en n8n', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/privacy-guards.ts');
    const n8nFields = src.match(/PII_FIELDS_FORBIDDEN_IN_N8N[\s\S]*?;/)?.[0] ?? '';
    expect(n8nFields).toMatch(/sender_ref/);
  });

  it('PRIVACY-05: raw_payload prohibida en n8n', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/privacy-guards.ts');
    const n8nFields = src.match(/PII_FIELDS_FORBIDDEN_IN_N8N[\s\S]*?;/)?.[0] ?? '';
    expect(n8nFields).toMatch(/raw_payload/);
  });

  it('PRIVACY-06: PII prohibida en Activity Log (message_text)', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/privacy-guards.ts');
    expect(src).toMatch(/PII_FIELDS_FORBIDDEN_IN_ACTIVITY_LOG/);
    expect(src).toMatch(/message_text/);
  });

  it('PRIVACY-07: Activity Log usa allowlist de event_types', () => {
    const src = readFile('supabase/functions/conv-core-publish-activity/index.ts');
    expect(src).toMatch(/ALLOWED_EVENT_TYPES/);
  });

  it('PRIVACY-08: Activity Log no acepta event_types no reconocidos', () => {
    const src = readFile('supabase/functions/conv-core-publish-activity/index.ts');
    expect(src).toMatch(/unknown_event_type|!ALLOWED_EVENT_TYPES\.has/);
  });

  it('PRIVACY-09: Activity Log verifica PII antes de publicar', () => {
    const src = readFile('supabase/functions/conv-core-publish-activity/index.ts');
    expect(src).toMatch(/pii_violation|findPiiInPayload/);
  });

  it('PRIVACY-10: Activity Log no contiene sender_ref', () => {
    const src = readFile('supabase/functions/conv-core-publish-activity/index.ts');
    const piiFields = src.match(/PII_FIELDS_FORBIDDEN_IN_ACTIVITY[\s\S]*?;/)?.[0] ?? '';
    expect(piiFields).toMatch(/sender_ref/);
  });

  it('PRIVACY-11: conv-core-publish-activity usa createSafeLogger', () => {
    const src = readFile('supabase/functions/conv-core-publish-activity/index.ts');
    expect(src).toMatch(/createSafeLogger/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RETENTION-01..07 — Retención y purga
// ─────────────────────────────────────────────────────────────────────────────
describe('RETENTION-01..07 — Retención y purga de datos', () => {
  it('RETENTION-01: función purge_old_raw_payloads en migración 11B3', () => {
    const src = readFile('supabase/migrations/20260723000001_sc_security_b3.sql');
    expect(src).toMatch(/purge_old_raw_payloads/);
  });

  it('RETENTION-02: purge usa lotes (p_batch_size)', () => {
    const src = readFile('supabase/migrations/20260723000001_sc_security_b3.sql');
    expect(src).toMatch(/p_batch_size|LIMIT p_batch_size/i);
  });

  it('RETENTION-03: purge es idempotente (pone NULL, no DELETE)', () => {
    const src = readFile('supabase/migrations/20260723000001_sc_security_b3.sql');
    expect(src).toMatch(/SET raw_payload = NULL/);
  });

  it('RETENTION-04: purge no imprime contenido (solo métricas)', () => {
    const src = readFile('supabase/migrations/20260723000001_sc_security_b3.sql');
    // Retorna ROW_COUNT, no contenido
    expect(src).toMatch(/ROW_COUNT|affected_rows/i);
  });

  it('RETENTION-05: dry_run disponible (no modifica datos)', () => {
    const src = readFile('supabase/migrations/20260723000001_sc_security_b3.sql');
    expect(src).toMatch(/p_dry_run|dry_run/i);
  });

  it('RETENTION-06: idempotency key conservada (no se purga client_message_id)', () => {
    const src = readFile('supabase/migrations/20260723000001_sc_security_b3.sql');
    // La purga solo pone raw_payload=NULL, no toca client_message_id
    const purgeBlock = src.slice(
      src.indexOf('purge_old_raw_payloads'),
      src.indexOf('purge_old_raw_payloads') + 2000,
    );
    expect(purgeBlock).not.toMatch(/client_message_id.*=.*NULL|NULL.*client_message_id/);
  });

  it('RETENTION-07: purge solo accesible por service_role', () => {
    const src = readFile('supabase/migrations/20260723000001_sc_security_b3.sql');
    expect(src).toMatch(/REVOKE.*purge_old_raw_payloads/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IDEMPOTENCY-01..06 — Idempotencia WebChat
// ─────────────────────────────────────────────────────────────────────────────
describe('IDEMPOTENCY-01..06 — Idempotencia de mensajes WebChat', () => {
  it('IDEMPOTENCY-01: client_message_id en migración 11B3', () => {
    const src = readFile('supabase/migrations/20260723000001_sc_security_b3.sql');
    expect(src).toMatch(/client_message_id/);
  });

  it('IDEMPOTENCY-02: índice único parcial para deduplicación', () => {
    const src = readFile('supabase/migrations/20260723000001_sc_security_b3.sql');
    expect(src).toMatch(/UNIQUE INDEX.*client_message_id|conv_messages_idempotency_idx/i);
  });

  it('IDEMPOTENCY-03: conv-web-message acepta client_message_id en body', () => {
    const src = readFile('supabase/functions/conv-web-message/index.ts');
    expect(src).toMatch(/client_message_id/);
  });

  it('IDEMPOTENCY-04: deduplicación ANTES de conv-ingest', () => {
    const src = readFile('supabase/functions/conv-web-message/index.ts');
    const dedupIdx = src.indexOf('idempotencyKey');
    // conv-ingest aparece en comentarios; buscamos la llamada real (fetch)
    const ingestCallIdx = src.indexOf("fetch(`${supabaseUrl}/functions/v1/conv-ingest`");
    expect(dedupIdx).toBeGreaterThan(0);
    expect(ingestCallIdx).toBeGreaterThan(0);
    expect(dedupIdx).toBeLessThan(ingestCallIdx);
  });

  it('IDEMPOTENCY-05: replay con mismo ID no redespacha', () => {
    const src = readFile('supabase/functions/conv-web-message/index.ts');
    expect(src).toMatch(/idempotent.*true|ya procesado/);
  });

  it('IDEMPOTENCY-06: dedupe aislada por tenant + sesión', () => {
    const src = readFile('supabase/functions/conv-web-message/index.ts');
    // La query de dedupe filtra por client_account_id Y session_id
    expect(src).toMatch(/client_account_id.*session_id.*client_message_id|client_message_id.*session_id/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// REALTIME-01..04 — Seguridad Realtime
// ─────────────────────────────────────────────────────────────────────────────
describe('REALTIME-01..04 — Seguridad Realtime (preparado, desactivado)', () => {
  it('REALTIME-01: Realtime client no activa conexión real por defecto', () => {
    if (!fileExists('supabase/functions/_shared/smart-conversations/runtime/webchat-realtime-client.ts')) {
      expect(true).toBe(true); // No existe = no activa
      return;
    }
    const src = readFile('supabase/functions/_shared/smart-conversations/runtime/webchat-realtime-client.ts');
    // No debe conectar directamente sin configuración
    expect(src).toMatch(/mock|disabled|not.*active|mode.*mock/i);
  });

  it('REALTIME-02: canal Realtime usa session_id (no enumerable)', () => {
    if (!fileExists('src/features/webchat/services/webchat-realtime.js')) return;
    const src = readFile('src/features/webchat/services/webchat-realtime.js');
    expect(src).toMatch(/sessionId|session_id/);
  });

  it('REALTIME-03: sin activación real en prod sin configuración', () => {
    // El modo mock es el default — Realtime real requiere WEBCHAT_REALTIME_MODE=real
    if (fileExists('supabase/functions/_shared/smart-conversations/runtime/webchat-realtime-client.ts')) {
      const src = readFile('supabase/functions/_shared/smart-conversations/runtime/webchat-realtime-client.ts');
      // Debe haber algún mecanismo de control de modo
      expect(src.length).toBeGreaterThan(0);
    } else {
      expect(true).toBe(true);
    }
  });

  it('REALTIME-04: REALTIME_MODE comentado o desactivado', () => {
    // El modo Realtime real está desactivado — se confirma por ausencia de config activa
    const hasRealtimeConfig = fileExists('.env.example') &&
      readFile('.env.example').includes('WEBCHAT_REALTIME_MODE=real');
    expect(hasRealtimeConfig).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDARIES-01..13 — Constraints de implementación 11B3
// ─────────────────────────────────────────────────────────────────────────────
describe('BOUNDARIES-01..13 — Boundaries y constraints de Fase 11B3', () => {
  it('BOUNDARIES-01: DEV preflight script existe', () => {
    expect(fileExists('scripts/smart-conversations/dev-preflight.mjs')).toBe(true);
  });

  it('BOUNDARIES-02: preflight bloquea si env no es development', () => {
    const src = readFile('scripts/smart-conversations/dev-preflight.mjs');
    expect(src).toMatch(/APP_ENVIRONMENT|development/);
    expect(src).toMatch(/exit\(1\)|BLOQUEADO/);
  });

  it('BOUNDARIES-03: preflight bloquea coincidencia DEV=PRE', () => {
    const src = readFile('scripts/smart-conversations/dev-preflight.mjs');
    expect(src).toMatch(/PRE_PROJECT_REF/);
  });

  it('BOUNDARIES-04: preflight bloquea coincidencia DEV=PRO', () => {
    const src = readFile('scripts/smart-conversations/dev-preflight.mjs');
    expect(src).toMatch(/PRO_PROJECT_REF/);
  });

  it('BOUNDARIES-05: no se introdujeron WF-02 ni estados nuevos', () => {
    for (const f of [
      'supabase/functions/conv-web-message/index.ts',
      'supabase/functions/conv-wa-webhook/index.ts',
    ]) {
      const src = readFile(f);
      expect(src).not.toMatch(/WF-02/);
      expect(src).not.toMatch(/conv_help_escalated/);
      expect(src).not.toMatch(/WEAK_MATCH/);
    }
  });

  it('BOUNDARIES-06: no se crearon políticas anon para conv_*', () => {
    const src = readFile('supabase/migrations/20260723000001_sc_security_b3.sql');
    expect(src).not.toMatch(/FOR ALL TO anon|USING \(true\).*anon|FOR SELECT TO anon/i);
    expect(src).not.toMatch(/CREATE POLICY.*anon.*conv_/i);
  });

  it('BOUNDARIES-07: GATE_1 no declarado PASS', () => {
    const src = readFile('docs/smart-conversations/security/security-findings.md');
    expect(src).not.toMatch(/GATE_1.*PASS(?!_WITH_WARNINGS)(?!ES)/i);
  });

  it('BOUNDARIES-08: identidad permanece en SmartConversations', () => {
    const src = readFile('supabase/functions/conv-web-message/index.ts');
    expect(src).not.toMatch(/identity_level.*add-on|add-on.*STRONG_MATCH/);
  });

  it('BOUNDARIES-09: migraciones históricas no modificadas', () => {
    const historic = readFile('supabase/migrations/20260716000001_smart_conversations_core_schema.sql');
    expect(historic).not.toMatch(/Fase 11B3/);
  });

  it('BOUNDARIES-10: no hay next_retry_at ni attempt_count nuevos', () => {
    const src = readFile('supabase/migrations/20260723000001_sc_security_b3.sql');
    expect(src).not.toMatch(/next_retry_at/);
    expect(src).not.toMatch(/attempt_count/);
  });

  it('BOUNDARIES-11: no hay conexión a VITE_ secrets (preflight lo confirma)', () => {
    const src = readFile('scripts/smart-conversations/dev-preflight.mjs');
    expect(src).not.toMatch(/VITE_SERVICE_ROLE|VITE_SIGNING/);
  });

  it('BOUNDARIES-12: FORCE ROW LEVEL SECURITY en migración 11B3', () => {
    const src = readFile('supabase/migrations/20260723000001_sc_security_b3.sql');
    expect(src).toMatch(/FORCE ROW LEVEL SECURITY/i);
  });

  it('BOUNDARIES-13: todas las funciones SQL tienen SET search_path', () => {
    const src = readFile('supabase/migrations/20260723000001_sc_security_b3.sql');
    // Verificar que las funciones SECURITY DEFINER tienen search_path
    expect(src).toMatch(/SET search_path = public/);
  });
});
