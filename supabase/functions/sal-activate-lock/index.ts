/**
 * sal-activate-lock — Shard Pool v4
 *
 * Transiciona una lock de 'ready_for_activation' a 'active'.
 * Requiere que haya un gateway activo y online asignado al alojamiento.
 * Crea el vínculo lock_gateway_links con physical_validation_status='not_validated'.
 *
 * Llamada por:
 *  - sal-confirm-claim-session (interno, cuando hay gateway disponible)
 *  - sal-confirm-gateway-claim (interno, cuando se activa un gateway)
 *  - n8n (cuando un gateway vuelve online y hay locks en ready_for_activation)
 *
 * POST body:
 *   { client_account_id, lock_id, gateway_id }
 *
 * Respuesta:
 *   { lock_id, status: 'active', installation_complete: true }
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { resolveSalContext, assertSalSubscriptionActive } from "../_shared/sal-helpers.ts";

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (e: unknown) {
    const msg   = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? (e.stack ?? "") : "";
    console.error(`[sal-activate-lock] UNCAUGHT ERROR: ${msg}\n${stack}`);
    return err("UNCAUGHT_EXCEPTION", msg, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  let body: {
    client_account_id: string;
    lock_id:           string;
    gateway_id:        string;
  };
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { client_account_id, lock_id, gateway_id } = body;
  if (!client_account_id || !lock_id || !gateway_id) {
    return err(
      ERROR_CODES.VALIDATION,
      "Missing required fields: client_account_id, lock_id, gateway_id",
      400,
    );
  }

  const ctx = await resolveSalContext(req, client_account_id, ["admin", "superadmin"]);
  if (ctx instanceof Response) return ctx;
  const { supabase, actorUserId } = ctx;

  const subErr = await assertSalSubscriptionActive(supabase, client_account_id);
  if (subErr) return subErr;

  // ── 1. Leer la lock ──────────────────────────────────────────────────────────
  const { data: lock } = await supabase
    .from("locks")
    .select("id, status, client_account_id, claim_session_id")
    .eq("id", lock_id)
    .maybeSingle();

  if (!lock) {
    return err(ERROR_CODES.NOT_FOUND, "Cerradura no encontrada.", 404);
  }

  if (lock.client_account_id !== client_account_id) {
    return err(ERROR_CODES.FORBIDDEN, "La cerradura no pertenece a este cliente.", 403);
  }

  // Idempotencia: si ya está activa, devolver sin error
  if (lock.status === "active") {
    return ok({ lock_id, status: "active", installation_complete: true, idempotent: true });
  }

  if (lock.status !== "ready_for_activation") {
    return err(
      "LOCK_NOT_READY",
      `La cerradura está en estado '${lock.status}'. Solo se puede activar desde 'ready_for_activation'.`,
      409,
    );
  }

  // ── 2. Verificar que el claim está confirmado ────────────────────────────────
  if (lock.claim_session_id) {
    const { data: session } = await supabase
      .from("lock_claim_sessions")
      .select("status")
      .eq("id", lock.claim_session_id)
      .maybeSingle();

    if (session && session.status !== "confirmed") {
      return err(
        "CLAIM_NOT_CONFIRMED",
        "La sesión de claim no ha sido confirmada aún.",
        422,
      );
    }
  }

  // ── 3. Verificar el gateway ──────────────────────────────────────────────────
  const { data: gateway } = await supabase
    .from("lock_gateways")
    .select("id, status, is_online, client_account_id")
    .eq("id", gateway_id)
    .maybeSingle();

  if (!gateway) {
    return err(ERROR_CODES.NOT_FOUND, "Gateway no encontrado.", 404);
  }

  if (gateway.client_account_id !== client_account_id) {
    return err(ERROR_CODES.FORBIDDEN, "El gateway no pertenece a este cliente.", 403);
  }

  if (gateway.status !== "active") {
    return err("GATEWAY_NOT_ACTIVE", "El gateway no está activo.", 422);
  }

  if (!gateway.is_online) {
    return err("GATEWAY_OFFLINE", "El gateway no está online en este momento.", 422);
  }

  // ── 4. Desactivar vínculo anterior si existe ─────────────────────────────────
  await supabase
    .from("lock_gateway_links")
    .update({ is_active: false })
    .eq("lock_id", lock_id)
    .eq("is_active", true);

  // ── 5. Crear vínculo lock_gateway_links ──────────────────────────────────────
  const { error: linkErr } = await supabase
    .from("lock_gateway_links")
    .insert({
      gateway_id,
      lock_id,
      client_account_id,
      is_active:                 true,
      physical_validation_status: "not_validated",
      linked_by:                 actorUserId,
    });

  if (linkErr) {
    return err(
      ERROR_CODES.INTERNAL,
      `No se pudo crear el vínculo gateway-lock: ${linkErr.message}`,
      500,
    );
  }

  // ── 6. Activar la lock ───────────────────────────────────────────────────────
  const { error: lockErr } = await supabase
    .from("locks")
    .update({
      status:                    "active",
      installation_complete:     true,
      gateway_id,
      gateway_validation_status: "not_validated",
    })
    .eq("id", lock_id);

  if (lockErr) {
    // Revertir el vínculo creado
    await supabase
      .from("lock_gateway_links")
      .delete()
      .eq("lock_id", lock_id)
      .eq("gateway_id", gateway_id)
      .eq("is_active", true);

    return err(
      ERROR_CODES.INTERNAL,
      `No se pudo activar la cerradura: ${lockErr.message}`,
      500,
    );
  }

  // ── 7. Actualizar contadores en lock_integrations ────────────────────────────
  await supabase.rpc("sal_increment_active_locks", {
    p_client_account_id: client_account_id,
  }).catch(() => {}); // No fatal — n8n reconciliará contadores

  // ── 8. Audit log (no fatal) ───────────────────────────────────────────────────
  await supabase.from("audit_log").insert({
    actor_user_id:    actorUserId,
    actor_role:       ctx.actorRole,
    client_account_id,
    action:           "sal_activate_lock",
    entity_type:      "locks",
    entity_id:        lock_id,
    detail:           { gateway_id },
  }).catch(() => {});

  console.log(
    `[sal-activate-lock] ✓ client=${client_account_id} lock=${lock_id} gateway=${gateway_id}`,
  );

  return ok({
    lock_id,
    status:               "active",
    installation_complete: true,
  });
}
