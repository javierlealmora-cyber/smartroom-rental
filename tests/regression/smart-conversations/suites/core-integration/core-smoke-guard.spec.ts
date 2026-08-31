/**
 * Fase 10B — Core Smoke Guard Tests
 *
 * Valida que el smoke runner y la documentación Core cumplen las restricciones
 * de seguridad, privacidad y arquitectura. NO llama a ningún servicio real.
 *
 * SG-01..SG-14  Runner: existencia, modo seguro, guards, privacidad
 * SG-15..SG-20  Documentación: plan + checklist cubren los 6 endpoints
 * SG-21..SG-29  Restricciones de arquitectura: mocks, no-real-services, no-creds
 * SG-30..SG-36  Términos prohibidos: no WF-02, no estados inválidos, regresión
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Rutas de artefactos
// ---------------------------------------------------------------------------

const ROOT = resolve(__dirname, '../../../../../');

const RUNNER_PATH      = resolve(ROOT, 'scripts/smart-conversations/core-smoke.ts');
const PLAN_PATH        = resolve(ROOT, 'docs/smart-conversations/core-integration/smoke-test-plan.md');
const CHECKLIST_PATH   = resolve(ROOT, 'docs/smart-conversations/core-integration/core-contract-checklist.md');
const HTTP_CLIENT_PATH = resolve(ROOT, 'supabase/functions/_shared/smart-conversations/runtime/core-http-client.ts');

function readFile(p: string): string {
  return readFileSync(p, 'utf-8');
}

// ---------------------------------------------------------------------------
// SG-01..SG-14  Runner: existencia, seguridad por defecto, privacidad
// ---------------------------------------------------------------------------

describe('CORE-SMOKE-RUNNER', () => {

  it('SG-01: smoke runner existe en scripts/smart-conversations/core-smoke.ts', () => {
    expect(existsSync(RUNNER_PATH)).toBe(true);
  });

  it('SG-02: runner requiere CORE_SMOKE_ENABLED=true — código verifica el flag', () => {
    const src = readFile(RUNNER_PATH);
    expect(src).toContain("CORE_SMOKE_ENABLED");
    expect(src).toContain("=== 'true'");
  });

  it('SG-03: runner devuelve vacío/early-exit cuando CORE_SMOKE_ENABLED no es true', () => {
    const src = readFile(RUNNER_PATH);
    // Debe haber una rama que retorna cuando el flag no está activo
    expect(src).toContain('SMOKE_DISABLED');
    expect(src).toContain('smoke disabled');
  });

  it('SG-04: runner requiere CORE_INTEGRATION_MODE=real para ejecución real', () => {
    const src = readFile(RUNNER_PATH);
    expect(src).toContain('CORE_INTEGRATION_MODE');
    expect(src).toContain("!== 'real'");
  });

  it('SG-05: runner requiere CORE_BASE_URL', () => {
    const src = readFile(RUNNER_PATH);
    expect(src).toContain('CORE_BASE_URL');
    expect(src).toContain('CORE_BASE_URL_MISSING');
  });

  it('SG-06: runner requiere CORE_SERVICE_TOKEN', () => {
    const src = readFile(RUNNER_PATH);
    expect(src).toContain('CORE_SERVICE_TOKEN');
    expect(src).toContain('CORE_SERVICE_TOKEN_MISSING');
  });

  it('SG-07: runner bloquea URLs de producción por defecto', () => {
    const src = readFile(RUNNER_PATH);
    expect(src).toContain('PRODUCTION_URL_BLOCKED');
    expect(src).toContain('CORE_SMOKE_ALLOW_PRODUCTION');
    // Al menos un patrón de producción bloqueado
    expect(src).toMatch(/smartroom\.es|smartroomrental\.com/);
  });

  it('SG-08: runner NO imprime CORE_SERVICE_TOKEN en logs', () => {
    const src = readFile(RUNNER_PATH);
    // El token se usa en header pero nunca en safeLog/console.log directamente
    // Verificar que CORE_SERVICE_TOKEN no pasa a safeLog como valor
    expect(src).not.toMatch(/safeLog\([^)]*CORE_SERVICE_TOKEN[^)]*\)/);
    expect(src).not.toMatch(/console\.log\([^)]*CORE_SERVICE_TOKEN[^)]*\)/);
  });

  it('SG-09: runner NO imprime Authorization en logs', () => {
    const src = readFile(RUNNER_PATH);
    // safeLog tiene guard explícita para Authorization
    expect(src).toContain("'Authorization'");
    expect(src).toContain('REDACTED');
  });

  it('SG-10: runner NO imprime phone en logs', () => {
    const src = readFile(RUNNER_PATH);
    // phone puede estar en payloads pero nunca en safeLog
    expect(src).not.toMatch(/safeLog\([^)]*phone[^)]*\)/);
    expect(src).not.toMatch(/console\.log\([^)]*phone[^)]*\)/);
  });

  it('SG-11: runner NO imprime profile_id en logs', () => {
    const src = readFile(RUNNER_PATH);
    expect(src).not.toMatch(/safeLog\([^)]*profile_id[^)]*\)/);
    expect(src).not.toMatch(/console\.log\([^)]*profile_id[^)]*\)/);
  });

  it('SG-12: runner NO imprime contact ni email en logs', () => {
    const src = readFile(RUNNER_PATH);
    // El log de lead dice explícitamente "No loguear contact"
    expect(src).toContain('No loguear contact');
    expect(src).not.toMatch(/safeLog\([^)]*contact[^)]*\)/);
  });

  it('SG-13: runner NO imprime summary en logs', () => {
    const src = readFile(RUNNER_PATH);
    expect(src).toContain('No loguear summary');
    expect(src).not.toMatch(/safeLog\([^)]*summary[^)]*\)/);
  });

  it('SG-14: runner cubre las 6 operaciones Core', () => {
    const src = readFile(RUNNER_PATH);
    expect(src).toContain('identity.validate');
    expect(src).toContain('incidents.create');
    expect(src).toContain('listings.query');
    expect(src).toContain('leads.create');
    expect(src).toContain('help.kb.query');
    expect(src).toContain('help.tickets.create');
  });
});

// ---------------------------------------------------------------------------
// SG-15..SG-20  Documentación: plan + checklist cubren los 6 endpoints
// ---------------------------------------------------------------------------

describe('CORE-SMOKE-DOCS', () => {

  it('SG-15: smoke-test-plan.md existe', () => {
    expect(existsSync(PLAN_PATH)).toBe(true);
  });

  it('SG-16: core-contract-checklist.md existe', () => {
    expect(existsSync(CHECKLIST_PATH)).toBe(true);
  });

  it('SG-17: plan cubre identity — menciona phone, profile_id, niveles del contrato', () => {
    const doc = readFile(PLAN_PATH);
    expect(doc).toContain('identity.validate');
    expect(doc).toContain('STRONG_MATCH_ACTIVE');
    expect(doc).toContain('NO_MATCH');
    expect(doc).toContain('phone');
    expect(doc).toContain('profile_id');
  });

  it('SG-18: plan cubre incidents, listings, leads, help KB, help tickets', () => {
    const doc = readFile(PLAN_PATH);
    expect(doc).toContain('incidents.create');
    expect(doc).toContain('listings.query');
    expect(doc).toContain('leads.create');
    expect(doc).toContain('help.kb.query');
    expect(doc).toContain('help.tickets.create');
  });

  it('SG-19: checklist documenta los 6 endpoints con path placeholder', () => {
    const doc = readFile(CHECKLIST_PATH);
    // Los 6 endpoints
    expect(doc).toContain('core.identity.validate');
    expect(doc).toContain('core.incidents.create');
    expect(doc).toContain('core.listings.query');
    expect(doc).toContain('core.leads.create');
    expect(doc).toContain('core.help.kb.query');
    expect(doc).toContain('core.help.tickets.create');
  });

  it('SG-20: checklist documenta campos sensibles y prohibidos en logs', () => {
    const doc = readFile(CHECKLIST_PATH);
    expect(doc).toContain('prohibidos en logs');
    // Campos sensibles documentados
    expect(doc).toContain('phone');
    expect(doc).toContain('Authorization');
    expect(doc).toContain('description');
    expect(doc).toContain('summary');
  });
});

// ---------------------------------------------------------------------------
// SG-21..SG-29  Restricciones: mocks default, no-real-services, no-creds
// ---------------------------------------------------------------------------

describe('CORE-SMOKE-RESTRICTIONS', () => {

  it('SG-21: mock sigue siendo el default — core-http-client devuelve MOCK_MODE sin env', () => {
    const src = readFile(HTTP_CLIENT_PATH);
    // El default en getCoreIntegrationMode es 'mock'
    expect(src).toContain("?? 'mock'");
    expect(src).toContain("error_code: 'MOCK_MODE'");
  });

  it('SG-22: runner no conecta Core real en su código de import-time', () => {
    const src = readFile(RUNNER_PATH);
    // Los adapters se importan dinámicamente solo si config válida
    expect(src).toContain('import(');
    // No hay llamadas a buildXxxClient fuera de la función runCoreSmoke
    const outsideFunction = src.split('export async function runCoreSmoke')[0];
    expect(outsideFunction).not.toContain('buildCoreIdentityClient');
    expect(outsideFunction).not.toContain('buildCoreIncidentClient');
  });

  it('SG-23: runner no contiene credenciales reales hardcodeadas', () => {
    const src = readFile(RUNNER_PATH);
    // Sin URLs de producción hardcodeadas como valores
    expect(src).not.toMatch(/CORE_BASE_URL\s*=\s*['"]https?:\/\/[a-z]/);
    expect(src).not.toMatch(/CORE_SERVICE_TOKEN\s*=\s*['"][a-zA-Z0-9]{20,}/);
  });

  it('SG-24: smoke-test-plan.md no contiene credenciales reales', () => {
    const doc = readFile(PLAN_PATH);
    // Sin tokens ni URLs reales de producción
    expect(doc).not.toMatch(/REPLACE_WITH_SANDBOX_TOKEN\s*=\s*[a-zA-Z0-9]{20,}/);
    expect(doc).not.toMatch(/smartroom\.es|smartroomrental\.com/);
  });

  it('SG-25: no se conecta n8n real — runner no importa ni referencia n8n', () => {
    const src = readFile(RUNNER_PATH);
    expect(src).not.toContain('n8n');
    expect(src).not.toContain('hstgr.cloud');
    expect(src).not.toContain('n8n.srv');
  });

  it('SG-26: no se conecta Claude real — runner no referencia Anthropic API', () => {
    const src = readFile(RUNNER_PATH);
    expect(src).not.toContain('anthropic');
    expect(src).not.toContain('claude.ai');
    expect(src).not.toContain('api.anthropic.com');
  });

  it('SG-27: no se conecta Wasender real — runner no referencia Wasender', () => {
    const src = readFile(RUNNER_PATH);
    expect(src).not.toContain('wasender');
    expect(src).not.toContain('whatsapp-api');
  });

  it('SG-28: no se modifican migraciones — runner no contiene SQL DDL', () => {
    const src = readFile(RUNNER_PATH);
    expect(src).not.toMatch(/CREATE TABLE/i);
    expect(src).not.toMatch(/ALTER TABLE/i);
    expect(src).not.toMatch(/DROP TABLE/i);
  });

  it('SG-29: no se crean tablas nuevas — runner no referencia supabase admin', () => {
    const src = readFile(RUNNER_PATH);
    expect(src).not.toContain('supabase.from(');
    expect(src).not.toContain('.rpc(');
  });
});

// ---------------------------------------------------------------------------
// SG-30..SG-36  Términos prohibidos y regresión
// ---------------------------------------------------------------------------

describe('CORE-SMOKE-FORBIDDEN-TERMS', () => {

  it('SG-30: runner no introduce WF-02', () => {
    const src = readFile(RUNNER_PATH);
    expect(src).not.toContain('WF-02');
  });

  it('SG-31: runner no introduce conv_help_escalated', () => {
    const src = readFile(RUNNER_PATH);
    expect(src).not.toContain('conv_help_escalated');
  });

  it('SG-32: runner no introduce WEAK_MATCH como estado válido', () => {
    const src = readFile(RUNNER_PATH);
    // WEAK_MATCH puede aparecer en comentarios de lista de prohibidos, pero no como valor aceptado
    // El runner no debe tratarlo como nivel válido de identidad
    expect(src).not.toMatch(/identity_level.*WEAK_MATCH/);
    expect(src).not.toMatch(/WEAK_MATCH.*identity_level/);
  });

  it('SG-33: runner no introduce UNVERIFIED standalone como estado válido', () => {
    const src = readFile(RUNNER_PATH);
    expect(src).not.toMatch(/'UNVERIFIED'[^_]/);
    expect(src).not.toContain('"UNVERIFIED"');
  });

  it('SG-34: runner no introduce next_retry_at ni attempt_count', () => {
    const src = readFile(RUNNER_PATH);
    expect(src).not.toContain('next_retry_at');
    expect(src).not.toContain('attempt_count');
  });

  it('SG-35: plan y checklist no introducen términos de arquitectura prohibidos', () => {
    const plan      = readFile(PLAN_PATH);
    const checklist = readFile(CHECKLIST_PATH);
    const combined  = plan + checklist;
    expect(combined).not.toContain('WF-02');
    expect(combined).not.toContain('conv_help_escalated');
    expect(combined).not.toContain('next_retry_at');
    expect(combined).not.toContain('attempt_count');
  });

  it('SG-36: core-http-client mantiene CORE_INTEGRATION_MODE=mock como default', () => {
    const src = readFile(HTTP_CLIENT_PATH);
    // El modo mock es el fallback explícito
    expect(src).toContain("?? 'mock'");
    // La rama mock devuelve sin hacer fetch
    expect(src).toContain("mode === 'mock'");
    expect(src).toContain("error_code: 'MOCK_MODE'");
    // No hay referencia a producción hardcodeada
    expect(src).not.toMatch(/CORE_BASE_URL\s*=\s*['"]https?:\/\//);
  });
});
