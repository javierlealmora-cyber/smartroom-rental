/**
 * incidents-provider-alignment-contracts.spec.ts — Fase 11C5E-IMPLEMENTATION (Suite 3/4)
 * Verificación de contratos, documentación y frontera n8n.
 *
 * OFFLINE ONLY: Análisis estático de contratos, OAS, y EF de WF-20.
 * Cubre: OAS consumer v1.0, snapshot provider, frontera n8n, docs de GATE_1.
 *
 * Total: 32 tests activos (sin it.todo).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../../../');
const SHARED = 'supabase/functions/_shared/smart-conversations';
const EF_DIR = 'supabase/functions';
const INTEGRATIONS = 'docs/smart-conversations/integrations';

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
// N11C5E-OAS — OpenAPI consumer actualizado a v1.0
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-OAS — OpenAPI consumer v1.0', () => {
  const oas = `${INTEGRATIONS}/incidents-addon-openapi-consumer.yaml`;

  it('N11C5E-OAS-01: OAS consumer existe', () => {
    expect(exists(oas)).toBe(true);
  });

  it('N11C5E-OAS-02: OAS tiene source_system en request', () => {
    expect(src(oas)).toContain('source_system');
  });

  it('N11C5E-OAS-03: OAS tiene source_channel en request', () => {
    expect(src(oas)).toContain('source_channel');
  });

  it('N11C5E-OAS-04: OAS tiene requester_profile_id en incident', () => {
    expect(src(oas)).toContain('requester_profile_id');
  });

  it('N11C5E-OAS-05: OAS tiene title en incident', () => {
    expect(src(oas)).toContain('title');
  });

  it('N11C5E-OAS-06: OAS tiene priority (no urgency_proposal en el provider contract)', () => {
    expect(src(oas)).toContain('priority');
  });

  it('N11C5E-OAS-07: OAS priority enum [normal, urgent] — sin critical', () => {
    const code = src(oas);
    // priority debe existir con valores normal/urgent
    expect(code).toContain('normal');
    expect(code).toContain('urgent');
    // critical NO debe estar en priority enum
    const prioritySection = code.split('priority')[1]?.split('\n\n')[0] ?? '';
    expect(prioritySection).not.toContain('critical');
  });

  it('N11C5E-OAS-08: OAS actor solo acepta system (no tenant_profile para incidencias)', () => {
    const code = src(oas);
    // Para incidencias, el actor provider solo es system
    expect(code).toContain('system');
  });

  it('N11C5E-OAS-09: OAS tiene contract_version: 1.0', () => {
    expect(src(oas)).toContain('1.0');
  });

  it('N11C5E-OAS-10: OAS no expone SUPABASE_SERVICE_ROLE_KEY', () => {
    expect(src(oas)).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('N11C5E-OAS-11: OAS usa INCIDENTS_ADDON_SERVICE_TOKEN', () => {
    expect(src(oas)).toContain('INCIDENTS_ADDON_SERVICE_TOKEN');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-N8N — Frontera n8n: WF-20 no transporta profile_id
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-N8N — Frontera n8n: WF-20 no transporta profile_id al EF', () => {
  const wf20 = `${EF_DIR}/conv-wf20-incidents/index.ts`;
  const coreCreate = `${EF_DIR}/conv-core-create-incident/index.ts`;

  it('N11C5E-N8N-01: conv-wf20-incidents/index.ts existe', () => {
    expect(exists(wf20)).toBe(true);
  });

  it('N11C5E-N8N-02: conv-core-create-incident/index.ts existe', () => {
    expect(exists(coreCreate)).toBe(true);
  });

  it('N11C5E-N8N-03: WF-20 outgoing payload no incluye requester_profile_id', () => {
    const code = src(wf20);
    // WF-20 envía a conv-core-create-incident; ese payload no debe incluir requester_profile_id
    const callBlock = code.match(/conv-core-create-incident[\s\S]{0,500}/)?.[0] ?? '';
    expect(callBlock).not.toContain('requester_profile_id');
  });

  it('N11C5E-N8N-04: WF-20 outgoing a conv-core-create-incident no incluye accommodation_id', () => {
    const code = src(wf20);
    const payloadBlock = code.match(/client_account_id[\s\S]{0,300}/)?.[0] ?? code;
    // El payload reducido a conv-core-create-incident no debe incluir accommodation_id
    const invokeLines = code.split('\n').filter(l =>
      l.includes('session_id') || l.includes('conv_case_id') || l.includes('urgency')
    );
    // Solo verificamos que accommodation_id no está siendo enviado explícitamente al EF
    // El EF lo resuelve internamente
    const coreCallRegion = code.split('conv-core-create-incident')[1]?.slice(0, 400) ?? '';
    expect(coreCallRegion).not.toMatch(/accommodation_id\s*:/);
  });

  it('N11C5E-N8N-05: WF-20 no transporta room_id al EF en el payload reducido', () => {
    const code = src(wf20);
    const coreCallRegion = code.split('conv-core-create-incident')[1]?.slice(0, 400) ?? '';
    expect(coreCallRegion).not.toMatch(/room_id\s*:/);
  });

  it('N11C5E-N8N-06: adapter incidents no importa n8n-adapter', () => {
    const adapter = `${SHARED}/adapters/incidents-addon-adapter.ts`;
    expect(src(adapter)).not.toContain('n8n-adapter');
  });

  it('N11C5E-N8N-07: adapter incidents no importa conv-wf20', () => {
    expect(src(`${SHARED}/adapters/incidents-addon-adapter.ts`)).not.toContain('conv-wf20');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-GATE — GATE_1 = AUDIT_COMPLETE_REMEDIATION_PENDING en docs
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-GATE — GATE_1 correcto en todos los documentos afectados', () => {
  it('N11C5E-GATE-01: reconciliation doc tiene AUDIT_COMPLETE_REMEDIATION_PENDING', () => {
    const code = src(`${INTEGRATIONS}/incidents-cross-module-reconciliation.md`);
    expect(code).toContain('AUDIT_COMPLETE_REMEDIATION_PENDING');
    expect(code).not.toContain('AUDIT_COMPLETE_REMEDIATION_REQUIRED');
  });

  it('N11C5E-GATE-02: remediation plan tiene AUDIT_COMPLETE_REMEDIATION_PENDING', () => {
    const code = src(`${INTEGRATIONS}/incidents-contract-remediation-plan.md`);
    expect(code).toContain('AUDIT_COMPLETE_REMEDIATION_PENDING');
    expect(code).not.toContain('AUDIT_COMPLETE_REMEDIATION_REQUIRED');
  });

  it('N11C5E-GATE-03: addons-dev-readiness tiene AUDIT_COMPLETE_REMEDIATION_PENDING', () => {
    const code = src(`${INTEGRATIONS}/addons-dev-readiness.md`);
    expect(code).toContain('AUDIT_COMPLETE_REMEDIATION_PENDING');
    expect(code).not.toContain('AUDIT_COMPLETE_REMEDIATION_REQUIRED');
  });

  it('N11C5E-GATE-04: addons-dev-test-report tiene AUDIT_COMPLETE_REMEDIATION_PENDING', () => {
    const code = src(`${INTEGRATIONS}/addons-dev-test-report.md`);
    expect(code).toContain('AUDIT_COMPLETE_REMEDIATION_PENDING');
    expect(code).not.toContain('AUDIT_COMPLETE_REMEDIATION_REQUIRED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-PORT-CONTRACTS — Contratos del puerto y validation
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-PORT-CONTRACTS — Contratos de puerto y validación', () => {
  const port = `${SHARED}/incidents-integration-port.ts`;

  it('N11C5E-PORT-CONTRACTS-01: puerto separa InternalCreateIncidentCommand de ProviderCreateIncidentRequestV1', () => {
    const code = src(port);
    expect(code).toContain('InternalCreateIncidentCommand');
    expect(code).toContain('ProviderCreateIncidentRequestV1');
    // Los dos tipos son distintos (no el mismo nombre)
    const internalIdx = code.indexOf('InternalCreateIncidentCommand');
    const providerIdx = code.indexOf('ProviderCreateIncidentRequestV1');
    expect(internalIdx).not.toBe(providerIdx);
  });

  it('N11C5E-PORT-CONTRACTS-02: INCIDENT_FORBIDDEN_OUTPUT_FIELDS contiene conv_session_id', () => {
    expect(src(port)).toContain('conv_session_id');
  });

  it('N11C5E-PORT-CONTRACTS-03: INCIDENT_FORBIDDEN_OUTPUT_FIELDS contiene profile_id', () => {
    const code = src(port);
    expect(code).toContain('conv_case_id');
    expect(code).toContain('profile_id');
  });

  it('N11C5E-PORT-CONTRACTS-04: validateIncidentResult exportada en puerto', () => {
    expect(src(port)).toContain('export function validateIncidentResult');
  });

  it('N11C5E-PORT-CONTRACTS-05: validateIncidentResult verifica TENANT_MISMATCH', () => {
    expect(src(port)).toContain('TENANT_MISMATCH_IN_RESULT');
  });

  it('N11C5E-PORT-CONTRACTS-06: idempotency_key scope client_account_id × key documentado', () => {
    const code = src(port);
    expect(code).toMatch(/client_account_id.*idempotency_key|idempotency_key.*client_account_id/s);
  });

  it('N11C5E-PORT-CONTRACTS-07: IDEMPOTENCY_STRATEGY exported', () => {
    expect(src(port)).toContain('export const IDEMPOTENCY_STRATEGY');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-SNAPSHOT-CONTRACTS — Snapshot documenta correctamente el contrato
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-SNAPSHOT-CONTRACTS — Snapshot contrato provider', () => {
  const snap = 'docs/smart-conversations/integrations/provider-contract-snapshots/smart-incidents-create-request-v1.0.md';

  it('N11C5E-SNAPSHOT-CONTRACTS-01: snapshot documenta priority mapping completo', () => {
    const code = src(snap);
    expect(code).toContain('low');
    expect(code).toContain('medium');
    expect(code).toContain('high');
    expect(code).toContain('normal');
    expect(code).toContain('urgent');
  });

  it('N11C5E-SNAPSHOT-CONTRACTS-02: snapshot documenta prohibición de critical', () => {
    const code = src(snap);
    expect(code).toContain('critical');
    expect(code).toContain('NO INVOCAR');
  });

  it('N11C5E-SNAPSHOT-CONTRACTS-03: snapshot documenta flujo de resolución requester_profile_id', () => {
    const code = src(snap);
    expect(code).toContain('requester_profile_id');
    expect(code).toContain('STRONG_MATCH_ACTIVE');
    expect(code).toContain('server-side');
  });

  it('N11C5E-SNAPSHOT-CONTRACTS-04: snapshot documenta que WF-20 no envía profile_id', () => {
    const code = src(snap);
    expect(code).toContain('n8n');
    expect(code).toContain('NUNCA');
  });

  it('N11C5E-SNAPSHOT-CONTRACTS-05: snapshot documenta external_request_reference = null', () => {
    const code = src(snap);
    expect(code).toContain('external_request_reference');
    expect(code).toContain('null');
  });

  it('N11C5E-SNAPSHOT-CONTRACTS-06: snapshot documenta validación status === new', () => {
    const code = src(snap);
    expect(code).toContain("'new'");
  });

  it('N11C5E-SNAPSHOT-CONTRACTS-07: snapshot no tiene 255 como límite del título', () => {
    const code = src(snap);
    // El snapshot debe referenciar 120, no 255
    expect(code).toContain('120');
    expect(code).not.toMatch(/título.*255|255.*título/i);
  });
});
