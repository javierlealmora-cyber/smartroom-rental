/**
 * entitlement-policy.ts — Política pura de gating y check atómico de entitlement.
 *
 * Implementa dos funciones exportadas:
 *
 *   evaluateIncidentEntitlement(snapshot) → IncidentEntitlementDecision
 *     Función pura. Sin E/S. Sin efectos secundarios.
 *     Evalúa los tres gates booleanos del snapshot y devuelve la decisión de política.
 *
 *   checkIncidentEntitlement(request, port) → Promise<IncidentEntitlementCheckResult>
 *     Función atómica. Valida el request, invoca el port una vez, evalúa la política.
 *     Mapea fallos técnicos sin convertirlos en FEATURE_DISABLED.
 *
 * Sin adapters concretos. Sin Supabase. Sin service_role. Sin tablas de SmartConversations.
 * No modifica http-handler.ts (la integración es posterior a SI-P4A).
 *
 * (Fuente: SI-P4A §7, §8, §9, §11)
 * Estado: INCIDENT_ENTITLEMENT_POLICY_IMPLEMENTED_OFFLINE
 */

import type {
  IncidentEntitlementCheckRequest,
  IncidentEntitlementSnapshot,
  IncidentEntitlementDecision,
  IncidentEntitlementPortResult,
  IncidentEntitlementCheckResult,
} from './entitlement-types.ts';
import type { IncidentEntitlementPort } from './entitlement-port.ts';

// ─── Validación de UUID ───────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Validación de request ────────────────────────────────────────────────────

/**
 * Valida en runtime que req tiene la forma mínima esperada.
 *
 * Aunque TypeScript tipa el request, protege frente a entradas adversariales
 * en el boundary entre capas (cast desde JavaScript, errores de configuración).
 *
 * Inputs válidos:
 *   - client_account_id: string con formato UUID
 *   - operation: exactamente "create_incident"
 *   - source_channel: "whatsapp" | "webchat"
 *
 * (Fuente: SI-P4A §9)
 */
function isValidEntitlementRequest(req: unknown): boolean {
  if (req == null || typeof req !== 'object') return false;
  const r = req as Record<string, unknown>;
  return (
    typeof r['client_account_id'] === 'string' &&
    UUID_RE.test(r['client_account_id'] as string) &&
    r['operation'] === 'create_incident' &&
    (r['source_channel'] === 'whatsapp' || r['source_channel'] === 'webchat')
  );
}

// ─── Evaluador puro ───────────────────────────────────────────────────────────

/**
 * Evalúa el snapshot de entitlement y devuelve la decisión de política.
 *
 * Política canónica (§1 de SI-P4A):
 *   SMART_INCIDENTS_ENABLED =
 *     smart_incidents_subscription_active
 *     AND incident_creation_capability_active
 *     AND source_channel_active
 *
 * Propiedades:
 *   - Función pura: mismo input → mismo output, sin E/S ni efectos secundarios.
 *   - ok: true ÚNICAMENTE si los tres gates son true.
 *   - Cualquier combinación con al menos un gate false → FEATURE_DISABLED.
 *   - No revela cuál gate falló (opacidad: §11 de SI-P4A).
 *
 * @param snapshot Snapshot de tres gates booleanos.
 * @returns Decisión de política: ok o FEATURE_DISABLED.
 */
export function evaluateIncidentEntitlement(
  snapshot: IncidentEntitlementSnapshot,
): IncidentEntitlementDecision {
  if (
    snapshot.smart_incidents_subscription_active &&
    snapshot.incident_creation_capability_active &&
    snapshot.source_channel_active
  ) {
    return { ok: true };
  }
  return { ok: false, error_code: 'FEATURE_DISABLED' };
}

// ─── Check atómico ────────────────────────────────────────────────────────────

/**
 * Ejecuta el check atómico de entitlement.
 *
 * Orden obligatorio (§8 de SI-P4A):
 *   1. Validar forma mínima del request; INTERNAL_ERROR si inválido.
 *   2. Invocar getEntitlementSnapshot exactamente una vez.
 *   3. Mapear fallo técnico del port sin convertirlo en FEATURE_DISABLED.
 *   4. Evaluar los tres gates con evaluateIncidentEntitlement.
 *   5. Devolver éxito o FEATURE_DISABLED.
 *
 * Propiedades:
 *   - DEPENDENCY_UNAVAILABLE del port → DEPENDENCY_UNAVAILABLE (nunca FEATURE_DISABLED).
 *   - INTERNAL_ERROR del port → INTERNAL_ERROR (nunca FEATURE_DISABLED).
 *   - Excepción inesperada del port → INTERNAL_ERROR sin propagar el mensaje.
 *   - El port se invoca exactamente una vez por llamada.
 *   - El request se pasa íntegro al port sin transformaciones.
 *
 * No modifica http-handler.ts. La integración con el handler es posterior a SI-P4A.
 *
 * @param request Request tipado con client_account_id, operation, source_channel.
 * @param port Puerto de consulta de entitlement.
 * @returns Resultado del check: ok, FEATURE_DISABLED, DEPENDENCY_UNAVAILABLE o INTERNAL_ERROR.
 */
export async function checkIncidentEntitlement(
  request: IncidentEntitlementCheckRequest,
  port: IncidentEntitlementPort,
): Promise<IncidentEntitlementCheckResult> {
  // Paso 1: Validar forma mínima del request ante entradas adversariales.
  try {
    if (!isValidEntitlementRequest(request)) {
      return { ok: false, error_code: 'INTERNAL_ERROR' };
    }
  } catch {
    // Excepción durante validación (acceso a propiedad de null, etc.) → INTERNAL_ERROR.
    return { ok: false, error_code: 'INTERNAL_ERROR' };
  }

  // Paso 2: Invocar getEntitlementSnapshot exactamente una vez.
  let portResult: IncidentEntitlementPortResult;
  try {
    portResult = await port.getEntitlementSnapshot(request);
  } catch {
    // Excepción inesperada del port → INTERNAL_ERROR; el mensaje no se propaga.
    return { ok: false, error_code: 'INTERNAL_ERROR' };
  }

  // Paso 3: Mapear fallo técnico del port sin convertirlo en FEATURE_DISABLED.
  // Un fallo técnico no es una decisión de política. Convertirlo en FEATURE_DISABLED
  // ocultaría indisponibilidad de infraestructura como configuración del tenant.
  if (!portResult.ok) {
    return { ok: false, error_code: portResult.error_code };
  }

  // Pasos 4-5: Evaluar los tres gates y devolver la decisión de política.
  const decision = evaluateIncidentEntitlement(portResult.snapshot);
  if (decision.ok) {
    return { ok: true };
  }
  return { ok: false, error_code: 'FEATURE_DISABLED' };
}
