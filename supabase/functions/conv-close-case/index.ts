/**
 * conv-close-case
 *
 * Cierra un caso con el estado final solicitado ('closed' por defecto, 'resolved' también válido).
 *   - Actualiza conv_cases.status = finalStatus
 *   - Elimina el caso de conv_sessions.open_cases_ids
 *   - Si era active_case_id, lo pone a null
 *   - Publica conv_case_closed via conv-core-publish-activity (fire-and-log)
 *
 * Idempotencia:
 *   - Si el caso ya está en el estado solicitado → 200 { idempotent: true } sin modificar datos.
 *   - 'closed' es estado final absoluto: si el caso está 'closed' y se solicita otro estado → 409.
 *
 * Autenticación: service_role only (EF interna).
 * Fuente: contract-case-state-machine §6, rules-75 §4.4
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";

const EF_NAME = 'conv-close-case';

const VALID_RESOLUTION_CHANNELS = new Set(['whatsapp', 'webchat', 'admin_panel']);
const VALID_TARGET_STATUSES: ReadonlySet<string> = new Set(['closed', 'resolved']);

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
    resolution_channel?: string;
    client_account_id?: string;
    case_ref_id?: string;
    target_status?: string;
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON inválido', 400);
  }

  const { session_id, conv_case_id, resolution_channel, client_account_id, case_ref_id, target_status } = body;

  if (!session_id)          return err(ERROR_CODES.VALIDATION, 'session_id es obligatorio', 400);
  if (!conv_case_id)        return err(ERROR_CODES.VALIDATION, 'conv_case_id es obligatorio', 400);
  if (!resolution_channel)  return err(ERROR_CODES.VALIDATION, 'resolution_channel es obligatorio', 400);
  if (!client_account_id)   return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);

  if (!VALID_RESOLUTION_CHANNELS.has(resolution_channel)) {
    return err(ERROR_CODES.VALIDATION, `resolution_channel inválido: ${resolution_channel}`, 400);
  }

  // Determinar el estado final solicitado (default: 'closed')
  const rawTarget = target_status ?? 'closed';
  const finalStatus: string = VALID_TARGET_STATUSES.has(rawTarget) ? rawTarget : 'closed';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Leer estado actual del caso
  const { data: convCase, error: caseError } = await supabase
    .from('conv_cases')
    .select('id, status, case_ref_type')
    .eq('id', conv_case_id)
    .eq('client_account_id', client_account_id)
    .single();

  if (caseError || !convCase) {
    return err(ERROR_CODES.NOT_FOUND, 'Caso no encontrado', 404);
  }

  // Idempotencia: si el caso ya está en el estado solicitado, retornar éxito sin modificar datos
  if (convCase.status === finalStatus) {
    log.info('cierre idempotente — estado ya alcanzado', { conv_case_id, status: finalStatus });
    return ok({
      conv_case_id,
      status: finalStatus === 'closed' ? 'already_closed' : 'already_resolved',
      idempotent: true,
    });
  }

  // 'closed' es estado final absoluto — no puede transicionar a ningún otro estado
  if (convCase.status === 'closed') {
    return err(ERROR_CODES.CONFLICT, 'El caso ya está cerrado y no puede cambiar de estado', 409);
  }

  // Cerrar el caso al estado final solicitado
  const { error: updateCaseError } = await supabase
    .from('conv_cases')
    .update({ status: finalStatus, updated_at: new Date().toISOString() })
    .eq('id', conv_case_id)
    .eq('client_account_id', client_account_id);

  if (updateCaseError) {
    log.error('Error al cerrar conv_cases', { conv_case_id, err: updateCaseError.message });
    return err(ERROR_CODES.INTERNAL, 'Error al cerrar el caso', 500);
  }

  // Actualizar conv_sessions: quitar de open_cases_ids y limpiar active_case_id si aplica
  const { data: session } = await supabase
    .from('conv_sessions')
    .select('open_cases_ids, active_case_id')
    .eq('id', session_id)
    .eq('client_account_id', client_account_id)
    .single();

  if (session) {
    const newOpenCases = (session.open_cases_ids as string[] ?? []).filter(
      (id: string) => id !== conv_case_id
    );
    const sessionUpdates: Record<string, unknown> = {
      open_cases_ids: newOpenCases,
      updated_at: new Date().toISOString(),
    };
    if (session.active_case_id === conv_case_id) {
      sessionUpdates['active_case_id'] = null;
    }

    const { error: updateSessionError } = await supabase
      .from('conv_sessions')
      .update(sessionUpdates)
      .eq('id', session_id)
      .eq('client_account_id', client_account_id);

    if (updateSessionError) {
      log.warn('Error al actualizar conv_sessions (no crítico)', {
        session_id,
        err: updateSessionError.message,
      });
    }
  }

  // Publicar actividad (fire-and-log: nunca bloquea el cierre ya ejecutado)
  const activityData: Record<string, unknown> = {
    conv_case_id,
    case_ref_type: convCase.case_ref_type,
    resolution_channel,
  };
  if (case_ref_id) {
    activityData['case_ref_id'] = case_ref_id;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  fetch(`${supabaseUrl}/functions/v1/conv-core-publish-activity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      event_type: 'conv_case_closed',
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

  log.info('caso cerrado', { conv_case_id, session_id, resolution_channel, status: finalStatus });

  return ok({ conv_case_id, session_id, status: finalStatus, resolution_channel });
});
