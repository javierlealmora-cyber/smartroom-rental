// Edge Function: sal-activate-subscription
// Activa el módulo SmartAccessLock para un client_account.
//
// Caller: superadmin desde ClientSalActivation.jsx
// Input:  { client_account_id, saas_service_plan_id, notes? }
// Output: { subscription_id, status: 'active' }
//
// Pasos:
//   1. Validar rol superadmin
//   2. Verificar que el plan pertenece al servicio smart_access_lock
//   3. UPSERT saas_service_subscriptions (ON CONFLICT → status='active')
//   4. INSERT lock_integrations (ON CONFLICT DO NOTHING) para preparar la conexión TTLock
//   5. Registrar en audit_log
//   6. Devolver subscription_id

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ok, err, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { createServiceClient } from "../_shared/sal-helpers.ts";

const SAL_SERVICE_CODE = "smart_access_lock";

serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();

  try {
    // ── 1. Autenticación: solo superadmin puede activar suscripciones ─────────
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return err(ERROR_CODES.UNAUTHORIZED, "Missing authorization header", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createServiceClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return err(ERROR_CODES.UNAUTHORIZED, "Authentication failed", 401);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "superadmin") {
      return err(ERROR_CODES.FORBIDDEN, "Only superadmin can activate SAL subscriptions", 403);
    }

    // ── 2. Parsear y validar body ─────────────────────────────────────────────
    const body = await req.json() as {
      client_account_id: string;
      saas_service_plan_id?: string;
      notes?: string;
    };

    const { client_account_id, saas_service_plan_id, notes } = body;

    if (!client_account_id) {
      return err(ERROR_CODES.VALIDATION, "client_account_id is required", 400);
    }

    // Verificar que el client_account existe
    const { data: account } = await supabase
      .from("client_accounts")
      .select("id, status")
      .eq("id", client_account_id)
      .single();

    if (!account) {
      return err(ERROR_CODES.NOT_FOUND, "Client account not found", 404);
    }

    // ── 3. Resolver saas_service y plan ───────────────────────────────────────
    // Obtener el servicio SAL
    const { data: service } = await supabase
      .from("saas_services")
      .select("id, code, status")
      .eq("code", SAL_SERVICE_CODE)
      .single();

    if (!service) {
      return err(ERROR_CODES.NOT_FOUND, "SmartAccessLock service not found in catalog", 404);
    }

    // Si se proporcionó plan, verificar que pertenece al servicio SAL
    let resolvedPlanId: string | null = saas_service_plan_id ?? null;

    if (saas_service_plan_id) {
      const { data: plan } = await supabase
        .from("saas_service_plans")
        .select("id, saas_service_id, is_active")
        .eq("id", saas_service_plan_id)
        .single();

      if (!plan) {
        return err(ERROR_CODES.NOT_FOUND, "Service plan not found", 404);
      }

      if (plan.saas_service_id !== service.id) {
        return err(
          ERROR_CODES.VALIDATION,
          "Plan does not belong to SmartAccessLock service",
          400
        );
      }

      if (!plan.is_active) {
        return err(ERROR_CODES.VALIDATION, "Service plan is not active", 400);
      }
    }

    // ── 4. Verificar si ya existe suscripción activa (409 informativo) ────────
    const { data: existingSub } = await supabase
      .from("saas_service_subscriptions")
      .select("id, status")
      .eq("client_account_id", client_account_id)
      .eq("saas_service_id", service.id)
      .maybeSingle();

    if (existingSub?.status === "active") {
      return err(
        ERROR_CODES.CONFLICT,
        "SmartAccessLock is already active for this account",
        409,
        { subscription_id: existingSub.id }
      );
    }

    // ── 5. UPSERT saas_service_subscriptions ─────────────────────────────────
    const now = new Date().toISOString();

    const { data: subscription, error: subError } = await supabase
      .from("saas_service_subscriptions")
      .upsert(
        {
          client_account_id,
          saas_service_id:      service.id,
          saas_service_plan_id: resolvedPlanId,
          status:               "active",
          activated_at:         now,
          activated_by:         user.id,
          notes:                notes ?? null,
          billing_starts_at:    now,
          // stripe_subscription_item_id = NULL → Fase 1 sin Stripe
        },
        {
          onConflict: "client_account_id,saas_service_id",
          ignoreDuplicates: false,
        }
      )
      .select("id, status")
      .single();

    if (subError) {
      return err(ERROR_CODES.INTERNAL, "Error creating subscription", 500, subError.message);
    }

    // ── 6. INSERT lock_integrations (preparar conexión TTLock vacía) ──────────
    // ON CONFLICT DO NOTHING: si ya existe una integración, no la sobreescribir.
    const { error: intError } = await supabase
      .from("lock_integrations")
      .insert({
        client_account_id,
        provider:  "ttlock",
        status:    "disconnected",
      })
      .select("id")
      // Ignorar error de UNIQUE (client_account_id, provider) — ya existe
      ;

    // Error 23505 = unique_violation: es esperado si ya hay integración → ignorar
    if (intError && !intError.code?.includes("23505")) {
      // Error inesperado — loguear pero no fallar (la suscripción ya está creada)
      console.error("sal-activate-subscription: lock_integrations insert error:", intError.message);
    }

    // ── 7. Audit log ──────────────────────────────────────────────────────────
    await supabase.from("audit_log").insert({
      client_account_id,
      actor_user_id: user.id,
      actor_role:    "superadmin",
      entity_type:   "saas_subscription",
      entity_id:     subscription.id,
      action:        "sal_activated",
      new_values: {
        service_code:          SAL_SERVICE_CODE,
        saas_service_plan_id:  resolvedPlanId,
        notes,
      },
    });

    // ── 8. Respuesta ──────────────────────────────────────────────────────────
    return ok({
      subscription_id: subscription.id,
      status:          "active",
      service_code:    SAL_SERVICE_CODE,
    }, 200);

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("sal-activate-subscription error:", message);
    return err(ERROR_CODES.INTERNAL, "Internal server error", 500, message);
  }
});
