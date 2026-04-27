/**
 * sal-remote-unlock
 *
 * Envía un comando de apertura remota a una cerradura TTLock.
 *
 * Requiere:
 *   - Feature flag 'remote_unlock' activo en el plan del cliente.
 *   - locks.is_online = true (cerradura con gateway activo).
 *
 * Importante: errcode=0 de TTLock confirma el ENVÍO del comando al gateway,
 * NO que la cerradura se abrió físicamente. La UI debe indicar "Comando enviado".
 *
 * POST body:
 * {
 *   client_account_id: string (UUID)
 *   lock_id:           string (UUID interno)
 * }
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { resolveSalContext, assertSalSubscriptionActive, getLockIntegration, hasSalFeature } from "../_shared/sal-helpers.ts";
import { getLockProviderForIntegration } from "../_shared/lock-provider/provider-factory.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  let body: { client_account_id: string; lock_id: string };
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { client_account_id, lock_id } = body;
  if (!client_account_id || !lock_id) {
    return err(ERROR_CODES.VALIDATION, "Missing required fields", 400);
  }

  const ctx = await resolveSalContext(req, client_account_id, ["admin", "superadmin"]);
  if (ctx instanceof Response) return ctx;
  const { supabase, actorUserId, actorRole } = ctx;

  const subErr = await assertSalSubscriptionActive(supabase, client_account_id);
  if (subErr) return subErr;

  // ── Feature flag: remote_unlock ───────────────────────────────────────────
  const hasFeature = await hasSalFeature(supabase, client_account_id, "remote_unlock");
  if (!hasFeature) {
    return err(ERROR_CODES.FORBIDDEN, "El plan actual no incluye la función de unlock remoto", 403);
  }

  // ── Verificar cerradura ───────────────────────────────────────────────────
  const { data: lock } = await supabase
    .from("locks")
    .select("id, provider_lock_id, is_online, client_account_id, name")
    .eq("id", lock_id)
    .single();

  if (!lock || lock.client_account_id !== client_account_id) {
    return err(ERROR_CODES.NOT_FOUND, "Lock not found", 404);
  }

  if (!lock.is_online) {
    return err(ERROR_CODES.VALIDATION, "La cerradura no está online. El unlock remoto requiere que la cerradura tenga gateway activo y esté conectada.", 422);
  }

  // ── Obtener integración TTLock ────────────────────────────────────────────
  const integration = await getLockIntegration(supabase, client_account_id);
  if (!integration || integration.status !== "connected") {
    return err(ERROR_CODES.VALIDATION, "Sin integración TTLock activa", 422);
  }

  // ── Enviar comando de unlock ──────────────────────────────────────────────
  const unlockedAt = new Date().toISOString();

  try {
    const provider = await getLockProviderForIntegration(supabase, integration);
    await provider.remoteUnlock(lock.provider_lock_id);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error de comunicación con TTLock";
    return err(ERROR_CODES.INTERNAL, `Error al enviar comando de unlock: ${msg}`, 500);
  }

  // ── Registrar en lock_records ─────────────────────────────────────────────
  await supabase
    .from("lock_records")
    .insert({
      client_account_id,
      lock_id,
      event_type:        "remote_unlock",
      event_at:          unlockedAt,
      actor_description: actorUserId ? `Admin (${actorUserId})` : "Sistema",
      provider_record_id: `remote-${Date.now()}`,
    })
    .catch(() => {}); // no bloquear si falla el log

  // ── Audit log ─────────────────────────────────────────────────────────────
  await supabase.from("audit_log").insert({
    actor_user_id:    actorUserId,
    actor_role:       actorRole,
    client_account_id,
    action:           "sal_remote_unlock",
    entity_type:      "locks",
    entity_id:        lock_id,
    detail:           { lock_name: lock.name, unlocked_at: unlockedAt },
  }).catch(() => {});

  return ok({
    lock_id,
    lock_name:   lock.name,
    unlocked_at: unlockedAt,
    message:     "Comando de apertura enviado correctamente. La cerradura debería abrirse en breves segundos si el gateway está activo.",
  });
});
