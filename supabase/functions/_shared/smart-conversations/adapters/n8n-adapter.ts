/**
 * n8n-adapter.ts — Adapter para n8n como orquestador de workflows (Fase 11C1).
 *
 * N8N_INTEGRATION_MODE=mock (default) | canary | real | disabled
 *
 * Workflows permitidos (allowlist estricta):
 *   wf10.routing, wf20.incidents, wf30.listings, wf40.help,
 *   wf91.wa_out, wf92.webchat_out
 *
 * No enviar: profile_id, phone_number, sender_ref, raw_payload,
 *            identity_data, tokens, secrets, prompts.
 * Workflows adicionales requieren aprobación explícita de arquitectura.
 * SmartConversations no debe depender de detalles internos de n8n.
 */

import type { IntegrationResult, IntegrationMode } from '../integration-framework.ts';
import {
  resolveMode, assertRealModeAllowed, buildSuccess, buildError, buildDisabledError,
  INTEGRATION_POLICIES, checkCircuit, recordSuccess, recordFailure,
} from '../integration-framework.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_WORKFLOWS = new Set([
  'wf10.routing',
  'wf20.incidents',
  'wf30.listings',
  'wf40.help',
  'wf91.wa_out',
  'wf92.webchat_out',
]);

export interface N8nWorkflowRequest {
  workflow: string;              // debe estar en ALLOWED_WORKFLOWS
  client_account_id: string;
  correlation_id: string;
  idempotency_key: string;
  payload: Record<string, unknown>; // sin PII, sin secrets, sin raw_payload
}

export interface N8nWorkflowResult {
  workflow: string;
  execution_id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  output?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock responses
// ─────────────────────────────────────────────────────────────────────────────

function _mockResponse(req: N8nWorkflowRequest): N8nWorkflowResult {
  return {
    workflow:     req.workflow,
    execution_id: `mock-exec-${req.correlation_id.slice(0, 8)}`,
    status:       'completed',
    output:       { mock: true },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Validación de payload — sin PII ni keys prohibidas
// ─────────────────────────────────────────────────────────────────────────────

const N8N_FORBIDDEN_FIELDS = new Set([
  'profile_id', 'phone_number', 'phone', 'sender_ref',
  'raw_payload', 'identity_data', 'token', 'secret',
  'api_key', 'service_role', 'authorization',
  'prompt', 'completion',
]);

export function validateN8nPayload(payload: Record<string, unknown>): string | null {
  for (const key of Object.keys(payload)) {
    if (N8N_FORBIDDEN_FIELDS.has(key.toLowerCase())) {
      return `forbidden_field_in_payload: ${key}`;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter principal
// ─────────────────────────────────────────────────────────────────────────────

function _getEnv(key: string): string | undefined {
  if (typeof Deno !== 'undefined') return Deno.env.get(key);
  if (typeof process !== 'undefined') return process.env[key];
  return undefined;
}

export async function callN8nWorkflow(
  req: N8nWorkflowRequest,
  opts: { mode_override?: IntegrationMode; _fetchImpl?: typeof fetch } = {},
): Promise<IntegrationResult<N8nWorkflowResult>> {
  const request_id = crypto.randomUUID();
  const meta_base = {
    request_id,
    correlation_id: req.correlation_id,
    provider: 'n8n',
    idempotent_replay: false,
  };
  const policy = INTEGRATION_POLICIES['n8n'];

  // Modo
  const raw_mode = opts.mode_override ?? resolveMode(_getEnv('N8N_INTEGRATION_MODE'));
  const appEnv = _getEnv('APP_ENVIRONMENT');
  const modeCheck = assertRealModeAllowed(raw_mode, appEnv);
  if (!modeCheck.allowed) {
    return buildError('CONFIGURATION_ERROR', 'real mode requires DEV environment',
      { ...meta_base, mode: raw_mode, duration_ms: 0 });
  }

  // Workflow allowlist
  if (!ALLOWED_WORKFLOWS.has(req.workflow)) {
    return buildError('VALIDATION_ERROR', 'unknown_workflow',
      { ...meta_base, mode: raw_mode, duration_ms: 0 });
  }

  // Payload safety
  const payloadError = validateN8nPayload(req.payload);
  if (payloadError) {
    return buildError('VALIDATION_ERROR', payloadError,
      { ...meta_base, mode: raw_mode, duration_ms: 0 });
  }

  // Tenant manipulation guard — client_account_id no puede ser alterado en el payload
  if ('client_account_id' in req.payload && req.payload['client_account_id'] !== req.client_account_id) {
    return buildError('FORBIDDEN', 'tenant_manipulation_detected',
      { ...meta_base, mode: raw_mode, duration_ms: 0 });
  }

  // disabled
  if (raw_mode === 'disabled') {
    return buildDisabledError('n8n', request_id, req.correlation_id);
  }

  // mock
  if (raw_mode === 'mock') {
    return buildSuccess(_mockResponse(req), { ...meta_base, mode: 'mock', duration_ms: 0 });
  }

  // circuit breaker
  const circuit = checkCircuit('n8n', policy);
  if (!circuit.allowed) {
    return buildError('DEPENDENCY_UNAVAILABLE', 'circuit_open',
      { ...meta_base, mode: raw_mode, duration_ms: 0 }, { retryable: true });
  }

  // real / canary — llamada HTTP real (en DEV real, no en tests offline)
  const baseUrl = _getEnv('N8N_BASE_URL');
  const token = _getEnv('N8N_SERVICE_TOKEN');
  if (!baseUrl || !token) {
    return buildError('CONFIGURATION_ERROR', 'n8n configuration missing',
      { ...meta_base, mode: raw_mode, duration_ms: 0 });
  }

  const fetchImpl = opts._fetchImpl ?? globalThis.fetch;
  const start = Date.now();
  try {
    const resp = await fetchImpl(`${baseUrl}/webhook/${req.workflow}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Token': token,
        'X-Correlation-Id': req.correlation_id,
        'X-Idempotency-Key': req.idempotency_key,
      },
      body: JSON.stringify({
        client_account_id: req.client_account_id,
        correlation_id: req.correlation_id,
        idempotency_key: req.idempotency_key,
        payload: req.payload,
      }),
      signal: AbortSignal.timeout(policy.timeout_ms),
    });
    const duration_ms = Date.now() - start;

    if (resp.status === 429) {
      const retry_after = parseInt(resp.headers.get('Retry-After') ?? '60', 10);
      recordFailure('n8n', policy);
      return buildError('RATE_LIMITED', 'rate_limited',
        { ...meta_base, mode: raw_mode, duration_ms }, { retryable: true, retry_after_seconds: retry_after });
    }

    if (resp.status >= 500) {
      recordFailure('n8n', policy);
      return buildError('DEPENDENCY_UNAVAILABLE', 'n8n_5xx',
        { ...meta_base, mode: raw_mode, duration_ms }, { retryable: true });
    }

    if (!resp.ok) {
      return buildError('INTERNAL_ERROR', `n8n_${resp.status}`,
        { ...meta_base, mode: raw_mode, duration_ms });
    }

    const json = await resp.json() as N8nWorkflowResult;
    // Validación mínima de contrato
    if (!json.execution_id || !json.status) {
      recordFailure('n8n', policy);
      return buildError('CONTRACT_MISMATCH', 'n8n_response_invalid',
        { ...meta_base, mode: raw_mode, duration_ms });
    }
    recordSuccess('n8n');
    return buildSuccess(json, { ...meta_base, mode: raw_mode, duration_ms });

  } catch (err) {
    const duration_ms = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    recordFailure('n8n', policy);
    return buildError(
      isTimeout ? 'TIMEOUT' : 'DEPENDENCY_UNAVAILABLE',
      isTimeout ? 'n8n_timeout' : 'n8n_network_error',
      { ...meta_base, mode: raw_mode, duration_ms },
      { retryable: true },
    );
  }
}
