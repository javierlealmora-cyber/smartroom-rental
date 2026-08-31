# test-subscription-gating-spec.md — Especificación de Pruebas: Gating por Suscripción

## 1. Objetivo

Verificar que ningún `client_account` sin suscripción activa al servicio `smart_access_lock` puede ver la UI de SmartLock ni ejecutar ninguna Edge Function `sal-*`, según `rules-20-tenant-activation-and-lifecycle.md`.

## 2. Alcance

| Incluye | Excluye |
|---|---|
| Gating de frontend (`useSalSubscription`, guard de rutas) | Lógica interna de facturación Stripe |
| Gating de backend (`validateSalSubscription`) en todas las Edge Functions `sal-*` | Flujo completo de contratación (cubierto en `test-cloud-mvp-e2e-spec.md`) |
| Transiciones de cancelación y reactivación | Política de purga tras el periodo de retención |

## 3. Reglas y Contratos Cubiertos

| Documento | Sección | Qué se verifica |
|---|---|---|
| `rules-20-tenant-activation-and-lifecycle.md` | §4.1 | Frontend oculta UI sin suscripción activa |
| `rules-20-tenant-activation-and-lifecycle.md` | §4.2 | Backend rechaza con `FORBIDDEN` sin suscripción activa |
| `rules-20-tenant-activation-and-lifecycle.md` | §4.3 | Cancelación no borra datos |
| `rules-20-tenant-activation-and-lifecycle.md` | §4.4 | Reactivación restaura acceso sin reconfiguración |

## 4. Precondiciones

- Dos `client_account` de prueba: uno con `saas_service_subscriptions.status = 'active'` para `smart_access_lock`, otro sin ninguna fila o con `status != 'active'`.
- Al menos una integración de proveedor conectada para el cliente activo.

## 5. Escenarios de Prueba

**GATE-01: Cliente sin suscripción no ve la entrada de menú de SmartLock**
- Precondición: cliente sin fila en `saas_service_subscriptions` para `smart_access_lock`.
- Acción: cargar el panel de administración.
- Resultado esperado: la entrada de menú "SmartLock" no aparece en el DOM (no solo oculta con CSS).

**GATE-02: Cliente sin suscripción no puede navegar directamente a la URL del módulo**
- Precondición: mismo cliente que GATE-01.
- Acción: navegar manualmente a `/v2/admin/smart-lock/...`.
- Resultado esperado: redirección o pantalla de "módulo no contratado", sin exponer datos.

**GATE-03: Cliente sin suscripción recibe `FORBIDDEN` al llamar una Edge Function `sal-*`**
- Precondición: mismo cliente, JWT válido de un usuario admin de ese cliente.
- Acción: invocar `sal-remote-unlock` directamente (bypasseando la UI).
- Resultado esperado: `{ ok: false, error: { code: "FORBIDDEN" } }`, HTTP status 200.

**GATE-04: Cliente con suscripción activa accede con normalidad**
- Precondición: cliente con `status = 'active'`.
- Acción: cargar el panel, navegar al módulo, invocar una Edge Function de lectura.
- Resultado esperado: acceso completo sin errores de gating.

**GATE-05: Cancelar suscripción no borra filas `lock_*`**
- Precondición: cliente activo con cerraduras, actores y grants ya creados.
- Acción: cambiar `saas_service_subscriptions.status` a `cancelled`.
- Resultado esperado: las filas en `locks`, `lock_access_grants`, etc. siguen existiendo íntegras en BBDD.

**GATE-06: Reactivar suscripción restaura acceso sin reconfiguración**
- Precondición: cliente del escenario GATE-05, dentro del periodo de retención (90 días).
- Acción: cambiar `status` de vuelta a `active`.
- Resultado esperado: la UI muestra las mismas cerraduras, actores y grants sin necesidad de resincronizar.

## 6. Resultados Esperados

Todos los escenarios GATE-01 a GATE-06 deben pasar sin excepciones. Ningún escenario debe requerir cambios de código para "activar" el gating: debe funcionar por configuración de datos (`saas_service_subscriptions`).

## 7. Casos Negativos

| ID | Caso negativo | Resultado esperado |
|---|---|---|
| GATE-NEG-01 | Frontend confía en un flag local de `localStorage` en lugar de consultar `saas_service_subscriptions` | Violación de `rules-20` §4.1 — debe fallar la revisión |
| GATE-NEG-02 | Una Edge Function `sal-*` ejecuta lógica de negocio antes de llamar `validateSalSubscription()` | Violación de `rules-20` §4.2 |
| GATE-NEG-03 | Cancelar la suscripción dispara un `DELETE` sobre tablas `lock_*` | Violación de `rules-20` §4.3 |

## 8. Datos de Prueba

- Cliente A: `client_account_id = 'a1111111-...'`, sin suscripción.
- Cliente B: `client_account_id = 'b2222222-...'`, con suscripción activa y 2 cerraduras sincronizadas.

## 9. Criterio de Aceptación

- [ ] GATE-01 a GATE-06 pasan en CI.
- [ ] GATE-NEG-01 a GATE-NEG-03 están cubiertos por revisión de código o test automatizado que los detecta.

## 10. Dependencias

- `rules-20-tenant-activation-and-lifecycle.md`
- `REQ-SL-000-smart-lock-capability.md`
