# Diagram — Flujo de Validación de Identidad

## 1. Propósito

Mostrar las tres vías de validación de identidad disponibles en SmartConversations: el fast-path por teléfono en WhatsApp, el fast-path por `profile_id` en WebChat con JWT, y el flujo de identificación progresiva (WF-IDENTITY). Ilustra los cuatro niveles de resultado posibles, el escalado tras tres fallos y la división de responsabilidades entre las EFs del add-on y SmartRoom Core.

## 2. Alcance

Este diagrama es de nivel lógico y de flujo. Cubre los tres puntos de entrada a la validación de identidad y el flujo progresivo completo. No cubre la lógica interna de cómo el Core determina el nivel de identidad.

## 3. Diagrama

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║  TRES PUNTOS DE ENTRADA A LA VALIDACIÓN DE IDENTIDAD                                ║
╚════════════════╤════════════════════════╤════════════════════════╤════════════════════╝
                 │                        │                        │
                 ▼                        ▼                        ▼
    ┌────────────────────┐   ┌─────────────────────────┐   ┌────────────────────────┐
    │  FAST-PATH WA      │   │  FAST-PATH WEBCHAT       │   │  FLUJO PROGRESIVO       │
    │  (conv-ingest)     │   │  (conv-web-session)      │   │  (WF-IDENTITY en n8n)   │
    │                    │   │                          │   │                        │
    │  Extraer phone de  │   │  Validar JWT del portal  │   │  Se activa cuando:     │
    │  message.from      │   │  lodger con Supabase Auth│   │  el servicio requiere  │
    │  (mensaje Wasender)│   │  → obtener profile_id    │   │  mayor nivel que el    │
    │                    │   │                          │   │  actual de la sesión   │
    │  phone: "+34..."   │   │  IMPORTANTE:             │   │                        │
    │  (formato intl,    │   │  JWT válido ≠            │   │  Lee conv_sessions     │
    │   SIN "@c.us")     │   │  tenencia activa         │   │  .identity_data al     │
    │                    │   │                          │   │  inicio para no        │
    │  Body:             │   │  Body:                   │   │  repetir preguntas     │
    │  { client_account_ │   │  { client_account_id,    │   │  ya respondidas        │
    │    id, phone }     │   │    profile_id }           │   │                        │
    │                    │   │                          │   │  TURNO 1: ¿full_name?  │
    │  Ocurre ANTES de   │   │  Cuando profile_id       │   │  → persistir en n8n    │
    │  disparar WF-01    │   │  presente, Core ignora   │   │                        │
    │  (antes del motor  │   │  phone, full_name, etc.  │   │  TURNO 2: ¿residence?  │
    │   conversacional)  │   │                          │   │  → persistir en n8n    │
    └─────────┬──────────┘   └───────────┬─────────────┘   │                        │
              │                          │                   │  TURNO 3: ¿room_label? │
              └──────────────────────────┘                   │  → persistir en n8n   │
                             │                               │                        │
                             │                               │  Body:                 │
                             │                               │  { client_account_id,  │
                             │                               │    full_name,          │
                             │                               │    residence_name,     │
                             │                               │    room_label }        │
                             │                               └──────────┬─────────────┘
                             │                                          │
                             └──────────────────────────────────────────┘
                                                    │
                                                    │ POST /functions/v1/conv-core-validate-identity
                                                    ▼
╔═══════════════════════════════════════════════════════════════════════════════════════╗
║  SMARTROOM CORE — determina el nivel de identidad                                    ║
║  (caja negra para el add-on; toda la lógica de matching es interna al Core)          ║
╚═══════════════════════════════════════════════════════════════════════════════════════╝
                                                    │
                            ┌───────────────────────┼───────────────────────┐
                            │                       │                       │
                            ▼                       ▼                       ▼
              ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
              │  STRONG_MATCH_ACTIVE │  │  PARTIAL_MATCH_ACTIVE│  │  MATCH_INACTIVE      │
              │                      │  │                      │  │  o NO_MATCH          │
              │  Inquilino activo    │  │  Datos coinciden pero│  │                      │
              │  confirmado          │  │  sin teléfono        │  │  MATCH_INACTIVE:     │
              │                      │  │  verificado          │  │  ex-inquilino        │
              │  - Incidencia oficial│  │                      │  │                      │
              │  - Datos de contrato │  │  - Pre-incidencia    │  │  NO_MATCH:           │
              │  - Acceso completo   │  │    en conv_cases     │  │  sin coincidencia    │
              │    a servicios       │  │  - Sin datos de      │  │                      │
              │                      │  │    contrato          │  │  Ambos:              │
              │  WF-IDENTITY:        │  │                      │  │  - Solo FAQ público  │
              │  OUTPUT final        │  │  WF-IDENTITY:        │  │  - Conv. publicaciones
              │  → el llamante       │  │  OUTPUT intermedio   │  │    (datos públicos)  │
              │    continúa          │  │  → esperar o escalar │  │  - Escalar a admin   │
              └──────────┬───────────┘  └──────────┬───────────┘  └──────────┬───────────┘
                         │                         │                          │
                         │                         │               ┌──────────┘
                         │                         │               │
                         │                         │               ▼
                         │                         │       ┌──────────────────────────────┐
                         │                         │       │  ¿Flujo progresivo?          │
                         │                         │       │                              │
                         │                         │       │  Contar intento fallido      │
                         │                         │       │  (MAX 3 por sesión)          │
                         │                         │       │                              │
                         │                         │       │  < 3 intentos:               │
                         │                         │       │  → Preguntar de nuevo        │
                         │                         │       │    (o pedir más datos)       │
                         │                         │       │                              │
                         │                         │       │  = 3 intentos:               │
                         │                         │       │  → ESCALAR A ADMIN           │
                         │                         │       │    conv-escalate-case        │
                         │                         │       │    No más intentos automáticos│
                         │                         │       └──────────────────────────────┘
                         │                         │
                         └─────────────────────────┘
                                       │
                                       ▼
╔══════════════════════════════════════════════════════════════════════════════════════╗
║  ALMACENAMIENTO DEL RESULTADO — siempre en la EF del add-on, nunca en n8n           ║
║                                                                                      ║
║  UPDATE conv_sessions SET                                                            ║
║    identity_level  = result.identity_level,    ← el ÚNICO campo que pasa a n8n      ║
║    profile_id      = result.profile_id,        ← almacenado; nunca sale a n8n       ║
║    identity_data   = {                                                               ║
║      assignment_id,  room_id,                  ← almacenados; nunca salen a n8n     ║
║      room_label,     full_name                 ← almacenados; nunca salen a n8n     ║
║    }                                                                                 ║
║                                                                                      ║
║  identity_level solo avanza dentro de una sesión. Nunca se degrada.                 ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
                                       │
                                       │  n8n recibe únicamente:
                                       │  { identity_level: 'STRONG_MATCH_ACTIVE' | ... }
                                       ▼
                              Motor conversacional (WF-10)
```

**Matriz de acciones permitidas por nivel:**

| Acción | STRONG_ACTIVE | PARTIAL_ACTIVE | MATCH_INACTIVE | NO_MATCH | UNVERIFIED_LEAD |
|---|:---:|:---:|:---:|:---:|:---:|
| Incidencia oficial en Core | ✅ | ❌ | ❌ | ❌ | ❌ |
| Pre-incidencia en `conv_cases` | ✅ | ✅ | ❌ | ❌ | ❌ |
| Datos contractuales, saldo, fechas | ✅ | ❌ | ❌ | ❌ | ❌ |
| Consultar anuncio / registrar lead | ✅ | ✅ | ✅ | ✅ | ✅ |
| FAQ público | ✅ | ✅ | ✅ | ✅ | ✅ |

`UNVERIFIED_LEAD` no es resultado de `conv-core-validate-identity`. Lo asigna WF-30 de forma independiente cuando el usuario confirma que no es inquilino.

## 4. Notas de lectura

- **Tres puntos de entrada** (parte superior): cada canal tiene su propio punto de entrada a la validación. Los tres terminan llamando a `conv-core-validate-identity`.
- **La caja del Core** (`SMARTROOM CORE`) es intencionalmente opaca: el add-on trata la validación como una caja negra. No importa cómo el Core determina el nivel; importa qué nivel devuelve.
- **División de responsabilidades**:
  - El **Core decide** el nivel de identidad.
  - El **add-on (EF)** almacena el resultado y decide qué hacer con él.
  - **n8n** solo recibe `identity_level` (enum). Nunca toma decisiones basadas en PII.
- **Flujo progresivo** (columna derecha): se ejecuta en turnos sucesivos. Cada turno recoge un dato y espera la respuesta del usuario antes de continuar. Los datos se persisten en variables locales de n8n y en `conv_sessions.identity_data`.
- **El contador de intentos** aplica solo al flujo progresivo: máximo 3 intentos fallidos (NO_MATCH consecutivos). Tras el tercer fallo, se escala sin más intentos automáticos en esa sesión.
- **`identity_level` nunca se degrada**: si la sesión tiene `PARTIAL_MATCH_ACTIVE` y una validación adicional devuelve `NO_MATCH`, el nivel permanece en `PARTIAL_MATCH_ACTIVE`.

Los diagramas son material explicativo y no sustituyen a `rules` ni a `contracts`.

## 5. Dependencias

| Documento | Qué fundamenta en este diagrama |
|---|---|
| `rules-40-identity-validation.md` | Fuente de verdad: niveles, fast-paths, flujo progresivo, escalado tras 3 fallos |
| `contract-identity-validation-result.md` | Request (con `profile_id?` opcional) y response de `conv-core-validate-identity` |
| `rules-00-scope-and-principles.md` §4.5 | `profile_id` almacenado en EF; nunca a n8n |
| `rules-40-identity-validation.md` §4.2 | Matriz de acciones permitidas por nivel |
| `skill-identity-validation.md` | Detalles de implementación de los tres puntos de entrada |

## 6. Limitaciones

- El diagrama abstrae el proceso interno del Core de determinación del nivel. La lógica de matching (fuzzy, exacto, etc.) es interna al Core y no se muestra.
- No muestra el flujo detallado de la respuesta del Core ante errores 4xx o 5xx (tratados como `NO_MATCH` para el flujo conversacional).
- No muestra cómo los datos del flujo progresivo se recuperan de `conv_sessions.identity_data` al reanudar una sesión después de un IDLE.
- El diagrama simplifica `UNVERIFIED_LEAD` mencionándolo en la tabla pero sin mostrar el flujo de WF-30 que lo asigna.
- No muestra la publicación del evento `conv_identity_validated` en el activity log del Core (ocurre dentro de la EF tras un resultado `STRONG` o `PARTIAL`).
- Los mensajes textuales al usuario en el flujo progresivo se muestran como pasos abstractos; el texto exacto está en `rules-40-identity-validation.md` §4.4.
