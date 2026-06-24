# test-identity-validation-spec.md — Especificación de Pruebas: Validación de Identidad

## 1. Objetivo

Verificar que el sistema de validación de identidad del add-on SmartConversations se comporta según lo definido en `rules-40-identity-validation.md`: los tres puntos de entrada (fast-path WhatsApp, fast-path WebChat, flujo progresivo WF-IDENTITY), los cuatro niveles de resultado, el escalado tras tres fallos consecutivos, la regla de no degradación de `identity_level` dentro de una sesión, y la frontera de privacidad que impide que `profile_id` y datos personales lleguen a n8n.

---

## 2. Alcance

| Incluye | Excluye |
|---|---|
| Fast-path WhatsApp por teléfono (`conv-ingest`) | Lógica interna del Core para determinar el nivel de identidad |
| Fast-path WebChat por `profile_id` (`conv-web-session`) | Lógica de matching del Core (caja negra) |
| Flujo progresivo WF-IDENTITY completo | Panel de administración de identidades |
| Los cuatro niveles de resultado + `UNVERIFIED_LEAD` | Flujo de incidencias y servicios (cubiertos en sus propios specs) |
| Escalado tras 3 fallos en flujo progresivo | Gestión de casos y mensajes posterior a la validación |
| Regla de no degradación de `identity_level` | |
| Almacenamiento de resultado en `conv_sessions` (EF, no n8n) | |

---

## 3. Reglas y Contratos Cubiertos

| Documento | Sección | Qué se verifica |
|---|---|---|
| `rules-40-identity-validation.md` | §4.1 | Fast-path WhatsApp: extracción de teléfono de `message.from` en formato internacional sin `@c.us` |
| `rules-40-identity-validation.md` | §4.2 | Fast-path WebChat: JWT válido ≠ tenencia activa |
| `rules-40-identity-validation.md` | §4.3 | Flujo progresivo: 3 turnos (full_name, residence_name, room_label) |
| `rules-40-identity-validation.md` | §4.4 | Escalado tras 3 fallos; no más intentos automáticos en la sesión |
| `rules-40-identity-validation.md` | §4.5 | `identity_level` nunca se degrada dentro de una sesión |
| `rules-40-identity-validation.md` | §4.6 | Matriz de acciones permitidas por nivel |
| `rules-00-scope-and-principles.md` | §4.5 | `profile_id` almacenado en EF; nunca propagado a n8n |
| `rules-80-data-and-privacy.md` | §4.1 | n8n solo recibe `identity_level` (enum), nunca `profile_id` ni teléfono |
| `contract-identity-validation-result.md` | §3 | Request/response de `conv-core-validate-identity` |

---

## 4. Precondiciones

- `conv-core-validate-identity` disponible y con respuestas simulables para cada nivel.
- Tenant `tenant_A` con suscripción umbrella activa.
- Para WebChat: un JWT de portal lodger válido disponible para pruebas.
- Para WA: un payload de mensaje Wasender con campo `message.from` válido.
- `conv_sessions` con `identity_level = 'NO_MATCH'` (estado inicial conversacional antes de cualquier validación exitosa).

---

## 5. Escenarios de Prueba

### Bloque ID — Fast-path WhatsApp

**ID-01: Fast-path WA → `STRONG_MATCH_ACTIVE`**

- **Precondición**: Mensaje WA recibido con `message.from = "+34612345678"`. Core devuelve `identity_level = 'STRONG_MATCH_ACTIVE'` para ese teléfono.
- **Acción**: `conv-ingest` llama a `conv-core-validate-identity` con `{ client_account_id, phone: "+34612345678" }`.
- **Resultado esperado**:
  - `conv_sessions.identity_level` actualizado a `'STRONG_MATCH_ACTIVE'`.
  - `conv_sessions.profile_id` almacenado en la EF (no reenviado a n8n).
  - n8n recibe únicamente `{ identity_level: 'STRONG_MATCH_ACTIVE' }`.
  - El teléfono no aparece en logs de n8n ni de las EFs.
- **Regla cubierta**: `rules-40` §4.1; `rules-80` §4.1.

---

**ID-02: Fast-path WA → `MATCH_INACTIVE` (ex-inquilino)**

- **Precondición**: `message.from` con teléfono de un ex-inquilino. Core devuelve `MATCH_INACTIVE`.
- **Resultado esperado**:
  - `conv_sessions.identity_level = 'MATCH_INACTIVE'`.
  - n8n recibe `{ identity_level: 'MATCH_INACTIVE' }`.
  - Acciones disponibles: solo FAQ público y consultas de anuncios (datos públicos).
- **Regla cubierta**: `rules-40` §4.6.

---

**ID-03: Fast-path WA → `NO_MATCH` (número desconocido)**

- **Precondición**: `message.from` con número no registrado en el Core.
- **Resultado esperado**:
  - `conv_sessions.identity_level = 'NO_MATCH'`.
  - n8n recibe `{ identity_level: 'NO_MATCH' }`.
  - El sistema puede activar WF-IDENTITY si el servicio lo requiere.
- **Regla cubierta**: `rules-40` §4.1.

---

### Bloque ID — Fast-path WebChat

**ID-04: Fast-path WebChat con JWT válido → `STRONG_MATCH_ACTIVE`**

- **Precondición**: Widget envía JWT del portal lodger. Core valida el JWT y confirma tenencia activa.
- **Acción**: `conv-web-session` envía `{ client_account_id, profile_id }` a `conv-core-validate-identity`.
- **Resultado esperado**:
  - Core devuelve `STRONG_MATCH_ACTIVE`.
  - `conv_sessions.profile_id` almacenado; nunca reenviado a n8n.
  - El Core ignora `phone`, `full_name` cuando `profile_id` está presente.
- **Regla cubierta**: `rules-40` §4.2.

---

**ID-05: Fast-path WebChat con JWT válido pero tenencia inactiva → `MATCH_INACTIVE`**

- **Precondición**: JWT de portal lodger válido (no expirado), pero el contrato de ese inquilino está finalizado en el Core.
- **Resultado esperado**:
  - JWT válido ≠ tenencia activa.
  - Core devuelve `MATCH_INACTIVE`.
  - `conv_sessions.identity_level = 'MATCH_INACTIVE'`.
- **Regla cubierta**: `rules-40` §4.2 — "JWT válido ≠ tenencia activa".

---

**ID-06: Fast-path WebChat sin JWT → sesión anónima, `identity_level = 'NO_MATCH'`**

- **Precondición**: Widget iniciado sin JWT (usuario anónimo).
- **Resultado esperado**:
  - `conv-web-session` crea sesión con `identity_level = 'NO_MATCH'`.
  - El sistema puede atender FAQ público y anuncios.
- **Regla cubierta**: `rules-40` §4.1.

---

### Bloque ID — Flujo progresivo WF-IDENTITY

**ID-07: Flujo progresivo completo → `STRONG_MATCH_ACTIVE` en 3 turnos**

- **Precondición**: Sesión con `identity_level = 'NO_MATCH'`. Servicio `conv_incidencias` requiere al menos `PARTIAL_MATCH_ACTIVE`.
- **Acción**:
  - Turno 1: Usuario proporciona `full_name = "María García"`.
  - Turno 2: Usuario proporciona `residence_name = "Residencia Sol"`.
  - Turno 3: Usuario proporciona `room_label = "204"`.
- **Resultado esperado**:
  - Cada dato se persiste en `conv_sessions.identity_data` antes del siguiente turno.
  - Tras el turno 3, `conv-core-validate-identity` devuelve `STRONG_MATCH_ACTIVE`.
  - WF-IDENTITY devuelve control al servicio llamante con `identity_level = 'STRONG_MATCH_ACTIVE'`.
  - n8n nunca recibe `full_name`, `residence_name` ni `room_label` directamente.
- **Regla cubierta**: `rules-40` §4.3.

---

**ID-08: Flujo progresivo → `PARTIAL_MATCH_ACTIVE` (sin teléfono verificado)**

- **Precondición**: Usuario proporciona nombre y residencia, el Core los confirma pero no puede verificar el teléfono.
- **Resultado esperado**:
  - `conv_sessions.identity_level = 'PARTIAL_MATCH_ACTIVE'`.
  - El servicio recibe `PARTIAL_MATCH_ACTIVE` y puede crear pre-incidencia pero no incidencia oficial.
- **Regla cubierta**: `rules-40` §4.3; `rules-40` §4.6.

---

**ID-09: Flujo progresivo no repregunta datos ya persistidos en `identity_data`**

- **Precondición**: Sesión con `identity_data = { full_name: "Carlos Ruiz" }` (ya preguntado en turno anterior, sesión reanudada después de IDLE).
- **Acción**: Se activa WF-IDENTITY de nuevo.
- **Resultado esperado**:
  - WF-IDENTITY lee `conv_sessions.identity_data` al inicio.
  - No vuelve a preguntar `full_name`.
  - Empieza directamente por `residence_name` (turno 2).
- **Regla cubierta**: `rules-40` §4.3.

---

**ID-10: Primer intento fallido en flujo progresivo → se piden más datos**

- **Precondición**: Usuario proporciona datos que el Core no puede confirmar (`NO_MATCH`). Contador de intentos = 0.
- **Resultado esperado**:
  - Contador de intentos pasa a 1.
  - WF-IDENTITY solicita datos adicionales o repite la pregunta.
  - No se escala a admin todavía.
- **Regla cubierta**: `rules-40` §4.4.

---

**ID-11: Tercer fallo consecutivo → escalado a admin, sin más intentos automáticos**

- **Precondición**: 2 fallos previos en WF-IDENTITY. Contador de intentos = 2.
- **Acción**: Tercer intento resulta en `NO_MATCH`.
- **Resultado esperado**:
  - Contador pasa a 3.
  - `conv-escalate-case` invocado.
  - `conv_cases.status = 'escalated'`.
  - El usuario recibe mensaje genérico de escalado.
  - WF-IDENTITY no inicia un cuarto intento automático en esta sesión.
- **Regla cubierta**: `rules-40` §4.4.

---

### Bloque ID — Regla de no degradación

**ID-12: `identity_level` no se degrada: `PARTIAL` persiste aunque nueva validación devuelva `NO_MATCH`**

- **Precondición**: Sesión con `identity_level = 'PARTIAL_MATCH_ACTIVE'`. Se realiza una nueva llamada a `conv-core-validate-identity` que devuelve `NO_MATCH`.
- **Resultado esperado**:
  - `conv_sessions.identity_level` permanece en `'PARTIAL_MATCH_ACTIVE'`.
  - El nivel no se degrada a `NO_MATCH`.
- **Regla cubierta**: `rules-40` §4.5.

---

**ID-13: `identity_level` puede avanzar: `PARTIAL` → `STRONG` en la misma sesión**

- **Precondición**: Sesión con `identity_level = 'PARTIAL_MATCH_ACTIVE'`. Usuario proporciona teléfono verificado.
- **Resultado esperado**:
  - Nueva llamada a `conv-core-validate-identity` devuelve `STRONG_MATCH_ACTIVE`.
  - `conv_sessions.identity_level` actualizado a `'STRONG_MATCH_ACTIVE'`.
- **Regla cubierta**: `rules-40` §4.5.

---

### Bloque ID — Almacenamiento y frontera de privacidad

**ID-14: `profile_id` almacenado en `conv_sessions`; no llega a n8n**

- **Precondición**: `conv-core-validate-identity` devuelve `{ identity_level: 'STRONG_MATCH_ACTIVE', profile_id: 'prof-uuid-001' }`.
- **Resultado esperado**:
  - EF escribe `conv_sessions.profile_id = 'prof-uuid-001'` con `service_role`.
  - El payload enviado a WF-01/WF-10 contiene `{ identity_level: 'STRONG_MATCH_ACTIVE' }` únicamente.
  - `profile_id` no aparece en ningún payload de n8n.
- **Regla cubierta**: `rules-80` §4.1; `rules-00` §4.5.

---

**ID-15: `assignment_id` y `room_id` almacenados en `conv_sessions.identity_data`; no llegan a n8n**

- **Precondición**: Core devuelve `assignment_id` y `room_id` junto con `STRONG_MATCH_ACTIVE`.
- **Resultado esperado**:
  - EF almacena estos datos en `conv_sessions.identity_data`.
  - Ninguno de estos campos aparece en el payload a n8n.
- **Regla cubierta**: `rules-80` §4.1.

---

### Bloque ID — `UNVERIFIED_LEAD`

**ID-16: `UNVERIFIED_LEAD` asignado por WF-30, no por `conv-core-validate-identity`**

- **Precondición**: Usuario confirma explícitamente que no es inquilino en WF-30.
- **Resultado esperado**:
  - WF-30 (no WF-IDENTITY) asigna `conv_sessions.identity_level = 'UNVERIFIED_LEAD'`.
  - El usuario puede consultar anuncios y registrar leads.
  - El usuario no puede crear incidencias ni acceder a datos contractuales.
- **Regla cubierta**: `rules-40` §4.6; `contract-identity-validation-result.md`.

---

**ID-17: Matriz de acciones — `NO_MATCH` no puede crear incidencia oficial**

- **Precondición**: Sesión con `identity_level = 'NO_MATCH'`. Usuario solicita crear incidencia.
- **Resultado esperado**:
  - WF-20 rechaza la acción.
  - Se activa WF-IDENTITY para intentar mejorar el nivel.
  - Si el nivel sigue siendo `NO_MATCH` tras 3 intentos → escalado.
- **Regla cubierta**: `rules-40` §4.6.

---

**ID-18: Matriz de acciones — `PARTIAL_MATCH_ACTIVE` puede crear pre-incidencia, no incidencia oficial**

- **Precondición**: Sesión con `identity_level = 'PARTIAL_MATCH_ACTIVE'`. Usuario solicita crear incidencia.
- **Resultado esperado**:
  - WF-20 crea pre-incidencia en `conv_cases` con `status = 'open'` (la pre-incidencia nace en estado abierto).
  - No llama a `conv-core-create-incident` (que requiere `STRONG_MATCH_ACTIVE`).
  - Usuario recibe mensaje informando que se ha registrado pero se necesita verificación completa.
- **Regla cubierta**: `rules-40` §4.6; `rules-60`.

---

## 6. Casos Negativos

| ID | Caso negativo | Resultado esperado |
|---|---|---|
| ID-NEG-01 | EF reenvía `profile_id` a n8n en el payload de WF-01 | Violación de `rules-80` §4.1; el campo nunca debe aparecer en payloads de n8n |
| ID-NEG-02 | n8n ejecuta `UPDATE conv_sessions SET identity_level` directamente | RLS rechaza la operación (solo EFs con `service_role` pueden escribir) |
| ID-NEG-03 | WF-IDENTITY permite 4 intentos de validación en la misma sesión | Violación de `rules-40` §4.4; máximo 3 intentos fallidos |
| ID-NEG-04 | `identity_level` baja de `PARTIAL_MATCH_ACTIVE` a `NO_MATCH` en la misma sesión | Violación de la regla de no degradación en `rules-40` §4.5 |
| ID-NEG-05 | Teléfono de WhatsApp enviado en texto claro a los logs de la EF | Violación de `rules-80` §4.4 |
| ID-NEG-06 | WF-IDENTITY vuelve a preguntar `full_name` cuando ya está en `conv_sessions.identity_data` | Violación de `rules-40` §4.3; la sesión contiene los datos previos |

---

## 7. Datos de Prueba

```json
{
  "whatsapp_phones": {
    "strong_match_active": "+34612345678",
    "match_inactive": "+34698765432",
    "no_match": "+34600000000"
  },
  "webchat_jwts": {
    "valid_active_tenant": "eyJhbGciOiJIUzI1NiJ9.active_tenant_placeholder",
    "valid_inactive_tenant": "eyJhbGciOiJIUzI1NiJ9.inactive_tenant_placeholder",
    "expired_jwt": "eyJhbGciOiJIUzI1NiJ9.expired_placeholder"
  },
  "progressive_flow_data": {
    "full_name": "María García López",
    "residence_name": "Residencia Sol Mediterráneo",
    "room_label": "204"
  },
  "sessions": {
    "no_identity": {
      "identity_level": "NO_MATCH",
      "identity_data": {}
    },
    "partial_with_name": {
      "identity_level": "PARTIAL_MATCH_ACTIVE",
      "identity_data": { "full_name": "Carlos Ruiz" }
    },
    "strong_match": {
      "identity_level": "STRONG_MATCH_ACTIVE",
      "profile_id": "prof-test-uuid-001"
    }
  }
}
```

---

## 8. Criterio de Aceptación

| Criterio | Condición de éxito |
|---|---|
| Fast-path WA opera antes de WF-01 | La validación ocurre en `conv-ingest`, no en n8n |
| `profile_id` nunca en payloads de n8n | Revisión de todos los payloads de WF-01 a WF-IDENTITY: campo ausente |
| Máximo 3 intentos en WF-IDENTITY | El cuarto intento no se inicia; se escala tras el tercero |
| `identity_level` nunca degrada | Una sesión con `PARTIAL` no puede bajar a `NO_MATCH` bajo ninguna condición |
| Datos previos en `identity_data` no se vuelven a pedir | WF-IDENTITY lee el estado al inicio y omite turnos ya completados |
| `UNVERIFIED_LEAD` asignado por WF-30, no por `conv-core-validate-identity` | El flujo de leads no usa WF-IDENTITY para asignar este nivel |
| Almacenamiento en EF con `service_role` | Las escrituras en `conv_sessions` no pasan por n8n |

---

## 9. Dependencias

| Documento | Relación |
|---|---|
| `rules-40-identity-validation.md` | Fuente de verdad completa de este spec |
| `contract-identity-validation-result.md` | Request/response de `conv-core-validate-identity` |
| `rules-00-scope-and-principles.md` §4.5 | Frontera PII: `profile_id` no a n8n |
| `rules-80-data-and-privacy.md` §4.1 | Tabla de minimización de PII por capa |
| `rules-60-service-incidents.md` | Requiere `STRONG_MATCH_ACTIVE` para incidencia oficial |
| `skill-identity-validation.md` | Detalles de implementación de los tres puntos de entrada |
| `diagram-identity-validation-flow.md` | Diagrama de referencia del flujo |
