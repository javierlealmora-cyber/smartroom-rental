# skill-implement-ble-provider.md — Implementar el Provider TTLock BLE Local

## 1. Objetivo

Guiar la implementación de `TTLockBleProvider` (`providers/ttlock-ble.ts`) y su contraparte en el gateway físico (repositorio `smartroom-ttlock-ble`), incluyendo el flujo de emparejamiento con persistencia crítica de `lockData`.

## 2. Cuándo Usar Este Skill

- Implementar `providers/ttlock-ble.ts`.
- Implementar el daemon del gateway físico.
- Diseñar el flujo de emparejamiento de una cerradura nueva.
- Diagnosticar pérdida de conexión con un gateway.

## 3. Preconditions

Antes de usar este skill, leer:
- `rules-10-provider-model.md`
- `rules-50-ttlock-ble-provider.md`
- `rules-60-gateway-communication.md`
- `contract-gateway-command.md`, `contract-gateway-event.md`, `contract-vault-lockdata.md`

## 4. Restricciones de Origen

- El SDK BLE nunca se ejecuta en Supabase (restricción física, no de diseño).
- La doble persistencia de `lockData` (Vault + SQLite local) es obligatoria e inmediata tras `initLock()`.
- Toda comunicación gateway → cloud es saliente; nunca al revés.
- `ttlock_ble` nunca usa el modelo de shards.

## 5. Estrategia de Implementación

`TTLockBleProvider` no habla BLE directamente. Traduce las llamadas de `ILockProvider` en comandos (`contract-gateway-command.md`) publicados por MQTT hacia el gateway correspondiente, y espera el resultado (`contract-gateway-event.md`) de forma asíncrona con timeout.

## 6. Pasos Recomendados

### Paso 1 — Registro de un gateway nuevo

```
1. Admin cliente solicita alta de gateway desde la UI
2. sal-gateway-register genera { gateway_id, gateway_jwt } y los muestra una vez
3. El operador introduce gateway_jwt en la configuración del contenedor Docker del gateway
4. El gateway arranca, se conecta al broker MQTT con sus credenciales
5. lock_gateways.status pasa a 'active', is_online = true
```

### Paso 2 — Emparejamiento de una cerradura nueva (crítico)

Este es el paso de mayor riesgo (bricking). Debe implementarse como secuencia atómica:

```
1. Operador pone la cerradura en modo pairing (botón físico / factory reset)
2. Gateway escanea BLE y detecta la cerradura (scan + advertising)
3. Gateway ejecuta initLock() del SDK
4. INMEDIATAMENTE, sin ninguna operación intermedia:
   a. Persistir lockData en SQLite local
   b. POST síncrono a sal-gateway-store-lockdata con el lockData
   c. Esperar 200 OK
5. Solo tras confirmar (a) y (b): notificar éxito a la UI
6. Nunca cerrar el proceso del gateway entre los pasos 3 y 5
```

Ver `rules-50-ttlock-ble-provider.md` sección 4.1 para el detalle normativo completo.

### Paso 3 — `TTLockBleProvider.createPin()`

```
1. Construir GatewayCommand { command_type: "create_pin", payload: {...} }
2. Publicar en sal/{gateway_id}/cmd/create_pin (o encolar en lock_sync_commands si offline)
3. Esperar GatewayCommandResult correlacionado por command_id (timeout configurable, p. ej. 15s)
4. Si status='success' → mapear a NormalizedCredential
5. Si status='error'/'timeout'/'expired' → lanzar error tipado correspondiente
```

### Paso 4 — Manejo de gateway offline

Si al momento de emitir un comando el `lock_gateways.is_online = false`:
1. Insertar el comando en `lock_sync_commands` con estado `pending`.
2. Devolver al llamador un estado explícito de "pendiente de ejecución" (no un error genérico), para que la UI pueda informar correctamente.
3. Al reconectar el gateway, drenar la cola en orden y publicar resultados normalmente.

### Paso 5 — Recuperación de gateway reinstalado

```
1. Gateway arranca sin cache local (SQLite vacía)
2. Para cada lock_id que el backend le indique como asignado a este gateway:
   GET sal-gateway-get-lockdata?lock_id=...
3. Reconstruir cache local antes de aceptar comandos sobre esas cerraduras
```

## 7. Datos / Contratos Involucrados

- `contract-gateway-command.md`, `contract-gateway-event.md`, `contract-vault-lockdata.md`
- `lock_gateways`, `lock_gateway_links`, `lock_sync_commands`
- `locks.lock_key_vault_ref`

## 8. Errores Comunes

- **Cerrar el proceso del gateway justo después de `initLock()` sin confirmar la persistencia remota:** causa bricking irreversible. Ver incidente histórico documentado en `rules-50`.
- **No deduplicar por `command_id`:** puede ejecutar un mismo comando dos veces (p. ej. crear el mismo PIN dos veces) si el broker reentrega el mensaje.
- **Asumir que el gateway está siempre online:** el diseño debe tratar el estado offline como caso normal, no excepcional.

## 9. Qué No Debe Hacerse

- No ejecutar ninguna parte del SDK BLE en Supabase.
- No publicar `lockData` por MQTT (debe ser HTTPS síncrono, ver `rules-60`).
- No implementar HTTP polling como sustituto de MQTT sin revisión explícita de `rules-60-gateway-communication.md`.

## 10. Escenarios Mínimos de Prueba

- Emparejar una cerradura simulando un corte de red justo después de `initLock()` y verificar que el flujo no continúa hasta confirmar la persistencia remota.
- Emitir un comando con el gateway offline y verificar que queda en `lock_sync_commands` con estado `pending`.
- Reconectar el gateway y verificar que la cola se drena correctamente en orden.
- Reinstalar un gateway (cache vacía) y verificar recuperación completa de `lockData`.

## 11. Criterio de Done

- La secuencia de emparejamiento nunca puede cerrar el proceso sin confirmar doble persistencia.
- `TTLockBleProvider` implementa los 8 métodos de `ILockProvider`.
- Los tests de `test-ble-init-persistence-spec.md` pasan.

## 12. Documentos Relacionados

- `rules-50-ttlock-ble-provider.md`
- `rules-60-gateway-communication.md`
- `test-ble-init-persistence-spec.md`

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
