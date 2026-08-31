/**
 * ef-tenant-guards.ts -- Guards de aislamiento multi-tenant para EFs WebChat.
 *
 * Proporciona operaciones atómicas de verificación de ownership y tenant.
 * Cada consulta a DB incluye client_account_id para evitar cross-tenant access.
 *
 * Principio: ninguna EF confía en IDs aportados por el navegador como única
 * fuente de autoridad. El tenant se obtiene de fuentes confiables (DB o token).
 *
 * Operaciones exportadas:
 *   - resolveWidgetToTenant        → widget_public_key → client_account_id
 *   - loadSessionForTenant         → session_id + client_account_id → session
 *   - assertSessionOwnership       → verifica sesión, tenant y sender_ref
 *   - assertWidgetBelongsToTenant  → verifica que widget pertenece al tenant
 *   - assertServiceActivation      → verifica que SC está activo para el tenant
 *   - assertTokenClaimsMatchRequest → verifica coherencia token vs. body
 *
 * Respuestas opacas: los errores cross-tenant devuelven 403/404 sin revelar
 * si el recurso existe en otro tenant.
 *
 * Fuente: SmartConversations Fase 11B2B, SEC-013.
 */

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type TenantGuardErrorCode =
  | 'MISSING_WIDGET_KEY'
  | 'WIDGET_NOT_FOUND'
  | 'SERVICE_INACTIVE'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_CLOSED'
  | 'SESSION_EXPIRED'
  | 'SENDER_MISMATCH'
  | 'TENANT_MISMATCH'
  | 'DB_ERROR'
  | 'TOKEN_CLAIMS_MISMATCH';

export interface GuardOk<T> {
  ok: true;
  data: T;
}

export interface GuardFail {
  ok: false;
  error: TenantGuardErrorCode;
  /** HTTP status code recomendado (siempre 403 o 404 para errores cross-tenant). */
  httpStatus: 403 | 404 | 500;
}

export type GuardResult<T> = GuardOk<T> | GuardFail;

export interface WebchatTenantConfig {
  client_account_id: string;
  is_active: boolean;
  widget_public_key?: string;
  auth_mode?: string;
  rate_limit_mode?: string;
}

export interface WebchatSession {
  id: string;
  sender_ref: string;
  channel: string;
  state?: string;
  expires_at?: string | null;
  client_account_id?: string;
}

// ── Tipo DB genérico ──────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

// ── resolveWidgetToTenant ─────────────────────────────────────────────────────

/**
 * Resuelve widget_public_key → client_account_id a través de conv_wc_configs.
 * En modo real, esta es la ÚNICA fuente de autoridad para el tenant.
 * El client_account_id del body jamás puede sobrescribir este resultado.
 *
 * @returns { ok: true, data: { client_account_id, ... } } si se resolvió
 * @returns { ok: false, error: ... }  si el widget es inválido, inactivo o no existe
 */
export async function resolveWidgetToTenant(
  widgetPublicKey: string,
  supabase: SupabaseClient,
): Promise<GuardResult<WebchatTenantConfig>> {
  if (!widgetPublicKey || typeof widgetPublicKey !== 'string') {
    return { ok: false, error: 'MISSING_WIDGET_KEY', httpStatus: 403 };
  }

  const { data, error } = await supabase
    .from('conv_wc_configs')
    .select('client_account_id, is_active, widget_public_key, auth_mode, rate_limit_mode')
    .eq('widget_public_key', widgetPublicKey)
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'DB_ERROR', httpStatus: 500 };
  }

  // Respuesta opaca: no revelar si el widget existe en otro tenant
  if (!data) {
    return { ok: false, error: 'WIDGET_NOT_FOUND', httpStatus: 403 };
  }

  if (!data.is_active) {
    return { ok: false, error: 'SERVICE_INACTIVE', httpStatus: 403 };
  }

  return { ok: true, data: data as WebchatTenantConfig };
}

// ── loadSessionForTenant ──────────────────────────────────────────────────────

/**
 * Carga una sesión WebChat verificando que pertenezca al tenant.
 * Incluye SIEMPRE client_account_id en el filtro DB para evitar cross-tenant.
 *
 * @returns session si existe, pertenece al tenant y es canal webchat.
 * @returns NOT_FOUND si no existe o pertenece a otro tenant (respuesta opaca).
 */
export async function loadSessionForTenant(
  sessionId: string,
  clientAccountId: string,
  supabase: SupabaseClient,
): Promise<GuardResult<WebchatSession>> {
  if (!sessionId || !clientAccountId) {
    return { ok: false, error: 'SESSION_NOT_FOUND', httpStatus: 404 };
  }

  const { data: session, error } = await supabase
    .from('conv_sessions')
    .select('id, sender_ref, channel, state, expires_at, client_account_id')
    .eq('id', sessionId)
    .eq('client_account_id', clientAccountId)   // filtro multi-tenant obligatorio
    .eq('channel', 'webchat')
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'DB_ERROR', httpStatus: 500 };
  }

  if (!session) {
    // Respuesta opaca: no revelar si la sesión existe en otro tenant
    return { ok: false, error: 'SESSION_NOT_FOUND', httpStatus: 404 };
  }

  return { ok: true, data: session as WebchatSession };
}

// ── assertSessionOwnership ────────────────────────────────────────────────────

/**
 * Verifica que la sesión pertenece al tenant, sender_ref coincide y la sesión
 * no está cerrada ni expirada.
 *
 * Siempre filtra por client_account_id en la consulta DB.
 * Devuelve 403/404 sin revelar si el recurso existe en otro tenant.
 */
export async function assertSessionOwnership(
  sessionId: string,
  clientAccountId: string,
  senderRef: string,
  supabase: SupabaseClient,
): Promise<GuardResult<WebchatSession>> {
  const sessionResult = await loadSessionForTenant(sessionId, clientAccountId, supabase);

  if (!sessionResult.ok) return sessionResult;

  const session = sessionResult.data;

  // Verificar sender_ref — cross-tenant access intento o sesión incorrecta
  if (session.sender_ref !== senderRef) {
    return { ok: false, error: 'SENDER_MISMATCH', httpStatus: 403 };
  }

  // Verificar estado
  if (session.state === 'CLOSED') {
    return { ok: false, error: 'SESSION_CLOSED', httpStatus: 403 };
  }

  // Verificar expiración
  if (session.expires_at && new Date(session.expires_at) < new Date()) {
    return { ok: false, error: 'SESSION_EXPIRED', httpStatus: 403 };
  }

  return { ok: true, data: session };
}

// ── assertWidgetBelongsToTenant ───────────────────────────────────────────────

/**
 * Verifica que el widget_public_key del request corresponde al tenant esperado.
 * Impide que Tenant A use widget_public_key de Tenant B.
 */
export async function assertWidgetBelongsToTenant(
  widgetPublicKey: string,
  expectedClientAccountId: string,
  supabase: SupabaseClient,
): Promise<GuardResult<WebchatTenantConfig>> {
  const result = await resolveWidgetToTenant(widgetPublicKey, supabase);

  if (!result.ok) return result;

  if (result.data.client_account_id !== expectedClientAccountId) {
    // Cross-tenant attempt: widget del Tenant B usado con Tenant A
    // Respuesta opaca — no revelar que el widget existe
    return { ok: false, error: 'TENANT_MISMATCH', httpStatus: 403 };
  }

  return result;
}

// ── assertServiceActivation ───────────────────────────────────────────────────

/**
 * Verifica que SmartConversations está activo para el tenant.
 * Combina verificación de conv_service_activations y conv_wc_configs.
 * Solo require service_activations cuando la activación de nivel-1 es relevante.
 */
export async function assertServiceActivation(
  clientAccountId: string,
  supabase: SupabaseClient,
): Promise<GuardResult<{ active: true }>> {
  if (!clientAccountId) {
    return { ok: false, error: 'SERVICE_INACTIVE', httpStatus: 403 };
  }

  const { data: config, error } = await supabase
    .from('conv_wc_configs')
    .select('is_active')
    .eq('client_account_id', clientAccountId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'DB_ERROR', httpStatus: 500 };
  }

  if (!config || !config.is_active) {
    return { ok: false, error: 'SERVICE_INACTIVE', httpStatus: 403 };
  }

  return { ok: true, data: { active: true } };
}

// ── assertTokenClaimsMatchRequest ─────────────────────────────────────────────

/**
 * Verifica que los claims del token coinciden con los valores del request body.
 * Si el body contiene algún campo que contradiga el token, devuelve TOKEN_CLAIMS_MISMATCH.
 * Los campos del token son la fuente de autoridad; el body no puede sobrescribirlos.
 */
export function assertTokenClaimsMatchRequest(
  tokenClaims: { client_account_id: string; session_id: string; sender_ref: string },
  requestBody: { client_account_id?: unknown; session_id?: unknown; sender_ref?: unknown },
): GuardResult<{ matched: true }> {
  if (
    requestBody.client_account_id &&
    requestBody.client_account_id !== tokenClaims.client_account_id
  ) {
    return { ok: false, error: 'TOKEN_CLAIMS_MISMATCH', httpStatus: 403 };
  }

  if (
    requestBody.session_id &&
    requestBody.session_id !== tokenClaims.session_id
  ) {
    return { ok: false, error: 'TOKEN_CLAIMS_MISMATCH', httpStatus: 403 };
  }

  if (
    requestBody.sender_ref &&
    requestBody.sender_ref !== tokenClaims.sender_ref
  ) {
    return { ok: false, error: 'TOKEN_CLAIMS_MISMATCH', httpStatus: 403 };
  }

  return { ok: true, data: { matched: true } };
}

// ── HTTP status helper ────────────────────────────────────────────────────────

/**
 * Convierte un TenantGuardErrorCode al HTTP status code apropiado.
 * Errores cross-tenant siempre retornan 403 o 404 (nunca 200 o 401).
 */
export function guardErrorToHttpStatus(error: TenantGuardErrorCode): 403 | 404 | 500 {
  switch (error) {
    case 'MISSING_WIDGET_KEY':
    case 'WIDGET_NOT_FOUND':
    case 'SERVICE_INACTIVE':
    case 'SESSION_CLOSED':
    case 'SESSION_EXPIRED':
    case 'SENDER_MISMATCH':
    case 'TENANT_MISMATCH':
    case 'TOKEN_CLAIMS_MISMATCH':
      return 403;
    case 'SESSION_NOT_FOUND':
      return 404;
    case 'DB_ERROR':
      return 500;
  }
}
