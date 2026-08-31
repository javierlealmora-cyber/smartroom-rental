# Rule — Ubicación de Ficheros en el Repositorio

## 1. Propósito

Esta rule define, de forma única y obligatoria, dónde debe vivir cada tipo de fichero del repositorio (código, documentación, tests, scripts, artefactos temporales, salidas de agentes de IA), para que ningún colaborador humano ni agente de IA (Claude, Devin, Windsurf/Cascade, o cualquier herramienta que se incorpore en el futuro) disperse información fuera de su ubicación canónica.

Esta rule complementa a `rules-02-project-structure-and-addons.md`, que ya define la estructura obligatoria de add-ons y módulos funcionales. `rules-03` cubre todo lo que `rules-02` deja fuera de su alcance: la raíz del repositorio, la documentación transversal no ligada a un módulo, los tests, los scripts, y los artefactos de trabajo generados por agentes de IA.

## 2. Alcance

Esta rule aplica a cualquier fichero nuevo, movido o eliminado dentro del repositorio `smartroom-rental`, incluyendo los generados por agentes de IA (Claude Code, Devin, Windsurf/Cascade).

No aplica a:

- ficheros gestionados automáticamente por herramientas de terceros (`node_modules/`, `dist/`, `.vercel/`, lockfiles de dependencias)
- ficheros de configuración local del entorno del desarrollador que ya están cubiertos por `.gitignore`

## 3. Decisiones no negociables

1. La raíz del repositorio contiene únicamente ficheros de configuración de proyecto, entry points y `README.md`/`LICENSE` — nunca artefactos de trabajo, dumps, ni salidas de comandos.
2. Todo fichero de documentación pertenece a exactamente una ubicación canónica según su tipo (ver mapa en §4.2).
3. Los artefactos temporales o de depuración (dumps SQL, logs de lint, capturas de esquema, scripts de un solo uso) no se commitean al repositorio.
4. Las salidas de análisis, auditoría o informes generadas por un agente de IA se guardan bajo `agent-work/<agente>/`, nunca en la raíz ni sueltas en `docs/`.
5. Todo add-on o módulo funcional sigue `rules-02-project-structure-and-addons.md`; esta rule no lo redefine.
6. Todo documento markdown canónico sigue `rules-01-document-authoring-standard.md`; esta rule no lo redefine.
7. Ningún agente de IA crea una ubicación nueva de test, documentación o scripts sin verificar primero si ya existe una ubicación canónica equivalente en esta rule.
8. Esta rule, junto con `rules-01` y `rules-02`, debe formar parte del contexto de lectura obligatoria (always-on) de cualquier herramienta de IA usada en este proyecto. Ninguna herramienta de IA queda exenta de leerla.
9. Ningún punto de entrada de un agente de IA puede limitarse a un único módulo (p. ej. solo SmartConversations): debe enlazar siempre primero a la documentación transversal de `docs/_commons/rules/`.

## 4. Reglas obligatorias

### 4.1 Raíz del repositorio

Permitido en la raíz únicamente:

- Ficheros de configuración de build/tooling: `package.json`, `package-lock.json`, `vite.config.js`, `eslint.config.js`, `postcss.config.js`, `playwright.config.js`, `knip.json`, `vercel.json`, `index.html`, `.gitignore`, `.env.example`, `.env.local.example`
- `README.md`, `LICENSE`
- Carpetas de primer nivel ya establecidas: `src/`, `supabase/`, `docs/`, `scripts/`, `public/`, `qa/`, `tests/`, `agent-work/`, `automation_n8n/`, y las carpetas de configuración de IA (`.claude/`, `.devin/`, `.windsurf/`, `.cascade/`, `.github/`)

Prohibido en la raíz: dumps SQL sueltos, ficheros `.txt`/`.json` de salida de comandos (lint, dumps de ayuda CLI, etc.), scripts `.py`/`.sh`/`.bat` de un solo uso, imágenes sueltas, HTML de mantenimiento, ficheros `.tmp`.

> Hallazgo de auditoría (no corregido por esta rule, ver §8): `locks-*.sql`, `schema-*.sql`, `query-locks.sql`, `lint-*.{json,txt}`, `dump-help.txt`, `fix-part1.py`, `buscar-icono.png`, `lupa-icono.png`, `init.bat`, `maintenance.html`, `.env.vercel.tmp` incumplen esta regla hoy en la raíz del repositorio. Su limpieza es una tarea aparte que requiere confirmación explícita del usuario antes de mover o borrar nada.

### 4.2 Mapa canónico de documentación

| Tipo de contenido | Ubicación canónica |
|---|---|
| Reglas globales/transversales (`rules-01`, `rules-02`, `rules-03`, futuras) | `docs/_commons/rules/` |
| Requirements funcionales (`REQ-*`) | `docs/requirements/current/` |
| Arquitectura transversal del sistema | `docs/architecture/` |
| Decisiones de arquitectura (ADR) | `docs/architecture/adr/` |
| Base de datos / reglas de migración (documentación) | `docs/database/` |
| DevOps / deployment / entornos | `docs/devops/` |
| QA transversal (estrategia, trazabilidad global, defectos) | `docs/qa/` |
| Documentación propia de un módulo/add-on (`rules`, `contracts`, `skills`, `tests`, `diagrams` del módulo) | `docs/<module-name>/` (p. ej. `docs/smart-lock/`, `docs/smart-conversations/`, `docs/smart-incidents/`, `docs/smart-shared-rooms/`), según `rules-02` |
| Salidas de trabajo de un agente de IA (informes, auditorías, análisis, propuestas) | `agent-work/<agente>/` |
| Documentación histórica ya no vigente | `docs/archive/` |

### 4.3 Tests

- E2E (Playwright): `qa/e2e/` es la ubicación activa vigente.
- Unit/componentes (Vitest): `src/tests/` es la ubicación activa vigente. Su migración a `qa/unit/` es progresiva y se documenta en el `README.md` de esa carpeta, no en esta rule.
- Defectos abiertos: `tests/defects/OPEN-DEFECTS.md` (o la ubicación vigente indicada en `docs/qa/README.md`).
- Prohibido crear una ubicación de tests adicional (por ejemplo, duplicar specs de `qa/e2e/` en `tests/e2e/`) sin antes actualizar esta rule y migrar o retirar la ubicación anterior. Si ya existen ubicaciones solapadas, deben consolidarse en una tarea explícita y no ampliarse mientras tanto.

### 4.4 Scripts y artefactos operativos

- Scripts de mantenimiento reutilizables → `scripts/`.
- Scripts de un solo uso (fix puntual, migración manual, exploración) → no se commitean. Si tienen valor histórico, van a `scripts/archive/` con una nota de contexto en el propio fichero o en un `README.md` adjunto.
- Automatizaciones n8n de un add-on → `automation_n8n/<addon-name>/`, según `rules-02`.

### 4.5 Salidas de agentes de IA

Cuando un agente de IA genera un informe, auditoría, análisis o propuesta que no es documentación canónica del producto:

- Debe guardarse bajo `agent-work/<agente>/` (p. ej. `agent-work/claude/`, `agent-work/devin/`, `agent-work/cascade/`), nunca en la raíz del repositorio ni mezclado dentro de `docs/`.
- Si el informe deriva en una decisión aceptada por el usuario, el contenido relevante se traslada a la ubicación canónica correspondiente (`rules`/`contracts`/`skills`/`tests`/ADR según corresponda) y el informe original permanece en `agent-work/` como histórico.

### 4.6 Protocolo obligatorio de lectura para agentes de IA

Todo agente de IA que trabaje en este repositorio debe cargar como contexto siempre activo, antes de crear, mover o clasificar cualquier fichero:

1. `docs/_commons/rules/rules-01-document-authoring-standard.md`
2. `docs/_commons/rules/rules-02-project-structure-and-addons.md`
3. `docs/_commons/rules/rules-03-repository-file-placement.md` (este documento)
4. El `rules-00-scope-and-principles.md` del módulo concreto en el que se esté trabajando, si existe

Cada configuración de agente (`.claude/`, `.devin/rules/`, `.devin/skills/`, `.windsurf/rules/`, `.cascade/skills/`) debe exponer explícitamente estos documentos como lectura obligatoria en su punto de entrada. Si se incorpora una herramienta de IA nueva al proyecto, su punto de entrada debe enlazar también a esta lista antes de considerarse operativa.

## 5. Casos permitidos

- Crear una nueva carpeta de módulo bajo `docs/<module-name>/` siguiendo `rules-02`.
- Crear una nueva `rules-XX` en `docs/_commons/rules/` cuando surja una decisión transversal nueva, siguiendo la plantilla de `rules-01`.
- Incorporar un agente de IA nuevo al proyecto, siempre que su configuración enlace al protocolo de §4.6.
- Archivar documentación obsoleta en `docs/archive/` en lugar de borrarla, cuando conserve valor histórico.

## 6. Casos prohibidos

- Crear ficheros de trabajo, dumps o salidas de comandos en la raíz del repositorio.
- Duplicar el contenido íntegro de una `rules` global dentro de un módulo en lugar de referenciarla (los documentos de módulo deben declarar herencia y enlazar a la ruta real, no copiar el texto).
- Crear una ubicación de tests paralela a las ya vigentes sin actualizar esta rule.
- Que la configuración de un agente de IA apunte solo a la documentación de un módulo (p. ej. solo SmartConversations) ignorando `docs/_commons/rules/` y el resto de módulos o documentación transversal.
- Guardar informes o auditorías de un agente de IA fuera de `agent-work/<agente>/`.
- Referenciar rutas de documentación que no existen en el repositorio (ver hallazgo corregido en §8).

## 7. Impacto en diseño

Esta rule obliga a que cualquier decisión de estructura nueva (módulo, tipo de test, carpeta de documentación) se registre en `docs/_commons/rules/` antes de implementarse, y a que todos los agentes de IA compartan la misma vista del repositorio. Esto elimina el riesgo de que cada herramienta organice la información de forma distinta, que era el problema detectado en la auditoría que originó esta rule.

## 8. Impacto en implementación

Esta rule no mueve ni borra ficheros por sí misma. Los siguientes hallazgos de la auditoría que la motivó quedan documentados aquí como deuda pendiente, a ejecutar en tareas separadas y con confirmación explícita del usuario antes de mover o borrar nada:

- Raíz del repositorio con ficheros fuera de sitio (dumps SQL, salidas de lint, script `fix-part1.py`, imágenes sueltas, `.env.vercel.tmp`) — ver detalle en §4.1.
- `docs/` raíz con documentos legado duplicados (`arquitectura.md`, `estructura-sistema.md`, `reglas-proyecto.md`, `DEPLOYMENT.md`, `VERCEL_SETUP.md`, `GIT-FINAL-CONFIGURATION.md`, `MAINTENANCE-MODE-CONTROL.md`, `deploy-edge-function.md`, `storage-structure.md`, `testing-login.md`, `CODE-REFACTORING.md`, `skill.md`) que se solapan con contenido ya consolidado en `docs/architecture/`, `docs/devops/` y `docs/qa/`.
- Tests repartidos en tres ubicaciones (`qa/`, `tests/`, `src/tests/`) con solapamiento parcial — ver §4.3.
- `.devin/` y `.windsurf/` con documentos sueltos de fases de setup ya completadas (`ESTRUCTURA-TESTING-FASE1.md`, `GITHUB-WORKFLOWS-FASE4.md`, etc.) mezclados con las rules/skills vigentes; deberían archivarse bajo `agent-work/` cuando se apruebe esa limpieza.
- `docs/smart-incidents/rules/rules-01-document-authoring-standard.md` referenciaba una ruta inexistente (`docs/project-rules/...`) en vez de `docs/_commons/rules/...` — corregido como parte de la tarea que introdujo esta rule.
- Ningún punto de entrada de agente de IA leía `docs/_commons/rules/` antes de esta tarea — corregido como parte de la misma tarea (`'.claude/README.md`, `.devin/rules/README.md`, `.devin/skills/README.md`, `.cascade/skills/README.md`, `.windsurf/rules/00-governance.md`).
- `.cascade/skills/smartrent-requirements/skill.md` contiene información desactualizada (referencia Netlify en vez de Vercel, referencia un documento fuente `Requisitos_smartrent_system_para_claude_v1.3.md` no localizado en el repositorio) y no sigue la plantilla de `rules-01` para `skills`. Debe revisarse y actualizarse o archivarse en una tarea aparte.

## 9. Dependencias

Esta rule depende de:

- `docs/_commons/rules/rules-01-document-authoring-standard.md`
- `docs/_commons/rules/rules-02-project-structure-and-addons.md`

### Requirements relacionados

No aplica. Esta es una rule transversal de organización del repositorio, no derivada de un requirement funcional de producto — mismo tratamiento que `rules-01` y `rules-02`.

## 10. Checklist de validación

Antes de crear, mover o aceptar cualquier fichero nuevo, verificar:

- [ ] El fichero no se ha creado en la raíz del repositorio salvo que esté en la lista permitida de §4.1
- [ ] Si es documentación, está en la ubicación canónica de §4.2
- [ ] Si es de un add-on/módulo, sigue `rules-02`
- [ ] Si es un test, usa una ubicación ya vigente (§4.3) y no crea una tercera
- [ ] Si es una salida de agente de IA, está bajo `agent-work/<agente>/`
- [ ] Si es un artefacto temporal o de depuración, no se ha commiteado
- [ ] La configuración del agente de IA usado sigue enlazando al protocolo de lectura de §4.6

## 11. Notas de control de cambios

Esta rule es transversal y afecta a todos los módulos y agentes de IA del proyecto. Los cambios deben:

- justificarse explícitamente
- revisarse junto con `rules-01` y `rules-02` para evitar contradicciones
- reflejarse en los puntos de entrada de todos los agentes de IA si cambia el protocolo de lectura de §4.6

En caso de conflicto entre esta rule y una práctica puntual del proyecto, prevalece esta rule salvo aprobación explícita de una excepción arquitectónica por parte del usuario.
