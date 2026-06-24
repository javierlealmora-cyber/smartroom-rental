# REQ-SC-000 - SmartConversations Capability

## Status
ACTIVE

## Owner
@responsable

## Last updated
2026-06-10

## Requirement type
`capability`

## Priority
`MUST`

## Scope level
`global`

---

## 🎯 Objetivo

Definir **SmartConversations** como capacidad transversal para gestionar interacciones conversacionales entre usuarios finales y SmartRoom Rental a través de distintos canales.

SmartConversations no representa un único canal ni un único servicio funcional. Es la capacidad común que permite:

- recibir mensajes desde canales conversacionales;
- normalizar entradas;
- crear o recuperar sesiones conversacionales;
- validar identidad cuando sea necesario;
- enrutar cada conversación hacia un servicio funcional;
- generar respuestas;
- mantener trazabilidad;
- publicar eventos funcionales resumidos en el registro de actividad de SmartRoom Core.

Los servicios funcionales iniciales que utilizarán esta capacidad son:

- `incidents`
- `advertisement`
- `help`

En el futuro podrán añadirse otros servicios, como encuestas, notificaciones, voz IP, atención comercial u otros flujos conversacionales.

---

## 📌 Alcance

Este requisito cubre:

- La definición general de SmartConversations como capacidad transversal.
- La separación entre capability, canal y servicio.
- La forma en que distintos servicios funcionales pueden usar canales conversacionales.
- La necesidad de routing común entre canales y servicios.
- La necesidad de validación de identidad cuando un servicio lo requiera.
- La necesidad de registrar eventos funcionales resumidos en el activity log de SmartRoom Core.
- La obligación de mantener desacoplamiento entre SmartRoom Core, canales externos, n8n, IA y servicios conversacionales.
- La base funcional para que nuevos canales y servicios puedan añadirse sin rediseñar toda la arquitectura.

Este requisito NO cubre en detalle:

- La implementación específica del canal WhatsApp.
- La implementación específica del canal Chatbot.
- La implementación futura de voz IP.
- El flujo interno concreto de incidencias.
- El flujo interno concreto de anuncios.
- El flujo interno concreto de ayuda.
- La definición técnica completa de payloads, contratos internos, workflows o Edge Functions.

---

## 🚫 Fuera de alcance

Queda fuera de este requisito:

- Definir reglas específicas de Wasender.
- Definir reglas específicas del widget Chatbot.
- Definir reglas específicas de voz IP.
- Definir los estados concretos de una incidencia.
- Definir la gestión completa de anuncios.
- Definir el contenido funcional de la base de conocimiento de ayuda.
- Sustituir los requisitos propios de cada servicio funcional.
- Sustituir los requisitos específicos de integración servicio × canal.
- Definir tests automáticos de implementación.
- Convertir SmartConversations en un módulo monolítico acoplado al Core.

---

## 👥 Actores

| Actor | Descripción | Responsabilidad |
|---|---|---|
| Usuario final | Persona que interactúa con SmartRoom por un canal conversacional. Puede ser inquilino, ex-inquilino, lead o usuario no identificado. | Inicia o continúa una conversación. |
| Inquilino activo | Usuario validado como ocupante activo de una habitación o alojamiento. | Puede ejecutar operaciones que requieran identidad activa, según el servicio. |
| Ex-inquilino | Usuario que existió en SmartRoom Core pero ya no tiene asignación activa. | Puede recibir respuestas limitadas o ser escalado, según el servicio. |
| Lead externo | Usuario interesado en un anuncio o alojamiento sin ser necesariamente inquilino. | Puede interactuar con servicios comerciales o de información pública. |
| Admin del tenant | Usuario del cliente SaaS que configura servicios, revisa conversaciones y atiende casos escalados. | Gestiona configuración y operación humana cuando proceda. |
| SmartRoom Core | Fuente de verdad de tenants, alojamientos, habitaciones, inquilinos, asignaciones, anuncios e incidencias oficiales. | Valida identidad y ejecuta operaciones de negocio críticas. |
| SmartConversations | Capacidad conversacional que coordina canales, sesiones, routing, identidad, respuestas y trazabilidad. | Orquesta la interacción común entre canales y servicios. |
| Canal conversacional | Medio de entrada/salida como WhatsApp, Chatbot web o futuros canales. | Recibe y entrega mensajes. |
| Servicio funcional | Dominio que atiende una intención concreta: incidencias, anuncios, ayuda u otros. | Ejecuta lógica funcional específica. |
| n8n | Motor de orquestación de flujos conversacionales. | Coordina workflows, sin ser fuente de verdad. |
| IA | Componente auxiliar para clasificar intención, extraer entidades y redactar respuestas. | Asiste al proceso, sin tomar decisiones de negocio. |

---

## 🧩 Descripción funcional

SmartConversations debe actuar como capa común entre canales conversacionales y servicios funcionales.

La capacidad debe permitir:

1. Recibir mensajes desde distintos canales.
2. Normalizar los mensajes en una estructura común.
3. Crear o recuperar una sesión conversacional.
4. Resolver el tenant asociado.
5. Comprobar qué servicios están activos para ese tenant y canal.
6. Clasificar o confirmar la intención del usuario.
7. Enrutar la conversación al servicio funcional correspondiente.
8. Validar identidad cuando el servicio lo exija.
9. Recibir una respuesta canónica del servicio.
10. Enviar la respuesta al usuario por el canal correspondiente.
11. Registrar eventos funcionales resumidos en el activity log del Core cuando proceda.
12. Mantener trazabilidad técnica en SmartConversations sin publicar conversaciones brutas en el Core.

La capacidad debe ser multicanal y multiservicio. La incorporación de un nuevo canal o servicio no debe obligar a rediseñar toda la arquitectura.

---

## 🧭 Posición dentro del modelo SmartConversations

Este requisito representa la raíz funcional de SmartConversations.

- [x] Capability transversal
- [ ] Canal conversacional
- [ ] Estándar de integración de canal
- [ ] Servicio funcional
- [ ] Integración servicio × canal

Relación jerárquica:

| Nivel | Requirement relacionado |
|---|---|
| Capability | `REQ-SC-000-smart-conversations-capability.md` |
| Canal WhatsApp | `REQ-SC-010-whatsapp-channel.md` |
| Estándar de integración WhatsApp | `REQ-SC-020-whatsapp-channel-integration.md` |
| Servicio incidents | `REQ-SC-100-incidents-service.md` |
| Integración incidents × WhatsApp | `REQ-SC-110-incidents-whatsapp-channel-integration.md` |
| Integración incidents × Chatbot | `REQ-SC-120-incidents-chatbot-channel-integration.md` |
| Servicio advertisement | `REQ-SC-150-advertisement-service.md` |
| Integración advertisement × WhatsApp | `REQ-SC-160-advertisement-whatsapp-channel-integration.md` |
| Integración advertisement × Chatbot | `REQ-SC-170-advertisement-chatbot-channel-integration.md` |
| Servicio help | `REQ-SC-200-help-service.md` |
| Canal Chatbot | `REQ-SC-300-chatbot-channel.md` |
| Estándar de integración Chatbot | `REQ-SC-320-chatbot-channel-integration.md` |

---

## 🔁 Flujo funcional

1. El usuario envía un mensaje por un canal conversacional.
2. El adaptador del canal recibe el mensaje.
3. El mensaje se valida según las reglas del canal.
4. El sistema resuelve el tenant.
5. El mensaje se normaliza.
6. Se crea o recupera la sesión conversacional.
7. Se comprueban los servicios activos para el tenant y canal.
8. Si existe un caso abierto, se determina si el mensaje lo continúa o inicia un tema nuevo.
9. Si no hay caso abierto, se clasifica la intención.
10. Si la intención es clara y el servicio está activo, se enruta al servicio.
11. Si la intención es ambigua, se solicita aclaración o se muestra menú.
12. El servicio funcional ejecuta su lógica.
13. Si el servicio requiere identidad, se valida contra SmartRoom Core.
14. El servicio devuelve una respuesta canónica.
15. El canal envía la respuesta al usuario.
16. Si procede, se publica un evento resumido y auditable en el activity log del Core.
17. El sistema actualiza sesión, caso, mensajes y trazabilidad interna.

---

## ✅ Casos válidos

- Un inquilino activo envía una incidencia por WhatsApp y el sistema la enruta al servicio de incidencias.
- Un lead externo pregunta por un anuncio y el sistema lo enruta al servicio de anuncios.
- Un usuario no identificado consulta una FAQ pública y el sistema lo enruta al servicio de ayuda.
- Un tenant tiene solo un servicio activo y el mensaje se enruta directamente sin menú.
- Un tenant tiene varios servicios activos y el sistema solicita aclaración cuando la intención es ambigua.
- Un usuario con un caso abierto inicia un nuevo tema y el sistema pide confirmación antes de cambiar de contexto.
- Un canal futuro se integra reutilizando la misma capacidad de routing, sesión e integración de servicios.
- Un nuevo servicio funcional se añade siguiendo el patrón capability → channel → channel integration → service → service × channel integration.

---

## ❌ Casos inválidos

- Un canal llama directamente a SmartRoom Core sin pasar por la capa de integración definida.
- Un servicio funcional recibe mensajes sin validar que está activo para el tenant y canal.
- La IA decide por sí sola si un inquilino está activo.
- n8n accede directamente a la base de datos del Core.
- Un servicio crea incidencias oficiales sin validación de identidad fuerte.
- Un canal publica conversaciones brutas completas en el activity log del Core.
- Un nuevo servicio se integra con WhatsApp de forma ad hoc sin cumplir el estándar de integración del canal.
- El Core depende de detalles internos de Wasender, n8n, IA o del motor conversacional.
- SmartConversations se implementa como una lógica duplicada dentro de cada servicio funcional.
- Un canal implementa reglas específicas de negocio de un servicio sin pasar por el routing común.

---

## 📊 Reglas de negocio

- SmartConversations es una capacidad transversal, no un servicio funcional aislado.
- Los canales son adaptadores de entrada/salida, no servicios de negocio.
- Los servicios funcionales iniciales son `incidents`, `advertisement` y `help`.
- Cada servicio debe declarar expresamente por qué canales se integra.
- Cada canal debe tener un requisito propio.
- Cada canal debe tener un requisito de estándar de integración.
- Cada servicio debe tener un requisito propio independiente del canal.
- Cada combinación servicio × canal debe tener un requisito específico de integración.
- La activación se evalúa por tenant × servicio × canal.
- SmartRoom Core es la fuente de verdad de datos de negocio.
- La IA puede asistir, pero no tomar decisiones de negocio ni validar identidad.
- La validación de identidad debe realizarse contra SmartRoom Core.
- El activity log del Core debe recibir solo eventos funcionales resumidos y auditables.
- El detalle técnico de mensajes y conversaciones pertenece a SmartConversations, no al Core.
- La incorporación de canales futuros no debe obligar a modificar la lógica interna de los servicios existentes salvo en sus requisitos específicos de integración.
- La incorporación de servicios futuros no debe obligar a modificar la lógica interna de los canales existentes salvo en el estándar de integración aplicable.

---

## 🔐 Seguridad y permisos

- Los datos personales no deben propagarse a n8n salvo que exista una justificación documentada y permitida.
- La IA no debe recibir PII salvo casos expresamente autorizados por las reglas de privacidad.
- La validación de inquilino activo debe realizarse mediante SmartRoom Core.
- Cada tenant solo puede operar sobre sus propios servicios, canales y sesiones.
- Un servicio no contratado o no activo no debe procesar mensajes.
- Un canal desactivado no debe aceptar ni procesar nuevas conversaciones funcionales.
- El activity log no debe contener conversaciones brutas ni datos sensibles innecesarios.
- Las operaciones sensibles deben requerir identidad suficiente.
- Los componentes externos no deben recibir datos internos del Core que no sean necesarios para su función.
- El acceso a datos conversacionales debe respetar aislamiento por tenant y roles administrativos.

---

## 🔌 Impacto en backend / APIs / Edge Functions / n8n

SmartConversations requiere una capa backend o Edge Functions que actúe como frontera entre canales, n8n y SmartRoom Core.

### APIs / Edge Functions esperadas

- Edge Functions de recepción por canal.
- Edge Functions de envío por canal.
- Edge Functions de integración con SmartRoom Core.
- Edge Functions de validación de identidad.
- Edge Functions de publicación de Activity Log.
- Edge Functions de gestión de sesión y trazabilidad cuando aplique.

### Workflows n8n esperados

- Workflow de motor conversacional común.
- Workflows específicos por servicio funcional.
- Workflows auxiliares de clasificación, extracción o redacción.
- Workflows de escalado o fallback cuando aplique.

### Reglas de integración

- El canal entrega mensajes normalizados.
- El servicio devuelve una respuesta canónica.
- Las operaciones críticas se ejecutan en backend o Edge Functions.
- n8n puede orquestar, pero no debe ser fuente de verdad.
- Las llamadas al Core se hacen mediante Integration API.
- Los servicios no deben recibir payloads brutos de proveedores externos.
- Los canales no deben conocer detalles internos de cada servicio funcional.

---

## 🗄️ Impacto en base de datos

### Tablas afectadas

Tablas esperadas o equivalentes:

- tablas de sesiones conversacionales;
- tablas de casos conversacionales;
- tablas de mensajes;
- tablas de activación tenant × servicio × canal;
- tablas de configuración de canal;
- tablas de reintentos de envío;
- tablas de base de conocimiento, si aplica;
- tablas de trazabilidad técnica y observabilidad, si aplica.

### Campos relevantes

- `client_account_id`
- `channel`
- `service_code`
- `session_id`
- `case_id`
- `identity_level`
- `active_service_code`
- `active_case_id`
- `open_case_ids`
- `status`
- `created_at`
- `updated_at`

### Constraints

- aislamiento por tenant;
- unicidad de sesiones por tenant, canal y usuario cuando aplique;
- idempotencia en mensajes de canal si aplica;
- estados válidos de sesión y caso;
- integridad referencial entre sesión, caso y mensaje;
- consistencia entre servicios activos y canales activos.

### RLS

- Las tablas de SmartConversations deben respetar aislamiento por tenant.
- Los usuarios solo deben acceder a datos de su tenant salvo rol superadmin o servicio interno autorizado.
- Las operaciones técnicas críticas deben ejecutarse con rol de servicio controlado cuando sea necesario.
- No debe concederse acceso directo desde n8n a tablas críticas del Core.

---

## 🧱 Impacto en frontend

El frontend debe permitir, cuando aplique:

- configurar canales conversacionales;
- activar servicios por canal;
- visualizar conversaciones;
- visualizar casos;
- responder manualmente desde panel admin;
- gestionar configuración de servicios conversacionales;
- mostrar el estado de integración del canal;
- mostrar errores operativos relevantes;
- consultar actividad funcional resumida;
- revisar escalados pendientes.

### Componentes afectados

- Pantallas de configuración de SmartConversations.
- Pantallas de activación de canales.
- Pantallas de activación de servicios por canal.
- Pantallas de conversaciones.
- Pantallas de casos o bandeja de atención.
- Pantallas de trazabilidad y errores.

### Validaciones UI

- No permitir activar un servicio en un canal no configurado.
- No permitir operar servicios no contratados.
- Mostrar estados de canal de forma explícita.
- Mostrar errores de configuración sin exponer secretos ni datos sensibles.
- Diferenciar canal activo, servicio activo y suscripción activa.

### Estados posibles

- `active`
- `inactive`
- `paused`
- `pending_configuration`
- `error`
- `offboarded`

---

## 🤖 Impacto en IA

### IA utilizada

- [x] Sí
- [ ] No
- [x] Opcional según plan/configuración

### Uso permitido de IA

- clasificación de intención;
- extracción de entidades;
- resumen;
- redacción de respuestas;
- sugerencias para operador humano;
- reformulación de mensajes;
- ayuda para detectar ambigüedad o necesidad de escalado.

### Uso prohibido de IA

- validación de identidad;
- autorización de operaciones;
- modificación directa de datos críticos;
- decisión final de negocio;
- acceso a PII innecesaria;
- publicación directa en Core;
- escritura directa en base de datos;
- decisión autónoma de crear recursos oficiales sin validación de negocio.

---

## 📚 Knowledge base / contenido

SmartConversations puede utilizar contenido o knowledge base cuando el servicio funcional lo requiera.

- [ ] No aplica
- [x] FAQ pública
- [x] FAQ privada por tenant
- [x] Base de conocimiento del servicio
- [x] Documentación operativa
- [x] Contenido de anuncios
- [x] Otro

Reglas:

- El contenido debe estar aislado por tenant cuando aplique.
- El contenido público no debe exponer datos privados.
- El contenido usado por IA debe respetar reglas de privacidad.
- El contenido de anuncios debe proceder de fuentes autorizadas del Core o del servicio correspondiente.
- El contenido de ayuda debe poder distinguir entre información pública y privada.
- La knowledge base no sustituye validaciones de negocio del Core.

---

## 🔄 Estándar de integración aplicable

No aplica como obligación directa porque este requisito es de tipo `capability`.

Este requisito define la raíz funcional de la que derivan los estándares de integración de canal.

Los estándares concretos se definen en documentos como:

| Canal | Requirement de canal | Requirement estándar de integración |
|---|---|---|
| WhatsApp | `REQ-SC-010-whatsapp-channel.md` | `REQ-SC-020-whatsapp-channel-integration.md` |
| Chatbot | `REQ-SC-300-chatbot-channel.md` | `REQ-SC-320-chatbot-channel-integration.md` |
| Voz IP | Pendiente | Pendiente |

---

## ✅ Declaración de cumplimiento del estándar de canal

No aplica directamente porque este requisito no es una integración `service-channel-integration`.

La obligación general definida por esta capability es que cualquier servicio que se integre con un canal debe tener un requisito específico donde declare cómo cumple el estándar de integración de ese canal.

Ejemplos esperados:

| Servicio | Canal | Requirement esperado |
|---|---|---|
| incidents | WhatsApp | `REQ-SC-110-incidents-whatsapp-channel-integration.md` |
| incidents | Chatbot | `REQ-SC-120-incidents-chatbot-channel-integration.md` |
| advertisement | WhatsApp | `REQ-SC-160-advertisement-whatsapp-channel-integration.md` |
| advertisement | Chatbot | `REQ-SC-170-advertisement-chatbot-channel-integration.md` |
| help | WhatsApp | `REQ-SC-210-help-whatsapp-channel-integration.md` |
| help | Chatbot | `REQ-SC-220-help-chatbot-channel-integration.md` |

---

## 🧾 Contratos involucrados

Contratos esperados o relacionados:

| Contrato | Uso |
|---|---|
| `contract-normalized-message.md` | Define la estructura común de mensaje tras recibirlo desde un canal. |
| `contract-canonical-response.md` | Define la respuesta común que los servicios devuelven al canal. |
| `contract-tenant-features-response.md` | Define qué servicios y canales están activos para un tenant. |
| `contract-identity-validation-result.md` | Define el resultado de validación de identidad contra SmartRoom Core. |
| `contract-case-state-machine.md` | Define estados comunes de sesión, caso o flujo conversacional cuando aplique. |

Los contratos concretos pueden ampliarse o ajustarse en los documentos técnicos correspondientes, siempre que no contradigan este requisito.

---

## 📈 Activity Log

### Publica Activity Log

- [x] Sí
- [ ] No
- [x] Solo en determinados casos

SmartConversations debe permitir publicar eventos funcionales resumidos en el Activity Log de SmartRoom Core cuando se produzcan hitos relevantes.

### Eventos esperados

| Evento | Cuándo se publica | Payload resumido |
|---|---|---|
| `conversation_started` | Cuando comienza una conversación funcional relevante | Canal, servicio si se conoce, tenant, resumen mínimo |
| `identity_validated` | Cuando se valida identidad de usuario | Nivel de identidad, servicio, canal, sin PII innecesaria |
| `case_created` | Cuando se crea un caso conversacional | Tipo de caso, servicio, canal, estado inicial |
| `incident_created` | Cuando se crea una incidencia oficial | Referencia de incidencia, servicio, canal |
| `lead_created` | Cuando se crea un lead desde conversación | Referencia del lead, canal, servicio |
| `conversation_escalated` | Cuando se escala a humano/admin | Motivo de escalado, servicio, canal |
| `conversation_closed` | Cuando se cierra una conversación o caso | Motivo de cierre, servicio, canal |

Reglas:

- No publicar conversaciones completas.
- No publicar mensajes brutos.
- No publicar PII innecesaria.
- Publicar solo hitos funcionales relevantes.
- El fallo de publicación del Activity Log no debe romper la operación principal salvo regla expresa.
- La trazabilidad técnica detallada pertenece a SmartConversations, no al Core.

---

## 🚨 Errores, fallback y escalado

### Errores esperados

| Error | Comportamiento esperado |
|---|---|
| Canal no disponible | Registrar error, reintentar si aplica y evitar bloqueo del Core. |
| Servicio inactivo | No procesar la operación funcional y responder/ignorar según reglas del canal. |
| Identidad no validada | Solicitar datos, limitar operación o escalar según el servicio. |
| Core no disponible | Aplicar backoff, fallback o escalado según criticidad. |
| IA no disponible | Usar formulario guiado, reglas deterministas o respuesta alternativa. |
| n8n no disponible | Registrar fallo, evitar pérdida de trazabilidad y reconciliar si aplica. |
| Respuesta no canónica | Marcar error de integración y evitar envío inconsistente al usuario. |
| Mensaje duplicado | Descartar o registrar como duplicado sin ejecutar dos veces la operación. |

### Escalado

El sistema debe permitir escalar a humano/admin cuando:

- la identidad no puede resolverse;
- el usuario solicita atención humana;
- hay fallo persistente del canal, IA, n8n o Core;
- el caso es sensible;
- la operación no es automatizable;
- se supera el límite de intentos;
- existe ambigüedad funcional que no puede resolverse automáticamente;
- el servicio funcional lo exige por sus propias reglas.

---

## ⚙️ Requisitos no funcionales

- Idempotencia.
- Trazabilidad.
- Observabilidad.
- Resiliencia ante fallos externos.
- Aislamiento por tenant.
- Minimización de datos.
- Extensibilidad.
- Bajo acoplamiento.
- Compatibilidad con nuevos servicios.
- Compatibilidad con nuevos canales.
- No bloqueo del Core ante fallo del canal.
- Reintentos controlados cuando aplique.
- Evolución contractual controlada.
- Facilidad de auditoría funcional.
- Separación clara entre canal, servicio y Core.

---

## 🧪 Validación (QA)

Tests asociados:

### unit

- Validación de estados de sesión.
- Validación de activación tenant × servicio × canal.
- Validación de respuesta canónica.
- Validación de reglas de identidad mínima.
- Validación de eventos de Activity Log permitidos.

### services

- Routing entre canales y servicios.
- Validación de identidad contra Core.
- Integración con Core mediante Integration API.
- Publicación de activity log.
- Gestión de servicio inactivo.
- Gestión de canal inactivo.
- Gestión de intención ambigua.

### integration

- Canal → mensaje normalizado.
- Mensaje normalizado → motor conversacional.
- Motor conversacional → servicio.
- Servicio → respuesta canónica.
- Servicio → Integration API.
- Servicio → Activity Log.

### e2e

- Conversación WhatsApp → servicio → respuesta.
- Conversación Chatbot → servicio → respuesta.
- Incidencia creada desde canal conversacional.
- Lead creado desde canal conversacional.
- Consulta de ayuda pública.
- Escalado a humano.
- Canal desactivado.
- Servicio no activo.
- Usuario no identificado.
- Usuario con identidad fuerte.

---

## ✅ Criterios de aceptación

Este requisito se considera cumplido cuando:

- SmartConversations está definida como capacidad transversal.
- Los canales están separados de los servicios funcionales.
- Los servicios funcionales pueden integrarse mediante requisitos específicos servicio × canal.
- Existe un modelo claro capability → channel → channel integration → service → service × channel integration.
- La validación de identidad se delega en SmartRoom Core.
- La IA no toma decisiones de negocio.
- n8n no actúa como fuente de verdad.
- El activity log recibe solo eventos funcionales resumidos.
- El sistema puede incorporar nuevos canales sin reescribir los servicios.
- El sistema puede incorporar nuevos servicios sin reescribir los canales.
- La activación se puede evaluar por tenant × servicio × canal.
- La documentación posterior de rules, contracts, skills y tests puede trazarse a este requisito.
- Los canales no reciben lógica interna de negocio que pertenezca a servicios.
- Los servicios no reciben payloads brutos de proveedores de canal.

---

## 🔗 Trazabilidad

### Parent requirement

- No aplica. Este requirement es la raíz funcional de SmartConversations.

### Requirements relacionados

- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`
- `REQ-SC-100-incidents-service.md`
- `REQ-SC-110-incidents-whatsapp-channel-integration.md`
- `REQ-SC-120-incidents-chatbot-channel-integration.md`
- `REQ-SC-150-advertisement-service.md`
- `REQ-SC-160-advertisement-whatsapp-channel-integration.md`
- `REQ-SC-170-advertisement-chatbot-channel-integration.md`
- `REQ-SC-200-help-service.md`
- `REQ-SC-300-chatbot-channel.md`
- `REQ-SC-320-chatbot-channel-integration.md`

### Rules relacionadas

- `rules-00-scope-and-principles.md`
- `rules-10-service-catalog.md`
- `rules-20-tenant-activation-and-lifecycle.md`
- `rules-30-whatsapp-channel.md`
- `rules-31-webchat-channel.md`
- `rules-40-identity-validation.md`
- `rules-50-conversation-routing.md`
- `rules-70-integration-api.md`
- `rules-75-activity-log.md`
- `rules-80-data-and-privacy.md`
- `rules-90-observability-and-failure-handling.md`

### Contracts relacionados

- `contract-normalized-message.md`
- `contract-canonical-response.md`
- `contract-tenant-features-response.md`
- `contract-identity-validation-result.md`
- `contract-case-state-machine.md`

### Skills relacionados

- `skill-ai-usage-boundaries.md`
- `skill-data-model-and-state.md`
- `skill-identity-validation.md`
- `skill-integration-api-implementation.md`
- `skill-n8n-conversation-engine.md`
- `skill-n8n-incidents-workflow.md`
- `skill-testing-scenarios.md`
- `skill-webchat-gateway.md`
- `skill-whatsapp-wasender-integration.md`

### Tests relacionados

- `test-conversation-routing-spec.md`
- `test-identity-validation-spec.md`
- `test-activity-log-spec.md`
- `test-failure-recovery-spec.md`
- `test-permissions-and-privacy-spec.md`

Los specs `test-incidents-flow-spec.md`, `test-listings-flow-spec.md` y `test-help-flow-spec.md` existen en `docs/smart-conversations/tests/` pero se trazan a los requirements de servicio (`REQ-SC-100`, `REQ-SC-150`, `REQ-SC-200` y sus integraciones de canal), no a esta capability.

### Diagrams relacionados

- `diagram-system-context.md`
- `diagram-data-model-overview.md`
- `diagram-conversation-routing-flow.md`
- `diagram-identity-validation-flow.md`
- `diagram-integration-api-boundary.md`
- `diagram-whatsapp-sequence.md`
- `diagram-webchat-sequence.md`

`diagram-incidents-service-flow.md` existe pero se traza al requirement del servicio `incidents` (`REQ-SC-100`/`REQ-SC-110`), no a esta capability.

### Cambios relacionados (CHG)

- Pendiente

### Migraciones SQL

- Pendiente

### Issues

- Pendiente

---

## ⚠️ Consideraciones

- La capacidad debe diseñarse pensando en servicios futuros.
- La separación entre canal y servicio es crítica para evitar duplicidades.
- La integración con IA debe estar limitada por reglas de privacidad y seguridad.
- La trazabilidad no debe confundirse con almacenamiento completo de conversaciones en el Core.
- La evolución hacia nuevos canales no debe romper integraciones existentes.
- La capacidad debe soportar canales síncronos y asíncronos con adaptaciones específicas por canal.
- Los servicios pueden tener reglas de identidad distintas según operación y canal.
- La incorporación de voz IP requerirá requisitos propios de canal e integración, pero debe reutilizar el mismo modelo conceptual.

---

## 📝 Observaciones

Este requisito actúa como raíz funcional de SmartConversations. Los requisitos de canal, estándar de integración y servicio deben derivar de esta capability y no contradecirla.

Cualquier cambio en este requirement puede afectar a todos los requisitos específicos de canal, integración y servicio.
