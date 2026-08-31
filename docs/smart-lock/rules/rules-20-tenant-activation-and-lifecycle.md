# rules-20-tenant-activation-and-lifecycle.md — Activación y Ciclo de Vida por Tenant

## 1. Propósito

Definir cómo se activa, se desactiva y se reactiva SmartLock para un `client_account`, y qué debe ocurrir con los datos del módulo en cada transición.

## 2. Alcance

Aplica a:
- `saas_service_subscriptions` para `service_code = 'smart_access_lock'`.
- El hook de frontend `useSalSubscription()`.
- El guard de rutas del módulo en `src/addons/smart-lock/`.
- El middleware de validación de suscripción en las Edge Functions `sal-*`.

## 3. Decisiones No Negociables

1. Sin una fila activa en `saas_service_subscriptions` (`service_code = 'smart_access_lock'`, `status = 'active'`), el `client_account` no puede ver ni usar ninguna parte de SmartLock.

2. La verificación de suscripción se hace en **dos capas independientes**: frontend (oculta UI) y backend (rechaza llamadas). El frontend nunca es la única barrera.

3. Cancelar la suscripción **no borra datos**. Las filas `lock_*` del cliente pasan a modo readonly durante un periodo de retención (90 días por defecto) antes de cualquier purga.

4. Reactivar la suscripción dentro del periodo de retención debe restaurar acceso completo sin necesidad de resincronizar ni reconfigurar nada.

5. La activación inicial en Fase 1 la ejecuta el superadmin manualmente (sin autoservicio ni Stripe). La Fase 2 (contratación directa por el cliente con Stripe) se documenta como evolución futura de esta regla, no como comportamiento actual.

## 4. Reglas Obligatorias

### 4.1 Verificación en frontend

`useSalSubscription()` debe consultar el estado de suscripción del `client_account` activo y exponer `{ isActive: boolean, plan: string | null, isLoading: boolean }`. Ningún componente de `src/addons/smart-lock/` debe renderizarse antes de que `isLoading = false`.

La entrada de menú de SmartLock debe ocultarse completamente (no solo deshabilitarse) cuando `isActive = false`.

### 4.2 Verificación en backend

Toda Edge Function `sal-*`, salvo las de gestión de la propia suscripción (`sal-activate-subscription`), debe:

1. Resolver `client_account_id` del JWT del usuario.
2. Consultar `saas_service_subscriptions WHERE client_account_id = X AND service_code = 'smart_access_lock' AND status = 'active'`.
3. Si no existe fila → responder `{ ok: false, error: { code: "FORBIDDEN", message: "SmartLock no está activo para esta cuenta" } }` con status 200 (patrón estándar del proyecto).

Esta verificación debe implementarse una sola vez en `_shared/sal-helpers.ts` (función `validateSalSubscription()`) y reutilizarse en todas las Edge Functions.

### 4.3 Transición de cancelación

Al cancelar la suscripción (`status` pasa de `active` a `cancelled` o `suspended`):

1. Las filas `lock_*` del cliente no se modifican ni se borran.
2. El gating de frontend y backend impide cualquier acceso nuevo a la operativa normal del módulo (crear grants, PINs, etc.).
3. Los comandos pendientes en `lock_sync_commands` no se ejecutan mientras la suscripción esté inactiva, salvo los estrictamente necesarios para el flujo de liberación (ver punto 5).
4. Tras el periodo de retención (90 días) en estado inactivo, un job (n8n o pg_cron) puede marcar los datos para purga según política de retención vigente del proyecto — esta política de purga concreta debe documentarse en una regla separada cuando se implemente, y **debe respetar la salvaguarda anti-purga-ciega de `rules-70-subscription-cancellation-and-lock-release.md` §4.4**.
5. **Obligatorio:** la cancelación debe disparar automáticamente el flujo de liberación de cerraduras físicas descrito en `rules-70-subscription-cancellation-and-lock-release.md`. No basta con "no borrar datos"; el cliente debe recibir una vía real para seguir operando su hardware físico, ya sea transfiriendo la propiedad (provider cloud) o exportando/reseteando `lockData` (provider BLE local).

### 4.4 Transición de reactivación

Al reactivar (`status` vuelve a `active`) dentro del periodo de retención:

1. El acceso se restaura inmediatamente, sin resincronización obligatoria.
2. Los comandos pendientes en `lock_sync_commands` se reanudan.
3. No se requiere reconectar la integración de proveedor si sigue siendo válida (token no expirado).

## 5. Casos Permitidos

- Un cliente puede cancelar y reactivar SmartLock múltiples veces sin perder configuración dentro del periodo de retención.
- Un cliente puede tener `lock_integrations.status = 'disconnected'` con la suscripción activa (fase de onboarding sin proveedor conectado aún).

## 6. Casos Prohibidos

- Renderizar cualquier componente de `src/addons/smart-lock/` antes de resolver el estado de suscripción.
- Permitir que una Edge Function `sal-*` ejecute su lógica de negocio antes de validar la suscripción.
- Borrar filas `lock_*` inmediatamente al cancelar la suscripción.
- Requerir reconfiguración completa al reactivar dentro del periodo de retención.

## 7. Impacto en Diseño

- El guard de rutas `RequireSalSubscription` debe envolver todas las rutas bajo `/v2/admin/accesos/*` (o el path final elegido para el módulo).
- Los mensajes de error de `FORBIDDEN` no deben filtrar detalles internos (p. ej., no decir "tu plan expiró el día X"; usar mensaje genérico).

## 8. Impacto en Implementación

- `validateSalSubscription()` debe cachear el resultado por request (no una consulta por cada validación interna dentro de la misma Edge Function).
- Los tests E2E deben cubrir explícitamente: cliente sin suscripción intentando llamar cada Edge Function crítica.

## 9. Dependencias

Depende de:
- `rules-00-scope-and-principles.md`
- `rules-70-subscription-cancellation-and-lock-release.md` — regla complementaria obligatoria para la transición de cancelación (§4.3 punto 5).
- El modelo de `saas_services` / `saas_service_plans` / `saas_service_subscriptions` (REQ-013).

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
- `REQ-013-saas-services-catalog.md`

## 10. Checklist de Validación

- [ ] `useSalSubscription()` implementado y usado en el guard de rutas.
- [ ] `validateSalSubscription()` usado en todas las Edge Functions `sal-*` salvo las de gestión de suscripción.
- [ ] Cancelar suscripción no borra datos.
- [ ] Cancelar suscripción dispara automáticamente el flujo de liberación de `rules-70`.
- [ ] Reactivar restaura acceso sin reconfiguración.
- [ ] Tests E2E de aislamiento por suscripción pasan.

## 11. Notas de Control de Cambios

La política exacta de purga tras el periodo de retención (90 días) debe definirse en una regla dedicada antes de implementarse en producción; esta regla solo fija el principio de no-borrado inmediato. La obligación de liberar el control físico de las cerraduras antes de cualquier purga está fijada de forma normativa en `rules-70-subscription-cancellation-and-lock-release.md` y no puede relajarse sin aprobación explícita de Product Owner.
