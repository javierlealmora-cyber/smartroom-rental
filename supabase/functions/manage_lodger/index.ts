// Edge Function: manage_lodger
// Gestiona operaciones de escritura sobre inquilinos (profiles con role='lodger')
// Acciones:
//   create | update | set_status | invite | assign_room | reassign_room | schedule_checkout
//   update_accompanist (admin)            — REQ-015
//   remove_accompanist (solo superadmin)  — REQ-015 (requiere reason ≥ 10 chars)
// Valida: JWT + rol admin/superadmin + tenant + límites de plan
// REQ-015: assign_room/reassign_room aceptan accompanist? para habitación compartida

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  ok, err, optionsResponse, ERROR_CODES,
} from "../_shared/response.ts";

const SITE_URL = "https://smartroomrentalplatform.com";

// ─── REQ-015: helpers de acompañante ─────────────────────────────────────
// Whitelist de campos editables del acompañante. Cualquier otro se ignora.
const ACCOMPANIST_EDITABLE_FIELDS = [
  "first_name", "last_name1", "last_name2", "nickname",
  "document_type", "document_id",
  "gender", "birth_date", "nationality",
  "email", "phone",
  "address_street", "address_number", "address_floor",
  "address_postal_code", "address_city", "address_province", "address_country",
  "notes",
] as const;

function sanitizeAccompanistPayload(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of ACCOMPANIST_EDITABLE_FIELDS) {
    if (input[k] !== undefined) out[k] = input[k];
  }
  return out;
}

function validateAccompanistRequired(p: Record<string, unknown>): string | null {
  if (!p.first_name || typeof p.first_name !== "string" || !(p.first_name as string).trim()) {
    return "accompanist.first_name is required";
  }
  if (!p.last_name1 || typeof p.last_name1 !== "string" || !(p.last_name1 as string).trim()) {
    return "accompanist.last_name1 is required";
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();

  try {
    // ── 1. Verificar JWT ──────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) return err(ERROR_CODES.UNAUTHORIZED, "Missing authorization header", 401);

    const token = authHeader.replace("Bearer ", "");

    // Usar SERVICE_ROLE_KEY para todas las operaciones (incluyendo verificación JWT).
    // getUser() con service role key funciona correctamente en todos los entornos.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return err(ERROR_CODES.UNAUTHORIZED, "Authentication failed", 401);

    // ── 2. Verificar perfil + rol ─────────────────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, client_account_id")
      .eq("id", user.id)
      .single();

    if (!profile) return err(ERROR_CODES.NOT_FOUND, "Profile not found", 404);
    if (!["admin", "superadmin"].includes(profile.role)) {
      return err(ERROR_CODES.FORBIDDEN, "Insufficient permissions", 403);
    }

    const clientAccountId = profile.client_account_id;
    if (!clientAccountId) return err(ERROR_CODES.FORBIDDEN, "No tenant associated", 403);

    // ── 3. Parsear body ───────────────────────────────────────────────────────
    const body = await req.json();
    const { action, payload } = body as {
      action: string;
      payload: Record<string, unknown>;
    };

    if (!action || !payload) return err(ERROR_CODES.VALIDATION, "Missing action or payload", 400);

    const validActions = [
      "create", "update", "set_status", "invite",
      "assign_room", "reassign_room", "schedule_checkout",
      "update_accompanist", "remove_accompanist", // REQ-015
    ];
    if (!validActions.includes(action)) {
      return err(ERROR_CODES.INVALID_ACTION, `Unknown action: ${action}`, 400);
    }

    // ── 4. Verificar cuenta activa + obtener plan ─────────────────────────────
    const { data: account } = await supabase
      .from("client_accounts")
      .select("status, plan_code")
      .eq("id", clientAccountId)
      .single();

    if (!account || !["active", "draft"].includes(account.status)) {
      return err(ERROR_CODES.ACCOUNT_INACTIVE, "Account is not active", 403);
    }

    const { data: plan } = await supabase
      .from("plans_catalog")
      .select("max_lodgers")
      .eq("code", account.plan_code)
      .eq("status", "active")
      .single();

    // ── 5. Acción: CREATE ─────────────────────────────────────────────────────
    if (action === "create") {
      const { email, full_name } = payload as { email: string; full_name: string };

      if (!email) return err(ERROR_CODES.VALIDATION, "email is required", 400);
      if (!full_name) return err(ERROR_CODES.VALIDATION, "full_name is required", 400);

      // Validar límite de plan
      if (plan && plan.max_lodgers !== -1) {
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("client_account_id", clientAccountId)
          .eq("role", "lodger")
          .in("onboarding_status", ["active", "invited"]);

        if ((count ?? 0) >= plan.max_lodgers) {
          return err(
            ERROR_CODES.PLAN_LIMIT_EXCEEDED,
            `Tu plan permite un máximo de ${plan.max_lodgers} inquilinos activos`,
            403,
            { current: count, limit: plan.max_lodgers }
          );
        }
      }

      // Crear usuario en auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { full_name },
      });

      if (authError) {
        return err(ERROR_CODES.INTERNAL, "Error creating auth user", 500, authError.message);
      }

      // Extraer campos de asignación de habitación (si existen)
      const {
        room_id,
        accommodation_id,
        move_in_date,
        billing_start_date,
        monthly_rent,
        deposit_amount,
        commission_amount,
        first_month_amount,
        services_provision_amount,
        ...profileFields
      } = payload as any;

      // Crear perfil de lodger solo con campos válidos de profiles
      const { data: newLodger, error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authUser.user.id,
          email,
          full_name,
          role: "lodger",
          client_account_id: clientAccountId,
          onboarding_status: payload.onboarding_status || "invited",
          // Datos personales
          first_name:           profileFields.first_name           || null,
          last_name1:           profileFields.last_name1           || null,
          last_name2:           profileFields.last_name2           || null,
          nickname:             profileFields.nickname             || null,
          phone:                profileFields.phone                || null,
          document_id:          profileFields.document_id          || null,
          gender:               profileFields.gender               || null,
          // Dirección
          address_street:       profileFields.address_street       || null,
          address_number:       profileFields.address_number       || null,
          address_floor:        profileFields.address_floor        || null,
          address_postal_code:  profileFields.address_postal_code  || null,
          address_city:         profileFields.address_city         || null,
          address_province:     profileFields.address_province     || null,
          address_country:      profileFields.address_country      || null,
        })
        .select("*")
        .single();

      if (profileError) {
        // Rollback: eliminar usuario de auth si falla la creación del perfil
        await supabase.auth.admin.deleteUser(authUser.user.id);
        return err(ERROR_CODES.INTERNAL, "Error creating lodger profile", 500, profileError.message);
      }

      // Si se proporcionó asignación de habitación, crearla
      if (room_id && accommodation_id && move_in_date) {
        const { error: assignError } = await supabase
          .from("lodger_room_assignments")
          .insert({
            lodger_id: newLodger.id,
            room_id,
            accommodation_id,
            client_account_id: clientAccountId,
            move_in_date,
            billing_start_date: billing_start_date || move_in_date,
            monthly_rent: monthly_rent || 0,
            deposit_amount: deposit_amount || 0,
            commission_amount: commission_amount || null,
            first_month_amount: first_month_amount || null,
            services_provision_amount: services_provision_amount || null,
          });

        if (assignError) {
          // No hacer rollback del lodger, solo registrar el error
          console.error("Error creating room assignment:", assignError);
        }
      }

      await supabase.from("audit_log").insert({
        client_account_id: clientAccountId,
        actor_user_id: user.id,
        actor_role: profile.role,
        entity_type: "lodger",
        entity_id: newLodger.id,
        action: "create",
        new_values: newLodger,
      });

      return ok({ lodger: newLodger }, 201);
    }

    // ── 6. Acción: UPDATE ─────────────────────────────────────────────────────
    if (action === "update") {
      const { id, ...patch } = payload as { id: string; [key: string]: unknown };
      if (!id) return err(ERROR_CODES.VALIDATION, "id is required for update", 400);

      const { data: existing } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .eq("role", "lodger")
        .eq("client_account_id", clientAccountId)
        .single();

      if (!existing) return err(ERROR_CODES.NOT_FOUND, "Lodger not found", 404);

      // Proteger campos inmutables
      delete patch.id;
      delete patch.email;
      delete patch.role;
      delete patch.client_account_id;
      delete patch.created_at;

      const { data: updated, error: updateError } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

      if (updateError) return err(ERROR_CODES.INTERNAL, "Error updating lodger", 500, updateError.message);

      await supabase.from("audit_log").insert({
        client_account_id: clientAccountId,
        actor_user_id: user.id,
        actor_role: profile.role,
        entity_type: "lodger",
        entity_id: id,
        action: "update",
        old_values: existing,
        new_values: updated,
      });

      return ok(updated);
    }

    // ── 7. Acción: SET_STATUS ─────────────────────────────────────────────────
    if (action === "set_status") {
      const { id, status } = payload as { id: string; status: string };
      if (!id) return err(ERROR_CODES.VALIDATION, "id is required", 400);

      const validStatuses = ["active", "invited", "pending_checkout", "inactive"];
      if (!status || !validStatuses.includes(status)) {
        return err(ERROR_CODES.VALIDATION, `status must be one of: ${validStatuses.join(", ")}`, 400);
      }

      const { data: existing } = await supabase
        .from("profiles")
        .select("id, onboarding_status")
        .eq("id", id)
        .eq("role", "lodger")
        .eq("client_account_id", clientAccountId)
        .single();

      if (!existing) return err(ERROR_CODES.NOT_FOUND, "Lodger not found", 404);

      const { data: updated, error: statusError } = await supabase
        .from("profiles")
        .update({ onboarding_status: status })
        .eq("id", id)
        .select("*")
        .single();

      if (statusError) return err(ERROR_CODES.INTERNAL, "Error updating status", 500, statusError.message);

      await supabase.from("audit_log").insert({
        client_account_id: clientAccountId,
        actor_user_id: user.id,
        actor_role: profile.role,
        entity_type: "lodger",
        entity_id: id,
        action: "status_change",
        old_values: { onboarding_status: existing.onboarding_status },
        new_values: { onboarding_status: status },
      });

      return ok(updated);
    }

    // ── 8. Acción: INVITE ─────────────────────────────────────────────────────
    if (action === "invite") {
      const { id } = payload as { id: string };
      if (!id) return err(ERROR_CODES.VALIDATION, "id is required", 400);

      const { data: lodger } = await supabase
        .from("profiles")
        .select("id, email, full_name, onboarding_status")
        .eq("id", id)
        .eq("role", "lodger")
        .eq("client_account_id", clientAccountId)
        .single();

      if (!lodger) return err(ERROR_CODES.NOT_FOUND, "Lodger not found", 404);

      // Generar magic link
      const { data: magicLink, error: magicError } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: lodger.email,
        options: {
          redirectTo: `${SITE_URL}/v2/lodger/dashboard`,
        },
      });

      if (magicError) {
        return err(ERROR_CODES.INTERNAL, "Error generating magic link", 500, magicError.message);
      }

      // Aquí deberías enviar el email con el magic link
      // Por ahora solo retornamos el link para testing
      console.log(`Magic link for ${lodger.email}: ${magicLink.properties.action_link}`);

      await supabase.from("audit_log").insert({
        client_account_id: clientAccountId,
        actor_user_id: user.id,
        actor_role: profile.role,
        entity_type: "lodger",
        entity_id: id,
        action: "invite_sent",
        new_values: { email: lodger.email },
      });

      return ok({ message: "Invitation sent", email: lodger.email, magic_link: magicLink.properties.action_link });
    }

    // ── 9. Acción: ASSIGN_ROOM ────────────────────────────────────────────────
    if (action === "assign_room") {
      const { 
        id, room_id, accommodation_id, move_in_date, billing_start_date, 
        monthly_rent, deposit_amount, commission_amount, first_month_amount, 
        services_provision_amount 
      } = payload as {
        id: string;
        room_id: string;
        accommodation_id: string;
        move_in_date: string;
        billing_start_date?: string;
        monthly_rent?: number;
        deposit_amount?: number;
        commission_amount?: number;
        first_month_amount?: number;
        services_provision_amount?: number;
      };

      if (!id) return err(ERROR_CODES.VALIDATION, "id (lodger id) is required", 400);
      if (!room_id) return err(ERROR_CODES.VALIDATION, "room_id is required", 400);
      if (!accommodation_id) return err(ERROR_CODES.VALIDATION, "accommodation_id is required", 400);
      if (!move_in_date) return err(ERROR_CODES.VALIDATION, "move_in_date is required", 400);

      // Verificar que el lodger existe y pertenece al tenant
      const { data: lodger } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", id)
        .eq("role", "lodger")
        .eq("client_account_id", clientAccountId)
        .single();

      if (!lodger) return err(ERROR_CODES.NOT_FOUND, "Lodger not found", 404);

      // Verificar que no tiene asignación activa
      const { data: existingAssignment } = await supabase
        .from("lodger_room_assignments")
        .select("id")
        .eq("lodger_id", id)
        .is("move_out_date", null)
        .maybeSingle();

      if (existingAssignment) {
        return err(ERROR_CODES.VALIDATION, "Lodger already has an active room assignment", 400);
      }

      // Verificar que la habitación existe, está libre y pertenece al tenant
      const { data: room } = await supabase
        .from("rooms")
        .select("id, is_maintenance")
        .eq("id", room_id)
        .eq("client_account_id", clientAccountId)
        .single();

      if (!room) return err(ERROR_CODES.NOT_FOUND, "Room not found", 404);
      if (room.is_maintenance) {
        return err(ERROR_CODES.VALIDATION, "Room is under maintenance", 400);
      }

      // Verificar que no hay asignación activa o futura en la habitación
      const today = new Date().toISOString().split("T")[0];
      const { data: activeRoomAsgn } = await supabase
        .from("lodger_room_assignments")
        .select("id")
        .eq("room_id", room_id)
        .or(`move_out_date.is.null,move_out_date.gt.${today}`)
        .maybeSingle();

      if (activeRoomAsgn) {
        return err(ERROR_CODES.VALIDATION, "Room is not available", 400);
      }

      // ─── REQ-015: crear acompañante (si payload presente) ─────────────────
      const accompanistPayload = (payload as Record<string, unknown>).accompanist as
        | Record<string, unknown>
        | undefined;
      let newAccompanistId: string | null = null;

      if (accompanistPayload && typeof accompanistPayload === "object") {
        const validationError = validateAccompanistRequired(accompanistPayload);
        if (validationError) return err(ERROR_CODES.VALIDATION, validationError, 400);

        const sanitized = sanitizeAccompanistPayload(accompanistPayload);

        const { data: newAccompanist, error: accError } = await supabase
          .from("lodger_accompanists")
          .insert({
            ...sanitized,
            client_account_id: clientAccountId,
          })
          .select("id")
          .single();

        if (accError || !newAccompanist) {
          return err(
            ERROR_CODES.INTERNAL,
            "Error creating accompanist",
            500,
            accError?.message,
          );
        }
        newAccompanistId = newAccompanist.id;
      }

      // Crear asignación
      const { data: newAssignment, error: assignError } = await supabase
        .from("lodger_room_assignments")
        .insert({
          lodger_id: id,
          room_id,
          accommodation_id,
          client_account_id: clientAccountId,
          move_in_date,
          billing_start_date: billing_start_date || move_in_date,
          monthly_rent: monthly_rent || null,
          deposit_amount: deposit_amount || 0,
          commission_amount: commission_amount || null,
          first_month_amount: first_month_amount || null,
          services_provision_amount: services_provision_amount || null,
          accompanist_id: newAccompanistId, // REQ-015
        })
        .select("*")
        .single();

      if (assignError) {
        // Rollback del acompañante si la asignación falla
        if (newAccompanistId) {
          try {
            await supabase.from("lodger_accompanists").delete().eq("id", newAccompanistId);
          } catch { /* non-fatal */ }
        }
        return err(ERROR_CODES.INTERNAL, "Error creating room assignment", 500, assignError.message);
      }

      // Activar inquilino
      await supabase
        .from("profiles")
        .update({ onboarding_status: "active" })
        .eq("id", id)
        .eq("role", "lodger");

      // Registrar en audit_log
      await supabase.from("audit_log").insert({
        client_account_id: clientAccountId,
        actor_user_id: user.id,
        actor_role: profile.role,
        entity_type: "lodger_assignment",
        entity_id: newAssignment.id,
        action: "assign_room",
        new_values: newAssignment,
      });

      // REQ-015: auditar alta de acompañante separadamente
      if (newAccompanistId) {
        try {
          await supabase.from("audit_log").insert({
            client_account_id: clientAccountId,
            actor_user_id: user.id,
            actor_role: profile.role,
            entity_type: "lodger_accompanist",
            entity_id: newAccompanistId,
            action: "set_accompanist",
            new_values: {
              assignment_id: newAssignment.id,
              ...sanitizeAccompanistPayload(accompanistPayload!),
            },
          });
        } catch { /* non-fatal */ }
      }

      return ok(newAssignment);
    }

    // ── 10. Acción: REASSIGN_ROOM ─────────────────────────────────────────────
    if (action === "reassign_room") {
      const { 
        id, new_room_id, move_in_date, billing_start_date, 
        monthly_rent, deposit_amount, commission_amount, first_month_amount, 
        services_provision_amount 
      } = payload as {
        id: string;
        new_room_id: string;
        move_in_date: string;
        billing_start_date?: string;
        monthly_rent?: number;
        deposit_amount?: number;
        commission_amount?: number;
        first_month_amount?: number;
        services_provision_amount?: number;
      };

      if (!id) return err(ERROR_CODES.VALIDATION, "id (lodger id) is required", 400);
      if (!new_room_id) return err(ERROR_CODES.VALIDATION, "new_room_id is required", 400);
      if (!move_in_date) return err(ERROR_CODES.VALIDATION, "move_in_date is required", 400);

      // Verificar que el lodger existe y pertenece al tenant
      const { data: lodger } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", id)
        .eq("role", "lodger")
        .eq("client_account_id", clientAccountId)
        .single();

      if (!lodger) return err(ERROR_CODES.NOT_FOUND, "Lodger not found", 404);

      // Verificar que la nueva habitación existe, está libre y pertenece al tenant
      const { data: newRoom } = await supabase
        .from("rooms")
        .select("id, is_maintenance, accommodation_id")
        .eq("id", new_room_id)
        .eq("client_account_id", clientAccountId)
        .single();

      if (!newRoom) return err(ERROR_CODES.NOT_FOUND, "Room not found", 404);
      if (newRoom.is_maintenance) {
        return err(ERROR_CODES.VALIDATION, "Room is under maintenance", 400);
      }
      // Verificar que no hay asignación activa o futura en la habitación
      const today = new Date().toISOString().split("T")[0];
      const { data: activeAsgn } = await supabase
        .from("lodger_room_assignments")
        .select("id")
        .eq("room_id", new_room_id)
        .or(`move_out_date.is.null,move_out_date.gt.${today}`)
        .maybeSingle();
      if (activeAsgn) {
        return err(ERROR_CODES.VALIDATION, "Room is not available", 400);
      }

      // Cerrar asignación actual si existe (incluye accompanist_id para arrastre)
      const { data: currentAssignment } = await supabase
        .from("lodger_room_assignments")
        .select("id, room_id, accompanist_id")
        .eq("lodger_id", id)
        .is("move_out_date", null)
        .maybeSingle();

      if (currentAssignment) {
        await supabase
          .from("lodger_room_assignments")
          .update({ move_out_date: move_in_date })
          .eq("id", currentAssignment.id);

      }

      // Crear nueva asignación
      // REQ-015: arrastrar accompanist_id por código (regla de inseparabilidad).
      // El frontend NO debe pasarlo; siempre lo decide la Edge.
      const { data: newAssignment, error: assignError } = await supabase
        .from("lodger_room_assignments")
        .insert({
          lodger_id: id,
          room_id: new_room_id,
          accommodation_id: newRoom.accommodation_id,
          client_account_id: clientAccountId,
          move_in_date,
          billing_start_date: billing_start_date || move_in_date,
          monthly_rent: monthly_rent || null,
          deposit_amount: deposit_amount || 0,
          commission_amount: commission_amount || null,
          first_month_amount: first_month_amount || null,
          services_provision_amount: services_provision_amount || null,
          accompanist_id: currentAssignment?.accompanist_id ?? null, // REQ-015
        })
        .select("*")
        .single();

      if (assignError) {
        return err(ERROR_CODES.INTERNAL, "Error creating room assignment", 500, assignError.message);
      }

      await supabase.from("audit_log").insert({
        client_account_id: clientAccountId,
        actor_user_id: user.id,
        actor_role: profile.role,
        entity_type: "lodger_assignment",
        entity_id: newAssignment.id,
        action: "reassign_room",
        old_values: currentAssignment,
        new_values: newAssignment,
      });

      return ok(newAssignment);
    }

    // ── 10. Acción: SCHEDULE_CHECKOUT ────────────────────────────────────────
    if (action === "schedule_checkout") {
      const { id, checkout_date } = payload as { id: string; checkout_date?: string };
      if (!id) return err(ERROR_CODES.VALIDATION, "id (lodger id) is required", 400);

      const { data: lodger } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", id)
        .eq("role", "lodger")
        .eq("client_account_id", clientAccountId)
        .single();

      if (!lodger) return err(ERROR_CODES.NOT_FOUND, "Lodger not found", 404);

      // Buscar asignación activa
      const { data: assignment } = await supabase
        .from("lodger_room_assignments")
        .select("id, room_id")
        .eq("lodger_id", id)
        .is("move_out_date", null)
        .maybeSingle();

      if (!assignment) {
        return err(ERROR_CODES.NOT_FOUND, "No active room assignment found", 404);
      }

      // Programar checkout: guardar la fecha de salida
      const { data: updated, error: updateError } = await supabase
        .from("lodger_room_assignments")
        .update({
          move_out_date: checkout_date || null,
        })
        .eq("id", assignment.id)
        .select("*")
        .single();

      if (updateError) {
        return err(ERROR_CODES.INTERNAL, "Error scheduling checkout", 500, updateError.message);
      }

      // Actualizar estado de habitación
      await supabase
        .from("rooms")
        .update({ status: "pending_checkout" })
        .eq("id", assignment.room_id);

      // Actualizar estado del lodger
      await supabase
        .from("profiles")
        .update({ onboarding_status: "pending_checkout" })
        .eq("id", id);

      await supabase.from("audit_log").insert({
        client_account_id: clientAccountId,
        actor_user_id: user.id,
        actor_role: profile.role,
        entity_type: "lodger",
        entity_id: id,
        action: "schedule_checkout",
        new_values: { checkout_date },
      });

      return ok(updated);
    }

    // ── 11. REQ-015 — Acción: UPDATE_ACCOMPANIST (admin) ─────────────────────
    if (action === "update_accompanist") {
      const { id: accompanistId, ...rest } = payload as { id?: string; [k: string]: unknown };
      if (!accompanistId) {
        return err(ERROR_CODES.VALIDATION, "id (accompanist id) is required", 400);
      }

      // Verificar que el acompañante existe y pertenece al tenant (RLS + check explícito)
      const { data: existing } = await supabase
        .from("lodger_accompanists")
        .select("*")
        .eq("id", accompanistId)
        .eq("client_account_id", clientAccountId)
        .single();

      if (!existing) return err(ERROR_CODES.NOT_FOUND, "Accompanist not found", 404);

      // Solo se permiten campos personales — sanitizar.
      // Cualquier intento de mutar client_account_id, status o id queda fuera.
      const patch = sanitizeAccompanistPayload(rest);
      if (Object.keys(patch).length === 0) {
        return err(ERROR_CODES.VALIDATION, "No editable fields provided", 400);
      }

      // Validar que first_name/last_name1, si vienen, no se vacían
      if (patch.first_name !== undefined &&
          (typeof patch.first_name !== "string" || !(patch.first_name as string).trim())) {
        return err(ERROR_CODES.VALIDATION, "first_name cannot be empty", 400);
      }
      if (patch.last_name1 !== undefined &&
          (typeof patch.last_name1 !== "string" || !(patch.last_name1 as string).trim())) {
        return err(ERROR_CODES.VALIDATION, "last_name1 cannot be empty", 400);
      }

      const { data: updated, error: updateError } = await supabase
        .from("lodger_accompanists")
        .update(patch)
        .eq("id", accompanistId)
        .eq("client_account_id", clientAccountId)
        .select("*")
        .single();

      if (updateError) {
        return err(ERROR_CODES.INTERNAL, "Error updating accompanist", 500, updateError.message);
      }

      try {
        await supabase.from("audit_log").insert({
          client_account_id: clientAccountId,
          actor_user_id: user.id,
          actor_role: profile.role,
          entity_type: "lodger_accompanist",
          entity_id: accompanistId,
          action: "update_accompanist",
          old_values: existing,
          new_values: updated,
        });
      } catch { /* non-fatal */ }

      return ok(updated);
    }

    // ── 12. REQ-015 — Acción: REMOVE_ACCOMPANIST (solo superadmin) ───────────
    if (action === "remove_accompanist") {
      if (profile.role !== "superadmin") {
        return err(
          ERROR_CODES.FORBIDDEN,
          "Only superadmin can remove an accompanist",
          403,
        );
      }

      const { id: accompanistId, reason } = payload as {
        id?: string;
        reason?: string;
      };

      if (!accompanistId) {
        return err(ERROR_CODES.VALIDATION, "id (accompanist id) is required", 400);
      }
      if (!reason || typeof reason !== "string" || reason.trim().length < 10) {
        return err(
          ERROR_CODES.VALIDATION,
          "reason is required and must be at least 10 characters",
          400,
        );
      }

      const { data: existing } = await supabase
        .from("lodger_accompanists")
        .select("*")
        .eq("id", accompanistId)
        .eq("client_account_id", clientAccountId)
        .single();

      if (!existing) return err(ERROR_CODES.NOT_FOUND, "Accompanist not found", 404);

      // 1. Marcar acompañante como inactivo (soft delete)
      const { data: updated, error: updateError } = await supabase
        .from("lodger_accompanists")
        .update({ status: "inactive" })
        .eq("id", accompanistId)
        .eq("client_account_id", clientAccountId)
        .select("*")
        .single();

      if (updateError) {
        return err(ERROR_CODES.INTERNAL, "Error deactivating accompanist", 500, updateError.message);
      }

      // 2. Limpiar accompanist_id de la asignación activa que lo referencia
      const { error: clearError } = await supabase
        .from("lodger_room_assignments")
        .update({ accompanist_id: null })
        .eq("accompanist_id", accompanistId)
        .is("move_out_date", null);

      if (clearError) {
        // No revertimos el soft delete; registramos el problema pero seguimos
        console.error("Error clearing accompanist_id from active assignment:", clearError);
      }

      try {
        await supabase.from("audit_log").insert({
          client_account_id: clientAccountId,
          actor_user_id: user.id,
          actor_role: profile.role,
          entity_type: "lodger_accompanist",
          entity_id: accompanistId,
          action: "remove_accompanist",
          old_values: existing,
          new_values: { status: "inactive", reason: reason.trim() },
        });
      } catch { /* non-fatal */ }

      return ok(updated);
    }

    return err(ERROR_CODES.INVALID_ACTION, "Unhandled action", 400);

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("manage_lodger error:", message);
    return err(ERROR_CODES.INTERNAL, "Internal server error", 500, message);
  }
});
