/**
 * conv-process-send-queue
 *
 * Procesa la cola de mensajes salientes pendientes (conv_send_queue).
 * Se invoca periódicamente (cron) o tras un fallo de envío inmediato.
 *
 * Responsabilidades:
 *   1. Requerir service_role.
 *   2. Seleccionar entradas status='pending' con next_attempt_at <= now().
 *   3. Marcar como 'processing'.
 *   4. Cargar mensaje y sesión.
 *   5. Intentar entrega via adapter correspondiente al canal.
 *   6. En éxito: queue='succeeded', message='sent'.
 *   7. En fallo retryable y attempts < max_retries:
 *      - attempts++, next_attempt_at según backoff, status='pending'.
 *   8. En fallo definitivo (attempts >= max_retries):
 *      - queue='failed', message='failed'.
 *      - Crear conv_admin_notifications (sin PII).
 *      - Publicar conv_message_delivery_failed (fire-and-log).
 *
 * Backoff oficial (rules-90 §4.2): 1s → 5s → 30s. Máximo 3 intentos.
 * Campos oficiales de cola: attempts, max_retries, next_attempt_at.
 *
 * Privacidad: no se loguean teléfono, texto de mensajes, sender_ref ni tokens.
 * Fuente: rules-90 §4.2, rules-75 §4.2
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { sendWasenderMessage } from "../_shared/smart-conversations/runtime/wasender-client.ts";

const EF_NAME = 'conv-process-send-queue';

// Backoff por intento (rules-90 §4.2): attempt 1 → 1s, attempt 2 → 5s, attempt 3 → 30s
const BACKOFF_SECONDS = [1, 5, 30] as const;

function getBackoffSeconds(attempt: number): number {
  const idx = Math.max(0, Math.min(attempt - 1, BACKOFF_SECONDS.length - 1));
  return BACKOFF_SECONDS[idx];
}

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
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Seleccionar entradas pendientes ───────────────────────────────────────

  const { data: pendingItems, error: selectErr } = await supabase
    .from('conv_send_queue')
    .select('id, session_id, client_account_id, channel, message_id, payload, attempts, max_retries')
    .eq('status', 'pending')
    .lte('next_attempt_at', new Date().toISOString())
    .limit(20);

  if (selectErr) {
    log.error('Error al leer conv_send_queue', { err: selectErr.message });
    return err(ERROR_CODES.INTERNAL, 'Error al leer la cola', 500);
  }

  if (!pendingItems || pendingItems.length === 0) {
    log.info('conv_send_queue: sin entradas pendientes');
    return ok({ processed: 0 });
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const item of pendingItems) {
    const { id: queueId, session_id, client_account_id, channel, message_id, attempts, max_retries } = item;

    // Marcar como 'processing'
    await supabase
      .from('conv_send_queue')
      .update({ status: 'processing' })
      .eq('id', queueId);

    // Cargar mensaje (texto) y sesión (sender_ref)
    const { data: message } = await supabase
      .from('conv_messages')
      .select('id, text, case_id')
      .eq('id', message_id)
      .maybeSingle();

    const { data: session } = await supabase
      .from('conv_sessions')
      .select('id, sender_ref, channel')
      .eq('id', session_id)
      .maybeSingle();

    if (!message || !session) {
      log.warn('entrada de cola sin mensaje o sesión — marcando failed', { queue_id: queueId });
      await supabase
        .from('conv_send_queue')
        .update({ status: 'failed', last_error: 'mensaje_o_sesion_no_encontrado' })
        .eq('id', queueId);
      failed++;
      continue;
    }

    // ── Intentar entrega según canal ───────────────────────────────────────

    let sendOk = false;
    let isRetryable = true;

    if (channel === 'whatsapp') {
      const { data: waSession } = await supabase
        .from('conv_wa_sessions')
        .select('wasender_session_id, status')
        .eq('client_account_id', client_account_id)
        .maybeSingle();

      if (!waSession || waSession.status !== 'active') {
        isRetryable = false;
      } else {
        try {
          const result = await sendWasenderMessage({
            clientAccountId:   client_account_id,
            wasenderSessionId: waSession.wasender_session_id,
            senderRef:         session.sender_ref,
            text:              message.text ?? '',
          });
          sendOk = result.ok;
          isRetryable = result.retryable ?? false;
        } catch {
          sendOk = false;
          isRetryable = true;
        }
      }
    } else if (channel === 'webchat') {
      // WebChat delivery: stub — marca como ok en esta fase
      sendOk = true;
    }

    const newAttempts: number = (attempts ?? 0) + 1;

    if (sendOk) {
      // ── Éxito ─────────────────────────────────────────────────────────────
      await supabase
        .from('conv_send_queue')
        .update({ status: 'succeeded', attempts: newAttempts })
        .eq('id', queueId);

      await supabase
        .from('conv_messages')
        .update({ status: 'sent' })
        .eq('id', message_id);

      log.info('mensaje entregado por cola', {
        queue_id: queueId,
        message_id,
        channel,
        attempts: String(newAttempts),
      });
      succeeded++;

    } else if (isRetryable && newAttempts < (max_retries ?? 3)) {
      // ── Fallo retryable — reintentar ──────────────────────────────────────
      const backoffSecs = getBackoffSeconds(newAttempts);
      const nextAttemptAt = new Date(Date.now() + backoffSecs * 1000).toISOString();

      await supabase
        .from('conv_send_queue')
        .update({
          status: 'pending',
          attempts: newAttempts,
          next_attempt_at: nextAttemptAt,
          last_error: 'delivery_failed_retryable',
        })
        .eq('id', queueId);

      log.info('reintento programado', {
        queue_id: queueId,
        message_id,
        attempts: String(newAttempts),
        next_attempt_at: nextAttemptAt,
      });

    } else {
      // ── Fallo definitivo (attempts >= max_retries o no retryable) ─────────
      await supabase
        .from('conv_send_queue')
        .update({
          status: 'failed',
          attempts: newAttempts,
          last_error: 'max_retries_exhausted',
        })
        .eq('id', queueId);

      await supabase
        .from('conv_messages')
        .update({ status: 'failed' })
        .eq('id', message_id);

      // Notificación admin: solo IDs opacos y enums, sin PII
      await supabase
        .from('conv_admin_notifications')
        .insert({
          client_account_id,
          event_type: 'delivery_failed_batch',
          severity: 'high',
          context: {
            session_id,
            message_id,
            channel,
            reason: 'max_retries_exhausted',
            attempts: newAttempts,
          },
          is_read: false,
          resolved_at: null,
        });

      // Publicar conv_message_delivery_failed via fire-and-log
      // Payload: official ActivityDataMessageDeliveryFailed (contracts.ts)
      fetch(`${supabaseUrl}/functions/v1/conv-core-publish-activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          event_type: 'conv_message_delivery_failed',
          source: 'smartconversations',
          client_account_id,
          timestamp: new Date().toISOString(),
          data: {
            session_id,
            conv_case_id: message.case_id ?? undefined,
            channel,
            attempts: newAttempts,
            reason: 'max_retries_exhausted',
          },
        }),
      }).catch((e: unknown) => {
        log.warn('publish conv_message_delivery_failed falló (no bloquea)', {
          err: e instanceof Error ? e.message : String(e),
        });
      });

      log.warn('fallo definitivo de entrega', {
        queue_id: queueId,
        message_id,
        channel,
        attempts: String(newAttempts),
      });
      failed++;
    }

    processed++;
  }

  log.info('cola procesada', {
    processed: String(processed),
    succeeded: String(succeeded),
    failed: String(failed),
  });

  return ok({ processed, succeeded, failed });
});
