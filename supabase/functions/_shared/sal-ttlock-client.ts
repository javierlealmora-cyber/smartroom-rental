/**
 * Cliente HTTP para la API de TTLock (euapi.ttlock.com).
 *
 * TTLock usa ROPC (Resource Owner Password Credentials):
 *   - client_id + client_secret de la app
 *   - username + password (como MD5) de la cuenta TTLock del cliente
 *
 * Tokens tienen TTL de 90 días — se cachean en Vault y se renuevan solo
 * cuando están próximos a expirar.
 *
 * Rate limit TTLock: ~10 req/s → pausas de 150ms entre llamadas paginadas.
 */

// Plataformas TTLock (Sciener es la empresa propietaria de TTLock):
//   Internacional (lock2.ttlock.com) → https://api.sciener.com   ← dominio real de la API
//   Europa        (eulock.ttlock.com) → https://euapi.ttlock.com
const TTLOCK_BASE_INTL = "https://api.sciener.com";
const TTLOCK_BASE_EU   = "https://euapi.ttlock.com";

/** Resuelve la URL base según la región */
export function resolveTTLockBase(region?: string): string {
  return region === "eu" ? TTLOCK_BASE_EU : TTLOCK_BASE_INTL;
}
const PAGE_SIZE   = 100;       // Máx permitido por TTLock
const CALL_DELAY  = 150;       // ms entre páginas (rate-limit safety)

// ── MD5 puro en TypeScript ────────────────────────────────────────────────────
// TTLock requiere MD5(password) en hex lowercase. Web Crypto no soporta MD5
// (demasiado débil), así que usamos una implementación pura sin dependencias.

function safeAdd(x: number, y: number): number {
  const lsw = (x & 0xffff) + (y & 0xffff);
  return ((x >> 16) + (y >> 16) + (lsw >> 16)) << 16 | (lsw & 0xffff);
}
function bitRotateLeft(num: number, cnt: number): number {
  return (num << cnt) | (num >>> (32 - cnt));
}
function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
  return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
}
function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return md5cmn((b & c) | (~b & d), a, b, x, s, t);
}
function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
}
function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return md5cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
  return md5cmn(c ^ (b | ~d), a, b, x, s, t);
}

function computeMd5Bin(m: number[]): number[] {
  let a =  1732584193, b = -271733879, c = -1732584194, d =  271733878;
  for (let i = 0; i < m.length; i += 16) {
    const [oa, ob, oc, od] = [a, b, c, d];
    a = md5ff(a,b,c,d, m[i   ], 7 , -680876936);  b = md5ff(d,a,b,c, m[i+1 ], 12, -389564586);
    c = md5ff(c,d,a,b, m[i+2 ], 17,  606105819);  d = md5ff(b,c,d,a, m[i+3 ], 22, -1044525330);
    a = md5ff(a,b,c,d, m[i+4 ], 7 , -176418897);  b = md5ff(d,a,b,c, m[i+5 ], 12,  1200080426);
    c = md5ff(c,d,a,b, m[i+6 ], 17, -1473231341); d = md5ff(b,c,d,a, m[i+7 ], 22, -45705983);
    a = md5ff(a,b,c,d, m[i+8 ], 7 ,  1770035416); b = md5ff(d,a,b,c, m[i+9 ], 12, -1958414417);
    c = md5ff(c,d,a,b, m[i+10], 17, -42063);       d = md5ff(b,c,d,a, m[i+11], 22, -1990404162);
    a = md5ff(a,b,c,d, m[i+12], 7 ,  1804603682);  b = md5ff(d,a,b,c, m[i+13], 12, -40341101);
    c = md5ff(c,d,a,b, m[i+14], 17, -1502002290);  d = md5ff(b,c,d,a, m[i+15], 22,  1236535329);
    a = md5gg(a,b,c,d, m[i+1 ], 5 , -165796510);  b = md5gg(d,a,b,c, m[i+6 ], 9 , -1069501632);
    c = md5gg(c,d,a,b, m[i+11], 14,  643717713);   d = md5gg(b,c,d,a, m[i   ], 20, -373897302);
    a = md5gg(a,b,c,d, m[i+5 ], 5 , -701558691);   b = md5gg(d,a,b,c, m[i+10], 9 ,  38016083);
    c = md5gg(c,d,a,b, m[i+15], 14, -660478335);   d = md5gg(b,c,d,a, m[i+4 ], 20, -405537848);
    a = md5gg(a,b,c,d, m[i+9 ], 5 ,  568446438);   b = md5gg(d,a,b,c, m[i+14], 9 , -1019803690);
    c = md5gg(c,d,a,b, m[i+3 ], 14, -187363961);   d = md5gg(b,c,d,a, m[i+8 ], 20,  1163531501);
    a = md5gg(a,b,c,d, m[i+13], 5 , -1444681467);  b = md5gg(d,a,b,c, m[i+2 ], 9 , -51403784);
    c = md5gg(c,d,a,b, m[i+7 ], 14,  1735328473);  d = md5gg(b,c,d,a, m[i+12], 20, -1926607734);
    a = md5hh(a,b,c,d, m[i+5 ], 4 , -378558);      b = md5hh(d,a,b,c, m[i+8 ], 11, -2022574463);
    c = md5hh(c,d,a,b, m[i+11], 16,  1839030562);  d = md5hh(b,c,d,a, m[i+14], 23, -35309556);
    a = md5hh(a,b,c,d, m[i+1 ], 4 , -1530992060);  b = md5hh(d,a,b,c, m[i+4 ], 11,  1272893353);
    c = md5hh(c,d,a,b, m[i+7 ], 16, -155497632);   d = md5hh(b,c,d,a, m[i+10], 23, -1094730640);
    a = md5hh(a,b,c,d, m[i+13], 4 ,  681279174);   b = md5hh(d,a,b,c, m[i   ], 11, -358537222);
    c = md5hh(c,d,a,b, m[i+3 ], 16, -722521979);   d = md5hh(b,c,d,a, m[i+6 ], 23,  76029189);
    a = md5hh(a,b,c,d, m[i+9 ], 4 , -640364487);   b = md5hh(d,a,b,c, m[i+12], 11, -421815835);
    c = md5hh(c,d,a,b, m[i+15], 16,  530742520);   d = md5hh(b,c,d,a, m[i+2 ], 23, -995338651);
    a = md5ii(a,b,c,d, m[i   ], 6 , -198630844);   b = md5ii(d,a,b,c, m[i+7 ], 10,  1126891415);
    c = md5ii(c,d,a,b, m[i+14], 15, -1416354905);  d = md5ii(b,c,d,a, m[i+5 ], 21, -57434055);
    a = md5ii(a,b,c,d, m[i+12], 6 ,  1700485571);  b = md5ii(d,a,b,c, m[i+3 ], 10, -1894986606);
    c = md5ii(c,d,a,b, m[i+10], 15, -1051523);      d = md5ii(b,c,d,a, m[i+1 ], 21, -2054922799);
    a = md5ii(a,b,c,d, m[i+8 ], 6 ,  1873313359);  b = md5ii(d,a,b,c, m[i+15], 10, -30611744);
    c = md5ii(c,d,a,b, m[i+6 ], 15, -1560198380);  d = md5ii(b,c,d,a, m[i+13], 21,  1309151649);
    a = md5ii(a,b,c,d, m[i+4 ], 6 , -145523070);   b = md5ii(d,a,b,c, m[i+11], 10, -1120210379);
    c = md5ii(c,d,a,b, m[i+2 ], 15,  718787259);   d = md5ii(b,c,d,a, m[i+9 ], 21, -343485551);
    a = safeAdd(a, oa); b = safeAdd(b, ob); c = safeAdd(c, oc); d = safeAdd(d, od);
  }
  return [a, b, c, d];
}

function str2binl(str: string): number[] {
  const bin: number[] = new Array(Math.ceil(str.length / 4)).fill(0);
  for (let i = 0; i < str.length; i++) {
    bin[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
  }
  return bin;
}

function binl2hex(binarray: number[]): string {
  const hex = "0123456789abcdef";
  let str = "";
  for (let i = 0; i < binarray.length * 4; i++) {
    str += hex.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0xf)
         + hex.charAt((binarray[i >> 2] >> ((i % 4) * 8    )) & 0xf);
  }
  return str;
}

function hexMd5(input: string): string {
  const binaryString = unescape(encodeURIComponent(input));
  const m = str2binl(binaryString);
  const len = binaryString.length * 8;
  m[len >> 5] |= 0x80 << (len % 32);
  m[(((len + 64) >>> 9) << 4) + 14] = len;
  return binl2hex(computeMd5Bin(m));
}

export { hexMd5 as computeMd5 };

// ── TTLock OAuth token ────────────────────────────────────────────────────────

export interface TTLockCredentials {
  clientId:     string;
  clientSecret: string;
  username:     string;
  passwordMd5:  string;
}

export interface TTLockToken {
  access_token:  string;
  refresh_token: string;
  expires_in:    number; // seconds from TTLock
}

export interface CachedToken {
  accessToken:     string;
  refreshToken:    string;
  tokenExpiresAt:  string; // ISO8601
}

/** Obtiene un token nuevo de TTLock (ROPC).
 *
 * ⚠️ TTLock NO sigue el estándar OAuth2 RFC 6749:
 * - Usa camelCase (clientId, clientSecret) en el request, no snake_case.
 * - NO acepta `grant_type=password` (lo ignora o rechaza).
 * - El body HTTP 200 puede contener errcode != 0 si hubo error lógico.
 */
export async function getTTLockToken(creds: TTLockCredentials, apiBase?: string): Promise<TTLockToken> {
  const base = apiBase ?? TTLOCK_BASE_INTL;
  const params = new URLSearchParams({
    clientId:     creds.clientId,
    clientSecret: creds.clientSecret,
    username:     creds.username,
    password:     creds.passwordMd5, // TTLock espera MD5 lowercase
  });

  const res = await fetch(`${base}/oauth2/token`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    params.toString(),
  });

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new Error(`TTLock returned non-JSON response (HTTP ${res.status})`);
  }

  // TTLock devuelve errcode en el body si hay error (HTTP 200 con error)
  if (data.errcode !== undefined && data.errcode !== 0) {
    throw new Error(`TTLock auth failed [errcode=${data.errcode}]: ${data.errmsg ?? JSON.stringify(data)}`);
  }
  if (!res.ok) {
    throw new Error(`TTLock HTTP error ${res.status}: ${JSON.stringify(data)}`);
  }
  if (!data.access_token) {
    throw new Error(`TTLock no devolvió access_token: ${JSON.stringify(data)}`);
  }
  return data as unknown as TTLockToken;
}

/**
 * Registra un nuevo usuario TTLock gestionado bajo la App developer.
 *
 * Es EL ÚNICO modelo soportado oficialmente por TTLock para integraciones API:
 * la App developer registra sus propios usuarios (no puede autenticar cuentas
 * TTLock personales preexistentes — daría errcode 10007).
 *
 * TTLock valida el username: solo alfanumérico (no símbolos, no `@`, no `+`).
 * Devuelve el username final con un prefijo del clientId (ej. "4a3c97_miuser").
 *
 * @param clientId     App Client ID del portal TTLock.
 * @param clientSecret App Client Secret.
 * @param username     Nombre base (solo letras/números).
 * @param passwordMd5  MD5 lowercase hex del password.
 * @param apiBase      URL base (euapi.ttlock.com o api.sciener.com).
 * @returns            El username final asignado por TTLock (con prefijo).
 */
export async function registerTTLockUser(
  clientId:     string,
  clientSecret: string,
  username:     string,
  passwordMd5:  string,
  apiBase?:     string,
): Promise<string> {
  const base = apiBase ?? TTLOCK_BASE_INTL;
  const params = new URLSearchParams({
    clientId,
    clientSecret,
    username,
    password: passwordMd5,
    date:     String(Date.now()),
  });

  const res = await fetch(`${base}/v3/user/register`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    params.toString(),
  });

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new Error(`TTLock /v3/user/register returned non-JSON (HTTP ${res.status})`);
  }

  if (data.errcode !== undefined && data.errcode !== 0) {
    throw new Error(`TTLock user register failed [errcode=${data.errcode}]: ${data.errmsg ?? JSON.stringify(data)}`);
  }
  if (!data.username || typeof data.username !== "string") {
    throw new Error(`TTLock /v3/user/register no devolvió username: ${JSON.stringify(data)}`);
  }
  return data.username;
}

/**
 * Resetea la contraseña de un usuario TTLock gestionado sin necesidad de
 * conocer la anterior. Requiere clientId + clientSecret de la App developer
 * (que es quien "posee" al usuario gestionado).
 *
 * Endpoint: POST /v3/user/resetPassword
 * Params:   clientId, clientSecret, username, password (md5), date
 *
 * Nota: según la API TTLock, tras esta llamada el access_token y refresh_token
 * previos quedan invalidados. El llamador debe re-autenticar con /oauth2/token
 * usando la nueva password.
 */
export async function resetTTLockUserPassword(
  clientId:       string,
  clientSecret:   string,
  username:       string,
  newPasswordMd5: string,
  apiBase?:       string,
): Promise<void> {
  const base = apiBase ?? TTLOCK_BASE_INTL;
  const params = new URLSearchParams({
    clientId,
    clientSecret,
    username,
    password: newPasswordMd5,
    date:     String(Date.now()),
  });

  const res = await fetch(`${base}/v3/user/resetPassword`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    params.toString(),
  });

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new Error(`TTLock /v3/user/resetPassword returned non-JSON (HTTP ${res.status})`);
  }

  if (data.errcode !== undefined && data.errcode !== 0) {
    throw new Error(`TTLock reset password failed [errcode=${data.errcode}]: ${data.errmsg ?? JSON.stringify(data)}`);
  }
  if (!res.ok) {
    throw new Error(`TTLock /v3/user/resetPassword HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
}

/**
 * Devuelve un token válido.
 * Usa el token cacheado si no está vencido (margen de 1h).
 * Re-autentica si está vencido o próximo a vencer.
 */
export function isTokenFresh(cached: CachedToken): boolean {
  const expiresAt = new Date(cached.tokenExpiresAt).getTime();
  const oneHourMs = 60 * 60 * 1000;
  return Date.now() < expiresAt - oneHourMs;
}

// ── TTLock API calls ──────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ttlockGet(
  path: string,
  params: Record<string, string | number>,
  accessToken: string,
  clientId: string,
  apiBase: string = TTLOCK_BASE_INTL,
): Promise<unknown> {
  const qs = new URLSearchParams({
    clientId,
    accessToken,
    date: String(Date.now()),
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  const res  = await fetch(`${apiBase}${path}?${qs.toString()}`);
  const data = await res.json() as { errcode?: number; errmsg?: string };
  if (data.errcode !== 0) {
    throw new Error(`TTLock error [${data.errcode}]: ${data.errmsg}`);
  }
  return data;
}

// ── Listar cerraduras (paginado) ──────────────────────────────────────────────

export interface TTLockRaw {
  lockId:            number;
  lockName:          string;
  electricQuantity:  number;  // batería 0–100
  lockVersion?:      { groupId?: string };
  firmwareRevision?: string;
  hardwareRevision?: string;
  modelNum?:         string;
  isOnline?:         boolean;
}

export async function fetchAllLocks(
  accessToken: string,
  clientId:    string,
  apiBase:     string = TTLOCK_BASE_INTL,
): Promise<TTLockRaw[]> {
  const results: TTLockRaw[] = [];
  let pageNo = 1;

  while (true) {
    const data = await ttlockGet("/v3/lock/list", { pageNo, pageSize: PAGE_SIZE }, accessToken, clientId, apiBase) as {
      list: TTLockRaw[];
      totalSize: number;
    };

    results.push(...(data.list ?? []));

    if (results.length >= data.totalSize) break;
    pageNo++;
    await sleep(CALL_DELAY);
  }

  return results;
}

// ── Listar registros de acceso (paginado por lock) ────────────────────────────

export interface TTLockRecord {
  lockId:         number;
  recordType:     number;
  success:        number;  // 1=exitoso
  lockDate:       number;  // Unix ms
  username?:      string;
  keyboardPwd?:   string;  // solo hint
  serverDate?:    number;
}

export async function fetchLockRecords(
  accessToken: string,
  clientId:    string,
  lockId:      string,
  startDateMs: number,
  endDateMs:   number,
  apiBase:     string = TTLOCK_BASE_INTL,
): Promise<TTLockRecord[]> {
  const results: TTLockRecord[] = [];
  let pageNo = 1;

  while (true) {
    const data = await ttlockGet("/v3/lockRecord/list", {
      pageNo, pageSize: PAGE_SIZE,
      lockId,
      startDate: startDateMs,
      endDate:   endDateMs,
    }, accessToken, clientId, apiBase) as { list: TTLockRecord[]; totalSize: number };

    results.push(...(data.list ?? []));

    if (results.length >= data.totalSize || (data.list ?? []).length === 0) break;
    pageNo++;
    await sleep(CALL_DELAY);
  }

  return results;
}

// ── Mapeo record type → event_type legible ────────────────────────────────────
export function mapRecordType(type: number): string {
  const map: Record<number, string> = {
    1:  "unlock_app",
    2:  "unlock_passcode",
    3:  "unlock_card",
    4:  "unlock_fingerprint",
    5:  "unlock_ble",
    7:  "lock_app",
    8:  "unlock_remote",
    9:  "auto_lock",
    10: "unlock_key",
    11: "lock_remote",
    12: "lock_fingerprint",
    13: "lock_passcode",
    14: "lock_ble",
    15: "lock_card",
    16: "unlock_failed",
    17: "tamper_alert",
    18: "door_left_open",
    19: "door_closed",
  };
  return map[type] ?? `event_${type}`;
}
