# rules-10-provider-model.md — Modelo de Providers de Cerraduras

## 1. Propósito

Definir el modelo de providers de hardware de cerraduras soportados por SmartLock, su convivencia, y la arquitectura de tres capas que garantiza que la lógica de negocio permanezca independiente del proveedor concreto.

## 2. Alcance

Aplica a:
- La interfaz `ILockProvider` en `supabase/functions/_shared/lock-provider/`.
- Las implementaciones `providers/ttlock.ts` (cloud) y `providers/ttlock-ble.ts` (local, futuro).
- El factory `provider-factory.ts`.
- Cualquier provider futuro (Nuki u otro).

## 3. Decisiones No Negociables

1. Toda lógica de negocio de SmartLock (Edge Functions `sal-*`) debe consumir exclusivamente la interfaz `ILockProvider`. Ninguna Edge Function de negocio puede importar directamente un provider concreto (`ttlock.ts`, `ttlock-ble.ts`).

2. Existen y coexisten dos providers TTLock:
   - `ttlock` — cloud, vía OAuth + REST contra TTLock Open Platform. Es el provider del MVP (Fase 1).
   - `ttlock_ble` — local, vía gateway físico con BLE. Es el provider de la Fase 2.

3. Un `client_account` puede tener una fila de `lock_integrations` por cada provider (`UNIQUE (client_account_id, provider)`), permitiendo coexistencia.

4. El SDK BLE (`ttlock-sdk-js` o equivalente) **nunca** se ejecuta en Supabase Edge Functions. Solo se ejecuta en el gateway físico del cliente (ver `rules-50-ttlock-ble-provider.md`).

5. Añadir un provider nuevo debe limitarse a: (a) crear la clase que implemente `ILockProvider`, (b) añadir un `case` en el factory, (c) ampliar el `CHECK` de `lock_integrations.provider`. No debe requerir cambios en ninguna Edge Function de negocio existente.

6. El provider `ttlock` (cloud) requiere un modelo de sub-cuentas ("shards") gestionado en `lock_provider_pools` / `lock_provider_pool_assignments`, debido al límite de ~500 cerraduras por sub-cuenta de TTLock. El provider `ttlock_ble` no usa shards (`pool_id = NULL` siempre).

## 4. Reglas Obligatorias

### 4.1 Interfaz `ILockProvider`

Todo provider debe implementar, como mínimo:

- `getCapabilities(): ProviderCapabilities`
- `testConnection(): Promise<void>`
- `listLocks(): Promise<NormalizedLock[]>`
- `createPin(lockId, params): Promise<NormalizedCredential>`
- `revokeCredential(lockId, credentialId, deleteType?): Promise<void>`
- `renewCredential(lockId, credentialId, newExpiresAt): Promise<NormalizedCredential>`
- `remoteUnlock(lockId): Promise<void>`
- `listEvents(lockId, since, until?): Promise<NormalizedEvent[]>`

Ver `contract-lock-provider-interface.md` para la definición formal completa.

### 4.2 Selección de provider en el factory

`getLockProviderForIntegration(supabase, integration)` resuelve el provider a partir de `integration.provider`, lee secretos del Vault (`integration.provider_credentials.vault_key_ref`) y devuelve la instancia lista para usar. Ninguna Edge Function de negocio debe leer el Vault directamente para credenciales de provider.

### 4.3 Modelo de shards (solo `ttlock`)

- Cada shard es una sub-cuenta TTLock (`lock_provider_pools`), con sus propias credenciales OAuth en Vault.
- Un `client_account` se asigna a un shard vía `lock_provider_pool_assignments`.
- Al alcanzar el 80% de capacidad (`400/500` locks), debe aprovisionarse un shard nuevo antes de asignar más clientes al shard saturado.
- El provider `ttlock_ble` nunca escribe en `lock_provider_pools` ni `lock_provider_pool_assignments`.

### 4.4 CHECK de provider

`lock_integrations.provider` debe estar restringido: `CHECK (provider IN ('ttlock', 'ttlock_ble', 'nuki'))`. Ampliar esta lista requiere actualizar esta regla.

## 5. Casos Permitidos

- Un cliente con `provider = 'ttlock'` únicamente (MVP habitual).
- Un cliente con `provider = 'ttlock_ble'` únicamente (Fase 2, sin dependencia de la cloud TTLock).
- Un cliente con ambos providers simultáneamente, cada uno gestionando cerraduras distintas.
- Añadir un provider Nuki en el futuro sin tocar Edge Functions de negocio.

## 6. Casos Prohibidos

- Importar `providers/ttlock.ts` o `providers/ttlock-ble.ts` directamente desde una Edge Function de negocio (`sal-grant-access`, `sal-remote-unlock`, etc.) sin pasar por el factory.
- Ejecutar cualquier librería BLE (`ttlock-sdk-js`, `noble`, `bleak`) dentro de una Edge Function de Supabase.
- Asignar `pool_id` a una integración con `provider = 'ttlock_ble'`.
- Superar el límite de capacidad de un shard sin aprovisionar uno nuevo.

## 7. Impacto en Diseño

- La UI de "Conectar proveedor" debe mostrar las opciones de provider disponibles filtradas por lo que exponga `getCapabilities()` de cada uno.
- El wizard de conexión debe ramificarse según el provider elegido (flujo OAuth para `ttlock`, flujo de registro de gateway para `ttlock_ble`).

## 8. Impacto en Implementación

- El factory debe lanzar un error explícito (`Proveedor desconocido o no soportado`) si `integration.provider` no coincide con ningún `case` implementado.
- Los tests de regresión deben verificar que ninguna Edge Function de negocio importa un provider concreto fuera del factory.

## 9. Dependencias

Depende de:
- `rules-00-scope-and-principles.md`
- `contract-lock-provider-interface.md`
- `rules-40-ttlock-cloud-provider.md`
- `rules-50-ttlock-ble-provider.md`

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`

## 10. Checklist de Validación

- [ ] Toda Edge Function de negocio usa el factory, nunca un provider concreto.
- [ ] `lock_integrations.provider` tiene CHECK restringido.
- [ ] `ttlock_ble` nunca tiene `pool_id` asignado.
- [ ] Ningún código BLE se ejecuta en Supabase.

## 11. Notas de Control de Cambios

Cualquier cambio en la interfaz `ILockProvider` debe revisarse contra ambos providers existentes (`ttlock`, `ttlock_ble` cuando exista) para evitar romper compatibilidad.
