import { supabase } from "./supabaseClient";

// ─── saas_services ────────────────────────────────────────────────────────────

export async function listSaasServices() {
  const { data, error } = await supabase
    .from("saas_services")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Para el catálogo admin: solo servicios marcados como visibles en catálogo
// y en estado activo o deprecado. El superadmin sigue usando listSaasServices().
export async function listCatalogSaasServices() {
  const { data, error } = await supabase
    .from("saas_services")
    .select("*")
    .eq("visible_in_catalog", true)
    .in("status", ["active", "deprecated"])
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSaasService(id) {
  const { data, error } = await supabase
    .from("saas_services")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createSaasService(values) {
  const { data, error } = await supabase
    .from("saas_services")
    .insert(values)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateSaasService(id, values) {
  const { data, error } = await supabase
    .from("saas_services")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ─── saas_service_plans ───────────────────────────────────────────────────────

export async function listPlans(saasServiceId) {
  const { data, error } = await supabase
    .from("saas_service_plans")
    .select("*")
    .eq("saas_service_id", saasServiceId)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertPlan(values) {
  const { data, error } = await supabase
    .from("saas_service_plans")
    .upsert(values, { onConflict: "saas_service_id,code" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deletePlan(id) {
  const { error } = await supabase
    .from("saas_service_plans")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── saas_service_features ────────────────────────────────────────────────────

export async function listFeatures(saasServicePlanId) {
  const { data, error } = await supabase
    .from("saas_service_features")
    .select("*")
    .eq("saas_service_plan_id", saasServicePlanId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertFeature(values) {
  const { data, error } = await supabase
    .from("saas_service_features")
    .upsert(values, { onConflict: "saas_service_plan_id,feature_code" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteFeature(featureId) {
  const { error } = await supabase
    .from("saas_service_features")
    .delete()
    .eq("id", featureId);
  if (error) throw new Error(error.message);
}

// ─── saas_service_subscriptions ───────────────────────────────────────────────

/**
 * Lista todas las suscripciones de un servicio SAL (vista superadmin).
 */
export async function listSubscriptionsByService(saasServiceId) {
  const { data, error } = await supabase
    .from("saas_service_subscriptions")
    .select(`
      *,
      client_accounts (id, name),
      saas_service_plans (id, name, billing_period, price_amount)
    `)
    .eq("saas_service_id", saasServiceId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Obtiene la suscripción SAL de un client_account específico.
 */
export async function getClientSalSubscription(clientAccountId) {
  const { data, error } = await supabase
    .from("saas_service_subscriptions")
    .select(`
      *,
      saas_services (id, code, name),
      saas_service_plans (id, name, billing_period, price_amount)
    `)
    .eq("client_account_id", clientAccountId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

/**
 * Lista todas las suscripciones activas/inactivas de un client_account,
 * con el servicio y plan asociados.
 */
export async function listClientSaasSubscriptions(clientAccountId) {
  const { data, error } = await supabase
    .from("saas_service_subscriptions")
    .select(`
      *,
      saas_services (*),
      saas_service_plans (*)
    `)
    .eq("client_account_id", clientAccountId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Actualiza el estado de una suscripción (superadmin: suspender, cancelar).
 */
export async function updateSubscriptionStatus(subscriptionId, status, extra = {}) {
  const patch = { status, ...extra };
  if (status === "suspended") patch.suspended_at = new Date().toISOString();
  if (status === "cancelled") patch.cancelled_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("saas_service_subscriptions")
    .update(patch)
    .eq("id", subscriptionId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
