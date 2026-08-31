/**
 * webchat-rate-limiter.ts -- Rate limiting del canal WebChat.
 *
 * No crea tablas nuevas. Usa conv_messages existente en mode=database.
 * Se aplica en conv-web-message ANTES de llamar a conv-ingest.
 *
 * Limites:
 *   - Por sesion: WEBCHAT_RATE_LIMIT_PER_SESSION_PER_MINUTE (default 30)
 *   - Por tenant: WEBCHAT_RATE_LIMIT_PER_TENANT_PER_MINUTE  (default 300)
 *   - Ventana:    WEBCHAT_RATE_LIMIT_WINDOW_SECONDS          (default 60)
 *
 * Modos:
 *   WEBCHAT_RATE_LIMIT_MODE=mock     (default) -- nunca bloquea, sin DB
 *   WEBCHAT_RATE_LIMIT_MODE=database           -- cuenta mensajes inbound reales
 *
 * En mode=database:
 *   - Cuenta solo direction='inbound' en conv_messages
 *   - Para sesion: filtra tambien por session_id
 *   - Para tenant: filtra por client_account_id + channel='webchat'
 *   - Solo lee el conteo (head=true), nunca el contenido del mensaje
 *   - NO registra sender_ref ni texto
 *
 * Comportamiento al exceder limite:
 *   - Devuelve HTTP 429 con retry_after_seconds seguro
 *   - Flujo detenido antes de conv-ingest
 *   - NO crea mensaje
 *   - NO publica Realtime
 *   - NO crea caso
 *   - NO publica Activity Log
 *
 * Fuente: SmartConversations Fase 10F, rules-31, rules-80.
 */

// ── Env helper ────────────────────────────────────────────────────────────

function _getEnv(key: string): string | undefined {
  if (typeof Deno !== 'undefined') return Deno.env.get(key);
  return undefined;
}

// ── Tipos exportados ──────────────────────────────────────────────────────

export type WebchatRateLimitMode = 'mock' | 'database';

export interface WebchatRateLimitConfig {
  mode:                 WebchatRateLimitMode;
  perSessionPerMinute:  number;
  perTenantPerMinute:   number;
  windowSeconds:        number;
}

export type RateLimitResult =
  | { allowed: true }
  | {
      allowed:             false;
      reason:              'SESSION_EXCEEDED' | 'TENANT_EXCEEDED' | 'CONFIG_ERROR';
      retry_after_seconds: number;
    };

// ── Feature flag y config ─────────────────────────────────────────────────

export function getWebchatRateLimitMode(): WebchatRateLimitMode {
  const raw = _getEnv('WEBCHAT_RATE_LIMIT_MODE') ?? 'mock';
  return raw === 'database' ? 'database' : 'mock';
}

export function getWebchatRateLimitConfig(): WebchatRateLimitConfig {
  const mode = getWebchatRateLimitMode();
  return {
    mode,
    perSessionPerMinute: parseInt(
      _getEnv('WEBCHAT_RATE_LIMIT_PER_SESSION_PER_MINUTE') ?? '30', 10,
    ),
    perTenantPerMinute: parseInt(
      _getEnv('WEBCHAT_RATE_LIMIT_PER_TENANT_PER_MINUTE') ?? '300', 10,
    ),
    windowSeconds: parseInt(
      _getEnv('WEBCHAT_RATE_LIMIT_WINDOW_SECONDS') ?? '60', 10,
    ),
  };
}

// ── Verificacion de rate limit ────────────────────────────────────────────

/**
 * Verifica si client_account_id / session_id estan dentro del limite.
 * En mode=mock siempre devuelve allowed=true sin tocar DB.
 * En mode=database hace count exacto en conv_messages (head=true, sin leer contenido).
 *
 * @param supabase  Cliente Supabase (ignorado en mode=mock, requerido en mode=database)
 */
// deno-lint-ignore no-explicit-any
export async function checkWebchatRateLimit(
  client_account_id: string,
  session_id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any,
): Promise<RateLimitResult> {
  const cfg = getWebchatRateLimitConfig();

  if (cfg.mode === 'mock') {
    return { allowed: true };
  }

  if (!supabase) {
    return { allowed: false, reason: 'CONFIG_ERROR', retry_after_seconds: cfg.windowSeconds };
  }

  const windowStart = new Date(Date.now() - cfg.windowSeconds * 1_000).toISOString();

  // ── Limite por sesion ──────────────────────────────────────────────────
  const sessionResult = await supabase
    .from('conv_messages')
    .select('id', { count: 'exact', head: true })
    .eq('client_account_id', client_account_id)
    .eq('session_id', session_id)
    .eq('channel', 'webchat')
    .eq('direction', 'inbound')
    .gte('created_at', windowStart);

  if (sessionResult.error) {
    return { allowed: false, reason: 'CONFIG_ERROR', retry_after_seconds: cfg.windowSeconds };
  }

  if ((sessionResult.count ?? 0) >= cfg.perSessionPerMinute) {
    return { allowed: false, reason: 'SESSION_EXCEEDED', retry_after_seconds: cfg.windowSeconds };
  }

  // ── Limite por tenant ──────────────────────────────────────────────────
  const tenantResult = await supabase
    .from('conv_messages')
    .select('id', { count: 'exact', head: true })
    .eq('client_account_id', client_account_id)
    .eq('channel', 'webchat')
    .eq('direction', 'inbound')
    .gte('created_at', windowStart);

  if (tenantResult.error) {
    return { allowed: false, reason: 'CONFIG_ERROR', retry_after_seconds: cfg.windowSeconds };
  }

  if ((tenantResult.count ?? 0) >= cfg.perTenantPerMinute) {
    return { allowed: false, reason: 'TENANT_EXCEEDED', retry_after_seconds: cfg.windowSeconds };
  }

  return { allowed: true };
}

// ── Rate limit: creación de sesiones ─────────────────────────────────────────

/**
 * Verifica el rate limit de creación de sesiones WebChat por tenant.
 * Usa conv_sessions existente (count inbound en ventana temporal).
 *
 * Límite: WEBCHAT_RATE_LIMIT_SESSIONS_PER_TENANT_PER_MINUTE (default 10)
 *
 * Justificación de uso de conv_sessions: evita crear tabla extra.
 * count en ventana corta es eficiente con índice por (client_account_id, created_at).
 *
 * En mode=mock: siempre allowed (entornos local/test).
 * En mode=database: cuenta sesiones webchat creadas en ventana.
 */
export async function checkSessionCreationRateLimit(
  client_account_id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any,
): Promise<RateLimitResult> {
  const cfg = getWebchatRateLimitConfig();

  if (cfg.mode === 'mock') {
    return { allowed: true };
  }

  if (!supabase) {
    return { allowed: false, reason: 'CONFIG_ERROR', retry_after_seconds: cfg.windowSeconds };
  }

  const limit = parseInt(
    _getEnv('WEBCHAT_RATE_LIMIT_SESSIONS_PER_TENANT_PER_MINUTE') ?? '10', 10,
  );
  const windowStart = new Date(Date.now() - cfg.windowSeconds * 1_000).toISOString();

  const { count, error } = await supabase
    .from('conv_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('client_account_id', client_account_id)
    .eq('channel', 'webchat')
    .gte('created_at', windowStart);

  if (error) {
    return { allowed: false, reason: 'CONFIG_ERROR', retry_after_seconds: cfg.windowSeconds };
  }

  if ((count ?? 0) >= limit) {
    return { allowed: false, reason: 'TENANT_EXCEEDED', retry_after_seconds: cfg.windowSeconds };
  }

  return { allowed: true };
}

// ── Rate limit: polling ───────────────────────────────────────────────────────

/**
 * Verifica el rate limit de polling WebChat por sesión.
 * Usa conv_rate_limit_buckets (tabla creada en migración 11B2B).
 *
 * Justificación de tabla dedicada: las operaciones de poll son reads puros —
 * no crean conv_messages ni modifican conv_sessions. No existe otra tabla
 * del schema actual que registre la frecuencia de polling sin crear datos PII.
 * conv_rate_limit_buckets almacena solo: tenant, operation, window_start, count.
 *
 * Límite: WEBCHAT_RATE_LIMIT_POLLS_PER_SESSION_PER_MINUTE (default 60)
 *
 * En mode=mock: siempre allowed.
 * En mode=database: incrementa y verifica el bucket de polling.
 */
export async function checkPollRateLimit(
  client_account_id: string,
  session_id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase?: any,
): Promise<RateLimitResult> {
  const cfg = getWebchatRateLimitConfig();

  if (cfg.mode === 'mock') {
    return { allowed: true };
  }

  if (!supabase) {
    return { allowed: false, reason: 'CONFIG_ERROR', retry_after_seconds: cfg.windowSeconds };
  }

  const limit = parseInt(
    _getEnv('WEBCHAT_RATE_LIMIT_POLLS_PER_SESSION_PER_MINUTE') ?? '60', 10,
  );

  // Upsert atómico en conv_rate_limit_buckets
  // bucket_key = SHA-256(client_account_id + ':' + session_id + ':poll')
  // Para simplicidad en Fase 11B2B: usar clave derivada sin hash real
  const bucketKey = `${client_account_id}:${session_id}:poll`;
  const windowStart = new Date(
    Date.now() - cfg.windowSeconds * 1_000,
  ).toISOString();
  const windowEnd = new Date(Date.now() + cfg.windowSeconds * 1_000).toISOString();

  // 1. Insertar o incrementar el bucket
  const { error: upsertErr } = await supabase.rpc('increment_rate_limit_bucket', {
    p_client_account_id: client_account_id,
    p_bucket_key:        bucketKey,
    p_operation:         'poll',
    p_window_start:      windowStart,
    p_expires_at:        windowEnd,
  });

  if (upsertErr) {
    // La función SQL puede no existir en entorno sin migración aplicada
    // Fail-open seguro: permitir el poll en lugar de bloquear toda la funcionalidad
    return { allowed: true };
  }

  // 2. Leer el count actual
  const { data: bucket, error: readErr } = await supabase
    .from('conv_rate_limit_buckets')
    .select('request_count')
    .eq('bucket_key', bucketKey)
    .gte('window_start', new Date(Date.now() - cfg.windowSeconds * 2_000).toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (readErr || !bucket) {
    return { allowed: true }; // fail-open si no se puede leer
  }

  if ((bucket.request_count ?? 0) > limit) {
    return { allowed: false, reason: 'SESSION_EXCEEDED', retry_after_seconds: cfg.windowSeconds };
  }

  return { allowed: true };
}
