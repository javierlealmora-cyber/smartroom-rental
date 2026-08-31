/**
 * Suite: Incidents — WF-20 (Fase 8A)
 * Análisis estático de conv-wf20-incidents, conv-core-create-incident,
 * incident-extractor, core-incident-client.
 *
 * IDs: INC-AUTH, INC-EXTRACT, INC-STRONG, INC-PARTIAL, INC-INACTIVE,
 *      INC-NOMATCH, INC-ERR, INC-ACT, INC-PRIV, INC-RES, INC-REG
 */

import { describe, it, beforeAll, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EF_DIR     = resolve(__dirname, '../../../../../supabase/functions');
const SHARED_DIR = resolve(EF_DIR, '_shared/smart-conversations/runtime');

let srcWf20:            string;
let srcCreateIncident:  string;
let srcExtractor:       string;
let srcIncidentClient:  string;

beforeAll(() => {
  srcWf20           = readFileSync(resolve(EF_DIR, 'conv-wf20-incidents/index.ts'), 'utf-8');
  srcCreateIncident = readFileSync(resolve(EF_DIR, 'conv-core-create-incident/index.ts'), 'utf-8');
  srcExtractor      = readFileSync(resolve(SHARED_DIR, 'incident-extractor.ts'), 'utf-8');
  srcIncidentClient = readFileSync(resolve(SHARED_DIR, 'core-incident-client.ts'), 'utf-8');
});

// ---------------------------------------------------------------------------
// INC-AUTH — autenticación y validación de input
// ---------------------------------------------------------------------------

describe('INC-AUTH: autenticación y validación de input', () => {

  it('INC-AUTH-01: conv-wf20-incidents requiere service_role', () => {
    expect(srcWf20).toContain('isServiceRoleRequest');
    expect(srcWf20).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(srcWf20).toContain('ERROR_CODES.UNAUTHORIZED');
  });

  it('INC-AUTH-02: conv-wf20-incidents rechaza session_token — no usa getUser/getSession', () => {
    expect(srcWf20).not.toContain('getUser');
    expect(srcWf20).not.toContain('getSession');
  });

  it('INC-AUTH-03: rechaza payload sin client_account_id', () => {
    expect(srcWf20).toContain('client_account_id es obligatorio');
  });

  it('INC-AUTH-04: rechaza payload sin session_id', () => {
    expect(srcWf20).toContain('session_id es obligatorio');
  });

  it('INC-AUTH-05: rechaza payload sin message_id', () => {
    expect(srcWf20).toContain('message_id es obligatorio');
  });

  it('INC-AUTH-06: rechaza service_code distinto de conv_incidencias', () => {
    expect(srcWf20).toContain("service_code !== SERVICE_CODE");
    expect(srcWf20).toContain("'conv_incidencias'");
  });

  it('INC-AUTH-07: conv-core-create-incident requiere service_role', () => {
    expect(srcCreateIncident).toContain('isServiceRoleRequest');
    expect(srcCreateIncident).toContain('ERROR_CODES.UNAUTHORIZED');
  });

});

// ---------------------------------------------------------------------------
// INC-EXTRACT — extractor de datos de incidencia
// ---------------------------------------------------------------------------

describe('INC-EXTRACT: extractor de datos de incidencia', () => {

  it('INC-EXTRACT-08: extractor no llama a Claude real', () => {
    expect(srcExtractor).not.toContain('anthropic');
    expect(srcExtractor).not.toContain('messages.create');
  });

  it('INC-EXTRACT-09: extractor no hace fetch', () => {
    expect(srcExtractor).not.toContain('fetch(');
  });

  it('INC-EXTRACT-10: extractor no loguea message_text', () => {
    expect(srcExtractor).not.toMatch(/log\.(info|warn|error)\([^\n]*messageText/);
    expect(srcExtractor).not.toMatch(/console\.(log|warn|error)\([^\n]*messageText/);
  });

  it('INC-EXTRACT-11: datos incompletos se marcan con is_complete=false', () => {
    expect(srcExtractor).toContain('is_complete');
    expect(srcExtractor).toContain('missing_fields');
    // La lógica de completitud usa longitud de descripción
    expect(srcExtractor).toContain('description.length');
  });

  it('INC-EXTRACT-12: datos completos permiten is_complete=true', () => {
    expect(srcExtractor).toContain('is_complete');
    // La propiedad is_complete refleja si la descripción tiene suficiente contenido
    expect(srcExtractor).toMatch(/is_complete\s*[=:]/);
  });

});

// ---------------------------------------------------------------------------
// INC-STRONG — rama STRONG_MATCH_ACTIVE
// ---------------------------------------------------------------------------

describe('INC-STRONG: rama STRONG_MATCH_ACTIVE', () => {

  it('INC-STRONG-13: con datos completos llama a conv-core-create-incident', () => {
    expect(srcWf20).toContain('conv-core-create-incident');
    // La llamada es via fetch
    const coreCallPos = srcWf20.indexOf('functions/v1/conv-core-create-incident');
    expect(coreCallPos).toBeGreaterThan(0);
  });

  it('INC-STRONG-14: conv-core-create-incident lee profile_id desde conv_sessions', () => {
    // Carga la sesión para obtener profile_id internamente (junto con otros campos server-side)
    expect(srcCreateIncident).toContain("profile_id, identity_data");
    expect(srcCreateIncident).toContain("sessionRow");
  });

  it('INC-STRONG-15: conv-core-create-incident lee room_id desde identity_data', () => {
    expect(srcCreateIncident).toContain('room_id');
    expect(srcCreateIncident).toContain('identity_data');
    // room_id se extrae de sessionRow.identity_data, no del payload
    expect(srcCreateIncident).toContain("sessionRow.identity_data");
  });

  it('INC-STRONG-16: conv-core-create-incident no acepta profile_id desde payload externo', () => {
    // profile_id no aparece en el body de input de conv-core-create-incident
    const bodyBlock = srcCreateIncident.match(/body:\s*\{[\s\S]{0,800}\}/);
    // El body type no incluye profile_id como campo recibido
    const bodyTypeBlock = srcCreateIncident.match(/let body:\s*\{[\s\S]{0,600}\}/);
    expect(bodyTypeBlock).not.toBeNull();
    expect(bodyTypeBlock![0]).not.toContain('profile_id?:');
  });

  it('INC-STRONG-17: conv-core-create-incident no acepta room_id desde payload externo', () => {
    const bodyTypeBlock = srcCreateIncident.match(/let body:\s*\{[\s\S]{0,600}\}/);
    expect(bodyTypeBlock).not.toBeNull();
    expect(bodyTypeBlock![0]).not.toContain('room_id?:');
  });

  it('INC-STRONG-18: éxito Core mock actualiza conv_cases.status=waiting_internal', () => {
    expect(srcWf20).toContain("status:   'waiting_internal'");
    expect(srcWf20).toContain("'conv_cases'");
  });

  it("INC-STRONG-19: guarda case_ref = incident_ref", () => {
    expect(srcWf20).toContain('case_ref: incidentRef');
  });

  it('INC-STRONG-20: devuelve confirmación con incident_ref', () => {
    expect(srcWf20).toContain("case_ref:      incidentRef");
    expect(srcWf20).toContain("response_type: 'success'");
    expect(srcWf20).toContain("next_state:    'waiting_internal'");
  });

  it("INC-STRONG-21: no usa 'resolved' tras crear incidencia", () => {
    // El estado final tras creación es waiting_internal, nunca resolved
    // La transición waiting_internal → resolved la hace el admin/staff manualmente
    const successBlock = srcWf20.match(/response_type: 'success'[\s\S]{0,300}/);
    expect(successBlock).not.toBeNull();
    expect(successBlock![0]).not.toContain("'resolved'");
  });

  it('INC-STRONG-22: no deja {incident_ref} sin sustituir', () => {
    // Los marcadores se sustituyen antes de devolver al usuario
    expect(srcWf20).not.toContain('{incident_ref}');
  });

});

// ---------------------------------------------------------------------------
// INC-PARTIAL — rama PARTIAL_MATCH_ACTIVE
// ---------------------------------------------------------------------------

describe('INC-PARTIAL: rama PARTIAL_MATCH_ACTIVE', () => {

  it('INC-PARTIAL-23: no llama a conv-core-create-incident en rama PARTIAL', () => {
    // PARTIAL tiene early return antes de la llamada a conv-core-create-incident
    const partialPos  = srcWf20.indexOf("identityLevel === LEVEL_PARTIAL");
    const coreCallPos = srcWf20.indexOf('functions/v1/conv-core-create-incident');
    expect(partialPos).toBeGreaterThan(0);
    expect(coreCallPos).toBeGreaterThan(0);
    // La rama PARTIAL hace return antes de que se llegue a conv-core-create-incident
    // Verificar que hay un return ok dentro del bloque PARTIAL antes del core call
    const partialBlock = srcWf20.slice(partialPos, coreCallPos);
    expect(partialBlock).toContain('return ok(');
  });

  it("INC-PARTIAL-24: crea pre-incidencia en conv_cases", () => {
    expect(srcWf20).toContain("'conv_cases'");
    expect(srcWf20).toContain("case_ref_type: 'incident'");
    // La pre-incidencia es un caso de tipo incident sin case_ref (nulo)
    const partialBlock = srcWf20.match(/identityLevel === LEVEL_PARTIAL[\s\S]{0,2000}return ok/);
    expect(partialBlock).not.toBeNull();
    expect(partialBlock![0]).toContain("'conv_cases'");
  });

  it("INC-PARTIAL-25: pre-incidencia nace con status='open'", () => {
    // El insert de la pre-incidencia usa status: 'open'
    const partialInsert = srcWf20.match(/LEVEL_PARTIAL[\s\S]{0,500}status:\s*'open'/);
    expect(partialInsert).not.toBeNull();
  });

  it("INC-PARTIAL-26: devuelve respuesta de verificación pendiente", () => {
    expect(srcWf20).toContain("response_type: 'pending_input'");
  });

  it("INC-PARTIAL-27: indica next_state='waiting_user'", () => {
    // El return de PARTIAL incluye next_state: 'waiting_user'
    const partialReturn = srcWf20.match(/LEVEL_PARTIAL[\s\S]{0,800}next_state:\s*'waiting_user'/);
    expect(partialReturn).not.toBeNull();
  });

  it('INC-PARTIAL-28: no crea incidencia oficial — rama PARTIAL hace return antes del core call', () => {
    // El bloque PARTIAL hace return antes de llegar a conv-core-create-incident
    // (ya verificado por INC-PARTIAL-23: el bloque entre PARTIAL y el core call contiene return ok)
    const partialPos  = srcWf20.indexOf("identityLevel === LEVEL_PARTIAL");
    const coreCallPos = srcWf20.indexOf('functions/v1/conv-core-create-incident');
    expect(partialPos).toBeGreaterThan(0);
    expect(coreCallPos).toBeGreaterThan(0);
    // PARTIAL aparece antes del core call en el flujo
    expect(partialPos).toBeLessThan(coreCallPos);
    // El bloque entre PARTIAL y el core call contiene un return ok (early return del PARTIAL)
    const partialBlock = srcWf20.slice(partialPos, coreCallPos);
    expect(partialBlock).toContain('return ok(');
  });

});

// ---------------------------------------------------------------------------
// INC-INACTIVE — rama MATCH_INACTIVE
// ---------------------------------------------------------------------------

describe('INC-INACTIVE: rama MATCH_INACTIVE', () => {

  it('INC-INACTIVE-29: no llama a conv-core-create-incident', () => {
    const inactivePos = srcWf20.indexOf("identityLevel === LEVEL_INACTIVE");
    const coreCallPos = srcWf20.indexOf('functions/v1/conv-core-create-incident');
    expect(inactivePos).toBeGreaterThan(0);
    expect(coreCallPos).toBeGreaterThan(0);
    // INACTIVE hace return antes de core-create-incident
    const inactiveBlock = srcWf20.slice(inactivePos, coreCallPos);
    expect(inactiveBlock).toContain('return ok(');
  });

  it("INC-INACTIVE-30: escala directamente — response_type='escalated'", () => {
    expect(srcWf20).toContain("response_type:     'escalated'");
    expect(srcWf20).toContain("escalation_reason: 'identity_failed'");
  });

  it('INC-INACTIVE-31: no expone datos contractuales al usuario', () => {
    // La respuesta escalated no contiene campos PII
    const escalatedBlock = srcWf20.match(/response_type:\s*'escalated'[\s\S]{0,200}\}/);
    expect(escalatedBlock).not.toBeNull();
    expect(escalatedBlock![0]).not.toContain('profile_id');
    expect(escalatedBlock![0]).not.toContain('room_label');
    expect(escalatedBlock![0]).not.toContain('full_name');
    expect(escalatedBlock![0]).not.toContain('phone');
  });

  it('INC-INACTIVE-32: crea notificación/caso escalado sin PII según patrón existente', () => {
    // El bloque INACTIVE crea conv_admin_notifications o llama a conv-escalate-case
    const inactiveBlock = srcWf20.match(/identityLevel === LEVEL_INACTIVE[\s\S]{0,1500}return ok/);
    expect(inactiveBlock).not.toBeNull();
    const block = inactiveBlock![0];
    const hasNotif    = block.includes('conv_admin_notifications');
    const hasEscalate = block.includes('conv-escalate-case');
    expect(hasNotif || hasEscalate).toBe(true);
  });

});

// ---------------------------------------------------------------------------
// INC-NOMATCH — rama NO_MATCH
// ---------------------------------------------------------------------------

describe('INC-NOMATCH: rama NO_MATCH', () => {

  it('INC-NOMATCH-33: no escala inmediatamente si identity_attempts < 3', () => {
    // Si quedan intentos, devuelve identity_required
    const noMatchBlock = srcWf20.match(/LEVEL_NO_MATCH[\s\S]{0,600}identity_required/);
    expect(noMatchBlock).not.toBeNull();
    expect(noMatchBlock![0]).toContain('identityAttempts < MAX_IDENTITY_ATTEMPTS');
  });

  it("INC-NOMATCH-34: devuelve identity_required si quedan intentos", () => {
    expect(srcWf20).toContain("response_type: 'identity_required'");
    expect(srcWf20).toContain("next_step:     'conv-identity-progressive'");
  });

  it('INC-NOMATCH-35: no llama a conv-core-create-incident en NO_MATCH', () => {
    const noMatchPos  = srcWf20.indexOf("identityLevel === LEVEL_NO_MATCH");
    const coreCallPos = srcWf20.indexOf('functions/v1/conv-core-create-incident');
    expect(noMatchPos).toBeGreaterThan(0);
    const noMatchBlock = srcWf20.slice(noMatchPos, coreCallPos);
    expect(noMatchBlock).toContain('return ok(');
  });

  it('INC-NOMATCH-36: si identity_attempts >= 3, escala', () => {
    expect(srcWf20).toContain('identityAttempts < MAX_IDENTITY_ATTEMPTS');
    // La escalada ocurre cuando no se cumple la condición de intentos restantes
    expect(srcWf20).toContain("escalation_reason: 'identity_failed'");
  });

  it('INC-NOMATCH-37: no inicia cuarto intento — MAX_IDENTITY_ATTEMPTS = 3', () => {
    expect(srcWf20).toContain('const MAX_IDENTITY_ATTEMPTS = 3');
    expect(srcWf20).toContain('identityAttempts < MAX_IDENTITY_ATTEMPTS');
  });

});

// ---------------------------------------------------------------------------
// INC-ERR — errores y resilencia via adapter (Opción A: EF delega a IncidentIntegrationPort)
// ---------------------------------------------------------------------------

describe('INC-ERR: errores y backoff del Core mock', () => {

  it('INC-ERR-38: EF delega resilencia al adapter — no implementa retry propio', () => {
    // Opción A: el EF llama una vez a createIncident; el adapter gestiona 4xx/5xx/timeout
    expect(srcCreateIncident).toContain('createIncident');
    expect(srcCreateIncident).not.toContain('nonRetryable');
    expect(srcCreateIncident).not.toContain('HTTP_CLIENT_ERROR_MIN');
  });

  it('INC-ERR-39: adapter !ok → EF retorna 503 (error controlado)', () => {
    // Cuando el adapter no puede crear la incidencia, el EF devuelve error controlado
    expect(srcCreateIncident).toContain('adapterResult.ok');
    expect(srcCreateIncident).toContain('ERROR_CODES.INTERNAL');
  });

  it('INC-ERR-40: EF sin loop de reintentos — resilencia delegada al adapter', () => {
    expect(srcCreateIncident).not.toContain('while (attempts <');
    expect(srcCreateIncident).not.toContain('MAX_CORE_ATTEMPTS');
  });

  it('INC-ERR-41: adapter discrimina 4xx/5xx internamente — circuit breaker', () => {
    // El adapter de incidencias tiene circuit breaker propio (checkCircuit)
    const adapterSrc = readFileSync(
      resolve(EF_DIR, '_shared/smart-conversations/adapters/incidents-addon-adapter.ts'),
      'utf-8'
    );
    expect(adapterSrc).toContain('checkCircuit');
    expect(adapterSrc).toContain('recordFailure');
  });

  it('INC-ERR-42: adapter maneja 5xx con circuit breaker (recordFailure)', () => {
    const adapterSrc = readFileSync(
      resolve(EF_DIR, '_shared/smart-conversations/adapters/incidents-addon-adapter.ts'),
      'utf-8'
    );
    expect(adapterSrc).toContain('recordFailure');
    expect(adapterSrc).toContain('resp.status >= 500');
  });

  it('INC-ERR-43: adapter maneja timeout con TimeoutError (no propaga al EF)', () => {
    const adapterSrc = readFileSync(
      resolve(EF_DIR, '_shared/smart-conversations/adapters/incidents-addon-adapter.ts'),
      'utf-8'
    );
    expect(adapterSrc).toContain('TimeoutError');
    expect(adapterSrc).toContain('AbortSignal.timeout');
  });

  it('INC-ERR-44: EF sin MAX_CORE_ATTEMPTS — límite de intentos en adapter', () => {
    expect(srcCreateIncident).not.toContain('MAX_CORE_ATTEMPTS');
    expect(srcCreateIncident).not.toContain('CORE_BACKOFF_SECONDS');
  });

  it('INC-ERR-45: EF no tiene while loop de reintentos — delega toda la resilencia', () => {
    expect(srcCreateIncident).not.toContain('while (attempts');
    expect(srcCreateIncident).not.toContain('exhausted');
  });

  it('INC-ERR-46: 5xx agotado — caso queda en waiting_internal', () => {
    // En conv-wf20-incidents, si Core falla, el caso se actualiza a waiting_internal
    expect(srcWf20).toContain("status: 'waiting_internal'");
    // Y hay una notificación admin
    expect(srcWf20).toContain("'incident_creation_failed'");
  });

  it('INC-ERR-47: 5xx agotado crea conv_admin_notifications', () => {
    expect(srcWf20).toContain('conv_admin_notifications');
    // La notificación tiene severity high para fallo de creación
    expect(srcWf20).toContain("severity:          'high'");
  });

  it('INC-ERR-48: error técnico no llega al usuario', () => {
    // La respuesta al usuario no contiene mensajes técnicos
    const errorResponse = srcWf20.match(/core_unavailable[\s\S]{0,400}text:/);
    // No hay stack trace ni mensaje de error en la respuesta al usuario
    expect(srcWf20).not.toMatch(/text:.*Error:/);
    expect(srcWf20).not.toMatch(/text:.*status\s*\d{3}/);
    // El mensaje al usuario es genérico
    expect(srcWf20).toContain('Tu solicitud ha sido registrada');
  });

});

// ---------------------------------------------------------------------------
// INC-ACT — Activity Log
// ---------------------------------------------------------------------------

describe('INC-ACT: Activity Log de incidencias', () => {

  it("INC-ACT-49: éxito oficial publica conv_incident_created", () => {
    expect(srcWf20).toContain("'conv_incident_created'");
    // La publicación ocurre tras éxito de conv-core-create-incident
    const successBlock = srcWf20.match(/incidentRef[\s\S]{0,800}conv_incident_created/);
    expect(successBlock).not.toBeNull();
  });

  it('INC-ACT-50: payload conv_incident_created no contiene session_id', () => {
    const actPayload = srcWf20.match(/conv_incident_created[\s\S]{0,600}data:\s*\{[^}]+\}/);
    expect(actPayload).not.toBeNull();
    expect(actPayload![0]).not.toContain('session_id');
  });

  it('INC-ACT-51: payload conv_incident_created no contiene profile_id', () => {
    const actPayload = srcWf20.match(/conv_incident_created[\s\S]{0,600}data:\s*\{[^}]+\}/);
    expect(actPayload![0]).not.toContain('profile_id');
  });

  it('INC-ACT-52: payload conv_incident_created no contiene message_text', () => {
    const actPayload = srcWf20.match(/conv_incident_created[\s\S]{0,600}data:\s*\{[^}]+\}/);
    expect(actPayload![0]).not.toContain('message_text');
  });

  it('INC-ACT-53: payload conv_incident_created no contiene description', () => {
    const actPayload = srcWf20.match(/conv_incident_created[\s\S]{0,600}data:\s*\{[^}]+\}/);
    expect(actPayload![0]).not.toContain('description');
  });

  it('INC-ACT-54: fallo de Activity Log no hace rollback — fire-and-log', () => {
    expect(srcWf20).toMatch(/conv_incident_created[\s\S]{0,600}\.catch\(/);
  });

  it('INC-ACT-55: conv_pre_incident_created se publica en rama PARTIAL', () => {
    // conv_pre_incident_created está definido oficialmente en enums
    expect(srcWf20).toContain("'conv_pre_incident_created'");
    const preActBlock = srcWf20.match(/LEVEL_PARTIAL[\s\S]{0,800}conv_pre_incident_created/);
    expect(preActBlock).not.toBeNull();
  });

});

// ---------------------------------------------------------------------------
// INC-PRIV — privacidad y logging
// ---------------------------------------------------------------------------

describe('INC-PRIV: privacidad y sanitización de logs', () => {

  it('INC-PRIV-56: logs no contienen message_text', () => {
    expect(srcWf20).not.toMatch(/log\.(info|warn|error)\([^\n]*message_text/);
  });

  it('INC-PRIV-57: logs no contienen description', () => {
    expect(srcWf20).not.toMatch(/log\.(info|warn|error)\([^\n]*description/);
    expect(srcCreateIncident).not.toMatch(/log\.(info|warn|error)\([^\n]*description/);
  });

  it('INC-PRIV-58: logs no contienen profile_id', () => {
    expect(srcWf20).not.toMatch(/log\.(info|warn|error)\([^\n]*profile_id/);
    expect(srcCreateIncident).not.toMatch(/log\.(info|warn|error)\([^\n]*profile_id/);
  });

  it('INC-PRIV-59: logs no contienen room_id', () => {
    expect(srcWf20).not.toMatch(/log\.(info|warn|error)\([^\n]*room_id/);
    expect(srcCreateIncident).not.toMatch(/log\.(info|warn|error)\([^\n]*room_id/);
  });

  it('INC-PRIV-60: logs no contienen identity_data', () => {
    expect(srcWf20).not.toMatch(/log\.(info|warn|error)\([^\n]*identity_data/);
    expect(srcCreateIncident).not.toMatch(/log\.(info|warn|error)\([^\n]*identity_data/);
  });

  it('INC-PRIV-61: no llama a Claude real', () => {
    for (const src of [srcWf20, srcCreateIncident, srcExtractor, srcIncidentClient]) {
      expect(src).not.toContain('anthropic');
      expect(src).not.toContain('messages.create');
    }
  });

  it('INC-PRIV-62: no llama a n8n real', () => {
    for (const src of [srcWf20, srcCreateIncident, srcExtractor, srcIncidentClient]) {
      expect(src).not.toContain('n8n.io');
      expect(src).not.toContain('/webhook/');
    }
  });

  it('INC-PRIV-63: no llama a Core real (solo mock)', () => {
    for (const src of [srcExtractor, srcIncidentClient]) {
      expect(src).not.toContain('fetch(');
    }
    // core-identity-client no llama a URLs de Core real
    expect(srcIncidentClient).not.toContain('smartroom-core');
    expect(srcIncidentClient).not.toContain('/api/v1/');
  });

  it('INC-PRIV-64: no llama a Wasender real', () => {
    for (const src of [srcWf20, srcCreateIncident, srcExtractor, srcIncidentClient]) {
      expect(src).not.toContain('wasender.io');
      expect(src).not.toContain('@s.whatsapp.net');
    }
  });

});

// ---------------------------------------------------------------------------
// INC-RES — restricciones globales
// ---------------------------------------------------------------------------

describe('INC-RES: restricciones globales', () => {

  it('INC-RES-65: no introduce WEAK_MATCH', () => {
    for (const src of [srcWf20, srcCreateIncident, srcExtractor, srcIncidentClient]) {
      expect(src).not.toContain('WEAK_MATCH');
    }
  });

  it("INC-RES-66: no introduce 'UNVERIFIED'", () => {
    for (const src of [srcWf20, srcCreateIncident, srcExtractor, srcIncidentClient]) {
      expect(src).not.toContain("'UNVERIFIED'");
    }
  });

  it('INC-RES-67: no introduce WF-02', () => {
    for (const src of [srcWf20, srcCreateIncident]) {
      expect(src).not.toContain('WF-02');
    }
  });

  it('INC-RES-68: no introduce next_retry_at', () => {
    for (const src of [srcWf20, srcCreateIncident]) {
      expect(src).not.toContain('next_retry_at');
    }
  });

  it('INC-RES-69: no introduce attempt_count', () => {
    for (const src of [srcWf20, srcCreateIncident]) {
      expect(src).not.toContain('attempt_count');
    }
  });

  it('INC-RES-70: no implementa WF-30', () => {
    for (const src of [srcWf20, srcCreateIncident]) {
      expect(src).not.toContain('WF-30');
      expect(src).not.toContain('conv-wf30');
      expect(src).not.toContain('conv_publicaciones');
    }
  });

  it('INC-RES-71: no implementa WF-40', () => {
    for (const src of [srcWf20, srcCreateIncident]) {
      expect(src).not.toContain('WF-40');
      expect(src).not.toContain('conv-wf40');
    }
  });

});

// ---------------------------------------------------------------------------
// INC-REG — regresión global
// ---------------------------------------------------------------------------

describe('INC-REG: regresión — suites previas', () => {
  const EF   = resolve(__dirname, '../../../../../supabase/functions');
  const RTIM = resolve(EF, '_shared/smart-conversations/runtime');

  it('INC-REG-72: tests de schema — migración mantiene conv_cases', () => {
    const migPath = resolve(__dirname, '../../../../../supabase/migrations/20260716000001_smart_conversations_core_schema.sql');
    const mig = readFileSync(migPath, 'utf-8');
    expect(mig).toContain('CREATE TABLE conv_cases');
    expect(mig).toContain("CHECK (case_ref_type IN ('incident', 'lead', 'help_ticket'))");
  });

  it('INC-REG-73: tests de types — enums mantienen conv_incidencias y conv_incident_created', () => {
    const enums = readFileSync(resolve(EF, '_shared/smart-conversations/enums.ts'), 'utf-8');
    expect(enums).toContain("'conv_incidencias'");
    expect(enums).toContain("'conv_incident_created'");
    expect(enums).toContain("'conv_pre_incident_created'");
  });

  it('INC-REG-74: tests de infra — ef-auth y ef-logger siguen disponibles', () => {
    const auth   = readFileSync(resolve(EF, '_shared/smart-conversations/ef-auth.ts'), 'utf-8');
    const logger = readFileSync(resolve(EF, '_shared/smart-conversations/ef-logger.ts'), 'utf-8');
    expect(auth).toContain('isServiceRoleRequest');
    expect(logger).toContain('createSafeLogger');
  });

  it('INC-REG-75: tests de ingest — conv-ingest mantiene duplicate_ignored y no_service', () => {
    const ingest = readFileSync(resolve(EF, 'conv-ingest/index.ts'), 'utf-8');
    expect(ingest).toContain("response_type: 'duplicate_ignored'");
    expect(ingest).toContain("response_type: 'no_service'");
  });

  it('INC-REG-76: tests de channels — conv-wa-webhook mantiene HMAC', () => {
    const waWebhook = readFileSync(resolve(EF, 'conv-wa-webhook/index.ts'), 'utf-8');
    expect(waWebhook).toContain('HMAC');
  });

  it('INC-REG-77: tests de outbound — conv-process-send-queue mantiene BACKOFF_SECONDS', () => {
    const queue = readFileSync(resolve(EF, 'conv-process-send-queue/index.ts'), 'utf-8');
    expect(queue).toContain('BACKOFF_SECONDS = [1, 5, 30]');
  });

  it('INC-REG-78: tests de routing — conv-routing-engine mantiene CONFIDENCE_THRESHOLD', () => {
    const routing = readFileSync(resolve(EF, 'conv-routing-engine/index.ts'), 'utf-8');
    expect(routing).toContain('CONFIDENCE_THRESHOLD = 0.85');
  });

  it('INC-REG-79: tests de identity — identity-level.ts mantiene canAdvanceIdentityLevel', () => {
    const idLevel = readFileSync(resolve(RTIM, 'identity-level.ts'), 'utf-8');
    expect(idLevel).toContain('canAdvanceIdentityLevel');
    expect(idLevel).not.toContain('WEAK_MATCH');
  });

  it('INC-REG-80: it.todo restantes siguen registrados en el harness', () => {
    // Los it.todo viven en las suites de flujos futuros
    const activityLog = readFileSync(
      resolve(__dirname, '../../../../../tests/regression/smart-conversations/suites/activity-log/activity-log.spec.ts'),
      'utf-8'
    );
    expect(activityLog).toMatch(/it\.todo\(|todo\(/);
  });

});
