/**
 * conv-send-wa
 *
 * Envío de mensaje outbound por canal WhatsApp.
 * Usa el adapter mock de Wasender (wasender-client) que en esta fase no llama a la API real.
 *
 * Responsabilidades:
 *   1. Requerir service_role.
 *   2. Validar input (client_account_id, session_id, text).
 *   3. Cargar conv_sessions y verificar que el canal es whatsapp.
 *   4. Cargar conv_wa_sessions para obtener wasender_session_id.
 *   5. Insertar mensaje outbound en conv_messages (status='processing').
 *   6. Intentar envío mediante wasender-client mock.
 *   7. Si OK: actualizar mensaje a status='sent'.
 *   8. Si falla: crear entrada en conv_send_queue (attempts, max_retries, next_attempt_at).
 *
 * Campos de cola oficiales: attempts, max_retries, next_attempt_at.
 *
 * conv_send_queue.payload solo contiene message_id y channel — sin teléfono ni texto.
 *
 * Privacidad: sender_ref, text y tokens no se loguean.
 * Fuente: rules-90 §4.2, contract-normalized-message §8.4
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { sendWasenderMessage } from "../_shared/smart-conversations/runtime/wasender-client.ts";

const EF_NAME = 'conv-send-wa';

// Backoff para el primer intento de cola (siguiente intento si el inmediato falla)
const INITIAL_QUEUE_DELAY_SECONDS = 1;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') {
    return err(ERROR_CODES.INVALID_ACTION, 'Solo se acepta POST', 405);
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!(await isServiceRoleRequest(req, serviceRoleKey))) {
    return err(ERROR_CODES.UNAUTHORIZED, 'Se requiere service_role key', 401);
  }

  const log = createSafeLogger(EF_NAME);

  let body: {
    client_account_id?: unknown;
    session_id?: unknown;
    text?: unknown;
    case_id?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON inválido', 400);
  }

  const { client_account_id, session_id, text, case_id } = body;

  if (!client_account_id || typeof client_account_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);
  }
  if (!session_id || typeof session_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'session_id es obligatorio', 400);
  }
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return err(ERROR_CODES.VALIDATION, 'text es obligatorio', 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ── Cargar sesión ──────────────────────────────────────────────────────────

  const { data: session, error: sessionErr } = await supabase
    .from('conv_sessions')
    .select('id, channel, sender_ref, client_account_id')
    .eq('id', session_id)
    .eq('client_account_id', client_account_id)
    .maybeSingle();

  if (sessionErr || !session) {
    return err(ERROR_CODES.NOT_FOUND, 'Sesión no encontrada', 404);
  }

  if (session.channel !== 'whatsapp') {
    return err(ERROR_CODES.VALIDATION, 'La sesión no es de canal whatsapp', 400);
  }

  // sender_ref: teléfono normalizado (se pasa al adapter; el JID con sufijo se construye allí)
  const senderRef: string = session.sender_ref;

  // ── Cargar sesión Wasender (wasender_session_id para el adapter) ───────────

  const { data: waSession } = await supabase
    .from('conv_wa_sessions')
    .select('id, wasender_session_id, status')
    .eq('client_account_id', client_account_id)
    .maybeSingle();

  if (!waSession || waSession.status !== 'active') {
    return err(ERROR_CODES.ACCOUNT_INACTIVE, 'Sesión WhatsApp no activa', 409);
  }

  // ── Insertar mensaje outbound en conv_messages ─────────────────────────────

  const messageInsert: Record<string, unknown> = {
    client_account_id,
    session_id,
    channel: 'whatsapp',
    sender_type: 'bot',
    direction: 'outbound',
    text,
    status: 'processing',
  };
  if (case_id && typeof case_id === 'string') {
    messageInsert['case_id'] = case_id;
  }

  const { data: newMessage, error: msgErr } = await supabase
    .from('conv_messages')
    .insert(messageInsert)
    .select('id')
    .single();

  if (msgErr || !newMessage) {
    log.error('Error al insertar conv_messages outbound', { err: msgErr?.message ?? 'sin datos' });
    return err(ERROR_CODES.INTERNAL, 'Error al registrar el mensaje saliente', 500);
  }

  const messageId: string = newMessage.id;

  // ── Intentar envío via adapter mock ───────────────────────────────────────

  let sendResult: Awaited<ReturnType<typeof sendWasenderMessage>>;
  try {
    sendResult = await sendWasenderMessage({
      clientAccountId:   client_account_id,
      wasenderSessionId: waSession.wasender_session_id,
      senderRef,
      text,
    });
  } catch (e: unknown) {
    log.warn('Error inesperado en wasender-client', {
      err: e instanceof Error ? e.message : String(e),
    });
    sendResult = { ok: false, retryable: true };
  }

  if (sendResult.ok) {
    // Envío inmediato exitoso: marcar como sent
    await supabase
      .from('conv_messages')
      .update({ status: 'sent' })
      .eq('id', messageId);

    log.info('mensaje WhatsApp enviado', {
      message_id: messageId,
      session_id,
      channel: 'whatsapp',
    });

    return ok({ message_id: messageId, status: 'sent' });
  }

  // ── Envío fallido: crear entrada en conv_send_queue ────────────────────────

  // payload: solo message_id y channel — sin teléfono, sin texto (ya está en conv_messages)
  const queuePayload = { message_id: messageId, channel: 'whatsapp' };
  const nextAttemptAt = new Date(Date.now() + INITIAL_QUEUE_DELAY_SECONDS * 1000).toISOString();

  const { error: queueErr } = await supabase
    .from('conv_send_queue')
    .insert({
      client_account_id,
      session_id,
      channel: 'whatsapp',
      message_id: messageId,
      payload: queuePayload,
      attempts: 0,
      max_retries: 3,
      next_attempt_at: nextAttemptAt,
      status: 'pending',
    });

  if (queueErr) {
    log.error('Error al insertar en conv_send_queue', { err: queueErr.message });
  } else {
    log.info('mensaje encolado para reintento', {
      message_id: messageId,
      session_id,
      next_attempt_at: nextAttemptAt,
    });
  }

  return ok({ message_id: messageId, status: 'queued' });
});
