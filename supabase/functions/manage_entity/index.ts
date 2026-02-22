// Edge Function: manage_entity
// Gestiona operaciones de escritura sobre entities (owner/payer)
// Acciones: create | update | set_status
// Valida: JWT + rol admin/superadmin + tenant + límites de plan

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  ok, err, optionsResponse, corsHeaders, ERROR_CODES,
} from "../_shared/response.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── 1. Verificar JWT ──────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) return err(ERROR_CODES.UNAUTHORIZED, "Missing authorization header", 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return err(ERROR_CODES.UNAUTHORIZED, "Authentication failed", 401);

    // ── 2. Verificar perfil + rol ─────────────────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, client_account_id")
      .eq("id", user.id)
      .single();

    if (!profile) return err(ERROR_CODES.NOT_FOUND, "Profile not found", 404);
    if (!["admin", "superadmin"].includes(profile.role)) {
      return err(ERROR_CODES.FORBIDDEN, "Insufficient permissions", 403);
    }

    const clientAccountId = profile.client_account_id;
    if (!clientAccountId && profile.role !== "superadmin") {
      return err(ERROR_CODES.FORBIDDEN, "No tenant associated", 403);
    }

    // ── 3. Parsear body ───────────────────────────────────────────────────────
    const body = await req.json();
    const { action, payload } = body as {
      action: "create" | "update" | "set_status";
      payload: Record<string, unknown>;
    };

    if (!action || !payload) {
      return err(ERROR_CODES.VALIDATION, "Missing action or payload", 400);
    }
    if (!["create", "update", "set_status"].includes(action)) {
      return err(ERROR_CODES.INVALID_ACTION, `Unknown action: ${action}`, 400);
    }

    // ── 4. Verificar cuenta activa ────────────────────────────────────────────
    const { data: account } = await supabase
      .from("client_accounts")
      .select("status, plan_code")
      .eq("id", clientAccountId)
      .single();

    if (!account || !["active", "draft"].includes(account.status)) {
      return err(ERROR_CODES.ACCOUNT_INACTIVE, "Account is not active", 403);
    }

    // ── 5. Acciones ───────────────────────────────────────────────────────────

    if (action === "create") {
      const { type, legal_type } = payload as { type: string; legal_type: string };

      if (!type || !["owner", "payer"].includes(type)) {
        return err(ERROR_CODES.VALIDATION, "type must be 'owner' or 'payer'", 400);
      }
      if (!legal_type) {
        return err(ERROR_CODES.VALIDATION, "legal_type is required", 400);
      }

      // Validar límite de plan solo para owner entities
      if (type === "owner") {
        const { data: plan } = await supabase
          .from("plans_catalog")
          .select("max_owners")
          .eq("code", account.plan_code)
          .eq("status", "active")
          .single();

        if (plan && plan.max_owners !== -1) {
          const { count } = await supabase
            .from("entities")
            .select("id", { count: "exact", head: true })
            .eq("client_account_id", clientAccountId)
            .eq("type", "owner")
            .eq("status", "active");

          if ((count ?? 0) >= plan.max_owners) {
            return err(
              ERROR_CODES.PLAN_LIMIT_EXCEEDED,
              `Tu plan permite un máximo de ${plan.max_owners} entidades propietarias activas`,
              403,
              { current: count, limit: plan.max_owners }
            );
          }
        }
      }

      const { data: newEntity, error: insertError } = await supabase
        .from("entities")
        .insert({ ...payload, client_account_id: clientAccountId, type })
        .select("*")
        .single();

      if (insertError) {
        const isDuplicate = insertError.code === "23505";
        return err(
          isDuplicate ? ERROR_CODES.CONFLICT : ERROR_CODES.INTERNAL,
          isDuplicate ? "Ya existe una entidad con ese NIF/CIF en esta cuenta" : "Error creating entity",
          isDuplicate ? 409 : 500,
          insertError.message
        );
      }

      // Audit log
      await supabase.from("audit_log").insert({
        client_account_id: clientAccountId,
        actor_user_id: user.id,
        actor_role: profile.role,
        entity_type: "entity",
        entity_id: newEntity.id,
        action: "create",
        new_values: newEntity,
      });

      return ok(newEntity, 201);
    }

    if (action === "update") {
      const { id, ...patch } = payload as { id: string; [key: string]: unknown };
      if (!id) return err(ERROR_CODES.VALIDATION, "id is required for update", 400);

      // Verificar que la entidad pertenece al tenant
      const { data: existing } = await supabase
        .from("entities")
        .select("*")
        .eq("id", id)
        .eq("client_account_id", clientAccountId)
        .single();

      if (!existing) return err(ERROR_CODES.NOT_FOUND, "Entity not found", 404);

      // No permitir cambiar client_account_id ni type
      delete patch.client_account_id;
      delete patch.type;

      const { data: updated, error: updateError } = await supabase
        .from("entities")
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();

      if (updateError) {
        return err(ERROR_CODES.INTERNAL, "Error updating entity", 500, updateError.message);
      }

      await supabase.from("audit_log").insert({
        client_account_id: clientAccountId,
        actor_user_id: user.id,
        actor_role: profile.role,
        entity_type: "entity",
        entity_id: id,
        action: "update",
        old_values: existing,
        new_values: updated,
      });

      return ok(updated);
    }

    if (action === "set_status") {
      const { id, status } = payload as { id: string; status: string };
      if (!id) return err(ERROR_CODES.VALIDATION, "id is required", 400);

      const validStatuses = ["active", "inactive", "suspended"];
      if (!status || !validStatuses.includes(status)) {
        return err(ERROR_CODES.VALIDATION, `status must be one of: ${validStatuses.join(", ")}`, 400);
      }

      const { data: existing } = await supabase
        .from("entities")
        .select("*")
        .eq("id", id)
        .eq("client_account_id", clientAccountId)
        .single();

      if (!existing) return err(ERROR_CODES.NOT_FOUND, "Entity not found", 404);

      const { data: updated, error: statusError } = await supabase
        .from("entities")
        .update({ status })
        .eq("id", id)
        .select("*")
        .single();

      if (statusError) {
        return err(ERROR_CODES.INTERNAL, "Error updating entity status", 500, statusError.message);
      }

      await supabase.from("audit_log").insert({
        client_account_id: clientAccountId,
        actor_user_id: user.id,
        actor_role: profile.role,
        entity_type: "entity",
        entity_id: id,
        action: "status_change",
        old_values: { status: existing.status },
        new_values: { status },
      });

      return ok(updated);
    }

    return err(ERROR_CODES.INVALID_ACTION, "Unhandled action", 400);

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("manage_entity error:", message);
    return err(ERROR_CODES.INTERNAL, "Internal server error", 500, message);
  }
});
