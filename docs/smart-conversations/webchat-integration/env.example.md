# SmartConversations -- WebChat Integration: Variables de entorno

Variables para la integracion con el canal WebChat embebible.
**No incluir valores reales. No commitear API keys ni secrets.**

## Control de modo (obligatoria)

```dotenv
# Modo de integracion WebChat: 'mock' (default) o 'real'
# Si no se define, el sistema usa mock.
WEBCHAT_INTEGRATION_MODE=mock
```

## Variables de seguridad (requeridas en mode=real)

```dotenv
# Origenes permitidos para el widget (lista separada por comas)
# Si esta vacio, cualquier origin es aceptado (solo en mode=mock)
WEBCHAT_ALLOWED_ORIGINS=https://miapp.example.com,https://admin.example.com

# Clave publica del widget (opcional, para validacion adicional en mode=real)
WEBCHAT_WIDGET_PUBLIC_KEY=REPLACE_WITH_WIDGET_PUBLIC_KEY
```

## Variables de tuning (opcionales)

```dotenv
# TTL de sesion WebChat en minutos (default: 120)
WEBCHAT_SESSION_TTL_MINUTES=120

# Rate limit conceptual por sesion/minuto (default: 30, documentado)
WEBCHAT_RATE_LIMIT_PER_MINUTE=30

# Longitud maxima de mensaje en caracteres (default: 2000)
WEBCHAT_MAX_MESSAGE_LENGTH=2000
```

## Notas de seguridad

1. WEBCHAT_WIDGET_PUBLIC_KEY nunca se usa como service_role.
2. service_role nunca se expone al frontend.
3. sender_ref WebChat es siempre opaco: formato wc_<32hex>.
4. No se usa telefono como sender_ref en WebChat.
5. No se usan JIDs (@s.whatsapp.net, @c.us) en WebChat.
6. En mode=mock el sistema funciona sin variables reales definidas.
7. profile_id, identity_data y raw_payload nunca se devuelven al widget.
8. WebChat no llama Wasender, Core real, IA real ni n8n real.
9. WebChat no accede a conv_wa_sessions.
10. Todos los servicios activos son: conv_incidencias, conv_publicaciones, conv_ayuda.
