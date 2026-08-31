# contract-normalized-lock.md — NormalizedLock

## 1. Propósito

`NormalizedLock` es la representación agnóstica de proveedor de una cerradura física, tal como la devuelve `ILockProvider.listLocks()`.

## 2. Cuándo se usa

Se produce cada vez que `sal-sync-locks` llama a `listLocks()` de cualquier provider, y se usa para insertar o actualizar filas en la tabla `locks`.

## 3. Productor

Cualquier implementación de `ILockProvider` (`TTLockProvider`, `TTLockBleProvider`).

## 4. Consumidor

La Edge Function `sal-sync-locks`, que mapea `NormalizedLock` a columnas de la tabla `locks`.

## 5. Estructura

```typescript
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
```

## 6. Campos Obligatorios

| Campo | Tipo | Descripción |
|---|---|---|
| `providerLockId` | `string` | Identificador único de la cerradura en el proveedor. Se persiste en `locks.provider_lock_id`. |
| `name` | `string` | Nombre tal como lo reporta el proveedor. Se persiste en `locks.name`. |
| `batteryLevel` | `number \| null` | Porcentaje de batería (0–100) o `null` si el proveedor no lo reporta. |
| `isOnline` | `boolean` | Estado de conectividad reportado por el proveedor en el momento del sync. |
| `supportsRemoteUnlock` | `boolean` | Si esta cerradura concreta soporta unlock remoto (puede variar por modelo dentro del mismo proveedor). |

## 7. Campos Opcionales

| Campo | Obligatorio cuando | Descripción |
|---|---|---|
| `model` | El proveedor lo reporta | Modelo de hardware (ej. `PLDT190`, `S534`). |
| `firmwareVersion` | El proveedor lo reporta | Versión de firmware. |
| `rawData` | Siempre recomendado | Payload crudo del proveedor, para depuración. Se persiste en `locks.raw_data` (jsonb). |

## 8. Reglas de Validación

1. `providerLockId` debe ser estable entre sincronizaciones sucesivas del mismo lock físico. Cambiar de valor implica tratarlo como una cerradura distinta.
2. `batteryLevel`, si no es `null`, debe estar en el rango `[0, 100]`.
3. La combinación `(lock_integration_id, provider_lock_id)` debe ser única en la tabla `locks` (constraint ya existente).
4. `rawData` nunca debe contener secretos (tokens, `lockData` de emparejamiento BLE).

## 9. Ejemplos Válidos

```json
{
  "providerLockId": "4529871",
  "name": "PLDT190_6876dd",
  "batteryLevel": 85,
  "isOnline": true,
  "model": "PLDT190",
  "firmwareVersion": "5.2.1",
  "supportsRemoteUnlock": true
}
```

```json
{
  "providerLockId": "gw-a1b2c3-lock-01",
  "name": "Entrada Principal",
  "batteryLevel": null,
  "isOnline": false,
  "supportsRemoteUnlock": true
}
```

## 10. Ejemplos Inválidos

```json
{
  "providerLockId": "4529871",
  "name": "PLDT190_6876dd",
  "batteryLevel": 150,
  "isOnline": "yes",
  "supportsRemoteUnlock": true
}
```
Inválido por: `batteryLevel` fuera de rango; `isOnline` no es booleano.

## 11. Notas de Versionado

Si se añade un nuevo campo obligatorio en el futuro, debe tratarse como cambio breaking y coordinarse con todas las implementaciones de `ILockProvider` y con `sal-sync-locks`.

## 12. Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
