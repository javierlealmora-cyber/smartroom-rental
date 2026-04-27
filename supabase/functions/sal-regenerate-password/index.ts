/**
 * sal-regenerate-password
 *
 * Regenera la contraseña TTLock de la cuenta gestionada de un client_account.
 * Útil cuando el admin ha perdido la password mostrada al conectar.
 *
 * Flujo:
 *   1. Carga la integración TTLock existente.
 *   2. Genera nueva password aleatoria 24 chars.
 *   3. Llama a /v3/user/resetPassword (clientId + clientSecret + username + newPasswordMd5).
 *   4. Re-autentica con /oauth2/token para obtener nuevos tokens.
 *   5. Actualiza el Vault con los nuevos secretos.
 *   6. Devuelve la nueva password EN CLARO (se muestra UNA sola vez).
 *
 * POST body:
 * {
 *   client_account_id: string   (UUID)
 * }
 *
 * Env vars: TTLOCK_CLIENT_ID, TTLOCK_CLIENT_SECRET (iguales que sal-connect-integration)
 *
 * Respuesta:
 *   { ok: true, data: {
 *       managed_username: string,
 *       managed_password: string,   // EN CLARO — se muestra UNA sola vez
 *   }}
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import { resolveSalContext, assertSalSubscriptionActive } from "../_shared/sal-helpers.ts";
import { readVaultSecret, saveVaultSecret } from "../_shared/sal-vault.ts";
import { computeMd5, getTTLockToken, resetTTLockUserPassword, resolveTTLockBase } from "../_shared/sal-ttlock-client.ts";

Deno.serve(async (req: Request) => {
  try {
    return await handleRequest(req);
  } catch (e: unknown) {
    const msg   = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? (e.stack ?? "") : "";
    console.error(`[sal-regenerate-password] UNCAUGHT ERROR: ${msg}\n${stack}`);
    return err("UNCAUGHT_EXCEPTION", msg, 200, {
      stack: stack.split("\n").slice(0, 5).join(" | "),
    });
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
    return err(ERROR_CODES.VALIDATION, "Missing client_account_id", 400);
  }

  // ── Leer secretos globales ────────────────────────────────────────────────────
  const clientId     = Deno.env.get("TTLOCK_CLIENT_ID");
  const clientSecret = Deno.env.get("TTLOCK_CLIENT_SECRET");
  const platformRaw  = Deno.env.get("TTLOCK_PLATFORM") ?? "intl";
  if (!clientId || !clientSecret) {
    return err("SERVER_MISCONFIGURED", "La integración TTLock no está configurada en SmartRoom.", 500);
  }
  const apiBase = resolveTTLockBase(platformRaw === "eu" ? "eu" : undefined);

  // ── Contexto admin ────────────────────────────────────────────────────────────
  const ctx = await resolveSalContext(req, client_account_id, ["admin", "superadmin"]);
  if (ctx instanceof Response) return ctx;
  const { supabase } = ctx;

  const subErr = await assertSalSubscriptionActive(supabase, client_account_id);
  if (subErr) return subErr;

  // ── Cargar integración existente ──────────────────────────────────────────────
  const { data: integration, error: loadErr } = await supabase
    .from("lock_integrations")
    .select("id, provider_account_id, provider_credentials, status")
    .eq("client_account_id", client_account_id)
    .eq("provider", "ttlock")
    .maybeSingle();

  if (loadErr) return err(ERROR_CODES.INTERNAL, `Load integration failed: ${loadErr.message}`, 500);
  if (!integration) return err(ERROR_CODES.NOT_FOUND, "No hay integración TTLock para este client_account", 404);
  if (integration.status !== "connected") {
    return err("INTEGRATION_NOT_CONNECTED", `La integración está en estado '${integration.status}', no se puede regenerar`, 409);
  }

  const managedUsername = integration.provider_account_id;
  const vaultRef = (integration.provider_credentials as { vault_key_ref?: string } | null)?.vault_key_ref;
  if (!managedUsername || !vaultRef) {
    return err(ERROR_CODES.INTERNAL, "Integración corrupta: falta username o vault_key_ref", 500);
  }

  // ── Generar nueva password aleatoria (12 chars alfanuméricos legibles) ────────
  // Alfabeto sin caracteres ambiguos (0/O, 1/l/I). Entropía ~71 bits.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const passwordBytes = new Uint8Array(12);
  crypto.getRandomValues(passwordBytes);
  const newPassword = Array.from(passwordBytes, (b) => alphabet[b % alphabet.length]).join("");
  const newPasswordMd5 = computeMd5(newPassword);

  console.log(`[sal-regenerate-password] Reset password username=${managedUsername}`);

  // ── 1) Llamar a TTLock /v3/user/resetPassword ────────────────────────────────
  try {
    await resetTTLockUserPassword(clientId, clientSecret, managedUsername, newPasswordMd5, apiBase);
    console.log(`[sal-regenerate-password] ✓ Password reseteada en TTLock`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error(`[sal-regenerate-password] ✗ Reset fallo: ${msg}`);
    return err("TTLOCK_RESET_FAILED", msg, 422);
  }

  // ── 2) Re-autenticar con la nueva password ────────────────────────────────────
  let token: { access_token: string; refresh_token: string; expires_in: number };
  try {
    token = await getTTLockToken({
      clientId,
      clientSecret,
      username:    managedUsername,
      passwordMd5: newPasswordMd5,
    }, apiBase);
    console.log(`[sal-regenerate-password] ✓ Token renovado`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err("TTLOCK_AUTH_AFTER_RESET_FAILED", msg, 422, { managed_username: managedUsername });
  }

  // ── 3) Actualizar Vault con los nuevos secretos ──────────────────────────────
  const tokenExpiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

  // Leer el Vault actual para preservar campos que no cambian
  let currentVault;
  try {
    currentVault = await readVaultSecret(supabase, vaultRef);
  } catch {
    currentVault = { client_secret: "", api_base: apiBase };
  }

  await saveVaultSecret(
    supabase,
    {
      client_secret:    currentVault.client_secret ?? "",
      password_md5:     newPasswordMd5,
      access_token:     token.access_token,
      refresh_token:    token.refresh_token,
      token_expires_at: tokenExpiresAt,
      api_base:         apiBase,
      managed_username: managedUsername,
    },
    vaultRef, // actualizar vault existente en lugar de crear uno nuevo
  );

  await supabase
    .from("lock_integrations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", integration.id);

  // Audit (no fatal)
  try {
    await supabase.from("audit_log").insert({
      actor_user_id:    ctx.actorUserId,
      actor_role:       ctx.actorRole,
      client_account_id,
      action:           "sal_regenerate_password",
      entity_type:      "lock_integrations",
      entity_id:        integration.id,
      detail:           { managed_username: managedUsername },
    });
  } catch { /* audit failures are non-fatal */ }

  return ok({
    managed_username: managedUsername,
    managed_password: newPassword,
    message: "Contraseña regenerada correctamente. Actualízala en tu app móvil TTLock.",
  });
}
