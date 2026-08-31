/**
 * errors.ts — Catálogo y mapper de errores canónicos del provider v1.0.
 * Fuente: contract-create-incident-request.md §8.12
 *
 * Exactamente 15 códigos. Sin excepciones.
 * Los errores internos no contractuales se colapsan a INTERNAL_ERROR.
 * Estado: PROVIDER_ERROR_MAPPER_IMPLEMENTED_OFFLINE
 */

import type { ProviderErrorCode, ProviderErrorResponse } from './types.ts';

// ─── Catálogo de 15 códigos ───────────────────────────────────────────────────

/** Array readonly de los 15 códigos exactos. Fuente: §8.12. */
export const PROVIDER_ERROR_CODES: readonly ProviderErrorCode[] = [
  'UNSUPPORTED_CONTRACT_VERSION',
  'VALIDATION_ERROR',
  'AUTHENTICATION_REQUIRED',
  'CALLER_NOT_AUTHORIZED',
  'FEATURE_DISABLED',
  'RESOURCE_NOT_FOUND',
  'REQUESTER_NOT_ALLOWED',
  'INVALID_CATEGORY',
  'INVALID_PRIORITY',
  'ATTACHMENTS_NOT_SUPPORTED',
  'IDEMPOTENCY_CONFLICT',
  'RATE_LIMITED',
  'DEPENDENCY_UNAVAILABLE',
  'PROVIDER_TIMEOUT',
  'INTERNAL_ERROR',
] as const;

// ─── Metadatos por código ─────────────────────────────────────────────────────

interface ErrorMeta {
  /** HTTP status code. */
  http: number;
  /** Si el consumer puede reintentar la misma operación. */
  retryable: boolean;
  /** Mensaje seguro para el consumer. Sin stack, SQL, secretos ni PII. */
  message: string;
}

const ERROR_META: Readonly<Record<ProviderErrorCode, ErrorMeta>> = {
  UNSUPPORTED_CONTRACT_VERSION: {
    http: 400,
    retryable: false,
    message: 'Versión del contrato no soportada; únicamente se acepta "1.0"',
  },
  VALIDATION_ERROR: {
    http: 400,
    retryable: false,
    message: 'Campo inválido, faltante, prohibido o con formato incorrecto',
  },
  AUTHENTICATION_REQUIRED: {
    http: 401,
    retryable: false,
    message: 'Caller no autenticado',
  },
  CALLER_NOT_AUTHORIZED: {
    http: 403,
    retryable: false,
    message: 'Caller autenticado pero sin autorización para la operación o el tenant solicitado',
  },
  FEATURE_DISABLED: {
    http: 403,
    retryable: false,
    message: 'El add-on smart_incidents no está activo para esta cuenta',
  },
  RESOURCE_NOT_FOUND: {
    http: 404,
    retryable: false,
    message: 'Recurso no encontrado o no pertenece al tenant verificado',
  },
  REQUESTER_NOT_ALLOWED: {
    http: 403,
    retryable: false,
    message: 'Requester no autorizado, inactivo o sin pertenencia al tenant',
  },
  INVALID_CATEGORY: {
    http: 422,
    retryable: false,
    message: 'Valor de category fuera del enum permitido',
  },
  INVALID_PRIORITY: {
    http: 422,
    retryable: false,
    message: 'Valor de priority fuera del enum permitido',
  },
  ATTACHMENTS_NOT_SUPPORTED: {
    http: 422,
    retryable: false,
    message: 'Adjuntos no soportados en v1.0; únicamente se acepta []',
  },
  IDEMPOTENCY_CONFLICT: {
    http: 409,
    retryable: false,
    message: 'Clave de idempotencia reutilizada con payload de negocio diferente',
  },
  RATE_LIMITED: {
    http: 429,
    retryable: true,
    message: 'Límite de tasa excedido; consultar cabecera Retry-After cuando disponible',
  },
  DEPENDENCY_UNAVAILABLE: {
    http: 503,
    retryable: true,
    message: 'Dependencia interna no disponible temporalmente',
  },
  PROVIDER_TIMEOUT: {
    http: 504,
    retryable: true,
    message: 'Operación excedió el tiempo máximo del provider',
  },
  INTERNAL_ERROR: {
    http: 500,
    retryable: false,
    message: 'Error interno no clasificado',
  },
};

// ─── Accessors ────────────────────────────────────────────────────────────────

export function getHttpStatus(code: ProviderErrorCode): number {
  return ERROR_META[code].http;
}

export function isRetryable(code: ProviderErrorCode): boolean {
  return ERROR_META[code].retryable;
}

export function getSafeMessage(code: ProviderErrorCode): string {
  return ERROR_META[code].message;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

/**
 * Construye una ProviderErrorResponse sin exponer datos internos.
 * No incluye stack, SQL, payload raw, secretos ni IDs de otros tenants.
 */
export function buildProviderErrorResponse(
  code: ProviderErrorCode,
  request_id: string,
  correlation_id: string,
  field?: string,
): ProviderErrorResponse {
  const meta = ERROR_META[code];
  const base: ProviderErrorResponse = {
    ok: false,
    error_code: code,
    http_status: meta.http,
    retryable: meta.retryable,
    message: meta.message,
    request_id,
    correlation_id,
  };
  if (field !== undefined) {
    base.field = field;
  }
  return base;
}
