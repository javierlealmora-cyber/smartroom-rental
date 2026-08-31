# GATE_1 Closure Checklist — SmartConversations

Estado actual: **AUDIT_COMPLETE_REMEDIATION_PENDING**
GATE_1: **NO CERRAR** — pendiente Fase 11B2D (DEV validation)

---

## Criterios de cierre de GATE_1

GATE_1 no puede cerrarse hasta que se cumplan TODOS los criterios de la
Sección B (DEV_REQUIRED). La Sección A está completa (offline).

---

## Sección A — Completado offline (Fases 11B1..11B4)

### A.1 — Diseño y especificación
- [x] ADR-006: modelo de proveedores SAL/TTLock documentado
- [x] Especificación de security-findings.md completa
- [x] Adversarial test matrix creada (adversarial-test-matrix.md)
- [x] Phase-11b4-adversarial-report.md generado
- [x] Phase-11b4-dev-validation-plan.md creado

### A.2 — Implementación de controles
- [x] `await isServiceRoleRequest()` en los 20 EFs internos
- [x] Comparación constant-time (`crypto.subtle.timingSafeEqual`) en `runtime/constant-time.ts`
- [x] CORS dinámico por allowlist en `cors-policy.ts` (sin wildcard)
- [x] CORS preflight devuelve 204 (no 200)
- [x] CSP en `vercel.json` (`Content-Security-Policy-Report-Only`)
- [x] Validación de timestamp antes de HMAC en `conv-wa-webhook` (±300s/+30s)
- [x] `verifyHmacWithRotation` con secret actual + gracia de rotación
- [x] Dedup por `provider_message_id` antes de ingest
- [x] Idempotencia WebChat por `client_message_id` (columna en `conv_messages`)
- [x] `FORCE ROW LEVEL SECURITY` en 8 tablas `conv_*` (migración `20260723000001`)
- [x] `purge_old_raw_payloads` (SECURITY DEFINER + `SET search_path`)
- [x] `get_wa_webhook_secret` (SECURITY DEFINER + `SET search_path`)
- [x] Activity Log allowlist (13 eventos; 8 campos PII prohibidos)
- [x] `FIELDS_TO_REDACT` extendido en `ef-logger.ts`
- [x] `dev-preflight.mjs` (guard DEV≠PRE≠PRO + branches autorizadas)

### A.3 — Tests offline
- [x] security-baseline: ≥25 checks pasando
- [x] security-remediation-design: suite completa
- [x] security-remediation-implementation: suite completa
- [x] security-http-privacy: ≥139 tests (Fase 11B3)
- [x] security-adversarial: ≥250 tests (Fase 11B4)
  - [x] Static analysis: ≥98 tests (SRA-*)
  - [x] Runtime simulation: ≥120 tests (SRR-*)
  - [x] Fuzzing: ≥32 tests (SRF-*)
- [x] hardening-baseline: suite completa
- [x] SC regression: ≥2650 tests
- [x] webchat integration: suite completa
- [x] webchat-realtime: suite completa
- [x] 0 critical/high findings sin test offline

### A.4 — Validaciones de baseline
- [x] `validate-security-baseline.mjs`: Secciones 1..21 sin blockers
- [x] Estado: `ADVERSARIAL_OFFLINE_COMPLETE_DEV_PENDING`
- [x] Fase: `11B4`

---

## Sección B — DEV_REQUIRED (Fase 11B2D — NO COMPLETADO)

Los siguientes criterios requieren entorno DEV real (Supabase + Vercel DEV).
**GATE_1 permanece AUDIT_COMPLETE_REMEDIATION_PENDING hasta que todos sean ✅.**

### B.1 — RLS real en Supabase DEV
- [ ] Acceso directo a `conv_*` via REST/PostgREST como `anon` → 401/403
- [ ] Acceso directo a `conv_*` via REST/PostgREST como `authenticated` (cross-tenant) → 403
- [ ] `get_wa_webhook_secret` RPC accesible solo con `service_role`
- [ ] `purge_old_raw_payloads` RPC accesible solo con `service_role`
- [ ] Política RLS `conv_messages`: tenant isolation real
- [ ] Política RLS `conv_sessions`: tenant isolation real

### B.2 — Webhook en DEV real
- [ ] Webhook WA recibe evento real → dedup funciona (provider_message_id)
- [ ] Webhook con timestamp antiguo → respuesta opaca 200 (sin procesar)
- [ ] Webhook con firma incorrecta → respuesta opaca 200 (sin procesar)
- [ ] Rotación de secret: evento con secret anterior (en gracia) → aceptado
- [ ] Rotación de secret: evento con secret anterior (expirado) → rechazado

### B.3 — CORS en hosting DEV real
- [ ] Origin permitido → `Access-Control-Allow-Origin` = origin exacto
- [ ] Origin no permitido → sin header ACAO
- [ ] Preflight OPTIONS → 204 con headers correctos
- [ ] Suffix attack (`evil.allowed-domain.com`) → sin ACAO
- [ ] Subdomain (`sub.allowed.com`) → sin ACAO si solo `allowed.com` está en allowlist

### B.4 — CSP en Vercel DEV real
- [ ] `Content-Security-Policy-Report-Only` presente en todas las respuestas HTML
- [ ] `X-Frame-Options: DENY` presente
- [ ] `X-Content-Type-Options: nosniff` presente

### B.5 — Cross-tenant en DEV real
- [ ] Tenant B no puede leer sesiones de Tenant A via API
- [ ] Tenant B no puede leer mensajes de Tenant A via API
- [ ] Queue: mensajes de Tenant A no procesados por worker de Tenant B

### B.6 — Rate limiting en DEV real
- [ ] Polling agresivo desde un tenant → 429 después del límite
- [ ] Tenant B no bloqueado por quota de Tenant A
- [ ] Rate limiter down → fail-closed (deny)

### B.7 — Idempotencia en DEV real
- [ ] Doble submit de `client_message_id` → 1 solo mensaje en `conv_messages`
- [ ] Doble click en WebChat → 1 solo dispatch

### B.8 — Activity Log en DEV real
- [ ] Evento no en allowlist → rechazado por `conv-core-publish-activity`
- [ ] Payload con PII → campo PII rechazado
- [ ] Evento `conv_message_received` → registrado correctamente

### B.9 — Logging en DEV real
- [ ] Log de EF en DEV no contiene `profile_id` en claro
- [ ] Log de EF en DEV no contiene `api_key` en claro
- [ ] Log de EF en DEV no contiene `message_text` en claro

### B.10 — dev-preflight en CI DEV
- [ ] Pipeline DEV ejecuta `npm run dev:preflight` antes de deploy
- [ ] Intento de deploy a PRE desde rama no autorizada → falla
- [ ] Intento de operación destructiva → falla

---

## Criterio de cierre

GATE_1 puede cerrarse formalmente cuando:
1. Todos los criterios de Sección B estén marcados ✅
2. 0 hallazgos CRITICAL o HIGH en estado `open` en `security-findings.md`
3. El validator reporta `GATE_READY: true` (no implementado aún — pendiente Fase 11B2D)
4. Revisión explícita del equipo de seguridad

**Hasta entonces: GATE_1 = AUDIT_COMPLETE_REMEDIATION_PENDING**
