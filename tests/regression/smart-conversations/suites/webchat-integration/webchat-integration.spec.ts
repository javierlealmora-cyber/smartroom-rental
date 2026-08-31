/**
 * Fase 10E -- WebChat Integration Tests
 *
 * No conecta produccion. No usa secrets reales. No llama servicios externos reales.
 * Valida: feature flag, sender_ref opaco, origin validation, seguridad, privacidad,
 * limites de mensaje, boundaries arquitecturales, restricciones y regresion.
 *
 * WEBCHAT-CONFIG       (01-05)
 * WEBCHAT-SESSION      (06-18)
 * WEBCHAT-MESSAGE      (19-31)
 * WEBCHAT-DISPATCH     (32-39)
 * WEBCHAT-DELIVER      (40-46)
 * WEBCHAT-PRIVACY      (47-56)
 * WEBCHAT-BOUNDARIES   (57-65)
 * WEBCHAT-RESTRICTIONS (66-73)
 * WEBCHAT-REGRESSION   (74-91)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Imports del runtime
// ---------------------------------------------------------------------------

import {
  getWebchatIntegrationMode,
  readWebchatConfig,
  generateWebchatSenderRef,
  isOpaqueSenderRef,
  validateOrigin,
  getSessionExpiresAt,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/webchat-client';

import {
  WEBCHAT_FORBIDDEN_OUTPUT_FIELDS,
  sanitizeWebchatOutput,
  detectForbiddenInputField,
  detectForbiddenPublicInput,
} from '../../../../../supabase/functions/_shared/smart-conversations/runtime/webchat-security';

// ---------------------------------------------------------------------------
// Rutas de artefactos (analisis estatico)
// ---------------------------------------------------------------------------

const ROOT = resolve(__dirname, '../../../../../');

const WC_CLIENT_PATH    = resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/webchat-client.ts');
const WC_SECURITY_PATH  = resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/webchat-security.ts');
const WC_SESSION_PATH   = resolve(ROOT, 'supabase/functions/conv-web-session/index.ts');
const WC_MESSAGE_PATH   = resolve(ROOT, 'supabase/functions/conv-web-message/index.ts');
const WC_DELIVER_PATH   = resolve(ROOT, 'supabase/functions/conv-web-deliver/index.ts');
const ENV_DOC_PATH      = resolve(ROOT, 'docs/smart-conversations/webchat-integration/env.example.md');
const CONTRACT_DOC_PATH = resolve(ROOT, 'docs/smart-conversations/webchat-integration/widget-contract.md');
const SECURITY_DOC_PATH = resolve(ROOT, 'docs/smart-conversations/webchat-integration/security.md');

const SUITES_ROOT = resolve(ROOT, 'tests/regression/smart-conversations/suites');

function readFile(p: string): string { return readFileSync(p, 'utf-8'); }

// ---------------------------------------------------------------------------
// Setup global
// ---------------------------------------------------------------------------

const ENV: Record<string, string | undefined> = {};
const mockDeno = { env: { get: (k: string) => ENV[k] } };

beforeEach(() => {
  for (const k of Object.keys(ENV)) delete ENV[k];
  vi.stubGlobal('Deno', mockDeno);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// WEBCHAT-CONFIG (01-05)
// ---------------------------------------------------------------------------

describe('WEBCHAT-CONFIG', () => {
  it('WC-01: WEBCHAT_INTEGRATION_MODE default es mock cuando no hay env', () => {
    expect(getWebchatIntegrationMode()).toBe('mock');
  });

  it('WC-02: WEBCHAT_INTEGRATION_MODE=mock devuelve mock', () => {
    ENV['WEBCHAT_INTEGRATION_MODE'] = 'mock';
    expect(getWebchatIntegrationMode()).toBe('mock');
  });

  it('WC-03: WEBCHAT_INTEGRATION_MODE=real devuelve real', () => {
    ENV['WEBCHAT_INTEGRATION_MODE'] = 'real';
    expect(getWebchatIntegrationMode()).toBe('real');
  });

  it('WC-04: valor desconocido cae a mock (seguro por defecto)', () => {
    ENV['WEBCHAT_INTEGRATION_MODE'] = 'unknown_value';
    expect(getWebchatIntegrationMode()).toBe('mock');
  });

  it('WC-05: readWebchatConfig con defaults devuelve valores correctos', () => {
    const cfg = readWebchatConfig();
    expect(cfg.mode).toBe('mock');
    expect(cfg.sessionTtlMinutes).toBe(120);
    expect(cfg.rateLimitPerMinute).toBe(30);
    expect(cfg.maxMessageLength).toBe(2000);
    expect(cfg.allowedOrigins).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// WEBCHAT-SESSION (06-18)
// ---------------------------------------------------------------------------

describe('WEBCHAT-SESSION', () => {
  it('WC-06: conv-web-session existe', () => {
    expect(existsSync(WC_SESSION_PATH)).toBe(true);
  });

  it('WC-07: generateWebchatSenderRef crea referencia opaca', () => {
    const ref = generateWebchatSenderRef();
    expect(ref).toMatch(/^wc_[0-9a-f]{32}$/i);
  });

  it('WC-08: sender_ref empieza por wc_', () => {
    const ref = generateWebchatSenderRef();
    expect(ref.startsWith('wc_')).toBe(true);
  });

  it('WC-09: sender_ref no contiene telefono ni digitos solos', () => {
    // El formato wc_<32hex> no puede ser un numero de telefono
    const ref = generateWebchatSenderRef();
    expect(ref).toMatch(/^wc_/);
    expect(ref).not.toMatch(/^\+/);
    expect(ref).not.toMatch(/^[0-9]+$/);
  });

  it('WC-10: isOpaqueSenderRef acepta formato wc_<32hex>', () => {
    expect(isOpaqueSenderRef('wc_' + 'a'.repeat(32))).toBe(true);
    expect(isOpaqueSenderRef('wc_' + '0123456789abcdef'.repeat(2))).toBe(true);
  });

  it('WC-11: isOpaqueSenderRef rechaza formatos invalidos', () => {
    expect(isOpaqueSenderRef('')).toBe(false);
    expect(isOpaqueSenderRef('telefono_123456')).toBe(false);
    expect(isOpaqueSenderRef('+34666000000')).toBe(false);
    expect(isOpaqueSenderRef('wc_short')).toBe(false);
    expect(isOpaqueSenderRef('wc_' + 'g'.repeat(32))).toBe(false); // no hex
  });

  it('WC-12: validateOrigin permite origin presente en lista', () => {
    expect(validateOrigin('https://app.tenant.com', ['https://app.tenant.com'])).toBe(true);
  });

  it('WC-13: validateOrigin rechaza origin no presente en lista', () => {
    expect(validateOrigin('https://evil.com', ['https://app.tenant.com'])).toBe(false);
  });

  it('WC-14: validateOrigin permite cualquier origin si lista vacia', () => {
    expect(validateOrigin('https://cualquiera.com', [])).toBe(true);
  });

  it('WC-15: validateOrigin permite sin origin (server-side)', () => {
    expect(validateOrigin('', ['https://app.tenant.com'])).toBe(true);
  });

  it('WC-16: conv-web-session no devuelve profile_id en el ok() de respuesta', () => {
    const src = readFile(WC_SESSION_PATH);
    // profile_id puede aparecer en la destructuracion del body (incomingProfileId)
    // pero nunca en el objeto de respuesta ok({...})
    expect(src).not.toMatch(/ok\(\{[^}]*profile_id/);
    // No hay un campo profile_id como clave en la respuesta
    expect(src).not.toMatch(/['"]profile_id['"]\s*:/);
  });

  it('WC-17: conv-web-session no devuelve phone', () => {
    const src = readFile(WC_SESSION_PATH);
    expect(src).not.toMatch(/['"]phone['"]\s*:/);
  });

  it('WC-18: conv-web-session no devuelve identity_data al widget', () => {
    const src = readFile(WC_SESSION_PATH);
    // identity_data puede insertarse en BD pero no debe devolverse en ok()
    expect(src).not.toMatch(/ok\(\{[^}]*identity_data/);
  });
});

// ---------------------------------------------------------------------------
// WEBCHAT-MESSAGE (19-31)
// ---------------------------------------------------------------------------

describe('WEBCHAT-MESSAGE', () => {
  it('WC-19: conv-web-message existe', () => {
    expect(existsSync(WC_MESSAGE_PATH)).toBe(true);
  });

  it('WC-20: conv-web-message requiere session_id', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).toContain('session_id');
    expect(src).toMatch(/session_id.*obligatorio|session_id es obligatorio/);
  });

  it('WC-21: conv-web-message requiere sender_ref opaco valido', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).toContain('isOpaqueSenderRef');
    expect(src).toMatch(/sender_ref inv[aá]lido/);
  });

  it('WC-22: conv-web-message requiere message_text', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).toContain('message_text es obligatorio');
  });

  it('WC-23: conv-web-message rechaza message_text vacio', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).toMatch(/message_text.*trim.*===\s*''/);
  });

  it('WC-24: conv-web-message rechaza message_text demasiado largo', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).toContain('maxMessageLength');
    expect(src).toMatch(/longitud m[aá]xima/);
  });

  it('WC-25: conv-web-message rechaza sender_ref que no pertenece a sesion', () => {
    const src = readFile(WC_MESSAGE_PATH);
    // En 11B2C: assertSessionOwnership (ef-tenant-guards) maneja SENDER_MISMATCH
    // y devuelve 403 Acceso a sesión denegado — el check ahora es sobre el guard
    expect(src).toMatch(/assertSessionOwnership|SENDER_MISMATCH|Acceso a sesi[oó]n denegado/);
  });

  it('WC-26: conv-web-message rechaza session_id de otro tenant', () => {
    const src = readFile(WC_MESSAGE_PATH);
    // Valida client_account_id + session_id juntos
    expect(src).toMatch(/\.eq\('client_account_id', client_account_id\)/);
    expect(src).toMatch(/NOT_FOUND.*Sesi[o��]n no encontrada|Sesi[oó]n no encontrada/);
  });

  it('WC-27: conv-web-message llama a conv-ingest', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).toContain('conv-ingest');
    expect(src).toContain('normalized_message');
  });

  it('WC-28: conv-web-message no llama Wasender', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).not.toMatch(/import.*wasender/i);
    expect(src).not.toMatch(/sendWasenderMessage/);
    expect(src).not.toMatch(/fetch.*wasender/i);
  });

  it('WC-29: conv-web-message no llama Core real directamente', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).not.toMatch(/conv-core-validate-identity/);
    expect(src).not.toMatch(/conv-core-get-tenant/);
  });

  it('WC-30: conv-web-message no llama IA real', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).not.toMatch(/import.*ai-client/i);
    expect(src).not.toMatch(/aiCall\(/);
    expect(src).not.toMatch(/callAiProvider/);
  });

  it('WC-31: conv-web-message no llama n8n real', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).not.toMatch(/fetch.*n8n/i);
    expect(src).not.toMatch(/import.*n8n/i);
  });
});

// ---------------------------------------------------------------------------
// WEBCHAT-DISPATCH (32-39)
// ---------------------------------------------------------------------------

describe('WEBCHAT-DISPATCH', () => {
  it('WC-32: webchat-client no decide routing por si mismo', () => {
    const src = readFile(WC_CLIENT_PATH);
    expect(src).not.toMatch(/import.*routing/i);
    expect(src).not.toMatch(/routeMessage/);
  });

  it('WC-33: conv-web-message llama conv-ingest Y conv-dispatch-message explicitamente (Opcion A)', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).toContain('conv-ingest');
    // Opcion A: dispatch sincrono controlado -- conv-web-message llama ambos explicitamente
    expect(src).toContain('conv-dispatch-message');
    // conv-ingest NO es equivalente a conv-dispatch-message
    expect(src).toContain('conv-dispatch-message es el único orquestador');
  });

  it('WC-34: servicios disponibles incluyen conv_ayuda', () => {
    const src = readFile(WC_SESSION_PATH);
    expect(src).toContain('conv_ayuda');
  });

  it('WC-35: servicios disponibles incluyen conv_publicaciones', () => {
    const src = readFile(WC_SESSION_PATH);
    expect(src).toContain('conv_publicaciones');
  });

  it('WC-36: servicios disponibles incluyen conv_incidencias', () => {
    const src = readFile(WC_SESSION_PATH);
    expect(src).toContain('conv_incidencias');
  });

  it('WC-37: conv-web-deliver es el outbound de WebChat -- no conv-send-wa', () => {
    const deliverSrc = readFile(WC_DELIVER_PATH);
    expect(deliverSrc).toContain("channel: 'webchat'");
    // No llama fetch a Wasender ni importa wasender-client
    expect(deliverSrc).not.toMatch(/fetch\s*\(.*wasender/i);
    expect(deliverSrc).not.toMatch(/import.*wasender/i);
    expect(deliverSrc).not.toMatch(/sendWasenderMessage/);
  });

  it('WC-38: WebChat no construye @c.us en codigo (no JSDoc)', () => {
    const srcs = [WC_CLIENT_PATH, WC_SECURITY_PATH, WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH]
      .map(readFile).join('\n');
    // Patron de construccion de JID: string + '@c.us'
    expect(srcs).not.toMatch(/['"`]@c\.us['"`]/);
    expect(srcs).not.toMatch(/\+\s*['"]@c\.us/);
    expect(srcs).not.toMatch(/@c\.us['"`]/);
  });

  it('WC-39: WebChat no construye @s.whatsapp.net en codigo (no JSDoc)', () => {
    const srcs = [WC_CLIENT_PATH, WC_SECURITY_PATH, WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH]
      .map(readFile).join('\n');
    // Patron de construccion de JID
    expect(srcs).not.toMatch(/['"`]@s\.whatsapp\.net['"`]/);
    expect(srcs).not.toMatch(/\+\s*['"]@s\.whatsapp\.net/);
    expect(srcs).not.toMatch(/@s\.whatsapp\.net['"`]/);
  });
});

// ---------------------------------------------------------------------------
// WEBCHAT-DELIVER (40-46)
// ---------------------------------------------------------------------------

describe('WEBCHAT-DELIVER', () => {
  it('WC-40: conv-web-deliver existe', () => {
    expect(existsSync(WC_DELIVER_PATH)).toBe(true);
  });

  it('WC-41: conv-web-deliver no expone sender_ref en respuesta ok()', () => {
    const src = readFile(WC_DELIVER_PATH);
    expect(src).not.toMatch(/ok\(\{[^}]*sender_ref/);
  });

  it('WC-42: conv-web-deliver no expone profile_id', () => {
    const src = readFile(WC_DELIVER_PATH);
    expect(src).not.toMatch(/ok\(\{[^}]*profile_id/);
  });

  it('WC-43: conv-web-deliver no expone identity_data', () => {
    const src = readFile(WC_DELIVER_PATH);
    expect(src).not.toMatch(/ok\(\{[^}]*identity_data/);
  });

  it('WC-44: conv-web-deliver no expone raw_payload en codigo activo', () => {
    const src = readFile(WC_DELIVER_PATH);
    // No debe haber asignaciones ni accesos a raw_payload en el codigo
    expect(src).not.toMatch(/raw_payload\s*:/);
    expect(src).not.toMatch(/raw_payload\s*=/);
    expect(src).not.toMatch(/\.raw_payload/);
  });

  it('WC-45: conv-web-deliver no usa Wasender en codigo activo', () => {
    const src = readFile(WC_DELIVER_PATH);
    expect(src).not.toMatch(/fetch\s*\(.*wasender/i);
    expect(src).not.toMatch(/import.*wasender/i);
    expect(src).not.toMatch(/sendWasenderMessage/);
  });

  it('WC-46: conv-web-deliver solo acepta canal webchat', () => {
    const src = readFile(WC_DELIVER_PATH);
    expect(src).toContain("channel !== 'webchat'");
  });
});

// ---------------------------------------------------------------------------
// WEBCHAT-PRIVACY (47-56)
// ---------------------------------------------------------------------------

describe('WEBCHAT-PRIVACY', () => {
  it('WC-47: logs de conv-web-session no contienen message_text', () => {
    const src = readFile(WC_SESSION_PATH);
    expect(src).not.toMatch(/log\.(info|warn|error)\([^)]*message_text/);
  });

  it('WC-48: logs de conv-web-message no contienen message_text', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).not.toMatch(/log\.(info|warn|error)\([^)]*message_text/);
  });

  it('WC-49: logs no contienen sender_ref en sus parametros de log', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).not.toMatch(/log\.(info|warn|error)\([^)]*sender_ref/);
  });

  it('WC-50: logs no contienen phone en sus parametros de log', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/log\.(info|warn|error)\([^)]*['"']phone['"']/);
  });

  it('WC-51: logs no contienen profile_id en sus parametros de log', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/log\.(info|warn|error)\([^)]*profile_id/);
  });

  it('WC-52: logs no contienen identity_data en sus parametros de log', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/log\.(info|warn|error)\([^)]*identity_data/);
  });

  it('WC-53: outbound no devuelve sender_ref en respuesta al widget', () => {
    const src = readFile(WC_DELIVER_PATH);
    expect(src).not.toMatch(/ok\(\{[^}]*sender_ref/);
  });

  it('WC-54: outbound no devuelve profile_id en respuesta', () => {
    const src = readFile(WC_DELIVER_PATH);
    expect(src).not.toMatch(/ok\(\{[^}]*profile_id/);
  });

  it('WC-55: sanitizeWebchatOutput elimina campos prohibidos', () => {
    const dirty = {
      message_id: 'abc',
      status: 'sent',
      service_role: 'secret',
      profile_id: 'pid',
      phone: '+34666000000',
      identity_data: { level: 'MATCH' },
    };
    const clean = sanitizeWebchatOutput(dirty);
    expect(clean).toHaveProperty('message_id');
    expect(clean).toHaveProperty('status');
    expect(clean).not.toHaveProperty('service_role');
    expect(clean).not.toHaveProperty('profile_id');
    expect(clean).not.toHaveProperty('phone');
    expect(clean).not.toHaveProperty('identity_data');
  });

  it('WC-56: WEBCHAT_FORBIDDEN_OUTPUT_FIELDS incluye todos los campos criticos', () => {
    const critical = ['service_role', 'profile_id', 'phone', 'identity_data', 'raw_payload', 'authorization'];
    for (const field of critical) {
      expect(WEBCHAT_FORBIDDEN_OUTPUT_FIELDS.has(field)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// WEBCHAT-BOUNDARIES (57-65)
// ---------------------------------------------------------------------------

describe('WEBCHAT-BOUNDARIES', () => {
  it('WC-57: webchat-client no importa routing-engine', () => {
    const src = readFile(WC_CLIENT_PATH);
    expect(src).not.toMatch(/import.*routing/i);
    expect(src).not.toMatch(/routing-engine/);
  });

  it('WC-58: webchat-client no valida identidad real', () => {
    const src = readFile(WC_CLIENT_PATH);
    expect(src).not.toMatch(/conv-core-validate-identity/);
    expect(src).not.toMatch(/validateIdentity/);
  });

  it('WC-59: WebChat no crea casos directamente', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_CLIENT_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/\.from\('conv_cases'\).*\.insert/);
  });

  it('WC-60: WebChat no publica Activity Log directamente', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_CLIENT_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/conv-core-publish-activity/);
  });

  it('WC-61: WebChat no llama Core real', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_CLIENT_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/conv-core-get-tenant-features/);
  });

  it('WC-62: WebChat no llama IA real', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_CLIENT_PATH, WC_DELIVER_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/import.*ai-client/i);
    expect(srcs).not.toMatch(/aiCall\(/);
  });

  it('WC-63: WebChat no llama n8n real', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_CLIENT_PATH, WC_DELIVER_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/fetch.*n8n/i);
    expect(srcs).not.toMatch(/import.*n8n/i);
  });

  it('WC-64: WebChat no llama Wasender', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_CLIENT_PATH, WC_DELIVER_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/import.*wasender/i);
    expect(srcs).not.toMatch(/sendWasenderMessage/);
  });

  it('WC-65: WebChat no accede a conv_wa_sessions en codigo activo', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_CLIENT_PATH, WC_DELIVER_PATH].map(readFile).join('\n');
    // No debe haber queries .from('conv_wa_sessions')
    expect(srcs).not.toMatch(/\.from\s*\(\s*['"]conv_wa_sessions['"]/);
  });
});

// ---------------------------------------------------------------------------
// WEBCHAT-RESTRICTIONS (66-73)
// ---------------------------------------------------------------------------

describe('WEBCHAT-RESTRICTIONS', () => {
  it('WC-66: WF-02 no aparece como valor de codigo activo en ficheros WebChat', () => {
    const srcs = [WC_CLIENT_PATH, WC_SECURITY_PATH, WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH]
      .map(readFile).join('\n');
    expect(srcs).not.toMatch(/WF-02\s*[=:]/);
    expect(srcs).not.toMatch(/['"]WF-02['"]/);
  });

  it('WC-67: conv_help_escalated no aparece en codigo activo', () => {
    const srcs = [WC_CLIENT_PATH, WC_SECURITY_PATH, WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH]
      .map(readFile).join('\n');
    expect(srcs).not.toMatch(/conv_help_escalated\s*[=:]/);
    expect(srcs).not.toMatch(/['"]conv_help_escalated['"]/);
  });

  it('WC-68: No aparece WEAK_MATCH como estado', () => {
    const srcs = [WC_CLIENT_PATH, WC_SECURITY_PATH, WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH]
      .map(readFile).join('\n');
    expect(srcs).not.toMatch(/WEAK_MATCH\s*[=:]/);
    expect(srcs).not.toMatch(/['"]WEAK_MATCH['"]/);
  });

  it('WC-69: No aparece UNVERIFIED standalone', () => {
    const srcs = [WC_CLIENT_PATH, WC_SECURITY_PATH, WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH]
      .map(readFile).join('\n');
    expect(srcs).not.toMatch(/['"]UNVERIFIED['"]/);
  });

  it('WC-70: No aparece next_retry_at en ficheros WebChat', () => {
    const srcs = [WC_CLIENT_PATH, WC_SECURITY_PATH, WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH]
      .map(readFile).join('\n');
    expect(srcs).not.toMatch(/next_retry_at\s*:/);
    expect(srcs).not.toMatch(/next_retry_at\s*=/);
  });

  it('WC-71: No aparece attempt_count en ficheros WebChat', () => {
    const srcs = [WC_CLIENT_PATH, WC_SECURITY_PATH, WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH]
      .map(readFile).join('\n');
    expect(srcs).not.toMatch(/attempt_count\s*:/);
    expect(srcs).not.toMatch(/attempt_count\s*=/);
  });

  it('WC-72: detectForbiddenInputField detecta service_role en body', () => {
    const result = detectForbiddenInputField({ service_role: 'secret', message_text: 'hola' });
    expect(result).toBe('service_role');
  });

  it('WC-73: detectForbiddenInputField devuelve null para body limpio', () => {
    const result = detectForbiddenInputField({ client_account_id: 'uuid', message_text: 'hola' });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// WEBCHAT-REGRESSION (74-91)
// ---------------------------------------------------------------------------

describe('WEBCHAT-REGRESSION', () => {
  const suitesDir = SUITES_ROOT;

  it('WC-74: suite schema existe', () => {
    expect(existsSync(resolve(suitesDir, 'schema'))).toBe(true);
  });

  it('WC-75: suite types existe', () => {
    expect(existsSync(resolve(suitesDir, 'types'))).toBe(true);
  });

  it('WC-76: suite infra existe', () => {
    expect(existsSync(resolve(suitesDir, 'infra'))).toBe(true);
  });

  it('WC-77: suite ingest existe', () => {
    expect(existsSync(resolve(suitesDir, 'ingest'))).toBe(true);
  });

  it('WC-78: suite channels existe', () => {
    expect(existsSync(resolve(suitesDir, 'channels'))).toBe(true);
  });

  it('WC-79: suite outbound existe', () => {
    expect(existsSync(resolve(suitesDir, 'outbound'))).toBe(true);
  });

  it('WC-80: suite routing existe', () => {
    expect(existsSync(resolve(suitesDir, 'routing'))).toBe(true);
  });

  it('WC-81: suite identity existe', () => {
    expect(existsSync(resolve(suitesDir, 'identity'))).toBe(true);
  });

  it('WC-82: suite incidents existe', () => {
    expect(existsSync(resolve(suitesDir, 'incidents'))).toBe(true);
  });

  it('WC-83: suite listings-flow existe', () => {
    expect(existsSync(resolve(suitesDir, 'listings-flow'))).toBe(true);
  });

  it('WC-84: suite help-flow existe', () => {
    expect(existsSync(resolve(suitesDir, 'help-flow'))).toBe(true);
  });

  it('WC-85: suite dispatch existe', () => {
    expect(existsSync(resolve(suitesDir, 'dispatch'))).toBe(true);
  });

  it('WC-86: suite e2e existe', () => {
    expect(existsSync(resolve(suitesDir, 'e2e'))).toBe(true);
  });

  it('WC-87: suite n8n existe', () => {
    expect(existsSync(resolve(suitesDir, 'n8n'))).toBe(true);
  });

  it('WC-88: suite core-integration existe', () => {
    expect(existsSync(resolve(suitesDir, 'core-integration'))).toBe(true);
  });

  it('WC-89: suite ai-integration existe', () => {
    expect(existsSync(resolve(suitesDir, 'ai-integration'))).toBe(true);
  });

  it('WC-90: suite wasender-integration existe', () => {
    expect(existsSync(resolve(suitesDir, 'wasender-integration'))).toBe(true);
  });

  it('WC-91: suite webchat-integration existe (esta misma)', () => {
    expect(existsSync(resolve(suitesDir, 'webchat-integration'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// WEBCHAT-AUTH-INPUT (AI-01..AI-10)
// Seguridad: el widget publico no puede enviar campos de identidad sin JWT real.
// ---------------------------------------------------------------------------

describe('WEBCHAT-AUTH-INPUT', () => {
  it('WC-AI-01: conv-web-session rechaza profile_id desde payload publico', () => {
    const src = readFile(WC_SESSION_PATH);
    expect(src).toContain('detectForbiddenPublicInput');
    expect(src).toContain('Campo no permitido en WebChat público');
  });

  it('WC-AI-02: conv-web-session rechaza phone desde payload publico', () => {
    const src = readFile(WC_SECURITY_PATH);
    expect(src).toContain("'phone'");
    // phone esta en WEBCHAT_FORBIDDEN_PUBLIC_INPUT_FIELDS
    expect(src).toContain('WEBCHAT_FORBIDDEN_PUBLIC_INPUT_FIELDS');
  });

  it('WC-AI-03: conv-web-session rechaza identity_data desde payload publico', () => {
    const src = readFile(WC_SECURITY_PATH);
    expect(src).toContain("'identity_data'");
  });

  it('WC-AI-04: conv-web-session rechaza room_id desde payload publico', () => {
    const src = readFile(WC_SECURITY_PATH);
    expect(src).toContain("'room_id'");
  });

  it('WC-AI-05: conv-web-session rechaza assignment_id desde payload publico', () => {
    const src = readFile(WC_SECURITY_PATH);
    expect(src).toContain("'assignment_id'");
  });

  it('WC-AI-06: conv-web-session rechaza raw_payload desde payload publico', () => {
    const src = readFile(WC_SECURITY_PATH);
    expect(src).toContain("'raw_payload'");
  });

  it('WC-AI-07: conv-web-session no llama conv-core-validate-identity en codigo activo (no JSDoc)', () => {
    const src = readFile(WC_SESSION_PATH);
    // No debe haber fetch a conv-core-validate-identity en el codigo de produccion
    expect(src).not.toMatch(/fetch\s*\(.*conv-core-validate-identity/);
    expect(src).not.toMatch(/await fetch.*conv-core-validate-identity/);
  });

  it('WC-AI-08: conv-web-session no guarda profile_id desde payload publico', () => {
    const src = readFile(WC_SESSION_PATH);
    // No hay asignacion de profile_id desde body a la fila de conv_sessions
    expect(src).not.toMatch(/profile_id.*incomingProfileId|incomingProfileId.*profile_id/);
    expect(src).not.toMatch(/sessionInsert.*profile_id|insert.*profile_id.*body/);
  });

  it('WC-AI-09: conv-web-session no guarda identity_data desde payload publico', () => {
    const src = readFile(WC_SESSION_PATH);
    // identity_data siempre se inserta como objeto vacio {}
    expect(src).toMatch(/identity_data:\s*\{\}/);
    // Nunca se asigna desde body
    expect(src).not.toMatch(/identity_data.*body\[/);
  });

  it('WC-AI-10: WEBCHAT_FORBIDDEN_PUBLIC_INPUT_FIELDS incluye profile_id, phone, identity_data, raw_payload', () => {
    const critical = ['profile_id', 'phone', 'identity_data', 'raw_payload', 'room_id', 'assignment_id'];
    const src = readFile(WC_SECURITY_PATH);
    for (const field of critical) {
      expect(src).toContain(`'${field}'`);
    }
  });
});

// ---------------------------------------------------------------------------
// WEBCHAT-DISPATCH-CLARITY (DC-11..DC-20)
// Claridad: conv-ingest NO es equivalente a conv-dispatch-message.
// Opcion A -- dispatch sincrono controlado.
// ---------------------------------------------------------------------------

describe('WEBCHAT-DISPATCH-CLARITY', () => {
  it('WC-DC-11: conv-web-message llama conv-ingest', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).toContain('conv-ingest');
    expect(src).toContain('normalized_message');
  });

  it('WC-DC-12: conv-web-message llama conv-dispatch-message explicitamente (Opcion A)', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).toContain('conv-dispatch-message');
  });

  it('WC-DC-13: conv-web-message no llama routing directamente en codigo activo', () => {
    const src = readFile(WC_MESSAGE_PATH);
    // No debe haber fetch() a conv-routing-engine en el codigo de produccion (JSDoc puede mencionarlo)
    expect(src).not.toMatch(/fetch\s*\(.*conv-routing-engine/);
    expect(src).not.toMatch(/await fetch.*routing-engine/i);
  });

  it('WC-DC-14: conv-web-message no llama WF directamente en codigo activo', () => {
    const src = readFile(WC_MESSAGE_PATH);
    // No debe haber fetch() a conv-wf-XX en el codigo de produccion (JSDoc puede mencionarlo)
    expect(src).not.toMatch(/fetch\s*\(.*conv-wf-\d+/);
    expect(src).not.toMatch(/await fetch.*\/conv-wf-/i);
  });

  it('WC-DC-15: conv-dispatch-message es el unico orquestador que llama routing/WF/outbound', () => {
    const src = readFile(WC_MESSAGE_PATH);
    // La documentacion interna del codigo lo clarifica
    expect(src).toContain('conv-dispatch-message es el único orquestador');
  });

  it('WC-DC-16: conv-ingest NO se trata como equivalente a conv-dispatch-message', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).toContain('conv-ingest');
    expect(src).toContain('conv-dispatch-message');
    // El JSDoc clarifica la diferencia
    expect(src).toContain('conv-ingest NO equivale a conv-dispatch-message');
  });

  it('WC-DC-17: flujo Opcion A documentado en JSDoc de conv-web-message', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).toContain('Opción A');
    expect(src).toContain('dispatch síncrono');
  });

  it('WC-DC-18: WebChat outbound sigue usando conv-web-deliver', () => {
    // conv-dispatch-message llama a conv-web-deliver para canal webchat
    const dispatchSrc = readFile(resolve(ROOT, 'supabase/functions/conv-dispatch-message/index.ts'));
    expect(dispatchSrc).toContain('conv-web-deliver');
    expect(dispatchSrc).toContain("'webchat'");
  });

  it('WC-DC-19: WebChat no usa conv-send-wa', () => {
    const src = readFile(WC_MESSAGE_PATH);
    expect(src).not.toContain('conv-send-wa');
    expect(src).not.toContain('sendWasenderMessage');
  });

  it('WC-DC-20: WebChat no llama Wasender en ningun paso del flujo', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/fetch.*wasender/i);
    expect(srcs).not.toMatch(/import.*wasender/i);
    expect(srcs).not.toContain('sendWasenderMessage');
  });
});

// ---------------------------------------------------------------------------
// WEBCHAT-PRIVACY-REGRESSION (PR-21..PR-30)
// ---------------------------------------------------------------------------

describe('WEBCHAT-PRIVACY-REGRESSION', () => {
  it('WC-PR-21: logs no contienen profile_id', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/log\.(info|warn|error)\([^)]*profile_id/);
  });

  it('WC-PR-22: logs no contienen identity_data', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/log\.(info|warn|error)\([^)]*identity_data/);
  });

  it('WC-PR-23: logs no contienen phone', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/log\.(info|warn|error)\([^)]*['"'']phone['"'']/);
  });

  it('WC-PR-24: logs no contienen sender_ref', () => {
    const srcs = [WC_MESSAGE_PATH, WC_DELIVER_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/log\.(info|warn|error)\([^)]*sender_ref/);
  });

  it('WC-PR-25: logs no contienen message_text', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/log\.(info|warn|error)\([^)]*message_text/);
  });

  it('WC-PR-26: outbound (ok()) no contiene profile_id', () => {
    const src = readFile(WC_DELIVER_PATH);
    expect(src).not.toMatch(/ok\(\{[^}]*profile_id/);
  });

  it('WC-PR-27: outbound (ok()) no contiene identity_data', () => {
    const src = readFile(WC_DELIVER_PATH);
    expect(src).not.toMatch(/ok\(\{[^}]*identity_data/);
  });

  it('WC-PR-28: respuesta de conv-web-session no contiene profile_id', () => {
    const src = readFile(WC_SESSION_PATH);
    expect(src).not.toMatch(/ok\(\{[^}]*profile_id/);
    expect(src).not.toMatch(/['"]profile_id['"]\s*:/);
  });

  it('WC-PR-29: respuesta de conv-web-session no contiene identity_data', () => {
    const src = readFile(WC_SESSION_PATH);
    expect(src).not.toMatch(/ok\(\{[^}]*identity_data/);
  });

  it('WC-PR-30: conv-web-message no expone JSON tecnico al widget', () => {
    const src = readFile(WC_MESSAGE_PATH);
    // La respuesta al widget es solo { ok, message_id, status } -- sin traza tecnica
    expect(src).toContain("status: 'received'");
    expect(src).not.toMatch(/ok\(\{[^}]*ingestBody/);
    expect(src).not.toMatch(/ok\(\{[^}]*dispatchRes/);
  });
});

// ---------------------------------------------------------------------------
// WEBCHAT-INPUT-RESTRICTIONS (IR-31..IR-42)
// ---------------------------------------------------------------------------

describe('WEBCHAT-INPUT-RESTRICTIONS', () => {
  it('WC-IR-31: no se modifican migraciones en Fase 10E microfix', () => {
    // Las migrations no contienen ficheros de Fase 10E
    const migDir = resolve(ROOT, 'supabase/migrations');
    const { readdirSync } = require('fs');
    const migrations = readdirSync(migDir) as string[];
    const fase10E = migrations.filter(f => f.includes('webchat_integration') || f.includes('10e'));
    expect(fase10E).toHaveLength(0);
  });

  it('WC-IR-32: no se crean tablas nuevas en ficheros WebChat', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_CLIENT_PATH, WC_DELIVER_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/CREATE TABLE/i);
    expect(srcs).not.toMatch(/\.from\('conv_wc_new/);
  });

  it('WC-IR-33: no se introducen nuevos estados en ficheros WebChat', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_CLIENT_PATH, WC_DELIVER_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/state:\s*['"]DISPATCHING/);
    expect(srcs).not.toMatch(/state:\s*['"]AUTHENTICATED/);
  });

  it('WC-IR-34: no se introducen nuevos eventos en ficheros WebChat', () => {
    const srcs = [WC_SESSION_PATH, WC_MESSAGE_PATH, WC_CLIENT_PATH, WC_DELIVER_PATH].map(readFile).join('\n');
    expect(srcs).not.toMatch(/event_type:\s*['"]webchat_/);
  });

  it('WC-IR-35: no aparece WF-02 en codigo activo de ficheros WebChat', () => {
    const srcs = [WC_CLIENT_PATH, WC_SECURITY_PATH, WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH]
      .map(readFile).join('\n');
    expect(srcs).not.toMatch(/WF-02\s*[=:]/);
    expect(srcs).not.toMatch(/['"]WF-02['"]/);
  });

  it('WC-IR-36: no aparece conv_help_escalated en codigo activo', () => {
    const srcs = [WC_CLIENT_PATH, WC_SECURITY_PATH, WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH]
      .map(readFile).join('\n');
    expect(srcs).not.toMatch(/conv_help_escalated\s*[=:]/);
    expect(srcs).not.toMatch(/['"]conv_help_escalated['"]/);
  });

  it('WC-IR-37: no aparece WEAK_MATCH como estado activo', () => {
    const srcs = [WC_CLIENT_PATH, WC_SECURITY_PATH, WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH]
      .map(readFile).join('\n');
    expect(srcs).not.toMatch(/WEAK_MATCH\s*[=:]/);
    expect(srcs).not.toMatch(/['"]WEAK_MATCH['"]/);
  });

  it('WC-IR-38: no aparece UNVERIFIED standalone', () => {
    const srcs = [WC_CLIENT_PATH, WC_SECURITY_PATH, WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH]
      .map(readFile).join('\n');
    expect(srcs).not.toMatch(/['"]UNVERIFIED['"]/);
  });

  it('WC-IR-39: no aparece next_retry_at en ficheros WebChat', () => {
    const srcs = [WC_CLIENT_PATH, WC_SECURITY_PATH, WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH]
      .map(readFile).join('\n');
    expect(srcs).not.toMatch(/next_retry_at\s*:/);
    expect(srcs).not.toMatch(/next_retry_at\s*=/);
  });

  it('WC-IR-40: no aparece attempt_count en ficheros WebChat', () => {
    const srcs = [WC_CLIENT_PATH, WC_SECURITY_PATH, WC_SESSION_PATH, WC_MESSAGE_PATH, WC_DELIVER_PATH]
      .map(readFile).join('\n');
    expect(srcs).not.toMatch(/attempt_count\s*:/);
    expect(srcs).not.toMatch(/attempt_count\s*=/);
  });

  it('WC-IR-41: detectForbiddenPublicInput rechaza profile_id en body del widget', () => {
    // detectForbiddenPublicInput importado al inicio del archivo (static import)
    const result = detectForbiddenPublicInput({ client_account_id: 'uuid', profile_id: 'evil' });
    expect(result).toBe('profile_id');
  });

  it('WC-IR-42: detectForbiddenPublicInput devuelve null para body limpio del widget', () => {
    const result = detectForbiddenPublicInput({ client_account_id: 'uuid', origin: 'https://app.com' });
    expect(result).toBeNull();
  });
});
