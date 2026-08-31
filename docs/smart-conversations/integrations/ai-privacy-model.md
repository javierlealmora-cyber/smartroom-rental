# AI Integration — Privacy Model

**Fase:** 11C3  
**Fecha:** 2026-07-24

## Campos prohibidos en input AI

Los siguientes campos **nunca** llegan al proveedor AI (definidos en `AI_FORBIDDEN_INPUT_FIELDS`):

```
profile_id        sender_ref        phone             phone_number
email             identity_data     raw_payload       jid
wa_jid            webchat_token     authorization     service_role
full_name         room_label        residence_name    assignment_id
contact           ip_address        tokens            jwt
api_key           secret
```

## Campos prohibidos en output AI

Si el proveedor devuelve alguno de estos campos, el output se **rechaza** (fallback determinista):

```
identity_level    client_account_id    profile_id    session_status
case_status       access_token         service_role  sql
tool_call         api_key              authorization
```

## Qué puede recibir el proveedor

Solo `safe_text`: texto sanitizado de la conversación, máximo 4000 caracteres.

No viajes de datos: `client_account_id` y `correlation_id` se envían para trazabilidad, pero nunca contienen datos personales.

## Logs prohibidos

No se registra en ningún log:
- Texto de entrada completo
- Texto de salida completo
- Prompt completo enviado al proveedor
- Respuesta raw del proveedor
- Headers, tokens, secrets, API keys

## Validación de prompt injection

1. El texto de usuario se pasa como **dato**, no como instrucción privilegiada
2. El output del proveedor se valida contra el schema canónico
3. Campos prohibidos en output → rechazo inmediato + fallback
4. SQL/HTML/script en output → rechazo inmediato
5. La confianza devuelta por la IA **no es autoritativa** — SmartConversations decide
