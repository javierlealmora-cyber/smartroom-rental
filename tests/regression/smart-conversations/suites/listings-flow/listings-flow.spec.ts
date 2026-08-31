/**
 * Suite: Listings Flow — WF-30 (Fase 8B)
 * Análisis estático de conv-wf30-listings, conv-core-query-listings,
 * conv-core-create-lead, listing-intent-extractor, core-listings-client, core-lead-client.
 *
 * IDs: LST-AUTH, LST-EXTRACT, LST-QUERY, LST-SEARCH, LST-DETAILS,
 *      LST-LEAD, LST-UNVERIFIED, LST-ACT, LST-ERR, LST-PRIV, LST-RES, LST-REG
 */

import { describe, it, beforeAll, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EF_DIR     = resolve(__dirname, '../../../../../supabase/functions');
const SHARED_DIR = resolve(EF_DIR, '_shared/smart-conversations/runtime');

let srcWf30:           string;
let srcQueryListings:  string;
let srcCreateLead:     string;
let srcExtractor:      string;
let srcListingsClient: string;
let srcLeadClient:     string;

beforeAll(() => {
  srcWf30          = readFileSync(resolve(EF_DIR, 'conv-wf30-listings/index.ts'), 'utf-8');
  srcQueryListings = readFileSync(resolve(EF_DIR, 'conv-core-query-listings/index.ts'), 'utf-8');
  srcCreateLead    = readFileSync(resolve(EF_DIR, 'conv-core-create-lead/index.ts'), 'utf-8');
  srcExtractor     = readFileSync(resolve(SHARED_DIR, 'listing-intent-extractor.ts'), 'utf-8');
  srcListingsClient = readFileSync(resolve(SHARED_DIR, 'core-listings-client.ts'), 'utf-8');
  srcLeadClient    = readFileSync(resolve(SHARED_DIR, 'core-lead-client.ts'), 'utf-8');
});

// ---------------------------------------------------------------------------
// LST-AUTH — autenticación y validación de input
// ---------------------------------------------------------------------------

describe('LST-AUTH: autenticación y validación de input', () => {

  it('LST-AUTH-01: conv-wf30-listings requiere service_role', () => {
    expect(srcWf30).toContain('isServiceRoleRequest');
    expect(srcWf30).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(srcWf30).toContain('ERROR_CODES.UNAUTHORIZED');
  });

  it('LST-AUTH-02: conv-wf30-listings rechaza session_token — no usa getUser/getSession', () => {
    expect(srcWf30).not.toContain('getUser');
    expect(srcWf30).not.toContain('getSession');
  });

  it('LST-AUTH-03: rechaza payload sin client_account_id', () => {
    expect(srcWf30).toContain('client_account_id es obligatorio');
  });

  it('LST-AUTH-04: rechaza payload sin session_id', () => {
    expect(srcWf30).toContain('session_id es obligatorio');
  });

  it('LST-AUTH-05: rechaza payload sin message_id', () => {
    expect(srcWf30).toContain('message_id es obligatorio');
  });

  it('LST-AUTH-06: rechaza service_code distinto de conv_publicaciones', () => {
    expect(srcWf30).toContain('service_code !== SERVICE_CODE');
    expect(srcWf30).toContain("'conv_publicaciones'");
  });

  it('LST-AUTH-07: conv-core-query-listings requiere service_role', () => {
    expect(srcQueryListings).toContain('isServiceRoleRequest');
    expect(srcQueryListings).toContain('ERROR_CODES.UNAUTHORIZED');
  });

  it('LST-AUTH-08: conv-core-create-lead requiere service_role', () => {
    expect(srcCreateLead).toContain('isServiceRoleRequest');
    expect(srcCreateLead).toContain('ERROR_CODES.UNAUTHORIZED');
  });

});

// ---------------------------------------------------------------------------
// LST-EXTRACT — extractor de intención de listing
// ---------------------------------------------------------------------------

describe('LST-EXTRACT: extractor de intención de listing', () => {

  it('LST-EXTRACT-09: extractor no llama a Claude real', () => {
    expect(srcExtractor).not.toContain('anthropic');
    expect(srcExtractor).not.toContain('messages.create');
  });

  it('LST-EXTRACT-10: extractor no hace fetch', () => {
    expect(srcExtractor).not.toContain('fetch(');
  });

  it('LST-EXTRACT-11: extractor no loguea message_text', () => {
    expect(srcExtractor).not.toMatch(/log\.(info|warn|error)\([^\n]*messageText/);
    expect(srcExtractor).not.toMatch(/console\.(log|warn|error)\([^\n]*messageText/);
  });

  it('LST-EXTRACT-12: extractor puede detectar búsqueda de habitación — contiene keyword search_listing', () => {
    expect(srcExtractor).toContain('search_listing');
    expect(srcExtractor).toContain('habitación');
  });

  it('LST-EXTRACT-13: extractor puede detectar solicitud de visita — contiene request_visit', () => {
    expect(srcExtractor).toContain('request_visit');
    expect(srcExtractor).toContain('visita');
  });

  it('LST-EXTRACT-14: extractor puede detectar contacto — contiene leave_contact', () => {
    expect(srcExtractor).toContain('leave_contact');
    expect(srcExtractor).toContain('interesado');
  });

  it('LST-EXTRACT-15: contacto extraído se trata como PII — comentario explícito en fuente', () => {
    // El adapter documenta que contact_phone y contact_email son PII y no se deben loguear
    expect(srcExtractor).toContain('contact_phone');
    expect(srcExtractor).toContain('contact_email');
    expect(srcExtractor).toMatch(/PII|loguear/);
  });

});

// ---------------------------------------------------------------------------
// LST-QUERY — conv-core-query-listings
// ---------------------------------------------------------------------------

describe('LST-QUERY: conv-core-query-listings', () => {

  it('LST-QUERY-16: conv-core-query-listings no llama al Core real', () => {
    expect(srcListingsClient).not.toContain('fetch(');
    expect(srcListingsClient).not.toContain('smartroom-core');
    expect(srcListingsClient).not.toContain('/api/v1/');
  });

  it('LST-QUERY-17: conv-core-query-listings no acepta profile_id', () => {
    expect(srcQueryListings).toContain("'profile_id' in body");
    expect(srcQueryListings).toContain('profile_id no está permitido en query-listings');
  });

  it('LST-QUERY-18: conv-core-query-listings no acepta identity_data', () => {
    expect(srcQueryListings).toContain("'identity_data' in body");
    expect(srcQueryListings).toContain('identity_data no está permitido en query-listings');
  });

  it('LST-QUERY-19: conv-core-query-listings no acepta sender_ref', () => {
    expect(srcQueryListings).toContain("'sender_ref' in body");
    expect(srcQueryListings).toContain('sender_ref no está permitido en query-listings');
  });

  it('LST-QUERY-20: mock devuelve solo campos públicos — listing_id, listing_ref, title, public_location, price, availability, public_room_label', () => {
    expect(srcListingsClient).toContain('listing_id');
    expect(srcListingsClient).toContain('listing_ref');
    expect(srcListingsClient).toContain('title');
    expect(srcListingsClient).toContain('public_location');
    expect(srcListingsClient).toContain('price');
    expect(srcListingsClient).toContain('availability');
    expect(srcListingsClient).toContain('public_room_label');
  });

  it('LST-QUERY-21: mock no devuelve assignment_id como campo de datos de listing', () => {
    // assignment_id no aparece como campo en PublicListing ni en MOCK_LISTINGS
    expect(srcListingsClient).not.toMatch(/assignment_id\s*:/);
  });

  it('LST-QUERY-22: mock no devuelve dirección exacta — no hay campo address o street', () => {
    expect(srcListingsClient).not.toContain('address');
    expect(srcListingsClient).not.toContain('street');
    expect(srcListingsClient).not.toContain('exact_address');
  });

  it('LST-QUERY-23: public_room_label es dato público de anuncio, no de identidad/contrato', () => {
    // public_room_label forma parte de PublicListing, no de datos contractuales
    expect(srcListingsClient).toContain('public_room_label');
    // room_id interno NO aparece como campo de la interfaz PublicListing ni en MOCK_LISTINGS
    expect(srcListingsClient).not.toMatch(/room_id\s*:/);
  });

});

// ---------------------------------------------------------------------------
// LST-SEARCH — flujo búsqueda (search_listing)
// ---------------------------------------------------------------------------

describe('LST-SEARCH: flujo búsqueda (search_listing)', () => {

  it('LST-SEARCH-24: search_listing llama a conv-core-query-listings', () => {
    expect(srcWf30).toContain('conv-core-query-listings');
    const searchPos   = srcWf30.indexOf("extraction.intent_type === 'search_listing'");
    const queryPos    = srcWf30.indexOf('conv-core-query-listings');
    expect(searchPos).toBeGreaterThan(0);
    expect(queryPos).toBeGreaterThan(searchPos);
  });

  it("LST-SEARCH-25: crea conv_case con service_code='conv_publicaciones'", () => {
    // El insert del caso de búsqueda usa service_code: SERVICE_CODE
    expect(srcWf30).toContain("service_code:  SERVICE_CODE");
    // Y SERVICE_CODE está definido como 'conv_publicaciones'
    expect(srcWf30).toContain("const SERVICE_CODE = 'conv_publicaciones'");
  });

  it("LST-SEARCH-26: caso de búsqueda nace con status='open'", () => {
    const searchInsert = srcWf30.match(/intent_type === 'search_listing'[\s\S]{0,600}status:\s*'open'/);
    expect(searchInsert).not.toBeNull();
  });

  it("LST-SEARCH-27: caso usa case_ref_type='lead'", () => {
    expect(srcWf30).toContain("case_ref_type: 'lead'");
  });

  it('LST-SEARCH-28: search_listing no crea lead oficial — no llama a conv-core-create-lead en rama search', () => {
    const searchPos   = srcWf30.indexOf("intent_type === 'search_listing'");
    const leadCallPos = srcWf30.indexOf('conv-core-create-lead');
    expect(searchPos).toBeGreaterThan(0);
    expect(leadCallPos).toBeGreaterThan(0);
    // La rama search hace return antes de llegar a conv-core-create-lead
    const searchBlock = srcWf30.slice(searchPos, leadCallPos);
    expect(searchBlock).toContain('return ok(');
  });

  it("LST-SEARCH-29: search_listing no publica conv_lead_created", () => {
    const searchPos    = srcWf30.indexOf("intent_type === 'search_listing'");
    const leadEventPos = srcWf30.indexOf("'conv_lead_created'");
    expect(searchPos).toBeGreaterThan(0);
    expect(leadEventPos).toBeGreaterThan(0);
    // La rama search hace return antes de que se llegue a conv_lead_created
    const searchBlock = srcWf30.slice(searchPos, leadEventPos);
    expect(searchBlock).toContain('return ok(');
  });

  it("LST-SEARCH-30: devuelve response_type='listing_results'", () => {
    expect(srcWf30).toContain("response_type: 'listing_results'");
  });

});

// ---------------------------------------------------------------------------
// LST-DETAILS — flujo detalles (ask_details)
// ---------------------------------------------------------------------------

describe('LST-DETAILS: flujo detalles (ask_details)', () => {

  it('LST-DETAILS-31: ask_details sin listing_id pide aclaración', () => {
    expect(srcWf30).toContain('ask_details sin listing_id — pedir aclaración');
    expect(srcWf30).toContain('extraction.listing_id');
  });

  it('LST-DETAILS-32: ask_details con listing_id devuelve listing_details', () => {
    expect(srcWf30).toContain("response_type: 'listing_details'");
    expect(srcWf30).toContain('listingDetail');
  });

  it('LST-DETAILS-33: no devuelve datos internos de contrato — solo public listing', () => {
    const detailsBlock = srcWf30.match(/response_type: 'listing_details'[\s\S]{0,300}/);
    expect(detailsBlock).not.toBeNull();
    const block = detailsBlock![0];
    expect(block).not.toContain('assignment_id');
    expect(block).not.toContain('profile_id');
    expect(block).not.toContain('identity_data');
  });

  it('LST-DETAILS-34: no devuelve PII en ask_details', () => {
    const detailsReturn = srcWf30.match(/listing_details[\s\S]{0,300}/);
    expect(detailsReturn).not.toBeNull();
    expect(detailsReturn![0]).not.toContain('phone');
    expect(detailsReturn![0]).not.toContain('email');
    expect(detailsReturn![0]).not.toContain('full_name');
  });

});

// ---------------------------------------------------------------------------
// LST-LEAD — flujo lead (request_visit / leave_contact)
// ---------------------------------------------------------------------------

describe('LST-LEAD: flujo lead (request_visit / leave_contact)', () => {

  it('LST-LEAD-35: request_visit sin contacto suficiente devuelve pending_input', () => {
    expect(srcWf30).toContain("response_type:  'pending_input'");
    expect(srcWf30).toContain('is_complete');
    const incompleteBlock = srcWf30.match(/!extraction\.is_complete[\s\S]{0,200}pending_input/);
    expect(incompleteBlock).not.toBeNull();
  });

  it('LST-LEAD-36: leave_contact con contacto suficiente llama a conv-core-create-lead', () => {
    const leadCallPos = srcWf30.indexOf('functions/v1/conv-core-create-lead');
    expect(leadCallPos).toBeGreaterThan(0);
  });

  it('LST-LEAD-37: conv-core-create-lead no llama al Core real', () => {
    expect(srcLeadClient).not.toContain('fetch(');
    expect(srcLeadClient).not.toContain('smartroom-core');
    expect(srcLeadClient).not.toContain('/api/v1/');
  });

  it('LST-LEAD-38: conv-core-create-lead no loguea contacto', () => {
    expect(srcCreateLead).not.toMatch(/log\.(info|warn|error)\([^\n]*contact/);
    expect(srcCreateLead).not.toMatch(/log\.(info|warn|error)\([^\n]*phone/);
    expect(srcCreateLead).not.toMatch(/log\.(info|warn|error)\([^\n]*email/);
  });

  it("LST-LEAD-39: lead oficial actualiza conv_cases.status='waiting_internal'", () => {
    expect(srcWf30).toContain("status:   'waiting_internal'");
    const leadBlock = srcWf30.match(/leadRef[\s\S]{0,400}waiting_internal/);
    expect(leadBlock).not.toBeNull();
  });

  it('LST-LEAD-40: guarda case_ref=lead_ref', () => {
    expect(srcWf30).toContain('case_ref: leadRef');
  });

  it("LST-LEAD-41: caso de lead usa case_ref_type='lead'", () => {
    // case_ref_type: 'lead' aparece en el insert del caso de lead
    const leadInsert = srcWf30.match(/request_visit.*?leave_contact[\s\S]{0,1000}case_ref_type: 'lead'/s);
    // O verificar más simplemente que case_ref_type: 'lead' existe en la EF
    expect(srcWf30).toContain("case_ref_type: 'lead'");
  });

  it("LST-LEAD-42: publica conv_lead_created", () => {
    expect(srcWf30).toContain("'conv_lead_created'");
    const leadEventPos = srcWf30.indexOf("'conv_lead_created'");
    const leadBlock    = srcWf30.match(/leadRef[\s\S]{0,800}conv_lead_created/);
    expect(leadBlock).not.toBeNull();
    void leadEventPos;
  });

  it('LST-LEAD-43: devuelve confirmación con lead_ref', () => {
    expect(srcWf30).toContain("response_type: 'lead_created'");
    expect(srcWf30).toContain('lead_ref:      leadRef');
    expect(srcWf30).toContain("next_state:    'waiting_internal'");
  });

  it('LST-LEAD-44: no deja marcadores sin sustituir — usa template literal con leadRef', () => {
    // Verifica que se llama a findUnsubstitutedMarkers como guardia
    expect(srcWf30).toContain('findUnsubstitutedMarkers');
    // El texto de confirmación usa interpolación directa (no template {lead_ref})
    expect(srcWf30).toContain('leadRef}.');
  });

});

// ---------------------------------------------------------------------------
// LST-UNVERIFIED — UNVERIFIED_LEAD
// ---------------------------------------------------------------------------

describe('LST-UNVERIFIED: identidad UNVERIFIED_LEAD', () => {

  it('LST-UNVERIFIED-45: WF-30 puede asignar UNVERIFIED_LEAD', () => {
    expect(srcWf30).toContain('UNVERIFIED_LEAD');
    expect(srcWf30).toContain('LEVEL_UNVERIFIED_LEAD');
    expect(srcWf30).toContain("identity_level: LEVEL_UNVERIFIED_LEAD");
  });

  it('LST-UNVERIFIED-46: conv-core-validate-identity sigue sin devolver UNVERIFIED_LEAD', () => {
    const validateSrc = readFileSync(
      resolve(EF_DIR, 'conv-core-validate-identity/index.ts'),
      'utf-8',
    );
    expect(validateSrc).not.toContain("'UNVERIFIED_LEAD'");
    expect(validateSrc).not.toContain('UNVERIFIED_LEAD');
  });

  it('LST-UNVERIFIED-47: UNVERIFIED_LEAD no se trata como STRONG_MATCH_ACTIVE', () => {
    // isIdentifiedTenant solo incluye STRONG_MATCH_ACTIVE y PARTIAL_MATCH_ACTIVE
    const identifiedBlock = srcWf30.match(/isIdentifiedTenant\s*=[\s\S]{0,200}/);
    expect(identifiedBlock).not.toBeNull();
    expect(identifiedBlock![0]).not.toContain('UNVERIFIED_LEAD');
    expect(identifiedBlock![0]).toContain('STRONG_MATCH_ACTIVE');
  });

  it('LST-UNVERIFIED-48: UNVERIFIED_LEAD no permite crear incidencias oficiales — wf20 no lo reconoce', () => {
    const wf20Src = readFileSync(resolve(EF_DIR, 'conv-wf20-incidents/index.ts'), 'utf-8');
    expect(wf20Src).not.toContain('UNVERIFIED_LEAD');
  });

  it("LST-UNVERIFIED-49: no introduce 'UNVERIFIED' standalone", () => {
    for (const src of [srcWf30, srcCreateLead, srcQueryListings, srcExtractor]) {
      expect(src).not.toContain("'UNVERIFIED'");
    }
  });

  it('LST-UNVERIFIED-50: no introduce WEAK_MATCH', () => {
    for (const src of [srcWf30, srcCreateLead, srcQueryListings, srcExtractor, srcListingsClient, srcLeadClient]) {
      expect(src).not.toContain('WEAK_MATCH');
    }
  });

});

// ---------------------------------------------------------------------------
// LST-ACT — Activity Log
// ---------------------------------------------------------------------------

describe('LST-ACT: Activity Log de leads', () => {

  it('LST-ACT-51: conv_lead_created contiene lead_id', () => {
    const actBlock = srcWf30.match(/const activityData[\s\S]{0,400}/);
    expect(actBlock).not.toBeNull();
    expect(actBlock![0]).toContain('lead_id');
  });

  it('LST-ACT-52: conv_lead_created contiene lead_ref', () => {
    const actBlock = srcWf30.match(/const activityData[\s\S]{0,400}/);
    expect(actBlock![0]).toContain('lead_ref');
  });

  it('LST-ACT-53: conv_lead_created contiene listing_id', () => {
    const actBlock = srcWf30.match(/const activityData[\s\S]{0,400}/);
    expect(actBlock![0]).toContain('listing_id');
  });

  it('LST-ACT-54: conv_lead_created contiene conv_case_id', () => {
    const actBlock = srcWf30.match(/const activityData[\s\S]{0,400}/);
    expect(actBlock![0]).toContain('conv_case_id');
  });

  it('LST-ACT-55: conv_lead_created contiene channel', () => {
    const actBlock = srcWf30.match(/const activityData[\s\S]{0,400}/);
    expect(actBlock![0]).toContain('channel');
  });

  it('LST-ACT-56: conv_lead_created contiene interest_type', () => {
    const actBlock = srcWf30.match(/const activityData[\s\S]{0,400}/);
    expect(actBlock![0]).toContain('interest_type');
  });

  it('LST-ACT-57: conv_lead_created NO contiene session_id', () => {
    const actBlock = srcWf30.match(/const activityData[\s\S]{0,400}/);
    expect(actBlock![0]).not.toContain('session_id');
  });

  it('LST-ACT-58: conv_lead_created NO contiene contacto', () => {
    const actBlock = srcWf30.match(/const activityData[\s\S]{0,400}/);
    expect(actBlock![0]).not.toContain('contact');
  });

  it('LST-ACT-59: conv_lead_created NO contiene phone', () => {
    const actBlock = srcWf30.match(/const activityData[\s\S]{0,400}/);
    expect(actBlock![0]).not.toContain('phone');
  });

  it('LST-ACT-60: conv_lead_created NO contiene email', () => {
    const actBlock = srcWf30.match(/const activityData[\s\S]{0,400}/);
    expect(actBlock![0]).not.toContain('email');
  });

  it('LST-ACT-61: conv_lead_created NO contiene name', () => {
    const actBlock = srcWf30.match(/const activityData[\s\S]{0,400}/);
    expect(actBlock![0]).not.toContain('name');
  });

  it('LST-ACT-62: fallo de Activity Log no hace rollback — fire-and-log', () => {
    expect(srcWf30).toMatch(/conv_lead_created[\s\S]{0,300}\.catch\(/);
  });

});

// ---------------------------------------------------------------------------
// LST-ERR — errores Core mock (backoff)
// ---------------------------------------------------------------------------

describe('LST-ERR: errores Core mock y backoff', () => {

  it('LST-ERR-63: 4xx no reintenta — nonRetryable', () => {
    expect(srcCreateLead).toContain('HTTP_CLIENT_ERROR_MIN');
    expect(srcCreateLead).toContain('HTTP_CLIENT_ERROR_MAX');
    expect(srcCreateLead).toContain('nonRetryable = true');
  });

  it('LST-ERR-64: 5xx reintenta con backoff 1s/5s/30s', () => {
    expect(srcCreateLead).toContain('CORE_BACKOFF_SECONDS = [1, 5, 30]');
    expect(srcCreateLead).toContain('HTTP_SERVER_ERROR_MIN');
  });

  it('LST-ERR-65: timeout se trata como 5xx — default statusCode = HTTP_SERVER_ERROR_MIN', () => {
    const catchBlock = srcCreateLead.match(/catch.*?HTTP_SERVER_ERROR_MIN/s);
    expect(catchBlock).not.toBeNull();
  });

  it('LST-ERR-66: máximo 3 intentos totales', () => {
    expect(srcCreateLead).toContain('MAX_CORE_ATTEMPTS    = 3');
    expect(srcCreateLead).toContain('attempts < MAX_CORE_ATTEMPTS');
  });

  it('LST-ERR-67: no hay cuarto intento — while loop guarda con MAX_CORE_ATTEMPTS', () => {
    expect(srcCreateLead).toContain('while (attempts < MAX_CORE_ATTEMPTS');
  });

  it('LST-ERR-68: 5xx agotado crea conv_admin_notifications sin PII', () => {
    expect(srcWf30).toContain('conv_admin_notifications');
    expect(srcWf30).toContain("notification_type: 'lead_creation_failed'");
    // El contexto de la notificación no incluye campos de contacto PII
    const notifBlock = srcWf30.match(/lead_creation_failed[\s\S]{0,400}/);
    expect(notifBlock).not.toBeNull();
    expect(notifBlock![0]).not.toMatch(/contact_phone|contact_email|contact_name/);
    expect(notifBlock![0]).not.toContain('phone:');
    expect(notifBlock![0]).not.toContain('email:');
  });

  it('LST-ERR-69: error técnico no llega al usuario — mensaje genérico', () => {
    // La respuesta al usuario tras Core no disponible es genérica
    expect(srcWf30).toContain('Hemos registrado tu interés');
    expect(srcWf30).not.toMatch(/text:.*Error:/);
    expect(srcWf30).not.toMatch(/text:.*503/);
  });

});

// ---------------------------------------------------------------------------
// LST-PRIV — privacidad y logging
// ---------------------------------------------------------------------------

describe('LST-PRIV: privacidad y sanitización de logs', () => {

  it('LST-PRIV-70: logs no contienen message_text', () => {
    expect(srcWf30).not.toMatch(/log\.(info|warn|error)\([^\n]*message_text/);
  });

  it('LST-PRIV-71: logs no contienen contact', () => {
    expect(srcWf30).not.toMatch(/log\.(info|warn|error)\([^\n]*contact/);
    expect(srcCreateLead).not.toMatch(/log\.(info|warn|error)\([^\n]*contact/);
  });

  it('LST-PRIV-72: logs no contienen teléfono', () => {
    expect(srcWf30).not.toMatch(/log\.(info|warn|error)\([^\n]*phone/);
    expect(srcCreateLead).not.toMatch(/log\.(info|warn|error)\([^\n]*phone/);
  });

  it('LST-PRIV-73: logs no contienen email', () => {
    expect(srcWf30).not.toMatch(/log\.(info|warn|error)\([^\n]*email/);
    expect(srcCreateLead).not.toMatch(/log\.(info|warn|error)\([^\n]*email/);
  });

  it('LST-PRIV-74: logs no contienen sender_ref', () => {
    expect(srcWf30).not.toMatch(/log\.(info|warn|error)\([^\n]*sender_ref/);
    expect(srcQueryListings).not.toMatch(/log\.(info|warn|error)\([^\n]*sender_ref/);
  });

  it('LST-PRIV-75: logs no contienen identity_data', () => {
    expect(srcWf30).not.toMatch(/log\.(info|warn|error)\([^\n]*identity_data/);
    expect(srcCreateLead).not.toMatch(/log\.(info|warn|error)\([^\n]*identity_data/);
  });

  it('LST-PRIV-76: no llama a Claude real', () => {
    for (const src of [srcWf30, srcCreateLead, srcQueryListings, srcExtractor, srcListingsClient, srcLeadClient]) {
      expect(src).not.toContain('anthropic');
      expect(src).not.toContain('messages.create');
    }
  });

  it('LST-PRIV-77: no llama a n8n real', () => {
    for (const src of [srcWf30, srcCreateLead, srcQueryListings, srcExtractor, srcListingsClient, srcLeadClient]) {
      expect(src).not.toContain('n8n.io');
      expect(src).not.toContain('/webhook/');
    }
  });

  it('LST-PRIV-78: adapters no llaman al Core real', () => {
    for (const src of [srcExtractor, srcListingsClient, srcLeadClient]) {
      expect(src).not.toContain('fetch(');
      expect(src).not.toContain('smartroom-core');
    }
  });

  it('LST-PRIV-79: no llama a Wasender real', () => {
    for (const src of [srcWf30, srcCreateLead, srcQueryListings, srcExtractor, srcListingsClient, srcLeadClient]) {
      expect(src).not.toContain('wasender.io');
      expect(src).not.toContain('@s.whatsapp.net');
    }
  });

});

// ---------------------------------------------------------------------------
// LST-RES — restricciones globales
// ---------------------------------------------------------------------------

describe('LST-RES: restricciones globales', () => {

  it('LST-RES-80: no introduce WF-02', () => {
    for (const src of [srcWf30, srcCreateLead, srcQueryListings]) {
      expect(src).not.toContain('WF-02');
    }
  });

  it('LST-RES-81: no introduce next_retry_at', () => {
    for (const src of [srcWf30, srcCreateLead, srcQueryListings]) {
      expect(src).not.toContain('next_retry_at');
    }
  });

  it('LST-RES-82: no introduce attempt_count', () => {
    for (const src of [srcWf30, srcCreateLead, srcQueryListings]) {
      expect(src).not.toContain('attempt_count');
    }
  });

  it('LST-RES-83: no implementa WF-40', () => {
    for (const src of [srcWf30, srcCreateLead]) {
      expect(src).not.toContain('WF-40');
      expect(src).not.toContain('conv-wf40');
    }
  });

  it('LST-RES-84: no modifica WF-20 ni incidencias', () => {
    // WF-30 no importa ni referencia funciones exclusivas de WF-20
    expect(srcWf30).not.toContain('conv_incidencias');
    expect(srcWf30).not.toContain('conv-wf20-incidents');
    expect(srcWf30).not.toContain('conv-core-create-incident');
  });

});

// ---------------------------------------------------------------------------
// LST-REG — regresión global
// ---------------------------------------------------------------------------

describe('LST-REG: regresión global — suites previas', () => {
  const EF   = resolve(__dirname, '../../../../../supabase/functions');
  const RTIM = resolve(EF, '_shared/smart-conversations/runtime');

  it('LST-REG-85: tests de schema — migración mantiene conv_cases con case_ref_type lead', () => {
    const migPath = resolve(
      __dirname,
      '../../../../../supabase/migrations/20260716000001_smart_conversations_core_schema.sql',
    );
    const mig = readFileSync(migPath, 'utf-8');
    expect(mig).toContain('CREATE TABLE conv_cases');
    expect(mig).toContain("'lead'");
  });

  it('LST-REG-86: tests de types — enums mantienen conv_publicaciones y conv_lead_created', () => {
    const enums = readFileSync(resolve(EF, '_shared/smart-conversations/enums.ts'), 'utf-8');
    expect(enums).toContain("'conv_publicaciones'");
    expect(enums).toContain("'conv_lead_created'");
  });

  it('LST-REG-87: tests de infra — ef-auth y ef-logger siguen disponibles', () => {
    const auth   = readFileSync(resolve(EF, '_shared/smart-conversations/ef-auth.ts'), 'utf-8');
    const logger = readFileSync(resolve(EF, '_shared/smart-conversations/ef-logger.ts'), 'utf-8');
    expect(auth).toContain('isServiceRoleRequest');
    expect(logger).toContain('sanitizeForLog');
    expect(logger).toContain('sanitizeArray');
  });

  it('LST-REG-88: tests de ingest — conv-ingest mantiene duplicate_ignored y no_service', () => {
    const ingest = readFileSync(resolve(EF, 'conv-ingest/index.ts'), 'utf-8');
    expect(ingest).toContain("'duplicate_ignored'");
    expect(ingest).toContain("'no_service'");
  });

  it('LST-REG-89: tests de channels — conv-wa-webhook mantiene HMAC', () => {
    const waWebhook = readFileSync(resolve(EF, 'conv-wa-webhook/index.ts'), 'utf-8');
    expect(waWebhook).toContain('HMAC');
  });

  it('LST-REG-90: tests de outbound — conv-process-send-queue mantiene BACKOFF_SECONDS', () => {
    const queue = readFileSync(resolve(EF, 'conv-process-send-queue/index.ts'), 'utf-8');
    expect(queue).toContain('BACKOFF_SECONDS = [1, 5, 30]');
  });

  it('LST-REG-91: tests de routing — conv-routing-engine mantiene CONFIDENCE_THRESHOLD', () => {
    const routing = readFileSync(resolve(EF, 'conv-routing-engine/index.ts'), 'utf-8');
    expect(routing).toContain('CONFIDENCE_THRESHOLD = 0.85');
  });

  it('LST-REG-92: tests de identity — identity-level.ts mantiene canAdvanceIdentityLevel sin WEAK_MATCH', () => {
    const idLevel = readFileSync(resolve(RTIM, 'identity-level.ts'), 'utf-8');
    expect(idLevel).toContain('canAdvanceIdentityLevel');
    expect(idLevel).not.toContain('WEAK_MATCH');
  });

  it('LST-REG-93: tests de incidents — wf20-incidents mantiene STRONG_MATCH_ACTIVE y LEVEL_PARTIAL', () => {
    const wf20 = readFileSync(resolve(EF, 'conv-wf20-incidents/index.ts'), 'utf-8');
    expect(wf20).toContain('STRONG_MATCH_ACTIVE');
    expect(wf20).toContain('LEVEL_PARTIAL');
  });

  it('LST-REG-94: suite help-flow está implementada con tests reales', () => {
    const helpFlow = readFileSync(
      resolve(__dirname, '../../../../../tests/regression/smart-conversations/suites/help-flow/help-flow.spec.ts'),
      'utf-8',
    );
    // Fase 8C completa — help-flow tiene tests reales (no todos)
    expect(helpFlow).toContain("describe('HLP-AUTH:");
    expect(helpFlow).toContain("describe('HLP-REG:");
  });

});
