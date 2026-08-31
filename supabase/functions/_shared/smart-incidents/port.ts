/**
 * port.ts — Puertos mínimos para desacoplar el futuro endpoint provider.
 * Fuente: contract-create-incident-request.md §4 / §12
 *
 * Sin adapters concretos. Sin persistencia. Sin autenticación real.
 * El endpoint HTTP se formaliza en SI-P3B.
 * Los adapters de dominio (entitlement, requester, accommodation) se implementan en SI-P4.
 * La persistencia e idempotencia durable se implementan en SI-P5.
 *
 * Estado: DESIGNED_NOT_IMPLEMENTED
 */

import type { CreateIncidentRequestV1, ProviderErrorCode } from './types.ts';

// ─── Resultado de dominio mínimo ──────────────────────────────────────────────

export interface CreateIncidentSuccess {
  incident_id: string;
  incident_reference: string | null;
  created_at: string;
  idempotent_replay: boolean;
}

export interface CreateIncidentFailure {
  error_code: ProviderErrorCode;
  message: string;
}

export type CreateIncidentDomainResult =
  | { ok: true; data: CreateIncidentSuccess }
  | { ok: false; error: CreateIncidentFailure };

// ─── Puerto principal ─────────────────────────────────────────────────────────

/**
 * CreateIncidentProviderUseCase — puerto neutral del caso de uso de creación.
 *
 * Acepta un request ya validado por validateCreateIncidentRequest().
 * Devuelve un resultado de dominio o un error tipado.
 *
 * Pendiente de implementar en SI-P4 (domain validation) + SI-P5 (persistence).
 * Estado: DESIGNED_NOT_IMPLEMENTED
 */
export interface CreateIncidentProviderUseCase {
  execute(request: CreateIncidentRequestV1): Promise<CreateIncidentDomainResult>;
}

// ─── Tipos de autenticación — implementado en SI-P3B2A ───────────────────────

/**
 * Identidad del caller autenticado vía opaque bearer capability.
 * Implementado en SI-P3B2A. Adapter concreto: IncidentBearerAuthAdapter.
 *
 * Estado: INCIDENT_AUTH_IMPLEMENTED_OFFLINE (SI-P3B2A)
 */
export interface IncidentProviderCallerIdentity {
  /** Identificador del sistema caller. Valor fijo: "smart_conversations". */
  readonly caller_id: "smart_conversations";
  /** Mecanismo de autenticación implementado en SI-P3B2A. */
  readonly auth_method: "opaque_bearer_capability";
  /** Operaciones autorizadas para este caller. Inmutable en v1.0. */
  readonly authorized_operations: readonly ["create_incident"];
  /** Alcance de tenant. El caller está autorizado para todos los tenants. */
  readonly tenant_scope: "global";
  /** Slot de credencial usado en esta autenticación (CURRENT o PREVIOUS). */
  readonly credential_slot: "current" | "previous";
}

// ─── Request tipado del puerto de autenticación ──────────────────────────────

/**
 * Request del puerto de autenticación y autorización del caller.
 *
 * Contiene únicamente los datos necesarios para autenticar al caller técnico
 * y autorizar la operación solicitada.
 * No incluye body de incidencia, tenant, entitlement, requester, accommodation
 * ni objetos HTTP completos.
 *
 * En SI-P3B2A (offline): authorizationHeader viene del campo del request opaco.
 * En SI-P3B2B (endpoint HTTP): authorizationHeader vendrá de Request.headers.get("authorization").
 * Estado: AUTH_REQUEST_TYPE_DEFINED (SI-P3B2A)
 */
export interface IncidentCallerAuthRequest {
  /** Valor del header Authorization recibido. null si el header está ausente. */
  readonly authorizationHeader: string | null;
  /** Operación solicitada por el caller. Debe ser exactamente "create_incident" en v1.0. */
  readonly operation: string;
}

// ─── Resultado tipado del puerto de autenticación ────────────────────────────

/**
 * Códigos de error del puerto de autenticación del caller.
 *
 * INTERNAL_ERROR      — configuración inválida al cargar (startup fail-closed).
 * AUTHENTICATION_REQUIRED — credencial ausente, incorrecta o expirada post-startup.
 * CALLER_NOT_AUTHORIZED   — credencial válida pero operación no permitida.
 *
 * Mapeo HTTP futuro (SI-P3B2B): INTERNAL_ERROR→500, AUTHENTICATION_REQUIRED→401, CALLER_NOT_AUTHORIZED→403.
 * Estado: AUTH_RESULT_TYPE_DEFINED (SI-P3B2A)
 */
export type IncidentCallerAuthErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "CALLER_NOT_AUTHORIZED"
  | "INTERNAL_ERROR";

/**
 * Resultado discriminado del puerto de autenticación.
 * Nunca devuelve null. El endpoint distingue los tres error codes para el status HTTP correcto.
 * Estado: AUTH_RESULT_TYPE_DEFINED (SI-P3B2A)
 */
export type IncidentCallerAuthResult =
  | { readonly ok: true; readonly identity: IncidentProviderCallerIdentity }
  | { readonly ok: false; readonly error_code: IncidentCallerAuthErrorCode };

/**
 * Puerto de autenticación y autorización del caller.
 * Adapter concreto: IncidentBearerAuthAdapter (auth-adapter.ts).
 *
 * El método authenticateAndAuthorize garantiza que ok: true NUNCA se devuelve
 * sin haber validado la operación. La verificación de autorización es parte
 * atómica e inseparable de la autenticación — el endpoint no necesita
 * (ni debe) realizar una llamada de autorización separada.
 *
 * Flujo obligatorio (implementado en IncidentBearerAuthAdapter):
 *   1. Validar configuración → INTERNAL_ERROR si falla.
 *   2. Parsear Authorization header → AUTHENTICATION_REQUIRED si ausente/malformado.
 *   3. Comparar candidate contra CURRENT y PREVIOUS (ambos, siempre).
 *   4. Validar expiración del slot que coincide.
 *   5. Construir identidad del caller.
 *   6. Comprobar que request.operation está en identity.authorized_operations.
 *   7. Devolver { ok: true, identity } SOLO si la operación está autorizada.
 *
 * Estado: AUTH_PORT_ATOMIC_IMPLEMENTED (SI-P3B2A)
 */
export interface IncidentCallerAuthPort {
  /**
   * Autentica al caller Y autoriza la operación en un único paso atómico.
   * Nunca devuelve null. Devuelve IncidentCallerAuthResult con ok: true/false.
   * ok: false → error_code indica INTERNAL_ERROR, AUTHENTICATION_REQUIRED, o CALLER_NOT_AUTHORIZED.
   */
  authenticateAndAuthorize(
    request: IncidentCallerAuthRequest,
  ): Promise<IncidentCallerAuthResult>;
}
