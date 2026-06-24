# rules-05-roles-and-visibility.md — smart-incidents: Roles y Visibilidad

## 1. Propósito

Este documento define qué puede ver y qué puede hacer cada rol en el módulo `smart-incidents`, incluyendo las restricciones de visibilidad entre tenants de un mismo `client_account`.

Toda EF, toda capa de datos y toda interfaz de usuario del módulo deben aplicar las reglas aquí establecidas. Cualquier ampliación de permisos no prevista en este documento requiere actualización formal de este documento antes de ser implementada.

---

## 2. Alcance

Este documento aplica a:

- Toda operación de lectura y escritura sobre incidencias del add-on
- Toda acción sobre el ciclo de vida de una incidencia
- La capa de UI del módulo
- Las EFs que sirven operaciones del módulo
- Los checks de autorización en las EFs y en RLS

---

## 3. Decisiones no negociables

1. **El rol determina la visibilidad.** El alcance de lo que cada actor puede ver o hacer queda fijado en este documento. Ningún documento de menor precedencia puede ampliar este alcance.

2. **El tenant solo ve sus propias incidencias.** Un tenant nunca puede acceder a incidencias de otro tenant, aunque pertenezcan al mismo `client_account`.

3. **El tenant no puede asignar incidencias.** La asignación a un resolutor es una acción exclusiva del `client_admin`.

4. **El resolutor no tiene portal propio en V1.** Existe como destinatario de notificaciones WhatsApp outbound, pero no opera mediante autenticación ni portal propio dentro de este módulo en V1.

5. **El actor `system` solo ejecuta transiciones predefinidas.** Las EFs y los procesos automáticos actúan como `system` únicamente para las transiciones de estado que estén explícitamente autorizadas en `rules-20-incident-lifecycle.md`.

6. **Toda operación requiere entitlement activo.** El entitlement es una precondición de visibilidad y acción. La verificación se delega a `rules-10-addon-entitlement.md`.

---

## 4. Reglas obligatorias

### 4.1 Roles del MVP

| Rol | Descripción |
|---|---|
| `tenant` | Inquilino autenticado con contrato activo en el `client_account` |
| `client_admin` | Administrador de la cuenta del cliente |
| `superadmin` | Administrador global de la plataforma SmartRoom |
| `system` | Actor automático: EFs del add-on, workflows de n8n, procesos programados |

### 4.2 Capacidades del rol `tenant`

| Operación | Permitido |
|---|---|
| Crear incidencia sobre su propia habitación o estancia activa | Sí |
| Ver sus propias incidencias | Sí |
| Ver el estado y el historial público de sus propias incidencias | Sí |
| Añadir comentarios o adjuntos a sus propias incidencias | Sí |
| Cancelar una incidencia propia si está en estado `new` | Sí |
| Ver incidencias de otros tenants del mismo `client_account` | No |
| Asignar una incidencia a un resolutor | No |
| Cambiar el estado de una incidencia más allá de la cancelación permitida | No |
| Cerrar o resolver una incidencia | No |

### 4.3 Capacidades del rol `client_admin`

| Operación | Permitido |
|---|---|
| Crear incidencias en nombre de cualquier tenant del `client_account` | Sí |
| Ver todas las incidencias del `client_account` | Sí |
| Ver el historial completo de actividad de cualquier incidencia del `client_account` | Sí |
| Asignar una incidencia a un resolutor | Sí |
| Cambiar el estado de cualquier incidencia del `client_account` según las transiciones permitidas | Sí |
| Cerrar y resolver incidencias | Sí |
| Cancelar incidencias | Sí |
| Ver incidencias de `client_account` ajenos | No |
| Operar sobre incidencias de `client_account` ajenos | No |

### 4.4 Capacidades del rol `superadmin`

| Operación | Permitido |
|---|---|
| Ver incidencias de cualquier `client_account` | Sí |
| Operar sobre incidencias de cualquier `client_account` con propósito de gestión de plataforma | Sí |
| Acceder a la configuración y entitlement del add-on por `client_account` | Sí |

### 4.5 Capacidades del actor `system`

| Operación | Permitido |
|---|---|
| Ejecutar transiciones de estado automáticas predefinidas en `rules-20-incident-lifecycle.md` | Sí |
| Crear incidencias cuando la fuente es `whatsapp` o `webchat` vía integración con smart-conversations | Sí |
| Publicar eventos en `inc_activities` y en `audit_log` | Sí |
| Ejecutar transiciones de estado fuera de las predefinidas sin autorización explícita | No |
| Acceder a datos de `client_account` ajenos sin contexto de la operación en curso | No |

### 4.6 Visibilidad y aislamiento por tenant

- Un tenant autenticado recibe exclusivamente las incidencias cuyo `profile_id` corresponde a su usuario.
- Un tenant no puede ver, modificar ni acceder a incidencias de otro tenant, aunque pertenezcan al mismo `client_account`.
- Este aislamiento se aplica en todas las capas: EFs, base de datos (RLS) y UI.
- El filtro por `profile_id` se aplica siempre, incluso si el parámetro de consulta viene explícito en la petición.
- `rules-80-security-and-tenancy.md` define la implementación técnica de este aislamiento mediante RLS.

### 4.7 El resolutor en V1

El resolutor es el destinatario de las notificaciones de asignación. En V1:

- No dispone de portal ni login dentro del módulo.
- Recibe notificaciones por WhatsApp outbound únicamente.
- No puede modificar el estado de las incidencias mediante ninguna interfaz propia.
- No está modelado como un rol de autenticación propio en V1.
- Su modelo de datos (cómo se almacena la referencia al resolutor) queda definido en `rules-40-assignment-routing.md`.

### 4.8 Actores en las transiciones de estado

Las reglas exactas de qué actor puede ejecutar cada transición se definen en `rules-20-incident-lifecycle.md`. Este documento establece el principio general:

| Tipo de transición | Actor autorizado |
|---|---|
| Cancelación de la incidencia propia en estado `new` | `tenant` |
| Asignación, cambio de estado de gestión, cierre, resolución | `client_admin` |
| Transiciones automáticas (ej. `new → notified` tras envío de notificación) | `system` |
| Supervisión y gestión de plataforma | `superadmin` |
| Transiciones directas por parte del resolutor | No permitidas en V1 |

---

## 5. Casos permitidos

- Un tenant crea una incidencia sobre su propia habitación activa.
- Un tenant ve el estado actual y el historial público de sus incidencias.
- Un tenant cancela una incidencia propia mientras está en estado `new`.
- Un `client_admin` ve todas las incidencias del `client_account` y asigna a un resolutor.
- Un `client_admin` cierra una incidencia en nombre del `client_account`.
- Un actor `system` mueve la incidencia de `new` a `notified` tras confirmar el envío de la notificación.
- Un `superadmin` consulta incidencias de cualquier `client_account` para auditoría de plataforma.

---

## 6. Casos prohibidos

- Un tenant accede a las incidencias de otro tenant del mismo `client_account`.
- Un `client_admin` ve o modifica incidencias de otro `client_account`.
- El resolutor ejecuta cambios de estado mediante ninguna interfaz propia en V1.
- Un actor `system` ejecuta transiciones de estado fuera de las predefinidas en `rules-20-incident-lifecycle.md`.
- Crear incidencias sin entitlement activo.
- Ampliar permisos de un rol sin actualizar formalmente este documento.
- Las EFs aceptan el rol o el `client_account_id` desde parámetros de entrada en lugar de extraerlos del contexto de autenticación.

---

## 7. Impacto en diseño

- Toda EF del add-on debe extraer el rol y el `client_account_id` del contexto de autenticación antes de procesar ninguna operación.
- La UI debe renderizar únicamente las acciones disponibles para el rol autenticado en ese momento.
- El filtro por `profile_id` para el rol `tenant` debe estar presente en todas las consultas que devuelvan incidencias, sin excepción.
- La verificación de entitlement precede siempre a la verificación de rol.

---

## 8. Impacto en implementación

- Cualquier PR que exponga incidencias de otros tenants a un tenant autenticado debe rechazarse.
- Cualquier PR que permita al resolutor acceder a la API con autenticación propia en V1 debe rechazarse.
- Cualquier PR que no aplique el filtro de `client_account_id` en las vistas de `client_admin` debe rechazarse.
- Cualquier PR que acepte el rol como parámetro de entrada en lugar de leerlo del contexto de autenticación debe rechazarse.

---

## 9. Dependencias

- `rules-00-scope-and-principles.md` — decisiones cerradas de alcance y modelo del add-on
- `rules-10-addon-entitlement.md` — verificación de entitlement (precondición de toda operación)
- `rules-20-incident-lifecycle.md` — actores autorizados por transición de estado
- `rules-40-assignment-routing.md` — modelo del resolutor en V1
- `rules-80-security-and-tenancy.md` — implementación técnica del aislamiento multi-tenant mediante RLS
- `contract-incident-state-machine.md` — contrato formal de transiciones y actores autorizados

---

## 10. Checklist de validación

- [ ] El tenant recibe exclusivamente incidencias cuyo `profile_id` coincide con el suyo
- [ ] El `client_admin` recibe exclusivamente incidencias de su `client_account`
- [ ] El `superadmin` puede operar sobre incidencias de cualquier `client_account`
- [ ] El resolutor no tiene acceso autenticado propio en V1
- [ ] El actor `system` solo ejecuta transiciones predefinidas en `rules-20-incident-lifecycle.md`
- [ ] La UI no renderiza acciones de `client_admin` cuando el usuario tiene rol de `tenant`
- [ ] Las EFs extraen el rol del contexto de autenticación, no de parámetros de entrada
- [ ] El filtro por `client_account_id` está presente en todas las consultas de `client_admin`

---

## 11. Notas de control de cambios

Cualquier cambio en los permisos de un rol de este documento afecta directamente a:
- La capa de datos (RLS, definida en `rules-80-security-and-tenancy.md`)
- Las EFs del add-on
- La UI del módulo

Los cambios en los permisos o en el modelo del resolutor en V1 deben evaluarse junto con `rules-40-assignment-routing.md` antes de implementarse.

Si en una versión futura el resolutor obtiene portal propio, este documento debe actualizarse antes de implementar cualquier cambio en la capa de autenticación, y los cambios deben propagarse a `rules-80-security-and-tenancy.md` y a la capa de RLS.
