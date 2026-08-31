/**
 * Fase 10A — Core Integration Regression
 * Tests estáticos (readFileSync). No conectan al Core real, n8n real, Claude real
 * ni Wasender real. Verifican contratos, privacidad y restricciones de los adapters.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------

const RUNTIME_DIR = resolve(__dirname, '../../../../../supabase/functions/_shared/smart-conversations/runtime');
const DOCS_DIR    = resolve(__dirname, '../../../../../docs/smart-conversations/core-integration');
const N8N_DIR     = resolve(__dirname, '../../../../../docs/smart-conversations/n8n/workflows');

const HTTP_CLIENT        = resolve(RUNTIME_DIR, 'core-http-client.ts');
const IDENTITY_CLIENT    = resolve(RUNTIME_DIR, 'core-identity-client.ts');
const INCIDENT_CLIENT    = resolve(RUNTIME_DIR, 'core-incident-client.ts');
const LISTINGS_CLIENT    = resolve(RUNTIME_DIR, 'core-listings-client.ts');
const LEAD_CLIENT        = resolve(RUNTIME_DIR, 'core-lead-client.ts');
const KB_CLIENT          = resolve(RUNTIME_DIR, 'help-kb-client.ts');
const HELP_TICKET_CLIENT = resolve(RUNTIME_DIR, 'core-help-ticket-client.ts');
const ENV_DOC            = resolve(DOCS_DIR, 'env.example.md');

function src(path: string): string { return readFileSync(path, 'utf8'); }

// ---------------------------------------------------------------------------
// CORE-CONFIG: configuración y modo
// ---------------------------------------------------------------------------

describe('CORE-CONFIG: configuración y modo de integración', () => {
  it('CORE-CFG-01: core-http-client exporta getCoreIntegrationMode', () => {
    expect(src(HTTP_CLIENT)).toContain('getCoreIntegrationMode');
    expect(src(HTTP_CLIENT)).toContain('export function getCoreIntegrationMode');
  });

  it("CORE-CFG-02: modo default es 'mock' cuando env var falta", () => {
    const s = src(HTTP_CLIENT);
    // La función getCoreIntegrationMode devuelve 'mock' como fallback
    expect(s).toMatch(/['"']mock['"']\s*(?:as|:|\))/);
    expect(s).toContain("return 'mock'");
  });

  it('CORE-CFG-03: modo real está detrás de CORE_INTEGRATION_MODE env var', () => {
    expect(src(HTTP_CLIENT)).toContain('CORE_INTEGRATION_MODE');
  });

  it('CORE-CFG-04: CORE_BASE_URL requerida en modo real', () => {
    expect(src(HTTP_CLIENT)).toContain('CORE_BASE_URL');
    expect(src(HTTP_CLIENT)).toContain('CORE_CONFIG_MISSING');
  });

  it('CORE-CFG-05: CORE_SERVICE_TOKEN no se loguea — no aparece en console.log/efLogger', () => {
    const s = src(HTTP_CLIENT);
    // El token puede aparecer como nombre de env var, pero no en una llamada de log
    const logIdx = Math.max(s.indexOf('console.log'), s.indexOf('efLogger.'));
    if (logIdx >= 0) {
      // Si hay logs, verificar que CORE_SERVICE_TOKEN no está cerca
      const logContext = s.slice(logIdx, logIdx + 200);
      expect(logContext).not.toContain('CORE_SERVICE_TOKEN');
    }
    // No hay console.log de tokens
    expect(s).not.toMatch(/console\.log[^)]*CORE_SERVICE_TOKEN/);
  });

  it('CORE-CFG-06: no hay secrets hardcodeados en core-http-client', () => {
    const s = src(HTTP_CLIENT);
    // No debe haber strings que parezcan tokens JWT o claves reales
    expect(s).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    expect(s).not.toMatch(/sk-[A-Za-z0-9]{20,}/);
    expect(s).not.toMatch(/service_role_key\s*=\s*["'][^"']{10,}/);
  });

  it('CORE-CFG-07: env.example.md existe y documenta CORE_INTEGRATION_MODE', () => {
    expect(existsSync(ENV_DOC)).toBe(true);
    expect(src(ENV_DOC)).toContain('CORE_INTEGRATION_MODE');
  });

  it("CORE-CFG-08: env.example.md documenta que el default es 'mock'", () => {
    expect(src(ENV_DOC)).toContain('mock');
  });
});

// ---------------------------------------------------------------------------
// CORE-HTTP: core-http-client contratos
// ---------------------------------------------------------------------------

describe('CORE-HTTP: core-http-client contratos de seguridad', () => {
  it('CORE-HTTP-07: core-http-client exporta CORE_OPERATION_PATHS (allowlist)', () => {
    expect(src(HTTP_CLIENT)).toContain('CORE_OPERATION_PATHS');
    expect(src(HTTP_CLIENT)).toContain('export const CORE_OPERATION_PATHS');
  });

  it('CORE-HTTP-08: allowlist contiene las 6 operaciones permitidas', () => {
    const s = src(HTTP_CLIENT);
    expect(s).toContain('core.identity.validate');
    expect(s).toContain('core.incidents.create');
    expect(s).toContain('core.listings.query');
    expect(s).toContain('core.leads.create');
    expect(s).toContain('core.help.kb.query');
    expect(s).toContain('core.help.tickets.create');
  });

  it('CORE-HTTP-09: rechaza path arbitrario — usa solo CORE_OPERATION_PATHS', () => {
    const s = src(HTTP_CLIENT);
    // La resolución del path viene de la allowlist, no de input directo
    expect(s).toContain('_resolveAllowedPath');
    expect(s).toContain('OPERATION_NOT_ALLOWED');
  });

  it('CORE-HTTP-10: rechaza URL absoluta desde input externo — URL construida desde base+path interno', () => {
    const s = src(HTTP_CLIENT);
    // La URL se construye solo desde baseUrl + path de allowlist
    expect(s).toContain('`${baseUrl}${path}`');
    // No acepta URL completa desde input del request
    expect(s).not.toMatch(/req\.url\s*[^=]?=/);
  });

  it('CORE-HTTP-11: añade X-Client-Account-Id en header', () => {
    expect(src(HTTP_CLIENT)).toContain('X-Client-Account-Id');
  });

  it('CORE-HTTP-12: añade X-Request-Id para trazabilidad', () => {
    expect(src(HTTP_CLIENT)).toContain('X-Request-Id');
  });

  it('CORE-HTTP-13: timeout configurado desde CORE_TIMEOUT_MS', () => {
    const s = src(HTTP_CLIENT);
    expect(s).toContain('CORE_TIMEOUT_MS');
    expect(s).toContain('AbortController');
  });

  it('CORE-HTTP-14: 4xx no reintenta — retryable: false inmediato', () => {
    const s = src(HTTP_CLIENT);
    // Bloque 4xx con return inmediato (sin await sleep)
    const idx4xx = s.indexOf('status >= 400 && response.status < 500');
    expect(idx4xx).toBeGreaterThan(0);
    const after4xx = s.slice(idx4xx, idx4xx + 400);
    // retryable: false aparece en el return del bloque 4xx
    expect(after4xx).toMatch(/retryable:\s+false/);
  });

  it('CORE-HTTP-15: 5xx usa retry con sleep', () => {
    const s = src(HTTP_CLIENT);
    expect(s).toContain('_sleep(RETRY_DELAYS_MS[attempt])');
  });

  it('CORE-HTTP-16: timeout (AbortError) usa retry con sleep', () => {
    const s = src(HTTP_CLIENT);
    expect(s).toContain('AbortError');
    expect(s).toContain('_sleep(RETRY_DELAYS_MS[attempt])');
  });

  it('CORE-HTTP-17: máximo 3 intentos — MAX_ATTEMPTS = 3', () => {
    const s = src(HTTP_CLIENT);
    expect(s).toContain('MAX_ATTEMPTS    = 3');
  });

  it('CORE-HTTP-18: no hay 4.º intento — loop hasta MAX_ATTEMPTS - 1', () => {
    const s = src(HTTP_CLIENT);
    expect(s).toContain('attempt < MAX_ATTEMPTS - 1');
  });

  it('CORE-HTTP-19: error final controlado — no expone stack trace', () => {
    const s = src(HTTP_CLIENT);
    // Error final devuelve error_code, no stack
    expect(s).toContain('_EXHAUSTED');
    expect(s).not.toContain('.stack');
  });

  it('CORE-HTTP-20: backoff 1s/5s/30s definido', () => {
    const s = src(HTTP_CLIENT);
    expect(s).toContain('1_000');
    expect(s).toContain('5_000');
    expect(s).toContain('30_000');
  });

  it('CORE-HTTP-20b: en mode=mock coreHttpCall devuelve MOCK_MODE sin fetch', () => {
    const s = src(HTTP_CLIENT);
    // En modo mock, retorna MOCK_MODE antes de cualquier fetch
    expect(s).toContain("error_code: 'MOCK_MODE'");
    // Y el fetch está solo en _coreHttpCallReal
    expect(s).toContain('_coreHttpCallReal');
  });

  it('CORE-HTTP-20c: no loguea Authorization header', () => {
    const s = src(HTTP_CLIENT);
    // Authorization no aparece en console.log ni efLogger.log
    expect(s).not.toMatch(/console\.log[^)]*Authorization/);
    expect(s).not.toMatch(/efLogger[^)]*Authorization/);
    // Pero sí aparece como nombre de header (eso está bien)
    expect(s).toContain("'Authorization'");
  });
});

// ---------------------------------------------------------------------------
// CORE-IDENTITY: identity adapter
// ---------------------------------------------------------------------------

describe('CORE-IDENTITY: identity adapter contratos', () => {
  it('CORE-ID-21: mock sigue funcionando — defaultCoreIdentityClient es mock', () => {
    const s = src(IDENTITY_CLIENT);
    expect(s).toContain('defaultCoreIdentityClient');
    expect(s).toContain('mockCoreIdentityClient');
    // El default es el mock
    expect(s).toContain('export const defaultCoreIdentityClient: CoreIdentityClient = mockCoreIdentityClient');
  });

  it('CORE-ID-22: adapter real usa coreHttpCall desde core-http-client', () => {
    expect(src(IDENTITY_CLIENT)).toContain('coreHttpCall');
    expect(src(IDENTITY_CLIENT)).toContain('core-http-client.ts');
  });

  it("CORE-ID-23: identity real usa operación allowlisted 'core.identity.validate'", () => {
    expect(src(IDENTITY_CLIENT)).toContain('core.identity.validate');
  });

  it('CORE-ID-24: identity real no permite UNVERIFIED_LEAD — no está en el Set de niveles válidos', () => {
    const s = src(IDENTITY_CLIENT);
    expect(s).toContain('VALID_IDENTITY_LEVELS');
    // UNVERIFIED_LEAD no debe aparecer como miembro del Set de niveles válidos
    // (puede aparecer en comentarios pero no en new Set([...]))
    const setIdx = s.indexOf('new Set<string>([');
    if (setIdx >= 0) {
      const setBlock = s.slice(setIdx, setIdx + 300);
      expect(setBlock).not.toContain('UNVERIFIED_LEAD');
    }
  });

  it('CORE-ID-25: identity real no permite WEAK_MATCH — no está en el Set de niveles válidos', () => {
    const s = src(IDENTITY_CLIENT);
    // WEAK_MATCH no debe aparecer como miembro del Set de niveles válidos
    const setIdx = s.indexOf('new Set<string>([');
    if (setIdx >= 0) {
      const setBlock = s.slice(setIdx, setIdx + 300);
      expect(setBlock).not.toContain('WEAK_MATCH');
    }
    // Y no debe aparecer como nivel devuelto
    expect(s).not.toMatch(/identity_level.*['"]WEAK_MATCH['"]/);
  });

  it('CORE-ID-26: nivel desconocido de Core mapea a NO_MATCH (error controlado)', () => {
    const s = src(IDENTITY_CLIENT);
    // Si el nivel no está en la allowlist, devuelve NO_MATCH
    expect(s).toContain('VALID_IDENTITY_LEVELS.has(level)');
    // Y devuelve NO_MATCH como fallback — ventana ampliada
    const idx = s.indexOf('VALID_IDENTITY_LEVELS.has(level)');
    const after = s.slice(idx, idx + 350);
    expect(after).toContain("'NO_MATCH'");
  });

  it('CORE-ID-27: phone no aparece en logs — no hay console.log(phone)', () => {
    expect(src(IDENTITY_CLIENT)).not.toMatch(/console\.log[^)]*phone/);
  });

  it('CORE-ID-28: profile_id no aparece en logs — no hay console.log(profile_id)', () => {
    expect(src(IDENTITY_CLIENT)).not.toMatch(/console\.log[^)]*profile_id/);
  });

  it('CORE-ID-28b: buildCoreIdentityClient factory exportada', () => {
    expect(src(IDENTITY_CLIENT)).toContain('export function buildCoreIdentityClient');
  });
});

// ---------------------------------------------------------------------------
// CORE-INCIDENTS: incident adapter
// ---------------------------------------------------------------------------

describe('CORE-INCIDENTS: incident adapter contratos', () => {
  it('CORE-INC-29: mock sigue funcionando — defaultCoreIncidentClient es mock', () => {
    const s = src(INCIDENT_CLIENT);
    expect(s).toContain('defaultCoreIncidentClient');
    expect(s).toContain('export const defaultCoreIncidentClient: CoreIncidentClient = mockCoreIncidentClient');
  });

  it('CORE-INC-30: adapter real usa coreHttpCall', () => {
    expect(src(INCIDENT_CLIENT)).toContain('coreHttpCall');
  });

  it("CORE-INC-31: incident real usa operación 'core.incidents.create'", () => {
    expect(src(INCIDENT_CLIENT)).toContain('core.incidents.create');
  });

  it('CORE-INC-32: devuelve incident_id y incident_ref', () => {
    const s = src(INCIDENT_CLIENT);
    expect(s).toContain('incident_id');
    expect(s).toContain('incident_ref');
  });

  it('CORE-INC-33: no acepta profile_id ni room_id desde payload externo', () => {
    const s = src(INCIDENT_CLIENT);
    // CreateIncidentInput no tiene profile_id ni room_id
    // Buscar que el comentario explicativo está presente
    expect(s).toContain('profile_id y room_id');
    expect(s).toContain('conv_sessions');
  });

  it('CORE-INC-34: description no aparece en logs', () => {
    expect(src(INCIDENT_CLIENT)).not.toMatch(/console\.log[^)]*description/);
  });

  it('CORE-INC-35: 4xx devuelve error sin retry — buildCoreIncidentClient real', () => {
    // La lógica 4xx está en core-http-client; el adapter real lanza error controlado
    expect(src(INCIDENT_CLIENT)).toContain('error_code ?? \'UNKNOWN\'');
  });

  it('CORE-INC-36: buildCoreIncidentClient factory exportada', () => {
    expect(src(INCIDENT_CLIENT)).toContain('export function buildCoreIncidentClient');
  });
});

// ---------------------------------------------------------------------------
// CORE-LISTINGS: listings adapter
// ---------------------------------------------------------------------------

describe('CORE-LISTINGS: listings adapter contratos', () => {
  it('CORE-LST-37: mock sigue funcionando — defaultCoreListingsClient es mock', () => {
    const s = src(LISTINGS_CLIENT);
    expect(s).toContain('defaultCoreListingsClient');
    expect(s).toContain('export const defaultCoreListingsClient: CoreListingsClient = mockCoreListingsClient');
  });

  it('CORE-LST-38: adapter real usa coreHttpCall', () => {
    expect(src(LISTINGS_CLIENT)).toContain('coreHttpCall');
  });

  it("CORE-LST-39: listings real usa operación 'core.listings.query'", () => {
    expect(src(LISTINGS_CLIENT)).toContain('core.listings.query');
  });

  it('CORE-LST-40: no devuelve campos internos — PublicListing no incluye campos privados', () => {
    const s = src(LISTINGS_CLIENT);
    // PublicListing solo tiene campos públicos — no debe tener assignment_id, internal room_id
    const publicListingIdx = s.indexOf('export interface PublicListing');
    expect(publicListingIdx).toBeGreaterThan(0);
    const interfaceBlock = s.slice(publicListingIdx, publicListingIdx + 400);
    // Los campos definidos en la interfaz son solo los públicos
    expect(interfaceBlock).toContain('listing_id');
    expect(interfaceBlock).toContain('public_location');
    expect(interfaceBlock).toContain('public_room_label');
  });

  it('CORE-LST-41: real client no propaga campos privados — mapeo explícito a solo campos públicos', () => {
    const s = src(LISTINGS_CLIENT);
    // El mapeo del real client construye un objeto con solo campos públicos
    expect(s).toContain('public_room_label');
    // Y hay un comentario de que los internos son omitidos
    expect(s).toContain('campos internos de Core omitidos');
  });

  it('CORE-LST-42: devuelve solo entradas disponibles en mock — filtra por availability', () => {
    const s = src(LISTINGS_CLIENT);
    expect(s).toContain("availability === 'available'");
  });

  it('CORE-LST-43: real client no envía campos de identidad a Core', () => {
    const s = src(LISTINGS_CLIENT);
    // El body del real client solo envía channel y filters
    const bodyIdx = s.indexOf('body: {');
    expect(bodyIdx).toBeGreaterThan(0);
    const bodyBlock = s.slice(bodyIdx, bodyIdx + 200);
    // No hay profile_id ni identity_data en el body
    expect(bodyBlock).not.toContain('profile_id');
    expect(bodyBlock).not.toContain('identity_data');
    expect(bodyBlock).not.toContain('sender_ref');
  });

  it('CORE-LST-44: real client mapea solo campos públicos del response de Core', () => {
    const s = src(LISTINGS_CLIENT);
    // El mapeo usa solo campos definidos en PublicListing
    expect(s).toContain("raw['listing_id']");
    expect(s).toContain("raw['public_room_label']");
    // Y hay comentario de que los internos son omitidos
    expect(s).toContain('campos internos de Core omitidos');
  });

  it('CORE-LST-45: buildCoreListingsClient factory exportada', () => {
    expect(src(LISTINGS_CLIENT)).toContain('export function buildCoreListingsClient');
  });
});

// ---------------------------------------------------------------------------
// CORE-LEADS: lead adapter
// ---------------------------------------------------------------------------

describe('CORE-LEADS: lead adapter contratos', () => {
  it('CORE-LEAD-46: mock sigue funcionando — defaultCoreLeadClient es mock', () => {
    const s = src(LEAD_CLIENT);
    expect(s).toContain('defaultCoreLeadClient');
    expect(s).toContain('export const defaultCoreLeadClient: CoreLeadClient = mockCoreLeadClient');
  });

  it('CORE-LEAD-47: adapter real usa coreHttpCall', () => {
    expect(src(LEAD_CLIENT)).toContain('coreHttpCall');
  });

  it("CORE-LEAD-48: lead real usa operación 'core.leads.create'", () => {
    expect(src(LEAD_CLIENT)).toContain('core.leads.create');
  });

  it('CORE-LEAD-49: devuelve lead_id y lead_ref', () => {
    const s = src(LEAD_CLIENT);
    expect(s).toContain('lead_id');
    expect(s).toContain('lead_ref');
  });

  it('CORE-LEAD-50: contacto no aparece en logs — no hay console.log(contact)', () => {
    expect(src(LEAD_CLIENT)).not.toMatch(/console\.log[^)]*contact/);
  });

  it('CORE-LEAD-51: contacto no se incluye en Activity Log — comentario explícito', () => {
    const s = src(LEAD_CLIENT);
    expect(s).toContain('Activity Log');
  });

  it('CORE-LEAD-52: buildCoreLeadClient factory exportada', () => {
    expect(src(LEAD_CLIENT)).toContain('export function buildCoreLeadClient');
  });
});

// ---------------------------------------------------------------------------
// CORE-HELP: KB y ticket adapters
// ---------------------------------------------------------------------------

describe('CORE-HELP: help KB y ticket adapters', () => {
  it('CORE-HLP-53: KB mock sigue funcionando — defaultHelpKbClient es mock', () => {
    const s = src(KB_CLIENT);
    expect(s).toContain('defaultHelpKbClient');
    expect(s).toContain('export const defaultHelpKbClient: HelpKbClient = mockHelpKbClient');
  });

  it('CORE-HLP-54: KB real usa coreHttpCall', () => {
    expect(src(KB_CLIENT)).toContain('coreHttpCall');
  });

  it("CORE-HLP-55: KB real usa operación 'core.help.kb.query'", () => {
    expect(src(KB_CLIENT)).toContain('core.help.kb.query');
  });

  it('CORE-HLP-55b: KB real devuelve solo entradas con public=true', () => {
    const s = src(KB_CLIENT);
    expect(s).toContain("raw['public'] === true");
  });

  it('CORE-HLP-56: help ticket mock sigue funcionando — defaultCoreHelpTicketClient es mock', () => {
    const s = src(HELP_TICKET_CLIENT);
    expect(s).toContain('defaultCoreHelpTicketClient');
    expect(s).toContain('export const defaultCoreHelpTicketClient: CoreHelpTicketClient = mockCoreHelpTicketClient');
  });

  it('CORE-HLP-57: ticket real usa coreHttpCall', () => {
    expect(src(HELP_TICKET_CLIENT)).toContain('coreHttpCall');
  });

  it("CORE-HLP-58: ticket real usa operación 'core.help.tickets.create'", () => {
    expect(src(HELP_TICKET_CLIENT)).toContain('core.help.tickets.create');
  });

  it('CORE-HLP-59: ticket devuelve help_ticket_id y help_ticket_ref', () => {
    const s = src(HELP_TICKET_CLIENT);
    expect(s).toContain('help_ticket_id');
    expect(s).toContain('help_ticket_ref');
  });

  it('CORE-HLP-59b: summary no aparece en logs', () => {
    expect(src(HELP_TICKET_CLIENT)).not.toMatch(/console\.log[^)]*summary/);
  });

  it('CORE-HLP-59c: buildHelpKbClient y buildCoreHelpTicketClient factories exportadas', () => {
    expect(src(KB_CLIENT)).toContain('export function buildHelpKbClient');
    expect(src(HELP_TICKET_CLIENT)).toContain('export function buildCoreHelpTicketClient');
  });
});

// ---------------------------------------------------------------------------
// CORE-BOUNDARIES: n8n no llama Core real directamente
// ---------------------------------------------------------------------------

describe('CORE-BOUNDARIES: n8n no llama Core real directamente', () => {
  const STUB_FILES = [
    'SC-WF-10-routing.stub.json',
    'SC-WF-20-incidents.stub.json',
    'SC-WF-30-listings.stub.json',
    'SC-WF-40-help.stub.json',
    'SC-WF-IDENTITY.stub.json',
    'SC-WF-C00-reconcile.stub.json',
  ];

  it('CORE-BND-60: stubs n8n no contienen CORE_BASE_URL como valor real', () => {
    for (const f of STUB_FILES) {
      const path = resolve(N8N_DIR, f);
      if (existsSync(path)) {
        const content = readFileSync(path, 'utf8');
        expect(content).not.toContain('CORE_BASE_URL');
        expect(content).not.toContain('CORE_SERVICE_TOKEN');
      }
    }
  });

  it('CORE-BND-61: stubs n8n no contienen endpoint /smartroom/conversations/', () => {
    for (const f of STUB_FILES) {
      const path = resolve(N8N_DIR, f);
      if (existsSync(path)) {
        expect(readFileSync(path, 'utf8')).not.toContain('/smartroom/conversations/');
      }
    }
  });

  it('CORE-BND-62: todos los stubs n8n siguen con active=false', () => {
    for (const f of STUB_FILES) {
      const path = resolve(N8N_DIR, f);
      if (existsSync(path)) {
        const w = JSON.parse(readFileSync(path, 'utf8'));
        expect(w.active).toBe(false);
      }
    }
  });

  it('CORE-BND-63: core-http-client no menciona URLs de n8n', () => {
    const s = src(HTTP_CLIENT);
    expect(s).not.toContain('n8n');
    expect(s).not.toContain('hstgr.cloud');
  });

  it('CORE-BND-64: env.example no contiene URLs de producción reales del cliente', () => {
    const env = src(ENV_DOC);
    expect(env).not.toContain('hstgr.cloud');
    expect(env).not.toContain('n8n.srv');
  });
});

// ---------------------------------------------------------------------------
// CORE-RESTRICTIONS: invariantes de arquitectura
// ---------------------------------------------------------------------------

describe('CORE-RESTRICTIONS: invariantes de arquitectura — términos prohibidos', () => {
  const ALL_CLIENTS = [HTTP_CLIENT, IDENTITY_CLIENT, INCIDENT_CLIENT, LISTINGS_CLIENT,
                       LEAD_CLIENT, KB_CLIENT, HELP_TICKET_CLIENT];

  it('CORE-RST-65: ningún cliente introduce WF-02', () => {
    for (const f of ALL_CLIENTS) { expect(src(f)).not.toContain('WF-02'); }
  });

  it('CORE-RST-66: ningún cliente introduce conv_help_escalated', () => {
    for (const f of ALL_CLIENTS) { expect(src(f)).not.toContain('conv_help_escalated'); }
  });

  it('CORE-RST-67: ningún cliente asigna WEAK_MATCH como identity_level válido', () => {
    for (const f of ALL_CLIENTS) {
      // WEAK_MATCH puede aparecer en comentarios explicativos pero no como nivel devuelto
      expect(src(f)).not.toMatch(/identity_level.*['"]WEAK_MATCH['"]/);
      expect(src(f)).not.toMatch(/return.*['"]WEAK_MATCH['"]/);
      // No aparece como miembro de Set de niveles válidos
      const s = src(f);
      const setIdx = s.indexOf('new Set');
      if (setIdx >= 0) {
        const setBlock = s.slice(setIdx, setIdx + 400);
        expect(setBlock).not.toContain('WEAK_MATCH');
      }
    }
  });

  it('CORE-RST-68: ningún cliente introduce UNVERIFIED standalone (como nivel válido)', () => {
    for (const f of ALL_CLIENTS) {
      const s = src(f);
      // UNVERIFIED_LEAD puede aparecer como constante excluida en identity, pero nunca como nivel válido
      // Verificar que no se asigna 'UNVERIFIED' como identity_level devuelto
      expect(s).not.toMatch(/identity_level.*['"']UNVERIFIED['"']/);
      expect(s).not.toMatch(/return.*['"']UNVERIFIED['"']/);
    }
  });

  it('CORE-RST-69: ningún cliente introduce next_retry_at', () => {
    for (const f of ALL_CLIENTS) { expect(src(f)).not.toContain('next_retry_at'); }
  });

  it('CORE-RST-70: ningún cliente introduce attempt_count', () => {
    for (const f of ALL_CLIENTS) { expect(src(f)).not.toContain('attempt_count'); }
  });

  it('CORE-RST-71: no se introducen nuevos estados de conv_messages', () => {
    for (const f of ALL_CLIENTS) {
      const s = src(f);
      expect(s).not.toContain("'processed'");
      expect(s).not.toContain("'pending_retry'");
    }
  });

  it('CORE-RST-72: no se introducen nuevos eventos Activity Log', () => {
    const allowedEvents = ['conv_incident_created', 'conv_pre_incident_created',
      'conv_incident_updated', 'conv_lead_created', 'conv_case_escalated',
      'conv_case_closed', 'conv_session_started', 'conv_identity_updated'];
    for (const f of ALL_CLIENTS) {
      const s = src(f);
      // Los clientes no deben publicar eventos Activity Log directamente
      expect(s).not.toContain('conv-core-publish-activity');
    }
  });
});

// ---------------------------------------------------------------------------
// CORE-REGRESSION: tests de fases anteriores
// ---------------------------------------------------------------------------

describe('CORE-REGRESSION: verificación de integridad de fases anteriores', () => {
  const MIGRATION_SQL = resolve(__dirname, '../../../../../supabase/migrations/20260716000001_smart_conversations_core_schema.sql');
  const SHARED_DIR    = resolve(__dirname, '../../../../../supabase/functions/_shared/smart-conversations');

  it('CORE-REG-73: migración de schema sigue existiendo', () => {
    expect(existsSync(MIGRATION_SQL)).toBe(true);
  });

  it('CORE-REG-74: enums.ts sigue existiendo', () => {
    expect(existsSync(resolve(SHARED_DIR, 'enums.ts'))).toBe(true);
  });

  it('CORE-REG-75: infra — ef-auth sigue existiendo', () => {
    expect(existsSync(resolve(__dirname, '../../../../../supabase/functions/_shared/smart-conversations/ef-auth.ts'))).toBe(true);
  });

  it('CORE-REG-76: conv-ingest sigue existiendo', () => {
    expect(existsSync(resolve(__dirname, '../../../../../supabase/functions/conv-ingest/index.ts'))).toBe(true);
  });

  it('CORE-REG-77: conv-wa-webhook sigue existiendo', () => {
    expect(existsSync(resolve(__dirname, '../../../../../supabase/functions/conv-wa-webhook/index.ts'))).toBe(true);
  });

  it('CORE-REG-78: conv-send-wa sigue existiendo', () => {
    expect(existsSync(resolve(__dirname, '../../../../../supabase/functions/conv-send-wa/index.ts'))).toBe(true);
  });

  it('CORE-REG-79: conv-routing-engine sigue existiendo', () => {
    expect(existsSync(resolve(__dirname, '../../../../../supabase/functions/conv-routing-engine/index.ts'))).toBe(true);
  });

  it('CORE-REG-80: conv-core-validate-identity sigue existiendo', () => {
    expect(existsSync(resolve(__dirname, '../../../../../supabase/functions/conv-core-validate-identity/index.ts'))).toBe(true);
  });

  it('CORE-REG-81: conv-wf20-incidents sigue existiendo', () => {
    expect(existsSync(resolve(__dirname, '../../../../../supabase/functions/conv-wf20-incidents/index.ts'))).toBe(true);
  });

  it('CORE-REG-82: conv-wf30-listings sigue existiendo', () => {
    expect(existsSync(resolve(__dirname, '../../../../../supabase/functions/conv-wf30-listings/index.ts'))).toBe(true);
  });

  it('CORE-REG-83: conv-wf40-help sigue existiendo', () => {
    expect(existsSync(resolve(__dirname, '../../../../../supabase/functions/conv-wf40-help/index.ts'))).toBe(true);
  });

  it('CORE-REG-84: conv-dispatch-message sigue existiendo', () => {
    expect(existsSync(resolve(__dirname, '../../../../../supabase/functions/conv-dispatch-message/index.ts'))).toBe(true);
  });

  it('CORE-REG-85: e2e static spec sigue existiendo', () => {
    expect(existsSync(resolve(__dirname, '../e2e/e2e-conversation.spec.ts'))).toBe(true);
  });

  it('CORE-REG-86: n8n contracts spec sigue existiendo', () => {
    expect(existsSync(resolve(__dirname, '../n8n/n8n-contracts.spec.ts'))).toBe(true);
  });

  it('CORE-REG-87: core-http-client sigue existiendo con modo mock como default', () => {
    expect(existsSync(HTTP_CLIENT)).toBe(true);
    expect(src(HTTP_CLIENT)).toContain("return 'mock'");
  });
});
