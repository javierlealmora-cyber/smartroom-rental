# rules-70-integration-api.md — SmartConversations: Integration API

## 1. Propósito

Este documento define la capa de Integration API como el único mecanismo permitido de comunicación entre el add-on SmartConversations y SmartRoom Core. Establece los contratos de cada endpoint, sus precondiciones, autenticación, errores posibles y reglas de versionado.

El principio fundamental es absoluto: el add-on nunca accede directamente a las tablas de SmartRoom Core. Toda interacción con el Core se realiza a través de las Edge Functions `conv-core-*` definidas en este documento.

---

## 2. Alcance

Este documento aplica a:

- Todas las Edge Functions con prefijo `conv-core-*`
- Todos los workflows de n8n que llaman a estas EFs
- Toda EF del add-on que necesite datos del Core
- Cualquier componente que tome decisiones de negocio basadas en datos del Core

---

## 3. Decisiones No Negociables

1. **Ningún componente del add-on puede acceder directamente a tablas de SmartRoom Core.** Ningún `SELECT`, `INSERT`, `UPDATE` ni `DELETE` sobre tablas del Core desde código del add-on. Sin excepción.

2. **Las EFs `conv-core-*` son el único contrato oficial entre add-on y Core.** Si un dato del Core no está disponible a través de alguna de estas EFs, el add-on no puede acceder a él.

3. **La autenticación para las llamadas a la Integration API usa `service_role`.** Nunca `anon` ni JWTs de usuario final.

4. **Los errores del Core nunca se propagan al usuario final.** Las EFs deben traducir los errores del Core en respuestas seguras y gestionar los reintentos internamente.

5. **Ninguna EF de Integration API puede modificar datos del Core sin haber verificado las precondiciones.** Todas las operaciones de escritura tienen precondiciones definidas en este documento.

6. **Las EFs de Integration API son cajas negras para sus consumidores.** n8n y los workflows de servicio no deben asumir la implementación interna de ninguna `conv-core-*`.

---

## 4. Reglas Obligatorias

### 4.1 Regla de acceso exclusivo a través de Integration API

Cualquier PR que introduzca acceso directo a tablas del Core desde el add-on debe rechazarse en revisión. El rechazo aplica a:
- Queries SQL directas a tablas del Core
- Llamadas a funciones del Core sin pasar por las EFs `conv-core-*`
- Uso de RPC de Supabase sobre tablas del Core desde n8n o desde código del add-on

### 4.2 `conv-core-get-tenant-features`

**Propósito:** devuelve los servicios activos del tenant y los límites de plan.

**Caller:** n8n WF-10. También puede ser llamado por cualquier EF que necesite verificar activaciones.

**Request:**
```json
{ "client_account_id": "<uuid>" }
```

**Response:**
```json
{
  "services_active": [
    { "service_code": "conv_incidencias", "channels": ["whatsapp", "webchat"] },
    { "service_code": "conv_ayuda",       "channels": ["whatsapp"] }
  ],
  "plan_limits": {
    "max_cases_per_month": 100,
    "ai_enabled": true
  }
}
```

**Precondiciones:** `client_account_id` debe existir en `client_accounts`.

**Errores:**

| Código | Causa |
|---|---|
| `200` | Éxito. Si el tenant no tiene servicios activos, `services_active` es `[]`. |
| `404` | `client_account_id` no existe en el Core. |
| `500` | Error interno del Core. |

**Regla:** WF-10 debe llamar a esta EF al inicio de cada ejecución. Nunca cachear el resultado entre ejecuciones.

### 4.3 `conv-core-validate-identity`

**Propósito:** determina el nivel de identidad de un usuario basándose en los datos proporcionados.

**Caller:** `conv-ingest` (fast-path WhatsApp), `conv-web-session` (JWT del portal lodger), WF-IDENTITY (flujo progresivo), WF-20 (verificación previa a incidencia oficial).

**Request:**
```json
{
  "client_account_id": "<uuid>",
  "profile_id":        "<uuid, opcional>",
  "phone":             "<string, opcional>",
  "full_name":         "<string, opcional>",
  "residence_name":    "<string, opcional>",
  "room_label":        "<string, opcional>"
}
```

Al menos uno de `profile_id`, `phone`, `full_name`, `residence_name` o `room_label` debe estar presente. `profile_id` se usa exclusivamente en el fast-path de WebChat cuando `conv-web-session` ha resuelto el JWT del portal lodger; en ese caso los demás campos son ignorados.

**Response:** véase `contract-identity-validation-result.md` para la estructura completa.

**Precondiciones:** `client_account_id` debe tener suscripción umbrella activa.

**Errores:**

| Código | Causa |
|---|---|
| `200` | Éxito (cualquier nivel, incluyendo `NO_MATCH`). |
| `400` | Falta `client_account_id` o ningún campo de identificación. |
| `403` | El tenant no tiene suscripción `smart_conversations` activa. |
| `404` | `client_account_id` no existe en el Core. |
| `500` | Error interno del Core. |

**Regla de propagación:** `profile_id`, `assignment_id`, `room_id`, `room_label` y `full_name` de la respuesta son almacenados en `conv_sessions` por la EF receptora. Solo `identity_level` puede reenviarse a n8n.

### 4.4 `conv-core-create-incident`

**Propósito:** crea una incidencia oficial en SmartRoom Core.

**Caller:** n8n WF-20 (tras verificar `STRONG_MATCH_ACTIVE`).

**Precondición obligatoria:** `profile_id` debe tener una asignación activa en `room_id`. Si no se cumple, la EF devuelve HTTP 422.

**Request:**
```json
{
  "client_account_id": "<uuid>",
  "profile_id":        "<uuid>",
  "room_id":           "<uuid>",
  "description":       "<string>",
  "incident_type":     "maintenance | security | noise | billing | other",
  "urgency":           "low | medium | high",
  "source":            "whatsapp | webchat",
  "conv_case_id":      "<uuid>"
}
```

**Response:**
```json
{
  "incident_id":                "<uuid>",
  "incident_ref":               "INC-2026-NNNN",
  "estimated_response_hours":   24
}
```

**Errores:**

| Código | Causa |
|---|---|
| `200` | Incidencia creada con éxito. |
| `400` | Campos obligatorios ausentes o formato inválido. |
| `403` | El tenant no tiene permisos para crear incidencias. |
| `404` | `client_account_id`, `profile_id` o `room_id` no existen. |
| `422` | Precondición no cumplida: `profile_id` no tiene asignación activa en `room_id`. |
| `500` | Error interno del Core. |

**Regla:** la EF debe publicar `conv_incident_created` al activity log del Core únicamente después de recibir HTTP 200. Los errores 4xx/5xx deben registrarse en los logs del add-on y devolver el contexto al workflow llamante para escalada.

### 4.5 `conv-core-lookup-listing`

**Propósito:** busca anuncios de habitaciones en SmartRoom Core.

**Caller:** n8n WF-30.

**Request:**
```json
{
  "client_account_id": "<uuid>",
  "reference":         "<string, opcional>",
  "residence_name":    "<string, opcional>",
  "accommodation_id":  "<uuid, opcional>",
  "room_features": {
    "min_price":  "<number, opcional>",
    "max_price":  "<number, opcional>",
    "room_type":  "<string, opcional>"
  }
}
```

**Response:**
```json
{
  "listings": [
    {
      "listing_id":         "<uuid>",
      "room_id":            "<uuid>",
      "room_label":         "204-A",
      "accommodation_name": "Residencia La Paloma",
      "price_monthly":      450.00,
      "availability_date":  "2026-07-01",
      "conditions_summary": "Contrato mínimo 6 meses. Incluye suministros.",
      "is_available":       true,
      "images_count":       4
    }
  ]
}
```

**Regla de datos:** `listings` contiene solo datos públicos. No incluye datos de inquilinos actuales, historial de ocupación ni condiciones contractuales detalladas. Si se añaden campos sensibles en el futuro, deben declararse explícitamente como no públicos.

**Errores:**

| Código | Causa |
|---|---|
| `200` | Éxito. `listings: []` si no hay resultados. |
| `400` | Request inválido (sin criterios de búsqueda). |
| `404` | `client_account_id` no existe. |
| `500` | Error interno del Core. |

### 4.6 `conv-core-create-lead`

**Propósito:** registra un lead o interés comercial en SmartRoom Core.

**Caller:** n8n WF-30.

**Request:**
```json
{
  "client_account_id": "<uuid>",
  "listing_id":        "<uuid>",
  "contact": {
    "name":   "<string, obligatorio>",
    "phone":  "<string, opcional>",
    "email":  "<string, opcional>"
  },
  "message":           "<string>",
  "source":            "whatsapp | webchat",
  "conv_case_id":      "<uuid>",
  "interest_type":     "immediate | future"
}
```

Al menos uno de `contact.phone` o `contact.email` debe estar presente.

**Response:**
```json
{
  "lead_id":  "<uuid>",
  "lead_ref": "LEAD-2026-NNNN"
}
```

**Errores:**

| Código | Causa |
|---|---|
| `200` | Lead creado con éxito. |
| `400` | Campos obligatorios ausentes (name, listing_id) o ni phone ni email. |
| `404` | `client_account_id` o `listing_id` no existen. |
| `500` | Error interno del Core. |

### 4.7 `conv-core-get-accommodation-info`

**Propósito:** valida que una residencia existe para el tenant y obtiene información básica.

**Caller:** WF-IDENTITY (flujo de identificación progresiva, paso de validación de residencia).

**Request:**
```json
{
  "client_account_id": "<uuid>",
  "residence_name":    "<string, opcional>"
}
```

**Response:**
```json
{
  "accommodations": [
    {
      "accommodation_id":      "<uuid>",
      "name":                  "Residencia La Paloma",
      "address":               "Calle Mayor 10, Madrid",
      "rooms_count":           40,
      "available_rooms_count": 5
    }
  ]
}
```

**Regla:** si `residence_name` está presente, filtra por nombre aproximado. Si está ausente, devuelve todas las residencias del tenant.

### 4.8 `conv-core-publish-activity`

**Propósito:** publica un evento de hito funcional en el activity log de SmartRoom Core. Es el único mecanismo autorizado para que las EFs del add-on escriban en el activity log del Core.

**Caller:** las EFs del add-on responsables de publicar eventos según la tabla de publishers de `rules-75-activity-log.md` §4.2. Nunca n8n directamente.

**Política fire-and-log:** si la llamada falla (cualquier código ≠ 200), la EF llamante registra el error en sus logs internos pero **no hace rollback** de la operación principal que ya completó. La publicación es una responsabilidad secundaria; nunca bloquea la operación de negocio.

**Regla de orden:** la EF llamante debe invocar `conv-core-publish-activity` únicamente después de que la operación principal haya completado con éxito. Nunca antes de confirmar ese éxito.

**Request:**
```json
{
  "client_account_id": "<uuid>",
  "event_type":        "<string>",
  "payload":           { }
}
```

`event_type` debe ser uno de los valores definidos en `rules-75-activity-log.md` §4.2. El `payload` debe conformarse al esquema definido para ese tipo de evento en `rules-75-activity-log.md` §4.3–§4.10. El `payload` nunca debe incluir PII (véase `rules-80-data-and-privacy.md` §4.1).

**Ejemplo de request — `conv_incident_created`:**
```json
{
  "client_account_id": "a1b2c3d4-e5f6-7890-abcd-ef0123456789",
  "event_type":        "conv_incident_created",
  "payload": {
    "incident_id":   "9f8e7d6c-5b4a-3c2d-1e0f-abcdef123456",
    "incident_ref":  "INC-2026-0042",
    "conv_case_id":  "c1a2b3c4-d5e6-7f89-abcd-ef0123456789",
    "channel":       "whatsapp",
    "incident_type": "maintenance",
    "urgency":       "medium"
  }
}
```

Este `payload` corresponde exactamente al esquema de `conv_incident_created` definido en `rules-75-activity-log.md` §4.4. Cualquier otro tipo de evento debe construir su `payload` siguiendo el esquema específico de ese evento en el mismo documento, no este ejemplo.

**Response (éxito):**
```json
{ "published": true, "event_id": "<uuid>" }
```

**Errores:**

| Código | Causa | Tratamiento en la EF llamante |
|---|---|---|
| `200` | Evento publicado con éxito | — |
| `400` | `event_type` desconocido o `payload` inválido para ese tipo | Registrar en logs; no reintentar |
| `403` | Tenant sin suscripción umbrella activa | Registrar en logs; no reintentar |
| `500` | Error interno del Core | Registrar en logs; no reintentar (fire-and-log) |

Véase `rules-75-activity-log.md` para el catálogo completo de tipos de evento y los payloads exactos requeridos.

### 4.9 Autenticación

Todas las llamadas a EFs `conv-core-*` deben usar el contexto de `service_role` de Supabase. Las EFs verifican que el llamante es código del add-on (no un usuario final) mediante este contexto.

Las llamadas que lleguen con contexto `anon` o con JWT de usuario deben ser rechazadas con HTTP 401.

### 4.10 Reglas de versionado de la Integration API

La Integration API es una capa contractual. Los cambios deben seguir estas reglas:

| Tipo de cambio | Impacto | Acción requerida |
|---|---|---|
| Añadir campo opcional en request o response | No disruptivo | Documentar en este fichero; no requiere coordinación |
| Eliminar o renombrar campo obligatorio | Breaking change | Requiere revisión de arquitectura + actualización coordinada de todos los consumidores |
| Cambiar semántica de un campo existente | Breaking change | Requiere revisión de arquitectura |
| Añadir nuevo endpoint `conv-core-*` | No disruptivo | Documentar en este fichero |
| Eliminar un endpoint existente | Breaking change | Requiere revisión de arquitectura + actualización de todos los consumidores |
| Cambiar códigos de error | Breaking change | Requiere revisión de arquitectura |

---

## 5. Casos Permitidos

- WF-20 llama a `conv-core-create-incident` después de verificar `STRONG_MATCH_ACTIVE` en `conv_sessions`.
- WF-30 llama a `conv-core-lookup-listing` con solo `residence_name` cuando el usuario no conoce la referencia exacta.
- WF-IDENTITY llama a `conv-core-validate-identity` con `phone` únicamente (fast-path de WhatsApp).
- Una EF que recibe HTTP 422 de `conv-core-create-incident` gestiona el error internamente, escala a admin y responde al usuario con mensaje genérico.
- WF-10 llama a `conv-core-get-tenant-features` al inicio de cada ejecución para obtener servicios activos.

---

## 6. Casos Prohibidos

- Queries SQL directas a tablas del Core desde cualquier componente del add-on.
- Llamadas a RPCs del Core que no sean las EFs `conv-core-*` documentadas.
- Reenviar a n8n los campos `profile_id`, `assignment_id`, `room_id`, `room_label` o `full_name` devueltos por `conv-core-validate-identity`.
- Llamar a `conv-core-create-incident` sin verificar `STRONG_MATCH_ACTIVE` previamente.
- Propagar errores HTTP del Core (422, 5xx) al usuario final sin traducirlos.
- Cachear el resultado de `conv-core-get-tenant-features` entre ejecuciones de WF-10.

---

## 7. Impacto en el Diseño

- SmartRoom Core no conoce n8n, Wasender, el widget WebChat ni la IA. El Core solo recibe llamadas HTTP bien definidas de las EFs `conv-core-*`.
- Las EFs `conv-core-*` son el punto de integración donde se traduce el contexto conversacional del add-on al dominio de negocio del Core.
- La capa de Integration API protege al add-on de cambios internos del Core, siempre que el contrato de las EFs se mantenga estable.

---

## 8. Impacto en la Implementación

- Las EFs `conv-core-*` deben implementarse con `service_role` para poder leer tablas del Core con RLS activo.
- Cada EF debe incluir logging estructurado de cada llamada: timestamp, `client_account_id`, resultado (éxito/error), latencia. Sin datos personales en los logs.
- Los reintentos para errores 5xx del Core deben implementarse con backoff (1s → 5s → 30s) y un máximo de 3 intentos. Después del tercer fallo, escalar.

---

## 9. Dependencias

- `rules-00-scope-and-principles.md` — principio P3 (add-on depende del Core vía Integration API)
- `rules-40-identity-validation.md` — contrato de `conv-core-validate-identity`
- `rules-60-service-incidents.md` — uso de `conv-core-create-incident`
- `rules-61-service-listings.md` — uso de `conv-core-lookup-listing` y `conv-core-create-lead`
- `rules-75-activity-log.md` — publicación de eventos desde EFs de Integration API
- `contract-identity-validation-result.md` — estructura de respuesta de `conv-core-validate-identity`
- `contract-tenant-features-response.md` — estructura de respuesta de `conv-core-get-tenant-features`
- `rules-02-project-structure-and-addons.md` — convención de namespace de las EFs `conv-core-*`

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`

---

## 10. Checklist de Validación

- [ ] Ningún componente del add-on tiene acceso SQL directo a tablas del Core
- [ ] Todas las llamadas al Core pasan por EFs `conv-core-*`
- [ ] Las llamadas a EFs usan `service_role`, nunca `anon`
- [ ] `profile_id`, `assignment_id`, `room_id` devueltos por `conv-core-validate-identity` no se reenvían a n8n
- [ ] `conv-core-create-incident` solo se llama desde WF-20 tras verificar `STRONG_MATCH_ACTIVE`
- [ ] Los errores HTTP del Core se traducen en mensajes genéricos para el usuario
- [ ] `conv-core-get-tenant-features` se llama en cada ejecución de WF-10, sin caché
- [ ] La publicación de eventos al activity log se hace llamando a `conv-core-publish-activity` desde las EFs, nunca directamente desde n8n

---

## 11. Notas de Control de Cambios

Añadir un nuevo endpoint `conv-core-*` requiere documentarlo en este fichero antes de implementarlo. La documentación es el contrato; el código es la implementación del contrato.

Los breaking changes en cualquier endpoint de Integration API requieren revisión de arquitectura, comunicación a todos los equipos consumidores y un plan de migración coordinado.

Cualquier cambio en la lógica de autenticación de las EFs `conv-core-*` debe revisarse con el equipo de seguridad antes del merge.
