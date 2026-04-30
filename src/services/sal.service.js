// src/services/sal.service.js
// Queries directas de lectura SAL para el frontend admin.
// Las operaciones de escritura siempre pasan por invokeWithAuth → Edge Functions.

import { supabase } from "./supabaseClient";

/**
 * Carga la integración TTLock de un client_account.
 * Devuelve null si no existe.
 */
export async function getLockIntegration(clientAccountId) {
  const { data, error } = await supabase
    .from("lock_integrations")
    .select(
      "id, provider, status, provider_client_id, pool_id, last_sync_at, last_sync_status, last_sync_error, locks_synced_count, installation_status, connectivity_status, validation_status, updated_at"
    )
    .eq("client_account_id", clientAccountId)
    .eq("provider", "ttlock")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? null;
}

/**
 * Cuenta las cerraduras sincronizadas de un client_account.
 */
export async function countLocks(clientAccountId) {
  const { count, error } = await supabase
    .from("locks")
    .select("*", { count: "exact", head: true })
    .eq("client_account_id", clientAccountId);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Carga el resumen del dashboard SAL.
 * Devuelve conteos básicos para el overview.
 */
export async function getSalDashboardStats(clientAccountId) {
  const [locksRes, actorsRes, grantsRes, credsPendingRes] = await Promise.allSettled([
    supabase
      .from("locks")
      .select("*", { count: "exact", head: true })
      .eq("client_account_id", clientAccountId),

    supabase
      .from("lock_access_actors")
      .select("*", { count: "exact", head: true })
      .eq("client_account_id", clientAccountId),

    supabase
      .from("lock_access_grants")
      .select("*", { count: "exact", head: true })
      .eq("client_account_id", clientAccountId)
      .eq("status", "active"),

    supabase
      .from("lock_credentials")
      .select("*", { count: "exact", head: true })
      .eq("client_account_id", clientAccountId)
      .in("provider_sync_status", ["pending", "error"]),
  ]);

  return {
    locksCount:        locksRes.status === "fulfilled"        ? (locksRes.value.count ?? 0)        : 0,
    actorsCount:       actorsRes.status === "fulfilled"       ? (actorsRes.value.count ?? 0)       : 0,
    grantsActiveCount: grantsRes.status === "fulfilled"       ? (grantsRes.value.count ?? 0)       : 0,
    credsPendingCount: credsPendingRes.status === "fulfilled" ? (credsPendingRes.value.count ?? 0) : 0,
  };
}
