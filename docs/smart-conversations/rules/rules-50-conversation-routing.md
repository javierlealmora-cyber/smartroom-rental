# rules-50-conversation-routing.md — SmartConversations: Motor de Enrutado Conversacional

## 1. Propósito

Este documento define las reglas que gobiernan WF-10-CONVERSATION-ENGINE: el motor central de enrutado que decide qué servicio debe atender cada mensaje, cómo gestiona los casos abiertos simultáneos y cuándo presenta un menú al usuario.

Cualquier componente que modifique `conv_sessions.active_service_code`, `conv_sessions.active_case_id` o `conv_sessions.open_cases_ids` debe conformarse a este documento.

---

## 2. Alcance

Este documento aplica a:

- n8n WF-10-CONVERSATION-ENGINE
- Campos de `conv_sessions`: `active_service_code`, `active_case_id`, `open_cases_ids`, `state`
- Llamadas de WF-10 a `conv-core-get-tenant-features`
- Llamadas de WF-10 a la IA (Claude API) para clasificación de intención
- Llamadas de WF-10 a WF-20, WF-30 y WF-40

---

## 3. Decisiones No Negociables

1. **WF-10 siempre lee los servicios activos del tenant en tiempo de ejecución.** Nunca debe asumir un conjunto fijo de servicios. La llamada a `conv-core-get-tenant-features` es obligatoria en cada ejecución.

2. **El sistema no mezcla automáticamente múltiples casos abiertos sin confirmación del usuario.** Si hay un caso abierto en un servicio y llega un mensaje de intención diferente, WF-10 debe preguntar al usuario antes de cambiar de contexto.

3. **Si hay un solo servicio activo para el tenant y canal, WF-10 enruta directamente sin presentar menú.** Preguntar al usuario "¿en qué puedo ayudarte?" cuando solo existe una opción es una mala experiencia.

4. **La IA clasifica la intención; WF-10 decide el enrutado.** La IA devuelve `{ service_code, confidence }`. WF-10 aplica las reglas de este documento para decidir si enrutar, pedir menú o preguntar al usuario.

5. **`active_case_id` solo se actualiza cuando el usuario confirma explícitamente el cambio de contexto.** No se cambia de forma especulativa.

6. **El menú de servicios solo muestra los servicios activos para ese tenant en ese canal.** Un servicio contratado pero inactivo en ese canal no aparece en el menú.

---

## 4. Reglas Obligatorias

### 4.1 Flujo de decisión principal de WF-10

```
Al recibir un mensaje en WF-10:

1. Llamar conv-core-get-tenant-features para obtener servicios activos del tenant y canal
2. Si no hay ningún servicio activo → responder con mensaje de servicio no disponible → fin
3. Buscar conv_cases WHERE session_id = X AND status IN ('open', 'waiting_user')

4. Si hay caso(s) abierto(s):
   a. IA: "¿Este mensaje continúa el caso actual o introduce un tema nuevo?"
      Entrada: texto del mensaje + resumen del caso activo (sin PII)
      → Si continúa el caso (confidence ≥ 0.85) → llamar WF del mismo servicio → fin
      → Si tema nuevo → ir a paso 5 con bandera "hay_caso_abierto = true"

5. Si no hay caso abierto (o tema nuevo detectado):
   a. IA: clasificar intención → { service_code, confidence }
   b. Evaluar servicio detectado contra la lista de servicios activos del tenant:
      → Si service_code no está en los servicios activos del tenant → tratar como ambiguo
   c. Si confidence ≥ 0.85 Y servicio activo → enrutar directamente al WF del servicio
   d. Si confidence < 0.85 O servicio no activo O intención ambigua:
      → Si 1 solo servicio activo → enrutar directamente sin menú
      → Si >1 servicio activo → presentar menú de selección
   e. Si hay_caso_abierto = true: incluir en el menú la opción de volver al caso pendiente

6. Si usuario responde al menú con una selección válida:
   → UPDATE conv_sessions.active_service_code = <seleccionado>
   → Llamar WF del servicio seleccionado
```

### 4.2 Campos de sesión: `active_service_code`, `active_case_id`, `open_cases_ids`

| Campo | Significado | Cuándo se actualiza |
|---|---|---|
| `active_service_code` | Servicio en el que está trabajando la sesión actualmente | Cuando WF-10 enruta a un servicio; se borra cuando la sesión vuelve a `NEW` |
| `active_case_id` | UUID del caso que la sesión está atendiendo en este momento | Cuando se crea un nuevo caso o el usuario confirma cambio al caso existente |
| `open_cases_ids[]` | Lista de todos los UUID de casos abiertos en esta sesión | Al crear un caso nuevo (append); al cerrar o resolver un caso (remove) |

Un caso puede estar en `open_cases_ids` sin ser el `active_case_id`. El sistema distingue entre "cases activos para esta sesión" y "case al que se está respondiendo ahora".

### 4.3 Escenario: hay un caso abierto y llega un mensaje de intención diferente

Este es el escenario de cambio de contexto. WF-10 debe gestionar así:

```
Ejemplo: sesión con INC-2026-0042 abierto + usuario pregunta por un anuncio.

1. WF-10 detecta intención = 'conv_publicaciones' (confidence 0.9)
2. active_case_id = <case de incidencia>, open_cases_ids = [<case de incidencia>]
3. WF-10 consulta el resumen del caso activo para incluirlo en el mensaje
4. Bot al usuario:
   "Tienes una incidencia abierta (INC-2026-0042).
    ¿Quieres continuar con ella o prefieres consultar sobre la habitación disponible?
    1️⃣ Continuar con la incidencia
    2️⃣ Consultar sobre el anuncio"

5. Si usuario elige 2:
   → UPDATE conv_sessions.active_service_code = 'conv_publicaciones'
   → El active_case_id permanece como el de incidencia (no se cambia aún)
   → WF-30 se ejecuta; si crea un nuevo case, ese se convierte en active_case_id
   → open_cases_ids incluye ambos cases

6. Al finalizar el flujo de publicaciones:
   "¿Hay algo más en lo que pueda ayudarte? Recuerda que tienes pendiente tu incidencia INC-2026-0042."
```

### 4.4 Generación del menú de selección

El menú solo debe generarse cuando:
- Hay más de un servicio activo para el tenant en ese canal, Y
- La intención no es suficientemente clara (confidence < 0.85)

El menú debe:
- Listar únicamente los servicios activos para ese tenant y canal (no todos los servicios del catálogo).
- Generarse dinámicamente desde el resultado de `conv-core-get-tenant-features`.
- Ofrecer una opción de volver al caso pendiente cuando existe un `active_case_id` abierto.

Ejemplo de menú con tres servicios activos:
```
"¿En qué puedo ayudarte?
  1️⃣ Reportar una incidencia o avería
  2️⃣ Consultar sobre un anuncio o habitación disponible
  3️⃣ Ayuda general o consulta

Responde con el número o cuéntame qué necesitas."
```

Si el tenant tiene solo `conv_incidencias` y `conv_ayuda` activos, la opción 2 no aparece.

### 4.5 Enrutado directo con un solo servicio activo

Si `conv-core-get-tenant-features` devuelve exactamente un servicio activo para el tenant y canal:
- WF-10 enruta directamente al WF del servicio sin presentar menú.
- No se pide confirmación al usuario.
- `active_service_code` se actualiza antes de llamar al WF del servicio.

Este comportamiento aplica independientemente del nivel de confianza de la clasificación de intención. Con un único servicio, toda intención se mapea a él.

### 4.6 Estado de `conv_sessions` durante el enrutado

WF-10 transiciona el estado de la sesión:

| Desde | Hacia | Cuándo |
|---|---|---|
| `NEW` | `SELECTING_SERVICE` | WF-10 presenta menú de servicios |
| `NEW` | `IN_SERVICE` | WF-10 enruta directamente |
| `SELECTING_SERVICE` | `IN_SERVICE` | Usuario selecciona un servicio del menú |
| `IN_SERVICE` | `AWAITING_USER` | WF de servicio espera respuesta del usuario |
| `AWAITING_USER` | `IN_SERVICE` | Usuario responde y WF de servicio continúa |
| `IN_SERVICE` | `ESCALATED` | WF de servicio escala a admin humano |
| `ESCALATED` | `IN_SERVICE` | Admin resuelve y devuelve el control al bot |

### 4.7 Protección contra mezcla descontrolada de casos

El sistema no debe mezclar automáticamente el contexto de dos casos abiertos en el mismo turno de respuesta. Las reglas son:

- Una respuesta del bot corresponde a un único `active_case_id` en ese momento.
- Si `open_cases_ids` contiene más de un caso, el bot menciona los otros casos como "pendientes" solo al inicio o al final del flujo activo, nunca mezclando información de ambos en la misma respuesta.
- Un caso en `open_cases_ids` que no sea `active_case_id` no recibe actualizaciones de estado en ese turno.

---

## 5. Casos Permitidos

- Tenant con un solo servicio activo: WF-10 enruta directamente sin preguntar al usuario.
- Usuario con `active_case_id` de incidencias que envía un mensaje claramente relacionado con la incidencia (confidence ≥ 0.85): WF-10 continúa el caso sin presentar menú.
- Usuario con incidencia abierta que pregunta por un anuncio: WF-10 detecta intención nueva, pregunta al usuario y espera confirmación antes de cambiar `active_service_code`.
- Sesión con dos casos en `open_cases_ids`: el bot menciona el caso no activo al final del flujo como recordatorio.
- WF-10 presentando menú cuando la clasificación de intención tiene confidence < 0.85 y hay múltiples servicios activos.

---

## 6. Casos Prohibidos

- Cambiar `active_service_code` o `active_case_id` sin confirmación del usuario cuando hay un caso abierto con intención diferente.
- Hardcodear la lista de servicios en WF-10 en lugar de leerla de `conv-core-get-tenant-features`.
- Presentar en el menú servicios no activos para el tenant.
- Mezclar en una misma respuesta del bot información de dos casos distintos.
- Saltarse la clasificación de intención por IA cuando hay ambigüedad y múltiples servicios activos.
- Dejar `active_service_code` y `active_case_id` sin actualizar después de que el usuario confirme un cambio de contexto.

---

## 7. Impacto en el Diseño

- WF-10 es el único componente que actualiza `conv_sessions.active_service_code`. Los workflows de servicio (WF-20, WF-30, WF-40) no deben escribir en este campo.
- `open_cases_ids` es mantenido por las EFs que crean y cierran casos, no por WF-10 directamente.
- El menú de selección es texto generado por WF-10 y enviado como respuesta del bot. No es una estructura de datos especial.
- WF-10 no implementa lógica de ningún servicio. Su responsabilidad es exclusivamente el enrutado.

---

## 8. Impacto en la Implementación

- La llamada a `conv-core-get-tenant-features` debe realizarse al inicio de cada ejecución de WF-10, antes de cualquier otra lógica.
- El umbral de confianza para enrutado directo (0.85) es configurable por tenant en `conv_service_activations.config`. El valor por defecto es 0.85.
- El resumen del caso activo que se pasa a la IA para detectar continuidad no debe incluir datos personales del inquilino (nombre, teléfono, residencia). Debe incluir únicamente el `service_code`, el `case_ref_id` (por ejemplo, "INC-2026-0042") y una descripción anónima del problema.
- WF-10 debe persistir en n8n la selección del usuario antes de llamar al WF del servicio, para que si el WF de servicio falla, el estado de la sesión no quede inconsistente.

---

## 9. Dependencias

- `rules-00-scope-and-principles.md` — principios P1, P5, P6
- `rules-10-service-catalog.md` — catálogo canónico de servicios y canales
- `rules-20-tenant-activation-and-lifecycle.md` — jerarquía de activación
- `rules-40-identity-validation.md` — nivel de identidad disponible en sesión
- `rules-60-service-incidents.md` — WF-20
- `rules-61-service-listings.md` — WF-30
- `rules-62-service-help.md` — WF-40
- `rules-75-activity-log.md` — `conv_conversation_started` publicado por `conv-ingest` antes de llegar a WF-10
- `contract-tenant-features-response.md` — estructura de la respuesta de `conv-core-get-tenant-features`
- `contract-case-state-machine.md` — transiciones de estado de `conv_sessions`

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`

---

## 10. Checklist de Validación

- [ ] WF-10 llama a `conv-core-get-tenant-features` al inicio de cada ejecución
- [ ] El menú de servicios solo incluye servicios activos para el tenant y canal actuales
- [ ] Hay un solo servicio activo → WF-10 enruta directamente sin menú
- [ ] Hay caso abierto + intención diferente → WF-10 pregunta al usuario antes de cambiar contexto
- [ ] `active_service_code` se actualiza solo tras confirmación explícita del usuario
- [ ] Ninguna respuesta del bot mezcla información de dos casos distintos
- [ ] El resumen del caso pasado a la IA no contiene PII del inquilino
- [ ] El umbral de confianza (0.85) es leído de configuración, no hardcodeado

---

## 11. Notas de Control de Cambios

Modificar el umbral de confianza por defecto (0.85) requiere actualizar tanto este documento como la configuración seed de `conv_service_activations.config`.

Añadir un nuevo servicio al catálogo (Sección 3.2 de `rules-10-service-catalog.md`) requiere actualizar también la lógica de presentación de menú en WF-10 y los textos de las opciones.

Cambios en los estados de `conv_sessions` deben coordinarse con `contract-case-state-machine.md`.
