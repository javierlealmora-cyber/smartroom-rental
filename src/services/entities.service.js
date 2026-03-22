import { supabase } from "./supabaseClient";
import { invokeWithAuth } from "./supabaseInvoke.services";

function extractEdgeError(result) {
  if (result?.error?.message) return result.error.message;
  if (result?.error) return JSON.stringify(result.error);
  return "Error desconocido";
}

export async function listEntities({ type, clientAccountId } = {}) {
  let q = supabase
    .from("entities")
    .select("*")
    .order("created_at", { ascending: false });

  // Filtro tenant (defensa en profundidad)
  if (clientAccountId) {
    q = q.eq("client_account_id", clientAccountId);
  }

  if (type) q = q.eq("type", type);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createEntity(payload) {
  const result = await invokeWithAuth("manage_entity", {
    body: { action: "create", payload },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}

export async function updateEntity(id, patch, clientAccountId) {
  const { data, error } = await supabase
    .from("entities")
    .update(patch)
    .eq("id", id)
    .eq("client_account_id", clientAccountId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function setEntityStatus(id, status, clientAccountId) {
  const { data, error } = await supabase
    .from("entities")
    .update({ status })
    .eq("id", id)
    .eq("client_account_id", clientAccountId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
