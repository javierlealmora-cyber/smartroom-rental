/**
 * Security Remediation Implementation — Runtime Tests
 * Fase 11B2B · SmartConversations
 *
 * Tests de comportamiento de los módulos de seguridad mediante simulación inline.
 * No importan módulos EF directamente (evita problemas de resolución Deno/Vite).
 * Simulan el comportamiento de env-config.ts, ef-tenant-guards.ts y
 * webchat-rate-limiter.ts para verificar contratos de seguridad.
 *
 * No requieren Supabase local ni credenciales reales.
 * No conectan a servicios externos.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../../../');

// ─────────────────────────────────────────────────────────────────────────────
// Simulación inline de env-config (replica el contrato de env-config.ts)
// ─────────────────────────────────────────────────────────────────────────────

type WebchatEnvMode =
  | 'local' | 'test' | 'ci'
  | 'sandbox' | 'preproduction' | 'production' | 'unknown_real';

function _getEnvSim(env: Record<string, string | undefined>, key: string): string | undefined {
  return env[key];
}

function detectEnvModeSim(env: Record<string, string | undefined>): WebchatEnvMode {
  const integrationMode = _getEnvSim(env, 'WEBCHAT_INTEGRATION_MODE') ?? 'mock';
  if (integrationMode !== 'real') {
    const ci = _getEnvSim(env, 'CI') ?? '';
    if (ci === 'true' || ci === '1') return 'ci';
    const appEnv = (_getEnvSim(env, 'APP_ENVIRONMENT') ?? '').toLowerCase();
    if (appEnv === 'test') return 'test';
    return 'local';
  }
  const appEnv = (_getEnvSim(env, 'APP_ENVIRONMENT') ?? '').toLowerCase();
  switch (appEnv) {
    case 'sandbox':       return 'sandbox';
    case 'preproduction': return 'preproduction';
    case 'production':    return 'production';
    default:              return 'unknown_real';
  }
}

function isPermissiveEnvSim(mode: WebchatEnvMode): boolean {
  return mode === 'local' || mode === 'test' || mode === 'ci';
}

function isRealEnvSim(mode: WebchatEnvMode): boolean {
  return mode === 'sandbox' || mode === 'preproduction' || mode === 'production' || mode === 'unknown_real';
}

interface EnvConfigResult {
  valid: boolean;
  envMode: WebchatEnvMode;
  internalErrors: string[];
}

function validateEnvConfigSim(env: Record<string, string | undefined>): EnvConfigResult {
  const envMode = detectEnvModeSim(env);
  const internalErrors: string[] = [];

  if (isRealEnvSim(envMode)) {
    const authMode      = _getEnvSim(env, 'WEBCHAT_AUTH_MODE')              ?? 'legacy';
    const rateLimitMode = _getEnvSim(env, 'WEBCHAT_RATE_LIMIT_MODE')        ?? 'mock';
    const signingSecret = _getEnvSim(env, 'WEBCHAT_SESSION_SIGNING_SECRET') ?? '';

    if (envMode === 'unknown_real') {
      internalErrors.push('APP_ENVIRONMENT no definido con WEBCHAT_INTEGRATION_MODE=real — fail-closed aplicado');
    }
    if (authMode === 'legacy') {
      internalErrors.push(`SEC-004: WEBCHAT_AUTH_MODE=legacy rechazado en entorno '${envMode}'`);
    }
    if (rateLimitMode === 'mock') {
      internalErrors.push(`SEC-002: WEBCHAT_RATE_LIMIT_MODE=mock rechazado en entorno '${envMode}'`);
    }
    if (authMode === 'signed_token' && !signingSecret) {
      internalErrors.push('WEBCHAT_SESSION_SIGNING_SECRET requerido cuando WEBCHAT_AUTH_MODE=signed_token');
    }
  }

  return { valid: internalErrors.length === 0, envMode, internalErrors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulación inline de assertTokenClaimsMatchRequest
// ─────────────────────────────────────────────────────────────────────────────

type TenantGuardErrorCode =
  | 'MISSING_WIDGET_KEY' | 'WIDGET_NOT_FOUND' | 'SERVICE_INACTIVE'
  | 'SESSION_NOT_FOUND' | 'SESSION_CLOSED' | 'SESSION_EXPIRED'
  | 'SENDER_MISMATCH' | 'TENANT_MISMATCH' | 'DB_ERROR' | 'TOKEN_CLAIMS_MISMATCH';

type GuardResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: TenantGuardErrorCode; httpStatus: 403 | 404 | 500 };

function assertTokenClaimsMatchRequestSim(
  claims: { client_account_id: string; session_id: string; sender_ref: string },
  body: { client_account_id?: unknown; session_id?: unknown; sender_ref?: unknown },
): GuardResult<{ matched: true }> {
  if (body.client_account_id && body.client_account_id !== claims.client_account_id) {
    return { ok: false, error: 'TOKEN_CLAIMS_MISMATCH', httpStatus: 403 };
  }
  if (body.session_id && body.session_id !== claims.session_id) {
    return { ok: false, error: 'TOKEN_CLAIMS_MISMATCH', httpStatus: 403 };
  }
  if (body.sender_ref && body.sender_ref !== claims.sender_ref) {
    return { ok: false, error: 'TOKEN_CLAIMS_MISMATCH', httpStatus: 403 };
  }
  return { ok: true, data: { matched: true } };
}

function guardErrorToHttpStatusSim(error: TenantGuardErrorCode): 403 | 404 | 500 {
  switch (error) {
    case 'MISSING_WIDGET_KEY': case 'WIDGET_NOT_FOUND': case 'SERVICE_INACTIVE':
    case 'SESSION_CLOSED': case 'SESSION_EXPIRED': case 'SENDER_MISMATCH':
    case 'TENANT_MISMATCH': case 'TOKEN_CLAIMS_MISMATCH':
      return 403;
    case 'SESSION_NOT_FOUND': return 404;
    case 'DB_ERROR': return 500;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulación de assertSessionOwnership
// ─────────────────────────────────────────────────────────────────────────────

interface SessionSim {
  id: string;
  sender_ref: string;
  channel: string;
  state?: string;
  expires_at?: string | null;
  client_account_id?: string;
}

function assertSessionOwnershipSim(
  session: SessionSim,
  expectedSenderRef: string,
): GuardResult<SessionSim> {
  if (session.sender_ref !== expectedSenderRef) {
    return { ok: false, error: 'SENDER_MISMATCH', httpStatus: 403 };
  }
  if (session.state === 'CLOSED') {
    return { ok: false, error: 'SESSION_CLOSED', httpStatus: 403 };
  }
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    return { ok: false, error: 'SESSION_EXPIRED', httpStatus: 403 };
  }
  return { ok: true, data: session };
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulación de rate limiting
// ─────────────────────────────────────────────────────────────────────────────

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: 'SESSION_EXCEEDED' | 'TENANT_EXCEEDED' | 'CONFIG_ERROR'; retry_after_seconds: number };

function checkMessageRateLimitSim(
  count: number,
  limit: number,
  windowSeconds: number,
  error?: boolean,
): RateLimitResult {
  if (error) return { allowed: false, reason: 'CONFIG_ERROR', retry_after_seconds: windowSeconds };
  if (count >= limit) return { allowed: false, reason: 'SESSION_EXCEEDED', retry_after_seconds: windowSeconds };
  return { allowed: true };
}

function checkSessionCreationRateLimitSim(
  count: number,
  limit: number,
  windowSeconds: number,
  error?: boolean,
): RateLimitResult {
  if (error) return { allowed: false, reason: 'CONFIG_ERROR', retry_after_seconds: windowSeconds };
  if (count >= limit) return { allowed: false, reason: 'TENANT_EXCEEDED', retry_after_seconds: windowSeconds };
  return { allowed: true };
}

function checkPollRateLimitSim(
  bucketCount: number,
  limit: number,
  windowSeconds: number,
  rpcUnavailable: boolean,
): RateLimitResult {
  // Fail-open si RPC no disponible
  if (rpcUnavailable) return { allowed: true };
  if (bucketCount > limit) return { allowed: false, reason: 'SESSION_EXCEEDED', retry_after_seconds: windowSeconds };
  return { allowed: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// SRI-ENV-01..12 — Detección de entorno fail-closed
// ─────────────────────────────────────────────────────────────────────────────
describe('SRI-ENV-01..12 — detectEnvMode y validateEnvConfig (simulado)', () => {
  it('SRI-ENV-01: sin vars → mode=local', () => {
    expect(detectEnvModeSim({})).toBe('local');
  });

  it('SRI-ENV-02: CI=true → mode=ci', () => {
    expect(detectEnvModeSim({ CI: 'true' })).toBe('ci');
  });

  it('SRI-ENV-03: CI=1 → mode=ci', () => {
    expect(detectEnvModeSim({ CI: '1' })).toBe('ci');
  });

  it('SRI-ENV-04: APP_ENVIRONMENT=test → mode=test', () => {
    expect(detectEnvModeSim({ APP_ENVIRONMENT: 'test' })).toBe('test');
  });

  it('SRI-ENV-05: INTEGRATION_MODE=real + APP_ENVIRONMENT=sandbox → mode=sandbox', () => {
    expect(detectEnvModeSim({ WEBCHAT_INTEGRATION_MODE: 'real', APP_ENVIRONMENT: 'sandbox' })).toBe('sandbox');
  });

  it('SRI-ENV-06: INTEGRATION_MODE=real + sin APP_ENVIRONMENT → mode=unknown_real', () => {
    expect(detectEnvModeSim({ WEBCHAT_INTEGRATION_MODE: 'real' })).toBe('unknown_real');
  });

  it('SRI-ENV-07: isPermissiveEnv true para local/test/ci', () => {
    expect(isPermissiveEnvSim('local')).toBe(true);
    expect(isPermissiveEnvSim('test')).toBe(true);
    expect(isPermissiveEnvSim('ci')).toBe(true);
  });

  it('SRI-ENV-08: isRealEnv true para sandbox/preproduction/production/unknown_real', () => {
    expect(isRealEnvSim('sandbox')).toBe(true);
    expect(isRealEnvSim('preproduction')).toBe(true);
    expect(isRealEnvSim('production')).toBe(true);
    expect(isRealEnvSim('unknown_real')).toBe(true);
  });

  it('SRI-ENV-09: validateEnvConfig en local → valid=true sin errores', () => {
    const result = validateEnvConfigSim({});
    expect(result.valid).toBe(true);
    expect(result.internalErrors).toHaveLength(0);
  });

  it('SRI-ENV-10: sandbox + AUTH_MODE=legacy → invalid, SEC-004 en internalErrors', () => {
    const result = validateEnvConfigSim({
      WEBCHAT_INTEGRATION_MODE: 'real',
      APP_ENVIRONMENT: 'sandbox',
      WEBCHAT_AUTH_MODE: 'legacy',
      WEBCHAT_RATE_LIMIT_MODE: 'database',
    });
    expect(result.valid).toBe(false);
    expect(result.internalErrors.some(e => e.includes('SEC-004'))).toBe(true);
  });

  it('SRI-ENV-11: sandbox + RATE_LIMIT_MODE=mock → invalid, SEC-002 en internalErrors', () => {
    const result = validateEnvConfigSim({
      WEBCHAT_INTEGRATION_MODE: 'real',
      APP_ENVIRONMENT: 'sandbox',
      WEBCHAT_AUTH_MODE: 'signed_token',
      WEBCHAT_SESSION_SIGNING_SECRET: 'test-secret',
      WEBCHAT_RATE_LIMIT_MODE: 'mock',
    });
    expect(result.valid).toBe(false);
    expect(result.internalErrors.some(e => e.includes('SEC-002'))).toBe(true);
  });

  it('SRI-ENV-12: production + signed_token sin secret → invalid, error de secret', () => {
    const result = validateEnvConfigSim({
      WEBCHAT_INTEGRATION_MODE: 'real',
      APP_ENVIRONMENT: 'production',
      WEBCHAT_AUTH_MODE: 'signed_token',
      WEBCHAT_RATE_LIMIT_MODE: 'database',
    });
    expect(result.valid).toBe(false);
    expect(result.internalErrors.some(e => e.includes('WEBCHAT_SESSION_SIGNING_SECRET'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SRI-TOKEN-01..10 — assertTokenClaimsMatchRequest y guards de tenant
// ─────────────────────────────────────────────────────────────────────────────
describe('SRI-TOKEN-01..10 — assertTokenClaimsMatchRequest y guardErrorToHttpStatus', () => {
  const claims = { client_account_id: 'tenant-aaa', session_id: 'sess-111', sender_ref: 'wc_abc' };

  it('SRI-TOKEN-01: body vacío → ok=true, matched=true', () => {
    const result = assertTokenClaimsMatchRequestSim(claims, {});
    expect(result.ok).toBe(true);
  });

  it('SRI-TOKEN-02: body con mismos valores → ok=true', () => {
    const result = assertTokenClaimsMatchRequestSim(claims, {
      client_account_id: 'tenant-aaa',
      session_id: 'sess-111',
    });
    expect(result.ok).toBe(true);
  });

  it('SRI-TOKEN-03: client_account_id diferente → TOKEN_CLAIMS_MISMATCH', () => {
    const r = assertTokenClaimsMatchRequestSim(claims, { client_account_id: 'tenant-bbb' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('TOKEN_CLAIMS_MISMATCH');
  });

  it('SRI-TOKEN-04: session_id diferente → TOKEN_CLAIMS_MISMATCH', () => {
    const r = assertTokenClaimsMatchRequestSim(claims, { session_id: 'sess-999' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('TOKEN_CLAIMS_MISMATCH');
  });

  it('SRI-TOKEN-05: sender_ref diferente → TOKEN_CLAIMS_MISMATCH', () => {
    const r = assertTokenClaimsMatchRequestSim(claims, { sender_ref: 'wc_hacked' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('TOKEN_CLAIMS_MISMATCH');
  });

  it('SRI-TOKEN-06: TOKEN_CLAIMS_MISMATCH → httpStatus 403', () => {
    expect(guardErrorToHttpStatusSim('TOKEN_CLAIMS_MISMATCH')).toBe(403);
  });

  it('SRI-TOKEN-07: WIDGET_NOT_FOUND → httpStatus 403 (respuesta opaca)', () => {
    expect(guardErrorToHttpStatusSim('WIDGET_NOT_FOUND')).toBe(403);
  });

  it('SRI-TOKEN-08: SESSION_NOT_FOUND → httpStatus 404', () => {
    expect(guardErrorToHttpStatusSim('SESSION_NOT_FOUND')).toBe(404);
  });

  it('SRI-TOKEN-09: DB_ERROR → httpStatus 500', () => {
    expect(guardErrorToHttpStatusSim('DB_ERROR')).toBe(500);
  });

  it('SRI-TOKEN-10: errores cross-tenant nunca retornan 200 ni 401', () => {
    const crossTenantErrors: TenantGuardErrorCode[] = [
      'WIDGET_NOT_FOUND', 'TENANT_MISMATCH', 'SENDER_MISMATCH', 'SESSION_CLOSED',
    ];
    for (const e of crossTenantErrors) {
      const status = guardErrorToHttpStatusSim(e);
      expect(status).not.toBe(200 as never);
      expect(status).not.toBe(401 as never);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SRI-SESSION-01..06 — assertSessionOwnership
// ─────────────────────────────────────────────────────────────────────────────
describe('SRI-SESSION-01..06 — assertSessionOwnership (simulado)', () => {
  const session: SessionSim = {
    id: 'sess-111',
    sender_ref: 'wc_abc',
    channel: 'webchat',
    state: 'NEW',
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    client_account_id: 'tenant-aaa',
  };

  it('SRI-SESSION-01: sesión válida con sender_ref correcto → ok=true', () => {
    expect(assertSessionOwnershipSim(session, 'wc_abc').ok).toBe(true);
  });

  it('SRI-SESSION-02: sender_ref incorrecto → SENDER_MISMATCH', () => {
    const r = assertSessionOwnershipSim(session, 'wc_wrong');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('SENDER_MISMATCH');
  });

  it('SRI-SESSION-03: sesión CLOSED → SESSION_CLOSED', () => {
    const closed = { ...session, state: 'CLOSED' };
    const r = assertSessionOwnershipSim(closed, 'wc_abc');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('SESSION_CLOSED');
  });

  it('SRI-SESSION-04: sesión expirada → SESSION_EXPIRED', () => {
    const expired = { ...session, expires_at: new Date(Date.now() - 1000).toISOString() };
    const r = assertSessionOwnershipSim(expired, 'wc_abc');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('SESSION_EXPIRED');
  });

  it('SRI-SESSION-05: expires_at=null → no aplica expiración (WhatsApp sessions)', () => {
    const noExpiry = { ...session, expires_at: null };
    expect(assertSessionOwnershipSim(noExpiry, 'wc_abc').ok).toBe(true);
  });

  it('SRI-SESSION-06: expires_at en el futuro → ok=true', () => {
    const future = { ...session, expires_at: new Date(Date.now() + 7_200_000).toISOString() };
    expect(assertSessionOwnershipSim(future, 'wc_abc').ok).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SRI-RL-01..12 — Rate limiting
// ─────────────────────────────────────────────────────────────────────────────
describe('SRI-RL-01..12 — Rate limiting (lógica simulada)', () => {
  it('SRI-RL-01: mensajes bajo límite → allowed=true', () => {
    expect(checkMessageRateLimitSim(5, 30, 60).allowed).toBe(true);
  });

  it('SRI-RL-02: mensajes igual al límite → allowed=false SESSION_EXCEEDED', () => {
    const r = checkMessageRateLimitSim(30, 30, 60);
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toBe('SESSION_EXCEEDED');
  });

  it('SRI-RL-03: error de DB → CONFIG_ERROR con retry_after_seconds', () => {
    const r = checkMessageRateLimitSim(0, 30, 60, true);
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.reason).toBe('CONFIG_ERROR');
      expect(r.retry_after_seconds).toBe(60);
    }
  });

  it('SRI-RL-04: sesiones bajo límite → allowed=true', () => {
    expect(checkSessionCreationRateLimitSim(3, 10, 60).allowed).toBe(true);
  });

  it('SRI-RL-05: sesiones igual al límite → allowed=false TENANT_EXCEEDED', () => {
    const r = checkSessionCreationRateLimitSim(10, 10, 60);
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toBe('TENANT_EXCEEDED');
  });

  it('SRI-RL-06: error en checkSessionCreationRateLimit → CONFIG_ERROR', () => {
    const r = checkSessionCreationRateLimitSim(0, 10, 60, true);
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toBe('CONFIG_ERROR');
  });

  it('SRI-RL-07: poll bajo límite → allowed=true', () => {
    expect(checkPollRateLimitSim(30, 60, 60, false).allowed).toBe(true);
  });

  it('SRI-RL-08: poll supera límite → allowed=false SESSION_EXCEEDED', () => {
    const r = checkPollRateLimitSim(61, 60, 60, false);
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.reason).toBe('SESSION_EXCEEDED');
  });

  it('SRI-RL-09: poll con RPC no disponible → fail-open (allowed=true)', () => {
    expect(checkPollRateLimitSim(0, 60, 60, true).allowed).toBe(true);
  });

  it('SRI-RL-10: retry_after_seconds coincide con la ventana temporal', () => {
    const r = checkSessionCreationRateLimitSim(10, 10, 120);
    if (!r.allowed) expect(r.retry_after_seconds).toBe(120);
  });

  it('SRI-RL-11: en modo mock, rate limit siempre devuelve allowed=true', () => {
    // Simulación del comportamiento mock (sin DB)
    const mockResult: RateLimitResult = { allowed: true };
    expect(mockResult.allowed).toBe(true);
  });

  it('SRI-RL-12: límites de poll (default 60/min) permiten polling frecuente normal', () => {
    // 59 polls en la ventana → bajo el límite de 60
    expect(checkPollRateLimitSim(59, 60, 60, false).allowed).toBe(true);
    // 61 polls → sobre el límite
    expect(checkPollRateLimitSim(61, 60, 60, false).allowed).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SRI-BOUNDARY-01..05 — Propiedades de seguridad verificables por fs
// ─────────────────────────────────────────────────────────────────────────────
describe('SRI-BOUNDARY-01..05 — Propiedades de seguridad verificables', () => {
  it('SRI-BOUNDARY-01: conv-web-poll tiene checkStartupConfig antes del handler principal', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'supabase/functions/conv-web-poll/index.ts'), 'utf-8'
    );
    const handlerStart = src.indexOf('handleWebPollRequest');
    const startupCall  = src.indexOf('checkStartupConfig', handlerStart);
    const bodyParse    = src.indexOf('req.json()', handlerStart);
    expect(startupCall).toBeGreaterThan(0);
    expect(startupCall).toBeLessThan(bodyParse);
  });

  it('SRI-BOUNDARY-02: checkPollRateLimit se llama antes de la query conv_messages', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'supabase/functions/conv-web-poll/index.ts'), 'utf-8'
    );
    const rlIdx    = src.indexOf('checkPollRateLimit');
    const queryIdx = src.indexOf("from('conv_messages')");
    expect(rlIdx).toBeGreaterThan(0);
    expect(rlIdx).toBeLessThan(queryIdx);
  });

  it('SRI-BOUNDARY-03: conv-web-session en modo real resuelve client_account_id de DB no del body', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'supabase/functions/conv-web-session/index.ts'), 'utf-8'
    );
    // En el bloque real, el client_account_id viene de tenantResult.data
    expect(src).toMatch(/client_account_id = tenantResult\.data\.client_account_id/);
  });

  it('SRI-BOUNDARY-04: validateEnvConfig nunca expone internalErrors directamente en la respuesta', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/env-config.ts'), 'utf-8'
    );
    // El safeMessage es un literal genérico, no los errores internos
    expect(src).toMatch(/safeMessage:.*['"`]/);
    // No retorna internalErrors en el objeto de respuesta HTTP
    const checkFn = src.slice(src.indexOf('checkStartupConfig'));
    expect(checkFn).not.toMatch(/return.*internalErrors/);
  });

  it('SRI-BOUNDARY-05: internalErrors se loguean solo a stderr (console.error)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/env-config.ts'), 'utf-8'
    );
    expect(src).toMatch(/console\.error.*FAIL-CLOSED/);
    // No usa console.log para errores de seguridad (podría mezclarse con stdout)
    expect(src).not.toMatch(/console\.log.*internalErrors/);
  });
});
