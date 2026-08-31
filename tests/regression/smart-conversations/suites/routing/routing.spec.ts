/**
 * Suite: Routing — WF-10 Motor conversacional (Fase 6)
 * Análisis estático del código fuente de conv-routing-engine e intent-classifier.
 * IDs: ROUTING-AUTH, ROUTING-SVC, ROUTING-CLASS, ROUTING-CTX, ROUTING-PAY, ROUTING-RES, ROUTING-REG
 */

import { describe, it, beforeAll, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EF_DIR     = resolve(__dirname, '../../../../../supabase/functions');
const SHARED_DIR = resolve(EF_DIR, '_shared/smart-conversations/runtime');

let srcRoutingEngine:    string;
let srcIntentClassifier: string;

beforeAll(() => {
  srcRoutingEngine    = readFileSync(resolve(EF_DIR, 'conv-routing-engine/index.ts'), 'utf-8');
  srcIntentClassifier = readFileSync(resolve(SHARED_DIR, 'intent-classifier.ts'), 'utf-8');
});

// ---------------------------------------------------------------------------
// ROUTING-AUTH — auth y validación de input
// ---------------------------------------------------------------------------

describe('ROUTING-AUTH: conv-routing-engine — auth y validación', () => {

  it('ROUTING-AUTH-01: requiere service_role', () => {
    expect(srcRoutingEngine).toContain('isServiceRoleRequest');
    expect(srcRoutingEngine).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(srcRoutingEngine).toContain('ERROR_CODES.UNAUTHORIZED');
  });

  it('ROUTING-AUTH-02: rechaza session_token de widget — no usa getUser/getSession', () => {
    expect(srcRoutingEngine).not.toContain('getUser');
    expect(srcRoutingEngine).not.toContain('getSession');
  });

  it('ROUTING-AUTH-03: rechaza payload sin client_account_id', () => {
    expect(srcRoutingEngine).toContain('client_account_id es obligatorio');
  });

  it('ROUTING-AUTH-04: rechaza payload sin session_id', () => {
    expect(srcRoutingEngine).toContain('session_id es obligatorio');
  });

  it('ROUTING-AUTH-05: rechaza payload sin message_id', () => {
    expect(srcRoutingEngine).toContain('message_id es obligatorio');
  });

  it('ROUTING-AUTH-06: rechaza channel inválido', () => {
    expect(srcRoutingEngine).toContain('VALID_CHANNELS');
    expect(srcRoutingEngine).toContain('channel inválido');
  });

  it('ROUTING-AUTH-07: rechaza message_text vacío', () => {
    expect(srcRoutingEngine).toContain('message_text es obligatorio');
  });

});

// ---------------------------------------------------------------------------
// ROUTING-SVC — servicios activos
// ---------------------------------------------------------------------------

describe('ROUTING-SVC: conv-routing-engine — servicios activos', () => {

  it('ROUTING-SVC-08: lee TenantFeaturesResponse en cada ejecución', () => {
    expect(srcRoutingEngine).toContain('conv-core-get-tenant-features');
    expect(srcRoutingEngine).toContain('services_active');
  });

  it('ROUTING-SVC-09: no cachea servicios activos — fetch dentro del handler, no en módulo', () => {
    expect(srcRoutingEngine).not.toContain('cachedFeatures');
    expect(srcRoutingEngine).not.toContain('tenantFeaturesCache');
    expect(srcRoutingEngine).not.toContain('featuresCache');
    // let services_active se declara dentro del handler, no al nivel de módulo
    const servePos = srcRoutingEngine.indexOf('serve(');
    const featuresPos = srcRoutingEngine.indexOf('let services_active');
    expect(featuresPos).toBeGreaterThan(servePos);
  });

  it('ROUTING-SVC-10: services_active vacío devuelve no_service', () => {
    expect(srcRoutingEngine).toContain("'no_service'");
    expect(srcRoutingEngine).toContain('NO_SERVICE_TEXT');
    expect(srcRoutingEngine).toContain('Este canal no tiene servicios activos actualmente.');
  });

  it('ROUTING-SVC-11: exactamente 1 servicio activo enruta directo sin clasificar', () => {
    expect(srcRoutingEngine).toContain('services_active.length === 1');
    // effectiveConfidence = 1.0 cuando hay un único servicio
    expect(srcRoutingEngine).toContain('effectiveConfidence = 1.0');
  });

  it('ROUTING-SVC-12: menú dinámico contiene solo servicios activos', () => {
    // Las opciones del menú se construyen mapeando services_active
    expect(srcRoutingEngine).toMatch(/services_active\.map\(code\s*=>/);
    expect(srcRoutingEngine).toContain("response_type: 'menu'");
    expect(srcRoutingEngine).toContain('options: menuOptions');
  });

  it('ROUTING-SVC-13: servicio no activo nunca aparece en menú — menuOptions from services_active only', () => {
    // El menú se construye exclusivamente de services_active.map()
    const menuBlock = srcRoutingEngine.match(
      /menuOptions[\s\S]{0,100}=[\s\S]{0,100}services_active\.map[\s\S]{0,300}menuOptions\.push/
    );
    expect(menuBlock).not.toBeNull();
    // Solo se añade resume_case via push — nunca un servicio externo a services_active
    const pushBlock = srcRoutingEngine.match(/menuOptions\.push\([^)]+\)/);
    expect(pushBlock).not.toBeNull();
    expect(pushBlock![0]).toContain('resume_case');
    expect(pushBlock![0]).not.toContain('conv_incidencias');
    expect(pushBlock![0]).not.toContain('conv_publicaciones');
  });

});

// ---------------------------------------------------------------------------
// ROUTING-CLASS — clasificación de intención
// ---------------------------------------------------------------------------

describe('ROUTING-CLASS: conv-routing-engine — clasificación de intención', () => {

  it('ROUTING-CLASS-14: confidence >= 0.85 enruta directo', () => {
    expect(srcRoutingEngine).toContain('CONFIDENCE_THRESHOLD');
    expect(srcRoutingEngine).toContain('0.85');
    expect(srcRoutingEngine).toContain('effectiveConfidence < CONFIDENCE_THRESHOLD');
  });

  it('ROUTING-CLASS-15: confidence < 0.85 con más de 1 servicio devuelve menú', () => {
    // El bloque de menú aparece después del check de confianza baja
    expect(srcRoutingEngine).toContain("effectiveConfidence < CONFIDENCE_THRESHOLD");
    expect(srcRoutingEngine).toContain("response_type: 'menu'");
    const lowConfPos = srcRoutingEngine.indexOf('effectiveConfidence < CONFIDENCE_THRESHOLD');
    const menuPos = srcRoutingEngine.indexOf("response_type: 'menu'");
    expect(lowConfPos).toBeLessThan(menuPos);
  });

  it('ROUTING-CLASS-16: service_code no activo → confidence = 0', () => {
    expect(srcRoutingEngine).toContain('effectiveConfidence = 0.0');
    expect(srcRoutingEngine).toMatch(/services_active\.includes[\s\S]{0,100}effectiveConfidence = 0/);
  });

  it('ROUTING-CLASS-17: clasificador no llama a Claude real', () => {
    expect(srcIntentClassifier).not.toContain('anthropic');
    expect(srcIntentClassifier).not.toContain('messages.create');
    expect(srcIntentClassifier).not.toContain('claude.ai');
    expect(srcRoutingEngine).not.toContain('anthropic');
    expect(srcRoutingEngine).not.toContain('messages.create');
  });

  it('ROUTING-CLASS-18: message_text no se loguea', () => {
    expect(srcRoutingEngine).not.toMatch(/log\.(info|warn|error)[^;]*message_text/);
    expect(srcIntentClassifier).not.toMatch(/console\.(log|warn|error)[^;]*message_text/);
  });

});

// ---------------------------------------------------------------------------
// ROUTING-CTX — sesión y contexto
// ---------------------------------------------------------------------------

describe('ROUTING-CTX: conv-routing-engine — sesión y contexto', () => {

  it('ROUTING-CTX-19: carga conv_sessions por session_id', () => {
    expect(srcRoutingEngine).toContain("'conv_sessions'");
    expect(srcRoutingEngine).toContain('.select(');
    expect(srcRoutingEngine).toContain('.eq(\'id\', session_id)');
  });

  it('ROUTING-CTX-20: no degrada identity_level — select solo lo lee, update no lo modifica', () => {
    const updateBlock = srcRoutingEngine.match(
      /\.update\(\{[^}]+active_service_code[^}]+\}\)/
    );
    expect(updateBlock).not.toBeNull();
    expect(updateBlock![0]).not.toContain('identity_level');
  });

  it('ROUTING-CTX-21: no borra profile_id — update no lo modifica', () => {
    const updateBlock = srcRoutingEngine.match(
      /\.update\(\{[^}]+active_service_code[^}]+\}\)/
    );
    expect(updateBlock![0]).not.toContain('profile_id');
  });

  it('ROUTING-CTX-22: no borra identity_data — update no lo modifica', () => {
    const updateBlock = srcRoutingEngine.match(
      /\.update\(\{[^}]+active_service_code[^}]+\}\)/
    );
    expect(updateBlock![0]).not.toContain('identity_data');
  });

  it('ROUTING-CTX-23: sin active_case_id puede actualizar active_service_code al enrutar', () => {
    expect(srcRoutingEngine).toContain('active_service_code: targetServiceCode');
    expect(srcRoutingEngine).toContain('!session.active_case_id');
  });

  it('ROUTING-CTX-24: si hay active_case_id y servicio distinto devuelve context_switch_confirmation', () => {
    expect(srcRoutingEngine).toContain("'context_switch_confirmation'");
    expect(srcRoutingEngine).toContain('hasActiveCase');
    expect(srcRoutingEngine).toContain('current_service_code: currentService');
    expect(srcRoutingEngine).toContain('proposed_service_code: targetServiceCode');
    expect(srcRoutingEngine).toContain('requires_confirmation: true');
  });

  it('ROUTING-CTX-25: no cambia active_service_code sin confirmación — context_switch retorna antes del update', () => {
    const ctxSwitchPos = srcRoutingEngine.indexOf("'context_switch_confirmation'");
    const updateSvcPos = srcRoutingEngine.indexOf('active_service_code: targetServiceCode');
    expect(ctxSwitchPos).toBeGreaterThan(0);
    expect(updateSvcPos).toBeGreaterThan(0);
    expect(ctxSwitchPos).toBeLessThan(updateSvcPos);
  });

  it('ROUTING-CTX-26: no cierra casos — no llama a conv-close-case ni actualiza case status', () => {
    expect(srcRoutingEngine).not.toContain('conv-close-case');
    expect(srcRoutingEngine).not.toContain("status: 'closed'");
    expect(srcRoutingEngine).not.toContain("status: 'resolved'");
  });

  it('ROUTING-CTX-27: no modifica open_cases_ids — update no lo incluye', () => {
    const updateBlock = srcRoutingEngine.match(
      /\.update\(\{[^}]+active_service_code[^}]+\}\)/
    );
    expect(updateBlock![0]).not.toContain('open_cases_ids');
  });

  it('ROUTING-CTX-28: menú incluye opción resume_case si open_cases_ids no está vacío', () => {
    expect(srcRoutingEngine).toContain('resume_case');
    expect(srcRoutingEngine).toContain('Volver al caso pendiente');
    expect(srcRoutingEngine).toMatch(/open_cases_ids[\s\S]{0,200}resume_case/);
  });

});

// ---------------------------------------------------------------------------
// ROUTING-PAY — payload limpio
// ---------------------------------------------------------------------------

describe('ROUTING-PAY: conv-routing-engine — payload limpio', () => {

  it('ROUTING-PAY-29: payload incluye session_id, client_account_id, message_text, channel, identity_level, service_code', () => {
    const payloadFn = srcRoutingEngine.match(/function buildServicePayload[\s\S]{0,400}return\s*\{[^}]+\}/);
    expect(payloadFn).not.toBeNull();
    const block = payloadFn![0];
    expect(block).toContain('session_id');
    expect(block).toContain('client_account_id');
    expect(block).toContain('message_text');
    expect(block).toContain('channel');
    expect(block).toContain('identity_level');
    expect(block).toContain('service_code');
  });

  it('ROUTING-PAY-30: payload no incluye profile_id', () => {
    const payloadFn = srcRoutingEngine.match(/function buildServicePayload[\s\S]{0,400}return\s*\{[^}]+\}/);
    expect(payloadFn![0]).not.toContain('profile_id');
  });

  it('ROUTING-PAY-31: payload no incluye phone_number', () => {
    const payloadFn = srcRoutingEngine.match(/function buildServicePayload[\s\S]{0,400}return\s*\{[^}]+\}/);
    expect(payloadFn![0]).not.toContain('phone_number');
  });

  it('ROUTING-PAY-32: payload no incluye full_name', () => {
    const payloadFn = srcRoutingEngine.match(/function buildServicePayload[\s\S]{0,400}return\s*\{[^}]+\}/);
    expect(payloadFn![0]).not.toContain('full_name');
  });

  it('ROUTING-PAY-33: payload no incluye room_label', () => {
    const payloadFn = srcRoutingEngine.match(/function buildServicePayload[\s\S]{0,400}return\s*\{[^}]+\}/);
    expect(payloadFn![0]).not.toContain('room_label');
  });

  it('ROUTING-PAY-34: payload no incluye assignment_id', () => {
    const payloadFn = srcRoutingEngine.match(/function buildServicePayload[\s\S]{0,400}return\s*\{[^}]+\}/);
    expect(payloadFn![0]).not.toContain('assignment_id');
  });

  it('ROUTING-PAY-35: payload no incluye raw_payload', () => {
    const payloadFn = srcRoutingEngine.match(/function buildServicePayload[\s\S]{0,400}return\s*\{[^}]+\}/);
    expect(payloadFn![0]).not.toContain('raw_payload');
  });

  it('ROUTING-PAY-36: payload no incluye sender_ref', () => {
    const payloadFn = srcRoutingEngine.match(/function buildServicePayload[\s\S]{0,400}return\s*\{[^}]+\}/);
    expect(payloadFn![0]).not.toContain('sender_ref');
  });

});

// ---------------------------------------------------------------------------
// ROUTING-RES — restricciones de Fase 6
// ---------------------------------------------------------------------------

describe('ROUTING-RES: conv-routing-engine — restricciones', () => {

  it('ROUTING-RES-37: no llama a WF-20', () => {
    expect(srcRoutingEngine).not.toContain('WF-20');
    expect(srcRoutingEngine).not.toContain('conv-incidencias-handler');
  });

  it('ROUTING-RES-38: no llama a WF-30', () => {
    expect(srcRoutingEngine).not.toContain('WF-30');
    expect(srcRoutingEngine).not.toContain('conv-publicaciones-handler');
  });

  it('ROUTING-RES-39: no llama a WF-40', () => {
    expect(srcRoutingEngine).not.toContain('WF-40');
    expect(srcRoutingEngine).not.toContain('conv-ayuda-handler');
  });

  it('ROUTING-RES-40: no llama a WF-IDENTITY', () => {
    expect(srcRoutingEngine).not.toContain('WF-IDENTITY');
    expect(srcRoutingEngine).not.toContain('conv-core-validate-identity');
  });

  it('ROUTING-RES-41: no llama a n8n real', () => {
    expect(srcRoutingEngine).not.toContain('n8n.io');
    expect(srcRoutingEngine).not.toContain('/webhook/');
  });

  it('ROUTING-RES-42: no llama a Claude real', () => {
    expect(srcRoutingEngine).not.toContain('anthropic');
    expect(srcRoutingEngine).not.toContain('claude.ai');
    expect(srcRoutingEngine).not.toContain('messages.create');
  });

  it('ROUTING-RES-43: no llama a Core real', () => {
    expect(srcRoutingEngine).not.toContain('/api/v1/incidents');
    expect(srcRoutingEngine).not.toContain('/api/v1/leads');
    expect(srcRoutingEngine).not.toContain('smartroom-core');
  });

  it('ROUTING-RES-44: no llama a Wasender real', () => {
    expect(srcRoutingEngine).not.toContain('wasender.io');
    expect(srcRoutingEngine).not.toContain('@s.whatsapp.net');
    expect(srcRoutingEngine).not.toContain('@c.us');
  });

  it('ROUTING-RES-45: no introduce WF-02', () => {
    expect(srcRoutingEngine).not.toContain('WF-02');
    expect(srcIntentClassifier).not.toContain('WF-02');
  });

  it('ROUTING-RES-46: no introduce UNVERIFIED', () => {
    expect(srcRoutingEngine).not.toContain('UNVERIFIED');
    expect(srcIntentClassifier).not.toContain('UNVERIFIED');
  });

});

// ---------------------------------------------------------------------------
// ROUTING-REG — regresión global
// ---------------------------------------------------------------------------

describe('ROUTING-REG: regresión — invariantes globales', () => {

  it('ROUTING-REG-47: ningún EF en esta fase introduce WF-20/WF-30/WF-40', () => {
    expect(srcRoutingEngine).not.toContain('WF-20');
    expect(srcRoutingEngine).not.toContain('WF-30');
    expect(srcRoutingEngine).not.toContain('WF-40');
    expect(srcIntentClassifier).not.toContain('WF-20');
  });

  it('ROUTING-REG-48: ningún EF introduce WF-IDENTITY', () => {
    expect(srcRoutingEngine).not.toContain('WF-IDENTITY');
    expect(srcIntentClassifier).not.toContain('WF-IDENTITY');
  });

  it('ROUTING-REG-49: ningún EF introduce WF-02', () => {
    expect(srcRoutingEngine).not.toContain('WF-02');
    expect(srcIntentClassifier).not.toContain('WF-02');
  });

  it('ROUTING-REG-50: ningún EF introduce UNVERIFIED', () => {
    expect(srcRoutingEngine).not.toContain('UNVERIFIED');
    expect(srcIntentClassifier).not.toContain('UNVERIFIED');
  });

  it('ROUTING-REG-51: clasificador es mockeable — no llama a Claude real', () => {
    expect(srcIntentClassifier).not.toContain('anthropic');
    expect(srcIntentClassifier).not.toContain('messages.create');
    expect(srcIntentClassifier).not.toContain('fetch(');
  });

  it('ROUTING-REG-52: routing engine no llama a n8n real', () => {
    expect(srcRoutingEngine).not.toContain('n8n.io');
    expect(srcRoutingEngine).not.toContain('/webhook/');
  });

  it('ROUTING-REG-53: routing engine no llama a Wasender real', () => {
    expect(srcRoutingEngine).not.toContain('wasender.io');
    expect(srcIntentClassifier).not.toContain('wasender');
    expect(srcIntentClassifier).not.toContain('@s.whatsapp.net');
  });

});
