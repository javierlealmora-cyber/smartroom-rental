# SmartConversations -- WebChat: Modelo de seguridad

## Principios

1. **No exponer service_role al frontend.** El widget nunca ve ni envia service_role.
2. **sender_ref opaco.** Formato wc_<32hex>. No contiene telefono ni PII.
3. **Origin permitido.** Solo origenes en WEBCHAT_ALLOWED_ORIGINS son aceptados en mode=real.
4. **Sesion pertenece al tenant.** session_id + client_account_id se validan juntos.
5. **sender_ref pertenece a la sesion.** El widget no puede usar un sender_ref ajeno.
6. **No se acepta channel distinto a webchat.** Las EFs de WebChat solo procesan channel=webchat.
7. **No se acepta service_role desde el frontend.** Si llega en el body, el campo se ignora.

## Campos prohibidos en la respuesta al widget

Los siguientes campos nunca se incluyen en ninguna respuesta al widget:

| Campo | Razon |
|-------|-------|
| `service_role` | Secret del backend |
| `profile_id` | Identidad interna |
| `phone` / `phone_number` | PII |
| `identity_data` | Datos de validacion interna |
| `raw_payload` | Payload tecnico sin sanitizar |
| `room_id` | ID interno de habitacion |
| `assignment_id` | ID interno de asignacion |
| `tokens` / `authorization` / `jwt` | Credenciales |
| `sender_ref` | En mensajes outbound: no se devuelve al widget |
| `full_name` / `email` | PII |

## Identidad WebChat -- fuera de alcance hasta JWT real

El widget publico **no puede enviar datos de identidad**:
- No acepta `profile_id` sin JWT firmado.
- No acepta `phone` ni `phone_number`.
- No acepta `identity_data`.
- Si se envian estos campos, conv-web-session devuelve HTTP 400.

Toda sesion WebChat inicia con `identity_level=NO_MATCH`.
La identidad autenticada (para clientes con cuenta) se implementara en una fase posterior
usando JWT firmado por Supabase Auth + validacion por conv-core-validate-identity.
Hasta entonces, NO se llama a conv-core-validate-identity con datos del widget publico.

## Modelo de autenticacion

El canal WebChat es **publico** en su entrada:
- El widget no envia service_role.
- La autenticacion se basa en `client_account_id` + `session_id` + `sender_ref` (triple validacion).
- Internamente las EFs usan service_role para consultar Supabase (nunca expuesto).

## Validacion de origin

```
WEBCHAT_ALLOWED_ORIGINS=https://app.tenant.com,https://admin.tenant.com
```

- Si la lista esta vacia: cualquier origin es aceptado (recomendado solo para mode=mock o desarrollo).
- Si origin no esta en la lista: HTTP 403 Forbidden.
- Si el request no tiene header Origin (server-side): se permite siempre.

## Feature flag

```
WEBCHAT_INTEGRATION_MODE=mock   # default -- sin validaciones estrictas de origin/widget
WEBCHAT_INTEGRATION_MODE=real   # validaciones estrictas activas
```

El modo real activa:
- Validacion estricta de origin contra lista del tenant.
- Validacion de widget_public_key (si se configura).

## Lo que WebChat NO hace

| Accion | Responsable real |
|--------|-----------------|
| Decidir routing | conv-dispatch-message |
| Validar identidad real | conv-core-validate-identity (Fase 5+) |
| Crear casos | conv-ingest / conv-dispatch-message |
| Publicar Activity Log | conv-core-publish-activity |
| Llamar Core real | No aplica en WebChat |
| Llamar IA real | No aplica en WebChat |
| Llamar n8n real | No aplica en WebChat |
| Enviar WhatsApp | conv-send-wa / conv-process-send-queue |
| Acceder a conv_wa_sessions | Solo EFs de WhatsApp |

## JID containment

Los JIDs de WhatsApp (@s.whatsapp.net, @c.us) son exclusivos del canal WhatsApp.
WebChat nunca construye, persiste ni loguea JIDs.

## Rate limit (documentado)

El rate limit conceptual es `WEBCHAT_RATE_LIMIT_PER_MINUTE=30` mensajes por sesion por minuto.
La implementacion real de rate limit se activa en una fase posterior con middleware de Supabase.
