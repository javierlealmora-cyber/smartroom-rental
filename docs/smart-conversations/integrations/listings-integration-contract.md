# Contrato de integración — Add-on de Publicaciones (Fase 11C5)

**Versión:** 1.0  
**Puerto:** `ListingsIntegrationPort`  
**Archivo:** `listings-integration-port.ts`  
**Estado:** `DEV_CONFIGURATION_PENDING`

---

## 1. Operaciones

### `searchListings(query: SearchListingsQuery)`

Busca publicaciones disponibles según filtros.

**Entrada:**

```typescript
{
  contract_version: '1.0',
  client_account_id: string,
  request_id: string,
  correlation_id: string,
  filters: {
    location: string | null,
    price_min: number | null,
    price_max: number | null,
    room_type: string | null,
    move_in_date: string | null,   // ISO date
    preferences: string[],
  },
  pagination: {
    cursor: string | null,   // opaco
    limit: number,           // máx 50
  }
}
```

**Salida:**

```typescript
{
  ok: true,
  data: {
    items: Array<{
      listing_id: string,          // opaco
      reference: string,
      title: string,
      public_location: string,     // solo zona/ciudad pública
      price: { amount: number, currency: string },
      room_type: string,
      available_from: string | null,
      public_features: string[],
    }>,
    next_cursor: string | null,    // opaco — no inferir estructura
  },
  meta: { mode: string, duration_ms: number }
}
```

---

## 2. Campos privados NUNCA en resultado de búsqueda

```
owner_id, owner_phone, owner_email, tenant_ids,
private_address, financial_data, internal_notes
```

---

## 3. Modos de integración

| Modo | shadow_allowed |
|------|---------------|
| `mock` | N/A (offline) |
| `shadow` | Permitido (operación no mutable) |
| `canary` | Solo para tenant DEV-A |
| `real` | No activo en Fase 11C5 |
| `disabled` | fail-closed |

---

## 4. Actor para searchListings

Cualquier actor canónico válido. No se envían datos personales.
