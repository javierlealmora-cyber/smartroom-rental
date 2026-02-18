// =============================================================================
// src/services/clientAccounts.service.js
// =============================================================================
// Servicio para las Edge Functions de Cuenta de Cliente (wizard, whoami, etc.)
// Usa invokeWithAuth con retry/circuit breaker
// =============================================================================

import { invokeWithAuth } from "./supabaseInvoke.services";

const FN_WHOAMI = import.meta.env.VITE_FN_WHOAMI || "whoami";
const FN_WIZARD_INIT = import.meta.env.VITE_FN_WIZARD_INIT || "wizard_init";
const FN_WIZARD_SUBMIT = import.meta.env.VITE_FN_WIZARD_SUBMIT || "wizard_submit";
const FN_PROVISION_SUPERADMIN = import.meta.env.VITE_FN_PROVISION_SUPERADMIN || "provision_client_account_superadmin";

/**
 * Llama a whoami para obtener datos del tenant actual
 * (client_account_id, plan_code, billing_cycle, branding, onboarding_status)
 */
export async function callWhoami() {
  return invokeWithAuth(FN_WHOAMI, { method: "GET" });
}

/**
 * Inicia el wizard (marca onboarding_status = 'in_progress')
 */
export async function callWizardInit() {
  return invokeWithAuth(FN_WIZARD_INIT, {
    body: {},
  });
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
