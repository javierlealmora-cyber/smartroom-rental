/**
 * Utilidades para Supabase Vault — módulo SAL.
 *
 * Vault almacena los secretos TTLock cifrados (client_secret, password_md5,
 * access_token, refresh_token, token_expires_at).
 *
 * Solo las Edge Functions con service_role acceden a estas funciones.
 * Requiere que la migración 20260412180000_vault_helpers.sql esté aplicada.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

export interface SalVaultPayload {
  client_secret:     string;
  password_md5:      string;
  access_token:      string;
  refresh_token:     string;
  token_expires_at:  string; // ISO8601
  api_base?:         string; // URL base TTLock (intl vs eu)
  managed_username?: string; // Username final TTLock (con prefijo clientId) — cuenta gestionada por SmartRoom
}

/**
 * Lee y parsea un secreto SAL desde Vault.
 *
 * @param supabase     Cliente service_role
 * @param vaultKeyRef  UUID del secreto en Vault
 */
export async function readVaultSecret(
  supabase: SupabaseClient,
  vaultKeyRef: string,
): Promise<SalVaultPayload> {
  // vault.decrypted_secrets es una vista que auto-descifra con service_role
  const { data, error } = await (supabase as any)
    .schema("vault")
    .from("decrypted_secrets")
    .select("decrypted_secret")
    .eq("id", vaultKeyRef)
    .single();

  if (error || !data) {
    throw new Error(`Vault read failed: ${error?.message ?? "Secret not found"}`);
  }

  try {
    return JSON.parse((data as any).decrypted_secret) as SalVaultPayload;
  } catch {
    throw new Error("Vault secret is not valid JSON");
  }
}

/**
 * Crea o actualiza un secreto SAL en Vault.
 *
 * Si existingRef es null → crea un secreto nuevo y devuelve su UUID.
 * Si existingRef tiene valor → actualiza el secreto existente y devuelve el mismo UUID.
 *
 * @param supabase      Cliente service_role
 * @param payload       Objeto con los secretos a cifrar
 * @param existingRef   UUID existente (para actualizar) o null (para crear)
 * @param secretName    Nombre descriptivo (solo se usa al crear)
 */
export async function saveVaultSecret(
  supabase: SupabaseClient,
  payload: SalVaultPayload,
  existingRef: string | null,
  secretName?: string,
): Promise<string> {
  const value = JSON.stringify(payload);

  if (existingRef) {
    const { error } = await supabase.rpc("sal_vault_update_secret", {
      p_id:     existingRef,
      p_secret: value,
    });
    if (error) throw new Error(`Vault update failed: ${error.message}`);
    return existingRef;
  }

  // Estrategia: si `secretName` ya existe en Vault (huérfano de un intento
  // anterior), añadimos un sufijo único para evitar la colisión en el índice
  // único `secrets_name_idx`. El nombre es meramente descriptivo; la
  // referencia real es el UUID devuelto.
  const baseName = secretName ?? `sal_ttlock_${crypto.randomUUID()}`;
  const MAX_ATTEMPTS = 3;
  let lastErr: string | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const name = attempt === 0
      ? baseName
      : `${baseName}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    const { data, error } = await supabase.rpc("sal_vault_create_secret", {
      p_secret:      value,
      p_name:        name,
      p_description: "SAL TTLock integration credentials",
    });

    if (!error) return data as string;

    lastErr = error.message;
    const isDuplicate = /duplicate key|unique constraint|secrets_name_idx/i.test(error.message);
    if (!isDuplicate) {
      throw new Error(`Vault create failed: ${error.message}`);
    }
    // Si fue duplicate, loop con nombre único
  }

  throw new Error(`Vault create failed after ${MAX_ATTEMPTS} attempts: ${lastErr}`);
}
