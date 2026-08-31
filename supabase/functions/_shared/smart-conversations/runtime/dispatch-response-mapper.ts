/**
 * dispatch-response-mapper — Convierte respuestas internas de WF-20/30/40 a texto outbound seguro.
 *
 * Reglas:
 * - Si la respuesta trae text, usarlo si no contiene marcadores sin resolver.
 * - Si no trae text o tiene marcadores, usar fallback seguro por response_type.
 * - Nunca exponer: profile_id, identity_data, sender_ref, assignment_id, room_id, JSON técnico.
 * - Refs públicas permitidas: incident_ref, lead_ref, help_ticket_ref, listing_ref.
 * - Marcadores prohibidos sin resolver: {incident_ref}, {lead_ref}, {help_ticket_ref}, {user_name}.
 */

const MARKER_PATTERN = /\{[a-z_]+\}/;

/** Detecta si un texto tiene marcadores sin sustituir del tipo {foo_bar}. */
function hasUnsubstitutedMarkers(text: string): boolean {
  return MARKER_PATTERN.test(text);
}

/** Textos de fallback por response_type — todos seguros para el usuario. */
const FALLBACK_TEXT: Record<string, string> = {
  // WF-20
  success:              'Tu incidencia ha sido registrada correctamente.',
  pending_input:        'Necesitamos más información para gestionar tu incidencia.',
  identity_required:    'Para continuar necesitamos verificar tu identidad.',
  escalated:            'Tu solicitud ha sido derivada a nuestro equipo.',
  // WF-30
  listing_results:      'Aquí tienes las publicaciones disponibles.',
  listing_details:      'Aquí tienes los detalles de la publicación.',
  lead_created:         'Hemos registrado tu interés. Nos pondremos en contacto contigo.',
  clarification_needed: '¿Sobre qué publicación o habitación necesitas información?',
  clarification:        '¿Puedes darme más detalles sobre lo que buscas?',
  // WF-40
  help_answer:          'Espero que esta información te haya sido útil.',
  help_ticket_created:  'Tu solicitud de ayuda ha sido registrada. Nuestro equipo te atenderá pronto.',
  waiting_internal:     'Tu solicitud ha sido recibida. Nuestro equipo te atenderá pronto.',
  // Compartidos
  identity_required_generic: 'Para continuar necesitamos verificar tu identidad.',
  // Routing
  no_service:           'Este canal no tiene servicios activos actualmente.',
  context_switch:       'Tienes una conversación abierta. ¿Quieres cambiar a otro tema?',
  menu:                 '¿Sobre qué necesitas ayuda?',
  // Error genérico
  error:                'Ha ocurrido un problema. Por favor, intenta de nuevo en unos minutos.',
};

export interface WfResponse {
  response_type?: string;
  text?:          string;
  [key: string]:  unknown;
}

/**
 * Mapea la respuesta de un WF a un texto seguro para el usuario.
 * Prioriza el campo text de la respuesta si no tiene marcadores.
 */
export function mapWfResponseToText(wfResponse: WfResponse): string {
  const rt   = wfResponse.response_type ?? 'error';
  const text = typeof wfResponse.text === 'string' ? wfResponse.text : '';

  if (text && !hasUnsubstitutedMarkers(text)) {
    return text;
  }

  return FALLBACK_TEXT[rt] ?? FALLBACK_TEXT['error'];
}

/**
 * Construye texto seguro para respuesta de menú desde routing.
 * Solo usa service_code y label del array — nunca IDs internos.
 */
export function buildMenuText(
  options: Array<{ service_code: string; label: string }>,
): string {
  const lines = ['¿Sobre qué necesitas ayuda?'];
  let n = 0;
  for (const opt of options) {
    if (opt.service_code === 'resume_case') {
      lines.push('\nTambién puedes volver al caso pendiente.');
    } else {
      n++;
      lines.push(`${n}. ${opt.label}`);
    }
  }
  return lines.join('\n');
}

/**
 * Construye texto seguro para no_service.
 */
export function buildNoServiceText(): string {
  return 'Este canal no tiene servicios activos actualmente.';
}

/**
 * Construye texto seguro para context_switch_confirmation.
 */
export function buildContextSwitchText(): string {
  return 'Tienes una conversación abierta. ¿Quieres cambiar a otro tema?';
}
