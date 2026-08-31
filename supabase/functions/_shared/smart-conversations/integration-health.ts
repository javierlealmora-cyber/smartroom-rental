/**
 * integration-health.ts — Agregador de health checks para Fase 11C1.
 *
 * No ejecuta operaciones mutables.
 * No expone URLs, credenciales ni tenant data.
 * Solo emite nombres de integración y estado sanitizado.
 */

import type { IntegrationMode, IntegrationHealth, HealthStatus } from './integration-framework.ts';
import { buildHealth, resolveMode } from './integration-framework.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Registro de integraciones conocidas
// ─────────────────────────────────────────────────────────────────────────────

export interface IntegrationRegistration {
  name: string;
  mode_env_var: string;         // nombre de la variable de entorno del modo
  requires_secret_names: string[];  // nombres de las variables (sin valores)
}

export const KNOWN_INTEGRATIONS: IntegrationRegistration[] = [
  {
    name: 'core',
    mode_env_var: 'CORE_INTEGRATION_MODE',
    requires_secret_names: ['CORE_BASE_URL', 'CORE_SERVICE_TOKEN'],
  },
  {
    name: 'ai',
    mode_env_var: 'AI_INTEGRATION_MODE',
    requires_secret_names: ['AI_PROVIDER_URL', 'AI_API_KEY'],
  },
  {
    name: 'n8n',
    mode_env_var: 'N8N_INTEGRATION_MODE',
    requires_secret_names: ['N8N_BASE_URL', 'N8N_SERVICE_TOKEN'],
  },
  {
    name: 'incidents_addon',
    mode_env_var: 'INCIDENTS_ADDON_INTEGRATION_MODE',
    requires_secret_names: ['INCIDENTS_ADDON_BASE_URL', 'INCIDENTS_ADDON_SERVICE_TOKEN'],
  },
  {
    name: 'listings_addon',
    mode_env_var: 'LISTINGS_ADDON_INTEGRATION_MODE',
    requires_secret_names: ['LISTINGS_ADDON_BASE_URL', 'LISTINGS_ADDON_SERVICE_TOKEN'],
  },
  {
    name: 'realtime',
    mode_env_var: 'REALTIME_INTEGRATION_MODE',
    requires_secret_names: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
  },
  {
    name: 'wasender',
    mode_env_var: 'WASENDER_INTEGRATION_MODE',
    requires_secret_names: ['WASENDER_API_URL', 'WASENDER_API_KEY'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Agregador de health — lee solo variables de entorno de modo
// ─────────────────────────────────────────────────────────────────────────────

function _getEnv(key: string): string | undefined {
  if (typeof Deno !== 'undefined') return Deno.env.get(key);
  if (typeof process !== 'undefined') return process.env[key];
  return undefined;
}

function _secretPresent(name: string): boolean {
  const v = _getEnv(name);
  return typeof v === 'string' && v.length > 0;
}

export interface IntegrationReadiness {
  integration: string;
  mode: IntegrationMode;
  status: HealthStatus;
  secrets_configured: boolean; // true = todos los secrets tienen valor (no imprime cuáles)
}

export function checkAllIntegrations(): IntegrationReadiness[] {
  return KNOWN_INTEGRATIONS.map(reg => {
    const rawMode = _getEnv(reg.mode_env_var);
    const mode = resolveMode(rawMode);
    const secrets_configured = reg.requires_secret_names.every(_secretPresent);
    const health = buildHealth(reg.name, mode);

    let status: HealthStatus = health.status;
    if (mode !== 'mock' && mode !== 'disabled' && !secrets_configured) {
      status = 'misconfigured';
    }

    return {
      integration: reg.name,
      mode,
      status,
      secrets_configured,
    };
  });
}

/** Devuelve el resumen sanitizado del health — sin URLs, secrets ni PII. */
export function buildReadinessReport(): { integration: string; mode: string; status: string }[] {
  return checkAllIntegrations().map(r => ({
    integration: r.integration,
    mode: r.mode,
    status: r.status,
  }));
}
