import { supabase } from "./supabaseClient";
import { invokeWithAuth } from "./supabaseInvoke.services";

// ─── Lecturas directas con RLS ────────────────────────────────────────────────

export async function listLodgers({ status } = {}) {
  let q = supabase
    .from("lodgers")
    .select(`
      *,
      active_assignment:lodger_room_assignments(
        id, move_in_date, billing_start_date, monthly_rent, status,
        room:rooms(id, number, accommodation_id),
        accommodation:accommodations(id, name)
      )
    `)
    .eq("lodger_room_assignments.status", "active")
    .order("created_at", { ascending: false });

  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getLodger(id) {
  const { data, error } = await supabase
    .from("lodgers")
    .select(`
      *,
      assignments:lodger_room_assignments(
        *,
        room:rooms(id, number),
        accommodation:accommodations(id, name)
      )
    `)
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// ─── Escrituras por Edge Function (manage_lodger) ─────────────────────────────

function extractEdgeError(result) {
  if (result?.error?.message) return result.error.message;
  if (result?.error) return JSON.stringify(result.error);
  return "Error desconocido";
}

export async function createLodger(payload) {
  const result = await invokeWithAuth("manage_lodger", {
    body: { action: "create", payload },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data?.lodger ?? result.data;
}

export async function updateLodger(id, patch) {
  const result = await invokeWithAuth("manage_lodger", {
    body: { action: "update", payload: { id, ...patch } },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}

export async function setLodgerStatus(id, status) {
  const result = await invokeWithAuth("manage_lodger", {
    body: { action: "set_status", payload: { id, status } },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}

export async function scheduleCheckout(lodgerId, moveOutDate) {
  const result = await invokeWithAuth("manage_lodger", {
    body: { action: "schedule_checkout", payload: { id: lodgerId, move_out_date: moveOutDate } },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}

export async function reassignRoom(lodgerId, { newRoomId, newAccommodationId, moveInDate, billingStartDate, monthlyRent }) {
  const result = await invokeWithAuth("manage_lodger", {
    body: {
      action: "reassign_room",
      payload: {
        id: lodgerId,
        new_room_id: newRoomId,
        new_accommodation_id: newAccommodationId,
        move_in_date: moveInDate,
        billing_start_date: billingStartDate,
        monthly_rent: monthlyRent,
      },
    },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}
