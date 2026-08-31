# Core Activity Contract — Fase 11C2

Adapter: `core-activity-adapter.ts`
Endpoint Core: `POST /smartroom/conversations/activity`

---

## Los 13 eventos Activity Log oficiales (allowlist exhaustiva)

| Evento | Descripción |
|--------|-------------|
| `conv_subscription_activated` | Activación de suscripción SmartConversations |
| `conv_channel_connected` | Canal conectado (WhatsApp/WebChat) |
| `conv_channel_offboarded` | Canal desconectado |
| `conv_conversation_started` | Conversación iniciada |
| `conv_identity_validated` | Identidad validada contra Core |
| `conv_pre_incident_created` | Pre-incidencia creada |
| `conv_incident_created` | Incidencia creada |
| `conv_lead_created` | Lead creado |
| `conv_case_escalated` | Caso escalado |
| `conv_case_summary_updated` | Resumen de caso actualizado |
| `conv_case_closed` | Caso cerrado |
| `conv_case_created` | Caso creado |
| `conv_message_delivery_failed` | Fallo de entrega de mensaje |

**No añadir eventos** sin decisión arquitectónica explícita.
**Prohibido**: `conv_help_escalated`, eventos compuestos.

---

## Request canónico (ActivityPublishRequest)

```typescript
{
  event_type: ActivityEventType;
  client_account_id: string;
  correlation_id: string;
  idempotency_key: string;       // aislada por tenant
  metadata?: Record<string, unknown>;
}
```

## Headers requeridos

```
Authorization: Bearer <CORE_SERVICE_TOKEN>
Content-Type: application/json
X-Client-Account-Id: <client_account_id>
X-Request-Id: <correlation_id>
Idempotency-Key: <idempotency_key>
X-Source: smart_conversations
```

---

## PII prohibida en metadata (ACTIVITY_FORBIDDEN_METADATA_FIELDS)

`message_text`, `phone`, `email`, `sender_ref`, `profile_id`, `identity_data`,
`raw_payload`, `jid`, `wa_jid`, `token`, `service_role`, `authorization`,
`provider_response`, `conversation`, `messages`, `full_name`, `room_label`,
`residence_name`, `assignment_id`, `phone_number`.

---

## Patrón fire-and-log

- Nunca propaga error al caller de la operación principal.
- 409 Conflict = idempotent replay (ok, `idempotent: true`).
- Fallo no-409 = `published: false` sin excepción.
- Excepción capturada = `published: false` sin propagación.

---

## Restricciones de modo

| Modo | Comportamiento |
|------|---------------|
| `mock` | `published: true` simulado |
| `shadow` | **RECHAZADO** — `shadow_not_allowed_for_activity_log` |
| `canary` | Real para `CANARY_ALLOWLIST` |
| `real` | Real (solo DEV) |
| `disabled` | Error inmediato |
