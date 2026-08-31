/**
 * core-identity-adapter.ts — Adapter de validación de identidad Core (Fase 11C2).
 *
 * Modes: mock | shadow | canary | real | disabled   (default: mock)
 *
 * SmartConversations mantiene la autoridad sobre:
 *   - intentos de identificación conversacional
 *   - transiciones de identity_level en la sesión
 *   - decisión de continuar el flujo
 *
 * Core NO devuelve instrucciones de diálogo.
 * Core NO conoce el workflow conversacional, n8n, Wasender ni proveedor IA.
 * Un retry HTTP no equivale a un nuevo intento de identidad del usuario.
 *
 * Los 4 identity levels oficiales:
 *   NO_MATCH | MATCH_INACTIVE | PARTIAL_MATCH_ACTIVE | STRONG_MATCH_ACTIVE
 *
 * Campos prohibidos en request:
 *   conversación completa, raw_payload, JID, WebChat token, prompt,
 *   provider response, información de otro tenant, full_name.
 *
 * profile_id: se almacena en sesión cuando corresponde; nunca viaja a orquestadores.
 */

import type { IntegrationResult, IntegrationMode } from '../integration-framework.ts';
import {
  resolveMode, assertRealModeAllowed, buildSuccess, buildError, buildDisabledError,
  INTEGRATION_POLICIES, checkCircuit, recordSuccess, recordFailure,
} from '../integration-framework.ts';
import { resolveEffectiveMode } from '../integration-canary.ts';

export type IdentityLevel =
  | 'NO_MATCH'
  | 'MATCH_INACTIVE'
  | 'PARTIAL_MATCH_ACTIVE'
  | 'STRONG_MATCH_ACTIVE';

export const VALID_IDENTITY_LEVELS = new Set<string>([
  'NO_MATCH', 'MATCH_INACTIVE', 'PARTIAL_MATCH_ACTIVE', 'STRONG_MATCH_ACTIVE',
]);

export interface IdentityRequest {
  client_account_id: string;
  correlation_id: string;
  identity_input: {
    provided_name: string | null;
    provided_phone: string | null;
    accommodation_reference: string | null;
    room_reference: string | null;
  };
}

export interface IdentityResult {
  identity_level: IdentityLevel;
  profile_id: string | null;
  matched_fields: string[];
  missing_fields: string[];
}

/** Campos PII prohibidos en request a Core. Checked against payload keys (lowercase). */
export const IDENTITY_REQUEST_FORBIDDEN_FIELDS = new Set([
  'conversation', 'messages', 'raw_payload', 'raw_message',
  'webchat_token', 'session_token', 'jid', 'wa_jid',
  'prompt', 'completion', 'provider_payload', 'provider_response',
  'sender_ref', 'full_name', 'authorization',
]);

export function validateIdentityRequest(req: IdentityRequest): { valid: boolean; reason?: string } {
  if (!req.client_account_id) return { valid: false, reason: 'client_account_id_required' };
  if (!req.correlation_id) return { valid: false, reason: 'correlation_id_required' };
  if (!req.identity_input) return { valid: false, reason: 'identity_input_required' };
  for (const key of Object.keys(req)) {
    if (IDENTITY_REQUEST_FORBIDDEN_FIELDS.has(key.toLowerCase())) {
      return { valid: false, reason: `forbidden_field: ${key}` };
    }
  }
  return { valid: true };
}

export function validateIdentityResponse(raw: unknown): raw is IdentityResult {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  if (!VALID_IDENTITY_LEVELS.has(r['identity_level'] as string)) return false;
  if (!Array.isArray(r['matched_fields'])) return false;
  if (!Array.isArray(r['missing_fields'])) return false;
  return true;
}

function mockIdentityResult(req: IdentityRequest): IdentityResult {
  const { provided_name, provided_phone } = req.identity_input;
  if (provided_name && provided_phone) {
    return {
      identity_level: 'STRONG_MATCH_ACTIVE',
      profile_id: 'mock-profile-uuid-001',
      matched_fields: ['name', 'phone'],
      missing_fields: [],
    };
  }
  if (provided_name || provided_phone) {
    return {
      identity_level: 'PARTIAL_MATCH_ACTIVE',
      profile_id: 'mock-profile-uuid-001',
      matched_fields: provided_name ? ['name'] : ['phone'],
      missing_fields: provided_name ? ['phone'] : ['name'],
    };
  }
  return {
    identity_level: 'NO_MATCH',
    profile_id: null,
    matched_fields: [],
    missing_fields: ['name', 'phone'],
  };
}

/**
 * Valida identidad via Core.
 * En mock: devuelve resultado determinístico sin llamada de red.
 * En canary/real: llama a CORE_BASE_URL/smartroom/conversations/identity/validate.
 *
 * NUNCA transforma un error de Core en identidad positiva o negativa.
 * DEPENDENCY_UNAVAILABLE mantiene la sesión en su estado actual.
 */
export async function validateIdentity(
  req: IdentityRequest,
  options: {
    mode?: string;
    appEnvironment?: string;
    idempotency_key?: string;
  } = {},
): Promise<IntegrationResult<IdentityResult>> {
  const rawMode = options.mode
    ?? (typeof Deno !== 'undefined' ? Deno.env.get('CORE_INTEGRATION_MODE') : undefined)
    ?? 'mock';
  const mode: IntegrationMode = resolveMode(rawMode);
  const policy = INTEGRATION_POLICIES['core'];

  if (mode === 'disabled') return buildDisabledError('core');

  const guard = assertRealModeAllowed(mode, options.appEnvironment);
  if (!guard.allowed) {
    return buildError('CONFIGURATION_ERROR', guard.reason ?? 'real_mode_requires_dev_environment', mode, 'core');
  }

  const validation = validateIdentityRequest(req);
  if (!validation.valid) {
    return buildError('VALIDATION_ERROR', validation.reason ?? 'invalid_identity_request', mode, 'core');
  }

  if (mode === 'mock') {
    return buildSuccess(mockIdentityResult(req), mode, 'core');
  }

  // shadow: solo lecturas seguras — identity validate es lectura no mutante
  const effectiveMode = resolveEffectiveMode(req.client_account_id, 'core', 'core.identity.validate', mode);

  if (!checkCircuit('core')) {
    return buildError('DEPENDENCY_UNAVAILABLE', 'circuit_open', effectiveMode, 'core');
  }

  try {
    const t0 = Date.now();
    const coreUrl = typeof Deno !== 'undefined' ? Deno.env.get('CORE_BASE_URL') : '';
    const coreToken = typeof Deno !== 'undefined' ? Deno.env.get('CORE_SERVICE_TOKEN') : '';

    const response = await fetch(`${coreUrl}/smartroom/conversations/identity/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coreToken}`,   // NUNCA se loguea
        'X-Client-Account-Id': req.client_account_id,
        'X-Request-Id': req.correlation_id,
        'X-Source': 'smart_conversations',
        ...(options.idempotency_key ? { 'Idempotency-Key': options.idempotency_key } : {}),
      },
      body: JSON.stringify({
        client_account_id: req.client_account_id,
        correlation_id: req.correlation_id,
        identity_input: req.identity_input,
      }),
      signal: AbortSignal.timeout(policy.timeout_ms),
    });

    const duration_ms = Date.now() - t0;

    if (!response.ok) {
      recordFailure('core', policy);
      if (response.status === 401) return buildError('UNAUTHORIZED',           'core_auth_failed',       effectiveMode, 'core', duration_ms);
      if (response.status === 403) return buildError('FORBIDDEN',              'core_forbidden',         effectiveMode, 'core', duration_ms);
      if (response.status === 404) return buildError('TENANT_NOT_FOUND',       'tenant_not_found',       effectiveMode, 'core', duration_ms);
      if (response.status === 429) return buildError('RATE_LIMITED',           'core_rate_limited',      effectiveMode, 'core', duration_ms);
      return buildError('DEPENDENCY_UNAVAILABLE', `core_${response.status}`, effectiveMode, 'core', duration_ms);
    }

    const raw = await response.json() as Record<string, unknown>;

    // Cross-tenant guard: rechazar respuesta de tenant ajeno
    if (typeof raw['client_account_id'] === 'string' && raw['client_account_id'] !== req.client_account_id) {
      recordFailure('core', policy);
      return buildError('FORBIDDEN', 'response_tenant_mismatch', effectiveMode, 'core', duration_ms);
    }

    if (!validateIdentityResponse(raw)) {
      recordFailure('core', policy);
      return buildError('CONTRACT_MISMATCH', 'identity_response_invalid', effectiveMode, 'core', duration_ms);
    }

    recordSuccess('core');
    return buildSuccess(raw as IdentityResult, effectiveMode, 'core', duration_ms);

  } catch (err: unknown) {
    recordFailure('core', policy);
    if (err instanceof Error && err.name === 'TimeoutError') {
      return buildError('TIMEOUT', 'core_identity_timeout', effectiveMode, 'core');
    }
    return buildError('INTERNAL_ERROR', 'core_identity_error', effectiveMode, 'core');
  }
}
