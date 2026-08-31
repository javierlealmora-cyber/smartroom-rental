# n8n Integration Contracts — Fase 11C4

## Principio arquitectónico

n8n es un orquestador de negocio externo. SmartConversations mantiene toda la identidad,
el estado de sesión y las escrituras en DB. n8n coordina secuencias y llama de vuelta a las
Edge Functions canónicas.

**n8n puede:**
- Recibir contexto seguro y anonimizado
- Llamar EFs autorizadas mediante callbacks
- Responder con `next_action` (tipo + target + payload)
- Aplicar lógica de negocio y secuencias

**n8n NO puede:**
- Acceder a Supabase DB directamente
- Generar/modificar identity_level
- Llamar a EFs fuera del allowlist de `allowed_callbacks`
- Recibir PII (profile_id, phone, email, identity_data, raw_payload)
- Usar service_role

## Modos de integración

| Modo | Descripción | Requiere instancia real |
|------|-------------|------------------------|
| `mock` | Respuesta offline generada por adapter | No |
| `shadow` | Llamada real en paralelo, resultado descartado | Sí (solo WF-10, WF-40) |
| `canary` | Tenant ficticio DEV activado | Sí |
| `real` | Producción del flujo | Sí |
| `disabled` | Fallback a mock | No |

## Catálogo de workflows

### WF-10 — Routing
- **Código**: `wf10.routing`
- **Mutable**: No | **Shadow**: Sí
- **Timeout**: 10 s | **Retry**: 3 intentos
- **Propósito**: Determinar `next_action` para routing de conversación

### WF-20 — Incidencias
- **Código**: `wf20.incidents`
- **Mutable**: Sí | **Shadow**: No
- **Timeout**: 15 s | **Retry**: 2 intentos
- **Propósito**: Coordinar creación de incidencia

### WF-30 — Publicaciones
- **Código**: `wf30.listings`
- **Mutable**: Sí | **Shadow**: No
- **Timeout**: 15 s | **Retry**: 2 intentos
- **Propósito**: Coordinar búsqueda y lead de publicación

### WF-40 — Ayuda
- **Código**: `wf40.help`
- **Mutable**: No | **Shadow**: Sí
- **Timeout**: 10 s | **Retry**: 3 intentos
- **Propósito**: Consultar KB y crear ticket de ayuda

### WF-91 — WhatsApp Outbound
- **Código**: `wf91.wa_out`
- **Mutable**: Sí | **Shadow**: No
- **Timeout**: 12 s | **Retry**: 2 intentos
- **Propósito**: Coordinar envío de mensaje WA (sin Wasender real en DEV)

### WF-92 — WebChat Outbound
- **Código**: `wf92.webchat_out`
- **Mutable**: Sí | **Shadow**: No
- **Timeout**: 10 s | **Retry**: 2 intentos
- **Propósito**: Coordinar entrega de mensaje WebChat (sin Realtime real en DEV)

## Contrato de entrada (OrchestrationInputDTO)

```typescript
{
  contract_version: '1.0',
  workflow_code: string,       // del registry
  operation: string,
  request_id: string,          // UUID único por invocación
  correlation_id: string,      // UUID de sesión/caso
  idempotency_key: string,     // UUID opaco por intento
  client_account_id: string,   // tenant — n8n NO puede cambiarlo
  session_id?: string,
  case_id?: string,
  service_code?: string,
  channel: 'wa' | 'webchat',
  conversation_state: ConversationState,
  identity_level: OrchestrationIdentityLevel,
  safe_message: { text: string },  // max 2000 chars — sin PII
  safe_context?: Record<string, unknown>
}
```

## Contrato de salida (OrchestrationOutputDTO)

```typescript
{
  ok: boolean,
  data: {
    workflow_code: string,
    workflow_version: string,
    next_action: {
      type: AllowedNextAction,   // ask_user | invoke_port | enqueue_response | wait | complete | escalate
      target: AllowedTarget | null,  // 17 targets allowlisted
      payload: Record<string, unknown>
    }
  },
  meta: { latency_ms: number, mode: string, idempotent: boolean }
}
```

## Targets allowlisted (17)

```
core.identity.validate  core.listings.query      core.help.kb.query
core.tenant.features    core.activity.publish    ai.intent.classify
incidents_addon.incident.create   listings_addon.listings.search
listings_addon.lead.create        outbound.wa      outbound.webchat
session.ask_clarification         case.escalate
addon.incidents.incident.create   addon.listings.listings.search
addon.listings.lead.create        addon.help.help_ticket.create
```
