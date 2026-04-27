/**
 * Lock Provider Abstraction Layer — tipos e interfaz común.
 *
 * La lógica de negocio (EFs de grants, revocaciones, checkout) usa SOLO
 * estos tipos. Cada proveedor (TTLock, Nuki, …) implementa ILockProvider.
 * Añadir un proveedor nuevo = crear su clase, actualizar el factory.
 * Cero cambios en las EFs de negocio.
 */

// ── Tipos normalizados (agnósticos de proveedor) ──────────────────────────────

export interface ProviderCapabilities {
  supportsRemoteUnlock:     boolean;
  supportedCredentialTypes: ("pin" | "card" | "app_key")[];
  requiresGatewayForRemote: boolean;
  supportsWebhooks:         boolean;
  maxLocksPerAccount:       number | null;
}

export interface NormalizedLock {
  providerLockId:       string;
  name:                 string;
  batteryLevel:         number | null;
  isOnline:             boolean;
  model?:               string;
  firmwareVersion?:     string;
  supportsRemoteUnlock: boolean;
  rawData?:             unknown;
}

export interface PinParams {
  name:      string;
  startDate: Date;
  endDate?:  Date;
  type:      "temporary" | "permanent" | "one_time";
}

export interface NormalizedCredential {
  providerCredentialId: string;
  credentialType:       "pin" | "card" | "app_key";
  credentialValue?:     string; // PIN en claro — SOLO al crear, nunca persistir en BD
  expiresAt?:           Date;
}

export interface NormalizedEvent {
  providerRecordId:  string;
  eventType:         string; // unlock_app, unlock_passcode, lock_remote, remote_unlock, …
  eventAt:           Date;
  actorDescription?: string;
  success:           boolean;
  rawData?:          unknown;
}

// ── Tipos para el flujo de conexión ──────────────────────────────────────────

export interface ConnectResult {
  managedAccountId: string;
  vaultPayload:     Record<string, string>;
  displayInfo?:     Record<string, string>;
}

// ── Interfaz principal ────────────────────────────────────────────────────────

export interface ILockProvider {
  /** Capacidades del proveedor — se usan para UI y validaciones de plan */
  getCapabilities(): ProviderCapabilities;

  /** Verifica que el token/credenciales actuales son válidos. Lanza excepción si no. */
  testConnection(): Promise<void>;

  /** Lista todas las cerraduras asociadas a la cuenta gestionada */
  listLocks(): Promise<NormalizedLock[]>;

  /** Crea un PIN temporal y devuelve la credencial normalizada */
  createPin(lockId: string, params: PinParams): Promise<NormalizedCredential>;

  /**
   * Revoca una credencial en el proveedor.
   * @param deleteType "cloud_and_device" (requiere gateway) | "cloud_only" (sin gateway)
   */
  revokeCredential(
    lockId:       string,
    credentialId: string,
    deleteType?:  "cloud_and_device" | "cloud_only",
  ): Promise<void>;

  /**
   * Extiende la vigencia de una credencial existente.
   * Algunos proveedores no soportan extensión in-place (deben revocar + reemitir).
   */
  renewCredential(
    lockId:       string,
    credentialId: string,
    newExpiresAt: Date,
  ): Promise<NormalizedCredential>;

  /** Envía un comando de apertura remota (requiere gateway en TTLock) */
  remoteUnlock(lockId: string): Promise<void>;

  /** Lista eventos de acceso para una cerradura en un rango de tiempo */
  listEvents(lockId: string, since: Date, until?: Date): Promise<NormalizedEvent[]>;
}
