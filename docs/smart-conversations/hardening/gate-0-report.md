# GATE_0 Report — SmartConversations Baseline de Hardening
<!-- Fase 11A · Generado 2026-07-19 · Normalizado en microfix 2026-07-19 -->

## Resumen ejecutivo

**GATE_0: PASS_WITH_WARNINGS** — baseline reproducible, sin bloqueantes de Gate 0 y con deuda histórica inventariada.

> **Distinción importante**:
> - El **validador** (`validate-release-readiness.mjs`) reporta `PASS` (54/54 checks OK) porque verifica únicamente los entregables de Fase 11A.
> - El **GATE_0** es `PASS_WITH_WARNINGS` porque la evaluación incluye deuda histórica de lint, fallos de tests preexistentes, riesgos abiertos y la ausencia previa de un job CI dedicado (ya añadido en Fase 11A).

No implica production-ready. Próximo gate: GATE_1 (tests SC 100%).

---

## Resultados del validador

```
node scripts/smart-conversations/validate-release-readiness.mjs

  ✅ Passed : 54
  ⚠️  Warned : 0
  ❌ Failed : 0

  Exit code: 0
```

Fecha de ejecución: 2026-07-19

El validador pasa 54/54 checks. Los warnings del GATE_0 corresponden a elementos fuera del scope del validador:
- 7 errores de lint en archivos preexistentes no-SC (job `unit-tests` con `continue-on-error: true`)
- 15 ítems de deuda histórica en tests no-SC (ver `historical-test-debt.md`)
- 17 riesgos OPEN (ver `risk-register.md`)

---

## Resultados de tests

| Suite | Tests | Estado |
|---|---|---|
| `test:webchat` (integración frontend) | 127/127 | ✅ |
| `test:sc:webchat` (Fase 10E) | 233/233 | ✅ |
| `test:sc:webchat-realtime` (Fase 10F) | 185/185 | ✅ |
| `test:sc:hardening-baseline` (Fase 11A) | 102/102 | ✅ |
| Suites scaffold (6 suites, 146 it.todo) | 0/0 (pending) | ✅ |
| **Total tests SC ejecutables** | **647+** | **✅** |

Tests preexistentes fuera de scope SC: 15 ítems de deuda (D-01..D-10 named + D-F01..D-F05 file-level) — documentados en `historical-test-debt.md`.

---

## Entregables creados en Fase 11A

### Documentos de hardening

| Archivo | Estado |
|---|---|
| `docs/smart-conversations/hardening/component-readiness-matrix.md` | ✅ |
| `docs/smart-conversations/hardening/environment-matrix.md` | ✅ |
| `docs/smart-conversations/hardening/feature-flag-matrix.md` | ✅ |
| `docs/smart-conversations/hardening/test-baseline.md` | ✅ |
| `docs/smart-conversations/hardening/historical-test-debt.md` | ✅ |
| `docs/smart-conversations/hardening/risk-register.md` | ✅ |
| `docs/smart-conversations/hardening/release-gates.md` | ✅ |
| `docs/smart-conversations/hardening/gate-0-report.md` | ✅ |
| `docs/smart-conversations/tests/phase-0-scaffold-review.md` (actualizado) | ✅ |

### Scripts y tests

| Archivo | Estado |
|---|---|
| `scripts/smart-conversations/validate-release-readiness.mjs` | ✅ |
| `tests/regression/smart-conversations/suites/hardening-baseline/hardening-baseline.spec.ts` | ✅ |
| `tests/regression/smart-conversations/suites/hardening-baseline/hardening-baseline-runtime.spec.ts` | ✅ |

### package.json (scripts añadidos)

| Script | Estado |
|---|---|
| `test:sc:hardening-baseline` | ✅ |
| `validate:sc:release-readiness` | ✅ |

### CI

| Cambio | Estado |
|---|---|
| Job `sc-hardening-baseline` en `.github/workflows/pr-checks.yml` (sin `continue-on-error`) | ✅ |

---

## Checks de seguridad confirmados

- ✅ `VITE_WEBCHAT_WIDGET_ENABLED=false` en `.env.example`
- ✅ `VITE_WEBCHAT_REALTIME_ENABLED=false` en `.env.example`
- ✅ Sin `service_role` en código fuente WebChat
- ✅ Sin `dangerouslySetInnerHTML` en componentes WebChat
- ✅ Sin variables prohibidas (`VITE_SUPABASE_SERVICE_ROLE_KEY`, etc.)
- ✅ 146 `it.todo` intactos (sin activar ni eliminar)
- ✅ Total `it.todo` = 146 (exacto)

---

## Riesgos críticos abiertos

Ver `risk-register.md` para el detalle completo. Los más urgentes:

| ID | Riesgo | Severidad | Para cerrar |
|---|---|---|---|
| R-01 | Widget activado en producción accidentalmente | CRITICAL | GATE_4 |
| R-06 | Conexión a servicios reales en tests | CRITICAL | GATE_1 (auditoría manual) |
| R-07 | 146 it.todo activados prematuramente | HIGH | Monitoreo continuo |
| R-09 | Edge Functions no deployadas | HIGH | GATE_3 |
| R-10 | Schema SC no aplicado en entornos | HIGH | GATE_3 |
| R-11 | RLS no configurado | HIGH | GATE_4 |

---

## Estado de gates

| Gate | Estado |
|---|---|
| **GATE_0** — Baseline | **PASS_WITH_WARNINGS** |
| GATE_1 — Tests SC 100% | 🟡 Parcialmente cumplido |
| GATE_2 — Contratos EF | 🔴 Pendiente |
| GATE_3 — EFs en staging | 🔴 Pendiente |
| GATE_4 — WebChat en staging | 🔴 Pendiente |
| GATE_5 — Producción | 🔴 Pendiente |

---

## Restricciones vigentes

> Las siguientes restricciones permanecen activas tras GATE_0 y hasta indicación explícita:

- No activar producción
- No conectar: Core real, IA real, n8n real, Wasender real, Supabase Realtime real, WebSocket real, APIs externas reales
- No usar: credenciales reales; service_role real; signing secrets reales; tokens reales; API keys reales; URLs productivas reales
- No modificar: migraciones; esquema de base de datos; tablas; RLS todavía; lógica de routing; lógica de identidad; workflows; contratos oficiales; requirements; rules; skills; diagrams; specs funcionales oficiales
- No introducir: estados nuevos; eventos nuevos de Activity Log; WF-02; conv_help_escalated; WEAK_MATCH; UNVERIFIED standalone; next_retry_at; attempt_count
- No eliminar ni activar automáticamente los 146 it.todo
- No afirmar que el sistema está production-ready

---

*Generado en Fase 11A. Normalizado en microfix 2026-07-19. Próxima acción: GATE_1 — verificar que todos los tests SC implementados siguen pasando y documentar plan para los 146 it.todo.*
