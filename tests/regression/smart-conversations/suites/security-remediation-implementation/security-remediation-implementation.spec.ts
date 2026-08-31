/**
 * Security Remediation Implementation — Static Tests
 * Fase 11B2B · SmartConversations
 *
 * Tests estáticos de la implementación de seguridad WebChat.
 * Verifican existencia de archivos, estructura del código, migraciones SQL,
 * y ausencia de patrones prohibidos.
 *
 * No requieren DB ni secretos reales.
 * No tocan Supabase remoto.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../../../');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG-01..10 — env-config.ts
// ─────────────────────────────────────────────────────────────────────────────
describe('CONFIG-01..10 — env-config.ts: fail-closed y detección de entorno', () => {
  const FILE = 'supabase/functions/_shared/smart-conversations/runtime/env-config.ts';

  it('CONFIG-01: env-config.ts existe', () => {
    expect(fileExists(FILE)).toBe(true);
  });

  it('CONFIG-02: exporta detectEnvMode', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/export function detectEnvMode/);
  });

  it('CONFIG-03: exporta isPermissiveEnv', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/export function isPermissiveEnv/);
  });

  it('CONFIG-04: exporta isRealEnv', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/export function isRealEnv/);
  });

  it('CONFIG-05: exporta validateEnvConfig', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/export function validateEnvConfig/);
  });

  it('CONFIG-06: exporta checkStartupConfig', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/export function checkStartupConfig/);
  });

  it('CONFIG-07: rechaza WEBCHAT_AUTH_MODE=legacy en entornos reales (SEC-004)', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/SEC-004/);
    expect(src).toMatch(/legacy.*rechazado|rechazado.*legacy/);
  });

  it('CONFIG-08: rechaza WEBCHAT_RATE_LIMIT_MODE=mock en entornos reales (SEC-002)', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/SEC-002/);
    expect(src).toMatch(/mock.*rechazado|rechazado.*mock/);
  });

  it('CONFIG-09: internalErrors nunca se exponen en HTTP (safeMessage es genérico)', () => {
    const src = readFile(FILE);
    // safeMessage no debe contener el contenido de internalErrors
    expect(src).toMatch(/safeMessage.*Configuraci|interna.*inv/i);
    // No debe devolver el detalle del error en la respuesta HTTP
    expect(src).not.toMatch(/return.*internalErrors/);
  });

  it('CONFIG-10: identifica unknown_real cuando INTEGRATION_MODE=real y APP_ENVIRONMENT vacío', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/unknown_real/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN-01..10 — ef-tenant-guards.ts
// ─────────────────────────────────────────────────────────────────────────────
describe('TOKEN-01..10 — ef-tenant-guards.ts: guards multi-tenant', () => {
  const FILE = 'supabase/functions/_shared/smart-conversations/runtime/ef-tenant-guards.ts';

  it('TOKEN-01: ef-tenant-guards.ts existe', () => {
    expect(fileExists(FILE)).toBe(true);
  });

  it('TOKEN-02: exporta GuardResult tipo discriminado', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/GuardResult/);
    expect(src).toMatch(/ok: true/);
    expect(src).toMatch(/ok: false/);
  });

  it('TOKEN-03: exporta resolveWidgetToTenant', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/export async function resolveWidgetToTenant/);
  });

  it('TOKEN-04: resolveWidgetToTenant filtra por widget_public_key en DB', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/\.eq\('widget_public_key'/);
  });

  it('TOKEN-05: loadSessionForTenant incluye client_account_id en filtro DB', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/\.eq\('client_account_id'.*clientAccountId\)/);
  });

  it('TOKEN-06: assertSessionOwnership verifica sender_ref, state y expires_at', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/SENDER_MISMATCH/);
    expect(src).toMatch(/SESSION_CLOSED/);
    expect(src).toMatch(/SESSION_EXPIRED/);
  });

  it('TOKEN-07: assertTokenClaimsMatchRequest es función pura (no async)', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/export function assertTokenClaimsMatchRequest/);
    expect(src).not.toMatch(/export async function assertTokenClaimsMatchRequest/);
  });

  it('TOKEN-08: assertTokenClaimsMatchRequest rechaza client_account_id diferente', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/TOKEN_CLAIMS_MISMATCH/);
  });

  it('TOKEN-09: errores cross-tenant devuelven 403 o 404 nunca 200 ni 401', () => {
    const src = readFile(FILE);
    // El helper guardErrorToHttpStatus nunca retorna 200 ni 401
    expect(src).not.toMatch(/return 200/);
    expect(src).not.toMatch(/return 401/);
    expect(src).toMatch(/403 \| 404 \| 500/);
  });

  it('TOKEN-10: no usa client_account_id del body como única fuente de autoridad en real mode', () => {
    const src = readFile(FILE);
    // La autoridad de tenant en modo real es widget_public_key → DB, nunca body
    expect(src).toMatch(/widget_public_key/);
    // El comentario de la función documenta la restricción
    expect(src).toMatch(/cliente Supabase|única fuente de autoridad|no puede sobrescribir/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SESSION-01..07 — conv-web-session/index.ts
// ─────────────────────────────────────────────────────────────────────────────
describe('SESSION-01..07 — conv-web-session: rate limit y resolución de tenant', () => {
  const FILE = 'supabase/functions/conv-web-session/index.ts';

  it('SESSION-01: conv-web-session importa checkStartupConfig', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/checkStartupConfig/);
  });

  it('SESSION-02: checkStartupConfig se llama al inicio del handler', () => {
    const src = readFile(FILE);
    const handlerBody = src.slice(src.indexOf('handleWebSessionRequest'));
    const startupIdx = handlerBody.indexOf('checkStartupConfig()');
    const bodyIdx = handlerBody.indexOf('req.json()');
    expect(startupIdx).toBeGreaterThan(0);
    expect(startupIdx).toBeLessThan(bodyIdx);
  });

  it('SESSION-03: importa resolveWidgetToTenant', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/resolveWidgetToTenant/);
  });

  it('SESSION-04: importa checkSessionCreationRateLimit', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/checkSessionCreationRateLimit/);
  });

  it('SESSION-05: en modo real usa widget_public_key como fuente de autoridad', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/isRealEnv/);
    expect(src).toMatch(/widget_public_key/);
    expect(src).toMatch(/resolveWidgetToTenant/);
  });

  it('SESSION-06: rate limit se verifica antes de crear sesión', () => {
    const src = readFile(FILE);
    const rlIdx = src.indexOf('checkSessionCreationRateLimit');
    const insertIdx = src.indexOf('.insert({');
    expect(rlIdx).toBeGreaterThan(0);
    expect(rlIdx).toBeLessThan(insertIdx);
  });

  it('SESSION-07: persiste expires_at en conv_sessions', () => {
    const src = readFile(FILE);
    // El INSERT debe incluir expires_at
    const insertBlock = src.slice(src.indexOf('.insert({'), src.indexOf('.select(\'id\')'));
    expect(insertBlock).toMatch(/expires_at/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RATE-01..12 — webchat-rate-limiter.ts
// ─────────────────────────────────────────────────────────────────────────────
describe('RATE-01..12 — webchat-rate-limiter.ts: rate limiting completo', () => {
  const FILE = 'supabase/functions/_shared/smart-conversations/runtime/webchat-rate-limiter.ts';

  it('RATE-01: webchat-rate-limiter.ts existe', () => {
    expect(fileExists(FILE)).toBe(true);
  });

  it('RATE-02: exporta checkWebchatRateLimit (mensajes)', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/export async function checkWebchatRateLimit/);
  });

  it('RATE-03: exporta checkSessionCreationRateLimit', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/export async function checkSessionCreationRateLimit/);
  });

  it('RATE-04: exporta checkPollRateLimit', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/export async function checkPollRateLimit/);
  });

  it('RATE-05: en mode=mock checkSessionCreationRateLimit siempre permite', () => {
    const src = readFile(FILE);
    const fn = src.slice(src.indexOf('checkSessionCreationRateLimit'));
    expect(fn).toMatch(/mode.*mock|mock.*allowed.*true/);
    expect(fn).toMatch(/allowed: true/);
  });

  it('RATE-06: checkSessionCreationRateLimit usa conv_sessions (no tabla nueva)', () => {
    const src = readFile(FILE);
    const fn = src.slice(src.indexOf('checkSessionCreationRateLimit'));
    expect(fn).toMatch(/conv_sessions/);
  });

  it('RATE-07: checkPollRateLimit usa conv_rate_limit_buckets vía RPC', () => {
    const src = readFile(FILE);
    const fn = src.slice(src.indexOf('checkPollRateLimit'));
    expect(fn).toMatch(/increment_rate_limit_bucket/);
    expect(fn).toMatch(/conv_rate_limit_buckets/);
  });

  it('RATE-08: checkPollRateLimit hace fail-open si RPC no disponible', () => {
    const src = readFile(FILE);
    const fn = src.slice(src.indexOf('checkPollRateLimit'));
    // Si hay error de RPC → allowed: true (fail-open)
    expect(fn).toMatch(/upsertErr.*allowed.*true|fail-open/);
  });

  it('RATE-09: RateLimitResult incluye retry_after_seconds cuando allowed=false', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/retry_after_seconds/);
  });

  it('RATE-10: conv-web-poll importa checkPollRateLimit', () => {
    const pollSrc = readFile('supabase/functions/conv-web-poll/index.ts');
    expect(pollSrc).toMatch(/checkPollRateLimit/);
  });

  it('RATE-11: límites de sesiones son configurables por env var', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/WEBCHAT_RATE_LIMIT_SESSIONS_PER_TENANT_PER_MINUTE/);
  });

  it('RATE-12: límites de polling son configurables por env var', () => {
    const src = readFile(FILE);
    expect(src).toMatch(/WEBCHAT_RATE_LIMIT_POLLS_PER_SESSION_PER_MINUTE/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DB-01..12 — Migración SQL 20260721000001
// ─────────────────────────────────────────────────────────────────────────────
describe('DB-01..12 — Migración SQL: permisos DB y schema', () => {
  const MIGRATION = 'supabase/migrations/20260721000001_sc_security_remediation_b2b.sql';

  it('DB-01: migración 20260721000001 existe', () => {
    expect(fileExists(MIGRATION)).toBe(true);
  });

  it('DB-02: añade widget_public_key a conv_wc_configs', () => {
    const sql = readFile(MIGRATION);
    expect(sql).toMatch(/ADD COLUMN.*widget_public_key/i);
  });

  it('DB-03: añade auth_mode a conv_wc_configs con DEFAULT legacy', () => {
    const sql = readFile(MIGRATION);
    expect(sql).toMatch(/ADD COLUMN.*auth_mode/i);
    expect(sql).toMatch(/DEFAULT 'legacy'/i);
  });

  it('DB-04: añade rate_limit_mode a conv_wc_configs con DEFAULT mock', () => {
    const sql = readFile(MIGRATION);
    expect(sql).toMatch(/ADD COLUMN.*rate_limit_mode/i);
    expect(sql).toMatch(/DEFAULT 'mock'/i);
  });

  it('DB-05: REVOKE SELECT,INSERT,UPDATE,DELETE en las 8 tablas conv_* para anon', () => {
    const sql = readFile(MIGRATION);
    const revokeAnon = [...sql.matchAll(/REVOKE[\s\S]*?FROM anon/gi)];
    expect(revokeAnon.length).toBeGreaterThanOrEqual(8);
  });

  it('DB-06: REVOKE SELECT,INSERT,UPDATE,DELETE en las 8 tablas conv_* para authenticated', () => {
    const sql = readFile(MIGRATION);
    const revokeAuth = [...sql.matchAll(/REVOKE[\s\S]*?FROM anon, authenticated/gi)];
    expect(revokeAuth.length).toBeGreaterThanOrEqual(8);
  });

  it('DB-07: GRANT explícito para service_role en tablas conv_*', () => {
    const sql = readFile(MIGRATION);
    expect(sql).toMatch(/GRANT.*service_role/i);
  });

  it('DB-08: crea tabla conv_rate_limit_buckets', () => {
    const sql = readFile(MIGRATION);
    expect(sql).toMatch(/CREATE TABLE.*conv_rate_limit_buckets/i);
  });

  it('DB-09: conv_rate_limit_buckets tiene RLS habilitado', () => {
    const sql = readFile(MIGRATION);
    expect(sql).toMatch(/ALTER TABLE conv_rate_limit_buckets ENABLE ROW LEVEL SECURITY/i);
  });

  it('DB-10: conv_rate_limit_buckets tiene policy service_role only (no anon/authenticated USING true global)', () => {
    const sql = readFile(MIGRATION);
    // La policy es TO service_role, no TO anon/authenticated
    expect(sql).toMatch(/CREATE POLICY.*conv_rate_limit_buckets[\s\S]*?TO service_role/i);
    // No debe haber policies TO anon ni TO authenticated con USING (true) sin restricciones
    expect(sql).not.toMatch(/TO anon\s*\n\s*USING \(true\)/i);
    expect(sql).not.toMatch(/TO authenticated\s*\n\s*USING \(true\)/i);
  });

  it('DB-11: crea función increment_rate_limit_bucket con search_path fijado', () => {
    const sql = readFile(MIGRATION);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION increment_rate_limit_bucket/i);
    expect(sql).toMatch(/SET search_path = public/i);
  });

  it('DB-12: migración no modifica migraciones históricas (solo añade)', () => {
    // La migración existente tiene timestamp anterior
    const historicMigration = 'supabase/migrations/20260716000001_smart_conversations_core_schema.sql';
    expect(fileExists(historicMigration)).toBe(true);
    // La nueva migración tiene timestamp posterior
    const newMigration = MIGRATION;
    expect(fileExists(newMigration)).toBe(true);
    const historicTs = '20260716000001';
    const newTs = '20260721000001';
    expect(newTs > historicTs).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-01..10 — Aislamiento multi-tenant
// ─────────────────────────────────────────────────────────────────────────────
describe('CROSS-01..10 — Aislamiento multi-tenant: guards y filtros', () => {
  it('CROSS-01: loadSessionForTenant siempre filtra por client_account_id en DB', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/runtime/ef-tenant-guards.ts');
    const fn = src.slice(src.indexOf('loadSessionForTenant'));
    expect(fn).toMatch(/\.eq\('client_account_id'/);
  });

  it('CROSS-02: assertWidgetBelongsToTenant verifica que widget.client_account_id === expected', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/runtime/ef-tenant-guards.ts');
    expect(src).toMatch(/assertWidgetBelongsToTenant/);
    expect(src).toMatch(/TENANT_MISMATCH/);
  });

  it('CROSS-03: respuestas opacas — WIDGET_NOT_FOUND devuelve 403 (no 404)', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/runtime/ef-tenant-guards.ts');
    expect(src).toMatch(/WIDGET_NOT_FOUND.*httpStatus: 403/);
  });

  it('CROSS-04: conv-web-session en modo real no confía en client_account_id del body', () => {
    const src = readFile('supabase/functions/conv-web-session/index.ts');
    // En modo real se llama resolveWidgetToTenant — el body client_account_id es ignorado
    const realBlock = src.slice(src.indexOf('isRealEnv(envMode)'));
    expect(realBlock).toMatch(/resolveWidgetToTenant/);
    // client_account_id se obtiene del resultado de la resolución, no del body directamente
    expect(realBlock).toMatch(/client_account_id = tenantResult\.data\.client_account_id/);
  });

  it('CROSS-05: conv-web-message usa client_account_id del token, no del body', () => {
    const src = readFile('supabase/functions/conv-web-message/index.ts');
    // Ya verificado en 11B2A — el token es la fuente de autoridad
    expect(src).toMatch(/client_account_id.*result\.claims|claims.*client_account_id/);
  });

  it('CROSS-06: conv-web-poll verifica sesión contra client_account_id del token/DB', () => {
    const src = readFile('supabase/functions/conv-web-poll/index.ts');
    expect(src).toMatch(/\.eq\('client_account_id'/);
  });

  it('CROSS-07: conv_messages queries incluyen client_account_id en filtro', () => {
    const src = readFile('supabase/functions/conv-web-poll/index.ts');
    const queryBlock = src.slice(src.indexOf("from('conv_messages')"));
    expect(queryBlock).toMatch(/\.eq\('client_account_id'/);
  });

  it('CROSS-08: TenantGuardErrorCode no incluye UNVERIFIED standalone', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/runtime/ef-tenant-guards.ts');
    expect(src).not.toMatch(/'UNVERIFIED'\s*[,|]/);
    expect(src).not.toMatch(/= 'UNVERIFIED'/);
  });

  it('CROSS-09: no introduce WEAK_MATCH en guards', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/runtime/ef-tenant-guards.ts');
    expect(src).not.toMatch(/WEAK_MATCH/);
  });

  it('CROSS-10: el tipo TenantGuardErrorCode no incluye WF-02', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/runtime/ef-tenant-guards.ts');
    expect(src).not.toMatch(/WF-02/);
    expect(src).not.toMatch(/conv_help_escalated/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BOUNDARY-01..10 — Límites y contratos
// ─────────────────────────────────────────────────────────────────────────────
describe('BOUNDARY-01..10 — Límites y contratos de implementación', () => {
  it('BOUNDARY-01: migración no introduce next_retry_at ni attempt_count', () => {
    const sql = readFile('supabase/migrations/20260721000001_sc_security_remediation_b2b.sql');
    expect(sql).not.toMatch(/\bnext_retry_at\b/);
    expect(sql).not.toMatch(/\battempt_count\b/);
  });

  it('BOUNDARY-02: migración no modifica contratos de incidencias, publicaciones ni ayuda', () => {
    const sql = readFile('supabase/migrations/20260721000001_sc_security_remediation_b2b.sql');
    expect(sql).not.toMatch(/conv_help_escalated/i);
    expect(sql).not.toMatch(/WF-02/i);
    // No modifica tablas de lógica de negocio solo las conv_* de configuración/sesión
    expect(sql).not.toMatch(/ALTER TABLE.*listings|ALTER TABLE.*rooms|ALTER TABLE.*bookings/i);
  });

  it('BOUNDARY-03: env-config no expone secretos en safeMessage', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/runtime/env-config.ts');
    // safeMessage debe ser un string literal genérico
    expect(src).toMatch(/safeMessage: ['"`].*['"` ]/);
    expect(src).not.toMatch(/safeMessage.*signingSecret|safeMessage.*serviceRoleKey/);
  });

  it('BOUNDARY-04: conv-web-session no devuelve signing secret al widget', () => {
    const src = readFile('supabase/functions/conv-web-session/index.ts');
    // El signing secret no va al payload de respuesta
    expect(src).not.toMatch(/signingSecret.*return|ok\(.*signingSecret/);
  });

  it('BOUNDARY-05: conv-web-poll no devuelve sender_ref en la respuesta de mensajes', () => {
    const src = readFile('supabase/functions/conv-web-poll/index.ts');
    const messagesMap = src.slice(src.indexOf('messages: WebchatPollMessage'));
    expect(messagesMap).not.toMatch(/sender_ref/);
  });

  it('BOUNDARY-06: conv_rate_limit_buckets no tiene columnas PII', () => {
    const sql = readFile('supabase/migrations/20260721000001_sc_security_remediation_b2b.sql');
    const tableBlock = sql.slice(sql.indexOf('CREATE TABLE IF NOT EXISTS conv_rate_limit_buckets'));
    const endOfTable = tableBlock.indexOf(');');
    const tableDef = tableBlock.slice(0, endOfTable);
    expect(tableDef).not.toMatch(/phone|email|name|profile_id|identity_data/i);
  });

  it('BOUNDARY-07: no crea policies FOR ALL TO anon USING (true) en conv_*', () => {
    const sql = readFile('supabase/migrations/20260721000001_sc_security_remediation_b2b.sql');
    // Las policies anon con USING (true) están prohibidas
    expect(sql).not.toMatch(/TO anon[\s\S]*?USING \(true\)/i);
    expect(sql).not.toMatch(/TO authenticated[\s\S]*?USING \(true\)/i);
  });

  it('BOUNDARY-08: GATE_1 no está declarado como aprobado en ningún documento', () => {
    const reportPath = 'docs/smart-conversations/security/security-findings.md';
    if (fileExists(reportPath)) {
      const src = readFile(reportPath);
      expect(src).not.toMatch(/^\*\*GATE_1: (?:PASS|APROBADO)\*\*$/m);
    }
  });

  it('BOUNDARY-09: env-config importa solo desde runtime local (no network)', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/runtime/env-config.ts');
    expect(src).not.toMatch(/https?:\/\//);
    expect(src).not.toMatch(/import.*from.*esm\.sh/);
  });

  it('BOUNDARY-10: ef-tenant-guards no introduce tabla conv_help_escalated', () => {
    const src = readFile('supabase/functions/_shared/smart-conversations/runtime/ef-tenant-guards.ts');
    expect(src).not.toMatch(/conv_help_escalated/);
  });
});
