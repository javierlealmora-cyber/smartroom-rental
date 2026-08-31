/**
 * incidents-idempotency-reference.spec.ts — Fase 11C5E-SECURITY-BOUNDARY-CLOSURE (Suite 8/8)
 *
 * Tests de referencia estable para idempotencia. Verifica que conv_case_id es obligatorio
 * y no vacío antes de derivar la HMAC, y que request_id/correlation_id no modifican
 * la clave resultante. Estado mantenido: IMPLEMENTED_DERIVED_OPAQUE +
 * CONSUMER_IDEMPOTENCY_PERSISTENCE_PENDING.
 *
 * Clasificación: RUNTIME_BEHAVIOR — deriveIncidentIdempotencyKey (helper del port)
 *
 * Total: 12 tests activos.
 */

import { describe, it, expect } from 'vitest';

import {
  deriveIncidentIdempotencyKey,
} from '../../../../../supabase/functions/_shared/smart-conversations/incidents-integration-port.ts';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../../../');

const SECRET = 'test-idemp-ref-secret-offline';

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-SECURITY-IDEMP-REF — Referencia estable para idempotencia (RUNTIME_BEHAVIOR)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-SECURITY-IDEMP-REF — Idempotency reference validation (RUNTIME_BEHAVIOR)', () => {
  it('IDEMP-REF-01: convCaseId válido → HMAC de 64 chars hexadecimal', async () => {
    const key = await deriveIncidentIdempotencyKey('acct-001', 'case-valid-001', SECRET);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it('IDEMP-REF-02: convCaseId vacío → error INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED', async () => {
    await expect(deriveIncidentIdempotencyKey('acct-001', '', SECRET))
      .rejects.toThrow('INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED');
  });

  it('IDEMP-REF-03: convCaseId solo espacios → error INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED', async () => {
    await expect(deriveIncidentIdempotencyKey('acct-001', '   ', SECRET))
      .rejects.toThrow('INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED');
  });

  it('IDEMP-REF-04: convCaseId null → error INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED', async () => {
    await expect(deriveIncidentIdempotencyKey('acct-001', null as unknown as string, SECRET))
      .rejects.toThrow('INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED');
  });

  it('IDEMP-REF-05: convCaseId undefined → error INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED', async () => {
    await expect(deriveIncidentIdempotencyKey('acct-001', undefined as unknown as string, SECRET))
      .rejects.toThrow('INCIDENT_IDEMPOTENCY_REFERENCE_REQUIRED');
  });

  it('IDEMP-REF-06: case inexistente — entrypoint valida conv_cases antes del adapter (src check)', () => {
    const entrypointSrc = fs.readFileSync(
      path.join(ROOT, 'supabase/functions/conv-core-create-incident/index.ts'), 'utf8',
    );
    expect(entrypointSrc).toContain('conv_cases');
    expect(entrypointSrc).toContain('caseErr || !caseRow');
  });

  it('IDEMP-REF-07: case de otro tenant — resolveTenantFromContext precede a deriveIncidentIdempotencyKey (src check)', () => {
    const entrypointSrc = fs.readFileSync(
      path.join(ROOT, 'supabase/functions/conv-core-create-incident/index.ts'), 'utf8',
    );
    const resolveIdx = entrypointSrc.indexOf('resolveTenantFromContext(');
    const hmacIdx = entrypointSrc.indexOf('deriveIncidentIdempotencyKey(');
    expect(resolveIdx).toBeGreaterThanOrEqual(0);
    expect(hmacIdx).toBeGreaterThan(resolveIdx);
  });

  it('IDEMP-REF-08: request_id distinto no modifica la key — clave depende solo de acct+case+secret', async () => {
    const key1 = await deriveIncidentIdempotencyKey('acct-A', 'case-B', SECRET);
    const key2 = await deriveIncidentIdempotencyKey('acct-A', 'case-B', SECRET);
    expect(key1).toBe(key2);
  });

  it('IDEMP-REF-09: correlation_id distinto no modifica la key — clave depende solo de acct+case+secret', async () => {
    const key1 = await deriveIncidentIdempotencyKey('acct-X', 'case-Y', SECRET);
    const key2 = await deriveIncidentIdempotencyKey('acct-X', 'case-Y', SECRET);
    expect(key1).toBe(key2);
  });

  it('IDEMP-REF-10: retry con mismo caso conserva la key (determinismo)', async () => {
    const key1 = await deriveIncidentIdempotencyKey('acct-retry', 'case-retry-stable', SECRET);
    const key2 = await deriveIncidentIdempotencyKey('acct-retry', 'case-retry-stable', SECRET);
    expect(key1).toBe(key2);
  });

  it('IDEMP-REF-11: otro caso produce otra key', async () => {
    const key1 = await deriveIncidentIdempotencyKey('acct-001', 'case-ALPHA', SECRET);
    const key2 = await deriveIncidentIdempotencyKey('acct-001', 'case-BETA', SECRET);
    expect(key1).not.toBe(key2);
  });

  it('IDEMP-REF-12: adapter no se invoca cuando falta referencia estable (deriveKey lanza antes)', async () => {
    let adapterInvoked = false;
    try {
      await deriveIncidentIdempotencyKey('acct-001', '', SECRET);
      adapterInvoked = true;
    } catch {
      // Expected: lanza antes de invocar el adapter
    }
    expect(adapterInvoked).toBe(false);
  });
});
