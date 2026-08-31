# Core Features Contract — Fase 11C2

Adapter: `core-features-adapter.ts`
Endpoint Core: `GET /smartroom/conversations/tenant-features`

---

## Request

```
GET /smartroom/conversations/tenant-features?client_account_id=<uuid>
Authorization: Bearer <CORE_SERVICE_TOKEN>
X-Client-Account-Id: <client_account_id>
```

## Response canónico (TenantFeaturesResult)

```typescript
{
  smart_conversations: boolean;
  services: {
    conv_incidencias: boolean;
    conv_publicaciones: boolean;
    conv_ayuda: boolean;
  };
  channels: {
    webchat: boolean;
    whatsapp: boolean;
  };
}
```

---

## Fuente de verdad

`conv_service_activations` (tabla SmartConversations) es la fuente de verdad para activación técnica.
Core devuelve la allowlist de features contratadas; SmartConversations combina ambas.
Core **no** sustituye a `conv_service_activations`.

---

## Cache

- Cache en memoria aislada por `client_account_id`.
- `clearFeaturesCache(client_account_id?)` para invalidar.
- Sin cache compartido entre tenants.
- Sin persistencia: se limpia en cada reinicio.

---

## Cross-tenant guard

Toda respuesta Core verifica que `client_account_id` de la respuesta coincide con el solicitado.
Si no coincide → error `response_tenant_mismatch` (fail-closed).

---

## Comportamiento por modo

| Modo | Comportamiento |
|------|---------------|
| `mock` | Features simuladas (todas true) |
| `shadow` | Llama Core, devuelve mock al caller |
| `canary` | Real para `CANARY_ALLOWLIST` |
| `real` | Real (solo DEV) |
| `disabled` | Error inmediato |
