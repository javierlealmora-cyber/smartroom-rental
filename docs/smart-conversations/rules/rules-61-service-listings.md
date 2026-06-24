# rules-61-service-listings.md — SmartConversations: Servicio de Gestión de Publicaciones

## 1. Propósito

Este documento define las reglas que gobiernan el servicio `conv_publicaciones`: qué información de un anuncio se considera pública, qué no puede revelarse, cómo funciona la búsqueda de anuncios, cuándo y cómo se crea un lead, y la contribución del servicio al activity log de SmartRoom Core.

Este servicio es el único del add-on que puede ser usado por usuarios sin ninguna relación de tenencia con el tenant.

---

## 2. Alcance

Este documento aplica a:

- n8n WF-30-INFO-ANUNCIO
- EF `conv-core-lookup-listing` (búsqueda de anuncios en SmartRoom Core)
- EF `conv-core-create-lead` (creación de lead en SmartRoom Core)
- Tabla `conv_cases` para casos de tipo `lead`
- Acceso de nivel `UNVERIFIED_LEAD`

---

## 3. Decisiones No Negociables

1. **`UNVERIFIED_LEAD` puede usar este servicio.** No se requiere tenencia activa ni ningún nivel de identidad previo para consultar anuncios o registrar interés.

2. **La información de anuncios revelada a usuarios externos se limita a datos públicos.** Precio, fecha de disponibilidad, condiciones generales e imágenes son públicos. Datos de ocupantes actuales, historial de ocupación e información contractual no son públicos y nunca deben revelarse.

3. **La IA solo recibe datos públicos del anuncio para redactar respuestas.** La IA nunca recibe datos de inquilinos actuales, historial de ocupación ni detalles contractuales del anuncio.

4. **Para crear un lead se requieren datos mínimos de contacto.** Nombre completo (obligatorio) + teléfono o email (al menos uno obligatorio). Si el usuario ya proporcionó estos datos en la sesión, deben reutilizarse sin volver a solicitarlos.

5. **`conv-core-lookup-listing` es la única fuente de verdad sobre disponibilidad.** La disponibilidad no puede asumirse ni deducirse por la IA.

6. **Un anuncio no disponible (`is_available = false`) no implica que no se pueda registrar interés futuro.** WF-30 debe ofrecer la opción de registrar interés para futura disponibilidad.

---

## 4. Reglas Obligatorias

### 4.1 Acceso por nivel de identidad

| Nivel | Puede consultar anuncio | Puede crear lead | Información accesible |
|---|---|---|---|
| `STRONG_MATCH_ACTIVE` | Sí | Sí | Datos públicos del anuncio |
| `PARTIAL_MATCH_ACTIVE` | Sí | Sí | Datos públicos del anuncio |
| `MATCH_INACTIVE` | Sí | Sí | Datos públicos del anuncio |
| `NO_MATCH` | Sí | Sí (con datos de contacto) | Datos públicos del anuncio |
| `UNVERIFIED_LEAD` | Sí | Sí (con datos de contacto) | Datos públicos del anuncio |

En todos los casos, los datos no públicos (ocupantes actuales, historial, contratos) están prohibidos.

### 4.2 Información pública de un anuncio

Datos que pueden compartirse con cualquier nivel de identidad:

| Campo | Descripción |
|---|---|
| `price_monthly` | Precio mensual del alquiler |
| `availability_date` | Fecha de disponibilidad |
| `conditions_summary` | Condiciones generales del contrato (resumen) |
| `images_count` | Número de imágenes disponibles |
| `room_label` | Identificador de la habitación (ej: "204-A") |
| `accommodation_name` | Nombre de la residencia |

Datos que nunca deben revelarse:

| Campo | Motivo |
|---|---|
| Nombre del inquilino actual | Privacidad del inquilino |
| Historial de ocupación | Dato sensible no relevante para leads |
| Condiciones contractuales completas | Solo para inquilinos con contrato firmado |
| Datos de pago pendiente del ocupante anterior | Confidencialidad |

### 4.3 Búsqueda de anuncios

WF-30 puede buscar anuncios mediante `conv-core-lookup-listing` usando uno o varios de los siguientes criterios:

- `reference`: referencia directa del anuncio (cadena exacta)
- `residence_name`: nombre de la residencia
- `room_features`: filtros de precio, tipo de habitación

La búsqueda puede devolver múltiples resultados. Si devuelve más de 3 resultados, WF-30 debe presentar un resumen breve y pedir al usuario que concrete su búsqueda.

Si `conv-core-lookup-listing` devuelve una lista vacía, WF-30 debe responder: "No encontré anuncios que coincidan con lo que buscas. ¿Puedes darme más detalles sobre la residencia o las características?"

### 4.4 Flujo de WF-30 según disponibilidad del anuncio

**Rama A — Anuncio disponible (`is_available = true`):**

```
1. IA extrae referencia, residencia y características del mensaje del usuario
2. EF conv-core-lookup-listing con criterios extraídos
3. Si no encontrado → preguntar al usuario (máximo 1 vuelta adicional)
4. IA redacta respuesta con datos públicos: precio, disponibilidad, condiciones generales, fotos
   (La IA solo recibe datos públicos del anuncio, no datos de inquilinos)
5. Detectar intención comercial: "¿quieres visitar?", "¿cuándo puedes?", "¿cómo reservo?"
6. Si interés confirmado:
   a. Si el usuario ya tiene datos de contacto en conv_sessions → reutilizar
   b. Si no → solicitar: nombre completo (obligatorio) + teléfono O email (obligatorio)
   c. EF conv-core-create-lead con { listing_id, contact: { name, phone?, email? }, message, source, conv_case_id }
   d. EF publica conv_lead_created al activity log del Core
   e. UPDATE conv_cases.case_ref_id = lead_id, status='resolved'
   f. Responder con confirmación: "Tu interés ha sido registrado. El equipo se pondrá en contacto contigo."
```

**Rama B — Anuncio no disponible (`is_available = false`):**

```
1. (Mismos pasos 1-3 que Rama A)
4. Informar: "Esta habitación no está disponible actualmente."
5. Ofrecer dos opciones:
   (1) Registrar interés para futura disponibilidad
   (2) Ver otras habitaciones disponibles del mismo alojamiento
6. Si usuario elige (1):
   a. Solicitar datos de contacto mínimos (si no están en sesión)
   b. EF conv-core-create-lead con { interest_type: 'future', listing_id, contact, source, conv_case_id }
   c. Responder: "Hemos registrado tu interés. Te avisaremos cuando esté disponible."
7. Si usuario elige (2):
   a. Re-llamar conv-core-lookup-listing con { accommodation_id } para buscar habitaciones disponibles
   b. Presentar resultados disponibles del mismo alojamiento
   c. Continuar Rama A con el nuevo anuncio seleccionado
```

### 4.5 Datos mínimos para crear un lead

| Dato | Obligatorio | Notas |
|---|---|---|
| `name` | Sí (siempre) | Nombre completo del interesado |
| `phone` | Sí (si no hay email) | Al menos uno de teléfono o email |
| `email` | Sí (si no hay teléfono) | Al menos uno de teléfono o email |
| `listing_id` | Sí | Del anuncio de interés |
| `source` | Sí | `'whatsapp'` o `'webchat'` |
| `conv_case_id` | Sí | Referencia al caso del add-on |

Si el usuario ya tiene estos datos en `conv_sessions.identity_data` o fue identificado con `STRONG_MATCH_ACTIVE`, los datos del perfil validado deben reutilizarse como datos de contacto del lead.

> **Captura de datos de contacto — responsabilidad de la EF, no de n8n.** WF-30 puede solicitar al usuario su nombre, teléfono y email como mensajes de conversación, y pasar el texto resultante a la IA para clasificar la intención. Sin embargo, WF-30 **nunca debe extraer estos campos del texto del usuario y persistirlos como variables tipadas de n8n** (`name`, `phone`, `email`). La extracción estructurada de estos datos de PII es responsabilidad exclusiva de `conv-core-create-lead`: la EF recibe el contexto de la sesión y el texto conversacional, extrae los campos en un entorno controlado y los persiste internamente. Los campos de PII extraídos nunca se devuelven a n8n como campos tipados.

### 4.6 Comportamiento cuando el anuncio no existe

Si `conv-core-lookup-listing` no encuentra ningún anuncio para los criterios proporcionados:
- WF-30 responde: "No encuentro ese anuncio. ¿Puedes indicarme la referencia exacta o el nombre de la residencia?"
- WF-30 puede hacer una segunda búsqueda con criterios más amplios (solo `residence_name` sin `room_features`).
- Tras dos búsquedas sin resultado, WF-30 responde: "No encontré habitaciones disponibles con esas características. ¿Quieres que te conecte con el equipo para que te asesoren?"

### 4.7 Reutilización de datos de contacto de la sesión

Si la sesión ya tiene datos de contacto válidos (porque el usuario los proporcionó antes o fue identificado como `STRONG_MATCH_ACTIVE`), WF-30 no debe volver a solicitarlos:

```
Si conv_sessions.identity_level = STRONG_MATCH_ACTIVE:
  → Usar profile.full_name y profile.phone del Core como datos de contacto del lead
  → No preguntar al usuario

Si conv_sessions.identity_data contiene name + (phone o email):
  → Preguntar confirmación: "¿Quieres que registre tu interés con estos datos: [nombre], [contacto]?"
  → Si confirma → usar esos datos
  → Si corrige → actualizar conv_sessions.identity_data y usar los nuevos
```

### 4.8 Contribución al activity log del Core

| Evento | Publicado por | Cuándo |
|---|---|---|
| `conv_case_created` | EF `conv-core-create-lead` | Se inserta una fila real en `conv_cases` para este servicio, además de `conv_lead_created` |
| `conv_lead_created` | EF `conv-core-create-lead` | Lead creado con éxito en Core (disponible o futuro) |
| `conv_case_escalated` | EF `conv-escalate-case` | Usuario solicita hablar con el equipo |
| `conv_case_closed` | EF `conv-close-case` | Caso de tipo `lead` cerrado o resuelto |

**Nota sobre `conv_case_created`:** si el flujo de este servicio inserta una fila real en `conv_cases` para registrar un lead, debe publicarse también `conv_case_created`, además de `conv_lead_created`. `conv_case_created` no sustituye a este evento; se publica en paralelo. Véase `rules-75-activity-log.md` §4.2 para la regla completa.

Véase `rules-75-activity-log.md` para los payloads exactos.

---

## 5. Casos Permitidos

- Un usuario anónimo (`UNVERIFIED_LEAD`) que consulta un anuncio y registra su interés con nombre y teléfono.
- Un usuario con `STRONG_MATCH_ACTIVE` cuyo nombre y teléfono del perfil se usan automáticamente como datos del lead sin solicitarlos de nuevo.
- Un anuncio no disponible para el que WF-30 ofrece registrar interés futuro o ver otras habitaciones.
- Una segunda búsqueda con criterios más amplios cuando la primera no devuelve resultados.
- Un lead con `interest_type = 'future'` creado para un anuncio actualmente no disponible.

---

## 6. Casos Prohibidos

- Revelar nombre del inquilino actual, historial de ocupación o datos contractuales de la habitación a cualquier nivel de identidad.
- Proporcionar a la IA datos de inquilinos, historial de ocupación o condiciones contractuales detalladas.
- Crear un lead sin nombre completo o sin al menos teléfono o email.
- Asumir disponibilidad de una habitación sin consultar `conv-core-lookup-listing`.
- Reutilizar datos de contacto de la sesión sin ofrecer al usuario la opción de corregirlos.
- Publicar `conv_lead_created` antes de que `conv-core-create-lead` devuelva con éxito.

---

## 7. Impacto en el Diseño

- WF-30 no requiere validación de identidad previa. Puede ejecutarse con cualquier nivel de identidad, incluido `UNVERIFIED_LEAD`.
- Los datos de contacto del lead se obtienen en este orden de precedencia: (1) perfil validado del Core, (2) `conv_sessions.identity_data`, (3) solicitud explícita al usuario.
- La lógica de las Ramas A y B es un fork en el mismo WF-30, no workflows separados.

---

## 8. Impacto en la Implementación

- `conv-core-create-lead` debe incluir `conv_case_id` para trazabilidad entre el caso del add-on y el lead del Core.
- La respuesta de `conv-core-create-lead` incluye `lead_ref` (ej: `LEAD-2026-0015`). WF-30 puede incluirlo en la confirmación al usuario; la EF lo inyecta después de la generación de texto por IA.
- Si `conv-core-create-lead` falla con 5xx, WF-30 guarda el caso en `conv_cases` con status `'waiting_internal'` y escala a admin. El usuario recibe un mensaje genérico de "tu interés ha sido registrado".

---

## 9. Dependencias

- `rules-00-scope-and-principles.md` — principio P5 (IA no valida)
- `rules-40-identity-validation.md` — definición de `UNVERIFIED_LEAD` y acceso de nivel bajo
- `rules-70-integration-api.md` — contratos de `conv-core-lookup-listing` y `conv-core-create-lead`
- `rules-75-activity-log.md` — eventos `conv_case_created`, `conv_lead_created`, `conv_case_escalated`
- `rules-80-data-and-privacy.md` — restricciones de datos públicos vs privados del anuncio
- `contract-canonical-response.md` — estructura de la respuesta de WF-30 hacia WF-10

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-150-advertisement-service.md`
- `REQ-SC-160-advertisement-whatsapp-channel-integration.md`
- `REQ-SC-170-advertisement-chatbot-channel-integration.md`

---

## 10. Checklist de Validación

- [ ] `UNVERIFIED_LEAD` puede consultar anuncios y registrar leads sin validación de identidad
- [ ] La IA solo recibe datos públicos del anuncio (precio, disponibilidad, condiciones generales, fotos)
- [ ] Los leads se crean con nombre completo + al menos teléfono o email
- [ ] Los datos de contacto de la sesión se reutilizan sin volver a solicitarlos
- [ ] Un anuncio no disponible ofrece interés futuro o alternativas del mismo alojamiento
- [ ] `conv_lead_created` se publica solo tras respuesta exitosa de `conv-core-create-lead`
- [ ] Los errores 5xx de `conv-core-create-lead` guardan el caso y escalan; no se expone el error al usuario
- [ ] Nunca se revela información de ocupantes actuales ni historial de ocupación

---

## 11. Notas de Control de Cambios

Si se añaden nuevos campos a `conv-core-lookup-listing` que sean sensibles (datos de inquilinos, historial), deben declararse explícitamente como no públicos en este documento antes de que se exponga la respuesta al usuario o la IA.

Cambiar los datos mínimos para crear un lead requiere actualizar simultáneamente este documento, el contrato de `conv-core-create-lead` en `rules-70-integration-api.md` y la lógica de WF-30.
