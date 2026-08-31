/**
 * Suite: Outbound (Fase 5B)
 * Análisis estático del código fuente de conv-send-wa, conv-process-send-queue,
 * conv-web-deliver y wasender-client.
 * IDs: OUTBOUND-WA, OUTBOUND-Q, OUTBOUND-WD, OUTBOUND-P, OUTBOUND-REG
 */

import { describe, it, beforeAll, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EF_DIR      = resolve(__dirname, '../../../../../supabase/functions');
const SHARED_DIR  = resolve(EF_DIR, '_shared/smart-conversations/runtime');

let srcSendWa:       string;
let srcProcessQueue: string;
let srcWebDeliver:   string;
let srcWasenderClient: string;

beforeAll(() => {
  srcSendWa        = readFileSync(resolve(EF_DIR, 'conv-send-wa/index.ts'), 'utf-8');
  srcProcessQueue  = readFileSync(resolve(EF_DIR, 'conv-process-send-queue/index.ts'), 'utf-8');
  srcWebDeliver    = readFileSync(resolve(EF_DIR, 'conv-web-deliver/index.ts'), 'utf-8');
  srcWasenderClient = readFileSync(resolve(SHARED_DIR, 'wasender-client.ts'), 'utf-8');
});

// ---------------------------------------------------------------------------
// OUTBOUND-WA — conv-send-wa (WhatsApp outbound)
// ---------------------------------------------------------------------------

describe('OUTBOUND-WA: conv-send-wa — WhatsApp outbound', () => {

  it('OUTBOUND-WA-01: requiere service_role', () => {
    expect(srcSendWa).toContain('isServiceRoleRequest');
    expect(srcSendWa).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(srcSendWa).toContain('ERROR_CODES.UNAUTHORIZED');
  });

  it('OUTBOUND-WA-02: rechaza session_token — isServiceRoleRequest rechaza todo lo que no es service_role', () => {
    // El check de service_role es la única barrera de auth — rechaza anon, JWT y session_token
    expect(srcSendWa).toContain('isServiceRoleRequest');
    expect(srcSendWa).not.toContain('getUser');
    expect(srcSendWa).not.toContain('getSession');
  });

  it('OUTBOUND-WA-03: rechaza sesión inexistente — devuelve 404', () => {
    expect(srcSendWa).toContain('NOT_FOUND');
    expect(srcSendWa).toContain('Sesión no encontrada');
  });

  it('OUTBOUND-WA-04: rechaza sesión que no sea whatsapp', () => {
    expect(srcSendWa).toContain("channel !== 'whatsapp'");
    expect(srcSendWa).toContain('La sesión no es de canal whatsapp');
  });

  it('OUTBOUND-WA-05: lee sender_ref desde conv_sessions', () => {
    expect(srcSendWa).toContain('sender_ref');
    expect(srcSendWa).toContain("'conv_sessions'");
    expect(srcSendWa).toContain('.select(');
  });

  it('OUTBOUND-WA-06: no guarda @c.us en sender_ref — la normalización es inbound, no outbound', () => {
    // sender_ref se lee tal cual de conv_sessions (ya limpio de ingest)
    // conv-send-wa no añade @c.us al sender_ref ni lo persiste
    expect(srcSendWa).not.toMatch(/sender_ref[^=]*@c\.us/);
    expect(srcSendWa).not.toMatch(/senderRef[^=]*@c\.us/);
  });

  it('OUTBOUND-WA-07: construye `to` solo dentro del adapter (wasender-client)', () => {
    // conv-send-wa llama a sendWasenderMessage — el JID se construye en wasender-client
    expect(srcSendWa).toContain('sendWasenderMessage');
    expect(srcWasenderClient).toContain('@s.whatsapp.net');
    expect(srcWasenderClient).toContain('buildWasenderJid');
    // El EF conv-send-wa no contiene @s.whatsapp.net ni @c.us en la construcción del to
    expect(srcSendWa).not.toContain('@s.whatsapp.net');
  });

  it('OUTBOUND-WA-08: inserta mensaje outbound en conv_messages', () => {
    expect(srcSendWa).toContain("'conv_messages'");
    expect(srcSendWa).toContain('.insert(');
    expect(srcSendWa).toContain("direction: 'outbound'");
    expect(srcSendWa).toContain("sender_type: 'bot'");
  });

  it('OUTBOUND-WA-09: si envío mock OK marca mensaje como sent', () => {
    expect(srcSendWa).toContain("status: 'sent'");
    expect(srcSendWa).toContain('sendResult.ok');
    expect(srcSendWa).toMatch(/sendResult\.ok[\s\S]{0,200}status: 'sent'/);
  });

  it('OUTBOUND-WA-10: si envío mock falla crea entrada en conv_send_queue', () => {
    expect(srcSendWa).toContain("'conv_send_queue'");
    expect(srcSendWa).toContain("status: 'pending'");
  });

  it('OUTBOUND-WA-11: conv_send_queue.payload contiene message_id', () => {
    expect(srcSendWa).toContain('message_id: messageId');
    expect(srcSendWa).toContain('queuePayload');
    expect(srcSendWa).toMatch(/queuePayload\s*=\s*\{[^}]*message_id/);
  });

  it('OUTBOUND-WA-12: conv_send_queue.payload no contiene teléfono ni sender_ref', () => {
    const payloadBlock = srcSendWa.match(/queuePayload\s*=\s*\{[^}]+\}/);
    expect(payloadBlock).not.toBeNull();
    const block = payloadBlock![0];
    expect(block).not.toContain('senderRef');
    expect(block).not.toContain('sender_ref');
    expect(block).not.toContain('phone');
  });

  it('OUTBOUND-WA-13: conv_send_queue.payload no contiene texto del mensaje', () => {
    const payloadBlock = srcSendWa.match(/queuePayload\s*=\s*\{[^}]+\}/);
    expect(payloadBlock).not.toBeNull();
    const block = payloadBlock![0];
    expect(block).not.toContain('text');
    expect(block).not.toContain('message_text');
  });

  it('OUTBOUND-WA-14: no usa next_retry_at', () => {
    expect(srcSendWa).not.toContain('next_retry_at');
  });

  it('OUTBOUND-WA-15: no usa attempt_count', () => {
    expect(srcSendWa).not.toContain('attempt_count');
  });

});

// ---------------------------------------------------------------------------
// OUTBOUND-Q — conv-process-send-queue
// ---------------------------------------------------------------------------

describe('OUTBOUND-Q: conv-process-send-queue — Queue processor', () => {

  it('OUTBOUND-Q-01: selecciona pending con next_attempt_at <= now()', () => {
    expect(srcProcessQueue).toContain(".eq('status', 'pending')");
    expect(srcProcessQueue).toContain('.lte(\'next_attempt_at\'');
    expect(srcProcessQueue).toMatch(/next_attempt_at[\s\S]{0,50}new Date/);
  });

  it('OUTBOUND-Q-02: marca entrada como processing', () => {
    expect(srcProcessQueue).toContain("status: 'processing'");
    expect(srcProcessQueue).toContain('.update(');
  });

  it('OUTBOUND-Q-03: en éxito marca queue succeeded', () => {
    expect(srcProcessQueue).toContain("status: 'succeeded'");
  });

  it('OUTBOUND-Q-04: en éxito marca mensaje sent', () => {
    expect(srcProcessQueue).toContain("status: 'sent'");
    expect(srcProcessQueue).toContain("'conv_messages'");
  });

  it('OUTBOUND-Q-05: en fallo retryable incrementa attempts', () => {
    expect(srcProcessQueue).toContain('newAttempts');
    expect(srcProcessQueue).toContain('attempts: newAttempts');
    expect(srcProcessQueue).toMatch(/newAttempts[^=]*=.*attempts.*\+\s*1/);
  });

  it('OUTBOUND-Q-06: en fallo retryable actualiza next_attempt_at', () => {
    expect(srcProcessQueue).toContain('next_attempt_at: nextAttemptAt');
    expect(srcProcessQueue).toContain('getBackoffSeconds');
  });

  it('OUTBOUND-Q-07: backoff usa 1s, 5s, 30s', () => {
    expect(srcProcessQueue).toContain('BACKOFF_SECONDS');
    expect(srcProcessQueue).toContain('1, 5, 30');
  });

  it('OUTBOUND-Q-08: no ejecuta más allá de max_retries', () => {
    expect(srcProcessQueue).toContain('max_retries');
    // El check newAttempts < max_retries evita el cuarto intento
    expect(srcProcessQueue).toMatch(/newAttempts\s*<\s*\(max_retries|newAttempts\s*<\s*max_retries/);
  });

  it('OUTBOUND-Q-09: en fallo definitivo marca queue failed', () => {
    expect(srcProcessQueue).toContain("status: 'failed'");
    expect(srcProcessQueue).toContain('max_retries_exhausted');
  });

  it('OUTBOUND-Q-10: en fallo definitivo marca mensaje failed', () => {
    // Hay dos updates de conv_messages en el fallo definitivo: estado 'failed'
    expect(srcProcessQueue).toMatch(/"'conv_messages'"[\s\S]{0,300}status: 'failed'|status: 'failed'[\s\S]{0,300}'conv_messages'/);
  });

  it('OUTBOUND-Q-11: en fallo definitivo crea conv_admin_notifications', () => {
    expect(srcProcessQueue).toContain("'conv_admin_notifications'");
    expect(srcProcessQueue).toContain("'delivery_failed_batch'");
  });

  it('OUTBOUND-Q-12: en fallo definitivo publica conv_message_delivery_failed', () => {
    expect(srcProcessQueue).toContain("'conv_message_delivery_failed'");
    expect(srcProcessQueue).toContain('conv-core-publish-activity');
  });

  it('OUTBOUND-Q-13: fallo de Activity Log no bloquea la actualización principal — fire-and-log', () => {
    expect(srcProcessQueue).toMatch(/conv-core-publish-activity[\s\S]{0,600}\.catch\(/);
  });

  it('OUTBOUND-Q-14: reejecución idempotente — no crea notificación si queue ya está failed', () => {
    // El job solo procesa status='pending'; una vez en 'failed' no se reprocesa
    expect(srcProcessQueue).toContain(".eq('status', 'pending')");
    // Y el set a 'failed' se hace antes de la notificación
    const failedSet = srcProcessQueue.indexOf("status: 'failed'");
    const notification = srcProcessQueue.indexOf("'conv_admin_notifications'");
    expect(failedSet).toBeLessThan(notification);
  });

  it('OUTBOUND-Q-15: no usa next_retry_at', () => {
    expect(srcProcessQueue).not.toContain('next_retry_at');
  });

  it('OUTBOUND-Q-16: no usa attempt_count', () => {
    expect(srcProcessQueue).not.toContain('attempt_count');
  });

  it('OUTBOUND-Q-17: admin notification no contiene PII', () => {
    const notifBlock = srcProcessQueue.match(
      /'conv_admin_notifications'[\s\S]{0,600}\.insert\(\{[\s\S]{0,400}\}\)/
    );
    expect(notifBlock).not.toBeNull();
    const block = notifBlock![0];
    expect(block).not.toContain('phone');
    expect(block).not.toContain('full_name');
    expect(block).not.toContain('profile_id');
    expect(block).not.toContain('message.text');
    expect(block).not.toContain('senderRef');
    expect(block).not.toContain('sender_ref');
  });

});

// ---------------------------------------------------------------------------
// OUTBOUND-WD — conv-web-deliver (WebChat outbound)
// ---------------------------------------------------------------------------

describe('OUTBOUND-WD: conv-web-deliver — WebChat outbound stub', () => {

  it('OUTBOUND-WD-01: requiere service_role', () => {
    expect(srcWebDeliver).toContain('isServiceRoleRequest');
    expect(srcWebDeliver).toContain('ERROR_CODES.UNAUTHORIZED');
  });

  it('OUTBOUND-WD-02: rechaza sesión inexistente', () => {
    expect(srcWebDeliver).toContain('Sesión no encontrada');
    expect(srcWebDeliver).toContain('NOT_FOUND');
  });

  it('OUTBOUND-WD-03: rechaza sesión que no sea webchat', () => {
    expect(srcWebDeliver).toContain("channel !== 'webchat'");
    expect(srcWebDeliver).toContain('La sesión no es de canal webchat');
  });

  it('OUTBOUND-WD-04: inserta mensaje outbound en conv_messages', () => {
    expect(srcWebDeliver).toContain("'conv_messages'");
    expect(srcWebDeliver).toContain("direction: 'outbound'");
    expect(srcWebDeliver).toContain("sender_type: 'bot'");
    expect(srcWebDeliver).toContain("channel: 'webchat'");
  });

  it('OUTBOUND-WD-05: marca mensaje como sent en modo mock', () => {
    expect(srcWebDeliver).toContain("status: 'sent'");
  });

  it('OUTBOUND-WD-06: respuesta no devuelve profile_id', () => {
    const okBlock = srcWebDeliver.match(/return ok\(\{[\s\S]{0,300}\}\)/);
    expect(okBlock).not.toBeNull();
    expect(okBlock![0]).not.toContain('profile_id');
  });

  it('OUTBOUND-WD-07: respuesta no devuelve identity_data', () => {
    const okBlock = srcWebDeliver.match(/return ok\(\{[\s\S]{0,300}\}\)/);
    expect(okBlock![0]).not.toContain('identity_data');
  });

  it('OUTBOUND-WD-08: no implementa WebSocket Realtime real (supabase.channel / subscribe)', () => {
    // Fase 10F añade Realtime best-effort via helper — no WebSocket directo
    expect(srcWebDeliver).not.toContain('supabase.channel(');
    expect(srcWebDeliver).not.toContain('.subscribe(');
    expect(srcWebDeliver).not.toContain('.on(');
  });

  it('OUTBOUND-WD-09: no llama a n8n', () => {
    expect(srcWebDeliver).not.toContain('n8n.io');
    expect(srcWebDeliver).not.toContain('/webhook/');
  });

  it('OUTBOUND-WD-10: no llama a Claude', () => {
    expect(srcWebDeliver).not.toContain('anthropic');
    expect(srcWebDeliver).not.toContain('claude.ai');
    expect(srcWebDeliver).not.toContain('messages.create');
  });

  it('OUTBOUND-WD-11: no llama a Core real', () => {
    expect(srcWebDeliver).not.toContain('smartroom-core');
    expect(srcWebDeliver).not.toContain('/api/v1/');
  });

});

// ---------------------------------------------------------------------------
// OUTBOUND-P — privacidad y logging
// ---------------------------------------------------------------------------

describe('OUTBOUND-P: privacidad y sanitización de logs', () => {

  it('OUTBOUND-P-01: logs de conv-send-wa no contienen teléfono ni sender_ref', () => {
    expect(srcSendWa).not.toMatch(/log\.(info|warn|error)[^;]*senderRef/);
    expect(srcSendWa).not.toMatch(/log\.(info|warn|error)[^;]*sender_ref/);
  });

  it('OUTBOUND-P-02: logs de conv-send-wa no contienen texto del mensaje', () => {
    expect(srcSendWa).not.toMatch(/log\.(info|warn|error)[^;]*\btext\b/);
  });

  it('OUTBOUND-P-03: logs de conv-web-deliver no contienen texto del mensaje', () => {
    expect(srcWebDeliver).not.toMatch(/log\.(info|warn|error)[^;]*\btext\b/);
  });

  it('OUTBOUND-P-04: logs no contienen tokens (service_role key)', () => {
    for (const src of [srcSendWa, srcProcessQueue, srcWebDeliver]) {
      expect(src).not.toMatch(/log\.(info|warn|error)[^;]*serviceRoleKey/);
    }
  });

  it('OUTBOUND-P-05: wasender-client no loguea `to` (JID con teléfono)', () => {
    // El adapter no tiene logger — no hay log.* calls
    expect(srcWasenderClient).not.toMatch(/log\.(info|warn|error)/);
  });

  it('OUTBOUND-P-06: Activity Log no incluye texto ni teléfono en payload', () => {
    const activityBlock = srcProcessQueue.match(
      /conv_message_delivery_failed[\s\S]{0,400}data:\s*\{[^}]+\}/
    );
    expect(activityBlock).not.toBeNull();
    const block = activityBlock![0];
    expect(block).not.toContain('text');
    expect(block).not.toContain('phone');
    expect(block).not.toContain('sender_ref');
    expect(block).not.toContain('profile_id');
  });

  it('OUTBOUND-P-07: admin notifications no contienen texto ni teléfono', () => {
    const notifBlock = srcProcessQueue.match(
      /'conv_admin_notifications'[\s\S]{0,600}\.insert\(\{[\s\S]{0,400}\}\)/
    );
    expect(notifBlock).not.toBeNull();
    const block = notifBlock![0];
    expect(block).not.toContain("message.text");
    expect(block).not.toContain('phone');
  });

});

// ---------------------------------------------------------------------------
// OUTBOUND-REG — regression global
// ---------------------------------------------------------------------------

describe('OUTBOUND-REG: regresión — restricciones de Fase 5B', () => {

  it('OUTBOUND-REG-01: ningún EF llama a Wasender real', () => {
    for (const src of [srcSendWa, srcProcessQueue, srcWebDeliver]) {
      expect(src).not.toContain('wasender.io');
      expect(src).not.toContain('wasenderapi');
    }
    // El adapter tampoco hace llamadas reales en esta fase
    expect(srcWasenderClient).not.toContain('https://api.wasender');
    expect(srcWasenderClient).not.toContain('fetch(');
  });

  it('OUTBOUND-REG-02: ningún EF llama a Claude real', () => {
    for (const src of [srcSendWa, srcProcessQueue, srcWebDeliver]) {
      expect(src).not.toContain('anthropic');
      expect(src).not.toContain('messages.create');
    }
  });

  it('OUTBOUND-REG-03: ningún EF llama a n8n real', () => {
    for (const src of [srcSendWa, srcProcessQueue, srcWebDeliver]) {
      expect(src).not.toContain('n8n.io');
      expect(src).not.toContain('/webhook/');
    }
  });

  it('OUTBOUND-REG-04: ningún EF llama a Core real', () => {
    for (const src of [srcSendWa, srcProcessQueue, srcWebDeliver]) {
      expect(src).not.toContain('/api/v1/incidents');
      expect(src).not.toContain('/api/v1/leads');
    }
  });

  it('OUTBOUND-REG-05: ningún EF introduce UNVERIFIED', () => {
    for (const src of [srcSendWa, srcProcessQueue, srcWebDeliver, srcWasenderClient]) {
      expect(src).not.toContain('UNVERIFIED');
    }
  });

  it('OUTBOUND-REG-06: ningún EF introduce next_retry_at ni attempt_count', () => {
    for (const src of [srcSendWa, srcProcessQueue, srcWebDeliver]) {
      expect(src).not.toContain('next_retry_at');
      expect(src).not.toContain('attempt_count');
    }
  });

  it('OUTBOUND-REG-07: wasender-client construye JID (@s.whatsapp.net) solo internamente', () => {
    // JID solo aparece en el adapter — no en conv-send-wa ni conv-process-send-queue
    expect(srcWasenderClient).toContain('@s.whatsapp.net');
    expect(srcSendWa).not.toContain('@s.whatsapp.net');
    expect(srcProcessQueue).not.toContain('@s.whatsapp.net');
  });

});
