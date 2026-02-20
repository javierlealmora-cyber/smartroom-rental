import { supabase } from "./supabaseClient";
import { invokeWithAuth } from "./supabaseInvoke.services";

function extractEdgeError(result) {
  if (result?.error?.message) return result.error.message;
  if (result?.error) return JSON.stringify(result.error);
  return "Error desconocido";
}

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
  const result = await invokeWithAuth("manage_entity", {
    body: { action: "create", payload },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}

export async function updateEntity(id, patch) {
  const result = await invokeWithAuth("manage_entity", {
    body: { action: "update", payload: { id, ...patch } },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}

export async function setEntityStatus(id, status) {
  const result = await invokeWithAuth("manage_entity", {
    body: { action: "set_status", payload: { id, status } },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}
