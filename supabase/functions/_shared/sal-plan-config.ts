/**
 * SmartLock — Resolución de configuración de plan y validación de cambios.
 *
 * Implementa `rules-21-subscription-plan-configuration.md` y su contrato
 * `contract-subscription-plan-configuration.md`.
 *
 * Modelo real de datos (verificado en DEV):
 *   - `saas_services`             ─ catálogo (identificado por `code`)
 *   - `saas_service_plans`        ─ planes del servicio
 *   - `saas_service_features`     ─ 1 fila por (plan, feature_code) con
 *                                    { is_enabled: bool, config: jsonb }
 *   - `saas_service_subscriptions` ─ suscripción cliente↔plan con status
 *
 * Los límites numéricos (max_locks, etc.) viven en `config.value` de la
 * fila correspondiente en `saas_service_features` (config: { value: N }).
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { err, ERROR_CODES } from "./response.ts";
import { fetchActiveSalSubscription } from "./sal-helpers.ts";

export const SAL_SERVICE_CODE = "smart_access_lock";

// ── Objeto tipado (contract-subscription-plan-configuration.md) ────────────

export interface SalPlanConfiguration {
  // Capacidades booleanas
  providerIntegration:   boolean;
  commonAreas:           boolean;
  multipleLocksPerRoom:  boolean;
  multipleLocksPerArea:  boolean;
  actorsEnabled:         boolean;
  accessGroupsEnabled:   boolean;
  lodgerAutoGrant:       boolean;
  groupAutoGrant:        boolean;
  remoteUnlock:          boolean;
  auditLogs:             boolean;
  notificationsEmail:    boolean;
  notificationsSms:      boolean;
  notificationsWhatsapp: boolean;
  providerLocalBle:      boolean;

  // Límites numéricos (null = ilimitado)
  maxLocks:    number | null;
  maxActors:   number | null;
  maxGroups:   number | null;
  maxGateways: number | null;

  // Metadatos
  planId:         string;
  planCode:       string;
  subscriptionId: string;
  resolvedAt:     string;
}

// Feature codes válidos (rules-21 §4.1)
const BOOLEAN_FEATURE_KEYS: Record<string, keyof SalPlanConfiguration> = {
  provider_integration:    "providerIntegration",
  common_areas:            "commonAreas",
  multiple_locks_per_room: "multipleLocksPerRoom",
  multiple_locks_per_area: "multipleLocksPerArea",
  actors:                  "actorsEnabled",
  access_groups:           "accessGroupsEnabled",
  lodger_auto_grant:       "lodgerAutoGrant",
  group_auto_grant:        "groupAutoGrant",
  remote_unlock:           "remoteUnlock",
  audit_logs:              "auditLogs",
  notifications_email:     "notificationsEmail",
  notifications_sms:       "notificationsSms",
  notifications_whatsapp:  "notificationsWhatsapp",
  provider_local_ble:      "providerLocalBle",
};

const NUMERIC_FEATURE_KEYS: Record<string, keyof SalPlanConfiguration> = {
  max_locks:    "maxLocks",
  max_actors:   "maxActors",
  max_groups:   "maxGroups",
  max_gateways: "maxGateways",
};

// ── Configuración por defecto (restrictiva) ────────────────────────────────

function defaultConfiguration(planId: string, planCode: string, subscriptionId: string): SalPlanConfiguration {
  return {
    providerIntegration:   false,
    commonAreas:           false,
    multipleLocksPerRoom:  false,
    multipleLocksPerArea:  false,
    actorsEnabled:         false,
    accessGroupsEnabled:   false,
    lodgerAutoGrant:       false,
    groupAutoGrant:        false,
    remoteUnlock:          false,
    auditLogs:             false,
    notificationsEmail:    false,
    notificationsSms:      false,
    notificationsWhatsapp: false,
    providerLocalBle:      false,
    maxLocks:    0,
    maxActors:   0,
    maxGroups:   0,
    maxGateways: 0,
    planId,
    planCode,
    subscriptionId,
    resolvedAt: new Date().toISOString(),
  };
}

// ── Resolver activa suscripción SAL + su plan ──────────────────────────────

async function fetchPlanCode(
  supabase: SupabaseClient,
  planId: string,
): Promise<string | null> {
  const { data: plan } = await supabase
    .from("saas_service_plans")
    .select("code")
    .eq("id", planId)
    .maybeSingle();
  return plan?.code ?? null;
}

async function mapPlanFeaturesToConfiguration(
  supabase: SupabaseClient,
  planId: string,
  planCode: string,
  subscriptionId: string,
): Promise<SalPlanConfiguration> {
  const config = defaultConfiguration(planId, planCode, subscriptionId);

  const { data: features } = await supabase
    .from("saas_service_features")
    .select("feature_code, is_enabled, config")
    .eq("saas_service_plan_id", planId);

  if (!features) return config;

  for (const row of features) {
    const code = row.feature_code as string;

    if (code in BOOLEAN_FEATURE_KEYS) {
      const key = BOOLEAN_FEATURE_KEYS[code];
      (config as any)[key] = row.is_enabled === true;
      continue;
    }

    if (code in NUMERIC_FEATURE_KEYS) {
      const key = NUMERIC_FEATURE_KEYS[code];
      const raw = (row.config as any)?.value;
      if (raw === null || raw === undefined) {
        (config as any)[key] = null; // ilimitado explícito
      } else {
        const parsed = Number(raw);
        (config as any)[key] = Number.isFinite(parsed) ? parsed : 0;
      }
    }
    // feature_codes desconocidos se ignoran silenciosamente (compatibilidad)
  }

  return config;
}

/**
 * Resuelve `SalPlanConfiguration` para un client_account (plan actual activo).
 * Devuelve null si el cliente NO tiene suscripción SAL activa
 * (el gating debe hacerse aparte, ver `assertSalSubscriptionActive`).
 */
export async function resolveSalPlanConfiguration(
  supabase: SupabaseClient,
  clientAccountId: string,
): Promise<SalPlanConfiguration | null> {
  const sub = await fetchActiveSalSubscription(supabase, clientAccountId);
  if (!sub) return null;
  const planCode = (await fetchPlanCode(supabase, sub.planId)) ?? "unknown";
  return await mapPlanFeaturesToConfiguration(
    supabase,
    sub.planId,
    planCode,
    sub.subscriptionId,
  );
}

/**
 * Resuelve la configuración de un plan concreto (para validar un cambio de plan).
 */
export async function resolveSalPlanConfigurationForPlan(
  supabase: SupabaseClient,
  planId: string,
  subscriptionId: string,
): Promise<SalPlanConfiguration | null> {
  const { data: plan } = await supabase
    .from("saas_service_plans")
    .select("id, code")
    .eq("id", planId)
    .maybeSingle();

  if (!plan) return null;

  return await mapPlanFeaturesToConfiguration(
    supabase,
    plan.id,
    plan.code,
    subscriptionId,
  );
}

// ── Validación de límites en creación de recursos ──────────────────────────

/**
 * Devuelve una Response de error si el conteo actual + `additional` supera
 * el límite del plan. `null` si está dentro de límite.
 *
 * Uso:
 *   const guard = await assertNumericLimit(supabase, config, "maxLocks", currentLocks, 1);
 *   if (guard) return guard;
 */
export function assertNumericLimit(
  config: SalPlanConfiguration,
  key: "maxLocks" | "maxActors" | "maxGroups" | "maxGateways",
  currentCount: number,
  additional: number = 1,
): Response | null {
  const limit = config[key];
  if (limit === null) return null; // ilimitado
  if ((currentCount + additional) > limit) {
    return err(
      ERROR_CODES.PLAN_LIMIT_EXCEEDED,
      "Límite del plan alcanzado para este recurso",
      400,
      { limit, current: currentCount, requested: additional, resource: key },
    );
  }
  return null;
}

// ── Validación de cambio de plan (upgrade/downgrade) ───────────────────────

export interface PlanChangeConflict {
  resource?:        string;
  capability?:      string;
  current?:         number;
  newLimit?:        number | null;
  activeResources?: number;
}

export interface PlanChangeValidation {
  allowed: boolean;
  conflicts: PlanChangeConflict[];
  currentConfig: SalPlanConfiguration;
  targetConfig:  SalPlanConfiguration;
}

/**
 * Cuenta cerraduras activas del cliente.
 */
async function countActiveLocks(supabase: SupabaseClient, clientAccountId: string): Promise<number> {
  const { count } = await supabase
    .from("locks")
    .select("id", { count: "exact", head: true })
    .eq("client_account_id", clientAccountId)
    .eq("is_active", true);
  return count ?? 0;
}

async function countActiveActors(supabase: SupabaseClient, clientAccountId: string): Promise<number> {
  const { count } = await supabase
    .from("lock_access_actors")
    .select("id", { count: "exact", head: true })
    .eq("client_account_id", clientAccountId)
    .eq("is_active", true);
  return count ?? 0;
}

async function countActiveGroups(supabase: SupabaseClient, clientAccountId: string): Promise<number> {
  const { count } = await supabase
    .from("lock_access_groups")
    .select("id", { count: "exact", head: true })
    .eq("client_account_id", clientAccountId)
    .eq("is_active", true);
  return count ?? 0;
}

async function countActiveGateways(supabase: SupabaseClient, clientAccountId: string): Promise<number> {
  const { count } = await supabase
    .from("lock_gateways")
    .select("id", { count: "exact", head: true })
    .eq("client_account_id", clientAccountId)
    .in("status", ["active", "claim_pending"]);
  return count ?? 0;
}

// Recursos activos que dependen de una capacidad booleana
async function countCommonAreas(supabase: SupabaseClient, clientAccountId: string): Promise<number> {
  const { count } = await supabase
    .from("common_areas")
    .select("id", { count: "exact", head: true })
    .eq("client_account_id", clientAccountId);
  return count ?? 0;
}

async function countTtlockBleIntegrations(supabase: SupabaseClient, clientAccountId: string): Promise<number> {
  const { count } = await supabase
    .from("lock_integrations")
    .select("id", { count: "exact", head: true })
    .eq("client_account_id", clientAccountId)
    .eq("provider", "ttlock_ble")
    .in("status", ["connected", "syncing", "pending_release"]);
  return count ?? 0;
}

/**
 * Valida si se puede pasar del plan actual del cliente al plan `targetPlanId`.
 * Un upgrade puro (todos los límites nuevos >= actuales, todas las capacidades nuevas >= actuales)
 * SIEMPRE se permite (la función devuelve `allowed: true, conflicts: []`).
 * Un downgrade se bloquea si:
 *  - alguno de los límites numéricos nuevos es < uso actual real
 *  - alguna capacidad pasa de true → false y hay recursos activos que la usan
 */
export async function validateSalPlanChange(
  supabase: SupabaseClient,
  clientAccountId: string,
  targetPlanId: string,
): Promise<PlanChangeValidation | Response> {
  const currentConfig = await resolveSalPlanConfiguration(supabase, clientAccountId);
  if (!currentConfig) {
    return err(ERROR_CODES.FORBIDDEN, "El cliente no tiene una suscripción SAL activa", 403);
  }

  const targetConfig = await resolveSalPlanConfigurationForPlan(
    supabase,
    targetPlanId,
    currentConfig.subscriptionId,
  );
  if (!targetConfig) {
    return err(ERROR_CODES.NOT_FOUND, "Plan destino no encontrado", 404);
  }

  const conflicts: PlanChangeConflict[] = [];

  // 1. Límites numéricos
  const usageResolvers: Array<{
    key: "maxLocks" | "maxActors" | "maxGroups" | "maxGateways";
    resource: string;
    resolve: () => Promise<number>;
  }> = [
    { key: "maxLocks",    resource: "locks",     resolve: () => countActiveLocks(supabase, clientAccountId) },
    { key: "maxActors",   resource: "actors",    resolve: () => countActiveActors(supabase, clientAccountId) },
    { key: "maxGroups",   resource: "groups",    resolve: () => countActiveGroups(supabase, clientAccountId) },
    { key: "maxGateways", resource: "gateways",  resolve: () => countActiveGateways(supabase, clientAccountId) },
  ];

  for (const { key, resource, resolve } of usageResolvers) {
    const newLimit = targetConfig[key];
    if (newLimit === null) continue; // destino ilimitado, jamás bloquea
    const currentUsage = await resolve();
    if (currentUsage > newLimit) {
      conflicts.push({ resource, current: currentUsage, newLimit });
    }
  }

  // 2. Capacidades booleanas retiradas con recursos activos
  if (currentConfig.commonAreas && !targetConfig.commonAreas) {
    const active = await countCommonAreas(supabase, clientAccountId);
    if (active > 0) conflicts.push({ capability: "commonAreas", activeResources: active });
  }
  if (currentConfig.providerLocalBle && !targetConfig.providerLocalBle) {
    const active = await countTtlockBleIntegrations(supabase, clientAccountId);
    if (active > 0) conflicts.push({ capability: "providerLocalBle", activeResources: active });
  }
  if (currentConfig.accessGroupsEnabled && !targetConfig.accessGroupsEnabled) {
    const active = await countActiveGroups(supabase, clientAccountId);
    if (active > 0) conflicts.push({ capability: "accessGroupsEnabled", activeResources: active });
  }
  if (currentConfig.actorsEnabled && !targetConfig.actorsEnabled) {
    const active = await countActiveActors(supabase, clientAccountId);
    if (active > 0) conflicts.push({ capability: "actorsEnabled", activeResources: active });
  }

  return {
    allowed: conflicts.length === 0,
    conflicts,
    currentConfig,
    targetConfig,
  };
}
