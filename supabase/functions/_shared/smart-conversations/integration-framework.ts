/**
 * integration-framework.ts — Framework común de integración Fase 11C1.
 *
 * Principios:
 * - Cinco modos: mock | shadow | canary | real | disabled
 * - Modo desconocido → fail-closed (disabled behavior)
 * - real solo permitido en target DEV (APP_ENVIRONMENT=sandbox o dev)
 * - canary solo para tenants en allowlist explícita
 * - shadow solo en operaciones seguras/idempotentes
 * - No imprimir secretos, tokens, PII, URLs privadas ni stack traces
 * - Contrato canónico único para todas las integraciones
 * - Circuit breaker, timeout, retry con backoff/jitter por integración
 */

// ─────────────────────────────────────────────────────────────────────────────
// Modos de integración
// ─────────────────────────────────────────────────────────────────────────────

export type IntegrationMode = 'mock' | 'shadow' | 'canary' | 'real' | 'disabled';

export const KNOWN_MODES = new Set<IntegrationMode>(['mock', 'shadow', 'canary', 'real', 'disabled']);

/** Resuelve el modo; devuelve 'disabled' ante valor desconocido (fail-closed). */
export function resolveMode(raw: string | undefined): IntegrationMode {
  if (!raw) return 'mock';
  if (KNOWN_MODES.has(raw as IntegrationMode)) return raw as IntegrationMode;
  return 'disabled'; // fail-closed
}

// ─────────────────────────────────────────────────────────────────────────────
// Entornos permitidos para modo real — fuente única: environment-model.ts
// ─────────────────────────────────────────────────────────────────────────────

import { isDevelopmentEnvironment } from './environment-model.ts';

/** @deprecated Use isDevelopmentEnvironment from environment-model.ts */
export function isDevEnvironment(appEnvironment: string | undefined): boolean {
  return isDevelopmentEnvironment(appEnvironment);
}

/** Rechaza modo real fuera de DEV. */
export function assertRealModeAllowed(
  mode: IntegrationMode,
  appEnvironment: string | undefined,
): { allowed: boolean; reason?: string } {
  if (mode !== 'real' && mode !== 'canary') return { allowed: true };
  if (!isDevelopmentEnvironment(appEnvironment)) {
    return { allowed: false, reason: 'real_mode_requires_dev_environment' };
  }
  return { allowed: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Contrato canónico de respuesta
// ─────────────────────────────────────────────────────────────────────────────

export interface IntegrationMeta {
  request_id: string;
  correlation_id: string;
  provider: string;       // nombre seguro, sin URL ni credenciales
  mode: IntegrationMode;
  duration_ms: number;
  idempotent_replay: boolean;
}

export interface IntegrationSuccess<T = unknown> {
  ok: true;
  data: T;
  meta: IntegrationMeta;
}

export interface IntegrationError {
  ok: false;
  error: {
    code: CanonicalErrorCode;
    message: string;      // mensaje seguro, sin PII ni secretos
    retryable: boolean;
    retry_after_seconds: number | null;
  };
  meta: IntegrationMeta;
}

export type IntegrationResult<T = unknown> = IntegrationSuccess<T> | IntegrationError;

// ─────────────────────────────────────────────────────────────────────────────
// Códigos de error canónicos
// ─────────────────────────────────────────────────────────────────────────────

export type CanonicalErrorCode =
  | 'CONFIGURATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'TENANT_NOT_FOUND'
  | 'FEATURE_DISABLED'
  | 'RESOURCE_NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'CONTRACT_MISMATCH'
  | 'INTERNAL_ERROR';

// ─────────────────────────────────────────────────────────────────────────────
// Builders de respuesta canónica
// ─────────────────────────────────────────────────────────────────────────────

export function buildSuccess<T>(
  data: T,
  meta: Omit<IntegrationMeta, 'duration_ms'> & { duration_ms?: number },
): IntegrationSuccess<T> {
  return { ok: true, data, meta: { duration_ms: 0, ...meta } };
}

export function buildError(
  code: CanonicalErrorCode,
  message: string,
  meta: Omit<IntegrationMeta, 'duration_ms'> & { duration_ms?: number },
  opts: { retryable?: boolean; retry_after_seconds?: number } = {},
): IntegrationError {
  return {
    ok: false,
    error: {
      code,
      message,
      retryable: opts.retryable ?? false,
      retry_after_seconds: opts.retry_after_seconds ?? null,
    },
    meta: { duration_ms: 0, ...meta },
  };
}

/** Respuesta estándar cuando el modo está disabled o la integración está deshabilitada. */
export function buildDisabledError(
  provider: string,
  request_id: string,
  correlation_id: string,
): IntegrationError {
  return buildError(
    'FEATURE_DISABLED',
    'Integration is disabled',
    { request_id, correlation_id, provider, mode: 'disabled', idempotent_replay: false },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Política de timeout, retry y circuit breaker por integración
// ─────────────────────────────────────────────────────────────────────────────

export interface IntegrationPolicy {
  timeout_ms: number;
  max_attempts: number;   // 1 = sin retry
  backoff_base_ms: number;
  backoff_max_ms: number;
  circuit_open_threshold: number;    // fallos consecutivos antes de abrir
  circuit_half_open_after_ms: number;
}

/** Políticas predeterminadas por tipo de integración. */
export const INTEGRATION_POLICIES: Record<string, IntegrationPolicy> = {
  core: {
    timeout_ms: 5_000,
    max_attempts: 3,
    backoff_base_ms: 1_000,
    backoff_max_ms: 30_000,
    circuit_open_threshold: 5,
    circuit_half_open_after_ms: 30_000,
  },
  ai: {
    timeout_ms: 15_000,
    max_attempts: 2,
    backoff_base_ms: 2_000,
    backoff_max_ms: 10_000,
    circuit_open_threshold: 3,
    circuit_half_open_after_ms: 60_000,
  },
  n8n: {
    timeout_ms: 10_000,
    max_attempts: 2,
    backoff_base_ms: 2_000,
    backoff_max_ms: 15_000,
    circuit_open_threshold: 5,
    circuit_half_open_after_ms: 30_000,
  },
  incidents_addon: {
    timeout_ms: 8_000,
    max_attempts: 3,   // idempotencia garantizada
    backoff_base_ms: 1_000,
    backoff_max_ms: 20_000,
    circuit_open_threshold: 5,
    circuit_half_open_after_ms: 30_000,
  },
  listings_addon: {
    timeout_ms: 6_000,
    max_attempts: 3,
    backoff_base_ms: 500,
    backoff_max_ms: 10_000,
    circuit_open_threshold: 5,
    circuit_half_open_after_ms: 20_000,
  },
  realtime: {
    timeout_ms: 3_000,
    max_attempts: 1,   // realtime es polling, no retry de conexión
    backoff_base_ms: 0,
    backoff_max_ms: 0,
    circuit_open_threshold: 10,
    circuit_half_open_after_ms: 15_000,
  },
  wasender: {
    timeout_ms: 10_000,
    max_attempts: 3,   // idempotencia por idempotency_key
    backoff_base_ms: 1_000,
    backoff_max_ms: 30_000,
    circuit_open_threshold: 5,
    circuit_half_open_after_ms: 60_000,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Circuit breaker en memoria (estado por integración)
// ─────────────────────────────────────────────────────────────────────────────

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerState {
  state: CircuitState;
  consecutive_failures: number;
  opened_at_ms: number | null;
}

const _circuits = new Map<string, CircuitBreakerState>();

export function getCircuit(integration: string): CircuitBreakerState {
  if (!_circuits.has(integration)) {
    _circuits.set(integration, { state: 'closed', consecutive_failures: 0, opened_at_ms: null });
  }
  return _circuits.get(integration)!;
}

export function recordSuccess(integration: string): void {
  const c = getCircuit(integration);
  c.state = 'closed';
  c.consecutive_failures = 0;
  c.opened_at_ms = null;
}

export function recordFailure(integration: string, policy: IntegrationPolicy): void {
  const c = getCircuit(integration);
  c.consecutive_failures += 1;
  if (c.state === 'closed' && c.consecutive_failures >= policy.circuit_open_threshold) {
    c.state = 'open';
    c.opened_at_ms = Date.now();
  }
}

export function checkCircuit(
  integration: string,
  policy: IntegrationPolicy,
): { allowed: boolean; reason?: string } {
  const c = getCircuit(integration);
  if (c.state === 'closed') return { allowed: true };
  if (c.state === 'open') {
    const elapsed = Date.now() - (c.opened_at_ms ?? 0);
    if (elapsed >= policy.circuit_half_open_after_ms) {
      c.state = 'half_open';
      return { allowed: true };
    }
    return { allowed: false, reason: 'circuit_open' };
  }
  // half_open: permitir un intento
  return { allowed: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Backoff con jitter
// ─────────────────────────────────────────────────────────────────────────────

export function computeBackoff(attempt: number, policy: IntegrationPolicy): number {
  const base = policy.backoff_base_ms * Math.pow(2, attempt);
  const jitter = Math.random() * base * 0.2;
  return Math.min(base + jitter, policy.backoff_max_ms);
}

// ─────────────────────────────────────────────────────────────────────────────
// Idempotencia para escrituras externas
// ─────────────────────────────────────────────────────────────────────────────

export interface IdempotencyRecord {
  idempotency_key: string;
  correlation_id: string;
  client_account_id: string;
  operation: string;
  result_ref?: string;
  created_at_ms: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Health check canónico
// ─────────────────────────────────────────────────────────────────────────────

export type HealthStatus = 'healthy' | 'degraded' | 'unavailable' | 'misconfigured' | 'mock' | 'canary' | 'disabled';

export interface IntegrationHealth {
  integration: string;
  status: HealthStatus;
  mode: IntegrationMode;
  circuit: CircuitState;
}

export function buildHealth(
  integration: string,
  mode: IntegrationMode,
): IntegrationHealth {
  if (mode === 'mock') return { integration, status: 'mock', mode, circuit: 'closed' };
  if (mode === 'disabled') return { integration, status: 'disabled', mode, circuit: 'closed' };
  const circuit = getCircuit(integration);
  const status: HealthStatus = circuit.state === 'open' ? 'unavailable'
    : circuit.state === 'half_open' ? 'degraded'
    : mode === 'canary' ? 'canary'
    : 'healthy';
  return { integration, status, mode, circuit: circuit.state };
}

// ─────────────────────────────────────────────────────────────────────────────
// Logging seguro — nunca emite secretos, PII ni respuestas raw
// ─────────────────────────────────────────────────────────────────────────────

export function safeLog(
  level: 'info' | 'warn' | 'error',
  integration: string,
  event: string,
  meta: Record<string, unknown> = {},
): void {
  // En tests/offline no hay console.log real; este helper garantiza que
  // el contrato de "no PII / no secretos" se cumpla en producción
  const safe = {
    integration,
    event,
    // Solo campos seguros del meta
    request_id: meta['request_id'],
    correlation_id: meta['correlation_id'],
    mode: meta['mode'],
    duration_ms: meta['duration_ms'],
    error_code: meta['error_code'],
    retryable: meta['retryable'],
  };
  if (typeof console !== 'undefined') {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
    fn(JSON.stringify(safe));
  }
}
