# rules-62-service-help.md — SmartConversations: Servicio de Ayuda y Consultas

## 1. Propósito

Este documento define las reglas que gobiernan el servicio `conv_ayuda`: qué consultas son públicas, qué consultas requieren validación de identidad parcial o fuerte, cuándo la respuesta se genera desde la base de conocimiento (KB) y cuándo debe llamarse al Core, cuándo se escala a un humano y los eventos que deben publicarse al activity log de SmartRoom Core.

---

## 2. Alcance

Este documento aplica a:

- n8n WF-40-AYUDA-CONSULTA
- Tabla `conv_kb` (base de conocimiento del tenant)
- EF `conv-core-*` relevantes para consultas con datos personales
- EF `conv-escalate-case` (escalado a admin humano)
- Tabla `conv_cases` para casos de tipo `help_ticket`

---

## 3. Decisiones No Negociables

1. **El FAQ público es accesible con cualquier nivel de identidad, incluyendo `NO_MATCH`.** No se requiere ninguna validación previa para responder preguntas generales sobre la residencia, normativa interna, horarios u otros datos de la KB.

2. **Los datos personales del inquilino (saldo, fecha de vencimiento de contrato, número de habitación asignada) requieren como mínimo `PARTIAL_MATCH_ACTIVE`.** Estos datos solo existen en el Core; WF-40 debe llamar a la EF correspondiente de Integration API para obtenerlos.

3. **La información contractual completa requiere `STRONG_MATCH_ACTIVE`.** El nivel parcial no es suficiente para acceder a condiciones contractuales, cláusulas ni importes pendientes detallados.

4. **La IA genera respuestas desde la KB; nunca desde datos del Core sin pasar por Integration API.** La IA puede recibir texto de la KB como contexto para elaborar la respuesta, pero nunca puede recibir datos personales del inquilino directamente.

5. **Una respuesta de la KB con `confidence < 0.8` no se envía automáticamente al usuario.** Se marca como sugerencia para el admin y se escala si el usuario lo solicita.

6. **El servicio de ayuda puede escalarse a cualquier nivel de identidad, incluido `UNVERIFIED_LEAD`.** La escalada siempre está disponible.

---

## 4. Reglas Obligatorias

### 4.1 Clasificación de consultas por nivel de identidad requerido

| Tipo de consulta | Nivel mínimo | Fuente de datos |
|---|---|---|
| FAQ general (normas, horarios, wifi, espacios comunes, instalaciones) | Sin requisito (`NO_MATCH` suficiente) | `conv_kb` del tenant |
| Información del alojamiento (dirección, transportes, servicios incluidos) | Sin requisito | `conv_kb` del tenant |
| Estado de mi incidencia | `PARTIAL_MATCH_ACTIVE` | Core (EF correspondiente) |
| Fecha de próximo pago / saldo pendiente | `PARTIAL_MATCH_ACTIVE` | Core |
| Fecha de vencimiento de contrato / fecha de entrada | `PARTIAL_MATCH_ACTIVE` | Core |
| Condiciones del contrato, cláusulas específicas | `STRONG_MATCH_ACTIVE` | Core |
| Importes pendientes detallados / historial de pagos | `STRONG_MATCH_ACTIVE` | Core |

WF-40 debe evaluar el tipo de consulta antes de determinar si necesita validación de identidad.

### 4.2 Flujo de WF-40 según tipo de consulta

```
Al recibir mensaje en WF-40 (desde WF-10):

1. IA clasifica el subtema: 'faq_general' | 'cuenta_personal' | 'contractual' | 'incidencia_estado' | 'otro'
2. Si subtema = 'faq_general':
   a. Buscar en conv_kb del tenant (coincidencia semántica, confidence ≥ 0.8)
   b. Si encontrado → IA redacta respuesta usando el texto de la KB como contexto
   c. Si no encontrado o confidence < 0.8 → ofrecer escalada o preguntar de otra forma
   d. No se requiere ninguna validación de identidad

3. Si subtema = 'cuenta_personal' o 'incidencia_estado':
   a. Verificar identity_level ≥ PARTIAL_MATCH_ACTIVE
   b. Si < PARTIAL: activar WF-IDENTITY
   c. Si tras WF-IDENTITY sigue siendo NO_MATCH → responder que no se puede verificar + ofrecer escalada
   d. Si PARTIAL o STRONG: llamar EF de Integration API correspondiente → inyectar datos en respuesta

4. Si subtema = 'contractual':
   a. Verificar identity_level = STRONG_MATCH_ACTIVE
   b. Si < STRONG: activar WF-IDENTITY
   c. Si tras WF-IDENTITY sigue siendo PARTIAL o inferior → responder con limitaciones + ofrecer escalada
   d. Si STRONG: llamar EF de Integration API correspondiente → inyectar datos en respuesta

5. Si subtema = 'otro' o IA no puede clasificar con confidence ≥ 0.8:
   a. Buscar en conv_kb con términos exactos del mensaje
   b. Si no encontrado → escalar a admin con contexto del mensaje
```

### 4.3 Búsqueda en la base de conocimiento (`conv_kb`)

WF-40 debe buscar en la KB del tenant antes de llamar al Core o a la IA para respuestas de FAQ. El proceso es:

1. Búsqueda semántica en `conv_kb WHERE client_account_id = X`.
2. Si la coincidencia tiene `confidence ≥ 0.8`: la IA elabora la respuesta usando el texto de la KB como contexto.
3. Si la coincidencia tiene `confidence < 0.8`: la respuesta se marca como `ai_suggestion` para el admin; no se envía automáticamente.
4. Si no hay ninguna coincidencia: WF-40 ofrece escalar o preguntar de otra manera.

La IA recibe el texto de la KB como contexto, pero no recibe datos personales del inquilino para construir la respuesta de FAQ.

### 4.4 Llamadas al Core para consultas personales

Cuando la consulta requiere datos personales del inquilino:

- WF-40 llama a la EF de Integration API correspondiente (a determinar en `rules-70-integration-api.md`).
- Los datos devueltos por el Core son recibidos por la EF, no por n8n directamente.
- La EF inyecta los datos en la respuesta del bot usando marcadores (`{balance}`, `{due_date}`) después de que la IA haya generado el texto base.
- La IA genera: "Tu próximo pago es el {due_date} por un importe de {amount} €."
- La EF sustituye los marcadores con los valores reales. La IA nunca recibe esos valores.

### 4.5 Condiciones de escalado a admin humano

WF-40 debe llamar a EF `conv-escalate-case` y publicar `conv_case_escalated` en las siguientes situaciones:

| Condición | Acción |
|---|---|
| Ninguna entrada de KB con `confidence ≥ 0.8` | Ofrecer escalada explícitamente al usuario |
| Usuario solicita hablar con una persona | Escalar inmediatamente sin intentar responder con KB |
| Consulta contractual y `identity_level < STRONG_MATCH_ACTIVE` tras WF-IDENTITY | Escalar con contexto |
| EF del Core devuelve error para consulta personal | Escalar con mensaje genérico; no exponer el error |
| `auto_escalate_after_minutes` superado sin resolución | Escalar automáticamente |

El mensaje al usuario cuando se escala es siempre genérico: "Te pongo en contacto con el equipo. En breve te responderán."

### 4.6 Gestión de cases de tipo `help_ticket`

Los casos de `conv_ayuda` se crean en `conv_cases` con `case_ref_type = 'help_ticket'` cuando:
- El usuario solicita explícitamente escalada a un humano.
- WF-40 no puede resolver la consulta con la KB o con datos del Core.
- La consulta requiere decisión administrativa.

Los casos de FAQ respondidos con éxito desde la KB no generan un registro en `conv_cases` a menos que el usuario quiera hacer seguimiento.

### 4.7 Contribución al activity log del Core

| Evento | Publicado por | Cuándo |
|---|---|---|
| `conv_case_created` | EF que inserta la fila en `conv_cases` con `case_ref_type = 'help_ticket'` | Se inserta una fila real en `conv_cases` para este servicio |
| `conv_case_escalated` | EF `conv-escalate-case` | Caso escalado a admin humano |
| `conv_case_closed` | EF `conv-close-case` | Caso `help_ticket` cerrado o resuelto |

**Nota sobre `conv_case_created`:** si el flujo de este servicio inserta una fila real en `conv_cases` (creación de un `help_ticket` según la Sección 4.6), debe publicarse también `conv_case_created`, además de cualquier otro evento específico que corresponda (por ejemplo `conv_case_escalated` si la creación del ticket coincide con una escalada). `conv_case_created` no sustituye a estos eventos; se publica en paralelo. Véase `rules-75-activity-log.md` §4.2 para la regla completa.

Las consultas respondidas directamente desde la KB sin crear un caso en `conv_cases` no generan eventos en el activity log del Core.

Véase `rules-75-activity-log.md` para los payloads exactos.

---

## 5. Casos Permitidos

- Un usuario anónimo (`NO_MATCH`) que consulta los horarios de la residencia y recibe respuesta directamente desde la KB.
- Un usuario con `PARTIAL_MATCH_ACTIVE` que pregunta por su próximo pago y recibe la fecha inyectada por la EF en la respuesta.
- Un usuario que solicita explícitamente hablar con una persona: escalada inmediata sin intento de respuesta.
- Un caso de `help_ticket` que se crea porque la KB no tiene respuesta suficiente y el usuario necesita seguimiento.
- WF-40 que responde a una pregunta de FAQ con `confidence = 0.75` marcándola como sugerencia para el admin en lugar de enviarla directamente.

---

## 6. Casos Prohibidos

- Responder preguntas sobre datos personales del inquilino (saldo, contrato, fechas) sin validar la identidad.
- Pasar datos personales del inquilino a la IA para construir la respuesta.
- Enviar automáticamente respuestas de la KB con `confidence < 0.8` sin revisión del admin.
- Llamar directamente a tablas del Core desde n8n o la IA para obtener datos personales.
- Revelar el detalle técnico de por qué no se puede acceder a un dato (error de Core, identidad insuficiente) al usuario final.
- Crear un caso en `conv_cases` por cada FAQ respondida con éxito desde la KB.

---

## 7. Impacto en el Diseño

- La KB (`conv_kb`) es propiedad del add-on. El admin del tenant la gestiona mediante el panel de administración.
- La IA actúa como redactor de la respuesta, no como motor de búsqueda de la KB. La búsqueda semántica la realiza WF-40; la IA elabora el texto a partir del resultado.
- Los datos personales del inquilino que se mencionan en las respuestas siempre los inyecta la EF después de la generación de texto por IA.

---

## 8. Impacto en la Implementación

- La clasificación del subtema de la consulta por la IA usa `haiku-4-5` con la categorización: `'faq_general' | 'cuenta_personal' | 'contractual' | 'incidencia_estado' | 'otro'`.
- El umbral de confianza para respuesta automática de KB (0.8) es configurable por tenant en `conv_service_activations.config`.
- Los casos de `help_ticket` creados para escalada deben incluir el texto del mensaje del usuario y la clasificación de intención como contexto para el admin.

---

## 9. Dependencias

- `rules-00-scope-and-principles.md` — principio P5 (IA no valida)
- `rules-40-identity-validation.md` — niveles de identidad y acceso a datos personales
- `rules-70-integration-api.md` — EFs del Core para consultas personales
- `rules-75-activity-log.md` — eventos `conv_case_created`, `conv_case_escalated`
- `rules-80-data-and-privacy.md` — inyección de datos personales por EF después de la IA
- `contract-canonical-response.md` — estructura de la respuesta de WF-40

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-200-help-service.md`
- `REQ-SC-210-help-whatsapp-channel-integration.md`
- `REQ-SC-220-help-chatbot-channel-integration.md`

---

## 10. Checklist de Validación

- [ ] FAQ general accesible con `NO_MATCH` sin validación de identidad
- [ ] Consultas de datos personales verifican `identity_level ≥ PARTIAL_MATCH_ACTIVE`
- [ ] Consultas contractuales verifican `identity_level = STRONG_MATCH_ACTIVE`
- [ ] La IA no recibe datos personales del inquilino directamente; los inyecta la EF
- [ ] Respuestas de KB con `confidence < 0.8` se marcan como sugerencia, no se envían
- [ ] Solicitud explícita de hablar con humano → escalada inmediata sin intento de respuesta
- [ ] Los errores de EFs del Core se gestionan internamente; el usuario recibe mensaje genérico
- [ ] El event `conv_case_escalated` se publica solo cuando hay escalada real a admin

---

## 11. Notas de Control de Cambios

Si se amplía la clasificación de subtemas de consulta (añadiendo categorías nuevas), debe actualizarse la lógica de clasificación en WF-40 y la tabla de niveles de identidad requeridos en este documento.

Cualquier nueva EF del Core que proporcione datos personales para respuestas de ayuda debe añadirse a `rules-70-integration-api.md` y su nivel de identidad mínimo debe quedar explícito en la Sección 4.1 de este documento.
