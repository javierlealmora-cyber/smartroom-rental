# ADR-006: SmartAccessLock — Modelo de Provider TTLock (Cloud + BLE Local) — MIGRADO

**Estado:** ⚠️ Contenido migrado — ver `docs/smart-lock/`
**Fecha:** 2026-07-16
**Migrado el:** 2026-07-16

---

El contenido normativo de este ADR ha sido distribuido en la estructura documental oficial de add-ons (`docs/_commons/rules/rules-02-project-structure-and-addons.md`), siguiendo el estándar de `docs/_commons/rules/rules-01-document-authoring-standard.md`.

Este fichero se conserva únicamente como puntero histórico. **No usar como fuente de verdad.**

## Fuente de verdad vigente

- **Requirement funcional:** `docs/requirements/current/REQ-SL-000-smart-lock-capability.md`
- **Reglas normativas:** `docs/smart-lock/rules/`
  - `rules-00-scope-and-principles.md`
  - `rules-01-document-authoring-standard.md`
  - `rules-10-provider-model.md`
  - `rules-20-tenant-activation-and-lifecycle.md`
  - `rules-21-subscription-plan-configuration.md`
  - `rules-30-schema-isolation.md`
  - `rules-40-ttlock-cloud-provider.md`
  - `rules-50-ttlock-ble-provider.md`
  - `rules-60-gateway-communication.md`
  - `rules-70-subscription-cancellation-and-lock-release.md`
  - `rules-90-observability-and-failure-handling.md`
- **Contratos:** `docs/smart-lock/contracts/`
- **Guías de implementación:** `docs/smart-lock/skills/`
- **Especificaciones de prueba:** `docs/smart-lock/tests/`
- **Diagramas:** `docs/smart-lock/diagrams/`

## Mapa de migración (para referencia histórica)

| Sección original de este ADR | Documento destino |
|---|---|
| Contexto y restricciones | `rules-00-scope-and-principles.md` |
| Decisión — arquitectura de 3 capas | `rules-00-scope-and-principles.md`, `diagram-three-layer-architecture.md` |
| Decisión — dos providers coexistentes | `rules-10-provider-model.md` |
| Decisión — modelo de shards | `rules-40-ttlock-cloud-provider.md`, `skill-shard-management.md`, `diagram-shard-model.md` |
| Decisión — renombrado de tablas | `rules-30-schema-isolation.md` |
| Decisión — gating por subscripción | `rules-20-tenant-activation-and-lifecycle.md` |
| Decisión — Fase 2 BLE y MQTT | `rules-50-ttlock-ble-provider.md`, `rules-60-gateway-communication.md` |
| `ILockProvider` | `contract-lock-provider-interface.md` |
| Persistencia de `lockData` | `skill-vault-lockdata-persistence.md`, `contract-vault-lockdata.md` |
| Alternativas descartadas | Incorporadas como notas normativas dentro de cada `rules-*` correspondiente |
| Riesgos | `rules-90-observability-and-failure-handling.md` |
| Plan de implementación | `test-*` de `docs/smart-lock/tests/` (criterios de aceptación) |
