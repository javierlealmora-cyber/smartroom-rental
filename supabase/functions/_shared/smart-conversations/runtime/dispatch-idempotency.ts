/**
 * dispatch-idempotency — Estrategia best-effort de idempotencia de dispatch.
 *
 * Estrategia basada EXCLUSIVAMENTE en el status del inbound message_id:
 *   - received  → pendiente de proceso — ejecutar dispatch.
 *   - processing → dispatch en curso (otra instancia o retry rápido) → devolver already_processing.
 *   - sent       → dispatch completado correctamente → devolver éxito idempotente.
 *   - failed     → dispatch fallido previamente → no ejecutar de nuevo salvo force=true.
 *
 * NUNCA se usa el número total de outbounds de la sesión como señal.
 * Hacerlo generaría falsos positivos: el mensaje B de la misma sesión sería
 * bloqueado por el outbound ya creado para el mensaje A.
 *
 * Mejora de concurrencia best-effort:
 *   El dispatch actualiza el inbound a processing SOLO SI status=received (UPDATE condicional).
 *   Si la actualización no afecta filas (otra instancia llegó antes), devolver already_processing.
 *   No se garantiza atomicidad perfecta sin FOR UPDATE o columna dedicada, pero elimina
 *   el falso positivo por outbounds previos de la sesión.
 *
 * No introduce: nuevas tablas, nuevas columnas, nuevos estados.
 * No introduce: processed, next_retry_at, attempt_count.
 * No usa: outboundCount, conteo de mensajes en la sesión.
 */

export type InboundDispatchStatus = 'received' | 'processing' | 'sent' | 'failed' | string;

export type IdempotencyDecision =
  | 'proceed'           // status=received → ejecutar dispatch
  | 'already_processing' // status=processing → otra instancia en curso
  | 'already_sent'       // status=sent → ya completado
  | 'previously_failed'; // status=failed → falló antes

export interface DispatchIdempotencyResult {
  decision:         IdempotencyDecision;
  alreadyDispatched: boolean;
  /** Razón si ya fue despachado (para logging interno). */
  reason?: string;
}

/**
 * Determina la decisión de dispatch basándose SOLO en el status del inbound.
 *
 * No acepta outboundCount ni ninguna señal basada en la sesión.
 * Solo recibe el status del propio mensaje inbound.
 */
export function evaluateDispatchIdempotency(
  inboundStatus: InboundDispatchStatus,
): DispatchIdempotencyResult {
  switch (inboundStatus) {
    case 'received':
      return { decision: 'proceed', alreadyDispatched: false };

    case 'processing':
      return { decision: 'already_processing', alreadyDispatched: true, reason: 'status_processing' };

    case 'sent':
      return { decision: 'already_sent', alreadyDispatched: true, reason: 'status_sent' };

    case 'failed':
      return { decision: 'previously_failed', alreadyDispatched: true, reason: 'status_failed' };

    default:
      // Estado desconocido: tratar como received para no bloquear
      return { decision: 'proceed', alreadyDispatched: false };
  }
}
