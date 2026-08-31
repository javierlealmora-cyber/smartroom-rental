/**
 * webchat-realtime-client.ts -- Adapter de notificacion Realtime WebChat.
 *
 * Principio: conv_messages = fuente de verdad. Realtime = notificacion best-effort.
 * El widget nunca confia en el payload Realtime como fuente de contenido.
 * El contenido se obtiene siempre desde conv-web-poll.
 *
 * Modos:
 *   WEBCHAT_REALTIME_MODE=mock (default) -- no hace fetch externo, devuelve exito simulado
 *   WEBCHAT_REALTIME_MODE=real           -- adapter preparado; sin contrato confirmado
 *                                           devuelve REALTIME_PROVIDER_NOT_CONFIGURED
 *
 * Canal: webchat:<session_id>
 *   No contiene phone, sender_ref, profile_id, full_name, room_label ni datos de mensaje.
 *   El prefijo es configurable via WEBCHAT_REALTIME_CHANNEL_PREFIX.
 *
 * Notificacion (solo estos campos):
 *   event_type = 'webchat_message_available'  (evento tecnico, NO Activity Event)
 *   client_account_id, session_id, message_id, created_at, channel='webchat'
 *
 * Prohibido en notificacion:
 *   contenido de mensaje, sender_ref, profile_id, identity_data, raw_payload,
 *   phone, room_id, assignment_id, service_role, token, secret
 *
 * Reglas:
 *   - Persistencia primero. Nunca publicar antes de persistir.
 *   - Fallo Realtime no hace rollback del mensaje persistido.
 *   - No crear nuevo mensaje si falla la notificacion.
 *   - No publicar Activity Log.
 *   - webchat_message_available NO es Activity Event (no anadir a ACTIVITY_EVENT_TYPE).
 *
 * Fuente: SmartConversations Fase 10F, rules-31, rules-80.
 */

// ── Env helper ────────────────────────────────────────────────────────────

function _getEnv(key: string): string | undefined {
  if (typeof Deno !== 'undefined') return Deno.env.get(key);
  return undefined;
}

// ── Tipos exportados ──────────────────────────────────────────────────────

export type WebchatRealtimeMode = 'mock' | 'real';

/** Notificacion Realtime. Solo campos tecnicos, sin PII ni contenido. */
export interface WebchatRealtimeNotification {
  event_type:        'webchat_message_available';
  client_account_id: string;
  session_id:        string;
  message_id:        string;
  created_at:        string;
  channel:           'webchat';
}

export interface RealtimePublishResult {
  published:  boolean;
  error?:     string;
}

// ── Feature flag ──────────────────────────────────────────────────────────

export function getWebchatRealtimeMode(): WebchatRealtimeMode {
  const raw = _getEnv('WEBCHAT_REALTIME_MODE') ?? 'mock';
  return raw === 'real' ? 'real' : 'mock';
}

// ── Canal ─────────────────────────────────────────────────────────────────

/**
 * Construye el nombre del canal Realtime para una sesion WebChat.
 * Formato: <prefix>:<session_id>
 * No contiene phone, sender_ref, profile_id ni ningun PII.
 */
export function buildWebchatRealtimeChannel(session_id: string): string {
  const prefix = _getEnv('WEBCHAT_REALTIME_CHANNEL_PREFIX') ?? 'webchat';
  return `${prefix}:${session_id}`;
}

// ── Factory de notificacion ───────────────────────────────────────────────

/**
 * Construye una notificacion Realtime WebChat valida.
 * Centraliza la construccion para que los llamadores no repitan el campo event_type.
 */
export function buildWebchatRealtimeNotification(
  client_account_id: string,
  session_id:         string,
  message_id:         string,
  created_at:         string,
): WebchatRealtimeNotification {
  return {
    event_type:        'webchat_message_available',
    client_account_id,
    session_id,
    message_id,
    created_at,
    channel:           'webchat',
  };
}

// ── Publicacion ───────────────────────────────────────────────────────────

/**
 * Publica una notificacion Realtime best-effort.
 *
 * En mode=mock: no hace fetch externo. Devuelve { published: true } simulado.
 * En mode=real: adapter preparado. Sin contrato de Supabase Realtime confirmado.
 *   Devuelve error controlado REALTIME_PROVIDER_NOT_CONFIGURED.
 *
 * La notificacion no contiene datos de mensaje ni PII.
 * El llamador (conv-web-deliver) no debe hacer rollback si falla.
 * El mensaje ya esta persistido en conv_messages antes de llamar esta funcion.
 */
export async function publishWebchatRealtimeNotification(
  notification: WebchatRealtimeNotification,
  _supabaseUrl?: string,
  _serviceRoleKey?: string,
): Promise<RealtimePublishResult> {
  const mode = getWebchatRealtimeMode();

  if (mode === 'mock') {
    // Mode mock: notificacion simulada, sin conexion real.
    // La notificacion contiene solo campos permitidos (ya validados por el llamador).
    void notification; // la notificacion existe pero no se envia
    return { published: true };
  }

  // Mode real: adapter preparado para integracion futura.
  // Sin API de Supabase Realtime confirmada como estable para EFs Deno en esta fase.
  // Cuando el contrato sea confirmado, sustituir por implementacion real aqui.
  return { published: false, error: 'REALTIME_PROVIDER_NOT_CONFIGURED' };
}
