# skill-vault-lockdata-persistence.md — Persistencia Crítica de `lockData`

## 1. Objetivo

Guiar la implementación exacta de la secuencia de persistencia de `lockData` tras un emparejamiento BLE, para prevenir de forma definitiva el bricking de cerraduras.

## 2. Cuándo Usar Este Skill

- Implementar el flujo de emparejamiento (`initLock()`) en el gateway físico.
- Implementar `sal-gateway-store-lockdata` y `sal-gateway-get-lockdata`.
- Revisar código existente del SDK BLE en busca de riesgos de bricking.

## 3. Preconditions

Leer antes:
- `rules-50-ttlock-ble-provider.md` (sección 4.1, normativa completa)
- `contract-vault-lockdata.md`

## 4. Restricciones de Origen

- Nunca ejecutar `process.exit()` (o finalizar el proceso) entre `initLock()` y la confirmación de doble persistencia.
- La escritura en Vault debe ser síncrona con confirmación explícita (HTTP 200), no "fire and forget".
- Este skill nace de un incidente real de pérdida de hardware; su cumplimiento no es opcional.

## 5. Estrategia de Implementación

Implementar la secuencia como una única función que no retorna control al llamador hasta confirmar ambas persistencias, con manejo de errores explícito en cada paso.

## 6. Pasos Recomendados

### Paso 1 — Función atómica de persistencia

```typescript
async function persistLockDataOrThrow(lock: DiscoveredLock, gatewayId: string): Promise<void> {
  const lockData = lock.getLockData(); // API del SDK, tratar como opaco

  // Paso A: persistir localmente PRIMERO (más rápido, menos puntos de fallo)
  await sqliteDb.run(
    "INSERT OR REPLACE INTO local_lockdata_cache (lock_id, lock_data, paired_at) VALUES (?, ?, ?)",
    [lock.id, lockData, new Date().toISOString()]
  );

  // Paso B: persistir en Vault de Supabase, con reintento hasta confirmar
  let confirmed = false;
  let attempt = 0;
  while (!confirmed && attempt < MAX_RETRIES) {
    try {
      const response = await httpsPost("/functions/v1/sal-gateway-store-lockdata", {
        lock_id: lock.id,
        provider_lock_id: lock.providerLockId,
        lock_data: lockData,
        lock_data_version: 1,
        paired_at: new Date().toISOString(),
        gateway_id: gatewayId,
      });
      if (response.status === 200) confirmed = true;
    } catch (err) {
      attempt++;
      await sleep(backoffMs(attempt));
    }
  }

  if (!confirmed) {
    throw new Error(
      `CRÍTICO: lockData de ${lock.id} persistido solo localmente. ` +
      `No continuar con más operaciones hasta confirmar sincronización con Vault.`
    );
  }
}
```

### Paso 2 — Uso obligatorio tras `initLock()`

```typescript
const lock = await client.initLock(discoveredDevice);
await persistLockDataOrThrow(lock, gatewayId); // BLOQUEANTE — no continuar sin esto
// Solo aquí es seguro notificar éxito a la UI o continuar el flujo
```

### Paso 3 — Manejo del caso de fallo persistente

Si `persistLockDataOrThrow` lanza error tras agotar reintentos:
1. El gateway NO debe reportar la cerradura como "emparejada" ante la UI.
2. El gateway debe mantener el `lockData` en su cache local indefinidamente y reintentar en segundo plano.
3. Debe generarse una alerta operativa (ver `rules-90-observability-and-failure-handling.md`).

### Paso 4 — Verificación antes de cualquier apagado planificado

Antes de cualquier `shutdown`, `restart` o actualización del contenedor del gateway, debe verificarse que no hay `lockData` pendiente de confirmar en Vault. Si lo hay, debe completarse la sincronización antes de proceder.

## 7. Datos / Contratos Involucrados

- `contract-vault-lockdata.md`
- `rules-50-ttlock-ble-provider.md`

## 8. Errores Comunes

- Llamar a `initLock()` y continuar el flujo antes de que la promesa de persistencia se resuelva.
- Persistir solo en Vault y no en la cache local (rompe la resiliencia offline).
- Tratar un fallo de red durante la persistencia como un error no crítico y continuar de todos modos.

## 9. Qué No Debe Hacerse

- No usar `fire-and-forget` (sin `await`) para la llamada a `sal-gateway-store-lockdata`.
- No reintentar indefinidamente sin backoff (satura la red del gateway).
- No permitir que un `SIGTERM`/`SIGINT` del proceso interrumpa la secuencia sin antes intentar completarla o registrar el estado pendiente.

## 10. Escenarios Mínimos de Prueba

- Simular corte de red justo después de `initLock()` y verificar que el gateway reintenta hasta confirmar.
- Simular `SIGTERM` durante la ventana de persistencia y verificar que no se pierde el `lockData` local.
- Verificar que la UI nunca muestra "emparejamiento exitoso" antes de la confirmación remota.

## 11. Criterio de Done

- Cero casos de bricking por pérdida de `lockData` en pruebas de caos (corte de red, kill del proceso) durante el emparejamiento.

## 12. Documentos Relacionados

- `rules-50-ttlock-ble-provider.md`
- `contract-vault-lockdata.md`
- `test-ble-init-persistence-spec.md`

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
