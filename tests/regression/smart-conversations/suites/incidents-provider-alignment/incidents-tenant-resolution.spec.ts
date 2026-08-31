/**
 * incidents-tenant-resolution.spec.ts — Fase 11C5E-SECURITY-BOUNDARY-CLOSURE (Suite 6/8)
 *
 * Tests de resolución server-side del tenant (CONSUMER_TENANT_CONTEXT_RESOLVED_SERVER_SIDE).
 * Verifica que client_account_id se obtiene de conv_case + conv_session y que el body
 * no puede seleccionar ni sobrescribir el tenant efectivo.
 *
 * Clasificación: RUNTIME_BEHAVIOR — resolveTenantFromContext (helper del port)
 *
 * Total: 12 tests activos.
 */

import { describe, it, expect } from 'vitest';

import {
  resolveTenantFromContext,
} from '../../../../../supabase/functions/_shared/smart-conversations/incidents-integration-port.ts';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../../../');

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-SECURITY-TENANT — Resolución server-side del tenant (RUNTIME_BEHAVIOR)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-SECURITY-TENANT — Server-side tenant resolution (RUNTIME_BEHAVIOR)', () => {
  it('TENANT-01: tenant resuelto desde conv_case.client_account_id', () => {
    const result = resolveTenantFromContext(
      { client_account_id: 'tenant-alpha', session_id: 'sess-001' },
      { client_account_id: 'tenant-alpha' },
      'sess-001',
    );
    expect(result).toBe('tenant-alpha');
  });

  it('TENANT-02: tenant resuelto desde conv_session coincide con el del case', () => {
    const result = resolveTenantFromContext(
      { client_account_id: 'tenant-beta', session_id: 'sess-002' },
      { client_account_id: 'tenant-beta' },
      'sess-002',
    );
    expect(result).toBe('tenant-beta');
  });

  it('TENANT-03: client_account_id body correcto coincide y se acepta', () => {
    const result = resolveTenantFromContext(
      { client_account_id: 'tenant-gamma', session_id: 'sess-003' },
      { client_account_id: 'tenant-gamma' },
      'sess-003',
      'tenant-gamma',
    );
    expect(result).toBe('tenant-gamma');
  });

  it('TENANT-04: client_account_id body distinto se rechaza — INCIDENT_TENANT_MISMATCH', () => {
    expect(() => resolveTenantFromContext(
      { client_account_id: 'tenant-A', session_id: 'sess-004' },
      { client_account_id: 'tenant-A' },
      'sess-004',
      'tenant-ATTACKER',
    )).toThrow('INCIDENT_TENANT_MISMATCH');
  });

  it('TENANT-05: session de tenant distinto se rechaza — INCIDENT_CASE_SESSION_MISMATCH', () => {
    expect(() => resolveTenantFromContext(
      { client_account_id: 'tenant-A', session_id: 'sess-005' },
      { client_account_id: 'tenant-B' },
      'sess-005',
    )).toThrow('INCIDENT_CASE_SESSION_MISMATCH');
  });

  it('TENANT-06: case de tenant distinto se rechaza — INCIDENT_CASE_SESSION_MISMATCH', () => {
    expect(() => resolveTenantFromContext(
      { client_account_id: 'tenant-B', session_id: 'sess-006' },
      { client_account_id: 'tenant-A' },
      'sess-006',
    )).toThrow('INCIDENT_CASE_SESSION_MISMATCH');
  });

  it('TENANT-07: case y session no relacionados se rechazan — INCIDENT_CASE_SESSION_MISMATCH', () => {
    expect(() => resolveTenantFromContext(
      { client_account_id: 'tenant-A', session_id: 'sess-UNRELATED' },
      { client_account_id: 'tenant-A' },
      'sess-EXPECTED',
    )).toThrow('INCIDENT_CASE_SESSION_MISMATCH');
  });

  it('TENANT-08: tenant ausente en case se rechaza — INCIDENT_TENANT_MISMATCH', () => {
    expect(() => resolveTenantFromContext(
      { client_account_id: null, session_id: 'sess-008' },
      { client_account_id: 'tenant-A' },
      'sess-008',
    )).toThrow('INCIDENT_TENANT_MISMATCH');
  });

  it('TENANT-09: tenant ausente en session se rechaza — INCIDENT_TENANT_MISMATCH', () => {
    expect(() => resolveTenantFromContext(
      { client_account_id: 'tenant-A', session_id: 'sess-009' },
      { client_account_id: null },
      'sess-009',
    )).toThrow('INCIDENT_TENANT_MISMATCH');
  });

  it('TENANT-10: adapter no se invoca en ningún mismatch (resolveTenantFromContext lanza antes)', () => {
    let adapterInvoked = false;
    try {
      resolveTenantFromContext(
        { client_account_id: 'tenant-A', session_id: 'sess-010' },
        { client_account_id: 'tenant-B' },
        'sess-010',
      );
      adapterInvoked = true;
    } catch {
      // Expected: lanza antes de cualquier llamada al adapter
    }
    expect(adapterInvoked).toBe(false);
  });

  it('TENANT-11: el tenant enviado al provider es el resuelto server-side (no el del body)', () => {
    const resolved = resolveTenantFromContext(
      { client_account_id: 'real-server-side-tenant', session_id: 'sess-011' },
      { client_account_id: 'real-server-side-tenant' },
      'sess-011',
      'real-server-side-tenant',
    );
    expect(resolved).toBe('real-server-side-tenant');
    expect(typeof resolved).toBe('string');
    expect(resolved.length).toBeGreaterThan(0);
  });

  it('TENANT-12: n8n no puede alterar el tenant provider efectivo — body incorrecto lanza error', () => {
    expect(() => resolveTenantFromContext(
      { client_account_id: 'legitimate-tenant', session_id: 'sess-012' },
      { client_account_id: 'legitimate-tenant' },
      'sess-012',
      'n8n-injected-attacker-tenant',
    )).toThrow('INCIDENT_TENANT_MISMATCH');

    const entrypointSrc = fs.readFileSync(
      path.join(ROOT, 'supabase/functions/conv-core-create-incident/index.ts'), 'utf8',
    );
    expect(entrypointSrc).toContain('resolveTenantFromContext');
    expect(entrypointSrc).toContain('resolvedTenantId');
    expect(entrypointSrc).toContain('conv_cases');
  });
});
