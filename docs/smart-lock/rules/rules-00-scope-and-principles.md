# rules-00-scope-and-principles.md — SmartLock: Alcance y Principios de Arquitectura

## 1. Propósito

Este documento define el alcance arquitectónico no negociable, las fronteras del sistema y los principios rectores del add-on **SmartLock** (gestión de acceso inteligente mediante cerraduras físicas conectadas).

Toda decisión de implementación, definición de contrato, guía de skill y test debe ser coherente con los principios aquí establecidos. Cualquier conflicto entre este documento y otro documento de menor precedencia debe resolverse a favor de este documento.

---

## 2. Alcance

Este documento aplica a:

- Todas las Edge Functions con el prefijo `sal-*` (histórico de "SmartAccessLock", mantenido por compatibilidad de código).
- Todas las tablas de base de datos con el namespace `lock_*`.
- El SDK BLE local (`ttlock_ble`) y su gateway físico, cuando esté implementado.
- Cualquier componente de UI dentro de `src/addons/smart-lock/`.
- El catálogo SaaS del servicio `smart_access_lock` en `saas_services` / `saas_service_plans` / `saas_service_subscriptions`.

---

## 3. Decisiones No Negociables

1. **SmartLock es una capability transversal implementada como add-on desacoplado del Core.** SmartRoom Core funciona de forma autónoma, independientemente de si SmartLock está contratado o activo para un tenant.

2. **SmartLock es add-on de pago.** Solo los `client_accounts` con una fila activa en `saas_service_subscriptions` (`service_code = 'smart_access_lock'`) pueden ver o usar el módulo. Un cliente sin subscripción no debe sufrir ningún impacto, visual ni funcional.

3. **El sistema es agnóstico de proveedor de hardware.** El proveedor inicial es TTLock, con dos vías de integración: cloud (`ttlock`) y BLE local (`ttlock_ble`). Ambas implementan la misma interfaz `ILockProvider`. Añadir un proveedor nuevo (p. ej. Nuki) no debe requerir cambios en la lógica de negocio.

4. **El add-on nunca debe acceder directamente a tablas del Core con relación inversa.** Puede leer tablas del Core (`rooms`, `accommodations`) para resolver relaciones, pero el Core nunca debe tener columnas, FKs ni triggers que referencien tablas `lock_*`.

5. **Ninguna cerradura se aprovisiona nueva desde la web.** La web solo sincroniza cerraduras ya existentes en el proveedor (cloud) o ya emparejadas físicamente (BLE local). El alta física de hardware nuevo se hace fuera de la web (app del proveedor o herramienta de emparejamiento del gateway).

6. **Toda escritura crítica pasa por Edge Functions `sal-*`.** El frontend nunca escribe directamente en tablas `lock_*`.

7. **BLE es una radio de corto alcance.** El SDK BLE (`ttlock_ble`) no puede ejecutarse en Supabase ni en ningún servidor remoto: requiere proximidad física (~5-10 m) a la cerradura. Por tanto, cuando se use este provider, es obligatorio un gateway físico instalado en el alojamiento del cliente.

8. **La comunicación gateway físico ↔ cloud es siempre saliente desde el gateway (outbound).** El gateway está detrás de NAT doméstico y nunca acepta conexiones entrantes desde Supabase.

9. **La persistencia de credenciales criptográficas de emparejamiento (`lockData`) es crítica e irreversible si se pierde.** Debe persistirse de forma inmediata y verificada antes de cualquier cierre de proceso. La pérdida de `lockData` inutiliza físicamente la cerradura (bricking).

10. **La activación opera en dos niveles.** Nivel 1: suscripción umbrella `smart_access_lock` en `saas_service_subscriptions` — si está inactiva, el add-on completo queda inaccesible para ese tenant. Nivel 2: integración de proveedor conectada (`lock_integrations.status = 'connected'`) — sin ella, no hay cerraduras que gestionar aunque la suscripción esté activa.

11. **La desconexión debe ser limpia por diseño.** Cancelar la suscripción SmartLock es una actualización de estado en base de datos, no requiere borrado de datos ni redespliegue de código.

12. **El plan contratado condiciona el "cuánto" y el "qué", no el "si".** Que la suscripción esté activa (nivel 1) no implica capacidad ilimitada. El plan específico dentro de esa suscripción define límites numéricos (máximo de cerraduras, actores, grupos, gateways) y capacidades booleanas (zonas comunes, unlock remoto, provider BLE local, etc.), formalizados en el objeto `SalPlanConfiguration` (ver `rules-21-subscription-plan-configuration.md`). Estos límites se validan siempre en backend antes de crear cualquier recurso.

13. **Una asignación de cliente a un shard del provider cloud nunca debe quedar en estado operativo sin verificación.** Ya sea automática o manual por superadmin, `lock_integrations.status` solo puede pasar a `'connected'` tras confirmar `testConnection()` exitoso contra el shard asignado. Un shard saturado, bloqueado o con credenciales inválidas debe producir un fallo explícito y accionable, nunca un estado ambiguo (ver `rules-40-ttlock-cloud-provider.md` §4.6).

14. **Cancelar la suscripción nunca debe dejar al cliente sin capacidad de operar sus propias cerraduras físicas.** El proceso de cancelación debe disparar automáticamente un flujo de liberación (transferencia de propiedad en el provider cloud, o exportación/factory-reset en el provider BLE local) antes de que cualquier purga de datos pueda ejecutarse (ver `rules-70-subscription-cancellation-and-lock-release.md`).

---

## 4. Reglas Obligatorias

### 4.1 Frontera add-on / Core

El add-on es propietario de:
- Integraciones de proveedor (`lock_integrations`)
- Cerraduras y su ubicación (`locks`, `lock_placements`)
- Actores, grupos y accesos (`lock_access_actors`, `lock_access_groups`, `lock_access_grants`)
- Credenciales (`lock_credentials`)
- Auditoría de eventos (`lock_records`, `lock_notifications`, `lock_sync_commands`)
- Infraestructura de proveedor cloud (`lock_provider_pools`, `lock_provider_pool_assignments`)
- Infraestructura de gateway físico (`lock_gateways`, `lock_gateway_links`, `lock_gateway_claim_sessions`)

SmartRoom Core es propietario de:
- `rooms`, `accommodations`, `common_areas`, `lodgers`, `lodger_room_assignments`

El add-on puede leer tablas del Core mediante FK en sentido SAL → Core (ej. `lock_placements.room_id → rooms.id`). El Core no debe tener ninguna columna ni FK apuntando a `lock_*`.

### 4.2 Dos providers coexistentes

| `provider` | Tipo | Uso |
|---|---|---|
| `ttlock` | Cloud (OAuth + REST) | MVP. Cliente usa gateway G2 de TTLock + app oficial para emparejamiento inicial. |
| `ttlock_ble` | Local (BLE vía gateway propio) | Fase 2. Cliente usa gateway físico propiedad de SmartRoom Rental. |

Un mismo `client_account` puede tener una integración de cada provider si lo necesita.

### 4.3 Jerarquía de activación

Toda operación sobre el módulo debe superar dos comprobaciones en orden:

1. Suscripción umbrella: `saas_service_subscriptions WHERE service_code = 'smart_access_lock' AND status = 'active'`.
2. Integración de proveedor conectada: `lock_integrations WHERE client_account_id = X AND status = 'connected'` (solo aplica a operaciones que requieran comunicación con el proveedor; el CRUD de estructura/actores/grupos no lo requiere).

Si el nivel 1 falla, ninguna pantalla ni Edge Function `sal-*` debe responder con datos: UI oculta, Edge Functions devuelven `403 FORBIDDEN`.

### 4.4 Restricción física del proveedor BLE local

Cuando `provider = 'ttlock_ble'`, toda operación de comando (crear PIN, revocar, unlock remoto) debe enrutarse a través de un `lock_gateway` activo y online. Si el gateway está offline, el comando se encola (`lock_sync_commands`) y se ejecuta cuando el gateway reconecte. Nunca se debe intentar una conexión BLE directa desde Supabase.

---

## 5. Casos Permitidos

- Un `client_account` puede no tener SmartLock contratado — el Core sigue funcionando sin ninguna limitación.
- Un `client_account` puede tener contratado SmartLock pero sin integración de proveedor conectada aún (fase de onboarding).
- Un `client_account` puede tener simultáneamente integraciones `ttlock` y `ttlock_ble`.
- Las Edge Functions `sal-*` pueden leer tablas del Core (`rooms`, `accommodations`) para resolver nombres y jerarquías, siempre mediante `service_role`.
- Cancelar la suscripción sin borrar las filas `lock_*` (retención en modo readonly, ver `rules-20`).

---

## 6. Casos Prohibidos

- Crear cualquier columna o FK en tablas del Core (`rooms`, `accommodations`, `lodgers`, etc.) que apunte a `lock_*`.
- Escribir en tablas `lock_*` directamente desde el frontend sin pasar por una Edge Function `sal-*`.
- Ejecutar código del SDK BLE (`ttlock-sdk-js` o equivalente) en Supabase Edge Functions.
- Mostrar UI de SmartLock o permitir llamadas a `sal-*` para un `client_account` sin suscripción activa.
- Mezclar lógica de negocio de SmartLock dentro de Edge Functions del Core.
- Aceptar conexiones entrantes desde Supabase hacia el gateway físico del cliente.

---

## 7. Impacto en Diseño

- Todo nuevo endpoint de SmartLock debe llevar el prefijo `sal-*`.
- Toda nueva tabla del módulo debe llevar el prefijo `lock_*`.
- Todo componente de frontend del módulo debe vivir bajo `src/addons/smart-lock/`.
- Cualquier ampliación de providers debe implementar `ILockProvider` sin modificar las Edge Functions de negocio existentes.

---

## 8. Impacto en Implementación

- El gating por suscripción debe implementarse una sola vez como middleware/helper compartido (`_shared/sal-helpers.ts`) y reutilizarse en las 26+ Edge Functions `sal-*`.
- El hook de frontend `useSalSubscription()` es el único punto de verdad para decidir si se renderiza la UI del módulo.
- Cualquier PR que añada una tabla sin prefijo `lock_*` o una FK Core → SAL debe rechazarse en revisión.

---

## 9. Dependencias

Esta regla depende de:

- `/docs/_commons/rules/rules-01-document-authoring-standard.md` — estándar global de redacción.
- `/docs/_commons/rules/rules-02-project-structure-and-addons.md` — estructura de add-ons.
- La estructura de carpetas bajo `/docs/smart-lock/`.

Documentos relacionados:
- `rules-10-provider-model.md`
- `rules-20-tenant-activation-and-lifecycle.md`
- `rules-21-subscription-plan-configuration.md`
- `rules-30-schema-isolation.md`
- `rules-70-subscription-cancellation-and-lock-release.md`

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`
- `REQ-013-saas-services-catalog.md` (dependencia de catálogo SaaS)

---

## 10. Checklist de Validación

- [ ] Ninguna tabla del Core referencia `lock_*`.
- [ ] Toda tabla nueva del módulo usa prefijo `lock_*`.
- [ ] Toda Edge Function nueva usa prefijo `sal-*`.
- [ ] El gating de suscripción se aplica en frontend y backend.
- [ ] Ningún código BLE se ejecuta en Supabase.
- [ ] La UI del módulo vive en `src/addons/smart-lock/`.

---

## 11. Notas de Control de Cambios

Cualquier cambio en los principios de esta regla debe revisarse con Product Owner y Solution Architecture antes de aplicarse, dado que redefine las garantías de aislamiento del add-on frente al Core.

Este documento sustituye conceptualmente al antiguo ADR-006 (`docs/architecture/adr/ADR-006-sal-ttlock-provider-model.md`), cuyo contenido ha sido distribuido entre las `rules`, `contracts`, `skills`, `tests` y `diagrams` de `docs/smart-lock/`.
