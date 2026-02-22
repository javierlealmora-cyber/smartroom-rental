import { supabase } from "./supabaseClient";
import { invokeWithAuth } from "./supabaseInvoke.services";

function extractEdgeError(result) {
  if (result?.error?.message) return result.error.message;
  if (result?.error) return JSON.stringify(result.error);
  return "Error desconocido";
}

// ─── Accommodations ───────────────────────────────────────────────────────────

export async function listAccommodations({ status } = {}) {
  let q = supabase
    .from("accommodations")
    .select(`
      *,
      owner_entity:entities(id, legal_name, first_name, last_name1, legal_type),
      rooms(id, status)
    `)
    .order("created_at", { ascending: false });

  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getAccommodation(id) {
  const { data, error } = await supabase
    .from("accommodations")
    .select(`
      *,
      owner_entity:entities(id, legal_name, first_name, last_name1, legal_type),
      rooms(*)
    `)
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createAccommodation(payload, rooms = []) {
  const result = await invokeWithAuth("manage_accommodation", {
    body: { action: "create", payload: { ...payload, rooms } },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data?.accommodation ?? result.data;
}

export async function updateAccommodation(id, patch) {
  const result = await invokeWithAuth("manage_accommodation", {
    body: { action: "update", payload: { id, ...patch } },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}

export async function setAccommodationStatus(id, status) {
  const result = await invokeWithAuth("manage_accommodation", {
    body: { action: "set_status", payload: { id, status } },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export async function listRooms(accommodationId) {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("accommodation_id", accommodationId)
    .order("number");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function updateRoom(id, patch) {
  const result = await invokeWithAuth("manage_accommodation", {
    body: { action: "update_room", payload: { id, ...patch } },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}

export async function setRoomStatus(id, status) {
  const result = await invokeWithAuth("manage_accommodation", {
    body: { action: "set_room_status", payload: { id, status } },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}
