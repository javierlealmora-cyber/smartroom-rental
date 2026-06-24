# test-conversation-routing-spec.md — Especificación de Pruebas: Enrutado Conversacional (WF-10)

## 1. Objetivo

Verificar que WF-10 enruta cada mensaje entrante al workflow de servicio correcto según las reglas definidas en `rules-50-conversation-routing.md`: lectura obligatoria de `TenantFeaturesResponse`, umbral de confianza 0.85, menú dinámico, gestión de cambio de contexto con casos abiertos, y ausencia de PII en los payloads enviados a los workflows de servicio.

---

## 2. Alcance

| Incluye | Excluye |
|---|---|
| Lógica de decisión de WF-10 completa | Lógica interna de WF-20, WF-30, WF-40 |
| Llamada a `conv-core-get-tenant-features` | Lógica interna de las EFs `conv-core-*` |
| Clasificación de intención por IA | Flujo de WF-IDENTITY (cubierto en `test-identity-validation-spec.md`) |
| Gestión de casos abiertos y cambio de contexto | Job de reconciliación `WF-C00-RECONCILE` |
| Construcción del payload a los workflows de servicio | Panel de administración |

---

## 3. Reglas y Contratos Cubiertos

| Documento | Sección | Qué se verifica |
|---|---|---|
| `rules-50-conversation-routing.md` | §4.1 | Lectura de `TenantFeaturesResponse` sin caché en cada ejecución |
| `rules-50-conversation-routing.md` | §4.2 | Umbral de confianza 0.85 para enrutado directo |
| `rules-50-conversation-routing.md` | §4.3 | Menú dinámico cuando confianza < 0.85 y hay más de 1 servicio activo |
| `rules-50-conversation-routing.md` | §4.4 | Cambio de contexto: confirmación explícita del usuario obligatoria |
| `rules-50-conversation-routing.md` | §4.5 | Enrutado directo cuando hay exactamente 1 servicio activo |
| `rules-00-scope-and-principles.md` | §4.5 | Payload a n8n/workflows sin PII |
| `contract-tenant-features-response.md` | §3 | Estructura de `TenantFeaturesResponse` y campo `services_active` |
| `contract-canonical-response.md` | §3 | Estructura de `CanonicalResponse` devuelta al canal |
| `contract-case-state-machine.md` | §4 | WF-10 no modifica estados; solo lee `active_case_id`, `open_cases_ids` |

---

## 4. Precondiciones

- Tenant `tenant_A` con `saas_service_subscriptions.status = 'active'` y `service_code = 'smart_conversations'`.
- Al menos un servicio activo en `conv_service_activations` para el tenant y canal bajo prueba.
- `conv_sessions` con entrada válida para el `session_id` bajo prueba.
- EF `conv-core-get-tenant-features` disponible y devolviendo `TenantFeaturesResponse` válido.
- n8n disponible y procesando payloads de WF-01.

---

## 5. Escenarios de Prueba

### Bloque RT — Lectura de características del tenant

**RT-01: `TenantFeaturesResponse` se lee en cada ejecución (sin caché)**

- **Precondición**: El tenant tiene `services_active = ['conv_incidencias']`. A mitad de la prueba se desactiva el servicio en `conv_service_activations`.
- **Acción**: Enviar dos mensajes consecutivos. El segundo mensaje se envía después de desactivar el servicio.
- **Resultado esperado**:
  - Primer mensaje: WF-10 enruta a WF-20 con normalidad.
  - Segundo mensaje: WF-10 recibe `services_active = []` y devuelve `CanonicalResponse { response_type: 'no_service' }`.
- **Regla cubierta**: `rules-50` §4.1 — sin caché entre ejecuciones.

---

**RT-02: `services_active = []` → respuesta "servicio no disponible"**

- **Precondición**: Tenant con `conv_service_activations.is_active = false` para todos los servicios en el canal bajo prueba.
- **Acción**: Enviar cualquier mensaje al tenant.
- **Resultado esperado**:
  - `CanonicalResponse { response_type: 'no_service' }`.
  - No se llama a ningún workflow de servicio (WF-20/30/40).
  - No se modifica `conv_sessions.active_service_code`.
- **Regla cubierta**: `rules-50` §4.1.

---

### Bloque RT — Enrutado por confianza

**RT-03: Confianza ≥ 0.85 → enrutado directo a WF-20**

- **Precondición**: Tenant con servicios activos: `['conv_incidencias', 'conv_ayuda']`. Sesión sin casos abiertos.
- **Acción**: Enviar mensaje `"Hay una gotera en mi habitación"`.
- **Resultado esperado**:
  - IA clasifica con `service_code = 'conv_incidencias'`, `confidence ≥ 0.85`.
  - WF-10 actualiza `conv_sessions.active_service_code = 'conv_incidencias'` vía EF.
  - WF-20 invocado con payload `{ session_id, client_account_id, message_text, channel, identity_level, service_code: 'conv_incidencias' }`.
  - Payload no contiene `profile_id`, `phone_number`, `full_name`, `room_label`.
- **Regla cubierta**: `rules-50` §4.2; `rules-00` §4.5.

---

**RT-04: Confianza < 0.85 con 2 servicios activos → menú dinámico**

- **Precondición**: Tenant con servicios activos: `['conv_incidencias', 'conv_ayuda']`. Sesión sin casos abiertos.
- **Acción**: Enviar mensaje ambiguo `"Necesito ayuda con algo"`.
- **Resultado esperado**:
  - IA clasifica con `confidence < 0.85`.
  - WF-10 devuelve `CanonicalResponse { response_type: 'menu', options: ['conv_incidencias', 'conv_ayuda'] }`.
  - El menú contiene exactamente los 2 servicios activos del tenant.
  - No se invoca ningún workflow de servicio hasta que el usuario elige.
  - `conv_sessions.active_service_code` no se modifica hasta la elección.
- **Regla cubierta**: `rules-50` §4.3.

---

**RT-05: Confianza < 0.85 con exactamente 1 servicio activo → enrutado directo**

- **Precondición**: Tenant con exactamente un servicio activo: `['conv_incidencias']`. Sesión sin casos abiertos.
- **Acción**: Enviar mensaje ambiguo `"No sé cómo explicarlo"`.
- **Resultado esperado**:
  - Aunque `confidence < 0.85`, WF-10 enruta directamente a WF-20 (único servicio disponible).
  - No se presenta menú.
- **Regla cubierta**: `rules-50` §4.5.

---

**RT-06: `service_code` devuelto por IA no está en `services_active` → confianza = 0**

- **Precondición**: Tenant con `services_active = ['conv_incidencias']`. Sesión sin casos abiertos.
- **Acción**: Enviar mensaje que la IA clasifica como `conv_publicaciones` (servicio no activo para este tenant).
- **Resultado esperado**:
  - WF-10 detecta que `conv_publicaciones` no está en `services_active`.
  - Trata la clasificación como `confidence = 0` (ambigua).
  - Con 1 servicio activo → enrutado directo a WF-20.
- **Regla cubierta**: `rules-50` §4.2.

---

### Bloque RT — Cambio de contexto con casos abiertos

**RT-07: Mensaje continúa caso activo (confianza ≥ 0.85) → enrutado sin menú**

- **Precondición**: Sesión con `active_case_id` apuntando a un caso `conv_incidencias` en estado `waiting_user`.
- **Acción**: Enviar `"El problema de la gotera sigue igual"`.
- **Resultado esperado**:
  - IA clasifica con `confidence ≥ 0.85` que el mensaje continúa el caso activo.
  - WF-10 enruta directamente al workflow del servicio activo.
  - No se pregunta al usuario si quiere continuar.
  - `active_service_code` no cambia.
- **Regla cubierta**: `rules-50` §4.4.

---

**RT-08: Mensaje introduce tema nuevo con caso abierto (confianza < 0.85) → pregunta de cambio de contexto**

- **Precondición**: Sesión con `active_case_id` apuntando a un caso `conv_incidencias`.
- **Acción**: Enviar `"Quiero ver una habitación disponible"`.
- **Resultado esperado**:
  - La intención se clasifica para `conv_publicaciones`, un servicio diferente al del caso activo (`conv_incidencias`). La confirmación es obligatoria **independientemente del nivel de confianza** de la clasificación: el criterio es que hay un caso abierto y la intención pertenece a un servicio distinto.
  - WF-10 devuelve `CanonicalResponse` preguntando: "Tienes un caso abierto de incidencias. ¿Quieres continuar con ese caso o prefieres consultar información sobre habitaciones?".
  - `active_service_code` **no** se modifica hasta confirmación explícita del usuario.
- **Regla cubierta**: `rules-50` §4.4.

---

**RT-09: Usuario confirma cambio de contexto → `active_service_code` actualizado**

- **Precondición**: Estado de RT-08 — WF-10 está esperando confirmación del usuario.
- **Acción**: Usuario responde "Sí, quiero consultar habitaciones".
- **Resultado esperado**:
  - EF actualiza `conv_sessions.active_service_code = 'conv_publicaciones'` vía `service_role`.
  - WF-10 invoca WF-30 con el payload correcto.
  - `active_case_id` del caso de incidencias se mantiene en `open_cases_ids` (el caso no se cierra).
- **Regla cubierta**: `rules-50` §4.4.

---

**RT-10: Menú incluye opción "volver al caso pendiente" cuando hay casos en `open_cases_ids`**

- **Precondición**: Sesión con `open_cases_ids = [case_uuid_1]` (caso en estado `waiting_user`). Tenant con 2 servicios activos. Mensaje ambiguo recibido.
- **Acción**: WF-10 construye el menú dinámico.
- **Resultado esperado**:
  - El menú incluye una opción adicional "Volver al caso pendiente" además de las opciones de servicio.
  - La opción de caso pendiente permite retomar el flujo del caso existente.
- **Regla cubierta**: `rules-50` §4.3.

---

### Bloque RT — Payload a los workflows de servicio

**RT-11: Payload enviado a WF-20/30/40 nunca contiene PII**

- **Precondición**: Sesión con `identity_level = 'STRONG_MATCH_ACTIVE'`.
- **Acción**: WF-10 enruta a WF-20 tras clasificación con confianza ≥ 0.85.
- **Resultado esperado**:
  - El payload a WF-20 contiene exactamente: `{ session_id, client_account_id, message_text, channel, identity_level, service_code }`.
  - El payload **no** contiene: `profile_id`, `phone_number`, `full_name`, `room_label`, `residence_name`, `assignment_id`.
- **Regla cubierta**: `rules-00` §4.5; `rules-80` §4.1.

---

**RT-12: `CanonicalResponse { response_type: 'identity_required' }` → activar WF-IDENTITY**

- **Precondición**: WF-20 devuelve `CanonicalResponse { response_type: 'identity_required' }`.
- **Acción**: WF-10 recibe la respuesta de WF-20.
- **Resultado esperado**:
  - WF-10 activa WF-IDENTITY.
  - El usuario recibe el primer mensaje del flujo de identificación progresiva.
- **Regla cubierta**: `rules-50` §4.6; `rules-40`.

---

**RT-13: `CanonicalResponse` con `response_type` desconocido → escalado defensivo**

- **Precondición**: WF-20 devuelve un `response_type` no definido en el contrato.
- **Acción**: WF-10 recibe la respuesta inesperada.
- **Resultado esperado**:
  - WF-10 trata el caso como error.
  - El usuario recibe mensaje genérico de escalado.
  - El evento se registra en logs del add-on.
- **Regla cubierta**: `contract-canonical-response.md` §3; `rules-90` §4.1.

---

## 6. Casos Negativos

| ID | Caso negativo | Resultado esperado |
|---|---|---|
| RT-NEG-01 | n8n llama directamente a APIs del Core sin pasar por EFs `conv-core-*` | Violación arquitectural; el Core rechaza o no tiene contexto del add-on |
| RT-NEG-02 | WF-10 modifica `conv_sessions` directamente (sin EF con `service_role`) | El sistema de permisos de Supabase rechaza la operación (RLS) |
| RT-NEG-03 | WF-10 envía `profile_id` en el payload a WF-20 | Violación de `rules-80` §4.1; el campo no debe estar en el payload |
| RT-NEG-04 | WF-10 cachea `TenantFeaturesResponse` entre ejecuciones | El tenant activa/desactiva servicio y WF-10 no lo detecta hasta reinicio |
| RT-NEG-05 | `active_service_code` se actualiza sin confirmación del usuario cuando hay caso abierto y la intención pertenece a un servicio diferente | El usuario no confirmó el cambio; violación de `rules-50` §4.4. Nota: si no hay caso abierto, WF-10 puede actualizar `active_service_code` directamente sin confirmación |
| RT-NEG-06 | Menú hardcodeado en lugar de construido desde `TenantFeaturesResponse` | Servicios no contratados aparecen en el menú; servicios activos no aparecen |

---

## 7. Datos de Prueba

```json
{
  "tenant_routing_test": {
    "client_account_id": "aaaa-1111-routing-tenant",
    "services_active_multi": ["conv_incidencias", "conv_ayuda"],
    "services_active_single": ["conv_incidencias"],
    "services_active_none": []
  },
  "session_no_open_cases": {
    "session_id": "sess-rt-001",
    "state": "IN_SERVICE",
    "active_case_id": null,
    "open_cases_ids": [],
    "identity_level": "STRONG_MATCH_ACTIVE"
  },
  "session_with_open_case": {
    "session_id": "sess-rt-002",
    "state": "AWAITING_USER",
    "active_case_id": "case-rt-001",
    "open_cases_ids": ["case-rt-001"],
    "active_service_code": "conv_incidencias",
    "identity_level": "STRONG_MATCH_ACTIVE"
  },
  "messages": {
    "high_confidence_incident": "Hay una gotera en el techo de mi habitación, lleva dos días.",
    "low_confidence_ambiguous": "Necesito ayuda con algo.",
    "context_switch_listings": "Quiero ver una habitación disponible para otro inquilino.",
    "continues_active_case": "El problema de la gotera sigue igual, ya han pasado 3 días."
  }
}
```

---

## 8. Criterio de Aceptación

| Criterio | Condición de éxito |
|---|---|
| Sin caché de `TenantFeaturesResponse` | Cambio de configuración del tenant reflejado en la siguiente ejecución |
| Umbral 0.85 aplicado correctamente | Enrutado directo ≥ 0.85; menú < 0.85 (con más de 1 servicio) |
| Payload limpio de PII | Ningún campo prohibido (`profile_id`, `phone_number`, etc.) llega a WF-20/30/40 |
| Cambio de contexto con confirmación | `active_service_code` nunca cambia sin respuesta afirmativa del usuario |
| `services_active = []` → `no_service` | Nunca se invoca un workflow de servicio cuando no hay servicios activos |
| Menú dinámico | El menú refleja exactamente los servicios activos del tenant para ese canal |
| WF-10 no modifica estados directamente | Todas las escrituras en `conv_sessions` pasan por EFs con `service_role` |

---

## 9. Dependencias

| Documento | Relación |
|---|---|
| `rules-50-conversation-routing.md` | Fuente de verdad del motor de enrutado |
| `contract-tenant-features-response.md` | Estructura de `TenantFeaturesResponse` |
| `contract-canonical-response.md` | Valores de `response_type` válidos |
| `contract-case-state-machine.md` | Estados de sesión y casos que WF-10 lee |
| `rules-00-scope-and-principles.md` §4.5 | Restricciones PII en payloads |
| `rules-80-data-and-privacy.md` §4.1 | Tabla de minimización de PII por capa |
| `skill-n8n-conversation-engine.md` | Detalles de implementación de WF-10 |
| `diagram-conversation-routing-flow.md` | Diagrama de referencia del flujo |

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
