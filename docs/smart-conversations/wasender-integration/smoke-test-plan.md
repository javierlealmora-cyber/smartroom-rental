# SmartConversations -- Wasender Smoke Test Plan

Plan de validacion controlada contra Wasender sandbox/real.
**No ejecutar contra produccion sin revision del equipo.**

## Estado actual

**Wasender real no esta activo.**
El sistema funciona en WASENDER_INTEGRATION_MODE=mock por defecto.
Este plan se activa solo cuando se confirme endpoint sandbox y API key de prueba.

## Precondiciones para ejecucion real

Antes de ejecutar contra Wasender real, confirmar:

- [ ] Endpoint sandbox disponible (no usar el de produccion)
- [ ] API key de prueba generada (no usar la de produccion)
- [ ] Numero de telefono de prueba disponible (no usar numero de cliente real)
- [ ] Sesion Wasender de prueba configurada en sandbox
- [ ] WASENDER_SMOKE_ENABLED=true establecido explicitamente
- [ ] WASENDER_INTEGRATION_MODE=real establecido explicitamente
- [ ] No hay patrones de URL de produccion en WASENDER_BASE_URL

## Variables necesarias para smoke real (solo sandbox)

```dotenv
WASENDER_SMOKE_ENABLED=true
WASENDER_INTEGRATION_MODE=real
WASENDER_API_KEY=<token_sandbox>
WASENDER_BASE_URL=<url_sandbox>
WASENDER_SMOKE_WA_SESSION_ID=<session_test>
WASENDER_SMOKE_RECIPIENT=<numero_test_sin_pii>
```

## Flujos por validar en smoke real

### WS-SMOKE-01: Envio de mensaje de texto
- POST /api/sendText con JID correcto
- Respuesta 200 con messageId
- provider_message_id registrado en conv_messages

### WS-SMOKE-02: Webhook inbound
- Recepcion de webhook con firma HMAC valida
- Normalizacion de remoteJid a sender_ref
- Llamada a conv-ingest con payload correcto

### WS-SMOKE-03: Firma invalida
- Webhook con firma incorrecta devuelve 200 silencioso
- conv-ingest NO llamado

### WS-SMOKE-04: Rate limiting
- 429 dispara retry con backoff configurado
- Maximo WASENDER_MAX_RETRIES intentos

### WS-SMOKE-05: Timeout
- Timeout dispara retry hasta max intentos
- Error final controlado devuelto

## Seguridad del runner

El smoke runner (scripts/smart-conversations/wasender-smoke.ts):
- Por defecto imprime "wasender smoke disabled" sin llamar fetch
- Exige WASENDER_SMOKE_ENABLED=true para cualquier llamada real
- Bloquea si WASENDER_BASE_URL contiene dominios de produccion reales (esos patrones incluyen los dominios de produccion reales del proyecto, no se listan aqui por seguridad)
- No imprime API key ni numero de telefono en logs
- No imprime cuerpo completo del mensaje

## Session QR y ciclo de vida

### Conexion de una sesion Wasender por tenant

1. Admin conecta una sesion Wasender en el panel de gestion.
2. Se genera un QR para vincular el numero de WhatsApp al servidor Wasender.
3. Una vez vinculado, Wasender asigna un session_id.
4. Se registra en conv_wa_sessions:
   - wasender_session_id: ID de sesion en Wasender
   - status: 'active'
   - webhook_secret: secreto HMAC para validar webhooks
5. La URL del webhook se configura en Wasender apuntando a conv-wa-webhook?client_account_id=<id>

### Estados de conv_wa_sessions (ya existentes)

Los estados de conv_wa_sessions son los ya definidos en el schema actual.
No se introducen nuevos estados en esta fase.

### Pausa logica vs desconexion definitiva

- Pausa logica: conv_service_activations.is_active=false -- la sesion Wasender sigue activa pero el routing no procesa mensajes.
- Desconexion definitiva: eliminar o desactivar la sesion Wasender en el proveedor + conv_wa_sessions.status != 'active'.
- Reconexion QR: se gestiona desde el panel de administracion -- fuera del alcance de Fase 10D.

### Almacenamiento de estado

- Estado de sesion: conv_wa_sessions.status
- ID de sesion del proveedor: conv_wa_sessions.wasender_session_id
- Secreto HMAC: conv_wa_sessions.webhook_secret (no se persiste en env global)
- No se crean tablas nuevas en esta fase.

## Restricciones

- No conectar Wasender real en tests automatizados.
- No enviar WhatsApps reales en tests.
- No usar API key real en tests.
- No ejecutar smoke contra produccion sin revision.
- Este plan no es un spec tecnico oficial -- es una guia operativa.
