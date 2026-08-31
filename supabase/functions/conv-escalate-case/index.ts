/**
 * conv-escalate-case
 *
 * Escala un caso activo a estado 'escalated' y actualiza la sesión a 'ESCALATED'.
 * Publica el evento conv_case_escalated via conv-core-publish-activity (fire-and-log).
 *
 * Restricciones:
 *   - El caso no puede estar en estado 'closed' (estado final absoluto).
 *   - El caso no puede estar ya en estado 'escalated'.
 *   - El payload del evento de actividad NO debe contener PII.
 *
 * Autenticación: service_role only (EF interna).
 * Fuente: contract-case-state-machine §6, rules-75 §4.4
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";

const EF_NAME = 'conv-escalate-case';

// Valores oficiales según rules-75 §4.4 payload de conv_case_escalated
const VALID_ESCALATION_REASONS = new Set([
  'identity_failed',
  'no_kb_match',
  'admin_requested',
]);

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
    session_id?: string;
    conv_case_id?: string;
    reason?: string;
    client_account_id?: string;
    channel?: string;
    service_code?: string;
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON inválido', 400);
  }

  const { session_id, conv_case_id, reason, client_account_id, channel, service_code } = body;

  if (!session_id)        return err(ERROR_CODES.VALIDATION, 'session_id es obligatorio', 400);
  if (!conv_case_id)      return err(ERROR_CODES.VALIDATION, 'conv_case_id es obligatorio', 400);
  if (!reason)            return err(ERROR_CODES.VALIDATION, 'reason es obligatorio', 400);
  if (!client_account_id) return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);

  if (!VALID_ESCALATION_REASONS.has(reason)) {
    return err(ERROR_CODES.VALIDATION, `reason inválido: ${reason}`, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Leer estado actual del caso
  const { data: convCase, error: caseError } = await supabase
    .from('conv_cases')
    .select('id, status, service_code, case_ref_type')
    .eq('id', conv_case_id)
    .eq('client_account_id', client_account_id)
    .single();

  if (caseError || !convCase) {
    return err(ERROR_CODES.NOT_FOUND, 'Caso no encontrado', 404);
  }

  // 'closed' es estado final absoluto: nunca se puede cambiar
  if (convCase.status === 'closed') {
    return err(ERROR_CODES.CONFLICT, 'El caso está cerrado y no puede escalarse', 409);
  }

  // Idempotencia: si ya está escalado, devolver éxito sin duplicar operaciones
  if (convCase.status === 'escalated') {
    log.info('caso ya escalado — respuesta idempotente', { conv_case_id, session_id });
    return ok({ conv_case_id, session_id, status: 'escalated', reason, idempotent: true });
  }

  // Actualizar conv_cases
  const { error: updateCaseError } = await supabase
    .from('conv_cases')
    .update({ status: 'escalated', updated_at: new Date().toISOString() })
    .eq('id', conv_case_id)
    .eq('client_account_id', client_account_id);

  if (updateCaseError) {
    log.error('Error al actualizar conv_cases', { conv_case_id, err: updateCaseError.message });
    return err(ERROR_CODES.INTERNAL, 'Error al actualizar el caso', 500);
  }

  // Actualizar conv_sessions (no bloquea si falla)
  const { error: updateSessionError } = await supabase
    .from('conv_sessions')
    .update({ state: 'ESCALATED', updated_at: new Date().toISOString() })
    .eq('id', session_id)
    .eq('client_account_id', client_account_id);

  if (updateSessionError) {
    log.warn('Error al actualizar conv_sessions (no crítico)', {
      session_id,
      err: updateSessionError.message,
    });
  }

  // Crear notificación admin (sin PII — solo IDs opacos y enums)
  // event_type: 'case_auto_escalated' (rules-90 §4.8)
  const notificationContext: Record<string, string> = {
    conv_case_id,
    reason,
  };
  if (service_code ?? convCase.service_code) {
    notificationContext['service_code'] = service_code ?? convCase.service_code;
  }
  if (channel) {
    notificationContext['channel'] = channel;
  }

  const { error: notificationError } = await supabase
    .from('conv_admin_notifications')
    .insert({
      client_account_id,
      event_type: 'case_auto_escalated',
      severity: 'high',
      context: notificationContext,
      is_read: false,
      resolved_at: null,
    });

  if (notificationError) {
    log.warn('Error al crear conv_admin_notifications (no crítico)', {
      conv_case_id,
      err: notificationError.message,
    });
  }

  // Publicar actividad (fire-and-log: no bloquea el resultado)
  const activityData = {
    conv_case_id,
    channel: channel ?? 'unknown',
    service_code: service_code ?? convCase.service_code,
    reason,
  };

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  fetch(`${supabaseUrl}/functions/v1/conv-core-publish-activity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      event_type: 'conv_case_escalated',
      source: 'smartconversations',
      client_account_id,
      timestamp: new Date().toISOString(),
      data: activityData,
    }),
  }).catch((e: unknown) => {
    log.error('publish-activity fire-and-log failed', {
      err: e instanceof Error ? e.message : String(e),
    });
  });

  log.info('caso escalado', { conv_case_id, session_id, reason });

  return ok({ conv_case_id, session_id, status: 'escalated', reason });
});
