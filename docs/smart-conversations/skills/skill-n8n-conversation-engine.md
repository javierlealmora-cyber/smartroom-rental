# Skill — Motor Conversacional n8n (WF-10)

## 1. Objetivo

Este skill explica cómo implementar WF-10-CONVERSATION-ENGINE en n8n: el enrutador central que recibe cada mensaje normalizado, determina qué servicio debe atenderlo y gestiona el cambio de contexto cuando hay casos abiertos. Cubre también los límites de lo que WF-10 puede hacer y lo que debe delegar siempre a las Edge Functions.

## 2. Cuándo usar este skill

Usar este skill cuando se necesite:

- implementar o revisar WF-10-CONVERSATION-ENGINE
- depurar por qué un mensaje llega al servicio incorrecto
- depurar por qué se muestra o no se muestra el menú de selección
- entender cómo se gestiona el cambio de contexto cuando hay un caso abierto
- revisar qué puede y qué no puede hacer n8n directamente

## 3. Preconditions

Antes de usar este skill, leer:

- `rules-50-conversation-routing.md` — fuente de verdad del enrutado conversacional
- `contract-tenant-features-response.md` — estructura de la respuesta de `conv-core-get-tenant-features`
- `contract-canonical-response.md` — estructura que producen los workflows de servicio
- `contract-case-state-machine.md` — estados válidos de sesión y caso

## 4. Restricciones de origen

Este skill respeta las siguientes decisiones cerradas en las rules:

- WF-10 siempre lee los servicios activos del tenant desde `conv-core-get-tenant-features` al inicio de cada ejecución. No se cachea entre ejecuciones.
- La IA clasifica la intención; WF-10 decide el enrutado. n8n no ejecuta `UPDATE` directamente sobre `conv_sessions` ni `conv_cases`.
- El menú de servicios solo muestra servicios activos para ese tenant y ese canal. No se muestran servicios del catálogo que no estén contratados.
- La confirmación explícita del usuario es obligatoria únicamente cuando hay un caso abierto en un servicio distinto y el usuario introduce un nuevo tema. En el enrutado inicial sin casos abiertos en conflicto, `active_service_code` puede actualizarse mediante EF sin confirmación previa.
- Si hay un solo servicio activo para el tenant y canal, WF-10 enruta directamente sin presentar menú.
- n8n nunca recibe `profile_id`, `phone_number`, `full_name`, `room_label` ni `assignment_id` del inquilino.

## 5. Estrategia de implementación

WF-10 tiene tres responsabilidades exclusivas:

1. **Leer el estado del tenant** — llamar a `conv-core-get-tenant-features` y obtener `TenantFeaturesResponse`.
2. **Clasificar la intención** — invocar la IA para determinar `service_code` y `confidence`, respetando los límites de PII.
3. **Decidir el enrutado** — aplicar las reglas de `rules-50-conversation-routing.md` para enrutar directamente, presentar menú o preguntar al usuario sobre el cambio de contexto.

WF-10 no implementa lógica de ningún servicio. No crea incidencias, no busca anuncios, no responde preguntas de FAQ.

## 6. Pasos recomendados

### Paso 1 — Leer los servicios activos del tenant

El primer nodo de WF-10 debe llamar a `conv-core-get-tenant-features`:

```
HTTP POST /functions/v1/conv-core-get-tenant-features
Body: { client_account_id }

Respuesta: TenantFeaturesResponse {
  services_active: ServiceActivation[],
  plan_limits: PlanLimits
}
```

Si `services_active = []` → responder al usuario con mensaje de servicio no disponible → terminar la ejecución sin procesar el mensaje.

Si `plan_limits.ai_enabled = false` → usar formulario conversacional guiado en lugar de invocar la IA para clasificar la intención.

Esta llamada no puede omitirse. Un cambio de suscripción del tenant debe reflejarse en la siguiente ejecución sin necesidad de reiniciar n8n.

### Paso 2 — Verificar casos abiertos existentes

```
Consultar conv_cases WHERE session_id = <session_id>
AND status IN ('open', 'waiting_user')
```

WF-10 recibe en el payload de entrada `session_id` y el estado actual de `conv_sessions` (incluyendo `active_case_id`, `open_cases_ids` y `active_service_code`). Usar esos campos para determinar si hay continuidad de contexto.

### Paso 3 — Clasificar la intención con la IA

Invocar Claude API con el texto del mensaje y contexto mínimo:

```
Prompt (sin PII):
  "Clasifica el siguiente mensaje de usuario para el servicio de gestión de alojamientos.
   Servicios disponibles: [lista de service_code activos del tenant].
   Mensaje: '<message_text>'
   ¿El mensaje corresponde a: conv_incidencias, conv_publicaciones, conv_ayuda?
   Responder con { service_code, confidence }."
```

Si hay un caso activo, incluir en el prompt un resumen anónimo del caso:

```
Contexto adicional:
  "El usuario tiene un caso abierto de tipo '<service_code>' con referencia '<case_ref>'.
   ¿Este mensaje continúa ese caso o introduce un tema nuevo?"
```

El resumen del caso **no debe** incluir nombre del inquilino, teléfono, residencia ni habitación.

### Paso 4 — Aplicar la lógica de enrutado

```
Lógica principal:

SI hay caso(s) abierto(s):
  SI la IA dice "continúa el caso" (confidence ≥ 0.85):
    → Llamar al WF del servicio del caso activo
    → FIN

  SI la IA dice "tema nuevo":
    → Ir al flujo de detección de intención con bandera "hay_caso_abierto = true"

SI no hay caso abierto (o tema nuevo detectado):
  1. Clasificar intención → { service_code, confidence }
  2. Si service_code no está en services_active del tenant → tratar como ambiguo (confidence = 0)

  SI confidence ≥ 0.85 Y servicio activo:
    → Actualizar active_service_code via EF
    → Llamar al WF del servicio
    → FIN

  SI confidence < 0.85 O intención ambigua:
    SI services_active tiene exactamente 1 servicio:
      → Enrutar directamente sin menú
      → FIN
    SI services_active tiene >1 servicio:
      SI hay_caso_abierto = true:
        → Añadir opción de "volver al caso pendiente" al menú
      → Presentar menú de selección
      → Esperar respuesta del usuario (estado SELECTING_SERVICE)
```

### Paso 5 — Gestionar el cambio de contexto

Cuando hay un caso abierto y el usuario introduce un tema nuevo:

```
Ejemplo: incidencia INC-2026-0042 abierta + usuario pregunta por un anuncio.

Bot al usuario:
  "Tienes una incidencia abierta (INC-2026-0042).
   ¿Quieres continuar con ella o prefieres consultar sobre la habitación disponible?
   1️⃣ Continuar con la incidencia
   2️⃣ Consultar sobre el anuncio"

Si usuario elige 2:
  → Llamar EF para actualizar active_service_code = 'conv_publicaciones'
  → El active_case_id permanece como el de incidencia (no se cambia)
  → Llamar WF-30
  → Al finalizar WF-30: recordar al usuario que tiene la incidencia pendiente
```

`active_service_code` y `active_case_id` solo se actualizan después de que el usuario confirme explícitamente. No se cambian de forma especulativa.

### Paso 6 — Generar el menú de selección

El menú se construye dinámicamente desde `TenantFeaturesResponse.services_active`:

```
"¿En qué puedo ayudarte?
  [opción por cada service_code activo para este tenant y canal]
  [si hay caso abierto: opción de volver al caso pendiente]

Responde con el número o cuéntame qué necesitas."
```

Ejemplo con tres servicios activos:
```
"¿En qué puedo ayudarte?
  1️⃣ Reportar una incidencia o avería
  2️⃣ Consultar sobre un anuncio o habitación disponible
  3️⃣ Ayuda general o consulta

Responde con el número o cuéntame qué necesitas."
```

Si el tenant solo tiene `conv_incidencias` activo, la opción 2 y la 3 no aparecen.

### Paso 7 — Invocar los workflows de servicio

WF-10 llama a WF-20, WF-30 o WF-40 por HTTP POST al webhook de n8n correspondiente:

```
POST <n8n_webhook_url>/WF-20
Body: {
  session_id,
  client_account_id,
  channel,
  message_text,
  identity_level,   ← SOLO el enum, no datos personales
  service_code: 'conv_incidencias'
}
```

WF-10 espera una `CanonicalResponse` de vuelta y actúa según `response_type`:

| `response_type` | Acción de WF-10 |
|---|---|
| `'success'` | Entregar `text` al canal vía WF-91 (WhatsApp) o WF-92 (WebChat) |
| `'pending_input'` | Entregar `text`; actualizar `conv_cases.status = 'waiting_user'` via EF |
| `'escalated'` | Notificar al admin; entregar `text` de escalada al canal |
| `'identity_required'` | Activar WF-IDENTITY; reintentar el servicio tras validación |
| `'error_handled'` | Entregar `text` genérico; estado `waiting_internal` via EF |
| `'no_service'` | Responder al usuario que el servicio no está disponible |

## 7. Datos / contratos involucrados

- `contract-tenant-features-response.md` — estructura de `TenantFeaturesResponse` que lee WF-10 al inicio
- `contract-canonical-response.md` — estructura de la respuesta que producen WF-20, WF-30, WF-40
- `contract-case-state-machine.md` — transiciones de estado; WF-10 las lee pero no las ejecuta directamente
- `conv_sessions` — `active_service_code`, `active_case_id`, `open_cases_ids`, `state`, `identity_level`
- `conv_cases` — `status` leído por WF-10 para detectar casos abiertos

## 8. Errores comunes

- **Cachear `TenantFeaturesResponse` entre ejecuciones:** si un admin desactiva un servicio, WF-10 seguiría enrutando a ese servicio hasta que n8n se reiniciara. Cada ejecución debe llamar a `conv-core-get-tenant-features`.
- **Hardcodear la lista de servicios en WF-10:** el catálogo de servicios activos es dinámico por tenant. Usar siempre la respuesta de `conv-core-get-tenant-features`.
- **Mostrar en el menú servicios del catálogo global en lugar de solo los del tenant:** el menú solo muestra los servicios que el tenant tiene contratados Y activos en ese canal.
- **Cambiar `active_service_code` sin confirmación del usuario:** cuando hay un caso abierto con intención diferente, WF-10 debe preguntar primero.
- **Ejecutar `UPDATE` sobre `conv_sessions` o `conv_cases` directamente desde n8n:** las transiciones de estado las ejecutan las EFs con `service_role`. n8n solo lee.
- **Pasar `profile_id` o `phone_number` al payload de los workflows de servicio:** n8n solo recibe `identity_level` (enum) como dato relacionado con la identidad del usuario.
- **Mezclar información de dos casos distintos en la misma respuesta:** una respuesta del bot corresponde a un único `active_case_id`.

## 9. Qué no debe hacerse

- Implementar lógica de servicio dentro de WF-10 (crear incidencias, buscar anuncios, responder FAQs).
- Ejecutar `UPDATE` directamente sobre tablas de base de datos de SmartConversations.
- Acceder a la base de datos del Core directamente desde n8n.
- Asumir un conjunto fijo de servicios sin consultar `conv-core-get-tenant-features`.
- Presentar el menú cuando hay un solo servicio activo para el tenant.
- Cambiar de contexto sin confirmación del usuario cuando hay un caso abierto.

## 10. Escenarios mínimos de prueba

1. **Tenant con un solo servicio → enrutado directo:**
   `services_active` tiene solo `conv_incidencias` → WF-10 enruta directamente sin menú, `active_service_code = 'conv_incidencias'`.

2. **Intención clara con múltiples servicios → enrutado directo:**
   `confidence = 0.92` para `conv_publicaciones`, tres servicios activos → WF-10 enruta directamente sin menú.

3. **Intención ambigua → menú:**
   `confidence = 0.55`, dos servicios activos → WF-10 presenta menú con las dos opciones.

4. **Caso abierto + misma intención → continúa el caso:**
   Caso `conv_incidencias` activo, nuevo mensaje relacionado con `confidence = 0.90` → WF-10 llama a WF-20 sin menú.

5. **Caso abierto + intención diferente → pregunta al usuario:**
   Caso `conv_incidencias` activo, nuevo mensaje de `conv_publicaciones` → WF-10 pregunta si continuar la incidencia o consultar el anuncio.

6. **`services_active = []` → mensaje de no disponible:**
   Tenant sin servicios activos → WF-10 responde "servicio no disponible" sin llamar a ningún WF de servicio.

7. **`ai_enabled = false` → formulario guiado:**
   `plan_limits.ai_enabled = false` → WF-10 usa formulario conversacional en lugar de Claude API para clasificar la intención.

8. **Cambio de contexto confirmado → `active_service_code` actualizado:**
   Usuario con caso de incidencia activo confirma que quiere consultar un anuncio → WF-10 actualiza `active_service_code = 'conv_publicaciones'` via EF y llama a WF-30.

## 11. Criterio de done

WF-10 se considera correctamente implementado cuando:

- Llama a `conv-core-get-tenant-features` al inicio de cada ejecución sin caché
- El menú solo muestra servicios activos para el tenant y canal actuales
- Hay un solo servicio activo → enruta directamente sin preguntar al usuario
- Hay caso abierto + intención diferente → pregunta al usuario antes de cambiar contexto
- `active_service_code` se actualiza solo tras confirmación explícita cuando hay un caso abierto con servicio diferente; en el enrutado inicial sin conflicto, la EF lo actualiza directamente
- Ninguna respuesta del bot mezcla información de dos casos distintos
- El resumen del caso pasado a la IA no contiene nombre, teléfono, residencia ni habitación
- n8n no ejecuta `UPDATE` directamente sobre `conv_sessions` ni `conv_cases`
- El payload enviado a los workflows de servicio no contiene `profile_id` ni `phone_number`

## 12. Documentos relacionados

- `rules-50-conversation-routing.md` — reglas del motor de enrutado
- `contract-tenant-features-response.md` — qué puede leer WF-10 del tenant
- `contract-canonical-response.md` — qué devuelven los workflows de servicio a WF-10
- `contract-case-state-machine.md` — estados de sesión y caso que WF-10 lee
- `skill-n8n-incidents-workflow.md` — implementación de WF-20
- `skill-ai-usage-boundaries.md` — qué puede y no puede recibir la IA en los prompts de WF-10
- `rules-02-project-structure-and-addons.md` — convención de ubicación de workflows bajo `automations_n8n/<addon-name>/`

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`
