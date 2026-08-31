# incident-entitlement-si-p4c1-architecture-decision.md
# SI-P4C1 — Decisión arquitectónica: Entitlement de Smart Incidents

**Tipo:** Decisión de arquitectura. Solo documental. Sin código, sin contratos v1, sin adapters, sin migraciones.

**Fecha:** 2026-08-04

**Prerequisito:** `docs/smart-incidents/integration/incident-entitlement-si-p4b-source-audit.md` (SI-P4B-REV2)

**Objetivo:** Cerrar semántica de Gate 2 y Gate 3, ownership de hechos y de decisión, dirección de dependencias, política de consistencia, número de contratos intermodulares y opción arquitectónica.

---

## 1. Corrección de semántica de Gate 2

### Definición anterior (SI-P4B-REV1 — ahora obsoleta)

SI-P4B-REV1 definió Gate 2 como:

```text
EXISTS cualquier fila activa de conv_incidencias para cualquier canal del tenant.
```

Esta definición agregaba WhatsApp y WebChat, produciendo GATE_2_GATE_3_MODEL_CONTRADICTION porque la implicación G3=true → G2=true hacía Gate 2 redundante.

### Definición adoptada (SI-P4C1)

`incident_creation_capability_active` significa:

```text
Existe una activación Level 3 (conv_service_activations) para:
  client_account_id = tenant solicitado
  service_code      = conv_incidencias
  channel           = source_channel solicitado
  is_active         = true
```

Gate 2 pregunta:

> ¿La capability de creación de incidencias está habilitada para este canal concreto en este tenant?

**No significa:**

> ¿Existe cualquier fila activa de `conv_incidencias` en cualquier canal del tenant?

**Consecuencia directa:**

- Una solicitud por `whatsapp` evalúa la activación de `(conv_incidencias, whatsapp)` únicamente.
- Una solicitud por `webchat` evalúa la activación de `(conv_incidencias, webchat)` únicamente.
- No se agregan los canales para producir un booleano combinado.
- Ausencia de la fila → `incident_creation_capability_active = false` (no es error técnico).

### Evidencia de soporte

El esquema de `conv_service_activations` (migración `20260716000001`) soporta esta definición:
- UNIQUE `(client_account_id, service_code, channel)` — la consulta por canal específico tiene clave única garantizada.
- Una fila por canal por tenant por servicio: la activación es per-channel por diseño.
- El constraint de `channel NOT NULL` confirma que cada fila de activación es siempre canal-específica.

No existe ninguna regla documental verificada que exija una activación tenant-level sin canal distinta de la activación por canal.

---

## 2. Corrección de semántica de Gate 3

### Definición anterior (SI-P4B-REV1 — ahora obsoleta)

SI-P4B-REV1 definió Gate 3 como la combinación de Level 3 (`conv_service_activations` con filtro de canal) y Level 2 (transporte). Esto hacía que Gate 3 re-verificara `service_code = 'conv_incidencias'`, condición que pertenece a Gate 2.

### Definición adoptada (SI-P4C1)

`source_channel_active` significa únicamente que el transporte/canal subyacente solicitado está activo:

**WhatsApp:**
```text
conv_wa_sessions.status = 'active'
para client_account_id = tenant solicitado
```

**WebChat:**
```text
conv_wc_configs.is_active = true
para client_account_id = tenant solicitado
```

Gate 3 **no re-verifica** `conv_service_activations.service_code = 'conv_incidencias'`. Esa condición pertenece íntegramente a Gate 2.

Gate 3 pregunta:

> ¿El transporte/canal solicitado está disponible para este tenant?

### Separación de responsabilidades Gate 2 / Gate 3

| Gate | Tabla fuente | Pregunta |
|---|---|---|
| Gate 2 | `conv_service_activations` (Level 3) | ¿Está habilitada la capability de incidencias para este canal? |
| Gate 3 | `conv_wa_sessions` o `conv_wc_configs` (Level 2) | ¿Está operativo el transporte de ese canal? |

Estas tablas son **distintas**. No hay solapamiento en las condiciones evaluadas.

---

## 3. Verificación de independencia Gate 2 / Gate 3

### Con las definiciones corregidas

| Gate | Tabla fuente | Condición para `source_channel = 'whatsapp'` |
|---|---|---|
| Gate 2 | `conv_service_activations` | `(client_account_id, 'conv_incidencias', 'whatsapp', is_active=true)` |
| Gate 3 | `conv_wa_sessions` | `(client_account_id, status='active')` |

Son tablas distintas. No hay implicación lógica entre el contenido de `conv_service_activations` y el de `conv_wa_sessions`.

### Cuatro combinaciones — ejemplos de estado (WhatsApp)

| G2 | G3 | Estado del sistema | Representable |
|---|---|---|---|
| true | true | Fila `(tenant, conv_incidencias, whatsapp, is_active=true)` existe Y `conv_wa_sessions.status='active'` | **SÍ** |
| true | false | Fila `(tenant, conv_incidencias, whatsapp, is_active=true)` existe PERO `conv_wa_sessions.status='disconnected'` (o `'error'` o `'connecting'`) | **SÍ** — admin habilitó incidencias por WA pero la sesión está caída |
| false | true | Fila no existe (o `is_active=false`) PERO `conv_wa_sessions.status='active'` | **SÍ** — WA conectado pero incidencias no habilitadas para ese canal |
| false | false | Fila no existe Y `conv_wa_sessions.status='disconnected'` (o sin fila en `conv_wa_sessions`) | **SÍ** |

### Cuatro combinaciones — ejemplos de estado (WebChat)

| G2 | G3 | Estado del sistema | Representable |
|---|---|---|---|
| true | true | Fila `(tenant, conv_incidencias, webchat, is_active=true)` existe Y `conv_wc_configs.is_active=true` | **SÍ** |
| true | false | Fila `(tenant, conv_incidencias, webchat, is_active=true)` existe PERO `conv_wc_configs.is_active=false` | **SÍ** |
| false | true | Fila no existe (o `is_active=false`) PERO `conv_wc_configs.is_active=true` | **SÍ** |
| false | false | Fila no existe Y `conv_wc_configs.is_active=false` (o sin fila en `conv_wc_configs`) | **SÍ** |

### Estado

```
GATE_2_GATE_3_SEMANTICS_RESOLVED
```

Las cuatro combinaciones son representables con datos reales del esquema. Gates 2 y 3 son genuinamente independientes con las definiciones corregidas.

`GATE_2_GATE_3_MODEL_CONTRADICTION` queda eliminada.

---

## 4. Ownership de los hechos

La propiedad de un hecho es la responsabilidad sobre su semántica, su fuente de datos y su exposición neutral. No implica ser el único consumidor ni el tomador de la decisión final.

| Gate | Hecho | Tabla fuente | Fact owner |
|---|---|---|---|
| Gate 1 | `smart_incidents_subscription_active` | `saas_service_subscriptions` (`code = 'smart_incidents'`) | **Core** |
| Gate 2 | `incident_creation_capability_active` | `conv_service_activations` (`service_code = 'conv_incidencias'`, `channel = source_channel`) | **SmartConversations** |
| Gate 3 | `source_channel_active` | `conv_wa_sessions` o `conv_wc_configs` | **SmartConversations** |

```
Gate 1 fact owner = Core
Gate 2 fact owner = SmartConversations
Gate 3 fact owner = SmartConversations
```

```
FACT_OWNERSHIP_RESOLVED
```

---

## 5. Ownership de la decisión

### Distinción entre fact owner y decision owner

```text
FACT OWNER      — módulo que es autoridad sobre la semántica y el valor del hecho.
                  Expone hechos neutrales sin interpretarlos para otro módulo.

DECISION OWNER  — módulo que recibe los hechos, aplica la política canónica
                  y acepta o rechaza la operación.
```

Estos roles son distintos y pueden estar en módulos distintos. Buscar un único módulo propietario de todas las tablas es un error de diseño.

### Decisión adoptada

```
ENTITLEMENT_DECISION_OWNER = Smart Incidents
```

**Justificación:**

1. Smart Incidents es quien decide si acepta o rechaza `create_incident`. La operación es de su dominio.
2. SI-P4A contiene la política canónica de tres gates en `evaluateIncidentEntitlement` (función pura) y `checkIncidentEntitlement` (check atómico). Esa política ya existe y no puede residir en otro módulo.
3. Core no debe interpretar los internals de SmartConversations (qué es `conv_incidencias`, qué significa Level 2 de WA).
4. SmartConversations no debe interpretar la suscripción comercial de Smart Incidents (qué significa `status = 'active'` en `saas_service_subscriptions`).
5. Cada fact owner expone hechos neutrales. Smart Incidents compone y decide.

---

## 6. Evaluación de opciones arquitectónicas

### Opción A — Core/platform-owned entitlement orchestrator

**Descripción:** Core obtiene Gate 1 directamente y consume una interfaz de SC para Gates 2+3; Core combina y expone el snapshot a SI.

**Problemas identificados:**
- Core tendría que conocer la semántica de `conv_incidencias` y de los canales de SC.
- Core no es el decision owner (SI lo es); ser orchestrator implicaría que Core interpreta políticas de SI.
- No hay evidencia en el repositorio de que Core sea o deba ser orchestrator de add-ons.
- Requiere contrato SC→Core no existente.

**Estado:** DESCARTADA.

---

### Opción B — PostgreSQL RPC cross-module SECURITY DEFINER

**Descripción:** Una función SQL en una capa "neutral" consulta `saas_service_subscriptions` (Core) y `conv_*` (SC) en la misma transacción.

**Problemas identificados:**
- No existe capa neutral en el repositorio con acceso legítimo a tablas de dos módulos.
- Crea acoplamiento a nivel de base de datos entre módulos.
- El propietario de la función necesitaría bypassrls sobre todas las tablas → acceso total.
- Un cambio de esquema en `conv_*` afecta directamente la función → mantenimiento cruzado.
- No hay owner neutral documentado.

**Estado:** DESCARTADA.

---

### Opción C Refinada — Dos contratos de hechos, agregación en SI

**Descripción:**

```text
Smart Incidents entitlement adapter/composer
    ├── Core subscription fact contract
    │     └── smart_incidents_subscription_active
    │
    └── SmartConversations incident-channel facts contract
          ├── incident_creation_capability_active
          └── source_channel_active
```

`evaluateIncidentEntitlement(snapshot)` de SI-P4A aplica el AND de los tres valores.

**Flujo:**
1. El adapter de SI llama al contrato de Core: recibe `smart_incidents_subscription_active`.
2. Si Gate 1 es false: fail-fast → `FEATURE_DISABLED` sin llamar a SC.
3. Si Gate 1 es true: el adapter llama al contrato de SC: recibe `incident_creation_capability_active` y `source_channel_active`.
4. El adapter construye el `IncidentEntitlementSnapshot` con los tres booleanos.
5. `checkIncidentEntitlement` invoca el port (adapter) y aplica la política.

**Fronteras de dependencia:**
- SI no consulta directamente `conv_*`.
- SC no consulta directamente `saas_service_subscriptions` para construir el snapshot completo.
- Core no consulta `conv_*`.
- Cada módulo expone solo los hechos de su dominio.

**Estado:** SELECCIONADA — ver §8.

---

### Opción D — Read model neutral

**Descripción:** Tabla derivada (materializada o actualizando por triggers) que agrega los tres gates y que SI consulta con una sola lectura.

**Problemas identificados:**
- No hay read model ni proceso de actualización en el repositorio.
- Requiere infraestructura nueva, owner del read model y definición de cómo se actualiza.
- El lag de replicación puede producir estados inconsistentes difíciles de detectar.

**Estado:** DESCARTADA para SI-P4C1. Podría reevaluarse en versiones futuras de la arquitectura.

---

## 7. Opción seleccionada: OPTION_C_REFINED

```
OPTION_C_REFINED_SELECTED
```

---

## 8. Clasificación de consistencia

```
BEST_EFFORT_CROSS_SOURCE_SNAPSHOT
```

Esta arquitectura NO produce un snapshot transaccional atómico. Las dos llamadas (Core y SC) se ejecutan en secuencia desde el adapter de SI y pertenecen a snapshots de datos distintos.

### Aceptación condicionada

La clasificación `BEST_EFFORT_CROSS_SOURCE_SNAPSHOT` es aceptable porque:

1. Los cambios de suscripción (`saas_service_subscriptions`) y los cambios de activación (`conv_service_activations`, `conv_wa_sessions`, `conv_wc_configs`) son eventos administrativos lentos (minutos a horas). La ventana TOCTOU (milisegundos entre las dos llamadas) es despreciable frente a la frecuencia de cambio.
2. El snapshot se obtiene por cada operación `create_incident`, no se persiste ni se usa como autorización diferida.
3. Las operaciones de creación de incidencia no son financieras ni irreversibles de forma crítica.
4. El fail-fast de Gate 1 (si G1=false, no se llama a SC) reduce la ventana TOCTOU en el caso más frecuente (tenant sin suscripción).

### TOCTOU residual

La ventana TOCTOU existe entre la llamada al contrato de Core y la llamada al contrato de SC:

| Escenario | Probabilidad | Consecuencia |
|---|---|---|
| El tenant desactiva `smart_incidents` entre Gate 1 y Gates 2+3 | Muy baja — activaciones son eventos lentos | La solicitud se procesa como si G1=true, pero G1 es false en la realidad. Consecuencia: una creación de incidencia se acepta en una ventana de milisegundos antes de propagarse la desactivación. |
| El admin desactiva `conv_incidencias` para un canal entre la llamada a Core y a SC | Muy baja | La solicitud se procesa como si G2=true cuando G2 es false en la realidad. |

Ninguno de estos escenarios produce `FEATURE_DISABLED` silencioso por un fallo técnico; solo pueden producir que una operación se acepta justo antes de que el entitlement cambie de estado. El modelo MVCC de PostgreSQL garantiza consistencia dentro de cada consulta individual.

**No se introduce RPC cross-module SECURITY DEFINER** para garantizar atomicidad, porque ninguna regla documental canónica (rules-10, rules-80) exige consistencia transaccional entre las tres tablas.

---

## 9. Política de consistencia y fallos

| Condición | Resultado | Justificación |
|---|---|---|
| Gate 1 = false (tenant sin suscripción activa) | `smart_incidents_subscription_active = false` | Ausencia esperada. No es error técnico. |
| Catálogo global `smart_incidents` ausente | `INTERNAL_ERROR` | Corrupción de plataforma. No es decisión del tenant. |
| Gate 2 = false (fila de activación ausente o inactiva) | `incident_creation_capability_active = false` | Ausencia esperada. No es error técnico. |
| Gate 3 = false (transporte inactivo) | `source_channel_active = false` | Ausencia esperada. No es error técnico. |
| Fallo técnico en llamada a Core | `DEPENDENCY_UNAVAILABLE` | Nunca `false`, nunca `FEATURE_DISABLED`. |
| Fallo técnico en llamada a SC | `DEPENDENCY_UNAVAILABLE` | Nunca `false`, nunca `FEATURE_DISABLED`. |
| Output malformado de cualquier contrato | `INTERNAL_ERROR` | El adapter de SI no puede construir un snapshot válido. |
| Fallo parcial (un contrato falla, otro responde) | `DEPENDENCY_UNAVAILABLE` | Propagado desde el port; nunca colapsado en `FEATURE_DISABLED`. |

**Invariante de SI-P4A §8:** ningún fallo técnico puede convertirse en `FEATURE_DISABLED`. Esta política es absoluta e independiente de la opción arquitectónica.

**Consistencia de tenant:** todos los hechos del snapshot deben corresponder al mismo `client_account_id`. Gates 2 y 3 deben corresponder al mismo `source_channel`.

---

## 10. Contratos de hechos requeridos

Se requieren exactamente dos contratos intermodulares de hechos:

```
TWO_VERSIONED_FACT_CONTRACTS_REQUIRED
```

### Contrato 1 — Core → Smart Incidents

**Responsabilidad:** Exponer el hecho `smart_incidents_subscription_active` para un tenant dado.

**Input conceptual:**
```typescript
{
  client_account_id: string;    // UUID del tenant
  service_code: "smart_incidents";
}
```

**Output conceptual (éxito):**
```typescript
{
  subscription_active: boolean;
}
```

**Output (fallo técnico):** mecanismo a definir en SI-P4C2A. Debe distinguir fallo técnico de ausencia de suscripción.

**Datos prohibidos en el output:** identificadores internos de SC, estado de canal, configuración de activación, metadata comercial ajena al estado de la suscripción.

**Política de ausencia:** Sin fila en `saas_service_subscriptions` → `subscription_active = false`. Sin entrada en `saas_services` para `smart_incidents` → `INTERNAL_ERROR`.

**Nota de diseño:** El contrato no expone el raw `status` de la suscripción; solo el booleano derivado. La semántica de qué estados son "activos" es interna a Core.

---

### Contrato 2 — SmartConversations → Smart Incidents

**Responsabilidad:** Exponer los hechos `incident_creation_capability_active` y `source_channel_active` para un tenant y canal dados.

**Input conceptual:**
```typescript
{
  client_account_id: string;
  operation: "create_incident";
  source_channel: "whatsapp" | "webchat";
}
```

**Output conceptual (éxito):**
```typescript
{
  incident_creation_capability_active: boolean;
  source_channel_active: boolean;
}
```

**Output (fallo técnico):** mecanismo a definir en SI-P4C2B. Debe distinguir fallo técnico de ausencia de configuración.

**Datos PROHIBIDOS en el output:**
- `conv_incidencias` (namespace interno de SC)
- Cualquier nombre `conv_*`
- `wasender_session_id`
- `webhook_secret`
- Estado raw de la sesión WA (`status`, `connected_at`, etc.)
- `widget_public_key`, `allowed_origins`, `widget_color`
- `api_key_secret_name`
- `config` (jsonb interno)
- Identificadores de sesiones o cases
- Cualquier dato sensible de configuración de canal

**Política de ausencia:**
- Sin fila en `conv_service_activations` para `(tenant, conv_incidencias, channel)` → `incident_creation_capability_active = false`.
- Sin fila en `conv_wa_sessions` para el tenant (WA) → `source_channel_active = false`.
- Sin fila en `conv_wc_configs` para el tenant (WC) → `source_channel_active = false`.
- Ninguna de las anteriores es error técnico.

---

## 11. Rutas documentales de los contratos

Las rutas siguen el patrón `docs/<fact-owner>/integrations/smart-incidents-entitlement/v1/<contrato>.md`.

### Contrato Core → Smart Incidents

```
docs/core/integrations/smart-incidents-entitlement/v1/contract-subscription-fact.md
```

**Nota:** La ruta `docs/core/` puede requerir verificación de las convenciones reales del directorio Core en el repositorio. Si la convención es distinta, la carpeta raíz se adapta. La subcarpeta `integrations/smart-incidents-entitlement/v1/` es invariante.

### Contrato SmartConversations → Smart Incidents

```
docs/smart-conversations/integrations/smart-incidents-entitlement/v1/contract-incident-channel-facts.md
```

### Política de versiones

- Cada versión vive en su propia carpeta (`v1/`, `v2/`).
- Un fichero de una versión cerrada no se modifica. Los cambios van a una carpeta nueva.
- Breaking change → nueva versión (ver §12).
- Un único `.md` canónico por versión de cada contrato.
- Los ficheros son visibles para agentes como contratos/skills del módulo propietario.

---

## 12. Política de `additionalProperties` y versionado

```
additionalProperties = false
```

seleccionada para ambos contratos.

**Consecuencias:**
- El output del contrato es exacto y cerrado. Sin campos implícitos.
- Añadir cualquier campo al wire format es breaking change.
- Cambiar la semántica de un campo existente es breaking change.
- Cambiar la política de ausencia (false ↔ error) es breaking change.
- Fusionar un fallo técnico con `false` es breaking change.
- Eliminar un campo es breaking change.
- Cambiar el tipo de un campo es breaking change.
- Añadir un gate al output es breaking change.
- Cambiar el owner del contrato requiere decisión de arquitectura formal.

**Los datos internos (tablas, columnas, lógica de consulta) pueden evolucionar** sin afectar el contrato mientras el wire format y la semántica permanezcan idénticos.

---

## 13. Modelo real de service_role

```
ONE_SHARED_SUPABASE_SERVICE_ROLE
```

El proyecto Supabase es único (`project_id = "smartroom-rental"` — `supabase/config.toml`). Existe una única variable `SUPABASE_SERVICE_ROLE_KEY` compartida por todas las Edge Functions del proyecto.

**No existe aislamiento técnico de credenciales por módulo.** "Service role de SI" y "service role de SC" son la misma credencial técnica. La separación es puramente convencional.

La arquitectura `OPTION_C_REFINED` no depende de credenciales separadas por módulo. Los adapters futuros deben minimizar el acceso mediante:

- Contratos explícitos con interfaces estrechas.
- Funciones de consulta acotadas al dominio del módulo.
- Revisión de imports y queries en CI.
- Tests estructurales que verifiquen ausencia de referencias `conv_*` en código de SI.
- Grants mínimos si se implementa RPC (dentro del módulo propio).
- Ausencia de consultas directas SI → `conv_*`.

No se deben diseñar credenciales ficticias por módulo que no existen en la plataforma.

---

## 14. Riesgos restantes tras SI-P4C1

| Riesgo | Severidad | Estado |
|---|---|---|
| TOCTOU residual entre Gate 1 y Gates 2+3 | Bajo — activaciones son eventos lentos | Aceptado con `BEST_EFFORT_CROSS_SOURCE_SNAPSHOT` |
| `saas_services.code = 'smart_incidents'` sin seed en repositorio | Medio | INF-001 — requiere verificación en producción |
| Contrato Core → SI no existe (requiere colaboración de Core) | Alto | Resuelto en SI-P4C2A |
| Contrato SC → SI no existe | Alto | Resuelto en SI-P4C2B |
| service_role compartida: separación solo convencional | Medio | Documentado; mitigado por tests estructurales |
| `conv-core-get-tenant-features` no es reutilizable como fuente de Gates 2+3 sin modificación | Informativo | No se modifica en SI-P4C1 |

---

## 15. Contradicciones restantes

| ID | Descripción | Estado |
|---|---|---|
| C-001 | GATE_2_GATE_3_MODEL_CONTRADICTION | **RESUELTA** — ver §3 |
| C-002 | OWNER_DECISION_PENDING | **RESUELTA** — ver §4, §5, §7 |
| C-003 | service_role no aislada técnicamente | Documentado como `ONE_SHARED_SUPABASE_SERVICE_ROLE` — no es contradicción sino restricción de plataforma |
| C-004 | `conv-core-get-tenant-features` sin Gate 1 | Informativa — no es contradicción; la EF existente no es la fuente de SI |

No quedan contradicciones bloqueantes.

---

## 16. Inferencias pendientes de verificación

| ID | Inferencia | Estado |
|---|---|---|
| INF-001 | `saas_services.code = 'smart_incidents'` existe en producción | Pendiente — sin seed en repositorio |
| INF-002 | Proceso de alta de `smart_incidents` documentado fuera del repositorio | Pendiente |
| INF-003 | `conv_service_activations` tiene filas con `conv_incidencias` para tenants activos | Pendiente — sin seed de prueba |

---

## 17. Estados finales de SI-P4C1

```
GATE_2_GATE_3_SEMANTICS_RESOLVED
FACT_OWNERSHIP_RESOLVED
ENTITLEMENT_DECISION_OWNER_SMART_INCIDENTS
BEST_EFFORT_CROSS_SOURCE_SNAPSHOT_ACCEPTED
TWO_VERSIONED_FACT_CONTRACTS_REQUIRED
OPTION_C_REFINED_SELECTED
ENTITLEMENT_ARCHITECTURE_SELECTED
```

---

## 18. Siguiente fase

SI-P4C1 cierra la decisión arquitectónica. La siguiente fase comprende:

| Sublote | Objetivo | Prerrequisito |
|---|---|---|
| **SI-P4C2A** | Diseño del contrato Core → Smart Incidents v1 (`contract-subscription-fact.md`) | SI-P4C1 aprobado |
| **SI-P4C2B** | Diseño del contrato SmartConversations → Smart Incidents v1 (`contract-incident-channel-facts.md`) | SI-P4C1 aprobado |
| Revisión cruzada | Revisión de los dos contratos por los owners (Core team y SC team) | SI-P4C2A + SI-P4C2B |
| SI-P4D | Adapter concreto de SI que implementa `IncidentEntitlementPort` con los dos contratos | Contratos aprobados |
| SI-P4E | Integración del adapter en el handler HTTP de SI | SI-P4D |

No se mezclan contratos, adapters e integración HTTP en el mismo lote.

---

## 19. Confirmaciones de no implementación

| Ítem | Confirmación |
|---|---|
| No se creó código | ✓ Ningún fichero `.ts`, `.js`, `.sql` nuevo |
| No se crearon contratos v1 | ✓ Sin ficheros `contract-*.md` de los contratos finales |
| No se creó RPC | ✓ Sin `CREATE FUNCTION` ni `supabase.rpc()` |
| No se creó Edge Function | ✓ Sin `Deno.serve` ni directorio nuevo en `supabase/functions/` |
| No se crearon adapters | ✓ Sin adapters en `supabase/functions/_shared/` |
| No se crearon migraciones | ✓ Sin ficheros en `supabase/migrations/` |
| No se modificó SI-P4A | ✓ `entitlement-types.ts`, `entitlement-port.ts`, `entitlement-policy.ts` sin cambios |
| No se modificó handler HTTP | ✓ `http-handler.ts` sin cambios |
| No se utilizó service_role | ✓ Sin `SUPABASE_SERVICE_ROLE_KEY` en código nuevo |
| No se modificó SmartConversations | ✓ Sin cambios en `supabase/functions/conv-*` ni en `docs/smart-conversations/` |
| No se modificó Core | ✓ Sin cambios en tablas Core ni en documentación Core |
| No se modificó SmartLock | ✓ Sin cambios en `sal-*` |
| No hubo deploy | ✓ Sin `supabase functions deploy` |
