/**
 * sal-execute-command — Shard Pool v4
 *
 * Ejecuta un comando pendiente de lock_sync_commands.
 * Llamada por n8n (procesa la cola de comandos).
 *
 * Flujo:
 *  1. Leer el comando — validar que está en 'pending'
 *  2. Verificar shard no bloqueado
 *  3. Verificar attempt_count < max_attempts
 *  4. SET status='executing'
 *  5. Ejecutar la llamada TTLock correspondiente
 *  6. SET status='completed' | 'failed'; incrementar attempt_count
 *
 * Invariante §15.14.15: ningún comando puede permanecer en 'executing' > 5 min.
 * n8n WF detecta y resetea comandos colgados.
 *
 * POST body:
 *   { command_id }
 *
 * Respuesta:
 *   { command_id, status: 'completed' | 'failed', result?, error? }
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { createServiceClient, detectAutomationCaller } from "../_shared/sal-helpers.ts";
import { readVaultSecret, saveVaultSecret } from "../_shared/sal-vault.ts";
import { getTTLockToken, isTokenFresh } from "../_shared/sal-ttlock-client.ts";

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (e: unknown) {
    const msg   = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? (e.stack ?? "") : "";
    console.error(`[sal-execute-command] UNCAUGHT ERROR: ${msg}\n${stack}`);
    return err("UNCAUGHT_EXCEPTION", msg, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  // Solo service_role puede ejecutar comandos (n8n o EFs internas)
  if (!detectAutomationCaller(req)) {
    return err(ERROR_CODES.FORBIDDEN, "This endpoint requires service_role credentials", 403);
  }

  let body: { command_id: string };
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { command_id } = body;
  if (!command_id) {
    return err(ERROR_CODES.VALIDATION, "Missing required field: command_id", 400);
  }

  const supabase = createServiceClient();

  // ── 1. Leer el comando ───────────────────────────────────────────────────────
  const { data: command } = await supabase
    .from("lock_sync_commands")
    .select(
      "id, lock_id, pool_id, client_account_id, command_type, command_payload, " +
      "status, priority, attempt_count, max_attempts, dedupe_key"
    )
    .eq("id", command_id)
    .maybeSingle();

  if (!command) {
    return err(ERROR_CODES.NOT_FOUND, "Comando no encontrado.", 404);
  }

  if (command.status !== "pending") {
    return err(
      "COMMAND_NOT_PENDING",
      `El comando está en estado '${command.status}' — solo se pueden ejecutar comandos 'pending'.`,
      409,
    );
  }

  if (command.attempt_count >= command.max_attempts) {
    await supabase
      .from("lock_sync_commands")
      .update({
        status:        "failed",
        error_message: "max_attempts exceeded",
        completed_at:  new Date().toISOString(),
      })
      .eq("id", command_id);

    return err("MAX_ATTEMPTS_EXCEEDED", "El comando ha superado el máximo de intentos.", 410);
  }

  // ── 2. Verificar shard ───────────────────────────────────────────────────────
  const { data: pool } = await supabase
    .from("lock_provider_pools")
    .select("id, status, is_blocked, ttlock_email, provider_client_id, vault_key_ref")
    .eq("id", command.pool_id)
    .maybeSingle();

  if (!pool || pool.is_blocked || pool.status !== "active") {
    return err(
      "SHARD_BLOCKED",
      "El shard está bloqueado o inactivo. Comando no ejecutado.",
      503,
    );
  }

  // ── 3. Obtener lock ──────────────────────────────────────────────────────────
  const { data: lock } = await supabase
    .from("locks")
    .select("id, provider_lock_id, status")
    .eq("id", command.lock_id)
    .maybeSingle();

  if (!lock || !lock.provider_lock_id) {
    await markFailed(supabase, command_id, command.attempt_count, "Lock no encontrada o sin provider_lock_id");
    return ok({ command_id, status: "failed", error: "Lock not found or missing provider_lock_id" });
  }

  // ── 4. Obtener access_token del shard ────────────────────────────────────────
  let accessToken: string;
  let clientId: string;

  try {
    ({ accessToken, clientId } = await getShardToken(supabase, pool));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    await markFailed(supabase, command_id, command.attempt_count, `Token error: ${msg}`);
    return ok({ command_id, status: "failed", error: msg });
  }

  // ── 5. Marcar como 'executing' ────────────────────────────────────────────────
  await supabase
    .from("lock_sync_commands")
    .update({
      status:       "executing",
      executed_at:  new Date().toISOString(),
      attempt_count: command.attempt_count + 1,
    })
    .eq("id", command_id);

  // ── 6. Ejecutar el comando ────────────────────────────────────────────────────
  const apiBase = pool.ttlock_email?.includes("eu") ? "https://euapi.ttlock.com" : "https://api.sciener.com";
  // deno-lint-ignore no-explicit-any
  const payload = command.command_payload as Record<string, any>;

  let result: Record<string, unknown> = {};
  let execError: string | null = null;

  try {
    switch (command.command_type) {
      case "create_pin":
        result = await executeCreatePin(accessToken, clientId, lock.provider_lock_id, payload, apiBase);
        // Actualizar la credencial con el keyboardPwdId devuelto por TTLock
        if (result.keyboardPwdId && payload.credential_id) {
          await supabase
            .from("lock_credentials")
            .update({
              provider_credential_id: String(result.keyboardPwdId),
              provider_sync_status:   "synced",
            })
            .eq("id", payload.credential_id);
        }
        break;

      case "revoke_pin":
        result = await executeRevokePin(accessToken, clientId, lock.provider_lock_id, payload, apiBase);
        // Marcar credencial como sincronizada
        if (payload.credential_id) {
          await supabase
            .from("lock_credentials")
            .update({ provider_sync_status: "synced" })
            .eq("id", payload.credential_id);
        }
        break;

      case "remote_unlock":
        result = await executeRemoteUnlock(accessToken, clientId, lock.provider_lock_id, apiBase);
        // Registrar el evento en lock_records
        await supabase.from("lock_records").insert({
          lock_id:           command.lock_id,
          lock_integration_id: null,
          event_type:        "remote_unlock",
          event_at:          new Date().toISOString(),
          actor_description: payload.actor_email ?? "system",
          provider_record_id: `unlock_${Date.now()}`,
          raw_data:          result,
        }).catch(() => {}); // no fatal
        break;

      case "sync_lock": {
        result = await executeSyncLock(accessToken, clientId, lock.provider_lock_id, apiBase);
        // Actualizar campos de estado de la lock
        const updates: Record<string, unknown> = { synced_at: new Date().toISOString() };
        if (result.electricQuantity !== undefined) updates.battery_level = result.electricQuantity;
        if (result.isOnline !== undefined) updates.is_online = result.isOnline;
        await supabase.from("locks").update(updates).eq("id", command.lock_id);
        break;
      }

      case "sync_records":
        // sync_records de una sola lock es costoso; se delega al EF sal-sync-lock-records.
        // Aquí solo marcamos como completado para que n8n lo limpie de la cola.
        result = { note: "sync_records handled by sal-sync-lock-records EF" };
        break;

      default:
        execError = `Tipo de comando no soportado: ${command.command_type}`;
    }
  } catch (e: unknown) {
    execError = e instanceof Error ? e.message : String(e);
  }

  // ── 7. Actualizar estado del comando ──────────────────────────────────────────
  const now = new Date().toISOString();

  if (execError) {
    const willRetry = (command.attempt_count + 1) < command.max_attempts;
    await supabase
      .from("lock_sync_commands")
      .update({
        status:        willRetry ? "pending" : "failed",
        error_message: execError,
        completed_at:  willRetry ? null : now,
      })
      .eq("id", command_id);

    console.warn(
      `[sal-execute-command] ✗ cmd=${command_id} type=${command.command_type} ` +
      `attempt=${command.attempt_count + 1}/${command.max_attempts} error=${execError}`,
    );

    return ok({ command_id, status: "failed", error: execError });
  }

  await supabase
    .from("lock_sync_commands")
    .update({
      status:         "completed",
      completed_at:   now,
      result_payload: result,
    })
    .eq("id", command_id);

  console.log(
    `[sal-execute-command] ✓ cmd=${command_id} type=${command.command_type} ` +
    `lock=${command.lock_id} attempt=${command.attempt_count + 1}`,
  );

  return ok({ command_id, status: "completed", result });
}

// ── Helper: marcar como failed ────────────────────────────────────────────────
async function markFailed(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  commandId: string,
  currentAttempts: number,
  reason: string,
): Promise<void> {
  await supabase
    .from("lock_sync_commands")
    .update({
      status:        "failed",
      error_message: reason,
      attempt_count: currentAttempts + 1,
      completed_at:  new Date().toISOString(),
    })
    .eq("id", commandId);
}

// ── Helper: obtener/renovar access_token del shard ────────────────────────────
async function getShardToken(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  pool: {
    id:                 string;
    vault_key_ref:      string;
    provider_client_id: string;
    ttlock_email:       string;
  },
): Promise<{ accessToken: string; clientId: string }> {
  const secret = await readVaultSecret(supabase, pool.vault_key_ref);
  const clientId = pool.provider_client_id;

  // Usar token cacheado si aún es válido
  if (secret.access_token && secret.token_expires_at && isTokenFresh({
    accessToken:    secret.access_token,
    refreshToken:   secret.refresh_token,
    tokenExpiresAt: secret.token_expires_at,
  })) {
    return { accessToken: secret.access_token, clientId };
  }

  // Renovar token
  const apiBase = pool.ttlock_email?.includes("eu") ? "https://euapi.ttlock.com" : "https://api.sciener.com";
  const token = await getTTLockToken({
    clientId,
    clientSecret: secret.client_secret,
    username:     pool.ttlock_email,
    passwordMd5:  secret.password_md5,
  }, apiBase);

  const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();
  await saveVaultSecret(
    supabase,
    { ...secret, access_token: token.access_token, refresh_token: token.refresh_token, token_expires_at: expiresAt },
    pool.vault_key_ref,
  );

  return { accessToken: token.access_token, clientId };
}

// ── TTLock API helpers ────────────────────────────────────────────────────────

async function ttlockPost(
  path:        string,
  params:      Record<string, string | number>,
  accessToken: string,
  clientId:    string,
  apiBase:     string,
): Promise<Record<string, unknown>> {
  const body = new URLSearchParams({
    clientId,
    accessToken,
    date: String(Date.now()),
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });

  const res = await fetch(`${apiBase}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  });

  const data = await res.json() as Record<string, unknown>;
  if (data.errcode !== undefined && data.errcode !== 0) {
    throw new Error(`TTLock error [errcode=${data.errcode}]: ${data.errmsg ?? JSON.stringify(data)}`);
  }
  return data;
}

async function ttlockGet(
  path:        string,
  params:      Record<string, string | number>,
  accessToken: string,
  clientId:    string,
  apiBase:     string,
): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams({
    clientId,
    accessToken,
    date: String(Date.now()),
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });

  const res = await fetch(`${apiBase}${path}?${qs.toString()}`);
  const data = await res.json() as Record<string, unknown>;
  if (data.errcode !== undefined && data.errcode !== 0) {
    throw new Error(`TTLock error [errcode=${data.errcode}]: ${data.errmsg ?? JSON.stringify(data)}`);
  }
  return data;
}

// deno-lint-ignore no-explicit-any
async function executeCreatePin(
  accessToken: string,
  clientId:    string,
  providerLockId: string,
  payload:     Record<string, any>,
  apiBase:     string,
): Promise<Record<string, unknown>> {
  if (!payload.keyboardPwd || !payload.keyboardPwdName) {
    throw new Error("create_pin requires keyboardPwd and keyboardPwdName in payload");
  }

  const params: Record<string, string | number> = {
    lockId:          providerLockId,
    keyboardPwd:     payload.keyboardPwd,
    keyboardPwdName: payload.keyboardPwdName,
    addType:         payload.addType ?? 2, // 2=custom, 3=timed
  };

  if (payload.startDate) params.startDate = payload.startDate;
  if (payload.endDate)   params.endDate   = payload.endDate;

  return await ttlockPost("/v3/keyboardPwd/add", params, accessToken, clientId, apiBase);
}

// deno-lint-ignore no-explicit-any
async function executeRevokePin(
  accessToken: string,
  clientId:    string,
  providerLockId: string,
  payload:     Record<string, any>,
  apiBase:     string,
): Promise<Record<string, unknown>> {
  if (!payload.keyboardPwdId) {
    throw new Error("revoke_pin requires keyboardPwdId in payload");
  }

  return await ttlockPost("/v3/keyboardPwd/delete", {
    lockId:       providerLockId,
    keyboardPwdId: payload.keyboardPwdId,
    deleteType:   payload.deleteType ?? 2, // 2=cloud only (gateway may be offline)
  }, accessToken, clientId, apiBase);
}

async function executeRemoteUnlock(
  accessToken: string,
  clientId:    string,
  providerLockId: string,
  apiBase:     string,
): Promise<Record<string, unknown>> {
  return await ttlockPost("/v3/lock/unlock", {
    lockId: providerLockId,
  }, accessToken, clientId, apiBase);
}

async function executeSyncLock(
  accessToken: string,
  clientId:    string,
  providerLockId: string,
  apiBase:     string,
): Promise<Record<string, unknown>> {
  return await ttlockGet("/v3/lock/detail", {
    lockId: providerLockId,
  }, accessToken, clientId, apiBase);
}
