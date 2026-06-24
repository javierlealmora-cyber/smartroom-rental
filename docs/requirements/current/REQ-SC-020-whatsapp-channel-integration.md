# REQ-SC-020 - WhatsApp Channel Integration

## Status
ACTIVE

## Owner
@responsable

## Last updated
2026-06-10

## Requirement type
`channel-integration-standard`

## Priority
`MUST`

## Scope level
`service-channel`

---

## 🎯 Objetivo

Definir el estándar común que cualquier servicio funcional debe cumplir para integrarse con el canal **WhatsApp** de SmartConversations.

Este requisito no define la lógica interna de cada servicio. Define la forma estándar de conexión entre el canal WhatsApp, el motor conversacional común y los servicios funcionales que quieren operar a través de WhatsApp.

Los servicios iniciales que deberán cumplir este estándar son:

- `incidents`
- `advertisement`
- `help`

En el futuro, cualquier nuevo servicio que quiera operar por WhatsApp deberá disponer de un requisito específico `service × whatsapp-channel-integration` donde declare cómo cumple este estándar.

---

## 📌 Alcance

Este requisito cubre:

- La forma estándar en que un servicio funcional se expone por WhatsApp.
- La relación entre canal, motor conversacional, routing y servicio.
- La validación de activación tenant × servicio × canal.
- El formato funcional esperado de entrada hacia los servicios.
- La obligación de recibir mensajes normalizados y no payloads brutos de Wasender.
- La gestión de intención y contexto.
- La gestión de identidad cuando el servicio lo requiera.
- La obligación de utilizar SmartRoom Core como fuente de verdad.
- La generación de respuesta canónica.
- La publicación de eventos funcionales resumidos en Activity Log cuando proceda.
- La trazabilidad mínima que debe existir en cualquier integración servicio × WhatsApp.
- La forma en que nuevos servicios deberán integrarse con WhatsApp en el futuro.

Este requisito NO cubre en detalle:

- La implementación técnica interna de Wasender.
- La configuración concreta del webhook WhatsApp.
- La lógica interna de `incidents`.
- La lógica interna de `advertisement`.
- La lógica interna de `help`.
- La integración con canales distintos a WhatsApp.
- La definición final de todos los contratos JSON.
- La implementación completa de workflows específicos de n8n.
- La UI final de cada servicio.

---

## 🚫 Fuera de alcance

Queda fuera de este requisito:

- Definir el flujo completo de incidencias.
- Definir el flujo completo de anuncios.
- Definir el flujo completo de ayuda.
- Definir Chatbot, WebChat o voz IP.
- Definir UI administrativa específica de cada servicio.
- Definir grupos de WhatsApp como mecanismo estándar de atención.
- Permitir integraciones ad hoc por servicio fuera del estándar común.
- Permitir que un servicio reciba directamente webhooks de Wasender.
- Permitir que un servicio implemente su propio canal WhatsApp paralelo.
- Definir la política comercial de contratación de cada servicio.
- Sustituir los requirements específicos de servicio.
- Sustituir los requirements específicos `service × whatsapp-channel-integration`.

---

## 👥 Actores

| Actor | Descripción | Responsabilidad |
|---|---|---|
| Usuario final | Persona que inicia o continúa una conversación por WhatsApp. | Envía mensajes, aporta información y recibe respuestas. |
| Canal WhatsApp | Adaptador que recibe y envía mensajes mediante Wasender. | Valida canal, normaliza entrada y entrega respuestas. |
| Motor conversacional | Capa común de SmartConversations para contexto, intención y routing. | Decide qué servicio debe atender la conversación. |
| Servicio funcional | Servicio que atiende una intención concreta, como incidencias, anuncios o ayuda. | Ejecuta lógica funcional y devuelve respuesta canónica. |
| SmartRoom Core | Sistema de verdad de tenants, usuarios, habitaciones, anuncios, asignaciones e incidencias oficiales. | Valida identidad y ejecuta operaciones críticas de negocio. |
| Admin del tenant | Usuario gestor del tenant. | Revisa conversaciones, casos, errores y escalados. |
| n8n | Motor de orquestación de workflows. | Coordina flujos, sin acceder directamente al Core ni ser fuente de verdad. |
| IA | Componente auxiliar. | Clasifica intención, extrae entidades o redacta respuestas, sin validar identidad ni autorizar negocio. |

---

## 🧩 Descripción funcional

Cualquier servicio que quiera integrarse con WhatsApp debe hacerlo mediante el motor común de SmartConversations.

El servicio no debe recibir directamente webhooks de Wasender, no debe implementar un canal WhatsApp propio y no debe saltarse las validaciones comunes de activación, identidad, trazabilidad o seguridad.

El estándar de integración debe garantizar que:

1. El canal WhatsApp recibe el mensaje desde Wasender.
2. El canal valida sesión, tenant, activación e idempotencia.
3. El canal normaliza el mensaje.
4. El motor conversacional recupera sesión, contexto y posibles casos abiertos.
5. El motor consulta los servicios activos para el tenant y canal WhatsApp.
6. El motor clasifica o confirma la intención del usuario.
7. El motor enruta el mensaje al servicio funcional correspondiente.
8. El servicio recibe una entrada normalizada, no el payload bruto de Wasender.
9. El servicio declara y aplica el nivel mínimo de identidad requerido.
10. Si el servicio necesita validar datos de negocio, debe usar SmartRoom Core mediante Integration API o Edge Functions autorizadas.
11. El servicio devuelve una respuesta canónica.
12. El canal WhatsApp envía la respuesta al usuario.
13. El servicio publica, si procede, eventos funcionales resumidos en Activity Log.
14. El detalle técnico de la conversación queda en SmartConversations, no en SmartRoom Core.

Cada servicio funcional debe tener su propio requisito de integración con WhatsApp explicando cómo cumple este estándar.

---

## 🧭 Posición dentro del modelo SmartConversations

Este requisito representa el estándar de integración del canal WhatsApp.

- [ ] Capability transversal
- [ ] Canal conversacional
- [x] Estándar de integración de canal
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
| Servicio advertisement | `REQ-SC-150-advertisement-service.md` |
| Integración advertisement × WhatsApp | `REQ-SC-160-advertisement-whatsapp-channel-integration.md` |
| Servicio help | `REQ-SC-200-help-service.md` |
| Integración help × WhatsApp | `REQ-SC-210-help-whatsapp-channel-integration.md` |

---

## 🔁 Flujo funcional

1. El usuario envía un mensaje por WhatsApp.
2. Wasender entrega el evento al webhook del canal WhatsApp.
3. El canal valida que la sesión Wasender está asociada a un tenant conocido.
4. El canal comprueba suscripción, activación del canal e idempotencia.
5. El canal normaliza el mensaje en el contrato común.
6. El motor conversacional crea o recupera la sesión.
7. El motor recupera contexto, caso activo y servicios activos para WhatsApp.
8. El motor clasifica intención o solicita aclaración si la intención es ambigua.
9. Si la intención corresponde a un servicio activo, se invoca el workflow o handler del servicio.
10. El servicio recibe entrada normalizada con datos mínimos necesarios.
11. El servicio comprueba el nivel de identidad disponible.
12. Si el servicio requiere más identidad, solicita datos adicionales, limita operación o escala según sus reglas.
13. Si el servicio requiere operaciones sobre datos del Core, invoca Integration API o Edge Functions autorizadas.
14. El servicio ejecuta su lógica funcional.
15. El servicio devuelve una respuesta canónica.
16. El canal WhatsApp transforma la respuesta canónica en envío por Wasender.
17. El estado del envío se registra.
18. Si procede, el servicio o la capa de integración publica un evento funcional resumido en Activity Log.
19. La sesión, el caso y los mensajes quedan actualizados en SmartConversations.
20. Si hay error recuperable, se aplica fallback, reintento o escalado según la política definida.

---

## ✅ Casos válidos

- Servicio `incidents` recibe un mensaje WhatsApp normalizado y crea una pre-incidencia o incidencia según identidad.
- Servicio `advertisement` recibe una consulta de anuncio por WhatsApp y crea un lead si procede.
- Servicio `help` recibe una consulta pública por WhatsApp y responde desde una base de conocimiento permitida.
- Un servicio no recibe mensajes si no está activo para WhatsApp.
- Un servicio requiere identidad fuerte y el sistema la valida antes de ejecutar operaciones sensibles.
- Un servicio devuelve una respuesta canónica que WhatsApp puede enviar sin conocer detalles internos del servicio.
- Un nuevo servicio futuro se integra creando su requisito específico `service × whatsapp-channel-integration` y cumpliendo este estándar.
- Un mensaje con intención ambigua no se entrega directamente a un servicio hasta que se resuelva o se solicite aclaración.
- Un servicio puede escalar a humano si no puede completar la operación automáticamente.
- Un fallo de Activity Log no rompe la operación principal si esta ya se completó correctamente.

---

## ❌ Casos inválidos

- Un servicio recibe directamente webhooks brutos de Wasender.
- Un servicio ignora la activación tenant × servicio × canal.
- Un servicio implementa su propio mecanismo paralelo de routing WhatsApp.
- Un servicio devuelve una respuesta no compatible con el contrato canónico.
- Un servicio usa IA para validar identidad.
- Un servicio accede directamente a tablas del Core.
- Un servicio publica mensajes brutos completos en Activity Log.
- Un nuevo servicio se integra por WhatsApp sin requisito específico de integración.
- Un servicio procesa mensajes de un tenant que no tiene el servicio activo.
- Un servicio procesa mensajes de un canal para el que no está habilitado.
- Un servicio envía respuestas por Wasender directamente sin pasar por el adaptador común.
- Un servicio recibe teléfono, nombre, habitación u otros datos sensibles sin necesidad documentada.
- n8n decide por sí solo crear recursos oficiales sin invocar las EFs o APIs autorizadas.

---

## 📊 Reglas de negocio

- Todo servicio integrado con WhatsApp debe cumplir este requisito.
- La activación debe evaluarse por tenant × servicio × canal.
- WhatsApp no decide el servicio final; el routing lo decide SmartConversations.
- Los servicios no procesan mensajes de canales para los que no estén activos.
- Los servicios deben declarar el nivel mínimo de identidad requerido para cada operación sensible.
- Las operaciones de negocio deben validarse contra SmartRoom Core.
- La IA no puede tomar decisiones de autorización, identidad o negocio.
- Las respuestas deben generarse en formato canónico.
- Los eventos funcionales relevantes deben publicarse como resumen auditable, no como chat bruto.
- Cada servicio integrado con WhatsApp debe tener un requirement propio de integración.
- El servicio no debe conocer detalles técnicos internos de Wasender.
- El canal no debe conocer reglas internas del servicio más allá del resultado canónico.
- La integración debe poder evolucionar sin duplicar lógica de canal dentro de cada servicio.
- Si un servicio no puede cumplir este estándar, no debe exponerse por WhatsApp.

---

## 🔐 Seguridad y permisos

- El servicio solo debe recibir datos mínimos necesarios para ejecutar su lógica.
- El servicio no debe recibir el payload bruto de Wasender.
- El servicio no debe recibir PII innecesaria.
- El servicio no debe ejecutar operaciones sensibles sin identidad suficiente.
- El servicio debe respetar aislamiento por tenant.
- El servicio no debe saltarse la Integration API para acceder al Core.
- El servicio no debe publicar contenido sensible en Activity Log.
- Si el usuario no tiene identidad suficiente, el servicio debe pedir datos, limitar respuesta o escalar.
- La IA no debe recibir `profile_id`, teléfono, habitación, datos contractuales o datos sensibles del Core salvo autorización expresa en reglas de privacidad.
- n8n no debe recibir secretos de Wasender ni credenciales internas.
- Las credenciales de servicio deben permanecer en backend, Edge Functions o configuración segura.
- Los logs no deben contener payloads completos con PII o secretos.

---

## 🔌 Impacto en backend / APIs / Edge Functions / n8n

Cada integración servicio × WhatsApp debe definir los componentes que necesita, pero todos deben cumplir el patrón común descrito por este requisito.

### APIs / Edge Functions esperadas

- Edge Function o backend de recepción y normalización del canal WhatsApp.
- Edge Function o backend de envío WhatsApp.
- Edge Function o backend de consulta de activación tenant × servicio × canal.
- Edge Function o backend de validación de identidad contra SmartRoom Core.
- Edge Function o backend de operaciones de negocio contra SmartRoom Core.
- Edge Function o backend de publicación resumida en Activity Log.
- Handler o endpoint de entrada específico del servicio si aplica.

### Workflows n8n esperados

- Workflow común de motor conversacional.
- Workflow o subworkflow específico del servicio.
- Workflow auxiliar de clasificación de intención si aplica.
- Workflow auxiliar de extracción de entidades si aplica.
- Workflow de escalado o fallback si aplica.

### Reglas de integración

- El canal entrega mensajes normalizados.
- El servicio recibe solo la entrada normalizada y contexto permitido.
- El servicio devuelve una respuesta canónica.
- Las operaciones críticas se ejecutan en backend o Edge Functions.
- n8n puede orquestar, pero no debe ser fuente de verdad.
- Las llamadas al Core se hacen mediante Integration API.
- Los servicios no envían directamente por Wasender.
- Los servicios no reciben webhooks brutos.
- Los servicios no escriben directamente en tablas críticas del Core.

---

## 🗄️ Impacto en base de datos

La integración servicio × WhatsApp puede afectar a tablas comunes de SmartConversations y a tablas específicas del servicio.

### Tablas afectadas

Tablas comunes esperadas o equivalentes:

- sesiones conversacionales;
- casos conversacionales;
- mensajes conversacionales;
- activaciones tenant × servicio × canal;
- configuración del canal WhatsApp;
- cola de reintentos de envío saliente;
- registros de trazabilidad técnica;
- registros de eventos funcionales pendientes o publicados, si aplica.

Tablas específicas:

- cada servicio debe documentar sus tablas específicas en su requirement propio.

### Campos relevantes

- `client_account_id`
- `channel = whatsapp`
- `service_code`
- `session_id`
- `case_id`
- `message_id`
- `identity_level`
- `status`
- `active_service_code`
- `created_at`
- `updated_at`

### Constraints

- aislamiento por tenant;
- validación de canal permitido;
- validación de servicio activo;
- integridad entre sesión, mensaje y caso;
- idempotencia de mensaje entrante;
- no duplicidad de acciones críticas;
- estados válidos para sesión, caso y envío.

### RLS

- El tenant solo debe acceder a sus propias conversaciones, casos y configuraciones.
- Los usuarios administrativos solo deben ver datos de su tenant.
- Las operaciones internas críticas pueden requerir `service_role`.
- n8n no debe tener acceso directo a tablas críticas del Core.
- El acceso directo a datos de Core debe realizarse mediante APIs o Edge Functions autorizadas.

---

## 🧱 Impacto en frontend

El frontend administrativo debe permitir visualizar o configurar, cuando aplique:

- servicios activos para WhatsApp;
- estado de integración de cada servicio con WhatsApp;
- conversaciones asociadas a un servicio;
- casos creados por servicio;
- escalados pendientes;
- errores de integración;
- actividad funcional relevante;
- configuración específica por servicio y canal.

Cada servicio debe indicar en su requirement específico qué UI necesita para su integración con WhatsApp.

### Componentes afectados

- Pantalla de configuración de canales.
- Pantalla de activación de servicios por canal.
- Pantalla de conversaciones.
- Pantalla de casos.
- Pantalla de escalados.
- Pantalla de errores.
- Pantalla específica de cada servicio si aplica.

### Validaciones UI

- No permitir activar un servicio por WhatsApp si WhatsApp no está activo.
- No permitir activar un servicio no contratado.
- Mostrar claramente si el servicio está activo para WhatsApp.
- Mostrar errores de integración sin exponer PII ni secretos.
- Diferenciar error de canal, error de servicio y error de Core.

### Estados posibles

- `not_configured`
- `active`
- `inactive`
- `paused`
- `error`
- `pending_review`
- `escalated`

---

## 🤖 Impacto en IA

### IA utilizada

- [x] Sí
- [ ] No
- [x] Opcional según plan/configuración

### Uso permitido de IA

- clasificación de intención;
- extracción de entidades desde el mensaje;
- resumen de conversación;
- redacción de respuesta sugerida;
- detección de ambigüedad;
- ayuda para decidir si solicitar aclaración;
- generación de mensajes naturales a partir de respuestas estructuradas del servicio.

### Uso prohibido de IA

- validación de identidad;
- autorización de operaciones;
- modificación directa de datos críticos;
- decisión final de negocio;
- acceso a PII innecesaria;
- publicación directa en Core;
- lectura directa de tablas del Core;
- decisión autónoma de crear incidencias, leads u otros recursos oficiales;
- sustitución de validaciones del servicio o del Core.

---

## 📚 Knowledge base / contenido

Este estándar no define una base de conocimiento concreta.

- [x] No aplica directamente
- [ ] FAQ pública
- [ ] FAQ privada por tenant
- [ ] Base de conocimiento del servicio
- [ ] Documentación operativa
- [ ] Contenido de anuncios
- [ ] Otro

Reglas:

- La knowledge base, si existe, pertenece al servicio funcional correspondiente.
- El servicio debe documentar qué contenido utiliza.
- El contenido debe estar aislado por tenant cuando aplique.
- El contenido público no debe exponer datos privados.
- El contenido usado por IA debe respetar reglas de privacidad.
- El canal WhatsApp no debe seleccionar contenido de negocio por sí mismo.

---

## 🔄 Estándar de integración aplicable

Este requisito es el estándar de integración aplicable a cualquier servicio que quiera operar por WhatsApp.

| Campo | Valor |
|---|---|
| Canal | `whatsapp` |
| Requirement de canal | `REQ-SC-010-whatsapp-channel.md` |
| Requirement estándar de integración | `REQ-SC-020-whatsapp-channel-integration.md` |
| Servicios iniciales | `incidents`, `advertisement`, `help` |
| Servicio integrado | Debe indicarse en cada requirement `service × whatsapp-channel-integration` |
| Requirement del servicio | Debe indicarse en cada requirement específico de servicio |

---

## ✅ Declaración de cumplimiento del estándar de canal

Esta sección define los puntos mínimos que cada requirement `service × whatsapp-channel-integration` debe completar.

| Requisito del estándar | Cómo debe declararlo cada servicio | Evidencia / documento |
|---|---|---|
| Recibe mensaje normalizado | Debe indicar qué campos consume del mensaje normalizado. | Requirement específico del servicio × WhatsApp |
| Valida activación tenant × servicio × canal | Debe indicar cómo comprueba o recibe esta validación. | Requirement específico + tests |
| Declara nivel de identidad requerido | Debe indicar operaciones permitidas por nivel de identidad. | Requirement específico + contract de identidad |
| Usa Integration API para Core | Debe listar qué operaciones realiza contra Core. | Requirement específico + skill de integración |
| Devuelve respuesta canónica | Debe describir los tipos de respuesta que genera. | Requirement específico + contract canónico |
| Publica Activity Log resumido si procede | Debe listar eventos funcionales que publica. | Requirement específico + rule Activity Log |
| No recibe payload bruto del proveedor | Debe declarar que solo recibe entrada normalizada. | Requirement específico + tests |
| No expone PII innecesaria a IA/n8n | Debe declarar datos permitidos y prohibidos. | Requirement específico + rule privacidad |
| Define criterios de escalado | Debe indicar cuándo escala a humano/admin. | Requirement específico |
| Define tests mínimos | Debe listar unit, services, integration y e2e. | Requirement específico + test specs |

---

## 🧾 Contratos involucrados

| Contrato | Uso |
|---|---|
| `contract-normalized-message.md` | Define la entrada común que recibe el motor y los servicios tras el canal WhatsApp. |
| `contract-canonical-response.md` | Define la respuesta común que el servicio devuelve y el canal WhatsApp puede enviar. |
| `contract-tenant-features-response.md` | Define la activación de tenant, canales y servicios. |
| `contract-identity-validation-result.md` | Define niveles y resultado de identidad cuando el servicio lo requiere. |
| `contract-case-state-machine.md` | Define estados de sesión, caso o flujo cuando el servicio mantiene contexto. |

Cada servicio podrá añadir contratos específicos, pero no podrá contradecir estos contratos comunes.

---

## 📈 Activity Log

### Publica Activity Log

- [x] Sí
- [ ] No
- [x] Solo en determinados casos

Este estándar exige que los servicios integrados con WhatsApp publiquen eventos funcionales resumidos cuando se produzcan hitos relevantes.

### Eventos esperados

| Evento | Cuándo se publica | Payload resumido |
|---|---|---|
| `conversation_started` | Cuando una conversación WhatsApp inicia flujo funcional relevante | Canal, servicio, tenant, resumen mínimo |
| `identity_validated` | Cuando se valida identidad para una operación del servicio | Nivel de identidad, canal, servicio, sin PII innecesaria |
| `case_created` | Cuando se crea un caso conversacional | Servicio, canal, estado inicial |
| `incident_created` | Cuando `incidents` crea una incidencia oficial | Referencia de incidencia, canal, servicio |
| `lead_created` | Cuando `advertisement` crea un lead | Referencia de lead, canal, servicio |
| `conversation_escalated` | Cuando el servicio escala a humano/admin | Motivo, canal, servicio |
| `conversation_closed` | Cuando se cierra un caso o conversación funcional | Motivo de cierre, canal, servicio |
| `message_delivery_failed` | Cuando el fallo de envío es relevante operativamente | Canal, servicio si se conoce, motivo técnico resumido |

Reglas:

- No publicar conversaciones completas.
- No publicar mensajes brutos.
- No publicar PII innecesaria.
- No publicar payloads de Wasender.
- Publicar solo hitos funcionales relevantes.
- El fallo de publicación del Activity Log no debe romper la operación principal salvo regla expresa.
- Los eventos específicos de cada servicio deben definirse en su requirement de integración.

---

## 🚨 Errores, fallback y escalado

### Errores esperados

| Error | Comportamiento esperado |
|---|---|
| Servicio no activo para WhatsApp | No procesar y responder/ignorar según reglas de canal. |
| Intención ambigua | Solicitar aclaración o mostrar menú. |
| Identidad insuficiente | Solicitar datos, limitar operación o escalar. |
| Core no disponible | Aplicar backoff, fallback o escalado según criticidad. |
| IA no disponible | Usar reglas deterministas, formulario guiado o fallback. |
| n8n no disponible | Registrar fallo, evitar pérdida de trazabilidad y reconciliar. |
| Servicio devuelve respuesta inválida | No enviar respuesta inconsistente y registrar error de integración. |
| Fallo de envío WhatsApp | Registrar y reintentar si aplica. |
| Mensaje duplicado | No ejecutar dos veces la operación. |
| Servicio lanza error funcional | Informar al usuario o escalar según reglas del servicio. |

### Escalado

Cada servicio debe definir cuándo escala a humano/admin.

Como mínimo, debe considerar escalado cuando:

- identidad no resuelta;
- usuario solicita humano;
- fallo persistente;
- caso sensible;
- operación no automatizable;
- límite de intentos superado;
- conflicto entre intención y contexto;
- error repetido de integración;
- el servicio no puede garantizar respuesta segura o correcta.

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
- No duplicar lógica de canal dentro de servicios.
- No bloqueo del Core ante fallo del canal.
- Reintentos controlados cuando aplique.
- Compatibilidad con evolución de contratos.
- Auditoría funcional mediante eventos resumidos.
- Separación clara entre canal, routing y servicio.
- Capacidad de desactivar un servicio para WhatsApp sin desactivar el canal completo.

---

## 🧪 Validación (QA)

Tests asociados:

### unit

- Validación de activación tenant × servicio × canal.
- Validación de respuesta canónica.
- Validación de nivel de identidad requerido.
- Validación de campos mínimos de mensaje normalizado.
- Validación de eventos permitidos para Activity Log.
- Validación de rechazo de payload bruto.

### services

- Routing WhatsApp → servicio.
- Servicio inactivo → no procesamiento.
- Servicio activo → procesamiento correcto.
- Identidad insuficiente → fallback, petición de datos o escalado.
- Publicación de eventos funcionales.
- Respuesta canónica → envío por canal.

### integration

- Webhook WhatsApp → mensaje normalizado → motor conversacional.
- Motor conversacional → servicio.
- Servicio → Integration API.
- Servicio → respuesta canónica.
- Servicio → Activity Log.
- Fallo de Core → fallback o escalado.
- Fallo de IA → fallback determinista.

### e2e

- WhatsApp → `incidents`.
- WhatsApp → `advertisement`.
- WhatsApp → `help`.
- WhatsApp con intención ambigua.
- WhatsApp con cambio de servicio.
- WhatsApp con identidad fuerte.
- WhatsApp con identidad parcial.
- WhatsApp con usuario no identificado.
- Servicio no activo para WhatsApp.
- Canal activo pero servicio inactivo.
- Fallo de envío saliente.

---

## ✅ Criterios de aceptación

Este requisito se considera cumplido cuando:

- Existe un estándar claro para integrar servicios con WhatsApp.
- Ningún servicio recibe webhooks brutos de Wasender.
- Todo servicio integrado recibe mensajes normalizados.
- Todo servicio integrado valida o recibe validada la activación tenant × servicio × canal.
- Todo servicio integrado declara su nivel de identidad requerido.
- Todo servicio integrado usa Integration API o Edge Functions autorizadas para operaciones de Core.
- Todo servicio integrado devuelve respuesta canónica.
- Todo servicio integrado publica Activity Log cuando procede.
- Todo servicio integrado tiene un requirement específico servicio × WhatsApp.
- Un nuevo servicio futuro puede integrarse siguiendo este mismo estándar.
- El canal WhatsApp no contiene lógica interna de negocio propia de servicios.
- Los servicios no conocen detalles técnicos internos de Wasender.
- Existen tests mínimos para validar cumplimiento del estándar.
- La documentación de rules, contracts, skills y tests puede trazarse a este requisito.

---

## 🔗 Trazabilidad

### Parent requirement

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`

### Requirements relacionados

- `REQ-SC-100-incidents-service.md`
- `REQ-SC-110-incidents-whatsapp-channel-integration.md`
- `REQ-SC-150-advertisement-service.md`
- `REQ-SC-160-advertisement-whatsapp-channel-integration.md`
- `REQ-SC-200-help-service.md`
- `REQ-SC-210-help-whatsapp-channel-integration.md`
- `REQ-SC-300-chatbot-channel.md`
- `REQ-SC-320-chatbot-channel-integration.md`

### Rules relacionadas

- `rules-00-scope-and-principles.md`
- `rules-10-service-catalog.md`
- `rules-20-tenant-activation-and-lifecycle.md`
- `rules-30-whatsapp-channel.md`
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

- `skill-whatsapp-wasender-integration.md`
- `skill-identity-validation.md`
- `skill-integration-api-implementation.md`
- `skill-ai-usage-boundaries.md`
- `skill-data-model-and-state.md`
- `skill-n8n-conversation-engine.md`
- `skill-testing-scenarios.md`

### Tests relacionados

- `test-conversation-routing-spec.md`
- `test-identity-validation-spec.md`
- `test-activity-log-spec.md`
- `test-failure-recovery-spec.md`
- `test-permissions-and-privacy-spec.md`

### Diagrams relacionados

- `diagram-system-context.md`
- `diagram-data-model-overview.md`
- `diagram-conversation-routing-flow.md`
- `diagram-identity-validation-flow.md`
- `diagram-integration-api-boundary.md`
- `diagram-whatsapp-sequence.md`

### Cambios relacionados (CHG)

- Pendiente

### Migraciones SQL

- Pendiente

### Issues

- Pendiente

---

## ⚠️ Consideraciones

- Este requisito debe actuar como estándar común de integración.
- No debe contener lógica interna detallada de cada servicio.
- Los requirements de servicio × WhatsApp deben declarar expresamente cómo cumplen este estándar.
- Si este estándar cambia, deben revisarse todas las integraciones servicio × WhatsApp.
- La integración debe evitar duplicar lógica de canal dentro de cada servicio.
- La integración debe permitir futuros servicios como encuestas, notificaciones o atención comercial.
- La integración debe permitir que WhatsApp evolucione sin romper servicios existentes.
- La integración debe mantener separada la responsabilidad del canal, del motor conversacional y del servicio.
- La integración debe respetar siempre privacidad, minimización de datos y aislamiento por tenant.

---

## 📝 Observaciones

Este requisito permite que WhatsApp sea un canal reutilizable y no una integración específica de cada servicio.

Su finalidad es evitar duplicidad, acoplamiento y divergencia entre servicios. Cualquier servicio futuro que quiera operar por WhatsApp deberá crear su propio requirement `REQ-SC-XXX-<service>-whatsapp-channel-integration.md` y declarar cómo cumple este estándar.
