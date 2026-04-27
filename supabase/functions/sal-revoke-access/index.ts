/**
 * sal-revoke-access
 *
 * Revoca una concesión de acceso y sus credenciales en el proveedor TTLock.
 *
 * Comportamiento:
 *   - Revoca en BD inmediatamente (grant + credentials → 'revoked').
 *   - Intenta revocar en TTLock. Si falla → provider_sync_status='error', n8n reconciliará.
 *   - Idempotente: si ya está revocado, devuelve OK sin error.
 *
 * POST body:
 * {
 *   client_account_id: string (UUID)
 *   grant_id:          string (UUID)
 *   revoked_by?:       string (UUID)
 *   revoke_reason?:    string
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
    grant_id:          string;
    revoked_by?:       string;
    revoke_reason?:    string;
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { client_account_id, grant_id, revoked_by, revoke_reason } = body;

  if (!client_account_id || !grant_id) {
    return err(ERROR_CODES.VALIDATION, "Missing required fields: client_account_id, grant_id", 400);
  }

  const ctx = await resolveSalContext(req, client_account_id, ["admin", "superadmin"]);
  if (ctx instanceof Response) return ctx;
  const { supabase, actorUserId, actorRole } = ctx;

  const subErr = await assertSalSubscriptionActive(supabase, client_account_id);
  if (subErr) return subErr;

  // ── Leer grant ────────────────────────────────────────────────────────────
  const { data: grant } = await supabase
    .from("lock_access_grants")
    .select("id, status, lock_id, client_account_id")
    .eq("id", grant_id)
    .single();

  if (!grant || grant.client_account_id !== client_account_id) {
    return err(ERROR_CODES.NOT_FOUND, "Grant not found or does not belong to this account", 404);
  }

  // Idempotente: ya estaba revocado
  if (grant.status === "revoked") {
    return ok({ grant_id, status: "revoked", already_revoked: true });
  }

  // ── Cargar credenciales activas de este grant ─────────────────────────────
  const { data: credentials } = await supabase
    .from("lock_credentials")
    .select("id, credential_type, provider_credential_id, status")
    .eq("lock_access_grant_id", grant_id)
    .eq("status", "active");

  // ── Obtener cerradura para TTLock ─────────────────────────────────────────
  const { data: lock } = await supabase
    .from("locks")
    .select("provider_lock_id")
    .eq("id", grant.lock_id)
    .single();

  // ── Intentar revocar en TTLock ────────────────────────────────────────────
  const integration = await getLockIntegration(supabase, client_account_id);
  const credentialErrors: string[] = [];

  if (integration?.status === "connected" && lock) {
    try {
      const provider = await getLockProviderForIntegration(supabase, integration);

      for (const cred of credentials ?? []) {
        if (!cred.provider_credential_id) continue;
        try {
          await provider.revokeCredential(
            lock.provider_lock_id,
            cred.provider_credential_id,
            "cloud_and_device", // requiere gateway; n8n reconcilia si gateway offline
          );
        } catch (_e) {
          // Falló en proveedor — marcar para reconciliación
          credentialErrors.push(cred.id);
          await supabase
            .from("lock_credentials")
            .update({ provider_sync_status: "error" })
            .eq("id", cred.id);
        }
      }
    } catch (_e) {
      // Proveedor no disponible — todas las credenciales quedan en error
      for (const cred of credentials ?? []) {
        credentialErrors.push(cred.id);
      }
    }
  }

  // ── Revocar credenciales en BD ────────────────────────────────────────────
  if ((credentials ?? []).length > 0) {
    await supabase
      .from("lock_credentials")
      .update({
        status:               "revoked",
        provider_sync_status: credentialErrors.length > 0 ? "error" : "synced",
      })
      .eq("lock_access_grant_id", grant_id)
      .eq("status", "active");
  }

  // ── Revocar grant en BD ───────────────────────────────────────────────────
  await supabase
    .from("lock_access_grants")
    .update({
      status:         "revoked",
      revoked_at:     new Date().toISOString(),
      revoked_by:     revoked_by ?? actorUserId,
      revoke_reason:  revoke_reason ?? "manual",
    })
    .eq("id", grant_id);

  // ── Audit log ─────────────────────────────────────────────────────────────
  await supabase.from("audit_log").insert({
    actor_user_id:    actorUserId,
    actor_role:       actorRole,
    client_account_id,
    action:           "sal_revoke_access",
    entity_type:      "lock_access_grants",
    entity_id:        grant_id,
    detail:           {
      revoke_reason,
      credentials_revoked: (credentials ?? []).length,
      ttlock_errors:       credentialErrors.length,
    },
  }).catch(() => {});

  return ok({
    grant_id,
    status:              "revoked",
    credentials_revoked: (credentials ?? []).length,
    ttlock_errors:       credentialErrors.length,
    message:             credentialErrors.length > 0
      ? `Acceso revocado en BD. ${credentialErrors.length} credencial(es) pendientes de sync con TTLock (n8n reconciliará).`
      : "Acceso y credenciales revocados correctamente.",
  });
});
