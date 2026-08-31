# test-cloud-mvp-e2e-spec.md — Especificación de Pruebas E2E: MVP Provider Cloud

## 1. Objetivo

Verificar el flujo end-to-end del provider `ttlock` cloud: conexión de integración, sincronización de cerraduras, asignación a estructura, emisión de credencial, y unlock remoto.

## 2. Alcance

| Incluye | Excluye |
|---|---|
| Flujo completo desde `sal-connect-integration` hasta `sal-remote-unlock` | Flujo del provider `ttlock_ble` (cubierto en `test-ble-init-persistence-spec.md`) |
| Asignación y balanceo de shards | Detalle de UI (cubierto por tests de frontend) |
| Auto-grant/auto-revoke en alta y checkout de inquilino | |

## 3. Reglas y Contratos Cubiertos

| Documento | Sección | Qué se verifica |
|---|---|---|
| `rules-40-ttlock-cloud-provider.md` | §4.2 | Asignación de cliente a shard con margen |
| `contract-normalized-lock.md` | §8 | Mapeo correcto de cerraduras sincronizadas |
| `contract-normalized-credential.md` | §8 | `credentialValue` no persiste en BD |
| `REQ-SL-000-smart-lock-capability.md` | Paso 8-9 | Auto-grant al asignar habitación, auto-revoke al checkout |

## 4. Precondiciones

- `client_account` con suscripción SmartLock activa.
- Cuenta TTLock developer configurada con al menos un shard activo con margen de capacidad.
- Al menos una cerradura de prueba emparejada a la cuenta del shard vía app TTLock (o mock de la API en entorno de test).

## 5. Escenarios de Prueba

**CLOUD-01: Conexión de integración asigna shard con margen**
- Acción: `sal-connect-integration` para un cliente nuevo.
- Resultado esperado: `lock_provider_pool_assignments` creado; `lock_integrations.pool_id` apunta al shard elegido; el shard elegido no supera el 80% de ocupación tras la asignación.

**CLOUD-02: Sincronización de cerraduras**
- Precondición: integración conectada, cerradura de prueba emparejada en el shard.
- Acción: `sal-sync-locks`.
- Resultado esperado: fila creada en `locks` con `provider_lock_id` correcto; `lock_integrations.locks_synced_count` actualizado.

**CLOUD-03: Asignación de cerradura a habitación**
- Acción: `sal-place-lock` con `room_id` de una habitación existente del cliente.
- Resultado esperado: fila creada en `lock_placements` con FK válida a `rooms`.

**CLOUD-04: Emisión de PIN vía `sal-grant-access`**
- Acción: crear grant para un actor sobre la cerradura asignada.
- Resultado esperado: `lock_credentials` creado con `credential_type = 'pin'`; el valor en claro del PIN se devuelve en la respuesta de la Edge Function pero no se persiste en ninguna columna de `lock_credentials`.

**CLOUD-05: Unlock remoto**
- Precondición: cerradura con `supports_remote_unlock = true` y gateway G2 online (o mock).
- Acción: `sal-remote-unlock`.
- Resultado esperado: llamada exitosa a la API de TTLock; `locks.last_remote_operation_result = 'success'`.

**CLOUD-06: Auto-grant al asignar habitación a inquilino**
- Precondición: cerradura con `auto_assign_to_lodger = true` en la habitación.
- Acción: crear `lodger_room_assignments` (INSERT) para un inquilino nuevo.
- Resultado esperado: `sal-process-room-assignment` se dispara (webhook/trigger), crea `lock_access_grants` y `lock_credentials` automáticamente; el inquilino recibe notificación (`lock_notifications`).

**CLOUD-07: Auto-revocación al checkout**
- Precondición: inquilino con grants activos del escenario CLOUD-06.
- Acción: actualizar `lodger_room_assignments.move_out_date`.
- Resultado esperado: `sal-process-checkout` se dispara, revoca todos los `lock_access_grants` activos del inquilino, `lock_credentials.status = 'revoked'`.

## 6. Resultados Esperados

El flujo completo CLOUD-01 a CLOUD-07 debe completarse sin intervención manual salvo el emparejamiento físico inicial (que queda fuera del alcance por depender de hardware real o mock).

## 7. Casos Negativos

| ID | Caso negativo | Resultado esperado |
|---|---|---|
| CLOUD-NEG-01 | `sal-remote-unlock` sobre cerradura sin gateway online | Error explícito indicando causa (gateway offline), no error genérico |
| CLOUD-NEG-02 | `sal-connect-integration` cuando todos los shards están al 100% | Debe aprovisionar un shard nuevo automáticamente, no fallar |
| CLOUD-NEG-03 | `sal-process-checkout` con revocación física fallida (sin gateway) | Revocación en BD completa inmediatamente; revocación física queda pendiente para reconciliación posterior |

## 8. Datos de Prueba

- `client_account_id` de prueba con habitación `HAB-001` y cerradura emparejada.
- Inquilino de prueba para el flujo de auto-grant/auto-revoke.

## 9. Criterio de Aceptación

- [ ] CLOUD-01 a CLOUD-07 pasan en el entorno de test (con mocks de la API de TTLock donde no haya hardware real disponible).
- [ ] CLOUD-NEG-01 a CLOUD-NEG-03 están cubiertos.

## 10. Dependencias

- `rules-40-ttlock-cloud-provider.md`
- `skill-implement-cloud-provider.md`
- `REQ-SL-000-smart-lock-capability.md`
