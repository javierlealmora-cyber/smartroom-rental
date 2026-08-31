# Contrato de integración — Add-on de Incidencias (Fase 11C5)

**Versión:** 1.0  
**Puerto:** `IncidentIntegrationPort`  
**Archivo:** `incidents-integration-port.ts`  
**Estado:** `DEV_CONFIGURATION_PENDING`

---

## 1. Operaciones

### `createIncident(command: CreateIncidentCommand)`

Crea un incidente en el add-on externo de incidencias.

**Entrada:**

```typescript
{
  contract_version: '1.0',
  client_account_id: string,    // tenant aislado
  request_id: string,
  correlation_id: string,
  idempotency_key: string,      // scope: tenant × key
  source: 'smart_conversations',
  actor: CanonicalActor,        // tenant_profile | system_service
  incident: {
    accommodation_id: string,
    room_id: string | null,
    category: string,
    description: string,        // sanitizado, ≤2000 chars
    urgency_proposal: string | null,
    attachments: string[],      // referencias opacas solo
  }
}
```

**Salida:**

```typescript
{
  ok: true,
  data: {
    incident_id: string,           // referencia opaca — SC guarda solo esto
    incident_reference: string | null,
    status: string,                // dominio del add-on
    created_at: string,            // ISO-8601
    idempotent_replay: boolean,
  },
  meta: { mode: string, duration_ms: number, idempotent_replay: boolean }
}
```

---

## 2. Actor permitido

| Tipo | Uso | Campos obligatorios |
|------|-----|---------------------|
| `tenant_profile` | Inquilino verificado reporta incidente | `profile_id`, `verified: true`, `verified_at` |
| `system_service` | Operación interna automatizada | `service_name` |

**Actor prohibido para incidencias:**

- `unverified_lead` — no puede reportar incidencias (no es residente)

---

## 3. Campos prohibidos en actor

```
identity_level, STRONG_MATCH_ACTIVE, PARTIAL_MATCH_ACTIVE,
MATCH_INACTIVE, NO_MATCH, UNVERIFIED_LEAD,
sender_ref, phone, email, jid, wa_jid, webchat_token
```

---

## 4. Idempotencia

- Scope: `${client_account_id}:${idempotency_key}`
- Respuesta 409 del add-on → `idempotent_replay: true`, no error
- La misma clave con diferente tenant → NO es replay

---

## 5. Campos prohibidos en resultado

El resultado del add-on no debe contener:

```
profile_id, phone, email, identity_data, raw_payload,
authorization, service_role, api_key, sql, sender_ref,
wa_jid, conv_session_id, conv_case_id
```

---

## 6. Manejo de errores

| Código HTTP | Semántica | Acción SC |
|-------------|-----------|-----------|
| 409 | Replay idempotente | ok: true, idempotent_replay: true |
| 429 | Rate limited | Esperar Retry-After, reintentar (máx 2) |
| 4xx | Error del cliente | ok: false, no reintentar |
| 5xx | Error del servidor | ok: false, reintentar (máx 2), circuit breaker |

---

## 7. Modos de integración

| Modo | Comportamiento |
|------|---------------|
| `mock` | Respuesta simulada local (offline) |
| `shadow` | No aplica para incidencias (operación mutable) |
| `canary` | Solo para tenant DEV-A |
| `real` | Producción (no activo en Fase 11C5) |
| `disabled` | Rechaza todas las llamadas (fail-closed) |

---

## 8. Seguridad

- Autenticación: `Authorization: Bearer ${INCIDENTS_ADDON_SERVICE_TOKEN}` (backend-to-backend)
- `INCIDENTS_ADDON_SERVICE_TOKEN` nunca se expone al frontend
- No se comparte `SUPABASE_SERVICE_ROLE_KEY` con el add-on
- No se crean claves foráneas entre el proyecto SC y el add-on
