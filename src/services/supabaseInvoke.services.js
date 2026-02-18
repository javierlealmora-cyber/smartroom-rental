// src/services/supabaseInvoke.services.js
import { supabase } from "./supabaseClient";

/**
 * SUPABASE INVOKE - robusto para Edge Functions desde navegador
 * - Refresh preventivo + single-flight
 * - Retry razonable (401 y transitorios)
 * - Circuit breaker / cooldown (pero SIN auto-logout agresivo)
 * - Multi-tab sync (BroadcastChannel + storage)
 */

const DEFAULTS = {
  expirySkewSec: 90,

  maxUnauthorizedRetries: 1,
  maxTransientRetries: 2,
  baseRetryDelayMs: 350,

  brokenSessionCooldownMs: 30_000,

  breakerOpenMs: 20_000,
  breakerMaxConsecutiveFailures: 3,
};

const UNAUTHORIZED_RETRY_DELAYS = [0, 800, 2000]; // ms
const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG === "true";

// -------------------- GLOBAL STATE --------------------
let refreshInFlight = null;
let cooldownUntil = 0;
let breakerOpenUntil = 0;
let consecutiveAuthFailures = 0;

// -------------------- MULTI-TAB SYNC --------------------
const CHANNEL_NAME = "srs-auth-sync";
const STORAGE_KEY = "srs_auth_event";

const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

function nowMs() {
  return Date.now();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function openBreaker(ms = DEFAULTS.breakerOpenMs) {
  breakerOpenUntil = Math.max(breakerOpenUntil, nowMs() + ms);
}

function setCooldown(ms = DEFAULTS.brokenSessionCooldownMs) {
  cooldownUntil = Math.max(cooldownUntil, nowMs() + ms);
}

function broadcast(type, payload) {
  try {
    bc?.postMessage({ type, payload, at: nowMs() });
  } catch {
    // ignore
  }
}

function persistStorageEvent(type, payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ type, ...payload, at: nowMs() }));
  } catch {
    // ignore
  }
}

// Listener BC
if (bc) {
  bc.onmessage = async (ev) => {
    const msg = ev?.data;
    if (!msg?.type) return;

    if (msg.type === "COOLDOWN") {
      cooldownUntil = Math.max(cooldownUntil, msg.payload?.cooldownUntil ?? 0);
      breakerOpenUntil = Math.max(breakerOpenUntil, msg.payload?.breakerOpenUntil ?? 0);
    }

    if (msg.type === "SIGN_OUT_LOCAL") {
      cooldownUntil = Math.max(cooldownUntil, msg.payload?.cooldownUntil ?? 0);
      breakerOpenUntil = Math.max(breakerOpenUntil, msg.payload?.breakerOpenUntil ?? 0);
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {}
    }
  };
}

// Listener storage fallback
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("storage", async (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const msg = JSON.parse(e.newValue);

      if (msg?.type === "COOLDOWN") {
        cooldownUntil = Math.max(cooldownUntil, msg.cooldownUntil ?? 0);
        breakerOpenUntil = Math.max(breakerOpenUntil, msg.breakerOpenUntil ?? 0);
      }

      if (msg?.type === "SIGN_OUT_LOCAL") {
        cooldownUntil = Math.max(cooldownUntil, msg.cooldownUntil ?? 0);
        breakerOpenUntil = Math.max(breakerOpenUntil, msg.breakerOpenUntil ?? 0);
        await supabase.auth.signOut({ scope: "local" });
      }
    } catch {}
  });
}

// -------------------- HELPERS --------------------
function extractStatus(err) {
  return err?.context?.status ?? err?.status ?? err?.statusCode ?? null;
}

function normalizeMessage(err) {
  return String(err?.message ?? err ?? "").toLowerCase();
}

function isUnauthorizedLike(err) {
  const s = extractStatus(err);
  if (s === 401) return true;

  const msg = normalizeMessage(err);
  return (
    msg.includes("invalid jwt") ||
    msg.includes("token is expired") ||
    msg.includes("token expired") ||
    msg.includes("auth session missing") ||
    msg.includes("jwt malformed") ||
    msg.includes("missing/invalid authorization") ||
    msg.includes("missing authorization") ||
    msg.includes("unauthorized") ||
    msg.includes("authentication required")
  );
}

function isForbidden(err) {
  return extractStatus(err) === 403;
}

function isTransient(err) {
  const s = extractStatus(err);
  const msg = normalizeMessage(err);

  if (
    msg.includes("failed to fetch") ||
    msg.includes("failed to send") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("connection") ||
    msg.includes("refused")
  )
    return true;

  if (s === 429) return true;
  if (s && s >= 500 && s <= 599) return true;

  return false;
}

function safeString(x) {
  try {
    if (typeof x === "string") return x;
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}

function parseContextBody(err) {
  // Supabase functions-js v2.95+ pasa el Response raw como context
  // El body real puede estar en _parsedBody (si lo leimos async) o context.body
  if (err?._parsedBody !== undefined) return err._parsedBody;

  const body = err?.context?.body ?? null;
  if (!body) return null;

  // Supabase a veces mete string, a veces objeto
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  // Si body es un ReadableStream (Response.body), no lo podemos parsear sync
  if (typeof body === "object" && typeof body.getReader === "function") {
    return null;
  }

  return body;
}

// Lee el body del Response cuando el context es un Response raw (functions-js v2.95+)
async function readErrorBody(err) {
  const ctx = err?.context;
  if (!ctx) return;

  // Si context es un Response object (tiene .text() method)
  if (typeof ctx.text === "function" && !err._parsedBody) {
    try {
      const text = await ctx.text();
      try {
        err._parsedBody = JSON.parse(text);
      } catch {
        err._parsedBody = text;
      }
    } catch {
      err._parsedBody = null;
    }
  }
}

function createErrorMessage(err, fn) {
  const status = extractStatus(err);
  const body = parseContextBody(err);
  if (status) {
    // Intentar extraer el mensaje de error de la respuesta JSON
    if (body && typeof body === "object" && body.error) {
      return body.error;
    }
    return body
      ? `Edge Function "${fn}" devolvió HTTP ${status}: ${safeString(body)}`
      : `Edge Function "${fn}" devolvió HTTP ${status}: ${err?.message ?? "Error"}`;
  }

  const msg = normalizeMessage(err);
  if (msg.includes("failed to fetch") || msg.includes("failed to send") || msg.includes("network")) {
    return `No se pudo conectar con la función "${fn}" (red/CORS).`;
  }

  return `No se pudo invocar "${fn}".`;
}

// -------------------- SESSION SAFE --------------------
async function getSessionSafe() {
  // evita falsos null tras recarga/HMR
  const delays = [0, 150, 450];
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await sleep(delays[i]);

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data?.session) return data.session;
  }
  return null;
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.padEnd(base64.length + (4 - (base64.length % 4 || 4)), "=");
  try {
    return JSON.parse(atob(pad));
  } catch {
    return null;
  }
}

function isExpiringSoon(session, skewSec) {
  if (!session?.access_token) return false;

  const payload = decodeJwtPayload(session.access_token);
  const exp = payload?.exp;
  if (exp) {
    const nowSec = Math.floor(nowMs() / 1000);
    return exp - nowSec <= skewSec;
  }

  if (!session?.expires_at) return false;
  const nowSec = Math.floor(nowMs() / 1000);
  return session.expires_at - nowSec <= skewSec;
}

function ensureNotBreaker() {
  const now = nowMs();
  if (now < breakerOpenUntil) throw new Error("CIRCUIT_OPEN");
  if (now < cooldownUntil) throw new Error("SESSION_COOLDOWN");
}

function bumpAuthFailureAndMaybeOpenBreaker() {
  consecutiveAuthFailures += 1;
  if (consecutiveAuthFailures >= DEFAULTS.breakerMaxConsecutiveFailures) {
    openBreaker(DEFAULTS.breakerOpenMs);
    setCooldown(DEFAULTS.brokenSessionCooldownMs);
  }
}

function resetAuthFailures() {
  consecutiveAuthFailures = 0;
}

async function refreshSessionSingleFlight() {
  const now = nowMs();
  if (now < cooldownUntil) throw new Error("SESSION_COOLDOWN");
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data?.session?.access_token) throw error ?? new Error("Refresh failed");
      return data.session;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function getFreshAccessToken({ expirySkewSec } = {}) {
  const skew = expirySkewSec ?? DEFAULTS.expirySkewSec;

  let session = await getSessionSafe();
  if (!session) return null;

  if (isExpiringSoon(session, skew)) {
    session = await refreshSessionSingleFlight();
  }

  return session?.access_token ?? null;
}

// -------------------- MAIN API --------------------
export async function invokeWithAuth(
  functionName,
  {
    body,
    headers = {},
    expirySkewSec = DEFAULTS.expirySkewSec,
    maxUnauthorizedRetries = DEFAULTS.maxUnauthorizedRetries,
    maxTransientRetries = DEFAULTS.maxTransientRetries,
    baseRetryDelayMs = DEFAULTS.baseRetryDelayMs,
  } = {}
) {
  ensureNotBreaker();

  const token = await getFreshAccessToken({ expirySkewSec });
  if (!token) {
    bumpAuthFailureAndMaybeOpenBreaker();
    setCooldown(DEFAULTS.brokenSessionCooldownMs);
    openBreaker(DEFAULTS.breakerOpenMs);
    broadcast("COOLDOWN", { cooldownUntil, breakerOpenUntil });
    persistStorageEvent("COOLDOWN", { cooldownUntil, breakerOpenUntil });
    throw new Error("Sesión no disponible. Vuelve a iniciar sesión.");
  }

  const mergedHeaders = {
    ...headers,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  let unauthorizedAttempts = 0;
  let transientAttempts = 0;

  const maxTotalAttempts = 1 + maxUnauthorizedRetries + maxTransientRetries;
  let totalAttempts = 0;

  while (true) {
    totalAttempts += 1;
    if (totalAttempts > maxTotalAttempts) {
      throw new Error("Máximo de intentos excedido. Intenta más tarde.");
    }

    ensureNotBreaker();

    let data, error;
    try {
      const result = await supabase.functions.invoke(functionName, {
        body,
        headers: mergedHeaders,
      });
      data = result.data;
      error = result.error;
    } catch (invokeError) {
      error = invokeError;
      data = null;
    }

    if (!error) {
      resetAuthFailures();
      return data;
    }

    // Leer body del Response antes de procesar el error (async)
    await readErrorBody(error);

    if (DEBUG) {
      console.warn(`[invokeWithAuth] ${functionName} error`, {
        message: error?.message,
        status: extractStatus(error),
        body: parseContextBody(error),
        attempt: totalAttempts,
      });
    }

    if (isForbidden(error)) throw new Error(createErrorMessage(error, functionName));

    // 401 → intentamos 1 refresh, pero SIN auto-logout
    if (isUnauthorizedLike(error) && unauthorizedAttempts < maxUnauthorizedRetries) {
      unauthorizedAttempts += 1;
      try {
        const session = await refreshSessionSingleFlight();
        const newToken = session?.access_token;
        if (!newToken) throw new Error("Refresh produced no token");

        mergedHeaders.Authorization = `Bearer ${newToken}`;
        await sleep(UNAUTHORIZED_RETRY_DELAYS[unauthorizedAttempts] ?? 0);
        continue;
      } catch {
        bumpAuthFailureAndMaybeOpenBreaker();
        setCooldown(DEFAULTS.brokenSessionCooldownMs);
        openBreaker(DEFAULTS.breakerOpenMs);
        broadcast("COOLDOWN", { cooldownUntil, breakerOpenUntil });
        persistStorageEvent("COOLDOWN", { cooldownUntil, breakerOpenUntil });
        throw new Error("Sesión caducada o inválida. Vuelve a iniciar sesión.");
      }
    }

    // transitorios
    if (isTransient(error) && transientAttempts < maxTransientRetries) {
      transientAttempts += 1;
      await sleep(baseRetryDelayMs * 2 ** (transientAttempts - 1));
      continue;
    }

    if (isUnauthorizedLike(error)) {
      bumpAuthFailureAndMaybeOpenBreaker();
      setCooldown(DEFAULTS.brokenSessionCooldownMs);
      openBreaker(DEFAULTS.breakerOpenMs);
      broadcast("COOLDOWN", { cooldownUntil, breakerOpenUntil });
      persistStorageEvent("COOLDOWN", { cooldownUntil, breakerOpenUntil });
    }

    throw new Error(createErrorMessage(error, functionName));
  }
}
