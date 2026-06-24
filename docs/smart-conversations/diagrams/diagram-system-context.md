# Diagram — Contexto de Sistema: SmartConversations

## 1. Propósito

Mostrar las fronteras externas del add-on SmartConversations, los actores que interactúan con él y cómo se relaciona con SmartRoom Core. El objetivo es que quede visualmente claro que SmartConversations es un add-on desacoplado y que SmartRoom Core no tiene conocimiento de n8n, Wasender ni del widget WebChat.

## 2. Alcance

Este diagrama es de nivel conceptual. Muestra actores, sistemas y fronteras. No detalla flujos de secuencia ni lógica interna de los componentes.

Cubre:
- El tenant y el usuario final como actores externos
- Los dos canales: WhatsApp (vía Wasender) y WebChat (widget React)
- El add-on SmartConversations: EFs públicas, n8n, EFs `conv-core-*`
- SmartRoom Core y su activity log funcional
- La frontera de desacoplamiento entre el add-on y el Core

No cubre:
- El flujo paso a paso de un mensaje individual
- La lógica interna de n8n
- La estructura de las tablas de base de datos

## 3. Diagrama

```
╔══════════════════════════════════════════════════════════════════════════════════╗
║  ACTORES EXTERNOS                                                                ║
║                                                                                  ║
║  ┌──────────────────────────────┐     ┌────────────────────────────────────┐    ║
║  │  USUARIO FINAL               │     │  TENANT (administrador)            │    ║
║  │  (inquilino o visitante)     │     │  Configura canales y servicios     │    ║
║  │  - mensajes por WhatsApp     │     │  desde el panel de administración  │    ║
║  │  - mensajes por WebChat      │     └──────────────┬─────────────────────┘    ║
║  └──────────────┬───────────────┘                    │ gestión de configuración  ║
║                 │ mensajes entrantes                  │                          ║
╚═════════════════╪══════════════════════════════════════╪══════════════════════════╝
                  │                                      │
                  ▼                                      ▼
╔═════════════════════════════════════════════════════════════════════════════════════╗
║  ADD-ON SMARTCONVERSATIONS                                                         ║
║                                                                                     ║
║  ┌───────────────────────────────────────────────────────────────────────────────┐ ║
║  │  CAPA DE CANALES                                                              │ ║
║  │                                                                               │ ║
║  │   CANAL WHATSAPP (Wasender)          CANAL WEBCHAT (Widget React)            │ ║
║  │                                                                               │ ║
║  │   Wasender [SaaS externo]            Widget React [iframe aislado]           │ ║
║  │   HTTP POST webhook ──►              ◄── Supabase Realtime (respuestas)      │ ║
║  │        │                                       │                             │ ║
║  │   conv-wa-webhook                     conv-web-session                       │ ║
║  │   conv-send-wa ◄──────────────┐        conv-web-message                      │ ║
║  └───────────────────────────────┼──────────────────────────────────────────────┘ ║
║                                  │                                                 ║
║  ┌───────────────────────────────┼──────────────────────────────────────────────┐ ║
║  │  CAPA DE MOTOR CONVERSACIONAL │                                              │ ║
║  │                               │                                              │ ║
║  │   conv-ingest                 │                                              │ ║
║  │       │                       │                                              │ ║
║  │       ▼                       │                                              │ ║
║  │   n8n WF-01 / WF-10 (enrutador)                                             │ ║
║  │       │                       │                                              │ ║
║  │       ├──► WF-20 (conv_incidencias)                                          │ ║
║  │       ├──► WF-30 (conv_publicaciones)    ──────────────────────────────────► │ ║ (respuesta)
║  │       └──► WF-40 (conv_ayuda)            │                                   │ ║
║  │                               │          │                                   │ ║
║  │   Payload máximo a n8n:       │          │                                   │ ║
║  │   session_id, client_account_id,          │                                  │ ║
║  │   message_text, channel, identity_level   │                                  │ ║
║  │   (NUNCA: profile_id, phone, full_name)   │                                  │ ║
║  └───────────────────────────────────────────┼───────────────────────────────────┘ ║
║                                              │                                     ║
║  ┌───────────────────────────────────────────▼───────────────────────────────────┐ ║
║  │  INTEGRATION API  (EFs conv-core-*)                                          │ ║
║  │  Autenticación: service_role — no anon, no JWT de usuario                    │ ║
║  │                                                                               │ ║
║  │  conv-core-validate-identity       conv-core-create-incident                 │ ║
║  │  conv-core-get-tenant-features     conv-core-create-lead                     │ ║
║  │  conv-core-publish-activity        conv-core-lookup-listing                  │ ║
║  │  conv-escalate-case                conv-close-case                           │ ║
║  └───────────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                     ║
║  TABLAS PROPIAS DEL ADD-ON (no accesibles desde el Core)                           ║
║  conv_sessions · conv_cases · conv_messages · conv_send_queue                      ║
║  conv_wa_sessions · conv_wc_configs · conv_service_activations · conv_kb           ║
╚════════════════════════════════════════════════╤════════════════════════════════════╝
                                                 │
                     solo las EFs conv-core-* cruzan esta frontera
                     autenticación: service_role
                                                 │
                                                 ▼
╔════════════════════════════════════════════════════════════════════════════════════╗
║  SMARTROOM CORE  (sistema independiente)                                          ║
║  No conoce n8n · No conoce Wasender · No conoce el widget WebChat                ║
║                                                                                    ║
║  Tenants · Profiles · Rooms · Assignments · Contracts                             ║
║  Incidencias oficiales · Leads · Alojamientos · Habitaciones                      ║
║                                                                                    ║
║  ┌──────────────────────────────────────────────────────────┐                    ║
║  │  ACTIVITY LOG FUNCIONAL DEL CORE                         │                    ║
║  │                                                          │                    ║
║  │  conv_conversation_started  conv_identity_validated      │                    ║
║  │  conv_incident_created      conv_lead_created            │                    ║
║  │  conv_case_escalated        conv_case_closed             │                    ║
║  │                                                          │                    ║
║  │  Solo metadatos funcionales — nunca texto bruto          │                    ║
║  └──────────────────────────────────────────────────────────┘                    ║
╚════════════════════════════════════════════════════════════════════════════════════╝
```

**Principios arquitectónicos visibles en el diagrama:**

| Principio | Dónde se refleja |
|---|---|
| El add-on está desacoplado del Core | La Integration API es la única conexión entre ambas zonas |
| El Core no conoce n8n ni Wasender | n8n y Wasender están completamente dentro del perímetro del add-on |
| Wasender solo afecta al canal WhatsApp | Wasender aparece únicamente en la rama izquierda del canal |
| El activity log vive en el Core | Aparece como bloque dentro del perímetro del Core |
| n8n no llama al Core directamente | n8n llama a las EFs `conv-core-*`; no cruza la frontera por sí mismo |
| PII no llega a n8n | El payload máximo a n8n está explicitado en la capa de motor conversacional |

## 4. Notas de lectura

- **Bloques con doble borde (`╔══╗`)**: zonas lógicas del sistema. No representan procesos desplegables individuales.
- **Nombres en minúsculas con guiones** (`conv-wa-webhook`, `conv-ingest`, etc.): componentes técnicos reales — Edge Functions o workflows de n8n.
- **Flechas `──►`**: dirección del flujo principal de mensajes o llamadas.
- **Línea de frontera** entre el add-on y SmartRoom Core: representa la frontera contractual de la Integration API. Solo las EFs `conv-core-*` pueden cruzarla usando `service_role`.
- **Wasender** es un SaaS externo. La comunicación es bidireccional: Wasender envía webhooks al add-on (canal entrante) y el add-on llama a la API de Wasender para enviar mensajes (canal saliente).
- **Supabase Realtime** es el mecanismo de entrega de respuestas al widget WebChat. No es una llamada al Core.
- El diagrama es **conceptual**. No representa latencias, orden de ejecución ni topología de red.

Los diagramas son material explicativo y no sustituyen a `rules` ni a `contracts`.

## 5. Dependencias

| Documento | Qué fundamenta en este diagrama |
|---|---|
| `rules-00-scope-and-principles.md` §3 | Decisiones no negociables: desacoplamiento, Wasender exclusivo, n8n sin PII |
| `rules-00-scope-and-principles.md` §4.1 | Frontera add-on / Core: tablas propias de cada parte |
| `rules-00-scope-and-principles.md` §4.3 | Canales como adaptadores de entrega |
| `rules-00-scope-and-principles.md` §4.5 | Frontera de minimización de PII: payload máximo a n8n |
| `rules-30-whatsapp-channel.md` | EFs del canal WhatsApp, integración con Wasender |
| `rules-31-webchat-channel.md` | EFs del canal WebChat, Supabase Realtime |
| `rules-70-integration-api.md` | Catálogo de EFs `conv-core-*` y autenticación `service_role` |
| `rules-75-activity-log.md` | Catálogo de eventos del activity log del Core |
| `skill-integration-api-implementation.md` §6 Paso 1 | Las tres capas de autenticación |

## 6. Limitaciones

- El diagrama omite el panel de administración del tenant (interfaz de configuración de canales y servicios).
- No muestra el job de reconciliación `WF-C00-RECONCILE` ni el sub-workflow `WF-IDENTITY`.
- No muestra `conv_send_queue` ni el mecanismo de reintentos de entrega.
- No detalla la lógica interna de WF-10, WF-20, WF-30 ni WF-40.
- No muestra la jerarquía de tres niveles de activación (umbrella, canal, servicio×canal).
- La posición de los componentes es lógica; no refleja topología de red ni infraestructura de despliegue.
- No muestra el transcriptor de audio (WF-C00-TRANSCRIBE) para mensajes de voz de WhatsApp.
