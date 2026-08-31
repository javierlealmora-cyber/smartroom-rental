/**
 * Validadores de payload para los contratos de SmartConversations.
 * Devuelven string[] de errores. Array vacío = payload válido.
 * Sin lógica de negocio. Sin llamadas externas.
 */

import type { NormalizedMessage, IdentityValidationRequest, CanonicalResponse } from './contracts.js';
import { findUnsubstitutedMarkers, validateIdentityResultConsistency, senderRefHasForbiddenSuffix } from './privacy-guards.js';
import { RESPONSE_TYPE } from './enums.js';

// ---------------------------------------------------------------------------
// NormalizedMessage
// Fuente: contract-normalized-message §8
// ---------------------------------------------------------------------------

export function validateNormalizedMessage(msg: Partial<NormalizedMessage>): string[] {
  const errors: string[] = [];

  if (!msg.message_id) errors.push('message_id es obligatorio');
  if (!msg.client_account_id) errors.push('client_account_id es obligatorio');
  if (!msg.channel) errors.push('channel es obligatorio');
  if (!msg.sender_ref) errors.push('sender_ref es obligatorio');
  if (msg.is_transcribed === undefined) errors.push('is_transcribed es obligatorio');
  if (!msg.received_at) errors.push('received_at es obligatorio');
  if (!msg.message_type) errors.push('message_type es obligatorio');

  if (msg.channel === 'whatsapp' && msg.sender_ref && senderRefHasForbiddenSuffix(msg.sender_ref)) {
    errors.push('sender_ref no debe incluir sufijos @c.us o @s.whatsapp.net');
  }

  if (msg.message_type === 'text' && !msg.text) {
    errors.push('text es obligatorio cuando message_type = text');
  }
  if (msg.message_type === 'text' && msg.text === '') {
    errors.push('text no puede ser cadena vacía cuando message_type = text');
  }
  if (msg.message_type === 'audio') {
    if (!msg.text) errors.push('text (transcripción) es obligatorio cuando message_type = audio');
    if (!msg.is_transcribed) errors.push('is_transcribed debe ser true cuando message_type = audio');
    if (!msg.audio_url) errors.push('audio_url es obligatorio cuando message_type = audio');
  }
  if (msg.message_type === 'image' && !msg.image_url) {
    errors.push('image_url es obligatorio cuando message_type = image');
  }
  if (msg.message_type !== 'audio' && msg.is_transcribed === true) {
    errors.push('is_transcribed debe ser false para message_type distinto de audio');
  }
  if (msg.channel === 'webchat' && (msg.message_type === 'audio' || msg.message_type === 'document')) {
    errors.push('message_type audio/document no está soportado en WebChat V1');
  }
  if (msg.message_id && msg.external_id && msg.message_id === msg.external_id) {
    errors.push('message_id y external_id no pueden ser iguales');
  }
  if ((msg as Record<string, unknown>)['raw_payload'] !== undefined) {
    errors.push('raw_payload no debe aparecer en NormalizedMessage');
  }

  return errors;
}

// ---------------------------------------------------------------------------
// IdentityValidationRequest
// Fuente: contract-identity-validation-result §8
// ---------------------------------------------------------------------------

export function validateIdentityRequest(req: Partial<IdentityValidationRequest>): string[] {
  const errors: string[] = [];

  if (!req.client_account_id) {
    errors.push('client_account_id es obligatorio');
  }

  const hasAnyId = !!(req.profile_id || req.phone || req.full_name || req.residence_name || req.room_label);
  if (!hasAnyId) {
    errors.push('Debe estar presente al menos uno de: profile_id, phone, full_name, residence_name, room_label');
  }

  return errors;
}

// ---------------------------------------------------------------------------
// IdentityValidationResult consistency
// Fuente: contract-identity-validation-result §8
// ---------------------------------------------------------------------------

export function validateIdentityResult(result: {
  identity_level: string;
  profile_id?: unknown;
  assignment_id?: unknown;
  match_details?: { matched_by?: unknown[]; confidence?: unknown };
}): string[] {
  const errors: string[] = [];

  const structuralErrors = validateIdentityResultConsistency(result);
  errors.push(...structuralErrors);

  if (!result.match_details) {
    errors.push('match_details es obligatorio');
  } else {
    if (!Array.isArray(result.match_details.matched_by)) {
      errors.push('match_details.matched_by debe ser un array');
    }
    if (typeof result.match_details.confidence !== 'number') {
      errors.push('match_details.confidence debe ser un número');
    }
    if (result.identity_level === 'NO_MATCH') {
      if ((result.match_details.matched_by as unknown[])?.length !== 0) {
        errors.push('match_details.matched_by debe ser [] cuando NO_MATCH');
      }
      if (result.match_details.confidence !== 0.0) {
        errors.push('match_details.confidence debe ser 0.0 cuando NO_MATCH');
      }
    }
    if (result.identity_level === 'STRONG_MATCH_ACTIVE') {
      const matchedBy = result.match_details.matched_by as string[] | undefined;
      if (!matchedBy?.includes('phone')) {
        errors.push('match_details.matched_by debe incluir phone cuando STRONG_MATCH_ACTIVE');
      }
      if (typeof result.match_details.confidence === 'number' && result.match_details.confidence < 0.95) {
        errors.push('match_details.confidence debe ser >= 0.95 cuando STRONG_MATCH_ACTIVE');
      }
    }
    if (result.identity_level === 'PARTIAL_MATCH_ACTIVE') {
      const matchedBy = result.match_details.matched_by as string[] | undefined;
      const nonPhoneFields = matchedBy?.filter(f => f !== 'phone') ?? [];
      if (nonPhoneFields.length < 2) {
        errors.push('match_details.matched_by debe incluir al menos 2 de: name, room, residence cuando PARTIAL_MATCH_ACTIVE');
      }
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// CanonicalResponse
// Fuente: contract-canonical-response §8
// ---------------------------------------------------------------------------

export function validateCanonicalResponse(resp: Partial<CanonicalResponse>): string[] {
  const errors: string[] = [];

  if (!resp.session_id) errors.push('session_id es obligatorio');
  if (!resp.service_code) errors.push('service_code es obligatorio');
  if (!resp.response_type) errors.push('response_type es obligatorio');
  if (!resp.text) errors.push('text es obligatorio');
  if (resp.text === '') errors.push('text no puede ser cadena vacía');

  if (resp.text) {
    const unsubstituted = findUnsubstitutedMarkers(resp.text);
    if (unsubstituted.length > 0) {
      errors.push(`text contiene marcadores sin sustituir: ${unsubstituted.join(', ')}`);
    }
  }

  // PII prohibida en CanonicalResponse (contract-canonical-response §8.6)
  const piiFields = ['profile_id', 'phone_number', 'full_name', 'room_label', 'assignment_id'];
  for (const field of piiFields) {
    if ((resp as Record<string, unknown>)[field] !== undefined) {
      errors.push(`Campo PII prohibido en CanonicalResponse: ${field}`);
    }
  }

  if (resp.response_type === RESPONSE_TYPE.ESCALATED) {
    if (!resp.escalated) errors.push('escalated debe ser true cuando response_type = escalated');
    if (!resp.escalation_reason) errors.push('escalation_reason es obligatorio cuando response_type = escalated');
  }

  if (resp.response_type === RESPONSE_TYPE.PENDING_INPUT) {
    if (!resp.needs_more_input) errors.push('needs_more_input debe ser true cuando response_type = pending_input');
    if (resp.next_state !== 'waiting_user') errors.push('next_state debe ser waiting_user cuando response_type = pending_input');
  }

  return errors;
}
