import { supabase } from "./supabaseClient";

export async function listPayers(lodgerId) {
  const { data, error } = await supabase
    .from("payer_rental")
    .select("*")
    .eq("lodger_id", lodgerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createPayer(payload) {
  const { data, error } = await supabase
    .from("payer_rental")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePayer(id, patch, clientAccountId) {
  const { data, error } = await supabase
    .from("payer_rental")
    .update(patch)
    .eq("id", id)
    .eq("client_account_id", clientAccountId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function togglePayerStatus(id, clientAccountId) {
  const { data: current, error: fetchError } = await supabase
    .from("payer_rental")
    .select("is_active")
    .eq("id", id)
    .eq("client_account_id", clientAccountId)
    .single();
  
  if (fetchError) throw new Error(fetchError.message);
  if (!current) throw new Error("Pagador no encontrado");
  
  const { data, error } = await supabase
    .from("payer_rental")
    .update({ is_active: !current.is_active })
    .eq("id", id)
    .eq("client_account_id", clientAccountId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
