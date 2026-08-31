# contract-normalized-event.md — NormalizedEvent

## 1. Propósito

`NormalizedEvent` representa un evento histórico de acceso (apertura, intento fallido, batería baja, etc.) reportado por un provider, independientemente de su formato nativo.

## 2. Cuándo se usa

Se produce como resultado de `ILockProvider.listEvents()`, invocado por `sal-sync-lock-records` en cada ciclo de sincronización periódica.

## 3. Productor

Cualquier implementación de `ILockProvider`.

## 4. Consumidor

La Edge Function `sal-sync-lock-records`, que persiste cada evento en `lock_records`, y la UI de "Registros" que los muestra al admin del cliente.

## 5. Estructura

```typescript
interface NormalizedEvent {
  providerRecordId:  string;
  eventType:         string;
  eventAt:           Date;
  actorDescription?: string;
  success:           boolean;
  rawData?:          unknown;
}
```

## 6. Campos Obligatorios

| Campo | Tipo | Descripción |
|---|---|---|
| `providerRecordId` | `string` | Identificador único del evento en el proveedor. Usado para deduplicación en `lock_records`. |
| `eventType` | `string` | Tipo de evento (`unlock_app`, `unlock_passcode`, `unlock_card`, `unlock_fingerprint`, `lock_remote`, `remote_unlock`, `failed_attempt`, `battery_low`, entre otros). |
| `eventAt` | `Date` | Momento en que ocurrió el evento según el proveedor (no el momento de la sincronización). |
| `success` | `boolean` | Si el evento representa una operación exitosa o fallida. |

## 7. Campos Opcionales

| Campo | Obligatorio cuando | Descripción |
|---|---|---|
| `actorDescription` | El proveedor lo reporta | Descripción del actor que generó el evento (ej. nombre asociado al PIN usado). No debe usarse como identificador único. |
| `rawData` | Recomendado siempre | Payload crudo del proveedor para depuración. |

## 8. Reglas de Validación

1. `providerRecordId` es la clave de deduplicación: `sal-sync-lock-records` no debe insertar dos filas en `lock_records` con el mismo `(lock_id, provider_record_id)`.
2. `eventType` debe ser un valor de un catálogo controlado y documentado (no texto libre arbitrario); valores no reconocidos deben mapearse a `unknown` y conservar el original en `rawData`.
3. `eventAt` debe estar en UTC.
4. Este contrato no debe transportar PII adicional del inquilino más allá de lo que el proveedor ya expone en `actorDescription` (que suele ser solo el nombre asociado al PIN, no datos de contrato).

## 9. Ejemplos Válidos

```json
{
  "providerRecordId": "rec-99213",
  "eventType": "unlock_passcode",
  "eventAt": "2026-08-01T14:03:22Z",
  "actorDescription": "Juan Pérez — checkin 2026-08-01",
  "success": true
}
```

```json
{
  "providerRecordId": "rec-99214",
  "eventType": "battery_low",
  "eventAt": "2026-08-02T09:00:00Z",
  "success": true
}
```

## 10. Ejemplos Inválidos

```json
{
  "providerRecordId": "rec-99213",
  "eventType": "unlock_passcode",
  "eventAt": "01/08/2026 14:03",
  "success": "true"
}
```
Inválido: `eventAt` no está en formato ISO 8601; `success` no es booleano.

## 11. Notas de Versionado

Ampliar el catálogo de `eventType` no es un cambio breaking mientras se mantenga el valor `unknown` como fallback para tipos no reconocidos por consumidores antiguos.

## 12. Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
