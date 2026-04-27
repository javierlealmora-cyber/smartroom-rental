/**
 * sal-sync-locks
 *
 * Sincroniza cerraduras desde el proveedor configurado a la tabla `locks`.
 * Soporta cualquier proveedor via ILockProvider — agnóstico de TTLock.
 *
 * POST body:
 * {
 *   client_account_id: string
 *   mode?:             "full" | "state_only"   (default: "full")
 * }
 *
 * Respuesta:
 *   { synced: number, errors: string[] }
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import {
  resolveSalContext,
  assertSalSubscriptionActive,
  getLockIntegration,
} from "../_shared/sal-helpers.ts";
import { getLockProviderForIntegration } from "../_shared/lock-provider/provider-factory.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  let body: { client_account_id: string; mode?: "full" | "state_only" };
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { client_account_id, mode = "full" } = body;
  if (!client_account_id) {
    return err(ERROR_CODES.VALIDATION, "client_account_id is required", 400);
  }

  const ctx = await resolveSalContext(req, client_account_id, ["admin", "superadmin"]);
  if (ctx instanceof Response) return ctx;
  const { supabase } = ctx;

  const subErr = await assertSalSubscriptionActive(supabase, client_account_id);
  if (subErr) return subErr;

  // Cargar integración del proveedor
  const integration = await getLockIntegration(supabase, client_account_id);
  if (!integration || !integration.provider_credentials?.vault_key_ref) {
    return err("INTEGRATION_NOT_CONFIGURED", "Lock integration not configured. Connect credentials first.", 422);
  }

  // Instanciar proveedor (TTLock, Nuki, …) vía factory
  let provider;
  try {
    provider = await getLockProviderForIntegration(supabase, integration);
  } catch (e: unknown) {
    return err("PROVIDER_INIT_FAILED", e instanceof Error ? e.message : "Provider init failed", 500);
  }

  const errors: string[] = [];
  let synced = 0;
  const now = new Date().toISOString();

  // Obtener locks del proveedor
  let locks;
  try {
    locks = await provider.listLocks();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Fetch locks failed";
    await supabase.from("lock_integrations").update({
      last_sync_at:     now,
      last_sync_status: "error",
      last_sync_error:  msg,
    }).eq("id", integration.id);
    return err("PROVIDER_API_ERROR", msg, 502);
  }

  // Upsert en tabla locks
  for (const lock of locks) {
    const payload: Record<string, unknown> = {
      client_account_id,
      lock_integration_id: integration.id,
      provider:            integration.provider,
      provider_lock_id:    lock.providerLockId,
      name:                lock.name,
      battery_level:       lock.batteryLevel,
      is_online:           lock.isOnline,
      synced_at:           now,
    };

    if (mode === "full") {
      payload.model                = lock.model ?? null;
      payload.firmware_version     = lock.firmwareVersion ?? null;
      payload.supports_remote_unlock = lock.supportsRemoteUnlock;
      payload.raw_data             = lock.rawData as Record<string, unknown> ?? null;
    }

    const { error: upsErr } = await supabase
      .from("locks")
      .upsert(payload, { onConflict: "lock_integration_id,provider_lock_id" });

    if (upsErr) {
      errors.push(`Lock ${lock.providerLockId}: ${upsErr.message}`);
    } else {
      synced++;
    }
  }

  // Actualizar estado de integración
  await supabase.from("lock_integrations").update({
    last_sync_at:       now,
    last_sync_status:   errors.length > 0 ? "partial" : "success",
    last_sync_error:    errors.length > 0 ? errors[0] : null,
    locks_synced_count: synced,
    status:             "connected",
  }).eq("id", integration.id);

  return ok({ synced, errors, mode });
});
