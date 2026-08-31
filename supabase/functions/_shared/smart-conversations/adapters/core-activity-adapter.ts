/**
 * core-activity-adapter.ts — Adapter de publicación Activity Log via Core (Fase 11C2).
 *
 * Modes: mock | shadow(*) | canary | real | disabled   (default: mock)
 * (*) shadow NO permitido para Activity Log: es mutante. Canary usa idempotency_key.
 *
 * Patrón fire-and-log:
 *   - Nunca propaga error al caller de la operación principal.
 *   - Fallo observable en logs sanitizados.
 *   - No hace retry infinito.
 *   - Idempotencia via idempotency_key: 409 = registro ya existente (ok).
 *
 * Los 13 eventos Activity Log oficiales (allowlist exhaustiva — no añadir más):
 *   conv_subscription_activated, conv_channel_connected, conv_channel_offboarded,
 *   conv_conversation_started, conv_identity_validated, conv_pre_incident_created,
 *   conv_incident_created, conv_lead_created, conv_case_escalated,
 *   conv_case_summary_updated, conv_case_closed, conv_case_created,
 *   conv_message_delivery_failed.
 *
 * PII prohibida en metadata:
 *   message_text, phone, email, sender_ref, profile_id, identity_data,
 *   raw_payload, jid, token, provider_response, conversation, full_name.
 */

import type { IntegrationResult, IntegrationMode } from '../integration-framework.ts';
import {
  resolveMode, assertRealModeAllowed, buildSuccess, buildError, buildDisabledError,
  INTEGRATION_POLICIES,
} from '../integration-framework.ts';
import { resolveEffectiveMode } from '../integration-canary.ts';

export type ActivityEventType =
  | 'conv_subscription_activated'
  | 'conv_channel_connected'
  | 'conv_channel_offboarded'
  | 'conv_conversation_started'
  | 'conv_identity_validated'
  | 'conv_pre_incident_created'
  | 'conv_incident_created'
  | 'conv_lead_created'
  | 'conv_case_escalated'
  | 'conv_case_summary_updated'
  | 'conv_case_closed'
  | 'conv_case_created'
  | 'conv_message_delivery_failed';

/** Allowlist exhaustiva — exactamente 13 eventos oficiales. No añadir más sin decisión arquitectónica. */
export const ALLOWED_ACTIVITY_EVENTS = new Set<string>([
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

/** Campos PII prohibidos en metadata del Activity Log. */
export const ACTIVITY_FORBIDDEN_METADATA_FIELDS = new Set<string>([
  'message_text', 'phone', 'email', 'sender_ref', 'profile_id', 'identity_data',
  'raw_payload', 'jid', 'wa_jid', 'token', 'service_role', 'authorization',
  'provider_response', 'conversation', 'messages', 'full_name', 'room_label',
  'residence_name', 'assignment_id', 'phone_number',
]);

export interface ActivityPublishRequest {
  event_type: ActivityEventType;
  client_account_id: string;
  correlation_id: string;
  idempotency_key: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityPublishResult {
  published: boolean;
  idempotent: boolean;
}

export function validateActivityRequest(req: ActivityPublishRequest): { valid: boolean; reason?: string } {
  if (!ALLOWED_ACTIVITY_EVENTS.has(req.event_type)) {
    return { valid: false, reason: `unknown_event_type: ${req.event_type}` };
  }
  if (!req.client_account_id) return { valid: false, reason: 'client_account_id_required' };
  if (!req.correlation_id)    return { valid: false, reason: 'correlation_id_required' };
  if (!req.idempotency_key)   return { valid: false, reason: 'idempotency_key_required' };

  if (req.metadata) {
    for (const key of Object.keys(req.metadata)) {
      if (ACTIVITY_FORBIDDEN_METADATA_FIELDS.has(key.toLowerCase())) {
        return { valid: false, reason: `forbidden_metadata_field: ${key}` };
      }
    }
  }
  return { valid: true };
}

/**
 * Publica un evento Activity Log via Core.
 *
 * Fire-and-log: siempre devuelve ok:true desde la perspectiva del caller.
 * Los fallos se registran sanitizados sin interrumpir la operación principal.
 */
export async function publishActivity(
  req: ActivityPublishRequest,
  options: { mode?: string; appEnvironment?: string } = {},
): Promise<IntegrationResult<ActivityPublishResult>> {
  const rawMode = options.mode
    ?? (typeof Deno !== 'undefined' ? Deno.env.get('CORE_INTEGRATION_MODE') : undefined)
    ?? 'mock';
  const mode: IntegrationMode = resolveMode(rawMode);

  if (mode === 'disabled') return buildDisabledError('core');

  const validation = validateActivityRequest(req);
  if (!validation.valid) {
    return buildError('VALIDATION_ERROR', validation.reason ?? 'invalid_activity_request', mode, 'core');
  }

  const guard = assertRealModeAllowed(mode, options.appEnvironment);
  if (!guard.allowed) {
    return buildError('CONFIGURATION_ERROR', guard.reason ?? 'real_mode_requires_dev_environment', mode, 'core');
  }

  // shadow NO permitido para Activity Log (operación mutante)
  if (mode === 'shadow') {
    return buildError('CONFIGURATION_ERROR', 'shadow_not_allowed_for_activity_log', mode, 'core');
  }

  if (mode === 'mock') {
    return buildSuccess({ published: true, idempotent: false }, mode, 'core');
  }

  const effectiveMode = resolveEffectiveMode(req.client_account_id, 'core', 'core.activity.publish', mode);

  try {
    const t0 = Date.now();
    const coreUrl = typeof Deno !== 'undefined' ? Deno.env.get('CORE_BASE_URL') : '';
    const coreToken = typeof Deno !== 'undefined' ? Deno.env.get('CORE_SERVICE_TOKEN') : '';

    const response = await fetch(`${coreUrl}/smartroom/conversations/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coreToken}`,
        'X-Client-Account-Id': req.client_account_id,
        'X-Request-Id': req.correlation_id,
        'Idempotency-Key': req.idempotency_key,
        'X-Source': 'smart_conversations',
      },
      body: JSON.stringify({
        event_type: req.event_type,
        client_account_id: req.client_account_id,
        correlation_id: req.correlation_id,
        idempotency_key: req.idempotency_key,
        metadata: req.metadata ?? {},
      }),
      signal: AbortSignal.timeout(INTEGRATION_POLICIES['core'].timeout_ms),
    });

    const duration_ms = Date.now() - t0;

    // 409 = idempotent replay
    if (response.status === 409) {
      return buildSuccess({ published: true, idempotent: true }, effectiveMode, 'core', duration_ms);
    }

    // fire-and-log: fallo registrado pero no propagado
    if (!response.ok) {
      return buildSuccess({ published: false, idempotent: false }, effectiveMode, 'core', duration_ms);
    }

    return buildSuccess({ published: true, idempotent: false }, effectiveMode, 'core', duration_ms);

  } catch (_err: unknown) {
    // fire-and-log: excepción nunca llega al caller
    return buildSuccess({ published: false, idempotent: false }, mode, 'core');
  }
}
