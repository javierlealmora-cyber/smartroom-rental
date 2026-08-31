# Release Gates — SmartConversations
<!-- Fase 11A · 2026-07-19 -->

> Los gates son secuenciales. Un gate no puede aprobarse si el anterior no está cerrado.  
> **Ningún gate implica activación en producción hasta GATE_5.**

---

## GATE_0 — Baseline registrado *(este documento)*

**Propósito**: Confirmar que el baseline de hardening existe y es consultable.

### Criterios de aprobación

- [x] `component-readiness-matrix.md` existe y está completo
- [x] `environment-matrix.md` existe y es correcto
- [x] `feature-flag-matrix.md` existe, todos los flags en `false` por defecto
- [x] `historical-test-debt.md` documenta los 15 ítems de deuda (D-01..D-10 + D-F01..D-F05) clasificados
- [x] `risk-register.md` documenta exactamente 26 riesgos (CRITICAL=6, HIGH=6, MEDIUM=8, LOW=6)
- [x] `release-gates.md` existe (este archivo)
- [x] `test-baseline.md` documenta resultados de todos los comandos requeridos
- [x] `phase-0-scaffold-review.md` actualizado con clasificación de 146 it.todo
- [x] `validate-release-readiness.mjs` existe y ejecuta sin errores fatales
- [x] Tests hardening-baseline existen (≥70 tests)
- [x] Scripts npm `test:sc:hardening-baseline` y `validate:sc:release-readiness` en `package.json`
- [x] 0 errores de lint en archivos SC (7 errores preexistentes en archivos no-SC con `continue-on-error`)
- [x] Build de producción exitoso
- [x] `gate-0-report.md` generado
- [x] Job `sc-hardening-baseline` añadido en CI sin `continue-on-error`

**Estado actual**: PASS_WITH_WARNINGS (Fase 11A) — baseline reproducible, sin bloqueantes de Gate 0 y con deuda histórica inventariada.

---

## GATE_1 — Tests SC pasan al 100%

**Propósito**: Todos los tests de SmartConversations implementados pasan sin fallos.

### Criterios de aprobación

- [ ] `test:sc:webchat` → 233 tests pass (0 failures)
- [ ] `test:sc:webchat-realtime` → 185 tests pass (0 failures)  
- [ ] `test:sc:hardening-baseline` → ≥70 tests pass (0 failures)
- [ ] `test:webchat` → 10 tests de integración pass (0 failures)
- [ ] 0 errores de lint (`npm run lint`)
- [ ] Build de producción exitoso (`npm run build`)
- [ ] Los 146 `it.todo` NO están implementados (siguen como todo)
- [ ] No se introducen nuevos fallos en tests preexistentes

**Estado actual**: 🟡 PARCIALMENTE CUMPLIDO  
**Bloqueantes**: Verificar que todos los tests SC siguen pasando post Fase 11A

---

## GATE_2 — Contratos de Edge Functions validados

**Propósito**: Todos los contratos de las 24 EFs de SC están documentados y los mocks son fieles.

### Criterios de aprobación

- [ ] Contrato de cada EF documentado en `docs/smart-conversations/contracts/`
- [ ] Mocks en tests de regresión SC son fieles a los contratos (input/output types)
- [ ] `conv-web-session`, `conv-web-message`, `conv-web-poll`, `conv-web-deliver` contratos revisados y aprobados
- [ ] Sin `any` en tipos de mocks de EFs críticas
- [ ] `_shared/smart-conversations/types.ts` es la fuente de verdad de tipos compartidos
- [ ] No se usan signing secrets reales en ningún test

**Estado actual**: 🔴 PENDIENTE

---

## GATE_3 — Edge Functions deployadas en staging

**Propósito**: Las 24 EFs de SC están deployadas en el entorno de staging y responden correctamente.

### Criterios de aprobación

- [ ] Deploy de EFs en staging vía `deploy-edge-functions.yml` exitoso
- [ ] Health check de cada EF en staging OK (200/201)
- [ ] Migración `20260716000001_smart_conversations_core_schema.sql` aplicada en staging
- [ ] `supabase/config.toml` apunta a proyecto staging
- [ ] No se usan credenciales de producción
- [ ] Logs de staging no contienen PII

**Estado actual**: 🔴 PENDIENTE  
**Bloqueantes**: R-09 (EFs no deployadas), R-10 (schema no aplicado)

---

## GATE_4 — WebChat habilitado en staging y validado

**Propósito**: El widget WebChat funciona end-to-end en staging con datos reales de staging.

### Criterios de aprobación

- [ ] `VITE_WEBCHAT_WIDGET_ENABLED=true` en `.env.staging`
- [ ] `VITE_WEBCHAT_API_BASE_URL` apunta a staging Supabase
- [ ] `VITE_WEBCHAT_CLIENT_ACCOUNT_ID` es un tenant real de staging
- [ ] Flujo completo: abrir chat → crear sesión → enviar mensaje → recibir respuesta → cerrar
- [ ] Sin errores en consola del browser
- [ ] Accesibilidad: NVDA o VoiceOver + teclado funciona
- [ ] RLS configurado y verificado en staging (R-11 cerrado)
- [ ] Rate limiting verificado en staging (R-21 cerrado)
- [ ] `VITE_WEBCHAT_DEBUG=false` en staging

**Estado actual**: 🔴 PENDIENTE  
**Bloqueantes**: GATE_3 pendiente, R-11 (RLS), R-21 (rate limiting)

---

## GATE_5 — Aprobación para producción

**Propósito**: Todos los criterios de seguridad, funcionalidad y compliance están cumplidos para producción.

### Criterios de aprobación

- [ ] GATE_0 – GATE_4 aprobados
- [ ] Penetration test básico en staging: sin IDOR, sin XSS, sin token leak
- [ ] GDPR review: PII handling aprobado
- [ ] Audit log de mensajes WebChat implementado (R-15 cerrado)
- [ ] `webchat_session_token` rotación o expiración verificada (R-25)
- [ ] Runbook de rollback documentado y probado
- [ ] Aprobación explícita del responsable del proyecto
- [ ] Changelog de usuario actualizado

**Estado actual**: 🔴 PENDIENTE

---

## Resumen de gates

| Gate | Estado | Bloqueantes principales |
|---|---|---|
| GATE_0 — Baseline | PASS_WITH_WARNINGS | — (deuda histórica inventariada) |
| GATE_1 — Tests SC 100% | 🟡 Parcial | Verificar post-Fase 11A |
| GATE_2 — Contratos EF | 🔴 Pendiente | Documentar contratos restantes |
| GATE_3 — EFs en staging | 🔴 Pendiente | R-09, R-10 |
| GATE_4 — WebChat staging | 🔴 Pendiente | GATE_3, R-11, R-21 |
| GATE_5 — Producción | 🔴 Pendiente | Todos anteriores |

---

## Política de no-regresión

- Ningún commit a `main` puede reducir el número de tests SC pasando.
- El job de `unit-tests` en CI debe tener un job separado `test:sc:hardening-baseline` sin `continue-on-error`.
- Cualquier cambio a los 146 `it.todo` requiere aprobación de Cascade.
