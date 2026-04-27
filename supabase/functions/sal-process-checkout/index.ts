/**
 * sal-process-checkout
 *
 * Revoca todos los grants SAL activos de un inquilino cuando se registra
 * su fecha de salida (move_out_date se establece en lodger_room_assignments).
 *
 * Llamado desde el DB Webhook post-UPDATE en lodger_room_assignments
 * cuando OLD.move_out_date IS DISTINCT FROM NEW.move_out_date AND NEW.move_out_date IS NOT NULL.
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
    .select("id, lodger_id, move_out_date, rooms(client_account_id)")
    .eq("id", lodger_room_assignment_id)
    .single();

  if (!assignment) {
    return ok({ skipped: true, reason: "Assignment not found" });
  }

  if (!assignment.move_out_date) {
    return ok({ skipped: true, reason: "No move_out_date set" });
  }

  const client_account_id = (assignment.rooms as any)?.client_account_id;
  if (!client_account_id) {
    return ok({ skipped: true, reason: "Could not resolve client_account_id" });
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

  // ── Buscar grants activos del inquilino ───────────────────────────────────
  const { data: grants } = await supabase
    .from("lock_access_grants")
    .select("id")
    .eq("lodger_id", assignment.lodger_id)
    .eq("client_account_id", client_account_id)
    .eq("status", "active");

  if (!grants?.length) {
    return ok({ grants_revoked: 0, skipped: false, reason: "No active grants to revoke" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  let grantsRevoked = 0;

  for (const grant of grants) {
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/sal-revoke-access`, {
        method:  "POST",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          client_account_id,
          grant_id:      grant.id,
          revoke_reason: "checkout",
        }),
      });
      if (resp.ok) grantsRevoked++;
    } catch {
      // n8n reconciliará si la revocación falla
    }
  }

  return ok({
    lodger_room_assignment_id,
    lodger_id:      assignment.lodger_id,
    grants_revoked: grantsRevoked,
    message:        `${grantsRevoked} acceso(s) revocado(s) por checkout.`,
  });
});
