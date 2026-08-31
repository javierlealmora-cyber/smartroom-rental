/**
 * sal-get-ble-session — Shard Pool v4
 *
 * Devuelve el access_token del shard TTLock asignado al cliente para
 * operaciones BLE desde la app móvil (pairing de locks y gateways).
 *
 * ⚠️ ESCENARIO B PROVISIONAL (pre-ST-02):
 * El ble_token ES el access_token completo del shard. No tiene scopes reducidos.
 * TTL=2h es una restricción comunicada al cliente — el token real de TTLock dura
 * 90 días. La app solo debe usarlo para operaciones de pairing. Si ST-02 confirma
 * que TTLock soporta scopes reducidos, este EF necesitará rediseño.
 *
 * POST body: { client_account_id: string }
 *
 * Respuesta exitosa:
 *   { ble_token, expires_at, shard_info: { pool_id, ttlock_username } }
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { resolveSalContext, assertSalSubscriptionActive } from "../_shared/sal-helpers.ts";
import { readVaultSecret, saveVaultSecret } from "../_shared/sal-vault.ts";
import {
  getTTLockToken,
  isTokenFresh,
  resolveTTLockBase,
  type CachedToken,
} from "../_shared/sal-ttlock-client.ts";

// Invariante 11: ble_session_token no puede tener TTL superior a 4h.
// En práctica usamos 2h para reducir la ventana de exposición.
const BLE_SESSION_TTL_MS = 2 * 60 * 60 * 1000;

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (e: unknown) {
    const msg   = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? (e.stack ?? "") : "";
    console.error(`[sal-get-ble-session] UNCAUGHT ERROR: ${msg}\n${stack}`);
    return err("UNCAUGHT_EXCEPTION", msg, 500);
  }
});

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  let body: { client_account_id: string };
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { client_account_id } = body;
  if (!client_account_id) {
    return err(ERROR_CODES.VALIDATION, "Missing required field: client_account_id", 400);
  }

  const ctx = await resolveSalContext(req, client_account_id, ["admin", "superadmin"]);
  if (ctx instanceof Response) return ctx;
  const { supabase } = ctx;

  const subErr = await assertSalSubscriptionActive(supabase, client_account_id);
  if (subErr) return subErr;

  // ── 1. Leer shard asignado ────────────────────────────────────────────────────
  const { data: assignment } = await supabase
    .from("lock_provider_pool_assignments")
    .select("id, pool_id, status")
    .eq("client_account_id", client_account_id)
    .eq("provider", "ttlock")
    .eq("status", "active")
    .maybeSingle();

  if (!assignment) {
    return err("SHARD_NOT_ASSIGNED", "No hay shard asignado a este cliente. Contacta con soporte.", 503);
  }

  // ── 2. Verificar que el shard está operativo ──────────────────────────────────
  const { data: pool } = await supabase
    .from("lock_provider_pools")
    .select("id, shard_code, status, is_blocked, ttlock_email, vault_key_ref, region")
    .eq("id", assignment.pool_id)
    .single();

  if (!pool) {
    return err("SHARD_NOT_FOUND", "El shard asignado no existe. Contacta con soporte.", 503);
  }

  if (pool.is_blocked) {
    return err("SHARD_BLOCKED", "El shard está temporalmente bloqueado. Contacta con soporte.", 503);
  }

  if (pool.status === "compromised" || pool.status === "retired") {
    return err("SHARD_UNAVAILABLE", `El shard está en estado ${pool.status}. Contacta con soporte.`, 503);
  }

  // ── 3. Verificar que el Vault está configurado ────────────────────────────────
  if (!pool.vault_key_ref) {
    // El seed de desarrollo deja vault_key_ref=NULL hasta que se configuren
    // credenciales TTLock reales en el shard.
    return err(
      "SHARD_UNAVAILABLE",
      "El shard no tiene credenciales configuradas. Contacta con el equipo técnico.",
      503,
    );
  }

  // ── 4. Leer token del Vault y refrescar si está caducado ─────────────────────
  let vaultPayload = await readVaultSecret(supabase, pool.vault_key_ref);

  const cached: CachedToken = {
    accessToken:    vaultPayload.access_token,
    refreshToken:   vaultPayload.refresh_token,
    tokenExpiresAt: vaultPayload.token_expires_at,
  };

  let tokenToReturn = cached.accessToken;

  if (!tokenToReturn || !isTokenFresh(cached)) {
    const clientId     = Deno.env.get("TTLOCK_CLIENT_ID") ?? "";
    const clientSecret = Deno.env.get("TTLOCK_CLIENT_SECRET") ?? "";

    if (!clientId || !clientSecret) {
      return err(
        ERROR_CODES.INTERNAL,
        "TTLOCK_CLIENT_ID / TTLOCK_CLIENT_SECRET no configurados en las variables de entorno.",
        500,
      );
    }

    try {
      const apiBase    = resolveTTLockBase(pool.region ?? undefined);
      const freshToken = await getTTLockToken(
        {
          clientId,
          clientSecret,
          username:    vaultPayload.managed_username ?? pool.ttlock_email,
          passwordMd5: vaultPayload.password_md5,
        },
        apiBase,
      );

      const tokenExpiresAt = new Date(
        Date.now() + freshToken.expires_in * 1000,
      ).toISOString();

      vaultPayload = {
        ...vaultPayload,
        access_token:     freshToken.access_token,
        refresh_token:    freshToken.refresh_token,
        token_expires_at: tokenExpiresAt,
      };

      await saveVaultSecret(supabase, vaultPayload, pool.vault_key_ref);
      tokenToReturn = freshToken.access_token;

      console.log(`[sal-get-ble-session] token refrescado shard=${pool.shard_code}`);
    } catch (tokenErr: unknown) {
      const msg = tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
      console.error(`[sal-get-ble-session] token refresh failed: ${msg}`);
      return err(
        "SHARD_AUTH_FAILED",
        "No se pudo obtener token del proveedor. Contacta con soporte.",
        503,
      );
    }
  }

  // ── 5. Calcular expiración BLE (TTL=2h — invariante 11) ──────────────────────
  const bleExpiresAt = new Date(Date.now() + BLE_SESSION_TTL_MS).toISOString();

  console.log(
    `[sal-get-ble-session] ✓ client=${client_account_id} shard=${pool.shard_code} expires=${bleExpiresAt}`,
  );

  return ok({
    ble_token:  tokenToReturn,
    expires_at: bleExpiresAt,
    shard_info: {
      pool_id:         pool.id,
      ttlock_username: vaultPayload.managed_username ?? pool.ttlock_email,
    },
  });
}
