# contract-identity-validation-result.md — IdentityValidationResult

## 1. Propósito

`IdentityValidationResult` es la estructura de respuesta devuelta por `conv-core-validate-identity`. Comunica el nivel de identidad determinado por SmartRoom Core para un conjunto de credenciales presentadas, y proporciona los identificadores internos necesarios para las operaciones de servicio.

Este contrato es la interfaz entre la capa de validación del Core y todos los workflows y EFs de SmartConversations que actúan en nombre de un inquilino específico.

---

## 2. Cuándo se utiliza

Este contrato se produce cada vez que se llama a `conv-core-validate-identity`:

- **Fast-path de WhatsApp**: llamado desde `conv-ingest` en el primer mensaje de cada sesión, usando el campo `phone`.
- **Creación de sesión de WebChat**: llamado desde `conv-web-session` cuando hay un JWT presente, usando el `profile_id` resuelto.
- **Flujo de identificación progresiva**: llamado desde WF-IDENTITY tras recopilar `full_name`, `residence_name` y `room_label` del usuario.
- **Verificación previa a la creación de incidencia**: llamado desde WF-20 antes de escalar una pre-incidencia a una incidencia oficial en el Core.

---

## 3. Productor

**EF `conv-core-validate-identity`** es el único productor de instancias de `IdentityValidationResult`.

Esta EF consulta los datos del Core de SmartRoom (perfiles, asignaciones, alojamientos) y devuelve un resultado estandarizado. Su implementación interna es opaca para los consumidores.

---

## 4. Consumidor

| Consumidor | Cómo usa el resultado |
|---|---|
| `conv-ingest` | Almacena `identity_level` y `profile_id` en `conv_sessions` tras el fast-path |
| `conv-web-session` | Almacena `identity_level` y `profile_id` en `conv_sessions` en la creación de sesión |
| WF-IDENTITY | Recibe `identity_level` para determinar si continuar o escalar |
| WF-20 | Comprueba `identity_level = STRONG_MATCH_ACTIVE` antes de llamar a `conv-core-create-incident` |
| Publicador del activity log | Usa `identity_level` para decidir si publicar `conv_identity_validated` |

**Restricción de propagación:** `identity_level` (un enum) es el único campo de este contrato que puede reenviarse a n8n. Todos los demás campos (`profile_id`, `assignment_id`, `room_id`, `room_label`, `full_name`) deben almacenarse en `conv_sessions` por la EF receptora y nunca deben reenviarse a n8n ni al proveedor de IA.

---

## 5. Estructura

### Petición (INPUT)

```typescript
interface IdentityValidationRequest {
  client_account_id: string;       // UUID del tenant — siempre obligatorio
  profile_id?:       string;       // UUID — fast-path de WebChat cuando el JWT está resuelto
  phone?:            string;       // formato internacional: +34612345678
  full_name?:        string;
  residence_name?:   string;
  room_label?:       string;
}
```

Al menos uno de `profile_id`, `phone`, `full_name`, `residence_name` o `room_label` debe estar presente. Cuando `profile_id` está presente, el Core verifica si ese perfil tiene tenencia activa en el tenant; los demás campos son ignorados.

### Respuesta (OUTPUT)

```typescript
interface IdentityValidationResult {
  identity_level:    IdentityLevel;
  profile_id?:       string;   // UUID — presente cuando identity_level != NO_MATCH
  assignment_id?:    string;   // UUID — presente cuando identity_level IN (STRONG, PARTIAL) ACTIVE
  accommodation_id?: string;   // UUID — presente cuando el alojamiento es conocido
  room_id?:          string;   // UUID — presente cuando existe coincidencia de habitación
  room_label?:       string;   // etiqueta legible, p.ej. "204-A"
  full_name?:        string;   // nombre validado desde el perfil del Core
  match_details: {
    matched_by:      MatchField[];  // campos que contribuyeron a la coincidencia
    confidence:      number;        // 0.0 a 1.0
  };
}

type IdentityLevel =
  | 'STRONG_MATCH_ACTIVE'
  | 'PARTIAL_MATCH_ACTIVE'
  | 'MATCH_INACTIVE'
  | 'NO_MATCH';

type MatchField = 'phone' | 'name' | 'room' | 'residence';
```

`UNVERIFIED_LEAD` no es un posible resultado de este contrato. Lo asigna WF-30 de forma independiente.

---

## 6. Campos Obligatorios

| Campo | Tipo | Obligatorio | Descripción | Notas |
|---|---|---|---|---|
| `identity_level` | enum `IdentityLevel` | Siempre | Nivel de identidad determinado por el Core | Uno de cuatro valores fijos. |
| `match_details.matched_by` | `MatchField[]` | Siempre | Campos que contribuyeron a la coincidencia | Array vacío cuando `NO_MATCH`. |
| `match_details.confidence` | `number (0.0–1.0)` | Siempre | Puntuación de confianza de la coincidencia | `0.0` cuando `NO_MATCH`. |

---

## 7. Campos Opcionales

| Campo | Tipo | Presente cuando | Descripción | Si ausente |
|---|---|---|---|---|
| `profile_id` | `string (UUID)` | `identity_level != 'NO_MATCH'` | UUID del perfil coincidente en el Core | Ausente cuando `NO_MATCH`. No debe reenviarse a n8n. |
| `assignment_id` | `string (UUID)` | `identity_level IN ('STRONG_MATCH_ACTIVE', 'PARTIAL_MATCH_ACTIVE')` | UUID de la asignación activa | Ausente para perfiles inactivos o sin coincidencia. |
| `accommodation_id` | `string (UUID)` | Cuando el alojamiento forma parte de la coincidencia | UUID del alojamiento | Puede estar ausente incluso cuando la identidad está confirmada. |
| `room_id` | `string (UUID)` | Cuando la habitación forma parte de la coincidencia | UUID de la habitación coincidente | Ausente cuando la habitación no formó parte de los criterios de coincidencia. |
| `room_label` | `string` | Cuando `room_id` está presente | Identificador legible de la habitación | Ausente cuando `room_id` está ausente. |
| `full_name` | `string` | Cuando se encuentra el perfil | Nombre del registro de perfil del Core | Ausente cuando `NO_MATCH`. |

---

## 8. Reglas de Validación

1. `identity_level` debe estar siempre presente. Debe ser uno de: `STRONG_MATCH_ACTIVE`, `PARTIAL_MATCH_ACTIVE`, `MATCH_INACTIVE`, `NO_MATCH`. Ningún otro valor es válido.

2. `profile_id` no debe estar presente cuando `identity_level = 'NO_MATCH'`.

3. `assignment_id` no debe estar presente cuando `identity_level IN ('MATCH_INACTIVE', 'NO_MATCH')`.

4. `match_details.confidence` debe ser `0.0` cuando `identity_level = 'NO_MATCH'`.

5. `match_details.matched_by` debe ser un array vacío cuando `identity_level = 'NO_MATCH'`.

6. Para `STRONG_MATCH_ACTIVE`, `match_details.matched_by` debe incluir `'phone'` y `match_details.confidence` debe ser ≥ 0.95.

7. Para `PARTIAL_MATCH_ACTIVE`, `match_details.matched_by` debe incluir al menos dos de: `'name'`, `'room'`, `'residence'`.

8. **Regla de propagación:** `profile_id`, `assignment_id`, `room_id`, `room_label` y `full_name` deben almacenarse en `conv_sessions` por la EF consumidora. Nunca deben reenviarse a n8n ni incluirse en prompts de IA.

9. **Solo `identity_level` puede reenviarse a n8n.** Todos los demás campos son internos a la capa de EFs del add-on.

10. La petición debe tener `client_account_id` presente. Si está ausente, la EF debe devolver HTTP 400.

11. La petición debe tener al menos uno de `profile_id`, `phone`, `full_name`, `residence_name`, `room_label`. Si ninguno está presente, la EF debe devolver HTTP 400. Cuando se envía `profile_id`, los demás campos de identificación son opcionales y se ignoran.

### Códigos de Error HTTP

| Código | Significado |
|---|---|
| `200` | Validación completada (cualquier nivel, incluyendo `NO_MATCH`) |
| `400` | Petición inválida: falta `client_account_id` o no hay campos de identificación |
| `403` | El tenant no tiene una suscripción umbrella `smart_conversations` activa |
| `404` | `client_account_id` no existe en el Core |
| `500` | Error interno en SmartRoom Core |

Cuando la EF recibe 4xx o 5xx del Core, debe tratar el resultado como `NO_MATCH` para el flujo conversacional, escalar al admin si el servicio llamante requiere mayor nivel de confianza, y registrar el error con el contexto completo de la petición. El error HTTP nunca debe propagarse al usuario final.

---

## 9. Ejemplos Válidos

### Fast-path — STRONG_MATCH_ACTIVE por teléfono

**Petición:**
```json
{
  "client_account_id": "550e8400-e29b-41d4-a716-446655440000",
  "phone": "+34612345678"
}
```

**Respuesta:**
```json
{
  "identity_level": "STRONG_MATCH_ACTIVE",
  "profile_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "assignment_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "accommodation_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
  "room_id": "d4e5f6a7-b8c9-0123-defa-234567890123",
  "room_label": "204-A",
  "full_name": "María González",
  "match_details": {
    "matched_by": ["phone"],
    "confidence": 0.99
  }
}
```

### Flujo progresivo — PARTIAL_MATCH_ACTIVE por nombre + habitación + residencia

**Petición:**
```json
{
  "client_account_id": "550e8400-e29b-41d4-a716-446655440000",
  "full_name": "Carlos Ruiz",
  "residence_name": "Residencia La Paloma",
  "room_label": "102-B"
}
```

**Respuesta:**
```json
{
  "identity_level": "PARTIAL_MATCH_ACTIVE",
  "profile_id": "e5f6a7b8-c9d0-1234-efab-345678901234",
  "assignment_id": "f6a7b8c9-d0e1-2345-fabc-456789012345",
  "accommodation_id": "a7b8c9d0-e1f2-3456-abcd-567890123456",
  "room_id": "b8c9d0e1-f2a3-4567-bcde-678901234567",
  "room_label": "102-B",
  "full_name": "Carlos Ruiz",
  "match_details": {
    "matched_by": ["name", "room", "residence"],
    "confidence": 0.82
  }
}
```

### Ex-inquilino — MATCH_INACTIVE

**Respuesta:**
```json
{
  "identity_level": "MATCH_INACTIVE",
  "profile_id": "c9d0e1f2-a3b4-5678-cdef-789012345678",
  "match_details": {
    "matched_by": ["phone"],
    "confidence": 0.99
  }
}
```

### Sin coincidencia — NO_MATCH

**Respuesta:**
```json
{
  "identity_level": "NO_MATCH",
  "match_details": {
    "matched_by": [],
    "confidence": 0.0
  }
}
```

---

## 10. Ejemplos Inválidos

### Petición sin campos de identificación

```json
{
  "client_account_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Inválido porque:** debe estar presente al menos uno de `profile_id`, `phone`, `full_name`, `residence_name`, `room_label`. Esta petición devuelve HTTP 400.

### Usar el resultado para crear una incidencia oficial con PARTIAL_MATCH_ACTIVE

```
identity_level = 'PARTIAL_MATCH_ACTIVE'
→ llamar a conv-core-create-incident
```

**Inválido porque:** `conv-core-create-incident` requiere `STRONG_MATCH_ACTIVE`. Usar un nivel de identidad inferior para crear una incidencia oficial viola `rules-40-identity-validation.md` y `rules-60-service-incidents.md`.

### Reenviar profile_id a n8n

```json
{
  "identity_level": "STRONG_MATCH_ACTIVE",
  "profile_id": "a1b2c3d4-..."
}
```
_(incluido en el payload del webhook a n8n)_

**Inválido porque:** `profile_id` debe almacenarse en `conv_sessions` por la EF y nunca debe reenviarse a n8n. Ver la regla de propagación en la Sección 8.

### profile_id presente cuando NO_MATCH

```json
{
  "identity_level": "NO_MATCH",
  "profile_id": "a1b2c3d4-...",
  "match_details": { "matched_by": [], "confidence": 0.0 }
}
```

**Inválido porque:** `profile_id` no debe estar presente cuando `identity_level = 'NO_MATCH'`.

### assignment_id presente cuando MATCH_INACTIVE

```json
{
  "identity_level": "MATCH_INACTIVE",
  "profile_id": "c9d0e1f2-...",
  "assignment_id": "b2c3d4e5-...",
  "match_details": { "matched_by": ["phone"], "confidence": 0.99 }
}
```

**Inválido porque:** `assignment_id` no debe estar presente cuando `identity_level = 'MATCH_INACTIVE'`. Un perfil con `MATCH_INACTIVE` no tiene asignación activa.

---

## 11. Notas de Versionado

Esta es la versión 1.0 del contrato `IdentityValidationResult`.

- Añadir nuevos campos opcionales en la respuesta es un cambio no disruptivo.
- Eliminar o renombrar `identity_level` es un breaking change y requiere un incremento de versión mayor.
- Añadir un nuevo valor al enum `IdentityLevel` es un breaking change. Requiere actualizaciones simultáneas en: el constraint `CHECK` de `conv_sessions.identity_level`, la matriz de acciones en `rules-40-identity-validation.md` y todos los workflows de servicio que ramifican sobre `identity_level`.
- Añadir un nuevo valor a `MatchField` no es disruptivo para los consumidores que gestionan valores de enum desconocidos de forma elegante.
- Los consumidores no deben fallar ante la presencia de campos opcionales desconocidos en la respuesta.

**Nota de privacidad:** este contrato devuelve `profile_id`, `assignment_id`, `room_id`, `room_label` y `full_name`. Estos campos son altamente sensibles. Las EFs consumidoras deben almacenarlos en `conv_sessions` y nunca incluirlos en payloads de n8n ni en prompts de IA. Solo `identity_level` (un enum, no un dato personal) puede reenviarse a n8n. Esta restricción está impuesta por `rules-80-data-and-privacy.md` y también se establece en `rules-00-scope-and-principles.md` Sección 3.7.

---

## 12. Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`
