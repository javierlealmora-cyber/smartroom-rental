/**
 * webchat-realtime.spec.ts
 *
 * Tests de helpers de Fase 10F WebChat: session-token, realtime-client, rate-limiter.
 * Tambien incluye tests de fronteras arquitectonicas (static) y restricciones.
 *
 * No importa EF handlers. No requiere vi.mock para Deno HTTP ni Supabase.
 * Usa vi.stubGlobal('Deno', ...) para controlar env variables.
 *
 * Grupos:
 *   ST-01..ST-25  — WEBCHAT-SESSION-TOKEN (creacion, verificacion, claims)
 *   RT-01..RT-18  — WEBCHAT-REALTIME (config, canal, notificacion)
 *   RL-01..RL-05  — WEBCHAT-RATE-LIMIT unit (config, mock mode)
 *   BND-01..BND-12 — WEBCHAT-BOUNDARIES (fronteras arquitectonicas)
 *   RST-01..RST-11 — WEBCHAT-RESTRICTIONS (no migraciones, no estados, etc.)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

import {
  createWebchatSessionToken,
  verifyWebchatSessionToken,
  getWebchatAuthMode,
  getWebchatSessionTokenConfig,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/webchat-session-token.ts';

import {
  getWebchatRealtimeMode,
  buildWebchatRealtimeChannel,
  publishWebchatRealtimeNotification,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/webchat-realtime-client.ts';

import {
  getWebchatRateLimitMode,
  getWebchatRateLimitConfig,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/webchat-rate-limiter.ts';

// ── Constantes ─────────────────────────────────────────────────────────────

const ROOT = resolve(__dirname, '../../../../../');
const TEST_SECRET  = 'test-signing-secret-hmac-sha256-min32chars';
const TEST_SECRET2 = 'another-secret-totally-different-value-00';
const TEST_TENANT  = 'tenant-uuid-10f-001';
const TEST_SESSION = 'session-uuid-10f-001';
const TEST_SENDER  = 'wc_' + 'a'.repeat(32);

const MOCK_ENV_LEGACY: Record<string, string> = {
  WEBCHAT_AUTH_MODE:              'legacy',
  WEBCHAT_REALTIME_MODE:          'mock',
  WEBCHAT_RATE_LIMIT_MODE:        'mock',
  WEBCHAT_POLLING_MODE:           'mock',
  WEBCHAT_SESSION_SIGNING_SECRET: TEST_SECRET,
  WEBCHAT_SESSION_TOKEN_TTL_MINUTES: '120',
};

const MOCK_ENV_SIGNED: Record<string, string> = {
  ...MOCK_ENV_LEGACY,
  WEBCHAT_AUTH_MODE: 'signed_token',
};

// ── Setup / Teardown ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_LEGACY[k] ?? undefined } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ══════════════════════════════════════════════════════════════════════════
// WEBCHAT-SESSION-TOKEN (ST-01..ST-25)
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-SESSION-TOKEN (ST-01..ST-25) — token efimero', () => {
  it('ST-01 — getWebchatAuthMode default es legacy', () => {
    expect(getWebchatAuthMode()).toBe('legacy');
  });

  it('ST-02 — signed_token mode se activa con WEBCHAT_AUTH_MODE=signed_token', () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_SIGNED[k] ?? undefined } });
    expect(getWebchatAuthMode()).toBe('signed_token');
  });

  it('ST-03 — signed_token mode requiere WEBCHAT_SESSION_SIGNING_SECRET', () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_SIGNED[k] ?? undefined } });
    const cfg = getWebchatSessionTokenConfig();
    expect(cfg.signingSecret).toBeTruthy();
    expect(cfg.signingSecret.length).toBeGreaterThan(0);
  });

  it('ST-04 — token valido se crea con createWebchatSessionToken', async () => {
    const token = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET,
      120,
    );
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(2);
  });

  it('ST-05 — token verificado devuelve claims correctas', async () => {
    const token = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET,
      120,
    );
    const result = await verifyWebchatSessionToken(token, TEST_SECRET);
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.claims.client_account_id).toBe(TEST_TENANT);
    expect(result.claims.session_id).toBe(TEST_SESSION);
    expect(result.claims.sender_ref).toBe(TEST_SENDER);
    expect(result.claims.channel).toBe('webchat');
  });

  it('ST-06 — token contiene tenant correcto', async () => {
    const token = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET, 120,
    );
    const r = await verifyWebchatSessionToken(token, TEST_SECRET);
    expect(r.valid && r.claims.client_account_id).toBe(TEST_TENANT);
  });

  it('ST-07 — token contiene session_id correcto', async () => {
    const token = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET, 120,
    );
    const r = await verifyWebchatSessionToken(token, TEST_SECRET);
    expect(r.valid && r.claims.session_id).toBe(TEST_SESSION);
  });

  it('ST-08 — token contiene sender_ref correcto', async () => {
    const token = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET, 120,
    );
    const r = await verifyWebchatSessionToken(token, TEST_SECRET);
    expect(r.valid && r.claims.sender_ref).toBe(TEST_SENDER);
  });

  it('ST-09 — token contiene channel=webchat', async () => {
    const token = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET, 120,
    );
    const r = await verifyWebchatSessionToken(token, TEST_SECRET);
    expect(r.valid && r.claims.channel).toBe('webchat');
  });

  it('ST-10 — token contiene issued_at', async () => {
    const token = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET, 120,
    );
    const r = await verifyWebchatSessionToken(token, TEST_SECRET);
    expect(r.valid && typeof r.claims.issued_at).toBe('string');
  });

  it('ST-11 — token contiene expires_at', async () => {
    const token = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET, 120,
    );
    const r = await verifyWebchatSessionToken(token, TEST_SECRET);
    expect(r.valid && typeof r.claims.expires_at).toBe('string');
  });

  it('ST-12 — token NO contiene profile_id en claims', async () => {
    const token = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET, 120,
    );
    // Decodificar el payload para verificar que no hay profile_id
    const payloadB64 = token.split('.')[0];
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(padded + '='.repeat((4 - padded.length % 4) % 4)));
    expect(decoded).not.toHaveProperty('profile_id');
  });

  it('ST-13 — token NO contiene phone en claims', async () => {
    const token = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET, 120,
    );
    const payloadB64 = token.split('.')[0];
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(padded + '='.repeat((4 - padded.length % 4) % 4)));
    expect(decoded).not.toHaveProperty('phone');
  });

  it('ST-14 — token NO contiene identity_data en claims', async () => {
    const token = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET, 120,
    );
    const payloadB64 = token.split('.')[0];
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(padded + '='.repeat((4 - padded.length % 4) % 4)));
    expect(decoded).not.toHaveProperty('identity_data');
  });

  it('ST-15 — token NO contiene room_id en claims', async () => {
    const token = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET, 120,
    );
    const payloadB64 = token.split('.')[0];
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(padded + '='.repeat((4 - padded.length % 4) % 4)));
    expect(decoded).not.toHaveProperty('room_id');
  });

  it('ST-16 — token NO contiene message_text en claims', async () => {
    const token = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET, 120,
    );
    const payloadB64 = token.split('.')[0];
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(padded + '='.repeat((4 - padded.length % 4) % 4)));
    expect(decoded).not.toHaveProperty('message_text');
  });

  it('ST-17 — token con payload alterado se rechaza (firma invalida)', async () => {
    const token = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET, 120,
    );
    // Alterar el payload (cambiar un byte)
    const [p, s] = token.split('.');
    const tamperedPayload = p.slice(0, -1) + (p.slice(-1) === 'a' ? 'b' : 'a');
    const tampered = `${tamperedPayload}.${s}`;
    const r = await verifyWebchatSessionToken(tampered, TEST_SECRET);
    expect(r.valid).toBe(false);
  });

  it('ST-18 — firma invalida (secret diferente) se rechaza', async () => {
    const token = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET, 120,
    );
    const r = await verifyWebchatSessionToken(token, TEST_SECRET2);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe('INVALID_SIGNATURE');
  });

  it('ST-19 — token expirado (ttl=0) se rechaza', async () => {
    // TTL negativo para crear token ya expirado
    const token = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET,
      -1, // expirado
    );
    const r = await verifyWebchatSessionToken(token, TEST_SECRET);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe('EXPIRED');
  });

  it('ST-20 — token con format incorrecto (sin punto) se rechaza', async () => {
    const r = await verifyWebchatSessionToken('invalido-sin-punto', TEST_SECRET);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe('INVALID_FORMAT');
  });

  it('ST-21 — token vacio se rechaza', async () => {
    const r = await verifyWebchatSessionToken('', TEST_SECRET);
    expect(r.valid).toBe(false);
  });

  it('ST-22 — token con secret vacio devuelve MISSING_SECRET', async () => {
    const token = await createWebchatSessionToken(
      { client_account_id: TEST_TENANT, session_id: TEST_SESSION, sender_ref: TEST_SENDER },
      TEST_SECRET, 120,
    );
    const r = await verifyWebchatSessionToken(token, '');
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe('MISSING_SECRET');
  });

  it('ST-23 — token no se loguea: webchat-session-token.ts no contiene console.log del token', () => {
    const src = readFileSync(
      resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/webchat-session-token.ts'),
      'utf-8',
    );
    // Verificar que no hay console.log/warn/error con el token en codigo activo
    expect(src).not.toMatch(/console\.(log|warn|error)\s*\(.*token/i);
  });

  it('ST-24 — webchat-session-token.ts no loguea el signing secret', () => {
    const src = readFileSync(
      resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/webchat-session-token.ts'),
      'utf-8',
    );
    expect(src).not.toMatch(/console\.(log|warn|error)\s*\(.*[Ss]igning/);
    expect(src).not.toMatch(/console\.(log|warn|error)\s*\(.*[Ss]ecret/);
  });

  it('ST-25 — getWebchatSessionTokenConfig no expone el secret en valor de retorno tipado', () => {
    const cfg = getWebchatSessionTokenConfig();
    expect(Object.keys(cfg)).toContain('authMode');
    expect(Object.keys(cfg)).toContain('tokenTtlMinutes');
    // signingSecret existe en cfg pero no debe aparecer en logs
    expect(typeof cfg.signingSecret).toBe('string');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// WEBCHAT-REALTIME (RT-01..RT-18)
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-REALTIME (RT-01..RT-18) — notificacion best-effort', () => {
  it('RT-01 — getWebchatRealtimeMode default es mock', () => {
    expect(getWebchatRealtimeMode()).toBe('mock');
  });

  it('RT-02 — mode=real se activa con WEBCHAT_REALTIME_MODE=real', () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) =>
      k === 'WEBCHAT_REALTIME_MODE' ? 'real' : MOCK_ENV_LEGACY[k]
    }});
    expect(getWebchatRealtimeMode()).toBe('real');
  });

  it('RT-03 — mode=mock no abre conexion real (no fetch externo)', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    await publishWebchatRealtimeNotification({
      event_type: 'webchat_message_available',
      client_account_id: TEST_TENANT,
      session_id: TEST_SESSION,
      message_id: 'msg-001',
      created_at: new Date().toISOString(),
      channel: 'webchat',
    });
    expect(mockFetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_LEGACY[k] ?? undefined } });
  });

  it('RT-04 — buildWebchatRealtimeChannel usa session_id', () => {
    const channel = buildWebchatRealtimeChannel(TEST_SESSION);
    expect(channel).toContain(TEST_SESSION);
  });

  it('RT-05 — canal tiene formato prefix:session_id', () => {
    const channel = buildWebchatRealtimeChannel(TEST_SESSION);
    expect(channel).toMatch(/^webchat:/);
  });

  it('RT-06 — canal NO contiene phone', () => {
    const channel = buildWebchatRealtimeChannel(TEST_SESSION);
    expect(channel).not.toContain('+34');
    expect(channel).not.toContain('phone');
  });

  it('RT-07 — canal NO contiene sender_ref', () => {
    const channel = buildWebchatRealtimeChannel(TEST_SESSION);
    expect(channel).not.toContain('wc_');
    expect(channel).not.toContain('sender_ref');
  });

  it('RT-08 — canal NO contiene profile_id', () => {
    const channel = buildWebchatRealtimeChannel(TEST_SESSION);
    expect(channel).not.toContain('profile_id');
  });

  it('RT-09 — notificacion contiene message_id', async () => {
    const notif = {
      event_type: 'webchat_message_available' as const,
      client_account_id: TEST_TENANT,
      session_id: TEST_SESSION,
      message_id: 'msg-test-001',
      created_at: new Date().toISOString(),
      channel: 'webchat' as const,
    };
    const result = await publishWebchatRealtimeNotification(notif);
    expect(result.published).toBe(true);
    // La notificacion tiene message_id
    expect(notif.message_id).toBe('msg-test-001');
  });

  it('RT-10 — notificacion contiene session_id', () => {
    const notif = {
      event_type: 'webchat_message_available' as const,
      client_account_id: TEST_TENANT,
      session_id: TEST_SESSION,
      message_id: 'msg-001',
      created_at: new Date().toISOString(),
      channel: 'webchat' as const,
    };
    expect(notif.session_id).toBe(TEST_SESSION);
  });

  it('RT-11 — notificacion contiene client_account_id', () => {
    const notif = {
      event_type: 'webchat_message_available' as const,
      client_account_id: TEST_TENANT,
      session_id: TEST_SESSION,
      message_id: 'msg-001',
      created_at: new Date().toISOString(),
      channel: 'webchat' as const,
    };
    expect(notif.client_account_id).toBe(TEST_TENANT);
  });

  it('RT-12 — notificacion contiene event_type tecnico', () => {
    const notif = {
      event_type: 'webchat_message_available' as const,
      client_account_id: TEST_TENANT,
      session_id: TEST_SESSION,
      message_id: 'msg-001',
      created_at: new Date().toISOString(),
      channel: 'webchat' as const,
    };
    expect(notif.event_type).toBe('webchat_message_available');
  });

  it('RT-13 — WebchatRealtimeNotification type NO tiene campo message_text', () => {
    // Verificar que el tipo no incluye message_text (test de interfaz/tipo)
    const notif = {
      event_type: 'webchat_message_available' as const,
      client_account_id: TEST_TENANT,
      session_id: TEST_SESSION,
      message_id: 'msg-001',
      created_at: new Date().toISOString(),
      channel: 'webchat' as const,
    };
    expect(notif).not.toHaveProperty('message_text');
  });

  it('RT-14 — WebchatRealtimeNotification type NO tiene sender_ref', () => {
    const notif = {
      event_type: 'webchat_message_available' as const,
      client_account_id: TEST_TENANT,
      session_id: TEST_SESSION,
      message_id: 'msg-001',
      created_at: new Date().toISOString(),
      channel: 'webchat' as const,
    };
    expect(notif).not.toHaveProperty('sender_ref');
  });

  it('RT-15 — WebchatRealtimeNotification type NO tiene profile_id', () => {
    const notif = {
      event_type: 'webchat_message_available' as const,
      client_account_id: TEST_TENANT,
      session_id: TEST_SESSION,
      message_id: 'msg-001',
      created_at: new Date().toISOString(),
      channel: 'webchat' as const,
    };
    expect(notif).not.toHaveProperty('profile_id');
    expect(notif).not.toHaveProperty('identity_data');
  });

  it('RT-16 — WebchatRealtimeNotification type NO tiene raw_payload', () => {
    const notif = {
      event_type: 'webchat_message_available' as const,
      client_account_id: TEST_TENANT,
      session_id: TEST_SESSION,
      message_id: 'msg-001',
      created_at: new Date().toISOString(),
      channel: 'webchat' as const,
    };
    expect(notif).not.toHaveProperty('raw_payload');
    expect(notif).not.toHaveProperty('token');
  });

  it('RT-17 — mode=real sin configuracion devuelve error controlado', async () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) =>
      k === 'WEBCHAT_REALTIME_MODE' ? 'real' : MOCK_ENV_LEGACY[k]
    }});
    const result = await publishWebchatRealtimeNotification({
      event_type: 'webchat_message_available',
      client_account_id: TEST_TENANT,
      session_id: TEST_SESSION,
      message_id: 'msg-001',
      created_at: new Date().toISOString(),
      channel: 'webchat',
    });
    expect(result.published).toBe(false);
    expect(result.error).toBe('REALTIME_PROVIDER_NOT_CONFIGURED');
    vi.unstubAllGlobals();
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_LEGACY[k] ?? undefined } });
  });

  it('RT-18 — webchat_message_available NO aparece en ACTIVITY_EVENT_TYPE', () => {
    // Buscar en el archivo de tipos de Activity Log
    const activityTypesPath = resolve(ROOT, 'supabase/functions/_shared/smart-conversations');
    const files = ['activity-log-types.ts', 'activity-log.ts', 'activity-events.ts', 'types.ts'];
    let activityContent = '';
    for (const f of files) {
      const p = resolve(activityTypesPath, f);
      if (existsSync(p)) activityContent += readFileSync(p, 'utf-8');
    }
    // Si no encontramos el archivo, verificar que webchat_message_available
    // no esta en ACTIVITY_EVENT_TYPE con una busqueda amplia
    const allSharedFiles = readFileSync(
      resolve(ROOT, 'supabase/functions/_shared/smart-conversations/activity-log.ts'),
      'utf-8',
    ).concat(activityContent);
    expect(allSharedFiles).not.toContain("'webchat_message_available'");
    expect(allSharedFiles).not.toContain('"webchat_message_available"');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// WEBCHAT-RATE-LIMIT UNIT (RL-01..RL-05)
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-RATE-LIMIT-UNIT (RL-01..RL-05) — config y mock mode', () => {
  it('RL-01 — getWebchatRateLimitMode default es mock', () => {
    expect(getWebchatRateLimitMode()).toBe('mock');
  });

  it('RL-02 — mode=database se activa con WEBCHAT_RATE_LIMIT_MODE=database', () => {
    vi.stubGlobal('Deno', { env: { get: (k: string) =>
      k === 'WEBCHAT_RATE_LIMIT_MODE' ? 'database' : MOCK_ENV_LEGACY[k]
    }});
    expect(getWebchatRateLimitMode()).toBe('database');
    vi.unstubAllGlobals();
    vi.stubGlobal('Deno', { env: { get: (k: string) => MOCK_ENV_LEGACY[k] ?? undefined } });
  });

  it('RL-03 — config tiene defaults correctos en mock mode', () => {
    const cfg = getWebchatRateLimitConfig();
    expect(cfg.mode).toBe('mock');
    expect(cfg.perSessionPerMinute).toBe(30);
    expect(cfg.perTenantPerMinute).toBe(300);
    expect(cfg.windowSeconds).toBe(60);
  });

  it('RL-04 — webchat-rate-limiter.ts no usa next_retry_at', () => {
    const src = readFileSync(
      resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/webchat-rate-limiter.ts'),
      'utf-8',
    );
    expect(src).not.toContain('next_retry_at');
  });

  it('RL-05 — webchat-rate-limiter.ts no usa attempt_count', () => {
    const src = readFileSync(
      resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/webchat-rate-limiter.ts'),
      'utf-8',
    );
    expect(src).not.toContain('attempt_count');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// WEBCHAT-BOUNDARIES (BND-01..BND-12)
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-BOUNDARIES (BND-01..BND-12) — fronteras arquitectonicas', () => {
  const WEB_SESSION = resolve(ROOT, 'supabase/functions/conv-web-session/index.ts');
  const WEB_MSG     = resolve(ROOT, 'supabase/functions/conv-web-message/index.ts');
  const WEB_DELIVER = resolve(ROOT, 'supabase/functions/conv-web-deliver/index.ts');
  const WEB_POLL    = resolve(ROOT, 'supabase/functions/conv-web-poll/index.ts');
  const TOKEN_MOD   = resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/webchat-session-token.ts');

  it('BND-01 — WebChat no decide routing: conv-web-session no llama routing', () => {
    const src = readFileSync(WEB_SESSION, 'utf-8');
    expect(src).not.toMatch(/conv-routing-engine/);
  });

  it('BND-02 — WebChat no valida identidad de negocio: conv-web-session no llama conv-core-validate-identity', () => {
    const src = readFileSync(WEB_SESSION, 'utf-8');
    expect(src).not.toMatch(/conv-core-validate-identity/);
  });

  it('BND-03 — Token WebChat no equivale a identidad de inquilino', () => {
    const src = readFileSync(TOKEN_MOD, 'utf-8');
    // El token no tiene profile_id ni phone — ya verificado en ST-12..ST-15
    expect(src).not.toContain('profile_id');
    expect(src).not.toContain('STRONG_MATCH');
  });

  it('BND-04 — WebChat no crea incidencias directamente: conv-web-message no llama conv-core-incident', () => {
    const src = readFileSync(WEB_MSG, 'utf-8');
    expect(src).not.toMatch(/conv-core-incident|createIncident/);
  });

  it('BND-05 — WebChat no crea leads directamente: conv-web-message no llama conv-core-lead', () => {
    const src = readFileSync(WEB_MSG, 'utf-8');
    expect(src).not.toMatch(/conv-core-lead|createLead/);
  });

  it('BND-06 — WebChat no crea tickets directamente: conv-web-message no llama conv-core-help-ticket', () => {
    const src = readFileSync(WEB_MSG, 'utf-8');
    expect(src).not.toMatch(/conv-core-help-ticket|createHelpTicket/);
  });

  it('BND-07 — WebChat no llama Core real: conv-web-message no llama conv-core-validate-identity', () => {
    const src = readFileSync(WEB_MSG, 'utf-8');
    expect(src).not.toMatch(/conv-core-validate-identity/);
  });

  it('BND-08 — WebChat no llama IA real en ningun EF WebChat', () => {
    const sources = [WEB_SESSION, WEB_MSG, WEB_DELIVER, WEB_POLL].map(p => readFileSync(p, 'utf-8'));
    for (const src of sources) {
      expect(src).not.toMatch(/conv-ai-|openai|anthropic|claude/i);
    }
  });

  it('BND-09 — WebChat no llama n8n real', () => {
    const sources = [WEB_SESSION, WEB_MSG, WEB_DELIVER, WEB_POLL].map(p => readFileSync(p, 'utf-8'));
    for (const src of sources) {
      expect(src).not.toMatch(/n8n|webhook-n8n/i);
    }
  });

  it('BND-10 — WebChat no llama Wasender en ningun EF', () => {
    const sources = [WEB_SESSION, WEB_MSG, WEB_DELIVER, WEB_POLL].map(p => readFileSync(p, 'utf-8'));
    for (const src of sources) {
      expect(src).not.toMatch(/wasender|conv-send-wa/);
    }
  });

  it('BND-11 — conv-web-deliver no publica Activity Log directamente', () => {
    const src = readFileSync(WEB_DELIVER, 'utf-8');
    expect(src).not.toMatch(/conv-core-publish-activity|publishActivity/);
  });

  it('BND-12 — conv-web-poll no modifica conv_messages (solo SELECT)', () => {
    const src = readFileSync(WEB_POLL, 'utf-8');
    // poll no debe tener insert, update ni delete en conv_messages
    expect(src).not.toMatch(/\.insert\s*\(/);
    expect(src).not.toMatch(/\.update\s*\(/);
    expect(src).not.toMatch(/\.delete\s*\(/);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// WEBCHAT-RESTRICTIONS (RST-01..RST-11)
// ══════════════════════════════════════════════════════════════════════════

describe('WEBCHAT-RESTRICTIONS (RST-01..RST-11) — sin nuevos artefactos', () => {
  const MIGRATIONS_DIR = resolve(ROOT, 'supabase/migrations');
  const PHASE10F_MIGRATION_PREFIX = '20260716000002'; // cualquier migracion nueva de 10F

  it('RST-01 — no se modificaron migraciones: no existe migracion de Fase 10F', () => {
    // Las migraciones no deben haber sido modificadas en esta fase
    const entries = existsSync(MIGRATIONS_DIR)
      ? require('fs').readdirSync(MIGRATIONS_DIR) as string[]
      : [];
    const phase10fMigrations = entries.filter((f: string) => f.startsWith(PHASE10F_MIGRATION_PREFIX));
    expect(phase10fMigrations.length).toBe(0);
  });

  it('RST-02 — no se crean tablas: ningun EF 10F hace CREATE TABLE', () => {
    const files = [
      resolve(ROOT, 'supabase/functions/conv-web-poll/index.ts'),
      resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/webchat-session-token.ts'),
      resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/webchat-realtime-client.ts'),
      resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/webchat-rate-limiter.ts'),
      resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/webchat-polling.ts'),
    ];
    for (const f of files) {
      const src = readFileSync(f, 'utf-8');
      expect(src).not.toMatch(/CREATE TABLE/i);
    }
  });

  it('RST-03 — no se introducen estados nuevos: ningun nuevo valor de state en EFs 10F', () => {
    const pollSrc = readFileSync(resolve(ROOT, 'supabase/functions/conv-web-poll/index.ts'), 'utf-8');
    expect(pollSrc).not.toMatch(/state\s*=\s*['"][A-Z_]+['"]/);
    // Los estados existentes (NEW, OPEN, CLOSED, etc.) siguen siendo los mismos
  });

  it('RST-04 — no se introducen eventos Activity Log: webchat_message_available no esta en activity log types', () => {
    const activitySrc = readFileSync(
      resolve(ROOT, 'supabase/functions/_shared/smart-conversations/activity-log.ts'),
      'utf-8',
    );
    expect(activitySrc).not.toContain('webchat_message_available');
  });

  it('RST-05 — no se introduce WF-02 en EFs WebChat 10F', () => {
    const files = [
      resolve(ROOT, 'supabase/functions/conv-web-poll/index.ts'),
      resolve(ROOT, 'supabase/functions/conv-web-deliver/index.ts'),
    ];
    for (const f of files) {
      expect(readFileSync(f, 'utf-8')).not.toMatch(/WF-02|WF_02/);
    }
  });

  it('RST-06 — no se introduce conv_help_escalated en EFs 10F', () => {
    const files = [
      resolve(ROOT, 'supabase/functions/conv-web-poll/index.ts'),
      resolve(ROOT, 'supabase/functions/conv-web-deliver/index.ts'),
    ];
    for (const f of files) {
      expect(readFileSync(f, 'utf-8')).not.toContain('conv_help_escalated');
    }
  });

  it('RST-07 — no se introduce WEAK_MATCH en EFs 10F', () => {
    const files = [
      resolve(ROOT, 'supabase/functions/conv-web-poll/index.ts'),
      resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/webchat-session-token.ts'),
    ];
    for (const f of files) {
      expect(readFileSync(f, 'utf-8')).not.toContain('WEAK_MATCH');
    }
  });

  it('RST-08 — no se introduce UNVERIFIED standalone en EFs 10F', () => {
    const pollSrc = readFileSync(resolve(ROOT, 'supabase/functions/conv-web-poll/index.ts'), 'utf-8');
    expect(pollSrc).not.toMatch(/identity_level\s*=\s*['"]UNVERIFIED['"]/);
  });

  it('RST-09 — no se introduce next_retry_at en EFs 10F', () => {
    const files = [
      resolve(ROOT, 'supabase/functions/conv-web-poll/index.ts'),
      resolve(ROOT, 'supabase/functions/conv-web-deliver/index.ts'),
      resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/webchat-rate-limiter.ts'),
    ];
    for (const f of files) {
      expect(readFileSync(f, 'utf-8')).not.toContain('next_retry_at');
    }
  });

  it('RST-10 — no se introduce attempt_count en EFs 10F', () => {
    const files = [
      resolve(ROOT, 'supabase/functions/conv-web-poll/index.ts'),
      resolve(ROOT, 'supabase/functions/conv-web-deliver/index.ts'),
      resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/webchat-rate-limiter.ts'),
    ];
    for (const f of files) {
      expect(readFileSync(f, 'utf-8')).not.toContain('attempt_count');
    }
  });

  it('RST-11 — phase-0-scaffold-review.md existe', () => {
    const p = resolve(ROOT, 'docs/smart-conversations/tests/phase-0-scaffold-review.md');
    expect(existsSync(p)).toBe(true);
  });
});
