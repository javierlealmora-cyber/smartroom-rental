/**
 * conv-ingest
 *
 * Puerta interna común para mensajes ya normalizados por cualquier canal.
 * En fases posteriores será llamada por conv-wa-webhook (WhatsApp)
 * y conv-web-message (WebChat). En esta fase opera con mocks.
 *
 * Responsabilidades:
 *   1. Autenticar con service_role (rechaza anon, JWT de usuario y session_token de widget).
 *   2. Validar NormalizedMessage de entrada.
 *   3. Crear o recuperar conv_sessions.
 *   4. Insertar mensaje inbound en conv_messages.
 *   5. Deduplicar mensajes WhatsApp por wasender_message_id.
 *   6. Publicar conv_conversation_started (solo una vez por sesión).
 *   7. Consultar servicios activos via conv-core-get-tenant-features.
 *   8. Devolver respuesta interna tipada (IngestResponse — no es CanonicalResponse).
 *
 * Nota de diseño: IngestResponse usa response_type 'accepted', 'no_service' y
 * 'duplicate_ignored'. 'accepted' y 'duplicate_ignored' son internos a este EF
 * y no forman parte de CanonicalResponse (que es para salidas de WF-*). Esta no
 * es una contradicción: el contrato CanonicalResponse cubre el output de routing,
 * no la respuesta de ingest al canal adaptador.
 *
 * Autenticación: service_role only. Sin dual-auth. Sin sesión de usuario.
 * Privacidad: message_text, sender_ref y profile_id NO se loguean.
 * Fuente: rules-10, rules-40, rules-80, contract-normalized-message
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { isServiceRoleRequest } from "../_shared/smart-conversations/ef-auth.ts";
import { createSafeLogger } from "../_shared/smart-conversations/ef-logger.ts";
import { canAdvanceIdentityLevel } from "../_shared/smart-conversations/runtime/identity-level.ts";

const EF_NAME = 'conv-ingest';

// Canales soportados (rules-10 §4.2, enums.ts CHANNEL)
const SUPPORTED_CHANNELS = new Set(['whatsapp', 'webchat']);

// Texto para respuesta no_service (sin PII, sin datos del tenant)
const NO_SERVICE_TEXT = 'Este canal no tiene servicios activos actualmente.';

// ---------------------------------------------------------------------------
// Tipos internos de respuesta (no son CanonicalResponse — son respuestas de EF)
// ---------------------------------------------------------------------------

interface IngestAcceptedResponse {
  response_type: 'accepted';
  session_id: string;
  message_id: string;
  next_state: 'received';
}

interface IngestNoServiceResponse {
  response_type: 'no_service';
  session_id: string;
  text: string;
}

interface IngestDuplicateResponse {
  response_type: 'duplicate_ignored';
  session_id: string;
  message_id: string;
  idempotent: true;
}

type IngestResponse = IngestAcceptedResponse | IngestNoServiceResponse | IngestDuplicateResponse;

// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') {
    return err(ERROR_CODES.INVALID_ACTION, 'Solo se acepta POST', 405);
  }

  // Auth: service_role only.
  // Rechaza: anon key, JWT de usuario (Supabase Auth), session_token de widget WebChat.
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!(await isServiceRoleRequest(req, serviceRoleKey))) {
    return err(ERROR_CODES.UNAUTHORIZED, 'Se requiere service_role key', 401);
  }

  const log = createSafeLogger(EF_NAME);

  // ── Parse body ─────────────────────────────────────────────────────────────

  let body: {
    client_account_id?: unknown;
    normalized_message?: {
      channel?: unknown;
      sender_ref?: unknown;
      message_text?: unknown;
      provider_message_id?: unknown;
      media_url?: unknown;
      reply_to_id?: unknown;
      is_transcribed?: unknown;
      raw_payload_ref?: unknown;
    };
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, 'Body JSON inválido', 400);
  }

  const { client_account_id, normalized_message: nm } = body;

  // ── Validación de campos obligatorios ──────────────────────────────────────

  if (!client_account_id || typeof client_account_id !== 'string') {
    return err(ERROR_CODES.VALIDATION, 'client_account_id es obligatorio', 400);
  }

  if (!nm || typeof nm !== 'object') {
    return err(ERROR_CODES.VALIDATION, 'normalized_message es obligatorio', 400);
  }

  const { channel, sender_ref, message_text, provider_message_id } = nm;

  if (!channel || typeof channel !== 'string' || !SUPPORTED_CHANNELS.has(channel)) {
    return err(ERROR_CODES.VALIDATION, `canal no soportado: ${String(channel ?? '')}`, 400);
  }

  if (!sender_ref || typeof sender_ref !== 'string' || sender_ref.trim() === '') {
    return err(ERROR_CODES.VALIDATION, 'sender_ref es obligatorio', 400);
  }

  // sender_ref nunca debe contener @c.us (contract-normalized-message §8.4)
  // El sufijo @c.us se añade únicamente en conv-send-wa al construir el campo `to` para Wasender.
  if (sender_ref.includes('@c.us')) {
    return err(ERROR_CODES.VALIDATION, 'sender_ref no debe contener @c.us', 400);
  }

  if (!message_text || typeof message_text !== 'string' || message_text.trim() === '') {
    return err(ERROR_CODES.VALIDATION, 'message_text es obligatorio', 400);
  }

  // ── Supabase client (service_role) ─────────────────────────────────────────

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ── Sesión ─────────────────────────────────────────────────────────────────

  // Buscar sesión existente por (client_account_id, channel, sender_ref).
  // La tabla tiene UNIQUE(client_account_id, channel, sender_ref) — hay como máximo una fila.
  const { data: existingSession, error: sessionLookupErr } = await supabase
    .from('conv_sessions')
    .select('id, identity_level, profile_id, identity_data')
    .eq('client_account_id', client_account_id)
    .eq('channel', channel)
    .eq('sender_ref', sender_ref)
    .maybeSingle();

  if (sessionLookupErr) {
    log.error('Error al buscar conv_sessions', { err: sessionLookupErr.message });
    return err(ERROR_CODES.INTERNAL, 'Error al buscar la sesión', 500);
  }

  let sessionId: string;
  let isNewSession = false;

  if (existingSession) {
    // Sesión existente: actualizar last_active_at únicamente.
    // No degradar identity_level. No borrar profile_id ni identity_data.
    sessionId = existingSession.id;

    const { error: updateErr } = await supabase
      .from('conv_sessions')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (updateErr) {
      log.warn('Error al actualizar last_active_at (no crítico)', { session_id: sessionId });
    }
  } else {
    // Sesión nueva: identity_level = 'NO_MATCH' por defecto (rules-40 §4.1).
    // identity_level 'NO_MATCH' — la validación de identidad se implementa en Fase 5+.
    const { data: newSession, error: insertErr } = await supabase
      .from('conv_sessions')
      .insert({
        client_account_id,
        channel,
        sender_ref,
        state: 'NEW',
        identity_level: 'NO_MATCH',    // valor por defecto — sin validación en esta fase
        identity_data: {},
        last_active_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertErr || !newSession) {
      log.error('Error al crear conv_sessions', { err: insertErr?.message ?? 'sin datos' });
      return err(ERROR_CODES.INTERNAL, 'Error al crear la sesión', 500);
    }

    sessionId = newSession.id;
    isNewSession = true;
  }

  // ── Fast-path identidad WhatsApp ───────────────────────────────────────────
  // Intenta validar identidad por teléfono (sender_ref = teléfono normalizado sin @c.us).
  // Solo para canal whatsapp. No loguear sender_ref ni phone.
  if (channel === 'whatsapp') {
    const waIdentUrl = Deno.env.get('SUPABASE_URL')!;
    const currentLevel: string = existingSession?.identity_level ?? 'NO_MATCH';
    try {
      const identRes = await fetch(`${waIdentUrl}/functions/v1/conv-core-validate-identity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
        body: JSON.stringify({ client_account_id, phone: sender_ref }),
      });
      if (identRes.ok) {
        const identData = await identRes.json() as {
          data?: {
            identity_level?: string;
            profile_id?: string;
            assignment_id?: string;
            room_id?: string;
            room_label?: string;
            full_name?: string;
          };
        };
        const newLevel = identData?.data?.identity_level ?? '';
        if (canAdvanceIdentityLevel(currentLevel, newLevel)) {
          const sessionUpdate: Record<string, unknown> = { identity_level: newLevel };
          if (identData.data?.profile_id) sessionUpdate['profile_id'] = identData.data.profile_id;
          // Guardar campos seguros en identity_data — nunca incluir el teléfono
          const safeData: Record<string, unknown> = {
            ...((existingSession?.identity_data as Record<string, unknown>) ?? {}),
          };
          if (identData.data?.assignment_id) safeData['assignment_id'] = identData.data.assignment_id;
          if (identData.data?.room_id)        safeData['room_id']        = identData.data.room_id;
          if (identData.data?.room_label)     safeData['room_label']     = identData.data.room_label;
          if (identData.data?.full_name)      safeData['full_name']      = identData.data.full_name;
          sessionUpdate['identity_data'] = safeData;

          await supabase.from('conv_sessions').update(sessionUpdate).eq('id', sessionId);

          // Publicar conv_identity_validated para PARTIAL o STRONG (fire-and-log)
          const IDENTITY_PUBLISHABLE = ['PARTIAL_MATCH_ACTIVE', 'STRONG_MATCH_ACTIVE'];
          if (IDENTITY_PUBLISHABLE.includes(newLevel)) {
            fetch(`${waIdentUrl}/functions/v1/conv-core-publish-activity`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${serviceRoleKey}` },
              body: JSON.stringify({
                event_type: 'conv_identity_validated',
                source: 'smartconversations',
                client_account_id,
                timestamp: new Date().toISOString(),
                data: { session_id: sessionId, identity_level: newLevel },
              }),
            }).catch((e: unknown) => {
              log.warn('publish conv_identity_validated falló (no bloquea)', {
                err: e instanceof Error ? e.message : String(e),
              });
            });
          }
        }
      }
    } catch (e: unknown) {
      log.warn('Error en fast-path identidad WhatsApp (no crítico)', {
        err: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // ── Deduplicación WhatsApp ─────────────────────────────────────────────────

  // wasender_message_id se asigna solo si canal=whatsapp y hay provider_message_id.
  // Para WebChat provider_message_id puede ser null; no rompe por NULL (índice parcial).
  const wasenderMessageId: string | null =
    channel === 'whatsapp' && provider_message_id && typeof provider_message_id === 'string'
      ? provider_message_id
      : null;

  if (wasenderMessageId) {
    const { data: existingMsg } = await supabase
      .from('conv_messages')
      .select('id')
      .eq('client_account_id', client_account_id)
      .eq('wasender_message_id', wasenderMessageId)
      .maybeSingle();

    if (existingMsg) {
      // Duplicado: respuesta idempotente. No publicar conv_conversation_started de nuevo.
      log.info('mensaje duplicado ignorado — respuesta idempotente', { session_id: sessionId });
      return ok<IngestDuplicateResponse>({
        response_type: 'duplicate_ignored',
        session_id: sessionId,
        message_id: existingMsg.id,
        idempotent: true,
      });
    }
  }

  // ── Insertar mensaje inbound ───────────────────────────────────────────────

  const messageInsert: Record<string, unknown> = {
    client_account_id,
    session_id: sessionId,
    channel,
    sender_type: 'user',
    direction: 'inbound',
    text: message_text,
    status: 'received',
  };

  if (wasenderMessageId) {
    messageInsert['wasender_message_id'] = wasenderMessageId;
  }

  const { data: newMessage, error: msgErr } = await supabase
    .from('conv_messages')
    .insert(messageInsert)
    .select('id')
    .single();

  if (msgErr || !newMessage) {
    log.error('Error al insertar conv_messages', { err: msgErr?.message ?? 'sin datos' });
    return err(ERROR_CODES.INTERNAL, 'Error al registrar el mensaje', 500);
  }

  const messageId: string = newMessage.id;

  // ── Activity Log ───────────────────────────────────────────────────────────

  // conv_conversation_started se publica solo una vez por sesión nueva.
  // No se publica al reactivar una sesión existente.
  // fire-and-log: el fallo no bloquea ingest.
  if (isNewSession) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    fetch(`${supabaseUrl}/functions/v1/conv-core-publish-activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        event_type: 'conv_conversation_started',
        source: 'smartconversations',
        client_account_id,
        timestamp: new Date().toISOString(),
        // Payload sin PII: solo session_id (opaco) y channel (enum)
        data: {
          session_id: sessionId,
          channel,
        },
      }),
    }).catch((e: unknown) => {
      log.warn('publish conv_conversation_started falló (no bloquea ingest)', {
        err: e instanceof Error ? e.message : String(e),
      });
    });
  }

  // ── Servicios activos (sin caché) ─────────────────────────────────────────

  // Se consulta en cada llamada; no se cachea TenantFeaturesResponse.
  // Sin routing real. Sin n8n real. Sin Claude real. Sin Wasender real.
  let servicesActive: unknown[] = [];

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const featuresRes = await fetch(
      `${supabaseUrl}/functions/v1/conv-core-get-tenant-features`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ client_account_id }),
      }
    );

    if (featuresRes.ok) {
      const featuresBody = await featuresRes.json() as {
        ok?: boolean;
        data?: { services_active?: unknown[] };
      };
      servicesActive = featuresBody?.data?.services_active ?? [];
    } else {
      log.warn('conv-core-get-tenant-features devolvió error', {
        status: String(featuresRes.status),
      });
    }
  } catch (e: unknown) {
    log.warn('Error al consultar conv-core-get-tenant-features', {
      err: e instanceof Error ? e.message : String(e),
    });
  }

  // Sin servicios activos → no_service
  if (servicesActive.length === 0) {
    log.info('sin servicios activos para el tenant', { session_id: sessionId });
    return ok<IngestNoServiceResponse>({
      response_type: 'no_service',
      session_id: sessionId,
      text: NO_SERVICE_TEXT,
    });
  }

  // ── Respuesta aceptada ────────────────────────────────────────────────────
  // Fase 4: stub controlado. Sin routing real, sin n8n real, sin Claude real.
  // El routing real (clasificación de intención) se implementa en Fase 5+.

  log.info('mensaje ingestado correctamente', {
    session_id: sessionId,
    message_id: messageId,
    channel,
    is_new_session: String(isNewSession),
  });

  return ok<IngestAcceptedResponse>({
    response_type: 'accepted',
    session_id: sessionId,
    message_id: messageId,
    next_state: 'received',
  });
});
