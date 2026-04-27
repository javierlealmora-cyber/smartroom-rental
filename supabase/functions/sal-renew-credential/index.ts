/**
 * sal-renew-credential
 *
 * Renueva una credencial próxima a vencer o ya expirada.
 *
 * Estrategia:
 *   - Si TTLock soporta actualizar vigencia in-place → actualizar.
 *   - Si no → revocar + reemitir nueva credencial.
 *
 * POST body:
 * {
 *   client_account_id: string (UUID)
 *   credential_id:     string (UUID)
 *   extend_days?:      number (default 30)
 * }
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { resolveSalContext, assertSalSubscriptionActive, getLockIntegration } from "../_shared/sal-helpers.ts";
import { getLockProviderForIntegration } from "../_shared/lock-provider/provider-factory.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  let body: {
    client_account_id: string;
    credential_id:     string;
    extend_days?:      number;
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { client_account_id, credential_id, extend_days = 30 } = body;

  if (!client_account_id || !credential_id) {
    return err(ERROR_CODES.VALIDATION, "Missing required fields", 400);
  }

  const ctx = await resolveSalContext(req, client_account_id, ["admin", "superadmin"]);
  if (ctx instanceof Response) return ctx;
  const { supabase, actorUserId, actorRole } = ctx;

  const subErr = await assertSalSubscriptionActive(supabase, client_account_id);
  if (subErr) return subErr;

  // ── Cargar credencial ─────────────────────────────────────────────────────
  const { data: cred } = await supabase
    .from("lock_credentials")
    .select(`
      id, credential_type, provider_credential_id, status, expires_at,
      lock_id, lock_access_grant_id,
      locks(provider_lock_id)
    `)
    .eq("id", credential_id)
    .eq("client_account_id", client_account_id)
    .single();

  if (!cred) {
    return err(ERROR_CODES.NOT_FOUND, "Credential not found", 404);
  }

  if (cred.status !== "active") {
    return err(ERROR_CODES.VALIDATION, "Cannot renew a non-active credential", 400);
  }

  const newExpiresAt = new Date(Date.now() + extend_days * 86400000);
  const integration  = await getLockIntegration(supabase, client_account_id);

  let providerSyncStatus = "error";

  if (integration?.status === "connected" && cred.provider_credential_id) {
    try {
      const provider       = await getLockProviderForIntegration(supabase, integration);
      const providerLockId = (cred.locks as { provider_lock_id?: string } | null)?.provider_lock_id ?? "";

      await provider.renewCredential(
        providerLockId,
        cred.provider_credential_id,
        newExpiresAt,
      );

      providerSyncStatus = "synced";
    } catch (_e) {
      // Proveedor no disponible — n8n reintentará
      providerSyncStatus = "error";
    }
  }

  // ── Actualizar credencial en BD ───────────────────────────────────────────
  await supabase
    .from("lock_credentials")
    .update({
      expires_at:           newExpiresAt.toISOString(),
      provider_sync_status: providerSyncStatus,
    })
    .eq("id", credential_id);

  // ── Actualizar valid_to en el grant ───────────────────────────────────────
  if (cred.lock_access_grant_id) {
    await supabase
      .from("lock_access_grants")
      .update({ valid_to: newExpiresAt.toISOString() })
      .eq("id", cred.lock_access_grant_id);
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  await supabase.from("audit_log").insert({
    actor_user_id:    actorUserId,
    actor_role:       actorRole,
    client_account_id,
    action:           "sal_renew_credential",
    entity_type:      "lock_credentials",
    entity_id:        credential_id,
    detail:           { extend_days, new_expires_at: newExpiresAt.toISOString(), provider_sync_status: providerSyncStatus },
  }).catch(() => {});

  return ok({
    credential_id,
    expires_at:           newExpiresAt.toISOString(),
    provider_sync_status: providerSyncStatus,
    message:              providerSyncStatus === "synced"
      ? `Credencial renovada hasta ${newExpiresAt.toLocaleDateString("es-ES")}`
      : "Credencial actualizada en BD. Pendiente de sync con TTLock (n8n reintentará).",
  });
});
