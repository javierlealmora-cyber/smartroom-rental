/**
 * sal-provision-shard — Aprovisiona un shard TTLock nuevo (superadmin only).
 *
 * Flujo (rules-40-ttlock-cloud-provider.md §4.1):
 *   1. Registra o reutiliza un usuario TTLock gestionado (`registerTTLockUser`).
 *   2. Ejecuta OAuth password grant contra TTLock para obtener access_token.
 *   3. Guarda credenciales en Vault (client_secret, password_md5, tokens).
 *   4. Inserta fila en lock_provider_pools apuntando al vault_key_ref.
 *
 * Solo un superadmin puede invocarlo (validado por `resolveSalContext`).
 *
 * POST body:
 *   {
 *     shard_code:  string,      // p.ej. "srr-shard-01" (único)
 *     username:    string,      // base del username (solo alfanumérico, sin @)
 *     password:    string,      // password en claro; se convierte a MD5 y se guarda
 *     region?:     "intl" | "eu",   // default "intl"
 *     max_locks?:  number,      // default 500
 *     max_clients?:number,      // default 50
 *     reuse_user?: boolean,     // si true, salta el register user y hace login directo
 *     notes?:      string,
 *   }
 *
 * Respuesta OK:
 *   { pool_id, shard_code, ttlock_email, managed_username, token_expires_at }
 *
 * Errores:
 *   VALIDATION: campos faltantes o inválidos
 *   FORBIDDEN:  no superadmin
 *   CONFLICT:   shard_code ya existe
 *   INTERNAL:   fallo TTLock / Vault
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { resolveSalContext } from "../_shared/sal-helpers.ts";
import {
  computeMd5,
  getTTLockToken,
  registerTTLockUser,
  resolveTTLockBase,
} from "../_shared/sal-ttlock-client.ts";
import { saveVaultSecret } from "../_shared/sal-vault.ts";

interface Body {
  shard_code:   string;
  username:     string;
  password:     string;
  region?:      "intl" | "eu";
  max_locks?:   number;
  max_clients?: number;
  reuse_user?:  boolean;
  notes?:       string;
}

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (e: unknown) {
    const msg   = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? (e.stack ?? "") : "";
    console.error(`[sal-provision-shard] UNCAUGHT ERROR: ${msg}\n${stack}`);
    return err("UNCAUGHT_EXCEPTION", msg, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { shard_code, username, password, region, max_locks, max_clients, reuse_user, notes } = body;
  if (!shard_code || !username || !password) {
    return err(ERROR_CODES.VALIDATION, "Faltan campos: shard_code, username, password", 400);
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return err(ERROR_CODES.VALIDATION, "username sólo puede contener [a-zA-Z0-9_]", 400);
  }

  // Solo superadmin — validamos con un client_account_id ficticio: le pasamos
  // uno de los existentes solo para pasar el `resolveSalContext` (que exige
  // client_account_id). Al ser superadmin no se verifica el matching de tenant.
  //
  // Para no depender de un UUID concreto, aceptamos un client_account_id
  // ficticio en el body también:
  const superadminClientAccountId = "00000000-0000-0000-0000-000000000000";
  const ctx = await resolveSalContext(req, superadminClientAccountId, ["superadmin"]);
  if (ctx instanceof Response) return ctx;
  const { supabase, actorUserId } = ctx;

  const clientId     = Deno.env.get("TTLOCK_CLIENT_ID") ?? "";
  const clientSecret = Deno.env.get("TTLOCK_CLIENT_SECRET") ?? "";
  if (!clientId || !clientSecret) {
    return err(ERROR_CODES.INTERNAL, "TTLOCK_CLIENT_ID / TTLOCK_CLIENT_SECRET no configurados en Supabase secrets", 500);
  }

  // Comprobación de unicidad del shard_code
  const { data: existing } = await supabase
    .from("lock_provider_pools")
    .select("id")
    .eq("shard_code", shard_code)
    .maybeSingle();
  if (existing) {
    return err(ERROR_CODES.CONFLICT, `El shard_code "${shard_code}" ya existe`, 409);
  }

  const passwordMd5 = computeMd5(password);
  const apiBase     = resolveTTLockBase(region === "eu" ? "eu" : "intl");

  // Paso 1: registrar el usuario gestionado (o reutilizar si ya existe)
  let managedUsername: string;
  if (reuse_user === true) {
    // Añadir prefijo del clientId — TTLock devuelve el username final con
    // formato "<clientId>_<username>". El caller nos pasó ya el username base.
    managedUsername = `${clientId}_${username}`;
  } else {
    try {
      managedUsername = await registerTTLockUser(clientId, clientSecret, username, passwordMd5, apiBase);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return err(ERROR_CODES.INTERNAL, `Error registrando usuario TTLock: ${msg}`, 500);
    }
  }

  // Paso 2: obtener token OAuth
  let token: { access_token: string; refresh_token: string; expires_in: number };
  try {
    token = await getTTLockToken(
      { clientId, clientSecret, username: managedUsername, passwordMd5 },
      apiBase,
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(ERROR_CODES.INTERNAL, `Error autenticando en TTLock: ${msg}`, 500);
  }

  const tokenExpiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

  // Paso 3: guardar en Vault
  let vaultKeyRef: string;
  try {
    vaultKeyRef = await saveVaultSecret(
      supabase,
      {
        client_secret:    clientSecret,
        password_md5:     passwordMd5,
        access_token:     token.access_token,
        refresh_token:    token.refresh_token,
        token_expires_at: tokenExpiresAt,
        api_base:         apiBase,
        managed_username: managedUsername,
      },
      null,
      `sal_shard_${shard_code}`,
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(ERROR_CODES.INTERNAL, `Error guardando en Vault: ${msg}`, 500);
  }

  // Paso 4: insertar en lock_provider_pools
  const { data: pool, error: insertErr } = await supabase
    .from("lock_provider_pools")
    .insert({
      shard_code,
      provider:              "ttlock",
      ttlock_email:          managedUsername, // TTLock no usa email real; usamos el username gestionado
      provider_client_id:    clientId,
      vault_key_ref:         vaultKeyRef,
      status:                "active",
      region:                region === "eu" ? "eu" : "intl",
      max_locks:             max_locks   ?? 500,
      max_clients:           max_clients ?? 50,
      notes:                 notes ?? null,
      last_token_refresh_at: new Date().toISOString(),
    })
    .select("id, shard_code, ttlock_email, region, max_locks, max_clients")
    .single();

  if (insertErr || !pool) {
    return err(ERROR_CODES.INTERNAL, `Error insertando shard en BBDD: ${insertErr?.message}`, 500);
  }

  // Auditoría (non-fatal)
  try {
    await supabase.from("audit_log").insert({
      actor_user_id: actorUserId,
      actor_role:    "superadmin",
      action:        "sal_provision_shard",
      entity_type:   "lock_provider_pools",
      entity_id:     pool.id,
      detail:        { shard_code, managed_username: managedUsername, region: pool.region },
    });
  } catch { /* non-fatal */ }

  return ok({
    pool_id:           pool.id,
    shard_code:        pool.shard_code,
    ttlock_email:      pool.ttlock_email,
    managed_username:  managedUsername,
    region:            pool.region,
    token_expires_at:  tokenExpiresAt,
  });
}
