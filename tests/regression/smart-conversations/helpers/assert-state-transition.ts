import { expect } from 'vitest';
import type { IdentityLevel } from '../fixtures/identity.fixture.js';

/** Jerarquía de identidad (orden ascendente) */
const IDENTITY_HIERARCHY: IdentityLevel[] = [
  'NO_MATCH',
  'PARTIAL_MATCH_ACTIVE',
  'STRONG_MATCH_ACTIVE',
  'MATCH_INACTIVE',
];

/**
 * Verifica la regla de no-degradación de identidad.
 * La identidad nunca puede descender de nivel.
 */
export function assertIdentityNoDegradation(
  previousLevel: IdentityLevel,
  newLevel: IdentityLevel
): void {
  const prevIndex = IDENTITY_HIERARCHY.indexOf(previousLevel);
  const newIndex = IDENTITY_HIERARCHY.indexOf(newLevel);
  expect(
    newIndex,
    `Degradación de identidad detectada: ${previousLevel} → ${newLevel} (regla de no-degradación violada)`
  ).toBeGreaterThanOrEqual(prevIndex);
}

/**
 * Verifica que un conv_case nace con status='open' (nunca 'waiting_user').
 * Aplica a pre-incidencias (PARTIAL_MATCH_ACTIVE) e incidencias confirmadas.
 * Fuente: INC-05, ID-18 en los test specs.
 */
export function assertCaseNascerStatus(caseStatus: string): void {
  expect(
    caseStatus,
    'conv_cases nace con status="open", nunca con "waiting_user"'
  ).toBe('open');
}

/**
 * Verifica que MATCH_INACTIVE deriva a escalado directo (sin pasar por WF-IDENTITY).
 */
export function assertMatchInactiveEscalatesDirect(
  identityLevel: IdentityLevel,
  action: string
): void {
  if (identityLevel === 'MATCH_INACTIVE') {
    expect(
      action,
      'MATCH_INACTIVE debe escalar directamente, sin activar WF-IDENTITY'
    ).toBe('escalated');
  }
}

/**
 * Verifica que NO_MATCH activa WF-IDENTITY antes de escalar.
 * Solo escala si los intentos se agotan (MAX = 3 totales).
 */
export function assertNoMatchUsesWfIdentity(
  identityLevel: IdentityLevel,
  attemptsUsed: number,
  action: string
): void {
  if (identityLevel === 'NO_MATCH') {
    if (attemptsUsed < 3) {
      expect(
        action,
        `NO_MATCH con ${attemptsUsed}/3 intentos debe activar WF-IDENTITY, no escalar`
      ).toBe('identity_required');
    } else {
      expect(
        action,
        'NO_MATCH con 3/3 intentos agotados debe escalar'
      ).toBe('escalated');
    }
  }
}

/**
 * Verifica el backoff para reintentos: 1s → 5s → 30s.
 * 3 intentos totales (original + 2 reintentos). El cuarto nunca se ejecuta.
 */
export function assertBackoffSequence(delays: number[]): void {
  expect(delays, 'El backoff debe tener exactamente 3 entradas (original + 2 reintentos)').toHaveLength(3);
  expect(delays[0], 'Primer reintento: 1s').toBe(1000);
  expect(delays[1], 'Segundo reintento: 5s').toBe(5000);
  expect(delays[2], 'Tercer reintento: 30s').toBe(30000);
}
