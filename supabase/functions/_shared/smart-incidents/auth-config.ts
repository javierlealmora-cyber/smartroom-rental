/**
 * auth-config.ts — Carga y validación estructural de la configuración de autenticación
 * Bearer del módulo provider de Smart Incidents.
 *
 * Responsabilidad: validación de presencia, formato base64url y parseabilidad ISO-8601.
 * Expiración: responsabilidad exclusiva de authenticate() en auth-adapter.ts.
 * EnvReader inyectable: permite tests sin Deno.env real.
 * Fail closed: cualquier problema de configuración devuelve { ok: false }.
 *
 * Variables esperadas:
 *   INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT          — obligatoria
 *   INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL — obligatoria
 *   INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS          — opcional (par con VALID_UNTIL)
 *   INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS_VALID_UNTIL — opcional (par con PREVIOUS)
 *   APP_ENVIRONMENT                                    — obligatoria: local|dev|staging|production
 *
 * OFFLINE: Sin fetch. Sin efectos secundarios. Sin acceso directo a Deno.env.
 * Estado: AUTH_CONFIG_IMPLEMENTED_OFFLINE
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

/** Entornos de ejecución reconocidos. Fail closed para cualquier valor desconocido. */
export type AppEnvironment = "local" | "dev" | "staging" | "production";

export interface CurrentTokenConfig {
  readonly token: string;
  readonly validUntil: Date;
}

export interface PreviousTokenConfig {
  readonly token: string;
  readonly validUntil: Date;
}

export interface AuthConfig {
  readonly current: CurrentTokenConfig;
  /** null cuando PREVIOUS no está configurado o no es necesario. */
  readonly previous: PreviousTokenConfig | null;
  readonly environment: AppEnvironment;
}

export type AuthConfigErrorReason =
  | "APP_ENVIRONMENT_MISSING"
  | "APP_ENVIRONMENT_INVALID"
  | "CURRENT_TOKEN_MISSING"
  | "CURRENT_TOKEN_FORMAT_INVALID"
  | "CURRENT_VALID_UNTIL_MISSING"
  | "CURRENT_VALID_UNTIL_INVALID"
  | "CURRENT_EXPIRED"
  | "PREVIOUS_TOKEN_WITHOUT_DATE"
  | "PREVIOUS_DATE_WITHOUT_TOKEN"
  | "PREVIOUS_TOKEN_FORMAT_INVALID"
  | "PREVIOUS_VALID_UNTIL_INVALID"
  | "PREVIOUS_TOKEN_EQUALS_CURRENT";

export interface AuthConfigError {
  readonly type: "AUTH_CONFIG_ERROR";
  readonly reason: AuthConfigErrorReason;
}

export type AuthConfigResult =
  | { readonly ok: true; readonly config: AuthConfig }
  | { readonly ok: false; readonly error: AuthConfigError };

/**
 * Reader de entorno inyectable. Abstrae Deno.env para tests.
 * Uso en producción: makeDenoEnvReader().
 * Uso en tests: (key) => vars[key].
 */
export type EnvReader = (key: string) => string | undefined;

// ─── Constantes ───────────────────────────────────────────────────────────────

const VALID_ENVIRONMENTS = new Set<AppEnvironment>([
  "local", "dev", "staging", "production",
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cfgErr(reason: AuthConfigErrorReason): AuthConfigResult {
  return { ok: false, error: { type: "AUTH_CONFIG_ERROR", reason } };
}

/**
 * Valida el formato del token: base64url sin padding, exactamente 32 bytes.
 * Pasos:
 *   1. Solo alfabeto base64url ([A-Za-z0-9-_], sin =).
 *   2. Convierte a base64 estándar con padding y decodifica.
 *   3. Verifica exactamente 32 bytes.
 *   4. Recodifica a base64url sin padding y exige identidad (canonical round-trip).
 * No registra el valor del token bajo ninguna circunstancia.
 */
export function validateTokenFormat(token: string): boolean {
  if (typeof token !== "string" || token.length === 0) return false;
  if (!/^[A-Za-z0-9\-_]+$/.test(token)) return false;
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (b64.length % 4)) % 4;
  const padded = b64 + "=".repeat(padding);
  let decoded: string;
  try {
    decoded = atob(padded);
  } catch {
    return false;
  }
  if (decoded.length !== 32) return false;
  const reencoded = btoa(decoded)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return reencoded === token;
}

/**
 * Parsea una fecha ISO-8601. Devuelve null si el string no representa una fecha válida.
 * No verifica si es futura o pasada — responsabilidad de authenticate().
 */
export function parseIsoDate(dateStr: string): Date | null {
  if (typeof dateStr !== "string" || dateStr.trim().length === 0) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Carga de configuración ───────────────────────────────────────────────────

/**
 * Carga y valida la configuración de autenticación Bearer desde el reader de entorno.
 *
 * Valida: presencia, formato base64url, parseabilidad de fechas y expiración de CURRENT.
 * Si CURRENT_VALID_UNTIL <= now → CURRENT_EXPIRED (fail closed → INTERNAL_ERROR en HTTP).
 * PREVIOUS expirado no invalida la config; solo impide autenticación via ese slot.
 * No registra tokens ni valores de variables de entorno.
 * Fail closed: retorna { ok: false } ante cualquier problema de configuración.
 */
export function loadAuthConfig(env: EnvReader, now: Date): AuthConfigResult {
  // APP_ENVIRONMENT
  const rawEnv = env("APP_ENVIRONMENT") ?? "";
  if (rawEnv.length === 0) return cfgErr("APP_ENVIRONMENT_MISSING");
  if (!VALID_ENVIRONMENTS.has(rawEnv as AppEnvironment)) return cfgErr("APP_ENVIRONMENT_INVALID");
  const environment = rawEnv as AppEnvironment;

  // CURRENT token — obligatorio
  const currentToken = env("INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT") ?? "";
  if (currentToken.length === 0) return cfgErr("CURRENT_TOKEN_MISSING");
  if (!validateTokenFormat(currentToken)) return cfgErr("CURRENT_TOKEN_FORMAT_INVALID");

  // CURRENT_VALID_UNTIL — obligatorio; fail closed si ya expiró al cargar
  const currentUntilStr =
    env("INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL") ?? "";
  if (currentUntilStr.length === 0) return cfgErr("CURRENT_VALID_UNTIL_MISSING");
  const currentValidUntil = parseIsoDate(currentUntilStr);
  if (!currentValidUntil) return cfgErr("CURRENT_VALID_UNTIL_INVALID");
  if (currentValidUntil <= now) return cfgErr("CURRENT_EXPIRED");

  // PREVIOUS — par opcional: ambos presentes o ambos ausentes
  const prevToken = env("INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS") ?? "";
  const prevUntilStr =
    env("INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS_VALID_UNTIL") ?? "";
  const hasPrevToken = prevToken.length > 0;
  const hasPrevDate = prevUntilStr.length > 0;

  if (hasPrevToken && !hasPrevDate) return cfgErr("PREVIOUS_TOKEN_WITHOUT_DATE");
  if (!hasPrevToken && hasPrevDate) return cfgErr("PREVIOUS_DATE_WITHOUT_TOKEN");

  let previous: PreviousTokenConfig | null = null;

  if (hasPrevToken && hasPrevDate) {
    if (!validateTokenFormat(prevToken)) return cfgErr("PREVIOUS_TOKEN_FORMAT_INVALID");
    const prevValidUntil = parseIsoDate(prevUntilStr);
    if (!prevValidUntil) return cfgErr("PREVIOUS_VALID_UNTIL_INVALID");
    if (prevToken === currentToken) return cfgErr("PREVIOUS_TOKEN_EQUALS_CURRENT");
    previous = { token: prevToken, validUntil: prevValidUntil };
  }

  return {
    ok: true,
    config: {
      current: { token: currentToken, validUntil: currentValidUntil },
      previous,
      environment,
    },
  };
}

/**
 * Crea un EnvReader que lee de Deno.env.
 * Solo para uso en runtime Deno/Supabase EF. No llamar en tests Node.js.
 */
export function makeDenoEnvReader(): EnvReader {
  // Acceso a Deno.env via globalThis para evitar error de referencia en Node.js.
  // La función se define en módulo pero no ejecuta Deno.env.get en tiempo de evaluación.
  // deno-lint-ignore no-explicit-any
  return (key: string) => (globalThis as any).Deno?.env?.get(key);
}
