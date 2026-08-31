/**
 * Mock de conv-ingest y EFs del Core conversacional.
 * Simula las respuestas canónicas del motor sin llamadas reales a Supabase Edge Functions.
 */

export type CanonicalResponse = {
  next_state: 'waiting_user' | 'waiting_n8n' | 'resolved' | 'escalated' | 'identity_required';
  response_text: string;
  activity_events?: string[];
};

// ── Respuestas canónicas por caso ────────────────────────────────────────────

export const mockCanonicalResponseIncident: CanonicalResponse = {
  next_state: 'waiting_n8n',
  response_text: 'He registrado tu incidencia. Nuestro equipo la atenderá pronto.',
  activity_events: ['conv_incident_created'],
};

export const mockCanonicalResponsePreIncident: CanonicalResponse = {
  next_state: 'waiting_user',
  response_text: 'He apuntado tu incidencia. Para confirmarla necesito verificar tu identidad.',
  activity_events: ['conv_case_created'],
};

export const mockCanonicalResponseLead: CanonicalResponse = {
  next_state: 'waiting_n8n',
  response_text: 'Gracias por tu interés. He enviado tu consulta al equipo.',
  activity_events: ['conv_lead_created'],
};

export const mockCanonicalResponseHelp: CanonicalResponse = {
  next_state: 'resolved',
  response_text: 'Puedes pagar la mensualidad mediante transferencia bancaria o en recepción.',
  activity_events: ['conv_help_provided'],
};

export const mockCanonicalResponseEscalated: CanonicalResponse = {
  next_state: 'escalated',
  response_text: 'He informado al administrador. Te contactará en breve.',
  activity_events: ['conv_case_escalated'],
};

export const mockCanonicalResponseIdentityRequired: CanonicalResponse = {
  next_state: 'identity_required',
  response_text: '¿Podrías indicarme tu nombre completo y la residencia donde vives?',
  activity_events: ['conv_identity_requested'],
};

// ── Mock de conv-core-publish-activity ───────────────────────────────────────

export const mockPublishActivitySuccess = {
  ok: true,
  status: 200,
  body: { published: true },
};

export const mockPublishActivityFailure = {
  ok: false,
  status: 500,
  body: { error: 'Internal error in activity log' },
};

// ── Mock de conv-core-create-incident ────────────────────────────────────────

export const mockCreateIncidentSuccess = {
  ok: true,
  status: 200,
  body: {
    incident_id: 'inc-mock-0001',
    incident_ref: 'INC-2026-0001',
    conv_case_id: 'conv-case-inc-0001',
  },
};

export const mockCreateIncidentFailure5xx = {
  ok: false,
  status: 500,
  body: { error: 'Database error' },
};
