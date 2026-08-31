# SmartConversations — Core Contract Checklist

Contratos pendientes de confirmar con el equipo SmartRoom Core.
**Todos los paths son placeholders hasta confirmación.**

## Estado general

| Adapter | Operación | Path placeholder | Confirmado | Fecha |
|---|---|---|---|---|
| core-identity-client | `core.identity.validate` | `/smartroom/conversations/identity/validate` | ❌ Pendiente | — |
| core-incident-client | `core.incidents.create` | `/smartroom/conversations/incidents` | ❌ Pendiente | — |
| core-listings-client | `core.listings.query` | `/smartroom/conversations/listings/search` | ❌ Pendiente | — |
| core-lead-client | `core.leads.create` | `/smartroom/conversations/leads` | ❌ Pendiente | — |
| help-kb-client | `core.help.kb.query` | `/smartroom/conversations/help/kb/search` | ❌ Pendiente | — |
| core-help-ticket-client | `core.help.tickets.create` | `/smartroom/conversations/help/tickets` | ❌ Pendiente | — |

---

## 1. identity.validate

**Operación:** `core.identity.validate`
**Path placeholder:** `/smartroom/conversations/identity/validate`
**Método HTTP:** `POST`

### Request

```json
{
  "phone": "<teléfono — sensible, no loguear>",
  "profile_id": "<ID perfil — sensible, no loguear>",
  "identity_data": {
    "full_name": "<nombre>",
    "residence_name": "<nombre de residencia>",
    "room_label": "<etiqueta habitación>"
  }
}
```

**Campos obligatorios:** Al menos uno de `phone` o `profile_id` o `identity_data`
**Campos opcionales:** Cualquiera de los anteriores puede omitirse
**Header requerido:** `X-Client-Account-Id: <client_account_id>`

### Response esperado (2xx)

```json
{
  "identity_level": "STRONG_MATCH_ACTIVE | PARTIAL_MATCH_ACTIVE | MATCH_INACTIVE | NO_MATCH",
  "profile_id": "<ID del perfil si encontrado>",
  "assignment_id": "<ID de asignación si activo>",
  "room_id": "<ID de habitación si activo>",
  "room_label": "<etiqueta habitación>",
  "full_name": "<nombre del inquilino>"
}
```

### Códigos esperados

| Código | Escenario |
|---|---|
| 200 | Match encontrado o `NO_MATCH` confirmado |
| 400 | Request malformado |
| 401 | Token de servicio inválido |
| 403 | Sin permisos para el tenant |
| 500–503 | Error interno Core → adapter reintenta |

### Niveles de identidad del contrato

| Nivel | Significado | Permitido |
|---|---|---|
| `NO_MATCH` | Sin coincidencia | ✅ |
| `MATCH_INACTIVE` | Perfil encontrado, contrato inactivo | ✅ |
| `PARTIAL_MATCH_ACTIVE` | Coincidencia parcial, contrato activo | ✅ |
| `STRONG_MATCH_ACTIVE` | Coincidencia fuerte, contrato activo | ✅ |
| `UNVERIFIED_LEAD` | **Prohibido** — no forma parte del contrato SC | ❌ |
| `WEAK_MATCH` | **Prohibido** — no forma parte del contrato SC | ❌ |
| `UNVERIFIED` | **Prohibido** — no forma parte del contrato SC | ❌ |

> Si Core devuelve un nivel fuera del contrato, el adapter mapea a `NO_MATCH`.

### Campos sensibles — prohibidos en logs

- `phone`
- `profile_id`
- `identity_data` (completo)
- Header `Authorization`

### Pendiente confirmar con Core

- [ ] Path real del endpoint
- [ ] ¿Qué niveles devuelve Core realmente? ¿Solo los 4 del contrato?
- [ ] ¿Devuelve Core `profile_id` en respuesta siempre?
- [ ] ¿Devuelve Core `assignment_id` y `room_id`?
- [ ] Comportamiento cuando phone tiene formato inválido
- [ ] Límite de rate / throttling

---

## 2. incidents.create

**Operación:** `core.incidents.create`
**Path placeholder:** `/smartroom/conversations/incidents`
**Método HTTP:** `POST`

### Request

```json
{
  "conv_case_id": "<ID del caso SmartConversations>",
  "incident_type": "<tipo: plumbing|electric|heating|water|structural|other>",
  "urgency": "<urgencia: low|medium|high|critical>",
  "description": "<descripción — sensible, no loguear>",
  "source": "<canal: whatsapp|webchat>"
}
```

**Nota de arquitectura:** `profile_id` y `room_id` NO se envían desde este adapter. Son cargados internamente por `conv-core-create-incident` desde `conv_sessions`. El adapter solo recibe datos no-PII de la incidencia.

**Campos obligatorios:** `conv_case_id`, `incident_type`, `urgency`, `description`, `source`
**Header requerido:** `X-Client-Account-Id: <client_account_id>`

### Response esperado (2xx)

```json
{
  "incident_id": "<ID interno de la incidencia>",
  "incident_ref": "<referencia legible: INC-YYYY-NNNN>"
}
```

### Códigos esperados

| Código | Escenario |
|---|---|
| 200 o 201 | Incidencia creada |
| 400 | Tipo/urgencia inválidos o campos faltantes |
| 409 | Posible deduplicación (confirmar con Core) |
| 422 | Datos de validación incorrectos |
| 500–503 | Error interno Core → adapter reintenta |

### Campos sensibles — prohibidos en logs

- `description`
- Header `Authorization`

### Pendiente confirmar con Core

- [ ] Path real del endpoint
- [ ] ¿Devuelve 200 o 201 al crear?
- [ ] ¿Hay deduplicación por `conv_case_id`?
- [ ] Formato exacto de `incident_ref`
- [ ] ¿Tipos de incidencia soportados en Core?
- [ ] ¿Niveles de urgencia soportados en Core?

---

## 3. listings.query

**Operación:** `core.listings.query`
**Path placeholder:** `/smartroom/conversations/listings/search`
**Método HTTP:** `POST`

### Request

```json
{
  "channel": "<whatsapp|webchat>",
  "filters": {
    "location": "<ciudad o zona>",
    "budget_max": 800,
    "move_in_date": "2026-09-01",
    "room_type": "<individual|doble|estudio>"
  }
}
```

**Campos obligatorios:** `channel`
**Campos opcionales en filters:** Todos (`location`, `budget_max`, `move_in_date`, `room_type`)
**Header requerido:** `X-Client-Account-Id: <client_account_id>`

### Response esperado (2xx)

```json
{
  "listings": [
    {
      "listing_id": "<ID público del anuncio>",
      "listing_ref": "<referencia legible: HAB-NNNN>",
      "title": "<título del anuncio>",
      "public_location": "<zona pública>",
      "price": 650,
      "availability": "available|reserved|unavailable",
      "public_room_label": "<etiqueta de habitación pública>"
    }
  ]
}
```

### Campos prohibidos en response (no deben volver desde Core a EF)

| Campo | Razón |
|---|---|
| `assignment_id` | Referencia interna de contrato |
| `room_id` (interno) | ID interno de habitación |
| `exact_address` | Dirección exacta — privada hasta firma |

> El adapter filtra estos campos aunque Core los devuelva: solo se exponen los 7 campos públicos definidos en `PublicListing`.

### Códigos esperados

| Código | Escenario |
|---|---|
| 200 | Array de listings (puede ser vacío) |
| 400 | Canal inválido o filtros malformados |
| 422 | Validación de filtros fallida |
| 500–503 | Error interno Core → adapter reintenta |

### Pendiente confirmar con Core

- [ ] Path real del endpoint
- [ ] ¿Core devuelve `assignment_id` y `room_id` interno en la respuesta?
- [ ] ¿Qué campos devuelve Core exactamente?
- [ ] ¿Límite de resultados (paginación)?
- [ ] ¿Disponibilidad de filtro `move_in_date`?
- [ ] ¿Canales soportados en Core para listings?

---

## 4. leads.create

**Operación:** `core.leads.create`
**Path placeholder:** `/smartroom/conversations/leads`
**Método HTTP:** `POST`

### Request

```json
{
  "session_id": "<ID de sesión SmartConversations>",
  "conv_case_id": "<ID del caso>",
  "listing_id": "<ID del listing de interés>",
  "interest_type": "<request_visit|leave_contact|request_info>",
  "contact": {
    "name": "<nombre del interesado — sensible>",
    "phone": "<teléfono — sensible, no loguear>",
    "email": "<email — sensible, no loguear>"
  },
  "preferences": {
    "move_in_date": "2026-09-01",
    "budget_max": 700,
    "notes": "<notas adicionales — sensible>"
  },
  "source": "<whatsapp|webchat>"
}
```

**Campos obligatorios:** `session_id`, `conv_case_id`, `listing_id`, `interest_type`, `contact.name`, `source`
**Campos opcionales:** `contact.phone`, `contact.email`, `preferences`
**Header requerido:** `X-Client-Account-Id: <client_account_id>`

### Response esperado (2xx)

```json
{
  "lead_id": "<ID interno del lead>",
  "lead_ref": "<referencia legible: LEAD-YYYY-NNNN>"
}
```

### Campos sensibles — prohibidos en logs

- `contact.phone`
- `contact.email`
- `contact.name`
- `preferences.notes`
- Header `Authorization`

### Códigos esperados

| Código | Escenario |
|---|---|
| 200 o 201 | Lead creado |
| 400 | Campos obligatorios faltantes |
| 404 | `listing_id` no existe en Core |
| 422 | `interest_type` inválido |
| 500–503 | Error interno Core → adapter reintenta |

### Pendiente confirmar con Core

- [ ] Path real del endpoint
- [ ] ¿Devuelve 200 o 201?
- [ ] Formato exacto de `lead_ref`
- [ ] ¿Tipos de `interest_type` soportados?
- [ ] ¿Deduplicación por `session_id` o `listing_id`?
- [ ] ¿Requiere `contact.phone` o `contact.email` obligatoriamente?

---

## 5. help.kb.query

**Operación:** `core.help.kb.query`
**Path placeholder:** `/smartroom/conversations/help/kb/search`
**Método HTTP:** `POST`

### Request

```json
{
  "channel": "<whatsapp|webchat>",
  "question": "<pregunta o resumen seguro del usuario>",
  "topic": "<access|payments|contracts|maintenance|general — opcional>"
}
```

**Nota de privacidad:** `question` debe ser un safe_summary sin PII, no un mensaje literal del usuario.

**Campos obligatorios:** `channel`, `question`
**Campos opcionales:** `topic`
**Header requerido:** `X-Client-Account-Id: <client_account_id>`

### Response esperado (2xx)

```json
{
  "matches": [
    {
      "kb_id": "<ID del artículo KB>",
      "title": "<título>",
      "answer": "<respuesta pública>",
      "confidence": 0.92,
      "public": true
    }
  ]
}
```

> El adapter solo expone artículos con `public: true`. Artículos privados de Core son descartados.

### Códigos esperados

| Código | Escenario |
|---|---|
| 200 | Array de matches (puede ser vacío) |
| 400 | `question` vacía o canal inválido |
| 500–503 | Error interno Core → adapter reintenta |

### Pendiente confirmar con Core

- [ ] Path real del endpoint
- [ ] ¿Core devuelve campo `public` en cada match?
- [ ] ¿Qué ocurre si Core no tiene artículos para el tenant?
- [ ] ¿Límite de matches en respuesta?
- [ ] ¿Topics disponibles en Core?

---

## 6. help.tickets.create

**Operación:** `core.help.tickets.create`
**Path placeholder:** `/smartroom/conversations/help/tickets`
**Método HTTP:** `POST`

### Request

```json
{
  "session_id": "<ID de sesión>",
  "conv_case_id": "<ID del caso>",
  "topic": "<access|payments|contracts|maintenance|general>",
  "summary": "<resumen del problema — sensible, no loguear>",
  "source": "<webchat|whatsapp>"
}
```

**Campos obligatorios:** `session_id`, `conv_case_id`, `topic`, `summary`, `source`
**Header requerido:** `X-Client-Account-Id: <client_account_id>`

### Response esperado (2xx)

```json
{
  "help_ticket_id": "<ID interno del ticket>",
  "help_ticket_ref": "<referencia legible: HELP-YYYY-NNNN>"
}
```

### Campos sensibles — prohibidos en logs

- `summary`
- Header `Authorization`

### Códigos esperados

| Código | Escenario |
|---|---|
| 200 o 201 | Ticket creado |
| 400 | Campos faltantes o topic inválido |
| 409 | Posible deduplicación por `conv_case_id` |
| 422 | Validación fallida |
| 500–503 | Error interno Core → adapter reintenta |

### Pendiente confirmar con Core

- [ ] Path real del endpoint
- [ ] ¿Devuelve 200 o 201?
- [ ] Formato exacto de `help_ticket_ref`
- [ ] ¿Topics soportados?
- [ ] ¿Deduplicación por `conv_case_id`?

---

## Mapping contrato interno → Core

| Campo interno (SmartConversations) | Campo Core (placeholder) | Confirmado |
|---|---|---|
| `conv_case_id` | `conv_case_id` | ❌ |
| `identity_level` | `identity_level` | ❌ |
| `incident_id` | `incident_id` | ❌ |
| `incident_ref` | `incident_ref` | ❌ |
| `listing_id` | `listing_id` | ❌ |
| `listing_ref` | `listing_ref` | ❌ |
| `lead_id` | `lead_id` | ❌ |
| `lead_ref` | `lead_ref` | ❌ |
| `help_ticket_id` | `help_ticket_id` | ❌ |
| `help_ticket_ref` | `help_ticket_ref` | ❌ |
| `kb_id` | `kb_id` | ❌ |

**Acción requerida:** Confirmar nombres de campos con equipo Core antes de activar modo real.

## Proceso de confirmación

Para marcar un endpoint como confirmado:

1. Obtener spec OpenAPI o Swagger de Core sandbox
2. Verificar path, método, y campos de request/response
3. Ejecutar smoke test en sandbox con `CORE_SMOKE_ENABLED=true`
4. Actualizar esta checklist con fecha de confirmación
5. Actualizar `CORE_OPERATION_PATHS` en `core-http-client.ts` si el path difiere del placeholder
6. Actualizar adapters si los nombres de campos difieren
