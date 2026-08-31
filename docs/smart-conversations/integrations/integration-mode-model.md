# Integration Mode Model — SmartConversations Fase 11C1

## Los 5 modos de integración

### mock

No realiza llamadas externas. Devuelve respuesta ficticia predefinida.
- Activo por defecto en todos los adapters.
- Variable: `*_INTEGRATION_MODE=mock` (o valor ausente).
- Safe para CI, tests offline, desarrollo local.

### shadow

Llama al servicio real, valida contrato y registra métricas, pero NO usa la respuesta para alterar el flujo oficial.
- Solo para operaciones seguras/idempotentes: búsquedas, health, clasificación IA sin aplicar.
- NUNCA para escrituras: crear incidencia, crear lead, enviar WhatsApp, publicar Activity Log.
- No duplicar operaciones mutables en shadow.

### canary

Usa el servicio real únicamente para tenants en la allowlist explícita.
- Tenant fuera de allowlist → mock automático.
- Allowlist: `integration-canary.ts` (CANARY_ALLOWLIST).
- Solo tenants ficticios DEV. Sin UUIDs reales de PRE/PRO.
- Activación individual por integración.

### real

Usa el servicio real para el entorno DEV configurado.
- Solo permitido en `APP_ENVIRONMENT=sandbox|dev|development`.
- Rechazado en production, preproduction, unknown.
- Requiere secrets configurados.

### disabled

Rechaza la operación de forma segura con `FEATURE_DISABLED`.
- Modo explícito para integraciones no disponibles.
- Ningún modo real puede activarse por valor desconocido (fail-closed → disabled).

---

## Reglas de fail-closed

1. Valor desconocido en variable de modo → `disabled`.
2. Modo `real`/`canary` fuera de entorno DEV → `CONFIGURATION_ERROR`.
3. Modo `real` sin secrets → `CONFIGURATION_ERROR`.
4. Circuit breaker abierto → `DEPENDENCY_UNAVAILABLE` (retryable).
5. Tenant no en allowlist canary → degradado a `mock`.

---

## Shadow — operaciones permitidas vs prohibidas

| operación | shadow permitido |
|-----------|-----------------|
| búsqueda de anuncios | ✅ |
| consulta KB help | ✅ |
| health check | ✅ |
| clasificación IA (sin aplicar) | ✅ |
| crear incidencia | ❌ |
| crear lead | ❌ |
| enviar WhatsApp | ❌ |
| publicar Activity Log | ❌ |
| cualquier alta en Core | ❌ |

---

## Variables de entorno por integración

| integración | variable de modo | valor defecto |
|------------|-----------------|---------------|
| core | CORE_INTEGRATION_MODE | mock |
| ai | AI_INTEGRATION_MODE | mock |
| n8n | N8N_INTEGRATION_MODE | mock |
| incidents_addon | INCIDENTS_ADDON_INTEGRATION_MODE | mock |
| listings_addon | LISTINGS_ADDON_INTEGRATION_MODE | mock |
| realtime | REALTIME_INTEGRATION_MODE | mock |
| wasender | WASENDER_INTEGRATION_MODE | mock |
