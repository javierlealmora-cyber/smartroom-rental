/**
 * e2e-wf-sims — Simuladores Node.js de WF-20, WF-30 y WF-40.
 *
 * Implementan los mismos contratos conductuales que las Edge Functions de Deno
 * pero sin depender de Deno ni de una DB real. Usan MemoryStore y CallTracker.
 *
 * Invariantes que reflejan fielmente las fuentes de producción:
 *   - WF-20: STRONG crea incidencia oficial via Core; PARTIAL crea pre-incidencia
 *     sin Core; NO_MATCH devuelve identity_required si hay intentos disponibles.
 *   - WF-30: UNVERIFIED_LEAD se asigna solo aquí; conv_lead_created no contiene PII.
 *   - WF-40: FAQ con confidence >= 0.80 NO crea conv_case; conv_help_escalated no existe.
 *   - Ningún WF introduce: WF-02, WEAK_MATCH, next_retry_at, attempt_count.
 */

import { MemoryStore } from './e2e-memory-store';
import { CallTracker  } from './e2e-call-tracker';

// ── Types ──────────────────────────────────────────────────────────────────

export interface WfInput {
  client_account_id: string;
  session_id:        string;
  message_id:        string;
  channel:           string;
  service_code:      string;
}

export interface WfResult {
  response_type:      string;
  incident_ref?:      string | null;
  lead_ref?:          string | null;
  help_ticket_ref?:   string | null;
  escalation_reason?: string | null;
  kb_answer?:         string | null;
  conv_case_id?:      string | null;
}

export interface Wf20Config {
  coreSuccess?: boolean;   // default true
  incidentRef?: string;    // default 'INC-MOCK-001'
}

export interface Wf30Config {
  intent:        'search_listing' | 'leave_contact' | 'request_visit';
  coreSuccess?:  boolean;
  leadRef?:      string;
}

export interface Wf40Config {
  intent:         'faq' | 'request_human' | 'complaint' | 'account_specific';
  confidence?:    number;   // 0–1, para intent=faq
  ticketSuccess?: boolean;
  ticketRef?:     string;
  kbAnswer?:      string;
}

// ── WF-20: Incidents ───────────────────────────────────────────────────────

const MAX_IDENTITY_ATTEMPTS = 3;

export function simulateWf20(
  store:   MemoryStore,
  tracker: CallTracker,
  input:   WfInput,
  cfg:     Wf20Config = {},
): WfResult {
  const { client_account_id, session_id } = input;
  const session      = store.getSession(session_id)!;
  const level        = session.identity_level;
  const attempts     = session.identity_attempts ?? 0;
  const coreSuccess  = cfg.coreSuccess ?? true;
  const incidentRef  = cfg.incidentRef ?? 'INC-MOCK-001';

  // ── Rama PARTIAL_MATCH_ACTIVE ──────────────────────────────────────────────
  // No llama a conv-core-create-incident. Crea pre-incidencia con status='open'.
  if (level === 'PARTIAL_MATCH_ACTIVE') {
    const c = store.insertCase({
      session_id, client_account_id,
      status:        'open',
      case_ref_type: 'incident',
      service_code:  input.service_code,
    });
    // Fire-and-log: conv_pre_incident_created — sin PII
    store.publishActivity({
      event_type:       'conv_pre_incident_created',
      source:           'smartconversations',
      client_account_id,
      payload: {
        conv_case_id: c.id,
        service_code: input.service_code,
        // NO session_id, profile_id, phone, message_text
      },
    });
    return { response_type: 'success', conv_case_id: c.id };
  }

  // ── Rama MATCH_INACTIVE ────────────────────────────────────────────────────
  if (level === 'MATCH_INACTIVE') {
    store.insertAdminNotif({
      client_account_id,
      event_type: 'case_auto_escalated',
      severity:   'medium',
      context:    { session_id, service_code: input.service_code, reason: 'MATCH_INACTIVE' },
    });
    return { response_type: 'escalated' };
  }

  // ── Rama NO_MATCH ──────────────────────────────────────────────────────────
  if (level === 'NO_MATCH') {
    if (attempts < MAX_IDENTITY_ATTEMPTS) {
      return { response_type: 'identity_required' };
    }
    // Intentos agotados → escalar
    store.insertAdminNotif({
      client_account_id,
      event_type: 'case_auto_escalated',
      severity:   'medium',
      context:    { session_id, reason: 'identity_attempts_exhausted' },
    });
    return { response_type: 'escalated' };
  }

  // ── Rama STRONG_MATCH_ACTIVE ───────────────────────────────────────────────
  const c = store.insertCase({
    session_id, client_account_id,
    status:        'open',
    case_ref_type: 'incident',
    service_code:  input.service_code,
  });

  // Llamar a conv-core-create-incident
  tracker.record('conv-core-create-incident', {
    client_account_id,
    conv_case_id: c.id,
    service_code: input.service_code,
  }, { success: coreSuccess, incident_ref: coreSuccess ? incidentRef : null });

  if (coreSuccess) {
    store.updateCase(c.id, { status: 'waiting_internal', case_ref: incidentRef });

    // Fire-and-log: conv_incident_created — sin PII
    store.publishActivity({
      event_type:       'conv_incident_created',
      source:           'smartconversations',
      client_account_id,
      payload: {
        conv_case_id: c.id,
        incident_ref: incidentRef,
        service_code: input.service_code,
        // NO session_id, profile_id, phone, full_name, message_text, description
      },
    });
    return { response_type: 'success', incident_ref: incidentRef, conv_case_id: c.id };
  }

  return { response_type: 'pending_input', conv_case_id: c.id };
}

// ── WF-30: Listings ────────────────────────────────────────────────────────

const IDENTIFIED_LEVELS_WF30 = new Set(['STRONG_MATCH_ACTIVE', 'PARTIAL_MATCH_ACTIVE']);

export function simulateWf30(
  store:   MemoryStore,
  tracker: CallTracker,
  input:   WfInput,
  cfg:     Wf30Config,
): WfResult {
  const { client_account_id, session_id } = input;
  const session     = store.getSession(session_id)!;
  const coreSuccess = cfg.coreSuccess ?? true;
  const leadRef     = cfg.leadRef ?? 'LEAD-MOCK-001';

  // ── search_listing ─────────────────────────────────────────────────────────
  if (cfg.intent === 'search_listing') {
    tracker.record('conv-core-query-listings', {
      client_account_id, service_code: input.service_code,
    }, { success: true, listings: [] });

    const c = store.insertCase({
      session_id, client_account_id,
      status:        'open',
      case_ref_type: 'lead',
      service_code:  input.service_code,
    });
    // NO conv_lead_created en search_listing
    return { response_type: 'listing_results', conv_case_id: c.id };
  }

  // ── leave_contact / request_visit ─────────────────────────────────────────
  tracker.record('conv-core-create-lead', {
    client_account_id, service_code: input.service_code,
  }, { success: coreSuccess, lead_ref: coreSuccess ? leadRef : null });

  const c = store.insertCase({
    session_id, client_account_id,
    status:        'waiting_internal',
    case_ref_type: 'lead',
    service_code:  input.service_code,
    case_ref:      coreSuccess ? leadRef : null,
  });

  // Asignar UNVERIFIED_LEAD solo si no es inquilino identificado
  if (!IDENTIFIED_LEVELS_WF30.has(session.identity_level)) {
    store.updateSession(session_id, { identity_level: 'UNVERIFIED_LEAD' });
    store.log('info', 'conv-wf30-listings', { event: 'UNVERIFIED_LEAD_assigned', session_id });
  }

  // Fire-and-log: conv_lead_created — sin PII
  store.publishActivity({
    event_type:       'conv_lead_created',
    source:           'smartconversations',
    client_account_id,
    payload: {
      conv_case_id:  c.id,
      lead_ref:      coreSuccess ? leadRef : null,
      service_code:  input.service_code,
      interest_type: cfg.intent,
      // NO session_id, contact, phone, email, name, profile_id
    },
  });

  return { response_type: 'lead_created', lead_ref: coreSuccess ? leadRef : null, conv_case_id: c.id };
}

// ── WF-40: Help ────────────────────────────────────────────────────────────

const KB_CONFIDENCE_THRESHOLD  = 0.80;
const IDENTIFIED_LEVELS_WF40   = new Set(['STRONG_MATCH_ACTIVE', 'PARTIAL_MATCH_ACTIVE']);
// UNVERIFIED_LEAD no da acceso a datos contractuales en WF-40
const LEVEL_UNVERIFIED_LEAD    = 'UNVERIFIED_LEAD';

export function simulateWf40(
  store:   MemoryStore,
  tracker: CallTracker,
  input:   WfInput,
  cfg:     Wf40Config,
): WfResult {
  const { client_account_id, session_id } = input;
  const session       = store.getSession(session_id)!;
  const identityLevel = session.identity_level;

  // ── account_specific sin identidad suficiente ──────────────────────────────
  if (cfg.intent === 'account_specific') {
    if (!IDENTIFIED_LEVELS_WF40.has(identityLevel) || identityLevel === LEVEL_UNVERIFIED_LEAD) {
      return { response_type: 'identity_required' };
    }
  }

  // ── faq ────────────────────────────────────────────────────────────────────
  if (cfg.intent === 'faq') {
    const confidence = cfg.confidence ?? 0.0;
    const kbAnswer   = cfg.kbAnswer ?? '¿En qué más puedo ayudarte?';

    tracker.record('conv-core-query-help-kb', {
      client_account_id, service_code: input.service_code,
    }, { confidence, answer: kbAnswer });

    if (confidence >= KB_CONFIDENCE_THRESHOLD) {
      // Respuesta directa — NO conv_case, NO conv_case_escalated, NO conv_help_escalated
      return { response_type: 'help_answer', kb_answer: kbAnswer };
    }

    // Sin match → escalar con no_kb_match
    const c = store.insertCase({
      session_id, client_account_id,
      status:        'open',
      case_ref_type: 'help_ticket',
      service_code:  input.service_code,
    });
    tracker.record('conv-escalate-case', {
      client_account_id, conv_case_id: c.id, reason: 'no_kb_match',
    }, { escalated: true });

    // Fire-and-log: conv_case_escalated — sin PII
    store.publishActivity({
      event_type:       'conv_case_escalated',
      source:           'smartconversations',
      client_account_id,
      payload: {
        conv_case_id:      c.id,
        escalation_reason: 'no_kb_match',
        case_ref_type:     'help_ticket',
        channel:           input.channel,
        // NO session_id, message_text, summary, answer, profile_id, phone, email
      },
    });
    return { response_type: 'escalated', escalation_reason: 'no_kb_match', conv_case_id: c.id };
  }

  // ── request_human / complaint ──────────────────────────────────────────────
  const c = store.insertCase({
    session_id, client_account_id,
    status:        'open',
    case_ref_type: 'help_ticket',
    service_code:  input.service_code,
  });

  const ticketSuccess = cfg.ticketSuccess ?? true;
  const ticketRef     = cfg.ticketRef     ?? 'TKT-MOCK-001';

  tracker.record('conv-core-create-help-ticket', {
    client_account_id, conv_case_id: c.id, service_code: input.service_code,
  }, { success: ticketSuccess, help_ticket_ref: ticketSuccess ? ticketRef : null });

  if (ticketSuccess) {
    store.updateCase(c.id, { status: 'waiting_internal', case_ref: ticketRef });
    // Fire-and-log: help_ticket_created — sin PII
    store.publishActivity({
      event_type:       'help_ticket_created',
      source:           'smartconversations',
      client_account_id,
      payload: {
        conv_case_id:    c.id,
        help_ticket_ref: ticketRef,
        service_code:    input.service_code,
      },
    });
    return { response_type: 'help_ticket_created', help_ticket_ref: ticketRef, conv_case_id: c.id };
  }

  // Ticket falló → escalar con admin_requested
  tracker.record('conv-escalate-case', {
    client_account_id, conv_case_id: c.id, reason: 'admin_requested',
  }, { escalated: true });

  // Fire-and-log: conv_case_escalated — sin PII
  store.publishActivity({
    event_type:       'conv_case_escalated',
    source:           'smartconversations',
    client_account_id,
    payload: {
      conv_case_id:      c.id,
      escalation_reason: 'admin_requested',
      case_ref_type:     'help_ticket',
      channel:           input.channel,
    },
  });

  return { response_type: 'escalated', escalation_reason: 'admin_requested', conv_case_id: c.id };
}
