/**
 * core-http-client — Adaptador HTTP seguro para llamadas al SmartRoom Core.
 *
 * Principios de seguridad:
 *  - En mode=mock nunca hace fetch externo.
 *  - En mode=real solo usa paths de la allowlist interna; rechaza paths arbitrarios.
 *  - No loguea Authorization, tokens, PII ni body sensible.
 *  - 4xx: sin retry. 5xx/timeout: máximo 3 intentos (backoff 1s/5s/30s).
 *  - Si CORE_BASE_URL falta en mode=real, devuelve error controlado.
 *  - No acepta URLs absolutas desde input externo.
 *
 * Control de modo:
 *   CORE_INTEGRATION_MODE=mock (default) | real
 *   CORE_BASE_URL=<URL interna del Core>
 *   CORE_SERVICE_TOKEN=<token de servicio>
 *   CORE_TIMEOUT_MS=5000
 *
 * Fuente: SmartConversations Fase 10A.
 */

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export type CoreIntegrationMode = 'mock' | 'real';

export interface CoreHttpRequest {
  method:            'GET' | 'POST' | 'PATCH';
  operation:         string;   // debe estar en CORE_OPERATION_PATHS
  client_account_id: string;
  body?:             unknown;
  timeout_ms?:       number;
}

export interface CoreHttpResponse<T = unknown> {
  ok:          boolean;
  status:      number;
  data?:       T;
  error_code?: string;
  retryable?:  boolean;
}

// ---------------------------------------------------------------------------
// Allowlist de operaciones → paths relativos
// Únicos paths permitidos; se prohíbe cualquier path arbitrario externo.
// ---------------------------------------------------------------------------

export const CORE_OPERATION_PATHS: Record<string, string> = {
  'core.identity.validate':   '/smartroom/conversations/identity/validate',
  'core.incidents.create':    '/smartroom/conversations/incidents',
  'core.listings.query':      '/smartroom/conversations/listings/search',
  'core.leads.create':        '/smartroom/conversations/leads',
  'core.help.kb.query':       '/smartroom/conversations/help/kb/search',
  'core.help.tickets.create': '/smartroom/conversations/help/tickets',
} as const;

// ---------------------------------------------------------------------------
// Retry: backoff 1s/5s/30s, máximo 3 intentos
// ---------------------------------------------------------------------------

const RETRY_DELAYS_MS = [1_000, 5_000, 30_000] as const;
const MAX_ATTEMPTS    = 3;

// ---------------------------------------------------------------------------
// Helpers de configuración — leen env vars en runtime
// No exponer los valores en logs ni errors.
// ---------------------------------------------------------------------------

export function getCoreIntegrationMode(): CoreIntegrationMode {
  try {
    // @ts-ignore — Deno.env disponible en Edge Functions
    const raw = (typeof Deno !== 'undefined' ? Deno.env.get('CORE_INTEGRATION_MODE') : undefined) ?? 'mock';
    return raw === 'real' ? 'real' : 'mock';
  } catch {
    return 'mock';
  }
}

function _getCoreBaseUrl(): string | null {
  try {
    // @ts-ignore
    return (typeof Deno !== 'undefined' ? Deno.env.get('CORE_BASE_URL') : undefined) ?? null;
  } catch {
    return null;
  }
}

function _getCoreToken(): string | null {
  try {
    // @ts-ignore
    return (typeof Deno !== 'undefined' ? Deno.env.get('CORE_SERVICE_TOKEN') : undefined) ?? null;
  } catch {
    return null;
  }
}

function _getTimeoutMs(req: CoreHttpRequest): number {
  if (req.timeout_ms && req.timeout_ms > 0) return req.timeout_ms;
  try {
    // @ts-ignore
    const raw = (typeof Deno !== 'undefined' ? Deno.env.get('CORE_TIMEOUT_MS') : undefined) ?? '5000';
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 5_000;
  } catch {
    return 5_000;
  }
}

function _sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Validar operación contra allowlist
// Rechaza paths arbitrarios desde input externo.
// ---------------------------------------------------------------------------

function _resolveAllowedPath(operation: string): string | null {
  return CORE_OPERATION_PATHS[operation] ?? null;
}

// ---------------------------------------------------------------------------
// coreHttpCall — llamada real con retry
// Solo debe llamarse cuando mode=real.
// ---------------------------------------------------------------------------

async function _coreHttpCallReal<T>(req: CoreHttpRequest): Promise<CoreHttpResponse<T>> {
  const baseUrl = _getCoreBaseUrl();
  if (!baseUrl) {
    return { ok: false, status: 0, error_code: 'CORE_CONFIG_MISSING', retryable: false };
  }

  const path = _resolveAllowedPath(req.operation);
  if (!path) {
    return { ok: false, status: 0, error_code: 'OPERATION_NOT_ALLOWED', retryable: false };
  }

  // No acepta URLs absolutas externas — la URL se construye solo desde base + path interno
  const url = `${baseUrl}${path}`;

  const token = _getCoreToken();
  const timeoutMs = _getTimeoutMs(req);

  // Headers seguros — no loguear Authorization ni token
  const headers: Record<string, string> = {
    'Content-Type':          'application/json',
    'X-Client-Account-Id':   req.client_account_id,
    'X-Request-Id':          `sc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    // No loguear headers['Authorization'] nunca
  }

  let lastStatus = 0;
  let lastErrorCode = 'UNKNOWN_ERROR';

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await fetch(url, {
          method: req.method,
          headers,
          body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      // 4xx — no retry, error controlado
      if (response.status >= 400 && response.status < 500) {
        return {
          ok:         false,
          status:     response.status,
          error_code: `HTTP_${response.status}`,
          retryable:  false,
        };
      }

      // 2xx — éxito
      if (response.ok) {
        const data = await response.json() as T;
        return { ok: true, status: response.status, data };
      }

      // 5xx — retryable si quedan intentos
      lastStatus    = response.status;
      lastErrorCode = `HTTP_${response.status}`;

      if (attempt < MAX_ATTEMPTS - 1) {
        await _sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }

      return {
        ok:         false,
        status:     lastStatus,
        error_code: `${lastErrorCode}_EXHAUSTED`,
        retryable:  false,
      };

    } catch (err: unknown) {
      // Timeout (AbortError) o error de red — retryable
      const isAbort = err instanceof Error && err.name === 'AbortError';
      lastErrorCode = isAbort ? 'TIMEOUT' : 'NETWORK_ERROR';

      if (attempt < MAX_ATTEMPTS - 1) {
        await _sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }

      return {
        ok:         false,
        status:     0,
        error_code: `${lastErrorCode}_EXHAUSTED`,
        retryable:  false,
      };
    }
  }

  return { ok: false, status: 0, error_code: 'UNEXPECTED_ERROR', retryable: false };
}

// ---------------------------------------------------------------------------
// coreHttpCall — punto de entrada público
// En mode=mock: devuelve MOCK_MODE sin hacer fetch.
// En mode=real: delega a _coreHttpCallReal.
// ---------------------------------------------------------------------------

export async function coreHttpCall<T = unknown>(req: CoreHttpRequest): Promise<CoreHttpResponse<T>> {
  const mode = getCoreIntegrationMode();

  if (mode === 'mock') {
    // Nunca hace fetch externo en modo mock
    return { ok: false, status: 0, error_code: 'MOCK_MODE', retryable: false };
  }

  return _coreHttpCallReal<T>(req);
}
