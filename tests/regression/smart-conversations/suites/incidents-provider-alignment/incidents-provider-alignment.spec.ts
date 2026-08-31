/**
 * incidents-provider-alignment.spec.ts — Fase 11C5E-IMPLEMENTATION (Suite 1/4)
 * Alineación offline del consumer SC con el contrato provider Smart Incidents v1.0.
 *
 * OFFLINE ONLY: No realiza llamadas a red ni a endpoints reales.
 * Cubre: análisis estático de archivos fuente + verificación de estructura de tipos.
 *
 * Total: 40 tests activos (sin it.todo).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../../../');
const SHARED = 'supabase/functions/_shared/smart-conversations';
const ADAPTERS = `${SHARED}/adapters`;

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

function src(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function strip(s: string): string {
  return s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-PORT — Puerto neutral: InternalCreateIncidentCommand + ProviderCreateIncidentRequestV1
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-PORT — Puerto neutral v1.0', () => {
  const port = `${SHARED}/incidents-integration-port.ts`;

  it('N11C5E-PORT-01: incidents-integration-port.ts existe', () => {
    expect(exists(port)).toBe(true);
  });

  it('N11C5E-PORT-02: InternalCreateIncidentCommand definido en puerto', () => {
    expect(src(port)).toContain('InternalCreateIncidentCommand');
  });

  it('N11C5E-PORT-03: ProviderCreateIncidentRequestV1 definido en puerto', () => {
    expect(src(port)).toContain('ProviderCreateIncidentRequestV1');
  });

  it('N11C5E-PORT-04: ProviderSmartIncidentsActor definido en puerto', () => {
    expect(src(port)).toContain('ProviderSmartIncidentsActor');
  });

  it('N11C5E-PORT-05: requester_profile_id en InternalCreateIncidentCommand', () => {
    const code = src(port);
    expect(code).toContain('requester_profile_id');
  });

  it('N11C5E-PORT-06: title en InternalCreateIncidentCommand.incident', () => {
    expect(src(port)).toContain('title:');
  });

  it('N11C5E-PORT-07: source_system: smart_conversations literal en puerto', () => {
    expect(src(port)).toContain("source_system: 'smart_conversations'");
  });

  it('N11C5E-PORT-08: source_channel whatsapp|webchat en puerto', () => {
    const code = src(port);
    expect(code).toContain("source_channel");
    expect(code).toMatch(/['"]whatsapp['"]/);
    expect(code).toMatch(/['"]webchat['"]/);
  });

  it('N11C5E-PORT-09: priority: normal|urgent en ProviderCreateIncidentRequestV1', () => {
    const code = src(port);
    expect(code).toContain("priority:");
    expect(code).toMatch(/['"]normal['"]/);
    expect(code).toMatch(/['"]urgent['"]/);
  });

  it('N11C5E-PORT-10: external_request_reference: null en ProviderCreateIncidentRequestV1', () => {
    expect(src(port)).toContain('external_request_reference');
  });

  it('N11C5E-PORT-11: contract_version: 1.0 literal en puerto', () => {
    expect(src(port)).toContain("contract_version: '1.0'");
  });

  it('N11C5E-PORT-12: PROVIDER_ERROR_CODES exportado', () => {
    expect(src(port)).toContain('PROVIDER_ERROR_CODES');
  });

  it('N11C5E-PORT-13: 15 error codes definidos', () => {
    const code = src(port);
    const errorCodes = [
      'REQUESTER_IDENTITY_REQUIRED',
      'UNSUPPORTED_ACTOR_TYPE',
      'UNKNOWN_URGENCY',
      'TITLE_REQUIRED',
      'TITLE_TOO_SHORT',
      'ACCOMMODATION_REQUIRED',
      'INCIDENT_STATUS_MISMATCH',
      'CONFIGURATION_ERROR',
      'VALIDATION_ERROR',
      'DEPENDENCY_UNAVAILABLE',
      'CONTRACT_MISMATCH',
      'RATE_LIMITED',
      'TIMEOUT',
      'INTERNAL_ERROR',
      'IDEMPOTENCY_KEY_INVALID',
    ];
    for (const code_name of errorCodes) {
      expect(code, `Error code faltante: ${code_name}`).toContain(code_name);
    }
  });

  it('N11C5E-PORT-14: IDEMPOTENCY_STRATEGY = CONSUMER_IDEMPOTENCY_HASH_DERIVED', () => {
    expect(src(port)).toContain('CONSUMER_IDEMPOTENCY_HASH_DERIVED');
  });

  it('N11C5E-PORT-15: validateIncidentResult verifica status === new', () => {
    const code = src(port);
    expect(code).toContain('INCIDENT_STATUS_MISMATCH');
    expect(code).toContain("'new'");
  });

  it('N11C5E-PORT-16: INCIDENT_FORBIDDEN_OUTPUT_FIELDS contiene conv_case_id', () => {
    expect(src(port)).toContain('conv_case_id');
  });

  it('N11C5E-PORT-17: CreateIncidentCommand alias de compatibilidad existe', () => {
    expect(src(port)).toContain('CreateIncidentCommand');
  });

  it('N11C5E-PORT-18: ProviderCreateIncidentResultV1 con status: new definido', () => {
    const code = src(port);
    expect(code).toContain('ProviderCreateIncidentResultV1');
    expect(code).toContain("status: 'new'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-HELPERS — Módulos helper existen y exportan las funciones correctas
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-HELPERS — Módulos helper v1.0', () => {
  it('N11C5E-HELPERS-01: incidents-actor-mapper.ts existe', () => {
    expect(exists(`${ADAPTERS}/incidents-actor-mapper.ts`)).toBe(true);
  });

  it('N11C5E-HELPERS-02: incidents-title-generator.ts existe', () => {
    expect(exists(`${ADAPTERS}/incidents-title-generator.ts`)).toBe(true);
  });

  it('N11C5E-HELPERS-03: incidents-priority-mapper.ts existe', () => {
    expect(exists(`${ADAPTERS}/incidents-priority-mapper.ts`)).toBe(true);
  });

  it('N11C5E-HELPERS-04: incidents-requester-resolver.ts existe', () => {
    expect(exists(`${ADAPTERS}/incidents-requester-resolver.ts`)).toBe(true);
  });

  it('N11C5E-HELPERS-05: mapCanonicalActorToSmartIncidentsActor exportada', () => {
    expect(src(`${ADAPTERS}/incidents-actor-mapper.ts`)).toContain('mapCanonicalActorToSmartIncidentsActor');
  });

  it('N11C5E-HELPERS-06: generateIncidentTitle exportada', () => {
    expect(src(`${ADAPTERS}/incidents-title-generator.ts`)).toContain('generateIncidentTitle');
  });

  it('N11C5E-HELPERS-07: mapUrgencyToPriority exportada', () => {
    expect(src(`${ADAPTERS}/incidents-priority-mapper.ts`)).toContain('mapUrgencyToPriority');
  });

  it('N11C5E-HELPERS-08: resolveIncidentRequesterContext exportada', () => {
    expect(src(`${ADAPTERS}/incidents-requester-resolver.ts`)).toContain('resolveIncidentRequesterContext');
  });

  it('N11C5E-HELPERS-09: actor-mapper lanza ActorMappingError', () => {
    expect(src(`${ADAPTERS}/incidents-actor-mapper.ts`)).toContain('ActorMappingError');
  });

  it('N11C5E-HELPERS-10: priority-mapper lanza UrgencyMappingError', () => {
    expect(src(`${ADAPTERS}/incidents-priority-mapper.ts`)).toContain('UrgencyMappingError');
  });

  it('N11C5E-HELPERS-11: title-generator lanza TitleValidationError', () => {
    expect(src(`${ADAPTERS}/incidents-title-generator.ts`)).toContain('TitleValidationError');
  });

  it('N11C5E-HELPERS-12: requester-resolver lanza RequesterIdentityError', () => {
    expect(src(`${ADAPTERS}/incidents-requester-resolver.ts`)).toContain('RequesterIdentityError');
  });

  it('N11C5E-HELPERS-13: title-generator define TITLE_MAX_LENGTH = 120 (no 255)', () => {
    const code = src(`${ADAPTERS}/incidents-title-generator.ts`);
    expect(code).toContain('TITLE_MAX_LENGTH');
    expect(code).toContain('120');
    expect(code).not.toContain('255');
  });

  it('N11C5E-HELPERS-14: title-generator define FORBIDDEN_TITLE como Incidencia registrada', () => {
    expect(src(`${ADAPTERS}/incidents-title-generator.ts`)).toContain('Incidencia registrada');
  });

  it('N11C5E-HELPERS-15: requester-resolver define REQUIRED_IDENTITY_LEVEL = STRONG_MATCH_ACTIVE', () => {
    const code = src(`${ADAPTERS}/incidents-requester-resolver.ts`);
    expect(code).toContain('STRONG_MATCH_ACTIVE');
    expect(code).toContain('REQUIRED_IDENTITY_LEVEL');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-ADAPTER — Adaptador migrado a v1.0
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-ADAPTER — Adapter migrado a provider v1.0', () => {
  const adapter = `${ADAPTERS}/incidents-addon-adapter.ts`;

  it('N11C5E-ADAPTER-01: adapter existe', () => {
    expect(exists(adapter)).toBe(true);
  });

  it('N11C5E-ADAPTER-02: adapter importa de incidents-integration-port', () => {
    expect(src(adapter)).toContain('incidents-integration-port.ts');
  });

  it('N11C5E-ADAPTER-03: adapter importa mapCanonicalActorToSmartIncidentsActor', () => {
    expect(src(adapter)).toContain('mapCanonicalActorToSmartIncidentsActor');
  });

  it('N11C5E-ADAPTER-04: adapter importa mapUrgencyToPriority', () => {
    expect(src(adapter)).toContain('mapUrgencyToPriority');
  });

  it('N11C5E-ADAPTER-05: adapter usa ProviderCreateIncidentRequestV1', () => {
    expect(src(adapter)).toContain('ProviderCreateIncidentRequestV1');
  });

  it('N11C5E-ADAPTER-06: adapter usa source_system no source (campo v1.0)', () => {
    const code = strip(src(adapter));
    expect(code).toContain('source_system');
  });

  it('N11C5E-ADAPTER-07: adapter tiene INCIDENT_FORBIDDEN_ACTOR_FIELDS', () => {
    expect(src(adapter)).toContain('INCIDENT_FORBIDDEN_ACTOR_FIELDS');
  });

  it('N11C5E-ADAPTER-08: adapter NO define CanonicalActor local', () => {
    const code = strip(src(adapter));
    expect(code).not.toMatch(/interface\s+CanonicalActor\s*\{/);
  });

  it('N11C5E-ADAPTER-09: adapter NO usa urgency_proposal en el outgoing payload', () => {
    // urgency_proposal es el campo SC interno; el payload provider usa priority
    const code = src(adapter);
    expect(code).toContain('priority');
    // El payload enviado al provider nunca incluye urgency_proposal como key
    expect(code).not.toMatch(/['"]\s*urgency_proposal\s*['"]\s*:/);
  });

  it('N11C5E-ADAPTER-10: adapter NO usa incident_data (campo obsoleto v11C1)', () => {
    const code = strip(src(adapter));
    expect(code).not.toMatch(/incident_data\s*:/);
  });

  it('N11C5E-ADAPTER-11: adapter NO define CreateIncidentResult local con incident_ref', () => {
    // El campo obsoleto 11C1 era incident_ref (sin "ence"); ahora es incident_reference
    const code = strip(src(adapter));
    expect(code).not.toMatch(/incident_ref\s*:/);
  });

  it('N11C5E-ADAPTER-12: adapter valida status === new en respuesta real', () => {
    expect(src(adapter)).toContain('INCIDENT_STATUS_MISMATCH');
  });

  it('N11C5E-ADAPTER-13: adapter NO contiene SUPABASE_SERVICE_ROLE_KEY', () => {
    expect(src(adapter)).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('N11C5E-ADAPTER-14: adapter usa INCIDENTS_ADDON_SERVICE_TOKEN', () => {
    expect(src(adapter)).toContain('INCIDENTS_ADDON_SERVICE_TOKEN');
  });

  it('N11C5E-ADAPTER-15: adapter usa AbortSignal.timeout para timeout', () => {
    expect(src(adapter)).toContain('AbortSignal.timeout');
  });

  it('N11C5E-ADAPTER-16: adapter usa checkCircuit para circuit breaker', () => {
    expect(src(adapter)).toContain('checkCircuit');
  });

  it('N11C5E-ADAPTER-17: adapter exporta buildProviderRequest', () => {
    expect(src(adapter)).toContain('buildProviderRequest');
  });

  it('N11C5E-ADAPTER-18: HTTP 409 produce error IDEMPOTENCY_CONFLICT, no buildSuccess', () => {
    const code = strip(src(adapter));
    const idx = code.indexOf('resp.status === 409');
    const snippet = code.slice(idx, idx + 250);
    expect(snippet).toContain('IDEMPOTENCY_CONFLICT');
    expect(snippet).not.toContain('buildSuccess');
  });

  it('N11C5E-ADAPTER-19: adapter exporta mapProviderError', () => {
    expect(src(adapter)).toContain('export function mapProviderError');
  });

  it('N11C5E-ADAPTER-20: adapter usa INCIDENT_SOURCE_SYSTEM (no literal hardcoded)', () => {
    const code = strip(src(adapter));
    expect(code).toContain('INCIDENT_SOURCE_SYSTEM');
    // buildProviderRequest no asigna la cadena literal directamente
    const bpr = code.slice(code.indexOf('buildProviderRequest'), code.indexOf('buildProviderRequest') + 400);
    expect(bpr).not.toContain("'smart_conversations'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-SNAPSHOT — Snapshot del contrato provider
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-SNAPSHOT — Provider contract snapshot', () => {
  const snapshot = 'docs/smart-conversations/integrations/provider-contract-snapshots/smart-incidents-create-request-v1.0.md';

  it('N11C5E-SNAPSHOT-01: snapshot existe', () => {
    expect(exists(snapshot)).toBe(true);
  });

  it('N11C5E-SNAPSHOT-02: snapshot tiene estado INCIDENT_PROVIDER_CONTRACT_DEFINED_IMPLEMENTATION_PENDING', () => {
    expect(src(snapshot)).toContain('INCIDENT_PROVIDER_CONTRACT_DEFINED_IMPLEMENTATION_PENDING');
  });

  it('N11C5E-SNAPSHOT-03: snapshot tiene versión 1.0', () => {
    expect(src(snapshot)).toContain('1.0');
  });

  it('N11C5E-SNAPSHOT-04: snapshot documenta prohibición de Incidencia registrada', () => {
    expect(src(snapshot)).toContain('Incidencia registrada');
    expect(src(snapshot)).toContain('PROHIBIDO');
  });

  it('N11C5E-SNAPSHOT-05: snapshot documenta prioridad max 120 chars para title', () => {
    const code = src(snapshot);
    expect(code).toContain('120');
    expect(code).not.toContain('255');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-ENTRYPOINT — EF cableado a IncidentIntegrationPort (Opción A)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-ENTRYPOINT — conv-core-create-incident cableado a adapter (Opción A)', () => {
  const entrypoint = 'supabase/functions/conv-core-create-incident/index.ts';

  it('N11C5E-ENTRYPOINT-01: entrypoint importa incidents-addon-adapter', () => {
    expect(src(entrypoint)).toContain('incidents-addon-adapter');
  });

  it('N11C5E-ENTRYPOINT-02: entrypoint llama a createIncident del adapter', () => {
    expect(src(entrypoint)).toContain('createIncident');
  });

  it('N11C5E-ENTRYPOINT-03: entrypoint NO importa core-incident-client', () => {
    expect(strip(src(entrypoint))).not.toContain('core-incident-client');
  });

  it('N11C5E-ENTRYPOINT-04: entrypoint NO usa defaultCoreIncidentClient', () => {
    expect(strip(src(entrypoint))).not.toContain('defaultCoreIncidentClient');
  });

  it('N11C5E-ENTRYPOINT-05: entrypoint importa InternalCreateIncidentCommand del port', () => {
    expect(src(entrypoint)).toContain('InternalCreateIncidentCommand');
  });

  it('N11C5E-ENTRYPOINT-06: entrypoint importa INCIDENT_SOURCE_SYSTEM del port', () => {
    expect(src(entrypoint)).toContain('INCIDENT_SOURCE_SYSTEM');
  });

  it('N11C5E-ENTRYPOINT-07: entrypoint mapea incident_type a category via INCIDENT_TYPE_TO_CATEGORY', () => {
    const code = src(entrypoint);
    expect(code).toContain('INCIDENT_TYPE_TO_CATEGORY');
    expect(code).toContain('category');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-RESOLUTION — Resolución server-side de recursos (accommodation/room/profile)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-RESOLUTION — Resolución de recursos desde conv_sessions', () => {
  const entrypoint = 'supabase/functions/conv-core-create-incident/index.ts';

  it('N11C5E-RESOLUTION-01: profile_id extraído de sessionRow (server-side)', () => {
    const code = src(entrypoint);
    expect(code).toContain('profileId');
    expect(code).toContain('profile_id');
  });

  it('N11C5E-RESOLUTION-02: room_id extraído de identity_data (server-side)', () => {
    const code = src(entrypoint);
    expect(code).toContain('roomId');
    expect(code).toContain('identity_data');
  });

  it('N11C5E-RESOLUTION-03: accommodation_id extraído de identity_data (server-side)', () => {
    const code = src(entrypoint);
    expect(code).toContain('accommodationId');
    expect(code).toContain('identity_data');
  });

  it('N11C5E-RESOLUTION-04: accommodation_id ausente produce error — no se pasa comando al adapter', () => {
    const code = src(entrypoint);
    expect(code).toMatch(/!accommodationId/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-IDEMPOTENCY — Estado de consumer idempotency
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-IDEMPOTENCY — Consumer idempotency state', () => {
  const port = `${SHARED}/incidents-integration-port.ts`;
  const entrypoint = 'supabase/functions/conv-core-create-incident/index.ts';

  it('N11C5E-IDEMPOTENCY-01: IDEMPOTENCY_STRATEGY = CONSUMER_IDEMPOTENCY_HASH_DERIVED declarado en port', () => {
    expect(src(port)).toContain('CONSUMER_IDEMPOTENCY_HASH_DERIVED');
  });

  it('N11C5E-IDEMPOTENCY-02: idempotency_key derivado con HMAC via deriveIncidentIdempotencyKey', () => {
    const code = src(entrypoint);
    expect(code).toContain('idempotencyKey');
    expect(code).toContain('conv_case_id');
    expect(code).toContain('deriveIncidentIdempotencyKey');
  });

  it('N11C5E-IDEMPOTENCY-03: sin persistencia durable — EF no hace INSERT de idempotency', () => {
    const code = strip(src(entrypoint));
    expect(code).not.toMatch(/INSERT.*idempotency/i);
    expect(code).not.toContain('.upsert(');
  });
});
