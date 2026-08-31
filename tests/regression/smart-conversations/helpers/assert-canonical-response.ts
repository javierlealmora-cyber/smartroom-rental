import { expect } from 'vitest';
import type { CanonicalResponse } from '../mocks/core.mock.js';

const VALID_NEXT_STATES: CanonicalResponse['next_state'][] = [
  'waiting_user',
  'waiting_n8n',
  'resolved',
  'escalated',
  'identity_required',
];

/**
 * Verifica que una respuesta del motor conversacional tiene la forma canónica esperada.
 */
export function assertCanonicalResponse(
  response: unknown,
  expectedNextState?: CanonicalResponse['next_state']
): void {
  expect(response, 'La respuesta debe ser un objeto').toBeTypeOf('object');
  expect(response).not.toBeNull();

  const r = response as CanonicalResponse;

  expect(
    VALID_NEXT_STATES,
    `next_state "${r.next_state}" no es un estado canónico válido`
  ).toContain(r.next_state);

  expect(r.response_text, 'response_text debe ser un string no vacío').toBeTypeOf('string');
  expect(r.response_text.length, 'response_text no debe estar vacío').toBeGreaterThan(0);

  if (expectedNextState !== undefined) {
    expect(r.next_state, `Se esperaba next_state="${expectedNextState}"`).toBe(expectedNextState);
  }
}

/**
 * Verifica que la respuesta canónica no contiene {user_name} en el texto.
 * {user_name} no es un marcador oficial del catálogo (rules-80).
 */
export function assertNoUserNameMarker(response: CanonicalResponse): void {
  expect(
    response.response_text,
    'response_text no debe contener {user_name} — no es un marcador oficial'
  ).not.toContain('{user_name}');
}

/**
 * Verifica que el texto de respuesta solo usa marcadores del catálogo oficial.
 * Catálogo oficial: {incident_ref}, {lead_ref}, {due_date}, {amount}, {bot_name}
 */
export function assertOnlyOfficialMarkers(text: string): void {
  const FORBIDDEN_MARKERS = ['{user_name}'];
  for (const marker of FORBIDDEN_MARKERS) {
    expect(text, `Marcador no oficial "${marker}" detectado en la respuesta`).not.toContain(marker);
  }
}
