# REQ-SC-010 - WhatsApp Channel

## Status
ACTIVE

## Owner
@responsable

## Last updated
2026-06-10

## Requirement type
`channel`

## Priority
`MUST`

## Scope level
`channel`

---

## 🎯 Objetivo

Definir el canal **WhatsApp** como canal conversacional de entrada y salida para SmartConversations.

Este requisito describe qué debe cumplir WhatsApp como adaptador técnico y funcional dentro de SmartConversations, independientemente del servicio concreto que atienda la conversación.

El canal WhatsApp permitirá que usuarios finales contacten con SmartRoom Rental para interactuar con servicios como:

- `incidents`
- `advertisement`
- `help`

siempre que dichos servicios estén contratados, configurados y activos para el tenant y para este canal.

WhatsApp no debe entenderse como un servicio de negocio. Es un canal común reutilizable por múltiples servicios funcionales.

---

## 📌 Alcance

Este requisito cubre:

- La recepción de mensajes WhatsApp.
- El envío de respuestas por WhatsApp.
- La asociación entre un tenant y su número o sesión de WhatsApp.
- La integración técnica con Wasender.
- La validación de activación del canal.
- La validación de que existen servicios activos para WhatsApp.
- La normalización inicial del mensaje entrante.
- La deduplicación e idempotencia de mensajes entrantes.
- La entrega del mensaje normalizado al motor conversacional común.
- El tratamiento básico de texto, audio y otros tipos de mensaje.
- El comportamiento cuando el canal está desactivado.
- La gestión de errores y reintentos de envío saliente.
- El offboarding lógico y físico del canal WhatsApp.
- La trazabilidad técnica mínima del canal.

Este requisito NO define en detalle:

- Cómo cada servicio funcional procesa el mensaje.
- Cómo `incidents` crea una incidencia oficial.
- Cómo `advertisement` crea un lead.
- Cómo `help` consulta la base de conocimiento.
- La lógica interna completa del routing común.
- La integración específica de cada servicio con WhatsApp.
- Los contratos técnicos finales de Wasender.
- Los workflows internos completos de n8n.

---

## 🚫 Fuera de alcance

Queda fuera de este requisito:

- Definir el estándar completo de integración de servicios con WhatsApp.
- Definir los flujos específicos de `incidents`, `advertisement` o `help`.
- Definir el canal Chatbot.
- Definir canales futuros como voz IP.
- Definir el contenido de respuestas automáticas de cada servicio.
- Crear grupos de WhatsApp como mecanismo estándar de atención.
- Usar proveedores alternativos a Wasender para este canal.
- Definir reglas de negocio propias de cada servicio.
- Definir la estructura final de todos los contracts, rules, skills o tests.

---

## 👥 Actores

| Actor | Descripción | Responsabilidad |
|---|---|---|
| Usuario final | Persona que envía mensajes al número WhatsApp del tenant. Puede ser inquilino, ex-inquilino, lead o usuario no identificado. | Inicia o continúa una conversación por WhatsApp. |
| Inquilino activo | Usuario validado como ocupante activo en SmartRoom Core. | Puede iniciar operaciones que requieran identidad activa, según el servicio. |
| Ex-inquilino | Usuario conocido que ya no tiene asignación activa. | Puede recibir respuestas limitadas o ser escalado, según el servicio. |
| Lead externo | Persona interesada en una publicación o alojamiento. | Puede interactuar con servicios comerciales o de información pública. |
| Tenant | Cliente SaaS que contrata SmartConversations y configura WhatsApp. | Activa, desactiva y opera el canal. |
| Admin del tenant | Usuario gestor del tenant. | Configura el canal, revisa conversaciones, atiende escalados y consulta errores. |
| Wasender | Proveedor técnico usado para recibir y enviar mensajes WhatsApp. | Entrega eventos entrantes y permite envío saliente. |
| SmartConversations | Capacidad conversacional común. | Normaliza mensajes, gestiona sesión y entrega al motor conversacional. |
| Motor conversacional | Capa común de routing, contexto e intención. | Decide a qué servicio funcional se enruta la conversación. |
| Servicio funcional | Servicio que atiende la intención final. | Ejecuta la lógica de negocio concreta. |
| SmartRoom Core | Sistema de verdad. | Valida identidad y mantiene datos oficiales del negocio. |

---

## 🧩 Descripción funcional

Cada tenant que active el canal WhatsApp debe disponer de una sesión o número asociado en Wasender.

El canal WhatsApp debe:

1. Recibir mensajes entrantes desde Wasender.
2. Validar que el evento pertenece a una sesión o número conocido.
3. Resolver el tenant asociado a la sesión de Wasender.
4. Comprobar que el canal WhatsApp está activo para el tenant.
5. Comprobar que existe al menos un servicio activo para WhatsApp.
6. Deduplicar mensajes entrantes.
7. Normalizar el mensaje a un formato común.
8. Crear o recuperar una sesión conversacional.
9. Ejecutar fast-path de identidad por teléfono cuando sea posible y permitido.
10. Entregar el mensaje normalizado al motor conversacional común.
11. Enviar respuestas salientes por Wasender.
12. Registrar errores técnicos, estados de envío y trazabilidad.
13. Ignorar o bloquear procesamiento cuando el canal, suscripción o servicios no estén activos.
14. Permitir offboarding lógico y físico del canal.

WhatsApp es un canal común. No existen subnúmeros por servicio como diseño estándar. La separación entre incidencias, anuncios y ayuda es lógica y se realiza mediante routing conversacional.

---

## 🧭 Posición dentro del modelo SmartConversations

Este requisito representa el canal conversacional WhatsApp dentro de SmartConversations.

- [ ] Capability transversal
- [x] Canal conversacional
- [ ] Estándar de integración de canal
- [ ] Servicio funcional
- [ ] Integración servicio × canal

Relación jerárquica:

| Nivel | Requirement relacionado |
|---|---|
| Capability | `REQ-SC-000-smart-conversations-capability.md` |
| Canal WhatsApp | `REQ-SC-010-whatsapp-channel.md` |
| Estándar de integración WhatsApp | `REQ-SC-020-whatsapp-channel-integration.md` |
| Integración incidents × WhatsApp | `REQ-SC-110-incidents-whatsapp-channel-integration.md` |
| Integración advertisement × WhatsApp | `REQ-SC-160-advertisement-whatsapp-channel-integration.md` |
| Integración help × WhatsApp | `REQ-SC-210-help-whatsapp-channel-integration.md` |

---

## 🔁 Flujo funcional

1. El usuario final envía un mensaje al número WhatsApp del tenant.
2. Wasender entrega el evento al webhook configurado.
3. El webhook responde `200 OK` lo antes posible para evitar reintentos innecesarios.
4. El sistema valida que el evento pertenece a una sesión Wasender conocida.
5. El sistema resuelve el `client_account_id` asociado.
6. El sistema comprueba que la suscripción SmartConversations está activa.
7. El sistema comprueba que el canal WhatsApp está activo para el tenant.
8. El sistema comprueba que existe al menos un servicio activo para WhatsApp.
9. Si no hay activación válida, el mensaje se ignora o se bloquea según la política definida.
10. Si el mensaje ya fue procesado, se descarta como duplicado.
11. El sistema normaliza el mensaje.
12. Si existe teléfono del remitente, se puede intentar validación fast-path contra SmartRoom Core.
13. El mensaje se registra en la trazabilidad interna.
14. El mensaje se entrega al motor conversacional común.
15. El motor conversacional determina intención, contexto y servicio destino.
16. El servicio funcional devuelve una respuesta canónica.
17. El canal WhatsApp envía la respuesta por Wasender.
18. El sistema registra el estado del envío.
19. Si el envío falla, se gestiona reintento controlado.
20. Si procede, se publica evento funcional resumido en Activity Log del Core.

---

## ✅ Casos válidos

- Tenant con WhatsApp activo recibe un mensaje de texto.
- Tenant con WhatsApp activo recibe un audio y se genera transcripción antes de procesarlo.
- Tenant con WhatsApp activo recibe una imagen y se registra información básica o se solicita aclaración.
- Mensaje duplicado se detecta y no se procesa dos veces.
- Tenant con solo servicio de incidencias activo recibe un mensaje y se enruta a `incidents`.
- Tenant con varios servicios activos recibe un mensaje ambiguo y el sistema solicita aclaración.
- Canal pausado lógicamente ignora mensajes nuevos sin romper el webhook.
- Tenant da de baja el canal y la sesión Wasender se desconecta como offboarding físico.
- Error temporal de envío produce reintento controlado.
- Mensaje no soportado recibe respuesta genérica o queda registrado técnicamente, según configuración.

---

## ❌ Casos inválidos

- Procesar mensajes de una sesión Wasender no asociada a ningún tenant.
- Procesar mensajes cuando la suscripción umbrella SmartConversations no está activa.
- Procesar mensajes cuando WhatsApp está desactivado para el tenant.
- Procesar mensajes cuando no hay servicios activos para WhatsApp.
- Crear tres números distintos para incidencias, anuncios y ayuda como estándar obligatorio.
- Crear grupos permanentes por servicio como forma estándar de routing.
- Enviar a n8n mensajes sin validación, normalización e idempotencia previa.
- Enviar a la IA el teléfono del usuario para validar identidad.
- Reintentar indefinidamente envíos fallidos.
- Publicar conversaciones completas de WhatsApp en el Activity Log del Core.
- Permitir que el canal implemente lógica de negocio específica de un servicio.
- Permitir que Wasender sea conocido directamente por SmartRoom Core.

---

## 📊 Reglas de negocio

- WhatsApp es un canal, no un servicio funcional.
- Wasender es el proveedor obligatorio para el canal WhatsApp en esta iniciativa.
- Cada tenant tendrá una sesión o número WhatsApp asociado.
- Un número o sesión WhatsApp puede servir a varios servicios funcionales del mismo tenant.
- La separación entre servicios se realiza por routing conversacional, no por subnúmeros.
- El canal solo procesa mensajes si la suscripción, el canal y al menos un servicio están activos.
- La activación debe evaluarse por tenant × servicio × canal.
- La baja lógica debe impedir procesamiento funcional de nuevos mensajes.
- El offboarding definitivo debe desconectar la sesión Wasender si aplica.
- El webhook debe ser idempotente.
- El canal debe soportar texto como mínimo.
- El canal debe soportar audio mediante transcripción cuando esté habilitado.
- Los mensajes no soportados deben registrarse técnicamente sin romper el flujo.
- El canal no debe decidir la lógica de negocio final.
- El canal debe entregar mensajes normalizados al motor conversacional común.
- Las respuestas salientes deben proceder de una respuesta canónica.

---

## 🔐 Seguridad y permisos

- El webhook debe validar que el evento pertenece a una sesión Wasender conocida.
- El sistema debe evitar revelar al remitente si un tenant, canal o servicio está desactivado.
- El teléfono puede usarse para validación fast-path, pero no debe propagarse innecesariamente.
- n8n no debe recibir PII innecesaria del canal.
- La IA no debe recibir el teléfono del remitente para validar identidad.
- Los mensajes entrantes deben quedar aislados por tenant.
- La sesión Wasender debe tratarse como recurso sensible.
- Las credenciales o tokens asociados a Wasender no deben exponerse en frontend ni logs.
- Los logs técnicos no deben contener secretos.
- El Activity Log del Core no debe contener mensajes brutos ni conversaciones completas.
- Las operaciones sensibles posteriores al mensaje deben validar identidad contra SmartRoom Core.

---

## 🔌 Impacto en backend / APIs / Edge Functions / n8n

El canal WhatsApp requiere componentes backend o Edge Functions que actúen como frontera entre Wasender, SmartConversations y el motor conversacional.

### APIs / Edge Functions esperadas

- `conv-wa-webhook`
- `conv-wa-ingest`
- `conv-send-wa`
- `conv-core-validate-identity`
- `conv-core-publish-activity`
- funciones auxiliares de normalización, deduplicación y trazabilidad cuando aplique.

### Workflows n8n esperados

- Workflow común de motor conversacional.
- Workflows específicos de servicio invocados tras routing.
- Workflows auxiliares de clasificación y extracción si aplica.
- Workflows de fallback o escalado si aplica.

### Reglas de integración

- n8n no debe recibir directamente el webhook bruto de Wasender.
- Primero debe existir una capa de validación, normalización e idempotencia.
- El canal entrega mensajes normalizados al motor conversacional.
- El canal envía respuestas producidas en formato canónico.
- Las operaciones contra SmartRoom Core se realizan mediante Integration API o Edge Functions controladas.
- Los fallos de envío se gestionan mediante cola o mecanismo de reintentos controlado.
- El canal no debe escribir directamente en tablas críticas del Core.

---

## 🗄️ Impacto en base de datos

### Tablas afectadas

Tablas esperadas o equivalentes:

- configuración de sesiones WhatsApp por tenant;
- activación tenant × servicio × canal;
- sesiones conversacionales;
- mensajes conversacionales;
- cola de reintentos de envío saliente;
- registros de estado de canal;
- registros técnicos de recepción/envío;
- trazabilidad interna del canal.

### Campos relevantes

- `client_account_id`
- `channel = whatsapp`
- `wasender_session_id`
- `wasender_message_id`
- `phone_number`
- `sender_ref`
- `session_id`
- `message_id`
- `service_code`
- `identity_level`
- `status`
- `last_active_at`
- `created_at`
- `updated_at`

### Constraints

- unicidad de sesión Wasender por tenant cuando aplique;
- idempotencia por mensaje entrante;
- aislamiento por tenant;
- integridad entre sesión, mensaje y tenant;
- estados válidos de canal;
- estados válidos de envío;
- no duplicar procesamiento ante reintentos del webhook.

### RLS

- El tenant solo debe ver sus propias sesiones, mensajes y conversaciones.
- Los usuarios administrativos solo deben acceder a datos de su tenant.
- Las operaciones técnicas internas pueden requerir `service_role`.
- n8n no debe tener acceso directo a tablas críticas del Core.

---

## 🧱 Impacto en frontend

El frontend administrativo debe permitir, cuando aplique:

- visualizar si WhatsApp está activo;
- visualizar estado de configuración del canal;
- configurar o revisar la sesión Wasender;
- iniciar reconexión o proceso QR si aplica;
- activar o desactivar servicios por canal;
- consultar conversaciones entrantes;
- consultar estado de mensajes enviados;
- responder manualmente cuando proceda;
- visualizar errores de canal;
- ejecutar offboarding del canal;
- consultar trazabilidad técnica básica.

### Componentes afectados

- Pantalla de configuración de SmartConversations.
- Pantalla de canales.
- Pantalla de WhatsApp.
- Pantalla de activación de servicios por canal.
- Bandeja de conversaciones.
- Pantalla de errores o estado operativo.
- Pantalla de offboarding del canal.

### Validaciones UI

- No permitir activar servicios por WhatsApp si el canal no está configurado.
- No permitir activar WhatsApp si falta configuración mínima de Wasender.
- Diferenciar canal activo, canal pausado, canal con error y canal dado de baja.
- No mostrar secretos ni tokens de Wasender.
- Mostrar errores técnicos de forma comprensible para admin sin exponer información sensible.

### Estados posibles

- `pending_configuration`
- `active`
- `paused`
- `inactive`
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
- extracción de entidades desde texto o transcripción;
- resumen de conversación;
- redacción de respuestas;
- detección de ambigüedad;
- ayuda para decidir si se debe pedir aclaración;
- asistencia en transcripción o interpretación de audio si el proveedor técnico lo requiere.

### Uso prohibido de IA

- validación de identidad del remitente;
- autorización de operaciones;
- modificación directa de datos críticos;
- decisión final de negocio;
- acceso al teléfono del remitente para decidir identidad;
- publicación directa en SmartRoom Core;
- recepción del payload bruto completo de Wasender si contiene datos no necesarios.

---

## 📚 Knowledge base / contenido

El canal WhatsApp no define por sí mismo una base de conocimiento.

- [x] No aplica directamente
- [ ] FAQ pública
- [ ] FAQ privada por tenant
- [ ] Base de conocimiento del servicio
- [ ] Documentación operativa
- [ ] Contenido de anuncios
- [ ] Otro

Reglas:

- La knowledge base, si existe, pertenece al servicio funcional correspondiente.
- El canal WhatsApp no debe seleccionar contenido final de negocio.
- El canal solo debe entregar el mensaje al motor conversacional y enviar la respuesta resultante.
- El contenido usado por IA debe respetar reglas de privacidad y minimización de datos.

---

## 🔄 Estándar de integración aplicable

Este requisito define el canal. El estándar de integración aplicable a servicios que quieran usar WhatsApp se define en:

| Campo | Valor |
|---|---|
| Canal | `whatsapp` |
| Requirement de canal | `REQ-SC-010-whatsapp-channel.md` |
| Requirement estándar de integración | `REQ-SC-020-whatsapp-channel-integration.md` |
| Servicios iniciales | `incidents`, `advertisement`, `help` |

---

## ✅ Declaración de cumplimiento del estándar de canal

No aplica directamente porque este requisito es de tipo `channel`.

Los servicios que quieran usar WhatsApp deben declarar su cumplimiento en requirements específicos:

| Servicio | Requirement esperado |
|---|---|
| `incidents` | `REQ-SC-110-incidents-whatsapp-channel-integration.md` |
| `advertisement` | `REQ-SC-160-advertisement-whatsapp-channel-integration.md` |
| `help` | `REQ-SC-210-help-whatsapp-channel-integration.md` |
| futuros servicios | `REQ-SC-XXX-<service>-whatsapp-channel-integration.md` |

---

## 🧾 Contratos involucrados

| Contrato | Uso |
|---|---|
| `contract-normalized-message.md` | Define la estructura común del mensaje después de recibirlo desde WhatsApp. |
| `contract-canonical-response.md` | Define la respuesta común que el canal WhatsApp debe poder enviar. |
| `contract-tenant-features-response.md` | Define qué servicios y canales están activos para un tenant. |
| `contract-identity-validation-result.md` | Define el resultado de validación fast-path o validación posterior contra Core. |
| `contract-case-state-machine.md` | Define estados de sesión o caso cuando el mensaje continúa un flujo conversacional. |

---

## 📈 Activity Log

### Publica Activity Log

- [ ] Sí
- [ ] No
- [x] Solo en determinados casos

El canal WhatsApp no debe publicar conversaciones completas en el Activity Log. Solo debe permitir la publicación de eventos funcionales resumidos cuando el motor o servicio correspondiente lo determine.

### Eventos esperados

| Evento | Cuándo se publica | Payload resumido |
|---|---|---|
| `conversation_started` | Cuando un mensaje WhatsApp inicia una conversación funcional relevante | Canal, tenant, servicio si se conoce, resumen mínimo |
| `identity_validated` | Cuando se resuelve identidad desde un flujo iniciado por WhatsApp | Nivel de identidad, canal, servicio, sin PII innecesaria |
| `message_delivery_failed` | Cuando un fallo de envío tiene relevancia operativa | Canal, estado, motivo técnico resumido |
| `conversation_escalated` | Cuando una conversación WhatsApp se escala a humano/admin | Motivo, canal, servicio |
| `conversation_closed` | Cuando se cierra una conversación iniciada o continuada por WhatsApp | Canal, servicio, motivo de cierre |

Reglas:

- No publicar conversaciones completas.
- No publicar mensajes brutos.
- No publicar PII innecesaria.
- No publicar payloads de Wasender.
- Publicar solo hitos funcionales relevantes.
- El fallo de publicación del Activity Log no debe romper la operación principal salvo regla expresa.

---

## 🚨 Errores, fallback y escalado

### Errores esperados

| Error | Comportamiento esperado |
|---|---|
| Webhook inválido | Rechazar o ignorar, registrar técnicamente y no procesar. |
| Sesión Wasender desconocida | No procesar y registrar evento técnico. |
| Tenant no resuelto | No procesar y registrar error técnico. |
| Canal desactivado | Ignorar o bloquear procesamiento según política. |
| Sin servicios activos | Ignorar o responder mensaje genérico según configuración. |
| Mensaje duplicado | Descartar sin reejecutar lógica funcional. |
| Wasender no disponible para envío | Registrar fallo y reintentar si aplica. |
| n8n no disponible | Registrar error, aplicar fallback o reconciliación. |
| Core no disponible en validación fast-path | Continuar con identidad no verificada o fallback según servicio. |
| Tipo de mensaje no soportado | Registrar técnicamente y responder genérico si aplica. |

### Escalado

El canal debe permitir escalado a humano/admin cuando:

- el usuario solicita hablar con una persona;
- el mensaje no puede clasificarse;
- hay fallo persistente de envío o recepción;
- no se puede resolver identidad y el servicio lo requiere;
- hay múltiples servicios posibles y no se puede desambiguar;
- el servicio funcional decide escalar por sus propias reglas.

---

## ⚙️ Requisitos no funcionales

- El webhook debe responder rápido para evitar reintentos innecesarios de Wasender.
- El procesamiento debe ser idempotente.
- El envío debe soportar reintentos controlados.
- El canal debe tolerar caída temporal de n8n.
- El canal debe tolerar fallo temporal de Wasender.
- El canal debe poder desactivarse sin romper SmartRoom Core.
- La trazabilidad debe permitir auditar mensajes y fallos técnicos.
- El canal no debe bloquear el resto de la aplicación si falla.
- El diseño debe permitir incorporar otros canales sin duplicar lógica de servicio.
- El diseño debe permitir incorporar nuevos servicios sin crear nuevos números WhatsApp por servicio.
- Los datos deben minimizarse antes de llegar a IA o n8n.
- Los estados de envío deben ser observables.

---

## 🧪 Validación (QA)

Tests asociados:

### unit

- Validación de sesión Wasender conocida.
- Deduplicación por `wasender_message_id`.
- Normalización de mensaje de texto.
- Normalización de audio transcrito.
- Validación de canal activo.
- Validación de servicio activo por WhatsApp.
- Validación de estados de canal.

### services

- Webhook entrante.
- Envío saliente.
- Offboarding lógico.
- Offboarding físico.
- Activación/desactivación de canal.
- Reintentos de envío.
- Validación fast-path por teléfono.
- Integración con motor conversacional.

### integration

- Wasender → webhook → mensaje normalizado.
- Mensaje normalizado → motor conversacional.
- Respuesta canónica → envío WhatsApp.
- Fallo de envío → cola de reintento.
- Canal desactivado → no procesamiento.
- Servicio inactivo → no routing funcional.

### e2e

- Mensaje WhatsApp entrante → respuesta WhatsApp saliente.
- Canal desactivado → mensaje ignorado.
- Mensaje duplicado → no doble procesamiento.
- Fallo de envío → entrada en cola de reintento.
- Usuario conocido → validación fast-path.
- Usuario desconocido → continúa como identidad no verificada.
- Tenant con varios servicios → aclaración o routing correcto.
- Tenant sin servicios WhatsApp activos → no procesamiento funcional.

---

## ✅ Criterios de aceptación

Este requisito se considera cumplido cuando:

- Un tenant puede tener una sesión WhatsApp asociada.
- Los mensajes entrantes se reciben desde Wasender.
- Los mensajes se validan, deduplican y normalizan antes de llegar a n8n.
- El sistema ignora o bloquea mensajes si la suscripción, el canal o los servicios no están activos.
- El sistema puede enviar respuestas por WhatsApp.
- Las respuestas enviadas proceden de un contrato canónico.
- Los fallos de envío se reintentan de forma controlada.
- El canal puede pausarse, desactivarse o darse de baja sin afectar SmartRoom Core.
- El canal puede ser usado por varios servicios funcionales mediante routing común.
- El canal no implementa lógica de negocio propia de servicios.
- El canal no publica conversaciones completas en Activity Log.
- El canal no expone secretos ni PII innecesaria a frontend, IA o n8n.
- La documentación posterior de rules, contracts, skills y tests puede trazarse a este requisito.

---

## 🔗 Trazabilidad

### Parent requirement

- `REQ-SC-000-smart-conversations-capability.md`

### Requirements relacionados

- `REQ-SC-020-whatsapp-channel-integration.md`
- `REQ-SC-110-incidents-whatsapp-channel-integration.md`
- `REQ-SC-160-advertisement-whatsapp-channel-integration.md`
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

- Wasender debe tratarse como proveedor obligatorio del canal WhatsApp.
- Si Wasender cambia su API, deben revisarse este requisito y los contratos asociados.
- WhatsApp no debe usarse como sustituto de un sistema interno de permisos.
- La recepción por WhatsApp no implica autorización automática para operar sobre servicios sensibles.
- La existencia de teléfono no implica identidad fuerte si el Core no lo valida.
- El canal puede ser usado por leads, inquilinos, ex-inquilinos o usuarios no identificados.
- Los mensajes multimedia deben introducirse progresivamente según soporte real.
- El canal debe diseñarse pensando en futuras restricciones de proveedor, límites de rate, ventanas de atención o cambios de API.

---

## 📝 Observaciones

Este requisito define el canal WhatsApp como infraestructura conversacional común. La forma en que cada servicio usa este canal debe documentarse en requisitos específicos servicio × canal.

El estándar común que deben cumplir los servicios integrados con WhatsApp se define en `REQ-SC-020-whatsapp-channel-integration.md`.
