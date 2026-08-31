# Data Classification — SmartConversations
<!-- Fase 11B1 · Auditoría 2026-07-21 -->

> Clasificación canónica de datos. No modifica contratos, tablas ni políticas.
> Categorías: public | internal | confidential | restricted | secret

---

## Escala de clasificación

| Categoría | Descripción |
|---|---|
| `public` | Sin restricción de exposición; aceptable en logs y respuestas al cliente |
| `internal` | Uso interno de la plataforma; no al widget pero no requiere cifrado especial |
| `confidential` | Identificadores de sesión/caso; exposición limitada; requiere control de acceso |
| `restricted` | PII; exposición mínima; prohibido en logs, n8n, IA sin justificación |
| `secret` | Credenciales, tokens HMAC, API keys; nunca en frontend, logs ni versión |

---

## Tabla canónica de clasificación

| Campo | Clasificación | Origen | Almacenamiento / Tablas | EFs que procesan | Destinos | Logs OK | Logs PROHIBIDOS | n8n OK | IA OK | Activity Log OK | Retención | Riesgo | Control existente | Control pendiente |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `client_account_id` | internal | Widget config / JWT | conv_sessions, conv_messages, conv_cases, conv_send_queue, conv_wa_sessions, conv_wc_configs, conv_admin_notifications, conv_service_activations | Todas las EFs | Widget (lectura), Activity Log | Sí (UUID opaco) | No como PII | Sí (solo UUID) | No (innecesario) | Sí | Indefinida (FK base) | Oracle de tenant | RLS service_role only | Ninguno pendiente |
| `session_id` | confidential | conv-web-session (generado) | conv_sessions, conv_messages, conv_cases, conv_send_queue | conv-web-session, conv-web-message, conv-web-poll, conv-dispatch, conv-ingest, conv-routing-engine | Widget (read), Activity Log (opaco) | Solo UUID | Nunca como texto claro | Solo UUID | Solo UUID | Sí (opaco) | Duración sesión | IDOR si no verificado | DB lookup en EFs | Rate limiting convocación |
| `case_id` | confidential | conv-ingest / conv-escalate-case | conv_cases, conv_messages | conv-ingest, conv-escalate-case, conv-close-case, conv-dispatch | Activity Log (opaco) | Sí (UUID) | — | Solo UUID | No | Sí (opaco) | Duración caso | IDOR | DB lookup | Ninguno pendiente |
| `message_id` | internal | conv-ingest (generado) | conv_messages, conv_send_queue | conv-dispatch, conv-send-wa, conv-web-deliver | Activity Log (referencia) | Sí | — | Solo ref | No | Solo ID | 30 días (raw_payload) | Bajo | DB insert idempotente | Purga raw_payload |
| `sender_ref` | restricted | conv-web-session (wc_<32hex>) / WhatsApp sender | conv_sessions | conv-ingest, conv-web-session, conv-web-message, conv-web-poll | Widget (devuelto en creación de sesión) | No | Sí — nunca en logs | No | No | No | Duración sesión | Identifica sesión anónima; si WA puede ser teléfono | Opacidad wc_ para WebChat; JID rechazado en ingest | Verificar WA sender_ref no es JID |
| `message_text` | restricted | Widget / WhatsApp | conv_messages.text | conv-ingest, conv-dispatch, conv-web-deliver, conv-web-poll | Widget (outbound); n8n (vía template) | No | Sí — nunca en logs | Solo template interpolado | Solo template | No | 30 días + raw_payload 30 días | PII del usuario | SAFE_ERROR_TEXT genérico; no en logger | Verificar guards en EFs de WF |
| `identity_data` | restricted | conv-core-validate-identity / Core | conv_sessions.identity_data (jsonb) | conv-core-validate-identity, conv-ingest | Activity Log (resumen sin PII) | No | Sí — nunca | No | No | No | Duración sesión | PII crítico (nombre, email, etc.) | PII_FIELDS_FORBIDDEN_IN_N8N | Guards en future WF steps |
| `profile_id` | restricted | Core (respuesta de identidad) | conv_sessions.profile_id | conv-core-validate-identity, conv-ingest | Solo DB | No | Sí — nunca | No | No | No | Duración sesión | Identificador real de usuario | PII_FIELDS_FORBIDDEN_IN_N8N | Verificar no llega a n8n |
| `room_id` | confidential | Core (listados) | No persiste en conv_* | conv-core-query-listings | No persiste | No | Sí — nunca al widget | Solo ID | No | No | Transitorio | Información comercial sensible | sanitizeWebchatOutput en respuesta | Verificar en WF-30 |
| `assignment_id` | confidential | Core (asignaciones) | No persiste en conv_* | conv-wf30-listings | No persiste | No | Sí — nunca al widget | Solo ID | No | No | Transitorio | Identificador de asignación | sanitizeWebchatOutput | Verificar en WF-30 |
| `phone` | restricted | WA sender_ref / Core identity | conv_sessions (vía sender_ref en WA) | conv-core-validate-identity, conv-ingest | Solo Core (validación) | No | Sí — nunca | No | No | No | Duración sesión | PII máximo nivel (GDPR) | Opacidad WebChat; JID rechazado | Auditar conv-ingest WA path |
| `phone_number` | restricted | Core identity response | conv_sessions.identity_data (anidado) | conv-core-validate-identity | Solo DB | No | Sí — nunca | No | No | No | Duración sesión | PII máximo nivel | Logger redacta automáticamente | — |
| `email` | restricted | Core identity response | conv_sessions.identity_data | conv-core-validate-identity | Solo DB | No | Sí — nunca | No | No | No | Duración sesión | PII (GDPR) | Logger redacta automáticamente | — |
| `full_name` | restricted | Core identity response | conv_sessions.identity_data | conv-core-validate-identity, conv-ingest | Solo DB | No | Sí — nunca | No | Solo si anonimizado | No | Duración sesión | PII (GDPR) | Logger redacta automáticamente | Verificar guard en IA adapter |
| `raw_payload` | restricted | WA webhook body / inbound completo | conv_messages.raw_payload (jsonb) | conv-wa-webhook, conv-ingest | Solo DB (no al widget, no a n8n, no a IA) | No | Sí — nunca | No | No | No | 30 días (TODO: purga pendiente) | PII potencial en payload completo | sanitizeWebchatOutput lo excluye; PII guards | Implementar purga automática (SEC-007) |
| `wasender_message_id` | internal | Wasender webhook | conv_messages.wasender_message_id | conv-wa-webhook, conv-ingest | Solo DB (dedup) | Sí (ID opaco) | No | No | No | No | 30 días | Deduplica mensajes; no PII | UNIQUE parcial en DB | — |
| `wasender_session_id` | confidential | Wasender webhook body | conv_wa_sessions.wasender_session_id | conv-wa-webhook | Solo DB | Sí (ID opaco) | No | No | No | No | Duración sesión WA | Identifica sesión WA del tenant | UNIQUE en DB | — |
| `incident_id` / `lead_id` | confidential | Core (respuesta WF) | conv_cases.case_ref | conv-wf20-incidents, conv-wf30-listings, conv-core-create-incident, conv-core-create-lead | Activity Log (referencia) | Sí (ID) | — | Solo ID | No | Sí (ID) | Duración caso | Referencia a entidad Core | Solo IDs en Activity Log | — |
| `summaries` | internal | conv-escalate-case (metadata) | conv_cases.summary | conv-escalate-case, conv-close-case | Activity Log (resumen) | Sí (resumen) | No si contiene PII | Sí (resumen) | No | Sí | Duración caso | Puede contener PII si resumen fue mal construido | Guards en escalate | Verificar que summary no contiene message_text |
| Activity Log payload | internal | conv-core-publish-activity | conv_activity_log (Core DB, no conv_*) | conv-core-publish-activity | Core (Activity Log) | Solo eventos de negocio | Nunca message_text, sender_ref, profile_id, identity_data | N/A | No | Sí (es el destino) | Según Core | PII si se envían campos prohibidos | PII_FIELDS_FORBIDDEN_IN_ACTIVITY_LOG | Verificar en cada EF que llama publish-activity |
| WebChat session token | secret | conv-web-session (HMAC-SHA256) | sessionStorage del browser (si signed_token mode) | conv-web-session, conv-web-message, conv-web-poll | Widget solamente | No | Sí — nunca | No | No | No | TTL 120 min (configurable) | Token de autorización WebChat | WEBCHAT_AUTH_MODE=legacy por defecto (no se usa) | Activar signed_token mode (SEC-004) |
| API keys (SUPABASE_ANON_KEY) | internal | Supabase proyecto | Frontend bundle (VITE_) | Supabase client (frontend) | Bundle público | No | No (pero es pública por diseño) | No | No | No | Rotación manual | pública por diseño de Supabase; no es un secreto per se | RLS protege datos | — |
| `service_role` (SUPABASE_SERVICE_ROLE_KEY) | secret | Supabase proyecto | Deno.env en EFs; secrets en CI para EF deployment | Todas las EFs con service_role | Solo runtime de EF | No | Sí — NUNCA | No | No | No | Rotación manual recomendada | NO en frontend; NO en VITE_ | Auditoría CI; scripts/validate-security confirma | — |
| WebChat signing secret (WEBCHAT_SESSION_SIGNING_SECRET) | secret | Configuración operador | Deno.env en conv-web-session, conv-web-message, conv-web-poll | EFs de WebChat | No | No | Sí — NUNCA | No | No | No | Rotación manual | Prohibición explícita de usar service_role como signing secret | Logger redacta | — |
| Wasender API key | secret | Wasender proveedor | conv_wa_sessions.api_key_secret_name (solo nombre) → Supabase Vault | conv-send-wa (vía Vault) | No | No | Sí — NUNCA | No | No | No | Rotación por proveedor | Solo el nombre se almacena en DB; valor en Vault (TODO: Fase 9) | api_key_secret_name solo guarda nombre | Completar migración a Vault (SEC-005) |
| Wasender webhook secret | secret | Wasender proveedor | conv_wa_sessions.webhook_secret (texto claro — SEC-005) | conv-wa-webhook | No | No | Sí — NUNCA | No | No | No | Rotación manual | Solo accesible con service_role | PLAINTEXT en DB — pendiente Vault | Migrar a Vault (SEC-005) |
| n8n secret | secret | n8n configuración | Deno.env (n8n auth header) | EFs que llaman n8n stubs | No | No | Sí — NUNCA | N/A | No | No | Rotación manual | Logger redacta | — |
| Authorization header | secret | Request HTTP | Solo en memoria durante request | Todas las EFs | No | No | Sí — NUNCA | No | No | No | Transitorio | Logger redacta campo "authorization" automáticamente | — |
| Provider responses (Core, IA, Wasender) | confidential | Proveedores externos | Solo en memoria; persistencia selectiva en identity_data | Adapters Core/IA/Wasender | No (salvo ID opaco) | Nunca respuesta completa | No | No | No | Transitorio | Pueden contener PII | Adapters filtran antes de persistir | Verificar adapter IA |
| Logs (output de logger) | internal | EFs (createSafeLogger) | Supabase Edge Function logs / stdout | createSafeLogger | Supabase Logs (no externo) | Solo campos no-PII | Ver lista PII_FIELDS_TO_REDACT | No | No | No | 30 días (Supabase default) | Logs pueden accederse con service_role o via dashboard | 22 campos PII redactados automáticamente | Auditar logs periódicamente |

---

## Reglas oficiales verificadas

| Regla | Estado | Evidencia |
|---|---|---|
| sender_ref es PII si representa teléfono WA | ✅ Documentada | conv-ingest rechaza JID (@c.us); sender_ref en logger PII list |
| JID nunca se persiste | ✅ Activo | `validateOpaqueSenderRef()` rechaza @c.us en conv-ingest |
| profile_id no se envía a n8n | ✅ Activo | PII_FIELDS_FORBIDDEN_IN_N8N contiene profile_id |
| message_text no se publica en Activity Log | ✅ Activo | PII_FIELDS_FORBIDDEN_IN_ACTIVITY_LOG contiene message_text |
| token WebChat no se loguea | ✅ Activo | "token" en PII_FIELDS_TO_REDACT; logger redacta |
| service_role nunca llega al frontend | ✅ Activo | No hay VITE_SUPABASE_SERVICE_ROLE_KEY; validador verifica |
| IA no recibe identidad innecesaria | ⚠️ Pendiente verificación en adapter IA real | Adapter IA es mock en Fase 11A; guards definidos |
| Activity Log contiene eventos resumidos de negocio | ✅ Activo | conv-close-case, conv-escalate-case envían solo IDs y enums |
| raw_payload no se devuelve al widget | ✅ Activo | WEBCHAT_FORBIDDEN_OUTPUT_FIELDS contiene raw_payload; conv-web-poll no devuelve |
| Wasender IDs no llegan al widget | ✅ Activo | sanitizeWebchatOutput elimina wasender_message_id, wasender_session_id |
| Teléfono no se usa como sender_ref WebChat | ✅ Activo | sender_ref generado como wc_<32hex> en conv-web-session |

---

## Estado de GATE_1

La clasificación está completa. Los hallazgos de privacidad están en `security-findings.md`.

**GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING**
