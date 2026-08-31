/**
 * conv-web-message
 *
 * Adaptador de mensajes entrantes WebChat.
 * Recibe mensaje del widget, valida, normaliza y orquesta el flujo completo.
 *
 * Responsabilidades:
 *   1. Validar client_account_id, session_id, sender_ref y message_text.
 *   2. Verificar que WebChat está activo (conv_wc_configs.is_active).
 *   3. Verificar que session_id pertenece al tenant y sender_ref coincide.
 *   4. Validar formato opaco de sender_ref (wc_<32hex>).
 *   5. Validar longitud máxima de mensaje (WEBCHAT_MAX_MESSAGE_LENGTH, default 2000).
 *   6. Llamar a conv-ingest (normalización y registro del mensaje inbound).
 *   7. Llamar explícitamente a conv-dispatch-message (Opción A -- dispatch síncrono).
 *      conv-dispatch-message llama a conv-routing-engine y a conv-web-deliver.
 *   8. Devolver respuesta segura al widget.
 *
 * FLUJO POST-MESSAGE (Opción A -- síncrono controlado):
 *   conv-web-message
 *     → conv-ingest (registra mensaje, devuelve message_id)
 *     → conv-dispatch-message (routing + WF-20/30/40 + conv-web-deliver)
 *     → widget recibe { ok: true, message_id, status: 'received' }
 *
 * conv-ingest NO es equivalente a conv-dispatch-message.
 * conv-dispatch-message es el único que llama routing/WF/outbound.
 * Si dispatch falla, el mensaje ya está guardado -- se loguea sin exponer al widget.
 *
 * No implementa routing real ni integraciones externas directamente.
 * Solo orquesta conv-ingest y conv-dispatch-message del canal WebChat.
 * Autenticación de entrada: pública (widget frontal), sin service_role input.
 * Uso interno de service_role: consultas a Supabase, conv-ingest y conv-dispatch.
 *
 * Privacidad: message_text y sender_ref no se loguean.
 * Fuente: rules-31, contract-normalized-message §8.4, Fase 10E microfix.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, ERROR_CODES } from "../_shared/response.ts";
import {
  buildBrowserCorsHeaders,
  buildPreflightResponse,
  addCorsToResponse,
} from "../_shared/smart-conversations/cors-policy.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import {
  isOpaqueSenderRef,
  readWebchatConfig,
} from "../_shared/smart-conversations/runtime/webchat-client.ts";
import {
  getWebchatAuthMode,
  verifyWebchatSessionToken,
  getWebchatSessionTokenConfig,
} from "../_shared/smart-conversations/runtime/webchat-session-token.ts";
import {
  checkWebchatRateLimit,
} from "../_shared/smart-conversations/runtime/webchat-rate-limiter.ts";
import { checkStartupConfig } from "../_shared/smart-conversations/runtime/env-config.ts";
import { assertSessionOwnership } from "../_shared/smart-conversations/runtime/ef-tenant-guards.ts";

// Codigos de error especificos de auth WebChat
const WM_ERROR_CODES = {
  SESSION_TOKEN_EXPIRED: 'WEBCHAT_SESSION_TOKEN_EXPIRED',
  SESSION_TOKEN_INVALID: 'WEBCHAT_SESSION_TOKEN_INVALID',
  TOKEN_CLAIMS_MISMATCH: 'WEBCHAT_TOKEN_CLAIMS_MISMATCH',
  RATE_LIMIT_SESSION:    'WEBCHAT_RATE_LIMIT_SESSION_EXCEEDED',
  RATE_LIMIT_TENANT:     'WEBCHAT_RATE_LIMIT_TENANT_EXCEEDED',
  RATE_LIMIT_CONFIG:     'WEBCHAT_RATE_LIMIT_CONFIG_ERROR',
} as const;

const EF_NAME = 'conv-web-message';

export async function handleWebMessageRequest(req: Request): Promise<Response> {
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

  let body: {
    client_account_id?: unknown;
    session_id?: unknown;
    sender_ref?: unknown;
    message_text?: unknown;
    client_message_id?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON inválido', 400);
  }

  const { client_account_id, session_id, sender_ref, message_text, client_message_id } = body;

  if (!client_account_id || typeof client_account_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);
  }
  if (!session_id || typeof session_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'session_id es obligatorio', 400);
  }
  if (!sender_ref || typeof sender_ref !== 'string' || sender_ref.trim() === '') {
    return err(ERROR_CODES.VALIDATION, 'sender_ref es obligatorio', 400);
  }
  if (!message_text || typeof message_text !== 'string' || message_text.trim() === '') {
    return err(ERROR_CODES.VALIDATION, 'message_text es obligatorio', 400);
  }

  // Validar formato opaco del sender_ref: debe empezar por wc_ y ser 32hex
  if (!isOpaqueSenderRef(sender_ref)) {
    return err(ERROR_CODES.VALIDATION, 'sender_ref inválido', 400);
  }

  // ── Validacion de token (signed_token mode) ───────────────────────────────
  // En legacy mode: omitido (compatible con Fase 10E).
  // En signed_token mode: token requerido en Authorization header.
  const authMode = getWebchatAuthMode();
  if (authMode === 'signed_token') {
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization') ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return err(WM_ERROR_CODES.SESSION_TOKEN_INVALID, 'Token de sesion requerido', 401);
    }

    const tokenCfg = getWebchatSessionTokenConfig();
    const result = await verifyWebchatSessionToken(token, tokenCfg.signingSecret);

    if (!result.valid) {
      if (result.reason === 'EXPIRED') {
        return err(WM_ERROR_CODES.SESSION_TOKEN_EXPIRED, 'Token de sesion expirado', 401);
      }
      return err(WM_ERROR_CODES.SESSION_TOKEN_INVALID, 'Token de sesion invalido', 401);
    }

    // Verificar que las claims del token coinciden con el body
    if (result.claims.client_account_id !== client_account_id) {
      return err(WM_ERROR_CODES.TOKEN_CLAIMS_MISMATCH, 'client_account_id no coincide con el token', 403);
    }
    if (result.claims.session_id !== session_id) {
      return err(WM_ERROR_CODES.TOKEN_CLAIMS_MISMATCH, 'session_id no coincide con el token', 403);
    }
    if (result.claims.sender_ref !== sender_ref) {
      return err(WM_ERROR_CODES.TOKEN_CLAIMS_MISMATCH, 'sender_ref no coincide con el token', 403);
    }
  }

  // Validar longitud máxima del mensaje
  const wcCfg = readWebchatConfig();
  if (message_text.length > wcCfg.maxMessageLength) {
    return err(ERROR_CODES.VALIDATION, 'message_text supera la longitud máxima', 400);
  }

  // Verificar que WebChat está activo (nivel 2 de activación, conv_wc_configs)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: wcConfig } = await supabase
    .from('conv_wc_configs')
    .select('is_active, allowed_origins')
    .eq('client_account_id', client_account_id)
    .maybeSingle();

  // Orígenes permitidos para CORS dinámico (resueltos del widget/tenant)
  const allowedOrigins: string[] = Array.isArray(wcConfig?.allowed_origins)
    ? (wcConfig!.allowed_origins as string[])
    : [];

  if (!wcConfig || !wcConfig.is_active) {
    log.info('WebChat inactivo — mensaje rechazado');
    return err(ERROR_CODES.ACCOUNT_INACTIVE, 'WebChat no está activo para este tenant', 403);
  }

  // Verificar ownership de la sesión: tenant, sender_ref, state y expires_at.
  // assertSessionOwnership incluye filtro por client_account_id (multi-tenant obligatorio),
  // verifica CLOSED y expires_at, y devuelve respuesta opaca ante errores cross-tenant.
  const sessionGuard = await assertSessionOwnership(
    session_id as string,
    client_account_id as string,
    sender_ref as string,
    supabase,
  );

  if (!sessionGuard.ok) {
    if (sessionGuard.error === 'SESSION_NOT_FOUND') {
      return err(ERROR_CODES.NOT_FOUND, 'Sesión no encontrada', 404);
    }
    return err(ERROR_CODES.FORBIDDEN, 'Acceso a sesión denegado', sessionGuard.httpStatus);
  }

  // ── Rate limiting (antes de conv-ingest) ─────────────────────────────────
  // WEBCHAT_RATE_LIMIT_MODE=mock (default): siempre allowed, sin DB.
  // WEBCHAT_RATE_LIMIT_MODE=database: cuenta mensajes inbound en conv_messages.
  // Si se supera el limite: HTTP 429, sin llamar conv-ingest, dispatch ni crear mensaje.
  const rateLimitResult = await checkWebchatRateLimit(
    client_account_id as string,
    session_id as string,
    supabase,
  );

  if (!rateLimitResult.allowed) {
    if (rateLimitResult.reason === 'SESSION_EXCEEDED') {
      return err(WM_ERROR_CODES.RATE_LIMIT_SESSION, 'Limite de mensajes por sesion excedido', 429,
        { retry_after_seconds: rateLimitResult.retry_after_seconds });
    }
    if (rateLimitResult.reason === 'TENANT_EXCEEDED') {
      return err(WM_ERROR_CODES.RATE_LIMIT_TENANT, 'Limite de mensajes por tenant excedido', 429,
        { retry_after_seconds: rateLimitResult.retry_after_seconds });
    }
    return err(WM_ERROR_CODES.RATE_LIMIT_CONFIG, 'Error de configuracion en rate limit', 500);
  }

  // ── Idempotencia: deduplicar por client_message_id ───────────────────────
  // SEC-027: evitar que retries del widget creen mensajes duplicados.
  // client_message_id es opcional; si está presente, se busca en conv_messages.
  // La clave de dedupe es: client_account_id + session_id + client_message_id.
  // Texto idéntico con ID diferente = mensaje legítimo (no se deduplica).
  const idempotencyKey = typeof client_message_id === 'string' && client_message_id.trim()
    ? client_message_id.trim()
    : null;

  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from('conv_messages')
      .select('id, provider_message_id')
      .eq('client_account_id', client_account_id as string)
      .eq('session_id', session_id as string)
      .eq('client_message_id', idempotencyKey)
      .maybeSingle();

    if (existing) {
      log.info('mensaje idempotente — ya procesado', { has_idempotency_key: 'true' });
      const idempotentResponse = ok({
        ok: true,
        message_id: existing.provider_message_id ?? existing.id,
        status: 'received',
        idempotent: true,
      });
      const { headers: corsH } = buildBrowserCorsHeaders(req, { allowedOrigins });
      return addCorsToResponse(idempotentResponse, corsH);
    }
  }

  // ── Paso 1: conv-ingest (normalización y registro del mensaje inbound) ─────
  // Sin integraciones externas directas — solo conv-ingest del canal WebChat.
  // provider_message_id: null para WebChat (no hay ID externo obligatorio).
  let ingestMessageId: string | null = null;
  let ingestSessionId: string = session_id;
  // response_type se declara fuera del try para ser accesible en el Paso 2.
  // 'accepted' → despachar. 'duplicate_ignored' → no despachar (ya procesado).
  let ingestResponseType: string | null = null;

  try {
    const ingestRes = await fetch(`${supabaseUrl}/functions/v1/conv-ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        client_account_id,
        normalized_message: {
          channel: 'webchat',
          sender_ref,
          message_text,
          provider_message_id: null,
          client_message_id: idempotencyKey ?? undefined,
        },
      }),
    });

    const ingestBody = await ingestRes.json() as {
      ok?: boolean;
      data?: { response_type?: string; session_id?: string; message_id?: string };
    };

    if (!ingestRes.ok) {
      log.warn('conv-ingest devolvió error', { status: String(ingestRes.status) });
      return err(ERROR_CODES.INTERNAL, 'Error al procesar el mensaje', 500);
    }

    ingestResponseType = ingestBody?.data?.response_type ?? null;
    ingestMessageId = ingestBody?.data?.message_id ?? null;
    ingestSessionId = ingestBody?.data?.session_id ?? session_id;

    log.info('mensaje WebChat recibido por conv-ingest', { channel: 'webchat', session_id });
  } catch (e: unknown) {
    log.warn('Error al llamar a conv-ingest', {
      err: e instanceof Error ? e.message : String(e),
    });
    return err(ERROR_CODES.INTERNAL, 'Error al procesar el mensaje', 500);
  }

  // ── Paso 2: conv-dispatch-message (Opción A -- dispatch síncrono controlado) ─
  // conv-dispatch-message es el único orquestador que llama routing/WF/outbound.
  // conv-ingest NO equivale a conv-dispatch-message.
  // conv-dispatch-message llama a conv-web-deliver para el canal webchat.
  // Solo se despacha si ingest respondió 'accepted'.
  // duplicate_ignored tiene message_id pero NO requiere nuevo dispatch (ya fue procesado).
  // Si dispatch falla, el mensaje ya está guardado en conv_messages (ingest lo registró).
  // No se expone el resultado de dispatch al widget.
  if (ingestMessageId && ingestResponseType === 'accepted') {
    try {
      await fetch(`${supabaseUrl}/functions/v1/conv-dispatch-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          client_account_id,
          session_id: ingestSessionId,
          message_id: ingestMessageId,
        }),
      });
      // La respuesta de dispatch no se expone al widget
    } catch (dispatchErr: unknown) {
      log.warn('conv-dispatch-message falló (mensaje guardado en conv_messages)', {
        err: dispatchErr instanceof Error ? dispatchErr.message : String(dispatchErr),
      });
    }
  }

  const successResponse = ok({ ok: true, message_id: ingestMessageId, status: 'received' });
  const { headers: corsH } = buildBrowserCorsHeaders(req, { allowedOrigins });
  return addCorsToResponse(successResponse, corsH);
}

serve(handleWebMessageRequest);
