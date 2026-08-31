import { expect } from 'vitest';

/**
 * Campos PII prohibidos en variables de n8n y en el activity log.
 * Fuente: rules-75, test-permissions-and-privacy-spec.md §7
 */
const PII_FIELDS_PROHIBITED_IN_N8N = [
  'phone_number',
  'full_name',
  'email',
  'national_id',
  'passport_number',
  'address',
  'date_of_birth',
  'bank_account',
] as const;

/**
 * Verifica que un objeto no contiene campos PII prohibidos en n8n.
 * Para uso en tests PII-01 a PII-20.
 */
export function assertNoPII(obj: Record<string, unknown>, label = 'payload'): void {
  for (const field of PII_FIELDS_PROHIBITED_IN_N8N) {
    expect(
      obj,
      `${label} no debe contener el campo PII prohibido "${field}"`
    ).not.toHaveProperty(field);
  }
}

/**
 * Verifica recursivamente (shallow+1 nivel) que no haya PII en ningún sub-objeto.
 */
export function assertNoPIIDeep(obj: Record<string, unknown>, label = 'payload'): void {
  assertNoPII(obj, label);
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      assertNoPII(value as Record<string, unknown>, `${label}.${key}`);
    }
  }
}

/**
 * Verifica que session_id no aparece en el payload del evento de activity log.
 * Fuente: payload oficial de conv_incident_created y conv_lead_created en rules-75.
 */
export function assertNoSessionIdInActivityPayload(payload: Record<string, unknown>): void {
  expect(
    payload,
    'El payload del evento de activity log no debe contener session_id'
  ).not.toHaveProperty('session_id');
}
