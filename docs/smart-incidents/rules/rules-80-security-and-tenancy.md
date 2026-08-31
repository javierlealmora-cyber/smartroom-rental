# rules-80-security-and-tenancy.md — smart-incidents: Seguridad y Aislamiento Multi-tenant

## 1. Propósito

Este documento define cómo se protege el add-on `smart-incidents` frente a solicitudes no autorizadas, cómo se aísla cada `client_account`, qué contexto es confiable y cuál no lo es, qué validaciones debe ejecutar el provider de forma independiente, qué datos y accesos están prohibidos, y cómo se protege el add-on frente a accesos cross-tenant.

Establece los principios de seguridad y tenancy que deben guiar toda la implementación del provider-side. `rules-00-scope-and-principles.md`, `rules-05-roles-and-visibility.md` y `contract-incident-entity.md` referencian este documento para la implementación técnica del aislamiento.

---

## 2. Alcance

Este documento aplica a:

- Todas las Edge Functions del add-on `smart-incidents`
- El acceso a las tablas `inc_incidents`, `inc_attachments` e `inc_activities`
- Las políticas RLS sobre las tablas del add-on
- Los datos que el provider puede registrar en logs
- Los datos que el provider puede publicar hacia n8n o hacia el `audit_log` del Core
- Las fronteras de acceso entre Smart Incidents y los demás módulos del sistema
- El tratamiento de adjuntos cuando estén implementados

---

## 3. Decisiones no negociables

1. **El `client_account_id` no puede aceptarse ciegamente desde el payload.** Debe vincularse al caller autenticado y al contexto server-side. El provider revalida cualquier identificador de tenant recibido contra el token de autenticación y contra el entitlement.

2. **El actor técnico y el solicitante humano son identidades distintas.** El actor técnico identifica al sistema que llama (p.ej. SmartConversations). El solicitante humano es `requester_profile_id`. Ninguno sustituye al otro y ambos deben validarse por separado.

3. **SmartConversations no accede a tablas `inc_*`.** La frontera entre módulos es estricta: SC no realiza queries directas sobre `inc_incidents`, `inc_activities` ni `inc_attachments`.

4. **Smart Incidents no accede a tablas `conv_*`.** La frontera entre módulos es estricta en ambas direcciones.

5. **n8n no accede a ninguna base de datos directamente.** n8n no recibe `service_role` ni ninguna credencial de base de datos. Solo recibe payloads reducidos y allowlisted desde las EFs del add-on.

6. **RLS obligatoria en todas las tablas `inc_*`.** La RLS es la línea de defensa de base de datos. La validación en las EFs y en la UI son capas adicionales, no sustitutos de la RLS.

7. **Ante mismatch cross-tenant: fail closed.** Ante cualquier discrepancia entre el tenant declarado en el payload y el tenant verificado por el sistema, la operación se rechaza sin devolver información sobre la existencia o pertenencia del recurso.

---

## 4. Reglas obligatorias

### 4.1 Fuente confiable del `client_account_id`

El `client_account_id` que se usa en cualquier operación del add-on debe vincularse al caller autenticado y al contexto server-side. El valor recibido en el payload nunca es confiable por sí mismo, independientemente de la fuente.

#### Cuatro conceptos que no son equivalentes ni sustituibles entre sí

| Concepto | Pregunta que responde | Quién lo verifica |
|---|---|---|
| **Autenticación** | ¿Quién es el caller? | El provider, al recibir la petición |
| **Autorización del caller** | ¿Está el caller autenticado autorizado a operar para el `client_account_id` solicitado? | El provider, vinculando caller y tenant server-side |
| **Entitlement** | ¿Tiene el `client_account` la suscripción activa a `smart_incidents`? | El provider, según `rules-10` |
| **Integridad multi-tenant** | ¿Corresponde el `client_account_id` del payload al tenant verificado para este caller? | El provider, como condición de toda operación |

Verificar el entitlement no sustituye la autorización del caller. Un `client_account` con entitlement activo no implica que el caller esté autorizado a operar para él.

#### Para actores `tenant` y `client_admin`

- El `client_account_id` se extrae del contexto de autenticación de la EF.
- El valor declarado en el payload, si existe, se valida contra el extraído del contexto. Ante cualquier discrepancia, fail closed.

#### Para la integración service-to-service desde SmartConversations (actor `system`)

- El `client_account_id` puede formar parte del request contractual.
- El valor recibido en el payload no es confiable por sí solo.
- El provider debe vincular server-side: (1) el caller autenticado, (2) la operación que está ejecutando, y (3) el `client_account_id` solicitado.
- Si el caller service-to-service puede operar para múltiples `client_account`, esa capacidad debe quedar explícitamente autorizada por la autenticación del provider, no inferirse de la mera posesión de una credencial válida.
- Tras establecer la vinculación caller–tenant, el provider revalida el entitlement (`rules-10`), el requester y los recursos de dominio.
- Ante cualquier discrepancia entre el tenant declarado y el tenant verificado: fail closed, sin confirmar existencia del tenant, sin procesar la operación.

El mecanismo concreto de autenticación del caller service-to-service (token, claims, audience, scopes) no se diseña en esta rule. Se formalizará en el contrato o diseño de autenticación del provider en SI-P3. Esta rule fija los principios de verificación, no el mecanismo.

### 4.2 Actor técnico vs solicitante humano

#### Actor técnico

El actor técnico identifica al sistema que realiza la llamada al provider. Para solicitudes originadas en SmartConversations, el actor técnico llega serializado como:

```json
{ "type": "system" }
```

El actor técnico no porta datos de identidad personal. No incluye nombre, teléfono, email, JID, `sender_ref`, WebChat token ni ningún dato de identidad conversacional.

#### Solicitante humano (`requester_profile_id`)

El `requester_profile_id` identifica al perfil del inquilino que origina la incidencia. Es un UUID que referencia un perfil del Core.

El actor técnico y el solicitante humano no son equivalentes ni intercambiables. Ambos deben validarse.

### 4.3 Validaciones de dominio que el provider debe ejecutar

Las siguientes validaciones son responsabilidad exclusiva del provider. No pueden delegarse al consumer ni a la UI. Las validaciones son de tres tipos: autorización, integridad de dominio y aislamiento multi-tenant. No son verificaciones de identidad conversacional.

#### 4.3.1 Validación de `requester_profile_id`

**Carácter del campo según fuentes canónicas:**

`rules-30-incident-creation.md` §4.2 declara `requester_profile_id` como **obligatorio** para las cuatro fuentes (`web-tenant`, `web-admin`, `whatsapp`, `webchat`). `contract-incident-entity.md` §4.1 lo declara igualmente como **Obligatorio**. Ambas fuentes son consistentes: no existe ninguna fuente de creación en la que `requester_profile_id` pueda ser nulo.

No existe en la documentación canónica ninguna excepción de creación administrativa sin tenant solicitante. Si en el futuro se contemplara una incidencia sin `requester_profile_id`, esa excepción requeriría una decisión formal en `rules-30` y en `contract-incident-entity.md` antes de implementarse.

**Reglas de validación por fuente:**

##### Fuente `web-tenant`

- `requester_profile_id` es obligatorio.
- Deriva del contexto autenticado: el perfil autenticado activo del tenant es el requester.
- El provider verifica que el perfil autenticado coincide con el `requester_profile_id` recibido (rules-30 §4.7).
- Si el valor recibido no coincide con el perfil autenticado, fail closed.

##### Fuente `web-admin`

- `requester_profile_id` es obligatorio.
- El `client_admin` crea la incidencia en nombre de un tenant de su `client_account` (rules-30 §4.8).
- El provider verifica que el perfil referenciado pertenece a un perfil activo dentro del mismo `client_account_id`.
- El `client_account_id` se extrae del contexto de autenticación del `client_admin`, no del payload.

##### Fuentes `whatsapp` y `webchat`

- `requester_profile_id` es obligatorio.
- La identidad del solicitante es resuelta previamente por SmartConversations antes de invocar al provider (rules-30 §4.9).
- Smart Incidents no realiza resolución de identidad conversacional: no usa nombre, teléfono, JID, `sender_ref`, `STRONG_MATCH_ACTIVE` ni ningún estado interno conversacional.
- El provider revalida que el `requester_profile_id` recibido existe en el Core, pertenece al mismo `client_account_id` y está activo.
- Si no recibe un `requester_profile_id` válido, rechaza la operación.

**Invariante común a todas las fuentes:**

El provider verifica que:

- El `requester_profile_id` existe como perfil en el Core
- El perfil pertenece al mismo `client_account_id` de la operación
- El perfil está activo y no ha sido eliminado
- El perfil está autorizado para el alojamiento indicado

El acceso a los datos del perfil en el Core se realiza únicamente a través de interfaces, puertos, helpers o EFs controladas que ya existan en el proyecto. Si dichas interfaces no existen para este caso de uso, su implementación se clasifica como pendiente de creación en el lote correspondiente. No se inventa un acceso directo a tablas del Core.

#### 4.3.2 Validación de `accommodation_id`

El provider debe verificar que:

- El `accommodation_id` recibido existe como alojamiento en el Core
- El alojamiento pertenece al mismo `client_account_id` de la operación
- El alojamiento está en un estado que permite asociarle incidencias

#### 4.3.3 Validación de `room_id`

Cuando `room_id` está presente, el provider debe verificar que:

- La habitación existe en el Core
- La habitación pertenece al `accommodation_id` de la operación
- La habitación pertenece al mismo `client_account_id`

Si `room_id` no puede verificarse por pertenencia al alojamiento, la EF rechaza la operación. No se acepta `room_id` sin verificación.

#### 4.3.4 Aislamiento multi-tenant: regla general

Toda consulta y toda operación de escritura debe incluir el `client_account_id` verificado en su condición. No puede existir ninguna consulta sobre tablas `inc_*` que devuelva resultados de múltiples tenants salvo en operaciones de `superadmin` con propósito de gestión de plataforma.

### 4.4 Comportamiento ante cross-tenant

Cuando se detecta cualquier mismatch entre el tenant declarado y el tenant verificado, el comportamiento obligatorio es:

- Fail closed: la operación se rechaza sin ejecutar
- No se crea ni modifica ningún dato
- No se confirma la existencia del recurso al caller
- No se devuelven IDs ajenos al tenant del caller
- No se diferencia públicamente entre un recurso inexistente y un recurso perteneciente a otro tenant
- El error que se devuelve al caller es opaco y no revela información de tenancy
- Se registra en los logs únicamente información allowlisted (ver §4.7)

### 4.5 RLS y defensa en profundidad

**Política de RLS en tablas `inc_*`:**

- RLS obligatoria en `inc_incidents`, `inc_attachments` e `inc_activities`
- Filtro por `client_account_id` en todas las policies de SELECT, INSERT y UPDATE
- Para el rol `tenant`: filtro adicional por `requester_profile_id` en las policies de SELECT
- Los roles de autenticación de base de datos que acceden a las tablas `inc_*` quedan definidos en la migración correspondiente de SI-P5

La SQL de las policies no se incluye en esta rule. Su implementación se define en SI-P5.

**Defensa en capas:**

| Capa | Responsabilidad |
|---|---|
| RLS | Barrera de base de datos — impide lecturas o escrituras cross-tenant incluso si la EF fallara |
| EF provider | Validación de dominio antes de la operación — entitlement, actor, requester, accommodation, room |
| UI | Ocultación de datos y acciones no autorizados para el rol autenticado |

La UI no sustituye las validaciones backend. La EF no sustituye la RLS.

**Uso de `service_role`:**

- Las EFs del add-on pueden usar `service_role` para operaciones internas que lo requieran (p.ej. publicación al `audit_log` del Core)
- `service_role` no elimina la obligación de validar el dominio y el entitlement antes de operar
- `service_role` no puede compartirse como credencial entre módulos ni entregarse a n8n
- El acceso con `service_role` desde las EFs del add-on no exime de aplicar los filtros de `client_account_id` en las operaciones sobre tablas `inc_*`

### 4.6 Fronteras de acceso entre módulos

| Acceso | Permitido |
|---|---|
| SmartConversations → tablas `inc_*` (lectura o escritura directa) | No |
| Smart Incidents → tablas `conv_*` (lectura o escritura directa) | No |
| n8n → cualquier base de datos (lectura o escritura) | No |
| n8n recibe `service_role` o credenciales de base de datos | No |
| Foreign keys entre tablas de dominios separados (`conv_*` ↔ `inc_*`) | No |
| Datos de canal como fuente de identidad de dominio en Smart Incidents | No |

### 4.7 Datos prohibidos en la identidad provider

Los siguientes campos y datos no pueden utilizarse como fuente de identidad ni como datos de dominio en el provider:

- `identity_level`, `identity_verified`, `verified` (estados internos conversacionales)
- Nombre, apellido, apodo
- Número de teléfono, email
- JID (identificador de WhatsApp), `wa_jid`
- `sender_ref`, `raw_payload`
- WebChat token
- Metadatos de Wasender
- Metadatos internos de n8n
- Decisiones de IA, prompts o respuestas raw de modelos
- Cualquier credencial de autenticación (tokens, API keys)

### 4.8 Política de privacidad y logging

Los logs de las EFs del add-on pueden incluir únicamente campos de la lista siguiente:

**Campos allowlisted en logs:**

- `request_id`
- `correlation_id`
- Versión del contrato (`contract_version`)
- Resultado de la operación (éxito / código de error)
- Duración en milisegundos
- Indicador de replay idempotente (sí/no)
- Entorno (`APP_ENVIRONMENT`)
- Código de categoría de la incidencia (no el título ni la descripción)
- Estado de la incidencia

**Campos prohibidos en logs:**

- Tokens de autenticación (ninguno)
- `idempotency_key` completa
- Payload raw del request o del response
- Título o descripción de la incidencia
- PII del solicitante (`profile_id`, nombre, teléfono, email)
- SQL ejecutado
- Stack traces expuestos al exterior
- Secretos o variables de entorno con credenciales
- URLs internas o privadas
- `requester_profile_id` en claro (excepto en logs internos protegidos con nivel de acceso controlado)

### 4.9 Tratamiento de adjuntos

Los adjuntos (`inc_attachments`) están diferidos contractualmente. Esta rule establece los principios que deberán respetarse cuando se implementen:

- No se inventan mecanismos de transferencia de binarios en esta rule
- No se permiten URLs privadas sin contrato formal que las regule
- El almacenamiento de adjuntos no está definido todavía
- La implementación de adjuntos debe referenciar el contrato de adjuntos cuando esté disponible (pendiente de creación)
- Cualquier adjunto debe mantener el aislamiento de tenant: no pueden existir adjuntos accesibles desde múltiples `client_account`

---

## 5. Casos permitidos

- Una EF extrae el `client_account_id` del contexto de autenticación y lo usa como condición de filtro en todas sus consultas sobre `inc_*`.
- El provider verifica `requester_profile_id` contra los datos del Core usando una interfaz o helper controlado que ya exista en el proyecto.
- El provider rechaza una operación cuyo `accommodation_id` no pertenece al `client_account_id` verificado.
- El provider devuelve el mismo error opaco para un recurso inexistente y para un recurso de otro tenant, sin distinguir entre ambos casos.
- Las EFs usan `service_role` para publicar al `audit_log` del Core, aplicando aun así los filtros de dominio en la operación.
- n8n recibe únicamente el payload reducido y allowlisted definido en `contract-n8n-event-payload.md` (pendiente de creación).

---

## 6. Casos prohibidos

- Una EF acepta `client_account_id` desde el payload sin verificarlo contra el contexto autenticado.
- Una EF o consulta sobre `inc_*` no incluye `client_account_id` en la condición de filtro.
- El provider utiliza `identity_level`, `STRONG_MATCH_ACTIVE` u otros estados internos de identidad conversacional como fuente de identidad de dominio.
- El provider accede directamente a tablas `conv_*`.
- SmartConversations accede directamente a tablas `inc_*`.
- n8n recibe `service_role` o credenciales de base de datos.
- El provider devuelve información diferenciada sobre si un recurso es inexistente vs perteneciente a otro tenant.
- Un log del provider incluye PII, tokens, payloads raw, SQL o secretos.
- Se implementan adjuntos con URLs privadas sin contrato formal.
- `service_role` se comparte entre módulos como credencial de acceso.
- Existen foreign keys entre tablas de dominios separados.
- Los datos del canal (JID, `sender_ref`, token WebChat) se usan como identidad de dominio en Smart Incidents.

---

## 7. Impacto en diseño

- Toda EF del add-on debe estructurar su flujo con la siguiente secuencia: (1) verificar entitlement, (2) verificar identidad del caller, (3) validar identidad del solicitante, (4) validar recursos de dominio, (5) ejecutar la operación.
- El diseño del port y el adapter de validación de recursos de dominio (requester, accommodation, room) debe abstraer el mecanismo de acceso al Core, de modo que si el mecanismo cambia, solo cambie el adapter.
- La RLS debe diseñarse como primera línea de defensa autónoma, válida incluso si la lógica de la EF fallara.
- Los logs deben diseñarse con la lista allowlisted como única fuente de campos permitidos, no como lista de exclusión a partir de un log completo.
- La frontera entre módulos no admite excepciones: cualquier necesidad de datos cross-módulo debe resolverse a través de un port/adapter o EF intermediaria, no mediante acceso directo a tablas.

---

## 8. Impacto en implementación

- Cualquier PR que realice una consulta sobre `inc_*` sin `client_account_id` en la condición debe rechazarse.
- Cualquier PR que acepte `client_account_id` sin verificarlo contra el contexto autenticado debe rechazarse.
- Cualquier PR que exponga PII, tokens o secretos en logs debe rechazarse.
- Cualquier PR que establezca acceso directo cross-módulo (SC → `inc_*` o SI → `conv_*`) debe rechazarse.
- Cualquier PR que entregue `service_role` a n8n debe rechazarse.
- La migración de RLS (SI-P5) debe implementar policies que apliquen el filtro de `client_account_id` en todas las operaciones sobre `inc_incidents`, `inc_activities` e `inc_attachments`.
- La implementación del port de validación de recursos de dominio (requester, accommodation, room) se clasifica como pendiente hasta que las interfaces controladas disponibles en el proyecto sean identificadas en SI-P4.

---

## 9. Dependencias

| Dependencia | Relación |
|---|---|
| `rules-00-scope-and-principles.md` | Define la frontera add-on/Core, la prohibición de acceso directo a tablas del Core y la minimización de PII hacia n8n |
| `rules-05-roles-and-visibility.md` | Define los roles y las capacidades; este documento no amplía los roles allí definidos |
| `rules-10-addon-entitlement.md` | Define la verificación de entitlement; es la primera validación que precede a las de este documento |
| `contract-incident-entity.md` | Define los campos de la entidad; §3.3 fija `client_account_id` como clave de partición lógica |
| `REQ-013-saas-services-catalog.md` | Modelo de `saas_service_subscriptions`; confirma `client_account_id` como campo de partición |
| `docs/architecture/audit-log-system.md` | Patrón de publicación al `audit_log` del Core con service_role — referenciado en rules-00 §3.6 |
| `contract-n8n-event-payload.md` | Definirá el payload allowlisted para n8n — pendiente de creación (SI-P6A) |
| `contract-activity-log-event.md` | Definirá los payloads del `audit_log` — pendiente de creación (SI-P6A) |
| `rules-80` → migraciones SI-P5 | Las policies RLS se implementan en SI-P5 guiadas por esta rule |

---

## 10. Checklist de validación

- [ ] Ninguna EF acepta `client_account_id` sin verificarlo contra el contexto autenticado o el entitlement
- [ ] Ninguna consulta sobre tablas `inc_*` omite el filtro de `client_account_id`
- [ ] Los roles `tenant` tienen filtro adicional por `requester_profile_id` en sus queries de lectura
- [ ] El provider no usa estados internos de identidad conversacional (`identity_level`, `STRONG_MATCH_ACTIVE`, etc.)
- [ ] SmartConversations no realiza queries directas sobre tablas `inc_*`
- [ ] Smart Incidents no realiza queries directas sobre tablas `conv_*`
- [ ] n8n no recibe `service_role` ni credenciales de base de datos
- [ ] Ante cross-tenant, el error devuelto es opaco y no diferencia entre recurso inexistente y recurso de otro tenant
- [ ] Los logs no contienen PII, tokens, payloads raw, SQL ni secretos
- [ ] `service_role` no se comparte entre módulos
- [ ] Los adjuntos no se implementan sin contrato formal
- [ ] No existen foreign keys entre tablas de dominios separados

---

## 11. Notas de control de cambios

Los cambios en este documento requieren revisión de arquitectura y de seguridad antes del merge.

Este documento define principios de seguridad y aislamiento que afectan directamente a la RLS (SI-P5), a los ports de validación de dominio (SI-P4) y a los logs de todas las EFs. Una modificación en las reglas de cross-tenant, en la política de logging o en las fronteras de acceso entre módulos debe reflejarse aquí antes de implementarse.

Cualquier propuesta de excepción a las fronteras de acceso entre módulos (acceso cross-módulo controlado, foreign key entre dominios) debe documentarse como Decisión de Arquitectura (ADR) y ser aprobada explícitamente antes de ser incorporada a este documento.
