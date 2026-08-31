/**
 * sal-quarantine-lock — Shard Pool v4
 *
 * Pone una cerradura en estado 'quarantine' con un motivo explícito.
 * Llamada por:
 *  - n8n WF-14 (locks sin propietario detectadas en el shard)
 *  - n8n WF-16 (anomalías de ownership detectadas)
 *  - sal-confirm-claim-session (sesión expirada)
 *  - superadmin (intervención manual)
 *
 * Una lock en quarantine no puede generar grants ni recibir comandos.
 * No puede pasar a 'active' sin resolución manual.
 *
 * POST body:
 *   { client_account_id?, lock_id, quarantine_reason }
 *
 * Nota: client_account_id es opcional cuando la lock no tiene tenant asignado
 *       (caso de locks detectadas por sync sin propietario).
 *
 * Respuesta:
 *   { lock_id, status: 'quarantine', quarantine_reason }
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { resolveSalContext, assertSalSubscriptionActive } from "../_shared/sal-helpers.ts";
import { createServiceClient, detectAutomationCaller } from "../_shared/sal-helpers.ts";

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (e: unknown) {
    const msg   = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? (e.stack ?? "") : "";
    console.error(`[sal-quarantine-lock] UNCAUGHT ERROR: ${msg}\n${stack}`);
    return err("UNCAUGHT_EXCEPTION", msg, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  let body: {
    client_account_id?: string;
    lock_id:            string;
    quarantine_reason:  string;
  };
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { lock_id, quarantine_reason } = body;
  if (!lock_id || !quarantine_reason) {
    return err(
      ERROR_CODES.VALIDATION,
      "Missing required fields: lock_id, quarantine_reason",
      400,
    );
  }

  // Permitir llamadas de automatización sin client_account_id
  // (para locks recién detectadas en el shard sin propietario)
  const isAutomation = detectAutomationCaller(req);
  const supabase = createServiceClient();

  let actorUserId: string | null = null;
  let actorRole = "system";

  if (!isAutomation) {
    // Llamada de usuario: necesita client_account_id
    if (!body.client_account_id) {
      return err(ERROR_CODES.VALIDATION, "client_account_id is required for non-automation callers", 400);
    }

    const ctx = await resolveSalContext(req, body.client_account_id, ["admin", "superadmin"]);
    if (ctx instanceof Response) return ctx;

    actorUserId = ctx.actorUserId;
    actorRole   = ctx.actorRole;

    const subErr = await assertSalSubscriptionActive(supabase, body.client_account_id);
    if (subErr) return subErr;
  }

  // ── 1. Leer la lock ──────────────────────────────────────────────────────────
  const { data: lock } = await supabase
    .from("locks")
    .select("id, status, client_account_id")
    .eq("id", lock_id)
    .maybeSingle();

  if (!lock) {
    return err(ERROR_CODES.NOT_FOUND, "Cerradura no encontrada.", 404);
  }

  // Verificar ownership si hay client_account_id y no es automatización
  if (!isAutomation && body.client_account_id && lock.client_account_id) {
    if (lock.client_account_id !== body.client_account_id) {
      return err(ERROR_CODES.FORBIDDEN, "La cerradura no pertenece a este cliente.", 403);
    }
  }

  // Locks ya en quarantine o en estados terminales — idempotente
  if (lock.status === "quarantine") {
    return ok({
      lock_id,
      status:           "quarantine",
      quarantine_reason: quarantine_reason,
      idempotent:       true,
    });
  }

  if (lock.status === "offboarded") {
    return err("LOCK_OFFBOARDED", "No se puede poner en cuarentena una lock dada de baja.", 409);
  }

  // ── 2. Desactivar vínculos gateway activos ────────────────────────────────────
  await supabase
    .from("lock_gateway_links")
    .update({ is_active: false })
    .eq("lock_id", lock_id)
    .eq("is_active", true);

  // ── 3. Cerrar la claim session activa (si existe) ─────────────────────────────
  if (lock.client_account_id) {
    await supabase
      .from("lock_claim_sessions")
      .update({ status: "failed", error_reason: quarantine_reason })
      .eq("lock_id", lock_id)
      .eq("status", "open");
  }

  // ── 4. Poner en quarantine ────────────────────────────────────────────────────
  const { error: updateErr } = await supabase
    .from("locks")
    .update({
      status:            "quarantine",
      quarantine_reason,
      gateway_id:        null,
      claim_session_id:  null,
    })
    .eq("id", lock_id);

  if (updateErr) {
    return err(
      ERROR_CODES.INTERNAL,
      `No se pudo poner en cuarentena: ${updateErr.message}`,
      500,
    );
  }

  // ── 5. Audit log (no fatal) ───────────────────────────────────────────────────
  await supabase.from("audit_log").insert({
    actor_user_id:    actorUserId,
    actor_role:       actorRole,
    client_account_id: lock.client_account_id ?? body.client_account_id ?? null,
    action:           "sal_quarantine_lock",
    entity_type:      "locks",
    entity_id:        lock_id,
    detail:           { quarantine_reason, previous_status: lock.status },
  }).catch(() => {});

  console.log(
    `[sal-quarantine-lock] ✓ lock=${lock_id} reason=${quarantine_reason}`,
  );

  return ok({
    lock_id,
    status:           "quarantine",
    quarantine_reason,
  });
}
