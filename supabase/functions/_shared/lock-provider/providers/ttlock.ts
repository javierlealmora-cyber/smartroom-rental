/**
 * TTLockProvider — implementación concreta de ILockProvider para TTLock/Sciener.
 *
 * Encapsula TODA la lógica TTLock: endpoints, formatos, errcode, MD5, paginación.
 * Las EFs de negocio NO importan nada de este archivo — usan ILockProvider vía la factory.
 */

import {
  ILockProvider,
  ProviderCapabilities,
  NormalizedLock,
  NormalizedCredential,
  NormalizedEvent,
  PinParams,
} from "../types.ts";

import {
  getTTLockToken,
  isTokenFresh,
  fetchAllLocks,
  fetchLockRecords,
  mapRecordType,
  resolveTTLockBase,
  type CachedToken,
} from "../../sal-ttlock-client.ts";

// ── Tipos internos TTLock ─────────────────────────────────────────────────────

interface AddPinResult   { keyboardPwdId: number }
interface TTLockVault {
  client_secret:    string;
  password_md5:     string;
  access_token:     string;
  refresh_token:    string;
  token_expires_at: string;
  api_base?:        string;
  managed_username?: string;
}

// ── Helper HTTP genérico ──────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  const res  = await fetch(`${apiBase}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
  });
  const data = await res.json() as Record<string, unknown>;

  if (data.errcode !== undefined && data.errcode !== 0) {
    throw new Error(`TTLock [${path}] errcode=${data.errcode}: ${data.errmsg ?? JSON.stringify(data)}`);
  }
  return data;
}

// ── TTLockProvider ────────────────────────────────────────────────────────────

export class TTLockProvider implements ILockProvider {
  private readonly clientId:    string;
  private readonly clientSecret: string;
  private readonly username:    string;
  private readonly passwordMd5: string;
  private readonly apiBase:     string;
  private accessToken:          string;

  constructor(
    integration: { provider_client_id: string | null },
    secrets:     TTLockVault,
  ) {
    this.clientId     = integration.provider_client_id ?? "";
    this.clientSecret = secrets.client_secret ?? "";
    this.username     = secrets.managed_username ?? "";
    this.passwordMd5  = secrets.password_md5 ?? "";
    this.apiBase      = resolveTTLockBase(
      secrets.api_base?.includes("eu") ? "eu" : undefined,
    );
    this.accessToken  = secrets.access_token ?? "";

    // Si el token está próximo a vencer, getTTLockClient habrá renovado antes
    // de instanciar esta clase. El accessToken aquí es siempre fresco.
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsRemoteUnlock:     true,  // requiere gateway físico online
      supportedCredentialTypes: ["pin"],
      requiresGatewayForRemote: true,
      supportsWebhooks:         false, // poco fiable; usamos polling via n8n
      maxLocksPerAccount:       null,
    };
  }

  async testConnection(): Promise<void> {
    // Intentar listar la primera página de locks; si falla → excepción
    await ttlockPost(
      "/v3/lock/list",
      { pageNo: 1, pageSize: 1 },
      this.accessToken,
      this.clientId,
      this.apiBase,
    );
  }

  async listLocks(): Promise<NormalizedLock[]> {
    const raw = await fetchAllLocks(this.accessToken, this.clientId, this.apiBase);
    return raw.map((l) => ({
      providerLockId:       String(l.lockId),
      name:                 l.lockName,
      batteryLevel:         l.electricQuantity ?? null,
      isOnline:             l.isOnline ?? false,
      model:                l.modelNum ?? undefined,
      firmwareVersion:      l.firmwareRevision ?? undefined,
      supportsRemoteUnlock: l.isOnline ?? false,
      rawData:              l,
    }));
  }

  async createPin(lockId: string, params: PinParams): Promise<NormalizedCredential> {
    // Generar PIN de 6 dígitos criptográficamente seguro
    const pinDigits = new Uint32Array(1);
    crypto.getRandomValues(pinDigits);
    const pin = String(100000 + (pinDigits[0] % 900000));

    const startMs = params.startDate.getTime();
    const endMs   = params.endDate
      ? params.endDate.getTime()
      : startMs + 365 * 24 * 60 * 60 * 1000;

    const addType = params.type === "one_time"  ? 4
                  : params.type === "permanent" ? 2
                  : 3; // temporary (default)

    const data = await ttlockPost(
      "/v3/keyboardPwd/add",
      {
        lockId:          parseInt(lockId, 10),
        keyboardPwd:     pin,
        keyboardPwdName: params.name,
        startDate:       startMs,
        endDate:         endMs,
        addType,
      },
      this.accessToken,
      this.clientId,
      this.apiBase,
    ) as AddPinResult & Record<string, unknown>;

    if (!data.keyboardPwdId) {
      throw new Error(`TTLock addKeyboardPwd no devolvió keyboardPwdId: ${JSON.stringify(data)}`);
    }

    return {
      providerCredentialId: String(data.keyboardPwdId),
      credentialType:       "pin",
      credentialValue:      pin, // en claro — el llamador debe cifrar en Vault
      expiresAt:            params.endDate,
    };
  }

  async revokeCredential(
    lockId:       string,
    credentialId: string,
    deleteType:   "cloud_and_device" | "cloud_only" = "cloud_and_device",
  ): Promise<void> {
    // deleteType 1 = borrar en cerradura + cloud (requiere gateway online)
    // deleteType 2 = solo en cloud (funciona sin gateway)
    const ttDeleteType = deleteType === "cloud_only" ? 2 : 1;

    await ttlockPost(
      "/v3/keyboardPwd/delete",
      {
        lockId:        parseInt(lockId, 10),
        keyboardPwdId: parseInt(credentialId, 10),
        deleteType:    ttDeleteType,
      },
      this.accessToken,
      this.clientId,
      this.apiBase,
    );
  }

  async renewCredential(
    lockId:       string,
    credentialId: string,
    newExpiresAt: Date,
  ): Promise<NormalizedCredential> {
    // TTLock soporta modificar fechas de un PIN existente (sin revocar)
    await ttlockPost(
      "/v3/keyboardPwd/modify",
      {
        lockId:        parseInt(lockId, 10),
        keyboardPwdId: parseInt(credentialId, 10),
        startDate:     Date.now(),
        endDate:       newExpiresAt.getTime(),
        changeType:    2, // renovar fechas
      },
      this.accessToken,
      this.clientId,
      this.apiBase,
    );

    return {
      providerCredentialId: credentialId,
      credentialType:       "pin",
      expiresAt:            newExpiresAt,
    };
  }

  async remoteUnlock(lockId: string): Promise<void> {
    await ttlockPost(
      "/v3/lock/unlock",
      { lockId: parseInt(lockId, 10) },
      this.accessToken,
      this.clientId,
      this.apiBase,
    );
    // TTLock errcode=0 confirma el ENVÍO al gateway, no la apertura física
  }

  async listEvents(lockId: string, since: Date, until?: Date): Promise<NormalizedEvent[]> {
    const endMs   = until ? until.getTime() : Date.now();
    const raw = await fetchLockRecords(
      this.accessToken,
      this.clientId,
      lockId,
      since.getTime(),
      endMs,
      this.apiBase,
    );

    return raw.map((r) => ({
      providerRecordId:  String(r.lockDate) + "_" + String(r.recordType),
      eventType:         mapRecordType(r.recordType),
      eventAt:           new Date(r.lockDate),
      actorDescription:  r.username ?? undefined,
      success:           r.success === 1,
      rawData:           r,
    }));
  }
}

// ── Helper: refresca token si es necesario y actualiza Vault ─────────────────
// Usado por provider-factory.ts antes de instanciar TTLockProvider.

export async function refreshTTLockTokenIfNeeded(
  secrets:    TTLockVault,
  clientId:   string,
  // deno-lint-ignore no-explicit-any
  supabase:   any,
  vaultRef:   string,
  saveVault:  (supabase: unknown, payload: unknown, ref: string) => Promise<void>,
): Promise<TTLockVault> {
  const cached: CachedToken = {
    accessToken:    secrets.access_token,
    refreshToken:   secrets.refresh_token,
    tokenExpiresAt: secrets.token_expires_at,
  };

  if (isTokenFresh(cached)) return secrets;

  // Token vencido o próximo a vencer — renovar
  const newToken = await getTTLockToken({
    clientId,
    clientSecret: secrets.client_secret,
    username:     secrets.managed_username ?? "",
    passwordMd5:  secrets.password_md5,
  }, secrets.api_base);

  const updated: TTLockVault = {
    ...secrets,
    access_token:     newToken.access_token,
    refresh_token:    newToken.refresh_token,
    token_expires_at: new Date(Date.now() + newToken.expires_in * 1000).toISOString(),
  };

  await saveVault(supabase, updated, vaultRef);
  return updated;
}
