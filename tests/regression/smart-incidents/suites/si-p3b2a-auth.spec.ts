/**
 * si-p3b2a-auth.spec.ts — SI-P3B2A: Tests offline del módulo de autenticación
 * Bearer del provider de Smart Incidents.
 *
 * OFFLINE ONLY: Sin Deno.env real, sin fetch, sin DB, sin HTTP.
 * Importa funciones puras e inyecta dependencias (EnvReader, clock) de test.
 *
 * Mecanismo probado: DEDICATED_OPAQUE_BEARER_CAPABILITY_PER_ENVIRONMENT.
 * Esquema Bearer: case-insensitive (RFC 7235). Token: case-sensitive (preservado).
 * Token format: base64url sin padding, exactamente 32 bytes, canonical round-trip.
 * Constant-time: node:crypto.timingSafeEqual + SHA-256 (jsr: incompatible con Vitest).
 * Fuente: docs/smart-incidents/integration/incident-provider-si-p3b1-auth-decision.md
 */

import { describe, it, expect } from 'vitest';

import {
  loadAuthConfig,
  validateTokenFormat,
  parseIsoDate,
  type AuthConfig,
  type EnvReader,
} from '../../../../supabase/functions/_shared/smart-incidents/auth-config.ts';

import {
  safeTokenEqual,
} from '../../../../supabase/functions/_shared/smart-incidents/constant-time.ts';

import {
  parseBearerHeader,
  authenticate,
  authorizeForOperation,
  IncidentBearerAuthAdapter,
  type AuthResult,
} from '../../../../supabase/functions/_shared/smart-incidents/auth-adapter.ts';

import type {
  IncidentCallerAuthResult,
} from '../../../../supabase/functions/_shared/smart-incidents/port.ts';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// TOKEN_A: 43 chars base64url, canonical (last char 'E'=4, bits 1:0 = 00).
// Decodes to exactly 32 bytes via base64url → base64 → atob → 32 bytes.
// Canonical round-trip: btoa(decode(TOKEN_A)) → base64url = TOKEN_A ✓
const TOKEN_A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopE";

// TOKEN_B: 43 chars base64url, canonical (last char 'Q'=16, bits 1:0 = 00).
// Same prefix as TOKEN_A, different last char → TOKEN_A ≠ TOKEN_B.
const TOKEN_B = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopQ";

// TOKEN_SHORT: 42 chars → decodes to 31 bytes (< 32) → rejected.
const TOKEN_SHORT = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop";

// TOKEN_LONG: 44 chars → decodes to 33 bytes (> 32) → rejected.
const TOKEN_LONG = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqr";

// TOKEN_NONCANON: 43 chars, last char 'q'=42, bits 1:0=10 (non-zero) → non-canonical → rejected.
const TOKEN_NONCANON = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq";

function futureIso(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

function pastIso(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString();
}

function futureDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

function pastDate(): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d;
}

function makeEnvReader(vars: Record<string, string | undefined>): EnvReader {
  return (key) => vars[key];
}

function baseEnv(overrides: Record<string, string | undefined> = {}): EnvReader {
  return makeEnvReader({
    APP_ENVIRONMENT: "dev",
    INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT: TOKEN_A,
    INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL: futureIso(),
    ...overrides,
  });
}

function makeValidConfig(overrides: Partial<AuthConfig> = {}): AuthConfig {
  return {
    current: { token: TOKEN_A, validUntil: futureDate() },
    previous: null,
    environment: "dev",
    ...overrides,
  };
}

const NOW = new Date();

// ─── Tests: validateTokenFormat ───────────────────────────────────────────────

describe("validateTokenFormat", () => {
  it("acepta token canónico de exactamente 43 chars base64url (32 bytes)", () => {
    expect(validateTokenFormat(TOKEN_A)).toBe(true);
  });

  it("acepta token canónico con guion y guion bajo (base64url completo)", () => {
    // 43 chars, con - y _, último char 'A' (=0, canonical)
    const t = "ABCDEFGHIJKLMNOPQRSTUVWXYZ-bcdefghijklm_pqA";
    expect(validateTokenFormat(t)).toBe(true);
  });

  it("rechaza token de 42 chars (decodifica a 31 bytes, < 32)", () => {
    expect(validateTokenFormat(TOKEN_SHORT)).toBe(false);
  });

  it("rechaza token de 44 chars (decodifica a 33 bytes, > 32)", () => {
    expect(validateTokenFormat(TOKEN_LONG)).toBe(false);
  });

  it("rechaza token no canónico (round-trip falla: bits de padding no son cero)", () => {
    // TOKEN_NONCANON termina en 'q'=42, bits 1:0=10 → re-codificación difiere
    expect(validateTokenFormat(TOKEN_NONCANON)).toBe(false);
  });

  it("rechaza token vacío", () => {
    expect(validateTokenFormat("")).toBe(false);
  });

  it("rechaza token con espacio interior", () => {
    const t = TOKEN_A.slice(0, 20) + " " + TOKEN_A.slice(21);
    expect(validateTokenFormat(t)).toBe(false);
  });

  it("rechaza token con salto de línea", () => {
    const t = TOKEN_A.slice(0, 20) + "\n" + TOKEN_A.slice(21);
    expect(validateTokenFormat(t)).toBe(false);
  });

  it("rechaza token con símbolo + (base64 estándar, no base64url)", () => {
    const t = TOKEN_A.slice(0, -1) + "+";
    expect(validateTokenFormat(t)).toBe(false);
  });

  it("rechaza token con símbolo = (padding de base64, prohibido en input)", () => {
    const t = TOKEN_A.slice(0, -1) + "=";
    expect(validateTokenFormat(t)).toBe(false);
  });
});

// ─── Tests: parseIsoDate ──────────────────────────────────────────────────────

describe("parseIsoDate", () => {
  it("parsea fecha ISO-8601 futura", () => {
    const iso = futureIso();
    const d = parseIsoDate(iso);
    expect(d).toBeInstanceOf(Date);
    expect(isNaN(d!.getTime())).toBe(false);
  });

  it("parsea fecha ISO-8601 pasada", () => {
    const d = parseIsoDate("2020-01-01T00:00:00.000Z");
    expect(d).toBeInstanceOf(Date);
    expect(d!.getFullYear()).toBe(2020);
  });

  it("devuelve null para string vacío", () => {
    expect(parseIsoDate("")).toBeNull();
  });

  it("devuelve null para string no-fecha", () => {
    expect(parseIsoDate("not-a-date")).toBeNull();
  });

  it("devuelve null para número como string", () => {
    expect(parseIsoDate("1234567890")).toBeNull();
  });
});

// ─── Tests: loadAuthConfig — CURRENT ─────────────────────────────────────────

describe("loadAuthConfig / CURRENT", () => {
  it("ok con configuración mínima válida", () => {
    const result = loadAuthConfig(baseEnv(), NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.environment).toBe("dev");
      expect(result.config.current.token).toBe(TOKEN_A);
      expect(result.config.previous).toBeNull();
    }
  });

  it("error si APP_ENVIRONMENT está ausente", () => {
    const result = loadAuthConfig(baseEnv({ APP_ENVIRONMENT: undefined }), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("APP_ENVIRONMENT_MISSING");
  });

  it("error si APP_ENVIRONMENT es desconocido (test, production-like, etc.)", () => {
    const result = loadAuthConfig(baseEnv({ APP_ENVIRONMENT: "test" }), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("APP_ENVIRONMENT_INVALID");
  });

  it("acepta todos los entornos válidos", () => {
    for (const env of ["local", "dev", "staging", "production"] as const) {
      const result = loadAuthConfig(baseEnv({ APP_ENVIRONMENT: env }), NOW);
      expect(result.ok, `entorno ${env}`).toBe(true);
    }
  });

  it("error si CURRENT token está ausente", () => {
    const result = loadAuthConfig(
      baseEnv({ INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT: undefined }),
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("CURRENT_TOKEN_MISSING");
  });

  it("error si CURRENT token está mal formado (< 43 chars)", () => {
    const result = loadAuthConfig(
      baseEnv({ INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT: TOKEN_SHORT }),
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("CURRENT_TOKEN_FORMAT_INVALID");
  });

  it("error si CURRENT token no es canónico (round-trip falla)", () => {
    const result = loadAuthConfig(
      baseEnv({ INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT: TOKEN_NONCANON }),
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("CURRENT_TOKEN_FORMAT_INVALID");
  });

  it("error si CURRENT token contiene espacios", () => {
    const tokenWithSpace = TOKEN_A.slice(0, 20) + " " + TOKEN_A.slice(21);
    const result = loadAuthConfig(
      baseEnv({ INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT: tokenWithSpace }),
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("CURRENT_TOKEN_FORMAT_INVALID");
  });

  it("error si CURRENT token contiene salto de línea", () => {
    const tokenWithNl = TOKEN_A.slice(0, 20) + "\n" + TOKEN_A.slice(21);
    const result = loadAuthConfig(
      baseEnv({ INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT: tokenWithNl }),
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("CURRENT_TOKEN_FORMAT_INVALID");
  });

  it("error si CURRENT_VALID_UNTIL está ausente", () => {
    const result = loadAuthConfig(
      baseEnv({
        INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL: undefined,
      }),
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("CURRENT_VALID_UNTIL_MISSING");
  });

  it("error si CURRENT_VALID_UNTIL es una fecha inválida", () => {
    const result = loadAuthConfig(
      baseEnv({
        INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL: "not-a-date",
      }),
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("CURRENT_VALID_UNTIL_INVALID");
  });
});

// ─── Tests: loadAuthConfig — expiración de CURRENT al cargar ─────────────────

describe("loadAuthConfig / expiración CURRENT al cargar", () => {
  it("CURRENT_EXPIRED si CURRENT_VALID_UNTIL <= now al cargar (pasado)", () => {
    const result = loadAuthConfig(
      baseEnv({ INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL: pastIso() }),
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("CURRENT_EXPIRED");
  });

  it("CURRENT_EXPIRED si CURRENT_VALID_UNTIL === now exactamente (borde <= fail closed)", () => {
    const nowExact = new Date("2030-06-01T12:00:00.000Z");
    const result = loadAuthConfig(
      baseEnv({ INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL: nowExact.toISOString() }),
      nowExact,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("CURRENT_EXPIRED");
  });

  it("CURRENT válido al cargar y expirado posteriormente → AUTHENTICATION_REQUIRED en authenticate", async () => {
    // t0=NOW: carga config con CURRENT expirando en t1=NOW+1s
    // t2=NOW+2s: authenticate → expirado
    const expiresAt = new Date(NOW.getTime() + 1_000);
    const later = new Date(NOW.getTime() + 2_000);
    const configResult = loadAuthConfig(
      baseEnv({ INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL: expiresAt.toISOString() }),
      NOW,
    );
    expect(configResult.ok).toBe(true);
    if (configResult.ok) {
      const result = await authenticate(`Bearer ${TOKEN_A}`, configResult.config, later);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error_code).toBe("AUTHENTICATION_REQUIRED");
    }
  });

  it("CURRENT válido y vigente al cargar y en authenticate → autenticación exitosa", async () => {
    const configResult = loadAuthConfig(baseEnv(), NOW);
    expect(configResult.ok).toBe(true);
    if (configResult.ok) {
      const result = await authenticate(`Bearer ${TOKEN_A}`, configResult.config, NOW);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.identity.credential_slot).toBe("current");
    }
  });

  it("PREVIOUS expirado NO invalida la config (solo impide autenticación via ese slot)", () => {
    const result = loadAuthConfig(
      baseEnv({
        INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS: TOKEN_B,
        INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS_VALID_UNTIL: pastIso(),
      }),
      NOW,
    );
    // PREVIOUS expirado → config carga ok; autenticación via PREVIOUS → AUTHENTICATION_REQUIRED
    expect(result.ok).toBe(true);
  });
});

// ─── Tests: loadAuthConfig — PREVIOUS ────────────────────────────────────────

describe("loadAuthConfig / PREVIOUS", () => {
  it("ok sin PREVIOUS configurado (null)", () => {
    const result = loadAuthConfig(baseEnv(), NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.config.previous).toBeNull();
  });

  it("ok con PREVIOUS válido configurado", () => {
    const result = loadAuthConfig(
      baseEnv({
        INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS: TOKEN_B,
        INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS_VALID_UNTIL: futureIso(),
      }),
      NOW,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.previous).not.toBeNull();
      expect(result.config.previous!.token).toBe(TOKEN_B);
    }
  });

  it("error si PREVIOUS token presente pero PREVIOUS_VALID_UNTIL ausente", () => {
    const result = loadAuthConfig(
      baseEnv({ INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS: TOKEN_B }),
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("PREVIOUS_TOKEN_WITHOUT_DATE");
  });

  it("error si PREVIOUS_VALID_UNTIL presente pero PREVIOUS token ausente", () => {
    const result = loadAuthConfig(
      baseEnv({
        INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS_VALID_UNTIL: futureIso(),
      }),
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("PREVIOUS_DATE_WITHOUT_TOKEN");
  });

  it("error si PREVIOUS token es igual a CURRENT token", () => {
    const result = loadAuthConfig(
      baseEnv({
        INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS: TOKEN_A,
        INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS_VALID_UNTIL: futureIso(),
      }),
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("PREVIOUS_TOKEN_EQUALS_CURRENT");
  });

  it("error si PREVIOUS token está mal formado", () => {
    const result = loadAuthConfig(
      baseEnv({
        INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS: TOKEN_SHORT,
        INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS_VALID_UNTIL: futureIso(),
      }),
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("PREVIOUS_TOKEN_FORMAT_INVALID");
  });

  it("error si PREVIOUS_VALID_UNTIL es fecha inválida", () => {
    const result = loadAuthConfig(
      baseEnv({
        INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS: TOKEN_B,
        INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS_VALID_UNTIL: "bad-date",
      }),
      NOW,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toBe("PREVIOUS_VALID_UNTIL_INVALID");
  });
});

// ─── Tests: parseBearerHeader ─────────────────────────────────────────────────

describe("parseBearerHeader — esquema CASE-INSENSITIVE, token CASE-SENSITIVE", () => {
  it("extrae token de header válido con 'Bearer' (mayúscula canónica)", () => {
    expect(parseBearerHeader(`Bearer ${TOKEN_A}`)).toBe(TOKEN_A);
  });

  it("extrae token de header con 'bearer' (minúsculas)", () => {
    expect(parseBearerHeader(`bearer ${TOKEN_A}`)).toBe(TOKEN_A);
  });

  it("extrae token de header con 'BEARER' (mayúsculas)", () => {
    expect(parseBearerHeader(`BEARER ${TOKEN_A}`)).toBe(TOKEN_A);
  });

  it("extrae token de header con 'BeArEr' (casing mixto)", () => {
    expect(parseBearerHeader(`BeArEr ${TOKEN_A}`)).toBe(TOKEN_A);
  });

  it("preserva el casing exacto del token (el token es case-sensitive)", () => {
    // El token se extrae idéntico al input, sin normalización
    expect(parseBearerHeader(`Bearer ${TOKEN_A}`)).toBe(TOKEN_A);
    expect(parseBearerHeader(`bearer ${TOKEN_B}`)).toBe(TOKEN_B);
  });

  it("devuelve null si header es null", () => {
    expect(parseBearerHeader(null)).toBeNull();
  });

  it("devuelve null si header es string vacío", () => {
    expect(parseBearerHeader("")).toBeNull();
  });

  it("devuelve null si esquema es 'Basic' (esquema diferente)", () => {
    expect(parseBearerHeader(`Basic ${TOKEN_A}`)).toBeNull();
  });

  it("devuelve null si 'Bearer' no tiene espacio ni token", () => {
    expect(parseBearerHeader("Bearer")).toBeNull();
  });

  it("devuelve null si token está vacío tras 'Bearer '", () => {
    expect(parseBearerHeader("Bearer ")).toBeNull();
  });

  it("devuelve null si token contiene espacio (múltiples valores)", () => {
    expect(parseBearerHeader(`Bearer ${TOKEN_A} ${TOKEN_B}`)).toBeNull();
  });

  it("devuelve null si token contiene tabulación", () => {
    expect(parseBearerHeader(`Bearer ${TOKEN_A}\t`)).toBeNull();
  });
});

// ─── Tests: safeTokenEqual ────────────────────────────────────────────────────

describe("safeTokenEqual — constant-time (node:crypto + SHA-256)", () => {
  it("retorna true para strings idénticos", async () => {
    expect(await safeTokenEqual(TOKEN_A, TOKEN_A)).toBe(true);
  });

  it("retorna false para strings distintos", async () => {
    expect(await safeTokenEqual(TOKEN_A, TOKEN_B)).toBe(false);
  });

  it("retorna false para strings de longitudes originales distintas", async () => {
    expect(await safeTokenEqual("short", TOKEN_A)).toBe(false);
  });

  it("retorna false para strings con caracteres Unicode distintos", async () => {
    expect(await safeTokenEqual("cañón123", TOKEN_A)).toBe(false);
  });

  it("retorna true para strings Unicode idénticos", async () => {
    expect(await safeTokenEqual("cañón123", "cañón123")).toBe(true);
  });

  it("retorna false para string vacío vs token válido", async () => {
    expect(await safeTokenEqual("", TOKEN_A)).toBe(false);
  });
});

// ─── Tests: authenticate — expiración y matching ─────────────────────────────

describe("authenticate — dual-slot CURRENT / PREVIOUS", () => {
  it("autentica con CURRENT vigente → identidad con slot 'current'", async () => {
    const config = makeValidConfig({
      current: { token: TOKEN_A, validUntil: futureDate() },
    });
    const result = await authenticate(`Bearer ${TOKEN_A}`, config, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.credential_slot).toBe("current");
    }
  });

  it("autentica con PREVIOUS vigente → identidad con slot 'previous'", async () => {
    const config = makeValidConfig({
      previous: { token: TOKEN_B, validUntil: futureDate() },
    });
    const result = await authenticate(`Bearer ${TOKEN_B}`, config, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.credential_slot).toBe("previous");
    }
  });

  it("AUTHENTICATION_REQUIRED si CURRENT expirado", async () => {
    const config = makeValidConfig({
      current: { token: TOKEN_A, validUntil: pastDate() },
    });
    const result = await authenticate(`Bearer ${TOKEN_A}`, config, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("AUTHENTICATION_REQUIRED si PREVIOUS expirado", async () => {
    const config = makeValidConfig({
      previous: { token: TOKEN_B, validUntil: pastDate() },
    });
    const result = await authenticate(`Bearer ${TOKEN_B}`, config, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("AUTHENTICATION_REQUIRED si header ausente", async () => {
    const config = makeValidConfig();
    const result = await authenticate(null, config, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("AUTHENTICATION_REQUIRED si token incorrecto (no coincide con ningún slot)", async () => {
    const config = makeValidConfig();
    const wrongToken = "ZZZZZZZZZZZZZZZZZZZZZZZZZZzzzzzzzzzzzzzzzz";
    const result = await authenticate(`Bearer ${wrongToken}`, config, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("CURRENT expirado con PREVIOUS vigente → AUTHENTICATION_REQUIRED (CURRENT evaluado primero)", async () => {
    const config = makeValidConfig({
      current: { token: TOKEN_A, validUntil: pastDate() },
      previous: { token: TOKEN_B, validUntil: futureDate() },
    });
    const result = await authenticate(`Bearer ${TOKEN_A}`, config, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("AUTHENTICATION_REQUIRED");
  });
});

// ─── Tests: identidad resultante ─────────────────────────────────────────────

describe("identidad — estructura completa", () => {
  it("caller_id es 'smart_conversations'", async () => {
    const config = makeValidConfig();
    const result = await authenticate(`Bearer ${TOKEN_A}`, config, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.identity.caller_id).toBe("smart_conversations");
  });

  it("auth_method es 'opaque_bearer_capability'", async () => {
    const config = makeValidConfig();
    const result = await authenticate(`Bearer ${TOKEN_A}`, config, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.identity.auth_method).toBe("opaque_bearer_capability");
  });

  it("tenant_scope es 'global'", async () => {
    const config = makeValidConfig();
    const result = await authenticate(`Bearer ${TOKEN_A}`, config, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.identity.tenant_scope).toBe("global");
  });

  it("authorized_operations contiene exactamente 'create_incident'", async () => {
    const config = makeValidConfig();
    const result = await authenticate(`Bearer ${TOKEN_A}`, config, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.authorized_operations).toEqual(["create_incident"]);
    }
  });

  it("credential_slot es 'previous' cuando autentica con PREVIOUS", async () => {
    const config = makeValidConfig({
      previous: { token: TOKEN_B, validUntil: futureDate() },
    });
    const result = await authenticate(`Bearer ${TOKEN_B}`, config, NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.identity.credential_slot).toBe("previous");
  });
});

// ─── Tests: authorizeForOperation ────────────────────────────────────────────

describe("authorizeForOperation", () => {
  const baseIdentity = {
    caller_id: "smart_conversations" as const,
    auth_method: "opaque_bearer_capability" as const,
    authorized_operations: ["create_incident"] as const,
    tenant_scope: "global" as const,
    credential_slot: "current" as const,
  };

  it("autoriza 'create_incident'", () => {
    const r = authorizeForOperation(baseIdentity, "create_incident");
    expect(r.ok).toBe(true);
  });

  it("CALLER_NOT_AUTHORIZED para 'update_incident'", () => {
    const r = authorizeForOperation(baseIdentity, "update_incident");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error_code).toBe("CALLER_NOT_AUTHORIZED");
  });

  it("CALLER_NOT_AUTHORIZED para 'delete_incident'", () => {
    const r = authorizeForOperation(baseIdentity, "delete_incident");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error_code).toBe("CALLER_NOT_AUTHORIZED");
  });

  it("CALLER_NOT_AUTHORIZED para operación vacía", () => {
    const r = authorizeForOperation(baseIdentity, "");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error_code).toBe("CALLER_NOT_AUTHORIZED");
  });

  it("CALLER_NOT_AUTHORIZED para operación con mayúsculas incorrectas", () => {
    const r = authorizeForOperation(baseIdentity, "Create_Incident");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error_code).toBe("CALLER_NOT_AUTHORIZED");
  });
});

// ─── Tests: IncidentBearerAuthAdapter ────────────────────────────────────────

describe("IncidentBearerAuthAdapter — wiring e2e (resultado tipado)", () => {
  it("ok: true con config válida, header correcto y operación create_incident", async () => {
    const env = baseEnv();
    const adapter = new IncidentBearerAuthAdapter(env, () => NOW);
    const result = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.caller_id).toBe("smart_conversations");
    }
  });

  it("INTERNAL_ERROR si APP_ENVIRONMENT ausente (config inválida en startup)", async () => {
    const env = baseEnv({ APP_ENVIRONMENT: undefined });
    const adapter = new IncidentBearerAuthAdapter(env, () => NOW);
    const result = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("INTERNAL_ERROR");
  });

  it("INTERNAL_ERROR si CURRENT expirado al construir (CURRENT_EXPIRED en startup)", async () => {
    const env = baseEnv({
      INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL: pastIso(),
    });
    const adapter = new IncidentBearerAuthAdapter(env, () => NOW);
    const result = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("INTERNAL_ERROR");
  });

  it("AUTHENTICATION_REQUIRED si el header Authorization está ausente (null)", async () => {
    const env = baseEnv();
    const adapter = new IncidentBearerAuthAdapter(env, () => NOW);
    const result = await adapter.authenticateAndAuthorize({
      authorizationHeader: null,
      operation: "create_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("AUTHENTICATION_REQUIRED si el header Authorization es string vacío", async () => {
    const env = baseEnv();
    const adapter = new IncidentBearerAuthAdapter(env, () => NOW);
    const result = await adapter.authenticateAndAuthorize({
      authorizationHeader: "",
      operation: "create_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("AUTHENTICATION_REQUIRED");
  });
});

// ─── Tests: privacidad / no-exposure ─────────────────────────────────────────

describe("privacidad — errores no exponen tokens ni valores sensibles", () => {
  it("AuthConfigError no contiene el valor del token inválido", () => {
    const badToken = TOKEN_SHORT;
    const result = loadAuthConfig(
      makeEnvReader({
        APP_ENVIRONMENT: "dev",
        INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT: badToken,
        INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL: futureIso(),
      }),
      NOW,
    );
    expect(result.ok).toBe(false);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(badToken);
    expect(serialized).not.toContain("INCIDENTS_PROVIDER_SERVICE_TOKEN");
  });

  it("AuthResult de fallo no contiene el token candidato", async () => {
    const config = makeValidConfig();
    const candidate = TOKEN_B;
    const result: AuthResult = await authenticate(
      `Bearer ${candidate}`,
      config,
      NOW,
    );
    expect(result.ok).toBe(false);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(candidate);
    expect(serialized).not.toContain(TOKEN_A);
  });

  it("el tipo AuthConfigError solo contiene 'type' y 'reason' (no hay campo 'value')", () => {
    const result = loadAuthConfig(baseEnv({ APP_ENVIRONMENT: "unknown" }), NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const keys = Object.keys(result.error);
      expect(keys).toContain("type");
      expect(keys).toContain("reason");
      expect(keys).not.toContain("value");
      expect(keys).not.toContain("token");
      expect(keys).not.toContain("message");
    }
  });

  it("el tipo AuthResult de fallo solo contiene 'ok' y 'error_code' (no hay 'candidate')", async () => {
    const config = makeValidConfig();
    const result: AuthResult = await authenticate(null, config, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const keys = Object.keys(result);
      expect(keys).toContain("ok");
      expect(keys).toContain("error_code");
      expect(keys).not.toContain("candidate");
      expect(keys).not.toContain("token");
      expect(keys).not.toContain("header");
    }
  });
});

// ─── Tests: lifecycle del adapter con reloj mutable ──────────────────────────
//
// El adapter carga la configuración UNA SOLA VEZ en el constructor (startupNow).
// authenticate() recibe un authenticationNow fresco pero usa la config cacheada.
//
// AUTH-LIFECYCLE-01: CURRENT expirado al construir → null en todos los authenticate()
//   (ya cubierto en "IncidentBearerAuthAdapter / retorna null si CURRENT expirado al cargar config")
//
// AUTH-LIFECYCLE-04: PREVIOUS expirado no invalida config
//   (ya cubierto en "loadAuthConfig / expiración CURRENT al cargar / PREVIOUS expirado NO invalida la config")
//
// AUTH-LIFECYCLE-05: candidato coincide con PREVIOUS expirado → AUTHENTICATION_REQUIRED
//   (ya cubierto en "authenticate — dual-slot / AUTHENTICATION_REQUIRED si PREVIOUS expirado")
//
// AUTH-LIFECYCLE-06: ambos slots comparados antes de decidir
//   (ya cubierto en "authenticate — dual-slot / CURRENT expirado con PREVIOUS vigente")
//
// A continuación: AUTH-LIFECYCLE-02 y 03 via adapter con reloj mutable.

// ─── Tests: puerto tipado — INTERNAL_ERROR, AUTHENTICATION_REQUIRED, CALLER_NOT_AUTHORIZED ──

describe("IncidentCallerAuthPort — cobertura completa resultado tipado", () => {
  // ── INTERNAL_ERROR ───────────────────────────────────────────────────────────

  it("INTERNAL_ERROR: CURRENT token ausente en env", async () => {
    const env = baseEnv({ INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT: undefined });
    const adapter = new IncidentBearerAuthAdapter(env, () => NOW);
    const result: IncidentCallerAuthResult = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("INTERNAL_ERROR");
  });

  it("INTERNAL_ERROR: CURRENT token malformado (no canónico)", async () => {
    const env = baseEnv({ INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT: TOKEN_NONCANON });
    const adapter = new IncidentBearerAuthAdapter(env, () => NOW);
    const result: IncidentCallerAuthResult = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_NONCANON}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("INTERNAL_ERROR");
  });

  it("INTERNAL_ERROR: CURRENT expirado al construir el adapter", async () => {
    const env = baseEnv({ INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL: pastIso() });
    const adapter = new IncidentBearerAuthAdapter(env, () => NOW);
    const result: IncidentCallerAuthResult = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("INTERNAL_ERROR");
  });

  it("INTERNAL_ERROR: par PREVIOUS incoherente (token sin VALID_UNTIL)", async () => {
    const env = baseEnv({ INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS: TOKEN_B });
    const adapter = new IncidentBearerAuthAdapter(env, () => NOW);
    const result: IncidentCallerAuthResult = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("INTERNAL_ERROR");
  });

  it("INTERNAL_ERROR no expone AuthConfigError.reason al caller", async () => {
    const env = baseEnv({ APP_ENVIRONMENT: undefined });
    const adapter = new IncidentBearerAuthAdapter(env, () => NOW);
    const result: IncidentCallerAuthResult = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const keys = Object.keys(result);
      // Solo 'ok' y 'error_code'; ni 'reason' ni 'message' ni 'details'
      expect(keys).toContain("ok");
      expect(keys).toContain("error_code");
      expect(keys).not.toContain("reason");
      expect(keys).not.toContain("message");
      expect(keys).not.toContain("details");
    }
  });

  // ── AUTHENTICATION_REQUIRED ──────────────────────────────────────────────────

  it("AUTHENTICATION_REQUIRED: header Authorization ausente (null)", async () => {
    const adapter = new IncidentBearerAuthAdapter(baseEnv(), () => NOW);
    const result: IncidentCallerAuthResult = await adapter.authenticateAndAuthorize({
      authorizationHeader: null,
      operation: "create_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("AUTHENTICATION_REQUIRED: token incorrecto (no coincide con ningún slot)", async () => {
    const adapter = new IncidentBearerAuthAdapter(baseEnv(), () => NOW);
    const wrongToken = "ZZZZZZZZZZZZZZZZZZZZZZZZZZzzzzzzzzzzzzzzzz";
    const result: IncidentCallerAuthResult = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${wrongToken}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("AUTHENTICATION_REQUIRED: CURRENT válido al cargar, expirado al authenticateAndAuthorize", async () => {
    const startup = new Date("2030-07-01T10:00:00.000Z");
    const expiry  = new Date("2030-07-01T11:00:00.000Z");
    const authAt  = new Date("2030-07-01T12:00:00.000Z");
    let clockValue = startup;
    const env = makeEnvReader({
      APP_ENVIRONMENT: "dev",
      INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT: TOKEN_A,
      INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL: expiry.toISOString(),
    });
    const adapter = new IncidentBearerAuthAdapter(env, () => clockValue);
    clockValue = authAt;
    const result: IncidentCallerAuthResult = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("AUTHENTICATION_REQUIRED: candidato coincide con PREVIOUS expirado", async () => {
    const config = makeValidConfig({
      previous: { token: TOKEN_B, validUntil: pastDate() },
    });
    const result = await authenticate(`Bearer ${TOKEN_B}`, config, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("AUTHENTICATION_REQUIRED");
  });

  // ── CALLER_NOT_AUTHORIZED ────────────────────────────────────────────────────

  it("CALLER_NOT_AUTHORIZED: token válido + operación desconocida (via puerto atómico)", async () => {
    const adapter = new IncidentBearerAuthAdapter(baseEnv(), () => NOW);
    const result: IncidentCallerAuthResult = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "delete_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("CALLER_NOT_AUTHORIZED");
  });

  it("autorización exitosa: token válido + create_incident (via puerto atómico)", async () => {
    const adapter = new IncidentBearerAuthAdapter(baseEnv(), () => NOW);
    const result: IncidentCallerAuthResult = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.caller_id).toBe("smart_conversations");
    }
  });

  // ── Identidad exacta ─────────────────────────────────────────────────────────

  it("identidad exacta slot current: todos los campos correctos", async () => {
    const adapter = new IncidentBearerAuthAdapter(baseEnv(), () => NOW);
    const result: IncidentCallerAuthResult = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.caller_id).toBe("smart_conversations");
      expect(result.identity.auth_method).toBe("opaque_bearer_capability");
      expect(result.identity.authorized_operations).toEqual(["create_incident"]);
      expect(result.identity.tenant_scope).toBe("global");
      expect(result.identity.credential_slot).toBe("current");
    }
  });

  it("identidad exacta slot previous: credential_slot = previous", async () => {
    const env = baseEnv({
      INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS: TOKEN_B,
      INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS_VALID_UNTIL: futureIso(),
    });
    const adapter = new IncidentBearerAuthAdapter(env, () => NOW);
    const result: IncidentCallerAuthResult = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_B}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.credential_slot).toBe("previous");
      expect(result.identity.caller_id).toBe("smart_conversations");
    }
  });

  // ── Garantías estructurales del resultado ────────────────────────────────────

  it("ningún resultado es null — ok false tiene error_code", async () => {
    const adapter = new IncidentBearerAuthAdapter(baseEnv(), () => NOW);
    const result: IncidentCallerAuthResult = await adapter.authenticateAndAuthorize({
      authorizationHeader: null,
      operation: "create_incident",
    });
    // El resultado tiene forma discriminada, nunca null
    expect(result).not.toBeNull();
    expect(typeof result.ok).toBe("boolean");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(typeof result.error_code).toBe("string");
    }
  });

  it("ningún resultado ok: true es null — identity está presente", async () => {
    const adapter = new IncidentBearerAuthAdapter(baseEnv(), () => NOW);
    const result: IncidentCallerAuthResult = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    expect(result).not.toBeNull();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity).not.toBeNull();
      expect(typeof result.identity.caller_id).toBe("string");
    }
  });
});

// ─── Tests: lifecycle del adapter con reloj mutable ──────────────────────────

describe("IncidentBearerAuthAdapter — lifecycle AUTH-LIFECYCLE-02 y 03 (reloj mutable)", () => {
  it("AUTH-LIFECYCLE-02: CURRENT vigente en startup y en authenticate → ok: true, credential_slot=current", async () => {
    // startup: 10:00, expiry: 12:00, authAt: 11:00 (antes de expirar)
    const startup = new Date("2030-06-01T10:00:00.000Z");
    const expiry  = new Date("2030-06-01T12:00:00.000Z");
    const authAt  = new Date("2030-06-01T11:00:00.000Z");

    let clockValue = startup;
    const env = makeEnvReader({
      APP_ENVIRONMENT: "dev",
      INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT: TOKEN_A,
      INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL: expiry.toISOString(),
    });

    const adapter = new IncidentBearerAuthAdapter(env, () => clockValue);

    clockValue = authAt;
    const result = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.credential_slot).toBe("current");
    }
  });

  it("AUTH-LIFECYCLE-03: CURRENT válido en startup, expirado al authenticateAndAuthorize → AUTHENTICATION_REQUIRED (no INTERNAL_ERROR)", async () => {
    // startup: 10:00, expiry: 11:00, authAt: 13:00 (dos horas después de expirar)
    const startup = new Date("2030-06-01T10:00:00.000Z");
    const expiry  = new Date("2030-06-01T11:00:00.000Z");
    const authAt  = new Date("2030-06-01T13:00:00.000Z");

    let clockValue = startup;
    const env = makeEnvReader({
      APP_ENVIRONMENT: "dev",
      INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT: TOKEN_A,
      INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL: expiry.toISOString(),
    });

    // startup < expiry → config válida en constructor
    const adapter = new IncidentBearerAuthAdapter(env, () => clockValue);

    // Startup: debe autenticar y autorizar
    const resultAtStartup = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    expect(resultAtStartup.ok, "debe autenticar en startup").toBe(true);

    clockValue = authAt; // avanzar reloj más allá de la expiración
    // Config cacheada (ok=true); authenticate(header, config, authAt) → authAt >= expiry → AUTHENTICATION_REQUIRED
    // NO recarga config → no produce CURRENT_EXPIRED → no INTERNAL_ERROR
    const resultAfterExpiry = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    expect(resultAfterExpiry.ok, "debe fallar post-expiración").toBe(false);
    if (!resultAfterExpiry.ok) {
      expect(resultAfterExpiry.error_code, "debe ser AUTHENTICATION_REQUIRED, no INTERNAL_ERROR").toBe("AUTHENTICATION_REQUIRED");
    }
  });
});

// ─── Tests: authenticateAndAuthorize — puerto atómico ────────────────────────
//
// Garantía central del módulo SI-P3B2A:
//   ok: true NUNCA se devuelve sin haber verificado request.operation.
//   El endpoint en SI-P3B2B no necesita (ni debe) llamar a autorización por separado.
//   Un solo método = una sola frontera = imposible saltarse la autorización.

describe("IncidentCallerAuthPort — authenticateAndAuthorize (atómica)", () => {
  it("CURRENT válido + create_incident → ok: true, identidad completa", async () => {
    const adapter = new IncidentBearerAuthAdapter(baseEnv(), () => NOW);
    const result = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.caller_id).toBe("smart_conversations");
      expect(result.identity.credential_slot).toBe("current");
      expect(result.identity.authorized_operations).toEqual(["create_incident"]);
    }
  });

  it("PREVIOUS vigente + create_incident → ok: true, credential_slot=previous", async () => {
    const env = baseEnv({
      INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS: TOKEN_B,
      INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS_VALID_UNTIL: futureIso(),
    });
    const adapter = new IncidentBearerAuthAdapter(env, () => NOW);
    const result = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_B}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identity.credential_slot).toBe("previous");
    }
  });

  it("CURRENT válido + update_incident → CALLER_NOT_AUTHORIZED", async () => {
    const adapter = new IncidentBearerAuthAdapter(baseEnv(), () => NOW);
    const result = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "update_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("CALLER_NOT_AUTHORIZED");
  });

  it("CURRENT válido + delete_incident → CALLER_NOT_AUTHORIZED", async () => {
    const adapter = new IncidentBearerAuthAdapter(baseEnv(), () => NOW);
    const result = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "delete_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("CALLER_NOT_AUTHORIZED");
  });

  it("CURRENT válido + operación vacía → CALLER_NOT_AUTHORIZED", async () => {
    const adapter = new IncidentBearerAuthAdapter(baseEnv(), () => NOW);
    const result = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("CALLER_NOT_AUTHORIZED");
  });

  it("CURRENT válido + 'CREATE_INCIDENT' (case-sensitive) → CALLER_NOT_AUTHORIZED", async () => {
    const adapter = new IncidentBearerAuthAdapter(baseEnv(), () => NOW);
    const result = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "CREATE_INCIDENT",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("CALLER_NOT_AUTHORIZED");
  });

  it("token incorrecto + create_incident → AUTHENTICATION_REQUIRED (falla antes de llegar a authz)", async () => {
    const adapter = new IncidentBearerAuthAdapter(baseEnv(), () => NOW);
    const result = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_B}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("token expirado post-startup + create_incident → AUTHENTICATION_REQUIRED", async () => {
    const startup = new Date("2030-08-01T09:00:00.000Z");
    const expiry  = new Date("2030-08-01T10:00:00.000Z");
    const authAt  = new Date("2030-08-01T11:00:00.000Z");
    let clockValue = startup;
    const env = makeEnvReader({
      APP_ENVIRONMENT: "staging",
      INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT: TOKEN_A,
      INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL: expiry.toISOString(),
    });
    const adapter = new IncidentBearerAuthAdapter(env, () => clockValue);
    clockValue = authAt;
    const result = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("config inválida (APP_ENVIRONMENT ausente) + create_incident → INTERNAL_ERROR", async () => {
    const adapter = new IncidentBearerAuthAdapter(
      baseEnv({ APP_ENVIRONMENT: undefined }),
      () => NOW,
    );
    const result = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error_code).toBe("INTERNAL_ERROR");
  });

  it("ningún resultado de authenticateAndAuthorize es null — forma discriminada siempre presente", async () => {
    const adapter = new IncidentBearerAuthAdapter(baseEnv(), () => NOW);
    const results = await Promise.all([
      adapter.authenticateAndAuthorize({ authorizationHeader: null, operation: "create_incident" }),
      adapter.authenticateAndAuthorize({ authorizationHeader: `Bearer ${TOKEN_A}`, operation: "create_incident" }),
      adapter.authenticateAndAuthorize({ authorizationHeader: `Bearer ${TOKEN_A}`, operation: "bad_op" }),
    ]);
    for (const r of results) {
      expect(r).not.toBeNull();
      expect(typeof r.ok).toBe("boolean");
    }
  });

  it("operación no autorizada no devuelve identidad (ok: false no tiene campo identity)", async () => {
    const adapter = new IncidentBearerAuthAdapter(baseEnv(), () => NOW);
    const result = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "update_incident",
    });
    expect(result.ok).toBe(false);
    // El resultado de error no tiene campo identity
    expect("identity" in result).toBe(false);
  });

  it("resultado no contiene token, hash, fechas ni razones internas", async () => {
    const adapter = new IncidentBearerAuthAdapter(baseEnv(), () => NOW);
    const result = await adapter.authenticateAndAuthorize({
      authorizationHeader: `Bearer ${TOKEN_A}`,
      operation: "create_incident",
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(TOKEN_A);
    expect(serialized).not.toContain("INCIDENTS_PROVIDER_SERVICE_TOKEN");
    expect(serialized).not.toContain("reason");
  });
});
