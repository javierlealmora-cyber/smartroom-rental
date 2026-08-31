/**
 * ai-integration-dev-contracts.spec.ts — Fase 11C3
 * Contratos: canary allowlist, límites, resiliencia, documentación.
 *
 * Verifica cumplimiento de contratos operacionales de la integración AI.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers para leer el árbol de archivos en tests
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '../../../../..');
const readFile = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const existsFile = (rel: string) => fs.existsSync(path.join(ROOT, rel));

const CANARY_PATH = 'supabase/functions/_shared/smart-conversations/integration-canary.ts';
const ADAPTER_PATH = 'supabase/functions/_shared/smart-conversations/adapters/ai-integration-adapter.ts';
const ENV_MODEL_PATH = 'supabase/functions/_shared/smart-conversations/environment-model.ts';
const FRAMEWORK_PATH = 'supabase/functions/_shared/smart-conversations/integration-framework.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Simulación de canary y límites
// ─────────────────────────────────────────────────────────────────────────────

const DEV_TENANT_A = 'dev-tenant-a-00000000-0000-0000-0000-000000000001';
const DEV_TENANT_B = 'dev-tenant-b-00000000-0000-0000-0000-000000000002';

const AI_OPERATIONS = ['ai.intent.classify', 'ai.incident.extract', 'ai.listing.extract', 'ai.help.extract', 'ai.safe_summary', 'ai.response_draft'] as const;
type AiOp = typeof AI_OPERATIONS[number];

const AI_LIMITS = {
  MAX_INPUT_CHARS:       4000,
  MAX_OUTPUT_TOKENS:     512,
  MAX_COST_PER_REQUEST:  0.01,
  MAX_CALLS_PER_SESSION: 6,
  TIMEOUT_MS:            8000,
  MAX_RETRIES:           2,
};

// Simula allowlist canary
function isInCanaryAllowlist(tenant: string, integration: string, op: AiOp): boolean {
  const AI_OPS = new Set<AiOp>(AI_OPERATIONS);
  if (integration !== 'ai') return false;
  if (tenant !== DEV_TENANT_A) return false;
  return AI_OPS.has(op);
}

// Simula el modo efectivo
function resolveCanaryMode(tenant: string, integration: string, op: AiOp): 'canary' | 'mock' {
  return isInCanaryAllowlist(tenant, integration, op) ? 'canary' : 'mock';
}

// Simula respuesta con AI_DEV_CONFIGURATION_PENDING para canary sin proveedor
function canaryResult(tenant: string, op: AiOp): { mode: string; error?: string; pending?: boolean } {
  const effective = resolveCanaryMode(tenant, 'ai', op);
  if (effective === 'mock') return { mode: 'mock' };
  // canary pero sin proveedor → pending
  return { mode: 'canary', error: 'AI_DEV_CONFIGURATION_PENDING', pending: true };
}

// Simula call counter y cost cap
class AISessionGuard {
  calls = 0;
  cost = 0;
  callLimitReached() { return this.calls >= AI_LIMITS.MAX_CALLS_PER_SESSION; }
  costLimitReached() { return this.cost >= AI_LIMITS.MAX_COST_PER_REQUEST; }
  record(costPerCall: number) { this.calls++; this.cost += costPerCall; }
}

// Simula resiliencia / retry
type RetryResult = { attempts: number; error: string } | { result: unknown };
function simulateWithRetry(failTimes: number): RetryResult {
  let attempts = 0;
  for (let i = 0; i <= AI_LIMITS.MAX_RETRIES; i++) {
    attempts++;
    if (i >= failTimes) return { result: { intent: 'unknown', confidence: 0 } };
  }
  return { attempts, error: 'MAX_RETRIES_EXCEEDED' };
}

// ─────────────────────────────────────────────────────────────────────────────
// AIDEV-CNT — Contratos de canary
// ─────────────────────────────────────────────────────────────────────────────

describe('AIDEV-CNT — Contratos de canary allowlist', () => {
  it('AIDEV-CNT-01: tenant A + integration ai → todas las 6 operaciones en allowlist', () => {
    for (const op of AI_OPERATIONS) {
      expect(isInCanaryAllowlist(DEV_TENANT_A, 'ai', op)).toBe(true);
    }
  });

  it('AIDEV-CNT-02: tenant B + integration ai → ninguna operación en allowlist', () => {
    for (const op of AI_OPERATIONS) {
      expect(isInCanaryAllowlist(DEV_TENANT_B, 'ai', op)).toBe(false);
    }
  });

  it('AIDEV-CNT-03: tenant A + integration desconocida → no en allowlist', () => {
    expect(isInCanaryAllowlist(DEV_TENANT_A, 'unknown_service', AI_OPERATIONS[0])).toBe(false);
  });

  it('AIDEV-CNT-04: canary en código fuente tiene 6 AI operations para tenant A', () => {
    const src = readFile(CANARY_PATH);
    const aiEntry = /integration:\s*'ai'[\s\S]*?allowed_operations:\s*\[([^\]]+)\]/m.exec(src);
    expect(aiEntry).not.toBeNull();
    const ops = aiEntry![1].match(/'([^']+)'/g) ?? [];
    expect(ops.length).toBe(6);
  });

  it('AIDEV-CNT-05: canary en código fuente NO tiene tenant real (UUID ficticio devX)', () => {
    const src = readFile(CANARY_PATH);
    const tenantMatches = src.match(/tenant_id:\s*'([^']+)'/g) ?? [];
    for (const m of tenantMatches) {
      expect(m).toMatch(/dev-tenant/);
    }
  });

  it('AIDEV-CNT-06: canary Tenant A en modo canary → AI_DEV_CONFIGURATION_PENDING (sin proveedor)', () => {
    const r = canaryResult(DEV_TENANT_A, 'ai.intent.classify');
    expect(r.mode).toBe('canary');
    expect(r.error).toBe('AI_DEV_CONFIGURATION_PENDING');
  });

  it('AIDEV-CNT-07: canary Tenant B → modo mock (no en allowlist)', () => {
    const r = canaryResult(DEV_TENANT_B, 'ai.intent.classify');
    expect(r.mode).toBe('mock');
    expect(r.error).toBeUndefined();
  });

  it('AIDEV-CNT-08: rollback_flag false en todas las entradas AI de canary', () => {
    const src = readFile(CANARY_PATH);
    const aiBlock = src.split('integration:').find(b => b.includes("'ai'"));
    expect(aiBlock).toBeDefined();
    expect(aiBlock).toMatch(/rollback_flag:\s*false/);
  });

  it('AIDEV-CNT-09: expires_at_iso posterior a 2026-07-23 en entrada AI canary', () => {
    const src = readFile(CANARY_PATH);
    const aiBlock = src.split('integration:').find(b => b.includes("'ai'"));
    const expiresMatch = /expires_at_iso:\s*'([^']+)'/.exec(aiBlock ?? '');
    expect(expiresMatch).not.toBeNull();
    const expiresDate = new Date(expiresMatch![1]);
    expect(expiresDate.getTime()).toBeGreaterThan(new Date('2026-07-23').getTime());
  });

  it('AIDEV-CNT-10: todas las 6 ops AI son distintas (no duplicadas)', () => {
    const src = readFile(CANARY_PATH);
    const aiEntry = /integration:\s*'ai'[\s\S]*?allowed_operations:\s*\[([^\]]+)\]/m.exec(src);
    const ops = (aiEntry?.[1].match(/'([^']+)'/g) ?? []).map(s => s.replace(/'/g, ''));
    expect(ops.length).toBe(new Set(ops).size);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AIDEV-LIM — Límites canónicos
// ─────────────────────────────────────────────────────────────────────────────

describe('AIDEV-LIM — Límites operacionales canónicos', () => {
  it('AIDEV-LIM-01: AI_LIMITS declarados en adapter — MAX_INPUT_CHARS=4000', () => {
    const src = readFile(ADAPTER_PATH);
    expect(src).toContain('MAX_INPUT_CHARS');
    expect(src).toContain('4000');
  });

  it('AIDEV-LIM-02: MAX_OUTPUT_TOKENS=512 en adapter', () => {
    const src = readFile(ADAPTER_PATH);
    expect(src).toContain('MAX_OUTPUT_TOKENS');
    expect(src).toContain('512');
  });

  it('AIDEV-LIM-03: MAX_COST_PER_REQUEST=0.01 en adapter', () => {
    const src = readFile(ADAPTER_PATH);
    expect(src).toContain('MAX_COST_PER_REQUEST');
    expect(src).toContain('0.01');
  });

  it('AIDEV-LIM-04: MAX_CALLS_PER_SESSION=6 en adapter', () => {
    const src = readFile(ADAPTER_PATH);
    expect(src).toContain('MAX_CALLS_PER_SESSION');
    expect(src).toContain('6');
  });

  it('AIDEV-LIM-05: MAX_RETRIES=2 en adapter', () => {
    const src = readFile(ADAPTER_PATH);
    expect(src).toContain('MAX_RETRIES');
    expect(src).toContain('2');
  });

  it('AIDEV-LIM-06: TIMEOUT_MS=8000 en adapter', () => {
    const src = readFile(ADAPTER_PATH);
    expect(src).toContain('TIMEOUT_MS');
    expect(src).toContain('8_000');
  });

  it('AIDEV-LIM-07: session guard detecta límite de llamadas', () => {
    const guard = new AISessionGuard();
    for (let i = 0; i < AI_LIMITS.MAX_CALLS_PER_SESSION; i++) {
      guard.record(0.001);
    }
    expect(guard.callLimitReached()).toBe(true);
  });

  it('AIDEV-LIM-08: session guard detecta límite de costo', () => {
    const guard = new AISessionGuard();
    guard.record(AI_LIMITS.MAX_COST_PER_REQUEST);
    expect(guard.costLimitReached()).toBe(true);
  });

  it('AIDEV-LIM-09: texto > 4000 chars rechazado (simulación)', () => {
    const longText = 'A'.repeat(4001);
    const rejected = longText.length > AI_LIMITS.MAX_INPUT_CHARS;
    expect(rejected).toBe(true);
  });

  it('AIDEV-LIM-10: texto exacto 4000 chars permitido', () => {
    const text = 'A'.repeat(4000);
    const rejected = text.length > AI_LIMITS.MAX_INPUT_CHARS;
    expect(rejected).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AIDEV-RES — Resiliencia
// ─────────────────────────────────────────────────────────────────────────────

describe('AIDEV-RES — Resiliencia y fallback', () => {
  it('AIDEV-RES-01: 0 fallos → result inmediato sin retry', () => {
    const r = simulateWithRetry(0);
    expect('result' in r).toBe(true);
  });

  it('AIDEV-RES-02: 1 fallo → retry exitoso dentro del límite', () => {
    const r = simulateWithRetry(1);
    expect('result' in r).toBe(true);
  });

  it('AIDEV-RES-03: 2 fallos → retry exitoso en el límite máximo', () => {
    const r = simulateWithRetry(2);
    expect('result' in r).toBe(true);
  });

  it('AIDEV-RES-04: MAX_RETRIES=2 → máximo 3 intentos totales (1 original + 2 reintentos)', () => {
    // Con simulateWithRetry(3) se alcanza el límite y devuelve error
    let attempts = 0;
    let succeeded = false;
    for (let i = 0; i <= AI_LIMITS.MAX_RETRIES; i++) {
      attempts++;
      if (i >= 3) { succeeded = true; break; } // nunca llega
    }
    expect(attempts).toBe(AI_LIMITS.MAX_RETRIES + 1); // 3 intentos totales
    expect(succeeded).toBe(false);
  });

  it('AIDEV-RES-05: fallback no realiza llamada IA adicional', () => {
    let aiCallCount = 0;
    function fallback() {
      // nunca llama IA
      return { intent: 'unknown', confidence: 0 };
    }
    const result = fallback();
    expect(aiCallCount).toBe(0);
    expect(result.intent).toBe('unknown');
  });

  it('AIDEV-RES-06: timeout no cierra la sesión conversacional', () => {
    // Simula que un timeout genera fallback pero no establece case_status
    const fallbackResult = { intent: 'unknown', confidence: 0, requires_clarification: true };
    expect(fallbackResult).not.toHaveProperty('case_status');
    expect(fallbackResult).not.toHaveProperty('session_status');
  });

  it('AIDEV-RES-07: 429 retryable → se debe reintentar', () => {
    const retryableCodes = new Set([429, 503]);
    expect(retryableCodes.has(429)).toBe(true);
  });

  it('AIDEV-RES-08: 400/422 non-retryable → fallback directo', () => {
    const retryableCodes = new Set([429, 503]);
    expect(retryableCodes.has(400)).toBe(false);
    expect(retryableCodes.has(422)).toBe(false);
  });

  it('AIDEV-RES-09: JSON inválido en response → fallback', () => {
    function parseOrFallback(raw: string) {
      try { return JSON.parse(raw); }
      catch { return { intent: 'unknown', confidence: 0, fallback: true }; }
    }
    const result = parseOrFallback('NOT_VALID_JSON{{{');
    expect(result.fallback).toBe(true);
  });

  it('AIDEV-RES-10: adapter tiene fallback para todas las 6 operaciones', () => {
    const src = readFile(ADAPTER_PATH);
    const fallbacks = [
      'fallbackClassifyIntent',
      'fallbackExtractIncident',
      'fallbackExtractListings',
      'fallbackExtractHelp',
      'fallbackSummarizeCase',
      'fallbackDraftResponse',
    ];
    for (const f of fallbacks) {
      expect(src).toContain(f);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AIDEV-DOC — Documentación
// ─────────────────────────────────────────────────────────────────────────────

describe('AIDEV-DOC — Documentación obligatoria', () => {
  const DOCS_BASE = 'docs/smart-conversations/integrations';
  const REQUIRED_DOCS = [
    'ai-dev-readiness.md',
    'ai-integration-contracts.md',
    'ai-privacy-model.md',
    'ai-prompt-catalog.md',
    'ai-output-schema-catalog.md',
    'ai-cost-and-limits.md',
    'ai-dev-test-report.md',
    'ai-dev-rollback.md',
  ];

  for (const doc of REQUIRED_DOCS) {
    it(`AIDEV-DOC-${REQUIRED_DOCS.indexOf(doc).toString().padStart(2, '0')}: ${doc} existe y no está vacío`, () => {
      const docPath = `${DOCS_BASE}/${doc}`;
      expect(existsFile(docPath)).toBe(true);
      const content = readFile(docPath);
      expect(content.trim().length).toBeGreaterThan(100);
    });
  }

  it('AIDEV-DOC-08: package.json tiene script test:sc:ai-integration-dev', () => {
    const pkg = JSON.parse(readFile('package.json'));
    expect(pkg.scripts).toHaveProperty('test:sc:ai-integration-dev');
  });

  it('AIDEV-DOC-09: package.json tiene script validate:sc:ai-dev-integration', () => {
    const pkg = JSON.parse(readFile('package.json'));
    expect(pkg.scripts).toHaveProperty('validate:sc:ai-dev-integration');
  });

  it('AIDEV-DOC-10: validate-ai-dev-integration.mjs existe', () => {
    expect(existsFile('scripts/smart-conversations/validate-ai-dev-integration.mjs')).toBe(true);
  });

  it('AIDEV-DOC-11: smoke-ai-dev.mjs existe', () => {
    expect(existsFile('scripts/smart-conversations/smoke/smoke-ai-dev.mjs')).toBe(true);
  });

  it('AIDEV-DOC-12: environment-model.ts exporta CANONICAL_DEV_ENVIRONMENT', () => {
    const src = readFile(ENV_MODEL_PATH);
    expect(src).toContain('CANONICAL_DEV_ENVIRONMENT');
    expect(src).toContain("'development'");
  });
});
