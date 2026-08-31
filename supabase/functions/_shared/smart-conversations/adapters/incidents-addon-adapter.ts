/**
 * incidents-addon-adapter.ts — Adapter para el add-on de incidencias v1.0 (Fase 11C5E).
 *
 * Puerto: IncidentIntegrationPort
 * Operación: InternalCreateIncidentCommand → ProviderCreateIncidentRequestV1
 *
 * El add-on NO recibe:
 *   - Enums internos de identidad (STRONG_MATCH_ACTIVE, etc.)
 *   - Teléfono, sender_ref, raw_payload, tokens WebChat
 *   - Prompts de IA
 *   - Datos de tablas conv_*
 *
 * Actor provider: siempre { type: 'system' } — derivado de system_service canonical actor.
 * requester_profile_id: resuelto server-side en EF antes de llamar al adapter.
 * priority: mapeado desde urgency_proposal — valores desconocidos abortan la invocación.
 */

import type { IntegrationResult, IntegrationMode } from '../integration-framework.ts';
import {
  resolveMode, assertRealModeAllowed, buildSuccess, buildError, buildDisabledError,
  INTEGRATION_POLICIES, checkCircuit, recordSuccess, recordFailure,
} from '../integration-framework.ts';

import type { CanonicalActor } from '../canonical-actor.ts';
import type {
  InternalCreateIncidentCommand,
  ProviderCreateIncidentRequestV1,
  CreateIncidentResult,
  ProviderErrorCode,
} from '../incidents-integration-port.ts';
import { INCIDENT_SOURCE_SYSTEM } from '../incidents-integration-port.ts';

import { mapCanonicalActorToSmartIncidentsActor, ActorMappingError } from './incidents-actor-mapper.ts';
import { mapUrgencyToPriority, UrgencyMappingError } from './incidents-priority-mapper.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Campos prohibidos en el actor del comando — guardia de privacidad
// ─────────────────────────────────────────────────────────────────────────────

const INCIDENT_FORBIDDEN_ACTOR_FIELDS = new Set([
  'STRONG_MATCH_ACTIVE', 'PARTIAL_MATCH_ACTIVE', 'NO_MATCH', 'MATCH_INACTIVE',
  'phone_number', 'phone', 'sender_ref', 'wa_jid',
  'identity_level', 'identity_data', 'raw_payload',
]);

export function validateIncidentCommandActor(cmd: InternalCreateIncidentCommand): string | null {
  // Only system_service is allowed. 'tenant_profile' and 'unverified_lead' are rejected.
  const canonicalActor = cmd.actor as CanonicalActor;
  if (canonicalActor.type !== 'system_service') {
    return `unsupported_actor_type: ${canonicalActor.type}`;
  }
  const actorRecord = cmd.actor as unknown as Record<string, unknown>;
  for (const key of Object.keys(actorRecord)) {
    if (INCIDENT_FORBIDDEN_ACTOR_FIELDS.has(key)) {
      return `forbidden_actor_field: ${key}`;
    }
  }
  if (!cmd.incident.accommodation_id) {
    return 'accommodation_id_required';
  }
  if (!cmd.requester_profile_id) {
    return 'requester_profile_id_required';
  }
  if (!cmd.incident.title || cmd.incident.title.trim().length < 5) {
    return 'title_required_min_5_chars';
  }
  if (cmd.incident.title.length > 120) {
    return 'title_max_120_chars';
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Allowlist de error codes del provider — protege contra códigos desconocidos o inyectados
// ─────────────────────────────────────────────────────────────────────────────

// Allowlist de error codes que el provider (Smart Incidents add-on) puede devolver — exactamente 15.
// Cualquier código fuera de esta lista se colapsa a INTERNAL_ERROR para proteger el consumer.
const PROVIDER_ERROR_ALLOWLIST: ReadonlySet<ProviderErrorCode> = new Set<ProviderErrorCode>([
  'UNSUPPORTED_CONTRACT_VERSION', 'VALIDATION_ERROR', 'AUTHENTICATION_REQUIRED',
  'CALLER_NOT_AUTHORIZED', 'FEATURE_DISABLED', 'RESOURCE_NOT_FOUND',
  'REQUESTER_NOT_ALLOWED', 'INVALID_CATEGORY', 'INVALID_PRIORITY',
  'ATTACHMENTS_NOT_SUPPORTED', 'IDEMPOTENCY_CONFLICT', 'RATE_LIMITED',
  'DEPENDENCY_UNAVAILABLE', 'PROVIDER_TIMEOUT', 'INTERNAL_ERROR',
]);

export function mapProviderError(raw: unknown): ProviderErrorCode {
  if (!raw || typeof raw !== 'object') return 'INTERNAL_ERROR';
  const r = raw as Record<string, unknown>;
  const code = r['error_code'];
  if (typeof code !== 'string') return 'INTERNAL_ERROR';
  if (!PROVIDER_ERROR_ALLOWLIST.has(code as ProviderErrorCode)) return 'INTERNAL_ERROR';
  return code as ProviderErrorCode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Env helper
// ─────────────────────────────────────────────────────────────────────────────

function _getEnv(key: string): string | undefined {
  if (typeof Deno !== 'undefined') return Deno.env.get(key);
  if (typeof process !== 'undefined') return process.env[key];
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock response
// ─────────────────────────────────────────────────────────────────────────────

function _mockResponse(cmd: InternalCreateIncidentCommand): CreateIncidentResult {
  return {
    incident_id: `mock-incident-${cmd.correlation_id.slice(0, 8)}`,
    incident_reference: `INC-DEV-MOCK-${Date.now()}`,
    status: 'new',
    created_at: new Date().toISOString(),
    idempotent_replay: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Construcción del payload provider v1.0
// ─────────────────────────────────────────────────────────────────────────────

export function buildProviderRequest(
  cmd: InternalCreateIncidentCommand,
  priority: 'normal' | 'urgent',
): ProviderCreateIncidentRequestV1 {
  return {
    contract_version: '1.0',
    client_account_id: cmd.client_account_id,
    request_id: cmd.request_id,
    correlation_id: cmd.correlation_id,
    idempotency_key: cmd.idempotency_key,
    source_system: INCIDENT_SOURCE_SYSTEM,
    source_channel: cmd.source_channel,
    external_request_reference: null,    // RAÍZ — nunca dentro de incident; nunca conv_case_id en claro
    actor: mapCanonicalActorToSmartIncidentsActor(cmd.actor),
    requester_profile_id: cmd.requester_profile_id,  // RAÍZ — resuelto server-side en EF
    incident: {
      accommodation_id: cmd.incident.accommodation_id,
      room_id: cmd.incident.room_id,
      category: cmd.incident.category,
      title: cmd.incident.title,
      description: cmd.incident.description,
      priority,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter principal
// ─────────────────────────────────────────────────────────────────────────────

export async function createIncident(
  cmd: InternalCreateIncidentCommand,
  opts: { mode_override?: IntegrationMode; _fetchImpl?: typeof fetch } = {},
): Promise<IntegrationResult<CreateIncidentResult>> {
  const request_id = crypto.randomUUID();
  const meta_base = {
    request_id,
    correlation_id: cmd.correlation_id,
    provider: 'incidents_addon',
    idempotent_replay: false,
  };
  const policy = INTEGRATION_POLICIES['incidents_addon'];

  // Modo de integración
  const raw_mode = opts.mode_override ?? resolveMode(_getEnv('INCIDENTS_ADDON_INTEGRATION_MODE'));
  const modeCheck = assertRealModeAllowed(raw_mode, _getEnv('APP_ENVIRONMENT'));
  if (!modeCheck.allowed) {
    return buildError('CONFIGURATION_ERROR', 'real mode requires DEV environment',
      { ...meta_base, mode: raw_mode, duration_ms: 0 });
  }

  // Validación de actor y campos requeridos
  const validationError = validateIncidentCommandActor(cmd);
  if (validationError) {
    return buildError('VALIDATION_ERROR', validationError,
      { ...meta_base, mode: raw_mode, duration_ms: 0 });
  }

  // Mapeo urgency → priority (valores desconocidos abortan)
  let priority: 'normal' | 'urgent';
  try {
    priority = mapUrgencyToPriority(cmd.incident.urgency_proposal);
  } catch (err) {
    if (err instanceof UrgencyMappingError) {
      return buildError('VALIDATION_ERROR', err.code,
        { ...meta_base, mode: raw_mode, duration_ms: 0 });
    }
    throw err;
  }

  // Mapeo actor (actores no-system abortan)
  try {
    mapCanonicalActorToSmartIncidentsActor(cmd.actor);
  } catch (err) {
    if (err instanceof ActorMappingError) {
      return buildError('VALIDATION_ERROR', err.code,
        { ...meta_base, mode: raw_mode, duration_ms: 0 });
    }
    throw err;
  }

  if (raw_mode === 'disabled') {
    return buildDisabledError('incidents_addon', request_id, cmd.correlation_id);
  }

  if (raw_mode === 'mock') {
    return buildSuccess(_mockResponse(cmd), { ...meta_base, mode: 'mock', duration_ms: 0 });
  }

  // Circuit breaker
  const circuit = checkCircuit('incidents_addon', policy);
  if (!circuit.allowed) {
    return buildError('DEPENDENCY_UNAVAILABLE', 'circuit_open',
      { ...meta_base, mode: raw_mode, duration_ms: 0 }, { retryable: true });
  }

  const baseUrl = _getEnv('INCIDENTS_ADDON_BASE_URL');
  const token = _getEnv('INCIDENTS_ADDON_SERVICE_TOKEN');
  if (!baseUrl || !token) {
    return buildError('CONFIGURATION_ERROR', 'incidents_addon configuration missing',
      { ...meta_base, mode: raw_mode, duration_ms: 0 });
  }

  // Construir payload v1.0
  const providerPayload = buildProviderRequest(cmd, priority);

  const fetchImpl = opts._fetchImpl ?? globalThis.fetch;
  const start = Date.now();
  try {
    const resp = await fetchImpl(`${baseUrl}/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Idempotency-Key': cmd.idempotency_key,
        'X-Correlation-Id': cmd.correlation_id,
        'X-Source': 'smart_conversations',
      },
      body: JSON.stringify(providerPayload),
      signal: AbortSignal.timeout(policy.timeout_ms),
    });
    const duration_ms = Date.now() - start;

    if (resp.status === 409) {
      return buildError('IDEMPOTENCY_CONFLICT', 'incidents_addon_idempotency_conflict',
        { ...meta_base, mode: raw_mode, duration_ms }, { retryable: false });
    }
    if (resp.status === 429) {
      recordFailure('incidents_addon', policy);
      const retry_after = parseInt(resp.headers.get('Retry-After') ?? '60', 10);
      return buildError('RATE_LIMITED', 'rate_limited',
        { ...meta_base, mode: raw_mode, duration_ms }, { retryable: true, retry_after_seconds: retry_after });
    }
    if (resp.status >= 500) {
      recordFailure('incidents_addon', policy);
      return buildError('DEPENDENCY_UNAVAILABLE', 'incidents_addon_5xx',
        { ...meta_base, mode: raw_mode, duration_ms }, { retryable: true });
    }
    if (!resp.ok) {
      const body = await resp.json().catch(() => null);
      const mappedCode = mapProviderError(body);
      return buildError(mappedCode, `incidents_addon_${resp.status}`,
        { ...meta_base, mode: raw_mode, duration_ms });
    }
    const json = await resp.json() as CreateIncidentResult;
    if (!json.incident_id) {
      recordFailure('incidents_addon', policy);
      return buildError('CONTRACT_MISMATCH', 'incidents_addon_response_invalid',
        { ...meta_base, mode: raw_mode, duration_ms });
    }
    // Validar status === 'new'
    if (json.status !== 'new') {
      recordFailure('incidents_addon', policy);
      return buildError('CONTRACT_MISMATCH', `INCIDENT_STATUS_MISMATCH: expected 'new', got '${json.status}'`,
        { ...meta_base, mode: raw_mode, duration_ms });
    }
    recordSuccess('incidents_addon');
    return buildSuccess(json, { ...meta_base, mode: raw_mode, duration_ms });

  } catch (err) {
    const duration_ms = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    recordFailure('incidents_addon', policy);
    return buildError(
      isTimeout ? 'TIMEOUT' : 'DEPENDENCY_UNAVAILABLE',
      isTimeout ? 'incidents_addon_timeout' : 'incidents_addon_network_error',
      { ...meta_base, mode: raw_mode, duration_ms }, { retryable: true },
    );
  }
}
