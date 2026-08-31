# rules-21-subscription-plan-configuration.md — Configuración de Plan y Límites Operativos

## 1. Propósito

Definir el objeto de configuración derivado del plan contratado (`saas_service_plans`) que condiciona qué puede y no puede hacer un `client_account` dentro de SmartLock, y establecer dónde y cómo debe aplicarse esa configuración en cada operación.

Esta regla no crea un mecanismo nuevo de suscripción: reutiliza el modelo ya existente de `saas_services` / `saas_service_plans` / `saas_service_subscriptions` (REQ-013), y formaliza cómo SmartLock debe leerlo y hacerlo cumplir.

## 2. Alcance

Aplica a:
- Toda Edge Function `sal-*` que cree o module recursos limitables (cerraduras, actores, grupos, zonas comunes, notificaciones).
- La Edge Function `sal-change-plan` (o equivalente), única vía autorizada para modificar `saas_service_subscriptions.plan_id` de SmartLock.
- La UI de SmartLock, que debe reflejar los límites, avisos de consumo, y el detalle de conflictos ante un intento de downgrade bloqueado.
- El catálogo de `feature_code` de `saas_service_plans.features` específico de SmartLock.

## 3. Decisiones No Negociables

1. `saas_service_subscriptions` determina **si** el cliente puede usar SmartLock (nivel 1, ver `rules-20-tenant-activation-and-lifecycle.md`). El **plan** contratado dentro de esa suscripción determina **cuánto y qué** puede hacer (límites y capacidades). Son dos preguntas distintas y ambas deben responderse antes de ejecutar cualquier operación.

2. No existe una tabla `lock_*` nueva para guardar límites de plan. Los límites viven exclusivamente en `saas_service_plans.features` (jsonb), siguiendo el mismo patrón ya usado por el resto de la plataforma (`plans_catalog.features` para límites del Core).

3. Debe existir un objeto de configuración derivado, `SalPlanConfiguration`, calculado en el momento de cada operación (o cacheado con invalidación explícita al cambiar de plan), que traduzca `saas_service_plans.features` a valores tipados y listos para validar.

4. Todo límite numérico (`max_locks`, `max_actors`, `max_groups`) debe validarse en la Edge Function correspondiente **antes** de insertar el recurso, nunca después. Un límite superado debe responder `{ ok: false, error: { code: "PLAN_LIMIT_EXCEEDED" } }`, siguiendo el patrón de error ya estandarizado en el proyecto (`architecture.md` §5).

5. Todo `feature_code` booleano (`common_areas`, `remote_unlock`, `audit_logs`, etc.) debe validarse antes de exponer la funcionalidad correspondiente, tanto en frontend (ocultar/deshabilitar) como en backend (rechazar la llamada).

6. Cambiar de plan no debe requerir cambios de código. Es exclusivamente una actualización de datos (`saas_service_subscriptions.plan_id` u homólogo) que `SalPlanConfiguration` debe reflejar inmediatamente en la siguiente operación.

7. **Todo cambio de plan (upgrade o downgrade) debe validarse contra el uso real actual del cliente antes de aplicarse.** Un upgrade que solo amplía límites/capacidades no requiere validación de uso. Un downgrade que reduce cualquier límite numérico o retira cualquier capacidad booleana **debe bloquearse** si el uso actual del cliente ya supera el límite del plan destino, o si existen recursos activos que dependen de una capacidad que el plan destino no incluye. El cliente debe recibir el detalle exacto de qué debe reducir o desactivar antes de poder completar el cambio.

## 4. Reglas Obligatorias

### 4.1 Catálogo de `feature_code` de SmartLock

| `feature_code` | Tipo | Efecto |
|---|---|---|
| `provider_integration` | boolean | Puede conectar un proveedor de cerraduras |
| `common_areas` | boolean | Puede crear zonas comunes |
| `multiple_locks_per_room` | boolean | Permite más de una cerradura por habitación |
| `multiple_locks_per_area` | boolean | Permite más de una cerradura por zona común |
| `actors` | boolean | Puede registrar actores no-inquilinos |
| `access_groups` | boolean | Puede crear grupos de acceso |
| `lodger_auto_grant` | boolean | Auto-grant al asignar habitación a inquilino |
| `group_auto_grant` | boolean | Auto-grant al añadir miembro a grupo |
| `remote_unlock` | boolean | Unlock remoto desde la web |
| `audit_logs` | boolean | Acceso a logs de auditoría |
| `notifications_email` | boolean | Notificaciones por email |
| `notifications_sms` | boolean | Notificaciones SMS (futuro) |
| `notifications_whatsapp` | boolean | Notificaciones WhatsApp (futuro) |
| `provider_local_ble` | boolean | Puede usar el provider `ttlock_ble` (gateway propio) — no todos los planes tienen por qué incluirlo |
| `max_locks` | number | Límite de cerraduras activas simultáneas |
| `max_actors` | number | Límite de actores no-inquilinos |
| `max_groups` | number | Límite de grupos de acceso |
| `max_gateways` | number | Límite de gateways físicos (solo relevante si `provider_local_ble = true`) |

Este catálogo es la fuente de verdad para el objeto `SalPlanConfiguration` (ver `contract-subscription-plan-configuration.md`).

### 4.2 Cálculo de `SalPlanConfiguration`

1. Resolver `client_account_id` → `saas_service_subscriptions` activa para `service_code = 'smart_access_lock'`.
2. Resolver el `plan_id` de esa suscripción → `saas_service_plans.features`.
3. Mapear cada `feature_code` a su campo tipado en `SalPlanConfiguration` (ver contrato).
4. Si un `feature_code` no está presente en `features`, aplicar el valor por defecto más restrictivo (booleanos → `false`; numéricos → `0`).

### 4.3 Punto de aplicación de límites numéricos

| Recurso | Edge Function que valida | Momento |
|---|---|---|
| Cerraduras (`locks`) | `sal-sync-locks`, `sal-register-paired-lock` | Antes de insertar una fila nueva en `locks` que incremente el conteo activo por encima de `max_locks` |
| Actores (`lock_access_actors`) | Edge Function de alta de actor | Antes de insertar |
| Grupos (`lock_access_groups`) | Edge Function de alta de grupo | Antes de insertar |
| Gateways (`lock_gateways`) | `sal-gateway-register` | Antes de registrar un gateway nuevo |

El conteo se calcula sobre recursos con `is_active = true` (o equivalente); recursos desactivados no cuentan contra el límite.

### 4.4 Punto de aplicación de capacidades booleanas

| `feature_code` | Edge Function que valida |
|---|---|
| `provider_integration` | `sal-connect-integration` |
| `common_areas` | Edge Function de alta de `common_areas` |
| `remote_unlock` | `sal-remote-unlock` (además de `NormalizedLock.supportsRemoteUnlock` del provider) |
| `audit_logs` | `sal-sync-lock-records` / endpoint de lectura de registros |
| `provider_local_ble` | `sal-connect-integration` cuando `provider = 'ttlock_ble'` |

### 4.5 Validación de cambio de plan (upgrade / downgrade)

Todo cambio de plan debe pasar por una validación previa (`sal-change-plan` o equivalente) antes de escribir el nuevo `plan_id` en `saas_service_subscriptions`:

1. Resolver `SalPlanConfiguration` del plan **actual** y del plan **destino**.
2. Para cada límite numérico (`maxLocks`, `maxActors`, `maxGroups`, `maxGateways`):
   - Calcular el uso actual real (recursos activos) del cliente.
   - Si el plan destino tiene un límite menor que el actual **y** el uso real supera ese límite menor → **bloquear el cambio** para ese recurso.
3. Para cada capacidad booleana que pase de `true` (plan actual) a `false` (plan destino):
   - Verificar si existen recursos activos que dependan de esa capacidad (ejemplos: `common_areas = false` con zonas comunes activas; `access_groups = false` con grupos activos; `provider_local_ble = false` con integración `ttlock_ble` conectada).
   - Si existen → **bloquear el cambio** para esa capacidad.
4. Si una o más comprobaciones bloquean el cambio, la respuesta debe incluir el detalle exacto de cada conflicto (tipo de recurso, cantidad actual, límite/capacidad del plan destino) para que el cliente sepa qué reducir o desactivar antes de reintentar.
5. Si ninguna comprobación bloquea el cambio (incluye siempre el caso de upgrade puro, donde todos los límites nuevos son `null` o mayores y todas las capacidades nuevas son `true` o iguales), el cambio se aplica de inmediato y `SalPlanConfiguration` se recalcula en la siguiente operación sin más pasos.
6. Un downgrade nunca debe ejecutarse "parcialmente" (algunos recursos desactivados automáticamente para encajar en el límite nuevo). El cambio de plan es todo-o-nada: se aplica solo si no hay conflictos, o se bloquea por completo indicando qué resolver.

### 4.6 UI — anticipación del límite (no autoritativa)

La UI debe mostrar el consumo actual frente al límite (ej. "14 / 20 cerraduras") y advertir al 80% de uso, replicando el patrón ya usado en el Core (`architecture.md` §8). Esta validación de UI es solo UX; la validación autoritativa siempre ocurre en la Edge Function.

## 5. Casos Permitidos

- Un plan puede tener `max_locks = null` o un valor muy alto para representar "ilimitado" (equivalente al patrón `∞` ya usado en `plans_catalog.features` del Core).
- Dos clientes con el mismo `service_code` pero planes distintos pueden tener capacidades y límites completamente distintos.
- Cambiar de plan en caliente sin downtime ni migración de datos, siempre que pase la validación de la sección 4.5.
- Un upgrade de plan (todos los límites nuevos `null`/mayores y todas las capacidades nuevas `true`/iguales) se aplica siempre sin bloqueo.
- Un downgrade se aplica si el uso actual del cliente ya cabe dentro de los nuevos límites y no depende de ninguna capacidad retirada.

## 6. Casos Prohibidos

- Calcular límites de plan en el frontend como única barrera.
- Cachear `SalPlanConfiguration` sin invalidarlo al cambiar de plan o de estado de suscripción.
- Insertar un recurso limitable antes de validar el límite correspondiente.
- Añadir un `feature_code` nuevo sin documentarlo en la tabla de la sección 4.1.
- Aplicar un downgrade que deje al cliente con más recursos activos de los que su nuevo plan permite.
- Aplicar un downgrade "parcial" que desactive recursos automáticamente para forzar el encaje en el nuevo límite, sin confirmación explícita del cliente.
- Bloquear un upgrade por cualquier motivo relacionado con límites (un upgrade, por definición, nunca reduce capacidad).

## 7. Impacto en Diseño

- Cada Edge Function que cree un recurso limitable debe incluir, como primer paso tras el gating de suscripción, la resolución de `SalPlanConfiguration` y la validación del límite correspondiente.
- La UI de "Configuración del plan" en el panel admin del cliente debe mostrar de forma legible los límites y capacidades vigentes.
- La UI de "Cambiar de plan" debe, ante un intento de downgrade que sería bloqueado, mostrar de forma clara y accionable qué recursos hay que reducir o desactivar antes de poder completar el cambio (nunca un error genérico).

## 8. Impacto en Implementación

- `SalPlanConfiguration` debe implementarse como una función compartida (`_shared/sal-helpers.ts`, p. ej. `resolveSalPlanConfiguration()`) reutilizada por todas las Edge Functions relevantes, para evitar lógica de mapeo duplicada.
- El error `PLAN_LIMIT_EXCEEDED` debe incluir en `detail` el límite actual y el valor solicitado, para que la UI pueda mostrar un mensaje preciso.
- Debe existir una Edge Function dedicada (`sal-change-plan` o equivalente) que ejecute la validación de la sección 4.5 antes de escribir el nuevo `plan_id`; ninguna otra vía (directa sobre `saas_service_subscriptions`) debe permitir cambiar de plan sin pasar por esta validación.
- El error de downgrade bloqueado debe usar un código específico y distinguible de `PLAN_LIMIT_EXCEEDED` (p. ej. `PLAN_DOWNGRADE_BLOCKED`), con `detail` listando cada conflicto: `{ resource: "locks", current: 35, newLimit: 20 }`, `{ capability: "common_areas", activeResources: 3 }`.

## 9. Dependencias

Depende de:
- `rules-00-scope-and-principles.md`
- `rules-20-tenant-activation-and-lifecycle.md`
- `contract-subscription-plan-configuration.md`
- El modelo de `saas_service_plans.features` (REQ-013).

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
- `REQ-013-saas-services-catalog.md`

## 10. Checklist de Validación

- [ ] Todo `feature_code` de la sección 4.1 está soportado por `SalPlanConfiguration`.
- [ ] Todo límite numérico se valida antes de insertar, nunca después.
- [ ] Toda capacidad booleana se valida en backend, no solo en frontend.
- [ ] El error `PLAN_LIMIT_EXCEEDED` incluye límite y valor solicitado.
- [ ] Todo cambio de plan pasa por `sal-change-plan` (o equivalente), nunca por escritura directa de `plan_id`.
- [ ] Un downgrade que superaría algún límite numérico o retiraría una capacidad en uso se bloquea con detalle accionable.
- [ ] Un upgrade nunca se bloquea por motivos de límites.
- [ ] Ningún downgrade desactiva recursos automáticamente sin confirmación explícita.

## 11. Notas de Control de Cambios

Añadir un nuevo `feature_code` requiere: (1) documentarlo en la tabla 4.1, (2) añadirlo a `contract-subscription-plan-configuration.md`, (3) implementar su punto de validación correspondiente antes de activarlo en ningún plan real, (4) verificar que la validación de cambio de plan (sección 4.5) lo contempla si es un límite numérico o una capacidad booleana con recursos dependientes.
