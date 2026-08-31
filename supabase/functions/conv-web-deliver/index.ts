/**
 * conv-web-deliver
 *
 * Entrega de mensaje outbound al canal WebChat.
 * Implementa el principio: persistencia primero, Realtime despues (best-effort).
 *
 * Responsabilidades (en orden estricto):
 *   1. Requerir service_role.
 *   2. Validar client_account_id, session_id y text.
 *   3. Cargar conv_sessions y verificar canal=webchat.
 *   4. Insertar el mensaje outbound en conv_messages (persistencia garantizada).
 *   5. Confirmar persistencia.
 *   6. Intentar publicar notificacion Realtime (best-effort).
 *   7. Si Realtime falla: NO rollback. Log warning sanitizado. Devolver exito.
 *   8. El widget recupera el mensaje via polling si Realtime no llega.
 *
 * Principios:
 *   - Persistencia primero. Nunca publicar antes de persistir.
 *   - Fallo Realtime no hace rollback del mensaje persistido.
 *   - No crear nuevo mensaje si falla la notificacion.
 *   - No publicar message_text en la notificacion Realtime.
 *   - No publicar PII en la notificacion Realtime.
 *   - Reintentar notificacion no duplica conv_messages.
 *
 * No devuelve: profile_id, identity_data, service_role, sender_ref, phone.
 * Exclusivo canal WebChat. No orquesta canales externos.
 * No publica Activity Log directamente.
 * No expone error tecnico al widget.
 * Fuente: rules-31, rules-80 §4.7, SmartConversations Fase 10F.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import {
  publishWebchatRealtimeNotification,
  buildWebchatRealtimeChannel,
  buildWebchatRealtimeNotification,
} from "../_shared/smart-conversations/runtime/webchat-realtime-client.ts";

const EF_NAME = 'conv-web-deliver';

export async function handleWebDeliverRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') {
    return err(ERROR_CODES.INVALID_ACTION, 'Solo se acepta POST', 405);
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!(await isServiceRoleRequest(req, serviceRoleKey))) {
    return err(ERROR_CODES.UNAUTHORIZED, 'Se requiere service_role key', 401);
  }

  const log = createSafeLogger(EF_NAME);
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  let body: {
    client_account_id?: unknown;
    session_id?: unknown;
    text?: unknown;
    case_id?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON invalido', 400);
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

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Cargar sesion WebChat ──────────────────────────────────────────────────

  const { data: session, error: sessionErr } = await supabase
    .from('conv_sessions')
    .select('id, channel')
    .eq('id', session_id)
    .eq('client_account_id', client_account_id)
    .maybeSingle();

  if (sessionErr || !session) {
    return err(ERROR_CODES.NOT_FOUND, 'Sesión no encontrada', 404);
  }

  if (session.channel !== 'webchat') {
    return err(ERROR_CODES.VALIDATION, 'La sesión no es de canal webchat', 400);
  }

  // ── Paso 4: Insertar mensaje outbound (persistencia garantizada) ──────────
  // El mensaje debe persistirse ANTES de intentar cualquier notificacion Realtime.
  // Si la insercion falla, no se notifica y se devuelve error.

  const messageInsert: Record<string, unknown> = {
    client_account_id,
    session_id,
    channel: 'webchat',
    sender_type: 'bot',
    direction: 'outbound',
    text,
    status: 'sent',
  };
  if (case_id && typeof case_id === 'string') {
    messageInsert['case_id'] = case_id;
  }

  const { data: newMessage, error: msgErr } = await supabase
    .from('conv_messages')
    .insert(messageInsert)
    .select('id, created_at')
    .single();

  if (msgErr || !newMessage) {
    log.error('Error al insertar conv_messages outbound WebChat', {
      err: msgErr?.message ?? 'sin datos',
    });
    return err(ERROR_CODES.INTERNAL, 'Error al registrar el mensaje saliente', 500);
  }

  const messageId:    string = newMessage.id;
  const messageCreatedAt: string = newMessage.created_at ?? new Date().toISOString();

  log.info('mensaje WebChat outbound persistido', {
    message_id: messageId,
    channel:    'webchat',
  });

  // ── Paso 5-7: Notificacion Realtime best-effort ───────────────────────────
  // Solo contiene campos tecnicos (no PII, no message_text).
  // Si falla: NO rollback, NO cambiar status del mensaje, NO crear otro mensaje.
  // El widget puede recuperar el mensaje via conv-web-poll.

  let realtime_notified = false;

  try {
    const notification = buildWebchatRealtimeNotification(
      client_account_id, session_id, messageId, messageCreatedAt,
    );

    // Canal de suscripcion (no debe contener PII)
    const channel = buildWebchatRealtimeChannel(session_id);
    void channel; // canal usado internamente por el proveedor

    const result = await publishWebchatRealtimeNotification(
      notification,
      supabaseUrl,
      serviceRoleKey,
    );

    realtime_notified = result.published;

    if (!result.published) {
      log.warn('Realtime no disponible — recuperacion via polling', {});
    }
  } catch {
    // Fallo de Realtime no impide la respuesta exitosa
    log.warn('Error inesperado en notificacion Realtime — mensaje persistido', {});
  }

  // Respuesta exitosa independientemente del resultado Realtime.
  // No exponer message_text, sender_ref, profile_id ni datos sensibles.
  return ok({
    message_id:        messageId,
    session_id,
    channel:           'webchat',
    status:            'sent',
    realtime_notified,
  });
}

serve(handleWebDeliverRequest);
