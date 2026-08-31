# Legacy SAL Schema — Histórico (Abril 2026)

Estos ficheros son **artefactos históricos de diseño** del schema SmartAccessLock. Se conservan solo como referencia; **no son fuente de verdad**.

## Fuente de verdad vigente

- Schema aplicado: `supabase/migrations/20260716000001_smart_lock_rename_and_constraints.sql` (Fase 1a — renombrados + CHECKs) sobre la base histórica ya presente en DEV.
- Requirement funcional: `docs/requirements/current/REQ-SL-000-smart-lock-capability.md`.
- Reglas normativas: `docs/smart-lock/rules/`.

## Motivo de la conservación

Estos ficheros contienen las iteraciones de diseño previas al schema definitivo. Se movieron aquí (2026-07-16) desde la raíz del repositorio para cumplir `docs/_commons/rules/rules-03-repository-file-placement.md`. Ninguno de estos ficheros debe ejecutarse contra ninguna BBDD.

## Contenido

- `locks-schema.sql`, `locks-complete-schema.sql`, `locks-final-schema.sql` — iteraciones sucesivas del schema completo.
- `locks-ordered-*.sql`, `locks-part*.sql` — variantes divididas y reordenadas usadas durante el desarrollo.
- `fix-part1.py` — script auxiliar de una corrección puntual.

Si necesitas consultar el estado actual del schema, hazlo contra DEV directamente o revisa las migraciones oficiales en `supabase/migrations/`.
