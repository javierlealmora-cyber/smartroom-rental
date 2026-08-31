/**
 * webchat-security.ts -- Validaciones de seguridad del canal WebChat.
 *
 * Campos que NUNCA se devuelven al widget:
 *   service_role, profile_id, phone, identity_data, raw_payload,
 *   room_id, assignment_id, sender_ref (en outbound), tokens, authorization.
 *
 * Campos prohibidos en INPUT público del widget:
 *   profile_id, phone, phone_number, identity_data, room_id, assignment_id,
 *   raw_payload, tokens, jwt, authorization, service_role.
 *
 * La identidad WebChat autenticada requiere JWT firmado -- fuera de alcance
 * hasta fase posterior. El widget publico NO puede enviar profile_id ni
 * datos de identidad. Rechazo con 400 WEBCHAT_FORBIDDEN_FIELD.
 *
 * Validaciones activas:
 *   - origin permitido (validateOrigin en webchat-client)
 *   - client_account_id presente
 *   - sender_ref formato opaco wc_<32hex>
 *   - message_text longitud maxima
 *   - no se acepta profile_id ni campos de identidad desde frontend
 *   - no se acepta service_role desde frontend
 *   - no se expone service_role al frontend
 *
 * WebChat no valida identidad real. WebChat no decide routing.
 * WebChat no crea casos directamente. WebChat no accede a conv_wa_sessions.
 * WebChat no llama Wasender. WebChat no llama Core real.
 * WebChat no llama IA real. WebChat no llama n8n real.
 *
 * Fuente: Fase 10E microfix, rules-31, rules-20 4.4.
 */

// Campos PII / internos que nunca se devuelven al widget (outbound).
export const WEBCHAT_FORBIDDEN_OUTPUT_FIELDS: ReadonlySet<string> = new Set([
  'service_role',
  'profile_id',
  'phone',
  'phone_number',
  'identity_data',
  'raw_payload',
  'room_id',
  'assignment_id',
  'tokens',
  'authorization',
  'jwt',
  'full_name',
  'email',
  'sender_ref',
]);

// Campos prohibidos en input público del widget (inbound).
// El widget no puede enviar datos de identidad sin JWT firmado.
// La identidad WebChat autenticada se implementa en una fase posterior con JWT real.
export const WEBCHAT_FORBIDDEN_PUBLIC_INPUT_FIELDS: ReadonlyArray<string> = [
  'profile_id',
  'phone',
  'phone_number',
  'identity_data',
  'room_id',
  'assignment_id',
  'raw_payload',
  'tokens',
  'jwt',
  'authorization',
  'service_role',
  // sender_ref es generado por el backend en conv-web-session; el widget no puede enviarlo
  'sender_ref',
];

/**
 * Detecta el primer campo prohibido en input público del widget WebChat.
 * Devuelve el nombre del campo o null si el body está limpio.
 * Usar en conv-web-session para rechazar identidad no autenticada (400).
 */
export function detectForbiddenPublicInput(body: Record<string, unknown>): string | null {
  for (const f of WEBCHAT_FORBIDDEN_PUBLIC_INPUT_FIELDS) {
    if (f in body) return f;
  }
  return null;
}

/**
 * Elimina campos prohibidos de un objeto de respuesta outbound.
 * No modifica el objeto original.
 */
export function sanitizeWebchatOutput<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!WEBCHAT_FORBIDDEN_OUTPUT_FIELDS.has(k)) {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

/**
 * Valida que el body del widget no contiene campos exclusivos del backend.
 * Devuelve el nombre del campo prohibido encontrado, o null si esta limpio.
 */
export function detectForbiddenInputField(body: Record<string, unknown>): string | null {
  const legacyForbidden = ['service_role', 'authorization', 'jwt', 'tokens'] as const;
  for (const f of legacyForbidden) {
    if (f in body) return f;
  }
  return null;
}
