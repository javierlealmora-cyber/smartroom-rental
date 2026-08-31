# Integration Contract Catalog — SmartConversations Fase 11C1

## Contrato canónico universal

Todas las integraciones devuelven `IntegrationResult<T>`:

### Success
```json
{
  "ok": true,
  "data": {},
  "meta": {
    "request_id": "uuid",
    "correlation_id": "uuid",
    "provider": "safe-name",
    "mode": "mock | shadow | canary | real | disabled",
    "duration_ms": 0,
    "idempotent_replay": false
  }
}
```

### Error
```json
{
  "ok": false,
  "error": {
    "code": "CANONICAL_ERROR_CODE",
    "message": "Mensaje seguro sin PII ni secretos",
    "retryable": false,
    "retry_after_seconds": null
  },
  "meta": {
    "request_id": "uuid",
    "correlation_id": "uuid",
    "provider": "safe-name",
    "mode": "canary"
  }
}
```

**Prohibido en respuestas:** stack trace, respuesta raw del proveedor, prompt, secretos, tokens, URLs privadas, PII, SQL.

---

## Contratos por integración

### Core — conv-core-validate-identity

**Input:**
```typescript
{ client_account_id: string; channel: 'whatsapp' | 'webchat'; sender_ref_hash: string; }
```
**Output:**
```typescript
{ match: 'STRONG_MATCH_ACTIVE' | 'PARTIAL_MATCH_ACTIVE' | 'NO_MATCH' | 'MATCH_INACTIVE'; profile_id: string | null; }
```
No enviar: phone_number, raw_payload, full_name.

---

### IA — ai-client

**Input (safe_input única fuente de texto):**
```typescript
{ operation: AiOperation; safe_input: string; language: string; output_schema: object; }
```
**Output (validado contra schema):**
```typescript
{ intent?: string; confidence?: number; extracted?: object; summary?: string; draft?: string; }
```
No enviar: profile_id, phone, sender_ref, identity_data, raw_payload, token.
La IA no recibe el enum de identidad. La IA no decide nada de negocio.

---

### n8n — n8n-adapter

**Input:**
```typescript
{
  workflow: AllowedWorkflow;  // wf10|wf20|wf30|wf40|wf91|wf92
  client_account_id: string;
  correlation_id: string;
  idempotency_key: string;
  payload: SafePayload;  // sin profile_id, phone, sender_ref, raw_payload
}
```
**Output:**
```typescript
{ workflow: string; execution_id: string; status: 'queued' | 'running' | 'completed' | 'failed'; }
```

---

### Add-on Incidencias — incidents-addon-adapter

**CreateIncidentCommand:**
```json
{
  "client_account_id": "uuid",
  "correlation_id": "conv_case_id",
  "idempotency_key": "uuid",
  "source": "smart_conversations",
  "actor": {
    "type": "tenant_profile",
    "profile_id": "uuid",
    "identity_verified": true
  },
  "incident_data": {
    "accommodation_id": "uuid",
    "room_id": "uuid|null",
    "category": "string",
    "description": "string",
    "urgency": "low|medium|high|critical"
  }
}
```
**Prohibido en actor:** STRONG_MATCH_ACTIVE, phone, sender_ref, wa_jid.
**CreateIncidentResult:** `{ incident_id, incident_ref, status, idempotent }`

---

### Add-on Anuncios — listings-addon-adapter

**SearchListingsQuery:**
```typescript
{ client_account_id: string; correlation_id: string; filters: { city?, max_price?, cursor?, page_size? }; actor: ListingActor; }
```
**Actor para lead no verificado:** `{ type: 'unverified_lead' }` — NUNCA el enum `UNVERIFIED_LEAD`.

**CreateLeadCommand:**
```typescript
{ client_account_id, idempotency_key, source: 'smart_conversations', actor: ListingActor, listing_id, contact: { name? } }
```
**CreateLeadResult:** `{ lead_id, lead_ref, status, idempotent }`

---

### Realtime — webchat-realtime-client

- Canal privado por session_id (no enumerable).
- Evento solo notifica — sin message_text ni contenido.
- El evento dispara polling para recuperar el contenido.

---

### Wasender — wasender-http-client

**Outbound:**
```typescript
{ client_account_id, wa_session_id, recipient_ref, text }  // text es sensible, no loguear
```
**Inbound (webhook):** Validado por HMAC + timestamp antes de ingest.
JID `@s.whatsapp.net` nunca se persiste en `conv_sessions` ni `conv_messages`.

---

## Política de idempotencia por integración

| integración | operación | campo de idempotencia | comportamiento en retry |
|------------|-----------|---------------------|------------------------|
| core | identity.validate | N/A (lectura) | Safe to retry |
| ai | classify/extract | N/A (sin estado) | Safe to retry |
| n8n | todos | idempotency_key + X-Idempotency-Key | Same result guaranteed |
| incidents_addon | create | idempotency_key + Idempotency-Key header | 409 → incident_id existente |
| listings_addon | lead.create | idempotency_key + Idempotency-Key header | 409 → lead_id existente |
| realtime | subscribe | N/A | Safe to retry |
| wasender | send | idempotency_key | provider_message_id único |
