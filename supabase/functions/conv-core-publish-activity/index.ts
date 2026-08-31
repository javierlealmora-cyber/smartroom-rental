/**
 * conv-core-publish-activity
 *
 * Publica un evento en el Activity Log del Core.
 * PATRÓN FIRE-AND-LOG: nunca lanza error al caller.
 *   - Si el payload es inválido o tiene PII → log de advertencia, retorna 200 con published=false.
 *   - Si el Core API falla → log de error, retorna 200 con published=false.
 *   - El caller NUNCA debe hacer rollback por fallos de este EF.
 *
 * Autenticación: service_role only (EF interna).
 * Fuente: rules-75 §4.1, rules-80 §4.5
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { hasSessionIdInRestrictedPayload } from "../_shared/smart-conversations/privacy-guards.ts";

const EF_NAME = 'conv-core-publish-activity';

// PII prohibida en los payloads data del activity log (rules-80 §4.5)
const PII_FIELDS_FORBIDDEN_IN_ACTIVITY = [
  'profile_id', 'phone_number', 'full_name', 'room_label',
  'residence_name', 'email', 'assignment_id', 'sender_ref',
] as const;

function findPiiInPayload(data: Record<string, unknown>): string[] {
  return PII_FIELDS_FORBIDDEN_IN_ACTIVITY.filter(f => f in data);
}

// Tipos de evento permitidos (rules-75 §4.2)
const ALLOWED_EVENT_TYPES = new Set([
  'conv_subscription_activated',
  'conv_channel_connected',
  'conv_channel_offboarded',
  'conv_conversation_started',
  'conv_identity_validated',
  'conv_pre_incident_created',
  'conv_incident_created',
  'conv_lead_created',
  'conv_case_escalated',
  'conv_case_summary_updated',
  'conv_case_closed',
  'conv_case_created',
  'conv_message_delivery_failed',
]);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') {
    return err(ERROR_CODES.INVALID_ACTION, 'Solo se acepta POST', 405);
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!(await isServiceRoleRequest(req, serviceRoleKey))) {
    return err(ERROR_CODES.UNAUTHORIZED, 'Se requiere service_role key', 401);
  }

  const log = createSafeLogger(EF_NAME);

  // fire-and-log: errores de parse no rompen el caller
  let body: {
    event_type?: string;
    source?: string;
    client_account_id?: string;
    timestamp?: string;
    data?: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    log.warn('body parse error — descartando evento');
    return ok({ published: false, reason: 'invalid_json' });
  }

  const { event_type, source, client_account_id, data } = body;

  // Validaciones estructurales (sin lanzar error al caller)
  if (!event_type || !client_account_id || !data) {
    log.warn('campos obligatorios ausentes', {
      has_event_type: String(!!event_type),
      has_client_account_id: String(!!client_account_id),
      has_data: String(!!data),
    });
    return ok({ published: false, reason: 'missing_required_fields' });
  }

  if (source !== 'smartconversations') {
    log.warn('source inválido', { source: source ?? 'undefined' });
    return ok({ published: false, reason: 'invalid_source' });
  }

  if (!ALLOWED_EVENT_TYPES.has(event_type)) {
    log.warn('event_type no reconocido', { event_type });
    return ok({ published: false, reason: 'unknown_event_type' });
  }

  // Guardia PII: nunca propagar datos personales al activity log
  const piiViolations = findPiiInPayload(data);
  if (piiViolations.length > 0) {
    log.error('PII detectada en payload de activity log — evento descartado', {
      event_type,
      violations_count: String(piiViolations.length),
    });
    return ok({ published: false, reason: 'pii_violation', violations: piiViolations });
  }

  // Guardia de campo restringido: ciertos eventos no permiten campos internos en el payload
  if (
    (event_type === 'conv_incident_created' || event_type === 'conv_lead_created') &&
    hasSessionIdInRestrictedPayload(
      event_type as 'conv_incident_created' | 'conv_lead_created',
      data,
    )
  ) {
    log.error('campo restringido detectado en payload de evento — evento descartado', { event_type });
    return ok({ published: false, reason: 'restricted_field_in_payload' });
  }

  // TODO Fase posterior — llamar al Core activity log API real
  // Por ahora: stub estructurado para smoke testing
  log.info('activity event published (stub)', {
    event_type,
    client_account_id,
    timestamp: body.timestamp ?? new Date().toISOString(),
  });

  return ok({ published: true });
});
