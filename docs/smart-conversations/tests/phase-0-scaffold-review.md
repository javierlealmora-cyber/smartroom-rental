# Fase 0 — Revisión del Scaffold de Tests SmartConversations

## Estado

Revisado en Fase 10E/10F. Actualizado con clasificación de 146 it.todo en Fase 11A.

## Estructura de suites

```
tests/regression/smart-conversations/
├── vitest.config.ts
├── __mocks__/
│   ├── deno-http-server.ts        — mock de serve() de Deno
│   └── supabase-client.ts         — shim de @supabase/supabase-js
└── suites/
    ├── activity-log/              — 17 it.todo (scaffold Fase 12+)
    ├── conversation-routing/      — 19 it.todo (scaffold Fase 12+)
    ├── failure-recovery/          — 33 it.todo (scaffold Fase 12+)
    ├── hardening-baseline/        — IMPLEMENTADA (Fase 11A) ~72 tests
    ├── identity-validation/       — 24 it.todo (scaffold Fase 12+)
    ├── incidents-flow/            — 22 it.todo (scaffold Fase 12+)
    ├── permissions-and-privacy/   — 31 it.todo (scaffold Fase 12+)
    └── webchat-integration/       — IMPLEMENTADA (Fase 10E)
    └── webchat-realtime/          — IMPLEMENTADA (Fase 10F)
```

## Suites implementadas

| Suite                                  | Tests | Estado  | Fase |
|----------------------------------------|-------|---------|------|
| webchat-integration.spec.ts            | 133   | Pasan   | 10E  |
| webchat-runtime.spec.ts                | 100   | Pasan   | 10E  |
| webchat-realtime.spec.ts               | 71    | Pasan   | 10F  |
| webchat-realtime-runtime.spec.ts       | 114   | Pasan   | 10F  |
| hardening-baseline.spec.ts             | ~40   | Pasan   | 11A  |
| hardening-baseline-runtime.spec.ts     | ~32   | Pasan   | 11A  |

## Suites scaffold (it.todo) — 146 total

Clasificación completa de los 146 `it.todo`. **No activar ni eliminar hasta la fase correspondiente.**

### activity-log.spec.ts — 17 it.todo

Scope: `conv-core-publish-activity` y `_shared/smart-conversations/activity-log.ts`.

| Rango | Clasificación | Descripción estimada |
|---|---|---|
| 1-5 | CONTRACT | Publicación de eventos: message_received, message_sent, case_created, case_closed, case_escalated |
| 6-10 | CONTRACT | Validación de schema de payload de Activity Log |
| 11-13 | SECURITY | Sin PII en Activity Log; tenant isolation |
| 14-15 | RESILIENCE | Fallo no bloquea flujo principal |
| 16-17 | REGRESSION | Orden correcto; idempotencia |

Fase de implementación: **12+**. Requiere contrato de `conv-core-publish-activity`.

### conversation-routing.spec.ts — 19 it.todo

Scope: `conv-routing-engine`.

| Rango | Clasificación | Descripción estimada |
|---|---|---|
| 1-5 | CONTRACT | Routing por intent (incidents, listings, help, unknown) |
| 6-10 | CONTRACT | Routing por tenant_features |
| 11-14 | CONTRACT | Routing WF-20, WF-30, WF-40 según intent |
| 15-17 | RESILIENCE | Fallback a unknown; sin WF-02 |
| 18-19 | REGRESSION | Sin WEAK_MATCH standalone; sin UNVERIFIED standalone |

Fase de implementación: **12+**. Requiere `conv-routing-engine` y `conv-core-get-tenant-features`.

### failure-recovery.spec.ts — 33 it.todo

Scope: Circuit breaker, retry, `_shared/smart-conversations/runtime/`.

| Rango | Clasificación | Descripción estimada |
|---|---|---|
| 1-8 | RESILIENCE | Circuit breaker: CLOSED → OPEN → HALF_OPEN → CLOSED |
| 9-15 | RESILIENCE | Retry con backoff exponencial |
| 16-20 | RESILIENCE | Timeout de EF manejado |
| 21-25 | RESILIENCE | Queue drain post-recovery |
| 26-29 | RESILIENCE | Single-flight: sin requests duplicadas |
| 30-33 | REGRESSION | Sin next_retry_at ni attempt_count standalone |

Fase de implementación: **12+**. Requiere `_shared/runtime/` contratos.

### identity-validation.spec.ts — 24 it.todo

Scope: `conv-core-validate-identity`, `conv-identity-progressive`.

| Rango | Clasificación | Descripción estimada |
|---|---|---|
| 1-6 | CONTRACT | Identidad anónima: UNVERIFIED dentro de flujo |
| 7-12 | CONTRACT | Identidad progresiva |
| 13-16 | SECURITY | sender_ref opaco, sin PII |
| 17-20 | SECURITY | Tenant isolation de identidad |
| 21-24 | REGRESSION | UNVERIFIED NO standalone; sin estados nuevos |

Fase de implementación: **12+**.

### incidents-flow.spec.ts — 22 it.todo

Scope: `conv-wf20-incidents`, `conv-core-create-incident`.

| Rango | Clasificación | Descripción estimada |
|---|---|---|
| 1-6 | CONTRACT | Creación de incidencia desde chat |
| 7-11 | CONTRACT | Escalado: conv-escalate-case |
| 12-15 | CONTRACT | Cierre: conv-close-case |
| 16-18 | RESILIENCE | Fallo no bloquea sesión |
| 19-22 | REGRESSION | Sin conv_help_escalated en WF-20; sin WF-02 |

Fase de implementación: **12+**.

### permissions-and-privacy.spec.ts — 31 it.todo

Scope: RLS, `_shared/smart-conversations/permissions.ts`.

| Rango | Clasificación | Descripción estimada |
|---|---|---|
| 1-7 | SECURITY | Tenant isolation: sesión A no accede a mensajes B |
| 8-14 | SECURITY | RLS en tablas SC |
| 15-19 | SECURITY | Sin service_role en frontend |
| 20-24 | CONTRACT | Permisos por rol: superadmin, admin, lodger, anónimo |
| 25-28 | SECURITY | sender_ref no correlacionable entre tenants |
| 29-31 | REGRESSION | Sin modificación de RLS en scope actual |

Fase de implementación: **12+**. Requiere RLS configurado (GATE_4).

---

## Total it.todo

| Suite | Count |
|---|---|
| activity-log | 17 |
| conversation-routing | 19 |
| failure-recovery | 33 |
| identity-validation | 24 |
| incidents-flow | 22 |
| permissions-and-privacy | 31 |
| **Total** | **146** |

## Restricciones del scaffold

- No conectar Core real, IA real, n8n real ni Wasender real en los tests.
- No usar Supabase real ni signing secrets reales.
- No abrir WebSocket real ni Realtime real.
- No introducir: estados nuevos; eventos nuevos de Activity Log; WF-02; conv_help_escalated; WEAK_MATCH; UNVERIFIED standalone; next_retry_at; attempt_count.
- Todos los mocks deben usar `vi.mock()` + aliases de vitest.config.ts.

## Scripts npm

```bash
npm run test:sc:webchat               # Fase 10E (233 tests)
npm run test:sc:webchat-realtime      # Fase 10F (185 tests)
npm run test:sc:hardening-baseline    # Fase 11A (~72 tests)
npm run test:sc:regression            # Todas las suites
npm run validate:sc:release-readiness # Validación GATE_0
```
