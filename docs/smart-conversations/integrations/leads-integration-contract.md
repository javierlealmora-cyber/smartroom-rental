# Contrato de integración — Leads (Add-on de Publicaciones, Fase 11C5)

**Versión:** 1.0  
**Operación:** `createLead`  
**Puerto:** `ListingsIntegrationPort`  
**Estado:** `DEV_CONFIGURATION_PENDING`

---

## 1. Operación createLead

```typescript
{
  contract_version: '1.0',
  client_account_id: string,
  request_id: string,
  correlation_id: string,
  idempotency_key: string,
  source: 'smart_conversations',
  actor: CanonicalActor,     // unverified_lead | tenant_profile | system_service
  lead: {
    listing_id: string | null,
    search_context: Record<string, string | number | boolean | null>,
    contact_preferences: Record<string, string | boolean | null>,
    message_summary: string | null,   // sanitizado, ≤1000 chars
  }
}
```

**Salida:**

```typescript
{
  ok: true,
  data: {
    lead_id: string,              // referencia opaca — SC guarda solo esto
    lead_reference: string | null,
    status: string,
    created_at: string,           // ISO-8601
    idempotent_replay: boolean,
  },
  meta: { mode: string, duration_ms: number, idempotent_replay: boolean }
}
```

---

## 2. Actor para createLead

| Tipo | Uso |
|------|-----|
| `unverified_lead` | Prospecto no verificado (más común en leads) |
| `tenant_profile` | Inquilino verificado buscando alternativa |
| `system_service` | Operación automatizada |

**Actor NUNCA envía:**

- El enum interno `UNVERIFIED_LEAD` (tipo distinto del type `unverified_lead`)
- `phone`, `email`, `sender_ref`, `wa_jid`, `identity_level`
- El add-on solicita datos de contacto por su propio flujo si los necesita

---

## 3. Idempotencia

- Scope: `${client_account_id}:${idempotency_key}`
- Respuesta 409 → `idempotent_replay: true`

---

## 4. Seguridad

- Auth: `Authorization: Bearer ${LISTINGS_ADDON_SERVICE_TOKEN}`
- No se comparte `SUPABASE_SERVICE_ROLE_KEY`
- No se crean FKs entre proyecto SC y add-on de publicaciones
