/**
 * conv-wf20-incidents — Flujo WF-20 de gestión de incidencias.
 *
 * Responsabilidades:
 *   1. Requerir service_role.
 *   2. Validar input (client_account_id, session_id, message_id, channel, service_code).
 *   3. Cargar conv_sessions — identity_level, identity_attempts, active_case_id.
 *   4. Extraer datos de incidencia del mensaje (adapter mock — sin IA real).
 *   5. Ramas por identity_level:
 *      - STRONG_MATCH_ACTIVE: si completo → crear incidencia oficial via conv-core-create-incident.
 *      - PARTIAL_MATCH_ACTIVE: crear pre-incidencia en conv_cases (status='open').
 *      - MATCH_INACTIVE: escalar directamente.
 *      - NO_MATCH: si quedan intentos → identity_required; si agotados → escalar.
 *   6. Activity Log (fire-and-log — fallo no bloquea).
 *
 * Privacidad: message_text, sender_ref, profile_id, identity_data son sensibles — no loguear.
 * No conectar n8n real. No conectar Claude real. No conectar Core real. No conectar Wasender.
 * Fuente: rules-75, rules-50, SmartConversations WF-20.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { defaultIncidentExtractor } from "../_shared/smart-conversations/runtime/incident-extractor.ts";

const EF_NAME           = 'conv-wf20-incidents';
const SERVICE_CODE      = 'conv_incidencias';
const MAX_IDENTITY_ATTEMPTS = 3;

// Niveles de identidad
const LEVEL_STRONG  = 'STRONG_MATCH_ACTIVE';
const LEVEL_PARTIAL = 'PARTIAL_MATCH_ACTIVE';
const LEVEL_INACTIVE = 'MATCH_INACTIVE';
const LEVEL_NO_MATCH = 'NO_MATCH';

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
    session_id?:        unknown;
    message_id?:        unknown;
    channel?:           unknown;
    message_text?:      unknown;
    service_code?:      unknown;
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON inválido', 400);
  }

  const { client_account_id, session_id, message_id, channel, message_text, service_code } = body;

  if (!client_account_id || typeof client_account_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);
  }
  if (!session_id || typeof session_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'session_id es obligatorio', 400);
  }
  if (!message_id || typeof message_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'message_id es obligatorio', 400);
  }
  if (!channel || typeof channel !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'channel es obligatorio', 400);
  }
  if (!message_text || typeof message_text !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'message_text es obligatorio', 400);
  }
  if (service_code !== SERVICE_CODE) {
    return err(ERROR_CODES.VALIDATION, `service_code debe ser ${SERVICE_CODE}`, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Cargar sesión ──────────────────────────────────────────────────────────
  const { data: session, error: sessionErr } = await supabase
    .from('conv_sessions')
    .select('id, identity_level, identity_attempts, active_case_id, profile_id, identity_data')
    .eq('id', session_id)
    .eq('client_account_id', client_account_id)
    .maybeSingle();

  if (sessionErr || !session) {
    return err(ERROR_CODES.NOT_FOUND, 'Sesión no encontrada', 404);
  }

  const identityLevel:    string = session.identity_level ?? LEVEL_NO_MATCH;
  const identityAttempts: number = (session.identity_attempts as number) ?? 0;

  // ── Extracción de datos de incidencia (sin IA real, sin fetch, sin log de message_text) ──
  const extraction = defaultIncidentExtractor.extract(message_text);

  // ── Rama PARTIAL_MATCH_ACTIVE ──────────────────────────────────────────────
  // No llamar a conv-core-create-incident. Crear pre-incidencia con status='open'.
  if (identityLevel === LEVEL_PARTIAL) {
    const { data: newCase, error: caseErr } = await supabase
      .from('conv_cases')
      .insert({
        client_account_id,
        session_id,
        status:        'open',
        case_ref_type: 'incident',
        service_code:  SERVICE_CODE,
      })
      .select('id')
      .single();

    if (caseErr || !newCase) {
      log.warn('Error al crear pre-incidencia', { session_id });
      return err(ERROR_CODES.INTERNAL, 'Error al registrar consulta', 500);
    }

    const convCaseId = newCase.id;

    // Publicar conv_pre_incident_created (fire-and-log — fallo no bloquea)
    fetch(`${supabaseUrl}/functions/v1/conv-core-publish-activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({
        event_type: 'conv_pre_incident_created',
        source:     'smartconversations',
        client_account_id,
        timestamp:  new Date().toISOString(),
        // Payload sin PII: solo IDs opacos, enums
        data: {
          conv_case_id:  convCaseId,
          channel,
          incident_type: extraction.incident_type,
          urgency:       extraction.urgency,
        },
      }),
    }).catch((e: unknown) => {
      log.warn('publish conv_pre_incident_created falló (no bloquea)', {
        err: e instanceof Error ? e.message : String(e),
      });
    });

    log.info('pre-incidencia creada', { conv_case_id: convCaseId, identity_level: LEVEL_PARTIAL });

    return ok({
      response_type: 'pending_input',
      session_id,
      conv_case_id:  convCaseId,
      next_state:    'waiting_user',
      text:          'He registrado tu consulta. Para formalizar la incidencia necesito verificar tu identidad completa.',
    });
  }

  // ── Rama MATCH_INACTIVE ────────────────────────────────────────────────────
  // No crear incidencia oficial. Escalar directamente.
  if (identityLevel === LEVEL_INACTIVE) {
    // Crear notificación admin sin PII (patrón existente)
    await supabase
      .from('conv_admin_notifications')
      .insert({
        client_account_id,
        notification_type: 'escalation_required',
        severity:          'medium',
        context: {
          session_id,
          reason:  'identity_failed',
          channel,
        },
        is_read: false,
      });

    // Si hay caso activo, llamar a conv-escalate-case (fire-and-log)
    const activeCaseId = session.active_case_id as string | null;
    if (activeCaseId) {
      fetch(`${supabaseUrl}/functions/v1/conv-escalate-case`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({ client_account_id, conv_case_id: activeCaseId, reason: 'identity_failed' }),
      }).catch((e: unknown) => {
        log.warn('conv-escalate-case falló (no bloquea)', {
          err: e instanceof Error ? e.message : String(e),
        });
      });
    }

    log.info('MATCH_INACTIVE — escalado directo', { session_id });

    return ok({
      response_type:     'escalated',
      session_id,
      escalation_reason: 'identity_failed',
    });
  }

  // ── Rama NO_MATCH ──────────────────────────────────────────────────────────
  // Si quedan intentos → identity_required (no escalar inmediatamente).
  // Si intentos >= MAX_IDENTITY_ATTEMPTS → escalar.
  if (identityLevel === LEVEL_NO_MATCH) {
    if (identityAttempts < MAX_IDENTITY_ATTEMPTS) {
      log.info('NO_MATCH — redirigir a identidad progresiva', {
        session_id,
        identity_attempts: String(identityAttempts),
      });
      return ok({
        response_type: 'identity_required',
        session_id,
        next_step:     'conv-identity-progressive',
      });
    }

    // Intentos agotados — escalar
    const activeCaseId = session.active_case_id as string | null;
    if (activeCaseId) {
      fetch(`${supabaseUrl}/functions/v1/conv-escalate-case`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({ client_account_id, conv_case_id: activeCaseId, reason: 'identity_failed' }),
      }).catch((e: unknown) => {
        log.warn('conv-escalate-case NO_MATCH agotado (no bloquea)', {
          err: e instanceof Error ? e.message : String(e),
        });
      });
    }

    log.warn('NO_MATCH con intentos agotados — escalado', { session_id });

    return ok({
      response_type:     'escalated',
      session_id,
      escalation_reason: 'identity_failed',
    });
  }

  // ── Rama STRONG_MATCH_ACTIVE ───────────────────────────────────────────────
  // Solo STRONG llega aquí. Intentar crear incidencia oficial.
  // Datos incompletos → pending_input. Datos completos → incidencia oficial.

  if (!extraction.is_complete) {
    // Crear o actualizar conv_cases con status='waiting_user'
    const { data: pendingCase, error: pendingErr } = await supabase
      .from('conv_cases')
      .insert({
        client_account_id,
        session_id,
        status:        'waiting_user',
        case_ref_type: 'incident',
        service_code:  SERVICE_CODE,
      })
      .select('id')
      .single();

    if (pendingErr || !pendingCase) {
      log.warn('Error al crear caso pendiente', { session_id });
      return err(ERROR_CODES.INTERNAL, 'Error al registrar incidencia pendiente', 500);
    }

    log.info('datos incompletos — esperando input del usuario', {
      session_id,
      conv_case_id: pendingCase.id,
    });

    return ok({
      response_type:   'pending_input',
      needs_more_input: true,
      next_state:      'waiting_user',
      missing_fields:  extraction.missing_fields ?? [],
    });
  }

  // Datos completos — crear caso y llamar a conv-core-create-incident

  const { data: officialCase, error: officialCaseErr } = await supabase
    .from('conv_cases')
    .insert({
      client_account_id,
      session_id,
      status:        'open',
      case_ref_type: 'incident',
      service_code:  SERVICE_CODE,
    })
    .select('id')
    .single();

  if (officialCaseErr || !officialCase) {
    log.warn('Error al crear caso oficial', { session_id });
    return err(ERROR_CODES.INTERNAL, 'Error al preparar caso de incidencia', 500);
  }

  const convCaseId = officialCase.id;

  // Llamar a conv-core-create-incident (backoff gestionado dentro de esa EF)
  let incidentRef: string | null = null;
  let incidentId:  string | null = null;

  try {
    const coreRes = await fetch(`${supabaseUrl}/functions/v1/conv-core-create-incident`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({
        client_account_id,
        session_id,
        conv_case_id:  convCaseId,
        incident_type: extraction.incident_type,
        urgency:       extraction.urgency,
        description:   extraction.description,
        source:        channel,
      }),
    });

    if (coreRes.ok) {
      const coreData = await coreRes.json() as {
        data?: { incident_id?: string; incident_ref?: string };
      };
      incidentRef = coreData?.data?.incident_ref ?? null;
      incidentId  = coreData?.data?.incident_id  ?? null;
    }
  } catch (e: unknown) {
    log.warn('Error al llamar conv-core-create-incident (no crítico)', {
      err: e instanceof Error ? e.message : String(e),
    });
  }

  if (!incidentRef || !incidentId) {
    // Core no disponible — dejar caso en waiting_internal, notificar admin
    await supabase
      .from('conv_cases')
      .update({ status: 'waiting_internal' })
      .eq('id', convCaseId);

    await supabase
      .from('conv_admin_notifications')
      .insert({
        client_account_id,
        notification_type: 'incident_creation_failed',
        severity:          'high',
        context: {
          conv_case_id: convCaseId,
          session_id,
          reason:       'core_unavailable',
        },
        is_read: false,
      });

    log.warn('Core mock no disponible — incidencia en espera', { conv_case_id: convCaseId });

    return ok({
      response_type: 'pending_input',
      session_id,
      conv_case_id:  convCaseId,
      next_state:    'waiting_internal',
      text:          'Tu solicitud ha sido registrada. Nuestro equipo la procesará en breve.',
    });
  }

  // Éxito — actualizar caso: status='waiting_internal', case_ref=incident_ref
  await supabase
    .from('conv_cases')
    .update({
      status:   'waiting_internal',
      case_ref: incidentRef,
    })
    .eq('id', convCaseId);

  // Publicar conv_incident_created (fire-and-log — fallo no bloquea)
  // Payload sin PII: solo IDs opacos, enums, incident_ref
  // NO incluir: session_id, profile_id, phone_number, full_name, room_label,
  //             assignment_id, message_text, description
  fetch(`${supabaseUrl}/functions/v1/conv-core-publish-activity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
    body: JSON.stringify({
      event_type: 'conv_incident_created',
      source:     'smartconversations',
      client_account_id,
      timestamp:  new Date().toISOString(),
      data: {
        incident_id:   incidentId,
        incident_ref:  incidentRef,
        conv_case_id:  convCaseId,
        channel,
        incident_type: extraction.incident_type,
        urgency:       extraction.urgency,
      },
    }),
  }).catch((e: unknown) => {
    log.warn('publish conv_incident_created falló (no bloquea)', {
      err: e instanceof Error ? e.message : String(e),
    });
  });

  log.info('incidencia oficial creada', {
    conv_case_id:  convCaseId,
    incident_ref:  incidentRef,
    incident_type: extraction.incident_type,
  });

  // El valor de incidentRef ya está disponible y se inserta directamente en el texto
  const confirmationText = `Tu incidencia ${incidentRef} ha sido registrada. Nos pondremos en contacto contigo pronto.`;

  return ok({
    response_type: 'success',
    session_id,
    conv_case_id:  convCaseId,
    case_ref:      incidentRef,
    next_state:    'waiting_internal',
    text:          confirmationText,
  });
});
