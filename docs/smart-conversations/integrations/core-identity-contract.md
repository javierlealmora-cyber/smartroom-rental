# Core Identity Contract — Fase 11C2

Adapter: `core-identity-adapter.ts`
Endpoint Core: `POST /smartroom/conversations/identity/validate`

---

## Identity Levels (4 únicos — inmutables)

| Nivel | Descripción |
|-------|-------------|
| `NO_MATCH` | No hay coincidencia con ningún perfil activo |
| `MATCH_INACTIVE` | Coincide pero el perfil está inactivo |
| `PARTIAL_MATCH_ACTIVE` | Coincidencia parcial con perfil activo |
| `STRONG_MATCH_ACTIVE` | Coincidencia fuerte con perfil activo |

**Prohibido introducir**: `WEAK_MATCH`, `UNVERIFIED` standalone, nuevos estados.

---

## Request canónico (IdentityRequest)

```typescript
{
  client_account_id: string;   // UUID del tenant
  correlation_id: string;      // ID de correlación único por conversación
  identity_input: {
    provided_name?: string;
    provided_phone?: string;   // solo EF interna, nunca a orquestadores externos o logs
    accommodation_reference?: string;
    room_reference?: string;
  }
}
```

## Response canónico (IdentityResult)

```typescript
{
  identity_level: IdentityLevel;
  profile_id?: string;         // nunca a orquestadores externos
  matched_fields: string[];
  missing_fields: string[];
}
```

---

## Campos prohibidos en request (IDENTITY_REQUEST_FORBIDDEN_FIELDS)

`conversation`, `raw_payload`, `jid`, `wa_jid`, `webchat_token`, `prompt`,
`full_name`, `authorization`, `service_role`, `provider_payload`, `messages`,
`phone_number`, `email`, `sender_ref`, `identity_data`.

---

## Headers requeridos

```
Authorization: Bearer <CORE_SERVICE_TOKEN>
Content-Type: application/json
X-Client-Account-Id: <client_account_id>
X-Request-Id: <correlation_id>
X-Source: smart_conversations
```

---

## Comportamiento por modo

| Modo | Comportamiento |
|------|---------------|
| `mock` | Devuelve `NO_MATCH` simulado |
| `shadow` | Llama Core pero devuelve mock al caller |
| `canary` | Real solo para `CANARY_ALLOWLIST` |
| `real` | Real (solo DEV + target guard) |
| `disabled` | Error inmediato |

---

## Retry técnico vs intento conversacional

Un retry HTTP (por timeout o error transitorio) **no** cuenta como un nuevo intento de identificación conversacional.
Variables prohibidas: `next_retry_at`, `attempt_count`.
