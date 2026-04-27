/**
 * sal-sync-lock-records
 *
 * Sincroniza registros de eventos de acceso desde TTLock a `lock_records`.
 * Idempotente: usa ON CONFLICT DO NOTHING sobre (lock_id, provider_record_id).
 *
 * Llamado por:
 *   - Frontend (admin): botón "Sincronizar registros"
 *   - n8n WF-03: cada 5 minutos, delta desde last_sync_at
 *
 * POST body:
 * {
 *   client_account_id: string
 *   since?:            string   ISO8601 — si omitido, usa lock_integrations.last_sync_at o 24h atrás
 * }
 *
 * Respuesta:
 *   { records_synced: number, locks_processed: number, errors: string[] }
 */

import { err, ok, optionsResponse, ERROR_CODES } from "../_shared/response.ts";
import {
  resolveSalContext,
  assertSalSubscriptionActive,
  getLockIntegration,
} from "../_shared/sal-helpers.ts";
import { readVaultSecret } from "../_shared/sal-vault.ts";
import { saveVaultSecret } from "../_shared/sal-vault.ts";
import {
  getTTLockToken,
  isTokenFresh,
  fetchLockRecords,
  mapRecordType,
  CachedToken,
} from "../_shared/sal-ttlock-client.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return err(ERROR_CODES.VALIDATION, "Method not allowed", 405);

  let body: { client_account_id: string; since?: string };
  try {
    body = await req.json();
  } catch {
    return err(ERROR_CODES.VALIDATION, "Invalid JSON body", 400);
  }

  const { client_account_id, since } = body;
  if (!client_account_id) {
    return err(ERROR_CODES.VALIDATION, "client_account_id is required", 400);
  }

  const ctx = await resolveSalContext(req, client_account_id, ["admin", "superadmin"]);
  if (ctx instanceof Response) return ctx;
  const { supabase } = ctx;

  const subErr = await assertSalSubscriptionActive(supabase, client_account_id);
  if (subErr) return subErr;

  const integration = await getLockIntegration(supabase, client_account_id);
  if (!integration || !integration.provider_credentials?.vault_key_ref) {
    return err("INTEGRATION_NOT_CONFIGURED", "TTLock integration not configured", 422);
  }

  let secrets;
  try {
    secrets = await readVaultSecret(supabase, integration.provider_credentials.vault_key_ref);
  } catch (e: unknown) {
    return err("VAULT_READ_FAILED", e instanceof Error ? e.message : "Vault read failed", 500);
  }

  // Obtener token válido
  let accessToken = secrets.access_token;
  if (!isTokenFresh({ accessToken, refreshToken: secrets.refresh_token, tokenExpiresAt: secrets.token_expires_at })) {
    try {
      const newToken = await getTTLockToken({
        clientId:     integration.provider_client_id!,
        clientSecret: secrets.client_secret,
        username:     integration.provider_account_id!,
        passwordMd5:  secrets.password_md5,
      });
      accessToken = newToken.access_token;
      await saveVaultSecret(
        supabase,
        {
          ...secrets,
          access_token:     newToken.access_token,
          refresh_token:    newToken.refresh_token,
          token_expires_at: new Date(Date.now() + newToken.expires_in * 1000).toISOString(),
        },
        integration.provider_credentials.vault_key_ref,
      );
    } catch (e: unknown) {
      return err("TTLOCK_AUTH_FAILED", e instanceof Error ? e.message : "Re-auth failed", 422);
    }
  }

  const clientId = integration.provider_client_id!;

  // Determinar rango de fechas
  const sinceMs = since
    ? new Date(since).getTime()
    : integration.last_sync_at
      ? new Date(integration.last_sync_at).getTime()
      : Date.now() - 24 * 60 * 60 * 1000; // 24h atrás por defecto

  const endMs = Date.now();

  // Cargar locks activas del cliente
  const { data: locks, error: locksErr } = await supabase
    .from("locks")
    .select("id, provider_lock_id")
    .eq("client_account_id", client_account_id);

  if (locksErr || !locks?.length) {
    return ok({ records_synced: 0, locks_processed: 0, errors: [], message: "No locks found — run sal-sync-locks first" });
  }

  const errors: string[] = [];
  let recordsSynced  = 0;
  let locksProcessed = 0;
  const now = new Date().toISOString();

  for (const lock of locks) {
    try {
      const records = await fetchLockRecords(
        accessToken,
        clientId,
        lock.provider_lock_id,
        sinceMs,
        endMs,
      );

      for (const rec of records) {
        const { error: insErr } = await supabase
          .from("lock_records")
          .insert({
            lock_id:            lock.id,
            client_account_id,
            provider_record_id: `${lock.provider_lock_id}_${rec.lockDate}_${rec.recordType}`,
            event_type:         mapRecordType(rec.recordType),
            event_at:           new Date(rec.lockDate).toISOString(),
            success:            rec.success === 1,
            actor_description:  rec.username ?? null,
            raw_data:           rec as unknown as Record<string, unknown>,
          })
          .onConflict("lock_id,provider_record_id")
          .ignoreDuplicates();

        if (!insErr) recordsSynced++;
      }
      locksProcessed++;
    } catch (e: unknown) {
      errors.push(`Lock ${lock.provider_lock_id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Actualizar last_sync_at
  await supabase.from("lock_integrations").update({
    last_sync_at:     now,
    last_sync_status: errors.length > 0 ? "partial" : "success",
    last_sync_error:  errors.length > 0 ? errors[0] : null,
  }).eq("id", integration.id);

  return ok({ records_synced: recordsSynced, locks_processed: locksProcessed, errors });
});
