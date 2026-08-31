# contract-normalized-credential.md — NormalizedCredential

## 1. Propósito

`NormalizedCredential` representa una credencial de acceso (PIN, tarjeta, huella, app key) emitida por un provider, independientemente de su implementación concreta.

## 2. Cuándo se usa

Se produce como resultado de `ILockProvider.createPin()` y `ILockProvider.renewCredential()`. Se consume para persistir metadatos (nunca el valor en claro) en `lock_credentials`.

## 3. Productor

Cualquier implementación de `ILockProvider`.

## 4. Consumidor

Las Edge Functions `sal-grant-access`, `sal-renew-credential`, y el flujo de notificación al inquilino (`sal-*` que envía el PIN por email).

## 5. Estructura

```typescript
interface NormalizedCredential {
  providerCredentialId: string;
  credentialType:       "pin" | "card" | "app_key" | "fingerprint";
  credentialValue?:     string;
  expiresAt?:           Date;
}
```

## 6. Campos Obligatorios

| Campo | Tipo | Descripción |
|---|---|---|
| `providerCredentialId` | `string` | Identificador de la credencial en el proveedor. Se persiste en `lock_credentials.provider_credential_id`. |
| `credentialType` | enum | Tipo de credencial. Se persiste en `lock_credentials.credential_type`. |

## 7. Campos Opcionales

| Campo | Obligatorio cuando | Descripción |
|---|---|---|
| `credentialValue` | Al crear (`createPin`) | Valor en claro (ej. el PIN de 4-8 dígitos). **Nunca debe persistirse en base de datos.** Solo se usa para mostrarlo una vez al operador y/o incluirlo en la notificación al inquilino. |
| `expiresAt` | Credenciales temporales | Fecha de expiración. Ausente para credenciales `permanent`. |

## 8. Reglas de Validación

1. `credentialValue` está prohibido en cualquier tabla de base de datos. Solo puede transitar en memoria durante el request HTTP que lo genera.
2. `credentialType` debe ser uno de los cuatro valores enumerados. Ningún otro valor es válido.
3. `expiresAt`, cuando está presente, debe ser una fecha futura respecto al momento de creación.
4. `providerCredentialId` debe ser único dentro del alcance de una cerradura (`lock_id + provider_credential_id`).
5. Al revocar una credencial, `lock_credentials.status` debe pasar a `revoked` y conservar el registro histórico (nunca se borra la fila).

## 9. Ejemplos Válidos

```json
{
  "providerCredentialId": "88213",
  "credentialType": "pin",
  "credentialValue": "4821",
  "expiresAt": "2026-08-10T11:00:00Z"
}
```

```json
{
  "providerCredentialId": "card-0091",
  "credentialType": "card"
}
```
(Sin `credentialValue` porque las tarjetas no tienen un valor "en claro" transmisible; su alta requiere presencia física, ver `rules-50-ttlock-ble-provider.md`.)

## 10. Ejemplos Inválidos

```json
{
  "providerCredentialId": "88213",
  "credentialType": "temporary_pin",
  "credentialValue": "4821"
}
```
Inválido: `"temporary_pin"` no es un valor válido de `credentialType` (el tipo de vigencia se define en `PinParams.type`, no en `credentialType`).

## 11. Notas de Versionado

Si se añade un nuevo `credentialType` (p. ej. `nfc_tag`), debe actualizarse el enum en este contrato, en `ILockProvider`, y en el `CHECK` de `lock_credentials.credential_type` de forma simultánea.

## 12. Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
