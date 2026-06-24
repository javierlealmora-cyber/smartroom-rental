# Skill — Workflow de Incidencias en n8n (WF-20)

## 1. Objetivo

Este skill explica cómo implementar WF-20-INCIDENCIA en n8n: el workflow que gestiona el ciclo completo de una incidencia desde la recogida de datos hasta la creación oficial en SmartRoom Core. Cubre también el sub-workflow WF-IDENTITY para la validación de identidad, la gestión de pre-incidencias, el escalado y la construcción de la `CanonicalResponse` final.

## 2. Cuándo usar este skill

Usar este skill cuando se necesite:

- implementar o revisar WF-20-INCIDENCIA
- implementar o revisar WF-IDENTITY (sub-workflow de validación progresiva)
- depurar por qué una incidencia no llega al Core
- depurar el flujo de escalado por identidad insuficiente
- entender cómo se construye la `CanonicalResponse` para cada resultado posible

## 3. Preconditions

Antes de usar este skill, leer:

- `rules-60-service-incidents.md` — fuente de verdad del servicio de incidencias
- `rules-40-identity-validation.md` — niveles de identidad y flujo progresivo
- `contract-canonical-response.md` — estructura de la respuesta que WF-20 debe producir
- `contract-identity-validation-result.md` — estructura del resultado de validación de identidad
- `contract-case-state-machine.md` — transiciones de estado de `conv_cases`

## 4. Restricciones de origen

Este skill respeta las siguientes decisiones cerradas en las rules:

- Crear una incidencia oficial en el Core requiere `STRONG_MATCH_ACTIVE`. Ninguna configuración puede anular este requisito.
- Con `PARTIAL_MATCH_ACTIVE` solo se puede crear una pre-incidencia en `conv_cases` (no en el Core).
- Con `MATCH_INACTIVE`, WF-20 escala al admin sin crear ningún registro de incidencia.
- Con `NO_MATCH`, WF-20 activa WF-IDENTITY si quedan intentos disponibles. Solo escala si la identidad sigue sin resolverse tras los intentos permitidos.
- Los reintentos de `conv-core-create-incident` en caso de 5xx se gestionan con backoff exponencial en la EF (1s → 5s → 30s, máximo 3 intentos). `conv_send_queue` no interviene en estos reintentos.
- n8n no ejecuta `UPDATE` directamente sobre `conv_sessions` ni `conv_cases`. Las transiciones de estado las realizan las EFs.

## 5. Estrategia de implementación

WF-20 tiene cuatro ramas según el nivel de identidad y el resultado de las operaciones con el Core:

1. **`STRONG_MATCH_ACTIVE`** — flujo nominal: recoger datos, crear incidencia oficial en Core, responder con `case_ref`.
2. **`PARTIAL_MATCH_ACTIVE`** — flujo de pre-incidencia: recoger datos, crear pre-incidencia en `conv_cases`, esperar mejora de identidad o escalado.
3. **`MATCH_INACTIVE`** — escalado inmediato al admin sin crear ningún registro de incidencia.
4. **`NO_MATCH`** — activar WF-IDENTITY para identificación progresiva; escalar solo si todos los intentos fallan.
5. **Fallo del Core tras 3 reintentos** — crear pre-incidencia en `conv_cases` con `status='waiting_internal'` y escalar.

## 6. Pasos recomendados

### Paso 1 — Verificar el nivel de identidad al inicio

WF-20 recibe en su payload de entrada: `{ session_id, client_account_id, channel, message_text, identity_level }`.

```
SI identity_level = 'MATCH_INACTIVE':
  → Responder: "Tu estancia ha finalizado. Puedo ponerte en contacto con el administrador."
  → Llamar conv-escalate-case vía EF
  → Construir CanonicalResponse { response_type: 'escalated', escalation_reason: 'identity_unresolved' }
  → FIN

SI identity_level = 'NO_MATCH':
  → Activar WF-IDENTITY (identificación progresiva si quedan intentos disponibles)
  → Si resultado = STRONG_MATCH_ACTIVE → continuar con flujo nominal
  → Si resultado = PARTIAL_MATCH_ACTIVE → continuar con flujo de pre-incidencia
  → Si resultado = MATCH_INACTIVE → escalar (estancia finalizada)
  → Si resultado = NO_MATCH tras los intentos permitidos → escalar
  → FIN si se escala

SI identity_level IN ('STRONG_MATCH_ACTIVE', 'PARTIAL_MATCH_ACTIVE'):
  → Continuar con la recogida de datos
```

### Paso 2 — Recoger los datos de la incidencia

WF-20 debe obtener del usuario:

1. **Tipo de problema** — "¿Cuál es el tipo de problema? Elige: mantenimiento, ruido, seguridad, facturación u otro."
2. **Descripción breve** — "Describe brevemente el problema."
3. **Urgencia** — "¿Es urgente? (sí / no)"

La IA extrae y clasifica estos datos del texto libre del usuario. Por cada dato faltante, WF-20 vuelve al usuario con una pregunta específica. El workflow persiste los datos recogidos en n8n (variable de contexto del workflow) para no volver a pedirlos si el usuario envía un nuevo mensaje relacionado.

Construir `CanonicalResponse { response_type: 'pending_input', needs_more_input: true, next_state: 'waiting_user' }` mientras faltan datos.

### Paso 3 — Crear la incidencia según el nivel de identidad

**Si `identity_level = 'STRONG_MATCH_ACTIVE'`:**

WF-20 llama a la EF `conv-core-create-incident`. El contrato de la llamada (definido en `rules-70-integration-api.md` §4.4) requiere los siguientes campos:

```
WF-20 envía a la EF:
{
  session_id,          ← la EF lee profile_id y room_id de conv_sessions con service_role
  client_account_id,
  incident_type,       ← 'maintenance' | 'security' | 'noise' | 'billing' | 'other'
  urgency,             ← 'low' | 'medium' | 'high'  (NO es un boolean)
  description,
  source,              ← 'whatsapp' | 'webchat'
  conv_case_id         ← UUID del caso en conv_cases creado previamente
}

La EF enriquece internamente la llamada al Core:
  Lee profile_id y room_id de conv_sessions.profile_id y conv_sessions.identity_data
  Llama al Core con: { client_account_id, profile_id, room_id, description,
                       incident_type, urgency, source, conv_case_id }

profile_id y room_id NO los pasa WF-20; los lee la EF de conv_sessions.
```

Tratamiento de errores (implementado en la EF, no en n8n):
```
  - HTTP 200 → incident_id + incident_ref ('INC-2026-NNNN') + estimated_response_hours
  - HTTP 400/403/404/422 → error no recuperable; WF-20 recibe el error y responde al usuario
  - HTTP 5xx → backoff exponencial: 1s → 5s → 30s, máximo 3 intentos
    Si los 3 intentos fallan:
      → La EF actualiza conv_cases.status = 'waiting_internal'
      → La EF llama a conv-escalate-case
      → WF-20 recibe el error y construye response_type='error_handled'
```

Si la creación tiene éxito, según `rules-60-service-incidents.md` §4.5, el caso pasa a `status='waiting_internal'` (incidencia enviada al Core; en espera de respuesta del equipo). WF-20 construye la `CanonicalResponse`:
```json
{
  "session_id": "<uuid>",
  "service_code": "conv_incidencias",
  "response_type": "success",
  "text": "Tu incidencia INC-2026-0042 ha sido registrada. Tiempo de respuesta estimado: 24 horas.",
  "next_state": "waiting_internal",
  "case_id": "<uuid>",
  "case_ref": "INC-2026-0042"
}
```

**Si `identity_level = 'PARTIAL_MATCH_ACTIVE'`:**

No llamar al Core. Crear pre-incidencia en `conv_cases` con `status='open'`:

```json
{
  "session_id": "<uuid>",
  "service_code": "conv_incidencias",
  "response_type": "pending_input",
  "text": "He registrado tu consulta. Para formalizar la incidencia necesitamos verificar tu identidad completa. ¿Puedes confirmarnos tu número de habitación?",
  "next_state": "waiting_user",
  "needs_more_input": true
}
```

El `conv_case` se crea con `status='open'`. Mientras el usuario responde preguntas de identidad, el caso permanece en `waiting_user`. Una vez verificada la identidad o escalado el caso, la EF transita al estado correspondiente (`waiting_internal` si la incidencia llega al Core, `escalated` si se escala).

### Paso 4 — Implementar WF-IDENTITY (sub-workflow)

WF-IDENTITY es un sub-workflow reutilizable. Lo activan WF-20 y WF-40 cuando necesitan un nivel de identidad mayor que el actual de la sesión.

**WF-IDENTITY nunca almacena PII en variables de workflow.** La extracción de `full_name`, `residence_name` y `room_label` del texto del usuario la realiza una EF, que persiste los valores en `conv_sessions.identity_data`. n8n solo recibe flags (`has_full_name`, `has_residence_name`, `has_room_label`) para saber qué datos ya están disponibles.

```
INPUT: { session_id, client_account_id, current_identity_level,
         has_full_name, has_residence_name, has_room_label }

PASOS:
1. Si has_full_name = false:
   Preguntar: "Para ayudarte mejor, ¿puedes decirme tu nombre completo?"
   Cuando el usuario responde:
     → Llamar EF extracción: { session_id, field: 'full_name', message_text }
       La EF persiste en conv_sessions.identity_data y devuelve { has_full_name: true }
   Devolver CanonicalResponse { response_type: 'pending_input' } al llamante

2. Si has_residence_name = false:
   Preguntar: "¿En qué residencia vives?"
   Cuando el usuario responde:
     → Llamar EF extracción: { session_id, field: 'residence_name', message_text }
       La EF persiste y devuelve { has_residence_name: true }
   Devolver CanonicalResponse { response_type: 'pending_input' } al llamante

3. Si has_room_label = false:
   Preguntar: "¿En qué habitación estás?"
   Cuando el usuario responde:
     → Llamar EF extracción: { session_id, field: 'room_label', message_text }
       La EF persiste y devuelve { has_room_label: true }

4. Llamar EF conv-core-validate-identity vía HTTP:
   POST /functions/v1/conv-core-validate-identity
   Body: { session_id, client_account_id }
   (La EF lee full_name, residence_name y room_label de conv_sessions.identity_data internamente)

   → STRONG_MATCH_ACTIVE: OUTPUT { identity_level: 'STRONG_MATCH_ACTIVE' } → continuar
   → PARTIAL_MATCH_ACTIVE: OUTPUT { identity_level: 'PARTIAL_MATCH_ACTIVE' }
   → MATCH_INACTIVE: Responder "Tu estancia ya ha finalizado." → escalar
   → NO_MATCH: contar intento fallido

5. Si 3 intentos fallidos:
   → Escalar al admin
   → No realizar más intentos de validación en esta sesión
```

**Importante:** WF-IDENTITY orquesta las preguntas. Las EFs extraen y persisten los datos sensibles en `conv_sessions.identity_data`. n8n no escribe directamente en la base de datos ni almacena `full_name`, `residence_name` ni `room_label` como variables del workflow.

### Paso 5 — Construir la `CanonicalResponse` correcta para cada resultado

| Resultado | `response_type` | Campos adicionales obligatorios |
|---|---|---|
| Incidencia creada con éxito | `'success'` | `case_ref = 'INC-2026-NNNN'`, `next_state = 'waiting_internal'` (el caso espera respuesta del equipo) |
| Esperando más datos del usuario | `'pending_input'` | `needs_more_input = true`, `next_state = 'waiting_user'` |
| Escalado por identidad insuficiente | `'escalated'` | `escalated = true`, `escalation_reason = 'identity_unresolved'` |
| Fallo del Core tras 3 reintentos | `'error_handled'` | `escalated = true`, `escalation_reason = 'core_error'`, `next_state = 'waiting_internal'` |
| Usuario pide hablar con un humano | `'escalated'` | `escalated = true`, `escalation_reason = 'user_request'` |

El campo `text` no puede contener marcadores sin sustituir. La EF sustituye `{incident_ref}` antes de que WF-20 construya la respuesta.

## 7. Datos / contratos involucrados

- `conv_cases` — pre-incidencias y seguimiento; `status` leído por WF-20, modificado por EFs
- `conv_sessions` — `identity_level` y `identity_data`; WF-20 los lee, las EFs los escriben
- `contract-canonical-response.md` — estructura obligatoria de la respuesta que WF-20 produce
- `contract-identity-validation-result.md` — estructura del resultado que devuelve `conv-core-validate-identity`
- `contract-case-state-machine.md` — transiciones válidas de `conv_cases.status`

## 8. Errores comunes

- **Crear incidencia oficial con `PARTIAL_MATCH_ACTIVE`:** solo `STRONG_MATCH_ACTIVE` puede invocar `conv-core-create-incident`. El nivel parcial solo autoriza pre-incidencias en `conv_cases`.
- **Construir `CanonicalResponse` con marcadores sin sustituir en `text`:** `{incident_ref}` debe estar sustituido por el valor real antes de construir la respuesta. Es responsabilidad de la EF, no de n8n.
- **Gestionar los reintentos de Core desde n8n:** el backoff exponencial y la creación de pre-incidencia en caso de fallo son responsabilidad de la EF `conv-core-create-incident`. WF-20 solo recibe el resultado final.
- **Volver a pedir datos que ya están en el contexto del workflow:** si el usuario ya dio el tipo de incidencia, no preguntarlo de nuevo en el siguiente turno.
- **Escalado sin `escalation_reason`:** cuando `response_type = 'escalated'`, `escalation_reason` es obligatorio.

## 9. Qué no debe hacerse

- Llamar directamente a las APIs del Core de SmartRoom desde n8n (siempre a través de EFs).
- Ejecutar `UPDATE` sobre `conv_sessions` o `conv_cases` directamente desde n8n.
- Asumir la identidad del usuario basándose en lo que afirma, sin llamar a `conv-core-validate-identity`.
- Continuar el flujo de validación tras tres fallos consecutivos.
- Usar `conv_send_queue` para los reintentos de `conv-core-create-incident` (esa cola es exclusivamente para reintentos de envío saliente al usuario).

## 10. Escenarios mínimos de prueba

1. **`STRONG_MATCH_ACTIVE` + datos completos → incidencia creada:**
   Sesión con identidad confirmada, usuario da tipo y descripción → `conv-core-create-incident` exitoso → `CanonicalResponse { response_type: 'success', case_ref: 'INC-2026-NNNN', next_state: 'waiting_internal' }`; `conv_cases.status = 'waiting_internal'`.

2. **`STRONG_MATCH_ACTIVE` + datos parciales → pending_input:**
   Usuario no da el tipo de problema → `CanonicalResponse { response_type: 'pending_input', needs_more_input: true }`.

3. **`PARTIAL_MATCH_ACTIVE` → pre-incidencia `status='open'`, sin llamar al Core:**
   Nivel parcial → pre-incidencia en `conv_cases` con `status='open'`; `response_type: 'pending_input'` solicitando más datos de identidad; `next_state: 'waiting_user'`.

4. **`NO_MATCH` → WF-IDENTITY activado; escalado solo si persiste tras intentos:**
   `identity_level = 'NO_MATCH'` → WF-IDENTITY intentos de identificación progresiva; si tres fallos → `response_type: 'escalated', escalation_reason: 'identity_unresolved'`.

5. **Core falla 3 veces → error_handled:**
   `conv-core-create-incident` devuelve 5xx tres veces → EF crea `status='waiting_internal'` → WF-20 recibe error → `response_type: 'error_handled', escalation_reason: 'core_error'`.

6. **Usuario pide humano → escalado:**
   Usuario escribe "quiero hablar con una persona" → `CanonicalResponse { response_type: 'escalated', escalation_reason: 'user_request' }`.

7. **WF-IDENTITY: datos acumulados no se vuelven a pedir:**
   Usuario ya dio `full_name` en el turno anterior → WF-IDENTITY no vuelve a preguntar el nombre en el siguiente turno.

## 11. Criterio de done

WF-20 se considera correctamente implementado cuando:

- Solo llama a `conv-core-create-incident` con `STRONG_MATCH_ACTIVE`
- Con `PARTIAL_MATCH_ACTIVE` crea pre-incidencia en `conv_cases` sin llamar al Core
- Con `MATCH_INACTIVE` escala al admin directamente sin crear ningún registro de incidencia
- Con `NO_MATCH` activa WF-IDENTITY; escala solo si agota los intentos permitidos
- El campo `text` de la `CanonicalResponse` no contiene marcadores sin sustituir
- Los reintentos de Core y el escalado por fallo persistente los gestiona la EF, no n8n
- WF-IDENTITY no vuelve a pedir datos ya almacenados en el contexto del workflow
- Tras tres fallos de validación de identidad, el sistema escala y no realiza más intentos

## 12. Documentos relacionados

- `rules-60-service-incidents.md` — reglas del servicio de incidencias
- `rules-40-identity-validation.md` — flujo de validación progresiva y WF-IDENTITY
- `contract-canonical-response.md` — estructura de la respuesta de WF-20
- `contract-identity-validation-result.md` — estructura del resultado de validación
- `skill-identity-validation.md` — detalles de implementación de `conv-core-validate-identity`
- `skill-integration-api-implementation.md` — implementación de `conv-core-create-incident`
- `rules-02-project-structure-and-addons.md` — convención de ubicación de workflows bajo `automations_n8n/<addon-name>/`

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
