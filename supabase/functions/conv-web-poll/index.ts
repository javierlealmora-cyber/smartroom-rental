/**
 * conv-web-poll
 *
 * Polling fallback para el canal WebChat.
 * Devuelve mensajes outbound persistidos para una sesion WebChat.
 * Permite recuperar respuestas si Realtime falla o el navegador se desconecta.
 *
 * Principio: conv_messages = fuente de verdad. Polling = mecanismo de recuperacion.
 * El widget nunca confia en el payload Realtime como fuente de contenido.
 *
 * Autenticacion:
 *   - WEBCHAT_AUTH_MODE=signed_token:
 *       Authorization: Bearer <webchat_session_token>
 *       client_account_id, session_id, sender_ref derivados del token.
 *   - WEBCHAT_AUTH_MODE=legacy (default):
 *       client_account_id, session_id, sender_ref en body.
 *       Validacion contra DB (conv_sessions).
 *
 * Input:
 *   {
 *     "client_account_id": "uuid",   (legacy mode; signed_token mode: del token)
 *     "session_id":        "uuid",   (legacy mode; signed_token mode: del token)
 *     "sender_ref":        "wc_...", (legacy mode; signed_token mode: del token)
 *     "after_message_id":  "uuid",   (opcional: cursor)
 *     "after_created_at":  "ISO",    (opcional: cursor)
 *     "limit":             20        (opcional, max 50)
 *   }
 *
 * Output:
 *   {
 *     "ok": true,
 *     "data": {
 *       "messages": [{ "message_id", "direction", "sender_type", "message_text", "created_at" }],
 *       "next_cursor": { "after_message_id", "after_created_at" },
 *       "has_more": false
 *     }
 *   }
 *
 * Reglas:
 *   - Solo direction='outbound', channel='webchat', session validada.
 *   - No devuelve inbound del usuario.
 *   - No devuelve mensajes de otro tenant ni otra sesion.
 *   - Limite maximo: WEBCHAT_POLL_MAX_MESSAGES (default 50).
 *   - Cursor estable: created_at ASC + id ASC.
 *   - No modifica conv_messages.
 *   - No publica Activity Log.
 *   - No llama conv-ingest. No llama dispatch. Solo lectura de conv_messages.
 *
 * Privacidad: text no se loguea. sender_ref no se loguea.
 * Campos prohibidos en respuesta: sender_ref, profile_id, identity_data, raw_payload,
 *   phone, room_id, assignment_id, external_msg_id, service_role, authorization, token.
 *
 * Fuente: SmartConversations Fase 10F, rules-31, rules-80.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, ERROR_CODES } from "../_shared/response.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { isOpaqueSenderRef } from "../_shared/smart-conversations/runtime/webchat-client.ts";
import {
  buildBrowserCorsHeaders,
  buildPreflightResponse,
  addCorsToResponse,
} from "../_shared/smart-conversations/cors-policy.ts";
import {
  getWebchatAuthMode,
  verifyWebchatSessionToken,
  getWebchatSessionTokenConfig,
} from "../_shared/smart-conversations/runtime/webchat-session-token.ts";
import {
  getWebchatPollingConfig,
  normalizePollingLimit,
  buildNextCursor,
  type WebchatPollMessage,
} from "../_shared/smart-conversations/runtime/webchat-polling.ts";
import { checkStartupConfig } from "../_shared/smart-conversations/runtime/env-config.ts";
import { checkPollRateLimit } from "../_shared/smart-conversations/runtime/webchat-rate-limiter.ts";

const EF_NAME = 'conv-web-poll';

// Codigos de error especificos de polling
const POLL_ERROR_CODES = {
  SESSION_TOKEN_EXPIRED:   'WEBCHAT_SESSION_TOKEN_EXPIRED',
  SESSION_TOKEN_INVALID:   'WEBCHAT_SESSION_TOKEN_INVALID',
  TOKEN_CLAIMS_MISMATCH:   'WEBCHAT_TOKEN_CLAIMS_MISMATCH',
} as const;

export async function handleWebPollRequest(req: Request): Promise<Response> {
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
  const authMode = getWebchatAuthMode();
  const pollCfg = getWebchatPollingConfig();

  // ── Parseo de body ────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON invalido', 400);
  }

  // ── Variables de identidad ────────────────────────────────────────────────
  let client_account_id: string;
  let session_id: string;
  let sender_ref: string;

  if (authMode === 'signed_token') {
    // Extraer token del header Authorization
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return err(POLL_ERROR_CODES.SESSION_TOKEN_INVALID, 'Token de sesion requerido', 401);
    }

    const tokenCfg = getWebchatSessionTokenConfig();
    const result = await verifyWebchatSessionToken(token, tokenCfg.signingSecret);

    if (!result.valid) {
      if (result.reason === 'EXPIRED') {
        return err(POLL_ERROR_CODES.SESSION_TOKEN_EXPIRED, 'Token de sesion expirado', 401);
      }
      return err(POLL_ERROR_CODES.SESSION_TOKEN_INVALID, 'Token de sesion invalido', 401);
    }

    client_account_id = result.claims.client_account_id;
    session_id        = result.claims.session_id;
    sender_ref        = result.claims.sender_ref;

    // Verificar consistencia del token con el body (si se proporcionan)
    if (body['client_account_id'] && body['client_account_id'] !== client_account_id) {
      return err(POLL_ERROR_CODES.TOKEN_CLAIMS_MISMATCH, 'client_account_id no coincide con el token', 403);
    }
    if (body['session_id'] && body['session_id'] !== session_id) {
      return err(POLL_ERROR_CODES.TOKEN_CLAIMS_MISMATCH, 'session_id no coincide con el token', 403);
    }
    if (body['sender_ref'] && body['sender_ref'] !== sender_ref) {
      return err(POLL_ERROR_CODES.TOKEN_CLAIMS_MISMATCH, 'sender_ref no coincide con el token', 403);
    }

  } else {
    // Mode legacy: identidad desde body
    const caid = body['client_account_id'];
    const sid  = body['session_id'];
    const sref = body['sender_ref'];

    if (!caid || typeof caid !== 'string') {
      return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);
    }
    if (!sid || typeof sid !== 'string') {
      return err(ERROR_CODES.VALIDATION, 'session_id es obligatorio', 400);
    }
    if (!sref || typeof sref !== 'string') {
      return err(ERROR_CODES.VALIDATION, 'sender_ref es obligatorio', 400);
    }
    if (!isOpaqueSenderRef(sref)) {
      return err(ERROR_CODES.VALIDATION, 'sender_ref invalido', 400);
    }
    client_account_id = caid;
    session_id        = sid;
    sender_ref        = sref;
  }

  // ── Parametros de cursor y limite ─────────────────────────────────────────
  const after_message_id = (body['after_message_id'] as string | undefined) ?? undefined;
  const after_created_at = (body['after_created_at'] as string | undefined) ?? undefined;
  const limit = normalizePollingLimit(body['limit'], pollCfg);

  // ── Supabase ──────────────────────────────────────────────────────────────
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Validar sesion (legacy mode) ──────────────────────────────────────────
  if (authMode !== 'signed_token') {
    const { data: session } = await supabase
      .from('conv_sessions')
      .select('id, sender_ref, channel')
      .eq('id', session_id)
      .eq('client_account_id', client_account_id)
      .eq('channel', 'webchat')
      .maybeSingle();

    if (!session) {
      return err(ERROR_CODES.NOT_FOUND, 'Sesion no encontrada', 404);
    }
    if (session.sender_ref !== sender_ref) {
      return err(ERROR_CODES.FORBIDDEN, 'sender_ref no coincide con la sesion', 403);
    }
  }

  // ── Rate limit: polling ───────────────────────────────────────────────────
  const pollRateLimit = await checkPollRateLimit(client_account_id, session_id, supabase);
  if (!pollRateLimit.allowed) {
    log.warn('rate limit de polling excedido');
    return err(ERROR_CODES.FORBIDDEN, 'Demasiadas solicitudes de polling. Intenta más tarde.', 429);
  }

  // ── Consulta conv_messages ────────────────────────────────────────────────
  // Mode mock: devuelve lista vacia (sin query real)
  // Mode database: consulta real con cursor
  // Resolver allowed_origins para CORS dinámico
  const { data: wcCfgPoll } = await supabase
    .from('conv_wc_configs')
    .select('allowed_origins')
    .eq('client_account_id', client_account_id)
    .maybeSingle();
  const allowedOrigins: string[] = Array.isArray(wcCfgPoll?.allowed_origins)
    ? (wcCfgPoll!.allowed_origins as string[])
    : [];

  if (pollCfg.mode === 'mock') {
    log.info('WebChat poll (mock) — sin mensajes reales', { channel: 'webchat', session_id });
    const mockResponse = ok({ messages: [], next_cursor: {}, has_more: false });
    const { headers: corsH } = buildBrowserCorsHeaders(req, { allowedOrigins });
    return addCorsToResponse(mockResponse, corsH);
  }

  // Lookback maximo
  const lookbackStart = new Date(
    Date.now() - pollCfg.maxLookbackHours * 3_600_000,
  ).toISOString();

  // Construir query base
  let query = supabase
    .from('conv_messages')
    .select('id, direction, sender_type, text, created_at, status')
    .eq('client_account_id', client_account_id)
    .eq('session_id', session_id)
    .eq('channel', 'webchat')
    .eq('direction', 'outbound')
    .gte('created_at', lookbackStart)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit + 1);

  // Aplicar cursor si se proporciona
  if (after_created_at) {
    query = query.gt('created_at', after_created_at);
  }

  const { data: rows, error: queryErr } = await query;

  if (queryErr) {
    log.warn('Error al consultar conv_messages en poll', {});
    return err(ERROR_CODES.INTERNAL, 'Error al recuperar mensajes', 500);
  }

  const allRows = (rows ?? []) as Array<{
    id: string; direction: string; sender_type: string;
    text: string; created_at: string; status?: string;
  }>;

  const has_more = allRows.length > limit;
  const slice = has_more ? allRows.slice(0, limit) : allRows;

  const messages: WebchatPollMessage[] = slice.map(r => ({
    message_id:   r.id,
    direction:    'outbound' as const,
    sender_type:  r.sender_type,
    message_text: r.text,
    created_at:   r.created_at,
    ...(r.status ? { status: r.status } : {}),
  }));

  const last = messages[messages.length - 1];
  const next_cursor = last ? buildNextCursor(last) : {};

  log.info('WebChat poll completado', { channel: 'webchat', session_id });

  const pollResponse = ok({ messages, next_cursor, has_more });
  const { headers: corsH } = buildBrowserCorsHeaders(req, { allowedOrigins });
  return addCorsToResponse(pollResponse, corsH);
}

serve(handleWebPollRequest);
