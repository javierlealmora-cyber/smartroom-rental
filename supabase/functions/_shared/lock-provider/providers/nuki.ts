/**
 * NukiProvider — implementación futura para Nuki Smart Lock.
 *
 * Estado: STUB — solo define capabilities.
 * Implementación completa pendiente cuando se integre Nuki.
 *
 * API de referencia: https://developer.nuki.io/page/nuki-web-api-1-4/3/
 */

import {
  ILockProvider,
  ProviderCapabilities,
  NormalizedLock,
  NormalizedCredential,
  NormalizedEvent,
  PinParams,
} from "../types.ts";

export class NukiProvider implements ILockProvider {
  constructor(
    _integration: { provider_client_id: string | null },
    _secrets:     Record<string, string>,
  ) {
    // Pendiente de implementación
  }

  getCapabilities(): ProviderCapabilities {
    return {
      supportsRemoteUnlock:     true,
      supportedCredentialTypes: ["pin", "app_key"],
      requiresGatewayForRemote: false, // Nuki usa WiFi nativo
      supportsWebhooks:         true,
      maxLocksPerAccount:       null,
    };
  }

  testConnection():                                Promise<void>                   { return notImplemented(); }
  listLocks():                                     Promise<NormalizedLock[]>       { return notImplemented(); }
  createPin(_: string, __: PinParams):             Promise<NormalizedCredential>   { return notImplemented(); }
  revokeCredential(_: string, __: string):         Promise<void>                   { return notImplemented(); }
  renewCredential(_: string, __: string, ___: Date): Promise<NormalizedCredential> { return notImplemented(); }
  remoteUnlock(_: string):                         Promise<void>                   { return notImplemented(); }
  listEvents(_: string, __: Date):                 Promise<NormalizedEvent[]>      { return notImplemented(); }
}

function notImplemented(): never {
  throw new Error("NukiProvider: implementación pendiente");
}
