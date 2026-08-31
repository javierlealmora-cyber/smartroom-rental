/** Flags de identidad para WF-IDENTITY. No almacenan PII — solo booleanos. */

export const fixtureIdentityFlagsNone = {
  has_full_name: false,
  has_residence_name: false,
  has_room_label: false,
} as const;

export const fixtureIdentityFlagsPartial = {
  has_full_name: true,
  has_residence_name: true,
  has_room_label: false,
} as const;

export const fixtureIdentityFlagsComplete = {
  has_full_name: true,
  has_residence_name: true,
  has_room_label: true,
} as const;

/**
 * Resultado de validación de identidad devuelto por WF-IDENTITY.
 * identity_level sigue la jerarquía: NO_MATCH → PARTIAL_MATCH_ACTIVE → STRONG_MATCH_ACTIVE.
 * Regla de no-degradación: nunca puede descender de nivel.
 */
export const fixtureIdentityResultNoMatch = {
  identity_level: 'NO_MATCH' as const,
  flags: fixtureIdentityFlagsNone,
  attempts_used: 0,
};

export const fixtureIdentityResultPartial = {
  identity_level: 'PARTIAL_MATCH_ACTIVE' as const,
  flags: fixtureIdentityFlagsPartial,
  attempts_used: 1,
};

export const fixtureIdentityResultStrong = {
  identity_level: 'STRONG_MATCH_ACTIVE' as const,
  flags: fixtureIdentityFlagsComplete,
  attempts_used: 1,
};

export const fixtureIdentityResultMatchInactive = {
  identity_level: 'MATCH_INACTIVE' as const,
  flags: fixtureIdentityFlagsComplete,
  attempts_used: 1,
};

/** Máximo de intentos permitidos en WF-IDENTITY (3 totales) */
export const MAX_IDENTITY_ATTEMPTS = 3;

export type IdentityLevel = 'NO_MATCH' | 'PARTIAL_MATCH_ACTIVE' | 'STRONG_MATCH_ACTIVE' | 'MATCH_INACTIVE';
