/**
 * sal-open-claim-session — Shard Pool v4
 *
 * Abre una sesión de claim para una lock o gateway.
 * Puede ser llamada desde:
 *   - La app móvil (internamente, vía sal-register-paired-lock)
 *   - La web admin (para import de locks por transferencia TTLock)
 *
 * Idempotente: si ya existe una sesión abierta para el mismo
 * provider_id + client_account_id, devuelve la existente sin crear otra.
 *
 * POST body:
 *   { client_account_id, session_type: 'lock'|'gateway', provider_id,
 *     claim_type: 'app_paired'|'transfer_import', validation_metadata? }
 *
 * Respuesta:
 *   { session_id, expires_at, status: "open" }
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { resolveSalContext, assertSalSubscriptionActive } from "../_shared/sal-helpers.ts";

const CLAIM_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // invariante 12

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (e: unknown) {
    const msg   = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? (e.stack ?? "") : "";
    console.error(`[sal-open-claim-session] UNCAUGHT ERROR: ${msg}\n${stack}`);
    return err("UNCAUGHT_EXCEPTION", msg, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  let body: {
    client_account_id:    string;
    session_type:         "lock" | "gateway";
    provider_id:          string;
    claim_type:           "app_paired" | "transfer_import";
    validation_metadata?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { client_account_id, session_type, provider_id, claim_type } = body;
  if (!client_account_id || !session_type || !provider_id || !claim_type) {
    return err(
      ERROR_CODES.VALIDATION,
      "Missing required fields: client_account_id, session_type, provider_id, claim_type",
      400,
    );
  }
  if (!["lock", "gateway"].includes(session_type)) {
    return err(ERROR_CODES.VALIDATION, "session_type must be 'lock' or 'gateway'", 400);
  }
  if (!["app_paired", "transfer_import"].includes(claim_type)) {
    return err(ERROR_CODES.VALIDATION, "claim_type must be 'app_paired' or 'transfer_import'", 400);
  }

  const ctx = await resolveSalContext(req, client_account_id, ["admin", "superadmin"]);
  if (ctx instanceof Response) return ctx;
  const { supabase, actorUserId } = ctx;

  const subErr = await assertSalSubscriptionActive(supabase, client_account_id);
  if (subErr) return subErr;

  const table = session_type === "lock" ? "lock_claim_sessions" : "lock_gateway_claim_sessions";
  const providerField = session_type === "lock" ? "provider_lock_id" : "provider_gateway_id";

  // ── 1. Invariante §15.14.1 — provider_id no puede estar activo en otro tenant ──
  if (session_type === "lock") {
    const { data: existingLock } = await supabase
      .from("locks")
      .select("id, client_account_id")
      .eq("provider_lock_id", provider_id)
      .in("status", ["claim_pending", "ready_for_activation", "active", "offboarding"])
      .maybeSingle();

    if (existingLock && existingLock.client_account_id !== client_account_id) {
      return err(
        "ALREADY_CLAIMED_BY_OTHER",
        "Este provider_lock_id ya está activo en otra cuenta de cliente.",
        409,
      );
    }
  }

  // ── 2. Idempotencia — devolver sesión abierta existente ─────────────────────
  const { data: existingSession } = await supabase
    .from(table)
    .select("id, status, expires_at")
    .eq("client_account_id", client_account_id)
    .eq(providerField, provider_id)
    .eq("status", "open")
    .maybeSingle();

  if (existingSession) {
    // Si la sesión existente está expirada, la marcamos como expirada y continuamos
    if (new Date(existingSession.expires_at) < new Date()) {
      await supabase
        .from(table)
        .update({ status: "expired" })
        .eq("id", existingSession.id);
      // Continuar para crear nueva sesión
    } else {
      return ok({
        session_id:  existingSession.id,
        expires_at:  existingSession.expires_at,
        status:      "open",
        idempotent:  true,
      });
    }
  }

  // ── 3. Leer shard asignado ────────────────────────────────────────────────────
  const { data: assignment } = await supabase
    .from("lock_provider_pool_assignments")
    .select("pool_id")
    .eq("client_account_id", client_account_id)
    .eq("provider", "ttlock")
    .eq("status", "active")
    .maybeSingle();

  if (!assignment) {
    return err("SHARD_NOT_ASSIGNED", "No hay shard asignado a este cliente.", 503);
  }

  // ── 4. Crear sesión de claim ──────────────────────────────────────────────────
  const expiresAt = new Date(Date.now() + CLAIM_SESSION_TTL_MS).toISOString();

  const insertPayload: Record<string, unknown> = {
    client_account_id,
    pool_id:        assignment.pool_id,
    claim_type,
    status:         "open",
    initiated_by:   actorUserId,
    expires_at:     expiresAt,
    [providerField]: provider_id,
  };

  if (body.validation_metadata) {
    insertPayload.validation_metadata = body.validation_metadata;
  }

  const { data: session, error: sessionErr } = await supabase
    .from(table)
    .insert(insertPayload)
    .select("id, expires_at")
    .single();

  if (sessionErr || !session) {
    return err(
      ERROR_CODES.INTERNAL,
      `No se pudo crear la sesión de claim: ${sessionErr?.message ?? "unknown"}`,
      500,
    );
  }

  console.log(
    `[sal-open-claim-session] ✓ type=${session_type} client=${client_account_id} provider_id=${provider_id} session=${session.id}`,
  );

  return ok({
    session_id: session.id,
    expires_at: session.expires_at,
    status:     "open",
  });
}
