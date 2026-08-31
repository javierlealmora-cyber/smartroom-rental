# incident-provider-si-p3b1-auth-decision.md — Auditoría y decisión de autenticación SI-P3B1

**Estado documental:** `AUTH_PATTERN_AUDITED` · `RECOMMENDED_AUTH_PATTERN_SELECTED_WITH_REQUIRED_HARDENING`

---

## 1. Objetivo

Determinar, con evidencia del repositorio real, cuál es el mecanismo canónico de autenticación backend-to-backend que debe utilizar la integración:

```
SmartConversations (consumer) → Smart Incidents (provider)
```

El resultado cierra: identidad técnica del caller, autenticación, autorización de la operación, alcance tenant, entitlement, integridad de dominio, audience operacional, expiración, rotación, separación por entorno, tratamiento de secretos, mecanismo constant-time, formato de errores, comportamiento ante credencial ausente o inválida, reconciliación headers–body, CORS y frontera exacta del futuro endpoint.

Estas cinco capas son **independientes** y ninguna sustituye a las demás:

| Capa | Pregunta | Lote |
|------|----------|------|
| **1. Autenticación** | ¿Es el caller técnicamente `smart_conversations`? | SI-P3B2 |
| **2. Autorización de operación** | ¿Tiene permiso para `create_incident`? | SI-P3B2 |
| **3. Alcance tenant de la autorización** | ¿Puede declarar ese `client_account_id`? | SI-P3B2 (V1: global) |
| **4. Entitlement** | ¿Tiene `smart_incidents` activo ese tenant? | SI-P4 |
| **5. Integridad de dominio** | ¿Pertenecen requester, accommodation y room al tenant? | SI-P4 |

Este documento no implementa autenticación. La implementación es responsabilidad de SI-P3B2.

---

## 2. Baseline Git

| Campo | Valor |
|-------|-------|
| Branch | `develop` |
| Commit | `f55eba1bba90c82b219218a3f29638a2bf084446` |
| Mensaje del commit | `deploy: sync develop changes to staging` |

### Working tree al inicio de SI-P3B1 (scoped)

**Tracked modificados (atribuibles a agentes anteriores, no a SI-P3B1):**

```
M supabase/functions/_shared/response.ts
M supabase/functions/_shared/sal-helpers.ts
M supabase/functions/sal-activate-lock/index.ts
M supabase/functions/sal-confirm-claim-session/index.ts
M supabase/functions/sal-connect-integration/index.ts
M supabase/functions/sal-enqueue-command/index.ts
M supabase/functions/sal-execute-command/index.ts
M supabase/functions/sal-get-ble-session/index.ts
M supabase/functions/sal-offboard-lock/index.ts
M supabase/functions/sal-open-claim-session/index.ts
M supabase/functions/sal-quarantine-lock/index.ts
M supabase/functions/sal-register-paired-lock/index.ts
M docs/smart-incidents/rules/rules-01-document-authoring-standard.md
M package.json (1 línea SI-P3A + 71 líneas SmartConversations agent)
```

**Untracked relevantes (`??`):**

```
?? docs/smart-incidents/contracts/
?? docs/smart-incidents/integration/
?? docs/smart-incidents/rules/
?? supabase/functions/_shared/smart-conversations/
?? supabase/functions/_shared/smart-incidents/
?? tests/regression/
```

**Confirmación:** SI-P3B1 no modifica ningún fichero tracked. Solo crea `docs/smart-incidents/integration/incident-provider-si-p3b1-auth-decision.md`.

---

## 3. Fuentes consultadas

### Smart Incidents (provider)

| Archivo | Estado |
|---------|--------|
| `docs/smart-incidents/rules/rules-00-scope-and-principles.md` | Leído |
| `docs/smart-incidents/rules/rules-10-addon-entitlement.md` | Leído |
| `docs/smart-incidents/rules/rules-30-incident-creation.md` | Leído |
| `docs/smart-incidents/rules/rules-80-security-and-tenancy.md` | Leído |
| `docs/smart-incidents/contracts/contract-create-incident-request.md` | Leído |
| `supabase/functions/_shared/smart-incidents/types.ts` | Leído |
| `supabase/functions/_shared/smart-incidents/errors.ts` | Leído |
| `supabase/functions/_shared/smart-incidents/validator.ts` | Leído |
| `supabase/functions/_shared/smart-incidents/port.ts` | Leído |

### SmartConversations (consumer)

| Archivo | Estado |
|---------|--------|
| `supabase/functions/_shared/smart-conversations/incidents-integration-port.ts` | Leído |
| `supabase/functions/_shared/smart-conversations/adapters/incidents-addon-adapter.ts` | Leído |
| `supabase/functions/conv-core-create-incident/index.ts` | Leído |
| `supabase/functions/_shared/smart-conversations/ef-auth.ts` | Leído |
| `supabase/functions/_shared/smart-conversations/runtime/env-config.ts` | Leído |
| `supabase/functions/_shared/smart-conversations/runtime/constant-time.ts` | Leído — auditoría constant-time |
| `docs/smart-conversations/integrations/addons-authentication-model.md` | Leído |
| `supabase/functions/deno.json` | Leído — auditoría constant-time |

---

## 4. Patrones service-to-service encontrados

### Patrón A — Bearer interno EF-a-EF (SmartConversations)

**Ficheros:** 17 EFs `conv-*`.

**Mecanismo:** Bearer + `SUPABASE_SERVICE_ROLE_KEY` + helper `constant-time.ts`.

**Aplicabilidad para SI:** NO APLICA. `SUPABASE_SERVICE_ROLE_KEY` no puede compartirse como credencial entre módulos. Prohibición explícita en `addons-authentication-model.md §3` y `rules-80 §4.5`.

---

### Patrón B — Bearer dedicado por add-on (SmartConversations → provider externo)

**Ficheros:** `incidents-addon-adapter.ts`, `addons-authentication-model.md`.

**Mecanismo (consumer side — ya implementado):**

```typescript
// incidents-addon-adapter.ts
const resp = await fetchImpl(`${baseUrl}/incidents`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,   // INCIDENTS_ADDON_SERVICE_TOKEN
    'Idempotency-Key': cmd.idempotency_key,
    'X-Correlation-Id': cmd.correlation_id,
    'X-Source': 'smart_conversations',
  },
  body: JSON.stringify(providerPayload),
  signal: AbortSignal.timeout(policy.timeout_ms),
});
```

**Aplicabilidad para SI:** SÍ. Es el patrón ya implementado por el consumer.

---

### Patrón C — HMAC por petición webhook (Wasender → SmartConversations)

**Fichero:** `conv-wa-webhook/index.ts`.

**Aplicabilidad para SI:** NO APLICA. Es para webhooks entrantes de terceros. No es un patrón S2S entre módulos propios.

---

### Patrón D — JWT sesión WebChat (usuario final → EF)

**Aplicabilidad para SI:** NO APLICA. Autenticación de usuario final.

---

## 5. Estado del consumer actual

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Envío de `Authorization: Bearer` | `IMPLEMENTED` | `incidents-addon-adapter.ts` |
| Variable `INCIDENTS_ADDON_SERVICE_TOKEN` | `IMPLEMENTED` (código) · `INCIDENTS_DEV_CONFIGURATION_PENDING` (valor) | Consumer listo; secreto no provisionado |
| Envío de `Idempotency-Key` | `IMPLEMENTED` | Header refleja `cmd.idempotency_key` derivado por HMAC |
| Envío de `X-Correlation-Id` | `IMPLEMENTED` | Header refleja `cmd.correlation_id` |
| Envío de `X-Source` | `IMPLEMENTED` | Literal `"smart_conversations"` |
| Soporte rotación del secreto | `ABSENT` | No hay procedimiento definido en el consumer |
| Cambio de label `other → Otra incidencia` | `PENDING` | Cambio contractual pendiente — no es autenticación |
| Correcciones de snapshot | `PENDING` | Placement incorrecto registrado — no es autenticación |

---

## 6. Estado del provider actual

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Auth port interface | `AUTH_PORT_INTERFACE_ONLY` | `port.ts` — `IncidentCallerAuthPort` |
| Auth implementation | `ABSENT` | Sin adapter, sin verificación |
| Mecanismo constant-time | `ABSENT` en SI | `constant-time.ts` existe en SC namespace, no en SI |
| Error AUTHENTICATION_REQUIRED | `IMPLEMENTED` (contrato) | `errors.ts` — HTTP 401 |
| Error CALLER_NOT_AUTHORIZED | `IMPLEMENTED` (contrato) | `errors.ts` — HTTP 403 |
| Error FEATURE_DISABLED | `IMPLEMENTED` (contrato) | `errors.ts` — HTTP 403 |
| Error INTERNAL_ERROR | `IMPLEMENTED` (contrato) | `errors.ts` — HTTP 500 |
| Entitlement check | `ABSENT` | Sin implementación |
| Validación de dominio | `ABSENT` | Sin implementación |

---

## 7. Separación estricta de capas

Las cinco capas son independientes. Ninguna implica a las demás. Cada capa falla de forma autónoma.

### Capa 1 — Autenticación técnica

**Pregunta:** ¿El caller posee la credencial correcta?

**Mecanismo:** El provider verifica el Bearer token con comparación constant-time.

**Resultado si pasa:** El caller queda identificado como `smart_conversations`.

**Resultado si falla:** `AUTHENTICATION_REQUIRED` (401). El flujo se detiene.

**Importante:** Superar la autenticación no concede autorización, no garantiza entitlement, no valida recursos.

---

### Capa 2 — Autorización de la operación

**Pregunta:** ¿Tiene el caller permiso para la operación `create_incident`?

**Modelo V1:**

```text
CALLER_GLOBAL_AUTHORIZED_FOR_CREATE_INCIDENT
```

Este modelo establece que:
- La credencial identifica únicamente a `smart_conversations`
- Autoriza únicamente la operación `create_incident`
- Permite declarar cualquier `client_account_id` (alcance global, Capa 3)
- No implica que el tenant tenga entitlement activo
- No implica que requester o recursos pertenezcan al tenant
- No autoriza ninguna otra operación futura por defecto

Si en el futuro el provider expone más operaciones (ej. `update_incident`, `close_incident`), cada una requerirá su propia autorización explícita. La credencial actual no las cubre.

**Resultado si falla:** `CALLER_NOT_AUTHORIZED` (403).

---

### Capa 3 — Alcance tenant de la autorización

**Pregunta:** ¿Puede el caller declarar ese `client_account_id`?

**Modelo V1:**

```text
CALLER_IDENTITY = smart_conversations
AUTHORIZED_OPERATION = create_incident
AUTHORIZED_TENANT_SCOPE = global
```

La política de autorización concede explícitamente alcance global al caller:
- El caller puede solicitar operaciones para cualquier `client_account_id`
- El alcance global es una decisión explícita de la política de autorización — no es una consecuencia del entitlement
- El entitlement no concede ni restringe el alcance del caller
- El entitlement comprueba únicamente si el add-on está activo para ese tenant (Capa 4 — independiente)
- El dominio comprueba independientemente la pertenencia de requester, accommodation y room (Capa 5 — independiente)

El `client_account_id` del payload es declarado por el caller y **no es confiable por sí solo**. El provider verifica el entitlement de ese tenant de forma independiente a la autorización del caller.

**Resultado si el alcance no cubre al tenant (futuro):** `CALLER_NOT_AUTHORIZED` (403).

---

### Capa 4 — Entitlement `smart_incidents`

**Pregunta:** ¿Tiene ese `client_account` el add-on `smart_incidents` activo?

**Mecanismo (SI-P4):** Query a `saas_service_subscriptions` WHERE `client_account_id = ? AND code = 'smart_incidents' AND status = 'active'`.

**Resultado si falla:** `FEATURE_DISABLED` (403).

Esta capa es completamente independiente de la autenticación y de la autorización del caller. El entitlement no amplia ni restringe el alcance del caller — responde solo a si el tenant tiene el add-on activo. Un caller autenticado, autorizado con alcance global, puede obtener `FEATURE_DISABLED` si el tenant no tiene el add-on activo.

---

### Capa 5 — Integridad de dominio

**Pregunta:** ¿Pertenecen `requester_profile_id`, `accommodation_id` y `room_id` al tenant declarado?

**Mecanismo (SI-P4):** Queries al Core. Fail-closed y opaco ante discrepancias.

**Resultado si falla:** `REQUESTER_NOT_ALLOWED` (403) o `RESOURCE_NOT_FOUND` (404) — sin revelar existencia de recursos de otros tenants.

---

## 8. Patrón de autenticación recomendado

```text
RECOMMENDED_AUTH_PATTERN: DEDICATED_OPAQUE_BEARER_CAPABILITY_PER_ENVIRONMENT
```

### Definición

Una **capability credential** es un Bearer token opaco que:

- identifica técnicamente a `smart_conversations`;
- autoriza **únicamente** la operación `create_incident` en el provider Smart Incidents;
- es exclusivo para la dirección SmartConversations → Smart Incidents;
- no autoriza ninguna otra operación por defecto;
- no es una service_role key ni un JWT.

### Requisitos del token

| Requisito | Especificación |
|-----------|---------------|
| Generación | Criptográficamente aleatoria (ej. `openssl rand -base64 32` o equivalente) |
| Entropía mínima | **256 bits** |
| Generación manual | **Prohibida** — no puede ser una contraseña elegida por un humano |
| Exclusividad de módulo | Exclusivo para SmartConversations → Smart Incidents |
| Exclusividad de operación | Exclusivo para `create_incident` — no reutilizar si se crean otras operaciones |
| Separación por entorno | Distinto en local, DEV, staging y production |
| Reutilización en otros módulos | **Prohibida** |
| Uso como service_role | **Prohibido** |
| Envío al navegador | **Prohibido** |
| Envío a n8n | **Prohibido** |
| Almacenamiento | Supabase secrets únicamente — nunca en repositorio, payload, logs o variables frontend |

### Justificación frente a las otras opciones

**Frente a JWT:** No existe infraestructura de emisión JWT en el repo. La expiración corta del JWT añade complejidad operativa sin beneficio proporcional en este contexto EF-a-EF. La exclusividad de operación que JWT ofrecería mediante claims se obtiene aquí por diseño (la credential ya es exclusiva de `create_incident`).

**Frente a HMAC por petición:** La canonicalización del body es frágil ante evoluciones del contrato. Mayor complejidad sin beneficio claro para S2S interno.

**Condición de revisión:** Si el provider se expone a múltiples callers o externamente, se deberá reconsiderar JWT u otro modelo con claims explícitos.

---

## 9. Audience operacional V1

```text
AUDIENCE_OPERATIONALLY_ENFORCED
NOT_A_JWT_CLAIM
```

La audience es operacional, no criptográfica (el token no es JWT). La restricción se establece por diseño:

| Restricción | Definición |
|-------------|------------|
| Provider aceptante | Únicamente el provider Smart Incidents |
| Endpoint aceptante | Únicamente el endpoint de creación (`inc-create-incident`) |
| Source system | Únicamente `source_system = smart_conversations` en el body |
| Operación | Únicamente `create_incident` |

El provider **no debe** reutilizar este token para autenticar otras operaciones futuras. Si se crean nuevas operaciones, requerirán sus propias credenciales.

---

## 10. Expiración y rotación

### Expiración

El token no tiene expiración intrínseca (no es JWT). La expiración es operacional y se gestiona mediante variables de fecha límite.

El contrato exige expiración y rotación. La **política de frecuencia es una decisión operativa pendiente** — no se establece ningún valor canónico en este documento. Sin embargo, la **fecha de expiración técnica es obligatoria** para CURRENT y PREVIOUS.

**Regla de expiración de CURRENT:** Si `CURRENT_VALID_UNTIL` está ausente, vacía o mal formada → fail closed → `INTERNAL_ERROR` (500). Si el token presentado coincide con CURRENT pero `CURRENT_VALID_UNTIL` ha pasado → `AUTHENTICATION_REQUIRED` (401). CURRENT no puede mantenerse válido indefinidamente.

**Regla de expiración de PREVIOUS:** Una vez superada `PREVIOUS_VALID_UNTIL`, cualquier request con el token anterior produce `AUTHENTICATION_REQUIRED` (401), independientemente de si el token es criptográficamente correcto. PREVIOUS es opcional — solo existe durante la ventana de rotación.

---

### Variables conceptuales de rotación (provider)

```text
INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT
INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL
INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS
INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS_VALID_UNTIL
```

Estas variables son **conceptuales** — no se crean en este lote. Se definen aquí para que SI-P3B2 las implemente con la semántica correcta.

| Variable | Propósito | Obligatoria |
|----------|-----------|------------|
| `INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT` | Token activo que el provider acepta | Sí |
| `INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL` | Timestamp ISO 8601 — fecha de expiración de CURRENT | Sí — ausente o mal formada → INTERNAL_ERROR |
| `INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS` | Token anterior — aceptado solo durante la ventana de rotación | No — solo existe durante rotación |
| `INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS_VALID_UNTIL` | Timestamp ISO 8601 — fecha límite del token anterior | Solo si PREVIOUS está presente |

**Comportamiento del provider:**
1. CURRENT ausente o sin `CURRENT_VALID_UNTIL` válida → `INTERNAL_ERROR` (500, fail closed)
2. Token presenta y coincide con CURRENT, pero `CURRENT_VALID_UNTIL` superada → `AUTHENTICATION_REQUIRED` (401)
3. Token coincide con CURRENT y no expirado → autenticado
4. PREVIOUS ausente o vacío → CURRENT es el único token aceptado
5. PREVIOUS presente y `PREVIOUS_VALID_UNTIL` no superado → se acepta CURRENT o PREVIOUS
6. PREVIOUS presente y `PREVIOUS_VALID_UNTIL` superado → solo se acepta CURRENT; PREVIOUS produce `AUTHENTICATION_REQUIRED`

---

### Variable consumer

```text
INCIDENTS_ADDON_SERVICE_TOKEN
```

Contiene el token actual. Durante la rotación, el consumer actualiza esta variable al nuevo token y hace deploy. El provider acepta ambos durante la ventana de transición.

---

### Proceso de rotación sin downtime

Antes de que CURRENT expire:

1. CURRENT pasa a PREVIOUS; se configura su `PREVIOUS_VALID_UNTIL` con una ventana limitada
2. Se genera un nuevo token CURRENT con 256 bits de entropía criptográfica
3. Se fija el nuevo `CURRENT_VALID_UNTIL`
4. SmartConversations actualiza `INCIDENTS_ADDON_SERVICE_TOKEN` con el nuevo CURRENT y hace deploy
5. PREVIOUS se elimina (o se vacía) tras superar `PREVIOUS_VALID_UNTIL`

**Rotación de emergencia ante compromiso:** inmediata. Se vacía PREVIOUS o se establece `PREVIOUS_VALID_UNTIL` en el pasado. Se genera nuevo CURRENT inmediatamente. No hay ventana de gracia.

---

## 11. Mecanismo constant-time — Auditoría de compatibilidad Deno

### `deno.json` analizado

```json
{
  "compilerOptions": { "lib": ["deno.window"], "strict": true },
  "imports": {
    "https://deno.land/std@0.168.0/http/server.ts": "...",
    "https://esm.sh/@supabase/supabase-js@2.39.0": "..."
  }
}
```

Observaciones del `deno.json` global:
- `lib: ["deno.window"]` — incluye Web Crypto API estándar (`crypto.subtle.digest`)
- No hay entradas `jsr:` en el import map global
- No hay entradas `node:` en ningún fichero del proyecto (búsqueda exhaustiva: 0 resultados)
- `deno.land/std@0.168.0` — versión de 2022; no tiene `@std/crypto` en JSR (JSR es posterior)
- Lockfile (`deno.lock`): ausente en el repositorio

**Evidencia JSR adicional auditada:**

`supabase/functions/scan_energy_bill/index.ts` usa specifiers `jsr:` directos sin entrada en el import map global:
```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
```

Esto confirma que el runtime de Supabase Edge Functions de este proyecto **acepta specifiers `jsr:` directos** en el código fuente.

---

### Alternativa A — `node:crypto`

**Compatibilidad:** `SELECTED`

**Contradicción detectada y resuelta en SI-P3B2A:** `jsr:@std/crypto/timing-safe-equal` (Alternativa B) no puede resolverse en Vitest 2.1.9 (entorno Node.js). El resolutor de módulos de Node.js no reconoce el especificador `jsr:`. La incompatibilidad se descubrió durante la implementación offline del módulo de autenticación (`constant-time.ts` + `si-p3b2a-auth.spec.ts`).

**Fundamento de selección de `node:crypto`:**
- Disponible en Node.js nativo → Vitest resuelve el import sin configuración adicional
- Disponible en Deno 1.25+ mediante capa de compatibilidad Node.js → Supabase EFs (Deno ≥ 1.38) resuelven el import
- `timingSafeEqual(a: ArrayBufferView, b: ArrayBufferView): boolean` — síncrona, requiere arrays de igual longitud

**Import implementado en `constant-time.ts`:**
```typescript
import { timingSafeEqual } from "node:crypto";
```

**Verificación de runtime:** La suite `si-p3b2a-auth.spec.ts` importa `constant-time.ts` mediante Vitest 2.1.9 (Node.js); **71/71 tests pasan**. Ningún test usa `jsr:`.

---

### Alternativa B — `@std/crypto/timing-safe-equal` (JSR)

**Compatibilidad:** `NOT_SELECTED_VITEST_INCOMPATIBLE`

Alternativa originalmente seleccionada basándose en la evidencia de `scan_energy_bill/index.ts`. La evidencia confirmaba que el runtime de Supabase EF acepta `jsr:` specifiers directos. Sin embargo, la incompatibilidad con Vitest 2.1.9 (Node.js) fue detectada en SI-P3B2A:

- Vitest corre en Node.js, que no reconoce el esquema `jsr:` nativamente
- No existe plugin JSR para Vite/Vitest en este proyecto
- La incompatibilidad produce error de módulo no encontrado al importar desde la suite de tests
- Regla aplicada: no simular el módulo con implementación insegura; no degradar silenciosamente a comparación de strings

El import `jsr:@std/crypto/timing-safe-equal` sigue siendo válido para el runtime Deno/EF, pero no para el entorno de tests. Dado que el módulo debe verificarse en tests offline, se selecciona Alternativa A (`node:crypto`), que funciona en ambos entornos.

---

### Diseño de comparación implementado

1. Codificar ambos tokens como bytes con `TextEncoder`
2. Calcular SHA-256 de cada token con `crypto.subtle.digest("SHA-256", bytes)` — método estándar de Web Crypto API, disponible en `lib: ["deno.window"]`
3. Obtener dos digests de exactamente 32 bytes
4. Comparar los digests con `timingSafeEqual` de `node:crypto` (disponible en Node.js y Deno 1.25+)
5. No comparar los strings originales directamente
6. No realizar early return por diferencia de longitud del token original (los digests siempre tienen 32 bytes)
7. No registrar tokens ni sus digests

**Nota:** `crypto.subtle.digest` (hash) sí es un método estándar de Web Crypto API. `crypto.subtle.timingSafeEqual` no lo es — esta distinción es la razón por la que la comparación usa una librería externa.

```text
CONSTANT_TIME_MECHANISM_SELECTED
ALTERNATIVA: A (node:crypto)
IMPORT: node:crypto (timingSafeEqual)
CONTRADICCION_RESUELTA: jsr:@std/crypto/timing-safe-equal incompatible con Vitest 2.1.9 (Node.js)
FALLBACK_VERIFICADO: node:crypto — disponible en Node.js nativo + Deno 1.25+
VERIFICACION_OFFLINE: si-p3b2a-auth.spec.ts — 71/71 tests pasan
```

---

## 12. Endpoint futuro — Especificación

**Nombre Edge Function:** `inc-create-incident`

| Atributo | Valor |
|----------|-------|
| Método aceptado | `POST` |
| `Content-Type` entrada | `application/json` |
| Tamaño máximo del body | 64 KB — rechazar antes de parse |
| `Content-Type` salida | `application/json` |

---

### Orden de validación

```
 1. Método HTTP
    POST → continuar
    Otros → 405 (no revelar detalles del endpoint)

 2. Tamaño del body antes de parse
    > 64 KB → 400 VALIDATION_ERROR

 3. Parse JSON
    Body no válido → 400 VALIDATION_ERROR

 4. Extracción segura y no confiable de request_id y correlation_id
    Si presentes y parecen UUIDs: usar como referencia de trazabilidad en logs internos
    Si ausentes: generar server-side un identificador de trazabilidad seguro (UUID v4)
    No validar exhaustivamente en este paso — la validación contractual completa es posterior (paso 7)

 5. Autenticación
    Extraer Bearer token del header Authorization
    Ausente → 401 AUTHENTICATION_REQUIRED
    Esquema distinto de Bearer → 401 AUTHENTICATION_REQUIRED
    Token vacío tras "Bearer " → 401 AUTHENTICATION_REQUIRED
    INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT o CURRENT_VALID_UNTIL ausentes o inválidos → 500 INTERNAL_ERROR (fail closed)
    Token coincide con CURRENT pero CURRENT_VALID_UNTIL superada → 401 AUTHENTICATION_REQUIRED
    Token incorrecto en constant-time → 401 AUTHENTICATION_REQUIRED
    Token coincide con PREVIOUS pero PREVIOUS_VALID_UNTIL superada → 401 AUTHENTICATION_REQUIRED

 6. Autorización de la operación
    Verificar que el caller tiene permiso para create_incident
    V1: CALLER_GLOBAL_AUTHORIZED_FOR_CREATE_INCIDENT — siempre pasa si auth es correcta
    Futuro: si se añaden restricciones → 403 CALLER_NOT_AUTHORIZED

 7. Validación contractual completa
    validateCreateIncidentRequest(payload) de SI-P3A
    Incluye contract_version, IDs, source_system, campos, PII de título, HTML, etc.
    Si falla → 400 / 422 con código canónico

 8. Comprobación de consistencia headers–body
    Idempotency-Key vs. body.idempotency_key (ver §13)
    X-Correlation-Id vs. body.correlation_id (ver §13)
    X-Source vs. literal "smart_conversations" (ver §13)
    Mismatch → 400 VALIDATION_ERROR

 9. Entitlement (SI-P4)
    smart_incidents activo para client_account_id → continuar
    Inactivo → 403 FEATURE_DISABLED

10. Validación de dominio (SI-P4)
    requester_profile_id, accommodation_id, room_id
    Fallo → REQUESTER_NOT_ALLOWED o RESOURCE_NOT_FOUND (opaco)

11. Idempotencia durable y persistencia (SI-P5)
```

**Nota sobre `contract_version`:** No se valida en detalle antes de la autenticación. La comprobación ocurre en el paso 7 (validación contractual completa). Los errores de versión de contrato no se exponen a callers no autenticados.

**Identificador de trazabilidad server-side:** Ante ausencia de `request_id` o `correlation_id` válidos en el paso 4, el provider genera un UUID seguro propio para la trazabilidad interna. Este UUID no se expone en la respuesta de error cuando el error se produce antes de la validación contractual.

---

## 13. Reconciliación headers–body

El body contractual es la **fuente canónica**. Los headers son espejo de compatibilidad.

### `Idempotency-Key` vs. `body.idempotency_key`

- La fuente de idempotencia que el provider usa internamente es **`body.idempotency_key`**
- Si el header `Idempotency-Key` está presente, **debe coincidir exactamente** con `body.idempotency_key`
- Mismatch → `VALIDATION_ERROR` (paso 8)
- El header es espejo de compatibilidad — si se exige, debe ser coherente con el body
- No incluir ninguno de los valores en la respuesta ni en los logs

### `X-Correlation-Id` vs. `body.correlation_id`

- Si el header `X-Correlation-Id` está presente, **debe coincidir exactamente** con `body.correlation_id`
- Mismatch → `VALIDATION_ERROR` (paso 8)
- El body sigue siendo canónico
- No incluir el valor en respuestas de error ni en logs generales

### `X-Source`

- Es informativo. **No autentica al caller** — la autenticación depende únicamente del Bearer token
- Si el provider valida este header, debe ser exactamente `"smart_conversations"`
- Si el valor es incorrecto → `VALIDATION_ERROR` (paso 8) — la solicitud completa se rechaza aunque la autenticación haya sido exitosa
- Si está ausente → la decisión sobre si es obligatorio u opcional queda pendiente de definición documental; en cualquier caso, el provider aplica la política consistentemente
- Un `X-Source` correcto **no compensa** un Bearer token inválido o ausente
- Un Bearer token válido **no compensa** un `X-Source` incorrecto — la autenticación y la validación de headers son comprobaciones independientes en el flujo

---

## 14. CORS y OPTIONS

```text
BROWSER_INVOCATION_PROHIBITED
CORS_NOT_AN_AUTHORIZATION_BOUNDARY
```

### Definición

El endpoint `inc-create-incident` es **exclusivamente B2B**. No está diseñado para ser invocado desde un navegador.

- **CORS no es un mecanismo de seguridad** para este endpoint. La autenticación Bearer es la única frontera de seguridad de caller.
- Aunque existieran headers CORS configurados, la autenticación Bearer seguiría siendo obligatoria.
- No utilizar la URL del proyecto Supabase de SmartConversations como `Access-Control-Allow-Origin` — la URL del proyecto no es una identidad de caller verificable.

### Comportamiento OPTIONS

```text
OPTIONS_BEHAVIOR_PENDING_VERIFICATION
```

Las EFs de Supabase gestionan el ciclo de vida HTTP directamente en la función. El comportamiento correcto de OPTIONS depende de si el endpoint vive en el mismo proyecto Supabase que el consumer (mismo origen → CORS irrelevante) o en un proyecto distinto.

Opciones según convención de EFs de Supabase:
- Si la infraestructura requiere que OPTIONS retorne 2xx → responder **204** con headers CORS restrictivos
- Si el endpoint es EF-a-EF en el mismo proyecto → **405** es semánticamente correcto

Decisión final: verificar la convención de las EFs existentes del proyecto antes de SI-P3B2.

### Regla sobre `Access-Control-Allow-Origin`

No incluir `Access-Control-Allow-Origin` salvo que exista una necesidad técnica real y documentada. Si es necesario por infraestructura, usar el origen más restrictivo posible — nunca `*`.

---

## 15. Errores — Mapeo completo

### Tabla canónica

| Caso | Código | HTTP |
|------|--------|------|
| Header `Authorization` ausente | `AUTHENTICATION_REQUIRED` | 401 |
| Esquema distinto de `Bearer` | `AUTHENTICATION_REQUIRED` | 401 |
| Token vacío tras `Bearer ` | `AUTHENTICATION_REQUIRED` | 401 |
| Token incorrecto (constant-time falla) | `AUTHENTICATION_REQUIRED` | 401 |
| Token CURRENT expirado (`CURRENT_VALID_UNTIL` superada) | `AUTHENTICATION_REQUIRED` | 401 |
| Token PREVIOUS expirado (`PREVIOUS_VALID_UNTIL` superada) | `AUTHENTICATION_REQUIRED` | 401 |
| Caller autenticado sin permiso de operación | `CALLER_NOT_AUTHORIZED` | 403 |
| Caller autenticado fuera de su alcance tenant (futuro) | `CALLER_NOT_AUTHORIZED` | 403 |
| Entitlement inactivo para el tenant | `FEATURE_DISABLED` | 403 |
| Configuración del secreto provider ausente o inválida | `INTERNAL_ERROR` | 500 |

### Tratamiento de `INTERNAL_ERROR` por secreto ausente

```text
FAIL_CLOSED
```

Si `INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT` no está configurado en el entorno del provider:

- **El endpoint falla cerrado** — no procesa ninguna request
- **Log interno allowlisted:** registra el código de error indicando que la configuración está ausente — no el nombre de la variable ni su valor
- **Respuesta al caller:** `INTERNAL_ERROR` (500) — no indica qué variable falta
- **No devuelve 401** — un error de configuración interna no puede confundirse con un token incorrecto del caller

### Principio de opacidad en 401

El token ausente, el esquema incorrecto, el token vacío, el token inválido y el token expirado producen **el mismo código y mensaje externo** (`AUTHENTICATION_REQUIRED`) para no revelar el estado del secreto al caller.

### Formato de todos los errores

```json
{
  "error_code": "AUTHENTICATION_REQUIRED",
  "message": "Autenticación requerida",
  "request_id": "<uuid-server-generado-si-no-había-uno-válido>",
  "retryable": false
}
```

No incluir: stack, token, claims, SQL, información del tenant, nombre de variables de entorno.

---

## 16. Secrets y entornos

### Variables autorizadas en SI-P3B2

| Variable | Descripción |
|----------|-------------|
| `INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT` | Token activo verificado por el provider |
| `INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT_VALID_UNTIL` | Timestamp ISO 8601 — expiración del token CURRENT (obligatoria; ausente → INTERNAL_ERROR) |
| `INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS` | Token anterior (solo durante ventana de rotación) |
| `INCIDENTS_PROVIDER_SERVICE_TOKEN_PREVIOUS_VALID_UNTIL` | Timestamp ISO 8601 — límite de validez del token anterior |
| `APP_ENVIRONMENT` | Entorno activo — logs y comportamiento fail-closed |

### Variables expresamente fuera de SI-P3B2

| Variable | Razón de exclusión | Lote correcto |
|----------|--------------------|---------------|
| `SUPABASE_SERVICE_ROLE_KEY` | No necesaria para autenticar, autorizar caller, validar el contrato ni devolver el resultado provisional del endpoint | SI-P5 (persistencia interna `inc_*`, solo si la arquitectura la necesita) · SI-P6B (publicación a `audit_log`) |
| `SUPABASE_URL` | No hay uso concreto demostrado dentro del scope de SI-P3B2; no se incluyen variables preventivamente | SI-P5 o posterior si se demuestra necesidad |

`SUPABASE_SERVICE_ROLE_KEY` no debe introducirse ni leerse en la EF `inc-create-incident` durante SI-P3B2.

### Separación por entorno

| Entorno | Responsable de provisionar | Responsable de configurar en SC |
|---------|---------------------------|--------------------------------|
| DEV | Smart Incidents | SmartConversations |
| Staging | Smart Incidents | SmartConversations |
| Production | Smart Incidents | SmartConversations |

Los valores deben ser distintos en cada entorno. Nunca reutilizar el token de DEV en staging ni el de staging en production.

---

## 17. Riesgos

| ID | Riesgo | Severidad | Mitigación |
|----|--------|-----------|------------|
| R-01 | Token filtrado en logs | Alta | Lista allowlisted estricta (rules-80 §4.8); token prohibido |
| R-02 | Token sin expiración automática | Media | Ventana de rotación con `PREVIOUS_VALID_UNTIL`; rotación inmediata ante compromiso |
| R-03 | Timing attack en comparación | Media | Constant-time mediante `node:crypto.timingSafeEqual` sobre digests SHA-256 (`CONSTANT_TIME_MECHANISM_SELECTED`; `jsr:@std/crypto` descartado — incompatible con Vitest) |
| R-04 | Token reutilizado entre entornos | Alta | Procedimiento formal + ownership por entorno |
| R-05 | n8n con acceso al token o URL del provider | Alta | n8n no conoce la URL del provider; token solo en Supabase secrets |
| R-06 | Token hardcoded en repositorio | Crítica | Prohibición absoluta — Supabase secrets únicamente |
| R-07 | DoS con payloads grandes | Media | Límite de tamaño pre-parse (64 KB) |
| R-08 | Enumeración de tenants por diferencia de respuesta | Media | FEATURE_DISABLED opaco |
| R-09 | Token generado manualmente con baja entropía | Alta | Generación criptográfica obligatoria — mínimo 256 bits |
| R-10 | Credencial reutilizada para otras operaciones futuras | Alta | Credencial exclusiva para `create_incident` por diseño y convención |
| R-11 | Import `jsr:@std/crypto/timing-safe-equal` incompatible con Vitest (Node.js) | **Realizado** | Incompatibilidad detectada en SI-P3B2A — resuelto usando `node:crypto` (Alternativa A) |
| R-12 | `SUPABASE_SERVICE_ROLE_KEY` introducida prematuramente en SI-P3B2 | Media | Explícitamente fuera de alcance hasta SI-P5 (persistencia) o SI-P6B (audit_log) |

---

## 18. Recomendación

```text
RECOMMENDED_AUTH_PATTERN_SELECTED_WITH_REQUIRED_HARDENING
PATTERN: DEDICATED_OPAQUE_BEARER_CAPABILITY_PER_ENVIRONMENT
```

### Condiciones antes de implementar SI-P3B2

```text
IMPLEMENTATION_BLOCKED_UNTIL_CONDITIONS_MET
```

| # | Condición | Estado |
|---|-----------|--------|
| 1 | Modelo caller global (`CALLER_GLOBAL_AUTHORIZED_FOR_CREATE_INCIDENT`) documentado | `DONE` |
| 2 | Operación `create_incident` explícitamente autorizada — sin generalización | `DONE` |
| 3 | Mecanismo constant-time seleccionado: `node:crypto.timingSafeEqual` sobre SHA-256 (contradicción JSR/Vitest resuelta en SI-P3B2A) | `DONE` |
| 4 | Dual-token rotation definida (`CURRENT` / `CURRENT_VALID_UNTIL` / `PREVIOUS` / `PREVIOUS_VALID_UNTIL`) | `DONE` |
| 5 | Expiración obligatoria de CURRENT definida (`CURRENT_VALID_UNTIL`; ausente → INTERNAL_ERROR) | `DONE` |
| 6 | Errores 401/403/500 correctamente mapeados (tabla §15) | `DONE` |
| 7 | Reconciliación headers–body definida (§13) | `DONE` |
| 8 | CORS no utilizado como frontera de seguridad; comportamiento OPTIONS verificado | `OPTIONS_PENDING_VERIFICATION` |
| 9 | Secreto con mínimo 256 bits de entropía, generado criptográficamente | `PENDING_PROVISIONING` |
| 10 | `SUPABASE_SERVICE_ROLE_KEY` fuera del alcance de SI-P3B2 | `DONE` |

---

## 19. Cambios requeridos en el provider (SI-P3B2)

1. Crear EF `inc-create-incident` (Deno TypeScript, `compilerOptions.strict: true`)
2. Implementar verificación dual-token: CURRENT con `CURRENT_VALID_UNTIL` + PREVIOUS con `PREVIOUS_VALID_UNTIL`
3. Implementar fail-closed si `INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT` o `CURRENT_VALID_UNTIL` no configurados o inválidos → `INTERNAL_ERROR` (500)
4. Importar `timingSafeEqual` desde `node:crypto` (disponible en Node.js y Deno 1.25+; `jsr:@std/crypto` descartado por incompatibilidad con Vitest — resuelto en SI-P3B2A)
5. Implementar adapter concreto de `IncidentCallerAuthPort`
6. Integrar validador SI-P3A (`validateCreateIncidentRequest`) en el paso 7 del flujo
7. Implementar reconciliación headers–body (paso 8)
8. Implementar logging con allowlist estricta — token nunca en logs
9. Tests de regresión: ausente → 401, esquema incorrecto → 401, inválido → 401, expirado → 401, config ausente → 500, válido → pasa a validación contractual
10. **No introducir `SUPABASE_SERVICE_ROLE_KEY`** en este lote

---

## 20. Cambios en el consumer

### Cambios de autenticación

| Cambio | Estado |
|--------|--------|
| Código de envío del Bearer token | `IMPLEMENTED` — no requiere modificación |
| Variable del secreto consumer | `INCIDENTS_ADDON_SERVICE_TOKEN` — ya establecida; no requiere renombrado |
| Provisionamiento del secreto DEV | `PENDING` — requiere valor real cuando el provider esté disponible en DEV |
| Soporte de rotación coordinada | `REQUIRES_PROCESS` — el consumer actualiza `INCIDENTS_ADDON_SERVICE_TOKEN` durante la ventana de rotación; no requiere cambio de código si ya lee desde `Deno.env` |

### Cambios contractuales pendientes (no autenticación)

Estos cambios deben resolverse antes de que la integración pueda considerarse completa en DEV. Son independientes de la autenticación.

| Cambio | Estado |
|--------|--------|
| Label `other → Otra incidencia` | `PENDING` — mismatch documentado |
| Correcciones de snapshot con placement incorrecto | `PENDING` — registradas |

---

## 21. Gaps pendientes

| ID | Gap | Responsable | Lote |
|----|-----|-------------|------|
| G-01 | `INCIDENTS_PROVIDER_SERVICE_TOKEN_CURRENT` no provisionado | Smart Incidents | SI-P3B2 |
| G-02 | `INCIDENTS_ADDON_BASE_URL` no configurado en SC DEV | Smart Incidents (provisiona endpoint) | SI-P3B2 + DEV |
| G-03 | Proceso de rotación coordinado no formalizado entre equipos | SI + SC | Previo a staging |
| G-04 | Entitlement check | Smart Incidents | SI-P4 |
| G-05 | Validación domain (requester, accommodation, room) | Smart Incidents | SI-P4 |
| G-06 | Rate limiting | Smart Incidents | Post v1.0 |
| G-07 | Mecanismo `node:crypto.timingSafeEqual` verificado en Vitest/Node.js offline; pendiente verificar en Deno EF real | Smart Incidents | SI-P3B2B (verificar en primer deploy DEV) |
| G-08 | Comportamiento OPTIONS verificado en convención EFs del proyecto | Smart Incidents | SI-P3B2 |
| G-09 | Cambios contractuales consumer (label `other`, snapshots) | SmartConversations | Previo a integración real DEV |
| G-10 | Política de frecuencia de rotación (operativa) | Smart Incidents | Previo a staging |

---

## 22. Estado final

```text
AUTH_PATTERN_AUDITED
RECOMMENDED_AUTH_PATTERN_SELECTED_WITH_REQUIRED_HARDENING
PATTERN: DEDICATED_OPAQUE_BEARER_CAPABILITY_PER_ENVIRONMENT
AUTHORIZATION_MODEL: CALLER_GLOBAL_AUTHORIZED_FOR_CREATE_INCIDENT
AUDIENCE: AUDIENCE_OPERATIONALLY_ENFORCED / NOT_A_JWT_CLAIM
CONSTANT_TIME_MECHANISM_SELECTED: node:crypto.timingSafeEqual + SHA-256
JSR_VITEST_CONTRADICTION_RESOLVED: jsr:@std/crypto/timing-safe-equal incompatible con Vitest 2.1.9; fallback node:crypto verificado en 71/71 tests
OPTIONS_BEHAVIOR_PENDING_VERIFICATION
PROVIDER_AUTH_MODULE_OFFLINE_IMPLEMENTED: SI-P3B2A (constant-time.ts + auth-config.ts + auth-adapter.ts; 71 tests)
PROVIDER_AUTH_ENDPOINT_PENDING: SI-P3B2B
CONSUMER_AUTH_CHANGE_REQUIRED: NONE (código) / PENDING (provisionamiento)
CONSUMER_CONTRACTUAL_CHANGES_PENDING: label other, snapshots
DEV_VERIFICATION_PENDING: condicionado a provisión de secreto y endpoint DEV
```

**No se declara:**
- Autenticación implementada
- Endpoint creado
- Secreto configurado
- Deploy realizado

---

## Notas de control de cambios

Este documento es propiedad del dominio Smart Incidents.

Cualquier cambio en el mecanismo recomendado requiere actualización de este documento y coordinación con SmartConversations si afecta al consumer. Decisión formal antes de implementar SI-P3B2.
