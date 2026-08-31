# Reporte de tests — Add-ons DEV (Fase 11C5)

**Fecha de cierre:** 2026-07-25
**Estado:** `ADDONS_INTEGRATION_OFFLINE_READY_DEV_PENDING`
**GATE_0:** `PASS_WITH_WARNINGS`
**GATE_1:** `AUDIT_COMPLETE_REMEDIATION_PENDING` — no cerrar

---

## 1. Suites Fase 11C5 — conteo estático y runtime

| Suite | Declaraciones estáticas | Tests runtime | Estado |
|-------|------------------------:|--------------:|--------|
| `addons-integration-dev.spec.ts` | 60 | 68 | OFFLINE ✅ |
| `addons-integration-dev-runtime.spec.ts` | 65 | 65 | OFFLINE ✅ |
| `addons-integration-dev-contracts.spec.ts` | 55 | 55 | OFFLINE ✅ |
| `addons-integration-dev-adversarial.spec.ts` | 45 | 45 | OFFLINE ✅ |
| `addons-dev-closure.spec.ts` | 28 | 28 | OFFLINE ✅ |
| **Total** | **253** | **261** | |

**Formulación oficial:** `253 declaraciones estáticas / 261 tests runtime`

### Por qué 60 declaraciones producen 68 tests en `addons-integration-dev.spec.ts`

```typescript
// Línea 407 — definición del array
const REQUIRED_DOCS = [
  'addons-dev-readiness.md',
  'incidents-integration-contract.md',
  'listings-integration-contract.md',
  'leads-integration-contract.md',
  'canonical-actor-contract.md',
  'addons-authentication-model.md',
  'addons-privacy-model.md',
  'addons-dev-test-report.md',
  'addons-dev-rollback.md',      // ← 9 entradas
];

// Línea 419 — 1 declaración it() dentro del for
for (const doc of REQUIRED_DOCS) {
  it(`N11C5-DOC: ${doc} existe`, () => { ... });
}
```

- `REQUIRED_DOCS` contiene **9 documentos**.
- Existe **una sola declaración** `it(...)` dentro del `for`.
- Vitest registra **9 tests runtime** desde esa única declaración.
- Diferencia neta: 9 − 1 = **8 tests extra**.
- Cálculo runtime: (60 − 1) + 9 = 68.
- **Vitest es la fuente de verdad para el conteo runtime.**
- Los 261 tests pertenecen a las cinco suites de 11C5.
- No existen tests adicionales en otras suites.

> **El documento no puede presentar 225 ni 233 como total runtime de la fase completa.**
> El total runtime correcto desde el cierre documental es **261** (233 originales + 28 de cierre).

---

## 2. Suite de cierre documental (`addons-dev-closure.spec.ts`)

Añadida en el cierre documental de 11C5. Contiene 28 tests en 3 grupos:

| Grupo | Tests | Qué verifica |
|-------|------:|---|
| `N11C5-CLO-SMOKE` | 14 | Semántica de exit codes en smokes DEV; `--allow-pending` no valida DEV |
| `N11C5-CLO-VALI` | 6 | Mensajes inequívocos del validador de configuración |
| `N11C5-CLO-ACTOR` | 8 | Campos prohibidos fuera de las interfaces CanonicalActor |

---

## 3. Tests DEV_REQUIRED

Ninguno activado en Fase 11C5 — endpoints DEV no configurados.
Todos los tests son offline o mock.

---

## 4. Smokes

| Script | Tipo | Exit code sin config | Exit code con `--allow-pending` | Estado |
|--------|------|---------------------:|--------------------------------:|--------|
| `smoke-offline-incidents-addon.mjs` | Offline | 0 | N/A | ✅ 15/15 |
| `smoke-offline-listings-addon.mjs` | Offline | 0 | N/A | ✅ 15/15 |
| `smoke-dev-incidents-addon.mjs` | Real DEV | **2** | 0 | NOT_EXECUTED_CONFIGURATION_PENDING |
| `smoke-dev-listings-addon.mjs` | Real DEV | **2** | 0 | NOT_EXECUTED_CONFIGURATION_PENDING |
| `smoke-dev-addons.mjs` | Agregado real | **2** | 0 | ADDONS_DEV_CONFIGURATION_PENDING |

### Convención de exit codes (smokes DEV)

| Exit code | Significado |
|----------:|---|
| 0 | Ejecución real realizada y validada (`*_DEV_VALIDATED`) |
| 1 | Ejecución realizada con fallo real (`*_DEV_SMOKE_FAILED`) |
| 2 | No ejecutado — configuración pendiente (`NOT_EXECUTED_CONFIGURATION_PENDING`) |

Exit code 2 no es un fallo técnico de la implementación.
`--allow-pending` permite exit 0 para inspección local; el estado sigue siendo `NOT_EXECUTED_CONFIGURATION_PENDING` y no constituye evidencia de integración DEV.

---

## 5. Histórico de regresión

| Punto | Incremento | Passed acumulados |
|-------|------------|-------------------|
| Cierre Fase 11C3 | — | **3476** |
| Fase 11C4 — n8n integration | +234 | **3710** |
| Fase 11C5 — add-ons (suites 1–4) | +233 | 3943 |
| Fase 11C5 — cierre documental (`addons-dev-closure.spec.ts`) | +28 | **3971** |

Verificación: 3476 + 234 + 233 + 28 = **3971**

> **Referencias incorrectas eliminadas:** no se usa `~3710`, `~3936`, `Baseline 11C3 = 3710` ni `11C4 = +226`.

---

## 6. Test files skipped (6 ficheros)

Vitest reporta **6 test files skipped** porque estos ficheros contienen únicamente `it.todo()` — cero tests activos. Ninguno de los 6 tiene tests pasando ni tests skipped por infraestructura; todos sus casos son trabajo pendiente.

| # | Fichero | Todo | Motivo |
|---|---------|-----:|--------|
| 1 | `suites/activity-log/activity-log.spec.ts` | 17 | Especificación de Activity Log pendiente de implementación |
| 2 | `suites/conversation-routing/conversation-routing.spec.ts` | 19 | Routing conversacional pendiente |
| 3 | `suites/failure-recovery/failure-recovery.spec.ts` | 33 | Recovery de fallos pendiente |
| 4 | `suites/identity-validation/identity-validation.spec.ts` | 24 | Validación de identidad pendiente |
| 5 | `suites/incidents-flow/incidents-flow.spec.ts` | 22 | Flujo de incidencias E2E pendiente |
| 6 | `suites/permissions-and-privacy/permissions-and-privacy.spec.ts` | 31 | Permisos y privacidad pendiente |
| **Total** | | **146** | = 146 todo en la regresión completa |

Suma: 17 + 19 + 33 + 24 + 22 + 31 = **146** ✓

Vitest marca estos ficheros como "skipped" porque todos sus tests son `todo` (ningún test activo). Esto explica la discrepancia: **6 ficheros skipped ≠ 64 tests skipped** — son fenómenos distintos.

---

## 7. Tests skipped (64 tests)

Los 64 tests skipped son distintos de los 6 ficheros skipped. Proceden exclusivamente de:

`tests/regression/smart-conversations/suites/security-local-db/security-local-db.spec.ts`

Este fichero tiene tests activos que pasan, pero también tests con `it.skipIf(condition)` que se omiten porque Docker y Supabase local no están disponibles en CI.

| Condición | Declaraciones estáticas | Runtime skips |
|-----------|------------------------:|---------------:|
| `it.skipIf(!DOCKER_AVAILABLE)` | 2 | 2 |
| `it.skipIf(!INFRA_AVAILABLE)` — casos individuales | 54 | 54 |
| `it.skipIf(!INFRA_AVAILABLE)` — for-loop sobre 8 tablas `conv_*` | 1 | 8 |
| **Total** | **57** | **64** |

Verificación: 2 + 54 + 8 = **64** ✓

Estado: `LOCAL_DB_PENDING`. Los tests requieren Docker + Supabase local activos.
No son defectos; son tests de infraestructura real que Fase 11C5 no modifica.

---

## 8. Estado de los 146 todo

Los 146 `it.todo()` están intactos. Proceden de los 6 ficheros skipped listados arriba.
No se han convertido a tests activos, no se han eliminado, no se han reclasificado.

---

## 9. Estado por operación

| Operación | Estado offline | Estado DEV | Estado combinado |
|-----------|---------------|-----------|-----------------|
| `createIncident` | `INCIDENTS_INTEGRATION_OFFLINE_READY` | `INCIDENTS_DEV_CONFIGURATION_PENDING` | `INCIDENTS_INTEGRATION_OFFLINE_READY_DEV_PENDING` |
| `searchListings` | `LISTINGS_SEARCH_OFFLINE_READY` | `LISTINGS_SEARCH_DEV_CONFIGURATION_PENDING` | `LISTINGS_SEARCH_OFFLINE_READY_DEV_PENDING` |
| `createLead` | `LEAD_CREATION_OFFLINE_READY` | `LEAD_CREATION_DEV_CONFIGURATION_PENDING` | `LEAD_CREATION_OFFLINE_READY_DEV_PENDING` |

Smokes reales por operación: todos en `NOT_EXECUTED_CONFIGURATION_PENDING`.

---

## 10. Estado global

| Estado | Valor |
|--------|-------|
| Resultado interno offline | `ADDONS_INTEGRATION_OFFLINE_READY` |
| Configuración externa | `ADDONS_DEV_CONFIGURATION_PENDING` |
| Estado global Fase 11C5 | `ADDONS_INTEGRATION_OFFLINE_READY_DEV_PENDING` |
| GATE_0 | `PASS_WITH_WARNINGS` |
| GATE_1 | `AUDIT_COMPLETE_REMEDIATION_PENDING` (no cerrar) |

---

## 11. Seguridad

- GATE_1 = `AUDIT_COMPLETE_REMEDIATION_PENDING` — **no cerrar**
- No desplegar PRE/PRO mientras GATE_1 esté abierto
- Todos los smokes offline: sin endpoints reales, sin llamadas externas
- Smokes DEV: requieren endpoint + token explícito en entorno — exit 2 si ausentes
- Exit code 2 no es un fallo técnico; es `NOT_EXECUTED_CONFIGURATION_PENDING`
- Fase 11C6, Realtime y Wasender: **no iniciados**
