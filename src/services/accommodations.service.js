import { supabase } from "./supabaseClient";
import { invokeWithAuth } from "./supabaseInvoke.services";

function extractEdgeError(result) {
  if (result?.error?.message) return result.error.message;
  if (result?.error) return JSON.stringify(result.error);
  return "Error desconocido";
}

// ─── Accommodations ───────────────────────────────────────────────────────────

export async function listAccommodations({ status, clientAccountId } = {}) {
  let q = supabase
    .from("accommodations")
    .select(`
      *,
      owner_entity:entities(id, legal_name, first_name, last_name1, legal_type),
      rooms(id, is_maintenance)
    `)
    .order("created_at", { ascending: false });

  // Filtro tenant (defensa en profundidad)
  if (clientAccountId) {
    q = q.eq("client_account_id", clientAccountId);
  }

  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getAccommodation(id, clientAccountId = null) {
  let q = supabase
    .from("accommodations")
    .select(`
      *,
      owner_entity:entities(id, legal_name, first_name, last_name1, legal_type),
      rooms(*)
    `)
    .eq("id", id);

  // Filtro tenant (defensa en profundidad)
  if (clientAccountId) {
    q = q.eq("client_account_id", clientAccountId);
  }

  const { data, error } = await q.single();
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

export async function updateAccommodation(id, patch, clientAccountId) {
  const { data, error } = await supabase
    .from("accommodations")
    .update(patch)
    .eq("id", id)
    .eq("client_account_id", clientAccountId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function setAccommodationStatus(id, status, clientAccountId) {
  const { data, error } = await supabase
    .from("accommodations")
    .update({ status })
    .eq("id", id)
    .eq("client_account_id", clientAccountId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export async function listRooms(accommodationId) {
  const today = new Date().toISOString().split("T")[0];

  const [{ data: rooms, error }, { data: assignments }] = await Promise.all([
    supabase.from("rooms").select("*").eq("accommodation_id", accommodationId).order("number"),
    supabase.from("lodger_room_assignments")
      .select("room_id, move_out_date")
      .eq("accommodation_id", accommodationId)
      .or(`move_out_date.is.null,move_out_date.gt.${today}`),
  ]);

  if (error) throw new Error(error.message);

  // Indexar asignaciones activas/futuras por habitación
  const currentByRoom = {};
  (assignments || []).forEach((a) => { currentByRoom[a.room_id] = a; });

  // Calcular estado derivado desde asignaciones (rooms.status solo importa para 'maintenance')
  return (rooms || []).map((room) => {
    const asgn = currentByRoom[room.id];
    let derivedStatus;
    if (room.is_maintenance) {
      derivedStatus = "maintenance";
    } else if (!asgn) {
      derivedStatus = "free";
    } else if (!asgn.move_out_date) {
      derivedStatus = "occupied";
    } else {
      derivedStatus = "pending_checkout";
    }
    return { ...room, derivedStatus };
  });
}

export async function updateRoom(id, patch, clientAccountId) {
  const { data, error } = await supabase
    .from("rooms")
    .update(patch)
    .eq("id", id)
    .eq("client_account_id", clientAccountId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function setRoomMaintenance(id, isMaintenance, clientAccountId) {
  const { data, error } = await supabase
    .from("rooms")
    .update({ is_maintenance: isMaintenance })
    .eq("id", id)
    .eq("client_account_id", clientAccountId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
