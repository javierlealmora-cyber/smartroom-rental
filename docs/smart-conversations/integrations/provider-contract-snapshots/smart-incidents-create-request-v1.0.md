# Snapshot — Smart Incidents: Create Incident Request Contract v1.0

**Tipo:** Provider-owned contract (Smart Incidents domain)
**Estado snapshot:** `INCIDENT_PROVIDER_CONTRACT_DEFINED_IMPLEMENTATION_PENDING`
**Versión contract:** 1.0
**Fecha snapshot:** 2026-07-26
**Propietario original:** Smart Incidents (SI)
**Consumidor que captura snapshot:** SmartConversations (SC) — Fase 11C5E-IMPLEMENTATION
**Checksum fuente:** [a verificar con SI cuando se disponibilice el contrato público]

> **Nota de provenance:** Este snapshot se deriva del contrato provider-owned de Smart Incidents.
> El contrato canónico vive en el repositorio de Smart Incidents.
> SC conserva esta copia para documentar el contrato que implementa en el consumer-adapter.
> Este documento NO reemplaza ni modifica el contrato canónico de SI.
> Si el contrato SI evoluciona, SC debe actualizar el adapter Y este snapshot.

---

## 1. Endpoint

```
POST /incidents
Authorization: Bearer <INCIDENTS_ADDON_SERVICE_TOKEN>
Content-Type: application/json
Idempotency-Key: <idempotency_key>
X-Correlation-Id: <correlation_id>
```

---

## 2. Request body (`CreateIncidentRequestV1`)

```typescript
{
  // Envelope
  contract_version:  '1.0',                    // literal type, required
  client_account_id: string,                   // tenant isolation, required
  request_id:        string,                   // UUID, changes each attempt, required
  correlation_id:    string,                   // stable for the operation, required
  idempotency_key:   string,                   // 16–128 chars, stable per write, required
  source_system:     'smart_conversations',    // literal, required
  source_channel:    'whatsapp' | 'webchat',   // required

  // Actor — SC sends only system type
  actor: {
    type: 'system',                            // only valid value from SC
  },

  // Incident data
  incident: {
    accommodation_id:     string,              // required — resolved server-side
    room_id:              string | null,       // nullable
    requester_profile_id: string,              // required — STRONG_MATCH_ACTIVE only
    category:             'maintenance' | 'noise' | 'security' | 'billing' | 'other',
    title:                string,              // required, 5–120 chars
    description:          string,              // sanitized, max 2000 chars
    priority:             'normal' | 'urgent', // required — no 'critical', no unknowns
    external_request_reference: null,          // always null — never conv_case_id in clear
  },
}
```

---

## 3. Priority mapping (SC → SI)

| SC `urgency_proposal` | SI `priority` | Acción |
|----------------------|---------------|--------|
| `'low'` | `'normal'` | invocar |
| `'medium'` | `'normal'` | invocar |
| `null` / ausente | `'normal'` | invocar |
| `'high'` | `'urgent'` | invocar |
| `'critical'` | — | **NO INVOCAR** — valor no contractual en v1.0 |
| cualquier otro | — | **NO INVOCAR** — fallo explícito `UNKNOWN_URGENCY` |

**Regla:** Valores fuera del set `{low, medium, high, null}` → abort invocation.
**Prohibición:** No mapear valores desconocidos a `'normal'` silenciosamente.
**Prohibición:** No añadir `'critical'` al mapping sin nueva versión de contrato aprobada.

---

## 4. Title constraints

- `title` es **obligatorio**
- Mínimo: 5 caracteres
- Máximo: 120 caracteres (límite contractual del provider v1.0)
- Sin HTML, sin caracteres de control
- Unicode normalizado NFC
- Fallback `'Incidencia registrada'` **PROHIBIDO**
- Si no se puede generar título válido → **NO INVOCAR** al provider

---

## 5. Actor constraints

- SC → SI: SOLO `{ type: 'system' }`
- `tenant_profile`, `unverified_lead` y actores desconocidos → **RECHAZADOS** antes de invocar
- El actor SI nunca contiene `profile_id`, `identity_level`, ni campos de identidad conversacional

---

## 6. `requester_profile_id` — flujo de resolución (SC-side)

```
conv_case_id (SC EF)
    → carga conv_case → obtiene session_id
    → carga conv_sessions WHERE id = session_id AND client_account_id = ?
    → verifica identity_level = 'STRONG_MATCH_ACTIVE'
    → obtiene profile_id  (nunca null si STRONG_MATCH_ACTIVE)
    → obtiene accommodation_id desde identity_data o join rooms
    → obtiene room_id desde identity_data (nullable)
    → result: requester_profile_id = profile_id
```

**Regla:** `requester_profile_id` es resuelto **exclusivamente en el EF** (server-side).
**Prohibición:** WF-20 / n8n **NUNCA** envían `requester_profile_id` al EF.
**Prohibición:** WF-20 / n8n **NUNCA** consultan `conv_sessions` para resolver identidad.

---

## 7. Response (`CreateIncidentResponseV1`)

```typescript
{
  incident_id:       string,    // opaque reference — SC stores this only
  incident_reference: string | null, // human-readable reference, optional
  status:            'new',     // VALIDATED: SC rejects if status !== 'new'
  created_at:        string,    // ISO-8601
  idempotent_replay: boolean,
}
```

**Regla de validación del resultado:** SC rechaza respuestas donde `status !== 'new'`.

---

## 8. Idempotency

- **Scope:** `client_account_id × idempotency_key`
- **Estrategia SC:** `CONSUMER_IDEMPOTENCY_HASH_DERIVED`
  - `idempotency_key = sha256(client_account_id + ':' + conv_case_id + ':createIncident:1.0').hex.slice(0, 64)`
  - Derivado deterministamente de datos persistidos → no requiere migración
- `request_id` cambia cada intento técnico
- `correlation_id` estable para la operación
- `idempotency_key` estable para la operación de escritura

---

## 9. Seguridad B2B

- Auth: `Authorization: Bearer <INCIDENTS_ADDON_SERVICE_TOKEN>`
- **Prohibición:** Nunca usar `SUPABASE_SERVICE_ROLE_KEY` como token de add-on
- **Prohibición:** Nunca usar `VITE_*` variables — solo server-side
- `INCIDENTS_ADDON_SERVICE_TOKEN` = secret de entorno, nunca expuesto en frontend

---

## 10. Campos prohibidos (respuesta SI → SC)

SI **nunca** devuelve en la respuesta:
- `profile_id`, `phone`, `email`, `identity_data`
- `conv_session_id`, `conv_case_id`
- `authorization`, `service_role`, `api_key`
- `raw_payload`, `sql`, `sender_ref`, `wa_jid`

---

## 11. Error codes SC (lado consumer)

| Código | Cuándo |
|--------|--------|
| `REQUESTER_IDENTITY_REQUIRED` | identity_level ≠ STRONG_MATCH_ACTIVE o profile_id null |
| `UNSUPPORTED_ACTOR_TYPE` | actor.type no es system_service |
| `UNKNOWN_URGENCY` | urgency_proposal fuera del set permitido |
| `TITLE_REQUIRED` | no se puede generar título válido |
| `TITLE_TOO_SHORT` | título < 5 chars |
| `ACCOMMODATION_REQUIRED` | accommodation_id null/vacío |
| `INCIDENT_STATUS_MISMATCH` | status en respuesta ≠ 'new' |
