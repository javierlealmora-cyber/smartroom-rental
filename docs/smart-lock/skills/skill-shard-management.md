# skill-shard-management.md — Gestión de Shards del Provider Cloud

## 1. Objetivo

Guiar la implementación y operación del modelo de shards (sub-cuentas TTLock) usado por el provider `ttlock` cloud, incluyendo aprovisionamiento, balanceo y monitorización.

## 2. Cuándo Usar Este Skill

- Implementar la lógica de selección/aprovisionamiento de shard en `sal-connect-integration`.
- Construir o mantener la UI de superadmin `SalShardsList`.
- Diagnosticar por qué un cliente no puede conectarse (shard saturado o token expirado).

## 3. Preconditions

Leer antes:
- `rules-40-ttlock-cloud-provider.md`
- `rules-90-observability-and-failure-handling.md`

## 4. Restricciones de Origen

- Un shard soporta como máximo ~500 cerraduras (límite documentado de TTLock).
- Al 80% de ocupación debe existir ya un shard de reemplazo disponible.
- El provider `ttlock_ble` nunca usa este modelo.

## 5. Estrategia de Implementación

Los shards se gestionan como un pool de recursos con balanceo por ocupación relativa. La asignación de un cliente a un shard es una decisión de backend (Edge Function), nunca del frontend.

## 6. Pasos Recomendados

### Paso 1 — Aprovisionar un shard nuevo

```
1. Generar email único: srr-shard-{NN}@smartroomrental.com
2. Generar password fuerte aleatorio
3. POST a TTLock: registro de nueva cuenta de usuario (Open Platform)
4. Guardar { email, password, access_token, refresh_token } en Vault
5. INSERT lock_provider_pools { shard_code, vault_key_ref, max_locks: 500, status: 'active' }
```

### Paso 2 — Seleccionar shard para un cliente nuevo

```sql
SELECT id, current_locks_count, max_locks
FROM lock_provider_pools
WHERE status = 'active' AND is_blocked = false
ORDER BY (current_locks_count::float / max_locks) ASC
LIMIT 1;
```

Si el shard con menor ocupación relativa ya supera el 80%, aprovisionar uno nuevo (Paso 1) antes de asignar.

### Paso 3 — Asignar cliente a shard

```
INSERT INTO lock_provider_pool_assignments (client_account_id, pool_id, provider, status)
VALUES (:client_account_id, :pool_id, 'ttlock', 'active');

UPDATE lock_integrations SET pool_id = :pool_id WHERE id = :integration_id;
```

### Paso 4 — Monitorización de ocupación

La UI `SalShardsList` debe mostrar, por shard: `current_locks_count / max_locks`, `current_clients_count / max_clients`, estado del token OAuth (`last_token_refresh_at`), y un botón "Forzar creación de shard nuevo".

### Paso 5 — Asignación manual por superadmin y manejo de fallo

```
1. Superadmin selecciona client_account + shard destino en SalShardsList
2. Backend valida, en este orden:
   a. ¿El cliente ya tiene una asignación 'active' para este provider?
      → Si sí: bloquear, exigir cerrar/migrar la anterior primero
   b. ¿El shard destino está is_blocked = true?
      → Si sí: rechazar con motivo
   c. ¿El shard destino tiene margen (current_locks_count < max_locks
      y current_clients_count < max_clients)?
      → Si no: rechazar; ofrecer botón "Aprovisionar shard nuevo" (Paso 1)
3. Si todas las validaciones pasan:
   a. Crear lock_provider_pool_assignments
   b. Ejecutar testConnection() contra el shard
      → Si falla: lock_integrations.status = 'error', last_sync_error = detalle,
        alertar a superadmin inmediatamente
      → Si éxito: lock_integrations.status = 'connected'
4. Nunca dejar status = 'connected' sin haber pasado testConnection() con éxito
```

### Paso 6 — Renovación periódica de tokens

Job periódico (n8n o Edge Function programada):
```
Para cada lock_provider_pools con token a menos de 5 días de expirar:
  1. Ejecutar refresh OAuth
  2. Actualizar Vault
  3. Actualizar last_token_refresh_at
  4. Si falla: marcar is_blocked = true y alertar a superadmin
```

## 7. Datos / Contratos Involucrados

- `lock_provider_pools`, `lock_provider_pool_assignments`
- `rules-40-ttlock-cloud-provider.md`

## 8. Errores Comunes

- Seleccionar el shard por orden de creación en lugar de por ocupación relativa, generando desbalanceo.
- No verificar `is_blocked` antes de asignar un cliente nuevo a un shard.
- Dejar que el job de renovación de tokens falle silenciosamente sin alertar.

## 9. Qué No Debe Hacerse

- No crear un shard por cliente.
- No reutilizar un shard bloqueado (`is_blocked = true`) hasta resolver la causa del bloqueo.

## 10. Escenarios Mínimos de Prueba

- Asignar clientes sucesivos y verificar que el shard con menor ocupación relativa se elige siempre.
- Simular shard al 80% y verificar que se aprovisiona uno nuevo antes de seguir asignando.
- Simular fallo de refresh de token y verificar que el shard queda marcado `is_blocked` con alerta generada.

## 11. Criterio de Done

- Ningún shard supera el 100% de `max_locks` en ningún momento.
- La UI de superadmin refleja el estado real de ocupación y salud de tokens.

## 12. Documentos Relacionados

- `rules-40-ttlock-cloud-provider.md`
- `test-shard-capacity-spec.md`
- `diagram-shard-model.md`

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
