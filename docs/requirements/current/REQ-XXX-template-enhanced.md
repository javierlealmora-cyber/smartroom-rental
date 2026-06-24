# REQ-XXX - Nombre del requisito

## Status
ACTIVE

## Owner
@responsable

## Last updated
YYYY-MM-DD

## Requirement type
`capability | channel | channel-integration-standard | service | service-channel-integration`

## Priority
`MUST | SHOULD | COULD`

## Scope level
`global | tenant | channel | service | service-channel`

---

## 🎯 Objetivo

Describe qué problema resuelve este requisito, para qué existe y qué valor aporta al producto.

Debe responder claramente a:

- qué necesidad cubre;
- quién se beneficia;
- qué parte del sistema regula;
- qué decisión funcional deja fijada.

Ejemplo:

> Definir el estándar común que cualquier servicio funcional debe cumplir para integrarse con el canal WhatsApp dentro de SmartConversations.

---

## 📌 Alcance

Define qué cubre este requisito.

Debe incluir:

- funcionalidad incluida;
- actores afectados;
- canales afectados;
- servicios afectados;
- capas técnicas afectadas;
- límites funcionales.

Ejemplo:

- recepción de mensajes;
- envío de respuestas;
- validación de activación tenant × servicio × canal;
- routing;
- integración con SmartRoom Core;
- publicación de eventos resumidos en Activity Log.

---

## 🚫 Fuera de alcance

Define expresamente qué NO cubre este requisito.

Debe evitar ambigüedades y duplicidades con otros requirements.

Ejemplo:

- no define la implementación interna de Wasender;
- no define la lógica completa del servicio de incidencias;
- no define la UI final de administración;
- no define tests automáticos detallados;
- no sustituye los contracts, rules, skills ni tests.

---

## 👥 Actores

| Actor | Descripción | Responsabilidad |
|---|---|---|
| Usuario final | Persona que interactúa con el sistema | Inicia o continúa una conversación |
| Tenant | Cliente SaaS que contrata la funcionalidad | Configura canales y servicios |
| Admin del tenant | Usuario gestor | Supervisa, configura o atiende escalados |
| SmartConversations | Capacidad conversacional | Normaliza, enruta y mantiene trazabilidad |
| Canal | WhatsApp, Chatbot, voz IP u otro | Entrada/salida de mensajes |
| Servicio funcional | Incidents, advertisement, help u otros | Ejecuta la lógica de negocio |
| SmartRoom Core | Sistema de verdad | Valida identidad y ejecuta operaciones de negocio |
| n8n | Orquestador | Coordina workflows, sin ser fuente de verdad |
| IA | Asistente | Clasifica, extrae y redacta, sin decidir negocio |

---

## 🧩 Descripción funcional

Explica el comportamiento esperado del sistema en lenguaje funcional.

Debe explicar:

- qué ocurre;
- cuándo ocurre;
- qué decisiones toma el sistema;
- qué componentes participan;
- qué resultado se espera.

Para requirements de integración, debe distinguir claramente entre:

- lo que hace el canal;
- lo que hace el motor conversacional;
- lo que hace el servicio;
- lo que valida el Core;
- lo que puede o no puede hacer la IA.

---

## 🧭 Posición dentro del modelo SmartConversations

Indicar dónde encaja este requisito dentro de la arquitectura funcional.

Marcar una opción:

- [ ] Capability transversal
- [ ] Canal conversacional
- [ ] Estándar de integración de canal
- [ ] Servicio funcional
- [ ] Integración servicio × canal

Relación jerárquica:

| Nivel | Requirement relacionado |
|---|---|
| Capability | `REQ-SC-000-smart-conversations-capability.md` |
| Canal | `REQ-SC-XXX-<channel>-channel.md` |
| Estándar de integración del canal | `REQ-SC-XXX-<channel>-channel-integration.md` |
| Servicio | `REQ-SC-XXX-<service>-service.md` |
| Integración servicio × canal | `REQ-SC-XXX-<service>-<channel>-channel-integration.md` |

---

## 🔁 Flujo funcional

Describe el flujo esperado paso a paso.

1. Paso 1.
2. Paso 2.
3. Paso 3.
4. Paso 4.
5. Paso 5.

Para requirements de canal o integración, incluir como mínimo:

1. entrada del usuario;
2. validación del canal;
3. resolución de tenant;
4. comprobación de activación;
5. normalización;
6. routing;
7. ejecución del servicio;
8. generación de respuesta;
9. entrega al canal;
10. trazabilidad;
11. publicación de activity log si procede.

---

## ✅ Casos válidos

Lista los escenarios permitidos o esperados.

- Caso válido 1.
- Caso válido 2.
- Caso válido 3.

Ejemplos:

- Tenant con canal activo y servicio activo procesa el mensaje correctamente.
- Servicio integrado recibe mensaje normalizado, no payload bruto del proveedor.
- Servicio publica evento funcional resumido cuando se crea un recurso relevante.
- Usuario sin identidad suficiente recibe petición de datos adicionales o escalado.

---

## ❌ Casos inválidos

Lista los escenarios no permitidos.

- Caso inválido 1.
- Caso inválido 2.
- Caso inválido 3.

Ejemplos:

- Servicio recibe webhook bruto del proveedor externo.
- Canal procesa mensajes sin comprobar activación.
- IA valida identidad del usuario.
- n8n escribe directamente en tablas críticas.
- Servicio llama directamente a la base de datos del Core.
- Activity Log recibe conversaciones completas o PII innecesaria.

---

## 📊 Reglas de negocio

Define reglas funcionales obligatorias.

- Regla 1.
- Regla 2.
- Regla 3.

Para SmartConversations, incluir cuando aplique:

- La activación se evalúa por tenant × servicio × canal.
- El canal no decide la lógica de negocio.
- El servicio no decide la disponibilidad del canal.
- SmartRoom Core es fuente de verdad.
- IA no valida identidad ni autoriza operaciones.
- Los eventos publicados en Activity Log son resumidos y auditables.
- Cada integración servicio × canal debe declarar cómo cumple el estándar del canal.

---

## 🔐 Seguridad y permisos

Define restricciones de seguridad, privacidad y autorización.

Debe indicar:

- qué datos puede recibir cada componente;
- qué datos no puede recibir n8n;
- qué datos no puede recibir la IA;
- cuándo se requiere validación de identidad;
- qué operaciones requieren identidad fuerte;
- cómo se respeta el aislamiento por tenant;
- qué se publica o no en Activity Log.

Ejemplos:

- El servicio no debe recibir PII innecesaria.
- La IA no debe recibir `profile_id`, teléfono, habitación o datos contractuales salvo autorización expresa.
- n8n no debe acceder directamente a la base de datos del Core.
- Las operaciones sensibles deben validarse contra SmartRoom Core.
- El Activity Log no debe contener mensajes brutos.

---

## 🔌 Impacto en backend / APIs / Edge Functions / n8n

Describe qué backend, endpoints, Edge Functions o workflows se ven afectados.

### APIs / Edge Functions esperadas

- `nombre-funcion-1`
- `nombre-funcion-2`
- `nombre-funcion-3`

### Workflows n8n esperados

- `WF-XX-nombre`
- `WF-YY-nombre`

### Reglas de integración

- El canal entrega mensajes normalizados.
- El servicio devuelve una respuesta canónica.
- Las operaciones críticas se ejecutan en backend o Edge Functions.
- n8n puede orquestar, pero no debe ser fuente de verdad.
- Las llamadas al Core se hacen mediante Integration API.

---

## 🗄️ Impacto en base de datos

Describe tablas, campos, constraints y RLS.

### Tablas afectadas

- `tabla_1`
- `tabla_2`
- `tabla_3`

### Campos relevantes

- `client_account_id`
- `channel`
- `service_code`
- `session_id`
- `case_id`
- `identity_level`
- `status`

### Constraints

- aislamiento por tenant;
- unicidad cuando aplique;
- idempotencia;
- estados válidos;
- integridad referencial.

### RLS

- Indicar si aplica.
- Indicar qué roles pueden leer.
- Indicar qué roles pueden escribir.
- Indicar qué operaciones requieren `service_role`.

---

## 🧱 Impacto en frontend

Describe el impacto en UI, componentes, pantallas, validaciones y estados.

### Componentes afectados

- Componente 1.
- Componente 2.

### Validaciones UI

- Validación 1.
- Validación 2.

### Estados posibles

- `active`
- `inactive`
- `paused`
- `error`
- `pending_configuration`

### Funcionalidad esperada

- visualizar configuración;
- activar/desactivar servicio;
- visualizar conversaciones;
- visualizar errores;
- revisar casos;
- atender escalados;
- consultar trazabilidad.

---

## 🤖 Impacto en IA

Indicar si el requisito utiliza IA.

### IA utilizada

- [ ] Sí
- [ ] No
- [ ] Opcional según plan/configuración

### Uso permitido de IA

- clasificación de intención;
- extracción de entidades;
- resumen;
- redacción de respuestas;
- sugerencias para operador humano.

### Uso prohibido de IA

- validación de identidad;
- autorización de operaciones;
- modificación directa de datos críticos;
- decisión final de negocio;
- acceso a PII innecesaria;
- publicación directa en Core.

---

## 📚 Knowledge base / contenido

Indicar si el requisito necesita base de conocimiento, documentos, FAQs o contenido administrable.

- [ ] No aplica
- [ ] FAQ pública
- [ ] FAQ privada por tenant
- [ ] Base de conocimiento del servicio
- [ ] Documentación operativa
- [ ] Contenido de anuncios
- [ ] Otro

Reglas:

- El contenido debe estar aislado por tenant cuando aplique.
- El contenido público no debe exponer datos privados.
- El contenido usado por IA debe respetar reglas de privacidad.

---

## 🔄 Estándar de integración aplicable

Esta sección es obligatoria en requirements de tipo:

- `service-channel-integration`

Debe indicar qué estándar de canal se cumple.

| Campo | Valor |
|---|---|
| Canal | `<whatsapp | chatbot | voice | other>` |
| Requirement de canal | `REQ-SC-XXX-<channel>-channel.md` |
| Requirement estándar de integración | `REQ-SC-XXX-<channel>-channel-integration.md` |
| Servicio integrado | `<service_code>` |
| Requirement del servicio | `REQ-SC-XXX-<service>-service.md` |

---

## ✅ Declaración de cumplimiento del estándar de canal

Esta sección es obligatoria en requirements de tipo:

- `service-channel-integration`

El servicio debe declarar cómo cumple cada punto del estándar del canal.

| Requisito del estándar | Cómo lo cumple este servicio | Evidencia / documento |
|---|---|---|
| Recibe mensaje normalizado | Pendiente | Pendiente |
| Valida activación tenant × servicio × canal | Pendiente | Pendiente |
| Declara nivel de identidad requerido | Pendiente | Pendiente |
| Usa Integration API para Core | Pendiente | Pendiente |
| Devuelve respuesta canónica | Pendiente | Pendiente |
| Publica Activity Log resumido si procede | Pendiente | Pendiente |
| No recibe payload bruto del proveedor | Pendiente | Pendiente |
| No expone PII innecesaria a IA/n8n | Pendiente | Pendiente |
| Define criterios de escalado | Pendiente | Pendiente |
| Define tests mínimos | Pendiente | Pendiente |

---

## 🧾 Contratos involucrados

Lista los contratos funcionales o técnicos relacionados.

- `contract-normalized-message.md`
- `contract-canonical-response.md`
- `contract-tenant-features-response.md`
- `contract-identity-validation-result.md`
- `contract-case-state-machine.md`

Para cada contrato, indicar:

| Contrato | Uso |
|---|---|
| `contract-name.md` | Describe cómo se usa |

---

## 📈 Activity Log

Indicar si el requisito publica eventos en el Activity Log del Core.

### Publica Activity Log

- [ ] Sí
- [ ] No
- [ ] Solo en determinados casos

### Eventos esperados

| Evento | Cuándo se publica | Payload resumido |
|---|---|---|
| `event_name` | Condición | Resumen sin PII innecesaria |

Reglas:

- No publicar conversaciones completas.
- No publicar mensajes brutos.
- No publicar PII innecesaria.
- Publicar solo hitos funcionales relevantes.
- El fallo de publicación del Activity Log no debe romper la operación principal salvo regla expresa.

---

## 🚨 Errores, fallback y escalado

Describe qué ocurre cuando algo falla.

### Errores esperados

| Error | Comportamiento esperado |
|---|---|
| Canal no disponible | Registrar error y reintentar si aplica |
| Servicio inactivo | No procesar y responder/ignorar según canal |
| Identidad no validada | Solicitar datos, limitar operación o escalar |
| Core no disponible | Backoff, fallback o escalado |
| IA no disponible | Formulario guiado o respuesta alternativa |
| n8n no disponible | Registrar y reconciliar |

### Escalado

Indicar cuándo se escala a humano/admin:

- identidad no resuelta;
- usuario solicita humano;
- fallo persistente;
- caso sensible;
- operación no automatizable;
- límite de intentos superado.

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

---

## 🧪 Validación (QA)

Tests asociados:

### unit

- Test unitario 1.
- Test unitario 2.

### services

- Test de servicio 1.
- Test de servicio 2.

### integration

- Test de integración 1.
- Test de integración 2.

### e2e

- Test e2e 1.
- Test e2e 2.

---

## ✅ Criterios de aceptación

Este requisito se considera cumplido cuando:

- Criterio 1.
- Criterio 2.
- Criterio 3.

Para requirements de integración, incluir como mínimo:

- el servicio recibe entrada normalizada;
- el servicio no recibe payload bruto del canal;
- el servicio valida activación tenant × servicio × canal;
- el servicio declara nivel de identidad requerido;
- el servicio usa Integration API para operaciones de Core;
- el servicio devuelve respuesta canónica;
- el servicio publica Activity Log cuando procede;
- existen tests mínimos asociados;
- existe trazabilidad hacia rules, contracts, skills y tests.

---

## 🔗 Trazabilidad

### Parent requirement

- `REQ-SC-XXX-parent.md`

### Requirements relacionados

- `REQ-SC-XXX-related.md`
- `REQ-SC-YYY-related.md`

### Rules relacionadas

- `rules-xx-name.md`

### Contracts relacionados

- `contract-name.md`

### Skills relacionados

- `skill-name.md`

### Tests relacionados

- `test-name.md`

### Diagrams relacionados

- `diagram-name.md`

### Cambios relacionados (CHG)

- Pendiente

### Migraciones SQL

- Pendiente

### Issues

- Pendiente

---

## ⚠️ Consideraciones

Incluir edge cases, limitaciones y decisiones pendientes.

Ejemplos:

- comportamiento cuando hay múltiples servicios activos;
- comportamiento cuando el usuario cambia de intención;
- comportamiento cuando existe un caso abierto;
- límites del canal;
- limitaciones del proveedor;
- límites de IA;
- casos de privacidad;
- dependencia de configuración por tenant.

---

## 📝 Observaciones

Notas adicionales relevantes.

Indicar aquí cualquier comentario de producto, arquitectura o implementación que no encaje en las secciones anteriores, pero que ayude a interpretar correctamente el requisito.
