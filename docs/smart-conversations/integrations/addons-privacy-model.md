# Modelo de privacidad — Add-ons (Fase 11C5)

---

## 1. Principios

- Los add-ons son proyectos externos — no reciben datos internos de SmartConversations.
- SmartConversations solo guarda referencias opacas del add-on (`incident_id`, `lead_id`).
- Los add-ons nunca reciben prompts de IA, transcripciones de conversación ni datos de tablas `conv_*`.

---

## 2. Campos prohibidos en comandos hacia add-ons

### Actor (todos los add-ons)

```
identity_level, STRONG_MATCH_ACTIVE, PARTIAL_MATCH_ACTIVE,
MATCH_INACTIVE, NO_MATCH, UNVERIFIED_LEAD,
sender_ref, phone, email, jid, wa_jid, webchat_token
```

### Incidencias — actor adicional

```
STRONG_MATCH_ACTIVE, PARTIAL_MATCH_ACTIVE, NO_MATCH,
MATCH_INACTIVE, phone_number, phone, sender_ref, wa_jid
```

### Listings — enums internos prohibidos

```
UNVERIFIED_LEAD (el enum, no el tipo 'unverified_lead')
```

---

## 3. Campos prohibidos en resultados del add-on

### Incidencias (resultado)

```
profile_id, phone, email, identity_data, raw_payload,
authorization, service_role, api_key, sql, sender_ref,
wa_jid, conv_session_id, conv_case_id
```

### Listings / Leads (resultado de búsqueda)

```
owner_id, owner_phone, owner_email, tenant_ids,
private_address, financial_data, internal_notes,
profile_id, phone, email, identity_data, raw_payload
```

---

## 4. Datos que SC guarda del resultado

| Operación | Referencia guardada |
|-----------|---------------------|
| `createIncident` | `incident_id` (opaco), `incident_reference` (visible) |
| `createLead` | `lead_id` (opaco), `lead_reference` (visible) |
| `searchListings` | `listing_id` por item (opaco) para siguiente operación |

---

## 5. Retención y logs

| Tipo de dato | Retención en SC |
|-------------|----------------|
| Comando al add-on | No se guarda el payload completo |
| Resultado del add-on | Solo referencias opacas |
| Errores | Código de error + `correlation_id`, sin payload |
| PII en logs | Prohibido — ni en éxito ni en error |

---

## 6. Frontera con n8n

- n8n no tiene acceso a los add-ons de incidencias ni publicaciones.
- Los add-ons no tienen acceso a n8n.
- Los workflows n8n (WF-20, WF-30) invocan las Edge Functions de SC, no los add-ons directamente.
- La EF de SC es quien decide si llama al adapter del add-on, después de validar el actor canónico.
