/**
 * sal-process-room-assignment
 *
 * Concede acceso SAL automáticamente cuando se asigna una habitación a un inquilino.
 * Llamado desde el DB Webhook post-INSERT en lodger_room_assignments.
 *
 * Lógica:
 *   1. Leer la asignación: lodger_id, room_id, accommodation_id, move_in_date.
 *   2. Verificar suscripción SAL activa. Si no → return 200 silencioso.
 *   3. Buscar lock_placements con auto_assign_to_lodger=true para:
 *      - placement_type='room' WHERE room_id coincide
 *      - placement_type='accommodation_entry' WHERE accommodation_id coincide
 *   4. Para cada placement: verificar idempotencia → crear grant.
 *
 * POST body:
 * {
 *   lodger_room_assignment_id: string (UUID)
 * }
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/sal-helpers.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  let body: { lodger_room_assignment_id: string };
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { lodger_room_assignment_id } = body;
  if (!lodger_room_assignment_id) {
    return err(ERROR_CODES.VALIDATION, "lodger_room_assignment_id is required", 400);
  }

  const supabase = createServiceClient();

  // ── Leer la asignación ────────────────────────────────────────────────────
  const { data: assignment } = await supabase
    .from("lodger_room_assignments")
    .select("id, lodger_id, room_id, move_in_date, rooms(accommodation_id, client_account_id)")
    .eq("id", lodger_room_assignment_id)
    .single();

  if (!assignment) {
    return ok({ skipped: true, reason: "Assignment not found" });
  }

  const client_account_id = (assignment.rooms as any)?.client_account_id;
  const accommodation_id  = (assignment.rooms as any)?.accommodation_id;

  if (!client_account_id) {
    return ok({ skipped: true, reason: "Could not resolve client_account_id from room" });
  }

  // ── Verificar suscripción SAL activa ──────────────────────────────────────
  const { data: sub } = await supabase
    .from("saas_service_subscriptions")
    .select("id")
    .eq("client_account_id", client_account_id)
    .eq("status", "active")
    .maybeSingle();

  if (!sub) {
    return ok({ skipped: true, reason: "SAL subscription not active" });
  }

  // ── Buscar placements con auto_assign_to_lodger=true ─────────────────────
  const { data: placements } = await supabase
    .from("lock_placements")
    .select("id, lock_id, placement_type")
    .eq("client_account_id", client_account_id)
    .eq("auto_assign_to_lodger", true)
    .eq("is_active", true)
    .or(`and(placement_type.eq.room,room_id.eq.${assignment.room_id}),and(placement_type.eq.accommodation_entry,accommodation_id.eq.${accommodation_id})`);

  if (!placements?.length) {
    return ok({ grants_created: 0, skipped: true, reason: "No auto-assign placements found" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const validFrom   = assignment.move_in_date ?? new Date().toISOString();

  let grantsCreated = 0;

  for (const placement of placements) {
    // Idempotencia: verificar grant activo ya existente
    const { data: existing } = await supabase
      .from("lock_access_grants")
      .select("id")
      .eq("lodger_id", assignment.lodger_id)
      .eq("lock_id", placement.lock_id)
      .eq("status", "active")
      .maybeSingle();

    if (existing) continue;

    try {
      await fetch(`${supabaseUrl}/functions/v1/sal-grant-access`, {
        method:  "POST",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          client_account_id,
          grant_type:    "lodger",
          lodger_id:     assignment.lodger_id,
          lock_id:       placement.lock_id,
          lock_placement_id: placement.id,
          valid_from:    validFrom,
          source_type:   "room_assignment",
          source_id:     assignment.id,
          credential_type: "pin",
        }),
      });
      grantsCreated++;
    } catch {
      // n8n WF-05 detectará el gap en la próxima reconciliación
    }
  }

  return ok({
    lodger_room_assignment_id,
    grants_created: grantsCreated,
    placements_checked: placements.length,
  });
});
