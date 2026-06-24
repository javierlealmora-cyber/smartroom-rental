# test-listings-flow-spec.md — Especificación de Pruebas: Flujo del Servicio de Publicaciones/Anuncios (WF-30)

## 1. Objetivo

Verificar que WF-30 gestiona el flujo de consulta de anuncios y creación de leads según `rules-61-service-listings.md`: el acceso sin identidad de inquilino (`UNVERIFIED_LEAD`), las dos ramas según disponibilidad del anuncio (Rama A: disponible, Rama B: no disponible), los datos mínimos requeridos para crear un lead, los límites de información pública para usuarios no verificados, y el cumplimiento de la frontera de privacidad que impide enviar datos de inquilinos actuales a la IA.

---

## 2. Alcance

| Incluye | Excluye |
|---|---|
| Acceso de `UNVERIFIED_LEAD` a anuncios públicos | Lógica interna del Core para gestionar leads |
| Rama A: anuncio disponible (`is_available = true`) | Panel de administración de anuncios |
| Rama B: anuncio no disponible (`is_available = false`) | Gestión del ciclo de vida del lead después de la creación |
| Datos mínimos para crear lead (nombre + teléfono o email) | Flujo de incidencias (cubierto en `test-incidents-flow-spec.md`) |
| Asignación de `UNVERIFIED_LEAD` por WF-30 | |
| Restricciones de información pública para NO_MATCH/UNVERIFIED_LEAD | |
| Datos privados que la IA nunca debe recibir | |

---

## 3. Reglas y Contratos Cubiertos

| Documento | Sección | Qué se verifica |
|---|---|---|
| `rules-61-service-listings.md` | §4.1 | Acceso de `UNVERIFIED_LEAD` y `NO_MATCH` a datos públicos |
| `rules-61-service-listings.md` | §4.2 | Datos mínimos para crear lead |
| `rules-61-service-listings.md` | §4.3 | Rama A: anuncio disponible → datos públicos + lead si hay interés |
| `rules-61-service-listings.md` | §4.4 | Rama B: anuncio no disponible → opciones de interés futuro o alternativas |
| `rules-61-service-listings.md` | §4.5 | La IA solo recibe datos públicos del anuncio, nunca datos de inquilinos |
| `rules-40-identity-validation.md` | §4.6 | `UNVERIFIED_LEAD` asignado por WF-30, no por `conv-core-validate-identity` |
| `rules-80-data-and-privacy.md` | §4.1 | IA no recibe datos de inquilinos actuales ni historial de pagos |
| `rules-70-integration-api.md` | §4.5 | Campos contractuales de `conv-core-create-lead` |
| `contract-canonical-response.md` | §3 | Estructura de `CanonicalResponse` para el flujo de leads |

---

## 4. Precondiciones

- Tenant con `conv_publicaciones` activo en `conv_service_activations`.
- `conv-core-lookup-listing` disponible y simulable para devolver anuncios disponibles/no disponibles.
- `conv-core-create-lead` simulable.
- Sesión con `identity_level` variable según escenario (puede ser `NO_MATCH`, `UNVERIFIED_LEAD`, `STRONG_MATCH_ACTIVE`).

---

## 5. Escenarios de Prueba

### Bloque LST — Acceso y asignación de `UNVERIFIED_LEAD`

**LST-01: Usuario confirma que no es inquilino → WF-30 asigna `UNVERIFIED_LEAD`**

- **Precondición**: Sesión con `identity_level = 'NO_MATCH'`. Usuario accede al servicio de publicaciones.
- **Acción**: WF-30 pregunta si el usuario es inquilino actual. Usuario responde "No, busco habitación".
- **Resultado esperado**:
  - EF actualiza `conv_sessions.identity_level = 'UNVERIFIED_LEAD'` vía `service_role`.
  - Este nivel lo asigna WF-30, **no** `conv-core-validate-identity`.
  - El usuario puede continuar consultando anuncios.
- **Regla cubierta**: `rules-40` §4.6; `rules-61` §4.1.

---

**LST-02: `STRONG_MATCH_ACTIVE` puede acceder a anuncios (inquilino activo consultando)**

- **Precondición**: Sesión con `identity_level = 'STRONG_MATCH_ACTIVE'`.
- **Resultado esperado**:
  - WF-30 accede a `conv-core-lookup-listing` sin restricciones.
  - El inquilino puede ver datos públicos del anuncio.
  - No puede ver datos de otros inquilinos actuales.
- **Regla cubierta**: `rules-61` §4.1.

---

### Bloque LST — Búsqueda de anuncio

**LST-03: Búsqueda por referencia exacta → anuncio encontrado**

- **Precondición**: `identity_level = 'UNVERIFIED_LEAD'`. Usuario proporciona referencia `"HAB-SOL-204"`.
- **Acción**: WF-30 llama a `conv-core-lookup-listing` con `{ listing_ref: 'HAB-SOL-204' }`.
- **Resultado esperado**:
  - Core devuelve datos del anuncio con `is_available = true`.
  - Se continúa con Rama A.
- **Regla cubierta**: `rules-61` §4.3.

---

**LST-04: Búsqueda sin referencia suficiente → WF-30 pide más datos**

- **Precondición**: Usuario proporciona descripción vaga: "una habitación en el centro".
- **Resultado esperado**:
  - `conv-core-lookup-listing` no encuentra anuncio único.
  - WF-30 devuelve `CanonicalResponse { response_type: 'pending_input', needs_more_input: true }`.
  - Se pide referencia exacta o nombre de la residencia.
- **Regla cubierta**: `rules-61` §4.3.

---

### Bloque LST — Rama A: anuncio disponible

**LST-05: Rama A — IA redacta respuesta con datos públicos del anuncio**

- **Precondición**: Anuncio encontrado con `is_available = true`. `identity_level = 'UNVERIFIED_LEAD'`.
- **Resultado esperado**:
  - La IA recibe: precio, fecha de disponibilidad, condiciones generales, número de fotos.
  - La IA **no** recibe: datos de inquilinos actuales, historial de ocupación, datos contractuales.
  - La respuesta al usuario incluye datos públicos del anuncio.
- **Regla cubierta**: `rules-61` §4.3; `rules-80` §4.1.

---

**LST-06: Rama A — Interés comercial confirmado → lead creado con datos mínimos**

- **Precondición**: Anuncio disponible. Usuario expresa interés explícito ("¿Cómo reservo?").
- **Acción**: WF-30 solicita datos mínimos de contacto (nombre + teléfono o email). Usuario proporciona ambos.
- **Resultado esperado**:
  - n8n entrega el `message_text` a la EF; es la EF quien extrae, valida y estructura los datos mínimos de contacto. n8n no almacena `name`, `phone` ni `email` como variables estructuradas persistentes.
  - EF llama a `conv-core-create-lead` con `{ listing_id, contact: { name: "Ana Martín", phone: "+34612345678" }, message }` una vez validados los datos internamente.
  - `conv_cases` con `case_ref_type = 'lead'` insertado.
  - `CanonicalResponse { response_type: 'success', case_ref: 'LEAD-2026-0015' }`.
- **Regla cubierta**: `rules-61` §4.2; `rules-61` §4.3.

---

**LST-07: Rama A — Lead con datos ya disponibles en la sesión no vuelve a preguntar**

- **Precondición**: Anuncio disponible. `conv_sessions.identity_data` ya contiene `full_name` de una iteración previa del flujo progresivo. El teléfono/email fue proporcionado en el turno actual o es accesible a la EF por otras vías (nunca como campo de `identity_data` en texto claro).
- **Resultado esperado**:
  - La EF (no n8n) lee los datos seguros de `conv_sessions` y del mensaje actual.
  - No se vuelve a preguntar al usuario datos que ya están disponibles.
  - Lead creado por la EF con los datos validados internamente; n8n no persiste `phone_number` como variable estructurada.
- **Regla cubierta**: `rules-61` §4.2.

---

**LST-08: Rama A — Datos de contacto incompletos → `pending_input`**

- **Precondición**: Usuario expresa interés pero no proporciona nombre ni teléfono/email.
- **Resultado esperado**:
  - `CanonicalResponse { response_type: 'pending_input', needs_more_input: true }`.
  - WF-30 solicita al menos: nombre completo + (teléfono o email).
  - No se crea lead hasta recibir datos mínimos.
- **Regla cubierta**: `rules-61` §4.2.

---

### Bloque LST — Rama B: anuncio no disponible

**LST-09: Rama B — Anuncio no disponible → informar al usuario y ofrecer opciones**

- **Precondición**: Anuncio encontrado con `is_available = false`.
- **Resultado esperado**:
  - Usuario recibe: "Esta habitación no está disponible actualmente."
  - Se ofrecen opciones:
    1. Registrar interés para futura disponibilidad.
    2. Ver otras habitaciones disponibles del mismo alojamiento.
- **Regla cubierta**: `rules-61` §4.4.

---

**LST-10: Rama B — Usuario elige "interés futuro" → lead con `interest_type = 'future'`**

- **Precondición**: Estado de LST-09. Usuario elige opción 1.
- **Acción**: WF-30 solicita datos mínimos de contacto. Usuario los proporciona.
- **Resultado esperado**:
  - EF llama a `conv-core-create-lead` con `{ ..., interest_type: 'future' }`.
  - Lead creado con `status = 'future_interest'`.
- **Regla cubierta**: `rules-61` §4.4.

---

**LST-11: Rama B — Usuario elige "ver otras habitaciones" → nueva búsqueda en mismo alojamiento**

- **Precondición**: Estado de LST-09. Usuario elige opción 2.
- **Resultado esperado**:
  - WF-30 llama a `conv-core-lookup-listing` con `{ accommodation_id }` (solo el alojamiento).
  - Se devuelve lista de habitaciones disponibles del mismo alojamiento.
- **Regla cubierta**: `rules-61` §4.4.

---

### Bloque LST — Restricciones de información

**LST-12: `UNVERIFIED_LEAD` no puede ver datos de inquilinos actuales**

- **Precondición**: `identity_level = 'UNVERIFIED_LEAD'`. El Core devuelve datos del anuncio con campos opcionales de inquilinos.
- **Resultado esperado**:
  - La IA recibe solo: precio, disponibilidad, condiciones generales, número de fotos.
  - La IA **no** recibe: nombre del inquilino actual, fecha de entrada/salida del contrato, historial de pagos.
  - La respuesta al usuario contiene únicamente información pública.
- **Regla cubierta**: `rules-61` §4.5; `rules-80` §4.1.

---

**LST-13: `STRONG_MATCH_ACTIVE` no puede ver datos de otros inquilinos (datos del contrato propio sí)**

- **Precondición**: `identity_level = 'STRONG_MATCH_ACTIVE'`. Consulta sobre una habitación diferente a la suya.
- **Resultado esperado**:
  - Solo datos públicos del anuncio de la habitación consultada.
  - No datos del inquilino actual de esa habitación.
- **Regla cubierta**: `rules-61` §4.5.

---

**LST-14: IA no recibe historial de ocupación ni datos contractuales de ningún inquilino**

- **Precondición**: Cualquier `identity_level`. Anuncio con historial de ocupación en el Core.
- **Resultado esperado**:
  - El payload al proveedor de IA contiene exclusivamente datos públicos.
  - Campos excluidos del prompt de IA: `tenant_name`, `contract_start`, `contract_end`, `payment_history`.
- **Regla cubierta**: `rules-80` §4.1.

---

## 6. Casos Negativos

| ID | Caso negativo | Resultado esperado |
|---|---|---|
| LST-NEG-01 | `UNVERIFIED_LEAD` intenta crear incidencia oficial a través de WF-30 | WF-20 rechaza; requiere `STRONG_MATCH_ACTIVE` |
| LST-NEG-02 | IA recibe `tenant_name` del inquilino actual en su prompt | Violación de `rules-80` §4.1; nunca debe enviarse |
| LST-NEG-03 | Lead creado sin nombre del contacto | Violación de `rules-61` §4.2; nombre completo es obligatorio |
| LST-NEG-04 | Lead creado sin teléfono ni email | Violación de `rules-61` §4.2; al menos uno es obligatorio |
| LST-NEG-05 | `UNVERIFIED_LEAD` asignado por `conv-core-validate-identity` en lugar de WF-30 | Violación de `rules-40` §4.6; este nivel es exclusivo de WF-30 |
| LST-NEG-06 | Rama B no ofrece la opción de interés futuro cuando el anuncio no está disponible | Violación de `rules-61` §4.4 |

---

## 7. Datos de Prueba

```json
{
  "listings": {
    "available_room": {
      "listing_id": "listing-001",
      "listing_ref": "HAB-SOL-204",
      "is_available": true,
      "price": 650,
      "available_from": "2026-07-01",
      "accommodation_id": "accom-sol-001",
      "public_info": { "photos_count": 8, "area_m2": 12, "floor": 2 }
    },
    "unavailable_room": {
      "listing_id": "listing-002",
      "listing_ref": "HAB-SOL-301",
      "is_available": false,
      "accommodation_id": "accom-sol-001"
    },
    "private_info_to_exclude": {
      "tenant_name": "Juan Pérez",
      "contract_start": "2025-09-01",
      "payment_history": []
    }
  },
  "lead_contacts": {
    "complete": { "name": "Ana Martín López", "phone": "+34612345678", "email": null },
    "email_only": { "name": "Roberto Sanz", "phone": null, "email": "roberto@example.com" },
    "incomplete_no_contact": { "name": "Sin contacto", "phone": null, "email": null }
  },
  "sessions": {
    "unverified_lead": { "identity_level": "UNVERIFIED_LEAD" },
    "no_match": { "identity_level": "NO_MATCH" },
    "strong_match": { "identity_level": "STRONG_MATCH_ACTIVE", "profile_id": "prof-001" }
  }
}
```

---

## 8. Criterio de Aceptación

| Criterio | Condición de éxito |
|---|---|
| `UNVERIFIED_LEAD` accede a datos públicos | Precio, disponibilidad, condiciones visibles; datos privados ausentes |
| IA no recibe datos de inquilinos actuales | Revisión de todos los prompts enviados al proveedor de IA |
| Datos de contacto mínimos verificados | Lead no creado sin nombre + (teléfono o email) |
| Datos de sesión reutilizados | No se repregunta datos ya disponibles en `identity_data` |
| `UNVERIFIED_LEAD` asignado solo por WF-30 | No aparece en respuestas de `conv-core-validate-identity` |
| Rama B ofrece opciones correctas | Interés futuro y búsqueda de alternativas siempre presentes |
| `interest_type = 'future'` en leads de anuncios no disponibles | Campo correcto en la llamada a `conv-core-create-lead` |

---

## 9. Dependencias

| Documento | Relación |
|---|---|
| `rules-61-service-listings.md` | Fuente de verdad del flujo de publicaciones |
| `rules-40-identity-validation.md` §4.6 | `UNVERIFIED_LEAD` asignado por WF-30 |
| `rules-70-integration-api.md` §4.5 | Campos contractuales de `conv-core-create-lead` |
| `rules-80-data-and-privacy.md` §4.1 | IA no recibe datos de inquilinos |
| `contract-canonical-response.md` | Estructura de respuestas de WF-30 |
| `skill-n8n-listings-workflow.md` | Detalles de implementación de WF-30 |
