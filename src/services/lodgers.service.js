import { supabase } from "./supabaseClient";
import { invokeWithAuth } from "./supabaseInvoke.services";

// ─── Lecturas directas con RLS ────────────────────────────────────────────────

export async function listLodgers({ status, clientAccountId } = {}) {
  const today = new Date().toISOString().split("T")[0];
  let q = supabase
    .from("profiles")
    .select(`
      *,
      active_assignment:lodger_room_assignments(
        id, move_in_date, move_out_date, billing_start_date, monthly_rent,
        room:rooms(id, number, accommodation_id),
        accommodation:accommodations(id, name)
      )
    `)
    .eq("role", "lodger")
    .or(`move_out_date.is.null,move_out_date.gt.${today}`, { foreignTable: "lodger_room_assignments" })
    .order("created_at", { ascending: false });

  // Filtro tenant (defensa en profundidad)
  if (clientAccountId) {
    q = q.eq("client_account_id", clientAccountId);
  }

  if (status) q = q.eq("onboarding_status", status);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getLodger(id, clientAccountId = null) {
  let q = supabase
    .from("profiles")
    .select(`
      *,
      assignments:lodger_room_assignments!lodger_id(
        *,
        room:rooms(id, number),
        accommodation:accommodations(id, name)
      )
    `)
    .eq("id", id)
    .eq("role", "lodger");

  // Filtro tenant (defensa en profundidad)
  if (clientAccountId) {
    q = q.eq("client_account_id", clientAccountId);
  }

  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Inquilino no encontrado");
  return data;
}

// ─── Escrituras por Edge Function (manage_lodger) ─────────────────────────────

function extractEdgeError(result) {
  if (result?.error?.message) return result.error.message;
  if (result?.error) return JSON.stringify(result.error);
  return "Error desconocido";
}

export async function createLodger(payload) {
  // 1. Obtener client_account_id del admin en sesión
  const { data: { user: adminUser }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !adminUser) throw new Error("Sesión no válida");

  const { data: adminProfile, error: profileErr } = await supabase
    .from("profiles")
    .select("client_account_id")
    .eq("id", adminUser.id)
    .single();
  if (profileErr) throw new Error(profileErr.message);
  const clientAccountId = adminProfile.client_account_id;
  if (!clientAccountId) throw new Error("El admin no tiene cuenta cliente asignada");

  // 2. Crear usuario en auth (client-side signUp)
  // NOTA: Supabase enviará un email de confirmación al inquilino. Si el proyecto
  // tiene email confirmation desactivado, la sesión del admin NO se ve afectada
  // porque signUp() para un usuario ya autenticado no reemplaza la sesión.
  const randomPassword = `${crypto.randomUUID().replace(/-/g, "")}Aa1!`;
  const { data: authData, error: signUpErr } = await supabase.auth.signUp({
    email: payload.email,
    password: randomPassword,
  });
  if (signUpErr) throw new Error(signUpErr.message);
  const userId = authData?.user?.id;
  if (!userId) throw new Error("No se pudo crear el usuario de autenticación");

  // 3. Insertar perfil completo (incluyendo todos los campos de nombre y dirección)
  const { data: lodger, error: insertErr } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      email: payload.email,
      role: "lodger",
      client_account_id: clientAccountId,
      full_name: payload.full_name || null,
      first_name: payload.first_name || null,
      last_name1: payload.last_name1 || null,
      last_name2: payload.last_name2 || null,
      nickname: payload.nickname || null,
      gender: payload.gender || null,
      phone: payload.phone || null,
      document_id: payload.document_id || null,
      address_street: payload.address_street || null,
      address_number: payload.address_number || null,
      address_floor: payload.address_floor || null,
      address_postal_code: payload.address_postal_code || null,
      address_city: payload.address_city || null,
      address_province: payload.address_province || null,
      address_country: payload.address_country || null,
      onboarding_status: payload.onboarding_status || "invited",
    })
    .select("*")
    .single();
  if (insertErr) throw new Error(insertErr.message);

  // 4. Asignar habitación si se proporcionó
  if (payload.room_id && payload.accommodation_id) {
    await assignRoomToLodger(userId, {
      roomId: payload.room_id,
      accommodationId: payload.accommodation_id,
      moveInDate: payload.move_in_date,
      billingStartDate: payload.billing_start_date || payload.move_in_date,
      monthlyRent: payload.monthly_rent || null,
      depositAmount: payload.deposit_amount || 0,
      commissionAmount: payload.commission_amount || null,
      firstMonthAmount: payload.first_month_amount || null,
    });
  }

  return lodger;
}

export async function updateLodger(id, patch) {
  // Query directa — evita 401 de manage_lodger y el session clearing que provoca.
  // RLS profiles_update_by_client_account permite al admin actualizar lodgers de su tenant.
  const { id: _id, email: _email, role: _role, client_account_id: _cai, created_at: _cat, ...safePatch } = patch;

  const { data, error } = await supabase
    .from("profiles")
    .update(safePatch)
    .eq("id", id)
    .eq("role", "lodger")
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function setLodgerStatus(id, status) {
  // Query directa — mismo motivo que updateLodger.
  const { data, error } = await supabase
    .from("profiles")
    .update({ onboarding_status: status })
    .eq("id", id)
    .eq("role", "lodger")
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function scheduleCheckout(lodgerId, moveOutDate) {
  // Query directa — evita invocar manage_lodger para operación que no requiere service_role.
  // 1. Obtener asignación activa
  const { data: assignment, error: asgErr } = await supabase
    .from("lodger_room_assignments")
    .select("id, room_id")
    .eq("lodger_id", lodgerId)
    .is("move_out_date", null)
    .maybeSingle();
  if (asgErr) throw new Error(asgErr.message);
  if (!assignment) throw new Error("No hay asignación activa para este inquilino");

  // 2. Registrar fecha de baja en asignación (el estado se deriva de esta fecha, sin tocar rooms.status)
  const { error: updateErr } = await supabase
    .from("lodger_room_assignments")
    .update({ move_out_date: moveOutDate })
    .eq("id", assignment.id);
  if (updateErr) throw new Error(updateErr.message);

  return { assignment_id: assignment.id };
}

export async function inviteLodger(lodgerId) {
  const result = await invokeWithAuth("manage_lodger", {
    body: { action: "invite", payload: { id: lodgerId } },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}

export async function assignRoomToLodger(lodgerId, { roomId, accommodationId, moveInDate, billingStartDate, monthlyRent, depositAmount, commissionAmount, firstMonthAmount }) {
  // Asignación directa para inquilinos sin habitación previa
  // Obtener client_account_id del inquilino
  const { data: lodgerProfile, error: profileErr } = await supabase
    .from("profiles")
    .select("client_account_id")
    .eq("id", lodgerId)
    .single();
  if (profileErr) throw new Error(`Error obteniendo perfil: ${profileErr.message}`);
  const clientAccountId = lodgerProfile.client_account_id;

  // Crear asignación
  const { data: newAssignment, error: assignErr } = await supabase
    .from("lodger_room_assignments")
    .insert({
      lodger_id: lodgerId,
      room_id: roomId,
      accommodation_id: accommodationId,
      client_account_id: clientAccountId,
      move_in_date: moveInDate,
      billing_start_date: billingStartDate || moveInDate,
      monthly_rent: monthlyRent || null,
      deposit_amount: depositAmount || 0,
      commission_amount: commissionAmount || null,
      first_month_amount: firstMonthAmount || null,
    })
    .select()
    .single();
  if (assignErr) throw new Error(`Error creando asignación: ${assignErr.message}`);

  // Activar inquilino
  const { error: statusErr } = await supabase
    .from("profiles")
    .update({ onboarding_status: "active" })
    .eq("id", lodgerId)
    .eq("role", "lodger");
  if (statusErr) throw new Error(`Error activando inquilino: ${statusErr.message}`);

  return newAssignment;
}

export async function reassignRoom(lodgerId, { newRoomId, newAccommodationId, moveInDate, billingStartDate, monthlyRent, depositAmount, commissionAmount, firstMonthAmount }) {
  // Query directa — evita 401 de manage_lodger. RLS exige client_account_id en INSERT,
  // lo obtenemos del propio perfil del inquilino.

  // 0. Obtener client_account_id del inquilino (requerido por RLS en lodger_room_assignments)
  const { data: lodgerProfile, error: profileErr } = await supabase
    .from("profiles")
    .select("client_account_id")
    .eq("id", lodgerId)
    .single();
  if (profileErr) throw new Error(`Error obteniendo perfil: ${profileErr.message}`);
  const clientAccountId = lodgerProfile.client_account_id;

  // 1. Obtener asignación activa actual para liberar habitación anterior
  const { data: currentAssignment } = await supabase
    .from("lodger_room_assignments")
    .select("room_id")
    .eq("lodger_id", lodgerId)
    .is("move_out_date", null)
    .maybeSingle();

  if (currentAssignment) {
    // 2. Cerrar asignación activa: poner move_out_date = nueva fecha de entrada
    const { error: e1 } = await supabase
      .from("lodger_room_assignments")
      .update({ move_out_date: moveInDate })
      .eq("lodger_id", lodgerId)
      .is("move_out_date", null);
    if (e1) throw new Error(`Error cerrando asignación anterior: ${e1.message}`);
  }

  // 4. Crear nueva asignación — client_account_id requerido por RLS WITH CHECK
  const { data: newAssignment, error: e3 } = await supabase
    .from("lodger_room_assignments")
    .insert({
      lodger_id: lodgerId,
      room_id: newRoomId,
      accommodation_id: newAccommodationId,
      client_account_id: clientAccountId,
      move_in_date: moveInDate,
      billing_start_date: billingStartDate || moveInDate,
      monthly_rent: monthlyRent || null,
      deposit_amount: depositAmount || 0,
      commission_amount: commissionAmount || null,
      first_month_amount: firstMonthAmount || null,
    })
    .select()
    .single();
  if (e3) throw new Error(`Error creando nueva asignación: ${e3.message}`);

  // 5. Activar inquilino
  const { error: e5 } = await supabase
    .from("profiles")
    .update({ onboarding_status: "active" })
    .eq("id", lodgerId)
    .eq("role", "lodger");
  if (e5) throw new Error(`Error activando inquilino: ${e5.message}`);

  return newAssignment;
}
