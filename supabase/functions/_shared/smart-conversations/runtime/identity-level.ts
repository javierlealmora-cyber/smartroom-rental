/**
 * identity-level — Orden y reglas de no-degradación de niveles de identidad.
 *
 * Niveles oficiales (de menor a mayor):
 *   NO_MATCH(0) < MATCH_INACTIVE(1) < PARTIAL_MATCH_ACTIVE(2) < STRONG_MATCH_ACTIVE(3)
 *
 * UNVERIFIED_LEAD: nivel asignado por WF-30 en fase futura, no participa en validación Core.
 * Nota: solo los cuatro niveles anteriores son válidos en este sistema.
 *
 * Regla de no-degradación: identity_level nunca puede bajar dentro de una sesión.
 * Fuente: rules-80, SmartConversations identity contract.
 */

export type ValidatedIdentityLevel =
  | 'NO_MATCH'
  | 'MATCH_INACTIVE'
  | 'PARTIAL_MATCH_ACTIVE'
  | 'STRONG_MATCH_ACTIVE';

export const IDENTITY_LEVEL_RANK: Record<string, number> = {
  'NO_MATCH': 0,
  'MATCH_INACTIVE': 1,
  'PARTIAL_MATCH_ACTIVE': 2,
  'STRONG_MATCH_ACTIVE': 3,
  // Nota: UNVERIFIED_LEAD no está en este mapa — no participa en validación Core.
};

/**
 * Devuelve true si y solo si `newLevel` representa un avance sobre `currentLevel`.
 * Nunca permite degradar el nivel. Los niveles no mapeados (e.g. UNVERIFIED_LEAD como
 * destino) devuelven false.
 */
export function canAdvanceIdentityLevel(currentLevel: string, newLevel: string): boolean {
  const current = IDENTITY_LEVEL_RANK[currentLevel] ?? -1;
  const next    = IDENTITY_LEVEL_RANK[newLevel] ?? -1;
  if (next < 0) return false;      // destino desconocido o no validable: no avanzar
  if (current < 0) return true;    // origen desconocido: permitir cualquier nivel conocido
  return next > current;
}
