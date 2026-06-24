# Skill — Límites de Uso de la IA

## 1. Objetivo

Este skill explica qué puede y qué no puede recibir el proveedor de IA (Claude API), cómo usar el mecanismo de marcadores para que la IA genere texto sin tener acceso a datos personales, cómo se clasifican intenciones y se extraen entidades, y qué ocurre cuando la IA falla o devuelve baja confianza.

## 2. Cuándo usar este skill

Usar este skill cuando se necesite:

- preparar un prompt para clasificar la intención del usuario en WF-10
- preparar un prompt para extraer datos en WF-20, WF-30 o WF-40
- entender por qué la IA no puede recibir determinados campos
- implementar el mecanismo de marcadores y la sustitución posterior
- implementar el comportamiento de fallback cuando la IA falla o da baja confianza
- auditar un prompt existente para verificar que no incluye PII

## 3. Preconditions

Antes de usar este skill, leer:

- `rules-80-data-and-privacy.md` — política de PII; define qué recibe cada capa del sistema
- `rules-50-conversation-routing.md` — cómo WF-10 usa la clasificación de intención
- `contract-canonical-response.md` — campo `text` sin marcadores; la sustitución ocurre antes de construir la respuesta

## 4. Restricciones de origen

Este skill respeta las siguientes decisiones cerradas en las rules:

- La IA nunca determina si un usuario es inquilino activo, válido o autorizado. Esa responsabilidad es exclusiva de `conv-core-validate-identity`.
- La IA nunca recibe `profile_id`, `phone_number`, `full_name` (del inquilino), `room_label`, `assignment_id`, datos de contrato ni historial de pagos.
- La sustitución de marcadores (`{incident_ref}`, `{lead_ref}`, `{due_date}`, `{amount}`, `{bot_name}`) la realiza la EF después de que la IA haya generado el texto base.
- Si la IA falla o devuelve baja confianza, el sistema tiene un fallback definido y no expone el error al usuario.

## 5. Estrategia de implementación

El uso de la IA en SmartConversations se divide en tres roles:

1. **Clasificación de intención** — WF-10 invoca la IA para determinar `service_code` y `confidence`.
2. **Extracción de entidades** — WF-20/30/40 invocan la IA para extraer datos del texto libre del usuario (tipo de incidencia, nombre de residencia, habitación, etc.).
3. **Generación de respuestas** — WF-20/30/40 invocan la IA para redactar la respuesta al usuario usando marcadores en lugar de datos reales.

## 6. Pasos recomendados

### Paso 1 — Entender la tabla de PII por capa

La fuente de verdad está en `rules-80-data-and-privacy.md`. Resumen para uso en prompts:

| La IA puede recibir | La IA NO puede recibir |
|---|---|
| `message_text` (texto del usuario) | `profile_id` |
| Resumen anónimo del caso (`service_code`, `case_ref`) | `phone_number` |
| Datos públicos de anuncios (precio, fecha, condiciones generales, identificador público de habitación ofertada) | `full_name` del inquilino registrado en el Core |
| Texto de la base de conocimiento (FAQ) | `room_label` del contrato de tenencia del inquilino |
| Últimas N interacciones del thread **sanitizadas** (ver nota) | `assignment_id`, `accommodation_id` |
| `identity_level` (enum, no PII) | Datos de contrato, historial de pagos |

**Distinción sobre `room_label`:**

- `room_label` **del contrato de tenencia** (p.ej. el identificador de la habitación que ocupa un inquilino concreto, vinculado a su asignación): es dato sensible y **nunca** puede ir en un prompt de IA.
- **Identificador público de una habitación ofertada en un anuncio** (p.ej. "Habitación 204" que aparece en la descripción del listing disponible para cualquier visitante): es un dato de listing público y **puede** incluirse en los prompts de `conv_publicaciones`.

**Nota sobre el historial del thread:** si se reinyectan interacciones anteriores como contexto, deben ir sanitizadas:
- Solo los mensajes del usuario (`sender_type = 'user'`). Los mensajes del bot pueden contener valores reales inyectados por EFs (números de incidencia, importes, fechas), por lo que no deben pasarse al proveedor de IA tal cual.
- Si se incluye alguna respuesta del bot como contexto, sustituir los valores reales inyectados por sus marcadores de origen (`INC-2026-0042` → `{incident_ref}`) o omitirlos.
- La IA no debe recibir historial que contenga datos sensibles recuperados del Core e inyectados previamente por la capa de EFs.

**`message_text` puede contener PII escrita por el usuario** ("Me llamo Juan, habitación 204"). Esto es inevitable en un sistema de chat. La IA extrae entidades del texto pero no las almacena ni las reenvía a terceros.

### Paso 2 — Prompts de clasificación de intención (WF-10)

El prompt de clasificación debe incluir:

- La lista de `service_code` activos para el tenant (extraída de `TenantFeaturesResponse`).
- El texto del mensaje del usuario (`message_text`).
- Opcionalmente, el `service_code` y un resumen anónimo del caso activo (sin nombre ni habitación).

```
Prompt de clasificación:
"Clasifica el siguiente mensaje en uno de los servicios disponibles.
Servicios disponibles: [conv_incidencias, conv_ayuda]
Mensaje: '<message_text>'
Responde con JSON: { service_code: string, confidence: number }
Si el mensaje no encaja claramente en ningún servicio, usa confidence < 0.5."
```

El threshold de enrutado directo es 0.85 (configurable por tenant). Si `confidence < 0.85`, WF-10 presenta el menú.

### Paso 3 — Prompts de extracción de entidades (WF-20/30/40)

La IA extrae datos del texto libre del usuario para estructurarlos:

```
Prompt de extracción para WF-20:
"Del siguiente mensaje, extrae:
- tipo_incidencia: uno de [mantenimiento, ruido, seguridad, facturación, otro]
- descripcion: descripción breve del problema (máximo 200 caracteres)
- urgente: true | false

Mensaje: '<message_text>'
Responde con JSON. Si algún campo no puede determinarse, usa null."
```

Los datos no sensibles extraídos (p.ej. `tipo_incidencia`, `descripcion`, `urgente`) pueden almacenarse en variables de contexto de n8n para el turno actual. **Los datos de identidad que la IA extrae del `message_text` (p.ej. nombres, residencias, habitaciones) nunca deben persistirse en variables estructuradas de n8n; deben pasarse inmediatamente a una EF que los persista en `conv_sessions.identity_data` y devuelva únicamente un flag booleano.** Si el usuario ya dio un dato no sensible en un turno anterior, no volver a pedirlo.

### Paso 4 — Generación de respuestas con marcadores

Cuando la IA debe generar texto que incluirá datos específicos del usuario (número de incidencia, fecha, importe), debe usar marcadores en lugar de los valores reales:

**Prompt para WF-20 (respuesta tras crear incidencia):**
```
"Redacta una respuesta cordial confirmando que la incidencia ha sido registrada.
Contexto:
- Tipo de incidencia: <tipo_incidencia>
- Urgente: <urgente>
- El número de referencia será insertado después de la generación.

Instrucciones:
- Usa el marcador {incident_ref} para el número de referencia.
- Incluye el tiempo de respuesta estimado según urgencia.
- Tono: profesional y tranquilizador.
- Máximo 3 frases."
```

La IA genera:
```
"Tu incidencia de mantenimiento ha sido registrada con el número {incident_ref}.
El equipo te atenderá en las próximas 24 horas.
Te notificaremos cuando esté en curso."
```

La EF sustituye `{incident_ref}` con `INC-2026-0042` **después** de que la IA genera el texto y **antes** de construir la `CanonicalResponse`.

### Paso 5 — Marcadores disponibles

| Marcador | Valor real que sustituye | EF responsable de la sustitución |
|---|---|---|
| `{incident_ref}` | Referencia de incidencia (`INC-2026-NNNN`) | EF que llama a `conv-core-create-incident` |
| `{lead_ref}` | Referencia de lead (`LEAD-2026-NNNN`) | EF que llama a `conv-core-create-lead` |
| `{due_date}` | Fecha de vencimiento de pago | EF que lee datos del Core |
| `{amount}` | Importe de pago | EF que lee datos del Core |
| `{bot_name}` | Nombre del asistente configurado por el tenant | EF que lee `conv_wc_configs` o `conv_wa_sessions` |

Un `text` en `CanonicalResponse` nunca puede contener marcadores sin sustituir. Si la EF detecta un marcador sin sustituir, debe sustituirlo con un texto de fallback genérico o escalar.

### Paso 6 — Fallback cuando la IA falla o da baja confianza

**Caso 1: La IA no está disponible (error de red, timeout, HTTP 5xx de Claude API):**

```
Comportamiento:
- Si plan_limits.ai_enabled = true pero el proveedor falla → usar formulario guiado
- El formulario presenta opciones numeradas al usuario en lugar de procesar texto libre
- No exponer el error al usuario

Respuesta de fallback:
"Estoy teniendo dificultades técnicas. ¿Puedes elegir una opción?
1️⃣ Reportar un problema de mantenimiento
2️⃣ Reportar ruido o convivencia
3️⃣ Otro tipo de incidencia"
```

**Caso 2: La IA devuelve confianza insuficiente en clasificación de intención (`confidence < 0.85`):**

```
→ Si 1 servicio activo: enrutar directamente sin menú (confidence irrelevante)
→ Si >1 servicio activo: presentar menú de selección
```

**Caso 3: La IA devuelve confianza insuficiente en extracción de entidades:**

```
→ Pedir al usuario que confirme o aclare el dato
→ No asumir el valor extraído si confidence < 0.7
```

**Caso 4: La IA genera texto con marcadores sin sustituir (error de generación):**

```
→ La EF detecta el patrón {variable} en el texto generado
→ Sustituir con texto de fallback: "[referencia pendiente]"
→ Log de advertencia para auditoría
→ No bloquear la respuesta al usuario
```

### Paso 7 — Auditar prompts existentes

Checklist para verificar que un prompt cumple la política de PII:

- [ ] ¿El prompt incluye `profile_id`? → No permitido.
- [ ] ¿El prompt incluye `phone_number`? → No permitido.
- [ ] ¿El prompt incluye `full_name` del Core (nombre del perfil registrado)? → No permitido.
- [ ] ¿El prompt incluye `room_label` del contrato de tenencia del inquilino? → No permitido.
- [ ] ¿El prompt incluye el identificador público de una habitación ofertada en un listing? → Permitido como dato público de anuncio.
- [ ] ¿El prompt incluye `assignment_id` o `accommodation_id`? → No permitido.
- [ ] ¿El workflow almacena en variables de n8n datos de identidad extraídos por la IA (`full_name`, `residence_name`, `room_label` de tenencia)? → No permitido; delegar a EF que persista en `conv_sessions.identity_data`.
- [ ] ¿El prompt incluye datos de contrato o historial de pagos? → No permitido.
- [ ] ¿El prompt usa `identity_level` (enum)? → Permitido.
- [ ] ¿El prompt usa `message_text`? → Permitido, con conciencia de que puede contener PII del usuario.
- [ ] ¿Las referencias a recursos del Core usan marcadores en lugar de valores reales? → Obligatorio.

## 7. Datos / contratos involucrados

- `rules-80-data-and-privacy.md` — tabla definitiva de qué recibe cada capa
- `contract-canonical-response.md` — el campo `text` debe tener todos los marcadores sustituidos
- `contract-tenant-features-response.md` — `plan_limits.ai_enabled` controla si la IA puede invocarse

## 8. Errores comunes

- **Incluir `profile_id` en el prompt por comodidad:** aunque facilita la redacción, es una violación de la política de PII. Usar siempre marcadores.
- **No sustituir los marcadores antes de construir `CanonicalResponse`:** el campo `text` en `CanonicalResponse` debe estar completamente limpio. Un marcador sin sustituir es un error de validación.
- **Usar la IA para determinar si el usuario es inquilino activo:** la IA puede decir "el usuario afirma ser el inquilino de la habitación 204", pero nunca puede confirmar que esa afirmación es verdadera. Solo `conv-core-validate-identity` puede hacerlo.
- **No implementar el fallback cuando la IA no está disponible:** un sistema que depende completamente de la IA sin fallback se rompe ante cualquier interrupción del proveedor.
- **Incluir todo el historial de mensajes como contexto:** usar solo las últimas N interacciones necesarias para la tarea inmediata. El historial completo puede incluir PII acumulada.
- **Pasar respuestas previas del bot sin sanitizar:** los mensajes que el bot ya envió pueden contener valores reales inyectados por EFs (referencias de incidencia, importes, fechas del Core). Esos valores nunca debieron llegar a la IA y no deben llegar tampoco si se reinyectan como historial. Sanitizar sustituyendo por los marcadores de origen o excluyendo esas respuestas del contexto.

## 9. Qué no debe hacerse

- Usar la IA para validar identidad, determinar nivel de acceso o autorizar operaciones.
- Incluir en los prompts datos del resultado de `conv-core-validate-identity` distintos de `identity_level`.
- Confiar en la respuesta de la IA sin threshold de confianza para operaciones que crean recursos en el Core.
- Reenviar el texto generado por la IA con marcadores sin sustituir al canal de mensajería.
- Almacenar los prompts completos en logs en producción (pueden contener `message_text` con PII del usuario).

## 10. Escenarios mínimos de prueba

1. **Clasificación clara → confidence alta:**
   Mensaje "se ha roto el grifo del baño" → IA devuelve `{ service_code: 'conv_incidencias', confidence: 0.95 }` → enrutado directo.

2. **Clasificación ambigua → confidence baja → menú:**
   Mensaje "necesito ayuda" con dos servicios activos → `confidence = 0.45` → menú de selección presentado al usuario.

3. **Extracción de entidades → JSON estructurado:**
   Mensaje "hay un goteo en la cocina desde ayer, no es urgente" → `{ tipo_incidencia: 'mantenimiento', descripcion: 'goteo en la cocina', urgente: false }`.

4. **Generación con marcadores → sustitución correcta:**
   IA genera "Tu incidencia {incident_ref} ha sido registrada." → EF sustituye → `CanonicalResponse.text` = "Tu incidencia INC-2026-0042 ha sido registrada."

5. **IA no disponible → formulario guiado:**
   Claude API devuelve timeout → el sistema presenta opciones numeradas al usuario sin exponer el error.

6. **`ai_enabled = false` → formulario guiado desde el inicio:**
   `plan_limits.ai_enabled = false` → WF-10 no llama a Claude API; usa menú y formulario en todos los flujos.

7. **Prompt auditado → sin PII:**
   Revisión del prompt de WF-20: no contiene `profile_id`, `phone_number`, `full_name` del Core ni `assignment_id`.

## 11. Criterio de done

El uso de la IA se considera correctamente implementado cuando:

- Ningún prompt incluye `profile_id`, `phone_number`, `full_name` del Core, `room_label` del contrato ni `assignment_id`
- Los textos que incluyen referencias de recursos del Core usan marcadores (`{incident_ref}`, etc.)
- La sustitución de marcadores ocurre en la EF, antes de construir `CanonicalResponse`
- El campo `text` de `CanonicalResponse` nunca contiene marcadores sin sustituir
- El fallback cuando la IA no está disponible no expone el error al usuario
- `plan_limits.ai_enabled = false` deshabilita todas las llamadas al proveedor de IA para ese tenant

## 12. Documentos relacionados

- `rules-80-data-and-privacy.md` — política de PII; tabla definitiva de qué recibe cada capa
- `contract-canonical-response.md` — el campo `text` debe estar completamente sustituido
- `rules-50-conversation-routing.md` — clasificación de intención con threshold de confianza
- `skill-n8n-incidents-workflow.md` — ejemplos de extracción de entidades en WF-20
- `skill-n8n-conversation-engine.md` — clasificación de intención en WF-10

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`
