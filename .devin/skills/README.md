# SmartRoom Rental — Devin Skills Pointer

## Lectura obligatoria (always-on)

Antes de implementar cualquier feature, lee siempre, en este orden:

1. `docs/_commons/rules/rules-01-document-authoring-standard.md`
2. `docs/_commons/rules/rules-02-project-structure-and-addons.md`
3. `docs/_commons/rules/rules-03-repository-file-placement.md`
4. `.devin/rules/architecture.md` — arquitectura técnica canónica del proyecto

## Skills disponibles en esta carpeta

- `calculo-consumo/` — cálculo de consumo energético (con y sin lector)
- `ux-tabs-multilevel/` — patrón de navegación por tabs multinivel

## Skills/documentación de módulo (fuente de verdad por módulo)

- SmartConversations: `/docs/smart-conversations/skills/*.md` (junto con `rules/*.md` y `contracts/*.md` del mismo módulo)
- SmartAccessLock / TTLock: `docs/smart-lock/skills/*.md`
- SmartIncidents: `docs/smart-incidents/` (skills aún no creadas; solo `rules/` por ahora)

Precedencia: `rules` > `contracts` > `skills` > `diagrams`. Toda implementación debe cumplir:

- las restricciones arquitectónicas de `rules`
- las definiciones de payload y estado de `contracts`
- la guía de implementación aprobada en `skills`

## Ubicación de ficheros nuevos

Antes de crear un fichero de skill nuevo, revisa `rules-03-repository-file-placement.md` (§4.2 y §4.6): las skills de un módulo van en `docs/<module-name>/skills/`, las skills transversales del propio agente van en esta carpeta (`.devin/skills/<nombre>/SKILL.md`). No crear skills sueltas en la raíz del repositorio.

## Informes y auditorías generados por Devin

Cualquier informe, auditoría o propuesta que generes va en `agent-work/devin/`, nunca en la raíz ni suelto en `docs/`.
