# Fase 11B2B — Reporte de Implementación

**Estado:** IMPLEMENTATION_COMPLETE_LOCAL_DB_PENDING  
**Fecha:** 2026-07-22  
**Alcance:** Local/test únicamente. NO desplegado en Supabase remoto.

---

## Resumen ejecutivo

La Fase 11B2B implementa los controles de seguridad WebChat diseñados en Fase 11B2A.
Los controles cubren: entorno fail-closed, autenticación por token, rate limiting persistente,
aislamiento multi-tenant, y hardening de permisos DB.

**Resultado de validación local:**
- security-baseline: 135/135 ✅
- security-remediation-design: 73/73 ✅
- security-remediation-implementation: 116/116 ✅
- validate-security-baseline: 68 pass / 9 warn / 0 fail ✅

---

## Archivos creados o modificados

### Archivos nuevos

| Archivo | Tipo | Descripción |
|---|---|---|
| `supabase/migrations/20260721000001_sc_security_remediation_b2b.sql` | SQL | Migración de seguridad B2B |
| `supabase/functions/_shared/smart-conversations/runtime/env-config.ts` | TS | Configuración fail-closed por entorno |
| `supabase/functions/_shared/smart-conversations/runtime/ef-tenant-guards.ts` | TS | Guards de aislamiento multi-tenant |
| `tests/regression/smart-conversations/suites/security-remediation-implementation/security-remediation-implementation.spec.ts` | Test | 71 tests estáticos |
| `tests/regression/smart-conversations/suites/security-remediation-implementation/security-remediation-implementation-runtime.spec.ts` | Test | 45 tests runtime simulados |
| `docs/smart-conversations/security/phase-11b2b-implementation-report.md` | Doc | Este documento |
| `docs/smart-conversations/security/phase-11b2b-rollback.md` | Doc | Procedimiento de rollback |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `supabase/functions/_shared/smart-conversations/runtime/webchat-rate-limiter.ts` | Añadidos `checkSessionCreationRateLimit` y `checkPollRateLimit` |
| `supabase/functions/conv-web-session/index.ts` | checkStartupConfig + widget_public_key resolution + rate limit + expires_at |
| `supabase/functions/conv-web-poll/index.ts` | checkStartupConfig + checkPollRateLimit |
| `scripts/smart-conversations/validate-security-baseline.mjs` | Sección 18 con 12 checks 11B2B, phase=11B2B |
| `package.json` | Script `test:sc:security-remediation-implementation` |
| `.github/workflows/pr-checks.yml` | Step `Run security-remediation-implementation tests` |
| `tests/regression/smart-conversations/suites/security-baseline/security-baseline.spec.ts` | SB-85: conv_rate_limit_buckets en knownTables |
| `tests/regression/smart-conversations/suites/security-baseline/security-baseline-runtime.spec.ts` | SBR-04: phase=11B2B |

---

## Controles implementados

### 1. Configuración fail-closed (env-config.ts)

- `detectEnvMode()` — distingue local/test/ci de sandbox/preproduction/production
- `validateEnvConfig()` — en entornos reales rechaza legacy+mock (SEC-002, SEC-004)
- `checkStartupConfig()` — guard de arranque para EFs; errores solo a stderr

**Reglas fail-closed en entornos reales:**
- `WEBCHAT_AUTH_MODE=legacy` → rechazado (SEC-004)
- `WEBCHAT_RATE_LIMIT_MODE=mock` → rechazado (SEC-002)
- `signed_token` sin `WEBCHAT_SESSION_SIGNING_SECRET` → rechazado
- `WEBCHAT_INTEGRATION_MODE=real` sin `APP_ENVIRONMENT` → unknown_real, rechazado

### 2. Guards multi-tenant (ef-tenant-guards.ts)

- `resolveWidgetToTenant()` — widget_public_key → client_account_id (fuente de autoridad en modo real)
- `loadSessionForTenant()` — siempre filtra por client_account_id en DB
- `assertSessionOwnership()` — verifica sender_ref, state=CLOSED, expires_at
- `assertWidgetBelongsToTenant()` — previene que Tenant A use widget de Tenant B
- `assertTokenClaimsMatchRequest()` — función pura, token claims ganan sobre body
- Respuestas opacas: WIDGET_NOT_FOUND → 403 (no revela existencia en otro tenant)

### 3. Rate limiting completo (webchat-rate-limiter.ts)

| Función | Tabla | Límite default |
|---|---|---|
| `checkWebchatRateLimit` | conv_messages | 30/sesión/min + 300/tenant/min |
| `checkSessionCreationRateLimit` | conv_sessions | 10 sesiones/tenant/min |
| `checkPollRateLimit` | conv_rate_limit_buckets (RPC) | 60 polls/sesión/min |

`checkPollRateLimit` hace **fail-open** si la función RPC no está disponible
(migración no aplicada en entorno local sin Supabase).

### 4. Migración SQL (20260721000001)

- `conv_wc_configs` + `widget_public_key TEXT UNIQUE`
- `conv_wc_configs` + `auth_mode TEXT DEFAULT 'legacy'`
- `conv_wc_configs` + `rate_limit_mode TEXT DEFAULT 'mock'`
- `conv_sessions` + `expires_at TIMESTAMPTZ`
- `REVOKE SELECT,INSERT,UPDATE,DELETE` en 8 tablas conv_* para anon, authenticated
- `GRANT` explícito para service_role (defense-in-depth)
- `conv_rate_limit_buckets` con RLS service_role only
- Función `increment_rate_limit_bucket` (atómica, ON CONFLICT DO UPDATE)
- Función `cleanup_rate_limit_buckets` (mantenimiento)

### 5. conv-web-session actualizado

1. `checkStartupConfig()` antes de procesar cualquier request
2. En modo real: `resolveWidgetToTenant(widget_public_key)` → client_account_id confiable
3. En modo permisivo: fallback a client_account_id del body (legacy/local)
4. `checkSessionCreationRateLimit(client_account_id)` antes de crear sesión
5. `expires_at` persistido en conv_sessions al crear

### 6. conv-web-poll actualizado

1. `checkStartupConfig()` antes de procesar cualquier request
2. `checkPollRateLimit(client_account_id, session_id)` antes de consultar conv_messages

---

## Findings actualizados

| Finding | Estado anterior | Estado 11B2B |
|---|---|---|
| SEC-002 (rate limit mock en real) | open | remediated_local_pending_db |
| SEC-004 (legacy auth en real) | open | remediated_local_pending_db |
| SEC-006 (sin rate limit session/poll) | open | remediated_local_pending_db |
| SEC-013 (aislamiento multi-tenant) | open | remediated_local_pending_db |

---

## Pendiente (LOCAL_DB_PENDING)

Los siguientes checks requieren Supabase local activo para validarse:

- REVOKE efectivo para anon/authenticated (verificar con `SET ROLE anon; SELECT COUNT(*) FROM conv_sessions`)
- increment_rate_limit_bucket ejecuta correctamente (verificar con SELECT directo)
- conv-web-session en modo real resuelve tenant desde widget_public_key (test integration)
- conv-web-poll rate limit acumulativo funciona en ventana de 60s

**Comando para aplicar migración en local (cuando Supabase local esté disponible):**
```bash
supabase db reset  # solo en local, nunca en remoto
# o
supabase migration up --local
```

---

## Validaciones cubiertas

| Categoría | Implementadas | Total |
|---|---|---|
| CONFIG (env-config) | 10 | 10 |
| TOKEN (ef-tenant-guards) | 10 | 10 |
| SESSION (conv-web-session) | 7 | 7 |
| RATE LIMIT (rate-limiter) | 12 | 12 |
| DB PERMISSIONS (migración) | 12 | 12 |
| CROSS-TENANT (aislamiento) | 10 | 10 |
| BOUNDARIES (contratos) | 10 | 10 |
| **TOTAL** | **71** | **71** |

---

## Restricciones cumplidas

- ✅ NO desplegado en Supabase remoto
- ✅ NO aplicado en sandbox, staging, preproducción ni producción
- ✅ NO se usaron credenciales reales
- ✅ NO se crearon policies `FOR ALL TO anon` ni `FOR ALL TO authenticated` con `USING (true)`
- ✅ NO se confía en `client_account_id` del body como única fuente en modo real
- ✅ NO se introdujeron: WF-02, conv_help_escalated, WEAK_MATCH, UNVERIFIED standalone, next_retry_at, attempt_count
- ✅ GATE_1 NO está declarado como aprobado
