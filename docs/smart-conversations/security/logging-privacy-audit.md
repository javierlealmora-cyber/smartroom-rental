# Logging & Privacy Audit — SmartConversations
<!-- Fase 11B1 · Auditoría 2026-07-21 -->

> Auditoría de logging y privacidad. No modifica código.

---

## Sistema de logging actual

### createSafeLogger

Todos los logs de EFs SC pasan por `createSafeLogger` en `_shared/smart-conversations/ef-logger.ts`.

**Lista de campos PII que redacta automáticamente (22 campos):**
```typescript
const PII_FIELDS_TO_REDACT = new Set([
  'profile_id', 'phone_number', 'full_name', 'room_label', 'residence_name',
  'email', 'assignment_id', 'sender_ref', 'webhook_secret', 'api_key_secret_name',
  'password', 'token', 'secret', 'phone', 'message_text', 'description',
  'raw_payload', 'identity_data', 'jwt', 'authorization'
]);
```

**Comportamiento:** Recursivo en objetos anidados. Reemplaza valores con `[REDACTED]`.

**Output:** JSON estructurado a `console.log` / `console.error` (Supabase Function Logs).

---

## Inventario de sinks de logs

| Fichero / EF | Función | Nivel | Datos potenciales | Sanitizado | Riesgo | Finding |
|---|---|---|---|---|---|---|
| conv-wa-webhook | log.info, log.error | INFO/ERROR | client_account_id, session_id, message_id, is_new_message | ✅ Sí (createSafeLogger) | BAJO | — |
| conv-ingest | log.info, log.error | INFO/ERROR | session_id, channel, is_new_session, has_message_id; NO sender_ref, NO message_text | ✅ Sí | BAJO | — |
| conv-dispatch-message | log.info, log.error | INFO/ERROR | message_id, session_id, channel, workflow_code | ✅ Sí | BAJO | — |
| conv-web-session | log.info, log.error | INFO/ERROR | client_account_id, session_id, is_new | ✅ Sí (sender_ref redactado) | BAJO | — |
| conv-web-message | log.info, log.error | INFO/ERROR | session_id, client_account_id (NO message_text) | ✅ Sí | BAJO | — |
| conv-web-poll | log.info, log.error | INFO/ERROR | session_id, message_count | ✅ Sí | BAJO | — |
| conv-web-deliver | log.info, log.error | INFO/ERROR | session_id, message_id, channel | ✅ Sí | BAJO | — |
| conv-send-wa | log.info, log.error | INFO/ERROR | session_id, message_id; NO sender_ref WA | ✅ Sí | BAJO | — |
| conv-core-get-tenant-features | log.error | ERROR | client_account_id en error log (línea 62) | ✅ Parcial (UUID, no PII estricto) | BAJO | SEC-016 (INFO) |
| conv-core-validate-identity | log.info, log.error | INFO/ERROR | request type (phone/profile_id/session_id); NO valores | ✅ Sí | BAJO | — |
| conv-core-publish-activity | log.info, log.error | INFO/ERROR | event_type, client_account_id; NO payload completo | ✅ Sí | BAJO | — |
| conv-escalate-case | log.info, log.error | INFO/ERROR | case_id, reason (whitelist) | ✅ Sí | BAJO | — |
| conv-close-case | log.info, log.error | INFO/ERROR | case_id, session_id | ✅ Sí | BAJO | — |
| conv-routing-engine | log.info, log.error | INFO/ERROR | session state machine transitions; NO PII | ✅ Sí | BAJO | — |
| conv-identity-progressive | log.info, log.error | INFO/ERROR | session_id, identity_level transitions | ✅ Sí | BAJO | — |
| conv-process-send-queue | log.info, log.error | INFO/ERROR | queue item count, message_id | ✅ Sí | BAJO | — |
| Wasender client adapter | log.error | ERROR | Error response (no body completo) | ✅ Parcial | BAJO | Verificar cuando Wasender sea real |
| IA client adapter | log.error | ERROR | Error response (mock) | ✅ Parcial | BAJO | Verificar cuando IA sea real |
| Core client adapter | log.error | ERROR | Error response (mock) | ✅ Parcial | BAJO | Verificar cuando Core sea real |
| WebChat frontend (webchat-errors.js) | console.error (si debug=true) | DEBUG | Solo códigos de error genéricos | ✅ Sí (SAFE_MESSAGES) | BAJO | SEC-022 (si debug=true en prod) |
| CI scripts (pr-checks.yml) | echo / stdout | INFO | Build output, test results | N/A | BAJO | No hay echo de secrets |
| validate-release-readiness.mjs | console.log | INFO | Nombres de archivos, check IDs | ✅ Sin secrets | BAJO | — |

---

## Verificaciones específicas de privacidad

| Campo | Logueable | Estado | Evidencia |
|---|---|---|---|
| `message_text` | ❌ No | ✅ Correcto | PII_FIELDS_TO_REDACT incluye message_text; conv-ingest no loguea texto |
| `sender_ref` | ❌ No | ✅ Correcto | PII_FIELDS_TO_REDACT incluye sender_ref |
| `phone` | ❌ No | ✅ Correcto | PII_FIELDS_TO_REDACT incluye phone y phone_number |
| `profile_id` | ❌ No | ✅ Correcto | PII_FIELDS_TO_REDACT incluye profile_id |
| `identity_data` | ❌ No | ✅ Correcto | PII_FIELDS_TO_REDACT incluye identity_data |
| `raw_payload` | ❌ No | ✅ Correcto | PII_FIELDS_TO_REDACT incluye raw_payload |
| `token` / `jwt` / `authorization` | ❌ No | ✅ Correcto | PII_FIELDS_TO_REDACT incluye token, jwt, authorization |
| `service_role` | ❌ No | ✅ Correcto | PII_FIELDS_TO_REDACT incluye "secret" (matches service_role key context) |
| `webhook_secret` | ❌ No | ✅ Correcto | PII_FIELDS_TO_REDACT incluye webhook_secret explícitamente |
| `api_key_secret_name` | ⚠️ Nombre OK, no valor | ✅ Correcto | PII_FIELDS_TO_REDACT incluye api_key_secret_name |
| `full_name` / `email` | ❌ No | ✅ Correcto | Incluidos en PII_FIELDS_TO_REDACT |
| `JID` (wasender sender) | ❌ No | ✅ Correcto | conv-ingest verifica sender_ref no es JID; no loguea valor |
| `client_account_id` | ✅ Sí (UUID opaco) | OK | No es PII estricto; no en PII list |
| `session_id` | ✅ Sí (UUID opaco) | OK | Identificador técnico opaco |
| `message_id` | ✅ Sí (UUID opaco) | OK | Identificador técnico opaco |
| `case_id` | ✅ Sí (UUID opaco) | OK | Identificador técnico opaco |
| `channel` (enum) | ✅ Sí | OK | Valor enum: webchat / whatsapp |

---

## Activity Log — verificación de PII

`PII_FIELDS_FORBIDDEN_IN_ACTIVITY_LOG` (de privacy-guards.ts):
```typescript
// Extiende PII_FIELDS_FORBIDDEN_IN_N8N con:
// + message_text
// + description
```

**Verificación por EF que llama conv-core-publish-activity:**

| EF | Evento publicado | PII en payload | Estado |
|---|---|---|---|
| conv-escalate-case | `conv_case_escalated` | reason (whitelist: identity_failed, no_kb_match, admin_requested), case_id, session_id | ✅ Sin PII |
| conv-close-case | `conv_case_closed` | case_id, session_id, channel, case_ref_type | ✅ Sin PII |

---

## Privacidad en provider adapters (mocks)

| Adapter | PII recibido | PII enviado a proveedor | Estado |
|---|---|---|---|
| Core identity adapter | phone (WA) o profile_id (WebChat) | phone o profile_id (necesario para identidad) | ⚠️ Pendiente verificación en adapter real |
| Core listings adapter | search_query (texto búsqueda) | search_query | ⚠️ Pendiente verificación en adapter real |
| IA adapter | message_text (en prompt) | message_text → potencial PII | ⚠️ SEC-025 — debe sanitizarse antes de enviar a IA |
| n8n adapter | event payload | event payload sin PII (guards activos) | ✅ Guards verificados en mock |
| Wasender adapter | message_text (template), sender_ref WA | message_text, sender_ref WA | ⚠️ Pendiente verificación en adapter real |

---

## Hallazgos de logging y privacidad

| Finding | Descripción | Severidad |
|---|---|---|
| SEC-016 | conv-core-get-tenant-features loguea client_account_id en error (no PII estricto pero mejorable) | INFO |
| SEC-022 | VITE_WEBCHAT_DEBUG=true activaría logs en browser con datos técnicos | LOW |
| SEC-023 | PII list de ef-logger no cubre 'api_key', 'key', 'credential' explícitamente (aunque 'secret' los cubre parcialmente) | LOW |
| SEC-024 | Adapters de Core, IA y Wasender en modo real necesitan auditoría de logs (actualmente mock) | MEDIUM (pendiente) |
| SEC-025 | IA adapter debe sanitizar message_text antes de incluir en prompt (pendiente Fase real) | HIGH (en Fase real) |

---

## Estado de GATE_1

Logging auditado. Sistema de redacción automático funcional. Pendientes en adapters reales.

**GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING**
