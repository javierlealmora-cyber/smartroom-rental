# contract-lock-provider-interface.md — ILockProvider

## 1. Propósito

`ILockProvider` es la interfaz común que deben implementar todos los proveedores de cerraduras soportados por SmartLock. Es el contrato que desacopla la lógica de negocio del proveedor concreto (TTLock cloud, TTLock BLE local, o futuros como Nuki).

## 2. Cuándo se usa

Cada vez que una Edge Function `sal-*` necesita operar sobre una cerradura (listar, crear PIN, revocar credencial, unlock remoto, listar eventos), obtiene una instancia de `ILockProvider` desde el factory y opera exclusivamente contra esta interfaz.

## 3. Productor

Las clases `TTLockProvider` (`providers/ttlock.ts`) y `TTLockBleProvider` (`providers/ttlock-ble.ts`, futuro) son las únicas productoras de instancias que implementan este contrato. Se instancian desde `provider-factory.ts`.

## 4. Consumidor

Todas las Edge Functions de negocio: `sal-sync-locks`, `sal-grant-access`, `sal-revoke-access`, `sal-renew-credential`, `sal-remote-unlock`, `sal-sync-lock-records`, entre otras.

## 5. Estructura

```typescript
interface ProviderCapabilities {
  supportsRemoteUnlock:     boolean;
  supportedCredentialTypes: ("pin" | "card" | "app_key" | "fingerprint")[];
  requiresGatewayForRemote: boolean;
  supportsWebhooks:         boolean;
  maxLocksPerAccount:       number | null;
}

interface NormalizedLock {
  providerLockId:       string;
  name:                 string;
  batteryLevel:         number | null;
  isOnline:             boolean;
  model?:               string;
  firmwareVersion?:     string;
  supportsRemoteUnlock: boolean;
  rawData?:             unknown;
}

interface PinParams {
  name:      string;
  startDate: Date;
  endDate?:  Date;
  type:      "temporary" | "permanent" | "one_time";
}

interface NormalizedCredential {
  providerCredentialId: string;
  credentialType:       "pin" | "card" | "app_key" | "fingerprint";
  credentialValue?:     string; // en claro — SOLO al crear, nunca persistir en BD
  expiresAt?:           Date;
}

interface NormalizedEvent {
  providerRecordId:  string;
  eventType:         string;
  eventAt:           Date;
  actorDescription?: string;
  success:           boolean;
  rawData?:          unknown;
}

interface ILockProvider {
  getCapabilities(): ProviderCapabilities;
  testConnection(): Promise<void>;
  listLocks(): Promise<NormalizedLock[]>;
  createPin(lockId: string, params: PinParams): Promise<NormalizedCredential>;
  revokeCredential(
    lockId: string,
    credentialId: string,
    deleteType?: "cloud_and_device" | "cloud_only",
  ): Promise<void>;
  renewCredential(
    lockId: string,
    credentialId: string,
    newExpiresAt: Date,
  ): Promise<NormalizedCredential>;
  remoteUnlock(lockId: string): Promise<void>;
  listEvents(lockId: string, since: Date, until?: Date): Promise<NormalizedEvent[]>;
}
```

## 6. Campos Obligatorios

Todos los métodos de `ILockProvider` son obligatorios en toda implementación. No se permite una implementación parcial: si un proveedor no soporta una capacidad (p. ej. huella), debe lanzar un error explícito y controlado (`ProviderCapabilityError`), nunca dejar el método sin implementar.

## 7. Campos Opcionales

- `NormalizedLock.model`, `NormalizedLock.firmwareVersion`, `NormalizedLock.rawData` — pueden ser `undefined` si el proveedor no expone esa información.
- `PinParams.endDate` — ausente para PIN de tipo `permanent`.
- `NormalizedCredential.credentialValue` — presente solo en la respuesta de creación; nunca se recupera después.
- `NormalizedEvent.actorDescription`, `NormalizedEvent.rawData` — opcionales según lo que reporte el proveedor.

## 8. Reglas de Validación

1. `getCapabilities()` debe ser síncrono y no debe requerir llamadas de red.
2. `testConnection()` debe lanzar una excepción si las credenciales no son válidas; no debe devolver `false` silenciosamente.
3. `createPin()` debe devolver `credentialValue` en claro únicamente en la respuesta inmediata; ninguna capa superior debe persistirlo en base de datos.
4. `revokeCredential()` con `deleteType = "cloud_and_device"` requiere gateway disponible (cloud) o gateway físico online (BLE); si no está disponible, debe lanzar un error explícito indicando el motivo, no fallar silenciosamente.
5. `remoteUnlock()` debe lanzar error explícito si `getCapabilities().supportsRemoteUnlock === false` en lugar de intentar la operación.
6. `listEvents()` debe devolver resultados ordenados por `eventAt` ascendente.
7. Ninguna implementación puede lanzar excepciones no tipadas; deben usarse tipos de error reconocibles por la capa de negocio (`ProviderConnectionError`, `ProviderCapabilityError`, `ProviderRateLimitError`).

## 9. Ejemplos Válidos

```typescript
const provider = await getLockProviderForIntegration(supabase, integration);

const locks = await provider.listLocks();
// [{ providerLockId: "4529871", name: "Puerta Habitación 3", batteryLevel: 85, isOnline: true, supportsRemoteUnlock: true }]

const credential = await provider.createPin("4529871", {
  name: "Juan Pérez — checkin 2026-08-01",
  startDate: new Date("2026-08-01T14:00:00Z"),
  endDate: new Date("2026-08-10T11:00:00Z"),
  type: "temporary",
});
// { providerCredentialId: "88213", credentialType: "pin", credentialValue: "4821", expiresAt: Date }
```

## 10. Ejemplos Inválidos

```typescript
// ❌ Persistir credentialValue en BD
await supabase.from("lock_credentials").insert({ pin_value: credential.credentialValue });

// ❌ Llamar remoteUnlock sin comprobar capacidades
await provider.remoteUnlock(lockId); // sin verificar getCapabilities().supportsRemoteUnlock antes

// ❌ Importar el provider concreto en una Edge Function de negocio
import { TTLockProvider } from "../_shared/lock-provider/providers/ttlock.ts";
```

## 11. Notas de Versionado

Cualquier cambio en la firma de `ILockProvider` es un cambio breaking para todas las implementaciones existentes (`ttlock.ts`, y en el futuro `ttlock-ble.ts`). Debe coordinarse una actualización simultánea de todas las implementaciones antes de desplegar el cambio de interfaz.

## 12. Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
