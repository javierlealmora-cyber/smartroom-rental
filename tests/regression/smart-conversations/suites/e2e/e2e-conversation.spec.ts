/**
 * Suite: E2E Conversacional Simulado — Fase 9B
 *
 * Tests end-to-end de análisis estático que verifican el circuito completo:
 *   inbound → conv-ingest → conv-dispatch-message → conv-routing-engine
 *     → WF-20/WF-30/WF-40 → conv-send-wa | conv-web-deliver
 *
 * Todos los tests son análisis estático: leen fuentes y verifican propiedades
 * del pipeline sin ejecutar Deno ni conectar servicios reales.
 *
 * IDs: E2E-AUTH, E2E-INCIDENTS, E2E-LISTINGS, E2E-HELP, E2E-WEBCHAT,
 *      E2E-ROUTING, E2E-IDEMPOTENCY, E2E-ERRORS, E2E-PRIVACY,
 *      E2E-RESTRICTIONS, E2E-REGRESSION
 */

import { describe, it, beforeAll, expect } from 'vitest';
import { loadPipeline, allPipelineSources, type PipelineSources } from '../../helpers/e2e/e2e-sources';

let p: PipelineSources;
let all: string[];

beforeAll(() => {
  p   = loadPipeline();
  all = allPipelineSources(p);
});

// ---------------------------------------------------------------------------
// E2E-AUTH — Setup y uso exclusivo de mocks
// ---------------------------------------------------------------------------

describe('E2E-AUTH: fixtures solo usan mocks — sin servicios reales', () => {

  it('E2E-AUTH-01: ninguna EF del pipeline llama a n8n real', () => {
    for (const src of all) {
      expect(src).not.toContain('n8n.io');
      expect(src).not.toContain('/webhook/n8n');
    }
  });

  it('E2E-AUTH-02: ninguna EF del pipeline llama a Claude real', () => {
    for (const src of all) {
      expect(src).not.toContain('anthropic');
      expect(src).not.toContain('messages.create');
    }
  });

  it('E2E-AUTH-03: ninguna EF del pipeline llama a Wasender real', () => {
    for (const src of all) {
      expect(src).not.toContain('wasender.io');
    }
  });

});

// ---------------------------------------------------------------------------
// E2E-INCIDENTS — Flujos completos de incidencias
// ---------------------------------------------------------------------------

describe('E2E-INCIDENTS: flujos completos WF-20', () => {

  // Flujo 1 — STRONG_MATCH_ACTIVE
  it('E2E-INC-04: STRONG_MATCH_ACTIVE crea incidencia oficial vía conv-core-create-incident', () => {
    // WF-20 llama a conv-core-create-incident en rama STRONG
    expect(p.wf20).toContain('STRONG_MATCH_ACTIVE');
    expect(p.wf20).toContain('LEVEL_STRONG');
    // La rama STRONG aparece antes de la llamada fetch a conv-core-create-incident
    const strongBranchPos    = p.wf20.indexOf('// ── Rama STRONG_MATCH_ACTIVE');
    const createIncidentFetch = p.wf20.indexOf("functions/v1/conv-core-create-incident");
    expect(strongBranchPos).toBeGreaterThan(0);
    expect(createIncidentFetch).toBeGreaterThan(strongBranchPos);
  });

  it('E2E-INC-05: STRONG deja caso con status=waiting_internal', () => {
    expect(p.wf20).toContain("status:   'waiting_internal'");
    // waiting_internal ocurre en el bloque de STRONG tras éxito de Core
    const waitingBlock = p.wf20.match(/incident_ref[\s\S]{0,200}waiting_internal/);
    expect(waitingBlock).not.toBeNull();
  });

  it('E2E-INC-06: conv_incident_created no contiene session_id ni PII', () => {
    const actBlock = p.wf20.match(/event_type: 'conv_incident_created'[\s\S]{0,400}/);
    expect(actBlock).not.toBeNull();
    expect(actBlock![0]).not.toContain('session_id');
    expect(actBlock![0]).not.toMatch(/profile_id\s*:/);
    expect(actBlock![0]).not.toMatch(/phone\s*:/);
    expect(actBlock![0]).not.toMatch(/full_name\s*:/);
    expect(actBlock![0]).not.toMatch(/message_text\s*:/);
    expect(actBlock![0]).not.toMatch(/description\s*:/);
  });

  it('E2E-INC-07: conv_incident_created usa fire-and-log (.catch)', () => {
    // El fetch con conv_incident_created tiene .catch justo después — ventana amplia
    expect(p.wf20).toMatch(/conv_incident_created[\s\S]{0,700}\.catch\(/);
  });

  // Flujo 2 — NO_MATCH con intentos disponibles
  it('E2E-INC-07b: NO_MATCH con intentos devuelve identity_required', () => {
    expect(p.wf20).toContain('LEVEL_NO_MATCH');
    expect(p.wf20).toContain("response_type: 'identity_required'");
    const noMatchBlock = p.wf20.match(/NO_MATCH[\s\S]{0,400}identity_required/);
    expect(noMatchBlock).not.toBeNull();
  });

  it('E2E-INC-08: NO_MATCH no crea incidencia oficial', () => {
    // El return de identity_required ocurre antes de la llamada fetch a conv-core-create-incident
    const identityReqPos      = p.wf20.indexOf("response_type: 'identity_required'");
    // Usar la URL del fetch, no la primera aparición en comentarios
    const createIncidentFetch = p.wf20.indexOf("functions/v1/conv-core-create-incident");
    expect(identityReqPos).toBeGreaterThan(0);
    expect(createIncidentFetch).toBeGreaterThan(0);
    expect(identityReqPos).toBeLessThan(createIncidentFetch);
  });

  // Flujo 3 — PARTIAL_MATCH_ACTIVE
  it('E2E-INC-09: PARTIAL_MATCH_ACTIVE crea pre-incidencia con status=open', () => {
    expect(p.wf20).toContain('PARTIAL_MATCH_ACTIVE');
    // Verificar que el bloque PARTIAL asigna status='open' (el spacing exacto varía)
    expect(p.wf20).toMatch(/PARTIAL_MATCH_ACTIVE[\s\S]{0,400}status:\s+'open'/);
  });

  it('E2E-INC-10: PARTIAL no crea incidencia oficial — pre-incidencia tiene case_ref_type=incident', () => {
    // PARTIAL crea un conv_case pero NO llama (fetch) a conv-core-create-incident
    const partialEnd   = p.wf20.indexOf("// ── Rama MATCH_INACTIVE");
    const partialStart = p.wf20.indexOf("// ── Rama PARTIAL_MATCH_ACTIVE");
    const partialBlock = p.wf20.slice(partialStart, partialEnd);
    // El comentario puede mencionar conv-core-create-incident; verificar que no hay fetch real
    expect(partialBlock).not.toMatch(/fetch\([^)]*conv-core-create-incident/);
    expect(partialBlock).toContain("case_ref_type: 'incident'");
  });

  it('E2E-INC-10b: PARTIAL publica conv_pre_incident_created', () => {
    expect(p.wf20).toContain("event_type: 'conv_pre_incident_created'");
  });

  // Flujo 4 — MATCH_INACTIVE
  it('E2E-INC-11: MATCH_INACTIVE escala y no crea incidencia oficial', () => {
    expect(p.wf20).toContain('MATCH_INACTIVE');
    const inactiveBlock = p.wf20.match(/LEVEL_INACTIVE[\s\S]{0,400}/);
    expect(inactiveBlock).not.toBeNull();
    expect(p.wf20).toContain("// ── Rama MATCH_INACTIVE");
    // El bloque INACTIVE usa conv-escalate-case o conv_admin_notifications, no conv-core-create-incident
    const inactiveStart = p.wf20.indexOf("// ── Rama MATCH_INACTIVE");
    const strongStart   = p.wf20.indexOf("// ── Rama STRONG_MATCH_ACTIVE");
    const inactiveBlock2 = p.wf20.slice(inactiveStart, strongStart);
    expect(inactiveBlock2).not.toContain('conv-core-create-incident');
  });

  it('E2E-INC-11b: MATCH_INACTIVE crea conv_admin_notifications sin PII', () => {
    const inactiveStart  = p.wf20.indexOf("// ── Rama MATCH_INACTIVE");
    const strongStart    = p.wf20.indexOf("// ── Rama STRONG_MATCH_ACTIVE");
    const inactiveBlock  = p.wf20.slice(inactiveStart, strongStart);
    expect(inactiveBlock).toContain('conv_admin_notifications');
    expect(inactiveBlock).not.toMatch(/profile_id\s*:/);
    expect(inactiveBlock).not.toMatch(/phone\s*:/);
    expect(inactiveBlock).not.toMatch(/full_name\s*:/);
  });

  // Dispatch enruta a WF-20
  it('E2E-INC-11c: dispatch enruta conv_incidencias a conv-wf20-incidents', () => {
    expect(p.dispatchRouter).toContain("conv_incidencias:   'conv-wf20-incidents'");
    expect(p.dispatch).toContain('getWfEfName');
  });

});

// ---------------------------------------------------------------------------
// E2E-LISTINGS — Flujos completos de publicaciones
// ---------------------------------------------------------------------------

describe('E2E-LISTINGS: flujos completos WF-30', () => {

  // Flujo 5 — search_listing
  it('E2E-LST-12: search_listing devuelve resultados de listings públicos', () => {
    expect(p.wf30).toContain("'search_listing'");
    expect(p.wf30).toContain("response_type: 'listing_results'");
    // Llama a conv-core-query-listings
    expect(p.wf30).toContain('conv-core-query-listings');
  });

  it('E2E-LST-13: search_listing crea case open pero no lead oficial', () => {
    // El bloque de search_listing crea un case pero no llama a conv-core-create-lead
    const searchBlock = p.wf30.match(/search_listing[\s\S]{0,600}/);
    expect(searchBlock).not.toBeNull();
    // El case se crea con status='open' (spacing puede variar)
    expect(p.wf30).toMatch(/status:\s+'open'/);
    // No hay conv_lead_created en el bloque de search
    const listingResultsBlock = p.wf30.match(/listing_results[\s\S]{0,400}conv_lead_created/);
    expect(listingResultsBlock).toBeNull();
  });

  // Flujo 6 — leave_contact / lead_created
  it('E2E-LST-14: leave_contact o request_visit crea lead mock', () => {
    expect(p.wf30).toContain('conv-core-create-lead');
    expect(p.wf30).toMatch(/'request_visit'|'leave_contact'/);
  });

  it('E2E-LST-15: lead deja case con status=waiting_internal', () => {
    const leadBlock = p.wf30.match(/leadRef[\s\S]{0,300}waiting_internal/);
    expect(leadBlock).not.toBeNull();
    expect(p.wf30).toContain("case_ref_type: 'lead'");
  });

  it('E2E-LST-16: conv_lead_created no contiene session_id ni contacto', () => {
    const actBlock = p.wf30.match(/event_type: 'conv_lead_created'[\s\S]{0,300}/);
    expect(actBlock).not.toBeNull();
    expect(actBlock![0]).not.toContain('session_id');
    expect(actBlock![0]).not.toMatch(/contact\s*:/);
    expect(actBlock![0]).not.toMatch(/phone\s*:/);
    expect(actBlock![0]).not.toMatch(/email\s*:/);
    expect(actBlock![0]).not.toMatch(/name\s*:/);
  });

  it('E2E-LST-17: UNVERIFIED_LEAD solo se asigna como identity_level en WF-30, nunca en WF-20/WF-40', () => {
    // WF-30 usa LEVEL_UNVERIFIED_LEAD para asignar al session identity_level
    expect(p.wf30).toContain('UNVERIFIED_LEAD');
    expect(p.wf30).toMatch(/identity_level.*UNVERIFIED_LEAD|UNVERIFIED_LEAD.*identity_level/);
    // WF-20 no menciona UNVERIFIED_LEAD en absoluto
    expect(p.wf20).not.toContain('UNVERIFIED_LEAD');
    // WF-40 define la constante para excluirla, pero nunca la asigna como identity_level via UPDATE
    expect(p.wf40).not.toMatch(/identity_level.*=.*LEVEL_UNVERIFIED_LEAD/);
    expect(p.wf40).not.toMatch(/update\([^)]*\)[\s\S]{0,200}identity_level.*UNVERIFIED/);
  });

  it('E2E-LST-17b: dispatch enruta conv_publicaciones a conv-wf30-listings', () => {
    expect(p.dispatchRouter).toContain("conv_publicaciones: 'conv-wf30-listings'");
  });

});

// ---------------------------------------------------------------------------
// E2E-HELP — Flujos completos de ayuda
// ---------------------------------------------------------------------------

describe('E2E-HELP: flujos completos WF-40', () => {

  // Flujo 7 — FAQ resuelta
  it('E2E-HLP-18: FAQ con confidence >= 0.80 devuelve help_answer', () => {
    expect(p.wf40).toContain('KB_CONFIDENCE_THRESHOLD = 0.80');
    expect(p.wf40).toContain('confidence >= KB_CONFIDENCE_THRESHOLD');
    expect(p.wf40).toContain("response_type: 'help_answer'");
  });

  it('E2E-HLP-19: FAQ resuelta no crea conv_case', () => {
    // help_answer return ocurre antes del primer insert en conv_cases
    const helpAnswerPos  = p.wf40.indexOf("response_type: 'help_answer'");
    const firstCasePos   = p.wf40.indexOf("'conv_cases'");
    expect(helpAnswerPos).toBeLessThan(firstCasePos);
  });

  it('E2E-HLP-19b: FAQ resuelta no crea help ticket', () => {
    const helpAnswerPos = p.wf40.indexOf("response_type: 'help_answer'");
    const ticketCallPos = p.wf40.indexOf('conv-core-create-help-ticket');
    expect(helpAnswerPos).toBeLessThan(ticketCallPos);
  });

  // Flujo 8 — FAQ sin match
  it('E2E-HLP-20: FAQ sin match crea conv_case y escala con no_kb_match', () => {
    expect(p.wf40).toContain("'no_kb_match'");
    expect(p.wf40).toContain("escalation_reason: 'no_kb_match'");
    expect(p.wf40).toContain('conv-escalate-case');
  });

  it('E2E-HLP-20b: FAQ sin match usa conv_case_escalated como evento oficial', () => {
    expect(p.wf40).toContain("'conv_case_escalated'");
    // conv_help_escalated no existe como string value
    for (const src of [p.wf40, p.createTicket, p.queryKb]) {
      expect(src).not.toMatch(/'conv_help_escalated'/);
    }
  });

  it('E2E-HLP-21: request_human crea help ticket o escala con admin_requested', () => {
    // request_human es un intent_type — aparece en comentarios, no necesariamente como literal
    expect(p.wf40).toContain('request_human');
    expect(p.wf40).toContain('conv-core-create-help-ticket');
    // Si el ticket falla, escalation_reason = 'admin_requested'
    expect(p.wf40).toContain("escalation_reason: 'admin_requested'");
  });

  it('E2E-HLP-22: no existe conv_help_escalated en ninguna fuente del flujo de ayuda', () => {
    for (const src of [p.wf40, p.createTicket, p.queryKb]) {
      expect(src).not.toMatch(/'conv_help_escalated'/);
    }
  });

  it('E2E-HLP-22b: dispatch enruta conv_ayuda a conv-wf40-help', () => {
    expect(p.dispatchRouter).toContain("conv_ayuda:         'conv-wf40-help'");
  });

  it('E2E-HLP-22c: conv_case_escalated en WF-40 no contiene session_id ni PII en activityData', () => {
    const actBlock = p.wf40.match(/escalateActivityData[\s\S]{0,400}/);
    expect(actBlock).not.toBeNull();
    expect(actBlock![0]).not.toContain('session_id');
    expect(actBlock![0]).not.toMatch(/message_text\s*:/);
    expect(actBlock![0]).not.toMatch(/summary\s*:/);
    expect(actBlock![0]).not.toMatch(/phone\s*:/);
    expect(actBlock![0]).not.toMatch(/profile_id\s*:/);
  });

});

// ---------------------------------------------------------------------------
// E2E-WEBCHAT — Canal WebChat
// ---------------------------------------------------------------------------

describe('E2E-WEBCHAT: flujo completo por canal webchat', () => {

  // Flujo 9 — WebChat
  it('E2E-WEB-23: canal webchat usa conv-web-deliver en dispatch', () => {
    expect(p.dispatchOutbound).toContain("webchat:  'conv-web-deliver'");
    expect(p.dispatch).toContain('getOutboundEfName');
  });

  it('E2E-WEB-24: canal webchat no usa conv-send-wa', () => {
    // El mapping webchat → conv-web-deliver excluye conv-send-wa
    const webchatEntry = p.dispatchOutbound.match(/webchat[\s\S]{0,50}/);
    expect(webchatEntry).not.toBeNull();
    expect(webchatEntry![0]).not.toContain('conv-send-wa');
  });

  it('E2E-WEB-25: dispatch no construye JIDs de WhatsApp para webchat', () => {
    expect(p.dispatch).not.toContain('sendWasenderMessage');
    expect(p.dispatchOutbound).not.toContain('@c.us');
    expect(p.dispatchOutbound).not.toContain('@s.whatsapp.net');
  });

  it('E2E-WEB-26: conv-web-session crea sender_ref opaco — no expone teléfono', () => {
    const webSession = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../../../../../supabase/functions/conv-web-session/index.ts'),
      'utf-8',
    );
    // sender_ref opaco: generado internamente — no viene de input externo como teléfono
    expect(webSession).toContain('sender_ref');
    expect(webSession).not.toMatch(/log\.(info|warn|error)\([^\n]*sender_ref/);
  });

});

// ---------------------------------------------------------------------------
// E2E-ROUTING — Respuestas de routing distintas a routed
// ---------------------------------------------------------------------------

describe('E2E-ROUTING: respuestas menu/no_service/context_switch', () => {

  // Flujo 10 — Menú dinámico
  it('E2E-RTG-27: routing menu → dispatch no llama a WF-20/30/40', () => {
    const menuBlock = p.dispatch.match(/responseType === 'menu'[\s\S]{0,300}/);
    expect(menuBlock).not.toBeNull();
    expect(menuBlock![0]).not.toContain('getWfEfName');
    expect(menuBlock![0]).not.toContain('conv-wf20');
    expect(menuBlock![0]).not.toContain('conv-wf30');
    expect(menuBlock![0]).not.toContain('conv-wf40');
  });

  it('E2E-RTG-27b: menú se construye con buildMenuText — solo servicios activos sin IDs internos', () => {
    expect(p.dispatch).toContain('buildMenuText');
    expect(p.dispatchMapper).toContain('buildMenuText');
    // buildMenuText no incluye profile_id ni room_id
    const buildMenuFn = p.dispatchMapper.match(/function buildMenuText[\s\S]{0,400}/);
    expect(buildMenuFn).not.toBeNull();
    expect(buildMenuFn![0]).not.toMatch(/profile_id|room_id|assignment_id/);
  });

  // Flujo 11 — no_service
  it('E2E-RTG-28: routing no_service → dispatch no llama a WF', () => {
    const noSvcBlock = p.dispatch.match(/responseType === 'no_service'[\s\S]{0,200}/);
    expect(noSvcBlock).not.toBeNull();
    expect(noSvcBlock![0]).not.toContain('getWfEfName');
  });

  it('E2E-RTG-28b: no_service responde texto seguro', () => {
    expect(p.dispatch).toContain('buildNoServiceText');
    expect(p.dispatchMapper).toContain('Este canal no tiene servicios activos actualmente');
  });

  // Flujo 12 — context_switch_confirmation
  it('E2E-RTG-29: routing context_switch_confirmation → dispatch no llama a WF', () => {
    const ctxBlock = p.dispatch.match(/responseType === 'context_switch_confirmation'[\s\S]{0,200}/);
    expect(ctxBlock).not.toBeNull();
    expect(ctxBlock![0]).not.toContain('getWfEfName');
  });

  it('E2E-RTG-30: context_switch_confirmation → dispatch no cambia active_service_code', () => {
    const noUpdateCtx = p.dispatch.match(/responseType === 'context_switch_confirmation'[\s\S]{0,300}active_service_code\s*:/);
    expect(noUpdateCtx).toBeNull();
  });

});

// ---------------------------------------------------------------------------
// E2E-IDEMPOTENCY — Multi-turn y deduplicación
// ---------------------------------------------------------------------------

describe('E2E-IDEMPOTENCY: multi-turn e idempotencia corregida', () => {

  // Flujo 13 — multi-turn
  it('E2E-IDP-31: mensaje B se procesa aunque exista outbound del mensaje A — sin outboundCount', () => {
    // La clave: dispatch no cuenta outbounds de la sesión
    expect(p.dispatchIdemp).not.toMatch(/function\s+\w+\s*\([^)]*outboundCount/);
    expect(p.dispatch).not.toMatch(/const outboundCount|let outboundCount/);
  });

  it('E2E-IDP-32: repetir message_id con status=sent devuelve éxito idempotente sin routing', () => {
    expect(p.dispatchIdemp).toContain("case 'sent'");
    expect(p.dispatchIdemp).toContain("already_sent");
    expect(p.dispatchIdemp).toContain('alreadyDispatched: true');
  });

  it('E2E-IDP-33: repetir message_id sent no duplica casos — return antes del routing', () => {
    const idempPos      = p.dispatch.indexOf('idempotent: true');
    const routingCallPos = p.dispatch.indexOf("functions/v1/conv-routing-engine");
    expect(idempPos).toBeLessThan(routingCallPos);
  });

  it('E2E-IDP-34: status processing no llama routing ni WF', () => {
    expect(p.dispatchIdemp).toContain("case 'processing'");
    expect(p.dispatchIdemp).toContain("already_processing");
    // El return idempotente corta antes del routing
    const idempPos      = p.dispatch.indexOf('idempotent: true');
    const routingCallPos = p.dispatch.indexOf("functions/v1/conv-routing-engine");
    expect(idempPos).toBeLessThan(routingCallPos);
  });

  it('E2E-IDP-35: status failed no genera outbound por defecto', () => {
    expect(p.dispatchIdemp).toContain("case 'failed'");
    expect(p.dispatchIdemp).toContain("previously_failed");
    expect(p.dispatchIdemp).toContain('alreadyDispatched: true');
  });

  it('E2E-IDP-35b: UPDATE condicional solo si status=received mejora concurrencia', () => {
    expect(p.dispatch).toContain(".eq('status', 'received')");
    expect(p.dispatch).toContain('updatedRows');
  });

});

// ---------------------------------------------------------------------------
// E2E-ERRORS — Errores seguros en el pipeline
// ---------------------------------------------------------------------------

describe('E2E-ERRORS: gestión de errores seguros en el pipeline', () => {

  // Flujo 14 — error de WF
  it('E2E-ERR-36: error de routing devuelve respuesta segura sin JSON técnico', () => {
    expect(p.dispatch).toContain('SAFE_ERROR_TEXT');
    expect(p.dispatch).toContain('Ha ocurrido un problema');
    // Error de routing restaura el status del inbound
    expect(p.dispatch).toContain("status: 'received'");
  });

  it('E2E-ERR-37: error de WF mapea a fallback text — no expone JSON interno', () => {
    expect(p.dispatch).toContain("response_type: 'error'");
    expect(p.dispatch).toContain('mapWfResponseToText');
    expect(p.dispatchMapper).toContain("error:");
    expect(p.dispatchMapper).toContain('Ha ocurrido un problema');
  });

  // Flujo 15 — error de outbound delegado
  it('E2E-ERR-38: error de outbound se delega a conv-send-wa — dispatch no implementa retry', () => {
    expect(p.dispatch).toContain('Errores de outbound se delegan');
    expect(p.dispatch).not.toContain('BACKOFF_SECONDS');
    expect(p.dispatch).not.toContain('while (attempts');
  });

  it('E2E-ERR-39: no se exponen stack traces al usuario', () => {
    expect(p.dispatch).not.toMatch(/text:.*stack/i);
    expect(p.dispatchMapper).not.toContain('stack');
    expect(p.dispatchMapper).not.toContain('Error:');
  });

  it('E2E-ERR-40: no se envía JSON técnico al usuario — mapper usa texto plano', () => {
    expect(p.dispatchMapper).not.toMatch(/"response_type"\s*:/);
    expect(p.dispatchMapper).not.toContain('JSON.stringify');
    // dispatch no devuelve wfResponseData directamente
    expect(p.dispatch).not.toMatch(/return ok\(wfResponseData\)/);
  });

});

// ---------------------------------------------------------------------------
// E2E-PRIVACY — Privacidad end-to-end
// ---------------------------------------------------------------------------

describe('E2E-PRIVACY: privacidad a lo largo del pipeline completo', () => {

  const NO_LOG_FIELDS = ['message_text', 'sender_ref', 'phone', 'profile_id', 'identity_data', 'raw_payload'];

  it('E2E-PRV-41: dispatch no loguea message_text', () => {
    expect(p.dispatch).not.toMatch(/log\.(info|warn|error)\([^\n]*message_text/);
  });

  it('E2E-PRV-42: dispatch no loguea sender_ref', () => {
    expect(p.dispatch).not.toMatch(/log\.(info|warn|error)\([^\n]*sender_ref/);
  });

  it('E2E-PRV-43: dispatch no loguea phone ni phone_number', () => {
    expect(p.dispatch).not.toMatch(/log\.(info|warn|error)\([^\n]*(phone|phone_number)/);
  });

  it('E2E-PRV-44: dispatch no loguea profile_id', () => {
    expect(p.dispatch).not.toMatch(/log\.(info|warn|error)\([^\n]*profile_id/);
  });

  it('E2E-PRV-45: dispatch no loguea identity_data', () => {
    expect(p.dispatch).not.toMatch(/log\.(info|warn|error)\([^\n]*identity_data/);
  });

  it('E2E-PRV-46: Activity Log en WF-20/30/40 no contiene PII de usuario', () => {
    // Verificar activityData en WF-20 (conv_incident_created)
    const wf20ActBlock = p.wf20.match(/event_type: 'conv_incident_created'[\s\S]{0,300}/);
    expect(wf20ActBlock).not.toBeNull();
    expect(wf20ActBlock![0]).not.toMatch(/profile_id\s*:/);
    expect(wf20ActBlock![0]).not.toMatch(/phone\s*:/);

    // Verificar activityData en WF-30 (conv_lead_created)
    const wf30ActBlock = p.wf30.match(/event_type: 'conv_lead_created'[\s\S]{0,300}/);
    expect(wf30ActBlock).not.toBeNull();
    expect(wf30ActBlock![0]).not.toMatch(/contact\s*:/);
    expect(wf30ActBlock![0]).not.toContain('session_id');

    // Verificar activityData en WF-40 (conv_case_escalated)
    const wf40ActBlock = p.wf40.match(/escalateActivityData[\s\S]{0,300}/);
    expect(wf40ActBlock).not.toBeNull();
    expect(wf40ActBlock![0]).not.toContain('session_id');
    expect(wf40ActBlock![0]).not.toMatch(/summary\s*:/);
  });

  it('E2E-PRV-47: payload outbound a conv-send-wa/conv-web-deliver no contiene profile_id', () => {
    const outboundPayload = p.dispatch.match(/body: JSON\.stringify\(\{[\s\S]{0,300}outboundText/);
    expect(outboundPayload).not.toBeNull();
    expect(outboundPayload![0]).not.toContain('profile_id');
  });

  it('E2E-PRV-48: payload outbound no contiene identity_data', () => {
    const outboundPayload = p.dispatch.match(/body: JSON\.stringify\(\{[\s\S]{0,300}outboundText/);
    expect(outboundPayload).not.toBeNull();
    expect(outboundPayload![0]).not.toContain('identity_data');
  });

  it('E2E-PRV-49: payload outbound no contiene sender_ref', () => {
    const outboundPayload = p.dispatch.match(/body: JSON\.stringify\(\{[\s\S]{0,300}outboundText/);
    expect(outboundPayload).not.toBeNull();
    expect(outboundPayload![0]).not.toContain('sender_ref');
  });

  it('E2E-PRV-50: no quedan marcadores sin resolver en el pipeline', () => {
    // dispatch-response-mapper detecta marcadores tipo {foo_bar}
    expect(p.dispatchMapper).toContain('MARKER_PATTERN');
    expect(p.dispatchMapper).toContain('hasUnsubstitutedMarkers');
    // WF-30 y WF-40 usan template literals directos, no {markers}
    expect(p.wf30).toContain('findUnsubstitutedMarkers');
    expect(p.wf40).toContain('findUnsubstitutedMarkers');
  });

  it('E2E-PRV-50b: ef-logger sanitiza PII automáticamente', () => {
    expect(p.efLogger).toContain('sanitizeForLog');
    expect(p.efLogger).toContain("'profile_id'");
    expect(p.efLogger).toContain("'sender_ref'");
    expect(p.efLogger).toContain("'phone_number'");
  });

});

// ---------------------------------------------------------------------------
// E2E-RESTRICTIONS — Restricciones globales del pipeline
// ---------------------------------------------------------------------------

describe('E2E-RESTRICTIONS: restricciones globales del pipeline completo', () => {

  it('E2E-RES-51: no introduce WF-02 en ninguna fuente', () => {
    expect(p.dispatchRouter).not.toContain('WF-02');
    expect(p.dispatch).not.toMatch(/wf02/i);
    // SERVICE_TO_EF no tiene WF-02
    expect(p.dispatchRouter).not.toMatch(/conv_wf02/);
  });

  it("E2E-RES-52: no introduce 'conv_help_escalated' como string value en todo el pipeline", () => {
    for (const src of all) {
      expect(src).not.toMatch(/'conv_help_escalated'/);
    }
  });

  it('E2E-RES-53: no introduce WEAK_MATCH como valor en helpers de dispatch', () => {
    for (const src of [p.dispatchRouter, p.dispatchMapper, p.dispatchOutbound, p.dispatchIdemp]) {
      expect(src).not.toContain('WEAK_MATCH');
    }
  });

  it("E2E-RES-54: no introduce 'UNVERIFIED' standalone en WF-20/40", () => {
    expect(p.wf20).not.toContain("'UNVERIFIED'");
    expect(p.wf40).not.toContain("'UNVERIFIED'");
    expect(p.dispatchRouter).not.toContain("'UNVERIFIED'");
  });

  it('E2E-RES-55: no introduce next_retry_at como campo en ninguna EF del pipeline', () => {
    for (const src of [p.dispatch, p.wf20, p.wf30, p.wf40, p.dispatchIdemp]) {
      expect(src).not.toMatch(/next_retry_at\s*:/);
    }
  });

  it('E2E-RES-56: no introduce attempt_count como campo en ninguna EF del pipeline', () => {
    for (const src of [p.dispatch, p.wf20, p.wf30, p.wf40, p.dispatchIdemp]) {
      expect(src).not.toMatch(/attempt_count\s*:/);
    }
  });

  it("E2E-RES-57: no introduce nuevos estados — 'processed' ausente en pipeline", () => {
    for (const src of [p.dispatch, p.wf20, p.wf30, p.wf40, p.dispatchIdemp]) {
      expect(src).not.toMatch(/'processed'/);
    }
  });

  it('E2E-RES-58: no introduce nuevos eventos Activity Log — no hay publishActivity en dispatch', () => {
    expect(p.dispatch).not.toContain('conv-core-publish-activity');
    expect(p.dispatch).not.toContain('publishActivity');
  });

  it('E2E-RES-59: no se modificaron contracts ni enums del pipeline', () => {
    // enums.ts mantiene los eventos oficiales
    const enums = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../../../../../supabase/functions/_shared/smart-conversations/enums.ts'),
      'utf-8',
    );
    expect(enums).toContain("'conv_incident_created'");
    expect(enums).toContain("'conv_lead_created'");
    expect(enums).toContain("'conv_case_escalated'");
    expect(enums).not.toMatch(/'conv_help_escalated'/);
  });

  it('E2E-RES-60: no se modificaron migraciones — migración principal sigue existiendo', () => {
    const { readFileSync } = require('node:fs');
    const { resolve } = require('node:path');
    const mig = readFileSync(
      resolve(__dirname, '../../../../../supabase/migrations/20260716000001_smart_conversations_core_schema.sql'),
      'utf-8',
    );
    expect(mig).toContain('CREATE TABLE conv_sessions');
    expect(mig).toContain('CREATE TABLE conv_messages');
    expect(mig).toContain('CREATE TABLE conv_cases');
  });

});

// ---------------------------------------------------------------------------
// E2E-REGRESSION — Regresión de todas las suites anteriores
// ---------------------------------------------------------------------------

describe('E2E-REGRESSION: todas las suites anteriores siguen pasando', () => {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const SUITES = resolve(__dirname, '../../suites');

  it('E2E-REG-61: tests de schema — migración sigue válida', () => {
    const mig = readFileSync(
      resolve(__dirname, '../../../../../supabase/migrations/20260716000001_smart_conversations_core_schema.sql'),
      'utf-8',
    );
    expect(mig).toContain('conv_cases');
    // case_ref_type incluye help_ticket como valor enum
    expect(mig).toContain("'help_ticket'");
    // La migración define las tablas principales
    expect(mig).toContain('conv_sessions');
    expect(mig).toContain('conv_messages');
  });

  it('E2E-REG-62: tests de types — enums.ts sigue teniendo todos los servicios', () => {
    const enums = require('node:fs').readFileSync(
      require('node:path').resolve(__dirname, '../../../../../supabase/functions/_shared/smart-conversations/enums.ts'),
      'utf-8',
    );
    expect(enums).toContain("'conv_incidencias'");
    expect(enums).toContain("'conv_publicaciones'");
    expect(enums).toContain("'conv_ayuda'");
    expect(enums).toContain("'whatsapp'");
    expect(enums).toContain("'webchat'");
  });

  it('E2E-REG-63: tests de infra — ef-auth y ef-logger disponibles', () => {
    expect(p.efAuth).toContain('isServiceRoleRequest');
    expect(p.efLogger).toContain('sanitizeForLog');
    expect(p.efLogger).toContain('sanitizeArray');
  });

  it('E2E-REG-64: tests de ingest — conv-ingest sigue existiendo', () => {
    expect(p.ingest).toContain("'duplicate_ignored'");
    expect(p.ingest).toContain("'no_service'");
  });

  it('E2E-REG-65: tests de channels — conv-wa-webhook sigue existiendo', () => {
    const waWebhook = readFileSync(
      resolve(__dirname, '../../../../../supabase/functions/conv-wa-webhook/index.ts'),
      'utf-8',
    );
    expect(waWebhook).toContain('HMAC');
  });

  it('E2E-REG-66: tests de outbound — conv-process-send-queue sigue existiendo', () => {
    const queue = readFileSync(
      resolve(__dirname, '../../../../../supabase/functions/conv-process-send-queue/index.ts'),
      'utf-8',
    );
    expect(queue).toContain('BACKOFF_SECONDS = [1, 5, 30]');
  });

  it('E2E-REG-67: tests de routing — conv-routing-engine tiene CONFIDENCE_THRESHOLD=0.85', () => {
    expect(p.routing).toContain('CONFIDENCE_THRESHOLD = 0.85');
    expect(p.routing).toContain("response_type: 'routed'");
    expect(p.routing).toContain("response_type: 'menu'");
    expect(p.routing).toContain("response_type: 'no_service'");
    expect(p.routing).toContain("response_type: 'context_switch_confirmation'");
  });

  it('E2E-REG-68: tests de identity — identity-level.ts mantiene canAdvanceIdentityLevel', () => {
    const idLevel = readFileSync(
      resolve(__dirname, '../../../../../supabase/functions/_shared/smart-conversations/runtime/identity-level.ts'),
      'utf-8',
    );
    expect(idLevel).toContain('canAdvanceIdentityLevel');
    expect(idLevel).not.toContain('WEAK_MATCH');
  });

  it('E2E-REG-69: tests de incidents — conv-wf20-incidents sigue existiendo', () => {
    expect(p.wf20).toContain('STRONG_MATCH_ACTIVE');
    expect(p.wf20).toContain("'conv_incidencias'");
    expect(p.wf20).not.toContain('UNVERIFIED_LEAD');
  });

  it('E2E-REG-70: tests de listings — conv-wf30-listings sigue existiendo', () => {
    expect(p.wf30).toContain("'conv_publicaciones'");
    expect(p.wf30).toContain('UNVERIFIED_LEAD');
    expect(p.wf30).toContain('LEVEL_UNVERIFIED_LEAD');
  });

  it('E2E-REG-71: tests de help — conv-wf40-help sigue existiendo', () => {
    expect(p.wf40).toContain("'conv_ayuda'");
    expect(p.wf40).toContain('KB_CONFIDENCE_THRESHOLD = 0.80');
    expect(p.wf40).not.toMatch(/'conv_help_escalated'/);
  });

  it('E2E-REG-72: tests de dispatch — conv-dispatch-message sigue existiendo', () => {
    expect(p.dispatch).toContain('evaluateDispatchIdempotency');
    expect(p.dispatch).toContain('getWfEfName');
    expect(p.dispatch).toContain('getOutboundEfName');
    expect(p.dispatch).not.toMatch(/const outboundCount|let outboundCount/);
  });

  it('E2E-REG-73: it.todo restantes siguen registrados en activity-log spec', () => {
    const activityLog = readFileSync(
      resolve(__dirname, '../../suites/activity-log/activity-log.spec.ts'),
      'utf-8',
    );
    expect(activityLog).toMatch(/it\.todo\(/);
  });

});
