---
trigger: always_on
description: Punto de entrada de gobernanza documental para Windsurf/Cascade en SmartRoom Rental. Enlaza las rules transversales de docs/_commons/rules y la arquitectura canónica del proyecto. Consultar SIEMPRE antes de crear, mover o clasificar cualquier fichero.
---

# SmartRoom Rental — Gobernanza para Windsurf/Cascade

Esta carpeta (`.windsurf/rules/`) no tenía ninguna rule activa hasta ahora. Este documento es el punto de entrada obligatorio.

## Lectura obligatoria (always-on)

Antes de crear, mover o clasificar cualquier fichero, lee siempre, en este orden:

1. `docs/_commons/rules/rules-01-document-authoring-standard.md` — cómo se escribe cualquier documento del repo
2. `docs/_commons/rules/rules-02-project-structure-and-addons.md` — dónde vive el código y la documentación de un add-on/módulo
3. `docs/_commons/rules/rules-03-repository-file-placement.md` — dónde vive todo lo demás (raíz, tests, scripts, salidas de agentes de IA)
4. `.devin/rules/architecture.md` — arquitectura técnica canónica del proyecto (stack, multi-tenant, Edge-first, RLS, storage, anti-patrones). Aunque vive físicamente bajo `.devin/`, es la arquitectura de referencia para todos los agentes del proyecto.
5. `.devin/rules/react-best-practices.md` — estándares de código React aplicables a cualquier `.jsx`/`.tsx`/`.js`/`.ts`

Estos documentos tienen precedencia sobre cualquier otra fuente si hay conflicto.

## Documentación según el módulo en el que trabajes

- Núcleo del producto: `docs/requirements/current/`, `docs/architecture/`, `docs/database/`, `docs/qa/`
- SmartConversations: `docs/smart-conversations/{rules,contracts,skills,diagrams}/*.md`
- SmartAccessLock / TTLock: `docs/smart-lock/{rules,contracts,skills,tests,diagrams}/*.md`
- SmartIncidents: `docs/smart-incidents/rules/*.md`
- Habitaciones compartidas: `docs/smart-shared-rooms/shared-rooms.md`

Precedencia entre categorías documentales: `rules` > `contracts` > `skills` > `tests` > `diagrams`.

## Reglas no negociables (resumen)

- No llamar a Supabase directo desde el frontend para lógica de negocio: todo pasa por Edge Functions (`invokeWithAuth`).
- No sustituir Wasender como canal de WhatsApp en SmartConversations.
- No saltarse la Integration API para que un add-on acceda a datos del core.
- No debilitar los requisitos de validación de identidad.
- Antes de crear un fichero nuevo, verifica su ubicación contra `rules-03-repository-file-placement.md` — no lo coloques en la raíz del repo ni en una carpeta genérica sin namespace.

## Informes y auditorías generados por Cascade

Cualquier informe, auditoría o propuesta que generes (no documentación canónica del producto) va en `agent-work/cascade/`, nunca en la raíz del repositorio ni suelto en `docs/` o `.windsurf/`.
