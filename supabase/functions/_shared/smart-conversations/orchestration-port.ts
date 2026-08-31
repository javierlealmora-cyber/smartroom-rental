/**
 * orchestration-port.ts — Puerto neutral de orquestación (Fase 11C4).
 *
 * Los módulos de dominio importan este puerto, no n8n directamente.
 * La implementación concreta (N8nOrchestrationAdapter, MockOrchestrationAdapter)
 * se inyecta en el punto de composición.
 *
 * Principio: el orquestador propone el siguiente paso.
 * SmartConversations valida y ejecuta la acción.
 */

import type { IntegrationResult } from './integration-framework.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos de acción permitidos en el output del orquestador
// ─────────────────────────────────────────────────────────────────────────────

export type AllowedNextAction =
  | 'ask_user'
  | 'invoke_port'
  | 'enqueue_response'
  | 'wait'
  | 'complete'
  | 'escalate';

/** Targets allowlisted para invoke_port y enqueue_response. */
export const ALLOWED_ACTION_TARGETS = new Set([
  'core.identity.validate',
  'core.listings.query',
  'core.help.kb.query',
  'core.tenant.features',
  'core.activity.publish',
  'ai.intent.classify',
  'ai.incident.extract',
  'ai.listing.extract',
  'ai.help.extract',
  'ai.safe_summary',
  'ai.response_draft',
  'incidents_addon.incident.create',
  'listings_addon.listings.search',
  'listings_addon.lead.create',
  'outbound.wa',
  'outbound.webchat',
  'session.ask_clarification',
  'case.escalate',
]);

export type OrchestrationChannel = 'webchat' | 'whatsapp';
export type OrchestrationConversationState =
  | 'idle'
  | 'waiting_service_selection'
  | 'waiting_identity'
  | 'in_service_incidencias'
  | 'in_service_publicaciones'
  | 'in_service_ayuda'
  | 'waiting_clarification'
  | 'case_open'
  | 'completed';

export type OrchestrationIdentityLevel =
  | 'NO_MATCH'
  | 'MATCH_INACTIVE'
  | 'PARTIAL_MATCH_ACTIVE'
  | 'STRONG_MATCH_ACTIVE'
  | null;

// ─────────────────────────────────────────────────────────────────────────────
// Contrato de entrada al orquestador (versionado)
// ─────────────────────────────────────────────────────────────────────────────

export interface OrchestrationInputDTO {
  /** Versión del contrato — cambio de breaking version requiere migración explícita. */
  contract_version: '1.0';
  /** Código del workflow del catálogo allowlisted. */
  workflow_code: string;
  /** Operación semántica dentro del workflow. */
  operation: string;
  /** UUID generado por la EF caller — nunca por n8n. */
  request_id: string;
  /** UUID de correlación de sesión conversacional. */
  correlation_id: string;
  /** UUID único para deduplicación de efectos. Obligatorio para ops mutables. */
  idempotency_key: string;
  /** UUID del tenant. */
  client_account_id: string;
  /** Referencia opaca de sesión conversacional. */
  session_id: string;
  /** Referencia opaca de caso activo, o null. */
  case_id: string | null;
  /** Código del servicio conversacional activo. */
  service_code: 'conv_incidencias' | 'conv_publicaciones' | 'conv_ayuda' | null;
  channel: OrchestrationChannel;
  /** Estado actual de la conversación dentro de la máquina de estados definida. */
  conversation_state: OrchestrationConversationState;
  /**
   * Nivel de identidad: solo para orquestación dentro de SmartConversations.
   * n8n no recibe datos PII ni candidatos de matching — identity_level es solo el nivel enum.
   */
  identity_level: OrchestrationIdentityLevel;
  safe_message: {
    text: string;        // máx 2000 chars, sanitizado
    language: string;
  };
  safe_context: {
    known_fields: Record<string, string | number | boolean | null>;
    missing_fields: string[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Contrato de salida del orquestador
// ─────────────────────────────────────────────────────────────────────────────

export interface OrchestrationNextAction {
  type: AllowedNextAction;
  target: string | null;
  payload: Record<string, string | number | boolean | null>;
}

export interface OrchestrationOutputDTO {
  ok: boolean;
  data: {
    workflow_code: string;
    workflow_version: string;
    next_action: OrchestrationNextAction;
  };
  meta: {
    request_id: string;
    correlation_id: string;
    duration_ms: number;
    mode: string;
    execution_reference: string | null;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Contrato de callback n8n → SmartConversations
// ─────────────────────────────────────────────────────────────────────────────

export interface OrchestrationCallbackDTO {
  contract_version: '1.0';
  workflow_code: string;
  workflow_version: string;
  request_id: string;
  correlation_id: string;
  idempotency_key: string;
  /** Timestamp ISO 8601 — obligatorio para anti-replay. */
  timestamp_iso: string;
  /** Tenant de fuente confiable (nunca de input no autenticado). */
  client_account_id: string;
  result: OrchestrationNextAction;
}

// ─────────────────────────────────────────────────────────────────────────────
// Puerto neutral de orquestación
// ─────────────────────────────────────────────────────────────────────────────

export interface OrchestrationIntegrationPort {
  /** Inicia un flujo conversacional nuevo. */
  startConversationFlow(
    input: OrchestrationInputDTO,
  ): Promise<IntegrationResult<OrchestrationOutputDTO>>;

  /** Continúa un flujo conversacional existente. */
  continueConversationFlow(
    input: OrchestrationInputDTO,
  ): Promise<IntegrationResult<OrchestrationOutputDTO>>;

  /** Solicita routing (clasificación + selección de servicio). No mutable. */
  routeConversation(
    input: OrchestrationInputDTO,
  ): Promise<IntegrationResult<OrchestrationOutputDTO>>;

  /** Ejecuta un flujo de servicio (incidencias, publicaciones, ayuda). Puede ser mutable. */
  executeServiceFlow(
    input: OrchestrationInputDTO,
  ): Promise<IntegrationResult<OrchestrationOutputDTO>>;

  /** Solicita encolado de respuesta outbound. Mutable con idempotency. */
  requestOutboundDispatch(
    input: OrchestrationInputDTO,
  ): Promise<IntegrationResult<OrchestrationOutputDTO>>;

  /** Estado de salud sanitizado. Sin endpoint, sin token, sin internals. */
  health(): Promise<{ status: 'mock' | 'healthy' | 'degraded' | 'unavailable' | 'misconfigured' | 'contract_mismatch' | 'canary' | 'shadow' | 'real' | 'disabled' }>;

  /** Indica si el orquestador puede aceptar tráfico. */
  readiness(): Promise<{ ready: boolean; reason?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Campos PII prohibidos en OrchestrationInputDTO
// ─────────────────────────────────────────────────────────────────────────────

export const ORCHESTRATION_FORBIDDEN_INPUT_FIELDS = new Set([
  'profile_id', 'sender_ref', 'phone', 'phone_number', 'email',
  'identity_data', 'raw_payload', 'jid', 'wa_jid', 'webchat_token',
  'authorization', 'service_role', 'full_name', 'room_label',
  'residence_name', 'assignment_id', 'contact', 'ip_address',
  'tokens', 'jwt', 'api_key', 'secret',
  'matching_candidates', 'identity_score', 'partial_match_data',
]);

/** Campos prohibidos en outputs del orquestador (rechaza output si los contiene). */
export const ORCHESTRATION_FORBIDDEN_OUTPUT_FIELDS = new Set([
  'profile_id', 'phone', 'email', 'identity_data', 'raw_payload',
  'authorization', 'service_role', 'api_key', 'secret', 'jwt',
  'sql', 'execute_command', 'eval',
  'client_account_id', // el tenant no puede ser alterado por n8n
]);

// ─────────────────────────────────────────────────────────────────────────────
// Validación de input
// ─────────────────────────────────────────────────────────────────────────────

export function validateOrchestrationInput(dto: Partial<OrchestrationInputDTO>): { valid: boolean; reason?: string } {
  if (!dto.client_account_id) return { valid: false, reason: 'client_account_id_required' };
  if (!dto.correlation_id)    return { valid: false, reason: 'correlation_id_required' };
  if (!dto.request_id)        return { valid: false, reason: 'request_id_required' };
  if (!dto.idempotency_key)   return { valid: false, reason: 'idempotency_key_required' };
  if (!dto.workflow_code)     return { valid: false, reason: 'workflow_code_required' };
  if (!dto.contract_version)  return { valid: false, reason: 'contract_version_required' };
  if (dto.safe_message?.text && dto.safe_message.text.length > 2000) {
    return { valid: false, reason: 'safe_message_text_exceeds_limit' };
  }
  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Validación de output del orquestador
// ─────────────────────────────────────────────────────────────────────────────

const VALID_NEXT_ACTION_TYPES = new Set<AllowedNextAction>([
  'ask_user', 'invoke_port', 'enqueue_response', 'wait', 'complete', 'escalate',
]);

export function validateOrchestrationOutput(raw: unknown, expectedTenant: string): { ok: boolean; reason?: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'OUTPUT_NOT_OBJECT' };
  const d = raw as Record<string, unknown>;

  // No puede cambiar tenant
  if (d['client_account_id'] && d['client_account_id'] !== expectedTenant) {
    return { ok: false, reason: 'TENANT_MISMATCH_IN_OUTPUT' };
  }

  // Campos prohibidos en output
  for (const k of Object.keys(d)) {
    if (ORCHESTRATION_FORBIDDEN_OUTPUT_FIELDS.has(k.toLowerCase())) {
      return { ok: false, reason: `FORBIDDEN_FIELD_IN_OUTPUT: ${k}` };
    }
  }

  const data = d['data'] as Record<string, unknown> | undefined;
  if (!data) return { ok: false, reason: 'DATA_MISSING' };

  const next_action = data['next_action'] as Record<string, unknown> | undefined;
  if (!next_action) return { ok: false, reason: 'NEXT_ACTION_MISSING' };

  const actionType = next_action['type'];
  if (typeof actionType !== 'string' || !VALID_NEXT_ACTION_TYPES.has(actionType as AllowedNextAction)) {
    return { ok: false, reason: `UNKNOWN_ACTION_TYPE: ${actionType}` };
  }

  const target = next_action['target'];
  if (target !== null && typeof target === 'string' && target !== '' && !ALLOWED_ACTION_TARGETS.has(target)) {
    return { ok: false, reason: `UNKNOWN_ACTION_TARGET: ${target}` };
  }

  // SQL/eval en payload
  const payloadStr = JSON.stringify(next_action['payload'] ?? {});
  if (/select\s+\*\s+from|drop\s+table/i.test(payloadStr)) {
    return { ok: false, reason: 'SQL_IN_OUTPUT' };
  }
  if (/<script/i.test(payloadStr) || /\beval\s*\(/.test(payloadStr)) {
    return { ok: false, reason: 'SCRIPT_IN_OUTPUT' };
  }

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Validación de callback
// ─────────────────────────────────────────────────────────────────────────────

const CALLBACK_REPLAY_WINDOW_MS = 5 * 60 * 1000; // 5 minutos

export function validateCallbackTimestamp(timestampIso: string, nowMs?: number): { valid: boolean; reason?: string } {
  const now = nowMs ?? Date.now();
  const ts = new Date(timestampIso).getTime();
  if (isNaN(ts)) return { valid: false, reason: 'INVALID_TIMESTAMP' };
  const diff = now - ts;
  if (diff > CALLBACK_REPLAY_WINDOW_MS) return { valid: false, reason: 'TIMESTAMP_TOO_OLD' };
  if (diff < -60_000) return { valid: false, reason: 'TIMESTAMP_TOO_FUTURE' };
  return { valid: true };
}
