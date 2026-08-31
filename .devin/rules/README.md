# SmartRoom Rental — Devin Rules Pointer

## Lectura obligatoria (always-on)

Antes de crear, mover o clasificar cualquier fichero, lee siempre, en este orden:

1. `docs/_commons/rules/rules-01-document-authoring-standard.md` — cómo se escribe cualquier documento del repo
2. `docs/_commons/rules/rules-02-project-structure-and-addons.md` — dónde vive el código y la documentación de un add-on/módulo
3. `docs/_commons/rules/rules-03-repository-file-placement.md` — dónde vive todo lo demás (raíz, tests, scripts, salidas de agentes de IA)
4. `architecture.md` (en esta misma carpeta) — arquitectura técnica canónica del proyecto
5. `react-best-practices.md` (en esta misma carpeta) — estándares de código React aplicables

Estos documentos tienen precedencia sobre cualquier otra fuente si hay conflicto.

## Documentación según el módulo en el que trabajes

- Núcleo del producto: `docs/requirements/current/`, `docs/architecture/`, `docs/database/`, `docs/qa/`
- SmartConversations: `/docs/smart-conversations/rules/*.md`, `/contracts/*.md`, `/skills/*.md`, `/diagrams/*.md`
- SmartAccessLock / TTLock: `docs/smart-lock/{rules,contracts,skills,tests,diagrams}/*.md`
- SmartIncidents: `docs/smart-incidents/rules/*.md`
- Habitaciones compartidas: `docs/smart-shared-rooms/shared-rooms.md`

Lee todos los markdown de la carpeta del módulo relevante para la tarea, no solo el fichero que parezca más obvio.

## Precedencia entre categorías documentales

1. rules
2. contracts
3. skills
4. diagrams

## Reglas no negociables

- Tratar `rules` como restricciones no negociables.
- Tratar `contracts` como las interfaces formales y las definiciones de payload.
- Tratar `skills` como guías de implementación que deben respetar rules y contracts.
- Tratar `diagrams` como apoyo explicativo, nunca como fuente primaria si entran en conflicto con rules o contracts.
- No inventar arquitecturas alternativas si la documentación ya define una.
- No sustituir Wasender como canal de WhatsApp.
- No saltarse la Integration API para acceder a datos del core de SmartRoom desde un add-on.
- No debilitar los requisitos de validación de identidad.
- Antes de crear un fichero nuevo, verifica su ubicación contra `rules-03-repository-file-placement.md` — no lo coloques en la raíz del repo ni en una carpeta genérica sin namespace.

## Informes y auditorías generados por Devin

Cualquier informe, auditoría o propuesta que generes (no documentación canónica del producto) va en `agent-work/devin/`, nunca en la raíz del repositorio ni suelto dentro de `.devin/` o `docs/`.
