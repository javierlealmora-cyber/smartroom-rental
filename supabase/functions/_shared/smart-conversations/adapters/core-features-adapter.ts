/**
 * core-features-adapter.ts — Adapter de features del tenant via Core (Fase 11C2).
 *
 * Modes: mock | shadow | canary | real | disabled   (default: mock)
 *
 * Fuente de verdad de features:
 *   conv-core-get-tenant-features lee conv_service_activations (Supabase directo).
 *   Este adapter llama a esa EF como backend-to-backend.
 *   No se accede directamente a conv_service_activations desde el adapter.
 *
 * Fuente combinada:
 *   Core devuelve allowlist de capacidades contratadas.
 *   conv_service_activations es la fuente de verdad para activación técnica.
 *   Ambas deben consultarse; Core no sustituye a conv_service_activations
 *   sin decisión arquitectónica expresa (ver core-features-contract.md).
 *
 * Cache: aislada por tenant, invalidable, DEV only.
 */

import type { IntegrationResult, IntegrationMode } from '../integration-framework.ts';
import {
  resolveMode, assertRealModeAllowed, buildSuccess, buildError, buildDisabledError,
  INTEGRATION_POLICIES, checkCircuit, recordSuccess, recordFailure,
} from '../integration-framework.ts';
import { resolveEffectiveMode } from '../integration-canary.ts';

export interface TenantFeaturesResult {
  smart_conversations: boolean;
  services: {
    conv_incidencias: boolean;
    conv_publicaciones: boolean;
    conv_ayuda: boolean;
  };
  channels: {
    webchat: boolean;
    whatsapp: boolean;
  };
}

function validateFeaturesResponse(raw: unknown): raw is TenantFeaturesResult {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  if (typeof r['smart_conversations'] !== 'boolean') return false;
  if (!r['services'] || typeof r['services'] !== 'object') return false;
  if (!r['channels'] || typeof r['channels'] !== 'object') return false;
  return true;
}

function mockFeaturesResult(client_account_id: string): TenantFeaturesResult {
  if (client_account_id.startsWith('dev-tenant')) {
    return {
      smart_conversations: true,
      services: { conv_incidencias: true, conv_publicaciones: false, conv_ayuda: true },
      channels: { webchat: true, whatsapp: false },
    };
  }
  return {
    smart_conversations: false,
    services: { conv_incidencias: false, conv_publicaciones: false, conv_ayuda: false },
    channels: { webchat: false, whatsapp: false },
  };
}

// Cache aislada por tenant — en memoria, solo DEV
const _cache = new Map<string, { data: TenantFeaturesResult; expires_at: number }>();

export function clearFeaturesCache(client_account_id?: string) {
  if (client_account_id) _cache.delete(client_account_id);
  else _cache.clear();
}

export async function getTenantFeatures(
  client_account_id: string,
  options: {
    mode?: string;
    appEnvironment?: string;
    correlation_id?: string;
    cache_ttl_ms?: number;
  } = {},
): Promise<IntegrationResult<TenantFeaturesResult>> {
  const rawMode = options.mode
    ?? (typeof Deno !== 'undefined' ? Deno.env.get('CORE_INTEGRATION_MODE') : undefined)
    ?? 'mock';
  const mode: IntegrationMode = resolveMode(rawMode);
  const policy = INTEGRATION_POLICIES['core'];

  if (mode === 'disabled') return buildDisabledError('core');
  if (!client_account_id) return buildError('VALIDATION_ERROR', 'client_account_id_required', mode, 'core');

  const guard = assertRealModeAllowed(mode, options.appEnvironment);
  if (!guard.allowed) {
    return buildError('CONFIGURATION_ERROR', guard.reason ?? 'real_mode_requires_dev_environment', mode, 'core');
  }

  if (mode === 'mock') {
    return buildSuccess(mockFeaturesResult(client_account_id), mode, 'core');
  }

  // Cache check — lectura idempotente, aislada por tenant
  const cached = _cache.get(client_account_id);
  if (cached && cached.expires_at > Date.now()) {
    return buildSuccess(cached.data, mode, 'core');
  }

  const effectiveMode = resolveEffectiveMode(client_account_id, 'core', 'core.tenant.features', mode);

  if (!checkCircuit('core')) {
    return buildError('DEPENDENCY_UNAVAILABLE', 'circuit_open', effectiveMode, 'core');
  }

  try {
    const t0 = Date.now();
    const coreUrl = typeof Deno !== 'undefined' ? Deno.env.get('CORE_BASE_URL') : '';
    const coreToken = typeof Deno !== 'undefined' ? Deno.env.get('CORE_SERVICE_TOKEN') : '';

    const response = await fetch(`${coreUrl}/smartroom/conversations/tenant/features`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${coreToken}`,
        'X-Client-Account-Id': client_account_id,
        ...(options.correlation_id ? { 'X-Request-Id': options.correlation_id } : {}),
        'X-Source': 'smart_conversations',
      },
      body: JSON.stringify({ client_account_id }),
      signal: AbortSignal.timeout(policy.timeout_ms),
    });

    const duration_ms = Date.now() - t0;

    if (!response.ok) {
      recordFailure('core', policy);
      if (response.status === 404) return buildError('TENANT_NOT_FOUND', 'tenant_not_found', effectiveMode, 'core', duration_ms);
      if (response.status === 401) return buildError('UNAUTHORIZED',     'core_auth_failed',  effectiveMode, 'core', duration_ms);
      return buildError('DEPENDENCY_UNAVAILABLE', `core_${response.status}`, effectiveMode, 'core', duration_ms);
    }

    const raw = await response.json() as Record<string, unknown>;

    // Cross-tenant guard
    if (typeof raw['client_account_id'] === 'string' && raw['client_account_id'] !== client_account_id) {
      return buildError('FORBIDDEN', 'response_tenant_mismatch', effectiveMode, 'core', duration_ms);
    }

    if (!validateFeaturesResponse(raw)) {
      recordFailure('core', policy);
      return buildError('CONTRACT_MISMATCH', 'features_response_invalid', effectiveMode, 'core', duration_ms);
    }

    recordSuccess('core');

    // Cache aislada por tenant con TTL configurable
    _cache.set(client_account_id, { data: raw, expires_at: Date.now() + (options.cache_ttl_ms ?? 60_000) });

    return buildSuccess(raw, effectiveMode, 'core', duration_ms);

  } catch (err: unknown) {
    recordFailure('core', policy);
    if (err instanceof Error && err.name === 'TimeoutError') {
      return buildError('TIMEOUT', 'core_features_timeout', effectiveMode, 'core');
    }
    return buildError('INTERNAL_ERROR', 'core_features_error', effectiveMode, 'core');
  }
}
