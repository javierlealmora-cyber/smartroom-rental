# Skill — Validación de Identidad

## 1. Objetivo

Este skill explica cómo implementar la validación de identidad en SmartConversations: la EF `conv-core-validate-identity`, el fast-path por teléfono en WhatsApp, el fast-path por `profile_id` en WebChat y el flujo de identificación progresiva en WF-IDENTITY. Cubre también cómo persistir el resultado en `conv_sessions` y qué datos nunca deben salir de la capa de EFs.

## 2. Cuándo usar este skill

Usar este skill cuando se necesite:

- implementar o revisar `conv-core-validate-identity`
- implementar el fast-path de identidad en `conv-ingest` (WhatsApp)
- implementar la validación de identidad en `conv-web-session` (WebChat con JWT)
- implementar WF-IDENTITY (identificación progresiva en n8n)
- entender qué datos de identidad puede recibir n8n y cuáles no
- depurar por qué una sesión tiene el nivel de identidad incorrecto

## 3. Preconditions

Antes de usar este skill, leer:

- `rules-40-identity-validation.md` — fuente de verdad de todos los niveles de identidad y sus reglas
- `contract-identity-validation-result.md` — estructura de la request y response de `conv-core-validate-identity`
- `rules-80-data-and-privacy.md` — política de PII para números de teléfono y datos personales

## 4. Restricciones de origen

Este skill respeta las siguientes decisiones cerradas en las rules:

- La validación de identidad la realiza exclusivamente `conv-core-validate-identity` → SmartRoom Core. La IA nunca determina si un inquilino está activo.
- `UNVERIFIED_LEAD` no es resultado de `conv-core-validate-identity`. Lo asigna WF-30 de forma independiente.
- El número de teléfono usado en el fast-path nunca se propaga a n8n ni a la IA.
- `profile_id`, `assignment_id`, `room_id`, `room_label` y `full_name` del resultado se almacenan en `conv_sessions` por la EF. Nunca se reenvían a n8n.
- `identity_level` (enum) es el único campo relacionado con identidad que puede pasarse a n8n.
- El nivel de identidad solo puede avanzar dentro de una sesión. Nunca se degrada.
- Tras tres intentos fallidos, el sistema escala. No se permiten más intentos automáticos en esa sesión.

## 5. Estrategia de implementación

Hay tres vías de validación de identidad, cada una con su propio punto de entrada:

1. **Fast-path WhatsApp** — ejecutado por `conv-ingest` en el primer mensaje de cada sesión usando el número de teléfono extraído del campo `message.from` del payload de Wasender.
2. **Fast-path WebChat** — ejecutado por `conv-web-session` cuando el usuario presenta un JWT del portal lodger. Usa el `profile_id` resuelto del JWT.
3. **Flujo progresivo** — ejecutado por WF-IDENTITY cuando el servicio activo requiere un nivel de identidad mayor que el actual. Recopila datos del usuario en turnos sucesivos.

## 6. Pasos recomendados

### Paso 1 — Implementar el fast-path WhatsApp en `conv-ingest`

El fast-path se ejecuta antes de disparar WF-01. `conv-ingest` debe:

```
1. Extraer phone directamente del payload de Wasender (campo message.from o key.remoteJid)
   antes de normalizar el mensaje.
   El valor se usa en formato internacional: "+34612345678"
   NO añadir el sufijo "@c.us"; ese sufijo es exclusivo del campo `to` de la API de Wasender
   y nunca va al campo `phone` de conv-core-validate-identity.
   El NormalizedMessage.sender_ref tampoco lleva "@c.us", pero puede necesitar prefijo "+"
   si el payload de Wasender no lo incluye.
2. Llamar conv-core-validate-identity:
   POST /functions/v1/conv-core-validate-identity
   Body: { client_account_id, phone }
3. Almacenar resultado en conv_sessions:
   UPDATE conv_sessions SET
     identity_level = result.identity_level,
     profile_id = result.profile_id,          ← solo si != NO_MATCH
     identity_data = {
       assignment_id: result.assignment_id,
       room_id: result.room_id,
       room_label: result.room_label,
       full_name: result.full_name
     }
   WHERE id = <session_id>
4. Pasar a WF-01 ÚNICAMENTE: { session_id, client_account_id, channel, message_text, identity_level }
   El phone_number no sale de conv-ingest hacia n8n
```

Si `conv-core-validate-identity` devuelve 4xx o 5xx, tratar como `NO_MATCH` para el flujo conversacional y registrar el error en logs.

### Paso 2 — Implementar el fast-path WebChat en `conv-web-session`

Cuando hay JWT del portal lodger:

```
1. Validar JWT con Supabase Auth → obtener user.id (UUID del perfil en SmartRoom Core)
   Este UUID es el profile_id que conv-core-validate-identity acepta en el campo opcional profile_id.
2. Llamar conv-core-validate-identity:
   POST /functions/v1/conv-core-validate-identity
   Body: { client_account_id, profile_id: user.id }
   Contrato: cuando profile_id está presente en el body, el Core verifica si ese perfil
   tiene tenencia activa en el tenant; los demás campos (phone, full_name, etc.) son ignorados.
   Este es el único caso en que profile_id aparece en la request de conv-core-validate-identity.
3. Almacenar resultado en conv_sessions:
   UPDATE conv_sessions SET
     identity_level = result.identity_level,
     profile_id = result.profile_id,
     identity_data = { assignment_id, room_id, room_label, full_name }
4. Incluir en el OUTPUT: { session_token, session_id, is_identified: true, identity_level }
   Nunca incluir profile_id ni otros campos de identidad en el OUTPUT
```

### Paso 3 — Implementar `conv-core-validate-identity`

Esta EF consulta SmartRoom Core y aplica la siguiente lógica de determinación:

```typescript
// Lógica de determinación del identity_level:
// Si profile_id presente:
//   → Verificar si ese perfil tiene asignación activa en el tenant
//   → Si sí: STRONG_MATCH_ACTIVE (el profile_id ya confirma la identidad)
//   → Si asignación existe pero move_out_date pasado: MATCH_INACTIVE
//   → Si no existe asignación: NO_MATCH

// Si phone presente (sin profile_id):
//   → Buscar en profiles WHERE phone = <phone> AND client_account_id = <id>
//   → Si match exacto + asignación activa: STRONG_MATCH_ACTIVE
//   → Si match + asignación inactiva: MATCH_INACTIVE
//   → Si no match: NO_MATCH

// Si full_name + residence_name + room_label (flujo progresivo):
//   → Buscar coincidencia fuzzy con los tres campos
//   → Si 3 campos coinciden + asignación activa: PARTIAL_MATCH_ACTIVE
//   → Si coincidencia pero asignación inactiva: MATCH_INACTIVE
//   → Si no coincidencia: NO_MATCH
```

La request debe incluir siempre `client_account_id` y al menos un campo de identificación. Si falta `client_account_id` → HTTP 400. Si no hay ningún campo de identificación → HTTP 400.

### Paso 4 — Implementar WF-IDENTITY en n8n

WF-IDENTITY es el sub-workflow de identificación progresiva. Orquesta preguntas al usuario en hasta tres turnos. **WF-IDENTITY nunca almacena PII en variables de workflow**; delega la extracción y persistencia de datos sensibles a una EF controlada.

```
INPUT: { session_id, client_account_id, identity_level,
         has_full_name, has_residence_name, has_room_label }

Los flags has_* indican qué datos ya están persistidos en conv_sessions.identity_data.
WF-IDENTITY los lee al inicio para no volver a pedir datos ya disponibles.

TURNO 1 — Nombre:
  Si has_full_name = false:
    Preguntar: "Para ayudarte mejor, ¿puedes decirme tu nombre completo?"
    Cuando el usuario responde:
      → Llamar EF (p.ej. conv-extract-identity-field):
          { session_id, field: 'full_name', message_text: <respuesta del usuario> }
        La EF extrae el valor con IA y lo persiste en conv_sessions.identity_data.
        La EF devuelve { has_full_name: true } (nunca el valor en claro).
    → Devolver CanonicalResponse { response_type: 'pending_input' }
    → Esperar siguiente mensaje

TURNO 2 — Residencia:
  Si has_residence_name = false:
    Preguntar: "¿En qué residencia vives?"
    Cuando el usuario responde:
      → Llamar EF: { session_id, field: 'residence_name', message_text: <respuesta> }
        La EF persiste en conv_sessions.identity_data y devuelve { has_residence_name: true }.
    → Devolver CanonicalResponse { response_type: 'pending_input' }
    → Esperar siguiente mensaje

TURNO 3 — Habitación:
  Si has_room_label = false:
    Preguntar: "¿En qué habitación estás?"
    Cuando el usuario responde:
      → Llamar EF: { session_id, field: 'room_label', message_text: <respuesta> }
        La EF persiste en conv_sessions.identity_data y devuelve { has_room_label: true }.

VALIDACIÓN (cuando los tres flags son true):
  POST /functions/v1/conv-core-validate-identity
  Body: { session_id, client_account_id }
  La EF lee full_name, residence_name y room_label de conv_sessions.identity_data internamente.
  → La EF almacena el resultado en conv_sessions.identity_level
  → WF-IDENTITY recibe { identity_level } del OUTPUT de la EF
  → Contabilizar como 1 intento

RESULTADO:
  STRONG_MATCH_ACTIVE → OUTPUT { identity_level: 'STRONG_MATCH_ACTIVE' } → el llamante continúa
  PARTIAL_MATCH_ACTIVE → OUTPUT { identity_level: 'PARTIAL_MATCH_ACTIVE' }
  MATCH_INACTIVE → Responder "Tu estancia ya ha finalizado." → escalar
  NO_MATCH → contar intento; si < 3 reintentar desde el turno que corresponda; si = 3 → escalar
```

**Regla de persistencia:** `conv_sessions.identity_data` es la única fuente de verdad persistente. WF-IDENTITY nunca almacena `full_name`, `residence_name` ni `room_label` en variables del workflow. Al inicio de cada ejecución, n8n recibe los flags `has_*` (no los valores en claro) para determinar qué datos ya están disponibles.

### Paso 5 — Entender la matriz de acciones por nivel

| Nivel | `conv_incidencias` | `conv_publicaciones` | `conv_ayuda` |
|---|---|---|---|
| `STRONG_MATCH_ACTIVE` | Incidencia oficial en Core | Ver anuncios + crear lead | Acceso completo (datos contractuales) |
| `PARTIAL_MATCH_ACTIVE` | Solo pre-incidencia en `conv_cases` | Ver anuncios + crear lead | Datos básicos (saldo, fechas) |
| `MATCH_INACTIVE` | Escalar al admin | Ver anuncios (datos públicos) + crear lead | Solo FAQ público |
| `NO_MATCH` | Escalar al admin | Ver anuncios (datos públicos) + crear lead | Solo FAQ público |
| `UNVERIFIED_LEAD` | No aplica | Ver anuncios + registrar interés | Solo FAQ público |

`UNVERIFIED_LEAD` no es resultado de `conv-core-validate-identity`. WF-30 lo asigna cuando el usuario confirma que no es inquilino y solo quiere información sobre un anuncio.

## 7. Datos / contratos involucrados

- `conv_sessions.identity_level` — nivel de identidad almacenado; solo puede avanzar, nunca retroceder
- `conv_sessions.identity_data` — datos de identidad extraídos durante el flujo progresivo (JSONB)
- `conv_sessions.profile_id` — UUID del perfil en el Core; almacenado por la EF, nunca reenviado a n8n
- `contract-identity-validation-result.md` — estructura completa de request y response

## 8. Errores comunes

- **Asumir identidad por el teléfono sin llamar al Core:** el teléfono es una pista, no una certeza. La validación contra SmartRoom Core es obligatoria.
- **Propagar `profile_id` a n8n:** este campo se almacena en `conv_sessions` por la EF y nunca sale de esa capa. n8n solo recibe `identity_level`.
- **Volver a pedir datos ya almacenados:** antes de cada turno de WF-IDENTITY, leer `conv_sessions.identity_data` para ver qué datos ya están disponibles.
- **Degradar `identity_level` en la misma sesión:** si la sesión tiene `PARTIAL_MATCH_ACTIVE` y una nueva validación devuelve `NO_MATCH`, el nivel no se degrada. Solo puede avanzar.
- **Continuar el flujo progresivo tras tres fallos:** el cuarto intento está prohibido. Si hay tres fallos consecutivos, escalar al admin sin realizar más validaciones.
- **Tratar `MATCH_INACTIVE` como inquilino activo:** un ex-inquilino puede tener `MATCH_INACTIVE` pero no debe tener acceso a crear incidencias ni a datos contractuales.

## 9. Qué no debe hacerse

- Usar IA para determinar si un usuario es inquilino activo, válido o autorizado.
- Propagar `profile_id`, `phone_number`, `assignment_id`, `room_id`, `room_label` o `full_name` a n8n.
- Asumir cualquier nivel de identidad sin llamar a `conv-core-validate-identity`.
- Crear una incidencia oficial con cualquier nivel inferior a `STRONG_MATCH_ACTIVE`.
- Asignar `UNVERIFIED_LEAD` como resultado de `conv-core-validate-identity` (solo WF-30 puede hacerlo).

## 10. Escenarios mínimos de prueba

1. **Fast-path WhatsApp → `STRONG_MATCH_ACTIVE`:**
   Primer mensaje WhatsApp con teléfono que coincide con un inquilino activo → `conv_sessions.identity_level = 'STRONG_MATCH_ACTIVE'`, `profile_id` almacenado en `conv_sessions`, n8n recibe solo `identity_level`.

2. **Fast-path WhatsApp → `NO_MATCH`:**
   Teléfono no registrado → `conv_sessions.identity_level = 'NO_MATCH'`, sin `profile_id`.

3. **Fast-path WebChat → nivel real del Core:**
   JWT válido con `profile_id` de un inquilino activo → `STRONG_MATCH_ACTIVE` almacenado en `conv_sessions`.

4. **Fast-path WebChat → `MATCH_INACTIVE`:**
   JWT válido con `profile_id` de un ex-inquilino → `MATCH_INACTIVE`; no se asume `STRONG_MATCH_ACTIVE` por el JWT.

5. **Flujo progresivo → `PARTIAL_MATCH_ACTIVE`:**
   Usuario proporciona nombre + residencia + habitación que coinciden parcialmente → `conv_sessions.identity_level = 'PARTIAL_MATCH_ACTIVE'`.

6. **Tres fallos → escalado:**
   Tres intentos de validación fallidos en la misma sesión → escalar al admin; no se realizan más intentos.

7. **Datos acumulados no se vuelven a pedir:**
   `conv_sessions.identity_data` ya tiene `full_name` → WF-IDENTITY no pregunta el nombre en el siguiente turno.

8. **`identity_level` no se degrada:**
   Sesión con `PARTIAL_MATCH_ACTIVE`; validación adicional devuelve `NO_MATCH` → el nivel permanece `PARTIAL_MATCH_ACTIVE`.

## 11. Criterio de done

La validación de identidad se considera correctamente implementada cuando:

- El fast-path WhatsApp se ejecuta en el primer mensaje de cada sesión antes de disparar WF-01
- `conv-core-validate-identity` se llama desde una EF, nunca directamente desde n8n
- `STRONG_MATCH_ACTIVE` es el único nivel que autoriza la creación de incidencias oficiales
- Los campos `profile_id`, `phone_number`, `full_name`, `room_label` y `assignment_id` se almacenan en `conv_sessions` y nunca se reenvían a n8n
- `identity_level` (enum) es el único campo relacionado con identidad que pasa a n8n
- Ningún dato almacenado en `conv_sessions.identity_data` se vuelve a solicitar al usuario
- Tras tres intentos fallidos, la sesión escala al admin y no se realizan más intentos automáticos
- `identity_level` solo avanza; nunca se degrada en una sesión activa

## 12. Documentos relacionados

- `rules-40-identity-validation.md` — reglas de validación de identidad
- `contract-identity-validation-result.md` — estructura completa de request y response
- `rules-80-data-and-privacy.md` — política de PII para datos de identidad
- `skill-whatsapp-wasender-integration.md` — fast-path WhatsApp en `conv-ingest`
- `skill-webchat-gateway.md` — fast-path WebChat en `conv-web-session`
- `skill-n8n-incidents-workflow.md` — WF-20 y WF-IDENTITY en contexto de incidencias

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`
