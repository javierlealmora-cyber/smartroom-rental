/**
 * Suite: Help Flow — WF-40 (Fase 8C)
 * Análisis estático de conv-wf40-help, conv-core-query-help-kb,
 * conv-core-create-help-ticket, help-intent-extractor, help-kb-client, core-help-ticket-client.
 *
 * IDs: HLP-AUTH, HLP-EXTRACT, HLP-KB, HLP-FAQ-OK, HLP-FAQ-MISS,
 *      HLP-HUMAN, HLP-ACCOUNT, HLP-UNKNOWN, HLP-ACT, HLP-ERR,
 *      HLP-PRIV, HLP-RES, HLP-REG
 */

import { describe, it, beforeAll, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EF_DIR     = resolve(__dirname, '../../../../../supabase/functions');
const SHARED_DIR = resolve(EF_DIR, '_shared/smart-conversations/runtime');

let srcWf40:         string;
let srcQueryKb:      string;
let srcCreateTicket: string;
let srcExtractor:    string;
let srcKbClient:     string;
let srcTicketClient: string;

beforeAll(() => {
  srcWf40         = readFileSync(resolve(EF_DIR, 'conv-wf40-help/index.ts'), 'utf-8');
  srcQueryKb      = readFileSync(resolve(EF_DIR, 'conv-core-query-help-kb/index.ts'), 'utf-8');
  srcCreateTicket = readFileSync(resolve(EF_DIR, 'conv-core-create-help-ticket/index.ts'), 'utf-8');
  srcExtractor    = readFileSync(resolve(SHARED_DIR, 'help-intent-extractor.ts'), 'utf-8');
  srcKbClient     = readFileSync(resolve(SHARED_DIR, 'help-kb-client.ts'), 'utf-8');
  srcTicketClient = readFileSync(resolve(SHARED_DIR, 'core-help-ticket-client.ts'), 'utf-8');
});

// ---------------------------------------------------------------------------
// HLP-AUTH — autenticación y validación de input
// ---------------------------------------------------------------------------

describe('HLP-AUTH: autenticación y validación de input', () => {

  it('HLP-AUTH-01: conv-wf40-help requiere service_role', () => {
    expect(srcWf40).toContain('isServiceRoleRequest');
    expect(srcWf40).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(srcWf40).toContain('ERROR_CODES.UNAUTHORIZED');
  });

  it('HLP-AUTH-02: conv-wf40-help rechaza session_token — no usa getUser/getSession', () => {
    expect(srcWf40).not.toContain('getUser');
    expect(srcWf40).not.toContain('getSession');
  });

  it('HLP-AUTH-03: rechaza payload sin client_account_id', () => {
    expect(srcWf40).toContain('client_account_id es obligatorio');
  });

  it('HLP-AUTH-04: rechaza payload sin session_id', () => {
    expect(srcWf40).toContain('session_id es obligatorio');
  });

  it('HLP-AUTH-05: rechaza payload sin message_id', () => {
    expect(srcWf40).toContain('message_id es obligatorio');
  });

  it('HLP-AUTH-06: rechaza service_code distinto de conv_ayuda', () => {
    expect(srcWf40).toContain('service_code !== SERVICE_CODE');
    expect(srcWf40).toContain("'conv_ayuda'");
  });

  it('HLP-AUTH-07: conv-core-query-help-kb requiere service_role', () => {
    expect(srcQueryKb).toContain('isServiceRoleRequest');
    expect(srcQueryKb).toContain('ERROR_CODES.UNAUTHORIZED');
  });

  it('HLP-AUTH-08: conv-core-create-help-ticket requiere service_role', () => {
    expect(srcCreateTicket).toContain('isServiceRoleRequest');
    expect(srcCreateTicket).toContain('ERROR_CODES.UNAUTHORIZED');
  });

});

// ---------------------------------------------------------------------------
// HLP-EXTRACT — extractor de intención de ayuda
// ---------------------------------------------------------------------------

describe('HLP-EXTRACT: extractor de intención de ayuda', () => {

  it('HLP-EXTRACT-09: extractor no llama a Claude real', () => {
    expect(srcExtractor).not.toContain('anthropic');
    expect(srcExtractor).not.toContain('messages.create');
  });

  it('HLP-EXTRACT-10: extractor no hace fetch', () => {
    expect(srcExtractor).not.toContain('fetch(');
  });

  it('HLP-EXTRACT-11: extractor no loguea message_text', () => {
    expect(srcExtractor).not.toMatch(/log\.(info|warn|error)\([^\n]*messageText/);
    expect(srcExtractor).not.toMatch(/console\.(log|warn|error)\([^\n]*messageText/);
  });

  it("HLP-EXTRACT-12: extractor detecta FAQ — contiene intent_type 'faq'", () => {
    expect(srcExtractor).toContain("'faq'");
    expect(srcExtractor).toContain('ayuda');
  });

  it("HLP-EXTRACT-13: extractor detecta request_human — petición de agente humano", () => {
    expect(srcExtractor).toContain('request_human');
    expect(srcExtractor).toContain('agente humano');
  });

  it("HLP-EXTRACT-14: extractor detecta account_specific — consulta de cuenta/contrato", () => {
    expect(srcExtractor).toContain('account_specific');
    expect(srcExtractor).toContain('is_account_specific');
  });

  it("HLP-EXTRACT-15: extractor detecta unknown y devuelve confidence 0", () => {
    expect(srcExtractor).toContain("intent_type:         'unknown'");
    expect(srcExtractor).toContain('confidence:          0.0');
  });

});

// ---------------------------------------------------------------------------
// HLP-KB — conv-core-query-help-kb
// ---------------------------------------------------------------------------

describe('HLP-KB: conv-core-query-help-kb', () => {

  it('HLP-KB-16: conv-core-query-help-kb no llama al Core real', () => {
    expect(srcKbClient).not.toContain('fetch(');
    expect(srcKbClient).not.toContain('smartroom-core');
    expect(srcKbClient).not.toContain('/api/v1/');
  });

  it('HLP-KB-17: conv-core-query-help-kb no acepta profile_id', () => {
    expect(srcQueryKb).toContain("'profile_id' in body");
    expect(srcQueryKb).toContain('profile_id no está permitido en query-help-kb');
  });

  it('HLP-KB-18: conv-core-query-help-kb no acepta identity_data', () => {
    expect(srcQueryKb).toContain("'identity_data' in body");
    expect(srcQueryKb).toContain('identity_data no está permitido en query-help-kb');
  });

  it('HLP-KB-19: conv-core-query-help-kb no acepta sender_ref', () => {
    expect(srcQueryKb).toContain("'sender_ref' in body");
    expect(srcQueryKb).toContain('sender_ref no está permitido en query-help-kb');
  });

  it('HLP-KB-20: KB mock devuelve solo respuestas públicas — campo public: true', () => {
    expect(srcKbClient).toContain('public:     true');
    expect(srcKbClient).toMatch(/entry\.public/);
  });

  it('HLP-KB-21: KB mock no devuelve datos internos de contrato', () => {
    expect(srcKbClient).not.toMatch(/assignment_id\s*:/);
    expect(srcKbClient).not.toMatch(/room_id\s*:/);
    // identity_data como propiedad de objeto — no como mención en comentario JSDoc
    expect(srcKbClient).not.toMatch(/identity_data\s*[=:]/);
  });

  it('HLP-KB-22: KB mock no devuelve PII', () => {
    expect(srcKbClient).not.toMatch(/profile_id\s*:/);
    expect(srcKbClient).not.toMatch(/phone_number\s*:/);
    expect(srcKbClient).not.toMatch(/full_name\s*:/);
  });

});

// ---------------------------------------------------------------------------
// HLP-FAQ-OK — FAQ con match suficiente
// ---------------------------------------------------------------------------

describe('HLP-FAQ-OK: FAQ resuelta con confidence suficiente', () => {

  it("HLP-FAQ-OK-23: FAQ con confidence >= KB_CONFIDENCE_THRESHOLD devuelve help_answer", () => {
    expect(srcWf40).toContain("response_type: 'help_answer'");
    expect(srcWf40).toContain('KB_CONFIDENCE_THRESHOLD');
    expect(srcWf40).toContain('confidence >= KB_CONFIDENCE_THRESHOLD');
  });

  it('HLP-FAQ-OK-24: FAQ resuelta no crea conv_case — return antes del primer insert', () => {
    // El help_answer return ocurre antes del primer insert en conv_cases
    const helpAnswerPos = srcWf40.indexOf("response_type: 'help_answer'");
    const firstInsertPos = srcWf40.indexOf("'conv_cases'");
    expect(helpAnswerPos).toBeGreaterThan(0);
    expect(firstInsertPos).toBeGreaterThan(0);
    expect(helpAnswerPos).toBeLessThan(firstInsertPos);
  });

  it('HLP-FAQ-OK-25: FAQ resuelta no crea help ticket', () => {
    const helpAnswerPos  = srcWf40.indexOf("response_type: 'help_answer'");
    const ticketCallPos  = srcWf40.indexOf('conv-core-create-help-ticket');
    expect(helpAnswerPos).toBeGreaterThan(0);
    expect(ticketCallPos).toBeGreaterThan(0);
    // El return de help_answer ocurre antes de la llamada al ticket
    const blockBeforeTicket = srcWf40.slice(0, ticketCallPos);
    expect(blockBeforeTicket).toContain("response_type: 'help_answer'");
  });

  it("HLP-FAQ-OK-26: FAQ resuelta no publica conv_case_created", () => {
    // El bloque de help_answer no tiene conv_case_created
    const helpAnswerBlock = srcWf40.match(/response_type: 'help_answer'[\s\S]{0,200}/);
    expect(helpAnswerBlock).not.toBeNull();
    expect(helpAnswerBlock![0]).not.toContain('conv_case_created');
  });

  it("HLP-FAQ-OK-27: FAQ resuelta no publica conv_case_escalated", () => {
    const helpAnswerPos   = srcWf40.indexOf("response_type: 'help_answer'");
    const escalatedActPos = srcWf40.indexOf("'conv_case_escalated'");
    expect(helpAnswerPos).toBeGreaterThan(0);
    expect(escalatedActPos).toBeGreaterThan(0);
    // conv_case_escalated aparece DESPUÉS del return de help_answer → el FAQ exit no llega a él
    expect(helpAnswerPos).toBeLessThan(escalatedActPos);
  });

  it("HLP-FAQ-OK-28: FAQ resuelta no usa conv_help_escalated — evento prohibido", () => {
    // Verificar que 'conv_help_escalated' no aparece como string value (puede estar en comentarios explicativos)
    expect(srcWf40).not.toMatch(/'conv_help_escalated'/);
    expect(srcQueryKb).not.toMatch(/'conv_help_escalated'/);
  });

});

// ---------------------------------------------------------------------------
// HLP-FAQ-MISS — FAQ sin match suficiente
// ---------------------------------------------------------------------------

describe('HLP-FAQ-MISS: FAQ sin match KB', () => {

  it("HLP-FAQ-MISS-29: FAQ sin match crea conv_case con service_code='conv_ayuda'", () => {
    expect(srcWf40).toContain("const SERVICE_CODE = 'conv_ayuda'");
    expect(srcWf40).toContain("service_code:  SERVICE_CODE");
  });

  it("HLP-FAQ-MISS-30: caso FAQ sin match usa case_ref_type='help_ticket'", () => {
    expect(srcWf40).toContain("case_ref_type: 'help_ticket'");
  });

  it('HLP-FAQ-MISS-31: FAQ sin match escala via conv-escalate-case', () => {
    expect(srcWf40).toContain('conv-escalate-case');
    const noMatchBlock = srcWf40.match(/no_kb_match[\s\S]{0,400}conv-escalate-case|conv-escalate-case[\s\S]{0,400}no_kb_match/);
    expect(noMatchBlock).not.toBeNull();
  });

  it("HLP-FAQ-MISS-32: escala con reason='no_kb_match'", () => {
    expect(srcWf40).toContain("'no_kb_match'");
    expect(srcWf40).toContain("escalation_reason: 'no_kb_match'");
  });

  it('HLP-FAQ-MISS-33: no introduce conv_help_escalated como valor string', () => {
    expect(srcWf40).not.toMatch(/'conv_help_escalated'/);
  });

  it('HLP-FAQ-MISS-34: crea notificación admin sin PII como campo de objeto', () => {
    const noMatchNotif = srcWf40.match(/no_kb_match[\s\S]{0,600}conv_admin_notifications|conv_admin_notifications[\s\S]{0,200}no_kb_match/);
    expect(noMatchNotif).not.toBeNull();
    // La notificación no incluye PII como campos de objeto (puede haber comentarios que las mencionen)
    const notifBlock = srcWf40.match(/no_kb_match[\s\S]{0,800}is_read/);
    expect(notifBlock).not.toBeNull();
    expect(notifBlock![0]).not.toMatch(/message_text\s*:/);
    expect(notifBlock![0]).not.toMatch(/phone\s*:/);
    expect(notifBlock![0]).not.toMatch(/email\s*:/);
  });

});

// ---------------------------------------------------------------------------
// HLP-HUMAN — solicitud de humano / request_human
// ---------------------------------------------------------------------------

describe('HLP-HUMAN: solicitud de atención humana', () => {

  it('HLP-HUMAN-35: request_human crea conv_case', () => {
    // El bloque post-account_specific (para request_human/complaint) inserta en conv_cases
    const humanPos  = srcWf40.indexOf('request_human');
    const insertPos = srcWf40.indexOf("'conv_cases'");
    expect(humanPos).toBeGreaterThan(0);
    expect(insertPos).toBeGreaterThan(0);
  });

  it('HLP-HUMAN-36: puede crear help ticket mock via conv-core-create-help-ticket', () => {
    const ticketCallPos = srcWf40.indexOf('functions/v1/conv-core-create-help-ticket');
    expect(ticketCallPos).toBeGreaterThan(0);
  });

  it("HLP-HUMAN-37: ticket creado actualiza conv_cases.status='waiting_internal'", () => {
    expect(srcWf40).toContain("status:   'waiting_internal'");
    const ticketBlock = srcWf40.match(/helpTicketRef[\s\S]{0,400}waiting_internal/);
    expect(ticketBlock).not.toBeNull();
  });

  it('HLP-HUMAN-38: guarda case_ref=help_ticket_ref', () => {
    expect(srcWf40).toContain('case_ref: helpTicketRef');
  });

  it("HLP-HUMAN-39: usa case_ref_type='help_ticket'", () => {
    expect(srcWf40).toContain("case_ref_type: 'help_ticket'");
  });

  it("HLP-HUMAN-40: si escala, usa reason='admin_requested'", () => {
    expect(srcWf40).toContain("'admin_requested'");
    expect(srcWf40).toContain("escalation_reason: 'admin_requested'");
  });

  it('HLP-HUMAN-41: no introduce conv_help_escalated como valor string en ningún path', () => {
    expect(srcWf40).not.toMatch(/'conv_help_escalated'/);
    expect(srcCreateTicket).not.toMatch(/'conv_help_escalated'/);
  });

  it('HLP-HUMAN-42: no deja help_ticket_ref sin sustituir — usa template literal', () => {
    expect(srcWf40).toContain('findUnsubstitutedMarkers');
    expect(srcWf40).toContain('helpTicketRef}.');
  });

});

// ---------------------------------------------------------------------------
// HLP-ACCOUNT — account_specific
// ---------------------------------------------------------------------------

describe('HLP-ACCOUNT: consulta específica de cuenta/contrato', () => {

  it('HLP-ACCOUNT-43: account_specific con STRONG_MATCH_ACTIVE puede crear caso/ticket', () => {
    expect(srcWf40).toContain('STRONG_MATCH_ACTIVE');
    expect(srcWf40).toContain('IDENTIFIED_LEVELS');
    // IDENTIFIED_LEVELS incluye STRONG_MATCH_ACTIVE
    const identifiedBlock = srcWf40.match(/IDENTIFIED_LEVELS\s*=[\s\S]{0,200}/);
    expect(identifiedBlock).not.toBeNull();
    expect(identifiedBlock![0]).toContain('STRONG_MATCH_ACTIVE');
  });

  it('HLP-ACCOUNT-44: account_specific con PARTIAL_MATCH_ACTIVE puede crear caso/ticket', () => {
    const identifiedBlock = srcWf40.match(/IDENTIFIED_LEVELS\s*=[\s\S]{0,200}/);
    expect(identifiedBlock).not.toBeNull();
    expect(identifiedBlock![0]).toContain('PARTIAL_MATCH_ACTIVE');
  });

  it("HLP-ACCOUNT-45: account_specific con NO_MATCH devuelve identity_required", () => {
    expect(srcWf40).toContain("response_type: 'identity_required'");
    // El check usa !IDENTIFIED_LEVELS.has(identityLevel) que captura NO_MATCH
    expect(srcWf40).toContain('!IDENTIFIED_LEVELS.has(identityLevel)');
  });

  it('HLP-ACCOUNT-46: account_specific con MATCH_INACTIVE no revela datos contractuales', () => {
    // MATCH_INACTIVE no está en IDENTIFIED_LEVELS → returns identity_required
    const identifiedBlock = srcWf40.match(/IDENTIFIED_LEVELS\s*=[\s\S]{0,200}/);
    expect(identifiedBlock).not.toBeNull();
    expect(identifiedBlock![0]).not.toContain('MATCH_INACTIVE');
    // La respuesta identity_required no contiene datos contractuales
    const identityReqBlock = srcWf40.match(/response_type: 'identity_required'[\s\S]{0,200}/);
    expect(identityReqBlock).not.toBeNull();
    expect(identityReqBlock![0]).not.toContain('contract');
    expect(identityReqBlock![0]).not.toContain('assignment_id');
  });

  it('HLP-ACCOUNT-47: account_specific con UNVERIFIED_LEAD no revela datos contractuales', () => {
    // UNVERIFIED_LEAD es explícitamente excluido del acceso a datos contractuales
    expect(srcWf40).toContain('LEVEL_UNVERIFIED_LEAD');
    expect(srcWf40).toContain('UNVERIFIED_LEAD');
    // El check incluye || identityLevel === LEVEL_UNVERIFIED_LEAD
    expect(srcWf40).toContain('identityLevel === LEVEL_UNVERIFIED_LEAD');
    // La respuesta identity_required no tiene datos contractuales
    const identityReqBlock = srcWf40.match(/response_type: 'identity_required'[\s\S]{0,200}/);
    expect(identityReqBlock![0]).not.toContain('profile_id');
    expect(identityReqBlock![0]).not.toContain('room_label');
  });

  it('HLP-ACCOUNT-48: no envía identity_data a n8n ni a servicios externos', () => {
    // No llama a n8n
    expect(srcWf40).not.toContain('n8n.io');
    expect(srcWf40).not.toContain('/webhook/');
    // identity_data no aparece en payloads de fetch (como valor de campo de objeto)
    expect(srcWf40).not.toMatch(/identity_data\s*:/);
  });

});

// ---------------------------------------------------------------------------
// HLP-UNKNOWN — intención desconocida
// ---------------------------------------------------------------------------

describe('HLP-UNKNOWN: intención desconocida', () => {

  it("HLP-UNKNOWN-49: unknown devuelve response_type='clarification'", () => {
    expect(srcWf40).toContain("response_type: 'clarification'");
  });

  it('HLP-UNKNOWN-50: unknown no crea conv_case por defecto', () => {
    // El return de clarification ocurre antes del primer insert en conv_cases
    const clarificationPos = srcWf40.indexOf("response_type: 'clarification'");
    const firstInsertPos   = srcWf40.indexOf("'conv_cases'");
    expect(clarificationPos).toBeGreaterThan(0);
    expect(firstInsertPos).toBeGreaterThan(0);
    expect(clarificationPos).toBeLessThan(firstInsertPos);
  });

  it('HLP-UNKNOWN-51: unknown no crea help ticket', () => {
    const clarificationPos  = srcWf40.indexOf("response_type: 'clarification'");
    const ticketCallPos     = srcWf40.indexOf('conv-core-create-help-ticket');
    expect(clarificationPos).toBeLessThan(ticketCallPos);
  });

  it('HLP-UNKNOWN-52: unknown no escala por defecto', () => {
    // El bloque de clarification no llama a conv-escalate-case
    const clarificationBlock = srcWf40.match(/intent_type === 'unknown'[\s\S]{0,300}/);
    expect(clarificationBlock).not.toBeNull();
    expect(clarificationBlock![0]).not.toContain('conv-escalate-case');
  });

});

// ---------------------------------------------------------------------------
// HLP-ACT — Activity Log
// ---------------------------------------------------------------------------

describe('HLP-ACT: Activity Log de ayuda', () => {

  it("HLP-ACT-53: conv_help_escalated no existe como string value en ninguna fuente", () => {
    for (const src of [srcWf40, srcCreateTicket, srcQueryKb, srcExtractor, srcKbClient, srcTicketClient]) {
      expect(src).not.toMatch(/'conv_help_escalated'/);
    }
  });

  it("HLP-ACT-54: escalado usa conv_case_escalated como evento oficial", () => {
    expect(srcWf40).toContain("'conv_case_escalated'");
  });

  it("HLP-ACT-55: reason 'no_kb_match' está en payload de escalado", () => {
    expect(srcWf40).toContain("escalation_reason: 'no_kb_match'");
  });

  it("HLP-ACT-56: reason 'admin_requested' está en payload de escalado", () => {
    expect(srcWf40).toContain("escalation_reason: 'admin_requested'");
  });

  it('HLP-ACT-57: activityData de conv_case_escalated no contiene session_id', () => {
    const actBlock = srcWf40.match(/escalateActivityData[\s\S]{0,400}/);
    expect(actBlock).not.toBeNull();
    expect(actBlock![0]).not.toContain('session_id');
  });

  it('HLP-ACT-58: activityData no contiene message_text', () => {
    const actBlock = srcWf40.match(/escalateActivityData[\s\S]{0,400}/);
    expect(actBlock![0]).not.toContain('message_text');
  });

  it('HLP-ACT-59: activityData no contiene summary', () => {
    const actBlock = srcWf40.match(/escalateActivityData[\s\S]{0,400}/);
    expect(actBlock![0]).not.toContain('summary');
  });

  it('HLP-ACT-60: activityData no contiene answer', () => {
    const actBlock = srcWf40.match(/escalateActivityData[\s\S]{0,400}/);
    expect(actBlock![0]).not.toContain('answer');
  });

  it('HLP-ACT-61: activityData no contiene PII de usuario', () => {
    const actBlock = srcWf40.match(/escalateActivityData[\s\S]{0,400}/);
    expect(actBlock![0]).not.toContain('profile_id');
    expect(actBlock![0]).not.toContain('phone');
    expect(actBlock![0]).not.toContain('email');
    expect(actBlock![0]).not.toContain('full_name');
  });

  it('HLP-ACT-62: fallo de Activity Log no hace rollback — fire-and-log', () => {
    expect(srcWf40).toMatch(/conv_case_escalated[\s\S]{0,300}\.catch\(/);
  });

});

// ---------------------------------------------------------------------------
// HLP-ERR — errores Core mock (backoff)
// ---------------------------------------------------------------------------

describe('HLP-ERR: errores Core mock y backoff', () => {

  it('HLP-ERR-63: 4xx no reintenta — nonRetryable', () => {
    expect(srcCreateTicket).toContain('HTTP_CLIENT_ERROR_MIN');
    expect(srcCreateTicket).toContain('HTTP_CLIENT_ERROR_MAX');
    expect(srcCreateTicket).toContain('nonRetryable = true');
  });

  it('HLP-ERR-64: 5xx reintenta con backoff 1s/5s/30s', () => {
    expect(srcCreateTicket).toContain('CORE_BACKOFF_SECONDS = [1, 5, 30]');
    expect(srcCreateTicket).toContain('HTTP_SERVER_ERROR_MIN');
  });

  it('HLP-ERR-65: timeout se trata como 5xx — default statusCode = HTTP_SERVER_ERROR_MIN', () => {
    const catchBlock = srcCreateTicket.match(/catch.*?HTTP_SERVER_ERROR_MIN/s);
    expect(catchBlock).not.toBeNull();
  });

  it('HLP-ERR-66: máximo 3 intentos totales', () => {
    expect(srcCreateTicket).toContain('MAX_CORE_ATTEMPTS    = 3');
    expect(srcCreateTicket).toContain('attempts < MAX_CORE_ATTEMPTS');
  });

  it('HLP-ERR-67: no hay cuarto intento — while loop guarda con MAX_CORE_ATTEMPTS', () => {
    expect(srcCreateTicket).toContain('while (attempts < MAX_CORE_ATTEMPTS');
  });

  it('HLP-ERR-68: 5xx agotado en WF-40 crea conv_admin_notifications sin PII como campos de objeto', () => {
    expect(srcWf40).toContain('conv_admin_notifications');
    // La notificación de admin_requested no incluye PII como campos de objeto
    const notifBlock = srcWf40.match(/admin_requested[\s\S]{0,500}is_read/);
    expect(notifBlock).not.toBeNull();
    expect(notifBlock![0]).not.toMatch(/message_text\s*:/);
    expect(notifBlock![0]).not.toMatch(/phone\s*:/);
    expect(notifBlock![0]).not.toMatch(/email\s*:/);
  });

  it('HLP-ERR-69: error técnico no llega al usuario — mensaje genérico', () => {
    expect(srcWf40).toContain('Nuestro equipo te atenderá pronto');
    expect(srcWf40).not.toMatch(/text:.*Error:/);
    expect(srcWf40).not.toMatch(/text:.*503/);
  });

});

// ---------------------------------------------------------------------------
// HLP-PRIV — privacidad y logging
// ---------------------------------------------------------------------------

describe('HLP-PRIV: privacidad y sanitización de logs', () => {

  it('HLP-PRIV-70: logs no contienen message_text', () => {
    expect(srcWf40).not.toMatch(/log\.(info|warn|error)\([^\n]*message_text/);
  });

  it('HLP-PRIV-71: logs no contienen summary', () => {
    expect(srcWf40).not.toMatch(/log\.(info|warn|error)\([^\n]*summary/);
    expect(srcCreateTicket).not.toMatch(/log\.(info|warn|error)\([^\n]*summary/);
  });

  it('HLP-PRIV-72: logs no contienen answer', () => {
    expect(srcWf40).not.toMatch(/log\.(info|warn|error)\([^\n]*[^i]answer/);
  });

  it('HLP-PRIV-73: logs no contienen teléfono', () => {
    expect(srcWf40).not.toMatch(/log\.(info|warn|error)\([^\n]*phone/);
    expect(srcCreateTicket).not.toMatch(/log\.(info|warn|error)\([^\n]*phone/);
  });

  it('HLP-PRIV-74: logs no contienen email', () => {
    expect(srcWf40).not.toMatch(/log\.(info|warn|error)\([^\n]*email/);
    expect(srcCreateTicket).not.toMatch(/log\.(info|warn|error)\([^\n]*email/);
  });

  it('HLP-PRIV-75: logs no contienen sender_ref', () => {
    expect(srcWf40).not.toMatch(/log\.(info|warn|error)\([^\n]*sender_ref/);
    expect(srcQueryKb).not.toMatch(/log\.(info|warn|error)\([^\n]*sender_ref/);
  });

  it('HLP-PRIV-76: logs no contienen identity_data', () => {
    expect(srcWf40).not.toMatch(/log\.(info|warn|error)\([^\n]*identity_data/);
    expect(srcCreateTicket).not.toMatch(/log\.(info|warn|error)\([^\n]*identity_data/);
  });

  it('HLP-PRIV-77: no llama a Claude real', () => {
    for (const src of [srcWf40, srcCreateTicket, srcQueryKb, srcExtractor, srcKbClient, srcTicketClient]) {
      expect(src).not.toContain('anthropic');
      expect(src).not.toContain('messages.create');
    }
  });

  it('HLP-PRIV-78: no llama a n8n real', () => {
    for (const src of [srcWf40, srcCreateTicket, srcQueryKb, srcExtractor, srcKbClient, srcTicketClient]) {
      expect(src).not.toContain('n8n.io');
      expect(src).not.toContain('/webhook/');
    }
  });

  it('HLP-PRIV-79: adapters no llaman al Core real', () => {
    for (const src of [srcExtractor, srcKbClient, srcTicketClient]) {
      expect(src).not.toContain('fetch(');
      expect(src).not.toContain('smartroom-core');
    }
  });

  it('HLP-PRIV-80: no llama a Wasender real', () => {
    for (const src of [srcWf40, srcCreateTicket, srcQueryKb, srcExtractor, srcKbClient, srcTicketClient]) {
      expect(src).not.toContain('wasender.io');
      expect(src).not.toContain('@s.whatsapp.net');
    }
  });

});

// ---------------------------------------------------------------------------
// HLP-RES — restricciones globales
// ---------------------------------------------------------------------------

describe('HLP-RES: restricciones globales', () => {

  it('HLP-RES-81: no introduce WF-02', () => {
    for (const src of [srcWf40, srcCreateTicket, srcQueryKb]) {
      expect(src).not.toContain('WF-02');
    }
  });

  it('HLP-RES-82: no introduce conv_help_escalated como string value en ninguna fuente', () => {
    for (const src of [srcWf40, srcCreateTicket, srcQueryKb, srcExtractor, srcKbClient, srcTicketClient]) {
      expect(src).not.toMatch(/'conv_help_escalated'/);
    }
  });

  it('HLP-RES-83: no introduce WEAK_MATCH', () => {
    for (const src of [srcWf40, srcCreateTicket, srcQueryKb, srcExtractor, srcKbClient, srcTicketClient]) {
      expect(src).not.toContain('WEAK_MATCH');
    }
  });

  it("HLP-RES-84: no introduce 'UNVERIFIED' standalone", () => {
    for (const src of [srcWf40, srcCreateTicket, srcQueryKb, srcExtractor]) {
      expect(src).not.toContain("'UNVERIFIED'");
    }
  });

  it('HLP-RES-85: no introduce next_retry_at', () => {
    for (const src of [srcWf40, srcCreateTicket, srcQueryKb]) {
      expect(src).not.toContain('next_retry_at');
    }
  });

  it('HLP-RES-86: no introduce attempt_count', () => {
    for (const src of [srcWf40, srcCreateTicket, srcQueryKb]) {
      expect(src).not.toContain('attempt_count');
    }
  });

  it('HLP-RES-87: no modifica WF-20 ni WF-30', () => {
    expect(srcWf40).not.toContain('conv_incidencias');
    expect(srcWf40).not.toContain('conv_publicaciones');
    expect(srcWf40).not.toContain('conv-wf20-incidents');
    expect(srcWf40).not.toContain('conv-wf30-listings');
  });

});

// ---------------------------------------------------------------------------
// HLP-REG — regresión global
// ---------------------------------------------------------------------------

describe('HLP-REG: regresión global — suites previas', () => {
  const EF   = resolve(__dirname, '../../../../../supabase/functions');
  const RTIM = resolve(EF, '_shared/smart-conversations/runtime');

  it('HLP-REG-88: tests de schema — migración mantiene case_ref_type help_ticket', () => {
    const migPath = resolve(
      __dirname,
      '../../../../../supabase/migrations/20260716000001_smart_conversations_core_schema.sql',
    );
    const mig = readFileSync(migPath, 'utf-8');
    expect(mig).toContain('help_ticket');
    expect(mig).toContain('CREATE TABLE conv_cases');
  });

  it('HLP-REG-89: tests de types — enums mantienen conv_ayuda y conv_case_escalated', () => {
    const enums = readFileSync(resolve(EF, '_shared/smart-conversations/enums.ts'), 'utf-8');
    expect(enums).toContain("'conv_ayuda'");
    expect(enums).toContain("'conv_case_escalated'");
    expect(enums).not.toContain("'conv_help_escalated'");
  });

  it('HLP-REG-90: tests de infra — ef-auth y ef-logger siguen disponibles', () => {
    const auth   = readFileSync(resolve(EF, '_shared/smart-conversations/ef-auth.ts'), 'utf-8');
    const logger = readFileSync(resolve(EF, '_shared/smart-conversations/ef-logger.ts'), 'utf-8');
    expect(auth).toContain('isServiceRoleRequest');
    expect(logger).toContain('sanitizeForLog');
    expect(logger).toContain('sanitizeArray');
  });

  it('HLP-REG-91: tests de ingest — conv-ingest mantiene duplicate_ignored y no_service', () => {
    const ingest = readFileSync(resolve(EF, 'conv-ingest/index.ts'), 'utf-8');
    expect(ingest).toContain("'duplicate_ignored'");
    expect(ingest).toContain("'no_service'");
  });

  it('HLP-REG-92: tests de channels — conv-wa-webhook mantiene HMAC', () => {
    const waWebhook = readFileSync(resolve(EF, 'conv-wa-webhook/index.ts'), 'utf-8');
    expect(waWebhook).toContain('HMAC');
  });

  it('HLP-REG-93: tests de outbound — conv-process-send-queue mantiene BACKOFF_SECONDS', () => {
    const queue = readFileSync(resolve(EF, 'conv-process-send-queue/index.ts'), 'utf-8');
    expect(queue).toContain('BACKOFF_SECONDS = [1, 5, 30]');
  });

  it('HLP-REG-94: tests de routing — conv-routing-engine mantiene CONFIDENCE_THRESHOLD', () => {
    const routing = readFileSync(resolve(EF, 'conv-routing-engine/index.ts'), 'utf-8');
    expect(routing).toContain('CONFIDENCE_THRESHOLD = 0.85');
  });

  it('HLP-REG-95: tests de identity — identity-level.ts mantiene canAdvanceIdentityLevel', () => {
    const idLevel = readFileSync(resolve(RTIM, 'identity-level.ts'), 'utf-8');
    expect(idLevel).toContain('canAdvanceIdentityLevel');
    expect(idLevel).not.toContain('WEAK_MATCH');
  });

  it('HLP-REG-96: tests de incidents — wf20-incidents mantiene STRONG_MATCH_ACTIVE', () => {
    const wf20 = readFileSync(resolve(EF, 'conv-wf20-incidents/index.ts'), 'utf-8');
    expect(wf20).toContain('STRONG_MATCH_ACTIVE');
    expect(wf20).not.toContain('UNVERIFIED_LEAD');
  });

  it('HLP-REG-97: tests de listings — wf30-listings mantiene UNVERIFIED_LEAD', () => {
    const wf30 = readFileSync(resolve(EF, 'conv-wf30-listings/index.ts'), 'utf-8');
    expect(wf30).toContain('UNVERIFIED_LEAD');
    expect(wf30).toContain("'conv_publicaciones'");
  });

  it('HLP-REG-98: it.todo restantes siguen registrados en listings-flow spec', () => {
    // Los todos de la lista de fases pendientes siguen presentes en activity-log
    const activityLog = readFileSync(
      resolve(__dirname, '../../../../../tests/regression/smart-conversations/suites/activity-log/activity-log.spec.ts'),
      'utf-8',
    );
    expect(activityLog).toMatch(/it\.todo\(/);
  });

});
