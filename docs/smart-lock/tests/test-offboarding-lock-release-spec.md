# test-offboarding-lock-release-spec.md — Especificación de Pruebas: Liberación de Cerraduras al Cancelar

## 1. Objetivo

Verificar que la cancelación de la suscripción SmartLock dispara automáticamente el flujo de liberación de cerraduras físicas, y que ningún proceso de purga actúa sobre datos en estado `pending_release`, según `rules-70-subscription-cancellation-and-lock-release.md`.

## 2. Alcance

| Incluye | Excluye |
|---|---|
| Disparo automático del flujo al cancelar | Detalle de la UI de instrucciones al cliente (cubierto por tests de frontend) |
| Rama de liberación para provider `ttlock` cloud | Facturación real de Stripe |
| Rama de liberación para provider `ttlock_ble` local | |
| Salvaguarda anti-purga-ciega | |
| Reactivación durante `pending_release` | |

## 3. Reglas y Contratos Cubiertos

| Documento | Sección | Qué se verifica |
|---|---|---|
| `rules-70-subscription-cancellation-and-lock-release.md` | §4.1 | Disparo automático del flujo |
| `rules-70-subscription-cancellation-and-lock-release.md` | §4.2 | Liberación cloud (transferencia de propiedad) |
| `rules-70-subscription-cancellation-and-lock-release.md` | §4.3 | Liberación BLE local (exportación / factory reset) |
| `rules-70-subscription-cancellation-and-lock-release.md` | §4.4 | Salvaguarda anti-purga-ciega |
| `rules-20-tenant-activation-and-lifecycle.md` | §4.3 punto 5 | Integración de la liberación en el ciclo de vida de suscripción |

## 4. Precondiciones

- Cliente A: suscripción activa con integración `provider = 'ttlock'` y cerraduras sincronizadas.
- Cliente B: suscripción activa con integración `provider = 'ttlock_ble'`, gateway registrado, y `lockData` almacenado en Vault.
- Mock del job de purga automática configurado para ejecutarse sobre datos de prueba.

## 5. Escenarios de Prueba

**OFFB-01: Cancelación dispara `pending_release` (cloud)**
- Acción: cambiar `saas_service_subscriptions.status` del Cliente A a `cancelled`.
- Resultado esperado: `lock_integrations.status` pasa a `pending_release`; se genera notificación con instrucciones de transferencia de propiedad; se registra `audit_log` con `action = 'sal_release_initiated'`.

**OFFB-02: Cancelación dispara `pending_release` (BLE local)**
- Acción: cambiar `saas_service_subscriptions.status` del Cliente B a `cancelled`.
- Resultado esperado: `lock_integrations.status` pasa a `pending_release`; se presentan las 3 opciones de liberación (exportar, factory reset, plan reducido).

**OFFB-03: Completar transferencia de propiedad marca `released` (cloud)**
- Precondición: Cliente A en `pending_release`, transferencia de propiedad completada en TTLock (verificable porque la cerradura ya no aparece en el shard).
- Acción: ejecutar `sal-sync-locks` o el endpoint de confirmación de transferencia.
- Resultado esperado: `lock_integrations.status = 'released'`; `locks.is_active = false` para las cerraduras transferidas.

**OFFB-04: Exportación de `lockData` queda auditada (BLE local)**
- Precondición: Cliente B en `pending_release`, elige exportar `lockData`.
- Acción: confirmar exportación con autenticación reforzada.
- Resultado esperado: descarga cifrada de un solo uso entregada; `audit_log` registra `action = 'lockdata_exported'` con actor y `lock_id`; el `lockData` no se transmite en texto plano por ningún canal (email, chat).

**OFFB-05: Factory reset asistido marca `released` (BLE local)**
- Precondición: Cliente B en `pending_release`, elige factory reset asistido.
- Acción: confirmar reset físico completado.
- Resultado esperado: `lockData` correspondiente se elimina de Vault (sí es seguro en este caso); `lock_integrations.status = 'released'`.

**OFFB-06: Salvaguarda anti-purga-ciega**
- Precondición: Cliente A en `pending_release` sin haber completado ninguna acción, dentro del periodo de retención.
- Acción: ejecutar el job de purga simulado.
- Resultado esperado: el job se abstiene de purgar cualquier dato de ese cliente; genera alerta a superadmin en lugar de actuar.

**OFFB-07: Reactivación durante `pending_release` restaura sin reconfiguración**
- Precondición: Cliente A en `pending_release`, sin haber completado la liberación.
- Acción: cambiar `saas_service_subscriptions.status` de vuelta a `active`.
- Resultado esperado: `lock_integrations.status` vuelve a `connected` (tras `testConnection()` exitoso); no se requiere resincronización manual; cualquier recordatorio pendiente se cancela.

## 6. Resultados Esperados

Ningún escenario debe resultar en pérdida de acceso del cliente a sus cerraduras físicas sin una vía explícita de recuperación ya ofrecida y documentada.

## 7. Casos Negativos

| ID | Caso negativo | Resultado esperado |
|---|---|---|
| OFFB-NEG-01 | El job de purga borra `lockData` de un cliente en `pending_release` | Debe fallar OFFB-06 — violación crítica de `rules-70` §4.4 |
| OFFB-NEG-02 | La cancelación no dispara ningún flujo de liberación (solo cambia el estado de suscripción) | Debe fallar OFFB-01/OFFB-02 |
| OFFB-NEG-03 | Se exporta `lockData` por email en texto plano | Debe fallar OFFB-04 — violación de `rules-70` §4.3 punto 3 |
| OFFB-NEG-04 | Se revoca el token OAuth del shard inmediatamente al cancelar, antes de que el cliente pueda transferir sus cerraduras | Debe fallar OFFB-01/OFFB-03 |

## 8. Datos de Prueba

- Cliente A: `client_account_id` con integración `ttlock`, 3 cerraduras sincronizadas.
- Cliente B: `client_account_id` con integración `ttlock_ble`, 1 gateway, 2 cerraduras con `lockData` en Vault.

## 9. Criterio de Aceptación

- [ ] OFFB-01 a OFFB-07 pasan en el entorno de test.
- [ ] OFFB-NEG-01 a OFFB-NEG-04 están cubiertos por revisión de código o test automatizado que los detecta.
- [ ] Ningún escenario de purga real (no simulada) se ejecuta sin pasar primero estos tests en CI.

## 10. Dependencias

- `rules-70-subscription-cancellation-and-lock-release.md`
- `rules-20-tenant-activation-and-lifecycle.md`
- `skill-offboard-client-locks.md`
- `REQ-SL-000-smart-lock-capability.md`
