/**
 * Fase 10A — Core HTTP Runtime Tests (Dynamic)
 *
 * Tests dinámicos con fetch mockeado y Deno.env simulado.
 * No conecta a ningún servicio real. No usa credenciales reales.
 * Valida comportamiento en runtime de core-http-client.ts y los 6 adapters Core.
 *
 * RT-01..RT-05   CORE-RUNTIME-CONFIG
 * RT-06..RT-12   CORE-RUNTIME-ALLOWLIST
 * RT-13..RT-30   CORE-RUNTIME-HTTP
 * RT-31..RT-35   CORE-RUNTIME-BACKOFF
 * RT-36..RT-47   CORE-RUNTIME-PRIVACY
 * RT-48..RT-62   CORE-RUNTIME-ADAPTERS
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  coreHttpCall,
  getCoreIntegrationMode,
  CORE_OPERATION_PATHS,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/core-http-client';

import {
  buildCoreIdentityClient,
  defaultCoreIdentityClient,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/core-identity-client';

import {
  buildCoreIncidentClient,
  defaultCoreIncidentClient,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/core-incident-client';

import {
  buildCoreListingsClient,
  defaultCoreListingsClient,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/core-listings-client';

import {
  buildCoreLeadClient,
  defaultCoreLeadClient,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/core-lead-client';

import {
  buildHelpKbClient,
  defaultHelpKbClient,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/help-kb-client';

import {
  buildCoreHelpTicketClient,
  defaultCoreHelpTicketClient,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/core-help-ticket-client';

// ---------------------------------------------------------------------------
// Infraestructura de tests
// ---------------------------------------------------------------------------

const ENV: Record<string, string | undefined> = {};

const mockDeno = { env: { get: (k: string) => ENV[k] } };

function setEnv(vars: Record<string, string>): void {
  Object.assign(ENV, vars);
}

function clearEnv(): void {
  for (const k of Object.keys(ENV)) delete ENV[k];
}

function fakeResponse(status: number, body: unknown = null): Response {
  return {
    ok:     status >= 200 && status < 300,
    status,
    json:   async () => body,
  } as unknown as Response;
}

function abortError(): Error {
  return Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });
}

const BASE_REAL_ENV = {
  CORE_INTEGRATION_MODE: 'real',
  CORE_BASE_URL:         'https://core.test.example',
  CORE_SERVICE_TOKEN:    'test_token_xyz',
  CORE_TIMEOUT_MS:       '60000', // largo para no interferir con avances de timer en retries
};

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clearEnv();
  mockFetch = vi.fn();
  vi.stubGlobal('Deno', mockDeno);
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// CORE-RUNTIME-CONFIG (RT-01..RT-05)
// ---------------------------------------------------------------------------

describe('CORE-RUNTIME-CONFIG', () => {
  it('RT-01: env vacío → getCoreIntegrationMode devuelve mock', () => {
    clearEnv();
    expect(getCoreIntegrationMode()).toBe('mock');
  });

  it('RT-02: CORE_INTEGRATION_MODE=mock → coreHttpCall NO llama fetch', async () => {
    setEnv({ CORE_INTEGRATION_MODE: 'mock' });
    const result = await coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.error_code).toBe('MOCK_MODE');
  });

  it('RT-03: mode=real sin CORE_BASE_URL → error CORE_CONFIG_MISSING sin fetch', async () => {
    setEnv({ CORE_INTEGRATION_MODE: 'real' });
    const result = await coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('CORE_CONFIG_MISSING');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('RT-04: mode=real con CORE_BASE_URL llama fetch y el header Authorization contiene el token', async () => {
    setEnv(BASE_REAL_ENV);
    mockFetch.mockResolvedValue(fakeResponse(200, {}));
    await coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect((options.headers as Record<string, string>)['Authorization']).toContain('test_token_xyz');
  });

  it('RT-05: getCoreIntegrationMode refleja cambios de env en tiempo de llamada', () => {
    clearEnv();
    expect(getCoreIntegrationMode()).toBe('mock');
    setEnv({ CORE_INTEGRATION_MODE: 'real' });
    expect(getCoreIntegrationMode()).toBe('real');
    setEnv({ CORE_INTEGRATION_MODE: 'mock' });
    expect(getCoreIntegrationMode()).toBe('mock');
  });
});

// ---------------------------------------------------------------------------
// CORE-RUNTIME-ALLOWLIST (RT-06..RT-12)
// ---------------------------------------------------------------------------

describe('CORE-RUNTIME-ALLOWLIST', () => {
  beforeEach(() => setEnv(BASE_REAL_ENV));

  it('RT-06: operación allowlisted construye URL correcta base+path', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, {}));
    await coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toBe('https://core.test.example/smartroom/conversations/incidents');
  });

  it('RT-07: operación NO allowlisted → OPERATION_NOT_ALLOWED sin fetch', async () => {
    const result = await coreHttpCall({ method: 'POST', operation: 'evil.operation', client_account_id: 'acc1' });
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('OPERATION_NOT_ALLOWED');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('RT-08: CORE_OPERATION_PATHS contiene exactamente las 6 operaciones permitidas', () => {
    const ops = Object.keys(CORE_OPERATION_PATHS);
    expect(ops).toHaveLength(6);
    expect(ops).toContain('core.identity.validate');
    expect(ops).toContain('core.incidents.create');
    expect(ops).toContain('core.listings.query');
    expect(ops).toContain('core.leads.create');
    expect(ops).toContain('core.help.kb.query');
    expect(ops).toContain('core.help.tickets.create');
  });

  it('RT-09: path traversal en operación → OPERATION_NOT_ALLOWED', async () => {
    const result = await coreHttpCall({ method: 'POST', operation: '../../../admin', client_account_id: 'acc1' });
    expect(result.error_code).toBe('OPERATION_NOT_ALLOWED');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('RT-10: SSRF con URL absoluta como operación → OPERATION_NOT_ALLOWED', async () => {
    const result = await coreHttpCall({ method: 'POST', operation: 'http://evil.com/steal', client_account_id: 'acc1' });
    expect(result.error_code).toBe('OPERATION_NOT_ALLOWED');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('RT-11: todos los paths del allowlist son relativos (empiezan con /)', () => {
    for (const path of Object.values(CORE_OPERATION_PATHS)) {
      expect(path).toMatch(/^\//);
      expect(path).not.toMatch(/^https?:\/\//);
      expect(path).not.toMatch(/^\/\//);
    }
  });

  it('RT-12: URL enviada a fetch no contiene el nombre de la operación del input', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, {}));
    await coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).not.toContain('core.incidents.create');
    expect(url).toContain('/smartroom/conversations/incidents');
  });
});

// ---------------------------------------------------------------------------
// CORE-RUNTIME-HTTP (RT-13..RT-30)
// ---------------------------------------------------------------------------

describe('CORE-RUNTIME-HTTP', () => {
  beforeEach(() => setEnv(BASE_REAL_ENV));

  it('RT-13: 200 → fetch llamado 1 vez y resultado ok=true', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { result: 'ok' }));
    const result = await coreHttpCall({ method: 'GET', operation: 'core.listings.query', client_account_id: 'acc1' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
  });

  it('RT-14: 200 parsea JSON y devuelve data correctamente', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { incident_id: 'inc-001', incident_ref: 'INC-001' }));
    const result = await coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    expect(result.ok).toBe(true);
    expect((result.data as Record<string, unknown>)['incident_id']).toBe('inc-001');
  });

  it('RT-15: 204 devuelve ok=true sin data', async () => {
    mockFetch.mockResolvedValue(fakeResponse(204, null));
    const result = await coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    expect(result.ok).toBe(true);
    expect(result.status).toBe(204);
  });

  it('RT-16: 400 no reintenta — fetch llamado 1 vez, retryable=false', async () => {
    mockFetch.mockResolvedValue(fakeResponse(400, null));
    const result = await coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
    expect(result.retryable).toBe(false);
    expect(result.error_code).toBe('HTTP_400');
  });

  it('RT-17: 401 no reintenta', async () => {
    mockFetch.mockResolvedValue(fakeResponse(401, null));
    const result = await coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.retryable).toBe(false);
    expect(result.error_code).toBe('HTTP_401');
  });

  it('RT-18: 403 no reintenta', async () => {
    mockFetch.mockResolvedValue(fakeResponse(403, null));
    const result = await coreHttpCall({ method: 'POST', operation: 'core.identity.validate', client_account_id: 'acc1' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.retryable).toBe(false);
  });

  it('RT-19: 404 no reintenta', async () => {
    mockFetch.mockResolvedValue(fakeResponse(404, null));
    const result = await coreHttpCall({ method: 'GET', operation: 'core.listings.query', client_account_id: 'acc1' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.retryable).toBe(false);
    expect(result.error_code).toBe('HTTP_404');
  });

  it('RT-20: 422 no reintenta', async () => {
    mockFetch.mockResolvedValue(fakeResponse(422, null));
    const result = await coreHttpCall({ method: 'POST', operation: 'core.leads.create', client_account_id: 'acc1' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.retryable).toBe(false);
    expect(result.error_code).toBe('HTTP_422');
  });

  it('RT-21: 500 reintenta — 3 intentos totales con fake timers', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(fakeResponse(500, null));
    const promise = coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.ok).toBe(false);
    expect(result.error_code).toContain('EXHAUSTED');
  });

  it('RT-22: 502 reintenta — 3 intentos totales', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(fakeResponse(502, null));
    const promise = coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.ok).toBe(false);
  });

  it('RT-23: 503 reintenta — 3 intentos totales', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(fakeResponse(503, null));
    const promise = coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    await vi.runAllTimersAsync();
    await promise;
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('RT-24: AbortError (timeout simulado) reintenta — 3 intentos totales', async () => {
    vi.useFakeTimers();
    mockFetch.mockRejectedValue(abortError());
    const promise = coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1', timeout_ms: 100 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.error_code).toContain('TIMEOUT');
  });

  it('RT-25: máximo 3 intentos — nunca 4 o más', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(fakeResponse(503, null));
    const promise = coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    await vi.runAllTimersAsync();
    await promise;
    expect(mockFetch.mock.calls.length).toBeLessThanOrEqual(3);
  });

  it('RT-26: 5xx agotado devuelve error_code con sufijo _EXHAUSTED', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(fakeResponse(500, null));
    const promise = coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.ok).toBe(false);
    expect(result.error_code).toMatch(/_EXHAUSTED$/);
    expect(result.retryable).toBe(false);
  });

  it('RT-27: timeout agotado devuelve TIMEOUT_EXHAUSTED', async () => {
    vi.useFakeTimers();
    mockFetch.mockRejectedValue(abortError());
    const promise = coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1', timeout_ms: 100 });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('TIMEOUT_EXHAUSTED');
  });

  it('RT-28: resultado de error no expone stack trace', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(fakeResponse(503, null));
    const promise = coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    await vi.runAllTimersAsync();
    const result = await promise;
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('stack');
    expect(serialized).not.toContain('Error:');
  });

  it('RT-29: recuperación en 2º intento tras 5xx → resultado ok=true', async () => {
    vi.useFakeTimers();
    mockFetch
      .mockResolvedValueOnce(fakeResponse(503, null))
      .mockResolvedValueOnce(fakeResponse(200, { recovered: true }));
    const promise = coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });

  it('RT-30: error de red (no AbortError) también reintenta', async () => {
    vi.useFakeTimers();
    mockFetch.mockRejectedValue(new TypeError('network error'));
    const promise = coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.error_code).toContain('NETWORK_ERROR');
  });
});

// ---------------------------------------------------------------------------
// CORE-RUNTIME-BACKOFF (RT-31..RT-35)
// ---------------------------------------------------------------------------

describe('CORE-RUNTIME-BACKOFF', () => {
  beforeEach(() => setEnv(BASE_REAL_ENV));

  it('RT-31: fake timers → 3 intentos sin esperar 36 segundos reales', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(fakeResponse(503, null));
    const promise = coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    await vi.runAllTimersAsync();
    await promise;
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('RT-32: avanzar solo 1000ms libera el 1er sleep y dispara el 2º intento', async () => {
    vi.useFakeTimers();
    mockFetch
      .mockResolvedValueOnce(fakeResponse(503, null))
      .mockResolvedValueOnce(fakeResponse(200, { ok: true }));
    const promise = coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    await vi.advanceTimersByTimeAsync(1_000);
    const result = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });

  it('RT-33: avanzar 1000ms + 5000ms libera 2 sleeps y dispara el 3er intento', async () => {
    vi.useFakeTimers();
    mockFetch
      .mockResolvedValueOnce(fakeResponse(503, null))
      .mockResolvedValueOnce(fakeResponse(503, null))
      .mockResolvedValueOnce(fakeResponse(200, { final: true }));
    const promise = coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(5_000);
    const result = await promise;
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.ok).toBe(true);
  });

  it('RT-34: resultado nunca incluye next_retry_at', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(fakeResponse(503, null));
    const promise = coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(JSON.stringify(result)).not.toContain('next_retry_at');
  });

  it('RT-35: resultado nunca incluye attempt_count', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(fakeResponse(503, null));
    const promise = coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(JSON.stringify(result)).not.toContain('attempt_count');
  });
});

// ---------------------------------------------------------------------------
// CORE-RUNTIME-PRIVACY (RT-36..RT-47)
// ---------------------------------------------------------------------------

describe('CORE-RUNTIME-PRIVACY', () => {
  let logSpy:   ReturnType<typeof vi.spyOn>;
  let warnSpy:  ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setEnv(BASE_REAL_ENV);
    logSpy   = vi.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy  = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  function capturedLogs(): string {
    return [
      ...logSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
    ].flat().map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join('\n');
  }

  it('RT-36: CORE_SERVICE_TOKEN no aparece en logs', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, {}));
    await coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    expect(capturedLogs()).not.toContain('test_token_xyz');
  });

  it('RT-37: header Authorization no aparece en logs', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, {}));
    await coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    expect(capturedLogs()).not.toContain('Authorization');
  });

  it('RT-38: phone en body no se loguea', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, {}));
    await coreHttpCall({ method: 'POST', operation: 'core.identity.validate', client_account_id: 'acc1', body: { phone: '+34600000001' } });
    expect(capturedLogs()).not.toContain('+34600000001');
  });

  it('RT-39: profile_id en body no se loguea', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, {}));
    await coreHttpCall({ method: 'POST', operation: 'core.identity.validate', client_account_id: 'acc1', body: { profile_id: 'secret_profile_id_001' } });
    expect(capturedLogs()).not.toContain('secret_profile_id_001');
  });

  it('RT-40: identity_data en body no se loguea', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, {}));
    await coreHttpCall({ method: 'POST', operation: 'core.identity.validate', client_account_id: 'acc1', body: { identity_data: { full_name: 'Secret Person Name' } } });
    expect(capturedLogs()).not.toContain('Secret Person Name');
  });

  it('RT-41: description en body no se loguea', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, {}));
    await coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1', body: { description: 'sensitive_description_text' } });
    expect(capturedLogs()).not.toContain('sensitive_description_text');
  });

  it('RT-42: contact en body no se loguea', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, {}));
    await coreHttpCall({ method: 'POST', operation: 'core.leads.create', client_account_id: 'acc1', body: { contact: { phone: '+34600000002', email: 'private@test.example' } } });
    expect(capturedLogs()).not.toContain('+34600000002');
    expect(capturedLogs()).not.toContain('private@test.example');
  });

  it('RT-43: summary en body no se loguea', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, {}));
    await coreHttpCall({ method: 'POST', operation: 'core.help.tickets.create', client_account_id: 'acc1', body: { summary: 'usuario_dice_secreto_privado' } });
    expect(capturedLogs()).not.toContain('usuario_dice_secreto_privado');
  });

  it('RT-44: en error 5xx exhausted tampoco se loguea el token', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(fakeResponse(500, null));
    const promise = coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    await vi.runAllTimersAsync();
    await promise;
    expect(capturedLogs()).not.toContain('test_token_xyz');
    expect(capturedLogs()).not.toContain('Authorization');
  });

  it('RT-45: en AbortError tampoco se loguea el token', async () => {
    vi.useFakeTimers();
    mockFetch.mockRejectedValue(abortError());
    const promise = coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1', timeout_ms: 100 });
    await vi.runAllTimersAsync();
    await promise;
    expect(capturedLogs()).not.toContain('test_token_xyz');
  });

  it('RT-46: en OPERATION_NOT_ALLOWED no hay log con el nombre de la operación', async () => {
    await coreHttpCall({ method: 'POST', operation: 'evil.ssrf.attempt', client_account_id: 'acc1' });
    expect(capturedLogs()).not.toContain('evil.ssrf.attempt');
  });

  it('RT-47: en CORE_CONFIG_MISSING no hay log con la URL de CORE_BASE_URL', async () => {
    setEnv({ CORE_INTEGRATION_MODE: 'real' }); // sin CORE_BASE_URL
    await coreHttpCall({ method: 'POST', operation: 'core.incidents.create', client_account_id: 'acc1' });
    expect(capturedLogs()).not.toContain('core.test.example');
  });
});

// ---------------------------------------------------------------------------
// CORE-RUNTIME-ADAPTERS (RT-48..RT-62)
// ---------------------------------------------------------------------------

describe('CORE-RUNTIME-ADAPTERS', () => {
  beforeEach(() => setEnv(BASE_REAL_ENV));

  // --- Identity ---

  it('RT-48: identity real adapter llama a fetch exactamente 1 vez', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { identity_level: 'STRONG_MATCH_ACTIVE', profile_id: 'p1' }));
    const client = buildCoreIdentityClient('real');
    await client.validateIdentity({ client_account_id: 'acc1', profile_id: 'p1' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('RT-49: identity real mapea STRONG_MATCH_ACTIVE y profile_id desde respuesta Core', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { identity_level: 'STRONG_MATCH_ACTIVE', profile_id: 'prof-real-001', assignment_id: 'asgn-001' }));
    const client = buildCoreIdentityClient('real');
    const result = await client.validateIdentity({ client_account_id: 'acc1' });
    expect(result.identity_level).toBe('STRONG_MATCH_ACTIVE');
    expect(result.profile_id).toBe('prof-real-001');
    expect(result.assignment_id).toBe('asgn-001');
  });

  it('RT-50: identity real rechaza UNVERIFIED_LEAD → devuelve NO_MATCH', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { identity_level: 'UNVERIFIED_LEAD' }));
    const client = buildCoreIdentityClient('real');
    const result = await client.validateIdentity({ client_account_id: 'acc1' });
    expect(result.identity_level).toBe('NO_MATCH');
    expect(result.identity_level).not.toBe('UNVERIFIED_LEAD');
  });

  it('RT-51: identity real rechaza WEAK_MATCH → devuelve NO_MATCH', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { identity_level: 'WEAK_MATCH' }));
    const client = buildCoreIdentityClient('real');
    const result = await client.validateIdentity({ client_account_id: 'acc1' });
    expect(result.identity_level).toBe('NO_MATCH');
  });

  it('RT-52: identity real rechaza UNVERIFIED standalone → devuelve NO_MATCH', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { identity_level: 'UNVERIFIED' }));
    const client = buildCoreIdentityClient('real');
    const result = await client.validateIdentity({ client_account_id: 'acc1' });
    expect(result.identity_level).toBe('NO_MATCH');
  });

  // --- Incidents ---

  it('RT-53: incident real adapter llama a fetch y devuelve incident_id/incident_ref', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { incident_id: 'inc-real-001', incident_ref: 'INC-2026-0001' }));
    const client = buildCoreIncidentClient('real');
    const result = await client.createIncident({ client_account_id: 'acc1', conv_case_id: 'case1', incident_type: 'plumbing', urgency: 'medium', description: 'descripción privada', source: 'whatsapp' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.incident_id).toBe('inc-real-001');
    expect(result.incident_ref).toBe('INC-2026-0001');
  });

  // --- Listings ---

  it('RT-54: listings real adapter llama a fetch', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { listings: [] }));
    const client = buildCoreListingsClient('real');
    await client.queryListings({ client_account_id: 'acc1', channel: 'whatsapp', filters: {} });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('RT-55: listings real adapter expone solo campos públicos — descarta assignment_id, room_id, exact_address', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, {
      listings: [{
        listing_id:        'lst-real-001',
        listing_ref:       'HAB-REAL-001',
        title:             'Test listing',
        public_location:   'Madrid centro',
        price:             600,
        availability:      'available',
        public_room_label: 'Hab 1',
        assignment_id:     'INTERNAL_ASGN',   // campo interno — debe excluirse
        room_id:           'ROOM_INT_ID',      // campo interno — debe excluirse
        exact_address:     '123 Private St',   // PII — debe excluirse
      }],
    }));
    const client = buildCoreListingsClient('real');
    const result = await client.queryListings({ client_account_id: 'acc1', channel: 'whatsapp', filters: {} });
    expect(result.listings).toHaveLength(1);
    const lst = result.listings[0];
    expect(lst.listing_id).toBe('lst-real-001');
    expect(lst.public_location).toBe('Madrid centro');
    expect((lst as Record<string, unknown>)['assignment_id']).toBeUndefined();
    expect((lst as Record<string, unknown>)['room_id']).toBeUndefined();
    expect((lst as Record<string, unknown>)['exact_address']).toBeUndefined();
  });

  // --- Leads ---

  it('RT-56: lead real adapter llama a fetch y devuelve lead_id/lead_ref', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { lead_id: 'lead-real-001', lead_ref: 'LEAD-2026-0001' }));
    const client = buildCoreLeadClient('real');
    const result = await client.createLead({ client_account_id: 'acc1', session_id: 's1', conv_case_id: 'c1', listing_id: 'l1', interest_type: 'request_visit', contact: { name: 'Test' }, source: 'webchat' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.lead_id).toBe('lead-real-001');
    expect(result.lead_ref).toBe('LEAD-2026-0001');
  });

  // --- Help KB ---

  it('RT-57: help KB real adapter llama a fetch y devuelve matches', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { matches: [{ kb_id: 'kb-real-001', title: 'T', answer: 'A', confidence: 0.9, public: true }] }));
    const client = buildHelpKbClient('real');
    const result = await client.queryKb({ client_account_id: 'acc1', channel: 'whatsapp', question: '¿cómo funciona?' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.matches.length).toBeGreaterThan(0);
  });

  // --- Help Tickets ---

  it('RT-58: help ticket real adapter llama a fetch y devuelve help_ticket_id/ref', async () => {
    mockFetch.mockResolvedValue(fakeResponse(200, { help_ticket_id: 'ht-real-001', help_ticket_ref: 'HELP-2026-0001' }));
    const client = buildCoreHelpTicketClient('real');
    const result = await client.createHelpTicket({ client_account_id: 'acc1', session_id: 's1', conv_case_id: 'c1', topic: 'access', summary: 'no puedo acceder', source: 'webchat' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.help_ticket_id).toBe('ht-real-001');
    expect(result.help_ticket_ref).toBe('HELP-2026-0001');
  });

  // --- Default exports (backward compatibility) ---

  it('RT-59: defaultCoreIdentityClient no llama fetch (es mock)', async () => {
    await defaultCoreIdentityClient.validateIdentity({ client_account_id: 'acc1' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('RT-60: defaultCoreIncidentClient no llama fetch (es mock)', async () => {
    await defaultCoreIncidentClient.createIncident({ client_account_id: 'acc1', conv_case_id: 'c1', incident_type: 'water', urgency: 'low', description: 'd', source: 'whatsapp' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('RT-61: defaultCoreListingsClient no llama fetch (es mock)', async () => {
    await defaultCoreListingsClient.queryListings({ client_account_id: 'acc1', channel: 'whatsapp', filters: {} });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('RT-62: defaultCoreLeadClient, defaultHelpKbClient, defaultCoreHelpTicketClient no llaman fetch', async () => {
    await defaultCoreLeadClient.createLead({ client_account_id: 'acc1', session_id: 's1', conv_case_id: 'c1', listing_id: 'l1', interest_type: 'request_visit', contact: { name: 'T' }, source: 'webchat' });
    await defaultHelpKbClient.queryKb({ client_account_id: 'acc1', channel: 'whatsapp', question: 'test?' });
    await defaultCoreHelpTicketClient.createHelpTicket({ client_account_id: 'acc1', session_id: 's1', conv_case_id: 'c1', topic: 'access', summary: 's', source: 'webchat' });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
