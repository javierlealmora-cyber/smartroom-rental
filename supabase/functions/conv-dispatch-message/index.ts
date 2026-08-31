/**
 * conv-dispatch-message — Orquestador end-to-end mock. WF-10 / Fase 9A.
 *
 * Circuito:
 *   canal inbound → conv-dispatch-message → conv-routing-engine
 *     → WF-20/WF-30/WF-40 → conv-send-wa | conv-web-deliver
 *
 * Responsabilidades:
 *   1. Requerir service_role.
 *   2. Validar input (client_account_id, session_id, message_id).
 *   3. Cargar conv_sessions.
 *   4. Cargar conv_messages — fuente de verdad de message_text y direction.
 *   5. No aceptar message_text externo como fuente de verdad si existe en DB.
 *   6. Validar direction='inbound', channel válido, mensaje pertenece a sesión/tenant.
 *   7. Estrategia idempotencia best-effort: devolver éxito si ya fue despachado.
 *   8. Marcar inbound como processing durante dispatch.
 *   9. Llamar a conv-routing-engine.
 *  10. Interpretar routing: routed → WF-20/30/40; menu/no_service/context_switch → texto seguro.
 *  11. Mapping de respuesta WF a texto outbound seguro.
 *  12. Enviar por canal: whatsapp → conv-send-wa; webchat → conv-web-deliver.
 *  13. No llamar a n8n real, Claude real, Core real, Wasender real.
 *  14. No construir @c.us ni @s.whatsapp.net.
 *  15. No loguear message_text, sender_ref, phone, identity_data ni raw_payload.
 *  16. No exponer errores técnicos al usuario.
 *
 * Idempotencia: best-effort basada SOLO en el status del inbound message_id.
 *   received   → ejecutar dispatch.
 *   processing → ya en curso → devolver already_processing.
 *   sent       → ya completado → éxito idempotente.
 *   failed     → falló previamente → no reintentar salvo force=true.
 *   NUNCA se usa el conteo de outbounds de la sesión (falso positivo en multi-turn).
 *   Mejora de concurrencia: UPDATE condicional solo si status=received.
 *
 * Privacidad: message_text, sender_ref, phone, profile_id, identity_data → nunca loguear.
 * No introduce: WF-02, conv_help_escalated, WEAK_MATCH, UNVERIFIED standalone,
 *               next_retry_at, attempt_count, nuevos estados, nuevos eventos Activity Log.
 * Fuente: rules-50, rules-75, rules-80, SmartConversations Fase 9A.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { getWfEfName } from "../_shared/smart-conversations/runtime/dispatch-service-router.ts";
import {
  mapWfResponseToText,
  buildMenuText,
  buildNoServiceText,
  buildContextSwitchText,
} from "../_shared/smart-conversations/runtime/dispatch-response-mapper.ts";
import { getOutboundEfName } from "../_shared/smart-conversations/runtime/dispatch-outbound-router.ts";
import { evaluateDispatchIdempotency } from "../_shared/smart-conversations/runtime/dispatch-idempotency.ts";

const EF_NAME = 'conv-dispatch-message';
const VALID_CHANNELS = new Set(['whatsapp', 'webchat']);
const SAFE_ERROR_TEXT = 'Ha ocurrido un problema. Por favor, intenta de nuevo en unos minutos.';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') {
    return err(ERROR_CODES.INVALID_ACTION, 'Solo se acepta POST', 405);
  }

  // ── Auth: service_role obligatorio ─────────────────────────────────────────
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!(await isServiceRoleRequest(req, serviceRoleKey))) {
    return err(ERROR_CODES.UNAUTHORIZED, 'Se requiere service_role key', 401);
  }

  const log = createSafeLogger(EF_NAME);
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  let body: {
    client_account_id?: unknown;
    session_id?:        unknown;
    message_id?:        unknown;
    force?:             unknown;
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON inválido', 400);
  }

  // Rechazar campos no permitidos en dispatch
  const rawBody = body as Record<string, unknown>;
  if ('message_text' in rawBody) {
    return err(ERROR_CODES.VALIDATION, 'message_text no está permitido en el payload de dispatch — se lee de conv_messages', 400);
  }
  if ('sender_ref' in rawBody) {
    return err(ERROR_CODES.VALIDATION, 'sender_ref no está permitido en el payload de dispatch', 400);
  }
  if ('identity_data' in rawBody) {
    return err(ERROR_CODES.VALIDATION, 'identity_data no está permitido en el payload de dispatch', 400);
  }

  const { client_account_id, session_id, message_id, force } = body;

  if (!client_account_id || typeof client_account_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);
  }
  if (!session_id || typeof session_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'session_id es obligatorio', 400);
  }
  if (!message_id || typeof message_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'message_id es obligatorio', 400);
  }

  const forceDispatch = force === true;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Cargar sesión ──────────────────────────────────────────────────────────
  const { data: session, error: sessionErr } = await supabase
    .from('conv_sessions')
    .select('id, channel, identity_level, state, active_case_id, active_service_code')
    .eq('id', session_id)
    .eq('client_account_id', client_account_id)
    .maybeSingle();

  if (sessionErr || !session) {
    return err(ERROR_CODES.NOT_FOUND, 'Sesión no encontrada', 404);
  }

  // ── Cargar mensaje inbound ─────────────────────────────────────────────────
  const { data: inboundMsg, error: msgErr } = await supabase
    .from('conv_messages')
    .select('id, session_id, client_account_id, direction, channel, status, message_text')
    .eq('id', message_id)
    .maybeSingle();

  if (msgErr || !inboundMsg) {
    return err(ERROR_CODES.NOT_FOUND, 'Mensaje no encontrado', 404);
  }

  // Validar que el mensaje pertenece a la sesión y al tenant
  if (inboundMsg.session_id !== session_id) {
    return err(ERROR_CODES.VALIDATION, 'El mensaje no pertenece a la sesión indicada', 400);
  }
  if (inboundMsg.client_account_id !== client_account_id) {
    return err(ERROR_CODES.VALIDATION, 'El mensaje no pertenece al tenant indicado', 400);
  }

  // Validar direction='inbound'
  if (inboundMsg.direction !== 'inbound') {
    return err(ERROR_CODES.VALIDATION, 'Solo se pueden despachar mensajes inbound', 400);
  }

  // Validar canal
  const channel: string = session.channel ?? inboundMsg.channel ?? '';
  if (!channel || !VALID_CHANNELS.has(channel)) {
    return err(ERROR_CODES.VALIDATION, 'Canal inválido o no soportado', 400);
  }

  // Validar que hay message_text (fuente de verdad: DB)
  const messageText: string = typeof inboundMsg.message_text === 'string'
    ? inboundMsg.message_text.trim()
    : '';

  if (!messageText) {
    return err(ERROR_CODES.VALIDATION, 'El mensaje no tiene texto para enrutar', 400);
  }

  // ── Idempotencia best-effort por status del inbound ──────────────────────
  // NUNCA se usa outboundCount de la sesión — eso genera falsos positivos
  // en conversaciones multi-turn (mensaje B bloqueado por outbound del mensaje A).
  const inboundStatus = inboundMsg.status ?? 'received';
  const idempDecision = evaluateDispatchIdempotency(inboundStatus);

  if (!forceDispatch && idempDecision.alreadyDispatched) {
    log.info('dispatch idempotente por status', {
      session_id,
      message_id,
      decision: idempDecision.decision,
      reason:   idempDecision.reason ?? 'unknown',
    });
    return ok({
      idempotent: true,
      session_id,
      message_id,
      decision:   idempDecision.decision,
    });
  }

  // ── Marcar inbound como processing — UPDATE condicional ───���───────────────
  // Solo actualiza si status=received. Si otra instancia llegó antes, count=0.
  const { count: updatedRows } = await supabase
    .from('conv_messages')
    .update({ status: 'processing' })
    .eq('id', message_id)
    .eq('direction', 'inbound')
    .eq('status', 'received')
    .select('id', { count: 'exact', head: true });

  // Si no se actualizó ninguna fila (otra instancia ya tomó el mensaje), devolver idempotente
  if (!forceDispatch && (updatedRows === 0 || updatedRows === null)) {
    log.info('dispatch omitido — otra instancia actualizó el status primero', {
      session_id,
      message_id,
    });
    return ok({ idempotent: true, session_id, message_id, decision: 'already_processing' });
  }

  // ── Llamar a conv-routing-engine ───────────────────────────────────────────
  // message_text se pasa internamente al routing — no se loguea
  let routingResult: Record<string, unknown>;

  try {
    const routingRes = await fetch(`${supabaseUrl}/functions/v1/conv-routing-engine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        client_account_id,
        session_id,
        message_id,
        channel,
        message_text: messageText,  // se pasa internamente — no se loguea
      }),
    });

    if (!routingRes.ok) {
      throw new Error(`routing HTTP ${routingRes.status}`);
    }

    const routingJson = await routingRes.json() as { data?: Record<string, unknown> };
    routingResult = routingJson.data ?? {};
  } catch (e: unknown) {
    log.warn('Error al llamar a conv-routing-engine', {
      err: e instanceof Error ? e.message : String(e),
      session_id,
    });

    // Restaurar status a received ante error de routing
    await supabase
      .from('conv_messages')
      .update({ status: 'received' })
      .eq('id', message_id);

    return err(ERROR_CODES.INTERNAL, SAFE_ERROR_TEXT, 500);
  }

  const responseType = String(routingResult.response_type ?? '');

  // ── Interpretar respuesta de routing ──────────────────────────────────────
  let outboundText: string;
  let wfCalled     = false;

  if (responseType === 'routed') {
    const serviceCode = String(routingResult.service_code ?? '');
    const wfEfName    = getWfEfName(serviceCode);

    if (!wfEfName) {
      log.warn('service_code no tiene WF registrado', { service_code: serviceCode, session_id });
      outboundText = SAFE_ERROR_TEXT;
    } else {
      wfCalled = true;

      // Payload hacia el WF — message_text se pasa internamente, nunca se loguea
      const wfPayload = {
        client_account_id,
        session_id,
        message_id,
        channel,
        message_text: messageText,  // interno — no loguear
        service_code:  serviceCode,
      };

      let wfResponseData: Record<string, unknown> = {};

      try {
        const wfRes = await fetch(`${supabaseUrl}/functions/v1/${wfEfName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify(wfPayload),
        });

        const wfJson = await wfRes.json() as { data?: Record<string, unknown> };
        wfResponseData = wfJson.data ?? {};

        if (!wfRes.ok) {
          log.warn('WF devolvió error HTTP', {
            ef:          wfEfName,
            status:      String(wfRes.status),
            session_id,
          });
          // Continuar con fallback text — no exponer error técnico
        }
      } catch (e: unknown) {
        log.warn('Error al llamar al WF', {
          ef:  wfEfName,
          err: e instanceof Error ? e.message : String(e),
          session_id,
        });
        wfResponseData = { response_type: 'error' };
      }

      outboundText = mapWfResponseToText(wfResponseData);
    }

  } else if (responseType === 'menu') {
    const options = Array.isArray(routingResult.options)
      ? routingResult.options as Array<{ service_code: string; label: string }>
      : [];
    outboundText = buildMenuText(options);

  } else if (responseType === 'no_service') {
    outboundText = buildNoServiceText();

  } else if (responseType === 'context_switch_confirmation') {
    // No cambiar active_service_code — solo confirmar al usuario
    outboundText = buildContextSwitchText();

  } else {
    log.warn('response_type de routing desconocido', { response_type: responseType, session_id });
    outboundText = SAFE_ERROR_TEXT;
  }

  // ── Envío outbound por canal ───────────────────────────────────────────────
  // Dispatch no construye @c.us ni @s.whatsapp.net — lo hace conv-send-wa
  const outboundEfName = getOutboundEfName(channel);

  if (!outboundEfName) {
    log.warn('Canal sin EF de outbound registrada', { channel, session_id });
    await supabase
      .from('conv_messages')
      .update({ status: 'failed' })
      .eq('id', message_id);
    return err(ERROR_CODES.INTERNAL, SAFE_ERROR_TEXT, 500);
  }

  let outboundOk = false;
  let outboundMessageId: string | null = null;

  try {
    const outboundRes = await fetch(`${supabaseUrl}/functions/v1/${outboundEfName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      // Solo se envía: client_account_id, session_id, text
      // No se envía: profile_id, identity_data, sender_ref, raw_payload
      body: JSON.stringify({
        client_account_id,
        session_id,
        text: outboundText,
      }),
    });

    const outboundJson = await outboundRes.json() as { data?: { message_id?: string } };
    outboundMessageId = outboundJson?.data?.message_id ?? null;
    outboundOk = outboundRes.ok;

    if (!outboundOk) {
      log.warn('EF outbound devolvió error', {
        ef:     outboundEfName,
        status: String(outboundRes.status),
        session_id,
      });
    }
  } catch (e: unknown) {
    log.warn('Error al llamar a EF outbound', {
      ef:  outboundEfName,
      err: e instanceof Error ? e.message : String(e),
      session_id,
    });
    // Errores de outbound se delegan a conv-send-wa / conv-web-deliver
    // conv-send-wa crea conv_send_queue si falla — dispatch no reintenta
  }

  // ── Actualizar status del inbound ─────────────────────────────────────────
  const finalStatus = outboundOk ? 'sent' : 'failed';

  await supabase
    .from('conv_messages')
    .update({ status: finalStatus })
    .eq('id', message_id)
    .eq('direction', 'inbound');

  log.info('dispatch completado', {
    session_id,
    message_id,
    channel,
    response_type:    responseType,
    wf_called:        String(wfCalled),
    outbound_ef:      outboundEfName,
    outbound_ok:      String(outboundOk),
  });

  return ok({
    session_id,
    message_id,
    response_type:      responseType,
    outbound_message_id: outboundMessageId,
    dispatched:         true,
  });
});
