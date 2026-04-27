/**
 * sal-connect-integration — Shard Pool v4
 *
 * Conecta la integración SAL del cliente al shard TTLock asignado por el superadmin.
 * NO crea cuentas TTLock (eso era la arquitectura fbfge_* descartada).
 * NO pide credenciales TTLock al admin del cliente.
 *
 * El shard ya fue asignado por el superadmin en provider_account_assignments.
 * Esta EF solo activa la integración y vincula lock_integrations al shard.
 *
 * POST body: { client_account_id: string }
 *
 * Respuesta:
 *   connected:    { integration_id, shard_code, status: "connected", ttlock_email, installation_status }
 *   pending_shard: { status: "pending_shard" }  — el superadmin aún no asignó shard
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { resolveSalContext, assertSalSubscriptionActive } from "../_shared/sal-helpers.ts";

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (e: unknown) {
    const msg   = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? (e.stack ?? "") : "";
    console.error(`[sal-connect-integration] UNCAUGHT ERROR: ${msg}\n${stack}`);
    return err("UNCAUGHT_EXCEPTION", msg, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  let body: { client_account_id: string };
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { client_account_id } = body;
  if (!client_account_id) {
    return err(ERROR_CODES.VALIDATION, "Missing required field: client_account_id", 400);
  }

  const ctx = await resolveSalContext(req, client_account_id, ["admin", "superadmin"]);
  if (ctx instanceof Response) return ctx;
  const { supabase } = ctx;

  const subErr = await assertSalSubscriptionActive(supabase, client_account_id);
  if (subErr) return subErr;

  // ── 1. Leer shard asignado al cliente ────────────────────────────────────────
  const { data: assignment } = await supabase
    .from("provider_account_assignments")
    .select("id, pool_id, status")
    .eq("client_account_id", client_account_id)
    .eq("provider", "ttlock")
    .eq("status", "active")
    .maybeSingle();

  if (!assignment) {
    // El superadmin aún no ha asignado shard — no es un error, es un estado válido
    // El frontend mostrará: "Pendiente de configuración — contactar soporte"
    return ok({ status: "pending_shard" });
  }

  // ── 2. Verificar que el shard está operativo ──────────────────────────────────
  const { data: pool } = await supabase
    .from("provider_account_pools")
    .select("id, shard_code, status, is_blocked, ttlock_email, vault_key_ref")
    .eq("id", assignment.pool_id)
    .single();

  if (!pool) {
    return err("SHARD_NOT_FOUND", "El shard asignado no existe. Contacta con soporte.", 503);
  }

  if (pool.is_blocked) {
    return err("SHARD_BLOCKED", "El shard asignado está temporalmente bloqueado. Contacta con soporte.", 503);
  }

  if (pool.status === "compromised" || pool.status === "retired") {
    return err("SHARD_UNAVAILABLE", `El shard está en estado ${pool.status}. Contacta con soporte.`, 503);
  }

  // ── 3. Upsert lock_integrations apuntando al shard ────────────────────────────
  const { data: integration, error: upsertErr } = await supabase
    .from("lock_integrations")
    .upsert(
      {
        client_account_id,
        provider:           "ttlock",
        provider_client_id: Deno.env.get("TTLOCK_CLIENT_ID") ?? "",
        pool_id:            pool.id,
        status:             "connected",
        updated_at:         new Date().toISOString(),
      },
      { onConflict: "client_account_id,provider" },
    )
    .select("id, installation_status")
    .single();

  if (upsertErr) {
    return err(ERROR_CODES.INTERNAL, `Integration upsert failed: ${upsertErr.message}`, 500);
  }

  // ── 4. Audit log (no fatal) ───────────────────────────────────────────────────
  await supabase.from("audit_log").insert({
    actor_user_id:    ctx.actorUserId,
    actor_role:       ctx.actorRole,
    client_account_id,
    action:           "sal_connect_integration",
    entity_type:      "lock_integrations",
    entity_id:        integration?.id ?? null,
    detail:           { provider: "ttlock", shard_code: pool.shard_code },
  }).catch(() => {});

  console.log(`[sal-connect-integration] ✓ client=${client_account_id} shard=${pool.shard_code}`);

  return ok({
    integration_id:      integration?.id,
    shard_code:          pool.shard_code,
    ttlock_email:        pool.ttlock_email,
    vault_configured:    pool.vault_key_ref !== null,
    status:              "connected",
    installation_status: integration?.installation_status ?? "incomplete",
  });
}
