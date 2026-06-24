# Diagram — Visión General del Modelo de Datos

## 1. Propósito

Mostrar las tablas centrales de SmartConversations, sus relaciones, los campos más relevantes y el rol que cumple cada tabla en el sistema. Deja visible qué tabla representa la sesión, cuál representa el caso, cuál registra mensajes y cuál gestiona los reintentos de entrega, así como la jerarquía de activación entre `saas_service_subscriptions`, `conv_wa_sessions` / `conv_wc_configs` y `conv_service_activations`.

## 2. Alcance

Este diagrama es de nivel lógico y de modelo de datos. Muestra las relaciones entre tablas del namespace `conv_*` más `saas_service_subscriptions`. No incluye DDL completa ni constraints de base de datos; para eso, consultar `skill-data-model-and-state.md`.

## 3. Diagrama

```
╔═══════════════════════════════════════════════════════════════════════╗
║  JERARQUÍA DE ACTIVACIÓN (por tenant)                                ║
╚═══════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────┐
│  saas_service_subscriptions                        [NIVEL 1]        │
│  ─────────────────────────────────────────────────────────────────  │
│  client_account_id  service_code='smart_conversations'  status      │
│                                                                     │
│  Si status ≠ 'active' → ningún mensaje de este tenant se procesa   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ 1 tenant : N canales
              ┌─────────────────┴─────────────────────────────┐
              ▼                                               ▼
┌─────────────────────────────┐             ┌─────────────────────────────┐
│  conv_wa_sessions           │  [NIVEL 2]  │  conv_wc_configs            │
│  ───────────────────────    │             │  ───────────────────────    │
│  client_account_id (FK)     │             │  client_account_id (FK)     │
│  wasender_session_id        │             │  is_active  bool            │
│  wasender_api_key           │             │  allowed_origins  text[]    │
│  webhook_secret             │             │  widget_config  jsonb       │
│  status  (active/disconnected)            │  (colores, posición, etc.)  │
│                             │             │                             │
│  Una sesión Wasender        │             │  Configuración del widget   │
│  por tenant                 │             │  WebChat por tenant         │
└─────────────────────────────┘             └─────────────────────────────┘
              │                                             │
              └─────────────────────┬───────────────────────┘
                                    │ 1 tenant : N servicios × canal
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  conv_service_activations                          [NIVEL 3]        │
│  ─────────────────────────────────────────────────────────────────  │
│  client_account_id  service_code  channel  is_active  bool         │
│                                                                     │
│  Ejemplos de filas:                                                 │
│  (tenant_A, 'conv_incidencias',   'whatsapp', true)                │
│  (tenant_A, 'conv_publicaciones', 'whatsapp', true)                │
│  (tenant_A, 'conv_ayuda',         'webchat',  true)                │
│  (tenant_A, 'conv_incidencias',   'webchat',  false)               │
│                                                                     │
│  Un servicio puede estar activo en un canal e inactivo en otro     │
└─────────────────────────────────────────────────────────────────────┘


╔═══════════════════════════════════════════════════════════════════════╗
║  ESTADO CONVERSACIONAL (por sesión de usuario)                       ║
╚═══════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────┐
│  conv_sessions                                     [SESIÓN]         │
│  ─────────────────────────────────────────────────────────────────  │
│  id  UUID  PK                                                       │
│  client_account_id  UUID  (FK → tenant)                             │
│  channel  text  ('whatsapp' | 'webchat')                            │
│  sender_ref  text  (phone para WA; session_id para WebChat)         │
│  state  text  (NEW|SELECTING_SERVICE|IN_SERVICE|AWAITING_USER|      │
│                ESCALATED|IDLE|EXPIRED|CLOSED)                       │
│  identity_level  text  (STRONG_MATCH_ACTIVE|PARTIAL_MATCH_ACTIVE|   │
│                          MATCH_INACTIVE|NO_MATCH|UNVERIFIED_LEAD)   │
│  profile_id  UUID  (almacenado por EF; nunca reenviado a n8n)       │
│  identity_data  jsonb  (datos del flujo progresivo)                 │
│  active_case_id  UUID  (FK → conv_cases; puede ser null)            │
│  open_cases_ids  UUID[]  (array de casos abiertos)                  │
│  active_service_code  text  (servicio actual; null si sin servicio) │
│  last_active_at  timestamptz                                        │
│  created_at  timestamptz                                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
              ┌─────────────────┼──────────────────────────────────────┐
              │                 │                                       │
              │ 1 sesión :      │ 1 sesión :                            │
              │ N casos         │ N mensajes                            │
              ▼                 ▼                                       │
┌─────────────────────────┐  ┌─────────────────────────────────────┐   │
│  conv_cases             │  │  conv_messages                      │   │
│  [CASO / INTENCIÓN]     │  │  [MENSAJES]                         │   │
│  ─────────────────────  │  │  ─────────────────────────────────  │   │
│  id  UUID  PK           │  │  id  UUID  PK                       │   │
│  session_id  UUID  FK   │  │  session_id  UUID  FK               │   │
│  client_account_id  UUID│  │  client_account_id  UUID            │   │
│  service_code  text     │  │  channel  text                      │   │
│  case_ref_type  text    │  │  sender_type  text                  │   │
│  (incident|lead|        │  │  (user | bot | admin)               │   │
│   help_ticket)          │  │  direction  text                    │   │
│  status  text           │  │  (inbound | outbound)               │   │
│  (open|waiting_user|    │  │  text  text                         │   │
│   waiting_internal|     │  │  status  text                       │   │
│   escalated|resolved|   │  │  (received | sent | failed)         │   │
│   closed)               │  │  wasender_message_id  text          │   │
│  case_ref  text|null    │  │  (null para WebChat; deduplica WA)  │   │
│  ('INC-2026-NNNN',etc.) │  │  created_at  timestamptz            │   │
│  created_at  timestamptz│  └─────────────────────────────────────┘   │
│  updated_at  timestamptz│                 │                          │
└─────────────────────────┘                 │ 1 mensaje : 0..1          │
         │                                  │ entradas en cola          │
         │ Cuando falla la                  ▼                          │
         │ entrega del mensaje       ┌─────────────────────────────────┐│
         │ de confirmación ──────►   │  conv_send_queue               ││
         │                           │  [REINTENTOS DE ENTREGA]       ││
         │                           │  ─────────────────────────────  ││
         │                           │  id  UUID  PK                   ││
         │                           │  session_id  UUID  FK           ││
         │                           │  client_account_id  UUID        ││
         │                           │  channel  text                  ││
         │                           │  message_id  UUID  FK (nullable)││
         │                           │  payload  jsonb  (datos envío)  ││
         │                           │  attempts  integer  DEFAULT 0   ││
         │                           │  max_retries  integer DEFAULT 3 ││
         │                           │  next_attempt_at  timestamptz   ││
         │                           │  last_error  text               ││
         │                           │  status  text                   ││
         │                           │  (pending|processing|           ││
         │                           │   succeeded|failed)             ││
         │                           │  created_at  timestamptz        ││
         │                           │                                 ││
         │                           │  SOLO para reintentos de envío  ││
         │                           │  saliente (Wasender / Realtime) ││
         │                           │  NO para reintentos al Core     ││
         └───────────────────────────┘                                 ││
                                                                       ││
└──────────────────────────────────────────────────────────────────────┘│


╔═══════════════════════════════════════════════════════════════════════╗
║  RELACIONES PRINCIPALES                                               ║
╚═══════════════════════════════════════════════════════════════════════╝

  conv_sessions.client_account_id ──► (FK lógica) saas_service_subscriptions
  conv_sessions.active_case_id    ──► conv_cases.id  (nullable)
  conv_sessions.open_cases_ids    ──► conv_cases.id[]
  conv_cases.session_id           ──► conv_sessions.id
  conv_messages.session_id        ──► conv_sessions.id
  conv_send_queue.session_id      ──► conv_sessions.id
  conv_send_queue.message_id      ──► conv_messages.id  (nullable)
```

**Roles de cada tabla:**

| Tabla | Rol | Propietario de las escrituras |
|---|---|---|
| `saas_service_subscriptions` | Interruptor global (Nivel 1) | Core de SmartRoom (no el add-on) |
| `conv_wa_sessions` | Configuración del canal WhatsApp por tenant (Nivel 2) | EF `conv-offboard-wa-session`, panel admin |
| `conv_wc_configs` | Configuración del canal WebChat por tenant (Nivel 2) | Panel admin |
| `conv_service_activations` | Activación por servicio × canal (Nivel 3) | Panel admin |
| `conv_sessions` | Estado de la sesión conversacional; una fila por canal por usuario | EFs con `service_role` |
| `conv_cases` | Ciclo de vida de una intención específica del usuario | EFs con `service_role` |
| `conv_messages` | Registro de todos los mensajes (entrantes, salientes, del bot, del admin) | EFs del add-on |
| `conv_send_queue` | Cola de reintentos de entrega saliente (Wasender / Realtime) | EF `conv-send-wa`; job `WF-C00-RECONCILE` |

**Invariantes críticos del modelo:**

| Invariante | Descripción |
|---|---|
| `active_case_id` ∈ `open_cases_ids` | Si `active_case_id` no es null, debe estar en `open_cases_ids` |
| `open_cases_ids` ∩ `status IN ('closed')` = ∅ | No debe haber casos `closed` en `open_cases_ids` |
| `conv_send_queue` ≠ reintentos al Core | La cola es exclusivamente para entrega saliente al usuario |
| `UNIQUE (client_account_id, wasender_message_id)` | Garantía de deduplicación de mensajes WA en `conv_messages` |

## 4. Notas de lectura

- **Parte superior (jerarquía de activación)**: estas tres tablas / grupos de filas determinan si un mensaje entrante se procesa o se descarta silenciosamente.
- **Parte central (estado conversacional)**: `conv_sessions` es el pivote central; todo lo demás (casos, mensajes, cola) tiene FK hacia ella.
- **`conv_sessions.state`**: ciclo de vida de la conversación (NEW → IN_SERVICE → CLOSED). No confundir con `conv_cases.status` (ciclo de vida de una intención).
- **`active_case_id`**: apunta al caso que el motor conversacional está atendiendo en este momento. Se actualiza con confirmación explícita del usuario cuando hay cambio de contexto.
- **`open_cases_ids`**: array de todos los casos abiertos en la sesión. Permite que WF-10 detecte el contexto activo y ofrezca la opción de "volver al caso pendiente".
- **`conv_send_queue`**: tabla de reintentos de entrega saliente al usuario (Wasender, Supabase Realtime). No gestiona reintentos de llamadas al Core; esos son backoff exponencial dentro de la EF.
- **n8n no escribe en estas tablas**: las transiciones de estado las ejecutan únicamente las EFs con `service_role`. n8n solo lee.

Los diagramas son material explicativo y no sustituyen a `rules` ni a `contracts`.

## 5. Dependencias

| Documento | Qué fundamenta en este diagrama |
|---|---|
| `rules-00-scope-and-principles.md` §4.1 | Tablas propias del add-on vs tablas del Core |
| `rules-20-tenant-activation-and-lifecycle.md` | Las tres tablas de la jerarquía de activación |
| `contract-case-state-machine.md` | Estados válidos de `conv_sessions.state` y `conv_cases.status` |
| `rules-90-observability-and-failure-handling.md` §4.2 | DDL oficial de `conv_send_queue` |
| `skill-data-model-and-state.md` | Detalles de implementación, queries de transición segura, detección de inconsistencias |
| `rules-80-data-and-privacy.md` | Retención de datos por tabla (12m, 24m, 36m, 7d) |

## 6. Limitaciones

- El diagrama no muestra la DDL completa ni los constraints de base de datos. Para eso, consultar `skill-data-model-and-state.md` §6.
- No muestra las tablas `conv_kb` (base de conocimiento) ni `conv_wc_configs` en detalle.
- Las relaciones se muestran como flechas lógicas; no representan foreign keys con ON DELETE CASCADE ni otras restricciones de integridad referencial.
- No muestra las políticas de Row Level Security (RLS) que protegen cada tabla.
- Los campos mostrados son los más relevantes para el flujo conversacional; cada tabla puede tener campos adicionales de auditoría, metadata o configuración.
- La tabla `saas_service_subscriptions` pertenece al Core de SmartRoom, no al add-on. Se incluye en el diagrama solo para ilustrar la jerarquía de activación.
