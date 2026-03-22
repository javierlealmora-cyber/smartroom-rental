// =============================================================================
// src/services/clientAccounts.service.js
// =============================================================================
// Servicio para las Edge Functions de Cuenta de Cliente (wizard, whoami, etc.)
// Usa invokeWithAuth con retry/circuit breaker
// =============================================================================

import { invokeWithAuth } from "./supabaseInvoke.services";

const FN_WIZARD_INIT = import.meta.env.VITE_FN_WIZARD_INIT || "wizard_init";
const FN_WIZARD_SUBMIT = import.meta.env.VITE_FN_WIZARD_SUBMIT || "wizard_submit";
const FN_PROVISION_SUPERADMIN = import.meta.env.VITE_FN_PROVISION_SUPERADMIN || "provision_client_account_superadmin";

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
