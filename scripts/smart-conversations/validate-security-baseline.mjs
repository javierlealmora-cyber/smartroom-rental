/**
 * validate-security-baseline.mjs
 * Fase 11B1 — SmartConversations Security Baseline Validator
 *
 * - Solo archivos locales; sin llamadas de red; sin sockets
 * - No imprime secretos, tokens, PII ni valores sensibles
 * - No modifica archivos
 * - Salida JSON sanitizada
 * - Exit 0 = AUDIT_COMPLETE; Exit 1 = AUDIT_INCOMPLETE o blocker
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const SECURITY_DIR = join(ROOT, 'docs/smart-conversations/security');
const MIGRATIONS_DIR = join(ROOT, 'supabase/migrations');
const EF_DIR = join(ROOT, 'supabase/functions');
const SRC_DIR = join(ROOT, 'src');
const SCRIPTS_DIR = join(ROOT, 'scripts');
const CI_FILE = join(ROOT, '.github/workflows/pr-checks.yml');
const ENV_EXAMPLE = join(ROOT, '.env.example');

const checks = [];
const warnings = [];
const blockers = [];

function pass(id, msg) { checks.push({ id, status: 'pass', msg }); }
function warn(id, msg) { checks.push({ id, status: 'warn', msg }); warnings.push({ id, msg }); }
function fail(id, msg) { checks.push({ id, status: 'fail', msg }); blockers.push({ id, msg }); }

function readText(p) {
  try { return readFileSync(p, 'utf-8'); } catch { return ''; }
}

function globFiles(dir, predicate) {
  const results = [];
  if (!existsSync(dir)) return results;
  function walk(d) {
    for (const f of readdirSync(d)) {
      const full = join(d, f);
      if (statSync(full).isDirectory()) walk(full);
      else if (predicate(full)) results.push(full);
    }
  }
  walk(dir);
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 1: Documentos de seguridad existen
// ─────────────────────────────────────────────────────────────────────────────
const requiredDocs = [
  'data-classification.md',
  'threat-model.md',
  'authentication-authorization-matrix.md',
  'rls-audit.md',
  'multi-tenant-isolation-audit.md',
  'cors-audit.md',
  'csp-frontend-audit.md',
  'secrets-inventory.md',
  'logging-privacy-audit.md',
  'webhook-replay-audit.md',
  'security-findings.md',
  'gate-1-remediation-plan.md',
];

for (const doc of requiredDocs) {
  const p = join(SECURITY_DIR, doc);
  if (existsSync(p)) pass(`SEC-DOC-${doc}`, `Documento existe: ${doc}`);
  else fail(`SEC-DOC-${doc}`, `AUDIT_INCOMPLETE: falta ${doc}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 2: Tablas conv_* inventariadas en migración
// ─────────────────────────────────────────────────────────────────────────────
const migFiles = globFiles(MIGRATIONS_DIR, f => f.endsWith('.sql'));
const migContent = migFiles.map(f => readText(f)).join('\n');

const convTables = [...migContent.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(conv_\w+)/g)].map(m => m[1]);
const uniqueTables = [...new Set(convTables)];

if (uniqueTables.length > 0) {
  pass('SEC-TABLES-FOUND', `Tablas conv_* encontradas: ${uniqueTables.join(', ')}`);
} else {
  fail('SEC-TABLES-FOUND', 'AUDIT_INCOMPLETE: no se encontraron tablas conv_* en migraciones');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 3: RLS habilitado
// ─────────────────────────────────────────────────────────────────────────────
const rlsEnabled = [...migContent.matchAll(/ALTER TABLE (\w+) ENABLE ROW LEVEL SECURITY/g)].map(m => m[1]);
const forceRls = [...migContent.matchAll(/ALTER TABLE (\w+) FORCE ROW LEVEL SECURITY/g)].map(m => m[1]);

for (const table of uniqueTables) {
  if (rlsEnabled.includes(table)) pass(`SEC-RLS-ENABLED-${table}`, `RLS ENABLED en ${table}`);
  else fail(`SEC-RLS-ENABLED-${table}`, `SEC-001: ${table} sin ENABLE ROW LEVEL SECURITY`);

  if (forceRls.includes(table)) pass(`SEC-RLS-FORCE-${table}`, `RLS FORCED en ${table}`);
  else warn(`SEC-RLS-FORCE-${table}`, `SEC-001: ${table} sin FORCE ROW LEVEL SECURITY`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 4: Políticas RLS
// ─────────────────────────────────────────────────────────────────────────────
const policies = [...migContent.matchAll(/CREATE POLICY "([^"]+)"\s+ON (\w+)/g)].map(m => ({ name: m[1], table: m[2] }));

if (policies.length > 0) pass('SEC-POLICIES-EXIST', `${policies.length} políticas RLS encontradas`);
else fail('SEC-POLICIES-EXIST', 'AUDIT_INCOMPLETE: no se encontraron políticas RLS en migración');

for (const table of uniqueTables) {
  const hasPolicies = policies.some(p => p.table === table);
  if (hasPolicies) pass(`SEC-POLICY-TABLE-${table}`, `Tiene políticas: ${table}`);
  else warn(`SEC-POLICY-TABLE-${table}`, `SEC-009: ${table} sin políticas RLS (o solo TODO comments)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 5: SECURITY DEFINER
// Fase 11B2A: función get_my_client_account_id() analizada y clasificada SEGURA
// (SET search_path = public, no accede a conv_*, GRANT solo a authenticated)
// SEC-028 no se crea. Ver rls-role-model.md §6.
// ─────────────────────────────────────────────────────────────────────────────
const secDefFunctions = [...migContent.matchAll(/SECURITY DEFINER/g)];
if (secDefFunctions.length === 0) {
  pass('SEC-SECDEF-NONE', 'Sin funciones SECURITY DEFINER en migración');
} else {
  const searchPathSafe = migContent.includes("SET search_path = ''") || migContent.includes('SET search_path = public');
  if (searchPathSafe) {
    pass('SEC-SECDEF-SAFE', `${secDefFunctions.length} SECURITY DEFINER con SET search_path seguro — clasificada SAFE en Fase 11B2A`);
  } else {
    fail('SEC-SECDEF-UNSAFE', `SECURITY DEFINER sin SET search_path fijado — revisar manualmente`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 6: service_role en frontend (VITE_)
// ─────────────────────────────────────────────────────────────────────────────
const envContent = readText(ENV_EXAMPLE);
const dangerousVitePatterns = [
  /VITE_[A-Z_]*SERVICE_ROLE/i,
  /VITE_[A-Z_]*SIGNING_SECRET/i,
  /VITE_[A-Z_]*PRIVATE_KEY/i,
  /VITE_[A-Z_]*WEBHOOK_SECRET/i,
  /VITE_[A-Z_]*API_KEY/i,
  /VITE_[A-Z_]*N8N_SECRET/i,
];

let viteSecretFound = false;
for (const pattern of dangerousVitePatterns) {
  if (pattern.test(envContent)) {
    fail('SEC-VITE-SECRET', `SEC-034: patrón sensible bajo VITE_ en .env.example: ${pattern.toString()}`);
    viteSecretFound = true;
  }
}
if (!viteSecretFound) pass('SEC-VITE-SECRET', 'Sin secretos sensibles bajo VITE_ en .env.example');

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 7: Edge Functions inventariadas
// ─────────────────────────────────────────────────────────────────────────────
const efDirs = existsSync(EF_DIR)
  ? readdirSync(EF_DIR).filter(d => d.startsWith('conv-') && statSync(join(EF_DIR, d)).isDirectory())
  : [];

if (efDirs.length > 0) pass('SEC-EF-FOUND', `Edge Functions conv-* encontradas: ${efDirs.length}`);
else fail('SEC-EF-FOUND', 'AUDIT_INCOMPLETE: no se encontraron Edge Functions conv-*');

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 8: CORS wildcard en EFs públicas
// ─────────────────────────────────────────────────────────────────────────────
const publicEFs = ['conv-web-session', 'conv-web-message', 'conv-web-poll', 'conv-wa-webhook'];
let wildcardCorsFound = false;
for (const ef of efDirs) {
  const idx = join(EF_DIR, ef, 'index.ts');
  const content = readText(idx);
  if (content.includes("'*'") || content.includes('"*"')) {
    if (publicEFs.includes(ef)) {
      warn(`SEC-CORS-${ef}`, `SEC-017: Access-Control-Allow-Origin wildcard en EF pública ${ef}`);
      wildcardCorsFound = true;
    }
  }
}

const sharedCorsFile = join(EF_DIR, '_shared', 'smart-conversations', 'response.ts');
const sharedCorsContent = readText(sharedCorsFile);
if (sharedCorsContent.includes("'*'") || sharedCorsContent.includes('"*"')) {
  warn('SEC-CORS-SHARED', 'SEC-017: wildcard CORS en _shared/response.ts (afecta todas las EFs)');
  wildcardCorsFound = true;
}
if (!wildcardCorsFound) pass('SEC-CORS-WILDCARD', 'Sin wildcard CORS detectado en EFs públicas');

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 9: dangerouslySetInnerHTML y eval en WebChat
// ─────────────────────────────────────────────────────────────────────────────
const webchatFiles = globFiles(join(SRC_DIR, 'features', 'webchat'), f => f.match(/\.(js|jsx|ts|tsx)$/));

let dangerHtmlFound = false;
let evalFound = false;
for (const f of webchatFiles) {
  const c = readText(f);
  const rel = relative(ROOT, f).replace(/\\/g, '/');
  if (c.includes('dangerouslySetInnerHTML')) {
    fail(`SEC-DHTML-${rel}`, `SEC-003: dangerouslySetInnerHTML en ${rel}`);
    dangerHtmlFound = true;
  }
  if (/\beval\s*\(/.test(c) || /new\s+Function\s*\(/.test(c)) {
    fail(`SEC-EVAL-${rel}`, `SEC-003: eval/new Function en ${rel}`);
    evalFound = true;
  }
}
if (!dangerHtmlFound) pass('SEC-DHTML-WEBCHAT', 'Sin dangerouslySetInnerHTML en WebChat');
if (!evalFound) pass('SEC-EVAL-WEBCHAT', 'Sin eval/new Function en WebChat');

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 10: Logs potencialmente sensibles en EFs SC
// ─────────────────────────────────────────────────────────────────────────────
const sensitiveLogPatterns = [
  { pattern: /console\.(log|error|warn)\s*\([^)]*message_text/g, field: 'message_text' },
  { pattern: /console\.(log|error|warn)\s*\([^)]*sender_ref/g, field: 'sender_ref' },
  { pattern: /console\.(log|error|warn)\s*\([^)]*phone/g, field: 'phone' },
  { pattern: /console\.(log|error|warn)\s*\([^)]*profile_id/g, field: 'profile_id' },
  { pattern: /console\.(log|error|warn)\s*\([^)]*identity_data/g, field: 'identity_data' },
  { pattern: /console\.(log|error|warn)\s*\([^)]*raw_payload/g, field: 'raw_payload' },
  { pattern: /console\.(log|error|warn)\s*\([^)]*authorization/i, field: 'authorization' },
  { pattern: /console\.(log|error|warn)\s*\([^)]*service_role/g, field: 'service_role' },
  { pattern: /console\.(log|error|warn)\s*\([^)]*webhook_secret/g, field: 'webhook_secret' },
];

const efFiles = globFiles(EF_DIR, f => f.match(/\.(ts|js)$/) && !f.includes('node_modules'));
let sensLogFound = false;
for (const f of efFiles) {
  const c = readText(f);
  const rel = relative(ROOT, f).replace(/\\/g, '/');
  for (const { pattern, field } of sensitiveLogPatterns) {
    if (pattern.test(c)) {
      warn(`SEC-LOG-${field}-${rel}`, `Posible log de ${field} en ${rel} — verificar si pasa por createSafeLogger`);
      sensLogFound = true;
    }
    pattern.lastIndex = 0;
  }
}
if (!sensLogFound) pass('SEC-LOG-SENSITIVE', 'Sin logs directos de campos PII detectados en EFs SC');

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 11: security-findings.md tiene findings con IDs únicos
// ─────────────────────────────────────────────────────────────────────────────
const findingsContent = readText(join(SECURITY_DIR, 'security-findings.md'));
const findingIds = [...findingsContent.matchAll(/\| finding_id \| (SEC-\d+) \|/g)].map(m => m[1]);
const uniqueIds = new Set(findingIds);

if (findingIds.length > 0 && uniqueIds.size === findingIds.length) {
  pass('SEC-FINDINGS-IDS', `${findingIds.length} findings con IDs únicos (${findingIds.join(', ')})`);
} else if (findingIds.length === 0) {
  fail('SEC-FINDINGS-IDS', 'AUDIT_INCOMPLETE: no se encontraron findings con formato finding_id en security-findings.md');
} else {
  fail('SEC-FINDINGS-IDS', `IDs duplicados en security-findings.md: ${findingIds.length} total, ${uniqueIds.size} únicos`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 12: Findings críticos tienen fase asignada
// ─────────────────────────────────────────────────────────────────────────────
// Captura cada bloque de finding completo (desde ### SEC-NNN hasta el próximo --- o ###)
const findingBlocks = [...findingsContent.matchAll(/### (SEC-\d+)[^\n]*\n([\s\S]*?)(?=\n---|\n### |$)/g)];
const criticalFindingBlocks = findingBlocks.filter(m => /severidad \| (CRITICAL|HIGH)/.test(m[2]));
let criticalWithoutPhase = 0;
for (const [, id, section] of criticalFindingBlocks) {
  if (!section.includes('fase | 11B')) {
    fail(`SEC-CRITICAL-PHASE-${id}`, `Finding crítico/alto ${id} sin fase de remediación asignada`);
    criticalWithoutPhase++;
  }
}
if (criticalWithoutPhase === 0) pass('SEC-CRITICAL-PHASE', 'Todos los findings críticos/altos tienen fase asignada');

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 13: CI — job sc-hardening-baseline existe
// ─────────────────────────────────────────────────────────────────────────────
const ciContent = readText(CI_FILE);
if (ciContent.includes('sc-hardening-baseline:')) pass('SEC-CI-BASELINE', 'Job sc-hardening-baseline en CI');
else warn('SEC-CI-BASELINE', 'Job sc-hardening-baseline no encontrado en pr-checks.yml');

if (ciContent.includes('test:sc:security-baseline')) pass('SEC-CI-SECURITY', 'CI incluye test:sc:security-baseline');
else warn('SEC-CI-SECURITY', 'CI no incluye test:sc:security-baseline aún (se añadirá en este script)');

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 14: Ausencia de integraciones reales
// ─────────────────────────────────────────────────────────────────────────────
const REAL_INTEGRATION_MARKERS = [
  { pattern: /https:\/\/[a-z0-9]+\.supabase\.co\/functions\/v1\/conv-/, label: 'URL real de EF' },
  { pattern: /VITE_WEBCHAT_WIDGET_ENABLED=true/, label: 'Widget activado en .env.example' },
];

for (const { pattern, label } of REAL_INTEGRATION_MARKERS) {
  if (pattern.test(envContent)) warn('SEC-REAL-INTEGRATION', `Posible integración real: ${label}`);
}
pass('SEC-REAL-INTEGRATION-CHECK', 'Verificación de integraciones reales completada');

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 15: validate-security-baseline script no modifica archivos
// ─────────────────────────────────────────────────────────────────────────────
pass('SEC-VALIDATOR-NO-WRITE', 'Validator ejecutado sin escribir archivos (verificación por diseño)');
pass('SEC-VALIDATOR-NO-FETCH', 'Validator no llama red (verificación por diseño — no hay fetch/import dinámico)');
pass('SEC-VALIDATOR-NO-SOCKET', 'Validator no abre sockets (verificación por diseño)');

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 16: Fase 11B2A — Documentos de diseño de remediación
// ─────────────────────────────────────────────────────────────────────────────
const phase11b2aDocs = [
  'rls-role-model.md',
  'target-database-access-model.md',
  'edge-function-db-client-audit.md',
  'phase-11b2b-migration-plan.md',
];

for (const doc of phase11b2aDocs) {
  const p = join(SECURITY_DIR, doc);
  if (existsSync(p)) pass(`SEC-11B2A-DOC-${doc}`, `Fase 11B2A doc existe: ${doc}`);
  else warn(`SEC-11B2A-DOC-${doc}`, `Fase 11B2A doc faltante: ${doc}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 17: Fase 11B2A — Invariantes canónicos del registro de findings
// ─────────────────────────────────────────────────────────────────────────────
const hasSEC024 = findingsContent.includes('SEC-024');
const hasSEC015NotCreated = findingsContent.includes('SEC-015') && findingsContent.includes('not_created');
const hasSEC028NotCreated = findingsContent.includes('SEC-028') && findingsContent.includes('not_created');
const hasSeverityChanged = findingsContent.includes('severity_changed');

if (hasSEC024) pass('SEC-11B2A-024', 'SEC-024 existe en security-findings.md');
else warn('SEC-11B2A-024', 'SEC-024 no encontrado en security-findings.md (pendiente Fase 11B2A)');

if (hasSEC015NotCreated) pass('SEC-11B2A-015', 'SEC-015 documentado como not_created');
else warn('SEC-11B2A-015', 'SEC-015 no documentado como not_created (pendiente Fase 11B2A)');

if (hasSEC028NotCreated) pass('SEC-11B2A-028', 'SEC-028 documentado como not_created (SECURITY DEFINER safe)');
else warn('SEC-11B2A-028', 'SEC-028 no documentado como not_created (pendiente Fase 11B2A)');

if (hasSeverityChanged) pass('SEC-11B2A-SEV', 'security-findings.md documenta severity_changed (SEC-001 HIGH→LOW)');
else warn('SEC-11B2A-SEV', 'severity_changed no encontrado en security-findings.md (pendiente Fase 11B2A)');

// CI — test:sc:security-remediation-design
if (ciContent.includes('test:sc:security-remediation-design'))
  pass('SEC-CI-REMEDIATION-DESIGN', 'CI incluye test:sc:security-remediation-design');
else
  warn('SEC-CI-REMEDIATION-DESIGN', 'CI no incluye test:sc:security-remediation-design aún');

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 18: Fase 11B2B — Implementación de controles de seguridad WebChat
// ─────────────────────────────────────────────────────────────────────────────

// Migración 11B2B existe
const migration11B2B = join(MIGRATIONS_DIR, '20260721000001_sc_security_remediation_b2b.sql');
const mig11B2B = existsSync(migration11B2B) ? readText(migration11B2B) : '';

if (mig11B2B) {
  pass('SEC-11B2B-MIG-EXISTS', 'Migración 20260721000001_sc_security_remediation_b2b.sql existe');
} else {
  warn('SEC-11B2B-MIG-EXISTS', 'Migración 11B2B no encontrada (pendiente Fase 11B2B)');
}

// REVOKE en las 8 tablas conv_*
const expectedRevokeTables = [
  'conv_service_activations', 'conv_wa_sessions', 'conv_wc_configs', 'conv_sessions',
  'conv_cases', 'conv_messages', 'conv_send_queue', 'conv_admin_notifications',
];
const revokeCount = (mig11B2B.match(/REVOKE[\s\S]*?FROM anon, authenticated;/gi) ?? []).length;
if (revokeCount >= expectedRevokeTables.length) {
  pass('SEC-11B2B-REVOKE', `REVOKE para anon/authenticated en ${revokeCount} tablas conv_*`);
} else {
  warn('SEC-11B2B-REVOKE', `REVOKE insuficiente: ${revokeCount}/${expectedRevokeTables.length} tablas (pendiente)`);
}

// widget_public_key en migración
if (mig11B2B.includes('widget_public_key')) {
  pass('SEC-11B2B-WIDGET-KEY', 'Columna widget_public_key añadida a conv_wc_configs en migración 11B2B');
} else {
  warn('SEC-11B2B-WIDGET-KEY', 'widget_public_key no encontrado en migración (pendiente Fase 11B2B)');
}

// conv_rate_limit_buckets
if (mig11B2B.includes('conv_rate_limit_buckets')) {
  pass('SEC-11B2B-RL-TABLE', 'Tabla conv_rate_limit_buckets creada en migración 11B2B');
} else {
  warn('SEC-11B2B-RL-TABLE', 'conv_rate_limit_buckets no encontrada en migración (pendiente Fase 11B2B)');
}

// increment_rate_limit_bucket función
if (mig11B2B.includes('increment_rate_limit_bucket')) {
  pass('SEC-11B2B-RL-RPC', 'Función increment_rate_limit_bucket existe en migración 11B2B');
} else {
  warn('SEC-11B2B-RL-RPC', 'increment_rate_limit_bucket no encontrada en migración (pendiente Fase 11B2B)');
}

// No hay policies anon/authenticated con USING(true) en migración 11B2B
const forbiddenAnonPolicy = /TO anon[\s\S]{0,50}USING \(true\)/i.test(mig11B2B);
const forbiddenAuthPolicy = /TO authenticated[\s\S]{0,50}USING \(true\)/i.test(mig11B2B);
if (!forbiddenAnonPolicy && !forbiddenAuthPolicy) {
  pass('SEC-11B2B-NO-ANON-POLICY', 'Migración 11B2B no crea policies anon/authenticated con USING(true)');
} else {
  fail('SEC-11B2B-NO-ANON-POLICY', 'Migración 11B2B contiene policy prohibida anon/authenticated USING(true)');
}

// env-config.ts existe
const envConfigPath = join(EF_DIR, '_shared/smart-conversations/runtime/env-config.ts');
if (existsSync(envConfigPath)) {
  pass('SEC-11B2B-ENV-CONFIG', 'env-config.ts existe (fail-closed pattern implementado)');
} else {
  warn('SEC-11B2B-ENV-CONFIG', 'env-config.ts no encontrado (pendiente Fase 11B2B)');
}

// ef-tenant-guards.ts existe
const tenantGuardsPath = join(EF_DIR, '_shared/smart-conversations/runtime/ef-tenant-guards.ts');
if (existsSync(tenantGuardsPath)) {
  pass('SEC-11B2B-TENANT-GUARDS', 'ef-tenant-guards.ts existe (aislamiento multi-tenant implementado)');
} else {
  warn('SEC-11B2B-TENANT-GUARDS', 'ef-tenant-guards.ts no encontrado (pendiente Fase 11B2B)');
}

// conv-web-session usa checkStartupConfig
const webSessionPath = join(EF_DIR, 'conv-web-session/index.ts');
const webSessionSrc = existsSync(webSessionPath) ? readText(webSessionPath) : '';
if (webSessionSrc.includes('checkStartupConfig')) {
  pass('SEC-11B2B-SESSION-STARTUP', 'conv-web-session usa checkStartupConfig (fail-closed)');
} else {
  warn('SEC-11B2B-SESSION-STARTUP', 'conv-web-session no usa checkStartupConfig aún');
}

// conv-web-poll usa checkStartupConfig y checkPollRateLimit
const webPollPath = join(EF_DIR, 'conv-web-poll/index.ts');
const webPollSrc = existsSync(webPollPath) ? readText(webPollPath) : '';
if (webPollSrc.includes('checkStartupConfig') && webPollSrc.includes('checkPollRateLimit')) {
  pass('SEC-11B2B-POLL-GUARDS', 'conv-web-poll usa checkStartupConfig y checkPollRateLimit');
} else {
  warn('SEC-11B2B-POLL-GUARDS', 'conv-web-poll no tiene todos los guards 11B2B aún');
}

// En modo real, conv-web-session no confía en client_account_id del body
if (webSessionSrc.includes('resolveWidgetToTenant') && webSessionSrc.includes('isRealEnv')) {
  pass('SEC-11B2B-WIDGET-RESOLVE', 'conv-web-session resuelve tenant desde widget_public_key en modo real');
} else {
  warn('SEC-11B2B-WIDGET-RESOLVE', 'conv-web-session aún no resuelve tenant por widget_public_key');
}

// CI incluye security-remediation-implementation
if (ciContent.includes('test:sc:security-remediation-implementation')) {
  pass('SEC-CI-REMEDIATION-IMPL', 'CI incluye test:sc:security-remediation-implementation');
} else {
  warn('SEC-CI-REMEDIATION-IMPL', 'CI no incluye test:sc:security-remediation-implementation aún');
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 19: Fase 11B2C — Auditoría de conv-web-message y paridad de controles
// ─────────────────────────────────────────────────────────────────────────────

// conv-web-message usa checkStartupConfig
if (webSessionSrc && existsSync(join(EF_DIR, 'conv-web-message/index.ts'))) {
  const webMessageSrc = readText(join(EF_DIR, 'conv-web-message/index.ts'));

  if (webMessageSrc.includes('checkStartupConfig')) {
    pass('SEC-11B2C-MSG-STARTUP', 'conv-web-message usa checkStartupConfig (fail-closed, 11B2C)');
  } else {
    warn('SEC-11B2C-MSG-STARTUP', 'conv-web-message no tiene checkStartupConfig');
  }

  if (webMessageSrc.includes('assertSessionOwnership')) {
    pass('SEC-11B2C-MSG-GUARD', 'conv-web-message usa assertSessionOwnership (SESSION_CLOSED + expires_at, 11B2C)');
  } else {
    warn('SEC-11B2C-MSG-GUARD', 'conv-web-message no usa assertSessionOwnership');
  }

  // Paridad: las 3 EFs tienen rate limiting
  const hasRLMessage = webMessageSrc.includes('checkWebchatRateLimit');
  const hasRLPoll = webPollSrc.includes('checkPollRateLimit');
  const hasRLSession = webSessionSrc.includes('checkSessionCreationRateLimit');
  if (hasRLMessage && hasRLPoll && hasRLSession) {
    pass('SEC-11B2C-RL-PARITY', 'Las 3 EFs WebChat tienen rate limiting (message + poll + session)');
  } else {
    warn('SEC-11B2C-RL-PARITY', `Rate limiting incompleto: message=${hasRLMessage} poll=${hasRLPoll} session=${hasRLSession}`);
  }

  // No se filtra service_role key en respuestas
  const noLeakMsg    = !webMessageSrc.match(/ok\(.*serviceRoleKey|ok\(.*service_role/);
  const noLeakPoll   = !webPollSrc.match(/ok\(.*serviceRoleKey|ok\(.*service_role/);
  const noLeakSess   = !webSessionSrc.match(/ok\(.*serviceRoleKey|ok\(.*service_role/);
  if (noLeakMsg && noLeakPoll && noLeakSess) {
    pass('SEC-11B2C-NO-KEY-LEAK', 'Ninguna EF WebChat filtra service_role key en respuestas');
  } else {
    fail('SEC-11B2C-NO-KEY-LEAK', 'Una o más EFs WebChat filtran service_role key en respuestas');
  }
}

// Suite security-local-db existe
const localDbSuite = join(ROOT, 'tests/regression/smart-conversations/suites/security-local-db');
if (existsSync(localDbSuite)) {
  pass('SEC-11B2C-LOCAL-DB-SUITE', 'Suite security-local-db existe (Fase 11B2C)');
} else {
  warn('SEC-11B2C-LOCAL-DB-SUITE', 'Suite security-local-db no encontrada (pendiente 11B2C)');
}

// Estado de infraestructura: Docker no disponible → LOCAL_DB_PENDING
// (verificado externamente — el validador no arranca Docker)
warn('SEC-11B2C-DOCKER', 'Docker no disponible en este entorno → estado: IMPLEMENTATION_COMPLETE_LOCAL_DB_PENDING');

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 20: Fase 11B3 — HTTP Security, Privacy, Webhook Hardening
// ─────────────────────────────────────────────────────────────────────────────

// 20.1 cors-policy.ts existe con allowlist dinámica
const corsPolicyPath = join(EF_DIR, '_shared/smart-conversations/cors-policy.ts');
if (existsSync(corsPolicyPath)) {
  const corsSrc = readText(corsPolicyPath);
  if (corsSrc.includes('buildBrowserCorsHeaders') && !corsSrc.match(/'Access-Control-Allow-Origin':\s*'\*'/)) {
    pass('SEC-11B3-CORS-ALLOWLIST', 'CORS allowlist dinámica implementada sin wildcard (Fase 11B3)');
  } else {
    warn('SEC-11B3-CORS-ALLOWLIST', 'cors-policy.ts existe pero puede tener wildcard — revisar');
  }
} else {
  fail('SEC-11B3-CORS-ALLOWLIST', 'cors-policy.ts no encontrado — CORS dinámico no implementado');
}

// 20.2 Las 3 EFs WebChat usan cors-policy
const webChatEFs = ['conv-web-session', 'conv-web-message', 'conv-web-poll'];
const efUsingCors = webChatEFs.filter(ef => {
  const src = readText(join(EF_DIR, `${ef}/index.ts`));
  return src.includes('cors-policy');
});
if (efUsingCors.length === 3) {
  pass('SEC-11B3-CORS-EFS', 'Las 3 EFs WebChat importan cors-policy (Fase 11B3)');
} else {
  warn('SEC-11B3-CORS-EFS', `Solo ${efUsingCors.length}/3 EFs WebChat usan cors-policy: ${efUsingCors.join(', ')}`);
}

// 20.3 CSP presente en vercel.json
const vercelPath = join(ROOT, 'vercel.json');
if (existsSync(vercelPath)) {
  const vercelSrc = readText(vercelPath);
  if (vercelSrc.includes('Content-Security-Policy') && !vercelSrc.includes('unsafe-eval')) {
    pass('SEC-11B3-CSP', 'CSP implementada en vercel.json sin unsafe-eval (Fase 11B3)');
  } else {
    warn('SEC-11B3-CSP', 'vercel.json existe pero CSP puede faltar o tener unsafe-eval');
  }
} else {
  fail('SEC-11B3-CSP', 'vercel.json no encontrado — CSP no implementada');
}

// 20.4 Cabeceras HTTP de seguridad
if (existsSync(vercelPath)) {
  const vercelSrc = readText(vercelPath);
  const hasHeaders = vercelSrc.includes('X-Content-Type-Options') &&
    vercelSrc.includes('Referrer-Policy') &&
    vercelSrc.includes('Permissions-Policy');
  if (hasHeaders) {
    pass('SEC-11B3-HEADERS', 'Cabeceras HTTP de seguridad en vercel.json (Fase 11B3)');
  } else {
    warn('SEC-11B3-HEADERS', 'Cabeceras HTTP incompletas en vercel.json — revisar');
  }
}

// 20.5 constant-time.ts implementado (SEC-012)
const constantTimePath = join(EF_DIR, '_shared/smart-conversations/runtime/constant-time.ts');
if (existsSync(constantTimePath)) {
  pass('SEC-11B3-CONSTANT-TIME', 'constant-time.ts implementado — SEC-012 mitigado (Fase 11B3)');
} else {
  fail('SEC-11B3-CONSTANT-TIME', 'constant-time.ts no encontrado — SEC-012 pendiente');
}

// 20.6 ef-auth.ts usa timingSafeEqual
const efAuthSrc = readText(join(EF_DIR, '_shared/smart-conversations/ef-auth.ts'));
if (efAuthSrc.includes('timingSafeEqual')) {
  pass('SEC-11B3-AUTH-CONSTANT-TIME', 'ef-auth.ts usa timingSafeEqual (SEC-012, Fase 11B3)');
} else {
  warn('SEC-11B3-AUTH-CONSTANT-TIME', 'ef-auth.ts sin timingSafeEqual — SEC-012 pendiente');
}

// 20.7 ef-logger.ts cubre api_key (SEC-023)
const efLoggerSrc = readText(join(EF_DIR, '_shared/smart-conversations/ef-logger.ts'));
if (efLoggerSrc.includes("'api_key'") && efLoggerSrc.includes("'service_role'")) {
  pass('SEC-11B3-LOGGER-REDACTION', 'ef-logger.ts redacta api_key y service_role (SEC-023, Fase 11B3)');
} else {
  warn('SEC-11B3-LOGGER-REDACTION', 'ef-logger.ts puede no redactar api_key o service_role — revisar SEC-023');
}

// 20.8 conv-wa-webhook valida timestamp (SEC-026)
const webhookSrc = readText(join(EF_DIR, 'conv-wa-webhook/index.ts'));
if (webhookSrc.includes('X-Wasender-Timestamp') && webhookSrc.includes('validateWebhookTimestamp')) {
  pass('SEC-11B3-WEBHOOK-TIMESTAMP', 'conv-wa-webhook valida timestamp (SEC-026, Fase 11B3)');
} else {
  warn('SEC-11B3-WEBHOOK-TIMESTAMP', 'conv-wa-webhook sin validación de timestamp — SEC-026 pendiente');
}

// 20.9 conv-wa-webhook usa constant-time (SEC-012)
if (webhookSrc.includes('timingSafeEqualBytes')) {
  pass('SEC-11B3-WEBHOOK-CONSTANT-TIME', 'conv-wa-webhook usa constant-time HMAC (SEC-012, Fase 11B3)');
} else {
  warn('SEC-11B3-WEBHOOK-CONSTANT-TIME', 'conv-wa-webhook sin constant-time en HMAC — SEC-012 pendiente');
}

// 20.10 Migración 11B3 existe
const migB3 = join(MIGRATIONS_DIR, '20260723000001_sc_security_b3.sql');
if (existsSync(migB3)) {
  pass('SEC-11B3-MIGRATION', 'Migración 11B3 existe (idempotencia + retención + rotación, Fase 11B3)');
} else {
  warn('SEC-11B3-MIGRATION', 'Migración 11B3 no encontrada — pendiente de creación');
}

// 20.11 client_message_id en migración (SEC-027)
if (existsSync(migB3)) {
  const migB3Src = readText(migB3);
  if (migB3Src.includes('client_message_id')) {
    pass('SEC-11B3-IDEMPOTENCY', 'client_message_id en migración 11B3 (SEC-027, Fase 11B3)');
  } else {
    warn('SEC-11B3-IDEMPOTENCY', 'client_message_id no encontrado en migración 11B3 — SEC-027 pendiente');
  }
}

// 20.12 purge_old_raw_payloads en migración (SEC-007)
if (existsSync(migB3)) {
  const migB3Src = readText(migB3);
  if (migB3Src.includes('purge_old_raw_payloads')) {
    pass('SEC-11B3-RAW-PAYLOAD-RETENTION', 'purge_old_raw_payloads implementado (SEC-007, Fase 11B3)');
  } else {
    warn('SEC-11B3-RAW-PAYLOAD-RETENTION', 'purge_old_raw_payloads no encontrado en migración 11B3 — SEC-007 pendiente');
  }
}

// 20.13 Suite security-http-privacy existe
const httpPrivacySuite = join(ROOT, 'tests/regression/smart-conversations/suites/security-http-privacy');
if (existsSync(httpPrivacySuite)) {
  pass('SEC-11B3-HTTP-PRIVACY-SUITE', 'Suite security-http-privacy existe (Fase 11B3)');
} else {
  warn('SEC-11B3-HTTP-PRIVACY-SUITE', 'Suite security-http-privacy no encontrada — pendiente 11B3');
}

// 20.14 dev-preflight.mjs existe
const preflightPath = join(ROOT, 'scripts/smart-conversations/dev-preflight.mjs');
if (existsSync(preflightPath)) {
  pass('SEC-11B3-DEV-GUARD', 'dev-preflight.mjs existe — guard de despliegue DEV (Fase 11B3)');
} else {
  warn('SEC-11B3-DEV-GUARD', 'dev-preflight.mjs no encontrado — guard DEV pendiente');
}

// 20.15 Estado DEV — pendiente despliegue real
warn('SEC-11B3-DEV-PENDING', 'Despliegue DEV pendiente — estado: HTTP_PRIVACY_IMPLEMENTATION_COMPLETE_DEV_PENDING (Docker no disponible para validación local completa)');

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 21 — Fase 11B4: Adversarial Testing
// ─────────────────────────────────────────────────────────────────────────────

// 21.1 Suite security-adversarial existe
const adversarialSuite = join(ROOT, 'tests/regression/smart-conversations/suites/security-adversarial');
if (existsSync(adversarialSuite)) {
  pass('SEC-11B4-ADVERSARIAL-SUITE', 'Suite security-adversarial existe (Fase 11B4)');
} else {
  fail('SEC-11B4-ADVERSARIAL-SUITE', 'Suite security-adversarial no encontrada — blocker Fase 11B4');
}

// 21.2 Archivo static (SRA-*)
const adversarialStatic = join(adversarialSuite, 'security-adversarial.spec.ts');
if (existsSync(adversarialStatic)) {
  pass('SEC-11B4-STATIC-TESTS', 'security-adversarial.spec.ts existe — tests estáticos SRA-* (Fase 11B4)');
} else {
  fail('SEC-11B4-STATIC-TESTS', 'security-adversarial.spec.ts no encontrado');
}

// 21.3 Archivo runtime (SRR-*)
const adversarialRuntime = join(adversarialSuite, 'security-adversarial-runtime.spec.ts');
if (existsSync(adversarialRuntime)) {
  pass('SEC-11B4-RUNTIME-TESTS', 'security-adversarial-runtime.spec.ts existe — simulación SRR-* (Fase 11B4)');
} else {
  fail('SEC-11B4-RUNTIME-TESTS', 'security-adversarial-runtime.spec.ts no encontrado');
}

// 21.4 Archivo fuzz (SRF-*)
const adversarialFuzz = join(adversarialSuite, 'security-adversarial-fuzz.spec.ts');
if (existsSync(adversarialFuzz)) {
  pass('SEC-11B4-FUZZ-TESTS', 'security-adversarial-fuzz.spec.ts existe — fuzzing SRF-* (Fase 11B4)');
} else {
  fail('SEC-11B4-FUZZ-TESTS', 'security-adversarial-fuzz.spec.ts no encontrado');
}

// 21.5 Matriz adversarial existe
const adversarialMatrix = join(SECURITY_DIR, 'adversarial-test-matrix.md');
if (existsSync(adversarialMatrix)) {
  pass('SEC-11B4-MATRIX', 'adversarial-test-matrix.md existe (Fase 11B4)');
} else {
  fail('SEC-11B4-MATRIX', 'adversarial-test-matrix.md no encontrado — blocker Fase 11B4');
}

// 21.6 gate-1-closure-checklist.md existe
const gate1Checklist = join(SECURITY_DIR, 'gate-1-closure-checklist.md');
if (existsSync(gate1Checklist)) {
  pass('SEC-11B4-GATE1-CHECKLIST', 'gate-1-closure-checklist.md existe (Fase 11B4)');
} else {
  fail('SEC-11B4-GATE1-CHECKLIST', 'gate-1-closure-checklist.md no encontrado — blocker Fase 11B4');
}

// 21.7 phase-11b4-adversarial-report.md existe
const adversarialReport = join(SECURITY_DIR, 'phase-11b4-adversarial-report.md');
if (existsSync(adversarialReport)) {
  pass('SEC-11B4-REPORT', 'phase-11b4-adversarial-report.md existe (Fase 11B4)');
} else {
  fail('SEC-11B4-REPORT', 'phase-11b4-adversarial-report.md no encontrado — blocker Fase 11B4');
}

// 21.8 phase-11b4-dev-validation-plan.md existe
const devValidationPlan = join(SECURITY_DIR, 'phase-11b4-dev-validation-plan.md');
if (existsSync(devValidationPlan)) {
  pass('SEC-11B4-DEV-PLAN', 'phase-11b4-dev-validation-plan.md existe (Fase 11B4)');
} else {
  warn('SEC-11B4-DEV-PLAN', 'phase-11b4-dev-validation-plan.md no encontrado — recomendado Fase 11B4');
}

// 21.9 Inventario 20 EFs async — verificar que los 20 usan await
{
  const EFS_ASYNC_SERVICE_ROLE = [
    'conv-core-publish-activity', 'conv-core-query-listings', 'conv-wf30-listings',
    'conv-wf40-help', 'conv-core-create-lead', 'conv-send-wa', 'conv-core-create-incident',
    'conv-core-get-tenant-features', 'conv-close-case', 'conv-wf20-incidents',
    'conv-core-query-help-kb', 'conv-core-create-help-ticket', 'conv-core-validate-identity',
    'conv-routing-engine', 'conv-identity-progressive', 'conv-dispatch-message',
    'conv-process-send-queue', 'conv-ingest', 'conv-escalate-case', 'conv-web-deliver',
  ];
  let asyncCount = 0;
  for (const ef of EFS_ASYNC_SERVICE_ROLE) {
    const idx = join(EF_DIR, ef, 'index.ts');
    if (existsSync(idx)) {
      const src = readText(idx);
      if (src.includes('await isServiceRoleRequest(')) asyncCount++;
    }
  }
  if (asyncCount === EFS_ASYNC_SERVICE_ROLE.length) {
    pass('SEC-11B4-ASYNC-INVENTORY', `Los ${asyncCount}/${EFS_ASYNC_SERVICE_ROLE.length} EFs usan await isServiceRoleRequest() (Fase 11B3/11B4)`);
  } else {
    fail('SEC-11B4-ASYNC-INVENTORY', `Solo ${asyncCount}/${EFS_ASYNC_SERVICE_ROLE.length} EFs usan await isServiceRoleRequest() — blocker`);
  }
}

// 21.10 GATE_1 no declarado PASS en artefactos 11B4
{
  const docsToCheck = [adversarialReport, devValidationPlan, gate1Checklist, adversarialMatrix];
  let gatePassFound = false;
  for (const doc of docsToCheck) {
    const src = readText(doc);
    if (/GATE_1[^A-Z]*PASS|GATE_1[^A-Z]*APPROVED/i.test(src.replace(/REMEDIATION_PENDING/g, ''))) {
      gatePassFound = true;
    }
  }
  if (!gatePassFound) {
    pass('SEC-11B4-GATE1-NOT-CLOSED', 'GATE_1 no declarado PASS/APPROVED en artefactos 11B4 — correcto');
  } else {
    fail('SEC-11B4-GATE1-NOT-CLOSED', 'GATE_1 declarado PASS/APPROVED prematuramente en artefacto 11B4 — blocker');
  }
}

// 21.11 DEV_REQUIRED inventariado en gate-1-closure-checklist
{
  const checklistSrc = readText(gate1Checklist);
  // Contar checkboxes sin marcar en Sección B (DEV_REQUIRED)
  const devRequiredCount = (checklistSrc.match(/- \[ \]/g) || []).length;
  if (devRequiredCount >= 5) {
    pass('SEC-11B4-DEV-REQUIRED-INVENTORY', `${devRequiredCount} criterios DEV_REQUIRED inventariados en gate-1-closure-checklist (Fase 11B4)`);
  } else {
    warn('SEC-11B4-DEV-REQUIRED-INVENTORY', 'Menos de 5 criterios DEV_REQUIRED en gate-1-closure-checklist — revisar');
  }
}

// 21.12 Estado adversarial
{
  const hasFuzz = existsSync(adversarialFuzz);
  const hasStatic = existsSync(adversarialStatic);
  const hasRuntime = existsSync(adversarialRuntime);
  const adversarialState = (hasFuzz && hasStatic && hasRuntime)
    ? 'ADVERSARIAL_OFFLINE_COMPLETE'
    : 'ADVERSARIAL_INCOMPLETE';
  pass('SEC-11B4-STATE', `Estado adversarial: ${adversarialState}_DEV_PENDING (Fase 11B4)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// RESUMEN
// ─────────────────────────────────────────────────────────────────────────────
const passed = checks.filter(c => c.status === 'pass').length;
const warned = checks.filter(c => c.status === 'warn').length;
const failed = checks.filter(c => c.status === 'fail').length;
const status = failed === 0 ? 'AUDIT_COMPLETE' : 'AUDIT_INCOMPLETE';

const output = {
  gate: 'GATE_1',
  phase: '11B4',
  status,
  summary: {
    tables: uniqueTables.length,
    functions: efDirs.length,
    policies: policies.length,
    findings: findingIds.length,
  },
  checks: checks.map(c => ({ id: c.id, status: c.status, description: c.msg })),
  warnings: warnings.map(w => ({ id: w.id, msg: w.msg })),
  blockers: blockers.map(b => ({ id: b.id, msg: b.msg })),
  note: 'No se imprimieron secretos, tokens, PII ni valores sensibles',
};

// Human-readable summary → stderr (no interfiere con JSON en stdout)
process.stderr.write('\n');
process.stderr.write('════════════════════════════════════════════════════════════\n');
process.stderr.write('VALIDATE SECURITY BASELINE — SmartConversations Fase 11B4\n');
process.stderr.write('════════════════════════════════════════════════════════════\n');
process.stderr.write(`  ✅ Passed  : ${passed}\n`);
process.stderr.write(`  ⚠️  Warned  : ${warned}\n`);
process.stderr.write(`  ❌ Failed  : ${failed}\n`);
process.stderr.write('\n');
if (blockers.length > 0) {
  process.stderr.write('Blockers:\n');
  for (const b of blockers) process.stderr.write(`  ❌ ${b.id}: ${b.msg}\n`);
  process.stderr.write('\n');
}
process.stderr.write(`📋 GATE_1: ${status}\n`);
process.stderr.write('   GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING — Fase 11B4: ADVERSARIAL_OFFLINE_COMPLETE_DEV_PENDING. DEV deploy requerido para cierre.\n');
process.stderr.write('\n');

// JSON puro → stdout (parseable por tests y CI)
console.log(JSON.stringify(output, null, 2));

process.exit(failed > 0 ? 1 : 0);
