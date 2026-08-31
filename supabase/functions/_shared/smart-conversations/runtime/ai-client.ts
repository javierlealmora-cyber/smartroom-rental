/**
 * ai-client.ts -- Adapter HTTP vendor-agnostic para proveedor de IA.
 *
 * AI_INTEGRATION_MODE=mock (default) | real
 * AI_PROVIDER=mock | openai | anthropic | azure_openai | google_gemini | mistral | groq | local_llm | other
 *
 * En mode=mock: nunca llama fetch externo. Devuelve AI_MOCK_MODE.
 * En mode=real: requiere AI_PROVIDER valido y credenciales del proveedor.
 *
 * Sanitizacion: safe_input es el unico texto enviado al proveedor.
 * No enviar profile_id, phone, sender_ref, identity_data, raw_payload.
 *
 * Privacidad: API keys y Authorization nunca se loguean.
 * No loguear prompt completo ni respuesta completa si puede contener PII.
 *
 * Retries: 429 y 5xx/timeout = retry controlado (max AI_MAX_RETRIES, default 2).
 * 4xx (salvo 429): sin retry. No usar next_retry_at ni attempt_count.
 *
 * La IA no valida identidad. La IA no decide permisos. La IA no escribe BD.
 * La IA no publica Activity Log. La IA no llama Core, n8n ni Wasender.
 *
 * Fuente: SmartConversations Fase 10C.
 */

import { callAiProvider } from './ai-providers/generic-http-provider.ts';

// ---------------------------------------------------------------------------
// Tipos publicos
// ---------------------------------------------------------------------------

export type AiIntegrationMode = 'mock' | 'real';

export type AiProvider =
  | 'mock'
  | 'openai'
  | 'anthropic'
  | 'azure_openai'
  | 'google_gemini'
  | 'mistral'
  | 'groq'
  | 'local_llm'
  | 'other';

export type AiOperation =
  | 'ai.intent.classify'
  | 'ai.incident.extract'
  | 'ai.listing.extract'
  | 'ai.help.extract'
  | 'ai.safe_summary'
  | 'ai.response_draft';

export interface AiCallRequest {
  operation:         AiOperation;
  client_account_id: string;
  session_id:        string;
  channel:           'whatsapp' | 'webchat';
  /** Texto ya sanitizado, sin PII. Unico texto que llega al proveedor. */
  safe_input:        string;
  schema?:           unknown;
  max_tokens?:       number;
}

export interface AiCallResponse<T = unknown> {
  ok:          boolean;
  provider:    AiProvider;
  data?:       T;
  error_code?: string;
  retryable?:  boolean;
}

// ---------------------------------------------------------------------------
// Allowlist de operaciones -- rechaza cualquier operacion arbitraria
// ---------------------------------------------------------------------------

export const AI_ALLOWED_OPERATIONS: Record<AiOperation, string> = {
  'ai.intent.classify':   'Clasificacion de intencion del usuario',
  'ai.incident.extract':  'Extraccion de datos de incidencia',
  'ai.listing.extract':   'Extraccion de intencion de busqueda de listing',
  'ai.help.extract':      'Extraccion de intencion de ayuda',
  'ai.safe_summary':      'Generacion de resumen seguro sin PII',
  'ai.response_draft':    'Borrador de respuesta al usuario',
} as const;

// ---------------------------------------------------------------------------
// Campos PII prohibidos -- nunca enviar al proveedor de IA
// ---------------------------------------------------------------------------

export const AI_PII_FORBIDDEN_FIELDS = [
  'profile_id', 'phone', 'phone_number', 'sender_ref',
  'full_name', 'room_label', 'residence_name',
  'assignment_id', 'room_id', 'identity_data',
  'raw_payload', 'contact', 'email', 'name',
  'tokens', 'authorization', 'service_role', 'jwt',
] as const;

// ---------------------------------------------------------------------------
// Valores de intent validos para validacion de output
// ---------------------------------------------------------------------------

const VALID_INTENT_CODES = new Set([
  'conv_incidencias', 'conv_publicaciones', 'conv_ayuda', 'unknown',
]);

// ---------------------------------------------------------------------------
// Lectura de configuracion -- Deno.env en Edge Functions, process.env en tests
// ---------------------------------------------------------------------------

function _getEnv(key: string): string | undefined {
  try {
    // @ts-ignore -- Deno.env disponible en Edge Functions
    if (typeof Deno !== 'undefined') return Deno.env.get(key);
  } catch { /**/ }
  return undefined;
}

export function getAiIntegrationMode(): AiIntegrationMode {
  const raw = _getEnv('AI_INTEGRATION_MODE') ?? 'mock';
  return raw === 'real' ? 'real' : 'mock';
}

export function getSelectedAiProvider(): AiProvider {
  const raw = _getEnv('AI_PROVIDER') ?? 'mock';
  const valid: AiProvider[] = [
    'mock', 'openai', 'anthropic', 'azure_openai',
    'google_gemini', 'mistral', 'groq', 'local_llm', 'other',
  ];
  return valid.includes(raw as AiProvider) ? (raw as AiProvider) : 'mock';
}

/** Providers permitidos cuando AI_INTEGRATION_MODE=real. Mock no es valido en modo real. */
const REAL_MODE_VALID_PROVIDERS: ReadonlySet<string> = new Set([
  'openai', 'anthropic', 'azure_openai', 'google_gemini', 'mistral', 'groq', 'local_llm', 'other',
]);

function _getMaxRetries(): number {
  const raw = _getEnv('AI_MAX_RETRIES') ?? '2';
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 2;
}

function _getRetryBackoffMs(): number[] {
  const raw = _getEnv('AI_RETRY_BACKOFF_SECONDS') ?? '1,3';
  return raw.split(',').map(s => {
    const n = parseFloat(s.trim());
    return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) : 1000;
  });
}

function _getTimeoutMs(req: AiCallRequest): number {
  const override = req.max_tokens ? undefined : undefined; // reserved
  const raw = _getEnv('AI_TIMEOUT_MS') ?? '8000';
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 8_000;
}

function _sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Sanitizacion de input -- verifica ausencia de PII en safe_input
// ---------------------------------------------------------------------------

export function sanitizeAiInput(text: string): string {
  // Eliminar patrones JSON con campos PII ("profile_id":"xxx")
  let sanitized = text;
  for (const field of AI_PII_FORBIDDEN_FIELDS) {
    // Patrón: "field": valor o "field":"valor"
    sanitized = sanitized.replace(
      new RegExp(`"${field}"\\s*:\\s*"[^"]*"`, 'gi'), ''
    );
    sanitized = sanitized.replace(
      new RegExp(`"${field}"\\s*:\\s*[^,}\\]\\s]+`, 'gi'), ''
    );
  }
  return sanitized.slice(0, 4000); // limite de seguridad
}

// ---------------------------------------------------------------------------
// Sanitizacion de output -- elimina campos PII del JSON de respuesta
// ---------------------------------------------------------------------------

export function sanitizeAiOutput(data: unknown): unknown {
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeAiOutput);
  const obj = data as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (AI_PII_FORBIDDEN_FIELDS.includes(k as typeof AI_PII_FORBIDDEN_FIELDS[number])) continue;
    result[k] = sanitizeAiOutput(v);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Validacion de output por operacion
// ---------------------------------------------------------------------------

export function validateIntentOutput(data: unknown): { service_code: string; confidence: number } {
  if (!data || typeof data !== 'object') {
    return { service_code: 'unknown', confidence: 0 };
  }
  const d = data as Record<string, unknown>;
  const code = typeof d['service_code'] === 'string' ? d['service_code'] : 'unknown';
  const conf = typeof d['confidence'] === 'number' ? d['confidence'] : 0;
  return {
    service_code: VALID_INTENT_CODES.has(code) ? code : 'unknown',
    confidence:   Math.max(0, Math.min(1, conf)),
  };
}

export function validateIncidentOutput(data: unknown): Record<string, unknown> {
  const sanitized = sanitizeAiOutput(data) as Record<string, unknown>;
  // Solo campos permitidos
  const allowed = ['incident_type', 'urgency', 'safe_summary', 'missing_fields', 'is_complete'];
  const result: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in sanitized) result[k] = sanitized[k];
  }
  return result;
}

export function validateListingOutput(data: unknown): Record<string, unknown> {
  const sanitized = sanitizeAiOutput(data) as Record<string, unknown>;
  const allowed = ['interest_type', 'city', 'budget_range', 'dates', 'safe_summary', 'missing_fields'];
  const result: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in sanitized) result[k] = sanitized[k];
  }
  return result;
}

export function validateHelpOutput(data: unknown): Record<string, unknown> {
  const sanitized = sanitizeAiOutput(data) as Record<string, unknown>;
  const allowed = ['help_intent', 'kb_query', 'safe_summary', 'request_human'];
  const result: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in sanitized) result[k] = sanitized[k];
  }
  return result;
}

// ---------------------------------------------------------------------------
// aiCall -- punto de entrada publico
// ---------------------------------------------------------------------------

export async function aiCall<T = unknown>(req: AiCallRequest): Promise<AiCallResponse<T>> {
  const mode = getAiIntegrationMode();

  // Mode mock: nunca llama fetch
  if (mode === 'mock') {
    return { ok: false, provider: 'mock', error_code: 'AI_MOCK_MODE', retryable: false };
  }

  // Validar operacion contra allowlist
  if (!(req.operation in AI_ALLOWED_OPERATIONS)) {
    return { ok: false, provider: 'mock', error_code: 'AI_OPERATION_NOT_ALLOWED', retryable: false };
  }

  // Validar proveedor en modo real -- distingue ausente / mock / desconocido / valido
  const rawProvider = _getEnv('AI_PROVIDER') ?? '';
  if (!rawProvider) {
    return { ok: false, provider: 'mock', error_code: 'AI_PROVIDER_REQUIRED', retryable: false };
  }
  if (rawProvider === 'mock') {
    return { ok: false, provider: 'mock', error_code: 'AI_PROVIDER_INVALID_FOR_REAL_MODE', retryable: false };
  }
  if (!REAL_MODE_VALID_PROVIDERS.has(rawProvider)) {
    return { ok: false, provider: 'mock', error_code: 'AI_PROVIDER_UNSUPPORTED', retryable: false };
  }
  const provider = rawProvider as AiProvider;

  // Llamada real con retry
  return _aiCallReal<T>(req, provider);
}

// ---------------------------------------------------------------------------
// Llamada HTTP real con retry
// ---------------------------------------------------------------------------

async function _aiCallReal<T>(req: AiCallRequest, provider: AiProvider): Promise<AiCallResponse<T>> {
  const maxRetries  = _getMaxRetries();
  const maxAttempts = maxRetries + 1;
  const backoffs    = _getRetryBackoffMs();
  const timeoutMs   = _getTimeoutMs(req);

  // Sanitizar input antes de enviar -- elimina PII residual
  const cleanInput  = sanitizeAiInput(req.safe_input);

  let lastErrorCode = 'AI_UNKNOWN_ERROR';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response: Response;
      try {
        response = await callAiProvider(provider, {
          operation:         req.operation,
          client_account_id: req.client_account_id,
          safe_input:        cleanInput,
          max_tokens:        req.max_tokens,
          signal:            controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      // 4xx: sin retry (salvo 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return {
          ok:         false,
          provider,
          error_code: `AI_HTTP_${response.status}`,
          retryable:  false,
        };
      }

      // 429: retryable
      if (response.status === 429) {
        lastErrorCode = 'AI_RATE_LIMITED';
        if (attempt < maxAttempts - 1) {
          await _sleep(backoffs[attempt] ?? backoffs[backoffs.length - 1] ?? 1000);
          continue;
        }
        return { ok: false, provider, error_code: 'AI_RATE_LIMITED_EXHAUSTED', retryable: false };
      }

      // 2xx: exito -- parsear y validar JSON
      if (response.ok) {
        let raw: unknown;
        try {
          raw = await response.json();
        } catch {
          return { ok: false, provider, error_code: 'AI_INVALID_JSON', retryable: false };
        }
        // Sanitizar output -- eliminar campos PII de respuesta IA
        const sanitized = sanitizeAiOutput(raw) as T;
        return { ok: true, provider, data: sanitized };
      }

      // 5xx: retryable
      lastErrorCode = `AI_HTTP_${response.status}`;
      if (attempt < maxAttempts - 1) {
        await _sleep(backoffs[attempt] ?? backoffs[backoffs.length - 1] ?? 1000);
        continue;
      }
      return { ok: false, provider, error_code: `${lastErrorCode}_EXHAUSTED`, retryable: false };

    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      lastErrorCode = isAbort ? 'AI_TIMEOUT' : 'AI_NETWORK_ERROR';

      if (attempt < maxAttempts - 1) {
        await _sleep(backoffs[attempt] ?? backoffs[backoffs.length - 1] ?? 1000);
        continue;
      }
      return {
        ok:         false,
        provider,
        error_code: `${lastErrorCode}_EXHAUSTED`,
        retryable:  false,
      };
    }
  }

  return { ok: false, provider, error_code: 'AI_UNEXPECTED_ERROR', retryable: false };
}
