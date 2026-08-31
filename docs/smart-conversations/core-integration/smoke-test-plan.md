# SmartConversations — Core Smoke Test Plan

Plan de validación controlada contra el entorno sandbox/staging del SmartRoom Core.
**No conectar producción. No usar credenciales reales en código.**

## Objetivos

Validar que los 6 adapters Core (modo real) se comportan correctamente contra el Core sandbox antes de activar en producción. Todos los smoke tests son opcionales: el sistema funciona en mock por defecto y no requiere Core real para operar.

## Modelo de seguridad

```
default:  CORE_INTEGRATION_MODE=mock   → sin fetch, sin credenciales
smoke:    CORE_SMOKE_ENABLED=true      → activa el runner en sandbox
prod:     bloqueada salvo CORE_SMOKE_ALLOW_PRODUCTION=true (excepcional)
```

El runner `scripts/smart-conversations/core-smoke.ts` nunca llama a Core si `CORE_SMOKE_ENABLED` no es exactamente `"true"`. Si la URL de `CORE_BASE_URL` parece producción (contiene dominios de producción conocidos), el runner aborta a menos que `CORE_SMOKE_ALLOW_PRODUCTION=true`.

## Variables requeridas para smoke real

```dotenv
# Control principal — debe ser exactamente "true"
CORE_SMOKE_ENABLED=true

# Modo real del adapter
CORE_INTEGRATION_MODE=real

# URL sandbox/staging — NO usar URL de producción
CORE_BASE_URL=https://core.sandbox.your-instance.example.com

# Token de servicio sandbox — NO usar token de producción
CORE_SERVICE_TOKEN=REPLACE_WITH_SANDBOX_TOKEN

# Tenant de prueba sandbox
CORE_SMOKE_CLIENT_ACCOUNT_ID=tenant_smoke_test

# Datos de prueba opcionales (si no se dan, el test usa valores genéricos)
CORE_SMOKE_PROFILE_ID=prof_smoke_test_001
CORE_SMOKE_PHONE=+34600000099
CORE_SMOKE_LISTING_ID=lst_smoke_test_001
```

**Nunca commitear valores reales. Usar archivo local no versionado.**

## Adapters a validar (6 operaciones)

| # | Operación | Adapter | Path placeholder | Estado |
|---|---|---|---|---|
| 1 | `core.identity.validate` | `core-identity-client.ts` | `/smartroom/conversations/identity/validate` | Pendiente confirmar con equipo Core |
| 2 | `core.incidents.create` | `core-incident-client.ts` | `/smartroom/conversations/incidents` | Pendiente confirmar con equipo Core |
| 3 | `core.listings.query` | `core-listings-client.ts` | `/smartroom/conversations/listings/search` | Pendiente confirmar con equipo Core |
| 4 | `core.leads.create` | `core-lead-client.ts` | `/smartroom/conversations/leads` | Pendiente confirmar con equipo Core |
| 5 | `core.help.kb.query` | `help-kb-client.ts` | `/smartroom/conversations/help/kb/search` | Pendiente confirmar con equipo Core |
| 6 | `core.help.tickets.create` | `core-help-ticket-client.ts` | `/smartroom/conversations/help/tickets` | Pendiente confirmar con equipo Core |

> Los paths actuales en `CORE_OPERATION_PATHS` son placeholders. Actualizar en `core-http-client.ts` cuando el equipo Core confirme los endpoints reales.

## Plan por adapter

### 1. identity.validate

**Flujo happy path:**
1. Enviar `{ phone: CORE_SMOKE_PHONE, client_account_id: CORE_SMOKE_CLIENT_ACCOUNT_ID }`
2. Esperar respuesta con `identity_level` en `{NO_MATCH, MATCH_INACTIVE, PARTIAL_MATCH_ACTIVE, STRONG_MATCH_ACTIVE}`
3. Verificar que la respuesta no contiene niveles prohibidos: `UNVERIFIED_LEAD`, `WEAK_MATCH`, `UNVERIFIED` standalone

**Validaciones críticas:**
- `identity_level` siempre presente en respuesta
- Niveles fuera del contrato → el adapter mapea a `NO_MATCH` (validado en RT-50..RT-52)
- `phone` nunca aparece en logs del runner

**Datos de prueba sandbox necesarios:**
- Perfil activo con teléfono conocido → para obtener `STRONG_MATCH_ACTIVE`
- Teléfono sin match → para obtener `NO_MATCH`
- Perfil inactivo → para obtener `MATCH_INACTIVE`

**Nota de privacidad:** `phone`, `profile_id`, `identity_data` — clasificados sensibles. El runner debe omitirlos de cualquier output de log.

---

### 2. incidents.create

**Flujo happy path:**
1. Enviar `{ client_account_id, conv_case_id, incident_type, urgency, description, source }`
2. Esperar `{ incident_id, incident_ref }`
3. Verificar que `incident_ref` sigue el formato del Core (`INC-YYYY-NNNN` u otro)

**Validaciones críticas:**
- `profile_id` y `room_id` NO se envían desde este adapter — se inyectan internamente por `conv-core-create-incident` desde `conv_sessions`
- `description` nunca aparece en logs
- Verificar idempotencia si Core la ofrece

**Datos de prueba sandbox necesarios:**
- `conv_case_id` de prueba existente en sandbox

---

### 3. listings.query

**Flujo happy path:**
1. Enviar `{ client_account_id, channel: 'whatsapp', filters: { location: 'Madrid' } }`
2. Esperar array de `PublicListing`
3. Verificar que cada listing contiene: `listing_id`, `listing_ref`, `title`, `public_location`, `price`, `availability`, `public_room_label`
4. Verificar que ningún listing contiene: `assignment_id`, `room_id` (interno), `exact_address`

**Validaciones críticas:**
- Filtrado de campos internos es responsabilidad del adapter (mapeado explícito en `realCoreListingsClient`)
- Datos privados de tenencia no deben ser accesibles desde este endpoint

**Datos de prueba sandbox necesarios:**
- Al menos 1 listing activo en el tenant de prueba con location conocida

---

### 4. leads.create

**Flujo happy path:**
1. Enviar `{ client_account_id, session_id, conv_case_id, listing_id, interest_type, contact: { name }, source }`
2. Esperar `{ lead_id, lead_ref }`
3. Verificar formato de `lead_ref`

**Validaciones críticas:**
- `contact.phone` y `contact.email` nunca aparecen en logs
- `contact` no se reenvía a Activity Log ni a n8n
- `CORE_SMOKE_LISTING_ID` debe referenciar un listing válido en sandbox

**Datos de prueba sandbox necesarios:**
- `listing_id` activo en sandbox (`CORE_SMOKE_LISTING_ID`)
- `conv_case_id` de prueba

---

### 5. help.kb.query

**Flujo happy path:**
1. Enviar `{ client_account_id, channel, question: 'pregunta de prueba genérica' }`
2. Esperar `{ matches: KbMatch[] }`
3. Verificar que `matches` solo contiene artículos con `public: true`
4. Verificar campos: `kb_id`, `title`, `answer`, `confidence`

**Validaciones críticas:**
- El adapter filtra `public: true` en el response de Core
- `question` puede ser genérica — no debe contener datos del usuario real

**Datos de prueba sandbox necesarios:**
- Al menos 1 artículo KB público en el tenant sandbox

---

### 6. help.tickets.create

**Flujo happy path:**
1. Enviar `{ client_account_id, session_id, conv_case_id, topic, summary, source }`
2. Esperar `{ help_ticket_id, help_ticket_ref }`
3. Verificar formato de `help_ticket_ref`

**Validaciones críticas:**
- `summary` nunca se loguea (es sensible)
- `summary` de prueba debe ser genérico y no contener datos de usuario real

**Datos de prueba sandbox necesarios:**
- `conv_case_id` de prueba existente en sandbox

---

## Flujo de ejecución del runner

```
scripts/smart-conversations/core-smoke.ts

1. Leer CORE_SMOKE_ENABLED
   └─ si != "true" → imprimir "smoke disabled" → salir sin error

2. Validar CORE_BASE_URL
   ├─ si vacía → error controlado, salir
   └─ si parece producción → error salvo CORE_SMOKE_ALLOW_PRODUCTION=true

3. Validar CORE_INTEGRATION_MODE=real
   └─ si != "real" → error controlado

4. Validar CORE_SERVICE_TOKEN
   └─ si vacío → error controlado (no loguear el valor)

5. Para cada adapter (6):
   ├─ dry-run: imprimir "would call <operation>" sin fetch
   └─ real: llamar buildXxxClient('real').method(datos_prueba)

6. Imprimir resumen: N/6 passed, errores controlados
   └─ nunca imprimir tokens, phone, profile_id, contact, summary en output
```

## Política de privacidad del runner

Los siguientes valores nunca deben aparecer en stdout/stderr del runner:

- `CORE_SERVICE_TOKEN` (ni el header `Authorization`)
- `CORE_SMOKE_PHONE`
- `CORE_SMOKE_PROFILE_ID`
- Cualquier campo `contact` / `email` / `name` de datos de prueba
- Campos `description`, `summary`, `identity_data`, `raw_payload`

Los IDs de resultado (`incident_id`, `lead_id`, `help_ticket_id`) sí pueden imprimirse — son referencias de gestión, no PII.

## Detección de URL de producción

El runner considera "producción" cualquier URL que contenga los patrones configurados en `PRODUCTION_URL_PATTERNS` dentro de `core-smoke.ts`. Esos patrones incluyen los dominios de producción reales del proyecto (no se listan aquí por seguridad).

Para sobreescribir (solo en emergencias documentadas): `CORE_SMOKE_ALLOW_PRODUCTION=true`

## Antes de ejecutar smoke real

Checklist de precondición:

- [ ] Se ha coordinado con el equipo Core la disponibilidad del sandbox
- [ ] Los paths de `CORE_OPERATION_PATHS` han sido confirmados con el equipo Core
- [ ] `CORE_SERVICE_TOKEN` es un token sandbox, no producción
- [ ] `CORE_SMOKE_CLIENT_ACCOUNT_ID` es un tenant de prueba aislado
- [ ] Se han preparado datos de prueba en el tenant sandbox
- [ ] El equipo está al tanto de la ejecución (smoke puede crear incidencias/leads de prueba en Core)
- [ ] Se ha acordado un procedimiento de limpieza de datos de prueba en Core sandbox

## Próximos pasos pendientes

1. Confirmar paths reales con equipo Core (actualmente son placeholders)
2. Obtener token de servicio sandbox
3. Preparar tenant de prueba aislado en Core sandbox
4. Actualizar `CORE_OPERATION_PATHS` en `core-http-client.ts` con paths confirmados
5. Ejecutar runner en dry-run primero: `CORE_SMOKE_ENABLED=true CORE_INTEGRATION_MODE=mock`
6. Ejecutar runner en real: `CORE_SMOKE_ENABLED=true CORE_INTEGRATION_MODE=real CORE_BASE_URL=<sandbox>`
7. Documentar resultados y abrir tickets para discrepancias de contrato
