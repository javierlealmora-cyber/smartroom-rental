# contract-tenant-features-response.md — SmartConversations: Contrato TenantFeaturesResponse

## 1. Propósito

`TenantFeaturesResponse` define qué servicios, canales y límites de plan están activos para un tenant en el momento de la consulta. Garantiza que WF-10 solo enruta mensajes a servicios y canales realmente contratados, sin depender de configuración local ni caché.

---

## 2. Cuándo se usa

Al inicio de cada ejecución de WF-10, antes de cualquier otra lógica. No se cachea entre ejecuciones: cada ejecución debe consultar `conv-core-get-tenant-features`.

También puede consultarse en cualquier EF del add-on que necesite verificar si un servicio o canal está activo para un tenant antes de procesar una solicitud.

---

## 3. Productor

| EF | Cuándo produce `TenantFeaturesResponse` |
|---|---|
| `conv-core-get-tenant-features` | En respuesta a cualquier llamada con `client_account_id` válido |

Esta EF lee la configuración activa desde las tablas `saas_service_subscriptions` y `conv_service_activations` de SmartRoom Core.

---

## 4. Consumidor

| Consumidor | Qué usa de `TenantFeaturesResponse` |
|---|---|
| WF-10 (enrutador) | `services_active` para construir menú y decidir enrutado; `plan_limits` para habilitar/deshabilitar IA |
| `conv-wa-webhook` | `services_active[].channels` para verificar nivel 3 de activación (canal WhatsApp) |
| `conv-web-message` | `services_active[].channels` para verificar nivel 3 de activación (canal WebChat) |

---

## 5. Estructura

```typescript
interface TenantFeaturesResponse {
  services_active:  ServiceActivation[];
  plan_limits:      PlanLimits;
}

interface ServiceActivation {
  service_code: ServiceCode;
  channels:     ChannelCode[];
  config?:      ServiceConfig;
}

interface PlanLimits {
  max_cases_per_month:  number;
  ai_enabled:           boolean;
  webchat_enabled:      boolean;
  whatsapp_enabled:     boolean;
}

interface ServiceConfig {
  auto_escalate_after_minutes?: number;
  ai_confidence_threshold?:     number;
  kb_confidence_threshold?:     number;
  fallback_message?:            string;
}

type ServiceCode = 'conv_incidencias' | 'conv_publicaciones' | 'conv_ayuda';
type ChannelCode = 'whatsapp' | 'webchat';
```

---

## 6. Campos obligatorios

| Campo | Tipo | Descripción |
|---|---|---|
| `services_active` | `ServiceActivation[]` | Lista de servicios activos. `[]` si ninguno está activo. |
| `services_active[].service_code` | `ServiceCode` | Identificador canónico del servicio |
| `services_active[].channels` | `ChannelCode[]` | Canales habilitados. Nunca vacío si el servicio está presente. |
| `plan_limits` | `PlanLimits` | Límites del plan activo |
| `plan_limits.max_cases_per_month` | `number` | Máximo de casos mensuales. `0` = ilimitado. |
| `plan_limits.ai_enabled` | `boolean` | `true` si el plan incluye procesamiento por IA |
| `plan_limits.webchat_enabled` | `boolean` | `true` si el plan incluye el canal WebChat |
| `plan_limits.whatsapp_enabled` | `boolean` | `true` si el plan incluye el canal WhatsApp |

---

## 7. Campos opcionales

| Campo | Tipo | Descripción |
|---|---|---|
| `services_active[].config` | `ServiceConfig` | Configuración específica del servicio para el tenant |
| `config.auto_escalate_after_minutes` | `number` | Minutos sin resolución antes de escalada automática |
| `config.ai_confidence_threshold` | `number` | Umbral de confianza para enrutado directo (defecto: 0.85) |
| `config.kb_confidence_threshold` | `number` | Umbral de confianza para respuesta automática de KB (defecto: 0.8) |
| `config.fallback_message` | `string` | Texto enviado al usuario cuando la IA no está disponible |

---

## 8. Reglas de validación

1. `services_active` y `plan_limits` son siempre obligatorios y nunca `null`.
2. Si `services_active = []`, WF-10 responde al usuario con mensaje de servicio no disponible y no procesa el mensaje.
3. Un servicio ausente de `services_active` equivale a no contratado; WF-10 no lo ofrece ni lo procesa.
4. `services_active[].channels` nunca puede ser un array vacío `[]` si el servicio está presente.
5. Un canal ausente en `channels` del servicio es rechazado por las EFs de canal.
6. `plan_limits.ai_enabled = false` inhibe todas las llamadas al proveedor de IA en todos los workflows del tenant.
7. `plan_limits.max_cases_per_month = 0` se interpreta como ilimitado.
8. La respuesta no debe contener claves API, tokens, `wasender_session_id` ni ningún dato de infraestructura.
9. **Regla de no caché:** WF-10 no puede cachear el resultado entre ejecuciones. Un cambio de suscripción del tenant debe reflejarse en la siguiente ejecución sin necesidad de reiniciar n8n.

**Comportamiento de WF-10 según la respuesta:**

| Condición | Acción de WF-10 |
|---|---|
| `services_active = []` | Mensaje "servicio no disponible"; no procesar |
| `plan_limits.ai_enabled = false` | Formulario conversacional guiado en lugar de IA |
| Servicio solicitado no en `services_active` | "Este servicio no está disponible actualmente" |
| Canal del mensaje no en `channels` del servicio | Rechazar con mensaje genérico |
| `max_cases_per_month > 0` y límite alcanzado | Escalar automáticamente; no crear caso nuevo |

---

## 9. Ejemplos válidos

### Tenant con todos los servicios y ambos canales

```json
{
  "services_active": [
    {
      "service_code": "conv_incidencias",
      "channels": ["whatsapp", "webchat"],
      "config": { "auto_escalate_after_minutes": 30, "ai_confidence_threshold": 0.85 }
    },
    { "service_code": "conv_publicaciones", "channels": ["whatsapp", "webchat"] },
    {
      "service_code": "conv_ayuda",
      "channels": ["whatsapp", "webchat"],
      "config": { "kb_confidence_threshold": 0.75, "fallback_message": "El equipo te atenderá en breve." }
    }
  ],
  "plan_limits": {
    "max_cases_per_month": 200,
    "ai_enabled": true,
    "webchat_enabled": true,
    "whatsapp_enabled": true
  }
}
```

### Tenant con solo WhatsApp e incidencias

```json
{
  "services_active": [
    { "service_code": "conv_incidencias", "channels": ["whatsapp"] },
    { "service_code": "conv_ayuda", "channels": ["whatsapp"] }
  ],
  "plan_limits": {
    "max_cases_per_month": 50,
    "ai_enabled": true,
    "webchat_enabled": false,
    "whatsapp_enabled": true
  }
}
```

### Tenant sin servicios activos

```json
{
  "services_active": [],
  "plan_limits": {
    "max_cases_per_month": 0,
    "ai_enabled": false,
    "webchat_enabled": false,
    "whatsapp_enabled": false
  }
}
```

---

## 10. Ejemplos inválidos

### Falta `plan_limits`

```json
{
  "services_active": [
    { "service_code": "conv_incidencias", "channels": ["whatsapp"] }
  ]
}
```
**Inválido:** `plan_limits` es obligatorio. Su ausencia impide a WF-10 saber si la IA está habilitada.

---

### `channels` vacío en un servicio presente

```json
{
  "services_active": [{ "service_code": "conv_incidencias", "channels": [] }],
  "plan_limits": {
    "max_cases_per_month": 50, "ai_enabled": true, "webchat_enabled": true, "whatsapp_enabled": true
  }
}
```
**Inválido:** si un servicio está en `services_active`, `channels` debe tener al menos un canal. `channels = []` es indistinguible de un servicio no contratado.

---

### Contiene credenciales de infraestructura

```json
{
  "services_active": [{ "service_code": "conv_incidencias", "channels": ["whatsapp"] }],
  "plan_limits": { "max_cases_per_month": 50, "ai_enabled": true, "webchat_enabled": false, "whatsapp_enabled": true },
  "wasender_api_key": "wa_live_abc123"
}
```
**Inválido:** las credenciales e IDs de infraestructura nunca deben aparecer en este contrato.

---

### `service_code` no reconocido

```json
{
  "services_active": [{ "service_code": "conv_pagos", "channels": ["whatsapp"] }],
  "plan_limits": { "max_cases_per_month": 50, "ai_enabled": true, "webchat_enabled": false, "whatsapp_enabled": true }
}
```
**Inválido:** `conv_pagos` no es un `ServiceCode` válido. Solo se aceptan `conv_incidencias`, `conv_publicaciones` y `conv_ayuda`.

---

## 11. Notas de versionado

- Añadir un campo **opcional** a `ServiceConfig` o a `PlanLimits` es compatible. Los consumidores deben ignorar campos no reconocidos.
- Añadir un nuevo `ServiceCode` requiere actualizar este contrato, `contract-canonical-response.md`, `rules-70-integration-api.md` y la lógica de WF-10 antes del despliegue.
- Eliminar o renombrar un campo de §6 (obligatorios) o un `ServiceCode` existente es un breaking change. Requiere coordinación con todos los consumidores de §4.
- Cambiar la semántica de `max_cases_per_month = 0` (actualmente: ilimitado) es un breaking change que afecta a WF-10 y al job de reconciliación.

---

## 12. Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`
