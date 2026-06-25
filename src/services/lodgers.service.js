import { supabase } from "./supabaseClient";
import { invokeWithAuth } from "./supabaseInvoke.services";

// ─── Lecturas directas con RLS ────────────────────────────────────────────────

export async function listLodgers({ status, clientAccountId } = {}) {
  const today = new Date().toISOString().split("T")[0];
  
  // ✅ SEGURIDAD: Query sin OR en foreignTable para evitar bypass de RLS
  let q = supabase
    .from("profiles")
    .select(`
      *,
      active_assignment:lodger_room_assignments(
        id, move_in_date, move_out_date, billing_start_date, monthly_rent,
        accompanist_id,
        room:rooms(id, number, accommodation_id),
        accommodation:accommodations(id, name),
        accompanist:lodger_accompanists(
          id, first_name, last_name1, last_name2, nickname,
          document_type, document_id, gender, status
        )
      )
    `)
    .eq("role", "lodger")
    .order("created_at", { ascending: false });

  // Filtro tenant (defensa en profundidad)
  if (clientAccountId) {
    q = q.eq("client_account_id", clientAccountId);
  }

  if (status) q = q.eq("onboarding_status", status);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  
  // Filtrar asignaciones activas en cliente (más seguro que OR en foreignTable)
  const lodgers = (data || []).map(lodger => {
    if (lodger.active_assignment && Array.isArray(lodger.active_assignment)) {
      lodger.active_assignment = lodger.active_assignment.filter(assignment => {
        if (!assignment.move_out_date) return true; // Sin fecha de salida = activo
        return assignment.move_out_date > today; // Fecha futura = activo
      });
    }
    return lodger;
  });
  
  return lodgers;
}

export async function getLodger(id, clientAccountId = null) {
  // Primero obtener el perfil del inquilino
  let q = supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("role", "lodger");

  // Filtro tenant (defensa en profundidad)
  if (clientAccountId) {
    q = q.eq("client_account_id", clientAccountId);
  }

  const { data: profile, error: profileError } = await q.maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile) throw new Error("Inquilino no encontrado");

  // Luego obtener las asignaciones ordenadas por created_at DESC
  // REQ-015: incluimos el acompañante completo para la sección dedicada en TenantDetail
  let assignmentsQuery = supabase
    .from("lodger_room_assignments")
    .select(`
      *,
      room:rooms(id, number),
      accommodation:accommodations(id, name),
      accompanist:lodger_accompanists(
        id, first_name, last_name1, last_name2, nickname,
        document_type, document_id, gender, birth_date, nationality,
        email, phone,
        address_street, address_number, address_floor,
        address_postal_code, address_city, address_province, address_country,
        notes, status, created_at, updated_at
      )
    `)
    .eq("lodger_id", id)
    .order("created_at", { ascending: false });

  // Filtro tenant para asignaciones (seguridad multi-tenant)
  if (clientAccountId) {
    assignmentsQuery = assignmentsQuery.eq("client_account_id", clientAccountId);
  }

  const { data: assignments, error: assignmentsError } = await assignmentsQuery;
  if (assignmentsError) throw new Error(assignmentsError.message);

  // Combinar los datos
  return {
    ...profile,
    assignments: assignments || []
  };
}

// ─── Escrituras por Edge Function (manage_lodger) ─────────────────────────────

function extractEdgeError(result) {
  if (result?.error?.message) return result.error.message;
  if (result?.error) return JSON.stringify(result.error);
  return "Error desconocido";
}

export async function createLodger(payload) {
  // ✅ SEGURIDAD: Usar Edge Function para creación segura de inquilinos
  // La contraseña se genera en el servidor con mayor entropía
  const result = await invokeWithAuth("manage_lodger", {
    body: { action: "create", payload },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data?.lodger ?? result.lodger;
}

export async function updateLodger(id, patch) {
  // ✅ SEGURIDAD: Usar Edge Function para actualización segura con auditoría
  const { id: _id, email: _email, role: _role, client_account_id: _cai, created_at: _cat, ...safePatch } = patch;
  
  const result = await invokeWithAuth("manage_lodger", {
    body: { 
      action: "update", 
      payload: { id, ...safePatch }
    },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data?.lodger ?? result.lodger;
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
  // ✅ SEGURIDAD: Usar Edge Function para programar check-out con auditoría
  const result = await invokeWithAuth("manage_lodger", {
    body: { 
      action: "schedule_checkout", 
      payload: { id: lodgerId, checkout_date: moveOutDate }
    },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}

export async function inviteLodger(lodgerId) {
  const result = await invokeWithAuth("manage_lodger", {
    body: { action: "invite", payload: { id: lodgerId } },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}

/**
 * Asigna una habitación al inquilino.
 * REQ-015: si se proporciona `accompanist` (objeto con los campos de `lodger_accompanists`),
 * la Edge Function crea atomicamente la ficha del acompañante y rellena accompanist_id.
 */
export async function assignRoomToLodger(lodgerId, {
  roomId, accommodationId, moveInDate, billingStartDate,
  monthlyRent, depositAmount, commissionAmount, firstMonthAmount, servicesProvisionAmount,
  accompanist, // REQ-015 (opcional)
}) {
  const payload = {
    id: lodgerId,
    room_id: roomId,
    accommodation_id: accommodationId,
    move_in_date: moveInDate,
    billing_start_date: billingStartDate,
    monthly_rent: monthlyRent,
    deposit_amount: depositAmount,
    commission_amount: commissionAmount,
    first_month_amount: firstMonthAmount,
    services_provision_amount: servicesProvisionAmount,
  };
  if (accompanist && typeof accompanist === "object") {
    payload.accompanist = accompanist;
  }

  const result = await invokeWithAuth("manage_lodger", {
    body: { action: "assign_room", payload },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}

/**
 * Reasigna al inquilino a otra habitación.
 * REQ-015: el acompañante se arrastra automáticamente por código en la Edge
 * (el frontend NO debe pasar accompanist_id).
 */
export async function reassignRoom(lodgerId, {
  newRoomId, newAccommodationId: _newAccommodationId, moveInDate, billingStartDate,
  monthlyRent, depositAmount, commissionAmount, firstMonthAmount, servicesProvisionAmount,
}) {
  const result = await invokeWithAuth("manage_lodger", {
    body: {
      action: "reassign_room",
      payload: {
        id: lodgerId,
        new_room_id: newRoomId,
        move_in_date: moveInDate,
        billing_start_date: billingStartDate,
        monthly_rent: monthlyRent,
        deposit_amount: depositAmount,
        commission_amount: commissionAmount,
        first_month_amount: firstMonthAmount,
        services_provision_amount: servicesProvisionAmount,
      }
    },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}

// ─── REQ-015: Acompañantes ─────────────────────────────────────────

/**
 * Actualiza datos personales del acompañante (REQ-015).
 * Disponible para admin y superadmin. La Edge rechaza campos inmutables
 * (client_account_id, status, id).
 */
export async function updateAccompanist(accompanistId, patch) {
  const result = await invokeWithAuth("manage_lodger", {
    body: {
      action: "update_accompanist",
      payload: { id: accompanistId, ...(patch || {}) },
    },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}

/**
 * Elimina al acompañante (soft delete) — SOLO superadmin con motivo ≥ 10 caracteres.
 * Limpia accompanist_id de la asignación activa.
 */
export async function removeAccompanist(accompanistId, reason) {
  const result = await invokeWithAuth("manage_lodger", {
    body: {
      action: "remove_accompanist",
      payload: { id: accompanistId, reason },
    },
  });
  if (!result?.ok) throw new Error(extractEdgeError(result));
  return result.data;
}
