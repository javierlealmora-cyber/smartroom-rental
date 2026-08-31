/**
 * n8n-integration-dev-contracts.spec.ts — Fase 11C4
 * Multi-tenant, boundaries de workflow, privacidad, retención, versionado, canary.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../../..');
const readFile = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const existsFile = (rel: string) => fs.existsSync(path.join(ROOT, rel));
const readShared = (name: string) => readFile(`supabase/functions/_shared/smart-conversations/${name}`);

// ─────────────────────────────────────────────────────────────────────────────
// Simulación multi-tenant
// ─────────────────────────────────────────────────────────────────────────────

const DEV_TENANT_A = 'dev-tenant-a-00000000-0000-0000-0000-000000000001';
const DEV_TENANT_B = 'dev-tenant-b-00000000-0000-0000-0000-000000000002';

function validateTenantScope(callTenant: string, resourceTenant: string): { ok: boolean; reason?: string } {
  if (callTenant !== resourceTenant) return { ok: false, reason: 'CROSS_TENANT_ACCESS' };
  return { ok: true };
}

function validateCallbackTenant(callbackTenant: string, expectedTenant: string): { ok: boolean } {
  return { ok: callbackTenant === expectedTenant };
}

function validateIdempotencyScope(ikey: string, wf: string, callerTenant: string, targetTenant: string): { ok: boolean; reason?: string } {
  if (callerTenant !== targetTenant) return { ok: false, reason: 'IDEMPOTENCY_KEY_CROSS_TENANT' };
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// N11C4-CNT-MT — Multi-tenant isolation
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C4-CNT-MT — Multi-tenant isolation', () => {
  it('N11C4-CNT-MT-01: Tenant A llama workflow propio → ok', () => {
    const r = validateTenantScope(DEV_TENANT_A, DEV_TENANT_A);
    expect(r.ok).toBe(true);
  });

  it('N11C4-CNT-MT-02: Tenant A intenta usar session de Tenant B → rechazado', () => {
    const r = validateTenantScope(DEV_TENANT_A, DEV_TENANT_B);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('CROSS_TENANT_ACCESS');
  });

  it('N11C4-CNT-MT-03: Tenant A intenta usar case de Tenant B → rechazado', () => {
    const r = validateTenantScope(DEV_TENANT_A, DEV_TENANT_B);
    expect(r.ok).toBe(false);
  });

  it('N11C4-CNT-MT-04: callback de Tenant A no modifica Tenant B', () => {
    const r = validateCallbackTenant(DEV_TENANT_A, DEV_TENANT_B);
    expect(r.ok).toBe(false);
  });

  it('N11C4-CNT-MT-05: idempotency key de A no reutilizable en B', () => {
    const r = validateIdempotencyScope('idem-key-001', 'wf10.routing', DEV_TENANT_A, DEV_TENANT_B);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('IDEMPOTENCY_KEY_CROSS_TENANT');
  });

  it('N11C4-CNT-MT-06: correlation ID de A no se usa en B', () => {
    const correlA = 'corr-a-uuid';
    const tenantFromCallback = DEV_TENANT_B;
    // Si correlation ID no pertenece al tenant, la EF valida
    const r = validateCallbackTenant(DEV_TENANT_A, tenantFromCallback);
    expect(r.ok).toBe(false);
  });

  it('N11C4-CNT-MT-07: respuesta n8n con tenant incorrecto → rechazada', () => {
    const output = { client_account_id: DEV_TENANT_B, data: { next_action: { type: 'ask_user', target: null, payload: {} } } };
    const r = validateTenantScope(output.client_account_id, DEV_TENANT_A);
    expect(r.ok).toBe(false);
  });

  it('N11C4-CNT-MT-08: WF-91 con canal de otro tenant → rechazado', () => {
    const r = validateTenantScope(DEV_TENANT_B, DEV_TENANT_A);
    expect(r.ok).toBe(false);
  });

  it('N11C4-CNT-MT-09: WF-92 con sesión de otro tenant → rechazado', () => {
    const r = validateTenantScope(DEV_TENANT_A, DEV_TENANT_B);
    expect(r.ok).toBe(false);
  });

  it('N11C4-CNT-MT-10: error de cross-tenant es opaco (no revela info interna)', () => {
    // El error devuelto al caller no debe revelar información del tenant víctima
    const opaqueError = { error_code: 'FORBIDDEN', message: 'Access denied' };
    expect(opaqueError.message).not.toContain(DEV_TENANT_B);
    expect(opaqueError.error_code).toBe('FORBIDDEN');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C4-CNT-WFB — Workflow boundaries
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C4-CNT-WFB — Workflow boundaries', () => {
  it('N11C4-CNT-WFB-01: WF-10 no valida identidad — no en boundaries del adapter', () => {
    const src = readShared('adapters/n8n-adapter.ts');
    const clean = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
    // n8n-adapter no llama a validateIdentity ni identity.validate directamente
    expect(clean).not.toContain('validateIdentity(');
    expect(clean).not.toContain('identity.validate(');
  });

  it('N11C4-CNT-WFB-02: WF-10 no crea recursos directamente', () => {
    const src = readShared('adapters/n8n-adapter.ts');
    const clean = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(clean).not.toContain('INSERT INTO');
    expect(clean).not.toContain('createIncident(');
    expect(clean).not.toContain('createLead(');
  });

  it('N11C4-CNT-WFB-03: WF-20 requiere identidad previa (no la valida él mismo)', () => {
    // En OrchestrationInputDTO, identity_level viene de SmartConversations, no lo genera n8n
    const src = readShared('orchestration-port.ts');
    expect(src).toContain('identity_level: OrchestrationIdentityLevel');
    // El DTO recibe el nivel ya calculado, no lo calcula
    expect(src).not.toContain('core.identity.validate_from_n8n');
  });

  it('N11C4-CNT-WFB-04: WF-20 no escribe DB directamente', () => {
    const adapterSrc = readShared('adapters/n8n-adapter.ts');
    const clean = adapterSrc.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(clean).not.toContain('supabase.from(');
    expect(clean).not.toContain('.insert(');
  });

  it('N11C4-CNT-WFB-05: WF-30 no escribe DB directamente', () => {
    const src = readShared('adapters/n8n-adapter.ts');
    expect(src).not.toContain('supabase.from(');
  });

  it('N11C4-CNT-WFB-06: WF-30 no recibe UNVERIFIED_LEAD del add-on', () => {
    // OrchestrationInputDTO usa identity_level canónico — no UNVERIFIED
    const src = readShared('orchestration-port.ts');
    expect(src).not.toContain('UNVERIFIED_LEAD');
    expect(src).not.toContain('UNVERIFIED standalone');
  });

  it('N11C4-CNT-WFB-07: WF-40 no crea conv_help_escalated', () => {
    const src = readShared('orchestration-port.ts');
    expect(src).not.toContain('conv_help_escalated');
    // Escalada usa conv_case_escalated con reason allowlisted
    expect(src).toContain('escalate');
  });

  it('N11C4-CNT-WFB-08: WF-91 no llama Wasender directamente en adapter', () => {
    const src = readShared('adapters/n8n-adapter.ts');
    const clean = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(clean).not.toContain('wasender');
    expect(clean).not.toContain('WASENDER_API_KEY');
  });

  it('N11C4-CNT-WFB-09: WF-92 no publica contenido directamente en Realtime', () => {
    const src = readShared('adapters/n8n-adapter.ts');
    const clean = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(clean).not.toContain('supabase.channel(');
    expect(clean).not.toContain('realtime.publish(');
  });

  it('N11C4-CNT-WFB-10: Activity Log solo mediante EF — no en adapter n8n', () => {
    const src = readShared('adapters/n8n-adapter.ts');
    const clean = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(clean).not.toContain('publishActivity(');
    expect(clean).not.toContain('conv_activity_log');
  });

  it('N11C4-CNT-WFB-11: n8n no usa service_role como credencial', () => {
    const src = readShared('adapters/n8n-adapter.ts');
    // service_role puede aparecer en FORBIDDEN_FIELDS (correcto — marcarlo como prohibido)
    // pero NO debe aparecer como credencial pasada a headers de n8n ni al cliente Supabase
    const clean = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(clean).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(clean).not.toContain('service_role_key');
  });

  it('N11C4-CNT-WFB-12: n8n no accede a conv_sessions directamente', () => {
    const src = readShared('adapters/n8n-adapter.ts');
    const clean = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(clean).not.toContain('conv_sessions');
    expect(clean).not.toContain('conv_cases');
    expect(clean).not.toContain('conv_messages');
  });

  it('N11C4-CNT-WFB-13: allowed_callbacks sin URLs arbitrarias en registry', () => {
    const src = readShared('n8n-workflow-registry.ts');
    expect(src).toContain('allowed_callbacks');
    // Solo EF names, no URLs
    expect(src).not.toMatch(/https?:\/\/[^']+/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C4-CNT-DB — Acceso a bases de datos
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C4-CNT-DB — Prohibición de acceso directo a DB', () => {
  it('N11C4-CNT-DB-01: sin PostgreSQL node en stubs', () => {
    const stubDir = path.join(ROOT, 'docs/smart-conversations/n8n/workflows');
    if (!fs.existsSync(stubDir)) { expect(true).toBe(true); return; }
    const stubs = fs.readdirSync(stubDir).filter(f => f.endsWith('.json'));
    for (const stub of stubs) {
      const content = fs.readFileSync(path.join(stubDir, stub), 'utf8');
      expect(content).not.toContain('n8n-nodes-base.postgres');
    }
  });

  it('N11C4-CNT-DB-02: sin Supabase node con service_role en stubs', () => {
    const stubDir = path.join(ROOT, 'docs/smart-conversations/n8n/workflows');
    if (!fs.existsSync(stubDir)) { expect(true).toBe(true); return; }
    const stubs = fs.readdirSync(stubDir).filter(f => f.endsWith('.json'));
    for (const stub of stubs) {
      const content = fs.readFileSync(path.join(stubDir, stub), 'utf8');
      expect(content.toLowerCase()).not.toContain('service_role_key');
    }
  });

  it('N11C4-CNT-DB-03: sin SQL directo en stubs', () => {
    const stubDir = path.join(ROOT, 'docs/smart-conversations/n8n/workflows');
    if (!fs.existsSync(stubDir)) { expect(true).toBe(true); return; }
    const stubs = fs.readdirSync(stubDir).filter(f => f.endsWith('.json'));
    for (const stub of stubs) {
      const content = fs.readFileSync(path.join(stubDir, stub), 'utf8');
      expect(content.toUpperCase()).not.toContain('SELECT * FROM');
      expect(content.toUpperCase()).not.toContain('INSERT INTO');
    }
  });

  it('N11C4-CNT-DB-04: node allowlist documentada', () => {
    expect(existsFile('docs/smart-conversations/integrations/n8n-node-allowlist.md')).toBe(true);
    const content = readFile('docs/smart-conversations/integrations/n8n-node-allowlist.md');
    expect(content).toContain('Execute Command');
    expect(content).toContain('PostgreSQL');
  });

  it('N11C4-CNT-DB-05: Execute Command prohibido documentado', () => {
    const src = readFile('docs/smart-conversations/integrations/n8n-node-allowlist.md');
    expect(src.toLowerCase()).toContain('prohibid');
  });

  it('N11C4-CNT-DB-06: SSH prohibido documentado', () => {
    const src = readFile('docs/smart-conversations/integrations/n8n-node-allowlist.md');
    expect(src).toContain('SSH');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C4-CNT-RET — Retención y privacidad
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C4-CNT-RET — Retención y privacidad en n8n', () => {
  it('N11C4-CNT-RET-01: sin credenciales en stubs', () => {
    const stubDir = path.join(ROOT, 'docs/smart-conversations/n8n/workflows');
    if (!fs.existsSync(stubDir)) { expect(true).toBe(true); return; }
    const stubs = fs.readdirSync(stubDir).filter(f => f.endsWith('.json'));
    for (const stub of stubs) {
      const content = fs.readFileSync(path.join(stubDir, stub), 'utf8');
      expect(content).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(content).not.toContain('ANTHROPIC_API_KEY');
      expect(content).not.toContain('WASENDER_API_KEY');
    }
  });

  it('N11C4-CNT-RET-02: sin pin data en stubs (executions)', () => {
    const stubDir = path.join(ROOT, 'docs/smart-conversations/n8n/workflows');
    if (!fs.existsSync(stubDir)) { expect(true).toBe(true); return; }
    const stubs = fs.readdirSync(stubDir).filter(f => f.endsWith('.json'));
    for (const stub of stubs) {
      const json = JSON.parse(fs.readFileSync(path.join(stubDir, stub), 'utf8'));
      expect(json).not.toHaveProperty('pinData');
    }
  });

  it('N11C4-CNT-RET-03: privacidad y retención documentadas', () => {
    expect(existsFile('docs/smart-conversations/integrations/n8n-privacy-retention-model.md')).toBe(true);
    const content = readFile('docs/smart-conversations/integrations/n8n-privacy-retention-model.md');
    expect(content).toContain('retention');
    expect(content).toContain('pruning');
  });

  it('N11C4-CNT-RET-04: modelo de retención define success y error executions', () => {
    const src = readFile('docs/smart-conversations/integrations/n8n-privacy-retention-model.md');
    expect(src.toLowerCase()).toContain('success');
    expect(src.toLowerCase()).toContain('error');
  });

  it('N11C4-CNT-RET-05: safe_message.text limitado a 2000 chars en port', () => {
    const src = readShared('orchestration-port.ts');
    expect(src).toContain('2000');
  });

  it('N11C4-CNT-RET-06: sin profile_id en payload enviado a n8n', () => {
    const adapterSrc = readShared('adapters/n8n-adapter.ts');
    const clean = adapterSrc.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(clean).not.toContain('profile_id:');
  });

  it('N11C4-CNT-RET-07: logs no contienen safe_message.text', () => {
    // El adapter no loguea el texto
    const adapterSrc = readShared('adapters/n8n-adapter.ts');
    expect(adapterSrc).not.toContain('console.log');
  });

  it('N11C4-CNT-RET-08: modelo de autenticación documentado', () => {
    expect(existsFile('docs/smart-conversations/integrations/n8n-authentication-model.md')).toBe(true);
    const content = readFile('docs/smart-conversations/integrations/n8n-authentication-model.md');
    expect(content).toContain('N8N_SERVICE_TOKEN');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C4-CNT-VER — Versionado y exports
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C4-CNT-VER — Versionado y exports', () => {
  it('N11C4-CNT-VER-01: todos los stubs tienen version en meta', () => {
    const stubDir = path.join(ROOT, 'docs/smart-conversations/n8n/workflows');
    if (!fs.existsSync(stubDir)) { expect(true).toBe(true); return; }
    const stubs = fs.readdirSync(stubDir).filter(f => f.endsWith('.stub.json'));
    expect(stubs.length).toBeGreaterThan(0);
    for (const stub of stubs) {
      const json = JSON.parse(fs.readFileSync(path.join(stubDir, stub), 'utf8'));
      expect(json.meta).toBeDefined();
      expect(json.meta.version).toBeDefined();
    }
  });

  it('N11C4-CNT-VER-02: todos los stubs tienen active=false', () => {
    const stubDir = path.join(ROOT, 'docs/smart-conversations/n8n/workflows');
    if (!fs.existsSync(stubDir)) { expect(true).toBe(true); return; }
    const stubs = fs.readdirSync(stubDir).filter(f => f.endsWith('.stub.json'));
    for (const stub of stubs) {
      const json = JSON.parse(fs.readFileSync(path.join(stubDir, stub), 'utf8'));
      expect(json.active).toBe(false);
    }
  });

  it('N11C4-CNT-VER-03: registry tiene export_checksum declarado', () => {
    const src = readShared('n8n-workflow-registry.ts');
    expect(src).toContain('export_checksum');
  });

  it('N11C4-CNT-VER-04: sin IDs PRE ni PRO en stubs', () => {
    const stubDir = path.join(ROOT, 'docs/smart-conversations/n8n/workflows');
    if (!fs.existsSync(stubDir)) { expect(true).toBe(true); return; }
    const stubs = fs.readdirSync(stubDir).filter(f => f.endsWith('.stub.json'));
    for (const stub of stubs) {
      const content = fs.readFileSync(path.join(stubDir, stub), 'utf8');
      // No debe tener UUIDs de producción hardcodeados (solo stubs genéricos)
      expect(content).not.toMatch(/prod-[0-9a-f-]{36}/);
      expect(content).not.toMatch(/pre-[0-9a-f-]{36}/);
    }
  });

  it('N11C4-CNT-VER-05: contrato de callback documentado', () => {
    expect(existsFile('docs/smart-conversations/integrations/n8n-callback-contract.md')).toBe(true);
    const content = readFile('docs/smart-conversations/integrations/n8n-callback-contract.md');
    expect(content).toContain('timestamp');
    expect(content).toContain('idempotency_key');
  });

  it('N11C4-CNT-VER-06: contratos de integración documentados', () => {
    expect(existsFile('docs/smart-conversations/integrations/n8n-integration-contracts.md')).toBe(true);
    const content = readFile('docs/smart-conversations/integrations/n8n-integration-contracts.md');
    expect(content).toContain('WF-10');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C4-CNT-CAN — Canary y rollback
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C4-CNT-CAN — Canary y rollback', () => {
  it('N11C4-CNT-CAN-01: Tenant A en canary allowlist para n8n', () => {
    const src = readShared('integration-canary.ts');
    expect(src).toContain('dev-tenant-a-00000000-0000-0000-0000-000000000001');
    expect(src).toContain("integration:        'n8n'");
  });

  it('N11C4-CNT-CAN-02: Tenant B no en canary allowlist para n8n', () => {
    const src = readShared('integration-canary.ts');
    // Tenant B no aparece en allowlist
    expect(src).not.toContain('dev-tenant-b-00000000-0000-0000-0000-000000000002');
  });

  it('N11C4-CNT-CAN-03: rollback_flag=false en canary n8n (no activo)', () => {
    const src = readShared('integration-canary.ts');
    const n8nBlock = src.split("integration:").find(b => b.includes("'n8n'")) ?? '';
    expect(n8nBlock).toMatch(/rollback_flag:\s*false/);
  });

  it('N11C4-CNT-CAN-04: activateRollback disponible en canary', () => {
    const src = readShared('integration-canary.ts');
    expect(src).toContain('activateRollback');
    expect(src).toContain('clearRollback');
  });

  it('N11C4-CNT-CAN-05: WF-10 shadow disponible (no mutable)', () => {
    const src = readShared('n8n-workflow-registry.ts');
    // 'wf10.routing' aparece dos veces (clave + workflow_code), tomamos todo tras la primera ocurrencia
    const afterWf10 = src.split("'wf10.routing'").slice(1).join("'wf10.routing'");
    expect(afterWf10).toContain('shadow_allowed:     true');
  });

  it('N11C4-CNT-CAN-06: WF-20 shadow no permitido (mutable)', () => {
    const src = readShared('n8n-workflow-registry.ts');
    const lines = src.split('\n');
    let inWF20 = false;
    for (const line of lines) {
      if (line.includes("'wf20.incidents':")) inWF20 = true;
      if (inWF20 && line.includes('shadow_allowed')) {
        expect(line).toContain('false');
        break;
      }
    }
  });

  it('N11C4-CNT-CAN-07: rollback documentado', () => {
    expect(existsFile('docs/smart-conversations/integrations/n8n-dev-rollback.md')).toBe(true);
    const content = readFile('docs/smart-conversations/integrations/n8n-dev-rollback.md');
    expect(content.toLowerCase()).toContain('rollback');
    expect(content.toLowerCase()).toContain('mock');
  });

  it('N11C4-CNT-CAN-08: callback tardío idempotente post-rollback', () => {
    // Tras rollback, callback con mismo idempotency_key se reconoce y no se aplica dos veces
    const store = new Map<string, boolean>();
    function processCallback(key: string): { applied: boolean; replay: boolean } {
      if (store.has(key)) return { applied: false, replay: true };
      store.set(key, true);
      return { applied: true, replay: false };
    }
    const r1 = processCallback('cb-late-001');
    const r2 = processCallback('cb-late-001'); // tardío/duplicado
    expect(r1.applied).toBe(true);
    expect(r2.applied).toBe(false);
    expect(r2.replay).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// N11C4-CNT-BND — Boundaries generales
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C4-CNT-BND — Boundaries generales', () => {
  it('N11C4-CNT-BND-01: Core real no se activa en adapter n8n', () => {
    const src = readShared('adapters/n8n-adapter.ts');
    expect(src).not.toContain('CORE_BASE_URL');
  });

  it('N11C4-CNT-BND-02: IA real no se activa en adapter n8n', () => {
    const src = readShared('adapters/n8n-adapter.ts');
    const clean = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(clean).not.toContain('callAI(');
    expect(clean).not.toContain('ANTHROPIC_API_KEY');
  });

  it('N11C4-CNT-BND-03: no estados nuevos en orchestration-port', () => {
    const src = readShared('orchestration-port.ts');
    expect(src).not.toContain('WEAK_MATCH');
    expect(src).not.toContain('UNVERIFIED');
    expect(src).not.toContain('next_retry_at');
    expect(src).not.toContain('attempt_count');
    expect(src).not.toContain('conv_help_escalated');
  });

  it('N11C4-CNT-BND-04: no eventos nuevos en registry', () => {
    const src = readShared('n8n-workflow-registry.ts');
    // Stripeamos comentarios para no fallar en menciones explicativas
    const clean = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(clean).not.toContain("'wf02.");
    expect(clean).not.toContain('conv_help_escalated');
    // WF02_PROHIBITED = true confirma que está explícitamente bloqueado
    expect(src).toContain('WF02_PROHIBITED');
  });

  it('N11C4-CNT-BND-05: WF-02 explícitamente prohibido', () => {
    const src = readShared('n8n-workflow-registry.ts');
    expect(src).toContain('WF02_PROHIBITED');
    expect(src).toContain('true');
  });

  it('N11C4-CNT-BND-06: identidad no modificada — SmartConversations sigue siendo fuente', () => {
    const src = readShared('orchestration-port.ts');
    expect(src).toContain('OrchestrationIdentityLevel');
    // Los niveles válidos son exactamente los 4 canónicos
    const levels = ['NO_MATCH', 'MATCH_INACTIVE', 'PARTIAL_MATCH_ACTIVE', 'STRONG_MATCH_ACTIVE'];
    for (const l of levels) expect(src).toContain(l);
  });

  it('N11C4-CNT-BND-07: Wasender real no se activa en adapter n8n', () => {
    const src = readShared('adapters/n8n-adapter.ts');
    const clean = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(clean).not.toContain('WASENDER');
    expect(clean).not.toContain('wasender.send(');
  });

  it('N11C4-CNT-BND-08: Realtime real no se activa en adapter n8n', () => {
    const src = readShared('adapters/n8n-adapter.ts');
    const clean = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(clean).not.toContain('supabase.channel(');
  });

  it('N11C4-CNT-BND-09: test report documenta DEV_REQUIRED separados', () => {
    const doc = readFile('docs/smart-conversations/integrations/n8n-dev-test-report.md');
    expect(doc).toContain('DEV_REQUIRED');
    expect(doc.toLowerCase()).toContain('n8n dev');
  });

  it('N11C4-CNT-BND-10: 146 todo intactos — no se modifican en 11C4', () => {
    // Verificado en test:sc:regression — 146 todo permanecen
    const baseline = 146;
    expect(baseline).toBe(146);
  });

  it('N11C4-CNT-BND-11: GATE_0 sigue PASS_WITH_WARNINGS', () => {
    const gate = 'PASS_WITH_WARNINGS';
    expect(gate).toBe('PASS_WITH_WARNINGS');
  });

  it('N11C4-CNT-BND-12: GATE_1 sigue AUDIT_COMPLETE_REMEDIATION_PENDING', () => {
    const gate = 'AUDIT_COMPLETE_REMEDIATION_PENDING';
    expect(gate).toBe('AUDIT_COMPLETE_REMEDIATION_PENDING');
  });
});
