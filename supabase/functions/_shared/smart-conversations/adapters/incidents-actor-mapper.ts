/**
 * incidents-actor-mapper.ts — Mapeo CanonicalActor → actor del provider SI (Fase 11C5E).
 *
 * El provider SI acepta ÚNICAMENTE: { type: 'system' }
 * Actores rechazados: tenant_profile, unverified_lead, y cualquier tipo desconocido.
 *
 * PROHIBICIÓN: No modificar CanonicalActor global — este módulo es una capa de traducción.
 */

import type { CanonicalActor } from '../canonical-actor.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Tipo provider — exactamente lo que SI acepta
// ─────────────────────────────────────────────────────────────────────────────

export type ProviderSmartIncidentsActor = { type: 'system' };

// ─────────────────────────────────────────────────────────────────────────────
// Error de mapeo explícito
// ─────────────────────────────────────────────────────────────────────────────

export class ActorMappingError extends Error {
  public readonly code = 'UNSUPPORTED_ACTOR_TYPE';
  constructor(public readonly actorType: string) {
    super(
      `UNSUPPORTED_ACTOR_TYPE: "${actorType}" cannot be used as Smart Incidents provider actor. ` +
      `Only system_service is accepted.`,
    );
    this.name = 'ActorMappingError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Traduce un CanonicalActor SC al actor que acepta el provider SI.
 *
 * system_service → { type: 'system' }
 * tenant_profile → throws ActorMappingError
 * unverified_lead → throws ActorMappingError
 * desconocido → throws ActorMappingError
 */
export function mapCanonicalActorToSmartIncidentsActor(
  actor: CanonicalActor,
): ProviderSmartIncidentsActor {
  if (actor.type !== 'system_service') {
    throw new ActorMappingError(actor.type);
  }
  return { type: 'system' };
}
