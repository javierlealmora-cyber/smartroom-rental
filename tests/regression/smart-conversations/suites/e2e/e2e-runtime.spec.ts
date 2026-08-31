/**
 * Suite: E2E Runtime — Simulaciones conversacionales dinámicas. Fase 9B.
 *
 * Tests ejecutables que simulan el circuito completo:
 *   inbound → dispatch simulado → routing mock → WF-20/30/40 → outbound mock
 *
 * No usa Deno, no usa DB real, no usa n8n/Claude/Core/Wasender real.
 * Usa MemoryStore + CallTracker + simuladores Node.js.
 *
 * Flujos cubiertos:
 *   RT-01..RT-10  — Incidencia STRONG_MATCH_ACTIVE
 *   RT-11..RT-17  — Incidencia NO_MATCH (identity_required)
 *   RT-18..RT-25  — Publicaciones search_listing
 *   RT-26..RT-33  — Publicaciones lead_created
 *   RT-34..RT-41  — Ayuda FAQ resuelta (confidence >= 0.80)
 *   RT-42..RT-49  — WebChat FAQ resuelta
 *   RT-50..RT-57  — Menú dinámico (routing = menu)
 *   RT-58..RT-67  — Multi-turn idempotency
 *   RT-68..RT-74  — Flujos adicionales: context_switch, no_service, WF error
 *   RT-75..RT-80  — Privacidad dinámica cross-flujos
 */

import { describe, it, expect } from 'vitest';
import {
  MemoryStore, ConvCase,
} from '../../helpers/e2e/e2e-memory-store';
import { CallTracker } from '../../helpers/e2e/e2e-call-tracker';
import {
  simulateDispatch,
} from '../../helpers/e2e/e2e-dispatch-sim';
import {
  runTurn, runMockTurn, assertNoPII, assertOutboundNoPII,
  assertActivityNoPII, assertLogsNoPII, assertNoTechJson,
} from '../../helpers/e2e/e2e-turn-runner';

// ── Fixtures ────────────────────────────────────────────────────────────────

const TENANT = 'tenant-e2e-test-001';

const SETUP_INCIDENT_STRONG = {
  tenantId: TENANT,
  session:  { id: 'sess-inc-strong', channel: 'whatsapp' as const, identity_level: 'STRONG_MATCH_ACTIVE' as const },
  message:  { id: 'msg-inc-001', text: 'Tengo una gotera en el baño' },
};
const ROUTING_INCIDENCIAS = {
  responseType: 'routed' as const,
  serviceCode:  'conv_incidencias',
};
const WF_INCIDENT_STRONG = {
  incidents: { coreSuccess: true, incidentRef: 'INC-TEST-001' },
};

// ── Flujo 1 — Incidencia STRONG_MATCH_ACTIVE (RT-01..RT-10) ─────────────────

describe('RT-INCIDENTS-STRONG: incidencia STRONG_MATCH_ACTIVE completa', () => {

  const runStrong = () => runTurn(SETUP_INCIDENT_STRONG, {
    routing: ROUTING_INCIDENCIAS,
    wf:      WF_INCIDENT_STRONG,
  });

  it('RT-01: se llama a conv-routing-engine', () => {
    const r = runStrong();
    expect(r.efWasCalled('conv-routing-engine')).toBe(true);
  });

  it('RT-02: se llama a conv-wf20-incidents', () => {
    const r = runStrong();
    expect(r.efWasCalled('conv-wf20-incidents')).toBe(true);
  });

  it('RT-03: no se llama a conv-wf30-listings ni conv-wf40-help', () => {
    const r = runStrong();
    expect(r.efWasCalled('conv-wf30-listings')).toBe(false);
    expect(r.efWasCalled('conv-wf40-help')).toBe(false);
  });

  it('RT-04: outbound usa conv-send-wa (WhatsApp)', () => {
    const r = runStrong();
    expect(r.outbounds).toHaveLength(1);
    expect(r.outbounds[0].ef_name).toBe('conv-send-wa');
  });

  it('RT-05: no se usa conv-web-deliver en WhatsApp', () => {
    const r = runStrong();
    expect(r.efWasCalled('conv-web-deliver')).toBe(false);
  });

  it('RT-06: inbound queda con status=sent', () => {
    const r = runStrong();
    expect(r.inboundStatus).toBe('sent');
  });

  it('RT-07: outbound text es texto seguro plano (no JSON técnico)', () => {
    const r = runStrong();
    assertNoTechJson(r.outbounds[0].text);
    expect(r.outbounds[0].text).toBeTruthy();
  });

  it('RT-08: se crea exactamente 1 conv_case con case_ref_type=incident', () => {
    const r = runStrong();
    expect(r.cases).toHaveLength(1);
    expect(r.cases[0].case_ref_type).toBe('incident');
  });

  it('RT-09: conv_incident_created publicado sin PII', () => {
    const r = runStrong();
    const evts = r.activityEvents.filter(e => e.event_type === 'conv_incident_created');
    expect(evts).toHaveLength(1);
    assertActivityNoPII(evts);
    // no contiene session_id ni profile_id
    expect(JSON.stringify(evts[0].payload)).not.toContain('session_id');
    expect(JSON.stringify(evts[0].payload)).not.toContain('profile_id');
    expect(JSON.stringify(evts[0].payload)).not.toContain('message_text');
  });

  it('RT-10: outbound payload no contiene PII', () => {
    const r = runStrong();
    assertOutboundNoPII(r.outbounds);
  });

});

// ── Flujo 2 — Incidencia NO_MATCH con intentos disponibles (RT-11..RT-17) ───

describe('RT-INCIDENTS-NOMATCH: NO_MATCH con intentos disponibles', () => {

  const runNoMatch = () => runTurn({
    tenantId: TENANT,
    session:  { id: 'sess-inc-nomatch', channel: 'whatsapp', identity_level: 'NO_MATCH', identity_attempts: 0 },
    message:  { id: 'msg-inc-nm-001', text: 'Hay una gotera' },
  }, {
    routing: ROUTING_INCIDENCIAS,
    wf:      { incidents: {} },
  });

  it('RT-11: WF-20 devuelve identity_required', () => {
    const r = runNoMatch();
    expect(r.dispatchResult.wfResult?.response_type).toBe('identity_required');
  });

  it('RT-12: no se crea conv_case (no incidencia oficial)', () => {
    const r = runNoMatch();
    expect(r.cases).toHaveLength(0);
  });

  it('RT-13: no se llama a conv-core-create-incident', () => {
    const r = runNoMatch();
    expect(r.efWasCalled('conv-core-create-incident')).toBe(false);
  });

  it('RT-14: no se publica conv_incident_created', () => {
    const r = runNoMatch();
    const evts = r.activityEvents.filter(e => e.event_type === 'conv_incident_created');
    expect(evts).toHaveLength(0);
  });

  it('RT-15: outbound pide verificación de identidad', () => {
    const r = runNoMatch();
    expect(r.outbounds[0].text).toContain('identidad');
  });

  it('RT-16: no escala todavía (sin admin_notifications)', () => {
    const r = runNoMatch();
    expect(r.adminNotifs).toHaveLength(0);
  });

  it('RT-17: dispatch completó exitosamente (no error)', () => {
    const r = runNoMatch();
    expect(r.dispatchResult.error).toBeUndefined();
    expect(r.dispatchResult.dispatched).toBe(true);
  });

});

// ── Flujo 3 — Publicaciones search_listing (RT-18..RT-25) ────────────────────

describe('RT-LISTINGS-SEARCH: publicaciones search_listing', () => {

  const runSearch = () => runTurn({
    tenantId: TENANT,
    session:  { id: 'sess-lst-search', channel: 'whatsapp', identity_level: 'NO_MATCH' },
    message:  { id: 'msg-lst-001', text: 'Busco habitación en Madrid' },
  }, {
    routing: { responseType: 'routed', serviceCode: 'conv_publicaciones' },
    wf:      { listings: { intent: 'search_listing' } },
  });

  it('RT-18: se llama a conv-wf30-listings', () => {
    const r = runSearch();
    expect(r.efWasCalled('conv-wf30-listings')).toBe(true);
  });

  it('RT-19: no se llama a conv-wf20-incidents ni conv-wf40-help', () => {
    const r = runSearch();
    expect(r.efWasCalled('conv-wf20-incidents')).toBe(false);
    expect(r.efWasCalled('conv-wf40-help')).toBe(false);
  });

  it('RT-20: outbound contiene texto de resultados', () => {
    const r = runSearch();
    // El mapper traduce listing_results a texto público
    expect(r.outbounds[0].text).toContain('publicaciones');
  });

  it('RT-21: no se publica conv_lead_created en search_listing', () => {
    const r = runSearch();
    const evts = r.activityEvents.filter(e => e.event_type === 'conv_lead_created');
    expect(evts).toHaveLength(0);
  });

  it('RT-22: se crea conv_case type=lead con status=open', () => {
    const r = runSearch();
    const leadCase = r.cases.find((c: ConvCase) => c.case_ref_type === 'lead');
    expect(leadCase).toBeDefined();
    expect(leadCase!.status).toBe('open');
  });

  it('RT-23: outbound no contiene datos internos ni PII', () => {
    const r = runSearch();
    assertOutboundNoPII(r.outbounds);
    assertNoTechJson(r.outbounds[0].text);
  });

  it('RT-24: WF-30 llama a conv-core-query-listings', () => {
    const r = runSearch();
    expect(r.efWasCalled('conv-core-query-listings')).toBe(true);
  });

  it('RT-25: inbound queda sent', () => {
    const r = runSearch();
    expect(r.inboundStatus).toBe('sent');
  });

});

// ── Flujo 4 — Publicaciones lead_created (RT-26..RT-33) ──────────────────────

describe('RT-LISTINGS-LEAD: publicaciones leave_contact / lead_created', () => {

  const runLead = (identityLevel: 'NO_MATCH' | 'STRONG_MATCH_ACTIVE' = 'NO_MATCH') =>
    runTurn({
      tenantId: TENANT,
      session:  { id: `sess-lst-lead-${identityLevel}`, channel: 'whatsapp', identity_level: identityLevel },
      message:  { id: `msg-lst-lead-${identityLevel}`, text: 'Quiero dejar mis datos de contacto' },
    }, {
      routing: { responseType: 'routed', serviceCode: 'conv_publicaciones' },
      wf:      { listings: { intent: 'leave_contact', coreSuccess: true, leadRef: 'LEAD-001' } },
    });

  it('RT-26: dispatch devuelve response_type=routed', () => {
    const r = runLead();
    expect(r.dispatchResult.response_type).toBe('routed');
  });

  it('RT-27: WF-30 devuelve lead_created', () => {
    const r = runLead();
    expect(r.dispatchResult.wfResult?.response_type).toBe('lead_created');
  });

  it('RT-28: conv_lead_created publicado sin contacto ni PII', () => {
    const r = runLead();
    const evts = r.activityEvents.filter(e => e.event_type === 'conv_lead_created');
    expect(evts).toHaveLength(1);
    assertActivityNoPII(evts);
    const s = JSON.stringify(evts[0].payload);
    // No datos de contacto PII — interest_type puede ser 'leave_contact' (nombre del intent)
    expect(s).not.toContain('session_id');
    expect(s).not.toContain('"phone"');
    expect(s).not.toContain('"email"');
    expect(s).not.toContain('"phone_number"');
    expect(s).not.toContain('"full_name"');
    expect(s).not.toContain('"profile_id"');
  });

  it('RT-29: NO_MATCH recibe UNVERIFIED_LEAD tras dejar contacto', () => {
    const r = runLead('NO_MATCH');
    const session = r.store.getSession('sess-lst-lead-NO_MATCH')!;
    expect(session.identity_level).toBe('UNVERIFIED_LEAD');
  });

  it('RT-30: STRONG_MATCH_ACTIVE no recibe UNVERIFIED_LEAD', () => {
    const r = runLead('STRONG_MATCH_ACTIVE');
    const session = r.store.getSession('sess-lst-lead-STRONG_MATCH_ACTIVE')!;
    expect(session.identity_level).toBe('STRONG_MATCH_ACTIVE');
  });

  it('RT-31: UNVERIFIED_LEAD no se trata como STRONG_MATCH_ACTIVE', () => {
    // UNVERIFIED_LEAD en WF-40 no da acceso a datos contractuales
    const r = runTurn({
      tenantId: TENANT,
      session:  { id: 'sess-unverified-check', channel: 'whatsapp', identity_level: 'UNVERIFIED_LEAD' },
      message:  { id: 'msg-unverified-check', text: 'ver mi contrato' },
    }, {
      routing: { responseType: 'routed', serviceCode: 'conv_ayuda' },
      wf:      { help: { intent: 'account_specific' } },
    });
    // UNVERIFIED_LEAD → identity_required
    expect(r.dispatchResult.wfResult?.response_type).toBe('identity_required');
  });

  it('RT-32: outbound del lead no contiene PII', () => {
    const r = runLead();
    assertOutboundNoPII(r.outbounds);
  });

  it('RT-33: se llama a conv-core-create-lead', () => {
    const r = runLead();
    expect(r.efWasCalled('conv-core-create-lead')).toBe(true);
  });

});

// ── Flujo 5 — Ayuda FAQ resuelta (RT-34..RT-41) ──────────────────────────────

describe('RT-HELP-FAQ: ayuda FAQ resuelta con confidence >= 0.80', () => {

  const runFaq = () => runTurn({
    tenantId: TENANT,
    session:  { id: 'sess-help-faq', channel: 'whatsapp', identity_level: 'STRONG_MATCH_ACTIVE' },
    message:  { id: 'msg-help-faq-001', text: '¿Cómo cambio mi contraseña?' },
  }, {
    routing: { responseType: 'routed', serviceCode: 'conv_ayuda' },
    wf:      { help: { intent: 'faq', confidence: 0.92, kbAnswer: 'Ve a configuración y haz clic en cambiar contraseña.' } },
  });

  it('RT-34: se llama a conv-wf40-help', () => {
    const r = runFaq();
    expect(r.efWasCalled('conv-wf40-help')).toBe(true);
  });

  it('RT-35: no se llama a conv-wf20-incidents ni conv-wf30-listings', () => {
    const r = runFaq();
    expect(r.efWasCalled('conv-wf20-incidents')).toBe(false);
    expect(r.efWasCalled('conv-wf30-listings')).toBe(false);
  });

  it('RT-36: WF-40 devuelve help_answer sin crear conv_case', () => {
    const r = runFaq();
    expect(r.dispatchResult.wfResult?.response_type).toBe('help_answer');
    expect(r.cases).toHaveLength(0);
  });

  it('RT-37: no se publica conv_case_escalated', () => {
    const r = runFaq();
    const evts = r.activityEvents.filter(e => e.event_type === 'conv_case_escalated');
    expect(evts).toHaveLength(0);
  });

  it('RT-38: no existe conv_help_escalated en ningún evento', () => {
    const r = runFaq();
    for (const e of r.activityEvents) {
      expect(e.event_type).not.toBe('conv_help_escalated');
    }
  });

  it('RT-39: outbound contiene respuesta pública sin JSON técnico', () => {
    const r = runFaq();
    assertNoTechJson(r.outbounds[0].text);
    assertNoPII(r.outbounds[0].text, 'faq outbound text');
  });

  it('RT-40: se llama a conv-core-query-help-kb', () => {
    const r = runFaq();
    expect(r.efWasCalled('conv-core-query-help-kb')).toBe(true);
  });

  it('RT-41: inbound queda sent', () => {
    const r = runFaq();
    expect(r.inboundStatus).toBe('sent');
  });

});

// ── Flujo 6 — WebChat FAQ resuelta (RT-42..RT-49) ────────────────────────────

describe('RT-WEBCHAT-FAQ: ayuda FAQ resuelta por canal webchat', () => {

  const runWebchat = () => runTurn({
    tenantId: TENANT,
    session:  { id: 'sess-web-faq', channel: 'webchat', identity_level: 'STRONG_MATCH_ACTIVE' },
    message:  { id: 'msg-web-faq-001', text: '¿Cómo funciona el sistema de pagos?', channel: 'webchat' },
  }, {
    routing: { responseType: 'routed', serviceCode: 'conv_ayuda' },
    wf:      { help: { intent: 'faq', confidence: 0.88, kbAnswer: 'Los pagos son mensuales.' } },
  });

  it('RT-42: outbound usa conv-web-deliver (WebChat)', () => {
    const r = runWebchat();
    expect(r.outbounds).toHaveLength(1);
    expect(r.outbounds[0].ef_name).toBe('conv-web-deliver');
  });

  it('RT-43: no usa conv-send-wa', () => {
    const r = runWebchat();
    expect(r.efWasCalled('conv-send-wa')).toBe(false);
  });

  it('RT-44: tracker no contiene @c.us ni @s.whatsapp.net', () => {
    const r = runWebchat();
    const allCalls = JSON.stringify(r.tracker.getAllCalledEfs());
    expect(allCalls).not.toContain('@c.us');
    expect(allCalls).not.toContain('@s.whatsapp.net');
  });

  it('RT-45: outbound payload no contiene sender_ref', () => {
    const r = runWebchat();
    for (const o of r.outbounds) {
      expect(JSON.stringify(o)).not.toContain('sender_ref');
    }
  });

  it('RT-46: conv-routing-engine fue llamado', () => {
    const r = runWebchat();
    expect(r.efWasCalled('conv-routing-engine')).toBe(true);
  });

  it('RT-47: WF devuelve help_answer sin conv_case', () => {
    const r = runWebchat();
    expect(r.dispatchResult.wfResult?.response_type).toBe('help_answer');
    expect(r.cases).toHaveLength(0);
  });

  it('RT-48: outbound text seguro sin PII ni JSON técnico', () => {
    const r = runWebchat();
    assertOutboundNoPII(r.outbounds);
    assertNoTechJson(r.outbounds[0].text);
  });

  it('RT-49: inbound queda sent', () => {
    const r = runWebchat();
    expect(r.inboundStatus).toBe('sent');
  });

});

// ── Flujo 7 — Menú dinámico (RT-50..RT-57) ────────────────────────────────────

describe('RT-MENU: menú dinámico — routing devuelve menu', () => {

  const MENU_OPTIONS = [
    { service_code: 'conv_incidencias',   label: 'Incidencias' },
    { service_code: 'conv_publicaciones', label: 'Alojamientos' },
    { service_code: 'conv_ayuda',         label: 'Ayuda' },
  ];

  const runMenu = () => runTurn({
    tenantId: TENANT,
    session:  { id: 'sess-menu-001', channel: 'whatsapp', identity_level: 'NO_MATCH' },
    message:  { id: 'msg-menu-001', text: 'hola' },
  }, {
    routing: { responseType: 'menu', options: MENU_OPTIONS },
  });

  it('RT-50: no se llama a conv-wf20-incidents', () => {
    const r = runMenu();
    expect(r.efWasCalled('conv-wf20-incidents')).toBe(false);
  });

  it('RT-51: no se llama a conv-wf30-listings', () => {
    const r = runMenu();
    expect(r.efWasCalled('conv-wf30-listings')).toBe(false);
  });

  it('RT-52: no se llama a conv-wf40-help', () => {
    const r = runMenu();
    expect(r.efWasCalled('conv-wf40-help')).toBe(false);
  });

  it('RT-53: outbound contiene texto de menú con opciones', () => {
    const r = runMenu();
    expect(r.outbounds[0].text).toContain('Incidencias');
    expect(r.outbounds[0].text).toContain('Alojamientos');
    expect(r.outbounds[0].text).toContain('Ayuda');
  });

  it('RT-54: no se crea conv_case', () => {
    const r = runMenu();
    expect(r.cases).toHaveLength(0);
  });

  it('RT-55: no se publica Activity Log', () => {
    const r = runMenu();
    expect(r.activityEvents).toHaveLength(0);
  });

  it('RT-56: menú no contiene service_codes ni IDs internos en texto', () => {
    const r = runMenu();
    // El texto del menú usa labels, no service_codes
    expect(r.outbounds[0].text).not.toContain('conv_incidencias');
    expect(r.outbounds[0].text).not.toContain('conv_publicaciones');
    expect(r.outbounds[0].text).not.toContain('conv_ayuda');
  });

  it('RT-57: conv-routing-engine fue llamado una vez', () => {
    const r = runMenu();
    expect(r.efCallCount('conv-routing-engine')).toBe(1);
  });

});

// ── Flujo 8 — Multi-turn idempotency (RT-58..RT-67) ──────────────────────────

describe('RT-IDEMPOTENCY: multi-turn e idempotencia correcta', () => {

  it('RT-58: mensaje B se procesa aunque exista outbound de mensaje A (no outboundCount)', () => {
    const store   = new MemoryStore();
    const tracker = new CallTracker();

    // Turno A
    runMockTurn(store, tracker, {
      tenantId: TENANT,
      session:  { id: 'sess-mt-001', channel: 'whatsapp', identity_level: 'STRONG_MATCH_ACTIVE' },
      message:  { id: 'msg-A-001', text: 'gotera' },
    }, {
      routing: ROUTING_INCIDENCIAS,
      wf:      WF_INCIDENT_STRONG,
    });

    // Verificar que A se procesó y hay outbound de A
    const outboundsAfterA = store.getOutboundsForSession('sess-mt-001');
    expect(outboundsAfterA).toHaveLength(1);

    // Turno B — mismo tenant/sesión, mensaje diferente
    const trackerB = new CallTracker();
    store.upsertMessage({
      id: 'msg-B-001', session_id: 'sess-mt-001', client_account_id: TENANT,
      direction: 'inbound', channel: 'whatsapp', status: 'received', message_text: '¿cuándo lo arreglan?',
    });
    // simulateDispatch already imported at top
    simulateDispatch(store, trackerB, {
      client_account_id: TENANT, session_id: 'sess-mt-001', message_id: 'msg-B-001',
      routing: ROUTING_INCIDENCIAS,
      wf: WF_INCIDENT_STRONG,
    });

    // B se procesó: ahora hay 2 outbounds
    const outboundsAfterB = store.getOutboundsForSession('sess-mt-001');
    expect(outboundsAfterB).toHaveLength(2);
  });

  it('RT-59: dispatch de msg-A (sent) devuelve idempotent=true', () => {
    const r = runTurn(SETUP_INCIDENT_STRONG, {
      routing: ROUTING_INCIDENCIAS,
      wf: WF_INCIDENT_STRONG,
    });
    // Primer dispatch exitoso
    expect(r.inboundStatus).toBe('sent');
    expect(r.dispatchResult.dispatched).toBe(true);

    // Segundo dispatch del mismo mensaje (ya status=sent)
    // simulateDispatch already imported at top
    const result2 = simulateDispatch(r.store, r.tracker, {
      client_account_id: TENANT, session_id: SETUP_INCIDENT_STRONG.session.id,
      message_id: SETUP_INCIDENT_STRONG.message.id,
      routing: ROUTING_INCIDENCIAS,
      wf: WF_INCIDENT_STRONG,
    });
    expect(result2.idempotent).toBe(true);
    expect(result2.decision).toBe('already_sent');
  });

  it('RT-60: mismo message_id sent no duplica outbound', () => {
    const r = runTurn(SETUP_INCIDENT_STRONG, {
      routing: ROUTING_INCIDENCIAS,
      wf: WF_INCIDENT_STRONG,
    });
    const outboundsBefore = r.outbounds.length;

    // Re-dispatch (idempotente)
    // simulateDispatch already imported at top
    simulateDispatch(r.store, r.tracker, {
      client_account_id: TENANT, session_id: SETUP_INCIDENT_STRONG.session.id,
      message_id: SETUP_INCIDENT_STRONG.message.id,
      routing: ROUTING_INCIDENCIAS, wf: WF_INCIDENT_STRONG,
    });
    const outboundsAfter = r.store.getOutboundsForSession(SETUP_INCIDENT_STRONG.session.id).length;
    expect(outboundsAfter).toBe(outboundsBefore);
  });

  it('RT-61: mismo message_id sent no duplica casos', () => {
    const r = runTurn(SETUP_INCIDENT_STRONG, {
      routing: ROUTING_INCIDENCIAS,
      wf: WF_INCIDENT_STRONG,
    });
    const casesBefore = r.cases.length;

    // simulateDispatch already imported at top
    simulateDispatch(r.store, r.tracker, {
      client_account_id: TENANT, session_id: SETUP_INCIDENT_STRONG.session.id,
      message_id: SETUP_INCIDENT_STRONG.message.id,
      routing: ROUTING_INCIDENCIAS, wf: WF_INCIDENT_STRONG,
    });
    const casesAfter = r.store.getCasesForSession(SETUP_INCIDENT_STRONG.session.id).length;
    expect(casesAfter).toBe(casesBefore);
  });

  it('RT-62: status=processing devuelve already_processing', () => {
    const store = new MemoryStore();
    // simulateDispatch already imported at top
    store.upsertSession({
      id: 'sess-proc', client_account_id: TENANT, channel: 'whatsapp',
      identity_level: 'STRONG_MATCH_ACTIVE', state: 'active',
      active_case_id: null, active_service_code: null, identity_attempts: 0,
    });
    store.upsertMessage({
      id: 'msg-proc', session_id: 'sess-proc', client_account_id: TENANT,
      direction: 'inbound', channel: 'whatsapp',
      status: 'processing', message_text: 'gotera',
    });
    const tracker = new CallTracker();
    const result = simulateDispatch(store, tracker, {
      client_account_id: TENANT, session_id: 'sess-proc', message_id: 'msg-proc',
      routing: ROUTING_INCIDENCIAS, wf: WF_INCIDENT_STRONG,
    });
    expect(result.idempotent).toBe(true);
    expect(result.decision).toBe('already_processing');
    // No se llamó a routing
    expect(tracker.wasCalled('conv-routing-engine')).toBe(false);
  });

  it('RT-63: status=failed devuelve previously_failed', () => {
    const store = new MemoryStore();
    // simulateDispatch already imported at top
    store.upsertSession({
      id: 'sess-fail', client_account_id: TENANT, channel: 'whatsapp',
      identity_level: 'STRONG_MATCH_ACTIVE', state: 'active',
      active_case_id: null, active_service_code: null, identity_attempts: 0,
    });
    store.upsertMessage({
      id: 'msg-fail', session_id: 'sess-fail', client_account_id: TENANT,
      direction: 'inbound', channel: 'whatsapp',
      status: 'failed', message_text: 'gotera',
    });
    const tracker = new CallTracker();
    const result = simulateDispatch(store, tracker, {
      client_account_id: TENANT, session_id: 'sess-fail', message_id: 'msg-fail',
      routing: ROUTING_INCIDENCIAS, wf: WF_INCIDENT_STRONG,
    });
    expect(result.idempotent).toBe(true);
    expect(result.decision).toBe('previously_failed');
  });

  it('RT-64: UPDATE condicional: un segundo dispatch concurrente devuelve already_processing', () => {
    const store   = new MemoryStore();
    // simulateDispatch already imported at top
    store.upsertSession({
      id: 'sess-conc', client_account_id: TENANT, channel: 'whatsapp',
      identity_level: 'STRONG_MATCH_ACTIVE', state: 'active',
      active_case_id: null, active_service_code: null, identity_attempts: 0,
    });
    store.upsertMessage({
      id: 'msg-conc', session_id: 'sess-conc', client_account_id: TENANT,
      direction: 'inbound', channel: 'whatsapp',
      status: 'received', message_text: 'gotera',
    });
    // Simular que otra instancia ya actualizó el status a 'processing'
    store.updateMessageStatus('msg-conc', 'processing');

    const tracker = new CallTracker();
    const result = simulateDispatch(store, tracker, {
      client_account_id: TENANT, session_id: 'sess-conc', message_id: 'msg-conc',
      routing: ROUTING_INCIDENCIAS, wf: WF_INCIDENT_STRONG,
    });
    // Ya estaba 'processing' → idempotente
    expect(result.idempotent).toBe(true);
  });

  it('RT-65: force=true procesa aunque status=sent', () => {
    const r = runTurn(SETUP_INCIDENT_STRONG, {
      routing: ROUTING_INCIDENCIAS, wf: WF_INCIDENT_STRONG,
    });
    expect(r.inboundStatus).toBe('sent');

    // simulateDispatch already imported at top
    const result2 = simulateDispatch(r.store, r.tracker, {
      client_account_id: TENANT, session_id: SETUP_INCIDENT_STRONG.session.id,
      message_id: SETUP_INCIDENT_STRONG.message.id,
      force: true,
      routing: ROUTING_INCIDENCIAS, wf: WF_INCIDENT_STRONG,
    });
    // Con force=true, se procesa aunque status=sent
    expect(result2.dispatched).toBe(true);
  });

});

// ── Flujos adicionales: context_switch, no_service, WF error (RT-68..RT-74) ──

describe('RT-ADDITIONAL: context_switch, no_service, WF error', () => {

  it('RT-68: context_switch_confirmation no llama WF y no cambia active_service_code', () => {
    const r = runTurn({
      tenantId: TENANT,
      session: { id: 'sess-ctx', channel: 'whatsapp', identity_level: 'NO_MATCH', active_service_code: 'conv_incidencias' },
      message: { id: 'msg-ctx-001', text: 'quiero alojamiento' },
    }, { routing: { responseType: 'context_switch_confirmation' } });

    expect(r.efWasCalled('conv-wf20-incidents')).toBe(false);
    expect(r.efWasCalled('conv-wf30-listings')).toBe(false);
    expect(r.efWasCalled('conv-wf40-help')).toBe(false);
    // active_service_code no cambia
    const sess = r.store.getSession('sess-ctx')!;
    expect(sess.active_service_code).toBe('conv_incidencias');
    expect(r.outbounds[0].text).toContain('cambiar');
  });

  it('RT-69: no_service no llama WF y da respuesta segura', () => {
    const r = runTurn({
      tenantId: TENANT,
      session: { id: 'sess-nosvc', channel: 'whatsapp', identity_level: 'NO_MATCH' },
      message: { id: 'msg-nosvc-001', text: 'hola' },
    }, { routing: { responseType: 'no_service' } });

    expect(r.efWasCalled('conv-wf20-incidents')).toBe(false);
    expect(r.efWasCalled('conv-wf30-listings')).toBe(false);
    expect(r.efWasCalled('conv-wf40-help')).toBe(false);
    expect(r.outbounds[0].text).toContain('activos');
    assertNoTechJson(r.outbounds[0].text);
  });

  it('RT-70: WF-40 FAQ sin match escala con no_kb_match y outbound es texto seguro', () => {
    const r = runTurn({
      tenantId: TENANT,
      session: { id: 'sess-faq-miss', channel: 'whatsapp', identity_level: 'STRONG_MATCH_ACTIVE' },
      message: { id: 'msg-faq-miss-001', text: 'pregunta muy rara' },
    }, {
      routing: { responseType: 'routed', serviceCode: 'conv_ayuda' },
      wf: { help: { intent: 'faq', confidence: 0.3 } },
    });

    expect(r.dispatchResult.wfResult?.response_type).toBe('escalated');
    expect(r.dispatchResult.wfResult?.escalation_reason).toBe('no_kb_match');
    assertNoTechJson(r.outbounds[0].text);
    expect(r.cases).toHaveLength(1);
    // conv_case_escalated publicado
    expect(r.activityEvents.filter(e => e.event_type === 'conv_case_escalated')).toHaveLength(1);
  });

  it('RT-71: WF-40 request_human crea ticket — outbound confirma ticket', () => {
    const r = runTurn({
      tenantId: TENANT,
      session: { id: 'sess-human', channel: 'whatsapp', identity_level: 'STRONG_MATCH_ACTIVE' },
      message: { id: 'msg-human-001', text: 'quiero hablar con alguien' },
    }, {
      routing: { responseType: 'routed', serviceCode: 'conv_ayuda' },
      wf: { help: { intent: 'request_human', ticketSuccess: true, ticketRef: 'TKT-001' } },
    });

    expect(r.dispatchResult.wfResult?.response_type).toBe('help_ticket_created');
    expect(r.efWasCalled('conv-core-create-help-ticket')).toBe(true);
    assertNoTechJson(r.outbounds[0].text);
    // Caso queda waiting_internal
    expect(r.cases[0].status).toBe('waiting_internal');
  });

  it('RT-72: WF-20 PARTIAL crea pre-incidencia sin Core — no conv_incident_created', () => {
    const r = runTurn({
      tenantId: TENANT,
      session: { id: 'sess-partial', channel: 'whatsapp', identity_level: 'PARTIAL_MATCH_ACTIVE' },
      message: { id: 'msg-partial-001', text: 'hay un problema' },
    }, {
      routing: ROUTING_INCIDENCIAS,
      wf: { incidents: {} },
    });

    expect(r.efWasCalled('conv-core-create-incident')).toBe(false);
    const evts = r.activityEvents.filter(e => e.event_type === 'conv_incident_created');
    expect(evts).toHaveLength(0);
    const preEvts = r.activityEvents.filter(e => e.event_type === 'conv_pre_incident_created');
    expect(preEvts).toHaveLength(1);
  });

  it('RT-73: WF-20 MATCH_INACTIVE crea admin_notification y no crea conv_case', () => {
    const r = runTurn({
      tenantId: TENANT,
      session: { id: 'sess-inactive', channel: 'whatsapp', identity_level: 'MATCH_INACTIVE' },
      message: { id: 'msg-inactive-001', text: 'tengo un problema' },
    }, {
      routing: ROUTING_INCIDENCIAS,
      wf: { incidents: {} },
    });

    expect(r.adminNotifs).toHaveLength(1);
    expect(r.cases).toHaveLength(0);
    expect(r.efWasCalled('conv-core-create-incident')).toBe(false);
  });

  it('RT-74: help ticket fallido escala con admin_requested', () => {
    const r = runTurn({
      tenantId: TENANT,
      session: { id: 'sess-ticket-fail', channel: 'whatsapp', identity_level: 'STRONG_MATCH_ACTIVE' },
      message: { id: 'msg-ticket-fail-001', text: 'necesito ayuda urgente' },
    }, {
      routing: { responseType: 'routed', serviceCode: 'conv_ayuda' },
      wf: { help: { intent: 'request_human', ticketSuccess: false } },
    });

    expect(r.dispatchResult.wfResult?.escalation_reason).toBe('admin_requested');
    const escalEvts = r.activityEvents.filter(e => e.event_type === 'conv_case_escalated');
    expect(escalEvts).toHaveLength(1);
    expect(JSON.stringify(escalEvts[0].payload)).toContain('admin_requested');
  });

});

// ── Privacidad dinámica cross-flujos (RT-75..RT-80) ───────────────────────────

describe('RT-PRIVACY: privacidad dinámica en todos los flujos', () => {

  it('RT-75: outbound de todos los flujos no contiene PII', () => {
    const flows = [
      runTurn(SETUP_INCIDENT_STRONG, { routing: ROUTING_INCIDENCIAS, wf: WF_INCIDENT_STRONG }),
      runTurn({
        tenantId: TENANT,
        session: { id: 'sess-prv-lst', channel: 'whatsapp', identity_level: 'NO_MATCH' },
        message: { id: 'msg-prv-lst', text: 'busco habitación' },
      }, { routing: { responseType: 'routed', serviceCode: 'conv_publicaciones' }, wf: { listings: { intent: 'search_listing' } } }),
      runTurn({
        tenantId: TENANT,
        session: { id: 'sess-prv-faq', channel: 'whatsapp', identity_level: 'STRONG_MATCH_ACTIVE' },
        message: { id: 'msg-prv-faq', text: '¿dónde está el portal?' },
      }, { routing: { responseType: 'routed', serviceCode: 'conv_ayuda' }, wf: { help: { intent: 'faq', confidence: 0.95 } } }),
    ];
    for (const r of flows) {
      assertOutboundNoPII(r.outbounds);
    }
  });

  it('RT-76: Activity Log de todos los flujos no contiene PII', () => {
    const r1 = runTurn(SETUP_INCIDENT_STRONG, { routing: ROUTING_INCIDENCIAS, wf: WF_INCIDENT_STRONG });
    const r2 = runTurn({
      tenantId: TENANT,
      session: { id: 'sess-prv2-lst', channel: 'whatsapp', identity_level: 'NO_MATCH' },
      message: { id: 'msg-prv2-lst', text: 'quiero dejar datos' },
    }, { routing: { responseType: 'routed', serviceCode: 'conv_publicaciones' }, wf: { listings: { intent: 'leave_contact', leadRef: 'L-01' } } });

    assertActivityNoPII(r1.activityEvents);
    assertActivityNoPII(r2.activityEvents);
  });

  it('RT-77: logs mock no contienen message_text, sender_ref, phone, profile_id, identity_data', () => {
    const r = runTurn(SETUP_INCIDENT_STRONG, { routing: ROUTING_INCIDENCIAS, wf: WF_INCIDENT_STRONG });
    assertLogsNoPII(r.store);
  });

  it('RT-78: admin_notifications no contienen PII del inquilino', () => {
    const r = runTurn({
      tenantId: TENANT,
      session: { id: 'sess-prv-inactive', channel: 'whatsapp', identity_level: 'MATCH_INACTIVE' },
      message: { id: 'msg-prv-inactive', text: 'problema' },
    }, { routing: ROUTING_INCIDENCIAS, wf: { incidents: {} } });

    for (const n of r.adminNotifs) {
      const s = JSON.stringify(n.context);
      expect(s).not.toContain('profile_id');
      expect(s).not.toContain('phone');
      expect(s).not.toContain('full_name');
      expect(s).not.toContain('identity_data');
      expect(s).not.toContain('message_text');
    }
  });

  it('RT-79: ningún flujo llama a n8n, Claude, Core real, Wasender real o WebChat real', () => {
    const BAD_PATTERNS = ['n8n.io', 'anthropic', 'wasender.io', 'messages.create'];
    const flows = [
      runTurn(SETUP_INCIDENT_STRONG, { routing: ROUTING_INCIDENCIAS, wf: WF_INCIDENT_STRONG }),
      runTurn({
        tenantId: TENANT,
        session: { id: 'sess-bad-web', channel: 'webchat', identity_level: 'NO_MATCH' },
        message: { id: 'msg-bad-web', text: 'hola', channel: 'webchat' },
      }, { routing: { responseType: 'routed', serviceCode: 'conv_ayuda' }, wf: { help: { intent: 'faq', confidence: 0.9 } } }),
    ];
    for (const r of flows) {
      const allCallsSerialized = JSON.stringify(r.calledEfs);
      for (const pattern of BAD_PATTERNS) {
        expect(allCallsSerialized).not.toContain(pattern);
      }
    }
  });

  it('RT-80: ningún simulador introduce WF-02, conv_help_escalated, WEAK_MATCH ni next_retry_at', () => {
    const r = runTurn({
      tenantId: TENANT,
      session: { id: 'sess-restrict', channel: 'whatsapp', identity_level: 'STRONG_MATCH_ACTIVE' },
      message: { id: 'msg-restrict', text: 'prueba restricciones' },
    }, {
      routing: { responseType: 'routed', serviceCode: 'conv_ayuda' },
      wf: { help: { intent: 'request_human', ticketSuccess: false } },
    });

    const allSerialized = JSON.stringify({
      calledEfs:      r.calledEfs,
      activityEvents: r.activityEvents,
      adminNotifs:    r.adminNotifs,
      cases:          r.cases,
    });

    expect(allSerialized).not.toContain('WF-02');
    expect(allSerialized).not.toContain('conv_help_escalated');
    expect(allSerialized).not.toContain('WEAK_MATCH');
    expect(allSerialized).not.toContain('next_retry_at');
    expect(allSerialized).not.toContain('attempt_count');
  });

});
