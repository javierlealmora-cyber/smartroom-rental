/**
 * incidents-integration-port.ts — Puerto neutral para integración de incidencias (Fase 11C5).
 *
 * Los módulos conversacionales SOLO dependen de este puerto.
 * No importan el adapter concreto ni ningún add-on específico.
 *
 * Contrato canónico v1.0 entre SmartConversations y el add-on de incidencias.
 */

import type { CanonicalActor } from './canonical-actor.ts';

// ─────────────────────────────────────────────────────────────────────────────
// DTO interno SC — representa el intent después de resolución server-side
// ─────────────────────────────────────────────────────────────────────────────

export interface InternalCreateIncidentCommand {
  contract_version: '1.0';
  client_account_id: string;
  request_id: string;
  correlation_id: string;
  idempotency_key: string;
  source_system: 'smart_conversations';
  source_channel: 'whatsapp' | 'webchat';
  actor: CanonicalActor;
  requester_profile_id: string;   // resuelto server-side en EF; NUNCA desde n8n/WF-20
  incident: {
    accommodation_id: string;
    room_id: string | null;
    category: string;
    title: string;                    // 5–120 chars, generado antes de llamar al puerto
    description: string;
    urgency_proposal: string | null;  // representación SC interna — no se envía al provider
    // external_request_reference omitido del DTO interno — el adapter siempre envía null al root
  };
}

// Alias de compatibilidad hacia atrás
export type CreateIncidentCommand = InternalCreateIncidentCommand;

// ─────────────────────────────────────────────────────────────────────────────
// DTO provider v1.0 — lo que se envía al add-on de Smart Incidents
// Estructura exacta del contrato: external_request_reference y requester_profile_id
// pertenecen a la RAÍZ, no dentro de incident.
// ─────────────────────────────────────────────────────────────────────────────

export type ProviderSmartIncidentsActor = { type: 'system' };

export interface ProviderCreateIncidentRequestV1 {
  contract_version: '1.0';
  client_account_id: string;
  request_id: string;
  correlation_id: string;
  idempotency_key: string;
  source_system: 'smart_conversations';
  source_channel: 'whatsapp' | 'webchat';
  external_request_reference: null;    // RAÍZ — nunca dentro de incident; nunca conv_case_id en claro
  actor: ProviderSmartIncidentsActor;
  requester_profile_id: string;        // RAÍZ — resuelto server-side en EF; NUNCA desde n8n
  incident: {
    accommodation_id: string;
    room_id: string | null;
    category: string;
    title: string;
    description: string;
    priority: 'normal' | 'urgent';  // mapeado desde urgency_proposal
    // No incluye: requester_profile_id, external_request_reference
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs de salida
// ─────────────────────────────────────────────────────────────────────────────

export interface ProviderCreateIncidentResultV1 {
  incident_id: string;
  incident_reference: string | null;
  status: 'new';           // validado: SC rechaza si status !== 'new'
  created_at: string;
  idempotent_replay: boolean;
}

export interface CreateIncidentResult {
  incident_id: string;
  incident_reference: string | null;
  status: string;
  created_at: string;
  idempotent_replay: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Códigos de error del PROVIDER (Smart Incidents add-on) — exactamente 15 contractuales.
// No mezclar con errores internos del consumer (SC-side).
// Estos son los únicos códigos que el provider puede devolver legítimamente.
// ─────────────────────────────────────────────────────────────────────────────

export type ProviderErrorCode =
  | 'UNSUPPORTED_CONTRACT_VERSION'
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_REQUIRED'
  | 'CALLER_NOT_AUTHORIZED'
  | 'FEATURE_DISABLED'
  | 'RESOURCE_NOT_FOUND'
  | 'REQUESTER_NOT_ALLOWED'
  | 'INVALID_CATEGORY'
  | 'INVALID_PRIORITY'
  | 'ATTACHMENTS_NOT_SUPPORTED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'RATE_LIMITED'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'PROVIDER_TIMEOUT'
  | 'INTERNAL_ERROR';

export const PROVIDER_ERROR_CODES: Readonly<Record<ProviderErrorCode, ProviderErrorCode>> = {
  UNSUPPORTED_CONTRACT_VERSION: 'UNSUPPORTED_CONTRACT_VERSION',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  CALLER_NOT_AUTHORIZED: 'CALLER_NOT_AUTHORIZED',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  REQUESTER_NOT_ALLOWED: 'REQUESTER_NOT_ALLOWED',
  INVALID_CATEGORY: 'INVALID_CATEGORY',
  INVALID_PRIORITY: 'INVALID_PRIORITY',
  ATTACHMENTS_NOT_SUPPORTED: 'ATTACHMENTS_NOT_SUPPORTED',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  DEPENDENCY_UNAVAILABLE: 'DEPENDENCY_UNAVAILABLE',
  PROVIDER_TIMEOUT: 'PROVIDER_TIMEOUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Errores internos del consumer SC — NO se envían como códigos provider,
// NO aparecen en la allowlist provider, NO aparecen en OpenAPI provider.
// Son errores que SC genera antes de llamar al provider o al procesar su respuesta.
// ─────────────────────────────────────────────────────────────────────────────

export type ConsumerInternalIncidentErrorCode =
  | 'REQUESTER_IDENTITY_REQUIRED'
  | 'INCIDENT_RESOURCE_CONTEXT_REQUIRED'
  | 'INCIDENT_SERVICE_INACTIVE'
  | 'INCIDENT_CHANNEL_INACTIVE'
  | 'INCIDENT_RESOURCE_RESOLUTION_FAILED'
  | 'INCIDENT_IDEMPOTENCY_CONFIGURATION_REQUIRED'
  | 'UNSUPPORTED_ACTOR_TYPE'
  | 'UNKNOWN_URGENCY'
  | 'TITLE_REQUIRED'
  | 'TITLE_TOO_SHORT'
  | 'ACCOMMODATION_REQUIRED'
  | 'INCIDENT_STATUS_MISMATCH'
  | 'CONFIGURATION_ERROR'
  | 'CONTRACT_MISMATCH'
  | 'TIMEOUT'
  | 'IDEMPOTENCY_KEY_INVALID'
  | 'INCIDENT_SOURCE_CHANNEL_INVALID'
  | 'INCIDENT_TENANT_MISMATCH'
  | 'INCIDENT_CASE_SESSION_MISMATCH'
  | 'INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED';

export const CONSUMER_INTERNAL_INCIDENT_ERROR_CODES: Readonly<Record<ConsumerInternalIncidentErrorCode, ConsumerInternalIncidentErrorCode>> = {
  REQUESTER_IDENTITY_REQUIRED: 'REQUESTER_IDENTITY_REQUIRED',
  INCIDENT_RESOURCE_CONTEXT_REQUIRED: 'INCIDENT_RESOURCE_CONTEXT_REQUIRED',
  INCIDENT_SERVICE_INACTIVE: 'INCIDENT_SERVICE_INACTIVE',
  INCIDENT_CHANNEL_INACTIVE: 'INCIDENT_CHANNEL_INACTIVE',
  INCIDENT_RESOURCE_RESOLUTION_FAILED: 'INCIDENT_RESOURCE_RESOLUTION_FAILED',
  INCIDENT_IDEMPOTENCY_CONFIGURATION_REQUIRED: 'INCIDENT_IDEMPOTENCY_CONFIGURATION_REQUIRED',
  UNSUPPORTED_ACTOR_TYPE: 'UNSUPPORTED_ACTOR_TYPE',
  UNKNOWN_URGENCY: 'UNKNOWN_URGENCY',
  TITLE_REQUIRED: 'TITLE_REQUIRED',
  TITLE_TOO_SHORT: 'TITLE_TOO_SHORT',
  ACCOMMODATION_REQUIRED: 'ACCOMMODATION_REQUIRED',
  INCIDENT_STATUS_MISMATCH: 'INCIDENT_STATUS_MISMATCH',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  CONTRACT_MISMATCH: 'CONTRACT_MISMATCH',
  TIMEOUT: 'TIMEOUT',
  IDEMPOTENCY_KEY_INVALID: 'IDEMPOTENCY_KEY_INVALID',
  INCIDENT_SOURCE_CHANNEL_INVALID: 'INCIDENT_SOURCE_CHANNEL_INVALID',
  INCIDENT_TENANT_MISMATCH: 'INCIDENT_TENANT_MISMATCH',
  INCIDENT_CASE_SESSION_MISMATCH: 'INCIDENT_CASE_SESSION_MISMATCH',
  INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED: 'INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Estrategia de idempotencia — HMAC-SHA256 con secreto server-side
// ─────────────────────────────────────────────────────────────────────────────

export const IDEMPOTENCY_STRATEGY = 'CONSUMER_IDEMPOTENCY_HASH_DERIVED';

/**
 * Deriva una clave de idempotencia opaca usando HMAC-SHA256 con un secreto server-side.
 *
 * La clave resultante:
 *   - Es opaca: no contiene client_account_id, conv_case_id ni estructura interna en claro
 *   - Es estable: mismos inputs + mismo secreto → misma clave (determinista)
 *   - Tiene 64 chars hex (SHA-256 = 32 bytes = 64 hex) — dentro del rango 16–128
 *   - El secreto NUNCA se incluye en la clave de salida ni en logs
 *
 * Estado: IMPLEMENTED_DERIVED_OPAQUE + CONSUMER_IDEMPOTENCY_PERSISTENCE_PENDING
 * (La clave es opaca y estable, pero no hay almacenamiento durable del lado consumer en esta fase.)
 */
export async function deriveIncidentIdempotencyKey(
  clientAccountId: string,
  convCaseId: string,
  secret: string,
): Promise<string> {
  if (!convCaseId || convCaseId.trim() === '') {
    throw new Error('INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED');
  }
  const enc = new TextEncoder();
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const data = enc.encode(`${clientAccountId}:create_incident:${convCaseId}:1.0`);
  const signature = await globalThis.crypto.subtle.sign('HMAC', keyMaterial, data);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// source: smart_conversations — literal identificador del sistema de origen para este integration
export const INCIDENT_SOURCE_SYSTEM = 'smart_conversations' as const;

// ─────────────────────────────────────────────────────────────────────────────
// Resolución de canal — fail-closed. Fuente canónica: conv_session.channel.
// No acepta fallback a whatsapp; valor desconocido o ausente → error interno.
// ─────────────────────────────────────────────────────────────────────────────

export function resolveIncidentSourceChannel(
  channel: string | null | undefined,
): 'whatsapp' | 'webchat' {
  if (channel === 'whatsapp') return 'whatsapp';
  if (channel === 'webchat') return 'webchat';
  throw new Error('INCIDENT_SOURCE_CHANNEL_INVALID');
}

export function assertSourceChannelNotOverridden(
  resolvedChannel: 'whatsapp' | 'webchat',
  bodySource: unknown,
): void {
  if (bodySource === null || bodySource === undefined) return;
  if (typeof bodySource !== 'string') return;
  if (bodySource !== resolvedChannel) {
    throw new Error('INCIDENT_SOURCE_CHANNEL_INVALID');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Resolución de tenant — fail-closed. Fuente canónica: conv_case + conv_session.
// El body puede declarar client_account_id; se rechaza si no coincide con el
// resuelto server-side. n8n no puede seleccionar ni sobrescribir el tenant.
// ─────────────────────────────────────────────────────────────────────────────

export interface IncidentCaseResolutionRow {
  client_account_id?: string | null;
  session_id?: string | null;
}

export interface IncidentSessionResolutionRow {
  client_account_id?: string | null;
}

export function resolveTenantFromContext(
  caseRow: IncidentCaseResolutionRow | null | undefined,
  sessionRow: IncidentSessionResolutionRow | null | undefined,
  providedSessionId: string,
  bodyClientAccountId?: string | null,
): string {
  if (!caseRow || !caseRow.client_account_id) {
    throw new Error('INCIDENT_TENANT_MISMATCH');
  }
  if (!sessionRow || !sessionRow.client_account_id) {
    throw new Error('INCIDENT_TENANT_MISMATCH');
  }
  if (caseRow.session_id && caseRow.session_id !== providedSessionId) {
    throw new Error('INCIDENT_CASE_SESSION_MISMATCH');
  }
  const caseTenant = caseRow.client_account_id;
  const sessionTenant = sessionRow.client_account_id;
  if (caseTenant !== sessionTenant) {
    throw new Error('INCIDENT_CASE_SESSION_MISMATCH');
  }
  if (bodyClientAccountId && bodyClientAccountId !== caseTenant) {
    throw new Error('INCIDENT_TENANT_MISMATCH');
  }
  return caseTenant;
}

// ─────────────────────────────────────────────────────────────────────────────
// Estado de health
// ─────────────────────────────────────────────────────────────────────────────

export type IncidentAddonHealthStatus =
  | 'mock' | 'healthy' | 'degraded' | 'unavailable'
  | 'misconfigured' | 'contract_mismatch' | 'canary';

// ─────────────────────────────────────────────────────────────────────────────
// Puerto neutral
// ─────────────────────────────────────────────────────────────────────────────

export interface IncidentIntegrationPort {
  createIncident(command: InternalCreateIncidentCommand): Promise<{
    ok: boolean;
    data?: CreateIncidentResult;
    error_code?: string;
    error_message?: string;
    meta: { mode: string; duration_ms: number; idempotent_replay: boolean };
  }>;

  health(): Promise<{ status: IncidentAddonHealthStatus }>;
  getReadiness(): Promise<{ ready: boolean; reason?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Campos prohibidos en el resultado del add-on
// ─────────────────────────────────────────────────────────────────────────────

export const INCIDENT_FORBIDDEN_OUTPUT_FIELDS = new Set([
  'profile_id',
  'phone',
  'email',
  'identity_data',
  'raw_payload',
  'authorization',
  'service_role',
  'api_key',
  'sql',
  'sender_ref',
  'wa_jid',
  'conv_session_id',
  'conv_case_id',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Validación del resultado — status MUST be 'new'
// ─────────────────────────────────────────────────────────────────────────────

export function validateIncidentResult(raw: unknown, expectedTenant: string): { ok: boolean; reason?: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: 'RESULT_NOT_OBJECT' };
  const r = raw as Record<string, unknown>;
  for (const k of Object.keys(r)) {
    if (INCIDENT_FORBIDDEN_OUTPUT_FIELDS.has(k.toLowerCase())) {
      return { ok: false, reason: `FORBIDDEN_OUTPUT_FIELD: ${k}` };
    }
  }
  if (!r['incident_id'] || typeof r['incident_id'] !== 'string') {
    return { ok: false, reason: 'INCIDENT_ID_MISSING_OR_INVALID' };
  }
  if (r['incident_id'].toString().trim() === '') {
    return { ok: false, reason: 'INCIDENT_ID_EMPTY' };
  }
  if (r['client_account_id'] && r['client_account_id'] !== expectedTenant) {
    return { ok: false, reason: 'TENANT_MISMATCH_IN_RESULT' };
  }
  if (r['status'] !== undefined && r['status'] !== 'new') {
    return { ok: false, reason: `INCIDENT_STATUS_MISMATCH: expected 'new', got '${r['status']}'` };
  }
  return { ok: true };
}
