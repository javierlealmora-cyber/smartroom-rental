/**
 * Mock de respuestas de n8n workflows.
 * WF-01: recepción WhatsApp → conv-ingest
 * WF-20: gestión de incidencias
 * WF-30: gestión de leads/listings
 * WF-40: gestión de ayuda
 * WF-IDENTITY: validación progresiva de identidad
 */

// ── WF-01 ────────────────────────────────────────────────────────────────────

export const mockN8nWf01AckSuccess = {
  ok: true,
  status: 200,
  body: { received: true },
};

// ── WF-20 — incidencias ──────────────────────────────────────────────────────

export const mockN8nWf20IncidentCreated = {
  ok: true,
  status: 200,
  body: {
    action: 'incident_created',
    incident_id: 'inc-mock-0001',
    incident_ref: 'INC-2026-0001',
    conv_case_id: 'conv-case-inc-0001',
  },
};

export const mockN8nWf20Escalated = {
  ok: true,
  status: 200,
  body: {
    action: 'escalated',
    conv_case_id: 'conv-case-esc-0001',
    escalation_reason: 'identity_unresolved',
  },
};

export const mockN8nWf20Failure = {
  ok: false,
  status: 500,
  body: { error: 'n8n internal error in WF-20' },
};

// ── WF-30 — leads/listings ───────────────────────────────────────────────────

export const mockN8nWf30LeadCreated = {
  ok: true,
  status: 200,
  body: {
    action: 'lead_created',
    lead_id: 'lead-mock-0001',
    lead_ref: 'LEAD-2026-0001',
    listing_id: 'listing-mock-0001',
    conv_case_id: 'conv-case-lead-0001',
  },
};

export const mockN8nWf30Failure = {
  ok: false,
  status: 500,
  body: { error: 'n8n internal error in WF-30' },
};

// ── WF-40 — ayuda ────────────────────────────────────────────────────────────

export const mockN8nWf40HelpProvided = {
  ok: true,
  status: 200,
  body: {
    action: 'help_provided',
    conv_case_id: 'conv-case-help-0001',
    resolution_channel: 'bot',
  },
};

export const mockN8nWf40Escalated = {
  ok: true,
  status: 200,
  body: {
    action: 'escalated',
    conv_case_id: 'conv-case-help-esc-0001',
    escalation_reason: 'unresolved_query',
  },
};

// ── WF-IDENTITY ──────────────────────────────────────────────────────────────

export const mockN8nWfIdentityResolved = {
  ok: true,
  status: 200,
  body: {
    identity_level: 'STRONG_MATCH_ACTIVE',
    resolved: true,
  },
};

export const mockN8nWfIdentityUnresolved = {
  ok: true,
  status: 200,
  body: {
    identity_level: 'NO_MATCH',
    resolved: false,
    attempts_remaining: 2,
  },
};

export const mockN8nWfIdentityAttemptsExhausted = {
  ok: true,
  status: 200,
  body: {
    identity_level: 'NO_MATCH',
    resolved: false,
    attempts_remaining: 0,
  },
};
