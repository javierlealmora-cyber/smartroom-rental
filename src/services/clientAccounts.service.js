// =============================================================================
// src/services/clientAccounts.service.js
// =============================================================================
// Servicio para las Edge Functions de Cuenta de Cliente (wizard, whoami, etc.)
// Usa invokeWithAuth con retry/circuit breaker
// =============================================================================

import { invokeWithAuth } from "./supabaseInvoke.services";
import { supabase } from "./supabaseClient";

const FN_WIZARD_SUBMIT = import.meta.env.VITE_FN_WIZARD_SUBMIT || "wizard_submit";
const FN_PROVISION_SUPERADMIN = import.meta.env.VITE_FN_PROVISION_SUPERADMIN || "provision_client_account_superadmin";

/**
 * Inicia el wizard (marca onboarding_status = 'in_progress')
 */
export async function callWizardInit() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No hay sesión activa");
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_status: "in_progress" })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  return { ok: true, step: "A" };
}

/**
 * Envia el payload completo del wizard (autoregistro)
 * Devuelve { ok, client_account_id, checkout_url? }
 */
export async function callWizardSubmit(payload) {
  return invokeWithAuth(FN_WIZARD_SUBMIT, {
    body: payload,
  });
}

/**
 * Provision de cuenta por superadmin (sin Stripe)
 * Devuelve { ok, client_account_id }
 */
export async function callProvisionSuperadmin(payload) {
  return invokeWithAuth(FN_PROVISION_SUPERADMIN, {
    body: payload,
  });
}
