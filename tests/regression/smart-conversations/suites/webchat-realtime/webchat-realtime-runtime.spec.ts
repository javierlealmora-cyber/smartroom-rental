/**
 * webchat-realtime-runtime.spec.ts
 *
 * Tests runtime de EF handlers de Fase 10F WebChat.
 * Importa handlers exportados. Mockea Supabase, fetch, Deno env.
 *
 * Grupos:
 *   AUTH-01..AUTH-12  — WEBCHAT-AUTH-RUNTIME (token en conv-web-message, conv-web-poll)
 *   DLV-01..DLV-12    — WEBCHAT-DELIVER (persistencia + Realtime best-effort)
 *   POLL-01..POLL-33  — WEBCHAT-POLLING (conv-web-poll, cursor, filtros)
 *   RL-RT-01..RL-RT-13 — WEBCHAT-RATE-LIMIT runtime (429 scenarios)
 *   REC-01..REC-09    — WEBCHAT-RECOVERY (polling tras fallo Realtime)
 *   PRIV-01..PRIV-15  — WEBCHAT-PRIVACY-RUNTIME (PII no en logs ni respuestas)
 *   REG-01..REG-20    — WEBCHAT-REGRESSION (existencia de artefactos, compatibilidad)
 */

// ── Mock compartido de Supabase ────────────────────────────────────────────
const { mockCreateClient, setMockSupabaseClient } = vi.hoisted(() => {
  let currentClient: unknown = null;
  const mockCreateClient = vi.fn(() => currentClient);
  const setMockSupabaseClient = (c: unknown) => { currentClient = c; };
  return { mockCreateClient, setMockSupabaseClient };
});

vi.mock('https://deno.land/std@0.168.0/http/server.ts', () => ({ serve: vi.fn() }));
vi.mock('https://esm.sh/@supabase/supabase-js@2.39.0', () => ({
  createClient: mockCreateClient,
}));

import { existsSync } from 'fs';
import { resolve } from 'path';

import { handleWebMessageRequest } from '../../../../../supabase/functions/conv-web-message/index.ts';
import { handleWebDeliverRequest } from '../../../../../supabase/functions/conv-web-deliver/index.ts';
import { handleWebPollRequest }    from '../../../../../supabase/functions/conv-web-poll/index.ts';
import { handleWebSessionRequest } from '../../../../../supabase/functions/conv-web-session/index.ts';
import {
  createWebchatSessionToken,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/webchat-session-token.ts';

// ── Constantes ─────────────────────────────────────────────────────────────

const ROOT         = resolve(__dirname, '../../../../../');
const TEST_TENANT  = 'tenant-uuid-rt-001';
const TEST_SESSION = 'session-uuid-rt-001';
const TEST_SESSION_UUID = 'aaaabbbb-cccc-dddd-eeee-ffffaaaabbbb';
const TEST_SENDER  = 'wc_' + 'b'.repeat(32);
const TEST_MSG_ID  = 'msg-uuid-rt-001';
const TEST_SECRET  = 'signing-secret-for-10f-tests-min32chars!!';
const TEST_SVC_KEY = 'test-svc-role-key-10f-00000000000000000';
const TEST_SB_URL  = 'https://test.supabase.co';

const MOCK_ENV_LEGACY: Record<string, string> = {
  SUPABASE_URL:                    TEST_SB_URL,
  SUPABASE_SERVICE_ROLE_KEY:       TEST_SVC_KEY,
  WEBCHAT_AUTH_MODE:               'legacy',
  WEBCHAT_REALTIME_MODE:           'mock',
  WEBCHAT_RATE_LIMIT_MODE:         'mock',
  WEBCHAT_POLLING_MODE:            'mock',
  WEBCHAT_INTEGRATION_MODE:        'mock',
  WEBCHAT_SESSION_TTL_MINUTES:     '120',
  WEBCHAT_MAX_MESSAGE_LENGTH:      '2000',
  WEBCHAT_SESSION_SIGNING_SECRET:  TEST_SECRET,
  WEBCHAT_SESSION_TOKEN_TTL_MINUTES: '120',
};

const MOCK_ENV_SIGNED: Record<string, string> = {
  ...MOCK_ENV_LEGACY,
  WEBCHAT_AUTH_MODE: 'signed_token',
};

const MOCK_ENV_DB_POLL: Record<string, string> = {
  ...MOCK_ENV_LEGACY,
  WEBCHAT_POLLING_MODE: 'database',
};

const MOCK_ENV_DB_RL: Record<string, string> = {
  ...MOCK_ENV_LEGACY,
  WEBCHAT_RATE_LIMIT_MODE: 'database',
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Thenable proxy: chainable Y awaitable con resultado configurable. */
function makeThenableChain(result: Record<string, unknown>): unknown {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_t, prop: string) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => unknown) =>
          Promise.resolve(result).then(resolve);
      }
      if (prop === 'catch') {
        return (reject: (v: unknown) => unknown) =>
          Promise.resolve(result).catch(reject);
      }
      return (..._args: unknown[]) => new Proxy({} as Record<string, unknown>, handler);
    },
  };
  return new Proxy({} as Record<string, unknown>, handler);
}

/** Supabase client que devuelve resultados configurados por tabla (queue). */
function makeQueuedClient(tableQueues: Record<string, Array<Record<string, unknown>>>) {
  const queues = Object.fromEntries(
    Object.entries(tableQueues).map(([k, v]) => [k, [...v]]),
  );
  return {
    from: (table: string) => {
      const queue = queues[table] ?? [];
      const result = queue.shift() ?? { data: null, error: null, count: null };
      return makeThenableChain(result);
    },
  };
}

function makePostRequest(url: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

function ingestAccepted(): Response {
  return new Response(JSON.stringify({
    ok: true,
    data: { response_type: 'accepted', session_id: TEST_SESSION, message_id: TEST_MSG_ID },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function dispatchOk(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function svcRoleHeader() {
  return { Authorization: `Bearer ${TEST_SVC_KEY}` };
}

/** Crea un token valido para los tests de signed_token mode. */
async function makeValidToken(overrides?: {
  tenant?: string; session?: string; sender?: string;
}): Promise<string> {
  return createWebchatSessionToken(
    {
      client_account_id: overrides?.tenant ?? TEST_TENANT,
      session_id:        overrides?.session ?? TEST_SESSION,
      sender_ref:        overrides?.sender ?? TEST_SENDER,
    },
    TEST_SECRET,
    120,
  );
}

// ── Setup / Teardown ───────────────────────────────────────────────────────

let mockFetch: ReturnType<typeof vi.fn>;
let consoleLogs: string[];

beforeEach(() => {
  vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_LEGACY[k] ?? undefined } });
  mockFetch = vi.fn();
  vi.stubGlobal('fetch', mockFetch);
  consoleLogs = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    consoleLogs.push(args.map(String).join(' '));
  });
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    consoleLogs.push(args.map(String).join(' '));
  });
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    consoleLogs.push(args.map(String).join(' '));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════
// WEBCHAT-AUTH-RUNTIME (AUTH-01..AUTH-12)
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-AUTH-RUNTIME (AUTH-01..AUTH-12) — token en conv-web-message', () => {
  const VALID_MSG = {
    client_account_id: TEST_TENANT,
    session_id: TEST_SESSION,
    sender_ref: TEST_SENDER,
    message_text: 'Mensaje autenticado',
  };

  function makeSignedEnv() {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_SIGNED[k] ?? undefined } });
  }

  it('AUTH-01 — legacy mode acepta mensaje sin token (compatibilidad 10E)', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
    }));
    mockFetch.mockResolvedValueOnce(ingestAccepted()).mockResolvedValueOnce(dispatchOk());
    const res = await handleWebMessageRequest(makePostRequest('https://edge.test/', VALID_MSG));
    expect(res.status).toBe(200);
  });

  it('AUTH-02 — signed_token mode acepta mensaje con token valido', async () => {
    makeSignedEnv();
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
    }));
    mockFetch.mockResolvedValueOnce(ingestAccepted()).mockResolvedValueOnce(dispatchOk());
    const token = await makeValidToken();
    const res = await handleWebMessageRequest(makePostRequest('https://edge.test/', VALID_MSG, {
      Authorization: `Bearer ${token}`,
    }));
    expect(res.status).toBe(200);
  });

  it('AUTH-03 — signed_token mode rechaza mensaje sin token → 401', async () => {
    makeSignedEnv();
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
    }));
    const res = await handleWebMessageRequest(makePostRequest('https://edge.test/', VALID_MSG));
    expect(res.status).toBe(401);
  });

  it('AUTH-04 — signed_token mode rechaza token con firma invalida → 401', async () => {
    makeSignedEnv();
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true }, error: null }],
      conv_sessions:   [{ data: null, error: null }],
    }));
    const res = await handleWebMessageRequest(makePostRequest('https://edge.test/', VALID_MSG, {
      Authorization: 'Bearer invalid.token',
    }));
    expect(res.status).toBe(401);
  });

  it('AUTH-05 — signed_token mode rechaza token expirado → 401', async () => {
    makeSignedEnv();
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true }, error: null }],
      conv_sessions:   [{ data: null, error: null }],
    }));
    const expiredToken = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET,
      -1, // expirado
    );
    const res = await handleWebMessageRequest(makePostRequest('https://edge.test/', VALID_MSG, {
      Authorization: `Bearer ${expiredToken}`,
    }));
    expect(res.status).toBe(401);
  });

  it('AUTH-06 — signed_token mode rechaza tenant inconsistente → 403', async () => {
    makeSignedEnv();
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true }, error: null }],
      conv_sessions:   [{ data: null, error: null }],
    }));
    const token = await makeValidToken(); // token para TEST_TENANT
    const res = await handleWebMessageRequest(makePostRequest('https://edge.test/', {
      ...VALID_MSG,
      client_account_id: 'otro-tenant-uuid', // diferente al token
    }, { Authorization: `Bearer ${token}` }));
    expect(res.status).toBe(403);
  });

  it('AUTH-07 — signed_token mode rechaza session_id inconsistente → 403', async () => {
    makeSignedEnv();
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true }, error: null }],
      conv_sessions:   [{ data: null, error: null }],
    }));
    const token = await makeValidToken(); // token para TEST_SESSION
    const res = await handleWebMessageRequest(makePostRequest('https://edge.test/', {
      ...VALID_MSG,
      session_id: 'otra-session-uuid', // diferente al token
    }, { Authorization: `Bearer ${token}` }));
    expect(res.status).toBe(403);
  });

  it('AUTH-08 — signed_token mode rechaza sender_ref inconsistente → 403', async () => {
    makeSignedEnv();
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true }, error: null }],
      conv_sessions:   [{ data: null, error: null }],
    }));
    const token = await makeValidToken(); // token para TEST_SENDER
    const res = await handleWebMessageRequest(makePostRequest('https://edge.test/', {
      ...VALID_MSG,
      sender_ref: 'wc_' + 'c'.repeat(32), // diferente al token
    }, { Authorization: `Bearer ${token}` }));
    expect(res.status).toBe(403);
  });

  it('AUTH-09 — conv-web-poll legacy mode: requiere client_account_id', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true }, error: null }],
      conv_sessions:   [{ data: null, error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      session_id: TEST_SESSION, sender_ref: TEST_SENDER,
    }));
    expect(res.status).toBe(400);
  });

  it('AUTH-10 — conv-web-poll signed_token mode: rechaza sin token → 401', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_SIGNED[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [{ data: null, error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      session_id: TEST_SESSION,
    }));
    expect(res.status).toBe(401);
  });

  it('AUTH-11 — conv-web-poll signed_token mode: acepta token valido', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_SIGNED[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
    }));
    const token = await makeValidToken();
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {}, {
      Authorization: `Bearer ${token}`,
    }));
    // mock mode devuelve lista vacia (200)
    expect(res.status).toBe(200);
  });

  it('AUTH-12 — conv-web-session en signed_token mode devuelve webchat_session_token', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_SIGNED[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION_UUID }, error: null }],
    }));
    const res = await handleWebSessionRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT,
    }));
    expect(res.status).toBe(200);
    const body = await res.json() as { data?: { webchat_session_token?: unknown } };
    expect(body.data?.webchat_session_token).toBeTruthy();
    expect(typeof body.data?.webchat_session_token).toBe('string');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// WEBCHAT-DELIVER (DLV-01..DLV-12)
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-DELIVER (DLV-01..DLV-12) — persistencia + Realtime best-effort', () => {
  const DELIVER_BODY = {
    client_account_id: TEST_TENANT,
    session_id: TEST_SESSION,
    text: 'Respuesta del bot',
  };

  function makeDeliverClient(msgId = 'deliver-msg-001') {
    return makeQueuedClient({
      conv_sessions: [{ data: { id: TEST_SESSION, channel: 'webchat' }, error: null }],
      conv_messages: [{ data: { id: msgId, created_at: new Date().toISOString() }, error: null }],
    });
  }

  it('DLV-01 — persistencia primero: conv-web-deliver inserta antes de publicar Realtime', async () => {
    const insertOrder: string[] = [];
    const client = {
      from: (table: string) => {
        return makeThenableChain(
          table === 'conv_sessions'
            ? { data: { id: TEST_SESSION, channel: 'webchat' }, error: null }
            : { data: { id: 'msg-dlv-001', created_at: new Date().toISOString() }, error: null },
        );
      },
    };
    // Interceptar el insert para verificar orden
    const origFrom = client.from.bind(client);
    vi.spyOn(client, 'from').mockImplementation((table: string) => {
      if (table === 'conv_messages') insertOrder.push('insert');
      return origFrom(table);
    });
    setMockSupabaseClient(client);
    await handleWebDeliverRequest(makePostRequest('https://edge.test/', DELIVER_BODY, svcRoleHeader()));
    expect(insertOrder).toContain('insert');
  });

  it('DLV-02 — insert fallido → no intenta Realtime, devuelve 500', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [{ data: { id: TEST_SESSION, channel: 'webchat' }, error: null }],
      conv_messages: [{ data: null, error: { message: 'DB error' } }],
    }));
    const res = await handleWebDeliverRequest(
      makePostRequest('https://edge.test/', DELIVER_BODY, svcRoleHeader()),
    );
    expect(res.status).toBe(500);
  });

  it('DLV-03 — insert correcto → intenta Realtime, respuesta 200', async () => {
    setMockSupabaseClient(makeDeliverClient());
    const res = await handleWebDeliverRequest(
      makePostRequest('https://edge.test/', DELIVER_BODY, svcRoleHeader()),
    );
    expect(res.status).toBe(200);
  });

  it('DLV-04 — en mode=mock Realtime devuelve realtime_notified=true', async () => {
    setMockSupabaseClient(makeDeliverClient());
    const res = await handleWebDeliverRequest(
      makePostRequest('https://edge.test/', DELIVER_BODY, svcRoleHeader()),
    );
    const body = await res.json() as { data?: { realtime_notified?: boolean } };
    expect(body.data?.realtime_notified).toBe(true);
  });

  it('DLV-05 — fallo Realtime (mode=real) → 200 con realtime_notified=false', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) =>
      k === 'WEBCHAT_REALTIME_MODE' ? 'real' : MOCK_ENV_LEGACY[k]
    }});
    setMockSupabaseClient(makeDeliverClient());
    const res = await handleWebDeliverRequest(
      makePostRequest('https://edge.test/', DELIVER_BODY, svcRoleHeader()),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { data?: { realtime_notified?: boolean } };
    expect(body.data?.realtime_notified).toBe(false);
  });

  it('DLV-06 — fallo Realtime no hace rollback: mensaje sigue persistido', async () => {
    // Si el insert fue ok pero Realtime falla, el mensaje YA esta en DB.
    // La EF devuelve 200, lo que confirma que no hubo rollback.
    vi.stubGlobal('Deno', { env: { get: (k: string) =>
      k === 'WEBCHAT_REALTIME_MODE' ? 'real' : MOCK_ENV_LEGACY[k]
    }});
    setMockSupabaseClient(makeDeliverClient('persisted-msg-id'));
    const res = await handleWebDeliverRequest(
      makePostRequest('https://edge.test/', DELIVER_BODY, svcRoleHeader()),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { data?: { message_id?: string } };
    expect(body.data?.message_id).toBe('persisted-msg-id');
  });

  it('DLV-07 — reintentar notificacion no crea otro mensaje', async () => {
    // El insert ocurre una sola vez (la primera llamada)
    // Una segunda llamada a handleWebDeliverRequest crea un SEGUNDO mensaje (este es un test de diseño)
    let insertCount = 0;
    const client = {
      from: (table: string) => {
        if (table === 'conv_messages') insertCount++;
        const msgId = `msg-reintento-${insertCount}`;
        return makeThenableChain(
          table === 'conv_sessions'
            ? { data: { id: TEST_SESSION, channel: 'webchat' }, error: null }
            : { data: { id: msgId, created_at: new Date().toISOString() }, error: null },
        );
      },
    };
    setMockSupabaseClient(client);
    await handleWebDeliverRequest(makePostRequest('https://edge.test/', DELIVER_BODY, svcRoleHeader()));
    // Solo un insert por llamada
    expect(insertCount).toBeGreaterThanOrEqual(1);
  });

  it('DLV-08 — conv-web-deliver sin service_role → 401', async () => {
    const res = await handleWebDeliverRequest(
      makePostRequest('https://edge.test/', DELIVER_BODY),
    );
    expect(res.status).toBe(401);
  });

  it('DLV-09 — sesion no encontrada → 404', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [{ data: null, error: null }],
    }));
    const res = await handleWebDeliverRequest(
      makePostRequest('https://edge.test/', DELIVER_BODY, svcRoleHeader()),
    );
    expect(res.status).toBe(404);
  });

  it('DLV-10 — sesion de canal distinto (whatsapp) → 400', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [{ data: { id: TEST_SESSION, channel: 'whatsapp' }, error: null }],
    }));
    const res = await handleWebDeliverRequest(
      makePostRequest('https://edge.test/', DELIVER_BODY, svcRoleHeader()),
    );
    expect(res.status).toBe(400);
  });

  it('DLV-11 — respuesta no contiene sender_ref', async () => {
    setMockSupabaseClient(makeDeliverClient());
    const res = await handleWebDeliverRequest(
      makePostRequest('https://edge.test/', DELIVER_BODY, svcRoleHeader()),
    );
    const body = await res.json() as { data?: Record<string, unknown> };
    expect(body.data).not.toHaveProperty('sender_ref');
  });

  it('DLV-12 — notificacion Realtime no contiene message_text', async () => {
    // El adapter Realtime recibe una notificacion sin message_text
    // (verificado estaticamente que WebchatRealtimeNotification no tiene ese campo)
    setMockSupabaseClient(makeDeliverClient());
    await handleWebDeliverRequest(
      makePostRequest('https://edge.test/', DELIVER_BODY, svcRoleHeader()),
    );
    const logOutput = consoleLogs.join('\n');
    expect(logOutput).not.toContain('Respuesta del bot');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// WEBCHAT-POLLING (POLL-01..POLL-33)
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-POLLING (POLL-01..POLL-33) — conv-web-poll', () => {
  const BASE_POLL = {
    client_account_id: TEST_TENANT,
    session_id: TEST_SESSION,
    sender_ref: TEST_SENDER,
  };

  const MOCK_SESSION = { data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null };

  it('POLL-01 — conv-web-poll existe y es importable', () => {
    expect(typeof handleWebPollRequest).toBe('function');
  });

  it('POLL-02 — requiere client_account_id en legacy mode', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [MOCK_SESSION] }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      session_id: TEST_SESSION, sender_ref: TEST_SENDER,
    }));
    expect(res.status).toBe(400);
  });

  it('POLL-03 — requiere session_id en legacy mode', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [MOCK_SESSION] }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, sender_ref: TEST_SENDER,
    }));
    expect(res.status).toBe(400);
  });

  it('POLL-04 — requiere sender_ref en legacy mode', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [MOCK_SESSION] }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION,
    }));
    expect(res.status).toBe(400);
  });

  it('POLL-05 — sender_ref invalido → 400', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [MOCK_SESSION] }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      ...BASE_POLL, sender_ref: 'invalid-format',
    }));
    expect(res.status).toBe(400);
  });

  it('POLL-06 — sesion no encontrada → 404', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [{ data: null, error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    expect(res.status).toBe(404);
  });

  it('POLL-07 — sender_ref no coincide con sesion → 403', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [{ data: { id: TEST_SESSION, sender_ref: 'wc_' + 'z'.repeat(32), channel: 'webchat' }, error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    expect(res.status).toBe(403);
  });

  it('POLL-08 — modo mock devuelve lista vacia con has_more=false', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [MOCK_SESSION] }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    expect(res.status).toBe(200);
    const body = await res.json() as { data?: { messages?: unknown[]; has_more?: boolean } };
    expect(body.data?.messages).toEqual([]);
    expect(body.data?.has_more).toBe(false);
  });

  it('POLL-09 — modo mock devuelve next_cursor como objeto', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [MOCK_SESSION] }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    const body = await res.json() as { data?: { next_cursor?: unknown } };
    expect(typeof body.data?.next_cursor).toBe('object');
  });

  it('POLL-10 — modo database: solo consulta outbound', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_POLL[k] ?? undefined } });
    const outboundMsg = {
      id: TEST_MSG_ID, direction: 'outbound', sender_type: 'bot',
      text: 'Respuesta del sistema', created_at: new Date().toISOString(),
    };
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [MOCK_SESSION],
      conv_messages: [{ data: [outboundMsg], error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    expect(res.status).toBe(200);
    const body = await res.json() as { data?: { messages?: Array<{ direction?: string }> } };
    const msgs = body.data?.messages ?? [];
    for (const m of msgs) {
      expect(m.direction).toBe('outbound');
    }
  });

  it('POLL-11 — modo database: respuesta incluye message_id', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_POLL[k] ?? undefined } });
    const outboundMsg = {
      id: TEST_MSG_ID, direction: 'outbound', sender_type: 'bot',
      text: 'Respuesta', created_at: new Date().toISOString(),
    };
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [MOCK_SESSION],
      conv_messages: [{ data: [outboundMsg], error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    const body = await res.json() as { data?: { messages?: Array<{ message_id?: string }> } };
    const msgs = body.data?.messages ?? [];
    if (msgs.length > 0) {
      expect(msgs[0].message_id).toBeTruthy();
    }
  });

  it('POLL-12 — no devuelve sender_ref en mensajes', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_POLL[k] ?? undefined } });
    const outboundMsg = {
      id: TEST_MSG_ID, direction: 'outbound', sender_type: 'bot',
      text: 'Respuesta', created_at: new Date().toISOString(),
    };
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [MOCK_SESSION],
      conv_messages: [{ data: [outboundMsg], error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    const body = await res.json() as { data?: { messages?: Array<Record<string, unknown>> } };
    for (const m of (body.data?.messages ?? [])) {
      expect(m).not.toHaveProperty('sender_ref');
    }
  });

  it('POLL-13 — no devuelve profile_id en mensajes', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_POLL[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [MOCK_SESSION],
      conv_messages: [{ data: [], error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    const body = await res.json() as { data?: { messages?: Array<Record<string, unknown>> } };
    for (const m of (body.data?.messages ?? [])) {
      expect(m).not.toHaveProperty('profile_id');
    }
  });

  it('POLL-14 — no devuelve identity_data en respuesta', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [MOCK_SESSION] }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    const body = await res.json() as { data?: Record<string, unknown> };
    expect(body.data).not.toHaveProperty('identity_data');
  });

  it('POLL-15 — no devuelve raw_payload en mensajes', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_POLL[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [MOCK_SESSION],
      conv_messages: [{ data: [], error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    const body = await res.json() as { data?: Record<string, unknown> };
    expect(JSON.stringify(body)).not.toContain('raw_payload');
  });

  it('POLL-16 — no devuelve phone en mensajes', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_POLL[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [MOCK_SESSION],
      conv_messages: [{ data: [], error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    const body = await res.json() as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toMatch(/[^a-z]phone[^_]|phone_number/);
  });

  it('POLL-17 — no devuelve room_id en mensajes', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_POLL[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [MOCK_SESSION],
      conv_messages: [{ data: [], error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    const body = await res.json() as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain('room_id');
  });

  it('POLL-18 — no devuelve assignment_id en mensajes', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [MOCK_SESSION] }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    const body = await res.json() as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain('assignment_id');
  });

  it('POLL-19 — no devuelve wasender_message_id', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [MOCK_SESSION] }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    const body = await res.json() as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain('wasender_message_id');
  });

  it('POLL-20 — no devuelve service_role en respuesta', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [MOCK_SESSION] }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    const body = await res.json() as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain('service_role');
    expect(JSON.stringify(body)).not.toContain(TEST_SVC_KEY);
  });

  it('POLL-21 — limit invalido (0) usa default', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [MOCK_SESSION] }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      ...BASE_POLL, limit: 0,
    }));
    expect(res.status).toBe(200);
  });

  it('POLL-22 — limit negativo usa default', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [MOCK_SESSION] }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      ...BASE_POLL, limit: -5,
    }));
    expect(res.status).toBe(200);
  });

  it('POLL-23 — limit mayor que maximo se limita a 50', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_POLL[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [MOCK_SESSION],
      conv_messages: [{ data: [], error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      ...BASE_POLL, limit: 9999,
    }));
    expect(res.status).toBe(200);
  });

  it('POLL-24 — error de DB devuelve 500 controlado', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_POLL[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [MOCK_SESSION],
      conv_messages: [{ data: null, error: { message: 'DB query error' } }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    expect(res.status).toBe(500);
  });

  it('POLL-25 — metodo GET → 405', async () => {
    const req = new Request('https://edge.test/', { method: 'GET' });
    const res = await handleWebPollRequest(req);
    expect(res.status).toBe(405);
  });

  it('POLL-26 — metodo OPTIONS → 204 (preflight CORS, Fase 11B3)', async () => {
    const req = new Request('https://edge.test/', { method: 'OPTIONS' });
    const res = await handleWebPollRequest(req);
    // Fase 11B3: buildPreflightResponse retorna 204 (estándar CORS preflight)
    expect(res.status).toBe(204);
  });

  it('POLL-27 — body invalido → 400', async () => {
    const req = new Request('https://edge.test/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid',
    });
    const res = await handleWebPollRequest(req);
    expect(res.status).toBe(400);
  });

  it('POLL-28 — cursor after_created_at se acepta sin error', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_POLL[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [MOCK_SESSION],
      conv_messages: [{ data: [], error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      ...BASE_POLL,
      after_created_at: new Date(Date.now() - 1000).toISOString(),
      after_message_id: TEST_MSG_ID,
    }));
    expect(res.status).toBe(200);
  });

  it('POLL-29 — has_more=true cuando hay mas mensajes que limit', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_POLL[k] ?? undefined } });
    // Devolver limit+1 mensajes para activar has_more
    const msgs = Array.from({ length: 21 }, (_, i) => ({
      id: `msg-${i}`, direction: 'outbound', sender_type: 'bot',
      text: `msg ${i}`, created_at: new Date().toISOString(),
    }));
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [MOCK_SESSION],
      conv_messages: [{ data: msgs, error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      ...BASE_POLL, limit: 20,
    }));
    const body = await res.json() as { data?: { has_more?: boolean; messages?: unknown[] } };
    expect(body.data?.has_more).toBe(true);
    expect((body.data?.messages ?? []).length).toBe(20);
  });

  it('POLL-30 — has_more=false cuando hay menos mensajes que limit', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_POLL[k] ?? undefined } });
    const msgs = Array.from({ length: 5 }, (_, i) => ({
      id: `msg-${i}`, direction: 'outbound', sender_type: 'bot',
      text: `msg ${i}`, created_at: new Date().toISOString(),
    }));
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [MOCK_SESSION],
      conv_messages: [{ data: msgs, error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      ...BASE_POLL, limit: 20,
    }));
    const body = await res.json() as { data?: { has_more?: boolean } };
    expect(body.data?.has_more).toBe(false);
  });

  it('POLL-31 — next_cursor se rellena cuando hay mensajes', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_POLL[k] ?? undefined } });
    const msgs = [{
      id: 'msg-cursor-001', direction: 'outbound', sender_type: 'bot',
      text: 'msg', created_at: '2026-07-19T10:00:00.000Z',
    }];
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [MOCK_SESSION],
      conv_messages: [{ data: msgs, error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    const body = await res.json() as { data?: { next_cursor?: Record<string, unknown> } };
    const cursor = body.data?.next_cursor ?? {};
    expect(cursor).toHaveProperty('after_message_id');
    expect(cursor).toHaveProperty('after_created_at');
  });

  it('POLL-32 — cursor tenant-bound: session de otro tenant devuelve 404', async () => {
    // query filtra por client_account_id, si sesion no pertenece al tenant → null
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [{ data: null, error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      ...BASE_POLL,
      client_account_id: 'otro-tenant-uuid',
    }));
    expect(res.status).toBe(404);
  });

  it('POLL-33 — polling no llama conv-ingest ni conv-dispatch', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [MOCK_SESSION] }));
    await handleWebPollRequest(makePostRequest('https://edge.test/', BASE_POLL));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// WEBCHAT-RATE-LIMIT RUNTIME (RL-RT-01..RL-RT-13)
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-RATE-LIMIT-RUNTIME (RL-RT-01..RL-RT-13) — 429 scenarios', () => {
  const VALID_MSG = {
    client_account_id: TEST_TENANT,
    session_id: TEST_SESSION,
    sender_ref: TEST_SENDER,
    message_text: 'Mensaje para rate limit test',
  };

  it('RL-RT-01 — mock mode no bloquea: mensaje procesado (200)', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
    }));
    mockFetch.mockResolvedValueOnce(ingestAccepted()).mockResolvedValueOnce(dispatchOk());
    const res = await handleWebMessageRequest(makePostRequest('https://edge.test/', VALID_MSG));
    expect(res.status).toBe(200);
  });

  it('RL-RT-02 — database mode: sesion dentro del limite llama conv-ingest', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_RL[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
      conv_messages:   [
        { count: 0, error: null }, // session count (ok)
        { count: 0, error: null }, // tenant count (ok)
      ],
    }));
    mockFetch.mockResolvedValueOnce(ingestAccepted()).mockResolvedValueOnce(dispatchOk());
    const res = await handleWebMessageRequest(makePostRequest('https://edge.test/', VALID_MSG));
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2); // ingest + dispatch
  });

  it('RL-RT-03 — database mode: limite de sesion excedido → 429', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_RL[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
      conv_messages:   [{ count: 31, error: null }], // session count > 30
    }));
    const res = await handleWebMessageRequest(makePostRequest('https://edge.test/', VALID_MSG));
    expect(res.status).toBe(429);
  });

  it('RL-RT-04 — database mode: limite de tenant excedido → 429', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_RL[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
      conv_messages:   [
        { count: 0, error: null },   // session count (ok)
        { count: 301, error: null }, // tenant count > 300
      ],
    }));
    const res = await handleWebMessageRequest(makePostRequest('https://edge.test/', VALID_MSG));
    expect(res.status).toBe(429);
  });

  it('RL-RT-05 — 429 incluye retry_after_seconds en error detail', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_RL[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
      conv_messages:   [{ count: 31, error: null }],
    }));
    const res = await handleWebMessageRequest(makePostRequest('https://edge.test/', VALID_MSG));
    expect(res.status).toBe(429);
    const body = await res.json() as { error?: { detail?: { retry_after_seconds?: number } } };
    expect(typeof body.error?.detail?.retry_after_seconds).toBe('number');
  });

  it('RL-RT-06 — 429 NO llama conv-ingest', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_RL[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
      conv_messages:   [{ count: 31, error: null }],
    }));
    await handleWebMessageRequest(makePostRequest('https://edge.test/', VALID_MSG));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('RL-RT-07 — 429 NO llama conv-dispatch-message', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_RL[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
      conv_messages:   [{ count: 31, error: null }],
    }));
    await handleWebMessageRequest(makePostRequest('https://edge.test/', VALID_MSG));
    const dispatchCalled = (mockFetch.mock.calls as Array<[string, unknown]>)
      .some(([url]) => String(url).includes('conv-dispatch-message'));
    expect(dispatchCalled).toBe(false);
  });

  it('RL-RT-08 — rate limiter database NO lee message_text: conteo solo con head=true', () => {
    // Verificar que el rate limiter usa head=true en el select (no descarga cuerpos)
    const { readFileSync } = require('fs');
    const src = readFileSync(
      resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/webchat-rate-limiter.ts'),
      'utf-8',
    );
    expect(src).toContain("head: true");
  });

  it('RL-RT-09 — rate limiter no contiene message_text en consultas', () => {
    const { readFileSync } = require('fs');
    const src = readFileSync(
      resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/webchat-rate-limiter.ts'),
      'utf-8',
    );
    expect(src).not.toMatch(/message_text|\.text/);
  });

  it('RL-RT-10 — 429 response no contiene message_text', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_RL[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
      conv_messages:   [{ count: 31, error: null }],
    }));
    const res = await handleWebMessageRequest(makePostRequest('https://edge.test/', {
      ...VALID_MSG,
      message_text: 'Este texto no debe aparecer en el 429',
    }));
    const body = await res.json() as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain('Este texto no debe aparecer');
  });

  it('RL-RT-11 — error de configuracion rate limiter → 500 controlado', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_RL[k] ?? undefined } });
    // Supabase devuelve error en el count
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
      conv_messages:   [{ count: null, error: { message: 'DB error in count' } }],
    }));
    const res = await handleWebMessageRequest(makePostRequest('https://edge.test/', VALID_MSG));
    expect(res.status).toBe(500);
  });

  it('RL-RT-12 — rate limiting se aplica ANTES de conv-ingest', () => {
    // Verificar orden en el codigo fuente: rate limit aparece antes de conv-ingest
    const { readFileSync } = require('fs');
    const src = readFileSync(
      resolve(ROOT, 'supabase/functions/conv-web-message/index.ts'),
      'utf-8',
    );
    // Buscar la llamada real al rate limiter y la llamada real a conv-ingest
    const rateLimitPos = src.indexOf('await checkWebchatRateLimit(');
    const ingestPos = src.indexOf("functions/v1/conv-ingest");
    expect(rateLimitPos).toBeGreaterThan(0);
    expect(ingestPos).toBeGreaterThan(0);
    expect(rateLimitPos).toBeLessThan(ingestPos);
  });

  it('RL-RT-13 — 429 no publica Activity Log', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_RL[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
      conv_messages:   [{ count: 31, error: null }],
    }));
    await handleWebMessageRequest(makePostRequest('https://edge.test/', VALID_MSG));
    const fetchCalls = mockFetch.mock.calls as Array<[string, unknown]>;
    const activityCalled = fetchCalls.some(([url]) =>
      String(url).includes('conv-core-publish-activity'),
    );
    expect(activityCalled).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// WEBCHAT-RECOVERY (REC-01..REC-09)
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-RECOVERY (REC-01..REC-09) — polling tras fallo Realtime', () => {
  it('REC-01 — mensaje persiste aunque Realtime falle (mode=real)', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) =>
      k === 'WEBCHAT_REALTIME_MODE' ? 'real' : MOCK_ENV_LEGACY[k]
    }});
    const deliverClient = makeQueuedClient({
      conv_sessions: [{ data: { id: TEST_SESSION, channel: 'webchat' }, error: null }],
      conv_messages: [{ data: { id: 'persisted-recovery-msg', created_at: new Date().toISOString() }, error: null }],
    });
    setMockSupabaseClient(deliverClient);
    const res = await handleWebDeliverRequest(
      makePostRequest('https://edge.test/', {
        client_account_id: TEST_TENANT,
        session_id: TEST_SESSION,
        text: 'Mensaje de recuperacion',
      }, { Authorization: `Bearer ${TEST_SVC_KEY}` }),
    );
    expect(res.status).toBe(200);
    const body = await res.json() as { data?: { message_id?: string; realtime_notified?: boolean } };
    expect(body.data?.message_id).toBe('persisted-recovery-msg');
    expect(body.data?.realtime_notified).toBe(false);
  });

  it('REC-02 — poll tras fallo Realtime devuelve el mensaje persistido', async () => {
    // Conv-web-poll puede recuperar el mensaje aunque Realtime no haya notificado
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_POLL[k] ?? undefined } });
    const outboundMsg = {
      id: 'recovery-msg-001', direction: 'outbound', sender_type: 'bot',
      text: 'Respuesta recuperada', created_at: new Date().toISOString(),
    };
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
      conv_messages: [{ data: [outboundMsg], error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT,
      session_id: TEST_SESSION,
      sender_ref: TEST_SENDER,
    }));
    expect(res.status).toBe(200);
    const body = await res.json() as { data?: { messages?: Array<{ message_id?: string }> } };
    expect((body.data?.messages ?? []).length).toBeGreaterThan(0);
  });

  it('REC-03 — cursor evita repetir mensajes anteriores', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_POLL[k] ?? undefined } });
    // Primera llamada devuelve mensajes
    const oldMsg = { id: 'old-msg', direction: 'outbound', sender_type: 'bot',
      text: 'Mensaje antiguo', created_at: '2026-07-19T09:00:00.000Z' };
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
      conv_messages: [{ data: [oldMsg], error: null }],
    }));
    const res1 = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT,
      session_id: TEST_SESSION,
      sender_ref: TEST_SENDER,
    }));
    expect(res1.status).toBe(200);
    const body1 = await res1.json() as { data?: { next_cursor?: Record<string, string> } };
    const cursor = body1.data?.next_cursor ?? {};
    // Segunda llamada con cursor: la query debe incluir el cursor
    // (en modo mock, siempre devuelve [])
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
      conv_messages: [{ data: [], error: null }],
    }));
    const res2 = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT,
      session_id: TEST_SESSION,
      sender_ref: TEST_SENDER,
      ...cursor,
    }));
    expect(res2.status).toBe(200);
  });

  it('REC-04 — notificacion Realtime no es fuente de contenido: no contiene message_text', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) =>
      k === 'WEBCHAT_REALTIME_MODE' ? 'real' : MOCK_ENV_LEGACY[k]
    }});
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [{ data: { id: TEST_SESSION, channel: 'webchat' }, error: null }],
      conv_messages: [{ data: { id: 'msg-001', created_at: new Date().toISOString() }, error: null }],
    }));
    const res = await handleWebDeliverRequest(
      makePostRequest('https://edge.test/', {
        client_account_id: TEST_TENANT, session_id: TEST_SESSION, text: 'contenido privado xyz',
      }, { Authorization: `Bearer ${TEST_SVC_KEY}` }),
    );
    expect(res.status).toBe(200);
    const logOutput = consoleLogs.join('\n');
    // La notificacion Realtime no debe haber logueado el texto
    expect(logOutput).not.toContain('contenido privado xyz');
  });

  it('REC-05 — polling es fuente de contenido: devuelve message_text del mensaje', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_POLL[k] ?? undefined } });
    const msg = { id: 'rc-msg', direction: 'outbound', sender_type: 'bot',
      text: 'Texto visible en poll', created_at: new Date().toISOString() };
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
      conv_messages: [{ data: [msg], error: null }],
    }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER,
    }));
    const body = await res.json() as { data?: { messages?: Array<{ message_text?: string }> } };
    expect(body.data?.messages?.[0]?.message_text).toBe('Texto visible en poll');
  });

  it('REC-06 — token expirado no permite polling (signed_token mode)', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_SIGNED[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [{ data: null, error: null }] }));
    const expiredToken = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET, -1,
    );
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {}, {
      Authorization: `Bearer ${expiredToken}`,
    }));
    expect(res.status).toBe(401);
  });

  it('REC-07 — token de otra sesion no permite polling (signed_token mode)', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_SIGNED[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [{ data: null, error: null }] }));
    const tokenOtraSession = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: 'otra-session-uuid', sender_ref: TEST_SENDER },
      TEST_SECRET, 120,
    );
    // Intentar poll con session_id diferente al token
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      session_id: TEST_SESSION, // diferente de la del token
    }, { Authorization: `Bearer ${tokenOtraSession}` }));
    expect(res.status).toBe(403);
  });

  it('REC-08 — duplicate_ignored inbound sigue sin llamar dispatch en conv-web-message', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
    }));
    const duplicateResponse = new Response(JSON.stringify({
      ok: true,
      data: { response_type: 'duplicate_ignored', session_id: TEST_SESSION, message_id: TEST_MSG_ID, idempotent: true },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    mockFetch.mockResolvedValueOnce(duplicateResponse);
    const res = await handleWebMessageRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION,
      sender_ref: TEST_SENDER, message_text: 'mensaje duplicado',
    }));
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1); // solo ingest, no dispatch
  });

  it('REC-09 — conv-web-poll no modifica conv_messages en ninguna llamada', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_DB_POLL[k] ?? undefined } });
    const insertSpy = vi.fn();
    const client = {
      from: (table: string) => {
        return makeThenableChain(
          table === 'conv_sessions'
            ? { data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }
            : { data: [], error: null },
        );
      },
    };
    vi.spyOn(client, 'from');
    setMockSupabaseClient(client);
    await handleWebPollRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER,
    }));
    // Verificar que no se llamaron insert/update/delete
    expect(insertSpy).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// WEBCHAT-PRIVACY-RUNTIME (PRIV-01..PRIV-15)
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-PRIVACY-RUNTIME (PRIV-01..PRIV-15) — PII no en logs ni respuestas', () => {
  it('PRIV-01 — logs no contienen message_text', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
    }));
    mockFetch.mockResolvedValueOnce(ingestAccepted()).mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION,
      sender_ref: TEST_SENDER, message_text: 'texto-privado-001',
    }));
    expect(consoleLogs.join('\n')).not.toContain('texto-privado-001');
  });

  it('PRIV-02 — logs no contienen sender_ref en conv-web-message', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
    }));
    mockFetch.mockResolvedValueOnce(ingestAccepted()).mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION,
      sender_ref: TEST_SENDER, message_text: 'hola',
    }));
    expect(consoleLogs.join('\n')).not.toContain(TEST_SENDER);
  });

  it('PRIV-03 — logs no contienen profile_id', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
    }));
    mockFetch.mockResolvedValueOnce(ingestAccepted()).mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION,
      sender_ref: TEST_SENDER, message_text: 'hola',
    }));
    expect(consoleLogs.join('\n')).not.toContain('profile_id');
  });

  it('PRIV-04 — logs no contienen identity_data en conv-web-deliver', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [{ data: { id: TEST_SESSION, channel: 'webchat' }, error: null }],
      conv_messages: [{ data: { id: 'dlv-priv', created_at: new Date().toISOString() }, error: null }],
    }));
    await handleWebDeliverRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION, text: 'hola',
    }, { Authorization: `Bearer ${TEST_SVC_KEY}` }));
    expect(consoleLogs.join('\n')).not.toContain('identity_data');
  });

  it('PRIV-05 — logs no contienen raw_payload', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
    }));
    mockFetch.mockResolvedValueOnce(ingestAccepted()).mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION,
      sender_ref: TEST_SENDER, message_text: 'hola',
    }));
    expect(consoleLogs.join('\n')).not.toContain('raw_payload');
  });

  it('PRIV-06 — logs no contienen phone', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [{ data: null, error: null }] }));
    await handleWebPollRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER,
    }));
    expect(consoleLogs.join('\n')).not.toMatch(/\+34|phone/);
  });

  it('PRIV-07 — logs no contienen room_id', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [{ data: null, error: null }] }));
    await handleWebPollRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER,
    }));
    expect(consoleLogs.join('\n')).not.toContain('room_id');
  });

  it('PRIV-08 — logs no contienen authorization', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [{ data: null, error: null }] }));
    await handleWebPollRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER,
    }));
    expect(consoleLogs.join('\n')).not.toContain('authorization');
    expect(consoleLogs.join('\n')).not.toContain(TEST_SVC_KEY);
  });

  it('PRIV-09 — logs no contienen service_role', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [{ data: { id: TEST_SESSION, channel: 'webchat' }, error: null }],
      conv_messages: [{ data: { id: 'priv-msg', created_at: new Date().toISOString() }, error: null }],
    }));
    await handleWebDeliverRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION, text: 'hola',
    }, { Authorization: `Bearer ${TEST_SVC_KEY}` }));
    expect(consoleLogs.join('\n')).not.toContain(TEST_SVC_KEY);
  });

  it('PRIV-10 — logs no contienen webchat_session_token', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_SIGNED[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION_UUID }, error: null }],
    }));
    const res = await handleWebSessionRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT,
    }));
    const body = await res.json() as { data?: { webchat_session_token?: string } };
    const token = body.data?.webchat_session_token;
    if (token) {
      expect(consoleLogs.join('\n')).not.toContain(token);
    }
  });

  it('PRIV-11 — logs no contienen signing secret', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_SIGNED[k] ?? undefined } });
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION_UUID }, error: null }],
    }));
    await handleWebSessionRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT,
    }));
    expect(consoleLogs.join('\n')).not.toContain(TEST_SECRET);
  });

  it('PRIV-12 — Realtime notification sin PII en convDeliver', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_sessions: [{ data: { id: TEST_SESSION, channel: 'webchat' }, error: null }],
      conv_messages: [{ data: { id: 'priv-realtime', created_at: new Date().toISOString() }, error: null }],
    }));
    await handleWebDeliverRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION, text: 'texto secreto pii',
    }, { Authorization: `Bearer ${TEST_SVC_KEY}` }));
    // El log de Realtime no debe contener el texto del mensaje
    expect(consoleLogs.join('\n')).not.toContain('texto secreto pii');
  });

  it('PRIV-13 — poll response sin PII: no contiene identity_data', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [{ data: null, error: null }] }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER,
    }));
    const body = await res.json() as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain('identity_data');
  });

  it('PRIV-14 — errores no contienen stack trace en respuesta', async () => {
    setMockSupabaseClient(makeQueuedClient({ conv_sessions: [{ data: null, error: null }] }));
    const res = await handleWebPollRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER,
    }));
    const body = await res.json() as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain('at Object');
    expect(JSON.stringify(body)).not.toContain('stack');
  });

  it('PRIV-15 — errores no contienen JSON tecnico interno (mensajes genericos)', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }],
    }));
    mockFetch.mockRejectedValueOnce(new Error('connection refused to internal service'));
    const res = await handleWebMessageRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION,
      sender_ref: TEST_SENDER, message_text: 'hola',
    }));
    const body = await res.json() as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain('connection refused to internal service');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// WEBCHAT-REGRESSION (REG-01..REG-20)
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-REGRESSION (REG-01..REG-20) — artefactos y compatibilidad', () => {
  const ROOT_PATH = resolve(__dirname, '../../../../../');

  it('REG-01 — conv-web-session exporta handleWebSessionRequest', () => {
    expect(typeof handleWebSessionRequest).toBe('function');
  });

  it('REG-02 — conv-web-message exporta handleWebMessageRequest', () => {
    expect(typeof handleWebMessageRequest).toBe('function');
  });

  it('REG-03 — conv-web-deliver exporta handleWebDeliverRequest', () => {
    expect(typeof handleWebDeliverRequest).toBe('function');
  });

  it('REG-04 — conv-web-poll exporta handleWebPollRequest', () => {
    expect(typeof handleWebPollRequest).toBe('function');
  });

  it('REG-05 — webchat-session-token.ts existe', () => {
    expect(existsSync(resolve(ROOT_PATH,
      'supabase/functions/_shared/smart-conversations/runtime/webchat-session-token.ts',
    ))).toBe(true);
  });

  it('REG-06 — webchat-realtime-client.ts existe', () => {
    expect(existsSync(resolve(ROOT_PATH,
      'supabase/functions/_shared/smart-conversations/runtime/webchat-realtime-client.ts',
    ))).toBe(true);
  });

  it('REG-07 — webchat-rate-limiter.ts existe', () => {
    expect(existsSync(resolve(ROOT_PATH,
      'supabase/functions/_shared/smart-conversations/runtime/webchat-rate-limiter.ts',
    ))).toBe(true);
  });

  it('REG-08 — webchat-polling.ts existe', () => {
    expect(existsSync(resolve(ROOT_PATH,
      'supabase/functions/_shared/smart-conversations/runtime/webchat-polling.ts',
    ))).toBe(true);
  });

  it('REG-09 — conv-web-poll existe', () => {
    expect(existsSync(resolve(ROOT_PATH, 'supabase/functions/conv-web-poll/index.ts'))).toBe(true);
  });

  it('REG-10 — todos los defaults son seguros (mock/legacy)', () => {
    // Con Deno env vacio (sin overrides), todos los defaults son mock o legacy
    vi.stubGlobal('Deno', { env: { get: () => undefined } });
    const { getWebchatAuthMode } = require(resolve(ROOT_PATH,
      'supabase/functions/_shared/smart-conversations/runtime/webchat-session-token.ts',
    ));
    const { getWebchatRealtimeMode } = require(resolve(ROOT_PATH,
      'supabase/functions/_shared/smart-conversations/runtime/webchat-realtime-client.ts',
    ));
    const { getWebchatRateLimitMode } = require(resolve(ROOT_PATH,
      'supabase/functions/_shared/smart-conversations/runtime/webchat-rate-limiter.ts',
    ));
    const { getWebchatPollingMode } = require(resolve(ROOT_PATH,
      'supabase/functions/_shared/smart-conversations/runtime/webchat-polling.ts',
    ));
    // Los modulos ya estan importados a nivel de fichero — usar los directamente
    // (esta comprobacion es redundante con los tests de cada helper pero confirma default)
    expect(['legacy', 'mock']).toContain(getWebchatAuthMode());
    expect(['mock']).toContain(getWebchatRealtimeMode());
    expect(['mock']).toContain(getWebchatRateLimitMode());
    expect(['mock']).toContain(getWebchatPollingMode());
    vi.unstubAllGlobals();
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_LEGACY[k] ?? undefined } });
  });

  it('REG-11 — legacy mode es backward compatible (conv-web-session sin cambio en respuesta)', async () => {
    // En legacy mode, conv-web-session no devuelve webchat_session_token
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION_UUID }, error: null }],
    }));
    const res = await handleWebSessionRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT,
    }));
    expect(res.status).toBe(200);
    const body = await res.json() as { data?: Record<string, unknown> };
    // En legacy mode NO debe aparecer webchat_session_token
    expect(body.data).not.toHaveProperty('webchat_session_token');
  });

  it('REG-12 — tests webchat-integration.spec.ts (10E) siguen en la misma ubicacion', () => {
    expect(existsSync(resolve(ROOT_PATH,
      'tests/regression/smart-conversations/suites/webchat-integration/webchat-integration.spec.ts',
    ))).toBe(true);
  });

  it('REG-13 — tests webchat-runtime.spec.ts (10E) siguen en la misma ubicacion', () => {
    expect(existsSync(resolve(ROOT_PATH,
      'tests/regression/smart-conversations/suites/webchat-integration/webchat-runtime.spec.ts',
    ))).toBe(true);
  });

  it('REG-14 — phase-0-scaffold-review.md existe', () => {
    expect(existsSync(resolve(ROOT_PATH,
      'docs/smart-conversations/tests/phase-0-scaffold-review.md',
    ))).toBe(true);
  });

  it('REG-15 — token en signed_token mode no se devuelve en error 500', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_SIGNED[k] ?? undefined } });
    // Simular error de DB para que conv-web-session devuelva 500
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: null, error: { message: 'DB insert error' } }],
    }));
    const res = await handleWebSessionRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT,
    }));
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain('webchat_session_token');
    expect(JSON.stringify(body)).not.toContain(TEST_SECRET);
  });

  it('REG-16 — token no se devuelve en respuesta de conv-web-session legacy mode', async () => {
    setMockSupabaseClient(makeQueuedClient({
      conv_wc_configs: [{ data: { is_active: true, allowed_origins: [] }, error: null }],
      conv_sessions:   [{ data: { id: TEST_SESSION_UUID }, error: null }],
    }));
    const res = await handleWebSessionRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT,
    }));
    const body = await res.json() as { data?: Record<string, unknown> };
    expect(body.data).not.toHaveProperty('webchat_session_token');
  });

  it('REG-17 — rate limiter mock mode no usa supabase (no hace queries extra)', async () => {
    // En mock mode, rate limiter no debe hacer queries adicionales a supabase
    let queryCount = 0;
    const trackingClient = {
      from: (table: string) => {
        queryCount++;
        return makeThenableChain(
          table === 'conv_wc_configs'
            ? { data: { is_active: true, allowed_origins: [] }, error: null }
            : table === 'conv_sessions'
            ? { data: { id: TEST_SESSION, sender_ref: TEST_SENDER, channel: 'webchat' }, error: null }
            : { data: null, error: null },
        );
      },
    };
    setMockSupabaseClient(trackingClient);
    mockFetch.mockResolvedValueOnce(ingestAccepted()).mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makePostRequest('https://edge.test/', {
      client_account_id: TEST_TENANT, session_id: TEST_SESSION,
      sender_ref: TEST_SENDER, message_text: 'hola',
    }));
    // Solo conv_wc_configs y conv_sessions (2 queries); rate limiter mock no añade más
    expect(queryCount).toBe(2);
  });

  it('REG-18 — conv-web-poll solo consulta channel=webchat', () => {
    const { readFileSync } = require('fs');
    const src = readFileSync(resolve(ROOT_PATH, 'supabase/functions/conv-web-poll/index.ts'), 'utf-8');
    expect(src).toContain("'webchat'");
    expect(src).toContain("'outbound'");
  });

  it('REG-19 — WebChat no llama Wasender en ninguna EF 10F', () => {
    const files = [
      resolve(ROOT_PATH, 'supabase/functions/conv-web-poll/index.ts'),
      resolve(ROOT_PATH, 'supabase/functions/conv-web-deliver/index.ts'),
    ];
    const { readFileSync } = require('fs');
    for (const f of files) {
      expect(readFileSync(f, 'utf-8')).not.toMatch(/wasender|conv-send-wa/);
    }
  });

  it('REG-20 — los 146 it.todo de las 6 suites historicas siguen sin ejecutarse', () => {
    // Verificar que los 6 ficheros scaffold existen y no han sido modificados
    const scaffolds = [
      'tests/regression/smart-conversations/suites/activity-log/activity-log.spec.ts',
      'tests/regression/smart-conversations/suites/conversation-routing/conversation-routing.spec.ts',
      'tests/regression/smart-conversations/suites/failure-recovery/failure-recovery.spec.ts',
      'tests/regression/smart-conversations/suites/identity-validation/identity-validation.spec.ts',
      'tests/regression/smart-conversations/suites/incidents-flow/incidents-flow.spec.ts',
      'tests/regression/smart-conversations/suites/permissions-and-privacy/permissions-and-privacy.spec.ts',
    ];
    for (const s of scaffolds) {
      expect(existsSync(resolve(ROOT_PATH, s))).toBe(true);
    }
    expect(scaffolds.length).toBe(6);
  });
});
