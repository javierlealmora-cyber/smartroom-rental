# QA — SmartRent

Carpeta raíz de calidad del proyecto. Contiene todos los tests, gestión de defectos y reportes.

## Estructura

```
qa/
├── README.md          ← este fichero
├── COVERAGE.md        ← matriz de trazabilidad funcionalidad → test
│
├── unit/              ← Vitest: lógica, servicios, componentes, seguridad, rendimiento
│   ├── helpers/       ← infraestructura compartida
│   ├── logic/         ← lógica pura (sin mocks, sin red, sin DOM)
│   ├── services/      ← servicios Supabase con chainMock
│   ├── components/    ← guards y componentes con lógica propia (@testing-library/react)
│   ├── security/      ← aislamiento multi-tenant, RLS
│   └── performance/   ← volumetría y concurrencia
│
├── e2e/               ← Playwright: flujos completos desde UI
│   ├── specs/         ← todos los spec files (.spec.js)
│   ├── helpers/       ← antd.js, data.js
│   ├── fixtures/      ← auth.fixture.js
│   ├── .auth/         ← sesiones guardadas (git-ignored)
│   ├── global-setup.js← autenticación pre-test
│   ├── .env.e2e       ← credenciales staging (git-ignored)
│   └── .env.e2e.example
│
├── defects/           ← registro de bugs detectados y cerrados
└── reports/           ← snapshots del estado del sistema
```

## Tests existentes en src/tests/ (migración pendiente)

Los tests de `src/tests/` siguen siendo válidos y se ejecutan con Vitest.
Se migran a `qa/unit/` gradualmente según se modifican.
El vitest.config.js incluye ambas rutas durante la transición.

## Cómo ejecutar

```bash
# Todos los unit tests (src/tests/ + qa/unit/)
npm run test:run

# Solo qa/unit/
npm run test:qa

# Solo lógica pura
npm run test:logic

# Solo servicios
npm run test:services

# Solo guards/componentes
npm run test:components

# E2E (requiere dev server o .env.e2e relleno)
npm run test:e2e

# E2E solo auth
npm run test:e2e:auth

# E2E solo energy
npm run test:e2e:energy

# Con cobertura
npm run test:coverage
```

## Convenciones de IDs

Catálogo completo de dominios (con código y documentación asociada) en `docs/requirements/domain-index.md`, gobernado por `docs/_commons/rules/rules-04-functional-domain-catalog.md`.

| Módulo           | Prefijo req | Prefijo test  |
|------------------|-------------|---------------|
| Autenticación    | AUTH-xx     | unit/logic o guards |
| SuperAdmin       | SA-xx       | unit/services |
| Entidades        | ENT-xx      | unit/services/entities |
| Alojamientos     | ACC-xx      | unit/services/accommodations |
| Inquilinos       | TEN-xx      | unit/logic + unit/services/lodgers |
| Energía/Facturas | ENE-xx      | unit/logic/energy + unit/services/energy |
| Dashboard        | DASH-xx     | pendiente |
| Planes           | PLAN-xx     | pendiente |
| Catálogo SaaS de servicios | SVC-xx | pendiente |
| Seguridad        | SEC-xx      | unit/security |
| Rendimiento      | PERF-xx     | unit/performance |
| SmartLock (add-on) | SAL-xx    | pendiente (ver `docs/smart-lock/tests/`) |
| SmartConversations (add-on) | SC-xx | `tests/regression/smart-conversations/` |
| SmartIncidents (add-on) | SI-xx | pendiente |

## Reglas

1. **Toda nueva feature → mínimo 1 test** antes de mergear
2. **Todo bug corregido → test de regresión** que lo habría detectado
3. **Defecto detectado → entrada en** `defects/OPEN-DEFECTS.md`
4. **Bug resuelto → mover a** `defects/CLOSED-DEFECTS.md` con test de regresión
5. **No testear:** constantes estáticas, componentes puramente display, config de Supabase client
6. **Unit vs E2E:** la lógica va en unit, el flujo completo va en E2E

## Relación con el resto del proyecto

- `docs/` → define el sistema (arquitectura, requisitos, DB)
- `qa/` → valida el sistema
- `supabase/` → ejecuta el sistema
- `qa/defects/` → registra problemas reales
- `qa/reports/` → reportes Playwright + outputs de agente
- `agent-work/claude/reports/` → reportes de estado generados por Claude
- `COVERAGE.md` → conecta todo
