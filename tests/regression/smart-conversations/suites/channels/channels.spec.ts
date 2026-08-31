/**
 * Suite: Adaptadores de canal (Fase 5A)
 * Análisis estático del código fuente de conv-wa-webhook, conv-web-session y conv-web-message.
 * IDs: CHAN-WA, CHAN-WS, CHAN-WM, CHAN-P, CHAN-REG
 */

import { describe, it, beforeAll, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EF_DIR = resolve(__dirname, '../../../../../supabase/functions');

let srcWaWebhook: string;
let srcWebSession: string;
let srcWebMessage: string;

beforeAll(() => {
  srcWaWebhook  = readFileSync(resolve(EF_DIR, 'conv-wa-webhook/index.ts'), 'utf-8');
  srcWebSession = readFileSync(resolve(EF_DIR, 'conv-web-session/index.ts'), 'utf-8');
  srcWebMessage = readFileSync(resolve(EF_DIR, 'conv-web-message/index.ts'), 'utf-8');
});

// ---------------------------------------------------------------------------
// CHAN-WA — conv-wa-webhook (WhatsApp inbound)
// ---------------------------------------------------------------------------

describe('CHAN-WA: conv-wa-webhook — WhatsApp inbound', () => {

  it('CHAN-WA-01: verifica firma HMAC-SHA256 con rotación (Fase 11B3)', () => {
    // Fase 11B3: verifyHmacSha256 reemplazado por verifyHmacWithRotation (soporte rotación)
    expect(srcWaWebhook).toContain('verifyHmacWithRotation');
    expect(srcWaWebhook).toContain('crypto.subtle');
    expect(srcWaWebhook).toContain('HMAC');
    expect(srcWaWebhook).toContain('SHA-256');
  });

  it('CHAN-WA-02: firma inválida responde 200 silencioso', () => {
    expect(srcWaWebhook).toContain('signatureValid');
    expect(srcWaWebhook).toContain('silentOk()');
    // El bloque if (!signatureValid) contiene silentOk() — ventana amplia para cubrir el bloque
    expect(srcWaWebhook).toMatch(/signatureValid[\s\S]{0,300}silentOk\(\)/);
  });

  it('CHAN-WA-03: firma inválida no llama a conv-ingest', () => {
    // La llamada real usa el template literal /functions/v1/conv-ingest — no el comentario JSDoc
    const invalidSigReturn = srcWaWebhook.indexOf('signatureValid');
    const ingestCall = srcWaWebhook.indexOf('functions/v1/conv-ingest');
    expect(invalidSigReturn).toBeGreaterThan(0);
    expect(ingestCall).toBeGreaterThan(0);
    expect(invalidSigReturn).toBeLessThan(ingestCall);
  });

  it('CHAN-WA-04: payload Wasender se normaliza a NormalizedMessage', () => {
    expect(srcWaWebhook).toContain('channel: \'whatsapp\'');
    expect(srcWaWebhook).toContain('sender_ref');
    expect(srcWaWebhook).toContain('message_text');
    expect(srcWaWebhook).toContain('provider_message_id');
    expect(srcWaWebhook).toContain('normalized_message');
  });

  it('CHAN-WA-05: sender_ref WhatsApp es teléfono internacional sin @c.us ni @s.whatsapp.net', () => {
    expect(srcWaWebhook).toContain('normalizeSenderRef');
    expect(srcWaWebhook).toContain('@s.whatsapp.net');
    expect(srcWaWebhook).toContain('@c.us');
    // La normalización elimina ambos sufijos
    expect(srcWaWebhook).toMatch(/@s\.whatsapp\.net[\s\S]{0,50}split|split[\s\S]{0,50}@s\.whatsapp\.net/);
    expect(srcWaWebhook).toMatch(/@c\.us[\s\S]{0,50}split|split[\s\S]{0,50}@c\.us/);
  });

  it('CHAN-WA-06: @c.us se elimina antes de llamar a conv-ingest (sender_ref normalizado)', () => {
    // normalizeSenderRef quita @c.us antes de construir el payload para conv-ingest
    const normalizePos = srcWaWebhook.indexOf('normalizeSenderRef(remoteJid)');
    const ingestPos = srcWaWebhook.indexOf('functions/v1/conv-ingest');
    expect(normalizePos).toBeGreaterThan(0);
    expect(ingestPos).toBeGreaterThan(0);
    expect(normalizePos).toBeLessThan(ingestPos);
    // El resultado normalizado (senderRef) se usa en el payload
    expect(srcWaWebhook).toContain('sender_ref: senderRef');
  });

  it('CHAN-WA-07: provider_message_id se asigna desde wasender_message_id (key.id)', () => {
    expect(srcWaWebhook).toContain('key?.id');
    expect(srcWaWebhook).toContain('waMessageId');
    expect(srcWaWebhook).toContain('provider_message_id: waMessageId');
  });

  it('CHAN-WA-08: message_text se pasa a conv-ingest pero no se loguea', () => {
    expect(srcWaWebhook).toContain('messageText');
    expect(srcWaWebhook).toContain('message_text: messageText');
    // message_text no debe aparecer en llamadas a log.*
    expect(srcWaWebhook).not.toMatch(/log\.(info|warn|error)[^;]*messageText/);
    expect(srcWaWebhook).not.toMatch(/log\.(info|warn|error)[^;]*message_text/);
  });

  it('CHAN-WA-09: raw_payload no se envía a n8n ni a IA', () => {
    expect(srcWaWebhook).not.toContain('raw_payload:');
    expect(srcWaWebhook).not.toContain('n8n.io');
    expect(srcWaWebhook).not.toContain('anthropic');
  });

  it('CHAN-WA-10: sesión WhatsApp inactiva no llama a conv-ingest', () => {
    // status !== 'active' → silentOk() antes de la llamada a /functions/v1/conv-ingest
    const statusCheck = srcWaWebhook.indexOf("status !== 'active'");
    const ingestCall = srcWaWebhook.indexOf('functions/v1/conv-ingest');
    expect(statusCheck).toBeGreaterThan(0);
    expect(ingestCall).toBeGreaterThan(0);
    expect(statusCheck).toBeLessThan(ingestCall);
  });

  it('CHAN-WA-11: no llama a Wasender real (sin API key externa)', () => {
    expect(srcWaWebhook).not.toContain('wasender.io');
    expect(srcWaWebhook).not.toContain('wasenderapi');
    expect(srcWaWebhook).not.toContain('/api/sendText');
    expect(srcWaWebhook).not.toContain('/api/send');
  });

  it('CHAN-WA-12: no llama a Claude real', () => {
    expect(srcWaWebhook).not.toContain('anthropic');
    expect(srcWaWebhook).not.toContain('claude.ai');
    expect(srcWaWebhook).not.toContain('messages.create');
  });

  it('CHAN-WA-13: no llama a n8n real', () => {
    expect(srcWaWebhook).not.toContain('n8n.io');
    expect(srcWaWebhook).not.toContain('/webhook/');
  });

  it('CHAN-WA-14: no implementa WF-10 ni routing directo', () => {
    expect(srcWaWebhook).not.toContain('WF-10');
    expect(srcWaWebhook).not.toContain('conv-wf-10');
    expect(srcWaWebhook).not.toContain('classify_intent');
  });

  it('CHAN-WA-15: no envía mensaje outbound (sin conv-send-wa ni Wasender send)', () => {
    expect(srcWaWebhook).not.toContain('conv-send-wa');
    expect(srcWaWebhook).not.toContain('sendMessage');
    expect(srcWaWebhook).not.toContain('sendText');
  });

});

// ---------------------------------------------------------------------------
// CHAN-WS — conv-web-session (WebChat session init)
// ---------------------------------------------------------------------------

describe('CHAN-WS: conv-web-session — WebChat session init', () => {

  it('CHAN-WS-01: crea sender_ref opaco con prefijo wc_', () => {
    expect(srcWebSession).toContain("'wc_'");
    expect(srcWebSession).toContain('crypto.randomUUID()');
    expect(srcWebSession).toContain('senderRef');
  });

  it('CHAN-WS-02: no devuelve profile_id en la respuesta (Fase 11B3)', () => {
    // Fase 11B3: respuesta via successResponse + addCorsToResponse (no return ok() directo)
    const okBlock = srcWebSession.match(/(?:return ok|const successResponse = ok)\(\{[\s\S]{0,500}\}\)/);
    expect(okBlock).not.toBeNull();
    expect(okBlock![0]).not.toContain('profile_id');
  });

  it('CHAN-WS-03: no devuelve service_role en la respuesta (Fase 11B3)', () => {
    const okBlock = srcWebSession.match(/(?:return ok|const successResponse = ok)\(\{[\s\S]{0,500}\}\)/);
    expect(okBlock).not.toBeNull();
    expect(okBlock![0]).not.toContain('serviceRoleKey');
    expect(okBlock![0]).not.toContain('service_role');
  });

  it('CHAN-WS-04: valida origin contra allowed_origins', () => {
    expect(srcWebSession).toContain('allowed_origins');
    expect(srcWebSession).toContain('origin');
    expect(srcWebSession).toContain('.includes(origin)');
  });

  it('CHAN-WS-05: origin no permitido devuelve 403 controlado', () => {
    expect(srcWebSession).toContain('Origin no permitido');
    expect(srcWebSession).toContain('403');
    expect(srcWebSession).toContain(ERROR_CODES_FORBIDDEN);
  });

  it('CHAN-WS-06: WebChat inactivo no permite iniciar sesión — devuelve 403', () => {
    expect(srcWebSession).toContain('!wcConfig.is_active');
    expect(srcWebSession).toContain('WebChat no está activo');
    expect(srcWebSession).toContain('403');
  });

  it('CHAN-WS-07: no llama a n8n ni a Claude', () => {
    expect(srcWebSession).not.toContain('n8n.io');
    expect(srcWebSession).not.toContain('anthropic');
    expect(srcWebSession).not.toContain('claude.ai');
  });

  it('CHAN-WS-08: respuesta incluye channel, sender_ref, client_account_id, status', () => {
    expect(srcWebSession).toContain("channel: 'webchat'");
    expect(srcWebSession).toContain('sender_ref: senderRef');
    expect(srcWebSession).toContain('client_account_id');
    expect(srcWebSession).toContain("status: 'ready'");
  });

});

// ---------------------------------------------------------------------------
// CHAN-WM — conv-web-message (WebChat inbound message)
// ---------------------------------------------------------------------------

describe('CHAN-WM: conv-web-message — WebChat inbound message', () => {

  it('CHAN-WM-01: valida client_account_id obligatorio', () => {
    expect(srcWebMessage).toContain('client_account_id');
    expect(srcWebMessage).toMatch(/client_account_id[^:]*obligatorio/);
  });

  it('CHAN-WM-02: valida sender_ref obligatorio', () => {
    expect(srcWebMessage).toContain('sender_ref');
    expect(srcWebMessage).toMatch(/sender_ref[^:]*obligatorio/);
  });

  it('CHAN-WM-03: valida message_text obligatorio', () => {
    expect(srcWebMessage).toContain('message_text');
    expect(srcWebMessage).toMatch(/message_text[^:]*obligatorio/);
  });

  it('CHAN-WM-04: construye NormalizedMessage con channel=webchat', () => {
    expect(srcWebMessage).toContain("channel: 'webchat'");
    expect(srcWebMessage).toContain('normalized_message');
    expect(srcWebMessage).toContain('sender_ref');
    expect(srcWebMessage).toContain('message_text');
  });

  it('CHAN-WM-05: llama a conv-ingest con service_role', () => {
    // La URL está en un template literal: /functions/v1/conv-ingest
    expect(srcWebMessage).toContain('conv-ingest');
    expect(srcWebMessage).toContain('serviceRoleKey');
    expect(srcWebMessage).toContain('Authorization');
  });

  it('CHAN-WM-06: provider_message_id es null para WebChat (no obligatorio)', () => {
    expect(srcWebMessage).toContain('provider_message_id: null');
  });

  it('CHAN-WM-07: no implementa WF-10 ni routing directo', () => {
    expect(srcWebMessage).not.toContain('WF-10');
    expect(srcWebMessage).not.toContain('conv-wf-10');
    expect(srcWebMessage).not.toContain('classify_intent');
  });

  it('CHAN-WM-08: no llama a n8n real', () => {
    expect(srcWebMessage).not.toContain('n8n.io');
    expect(srcWebMessage).not.toContain('/webhook/');
  });

  it('CHAN-WM-09: no llama a Claude real', () => {
    expect(srcWebMessage).not.toContain('anthropic');
    expect(srcWebMessage).not.toContain('claude.ai');
    expect(srcWebMessage).not.toContain('messages.create');
  });

  it('CHAN-WM-10: no llama a Core real', () => {
    expect(srcWebMessage).not.toContain('smartroom-core');
    expect(srcWebMessage).not.toContain('/api/v1/incidents');
    expect(srcWebMessage).not.toContain('/api/v1/leads');
  });

});

// ---------------------------------------------------------------------------
// CHAN-P — privacidad y logging en todos los canales
// ---------------------------------------------------------------------------

describe('CHAN-P: privacidad y sanitización de logs', () => {

  it('CHAN-P-01: logs de conv-wa-webhook no contienen teléfono/sender_ref', () => {
    expect(srcWaWebhook).not.toMatch(/log\.(info|warn|error)[^;]*senderRef/);
    expect(srcWaWebhook).not.toMatch(/log\.(info|warn|error)[^;]*phone/);
    expect(srcWaWebhook).not.toMatch(/log\.(info|warn|error)[^;]*remoteJid/);
  });

  it('CHAN-P-02: logs de conv-wa-webhook no contienen message_text', () => {
    expect(srcWaWebhook).not.toMatch(/log\.(info|warn|error)[^;]*messageText/);
    expect(srcWaWebhook).not.toMatch(/log\.(info|warn|error)[^;]*message_text/);
  });

  it('CHAN-P-03: logs de conv-web-message no contienen message_text', () => {
    expect(srcWebMessage).not.toMatch(/log\.(info|warn|error)[^;]*message_text/);
  });

  it('CHAN-P-04: logs no contienen tokens (firma, service_role, api_key)', () => {
    expect(srcWaWebhook).not.toMatch(/log\.(info|warn|error)[^;]*signature/);
    expect(srcWaWebhook).not.toMatch(/log\.(info|warn|error)[^;]*serviceRoleKey/);
    expect(srcWebSession).not.toMatch(/log\.(info|warn|error)[^;]*serviceRoleKey/);
    expect(srcWebMessage).not.toMatch(/log\.(info|warn|error)[^;]*serviceRoleKey/);
  });

  it('CHAN-P-05: logs no contienen raw_payload', () => {
    expect(srcWaWebhook).not.toMatch(/log\.(info|warn|error)[^;]*rawBody/);
    expect(srcWaWebhook).not.toContain('raw_payload:');
    expect(srcWebMessage).not.toContain('raw_payload:');
  });

  it('CHAN-P-06: ningún canal envía profile_id a conv-ingest', () => {
    // El payload que se envía a conv-ingest no incluye profile_id
    const waIngestPayload = srcWaWebhook.match(/normalized_message:\s*\{[^}]+\}/);
    expect(waIngestPayload).not.toBeNull();
    expect(waIngestPayload![0]).not.toContain('profile_id');

    const wmIngestPayload = srcWebMessage.match(/normalized_message:\s*\{[^}]+\}/);
    expect(wmIngestPayload).not.toBeNull();
    expect(wmIngestPayload![0]).not.toContain('profile_id');
  });

  it('CHAN-P-07: ningún canal envía identity_data a conv-ingest', () => {
    const waIngestPayload = srcWaWebhook.match(/normalized_message:\s*\{[^}]+\}/);
    expect(waIngestPayload![0]).not.toContain('identity_data');

    const wmIngestPayload = srcWebMessage.match(/normalized_message:\s*\{[^}]+\}/);
    expect(wmIngestPayload![0]).not.toContain('identity_data');
  });

});

// ---------------------------------------------------------------------------
// CHAN-REG — regression global
// ---------------------------------------------------------------------------

describe('CHAN-REG: regresión — restricciones de Fase 5A', () => {

  it('CHAN-REG-01: ningún canal implementa envío outbound (sin conv-send-wa)', () => {
    expect(srcWaWebhook).not.toContain('conv-send-wa');
    expect(srcWebSession).not.toContain('conv-send-wa');
    expect(srcWebMessage).not.toContain('conv-send-wa');
  });

  it('CHAN-REG-02: ningún canal introduce WF-02 ni routing bypass', () => {
    for (const src of [srcWaWebhook, srcWebSession, srcWebMessage]) {
      expect(src).not.toContain('WF-02');
    }
  });

  it('CHAN-REG-03: ningún canal introduce UNVERIFIED', () => {
    for (const src of [srcWaWebhook, srcWebSession, srcWebMessage]) {
      expect(src).not.toContain('UNVERIFIED');
    }
  });

  it('CHAN-REG-04: ningún canal introduce next_retry_at ni attempt_count', () => {
    for (const src of [srcWaWebhook, srcWebSession, srcWebMessage]) {
      expect(src).not.toContain('next_retry_at');
      expect(src).not.toContain('attempt_count');
    }
  });

  it('CHAN-REG-05: ambos canales usan shared runtime correctamente', () => {
    expect(srcWaWebhook).toContain('_shared/smart-conversations/ef-logger.ts');
    expect(srcWebSession).toContain('_shared/response.ts');
    expect(srcWebSession).toContain('_shared/smart-conversations/ef-logger.ts');
    expect(srcWebMessage).toContain('_shared/response.ts');
    expect(srcWebMessage).toContain('_shared/smart-conversations/ef-logger.ts');
  });

  it('CHAN-REG-06: @c.us no aparece en sender_ref de ningún canal de salida', () => {
    // La normalización de conv-wa-webhook elimina @c.us antes de construir sender_ref
    expect(srcWaWebhook).toContain('@c.us');                    // aparece en la lógica de limpieza
    expect(srcWaWebhook).toContain('sender_ref: senderRef');    // resultado normalizado
    // El payload enviado a conv-ingest no contiene la cadena '@c.us' como valor
    expect(srcWaWebhook).not.toMatch(/sender_ref:\s*['"][^'"]*@c\.us[^'"]*['"]/);
    // WebChat nunca tiene @c.us (referencia opaca)
    expect(srcWebMessage).not.toContain('@c.us');
  });

});

// ---------------------------------------------------------------------------
// Helpers internos del test (no son constantes del dominio)
// ---------------------------------------------------------------------------

const ERROR_CODES_FORBIDDEN = 'FORBIDDEN';
