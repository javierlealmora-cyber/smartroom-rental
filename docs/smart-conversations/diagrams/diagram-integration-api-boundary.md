# Diagram — Frontera de la Integration API

## 1. Propósito

Mostrar con precisión cómo fluyen las llamadas entre el widget, las EFs públicas del add-on, n8n y SmartRoom Core, distinguiendo los tres flujos de autenticación distintos. Deja visible que n8n nunca llama al Core directamente, que usa `service_role` para llamar a la Integration API, y que el `session_token` del widget no cruza hacia las EFs `conv-core-*`.

## 2. Alcance

Este diagrama es de nivel técnico y de arquitectura de comunicación. Cubre los tres flujos de autenticación y los límites de qué llamante puede invocar qué componente. No cubre la lógica de negocio interna de cada EF.

## 3. Diagrama

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║  CAPA A — Widget/usuario → EFs públicas del add-on                                  ║
║                                                                                      ║
║  Autenticación: session_token (JWT firmado por conv-web-session)                     ║
║  Payload del token: { session_id, client_account_id }                                ║
║  ≠ JWT del portal lodger ≠ service_role key                                          ║
║                                                                                      ║
║  ┌──────────────────────────┐                                                        ║
║  │  Widget WebChat          │──── Authorization: Bearer <session_token> ────────►   ║
║  │  (iframe React)          │                                                        ║
║  └──────────────────────────┘     ┌────────────────────────────────────────────┐    ║
║                                   │  EFs PÚBLICAS DEL ADD-ON                   │    ║
║  ┌──────────────────────────┐     │                                            │    ║
║  │  (sin autenticación de   │     │  conv-web-session  (crea sesión)           │    ║
║  │   usuario en WhatsApp;   │──►  │  conv-web-message  (recibe mensaje)        │    ║
║  │   firma webhook          │     │  conv-wa-webhook   (recibe webhook WA)     │    ║
║  │   X-Webhook-Signature)   │     │  conv-send-wa      (envía mensaje WA)      │    ║
║  └──────────────────────────┘     │                                            │    ║
║  Wasender webhook                 │  Estas EFs NO llaman a las EFs conv-core-* │    ║
║                                   │  directamente desde n8n                    │    ║
║                                   └────────────────────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
                                                  │
                                    conv-ingest ──► WF-01
                                                  │
                                                  ▼
╔══════════════════════════════════════════════════════════════════════════════════════╗
║  CAPA B — n8n → EFs conv-core-* de Integration API                                  ║
║                                                                                      ║
║  Autenticación: service_role key de Supabase                                         ║
║  Configurado como credencial en el sistema de n8n (no en el payload)                ║
║  Las EFs conv-core-* rechazan con HTTP 401 cualquier llamada anon o JWT de usuario  ║
║                                                                                      ║
║  PROHIBIDO: n8n NO puede llamar al Core directamente                                 ║
║  PROHIBIDO: el session_token del widget no se pasa a las EFs conv-core-*            ║
║                                                                                      ║
║  ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║  │  n8n WORKFLOWS                                                               │   ║
║  │                                                                              │   ║
║  │  WF-10 (enrutador)   WF-20 (incidencias)   WF-30 (publicaciones)            │   ║
║  │  WF-40 (ayuda)       WF-IDENTITY           WF-91/WF-92 (envío canal)        │   ║
║  │                                                                              │   ║
║  │  Payload máximo desde n8n a las EFs conv-core-*:                            │   ║
║  │  { session_id, client_account_id, incident_type, urgency, description,      │   ║
║  │    source, conv_case_id, ... }                                               │   ║
║  │  [NUNCA: profile_id, phone_number, full_name, room_label, assignment_id]    │   ║
║  └──────────────────────────────────┬───────────────────────────────────────────┘   ║
║                                     │                                               ║
║         Authorization: Bearer <service_role_key>   [Header, no payload]            ║
║                                     │                                               ║
║                                     ▼                                               ║
║  ┌──────────────────────────────────────────────────────────────────────────────┐   ║
║  │  EFs conv-core-* (Integration API)                                          │   ║
║  │                                                                              │   ║
║  │  conv-core-validate-identity                                                 │   ║
║  │  conv-core-get-tenant-features                                               │   ║
║  │  conv-core-create-incident                                                   │   ║
║  │  conv-core-create-lead                                                       │   ║
║  │  conv-core-lookup-listing                                                    │   ║
║  │  conv-core-get-accommodation-info                                            │   ║
║  │  conv-core-publish-activity     [fire-and-log; no rollback si falla]        │   ║
║  │  conv-escalate-case                                                          │   ║
║  │  conv-close-case                                                             │   ║
║  └──────────────────────────────────┬───────────────────────────────────────────┘   ║
╚══════════════════════════════════════╪═══════════════════════════════════════════════╝
                                       │
╔══════════════════════════════════════╪═══════════════════════════════════════════════╗
║  CAPA C — EF del add-on → conv_sessions / SmartRoom Core (interno)                  ║
║                                      │                                              ║
║  Autenticación: service_role (disponible en el entorno de ejecución de la EF)       ║
║                                      │                                              ║
║  Ejemplo: conv-core-create-incident antes de llamar al Core                         ║
║  necesita leer profile_id y room_id de conv_sessions:                               ║
║                                      │                                              ║
║  ┌───────────────────────────────────▼──────────────────────────────────────────┐  ║
║  │  const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);               │  ║
║  │  const { data } = await client.from('conv_sessions')                        │  ║
║  │    .select('profile_id, identity_data')                                     │  ║
║  │    .eq('id', sessionId).single();                                           │  ║
║  │  // → llama al Core con el payload enriquecido                              │  ║
║  └───────────────────────────────────────────────────────────────────────────────┘  ║
║                                      │                                              ║
╚══════════════════════════════════════╪═══════════════════════════════════════════════╝
                                       │
                                       │ HTTP con autenticación de servicio del Core
                                       ▼
               ╔═══════════════════════════════════════════════════╗
               ║  SMARTROOM CORE                                   ║
               ║  (no conoce n8n ni el widget)                    ║
               ║                                                   ║
               ║  APIs del Core para:                             ║
               ║  - validar identidad (perfiles, asignaciones)    ║
               ║  - crear incidencias oficiales                   ║
               ║  - crear leads                                   ║
               ║  - buscar alojamientos y anuncios                ║
               ║  - publicar en el activity log                   ║
               ╚═══════════════════════════════════════════════════╝
```

**Regla de separación de los tres flujos:**

| Capa | Llamante | Destino | Credencial | Qué NO puede usar |
|---|---|---|---|---|
| A | Widget / Wasender | EFs públicas del add-on | `session_token` (JWT del add-on) | `service_role`, JWT del portal lodger |
| B | n8n workflows | EFs `conv-core-*` | `service_role` (credencial de n8n) | `session_token` del usuario |
| C | EF del add-on | `conv_sessions` / Core | `service_role` (entorno de la EF) | — |

**Errores de implementación más frecuentes relacionados con esta frontera:**

| Error | Consecuencia |
|---|---|
| n8n llama directamente a las APIs del Core | El Core recibe llamadas sin el contexto del add-on; violación de `rules-00` §3.4 |
| n8n pasa `session_token` del widget a las EFs `conv-core-*` | Las EFs rechazan con HTTP 401 (esperan `service_role`) |
| n8n pasa `profile_id` o `phone_number` en el payload | Violación de la frontera PII de `rules-00` §3.7 |
| EF no verifica `service_role` al recibir llamada de n8n | Cualquier cliente con token `anon` puede invocar la EF |
| `service_role` key incluida en el payload (no en header) | El key queda expuesto en logs de n8n |

## 4. Notas de lectura

- **Tres capas horizontales**: representan los tres flujos de autenticación distintos. Cada capa tiene su propio tipo de credencial.
- **`session_token` del add-on**: solo circula en la Capa A. No cruza hacia las capas B ni C.
- **`service_role`**: circula en las capas B y C. En la Capa B está configurado como credencial en el sistema de credenciales de n8n (no en el payload). En la Capa C está disponible como variable de entorno en la EF.
- **La línea de frontera entre el add-on y el Core**: solo las EFs `conv-core-*` (parte inferior de la Capa B / Capa C) pueden cruzarla.
- **El Core no conoce n8n**: el Core recibe llamadas HTTP de las EFs `conv-core-*`. Desde el punto de vista del Core, son llamadas de servicio autenticadas. El Core no sabe si el origen fue un mensaje de WhatsApp, WebChat o una acción manual.
- **`conv-core-publish-activity`**: se marca como "fire-and-log" para recordar que su fallo no cancela la operación principal.

Los diagramas son material explicativo y no sustituyen a `rules` ni a `contracts`.

## 5. Dependencias

| Documento | Qué fundamenta en este diagrama |
|---|---|
| `rules-70-integration-api.md` | Catálogo de EFs `conv-core-*`; autenticación `service_role` |
| `rules-00-scope-and-principles.md` §3.4 | El add-on nunca accede directamente a tablas del Core |
| `rules-00-scope-and-principles.md` §4.5 | Frontera PII: n8n no recibe `profile_id` ni datos personales |
| `skill-integration-api-implementation.md` §6 Paso 1 | Los tres flujos de autenticación con ejemplos de código |
| `rules-75-activity-log.md` | Semántica fire-and-log de `conv-core-publish-activity` |

## 6. Limitaciones

- El diagrama muestra la topología de autenticación; no detalla el contrato de request/response de cada EF `conv-core-*`.
- No muestra la lógica de reintentos ante 5xx del Core (backoff exponencial en la EF).
- No muestra el tratamiento de errores 4xx del Core.
- El diagrama abstrae el mecanismo interno de cómo el sistema de credenciales de n8n inyecta el `service_role` key en el header de las llamadas HTTP.
- No muestra el versionado de contratos (`X-SmartConv-Contract-Version` header) mencionado en `skill-integration-api-implementation.md`.
