/**
 * response-mapper.ts — Mapper de response del provider v1.0.
 * Fuente: contract-create-incident-request.md §5.2 y §8.5
 *
 * No implementa almacenamiento ni detección de replay.
 * El estado de replay llega como input tipado desde la capa de persistencia (SI-P5).
 * Estado: PROVIDER_RESPONSE_MAPPER_IMPLEMENTED_OFFLINE
 */

import type { CreateIncidentResultV1 } from './types.ts';

// ─── Contextos de entrada ─────────────────────────────────────────────────────

/** Contexto para una primera ejecución exitosa. */
export interface FirstCreationContext {
  /** UUID de la invocación actual. */
  request_id: string;
  /** UUID de la operación de negocio, invocación actual. */
  correlation_id: string;
  /** ID de la incidencia recién creada. */
  incident_id: string;
  /** Referencia legible. Nullable en v1.0. */
  incident_reference: string | null;
  /** ISO-8601 con timezone. */
  created_at: string;
}

/** Contexto para un replay idempotente exacto. */
export interface ReplayContext {
  /** UUID de la invocación ACTUAL (no la original). */
  request_id: string;
  /** UUID de la operación de negocio, invocación ACTUAL (no la original). */
  correlation_id: string;
  /** Datos estables de la respuesta original. */
  original_incident_id: string;
  original_incident_reference: string | null;
  original_created_at: string;
}

// ─── Builders ────────────────────────────────────────────────────────────────

/**
 * §5.2 — Construye la response para la primera creación exitosa.
 * idempotent_replay = false.
 */
export function buildFirstCreationResponse(
  ctx: FirstCreationContext,
): CreateIncidentResultV1 {
  return {
    contract_version: '1.0',
    request_id: ctx.request_id,
    correlation_id: ctx.correlation_id,
    incident_id: ctx.incident_id,
    incident_reference: ctx.incident_reference,
    status: 'new',
    created_at: ctx.created_at,
    idempotent_replay: false,
  };
}

/**
 * §5.2 / §8.5 — Construye la response para un replay idempotente exacto.
 *
 * Reglas:
 *   - incident_id, incident_reference, status y created_at = datos estables originales.
 *   - request_id y correlation_id = invocación ACTUAL (identifican la invocación técnica).
 *   - idempotent_replay = true.
 *   - No crea ninguna incidencia ni registro adicional.
 */
export function buildReplayResponse(ctx: ReplayContext): CreateIncidentResultV1 {
  return {
    contract_version: '1.0',
    request_id: ctx.request_id,           // invocación actual
    correlation_id: ctx.correlation_id,   // invocación actual
    incident_id: ctx.original_incident_id,
    incident_reference: ctx.original_incident_reference,
    status: 'new',
    created_at: ctx.original_created_at,
    idempotent_replay: true,
  };
}
