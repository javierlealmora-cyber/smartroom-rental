/**
 * env-config.ts -- Configuración fail-closed por entorno para SmartConversations.
 *
 * Distingue entornos permisivos (local/test/CI) de entornos reales (sandbox/preproduction/production).
 * En entornos reales, rechaza configuraciones inseguras antes de procesar cualquier request.
 *
 * Reglas fail-closed:
 *   - real + WEBCHAT_AUTH_MODE=legacy       → rechazado (SEC-004)
 *   - real + WEBCHAT_RATE_LIMIT_MODE=mock   → rechazado (SEC-002)
 *   - signed_token sin WEBCHAT_SESSION_SIGNING_SECRET → rechazado
 *   - WEBCHAT_INTEGRATION_MODE=real sin APP_ENVIRONMENT → rechazado
 *
 * El fallo es seguro: no revela valores de configuración en la respuesta HTTP.
 * Los errores detallados van exclusivamente a process.stderr / Deno logs.
 *
 * Fuente: SmartConversations Fase 11B2B, SEC-002, SEC-004.
 */

// ── Env helper ────────────────────────────────────────────────────────────────

function _getEnv(key: string): string | undefined {
  if (typeof Deno !== 'undefined') return Deno.env.get(key);
  if (typeof process !== 'undefined') return process.env[key];
  return undefined;
}

// ── Tipos exportados ──────────────────────────────────────────────────────────

export type WebchatEnvMode =
  | 'local'
  | 'test'
  | 'ci'
  | 'sandbox'
  | 'preproduction'
  | 'production'
  | 'unknown_real';

export interface EnvConfigResult {
  valid: boolean;
  envMode: WebchatEnvMode;
  /** Solo para logs internos seguros. Nunca exponer en respuestas HTTP. */
  internalErrors: string[];
}

// ── Detección de entorno ──────────────────────────────────────────────────────

/**
 * Detecta el modo de entorno.
 * Regla: WEBCHAT_INTEGRATION_MODE=real → entorno real (sandbox/preprod/prod).
 *        WEBCHAT_INTEGRATION_MODE=mock (default) → entorno permisivo (local/test/CI).
 */
export function detectEnvMode(): WebchatEnvMode {
  const integrationMode = _getEnv('WEBCHAT_INTEGRATION_MODE') ?? 'mock';

  if (integrationMode !== 'real') {
    // Permisivo — distinguir local/test/CI para logs
    const ci = _getEnv('CI') ?? '';
    if (ci === 'true' || ci === '1') return 'ci';
    const appEnv = (_getEnv('APP_ENVIRONMENT') ?? '').toLowerCase();
    if (appEnv === 'test') return 'test';
    return 'local';
  }

  // Modo real — identificar entorno específico
  const appEnv = (_getEnv('APP_ENVIRONMENT') ?? '').toLowerCase();
  switch (appEnv) {
    case 'sandbox':       return 'sandbox';
    case 'preproduction': return 'preproduction';
    case 'production':    return 'production';
    default:              return 'unknown_real';
  }
}

/**
 * Devuelve true si el entorno es permisivo (local/test/CI).
 * En entornos permisivos, configuraciones inseguras (legacy, mock) están permitidas.
 */
export function isPermissiveEnv(envMode: WebchatEnvMode): boolean {
  return envMode === 'local' || envMode === 'test' || envMode === 'ci';
}

/**
 * Devuelve true si el entorno es real (sandbox/preproduction/production).
 * En entornos reales, la configuración debe ser fail-closed.
 */
export function isRealEnv(envMode: WebchatEnvMode): boolean {
  return (
    envMode === 'sandbox' ||
    envMode === 'preproduction' ||
    envMode === 'production' ||
    envMode === 'unknown_real'
  );
}

// ── Validación fail-closed ────────────────────────────────────────────────────

/**
 * Valida la configuración del entorno. En entornos reales, aplica reglas fail-closed.
 * Los errores internos son seguros de logear pero NUNCA deben exponerse en respuestas HTTP.
 */
export function validateEnvConfig(): EnvConfigResult {
  const envMode = detectEnvMode();
  const internalErrors: string[] = [];

  if (isRealEnv(envMode)) {
    const authMode       = _getEnv('WEBCHAT_AUTH_MODE')              ?? 'legacy';
    const rateLimitMode  = _getEnv('WEBCHAT_RATE_LIMIT_MODE')        ?? 'mock';
    const signingSecret  = _getEnv('WEBCHAT_SESSION_SIGNING_SECRET') ?? '';

    if (envMode === 'unknown_real') {
      internalErrors.push(
        'APP_ENVIRONMENT no definido con WEBCHAT_INTEGRATION_MODE=real — fail-closed aplicado'
      );
    }

    if (authMode === 'legacy') {
      internalErrors.push(
        `SEC-004: WEBCHAT_AUTH_MODE=legacy rechazado en entorno '${envMode}'`
      );
    }

    if (rateLimitMode === 'mock') {
      internalErrors.push(
        `SEC-002: WEBCHAT_RATE_LIMIT_MODE=mock rechazado en entorno '${envMode}'`
      );
    }

    if (authMode === 'signed_token' && !signingSecret) {
      internalErrors.push(
        'WEBCHAT_SESSION_SIGNING_SECRET requerido cuando WEBCHAT_AUTH_MODE=signed_token'
      );
    }
  }

  return {
    valid:          internalErrors.length === 0,
    envMode,
    internalErrors,
  };
}

/**
 * Guard de arranque para Edge Functions.
 * Llama validateEnvConfig() y devuelve { ok: true } si la config es válida,
 * o { ok: false, safeMessage } si hay un error (el mensaje es seguro para HTTP).
 *
 * NUNCA incluir internalErrors en la respuesta HTTP al widget.
 */
export function checkStartupConfig(): { ok: true } | { ok: false; safeMessage: string } {
  const result = validateEnvConfig();

  if (!result.valid) {
    // Log seguro a stderr (no a stdout para evitar mezcla con JSON)
    if (typeof Deno !== 'undefined') {
      for (const e of result.internalErrors) {
        console.error(`[env-config] FAIL-CLOSED: ${e}`);
      }
    } else if (typeof console !== 'undefined') {
      for (const e of result.internalErrors) {
        console.error(`[env-config] FAIL-CLOSED: ${e}`);
      }
    }
    return { ok: false, safeMessage: 'Configuración de servicio inválida' };
  }

  return { ok: true };
}
