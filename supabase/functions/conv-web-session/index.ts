/**
 * conv-web-session
 *
 * Adaptador de sesión WebChat. Crea y devuelve una referencia opaca de sesión
 * para que el widget pueda enviar mensajes a conv-web-message.
 *
 * Responsabilidades:
 *   1. Rechazar campos prohibidos de identidad en payload público
 *      (profile_id, phone, identity_data, room_id, assignment_id, raw_payload).
 *   2. Validar client_account_id.
 *   3. Validar origin contra conv_wc_configs.allowed_origins (si se aporta).
 *   4. Verificar que WebChat está activo (conv_wc_configs.is_active).
 *   5. Generar sender_ref opaco (wc_<uuid>).
 *   6. Crear fila en conv_sessions siempre (identity_level siempre NO_MATCH sin JWT).
 *   7. Devolver session_id, sender_ref, expires_at y services_available al widget.
 *
 * SEGURIDAD: El widget público NO puede enviar profile_id, phone ni identity_data.
 * La identidad WebChat autenticada requiere JWT firmado -- fuera de alcance hasta fase
 * posterior. Hasta entonces, toda sesión WebChat inicia con identity_level=NO_MATCH.
 *
 * No devuelve: service_role, profile_id, identity_data.
 * La identidad autenticada requiere JWT firmado, implementado en fase posterior.
 * Autenticación de entrada: pública (widget frontal), sin service_role input.
 * Uso interno de service_role: consultas a Supabase.
 *
 * Fuente: rules-31, contract-normalized-message §8.4, Fase 10E microfix.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, ERROR_CODES } from "../_shared/response.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import {
  buildBrowserCorsHeaders,
  buildPreflightResponse,
  addCorsToResponse,
} from "../_shared/smart-conversations/cors-policy.ts";
import { readWebchatConfig, getSessionExpiresAt } from "../_shared/smart-conversations/runtime/webchat-client.ts";
import { detectForbiddenPublicInput } from "../_shared/smart-conversations/runtime/webchat-security.ts";
import {
  getWebchatAuthMode,
  createWebchatSessionToken,
  getWebchatSessionTokenConfig,
} from "../_shared/smart-conversations/runtime/webchat-session-token.ts";
import { checkStartupConfig, isRealEnv, detectEnvMode } from "../_shared/smart-conversations/runtime/env-config.ts";
import { resolveWidgetToTenant } from "../_shared/smart-conversations/runtime/ef-tenant-guards.ts";
import { checkSessionCreationRateLimit } from "../_shared/smart-conversations/runtime/webchat-rate-limiter.ts";

const EF_NAME = 'conv-web-session';

// Servicios disponibles en WebChat (los tres servicios oficiales).
const WEBCHAT_SERVICES = ['conv_incidencias', 'conv_publicaciones', 'conv_ayuda'] as const;

export async function handleWebSessionRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return buildPreflightResponse(req, { allowedOrigins: [] });
  if (req.method !== 'POST') {
    return err(ERROR_CODES.INVALID_ACTION, 'Solo se acepta POST', 405);
  }

  // Fail-closed: rechazar configuraciones inseguras en entornos reales
  const startupCheck = checkStartupConfig();
  if (!startupCheck.ok) {
    return err(ERROR_CODES.INTERNAL, startupCheck.safeMessage, 503);
  }

  const log = createSafeLogger(EF_NAME);
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON inválido', 400);
  }

  // Rechazar campos de identidad no autenticada desde payload público.
  // El widget no puede enviar profile_id, phone ni identity_data sin JWT firmado.
  // La identidad WebChat autenticada se implementa en fase posterior con JWT real.
  const forbiddenField = detectForbiddenPublicInput(body);
  if (forbiddenField) {
    log.warn('campo prohibido en payload público WebChat rechazado');
    return err(ERROR_CODES.VALIDATION, `Campo no permitido en WebChat público: ${forbiddenField}`, 400);
  }

  // Origin del widget (puede estar vacío en llamadas server-side)
  const origin = req.headers.get('Origin') ?? '';

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Resolución de tenant ───────────────────────────────────────────────────
  // En entornos reales: widget_public_key es la fuente de autoridad para el tenant.
  //   client_account_id del body no es confiable y se ignora.
  // En entornos permisivos (local/test/CI): fallback a client_account_id del body.
  const envMode = detectEnvMode();
  const widgetPublicKey = body['widget_public_key'];
  let client_account_id: string;

  if (isRealEnv(envMode)) {
    // Modo real: widget_public_key obligatorio
    if (!widgetPublicKey || typeof widgetPublicKey !== 'string') {
      return err(ERROR_CODES.VALIDATION, 'widget_public_key es obligatorio', 400);
    }
    const tenantResult = await resolveWidgetToTenant(widgetPublicKey, supabase);
    if (!tenantResult.ok) {
      log.warn('widget_public_key no resolvió tenant válido');
      return err(ERROR_CODES.FORBIDDEN, 'Widget o servicio no disponible', tenantResult.httpStatus);
    }
    client_account_id = tenantResult.data.client_account_id;
  } else {
    // Modo permisivo: aceptar client_account_id del body (legacy/local)
    const caid = body['client_account_id'];
    if (!caid || typeof caid !== 'string') {
      return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);
    }
    client_account_id = caid;
  }

  // ── Rate limit: creación de sesiones ──────────────────────────────────────
  const rateLimitResult = await checkSessionCreationRateLimit(client_account_id, supabase);
  if (!rateLimitResult.allowed) {
    log.warn('rate limit de sesiones excedido para tenant');
    return err(ERROR_CODES.FORBIDDEN, 'Demasiadas sesiones creadas. Intenta más tarde.', 429);
  }

  // ── Verificar WebChat activo (solo en modo permisivo; real ya lo verificó resolveWidgetToTenant) ──
  let allowedOrigins: string[] = [];
  if (!isRealEnv(envMode)) {
    const { data: wcConfig } = await supabase
      .from('conv_wc_configs')
      .select('is_active, allowed_origins')
      .eq('client_account_id', client_account_id)
      .maybeSingle();

    if (!wcConfig || !wcConfig.is_active) {
      log.info('WebChat inactivo — sesión no creada');
      return err(ERROR_CODES.ACCOUNT_INACTIVE, 'WebChat no está activo para este tenant', 403);
    }
    allowedOrigins = Array.isArray(wcConfig.allowed_origins) ? wcConfig.allowed_origins : [];
  }

  // Validar origin contra allowed_origins (si se proporcionó origin y hay lista)
  if (origin && allowedOrigins.length > 0) {
    if (!allowedOrigins.includes(origin)) {
      log.warn('origin no permitido — acceso denegado');
      return err(ERROR_CODES.FORBIDDEN, 'Origin no permitido', 403);
    }
  }

  // Generar sender_ref opaco para el widget.
  // Formato: "wc_" + UUID sin guiones.
  // No contiene teléfono, profile_id ni datos PII.
  const senderRef = 'wc_' + crypto.randomUUID().replace(/-/g, '');

  // TTL de sesión
  const wcCfg = readWebchatConfig();
  const expiresAt = getSessionExpiresAt(wcCfg.sessionTtlMinutes);

  // Crear sesión en conv_sessions con identity_level=NO_MATCH.
  // Identity fast-path no disponible en widget publico sin JWT firmado.
  // wcIdentityLevel siempre es 'NO_MATCH' en el canal WebChat publico.
  const wcIdentityLevel = 'NO_MATCH';

  const { data: newSession, error: sessionInsertErr } = await supabase
    .from('conv_sessions')
    .insert({
      client_account_id,
      channel: 'webchat',
      sender_ref: senderRef,
      state: 'NEW',
      identity_level: wcIdentityLevel,
      identity_data: {},
      last_active_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (sessionInsertErr || !newSession) {
    log.error('Error al crear sesión WebChat', { err: sessionInsertErr?.message ?? 'sin datos' });
    return err(ERROR_CODES.INTERNAL, 'Error al crear la sesión', 500);
  }

  const sessionId: string = newSession.id;

  log.info('sesión WebChat creada', { channel: 'webchat', session_id: sessionId });

  // ── Token de sesion (solo en signed_token mode) ───────────────────────────
  // En legacy mode: sin token, compatible con Fase 10E.
  // En signed_token mode: token HMAC-SHA256 firmado con WEBCHAT_SESSION_SIGNING_SECRET.
  // El token no se loguea. El signing secret no se devuelve al widget.
  const authMode = getWebchatAuthMode();
  let webchatSessionToken: string | undefined;

  if (authMode === 'signed_token') {
    const tokenCfg = getWebchatSessionTokenConfig();
    if (tokenCfg.signingSecret) {
      webchatSessionToken = await createWebchatSessionToken(
        { client_account_id, session_id: sessionId, sender_ref: senderRef },
        tokenCfg.signingSecret,
        tokenCfg.tokenTtlMinutes,
      );
    }
  }

  // No devolver profile_id, identity_data, service_role ni signing secret al widget.
  const successResponse = ok({
    session_id: sessionId,
    channel: 'webchat',
    sender_ref: senderRef,
    client_account_id,
    expires_at: expiresAt,
    services_available: WEBCHAT_SERVICES,
    status: 'ready',
    ...(webchatSessionToken !== undefined ? { webchat_session_token: webchatSessionToken } : {}),
  });

  // Aplicar CORS dinámico: reflejar origin solo si está en la allowlist del widget.
  const { headers: corsH } = buildBrowserCorsHeaders(req, { allowedOrigins });
  return addCorsToResponse(successResponse, corsH);
}

serve(handleWebSessionRequest);
