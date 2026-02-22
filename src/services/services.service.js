// src/services/services.service.js
// Lecturas directas con RLS para services_catalog y accommodation_services

import { supabase } from "./supabaseClient";

export async function listServicesCatalog({ status } = {}) {
  let q = supabase
    .from("services_catalog")
    .select("*, owner_entity:entities(id, name)")
    .order("name", { ascending: true });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getService(id) {
  const { data, error } = await supabase
    .from("services_catalog")
    .select("*, owner_entity:entities(id, name)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listAccommodationServices(accommodationId) {
  const { data, error } = await supabase
    .from("accommodation_services")
    .select("*, service:services_catalog(id, name, unit, unit_price, is_recurring)")
    .eq("accommodation_id", accommodationId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
