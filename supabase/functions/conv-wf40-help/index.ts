/**
 * conv-wf40-help — Flujo WF-40 de ayuda / help desk.
 *
 * Responsabilidades:
 *   1. Requerir service_role.
 *   2. Validar input (client_account_id, session_id, message_id, channel, service_code).
 *   3. Cargar conv_sessions — identity_level.
 *   4. Extraer intención de ayuda (adapter mock — sin IA real).
 *   5. Ramas por intent_type:
 *      - unknown: devolver aclaración sin crear caso ni ticket.
 *      - faq: consultar KB mock →
 *          match (confidence >= KB_CONFIDENCE_THRESHOLD) → help_answer sin conv_case.
 *          no match → crear conv_case → escalar (no_kb_match) → fire-and-log conv_case_escalated.
 *      - request_human / complaint: crear conv_case → crear help ticket →
 *          ticket ok → waiting_internal + case_ref=ref → help_ticket_created.
 *          ticket falla → escalar (admin_requested) → fire-and-log conv_case_escalated.
 *      - account_specific:
 *          STRONG_MATCH_ACTIVE / PARTIAL_MATCH_ACTIVE → crear caso/ticket (misma rama request_human).
 *          otros (NO_MATCH, MATCH_INACTIVE, UNVERIFIED_LEAD) → identity_required sin datos contractuales.
 *
 * Activity Log oficial: conv_case_escalated.
 * NO existe conv_help_escalated — nunca publicar ese evento.
 * Sin conv_case para FAQs resueltas.
 * Sin Activity Log para help ticket (no hay evento oficial).
 *
 * Privacidad: message_text, summary, sender_ref, profile_id, identity_data → no loguear.
 * No conectar n8n real. No conectar Claude real. No conectar Core real. No conectar Wasender.
 * Fuente: rules-80, rules-75, SmartConversations WF-40.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { defaultHelpIntentExtractor } from "../_shared/smart-conversations/runtime/help-intent-extractor.ts";
import { findUnsubstitutedMarkers } from "../_shared/smart-conversations/privacy-guards.ts";

const EF_NAME     = 'conv-wf40-help';
const SERVICE_CODE = 'conv_ayuda';

// Umbral de confianza para responder FAQ directamente sin crear caso
const KB_CONFIDENCE_THRESHOLD = 0.80;

// Niveles con identidad suficiente para consultas de cuenta/contrato
const IDENTIFIED_LEVELS = new Set(['STRONG_MATCH_ACTIVE', 'PARTIAL_MATCH_ACTIVE']);

// UNVERIFIED_LEAD no permite acceso a datos contractuales en WF-40
const LEVEL_UNVERIFIED_LEAD = 'UNVERIFIED_LEAD';

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
  if (service_code !== SERVICE_CODE) {
    return err(ERROR_CODES.VALIDATION, `service_code debe ser ${SERVICE_CODE}`, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Cargar sesión ──────────────────────────────────────────────────────────
  const { data: session, error: sessionErr } = await supabase
    .from('conv_sessions')
    .select('id, identity_level, active_case_id')
    .eq('id', session_id)
    .eq('client_account_id', client_account_id)
    .maybeSingle();

  if (sessionErr || !session) {
    return err(ERROR_CODES.NOT_FOUND, 'Sesión no encontrada', 404);
  }

  const identityLevel: string = (session.identity_level as string) ?? 'NO_MATCH';

  // ── Extracción de intención (sin IA real, sin fetch, sin log de message_text) ──
  const msgText    = typeof message_text === 'string' ? message_text : '';
  const extraction = defaultHelpIntentExtractor.extract(msgText);

  // ── Rama: intención desconocida ────────────────────────────────────────────
  // No crear conv_case. No crear help ticket. No escalar.
  if (extraction.intent_type === 'unknown') {
    log.info('intención desconocida en WF-40', { session_id, channel });
    return ok({
      response_type: 'clarification',
      session_id,
      text:          'No he entendido bien tu consulta. ¿Puedes explicarme qué necesitas?',
    });
  }

  // ── Rama: FAQ ──────────────────────────────────────────────────────────────
  if (extraction.intent_type === 'faq') {
    // Consultar KB mock
    let kbMatches: Array<{ kb_id: string; title: string; answer: string; confidence: number; public: boolean }> = [];
    try {
      const kbRes = await fetch(`${supabaseUrl}/functions/v1/conv-core-query-help-kb`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({
          client_account_id,
          channel,
          topic:    extraction.topic,
          question: msgText.slice(0, 200),  // truncado — no log completo
        }),
      });
      if (kbRes.ok) {
        const kbData = await kbRes.json() as { data?: { matches?: typeof kbMatches } };
        kbMatches = kbData?.data?.matches ?? [];
      }
    } catch (e: unknown) {
      log.warn('conv-core-query-help-kb falló', {
        err: e instanceof Error ? e.message : String(e),
      });
    }

    const bestMatch = kbMatches.length > 0
      ? kbMatches.reduce((a, b) => a.confidence >= b.confidence ? a : b)
      : null;

    // FAQ con match suficiente → respuesta directa sin conv_case ni ticket
    if (bestMatch && bestMatch.confidence >= KB_CONFIDENCE_THRESHOLD) {
      log.info('FAQ resuelta por KB', { session_id, kb_id: bestMatch.kb_id });
      // answer es público/general — nunca contiene PII
      return ok({
        response_type: 'help_answer',
        session_id,
        answer:        bestMatch.answer,
        kb_id:         bestMatch.kb_id,
        confidence:    bestMatch.confidence,
      });
    }

    // FAQ sin match suficiente → crear caso → escalar
    const { data: noMatchCase, error: noMatchCaseErr } = await supabase
      .from('conv_cases')
      .insert({
        client_account_id,
        session_id,
        status:        'open',
        case_ref_type: 'help_ticket',
        service_code:  SERVICE_CODE,
        summary:       'Consulta de ayuda sin respuesta en KB',  // sin PII
      })
      .select('id')
      .single();

    if (noMatchCaseErr || !noMatchCase) {
      log.warn('Error al crear caso de ayuda sin match', { session_id });
      return err(ERROR_CODES.INTERNAL, 'Error al registrar consulta de ayuda', 500);
    }

    const noMatchCaseId = noMatchCase.id;

    // Escalar via conv-escalate-case (fire — fallo no bloquea respuesta)
    fetch(`${supabaseUrl}/functions/v1/conv-escalate-case`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({
        client_account_id,
        conv_case_id: noMatchCaseId,
        reason:       'no_kb_match',
      }),
    }).catch((e: unknown) => {
      log.warn('conv-escalate-case no_kb_match falló (no bloquea)', {
        err: e instanceof Error ? e.message : String(e),
      });
    });

    // Crear notificación admin sin PII
    await supabase
      .from('conv_admin_notifications')
      .insert({
        client_account_id,
        notification_type: 'escalation_required',
        severity:          'medium',
        context: {
          conv_case_id: noMatchCaseId,
          session_id,
          reason:       'no_kb_match',
          // NO incluir message_text, summary ni PII
        },
        is_read: false,
      });

    // Publicar conv_case_escalated (fire-and-log — fallo no bloquea)
    // Payload sin PII: solo IDs opacos, enums, reason
    // NO incluir: session_id, message_text, summary, answer, profile_id, phone, email
    const escalateActivityData: Record<string, unknown> = {
      conv_case_id:      noMatchCaseId,
      service_code:      SERVICE_CODE,
      case_ref_type:     'help_ticket',
      channel,
      escalation_reason: 'no_kb_match',
    };

    fetch(`${supabaseUrl}/functions/v1/conv-core-publish-activity`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({
        event_type: 'conv_case_escalated',
        source:     'smartconversations',
        client_account_id,
        timestamp:  new Date().toISOString(),
        data:       escalateActivityData,
      }),
    }).catch((e: unknown) => {
      log.warn('publish conv_case_escalated (no_kb_match) falló (no bloquea)', {
        err: e instanceof Error ? e.message : String(e),
      });
    });

    log.info('FAQ sin match — caso escalado', { conv_case_id: noMatchCaseId });

    return ok({
      response_type:     'escalated',
      session_id,
      conv_case_id:      noMatchCaseId,
      escalation_reason: 'no_kb_match',
    });
  }

  // ── Rama: account_specific — verificar identidad ───────────────────────────
  if (extraction.intent_type === 'account_specific' || extraction.is_account_specific) {
    // NO_MATCH, MATCH_INACTIVE y UNVERIFIED_LEAD no reciben datos contractuales
    if (!IDENTIFIED_LEVELS.has(identityLevel) || identityLevel === LEVEL_UNVERIFIED_LEAD) {
      log.info('account_specific sin identidad suficiente — identity_required', {
        session_id,
        // NO loguear identity_level si contiene datos sensibles
      });
      return ok({
        response_type: 'identity_required',
        session_id,
        next_step:     'conv-identity-progressive',
      });
    }
    // Con identidad suficiente (STRONG o PARTIAL) → continuar al flujo de ticket (fall-through)
  }

  // ── Rama: request_human / complaint / account_specific con identidad ────────
  // Crear conv_case → intentar crear help ticket
  const { data: helpCase, error: helpCaseErr } = await supabase
    .from('conv_cases')
    .insert({
      client_account_id,
      session_id,
      status:        'open',
      case_ref_type: 'help_ticket',
      service_code:  SERVICE_CODE,
      summary:       'Solicitud de atención al usuario',  // sin PII ni message_text
    })
    .select('id')
    .single();

  if (helpCaseErr || !helpCase) {
    log.warn('Error al crear caso de ayuda', { session_id });
    return err(ERROR_CODES.INTERNAL, 'Error al registrar solicitud de ayuda', 500);
  }

  const convCaseId = helpCase.id;

  // Llamar a conv-core-create-help-ticket
  let helpTicketRef: string | null = null;
  let helpTicketId:  string | null = null;

  try {
    const ticketRes = await fetch(`${supabaseUrl}/functions/v1/conv-core-create-help-ticket`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({
        client_account_id,
        session_id,
        conv_case_id:  convCaseId,
        topic:         extraction.topic ?? 'other',
        summary:       'Solicitud de atención al usuario',  // sin PII
        source:        channel,
      }),
    });
    if (ticketRes.ok) {
      const tData = await ticketRes.json() as {
        data?: { help_ticket_id?: string; help_ticket_ref?: string };
      };
      helpTicketId  = tData?.data?.help_ticket_id  ?? null;
      helpTicketRef = tData?.data?.help_ticket_ref ?? null;
    }
  } catch (e: unknown) {
    log.warn('conv-core-create-help-ticket falló', {
      err: e instanceof Error ? e.message : String(e),
    });
  }

  if (!helpTicketRef || !helpTicketId) {
    // Ticket no disponible → escalar con admin_requested
    await supabase
      .from('conv_cases')
      .update({ status: 'waiting_internal' })
      .eq('id', convCaseId);

    await supabase
      .from('conv_admin_notifications')
      .insert({
        client_account_id,
        notification_type: 'escalation_required',
        severity:          'high',
        context: {
          conv_case_id: convCaseId,
          session_id,
          reason:       'admin_requested',
          // NO incluir message_text, summary ni PII
        },
        is_read: false,
      });

    fetch(`${supabaseUrl}/functions/v1/conv-escalate-case`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({
        client_account_id,
        conv_case_id: convCaseId,
        reason:       'admin_requested',
      }),
    }).catch((e: unknown) => {
      log.warn('conv-escalate-case admin_requested falló (no bloquea)', {
        err: e instanceof Error ? e.message : String(e),
      });
    });

    // Publicar conv_case_escalated (fire-and-log — fallo no bloquea)
    const escalateAdminData: Record<string, unknown> = {
      conv_case_id:      convCaseId,
      service_code:      SERVICE_CODE,
      case_ref_type:     'help_ticket',
      channel,
      escalation_reason: 'admin_requested',
      // NO: session_id, message_text, summary, answer, profile_id, phone, email
    };

    fetch(`${supabaseUrl}/functions/v1/conv-core-publish-activity`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({
        event_type: 'conv_case_escalated',
        source:     'smartconversations',
        client_account_id,
        timestamp:  new Date().toISOString(),
        data:       escalateAdminData,
      }),
    }).catch((e: unknown) => {
      log.warn('publish conv_case_escalated (admin_requested) falló (no bloquea)', {
        err: e instanceof Error ? e.message : String(e),
      });
    });

    log.warn('help ticket no disponible — escalado con admin_requested', { conv_case_id: convCaseId });

    return ok({
      response_type:     'escalated',
      session_id,
      conv_case_id:      convCaseId,
      escalation_reason: 'admin_requested',
    });
  }

  // Éxito — actualizar caso: status='waiting_internal', case_ref=help_ticket_ref
  await supabase
    .from('conv_cases')
    .update({
      status:   'waiting_internal',
      case_ref: helpTicketRef,
    })
    .eq('id', convCaseId);

  log.info('help ticket creado', {
    conv_case_id:    convCaseId,
    help_ticket_ref: helpTicketRef,
    channel,
    // NO loguear: summary, message_text
  });

  // Construir texto de confirmación sustituyendo help_ticket_ref directamente
  const confirmationText = `Tu solicitud ha sido registrada con referencia ${helpTicketRef}. Nuestro equipo te atenderá pronto.`;

  // Guardia: verificar que no quedan marcadores sin sustituir
  const unsubstituted = findUnsubstitutedMarkers(confirmationText);
  if (unsubstituted.length > 0) {
    log.warn('marcadores sin sustituir en respuesta WF-40', {
      markers: unsubstituted.join(','),
    });
  }

  return ok({
    response_type:   'help_ticket_created',
    session_id,
    conv_case_id:    convCaseId,
    help_ticket_ref: helpTicketRef,
    next_state:      'waiting_internal',
    text:            confirmationText,
  });
});
