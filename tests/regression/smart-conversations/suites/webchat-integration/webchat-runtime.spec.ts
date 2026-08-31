/**
 * webchat-runtime.spec.ts
 *
 * Tests runtime de las Edge Functions WebChat: conv-web-session y conv-web-message.
 * Importan los handlers exportados directamente y ejecutan lógica real con mocks de:
 *   - Deno.env (vi.stubGlobal)
 *   - fetch global (vi.stubGlobal)
 *   - createClient de Supabase (vi.mock)
 *   - serve de Deno HTTP (vi.mock → no-op)
 *
 * Sin Supabase real. Sin Deno desplegado. Sin credenciales reales.
 * Sin Core real, IA real, n8n real, Wasender real.
 *
 * Grupos:
 *   WRT-S01..S25  — conv-web-session: campos prohibidos → HTTP 400
 *   WRT-S26..S35  — conv-web-session: seguridad de identidad
 *   WRT-M01..M24  — conv-web-message: flujo dispatch (ingest → dispatch)
 *   WRT-DUP01..08 — conv-web-message: duplicate_ignored NO llama dispatch
 *   WRT-ERR01..11 — conv-web-message: errores de ingest y dispatch
 *   WRT-P01..P12  — privacidad de logs (ningún PII en bruto)
 *   WRT-V01..V10  — validación de tenant/sesión
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

// ── Imports de handlers ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { handleWebSessionRequest } from '../../../../../supabase/functions/conv-web-session/index.ts';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { handleWebMessageRequest } from '../../../../../supabase/functions/conv-web-message/index.ts';

// ── Constantes de test ─────────────────────────────────────────────────────
const TEST_TENANT_ID = 'tenant-uuid-test-001';
const TEST_SESSION_ID = 'session-uuid-test-001';
const TEST_SESSION_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const TEST_SENDER_REF = 'wc_' + 'a'.repeat(32);
const TEST_MESSAGE_ID = 'message-uuid-test-001';
const TEST_SUPABASE_URL = 'https://test.supabase.co';
const TEST_SERVICE_ROLE = 'test-service-role-key-mock-00000000';

const MOCK_ENV: Record<string, string> = {
  SUPABASE_URL: TEST_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: TEST_SERVICE_ROLE,
  WEBCHAT_INTEGRATION_MODE: 'mock',
  WEBCHAT_SESSION_TTL_MINUTES: '60',
  WEBCHAT_MAX_MESSAGE_LENGTH: '2000',
};

// ── Helpers ────────────────────────────────────────────────────────────────

type DbResult = { data: unknown; error: unknown };

/** Proxy que simula la API fluent de Supabase. */
function makeFluentChain(result: DbResult, onInsert?: (d: unknown) => void): unknown {
  return new Proxy({} as Record<string, unknown>, {
    get(_t, prop: string) {
      if (prop === 'maybeSingle' || prop === 'single') {
        return () => Promise.resolve(result);
      }
      if (prop === 'insert') {
        return (d: unknown) => {
          onInsert?.(d);
          return makeFluentChain(result, onInsert);
        };
      }
      return () => makeFluentChain(result, onInsert);
    },
  });
}

/** Cliente Supabase mínimo que responde con resultados configurables. */
function makeSupabaseClient(results: Record<string, DbResult>, onInsert?: (table: string, d: unknown) => void) {
  return {
    from: (table: string) => makeFluentChain(
      results[table] ?? { data: null, error: null },
      onInsert ? (d: unknown) => onInsert(table, d) : undefined,
    ),
  };
}

/** Crea un Request POST con body JSON. */
function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://edge.test/conv-web-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

/** Crea un Request POST para conv-web-message. */
function makeMessageRequest(body: unknown): Request {
  return new Request('https://edge.test/conv-web-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Respuesta de ingest: aceptado. */
function ingestAccepted(messageId = TEST_MESSAGE_ID): Response {
  return new Response(JSON.stringify({
    ok: true,
    data: {
      response_type: 'accepted',
      session_id: TEST_SESSION_ID,
      message_id: messageId,
      next_state: 'received',
    },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

/** Respuesta de ingest: duplicado ignorado. */
function ingestDuplicate(messageId = TEST_MESSAGE_ID): Response {
  return new Response(JSON.stringify({
    ok: true,
    data: {
      response_type: 'duplicate_ignored',
      session_id: TEST_SESSION_ID,
      message_id: messageId,
      idempotent: true,
    },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

/** Respuesta de conv-dispatch-message: ok. */
function dispatchOk(): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Supabase client para flujo de sesión feliz en conv-web-session. */
function makeSessionClient(sessionInsertData = { id: TEST_SESSION_UUID }) {
  return makeSupabaseClient({
    conv_wc_configs: { data: { is_active: true, allowed_origins: [] }, error: null },
    conv_sessions: { data: sessionInsertData, error: null },
  });
}

/** Supabase client para flujo de mensaje (conv-web-message). */
function makeMessageClient(sessionMatch: { id: string; sender_ref: string; channel: string } | null = {
  id: TEST_SESSION_ID,
  sender_ref: TEST_SENDER_REF,
  channel: 'webchat',
}) {
  return makeSupabaseClient({
    conv_wc_configs: { data: { is_active: true, allowed_origins: [] }, error: null },
    conv_sessions: { data: sessionMatch, error: null },
  });
}

// ── Setup / Teardown ───────────────────────────────────────────────────────

let mockFetch: ReturnType<typeof vi.fn>;
let consoleLogs: string[];

beforeEach(() => {
  vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV[k] ?? undefined } });
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
// Bloc 1 — conv-web-session: campos prohibidos → HTTP 400
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-SESSION-RUNTIME (WRT-S01..S25) — campos prohibidos', () => {
  const BASE_OK = { client_account_id: TEST_TENANT_ID };

  beforeEach(() => {
    setMockSupabaseClient(makeSessionClient());
  });

  it('WRT-S01 — profile_id en body → HTTP 400', async () => {
    const res = await handleWebSessionRequest(makeRequest({ ...BASE_OK, profile_id: 'user-123' }));
    expect(res.status).toBe(400);
    const body = await res.json() as { ok?: boolean };
    expect(body.ok).toBe(false);
  });

  it('WRT-S02 — phone en body → HTTP 400', async () => {
    const res = await handleWebSessionRequest(makeRequest({ ...BASE_OK, phone: '+34600000001' }));
    expect(res.status).toBe(400);
  });

  it('WRT-S03 — phone_number en body → HTTP 400', async () => {
    const res = await handleWebSessionRequest(makeRequest({ ...BASE_OK, phone_number: '+34600000002' }));
    expect(res.status).toBe(400);
  });

  it('WRT-S04 — identity_data en body → HTTP 400', async () => {
    const res = await handleWebSessionRequest(makeRequest({ ...BASE_OK, identity_data: { foo: 'bar' } }));
    expect(res.status).toBe(400);
  });

  it('WRT-S05 — room_id en body → HTTP 400', async () => {
    const res = await handleWebSessionRequest(makeRequest({ ...BASE_OK, room_id: 'room-abc' }));
    expect(res.status).toBe(400);
  });

  it('WRT-S06 — assignment_id en body → HTTP 400', async () => {
    const res = await handleWebSessionRequest(makeRequest({ ...BASE_OK, assignment_id: 'assign-xyz' }));
    expect(res.status).toBe(400);
  });

  it('WRT-S07 — raw_payload en body → HTTP 400', async () => {
    const res = await handleWebSessionRequest(makeRequest({ ...BASE_OK, raw_payload: '{}' }));
    expect(res.status).toBe(400);
  });

  it('WRT-S08 — tokens en body → HTTP 400', async () => {
    const res = await handleWebSessionRequest(makeRequest({ ...BASE_OK, tokens: ['tok1'] }));
    expect(res.status).toBe(400);
  });

  it('WRT-S09 — jwt en body → HTTP 400', async () => {
    const res = await handleWebSessionRequest(makeRequest({ ...BASE_OK, jwt: 'eyJfake.fake.fake' }));
    expect(res.status).toBe(400);
  });

  it('WRT-S10 — authorization en body → HTTP 400', async () => {
    const res = await handleWebSessionRequest(makeRequest({ ...BASE_OK, authorization: 'Bearer fake' }));
    expect(res.status).toBe(400);
  });

  it('WRT-S11 — service_role en body → HTTP 400', async () => {
    const res = await handleWebSessionRequest(makeRequest({ ...BASE_OK, service_role: 'eyJfake' }));
    expect(res.status).toBe(400);
  });

  it('WRT-S12 — sender_ref en body → HTTP 400', async () => {
    const res = await handleWebSessionRequest(makeRequest({ ...BASE_OK, sender_ref: TEST_SENDER_REF }));
    expect(res.status).toBe(400);
  });

  it('WRT-S13 — profile_id null en body → HTTP 400 (presencia, no valor)', async () => {
    const res = await handleWebSessionRequest(makeRequest({ ...BASE_OK, profile_id: null }));
    expect(res.status).toBe(400);
  });

  it('WRT-S14 — profile_id vacío en body → HTTP 400 (presencia, no valor)', async () => {
    const res = await handleWebSessionRequest(makeRequest({ ...BASE_OK, profile_id: '' }));
    expect(res.status).toBe(400);
  });

  it('WRT-S15 — phone vacío en body → HTTP 400', async () => {
    const res = await handleWebSessionRequest(makeRequest({ ...BASE_OK, phone: '' }));
    expect(res.status).toBe(400);
  });

  it('WRT-S16 — múltiples campos prohibidos → HTTP 400 (primero detectado)', async () => {
    const res = await handleWebSessionRequest(makeRequest({ ...BASE_OK, profile_id: 'x', phone: 'y' }));
    expect(res.status).toBe(400);
  });

  it('WRT-S17 — client_account_id ausente → HTTP 400', async () => {
    const res = await handleWebSessionRequest(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('WRT-S18 — client_account_id null → HTTP 400', async () => {
    const res = await handleWebSessionRequest(makeRequest({ client_account_id: null }));
    expect(res.status).toBe(400);
  });

  it('WRT-S19 — body no es JSON → HTTP 400', async () => {
    const req = new Request('https://edge.test/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    });
    const res = await handleWebSessionRequest(req);
    expect(res.status).toBe(400);
  });

  it('WRT-S20 — método GET → HTTP 405', async () => {
    const req = new Request('https://edge.test/', { method: 'GET' });
    const res = await handleWebSessionRequest(req);
    expect(res.status).toBe(405);
  });

  it('WRT-S21 — método PUT → HTTP 405', async () => {
    const req = new Request('https://edge.test/', { method: 'PUT' });
    const res = await handleWebSessionRequest(req);
    expect(res.status).toBe(405);
  });

  it('WRT-S22 — método OPTIONS → HTTP 204 (preflight CORS, Fase 11B3)', async () => {
    const req = new Request('https://edge.test/', { method: 'OPTIONS' });
    const res = await handleWebSessionRequest(req);
    // Fase 11B3: buildPreflightResponse retorna 204 (estándar CORS preflight)
    expect(res.status).toBe(204);
  });

  it('WRT-S23 — WebChat inactivo → HTTP 403', async () => {
    setMockSupabaseClient(makeSupabaseClient({
      conv_wc_configs: { data: { is_active: false, allowed_origins: [] }, error: null },
      conv_sessions: { data: null, error: null },
    }));
    const res = await handleWebSessionRequest(makeRequest(BASE_OK));
    expect(res.status).toBe(403);
  });

  it('WRT-S24 — WebChat no configurado → HTTP 403', async () => {
    setMockSupabaseClient(makeSupabaseClient({
      conv_wc_configs: { data: null, error: null },
      conv_sessions: { data: null, error: null },
    }));
    const res = await handleWebSessionRequest(makeRequest(BASE_OK));
    expect(res.status).toBe(403);
  });

  it('WRT-S25 — origin no permitido → HTTP 403', async () => {
    setMockSupabaseClient(makeSupabaseClient({
      conv_wc_configs: { data: { is_active: true, allowed_origins: ['https://allowed.com'] }, error: null },
      conv_sessions: { data: { id: TEST_SESSION_UUID }, error: null },
    }));
    const req = makeRequest(BASE_OK, { Origin: 'https://evil.com' });
    const res = await handleWebSessionRequest(req);
    expect(res.status).toBe(403);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Bloc 2 — conv-web-session: seguridad de identidad
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-SESSION-RUNTIME (WRT-S26..S35) — identidad y respuesta', () => {
  beforeEach(() => {
    setMockSupabaseClient(makeSessionClient());
  });

  it('WRT-S26 — sesión creada con identity_level=NO_MATCH (captura insert)', async () => {
    let capturedInsert: unknown = null;
    setMockSupabaseClient(makeSupabaseClient(
      {
        conv_wc_configs: { data: { is_active: true, allowed_origins: [] }, error: null },
        conv_sessions: { data: { id: TEST_SESSION_UUID }, error: null },
      },
      (_table, d) => { capturedInsert = d; },
    ));
    await handleWebSessionRequest(makeRequest({ client_account_id: TEST_TENANT_ID }));
    const inserted = capturedInsert as Record<string, unknown>;
    expect(inserted).toBeTruthy();
    expect((inserted as Record<string, unknown>)['identity_level']).toBe('NO_MATCH');
  });

  it('WRT-S27 — insert de sesión NO incluye profile_id', async () => {
    let capturedInsert: unknown = null;
    setMockSupabaseClient(makeSupabaseClient(
      {
        conv_wc_configs: { data: { is_active: true, allowed_origins: [] }, error: null },
        conv_sessions: { data: { id: TEST_SESSION_UUID }, error: null },
      },
      (_t, d) => { capturedInsert = d; },
    ));
    await handleWebSessionRequest(makeRequest({ client_account_id: TEST_TENANT_ID }));
    expect(capturedInsert).not.toHaveProperty('profile_id');
  });

  it('WRT-S28 — insert de sesión NO incluye phone', async () => {
    let capturedInsert: unknown = null;
    setMockSupabaseClient(makeSupabaseClient(
      {
        conv_wc_configs: { data: { is_active: true, allowed_origins: [] }, error: null },
        conv_sessions: { data: { id: TEST_SESSION_UUID }, error: null },
      },
      (_t, d) => { capturedInsert = d; },
    ));
    await handleWebSessionRequest(makeRequest({ client_account_id: TEST_TENANT_ID }));
    expect(capturedInsert).not.toHaveProperty('phone');
  });

  it('WRT-S29 — identity_data en insert es objeto vacío {}', async () => {
    let capturedInsert: unknown = null;
    setMockSupabaseClient(makeSupabaseClient(
      {
        conv_wc_configs: { data: { is_active: true, allowed_origins: [] }, error: null },
        conv_sessions: { data: { id: TEST_SESSION_UUID }, error: null },
      },
      (_t, d) => { capturedInsert = d; },
    ));
    await handleWebSessionRequest(makeRequest({ client_account_id: TEST_TENANT_ID }));
    expect((capturedInsert as Record<string, unknown>)['identity_data']).toEqual({});
  });

  it('WRT-S30 — respuesta HTTP 200 con session_id presente', async () => {
    const res = await handleWebSessionRequest(makeRequest({ client_account_id: TEST_TENANT_ID }));
    expect(res.status).toBe(200);
    const body = await res.json() as { data?: { session_id?: unknown } };
    expect(body.data?.session_id).toBeTruthy();
  });

  it('WRT-S31 — respuesta NO incluye profile_id al widget', async () => {
    const res = await handleWebSessionRequest(makeRequest({ client_account_id: TEST_TENANT_ID }));
    const body = await res.json() as Record<string, unknown>;
    const data = body['data'] as Record<string, unknown> ?? body;
    expect(data).not.toHaveProperty('profile_id');
  });

  it('WRT-S32 — respuesta incluye services_available', async () => {
    const res = await handleWebSessionRequest(makeRequest({ client_account_id: TEST_TENANT_ID }));
    const body = await res.json() as { data?: { services_available?: unknown } };
    expect(Array.isArray(body.data?.services_available)).toBe(true);
  });

  it('WRT-S33 — respuesta incluye sender_ref opaco (wc_<32hex>)', async () => {
    const res = await handleWebSessionRequest(makeRequest({ client_account_id: TEST_TENANT_ID }));
    const body = await res.json() as { data?: { sender_ref?: string } };
    expect(body.data?.sender_ref).toMatch(/^wc_[0-9a-f]{32}$/);
  });

  it('WRT-S34 — respuesta incluye channel=webchat', async () => {
    const res = await handleWebSessionRequest(makeRequest({ client_account_id: TEST_TENANT_ID }));
    const body = await res.json() as { data?: { channel?: string } };
    expect(body.data?.channel).toBe('webchat');
  });

  it('WRT-S35 — error al insertar sesión → HTTP 500', async () => {
    setMockSupabaseClient(makeSupabaseClient({
      conv_wc_configs: { data: { is_active: true, allowed_origins: [] }, error: null },
      conv_sessions: { data: null, error: { message: 'DB insert error' } },
    }));
    const res = await handleWebSessionRequest(makeRequest({ client_account_id: TEST_TENANT_ID }));
    expect(res.status).toBe(500);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Bloc 3 — conv-web-message: flujo dispatch normal
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-MESSAGE-RUNTIME (WRT-M01..M24) — flujo dispatch', () => {
  const VALID_MSG = {
    client_account_id: TEST_TENANT_ID,
    session_id: TEST_SESSION_ID,
    sender_ref: TEST_SENDER_REF,
    message_text: 'Hola, necesito ayuda',
  };

  beforeEach(() => {
    setMockSupabaseClient(makeMessageClient());
  });

  it('WRT-M01 — flujo aceptado llama fetch 2 veces (ingest + dispatch)', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('WRT-M02 — primera llamada a fetch es conv-ingest', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const firstCall = mockFetch.mock.calls[0] as [string, unknown];
    expect(firstCall[0]).toContain('conv-ingest');
  });

  it('WRT-M03 — segunda llamada a fetch es conv-dispatch-message', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const secondCall = mockFetch.mock.calls[1] as [string, unknown];
    expect(secondCall[0]).toContain('conv-dispatch-message');
  });

  it('WRT-M04 — payload de ingest incluye channel=webchat', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const firstOpts = mockFetch.mock.calls[0][1] as RequestInit;
    const ingestBody = JSON.parse(firstOpts.body as string) as {
      normalized_message?: { channel?: string };
    };
    expect(ingestBody.normalized_message?.channel).toBe('webchat');
  });

  it('WRT-M05 — payload de ingest incluye sender_ref', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const firstOpts = mockFetch.mock.calls[0][1] as RequestInit;
    const ingestBody = JSON.parse(firstOpts.body as string) as {
      normalized_message?: { sender_ref?: string };
    };
    expect(ingestBody.normalized_message?.sender_ref).toBe(TEST_SENDER_REF);
  });

  it('WRT-M06 — payload de ingest incluye provider_message_id=null', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const firstOpts = mockFetch.mock.calls[0][1] as RequestInit;
    const ingestBody = JSON.parse(firstOpts.body as string) as {
      normalized_message?: { provider_message_id?: unknown };
    };
    expect(ingestBody.normalized_message?.provider_message_id).toBeNull();
  });

  it('WRT-M07 — payload de ingest incluye client_account_id correcto', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const firstOpts = mockFetch.mock.calls[0][1] as RequestInit;
    const ingestBody = JSON.parse(firstOpts.body as string) as { client_account_id?: string };
    expect(ingestBody.client_account_id).toBe(TEST_TENANT_ID);
  });

  it('WRT-M08 — payload de dispatch incluye message_id del ingest', async () => {
    const customMessageId = 'custom-message-id-001';
    mockFetch
      .mockResolvedValueOnce(ingestAccepted(customMessageId))
      .mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const secondOpts = mockFetch.mock.calls[1][1] as RequestInit;
    const dispBody = JSON.parse(secondOpts.body as string) as { message_id?: string };
    expect(dispBody.message_id).toBe(customMessageId);
  });

  it('WRT-M09 — payload de dispatch incluye client_account_id', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const secondOpts = mockFetch.mock.calls[1][1] as RequestInit;
    const dispBody = JSON.parse(secondOpts.body as string) as { client_account_id?: string };
    expect(dispBody.client_account_id).toBe(TEST_TENANT_ID);
  });

  it('WRT-M10 — respuesta HTTP 200 tras flujo aceptado', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    expect(res.status).toBe(200);
  });

  it('WRT-M11 — respuesta incluye message_id del ingest', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const body = await res.json() as { data?: { message_id?: string } };
    expect(body.data?.message_id).toBe(TEST_MESSAGE_ID);
  });

  it('WRT-M12 — respuesta incluye status=received', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const body = await res.json() as { data?: { status?: string } };
    expect(body.data?.status).toBe('received');
  });

  it('WRT-M13 — Authorization de ingest usa service_role correcto', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const firstOpts = mockFetch.mock.calls[0][1] as RequestInit;
    const headers = firstOpts.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${TEST_SERVICE_ROLE}`);
  });

  it('WRT-M14 — Authorization de dispatch usa service_role correcto', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const secondOpts = mockFetch.mock.calls[1][1] as RequestInit;
    const headers = secondOpts.headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${TEST_SERVICE_ROLE}`);
  });

  it('WRT-M15 — message_text ausente → HTTP 400, sin llamadas a fetch', async () => {
    const res = await handleWebMessageRequest(makeMessageRequest({
      ...VALID_MSG,
      message_text: undefined,
    }));
    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('WRT-M16 — message_text vacío → HTTP 400, sin llamadas a fetch', async () => {
    const res = await handleWebMessageRequest(makeMessageRequest({
      ...VALID_MSG,
      message_text: '   ',
    }));
    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('WRT-M17 — session_id ausente → HTTP 400', async () => {
    const res = await handleWebMessageRequest(makeMessageRequest({
      ...VALID_MSG,
      session_id: undefined,
    }));
    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('WRT-M18 — sender_ref inválido (no opaco) → HTTP 400', async () => {
    const res = await handleWebMessageRequest(makeMessageRequest({
      ...VALID_MSG,
      sender_ref: 'plaintext-sender',
    }));
    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('WRT-M19 — sender_ref no coincide con sesión → HTTP 403, sin fetch ingest', async () => {
    setMockSupabaseClient(makeMessageClient({
      id: TEST_SESSION_ID,
      sender_ref: 'wc_' + 'b'.repeat(32),
      channel: 'webchat',
    }));
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    expect(res.status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('WRT-M20 — sesión no encontrada → HTTP 404, sin fetch ingest', async () => {
    setMockSupabaseClient(makeMessageClient(null));
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    expect(res.status).toBe(404);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('WRT-M21 — message_text excede longitud máxima → HTTP 400', async () => {
    const res = await handleWebMessageRequest(makeMessageRequest({
      ...VALID_MSG,
      message_text: 'x'.repeat(2001),
    }));
    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('WRT-M22 — ingest llama a URL del SUPABASE_URL correcto', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const firstUrl = mockFetch.mock.calls[0][0] as string;
    expect(firstUrl).toContain(TEST_SUPABASE_URL);
  });

  it('WRT-M23 — dispatch llama a URL del SUPABASE_URL correcto', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const secondUrl = mockFetch.mock.calls[1][0] as string;
    expect(secondUrl).toContain(TEST_SUPABASE_URL);
  });

  it('WRT-M24 — método OPTIONS → HTTP 204 (preflight CORS, Fase 11B3)', async () => {
    const req = new Request('https://edge.test/', { method: 'OPTIONS' });
    const res = await handleWebMessageRequest(req);
    // Fase 11B3: buildPreflightResponse retorna 204 (estándar CORS preflight)
    expect(res.status).toBe(204);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Bloc 4 — conv-web-message: duplicate_ignored NO llama dispatch
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-DUPLICATE (WRT-DUP01..DUP08) — duplicate_ignored sin dispatch', () => {
  const VALID_MSG = {
    client_account_id: TEST_TENANT_ID,
    session_id: TEST_SESSION_ID,
    sender_ref: TEST_SENDER_REF,
    message_text: 'Mensaje duplicado',
  };

  beforeEach(() => {
    setMockSupabaseClient(makeMessageClient());
  });

  it('WRT-DUP01 — duplicate_ignored → fetch llamado solo 1 vez (solo ingest)', async () => {
    mockFetch.mockResolvedValueOnce(ingestDuplicate());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('WRT-DUP02 — duplicate_ignored → conv-dispatch-message NO es llamado', async () => {
    mockFetch.mockResolvedValueOnce(ingestDuplicate());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const calls = mockFetch.mock.calls as Array<[string, unknown]>;
    const dispatchCalled = calls.some(([url]) => String(url).includes('conv-dispatch-message'));
    expect(dispatchCalled).toBe(false);
  });

  it('WRT-DUP03 — duplicate_ignored → respuesta HTTP 200', async () => {
    mockFetch.mockResolvedValueOnce(ingestDuplicate());
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    expect(res.status).toBe(200);
  });

  it('WRT-DUP04 — duplicate_ignored → respuesta incluye message_id existente', async () => {
    const existingId = 'existing-msg-uuid-001';
    mockFetch.mockResolvedValueOnce(ingestDuplicate(existingId));
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const body = await res.json() as { data?: { message_id?: string } };
    expect(body.data?.message_id).toBe(existingId);
  });

  it('WRT-DUP05 — duplicate_ignored → respuesta incluye status=received', async () => {
    mockFetch.mockResolvedValueOnce(ingestDuplicate());
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const body = await res.json() as { data?: { status?: string } };
    expect(body.data?.status).toBe('received');
  });

  it('WRT-DUP06 — duplicate_ignored con message_id != null no engaña al guard', async () => {
    // El mensaje duplicado tiene message_id (uuid del mensaje original),
    // pero response_type='duplicate_ignored', NO 'accepted'.
    // El guard `ingestResponseType === 'accepted'` debe impedirlo.
    mockFetch.mockResolvedValueOnce(ingestDuplicate(TEST_MESSAGE_ID));
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    // Solo debe existir la llamada a ingest
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('conv-ingest');
  });

  it('WRT-DUP07 — accepted SÍ llama dispatch (control positivo)', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('WRT-DUP08 — ingest response_type desconocido → NO llama dispatch', async () => {
    const unknownResponse = new Response(JSON.stringify({
      ok: true,
      data: { response_type: 'unknown_future_type', session_id: TEST_SESSION_ID, message_id: TEST_MESSAGE_ID },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    mockFetch.mockResolvedValueOnce(unknownResponse);
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Bloc 5 — conv-web-message: errores de ingest y dispatch
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-ERRORS (WRT-ERR01..ERR11) — errores de red y EF', () => {
  const VALID_MSG = {
    client_account_id: TEST_TENANT_ID,
    session_id: TEST_SESSION_ID,
    sender_ref: TEST_SENDER_REF,
    message_text: 'Mensaje para error test',
  };

  beforeEach(() => {
    setMockSupabaseClient(makeMessageClient());
  });

  it('WRT-ERR01 — ingest lanza excepción de red → HTTP 500', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    expect(res.status).toBe(500);
  });

  it('WRT-ERR02 — ingest devuelve HTTP 500 → conv-web-message retorna HTTP 500', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: 'INTERNAL' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }));
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    expect(res.status).toBe(500);
  });

  it('WRT-ERR03 — ingest devuelve HTTP 500 → dispatch NO es llamado', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }));
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('WRT-ERR04 — ingest devuelve HTTP 400 → HTTP 500 sin dispatch', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: 'VALIDATION' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }));
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    expect(res.status).toBe(500);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('WRT-ERR05 — dispatch lanza excepción → respuesta sigue siendo HTTP 200', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockRejectedValueOnce(new Error('Dispatch network error'));
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    expect(res.status).toBe(200);
  });

  it('WRT-ERR06 — dispatch lanza excepción → message_id del ingest se devuelve igual', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockRejectedValueOnce(new Error('Dispatch network error'));
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const body = await res.json() as { data?: { message_id?: string } };
    expect(body.data?.message_id).toBe(TEST_MESSAGE_ID);
  });

  it('WRT-ERR07 — dispatch devuelve HTTP 500 → respuesta conv-web-message es HTTP 200', async () => {
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }));
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    expect(res.status).toBe(200);
  });

  it('WRT-ERR08 — body JSON inválido → HTTP 400 sin fetch', async () => {
    const req = new Request('https://edge.test/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid',
    });
    const res = await handleWebMessageRequest(req);
    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('WRT-ERR09 — WebChat inactivo → HTTP 403 sin fetch', async () => {
    setMockSupabaseClient(makeSupabaseClient({
      conv_wc_configs: { data: { is_active: false, allowed_origins: [] }, error: null },
      conv_sessions: { data: null, error: null },
    }));
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    expect(res.status).toBe(403);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('WRT-ERR10 — ingest excepción → respuesta no expone detalles internos', async () => {
    mockFetch.mockRejectedValueOnce(new Error('connection refused'));
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const body = await res.json() as { error?: string; data?: { message?: string } };
    const errorText = JSON.stringify(body);
    expect(errorText).not.toContain('connection refused');
  });

  it('WRT-ERR11 — método DELETE → HTTP 405', async () => {
    const req = new Request('https://edge.test/', { method: 'DELETE' });
    const res = await handleWebMessageRequest(req);
    expect(res.status).toBe(405);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Bloc 6 — Privacidad de logs
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-PRIVACY (WRT-P01..P12) — ningún PII en bruto en logs', () => {
  const VALID_SESSION_REQ = { client_account_id: TEST_TENANT_ID };
  const VALID_MSG = {
    client_account_id: TEST_TENANT_ID,
    session_id: TEST_SESSION_ID,
    sender_ref: TEST_SENDER_REF,
    message_text: 'Este mensaje privado no debe loguearse: secreto123',
  };

  beforeEach(() => {
    setMockSupabaseClient(makeSessionClient());
  });

  it('WRT-P01 — conv-web-session no loguea el client_account_id del tenant', async () => {
    await handleWebSessionRequest(makeRequest(VALID_SESSION_REQ));
    const logOutput = consoleLogs.join('\n');
    expect(logOutput).not.toContain(TEST_TENANT_ID);
  });

  it('WRT-P02 — conv-web-session no loguea el sender_ref generado', async () => {
    await handleWebSessionRequest(makeRequest(VALID_SESSION_REQ));
    const logOutput = consoleLogs.join('\n');
    // sender_ref generado aleatoriamente, pero aseguramos que no hay wc_ en logs
    const senderRefPattern = /wc_[0-9a-f]{32}/;
    expect(logOutput).not.toMatch(senderRefPattern);
  });

  it('WRT-P03 — conv-web-session no loguea service_role_key', async () => {
    await handleWebSessionRequest(makeRequest(VALID_SESSION_REQ));
    const logOutput = consoleLogs.join('\n');
    expect(logOutput).not.toContain(TEST_SERVICE_ROLE);
  });

  it('WRT-P04 — rechazo de campo prohibido no loguea el valor del campo', async () => {
    const sensitiveValue = 'super-secret-profile-id-001';
    await handleWebSessionRequest(makeRequest({ ...VALID_SESSION_REQ, profile_id: sensitiveValue }));
    const logOutput = consoleLogs.join('\n');
    expect(logOutput).not.toContain(sensitiveValue);
  });

  it('WRT-P05 — conv-web-session error de DB no expone detalles del error en respuesta', async () => {
    setMockSupabaseClient(makeSupabaseClient({
      conv_wc_configs: { data: { is_active: true, allowed_origins: [] }, error: null },
      conv_sessions: { data: null, error: { message: 'unique constraint violation' } },
    }));
    const res = await handleWebSessionRequest(makeRequest(VALID_SESSION_REQ));
    const body = await res.json() as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain('unique constraint violation');
  });

  it('WRT-P06 — conv-web-message no loguea message_text', async () => {
    setMockSupabaseClient(makeMessageClient());
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const logOutput = consoleLogs.join('\n');
    expect(logOutput).not.toContain('secreto123');
  });

  it('WRT-P07 — conv-web-message no loguea el sender_ref completo', async () => {
    setMockSupabaseClient(makeMessageClient());
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const logOutput = consoleLogs.join('\n');
    expect(logOutput).not.toContain(TEST_SENDER_REF);
  });

  it('WRT-P08 — conv-web-message no loguea service_role_key', async () => {
    setMockSupabaseClient(makeMessageClient());
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const logOutput = consoleLogs.join('\n');
    expect(logOutput).not.toContain(TEST_SERVICE_ROLE);
  });

  it('WRT-P09 — error de ingest no expone URL interna en respuesta al widget', async () => {
    setMockSupabaseClient(makeMessageClient());
    mockFetch.mockRejectedValueOnce(new Error('Internal URL: ' + TEST_SUPABASE_URL));
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const body = await res.json() as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain(TEST_SUPABASE_URL);
  });

  it('WRT-P10 — error de dispatch no expone detalles en respuesta al widget', async () => {
    setMockSupabaseClient(makeMessageClient());
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockRejectedValueOnce(new Error('Internal dispatch failure detail'));
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const body = await res.json() as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toContain('Internal dispatch failure detail');
  });

  it('WRT-P11 — respuesta de sesión no incluye service_role', async () => {
    setMockSupabaseClient(makeSessionClient());
    const res = await handleWebSessionRequest(makeRequest(VALID_SESSION_REQ));
    const body = await res.json() as Record<string, unknown>;
    const data = body['data'] as Record<string, unknown> ?? body;
    expect(data).not.toHaveProperty('service_role');
  });

  it('WRT-P12 — respuesta de mensaje no incluye service_role', async () => {
    setMockSupabaseClient(makeMessageClient());
    mockFetch
      .mockResolvedValueOnce(ingestAccepted())
      .mockResolvedValueOnce(dispatchOk());
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    const body = await res.json() as Record<string, unknown>;
    const data = body['data'] as Record<string, unknown> ?? body;
    expect(data).not.toHaveProperty('service_role');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// Bloc 7 — Validación de tenant y sesión
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-VALIDATION (WRT-V01..V10) — tenant y sesión', () => {
  const VALID_MSG = {
    client_account_id: TEST_TENANT_ID,
    session_id: TEST_SESSION_ID,
    sender_ref: TEST_SENDER_REF,
    message_text: 'Validación de tenant',
  };

  it('WRT-V01 — client_account_id de distinto tenant → WebChat 403 (inactivo)', async () => {
    setMockSupabaseClient(makeSupabaseClient({
      conv_wc_configs: { data: null, error: null },
      conv_sessions: { data: null, error: null },
    }));
    const res = await handleWebMessageRequest(makeMessageRequest({
      ...VALID_MSG,
      client_account_id: 'otro-tenant-uuid',
    }));
    expect(res.status).toBe(403);
  });

  it('WRT-V02 — session_id de otro tenant → HTTP 404', async () => {
    // Supabase no devuelve sesión porque la query filtra por client_account_id
    setMockSupabaseClient(makeSupabaseClient({
      conv_wc_configs: { data: { is_active: true, allowed_origins: [] }, error: null },
      conv_sessions: { data: null, error: null },
    }));
    const res = await handleWebMessageRequest(makeMessageRequest({
      ...VALID_MSG,
      session_id: 'session-de-otro-tenant',
    }));
    expect(res.status).toBe(404);
  });

  it('WRT-V03 — sender_ref con formato incorrecto (sin prefijo wc_) → HTTP 400', async () => {
    setMockSupabaseClient(makeMessageClient());
    const res = await handleWebMessageRequest(makeMessageRequest({
      ...VALID_MSG,
      sender_ref: 'invalid-sender-ref',
    }));
    expect(res.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('WRT-V04 — sender_ref con formato incorrecto (demasiado corto) → HTTP 400', async () => {
    setMockSupabaseClient(makeMessageClient());
    const res = await handleWebMessageRequest(makeMessageRequest({
      ...VALID_MSG,
      sender_ref: 'wc_abc',
    }));
    expect(res.status).toBe(400);
  });

  it('WRT-V05 — sender_ref con caracteres no hex → HTTP 400', async () => {
    setMockSupabaseClient(makeMessageClient());
    const res = await handleWebMessageRequest(makeMessageRequest({
      ...VALID_MSG,
      sender_ref: 'wc_' + 'g'.repeat(32),
    }));
    expect(res.status).toBe(400);
  });

  it('WRT-V06 — session_id vacío → HTTP 400', async () => {
    setMockSupabaseClient(makeMessageClient());
    const res = await handleWebMessageRequest(makeMessageRequest({
      ...VALID_MSG,
      session_id: '',
    }));
    expect(res.status).toBe(400);
  });

  it('WRT-V07 — client_account_id de tipo número → HTTP 400', async () => {
    setMockSupabaseClient(makeMessageClient());
    const res = await handleWebMessageRequest(makeMessageRequest({
      ...VALID_MSG,
      client_account_id: 12345,
    }));
    expect(res.status).toBe(400);
  });

  it('WRT-V08 — session canal=whatsapp rechazada (no es webchat) → HTTP 404', async () => {
    // La query filtra .eq('channel', 'webchat'), así que no encuentra sesión WA
    setMockSupabaseClient(makeSupabaseClient({
      conv_wc_configs: { data: { is_active: true, allowed_origins: [] }, error: null },
      conv_sessions: { data: null, error: null },
    }));
    const res = await handleWebMessageRequest(makeMessageRequest(VALID_MSG));
    expect(res.status).toBe(404);
  });

  it('WRT-V09 — conv-web-session sin client_account_id → HTTP 400 antes de DB', async () => {
    setMockSupabaseClient(makeSessionClient());
    const res = await handleWebSessionRequest(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('WRT-V10 — conv-web-session origin permitido → HTTP 200', async () => {
    setMockSupabaseClient(makeSupabaseClient({
      conv_wc_configs: { data: { is_active: true, allowed_origins: ['https://allowed.com'] }, error: null },
      conv_sessions: { data: { id: TEST_SESSION_UUID }, error: null },
    }));
    const req = makeRequest({ client_account_id: TEST_TENANT_ID }, { Origin: 'https://allowed.com' });
    const res = await handleWebSessionRequest(req);
    expect(res.status).toBe(200);
  });
});
