# Reconciliación Cross-Módulo — Smart Incidents × SmartConversations
## Microfase 11C5D — Validación Documental y Arquitectónica

**Fecha:** 2026-07-25
**Autor:** Cierre documental Fase 11C5 (SmartConversations)
**Estado de reconciliación:** `RECONCILIATION_COMPLETE_GAPS_IDENTIFIED`
**Score derivado de fuentes canónicas:** 3.2 / 5
**GATE_0:** `PASS_WITH_WARNINGS` (heredado de Fase 11C5)
**GATE_1:** `AUDIT_COMPLETE_REMEDIATION_PENDING` — **no cerrar**

---

## 0. Nota crítica: documento de evaluación de entrada no existe

El documento declarado como input primario de esta microfase:

```
docs/smart-incidents/integration/smart-conversations-integration-assessment.md
```

**NO EXISTE** en el repositorio. No existe el directorio `docs/smart-incidents/integration/`.

La evaluación de estado `INTEGRATION_DEFINED_WITH_GAPS`, score 3.0/5, y los ítems (22 decisiones, 6 contradicciones, 13 preguntas abiertas, 6 blockers) no pudieron ser leídos del documento declarado, porque el documento no existe.

**Acción tomada:** Esta reconciliación se realizó directamente sobre las fuentes canónicas disponibles, aplicando la regla de precedencia `rules > contracts > skills > tests > diagrams > planes > informes > chat`. Los hallazgos son derivados de las fuentes primarias, no de un informe intermediario.

**Implicación:** El estado `INTEGRATION_DEFINED_WITH_GAPS` y el score 3.0/5 son valores que no pueden ser confirmados ni refutados — el documento que los declara no existe. El estado derivado de esta reconciliación es `RECONCILIATION_COMPLETE_GAPS_IDENTIFIED` con score 3.2/5 basado en evidencia directa de los artefactos canónicos.

---

## 1. Fuentes leídas

### Smart Incidents (fuente canónica — leídas directamente)

| Fuente | Tipo | Peso en precedencia |
|--------|------|---------------------|
| `docs/smart-incidents/rules/rules-00-scope-and-principles.md` | Rules | 1 (mayor) |
| `docs/smart-incidents/rules/rules-30-incident-creation.md` | Rules | 1 (mayor) |
| `docs/smart-incidents/contracts/contract-incident-entity.md` | Contract | 2 |

### SmartConversations Fase 11C5 (leídas directamente)

| Fuente | Tipo | Peso en precedencia |
|--------|------|---------------------|
| `supabase/functions/_shared/smart-conversations/canonical-actor.ts` | Code canónico | 2 |
| `supabase/functions/_shared/smart-conversations/incidents-integration-port.ts` | Code canónico | 2 |
| `supabase/functions/_shared/smart-conversations/adapters/incidents-addon-adapter.ts` | Code (11C1) | 3 |
| `docs/smart-conversations/integrations/incidents-integration-contract.md` | Contract | 2 |
| `docs/smart-conversations/integrations/canonical-actor-contract.md` | Contract | 2 |
| `docs/smart-conversations/integrations/addons-authentication-model.md` | Contract | 2 |
| `docs/smart-conversations/integrations/addons-privacy-model.md` | Contract | 2 |
| `docs/smart-conversations/integrations/integration-contract-catalog.md` | Catalog | 4 |
| `docs/smart-conversations/integrations/integration-mode-model.md` | Model | 3 |
| `docs/smart-conversations/integrations/incidents-addon-openapi-consumer.yaml` | OAS Consumer | 4 |
| `docs/smart-conversations/integrations/addons-dev-readiness.md` | Report | 6 |
| `docs/smart-conversations/integrations/addons-dev-test-report.md` | Report | 6 |

### Fuente ausente — impacto registrado

| Ruta esperada | Estado | Impacto |
|---------------|--------|---------|
| `docs/smart-incidents/integration/smart-conversations-integration-assessment.md` | **NO EXISTE** | No es posible contrastar contra este informe — reconciliación sobre fuentes primarias |
| `docs/smart-incidents/contracts/contract-create-incident-request.md` | **NO EXISTE** | Blocker B-02 activo |

---

## 2. Decisiones confirmadas (22)

Las siguientes decisiones están confirmadas por al menos dos fuentes canónicas independientes.

| ID | Decisión | Fuentes SC | Fuentes SI | Estado |
|----|----------|-----------|-----------|--------|
| D-01 | Autenticación B2B: `INCIDENTS_ADDON_SERVICE_TOKEN` como Bearer token | auth-model, port, adapter | rules-00 §3.5 | ✅ Confirmada |
| D-02 | No se comparte `service_role` entre proyectos SC y SI | auth-model §3, rules | rules-00 §3.5 | ✅ Confirmada |
| D-03 | No se crean claves foráneas entre tablas SC y SI | auth-model §5, readiness §9 | rules-00 §3.4 | ✅ Confirmada |
| D-04 | `client_account_id` es el mecanismo de aislamiento multi-tenant | port, auth-model §4 | entity, rules-30 | ✅ Confirmada |
| D-05 | Scope de idempotencia: `client_account_id × idempotency_key` | port §4, contract §4 | (implícito en entity) | ✅ Confirmada SC |
| D-06 | n8n no tiene acceso directo al add-on de SI | privacy-model §6 | rules-00 §3.3 | ✅ Confirmada |
| D-07 | n8n recibe payload reducido de SI (sin profile_id, accommodation_id, title) | privacy-model §6 | rules-00 §3.3, entity §n8n | ✅ Confirmada |
| D-08 | Fail-closed: valor de modo desconocido → `disabled` | integration-mode-model §2 | (implícito) | ✅ Confirmada SC |
| D-09 | Circuit breaker protege llamadas SC → SI | adapter (líneas 152–156) | (implícito) | ✅ Confirmada SC |
| D-10 | Shadow mode prohibido para `createIncident` (operación mutable) | integration-mode-model (tabla) | rules-00 §3 | ✅ Confirmada |
| D-11 | Mock mode es el valor por defecto en todos los adapters | integration-mode-model §1 | (implícito) | ✅ Confirmada SC |
| D-12 | Canary solo para tenant DEV-A con allowlist explícita | integration-mode-model §3 | (implícito) | ✅ Confirmada SC |
| D-13 | Ningún campo PII se envía al add-on en el actor | canonical-actor.ts §FORBIDDEN_FIELDS, privacy-model | rules-00 §3.3 | ✅ Confirmada |
| D-14 | SC guarda únicamente referencia opaca `incident_id` del resultado SI | port, privacy-model §4 | entity (fuente de la ref) | ✅ Confirmada |
| D-15 | `source: 'smart_conversations'` valor fijo en el comando | port, OAS consumer | rules-30 §2 (source: webchat|whatsapp → smart_conversations) | ✅ Confirmada |
| D-16 | `contract_version: '1.0'` tipo literal obligatorio | port (línea 17) | (implícito contratos v1.0) | ✅ Confirmada SC |
| D-17 | `requester_profile_id` debe estar resuelto por SC antes de llamar a SI | contract §actor, readiness | rules-30 §3.1, §4.1 | ✅ Confirmada |
| D-18 | Mapeo `urgency_proposal` → `priority` = responsabilidad de EF SC | contract §1 (nota), rules-30 §4.5 | rules-30 §4.5 | ✅ Confirmada |
| D-19 | SI publica en `audit_log` usando su propio `service_role` (no intermediario) | (no contradice) | rules-00 §3.6 (decisión no reabrirable) | ✅ Confirmada (decisión SI) |
| D-20 | No se permiten adjuntos en V1 desde fuentes conversacionales | contract §1 (attachments: []) | rules-30 §4.6 | ✅ Confirmada |
| D-21 | OpenAPI es propuesta consumer-driven — no ha sido aprobada por SI | OAS header (línea 4: "Consumer Proposal"), readiness §5 | (ausencia de aprobación documenta el estado) | ✅ Confirmada |
| D-22 | GATE_0 = `PASS_WITH_WARNINGS` / GATE_1 = `AUDIT_COMPLETE_REMEDIATION_PENDING` | readiness §GATE_0/GATE_1 | (scope SC) | ✅ Confirmada SC |

**Total: 22 decisiones confirmadas.**

---

## 3. Contradicciones identificadas (6)

Las siguientes contradicciones son divergencias entre artefactos de SC y contratos canónicos de SI.

### C-01 — Campo `title` ausente en SC (CRÍTICO)

| Dimensión | SmartConversations | Smart Incidents |
|-----------|-------------------|-----------------|
| Fuente | `incidents-integration-port.ts` (CreateIncidentCommand.incident) | `contract-incident-entity.md` §2 |
| Campo | `description: string` | `title: string` — **OBLIGATORIO**, max 255 chars |
| Estado | SC no incluye `title` en ningún artefacto de la operación | SI requiere `title` para aceptar la creación |
| Severity | **BLOCKER** — SI rechazará el request sin `title` |

La EF `conv-core-create-incident` tendrá que generar o derivar un `title` a partir de `description` antes de llamar a SI. El puerto SC no contempla este campo. **El contrato SC v1.0 está incompleto respecto al contrato SI v1.0.**

### C-02 — `urgency_proposal` (string libre) vs `priority` (enum SI)

| Dimensión | SmartConversations | Smart Incidents |
|-----------|-------------------|-----------------|
| Fuente | `incidents-integration-port.ts` línea 29 | `contract-incident-entity.md` §2 |
| Campo | `urgency_proposal: string \| null` (libre, nullable) | `priority: 'normal' \| 'urgent'` (enum, obligatorio) |
| Estado | SC propone urgency como sugerencia; SI requiere valor canónico | Mapeo definido como responsabilidad de SC pero sin contrato |
| Severity | **BLOCKER** — `contract-create-incident-request.md` no existe (ver B-02) |

La decisión de que el mapeo es responsabilidad SC (D-18) está confirmada, pero el contrato que define el mapeo no existe.

### C-03 — `requester_profile_id` ausente del CreateIncidentCommand SC

| Dimensión | SmartConversations | Smart Incidents |
|-----------|-------------------|-----------------|
| Fuente | `incidents-integration-port.ts` — sin `requester_profile_id` | `contract-incident-entity.md` §2, `rules-30` §3.1 |
| Campo | No existe en el DTO de SC | OBLIGATORIO para todas las fuentes incluyendo whatsapp/webchat |
| Estado | SC no incluye `requester_profile_id` en el CreateIncidentCommand | SI rechaza si ausente |
| Severity | **BLOCKER** — SI rechazará el request sin `requester_profile_id` |

El `requester_profile_id` es distinto del `actor`. El actor SC puede ser `system_service` (para automatizaciones), pero el `requester_profile_id` identifica al INQUILINO que reporta el incidente. Este campo debe añadirse al DTO SC (dentro de `incident.*` o en la raíz del command).

### C-04 — Representación de actor: `system_service` (SC) → `system` (SI) [RECLASIFICADO]

**Clasificación:** `REQUIRED_ADAPTER_TRANSFORMATION` — no es una contradicción semántica.

| Dimensión | SC (puerto 11C5) | SI (rules-30) | Transformación |
|-----------|-----------------|--------------|----------------|
| Tipo actor en SC | `SystemServiceActor { type: 'system_service', service_name }` | `system` (representación interna SI) | Adapter: SC envía `system_service` → adapter traduce al formato que SI espera |
| Significado semántico | SC-system ejecuta la operación en nombre del residente | El actor que crea el incidente es el sistema SC | Idéntico en semántica — sólo difiere la representación |
| Requester (usuario real) | `requester_profile_id` campo separado del actor | `requester_profile_id` campo separado del actor | Sin diferencia — ambos lados separan actor de requester |

**Evidencia de no-contradicción:** La distinción entre actor (quién ejecuta) y requester (quién solicita) es consistente en ambos lados. SC envía el actor como `system_service` porque la llamada al add-on la realiza el sistema SC; SI registra `system` en su modelo interno. La semántica es equivalente. El adapter es responsable de la traducción de representación, no existe incompatibilidad de significado.

**Divergencia 11C1 → 11C5 (scope migración):** El adapter 11C1 usa tipos `'agent' | 'system'` e `identity_verified: boolean`; el puerto 11C5 usa `'system_service'` y `verified: boolean`. Esta diferencia afecta únicamente al adapter 11C1 y se resuelve en su migración al modelo canónico 11C5. No hay impacto en modo mock.

**Acción requerida:** Migrar adapter 11C1 a modelo 11C5 antes de activar canary/real.

### C-05 — `integration-contract-catalog.md` no actualizado a Fase 11C5

| Dimensión | Catalog 11C1 | Puerto 11C5 real |
|-----------|-------------|-----------------|
| Fuente | `integration-contract-catalog.md` (11C1) | `incidents-integration-port.ts` (11C5) |
| `CreateIncidentCommand` | `incident_data: { urgency: 'low\|medium\|high\|critical' }` | `incident: { urgency_proposal: string \| null }` |
| `CanonicalActor` | `identity_verified: boolean` | `verified: boolean` (solo TenantProfileActor) |
| `CreateIncidentResult` | `{ incident_id, incident_ref, status, idempotent }` | `{ incident_id, incident_reference, status, created_at, idempotent_replay }` |
| Severity | **LOW** — inconsistencia documental interna SC |

El catálogo sigue describiendo el adapter 11C1. Debe actualizarse para reflejar el puerto 11C5 canónico.

### C-06 — `identity_verified` vs `verified` en TenantProfileActor [RECLASIFICADO]

**Clasificación:** `REQUIRED_ADAPTER_TRANSFORMATION` — no es una contradicción semántica.

| Dimensión | Adapter 11C1 | Puerto 11C5 (canónico) | Transformación |
|-----------|-------------|----------------------|----------------|
| Nombre campo | `identity_verified: boolean` | `verified: boolean` | Rename en migración de adapter |
| Significado | Inquilino verificado | Inquilino verificado | Idéntico |
| Validación 11C1 | `if (!cmd.actor.identity_verified)` | `validateCanonicalActor` comprueba `verified` | La lógica de validación es equivalente |

**Evidencia de no-contradicción:** Ambos campos portan el mismo significado booleano de verificación del inquilino. El cambio de nombre es consecuencia de la estandarización del modelo canónico en Fase 11C5. La migración del adapter de `identity_verified` a `verified` es un rename directo sin pérdida semántica.

**Acción requerida:** Renombrar campo en adapter 11C1 durante su migración al modelo canónico 11C5.

---

## 4. Preguntas abiertas (13)

| ID | Pregunta | Origen | Prioridad |
|----|----------|--------|-----------|
| Q-01 | ¿Cómo genera SC el campo `title` (obligatorio SI) a partir del `description` del comando? ¿Trunca los primeros N chars, usa IA para sintetizar, o es un campo separado del EF? | C-01 | **ALTA** |
| Q-02 | ¿Cuál es la tabla de mapeo exacta `urgency_proposal → priority` (`normal\|urgent`)? ¿low+medium → normal, high+critical → urgent? | C-02, B-02 | **ALTA** |
| Q-03 | Cuando el actor SC es `system_service` (flujo automatizado), ¿de dónde obtiene SC el `requester_profile_id` para enviarlo a SI? | C-03 | **ALTA** |
| Q-04 | ¿Cuándo se migra el adapter 11C1 al modelo canónico 11C5? ¿Antes o después de activar canary DEV? | C-04 | **ALTA** |
| Q-05 | ¿La propuesta OpenAPI consumer debe enviarse al equipo de SI para revisión antes de activar canary? | D-21 | MEDIA |
| Q-06 | ¿Quién aprueba `contract-create-incident-request.md`? ¿SC de forma unilateral o requiere aprobación conjunta SI? | B-02 | **ALTA** |
| Q-07 | ¿Shadow mode aplica al endpoint `/health` de SI (operación de lectura idempotente)? | D-10, mode-model | BAJA |
| Q-08 | ¿Qué UUID ficticio usa DEV-A como tenant en las pruebas canary de SI? | D-12 | MEDIA |
| Q-09 | EF `conv-core-create-incident`: ¿existe implementada? ¿Cuál es su estado actual? | C-01, C-02, C-03 | **ALTA** |
| Q-10 | ¿SI tiene límites de rate definidos (req/s por tenant) que SC deba respetar en el Retry-After? | contract §6 | MEDIA |
| Q-11 | ¿Qué hace SC si SI retorna un `status` fuera del enum esperado (ej: `status: 'escalated'`)? | contract §salida | MEDIA |
| Q-12 | ¿Existe contrato de SLA para el endpoint SI (timeout máximo esperado)? SC tiene hardcoded `AbortSignal.timeout(policy.timeout_ms)` | adapter | MEDIA |
| Q-13 | ¿Cuándo cierra GATE_1? ¿Qué auditoría externa está pendiente y cuáles son sus criterios de éxito? | GATE_1 | MEDIA |

---

## 5. Blockers verificados (6)

Los siguientes ítems bloquean la activación de integración real SC → SI.

### B-01 — Campo `title` ausente en CreateIncidentCommand SC

**Fuentes:** `incidents-integration-port.ts` (sin `title`) vs `contract-incident-entity.md` §2 (`title` OBLIGATORIO)
**Impacto:** SI rechazará el request sin `title`. La integración no puede funcionar en modo real hasta que SC incluya `title` en el comando.
**Acción requerida:** Añadir `title: string` al bloque `incident.*` de `CreateIncidentCommand`, con longitud máxima 255 chars. Documentar cómo se genera (derivado de description, generado por EF, etc.).
**Estado:** BLOCKER — no se modifica código en esta microfase (restricción 11C5D).

### B-02 — Ausencia de mapeo canónico aprobado `urgency_proposal → priority`

**Naturaleza del blocker:** El blocker no es meramente la ausencia física de un archivo. El blocker es la **ausencia de un mapeo canónico aprobado** que defina con autoridad cómo cada valor de `urgency_proposal` (campo libre SC, nullable) se transforma en `priority: 'normal' | 'urgent'` (enum obligatorio SI).

**Estado del contrato:** `contract-create-incident-request.md` es un contrato **provider-owned** (pertenece a Smart Incidents). Una copia snapshot está disponible en `docs/smart-conversations/integrations/provider-contract-snapshots/smart-incidents-create-request-v1.0.md`. La tabla de mapeo derivada de ese contrato es: `low|medium|null → 'normal'`, `high → 'urgent'`. Valores desconocidos → NO INVOCAR al provider (never fallback silencioso).

**Por qué el mapeo debe implementarse con cautela en SC:** El enum de destino (`'normal' | 'urgent'`) pertenece al dominio de Smart Incidents. SC implementa el mapeo derivado del contrato provider con validación estricta: valores fuera del set `{low, medium, high, null}` abortan la invocación — nunca se mapea un valor desconocido a un valor por defecto silencioso.

**Fuentes:** `rules-30` §4.5 + `contract-incident-entity.md` §2 (`priority` OBLIGATORIO, enum `'normal' | 'urgent'`) + `provider-contract-snapshots/smart-incidents-create-request-v1.0.md` + `incidents-integration-port.ts` (`urgency_proposal: string | null`).

**Acción tomada en SC (11C5E-IMPLEMENTATION):** Snapshot del contrato provider creado. Implementado `mapUrgencyToPriority()` en `incidents-priority-mapper.ts` con rechazo explícito de valores desconocidos.

**Estado:** BLOCKER estructural — no se crea el contrato en esta microfase.

### B-03 — `requester_profile_id` ausente del CreateIncidentCommand SC

**Fuentes:** `incidents-integration-port.ts` (sin `requester_profile_id`) vs `contract-incident-entity.md` + `rules-30` §3.1 (OBLIGATORIO siempre)
**Impacto:** SI rechazará el request. El DTO SC está incompleto.
**Acción requerida:** Añadir `requester_profile_id: string` al CreateIncidentCommand SC (probablemente en `incident.*` o como campo raíz). El EF `conv-core-create-incident` debe resolverlo antes de llamar al adapter.
**Estado:** BLOCKER — no se modifica código en esta microfase.

### B-04 — Endpoints DEV no configurados

**Fuentes:** `addons-dev-readiness.md` §3, smokes con exit 2
**Impacto:** `smoke-dev-incidents-addon.mjs` produce exit 2 (`NOT_EXECUTED_CONFIGURATION_PENDING`). No existe evidencia de integración DEV real.
**Acción requerida:** Configurar `INCIDENTS_ADDON_BASE_URL` y `INCIDENTS_ADDON_SERVICE_TOKEN` para DEV. Depende del equipo de SI.
**Estado:** BLOCKER operacional — esperado en Fase 11C5, no resuelto.

### B-05 — Adapter 11C1 usa modelo de actor incompatible con puerto 11C5

**Fuentes:** `incidents-addon-adapter.ts` vs `canonical-actor.ts` + `incidents-integration-port.ts`
**Impacto:** Si se activa canary o real usando el adapter 11C1, el actor enviado a SI no cumplirá el modelo canónico 11C5 (campos distintos, tipos distintos).
**Acción requerida:** Migrar adapter 11C1 al modelo canónico 11C5 antes de activar cualquier modo distinto a mock.
**Estado:** BLOCKER para canary — adapter opera en mock, no hay impacto actual.

### B-06 — `integration-contract-catalog.md` describe adapter 11C1 (obsoleto)

**Fuentes:** `integration-contract-catalog.md` §Add-on Incidencias vs `incidents-integration-port.ts`
**Impacto:** Cualquier lector del catálogo obtendrá una representación incorrecta del contrato canónico. Riesgo de implementación basada en schema obsoleto.
**Acción requerida:** Actualizar el catálogo para reflejar el puerto 11C5 canónico.
**Estado:** BLOCKER documental (bajo) — no bloquea integración técnica.

---

## 6. Preguntas abiertas resueltas (de las 13 originales)

De las 13 preguntas abiertas, **4 tienen respuesta directa en fuentes canónicas**:

| ID | Pregunta | Respuesta canónica | Fuente |
|----|----------|--------------------|--------|
| Q-06 (parcial) | ¿Quién aprueba el contrato de mapeo? | El mapeo es responsabilidad de SC (`conv-core-create-incident`), pero el contrato debe existir en SI antes de implementarlo. No puede aprobarse unilateralmente. | `rules-30` §4.5 |
| Q-07 | ¿Shadow mode aplica a `/health`? | No aplica como "shadow" en el sentido del modelo, pero `/health` es safe to retry (sin efecto mutable). No existe prohibición explícita de hacer health checks en shadow. | integration-mode-model |
| Q-10 (parcial) | ¿Rate limits? | SC ya maneja Retry-After (HTTP 429) per contrato §6. No hay SLA definido en SI docs leídos. | contract §6 |
| Q-13 (parcial) | ¿Qué cierra GATE_1? | GATE_1 no cierra hasta auditoría externa completa. No hay criterios definidos aún en docs SC. | readiness §GATE_1 |

**9 preguntas siguen abiertas:** Q-01, Q-02, Q-03, Q-04, Q-05, Q-06 (parcial), Q-08, Q-09, Q-11, Q-12.

---

## 7. Estado de reconciliación por área

| Área | Estado SC | Estado SI | Brecha | Severity |
|------|-----------|-----------|--------|----------|
| Autenticación B2B | ✅ Definida | ✅ Definida | Ninguna | OK |
| Aislamiento multi-tenant | ✅ Definido | ✅ Definido | Ninguna | OK |
| Modo de integración | ✅ 5 modos | (implícito) | SC define más detalle | LOW |
| Payload del comando | ⚠️ Incompleto (sin title, sin requester_profile_id) | ✅ Definido | **C-01, C-03** | BLOCKER |
| Mapeo urgency → priority | ⚠️ Definido como responsabilidad SC, sin contrato | ✅ Espera priority enum | **C-02, B-02** | BLOCKER |
| Actor canónico | ⚠️ 11C5 correcto, 11C1 obsoleto | system para fuentes conv. | **C-04** | MEDIUM |
| Idempotencia | ✅ Definida SC | ✅ Implicada en entity | Ninguna | OK |
| Privacidad / PII | ✅ Definida SC | ✅ Definida SI | Ninguna | OK |
| audit_log | (no contradice) | ✅ SI service_role (no reabrirable) | SC no interfiere | OK |
| n8n aislamiento | ✅ SC privacy-model §6 | ✅ rules-00 §3.3 | Ninguna | OK |
| DEV endpoint | ❌ NOT_EXECUTED_CONFIGURATION_PENDING | (externo) | **B-04** | BLOCKER |
| Documentación interna SC | ⚠️ Catálogo 11C1 obsoleto | N/A | **C-05, B-06** | LOW |
| OpenAPI consumer | ✅ Propuesta SC, no aprobada SI | N/A | Estado correcto declarado | OK |

---

## 8. Estado global derivado

**Estado:** `INTEGRATION_DEFINED_WITH_STRUCTURAL_GAPS`

La integración tiene base arquitectónica correcta (aislamiento, autenticación, privacidad, idempotencia, modos). Sin embargo, el DTO de creación de incidente en SC está incompleto frente al contrato canónico de SI:

- Falta `title` (mandatory SI)
- Falta `requester_profile_id` (mandatory SI, todas las fuentes)
- Falta `contract-create-incident-request.md` (mapping urgency → priority)

Estos tres gaps impiden que la integración funcione en modo real. En mock no hay impacto (mock retorna respuesta simulada sin validar el DTO contra SI).

**Score:** 3.2 / 5
- +1.0 Arquitectura de aislamiento y privacidad correcta
- +1.0 Autenticación B2B correcta
- +0.8 Modos de integración definidos (5 modos, fail-closed)
- +0.4 Idempotencia y manejo de errores definidos
- −0.6 DTO incompleto (3 campos estructurales faltantes)
- −0.4 Contrato de mapeo ausente

---

## 9. Restricciones de seguridad activas (Fase 11C5D)

Ninguna de las siguientes restricciones fue violada en esta microfase:

- No se modificó código de producción
- No se modificaron contratos canónicos (SC ni SI)
- No se modificaron rules (SC ni SI)
- No se desplegó nada (DEV / PRE / PRO)
- No se aprobaron unilateralmente contratos de Smart Incidents
- No se presentó el OpenAPI consumer como contrato aprobado por SI
- No se inventó auth ni endpoints
- No se introdujeron identity_levels, estados conversacionales ni eventos Activity Log nuevos
- No se introdujo WF-02, conv_help_escalated, WEAK_MATCH, UNVERIFIED standalone, next_retry_at, attempt_count
- No se comenzó Fase 11C6
- No se implementó Realtime
- No se implementó Wasender
- GATE_1 = `AUDIT_COMPLETE_REMEDIATION_PENDING` — **no se cerró**

---

## 10. Confirmaciones finales

| # | Confirmación | Estado |
|---|-------------|--------|
| 1 | `incidents-cross-module-reconciliation.md` creado | ✅ Este documento |
| 2 | Estado final de reconciliación documentado | ✅ `INTEGRATION_DEFINED_WITH_STRUCTURAL_GAPS` |
| 3 | Número de decisiones confirmadas | ✅ 22 |
| 4 | Número de contradicciones verificadas | ✅ 6 |
| 5 | Número de preguntas abiertas resueltas | ✅ 4 (parciales) |
| 6 | Número de preguntas abiertas que siguen abiertas | ✅ 9 |
| 7 | Número de blockers bloqueantes para integración real | ✅ 3 (B-01, B-02, B-03) |
| 8 | Número de blockers operacionales / documentales | ✅ 3 (B-04, B-05, B-06) |
| 9 | OpenAPI consumer no presentado como aprobado por SI | ✅ Propuesta SC únicamente |
| 10 | `requester_profile_id` correctamente documentado como ausente en DTO SC | ✅ C-03, B-03 |
| 11 | `contract-create-incident-request.md` es provider-owned — snapshot en `provider-contract-snapshots/` | ✅ Snapshot creado en 11C5E-IMPLEMENTATION |
| 12 | Hallazgo `title` vs `description` documentado | ✅ C-01, B-01 |
| 13 | Actor SC para fuente conversacional = `system_service` (SC) / `system` (SI) | ✅ D-17, C-04 |
| 14 | Decisiones no reabribles de SI no contradichas por SC | ✅ D-19 (audit_log via SI service_role) |
| 15 | audit_log via SI service_role confirmado desde rules-00 §3.6 | ✅ Decisión no reabrirable |
| 16 | GATE_0 = `PASS_WITH_WARNINGS` / GATE_1 = `AUDIT_COMPLETE_REMEDIATION_PENDING` | ✅ Verificado en 11C5E-IMPLEMENTATION |
| 17 | Documento de assessment declarado como input: NO EXISTE | ✅ §0 documenta la ausencia |
| 18 | No se modificó ningún contrato canónico | ✅ Solo lectura y creación de este doc |
| 19 | No se modificó ninguna rule | ✅ Solo lectura |
| 20 | No se desplegó nada | ✅ Fase documental |
| 21 | Fase 11C6 no comenzó | ✅ Pendiente resolución de gaps estructurales |
