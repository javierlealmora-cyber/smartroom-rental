# rules-40-ttlock-cloud-provider.md — Provider TTLock Cloud (MVP Fase 1)

## 1. Propósito

Definir las reglas operativas del provider `ttlock` (cloud), incluyendo el modelo de shards, límites del proveedor, y el flujo de onboarding de un cliente.

## 2. Alcance

Aplica a:
- `providers/ttlock.ts`.
- `lock_provider_pools`, `lock_provider_pool_assignments`.
- Las credenciales `TTLOCK_CLIENT_ID` / `TTLOCK_CLIENT_SECRET` (nivel developer, globales a la plataforma).
- El flujo de emparejamiento físico vía app oficial TTLock.

## 3. Decisiones No Negociables

1. Las credenciales `TTLOCK_CLIENT_ID` y `TTLOCK_CLIENT_SECRET` son secretos de plataforma (nivel developer), configurados como Supabase Edge Function secrets. Nunca en frontend, nunca en código fuente, nunca en base de datos.

2. Cada `client_account` con `provider = 'ttlock'` se asigna a exactamente un shard (`lock_provider_pool_assignments`, `UNIQUE (client_account_id, provider) WHERE status = 'active'`).

3. Un shard es una sub-cuenta TTLock (usuario TTLock creado programáticamente por SmartRoom Rental) con sus propias credenciales OAuth guardadas en Vault, referenciadas desde `lock_provider_pools.vault_key_ref`.

4. El límite operativo de un shard es ~500 cerraduras (límite documentado de TTLock Open Platform). Al alcanzar 400 (80%), debe crearse un shard nuevo antes de asignar más clientes al saturado.

5. El emparejamiento físico inicial de una cerradura al gateway G2 **debe** hacerse con la app oficial TTLock, usando las credenciales del shard asignado. La web de SmartRoom Rental no ejecuta pairing BLE directo en el MVP cloud.

6. Tras el emparejamiento inicial, toda gestión operativa (PIN, unlock remoto, revocación, histórico) se hace exclusivamente desde la web de SmartRoom Rental. El cliente no necesita volver a abrir la app TTLock.

## 4. Reglas Obligatorias

### 4.1 Aprovisionamiento de un shard nuevo

1. Crear sub-cuenta TTLock vía API de registro de usuario (`POST /v3/user/register` o equivalente del Open Platform).
2. Guardar `{ email, password, access_token, refresh_token }` en Vault.
3. Insertar fila en `lock_provider_pools` con `vault_key_ref` apuntando al secreto.
4. Marcar `status = 'active'`, `max_locks = 500`, `current_locks_count = 0`.

### 4.2 Asignación de cliente a shard

Al conectar la integración (`sal-connect-integration`):

1. Buscar shard activo con menor ocupación relativa (`current_locks_count / max_locks`).
2. Si ningún shard tiene margen (todos > 80%), aprovisionar uno nuevo antes de asignar.
3. Insertar fila en `lock_provider_pool_assignments`.
4. Actualizar `lock_integrations.pool_id`.

### 4.3 Migración de cerraduras entre cuentas (clientes existentes)

Si el cliente ya tiene cerraduras emparejadas en su cuenta TTLock personal:

1. Ofrecer el flujo "Transferencia de propiedad" de la app TTLock (`Settings > Transfer`) hacia las credenciales del shard asignado. Preferido: no requiere factory reset físico.
2. Alternativa (solo si la transferencia no es posible): unpair + factory reset + re-pairing con las credenciales del shard. Implica pérdida de PINs existentes; debe advertirse al cliente antes de proceder.

### 4.4 Renovación de tokens OAuth

El token OAuth de cada shard expira (~30 días). Debe existir un job periódico (n8n o Edge Function programada) que:
1. Revise `lock_provider_pools` con token próximo a expirar.
2. Ejecute refresh contra la API de TTLock.
3. Actualice el secreto en Vault.

### 4.5 Plataforma TTLock

Todas las integraciones cloud deben usar `ttlock_platform = 'intl'` (Open Platform internacional, `euopen.ttlock.com`) salvo que se documente explícitamente un cliente en la plataforma `cn`.

### 4.6 Asignación manual por superadmin y manejo de fallo

Además de la asignación automática (sección 4.2), un superadmin puede asignar manualmente un `client_account` a un shard concreto desde `SalShardsList` (por ejemplo, para agrupar clientes de una misma región, o para resolver una incidencia). Esta asignación manual debe pasar por las mismas validaciones que la automática y **puede fallar**. Los casos de fallo obligatorios a manejar:

| Causa de fallo | Detección | Comportamiento obligatorio |
|---|---|---|
| Shard destino saturado (100% `max_locks` o `max_clients`) | Antes de confirmar la asignación | Rechazar con mensaje explícito; no permitir forzar la asignación por encima del límite |
| Shard destino bloqueado (`is_blocked = true`) | Antes de confirmar la asignación | Rechazar con mensaje explícito indicando el motivo del bloqueo si está disponible |
| Token OAuth del shard destino inválido o expirado | Al intentar `testConnection()` contra el shard tras la asignación | La asignación en BBDD puede completarse, pero `lock_integrations.status` debe quedar en `error` (no en `connected`) hasta que el token se repare; el superadmin debe recibir alerta inmediata |
| Cliente ya tiene una asignación activa a otro shard para el mismo provider | Antes de confirmar la asignación | Requiere primero cerrar/migrar la asignación anterior (`status = 'active'` → `'migrated'`) de forma explícita; nunca dos asignaciones activas simultáneas para el mismo `(client_account_id, provider)` |
| Ningún shard disponible con margen en toda la plataforma | Al no encontrar candidato válido | El flujo de asignación manual debe ofrecer "Aprovisionar shard nuevo" como acción directa desde la misma pantalla, reutilizando el flujo de la sección 4.1 |

**Regla dura:** ninguna asignación (automática o manual) puede dejar `lock_integrations.status = 'connected'` si el shard no puede operar (token inválido, saturado o bloqueado). En caso de fallo, el estado correcto es `lock_integrations.status = 'error'` con `last_sync_error` describiendo la causa, y la operativa del cliente sobre SmartLock queda bloqueada para las acciones que dependen de esa integración (sync, grants nuevos, unlock) hasta resolverse — sin afectar al resto del Core ni a otras integraciones del mismo cliente si las hubiera.

La UI de superadmin debe mostrar, para cada asignación fallida, un botón de acción directa ("Reintentar", "Reasignar a otro shard", "Aprovisionar shard nuevo") sin requerir intervención manual en base de datos.

## 5. Casos Permitidos

- Múltiples clientes distintos compartiendo el mismo shard (comportamiento esperado y deseado para optimizar cuota).
- Un cliente con cerraduras repartidas en más de un shard si se migró tras un rebalanceo (caso excepcional, debe evitarse en el flujo normal).

## 6. Casos Prohibidos

- Crear una sub-cuenta TTLock por cada cliente (rompe el modelo de shards y no escala).
- Hardcodear `TTLOCK_CLIENT_ID` / `TTLOCK_CLIENT_SECRET` en código fuente o en `.env` del frontend.
- Asignar un cliente a un shard sin verificar margen de capacidad.
- Requerir que el cliente use la app TTLock para operaciones posteriores al emparejamiento inicial.

## 7. Impacto en Diseño

- La UI de superadmin (`SalShardsList`) debe permitir monitorizar ocupación de shards y forzar la creación de uno nuevo manualmente si es necesario.
- El wizard de conexión del cliente debe mostrar las credenciales del shard asignado (email/password) para que el cliente las use en la app TTLock, sin exponer el `access_token`.

## 8. Impacto en Implementación

- `sal-connect-integration` debe implementar la lógica de selección/aprovisionamiento de shard descrita en 4.1–4.2.
- `sal-regenerate-password` debe rotar la contraseña del shard sin invalidar el `access_token` activo salvo que sea estrictamente necesario.

## 9. Dependencias

Depende de:
- `rules-00-scope-and-principles.md`
- `rules-10-provider-model.md`
- `contract-normalized-lock.md`, `contract-normalized-credential.md`

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`

## 10. Checklist de Validación

- [ ] `TTLOCK_CLIENT_ID` / `TTLOCK_CLIENT_SECRET` solo en Supabase secrets.
- [ ] Ningún shard supera el 80% de ocupación sin que exista ya un shard de reemplazo.
- [ ] El flujo de transferencia de propiedad está documentado en la UI de onboarding.
- [ ] Job de renovación de tokens OAuth activo y monitorizado.
- [ ] Ninguna asignación (automática o manual) deja `lock_integrations.status = 'connected'` con un shard saturado, bloqueado o con token inválido.
- [ ] La UI de superadmin ofrece acciones directas de recuperación ante una asignación fallida (reintentar, reasignar, aprovisionar).

## 11. Notas de Control de Cambios

Si TTLock cambia sus límites de cuota o su modelo de sub-cuentas, esta regla debe revisarse y los valores de la sección 4.1 (500/400) deben actualizarse en consecuencia.
