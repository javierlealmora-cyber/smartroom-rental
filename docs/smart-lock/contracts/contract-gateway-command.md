# contract-gateway-command.md — Comando Cloud → Gateway (MQTT)

## 1. Propósito

Definir el payload exacto de un comando enviado desde Supabase hacia el gateway físico BLE a través del topic MQTT `sal/{gateway_id}/cmd/{command_type}`.

## 2. Cuándo se usa

Cada vez que una Edge Function `sal-*` necesita ejecutar una operación sobre una cerradura gestionada por el provider `ttlock_ble` (crear PIN, revocar credencial, unlock remoto, ping de conectividad).

## 3. Productor

Las Edge Functions de negocio, a través de `TTLockBleProvider`, que serializa la operación como `GatewayCommand` y la publica en el broker MQTT (o la inserta en `lock_sync_commands` si el gateway está offline).

## 4. Consumidor

El proceso del gateway físico (repositorio `smartroom-ttlock-ble`), que se suscribe a `sal/{gateway_id}/cmd/#`, ejecuta el comando vía BLE, y publica el resultado según `contract-gateway-event.md`.

## 5. Estructura

```typescript
interface GatewayCommand {
  command_id:   string;        // UUID, generado por Supabase — usado para idempotencia
  command_type: "create_pin" | "revoke_credential" | "renew_credential" | "unlock" | "ping";
  lock_id:      string;        // UUID de la fila en `locks`
  provider_lock_id: string;    // Identificador de la cerradura para el SDK BLE
  payload:      Record<string, unknown>; // específico de command_type, ver sección 6
  issued_at:    string;        // ISO 8601 UTC
  expires_at?:  string;        // ISO 8601 UTC — el gateway debe descartar el comando si se recibe después de esta fecha
}
```

## 6. Campos Obligatorios

| Campo | Tipo | Descripción |
|---|---|---|
| `command_id` | `string (UUID v4)` | Clave de idempotencia. El gateway debe deduplicar por este campo. |
| `command_type` | enum | Tipo de operación. |
| `lock_id` | `string (UUID)` | Referencia interna de SmartRoom Rental a la fila `locks`. |
| `provider_lock_id` | `string` | Identificador que el SDK BLE usa para localizar la cerradura físicamente. |
| `payload` | `object` | Estructura dependiente de `command_type` (ver tabla siguiente). |
| `issued_at` | `string (ISO 8601)` | Momento de emisión del comando. |

### Estructura de `payload` según `command_type`

| `command_type` | Campos de `payload` |
|---|---|
| `create_pin` | `{ pin_name: string, start_date: string, end_date?: string, pin_type: "temporary" \| "permanent" \| "one_time" }` |
| `revoke_credential` | `{ provider_credential_id: string }` |
| `renew_credential` | `{ provider_credential_id: string, new_expires_at: string }` |
| `unlock` | `{}` (sin parámetros adicionales) |
| `ping` | `{}` |

## 7. Campos Opcionales

| Campo | Obligatorio cuando | Descripción |
|---|---|---|
| `expires_at` | Recomendado siempre | Evita ejecutar comandos obsoletos tras una reconexión tardía del gateway (por ejemplo, no crear un PIN cuya ventana ya pasó). |

## 8. Reglas de Validación

1. `command_id` debe ser único; el gateway debe ignorar (con ACK duplicado) cualquier comando cuyo `command_id` ya haya procesado.
2. Si `expires_at` está presente y ya pasó en el momento de recepción, el gateway debe reportar el resultado como `expired` (ver `contract-gateway-event.md`) sin ejecutar la operación BLE.
3. El gateway nunca debe ejecutar un comando cuyo `lock_id` no tenga `lockData` disponible localmente; en ese caso debe intentar recuperarlo (`GET sal-gateway-get-lockdata`) antes de fallar definitivamente.
4. `payload` nunca debe contener el valor en claro de una credencial ya emitida (los PIN se generan del lado del gateway o se transmiten cifrados, según se defina en la implementación del SDK).

## 9. Ejemplos Válidos

```json
{
  "command_id": "b6e1a2f0-1234-4a9b-9d3e-abcdef123456",
  "command_type": "create_pin",
  "lock_id": "550e8400-e29b-41d4-a716-446655440000",
  "provider_lock_id": "gw-a1b2c3-lock-01",
  "payload": {
    "pin_name": "Juan Pérez — checkin 2026-08-01",
    "start_date": "2026-08-01T14:00:00Z",
    "end_date": "2026-08-10T11:00:00Z",
    "pin_type": "temporary"
  },
  "issued_at": "2026-07-30T09:00:00Z",
  "expires_at": "2026-08-01T20:00:00Z"
}
```

## 10. Ejemplos Inválidos

```json
{
  "command_id": "b6e1a2f0-1234-4a9b-9d3e-abcdef123456",
  "command_type": "create_pin",
  "lock_id": "550e8400-e29b-41d4-a716-446655440000",
  "payload": { "pin_value": "4821" }
}
```
Inválido: falta `provider_lock_id` e `issued_at`; `payload.pin_value` no debe transmitirse como valor predeterminado del PIN (el valor lo genera el flujo, no se impone desde cloud salvo que el diseño final del SDK lo permita explícitamente, lo cual debe documentarse aquí si cambia).

## 11. Notas de Versionado

Añadir un nuevo `command_type` no es breaking si el gateway ignora de forma segura (con log) los tipos que no reconoce. Cambiar la estructura de `payload` de un `command_type` existente sí es breaking y requiere versionar el contrato.

## 12. Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
