/**
 * sal-place-lock
 *
 * Asigna una cerradura a una ubicación lógica (entrada de alojamiento,
 * habitación, zona común) y opcionalmente concede acceso retroactivo a los
 * inquilinos activos cuando auto_assign_to_lodger=true.
 *
 * Decisión de diseño cerrada (Opción A):
 *   - placement_type='room': concede a inquilinos activos de esa habitación.
 *   - placement_type='accommodation_entry': concede a TODOS los inquilinos
 *     activos de TODAS las habitaciones del alojamiento.
 *   - Condición de "activo SAL": move_out_date IS NULL OR move_out_date > TODAY
 *   - Idempotente: verifica si ya existe grant activo antes de crear.
 *
 * POST body:
 * {
 *   client_account_id:       string  (UUID)
 *   lock_id:                 string  (UUID interno de la tabla locks)
 *   placement_type:          "room" | "accommodation_entry" | "common_area"
 *   accommodation_id:        string  (UUID — siempre requerido)
 *   room_id?:                string  (UUID — solo si placement_type='room')
 *   common_area_id?:         string  (UUID — solo si placement_type='common_area')
 *   lock_purpose:            "entry_door" | "room_door" | "common_area" | "safe" | "other"
 *   auto_assign_to_lodger:   boolean (default false)
 *   display_name?:           string
 *   sort_order?:             number
 * }
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { resolveSalContext, assertSalSubscriptionActive } from "../_shared/sal-helpers.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  try {
    return await handleRequest(req);
  } catch (e) {
    console.error("[sal-place-lock] Unhandled error:", e);
    return err(ERROR_CODES.INTERNAL, e instanceof Error ? e.message : "Unexpected server error", 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  let body: {
    client_account_id:     string;
    lock_id:               string;
    placement_type:        "room" | "accommodation_entry" | "common_area";
    accommodation_id:      string;
    room_id?:              string;
    common_area_id?:       string;
    lock_purpose:          string;
    auto_assign_to_lodger: boolean;
    display_name?:         string;
    sort_order?:           number;
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const {
    client_account_id,
    lock_id,
    placement_type,
    accommodation_id,
    room_id,
    common_area_id,
    lock_purpose,
    auto_assign_to_lodger = false,
    display_name,
    sort_order,
  } = body;

  // ── Validaciones básicas ──────────────────────────────────────────────────
  if (!client_account_id || !lock_id || !placement_type || !accommodation_id || !lock_purpose) {
    return err(ERROR_CODES.VALIDATION, "Missing required fields", 400);
  }
  if (placement_type === "room" && !room_id) {
    return err(ERROR_CODES.VALIDATION, "room_id is required when placement_type='room'", 400);
  }
  if (placement_type === "common_area" && !common_area_id) {
    return err(ERROR_CODES.VALIDATION, "common_area_id is required when placement_type='common_area'", 400);
  }

  const ctx = await resolveSalContext(req, client_account_id, ["admin", "superadmin"]);
  if (ctx instanceof Response) return ctx;
  const { supabase, actorUserId, actorRole } = ctx;

  const subErr = await assertSalSubscriptionActive(supabase, client_account_id);
  if (subErr) return subErr;

  // ── Validaciones cruzadas ─────────────────────────────────────────────────

  // Verificar que el lock pertenece al tenant
  const { data: lock } = await supabase
    .from("locks")
    .select("id, client_account_id, name")
    .eq("id", lock_id)
    .single();

  if (!lock || lock.client_account_id !== client_account_id) {
    return err(ERROR_CODES.NOT_FOUND, "Lock not found or does not belong to this account", 404);
  }

  // Verificar que el alojamiento pertenece al tenant
  const { data: accommodation } = await supabase
    .from("accommodations")
    .select("id, client_account_id")
    .eq("id", accommodation_id)
    .eq("client_account_id", client_account_id)
    .single();

  if (!accommodation) {
    return err(ERROR_CODES.NOT_FOUND, "Accommodation not found or does not belong to this account", 404);
  }

  // Verificar room pertenece al alojamiento
  if (placement_type === "room" && room_id) {
    const { data: room } = await supabase
      .from("rooms")
      .select("id, accommodation_id")
      .eq("id", room_id)
      .single();

    if (!room || room.accommodation_id !== accommodation_id) {
      return err(ERROR_CODES.VALIDATION, "Room does not belong to the specified accommodation", 422);
    }
  }

  // Verificar zona común pertenece al alojamiento
  if (placement_type === "common_area" && common_area_id) {
    const { data: area } = await supabase
      .from("common_areas")
      .select("id, accommodation_id")
      .eq("id", common_area_id)
      .single();

    if (!area || area.accommodation_id !== accommodation_id) {
      return err(ERROR_CODES.VALIDATION, "Common area does not belong to the specified accommodation", 422);
    }
  }

  // ── Desactivar placement previo para esta lock ────────────────────────────
  await supabase
    .from("lock_placements")
    .update({ is_active: false })
    .eq("lock_id", lock_id)
    .eq("is_active", true);

  // ── Crear nuevo placement ─────────────────────────────────────────────────
  const { data: placement, error: placeErr } = await supabase
    .from("lock_placements")
    .insert({
      client_account_id,
      lock_id,
      placement_type,
      accommodation_id,
      room_id:               room_id ?? null,
      common_area_id:        common_area_id ?? null,
      lock_purpose,
      auto_assign_to_lodger,
      display_name:          display_name ?? lock.name,
      sort_order:            sort_order ?? 0,
      is_active:             true,
    })
    .select("id")
    .single();

  if (placeErr) {
    return err(ERROR_CODES.INTERNAL, `Placement insert failed: ${placeErr.message}`, 500);
  }

  // ── Auto-grant retroactivo si auto_assign_to_lodger=true ─────────────────
  let grantsCreated = 0;

  if (auto_assign_to_lodger) {
    const today = new Date().toISOString().split("T")[0];

    // Buscar asignaciones activas con acceso SAL vigente
    let assignmentsQuery = supabase
      .from("lodger_room_assignments")
      .select("id, lodger_id, room_id, move_in_date")
      .or(`move_out_date.is.null,move_out_date.gt.${today}`);

    if (placement_type === "room" && room_id) {
      assignmentsQuery = assignmentsQuery.eq("room_id", room_id);
    } else if (placement_type === "accommodation_entry") {
      // Todas las habitaciones del alojamiento
      const { data: rooms } = await supabase
        .from("rooms")
        .select("id")
        .eq("accommodation_id", accommodation_id);

      const roomIds = (rooms ?? []).map((r) => r.id);
      if (roomIds.length === 0) {
        assignmentsQuery = assignmentsQuery.eq("room_id", "00000000-0000-0000-0000-000000000000"); // no match
      } else {
        assignmentsQuery = assignmentsQuery.in("room_id", roomIds);
      }
    } else {
      // common_area placement → no hay asignaciones de habitación para esto
      assignmentsQuery = null as never;
    }

    if (assignmentsQuery) {
      const { data: assignments } = await assignmentsQuery;

      for (const assignment of assignments ?? []) {
        // Verificar que no existe ya un grant activo para este lodger+lock
        const { data: existing } = await supabase
          .from("lock_access_grants")
          .select("id")
          .eq("lodger_id", assignment.lodger_id)
          .eq("lock_id", lock_id)
          .eq("status", "active")
          .maybeSingle();

        if (existing) continue; // idempotente

        const { error: grantErr } = await supabase
          .from("lock_access_grants")
          .insert({
            client_account_id,
            lock_id,
            lock_placement_id: placement.id,
            grant_type:        "lodger",
            lodger_id:         assignment.lodger_id,
            status:            "pending", // el EF sal-grant-access lo activará cuando emita el PIN
            source_type:       "room_assignment",
            source_id:         assignment.id,
            valid_from:        assignment.move_in_date ?? new Date().toISOString(),
          });

        if (!grantErr) grantsCreated++;
        // Los grants quedan en 'pending' — sal-grant-access los procesará
        // (o n8n WF-04 los reconcilia si el proceso falla)
      }
    }
  }

  // ── Audit log ────────────────────────────────────────────────────────────
  await supabase.from("audit_log").insert({
    actor_user_id:    actorUserId,
    actor_role:       actorRole,
    client_account_id,
    action:           "sal_place_lock",
    entity_type:      "lock_placements",
    entity_id:        placement.id,
    detail:           { lock_id, placement_type, accommodation_id, room_id, auto_assign_to_lodger, grants_created: grantsCreated },
  }).catch(() => {});

  return ok({
    placement_id:   placement.id,
    grants_created: grantsCreated,
    message:        grantsCreated > 0
      ? `Cerradura asignada y ${grantsCreated} acceso(s) concedido(s) retroactivamente`
      : "Cerradura asignada correctamente",
  });
}
