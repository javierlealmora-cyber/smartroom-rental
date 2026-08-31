/**
 * wasender-smoke.ts -- Runner de smoke controlado para Wasender sandbox.
 *
 * Por defecto: imprime "wasender smoke disabled" sin llamar fetch.
 * Para ejecucion real sandbox se requieren todas las variables de entorno
 * listadas en docs/smart-conversations/wasender-integration/smoke-test-plan.md.
 *
 * Seguridad:
 *   - No imprime API key.
 *   - No imprime numero de telefono.
 *   - No imprime cuerpo del mensaje.
 *   - Bloquea URLs de produccion por defecto.
 *   - No envia WhatsApps sin WASENDER_SMOKE_ENABLED=true.
 */

// ---------------------------------------------------------------------------
// Config (leida de Deno.env o process.env segun entorno)
// ---------------------------------------------------------------------------

function _getEnv(key: string): string | undefined {
  try {
    // @ts-ignore
    if (typeof Deno !== 'undefined') return Deno.env.get(key);
  } catch { /**/ }
  try {
    // @ts-ignore
    if (typeof process !== 'undefined') return process.env[key];
  } catch { /**/ }
  return undefined;
}

interface SmokeConfig {
  enabled:        boolean;
  mode:           string;
  hasApiKey:      boolean;
  hasBaseUrl:     boolean;
  baseUrl:        string;
  sessionId:      string;
  hasRecipient:   boolean;
  allowProduction: boolean;
}

function _readConfig(): SmokeConfig {
  return {
    enabled:         _getEnv('WASENDER_SMOKE_ENABLED') === 'true',
    mode:            _getEnv('WASENDER_INTEGRATION_MODE') ?? 'mock',
    hasApiKey:       !!_getEnv('WASENDER_API_KEY'),
    hasBaseUrl:      !!_getEnv('WASENDER_BASE_URL'),
    baseUrl:         _getEnv('WASENDER_BASE_URL') ?? '',
    sessionId:       _getEnv('WASENDER_SMOKE_WA_SESSION_ID') ?? '',
    hasRecipient:    !!_getEnv('WASENDER_SMOKE_RECIPIENT'),
    allowProduction: _getEnv('WASENDER_SMOKE_ALLOW_PRODUCTION') === 'true',
  };
}

// Los dominios de produccion reales no se listan aqui por seguridad.
// La lista se mantiene en el runner interno exclusivamente.
const PRODUCTION_URL_PATTERNS = [
  /smartroom\.es/i,
  /smartroomrental\.com/i,
  /\.supabase\.co/i,
];

function _isProductionUrl(url: string): boolean {
  return PRODUCTION_URL_PATTERNS.some(p => p.test(url));
}

// ---------------------------------------------------------------------------
// Validacion de configuracion
// ---------------------------------------------------------------------------

function _validateConfig(cfg: SmokeConfig): string | null {
  if (!cfg.enabled)       return 'SMOKE_DISABLED';
  if (!cfg.hasApiKey)     return 'WASENDER_API_KEY_MISSING';
  if (!cfg.hasBaseUrl)    return 'WASENDER_BASE_URL_MISSING';
  if (cfg.mode !== 'real') return 'WASENDER_INTEGRATION_MODE_NOT_REAL';
  if (!cfg.sessionId)     return 'WASENDER_SMOKE_WA_SESSION_ID_MISSING';
  if (!cfg.hasRecipient)  return 'WASENDER_SMOKE_RECIPIENT_MISSING';
  if (_isProductionUrl(cfg.baseUrl) && !cfg.allowProduction)
    return 'PRODUCTION_URL_BLOCKED';
  return null;
}

// ---------------------------------------------------------------------------
// Safe logger -- nunca imprime API key, telefono ni Authorization
// ---------------------------------------------------------------------------

function safeLog(message: string): void {
  if (
    message.includes('Authorization') ||
    message.includes('Bearer ') ||
    message.includes('WASENDER_API_KEY')
  ) {
    console.log('[REDACTED]');
    return;
  }
  console.log(`[wasender-smoke] ${message}`);
}

// ---------------------------------------------------------------------------
// Smoke flows (solo se ejecutan si cfg.enabled y cfg.mode=real)
// ---------------------------------------------------------------------------

async function runWasenderSmoke(): Promise<void> {
  const cfg = _readConfig();
  const blockReason = _validateConfig(cfg);

  if (blockReason) {
    safeLog(`smoke deshabilitado: ${blockReason}`);
    return;
  }

  safeLog('iniciando smoke controlado contra sandbox Wasender');
  safeLog(`base_url configurada: [OMITIDO POR SEGURIDAD]`);
  safeLog(`session_id: ${cfg.sessionId}`);

  // Importar adapter solo si se va a ejecutar -- nunca a import-time
  const { sendWasenderMessage } = await import(
    '../../supabase/functions/_shared/smart-conversations/runtime/wasender-http-client.ts'
  );

  // WS-SMOKE-01: Envio de texto simple
  safeLog('WS-SMOKE-01: enviando mensaje de texto de prueba...');
  const result = await sendWasenderMessage({
    client_account_id:  'smoke_test',
    wa_session_id:       cfg.sessionId,
    recipient_ref:       '[OMITIDO POR SEGURIDAD]',
    text:                'SmartConversations smoke test - ignorar este mensaje',
  });

  if (result.ok) {
    safeLog(`WS-SMOKE-01: OK -- provider_message_id presente: ${!!result.provider_message_id}`);
  } else {
    safeLog(`WS-SMOKE-01: ERROR -- ${result.error_code ?? 'desconocido'}`);
  }

  safeLog('smoke finalizado');
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

runWasenderSmoke().catch(err => {
  console.error('[wasender-smoke] ERROR inesperado:', err instanceof Error ? err.message : String(err));
});
