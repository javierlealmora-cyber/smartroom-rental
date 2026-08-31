/**
 * sal-change-plan
 *
 * Cambia el plan de la suscripción SmartAccessLock de un client_account.
 *
 * Regla (rules-21-subscription-plan-configuration.md §4.5):
 *  - Upgrade puro (todos los límites nuevos ≥ actuales y todas las capacidades
 *    nuevas ≥ actuales): siempre permitido.
 *  - Downgrade: se BLOQUEA con PLAN_DOWNGRADE_BLOCKED si el uso real actual
 *    supera algún límite del plan destino, o si existen recursos activos que
 *    dependen de una capacidad que el plan destino no incluye.
 *  - Nunca se desactivan recursos automáticamente para "hacer encajar" un
 *    downgrade. Todo-o-nada.
 *
 * Llamado desde:
 *  - UI admin cliente: "Cambiar plan" en la configuración del módulo.
 *  - Superadmin: cambio de plan asistido.
 *
 * POST body:
 *   { client_account_id: string, target_plan_id: string }
 *
 * Respuesta OK:
 *   { subscription_id, previous_plan_id, new_plan_id, config: SalPlanConfiguration }
 *
 * Respuesta bloqueada (downgrade con conflictos):
 *   { ok: false, error: {
 *       code: "PLAN_DOWNGRADE_BLOCKED",
 *       message: string,
 *       detail: { conflicts: PlanChangeConflict[] }
 *   } }
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { resolveSalContext, assertSalSubscriptionActive } from "../_shared/sal-helpers.ts";
import { validateSalPlanChange } from "../_shared/sal-plan-config.ts";

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (e: unknown) {
    const msg   = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? (e.stack ?? "") : "";
    console.error(`[sal-change-plan] UNCAUGHT ERROR: ${msg}\n${stack}`);
    return err("UNCAUGHT_EXCEPTION", msg, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  let body: { client_account_id: string; target_plan_id: string };
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { client_account_id, target_plan_id } = body;
  if (!client_account_id || !target_plan_id) {
    return err(
      ERROR_CODES.VALIDATION,
      "Missing required fields: client_account_id, target_plan_id",
      400,
    );
  }

  // Contexto + autorización
  const ctx = await resolveSalContext(req, client_account_id, ["admin", "superadmin"]);
  if (ctx instanceof Response) return ctx;
  const { supabase, actorUserId, actorRole } = ctx;

  // Gating: cliente debe tener suscripción SAL activa
  const subErr = await assertSalSubscriptionActive(supabase, client_account_id);
  if (subErr) return subErr;

  // Validar que target_plan_id existe y pertenece al servicio SmartAccessLock
  const { data: targetPlan } = await supabase
    .from("saas_service_plans")
    .select("id, saas_service_id, is_active, code, name, saas_services!inner(code)")
    .eq("id", target_plan_id)
    .maybeSingle();

  if (!targetPlan) {
    return err(ERROR_CODES.NOT_FOUND, "Plan destino no encontrado", 404);
  }
  // deno-lint-ignore no-explicit-any
  const parentServiceCode = (targetPlan as any).saas_services?.code;
  if (parentServiceCode !== "smart_access_lock") {
    return err(
      ERROR_CODES.VALIDATION,
      "El plan destino no pertenece al servicio SmartAccessLock",
      400,
    );
  }
  if (targetPlan.is_active === false) {
    return err(ERROR_CODES.VALIDATION, "El plan destino no está activo", 400);
  }

  // Validar upgrade/downgrade contra uso real
  const validation = await validateSalPlanChange(supabase, client_account_id, target_plan_id);
  if (validation instanceof Response) return validation;

  if (!validation.allowed) {
    return err(
      ERROR_CODES.PLAN_DOWNGRADE_BLOCKED,
      "No se puede cambiar de plan: hay recursos que exceden el plan destino",
      409,
      { conflicts: validation.conflicts, from: validation.currentConfig.planCode, to: targetPlan.code },
    );
  }

  const { currentConfig, targetConfig } = validation;

  // Idempotencia: si ya está en el plan destino, devolver sin cambios
  if (currentConfig.planId === target_plan_id) {
    return ok({
      subscription_id: currentConfig.subscriptionId,
      previous_plan_id: currentConfig.planId,
      new_plan_id: target_plan_id,
      unchanged: true,
      config: targetConfig,
    });
  }

  // Aplicar cambio
  const { error: updateErr } = await supabase
    .from("saas_service_subscriptions")
    .update({
      saas_service_plan_id: target_plan_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", currentConfig.subscriptionId);

  if (updateErr) {
    console.error(`[sal-change-plan] update failed: ${updateErr.message}`);
    return err(ERROR_CODES.INTERNAL, `Error al aplicar el cambio de plan: ${updateErr.message}`, 500);
  }

  // Auditoría (non-fatal)
  try {
    await supabase.from("audit_log").insert({
      client_account_id,
      actor_user_id: actorUserId,
      actor_role: actorRole,
      entity_type: "saas_service_subscriptions",
      entity_id: currentConfig.subscriptionId,
      action: "sal_change_plan",
      old_values: { plan_id: currentConfig.planId, plan_code: currentConfig.planCode },
      new_values: { plan_id: target_plan_id,      plan_code: targetPlan.code },
    });
  } catch { /* non-fatal */ }

  return ok({
    subscription_id: currentConfig.subscriptionId,
    previous_plan_id: currentConfig.planId,
    new_plan_id: target_plan_id,
    config: targetConfig,
  });
}
