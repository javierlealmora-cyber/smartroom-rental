# SmartRoom Rental — Claude Documentation Pointer

## Lectura obligatoria (always-on)

Antes de crear, mover o clasificar cualquier fichero, lee siempre, en este orden:

1. `docs/_commons/rules/rules-01-document-authoring-standard.md` — cómo se escribe cualquier documento del repo
2. `docs/_commons/rules/rules-02-project-structure-and-addons.md` — dónde vive el código y la documentación de un add-on/módulo
3. `docs/_commons/rules/rules-03-repository-file-placement.md` — dónde vive todo lo demás (raíz, tests, scripts, salidas de agentes de IA)
4. `.devin/rules/architecture.md` — arquitectura técnica canónica (stack, multi-tenant, Edge-first, RLS, storage, anti-patrones)

Estos documentos tienen precedencia sobre cualquier otra fuente si hay conflicto.

## Documentación según el módulo en el que trabajes

- Núcleo del producto (auth, entidades, alojamientos, habitaciones, inquilinos, energía, dashboard): `docs/requirements/current/`, `docs/architecture/`, `docs/database/`, `docs/qa/`
- SmartConversations (WhatsApp/Webchat/IA conversacional): `docs/smart-conversations/{rules,contracts,skills,diagrams}/*.md`
- SmartAccessLock / TTLock: `docs/smart-lock/{rules,contracts,skills,tests,diagrams}/*.md`
- SmartIncidents: `docs/smart-incidents/rules/*.md`
- Habitaciones compartidas: `docs/smart-shared-rooms/shared-rooms.md`
- DevOps / deployment: `docs/devops/`

Lee todos los markdown de la carpeta del módulo relevante para la tarea, no solo el fichero que parezca más obvio.

## Precedencia entre categorías documentales

`rules` > `contracts` > `skills` > `tests` > `diagrams` (ver `rules-01` §3).

## Reglas no negociables (resumen; ver la rule completa para el detalle)

- No llamar a Supabase directo desde el frontend para lógica de negocio: todo pasa por Edge Functions (`invokeWithAuth`).
- No sustituir Wasender como canal de WhatsApp en SmartConversations.
- No saltarse la Integration API para que un add-on acceda a datos del core.
- No debilitar los requisitos de validación de identidad.
- Antes de crear un fichero nuevo, verifica su ubicación contra `rules-03` — no lo coloques en la raíz del repo ni en una carpeta genérica sin namespace.

## Informes y auditorías generados por Claude

Cualquier informe, auditoría o propuesta que generes (no documentación canónica del producto) va en `agent-work/claude/`, nunca en la raíz ni suelto en `docs/`.
