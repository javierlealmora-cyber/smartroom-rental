# Contrato intermodular v1 — Hechos de entitlement: Capacidad de incidencias y canal activo

**Identificador del contrato:** SI-P4C2B-SC  
**Versión del esquema:** 1.0 (`v1/`)  
**Productor de hechos (Fact Owner / Responder):** SmartConversations (SC)  
**Consumidor de hechos (Consumer / Decision Maker):** Smart Incidents (SI)  
**Operación cubierta:** `create_incident`  
**Estado:** `DRAFT_OWNER_REVIEW_COMPLETE` — `CONSUMER_REVIEW_PENDING_SMART_INCIDENTS`  
**Gaps abiertos:** `CALLER_AUTH_PATTERN_PENDING`  
**Clasificación de atomicidad:** `BEST_EFFORT_MULTI_QUERY_SNAPSHOT` (VERIFIED)  
**Ruta canónica:** `docs/smart-conversations/integrations/smart-incidents-entitlement/v1/contract-incident-channel-facts.md`  
**Fecha de redacción:** 2026-08-04

---

## 1. Propósito

Este contrato define los dos hechos neutrales de entitlement que SmartConversations (SC) provee a Smart Incidents (SI) para su evaluación de acceso previo a la creación de un incidente de origen conversacional.

Los dos hechos cubiertos son:

| Identificador del hecho | Gate SI | Descripción |
|------------------------|---------|-------------|
| `incident_creation_capability_active` | Gate 2 | SC tiene habilitada la capacidad de incidencias (`conv_incidencias`) para este tenant en el canal solicitado — Nivel 3 del modelo de activación de SC |
| `source_channel_active` | Gate 3 | La infraestructura del canal conversacional solicitado está activa para este tenant — Nivel 2 del modelo de activación de SC |

**Principio de separación de responsabilidades:**

SC actúa exclusivamente como propietario de hechos: evalúa el estado de su configuración interna y publica booleanos neutrales. SC no evalúa la política de decisión de SI.

SI actúa exclusivamente como decisor de política: combina `Gate2 AND Gate3` con su propia verificación de suscripción activa al add-on (`saas_service_subscriptions.status = 'active'`). SI no delega en SC la evaluación del resultado conjunto.

SC nunca decide si un incidente puede crearse. SI nunca delega esa decisión en SC.

---

## 2. Cuándo se usa

Este contrato se invoca por Smart Incidents en el flujo de validación previo a la creación de un incidente de origen conversacional (`source: 'smart_conversations'`).

**Precondiciones obligatorias en SI antes de invocar este contrato:**

1. El `conv_case` y la `conv_session` han sido resueltos server-side (`CONSUMER_TENANT_CONTEXT_RESOLVED_SERVER_SIDE`).
2. El canal ha sido resuelto canónicamente desde `conv_session.channel` (`CONSUMER_SOURCE_CHANNEL_RESOLVED_SERVER_SIDE`).
3. La identidad del actor (Gate 1 de SI) ha sido evaluada por SC internamente.
4. El `client_account_id` en la solicitud proviene de `resolveTenantFromContext()` — nunca del body original sin validar.
5. El `source_channel` en la solicitud coincide exactamente con el canal resuelto por `resolveIncidentSourceChannel()`.

**Condiciones de no invocación:**

- Si la fuente del incidente es distinta de `smart_conversations`, este contrato no aplica.
- Si `client_account_id` no ha sido resuelto server-side, este contrato no debe invocarse.

---

## 3. Productor

**SmartConversations (SC)** es el propietario de los hechos de entitlement conversacional para el módulo de incidencias.

SC es responsable de:

- Mantener el estado de activación de `conv_incidencias` por tenant × canal (`conv_service_activations`).
- Mantener el estado operativo del canal WhatsApp por tenant (`conv_wa_sessions.status`).
- Mantener el estado operativo del canal WebChat por tenant (`conv_wc_configs.is_active`).
- Responder con booleanos que reflejen el estado actual en el momento de la consulta.
- Rechazar solicitudes que no cumplan el esquema antes de evaluar ningún hecho.
- Retornar el error de fallo técnico apropiado cuando no pueda evaluar los hechos.
- Registrar en logs de auditoría toda solicitud recibida (sin PII).

SC no es responsable de:

- Decidir si el incidente se crea o se rechaza.
- Verificar la suscripción activa al add-on `smart_incidents` en `saas_service_subscriptions`.
- Evaluar la autorización de dominio específica de la operación en SI.

---

## 4. Consumidor

**Smart Incidents (SI)** es el decisor de política para la creación de incidentes de origen conversacional.

SI es responsable de:

- Invocar este contrato con `client_account_id` y `source_channel` válidos y ya resueltos server-side.
- Evaluar de forma independiente su propia gate: suscripción activa al add-on `smart_incidents`.
- Aplicar la política conjunta: `(suscripción activa SI) AND (Gate2) AND (Gate3)`.
- Rechazar la creación fail-closed si cualquier gate falla, incluida la propia.
- Tratar un error de fallo técnico de SC como gate no superada (fail-closed).

SI no puede:

- Asumir que `incident_creation_capability_active: true` implica suscripción activa al add-on.
- Omitir su propia verificación de suscripción basándose en los hechos de SC.
- Interpretar un hecho `false` como un error de SC.
- Asumir un hecho positivo por defecto cuando SC devuelve un error técnico.

---

## 5. Esquema de solicitud (request v1)

SI envía a SC la siguiente solicitud. El esquema es cerrado: `additionalProperties: false`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "contract_version",
    "request_id",
    "correlation_id",
    "client_account_id",
    "operation",
    "source_channel"
  ],
  "properties": {
    "contract_version": {
      "type": "string",
      "const": "1.0",
      "description": "Versión del contrato que SI implementa. Valor fijo en v1: '1.0'. Case-sensitive."
    },
    "request_id": {
      "type": "string",
      "format": "uuid",
      "description": "Identificador único de esta invocación concreta. Generado por SI. Utilizado para trazabilidad y diagnóstico. Un retry puede utilizar un request_id nuevo. No es clave de idempotencia. No deduplica solicitudes. No autentica. No autoriza. No selecciona tenant."
    },
    "correlation_id": {
      "type": "string",
      "format": "uuid",
      "description": "Identificador del journey lógico completo de SI. Se propaga a través de los límites de módulo para trazabilidad cruzada. No es autenticación."
    },
    "client_account_id": {
      "type": "string",
      "format": "uuid",
      "description": "Tenant para el que se consultan los hechos. Representa el contexto de tenant solicitado (REQUESTED_TENANT_CONTEXT). No autentica ni autoriza al llamante. Debe provenir de resolveTenantFromContext() — nunca del body original."
    },
    "operation": {
      "type": "string",
      "const": "create_incident",
      "description": "Operación que SI pretende ejecutar. Valor fijo en v1: 'create_incident'. Case-sensitive. SC no normaliza typos ni aplica fallback."
    },
    "source_channel": {
      "type": "string",
      "enum": ["whatsapp", "webchat"],
      "description": "Canal conversacional de origen. Debe coincidir exactamente con conv_session.channel resuelto server-side. Case-sensitive. SC no normaliza typos ni aplica fallback."
    }
  }
}
```

SC rechaza con `VALIDATION_ERROR` cualquier solicitud que incluya campos no declarados en este esquema, que omita campos obligatorios, o que presente valores fuera del enum o de las constantes.

---

## 6. Campos de la solicitud

| Campo | Tipo | Constraint | Descripción | Fuente obligatoria en SI |
|-------|------|-----------|-------------|--------------------------|
| `contract_version` | `string` | const `"1.0"` | Versión del contrato. Case-sensitive. | Valor fijo `"1.0"` |
| `request_id` | `string` UUID | obligatorio | Identificador de esta invocación | `crypto.randomUUID()` en SI antes de invocar |
| `correlation_id` | `string` UUID | obligatorio | ID del journey lógico de SI | Propagado desde el flujo de SI |
| `client_account_id` | `string` UUID | obligatorio | Tenant solicitado | `resolveTenantFromContext()` |
| `operation` | `string` | const `"create_incident"` | Operación declarada. Case-sensitive. | Valor fijo `"create_incident"` |
| `source_channel` | `string` enum | `["whatsapp","webchat"]` | Canal a evaluar | `resolveIncidentSourceChannel(conv_session.channel)` |

Ningún campo es opcional. La solicitud mínima es igual a la solicitud completa.

---

## 7. Esquema de respuesta exitosa (success response v1)

Cuando SC puede evaluar los hechos correctamente, responde con la siguiente estructura. El esquema es cerrado: `additionalProperties: false`.

**Prohibición explícita:** La respuesta exitosa no contiene `ok`, `data`, `success`, `result`, `meta`, echo de tenant, echo de canal ni timestamp de evaluación.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "contract_version",
    "request_id",
    "correlation_id",
    "incident_creation_capability_active",
    "source_channel_active"
  ],
  "properties": {
    "contract_version": {
      "type": "string",
      "const": "1.0",
      "description": "Versión del contrato con la que SC respondió."
    },
    "request_id": {
      "type": "string",
      "format": "uuid",
      "description": "Eco del request_id recibido. Permite a SI correlacionar la respuesta con la solicitud enviada."
    },
    "correlation_id": {
      "type": "string",
      "format": "uuid",
      "description": "Eco del correlation_id recibido. Propagado para trazabilidad cruzada."
    },
    "incident_creation_capability_active": {
      "type": "boolean",
      "description": "Gate 2: true si SC tiene habilitada la capacidad 'conv_incidencias' para este tenant en el canal solicitado (conv_service_activations, Nivel 3). false si está deshabilitada, inexistente, o is_active=false. Un valor false no es un error — es un hecho válido negativo."
    },
    "source_channel_active": {
      "type": "boolean",
      "description": "Gate 3: true si la infraestructura del canal solicitado está activa para este tenant (conv_wa_sessions.status='active' para whatsapp; conv_wc_configs.is_active=true para webchat). false si está inactiva o inexistente. Un valor false no es un error — es un hecho válido negativo."
    }
  }
}
```

---

## 8. Campos de la respuesta exitosa

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| `contract_version` | `string` const `"1.0"` | No | Versión del contrato SC respondió |
| `request_id` | `string` UUID | No | Eco del request_id de la solicitud |
| `correlation_id` | `string` UUID | No | Eco del correlation_id de la solicitud |
| `incident_creation_capability_active` | `boolean` | No | Gate 2: capacidad de incidencias activa en SC para este tenant × canal |
| `source_channel_active` | `boolean` | No | Gate 3: infraestructura del canal activa en SC para este tenant |

Ningún campo puede ser `null`. Todos son obligatorios.

---

## 9. Esquema de respuesta de error (error response v1)

Cuando SC no puede procesar la solicitud por razón técnica o de seguridad, responde con la siguiente estructura. El esquema es cerrado: `additionalProperties: false` en raíz y en el objeto `error`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "contract_version",
    "request_id",
    "correlation_id",
    "error"
  ],
  "properties": {
    "contract_version": {
      "type": "string",
      "const": "1.0"
    },
    "request_id": {
      "type": "string",
      "format": "uuid",
      "description": "Eco del request_id recibido, si fue parseable. UUID vacío si el body era inválido."
    },
    "correlation_id": {
      "type": "string",
      "format": "uuid",
      "description": "Eco del correlation_id recibido, si fue parseable. UUID vacío si el body era inválido."
    },
    "error": {
      "type": "object",
      "additionalProperties": false,
      "required": ["code", "message", "retryable"],
      "properties": {
        "code": {
          "type": "string",
          "enum": [
            "VALIDATION_ERROR",
            "AUTHENTICATION_REQUIRED",
            "CALLER_NOT_AUTHORIZED",
            "DEPENDENCY_UNAVAILABLE",
            "INTERNAL_ERROR"
          ]
        },
        "message": {
          "type": "string",
          "description": "Mensaje seguro para logs internos. Sin PII, sin secretos, sin SQL, sin stack trace. Nunca exponer al usuario final."
        },
        "retryable": {
          "type": "boolean",
          "description": "true únicamente para DEPENDENCY_UNAVAILABLE. false para el resto."
        }
      }
    }
  }
}
```

**Nota sobre `retry_after_seconds`:** El catálogo de integración superior (`integration-contract-catalog.md`) incluye `retry_after_seconds` en el objeto `error` del formato canónico con wrapper. Este contrato no usa ese formato. `retry_after_seconds` no forma parte del error response de v1 porque no hay respaldo documental verificado para el formato plano sin wrapper. Clasificación: INFERRED desde catálogo superior, CONSUMER_RATIFICATION_PENDING para inclusión en este contrato.

---

## 10. Catálogo de errores

**Clasificación del esquema de error:** INFERRED — CONSUMER_RATIFICATION_PENDING  
Los códigos de error a continuación se derivan del catálogo de integración de SC y de los patrones de autorización documentados en el authentication-authorization-matrix. No existe un registro explícito de códigos canónicos cross-module verificado que los incluya expresamente para contratos de entitlement intermodular. Pendiente de ratificación por Smart Incidents.

| Código | HTTP | Retryable | Causa | Comportamiento de SI |
|--------|------|-----------|-------|----------------------|
| `VALIDATION_ERROR` | 400 | `false` | La solicitud no cumple el esquema: campo obligatorio ausente, tipo incorrecto, valor fuera del enum o la constante, campo adicional no declarado | No reintentar. Rechazar fail-closed. Es un defecto en SI. |
| `AUTHENTICATION_REQUIRED` | 401 | `false` | SC no puede verificar la identidad del llamante. Sin credencial válida. | No reintentar. Rechazar fail-closed. Revisar mecanismo de autenticación (CALLER_AUTH_PATTERN_PENDING). |
| `CALLER_NOT_AUTHORIZED` | 403 | `false` | El llamante está autenticado pero no está autorizado para consultar los hechos del tenant solicitado. Posible intento de cross-tenant. | No reintentar. Rechazar fail-closed. Registrar para diagnóstico de seguridad. |
| `DEPENDENCY_UNAVAILABLE` | 503 | `true` | La base de datos o dependencia interna de SC no está disponible para evaluar los hechos. | Reintentar con backoff exponencial (máx. 2 reintentos). Si persiste, rechazar fail-closed. |
| `INTERNAL_ERROR` | 500 | `false` | Error interno inesperado en SC — bug, estado inválido o excepción no controlada. | No reintentar. Rechazar fail-closed. Registrar para diagnóstico en SC. |

**Código prohibido en este contrato: `FEATURE_DISABLED`**

Un hecho `false` no es un error de SC. Si `conv_incidencias` no está activado para el tenant, SC devuelve una respuesta exitosa con `incident_creation_capability_active: false`. Usar `FEATURE_DISABLED` para comunicar un hecho negativo sería una violación semántica del contrato.

**Código eliminado respecto a borrador anterior: `REQUEST_INVALID`**

Sustituido por `VALIDATION_ERROR` para alineación con el catálogo de integración superior.

---

## 11. Ausencia funcional frente a fallo técnico

Este contrato distingue estrictamente entre dos clases de resultado negativo:

### 11.1 Ausencia funcional → respuesta exitosa con `false`

SC devuelve HTTP 200 con la respuesta exitosa y el hecho en `false` en los siguientes casos:

**Para `incident_creation_capability_active`:**
- No existe fila en `conv_service_activations` con `client_account_id + service_code='conv_incidencias' + channel=source_channel`
- Existe fila pero `is_active = false`

**Para `source_channel_active`:**
- `source_channel = 'whatsapp'`: no existe fila en `conv_wa_sessions` con `client_account_id`, o existe pero `status != 'active'`
- `source_channel = 'webchat'`: no existe fila en `conv_wc_configs` con `client_account_id`, o existe pero `is_active = false`

En todos estos casos, SC responde con la respuesta exitosa (§7) con el hecho correspondiente en `false`. No es un error de SC. Es la respuesta correcta que refleja la configuración actual del tenant.

### 11.2 Fallo técnico → respuesta de error

SC devuelve la respuesta de error (§9) cuando ocurre un problema técnico que impide evaluar los hechos:

- Error de base de datos (query fallida, timeout de conexión)
- Timeout interno al consultar `conv_service_activations`, `conv_wa_sessions` o `conv_wc_configs`
- Dependencia de infraestructura caída
- Respuesta interna malformada que impide completar la evaluación
- Excepción inesperada en SC

**SI nunca convierte un fallo técnico en `false` implícito.** Si SC devuelve un error, SI rechaza fail-closed la operación sin asumir ningún hecho positivo ni negativo. Un fallo técnico de SC es una gate no superada para SI.

---

## 12. Gate 2 — `incident_creation_capability_active`

### 12.1 Semántica

Gate 2 evalúa si SC tiene habilitada la capacidad de incidencias para el tenant solicitado en el canal solicitado (Nivel 3 del modelo de activación de SC).

Es una fact específica por tenant × canal. No existe una activación de `conv_incidencias` "global para el tenant" sin canal: la activación es siempre per (tenant, canal).

### 12.2 Fuente

**Tabla:** `conv_service_activations`  
**Migración:** `20260716000001_smart_conversations_core_schema.sql`  
**Clasificación:** VERIFIED

```sql
-- Estructura relevante (extraído de la migración)
CREATE TABLE conv_service_activations (
  client_account_id   uuid        NOT NULL,
  service_code        text        NOT NULL
                      CHECK (service_code IN ('conv_incidencias', 'conv_publicaciones', 'conv_ayuda')),
  channel             text        NOT NULL
                      CHECK (channel IN ('whatsapp', 'webchat')),
  is_active           boolean     NOT NULL DEFAULT true,
  deactivated_at      timestamptz,
  UNIQUE (client_account_id, service_code, channel)
);
```

**Columnas relevantes para Gate 2:**
- `client_account_id` — scope tenant
- `service_code` — filtro fijo: `'conv_incidencias'`
- `channel` — filtro dinámico: valor de `source_channel` en la solicitud
- `is_active` — booleano de activación actual

### 12.3 Cardinalidad

Cardinalidad por (`client_account_id`, `service_code='conv_incidencias'`, `channel=source_channel`):

**0 o 1 filas.** La constraint `UNIQUE (client_account_id, service_code, channel)` garantiza que no puede haber más de una fila para esta combinación. No existe ambigüedad de selección.

**Clasificación:** VERIFIED — evidenciado por constraint en migración `20260716000001_smart_conversations_core_schema.sql`.

### 12.4 Regla de selección

```
SELECT is_active
FROM conv_service_activations
WHERE client_account_id = $client_account_id
  AND service_code = 'conv_incidencias'
  AND channel = $source_channel
```

- **0 filas** → `incident_creation_capability_active = false` (ausencia funcional)
- **1 fila con `is_active = true`** → `incident_creation_capability_active = true`
- **1 fila con `is_active = false`** → `incident_creation_capability_active = false` (ausencia funcional)

**Clasificación:** VERIFIED — evidenciado por `UNIQUE` constraint (migración), `is_active` column semantics (migración), y evaluación equivalente en `supabase/functions/conv-core-get-tenant-features/index.ts` (filtra `.eq('is_active', true)` sobre `conv_service_activations`).

### 12.5 Tratamiento de filas históricas

`conv_service_activations` no tiene semántica de "versión histórica". La fila existente representa el estado actual. `deactivated_at` es metadata de auditoría, no una flag que afecte la cardinalidad — la constraint UNIQUE previene filas duplicadas.

No se requiere selección de "fila más reciente" ni "fila canónica": la constraint garantiza unicidad. Si `is_active = false`, el hecho es `false`.

---

## 13. Gate 3 — `source_channel_active`

Gate 3 evalúa si la infraestructura del canal conversacional solicitado está activa para el tenant (Nivel 2 del modelo de activación de SC). La evaluación depende del valor de `source_channel`.

### 13.1 WhatsApp (`source_channel = 'whatsapp'`)

#### Fuente

**Tabla:** `conv_wa_sessions`  
**Migración:** `20260716000001_smart_conversations_core_schema.sql`  
**Clasificación:** VERIFIED

```sql
-- Estructura relevante (extraído de la migración)
CREATE TABLE conv_wa_sessions (
  client_account_id     uuid        NOT NULL UNIQUE,
  status                text        NOT NULL DEFAULT 'disconnected'
                        CHECK (status IN ('disconnected', 'connecting', 'active', 'error')),
  ...
);
```

**Columnas relevantes:**
- `client_account_id` — scope tenant, UNIQUE constraint
- `status` — estado operativo de la sesión Wasender

#### Cardinalidad

Cardinalidad por `client_account_id`:

**0 o 1 filas.** La constraint `UNIQUE client_account_id` en `conv_wa_sessions` garantiza un máximo de una sesión WhatsApp por tenant. No existe selección de "sesión canónica" ni "sesión más reciente" porque solo puede haber una.

**Clasificación:** VERIFIED — evidenciado por `UNIQUE` constraint en migración `20260716000001_smart_conversations_core_schema.sql`.

No existen sesiones históricas concurrentes: `conv_wa_sessions` no es una tabla de historial sino de estado actual. El offboarding definitivo se realiza via `conv-offboard-wa-session` que elimina el registro, no que añade uno nuevo (rules-20 §3.3).

#### Selección de fila

No aplica selección: la cardinalidad es como máximo 1.

#### Regla de evaluación

```
SELECT status
FROM conv_wa_sessions
WHERE client_account_id = $client_account_id
```

- **0 filas** → `source_channel_active = false` (ausencia funcional: sin sesión WA configurada)
- **1 fila con `status = 'active'`** → `source_channel_active = true`
- **1 fila con `status IN ('disconnected', 'connecting', 'error')`** → `source_channel_active = false` (ausencia funcional)

**Clasificación:** VERIFIED — evidenciado por `UNIQUE` constraint, `status` CHECK (migración), y evaluación equivalente en `supabase/functions/conv-core-get-tenant-features/index.ts` (`.eq('status', 'active').limit(1)`; `.limit(1)` es redundante dado el UNIQUE pero no contradice la semántica).

### 13.2 WebChat (`source_channel = 'webchat'`)

#### Fuente

**Tabla:** `conv_wc_configs`  
**Migración:** `20260716000001_smart_conversations_core_schema.sql`  
**Clasificación:** VERIFIED

```sql
-- Estructura relevante (extraído de la migración)
CREATE TABLE conv_wc_configs (
  client_account_id   uuid        NOT NULL UNIQUE,
  is_active           boolean     NOT NULL DEFAULT false,
  ...
);
```

**Columnas relevantes:**
- `client_account_id` — scope tenant, UNIQUE constraint
- `is_active` — booleano de activación del canal WebChat

#### Cardinalidad

Cardinalidad por `client_account_id`:

**0 o 1 filas.** La constraint `UNIQUE client_account_id` en `conv_wc_configs` garantiza una sola configuración WebChat por tenant.

**Clasificación:** VERIFIED — evidenciado por `UNIQUE` constraint en migración `20260716000001_smart_conversations_core_schema.sql`.

No existen configuraciones históricas concurrentes: `conv_wc_configs` es una tabla de estado actual, no de historial. El default de `is_active` es `false` (el canal no está activo hasta activación explícita).

#### Selección de fila

No aplica selección: la cardinalidad es como máximo 1.

#### Regla de evaluación

```
SELECT is_active
FROM conv_wc_configs
WHERE client_account_id = $client_account_id
```

- **0 filas** → `source_channel_active = false` (ausencia funcional: sin configuración WebChat)
- **1 fila con `is_active = true`** → `source_channel_active = true`
- **1 fila con `is_active = false`** → `source_channel_active = false` (ausencia funcional)

**Clasificación:** VERIFIED — evidenciado por `UNIQUE` constraint, `is_active boolean NOT NULL DEFAULT false` (migración), y evaluación equivalente en `supabase/functions/conv-core-get-tenant-features/index.ts` (`.eq('is_active', true).limit(1)`).

---

## 14. Atomicidad

**Clasificación:** `BEST_EFFORT_MULTI_QUERY_SNAPSHOT` — VERIFIED

Los dos hechos se evalúan en consultas SQL separadas e independientes, sin transacción conjunta. Evidencia directa:

```
supabase/functions/conv-core-get-tenant-features/index.ts:
  Query 1: conv_service_activations (Gate 2 base)
  Query 2: conv_wa_sessions        (Gate 3 WhatsApp base)
  Query 3: conv_wc_configs         (Gate 3 WebChat base)
  Sin BEGIN / COMMIT. Sin RPC transaccional. Sin función PostgreSQL atómica.
```

**Implicación para SI:** Los dos hechos devueltos pueden reflejar instantes ligeramente distintos de la base de datos si ocurren cambios de configuración concurrentes en SC durante la evaluación. SC no garantiza snapshot consistente entre Gate 2 y Gate 3.

**Opacidad:** El wire de respuesta no expone detalles de implementación de las consultas. Los hechos son booleanos sin metadatos de timestamp ni de consulta interna.

**El contrato wire no cambia si SC implementa atomicidad internamente en el futuro** — siempre que la semántica de los hechos sea la misma. Un cambio de implementación que no altera los campos del wire, el request, el response, ni el catálogo de errores no es un breaking change de versión. Un cambio que altere la semántica observable de los booleanos (ej. añadir un nuevo nivel de activación que modifique el significado de `true`) sí sería un breaking change.

---

## 15. Seguridad y autenticación

### 15.1 Autenticación del llamante

**Estado: `CALLER_AUTH_PATTERN_PENDING`**

El mecanismo de autenticación que SI usa para invocar SC en este contrato no está determinado. No se han seleccionado ni aprobado opciones en esta versión.

**Principios de seguridad aplicables independientemente del mecanismo:**

- La comunicación es exclusivamente backend-to-backend. Ningún browser invoca este endpoint.
- `client_account_id` representa el contexto de tenant solicitado (REQUESTED_TENANT_CONTEXT). No autentica ni autoriza al llamante.
- El llamante autenticado debe estar autorizado para la operación concreta (`create_incident`).
- El llamante autenticado debe estar autorizado para consultar los hechos del tenant solicitado. La protección cross-tenant es obligatoria: que SI esté autenticado no implica que pueda consultar cualquier tenant.
- El tenant en `client_account_id` es el tenant solicitado; la autorización del llamante para ese tenant es una verificación separada que ocurre server-side en SC.
- `service_role` de Supabase no es una credencial intermodular válida para esta integración. La service_role key es interna al módulo que la posee.
- Las credenciales de autenticación no viajan en el body. El body contiene únicamente los campos del esquema (§5).
- Ningún secreto de autenticación se registra en logs.
- Hasta que se resuelva `CALLER_AUTH_PATTERN_PENDING`, ninguna implementación de este contrato puede activarse en modo `real` ni `canary`.

### 15.2 CORS

No aplica. Esta es una comunicación backend-to-backend. Ningún navegador invoca este endpoint.

### 15.3 Protección cross-tenant

SC debe verificar que el llamante autenticado tiene autorización para consultar los hechos del `client_account_id` solicitado. Un llamante autenticado no puede consultar el tenant de otro cliente.

`CALLER_NOT_AUTHORIZED` (HTTP 403) cubre el caso en que el llamante está autenticado pero no tiene permiso para el tenant en `client_account_id`.

---

## 16. Headers

### 16.1 `X-Request-Id`

**Clasificación:** INFERRED  
**Evidencia:** Los adaptadores de SC (`core-activity-adapter.ts`, `core-identity-adapter.ts`) propagan `correlation_id` como `X-Request-Id` en llamadas HTTP salientes hacia el Core. Este patrón existe en el código pero no está formalizado como convención obligatoria para contratos intermodulares.

**Aplicación en este contrato:** Los identificadores de trazabilidad `request_id` y `correlation_id` viajan en el body del request (campos del esquema §5). Si en la implementación futura SC adopta un header `X-Request-Id`, no forma parte del esquema wire de v1 — sería un mecanismo opcional adicional.

### 16.2 `X-Caller-Module`

**Clasificación:** NOT_FOUND  
No existe convención documentada ni evidencia en el código de un header `X-Caller-Module` como estándar de trazabilidad para contratos intermodulares de SC. No es un requisito de v1.

### 16.3 `X-Contract-Version`

**Clasificación:** NOT_FOUND  
No existe convención documentada ni evidencia en el código de un header `X-Contract-Version` como estándar. No es un requisito de v1.

### 16.4 Autenticación en headers

El mecanismo de autenticación (cuando se resuelva `CALLER_AUTH_PATTERN_PENDING`) podrá usar headers HTTP (ej. `Authorization: Bearer ...`) o parámetros de la plataforma. Cualquier credencial de autenticación en header no forma parte del esquema wire del body y no se documenta aquí hasta que el patrón se resuelva.

### 16.5 Audience

**Clasificación:** NOT_FOUND  
No existe convención documentada de un header `X-Audience` o `audience` para contratos intermodulares de SC.

---

## 17. Datos permitidos y prohibidos

### 17.1 En la solicitud (SI → SC)

**Permitidos:** `contract_version`, `request_id`, `correlation_id`, `client_account_id`, `operation`, `source_channel` — exactamente los campos del esquema §5.

**Prohibidos en la solicitud:**
- Campos adicionales no declarados (rechazados por `additionalProperties: false`)
- PII del tenant o del usuario (nombre, email, teléfono, sender_ref, profile_id)
- Credenciales de autenticación en body
- Estados internos de SC o SI

### 17.2 En la respuesta exitosa (SC → SI)

**Permitidos:** `contract_version`, `request_id`, `correlation_id`, `incident_creation_capability_active`, `source_channel_active` — exactamente los campos del esquema §7.

**Prohibidos en la respuesta exitosa:**
- Wrappers: `ok`, `data`, `success`, `result`, `meta`
- Echo de `client_account_id`
- Echo de `source_channel`
- `evaluated_at` o cualquier timestamp de evaluación
- Nombre del plan del tenant
- Detalles de configuración interna de SC
- Causa interna del `false` (SC no revela si es "fila inexistente" vs "is_active=false")
- PII del tenant o del usuario
- Stack traces, SQL, secretos

### 17.3 En la respuesta de error (SC → SI)

**Prohibidos en `error.message`:**
- Stack traces
- Sentencias SQL
- Contenido del body de la solicitud
- Secretos o tokens
- PII
- Nombre de tablas internas (opcional pero recomendado)

### 17.4 Opacidad

SC no revela la razón interna de un hecho `false`. SI no puede inferir del wire si `incident_creation_capability_active: false` se debe a "fila inexistente" o "is_active=false". Esta opacidad es intencional y no cambia en versiones futuras sin decisión explícita.

---

## 18. Invariantes del contrato

Las siguientes invariantes son absolutas:

1. **SC nunca decide la política de SI.** Un hecho `true` en ambas gates no autoriza por sí solo la creación del incidente — SI evalúa la conjunción con su propia gate de suscripción.

2. **Un hecho `false` nunca es un error.** `incident_creation_capability_active: false` o `source_channel_active: false` son respuestas exitosas que comunican el estado de configuración actual.

3. **`FEATURE_DISABLED` está prohibido** como código de error en este contrato.

4. **`additionalProperties: false` es aplicable** en los tres schemas (solicitud, respuesta exitosa, respuesta de error raíz y error anidado). No existe "extensión hacia adelante" autorizada.

5. **Sin wrappers** en respuesta exitosa: `ok`, `data`, `success`, `result`, `meta` están prohibidos.

6. **`client_account_id` no autentica.** El hecho de que SI declare un `client_account_id` en la solicitud no implica que esté autorizado para ese tenant.

7. **SI no puede asumir positivo ante fallo técnico.** Si SC devuelve error, SI rechaza fail-closed sin inferir ningún hecho.

8. **SC no revela si un `false` es por ausencia de fila o por `is_active=false`.** La opacidad es parte del contrato.

9. **`operation` y `contract_version` son constantes de v1.** Cualquier cambio en estos valores define una versión distinta del contrato.

10. **La evaluación es por tenant × canal.** No existe un "canal por defecto". SI no puede omitir `source_channel`.

---

## 19. Ejemplos válidos

### Ejemplo 1: Ambos hechos activos

**Solicitud de SI a SC:**
```json
{
  "contract_version": "1.0",
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "correlation_id": "f0e1d2c3-b4a5-6789-0123-456789abcdef",
  "client_account_id": "550e8400-e29b-41d4-a716-446655440000",
  "operation": "create_incident",
  "source_channel": "whatsapp"
}
```

**Respuesta de SC a SI:**
```json
{
  "contract_version": "1.0",
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "correlation_id": "f0e1d2c3-b4a5-6789-0123-456789abcdef",
  "incident_creation_capability_active": true,
  "source_channel_active": true
}
```

**Evaluación en SI:** Suscripción SI activa `AND true AND true` → SI procede si su propia gate también pasa.

---

### Ejemplo 2: Gate 2 deshabilitada — `conv_incidencias` inactivo o inexistente para este canal

**Respuesta de SC a SI:**
```json
{
  "contract_version": "1.0",
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "correlation_id": "f0e1d2c3-b4a5-6789-0123-456789abcdef",
  "incident_creation_capability_active": false,
  "source_channel_active": true
}
```

**Evaluación en SI:** `false AND true` → Gate 2 no superada → SI rechaza fail-closed. SC no decide el rechazo; SI lo decide.

---

### Ejemplo 3: Gate 3 inactiva — sesión WA no activa o sin config WC

**Respuesta de SC a SI:**
```json
{
  "contract_version": "1.0",
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "correlation_id": "f0e1d2c3-b4a5-6789-0123-456789abcdef",
  "incident_creation_capability_active": true,
  "source_channel_active": false
}
```

**Evaluación en SI:** `true AND false` → Gate 3 no superada → SI rechaza fail-closed.

---

### Ejemplo 4: Fallo técnico — dependencia no disponible

**Respuesta de SC a SI (HTTP 503):**
```json
{
  "contract_version": "1.0",
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "correlation_id": "f0e1d2c3-b4a5-6789-0123-456789abcdef",
  "error": {
    "code": "DEPENDENCY_UNAVAILABLE",
    "message": "Database unavailable — entitlement facts could not be evaluated",
    "retryable": true
  }
}
```

**Evaluación en SI:** Reintentar con backoff (máx. 2). Si persiste → rechazar fail-closed. SI no asume ningún hecho.

---

### Ejemplo 5: Llamante no autorizado para el tenant solicitado

**Respuesta de SC a SI (HTTP 403):**
```json
{
  "contract_version": "1.0",
  "request_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "correlation_id": "f0e1d2c3-b4a5-6789-0123-456789abcdef",
  "error": {
    "code": "CALLER_NOT_AUTHORIZED",
    "message": "Caller is not authorized to query entitlement facts for the requested tenant",
    "retryable": false
  }
}
```

---

## 20. Ejemplos inválidos

### Inválido 1: Solicitud con campo adicional

```json
{
  "contract_version": "1.0",
  "request_id": "...",
  "correlation_id": "...",
  "client_account_id": "...",
  "operation": "create_incident",
  "source_channel": "whatsapp",
  "bypass_gate": true
}
```

**Por qué es inválido:** `bypass_gate` no está declarado. `additionalProperties: false` → SC responde `VALIDATION_ERROR`.

---

### Inválido 2: Respuesta exitosa con wrapper

```json
{
  "ok": true,
  "data": {
    "incident_creation_capability_active": true,
    "source_channel_active": true
  }
}
```

**Por qué es inválido:** `ok`, `data` están prohibidos en la respuesta exitosa (invariante §18.5).

---

### Inválido 3: Error devuelto para hecho `false`

```json
{
  "contract_version": "1.0",
  "request_id": "...",
  "correlation_id": "...",
  "error": {
    "code": "FEATURE_DISABLED",
    "message": "El tenant no tiene habilitada la creación de incidentes"
  }
}
```

**Por qué es inválido:** `FEATURE_DISABLED` está prohibido en este contrato (§10). Un hecho `false` se comunica como respuesta exitosa, no como error.

---

### Inválido 4: Canal fuera del enum

```json
{
  "contract_version": "1.0",
  "request_id": "...",
  "correlation_id": "...",
  "client_account_id": "...",
  "operation": "create_incident",
  "source_channel": "sms"
}
```

**Por qué es inválido:** `"sms"` no está en el enum `["whatsapp", "webchat"]` → SC responde `VALIDATION_ERROR`. SI nunca debería llegar a este estado si `resolveIncidentSourceChannel()` fue invocado correctamente.

---

### Inválido 5: SI asume hecho positivo ante error de SC

```
Flujo inválido:
  SI recibe DEPENDENCY_UNAVAILABLE de SC
  SI asume incident_creation_capability_active = true
  SI continúa con la creación del incidente
```

**Por qué es inválido:** SI no puede inferir ningún hecho positivo por defecto ante un fallo técnico de SC. El comportamiento correcto es fail-closed (invariante §18.7).

---

### Inválido 6: Respuesta exitosa con `client_account_id` y `source_channel` como echo

```json
{
  "contract_version": "1.0",
  "request_id": "...",
  "correlation_id": "...",
  "client_account_id": "550e8400-e29b-41d4-a716-446655440000",
  "source_channel": "whatsapp",
  "incident_creation_capability_active": true,
  "source_channel_active": true
}
```

**Por qué es inválido:** `client_account_id` y `source_channel` no son campos de la respuesta exitosa (§7). `additionalProperties: false` → SI debe rechazar esta respuesta como malformada o SC no debe incluirlos.

---

## 21. Versionado

**Versión actual: 1.0 (carpeta `v1/`)**

Con `additionalProperties: false` aplicado en los tres esquemas, cualquier modificación del wire es un breaking change. No existen "cambios aditivos no breaking" en v1 para los cuerpos de solicitud y respuesta.

**Todo lo siguiente es un breaking change y requiere carpeta `v2/` con copia completa del contrato:**

| Categoría | Ejemplo de breaking change |
|-----------|---------------------------|
| Añadir campo al request | Añadir `tenant_context_version` al body del request |
| Añadir campo al success response | Añadir `evaluated_at` o cualquier campo nuevo |
| Añadir campo al error response (raíz o `error`) | Añadir `retry_after_seconds` al objeto `error` |
| Eliminar o renombrar un campo | Renombrar `source_channel` a `channel` |
| Cambiar el tipo de un campo | `incident_creation_capability_active` pasa a string |
| Cambiar required/optional | `correlation_id` se hace opcional |
| Cambiar la semántica de un booleano | `incident_creation_capability_active: true` empieza a incluir evaluación de suscripción SI |
| Añadir otro gate | Añadir `accommodation_context_active` a la respuesta |
| Cambiar ausencia funcional a error | Devolver `FEATURE_DISABLED` cuando el hecho es `false` |
| Cambiar el catálogo wire de errores | Añadir `RATE_LIMITED` al enum de `error.code` |
| Cambiar owner | SC deja de ser el propietario del fact |
| Cambiar `operation` | Nueva operación distinta de `create_incident` |
| Cambiar la política de tenant | El significado de `client_account_id` cambia |
| Cambiar `contract_version` const | La constante pasa de `"1.0"` a otro valor |

**No existe "tolerant reader" en este contrato.** Con `additionalProperties: false` en todos los schemas, SI y SC son estrictos en ambas direcciones. Cualquier campo no declarado es rechazado.

**Una vez certificado, v1 no se modifica.** Los gaps abiertos (`CALLER_AUTH_PATTERN_PENDING`) se resolverán en una actualización documental pre-certificación o en `v2/`. Los estados del contrato (§23) se actualizarán conforme avanza la revisión.

**Proceso de versión nueva:**
1. Crear carpeta `docs/smart-conversations/integrations/smart-incidents-entitlement/v2/`
2. Copiar el contrato completo de `v1/`
3. Aplicar el cambio breaking en la copia de `v2/`
4. `v1` permanece inmutable como referencia histórica

---

## 22. Visibilidad

### 22.1 Visibilidad como contrato

**Clasificación:** VERIFIED  
El fichero es visible por ruta canónica dentro del repositorio:
```
docs/smart-conversations/integrations/smart-incidents-entitlement/v1/contract-incident-channel-facts.md
```
La ruta sigue el patrón de directorio de integración de SC y la convención de naming `contract-*.md`.

### 22.2 Visibilidad como skill

**Clasificación:** NOT_FOUND  
No existe un fichero `SKILL.md`, `skill-*.md` ni front matter `skill:` que incluya o referencie este contrato en el directorio `docs/smart-conversations/skills/` ni en `docs/smart-conversations/integrations/smart-incidents-entitlement/`. Este contrato no es actualmente una skill descubrible por agentes.

### 22.3 Registro en catálogo

**Estado:** SINGLE_FILE_VISIBILITY_CONSTRAINT_CONTRADICTORY  
Para registrar este contrato en el catálogo de integración canónico se requeriría modificar:
```
docs/smart-conversations/integrations/integration-contract-catalog.md
```
Este fichero no ha sido modificado en esta entrega (restricción de único fichero modificado). El registro en el catálogo no es parte del alcance de SI-P4C2B-SC.

---

## 23. Estados del contrato

| Estado | Significado |
|--------|-------------|
| `DRAFT_OWNER_REVIEW_COMPLETE` | Revisión del productor (SC) completada. El contrato está listo para revisión por el consumidor (SI). |
| `CONSUMER_REVIEW_PENDING_SMART_INCIDENTS` | Pendiente de revisión y aceptación por parte de Smart Incidents. |
| `CALLER_AUTH_PATTERN_PENDING` | Gap abierto: el mecanismo de autenticación SI→SC no está definido. Bloquea activación en `real`/`canary`. |

**Estado owner:** `DRAFT_OWNER_REVIEW_COMPLETE`  
**Estado consumer:** `CONSUMER_REVIEW_PENDING_SMART_INCIDENTS`

**No declarar en este contrato:** `CONTRACT_FROZEN`, `CONTRACT_CERTIFIED`, `CONSUMER_ACCEPTED`, `IMPLEMENTATION_AUTHORIZED`, `PROVIDER_IMPLEMENTED`, `INTEGRATION_CERTIFIED`.

---

## 24. Referencias cruzadas

| Documento | Relación | Estado |
|-----------|----------|--------|
| `docs/smart-incidents/rules/rules-10-addon-entitlement.md §4.4` | Normativa que establece la responsabilidad de doble gating SC + SI | VERIFIED |
| `docs/smart-conversations/rules/rules-20-tenant-activation-and-lifecycle.md §4.1` | Modelo de activación de tres niveles — fuente de la semántica de Gate 2 y Gate 3 | VERIFIED |
| `supabase/migrations/20260716000001_smart_conversations_core_schema.sql` | DDL de `conv_service_activations`, `conv_wa_sessions`, `conv_wc_configs` — fuente de cardinalidad y selección | VERIFIED |
| `supabase/functions/conv-core-get-tenant-features/index.ts` | Evidencia de evaluación de gates en código de producción | VERIFIED |
| `docs/smart-conversations/integrations/integration-contract-catalog.md` | Catálogo de integración superior — referencia del formato `contract_version` + `request_id` + `correlation_id` | VERIFIED (patrón body) |
| `supabase/functions/_shared/smart-conversations/adapters/incidents-addon-adapter.ts` | Evidencia del patrón `contract_version`, `request_id`, `correlation_id` en el wire | VERIFIED |
| `docs/smart-conversations/security/authentication-authorization-matrix.md` | Clasificación `internal_service` para EFs conv-core-* y modelo de autenticación service_role interno | VERIFIED |
| `docs/smart-conversations/integrations/incidents-integration-contract.md` | Contrato del flujo completo de creación de incidente SC → add-on (diferente de este contrato intermodular) | VERIFIED (referencia) |
