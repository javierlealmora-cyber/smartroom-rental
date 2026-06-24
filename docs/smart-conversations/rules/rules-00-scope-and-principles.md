# rules-00-scope-and-principles.md — SmartConversations: Alcance y Principios de Arquitectura

## 1. Propósito

Este documento define el alcance arquitectónico no negociable, las fronteras del sistema y los principios rectores del add-on SmartConversations.

Toda decisión de implementación, definición de contrato, diseño de workflow y guía de skill debe ser coherente con los principios aquí establecidos. Cualquier conflicto entre este documento y otro documento de menor precedencia debe resolverse a favor de este documento.

---

## 2. Alcance

Este documento aplica a:

- Todas las Edge Functions con el prefijo `conv-*`
- Todos los workflows de n8n en el rango `WF-01` a `WF-92`
- El widget WebChat embebible
- La Integration API (Edge Functions `conv-core-*`)
- Todas las tablas de base de datos en el namespace `conv_*`
- Cualquier componente de UI dentro del panel SmartConversations

---

## 3. Decisiones No Negociables

1. **SmartConversations es una capability transversal implementada como módulo/add-on desacoplado del Core.** Está desacoplado de SmartRoom Core. SmartRoom Core funciona de forma autónoma, independientemente de si SmartConversations está activo o instalado.

2. **Los servicios son el producto. Los canales son infraestructura.** Las unidades facturables son `conv_incidencias`, `conv_publicaciones` y `conv_ayuda`. WhatsApp y WebChat son adaptadores de entrega. No son productos.

3. **El canal WhatsApp debe usar Wasender exclusivamente.** Ningún proveedor alternativo de WhatsApp (Twilio, Meta Cloud API, 360dialog u otro) puede usarse ni proponerse.

4. **El add-on nunca debe acceder directamente a las tablas de SmartRoom Core.** Toda integración con el Core se realiza a través de las Edge Functions contractuales `conv-core-*` (Integration API).

5. **La IA no valida el estado de negocio.** La IA puede clasificar intenciones, extraer entidades y redactar respuestas. La IA nunca debe determinar si un tenant, inquilino o incidencia son válidos.

6. **La activación opera en tres niveles.** La suscripción umbrella `smart_conversations` en `saas_service_subscriptions` es el interruptor global del add-on: si está inactiva para un tenant, ningún mensaje de ese tenant se procesa, con independencia de la configuración de canales y servicios. Dentro de esa umbrella, la activación es siempre tenant × canal (nivel 2) y tenant × servicio × canal (nivel 3) mediante las filas de `conv_service_activations`.

7. **n8n no recibe PII.** n8n recibe únicamente `session_id`, `client_account_id`, `message_text`, `channel` e `identity_level`. Nunca debe recibir `profile_id`, `phone_number`, `full_name`, `room_label`, `residence_name`, `email`, `assignment_id` ni `incident_id`.

8. **La desconexión debe ser limpia por diseño.** Desactivar un servicio o canal para un tenant es una actualización en base de datos. No se requiere ningún cambio de código ni redespliegue.

9. **La idempotencia es obligatoria para los webhooks entrantes.** Cada webhook de Wasender debe ser deduplicado contra `conv_messages.wasender_message_id` antes de cualquier procesamiento.

10. **Los eventos del activity log deben publicarse en SmartRoom Core.** Los hitos conversacionales relevantes deben reportarse al activity log del Core mediante Integration API. El contenido bruto de los mensajes nunca debe publicarse en el activity log del Core.

---

## 4. Reglas Obligatorias

### 4.1 Frontera add-on / Core

El add-on es propietario de:
- Estado conversacional (`conv_sessions`, `conv_cases`, `conv_messages`)
- Configuración de canales (`conv_wa_sessions`, `conv_wc_configs`)
- Activación de servicios por tenant (`conv_service_activations`)
- Base de conocimiento (`conv_kb`)
- Cola de envíos (`conv_send_queue`)

SmartRoom Core es propietario de:
- Tenants, alojamientos, habitaciones, contratos, perfiles activos de inquilinos
- Incidencias oficiales, leads, estado activo de asignaciones

El add-on solo puede crear o actualizar datos del Core a través de la Integration API `conv-core-*`. El acceso directo a tablas está prohibido.

### 4.2 Los servicios como unidades de activación

Los tres servicios deben tratarse siempre como unidades independientes, facturables y activables:

| `service_code` | Nombre |
|---|---|
| `conv_incidencias` | Gestión de Incidencias |
| `conv_publicaciones` | Gestión de Publicaciones |
| `conv_ayuda` | Ayuda / Consultas |

Ningún servicio puede asumirse activo a menos que exista una fila con `is_active = true` en `conv_service_activations` para esa combinación `client_account_id × service_code × channel`.

### 4.3 Los canales como adaptadores de entrega

Los dos canales disponibles:

| `channel` | Implementación |
|---|---|
| `whatsapp` | Wasender — obligatorio, sin alternativa |
| `webchat` | Widget React embebible + Supabase Realtime |

Un servicio no contiene lógica de negocio específica de canal. Un canal no contiene lógica de negocio específica de servicio. Ambos se conectan a través de `conv-ingest` y del contrato compartido `NormalizedMessage`.

### 4.4 Jerarquía de activación

Todo mensaje entrante debe superar tres comprobaciones de activación en orden:

1. Suscripción umbrella: `saas_service_subscriptions WHERE service_code = 'smart_conversations' AND status = 'active'`
2. Estado operativo del canal: `conv_wa_sessions.status = 'active'` o `conv_wc_configs.is_active = true`
3. Al menos un servicio activo para ese canal: `conv_service_activations WHERE channel = X AND is_active = true`

Si algún nivel falla, el mensaje se ignora silenciosamente. El sistema nunca debe devolver una respuesta 4xx a un webhook de Wasender independientemente del estado de activación.

### 4.5 Frontera de minimización de PII

| Capa | Recibe | Nunca debe recibir |
|---|---|---|
| n8n | `session_id`, `client_account_id`, `message_text`, `channel`, `identity_level` | `profile_id`, `phone_number`, `full_name`, `room_label`, `residence_name`, `email`, `assignment_id` |
| Proveedor de IA | `message_text`, resumen anónimo del caso, texto de KB, datos públicos de anuncios | `phone_number`, `full_name`, `profile_id`, `room_label`, datos de contrato, historial de ocupación |
| Edge Functions | Todo lo anterior + `phone_number` (solo para `conv-core-validate-identity`) + `profile_id` (almacenado, no reenviado) | — |

Cuando una respuesta del bot debe mencionar datos personales, la Edge Function los inyecta después de la generación por IA. La IA genera texto con marcadores (`{ref}`, `{name}`); la EF sustituye el valor real. La IA nunca recibe el valor real directamente.

### 4.6 Obligación del activity log

El add-on debe publicar eventos de hitos funcionales en SmartRoom Core mediante Integration API. Los hitos principales incluyen, entre otros:
- Comienza una conversación relevante
- Se valida la identidad de un inquilino
- Se crea una pre-incidencia o una incidencia oficial
- Se crea un lead
- Se escala un caso
- Se cierra un caso
- Cambios de ciclo de vida de la suscripción y de los canales del tenant

Esta enumeración es ilustrativa, no exhaustiva. El catálogo completo y normativo de eventos obligatorios, con sus payloads exactos y sus responsables de publicación, vive en `rules-75-activity-log.md`, que es la única fuente de verdad sobre qué debe publicarse y con qué estructura.

Los mensajes brutos nunca deben publicarse en el activity log del Core.

---

## 5. Casos Permitidos

- Un tenant del add-on puede tener cualquier subconjunto de servicios activos, incluido ninguno.
- Un servicio puede estar activo en un canal e inactivo en otro.
- El add-on puede estar suspendido (umbrella inactiva) sin eliminar la configuración de canales o servicios.
- Un tenant puede reactivar la suscripción umbrella y recuperar toda la configuración anterior de forma inmediata.
- Las Edge Functions pueden llamar a las funciones `conv-core-*` usando credenciales `service_role`.

---

## 6. Casos Prohibidos

- Usar un proveedor de WhatsApp distinto a Wasender en cualquier parte del codebase.
- Acceder directamente a tablas de SmartRoom Core desde código del add-on.
- Pasar `profile_id`, `phone_number`, `full_name` o `room_label` a n8n o al proveedor de IA.
- Usar IA para determinar si un inquilino está activo, si una incidencia es válida o si existe un anuncio.
- Activar un servicio sin una fila en `conv_service_activations`.
- Tratar la configuración de SmartConversations como parte de SmartRoom Core.
- Devolver HTTP 4xx a un webhook de Wasender cuando el tenant está inactivo.
- Publicar mensajes de chat brutos en el activity log de SmartRoom Core.

---

## 7. Impacto en el Diseño

- Toda funcionalidad que abarque un servicio debe implementarse en `conv-ingest` o en WF-10, no en código específico de canal.
- Toda funcionalidad que lea estado de negocio debe llamar a una Edge Function `conv-core-*`, no consultar tablas del Core.
- Los workflows de n8n deben recibir únicamente los campos definidos en la frontera de minimización de PII.
- Los tres servicios deben permanecer activables de forma independiente a nivel de modelo de datos.
- Desconectar a un tenant de WhatsApp en cualquier nivel no debe requerir cambios de código.

---

## 8. Impacto en la Implementación

- Cualquier PR que introduzca acceso directo a tablas del Core desde el add-on debe rechazarse.
- Cualquier PR que pase PII a los payloads de n8n debe rechazarse.
- Cualquier PR que use un proveedor de WhatsApp distinto a Wasender debe rechazarse.
- Las Edge Functions que llaman a la IA deben eliminar todos los identificadores personales antes de construir el prompt.
- Los workflows de n8n deben tratar `identity_level` como un valor de enum, nunca como información personal.

---

## 9. Dependencias

- `rules-10-service-catalog.md` — catálogo de servicios y canales
- `rules-20-tenant-activation-and-lifecycle.md` — jerarquía de activación y ciclo de vida
- `rules-30-whatsapp-channel.md` — reglas de integración con Wasender
- `rules-40-identity-validation.md` — reglas de validación de identidad
- `rules-70-integration-api.md` — contratos de la Integration API
- `rules-75-activity-log.md` — obligación del activity log
- `rules-80-data-and-privacy.md` — política de PII
- `rules-02-project-structure-and-addons.md` — convención de namespace para EFs (`conv-*`), workflows (`WF-*`) y tablas (`conv_*`) usada en el §2 de este documento

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`

---

## 10. Checklist de Validación

- [ ] Ningún fichero del add-on consulta tablas del Core directamente
- [ ] Ningún payload de n8n contiene `profile_id`, `phone_number`, `full_name` ni `room_label`
- [ ] Wasender es el único proveedor de WhatsApp referenciado en el codebase
- [ ] Todo mensaje entrante comprueba los tres niveles de activación en orden
- [ ] `conv-wa-webhook` siempre responde 200, incluso para tenants inactivos
- [ ] Los prompts de IA se construyen sin identificadores personales
- [ ] Los eventos del activity log se publican mediante Integration API, no mediante insert directo
- [ ] Los tres servicios pueden activarse y desactivarse de forma independiente

---

## 11. Notas de Control de Cambios

Los cambios en este documento requieren revisión de arquitectura antes del merge.

Este documento tiene la máxima precedencia dentro del conjunto documental de SmartConversations. Cualquier cambio aquí puede afectar en cascada a documentos de tipo `rules`, `contracts`, `skills` y `diagrams`.

Las decisiones marcadas como no negociables en la Sección 3 no deben modificarse sin aprobación explícita de producto y arquitectura.
