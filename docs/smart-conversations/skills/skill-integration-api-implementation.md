# Skill — Implementación de la Integration API (EFs `conv-core-*`)

## 1. Objetivo

Este skill explica cómo implementar las Edge Functions `conv-core-*` que forman la Integration API entre SmartConversations y SmartRoom Core. Cubre la estructura interna de cada EF, la autenticación con `service_role`, el tratamiento de errores HTTP del Core, el versionado de contratos y la implementación de `conv-core-publish-activity` como operación fire-and-log.

## 2. Cuándo usar este skill

Usar este skill cuando se necesite:

- implementar una nueva EF `conv-core-*`
- revisar el tratamiento de errores de una EF existente
- implementar `conv-core-publish-activity`
- entender cómo autenticar las llamadas al Core desde el add-on
- revisar el versionado de los contratos de Integration API

## 3. Preconditions

Antes de usar este skill, leer:

- `rules-70-integration-api.md` — fuente de verdad de toda la Integration API y el catálogo de EFs
- `rules-90-observability-and-failure-handling.md` — tratamiento de errores y reconciliación
- `contract-canonical-response.md` — cómo los errores de Core se traducen en `CanonicalResponse`

## 4. Restricciones de origen

Este skill respeta las siguientes decisiones cerradas en las rules:

- Las EFs `conv-core-*` son el único mecanismo de comunicación entre el add-on y SmartRoom Core. No hay acceso directo a la base de datos del Core desde el add-on.
- n8n no puede llamar directamente a las APIs del Core. Siempre a través de EFs.
- `conv-core-publish-activity` es fire-and-log: no se reintenta si falla y se llama solo después de que la operación principal haya tenido éxito.
- Las EFs usan `service_role` para autenticar sus llamadas. Los workflows de n8n usan el `service_role` key para llamar a las EFs `conv-core-*` de Integration API. El `session_token` del widget nunca se pasa a las EFs de Integration API.
- La Integration API no expone endpoints para leer texto de mensajes, `profile_id`, `phone_number` ni ningún campo de PII a SmartRoom Core.

## 5. Estrategia de implementación

Cada EF `conv-core-*` tiene una estructura en tres capas:

1. **Capa de autenticación** — en las EFs `conv-core-*` valida exclusivamente `service_role`. Los JWT de usuario solo aplican a EFs públicas del add-on (`conv-web-session`, `conv-web-message`).
2. **Capa de negocio** — ejecuta la operación en SmartRoom Core y aplica el tratamiento de errores descrito en `rules-70-integration-api.md`.
3. **Capa de publicación de actividad** — llama a `conv-core-publish-activity` **después** de que la operación principal haya tenido éxito.

## 6. Pasos recomendados

### Paso 1 — Autenticación por capas: tres flujos distintos

Hay tres flujos de autenticación independientes que no deben mezclarse:

**Capa A — Widget/usuario → EFs públicas del add-on** (`conv-web-session`, `conv-web-message`):

El widget envía el `session_token` (JWT emitido por `conv-web-session`) en el header `Authorization`. Estas EFs validan ese token antes de procesar la petición. El `session_token` es un JWT propio del add-on (no el JWT de Supabase Auth del usuario), firmado con una clave secreta del add-on, y contiene solo `{ session_id, client_account_id }`.

```typescript
// conv-web-message verifica el session_token del widget
const token = req.headers.get('Authorization')?.replace('Bearer ', '');
const session = await verifyAddOnSessionToken(token); // clave propia del add-on
if (!session) return json({ error: 'unauthorized' }, 401);
```

**Capa B — n8n → EFs `conv-core-*` de Integration API**:

n8n llama a las EFs `conv-core-*` usando el `service_role` key de Supabase, configurado como credencial en n8n (no en el payload). Las EFs rechazan con HTTP 401 cualquier llamada con contexto `anon` o JWT de usuario. El `session_token` del widget **nunca** se pasa a las EFs de Integration API.

```typescript
// n8n configura esta credencial en su sistema de variables/credenciales:
// Supabase URL + SERVICE_ROLE_KEY → Authorization: Bearer <service_role_key>
// Las EFs conv-core-* verifican que el contexto es service_role, no anon ni JWT de usuario
```

**Capa C — EF del add-on → SmartRoom Core** (llamadas internas desde dentro de una EF):

Una EF como `conv-core-create-incident` puede necesitar leer de `conv_sessions` antes de llamar al Core. Para eso usa también `service_role`, disponible en el entorno de ejecución de la EF.

```typescript
// Dentro de la EF conv-core-create-incident, leer profile_id y room_id de conv_sessions
const addOnClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const { data: session } = await addOnClient
  .from('conv_sessions')
  .select('profile_id, identity_data')
  .eq('id', sessionId)
  .single();
// Luego llamar al Core con los datos completos
```

**Regla de separación:** el `session_token` del widget es para la capa A únicamente. Las capas B y C usan exclusivamente `service_role`. Nunca se pasa el `session_token` de un usuario a una EF de Integration API.

### Paso 2 — Estructura interna de una EF `conv-core-*`

Patrón estándar para todas las EFs de Integration API:

> **Nota de alcance:** El siguiente ejemplo usa `conv-core-create-incident`. La estructura general de autenticación, validación, llamada al Core y publicación de actividad aplica a las EFs `conv-core-*`; sin embargo, la creación de pre-incidencia y el escalado tras 5xx agotados son comportamientos **específicos de `conv-core-create-incident`** y no deben generalizarse al resto de EFs de Integration API.

```typescript
// conv-core-create-incident/index.ts
export default async function handler(req: Request): Promise<Response> {
  // 1. Verificar que el llamante usa service_role (no anon, no JWT de usuario)
  //    Supabase verifica esto automáticamente via el JWT en Authorization header.
  //    Si llega con contexto anon → HTTP 401 automático por políticas RLS.
  //    La EF no gestiona session_token de usuario: ese token es solo para las
  //    EFs públicas del add-on (conv-web-session, conv-web-message).

  // 2. Validar el body de la petición
  const body = await req.json();
  if (!body.client_account_id || !body.incident_type) {
    return json({ error: 'missing_required_fields' }, 400);
  }

  // 3. Ejecutar la operación en el Core con backoff
  let result: CoreResult | null = null;
  let lastError: Error | null = null;
  const delays = [1000, 5000, 30000]; // 1s, 5s, 30s

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      result = await callCoreCreateIncident(body);
      break;
    } catch (err) {
      lastError = err;
      if (attempt < 2) await sleep(delays[attempt]);
    }
  }

  if (!result) {
    // 3 intentos fallidos → crear pre-incidencia + escalar
    await createPreIncidentCase(body.session_id, 'waiting_internal');
    await callConvEscalateCase({ session_id: body.session_id, reason: 'core_error' });
    return json({ error: 'core_unavailable', escalated: true }, 503);
  }

  // 4. Publicar en el activity log DESPUÉS del éxito (fire-and-log)
  try {
    await callConvCorePublishActivity({
      client_account_id: body.client_account_id,
      event_type: 'conv_incident_created',
      payload: {
        incident_id:   result.incident_id,
        incident_ref:  result.incident_ref,
        conv_case_id:  body.conv_case_id,
        channel:       body.source,        // 'whatsapp' | 'webchat'
        incident_type: body.incident_type,
        urgency:       body.urgency
        // NO incluir: session_id, profile_id, phone_number, full_name
      }
    });
  } catch {
    // Fallo de publicación: solo log, nunca error ni rollback
    console.warn('conv-core-publish-activity failed for conv_incident_created');
  }

  return json({ incident_id: result.incident_id, incident_ref: result.incident_ref });
}
```

### Paso 3 — Tratamiento de errores HTTP del Core

| Código HTTP del Core | Tratamiento en la EF |
|---|---|
| 2xx | Éxito; continuar con la publicación de actividad |
| 400 | Error de validación de datos; devolver error descriptivo al llamante; no reintentar |
| 403 | Tenant sin suscripción activa; devolver HTTP 403; no reintentar |
| 404 | Recurso no encontrado; devolver HTTP 404; no reintentar |
| 429 | Rate limit; backoff con espera adicional antes de reintentar |
| 5xx | Error temporal del Core; backoff exponencial (1s → 5s → 30s, 3 intentos max) |
| Timeout | Tratar como 5xx |

Para los errores no recuperables (4xx), la EF devuelve el error al llamante sin intentar crear estado adicional.

Para los 5xx tras 3 intentos fallidos, la EF devuelve un error descriptivo al llamante. El comportamiento adicional depende de la EF concreta:

- **`conv-core-create-incident`** (única EF con este patrón): crea una pre-incidencia en `conv_cases` con `status = 'waiting_internal'` y llama a `conv-escalate-case` para notificar al admin. Este es el comportamiento específico de la creación de incidencias, no un patrón general de la Integration API.
- El resto de EFs `conv-core-*` devuelven el error al llamante sin crear estado adicional. Es el workflow de servicio (WF-20, WF-30, WF-40) quien decide cómo responder al usuario.

### Paso 4 — Implementar `conv-core-publish-activity`

Esta EF es fire-and-log. Registra eventos funcionales en el activity log del Core sin bloquear el flujo principal:

```typescript
// Contrato de la petición:
interface PublishActivityRequest {
  client_account_id: string;  // UUID del tenant
  event_type:        string;  // p.ej. 'conv_incident_created', 'conv_lead_created'
  payload:           Record<string, unknown>;  // metadatos del evento (sin PII)
}

// Respuesta en caso de éxito:
interface PublishActivityResponse {
  published: boolean;  // siempre true si HTTP 200
  event_id:  string;   // UUID del evento registrado
}
```

**Reglas de uso:**

- Se llama **solo** después de que la operación principal haya tenido éxito.
- Si la publicación falla (4xx, 5xx, timeout), el error se registra en logs y se ignora. Nunca hace rollback de la operación principal.
- No se reintenta.
- El `payload` no debe contener PII: ni `profile_id`, ni `phone_number`, ni `full_name`, ni `room_label`.

```typescript
// Ejemplo de llamada desde conv-core-create-incident
await fetch('/functions/v1/conv-core-publish-activity', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    client_account_id: body.client_account_id,
    event_type: 'conv_incident_created',
    payload: {
      incident_id:   result.incident_id,
      incident_ref:  result.incident_ref,
      conv_case_id:  body.conv_case_id,
      channel:       body.source,
      incident_type: body.incident_type,
      urgency:       body.urgency
      // NO incluir: session_id, profile_id, phone_number, full_name
    }
  })
}).catch(err => console.warn('publish-activity failed:', err.message));
```

### Paso 5 — Catálogo de EFs `conv-core-*`

**EFs de Integration API (`conv-core-*`)** — el único canal de comunicación entre el add-on y SmartRoom Core:

| EF | Método | Propósito |
|---|---|---|
| `conv-core-validate-identity` | POST | Validar identidad del usuario contra el Core |
| `conv-core-get-tenant-features` | POST | Obtener servicios y límites activos del tenant |
| `conv-core-create-incident` | POST | Crear incidencia oficial en SmartRoom Core |
| `conv-core-lookup-listing` | POST | Buscar anuncios de alojamiento |
| `conv-core-create-lead` | POST | Registrar lead de un posible inquilino |
| `conv-core-get-accommodation-info` | POST | Obtener información de una residencia |
| `conv-core-publish-activity` | POST | Publicar evento en el activity log del Core (fire-and-log) |

**EFs internas del add-on** — operan sobre el estado interno del add-on, no sobre SmartRoom Core. No forman parte de la Integration API `conv-core-*`:

| EF | Método | Propósito |
|---|---|---|
| `conv-escalate-case` | POST | Escalar un caso al admin humano (actualiza `conv_cases.status`) |
| `conv-close-case` | POST | Cerrar un caso como resuelto o definitivamente cerrado |

### Paso 6 — Versionado de contratos

Cada EF debe incluir la versión del contrato en el header de la petición:

```
X-SmartConv-Contract-Version: 1
```

Si el Core devuelve un error de versión incompatible (HTTP 409), la EF debe loguearlo como alerta crítica. No reintentar con la misma versión.

Al añadir campos opcionales a una petición existente, la versión no cambia. Al añadir campos obligatorios o eliminar campos, incrementar la versión principal.

## 7. Datos / contratos involucrados

- `rules-70-integration-api.md` — catálogo completo de endpoints y sus esquemas
- `conv_cases` — pre-incidencias y seguimiento del estado
- `conv_sessions` — almacenamiento de `profile_id` y resultado de validación de identidad
- `contract-canonical-response.md` — cómo los errores de Core se traducen en respuestas al usuario

## 8. Errores comunes

- **Llamar a `conv-core-publish-activity` antes de que la operación principal tenga éxito:** si la operación principal falla, no hay evento que publicar. El orden es obligatorio: operación → éxito → publicar.
- **Reintentar `conv-core-publish-activity` cuando falla:** es fire-and-log. Un fallo se registra y se ignora. No se reintenta.
- **Usar `conv_send_queue` para los reintentos de Core:** esa cola es exclusivamente para reintentos de envío saliente al usuario (Wasender, Realtime). Los reintentos de Core son backoff en la EF.
- **Propagar errores internos del Core al usuario final:** el usuario recibe un mensaje genérico de error. Los stack traces, códigos de error internos y detalles de excepción van a los logs internos de la EF, nunca a `CanonicalResponse.metadata` ni a ningún campo visible al usuario o a n8n.
- **Incluir el `service_role` key en el payload de las peticiones de n8n o en sus logs:** esta clave debe configurarse como credencial en el sistema de credenciales de n8n (Supabase credential), nunca en el cuerpo de las peticiones ni en variables expuestas en los logs.
- **Incluir PII en el `payload` de `conv-core-publish-activity`:** el activity log del Core no debe recibir `profile_id`, `phone_number`, `full_name` ni `room_label`.

## 9. Qué no debe hacerse

- Acceder directamente a las tablas del Core de SmartRoom desde el add-on (ni desde n8n ni desde las EFs del add-on).
- Hacer rollback de una operación exitosa cuando falla `conv-core-publish-activity`.
- Saltarse el backoff y hacer los tres intentos de forma inmediata.
- Crear más de 3 intentos para recuperarse de un 5xx del Core.
- Implementar lógica de servicio (decidir qué tipo de incidencia es, clasificar intenciones) dentro de una EF `conv-core-*`.

## 10. Escenarios mínimos de prueba

1. **Llamada exitosa al Core → actividad publicada:**
   `conv-core-create-incident` recibe HTTP 200 del Core → se llama a `conv-core-publish-activity` con `event_type = 'conv_incident_created'` → la publicación tiene éxito.

2. **Core devuelve 5xx → backoff → éxito en el tercer intento:**
   Primeros dos intentos devuelven 503, tercer intento devuelve 200 → sin escalado, sin pre-incidencia.

3. **Core devuelve 5xx tres veces → pre-incidencia + escalado:**
   Tres intentos fallidos → pre-incidencia en `conv_cases` con `status='waiting_internal'` → `conv-escalate-case` llamado → EF devuelve error al llamante.

4. **`conv-core-publish-activity` falla → operación principal no afectada:**
   `conv-core-create-incident` exitoso → `conv-core-publish-activity` devuelve 500 → solo log de warning; el `incident_ref` ya fue devuelto al llamante correctamente.

5. **Core devuelve 400 → sin reintento:**
   HTTP 400 por datos inválidos → la EF devuelve el error inmediatamente al llamante sin backoff.

6. **`payload` de actividad sin PII (`conv_incident_created`):**
   El payload de `conv-core-publish-activity` para `conv_incident_created` contiene `incident_id`, `incident_ref`, `conv_case_id`, `channel`, `incident_type` y `urgency`. No incluye `session_id`, `profile_id`, `full_name` ni `phone_number`.

## 11. Criterio de done

La Integration API se considera correctamente implementada cuando:

- Todas las llamadas al Core pasan por EFs `conv-core-*`; n8n no tiene acceso directo al Core
- Los reintentos de 5xx usan backoff exponencial (1s → 5s → 30s) con máximo 3 intentos
- `conv-core-publish-activity` se llama solo después del éxito de la operación principal
- Los fallos de publicación de actividad no bloquean ni hacen rollback de la operación principal
- El `payload` de actividad no contiene PII
- El `service_role` key está configurado como credencial en el sistema de n8n, nunca en el payload de las peticiones ni en los logs
- Los errores del Core se traducen en mensajes genéricos para el usuario, nunca en stack traces

## 12. Documentos relacionados

- `rules-70-integration-api.md` — catálogo de EFs y esquemas de petición/respuesta
- `rules-90-observability-and-failure-handling.md` — tratamiento de fallos y reconciliación
- `rules-80-data-and-privacy.md` — restricciones de PII en los payloads de actividad
- `skill-n8n-incidents-workflow.md` — uso de `conv-core-create-incident` desde WF-20
- `skill-data-model-and-state.md` — cómo las EFs actualizan el estado de `conv_cases`
- `rules-02-project-structure-and-addons.md` — convención de namespace de las EFs `conv-core-*`

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`
