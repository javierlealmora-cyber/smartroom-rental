# contract-gateway-event.md — Evento Gateway → Cloud (MQTT)

## 1. Propósito

Definir el payload de los eventos que el gateway físico BLE publica hacia Supabase: resultado de comandos, eventos de acceso detectados localmente, y telemetría.

## 2. Cuándo se usa

Cada vez que el gateway ejecuta un comando (`contract-gateway-command.md`), detecta un evento de acceso físico (PIN, huella, tarjeta), o reporta telemetría periódica.

## 3. Productor

El proceso del gateway físico (repositorio `smartroom-ttlock-ble`).

## 4. Consumidor

El puente de ingesta en Supabase (Edge Function o servicio suscrito al broker MQTT) que materializa estos eventos en `lock_sync_commands` (resultado), `lock_records` (eventos de acceso) y `locks` / `lock_gateways` (telemetría).

## 5. Estructura

```typescript
// Resultado de comando — topic: sal/{gateway_id}/cmd_result
interface GatewayCommandResult {
  command_id: string;
  status:     "success" | "error" | "expired" | "timeout";
  error_message?: string;
  provider_credential_id?: string; // presente si command_type era create_pin/renew_credential y status=success
  executed_at: string; // ISO 8601 UTC
}

// Evento de acceso — topic: sal/{gateway_id}/evt/{event_type}
interface GatewayAccessEvent {
  event_id:    string;   // UUID generado por el gateway, para deduplicación
  lock_id:     string;
  event_type:  string;   // unlock_passcode, unlock_card, unlock_fingerprint, failed_attempt, etc.
  occurred_at: string;   // ISO 8601 UTC
  actor_description?: string;
}

// Telemetría — topic: sal/{gateway_id}/telemetry
interface GatewayTelemetry {
  lock_id:          string;
  battery_level?:   number;
  rssi?:            number;
  firmware_version?: string;
  reported_at:      string;
}
```

## 6. Campos Obligatorios

### `GatewayCommandResult`
| Campo | Descripción |
|---|---|
| `command_id` | Debe coincidir con el `command_id` del comando original. |
| `status` | Resultado de la ejecución. |
| `executed_at` | Momento de ejecución en el gateway. |

### `GatewayAccessEvent`
| Campo | Descripción |
|---|---|
| `event_id` | Clave de deduplicación. |
| `lock_id` | Cerradura donde ocurrió el evento. |
| `event_type` | Tipo de evento. |
| `occurred_at` | Momento del evento. |

### `GatewayTelemetry`
| Campo | Descripción |
|---|---|
| `lock_id` | Cerradura reportada. |
| `reported_at` | Momento del reporte. |

## 7. Campos Opcionales

- `GatewayCommandResult.error_message` — obligatorio cuando `status IN ('error', 'timeout')`.
- `GatewayCommandResult.provider_credential_id` — obligatorio cuando el comando original era `create_pin` o `renew_credential` y `status = 'success'`.
- `GatewayAccessEvent.actor_description` — presente si el gateway puede resolver el nombre asociado a la credencial usada.
- `GatewayTelemetry.battery_level`, `rssi`, `firmware_version` — presentes según lo que el SDK BLE pueda leer en ese ciclo.

## 8. Reglas de Validación

1. `command_id` en `GatewayCommandResult` debe corresponder siempre a un comando previamente emitido y registrado en `lock_sync_commands`. Un `command_id` desconocido debe descartarse y registrarse como anomalía.
2. `event_id` en `GatewayAccessEvent` es la clave de deduplicación equivalente a `providerRecordId` en `NormalizedEvent` (`contract-normalized-event.md`); el puente de ingesta no debe insertar dos filas en `lock_records` con el mismo `event_id`.
3. Todas las fechas (`executed_at`, `occurred_at`, `reported_at`) deben estar en UTC, formato ISO 8601.
4. `GatewayCommandResult.provider_credential_id`, si está presente, nunca debe ir acompañado del valor en claro del PIN en el mismo mensaje (el valor en claro se gestiona por un canal separado y de un solo uso hacia el operador, no por este evento).

## 9. Ejemplos Válidos

```json
{
  "command_id": "b6e1a2f0-1234-4a9b-9d3e-abcdef123456",
  "status": "success",
  "provider_credential_id": "88213",
  "executed_at": "2026-07-30T09:00:04Z"
}
```

```json
{
  "event_id": "evt-77213",
  "lock_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "unlock_passcode",
  "occurred_at": "2026-08-01T14:03:22Z",
  "actor_description": "Juan Pérez"
}
```

## 10. Ejemplos Inválidos

```json
{
  "command_id": "b6e1a2f0-1234-4a9b-9d3e-abcdef123456",
  "status": "error"
}
```
Inválido: falta `error_message` (obligatorio cuando `status = 'error'`) y `executed_at`.

## 11. Notas de Versionado

Añadir un nuevo `event_type` en `GatewayAccessEvent` no es breaking. Cambiar el significado de un `status` existente en `GatewayCommandResult` sí lo es.

## 12. Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
