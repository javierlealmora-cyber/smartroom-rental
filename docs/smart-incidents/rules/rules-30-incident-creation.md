# rules-30-incident-creation.md — smart-incidents: Creación de Incidencias

## 1. Propósito

Este documento define las reglas que gobiernan la creación de incidencias en el add-on `smart-incidents`: qué actores pueden crear incidencias, qué campos son obligatorios y cuáles opcionales en cada contexto de creación, cómo se registra la fuente de la incidencia, qué validaciones deben realizar las EFs antes de persistir un registro, y qué invariantes garantizan la consistencia del modelo de datos tras la creación.

La creación de una incidencia es el primer punto de entrada del ciclo de vida definido en `rules-20-incident-lifecycle.md`. Toda lógica de creación debe ser coherente con el estado inicial obligatorio (`new`) y con los campos definidos en `contract-incident-entity.md`.

---

## 2. Alcance

Este documento aplica a:

- Las EFs del add-on responsables de la creación de incidencias
- Todos los formularios web y flujos de UI que desencadenen la creación
- La EF `conv-core-create-incident` de smart-conversations cuando crea incidencias en el add-on con fuente `whatsapp` o `webchat`
- El actor `system` cuando actúa en nombre de una integración externa (smart-conversations vía n8n)
- Los actores `tenant` y `client_admin` cuando crean incidencias directamente
- La tabla `inc_incidents` como destino del registro de toda creación
- La tabla `inc_activities` como destino del registro inicial obligatorio ante toda creación

---

## 3. Decisiones no negociables

1. **Toda incidencia se crea en estado `new` sin excepción.** Ninguna fuente, ningún actor y ningún mecanismo de integración puede crear directamente una incidencia en un estado distinto de `new`.

2. **La fuente de la incidencia debe registrarse en el momento de la creación.** El campo `source` es obligatorio y no puede modificarse después de la creación. Los únicos valores válidos son `web-tenant`, `web-admin`, `whatsapp` y `webchat`.

3. **Las cuatro fuentes de creación son únicas y excluyentes.** No existe ninguna otra fuente en V1. No puede introducirse ninguna fuente adicional sin actualizar este documento y `contract-incident-entity.md`.

4. **El entitlement del `client_account` debe verificarse antes de cualquier creación.** Si el entitlement no está activo, la EF rechaza la operación con error controlado sin persistir ningún dato.

5. **La EF de creación es el único mecanismo autorizado para insertar registros en `inc_incidents`.** Ningún proceso externo, ningún workflow de n8n ni ninguna herramienta de administración puede insertar directamente en `inc_incidents` sin pasar por la EF.

6. **Toda creación exitosa debe registrar en `inc_activities`.** Un registro en `inc_incidents` sin el correspondiente registro inicial en `inc_activities` es un estado inválido. Si el registro en `inc_activities` falla, la creación no debe completarse.

7. **n8n no puede crear incidencias directamente.** Cuando smart-conversations invoca la creación de una incidencia desde un flujo de n8n, la petición se encamina siempre a la EF `conv-core-create-incident`, que a su vez llama a la EF del add-on. n8n no ejecuta `INSERT` sobre `inc_incidents`.

---

## 4. Reglas obligatorias

### 4.1 Actores autorizados para crear incidencias

| Actor | Fuentes permitidas | Contexto |
|---|---|---|
| `tenant` | `web-tenant` | Formulario web del módulo de incidencias del tenant |
| `client_admin` | `web-admin` | Panel de administración del `client_account` |
| `system` (vía EF `conv-core-create-incident`) | `whatsapp`, `webchat` | Integración entrante desde smart-conversations |

Ningún otro actor puede crear incidencias en V1. El resolutor no puede crear incidencias. n8n no es un actor de creación.

### 4.2 Campos obligatorios y opcionales por fuente de creación

#### Campos siempre obligatorios (todas las fuentes)

| Campo | Tipo | Descripción |
|---|---|---|
| `client_account_id` | uuid | Identificador del cliente al que pertenece la incidencia |
| `accommodation_id` | uuid | Identificador del alojamiento al que pertenece la incidencia |
| `source` | enum | Fuente de creación: `web-tenant`, `web-admin`, `whatsapp`, `webchat` |
| `category` | enum | Categoría: `maintenance`, `noise`, `security`, `billing`, `other` |
| `title` | text | Descripción breve de la incidencia |

#### Campos cuyo requisito depende del actor

| Campo | `web-tenant` | `web-admin` | `whatsapp` / `webchat` | Descripción |
|---|---|---|---|---|
| `requester_profile_id` | Obligatorio | Obligatorio | Obligatorio | Perfil del inquilino que reporta la incidencia |
| `room_id` | Opcional | Opcional | Opcional | Habitación específica afectada dentro del alojamiento |
| `description` | Opcional | Opcional | Opcional | Descripción extendida de la incidencia |
| `priority` | No aplica (la EF fija `normal`) | Opcional (`normal` o `urgent`) | Debe llegar ya traducido al enum canónico (`normal` o `urgent`); ver §4.5 | Prioridad inicial; solo `client_admin` puede fijar `urgent` en creación |
| `attachments` | Opcional | Opcional | No permitidos en creación | Adjuntos iniciales junto a la creación (añadidos mediante `inc_attachments`) |

#### Campos fijados por la EF (no aceptados como input)

| Campo | Valor fijado por la EF |
|---|---|
| `status` | Siempre `new` |
| `created_at` | Timestamp de la operación de creación |
| `incident_id` | UUID generado por la EF |

### 4.3 Las cinco categorías válidas

Los únicos valores válidos para el campo `category` en V1 son:

| Valor | Descripción |
|---|---|
| `maintenance` | Problemas de mantenimiento, averías, desperfectos |
| `noise` | Molestias por ruido |
| `security` | Incidentes relacionados con la seguridad del alojamiento |
| `billing` | Discrepancias o dudas sobre facturación o pagos |
| `other` | Cualquier incidencia que no encaje en las categorías anteriores |

No puede introducirse ninguna categoría adicional en V1 sin actualizar este documento y `contract-incident-entity.md`.

### 4.4 Los dos valores de prioridad válidos

Los únicos valores válidos para el campo `priority` en V1 son:

| Valor | Descripción |
|---|---|
| `normal` | Prioridad estándar. Valor por defecto cuando el campo no se especifica. |
| `urgent` | Prioridad elevada. Solo puede fijarse por `client_admin` en creación. |

Para fuente `web-tenant`, la EF fija siempre `priority = normal`. El formulario web del tenant no expone el campo de prioridad.

Para fuente `web-admin`, `client_admin` puede especificar `urgent`. Si no especifica prioridad, la EF fija `normal` por defecto.

Para fuentes `whatsapp` y `webchat`, el valor de `priority` debe llegar ya traducido al enum canónico en el payload de integración. La EF del add-on no realiza ninguna transformación sobre el campo `priority` en estas fuentes: si el valor recibido no es `normal` ni `urgent`, la EF rechaza la operación.

No existe ningún otro valor de prioridad en V1.

### 4.5 Mapeo de urgencia desde smart-conversations

El campo `urgency` de smart-conversations y el campo `priority` de smart-incidents tienen enums distintos. La traducción exacta entre ambos enums es responsabilidad de la EF `conv-core-create-incident` de smart-conversations y se formaliza en:

`/docs/smart-incidents/contracts/contract-create-incident-request.md`

Este documento no define ese mapeo ni lo redefine. Cuando `contract-create-incident-request.md` esté disponible, será la única fuente de verdad para la traducción. La EF del add-on recibe exclusivamente valores del enum canónico (`normal` o `urgent`) y no aplica ninguna transformación sobre el campo `priority`.

### 4.6 Datos que la EF no debe aceptar desde inputs externos en creación

La EF de creación debe ignorar o rechazar los siguientes valores si llegan como parte del payload de entrada:

- `status` (siempre `new`)
- `incident_id` (generado por la EF)
- `created_at` (fijado por la EF)
- `resolved_at`, `closed_at`, `cancelled_at` (no corresponden al estado inicial)
- Cualquier campo de asignación a resolutor (deferred a `rules-40-assignment-routing.md`)

### 4.7 Restricciones del tenant en creación

El actor `tenant` puede crear incidencias únicamente sobre su propio alojamiento activo. La EF debe verificar que:

- El `profile_id` del tenant autenticado coincide con el `requester_profile_id` enviado en el payload.
- El `accommodation_id` especificado corresponde a un alojamiento donde el tenant tiene un contrato activo.
- El `client_account_id` se extrae del contexto de autenticación, nunca del payload de entrada.

### 4.8 Restricciones del `client_admin` en creación

El actor `client_admin` puede crear incidencias en nombre de cualquier tenant de su `client_account`. La EF debe verificar que:

- El `client_account_id` extraído del contexto de autenticación coincide con el `client_account_id` de la incidencia a crear.
- El `requester_profile_id` referenciado pertenece a un perfil activo dentro del `client_account`.

### 4.9 Restricciones de la fuente `whatsapp` / `webchat`

Cuando la fuente de creación es `whatsapp` o `webchat`:

- La petición llega a través de la EF `conv-core-create-incident` de smart-conversations.
- El actor del lado de smart-incidents es `system`.
- El `requester_profile_id` debe estar resuelto por smart-conversations antes de llamar a la EF del add-on. La EF del add-on no realiza resolución de identidad del tenant; si no recibe un `requester_profile_id` válido, rechaza la operación.
- El `client_account_id` llega como parte del payload de integración. La EF debe verificar que coincide con un entitlement activo.
- Los adjuntos no se procesan durante la creación desde estas fuentes en V1.
- El valor de `priority` debe llegar ya traducido al enum canónico (`normal` o `urgent`) en el payload de integración. La EF del add-on no aplica ningún rebaje silencioso de prioridad. Si el valor recibido no pertenece al enum canónico, la EF rechaza la operación.
- No se acepta el campo `room_id` como entrada desde estas fuentes si no puede verificarse su pertenencia al alojamiento.

### 4.10 Minimización de PII en la creación

- La EF no incluye en el payload enviado a n8n ningún dato de identidad del tenant (`profile_id`, `full_name`, `phone_number`, `email`, `room_label`).
- El payload que la EF publica hacia n8n incluye únicamente: `incident_id`, `client_account_id`, `status`, `category`, `priority`, `source`.
- Los datos de identidad del tenant, incluyendo el `title` y la `description` de la incidencia, se mantienen en `inc_incidents` y solo son accesibles por EFs con autorización explícita.

### 4.11 Registro inicial en `inc_activities`

Toda creación exitosa de una incidencia debe insertar un registro inicial en `inc_activities` con:

- El `incident_id` de la incidencia recién creada
- El actor de la creación y su rol
- El estado inicial (`new`)
- El timestamp de la creación
- La fuente de creación

Si la inserción en `inc_activities` falla, la EF debe hacer rollback del `INSERT` en `inc_incidents` y devolver error al llamante.

### 4.12 Validaciones que la EF debe ejecutar antes de persistir

La EF de creación debe verificar en orden las siguientes condiciones antes de insertar en `inc_incidents`:

1. El entitlement del `client_account` está activo (`rules-10-addon-entitlement.md`).
2. El actor está autorizado para crear incidencias (§4.1 de este documento).
3. Todos los campos obligatorios están presentes para la fuente de creación (§4.2).
4. El valor de `category` es uno de los cinco valores válidos (§4.3).
5. El valor de `priority`, si se especifica, es `normal` o `urgent` (§4.4).
6. Para fuente `web-tenant`: el `requester_profile_id` coincide con el tenant autenticado y el `accommodation_id` tiene contrato activo con ese tenant.
7. Para fuente `web-admin`: el `client_account_id` de la incidencia coincide con el del admin autenticado y el `requester_profile_id` pertenece al `client_account`.
8. Para fuentes `whatsapp` / `webchat`: el `requester_profile_id` está presente y es válido.

Si alguna validación falla, la EF devuelve error descriptivo sin persistir ningún dato.

---

## 5. Casos permitidos

- Un `tenant` abre una incidencia de categoría `maintenance` sobre su habitación activa desde el formulario web del módulo.
- Un `client_admin` crea una incidencia con prioridad `urgent` de categoría `security` en nombre de un tenant de su `client_account`.
- La EF `conv-core-create-incident` de smart-conversations crea una incidencia con fuente `whatsapp` y prioridad `normal` para un tenant identificado mediante `requester_profile_id`.
- Una incidencia creada con fuente `webchat` incluye únicamente los campos obligatorios sin `room_id` ni `description`.
- Un `client_admin` crea una incidencia con `priority = normal` sin especificar el campo; la EF fija el valor por defecto.

---

## 6. Casos prohibidos

- Crear una incidencia en cualquier estado distinto de `new`.
- n8n ejecuta `INSERT INTO inc_incidents` directamente sin pasar por la EF del add-on.
- Un `tenant` crea una incidencia sobre el alojamiento de otro tenant.
- Un `client_admin` crea incidencias para un `client_account` distinto del suyo.
- Crear una incidencia sin entitlement activo en el `client_account`.
- Introducir una fuente de creación distinta de las cuatro aprobadas.
- Introducir una categoría distinta de las cinco aprobadas.
- Introducir un valor de prioridad distinto de `normal` o `urgent`.
- Un `tenant` especifica `priority = urgent` en la creación.
- La EF acepta un `incident_id` o un `status` del payload de entrada en lugar de generarlo.
- La creación se completa sin insertar el registro correspondiente en `inc_activities`.
- El payload enviado a n8n incluye `profile_id`, `full_name`, `phone_number`, `email` u otro dato de identidad del tenant.
- La EF acepta el `client_account_id` del payload en lugar de extraerlo del contexto de autenticación (cuando el actor es `tenant` o `client_admin`).

---

## 7. Impacto en diseño

- El formulario web del tenant (`web-tenant`) no debe exponer el campo de prioridad; la EF siempre fija `normal`.
- El formulario web del admin (`web-admin`) puede ofrecer la selección de prioridad (`normal` / `urgent`).
- La UI no debe exponer el campo `status` en ningún formulario de creación.
- La UI no debe exponer el campo `source`; la EF lo determina según el canal de entrada.
- Los formularios de creación deben incluir el campo `category` como selección de una lista cerrada de los cinco valores válidos.
- La lógica de resolución de identidad del tenant (`requester_profile_id`) cuando la fuente es conversacional es responsabilidad de smart-conversations, no de este add-on.

---

## 8. Impacto en implementación

- Cualquier PR que permita crear una incidencia con `status != 'new'` debe rechazarse.
- Cualquier PR que permita INSERT directo en `inc_incidents` desde n8n o desde la UI sin pasar por la EF debe rechazarse.
- Cualquier PR que pase datos de identidad del tenant al payload de n8n en el evento de creación debe rechazarse.
- Cualquier PR que no valide el entitlement antes de crear la incidencia debe rechazarse.
- Cualquier PR que omita el registro en `inc_activities` como parte de la creación debe rechazarse.
- La EF debe ejecutar el INSERT en `inc_incidents` y el INSERT en `inc_activities` en una única transacción atómica.

---

## 9. Dependencias

- `rules-00-scope-and-principles.md` — fuentes de creación autorizadas (§4.3), minimización de PII hacia n8n (§4.6), decisiones cerradas de alcance
- `rules-05-roles-and-visibility.md` — actores autorizados y capacidades por rol
- `rules-10-addon-entitlement.md` — verificación de entitlement como precondición de toda creación
- `rules-20-incident-lifecycle.md` — estado inicial obligatorio `new`, registro en `inc_activities` como paso obligatorio de la creación
- `contract-create-incident-request.md` — mapeo del campo `urgency` de smart-conversations al campo `priority` de smart-incidents (pendiente de creación en Lote posterior)
- `contract-incident-entity.md` — definición canónica de campos, tipos, valores válidos y restricciones
- `rules-80-security-and-tenancy.md` — minimización de PII y aislamiento multi-tenant

### Requirements relacionados

- `REQ-013-saas-services-catalog.md` — modelo de suscripción SaaS bajo el que opera el add-on `smart-incidents`

---

## 10. Checklist de validación

- [ ] Toda incidencia creada tiene `status = 'new'` sin excepción
- [ ] El campo `source` está presente en toda incidencia y es uno de los cuatro valores válidos
- [ ] El campo `category` está presente y es uno de los cinco valores válidos
- [ ] El campo `priority` es `normal` o `urgent`; nunca otro valor
- [ ] El `client_admin` es el único actor que puede fijar `priority = urgent` en creación
- [ ] Para fuentes `whatsapp` y `webchat`, el valor de `priority` llega ya traducido al enum canónico; la EF no aplica ningún rebaje silencioso
- [ ] El `requester_profile_id` está presente en toda incidencia creada desde cualquier fuente
- [ ] La EF verifica entitlement antes de persistir
- [ ] La EF verifica que el actor está autorizado para la fuente que especifica
- [ ] La EF verifica coherencia de `client_account_id` con el contexto de autenticación
- [ ] Toda creación inserta un registro inicial en `inc_activities`
- [ ] El payload emitido hacia n8n no contiene datos de identidad del tenant
- [ ] No existen INSERT directos en `inc_incidents` fuera de la EF de creación

---

## 11. Notas de control de cambios

**Añadir una nueva fuente de creación** requiere actualizar simultáneamente:
- Este documento (§3.2, §4.1, §4.2 y tabla de fuentes)
- `contract-incident-entity.md` (enum `source`)
- La EF de creación

**Añadir una nueva categoría** requiere actualizar simultáneamente:
- Este documento (§4.3)
- `contract-incident-entity.md` (enum `category`)

**Añadir un nuevo valor de prioridad** requiere actualizar simultáneamente:
- Este documento (§4.4)
- `contract-incident-entity.md` (enum `priority`)

**Cambiar el comportamiento del mapeo urgency → priority** (§4.5) requiere coordinación con el equipo de smart-conversations antes de implementar cualquier cambio.
