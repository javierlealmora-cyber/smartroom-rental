/**
 * sal-confirm-claim-session — Shard Pool v4
 *
 * Confirma una lock_claim_session abierta.
 * Puede ser llamada desde la app (después de validación visual BLE)
 * o desde la web admin (para import por transferencia TTLock).
 *
 * Flujo:
 *  1. Verificar que la sesión existe y está abierta
 *  2. Verificar que no ha expirado (invariante 12)
 *  3. Re-check de ownership (provider_lock_id no activo en otro tenant)
 *  4. UPDATE lock_claim_sessions.status = 'confirmed'
 *  5. UPDATE locks: status → 'ready_for_activation', client_account_id definitivo
 *  6. Si hay gateway online en el mismo alojamiento → intentar activar (sal-activate-lock)
 *
 * POST body:
 *   { claim_session_id, confirmed_name?, room_id?, accommodation_id? }
 *
 * Respuesta:
 *   { lock_id, status: 'ready_for_activation' | 'active' }
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { resolveSalContext, assertSalSubscriptionActive } from "../_shared/sal-helpers.ts";

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (e: unknown) {
    const msg   = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? (e.stack ?? "") : "";
    console.error(`[sal-confirm-claim-session] UNCAUGHT ERROR: ${msg}\n${stack}`);
    return err("UNCAUGHT_EXCEPTION", msg, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  let body: {
    client_account_id:  string;
    claim_session_id:   string;
    confirmed_name?:    string;
    room_id?:           string;
    accommodation_id?:  string;
  };
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { client_account_id, claim_session_id } = body;
  if (!client_account_id || !claim_session_id) {
    return err(
      ERROR_CODES.VALIDATION,
      "Missing required fields: client_account_id, claim_session_id",
      400,
    );
  }

  const ctx = await resolveSalContext(req, client_account_id, ["admin", "superadmin"]);
  if (ctx instanceof Response) return ctx;
  const { supabase, actorUserId } = ctx;

  const subErr = await assertSalSubscriptionActive(supabase, client_account_id);
  if (subErr) return subErr;

  // ── 1. Leer la sesión de claim ───────────────────────────────────────────────
  const { data: session } = await supabase
    .from("lock_claim_sessions")
    .select("id, status, expires_at, lock_id, provider_lock_id, client_account_id")
    .eq("id", claim_session_id)
    .maybeSingle();

  if (!session) {
    return err("SESSION_NOT_FOUND", "Sesión de claim no encontrada.", 404);
  }

  // El caller solo puede confirmar sus propias sesiones
  if (session.client_account_id !== client_account_id) {
    return err(ERROR_CODES.FORBIDDEN, "Tenant mismatch en la sesión.", 403);
  }

  // Idempotencia: si ya confirmada, devolver estado actual
  if (session.status === "confirmed") {
    const { data: lock } = await supabase
      .from("locks")
      .select("id, status")
      .eq("id", session.lock_id)
      .maybeSingle();

    return ok({
      lock_id:    session.lock_id,
      status:     lock?.status ?? "ready_for_activation",
      idempotent: true,
    });
  }

  // ── 2. Verificar que la sesión no ha expirado (invariante 12) ───────────────
  if (session.status !== "open") {
    return err(
      "SESSION_NOT_OPEN",
      `La sesión está en estado '${session.status}' y no puede confirmarse.`,
      409,
    );
  }

  if (new Date(session.expires_at) < new Date()) {
    // Marcar como expirada y poner la lock en quarantine (invariante 12)
    await supabase
      .from("lock_claim_sessions")
      .update({ status: "expired" })
      .eq("id", claim_session_id);

    if (session.lock_id) {
      await supabase
        .from("locks")
        .update({
          status:           "quarantine",
          claim_session_id: null,
          quarantine_reason: "claim_session_expired",
        })
        .eq("id", session.lock_id);
    }

    return err("SESSION_EXPIRED", "La sesión de claim ha expirado. La cerradura ha sido puesta en cuarentena.", 410);
  }

  // ── 3. Re-check de ownership (invariante §15.14.1) ──────────────────────────
  if (session.provider_lock_id) {
    const { data: conflictLock } = await supabase
      .from("locks")
      .select("id, client_account_id")
      .eq("provider_lock_id", session.provider_lock_id)
      .in("status", ["ready_for_activation", "active", "offboarding"])
      .neq("id", session.lock_id ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle();

    if (conflictLock && conflictLock.client_account_id !== client_account_id) {
      return err(
        "LOCK_ALREADY_ACTIVE_IN_OTHER_TENANT",
        "Esta cerradura está activa en otra cuenta de cliente.",
        409,
      );
    }
  }

  // ── 4. Confirmar la sesión ───────────────────────────────────────────────────
  const now = new Date().toISOString();

  await supabase
    .from("lock_claim_sessions")
    .update({
      status:        "confirmed",
      confirmed_at:  now,
      confirmed_by:  actorUserId,
    })
    .eq("id", claim_session_id);

  // ── 5. Actualizar la lock a ready_for_activation ─────────────────────────────
  const lockUpdate: Record<string, unknown> = {
    status:           "ready_for_activation",
    client_account_id,
  };
  if (body.confirmed_name) lockUpdate.name = body.confirmed_name;

  await supabase
    .from("locks")
    .update(lockUpdate)
    .eq("id", session.lock_id);

  // ── 6. Verificar si hay gateway online para activación automática ────────────
  // Buscar el accommodation_id: puede venir del body o de raw_data de la lock
  let accommodationId = body.accommodation_id ?? null;

  if (!accommodationId && session.lock_id) {
    const { data: lockData } = await supabase
      .from("locks")
      .select("raw_data")
      .eq("id", session.lock_id)
      .maybeSingle();

    accommodationId = lockData?.raw_data?.hint_accommodation_id ?? null;
  }

  let finalStatus = "ready_for_activation";

  if (accommodationId) {
    const { data: gateway } = await supabase
      .from("gateways")
      .select("id")
      .eq("client_account_id", client_account_id)
      .eq("accommodation_id", accommodationId)
      .eq("status", "active")
      .eq("is_online", true)
      .maybeSingle();

    if (gateway) {
      // Activar la lock directamente
      const activateResult = await activateLock(supabase, session.lock_id!, gateway.id, actorUserId);
      if (activateResult.success) {
        finalStatus = "active";
      }
    }
  }

  // ── 7. Audit log (no fatal) ───────────────────────────────────────────────────
  await supabase.from("audit_log").insert({
    actor_user_id:    actorUserId,
    actor_role:       ctx.actorRole,
    client_account_id,
    action:           "sal_confirm_claim_session",
    entity_type:      "lock_claim_sessions",
    entity_id:        claim_session_id,
    detail:           { lock_id: session.lock_id, final_status: finalStatus },
  }).catch(() => {});

  console.log(
    `[sal-confirm-claim-session] ✓ client=${client_account_id} session=${claim_session_id} lock=${session.lock_id} status=${finalStatus}`,
  );

  return ok({
    lock_id: session.lock_id,
    status:  finalStatus,
  });
}

// ── Helper interno: activar la lock ──────────────────────────────────────────
async function activateLock(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  lockId: string,
  gatewayId: string,
  actorUserId: string | null,
): Promise<{ success: boolean }> {
  try {
    const { data: lockRow } = await supabase
      .from("locks")
      .select("client_account_id")
      .eq("id", lockId)
      .single();

    await supabase.from("gateway_lock_links").insert({
      gateway_id:                gatewayId,
      lock_id:                   lockId,
      client_account_id:         lockRow?.client_account_id ?? null,
      is_active:                 true,
      physical_validation_status: "not_validated",
      linked_by:                 actorUserId,
    });

    await supabase.from("locks").update({
      status:                    "active",
      installation_complete:     true,
      gateway_id:                gatewayId,
      gateway_validation_status: "not_validated",
    }).eq("id", lockId);

    return { success: true };
  } catch {
    return { success: false };
  }
}
