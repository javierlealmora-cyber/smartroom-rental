# rules-10-service-catalog.md — SmartConversations: Catálogo de Servicios

## 1. Propósito

Este documento define el catálogo canónico de servicios conversacionales y canales de entrega de SmartConversations, las reglas que gobiernan su combinación y la distinción fundamental entre servicios y canales.

Cualquier sistema que lea los servicios disponibles para un tenant, muestre opciones al usuario final o enrute un mensaje hacia un servicio debe conformarse a este documento.

---

## 2. Alcance

Este documento aplica a:

- La tabla `conv_service_activations`
- La tabla de catálogo `saas_services` (registro de códigos de servicio)
- WF-10 (enrutado basado en servicios activos)
- `conv-core-get-tenant-features` (expone los servicios activos a n8n)
- El widget WebChat (lógica de visualización de servicios)
- Cualquier panel de administración que gestione activaciones de servicios

---

## 3. Decisiones No Negociables

1. **Los servicios son el producto. Los canales no lo son.** Las unidades facturables son los tres servicios conversacionales. WhatsApp y WebChat son adaptadores de entrega para esos servicios.

2. **Los tres códigos de servicio válidos son fijos para V1.** Ningún servicio puede añadirse ni renombrarse sin actualizar simultáneamente el constraint `CHECK` de `conv_service_activations.service_code`, la tabla `saas_services`, el enrutado de WF-10, los requirements afectados (`REQ-SC-*` del nuevo servicio y sus integraciones de canal) y esta documentación. La lista no es una limitación arquitectónica permanente: es ampliable mediante un cambio coordinado y revisado en todas esas piezas, nunca mediante una adición ad hoc en una sola capa.

3. **Los dos códigos de canal válidos son fijos para V1.** Ningún canal puede añadirse sin actualizar simultáneamente los constraints `CHECK` de `conv_service_activations.channel`, `conv_messages.channel` y `conv_sessions.channel`, los requirements de canal afectados (canal + estándar de integración) y esta documentación. Al igual que con los servicios, esta lista es ampliable mediante cambio coordinado, no una restricción definitiva.

4. **Un número de WhatsApp por tenant.** Un tenant tiene exactamente una sesión Wasender y un número de WhatsApp. No existen subnúmeros ni números por servicio.

5. **La separación de servicios en WhatsApp es lógica, no física.** Todos los servicios comparten el mismo número. El enrutado lo realiza WF-10 basándose en la intención detectada.

6. **`data-services` en el script tag del WebChat es únicamente una pista de UX.** El backend —concretamente `conv-core-get-tenant-features`— es siempre la fuente de verdad de qué servicios están activos. Si `data-services` lista un servicio que el tenant no tiene contratado, `conv-web-message` debe rechazarlo.

---

## 4. Reglas Obligatorias

### 4.1 Catálogo de servicios

| `service_code` | Nombre visible | Descripción |
|---|---|---|
| `conv_incidencias` | Gestión de Incidencias | Recepción, clasificación y escalado de incidencias reportadas por inquilinos. Requiere validación de identidad antes de crear una incidencia oficial en el Core. |
| `conv_publicaciones` | Gestión de Publicaciones | Consultas sobre anuncios, comprobaciones de disponibilidad y captación de leads. Accesible a usuarios externos sin tenencia activa. |
| `conv_ayuda` | Ayuda / Consultas | FAQs generales, información sobre el alojamiento y consultas de soporte. El FAQ público es accesible en cualquier nivel de identidad. |

Estos tres valores son las únicas entradas válidas para `conv_service_activations.service_code`.

**Tabla de equivalencia con los nombres funcionales de los requirements** (`REQ-SC-000-smart-conversations-capability.md` y siguientes, que usan nombres en inglés a nivel de requirement):

| Nombre funcional (requirement) | `service_code` técnico |
|---|---|
| `incidents` | `conv_incidencias` |
| `advertisement` | `conv_publicaciones` |
| `help` | `conv_ayuda` |

### 4.2 Catálogo de canales

| `channel` | Implementación | Notas |
|---|---|---|
| `whatsapp` | Wasender | Una sesión por tenant. Entrada mediante webhook HTTP POST. Salida mediante la REST API de Wasender. |
| `webchat` | Widget React embebible | Entrega en tiempo real mediante Supabase Realtime. |

Estos dos valores son las únicas entradas válidas para `conv_service_activations.channel`, `conv_messages.channel` y `conv_sessions.channel`.

### 4.3 Modelo de activación

Cada registro de activación es una terna: `client_account_id × service_code × channel`.

```sql
UNIQUE (client_account_id, service_code, channel)
```

Un tenant que activa `conv_incidencias` en `whatsapp` y `conv_incidencias` en `webchat` requiere dos filas independientes. Pueden tener estados distintos: una activa y la otra inactiva.

Un tenant puede tener activa cualquier subconjunto no vacío de las seis combinaciones posibles.

### 4.4 Ningún servicio tiene lógica de negocio específica de canal

`conv_incidencias` se comporta de forma idéntica tanto si el mensaje llega por WhatsApp como por WebChat. El canal afecta únicamente al transporte (cómo llega el mensaje y cómo se entrega la respuesta), no a la lógica del servicio.

### 4.5 WF-10 debe leer los servicios activos en tiempo de ejecución

WF-10 debe llamar a `conv-core-get-tenant-features` en cada ejecución para determinar qué servicios están activos para el tenant actual. Nunca debe asumir un conjunto fijo de servicios activos desde configuración estática.

Si un tenant tiene exactamente un servicio activo, WF-10 enruta directamente a ese servicio sin presentar un menú.

Si un tenant tiene más de un servicio activo y la intención es ambigua, WF-10 presenta un menú que muestra únicamente los servicios activos para ese tenant en ese canal.

### 4.6 Cambio de servicio dentro de una sesión activa

Un usuario puede cambiar de servicio dentro de la misma sesión. Si el usuario tiene un caso abierto en un servicio y un nuevo mensaje indica intención de otro servicio, WF-10 debe:

1. Detectar el conflicto entre el servicio del caso abierto y la nueva intención.
2. Preguntar explícitamente al usuario si desea continuar el caso abierto o iniciar una nueva interacción en el otro servicio.
3. Actualizar `conv_sessions.active_service_code` solo después de que el usuario confirme.

El caso anterior debe permanecer en `conv_sessions.open_cases_ids[]` y no debe cerrarse automáticamente.

---

## 5. Casos Permitidos

- Un tenant con únicamente `conv_incidencias` activo en `whatsapp`.
- Un tenant con los tres servicios activos en ambos canales (seis filas en `conv_service_activations`).
- Un tenant con `conv_ayuda` activo solo en `webchat` y `conv_incidencias` activo solo en `whatsapp`.
- Una suscripción umbrella activa con cero filas en `conv_service_activations` (los mensajes llegan pero se ignoran silenciosamente en el nivel 3).
- Reutilizar un registro `conv_wa_sessions` existente al reactivar la suscripción umbrella.

---

## 6. Casos Prohibidos

- Añadir un cuarto `service_code` sin actualizar los tres constraints afectados y WF-10.
- Añadir un tercer `channel` sin actualizar los tres constraints afectados.
- Enrutar un mensaje a un servicio que no tiene fila activa en `conv_service_activations` para ese tenant y canal.
- Confiar en `data-services` del script tag del WebChat como fuente autoritativa de servicios activos.
- Incluir lógica específica de servicio dentro de la EF del webhook de WhatsApp (`conv-wa-webhook`).
- Crear dos sesiones Wasender para el mismo tenant.

---

## 7. Impacto en el Diseño

- `conv_service_activations` debe tener un constraint `CHECK` que aplique únicamente los tres códigos de servicio válidos y los dos canales válidos.
- La UI de activación de servicios debe leer desde `conv_service_activations` y no debe hardcodear ninguna disponibilidad de servicio.
- WF-10 debe presentar un menú únicamente cuando el tenant tiene más de un servicio activo y la intención es ambigua.
- El menú debe generarse dinámicamente a partir del resultado de `conv-core-get-tenant-features`.

---

## 8. Impacto en la Implementación

- Cualquier función que añada nuevos códigos de servicio debe actualizar: el CHECK de `conv_service_activations`, el seed de `saas_services`, la lógica de enrutado de WF-10 y la UI de administración.
- Cualquier función que añada nuevos canales debe actualizar: el CHECK de `conv_service_activations`, el CHECK de `conv_messages`, el CHECK de `conv_sessions`, la normalización en `conv-ingest` y los puntos de entrada WF-01/WF-02.
- `conv-web-message` debe verificar que el `service_code` solicitado (si se especifica en la petición) tiene una fila activa en `conv_service_activations` para `webchat` antes de procesar.

---

## 9. Dependencias

- `rules-00-scope-and-principles.md` — principios P1, P4
- `rules-20-tenant-activation-and-lifecycle.md` — ciclo de vida de activación
- `rules-50-conversation-routing.md` — lógica de enrutado de WF-10
- `contract-tenant-features-response.md` — estructura devuelta por `conv-core-get-tenant-features`

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`

---

## 10. Checklist de Validación

- [ ] El constraint CHECK de `conv_service_activations.service_code` lista exactamente tres valores
- [ ] El constraint CHECK de `conv_service_activations.channel` lista exactamente dos valores
- [ ] WF-10 llama a `conv-core-get-tenant-features` en tiempo de ejecución en cada ejecución
- [ ] El widget WebChat valida los servicios activos desde el backend, no desde `data-services`
- [ ] Ningún workflow de servicio contiene lógica específica de WhatsApp o de WebChat
- [ ] Ningún tenant tiene más de una fila en `conv_wa_sessions`
- [ ] El menú de activación de servicios en la UI de administración se genera dinámicamente desde el catálogo

---

## 11. Notas de Control de Cambios

Añadir un nuevo servicio requiere un cambio coordinado en: constraints de base de datos, datos seed, lógica de enrutado, requirements (`REQ-SC-*` del nuevo servicio y de cada integración servicio × canal), UI de administración y documentación. Este cambio debe revisarse antes del merge.

Añadir un nuevo canal requiere un cambio coordinado en: constraints de base de datos, capa de normalización, workflows de entrada de n8n, requirements (canal y estándar de integración) y documentación. Este cambio debe revisarse antes del merge.

Ninguno de los dos catálogos (servicios o canales) es una decisión arquitectónica cerrada de forma permanente: la restricción aplica a V1 y es ampliable cuando exista una necesidad real, siempre mediante el cambio coordinado descrito arriba.

El comportamiento del atributo de pista UX `data-services` no debe modificarse sin actualizar también `rules-31-webchat-channel.md` y el skill del gateway WebChat.
