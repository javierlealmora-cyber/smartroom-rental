# Plan de Remediación de Contrato — Smart Conversations × Smart Incidents
## Fase 11C5E — Contract Remediation Design

**Fecha:** 2026-07-26
**Estado del plan:** `REMEDIATION_DESIGNED_PENDING_IMPLEMENTATION`
**GATE_0:** `PASS_WITH_WARNINGS`
**GATE_1:** `AUDIT_COMPLETE_REMEDIATION_PENDING` — no cerrar hasta cumplir §18

---

## 1. Objetivo y alcance

### Objetivo

Diseñar de forma ejecutable la remediación de los tres gaps estructurales que impiden la integración real SC → SI (identificados en `incidents-cross-module-reconciliation.md`), sin implementar todavía la integración real, sin desplegar, y sin modificar unilateralmente contratos canónicos de Smart Incidents.

### Alcance de este documento

**Incluye:**
- Diseño del campo `title` (generación determinista, fallback, ejemplos)
- Diseño de propagación de `requester_profile_id` (flujo completo desde identidad hasta SI)
- Propuesta de mapeo `urgency_proposal → priority` (pendiente aprobación SI)
- Transformación del modelo de actor (11C1 → 11C5)
- Tabla field-by-field SC → SI
- Estado real de `conv-core-create-incident` (EF inspeccionada)
- Cambios de código previstos (sin implementarlos)
- Tests previstos (sin implementarlos)
- Criterios exactos para cerrar GATE_1

**Excluye:**
- Implementación de código (fuera del alcance 11C5E)
- Despliegue de cualquier entorno
- Activación de canary o modo real
- Creación unilateral de contratos SI
- Fase 11C6 (no comienza)

---

## 2. Fuentes canónicas consultadas

| Fuente | Tipo | Hallazgo clave |
|--------|------|----------------|
| `docs/smart-incidents/rules/rules-00-scope-and-principles.md` | Rules SI | n8n payload reducido; audit_log vía SI service_role (no reaprurable) |
| `docs/smart-incidents/rules/rules-30-incident-creation.md` | Rules SI | `requester_profile_id` OBLIGATORIO; mapeo urgency = responsabilidad SC; no adjuntos V1 |
| `docs/smart-incidents/contracts/contract-incident-entity.md` | Contract SI | `title` OBLIGATORIO max 255; `priority: 'normal'\|'urgent'` obligatorio |
| `supabase/functions/conv-wf20-incidents/index.ts` | EF SC | Lee `profile_id` desde `conv_sessions` en rama STRONG; llama `conv-core-create-incident` |
| `supabase/functions/conv-core-create-incident/index.ts` | EF SC | STUB/MOCK — llama Core interno, NO el add-on SI; lee `profile_id` de sesión |
| `supabase/functions/_shared/smart-conversations/runtime/core-incident-client.ts` | Runtime SC | Mock client; modo real llama `core.incidents.create` (Core SC, no SI) |
| `supabase/functions/_shared/smart-conversations/incidents-integration-port.ts` | Port SC | Puerto neutral 11C5; `CreateIncidentCommand` sin `title` ni `requester_profile_id` |
| `supabase/functions/_shared/smart-conversations/adapters/incidents-addon-adapter.ts` | Adapter 11C1 | Modelo actor obsoleto; llama SI add-on endpoint |
| `supabase/functions/_shared/smart-conversations/canonical-actor.ts` | Tipos SC | TenantProfileActor / UnverifiedLeadActor / SystemServiceActor |
| `docs/smart-conversations/integrations/incidents-integration-contract.md` | Contract SC | Actor permitido: `tenant_profile` o `system_service` (no `unverified_lead`) |
| `docs/smart-conversations/integrations/incidents-addon-openapi-consumer.yaml` | OAS SC | Propuesta consumer; no tiene `title` ni `requester_profile_id` aún |
| `tests/regression/smart-conversations/suites/incidents/incidents.spec.ts` | Tests SC | 80 tests activos sobre WF-20 y conv-core-create-incident |

---

## 3. Hallazgo arquitectónico crítico: dos rutas separadas

El sistema SC tiene actualmente **dos rutas de creación de incidentes** que son arquitectónicamente distintas:

| Ruta | Componentes | Estado actual | Propósito |
|------|-------------|---------------|-----------|
| **Ruta A — Core interno** | WF-20 → `conv-core-create-incident` → `core-incident-client` → Core SC | Implementada en modo mock | Registro de incidentes en el Core SC propio |
| **Ruta B — Add-on externo** | (nuevo EF o extensión) → `IncidentIntegrationPort` → `incidents-addon-adapter` → SI | Arquitectura definida, sin EF wired | Registro de incidentes en Smart Incidents (add-on externo) |

**La remediación no reemplaza la Ruta A — diseña la Ruta B.**

La EF `conv-core-create-incident` **no** está conectada actualmente al `incidents-addon-adapter`. La integración con SI requiere cablear una nueva ruta que pase por `IncidentIntegrationPort`.

---

## 4. Matriz de ownership SC / adapter / SI

| Responsabilidad | Propietario | Artefacto afectado | Puede actuar unilateralmente |
|----------------|------------|-------------------|------------------------------|
| Generación de `title` | SC (EF) | `conv-core-create-incident` o nueva EF | Sí — campo derivado de datos SC |
| Resolución de `requester_profile_id` | SC (WF-20 / EF) | Lee de `conv_sessions` | Sí — ya está disponible en SC |
| Propagación de `requester_profile_id` al adapter | SC | Puerto + adapter | Sí |
| Mapeo `urgency_proposal → priority` (lógica) | SC (EF) | Nueva lógica de transformación | Sí (implementar) |
| Aprobación de tabla de mapeo urgency → priority | **Smart Incidents** | `contract-create-incident-request.md` | **No** — requiere aprobación SI |
| Migración modelo actor 11C1 → 11C5 | SC | `incidents-addon-adapter.ts` | Sí — solo código SC |
| Añadir `title` y `requester_profile_id` al puerto SC | SC | `incidents-integration-port.ts` | Sí — contrato SC |
| Actualización OAS consumer | SC | `incidents-addon-openapi-consumer.yaml` | Sí (como propuesta) |
| Aprobación OAS consumer | **Smart Incidents** | Revisión del equipo SI | **No** — requiere revisión SI |
| Provisión de endpoint DEV | **Smart Incidents** | `INCIDENTS_ADDON_BASE_URL` + token | **No** — infraestructura SI |

---

## 5. Contrato de entrada actual de SmartConversations

La EF `conv-wf20-incidents` envía a `conv-core-create-incident` (Ruta A, Core interno):

```typescript
// Payload actual de WF-20 → conv-core-create-incident
{
  client_account_id: string,   // tenant
  session_id:        string,   // para lookup de profile_id y room_id
  conv_case_id:      string,   // correlación interna SC
  incident_type:     string,   // categoría extraída (ej: 'fuga_agua')
  urgency:           string,   // urgencia extraída (ej: 'high')
  description:       string,   // texto sanitizado del mensaje
  source:            string,   // channel (ej: 'whatsapp')
}
```

La EF `conv-core-create-incident` internamente lee de `conv_sessions`:
- `profile_id` → identifica al residente (disponible si STRONG_MATCH_ACTIVE)
- `identity_data.room_id` → habitación asociada a la sesión

---

## 6. Contrato requerido por Smart Incidents

El contrato `contract-incident-entity.md` §2 requiere en la creación:

```typescript
// Campos OBLIGATORIOS en la llamada al EF de SI
{
  client_account_id:    string,           // tenant
  requester_profile_id: string,           // !! OBLIGATORIO — residente que solicita
  accommodation_id:     string,           // !! OBLIGATORIO — inmueble
  room_id:              string | null,    // habitación (puede ser null)
  source:               'whatsapp' | 'webchat', // para fuentes conversacionales
  category:             string,           // categoría del incidente
  priority:             'normal' | 'urgent', // !! OBLIGATORIO — enum, no free string
  title:                string,           // !! OBLIGATORIO — max 255 chars
  description:          string | null,    // opcional
}
```

El DTO que el adapter SC envía a SI (vía `CreateIncidentCommand` del puerto 11C5) necesita contener todos estos campos mapeados.

---

## 7. Tabla field-by-field

| Campo SI | Obligatorio | Origen SC | Transformación | Propietario transform | Validación SC | Fallback | Test requerido |
|----------|-------------|-----------|----------------|----------------------|---------------|---------|----------------|
| `client_account_id` | ✅ | `body.client_account_id` | Pasa directo | SC EF | Presente + string | — | `N11C5E-FIELD-01` |
| `requester_profile_id` | ✅ | `conv_sessions.profile_id` | EF lee de sesión → incluye en command | SC EF | Not null; fail-closed si null | Ver §8 | `N11C5E-FIELD-02` |
| `accommodation_id` | ✅ | `conv_sessions.identity_data.accommodation_id` | EF lee de identity_data → incluye en command | SC EF | Not null; fail si ausente | Ver §8 §nota-accom | `N11C5E-FIELD-03` |
| `room_id` | ⬜ | `conv_sessions.identity_data.room_id` | EF lee de identity_data → nullable | SC EF | null si no disponible | `null` | `N11C5E-FIELD-04` |
| `source` | ✅ | `body.channel` (`'whatsapp' \| 'webchat'`) | Pasa directo | SC EF | Enum válido | — | `N11C5E-FIELD-05` |
| `category` | ✅ | `extraction.incident_type` | Rename: `incident_type → category` | SC EF | Not empty | — | `N11C5E-FIELD-06` |
| `priority` | ✅ | `extraction.urgency` | `urgency → urgency_proposal → priority` (§9) | SC adapter | Enum `normal\|urgent` | `'normal'` | `N11C5E-FIELD-07` |
| `title` | ✅ | `extraction.incident_type` + `extraction.description` | Generación determinista (§7) | SC EF | Presente; max 255 | `type_label(incident_type)` | `N11C5E-FIELD-08` |
| `description` | ⬜ | `extraction.description` | Pasa como opcional | SC EF | Max 2000 chars (sanitizado) | `null` | `N11C5E-FIELD-09` |
| `actor.type` | ✅ | Fijo: `'system_service'` | Adapter transforma a formato SI | SC adapter | — | — | `N11C5E-FIELD-10` |
| `actor.service_name` | ✅ | Fijo: `'conv-wf20'` | Incluido en SystemServiceActor | SC EF | Not empty | — | `N11C5E-FIELD-11` |
| `idempotency_key` | ✅ | `conv_case_id + ':' + incident_type` o UUID | EF genera o deriva | SC EF | Unique per tenant | UUID v4 generado | `N11C5E-FIELD-12` |
| `contract_version` | ✅ | Fijo: `'1.0'` | Hardcoded en puerto | SC port | Type literal | — | `N11C5E-FIELD-13` |
| `request_id` | ✅ | `crypto.randomUUID()` | EF genera | SC EF | UUID v4 | — | `N11C5E-FIELD-14` |
| `correlation_id` | ✅ | `conv_case_id` | Rename directo | SC EF | Not empty | — | `N11C5E-FIELD-15` |
| `attachments` | ✅ | Fijo: `[]` | Vacío (regla rules-30 §4.6) | SC EF | Siempre vacío en V1 | `[]` | `N11C5E-FIELD-16` |

**§nota-accom:** `accommodation_id` — el campo `identity_data` de `conv_sessions` contiene `room_id`. Si `accommodation_id` no está en `identity_data`, debe cargarse via join `conv_sessions → rooms → accommodation_id`. Este punto requiere verificación de la estructura real de `identity_data`. Si no está disponible, es un gap adicional a documentar.

---

## 8. Diseño de generación de `title`

### Problema

SI requiere `title: string` (OBLIGATORIO, max 255 chars). SC no tiene un campo `title` — dispone de `incident_type` (categoría corta) y `description` (texto libre, hasta 2000 chars).

### Estrategia — determinista, sin dependencia de IA

**Algoritmo:**

```
INCIDENT_TYPE_LABELS = {
  'fuga_agua':        'Fuga de agua',
  'ruido_vecinos':    'Ruido de vecinos',
  'calefaccion':      'Problema de calefacción',
  'electricidad':     'Problema eléctrico',
  'puerta_acceso':    'Problema de acceso',
  'limpieza':         'Solicitud de limpieza',
  'avería_electrodoméstico': 'Avería en electrodoméstico',
  // ... tabla completa definida en EF
}

function generateTitle(incident_type: string, description: string): string {
  const typeLabel = INCIDENT_TYPE_LABELS[incident_type] ?? incident_type;
  const cleanDesc = normalizeText(description);          // (1)
  const maxDescLength = 255 - typeLabel.length - 2;     // ': ' = 2 chars

  if (cleanDesc.length === 0) {
    return truncate(typeLabel, 255);
  }

  const descPart = truncateAtWordBoundary(cleanDesc, maxDescLength);
  return `${typeLabel}: ${descPart}`;
}
```

**(1) normalizeText(text):**
- Elimina caracteres de control (< 0x20, excepto espacio)
- Normaliza whitespace múltiple a espacio simple
- Elimina etiquetas HTML (`<[^>]+>`)
- Elimina datos potencialmente sensibles: URLs, números de teléfono, emails
- Trim de inicio/fin

**truncateAtWordBoundary(text, maxLen):**
- Si `text.length <= maxLen` → retorna `text`
- Busca el último espacio en `text.slice(0, maxLen - 3)`
- Si lo hay → retorna `text.slice(0, lastSpace) + '...'`
- Si no hay → retorna `text.slice(0, maxLen - 3) + '...'`

### Longitud máxima garantizada

- `typeLabel.length` ≤ 40 chars (tabla controlada)
- `': '` = 2 chars
- `descPart` ≤ 255 − 40 − 2 = 213 chars
- Total ≤ 255 chars ✓

### Fallback sin IA

Si `incident_type` no está en la tabla → usar `incident_type` tal cual (snake_case).
Si ambos (`incident_type` y `description`) están vacíos → `title = 'Incidencia registrada'` (9 chars, siempre válido).

### Rol opcional de IA

La IA (si disponible y si `AI_INTEGRATION_MODE=real`) **puede proponer** un `title` mejorado como enhancement opcional. Sin embargo:
- **La creación del incidente no puede depender de la IA.** Si la IA no responde o está en modo mock, el título generado por el algoritmo determinista se usa directamente.
- El título generado por IA solo se usa si: (a) IA responde en tiempo, (b) el título propuesto pasa validación de longitud y normalización.

### Ejemplos

| `incident_type` | `description` | `title` generado |
|----------------|--------------|------------------|
| `fuga_agua` | `Hay una fuga de agua en el baño desde ayer por la mañana` | `Fuga de agua: Hay una fuga de agua en el baño desde ayer por la mañana` |
| `ruido_vecinos` | `(vacío)` | `Ruido de vecinos` |
| `electricidad` | `La luz del pasillo parpadea y se ha fundido un fusible...` (texto largo) | `Problema eléctrico: La luz del pasillo parpadea y se ha fundido un fusible...` (truncado a 255) |
| `unknown_type` | `(vacío)` | `unknown_type` (fallback tipo snake_case) |
| `(vacío)` | `(vacío)` | `Incidencia registrada` |

---

## 9. Diseño de propagación de `requester_profile_id`

### Flujo actual (sin propagación)

```
conv-identity-validate → conv_sessions.profile_id (columna en BD)
WF-20 lee conv_sessions (incluye profile_id en SELECT, línea 95)
WF-20 llama conv-core-create-incident (NO incluye profile_id en payload)
conv-core-create-incident lee profile_id de conv_sessions internamente
core-incident-client NO recibe profile_id
```

### Flujo diseñado (con propagación hacia SI add-on)

```
1. conv-identity-validate → escribe conv_sessions.profile_id
   [EXISTENTE — sin cambios]

2. conv_sessions.profile_id disponible en la base de datos
   [EXISTENTE — columna ya existe]

3. WF-20 lee conv_sessions con SELECT que incluye profile_id (línea 95)
   [EXISTENTE — ya se lee, ya disponible como session.profile_id]

4. WF-20 (STRONG_MATCH_ACTIVE) pasa profile_id al comando hacia SI:
   payload.requester_profile_id = session.profile_id
   [CAMBIO PREVISTO en WF-20 — no implementar en 11C5E]

5. EF SC (nueva o extendida) construye CreateIncidentCommand con:
   requester_profile_id = payload.requester_profile_id
   [CAMBIO PREVISTO en EF — no implementar en 11C5E]

6. CreateIncidentCommand incluye requester_profile_id como campo raíz o en incident.*
   [CAMBIO PREVISTO en incidents-integration-port.ts — no implementar en 11C5E]

7. incidents-addon-adapter incluye requester_profile_id en el body hacia SI
   [CAMBIO PREVISTO en adapter — no implementar en 11C5E]

8. SI recibe y registra requester_profile_id en inc_incidents
   [Responsabilidad SI — sin cambios SC]
```

### Comportamiento si `requester_profile_id` está ausente

**Regla:** La ausencia de `requester_profile_id` debe producir **fail-closed**. Nunca crear una incidencia anónima en SI.

**Error estable:** `REQUESTER_IDENTITY_REQUIRED`

```typescript
if (!requester_profile_id || typeof requester_profile_id !== 'string') {
  return buildError(
    'REQUESTER_IDENTITY_REQUIRED',
    'requester_profile_id is mandatory for incident creation',
    { ...meta_base, mode: raw_mode, duration_ms: 0 }
  );
}
```

**Escenario:** STRONG_MATCH_ACTIVE implica que `conv_sessions.profile_id` existe. Si por cualquier razón fuera null (dato inconsistente), la EF devuelve `REQUESTER_IDENTITY_REQUIRED` y el caso queda en `waiting_internal` (mismo comportamiento que cuando Core no responde, sin escalado inmediato pero notificando al admin).

**Nunca llega UnverifiedLeadActor a createIncident:** `unverified_lead` está prohibido para incidencias (`incidents-integration-contract.md` §2). Solo `tenant_profile` (STRONG_MATCH) o `system_service` llegan a esta operación.

### Ubicación del campo en el DTO

El `requester_profile_id` se propone como campo de nivel raíz en `CreateIncidentCommand` (no dentro de `incident.*`), por analogía con `client_account_id`:

```typescript
export interface CreateIncidentCommand {
  contract_version: '1.0';
  client_account_id: string;
  requester_profile_id: string;   // ← AÑADIR (cambio previsto al puerto)
  request_id: string;
  correlation_id: string;
  idempotency_key: string;
  source: 'smart_conversations';
  actor: CanonicalActor;
  incident: {
    accommodation_id: string;
    room_id: string | null;
    category: string;
    title: string;                // ← AÑADIR (cambio previsto al puerto)
    description: string;
    urgency_proposal: string | null;
    attachments: string[];
  };
}
```

---

## 10. Mapeo `urgency_proposal → priority`

> **⚠️ PROPUESTA DE SmartConversations — `PROPOSAL_REQUIRES_SMART_INCIDENTS_APPROVAL`**
>
> Esta tabla **no puede implementarse** hasta recibir aprobación formal del equipo de Smart Incidents y la creación de `docs/smart-incidents/contracts/contract-create-incident-request.md` o documento equivalente.

### Propuesta de mapeo

| Valor `urgency_proposal` (SC) | Valor `priority` propuesto (SI) | Justificación | Fallback |
|-------------------------------|--------------------------------|---------------|---------|
| `null` | `'normal'` | Ausencia de urgencia → baja prioridad | — |
| `''` (string vacío) | `'normal'` | Equivalente a null | — |
| `'low'` | `'normal'` | Baja urgencia → prioridad normal | — |
| `'medium'` | `'normal'` | Urgencia media → prioridad normal | — |
| `'high'` | `'urgent'` | Alta urgencia → prioridad urgente | — |
| `'critical'` | `'urgent'` | Urgencia crítica → prioridad urgente | — |
| `<desconocido>` | `'normal'` | Safe fallback — nunca rechazar silenciosamente | `'normal'` |

### Comportamiento ante valor desconocido

El adapter mapea cualquier valor no reconocido a `'normal'`. No lanza error (la urgencia es una sugerencia de SC, SI decide la prioridad final). El valor desconocido se loguea como warning con `correlation_id` para trazabilidad.

### Qué NO se declara aprobado

- La tabla anterior **no es** un contrato aprobado.
- El equipo SC no puede aprobar valores del dominio de Smart Incidents.
- Hasta aprobación SI: esta lógica **no debe implementarse** en código de producción.

---

## 11. Transformación del actor

### Escenario STRONG_MATCH_ACTIVE (inquilino verificado)

Para incidentes creados por un residente identificado, el actor en el comando SC es `system_service` (SC como sistema ejecutor), mientras que el residente queda identificado por `requester_profile_id`.

```typescript
// Actor SC en CreateIncidentCommand
actor: {
  type: 'system_service',
  service_name: 'conv-wf20',   // o 'conv-core-create-incident'
}
```

SI interpreta este actor como `system` en su modelo interno. La traducción la hace el adapter.

**Rationale:** SC actúa como proxy del sistema — no como el usuario. El usuario queda identificado por `requester_profile_id`. Esta separación cumple con `rules-30` (SC entrega `requester_profile_id` resuelto; el actor de la llamada es el sistema SC).

### Transformación en el adapter (prevista, no implementada)

```typescript
// Dentro del adapter: transformar SystemServiceActor al formato que SI espera
function mapActorToSI(actor: CanonicalActor): unknown {
  if (actor.type === 'system_service') {
    return { type: 'system', service: actor.service_name };
    // o el formato exacto que SI especifique en su contrato
  }
  // TenantProfileActor no debe llegar aquí (SC envía system_service para conv sources)
  throw new Error('UNEXPECTED_ACTOR_TYPE_FOR_SI');
}
```

**Nota:** El formato exacto del actor en el payload de SI debe confirmarse con el equipo SI. Puede ser que SI no requiera campo `actor` en el request — esta información no está en los docs SI disponibles actualmente.

### Migración adapter 11C1 → 11C5

| Campo 11C1 | Campo 11C5 | Cambio |
|-----------|-----------|--------|
| `type: 'agent' \| 'system'` | `type: 'system_service'` | Rename; `'agent'` → `'system_service'` si aplica |
| `profile_id: string` (siempre) | `profile_id` solo en TenantProfileActor | Mover a rama condicional |
| `identity_verified: boolean` | `verified: boolean` (en TenantProfileActor) | Rename directo |
| `incident_data: {...}` | `incident: {...}` | Rename del campo raíz |
| `urgency: 'low\|medium\|high\|critical'` | `urgency_proposal: string \| null` | Cambio de tipo; expandir a string libre |

---

## 12. Manejo de errores HTTP

| Código HTTP SI | Semántica | Acción EF SC | Error code SC |
|---------------|-----------|-------------|---------------|
| 200/201 | Incidente creado | `ok: true`, guardar `incident_id` opaco | — |
| 409 | Replay idempotente | `ok: true`, `idempotent_replay: true` | — |
| 400 | Comando inválido (schema, campos faltantes) | `ok: false`, no reintentar, log warning | `VALIDATION_ERROR` |
| 401 | Token inválido o ausente | `ok: false`, no reintentar, log error | `CONFIGURATION_ERROR` |
| 403 | Acceso denegado (tenant, permisos) | `ok: false`, no reintentar | `AUTHORIZATION_ERROR` |
| 404 | Endpoint no encontrado | `ok: false`, no reintentar | `CONFIGURATION_ERROR` |
| 422 | Entidad no procesable (validación SI) | `ok: false`, no reintentar, log para diagnóstico | `CONTRACT_MISMATCH` |
| 429 | Rate limiting | Esperar `Retry-After`, reintentar (máx 2 adicionales) | `RATE_LIMITED` |
| 5xx | Error servidor SI | Reintentar (máx 2, backoff 1s/5s), circuit breaker | `DEPENDENCY_UNAVAILABLE` |
| Timeout | Network/timeout | Reintentar (máx 2), circuit breaker | `TIMEOUT` |

**400 con mensaje de campo faltante:** Si SI rechaza con 400 indicando `title` o `requester_profile_id` faltante, el error se loguea explícitamente como `MISSING_REQUIRED_FIELD` con el nombre del campo (sin PII), para diagnóstico de integración.

---

## 13. Timeout y retry policy propuestos

```typescript
// Propuesta para incidents-integration-port (INTEGRATION_POLICIES)
{
  timeout_ms:          10_000,   // 10s — incidentes no son latency-sensitive como búsquedas
  max_retries:         2,        // 2 reintentos adicionales tras primer fallo
  backoff_ms:          [1_000, 5_000],  // 1s, 5s
  circuit_breaker: {
    failure_threshold: 5,        // 5 fallos consecutivos abren el circuit
    reset_timeout_ms:  60_000,   // 60s antes de intentar half-open
  },
  retry_on:            ['DEPENDENCY_UNAVAILABLE', 'TIMEOUT', 'RATE_LIMITED'],
  no_retry_on:         ['VALIDATION_ERROR', 'CONFIGURATION_ERROR', 'CONTRACT_MISMATCH', 'AUTHORIZATION_ERROR'],
}
```

**Diferencia con Ruta A (Core interno):** `core-incident-client` usa backoff 1s/5s/30s con 3 intentos. Para el add-on externo SI, se propone backoff más corto porque el add-on es un servicio externo con SLA propio.

---

## 14. Idempotencia

**Scope:** `client_account_id:idempotency_key` (confirmado en `incidents-integration-port.ts` §4 y `contract-incident-entity.md`).

**Generación de idempotency_key:** SC genera la clave como derivada del caso conversacional:

```typescript
// Propuesta: derivar de conv_case_id + incident_type (determinista)
idempotency_key = `${conv_case_id}:createIncident:${incident_type}`;
// Alternativamente: UUID generado una vez y guardado en conv_cases
```

**Ventaja de key determinista:** Si WF-20 reintenta (por fallo de red antes de recibir respuesta), el segundo intento con la misma key producirá idempotent_replay=true en SI — sin crear duplicado.

**Respuesta 409 → ok: true, idempotent_replay: true:** SC trata el 409 como éxito — extrae `incident_id` del body del 409 y lo guarda como referencia opaca.

---

## 15. Observabilidad y correlation IDs

| Campo | Valor | Propósito |
|-------|-------|-----------|
| `request_id` | UUID v4 generado por SC en cada llamada | Identifica esta invocación específica del puerto |
| `correlation_id` | `conv_case_id` (ID del caso conversacional) | Correlaciona logs entre SC y SI end-to-end |
| `idempotency_key` | Derivado de `conv_case_id:incident_type` | Garantía de idempotencia cross-sistema |

**Headers HTTP hacia SI:**
```
Authorization: Bearer ${INCIDENTS_ADDON_SERVICE_TOKEN}
Content-Type: application/json
Idempotency-Key: ${idempotency_key}
X-Correlation-Id: ${conv_case_id}
X-Request-Id: ${request_id}
X-Source: smart_conversations
```

**Logging SC:**
- Log `info` al crear con `{ conv_case_id, incident_id: <opaco>, correlation_id }`
- Log `warn` en error con `{ error_code, correlation_id, duration_ms }`
- Nunca loguear: `profile_id`, `requester_profile_id`, `description`, `title`, `room_id`

---

## 16. Cambios de código previstos (sin implementar)

Los siguientes cambios son necesarios para que la integración real funcione. **No se implementan en Fase 11C5E.**

| # | Archivo | Tipo de cambio | Descripción |
|---|---------|----------------|-------------|
| CC-01 | `supabase/functions/_shared/smart-conversations/incidents-integration-port.ts` | Extensión | Añadir `requester_profile_id: string` y `incident.title: string` a `CreateIncidentCommand` |
| CC-02 | `supabase/functions/_shared/smart-conversations/adapters/incidents-addon-adapter.ts` | Migración 11C1→11C5 | Adoptar nuevo CreateIncidentCommand; renombrar `incident_data→incident`, `identity_verified→verified`; añadir transformación actor |
| CC-03 | `supabase/functions/conv-core-create-incident/index.ts` | Nueva ruta B | Añadir path condicional que llama a `IncidentIntegrationPort` cuando `INCIDENTS_ADDON_INTEGRATION_MODE != 'mock'`; incluir generación de `title`; incluir `requester_profile_id` en command |
| CC-04 | `supabase/functions/conv-wf20-incidents/index.ts` | Propagación | Pasar `profile_id` (de `session`) a `conv-core-create-incident` como `requester_profile_id` |
| CC-05 | `docs/smart-conversations/integrations/incidents-addon-openapi-consumer.yaml` | Actualización | Añadir `title` y `requester_profile_id` al schema; actualizar `urgency_proposal` enum; mantener estado "Consumer Proposal" |
| CC-06 | `docs/smart-conversations/integrations/integration-contract-catalog.md` | Actualización | Reemplazar definición 11C1 con definición 11C5 canónica |
| CC-07 | `supabase/functions/_shared/smart-conversations/runtime/core-incident-client.ts` | Sin cambio | No requiere modificación — esta es la Ruta A (Core interno), independiente de SI |

---

## 17. Tests previstos (sin implementar)

| ID | Suite propuesta | Tipo | Qué verifica |
|----|----------------|------|-------------|
| `N11C5E-FIELD-01..16` | Nueva suite `addons-integration-remediation.spec.ts` | Análisis estático | Campo a campo: origen, transformación, validación |
| `N11C5E-TITLE-01` | Suite title | Lógica | `generateTitle('fuga_agua', 'texto')` → presente y ≤ 255 chars |
| `N11C5E-TITLE-02` | Suite title | Lógica | Fallback: sin description → título de solo tipo |
| `N11C5E-TITLE-03` | Suite title | Lógica | Fallback total → 'Incidencia registrada' |
| `N11C5E-TITLE-04` | Suite title | Lógica | Texto largo truncado en límite de palabra, no en mitad de palabra |
| `N11C5E-TITLE-05` | Suite title | Seguridad | `normalizeText` elimina HTML, control chars, URLs |
| `N11C5E-REQ-01` | Suite requester | Comportamiento | STRONG_MATCH con profile_id → requester_profile_id presente en command |
| `N11C5E-REQ-02` | Suite requester | Comportamiento | profile_id null → fail-closed `REQUESTER_IDENTITY_REQUIRED` (nunca crea incidencia anónima) |
| `N11C5E-REQ-03` | Suite requester | Análisis estático | Puerto incluye `requester_profile_id` en CreateIncidentCommand |
| `N11C5E-URG-01` | Suite urgency | Mapeo | `'high' → 'urgent'` |
| `N11C5E-URG-02` | Suite urgency | Mapeo | `null → 'normal'` |
| `N11C5E-URG-03` | Suite urgency | Mapeo | `'critical' → 'urgent'` |
| `N11C5E-URG-04` | Suite urgency | Mapeo | Valor desconocido → `'normal'` (safe fallback) |
| `N11C5E-ACTOR-01` | Suite actor | Transformación | `system_service` → formato correcto para SI |
| `N11C5E-ACTOR-02` | Suite actor | Restricción | `unverified_lead` no puede crear incidencias |
| `N11C5E-IDEM-01` | Suite idempotencia | Comportamiento | 409 → `ok: true, idempotent_replay: true` |
| `N11C5E-ERR-01` | Suite errores | Comportamiento | 400 → `ok: false`, no reintentar |
| `N11C5E-ERR-02` | Suite errores | Comportamiento | 5xx → reintentar máx 2 veces |
| `N11C5E-ERR-03` | Suite errores | Seguridad | Error 400 con campo faltante no expone PII en log |

**Nota:** Todos estos tests son `it.todo()` hasta que CC-01..CC-05 se implementen.

---

## 18. Criterios exactos para cerrar GATE_1

GATE_1 cierra solo cuando **todos** los siguientes criterios sean verificables de forma independiente:

| Criterio | Artefacto verificable | Propietario |
|----------|-----------------------|------------|
| G1-C01 | `title` incluido en `CreateIncidentCommand` (CC-01 implementado) | SC |
| G1-C02 | `requester_profile_id` incluido en `CreateIncidentCommand` (CC-01 implementado) | SC |
| G1-C03 | `contract-create-incident-request.md` existe y aprueba tabla de mapeo urgency → priority | **SI** |
| G1-C04 | Adapter 11C1 migrado a modelo 11C5 (CC-02 implementado) | SC |
| G1-C05 | `conv-core-create-incident` conectado a `IncidentIntegrationPort` (CC-03 implementado) | SC |
| G1-C06 | `requester_profile_id` propagado desde WF-20 (CC-04 implementado) | SC |
| G1-C07 | OAS consumer actualizado con nuevos campos (CC-05) y revisado por SI | SC + SI |
| G1-C08 | `integration-contract-catalog.md` actualizado (CC-06 implementado) | SC |
| G1-C09 | Todos los tests `N11C5E-*` pasan (no `it.todo()`) | SC |
| G1-C10 | `smoke-dev-incidents-addon.mjs` produce exit 0 con endpoints DEV reales | SC + SI |
| G1-C11 | Canary DEV activo para tenant DEV-A sin errores durante 24h | SC + SI |
| G1-C12 | Auditoría externa de seguridad completa (no definida aún — ver §20) | Externo |

**GATE_1 no cierra parcialmente.** Todos los criterios son necesarios.

---

## 19. Dependencias para activar canary DEV

Las siguientes condiciones deben cumplirse **antes** de activar modo canary:

| Dependencia | Owner | Estado actual |
|-------------|-------|---------------|
| G1-C01..C08 (criterios de código) cumplidos | SC | Pendientes de implementación |
| SI provisiona `INCIDENTS_ADDON_BASE_URL` DEV | **SI** | No disponible |
| SI provisiona `INCIDENTS_ADDON_SERVICE_TOKEN` DEV | **SI** | No disponible |
| SI aprueba `contract-create-incident-request.md` (G1-C03) | **SI** | No existe |
| OAS consumer revisado por SI (G1-C07) | SC + SI | Pendiente de envío a SI |
| Tenant DEV-A UUID acordado para canary allowlist | SC + SI | Pendiente |

---

## 20. Riesgos y decisiones pendientes

| ID | Riesgo / Decisión | Severidad | Propietario | Estado |
|----|-------------------|-----------|------------|--------|
| R-01 | `accommodation_id` puede no estar en `identity_data` — estructura de columna no verificada en esta microfase | ALTA | SC | Pendiente verificación |
| R-02 | El formato exacto del actor en el payload SI no está documentado en los docs disponibles | ALTA | SI | Pendiente contrato SI |
| R-03 | La tabla urgency→priority puede tener casos límite no anticipados (ej: 'medium_high') | MEDIA | SC + SI | Pendiente aprobación SI |
| R-04 | El `incident_type` de SC (texto libre extraído) puede no mapear 1:1 con las categorías de SI | MEDIA | SC + SI | Pendiente validación |
| R-05 | La EF `conv-core-create-incident` puede necesitar dividirse en dos EFs (Ruta A y Ruta B) o recibir un flag de modo | MEDIA | SC | Decisión de diseño pendiente |
| R-06 | Actualización del catálogo 11C1 puede romper tests existentes que verifican el schema 11C1 | BAJA | SC | A verificar en implementación |
| R-07 | Timeout de 10s para SI puede ser insuficiente si SI tiene latencias variables | BAJA | SC + SI | Pendiente SLA SI |
| R-08 | Si SC tiene canary activo y SI no está disponible, el modo fallback a mock debe ser transparente para el residente | MEDIA | SC | Cubierto por circuit breaker |

---

## 21. Scoring reproducible de integración

### Dimensiones y pesos

| Dimensión | Peso | Qué mide |
|-----------|------|----------|
| Auth & Security | 20% | B2B token, no service_role, no PII, isolation |
| Contract completeness | 30% | Todos los campos requeridos definidos y mapeados |
| Integration modes | 15% | 5 modos, fail-closed, circuit breaker |
| Idempotency & errors | 15% | Scope definido, manejo 4xx/5xx |
| Test coverage | 10% | Tests activos relevantes a la integración |
| Observability | 10% | correlation_id, request_id, logging seguro |

### Puntuación por dimensión (estado actual — pre-remediación)

| Dimensión | Peso | Puntuación | Evidencia |
|-----------|------|-----------|---------|
| Auth & Security | 20% | 5.0 | B2B token ✅, no service_role sharing ✅, no PII en actor ✅, isolation ✅ |
| Contract completeness | 30% | 2.0 | Sin `title` ✗, sin `requester_profile_id` ✗, sin mapeo aprobado ✗, resto OK |
| Integration modes | 15% | 4.5 | 5 modos ✅, fail-closed ✅, circuit breaker ✅, Ruta B no cableada ✗ |
| Idempotency & errors | 15% | 4.0 | Scope definido ✅, 4xx/5xx en adapter ✅, 409 como replay ✅, timeout no definido ✗ |
| Test coverage | 10% | 3.0 | 80 tests INC suite ✅, 0 tests sobre campos faltantes ✗, todos los N11C5E son todo ✗ |
| Observability | 10% | 3.5 | correlation_id ✅, request_id ✅, logging seguro ✅, sin trazabilidad cross-sistema ✗ |

### Fórmula

```
score = Σ (peso_i × puntuacion_i)
      = (0.20 × 5.0) + (0.30 × 2.0) + (0.15 × 4.5) + (0.15 × 4.0) + (0.10 × 3.0) + (0.10 × 3.5)
      = 1.00 + 0.60 + 0.675 + 0.60 + 0.30 + 0.35
      = 3.525
      ≈ 3.5 / 5
```

### Score proyectado post-remediación (si G1-C01..C11 se cumplen)

| Dimensión | Puntuación proyectada | Cambio |
|-----------|----------------------|--------|
| Auth & Security | 5.0 | = |
| Contract completeness | 4.5 | ↑ +2.5 (campos añadidos, mapeo aprobado) |
| Integration modes | 5.0 | ↑ +0.5 (Ruta B cableada, canary activo) |
| Idempotency & errors | 4.5 | ↑ +0.5 (timeout definido, key strategy) |
| Test coverage | 4.5 | ↑ +1.5 (N11C5E tests pasan) |
| Observability | 4.5 | ↑ +1.0 (cross-system correlation) |

**Score proyectado = (0.20×5.0)+(0.30×4.5)+(0.15×5.0)+(0.15×4.5)+(0.10×4.5)+(0.10×4.5) = 1.0+1.35+0.75+0.675+0.45+0.45 = 4.675 ≈ 4.7 / 5**

---

## 22. Estado del `conv-core-create-incident` (§4.6 completo)

| Atributo | Estado | Evidencia |
|----------|--------|-----------|
| Existe | ✅ Sí | `supabase/functions/conv-core-create-incident/index.ts` |
| Estado de implementación | IMPLEMENTADO EN MODO MOCK | `defaultCoreIncidentClient = mockCoreIncidentClient` (hardcoded) |
| Target actual | Core SC interno (no el add-on SI) | `core-incident-client.ts` líneas 61–86: llama `core.incidents.create` via `coreHttpCall` |
| Ruta real configurada | NO ACTIVA — modo real apagado | `defaultCoreIncidentClient` siempre retorna mock |
| Contrato de entrada | `{ client_account_id, session_id, conv_case_id, incident_type, urgency, description, source }` | index.ts líneas 54–89 |
| `profile_id` en entrada | NO — lo lee internamente de `conv_sessions` | index.ts líneas 91–107 |
| `requester_profile_id` | AUSENTE del payload | Gap documentado en B-03 |
| `title` | AUSENTE del payload | Gap documentado en B-01 |
| Modelo de actor | No construye actor CanonicalActor — pasa a Core mock directamente | Líneas 130–136 |
| Gestión de identidad | Lee `profile_id` de `conv_sessions`; no acepta desde payload externo | index.ts líneas 95–113 |
| Backoff / retry | 3 intentos, backoff 1s/5s/30s | `CORE_BACKOFF_SECONDS = [1, 5, 30]`, `MAX_CORE_ATTEMPTS = 3` |
| Timeout | No configurado explícitamente (usa timeout de fetch por defecto) | `core-http-client.ts` no expone el timeout en este path |
| Errores | 4xx → no retry; 5xx/timeout → retry; 503 tras agotamiento | index.ts líneas 143–163 |
| Tests existentes | 80 tests activos en `incidents.spec.ts` | INC-AUTH (7), INC-EXTRACT (5), INC-STRONG (10), INC-PARTIAL (6), INC-INACTIVE (4), INC-NOMATCH (5), INC-ERR (11), INC-ACT (7), INC-PRIV (9), INC-RES (7), INC-REG (9) |
| Dependencia catálogo 11C1 | NO — no usa `incidents-addon-adapter.ts` | Usa `core-incident-client.ts` (diferente) |
| Conectado a `IncidentIntegrationPort` | NO | No importa el puerto 11C5 |
| Cambios previstos | CC-03 (añadir Ruta B hacia SI), CC-04 (recibir `requester_profile_id`) | §16 de este plan |

---

## 23. Estado del OpenAPI consumer (§4.7)

El documento `docs/smart-conversations/integrations/incidents-addon-openapi-consumer.yaml` es y continúa siendo una **propuesta consumer-driven** — no aprobada por Smart Incidents.

### Cambios previstos al OAS consumer (CC-05, sin implementar aún)

| Campo / Sección | Cambio previsto | Razón |
|----------------|----------------|-------|
| `CreateIncidentRequest.incident.title` | **Añadir** como `required`, type string, maxLength 255 | Obligatorio en SI entity |
| `CreateIncidentRequest.requester_profile_id` | **Añadir** como campo raíz `required`, type string | Obligatorio en SI entity; identifica al residente |
| `CreateIncidentRequest.incident.urgency_proposal` enum | **Ajustar** a valores acordados con SI tras aprobación mapeo | Pendiente G1-C03 |
| `CreateIncidentRequest.actor` | **Revisar** con SI si `system_service` es el tipo correcto o si SI requiere otro formato | R-02 |
| `HealthResponse` | Sin cambio | OK |
| Info / description | **Añadir** referencia al `contract-create-incident-request.md` cuando exista | Trazabilidad |
| Info status | Mantener `DEV_CONFIGURATION_PENDING` | No aprobado |

### Proceso de aprobación del OAS consumer

1. SC actualiza OAS consumer con los campos faltantes (CC-05)
2. SC envía el OAS consumer al equipo de Smart Incidents como propuesta formal
3. SI revisa y aprueba, o propone cambios
4. SI crea `contract-create-incident-request.md` (o equivalente) con el mapeo aprobado
5. SI confirma el formato exacto del actor en su endpoint
6. Una vez aprobado por SI: el OAS consumer puede actualizarse a estado `DEV_READY`

### Fuente canónica final

La fuente canónica final para el contrato de integración SC → SI será:
- Por lado SI: `docs/smart-incidents/contracts/contract-create-incident-request.md` (a crear)
- Por lado SC: `incidents-addon-openapi-consumer.yaml` (actualizado y aprobado por SI)
- Puerto SC: `incidents-integration-port.ts` (actualizado con CC-01)

---

## 24. Restricciones de seguridad activas (Fase 11C5E)

- No se modificó código de producción
- No se modificaron contratos canónicos de Smart Incidents
- No se modificaron rules de Smart Incidents ni de Smart Conversations
- No se desplegó nada (DEV / PRE / PRO)
- No se aprobaron unilateralmente contratos de Smart Incidents
- No se presentó el OpenAPI consumer como aprobado por SI
- El mapeo urgency → priority está marcado explícitamente como `PROPOSAL_REQUIRES_SMART_INCIDENTS_APPROVAL`
- GATE_1 = `AUDIT_COMPLETE_REMEDIATION_PENDING` — no se cerró
- No se comenzó Fase 11C6
- No se implementó Wasender
- No se implementó Realtime
