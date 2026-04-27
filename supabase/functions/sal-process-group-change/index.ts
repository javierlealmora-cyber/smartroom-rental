/**
 * sal-process-group-change
 *
 * Recalcula los grants de un grupo de acceso tras un cambio en miembros o scopes.
 *
 * Lógica:
 *   1. Leer grupo + miembros activos + scopes.
 *   2. Resolver locks efectivas del grupo (UNION de todos los scopes).
 *   3. Para cada miembro activo × lock efectiva:
 *      - Si no hay grant activo → crear (invocar sal-grant-access internamente).
 *      - Si hay grant activo y la lock ya no está en scope → revocar.
 *
 * POST body:
 * {
 *   client_account_id: string (UUID)
 *   group_id:          string (UUID)
 * }
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { resolveSalContext, assertSalSubscriptionActive } from "../_shared/sal-helpers.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  let body: { client_account_id: string; group_id: string };
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { client_account_id, group_id } = body;

  if (!client_account_id || !group_id) {
    return err(ERROR_CODES.VALIDATION, "Missing required fields", 400);
  }

  const ctx = await resolveSalContext(req, client_account_id, ["admin", "superadmin"]);
  if (ctx instanceof Response) return ctx;
  const { supabase, actorUserId, actorRole } = ctx;

  const subErr = await assertSalSubscriptionActive(supabase, client_account_id);
  if (subErr) return subErr;

  // ── Leer grupo ────────────────────────────────────────────────────────────
  const { data: group } = await supabase
    .from("lock_access_groups")
    .select("id, credential_type, validity_days")
    .eq("id", group_id)
    .eq("client_account_id", client_account_id)
    .single();

  if (!group) {
    return err(ERROR_CODES.NOT_FOUND, "Group not found", 404);
  }

  // ── Leer miembros activos ─────────────────────────────────────────────────
  const { data: members } = await supabase
    .from("lock_access_group_members")
    .select("id, lock_access_actor_id")
    .eq("lock_access_group_id", group_id);

  if (!members?.length) {
    return ok({ grants_created: 0, grants_revoked: 0, message: "Grupo sin miembros" });
  }

  // ── Resolver locks efectivas desde scopes ─────────────────────────────────
  const { data: scopes } = await supabase
    .from("lock_access_group_scopes")
    .select("scope_type, accommodation_id, room_id, common_area_id, lock_id")
    .eq("lock_access_group_id", group_id);

  const effectiveLockIds = new Set<string>();

  for (const scope of scopes ?? []) {
    if (scope.scope_type === "lock" && scope.lock_id) {
      effectiveLockIds.add(scope.lock_id);
    } else if (scope.scope_type === "room" && scope.room_id) {
      // Locks con placement en esa habitación
      const { data: placements } = await supabase
        .from("lock_placements")
        .select("lock_id")
        .eq("room_id", scope.room_id)
        .eq("is_active", true);
      (placements ?? []).forEach((p) => effectiveLockIds.add(p.lock_id));
    } else if (scope.scope_type === "accommodation" && scope.accommodation_id) {
      // Locks con placement en ese alojamiento (entry + rooms)
      const { data: placements } = await supabase
        .from("lock_placements")
        .select("lock_id")
        .eq("accommodation_id", scope.accommodation_id)
        .eq("is_active", true);
      (placements ?? []).forEach((p) => effectiveLockIds.add(p.lock_id));
    } else if (scope.scope_type === "all_accommodations") {
      // Todas las locks del tenant
      const { data: allLocks } = await supabase
        .from("locks")
        .select("id")
        .eq("client_account_id", client_account_id);
      (allLocks ?? []).forEach((l) => effectiveLockIds.add(l.id));
    } else if (scope.scope_type === "common_area" && scope.common_area_id) {
      const { data: placements } = await supabase
        .from("lock_placements")
        .select("lock_id")
        .eq("common_area_id", scope.common_area_id)
        .eq("is_active", true);
      (placements ?? []).forEach((p) => effectiveLockIds.add(p.lock_id));
    }
  }

  const effectiveLocks = Array.from(effectiveLockIds);
  const validFrom = new Date().toISOString();
  const validTo   = group.validity_days
    ? new Date(Date.now() + group.validity_days * 86400000).toISOString()
    : null;

  let grantsCreated = 0;
  let grantsRevoked = 0;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // ── Para cada miembro × lock efectiva: crear grants faltantes ────────────
  for (const member of members) {
    for (const lockId of effectiveLocks) {
      // Verificar si ya existe grant activo
      const { data: existing } = await supabase
        .from("lock_access_grants")
        .select("id")
        .eq("lock_access_actor_id", member.lock_access_actor_id)
        .eq("lock_id", lockId)
        .eq("status", "active")
        .maybeSingle();

      if (existing) continue; // idempotente

      // Crear grant vía sal-grant-access
      try {
        await fetch(`${supabaseUrl}/functions/v1/sal-grant-access`, {
          method:  "POST",
          headers: {
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type":  "application/json",
          },
          body: JSON.stringify({
            client_account_id,
            grant_type:            "actor",
            lock_access_actor_id:  member.lock_access_actor_id,
            lock_id:               lockId,
            valid_from:            validFrom,
            valid_to:              validTo,
            source_type:           "group",
            source_id:             member.id,
            credential_type:       group.credential_type ?? "pin",
          }),
        });
        grantsCreated++;
      } catch {
        // Falló — n8n reconciliará
      }
    }

    // ── Revocar grants activos de locks fuera del scope actual ───────────
    if (effectiveLocks.length > 0) {
      const { data: staleGrants } = await supabase
        .from("lock_access_grants")
        .select("id, lock_id")
        .eq("lock_access_actor_id", member.lock_access_actor_id)
        .eq("client_account_id", client_account_id)
        .eq("source_type", "group")
        .eq("status", "active")
        .not("lock_id", "in", `(${effectiveLocks.join(",")})`);

      for (const stale of staleGrants ?? []) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/sal-revoke-access`, {
            method:  "POST",
            headers: {
              "Authorization": `Bearer ${serviceKey}`,
              "Content-Type":  "application/json",
            },
            body: JSON.stringify({
              client_account_id,
              grant_id:      stale.id,
              revoke_reason: "group_scope_change",
            }),
          });
          grantsRevoked++;
        } catch {
          // n8n reconciliará
        }
      }
    }
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  await supabase.from("audit_log").insert({
    actor_user_id:    actorUserId,
    actor_role:       actorRole,
    client_account_id,
    action:           "sal_process_group_change",
    entity_type:      "lock_access_groups",
    entity_id:        group_id,
    detail:           { grants_created: grantsCreated, grants_revoked: grantsRevoked, effective_locks: effectiveLocks.length },
  }).catch(() => {});

  return ok({
    group_id,
    grants_created: grantsCreated,
    grants_revoked: grantsRevoked,
    effective_locks: effectiveLocks.length,
    message: `Recalculado: ${grantsCreated} acceso(s) creado(s), ${grantsRevoked} revocado(s).`,
  });
});
