/**
 * entitlement-port.ts — Puerto neutral de consulta de entitlement del provider SI.
 *
 * Define el contrato de infraestructura que cualquier adapter futuro debe satisfacer
 * para proveer el snapshot de gates de entitlement.
 *
 * Sin adapters concretos. Sin Supabase. Sin service_role. Sin tablas de SmartConversations.
 * El adapter concreto (read model, RPC, tabla) se implementa en un lote posterior.
 *
 * (Fuente: SI-P4A §5)
 * Estado: INCIDENT_ENTITLEMENT_PORT_DEFINED_OFFLINE
 */

import type {
  IncidentEntitlementCheckRequest,
  IncidentEntitlementPortResult,
} from './entitlement-types.ts';

// ─── Puerto ───────────────────────────────────────────────────────────────────

/**
 * Puerto neutral de consulta de entitlement.
 *
 * El método getEntitlementSnapshot:
 *   - Recibe un request tipado con exactamente tres campos (§4 de SI-P4A).
 *   - Devuelve un snapshot con los tres gates o un código de error técnico.
 *   - NUNCA devuelve FEATURE_DISABLED (esa es una decisión de política, no del port).
 *   - El adapter no evalúa la política; solo provee datos.
 *
 * Contratos del puerto:
 *   1. ok: true  → snapshot completo, los tres gates presentes.
 *   2. ok: false → error técnico (DEPENDENCY_UNAVAILABLE o INTERNAL_ERROR).
 *   3. El port no lanza excepciones intencionalmente; si lo hace, el caller las captura.
 *
 * (Fuente: SI-P4A §5)
 */
export interface IncidentEntitlementPort {
  /**
   * Consulta el snapshot de entitlement para el tenant y la operación dada.
   *
   * @param request Request tipado con client_account_id, operation, source_channel.
   * @returns Resultado discriminado: snapshot o error técnico.
   */
  getEntitlementSnapshot(
    request: IncidentEntitlementCheckRequest,
  ): Promise<IncidentEntitlementPortResult>;
}
