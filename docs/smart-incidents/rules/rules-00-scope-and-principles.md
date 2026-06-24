# rules-00-scope-and-principles.md — smart-incidents: Alcance y Principios de Arquitectura

## 1. Propósito

Este documento define el alcance arquitectónico no negociable, las fronteras del sistema y los principios rectores del add-on `smart-incidents`.

Toda decisión de implementación, definición de contrato, diseño de workflow y guía de skill debe ser coherente con los principios aquí establecidos. Cualquier conflicto entre este documento y otro documento de menor precedencia debe resolverse a favor de este documento.

---

## 2. Alcance

Este documento aplica a:

- Todas las Edge Functions del add-on `smart-incidents`
- Todos los workflows de n8n que procesen eventos de incidencias del add-on
- Todas las tablas de base de datos en el namespace `inc_*`
- Cualquier componente de UI dentro del módulo de incidencias
- La integración de publicación al `audit_log` del Core
- La integración entrante desde smart-conversations vía `conv-core-create-incident`

---

## 3. Decisiones no negociables

1. **`smart-incidents` es un add-on independiente del core de alquiler.** SmartRoom Core funciona de forma independiente con independencia de si `smart-incidents` está activo o instalado.

2. **Las incidencias viven en tablas del add-on.** Los datos del módulo residen exclusivamente en el namespace `inc_*` (`inc_incidents`, `inc_attachments`, `inc_activities`). Esta decisión no puede reabrirse.

3. **Si el add-on no está activo, no existe para el cliente.** Sin entitlement activo: la funcionalidad no aparece en UI, las operaciones de API del módulo no se procesan, los automatismos de n8n del módulo se descartan.

4. **El add-on no puede comprometer el core.** Si el add-on falla o se desactiva, el core sigue funcionando sin afectación.

5. **El core no depende de n8n ni de proveedores externos del add-on.** Los flujos principales del Core no pueden depender de que n8n o cualquier sistema externo del add-on estén disponibles para completarse.

6. **Los EFs del add-on publican al `audit_log` del Core con service_role.** Se sigue el mismo patrón que los EFs del Core (documentado en `docs/architecture/audit-log-system.md`). No se usa EF intermediaria. Esta decisión no puede reabrirse.

7. **La relación con smart-conversations es un punto de integración externo.** La EF `conv-core-create-incident` de smart-conversations crea incidencias en este add-on. Esto no define dónde viven los datos (que es siempre en `inc_*`) ni altera el alcance del módulo.

8. **n8n no modifica el estado de las incidencias directamente.** n8n solo puede leer eventos y llamar a EFs del add-on. Las transiciones de estado las ejecutan exclusivamente las EFs.

9. **n8n solo opera para clientes con add-on activo.** Un evento en n8n para un `client_account` sin entitlement activo debe descartarse sin procesar.

10. **El resolutor no tiene portal propio en V1.** Existe como destinatario de notificaciones WhatsApp outbound, pero no opera mediante portal ni autenticación propia en el MVP.

11. **WhatsApp en V1 es exclusivamente outbound.** No se procesa ningún mensaje entrante de WhatsApp dentro del alcance de este módulo en V1.

12. **Los eventos del `audit_log` no deben contener PII identificativa del inquilino.** Los hitos funcionales se publican sin incluir `profile_id`, `phone_number`, `full_name`, `room_label` ni datos equivalentes.

---

## 4. Reglas obligatorias

### 4.1 Frontera add-on / Core

El add-on es propietario de:

- Estado de las incidencias (`inc_incidents`)
- Archivos adjuntos de incidencias (`inc_attachments`)
- Timeline interno de actividad por incidencia (`inc_activities`)

SmartRoom Core es propietario de:

- Tenants, alojamientos, habitaciones, contratos y perfiles activos de inquilinos
- Registro de actividad general (`audit_log`)
- Catálogo SaaS y suscripciones (`saas_service_subscriptions`)

El add-on puede publicar eventos en `audit_log` mediante EFs con service_role. Ningún otro acceso directo a tablas de negocio del Core está permitido desde el add-on.

### 4.2 Entitlement

Para que cualquier operación del módulo pueda ejecutarse, debe existir una suscripción con `status = 'active'` en `saas_service_subscriptions` para el `client_account` correspondiente y el servicio `smart_incidents`.

Si no existe entitlement activo:
- La UI no debe mostrar el módulo ni ningún elemento relacionado.
- Toda llamada a EF del add-on debe devolver error controlado sin procesar la operación.
- Los eventos en n8n deben descartarse silenciosamente sin afectar al Core.

`rules-10-addon-entitlement.md` define el mecanismo de verificación de entitlement.

### 4.3 Canales de creación de incidencias

| Fuente | Actor que origina | Mecanismo |
|---|---|---|
| `web-tenant` | `tenant` | Formulario web del módulo |
| `web-admin` | `client_admin` | Panel de administración del cliente |
| `whatsapp` | sistema (vía smart-conversations) | EF `conv-core-create-incident` como integración externa |
| `webchat` | sistema (vía smart-conversations) | EF `conv-core-create-incident` como integración externa |

### 4.4 Estados del MVP

Los siete estados válidos del ciclo de vida de una incidencia son:

| Estado | Descripción |
|---|---|
| `new` | Incidencia recién creada, sin notificación enviada |
| `notified` | Notificación enviada al resolutor |
| `in_progress` | El resolutor está atendiendo la incidencia |
| `waiting_tenant` | Se espera respuesta o confirmación del inquilino |
| `resolved` | La incidencia ha sido resuelta |
| `closed` | Cerrada definitivamente |
| `cancelled` | Cancelada |

Los estados `closed` y `cancelled` son terminales absolutos. Ninguna transición puede salir de ellos.

`rules-20-incident-lifecycle.md` define las transiciones permitidas y los actores autorizados por transición.

### 4.5 Alcance del MVP

**Incluido en V1:**

- Creación de incidencias por tenant o admin
- Seguimiento web básico con visibilidad diferenciada por rol
- Categorías simples: `maintenance`, `noise`, `security`, `billing`, `other`
- Adjuntos (imágenes y documentos)
- Asignación y enrutado simple
- Automatización con n8n (notificaciones, transiciones automáticas básicas)
- WhatsApp outbound para notificaciones al resolutor
- Trazabilidad funcional relevante en el `audit_log` del Core
- Timeline interno por incidencia en `inc_activities`

**No incluido en V1:**

- Portal o login propio del resolutor
- WhatsApp bidireccional
- SLA avanzados y alertas por tiempo
- IA para clasificación automática de incidencias
- Dashboards avanzados de KPIs
- Motor complejo de reglas de enrutado
- Escalado automático complejo

### 4.6 Minimización de PII hacia n8n

| Capa | Puede recibir | No debe recibir |
|---|---|---|
| n8n | `incident_id`, `client_account_id`, `status`, `category`, `priority`, `source` | `profile_id`, `phone_number`, `full_name`, `room_label`, `email` |
| EFs del add-on | Todo lo anterior + datos de identidad cuando sean necesarios para la operación | — |

`rules-80-security-and-tenancy.md` define la política completa de aislamiento y restricciones de datos.

### 4.7 Dos sistemas de log

El módulo opera con dos sistemas de log diferenciados:

| Sistema | Tabla | Propósito | Visibilidad |
|---|---|---|---|
| Timeline interno | `inc_activities` | Todos los cambios y eventos de la incidencia | Admin y equipo técnico dentro del módulo |
| Registro de actividad general | `audit_log` (Core) | Hitos funcionales relevantes para el cliente | Dashboard del cliente |

Los dos sistemas no son intercambiables. Un evento en `inc_activities` no implica su publicación en `audit_log` ni viceversa. `rules-70-activity-log.md` define qué eventos se publican en cuál de los dos sistemas.

---

## 5. Casos permitidos

- Un `client_account` con entitlement activo puede crear, seguir y gestionar incidencias.
- Un `client_account` puede suspender el servicio sin perder las incidencias existentes.
- El resolutor puede recibir notificaciones WhatsApp outbound sin tener acceso autenticado propio al sistema en V1.
- Las EFs del add-on pueden publicar en `audit_log` usando service_role.
- La EF `conv-core-create-incident` de smart-conversations puede crear incidencias en el add-on con fuente `whatsapp` o `webchat`.
- n8n puede leer el estado de una incidencia para decidir si dispara una notificación.

---

## 6. Casos prohibidos

- Operar el módulo para un `client_account` sin entitlement activo.
- Acceder directamente a tablas de negocio del Core (tenants, alojamientos, contratos) desde el add-on.
- Ejecutar transiciones de estado desde n8n sin pasar por EF del add-on.
- Pasar `profile_id`, `phone_number`, `full_name` u otros datos de identidad personal a los payloads de n8n.
- Procesar mensajes entrantes de WhatsApp dentro de este módulo en V1.
- Tratar el add-on como parte del core de alquiler de habitaciones.
- Publicar en `audit_log` mensajes brutos o datos personales del inquilino.
- Reabrir cualquiera de las decisiones fijadas en la Sección 3.

---

## 7. Impacto en diseño

- Toda funcionalidad del módulo debe comprobar entitlement antes de ejecutar ninguna operación.
- Las EFs del add-on son el único mecanismo autorizado para modificar el estado de las incidencias.
- n8n no puede acceder a tablas del Core ni a tablas del add-on directamente.
- La UI no debe renderizar ningún componente del módulo cuando el add-on no está activo para el `client_account`.
- El desacoplamiento debe ser limpio: desactivar el add-on es una actualización en la suscripción; no requiere cambios de código.
- Las EFs deben verificar el estado actual antes de cualquier UPDATE para garantizar idempotencia.

---

## 8. Impacto en implementación

- Cualquier PR que ejecute operaciones sin comprobar entitlement debe rechazarse.
- Cualquier PR que introduzca acceso directo a tablas de negocio del Core desde el add-on debe rechazarse.
- Cualquier PR que pase PII a los payloads de n8n debe rechazarse.
- Cualquier PR que procese mensajes WhatsApp entrantes en el scope de este módulo en V1 debe rechazarse.
- Cualquier PR que permita al resolutor operar mediante autenticación propia en V1 debe rechazarse.

---

## 9. Dependencias

- `docs/project-rules/rules-01-document-authoring-standard.md` — estándar global de redacción documental
- `docs/architecture/audit-log-system.md` — patrón de publicación al `audit_log` con service_role
- `docs/requirements/current/REQ-013-saas-services-catalog.md` — modelo de suscripción SaaS y entitlement
- `rules-01-document-authoring-standard.md` — estándar documental del módulo
- `rules-05-roles-and-visibility.md` — modelo de roles y visibilidad
- `rules-10-addon-entitlement.md` — mecanismo de verificación de entitlement
- `rules-20-incident-lifecycle.md` — ciclo de vida e invariantes de estado

---

## 10. Checklist de validación

- [ ] Ninguna operación del módulo se ejecuta sin verificar entitlement
- [ ] Ningún código del add-on accede directamente a tablas de negocio del Core
- [ ] n8n no ejecuta UPDATE sobre tablas del add-on ni del Core directamente
- [ ] Los payloads de n8n no contienen PII identificativa del inquilino
- [ ] La UI no muestra ningún elemento del módulo cuando el add-on está inactivo
- [ ] El Core sigue funcionando si el add-on se desactiva
- [ ] Los estados `closed` y `cancelled` son tratados como terminales
- [ ] El `audit_log` no recibe mensajes brutos ni datos personales del inquilino
- [ ] Los dos sistemas de log (`inc_activities` y `audit_log`) no se confunden entre sí

---

## 11. Notas de control de cambios

Los cambios en este documento requieren revisión de arquitectura antes del merge.

Este documento tiene la máxima precedencia dentro del conjunto documental de `smart-incidents`. Cualquier cambio aquí puede afectar en cascada a todos los documentos del módulo.

Las decisiones marcadas como no negociables en la Sección 3 no deben modificarse sin aprobación explícita de producto y arquitectura.
