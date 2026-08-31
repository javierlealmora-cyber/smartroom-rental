/**
 * sal-enqueue-command — Shard Pool v4
 *
 * Añade un comando a la cola lock_sync_commands para ejecución asíncrona.
 * Llamada por:
 *  - EFs internas (sal-grant-access, sal-revoke-access, sal-remote-unlock)
 *    cuando TTLock no está disponible y se necesita reintentar más tarde.
 *  - n8n para encolar operaciones programadas.
 *
 * Idempotencia via dedupe_key:
 *   Si hay un comando con el mismo dedupe_key en estado 'pending',
 *   devuelve el existente sin crear uno nuevo.
 *
 * POST body:
 *   { lock_id, pool_id, command_type, command_payload,
 *     priority?, dedupe_key?, scheduled_for? }
 *
 * Respuesta:
 *   { command_id, status: 'pending', dedupe_hit?: true }
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { createServiceClient, detectAutomationCaller, resolveSalContext } from "../_shared/sal-helpers.ts";

const VALID_COMMAND_TYPES = [
  "create_pin",
  "revoke_pin",
  "remote_unlock",
  "sync_lock",
  "sync_records",
] as const;

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (e: unknown) {
    const msg   = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? (e.stack ?? "") : "";
    console.error(`[sal-enqueue-command] UNCAUGHT ERROR: ${msg}\n${stack}`);
    return err("UNCAUGHT_EXCEPTION", msg, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  let body: {
    lock_id:          string;
    pool_id:          string;
    command_type:     string;
    command_payload:  Record<string, unknown>;
    priority?:        1 | 2 | 3;
    dedupe_key?:      string;
    scheduled_for?:   string;
    // Para contexto opcional — no requerido cuando lo llaman EFs internas
    client_account_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { lock_id, pool_id, command_type, command_payload } = body;
  if (!lock_id || !pool_id || !command_type || !command_payload) {
    return err(
      ERROR_CODES.VALIDATION,
      "Missing required fields: lock_id, pool_id, command_type, command_payload",
      400,
    );
  }

  if (!VALID_COMMAND_TYPES.includes(command_type as typeof VALID_COMMAND_TYPES[number])) {
    return err(
      ERROR_CODES.VALIDATION,
      `Invalid command_type. Must be one of: ${VALID_COMMAND_TYPES.join(", ")}`,
      400,
    );
  }

  const priority = body.priority ?? 2;
  if (![1, 2, 3].includes(priority)) {
    return err(ERROR_CODES.VALIDATION, "priority must be 1, 2 or 3", 400);
  }

  // Autenticación: soporta service_role (EFs internas / n8n) y JWT de usuario
  const isAutomation = detectAutomationCaller(req);
  const supabase = createServiceClient();

  if (!isAutomation) {
    // Llamada de usuario: requiere client_account_id para validar permisos
    if (!body.client_account_id) {
      return err(
        ERROR_CODES.VALIDATION,
        "client_account_id is required for non-automation callers",
        400,
      );
    }
    const ctx = await resolveSalContext(req, body.client_account_id, ["admin", "superadmin"]);
    if (ctx instanceof Response) return ctx;
  }

  // ── 1. Verificar que el shard no está bloqueado ──────────────────────────────
  const { data: pool } = await supabase
    .from("lock_provider_pools")
    .select("id, status, is_blocked")
    .eq("id", pool_id)
    .maybeSingle();

  if (!pool) {
    return err(ERROR_CODES.NOT_FOUND, "Shard no encontrado.", 404);
  }

  if (pool.is_blocked || pool.status !== "active") {
    return err(
      "SHARD_BLOCKED",
      "El shard está bloqueado o inactivo. No se pueden encolar nuevos comandos.",
      503,
    );
  }

  // ── 2. Verificar que la lock existe y pertenece al pool ──────────────────────
  const { data: lock } = await supabase
    .from("locks")
    .select("id, status, pool_id, client_account_id")
    .eq("id", lock_id)
    .maybeSingle();

  if (!lock) {
    return err(ERROR_CODES.NOT_FOUND, "Cerradura no encontrada.", 404);
  }

  if (lock.pool_id && lock.pool_id !== pool_id) {
    return err(
      ERROR_CODES.VALIDATION,
      "La cerradura no pertenece al shard indicado.",
      422,
    );
  }

  // ── 3. Deduplicación via dedupe_key ──────────────────────────────────────────
  if (body.dedupe_key) {
    const { data: existing } = await supabase
      .from("lock_sync_commands")
      .select("id, status")
      .eq("dedupe_key", body.dedupe_key)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      console.log(
        `[sal-enqueue-command] dedupe hit key=${body.dedupe_key} existing_cmd=${existing.id}`,
      );
      return ok({
        command_id: existing.id,
        status:     "pending",
        dedupe_hit: true,
      });
    }
  }

  // ── 4. Insertar el comando en la cola ────────────────────────────────────────
  const insertData: Record<string, unknown> = {
    lock_id,
    pool_id,
    client_account_id: lock.client_account_id ?? null,
    command_type,
    command_payload,
    status:        "pending",
    priority,
    attempt_count: 0,
    max_attempts:  5,
    created_at:    new Date().toISOString(),
  };

  if (body.dedupe_key)    insertData.dedupe_key    = body.dedupe_key;
  if (body.scheduled_for) insertData.scheduled_for = body.scheduled_for;

  const { data: command, error: insertErr } = await supabase
    .from("lock_sync_commands")
    .insert(insertData)
    .select("id, status")
    .single();

  if (insertErr || !command) {
    return err(
      ERROR_CODES.INTERNAL,
      `No se pudo encolar el comando: ${insertErr?.message ?? "unknown"}`,
      500,
    );
  }

  console.log(
    `[sal-enqueue-command] ✓ cmd=${command.id} type=${command_type} lock=${lock_id} priority=${priority}`,
  );

  return ok({
    command_id: command.id,
    status:     "pending",
  });
}
