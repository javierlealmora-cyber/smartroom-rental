import { supabase } from "./supabaseClient";

// ─── Lodgers ──────────────────────────────────────────────────────────────────

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

export async function createLodger(lodgerPayload, assignmentPayload = null) {
  const { data: lodger, error: lodgerErr } = await supabase
    .from("lodgers")
    .insert(lodgerPayload)
    .select("*")
    .single();

  if (lodgerErr) throw new Error(lodgerErr.message);

  if (assignmentPayload) {
    const { error: assignErr } = await supabase
      .from("lodger_room_assignments")
      .insert({
        ...assignmentPayload,
        lodger_id: lodger.id,
        client_account_id: lodger.client_account_id,
      });

    if (assignErr) throw new Error(assignErr.message);

    // Marcar habitación como ocupada
    await supabase
      .from("rooms")
      .update({ status: "occupied" })
      .eq("id", assignmentPayload.room_id);

    // Actualizar estado del inquilino a active
    await supabase
      .from("lodgers")
      .update({ status: "active" })
      .eq("id", lodger.id);
  }

  return lodger;
}

export async function updateLodger(id, patch) {
  const { data, error } = await supabase
    .from("lodgers")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function setLodgerStatus(id, status) {
  return updateLodger(id, { status });
}

export async function scheduleCheckout(lodgerId, moveOutDate) {
  const { error } = await supabase
    .from("lodger_room_assignments")
    .update({ move_out_date: moveOutDate, status: "ended" })
    .eq("lodger_id", lodgerId)
    .eq("status", "active");

  if (error) throw new Error(error.message);

  await supabase
    .from("lodgers")
    .update({ status: "pending_checkout" })
    .eq("id", lodgerId);
}
