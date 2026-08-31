/**
 * webchat-session-token.ts -- Token efimero de sesion WebChat.
 *
 * Formato: base64url(JSON_payload) . base64url(HMAC_SHA256_signature)
 * Firmado con WEBCHAT_SESSION_SIGNING_SECRET via Web Crypto HMAC-SHA256.
 * Disponible en Deno Edge Runtime y Node 18+.
 *
 * Claims permitidas:
 *   client_account_id, session_id, sender_ref, channel, issued_at, expires_at, token_version
 *
 * Claims prohibidas: datos de identidad, contacto, contenido de mensajes,
 *   credenciales o secretos. El token solo lleva referencias tecnicas de sesion.
 *
 * Modos:
 *   WEBCHAT_AUTH_MODE=legacy (default) -- sin token, compatible con Fase 10E
 *   WEBCHAT_AUTH_MODE=signed_token    -- token requerido en conv-web-message y conv-web-poll
 *
 * El token NO se guarda en DB. No se loguea. No se devuelve en errores.
 * No usar service_role como signing secret.
 * El signing secret es WEBCHAT_SESSION_SIGNING_SECRET exclusivamente.
 *
 * Fuente: SmartConversations Fase 10F, rules-31, rules-80.
 */

// ── Env helper ────────────────────────────────────────────────────────────

function _getEnv(key: string): string | undefined {
  if (typeof Deno !== 'undefined') return Deno.env.get(key);
  return undefined;
}

// ── Tipos exportados ──────────────────────────────────────────────────────

export type WebchatAuthMode = 'legacy' | 'signed_token';

/** Claims permitidas en el token de sesion WebChat. Sin PII. */
export interface WebchatSessionTokenClaims {
  client_account_id: string;
  session_id: string;
  sender_ref: string;
  channel: 'webchat';
  issued_at: string;
  expires_at: string;
  token_version: number;
}

export type VerifyWebchatTokenResult =
  | { valid: true; claims: WebchatSessionTokenClaims }
  | {
      valid: false;
      reason:
        | 'INVALID_FORMAT'
        | 'INVALID_SIGNATURE'
        | 'EXPIRED'
        | 'INVALID_CLAIMS'
        | 'MISSING_SECRET';
    };

// ── Configuracion ──────────────────────────────────────────────────────────

export function getWebchatAuthMode(): WebchatAuthMode {
  const raw = _getEnv('WEBCHAT_AUTH_MODE') ?? 'legacy';
  return raw === 'signed_token' ? 'signed_token' : 'legacy';
}

export function getWebchatSessionTokenConfig() {
  return {
    authMode: getWebchatAuthMode(),
    signingSecret: _getEnv('WEBCHAT_SESSION_SIGNING_SECRET') ?? '',
    tokenTtlMinutes: parseInt(_getEnv('WEBCHAT_SESSION_TOKEN_TTL_MINUTES') ?? '120', 10),
  };
}

// ── Base64url helpers ─────────────────────────────────────────────────────

function b64urlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function b64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padding));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── HMAC-SHA256 via Web Crypto ────────────────────────────────────────────

async function _importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

// ── Creacion de token ─────────────────────────────────────────────────────

/**
 * Crea un token HMAC-SHA256 firmado con el secret proporcionado.
 * Formato: base64url(payload) . base64url(signature)
 * El llamador debe guardar el token de forma segura y no loguearlo.
 */
export async function createWebchatSessionToken(
  claims: Pick<WebchatSessionTokenClaims, 'client_account_id' | 'session_id' | 'sender_ref'>,
  signingSecret: string,
  ttlMinutes: number,
): Promise<string> {
  const now = new Date();
  const payload: WebchatSessionTokenClaims = {
    client_account_id: claims.client_account_id,
    session_id:        claims.session_id,
    sender_ref:        claims.sender_ref,
    channel:           'webchat',
    issued_at:         now.toISOString(),
    expires_at:        new Date(now.getTime() + ttlMinutes * 60_000).toISOString(),
    token_version:     1,
  };
  const enc = new TextEncoder();
  const payloadB64 = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const key = await _importKey(signingSecret);
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payloadB64));
  const sigB64 = b64urlEncode(new Uint8Array(sigBuf));
  return `${payloadB64}.${sigB64}`;
}

// ── Verificacion de token ─────────────────────────────────────────────────

/**
 * Verifica el token HMAC-SHA256 y devuelve las claims si es valido.
 * Rechaza tokens expirados, con firma invalida, formato incorrecto o claims incompletas.
 * No loguear el token ni el secret en ningun caso.
 */
export async function verifyWebchatSessionToken(
  token: string,
  signingSecret: string,
): Promise<VerifyWebchatTokenResult> {
  if (!signingSecret) return { valid: false, reason: 'MISSING_SECRET' };

  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, reason: 'INVALID_FORMAT' };
  const [payloadB64, sigB64] = parts;

  let sigBytes: Uint8Array;
  try { sigBytes = b64urlDecode(sigB64); } catch {
    return { valid: false, reason: 'INVALID_FORMAT' };
  }

  let key: CryptoKey;
  try { key = await _importKey(signingSecret); } catch {
    return { valid: false, reason: 'MISSING_SECRET' };
  }

  const valid = await crypto.subtle.verify(
    'HMAC', key, sigBytes, new TextEncoder().encode(payloadB64),
  );
  if (!valid) return { valid: false, reason: 'INVALID_SIGNATURE' };

  let claims: WebchatSessionTokenClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
  } catch {
    return { valid: false, reason: 'INVALID_FORMAT' };
  }

  if (
    !claims.client_account_id || !claims.session_id || !claims.sender_ref ||
    claims.channel !== 'webchat' || !claims.issued_at || !claims.expires_at
  ) {
    return { valid: false, reason: 'INVALID_CLAIMS' };
  }

  if (new Date(claims.expires_at) <= new Date()) {
    return { valid: false, reason: 'EXPIRED' };
  }

  return { valid: true, claims };
}
