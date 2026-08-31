# SI-P1 — Reconciliación e Inventario Ejecutable del Provider de Smart Incidents

**Lote:** SI-P1  
**Fecha de auditoría:** 2026-07-29  
**Alcance:** Read-only — sin modificaciones intencionales de código, migraciones, rules, contracts ni tests  
**Precedencia documental:** rules > contracts > skills > tests > diagrams > reports > chat  
**Output:** Inventario de estado actual del provider-side del add-on `smart-incidents`, brechas identificadas y propuesta de lotes SI-P2 a SI-P6B

---

## 1. Git baseline

**Branch:** `develop`  
**Commit:** `f55eba1 deploy: sync develop changes to staging`

### Outputs acotados a `docs/smart-incidents`

**`git status --short -- docs/smart-incidents`:**

```
 M docs/smart-incidents/rules/rules-01-document-authoring-standard.md
?? docs/smart-incidents/contracts/
?? docs/smart-incidents/integration/
?? docs/smart-incidents/rules/rules-20-incident-lifecycle.md
?? docs/smart-incidents/rules/rules-30-incident-creation.md
```

**`git diff --name-only -- docs/smart-incidents`:**

```
docs/smart-incidents/rules/rules-01-document-authoring-standard.md
```

**`git diff --stat -- docs/smart-incidents`:**

```
 docs/smart-incidents/rules/rules-01-document-authoring-standard.md | 6 +++---
 1 file changed, 3 insertions(+), 3 deletions(-)
```

### Interpretación honesta del working tree

SI-P1 fue ejecutado con intención read-only. El único fichero atribuido a este lote es `docs/smart-incidents/integration/incident-provider-si-p1-reconciliation.md`, que aparece como untracked bajo el directorio `docs/smart-incidents/integration/`.

El working tree ya estaba ampliamente sucio antes de iniciar este lote. Los demás elementos que aparecen en el scope de `docs/smart-incidents` son:

| Fichero / directorio | Estado git | Atribución |
|---|---|---|
| `docs/smart-incidents/rules/rules-01-document-authoring-standard.md` | `M` (modificado unstaged, 6 líneas ±3) | No atribuido a SI-P1 — preexistente |
| `docs/smart-incidents/contracts/` | `??` (untracked) | No atribuido a SI-P1 — preexistente |
| `docs/smart-incidents/integration/` | `??` (untracked) | Contiene el informe de este lote |
| `docs/smart-incidents/rules/rules-20-incident-lifecycle.md` | `??` (untracked) | No atribuido a SI-P1 — preexistente |
| `docs/smart-incidents/rules/rules-30-incident-creation.md` | `??` (untracked) | No atribuido a SI-P1 — preexistente |

Sin un snapshot del árbol anterior al inicio de este lote no puede certificarse globalmente que todos los demás cambios del repositorio fueran preexistentes. Lo que sí puede afirmarse es que la intención de este lote fue exclusivamente read-only y que el único fichero creado intencionalmente es el presente informe.

---

## 2. Propósito

Este documento es el artefacto principal del Lote SI-P1. Registra el estado real del provider-side del add-on `smart-incidents` en la fecha de auditoría, identifica brechas respecto a los documentos canónicos, registra inconsistencias externas detectadas y propone los ficheros concretos que deben producirse en los lotes SI-P2 a SI-P6B.

No declara ningún estado final del provider. No propone implementar código. No resuelve brechas documentales.

---

## 3. Metodología

### 3.1 Documentos canónicos leídos (fuente de verdad)

| Documento | Categoría | Estado |
|---|---|---|
| `docs/smart-incidents/rules/rules-00-scope-and-principles.md` | rules | PRESENTE |
| `docs/smart-incidents/rules/rules-01-document-authoring-standard.md` | rules | PRESENTE |
| `docs/smart-incidents/rules/rules-05-roles-and-visibility.md` | rules | PRESENTE |
| `docs/smart-incidents/rules/rules-20-incident-lifecycle.md` | rules | PRESENTE |
| `docs/smart-incidents/rules/rules-30-incident-creation.md` | rules | PRESENTE |
| `docs/smart-incidents/contracts/contract-incident-entity.md` | contracts | PRESENTE |
| `docs/smart-incidents/contracts/contract-incident-state-machine.md` | contracts | PRESENTE |
| `docs/smart-incidents/PLAN-INCIDENTS` | plan | PRESENTE |
| `docs/smart-conversations/integrations/provider-contract-snapshots/smart-incidents-create-request-v1.0.md` | snapshot SC | PRESENTE (artefacto SC — no es contrato provider) |
| `docs/smart-conversations/integrations/incidents-addon-openapi-consumer.yaml` | OpenAPI SC | PRESENTE (artefacto SC — no es contrato provider) |
| `supabase/functions/_shared/smart-conversations/incidents-integration-port.ts` | implementación SC | PRESENTE (artefacto SC — no es contrato provider) |
| `supabase/functions/_shared/smart-conversations/adapters/incidents-addon-adapter.ts` | implementación SC | PRESENTE (artefacto SC — no es contrato provider) |
| `supabase/functions/conv-core-create-incident/index.ts` | implementación SC | PRESENTE (artefacto SC — no es contrato provider) |

### 3.2 Fuentes inspeccionadas en busca de implementación provider-side

| Fuente | Resultado |
|---|---|
| `supabase/functions/smart_incidents/` | Directorio existe — VACÍO |
| `supabase/migrations/` (patrón `inc_*`) | 0 coincidencias |
| `supabase/functions/_shared/smart-incidents/` | No existe |
| `docs/smart-incidents/skills/` | Directorio existe — VACÍO |
| `docs/smart-incidents/tests/` | Directorio existe — VACÍO |
| `docs/smart-incidents/diagrams/` | Directorio existe — VACÍO |
| `docs/smart-incidents/integration/` | No existía — creado en este lote para este informe |
| `tests/regression/smart-incidents/` | No existe |

---

## 4. Inventario documental: estado real vs diseñado

### 4.1 Rules (5 presentes / 6 ausentes)

| Fichero | Estado | Impacto de la ausencia |
|---|---|---|
| `rules-00-scope-and-principles.md` | ✅ PRESENTE | — |
| `rules-01-document-authoring-standard.md` | ✅ PRESENTE | — |
| `rules-05-roles-and-visibility.md` | ✅ PRESENTE | — |
| `rules-20-incident-lifecycle.md` | ✅ PRESENTE | — |
| `rules-30-incident-creation.md` | ✅ PRESENTE | — |
| `rules-10-addon-entitlement.md` | ❌ AUSENTE | Sin definición formal del mecanismo de verificación de entitlement. rules-00 §4.2 lo exige y delega a rules-10. |
| `rules-40-assignment-routing.md` | ❌ AUSENTE | La asignación simple forma parte del MVP pero su modelado está diferido a este documento. El campo `assignee` no puede incluirse en `contract-incident-entity.md` hasta que rules-40 esté aprobado. |
| `rules-50-n8n-automation.md` | ❌ AUSENTE | Sin frontera formal entre lo que n8n puede hacer y lo que ejecutan las EFs. Prerrequisito de SI-P6A. |
| `rules-60-whatsapp-notifications.md` | ❌ AUSENTE | Sin especificación de plantillas, destinatarios ni restricciones del canal WhatsApp outbound de SI. |
| `rules-70-activity-log.md` | ❌ AUSENTE | Sin catálogo normativo de eventos del `audit_log` ni restricciones PII por evento. Prerrequisito de SI-P6A. |
| `rules-80-security-and-tenancy.md` | ❌ AUSENTE | Sin política formal de RLS ni frontera de datos publicables hacia n8n. Prerrequisito de SI-P2. |

### 4.2 Contracts (2 presentes / 3 ausentes)

| Fichero | Estado | Impacto de la ausencia |
|---|---|---|
| `contract-incident-entity.md` | ✅ PRESENTE | — |
| `contract-incident-state-machine.md` | ✅ PRESENTE | — |
| `contract-create-incident-request.md` | ❌ AUSENTE — **BLOCKER B-02** | Sin este contrato la EF provider no tiene definición formal del payload de creación ni del placement canónico de sus campos. Ver GAP-02 y SC-SI-01. Prerrequisito de SI-P2. |
| `contract-n8n-event-payload.md` | ❌ AUSENTE | Sin definición de qué recibe n8n cuando se activa un workflow de incidencia. Prerrequisito de SI-P6A. |
| `contract-activity-log-event.md` | ❌ AUSENTE | Sin definición de los payloads técnicos de los eventos del `audit_log`. Prerrequisito de SI-P6A. |

### 4.3 Skills, Tests, Diagrams

| Categoría | Estado |
|---|---|
| `docs/smart-incidents/skills/` | VACÍO — 0 ficheros |
| `docs/smart-incidents/tests/` | VACÍO — 0 ficheros |
| `docs/smart-incidents/diagrams/` | VACÍO — 0 ficheros |

---

## 5. Inventario de implementación: estado real

### 5.1 Tablas de base de datos (`inc_*`)

0 tablas. No existe ninguna migración con el patrón `inc_*` en `supabase/migrations/`.

| Tabla esperada | Estado |
|---|---|
| `inc_incidents` | ABSENT — 0 migraciones |
| `inc_attachments` | ABSENT — 0 migraciones |
| `inc_activities` | ABSENT — 0 migraciones |

### 5.2 Migraciones

0 migraciones con referencia a `inc_incidents`, `inc_attachments`, `inc_activities` ni a ningún otro elemento del add-on.

### 5.3 Edge Functions del provider

0 Edge Functions. `supabase/functions/smart_incidents/` existe pero está vacío.  
**Estado:** `DESIGNED_NOT_IMPLEMENTED`

### 5.4 Ports y adapters del provider

0. `supabase/functions/_shared/smart-incidents/` no existe.

### 5.5 Auth del provider

ABSENT. Toda la lógica de auth presente corresponde al consumer (SC).

### 5.6 Entitlement del provider

`DESIGNED_NOT_IMPLEMENTED`. rules-00 §4.2 define el requisito (saas_service_subscriptions status='active'). rules-10 ausente. Sin implementación.

### 5.7 Validaciones de dominio

| Validación | Estado |
|---|---|
| `requester_profile_id` — obligatorio en todas las fuentes (rules-30 §4.2) | `DESIGNED_NOT_IMPLEMENTED` |
| `accommodation_id` — siempre obligatorio (rules-30 §4.2) | `DESIGNED_NOT_IMPLEMENTED` |
| `room_id` — opcional, verificación de pertenencia al alojamiento (rules-30 §4.9) | `DESIGNED_NOT_IMPLEMENTED` |

### 5.8 Persistencia

ABSENT. 0 tablas. 0 EFs que realicen INSERT.

### 5.9 Idempotencia del provider

ABSENT. El consumer (SC) tiene `IMPLEMENTED_DERIVED_OPAQUE` (HMAC-SHA256). El provider tiene ABSENT.

### 5.10 Tres flujos de registro: modelo documentado y estado de implementación

Los siguientes tres flujos son independientes y no deben tratarse como una única transacción ni como sinónimos entre sí.

---

#### Flujo 1 — `inc_activities` (timeline interno)

**Naturaleza:** tabla del add-on smart-incidents. Registro transaccional del historial interno de cada incidencia. No es publicación externa.

**Fuente normativa:** rules-30 §3.6 y §4.11.

**Texto exacto de rules-30 §3.6:**

> **Toda creación exitosa debe registrar en `inc_activities`.** Un registro en `inc_incidents` sin el correspondiente registro inicial en `inc_activities` es un estado inválido. Si el registro en `inc_activities` falla, la creación no debe completarse.

**Texto exacto de rules-30 §4.11:**

> Si la inserción en `inc_activities` falla, la EF debe hacer rollback del `INSERT` en `inc_incidents` y devolver error al llamante.

**Modelo de atomicidad:** rules-30 §3.6 y §4.11 exigen atomicidad lógica con rollback explícito entre `inc_incidents` e `inc_activities`. Son una unidad indivisible en la operación de creación. La implementación técnica (transacción de base de datos vs. compensación explícita) no está especificada textualmente, pero la semántica de rollback la implica.

**Responsabilidad de lote:** SI-P5 crea la migración de `inc_activities`, implementa su repository y coordina el INSERT dual atómico con `inc_incidents`.

**Estado implementación:** ABSENT

---

#### Flujo 2 — Evento hacia n8n (automatización)

**Naturaleza:** publicación externa a n8n para desencadenar workflows de automatización (notificación al resolutor, etc.). No es persistencia interna.

**Fuente normativa parcial:** rules-30 §4.10 define los campos permitidos en el payload (`incident_id`, `client_account_id`, `status`, `category`, `priority`, `source` — sin PII). rules-50-n8n-automation.md está ausente.

**Modelo de entrega:** `NO_CONFIRMADO`. No existe ningún documento que defina si la publicación es síncrona, asíncrona, fire-and-log, ni qué ocurre si falla. Ningún contrato formaliza el payload completo.

**Responsabilidad de lote:** SI-P6A (cierre documental: rules-50, contract-n8n-event-payload.md). SI-P6B (implementación una vez el documental esté aprobado).

**Estado implementación:** ABSENT

---

#### Flujo 3 — `audit_log` del Core (actividad general)

**Naturaleza:** publicación al registro de actividad general del Core con service_role. No es persistencia interna del add-on ni es el mismo canal que n8n.

**Fuente normativa:** rules-00 §3.6 exige publicación con service_role. rules-70-activity-log.md está ausente. contract-activity-log-event.md está ausente.

**Modelo de transacción y fallo:** `NO_CONFIRMADO`. No existe definición del evento, de sus campos, de las restricciones PII por evento, ni del comportamiento ante fallo del publisher.

**Responsabilidad de lote:** SI-P6A (cierre documental: rules-70, contract-activity-log-event.md). SI-P6B (implementación una vez el documental esté aprobado).

**Estado implementación:** ABSENT

---

### 5.11 Assignee

**Estado: `DENTRO_DEL_MVP_PERO_DIFERIDO`**

| Dimensión | Estado |
|---|---|
| Funcionalidad | Dentro del MVP — la asignación simple es parte del alcance de V1 |
| Modelado contractual | Diferido — `contract-incident-entity.md` no incluye el campo `assignee` en su versión actual, explícitamente hasta que rules-40 esté aprobado |
| Prerequisito documental | `rules-40-assignment-routing.md` AUSENTE — bloquea el modelado |
| Implementación | ABSENT — no debe implementarse hasta que rules-40 esté aprobado y `contract-incident-entity.md` sea formalmente actualizado |

### 5.12 Tests del provider

0 tests provider-side. `tests/regression/smart-incidents/` no existe. `docs/smart-incidents/tests/` está vacío.

---

## 6. Contradicciones e inconsistencias

### Contradicciones canónicas provider: 0

No existe ninguna contradicción entre documentos canónicos del dominio Smart Incidents. Los cinco documentos presentes (rules-00, rules-01, rules-05, rules-20, rules-30 y los dos contracts) son internamente consistentes.

### Inconsistencias externas detectadas: 1

**SC-SI-01 — Placement de `requester_profile_id` y `external_request_reference`**  
**Clasificación:** `DOCUMENTAL_PROVIDER_GAP_WITH_CONSUMER_ALIGNMENT`

| Fuente | Placement `requester_profile_id` | Placement `external_request_reference` | Naturaleza |
|---|---|---|---|
| `smart-incidents-create-request-v1.0.md` (snapshot SC) | DENTRO de `incident.*` | DENTRO de `incident.*` | Artefacto SC — no es contrato provider |
| `ProviderCreateIncidentRequestV1` (port SC) | ROOT | ROOT | Implementación SC del contrato esperado |
| `buildProviderRequest()` (adapter SC) | ROOT | ROOT | Implementación SC del contrato esperado |
| OpenAPI consumer (artefacto SC) | ROOT | ROOT | Artefacto SC |

**Diagnóstico:** El snapshot SC y la implementación SC divergen en el placement de ambos campos. Hay alineación interna entre la interface TypeScript, el adapter y el OpenAPI del lado consumer, pero no entre esos artefactos y el snapshot previo.

**Límite:** Ninguno de estos artefactos es el contrato provider-owned. SmartConversations no puede cerrar unilateralmente la estructura del contrato provider. La implementación SC refleja su interpretación del contrato esperado, pero no constituye definición canónica del dominio Smart Incidents.

**Resolución:** No puede resolverse por precedencia del consumer. El lote SI-P2 debe crear `contract-create-incident-request.md` como contrato provider-owned dentro del árbol real del repositorio. Ese documento es el único artefacto que puede fijar canónicamente el placement de ambos campos en el dominio Smart Incidents.

---

## 7. Brechas (GAP inventory)

| ID | Brecha | Tipo | Asignado a |
|---|---|---|---|
| GAP-01 | `rules-10-addon-entitlement.md` ausente | documental | SI-P2 |
| GAP-02 | `contract-create-incident-request.md` ausente — BLOCKER B-02 | documental | SI-P2 |
| GAP-03 | `rules-40-assignment-routing.md` ausente | documental | lote assignee (post SI-P5) |
| GAP-04 | `rules-50-n8n-automation.md` ausente | documental | SI-P6A |
| GAP-05 | `rules-60-whatsapp-notifications.md` ausente | documental | lote notificaciones (post SI-P6B) |
| GAP-06 | `rules-70-activity-log.md` ausente | documental | SI-P6A |
| GAP-07 | `rules-80-security-and-tenancy.md` ausente | documental | SI-P2 |
| GAP-08 | `contract-n8n-event-payload.md` ausente | documental | SI-P6A |
| GAP-09 | `contract-activity-log-event.md` ausente | documental | SI-P6A |
| GAP-10 | 0 tablas `inc_*` en base de datos | implementación | SI-P5 |
| GAP-11 | 0 migraciones para namespace `inc_*` | implementación | SI-P5 |
| GAP-12 | `supabase/functions/smart_incidents/` vacío | implementación | SI-P3 |
| GAP-13 | Auth provider ausente | implementación | SI-P3 |
| GAP-14 | Idempotencia provider-side ausente | implementación | SI-P5 |
| GAP-15 | Atomicidad `inc_incidents + inc_activities` no implementable | implementación | SI-P5 |
| GAP-16 | Publicación al `audit_log` del Core ausente | implementación | SI-P6B |
| GAP-17 | Modelo transaccional publicación n8n y audit_log: NO_CONFIRMADO | documental | SI-P6A |
| GAP-18 | 0 tests provider-side | testing | SI-P3, SI-P5, SI-P6B |
| GAP-19 | `docs/smart-incidents/skills/` vacío | skills | lote posterior |
| GAP-20 | Placement de `requester_profile_id` y `external_request_reference` no formalizado en contrato provider-owned — SC-SI-01 | documental | SI-P2 |

**Total brechas: 20 (GAP-01 a GAP-20)**  
**Contradicciones canónicas provider: 0**  
**Inconsistencias externas: 1 (SC-SI-01)**

---

## 8. Plan por lotes SI-P2 a SI-P6B

### SI-P2 — Cierre documental provider

**Objetivo:** Crear la documentación canónica provider que bloquea cualquier implementación. Sin código. Sin migraciones.

**Prerequisito:** ninguno — primer lote ejecutable.

Ficheros a crear:

- `docs/smart-incidents/rules/rules-10-addon-entitlement.md` — mecanismo formal de verificación de entitlement
- `docs/smart-incidents/rules/rules-80-security-and-tenancy.md` — política de RLS y frontera de datos publicables
- `docs/smart-incidents/contracts/contract-create-incident-request.md` — contrato provider-owned que resuelve SC-SI-01 como decisión canónica del dominio Smart Incidents
- Tests documentales contractuales mínimos en `docs/smart-incidents/tests/` para los casos de validación del contrato de creación
- Corrección de referencias rotas en rules-30 solo si se detectan tras crear el contrato

---

### SI-P3 — Frontera HTTP y autenticación

**Objetivo:** Implementar el endpoint provider y la capa de validación y autenticación. Sin persistencia final de incidencia.

**Prerequisito:** SI-P2 completo (en particular `contract-create-incident-request.md` aprobado).

Ficheros a crear:

- Endpoint provider — `supabase/functions/smart_incidents/create-incident/index.ts` o estructura equivalente
- Validator de request v1.0 — valida el payload contra `contract-create-incident-request.md`
- Response mapper — serializa la respuesta al formato contractual
- Error mapper — mapea errores internos a los 15 ProviderErrorCode contractuales
- Authentication port — interfaz de verificación del token entrante
- Authentication adapter — implementación de verificación de `INCIDENTS_ADDON_SERVICE_TOKEN`
- Tests runtime de contrato y autenticación

---

### SI-P4 — Entitlement y validación de dominio

**Objetivo:** Implementar verificación de entitlement y validaciones de dominio. Sin persistencia final.

**Prerequisito:** SI-P3 completo; `rules-10` (SI-P2) y `rules-80` (SI-P2) aprobados.

Ficheros a crear:

- Entitlement port — interfaz de verificación de `saas_service_subscriptions`
- Entitlement adapter — implementación de consulta y evaluación de status
- Requester validation — verificación de `requester_profile_id` como perfil activo
- Accommodation validation — verificación de que `accommodation_id` pertenece al client_account con entitlement activo
- Room validation — verificación de pertenencia de `room_id` al accommodation cuando está presente
- Aislamiento multi-tenant — garantía de no cruce de fronteras de client_account
- Tests adversariales — cruce de tenant, entitlement inactivo, requester inválido

---

### SI-P5 — Persistencia e idempotencia durable

**Objetivo:** Crear el modelo de datos, implementar la persistencia de incidencias, el registro interno de actividad y el mecanismo de idempotencia durable.

**Prerequisito:** SI-P4 completo; `rules-80` aprobado para políticas RLS.

**Responsabilidad exacta de `inc_activities` en este lote:**

- Crea la migración de `inc_activities` (tabla, campos, FK a `inc_incidents`, índices)
- Implementa el repository de `inc_activities`
- Registra el evento interno de creación en `inc_activities` (actor, rol, estado inicial `new`, timestamp, fuente)
- Coordina el INSERT dual (`inc_incidents` + `inc_activities`) mediante la atomicidad lógica definida por rules-30 §3.6 y §4.11

`inc_activities` NO vuelve a crearse en lotes posteriores. Los lotes SI-P6A y SI-P6B no extienden la tabla `inc_activities` — solo implementan publicaciones externas independientes.

Ficheros a crear:

- Migración `inc_incidents` — campos de `contract-incident-entity.md` actual (sin `assignee`)
- Migración `inc_activities` — registro del timeline interno
- Migración `inc_attachments` — placeholder con FK a `inc_incidents`
- Migraciones RLS sobre las tres tablas — derivadas de `rules-80`
- Migración de idempotencia durable — store para `idempotency_key`
- Repository de `inc_incidents` — módulo de persistencia
- Repository de `inc_activities` — módulo de persistencia del timeline interno
- Transacción lógica segura — atomicidad `inc_incidents` + `inc_activities` con rollback per rules-30 §3.6 y §4.11
- Store de idempotencia — hash, replay (HTTP 200), conflicto (HTTP 409)
- Tests de concurrencia — replay, conflicto real, inserción simultánea

---

### SI-P6A — Cierre documental de eventos e integraciones

**Objetivo:** Crear la documentación canónica de los eventos externos (n8n y audit_log) sin la cual la implementación de publicaciones no tiene base normativa. Sin código de publicación.

**Prerequisito:** SI-P5 completo.

Ficheros a crear:

- `docs/smart-incidents/rules/rules-50-n8n-automation.md` — frontera formal de lo que n8n puede hacer vs. lo que ejecutan las EFs; modelo de entrega del evento hacia n8n; comportamiento ante fallo
- `docs/smart-incidents/rules/rules-70-activity-log.md` — catálogo normativo de eventos del `audit_log` del Core; restricciones PII por evento; comportamiento ante fallo del publisher
- `docs/smart-incidents/contracts/contract-n8n-event-payload.md` — payload completo del evento hacia n8n; campos permitidos; campos PII excluidos
- `docs/smart-incidents/contracts/contract-activity-log-event.md` — payloads técnicos de los eventos del `audit_log`; campos por tipo de evento; restricciones PII

---

### SI-P6B — Implementación de publicaciones, privacidad y certificación

**Objetivo:** Implementar las publicaciones externas (n8n y audit_log) con sus restricciones de privacidad y producir el smoke offline y la certificación de integridad.

**Prerequisito:** SI-P6A completo (todos los documentos aprobados).

**Responsabilidad exacta de los tres flujos en este lote:**

- `inc_activities`: NO se vuelve a crear. Ya implementada en SI-P5. Este lote no toca la tabla ni su repository.
- Evento hacia n8n: publicación del evento de creación conforme a `contract-n8n-event-payload.md` y `rules-50`. Modelo de entrega (síncrono/asíncrono/fire-and-log) según lo que defina rules-50.
- Publicación al `audit_log` del Core: publicación con service_role conforme a `contract-activity-log-event.md` y `rules-70`. Comportamiento ante fallo según lo que defina rules-70.

Ficheros a crear:

- Módulo de publicación hacia n8n — conforme a `rules-50` y `contract-n8n-event-payload.md`
- Módulo de publicación al `audit_log` del Core — con service_role, conforme a `rules-70` y `contract-activity-log-event.md`
- Logs allowlisted — verificación de que ningún payload contiene PII según las restricciones de los contratos aprobados
- Validator de eventos — comprobación de campos allowlisted antes de publicar
- Smoke offline provider — equivalente al `smoke-offline-incidents-addon.mjs` del consumer
- Tests runtime de publicaciones — cobertura de payloads allowlisted y comportamiento ante fallo del publisher
- Diagrams — diagrama de ciclo de vida e integrama SC→SI
- Gestión de la certificación offline (ver §9)

---

## 9. Certificación offline

El estado `INCIDENTS_PROVIDER_OFFLINE_READY_DEV_PENDING` es el objetivo al cierre de SI-P6B. No se declara automáticamente. Solo puede declararse si se verifican todas las condiciones siguientes:

| Condición | Verificable mediante |
|---|---|
| Tests runtime suficientes — cobertura de contrato, auth, entitlement, validación, persistencia, idempotencia y publicaciones | ejecución de la suite con resultados documentados |
| Validator aprobado — sin fallos atribuibles a Smart Incidents | output del validator con 0 errores sobre los checks del provider |
| Smoke offline aprobado — todos los pasos del smoke pasan | output del smoke con 0 fallos |
| Regresión sin fallos atribuibles a Smart Incidents | output de la suite de regresión completa |
| Evidencia de outputs documentada | artefactos de evidencia adjuntos o referenciados en el informe de cierre |
| Compatibilidad consumer/provider verificada | el adapter SC (`buildProviderRequest`) produce un payload que el validator provider acepta sin error |

Hasta que todas las condiciones anteriores estén verificadas con evidencia, el estado del provider es `DESIGNED_NOT_IMPLEMENTED`.

---

## 10. Separación entre hechos del repositorio y artefactos externos

El repositorio auditado (checkout `f55eba1`) **no contiene** `contract-create-incident-request.md` en ninguna de sus rutas.

Los artefactos SC son documentación y código del consumer SmartConversations. No son contratos provider-owned y no pueden sustituir ni anticipar el contrato canónico de Smart Incidents. El lote SI-P2 debe crear `contract-create-incident-request.md` dentro del árbol real del repositorio y validarlo como contrato provider-owned antes de que ninguna sesión o lote declare el placement de campos como canónico en el dominio Smart Incidents.

---

## 11. Resumen ejecutivo de estado

| Dimensión | Estado |
|---|---|
| Tablas `inc_*` | ABSENT (0 / 3) |
| Migraciones | ABSENT (0) |
| Edge Functions provider | DESIGNED_NOT_IMPLEMENTED |
| Auth provider | ABSENT |
| Entitlement | DESIGNED_NOT_IMPLEMENTED |
| Validación requester | DESIGNED_NOT_IMPLEMENTED |
| Validación accommodation | DESIGNED_NOT_IMPLEMENTED |
| Validación room | DESIGNED_NOT_IMPLEMENTED |
| Persistencia `inc_incidents` | ABSENT |
| Idempotencia provider | ABSENT |
| `inc_activities` (timeline interno) | ABSENT — atomicidad con `inc_incidents` DOCUMENTADA (rules-30 §3.6, §4.11), SIN IMPLEMENTAR |
| Evento hacia n8n | ABSENT — modelo de entrega NO_CONFIRMADO (rules-50 ausente) |
| Publicación `audit_log` Core | ABSENT — modelo transaccional NO_CONFIRMADO (rules-70 ausente) |
| Comportamiento ante fallo publisher | NO_CONFIRMADO |
| Assignee | DENTRO_DEL_MVP_PERO_DIFERIDO (rules-40 ausente) |
| Tests provider runtime | 0 |
| Tests documentales | 0 |
| Rules documentadas | 5 / 11 |
| Contracts documentados | 2 / 5 |
| Contradicciones canónicas provider | 0 |
| Inconsistencias externas | 1 (SC-SI-01 — DOCUMENTAL_PROVIDER_GAP_WITH_CONSUMER_ALIGNMENT) |
| Total brechas GAP | 20 (GAP-01 a GAP-20) |
| Blocker activo | B-02 — `contract-create-incident-request.md` ausente del repositorio |

---

## 12. Notas sobre el working tree

SI-P1 fue ejecutado con intención read-only. El único fichero creado intencionalmente en este lote es el presente informe.

El working tree estaba ampliamente sucio antes de iniciar este lote. Sin un snapshot anterior al lote no puede certificarse globalmente que todos los demás cambios del working tree fueran preexistentes. Los outputs acotados de `git status`, `git diff --name-only` y `git diff --stat` sobre `docs/smart-incidents` (sección 1) muestran exactamente qué ficheros de ese scope aparecen modificados o untracked, y cuál es el único con diff real.

No se modificó intencionalmente código de producción, SmartConversations, SmartLock, rules, contracts, tests ni migraciones en este lote. No se realizó ningún deploy.
