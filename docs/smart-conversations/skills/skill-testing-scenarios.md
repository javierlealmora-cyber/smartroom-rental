# Skill — Catálogo de Escenarios de Prueba

## 1. Objetivo

Este skill define el catálogo mínimo de escenarios de prueba que deben cubrirse para garantizar la corrección de SmartConversations. Los escenarios están organizados por canal, servicio, identidad y manejo de errores. Para cada escenario se indica qué componente está bajo prueba, la precondición necesaria y el resultado esperado.

## 2. Cuándo usar este skill

Este skill es una **guía de referencia para redactar test specs**. Los documentos de test formales y ejecutables viven en `/docs/smart-conversations/tests/`. Usar este skill para:

- entender qué escenarios mínimos debe cubrir cada área funcional
- orientar la redacción de un nuevo test spec en `/docs/smart-conversations/tests/`
- verificar la cobertura de pruebas antes de un despliegue
- diseñar los tests de integración para una EF nueva
- revisar si un escenario crítico no tiene cobertura
- preparar tests de regresión para una corrección de bug

Para los test specs formales por área (routing, identity, activity log, etc.), ver directamente los ficheros en `/docs/smart-conversations/tests/`.

## 3. Preconditions

Antes de usar este skill, leer:

- `contract-case-state-machine.md` — estados y transiciones que los tests deben verificar
- `rules-40-identity-validation.md` — niveles de identidad y sus permisos
- `rules-80-data-and-privacy.md` — invariantes de PII que los tests deben verificar

## 4. Restricciones de origen

Este skill no define implementaciones de tests. Define qué debe probarse. La implementación concreta (Vitest, Playwright, etc.) sigue las convenciones del proyecto SmartRoom Rental.

Los escenarios aquí definidos son el mínimo necesario. Pueden y deben añadirse escenarios adicionales cuando se detecten nuevos caminos en la implementación.

## 5. Estrategia de implementación

El catálogo está organizado en seis categorías:

1. **Canal WhatsApp** — comportamiento de `conv-wa-webhook` y `conv-send-wa`
2. **Canal WebChat** — comportamiento de `conv-web-session` y `conv-web-message`
3. **Identidad** — fast-paths, flujo progresivo y niveles de acceso
4. **Motor de enrutado** — WF-10 y decisiones de menú/enrutado directo
5. **Servicios** — WF-20 (incidencias), WF-30 (publicaciones), WF-40 (ayuda)
6. **Manejo de errores** — fallos del Core, n8n caído, IA no disponible, reintentos

## 6. Pasos recomendados

### Categoría 1 — Canal WhatsApp

| ID | Escenario | Componente | Precondición | Resultado esperado |
|---|---|---|---|---|
| WA-01 | Webhook válido con firma correcta → mensaje procesado | `conv-wa-webhook` | Sesión activa, niveles 1-2-3 superados, `wasender_message_id` nuevo | Mensaje insertado en `conv_messages`, `conv-ingest` llamado |
| WA-02 | Webhook con firma inválida → descarte silencioso | `conv-wa-webhook` | `X-Webhook-Signature` no coincide con `webhook_secret` | HTTP 200, sin insert en `conv_messages`, sin llamada a `conv-ingest` |
| WA-03 | Webhook sin header de firma → descarte silencioso | `conv-wa-webhook` | `X-Webhook-Signature` ausente | HTTP 200, sin procesamiento |
| WA-04 | Mensaje duplicado (`wasender_message_id` existente) → descarte | `conv-wa-webhook` | `wasender_message_id` ya en `conv_messages` | HTTP 200, sin insert duplicado |
| WA-05 | Nivel 1 inactivo (suscripción umbrella) → descarte silencioso | `conv-wa-webhook` | `saas_service_subscriptions.status != 'active'` | HTTP 200, sin procesamiento posterior |
| WA-06 | Nivel 2 inactivo (`conv_wa_sessions.status = 'disconnected'`) → descarte | `conv-wa-webhook` | Canal desconectado | HTTP 200, sin procesamiento |
| WA-07 | Nivel 3 sin servicios activos → descarte silencioso | `conv-wa-webhook` | Sin filas activas en `conv_service_activations` para `whatsapp` | HTTP 200, sin procesamiento |
| WA-08 | `audioMessage` → encolado para transcripción | `conv-wa-webhook` | Mensaje de tipo `audioMessage` | Encolado en WF-C00-TRANSCRIBE; `conv-ingest` no llamado hasta tener texto |
| WA-09 | Envío exitoso con formato correcto | `conv-send-wa` | Sesión activa, Wasender disponible | POST a Wasender con `{ sessionId, to: "<phone>@c.us", text }`; `conv_messages.status='sent'` |
| WA-10 | Envío fallido → entra en `conv_send_queue` | `conv-send-wa` | Wasender devuelve 5xx | INSERT en `conv_send_queue` con `max_retries=3` |
| WA-11 | Offboarding `mode='logout'` → sesión desconectada | `conv-offboard-wa-session` | Sesión activa | POST `.../disconnect`; `conv_wa_sessions.status='disconnected'`; `conv_service_activations.is_active=false` |
| WA-12 | Offboarding `mode='delete'` → sesión eliminada de Wasender | `conv-offboard-wa-session` | Sesión activa | DELETE `.../sessions/{id}`; `status='disconnected'` |

### Categoría 2 — Canal WebChat

| ID | Escenario | Componente | Precondición | Resultado esperado |
|---|---|---|---|---|
| WC-01 | Dominio no autorizado → HTTP 403 | `conv-web-session` | `origin` no en `allowed_origins` | HTTP 403, sin sesión creada |
| WC-02 | Canal desactivado → HTTP 503 | `conv-web-session` | `conv_wc_configs.is_active = false` | HTTP 503, mensaje genérico, sin revelar causa |
| WC-03 | Usuario anónimo → `identity_level = 'NO_MATCH'` | `conv-web-session` | Sin JWT | Sesión con `identity_level='NO_MATCH'`, `is_identified: false` |
| WC-04 | Usuario con JWT válido + inquilino activo → `STRONG_MATCH_ACTIVE` | `conv-web-session` | JWT válido, Core confirma tenencia activa | `conv_sessions.identity_level='STRONG_MATCH_ACTIVE'` |
| WC-05 | JWT válido + ex-inquilino → `MATCH_INACTIVE` | `conv-web-session` | JWT válido, Core devuelve sin asignación activa | `conv_sessions.identity_level='MATCH_INACTIVE'`, no `STRONG_MATCH_ACTIVE` |
| WC-06 | `session_token` expirado → HTTP 401 | `conv-web-message` | Token con TTL superado | HTTP 401 `{ error: 'token_expired' }` |
| WC-07 | `service_code` no activo → HTTP 422 | `conv-web-message` | `service_code` no en `conv_service_activations` para `webchat` | HTTP 422 `{ error: 'service_not_active' }` |
| WC-08 | `data-services` con servicio no contratado → rechazado en backend | `conv-web-message` | `data-services` incluye `conv_incidencias`, no contratado | HTTP 422 al intentar enviar mensaje para ese servicio |
| WC-09 | Respuesta del bot entregada por Realtime | Widget React + Supabase | Bot inserta en `conv_messages` | Widget recibe el mensaje vía suscripción Realtime sin polling |
| WC-10 | Renovación transparente del token | Widget React | `session_token` expirado, sesión activa | Widget renueva el token y reenvía el mensaje sin intervención del usuario |

### Categoría 3 — Identidad

| ID | Escenario | Componente | Precondición | Resultado esperado |
|---|---|---|---|---|
| ID-01 | Fast-path WhatsApp → `STRONG_MATCH_ACTIVE` por teléfono | `conv-ingest` | Teléfono coincide exactamente con inquilino activo | `conv_sessions.identity_level='STRONG_MATCH_ACTIVE'`; n8n recibe solo `identity_level` |
| ID-02 | Fast-path WhatsApp → `NO_MATCH` | `conv-ingest` | Teléfono no registrado | `conv_sessions.identity_level='NO_MATCH'` |
| ID-03 | Flujo progresivo → `PARTIAL_MATCH_ACTIVE` | WF-IDENTITY | Usuario da nombre + residencia + habitación que coinciden | `conv_sessions.identity_level='PARTIAL_MATCH_ACTIVE'` |
| ID-04 | Tres fallos en flujo progresivo → escalado | WF-IDENTITY | Tres rondas de datos no coinciden con ningún perfil | Escalado al admin; no se realizan más intentos automáticos |
| ID-05 | Dato ya en `conv_sessions.identity_data` → no volver a pedir | WF-IDENTITY | `full_name` ya almacenado | WF-IDENTITY no pregunta el nombre en el siguiente turno |
| ID-06 | `profile_id` no se propaga a n8n | `conv-ingest`, `conv-web-session` | Validación exitosa con `profile_id` devuelto | n8n solo recibe `identity_level`; `profile_id` ausente del payload |
| ID-07 | `MATCH_INACTIVE` no accede a crear incidencias | WF-20 | `conv_sessions.identity_level='MATCH_INACTIVE'` | WF-20 escala al admin; no llama a `conv-core-create-incident` |
| ID-08 | `identity_level` no se degrada en sesión activa | EF de validación | Sesión con `PARTIAL_MATCH_ACTIVE`; nueva validación devuelve `NO_MATCH` | El nivel permanece `PARTIAL_MATCH_ACTIVE` |
| ID-09 | Fast-path WebChat con `profile_id` → Core ignora otros campos | `conv-core-validate-identity` | Request con `profile_id` y también `phone` | Solo `profile_id` determina el resultado; `phone` ignorado |

### Categoría 4 — Motor de enrutado (WF-10)

| ID | Escenario | Componente | Precondición | Resultado esperado |
|---|---|---|---|---|
| RT-01 | Un solo servicio activo → enrutado directo | WF-10 | `services_active` tiene exactamente un servicio | WF-10 enruta sin presentar menú |
| RT-02 | Múltiples servicios + confidence alta → enrutado directo | WF-10 | ≥2 servicios activos, `confidence = 0.92` | WF-10 enruta directamente al servicio detectado |
| RT-03 | Múltiples servicios + confidence baja → menú | WF-10 | ≥2 servicios activos, `confidence = 0.45` | WF-10 presenta menú con solo los servicios activos del tenant |
| RT-04 | `services_active = []` → mensaje de no disponible | WF-10 | Tenant sin servicios activos | WF-10 responde "servicio no disponible", sin llamar a WF de servicio |
| RT-05 | Caso abierto + misma intención → continúa el caso | WF-10 | `active_case_id` activo, nuevo mensaje relacionado con `confidence ≥ 0.85` | WF-10 llama al WF del servicio del caso activo |
| RT-06 | Caso abierto + intención diferente → pregunta al usuario | WF-10 | Caso de incidencia activo, mensaje de `conv_publicaciones` | WF-10 pregunta antes de cambiar contexto |
| RT-07 | `TenantFeaturesResponse` no se cachea | WF-10 | Admin desactiva un servicio entre dos ejecuciones | Segunda ejecución no enruta al servicio desactivado |
| RT-08 | n8n no ejecuta UPDATE sobre `conv_sessions` | WF-10 | Cualquier cambio de estado necesario | El cambio de estado lo ejecuta una EF, no n8n directamente |

### Categoría 5 — Servicios

| ID | Escenario | Componente | Precondición | Resultado esperado |
|---|---|---|---|---|
| SV-01 | `STRONG_MATCH_ACTIVE` + datos completos → incidencia oficial | WF-20 | Nivel confirmado, tipo y descripción dados | `conv-core-create-incident` exitoso; `CanonicalResponse { response_type: 'success', case_ref: 'INC-...' }` |
| SV-02 | `PARTIAL_MATCH_ACTIVE` → pre-incidencia `status='open'`, sin Core | WF-20 | Nivel parcial | `conv_cases` con `status='open'`; no se llama a `conv-core-create-incident`; `CanonicalResponse { response_type: 'pending_input', next_state: 'waiting_user' }` |
| SV-03 | Incidencia con datos incompletos → `pending_input` | WF-20 | Falta tipo de incidencia | `CanonicalResponse { response_type: 'pending_input', needs_more_input: true }` |
| SV-04 | Anuncio disponible + interés → lead creado | WF-30 | Anuncio `is_available=true`, usuario muestra interés y da nombre + contacto | `conv-core-create-lead` exitoso; `CanonicalResponse { case_ref: 'LEAD-...' }` |
| SV-05 | Anuncio no disponible → oferta de interés futuro | WF-30 | Anuncio `is_available=false` | Bot ofrece registrar interés futuro o ver otras habitaciones del alojamiento |
| SV-06 | `UNVERIFIED_LEAD` → ve solo datos públicos | WF-30 | `identity_level='NO_MATCH'` o `UNVERIFIED_LEAD` | Bot muestra precio y condiciones generales; no muestra datos de inquilinos actuales |
| SV-07 | FAQ público accesible sin identidad | WF-40 | `identity_level='NO_MATCH'` | WF-40 responde la pregunta de FAQ sin activar WF-IDENTITY |
| SV-08 | `text` de `CanonicalResponse` sin marcadores | WF-20/30/40 | Cualquier flujo con referencia del Core | `CanonicalResponse.text` no contiene `{incident_ref}` ni ningún otro marcador sin sustituir |

### Categoría 6 — Manejo de errores y resiliencia

| ID | Escenario | Componente | Precondición | Resultado esperado |
|---|---|---|---|---|
| ERR-01 | Core devuelve 5xx → backoff → éxito en 3er intento | EF de Integration API | Primeros dos intentos 503, tercero 200 | Sin escalado; operación completada |
| ERR-02 | Core falla 3 veces → pre-incidencia + escalado | `conv-core-create-incident` | Tres intentos con 503 | `conv_cases.status='waiting_internal'`; `conv-escalate-case` llamado |
| ERR-03 | `conv-core-publish-activity` falla → operación no afectada | EF de Integration API | `conv-core-publish-activity` devuelve 500 | Log de warning; el `incident_ref` ya devuelto al llamante; sin rollback |
| ERR-04 | `conv_send_queue` reintenta envío fallido | Job de reconciliación | Entrada en `conv_send_queue` con `next_attempt_at` pasado | Reintento ejecutado; si éxito, `conv_messages.status='sent'`; si fallo + `max_retries` agotados, `status='failed'` |
| ERR-05 | IA no disponible → formulario guiado | WF-10/20/30/40 | Claude API devuelve timeout | Bot presenta opciones numeradas; no expone el error al usuario |
| ERR-06 | `plan_limits.ai_enabled = false` → formulario en todos los flujos | WF-10 | `TenantFeaturesResponse.plan_limits.ai_enabled = false` | WF-10 nunca llama a Claude API; usa menú y formulario |
| ERR-07 | n8n caído → mensajes en `conv_messages.status='received'` detectados | WF-C00-RECONCILE | Mensajes > 5 min sin procesar | Job detecta y activa reconciliación |
| ERR-08 | Transición de estado inválida → rechazada | EF de estado | Intento de `closed → open` en `conv_cases` | EF devuelve error descriptivo; estado no modificado |
| ERR-09 | `conv_send_queue` no usada para reintentos de Core | EF de Integration API | Fallo de `conv-core-create-incident` | No hay insert en `conv_send_queue`; el backoff ocurre en la EF |

## 7. Datos / contratos involucrados

Los escenarios de este catálogo verifican invariantes definidos en:

- `contract-case-state-machine.md` — transiciones válidas e inválidas (escenarios ERR-08, RT-08)
- `contract-canonical-response.md` — campo `text` sin marcadores (escenario SV-08)
- `rules-40-identity-validation.md` — matriz de acciones por nivel (escenarios ID-07, SV-01, SV-02)
- `rules-80-data-and-privacy.md` — `profile_id` y PII no propagados (escenario ID-06)

## 8. Errores comunes

- **Probar solo el camino nominal:** los escenarios de error (ERR-*) son tan importantes como los de éxito. Un sistema que no maneja fallos del Core de forma elegante puede dejar `conv_cases` en estado inconsistente.
- **No verificar la ausencia de PII en los payloads de n8n:** el escenario ID-06 debe verificar explícitamente que el payload enviado a n8n no contiene `profile_id`, no solo que contiene `identity_level`.
- **No probar los estados límite de la máquina de estados:** los escenarios ERR-08 (transición inválida) son críticos para garantizar la integridad del modelo de datos.
- **Asumir que si los tests de unidad pasan, el sistema completo funciona:** los escenarios de este catálogo son de integración. Requieren que las EFs, n8n y el Core estén disponibles o mockeados de forma realista.

## 9. Qué no debe hacerse

- Reducir la cobertura a solo los caminos nominales de los servicios.
- Omitir los escenarios de PII (ID-06, SV-06) porque "es solo privacidad".
- Considerar completa la cobertura de pruebas si no se han verificado los tres niveles de activación (WA-05, WA-06, WA-07, WC-07).
- Escribir tests que llamen directamente a las APIs del Core de SmartRoom desde los workflows de n8n (eso sería un bug en producción, no un test).

## 10. Escenarios mínimos de prueba

Los escenarios de este skill son en sí mismos el catálogo mínimo. La cobertura mínima aceptable para un despliegue a producción incluye:

- Al menos un escenario de cada categoría (WA, WC, ID, RT, SV, ERR)
- Los escenarios WA-01, WA-02, WA-04 (webhook: válido, inválido, duplicado)
- Los escenarios WC-01, WC-03, WC-04, WC-05 (WebChat: origen, anónimo, autenticado activo, ex-inquilino)
- Los escenarios ID-01, ID-04, ID-06, ID-07 (fast-path, escalado por fallos, no propagar PII, MATCH_INACTIVE)
- Los escenarios RT-01, RT-04, RT-06 (enrutado directo, sin servicio, cambio de contexto)
- Los escenarios SV-01, SV-02, SV-08 (incidencia oficial, pre-incidencia, sin marcadores)
- Los escenarios ERR-02, ERR-03, ERR-08 (fallo Core × 3, fire-and-log, transición inválida)

## 11. Criterio de done

El catálogo de escenarios se considera completo para una funcionalidad cuando:

- Todos los caminos de entrada del canal están cubiertos (válido, inválido, duplicado, desactivado)
- Todos los niveles de identidad relevantes para el servicio tienen al menos un escenario
- Los estados límite de la máquina de estados están cubiertos (transiciones válidas e inválidas)
- Los escenarios de fallo del Core están cubiertos (backoff, pre-incidencia, fire-and-log)
- Los invariantes de PII tienen al menos un escenario verificable (ausencia de campos en payloads)

## 12. Documentos relacionados

- `/docs/smart-conversations/tests/` — test specs formales por área (routing, identity, activity-log, failure-recovery, permissions-and-privacy, incidents, listings, help)
- `contract-case-state-machine.md` — transiciones a verificar en escenarios ERR y RT
- `rules-40-identity-validation.md` — niveles de identidad y permisos (escenarios ID y SV)
- `rules-30-whatsapp-channel.md` — comportamiento esperado del webhook (escenarios WA)
- `rules-31-webchat-channel.md` — comportamiento esperado de la sesión (escenarios WC)
- `rules-80-data-and-privacy.md` — invariantes de PII que los tests deben verificar
- `skill-whatsapp-wasender-integration.md` — detalles de implementación para los escenarios WA
- `skill-webchat-gateway.md` — detalles de implementación para los escenarios WC

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`
