/**
 * integration-canary.ts — Allowlist canary explícita para Fase 11C1.
 *
 * Solo tenants ficticios de DEV pueden entrar en modo canary.
 * Ningún tenant real puede activarse accidentalmente en modo real/canary.
 * Sin hardcodeo de UUIDs de producción.
 *
 * El mecanismo allowlist es explícito por: tenant, integración, operación, periodo.
 */

import type { IntegrationMode } from './integration-framework.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface CanaryEntry {
  tenant_id: string;          // UUID ficticio DEV (no real)
  integration: string;
  allowed_operations: string[];
  activated_at_iso: string;
  expires_at_iso: string | null;
  responsible: string;
  rollback_flag: boolean;
}

export interface CanaryCheckResult {
  allowed: boolean;
  reason: 'in_allowlist' | 'not_in_allowlist' | 'expired' | 'rollback_active' | 'unknown_integration';
  effective_mode: IntegrationMode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Allowlist DEV — solo tenants ficticios
// Los UUIDs son ficticios de DEV; no corresponden a tenants reales de PRE/PRO.
// ─────────────────────────────────────────────────────────────────────────────

export const CANARY_ALLOWLIST: CanaryEntry[] = [
  {
    tenant_id:          'dev-tenant-a-00000000-0000-0000-0000-000000000001',
    integration:        'core',
    allowed_operations: ['core.identity.validate', 'core.listings.query', 'core.help.kb.query', 'core.tenant.features', 'core.activity.publish'],
    activated_at_iso:   '2026-07-23T00:00:00Z',
    expires_at_iso:     '2026-12-31T23:59:59Z',
    responsible:        'smartconversations-dev-team',
    rollback_flag:      false,
  },
  {
    tenant_id:          'dev-tenant-a-00000000-0000-0000-0000-000000000001',
    integration:        'ai',
    allowed_operations: ['ai.intent.classify', 'ai.incident.extract', 'ai.listing.extract', 'ai.help.extract', 'ai.safe_summary', 'ai.response_draft'],
    activated_at_iso:   '2026-07-23T00:00:00Z',
    expires_at_iso:     '2026-12-31T23:59:59Z',
    responsible:        'smartconversations-dev-team',
    rollback_flag:      false,
  },
  {
    tenant_id:          'dev-tenant-a-00000000-0000-0000-0000-000000000001',
    integration:        'n8n',
    allowed_operations: ['wf10.routing', 'wf20.incidents', 'wf30.listings', 'wf40.help', 'wf91.wa_out', 'wf92.webchat_out'],
    activated_at_iso:   '2026-07-23T00:00:00Z',
    expires_at_iso:     '2026-12-31T23:59:59Z',
    responsible:        'smartconversations-dev-team',
    rollback_flag:      false,
  },
  {
    tenant_id:          'dev-tenant-a-00000000-0000-0000-0000-000000000001',
    integration:        'incidents_addon',
    allowed_operations: ['incident.create'],
    activated_at_iso:   '2026-07-23T00:00:00Z',
    expires_at_iso:     '2026-12-31T23:59:59Z',
    responsible:        'smartconversations-dev-team',
    rollback_flag:      false,
  },
  {
    tenant_id:          'dev-tenant-a-00000000-0000-0000-0000-000000000001',
    integration:        'listings_addon',
    allowed_operations: ['listings.search', 'lead.create'],
    activated_at_iso:   '2026-07-23T00:00:00Z',
    expires_at_iso:     '2026-12-31T23:59:59Z',
    responsible:        'smartconversations-dev-team',
    rollback_flag:      false,
  },
  {
    tenant_id:          'dev-tenant-a-00000000-0000-0000-0000-000000000001',
    integration:        'realtime',
    allowed_operations: ['realtime.subscribe', 'realtime.unsubscribe'],
    activated_at_iso:   '2026-07-23T00:00:00Z',
    expires_at_iso:     '2026-12-31T23:59:59Z',
    responsible:        'smartconversations-dev-team',
    rollback_flag:      false,
  },
  // wasender: pendiente onboarding DEV — no en allowlist todavía
  // dev-tenant-b: solo para tests cross-tenant (nunca en allowlist canary real)
];

// ─────────────────────────────────────────────────────────────────────────────
// Comprobación de allowlist
// ─────────────────────────────────────────────────────────────────────────────

export function checkCanaryAllowlist(
  tenant_id: string,
  integration: string,
  operation: string,
  now_ms?: number,
): CanaryCheckResult {
  const now = now_ms ?? Date.now();

  const entry = CANARY_ALLOWLIST.find(
    e => e.tenant_id === tenant_id && e.integration === integration,
  );

  if (!entry) {
    return { allowed: false, reason: 'not_in_allowlist', effective_mode: 'mock' };
  }

  if (entry.rollback_flag) {
    return { allowed: false, reason: 'rollback_active', effective_mode: 'mock' };
  }

  if (entry.expires_at_iso && new Date(entry.expires_at_iso).getTime() < now) {
    return { allowed: false, reason: 'expired', effective_mode: 'mock' };
  }

  if (!entry.allowed_operations.includes(operation)) {
    return { allowed: false, reason: 'not_in_allowlist', effective_mode: 'mock' };
  }

  return { allowed: true, reason: 'in_allowlist', effective_mode: 'canary' };
}

/**
 * Resuelve el modo efectivo para un tenant+integración+operación:
 * - Si el modo configurado es 'canary' → chequea allowlist
 * - Si el tenant NO está en allowlist → mock
 * - Si el modo configurado no es 'canary' → devuelve el modo tal cual
 */
export function resolveEffectiveMode(
  configured_mode: IntegrationMode,
  tenant_id: string,
  integration: string,
  operation: string,
): IntegrationMode {
  if (configured_mode !== 'canary') return configured_mode;
  const check = checkCanaryAllowlist(tenant_id, integration, operation);
  return check.effective_mode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rollback programático — activa rollback_flag para una integración
// ─────────────────────────────────────────────────────────────────────────────

export function activateRollback(tenant_id: string, integration: string): void {
  for (const entry of CANARY_ALLOWLIST) {
    if (entry.tenant_id === tenant_id && entry.integration === integration) {
      entry.rollback_flag = true;
    }
  }
}

export function clearRollback(tenant_id: string, integration: string): void {
  for (const entry of CANARY_ALLOWLIST) {
    if (entry.tenant_id === tenant_id && entry.integration === integration) {
      entry.rollback_flag = false;
    }
  }
}
