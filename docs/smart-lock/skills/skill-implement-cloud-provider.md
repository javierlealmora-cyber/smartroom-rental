# skill-implement-cloud-provider.md — Implementar/Mantener el Provider TTLock Cloud

## 1. Objetivo

Guiar la implementación y el mantenimiento de `TTLockProvider` (`providers/ttlock.ts`), incluyendo el flujo OAuth, la creación de PINs, la revocación y el unlock remoto contra la API cloud de TTLock.

## 2. Cuándo usar este skill

- Implementar o revisar `providers/ttlock.ts`.
- Depurar errores de autenticación OAuth con TTLock.
- Añadir soporte para una nueva operación de la API TTLock.
- Diagnosticar fallos de sincronización de un cliente concreto.

## 3. Preconditions

Antes de usar este skill, leer:
- `rules-10-provider-model.md`
- `rules-40-ttlock-cloud-provider.md`
- `contract-lock-provider-interface.md`
- `contract-normalized-lock.md`, `contract-normalized-credential.md`, `contract-normalized-event.md`

## 4. Restricciones de Origen

Este skill respeta decisiones ya cerradas en las rules:
- `TTLOCK_CLIENT_ID` / `TTLOCK_CLIENT_SECRET` viven solo en Supabase secrets, nunca en código.
- Cada cliente se asigna a un shard (`lock_provider_pools`), nunca se crea una sub-cuenta TTLock por cliente sin pasar por el modelo de shards.
- `TTLockProvider` implementa `ILockProvider` sin excepciones ni métodos parciales.

## 5. Estrategia de Implementación

`TTLockProvider` encapsula las llamadas REST a `https://euopen.ttlock.com/` usando el token OAuth del shard asignado al cliente (leído del Vault por el factory antes de instanciar el provider).

## 6. Pasos Recomendados

### Paso 1 — Autenticación OAuth (ROPC)

```
POST https://euopen.ttlock.com/oauth2/token
  client_id, client_secret, username, password (MD5), grant_type=password

Respuesta: { access_token, refresh_token, uid, expires_in }
```

Guardar `access_token`, `refresh_token`, `expires_in` (calculando `expires_at`) en Vault vía `saveVaultSecret`.

### Paso 2 — Refresco de token

Antes de cada llamada, `refreshTTLockTokenIfNeeded()` comprueba si `expires_at` está a menos de 24h y refresca proactivamente:

```
POST https://euopen.ttlock.com/oauth2/token
  client_id, client_secret, grant_type=refresh_token, refresh_token=<actual>
```

### Paso 3 — `listLocks()`

```
GET https://euopen.ttlock.com/v3/lock/list?clientId=...&accessToken=...&pageNo=1&pageSize=100
```
Mapear cada elemento a `NormalizedLock` según `contract-normalized-lock.md`. Paginar si `pageSize` no cubre el total.

### Paso 4 — `createPin()`

```
POST https://euopen.ttlock.com/v3/keyboardPwd/add
  lockId, keyboardPwd, keyboardPwdName, startDate (epoch ms), endDate (epoch ms), addType
```
Mapear la respuesta a `NormalizedCredential` según `contract-normalized-credential.md`. El PIN se genera del lado de SmartRoom Rental (aleatorio de 4-8 dígitos) antes de enviarlo a TTLock, o se solicita a TTLock que lo genere según la variante de API elegida — documentar la elección real en el código con un comentario explícito.

### Paso 5 — `revokeCredential()`

```
POST https://euopen.ttlock.com/v3/keyboardPwd/delete
  lockId, keyboardPwdId, deleteType (1=cloud_and_device requiere gateway, 2=cloud_only)
```
Si `deleteType = 1` y no hay gateway G2 online, TTLock devuelve error; capturarlo y lanzar `ProviderConnectionError` explícito, nunca fallar silenciosamente.

### Paso 6 — `remoteUnlock()`

```
POST https://euopen.ttlock.com/v3/lock/unlock
  lockId, clientId, accessToken
```
Requiere gateway G2 online. Si falla por gateway offline, lanzar error explícito indicando esa causa concreta (no un error genérico).

### Paso 7 — `listEvents()`

```
GET https://euopen.ttlock.com/v3/lockRecord/list?lockId=...&startDate=...&endDate=...&pageNo=1&pageSize=100
```
Mapear cada registro a `NormalizedEvent`. Usar el `id` del registro TTLock como `providerRecordId` para deduplicación.

## 7. Datos / Contratos Involucrados

- `contract-lock-provider-interface.md`
- `contract-normalized-lock.md`, `contract-normalized-credential.md`, `contract-normalized-event.md`
- `lock_integrations.provider_credentials.vault_key_ref`
- `lock_provider_pools`, `lock_provider_pool_assignments`

## 8. Errores Comunes

- **Asumir que `deleteType=1` siempre funciona:** requiere gateway G2 físico online. Si el cliente no tiene gateway, usar `deleteType=2` (cloud only) y documentar que la revocación física quedará pendiente hasta que el gateway esté disponible.
- **No refrescar el token antes de que expire:** provoca fallos intermitentes de sincronización. Siempre comprobar `expires_at` antes de cada lote de llamadas.
- **Ignorar la paginación de `listLocks()` / `listEvents()`:** con más de 100 cerraduras o eventos, se pierden resultados silenciosamente si no se pagina.

## 9. Qué No Debe Hacerse

- No crear una sub-cuenta TTLock por cliente; siempre usar el modelo de shards.
- No exponer `access_token` ni `refresh_token` fuera del Vault.
- No hardcodear URLs de la plataforma `intl` si en el futuro se soporta también `cn`; usar `lock_integrations.ttlock_platform` para resolver el host base.

## 10. Escenarios Mínimos de Prueba

- Conectar una integración nueva y verificar que se asigna a un shard con margen de capacidad.
- Sincronizar cerraduras y verificar que `NormalizedLock` se mapea correctamente a `locks`.
- Crear un PIN y verificar que `credentialValue` no se persiste en base de datos.
- Revocar credencial sin gateway online y verificar que se usa `deleteType=2` con aviso claro al usuario.
- Simular token expirado y verificar refresco automático antes de la siguiente llamada.

## 11. Criterio de Done

- `TTLockProvider` implementa los 8 métodos de `ILockProvider` sin excepciones.
- Ninguna llamada a la API de TTLock ocurre fuera de esta clase.
- Los tests de `test-cloud-mvp-e2e-spec.md` pasan.

## 12. Documentos Relacionados

- `rules-40-ttlock-cloud-provider.md`
- `contract-lock-provider-interface.md`
- `test-cloud-mvp-e2e-spec.md`

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
