# n8n Workflow Registry — Fase 11C4

## Registro canónico

Fuente: `supabase/functions/_shared/smart-conversations/n8n-workflow-registry.ts`

## Catálogo activo

| Code | Nombre | Mutable | Shadow | Canary | Timeout | Retry |
|------|--------|---------|--------|--------|---------|-------|
| `wf10.routing` | WF-10 Routing | No | ✅ | ✅ | 10 s | 3 |
| `wf20.incidents` | WF-20 Incidencias | Sí | ❌ | ✅ | 15 s | 2 |
| `wf30.listings` | WF-30 Publicaciones | Sí | ❌ | ✅ | 15 s | 2 |
| `wf40.help` | WF-40 Ayuda | No | ✅ | ✅ | 10 s | 3 |
| `wf91.wa_out` | WF-91 WA Out | Sí | ❌ | ✅ | 12 s | 2 |
| `wf92.webchat_out` | WF-92 WebChat Out | Sí | ❌ | ✅ | 10 s | 2 |

## Restricciones de shadow

Shadow solo está habilitado para workflows no mutables (`shadow_allowed: true`):
- `wf10.routing` — orquestación de lectura
- `wf40.help` — consulta de KB

Los workflows mutables (WF-20, WF-30, WF-91, WF-92) nunca pueden ejecutarse en shadow
porque producen efectos secundarios que no pueden descartarse.

## Política de retry

**READ_RETRY** (no mutables): máximo 3 intentos, backoff 500ms + jitter
**MUTABLE_RETRY** (mutables): máximo 2 intentos, backoff 1000ms + jitter

Reintentos aplican para: 429, 503, TIMEOUT, NETWORK_ERROR
No reintentan: 400, 422, 403, CONTRACT_MISMATCH

## Workflows legacy (no activos en 11C4)

| ID | Fase | Estado |
|----|------|--------|
| `SC-WF-IDENTITY` | 9C | Legacy — documentado, no activo |
| `SC-WF-C00` | 9C | Legacy — stub histórico, no activo |

## WF-02 prohibido

`WF02_PROHIBITED = true` — WF-02 no existe en este catálogo y está explícitamente bloqueado.
El adapter rechaza cualquier intento de invocar `wf02.*`.

## Versionado

Cada entrada del registry tiene:
- `version`: versión semántica del workflow n8n
- `contract_version`: versión del contrato DTO de entrada/salida
- `export_checksum`: placeholder hasta tener export JSON real del workflow

Actualizar `contract_version` cuando cambie la firma de entrada o salida.
