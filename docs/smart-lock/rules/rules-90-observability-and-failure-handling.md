# rules-90-observability-and-failure-handling.md — Observabilidad y Manejo de Fallos

## 1. Propósito

Definir qué debe registrarse, monitorizarse y alertarse en SmartLock, y cómo debe comportarse el sistema ante fallos del proveedor, del gateway físico o de la sincronización.

## 2. Alcance

Aplica a todas las Edge Functions `sal-*`, al gateway físico (`ttlock_ble`) y a los jobs periódicos de sincronización (n8n / pg_cron).

## 3. Decisiones No Negociables

1. Ningún fallo de sincronización con el proveedor puede bloquear el uso del resto del sistema (Core). SmartLock debe degradarse de forma aislada.

2. Todo error de comunicación con el proveedor (cloud o BLE) debe quedar registrado con suficiente contexto para diagnóstico, sin exponer secretos (tokens, `lockData`, contraseñas de shard) en logs.

3. La sincronización periódica es el mecanismo primario de reconciliación de estado (no webhooks), tal como fija `REQ-SL-000-smart-lock-capability.md`. Los webhooks, si se implementan en el futuro, son una mejora adicional, no un reemplazo.

4. Un comando fallido debe quedar en un estado terminal explícito (`error`) en `lock_sync_commands`, nunca en un limbo sin estado.

## 4. Reglas Obligatorias

### 4.1 Registro de errores

Cada Edge Function `sal-*` debe registrar, al fallar una llamada al proveedor:
- `lock_integrations.last_sync_status = 'error'`
- `lock_integrations.last_sync_error` con mensaje descriptivo (sin secretos)
- Timestamp de la última sincronización intentada

### 4.2 Reintentos

- Comandos hacia el proveedor cloud (`ttlock`): reintento con backoff exponencial, máximo 3 intentos, antes de marcar como `error`.
- Comandos hacia el gateway BLE (`ttlock_ble`): permanecen en `lock_sync_commands` con estado `pending` hasta que el gateway esté online; no se descartan automáticamente salvo expiración configurable (por defecto 7 días).

### 4.3 Alertas mínimas requeridas

- Shard de TTLock cloud por encima del 80% de capacidad.
- Token OAuth de un shard a menos de 5 días de expirar.
- Gateway físico sin heartbeat durante más de 15 minutos (`lock_gateways.is_online = false` con `last_seen_at` antiguo).
- JWT de gateway a menos de 30 días de expirar.
- Tasa de error de sincronización de un cliente por encima de un umbral definido operacionalmente.

### 4.4 Degradación aislada

Si el proveedor de un cliente falla completamente (cloud caído o gateway offline prolongado):
- El resto de módulos del Core deben seguir operando con normalidad.
- La UI de SmartLock debe mostrar el estado de error de forma clara, sin bloquear otras partes de la aplicación admin.

## 5. Casos Permitidos

- Mostrar en UI un banner de "Sincronización pendiente" sin bloquear el resto del panel de administración.
- Reintentar manualmente una sincronización fallida desde la UI.

## 6. Casos Prohibidos

- Registrar tokens, contraseñas de shard o `lockData` en logs de texto plano.
- Dejar un comando en estado intermedio indefinido sin transición a un estado terminal.
- Bloquear operaciones del Core (login, gestión de inquilinos, facturación) por un fallo de SmartLock.

## 7. Impacto en Diseño

- El dashboard de superadmin debe incluir una vista de salud de SmartLock por cliente (estado de integración, último error, comandos pendientes).

## 8. Impacto en Implementación

- Los mensajes de error expuestos al cliente admin deben ser genéricos y accionables ("No se pudo sincronizar. Reintenta en unos minutos."); el detalle técnico completo solo debe quedar en logs internos.

## 9. Dependencias

Depende de:
- `rules-00-scope-and-principles.md`
- `rules-40-ttlock-cloud-provider.md`
- `rules-50-ttlock-ble-provider.md`
- `rules-60-gateway-communication.md`

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`

## 10. Checklist de Validación

- [ ] Ningún log contiene secretos de proveedor ni `lockData`.
- [ ] Todo comando fallido llega a un estado terminal.
- [ ] Las alertas mínimas de la sección 4.3 están configuradas.
- [ ] Un fallo de SmartLock no afecta al resto del Core.

## 11. Notas de Control de Cambios

Los umbrales concretos (80% de capacidad, 15 minutos de heartbeat, etc.) pueden ajustarse operacionalmente sin necesidad de una nueva versión de esta regla, siempre que se documenten en el changelog del módulo.
