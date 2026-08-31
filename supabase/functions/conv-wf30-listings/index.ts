/**
 * conv-wf30-listings — Flujo WF-30 de publicaciones/anuncios.
 *
 * Responsabilidades:
 *   1. Requerir service_role.
 *   2. Validar input (client_account_id, session_id, message_id, channel, service_code).
 *   3. Cargar conv_sessions — identity_level.
 *   4. Extraer intención de búsqueda (adapter mock — sin IA real).
 *   5. Ramas por intent_type:
 *      - search_listing: consultar listings → crear conv_case open → devolver resultados públicos.
 *      - ask_details:    pedir listing_id si falta; si está → devolver solo datos públicos.
 *      - request_visit / leave_contact: si contacto suficiente → crear lead →
 *          publicar conv_lead_created → actualizar caso a waiting_internal.
 *      - unknown: devolver aclaración controlada.
 *   6. UNVERIFIED_LEAD: WF-30 puede asignarlo. conv-core-validate-identity no lo devuelve.
 *   7. Activity Log (fire-and-log — fallo no bloquea).
 *
 * Privacidad: message_text, contact_phone, contact_email, sender_ref, profile_id, identity_data
 *             son sensibles — no loguear.
 * No conectar n8n real. No conectar Claude real. No conectar Core real. No conectar Wasender.
 * Fuente: rules-80, rules-75, SmartConversations WF-30.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { defaultListingIntentExtractor } from "../_shared/smart-conversations/runtime/listing-intent-extractor.ts";
import { findUnsubstitutedMarkers } from "../_shared/smart-conversations/privacy-guards.ts";

const EF_NAME     = 'conv-wf30-listings';
const SERVICE_CODE = 'conv_publicaciones';

// UNVERIFIED_LEAD: nivel especial asignable solo por WF-30.
// conv-core-validate-identity nunca devuelve este nivel.
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
  const extraction = defaultListingIntentExtractor.extract(msgText);

  // ── Rama: intención desconocida ────────────────────────────────────────────
  if (extraction.intent_type === 'unknown') {
    log.info('intención desconocida en WF-30', { session_id, channel });
    return ok({
      response_type: 'clarification_needed',
      session_id,
      text: '¿En qué puedo ayudarte? Puedo buscar habitaciones disponibles, darte detalles de un anuncio o gestionar tu contacto.',
    });
  }

  // ── Rama: búsqueda de listings ─────────────────────────────────────────────
  if (extraction.intent_type === 'search_listing') {
    // Crear conv_case de tipo lead para el flujo de publicaciones
    const { data: newCase, error: caseErr } = await supabase
      .from('conv_cases')
      .insert({
        client_account_id,
        session_id,
        status:        'open',
        case_ref_type: 'lead',
        service_code:  SERVICE_CODE,
        summary:       'Consulta de disponibilidad de publicaciones',  // sin PII
      })
      .select('id')
      .single();

    if (caseErr || !newCase) {
      log.warn('Error al crear caso de búsqueda', { session_id });
      return err(ERROR_CODES.INTERNAL, 'Error al procesar la búsqueda', 500);
    }

    const convCaseId = newCase.id;

    // Consultar listings mock
    let listings: unknown[] = [];
    try {
      const queryRes = await fetch(`${supabaseUrl}/functions/v1/conv-core-query-listings`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({
          client_account_id,
          channel,
          filters: {
            location:   extraction.location,
            budget_max: extraction.budget_max,
          },
        }),
      });
      if (queryRes.ok) {
        const qData = await queryRes.json() as { data?: { listings?: unknown[] } };
        listings = qData?.data?.listings ?? [];
      }
    } catch (e: unknown) {
      log.warn('conv-core-query-listings falló (búsqueda degrada)', {
        err: e instanceof Error ? e.message : String(e),
      });
    }

    if (listings.length === 0) {
      log.info('sin resultados de listings', { conv_case_id: convCaseId });
      return ok({
        response_type: 'no_listings',
        session_id,
        conv_case_id:  convCaseId,
        text:          'En este momento no encontramos publicaciones que coincidan con tu búsqueda.',
      });
    }

    log.info('búsqueda de listings completada', { conv_case_id: convCaseId });

    return ok({
      response_type: 'listing_results',
      session_id,
      conv_case_id:  convCaseId,
      listings,
    });
  }

  // ── Rama: detalles de un anuncio ───────────────────────────────────────────
  if (extraction.intent_type === 'ask_details') {
    if (!extraction.listing_id) {
      log.info('ask_details sin listing_id — pedir aclaración', { session_id });
      return ok({
        response_type: 'clarification_needed',
        session_id,
        text:          '¿De qué publicación quieres más información? Dime la referencia del anuncio (por ejemplo HAB-001).',
      });
    }

    // Consultar listing específico (mock — solo datos públicos)
    let listingDetail: unknown = null;
    try {
      const detailRes = await fetch(`${supabaseUrl}/functions/v1/conv-core-query-listings`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({ client_account_id, channel, filters: {} }),
      });
      if (detailRes.ok) {
        const dData = await detailRes.json() as {
          data?: { listings?: Array<{ listing_id: string }> };
        };
        listingDetail = (dData?.data?.listings ?? []).find(
          (l) => l.listing_id === extraction.listing_id,
        ) ?? null;
      }
    } catch (e: unknown) {
      log.warn('conv-core-query-listings falló (detalles)', {
        err: e instanceof Error ? e.message : String(e),
      });
    }

    if (!listingDetail) {
      return ok({
        response_type: 'clarification_needed',
        session_id,
        text:          '¿De qué publicación quieres más información? Dime la referencia del anuncio (por ejemplo HAB-001).',
      });
    }

    log.info('detalles de listing devueltos', { session_id });

    // Devolver solo datos públicos — sin PII, sin datos internos de contrato
    return ok({
      response_type: 'listing_details',
      session_id,
      listing:       listingDetail,
    });
  }

  // ── Rama: solicitud de visita o dejar contacto ─────────────────────────────
  if (extraction.intent_type === 'request_visit' || extraction.intent_type === 'leave_contact') {
    // Sin contacto suficiente → pending_input
    if (!extraction.is_complete) {
      return ok({
        response_type:  'pending_input',
        session_id,
        missing_fields: extraction.missing_fields ?? ['contact_phone_or_email'],
        text:           'Para procesar tu solicitud necesito tu teléfono o email de contacto.',
      });
    }

    // Crear conv_case de tipo lead
    const { data: leadCase, error: leadCaseErr } = await supabase
      .from('conv_cases')
      .insert({
        client_account_id,
        session_id,
        status:        'open',
        case_ref_type: 'lead',
        service_code:  SERVICE_CODE,
        summary:       'Solicitud de contacto para publicación',  // sin PII
      })
      .select('id')
      .single();

    if (leadCaseErr || !leadCase) {
      log.warn('Error al crear caso de lead', { session_id });
      return err(ERROR_CODES.INTERNAL, 'Error al registrar solicitud', 500);
    }

    const convCaseId = leadCase.id;

    // Llamar a conv-core-create-lead con contacto (PII interno — nunca a logs)
    let leadRef: string | null = null;
    let leadId:  string | null = null;

    try {
      const leadRes = await fetch(`${supabaseUrl}/functions/v1/conv-core-create-lead`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({
          client_account_id,
          session_id,
          conv_case_id:  convCaseId,
          listing_id:    extraction.listing_id ?? 'unknown',
          interest_type: extraction.intent_type,
          contact: {
            // PII interno — nunca va a logs ni Activity Log
            phone: extraction.contact_phone,
            email: extraction.contact_email,
          },
          source: channel,
        }),
      });
      if (leadRes.ok) {
        const lData = await leadRes.json() as { data?: { lead_id?: string; lead_ref?: string } };
        leadId  = lData?.data?.lead_id  ?? null;
        leadRef = lData?.data?.lead_ref ?? null;
      }
    } catch (e: unknown) {
      log.warn('conv-core-create-lead falló', {
        err: e instanceof Error ? e.message : String(e),
      });
    }

    if (!leadRef || !leadId) {
      // Core no disponible — dejar caso en waiting_internal, notificar admin sin PII
      await supabase
        .from('conv_cases')
        .update({ status: 'waiting_internal' })
        .eq('id', convCaseId);

      await supabase
        .from('conv_admin_notifications')
        .insert({
          client_account_id,
          notification_type: 'lead_creation_failed',
          severity:          'high',
          context: {
            conv_case_id: convCaseId,
            session_id,
            reason:       'core_unavailable',
            // NO incluir contacto ni PII
          },
          is_read: false,
        });

      log.warn('Core lead mock no disponible — lead en espera', { conv_case_id: convCaseId });

      return ok({
        response_type: 'pending_input',
        session_id,
        conv_case_id:  convCaseId,
        next_state:    'waiting_internal',
        text:          'Hemos registrado tu interés. Nuestro equipo se pondrá en contacto contigo pronto.',
      });
    }

    // Éxito — actualizar caso: status='waiting_internal', case_ref=lead_ref
    await supabase
      .from('conv_cases')
      .update({
        status:   'waiting_internal',
        case_ref: leadRef,
      })
      .eq('id', convCaseId);

    // Asignar UNVERIFIED_LEAD si el usuario no es inquilino identificado
    const isIdentifiedTenant =
      identityLevel === 'STRONG_MATCH_ACTIVE' || identityLevel === 'PARTIAL_MATCH_ACTIVE';
    if (!isIdentifiedTenant) {
      await supabase
        .from('conv_sessions')
        .update({ identity_level: LEVEL_UNVERIFIED_LEAD })
        .eq('id', session_id)
        .eq('client_account_id', client_account_id);

      log.info('UNVERIFIED_LEAD asignado por WF-30', { session_id });
    }

    // Publicar conv_lead_created (fire-and-log — fallo no bloquea)
    // Payload sin PII: solo IDs opacos, enums, refs
    // NO incluir: session_id, profile_id, phone, email, full_name, contact, raw_payload
    const activityData: Record<string, unknown> = {
      lead_id:       leadId,
      lead_ref:      leadRef,
      listing_id:    extraction.listing_id ?? 'unknown',
      conv_case_id:  convCaseId,
      channel,
      interest_type: extraction.intent_type,
    };

    fetch(`${supabaseUrl}/functions/v1/conv-core-publish-activity`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({
        event_type: 'conv_lead_created',
        source:     'smartconversations',
        client_account_id,
        timestamp:  new Date().toISOString(),
        data:       activityData,
      }),
    }).catch((e: unknown) => {
      log.warn('publish conv_lead_created falló (no bloquea)', {
        err: e instanceof Error ? e.message : String(e),
      });
    });

    log.info('lead oficial creado', {
      conv_case_id: convCaseId,
      lead_ref:     leadRef,
      channel,
      // NO loguear: contact_phone, contact_email, contact_name
    });

    // Construir texto de confirmación sustituyendo el lead_ref directamente
    const confirmationText = `Hemos registrado tu interés con referencia ${leadRef}.`;

    // Guardia: verificar que no quedan marcadores sin sustituir
    const unsubstituted = findUnsubstitutedMarkers(confirmationText);
    if (unsubstituted.length > 0) {
      log.warn('marcadores sin sustituir en respuesta WF-30', {
        markers: unsubstituted.join(','),
      });
    }

    return ok({
      response_type: 'lead_created',
      session_id,
      conv_case_id:  convCaseId,
      lead_ref:      leadRef,
      next_state:    'waiting_internal',
      text:          confirmationText,
    });
  }

  // Fallback (nunca debería llegar aquí dado los checks anteriores)
  return ok({
    response_type: 'clarification_needed',
    session_id,
    text:          'No pude entender tu solicitud. ¿Puedes reformularla?',
  });
});
