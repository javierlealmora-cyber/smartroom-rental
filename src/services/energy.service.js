// src/services/energy.service.js
// Lecturas directas con RLS para energy_bills y energy_readings

import { supabase } from "./supabaseClient";

export async function listEnergyBills({ accommodationId, status } = {}) {
  let q = supabase
    .from("energy_bills")
    .select("*, accommodation:accommodations(id, name)")
    .order("issue_date", { ascending: false });
  if (accommodationId) q = q.eq("accommodation_id", accommodationId);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getEnergyBill(id) {
  const { data, error } = await supabase
    .from("energy_bills")
    .select("*, accommodation:accommodations(id, name)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createEnergyBill(payload) {
  const { data, error } = await supabase
    .from("energy_bills")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateEnergyBill(id, patch) {
  const { data, error } = await supabase
    .from("energy_bills")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listEnergyReadings({ accommodationId, roomId } = {}) {
  let q = supabase
    .from("energy_readings")
    .select("*, room:rooms(id, number), accommodation:accommodations(id, name)")
    .order("reading_date", { ascending: false })
    .limit(100);
  if (accommodationId) q = q.eq("accommodation_id", accommodationId);
  if (roomId) q = q.eq("room_id", roomId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function settleEnergyBill(billId, clientAccountId) {
  const { data, error } = await supabase.rpc("settle_energy_bill", {
    p_bill_id:            billId,
    p_client_account_id:  clientAccountId,
  });
  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.error ?? "Error al liquidar la factura");
  return {
    settlements_count: data.settlements_count,
    amount_total:      data.amount_total,
    has_readings:      data.has_readings,
  };
}

export async function unsettleEnergyBill(billId, clientAccountId) {
  const { data, error } = await supabase.rpc("unsettle_energy_bill", {
    p_bill_id:            billId,
    p_client_account_id:  clientAccountId,
  });
  if (error) throw new Error(error.message);
  if (!data?.ok) throw new Error(data?.error ?? "Error al revertir el reparto");
}
