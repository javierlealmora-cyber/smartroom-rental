# n8n DEV Readiness — Fase 11C4

Estado: **N8N_DEV_CONFIGURATION_PENDING** (sin instancia DEV activa)

## Requisitos para activar modo real en DEV

| Requisito | Estado |
|-----------|--------|
| `N8N_WEBHOOK_BASE_URL` configurada | ⏳ pendiente |
| `N8N_SERVICE_TOKEN` en secrets DEV | ⏳ pendiente |
| Instancia n8n DEV desplegada | ⏳ pendiente |
| Workflows WF-10..92 importados y activos | ⏳ pendiente |
| Prueba de callback exitosa en DEV | ⏳ pendiente |
| Canary tenant activado | ⏳ pendiente |

## Estado del modo mock

Todos los workflows funcionan en modo `mock` sin instancia n8n real.
- Adapter: `supabase/functions/_shared/smart-conversations/adapters/n8n-adapter.ts`
- Registry: `supabase/functions/_shared/smart-conversations/n8n-workflow-registry.ts`
- Puerto: `supabase/functions/_shared/smart-conversations/orchestration-port.ts`

## Estado por workflow

| Workflow | Código | Mock | Shadow | Canary | Real |
|----------|--------|------|--------|--------|------|
| WF-10 Routing | `wf10.routing` | ✅ | ✅ (no mutable) | ⏳ | ⏳ |
| WF-20 Incidencias | `wf20.incidents` | ✅ | ❌ (mutable) | ⏳ | ⏳ |
| WF-30 Publicaciones | `wf30.listings` | ✅ | ❌ (mutable) | ⏳ | ⏳ |
| WF-40 Ayuda | `wf40.help` | ✅ | ✅ (no mutable) | ⏳ | ⏳ |
| WF-91 WA Out | `wf91.wa_out` | ✅ | ❌ (mutable) | ⏳ | ⏳ |
| WF-92 WebChat Out | `wf92.webchat_out` | ✅ | ❌ (mutable) | ⏳ | ⏳ |

## GATE_1

`GATE_1 = AUDIT_COMPLETE_REMEDIATION_PENDING` — no cerrar hasta auditoría de seguridad completa.
