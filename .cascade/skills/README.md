# SmartRoom Rental — Cascade/Windsurf Skills Pointer

## Lectura obligatoria (always-on)

Antes de implementar cualquier feature o crear cualquier fichero, lee siempre, en este orden:

1. `docs/_commons/rules/rules-01-document-authoring-standard.md`
2. `docs/_commons/rules/rules-02-project-structure-and-addons.md`
3. `docs/_commons/rules/rules-03-repository-file-placement.md`
4. `.devin/rules/architecture.md` — arquitectura técnica canónica del proyecto (compartida entre agentes; ver también `.windsurf/rules/00-governance.md`)

## Skills disponibles en esta carpeta

- `smartrent-requirements/skill.md` — **legacy, contiene información desactualizada** (referencia Netlify en vez de Vercel; referencia un documento fuente `Requisitos_smartrent_system_para_claude_v1.3.md` no localizado en el repositorio actual). No usar como fuente de verdad para stack, deployment o plan-based restrictions: para eso usa `.devin/rules/architecture.md` y `docs/architecture/`. Pendiente de actualizar o archivar (ver `rules-03` §8).

## Documentación de módulo (fuente de verdad por módulo)

- Núcleo del producto: `docs/requirements/current/`, `docs/architecture/`, `docs/database/`, `docs/qa/`
- SmartConversations: `/docs/smart-conversations/{rules,contracts,skills,diagrams}/*.md`
- SmartAccessLock / TTLock: `docs/smart-lock/{rules,contracts,skills,tests,diagrams}/*.md`
- SmartIncidents: `docs/smart-incidents/rules/*.md`
- Habitaciones compartidas: `docs/smart-shared-rooms/shared-rooms.md`

Precedencia: `rules` > `contracts` > `skills` > `tests` > `diagrams`. Nunca sustituir una rule con una skill.

## Ubicación de ficheros nuevos

Antes de crear un fichero nuevo, revisa `rules-03-repository-file-placement.md`. No crear ficheros sueltos en la raíz del repositorio ni en `.cascade/` fuera de `skills/`.

## Informes y auditorías generadas por Cascade

Cualquier informe, auditoría o propuesta que generes va en `agent-work/cascade/`, nunca en la raíz ni suelto en `docs/`.
