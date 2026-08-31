/**
 * Guards de privacidad — funciones que verifican restricciones de PII en runtime.
 * Fuente: rules-80-data-and-privacy.md, contract-identity-validation-result.md
 *
 * Sin lógica de negocio. Solo validación de estructura.
 * Usadas por EFs, mocks y tests de regresión.
 */

/**
 * Campos PII prohibidos en cualquier payload enviado a n8n.
 * Fuente: rules-80 §4.1
 */
export const PII_FIELDS_FORBIDDEN_IN_N8N = [
  'profile_id',
  'phone_number',
  'phone',
  'full_name',
  'room_label',
  'residence_name',
  'email',
  'assignment_id',
  'sender_ref',
  'room_id',
  'identity_data',
  'raw_payload',
] as const;

export type PiiForbiddenInN8n = (typeof PII_FIELDS_FORBIDDEN_IN_N8N)[number];

/**
 * Campos prohibidos en los payloads data del activity log del Core.
 * Fuente: rules-75 §4.5
 */
export const PII_FIELDS_FORBIDDEN_IN_ACTIVITY_LOG = [
  'profile_id',
  'phone_number',
  'phone',
  'full_name',
  'room_label',
  'residence_name',
  'email',
  'assignment_id',
  'sender_ref',
  'message_text',
  'description',
  'raw_payload',
  'identity_data',
] as const;

/**
 * Marcadores oficiales del catálogo de plantillas de respuesta.
 * Fuente: rules-80 §4.2
 * {user_name} NO es un marcador oficial.
 */
export const OFFICIAL_TEMPLATE_MARKERS = [
  '{incident_ref}',
  '{lead_ref}',
  '{due_date}',
  '{amount}',
  '{bot_name}',
] as const;

export type OfficialTemplateMarker = (typeof OFFICIAL_TEMPLATE_MARKERS)[number];

/**
 * Marcadores que nunca deben aparecer en el texto enviado al usuario.
 * Si alguno aparece, la EF debe haber fallado en la sustitución.
 */
export const FORBIDDEN_UNSUBSTITUTED_MARKERS = [
  '{incident_ref}',
  '{lead_ref}',
  '{due_date}',
  '{amount}',
  '{user_name}',
] as const;

/**
 * Verifica que un objeto plano no contiene campos PII prohibidos para n8n.
 * Devuelve la lista de campos prohibidos encontrados (vacía si no hay violaciones).
 */
export function findPiiFieldsInN8nPayload(payload: Record<string, unknown>): string[] {
  return PII_FIELDS_FORBIDDEN_IN_N8N.filter(field => field in payload);
}

/**
 * Verifica que un objeto plano no contiene campos PII prohibidos para el activity log.
 * Devuelve la lista de campos prohibidos encontrados.
 */
export function findPiiFieldsInActivityLogPayload(payload: Record<string, unknown>): string[] {
  return PII_FIELDS_FORBIDDEN_IN_ACTIVITY_LOG.filter(field => field in payload);
}

/**
 * Verifica que el texto de una respuesta no contiene marcadores sin sustituir.
 * Devuelve los marcadores sin sustituir encontrados.
 * Fuente: contract-canonical-response §8.2
 */
export function findUnsubstitutedMarkers(text: string): string[] {
  return FORBIDDEN_UNSUBSTITUTED_MARKERS.filter(marker => text.includes(marker));
}

/**
 * Verifica que session_id no está presente en un payload de activity log.
 * session_id es un UUID opaco permitido en el activity log, pero NO en los payloads
 * de conv_incident_created ni conv_lead_created.
 * Fuente: rules-75 §4.4
 */
export function hasSessionIdInRestrictedPayload(
  eventType: 'conv_incident_created' | 'conv_lead_created',
  payload: Record<string, unknown>
): boolean {
  void eventType;
  return 'session_id' in payload;
}

/**
 * Verifica que un IdentityValidationResult no propaga campos PII cuando identity_level = NO_MATCH.
 * Fuente: contract-identity-validation-result §8.2
 */
export function validateIdentityResultConsistency(result: {
  identity_level: string;
  profile_id?: unknown;
  assignment_id?: unknown;
}): string[] {
  const violations: string[] = [];

  if (result.identity_level === 'NO_MATCH') {
    if (result.profile_id !== undefined) {
      violations.push('profile_id no debe estar presente cuando identity_level = NO_MATCH');
    }
    if (result.assignment_id !== undefined) {
      violations.push('assignment_id no debe estar presente cuando identity_level = NO_MATCH');
    }
  }

  if (result.identity_level === 'MATCH_INACTIVE') {
    if (result.assignment_id !== undefined) {
      violations.push('assignment_id no debe estar presente cuando identity_level = MATCH_INACTIVE');
    }
  }

  return violations;
}

/**
 * Devuelve true si el sender_ref contiene un número de teléfono
 * y por tanto debe tratarse como PII.
 * Heurística: empieza por '+' o es un número de 10+ dígitos.
 * Fuente: contract-normalized-message §8.4
 */
export function senderRefIsPii(channel: string, senderRef: string): boolean {
  if (channel === 'whatsapp') {
    return senderRef.startsWith('+') || /^\d{10,}$/.test(senderRef);
  }
  return false;
}

/**
 * Verifica que sender_ref de WhatsApp no incluye sufijos de Wasender.
 * El sufijo @c.us solo se añade al construir el campo `to` para la API.
 * Fuente: contract-normalized-message §8.4 (ejemplo inválido)
 */
export function senderRefHasForbiddenSuffix(senderRef: string): boolean {
  return senderRef.includes('@c.us') || senderRef.includes('@s.whatsapp.net');
}
