# test-shard-capacity-spec.md — Especificación de Pruebas: Capacidad y Balanceo de Shards

## 1. Objetivo

Verificar que el modelo de shards del provider `ttlock` cloud respeta los límites de capacidad, balancea correctamente nuevas asignaciones, y aprovisiona shards nuevos antes de saturar los existentes, según `rules-40-ttlock-cloud-provider.md` y `skill-shard-management.md`.

## 2. Alcance

| Incluye | Excluye |
|---|---|
| Selección de shard por ocupación relativa | Comunicación real con la API de TTLock (se usa mock) |
| Aprovisionamiento automático al superar el 80% | Renovación de tokens OAuth (parcialmente cubierto aquí, detalle en `rules-90`) |
| Bloqueo de shards (`is_blocked`) | |

## 3. Reglas y Contratos Cubiertos

| Documento | Sección | Qué se verifica |
|---|---|---|
| `rules-40-ttlock-cloud-provider.md` | §4.1 | Aprovisionamiento de shard nuevo |
| `rules-40-ttlock-cloud-provider.md` | §4.2 | Asignación de cliente a shard con margen |
| `skill-shard-management.md` | Paso 2 | Selección por ocupación relativa |

## 4. Precondiciones

- Al menos 2 shards de prueba (`lock_provider_pools`) con distinta ocupación.
- Mock de la API de registro de sub-cuentas TTLock.

## 5. Escenarios de Prueba

**SHARD-01: Selección del shard con menor ocupación relativa**
- Precondición: Shard A con 300/500 locks (60%), Shard B con 100/500 locks (20%).
- Acción: conectar un cliente nuevo.
- Resultado esperado: el cliente se asigna al Shard B (menor ocupación relativa).

**SHARD-02: Aprovisionamiento automático al superar el 80%**
- Precondición: único shard activo con 405/500 locks (81%).
- Acción: conectar un cliente nuevo.
- Resultado esperado: se aprovisiona un shard nuevo antes de asignar el cliente; el cliente se asigna al shard recién creado, no al saturado.

**SHARD-03: Shard bloqueado no recibe asignaciones nuevas**
- Precondición: shard con `is_blocked = true` y menor ocupación relativa que el resto.
- Acción: conectar un cliente nuevo.
- Resultado esperado: el shard bloqueado se excluye de la selección; se asigna al siguiente shard disponible no bloqueado.

**SHARD-04: `ttlock_ble` nunca recibe `pool_id`**
- Acción: conectar una integración con `provider = 'ttlock_ble'`.
- Resultado esperado: `lock_integrations.pool_id` permanece `NULL`; no se crea fila en `lock_provider_pool_assignments`.

**SHARD-05: Monitorización de ocupación visible en superadmin**
- Acción: cargar `SalShardsList`.
- Resultado esperado: cada shard muestra `current_locks_count / max_locks` y `current_clients_count / max_clients` actualizados.

**SHARD-06: Asignación manual a shard saturado se rechaza**
- Precondición: superadmin intenta asignar manualmente un cliente a un shard con `current_locks_count = 500 / max_locks = 500`.
- Acción: confirmar la asignación manual desde `SalShardsList`.
- Resultado esperado: la asignación se rechaza antes de escribir en BBDD; la UI ofrece "Aprovisionar shard nuevo" como acción directa.

**SHARD-07: Asignación manual con token OAuth inválido**
- Precondición: shard destino con margen de capacidad pero `access_token` inválido/revocado.
- Acción: superadmin confirma la asignación manual.
- Resultado esperado: la fila en `lock_provider_pool_assignments` se crea, pero `lock_integrations.status` queda en `error` (nunca `connected`); se genera una alerta a superadmin con el detalle del fallo.

**SHARD-08: Asignación manual con asignación previa activa**
- Precondición: cliente ya tiene `lock_provider_pool_assignments.status = 'active'` para `provider = 'ttlock'`.
- Acción: superadmin intenta asignar el mismo cliente a un shard distinto sin cerrar la asignación anterior.
- Resultado esperado: la operación se bloquea con mensaje explícito exigiendo cerrar o migrar la asignación existente primero.

## 6. Resultados Esperados

El sistema nunca debe asignar un cliente a un shard que quede por encima del 100% de su capacidad tras la asignación, y siempre debe preferir el shard con menor ocupación relativa disponible.

## 7. Casos Negativos

| ID | Caso negativo | Resultado esperado |
|---|---|---|
| SHARD-NEG-01 | Se asigna un cliente a un shard ya al 100% | Debe fallar SHARD-02 — el sistema debe haber aprovisionado uno nuevo antes |
| SHARD-NEG-02 | Se asigna `pool_id` a una integración `ttlock_ble` | Debe fallar SHARD-04 |

## 8. Datos de Prueba

- Shard A: `current_locks_count = 300`, `max_locks = 500`.
- Shard B: `current_locks_count = 100`, `max_locks = 500`.
- Shard C: `current_locks_count = 405`, `max_locks = 500`, único activo.

## 9. Criterio de Aceptación

- [ ] SHARD-01 a SHARD-08 pasan en el entorno de test.
- [ ] Ningún shard supera el 100% de capacidad en ningún escenario de prueba.
- [ ] Ninguna asignación fallida deja `lock_integrations.status = 'connected'`.

## 10. Dependencias

- `rules-40-ttlock-cloud-provider.md`
- `skill-shard-management.md`
- `REQ-SL-000-smart-lock-capability.md`
