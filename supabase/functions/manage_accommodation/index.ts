// Edge Function: manage_accommodation
// Gestiona operaciones de escritura sobre accommodations y rooms
// Acciones: create | update | set_status | add_room | update_room | set_room_status
// Valida: JWT + rol admin/superadmin + tenant + límites de plan

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  ok, err, optionsResponse, ERROR_CODES,
} from "../_shared/response.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── 1. Verificar JWT ──────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) return err(ERROR_CODES.UNAUTHORIZED, "Missing authorization header", 401);

    const token = authHeader.replace("Bearer ", "");
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

    const validActions = ["create", "update", "set_status", "add_room", "update_room", "set_room_status"];
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
      .select("max_accommodations, max_rooms")
      .eq("code", account.plan_code)
      .eq("status", "active")
      .single();

    // ── 5. Acciones sobre Accommodations ─────────────────────────────────────

    if (action === "create") {
      const { owner_entity_id, name } = payload as { owner_entity_id: string; name: string };

      if (!owner_entity_id) return err(ERROR_CODES.VALIDATION, "owner_entity_id is required", 400);
      if (!name) return err(ERROR_CODES.VALIDATION, "name is required", 400);

      // Verificar que la entidad propietaria pertenece al tenant
      const { data: ownerEntity } = await supabase
        .from("entities")
        .select("id, status")
        .eq("id", owner_entity_id)
        .eq("client_account_id", clientAccountId)
        .eq("type", "owner")
        .single();

      if (!ownerEntity) return err(ERROR_CODES.NOT_FOUND, "Owner entity not found or not active", 404);
      if (ownerEntity.status !== "active") {
        return err(ERROR_CODES.VALIDATION, "Owner entity is not active", 400);
      }

      // Validar límite de plan
      if (plan && plan.max_accommodations !== -1) {
        const { count } = await supabase
          .from("accommodations")
          .select("id", { count: "exact", head: true })
          .eq("client_account_id", clientAccountId)
          .eq("status", "active");

        if ((count ?? 0) >= plan.max_accommodations) {
          return err(
            ERROR_CODES.PLAN_LIMIT_EXCEEDED,
            `Tu plan permite un máximo de ${plan.max_accommodations} alojamientos activos`,
            403,
            { current: count, limit: plan.max_accommodations }
          );
        }
      }

      const { rooms: roomsPayload, ...accPayload } = payload as {
        rooms?: Record<string, unknown>[];
        [key: string]: unknown;
      };

      const { data: newAcc, error: insertError } = await supabase
        .from("accommodations")
        .insert({ ...accPayload, client_account_id: clientAccountId, owner_entity_id })
        .select("*")
        .single();

      if (insertError) {
        return err(ERROR_CODES.INTERNAL, "Error creating accommodation", 500, insertError.message);
      }

      // Crear habitaciones si se pasan en el payload
      let createdRooms: unknown[] = [];
      if (roomsPayload && roomsPayload.length > 0) {
        // Validar límite de habitaciones
        if (plan && plan.max_rooms !== -1 && roomsPayload.length > plan.max_rooms) {
          return err(
            ERROR_CODES.PLAN_LIMIT_EXCEEDED,
            `Tu plan permite un máximo de ${plan.max_rooms} habitaciones`,
            403,
            { requested: roomsPayload.length, limit: plan.max_rooms }
          );
        }

        const roomRows = roomsPayload.map(({ id: _id, ...r }) => ({
          ...r,
          accommodation_id: newAcc.id,
          client_account_id: clientAccountId,
        }));

        const { data: rooms, error: roomsError } = await supabase
          .from("rooms")
          .insert(roomRows)
          .select("*");

        if (roomsError) {
          console.error("Error creating rooms:", roomsError.message);
        } else {
          createdRooms = rooms ?? [];
        }
      }

      await supabase.from("audit_log").insert({
        client_account_id: clientAccountId,
        actor_user_id: user.id,
        actor_role: profile.role,
        entity_type: "accommodation",
        entity_id: newAcc.id,
        action: "create",
        new_values: { ...newAcc, rooms_count: createdRooms.length },
      });

      return ok({ ...newAcc, rooms: createdRooms }, 201);
    }

    if (action === "update") {
      const { id, ...patch } = payload as { id: string; [key: string]: unknown };
      if (!id) return err(ERROR_CODES.VALIDATION, "id is required for update", 400);

      const { data: existing } = await supabase
        .from("accommodations")
        .select("*")
        .eq("id", id)
        .eq("client_account_id", clientAccountId)
        .single();

      if (!existing) return err(ERROR_CODES.NOT_FOUND, "Accommodation not found", 404);

      // Proteger campos inmutables
      delete patch.client_account_id;
      delete patch.owner_entity_id; // cambio de entidad propietaria no permitido por update simple

      const { data: updated, error: updateError } = await supabase
        .from("accommodations")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

      if (updateError) return err(ERROR_CODES.INTERNAL, "Error updating accommodation", 500, updateError.message);

      await supabase.from("audit_log").insert({
        client_account_id: clientAccountId,
        actor_user_id: user.id,
        actor_role: profile.role,
        entity_type: "accommodation",
        entity_id: id,
        action: "update",
        old_values: existing,
        new_values: updated,
      });

      return ok(updated);
    }

    if (action === "set_status") {
      const { id, status } = payload as { id: string; status: string };
      if (!id) return err(ERROR_CODES.VALIDATION, "id is required", 400);

      const validStatuses = ["active", "inactive", "suspended"];
      if (!status || !validStatuses.includes(status)) {
        return err(ERROR_CODES.VALIDATION, `status must be one of: ${validStatuses.join(", ")}`, 400);
      }

      const { data: existing } = await supabase
        .from("accommodations")
        .select("id, status")
        .eq("id", id)
        .eq("client_account_id", clientAccountId)
        .single();

      if (!existing) return err(ERROR_CODES.NOT_FOUND, "Accommodation not found", 404);

      const { data: updated, error: statusError } = await supabase
        .from("accommodations")
        .update({ status })
        .eq("id", id)
        .select("*")
        .single();

      if (statusError) return err(ERROR_CODES.INTERNAL, "Error updating status", 500, statusError.message);

      await supabase.from("audit_log").insert({
        client_account_id: clientAccountId,
        actor_user_id: user.id,
        actor_role: profile.role,
        entity_type: "accommodation",
        entity_id: id,
        action: "status_change",
        old_values: { status: existing.status },
        new_values: { status },
      });

      return ok(updated);
    }

    // ── 6. Acciones sobre Rooms ───────────────────────────────────────────────

    if (action === "add_room") {
      const { accommodation_id } = payload as { accommodation_id: string };
      if (!accommodation_id) return err(ERROR_CODES.VALIDATION, "accommodation_id is required", 400);

      // Verificar que el alojamiento pertenece al tenant
      const { data: acc } = await supabase
        .from("accommodations")
        .select("id, status")
        .eq("id", accommodation_id)
        .eq("client_account_id", clientAccountId)
        .single();

      if (!acc) return err(ERROR_CODES.NOT_FOUND, "Accommodation not found", 404);
      if (acc.status !== "active") return err(ERROR_CODES.VALIDATION, "Accommodation is not active", 400);

      // Validar límite de habitaciones del plan
      if (plan && plan.max_rooms !== -1) {
        const { count } = await supabase
          .from("rooms")
          .select("id", { count: "exact", head: true })
          .eq("client_account_id", clientAccountId);

        if ((count ?? 0) >= plan.max_rooms) {
          return err(
            ERROR_CODES.PLAN_LIMIT_EXCEEDED,
            `Tu plan permite un máximo de ${plan.max_rooms} habitaciones en total`,
            403,
            { current: count, limit: plan.max_rooms }
          );
        }
      }

      const { id: _id, ...roomPayload } = payload as { id?: string; [key: string]: unknown };

      const { data: newRoom, error: roomError } = await supabase
        .from("rooms")
        .insert({ ...roomPayload, accommodation_id, client_account_id: clientAccountId })
        .select("*")
        .single();

      if (roomError) return err(ERROR_CODES.INTERNAL, "Error creating room", 500, roomError.message);

      await supabase.from("audit_log").insert({
        client_account_id: clientAccountId,
        actor_user_id: user.id,
        actor_role: profile.role,
        entity_type: "room",
        entity_id: newRoom.id,
        action: "create",
        new_values: newRoom,
      });

      return ok(newRoom, 201);
    }

    if (action === "update_room") {
      const { id, ...patch } = payload as { id: string; [key: string]: unknown };
      if (!id) return err(ERROR_CODES.VALIDATION, "id is required", 400);

      const { data: existing } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", id)
        .eq("client_account_id", clientAccountId)
        .single();

      if (!existing) return err(ERROR_CODES.NOT_FOUND, "Room not found", 404);

      delete patch.client_account_id;
      delete patch.accommodation_id;

      const { data: updated, error: updateError } = await supabase
        .from("rooms")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

      if (updateError) return err(ERROR_CODES.INTERNAL, "Error updating room", 500, updateError.message);

      await supabase.from("audit_log").insert({
        client_account_id: clientAccountId,
        actor_user_id: user.id,
        actor_role: profile.role,
        entity_type: "room",
        entity_id: id,
        action: "update",
        old_values: existing,
        new_values: updated,
      });

      return ok(updated);
    }

    if (action === "set_room_status") {
      const { id, status } = payload as { id: string; status: string };
      if (!id) return err(ERROR_CODES.VALIDATION, "id is required", 400);

      const validStatuses = ["free", "occupied", "pending_checkout", "maintenance", "inactive"];
      if (!status || !validStatuses.includes(status)) {
        return err(ERROR_CODES.VALIDATION, `status must be one of: ${validStatuses.join(", ")}`, 400);
      }

      const { data: existing } = await supabase
        .from("rooms")
        .select("id, status")
        .eq("id", id)
        .eq("client_account_id", clientAccountId)
        .single();

      if (!existing) return err(ERROR_CODES.NOT_FOUND, "Room not found", 404);

      const { data: updated, error: statusError } = await supabase
        .from("rooms")
        .update({ status })
        .eq("id", id)
        .select("*")
        .single();

      if (statusError) return err(ERROR_CODES.INTERNAL, "Error updating room status", 500, statusError.message);

      await supabase.from("audit_log").insert({
        client_account_id: clientAccountId,
        actor_user_id: user.id,
        actor_role: profile.role,
        entity_type: "room",
        entity_id: id,
        action: "status_change",
        old_values: { status: existing.status },
        new_values: { status },
      });

      return ok(updated);
    }

    return err(ERROR_CODES.INVALID_ACTION, "Unhandled action", 400);

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("manage_accommodation error:", message);
    return err(ERROR_CODES.INTERNAL, "Internal server error", 500, message);
  }
});
