/**
 * Fase 10D -- Wasender Integration Tests
 *
 * No envia WhatsApps reales. No usa API keys reales. No conecta Wasender real.
 * Valida: wasender-http-client vendor-safe, feature flag, JID handling,
 * retry HTTP, privacidad, webhook signature, limites, restricciones.
 *
 * WASENDER-CONFIG      (01-06)
 * WASENDER-HTTP        (07-19)
 * WASENDER-JID         (20-29)
 * WASENDER-WEBHOOK     (30-37)
 * WASENDER-OUTBOUND    (38-46)
 * WASENDER-SMOKE-GUARD (47-54)
 * WASENDER-BOUNDARIES  (55-62)
 * WASENDER-RESTRICTIONS(63-70)
 * WASENDER-REGRESSION  (71-87)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Imports del runtime
// ---------------------------------------------------------------------------

import {
  getWasenderIntegrationMode,
  sendWasenderMessage,
  verifyWasenderWebhookSignature,
  normalizeWasenderRemoteJid,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/wasender-http-client';

// ---------------------------------------------------------------------------
// Rutas de artefactos (analisis estatico)
// ---------------------------------------------------------------------------

const ROOT = resolve(__dirname, '../../../../../');

const WA_CLIENT_PATH   = resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/wasender-http-client.ts');
const WA_LEGACY_PATH   = resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/wasender-client.ts');
const SEND_WA_PATH     = resolve(ROOT, 'supabase/functions/conv-send-wa/index.ts');
const WEBHOOK_PATH     = resolve(ROOT, 'supabase/functions/conv-wa-webhook/index.ts');
const QUEUE_PATH       = resolve(ROOT, 'supabase/functions/conv-process-send-queue/index.ts');
const SMOKE_PATH       = resolve(ROOT, 'scripts/smart-conversations/wasender-smoke.ts');
const ENV_DOC_PATH     = resolve(ROOT, 'docs/smart-conversations/wasender-integration/env.example.md');
const SMOKE_PLAN_PATH  = resolve(ROOT, 'docs/smart-conversations/wasender-integration/smoke-test-plan.md');
const WEBHOOK_SEC_PATH = resolve(ROOT, 'docs/smart-conversations/wasender-integration/webhook-security.md');

function readFile(p: string): string { return readFileSync(p, 'utf-8'); }

const SUITES_ROOT = resolve(ROOT, 'tests/regression/smart-conversations/suites');

// ---------------------------------------------------------------------------
// Setup global
// ---------------------------------------------------------------------------

const ENV: Record<string, string | undefined> = {};
const mockDeno = { env: { get: (k: string) => ENV[k] } };
let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  for (const k of Object.keys(ENV)) delete ENV[k];
  mockFetch = vi.fn();
  vi.stubGlobal('Deno', mockDeno);
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function fakeResponse(status: number, body: unknown = null): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

function abortErr(): Error {
  return Object.assign(new Error('aborted'), { name: 'AbortError' });
}

const MOCK_REQ = {
  client_account_id: 'acc1',
  wa_session_id:     'ses1',
  recipient_ref:     '+34600000001',
  text:              'hola desde test',
};

// ---------------------------------------------------------------------------
// WASENDER-CONFIG (01-06)
// ---------------------------------------------------------------------------

describe('WASENDER-CONFIG', () => {
  it('WS-01: default mode es mock cuando env esta vacio', () => {
    expect(getWasenderIntegrationMode()).toBe('mock');
  });

  it('WS-02: mode=mock no llama fetch', async () => {
    ENV['WASENDER_INTEGRATION_MODE'] = 'mock';
    await sendWasenderMessage(MOCK_REQ);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('WS-03: mode=real sin WASENDER_API_KEY devuelve WASENDER_API_KEY_MISSING', async () => {
    ENV['WASENDER_INTEGRATION_MODE'] = 'real';
    ENV['WASENDER_BASE_URL'] = 'https://test.example.invalid';
    const result = await sendWasenderMessage(MOCK_REQ);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('WASENDER_API_KEY_MISSING');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('WS-04: mode=real sin WASENDER_BASE_URL devuelve WASENDER_BASE_URL_MISSING', async () => {
    ENV['WASENDER_INTEGRATION_MODE'] = 'real';
    ENV['WASENDER_API_KEY'] = 'test_key';
    const result = await sendWasenderMessage(MOCK_REQ);
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('WASENDER_BASE_URL_MISSING');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('WS-05: wasender-http-client no loguea WASENDER_API_KEY', () => {
    const src = readFile(WA_CLIENT_PATH);
    expect(src).not.toMatch(/console\.log\([^)]*WASENDER_API_KEY[^)]*\)/);
    expect(src).not.toMatch(/console\.warn\([^)]*WASENDER_API_KEY[^)]*\)/);
  });

  it('WS-06: wasender-http-client no loguea Authorization', () => {
    const src = readFile(WA_CLIENT_PATH);
    expect(src).not.toMatch(/console\.log\([^)]*Authorization[^)]*\)/);
  });
});

// ---------------------------------------------------------------------------
// WASENDER-HTTP (07-19)
// ---------------------------------------------------------------------------

describe('WASENDER-HTTP', () => {
  beforeEach(() => {
    ENV['WASENDER_INTEGRATION_MODE'] = 'real';
    ENV['WASENDER_API_KEY']          = 'test_token_fake';
    ENV['WASENDER_BASE_URL']         = 'https://test.example.invalid';
    ENV['WASENDER_MAX_RETRIES']      = '3';
  });

  it('WS-07: mode=real llama fetch exactamente 1 vez en 200', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { messageId: 'msg_123' }));
    await sendWasenderMessage(MOCK_REQ);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('WS-08: 200 parsea provider_message_id de messageId', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { messageId: 'msg_abc_456' }));
    const result = await sendWasenderMessage(MOCK_REQ);
    expect(result.ok).toBe(true);
    expect(result.provider_message_id).toBe('msg_abc_456');
    expect(result.status).toBe('sent');
  });

  it('WS-09: 202 se trata como sent/ok cuando status es 2xx', async () => {
    mockFetch.mockResolvedValue(fakeResponse(202, { messageId: 'queued_msg' }));
    const result = await sendWasenderMessage(MOCK_REQ);
    expect(result.ok).toBe(true);
  });

  it('WS-10: 400 no retry -- fetch llamado 1 vez', async () => {
    mockFetch.mockResolvedValue(fakeResponse(400, null));
    const result = await sendWasenderMessage(MOCK_REQ);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.retryable).toBe(false);
    expect(result.error_code).toBe('WASENDER_HTTP_400');
  });

  it('WS-11: 401 no retry', async () => {
    mockFetch.mockResolvedValue(fakeResponse(401, null));
    const result = await sendWasenderMessage(MOCK_REQ);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.retryable).toBe(false);
    expect(result.error_code).toBe('WASENDER_HTTP_401');
  });

  it('WS-12: 403 no retry', async () => {
    mockFetch.mockResolvedValue(fakeResponse(403, null));
    await sendWasenderMessage(MOCK_REQ);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('WS-13: 429 retry controlado con fake timers -- max 4 intentos', async () => {
    vi.useFakeTimers();
    ENV['WASENDER_MAX_RETRIES']            = '3';
    ENV['WASENDER_RETRY_BACKOFF_SECONDS']  = '0.001,0.001,0.001';
    mockFetch.mockResolvedValue(fakeResponse(429, null));
    const promise = sendWasenderMessage(MOCK_REQ);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(result.error_code).toContain('RATE_LIMITED');
  });

  it('WS-14: 500 retry controlado -- max 4 intentos', async () => {
    vi.useFakeTimers();
    ENV['WASENDER_MAX_RETRIES']           = '3';
    ENV['WASENDER_RETRY_BACKOFF_SECONDS'] = '0.001,0.001,0.001';
    mockFetch.mockResolvedValue(fakeResponse(500, null));
    const promise = sendWasenderMessage(MOCK_REQ);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(result.error_code).toContain('EXHAUSTED');
  });

  it('WS-15: AbortError (timeout) retry controlado', async () => {
    vi.useFakeTimers();
    ENV['WASENDER_MAX_RETRIES']           = '3';
    ENV['WASENDER_RETRY_BACKOFF_SECONDS'] = '0.001,0.001,0.001';
    mockFetch.mockRejectedValue(abortErr());
    const promise = sendWasenderMessage(MOCK_REQ);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(result.error_code).toContain('TIMEOUT');
  });

  it('WS-16: maximo WASENDER_MAX_RETRIES+1 intentos (no mas)', async () => {
    vi.useFakeTimers();
    ENV['WASENDER_MAX_RETRIES']           = '3';
    ENV['WASENDER_RETRY_BACKOFF_SECONDS'] = '0.001,0.001,0.001';
    mockFetch.mockResolvedValue(fakeResponse(503, null));
    const promise = sendWasenderMessage(MOCK_REQ);
    await vi.runAllTimersAsync();
    await promise;
    expect(mockFetch.mock.calls.length).toBeLessThanOrEqual(4);
  });

  it('WS-17: no hay cuarto intento con WASENDER_MAX_RETRIES=2', async () => {
    vi.useFakeTimers();
    ENV['WASENDER_MAX_RETRIES']           = '2';
    ENV['WASENDER_RETRY_BACKOFF_SECONDS'] = '0.001,0.001';
    mockFetch.mockResolvedValue(fakeResponse(500, null));
    const promise = sendWasenderMessage(MOCK_REQ);
    await vi.runAllTimersAsync();
    await promise;
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('WS-18: error final devuelve objeto controlado (ok=false)', async () => {
    vi.useFakeTimers();
    ENV['WASENDER_MAX_RETRIES']           = '0';
    mockFetch.mockResolvedValue(fakeResponse(500, null));
    const promise = sendWasenderMessage(MOCK_REQ);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.ok).toBe(false);
    expect(result.status).toBe('failed');
  });

  it('WS-19: error no expone stack trace en result', async () => {
    vi.useFakeTimers();
    ENV['WASENDER_MAX_RETRIES'] = '0';
    mockFetch.mockResolvedValue(fakeResponse(500, null));
    const promise = sendWasenderMessage(MOCK_REQ);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(JSON.stringify(result)).not.toContain('stack');
  });
});

// ---------------------------------------------------------------------------
// WASENDER-JID (20-29)
// ---------------------------------------------------------------------------

describe('WASENDER-JID', () => {
  it('WS-20: buildWasenderRecipientJid solo existe en wasender-http-client', () => {
    const src = readFile(WA_CLIENT_PATH);
    expect(src).toContain('buildWasenderRecipientJid');
    // No debe exportarse -- es funcion privada del adapter
    expect(src).not.toMatch(/export.*buildWasenderRecipientJid/);
  });

  it('WS-21: JID se construye solo justo antes de fetch (dentro de _sendReal)', () => {
    const src = readFile(WA_CLIENT_PATH);
    // buildWasenderRecipientJid se llama en sendWasenderMessage antes de _sendReal
    // o en _sendReal -- lo importante es que no se construye fuera del adapter
    expect(src).toContain('buildWasenderRecipientJid(req.recipient_ref)');
  });

  it('WS-22: @c.us no aparece fuera del adapter (conv-send-wa)', () => {
    expect(readFile(SEND_WA_PATH)).not.toContain('@c.us');
  });

  it('WS-23: @s.whatsapp.net no aparece fuera del adapter (conv-send-wa)', () => {
    expect(readFile(SEND_WA_PATH)).not.toContain('@s.whatsapp.net');
  });

  it('WS-24: @c.us no aparece fuera del adapter (conv-process-send-queue)', () => {
    expect(readFile(QUEUE_PATH)).not.toContain('@c.us');
  });

  it('WS-25: @s.whatsapp.net no aparece fuera del adapter (conv-process-send-queue)', () => {
    expect(readFile(QUEUE_PATH)).not.toContain('@s.whatsapp.net');
  });

  it('WS-26: normalizeWasenderRemoteJid elimina @s.whatsapp.net', () => {
    const result = normalizeWasenderRemoteJid('34612345678@s.whatsapp.net');
    expect(result).not.toContain('@s.whatsapp.net');
    expect(result).toBe('+34612345678');
  });

  it('WS-27: normalizeWasenderRemoteJid elimina @c.us', () => {
    const result = normalizeWasenderRemoteJid('34612345678@c.us');
    expect(result).not.toContain('@c.us');
    expect(result).toBe('+34612345678');
  });

  it('WS-28: JID no se envia a n8n -- wasender-http-client no llama n8n', () => {
    const src = readFile(WA_CLIENT_PATH);
    // n8n puede aparecer en comentarios indicando que NO se llama; lo que se prohíbe es llamarlo
    expect(src).not.toContain('hstgr.cloud');
    expect(src).not.toMatch(/fetch\([^)]*n8n/);
    expect(src).not.toMatch(/import.*n8n/);
  });

  it('WS-29: JID no se envia a IA -- wasender-http-client no importa ai-client', () => {
    const src = readFile(WA_CLIENT_PATH);
    expect(src).not.toContain('ai-client');
    expect(src).not.toContain('aiCall');
  });
});

// ---------------------------------------------------------------------------
// WASENDER-WEBHOOK (30-37)
// ---------------------------------------------------------------------------

describe('WASENDER-WEBHOOK', () => {
  async function makeHmac(body: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const buf  = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const hex  = Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    return 'sha256=' + hex;
  }

  it('WS-30: firma HMAC valida acepta webhook', async () => {
    const body = '{"event":"message"}';
    const sig  = await makeHmac(body, 'mi_secreto');
    const valid = await verifyWasenderWebhookSignature(body, sig, 'mi_secreto');
    expect(valid).toBe(true);
  });

  it('WS-31: firma HMAC invalida no acepta webhook', async () => {
    const body  = '{"event":"message"}';
    const valid = await verifyWasenderWebhookSignature(body, 'sha256=000000', 'mi_secreto');
    expect(valid).toBe(false);
  });

  it('WS-32: firma con secreto diferente rechazada', async () => {
    const body = '{"event":"message"}';
    const sig  = await makeHmac(body, 'secreto_correcto');
    const valid = await verifyWasenderWebhookSignature(body, sig, 'secreto_incorrecto');
    expect(valid).toBe(false);
  });

  it('WS-33: firma sin prefijo sha256= tambien funciona', async () => {
    const body    = '{"event":"message"}';
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode('secreto'),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const buf  = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const hex  = Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const valid = await verifyWasenderWebhookSignature(body, hex, 'secreto');
    expect(valid).toBe(true);
  });

  it('WS-34: normalizeWasenderRemoteJid en JID de grupo no aplica (solo individualizado)', () => {
    // Grupos usan @g.us -- el webhook los ignora antes de normalizar
    const result = normalizeWasenderRemoteJid('1234567890@g.us');
    // No hay arroba de grupos en normalizeWasenderRemoteJid -- pasa sin cambio
    // pero el webhook lo filtra antes con remoteJid.includes('@g.us')
    expect(result).toBeDefined();
  });

  it('WS-35: normalizeWasenderRemoteJid con JID invalido devuelve string vacio', () => {
    expect(normalizeWasenderRemoteJid('123@s.whatsapp.net')).toBe('');
  });

  it('WS-36: conv-wa-webhook usa verifyHmacWithRotation antes de procesar -- analisis estatico (Fase 11B3)', () => {
    const src = readFile(WEBHOOK_PATH);
    // Fase 11B3: verifyHmacSha256 reemplazado por verifyHmacWithRotation (soporte rotación de secrets)
    expect(src).toContain('verifyHmacWithRotation');
    expect(src).toContain('signatureValid');
  });

  it('WS-37: conv-wa-webhook filtra fromMe y grupos -- analisis estatico', () => {
    const src = readFile(WEBHOOK_PATH);
    expect(src).toContain('fromMe');
    expect(src).toContain('@g.us');
  });
});

// ---------------------------------------------------------------------------
// WASENDER-TENANT (nuevo bloque: microfix client_account_id real)
// ---------------------------------------------------------------------------

describe('WASENDER-TENANT', () => {
  it('WS-T01: wasender-client.ts no contiene client_account_id: legacy', () => {
    const src = readFile(WA_LEGACY_PATH);
    expect(src).not.toContain("'legacy'");
    expect(src).not.toContain('"legacy"');
  });

  it('WS-T02: wasender-client.ts no contiene ningun placeholder hardcodeado de tenant', () => {
    const src = readFile(WA_LEGACY_PATH);
    expect(src).not.toContain("'default'");
    expect(src).not.toContain("'unknown'");
    expect(src).not.toContain("'tenant_stub'");
    expect(src).not.toContain("'hardcoded'");
  });

  it('WS-T03: wasender-client.ts acepta clientAccountId como campo del input', () => {
    const src = readFile(WA_LEGACY_PATH);
    expect(src).toContain('clientAccountId');
    expect(src).toContain('input.clientAccountId');
  });

  it('WS-T04: conv-send-wa pasa client_account_id real al adapter Wasender', () => {
    const src = readFile(SEND_WA_PATH);
    expect(src).toContain('clientAccountId:');
    expect(src).toContain('client_account_id');
  });

  it('WS-T05: conv-process-send-queue pasa client_account_id real al adapter Wasender', () => {
    const src = readFile(QUEUE_PATH);
    expect(src).toContain('clientAccountId:');
    // client_account_id viene del item de cola
    expect(src).toContain('client_account_id');
  });

  it('WS-T06: sendWasenderMessage mode=mock con clientAccountId real devuelve ok sin fetch', async () => {
    ENV['WASENDER_INTEGRATION_MODE'] = 'mock';
    const req = { ...MOCK_REQ, client_account_id: 'tenant_real_001', wa_session_id: 'ses_real_001' };
    const result = await sendWasenderMessage(req);
    expect(result.ok).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('WS-T07: sendWasenderMessage mode=real con client_account_id real usa fetch -- no placeholder', async () => {
    ENV['WASENDER_INTEGRATION_MODE'] = 'real';
    ENV['WASENDER_API_KEY']          = 'test_token_fake';
    ENV['WASENDER_BASE_URL']         = 'https://test.example.invalid';
    ENV['WASENDER_MAX_RETRIES']      = '0';
    mockFetch.mockResolvedValue(fakeResponse(200, { messageId: 'real_msg_001' }));
    const result = await sendWasenderMessage({
      client_account_id: 'tenant_real_001',
      wa_session_id:     'ses_real_001',
      recipient_ref:     '+34611111111',
      text:              'test',
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
  });

  it('WS-T08: retry semantics -- WASENDER_MAX_RETRIES=3 implica 4 llamadas totales (1+3)', async () => {
    vi.useFakeTimers();
    ENV['WASENDER_INTEGRATION_MODE']      = 'real';
    ENV['WASENDER_API_KEY']               = 'test_token_fake';
    ENV['WASENDER_BASE_URL']              = 'https://test.example.invalid';
    ENV['WASENDER_MAX_RETRIES']           = '3';
    ENV['WASENDER_RETRY_BACKOFF_SECONDS'] = '0.001,0.001,0.001';
    mockFetch.mockResolvedValue(fakeResponse(500, null));
    const promise = sendWasenderMessage(MOCK_REQ);
    await vi.runAllTimersAsync();
    await promise;
    expect(mockFetch).toHaveBeenCalledTimes(4); // 1 inicial + 3 reintentos
  });

  it('WS-T09: retry semantics documentadas en env.example.md', () => {
    const doc = readFile(ENV_DOC_PATH);
    expect(doc).toContain('N+1 llamadas totales');
    expect(doc).toContain('WASENDER_MAX_RETRIES=3');
    expect(doc).toContain('4 llamadas totales');
  });
});

// ---------------------------------------------------------------------------
// WASENDER-OUTBOUND (38-46)
// ---------------------------------------------------------------------------

describe('WASENDER-OUTBOUND', () => {
  it('WS-38: conv-send-wa importa wasender-client (adapter, no http directo)', () => {
    const src = readFile(SEND_WA_PATH);
    expect(src).toContain('wasender-client');
    expect(src).toContain('sendWasenderMessage');
  });

  it('WS-39: conv-send-wa no llama fetch directo para Wasender -- solo via adapter', () => {
    const src = readFile(SEND_WA_PATH);
    // fetch puede aparecer para llamar conv-ingest u otras EFs internas
    // pero no debe construir directamente la llamada a Wasender API
    expect(src).not.toMatch(/fetch\([^)]*wasender[^)]*\)/i);
    expect(src).not.toMatch(/fetch\([^)]*\/api\/sendText[^)]*\)/);
  });

  it('WS-40: conv-process-send-queue importa wasender-client (adapter)', () => {
    const src = readFile(QUEUE_PATH);
    expect(src).toContain('wasender-client');
    expect(src).toContain('sendWasenderMessage');
  });

  it('WS-41: conv-send-wa no construye JID -- sin @s.whatsapp.net en su codigo', () => {
    expect(readFile(SEND_WA_PATH)).not.toContain('@s.whatsapp.net');
  });

  it('WS-42: conv-send-wa no loguea sender_ref -- analisis estatico', () => {
    const src = readFile(SEND_WA_PATH);
    expect(src).not.toMatch(/log\.[^(]*\([^)]*senderRef[^)]*\)/);
    expect(src).not.toMatch(/log\.[^(]*\([^)]*sender_ref[^)]*\)/);
  });

  it('WS-43: conv-send-wa usa attempts y next_attempt_at en conv_send_queue', () => {
    const src = readFile(SEND_WA_PATH);
    expect(src).toContain('attempts');
    expect(src).toContain('next_attempt_at');
  });

  it('WS-44: conv-send-wa no usa attempt_count', () => {
    expect(readFile(SEND_WA_PATH)).not.toContain('attempt_count');
  });

  it('WS-45: conv-send-wa no usa next_retry_at', () => {
    expect(readFile(SEND_WA_PATH)).not.toContain('next_retry_at');
  });

  it('WS-46: conv-process-send-queue no usa attempt_count ni next_retry_at', () => {
    const src = readFile(QUEUE_PATH);
    expect(src).not.toContain('attempt_count');
    expect(src).not.toContain('next_retry_at');
  });
});

// ---------------------------------------------------------------------------
// WASENDER-SMOKE-GUARD (47-54)
// ---------------------------------------------------------------------------

describe('WASENDER-SMOKE-GUARD', () => {
  it('WS-47: smoke runner existe', () => {
    expect(existsSync(SMOKE_PATH)).toBe(true);
  });

  it('WS-48: smoke runner por defecto imprime "smoke deshabilitado" -- analisis estatico', () => {
    const src = readFile(SMOKE_PATH);
    expect(src).toContain('smoke deshabilitado');
    expect(src).toContain('SMOKE_DISABLED');
  });

  it('WS-49: smoke runner exige WASENDER_SMOKE_ENABLED=true', () => {
    const src = readFile(SMOKE_PATH);
    expect(src).toContain('WASENDER_SMOKE_ENABLED');
    expect(src).toContain("=== 'true'");
  });

  it('WS-50: smoke runner exige WASENDER_INTEGRATION_MODE=real', () => {
    const src = readFile(SMOKE_PATH);
    expect(src).toContain('WASENDER_INTEGRATION_MODE_NOT_REAL');
  });

  it('WS-51: smoke runner exige API key y base URL', () => {
    const src = readFile(SMOKE_PATH);
    expect(src).toContain('WASENDER_API_KEY_MISSING');
    expect(src).toContain('WASENDER_BASE_URL_MISSING');
  });

  it('WS-52: smoke runner no imprime API key', () => {
    const src = readFile(SMOKE_PATH);
    expect(src).not.toMatch(/console\.log\([^)]*WASENDER_API_KEY[^)]*\)/);
    // safeLog redacta Authorization y WASENDER_API_KEY
    expect(src).toContain('[REDACTED]');
  });

  it('WS-53: smoke runner no imprime numero de telefono en logs -- usa placeholder', () => {
    const src = readFile(SMOKE_PATH);
    // El recipient se pasa como '[OMITIDO POR SEGURIDAD]' en lugar del numero real
    expect(src).toContain('[OMITIDO POR SEGURIDAD]');
    // No debe imprimir el numero del destinatario con safeLog/console.log directamente
    expect(src).not.toMatch(/safeLog\([^)]*SMOKE_RECIPIENT[^)]*\)/);
    expect(src).not.toMatch(/console\.log\([^)]*SMOKE_RECIPIENT[^)]*\)/);
  });

  it('WS-54: smoke runner bloquea produccion por defecto', () => {
    const src = readFile(SMOKE_PATH);
    expect(src).toContain('PRODUCTION_URL_BLOCKED');
    expect(src).toContain('PRODUCTION_URL_PATTERNS');
  });
});

// ---------------------------------------------------------------------------
// WASENDER-BOUNDARIES (55-62)
// ---------------------------------------------------------------------------

describe('WASENDER-BOUNDARIES', () => {
  it('WS-55: n8n no envia WhatsApp directamente -- wasender-http-client no llama n8n', () => {
    const src = readFile(WA_CLIENT_PATH);
    expect(src).not.toMatch(/fetch\([^)]*n8n/);
    expect(src).not.toMatch(/import.*n8n/);
    expect(src).not.toContain('hstgr.cloud');
  });

  it('WS-56: IA no envia WhatsApp directamente -- wasender-http-client no importa ai-client', () => {
    const src = readFile(WA_CLIENT_PATH);
    expect(src).not.toContain('ai-client');
    expect(src).not.toContain('aiCall');
  });

  it('WS-57: Core no conoce Wasender -- wasender-http-client no importa core-http-client', () => {
    const src = readFile(WA_CLIENT_PATH);
    expect(src).not.toContain('core-http-client');
    expect(src).not.toContain('coreHttpCall');
  });

  it('WS-58: wasender-http-client no valida identidad', () => {
    const src = readFile(WA_CLIENT_PATH);
    expect(src).not.toContain('validateIdentity');
    expect(src).not.toContain('core-identity-client');
  });

  it('WS-59: wasender-http-client no decide routing -- no importa ni llama funciones de routing', () => {
    const src = readFile(WA_CLIENT_PATH);
    // 'routing' puede aparecer en comentarios que indican que NO se hace; lo que se prohíbe son llamadas activas
    expect(src).not.toContain('routeMessage');
    expect(src).not.toMatch(/import.*routing/);
    expect(src).not.toMatch(/routing-engine/);
  });

  it('WS-60: wasender-http-client no crea casos', () => {
    const src = readFile(WA_CLIENT_PATH);
    expect(src).not.toContain('conv_cases');
    expect(src).not.toContain('createCase');
  });

  it('WS-61: wasender-http-client no publica Activity Log', () => {
    const src = readFile(WA_CLIENT_PATH);
    expect(src).not.toContain('activity_log');
    expect(src).not.toContain('publishActivity');
  });

  it('WS-62: webhook-security.md documenta los limites de Wasender', () => {
    const doc = readFile(WEBHOOK_SEC_PATH);
    expect(doc).toContain('Lo que conv-wa-webhook NO hace');
    expect(doc).toContain('n8n');
    expect(doc).toContain('Activity Log');
  });
});

// ---------------------------------------------------------------------------
// WASENDER-RESTRICTIONS (63-70)
// ---------------------------------------------------------------------------

describe('WASENDER-RESTRICTIONS', () => {
  it('WS-63: wasender-http-client no introduce WF-02', () => {
    expect(readFile(WA_CLIENT_PATH)).not.toContain('WF-02');
  });

  it('WS-64: wasender-http-client no introduce conv_help_escalated', () => {
    expect(readFile(WA_CLIENT_PATH)).not.toContain('conv_help_escalated');
  });

  it('WS-65: wasender-http-client no introduce WEAK_MATCH como estado valido', () => {
    expect(readFile(WA_CLIENT_PATH)).not.toMatch(/WEAK_MATCH/);
  });

  it('WS-66: wasender-http-client no introduce UNVERIFIED standalone', () => {
    expect(readFile(WA_CLIENT_PATH)).not.toMatch(/'UNVERIFIED'[^_]/);
  });

  it('WS-67: wasender-http-client no introduce next_retry_at como campo de estado', () => {
    const src = readFile(WA_CLIENT_PATH);
    // No debe asignar ni retornar next_retry_at como campo
    expect(src).not.toMatch(/next_retry_at\s*:/);
    expect(src).not.toMatch(/next_retry_at\s*=/);
    expect(src).not.toMatch(/result\.next_retry_at|response\.next_retry_at/);
  });

  it('WS-68: wasender-http-client no introduce attempt_count como campo de estado', () => {
    const src = readFile(WA_CLIENT_PATH);
    // No debe asignar ni retornar attempt_count como campo
    expect(src).not.toMatch(/attempt_count\s*:/);
    expect(src).not.toMatch(/attempt_count\s*=/);
    expect(src).not.toMatch(/result\.attempt_count|response\.attempt_count/);
  });

  it('WS-69: documentacion Wasender no introduce estados prohibidos', () => {
    const combined = readFile(ENV_DOC_PATH) + readFile(SMOKE_PLAN_PATH) + readFile(WEBHOOK_SEC_PATH);
    expect(combined).not.toContain('WF-02');
    expect(combined).not.toContain('conv_help_escalated');
    expect(combined).not.toContain('next_retry_at');
    expect(combined).not.toContain('attempt_count');
  });

  it('WS-70: smoke runner no introduce estados prohibidos', () => {
    const src = readFile(SMOKE_PATH);
    expect(src).not.toContain('WF-02');
    expect(src).not.toContain('conv_help_escalated');
    expect(src).not.toContain('next_retry_at');
    expect(src).not.toContain('attempt_count');
  });
});

// ---------------------------------------------------------------------------
// WASENDER-REGRESSION (71-87)
// ---------------------------------------------------------------------------

describe('WASENDER-REGRESSION', () => {
  function suiteExists(path: string): boolean {
    return existsSync(resolve(SUITES_ROOT, path));
  }

  it('WS-71: suite schema existe',       () => expect(suiteExists('schema/schema.spec.ts')).toBe(true));
  it('WS-72: suite types existe',        () => expect(suiteExists('types/types.spec.ts')).toBe(true));
  it('WS-73: suite infra existe',        () => expect(suiteExists('infra/infra.spec.ts')).toBe(true));
  it('WS-74: suite ingest existe',       () => expect(suiteExists('ingest/ingest.spec.ts')).toBe(true));
  it('WS-75: suite channels existe',     () => expect(suiteExists('channels/channels.spec.ts')).toBe(true));
  it('WS-76: suite outbound existe',     () => expect(suiteExists('outbound/outbound.spec.ts')).toBe(true));
  it('WS-77: suite routing existe',      () => expect(suiteExists('routing/routing.spec.ts')).toBe(true));
  it('WS-78: suite identity existe',     () => expect(suiteExists('identity/identity.spec.ts')).toBe(true));
  it('WS-79: suite incidents existe',    () => expect(suiteExists('incidents/incidents.spec.ts')).toBe(true));
  it('WS-80: suite listings existe',     () => expect(suiteExists('listings-flow/listings-flow.spec.ts')).toBe(true));
  it('WS-81: suite help existe',         () => expect(suiteExists('help-flow/help-flow.spec.ts')).toBe(true));
  it('WS-82: suite dispatch existe',     () => expect(suiteExists('dispatch/dispatch.spec.ts')).toBe(true));
  it('WS-83: suite e2e existe',          () => expect(suiteExists('e2e/e2e-runtime.spec.ts')).toBe(true));
  it('WS-84: suite n8n existe',          () => expect(suiteExists('n8n/n8n-contracts.spec.ts')).toBe(true));
  it('WS-85: suite core-integration existe', () => expect(suiteExists('core-integration/core-integration.spec.ts')).toBe(true));
  it('WS-86: suite ai-integration existe',   () => expect(suiteExists('ai-integration/ai-integration.spec.ts')).toBe(true));

  it('WS-87: wasender-http-client default es mock -- getWasenderIntegrationMode sin env', () => {
    // ENV vacio (limpiado en beforeEach)
    expect(getWasenderIntegrationMode()).toBe('mock');
  });
});
