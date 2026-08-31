# SmartConversations -- Wasender Webhook Security

Modelo de seguridad del webhook inbound de WhatsApp (conv-wa-webhook).

## Firma HMAC-SHA256

Cada webhook de Wasender lleva la cabecera:

```
X-Wasender-Signature: sha256=<hex>
```

El secreto HMAC se almacena en conv_wa_sessions.webhook_secret (por tenant).
No se usa una variable de entorno global para el secreto.

### Verificacion

1. Leer body como texto raw (antes de parsear JSON).
2. Obtener secreto de conv_wa_sessions para el client_account_id del query param.
3. Calcular HMAC-SHA256(body, secreto).
4. Comparar con la firma del header (timing-safe via crypto.subtle.verify).
5. Si la firma es invalida: devolver 200 silencioso (no revelar al atacante).
6. Si la firma es valida: procesar el mensaje.

### Respuesta 200 silencioso

Conv-wa-webhook devuelve 200 en todos los casos (firma valida o no):
- Evita que un atacante deduzca si la firma era correcta por el codigo de respuesta.
- Wasender no interpreta el cuerpo de la respuesta.

## Filtros de mensajes

Tras verificar la firma:

1. **fromMe**: ignorar mensajes enviados por el propio bot (evitar bucle).
2. **Grupos** (@g.us): ignorar mensajes de grupos -- solo privados.
3. **remoteJid vacio**: descartar si no hay JID.
4. **messageText vacio**: descartar mensajes sin texto (media sin caption).

## Normalizacion de sender_ref

```
remoteJid: "34612345678@s.whatsapp.net"
         -> "34612345678"
         -> "+34612345678"  (sender_ref persistido)
```

Reglas:
- Eliminar @s.whatsapp.net
- Eliminar @c.us si apareciera
- Aniadir + si no tiene prefijo
- Validar longitud minima (7 caracteres tras limpieza)
- Si la normalizacion falla, descartar el mensaje con 200 silencioso

## Lo que conv-wa-webhook NO hace

| Accion prohibida | Razon |
|---|---|
| Loguear sender_ref | Privacidad (telefono) |
| Loguear message_text | Privacidad (contenido) |
| Loguear raw_payload | Privacidad (datos brutos) |
| Loguear firma HMAC | Seguridad |
| Llamar routing directamente | Solo via conv-ingest |
| Decidir el servicio | Solo routing engine |
| Validar identidad | Solo Core |
| Crear casos | Solo EFs de creacion |
| Publicar Activity Log | Solo EFs internas |

## Payload hacia conv-ingest

Conv-wa-webhook solo pasa a conv-ingest:

```json
{
  "client_account_id": "<id>",
  "normalized_message": {
    "channel": "whatsapp",
    "sender_ref": "+34612345678",
    "message_text": "<texto>",
    "provider_message_id": "<id_wasender_o_null>"
  }
}
```

Nunca incluye: raw_payload, JID, webhook_secret, API key.

## JID: regla de contencion

@s.whatsapp.net y @c.us:
- Solo pueden existir en wasender-http-client.ts (construccion del JID saliente)
- y en conv-wa-webhook (normalizacion del JID entrante).
- Nunca se persisten en conv_sessions.sender_ref.
- Nunca se persisten en conv_messages.sender_ref.
- Nunca se envian a n8n.
- Nunca se envian a la IA.
- Nunca se envian a Activity Log.
- Nunca se loguean.

## Onboarding de sesion (referencia)

Ver docs/smart-conversations/wasender-integration/smoke-test-plan.md
seccion "Session QR y ciclo de vida".
