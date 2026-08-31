/**
 * Logger seguro para EFs internas de SmartConversations.
 * Redacta automáticamente campos PII, secrets y contenido sensible antes de emitir logs.
 *
 * SEC-023: añadidos api_key, key, credential, private_key, service_role, signing_secret.
 *
 * Separación de categorías de redacción:
 *   - PII: profile_id, phone, email, sender_ref, full_name, etc.
 *   - Secrets: token, secret, api_key, service_role, private_key, etc.
 *   - Message content: message_text, description, raw_payload
 *   - Provider payloads: identity_data, authorization, jwt
 */

const FIELDS_TO_REDACT: ReadonlySet<string> = new Set([
  // PII — datos personales identificables
  'profile_id',
  'phone_number',
  'phone',
  'full_name',
  'room_label',
  'residence_name',
  'email',
  'assignment_id',
  'sender_ref',
  // Secrets — credentials y claves
  'webhook_secret',
  'webhook_secret_prev',
  'api_key',
  'api_key_secret_name',
  'key',
  'credential',
  'credentials',
  'private_key',
  'signing_secret',
  'service_role',
  'service_role_key',
  'password',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'secret_key',
  'secret_ref',
  // Auth headers
  'jwt',
  'authorization',
  'bearer',
  // Message content — texto de mensajes
  'message_text',
  'description',
  'raw_payload',
  // Provider payloads
  'identity_data',
  'prompt',
  'completion',
  'provider_response',
]);

// ── Array sanitizer ────────────────────────────────────────────────────────

function sanitizeArray(arr: unknown[]): unknown[] {
  return arr.map(item => {
    if (Array.isArray(item)) {
      return sanitizeArray(item);
    } else if (item !== null && typeof item === 'object') {
      return sanitizeForLog(item as Record<string, unknown>);
    }
    return item;
  });
}

// ── URL query string sanitizer ─────────────────────────────────────────────

/**
 * Redacta valores de query params que coincidan con nombres sensibles.
 * No modifica paths, solo query string.
 */
export function sanitizeUrlForLog(url: string): string {
  try {
    const u = new URL(url);
    for (const key of u.searchParams.keys()) {
      if (FIELDS_TO_REDACT.has(key.toLowerCase())) {
        u.searchParams.set(key, '[REDACTED]');
      }
    }
    return u.toString();
  } catch {
    return '[URL_REDACTED]';
  }
}

// ── Error sanitizer ────────────────────────────────────────────────────────

/**
 * Sanitiza un Error para logging seguro.
 * No incluye stack trace en producción. No incluye cause si contiene secrets.
 */
export function sanitizeErrorForLog(err: unknown): Record<string, unknown> {
  if (!(err instanceof Error)) {
    return { type: 'non_error', message: String(err).slice(0, 200) };
  }
  return {
    name: err.name,
    message: err.message.slice(0, 500),
    // No incluir stack ni cause: pueden contener secrets o PII
  };
}

// ── Tipos exportados ──────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SafeLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

/**
 * Elimina campos sensibles de un objeto para que sea seguro loguearlo.
 * Recursivo para objetos anidados y arrays. No modifica el original.
 * Redacta por nombre de campo (case-sensitive en la lista, case-insensitive en lookup).
 */
export function sanitizeForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Lookup case-insensitive para mayor cobertura
    if (FIELDS_TO_REDACT.has(key) || FIELDS_TO_REDACT.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (Array.isArray(value)) {
      result[key] = sanitizeArray(value);
    } else if (value !== null && typeof value === 'object') {
      result[key] = sanitizeForLog(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Crea un logger contextualizado que redacta campos sensibles automáticamente.
 * Emite JSON estructurado a console.log / console.error.
 *
 * Campos incluidos en cada entrada de log:
 *   level, context, message, ts, [data sanitizado]
 */
export function createSafeLogger(context: string): SafeLogger {
  const emit = (level: LogLevel, message: string, data?: Record<string, unknown>) => {
    const entry: Record<string, unknown> = {
      level,
      context,
      message,
      ts: new Date().toISOString(),
    };
    if (data !== undefined) {
      entry['data'] = sanitizeForLog(data);
    }
    const line = JSON.stringify(entry);
    if (level === 'error' || level === 'warn') {
      console.error(line);
    } else {
      console.log(line);
    }
  };

  return {
    debug: (msg, data) => emit('debug', msg, data),
    info: (msg, data) => emit('info', msg, data),
    warn: (msg, data) => emit('warn', msg, data),
    error: (msg, data) => emit('error', msg, data),
  };
}
