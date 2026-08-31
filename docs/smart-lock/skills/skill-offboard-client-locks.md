# skill-offboard-client-locks.md — Liberar Cerraduras al Cancelar la Suscripción

## 1. Objetivo

Guiar la implementación de `sal-offboard-lock` para que, al cancelar la suscripción SmartLock de un cliente, se ejecute el flujo de liberación de cerraduras físicas correspondiente a cada provider, evitando que el cliente quede sin capacidad de operar su propio hardware.

## 2. Cuándo Usar Este Skill

- Implementar o revisar `sal-offboard-lock`.
- Diseñar la UI de "Suscripción cancelada — pendiente de liberación".
- Implementar el job de purga de datos (cuando se aborde) y su salvaguarda anti-purga-ciega.
- Diagnosticar el estado de una integración en `pending_release`.

## 3. Preconditions

Leer antes:
- `rules-70-subscription-cancellation-and-lock-release.md` (fuente normativa completa)
- `rules-20-tenant-activation-and-lifecycle.md`
- `rules-40-ttlock-cloud-provider.md` §4.3 (transferencia de propiedad)
- `contract-vault-lockdata.md`

## 4. Restricciones de Origen

- Nunca purgar `lockData` o revocar credenciales del shard sin verificar handover completado o descartado explícitamente.
- Toda exportación de `lockData` debe quedar auditada en `audit_log`.
- El flujo debe ser automático al detectar la cancelación, no manual bajo demanda.

## 5. Estrategia de Implementación

`sal-offboard-lock` se dispara mediante un trigger/webhook sobre el cambio de `saas_service_subscriptions.status` (mismo mecanismo ya usado para `sal-process-checkout` sobre `lodger_room_assignments`), y ramifica su lógica según `lock_integrations.provider`.

## 6. Pasos Recomendados

### Paso 1 — Disparo del flujo

```
1. Trigger/webhook detecta saas_service_subscriptions.status: active → cancelled|suspended
   para service_code = 'smart_access_lock'
2. Para cada lock_integrations activa del client_account:
   a. UPDATE lock_integrations SET status = 'pending_release'
   b. INSERT audit_log { action: 'sal_release_initiated', ... }
   c. Enviar notificación al cliente con instrucciones según provider
```

### Paso 2 — Rama `ttlock` cloud

```
1. Generar instrucciones de "Transfer Lock" personalizadas
   (nombre del shard, pasos en la app TTLock)
2. Email al admin del cliente + banner persistente en la UI mientras
   lock_integrations.status = 'pending_release'
3. Programar recordatorios (ej. día 30, día 60, día 80 del plazo de 90 días)
4. Endpoint para que el cliente marque "Transferencia completada"
   (o detectarlo automáticamente vía sal-sync-locks si el lock ya no
   aparece en el shard)
5. Al confirmarse: UPDATE lock_integrations SET status = 'released'
                   UPDATE locks SET is_active = false WHERE lock_integration_id = ...
```

### Paso 3 — Rama `ttlock_ble` local

```
1. Presentar al cliente las 3 opciones (rules-70 §4.3):
   a. Exportar lockData
   b. Factory reset asistido
   c. Plan reducido (si Product Owner lo habilita comercialmente)
2. Si elige (a):
   - Requiere confirmación explícita + autenticación reforzada (no solo sesión activa)
   - GET del lockData desde Vault vía canal seguro (descarga cifrada de un solo uso,
     nunca email en texto plano)
   - INSERT audit_log { action: 'lockdata_exported', actor, lock_id, ... }
3. Si elige (b):
   - Notificar al gateway (si sigue online) para ejecutar factory reset asistido,
     o proveer instrucciones de reset físico manual
   - Tras confirmar reset: eliminar lockData de Vault (aquí SÍ es seguro borrar,
     porque la cerradura ya no depende de ese lockData)
4. Al completarse (a) o (b): UPDATE lock_integrations SET status = 'released'
```

### Paso 4 — Salvaguarda anti-purga-ciega (job de purga futuro)

```sql
-- Condición obligatoria en cualquier job de purga de datos SmartLock
SELECT * FROM lock_integrations
WHERE client_account_id = :id
  AND status = 'pending_release';
-- Si existe alguna fila: ABORTAR la purga para ese cliente y alertar a superadmin
```

### Paso 5 — Reactivación durante `pending_release`

```
1. saas_service_subscriptions.status vuelve a 'active'
2. Para cada lock_integrations en 'pending_release' de ese cliente:
   UPDATE lock_integrations SET status = 'connected'
   (sin resincronización obligatoria, salvo verificar testConnection())
3. Cancelar cualquier recordatorio/plazo pendiente de liberación
```

## 7. Datos / Contratos Involucrados

- `rules-70-subscription-cancellation-and-lock-release.md`
- `contract-vault-lockdata.md`
- `lock_integrations.status` (nuevo valor: `pending_release`, `released`)
- `audit_log`

## 8. Errores Comunes

- Tratar la cancelación como un simple "apagado" sin disparar ningún flujo de liberación.
- Purgar credenciales del shard o `lockData` en el mismo momento de la cancelación, sin periodo de gracia.
- Exportar `lockData` por un canal no auditado.
- No cancelar el flujo de liberación al detectar una reactivación.

## 9. Qué No Debe Hacerse

- No ejecutar un `DELETE` de `lockData` en Vault sin confirmar handover completado o descartado.
- No asumir que "retención de 90 días" por sí sola resuelve el problema de acceso físico del cliente a su hardware.
- No ofrecer solo un canal de comunicación (ej. solo email) sin reflejo persistente en la UI del estado de liberación.

## 10. Escenarios Mínimos de Prueba

- Cancelar una suscripción con integración `ttlock` activa dispara `pending_release` y notificación con instrucciones de transferencia.
- Cancelar una suscripción con integración `ttlock_ble` activa dispara `pending_release` y presenta las 3 opciones de liberación.
- Completar la transferencia de propiedad marca la integración como `released` y desactiva las cerraduras correspondientes.
- Reactivar durante `pending_release` restaura `connected` sin reconfiguración.
- El job de purga simulado se abstiene de actuar sobre una integración en `pending_release`.

## 11. Criterio de Done

- Ninguna cancelación de suscripción deja al cliente sin una vía explícita de recuperar el control de sus cerraduras.
- El estado `pending_release` es visible tanto en la UI del cliente como en el dashboard de superadmin.
- Los tests de `test-offboarding-lock-release-spec.md` pasan.

## 12. Documentos Relacionados

- `rules-70-subscription-cancellation-and-lock-release.md`
- `rules-20-tenant-activation-and-lifecycle.md`
- `test-offboarding-lock-release-spec.md`

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
