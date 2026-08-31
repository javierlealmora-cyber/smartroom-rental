# Core DEV Rollback — Fase 11C2

Procedimiento de rollback a mock sin despliegue destructivo.

---

## Rollback inmediato (sin redespliegue)

Cambiar la variable de entorno en la función Supabase DEV:

```bash
CORE_INTEGRATION_MODE=mock
```

Todos los adapters Core (`core-identity-adapter.ts`, `core-features-adapter.ts`, `core-activity-adapter.ts`)
leen `CORE_INTEGRATION_MODE` al inicio de cada invocación.
El rollback es efectivo en la siguiente request, sin reinicio destructivo.

---

## Rollback programático (canary)

Activar `rollback_flag` en la allowlist canary vía código:

```typescript
import { activateRollback } from '../integration-canary.ts';
activateRollback('dev-tenant-a-00000000-0000-0000-0000-000000000001', 'core');
```

Efecto: el tenant vuelve a modo `mock` aunque `CORE_INTEGRATION_MODE=canary`.

Para restaurar:

```typescript
import { clearRollback } from '../integration-canary.ts';
clearRollback('dev-tenant-a-00000000-0000-0000-0000-000000000001', 'core');
```

---

## Lo que NO hacer en rollback

- No ejecutar `supabase db reset` — afectaría datos DEV de otros módulos.
- No eliminar los adapters Core — el rollback es siempre a mock, no a eliminación.
- No usar credenciales PRE/PRO para "probar el rollback".
- No cerrar GATE_1 (`AUDIT_COMPLETE_REMEDIATION_PENDING`).

---

## Verificación post-rollback

```bash
npm run test:sc:core-integration-dev
npm run validate:sc:core-dev-integration
```

Ambos deben pasar en modo offline (sin credenciales Core).

---

## GATE status tras rollback

GATE_0: PASS_WITH_WARNINGS (no cambia)
GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING (no cerrar)
