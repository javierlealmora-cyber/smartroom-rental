# DEV Integration Readiness — SmartConversations Fase 11C1

Estado: INTEGRATIONS_OFFLINE_READY_DEV_PENDING
Fase: 11C1
GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING

---

## Inventario de integraciones

| componente | mock | cliente_real | contrato | endpoint_DEV | auth_conocida | credentials_DEV | sandbox | smoke | rollback | bloqueantes | estado |
|-----------|------|-------------|---------|-------------|-------------|----------------|---------|-------|---------|------------|--------|
| core | ✅ | ✅ core-http-client.ts | ✅ CORE_OPERATION_PATHS | ❌ pendiente | ✅ Bearer token | ❌ pendiente | ✅ DEV Supabase | ❌ pendiente | ✅ CORE_INTEGRATION_MODE=mock | URL DEV | MOCK_ONLY |
| ai | ✅ | ✅ ai-client.ts | ✅ AiOperation types | ❌ no hay proveedor seleccionado | ✅ API Key header | ❌ pendiente | ❌ sin proveedor | ❌ pendiente | ✅ AI_INTEGRATION_MODE=mock | Sin proveedor IA decidido | DEV_CONFIGURATION_PENDING |
| n8n | ✅ | ✅ n8n-adapter.ts | ✅ ALLOWED_WORKFLOWS | ❌ pendiente | ✅ X-Service-Token | ❌ pendiente | ❌ pendiente | ❌ pendiente | ✅ N8N_INTEGRATION_MODE=mock | n8n DEV no confirmado | DEV_CONFIGURATION_PENDING |
| incidents_addon | ✅ | ✅ incidents-addon-adapter.ts | ✅ CreateIncidentCommand | ❌ pendiente | ✅ Bearer token | ❌ pendiente | ❌ sin endpoint DEV | ❌ pendiente | ✅ INCIDENTS_ADDON_INTEGRATION_MODE=mock | Endpoint DEV add-on pendiente | BLOCKED_EXTERNAL_DEPENDENCY |
| listings_addon | ✅ | ✅ listings-addon-adapter.ts | ✅ SearchListingsQuery / CreateLeadCommand | ❌ pendiente | ✅ Bearer token | ❌ pendiente | ❌ sin endpoint DEV | ❌ pendiente | ✅ LISTINGS_ADDON_INTEGRATION_MODE=mock | Endpoint DEV add-on pendiente | BLOCKED_EXTERNAL_DEPENDENCY |
| realtime | ✅ | ✅ webchat-realtime-client.ts | ✅ canal privado por session | ✅ Supabase DEV URL | ✅ anon key | ❌ pendiente config | ✅ DEV Supabase | ❌ pendiente | ✅ REALTIME_INTEGRATION_MODE=mock | Configuración canary pendiente | DEV_CONFIGURATION_PENDING |
| wasender | ✅ | ✅ wasender-http-client.ts | ✅ webhook HMAC + dedup | ❌ sin cuenta DEV | ✅ API Key + HMAC | ❌ sin cuenta DEV | ❌ sin cuenta DEV | ❌ pendiente | ✅ WASENDER_INTEGRATION_MODE=mock | Cuenta Wasender DEV pendiente | DEV_CONFIGURATION_PENDING |

---

## Estados permitidos

- `MOCK_ONLY` — Solo mock disponible. No hay cliente real listo.
- `CONTRACT_READY` — Contrato y adapter listo. Faltan credenciales DEV.
- `DEV_CONFIGURATION_PENDING` — Adapter listo. Faltan credenciales/endpoint DEV.
- `DEV_CANARY_READY` — Credenciales disponibles. Pendiente primera activación canary.
- `DEV_CANARY_ACTIVE` — Canary activo para Tenant DEV A.
- `DEV_VALIDATED` — Validado en DEV real (Fase 11B2D).
- `BLOCKED_EXTERNAL_DEPENDENCY` — Pendiente de endpoint externo.
- `ROLLED_BACK_TO_MOCK` — Revertido a mock por fallo.

---

## Orden de activación (cuando estén disponibles los endpoints DEV)

1. Core → identidad y features primero
2. Realtime → canal privado WebChat
3. n8n → workflows de routing
4. IA → clasificación (sin proveedor seleccionado todavía)
5. Add-on incidencias → requiere Core activo
6. Add-on anuncios → requiere Core activo
7. Wasender → requiere cuenta DEV

---

## Validaciones DEV_REQUIRED para cierre de GATE_1

Ver `gate-1-closure-checklist.md` y `phase-11b4-dev-validation-plan.md`.
Ninguna integración puede marcarse DEV_VALIDATED solo por tests mock.
