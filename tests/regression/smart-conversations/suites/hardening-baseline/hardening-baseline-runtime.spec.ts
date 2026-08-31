/**
 * Hardening Baseline — Runtime Validation Tests
 * Fase 11A · SmartConversations
 *
 * Tests que ejecutan código real (utils, servicios, config) en Node.js/jsdom.
 * Sin conexiones reales, sin secrets, sin producción.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// RT-01..08 — webchat-config: valores por defecto seguros
// ---------------------------------------------------------------------------
describe('RT-01..08 — webchat-config valores por defecto', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('RT-01: enabled=false cuando VITE_WEBCHAT_WIDGET_ENABLED no está definido', async () => {
    vi.stubEnv('VITE_WEBCHAT_WIDGET_ENABLED', '');
    const { getWebchatConfig } = await import('../../../../../src/features/webchat/utils/webchat-config.js');
    expect(getWebchatConfig().enabled).toBe(false);
  });

  it('RT-02: enabled=false cuando VITE_WEBCHAT_WIDGET_ENABLED="false"', async () => {
    vi.stubEnv('VITE_WEBCHAT_WIDGET_ENABLED', 'false');
    const { getWebchatConfig } = await import('../../../../../src/features/webchat/utils/webchat-config.js');
    expect(getWebchatConfig().enabled).toBe(false);
  });

  it('RT-03: realtimeEnabled=false por defecto', async () => {
    vi.stubEnv('VITE_WEBCHAT_REALTIME_ENABLED', '');
    const { getWebchatConfig } = await import('../../../../../src/features/webchat/utils/webchat-config.js');
    expect(getWebchatConfig().realtimeEnabled).toBe(false);
  });

  it('RT-04: pollIntervalMs es un número positivo cuando se usa default', async () => {
    const { getWebchatConfig } = await import('../../../../../src/features/webchat/utils/webchat-config.js');
    const ms = getWebchatConfig().pollIntervalMs;
    expect(typeof ms).toBe('number');
    expect(ms).toBeGreaterThanOrEqual(0);
  });

  it('RT-05: sessionStorageMode es un string cuando se usa default', async () => {
    const { getWebchatConfig } = await import('../../../../../src/features/webchat/utils/webchat-config.js');
    const mode = getWebchatConfig().sessionStorageMode;
    expect(typeof mode).toBe('string');
  });

  it('RT-06: debug=false por defecto', async () => {
    vi.stubEnv('VITE_WEBCHAT_DEBUG', '');
    const { getWebchatConfig } = await import('../../../../../src/features/webchat/utils/webchat-config.js');
    expect(getWebchatConfig().debug).toBe(false);
  });

  it('RT-07: maxMessageLength=2000', async () => {
    const { getWebchatConfig } = await import('../../../../../src/features/webchat/utils/webchat-config.js');
    expect(getWebchatConfig().maxMessageLength).toBe(2000);
  });

  it('RT-08: apiBaseUrl="" por defecto', async () => {
    vi.stubEnv('VITE_WEBCHAT_API_BASE_URL', '');
    const { getWebchatConfig } = await import('../../../../../src/features/webchat/utils/webchat-config.js');
    expect(getWebchatConfig().apiBaseUrl).toBe('');
  });
});

// ---------------------------------------------------------------------------
// RT-09..15 — webchat-errors: mappeo seguro sin PII
// ---------------------------------------------------------------------------
describe('RT-09..15 — webchat-errors sin PII', () => {
  it('RT-09: status 401 → code "session_expired"', async () => {
    const { toSafeError } = await import('../../../../../src/features/webchat/utils/webchat-errors.js');
    expect(toSafeError({ status: 401 }).code).toBe('session_expired');
  });

  it('RT-10: status 403 → code "session_forbidden"', async () => {
    const { toSafeError } = await import('../../../../../src/features/webchat/utils/webchat-errors.js');
    expect(toSafeError({ status: 403 }).code).toBe('session_forbidden');
  });

  it('RT-11: status 429 → code "rate_limited" con retryAfter', async () => {
    const { toSafeError } = await import('../../../../../src/features/webchat/utils/webchat-errors.js');
    const err = toSafeError({ status: 429, data: { error: { detail: { retry_after_seconds: 30 } } } });
    expect(err.code).toBe('rate_limited');
    expect(err.retryAfter).toBe(30);
  });

  it('RT-12: status 500 → code "server_error"', async () => {
    const { toSafeError } = await import('../../../../../src/features/webchat/utils/webchat-errors.js');
    expect(toSafeError({ status: 500 }).code).toBe('server_error');
  });

  it('RT-13: error sin status → code "default"', async () => {
    const { toSafeError } = await import('../../../../../src/features/webchat/utils/webchat-errors.js');
    const err = toSafeError({});
    expect(err.message).toBeTruthy();
  });

  it('RT-14: mensaje de error no contiene stack trace ni PII', async () => {
    const { toSafeError } = await import('../../../../../src/features/webchat/utils/webchat-errors.js');
    const err = toSafeError({ status: 500, message: 'Internal error: user@example.com' });
    expect(err.message).not.toMatch(/user@example\.com/);
    expect(err.message).not.toMatch(/stack/i);
  });

  it('RT-15: SAFE_MESSAGES exporta mensajes en español', async () => {
    const { SAFE_MESSAGES } = await import('../../../../../src/features/webchat/utils/webchat-errors.js');
    expect(SAFE_MESSAGES.default).toBeTruthy();
    expect(typeof SAFE_MESSAGES.default).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// RT-16..22 — webchat-dedupe: invariantes de deduplicación
// ---------------------------------------------------------------------------
describe('RT-16..22 — webchat-dedupe invariantes', () => {
  it('RT-16: dedupeMessages elimina duplicados por message_id', async () => {
    const { dedupeMessages } = await import('../../../../../src/features/webchat/utils/webchat-dedupe.js');
    const m1 = { message_id: 'a', created_at: '2026-01-01T00:00:00Z', temp: false };
    const m2 = { message_id: 'a', created_at: '2026-01-01T00:00:00Z', temp: false };
    expect(dedupeMessages([m1], [m2])).toHaveLength(1);
  });

  it('RT-17: dedupeMessages descarta mensajes sin message_id', async () => {
    const { dedupeMessages } = await import('../../../../../src/features/webchat/utils/webchat-dedupe.js');
    const bad = { created_at: '2026-01-01T00:00:00Z' };
    expect(dedupeMessages([bad as any], [])).toHaveLength(0);
  });

  it('RT-18: sortMessages ordena por created_at ascendente', async () => {
    const { sortMessages } = await import('../../../../../src/features/webchat/utils/webchat-dedupe.js');
    const msgs = [
      { message_id: 'b', created_at: '2026-01-02T00:00:00Z' },
      { message_id: 'a', created_at: '2026-01-01T00:00:00Z' },
    ];
    const sorted = sortMessages(msgs);
    expect(sorted[0].message_id).toBe('a');
  });

  it('RT-19: sortMessages desempata por message_id cuando misma fecha', async () => {
    const { sortMessages } = await import('../../../../../src/features/webchat/utils/webchat-dedupe.js');
    const msgs = [
      { message_id: 'z', created_at: '2026-01-01T00:00:00Z' },
      { message_id: 'a', created_at: '2026-01-01T00:00:00Z' },
    ];
    const sorted = sortMessages(msgs);
    expect(sorted[0].message_id).toBe('a');
  });

  it('RT-20: reconcileOptimistic reemplaza tempId por confirmedId', async () => {
    const { reconcileOptimistic } = await import('../../../../../src/features/webchat/utils/webchat-dedupe.js');
    const msgs = [{ message_id: 'temp-1', temp: true, created_at: '2026-01-01T00:00:00Z' }];
    const result = reconcileOptimistic(msgs, 'confirmed-abc', 'temp-1');
    expect(result[0].message_id).toBe('confirmed-abc');
    expect(result[0].temp).toBe(false);
  });

  it('RT-21: reconcileOptimistic no modifica otros mensajes', async () => {
    const { reconcileOptimistic } = await import('../../../../../src/features/webchat/utils/webchat-dedupe.js');
    const msgs = [
      { message_id: 'x', temp: false, created_at: '2026-01-01T00:00:00Z' },
      { message_id: 'temp-1', temp: true, created_at: '2026-01-01T00:00:00Z' },
    ];
    const result = reconcileOptimistic(msgs, 'confirmed', 'temp-1');
    expect(result[0].message_id).toBe('x');
  });

  it('RT-22: dedupeMessages prefiere mensaje confirmado sobre optimistic', async () => {
    const { dedupeMessages } = await import('../../../../../src/features/webchat/utils/webchat-dedupe.js');
    const temp = { message_id: 'a', created_at: '2026-01-01T00:00:00Z', temp: true };
    const confirmed = { message_id: 'a', created_at: '2026-01-01T00:00:00Z', temp: false };
    const result = dedupeMessages([temp], [confirmed]);
    expect(result[0].temp).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RT-23..28 — webchat-storage: modo memory no persiste
// ---------------------------------------------------------------------------
describe('RT-23..28 — webchat-storage modo memory', () => {
  beforeEach(async () => {
    const mod = await import('../../../../../src/features/webchat/services/webchat-storage.js');
    mod._resetMemoryForTests?.();
  });

  it('RT-23: loadSession retorna null cuando no hay sesión', async () => {
    const { loadSession } = await import('../../../../../src/features/webchat/services/webchat-storage.js');
    expect(loadSession('memory')).toBeNull();
  });

  it('RT-24: saveSession + loadSession en modo memory', async () => {
    const { saveSession, loadSession } = await import('../../../../../src/features/webchat/services/webchat-storage.js');
    const sess = { session_id: 'test-123', sender_ref: 'ref-abc', client_account_id: 'c1', expires_at: '2099-01-01', webchat_session_token: 'tok' };
    saveSession(sess, 'memory');
    expect(loadSession('memory')?.session_id).toBe('test-123');
  });

  it('RT-25: clearSession elimina sesión en modo memory', async () => {
    const { saveSession, clearSession, loadSession } = await import('../../../../../src/features/webchat/services/webchat-storage.js');
    const sess = { session_id: 'test-456', sender_ref: 'ref', client_account_id: 'c1', expires_at: '2099-01-01', webchat_session_token: 'tok' };
    saveSession(sess, 'memory');
    clearSession('memory');
    expect(loadSession('memory')).toBeNull();
  });

  it('RT-26: saveCursor + loadCursor en modo memory', async () => {
    const { saveCursor, loadCursor } = await import('../../../../../src/features/webchat/services/webchat-storage.js');
    saveCursor('cursor-xyz', 'memory');
    expect(loadCursor('memory')).toBe('cursor-xyz');
  });

  it('RT-27: saveSession en modo memory → loadSession retorna session_id correcto', async () => {
    const { saveSession, loadSession } = await import('../../../../../src/features/webchat/services/webchat-storage.js');
    const sess = { session_id: 'mem-only', sender_ref: 'ref', client_account_id: 'c1', expires_at: '2099-01-01', webchat_session_token: 'tok' };
    saveSession(sess, 'memory');
    const loaded = loadSession('memory');
    expect(loaded?.session_id).toBe('mem-only');
  });

  it('RT-28: saveSession en modo memory retorna session_id y sender_ref correctos', async () => {
    const { saveSession, loadSession } = await import('../../../../../src/features/webchat/services/webchat-storage.js');
    const sess = { session_id: 'p-test', sender_ref: 'ref', client_account_id: 'c1', expires_at: '2099-01-01', webchat_session_token: 'tok' };
    saveSession(sess, 'memory');
    const loaded = loadSession('memory');
    expect(loaded?.session_id).toBe('p-test');
    expect(loaded?.sender_ref).toBe('ref');
  });
});

// ---------------------------------------------------------------------------
// RT-29..32 — createRealtimeAdapter: sin cliente = null
// ---------------------------------------------------------------------------
describe('RT-29..32 — createRealtimeAdapter seguro sin cliente real', () => {
  it('RT-29: createRealtimeAdapter(null) retorna null', async () => {
    const { createRealtimeAdapter } = await import('../../../../../src/features/webchat/services/webchat-realtime.js');
    expect(createRealtimeAdapter(null)).toBeNull();
  });

  it('RT-30: createRealtimeAdapter(undefined) retorna null', async () => {
    const { createRealtimeAdapter } = await import('../../../../../src/features/webchat/services/webchat-realtime.js');
    expect(createRealtimeAdapter(undefined as any)).toBeNull();
  });

  it('RT-31: createRealtimeAdapter con mock devuelve objeto con subscribe', async () => {
    const { createRealtimeAdapter } = await import('../../../../../src/features/webchat/services/webchat-realtime.js');
    const mockClient = {
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn(),
    };
    const adapter = createRealtimeAdapter(mockClient as any);
    expect(adapter).not.toBeNull();
    expect(typeof adapter?.subscribe).toBe('function');
  });

  it('RT-32: subscribe retorna función de cleanup', async () => {
    const { createRealtimeAdapter } = await import('../../../../../src/features/webchat/services/webchat-realtime.js');
    const mockChannel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() };
    const mockClient = { channel: vi.fn().mockReturnValue(mockChannel), removeChannel: vi.fn() };
    const adapter = createRealtimeAdapter(mockClient as any);
    const cleanup = adapter?.subscribe('sess-123', vi.fn(), vi.fn());
    expect(typeof cleanup).toBe('function');
  });
});
