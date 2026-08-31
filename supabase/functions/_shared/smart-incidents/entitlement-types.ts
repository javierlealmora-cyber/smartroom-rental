/**
 * entitlement-types.ts — Tipos de la frontera offline de entitlement del provider SI.
 *
 * Define el contrato runtime neutral de consulta de entitlement:
 *   - Request de consulta (sin token, sin actor HTTP, sin campos de dominio)
 *   - Snapshot de tres gates independientes
 *   - Resultado del puerto de infraestructura
 *   - Decisión de política pura
 *   - Resultado del check atómico
 *
 * Sin adapters concretos. Sin Supabase. Sin service_role. Sin tablas de SmartConversations.
 * La fuente concreta del snapshot (read model, RPC, adapter) se decide en un lote posterior.
 *
 * Regla de precedencia:
 *   rules-10-addon-entitlement.md > contract-create-incident-request.md §8.3 > este fichero.
 *
 * Estado: INCIDENT_ENTITLEMENT_PORT_DEFINED_OFFLINE
 */

// ─── Request de entitlement ───────────────────────────────────────────────────

/**
 * Request tipado neutral para consultar el entitlement del tenant.
 *
 * Contiene exclusivamente los datos necesarios para la consulta de política:
 *   - client_account_id: identificador del tenant (UUID)
 *   - operation: operación que se quiere ejecutar
 *   - source_channel: canal de origen de la solicitud
 *
 * No incluye:
 *   - token de autenticación ni Authorization header
 *   - actor HTTP ni identidad del caller
 *   - requester_profile_id
 *   - accommodation_id ni room_id
 *   - payload completo del request provider
 *   - tablas de SmartConversations ni objetos Supabase
 *
 * El entitlement no valida pertenencia de recursos (esa es la capa de dominio).
 */
export interface IncidentEntitlementCheckRequest {
  /** UUID del tenant. Vinculado al caller autenticado antes de llegar al entitlement. */
  readonly client_account_id: string;
  /** Operación solicitada. En v1.0, siempre "create_incident". */
  readonly operation: "create_incident";
  /** Canal de origen de la solicitud conversacional. */
  readonly source_channel: "whatsapp" | "webchat";
}

// ─── Snapshot de gates ────────────────────────────────────────────────────────

/**
 * Snapshot con los tres gates independientes de entitlement.
 *
 * Cada gate es un booleano independiente; un único booleano consolidado
 * impediría auditar y probar la política de forma granular.
 *
 * Los nombres de los campos corresponden a la política definida en §1 de SI-P4A.
 * La fuente de datos de cada gate (tablas, read model, RPC) se define en el adapter
 * de infraestructura — no en este tipo.
 */
export interface IncidentEntitlementSnapshot {
  /**
   * El tenant tiene el add-on smart_incidents contratado y activo.
   * Fuente canónica: saas_service_subscriptions WHERE code = 'smart_incidents' AND status = 'active'.
   * (Fuente: rules-10 §4.2)
   */
  readonly smart_incidents_subscription_active: boolean;
  /**
   * La integración de creación de incidencias desde conversaciones está activa.
   * No se accede a tablas de SmartConversations. La fuente es un read model neutral.
   */
  readonly incident_creation_capability_active: boolean;
  /**
   * El canal solicitado (whatsapp o webchat) está habilitado para este tenant.
   * No se accede a tablas de SmartConversations. La fuente es un read model neutral.
   */
  readonly source_channel_active: boolean;
}

// ─── Resultado del puerto ─────────────────────────────────────────────────────

/**
 * Resultado discriminado del puerto de consulta de entitlement.
 *
 * ok: true  → snapshot válido con los tres gates.
 * ok: false → fallo técnico de infraestructura.
 *
 * FEATURE_DISABLED no puede ser un resultado del puerto:
 *   es una decisión de política construida a partir de un snapshot válido.
 *   Si el adapter devolviera FEATURE_DISABLED, ocultaría indisponibilidad
 *   como configuración del tenant (prohibido).
 *
 * (Fuente: SI-P4A §6)
 */
export type IncidentEntitlementPortResult =
  | { readonly ok: true; readonly snapshot: IncidentEntitlementSnapshot }
  | {
      readonly ok: false;
      readonly error_code: "DEPENDENCY_UNAVAILABLE" | "INTERNAL_ERROR";
    };

// ─── Decisión de política ─────────────────────────────────────────────────────

/**
 * Resultado de la evaluación pura de los tres gates.
 *
 * ok: true          → todos los gates activos.
 * ok: false         → al menos un gate inactivo → FEATURE_DISABLED.
 *
 * No revela cuál gate falló (opacidad: §11 de SI-P4A).
 * (Fuente: SI-P4A §7)
 */
export type IncidentEntitlementDecision =
  | { readonly ok: true }
  | { readonly ok: false; readonly error_code: "FEATURE_DISABLED" };

// ─── Resultado del check atómico ──────────────────────────────────────────────

/**
 * Resultado final del check atómico de entitlement (checkIncidentEntitlement).
 *
 * Combina el resultado de política con los posibles fallos técnicos:
 *   ok: true                   → entitlement activo
 *   FEATURE_DISABLED           → al menos un gate inactivo
 *   DEPENDENCY_UNAVAILABLE     → infraestructura del port no disponible
 *   INTERNAL_ERROR             → fallo de configuración, input inválido o excepción inesperada
 *
 * (Fuente: SI-P4A §8)
 */
export type IncidentEntitlementCheckResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly error_code:
        | "FEATURE_DISABLED"
        | "DEPENDENCY_UNAVAILABLE"
        | "INTERNAL_ERROR";
    };
