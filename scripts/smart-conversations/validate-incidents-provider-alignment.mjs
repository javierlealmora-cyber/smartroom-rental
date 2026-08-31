/**
 * validate-incidents-provider-alignment.mjs — Fase 11C5E-IMPLEMENTATION
 * Valida la alineación offline del consumer SC con el contrato provider SI v1.0.
 *
 * Exit codes:
 *   0 — todos los checks pasan (INCIDENTS_PROVIDER_ALIGNMENT_OFFLINE_VALIDATED)
 *   1 — algún check falla (INCIDENTS_PROVIDER_ALIGNMENT_DEGRADED)
 *   2 — no ejecutado por configuración pendiente (NOT_EXECUTED_CONFIGURATION_PENDING)
 *
 * Uso: node scripts/smart-conversations/validate-incidents-provider-alignment.mjs
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');
const SHARED = 'supabase/functions/_shared/smart-conversations';
const ADAPTERS = `${SHARED}/adapters`;
const EF_DIR = 'supabase/functions';
const INTEGRATIONS = 'docs/smart-conversations/integrations';

let passed = 0;
let failed = 0;
let stepNum = 0;

function step(label, fn) {
  stepNum++;
  try {
    fn();
    console.log(`  [${String(stepNum).padStart(2, '0')}] ✅ PASS — ${label}`);
    passed++;
  } catch (e) {
    console.log(`  [${String(stepNum).padStart(2, '0')}] ❌ FAIL — ${label}: ${e.message}`);
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

console.log('\n=== validate-incidents-provider-alignment.mjs — Fase 11C5E-IMPLEMENTATION ===\n');
console.log('Valida alineación offline del consumer SC con contrato provider SI v1.0.\n');

// ─── §A: Provider contract snapshot ───────────────────────────────────────────

const SNAPSHOT = `${INTEGRATIONS}/provider-contract-snapshots/smart-incidents-create-request-v1.0.md`;

step('A01: Snapshot provider contract existe', () => {
  exists(SNAPSHOT);
});

step('A02: Snapshot tiene estado INCIDENT_PROVIDER_CONTRACT_DEFINED_IMPLEMENTATION_PENDING', () => {
  contains(SNAPSHOT, 'INCIDENT_PROVIDER_CONTRACT_DEFINED_IMPLEMENTATION_PENDING');
});

step('A03: Snapshot documenta title max 120 chars (no 255)', () => {
  const code = src(SNAPSHOT);
  if (!code.includes('120')) throw new Error('120 ausente en snapshot');
  if (code.match(/título.*255|255.*título/i)) throw new Error('255 referenciado como límite de título');
});

// ─── §B: Puerto neutral v1.0 ──────────────────────────────────────────────────

const PORT = `${SHARED}/incidents-integration-port.ts`;

step('B01: InternalCreateIncidentCommand definido en puerto', () => {
  contains(PORT, 'InternalCreateIncidentCommand');
});

step('B02: ProviderCreateIncidentRequestV1 definido en puerto', () => {
  contains(PORT, 'ProviderCreateIncidentRequestV1');
});

step('B03: requester_profile_id en puerto', () => {
  contains(PORT, 'requester_profile_id');
});

step('B04: title en puerto (incident)', () => {
  contains(PORT, 'title:');
});

step('B05: source_system: smart_conversations en puerto', () => {
  contains(PORT, "source_system: 'smart_conversations'");
});

step('B06: priority: normal|urgent en puerto (no urgency_proposal en provider DTO)', () => {
  const code = src(PORT);
  if (!code.includes("priority: 'normal' | 'urgent'")) {
    throw new Error("priority: 'normal' | 'urgent' ausente en ProviderCreateIncidentRequestV1");
  }
});

step('B07: PROVIDER_ERROR_CODES exportado con exactamente 15 códigos contractuales del provider', () => {
  const code = src(PORT);
  const idx = code.indexOf('export const PROVIDER_ERROR_CODES');
  if (idx === -1) throw new Error('PROVIDER_ERROR_CODES no exportado del port');
  const section = code.slice(idx, idx + 1200);
  const providerCodes = [
    'UNSUPPORTED_CONTRACT_VERSION', 'VALIDATION_ERROR', 'AUTHENTICATION_REQUIRED',
    'CALLER_NOT_AUTHORIZED', 'FEATURE_DISABLED', 'RESOURCE_NOT_FOUND',
    'REQUESTER_NOT_ALLOWED', 'INVALID_CATEGORY', 'INVALID_PRIORITY',
    'ATTACHMENTS_NOT_SUPPORTED', 'IDEMPOTENCY_CONFLICT', 'RATE_LIMITED',
    'DEPENDENCY_UNAVAILABLE', 'PROVIDER_TIMEOUT', 'INTERNAL_ERROR',
  ];
  const missing = providerCodes.filter(c => !section.includes(c));
  if (missing.length > 0) throw new Error(`Códigos provider ausentes en PROVIDER_ERROR_CODES: ${missing.join(', ')}`);
  const count = (section.match(/:\s*'[A-Z_]+'/g) ?? []).length;
  if (count !== 15) throw new Error(`PROVIDER_ERROR_CODES tiene ${count} entradas — debe ser exactamente 15`);
});

step('B08: validateIncidentResult verifica status === new', () => {
  const code = src(PORT);
  if (!code.includes("status !== 'new'") && !code.includes("status === 'new'")) {
    throw new Error("Validación de status 'new' ausente en validateIncidentResult");
  }
});

step('B09: IDEMPOTENCY_STRATEGY = CONSUMER_IDEMPOTENCY_HASH_DERIVED', () => {
  contains(PORT, 'CONSUMER_IDEMPOTENCY_HASH_DERIVED');
});

step('B10: external_request_reference: null en RAÍZ de ProviderCreateIncidentRequestV1 (no dentro de incident)', () => {
  const code = src(PORT).replace(/\/\/[^\n]*/g, '');
  const ifaceIdx = code.indexOf('interface ProviderCreateIncidentRequestV1');
  if (ifaceIdx === -1) throw new Error('ProviderCreateIncidentRequestV1 no encontrado en port');
  const ifaceSection = code.slice(ifaceIdx, ifaceIdx + 900);
  const incidentIdx = ifaceSection.indexOf('incident:');
  if (incidentIdx === -1) throw new Error('incident: no encontrado en ProviderCreateIncidentRequestV1');
  const rootSection = ifaceSection.slice(0, incidentIdx);
  if (!rootSection.includes('external_request_reference')) {
    throw new Error('external_request_reference no está en RAÍZ — debe aparecer antes de incident:');
  }
  const incidentBody = ifaceSection.slice(incidentIdx);
  if (incidentBody.includes('external_request_reference')) {
    throw new Error('external_request_reference dentro de incident: — violación de contrato');
  }
});

step('B11: requester_profile_id en RAÍZ de ProviderCreateIncidentRequestV1 (no dentro de incident)', () => {
  const code = src(PORT).replace(/\/\/[^\n]*/g, '');
  const ifaceIdx = code.indexOf('interface ProviderCreateIncidentRequestV1');
  if (ifaceIdx === -1) throw new Error('ProviderCreateIncidentRequestV1 no encontrado en port');
  const ifaceSection = code.slice(ifaceIdx, ifaceIdx + 900);
  const incidentIdx = ifaceSection.indexOf('incident:');
  if (incidentIdx === -1) throw new Error('incident: no encontrado en ProviderCreateIncidentRequestV1');
  const incidentBody = ifaceSection.slice(incidentIdx);
  if (incidentBody.includes('requester_profile_id')) {
    throw new Error('requester_profile_id dentro de incident: — debe estar en RAÍZ');
  }
  const rootSection = ifaceSection.slice(0, incidentIdx);
  if (!rootSection.includes('requester_profile_id')) {
    throw new Error('requester_profile_id no está en RAÍZ — debe aparecer antes de incident:');
  }
});

step('B12: deriveIncidentIdempotencyKey exportado como async function con operación create_incident', () => {
  const code = src(PORT);
  if (!code.includes('export async function deriveIncidentIdempotencyKey')) {
    throw new Error('deriveIncidentIdempotencyKey no exportado como async function del port');
  }
  if (!code.includes('create_incident')) {
    throw new Error("'create_incident' ausente en cuerpo de deriveIncidentIdempotencyKey — operación no anclada");
  }
  if (!code.includes('HMAC') || !code.includes('SHA-256')) {
    throw new Error('HMAC-SHA256 ausente en deriveIncidentIdempotencyKey — clave no es opaca');
  }
});

step('B13: CONSUMER_INTERNAL_INCIDENT_ERROR_CODES exportado y separado de PROVIDER_ERROR_CODES', () => {
  const code = src(PORT);
  if (!code.includes('CONSUMER_INTERNAL_INCIDENT_ERROR_CODES')) {
    throw new Error('CONSUMER_INTERNAL_INCIDENT_ERROR_CODES no exportado del port');
  }
  const providerIdx = code.indexOf('export const PROVIDER_ERROR_CODES');
  const consumerIdx = code.indexOf('CONSUMER_INTERNAL_INCIDENT_ERROR_CODES');
  if (providerIdx === -1 || consumerIdx === -1) throw new Error('Constantes no encontradas');
  const providerSection = code.slice(providerIdx, providerIdx + 1000);
  const consumerOnlyCodes = ['REQUESTER_IDENTITY_REQUIRED', 'UNSUPPORTED_ACTOR_TYPE', 'UNKNOWN_URGENCY'];
  for (const c of consumerOnlyCodes) {
    if (providerSection.includes(c)) {
      throw new Error(`${c} detectado en PROVIDER_ERROR_CODES — debe estar solo en consumer-internal`);
    }
  }
});

step('B14: resolveIncidentSourceChannel exportado del port (fail-closed, sin fallback)', () => {
  const code = src(PORT);
  if (!code.includes('export function resolveIncidentSourceChannel')) {
    throw new Error('resolveIncidentSourceChannel no exportado del port');
  }
  if (!code.includes('INCIDENT_SOURCE_CHANNEL_INVALID')) {
    throw new Error('INCIDENT_SOURCE_CHANNEL_INVALID ausente — error fail-closed no definido');
  }
});

step('B15: resolveTenantFromContext exportado del port (server-side tenant resolution)', () => {
  const code = src(PORT);
  if (!code.includes('export function resolveTenantFromContext')) {
    throw new Error('resolveTenantFromContext no exportado del port');
  }
  if (!code.includes('INCIDENT_TENANT_MISMATCH')) {
    throw new Error('INCIDENT_TENANT_MISMATCH ausente — mismatch no detectado');
  }
  if (!code.includes('INCIDENT_CASE_SESSION_MISMATCH')) {
    throw new Error('INCIDENT_CASE_SESSION_MISMATCH ausente — case/session no validados conjuntamente');
  }
});

step('B16: INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED en consumer codes del port', () => {
  const code = src(PORT);
  if (!code.includes('INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED')) {
    throw new Error('INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED ausente en consumer codes');
  }
  const fnIdx = code.indexOf('export async function deriveIncidentIdempotencyKey');
  if (fnIdx === -1) throw new Error('deriveIncidentIdempotencyKey no encontrado');
  const fnBody = code.slice(fnIdx, fnIdx + 300);
  if (!fnBody.includes('INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED')) {
    throw new Error('deriveIncidentIdempotencyKey no valida convCaseId vacío');
  }
});

// ─── §C: Módulos helper ───────────────────────────────────────────────────────

step('C01: incidents-actor-mapper.ts existe', () => {
  exists(`${ADAPTERS}/incidents-actor-mapper.ts`);
});

step('C02: incidents-title-generator.ts existe', () => {
  exists(`${ADAPTERS}/incidents-title-generator.ts`);
});

step('C03: incidents-priority-mapper.ts existe', () => {
  exists(`${ADAPTERS}/incidents-priority-mapper.ts`);
});

step('C04: incidents-requester-resolver.ts existe', () => {
  exists(`${ADAPTERS}/incidents-requester-resolver.ts`);
});

step('C05: actor-mapper mapea system_service → system (verifica exportación)', () => {
  const code = src(`${ADAPTERS}/incidents-actor-mapper.ts`);
  if (!code.includes('mapCanonicalActorToSmartIncidentsActor')) {
    throw new Error('mapCanonicalActorToSmartIncidentsActor no exportada');
  }
  if (!code.includes("type: 'system'")) {
    throw new Error("mapping a { type: 'system' } ausente");
  }
});

step('C06: priority-mapper rechaza critical (no en tabla)', () => {
  const code = src(`${ADAPTERS}/incidents-priority-mapper.ts`);
  if (code.match(/critical\s*:/)) {
    throw new Error("'critical' definido en tabla de mapeo — prohibido");
  }
  if (!code.includes('UrgencyMappingError')) {
    throw new Error('UrgencyMappingError no definida — rechazos no implementados');
  }
});

step('C07: title-generator define TITLE_MAX_LENGTH = 120', () => {
  const code = src(`${ADAPTERS}/incidents-title-generator.ts`);
  if (!code.includes('TITLE_MAX_LENGTH')) throw new Error('TITLE_MAX_LENGTH ausente');
  if (!code.includes('120')) throw new Error('120 no referenciado en title-generator');
  if (code.includes('255')) throw new Error('255 presente en title-generator — prohibido');
});

step('C08: title-generator prohíbe fallback Incidencia registrada', () => {
  const code = src(`${ADAPTERS}/incidents-title-generator.ts`);
  if (!code.includes('Incidencia registrada')) {
    throw new Error('FORBIDDEN_TITLE no definido en title-generator');
  }
});

step('C09: requester-resolver define STRONG_MATCH_ACTIVE como nivel requerido', () => {
  contains(`${ADAPTERS}/incidents-requester-resolver.ts`, 'STRONG_MATCH_ACTIVE');
  contains(`${ADAPTERS}/incidents-requester-resolver.ts`, 'REQUIRED_IDENTITY_LEVEL');
});

// ─── §D: Adapter v1.0 ─────────────────────────────────────────────────────────

const ADAPTER = `${ADAPTERS}/incidents-addon-adapter.ts`;

step('D01: Adapter usa ProviderCreateIncidentRequestV1', () => {
  contains(ADAPTER, 'ProviderCreateIncidentRequestV1');
});

step('D02: Adapter importa mapCanonicalActorToSmartIncidentsActor', () => {
  contains(ADAPTER, 'mapCanonicalActorToSmartIncidentsActor');
});

step('D03: Adapter importa mapUrgencyToPriority', () => {
  contains(ADAPTER, 'mapUrgencyToPriority');
});

step('D04: Adapter NO define CanonicalActor local', () => {
  notContains(ADAPTER, 'interface CanonicalActor');
});

step('D05: Adapter NO usa urgency_proposal como key en payload outgoing', () => {
  const clean = src(ADAPTER).replace(/\/\/[^\n]*/g, '');
  if (clean.match(/['"]\s*urgency_proposal\s*['"]\s*:/)) {
    throw new Error("urgency_proposal presente como key en payload outgoing — prohibido");
  }
});

step('D06: Adapter valida status === new en respuesta real', () => {
  contains(ADAPTER, 'INCIDENT_STATUS_MISMATCH');
});

step('D07: Adapter NO usa SUPABASE_SERVICE_ROLE_KEY', () => {
  notContains(ADAPTER, 'SUPABASE_SERVICE_ROLE_KEY');
});

step('D08: Adapter tiene external_request_reference: null en payload', () => {
  contains(ADAPTER, 'external_request_reference: null');
});

step('D09: adapter PROVIDER_ERROR_ALLOWLIST contiene exactamente 15 códigos provider', () => {
  const code = src(ADAPTER);
  const startIdx = code.indexOf('PROVIDER_ERROR_ALLOWLIST');
  if (startIdx === -1) throw new Error('PROVIDER_ERROR_ALLOWLIST no encontrado en adapter');
  // Delimitar al contenido del Set (entre '[' y ']') para no capturar código externo
  const setStart = code.indexOf('[', startIdx);
  const setEnd = code.indexOf(']', setStart);
  if (setStart === -1 || setEnd === -1) throw new Error('Set literal no encontrado');
  const setContent = code.slice(setStart, setEnd);
  const codes = setContent.match(/'[A-Z_]+'/g) ?? [];
  if (codes.length !== 15) {
    throw new Error(`PROVIDER_ERROR_ALLOWLIST tiene ${codes.length} entradas — debe tener exactamente 15`);
  }
});

step('D10: adapter PROVIDER_ERROR_ALLOWLIST contiene los 15 códigos canónicos del provider', () => {
  const code = src(ADAPTER);
  const startIdx = code.indexOf('PROVIDER_ERROR_ALLOWLIST');
  const section = code.slice(startIdx, startIdx + 600);
  const providerCodes = [
    'UNSUPPORTED_CONTRACT_VERSION', 'VALIDATION_ERROR', 'AUTHENTICATION_REQUIRED',
    'CALLER_NOT_AUTHORIZED', 'FEATURE_DISABLED', 'RESOURCE_NOT_FOUND',
    'REQUESTER_NOT_ALLOWED', 'INVALID_CATEGORY', 'INVALID_PRIORITY',
    'ATTACHMENTS_NOT_SUPPORTED', 'IDEMPOTENCY_CONFLICT', 'RATE_LIMITED',
    'DEPENDENCY_UNAVAILABLE', 'PROVIDER_TIMEOUT', 'INTERNAL_ERROR',
  ];
  const missing = providerCodes.filter(c => !section.includes(c));
  if (missing.length > 0) throw new Error(`Códigos provider ausentes: ${missing.join(', ')}`);
});

step('D11: HTTP 409 → buildError IDEMPOTENCY_CONFLICT (no buildSuccess)', () => {
  const code = src(ADAPTER);
  const idx = code.indexOf('resp.status === 409');
  if (idx === -1) throw new Error('status === 409 no encontrado en adapter');
  const snippet = code.slice(idx, idx + 250);
  if (!snippet.includes('IDEMPOTENCY_CONFLICT')) {
    throw new Error('IDEMPOTENCY_CONFLICT ausente en bloque 409');
  }
  if (snippet.includes('buildSuccess')) {
    throw new Error('buildSuccess presente en bloque 409 — prohibido por contrato v1.0');
  }
});

step('D12: mapProviderError exportado del adapter', () => {
  contains(ADAPTER, 'export function mapProviderError');
});

step('D13: buildProviderRequest pone external_request_reference: null en RAÍZ (no dentro de incident)', () => {
  const code = src(ADAPTER);
  const fnIdx = code.indexOf('export function buildProviderRequest');
  if (fnIdx === -1) throw new Error('buildProviderRequest no encontrado en adapter');
  const fnSection = code.slice(fnIdx, fnIdx + 800);
  const incidentIdx = fnSection.indexOf('incident:');
  if (incidentIdx === -1) throw new Error('incident: no encontrado en buildProviderRequest');
  const rootSection = fnSection.slice(0, incidentIdx);
  if (!rootSection.includes('external_request_reference')) {
    throw new Error('external_request_reference: null no está en RAÍZ del return de buildProviderRequest');
  }
  const incidentBody = fnSection.slice(incidentIdx);
  if (incidentBody.includes('external_request_reference')) {
    throw new Error('external_request_reference detectado dentro de incident: — violación de contrato');
  }
});

step('D14: buildProviderRequest pone requester_profile_id en RAÍZ (no dentro de incident)', () => {
  const code = src(ADAPTER);
  const fnIdx = code.indexOf('export function buildProviderRequest');
  if (fnIdx === -1) throw new Error('buildProviderRequest no encontrado en adapter');
  const fnSection = code.slice(fnIdx, fnIdx + 800);
  const incidentIdx = fnSection.indexOf('incident:');
  if (incidentIdx === -1) throw new Error('incident: no encontrado en buildProviderRequest');
  const incidentBody = fnSection.slice(incidentIdx);
  if (incidentBody.includes('requester_profile_id')) {
    throw new Error('requester_profile_id detectado dentro de incident: — debe estar en raíz');
  }
  const rootSection = fnSection.slice(0, incidentIdx);
  if (!rootSection.includes('requester_profile_id')) {
    throw new Error('requester_profile_id no está en RAÍZ del return de buildProviderRequest');
  }
});

step('D15: mapProviderError retorna ProviderErrorCode (tipado fuerte, no string)', () => {
  const code = src(ADAPTER);
  const fnIdx = code.indexOf('export function mapProviderError');
  if (fnIdx === -1) throw new Error('mapProviderError no encontrado en adapter');
  const fnSignature = code.slice(fnIdx, fnIdx + 120);
  if (!fnSignature.includes('ProviderErrorCode')) {
    throw new Error('mapProviderError no retorna ProviderErrorCode — tipo débil (string) detectado');
  }
});

// ─── §E: Frontera n8n / WF-20 ─────────────────────────────────────────────────

step('E01: WF-20 no envía requester_profile_id al EF', () => {
  const wf20 = src(`${EF_DIR}/conv-wf20-incidents/index.ts`);
  const coreCallRegion = wf20.split('conv-core-create-incident')[1]?.slice(0, 400) ?? '';
  if (coreCallRegion.includes('requester_profile_id')) {
    throw new Error('requester_profile_id encontrado en el payload WF-20 → EF — prohibido');
  }
});

step('E02: Adapter no importa n8n-adapter', () => {
  notContains(ADAPTER, 'n8n-adapter');
});

step('E03: entrypoint usa createIncident del adapter (no core-incident-client)', () => {
  const code = src(`${EF_DIR}/conv-core-create-incident/index.ts`);
  if (!code.includes('incidents-addon-adapter')) {
    throw new Error('entrypoint no importa incidents-addon-adapter — cableado incompleto');
  }
  if (!code.includes('createIncident')) {
    throw new Error('entrypoint no llama a createIncident — cableado incompleto');
  }
  const clean = code.replace(/\/\/[^\n]*/g, '');
  if (clean.includes('core-incident-client')) {
    throw new Error('entrypoint sigue usando core-incident-client — arquitectura paralela detectada');
  }
});

step('E04: entrypoint resuelve accommodation_id de identity_data (server-side)', () => {
  const code = src(`${EF_DIR}/conv-core-create-incident/index.ts`);
  if (!code.includes('accommodation_id') || !code.includes('identity_data')) {
    throw new Error('accommodation_id no extraído de identity_data — INCIDENT_RESOURCE_RESOLUTION_INCOMPLETE');
  }
  if (!code.match(/!accommodationId/)) {
    throw new Error('accommodation_id ausente no produce error — guard faltante');
  }
});

step('E05: entrypoint importa InternalCreateIncidentCommand del port', () => {
  contains(`${EF_DIR}/conv-core-create-incident/index.ts`, 'InternalCreateIncidentCommand');
});

step('E06: idempotency key derivado deterministamente (CONSUMER_IDEMPOTENCY_HASH_DERIVED)', () => {
  const code = src(`${EF_DIR}/conv-core-create-incident/index.ts`);
  if (!code.includes('idempotencyKey') && !code.includes('idempotency_key')) {
    throw new Error('idempotency_key ausente — estrategia HASH_DERIVED no implementada');
  }
  const clean = code.replace(/\/\/[^\n]*/g, '');
  if (clean.match(/INSERT.*idempotency/i)) {
    throw new Error('INSERT de idempotency detectado — persistencia durable activa (esperado: PENDING)');
  }
});

step('E07: entrypoint importa y usa deriveIncidentIdempotencyKey del port (no derivación manual)', () => {
  const code = src(`${EF_DIR}/conv-core-create-incident/index.ts`);
  if (!code.includes('deriveIncidentIdempotencyKey')) {
    throw new Error('deriveIncidentIdempotencyKey ausente en entrypoint — HMAC no delegado al port');
  }
  if (!code.includes('incidents-integration-port')) {
    throw new Error('deriveIncidentIdempotencyKey no importado desde incidents-integration-port');
  }
  const clean = code.replace(/\/\/[^\n]*/g, '');
  if (clean.match(/`.*create_incident.*`/)) {
    throw new Error('Template literal con create_incident en entrypoint — derivación debe estar en port');
  }
});

step('E08: entrypoint bloquea modo real/canary sin INCIDENTS_IDEMPOTENCY_SECRET', () => {
  const code = src(`${EF_DIR}/conv-core-create-incident/index.ts`);
  if (!code.includes('INCIDENTS_IDEMPOTENCY_SECRET')) {
    throw new Error('INCIDENTS_IDEMPOTENCY_SECRET no validado en entrypoint — guard ausente');
  }
  if (!code.includes("'real'") && !code.includes('"real"')) {
    throw new Error("Guard para modo 'real' ausente en entrypoint");
  }
  if (!code.includes("'canary'") && !code.includes('"canary"')) {
    throw new Error("Guard para modo 'canary' ausente en entrypoint");
  }
  if (!code.includes('INCIDENT_IDEMPOTENCY_CONFIGURATION_REQUIRED')) {
    throw new Error('Código de error INCIDENT_IDEMPOTENCY_CONFIGURATION_REQUIRED ausente — guard incompleto');
  }
});

step('E09: entrypoint carga conv_cases server-side para resolver tenant (no solo conv_sessions)', () => {
  const code = src(`${EF_DIR}/conv-core-create-incident/index.ts`);
  if (!code.includes('conv_cases')) {
    throw new Error("conv_cases ausente en entrypoint — tenant no resuelto server-side desde el caso");
  }
  if (!code.includes('resolveTenantFromContext')) {
    throw new Error('resolveTenantFromContext ausente en entrypoint — resolución de tenant delegada al port');
  }
  if (!code.includes('resolvedTenantId')) {
    throw new Error('resolvedTenantId ausente — tenant del body usado sin validación server-side');
  }
});

step('E10: entrypoint usa resolveIncidentSourceChannel (sin fallback de body.source)', () => {
  const code = src(`${EF_DIR}/conv-core-create-incident/index.ts`);
  if (!code.includes('resolveIncidentSourceChannel')) {
    throw new Error('resolveIncidentSourceChannel ausente en entrypoint — canal no resuelto server-side');
  }
  if (!code.includes('assertSourceChannelNotOverridden')) {
    throw new Error('assertSourceChannelNotOverridden ausente — mismatch body vs sesión no detectado');
  }
  const clean = code.replace(/\/\/[^\n]*/g, '');
  if (clean.match(/source\s*===\s*['"]webchat['"]\s*\?\s*['"]webchat['"]\s*:\s*['"]whatsapp['"]/)) {
    throw new Error("Fallback 'source === webchat ? webchat : whatsapp' presente — eliminar");
  }
});

step('E11: resolveTenantFromContext precede a deriveIncidentIdempotencyKey en el entrypoint', () => {
  const code = src(`${EF_DIR}/conv-core-create-incident/index.ts`);
  const resolveIdx = code.indexOf('resolveTenantFromContext(');
  const hmacIdx = code.indexOf('deriveIncidentIdempotencyKey(');
  if (resolveIdx === -1) throw new Error('resolveTenantFromContext no invocado en entrypoint');
  if (hmacIdx === -1) throw new Error('deriveIncidentIdempotencyKey no invocado en entrypoint');
  if (hmacIdx <= resolveIdx) {
    throw new Error('deriveIncidentIdempotencyKey precede a resolveTenantFromContext — orden incorrecto');
  }
});

// ─── §F: GATE_1 ───────────────────────────────────────────────────────────────

step('F01: reconciliation doc GATE_1 = AUDIT_COMPLETE_REMEDIATION_PENDING (no REQUIRED)', () => {
  const code = src(`${INTEGRATIONS}/incidents-cross-module-reconciliation.md`);
  if (code.includes('AUDIT_COMPLETE_REMEDIATION_REQUIRED')) {
    throw new Error('AUDIT_COMPLETE_REMEDIATION_REQUIRED presente — debe ser PENDING');
  }
  if (!code.includes('AUDIT_COMPLETE_REMEDIATION_PENDING')) {
    throw new Error('AUDIT_COMPLETE_REMEDIATION_PENDING ausente');
  }
});

step('F02: remediation plan GATE_1 = AUDIT_COMPLETE_REMEDIATION_PENDING (no REQUIRED)', () => {
  const code = src(`${INTEGRATIONS}/incidents-contract-remediation-plan.md`);
  if (code.includes('AUDIT_COMPLETE_REMEDIATION_REQUIRED')) {
    throw new Error('AUDIT_COMPLETE_REMEDIATION_REQUIRED presente — debe ser PENDING');
  }
});

// ─── §G: Test suites ──────────────────────────────────────────────────────────

const SUITE_DIR = 'tests/regression/smart-conversations/suites/incidents-provider-alignment';

step('G01: 8 suites de tests incidents-provider-alignment existen', () => {
  const suites = [
    'incidents-provider-alignment.spec.ts',
    'incidents-provider-alignment-runtime.spec.ts',
    'incidents-provider-alignment-contracts.spec.ts',
    'incidents-provider-alignment-adversarial.spec.ts',
    'incidents-provider-alignment-integrity.spec.ts',
    'incidents-tenant-resolution.spec.ts',
    'incidents-channel-resolution.spec.ts',
    'incidents-idempotency-reference.spec.ts',
  ];
  for (const s of suites) {
    if (!fs.existsSync(path.join(ROOT, SUITE_DIR, s))) {
      throw new Error(`Suite faltante: ${s}`);
    }
  }
});

step('G02: total tests ≥ 120 declaraciones it() activas (sin it.todo)', () => {
  const suites = [
    'incidents-provider-alignment.spec.ts',
    'incidents-provider-alignment-runtime.spec.ts',
    'incidents-provider-alignment-contracts.spec.ts',
    'incidents-provider-alignment-adversarial.spec.ts',
  ];
  let total = 0;
  for (const s of suites) {
    const content = fs.readFileSync(path.join(ROOT, SUITE_DIR, s), 'utf8');
    const count = (content.match(/^\s+it\(/gm) ?? []).length;
    total += count;
  }
  if (total < 120) throw new Error(`Solo ${total} tests declarados — mínimo 120`);
});

// ─── Resultado final ──────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n=== ${passed}/${total} checks OK / ${failed} FAIL ===\n`);

if (failed === 0) {
  console.log('Estado: INCIDENTS_PROVIDER_ALIGNMENT_OFFLINE_VALIDATED');
  console.log('Próximo paso: ejecutar npm run test:sc:incidents-provider-alignment\n');
  // exit 0 implícito
} else {
  console.log('Estado: INCIDENTS_PROVIDER_ALIGNMENT_DEGRADED');
  console.log('Revisar los checks fallidos antes de continuar.\n');
  process.exit(1);
}
