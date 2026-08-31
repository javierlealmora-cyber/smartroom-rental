/**
 * conv-routing-engine — Motor de routing WF-10.
 *
 * Responsabilidades:
 *   1. Requerir service_role.
 *   2. Validar input: client_account_id, session_id, message_id, channel, message_text.
 *   3. Cargar conv_sessions.
 *   4. Consultar servicios activos via conv-core-get-tenant-features (sin caché).
 *   5. Sin servicios activos → no_service.
 *   6. Si exactamente 1 servicio activo → enrutar directo.
 *   7. Si varios servicios → clasificar intención (mock, sin LLM externo).
 *   8. Umbral de confianza oficial: 0.85.
 *   9. service_code inactivo devuelto por el clasificador → confidence = 0.
 *  10. confidence < umbral con varios servicios → menú dinámico.
 *  11. Si active_case_id y servicio detectado distinto → context_switch_confirmation.
 *  12. No cambiar active_service_code sin confirmación si hay active_case_id.
 *  13. No cerrar casos. No modificar open_cases_ids.
 *  14. Construir servicePayload limpio para servicio futuro.
 *  15. No invocar servicios de negocio en esta fase.
 *
 * Privacidad: no loguear message_text, sender_ref ni tokens.
 * Fuente: rules-50, rules-80 §4.7
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { defaultClassifier } from "../_shared/smart-conversations/runtime/intent-classifier.ts";

const EF_NAME = 'conv-routing-engine';
const CONFIDENCE_THRESHOLD = 0.85;
const NO_SERVICE_TEXT = 'Este canal no tiene servicios activos actualmente.';
const VALID_CHANNELS = new Set(['whatsapp', 'webchat']);

const SERVICE_LABELS: Record<string, string> = {
  conv_incidencias: 'Incidencias',
  conv_publicaciones: 'Publicaciones',
  conv_ayuda: 'Ayuda',
};

/**
 * Construye el payload que se pasará al servicio de destino.
 * Solo campos permitidos — nunca datos de identidad sensible.
 */
function buildServicePayload(
  sessionId: string,
  clientAccountId: string,
  messageText: string,
  chan: string,
  identityLevel: string,
  serviceCode: string,
): Record<string, unknown> {
  return {
    session_id: sessionId,
    client_account_id: clientAccountId,
    message_text: messageText,
    channel: chan,
    identity_level: identityLevel,
    service_code: serviceCode,
  };
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

  let body: {
    client_account_id?: unknown;
    session_id?: unknown;
    message_id?: unknown;
    channel?: unknown;
    message_text?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON inválido', 400);
  }

  const { client_account_id, session_id, message_id, channel, message_text } = body;

  if (!client_account_id || typeof client_account_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);
  }
  if (!session_id || typeof session_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'session_id es obligatorio', 400);
  }
  if (!message_id || typeof message_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'message_id es obligatorio', 400);
  }
  if (!channel || typeof channel !== 'string' || !VALID_CHANNELS.has(channel)) {
    return err(ERROR_CODES.VALIDATION, 'channel inválido', 400);
  }
  if (!message_text || typeof message_text !== 'string' || message_text.trim() === '') {
    return err(ERROR_CODES.VALIDATION, 'message_text es obligatorio', 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Cargar sesión ──────────────────────────────────────────────────────────

  const { data: session, error: sessionErr } = await supabase
    .from('conv_sessions')
    .select('id, channel, identity_level, state, active_case_id, open_cases_ids, active_service_code')
    .eq('id', session_id)
    .eq('client_account_id', client_account_id)
    .maybeSingle();

  if (sessionErr || !session) {
    return err(ERROR_CODES.NOT_FOUND, 'Sesión no encontrada', 404);
  }

  // ── Consultar servicios activos (sin caché) ────────────────────────────────

  let services_active: string[] = [];

  try {
    const featRes = await fetch(`${supabaseUrl}/functions/v1/conv-core-get-tenant-features`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ client_account_id }),
    });
    if (featRes.ok) {
      const featData = await featRes.json() as { data?: { services_active?: unknown[] } };
      if (Array.isArray(featData?.data?.services_active)) {
        services_active = featData.data.services_active.map(String);
      }
    }
  } catch (e: unknown) {
    log.warn('Error al obtener servicios activos', {
      err: e instanceof Error ? e.message : String(e),
    });
  }

  // ── Sin servicios activos ──────────────────────────────────────────────────

  if (services_active.length === 0) {
    return ok({ response_type: 'no_service', session_id, text: NO_SERVICE_TEXT });
  }

  // ── Determinar servicio destino ────────────────────────────────────────────

  let targetServiceCode: string;
  let effectiveConfidence: number;

  if (services_active.length === 1) {
    // Único servicio activo: enrutar directo sin clasificar
    targetServiceCode = services_active[0];
    effectiveConfidence = 1.0;
  } else {
    // Múltiples servicios: clasificar intención (mock — sin Claude real)
    const classResult = await defaultClassifier.classify({
      message_text,
      services_active,
      channel: channel as 'whatsapp' | 'webchat',
    });

    // service_code no activo → tratar como confidence = 0
    if (!services_active.includes(classResult.service_code as string)) {
      effectiveConfidence = 0.0;
      targetServiceCode = '';
    } else {
      effectiveConfidence = classResult.confidence;
      targetServiceCode = classResult.service_code as string;
    }

    if (effectiveConfidence < CONFIDENCE_THRESHOLD) {
      // Menú dinámico: solo servicios activos
      const menuOptions: Array<{ service_code: string; label: string }> = services_active.map(code => ({
        service_code: code,
        label: SERVICE_LABELS[code] ?? code,
      }));

      // Si hay casos abiertos, incluir opción de volver
      const openCases: unknown[] = Array.isArray(session.open_cases_ids) ? session.open_cases_ids : [];
      if (openCases.length > 0) {
        menuOptions.push({ service_code: 'resume_case', label: 'Volver al caso pendiente' });
      }

      log.info('menú dinámico generado', {
        session_id,
        channel,
        options_count: String(menuOptions.length),
      });

      return ok({ response_type: 'menu', session_id, options: menuOptions });
    }
  }

  // ── Routing directo ────────────────────────────────────────────────────────

  const hasActiveCase = Boolean(session.active_case_id);
  const currentService: string = session.active_service_code ?? '';

  // Cambio de contexto: hay caso activo y el servicio detectado es distinto
  if (hasActiveCase && currentService && currentService !== targetServiceCode) {
    return ok({
      response_type: 'context_switch_confirmation',
      session_id,
      current_service_code: currentService,
      proposed_service_code: targetServiceCode,
      requires_confirmation: true,
    });
  }

  // Actualizar active_service_code solo si no hay caso activo pendiente
  if (!session.active_case_id) {
    await supabase
      .from('conv_sessions')
      .update({
        active_service_code: targetServiceCode,
        last_active_at: new Date().toISOString(),
      })
      .eq('id', session_id);
  }

  // Construir payload limpio para el servicio futuro
  const servicePayload = buildServicePayload(
    session_id,
    client_account_id,
    message_text,
    channel,
    session.identity_level ?? 'NO_MATCH',
    targetServiceCode,
  );

  log.info('routing directo', {
    session_id,
    service_code: targetServiceCode,
    channel,
    confidence: String(effectiveConfidence),
  });

  return ok({
    response_type: 'routed',
    session_id,
    service_code: targetServiceCode,
    confidence: effectiveConfidence,
    next_step: 'service_stub',
    service_payload: servicePayload,
  });
});
