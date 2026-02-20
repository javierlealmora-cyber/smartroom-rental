import { supabase } from "./supabaseClient";

export async function listEntities({ type } = {}) {
  let q = supabase
    .from("entities")
    .select("*")
    .order("created_at", { ascending: false });

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

export async function updateEntity(id, patch) {
  const { data, error } = await supabase
    .from("entities")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function setEntityStatus(id, status) {
  return updateEntity(id, { status });
}
