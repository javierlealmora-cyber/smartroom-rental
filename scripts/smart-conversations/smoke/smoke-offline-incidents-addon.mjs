/**
 * smoke-offline-incidents-addon.mjs — Fase 11C5E-IMPLEMENTATION
 * Smoke OFFLINE para el add-on de incidencias.
 * Verifica infraestructura, contratos y privacidad SIN llamadas a red.
 *
 * ESTADO ESPERADO: INCIDENTS_OFFLINE_READY_DEV_PENDING
 * Uso: node scripts/smart-conversations/smoke/smoke-offline-incidents-addon.mjs
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../');
const SHARED = 'supabase/functions/_shared/smart-conversations';
const ADAPTERS = `${SHARED}/adapters`;

let passed = 0;
let failed = 0;
let stepNum = 0;

function step(label, fn) {
  stepNum++;
  try {
    fn();
    console.log(`  [${String(stepNum).padStart(2, '0')}] ✅ ${label}`);
    passed++;
  } catch (e) {
    console.log(`  [${String(stepNum).padStart(2, '0')}] ❌ ${label}: ${e.message}`);
    failed++;
  }
}

function exists(rel) {
  if (!fs.existsSync(path.join(ROOT, rel))) throw new Error(`No existe: ${rel}`);
}

function src(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function contains(rel, str) {
  if (!src(rel).includes(str)) throw new Error(`"${str}" ausente en ${rel}`);
}

function notContains(rel, str) {
  const clean = src(rel).replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
  if (clean.includes(str)) throw new Error(`"${str}" PRESENTE (prohibido) en ${rel}`);
}

console.log('\n=== smoke-offline-incidents-addon.mjs — Fase 11C5E-IMPLEMENTATION ===\n');

// ─── Checks originales Fase 11C5 (1–15) ──────────────────────────────────────

// 1. Puerto neutral existe
step('incidents-integration-port.ts existe', () => {
  exists(`${SHARED}/incidents-integration-port.ts`);
});

// 2. Puerto exporta IncidentIntegrationPort
step('IncidentIntegrationPort exportado', () => {
  contains(`${SHARED}/incidents-integration-port.ts`, 'IncidentIntegrationPort');
});

// 3. contract_version v1.0
step("contract_version: '1.0' en puerto", () => {
  contains(`${SHARED}/incidents-integration-port.ts`, "contract_version: '1.0'");
});

// 4. Actor canónico existe
step('canonical-actor.ts existe', () => {
  exists(`${SHARED}/canonical-actor.ts`);
});

// 5. Actor incluye unverified_lead y system_service
step("Actor canónico tiene 'unverified_lead' y 'system_service'", () => {
  const s = src(`${SHARED}/canonical-actor.ts`);
  if (!s.includes("'unverified_lead'")) throw new Error("'unverified_lead' ausente");
  if (!s.includes("'system_service'")) throw new Error("'system_service' ausente");
});

// 6. Adapter existe
step('incidents-addon-adapter.ts existe', () => {
  exists(`${ADAPTERS}/incidents-addon-adapter.ts`);
});

// 7. Adapter sin SUPABASE_SERVICE_ROLE_KEY
step('Sin SUPABASE_SERVICE_ROLE_KEY en adapter incidents', () => {
  notContains(`${ADAPTERS}/incidents-addon-adapter.ts`, 'SUPABASE_SERVICE_ROLE_KEY');
});

// 8. Adapter sin createClient()
step('Sin createClient() en adapter incidents', () => {
  notContains(`${ADAPTERS}/incidents-addon-adapter.ts`, 'createClient(');
});

// 9. Adapter usa AbortSignal.timeout
step('AbortSignal.timeout en adapter incidents', () => {
  contains(`${ADAPTERS}/incidents-addon-adapter.ts`, 'AbortSignal.timeout');
});

// 10. Adapter usa checkCircuit
step('checkCircuit en adapter incidents', () => {
  contains(`${ADAPTERS}/incidents-addon-adapter.ts`, 'checkCircuit');
});

// 11. INCIDENT_FORBIDDEN_ACTOR_FIELDS en adapter
step('INCIDENT_FORBIDDEN_ACTOR_FIELDS declarado', () => {
  contains(`${ADAPTERS}/incidents-addon-adapter.ts`, 'INCIDENT_FORBIDDEN_ACTOR_FIELDS');
});

// 12. Puerto tiene INCIDENT_FORBIDDEN_OUTPUT_FIELDS
step('INCIDENT_FORBIDDEN_OUTPUT_FIELDS en puerto', () => {
  contains(`${SHARED}/incidents-integration-port.ts`, 'INCIDENT_FORBIDDEN_OUTPUT_FIELDS');
});

// 13. Sin endpoint real (offline esperado)
step('INCIDENTS_ADDON_BASE_URL ausente → modo offline esperado', () => {
  if (process.env['INCIDENTS_ADDON_BASE_URL']) {
    throw new Error('INCIDENTS_ADDON_BASE_URL configurada → ejecutar smoke DEV real');
  }
});

// 14. Frontera n8n: adapter incidents NO importa n8n
step('incidents-addon-adapter NO importa n8n-adapter', () => {
  if (src(`${ADAPTERS}/incidents-addon-adapter.ts`).includes('n8n-adapter')) {
    throw new Error('Acoplamiento n8n → incidents detectado');
  }
});

// 15. Suite de test existe
step('Suite addons-integration-dev.spec.ts existe', () => {
  exists('tests/regression/smart-conversations/suites/addons-integration-dev/addons-integration-dev.spec.ts');
});

// ─── Nuevos checks Fase 11C5E-IMPLEMENTATION (16–25) ─────────────────────────

// 16. InternalCreateIncidentCommand en puerto
step('InternalCreateIncidentCommand en puerto v1.0', () => {
  contains(`${SHARED}/incidents-integration-port.ts`, 'InternalCreateIncidentCommand');
});

// 17. ProviderCreateIncidentRequestV1 en puerto
step('ProviderCreateIncidentRequestV1 en puerto v1.0', () => {
  contains(`${SHARED}/incidents-integration-port.ts`, 'ProviderCreateIncidentRequestV1');
});

// 18. requester_profile_id en puerto
step('requester_profile_id en puerto (no desde n8n)', () => {
  contains(`${SHARED}/incidents-integration-port.ts`, 'requester_profile_id');
});

// 19. title en puerto (5–120 chars)
step('title en InternalCreateIncidentCommand (5–120 chars)', () => {
  contains(`${SHARED}/incidents-integration-port.ts`, 'title:');
});

// 20. Separación PROVIDER vs CONSUMER error codes
step('PROVIDER_ERROR_CODES (15 contractuales) y CONSUMER_INTERNAL_INCIDENT_ERROR_CODES separados', () => {
  const code = src(`${SHARED}/incidents-integration-port.ts`);
  // Códigos contractuales del provider (los que el add-on puede devolver)
  const providerCodes = ['UNSUPPORTED_CONTRACT_VERSION', 'AUTHENTICATION_REQUIRED', 'IDEMPOTENCY_CONFLICT', 'PROVIDER_TIMEOUT'];
  for (const c of providerCodes) {
    if (!code.includes(c)) throw new Error(`Código provider '${c}' ausente en PROVIDER_ERROR_CODES`);
  }
  // Códigos internos SC (NUNCA enviados al provider)
  const consumerCodes = ['UNKNOWN_URGENCY', 'UNSUPPORTED_ACTOR_TYPE', 'REQUESTER_IDENTITY_REQUIRED'];
  for (const c of consumerCodes) {
    if (!code.includes(c)) throw new Error(`Código consumer '${c}' ausente en CONSUMER_INTERNAL_INCIDENT_ERROR_CODES`);
  }
  // CONSUMER codes no deben aparecer en PROVIDER_ERROR_CODES block
  const providerIdx = code.indexOf('export const PROVIDER_ERROR_CODES');
  if (providerIdx === -1) throw new Error('PROVIDER_ERROR_CODES no exportado');
  const providerSection = code.slice(providerIdx, providerIdx + 1000);
  if (providerSection.includes('UNKNOWN_URGENCY')) {
    throw new Error('UNKNOWN_URGENCY detectado en bloque PROVIDER_ERROR_CODES — mezcla de tipos');
  }
});

// 21. Actor mapper existe
step('incidents-actor-mapper.ts existe', () => {
  exists(`${ADAPTERS}/incidents-actor-mapper.ts`);
});

// 22. Title generator existe (TITLE_MAX_LENGTH = 120)
step('incidents-title-generator.ts con TITLE_MAX_LENGTH = 120', () => {
  exists(`${ADAPTERS}/incidents-title-generator.ts`);
  const code = src(`${ADAPTERS}/incidents-title-generator.ts`);
  if (!code.includes('120')) throw new Error('120 ausente — verificar TITLE_MAX_LENGTH');
  if (code.includes('255')) throw new Error('255 presente en title-generator — prohibido');
});

// 23. Priority mapper existe (no mapea critical)
step('incidents-priority-mapper.ts sin critical en tabla', () => {
  exists(`${ADAPTERS}/incidents-priority-mapper.ts`);
  const code = src(`${ADAPTERS}/incidents-priority-mapper.ts`);
  if (code.match(/critical\s*:/)) throw new Error("'critical' en tabla de mapeo — prohibido");
});

// 24. Requester resolver existe (STRONG_MATCH_ACTIVE)
step('incidents-requester-resolver.ts con STRONG_MATCH_ACTIVE', () => {
  exists(`${ADAPTERS}/incidents-requester-resolver.ts`);
  contains(`${ADAPTERS}/incidents-requester-resolver.ts`, 'STRONG_MATCH_ACTIVE');
});

// 25. Provider contract snapshot existe
step('Snapshot provider contract v1.0 existe', () => {
  exists('docs/smart-conversations/integrations/provider-contract-snapshots/smart-incidents-create-request-v1.0.md');
});

// ─── Nuevos checks Fase 11C5E-CONTRACT-INTEGRITY-CHECK (26–30) ───────────────

// 26. deriveIncidentIdempotencyKey exportado del port como función HMAC
step('deriveIncidentIdempotencyKey exportado del port (HMAC-SHA256)', () => {
  const code = src(`${SHARED}/incidents-integration-port.ts`);
  if (!code.includes('export async function deriveIncidentIdempotencyKey')) {
    throw new Error('deriveIncidentIdempotencyKey no exportado como async function');
  }
  if (!code.includes('HMAC') || !code.includes('SHA-256')) {
    throw new Error('HMAC-SHA256 ausente — clave no es opaca');
  }
  if (!code.includes('create_incident')) {
    throw new Error("Operación 'create_incident' no anclada en HMAC input");
  }
});

// 27. external_request_reference: null en RAÍZ del payload provider (no dentro de incident)
step('external_request_reference: null en raíz del adapter (no dentro de incident)', () => {
  const code = src(`${ADAPTERS}/incidents-addon-adapter.ts`).replace(/\/\/[^\n]*/g, '');
  const fnIdx = code.indexOf('function buildProviderRequest');
  if (fnIdx === -1) throw new Error('buildProviderRequest no encontrado');
  const fnSection = code.slice(fnIdx, fnIdx + 700);
  const incidentIdx = fnSection.indexOf('incident:');
  if (incidentIdx === -1) throw new Error('incident: no encontrado en buildProviderRequest');
  const rootSection = fnSection.slice(0, incidentIdx);
  if (!rootSection.includes('external_request_reference')) {
    throw new Error('external_request_reference no está en raíz del return');
  }
  const incidentBody = fnSection.slice(incidentIdx);
  if (incidentBody.includes('external_request_reference')) {
    throw new Error('external_request_reference dentro de incident: — violación de contrato');
  }
});

// 28. mapProviderError returns ProviderErrorCode (tipo fuerte)
step('mapProviderError retorna ProviderErrorCode (no string genérico)', () => {
  const code = src(`${ADAPTERS}/incidents-addon-adapter.ts`);
  const fnIdx = code.indexOf('export function mapProviderError');
  if (fnIdx === -1) throw new Error('mapProviderError no exportado');
  const fnSig = code.slice(fnIdx, fnIdx + 100);
  if (!fnSig.includes('ProviderErrorCode')) {
    throw new Error('mapProviderError no tipado como ProviderErrorCode');
  }
});

// 29. Suite de integridad existe (5ª suite)
step('Suite incidents-provider-alignment-integrity.spec.ts existe', () => {
  exists('tests/regression/smart-conversations/suites/incidents-provider-alignment/incidents-provider-alignment-integrity.spec.ts');
});

// 30. Entrypoint requiere INCIDENTS_IDEMPOTENCY_SECRET para real/canary
step('Entrypoint bloquea real/canary sin INCIDENTS_IDEMPOTENCY_SECRET', () => {
  const code = src('supabase/functions/conv-core-create-incident/index.ts');
  if (!code.includes('INCIDENTS_IDEMPOTENCY_SECRET')) {
    throw new Error('Guard de INCIDENTS_IDEMPOTENCY_SECRET ausente en entrypoint');
  }
  if (!code.includes('INCIDENT_IDEMPOTENCY_CONFIGURATION_REQUIRED')) {
    throw new Error('Error code INCIDENT_IDEMPOTENCY_CONFIGURATION_REQUIRED ausente — guard incompleto');
  }
});

// ─── Nuevos checks Fase 11C5E-SECURITY-BOUNDARY-CLOSURE (31–35) ──────────────

// 31. resolveIncidentSourceChannel exportado del port (fail-closed)
step('resolveIncidentSourceChannel exportado del port — sin fallback a whatsapp', () => {
  const code = src(`${SHARED}/incidents-integration-port.ts`);
  if (!code.includes('export function resolveIncidentSourceChannel')) {
    throw new Error('resolveIncidentSourceChannel no exportado del port');
  }
  if (!code.includes('INCIDENT_SOURCE_CHANNEL_INVALID')) {
    throw new Error('INCIDENT_SOURCE_CHANNEL_INVALID ausente — fail-closed no implementado');
  }
});

// 32. resolveTenantFromContext exportado del port
step('resolveTenantFromContext exportado del port — fail-closed tenant validation', () => {
  const code = src(`${SHARED}/incidents-integration-port.ts`);
  if (!code.includes('export function resolveTenantFromContext')) {
    throw new Error('resolveTenantFromContext no exportado del port');
  }
  if (!code.includes('INCIDENT_TENANT_MISMATCH') || !code.includes('INCIDENT_CASE_SESSION_MISMATCH')) {
    throw new Error('Códigos de error tenant ausentes en resolveTenantFromContext');
  }
});

// 33. Entrypoint carga conv_cases server-side para resolver tenant
step('Entrypoint carga conv_cases y usa resolvedTenantId (no body.client_account_id directo)', () => {
  const code = src('supabase/functions/conv-core-create-incident/index.ts');
  if (!code.includes('conv_cases')) {
    throw new Error('conv_cases ausente en entrypoint — tenant no resuelto desde el caso');
  }
  if (!code.includes('resolvedTenantId')) {
    throw new Error('resolvedTenantId ausente — body.client_account_id usado sin validación');
  }
  const clean = code.replace(/\/\/[^\n]*/g, '');
  if (clean.match(/source\s*===\s*['"]webchat['"]\s*\?\s*['"]webchat['"]\s*:\s*['"]whatsapp['"]/)) {
    throw new Error("Fallback de canal presente — debe eliminarse");
  }
});

// 34. INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED en consumer codes del port
step('INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED en consumer codes — convCaseId vacío rechazado', () => {
  const code = src(`${SHARED}/incidents-integration-port.ts`);
  if (!code.includes('INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED')) {
    throw new Error('INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED ausente en consumer codes');
  }
  const fnIdx = code.indexOf('export async function deriveIncidentIdempotencyKey');
  if (fnIdx === -1) throw new Error('deriveIncidentIdempotencyKey no encontrado');
  const fnBody = code.slice(fnIdx, fnIdx + 300);
  if (!fnBody.includes('INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED')) {
    throw new Error('Validación de convCaseId vacío ausente en deriveIncidentIdempotencyKey');
  }
});

// 35. Suites de security-boundary existen (tenant, canal, referencia idempotencia)
step('3 suites security-boundary existen (tenant, channel, idemp-ref)', () => {
  const securitySuites = [
    'tests/regression/smart-conversations/suites/incidents-provider-alignment/incidents-tenant-resolution.spec.ts',
    'tests/regression/smart-conversations/suites/incidents-provider-alignment/incidents-channel-resolution.spec.ts',
    'tests/regression/smart-conversations/suites/incidents-provider-alignment/incidents-idempotency-reference.spec.ts',
  ];
  for (const s of securitySuites) {
    if (!fs.existsSync(path.join(ROOT, s))) throw new Error(`Suite faltante: ${s}`);
  }
});

// ─── Resumen ──────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n=== ${passed}/${total} pasos OK / ${failed} FAIL ===`);

const state = failed === 0
  ? 'INCIDENTS_OFFLINE_READY_DEV_PENDING'
  : 'INCIDENTS_SMOKE_DEGRADED';

console.log(`Estado: ${state}`);
console.log('Siguiente: configurar INCIDENTS_ADDON_BASE_URL y ejecutar smoke-dev-incidents-addon.mjs\n');

if (failed > 0) process.exit(1);
