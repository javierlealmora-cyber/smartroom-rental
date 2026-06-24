# rules-90-observability-and-failure-handling.md — SmartConversations: Observabilidad y Gestión de Fallos

## 1. Propósito

Este documento define cómo el sistema debe comportarse ante fallos operativos: qué se registra, qué se reintenta, qué se escala, qué se alerta y qué no debe romper el flujo conversacional. También define el papel de `conv_send_queue`, los jobs de reconciliación, las métricas y la auditoría.

---

## 2. Alcance

Este documento aplica a:

- Todas las Edge Functions con prefijo `conv-*`
- Todos los workflows de n8n (WF-01 a WF-92)
- La tabla `conv_send_queue`
- La tabla `conv_messages` (campo `status`)
- Los jobs de reconciliación de n8n
- El panel de administración (indicadores de estado)

---

## 3. Decisiones No Negociables

1. **Un fallo técnico interno nunca debe comunicarse al usuario con un mensaje de error técnico.** El usuario siempre recibe un mensaje genérico de confirmación o de escalada.

2. **Los mensajes no procesados no deben perderse.** `conv_messages` actúa como cola de entrada; cualquier mensaje con `status = 'received'` sin respuesta en más de 5 minutos debe ser procesado por el job de reconciliación.

3. **Los fallos de envío se gestionan mediante `conv_send_queue` con backoff exponencial.** No se abandona un mensaje después del primer fallo.

4. **Un fallo de publicación en el activity log del Core no hace rollback de la operación principal.** La operación principal (crear incidencia, crear lead) tiene prioridad. El fallo de publicación se registra para recuperación manual.

5. **La sesión Wasender desconectada es un estado operativo crítico.** Debe detectarse, alertarse y permitir reconexión desde el panel de administración.

6. **Los duplicados de webhook nunca deben procesarse dos veces.** La deduplicación por `wasender_message_id` es el mecanismo principal. El job de reconciliación no debe reprocesar mensajes ya procesados.

---

## 4. Reglas Obligatorias

### 4.1 Clasificación de escenarios de fallo

| Escenario | Impacto | Tratamiento |
|---|---|---|
| Sesión Wasender desconectada | Crítico: mensajes entrantes ignorados | Alerta inmediata + acción de reconexión en panel |
| Webhook duplicado de Wasender | Bajo: mensaje procesado dos veces | Deduplicación por `wasender_message_id` antes de cualquier INSERT |
| n8n caído o no disponible | Alto: mensajes recibidos pero no procesados | Job de reconciliación cada 5 min; `conv_messages.status='received'` sin respuesta |
| Fallo de Core (4xx/5xx en EFs `conv-core-*`) | Medio: operación no completada | Escalada a admin; mensaje genérico al usuario |
| Fallo del proveedor de IA | Medio: flujo conversacional interrumpido | Fallback a respuesta predefinida o escalada a admin |
| Fallo de envío saliente (Wasender o Realtime) | Alto: usuario no recibe respuesta | `conv_send_queue` con reintentos |
| Firma inválida en webhook de Wasender | Bajo: webhook ignorado | Responder 200 silencioso; registrar evento en logs |
| Timeout en EF `conv-core-*` | Medio: operación sin respuesta | Tratar como 5xx; reintentar con backoff |

### 4.2 `conv_send_queue` — cola de reintentos de envío

```sql
CREATE TABLE conv_send_queue (
  id                  uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid      NOT NULL REFERENCES conv_sessions(id),
  client_account_id   uuid      NOT NULL,
  channel             text      NOT NULL,
  message_id          uuid      REFERENCES conv_messages(id),
  payload             jsonb     NOT NULL,   -- datos de envío (sin PII en texto claro)
  attempts            integer   DEFAULT 0,
  max_retries         integer   DEFAULT 3,
  next_attempt_at     timestamptz NOT NULL DEFAULT now(),
  last_error          text,
  status              text      DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'succeeded', 'failed')),
  created_at          timestamptz DEFAULT now()
);
```

Reglas de `conv_send_queue`:
- Un mensaje entra en la cola cuando el primer intento de envío falla.
- Los intentos se realizan con backoff exponencial: 1s → 5s → 30s.
- Después de `max_retries` fallos: `status = 'failed'` + `UPDATE conv_messages.status = 'failed'` + alerta al admin.
- La cola no almacena el texto del mensaje en `payload` si puede recuperarse desde `conv_messages`.

**Referencia cruzada — fallos temporales vs. definitivos:**
- Mientras `attempts < max_retries`, el fallo es temporal. Se gestiona exclusivamente como observabilidad interna: métricas (§4.7) y, si procede, `conv_admin_notifications` (§4.8). No se publica ningún evento en el activity log del Core.
- Cuando `attempts` agota `max_retries` (`status = 'failed'`) y el mensaje afecta a una conversación, caso o comunicación funcional relevante, la EF de envío correspondiente (p.ej. `conv-send-wa`) debe además publicar `conv_message_delivery_failed` mediante `conv-core-publish-activity`, según `rules-75-activity-log.md` §4.2.

### 4.3 Sesión Wasender desconectada

La sesión Wasender puede desconectarse por: expiración del token, reinicio del servidor de Wasender, cambio de número, o acción del usuario en el dispositivo.

Detección:
- Webhook de Wasender con tipo `session_status` indicando desconexión → `UPDATE conv_wa_sessions.status = 'disconnected'`.
- Si `conv_wa_sessions.status != 'active'` durante más de 5 minutos → generar notificación de admin en `conv_admin_notifications`.

Comportamiento durante desconexión:
- `conv-wa-webhook` ignora los webhooks entrantes en el nivel 2 de activación.
- El panel de administración muestra el estado de la sesión y ofrece la acción de reconexión.
- Los mensajes del bot en cola (`conv_send_queue`) permanecen en estado `pending` hasta que la sesión se reconecta.

Reconexión: el admin escanea el QR desde el panel → `UPDATE conv_wa_sessions.status = 'active'`. El job de reconciliación de `conv_send_queue` retoma los mensajes pendientes.

### 4.4 n8n caído — job de reconciliación

Cuando n8n no está disponible, los mensajes se reciben por las EFs de canal y se insertan en `conv_messages` con `status = 'received'`, pero el POST a n8n falla.

El job de reconciliación (`WF-C00-RECONCILE`, cadencia: cada 5 minutos) busca:

```sql
SELECT * FROM conv_messages
WHERE status = 'received'
AND created_at < now() - interval '5 minutes'
AND client_account_id IN (
  SELECT client_account_id FROM saas_service_subscriptions
  WHERE service_code = 'smart_conversations' AND status = 'active'
)
ORDER BY created_at ASC
LIMIT 50;
```

Para cada mensaje encontrado, reintenta el POST a n8n (WF-01 o WF-02 según canal). Si n8n sigue sin responder tras 3 intentos, el mensaje queda en `status = 'received'` para el siguiente ciclo del job.

El job no debe procesar mensajes que ya tienen `status = 'processing'` o `'sent'` para evitar duplicados.

### 4.5 Fallo del Core (EFs `conv-core-*`)

| Código de error | Tratamiento |
|---|---|
| `400` (request inválido) | No reintentar. Registrar el error con el payload. Escalar a admin. |
| `403` (tenant no autorizado) | No reintentar. Verificar estado de la suscripción umbrella. Escalar. |
| `404` (recurso no encontrado) | No reintentar. Registrar. Escalar con contexto. |
| `422` (precondición fallida) | No reintentar. Tratar como caso especial (ver `rules-60-service-incidents.md`). |
| `5xx` (error interno del Core) | Reintentar con backoff (1s → 5s → 30s, max 3 intentos). Si persiste: escalar. |
| Timeout (> 10s sin respuesta) | Tratar como 5xx. Reintentar con backoff. |

Cuando se escala por fallo del Core, el usuario siempre recibe: "Tu solicitud ha sido recibida. Un miembro del equipo te confirmará los detalles en breve." Nunca se expone el código de error ni el detalle técnico.

### 4.6 Fallo del proveedor de IA (Claude API)

| Escenario | Tratamiento |
|---|---|
| Timeout de la API de IA (> 15s) | Usar respuesta predefinida del servicio; escalar si el caso requiere decisión |
| Error 429 (rate limit) | Esperar y reintentar con backoff. Si persiste: escalar. |
| Error 5xx del proveedor | Reintentar una vez. Si persiste: usar respuesta predefinida o escalar. |
| Confianza de clasificación < umbral | No reintentar. Presentar menú de selección o escalar. |

Las respuestas predefinidas (fallback) son textos genéricos configurados por el admin del tenant en `conv_service_activations.config`. Si no hay configuración, se usa el fallback por defecto: "En este momento no puedo procesar tu solicitud automáticamente. Un miembro del equipo te atenderá en breve."

### 4.7 Métricas obligatorias

El sistema debe registrar (en Supabase o sistema de métricas externo) las siguientes métricas por tenant:

| Métrica | Descripción |
|---|---|
| `messages_received_total` | Mensajes entrantes (WhatsApp + WebChat) por día |
| `messages_sent_total` | Mensajes enviados con éxito |
| `messages_failed_total` | Mensajes con `status = 'failed'` tras agotar reintentos |
| `cases_created_total` | Casos nuevos en `conv_cases` por servicio |
| `cases_escalated_total` | Casos escalados a admin por motivo |
| `identity_validation_levels` | Distribución de `identity_level` por sesión |
| `wa_session_status` | Estado actual de `conv_wa_sessions` por tenant |
| `n8n_reconcile_queue_size` | Tamaño de la cola pendiente del job de reconciliación |
| `send_queue_pending` | Entradas en `conv_send_queue` con `status = 'pending'` |
| `core_api_errors_total` | Errores de EFs `conv-core-*` por tipo y código HTTP |
| `ai_api_errors_total` | Errores del proveedor de IA por tipo |

### 4.8 Alertas y notificaciones al admin

Los siguientes eventos deben generar una notificación en `conv_admin_notifications` y/o una alerta en el panel:

| Evento | Urgencia | Canal de alerta |
|---|---|---|
| `conv_wa_sessions.status != 'active'` durante > 5 min | Crítica | Panel admin + email si configurado |
| `conv_send_queue` con > 10 entradas `failed` en 1 hora | Alta | Panel admin |
| `conv_messages` con `status = 'received'` más de 30 min | Alta | Panel admin |
| `core_api_errors_total` > 5 errores 5xx en 5 min | Media | Panel admin |
| Job de reconciliación sin ejecutarse en > 10 min | Media | Panel admin |
| Caso escalado automáticamente por `auto_escalate_after_minutes` | Baja | Notificación en inbox del admin |

Las alertas críticas no deben bloquearse si el admin no está disponible. Deben registrarse en `conv_admin_notifications` con `is_read = false` para que aparezcan al iniciar sesión.

### 4.9 Auditoría de operaciones con impacto en Core

Toda operación que crea o modifica datos en SmartRoom Core debe registrarse en el audit log del add-on:

| Operación | Datos registrados |
|---|---|
| Incidencia oficial creada | `conv_case_id`, `incident_ref`, `client_account_id`, timestamp |
| Lead creado | `conv_case_id`, `lead_ref`, `client_account_id`, timestamp |
| Caso escalado | `conv_case_id`, `reason`, `client_account_id`, timestamp |
| Caso cerrado | `conv_case_id`, `resolution_channel`, `client_account_id`, timestamp |
| Sesión Wasender desconectada | `client_account_id`, `mode`, timestamp |
| Suscripción umbrella activada/desactivada | `client_account_id`, `action`, timestamp |

Los registros de audit nunca incluyen PII del inquilino. Ver `rules-80-data-and-privacy.md` Sección 4.5.

---

## 5. Casos Permitidos

- Un mensaje de WhatsApp recibido cuando n8n está caído: se inserta en `conv_messages` con `status = 'received'`; el job de reconciliación lo procesa 5 minutos después.
- Un fallo de `conv-core-create-incident` con HTTP 5xx: pre-incidencia guardada en `conv_cases`, escalada a admin, usuario recibe mensaje genérico.
- La sesión Wasender se desconecta: alertas en el panel, mensajes salientes en cola, admin reconecta mediante QR.
- Un webhook duplicado de Wasender: deduplicado por `wasender_message_id`, segundo webhook ignorado silenciosamente.
- Claude API devuelve timeout: respuesta predefinida enviada al usuario; caso marcado para revisión del admin.

---

## 6. Casos Prohibidos

- Exponer mensajes de error técnicos (códigos HTTP, excepciones) al usuario final.
- Abandonar un mensaje saliente después del primer fallo sin insertarlo en `conv_send_queue`.
- El job de reconciliación reprocesando mensajes que ya tienen `status = 'processing'` o `'sent'`.
- Hacer rollback de una operación en el Core (incidencia creada, lead creado) porque la publicación del activity log falló.
- Omitir la deduplicación por `wasender_message_id` en el job de reconciliación.
- Alertas críticas que dependen de que el admin esté en línea para ser recibidas (deben persistirse en `conv_admin_notifications`).

---

## 7. Impacto en el Diseño

- `conv_messages.status` es el indicador primario de salud del sistema. Un incremento de mensajes con `status = 'received'` sin progresión es señal de que n8n no está procesando.
- La cola `conv_send_queue` no es una cola de mensajes de entrada, sino una cola de reintentos de envío saliente. Estas dos responsabilidades no deben mezclarse.
- Los fallos de IA son esperados en producción (timeouts, rate limits). El sistema debe diseñarse para funcionar con degradación elegante incluso sin IA disponible.
- El job de reconciliación es un mecanismo de recuperación, no un mecanismo de procesamiento normal. Su activación frecuente indica un problema con n8n que debe investigarse.

---

## 8. Impacto en la Implementación

- El job de reconciliación debe ejecutarse como Cron Job en Supabase (o n8n schedule) cada 5 minutos.
- El job de eliminación de `raw_payload` se ejecuta cada 24 horas eliminando entradas con más de 30 días.
- Las alertas al panel de administración se implementan mediante inserciones en `conv_admin_notifications` desde las EFs; el panel lee esta tabla con suscripción Realtime.
- El backoff exponencial (1s → 5s → 30s) debe implementarse en las EFs que llaman al Core, no en n8n.

---

## 9. Dependencias

- `rules-00-scope-and-principles.md` — principio P7 (desconexión limpia), P8 (idempotencia)
- `rules-20-tenant-activation-and-lifecycle.md` — sesión Wasender y estados del canal
- `rules-30-whatsapp-channel.md` — deduplicación por `wasender_message_id`
- `rules-70-integration-api.md` — tratamiento de errores HTTP del Core
- `rules-75-activity-log.md` — publicación fire-and-log (no hace rollback); evento `conv_message_delivery_failed`
- `rules-80-data-and-privacy.md` — qué puede y no puede incluirse en logs y auditoría

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`

---

## 10. Checklist de Validación

- [ ] El job de reconciliación se ejecuta cada 5 minutos y procesa `conv_messages` con `status = 'received'` > 5 min
- [ ] `conv_send_queue` usa backoff exponencial (1s → 5s → 30s) con máximo 3 intentos
- [ ] Un fallo de publicación en el activity log no hace rollback de la operación en el Core
- [ ] Sesión Wasender desconectada durante > 5 min genera notificación en `conv_admin_notifications`
- [ ] Los mensajes de error técnicos nunca llegan al usuario final
- [ ] El job de reconciliación no reprocesa mensajes con `status != 'received'`
- [ ] Los timeouts de Claude API activan la respuesta predefinida, no un error al usuario
- [ ] El audit log registra todas las operaciones con impacto en Core sin incluir PII del inquilino

---

## 11. Notas de Control de Cambios

Modificar el intervalo del job de reconciliación (5 minutos) requiere evaluar el impacto en la latencia percibida por el usuario y actualizar la Sección 4.4.

Añadir nuevos tipos de alerta crítica requiere documentar el canal de alerta y la persistencia en `conv_admin_notifications` antes de implementar.

Cualquier cambio en la estrategia de backoff (1s → 5s → 30s) debe ser coherente con los límites de rate de la API de Wasender y con los SLAs del tenant.
