# Skill — Consulta de hechos de entitlement para Smart Incidents (Gates 2 y 3)

**Estado del contrato de referencia:** `DRAFT_OWNER_REVIEW_COMPLETE` — `CONSUMER_REVIEW_PENDING_SMART_INCIDENTS`  
**Autenticación:** `CALLER_AUTH_PATTERN_PENDING` — implementación no autorizada todavía  
**Contrato canónico:** `docs/smart-conversations/integrations/smart-incidents-entitlement/v1/contract-incident-channel-facts.md`

---

## 1. Objetivo

Este skill describe cuándo y cómo Smart Incidents (SI) debe consultar a SmartConversations (SC) los dos hechos de entitlement necesarios antes de crear un incidente de origen conversacional:

- **Gate 2** (`incident_creation_capability_active`): ¿tiene este tenant habilitada la capacidad de incidencias en SC para el canal solicitado?
- **Gate 3** (`source_channel_active`): ¿está operativa la infraestructura del canal conversacional para este tenant en SC?

Este skill es independiente del skill de creación de incidencias (`skill-n8n-incidents-workflow.md`). No cubre Gate 1 (identidad del actor), el flujo n8n, ni la creación final del incidente en el add-on externo. No menciona ni hace referencia a `FEATURE_DISABLED`.

---

## 2. Cuándo usar este skill

Usar este skill cuando SI necesite:

- entender qué verificaciones de entitlement son responsabilidad de SC (no de SI)
- implementar la invocación al contrato `SI-P4C2B-SC` — cuando esté autorizado
- revisar la semántica de Gate 2 y Gate 3 antes de decidir si un incidente puede crearse
- distinguir entre ausencia funcional (hecho `false`) y fallo técnico (error de SC)
- entender los límites de responsabilidad entre SC (fact owner) y SI (decision maker)

**No usar este skill para:**

- Gate 1 (identidad del actor) — cubierto por `rules-40-identity-validation.md`
- Verificación de suscripción al add-on `smart_incidents` en `saas_service_subscriptions` — es responsabilidad exclusiva de SI, no de SC
- La creación del incidente en el add-on externo — cubierto por `skill-n8n-incidents-workflow.md`
- Resolver la autenticación SI→SC — pendiente de `CALLER_AUTH_PATTERN_PENDING`

---

## 3. Preconditions

Antes de invocar el contrato `SI-P4C2B-SC`, SI debe haber completado:

1. Resolución server-side del tenant: `client_account_id` obtenido de `resolveTenantFromContext()` — nunca del body original.
2. Resolución server-side del canal: `source_channel` obtenido de `resolveIncidentSourceChannel(conv_session.channel)`.
3. Evaluación de Gate 1 (identidad del actor) por SC internamente.
4. Verificación independiente de la suscripción activa al add-on `smart_incidents` en `saas_service_subscriptions` — responsabilidad de SI, no de SC.

Leer antes de implementar:

- `docs/smart-conversations/integrations/smart-incidents-entitlement/v1/contract-incident-channel-facts.md` — contrato canónico, fuente de verdad de los schemas wire
- `docs/smart-incidents/rules/rules-10-addon-entitlement.md §4.4` — normativa del doble gating SC + SI
- `docs/smart-conversations/rules/rules-20-tenant-activation-and-lifecycle.md §4.1` — modelo de activación de tres niveles

---

## 4. Restricciones de origen

Este skill respeta las siguientes decisiones cerradas:

1. **SC es el único fact owner de Gates 2 y 3.** SI no puede leer directamente `conv_service_activations`, `conv_wa_sessions` ni `conv_wc_configs`. El acceso a esas tablas es exclusivo de SC.

2. **SI es el único decision maker.** La política conjunta `(suscripción activa SI) AND Gate2 AND Gate3` la evalúa SI, no SC. SC no toma decisiones de negocio de SI.

3. **Gate 1 está fuera del alcance de este contrato.** SC evalúa la identidad del actor internamente en su propio flujo. Este skill y el contrato `SI-P4C2B-SC` no cubren Gate 1.

4. **Un hecho `false` no es un error.** `incident_creation_capability_active: false` o `source_channel_active: false` son respuestas exitosas de SC que comunican la configuración actual del tenant. SI nunca trata un `false` como fallo técnico.

5. **`FEATURE_DISABLED` no existe en este contrato.** No es un código de error válido en la interacción SC → SI para hechos de entitlement.

6. **`service_role` no es credencial intermodular.** SC no puede recibir solicitudes de SI mediante `service_role` key. La autenticación queda pendiente de `CALLER_AUTH_PATTERN_PENDING`.

7. **Sin implementación autorizada todavía.** El contrato está en estado `CONSUMER_REVIEW_PENDING_SMART_INCIDENTS`. Ninguna implementación puede activarse en modo `real` ni `canary` hasta que se resuelvan la revisión consumer y `CALLER_AUTH_PATTERN_PENDING`.

8. **Atomicidad `BEST_EFFORT_MULTI_QUERY_SNAPSHOT`.** Los dos hechos se evalúan en consultas SQL separadas en SC. SI debe asumir que pueden reflejar instantes ligeramente distintos ante cambios de configuración concurrentes.

---

## 5. Semántica de los hechos

### Gate 2 — `incident_creation_capability_active`

**Fuente:** `conv_service_activations` (Nivel 3 del modelo de activación de SC)  
**Constraint:** `UNIQUE (client_account_id, service_code, channel)` — cardinalidad 0 o 1 filas  
**Filtro:** `service_code = 'conv_incidencias'` AND `channel = source_channel`  
**Regla:** `is_active = true` en la fila única → `true`. 0 filas o `is_active = false` → `false`.  
**Es per tenant × canal.** No existe activación global de `conv_incidencias` sin canal.

### Gate 3 — `source_channel_active`

Depende del canal:

**WhatsApp:**
- Fuente: `conv_wa_sessions` (Nivel 2 WA)
- Constraint: `UNIQUE client_account_id` — cardinalidad 0 o 1 filas
- Regla: `status = 'active'` → `true`. 0 filas o `status != 'active'` → `false`.

**WebChat:**
- Fuente: `conv_wc_configs` (Nivel 2 WC)
- Constraint: `UNIQUE client_account_id` — cardinalidad 0 o 1 filas
- Regla: `is_active = true` → `true`. 0 filas o `is_active = false` → `false`.

---

## 6. Ausencia funcional frente a fallo técnico

### Ausencia funcional → SC responde HTTP 200 con hecho `false`

Casos tratados como ausencia funcional (SI los recibe como `false`, no como error):

- `conv_incidencias` no está activado para el tenant en ese canal
- `conv_incidencias` tiene `is_active = false` para el tenant en ese canal
- La sesión WhatsApp no existe o tiene `status != 'active'`
- La configuración WebChat no existe o tiene `is_active = false`

**SI rechaza fail-closed** cuando cualquier hecho es `false`.

### Fallo técnico → SC responde con error response

Casos tratados como fallo técnico (SI los recibe como código de error):

- Error de base de datos al consultar las tablas de activación
- Timeout de conexión
- Dependencia caída
- Excepción inesperada en SC

**SI nunca infiere un hecho positivo** cuando SC devuelve error. **SI rechaza fail-closed** en todos los casos de error de SC.

### Comportamiento de SI ante `DEPENDENCY_UNAVAILABLE`

`DEPENDENCY_UNAVAILABLE` (`retryable: true`) es el único código que permite reintentar:
- Reintentar con backoff exponencial (máx. 2 reintentos)
- Si persiste → rechazar fail-closed

El resto de errores (`VALIDATION_ERROR`, `AUTHENTICATION_REQUIRED`, `CALLER_NOT_AUTHORIZED`, `INTERNAL_ERROR`) son `retryable: false` y no se reintenten.

---

## 7. Pasos para invocar el contrato (cuando esté autorizado)

> **Importante:** la implementación NO está autorizada todavía. `CALLER_AUTH_PATTERN_PENDING` y `CONSUMER_REVIEW_PENDING_SMART_INCIDENTS` deben resolverse primero.

Cuando la implementación esté autorizada, el flujo de SI será:

**Paso 1 — Verificar precondiciones**
```
client_account_id ← resolveTenantFromContext()
source_channel    ← resolveIncidentSourceChannel(conv_session.channel)
// Gate 1 ya evaluado por SC
// Suscripción add-on ya verificada por SI
```

**Paso 2 — Construir la solicitud wire**
```json
{
  "contract_version": "1.0",
  "request_id": "<nuevo UUID generado por SI>",
  "correlation_id": "<correlation_id del flujo SI>",
  "client_account_id": "<resuelto server-side>",
  "operation": "create_incident",
  "source_channel": "<'whatsapp' | 'webchat'>",
}
```
Todos los campos son obligatorios. `additionalProperties: false`. Sin campos adicionales.

**Paso 3 — Evaluar la respuesta**

Si SC responde HTTP 200 (respuesta exitosa):
```
Gate2 = incident_creation_capability_active
Gate3 = source_channel_active

SI evalúa: (suscripción_activa) AND Gate2 AND Gate3
Si cualquiera es false → rechazar fail-closed
```

Si SC responde error:
```
Rechazar fail-closed.
Si retryable=true → reintentar con backoff (máx. 2)
Si agotados → rechazar fail-closed
```

**Paso 4 — No asumir positivo por defecto**

En ningún caso SI puede continuar con la creación del incidente si no ha recibido una respuesta exitosa de SC con ambos hechos en `true`.

---

## 8. Estados del contrato

| Estado | Significado |
|--------|-------------|
| `DRAFT_OWNER_REVIEW_COMPLETE` | Revisión del productor (SC) completada |
| `CONSUMER_REVIEW_PENDING_SMART_INCIDENTS` | Pendiente de revisión por Smart Incidents |
| `CALLER_AUTH_PATTERN_PENDING` | Mecanismo de autenticación SI→SC sin definir. Bloquea `real`/`canary`. |
| `ENTITLEMENT_FACTS_SKILL_CREATED` | Esta skill existe y referencia el contrato canónico |
