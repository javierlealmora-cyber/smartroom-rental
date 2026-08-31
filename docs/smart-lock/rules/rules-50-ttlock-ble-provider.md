# rules-50-ttlock-ble-provider.md — Provider TTLock BLE Local (Fase 2)

## 1. Propósito

Definir las reglas del provider `ttlock_ble`, su dependencia de un gateway físico, y la regla crítica de persistencia de `lockData` para evitar la pérdida irreversible de cerraduras (bricking).

## 2. Alcance

Aplica a:
- `providers/ttlock-ble.ts` (futuro).
- El repositorio separado del SDK BLE (`smartroom-ttlock-ble`).
- `lock_gateways`, `lock_gateway_links`, `lock_gateway_claim_sessions`.
- El campo `locks.lock_key_vault_ref`.

## 3. Decisiones No Negociables

1. El SDK BLE (`ttlock-sdk-js` o equivalente) se ejecuta exclusivamente en un dispositivo físico (gateway) instalado en el alojamiento del cliente. Nunca en Supabase.

2. El gateway físico es hardware y software propiedad de SmartRoom Rental, distribuido como imagen Docker versionada. El cliente lo instala y enciende; no lo modifica.

3. El emparejamiento de una cerradura (`initLock()`) genera un `lockData` (credencial criptográfica de sesión BLE) que debe persistirse de forma inmediata y verificada en **dos lugares**: el Vault de Supabase (fuente de verdad, referenciado por `locks.lock_key_vault_ref`) y la cache local SQLite del gateway. Ningún proceso puede terminar (`process.exit()` o equivalente) antes de confirmar ambas persistencias.

4. La pérdida de `lockData` sin copia de respaldo dejará la cerradura permanentemente inutilizable para gestión remota, salvo un nuevo factory reset físico. Esta regla existe específicamente para prevenir la repetición de un incidente ya ocurrido en el spike técnico (pérdida de la unidad S534 por no persistir `lockData` antes de un `process.exit()`).

5. `provider = 'ttlock_ble'` nunca tiene `pool_id` asignado (no hay modelo de shards para BLE local).

## 4. Reglas Obligatorias

### 4.1 Orden obligatorio tras `initLock()`

```
1. initLock() completa el emparejamiento y produce lockData
2. INMEDIATAMENTE:
   a. Persistir lockData en SQLite local del gateway
   b. POST a Supabase (sal-gateway-store-lockdata) con lockData cifrado
   c. Esperar confirmación 200 OK de Supabase
3. Solo tras confirmar (a) y (b): continuar el flujo (ej. asignar la cerradura a una habitación)
4. Nunca ejecutar process.exit() entre los pasos 1 y 3
```

Si el paso 2b falla (sin conexión a Supabase), el gateway debe reintentar con backoff exponencial mientras mantiene el `lockData` en su cache local, y no debe considerarse completo el emparejamiento hasta confirmar la persistencia remota.

### 4.2 Recuperación de `lockData`

Si el gateway pierde su cache local (reinstalación, fallo de disco), debe recuperar `lockData` de cada cerradura vía `GET sal-gateway-get-lockdata?lock_id=...` antes de intentar cualquier comando BLE sobre esa cerradura.

### 4.3 Requisitos del gateway físico

- Hardware: dispositivo Linux con radio BLE (integrada o dongle USB), con conectividad a internet estable (WiFi o Ethernet).
- Software: imagen Docker mantenida por SmartRoom Rental, con `ttlock-sdk-js` (o SDK equivalente validado), cliente de transporte (ver `rules-60-gateway-communication.md`), y cache SQLite local.
- Cada gateway se identifica de forma única (`lock_gateways.id`) y se autentica ante Supabase con un JWT propio (ver `rules-60`).

### 4.4 Comandos cuando el gateway está offline

Si un comando (crear PIN, revocar, unlock remoto) se emite mientras el gateway asociado está offline, debe encolarse en `lock_sync_commands` con estado `pending`. Al reconectar, el gateway debe drenar la cola en orden de creación, con reintento y reporte de resultado por cada comando.

### 4.5 Credenciales soportadas y sus limitaciones

| Credencial | Gestión remota | Requiere presencia física |
|---|---|---|
| PIN / passcode | Completa | No |
| Tarjeta RFID | Alta y revocación | Sí, para el alta (acercar tarjeta a la cerradura) |
| Huella dactilar | Alta y revocación | Sí, para el alta (poner el dedo varias veces) |
| App / eKey | Indirecta vía comando remoto a través del gateway | No (para unlock); sí si se desea eKey BLE directo desde el móvil del inquilino, fuera de alcance de v1 |

v1 de `ttlock_ble` soporta como mínimo PIN. RFID y huella se documentan como ampliación en `skill-implement-ble-provider.md`.

## 5. Casos Permitidos

- Migrar un cliente de `ttlock` (cloud) a `ttlock_ble` (local) sin cambiar el modelo de datos de negocio (grants, actores, grupos).
- Un gateway gestionando varias cerraduras del mismo alojamiento.
- Reinstalar un gateway desde cero y recuperar el estado completo desde Supabase.

## 6. Casos Prohibidos

- Ejecutar `process.exit()` (o finalizar el proceso del gateway) antes de confirmar la doble persistencia de `lockData`.
- Persistir `lockData` solo en local sin sincronizar con el Vault de Supabase.
- Intentar un comando BLE sobre una cerradura sin `lockData` disponible localmente o recuperable desde Supabase.
- Asignar `pool_id` a una integración `ttlock_ble`.

## 7. Impacto en Diseño

- El flujo de "Registrar cerradura nueva" en la UI de `ttlock_ble` debe mostrar un estado explícito de progreso ("Emparejando... Guardando credenciales... Confirmado") para que el operador no interrumpa el proceso.

## 8. Impacto en Implementación

- El código del gateway debe implementar la secuencia de la sección 4.1 como una única función atómica con manejo de errores explícito en cada paso, nunca como pasos sueltos que puedan omitirse.
- Debe existir un test de integración que simule un fallo de red justo después de `initLock()` y verifique que el `lockData` no se pierde.

## 9. Dependencias

Depende de:
- `rules-00-scope-and-principles.md`
- `rules-10-provider-model.md`
- `rules-60-gateway-communication.md`
- `contract-vault-lockdata.md`

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`

## 10. Checklist de Validación

- [ ] La doble persistencia de `lockData` está implementada como paso atómico.
- [ ] Ningún `process.exit()` ocurre antes de confirmar ambas persistencias.
- [ ] `ttlock_ble` nunca tiene `pool_id`.
- [ ] Existe test de fallo de red tras `initLock()`.

## 11. Notas de Control de Cambios

Esta regla nace directamente de un incidente real (pérdida de la cerradura S534 durante el spike técnico por no persistir `lockData` antes de cerrar el proceso). No debe relajarse sin una alternativa de mitigación equivalente.
