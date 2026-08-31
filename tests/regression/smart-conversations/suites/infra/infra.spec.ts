/**
 * INFRA-* — Tests de infraestructura base de Edge Functions SmartConversations.
 *
 * Cobertura:
 *   INFRA-A* → ef-auth.ts (unit tests: extracción token, validación service_role)
 *   INFRA-L* → ef-logger.ts (unit tests: sanitización PII, logger estructurado)
 *   INFRA-S* → Estructura de EFs (lectura de fuente: patrones de código)
 *   INFRA-P* → conv-core-publish-activity (patrones: fire-and-log, PII guards)
 *   INFRA-E* → conv-escalate-case (patrones: validación, estados prohibidos)
 *   INFRA-C* → conv-close-case (patrones: cierre final, limpieza de sesión)
 *   INFRA-T* → conv-core-get-tenant-features (patrones: tres niveles de activación)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { extractBearerToken, isServiceRoleRequest, requireServiceRole, ServiceRoleError } from '../../../../../supabase/functions/_shared/smart-conversations/ef-auth';
import { sanitizeForLog, createSafeLogger } from '../../../../../supabase/functions/_shared/smart-conversations/ef-logger';

const HARNESS_DIR = resolve(__dirname, '../../../../../tests/regression/smart-conversations');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = resolve(__dirname, '../../../../../');
const EF_DIR = resolve(ROOT, 'supabase/functions');
const SHARED_SC = resolve(EF_DIR, '_shared/smart-conversations');

function readEf(name: string): string {
  return readFileSync(resolve(EF_DIR, name, 'index.ts'), 'utf-8');
}

function readShared(name: string): string {
  return readFileSync(resolve(SHARED_SC, name), 'utf-8');
}

let srcGetTenantFeatures: string;
let srcPublishActivity: string;
let srcEscalateCase: string;
let srcCloseCase: string;
let srcEfAuth: string;
let srcEfLogger: string;
let srcIndex: string;
let srcAssertActivityEvent: string;
let srcCoreMock: string;

beforeAll(() => {
  srcGetTenantFeatures = readEf('conv-core-get-tenant-features');
  srcPublishActivity = readEf('conv-core-publish-activity');
  srcEscalateCase = readEf('conv-escalate-case');
  srcCloseCase = readEf('conv-close-case');
  srcEfAuth = readShared('ef-auth.ts');
  srcEfLogger = readShared('ef-logger.ts');
  srcIndex = readShared('index.ts');
  srcAssertActivityEvent = readFileSync(resolve(HARNESS_DIR, 'helpers/assert-activity-event.ts'), 'utf-8');
  srcCoreMock = readFileSync(resolve(HARNESS_DIR, 'mocks/core.mock.ts'), 'utf-8');
});

// ---------------------------------------------------------------------------
// INFRA-A — ef-auth.ts (unit tests)
// ---------------------------------------------------------------------------

describe('INFRA-A: ef-auth.ts — autenticación service_role', () => {

  it('INFRA-A01: extractBearerToken devuelve null si no hay header Authorization', () => {
    const req = new Request('https://test', { method: 'POST' });
    expect(extractBearerToken(req)).toBeNull();
  });

  it('INFRA-A02: extractBearerToken devuelve null si el header no empieza con Bearer', () => {
    const req = new Request('https://test', {
      headers: { Authorization: 'Basic abc123' },
    });
    expect(extractBearerToken(req)).toBeNull();
  });

  it('INFRA-A03: extractBearerToken extrae el token correctamente', () => {
    const req = new Request('https://test', {
      headers: { Authorization: 'Bearer my-secret-key' },
    });
    expect(extractBearerToken(req)).toBe('my-secret-key');
  });

  it('INFRA-A04: isServiceRoleRequest devuelve false si token no coincide (async, Fase 11B3)', async () => {
    const req = new Request('https://test', {
      headers: { Authorization: 'Bearer wrong-key' },
    });
    expect(await isServiceRoleRequest(req, 'correct-key')).toBe(false);
  });

  it('INFRA-A05: isServiceRoleRequest devuelve true si token coincide exactamente (async, Fase 11B3)', async () => {
    const req = new Request('https://test', {
      headers: { Authorization: 'Bearer correct-key' },
    });
    expect(await isServiceRoleRequest(req, 'correct-key')).toBe(true);
  });

  it('INFRA-A06: isServiceRoleRequest devuelve false si bearer está vacío (async, Fase 11B3)', async () => {
    const req = new Request('https://test', {
      headers: { Authorization: 'Bearer ' },
    });
    expect(await isServiceRoleRequest(req, 'key')).toBe(false);
  });

  it('INFRA-A07: requireServiceRole lanza ServiceRoleError cuando token incorrecto (async, Fase 11B3)', async () => {
    const req = new Request('https://test', {
      headers: { Authorization: 'Bearer wrong' },
    });
    await expect(requireServiceRole(req, 'correct')).rejects.toThrow(ServiceRoleError);
  });

  it('INFRA-A08: requireServiceRole no lanza cuando token correcto', () => {
    const req = new Request('https://test', {
      headers: { Authorization: 'Bearer service-role-key' },
    });
    expect(() => requireServiceRole(req, 'service-role-key')).not.toThrow();
  });

  it('INFRA-A09: ServiceRoleError tiene status=401 y code=UNAUTHORIZED', () => {
    const error = new ServiceRoleError();
    expect(error.status).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error).toBeInstanceOf(Error);
  });

  it('INFRA-A10: ef-auth.ts NO contiene lógica de sesión de usuario (sin getUser ni getSession)', () => {
    expect(srcEfAuth).not.toContain('getUser');
    expect(srcEfAuth).not.toContain('getSession');
    expect(srcEfAuth).not.toContain('auth.signIn');
  });

  it('INFRA-A11: ef-auth.ts es case-insensitive para el header Authorization', () => {
    const req = new Request('https://test', {
      headers: { authorization: 'Bearer lowercase-header' },
    });
    expect(extractBearerToken(req)).toBe('lowercase-header');
  });

});

// ---------------------------------------------------------------------------
// INFRA-L — ef-logger.ts (unit tests)
// ---------------------------------------------------------------------------

describe('INFRA-L: ef-logger.ts — logging seguro sin PII', () => {

  it('INFRA-L01: sanitizeForLog redacta profile_id', () => {
    const result = sanitizeForLog({ profile_id: 'uuid-123', event: 'test' });
    expect(result['profile_id']).toBe('[REDACTED]');
    expect(result['event']).toBe('test');
  });

  it('INFRA-L02: sanitizeForLog redacta sender_ref', () => {
    const result = sanitizeForLog({ sender_ref: '+34612345678' });
    expect(result['sender_ref']).toBe('[REDACTED]');
  });

  it('INFRA-L03: sanitizeForLog redacta phone_number', () => {
    const result = sanitizeForLog({ phone_number: '+34612345678' });
    expect(result['phone_number']).toBe('[REDACTED]');
  });

  it('INFRA-L04: sanitizeForLog redacta full_name', () => {
    const result = sanitizeForLog({ full_name: 'Juan García' });
    expect(result['full_name']).toBe('[REDACTED]');
  });

  it('INFRA-L05: sanitizeForLog redacta assignment_id', () => {
    const result = sanitizeForLog({ assignment_id: 'uuid-456' });
    expect(result['assignment_id']).toBe('[REDACTED]');
  });

  it('INFRA-L06: sanitizeForLog redacta webhook_secret', () => {
    const result = sanitizeForLog({ webhook_secret: 'super-secret' });
    expect(result['webhook_secret']).toBe('[REDACTED]');
  });

  it('INFRA-L07: sanitizeForLog NO redacta campos seguros', () => {
    const result = sanitizeForLog({
      session_id: 'sess-123',
      conv_case_id: 'case-456',
      event_type: 'conv_case_escalated',
      channel: 'whatsapp',
    });
    expect(result['session_id']).toBe('sess-123');
    expect(result['conv_case_id']).toBe('case-456');
    expect(result['event_type']).toBe('conv_case_escalated');
    expect(result['channel']).toBe('whatsapp');
  });

  it('INFRA-L08: sanitizeForLog redacta campos PII en objetos anidados', () => {
    const result = sanitizeForLog({
      meta: { profile_id: 'uuid-789', safe_field: 'ok' },
    });
    const meta = result['meta'] as Record<string, unknown>;
    expect(meta['profile_id']).toBe('[REDACTED]');
    expect(meta['safe_field']).toBe('ok');
  });

  it('INFRA-L09: arrays sin PII conservan su estructura', () => {
    const result = sanitizeForLog({ ids: ['a', 'b', 'c'], counts: [1, 2, 3] });
    expect(result['ids']).toEqual(['a', 'b', 'c']);
    expect(result['counts']).toEqual([1, 2, 3]);
  });

  it('INFRA-L10: createSafeLogger devuelve objeto con debug/info/warn/error', () => {
    const logger = createSafeLogger('test-context');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('INFRA-L11: createSafeLogger.info no lanza con datos que incluyen PII', () => {
    const logger = createSafeLogger('test');
    expect(() => logger.info('msg', { sender_ref: '+34', session_id: 'sess' })).not.toThrow();
  });

  it('INFRA-L12: ef-logger.ts lista sender_ref como campo a redactar', () => {
    expect(srcEfLogger).toContain("'sender_ref'");
  });

  it('INFRA-L13: ef-logger.ts lista webhook_secret como campo a redactar', () => {
    expect(srcEfLogger).toContain("'webhook_secret'");
  });

  it('INFRA-L14: ef-logger.ts lista api_key_secret_name como campo a redactar', () => {
    expect(srcEfLogger).toContain("'api_key_secret_name'");
  });

  it('INFRA-L15: sanitizeForLog redacta PII dentro de array', () => {
    const result = sanitizeForLog({
      events: [{ phone_number: '+34612345678', channel: 'whatsapp' }],
    });
    const events = result['events'] as Array<Record<string, unknown>>;
    expect(events[0]['phone_number']).toBe('[REDACTED]');
    expect(events[0]['channel']).toBe('whatsapp');
  });

  it('INFRA-L16: sanitizeForLog redacta PII en objeto dentro de array', () => {
    const result = sanitizeForLog({
      items: [{ nested: { profile_id: 'prof-001', name: 'ok' } }],
    });
    const items = result['items'] as Array<Record<string, unknown>>;
    const nested = items[0]['nested'] as Record<string, unknown>;
    expect(nested['profile_id']).toBe('[REDACTED]');
    expect(nested['name']).toBe('ok');
  });

  it('INFRA-L17: sanitizeForLog recorre arrays anidados', () => {
    const result = sanitizeForLog({ matrix: [[{ phone_number: '+34' }]] });
    const matrix = result['matrix'] as unknown[];
    const inner  = matrix[0] as unknown[];
    const obj    = inner[0] as Record<string, unknown>;
    expect(obj['phone_number']).toBe('[REDACTED]');
  });

  it('INFRA-L18: sanitizeForLog no modifica el objeto original', () => {
    const original = { profile_id: 'uuid-123', safe: 'value' };
    sanitizeForLog(original);
    expect(original['profile_id']).toBe('uuid-123');
  });

  it('INFRA-L19: sanitizeForLog no modifica el array original', () => {
    const inner = { profile_id: 'uuid-xyz' };
    const arr   = [inner];
    sanitizeForLog({ items: arr });
    expect(inner['profile_id']).toBe('uuid-xyz');
  });

  it('INFRA-L20: valores primitivos en raíz se conservan', () => {
    const result = sanitizeForLog({ status: 'open', count: 42, flag: true });
    expect(result['status']).toBe('open');
    expect(result['count']).toBe(42);
    expect(result['flag']).toBe(true);
  });

  it('INFRA-L21: redacta message_text dentro de array', () => {
    const result = sanitizeForLog({
      messages: [{ message_text: 'Tengo una gotera', channel: 'whatsapp' }],
    });
    const messages = result['messages'] as Array<Record<string, unknown>>;
    expect(messages[0]['message_text']).toBe('[REDACTED]');
    expect(messages[0]['channel']).toBe('whatsapp');
  });

  it('INFRA-L22: el ejemplo del spec queda completamente sanitizado', () => {
    const input = {
      events: [{
        phone_number: '+34612345678',
        message_text: 'Tengo una gotera',
        nested: { profile_id: 'prof-001' },
      }],
    };
    const result = sanitizeForLog(input);
    const events = result['events'] as Array<Record<string, unknown>>;
    expect(events[0]['phone_number']).toBe('[REDACTED]');
    expect(events[0]['message_text']).toBe('[REDACTED]');
    const nested = events[0]['nested'] as Record<string, unknown>;
    expect(nested['profile_id']).toBe('[REDACTED]');
  });

  it('INFRA-L23: ef-logger.ts implementa traversal de arrays (Array.isArray)', () => {
    expect(srcEfLogger).toContain('Array.isArray');
  });

  it('INFRA-L24: ef-logger.ts lista los campos PII añadidos (message_text, identity_data, jwt)', () => {
    expect(srcEfLogger).toContain("'message_text'");
    expect(srcEfLogger).toContain("'identity_data'");
    expect(srcEfLogger).toContain("'jwt'");
  });

});

// ---------------------------------------------------------------------------
// INFRA-S — Estructura común de los 4 EFs (patrones de código)
// it.each con src* variables NO funciona aquí porque it.each evalúa el array
// antes de beforeAll. Usamos it() con arrays inline evaluados en runtime.
// ---------------------------------------------------------------------------

describe('INFRA-S: Estructura común de los 4 EFs', () => {

  it('INFRA-S01: todos importan serve de deno std', () => {
    for (const [name, src] of [
      ['conv-core-get-tenant-features', srcGetTenantFeatures],
      ['conv-core-publish-activity', srcPublishActivity],
      ['conv-escalate-case', srcEscalateCase],
      ['conv-close-case', srcCloseCase],
    ] as const) {
      expect(src, `${name}: falta import de deno std`).toContain(
        'from "https://deno.land/std@0.168.0/http/server.ts"'
      );
    }
  });

  it('INFRA-S02: todos importan desde _shared/response.ts', () => {
    for (const [name, src] of [
      ['conv-core-get-tenant-features', srcGetTenantFeatures],
      ['conv-core-publish-activity', srcPublishActivity],
      ['conv-escalate-case', srcEscalateCase],
      ['conv-close-case', srcCloseCase],
    ] as const) {
      expect(src, `${name}: falta import _shared/response.ts`).toContain(
        'from "../_shared/response.ts"'
      );
    }
  });

  it('INFRA-S03: todos validan service_role key con isServiceRoleRequest', () => {
    for (const [name, src] of [
      ['conv-core-get-tenant-features', srcGetTenantFeatures],
      ['conv-core-publish-activity', srcPublishActivity],
      ['conv-escalate-case', srcEscalateCase],
      ['conv-close-case', srcCloseCase],
    ] as const) {
      expect(src, `${name}: falta isServiceRoleRequest`).toContain('isServiceRoleRequest');
    }
  });

  it('INFRA-S04: todos usan createSafeLogger', () => {
    for (const [name, src] of [
      ['conv-core-get-tenant-features', srcGetTenantFeatures],
      ['conv-core-publish-activity', srcPublishActivity],
      ['conv-escalate-case', srcEscalateCase],
      ['conv-close-case', srcCloseCase],
    ] as const) {
      expect(src, `${name}: falta createSafeLogger`).toContain('createSafeLogger');
    }
  });

  it('INFRA-S05: todos manejan OPTIONS (CORS preflight)', () => {
    for (const [name, src] of [
      ['conv-core-get-tenant-features', srcGetTenantFeatures],
      ['conv-core-publish-activity', srcPublishActivity],
      ['conv-escalate-case', srcEscalateCase],
      ['conv-close-case', srcCloseCase],
    ] as const) {
      expect(src, `${name}: falta check OPTIONS`).toContain("req.method === 'OPTIONS'");
      expect(src, `${name}: falta optionsResponse()`).toContain('optionsResponse()');
    }
  });

  it('INFRA-S06: todos solo aceptan POST', () => {
    for (const [name, src] of [
      ['conv-core-get-tenant-features', srcGetTenantFeatures],
      ['conv-core-publish-activity', srcPublishActivity],
      ['conv-escalate-case', srcEscalateCase],
      ['conv-close-case', srcCloseCase],
    ] as const) {
      expect(src, `${name}: falta check POST`).toContain("req.method !== 'POST'");
    }
  });

  it('INFRA-S07: todos retornan 401 sin service_role', () => {
    for (const [name, src] of [
      ['conv-core-get-tenant-features', srcGetTenantFeatures],
      ['conv-core-publish-activity', srcPublishActivity],
      ['conv-escalate-case', srcEscalateCase],
      ['conv-close-case', srcCloseCase],
    ] as const) {
      expect(src, `${name}: falta mensaje 401`).toContain("'Se requiere service_role key'");
      expect(src, `${name}: falta status 401`).toContain('401');
    }
  });

  it('INFRA-S08: ninguno loguea PII directamente con console.log', () => {
    for (const [name, src] of [
      ['conv-core-get-tenant-features', srcGetTenantFeatures],
      ['conv-core-publish-activity', srcPublishActivity],
      ['conv-escalate-case', srcEscalateCase],
      ['conv-close-case', srcCloseCase],
    ] as const) {
      expect(src, `${name}: console.log con sender_ref`).not.toMatch(/console\.log[^)]*sender_ref/);
      expect(src, `${name}: console.log con profile_id`).not.toMatch(/console\.log[^)]*profile_id/);
      expect(src, `${name}: console.log con phone_number`).not.toMatch(/console\.log[^)]*phone_number/);
    }
  });

  it('INFRA-S09: todos importan ef-auth.ts', () => {
    for (const [name, src] of [
      ['conv-core-get-tenant-features', srcGetTenantFeatures],
      ['conv-core-publish-activity', srcPublishActivity],
      ['conv-escalate-case', srcEscalateCase],
      ['conv-close-case', srcCloseCase],
    ] as const) {
      expect(src, `${name}: falta import ef-auth.ts`).toContain(
        'from "../_shared/smart-conversations/ef-auth.ts"'
      );
    }
  });

  it('INFRA-S10: todos importan ef-logger.ts', () => {
    for (const [name, src] of [
      ['conv-core-get-tenant-features', srcGetTenantFeatures],
      ['conv-core-publish-activity', srcPublishActivity],
      ['conv-escalate-case', srcEscalateCase],
      ['conv-close-case', srcCloseCase],
    ] as const) {
      expect(src, `${name}: falta import ef-logger.ts`).toContain(
        'from "../_shared/smart-conversations/ef-logger.ts"'
      );
    }
  });

});

// ---------------------------------------------------------------------------
// INFRA-P — conv-core-publish-activity (patrones específicos)
// ---------------------------------------------------------------------------

describe('INFRA-P: conv-core-publish-activity — fire-and-log y PII guard', () => {

  it('INFRA-P01: implementa patrón fire-and-log (retorna ok siempre)', () => {
    expect(srcPublishActivity).toContain("published: false");
    expect(srcPublishActivity).toContain("published: true");
  });

  it('INFRA-P02: guarda contra PII en payload de datos', () => {
    expect(srcPublishActivity).toContain('pii_violation');
    expect(srcPublishActivity).toContain("'profile_id'");
    expect(srcPublishActivity).toContain("'sender_ref'");
  });

  it('INFRA-P03: valida que source === smartconversations', () => {
    expect(srcPublishActivity).toContain("'smartconversations'");
    expect(srcPublishActivity).toContain('invalid_source');
  });

  it('INFRA-P04: tiene lista de event_types permitidos', () => {
    expect(srcPublishActivity).toContain('conv_case_escalated');
    expect(srcPublishActivity).toContain('conv_case_closed');
    expect(srcPublishActivity).toContain('conv_incident_created');
    expect(srcPublishActivity).toContain('conv_lead_created');
  });

  it('INFRA-P05: los 13 event_types oficiales están presentes', () => {
    const officialEvents = [
      'conv_subscription_activated', 'conv_channel_connected', 'conv_channel_offboarded',
      'conv_conversation_started', 'conv_identity_validated', 'conv_pre_incident_created',
      'conv_incident_created', 'conv_lead_created', 'conv_case_escalated',
      'conv_case_summary_updated', 'conv_case_closed', 'conv_case_created',
      'conv_message_delivery_failed',
    ];
    for (const event of officialEvents) {
      expect(srcPublishActivity).toContain(event);
    }
  });

  it('INFRA-P06: NO usa conv_help_escalated (nombre incorrecto)', () => {
    expect(srcPublishActivity).not.toContain('conv_help_escalated');
  });

  it('INFRA-P07: no importa supabase-js (no necesita DB)', () => {
    expect(srcPublishActivity).not.toContain('@supabase/supabase-js');
  });

  it('INFRA-P08: retorna ok incluso cuando el body es JSON inválido', () => {
    expect(srcPublishActivity).toContain("reason: 'invalid_json'");
  });

  it('INFRA-P09: no filtra session_id de los payloads (session_id es UUID opaco, no PII)', () => {
    // session_id es un UUID opaco — está permitido en activity log, solo se excluye
    // de los payloads específicos de conv_incident_created y conv_lead_created
    expect(srcPublishActivity).not.toContain("'session_id'");
  });

});

// ---------------------------------------------------------------------------
// INFRA-E — conv-escalate-case (patrones específicos)
// ---------------------------------------------------------------------------

describe('INFRA-E: conv-escalate-case — validaciones de estado', () => {

  it('INFRA-E01: rechaza escalada si status === closed', () => {
    expect(srcEscalateCase).toContain("'closed'");
    expect(srcEscalateCase).toContain('no puede escalarse');
  });

  it('INFRA-E02: devuelve 200 idempotente si ya está escalado (no 409)', () => {
    expect(srcEscalateCase).toContain('idempotent: true');
    // No debe tratar already-escalated como error
    expect(srcEscalateCase).not.toContain("'El caso ya está escalado'");
  });

  it('INFRA-E03: actualiza conv_cases a status escalated', () => {
    expect(srcEscalateCase).toContain("status: 'escalated'");
    expect(srcEscalateCase).toContain("'conv_cases'");
  });

  it('INFRA-E04: actualiza conv_sessions a state ESCALATED', () => {
    expect(srcEscalateCase).toContain("state: 'ESCALATED'");
    expect(srcEscalateCase).toContain("'conv_sessions'");
  });

  it('INFRA-E05: publica conv_case_escalated (no conv_help_escalated)', () => {
    expect(srcEscalateCase).toContain("'conv_case_escalated'");
    expect(srcEscalateCase).not.toContain('conv_help_escalated');
  });

  it('INFRA-E06: activity payload NO contiene PII', () => {
    // activityData solo debe tener: conv_case_id, channel, service_code, reason
    const activityBlock = srcEscalateCase.match(/activityData\s*=\s*\{([^}]+)\}/s);
    expect(activityBlock).not.toBeNull();
    const block = activityBlock![1];
    expect(block).not.toContain('session_id');
    expect(block).not.toContain('profile_id');
    expect(block).not.toContain('sender_ref');
  });

  it('INFRA-E07: publica actividad via fetch (fire-and-log, no await bloqueante)', () => {
    expect(srcEscalateCase).toContain('fetch(');
    expect(srcEscalateCase).toContain('.catch(');
  });

  it('INFRA-E08: valida los 3 valores de reason de rules-75 §4.4', () => {
    // Valores oficiales del payload conv_case_escalated (rules-75 §4.4)
    const validReasons = ['identity_failed', 'no_kb_match', 'admin_requested'];
    for (const r of validReasons) {
      expect(srcEscalateCase).toContain(`'${r}'`);
    }
    // No debe contener los valores de EscalationReason de CanonicalResponse (son otra cosa)
    expect(srcEscalateCase).not.toContain("'user_request'");
    expect(srcEscalateCase).not.toContain("'identity_unresolved'");
    expect(srcEscalateCase).not.toContain("'ai_low_confidence'");
  });

  it('INFRA-E09: requiere session_id, conv_case_id, reason y client_account_id', () => {
    expect(srcEscalateCase).toContain("'session_id es obligatorio'");
    expect(srcEscalateCase).toContain("'conv_case_id es obligatorio'");
    expect(srcEscalateCase).toContain("'reason es obligatorio'");
    expect(srcEscalateCase).toContain("'client_account_id es obligatorio'");
  });

});

// ---------------------------------------------------------------------------
// INFRA-C — conv-close-case (patrones específicos)
// ---------------------------------------------------------------------------

describe('INFRA-C: conv-close-case — cierre final de caso', () => {

  it('INFRA-C01: rechaza cierre si ya está closed (estado final absoluto)', () => {
    expect(srcCloseCase).toContain("'closed'");
    expect(srcCloseCase).toContain('ya está cerrado');
    expect(srcCloseCase).toContain('409');
  });

  it('INFRA-C02: actualiza conv_cases al estado final solicitado (closed por defecto)', () => {
    expect(srcCloseCase).toContain("'conv_cases'");
    expect(srcCloseCase).toContain('finalStatus');   // usa variable para el estado final
    expect(srcCloseCase).toContain("'closed'");     // 'closed' sigue siendo el valor por defecto
    expect(srcCloseCase).toContain("'resolved'");   // 'resolved' también es estado válido
  });

  it('INFRA-C03: elimina el caso de open_cases_ids', () => {
    expect(srcCloseCase).toContain('open_cases_ids');
    expect(srcCloseCase).toContain('filter(');
  });

  it('INFRA-C04: limpia active_case_id si era este caso', () => {
    expect(srcCloseCase).toContain('active_case_id');
    expect(srcCloseCase).toContain('null');
  });

  it('INFRA-C05: publica conv_case_closed', () => {
    expect(srcCloseCase).toContain("'conv_case_closed'");
  });

  it('INFRA-C06: publica actividad via fetch (fire-and-log)', () => {
    expect(srcCloseCase).toContain('fetch(');
    expect(srcCloseCase).toContain('.catch(');
  });

  it('INFRA-C07: activity payload NO contiene session_id', () => {
    const activityBlock = srcCloseCase.match(/activityData[^=]*=\s*\{([^}]+)\}/s);
    expect(activityBlock).not.toBeNull();
    expect(activityBlock![1]).not.toContain('session_id:');
  });

  it('INFRA-C08: valida resolution_channel con los 3 valores permitidos', () => {
    expect(srcCloseCase).toContain("'whatsapp'");
    expect(srcCloseCase).toContain("'webchat'");
    expect(srcCloseCase).toContain("'admin_panel'");
  });

  it('INFRA-C09: incluye case_ref_id solo si está presente (opcional)', () => {
    expect(srcCloseCase).toContain('case_ref_id');
    expect(srcCloseCase).toContain('if (case_ref_id)');
  });

  it('INFRA-C10: requiere session_id, conv_case_id, resolution_channel y client_account_id', () => {
    expect(srcCloseCase).toContain("'session_id es obligatorio'");
    expect(srcCloseCase).toContain("'conv_case_id es obligatorio'");
    expect(srcCloseCase).toContain("'resolution_channel es obligatorio'");
    expect(srcCloseCase).toContain("'client_account_id es obligatorio'");
  });

  it('INFRA-C11: closed → closed devuelve éxito idempotente (not 409)', () => {
    expect(srcCloseCase).toContain('already_closed');
    expect(srcCloseCase).toContain('idempotent: true');
  });

  it('INFRA-C12: resolved → resolved devuelve éxito idempotente', () => {
    expect(srcCloseCase).toContain('already_resolved');
    expect(srcCloseCase).toContain('idempotent: true');
  });

  it('INFRA-C13: closed → cualquier otro estado devuelve 409', () => {
    expect(srcCloseCase).toContain('ya está cerrado');
    expect(srcCloseCase).toContain('409');
  });

  it('INFRA-C14: idempotencia no duplica conv_case_closed — early return antes del fetch', () => {
    const idempotentPos = srcCloseCase.indexOf('idempotent: true');
    const fetchPos      = srcCloseCase.indexOf('fetch(');
    expect(idempotentPos).toBeGreaterThan(-1);
    expect(idempotentPos).toBeLessThan(fetchPos);
  });

  it('INFRA-C15: idempotencia no altera open_cases_ids — early return antes del filter', () => {
    const idempotentPos = srcCloseCase.indexOf('idempotent: true');
    const filterPos     = srcCloseCase.indexOf('filter(');
    expect(idempotentPos).toBeLessThan(filterPos);
  });

  it('INFRA-C16: idempotencia no altera active_case_id — early return antes de actualizar sesión', () => {
    const idempotentPos   = srcCloseCase.indexOf('idempotent: true');
    const sessionUpdatePos = srcCloseCase.indexOf("'conv_sessions'");
    expect(idempotentPos).toBeLessThan(sessionUpdatePos);
  });

  it('INFRA-C17: el EF acepta target_status como campo opcional del body', () => {
    expect(srcCloseCase).toContain('target_status');
    expect(srcCloseCase).toContain('VALID_TARGET_STATUSES');
  });

  it('INFRA-C18: target_status default es closed si no se especifica', () => {
    expect(srcCloseCase).toContain("?? 'closed'");
  });

});

// ---------------------------------------------------------------------------
// INFRA-T — conv-core-get-tenant-features (patrones específicos)
// ---------------------------------------------------------------------------

describe('INFRA-T: conv-core-get-tenant-features — tres niveles de activación', () => {

  it('INFRA-T01: consulta conv_service_activations (Level 3)', () => {
    expect(srcGetTenantFeatures).toContain("'conv_service_activations'");
  });

  it('INFRA-T02: consulta conv_wa_sessions (Level 2 WhatsApp)', () => {
    expect(srcGetTenantFeatures).toContain("'conv_wa_sessions'");
    expect(srcGetTenantFeatures).toContain("'active'");
  });

  it('INFRA-T03: consulta conv_wc_configs (Level 2 WebChat)', () => {
    expect(srcGetTenantFeatures).toContain("'conv_wc_configs'");
    expect(srcGetTenantFeatures).toContain('is_active');
  });

  it('INFRA-T04: filtra canales por nivel 2 antes de incluir en services_active', () => {
    expect(srcGetTenantFeatures).toContain('waActive');
    expect(srcGetTenantFeatures).toContain('wcActive');
  });

  it('INFRA-T05: devuelve plan_limits con los 4 campos del contrato', () => {
    expect(srcGetTenantFeatures).toContain('max_cases_per_month');
    expect(srcGetTenantFeatures).toContain('ai_enabled');
    expect(srcGetTenantFeatures).toContain('webchat_enabled');
    expect(srcGetTenantFeatures).toContain('whatsapp_enabled');
  });

  it('INFRA-T06: NO consulta saas_service_subscriptions (reservado Fase 4)', () => {
    expect(srcGetTenantFeatures).not.toContain('saas_service_subscriptions');
  });

  it('INFRA-T07: requiere client_account_id', () => {
    expect(srcGetTenantFeatures).toContain("'client_account_id es obligatorio'");
  });

  it('INFRA-T08: usa admin client con service_role (no JWT de usuario)', () => {
    expect(srcGetTenantFeatures).toContain('createClient(');
    expect(srcGetTenantFeatures).toContain('autoRefreshToken: false');
  });

  it('INFRA-T09: agrupa servicios por service_code en el resultado', () => {
    expect(srcGetTenantFeatures).toContain('serviceMap');
    expect(srcGetTenantFeatures).toContain('services_active');
  });

});

// ---------------------------------------------------------------------------
// INFRA-X — coherencia del barrel index.ts
// ---------------------------------------------------------------------------

describe('INFRA-X: barrel index.ts incluye módulos de EF runtime', () => {

  it('INFRA-X01: index.ts re-exporta ef-auth', () => {
    expect(srcIndex).toContain("from './ef-auth.js'");
  });

  it('INFRA-X02: index.ts re-exporta ef-logger', () => {
    expect(srcIndex).toContain("from './ef-logger.js'");
  });

});

// ---------------------------------------------------------------------------
// INFRA-E (continuación) — conv-escalate-case: admin notifications
// ---------------------------------------------------------------------------

describe('INFRA-E: conv-escalate-case — admin notifications', () => {

  it('INFRA-E10: inserta en conv_admin_notifications al escalar', () => {
    expect(srcEscalateCase).toContain("'conv_admin_notifications'");
    expect(srcEscalateCase).toContain('.insert(');
  });

  it('INFRA-E11: la notificación no contiene PII', () => {
    // El context de la notificación solo tiene IDs opacos y enums
    // No debe mencionar phone_number, full_name, room_label, profile_id ni texto libre
    const insertBlock = srcEscalateCase.match(/conv_admin_notifications[\s\S]{0,600}\.insert\([\s\S]{0,400}\)/s);
    expect(insertBlock).not.toBeNull();
    const block = insertBlock![0];
    expect(block).not.toContain('phone_number');
    expect(block).not.toContain('full_name');
    expect(block).not.toContain('room_label');
    expect(block).not.toContain('profile_id');
    expect(block).not.toContain('sender_ref');
    expect(block).not.toContain('message_text');
  });

  it('INFRA-E12: la notificación usa event_type case_auto_escalated', () => {
    expect(srcEscalateCase).toContain("'case_auto_escalated'");
  });

  it('INFRA-E13: la notificación no se crea en el camino idempotente (ya escalado)', () => {
    // La rama idempotente retorna early antes de llegar a conv_admin_notifications
    const idempotentReturn = srcEscalateCase.indexOf('idempotent: true');
    const notificationInsert = srcEscalateCase.indexOf("'conv_admin_notifications'");
    expect(idempotentReturn).toBeLessThan(notificationInsert);
  });

  it('INFRA-E14: la notificación tiene severity high', () => {
    expect(srcEscalateCase).toContain("severity: 'high'");
  });

  it('INFRA-E15: el fallo de notificación no bloquea la operación (warn, no error)', () => {
    expect(srcEscalateCase).toContain('notificationError');
    expect(srcEscalateCase).toContain('log.warn');
    // No debe usar log.error ni retornar err() por el fallo de notificación
    const afterNotification = srcEscalateCase.slice(
      srcEscalateCase.indexOf('notificationError')
    );
    expect(afterNotification).not.toMatch(/log\.error[^}]*notificationError/);
  });

});

// ---------------------------------------------------------------------------
// INFRA-H — limpieza conv_help_escalated en helpers/mocks ejecutables
// ---------------------------------------------------------------------------

describe('INFRA-H: conv_help_escalated eliminado de helpers y mocks ejecutables', () => {

  it('INFRA-H01: ACTIVITY_LOG_EVENTS en assert-activity-event.ts contiene conv_case_escalated', () => {
    expect(srcAssertActivityEvent).toContain("'conv_case_escalated'");
    // conv_help_escalated puede aparecer como negación en assertEscalationEventName, NO en el catálogo
    expect(srcAssertActivityEvent).not.toMatch(/ACTIVITY_LOG_EVENTS[\s\S]{0,400}conv_help_escalated/);
  });

  it('INFRA-H02: assertEscalationEventName verifica conv_case_escalated', () => {
    expect(srcAssertActivityEvent).toContain('conv_case_escalated');
    expect(srcAssertActivityEvent).toMatch(/assertEscalationEventName[\s\S]{0,300}conv_case_escalated/);
  });

  it('INFRA-H03: core.mock.ts usa conv_case_escalated en mockCanonicalResponseEscalated', () => {
    expect(srcCoreMock).toContain("'conv_case_escalated'");
    expect(srcCoreMock).not.toContain("'conv_help_escalated'");
  });

  it('INFRA-H04: conv-core-publish-activity acepta conv_case_escalated', () => {
    expect(srcPublishActivity).toContain("'conv_case_escalated'");
  });

  it('INFRA-H05: conv-core-publish-activity rechaza conv_help_escalated (no está en ALLOWED_EVENT_TYPES)', () => {
    expect(srcPublishActivity).not.toContain("'conv_help_escalated'");
  });

  it('INFRA-H06: conv-escalate-case publica conv_case_escalated', () => {
    expect(srcEscalateCase).toContain("'conv_case_escalated'");
    expect(srcEscalateCase).not.toContain("'conv_help_escalated'");
  });

});
