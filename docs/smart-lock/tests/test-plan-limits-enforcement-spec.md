# test-plan-limits-enforcement-spec.md — Especificación de Pruebas: Límites y Capacidades de Plan

## 1. Objetivo

Verificar que los límites numéricos y las capacidades booleanas de `SalPlanConfiguration` se aplican correctamente en backend antes de crear cualquier recurso limitable, según `rules-21-subscription-plan-configuration.md`.

## 2. Alcance

| Incluye | Excluye |
|---|---|
| Validación de `max_locks`, `max_actors`, `max_groups`, `max_gateways` | Facturación y cobro real de Stripe |
| Validación de capacidades booleanas (`provider_local_ble`, `remote_unlock`, `common_areas`, etc.) | UI de anticipación de límites (no autoritativa) |
| Comportamiento tras cambio de plan | |

## 3. Reglas y Contratos Cubiertos

| Documento | Sección | Qué se verifica |
|---|---|---|
| `rules-21-subscription-plan-configuration.md` | §4.3 | Validación de límites numéricos antes de insertar |
| `rules-21-subscription-plan-configuration.md` | §4.4 | Validación de capacidades booleanas |
| `contract-subscription-plan-configuration.md` | §8 | Valores por defecto restrictivos ante `feature_code` ausente |

## 4. Precondiciones

- Cliente de prueba con suscripción activa a `smart_access_lock`.
- Dos planes de prueba: `smart_access_lock_basic` (`max_locks=20`, `provider_local_ble=false`) y `smart_access_lock_enterprise` (`max_locks=null`, `provider_local_ble=true`).

## 5. Escenarios de Prueba

**PLAN-01: Bloqueo al alcanzar `max_locks`**
- Precondición: cliente en plan básico con 20 cerraduras activas.
- Acción: `sal-sync-locks` detecta 1 cerradura nueva en el proveedor.
- Resultado esperado: `{ ok: false, error: { code: "PLAN_LIMIT_EXCEEDED", detail: { limit: 20, current: 20, requested: 1 } } }`; la cerradura nueva no se inserta.

**PLAN-02: Plan enterprise sin límite**
- Precondición: cliente en plan enterprise (`max_locks = null`) con 500 cerraduras activas.
- Acción: sincronizar 10 cerraduras más.
- Resultado esperado: inserción exitosa sin error de límite.

**PLAN-03: Capacidad booleana ausente bloquea la operación**
- Precondición: cliente en plan básico (`provider_local_ble = false`).
- Acción: intentar `sal-connect-integration` con `provider = 'ttlock_ble'`.
- Resultado esperado: `{ ok: false, error: { code: "FORBIDDEN" } }`.

**PLAN-04: Capacidad booleana presente permite la operación**
- Precondición: cliente en plan enterprise (`provider_local_ble = true`).
- Acción: mismo intento que PLAN-03.
- Resultado esperado: la conexión de integración continúa su flujo normal (sin bloqueo por plan; puede fallar por otras razones ajenas a este test).

**PLAN-05: `feature_code` ausente en `features` se resuelve al valor más restrictivo**
- Precondición: plan de prueba cuyo `features` no incluye la clave `audit_logs`.
- Acción: resolver `SalPlanConfiguration` para un cliente de ese plan.
- Resultado esperado: `auditLogs = false` (no `undefined`, no error).

**PLAN-06: Cambio de plan se refleja sin cambios de código**
- Precondición: cliente en plan básico, alcanza el límite de 20 cerraduras (PLAN-01 aplicado).
- Acción: cambiar `saas_service_subscriptions.plan_id` al plan enterprise vía `sal-change-plan`.
- Resultado esperado: la siguiente sincronización de cerraduras adicionales se completa sin error de límite, sin necesidad de desplegar código nuevo.

**PLAN-07: Upgrade siempre permitido independientemente del uso**
- Precondición: cliente en plan básico con 20/20 cerraduras, 5/5 actores, sin zonas comunes (plan básico no las soporta).
- Acción: `sal-change-plan` hacia el plan enterprise (`max_locks=null`, `max_actors=null`, `common_areas=true`).
- Resultado esperado: cambio aplicado sin conflictos, `conflicts = []`.

**PLAN-08: Downgrade bloqueado por límite numérico superado**
- Precondición: cliente en plan enterprise con 35 cerraduras activas.
- Acción: `sal-change-plan` hacia el plan básico (`max_locks = 20`).
- Resultado esperado: `{ ok: false, error: { code: "PLAN_DOWNGRADE_BLOCKED", detail: { conflicts: [{ resource: "locks", current: 35, newLimit: 20 }] } } }`; `plan_id` no se modifica.

**PLAN-09: Downgrade bloqueado por capacidad booleana con recursos activos**
- Precondición: cliente en plan enterprise con 3 zonas comunes activas (`common_areas = true`).
- Acción: `sal-change-plan` hacia un plan que tiene `common_areas = false`.
- Resultado esperado: `{ ok: false, error: { code: "PLAN_DOWNGRADE_BLOCKED", detail: { conflicts: [{ capability: "commonAreas", activeResources: 3 }] } } }`; `plan_id` no se modifica.

**PLAN-10: Downgrade permitido cuando el uso cabe en el nuevo plan**
- Precondición: cliente en plan enterprise con solo 10 cerraduras activas y sin zonas comunes creadas.
- Acción: `sal-change-plan` hacia el plan básico (`max_locks = 20`, `common_areas = false`).
- Resultado esperado: cambio aplicado sin conflictos; `plan_id` actualizado.

**PLAN-11: Downgrade con múltiples conflictos simultáneos**
- Precondición: cliente con 35 cerraduras, 8 actores (plan destino `max_actors = 5`), y 2 zonas comunes (plan destino `common_areas = false`).
- Acción: `sal-change-plan` hacia el plan básico.
- Resultado esperado: `conflicts` contiene las tres entradas simultáneamente (locks, actors, commonAreas); ninguno de los tres se resuelve parcialmente.

**PLAN-12: Downgrade no desactiva recursos automáticamente**
- Precondición: mismo escenario que PLAN-09 (bloqueado).
- Acción: verificar el estado de las 3 zonas comunes tras el intento de cambio bloqueado.
- Resultado esperado: las 3 zonas comunes siguen `is_active = true`, sin ninguna desactivación automática; el cliente debe desactivarlas manualmente y reintentar el cambio de plan.

## 6. Resultados Esperados

Todos los escenarios PLAN-01 a PLAN-06 deben pasar. Ningún límite debe aplicarse solo en frontend sin respaldo en backend.

## 7. Casos Negativos

| ID | Caso negativo | Resultado esperado |
|---|---|---|
| PLAN-NEG-01 | Una Edge Function inserta la cerradura y luego valida el límite (orden invertido) | Debe fallar PLAN-01 por posible condición de carrera |
| PLAN-NEG-02 | El frontend bloquea la UI pero la Edge Function no valida nada | Debe fallar PLAN-01 al invocar la Edge Function directamente sin pasar por la UI |
| PLAN-NEG-03 | `resolveSalPlanConfiguration()` lanza excepción no controlada ante `features = null` | Debe fallar PLAN-05 — debe resolver valores por defecto, no lanzar excepción |
| PLAN-NEG-04 | `sal-change-plan` permite un downgrade y desactiva automáticamente cerraduras/zonas comunes para encajar en el límite nuevo | Debe fallar PLAN-12 — ningún downgrade puede desactivar recursos sin confirmación explícita del cliente |
| PLAN-NEG-05 | Se modifica `saas_service_subscriptions.plan_id` directamente (bypass de `sal-change-plan`) | Debe detectarse en revisión de código/RLS: ninguna vía distinta a `sal-change-plan` debe poder escribir `plan_id` |
| PLAN-NEG-06 | Un upgrade se bloquea incorrectamente por comparar mal la dirección del cambio | Debe fallar PLAN-07 |

## 8. Datos de Prueba

- Plan básico: `{ max_locks: 20, provider_local_ble: false, actors: true, max_actors: 5, common_areas: false }`.
- Plan enterprise: `{ max_locks: null, provider_local_ble: true, actors: true, max_actors: null, common_areas: true }`.

## 9. Criterio de Aceptación

- [ ] PLAN-01 a PLAN-12 pasan en el entorno de test.
- [ ] PLAN-NEG-01 a PLAN-NEG-06 están cubiertos por revisión de código o test automatizado.

## 10. Dependencias

- `rules-21-subscription-plan-configuration.md`
- `skill-enforce-plan-limits.md`
- `REQ-SL-000-smart-lock-capability.md`
