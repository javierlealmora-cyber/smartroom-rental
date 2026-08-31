# n8n Privacy & Retention Model — Fase 11C4

## Datos que NUNCA llegan a n8n

El `OrchestrationInputDTO` excluye explícitamente todos los campos PII:

```
profile_id, sender_ref, phone, email, identity_data, raw_payload,
jid, ip_address, webchat_token, authorization, service_role,
api_key, secret, jwt, client_secret, access_token, refresh_token,
matching_candidates, identity_score, identity_raw, verification_code
```

n8n solo recibe:
- `identity_level` (enum: NO_MATCH | MATCH_INACTIVE | PARTIAL_MATCH_ACTIVE | STRONG_MATCH_ACTIVE)
- `safe_message.text` (max 2000 chars, sin PII validado antes de envío)
- `safe_context` (datos de negocio no-PII: service_code, channel, conversation_state)

## Datos que n8n NO puede devolver

`OrchestrationOutputDTO` rechaza los siguientes campos si aparecen en la respuesta:

```
profile_id, phone, email, identity_data, raw_payload, authorization,
service_role, api_key, secret, jwt, sql, execute_command, eval, client_account_id (si difiere del original)
```

## safe_message.text — validación antes de envío

El campo `safe_message.text` está limitado a 2000 caracteres.
La EF es responsable de que el texto no contenga PII antes de incluirlo.
El adapter no loguea `safe_message.text`.

## Retención (retention) de ejecuciones en n8n DEV

Configuración recomendada para la instancia n8n DEV:

| Tipo de ejecución | Retención recomendada |
|-------------------|-----------------------|
| Exitosas (success) | 1 día (pruning automático) |
| Con error | 7 días (para debugging) |
| En curso | Sin límite (mientras active) |

**Activar `pruning` en n8n DEV** para evitar acumulación de ejecuciones con datos de contexto.

## Logs del adapter

El adapter n8n:
- ✅ Loguea: `workflow_code`, `mode`, `latency_ms`, `ok`, `error_code` (sin mensaje)
- ❌ No loguea: `safe_message.text`, `safe_context`, response raw, headers completos, tokens

## Credentials en n8n DEV

- `N8N_SERVICE_TOKEN` → almacenado en Supabase Vault (DEV), nunca en código
- `N8N_WEBHOOK_BASE_URL` → variable de entorno DEV, no en código
- Stubs de workflows → sin credenciales embebidas (`pinData` prohibido)

## Compliance

- n8n no accede a `conv_sessions`, `conv_messages`, `conv_cases`
- n8n no puede usar `service_role`
- n8n no puede generar ni modificar `identity_level`
- Toda escritura en DB pasa por EFs de SmartConversations

## GATE_1

`AUDIT_COMPLETE_REMEDIATION_PENDING` — verificar que la configuración de retención
está activa antes de activar modo real en DEV.
