/**
 * sal-register-paired-lock — Shard Pool v4
 *
 * Registra una lock recién emparejada por BLE desde la app móvil.
 *
 * Flujo:
 *  1. Valida que el provider_lock_id no esté activo en otro tenant (invariante §15.14.1)
 *  2. Si ya existe sesión abierta para este provider_lock_id + cliente → devuelve la existente (idempotente)
 *  3. Guarda lock_key_data cifrado en Vault
 *  4. INSERT en locks con status='claim_pending'
 *  5. INSERT en lock_claim_sessions con status='open', expires_at=+24h
 *  6. UPDATE locks.claim_session_id
 *
 * POST body:
 *   { client_account_id, provider_lock_id, lock_name, lock_key_data,
 *     mac_address?, accommodation_id?, room_id? }
 *
 * Respuesta:
 *   { lock_id, claim_session_id, status: "claim_pending" }
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { resolveSalContext, assertSalSubscriptionActive } from "../_shared/sal-helpers.ts";

const CLAIM_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas — invariante 12

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (e: unknown) {
    const msg   = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? (e.stack ?? "") : "";
    console.error(`[sal-register-paired-lock] UNCAUGHT ERROR: ${msg}\n${stack}`);
    return err("UNCAUGHT_EXCEPTION", msg, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  let body: {
    client_account_id:  string;
    provider_lock_id:   string;
    lock_name:          string;
    lock_key_data:      string;
    mac_address?:       string;
    accommodation_id?:  string;
    room_id?:           string;
  };
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { client_account_id, provider_lock_id, lock_name, lock_key_data } = body;
  if (!client_account_id || !provider_lock_id || !lock_name || !lock_key_data) {
    return err(
      ERROR_CODES.VALIDATION,
      "Missing required fields: client_account_id, provider_lock_id, lock_name, lock_key_data",
      400,
    );
  }

  const ctx = await resolveSalContext(req, client_account_id, ["admin", "superadmin"]);
  if (ctx instanceof Response) return ctx;
  const { supabase, actorUserId } = ctx;

  const subErr = await assertSalSubscriptionActive(supabase, client_account_id);
  if (subErr) return subErr;

  // ── 1. Invariante §15.14.1 — un provider_lock_id, un tenant activo ───────────
  const { data: existingLock } = await supabase
    .from("locks")
    .select("id, client_account_id, status")
    .eq("provider_lock_id", provider_lock_id)
    .in("status", ["claim_pending", "ready_for_activation", "active", "offboarding"])
    .maybeSingle();

  if (existingLock) {
    if (existingLock.client_account_id !== client_account_id) {
      // Lock pertenece a otro tenant — violación del invariante de ownership
      return err(
        "LOCK_ALREADY_CLAIMED",
        "Esta cerradura ya está registrada para otro cliente.",
        409,
      );
    }

    // ── 2. Idempotencia — devolver sesión abierta existente ──────────────────
    const { data: openSession } = await supabase
      .from("lock_claim_sessions")
      .select("id, status, expires_at")
      .eq("lock_id", existingLock.id)
      .eq("status", "open")
      .maybeSingle();

    if (openSession) {
      return ok({
        lock_id:          existingLock.id,
        claim_session_id: openSession.id,
        status:           "claim_pending",
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

  // ── 4. Obtener lock_integration_id ───────────────────────────────────────────
  const { data: integration } = await supabase
    .from("lock_integrations")
    .select("id")
    .eq("client_account_id", client_account_id)
    .eq("provider", "ttlock")
    .eq("status", "connected")
    .maybeSingle();

  if (!integration) {
    return err(
      "INTEGRATION_NOT_FOUND",
      "La integración SAL no está conectada para este cliente.",
      422,
    );
  }

  // ── 5. Guardar lock_key_data en Vault (el lockKey BLE nunca en claro en BD) ──
  let lockKeyVaultRef: string | null = null;
  try {
    const { data: vaultId, error: vaultErr } = await supabase.rpc(
      "sal_vault_create_secret",
      {
        p_secret:      JSON.stringify({ lock_key: lock_key_data }),
        p_name:        `sal_lockkey_${provider_lock_id}_${Date.now()}`,
        p_description: "SAL BLE lock key — cifrado en Vault",
      },
    );
    if (vaultErr) throw new Error(vaultErr.message);
    lockKeyVaultRef = vaultId as string;
  } catch (vaultErr: unknown) {
    const msg = vaultErr instanceof Error ? vaultErr.message : String(vaultErr);
    console.error(`[sal-register-paired-lock] Vault save failed: ${msg}`);
    // Continuamos sin lockKeyVaultRef — la lock queda registrada pero sin key cifrada.
    // El admin puede re-intentar el pairing para cifrar la key.
    lockKeyVaultRef = null;
  }

  // ── 6. INSERT lock con status='claim_pending' ─────────────────────────────────
  const now = new Date().toISOString();
  const rawData: Record<string, unknown> = {};
  if (body.accommodation_id) rawData.hint_accommodation_id = body.accommodation_id;
  if (body.room_id)          rawData.hint_room_id          = body.room_id;
  if (body.mac_address)      rawData.mac_address           = body.mac_address;

  const { data: lock, error: lockErr } = await supabase
    .from("locks")
    .insert({
      client_account_id,
      lock_integration_id:  integration.id,
      pool_id:              assignment.pool_id,
      provider:             "ttlock",
      provider_lock_id,
      name:                 lock_name,
      status:               "claim_pending",
      pairing_source:       "app_paired",
      paired_at:            now,
      paired_by:            actorUserId,
      lock_key_vault_ref:   lockKeyVaultRef,
      raw_data:             Object.keys(rawData).length > 0 ? rawData : null,
    })
    .select("id")
    .single();

  if (lockErr || !lock) {
    return err(
      ERROR_CODES.INTERNAL,
      `No se pudo registrar la cerradura: ${lockErr?.message ?? "unknown"}`,
      500,
    );
  }

  // ── 7. INSERT lock_claim_session ──────────────────────────────────────────────
  const expiresAt = new Date(Date.now() + CLAIM_SESSION_TTL_MS).toISOString();

  const { data: session, error: sessionErr } = await supabase
    .from("lock_claim_sessions")
    .insert({
      client_account_id,
      pool_id:         assignment.pool_id,
      lock_id:         lock.id,
      provider_lock_id,
      lock_mac:        body.mac_address ?? null,
      claim_type:      "app_paired",
      status:          "open",
      initiated_by:    actorUserId,
      expires_at:      expiresAt,
    })
    .select("id")
    .single();

  if (sessionErr || !session) {
    // Rollback parcial — eliminar la lock que acabamos de crear
    await supabase.from("locks").delete().eq("id", lock.id);
    return err(
      ERROR_CODES.INTERNAL,
      `No se pudo crear la sesión de claim: ${sessionErr?.message ?? "unknown"}`,
      500,
    );
  }

  // ── 8. UPDATE locks.claim_session_id (rompe la circularidad nullable) ────────
  await supabase
    .from("locks")
    .update({ claim_session_id: session.id })
    .eq("id", lock.id);

  // ── 9. Audit log (no fatal) ───────────────────────────────────────────────────
  await supabase.from("audit_log").insert({
    actor_user_id:     actorUserId,
    actor_role:        ctx.actorRole,
    client_account_id,
    action:            "sal_register_paired_lock",
    entity_type:       "locks",
    entity_id:         lock.id,
    detail:            { provider_lock_id, pairing_source: "app_paired" },
  }).catch(() => {});

  console.log(
    `[sal-register-paired-lock] ✓ client=${client_account_id} lock=${lock.id} provider_lock_id=${provider_lock_id}`,
  );

  return ok({
    lock_id:          lock.id,
    claim_session_id: session.id,
    status:           "claim_pending",
  });
}
