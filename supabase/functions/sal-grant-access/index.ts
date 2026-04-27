/**
 * sal-grant-access
 *
 * Crea una concesión de acceso (lock_access_grant) y emite la credencial
 * correspondiente en el proveedor TTLock (PIN, app_key, etc.).
 *
 * Callers:
 *   - Frontend (admin) — grant manual
 *   - sal-place-lock   — auto-grant retroactivo al asignar ubicación
 *   - sal-process-room-assignment — auto-grant al asignar habitación
 *   - sal-process-group-change    — grant por membresía de grupo
 *   - n8n WF-04        — reemisión de credencial en error (reissue=true)
 *
 * POST body:
 * {
 *   client_account_id:          string (UUID)
 *   grant_type:                 "lodger" | "actor"
 *   lodger_id?:                 string (UUID) — si grant_type='lodger'
 *   lock_access_actor_id?:      string (UUID) — si grant_type='actor'
 *   lock_id:                    string (UUID)
 *   lock_placement_id?:         string (UUID)
 *   valid_from:                 string (ISO8601)
 *   valid_to?:                  string (ISO8601)
 *   source_type:                "room_assignment" | "group" | "manual"
 *   source_id?:                 string (UUID)
 *   credential_type?:           "pin" | "app_key" | "card" (default: "pin")
 *   reissue?:                   boolean — si true, reemite para credential_id existente
 *   credential_id?:             string (UUID) — requerido si reissue=true
 * }
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { resolveSalContext, assertSalSubscriptionActive, getLockIntegration } from "../_shared/sal-helpers.ts";
import { getLockProviderForIntegration } from "../_shared/lock-provider/provider-factory.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  let body: {
    client_account_id:     string;
    grant_type:            "lodger" | "actor";
    lodger_id?:            string;
    lock_access_actor_id?: string;
    lock_id:               string;
    lock_placement_id?:    string;
    valid_from:            string;
    valid_to?:             string;
    source_type:           string;
    source_id?:            string;
    credential_type?:      string;
    reissue?:              boolean;
    credential_id?:        string;
  };

  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const {
    client_account_id,
    grant_type,
    lodger_id,
    lock_access_actor_id,
    lock_id,
    lock_placement_id,
    valid_from,
    valid_to,
    source_type,
    source_id,
    credential_type = "pin",
    reissue = false,
    credential_id,
  } = body;

  // ── Validaciones básicas ──────────────────────────────────────────────────
  if (!client_account_id || !grant_type || !lock_id || !source_type) {
    return err(ERROR_CODES.VALIDATION, "Missing required fields", 400);
  }
  if (grant_type === "lodger" && !lodger_id) {
    return err(ERROR_CODES.VALIDATION, "lodger_id required when grant_type='lodger'", 400);
  }
  if (grant_type === "actor" && !lock_access_actor_id) {
    return err(ERROR_CODES.VALIDATION, "lock_access_actor_id required when grant_type='actor'", 400);
  }
  if (reissue && !credential_id) {
    return err(ERROR_CODES.VALIDATION, "credential_id required when reissue=true", 400);
  }

  const ctx = await resolveSalContext(req, client_account_id, ["admin", "superadmin"]);
  if (ctx instanceof Response) return ctx;
  const { supabase, actorUserId, actorRole } = ctx;

  const subErr = await assertSalSubscriptionActive(supabase, client_account_id);
  if (subErr) return subErr;

  // ── Verificar lock pertenece al tenant ────────────────────────────────────
  const { data: lock } = await supabase
    .from("locks")
    .select("id, client_account_id, provider_lock_id, name")
    .eq("id", lock_id)
    .single();

  if (!lock || lock.client_account_id !== client_account_id) {
    return err(ERROR_CODES.NOT_FOUND, "Lock not found or does not belong to this account", 404);
  }

  // ── Idempotencia: verificar si ya existe grant activo para lodger+lock ────
  if (!reissue) {
    const checkQ = supabase
      .from("lock_access_grants")
      .select("id")
      .eq("lock_id", lock_id)
      .eq("status", "active");

    if (lodger_id)            checkQ.eq("lodger_id", lodger_id);
    if (lock_access_actor_id) checkQ.eq("lock_access_actor_id", lock_access_actor_id);

    const { data: existing } = await checkQ.maybeSingle();
    if (existing) {
      return ok({ grant_id: existing.id, credential_id: null, already_exists: true });
    }
  }

  // ── Crear / recuperar el grant ────────────────────────────────────────────
  let grantId: string;

  if (reissue && credential_id) {
    // En reemisión, recuperar el grant existente asociado a la credencial
    const { data: cred } = await supabase
      .from("lock_credentials")
      .select("lock_access_grant_id")
      .eq("id", credential_id)
      .single();
    if (!cred) return err(ERROR_CODES.NOT_FOUND, "Credential not found", 404);
    grantId = cred.lock_access_grant_id;
  } else {
    // Crear nuevo grant con status 'pending'
    const { data: newGrant, error: grantErr } = await supabase
      .from("lock_access_grants")
      .insert({
        client_account_id,
        grant_type,
        lodger_id:              lodger_id ?? null,
        lock_access_actor_id:   lock_access_actor_id ?? null,
        lock_id,
        lock_placement_id:      lock_placement_id ?? null,
        status:                 "pending",
        valid_from:             valid_from ?? new Date().toISOString(),
        valid_to:               valid_to ?? null,
        source_type,
        source_id:              source_id ?? null,
      })
      .select("id")
      .single();

    if (grantErr || !newGrant) {
      return err(ERROR_CODES.INTERNAL, `Grant insert failed: ${grantErr?.message}`, 500);
    }
    grantId = newGrant.id;
  }

  // ── Intentar emitir credencial en TTLock ──────────────────────────────────
  const integration = await getLockIntegration(supabase, client_account_id);

  if (!integration || integration.status !== "connected") {
    // Sin integración activa → grant queda en 'pending', n8n reconciliará
    return ok({
      grant_id:   grantId,
      credential_id: null,
      pending:    true,
      message:    "Grant creado en estado pendiente. Sin integración TTLock activa — se procesará cuando se conecte.",
    });
  }

  let newCredentialId: string | null = null;
  let providerSyncStatus = "error";

  try {
    const provider = await getLockProviderForIntegration(supabase, integration);

    if (credential_type === "pin") {
      const startDate = valid_from ? new Date(valid_from) : new Date();
      const endDate   = valid_to   ? new Date(valid_to)   : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      const result = await provider.createPin(lock.provider_lock_id, {
        name:      `Grant-${grantId.slice(0, 8)}`,
        startDate,
        endDate,
        type:      "temporary",
      });

      const { data: cred, error: credErr } = await supabase
        .from("lock_credentials")
        .insert({
          client_account_id,
          lock_id,
          lock_access_grant_id:   grantId,
          credential_type:        "pin",
          credential_value:       null, // PIN en claro NO se persiste en BD
          provider_credential_id: result.providerCredentialId,
          status:                 "active",
          provider_sync_status:   "synced",
          expires_at:             result.expiresAt?.toISOString() ?? null,
        })
        .select("id")
        .single();

      if (!credErr && cred) {
        newCredentialId = cred.id;
        providerSyncStatus = "synced";
      }
    }
    // Otros tipos de credencial (app_key, card) → pendientes de implementar
  } catch (_e) {
    // TTLock falló → grant queda en 'pending', n8n reconciliará
    providerSyncStatus = "error";
  }

  // ── Activar grant ─────────────────────────────────────────────────────────
  const newGrantStatus = providerSyncStatus === "synced" ? "active" : "pending";
  await supabase
    .from("lock_access_grants")
    .update({ status: newGrantStatus })
    .eq("id", grantId);

  // ── Audit log ─────────────────────────────────────────────────────────────
  await supabase.from("audit_log").insert({
    actor_user_id:    actorUserId,
    actor_role:       actorRole,
    client_account_id,
    action:           "sal_grant_access",
    entity_type:      "lock_access_grants",
    entity_id:        grantId,
    detail:           { lock_id, grant_type, source_type, credential_type, provider_sync_status: providerSyncStatus },
  }).catch(() => {});

  return ok({
    grant_id:      grantId,
    credential_id: newCredentialId,
    grant_status:  newGrantStatus,
    message:       newGrantStatus === "active"
      ? "Acceso concedido y credencial emitida"
      : "Acceso creado en estado pendiente. Se procesará cuando TTLock esté disponible.",
  });
});
