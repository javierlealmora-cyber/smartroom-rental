/**
 * auth-adapter.ts — Adapter concreto del puerto IncidentCallerAuthPort para
 * el módulo provider de Smart Incidents.
 *
 * Patrón: DEDICATED_OPAQUE_BEARER_CAPABILITY_PER_ENVIRONMENT.
 * Modelo: CALLER_GLOBAL_AUTHORIZED_FOR_CREATE_INCIDENT.
 * Dual-slot: CURRENT + PREVIOUS para rotación de credencial sin downtime.
 *
 * Esquema Bearer: CASE-INSENSITIVE (HTTP/1.1 RFC 7235). El token se preserva tal cual.
 *
 * Compara siempre contra ambos slots antes de evaluar el resultado,
 * evitando retorno prematuro que permitiría inferencia de timing.
 *
 * OFFLINE: Sin HTTP, sin Deno.serve, sin CORS, sin body parsing, sin persistencia,
 *          sin entitlement, sin service_role, sin inc_activities.
 * Estado: INCIDENT_BEARER_AUTH_ADAPTER_IMPLEMENTED_OFFLINE
 */

import type {
  IncidentCallerAuthPort,
  IncidentCallerAuthRequest,
  IncidentCallerAuthResult,
  IncidentProviderCallerIdentity,
} from './port.ts';
import type { AuthConfig, EnvReader } from './auth-config.ts';
import { loadAuthConfig } from './auth-config.ts';
import { safeTokenEqual } from './constant-time.ts';

// ─── Tipos de resultado de autenticación ─────────────────────────────────────

/**
 * Código de error interno del módulo de autenticación.
 * Subset de ProviderErrorCode. No añadir códigos nuevos en SI-P3B2A.
 */
export type AuthErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "CALLER_NOT_AUTHORIZED"
  | "INTERNAL_ERROR";

export type AuthResult =
  | { readonly ok: true; readonly identity: IncidentProviderCallerIdentity }
  | { readonly ok: false; readonly error_code: AuthErrorCode };

// ─── Parsing del header Authorization ────────────────────────────────────────

/**
 * Extrae el token Bearer del valor del header Authorization.
 *
 * Esquema: case-insensitive (HTTP/1.1 RFC 7235). Bearer/bearer/BEARER son equivalentes.
 * Token: exactamente un espacio después del esquema; se preserva su casing exacto.
 * Si el token está vacío o contiene whitespace → null.
 *
 * No registra el valor del header.
 */
export function parseBearerHeader(header: string | null): string | null {
  if (!header) return null;
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7);
  if (!token || /\s/.test(token)) return null;
  return token;
}

// ─── Autenticación interna ────────────────────────────────────────────────────

/**
 * Autentica una request dado el valor del header Authorization, la configuración
 * cargada y el instante de referencia (now).
 *
 * Flujo:
 * 1. Parsear Bearer token del header → null si ausente/malformado.
 * 2. Comparar candidate contra CURRENT (siempre).
 * 3. Comparar candidate contra PREVIOUS (siempre si está configurado).
 * 4. Evaluar resultado tras completar TODAS las comparaciones.
 *
 * El paso 4 ocurre después de ambas comparaciones para homogeneizar la duración
 * y evitar que un retorno prematuro permita inferir qué slot coincidió.
 *
 * Expiración: si CURRENT matchea pero now >= validUntil → AUTHENTICATION_REQUIRED.
 * Mismo tratamiento para PREVIOUS.
 *
 * No registra candidate, tokens configurados ni digests.
 */
export async function authenticate(
  authorizationHeader: string | null,
  config: AuthConfig,
  now: Date,
): Promise<AuthResult> {
  const candidate = parseBearerHeader(authorizationHeader);
  if (candidate === null) {
    return { ok: false, error_code: "AUTHENTICATION_REQUIRED" };
  }

  // Comparar ambos slots antes de evaluar cualquier resultado
  const matchesCurrent = await safeTokenEqual(candidate, config.current.token);
  let matchesPrevious = false;
  if (config.previous !== null) {
    matchesPrevious = await safeTokenEqual(candidate, config.previous.token);
  }

  // Evaluar resultado tras completar todas las comparaciones
  if (matchesCurrent) {
    if (now < config.current.validUntil) {
      return {
        ok: true,
        identity: {
          caller_id: "smart_conversations",
          auth_method: "opaque_bearer_capability",
          authorized_operations: ["create_incident"] as const,
          tenant_scope: "global",
          credential_slot: "current",
        },
      };
    }
    // CURRENT coincide pero está expirado
    return { ok: false, error_code: "AUTHENTICATION_REQUIRED" };
  }

  if (matchesPrevious && config.previous !== null) {
    if (now < config.previous.validUntil) {
      return {
        ok: true,
        identity: {
          caller_id: "smart_conversations",
          auth_method: "opaque_bearer_capability",
          authorized_operations: ["create_incident"] as const,
          tenant_scope: "global",
          credential_slot: "previous",
        },
      };
    }
    // PREVIOUS coincide pero está expirado
    return { ok: false, error_code: "AUTHENTICATION_REQUIRED" };
  }

  // Ningún slot coincide
  return { ok: false, error_code: "AUTHENTICATION_REQUIRED" };
}

// ─── Autorización de operación ────────────────────────────────────────────────

/**
 * Verifica que la identidad autenticada está autorizada para la operación solicitada.
 * Rechaza con CALLER_NOT_AUTHORIZED cualquier operación no incluida en
 * identity.authorized_operations.
 *
 * El módulo solo autoriza "create_incident" para este caller.
 */
export function authorizeForOperation(
  identity: IncidentProviderCallerIdentity,
  operation: string,
): { ok: true } | { ok: false; error_code: "CALLER_NOT_AUTHORIZED" } {
  const ops = identity.authorized_operations as readonly string[];
  if (!ops.includes(operation)) {
    return { ok: false, error_code: "CALLER_NOT_AUTHORIZED" };
  }
  return { ok: true };
}

// ─── Adapter del puerto ───────────────────────────────────────────────────────

/**
 * Adapter concreto del puerto IncidentCallerAuthPort.
 *
 * Lifecycle de configuración (AUTH_CONFIG_SNAPSHOT_PER_ADAPTER_INSTANCE):
 *   loadAuthConfig se invoca UNA SOLA VEZ en el constructor con getClock() como startupNow.
 *   Si CURRENT_VALID_UNTIL <= startupNow → configResult.ok = false → INTERNAL_ERROR.
 *   authenticateAndAuthorize() usa la configuración inmutable; nunca la recarga.
 *   Si CURRENT expira después de la carga válida → AUTHENTICATION_REQUIRED, no INTERNAL_ERROR.
 *
 * authenticateAndAuthorize() garantiza que ok: true NUNCA se devuelve sin verificar
 * que request.operation está en identity.authorized_operations (flujo atómico).
 *
 * Dependencias inyectables:
 * - envReader: abstrae Deno.env para testabilidad.
 * - getClock: devuelve el instante de referencia; llamado en constructor (startupNow)
 *             y en cada authenticateAndAuthorize() (authenticationNow).
 */
export class IncidentBearerAuthAdapter implements IncidentCallerAuthPort {
  private readonly configResult: ReturnType<typeof loadAuthConfig>;

  constructor(
    envReader: EnvReader,
    private readonly getClock: () => Date,
  ) {
    // Carga única. startupNow = getClock() en el momento de construcción.
    this.configResult = loadAuthConfig(envReader, getClock());
  }

  async authenticateAndAuthorize(
    request: IncidentCallerAuthRequest,
  ): Promise<IncidentCallerAuthResult> {
    // Paso 1: configuración inválida en startup → INTERNAL_ERROR
    if (!this.configResult.ok) {
      return { ok: false, error_code: "INTERNAL_ERROR" };
    }

    // Pasos 2–5: parsear header, comparar slots, validar expiración, construir identidad
    const now = this.getClock();
    const authResult = await authenticate(
      request.authorizationHeader,
      this.configResult.config,
      now,
    );

    if (!authResult.ok) {
      return { ok: false, error_code: authResult.error_code };
    }

    // Paso 6: comprobar operación — nunca se devuelve ok: true sin esta verificación
    const authzResult = authorizeForOperation(authResult.identity, request.operation);
    if (!authzResult.ok) {
      return { ok: false, error_code: "CALLER_NOT_AUTHORIZED" };
    }

    // Paso 7: éxito solo si autenticación Y autorización pasan
    return { ok: true, identity: authResult.identity };
  }
}
