import { supabase } from "./supabaseClient";

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
  const { rooms: _rooms, ...accPayload } = payload;

  const { data: acc, error: accErr } = await supabase
    .from("accommodations")
    .insert(accPayload)
    .select("*")
    .single();

  if (accErr) throw new Error(accErr.message);

  if (rooms.length > 0) {
    const roomRows = rooms.map(({ id: _id, ...r }) => ({
      ...r,
      accommodation_id: acc.id,
      client_account_id: acc.client_account_id,
    }));

    const { error: roomErr } = await supabase.from("rooms").insert(roomRows);
    if (roomErr) throw new Error(roomErr.message);
  }

  return acc;
}

export async function updateAccommodation(id, patch) {
  const { data, error } = await supabase
    .from("accommodations")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function setAccommodationStatus(id, status) {
  return updateAccommodation(id, { status });
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
  const { data, error } = await supabase
    .from("rooms")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function setRoomStatus(id, status) {
  return updateRoom(id, { status });
}
