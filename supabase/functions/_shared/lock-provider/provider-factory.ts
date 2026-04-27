/**
 * Provider Factory — crea el ILockProvider correcto para una integración.
 *
 * Uso desde cualquier EF:
 *   import { getLockProviderForIntegration } from "../_shared/lock-provider/provider-factory.ts";
 *   const provider = await getLockProviderForIntegration(supabase, integration);
 *   const locks = await provider.listLocks();
 *
 * Las EFs de negocio NO conocen TTLock, Nuki ni ningún proveedor concreto.
 */

import { SupabaseClient }  from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { ILockProvider }   from "./types.ts";
import { readVaultSecret, saveVaultSecret } from "../sal-vault.ts";
import { TTLockProvider, refreshTTLockTokenIfNeeded } from "./providers/ttlock.ts";
// import { NukiProvider } from "./providers/nuki.ts"; // futuro

// ── Tipo mínimo de integration que necesita la factory ───────────────────────

export interface ProviderIntegration {
  id:                   string;
  provider:             string;
  provider_client_id:   string | null;
  provider_account_id?: string | null;
  provider_credentials: { vault_key_ref?: string } | null;
  status:               string;
}

// ── Factory principal ─────────────────────────────────────────────────────────

/**
 * Carga secretos desde Vault, refresca el token si es necesario,
 * y devuelve el proveedor instanciado listo para usar.
 *
 * @throws Error si el provider no está configurado, Vault falla, o proveedor desconocido.
 */
export async function getLockProviderForIntegration(
  supabase:    SupabaseClient,
  integration: ProviderIntegration,
): Promise<ILockProvider> {
  const vaultRef = integration.provider_credentials?.vault_key_ref;
  if (!vaultRef) {
    throw new Error("Integración sin credenciales configuradas (vault_key_ref faltante)");
  }

  const secrets = await readVaultSecret(supabase, vaultRef);

  switch (integration.provider) {
    case "ttlock": {
      const clientId = integration.provider_client_id
        ?? Deno.env.get("TTLOCK_CLIENT_ID")
        ?? "";

      const freshSecrets = await refreshTTLockTokenIfNeeded(
        secrets as Record<string, string> & typeof secrets,
        clientId,
        supabase,
        vaultRef,
        // Adaptador para saveVaultSecret (recibe payload genérico)
        (sb, payload, ref) => saveVaultSecret(sb as SupabaseClient, payload as typeof secrets, ref),
      );

      return new TTLockProvider(
        { provider_client_id: clientId },
        freshSecrets as Record<string, string> & typeof secrets,
      );
    }

    // case "nuki": {
    //   return new NukiProvider(integration, secrets);
    // }

    default:
      throw new Error(`Proveedor desconocido o no soportado: "${integration.provider}"`);
  }
}

/**
 * Alias de conveniencia — nombre corto para uso en EFs.
 * Equivale a getLockProviderForIntegration.
 */
export const getProvider = getLockProviderForIntegration;
