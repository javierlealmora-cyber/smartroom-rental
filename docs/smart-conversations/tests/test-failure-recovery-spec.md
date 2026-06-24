# test-failure-recovery-spec.md — Especificación de Pruebas: Recuperación ante Fallos

## 1. Objetivo

Verificar que el sistema SmartConversations se comporta correctamente ante todos los escenarios de fallo definidos en `rules-90-observability-and-failure-handling.md`: errores del Core (4xx y 5xx), fallos del proveedor de IA, fallos de entrega saliente gestionados por `conv_send_queue`, el job de reconciliación ante n8n caído, y la desconexión de la sesión Wasender. En todos los casos, el usuario nunca recibe mensajes de error técnicos.

---

## 2. Alcance

| Incluye | Excluye |
|---|---|
| Errores HTTP 4xx del Core (400, 403, 404, 422) | Lógica interna del Core para generar errores |
| Errores HTTP 5xx del Core con backoff exponencial | Panel de administración de alertas |
| Timeout del Core (> 10s) | Recuperación manual por el equipo de administración |
| Fallos del proveedor de IA (timeout, rate limit, 5xx) | Configuración de los umbrales de tiempo de espera |
| `conv_send_queue`: reintentos de envío saliente | Lógica interna de Wasender o Supabase Realtime |
| Job de reconciliación `WF-C00-RECONCILE` | |
| Desconexión de sesión Wasender | |
| Webhook duplicado de Wasender | |
| Regla: mensajes técnicos nunca al usuario final | |

---

## 3. Reglas y Contratos Cubiertos

| Documento | Sección | Qué se verifica |
|---|---|---|
| `rules-90-observability-and-failure-handling.md` | §3.1 | Mensajes de error técnico nunca al usuario |
| `rules-90-observability-and-failure-handling.md` | §4.1 | Clasificación de escenarios de fallo |
| `rules-90-observability-and-failure-handling.md` | §4.2 | `conv_send_queue`: backoff 1s→5s→30s, máx. 3 intentos |
| `rules-90-observability-and-failure-handling.md` | §4.3 | Sesión Wasender desconectada: alerta en panel |
| `rules-90-observability-and-failure-handling.md` | §4.4 | Job de reconciliación: procesa `status='received'` > 5 min |
| `rules-90-observability-and-failure-handling.md` | §4.5 | Errores del Core por código HTTP: 400, 403, 404, 422, 5xx, timeout |
| `rules-90-observability-and-failure-handling.md` | §4.6 | Fallos del proveedor de IA: fallback a respuesta predefinida |
| `rules-90-observability-and-failure-handling.md` | §4.8 | Alertas y notificaciones al admin |
| `rules-90-observability-and-failure-handling.md` | §6 | Casos prohibidos |

---

## 4. Precondiciones

- EFs `conv-core-*` simulables para devolver cualquier código HTTP.
- Proveedor de IA simulable para devolver timeout, rate limit y errores 5xx.
- `conv_send_queue` con registros de prueba en estado `pending`.
- Job de reconciliación `WF-C00-RECONCILE` ejecutable manualmente en entorno de prueba.
- `conv_wa_sessions` con estado configurable (active/disconnected).
- Acceso a `conv_admin_notifications` para verificar creación de alertas.

---

## 5. Escenarios de Prueba

### Bloque ERR — Errores del Core (4xx)

**ERR-01: Core devuelve HTTP 400 → sin reintento, escalado a admin**

- **Precondición**: `conv-core-create-incident` devuelve HTTP 400 (request inválido).
- **Resultado esperado**:
  - La EF **no** reintenta la llamada.
  - El payload de error se registra en el log técnico del add-on (sin PII).
  - `conv-escalate-case` invocado.
  - Usuario recibe: "Tu solicitud ha sido recibida. Un miembro del equipo te confirmará los detalles en breve."
  - El código HTTP 400 nunca aparece en el mensaje al usuario.
- **Regla cubierta**: `rules-90` §4.5.

---

**ERR-02: Core devuelve HTTP 403 → sin reintento, verificar suscripción umbrella**

- **Precondición**: `conv-core-create-incident` devuelve HTTP 403 (tenant no autorizado).
- **Resultado esperado**:
  - Sin reintento.
  - La EF verifica el estado de `saas_service_subscriptions` del tenant.
  - Escalado a admin con contexto del error de autorización.
  - Usuario recibe mensaje genérico.
- **Regla cubierta**: `rules-90` §4.5.

---

**ERR-03: Core devuelve HTTP 404 → sin reintento, escalado con contexto**

- **Precondición**: `conv-core-create-incident` devuelve HTTP 404 (recurso no encontrado).
- **Resultado esperado**:
  - Sin reintento.
  - El error y el contexto del caso se registran en logs.
  - Escalado a admin.
  - Usuario recibe mensaje genérico.
- **Regla cubierta**: `rules-90` §4.5.

---

**ERR-04: Core devuelve HTTP 422 → sin reintento, tratamiento como caso especial**

- **Precondición**: `conv-core-create-incident` devuelve HTTP 422 (precondición fallida).
- **Resultado esperado**:
  - Sin reintento.
  - La EF aplica el tratamiento definido en `rules-60-service-incidents.md` para HTTP 422.
  - Escalado a admin.
  - Usuario recibe mensaje genérico.
- **Regla cubierta**: `rules-90` §4.5.

---

### Bloque ERR — Errores del Core (5xx y timeout)

**ERR-05: Core devuelve HTTP 5xx en los 3 intentos → pre-incidencia + escalado**

- **Precondición**: `conv-core-create-incident` devuelve HTTP 503 en los 3 intentos.
- **Resultado esperado**:
  - Intento 1: error 503 → espera 1s.
  - Intento 2: error 503 → espera 5s.
  - Intento 3: error 503 → espera 30s (o se agota el tiempo y escala).
  - Pre-incidencia guardada en `conv_cases` con `status = 'waiting_internal'`.
  - `conv-escalate-case` invocado.
  - `CanonicalResponse { response_type: 'error_handled', escalation_reason: 'core_error', next_state: 'waiting_internal' }`.
  - Usuario recibe: "Tu solicitud ha sido recibida. Un miembro del equipo te confirmará los detalles en breve."
- **Regla cubierta**: `rules-90` §4.5.

---

**ERR-06: Core devuelve HTTP 5xx en el primer intento, éxito en el segundo → operación completada**

- **Precondición**: `conv-core-create-incident` devuelve HTTP 503 en intento 1, HTTP 201 en intento 2.
- **Resultado esperado**:
  - Reintento tras 1s.
  - Segundo intento exitoso.
  - Incidencia creada correctamente.
  - No se activa el escalado.
  - Usuario recibe confirmación con `incident_ref`.
- **Regla cubierta**: `rules-90` §4.5.

---

**ERR-07: Timeout del Core (> 10s) → tratado como 5xx, reintentos**

- **Precondición**: `conv-core-create-incident` no responde en 10s.
- **Resultado esperado**:
  - Timeout tratado como HTTP 5xx.
  - Se inicia el ciclo de reintentos (1s → 5s → 30s, máx. 3 intentos).
  - Si los 3 reintentos también producen timeout → pre-incidencia + escalado.
- **Regla cubierta**: `rules-90` §4.5.

---

**ERR-08: EF realiza exactamente 3 reintentos ante 5xx, nunca 4 o más**

- **Precondición**: `conv-core-create-incident` devuelve HTTP 503 en todos los intentos.
- **Resultado esperado**:
  - La EF ejecuta exactamente 3 intentos (1 original + 2 reintentos): "máximo 3 intentos" significa 3 totales, salvo que una rule superior lo redefina explícitamente.
  - El cuarto intento **no** se ejecuta bajo ninguna circunstancia.
  - Después del tercer fallo: escalado inmediato.
- **Regla cubierta**: `rules-90` §4.5 — "máx. 3 intentos".

---

### Bloque ERR — Fallos del proveedor de IA

**ERR-09: Timeout de la API de IA (> 15s) → respuesta predefinida del servicio**

- **Precondición**: La API de Claude devuelve timeout (> 15s sin respuesta).
- **Resultado esperado**:
  - WF-20/30/40 usa la respuesta predefinida configurada en `conv_service_activations.config`.
  - Si no hay configuración de fallback: "En este momento no puedo procesar tu solicitud automáticamente. Un miembro del equipo te atenderá en breve."
  - El usuario nunca recibe un mensaje de error técnico.
  - Si el caso requiere decisión: escalado a admin.
- **Regla cubierta**: `rules-90` §4.6.

---

**ERR-10: Error 429 del proveedor de IA (rate limit) → esperar y reintentar con backoff**

- **Precondición**: Claude API devuelve HTTP 429 (rate limit exceeded).
- **Resultado esperado**:
  - La EF espera el tiempo indicado en el header `Retry-After` (o backoff por defecto).
  - Reintento tras la espera.
  - Si persiste: respuesta predefinida o escalado.
- **Regla cubierta**: `rules-90` §4.6.

---

**ERR-11: Error 5xx del proveedor de IA → reintentar una vez, luego respuesta predefinida**

- **Precondición**: Claude API devuelve HTTP 500.
- **Resultado esperado**:
  - Se realiza exactamente 1 reintento.
  - Si el reintento también falla: respuesta predefinida enviada al usuario.
  - Sin exposición del error técnico al usuario.
- **Regla cubierta**: `rules-90` §4.6.

---

**ERR-12: Confianza de clasificación < umbral → menú de selección, no reintento de IA**

- **Precondición**: IA devuelve `confidence = 0.60` (< 0.85).
- **Resultado esperado**:
  - No se reintenta la clasificación.
  - WF-10 presenta menú dinámico al usuario (si hay más de 1 servicio activo).
- **Regla cubierta**: `rules-90` §4.6; `rules-50` §4.3.

---

### Bloque ERR — `conv_send_queue` y envío saliente

**ERR-13: Primer intento de envío falla → entrada en `conv_send_queue` con estado `pending`**

- **Precondición**: EF `conv-send-wa` falla al enviar mensaje al usuario vía Wasender (HTTP 5xx de Wasender).
- **Resultado esperado**:
  - Se inserta entrada en `conv_send_queue` con `status = 'pending'`, `attempts = 0`, `next_attempt_at = now()`.
  - El mensaje no se abandona tras el primer fallo.
- **Regla cubierta**: `rules-90` §4.2; §3.3.

---

**ERR-14: `conv_send_queue` reintenta con backoff 1s → 5s → 30s**

- **Precondición**: Entrada en `conv_send_queue` con `status = 'pending'`. Los primeros 2 intentos fallan.
- **Resultado esperado**:
  - Intento 1 (attempts = 1): fallo → `next_attempt_at = now() + 1s`.
  - Intento 2 (attempts = 2): fallo → `next_attempt_at = now() + 5s`.
  - Intento 3 (attempts = 3): éxito → `status = 'succeeded'`, `conv_messages.status = 'sent'`.
- **Regla cubierta**: `rules-90` §4.2.

---

**ERR-15: `conv_send_queue` agota `max_retries` → `status = 'failed'`, alerta al admin**

- **Precondición**: Entrada en `conv_send_queue` con `max_retries = 3`. Los 3 intentos fallan.
- **Resultado esperado**:
  - Tras el tercer intento: `status = 'failed'`.
  - `conv_messages.status = 'failed'`.
  - Alerta generada en `conv_admin_notifications`.
  - Métrica `messages_failed_total` incrementada.
- **Regla cubierta**: `rules-90` §4.2; §4.8.

---

**ERR-16: `conv_send_queue` no almacena PII en `payload`**

- **Precondición**: Mensaje saliente que incluye `incident_ref` (no PII, es referencia pública).
- **Resultado esperado**:
  - `conv_send_queue.payload` referencia `conv_messages.id` para recuperar el texto.
  - Si el texto puede recuperarse desde `conv_messages`, no se duplica en el payload de la cola.
  - El payload no contiene `phone_number`, `full_name`, `room_label`.
- **Regla cubierta**: `rules-90` §4.2; `rules-80` §4.1.

---

### Bloque ERR — Job de reconciliación

**ERR-17: n8n caído → mensajes en `conv_messages` con `status='received'`**

- **Precondición**: n8n no está disponible. Llega un mensaje WA; `conv-wa-webhook` lo procesa pero falla al llamar a n8n.
- **Resultado esperado**:
  - El mensaje se inserta en `conv_messages` con `status = 'received'`.
  - No se pierde el mensaje.
  - El job de reconciliación lo procesará cuando se ejecute.
- **Regla cubierta**: `rules-90` §3.2; §4.4.

---

**ERR-18: Job `WF-C00-RECONCILE` procesa mensajes `status='received'` de más de 5 minutos**

- **Precondición**: `conv_messages` con `status = 'received'` y `created_at < now() - interval '5 minutes'`. Tenant con suscripción umbrella activa.
- **Acción**: Job `WF-C00-RECONCILE` se ejecuta.
- **Resultado esperado**:
  - El job detecta los mensajes pendientes (query con condición de antigüedad y suscripción activa).
  - Reintenta el envío al motor conversacional: vía WF-01 (WhatsApp) o directamente a `conv-ingest` (WebChat), siguiendo el patrón canal → `conv-ingest` → motor conversacional común.
  - Si el motor responde: `conv_messages.status = 'processing'`.
- **Regla cubierta**: `rules-90` §4.4.

---

**ERR-19: Job de reconciliación no reprocesa mensajes con `status != 'received'`**

- **Precondición**: `conv_messages` con `status = 'processing'` y `status = 'sent'`. Job de reconciliación se ejecuta.
- **Resultado esperado**:
  - El job **no** reprocesa ningún mensaje con `status = 'processing'` ni `'sent'`.
  - Solo procesa mensajes con `status = 'received'` y antigüedad > 5 minutos.
- **Regla cubierta**: `rules-90` §4.4; §6.

---

**ERR-20: Job de reconciliación no ejecutado en > 10 min → alerta en panel**

- **Precondición**: El job `WF-C00-RECONCILE` no ha corrido en los últimos 10 minutos.
- **Resultado esperado**:
  - Alerta generada en `conv_admin_notifications` con urgencia media.
  - La alerta aparece en el panel de administración.
- **Regla cubierta**: `rules-90` §4.8.

---

### Bloque ERR — Sesión Wasender desconectada

**ERR-21: Webhook de tipo `session_status` con estado desconexión → `conv_wa_sessions.status = 'disconnected'`**

- **Precondición**: Wasender envía webhook indicando desconexión de la sesión.
- **Resultado esperado**:
  - `conv-wa-webhook` actualiza `conv_wa_sessions.status = 'disconnected'`.
  - Mensajes entrantes de WhatsApp posteriores son ignorados silenciosamente (Nivel 2 de la jerarquía).
- **Regla cubierta**: `rules-90` §4.3.

---

**ERR-22: Sesión Wasender desconectada > 5 min → notificación crítica al admin**

- **Precondición**: `conv_wa_sessions.status = 'disconnected'` durante más de 5 minutos.
- **Resultado esperado**:
  - Notificación crítica insertada en `conv_admin_notifications`.
  - Canal de alerta: panel admin + email (si configurado).
  - La alerta persiste aunque el admin no esté en línea en ese momento.
- **Regla cubierta**: `rules-90` §4.3; §4.8.

---

**ERR-23: Mensajes en `conv_send_queue` con status `pending` se mantienen durante desconexión de Wasender**

- **Precondición**: `conv_wa_sessions.status = 'disconnected'`. Hay mensajes en `conv_send_queue` con `status = 'pending'`.
- **Resultado esperado**:
  - Los mensajes permanecen en `pending`; no se abortan.
  - Cuando la sesión se reconecta (`status = 'active'`), el job de reconciliación retoma los mensajes pendientes.
- **Regla cubierta**: `rules-90` §4.3.

---

### Bloque ERR — Webhook duplicado de Wasender

**ERR-24: Webhook duplicado → deduplicación por `wasender_message_id`, segundo ignorado**

- **Precondición**: Wasender envía el mismo webhook dos veces con el mismo `wasender_message_id`.
- **Resultado esperado**:
  - Primer webhook: insertado en `conv_messages` y procesado normalmente.
  - Segundo webhook: `wasender_message_id` ya existe en `conv_messages` → ignorado silenciosamente.
  - El mensaje se procesa exactamente una vez.
- **Regla cubierta**: `rules-90` §3.6; `rules-30`.

---

**ERR-25: Firma inválida en webhook de Wasender → 200 silencioso, sin procesamiento**

- **Precondición**: Webhook recibido con `X-Webhook-Signature` inválido o ausente.
- **Resultado esperado**:
  - `conv-wa-webhook` responde HTTP 200 silenciosamente (no revela el estado al atacante).
  - El webhook no se procesa.
  - El evento se registra en el log técnico del add-on.
- **Regla cubierta**: `rules-90` §4.1; `rules-30`.

---

## 6. Casos Negativos

| ID | Caso negativo | Resultado esperado |
|---|---|---|
| ERR-NEG-01 | EF reintenta ante HTTP 400 del Core | Violación de `rules-90` §4.5; HTTP 4xx no se reintenta |
| ERR-NEG-02 | EF realiza 4 intentos ante HTTP 5xx del Core | Violación de `rules-90` §4.5; máximo 3 intentos |
| ERR-NEG-03 | Usuario recibe código HTTP 503 en su mensaje | Violación de `rules-90` §3.1; mensajes técnicos nunca al usuario |
| ERR-NEG-04 | Mensaje saliente abandonado tras primer fallo sin insertar en `conv_send_queue` | Violación de `rules-90` §3.3; siempre usar cola de reintentos |
| ERR-NEG-05 | Job de reconciliación reprocesa mensajes con `status = 'processing'` | Violación de `rules-90` §4.4; duplicados prohibidos |
| ERR-NEG-06 | Rollback de incidencia creada porque el activity log falló | Violación de `rules-75` §4.3; semántica fire-and-log |
| ERR-NEG-07 | `conv_send_queue` almacena `phone_number` del destinatario en `payload` | Violación de `rules-80` §4.1; sin PII en el payload |
| ERR-NEG-08 | Alerta de sesión Wasender desconectada perdida si el admin no está en línea | Violación de `rules-90` §4.8; las alertas deben persistirse en `conv_admin_notifications` |

---

## 7. Datos de Prueba

```json
{
  "conv_send_queue_entries": {
    "pending_wa": {
      "session_id": "sess-err-001",
      "client_account_id": "tenant-err-001",
      "channel": "whatsapp",
      "message_id": "msg-err-001",
      "payload": { "message_ref": "msg-err-001" },
      "attempts": 0,
      "max_retries": 3,
      "status": "pending"
    }
  },
  "conv_messages_stale": {
    "received_8min_ago": {
      "id": "msg-reconcile-001",
      "status": "received",
      "client_account_id": "tenant-err-001",
      "created_at": "NOW() - interval '8 minutes'"
    },
    "already_processing": {
      "id": "msg-reconcile-002",
      "status": "processing"
    }
  },
  "wa_sessions": {
    "disconnected": { "status": "disconnected", "disconnected_at": "NOW() - interval '6 minutes'" },
    "active": { "status": "active" }
  },
  "core_error_responses": {
    "http_400": { "status": 400, "error": "invalid_request" },
    "http_403": { "status": 403, "error": "unauthorized" },
    "http_404": { "status": 404, "error": "not_found" },
    "http_422": { "status": 422, "error": "precondition_failed" },
    "http_503": { "status": 503, "error": "service_unavailable" }
  },
  "ai_error_scenarios": {
    "timeout_15s": "No response after 15 seconds",
    "rate_limit_429": { "status": 429, "retry_after": 5 },
    "server_error_500": { "status": 500 }
  }
}
```

---

## 8. Criterio de Aceptación

| Criterio | Condición de éxito |
|---|---|
| HTTP 4xx del Core nunca reintentado | Los 4 códigos (400/403/404/422) escalan directamente sin reintentos |
| Backoff exacto 1s→5s→30s para HTTP 5xx | Los intervalos verificables en logs; nunca se supera el tercer intento |
| Mensajes técnicos nunca al usuario | Revisión de 10 escenarios de error: 0 mensajes con código HTTP o stack trace |
| `conv_send_queue` usado ante cualquier fallo de envío | Ningún mensaje saliente abandonado sin entrada en la cola |
| Job de reconciliación no duplica mensajes ya procesados | `status != 'received'` excluido de la query del job |
| Alertas de Wasender desconectado persistentes | `conv_admin_notifications` contiene la alerta aunque el admin no esté en línea |
| Webhook duplicado procesado exactamente una vez | Segundo webhook con mismo `wasender_message_id` ignorado silenciosamente |
| Fallo del proveedor de IA activar respuesta predefinida | Usuario recibe fallback; sin error técnico; escalado si la decisión lo requiere |

---

## 9. Dependencias

| Documento | Relación |
|---|---|
| `rules-90-observability-and-failure-handling.md` | Fuente de verdad completa de este spec |
| `rules-75-activity-log.md` §4.3 | Fire-and-log: fallo de publicación sin rollback |
| `rules-80-data-and-privacy.md` §4.1 | Sin PII en `conv_send_queue.payload` |
| `rules-30-whatsapp-channel.md` | Deduplicación por `wasender_message_id` |
| `rules-60-service-incidents.md` §4.5 | Backoff exponencial ante 5xx del Core en flujo de incidencias |
| `skill-integration-api-implementation.md` | Backoff exponencial en las EFs |
| `diagram-data-model-overview.md` | DDL de `conv_send_queue` y sus campos |
