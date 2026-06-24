# rules-40-identity-validation.md — SmartConversations: Validación de Identidad

## 1. Propósito

Este documento define los cinco niveles de identidad, las reglas para alcanzar cada nivel, la matriz de acciones permitidas por nivel, el fast-path para WhatsApp, el flujo de identificación progresiva y la contribución de los eventos de validación de identidad al activity log de SmartRoom Core.

La validación de identidad es una preocupación central y transversal del sistema. Todos los servicios que requieren datos personales o realizan acciones en nombre de un inquilino específico dependen de las reglas aquí definidas.

---

## 2. Alcance

Este documento aplica a:

- EF `conv-core-validate-identity`
- WF-IDENTITY (sub-workflow de n8n)
- EF `conv-ingest` (fast-path en WhatsApp)
- EF `conv-web-session` (validación del JWT en WebChat)
- WF-20 (servicio de incidencias — requiere STRONG_MATCH_ACTIVE)
- WF-30 (servicio de publicaciones — accesible en UNVERIFIED_LEAD)
- WF-40 (servicio de ayuda — FAQ público accesible en NO_MATCH)
- Campos de la tabla `conv_sessions`: `identity_level`, `identity_data`, `profile_id`

---

## 3. Decisiones No Negociables

1. **La validación de identidad la realiza exclusivamente `conv-core-validate-identity` → SmartRoom Core.** La IA nunca debe determinar si un inquilino está activo.

2. **Crear una incidencia oficial en SmartRoom Core requiere `STRONG_MATCH_ACTIVE`.** Ninguna configuración, flag ni preferencia de tenant puede anular este requisito.

3. **Un ex-inquilino con `MATCH_INACTIVE` nunca debe operar como inquilino activo.** Independientemente de lo que el usuario afirme.

4. **El número de teléfono en WhatsApp es la señal de identidad más fiable.** El fast-path debe ejecutarse antes de pedir al usuario cualquier dato adicional.

5. **`UNVERIFIED_LEAD` no es un resultado de `conv-core-validate-identity`.** Lo asigna explícitamente WF-30 cuando el usuario no tiene relación de tenencia con el tenant.

6. **Los datos de identidad extraídos durante el flujo progresivo deben persistirse en `conv_sessions.identity_data`.** El mismo dato nunca debe solicitarse al usuario dos veces en la misma sesión.

7. **Tras tres intentos de validación fallidos consecutivos en una sesión, el sistema debe escalar a un admin humano.** No se permiten más intentos de validación automática en esa sesión.

---

## 4. Reglas Obligatorias

### 4.1 Niveles de identidad

| Nivel | Descripción | Cómo se alcanza |
|---|---|---|
| `STRONG_MATCH_ACTIVE` | Inquilino activo confirmado sin ambigüedad | El número de teléfono coincide exactamente con `profiles.phone` en el Core Y el perfil tiene una asignación activa en este tenant |
| `PARTIAL_MATCH_ACTIVE` | Los datos coinciden pero el teléfono no está confirmado | Nombre + residencia + habitación coinciden con un perfil del Core, existe asignación activa, pero el teléfono no fue verificado o no está registrado |
| `MATCH_INACTIVE` | Match encontrado pero la tenencia ha finalizado | Cualquier combinación de datos coincide con un perfil histórico, pero `move_out_date` es pasado o no existe asignación activa |
| `NO_MATCH` | No se encontró ningún perfil coincidente | Ningún dato proporcionado coincide con ningún perfil de este tenant |
| `UNVERIFIED_LEAD` | Usuario externo sin relación de tenencia | Asignado únicamente por WF-30; no es resultado de `conv-core-validate-identity` |

### 4.2 Matriz de acciones permitidas por nivel de identidad

| Acción | STRONG_ACTIVE | PARTIAL_ACTIVE | MATCH_INACTIVE | NO_MATCH | UNVERIFIED_LEAD |
|---|:---:|:---:|:---:|:---:|:---:|
| Crear incidencia oficial en Core | ✅ | ❌ | ❌ | ❌ | ❌ |
| Crear pre-incidencia en `conv_cases` (aún no en Core) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Acceder a datos contractuales, saldo, fechas personales | ✅ | ❌ | ❌ | ❌ | ❌ |
| Consultar anuncio / registrar interés como lead | ✅ | ✅ | ✅ | ✅ | ✅ |
| FAQ público | ✅ | ✅ | ✅ | ✅ | ✅ |
| Escalar a admin humano | ✅ | ✅ | ✅ | ✅ (con contexto) | ✅ |

### 4.3 Fast-path por teléfono (canal WhatsApp)

El fast-path se ejecuta en el primer mensaje de cada sesión de WhatsApp, antes de pedir ningún dato al usuario.

```
1. Extraer phone = message.from
2. Llamar conv-core-validate-identity con { phone, client_account_id }
3. Si STRONG_MATCH_ACTIVE:
   - UPDATE conv_sessions: profile_id, identity_level, datos de asignación en identity_data
   - No se solicita ningún dato adicional al usuario
4. Si cualquier otro resultado:
   - Guardar resultado en conv_sessions.identity_level
   - El workflow del servicio activará la identificación progresiva si es necesario
```

El resultado del fast-path debe almacenarse en `conv_sessions` antes de que WF-01 se dispare. El número de teléfono usado en el fast-path no debe propagarse a n8n ni a la IA.

### 4.4 Flujo de identificación progresiva

Este flujo se activa cuando el servicio actual requiere un nivel de identidad superior al que tiene la sesión en ese momento.

```
Paso 1: Solicitar nombre completo
  "Para ayudarte mejor, ¿puedes decirme tu nombre completo?"
  → Extraer mediante Claude API
  → Persistir en conv_sessions.identity_data.full_name

Paso 2: Solicitar residencia
  "¿En qué residencia vives?"
  → Validar nombre contra conv-core-get-accommodation-info
  → Si no reconocido: "No encuentro esa residencia. ¿Puedes confirmar el nombre exacto?"
  → Persistir en conv_sessions.identity_data.residence_name

Paso 3: Solicitar número de habitación
  "¿En qué habitación estás?"
  → Extraer mediante Claude API
  → Persistir en conv_sessions.identity_data.room_label

Paso 4: Llamar conv-core-validate-identity con los datos acumulados
  { full_name, residence_name, room_label, client_account_id }
  → STRONG_MATCH_ACTIVE → continuar con acceso completo
  → PARTIAL_MATCH_ACTIVE → continuar con acceso limitado
  → MATCH_INACTIVE → responder: "Tu estancia ya ha finalizado. ¿En qué más puedo ayudarte?"
  → NO_MATCH → responder: "No pude verificar tus datos. ¿Quieres que te ponga en contacto con el administrador?"
```

Reglas que gobiernan el flujo progresivo:
- Máximo 3 intentos fallidos por sesión. Al tercer fallo, escalar al admin.
- Un dato ya almacenado en `conv_sessions.identity_data` nunca debe solicitarse de nuevo en la misma sesión.
- `conv_sessions.identity_level` debe actualizarse tras cada llamada de validación exitosa.
- El nivel de identidad solo puede avanzar dentro de una sesión (de menor a mayor confianza). Nunca debe degradarse.

### 4.5 Identidad en WebChat al crear la sesión

Cuando un usuario abre el widget WebChat con una sesión autenticada (JWT del portal lodger):

1. `conv-web-session` valida el JWT con Supabase.
2. Si es válido, llama a `conv-core-validate-identity` con el `profile_id` resuelto.
3. El resultado establece `conv_sessions.identity_level`.
4. Un JWT válido acredita autenticación; no acredita tenencia activa. La tenencia activa requiere la llamada de validación contra el Core.

Si no se proporciona JWT, la sesión se crea con `identity_level = 'NO_MATCH'` y el flujo progresivo aplica si un servicio requiere mayor confianza.

### 4.6 Comportamiento por servicio

**`conv_incidencias`**

- Requiere `STRONG_MATCH_ACTIVE` para crear una incidencia oficial mediante `conv-core-create-incident`.
- Acepta `PARTIAL_MATCH_ACTIVE` para crear una pre-incidencia en `conv_cases` únicamente (aún no registrada en el Core).
- Para `MATCH_INACTIVE` o `NO_MATCH`: escalar al admin. No crear ningún registro de incidencia.
- Debe activar WF-IDENTITY si el nivel actual es insuficiente.

**`conv_publicaciones`**

- No requiere tenencia activa. `UNVERIFIED_LEAD` puede consultar anuncios y registrar interés.
- Crear un lead requiere datos mínimos de contacto: nombre completo (obligatorio) + teléfono o email (al menos uno).
- Si el usuario ya está identificado en la sesión, esos datos de contacto deben reutilizarse sin volver a solicitarlos.
- Datos visibles para `UNVERIFIED_LEAD`: precio, fecha de disponibilidad, condiciones generales. Nunca: datos de ocupantes, historial de ocupación, datos de contrato.

**`conv_ayuda`**

- FAQ público: accesible en cualquier nivel incluido `NO_MATCH`.
- Datos personales (saldo, fechas, contrato): requiere `PARTIAL_MATCH_ACTIVE` o superior.
- Información contractual completa: requiere `STRONG_MATCH_ACTIVE`.

### 4.7 Eventos de validación de identidad en el activity log del Core

Los siguientes eventos deben publicarse en el activity log de SmartRoom Core mediante Integration API:

| Desencadenante | Evento publicado |
|---|---|
| `conv-core-validate-identity` devuelve `STRONG_MATCH_ACTIVE` o `PARTIAL_MATCH_ACTIVE` | `conv_identity_validated` |
| El flujo progresivo llega a `MATCH_INACTIVE` (ex-inquilino detectado) | No se publica ningún evento (no es un hito funcional alcanzado) |
| Sesión escalada al admin tras 3 intentos fallidos | `conv_case_escalated` con contexto |

Los eventos deben contener únicamente datos no PII: `identity_level` (enum), `channel`, `session_id` (UUID opaco), `client_account_id`, `timestamp`. Nunca deben contener `profile_id`, `full_name`, `phone_number`, `room_label` ni `residence_name`.

Véase `rules-75-activity-log.md` para el formato del evento y el catálogo completo.

### 4.8 Tratamiento de PII durante la validación de identidad

El número de teléfono usado en el fast-path y los datos personales recopilados durante el flujo progresivo son sensibles:

- El número de teléfono nunca debe propagarse a n8n.
- El número de teléfono nunca debe incluirse en prompts de IA.
- Los campos `profile_id`, `assignment_id`, `room_id` devueltos por `conv-core-validate-identity` deben almacenarse en `conv_sessions` por la EF receptora y nunca deben reenviarse a n8n.
- `identity_level` (un valor de enum) es el único resultado que puede pasarse a n8n.

Véase `rules-80-data-and-privacy.md` para la política completa de minimización de PII.

---

## 5. Casos Permitidos

- Una sesión de WhatsApp que alcanza `STRONG_MATCH_ACTIVE` mediante el fast-path por coincidencia de teléfono sin pedir nada al usuario.
- Una sesión de WebChat que comienza en `NO_MATCH` y avanza a `PARTIAL_MATCH_ACTIVE` mediante el flujo progresivo.
- Una interacción de `conv_publicaciones` gestionada sin ninguna llamada a validación de identidad (el usuario es `UNVERIFIED_LEAD`).
- Una sesión escalada al admin tras tres intentos de validación fallidos.
- Una interacción de FAQ público de `conv_ayuda` respondida con `NO_MATCH` sin activar WF-IDENTITY.

---

## 6. Casos Prohibidos

- Crear una incidencia oficial en el Core con `PARTIAL_MATCH_ACTIVE` o inferior.
- Tratar `MATCH_INACTIVE` como inquilino activo para cualquier propósito.
- Asumir la identidad basándose únicamente en lo que el usuario declara, sin llamar a `conv-core-validate-identity`.
- Usar IA para determinar si un inquilino está activo, es válido o está autorizado.
- Propagar `profile_id`, `phone_number`, `full_name` o `room_label` a n8n.
- Solicitar un dato que ya está almacenado en `conv_sessions.identity_data`.
- Continuar la validación automática tras tres fallos consecutivos en la misma sesión.
- Degradar `conv_sessions.identity_level` dentro de una sesión activa.

---

## 7. Impacto en el Diseño

- WF-IDENTITY es un sub-workflow reutilizable invocable por WF-20, WF-40 y cualquier servicio futuro que requiera validación de identidad.
- `conv_sessions.identity_data` es el almacén único de los datos de identidad extraídos dentro de una sesión. Ningún workflow puede asumir datos que no estén presentes en él.
- El fast-path debe implementarse en `conv-ingest`, no en WF-01 ni en WF-10, para garantizar que se ejecuta antes del motor conversacional.
- Los servicios deben diseñarse para funcionar en múltiples niveles de identidad, degradando de forma elegante para sesiones con menor confianza.

---

## 8. Impacto en la Implementación

- `conv-core-validate-identity` es una frontera contractual. Su implementación consulta datos del Core; los consumidores deben tratarla como una caja negra.
- WF-IDENTITY debe actualizar `conv_sessions.identity_level` e `conv_sessions.identity_data` en cada paso de validación exitoso.
- El escalado al admin activado tras tres fallos debe incluir el `identity_data` acumulado como contexto.
- Los campos del resultado de validación de identidad (`profile_id`, `assignment_id`, `room_id`, `room_label`, `full_name`) deben almacenarse en `conv_sessions` por la EF. Nunca deben reenviarse a n8n.

---

## 9. Dependencias

- `rules-00-scope-and-principles.md` — principio P5 (la IA no valida)
- `rules-60-service-incidents.md` — requisito de STRONG_MATCH_ACTIVE para incidencias oficiales
- `rules-61-service-listings.md` — acceso de UNVERIFIED_LEAD a publicaciones
- `rules-75-activity-log.md` — evento `conv_identity_validated`
- `rules-80-data-and-privacy.md` — restricciones de propagación de PII
- `contract-identity-validation-result.md` — estructura de la respuesta de `conv-core-validate-identity`

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`

---

## 10. Checklist de Validación

- [ ] El fast-path se ejecuta en el primer mensaje de cada sesión de WhatsApp antes de cualquier interacción de servicio
- [ ] `conv-core-validate-identity` se llama desde una EF, nunca directamente desde n8n
- [ ] `STRONG_MATCH_ACTIVE` es el único nivel que autoriza la creación de incidencias oficiales
- [ ] Los usuarios con `MATCH_INACTIVE` reciben "Tu estancia ya ha finalizado" y no pueden crear incidencias
- [ ] Tras 3 intentos fallidos, la sesión escala al admin y no se realizan más intentos de validación
- [ ] `profile_id`, `phone_number`, `full_name`, `room_label` se almacenan en `conv_sessions` y nunca se reenvían a n8n
- [ ] `identity_level` (enum) es el único campo relacionado con identidad que se pasa a n8n
- [ ] Ningún dato almacenado en `conv_sessions.identity_data` se vuelve a solicitar al usuario en la misma sesión
- [ ] Los eventos `conv_identity_validated` contienen únicamente campos no PII

---

## 11. Notas de Control de Cambios

Añadir un nuevo nivel de identidad requiere actualizaciones simultáneas en:
- El constraint `CHECK` de `conv_sessions.identity_level`
- La matriz de acciones en este documento (Sección 4.2)
- `contract-identity-validation-result.md`
- La lógica de WF-IDENTITY en n8n
- Cualquier workflow de servicio que ramifique sobre `identity_level`

Este cambio debe revisarse antes del merge.
