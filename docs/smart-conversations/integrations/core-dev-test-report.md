# Core DEV Test Report — Fase 11C2

Fecha: 2026-07-23
Estado: CORE_INTEGRATION_OFFLINE_READY
GATE_0: PASS_WITH_WARNINGS
GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING

---

## Suites de tests Fase 11C2

| Suite | Archivo | Tests |
|-------|---------|-------|
| Static contracts | `core-integration-dev.spec.ts` | 60 |
| Runtime simulation | `core-integration-dev-runtime.spec.ts` | 56 |
| Contracts + docs | `core-integration-dev-contracts.spec.ts` | 34 |
| **Total** | | **150** |

Mínimo requerido: 140 tests activos. Se supera con 150.
Sin `it.todo` activo en la suite Core.

---

## Grupos de tests

### core-integration-dev.spec.ts (60 tests)

| Grupo | IDs | Tests |
|-------|-----|-------|
| Environment & guard | CIDEV-ENV-01..14 | 14 |
| Validation schemas | CIDEV-VAL-01..06 | 6 |
| Auth backend-to-backend | CIDEV-AUTH-01..06 | 6 |
| Identity adapter | CIDEV-ID-01..15 | 15 |
| Features adapter | CIDEV-FEA-01..09 | 9 |
| Accommodation (BLOCKED) | CIDEV-ACC-01..06 | 6 |
| Boundary constraints | CIDEV-BND-01..04 | 4 |

### core-integration-dev-runtime.spec.ts (56 tests)

| Grupo | IDs | Tests |
|-------|-----|-------|
| Core env runtime | IDR-CENV-01..08 | 8 |
| Identity runtime | IDR-CID-01..15 | 15 |
| Features runtime | IDR-CFEA-01..09 | 9 |
| Activity runtime | IDR-CACT-01..13 | 13 |
| Resilience | IDR-CRES-01..08 | 8 |
| Other | IDR-* | 3 |

### core-integration-dev-contracts.spec.ts (34 tests)

| Grupo | IDs | Tests |
|-------|-----|-------|
| Activity contract | IDC-CACT-01..07 | 7 |
| Multi-tenant | IDC-CMT-01..08 | 8 |
| Privacidad | IDC-CPRV-01..08 | 8 |
| Canary & rollback | IDC-CCAN-01..06 | 6 |
| Documentación | IDC-CDOC-01..10 | 5 (de 10 en doc, 5 en suite) |

---

## Validaciones offline verificadas

- 4 identity levels canónicos únicamente (sin WEAK_MATCH, sin UNVERIFIED)
- 13 eventos Activity Log (sin conv_help_escalated, sin nuevos)
- Shadow rechazado para Activity Log
- Fire-and-log: 409 idempotent, excepción capturada
- Cross-tenant guard en los 3 adapters
- IDENTITY_REQUEST_FORBIDDEN_FIELDS cubre JID, webchat_token, prompt, conversation
- ACTIVITY_FORBIDDEN_METADATA_FIELDS cubre message_text, phone, raw_payload
- DEV_ENVIRONMENTS = { sandbox, dev, development }
- PRE_PRO_MARKERS bloquea production, staging, pre, pro
- CANARY_ALLOWLIST incluye core.identity.validate, core.tenant.features, core.activity.publish
- accommodation → BLOCKED_BY_CORE documentado

---

## Scripts

```bash
npm run test:sc:core-integration-dev        # Vitest suite 11C2
npm run validate:sc:core-dev-integration    # Validador offline
node scripts/smart-conversations/smoke/smoke-core-dev.mjs  # Smoke (requiere credenciales DEV)
```
