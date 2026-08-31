# contract-vault-lockdata.md — Formato de `lockData` en Vault

## 1. Propósito

Definir la estructura del secreto `lockData` que se persiste en el Vault de Supabase para cada cerradura gestionada por el provider `ttlock_ble`, referenciado desde `locks.lock_key_vault_ref`.

## 2. Cuándo se usa

Se crea inmediatamente después de un emparejamiento exitoso (`initLock()`) en el gateway físico, y se lee cada vez que el gateway necesita recuperar el estado de sesión BLE de una cerradura (por ejemplo, tras reinstalar el gateway).

## 3. Productor

El proceso del gateway físico, a través de la Edge Function `sal-gateway-store-lockdata`, que recibe el `lockData` cifrado en tránsito (TLS) y lo persiste en Vault.

## 4. Consumidor

- La Edge Function `sal-gateway-get-lockdata`, que lo devuelve al gateway cuando necesita recuperarlo.
- Ningún otro componente debe leer este secreto directamente; el acceso siempre pasa por estas dos Edge Functions.

## 5. Estructura

```typescript
interface LockDataVaultPayload {
  lock_id:            string;   // UUID de la fila en `locks`
  provider_lock_id:   string;   // identificador BLE de la cerradura
  lock_data:          string;   // blob opaco del SDK BLE (formato específico del SDK, tratado como opaco por SmartRoom Rental)
  lock_data_version:  number;   // versión del formato, incrementa si el SDK cambia el formato de lockData
  paired_at:          string;   // ISO 8601 UTC — momento del emparejamiento original
  gateway_id:         string;   // UUID del gateway que realizó el emparejamiento
}
```

## 6. Campos Obligatorios

| Campo | Descripción |
|---|---|
| `lock_id` | Debe coincidir con una fila existente en `locks`. |
| `provider_lock_id` | Identificador BLE usado por el SDK para localizar la cerradura. |
| `lock_data` | Contenido opaco generado por el SDK BLE tras `initLock()`. SmartRoom Rental no interpreta su contenido interno, solo lo almacena y lo entrega íntegro. |
| `lock_data_version` | Permite detectar incompatibilidades si el SDK cambia de versión. |
| `paired_at` | Trazabilidad de cuándo se emparejó. |
| `gateway_id` | Trazabilidad de qué gateway hizo el emparejamiento original. |

## 7. Campos Opcionales

Ninguno. Este contrato no admite campos opcionales: todos son necesarios para garantizar recuperación completa ante pérdida del gateway.

## 8. Reglas de Validación

1. `lock_data` nunca debe registrarse en logs, ni en texto plano ni parcialmente.
2. La escritura de este secreto (`sal-gateway-store-lockdata`) debe ser síncrona y devolver confirmación explícita antes de que el gateway continúe su flujo (ver `rules-50-ttlock-ble-provider.md` sección 4.1).
3. Solo el propio gateway que gestiona esa cerradura (autenticado con su JWT) puede solicitar la lectura de su `lockData` vía `sal-gateway-get-lockdata`.
4. Si `lock_data_version` cambia, la Edge Function debe validar compatibilidad antes de entregar el secreto a un gateway con una versión de SDK distinta.
5. Este secreto no debe eliminarse automáticamente al cancelar la suscripción SmartLock del cliente (ver `rules-20-tenant-activation-and-lifecycle.md`); sigue las mismas reglas de retención que el resto de datos `lock_*`.

## 9. Ejemplos Válidos

```json
{
  "lock_id": "550e8400-e29b-41d4-a716-446655440000",
  "provider_lock_id": "gw-a1b2c3-lock-01",
  "lock_data": "<blob-opaco-base64-generado-por-el-sdk>",
  "lock_data_version": 1,
  "paired_at": "2026-07-23T18:26:33Z",
  "gateway_id": "b1c2d3e4-f5a6-7890-abcd-ef1234567890"
}
```

## 10. Ejemplos Inválidos

```json
{
  "lock_id": "550e8400-e29b-41d4-a716-446655440000",
  "lock_data": "<blob-opaco>"
}
```
Inválido: faltan `provider_lock_id`, `lock_data_version`, `paired_at` y `gateway_id`, todos obligatorios.

## 11. Notas de Versionado

Si el SDK BLE cambia el formato interno de `lockData` en una nueva versión, debe incrementarse `lock_data_version` y documentarse la compatibilidad hacia atrás (si el gateway antiguo puede seguir usando `lockData` de versión anterior o requiere re-emparejamiento).

## 12. Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
