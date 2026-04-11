import { supabase } from "./supabaseClient";

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
  const { data, error } = await supabase
    .from("entities")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
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
