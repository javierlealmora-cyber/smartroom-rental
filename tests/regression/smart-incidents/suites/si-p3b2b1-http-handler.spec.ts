/**
 * si-p3b2b1-http-handler.spec.ts — Suite de regresión del handler HTTP offline.
 *
 * Cubre los 14 pasos del pipeline de createIncidentHttpHandler.
 * Sin Deno.serve. Sin persistencia. Sin credenciales reales.
 * Todas las dependencias son fakes inyectadas.
 *
 * Suites:
 *   1. Paso 1 — método HTTP
 *   2. Paso 2 — Content-Type
 *   3. Paso 3/4 — límite de body (Content-Length y bytes reales)
 *   4. Paso 5 — parse JSON
 *   5. Paso 6 — extracción segura de trace IDs
 *   6. Paso 7/8 — autenticación y autorización atómica
 *   7. Paso 9 — validación del contrato
 *   8. Paso 10 — consistencia headers–body
 *   9. Paso 11/12/13 — use case y respuesta de éxito
 *  10. Paso 14 — logging allowlisted
 *  11. Invariantes de seguridad
 *  12. Fixtures y helpers (no tests)
 *
 * Estado: SI-P3B2B1_HTTP_HANDLER_TESTED_OFFLINE
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createIncidentHttpHandler } from '../../../../supabase/functions/_shared/smart-incidents/http-handler.ts';
import type { CreateIncidentHttpDependencies } from '../../../../supabase/functions/_shared/smart-incidents/http-types.ts';
import type {
  IncidentProviderLogEntry,
  IncidentProviderLogger,
} from '../../../../supabase/functions/_shared/smart-incidents/logger-port.ts';
import type {
  IncidentCallerAuthPort,
  IncidentCallerAuthResult,
  CreateIncidentProviderUseCase,
  CreateIncidentDomainResult,
  IncidentProviderCallerIdentity,
} from '../../../../supabase/functions/_shared/smart-incidents/port.ts';

// ─── Fixtures globales ─────────────────────────────────────────────────────────

const REQ_ID = '11111111-1111-1111-1111-111111111111';
const CORR_ID = '22222222-2222-2222-2222-222222222222';
const ACCOUNT_ID = '33333333-3333-3333-3333-333333333333';
const REQUESTER_ID = '44444444-4444-4444-4444-444444444444';
const ACCOMMODATION_ID = '55555555-5555-5555-5555-555555555555';
const INCIDENT_ID = 'aaaa1111-bbbb-2222-cccc-3333dddd4444';
const INCIDENT_REF = 'INC-2026-00042';
const CREATED_AT = '2026-08-03T10:00:00.000Z';
const IDEMPOTENCY_KEY = 'stable-idempotency-key-2026080300001';

const VALID_BODY = {
  contract_version: '1.0',
  client_account_id: ACCOUNT_ID,
  request_id: REQ_ID,
  correlation_id: CORR_ID,
  idempotency_key: IDEMPOTENCY_KEY,
  source_system: 'smart_conversations',
  source_channel: 'whatsapp',
  external_request_reference: null,
  actor: { type: 'system' },
  requester_profile_id: REQUESTER_ID,
  incident: {
    title: 'Fuga de agua en baño',
    description: 'Se reporta fuga en tubería del baño principal.',
    accommodation_id: ACCOMMODATION_ID,
    room_id: null,
    category: 'maintenance',
    priority: 'normal',
  },
};

const AUTH_IDENTITY: IncidentProviderCallerIdentity = {
  caller_id: 'smart_conversations',
  auth_method: 'opaque_bearer_capability',
  authorized_operations: ['create_incident'],
  tenant_scope: 'global',
  credential_slot: 'current',
};

const AUTH_OK: IncidentCallerAuthResult = { ok: true, identity: AUTH_IDENTITY };
const AUTH_401: IncidentCallerAuthResult = { ok: false, error_code: 'AUTHENTICATION_REQUIRED' };
const AUTH_403: IncidentCallerAuthResult = { ok: false, error_code: 'CALLER_NOT_AUTHORIZED' };
const AUTH_500: IncidentCallerAuthResult = { ok: false, error_code: 'INTERNAL_ERROR' };

const FIRST_CREATION_SUCCESS: CreateIncidentDomainResult = {
  ok: true,
  data: {
    incident_id: INCIDENT_ID,
    incident_reference: INCIDENT_REF,
    created_at: CREATED_AT,
    idempotent_replay: false,
  },
};

const REPLAY_SUCCESS: CreateIncidentDomainResult = {
  ok: true,
  data: {
    incident_id: INCIDENT_ID,
    incident_reference: INCIDENT_REF,
    created_at: CREATED_AT,
    idempotent_replay: true,
  },
};

// ─── Factories de fakes ────────────────────────────────────────────────────────

function makeAuthPort(result: IncidentCallerAuthResult = AUTH_OK): IncidentCallerAuthPort & {
  calls: Array<{ authorizationHeader: string | null; operation: string }>;
} {
  const calls: Array<{ authorizationHeader: string | null; operation: string }> = [];
  return {
    calls,
    async authenticateAndAuthorize(req) {
      calls.push({ authorizationHeader: req.authorizationHeader, operation: req.operation });
      return result;
    },
  };
}

function makeUseCase(result: CreateIncidentDomainResult = FIRST_CREATION_SUCCESS): CreateIncidentProviderUseCase & {
  calls: unknown[];
} {
  const calls: unknown[] = [];
  return {
    calls,
    async execute(req) {
      calls.push(req);
      return result;
    },
  };
}

function makeLogger(): IncidentProviderLogger & { entries: IncidentProviderLogEntry[] } {
  const entries: IncidentProviderLogEntry[] = [];
  return { entries, log: (e) => entries.push(e) };
}

let nowMs = 1000;
function makeDeps(overrides: Partial<CreateIncidentHttpDependencies> = {}): CreateIncidentHttpDependencies & {
  logger: ReturnType<typeof makeLogger>;
  callerAuth: ReturnType<typeof makeAuthPort>;
  useCase: ReturnType<typeof makeUseCase>;
} {
  const logger = makeLogger();
  const callerAuth = makeAuthPort();
  const useCase = makeUseCase();
  return {
    callerAuth,
    useCase,
    now: () => new Date(nowMs),
    generateTraceId: () => 'trace-' + Math.random().toString(36).slice(2),
    logger,
    ...overrides,
  } as CreateIncidentHttpDependencies & {
    logger: ReturnType<typeof makeLogger>;
    callerAuth: ReturnType<typeof makeAuthPort>;
    useCase: ReturnType<typeof makeUseCase>;
  };
}

function makeRequest(overrides: {
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
} = {}): Request {
  const method = overrides.method ?? 'POST';
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...(overrides.headers ?? {}),
  });
  // GET/HEAD no admiten body en la Fetch API estándar. Para otros métodos, body por defecto.
  const bodyAllowed = method !== 'GET' && method !== 'HEAD';
  const body = overrides.body !== undefined
    ? overrides.body
    : bodyAllowed
    ? JSON.stringify(VALID_BODY)
    : null;
  return new Request('https://provider.example/incidents', {
    method,
    headers,
    body: body ?? undefined,
  });
}

async function parseBody(resp: Response): Promise<Record<string, unknown>> {
  return resp.json() as Promise<Record<string, unknown>>;
}

// ─── Suite 1 — Paso 1: Método HTTP ────────────────────────────────────────────

describe('SI-P3B2B1 — Paso 1: método HTTP', () => {
  it('POST → procesa la request (no rechaza por método)', async () => {
    const deps = makeDeps();
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    // El método es POST; no debe rechazarse en el paso 1.
    // Si auth o validación fallan los tests del paso correspondiente los cubren.
    // Aquí solo verificamos que el status NO es 405.
    expect(resp.status).not.toBe(405);
  });

  it('GET → 405 con Allow: POST', async () => {
    const deps = makeDeps();
    const req = makeRequest({ method: 'GET' });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(405);
    expect(resp.headers.get('Allow')).toBe('POST');
  });

  it('PUT → 405 con Allow: POST', async () => {
    const deps = makeDeps();
    const req = makeRequest({ method: 'PUT' });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(405);
    expect(resp.headers.get('Allow')).toBe('POST');
  });

  it('DELETE → 405 con Allow: POST', async () => {
    const deps = makeDeps();
    const req = makeRequest({ method: 'DELETE' });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(405);
    expect(resp.headers.get('Allow')).toBe('POST');
  });

  it('OPTIONS → 405 (backend-to-backend, CORS prohibido)', async () => {
    const deps = makeDeps();
    const req = makeRequest({ method: 'OPTIONS' });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(405);
    expect(resp.headers.get('Allow')).toBe('POST');
  });

  it('OPTIONS → sin Access-Control-Allow-Origin', async () => {
    const deps = makeDeps();
    const req = makeRequest({ method: 'OPTIONS' });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('405 → body tiene error_code VALIDATION_ERROR y http_status 405', async () => {
    const deps = makeDeps();
    const req = makeRequest({ method: 'PATCH' });
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
    expect(body.http_status).toBe(405);
    expect(body.ok).toBe(false);
  });

  it('405 → callerAuth.authenticateAndAuthorize no es llamado', async () => {
    const callerAuth = makeAuthPort();
    const deps = makeDeps({ callerAuth });
    const req = makeRequest({ method: 'GET' });
    await createIncidentHttpHandler(req, deps);
    expect(callerAuth.calls).toHaveLength(0);
  });

  it('405 → useCase.execute no es llamado', async () => {
    const useCase = makeUseCase();
    const deps = makeDeps({ useCase });
    const req = makeRequest({ method: 'DELETE' });
    await createIncidentHttpHandler(req, deps);
    expect(useCase.calls).toHaveLength(0);
  });
});

// ─── Suite 2 — Paso 2: Content-Type ───────────────────────────────────────────

describe('SI-P3B2B1 — Paso 2: Content-Type', () => {
  it('application/json → no rechaza por Content-Type', async () => {
    const deps = makeDeps();
    const req = makeRequest({ headers: { 'Content-Type': 'application/json' } });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).not.toBe(400);
  });

  it('application/json; charset=utf-8 → aceptado', async () => {
    const deps = makeDeps();
    const req = makeRequest({ headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).not.toBe(400);
  });

  it('text/plain → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    const req = makeRequest({ headers: { 'Content-Type': 'text/plain' } });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('ausencia de Content-Type → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    const req = new Request('https://provider.example/incidents', {
      method: 'POST',
      body: JSON.stringify(VALID_BODY),
    });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('Content-Type incorrecto → callerAuth no llamado', async () => {
    const callerAuth = makeAuthPort();
    const deps = makeDeps({ callerAuth });
    const req = makeRequest({ headers: { 'Content-Type': 'application/xml' } });
    await createIncidentHttpHandler(req, deps);
    expect(callerAuth.calls).toHaveLength(0);
  });
});

// ─── Suite 3 — Pasos 3/4: Límite de body ──────────────────────────────────────

describe('SI-P3B2B1 — Pasos 3/4: límite de body (65536 bytes)', () => {
  it('Content-Length > 65536 → 400 antes de leer body', async () => {
    const deps = makeDeps();
    const req = makeRequest({
      headers: { 'Content-Length': '70000' },
    });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('Content-Length = 65536 → no rechaza por Content-Length solo (el body real puede ser menor)', async () => {
    // Content-Length igual al límite: no debe rechazarse en paso 3.
    // El paso 4 mide bytes reales; si el body real es válido, pasa.
    const deps = makeDeps();
    const req = makeRequest({
      headers: { 'Content-Length': '65536' },
    });
    // body real es pequeño, así que pasa el paso 4; luego puede fallar en otro paso.
    const resp = await createIncidentHttpHandler(req, deps);
    // Solo verificamos que NO es rechazado en paso 3 (status no 400 por tamaño en paso 3).
    // El paso 5/9 puede rechazarlo; aquí simplemente no debe ser 400 por CL check.
    // Nota: en la práctica el body JSON de VALID_BODY es ~500 bytes, muy inferior a 65536.
    expect(resp.status).not.toBe(400); // No rechazado por CL limit
  });

  it('body real > 65536 bytes (65537) → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    // 65537 bytes: supera el límite real
    const oversizedBody = JSON.stringify({ x: 'a'.repeat(65529) }); // 65537 bytes
    const bodyBytes = new TextEncoder().encode(oversizedBody).length;
    expect(bodyBytes).toBeGreaterThan(65536);
    const req = makeRequest({ body: oversizedBody });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('body exactamente 65536 bytes → no rechazado por límite de tamaño', async () => {
    const deps = makeDeps();
    // {"x":"...N chars..."}: prefijo `{"x":"` = 6 bytes, sufijo `"}` = 2 bytes → total = N+8.
    // Para 65536 exactos: N = 65528.
    const body65536 = JSON.stringify({ x: 'a'.repeat(65528) });
    expect(new TextEncoder().encode(body65536).length).toBe(65536);
    const req = makeRequest({ body: body65536 });
    await createIncidentHttpHandler(req, deps);
    // Si callerAuth fue llamado → pasos 3/4 no bloquearon (el limit = 65536 no es >65536).
    // El body no tiene contract_version → falla en paso 9 con UNSUPPORTED_CONTRACT_VERSION (400),
    // pero ese 400 es del validador, NO del límite de tamaño.
    expect(deps.callerAuth.calls.length).toBeGreaterThan(0);
  });

  it('body de 65537 bytes → callerAuth no es llamado', async () => {
    const callerAuth = makeAuthPort();
    const deps = makeDeps({ callerAuth });
    const oversizedBody = JSON.stringify({ x: 'a'.repeat(65530) }); // > 65536
    const bodyBytes = new TextEncoder().encode(oversizedBody).length;
    // Ajustamos hasta superar 65536
    let payload = 'a'.repeat(65530);
    while (new TextEncoder().encode(JSON.stringify({ x: payload })).length <= 65536) {
      payload += 'a';
    }
    const req = makeRequest({ body: JSON.stringify({ x: payload }) });
    await createIncidentHttpHandler(req, deps);
    expect(callerAuth.calls).toHaveLength(0);
  });
});

// ─── Suite 4 — Paso 5: Parse JSON ─────────────────────────────────────────────

describe('SI-P3B2B1 — Paso 5: parse JSON', () => {
  it('JSON inválido → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    const req = makeRequest({ body: '{invalid json' });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('body vacío → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    const req = makeRequest({ body: '' });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('JSON array → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    const req = makeRequest({ body: '[{"key": "value"}]' });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('JSON null → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    const req = makeRequest({ body: 'null' });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('JSON string primitivo → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    const req = makeRequest({ body: '"just a string"' });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('JSON numérico → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    const req = makeRequest({ body: '42' });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('JSON inválido → callerAuth no llamado', async () => {
    const callerAuth = makeAuthPort();
    const deps = makeDeps({ callerAuth });
    const req = makeRequest({ body: '{bad' });
    await createIncidentHttpHandler(req, deps);
    expect(callerAuth.calls).toHaveLength(0);
  });
});

// ─── Suite 5 — Paso 6: Extracción segura de trace IDs ─────────────────────────

describe('SI-P3B2B1 — Paso 6: extracción segura de trace IDs', () => {
  it('body con request_id UUID válido → trace ID se usa en error response post-auth', async () => {
    // Auth falla → response usa el trace ID del body
    const callerAuth = makeAuthPort(AUTH_401);
    const deps = makeDeps({ callerAuth });
    const bodyWithId = { ...VALID_BODY, request_id: REQ_ID };
    const req = makeRequest({ body: JSON.stringify(bodyWithId) });
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(body.request_id).toBe(REQ_ID);
  });

  it('body con correlation_id UUID válido → se usa en error response post-auth', async () => {
    const callerAuth = makeAuthPort(AUTH_401);
    const deps = makeDeps({ callerAuth });
    const bodyWithCorr = { ...VALID_BODY, correlation_id: CORR_ID };
    const req = makeRequest({ body: JSON.stringify(bodyWithCorr) });
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(body.correlation_id).toBe(CORR_ID);
  });

  it('body con request_id no-UUID → no se usa; fallback a generateTraceId', async () => {
    // Un trace ID inválido no debe ser usado
    const callerAuth = makeAuthPort(AUTH_401);
    const traceId = '00000000-0000-0000-0000-aaaaaaaaaaaa';
    const deps = makeDeps({
      callerAuth,
      generateTraceId: () => traceId,
    });
    const bodyInvalidId = { ...VALID_BODY, request_id: 'not-a-uuid' };
    const req = makeRequest({ body: JSON.stringify(bodyInvalidId) });
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    // El request_id de la response debe ser el generado por generateTraceId (no el inválido)
    expect(body.request_id).toBe(traceId);
  });

  it('body sin request_id → se genera un trace ID via generateTraceId', async () => {
    const callerAuth = makeAuthPort(AUTH_401);
    const fixedTrace = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    const deps = makeDeps({
      callerAuth,
      generateTraceId: () => fixedTrace,
    });
    const bodyNoId = { ...VALID_BODY };
    delete (bodyNoId as Record<string, unknown>).request_id;
    const req = makeRequest({ body: JSON.stringify(bodyNoId) });
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(typeof body.request_id).toBe('string');
    expect(body.request_id).toBe(fixedTrace);
  });

  it('body con request_id inyección SQL → no se ejecuta; trace ID se descarta', async () => {
    const callerAuth = makeAuthPort(AUTH_401);
    const safeTrace = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const deps = makeDeps({
      callerAuth,
      generateTraceId: () => safeTrace,
    });
    const bodyInjection = { ...VALID_BODY, request_id: "' OR '1'='1" };
    const req = makeRequest({ body: JSON.stringify(bodyInjection) });
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    // El ID inyectado no debe aparecer en la response
    expect(body.request_id).not.toContain("OR '1'='1");
    expect(body.request_id).toBe(safeTrace);
  });
});

// ─── Suite 6 — Pasos 7/8: Autenticación y autorización atómica ────────────────

describe('SI-P3B2B1 — Pasos 7/8: autenticación y autorización', () => {
  it('auth OK → no rechaza en paso 7/8', async () => {
    const deps = makeDeps();
    const req = makeRequest({ headers: { Authorization: 'Bearer valid-token' } });
    const resp = await createIncidentHttpHandler(req, deps);
    // No debe ser 401 ni 403
    expect(resp.status).not.toBe(401);
    expect(resp.status).not.toBe(403);
  });

  it('AUTHENTICATION_REQUIRED → 401 con WWW-Authenticate: Bearer', async () => {
    const callerAuth = makeAuthPort(AUTH_401);
    const deps = makeDeps({ callerAuth });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(401);
    expect(resp.headers.get('WWW-Authenticate')).toBe('Bearer');
  });

  it('AUTHENTICATION_REQUIRED → error_code AUTHENTICATION_REQUIRED en body', async () => {
    const callerAuth = makeAuthPort(AUTH_401);
    const deps = makeDeps({ callerAuth });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('CALLER_NOT_AUTHORIZED → 403 sin WWW-Authenticate', async () => {
    const callerAuth = makeAuthPort(AUTH_403);
    const deps = makeDeps({ callerAuth });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(403);
    expect(resp.headers.get('WWW-Authenticate')).toBeNull();
  });

  it('INTERNAL_ERROR (auth) → 500', async () => {
    const callerAuth = makeAuthPort(AUTH_500);
    const deps = makeDeps({ callerAuth });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(500);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('INTERNAL_ERROR');
  });

  it('callerAuth llamado con operation="create_incident"', async () => {
    const callerAuth = makeAuthPort(AUTH_OK);
    const deps = makeDeps({ callerAuth });
    const req = makeRequest({ headers: { Authorization: 'Bearer tok' } });
    await createIncidentHttpHandler(req, deps);
    expect(callerAuth.calls).toHaveLength(1);
    expect(callerAuth.calls[0].operation).toBe('create_incident');
  });

  it('callerAuth llamado con el authorizationHeader del request', async () => {
    const callerAuth = makeAuthPort(AUTH_OK);
    const deps = makeDeps({ callerAuth });
    const req = makeRequest({ headers: { Authorization: 'Bearer my-secret-token' } });
    await createIncidentHttpHandler(req, deps);
    expect(callerAuth.calls[0].authorizationHeader).toBe('Bearer my-secret-token');
  });

  it('sin header Authorization → callerAuth llamado con null', async () => {
    const callerAuth = makeAuthPort(AUTH_401);
    const deps = makeDeps({ callerAuth });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    expect(callerAuth.calls[0].authorizationHeader).toBeNull();
  });

  it('auth falla → useCase.execute no llamado', async () => {
    const callerAuth = makeAuthPort(AUTH_401);
    const useCase = makeUseCase();
    const deps = makeDeps({ callerAuth, useCase });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    expect(useCase.calls).toHaveLength(0);
  });

  it('auth falla → validación del contrato no ejecutada (useCase tampoco)', async () => {
    // Verificamos indirectamente: si auth falla el use case no se ejecuta.
    // El validador se encuentra entre auth y use case; si use case no se llama,
    // el validador tampoco (el pipeline paró antes).
    const callerAuth = makeAuthPort(AUTH_403);
    const useCase = makeUseCase();
    const deps = makeDeps({ callerAuth, useCase });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    expect(useCase.calls).toHaveLength(0);
  });

  it('401 body no expone token, secreto ni razón interna', async () => {
    const callerAuth = makeAuthPort(AUTH_401);
    const deps = makeDeps({ callerAuth });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const bodyText = await resp.text();
    expect(bodyText).not.toContain('token');
    expect(bodyText).not.toContain('Bearer');
    expect(bodyText).not.toContain('secret');
    expect(bodyText).not.toContain('hash');
    // WWW-Authenticate header sí incluye "Bearer" pero eso está en headers, no body
  });
});

// ─── Suite 7 — Paso 9: Validación del contrato ────────────────────────────────

describe('SI-P3B2B1 — Paso 9: validación del contrato provider v1.0', () => {
  it('request válido → no rechaza en validación', async () => {
    const deps = makeDeps();
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).not.toBe(400);
  });

  it('contract_version ausente → 400 UNSUPPORTED_CONTRACT_VERSION', async () => {
    const deps = makeDeps();
    const invalidBody = { ...VALID_BODY };
    delete (invalidBody as Record<string, unknown>).contract_version;
    const req = makeRequest({ body: JSON.stringify(invalidBody) });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('UNSUPPORTED_CONTRACT_VERSION');
  });

  it('contract_version "2.0" → 400 UNSUPPORTED_CONTRACT_VERSION', async () => {
    const deps = makeDeps();
    const req = makeRequest({ body: JSON.stringify({ ...VALID_BODY, contract_version: '2.0' }) });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('UNSUPPORTED_CONTRACT_VERSION');
  });

  it('incident.category inválida → 422 INVALID_CATEGORY', async () => {
    const deps = makeDeps();
    const invalidBody = {
      ...VALID_BODY,
      incident: { ...VALID_BODY.incident, category: 'unknown' },
    };
    const req = makeRequest({ body: JSON.stringify(invalidBody) });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(422);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('INVALID_CATEGORY');
  });

  it('incident.attachments con elementos → 422 ATTACHMENTS_NOT_SUPPORTED', async () => {
    const deps = makeDeps();
    const invalidBody = {
      ...VALID_BODY,
      incident: { ...VALID_BODY.incident, attachments: ['file.pdf'] },
    };
    const req = makeRequest({ body: JSON.stringify(invalidBody) });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(422);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('ATTACHMENTS_NOT_SUPPORTED');
  });

  it('request_id no UUID → 400 VALIDATION_ERROR con field=request_id', async () => {
    const deps = makeDeps();
    const invalidBody = { ...VALID_BODY, request_id: 'not-a-uuid' };
    const req = makeRequest({ body: JSON.stringify(invalidBody) });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
    expect(body.field).toBe('request_id');
  });

  it('validación falla → useCase.execute no llamado', async () => {
    const useCase = makeUseCase();
    const deps = makeDeps({ useCase });
    const invalidBody = { ...VALID_BODY, contract_version: '99.0' };
    const req = makeRequest({ body: JSON.stringify(invalidBody) });
    await createIncidentHttpHandler(req, deps);
    expect(useCase.calls).toHaveLength(0);
  });

  it('validación OK → useCase.execute llamado exactamente una vez', async () => {
    const useCase = makeUseCase();
    const deps = makeDeps({ useCase });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    expect(useCase.calls).toHaveLength(1);
  });
});

// ─── Suite 8 — Paso 10: Consistencia headers–body ─────────────────────────────

describe('SI-P3B2B1 — Paso 10: consistencia headers–body', () => {
  it('Idempotency-Key header ausente → no rechaza', async () => {
    const deps = makeDeps();
    const req = makeRequest(); // sin Idempotency-Key header
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).not.toBe(400);
  });

  it('Idempotency-Key coincide con body → no rechaza', async () => {
    const deps = makeDeps();
    const req = makeRequest({
      headers: { 'Idempotency-Key': IDEMPOTENCY_KEY },
    });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).not.toBe(400);
  });

  it('Idempotency-Key diferente al body → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    const req = makeRequest({
      headers: { 'Idempotency-Key': 'different-key-that-does-not-match-body' },
    });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('X-Correlation-Id coincide con body → no rechaza', async () => {
    const deps = makeDeps();
    const req = makeRequest({
      headers: { 'X-Correlation-Id': CORR_ID },
    });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).not.toBe(400);
  });

  it('X-Correlation-Id diferente al body → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    const req = makeRequest({
      headers: { 'X-Correlation-Id': 'aaaabbbb-cccc-dddd-eeee-ffffgggghhhh' },
    });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('X-Source ausente → no rechaza', async () => {
    const deps = makeDeps();
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).not.toBe(400);
  });

  it('X-Source = "smart_conversations" → no rechaza', async () => {
    const deps = makeDeps();
    const req = makeRequest({
      headers: { 'X-Source': 'smart_conversations' },
    });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).not.toBe(400);
  });

  it('X-Source diferente → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    const req = makeRequest({
      headers: { 'X-Source': 'admin_panel' },
    });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('X-Source incorrecto pero token válido → 400 (X-Source no autentica)', async () => {
    const deps = makeDeps();
    const req = makeRequest({
      headers: {
        Authorization: 'Bearer valid-token',
        'X-Source': 'browser',
      },
    });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('inconsistencia de header → useCase no llamado', async () => {
    const useCase = makeUseCase();
    const deps = makeDeps({ useCase });
    const req = makeRequest({
      headers: { 'Idempotency-Key': 'wrong-key-that-differs-from-body' },
    });
    await createIncidentHttpHandler(req, deps);
    expect(useCase.calls).toHaveLength(0);
  });
});

// ─── Suite 9 — Pasos 11/12/13: Use case y respuesta de éxito ──────────────────

describe('SI-P3B2B1 — Pasos 11/12/13: use case, mapping y respuesta', () => {
  it('primera creación → HTTP 201', async () => {
    const deps = makeDeps();
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(201);
  });

  it('replay idempotente → HTTP 200', async () => {
    const useCase = makeUseCase(REPLAY_SUCCESS);
    const deps = makeDeps({ useCase });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(200);
  });

  it('primera creación → body idempotent_replay=false', async () => {
    const deps = makeDeps();
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    // body es CreateIncidentResultV1 directo (sin wrapper ok/data)
    expect(body.idempotent_replay).toBe(false);
  });

  it('replay → body idempotent_replay=true', async () => {
    const useCase = makeUseCase(REPLAY_SUCCESS);
    const deps = makeDeps({ useCase });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(body.idempotent_replay).toBe(true);
  });

  it('primera creación → body incluye incident_id, incident_reference, created_at', async () => {
    const deps = makeDeps();
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    // body es CreateIncidentResultV1 directo
    expect(body.incident_id).toBe(INCIDENT_ID);
    expect(body.incident_reference).toBe(INCIDENT_REF);
    expect(body.created_at).toBe(CREATED_AT);
  });

  it('respuesta incluye contract_version="1.0"', async () => {
    const deps = makeDeps();
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(body.contract_version).toBe('1.0');
  });

  it('respuesta incluye request_id y correlation_id del body validado', async () => {
    const deps = makeDeps();
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(body.request_id).toBe(REQ_ID);
    expect(body.correlation_id).toBe(CORR_ID);
  });

  it('respuesta de error del use case → status HTTP correcto', async () => {
    const ucError: CreateIncidentDomainResult = {
      ok: false,
      error: { error_code: 'IDEMPOTENCY_CONFLICT', message: 'Conflicto de idempotencia' },
    };
    const useCase = makeUseCase(ucError);
    const deps = makeDeps({ useCase });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(409);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('respuesta de éxito → Content-Type: application/json', async () => {
    const deps = makeDeps();
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.headers.get('Content-Type')).toContain('application/json');
  });

  it('useCase.execute recibe el body validado (sin campos extra)', async () => {
    const useCase = makeUseCase();
    const deps = makeDeps({ useCase });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    expect(useCase.calls).toHaveLength(1);
    const ucInput = useCase.calls[0] as Record<string, unknown>;
    expect(ucInput.contract_version).toBe('1.0');
    expect(ucInput.request_id).toBe(REQ_ID);
  });
});

// ─── Suite 10 — Paso 14: Logging allowlisted ──────────────────────────────────

describe('SI-P3B2B1 — Paso 14: logging allowlisted', () => {
  it('logger.log llamado exactamente una vez por request', async () => {
    const logger = makeLogger();
    const deps = makeDeps({ logger });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    expect(logger.entries).toHaveLength(1);
  });

  it('log entry incluye request_id', async () => {
    const logger = makeLogger();
    const deps = makeDeps({ logger });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    expect(logger.entries[0].request_id).toBeDefined();
    expect(typeof logger.entries[0].request_id).toBe('string');
  });

  it('log entry incluye correlation_id', async () => {
    const logger = makeLogger();
    const deps = makeDeps({ logger });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    expect(logger.entries[0].correlation_id).toBeDefined();
  });

  it('log entry incluye http_status correcto (201 para primera creación)', async () => {
    const logger = makeLogger();
    const deps = makeDeps({ logger });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    expect(logger.entries[0].http_status).toBe(201);
  });

  it('log entry incluye result_code="SUCCESS" para éxito', async () => {
    const logger = makeLogger();
    const deps = makeDeps({ logger });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    expect(logger.entries[0].result_code).toBe('SUCCESS');
  });

  it('log entry incluye duration_ms no negativa', async () => {
    const logger = makeLogger();
    const deps = makeDeps({ logger });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    expect(logger.entries[0].duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('log entry para replay incluye idempotent_replay=true', async () => {
    const logger = makeLogger();
    const useCase = makeUseCase(REPLAY_SUCCESS);
    const deps = makeDeps({ logger, useCase });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    expect(logger.entries[0].idempotent_replay).toBe(true);
  });

  it('log entry para primera creación incluye idempotent_replay=false', async () => {
    const logger = makeLogger();
    const deps = makeDeps({ logger });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    expect(logger.entries[0].idempotent_replay).toBe(false);
  });

  it('log entry para error no incluye payload ni body', async () => {
    const logger = makeLogger();
    const callerAuth = makeAuthPort(AUTH_401);
    const deps = makeDeps({ logger, callerAuth });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    const entry = logger.entries[0];
    const entryStr = JSON.stringify(entry);
    expect(entryStr).not.toContain('title');
    expect(entryStr).not.toContain('description');
    expect(entryStr).not.toContain('idempotency_key');
    expect(entryStr).not.toContain('Authorization');
    expect(entryStr).not.toContain('token');
  });

  it('log entry incluye credential_slot="current" cuando auth es exitosa con slot current', async () => {
    const logger = makeLogger();
    const callerAuth = makeAuthPort({ ok: true, identity: { ...AUTH_IDENTITY, credential_slot: 'current' } });
    const deps = makeDeps({ logger, callerAuth });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    expect(logger.entries[0].credential_slot).toBe('current');
  });

  it('log entry NO incluye credential_slot cuando auth falla', async () => {
    const logger = makeLogger();
    const callerAuth = makeAuthPort(AUTH_401);
    const deps = makeDeps({ logger, callerAuth });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    expect(logger.entries[0].credential_slot).toBeUndefined();
  });

  it('logger llamado también en errores (paso 1: método incorrecto)', async () => {
    const logger = makeLogger();
    const deps = makeDeps({ logger });
    const req = makeRequest({ method: 'DELETE' });
    await createIncidentHttpHandler(req, deps);
    expect(logger.entries).toHaveLength(1);
    expect(logger.entries[0].http_status).toBe(405);
  });
});

// ─── Suite 11 — Invariantes de seguridad ──────────────────────────────────────

describe('SI-P3B2B1 — Invariantes de seguridad', () => {
  it('response de error no incluye stack trace', async () => {
    const callerAuth = makeAuthPort(AUTH_500);
    const deps = makeDeps({ callerAuth });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const bodyText = await resp.text();
    expect(bodyText).not.toContain('stack');
    expect(bodyText).not.toContain('Error:');
    expect(bodyText).not.toContain('at ');
  });

  it('response no contiene token ni credencial raw', async () => {
    const callerAuth = makeAuthPort(AUTH_401);
    const deps = makeDeps({ callerAuth });
    const req = makeRequest({ headers: { Authorization: 'Bearer super-secret-token-xyz' } });
    const resp = await createIncidentHttpHandler(req, deps);
    const bodyText = await resp.text();
    expect(bodyText).not.toContain('super-secret-token-xyz');
    expect(bodyText).not.toContain('Bearer');
  });

  it('response de error no incluye body del request', async () => {
    const callerAuth = makeAuthPort(AUTH_401);
    const deps = makeDeps({ callerAuth });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const bodyText = await resp.text();
    expect(bodyText).not.toContain('Fuga de agua');
    expect(bodyText).not.toContain('idempotency_key');
  });

  it('OPTIONS no devuelve CORS headers', async () => {
    const deps = makeDeps();
    const req = makeRequest({ method: 'OPTIONS' });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(resp.headers.get('Access-Control-Allow-Methods')).toBeNull();
    expect(resp.headers.get('Access-Control-Allow-Headers')).toBeNull();
  });

  it('éxito no incluye Access-Control-Allow-Origin', async () => {
    const deps = makeDeps();
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('response de error incluye ok=false', async () => {
    const callerAuth = makeAuthPort(AUTH_401);
    const deps = makeDeps({ callerAuth });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(body.ok).toBe(false);
  });

  it('handler es puro: sin efecto secundario en deps no llamados', async () => {
    // useCase NO debe ser llamado si auth falla; verificamos que no mutó estado.
    const callerAuth = makeAuthPort(AUTH_403);
    const useCase = makeUseCase();
    const deps = makeDeps({ callerAuth, useCase });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    expect(useCase.calls).toHaveLength(0);
  });
});

// ─── Suite 12 — Success schema exacto ─────────────────────────────────────────
//
// El body de éxito es CreateIncidentResultV1 directo, sin wrapper { ok, data }.
// Verifica keys exactas y ausencia de campos no contractuales.

describe('SI-P3B2B1 — Success schema: keys exactas y ausencia de wrapper', () => {
  const EXPECTED_CREATION_KEYS = new Set([
    'contract_version', 'request_id', 'correlation_id',
    'incident_id', 'incident_reference', 'status', 'created_at', 'idempotent_replay',
  ]);

  it('primera creación → keys exactas del contrato (CreateIncidentResultV1)', async () => {
    const deps = makeDeps();
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    const keys = new Set(Object.keys(body));
    expect(keys).toEqual(EXPECTED_CREATION_KEYS);
  });

  it('replay → keys exactas del contrato (CreateIncidentResultV1)', async () => {
    const useCase = makeUseCase(REPLAY_SUCCESS);
    const deps = makeDeps({ useCase });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    const keys = new Set(Object.keys(body));
    expect(keys).toEqual(EXPECTED_CREATION_KEYS);
  });

  it('primera creación → body NO contiene "ok"', async () => {
    const deps = makeDeps();
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(body).not.toHaveProperty('ok');
  });

  it('primera creación → body NO contiene "data"', async () => {
    const deps = makeDeps();
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(body).not.toHaveProperty('data');
  });

  it('replay → body NO contiene "ok"', async () => {
    const useCase = makeUseCase(REPLAY_SUCCESS);
    const deps = makeDeps({ useCase });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(body).not.toHaveProperty('ok');
  });

  it('replay → body NO contiene "data"', async () => {
    const useCase = makeUseCase(REPLAY_SUCCESS);
    const deps = makeDeps({ useCase });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(body).not.toHaveProperty('data');
  });

  it('primera creación → HTTP 201', async () => {
    const deps = makeDeps();
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(201);
  });

  it('replay → HTTP 200', async () => {
    const useCase = makeUseCase(REPLAY_SUCCESS);
    const deps = makeDeps({ useCase });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(200);
  });

  it('primera creación → body.status = "new"', async () => {
    const deps = makeDeps();
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(body.status).toBe('new');
  });

  it('replay → body.idempotent_replay = true y datos originales estables', async () => {
    const useCase = makeUseCase(REPLAY_SUCCESS);
    const deps = makeDeps({ useCase });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(body.idempotent_replay).toBe(true);
    expect(body.incident_id).toBe(INCIDENT_ID);
    expect(body.created_at).toBe(CREATED_AT);
  });

  it('replay → request_id y correlation_id son de la invocación actual', async () => {
    const useCase = makeUseCase(REPLAY_SUCCESS);
    const deps = makeDeps({ useCase });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(body.request_id).toBe(REQ_ID);
    expect(body.correlation_id).toBe(CORR_ID);
  });
});

// ─── Suite 13 — Content-Type estricto ─────────────────────────────────────────
//
// isJsonContentType usa split(';')[0].trim().toLowerCase() === 'application/json'.
// Previene falsos positivos por substrings, superstrings y parámetros mal posicionados.

describe('SI-P3B2B1 — Content-Type: validación estricta del media type', () => {
  it('Application/JSON (casing diferente) → aceptado', async () => {
    const deps = makeDeps();
    const req = makeRequest({ headers: { 'Content-Type': 'Application/JSON' } });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).not.toBe(400);
  });

  it('APPLICATION/JSON ; CHARSET=UTF-8 → aceptado', async () => {
    const deps = makeDeps();
    const req = makeRequest({ headers: { 'Content-Type': 'APPLICATION/JSON ; CHARSET=UTF-8' } });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).not.toBe(400);
  });

  it('application/json-malicious → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    const req = makeRequest({ headers: { 'Content-Type': 'application/json-malicious' } });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('application/json-malicious → use case no invocado', async () => {
    const useCase = makeUseCase();
    const deps = makeDeps({ useCase });
    const req = makeRequest({ headers: { 'Content-Type': 'application/json-malicious' } });
    await createIncidentHttpHandler(req, deps);
    expect(useCase.calls).toHaveLength(0);
  });

  it('text/plain; description=application/json → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    const req = makeRequest({ headers: { 'Content-Type': 'text/plain; description=application/json' } });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('multipart/form-data; name=application/json → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    const req = makeRequest({ headers: { 'Content-Type': 'multipart/form-data; name=application/json' } });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('application/ld+json → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    const req = makeRequest({ headers: { 'Content-Type': 'application/ld+json' } });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('application/* → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    const req = makeRequest({ headers: { 'Content-Type': 'application/*' } });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('Content-Type vacío string → 400 VALIDATION_ERROR', async () => {
    const deps = makeDeps();
    const req = makeRequest({ headers: { 'Content-Type': '' } });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('todos los Content-Type inválidos → callerAuth no invocado', async () => {
    const invalidTypes = [
      'application/json-malicious',
      'text/plain; description=application/json',
      'multipart/form-data; name=application/json',
      'application/ld+json',
      '',
    ];
    for (const ct of invalidTypes) {
      const callerAuth = makeAuthPort();
      const deps = makeDeps({ callerAuth });
      const req = makeRequest({ headers: { 'Content-Type': ct } });
      await createIncidentHttpHandler(req, deps);
      expect(callerAuth.calls, `callerAuth no debe ser invocado para Content-Type: "${ct}"`).toHaveLength(0);
    }
  });
});

// ─── Suite 14 — Exception safety ──────────────────────────────────────────────

describe('SI-P3B2B1 — Exception safety', () => {
  it('callerAuth.authenticateAndAuthorize lanza → 500 INTERNAL_ERROR', async () => {
    const callerAuth: IncidentCallerAuthPort & { calls: unknown[] } = {
      calls: [],
      async authenticateAndAuthorize() {
        throw new Error('Auth service down');
      },
    };
    const deps = makeDeps({ callerAuth });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(500);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('INTERNAL_ERROR');
  });

  it('useCase.execute lanza → 500 INTERNAL_ERROR', async () => {
    const useCase: CreateIncidentProviderUseCase & { calls: unknown[] } = {
      calls: [],
      async execute() {
        throw new Error('Database connection lost');
      },
    };
    const deps = makeDeps({ useCase });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(500);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('INTERNAL_ERROR');
  });

  it('excepción de auth → body no contiene stack', async () => {
    const callerAuth: IncidentCallerAuthPort & { calls: unknown[] } = {
      calls: [],
      async authenticateAndAuthorize() {
        throw new Error('Stack: at authenticate (auth.ts:42)\n  at handler.ts:99');
      },
    };
    const deps = makeDeps({ callerAuth });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const bodyText = await resp.text();
    expect(bodyText).not.toContain('Stack:');
    expect(bodyText).not.toContain('at authenticate');
    expect(bodyText).not.toContain('auth.ts');
  });

  it('excepción de auth → body no contiene mensaje raw de la excepción', async () => {
    const callerAuth: IncidentCallerAuthPort & { calls: unknown[] } = {
      calls: [],
      async authenticateAndAuthorize() {
        throw new Error('DB_CREDENTIALS_EXPOSED_SECRET_xyz987');
      },
    };
    const deps = makeDeps({ callerAuth });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const bodyText = await resp.text();
    expect(bodyText).not.toContain('DB_CREDENTIALS_EXPOSED_SECRET_xyz987');
  });

  it('excepción de useCase → body no contiene stack ni payload', async () => {
    const useCase: CreateIncidentProviderUseCase & { calls: unknown[] } = {
      calls: [],
      async execute() {
        throw new Error('QUERY_FAILED: SELECT * FROM incidents WHERE key=xyz');
      },
    };
    const deps = makeDeps({ useCase });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const bodyText = await resp.text();
    expect(bodyText).not.toContain('QUERY_FAILED');
    expect(bodyText).not.toContain('SELECT');
  });

  it('logger.log lanza → response principal se conserva (HTTP 201 intacto)', async () => {
    const throwingLogger: IncidentProviderLogger & { entries: IncidentProviderLogEntry[] } = {
      entries: [],
      log() {
        throw new Error('Logger unavailable');
      },
    };
    const deps = makeDeps({ logger: throwingLogger });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(201);
  });

  it('logger.log lanza → excepción del logger no aparece en el body de la respuesta', async () => {
    const throwingLogger: IncidentProviderLogger & { entries: IncidentProviderLogEntry[] } = {
      entries: [],
      log() {
        throw new Error('LOGGER_SECRET_INTERNAL_CRASH');
      },
    };
    const deps = makeDeps({ logger: throwingLogger });
    const req = makeRequest();
    const resp = await createIncidentHttpHandler(req, deps);
    const bodyText = await resp.text();
    expect(bodyText).not.toContain('LOGGER_SECRET_INTERNAL_CRASH');
  });
});

// ─── Suite 15 — Orden del pipeline ────────────────────────────────────────────

describe('SI-P3B2B1 — Orden del pipeline (antes/después)', () => {
  it('auth ocurre ANTES del validator: si auth falla, use case no invocado', async () => {
    const callerAuth = makeAuthPort(AUTH_403);
    const useCase = makeUseCase();
    const deps = makeDeps({ callerAuth, useCase });
    const req = makeRequest();
    await createIncidentHttpHandler(req, deps);
    expect(callerAuth.calls).toHaveLength(1);
    expect(useCase.calls).toHaveLength(0);
  });

  it('validator no se ejecuta si auth falla → response es 401, no error del validator', async () => {
    const callerAuth = makeAuthPort(AUTH_401);
    const useCase = makeUseCase();
    const deps = makeDeps({ callerAuth, useCase });
    // Body intencionalmente inválido — si el validator corriera, daría UNSUPPORTED_CONTRACT_VERSION.
    const req = makeRequest({ body: JSON.stringify({ ...VALID_BODY, contract_version: '99.0' }) });
    const resp = await createIncidentHttpHandler(req, deps);
    // Debe ser 401 (auth), no 400 (validator).
    expect(resp.status).toBe(401);
  });

  it('consistencia de headers (paso 10) no se ejecuta antes del validator (paso 9)', async () => {
    const deps = makeDeps();
    const req = makeRequest({
      body: JSON.stringify({ ...VALID_BODY, contract_version: '99.0' }),
      headers: { 'X-Source': 'wrong_source' },
    });
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    // La respuesta es del validator (UNSUPPORTED_CONTRACT_VERSION), no del paso 10.
    expect(body.error_code).toBe('UNSUPPORTED_CONTRACT_VERSION');
  });

  it('use case no se ejecuta ante fallo en paso 10 (inconsistencia Idempotency-Key)', async () => {
    const useCase = makeUseCase();
    const deps = makeDeps({ useCase });
    const req = makeRequest({
      headers: { 'Idempotency-Key': 'wrong-key-inconsistent-with-body' },
    });
    await createIncidentHttpHandler(req, deps);
    expect(useCase.calls).toHaveLength(0);
  });
});

// ─── Suite 16 — Límites de body ────────────────────────────────────────────────

describe('SI-P3B2B1 — Límites: Content-Length y bytes reales', () => {
  it('Content-Length > 65536 → 400 VALIDATION_ERROR (paso 3)', async () => {
    const deps = makeDeps();
    const req = makeRequest({ headers: { 'Content-Length': '65537' } });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('Content-Length > 65536 → callerAuth no invocado', async () => {
    const callerAuth = makeAuthPort();
    const deps = makeDeps({ callerAuth });
    const req = makeRequest({ headers: { 'Content-Length': '100000' } });
    await createIncidentHttpHandler(req, deps);
    expect(callerAuth.calls).toHaveLength(0);
  });

  it('body real 65537 bytes → 400 VALIDATION_ERROR (paso 4)', async () => {
    const deps = makeDeps();
    // {"x":"aaa...aaa"} = 8 + N bytes. Para 65537: N = 65529.
    const body65537 = JSON.stringify({ x: 'a'.repeat(65529) });
    expect(new TextEncoder().encode(body65537).length).toBe(65537);
    const req = makeRequest({ body: body65537 });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });

  it('body real 65536 bytes → NO rechazado por límite (callerAuth invocado)', async () => {
    const callerAuth = makeAuthPort(AUTH_OK);
    const deps = makeDeps({ callerAuth });
    // {"x":"aaa...aaa"} = 8 + N bytes. Para 65536: N = 65528.
    const body65536 = JSON.stringify({ x: 'a'.repeat(65528) });
    expect(new TextEncoder().encode(body65536).length).toBe(65536);
    const req = makeRequest({ body: body65536 });
    await createIncidentHttpHandler(req, deps);
    // Si callerAuth fue llamado, los pasos 3 y 4 no bloquearon (65536 ≤ 65536).
    expect(callerAuth.calls.length).toBeGreaterThan(0);
  });

  it('Content-Length falsamente pequeño con body real > 65536 → 400 (paso 4 detecta)', async () => {
    const deps = makeDeps();
    // Content-Length dice 100 (paso 3 no rechaza), pero el body real supera 65536.
    const oversized = JSON.stringify({ x: 'a'.repeat(65529) }); // 65537 bytes
    expect(new TextEncoder().encode(oversized).length).toBe(65537);
    const req = makeRequest({
      headers: { 'Content-Length': '100' },
      body: oversized,
    });
    const resp = await createIncidentHttpHandler(req, deps);
    expect(resp.status).toBe(400);
    const body = await parseBody(resp);
    expect(body.error_code).toBe('VALIDATION_ERROR');
  });
});

// ─── Suite 17 — generateSafeTraceId: generación segura de trace IDs ───────────
//
// Verifica que el handler genera trace IDs seguros:
//   - Usa el UUID del generador inyectable si es válido (string + regex UUID).
//   - Cae a crypto.randomUUID() si el generador devuelve no-UUID o lanza excepción.
//   - Genera request_id y correlation_id con dos llamadas independientes.
//   - El fallo del generador nunca produce INTERNAL_ERROR ni se filtra al cliente.
//   - La constante FALLBACK_TRACE_ID no existe en el módulo (test estructural).

describe('SI-P3B2B1 — generateSafeTraceId: generación segura de trace IDs', () => {
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

  // Request que falla en paso 2 (Content-Type inválido).
  // El body nunca se lee → paso 6 no extrae trace IDs del body.
  // Los IDs en la respuesta son puramente los generados por generateSafeTraceId.
  function makeStep2FailRequest(): Request {
    return makeRequest({ headers: { 'Content-Type': 'text/plain' } });
  }

  it('generateTraceId devuelve UUID válido → se utiliza en la respuesta', async () => {
    const FIXED_UUID = 'deadbeef-cafe-4000-8000-123456789abc';
    const deps = makeDeps({ generateTraceId: () => FIXED_UUID });
    const resp = await createIncidentHttpHandler(makeStep2FailRequest(), deps);
    const body = await parseBody(resp);
    expect(body.request_id).toBe(FIXED_UUID);
  });

  it('generateTraceId devuelve string inválido → se utiliza fallback criptográfico', async () => {
    const deps = makeDeps({ generateTraceId: () => 'not-a-uuid-at-all' });
    const resp = await createIncidentHttpHandler(makeStep2FailRequest(), deps);
    const body = await parseBody(resp);
    expect(body.request_id).not.toBe('not-a-uuid-at-all');
    expect(UUID_PATTERN.test(body.request_id as string)).toBe(true);
  });

  it('generateTraceId devuelve string vacío → se utiliza fallback criptográfico', async () => {
    const deps = makeDeps({ generateTraceId: () => '' });
    const resp = await createIncidentHttpHandler(makeStep2FailRequest(), deps);
    const body = await parseBody(resp);
    expect(body.request_id).not.toBe('');
    expect(UUID_PATTERN.test(body.request_id as string)).toBe(true);
  });

  it('generateTraceId lanza excepción → fallback criptográfico continúa sin error', async () => {
    const throwingGenerator = (): string => { throw new Error('Generator unavailable'); };
    const deps = makeDeps({ generateTraceId: throwingGenerator });
    const resp = await createIncidentHttpHandler(makeStep2FailRequest(), deps);
    const body = await parseBody(resp);
    expect(UUID_PATTERN.test(body.request_id as string)).toBe(true);
  });

  it('IDs de fallback cumplen el formato UUID', async () => {
    const throwingGenerator = (): string => { throw new Error('crash'); };
    const deps = makeDeps({ generateTraceId: throwingGenerator });
    const resp = await createIncidentHttpHandler(makeStep2FailRequest(), deps);
    const body = await parseBody(resp);
    expect(UUID_PATTERN.test(body.request_id as string)).toBe(true);
    expect(UUID_PATTERN.test(body.correlation_id as string)).toBe(true);
  });

  it('IDs de fallback no son el UUID cero', async () => {
    const throwingGenerator = (): string => { throw new Error('crash'); };
    const deps = makeDeps({ generateTraceId: throwingGenerator });
    const resp = await createIncidentHttpHandler(makeStep2FailRequest(), deps);
    const body = await parseBody(resp);
    expect(body.request_id).not.toBe(ZERO_UUID);
    expect(body.correlation_id).not.toBe(ZERO_UUID);
  });

  it('request_id y correlation_id se generan con dos llamadas independientes', async () => {
    let callCount = 0;
    const countingGenerator = (): string => {
      const n = ++callCount;
      const hex = n.toString(16).padStart(8, '0');
      return `${hex}-0000-4000-8000-000000000000`;
    };
    const deps = makeDeps({ generateTraceId: countingGenerator });
    await createIncidentHttpHandler(makeStep2FailRequest(), deps);
    expect(callCount).toBe(2);
  });

  it('cuando ambos IDs se generan server-side, son distintos entre sí', async () => {
    let n = 0;
    const altGenerator = (): string => n++ === 0
      ? 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      : 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const deps = makeDeps({ generateTraceId: altGenerator });
    const resp = await createIncidentHttpHandler(makeStep2FailRequest(), deps);
    const body = await parseBody(resp);
    expect(body.request_id).not.toBe(body.correlation_id);
  });

  it('UUID válido del body se conserva como trace ID (paso 6)', async () => {
    const BODY_UUID = '99999999-9999-4999-8999-999999999999';
    const callerAuth = makeAuthPort(AUTH_401);
    const deps = makeDeps({ callerAuth });
    // paso 6 extrae request_id del body si es UUID válido; auth falla → error con ese UUID.
    const req = makeRequest({ body: JSON.stringify({ ...VALID_BODY, request_id: BODY_UUID }) });
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(body.request_id).toBe(BODY_UUID);
  });

  it('string inválido del body no se refleja como trace ID', async () => {
    const INVALID_ID = 'definitely-not-a-valid-uuid-string';
    const callerAuth = makeAuthPort(AUTH_401);
    const deps = makeDeps({ callerAuth });
    const req = makeRequest({ body: JSON.stringify({ ...VALID_BODY, request_id: INVALID_ID }) });
    const resp = await createIncidentHttpHandler(req, deps);
    const body = await parseBody(resp);
    expect(body.request_id).not.toBe(INVALID_ID);
    expect((body.request_id as string)).not.toContain('definitely');
  });

  it('logger y respuesta reciben los mismos IDs de trazabilidad', async () => {
    const logger = makeLogger();
    const deps = makeDeps({ logger });
    const resp = await createIncidentHttpHandler(makeStep2FailRequest(), deps);
    const body = await parseBody(resp);
    expect(logger.entries).toHaveLength(1);
    expect(logger.entries[0].request_id).toBe(body.request_id);
    expect(logger.entries[0].correlation_id).toBe(body.correlation_id);
  });

  it('la excepción del generador no aparece en body ni en log', async () => {
    const SECRET_MSG = 'GENERATOR_SECRET_INTERNAL_ERROR_TOKEN_ZXQ9';
    const throwingGenerator = (): string => { throw new Error(SECRET_MSG); };
    const logger = makeLogger();
    const deps = makeDeps({ generateTraceId: throwingGenerator, logger });
    const resp = await createIncidentHttpHandler(makeStep2FailRequest(), deps);
    const bodyText = await resp.text();
    expect(bodyText).not.toContain(SECRET_MSG);
    expect(JSON.stringify(logger.entries)).not.toContain(SECRET_MSG);
  });

  it('fallo del generador no altera el status principal de la respuesta', async () => {
    const throwingGenerator = (): string => { throw new Error('Generator down'); };
    const callerAuth = makeAuthPort(AUTH_401);
    const deps = makeDeps({ generateTraceId: throwingGenerator, callerAuth });
    // Auth falla → 401. El fallo del generador usa crypto.randomUUID(); no produce 500.
    const resp = await createIncidentHttpHandler(makeRequest(), deps);
    expect(resp.status).toBe(401);
  });

  it('no existe FALLBACK_TRACE_ID constante en el módulo (test estructural)', () => {
    const handlerSource = readFileSync(
      join(process.cwd(), 'supabase', 'functions', '_shared', 'smart-incidents', 'http-handler.ts'),
      'utf-8',
    );
    expect(handlerSource).not.toContain('FALLBACK_TRACE_ID');
    expect(handlerSource).not.toContain('00000000-0000-0000-0000-000000000000');
  });
});
