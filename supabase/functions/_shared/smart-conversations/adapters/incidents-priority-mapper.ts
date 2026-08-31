/**
 * incidents-priority-mapper.ts — Mapeo urgency_proposal → priority (Fase 11C5E).
 *
 * Reglas del contrato provider v1.0:
 *   low | medium | null → 'normal'
 *   high → 'urgent'
 *   cualquier otro valor → UNKNOWN_URGENCY (no invocar)
 *
 * PROHIBICIÓN: No mapear valores desconocidos a 'normal' silenciosamente.
 * PROHIBICIÓN: No añadir 'critical' sin nueva versión de contrato aprobada.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Error de mapeo explícito
// ─────────────────────────────────────────────────────────────────────────────

export class UrgencyMappingError extends Error {
  public readonly code = 'UNKNOWN_URGENCY';
  constructor(public readonly urgency: unknown) {
    super(`UNKNOWN_URGENCY: "${String(urgency)}" is not a valid urgency value — do not invoke provider`);
    this.name = 'UrgencyMappingError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabla canónica (valores string en minúsculas)
// ─────────────────────────────────────────────────────────────────────────────

const URGENCY_TO_PRIORITY: Readonly<Record<string, 'normal' | 'urgent'>> = {
  low: 'normal',
  medium: 'normal',
  high: 'urgent',
};

// ─────────────────────────────────────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mapea un valor de urgencia SC al enum de prioridad del provider SI.
 *
 * null / undefined / '' → 'normal' (ausencia de urgencia = normal)
 * 'low' → 'normal'
 * 'medium' → 'normal'
 * 'high' → 'urgent'
 * cualquier otro → throws UrgencyMappingError (no invocar provider)
 */
export function mapUrgencyToPriority(urgency: string | null | undefined): 'normal' | 'urgent' {
  if (urgency == null || urgency === '') return 'normal';

  const mapped = URGENCY_TO_PRIORITY[urgency];
  if (mapped !== undefined) return mapped;

  throw new UrgencyMappingError(urgency);
}
