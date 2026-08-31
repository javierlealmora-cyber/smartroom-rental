# Test Baseline — SmartConversations
<!-- Fase 11A · 2026-07-19 -->

> Resultados de referencia de todos los comandos de test relevantes a la fecha del baseline.
> Los resultados de los tests específicos de SC reflejan el estado tras implementar Fase 10G + 11A.

## Comandos ejecutados y resultados

### 1. `npm run test:webchat` (Vitest — integración frontend)

```
Comando: npx vitest run src/tests/webchat/
Test Files: 12 passed (12)
Tests:      127 passed (127)
Duration:   ~3s
```

Estado: ✅ **127/127 pasan**

Suites incluidas:
- `webchat-config.test.js` — 7 tests
- `webchat-boundaries.test.js` — 7 tests
- Y 10 suites adicionales de Fase 10G

---

### 2. `npm run test:sc:webchat` (SC — integración webchat Fase 10E)

```
Comando: npx vitest run --config tests/regression/smart-conversations/vitest.config.ts tests/regression/smart-conversations/suites/webchat-integration
Test Files: 2 passed (2)
Tests:      233 passed (233)
Duration:   ~0.9s
```

Estado: ✅ **233/233 pasan**

Suites incluidas:
- `webchat-integration.spec.ts` — 133 tests
- `webchat-runtime.spec.ts` — 100 tests

---

### 3. `npm run test:sc:webchat-realtime` (SC — realtime Fase 10F)

```
Comando: npx vitest run --config tests/regression/smart-conversations/vitest.config.ts tests/regression/smart-conversations/suites/webchat-realtime
Test Files: 2 passed (2)
Tests:      185 passed (185)
Duration:   ~1s
```

Estado: ✅ **185/185 pasan**

Suites incluidas:
- `webchat-realtime.spec.ts` — 71 tests
- `webchat-realtime-runtime.spec.ts` — 114 tests

---

### 4. `npm run test:sc:hardening-baseline` (SC — hardening Fase 11A)

```
Comando: npx vitest run --config tests/regression/smart-conversations/vitest.config.ts tests/regression/smart-conversations/suites/hardening-baseline
Test Files: 2 passed (2)
Tests:      102 passed (102)
Duration:   ~0.8s
```

Estado: ✅ **102/102 pasan** (tras correcciones de Fase 11A)

Suites incluidas:
- `hardening-baseline.spec.ts` — ~70 tests estáticos (verificación de archivos, flags, ARIAs, scripts)
- `hardening-baseline-runtime.spec.ts` — ~32 tests runtime (config, errors, dedupe, storage, realtime)

---

### 5. `npm run test:sc:regression` (SC — todas las suites)

```
Comando: npx vitest run --config tests/regression/smart-conversations/vitest.config.ts
Resultado esperado post-Fase 11A:
- webchat-integration: 233 pass
- webchat-realtime:    185 pass
- hardening-baseline:  102 pass
- Suites scaffold (6 suites): 146 it.todo (0 failures, 0 passes — solo pending)
Total tests ejecutables: ~520 pass
```

Estado: ✅ Tests implementados pasan; suites scaffold en `todo` (no se ejecutan)

---

### 6. `npm run validate:sc:release-readiness`

```
Comando: node scripts/smart-conversations/validate-release-readiness.mjs
Resultado:
  ✅ Passed : 54
  ⚠️  Warned : 0
  ❌ Failed : 0
  Exit code: 0
```

Estado: ✅ **54/54 validaciones pasan** (tras crear todos los docs de hardening)

> El validador retorna exit 0 (PASS). El GATE_0 es `PASS_WITH_WARNINGS` al considerar deuda histórica, lint preexistente y riesgos abiertos fuera del scope del validador.

---

### 7. Tests preexistentes (fuera de scope SC)

Fallos preexistentes confirmados (sin relación con SmartConversations):

| Suite | Fallos | Causa |
|---|---|---|
| `src/tests/alojamientos/accommodations.service.test.js` | 7 | Mock `.insert()` incompleto |
| `src/tests/entidades/entity-field-validation.test.js` | 3 | Mock `.insert()` incompleto |
| `src/tests/entidades/entities.service.test.js` | file-level | Parse error: JSX en .js |
| `src/tests/entidades/entity-plan-restrictions.test.js` | file-level | Parse error |
| `src/tests/inquilinos/lodger-creation.test.js` | file-level | Import/parse error |
| `src/tests/rendimiento/concurrencia.test.js` | file-level | Parse error |
| `qa/unit/security/multi-tenant-isolation.test.js` | file-level | ENOENT: migrations faltante |

Estos fallos son **preexistentes y no introducidos por SC**. Documentados en `historical-test-debt.md`.

---

### 8. Lint

```
Comando: npx eslint .
Resultado post-Fase 10G: 0 errors, 0 warnings
```

Estado: ✅ **Lint limpio**

---

### 9. Build de producción

```
Comando: npx vite build --mode production
Resultado: Build exitoso (no errors)
```

Estado: ✅ **Build pasa** (WebChat desactivado por flag, sin código inalcanzable crítico)

---

## Resumen del baseline

| Comando | Tests | Estado |
|---|---|---|
| `test:webchat` | 127 | ✅ |
| `test:sc:webchat` | 233 | ✅ |
| `test:sc:webchat-realtime` | 185 | ✅ |
| `test:sc:hardening-baseline` | 102 | ✅ |
| `validate:sc:release-readiness` | 54 checks | ✅ GATE_0 |
| Lint | 0 errores | ✅ |
| Build | exitoso | ✅ |
| Tests SC it.todo | 146 | ✅ (pendientes, no fallos) |
| Tests preexistentes fallando | 10+ | ⚠️ Preexistentes, fuera de scope |

**Total tests SC pasando: ~647**  
**GATE_0: PASS_WITH_WARNINGS** — baseline reproducible, sin bloqueantes de Gate 0 y con deuda histórica inventariada.
