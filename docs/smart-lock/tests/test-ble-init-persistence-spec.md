# test-ble-init-persistence-spec.md — Especificación de Pruebas: Persistencia de `lockData` (Anti-Bricking)

## 1. Objetivo

Verificar que la secuencia de emparejamiento BLE nunca permite continuar el flujo ni cerrar el proceso del gateway sin haber confirmado la doble persistencia de `lockData` (local + Vault), según `rules-50-ttlock-ble-provider.md` y `skill-vault-lockdata-persistence.md`.

## 2. Alcance

| Incluye | Excluye |
|---|---|
| Secuencia `initLock()` → persistencia local → persistencia remota | Conectividad BLE de bajo nivel (scan, connect) |
| Comportamiento ante fallo de red durante la persistencia | Rendimiento del SDK BLE |
| Comportamiento ante `SIGTERM`/`SIGINT` durante la ventana crítica | |

## 3. Reglas y Contratos Cubiertos

| Documento | Sección | Qué se verifica |
|---|---|---|
| `rules-50-ttlock-ble-provider.md` | §4.1 | Orden obligatorio tras `initLock()` |
| `rules-50-ttlock-ble-provider.md` | §6 (prohibiciones) | Ningún `process.exit()` antes de confirmar persistencia |
| `contract-vault-lockdata.md` | §8 | Estructura y validación del payload persistido |

## 4. Precondiciones

- Entorno de test con un mock del SDK BLE que simula `initLock()` devolviendo un `lockData` sintético.
- Mock de la Edge Function `sal-gateway-store-lockdata` que puede configurarse para responder con éxito, error, o timeout.
- Acceso a la cache local SQLite simulada del gateway.

## 5. Escenarios de Prueba

**BLE-01: Persistencia exitosa en el camino feliz**
- Acción: ejecutar `initLock()` seguido de `persistLockDataOrThrow()` con el mock de Supabase respondiendo 200 OK.
- Resultado esperado: `lockData` presente en cache local y confirmado como sincronizado; el flujo continúa con éxito.

**BLE-02: Fallo de red tras `initLock()`, con recuperación posterior**
- Acción: configurar el mock de Supabase para fallar las primeras 2 veces y responder 200 OK a la tercera.
- Resultado esperado: `persistLockDataOrThrow()` reintenta con backoff y finalmente confirma; el flujo no continúa hasta la confirmación.

**BLE-03: Fallo de red persistente (nunca confirma)**
- Acción: configurar el mock de Supabase para fallar siempre.
- Resultado esperado: tras agotar `MAX_RETRIES`, se lanza el error crítico documentado; la UI del gateway NO debe reportar "emparejamiento exitoso"; el `lockData` permanece en cache local para reintento en segundo plano.

**BLE-04: `SIGTERM` durante la ventana de persistencia**
- Acción: enviar `SIGTERM` al proceso del gateway justo después de que `initLock()` devuelva pero antes de que se confirme la persistencia remota.
- Resultado esperado: el `lockData` no se pierde (ya persistido en SQLite local en el Paso A de la secuencia); al reiniciar el proceso, se detecta el `lockData` pendiente de confirmar y se reintenta la sincronización con Vault antes de aceptar nuevos comandos.

**BLE-05: Verificación de orden — local antes que remoto**
- Acción: instrumentar la secuencia para verificar el orden real de las operaciones.
- Resultado esperado: la escritura en SQLite local (Paso A) ocurre siempre antes que el intento de escritura remota (Paso B), nunca al revés ni en paralelo sin orden garantizado.

**BLE-06: Recuperación de `lockData` en gateway reinstalado**
- Precondición: `lockData` ya confirmado en Vault en un ciclo de prueba anterior; cache local del gateway vaciada (simulando reinstalación).
- Acción: el gateway arranca y solicita `sal-gateway-get-lockdata` para las cerraduras que tiene asignadas.
- Resultado esperado: `lockData` recuperado correctamente y disponible para nuevas operaciones sin necesidad de re-emparejar físicamente.

## 6. Resultados Esperados

Ningún escenario debe resultar en pérdida irreversible de `lockData`. El único estado aceptable de "fallo" es "pendiente de confirmar remotamente, con reintento en curso", nunca "perdido".

## 7. Casos Negativos

| ID | Caso negativo | Resultado esperado |
|---|---|---|
| BLE-NEG-01 | El código llama `process.exit()` inmediatamente después de `initLock()` sin esperar la persistencia | Debe detectarse en revisión de código como violación de `rules-50` §6; test BLE-04 debe fallar si esto ocurre |
| BLE-NEG-02 | La persistencia remota se implementa como `fire-and-forget` (sin `await`) | Test BLE-01/BLE-02 deben fallar por no poder verificar confirmación síncrona |
| BLE-NEG-03 | Se publica `lockData` por MQTT en lugar de HTTPS síncrono | Violación de `rules-60-gateway-communication.md` §6 |

## 8. Datos de Prueba

- `lockData` sintético: cadena opaca de prueba (no un valor real de producción).
- `gateway_id` de prueba fijo para todos los escenarios.

## 9. Criterio de Aceptación

- [ ] BLE-01 a BLE-06 pasan en el entorno de test con mocks.
- [ ] BLE-NEG-01 a BLE-NEG-03 están cubiertos por revisión de código automatizada o manual antes de cada release del gateway.
- [ ] Cero incidentes de bricking reportados en pruebas de caos antes de cualquier despliegue a producción del provider `ttlock_ble`.

## 10. Dependencias

- `rules-50-ttlock-ble-provider.md`
- `skill-vault-lockdata-persistence.md`
- `contract-vault-lockdata.md`
- `REQ-SL-000-smart-lock-capability.md`
