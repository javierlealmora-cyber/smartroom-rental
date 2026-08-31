# skill-add-lock-provider.md — Añadir un Nuevo Provider (ej. Nuki)

## 1. Objetivo

Guiar la incorporación de un nuevo proveedor de cerraduras (por ejemplo, Nuki) sin modificar la lógica de negocio existente ni las Edge Functions de SmartLock ya implementadas.

## 2. Cuándo Usar Este Skill

- Cuando el negocio decida soportar un proveedor adicional a TTLock.
- Cuando se evalúe la viabilidad técnica de un proveedor nuevo antes de comprometerse a implementarlo.

## 3. Preconditions

Leer antes:
- `rules-10-provider-model.md`
- `contract-lock-provider-interface.md`

## 4. Restricciones de Origen

- El nuevo provider debe implementar `ILockProvider` sin modificaciones a la interfaz.
- Ninguna Edge Function de negocio existente puede modificarse para dar soporte al nuevo provider.
- El `CHECK` de `lock_integrations.provider` debe ampliarse explícitamente.

## 5. Estrategia de Implementación

Aislar toda la lógica específica del nuevo proveedor dentro de una única clase en `providers/<nombre>.ts`, y registrar un `case` adicional en el factory.

## 6. Pasos Recomendados

### Paso 1 — Evaluar capacidades del proveedor

Documentar en una tabla qué expone la API/SDK del proveedor frente a `ProviderCapabilities`:

```
supportsRemoteUnlock:     ¿tiene endpoint de unlock remoto?
supportedCredentialTypes: ¿qué tipos de credencial soporta?
requiresGatewayForRemote: ¿necesita hardware puente para operaciones remotas?
supportsWebhooks:         ¿ofrece webhooks o solo polling?
maxLocksPerAccount:       ¿tiene límite de cuota?
```

### Paso 2 — Implementar la clase del provider

```typescript
// providers/nuki.ts
export class NukiProvider implements ILockProvider {
  getCapabilities(): ProviderCapabilities { ... }
  async testConnection(): Promise<void> { ... }
  async listLocks(): Promise<NormalizedLock[]> { ... }
  async createPin(lockId, params): Promise<NormalizedCredential> { ... }
  async revokeCredential(lockId, credentialId, deleteType?): Promise<void> { ... }
  async renewCredential(lockId, credentialId, newExpiresAt): Promise<NormalizedCredential> { ... }
  async remoteUnlock(lockId): Promise<void> { ... }
  async listEvents(lockId, since, until?): Promise<NormalizedEvent[]> { ... }
}
```

Cada método debe mapear las respuestas nativas del proveedor a los contratos `Normalized*` ya definidos, sin introducir campos nuevos a esos contratos salvo que se actualicen formalmente.

### Paso 3 — Registrar en el factory

```typescript
case "nuki": {
  const secrets = await readVaultSecret(supabase, vaultRef);
  return new NukiProvider(integration, secrets);
}
```

### Paso 4 — Ampliar el CHECK de base de datos

```sql
ALTER TABLE lock_integrations DROP CONSTRAINT IF EXISTS lock_integrations_provider_check;
ALTER TABLE lock_integrations ADD CONSTRAINT lock_integrations_provider_check
  CHECK (provider IN ('ttlock', 'ttlock_ble', 'nuki'));
```

### Paso 5 — UI

Añadir la opción del nuevo proveedor en el wizard de conexión, con su propio flujo de credenciales/OAuth si aplica. No debe requerir cambios en las pantallas de gestión operativa (grants, PINs, unlock) porque estas ya operan sobre `ILockProvider`.

## 7. Datos / Contratos Involucrados

- `contract-lock-provider-interface.md`
- `contract-normalized-lock.md`, `contract-normalized-credential.md`, `contract-normalized-event.md`

## 8. Errores Comunes

- Modificar `ILockProvider` para acomodar una particularidad del nuevo proveedor en lugar de mapearla dentro de la implementación concreta.
- Olvidar ampliar el `CHECK` de `lock_integrations.provider`, causando errores de inserción silenciosos.
- Duplicar lógica de negocio (grants, notificaciones) dentro del nuevo provider — esa lógica pertenece a las Edge Functions de negocio, no al provider.

## 9. Qué No Debe Hacerse

- No añadir métodos nuevos a `ILockProvider` solo para un proveedor específico; si una capacidad no es universal, debe modelarse vía `ProviderCapabilities` y manejarse de forma condicional en el llamador.
- No implementar el proveedor nuevo directamente en una Edge Function de negocio.

## 10. Escenarios Mínimos de Prueba

- `testConnection()` del nuevo provider falla de forma controlada con credenciales inválidas.
- `listLocks()` mapea correctamente al menos un caso real a `NormalizedLock`.
- El factory instancia correctamente el nuevo provider sin afectar a `ttlock` ni `ttlock_ble`.

## 11. Criterio de Done

- El nuevo provider pasa los mismos tests de contrato genéricos que `ttlock` y `ttlock_ble`.
- Ninguna Edge Function de negocio existente requirió cambios.

## 12. Documentos Relacionados

- `rules-10-provider-model.md`
- `contract-lock-provider-interface.md`

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
