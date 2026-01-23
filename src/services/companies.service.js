// src/services/companies.service.js
import { supabase } from "./supabaseClient";
import { invokeWithAuth } from "./supabaseInvoke.services";

// Nombres de Edge Functions (desde .env.local)
const FN_PROVISION = import.meta.env.VITE_FN_PROVISION_COMPANY || "provision_company";
const FN_UPDATE = import.meta.env.VITE_FN_UPDATE_COMPANY || "update_company";
const FN_DELETE = import.meta.env.VITE_FN_DELETE_COMPANY || "delete_company";

/**
 * -----------------------------
 * WRITES (Edge Functions)
 * -----------------------------
 * Normalizamos TODOS los writes por invokeWithAuth().
 */

/**
 * Crea company + crea admin user/profile (Edge Function)
 */
export async function provisionCompany(payload) {
  const data = await invokeWithAuth(FN_PROVISION, { body: payload });

  // Verificar que la respuesta sea válida
  if (!data || typeof data !== 'object') {
    throw new Error("Respuesta inválida de la función provision_company");
  }

  // Verificar éxito (diferentes formatos posibles)
  if (!data.ok && !data.success) {
    const msg = data?.error ?? data?.message ?? "Error creando empresa";
    const detail = data?.detail ? `: ${data.detail}` : "";
    throw new Error(`${msg}${detail}`);
  }

  return data;
}

/**
 * Update company (Edge Function)
 * Frontend API estable: updateCompany({ company_id, patch })
 * Edge espera: { company_id, company: {...} }
 */
export async function updateCompany({ company_id, patch }) {
  if (!company_id) throw new Error("company_id es obligatorio");
  if (!patch || typeof patch !== "object") throw new Error("patch es obligatorio");

  const data = await invokeWithAuth(FN_UPDATE, {
    body: { company_id, company: patch }, // <-- CLAVE
  });

  // Verificar que la respuesta sea válida
  if (!data || typeof data !== 'object') {
    throw new Error("Respuesta inválida de la función update_company");
  }

  // Verificar éxito
  if (!data.ok && !data.success) {
    const msg = data?.error ?? data?.message ?? "Error actualizando empresa";
    const detail = data?.detail ? `: ${data.detail}` : "";
    throw new Error(`${msg}${detail}`);
  }

  return data;
}

/**
 * Delete company (Edge Function)
 */
export async function deleteCompany({ company_id }) {
  if (!company_id) throw new Error("company_id es obligatorio");

  const data = await invokeWithAuth(FN_DELETE, {
    body: { company_id },
  });

  // Verificar que la respuesta sea válida
  if (!data || typeof data !== 'object') {
    throw new Error("Respuesta inválida de la función delete_company");
  }

  // Verificar éxito
  if (!data.ok && !data.success) {
    const msg = data?.error ?? data?.message ?? "Error eliminando empresa";
    const detail = data?.detail ? `: ${data.detail}` : "";
    throw new Error(`${msg}${detail}`);
  }

  return data;
}

/**
 * -----------------------------
 * READS (DB)
 * -----------------------------
 */
export async function getCompanies() {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, slug, plan, status, start_date, created_at, theme_primary_color, logo_url")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
