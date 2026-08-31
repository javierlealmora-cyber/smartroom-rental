# Rule — Catálogo Funcional por Dominio

## 1. Propósito

Esta rule define el vocabulario canónico de dominios funcionales del proyecto (núcleo + add-ons) y obliga a mantener `docs/requirements/domain-index.md` como mapa vivo que conecta, para cada dominio, sus requirements, su código, su documentación de módulo y su prefijo de test — sin mover ni reestructurar físicamente ningún fichero existente.

Nace de una auditoría que evaluó la propuesta de crear `docs/domains/<dominio>/` y `src/domains/<dominio>/` como réplica física de cada dominio (planteada por Devin en una sesión previa, nunca ejecutada) y concluyó que el coste de reestructurar (romper enlaces ya existentes desde `docs/qa/TRACEABILITY-MATRIX.md`, `qa/COVERAGE.md`, ADRs e imports internos) no está justificado: el núcleo ya está agrupado por dominio técnico de facto. Lo que faltaba no era mover código, era un índice.

## 2. Alcance

Aplica a la catalogación de funcionalidad del núcleo del producto (auth, entidades, alojamientos, habitaciones, inquilinos, energía, dashboard, planes, catálogo de servicios SaaS) y de los add-ons ya existentes (SmartLock, SmartConversations, SmartIncidents). No redefine `rules-01` (estándar de redacción) ni `rules-02` (estructura de add-ons) ni `rules-03` (ubicación general de ficheros); depende de las tres.

## 3. Decisiones no negociables

1. El vocabulario de dominios de este documento es la única fuente de verdad de nombres/prefijos de dominio — ningún otro documento puede inventar un nombre o prefijo distinto para el mismo dominio.
2. `docs/requirements/domain-index.md` cataloga (dominio → REQ → código → doc-módulo → prefijo test → tag Playwright); no mueve ficheros. Catalogar ≠ reestructurar.
3. Prohibido crear `docs/domains/` o `src/domains/` para el núcleo. El namespace propio de `rules-02` (`src/addons/<name>/`) es exclusivamente para módulos realmente desacoplados (add-ons), no para dominios del núcleo.
4. Un módulo documental puede tener subcarpetas temáticas dentro de una categoría de `rules-01` (p. ej. `rules/security/`, `contracts/integrations/`) cuando esa categoría supera ~30 ficheros, sin que eso viole la clasificación en 5 categorías — evita forzar un aplanado que perdería agrupación intencional.
5. Las decisiones de namespace todavía abiertas (ver §8) se registran aquí hasta resolverse; no se ejecutan sin confirmación explícita del usuario.

## 4. Reglas obligatorias

### 4.1 Vocabulario canónico de dominios

| Dominio | Prefijo REQ/test | Tag Playwright |
|---|---|---|
| Autenticación | `AUTH` | `@auth` |
| Cuentas cliente SaaS (superadmin) | `SA` | `@sa` |
| Entidades | `ENT` | `@ent` |
| Alojamientos y Habitaciones | `ACC` | `@acc` |
| Inquilinos | `TEN` | `@ten` |
| Energía/Facturas | `ENE` | `@ene` |
| Dashboard | `DASH` | `@dash` |
| Planes de suscripción | `PLAN` | `@plan` |
| Catálogo SaaS de servicios/add-ons | `SVC` | `@svc` |
| Seguridad transversal | `SEC` | `@sec` |
| Rendimiento | `PERF` | `@perf` |
| SmartLock (add-on) | `SAL` | `@sal` |
| SmartConversations (add-on) | `SC` | `@sc` |
| SmartIncidents (add-on) | `SI` | `@si` |

### 4.2 Mantenimiento del índice

Cualquier REQ, carpeta de código o documento de módulo nuevo debe añadirse a `docs/requirements/domain-index.md` en la entrada del dominio correspondiente. Si no encaja en ningún dominio existente, se propone uno nuevo aquí (en la tabla de §4.1) antes de usarlo en el índice.

### 4.3 Subcarpetas temáticas dentro de una categoría

Cuando una categoría documental de un módulo (p. ej. `docs/smart-conversations/security/`) crece más allá de lo manejable como lista plana, se permite introducir subcarpetas temáticas dentro de la categoría (`rules/`, `contracts/`, `skills/`, `tests/`, `diagrams/`) sin que eso constituya una categoría nueva no contemplada por `rules-01`. La reclasificación concreta de `docs/smart-conversations/` (que hoy tiene 9 carpetas fuera de las 5 categorías) queda fuera del alcance de esta tarea — requiere un mapa fichero-a-fichero previo y confirmación explícita del usuario.

## 5. Casos permitidos

- Añadir una fila nueva a `docs/requirements/domain-index.md` cuando se crea un REQ, carpeta de código o módulo nuevo.
- Proponer un dominio nuevo en la tabla de §4.1 cuando ninguno de los 14 existentes encaja.
- Usar subcarpetas temáticas dentro de una categoría documental de un módulo grande.

## 6. Casos prohibidos

- Crear `docs/domains/<dominio>/` o `src/domains/<dominio>/` para el núcleo.
- Inventar un prefijo o tag de dominio distinto al de la tabla de §4.1 para el mismo concepto.
- Mover físicamente código o documentación como parte de "catalogar" — eso es una tarea de reestructuración aparte, con su propio análisis de impacto y confirmación del usuario.

## 7. Impacto en diseño

Permite que cualquier IA o persona nueva en el proyecto entienda en un único documento (`docs/requirements/domain-index.md`) qué REQ, qué código y qué documentación corresponden a cada funcionalidad, sin necesidad de una reestructuración física de alto riesgo.

## 8. Impacto en implementación

Decisiones de namespace registradas como pendientes (no ejecutar sin confirmación explícita del usuario):

- `REQ-SC-100/110/120` ("incidents service") colisiona conceptualmente con el módulo ya existente `docs/smart-incidents/`. Cuando se redacten, probablemente deban re-namespacearse a `REQ-SI-*` con un stub-redirect igual al ya usado en `REQ-014 → REQ-SL-000`.
- `REQ-SC-150/160/170` ("advertisement service") coincide con `smart-publications`, módulo futuro citado textualmente en `rules-02` §2 como ejemplo. Cuando se redacten, previsiblemente deban re-namespacearse a `REQ-SP-*` con el mismo patrón de stub-redirect.
- `REQ-SC-200/210/220` (help) y `REQ-SC-300/320` (chatbot channel) sí encajan como canales/features propios de SmartConversations — se quedan bajo `SC`.
- `docs/smart-shared-rooms/shared-rooms.md`: no es un add-on (REQ-015 es núcleo, dominio `ACC`). Su contenido debería fusionarse en la entrada `ACC` del índice y la carpeta `docs/smart-shared-rooms/` retirarse o convertirse en stub-redirect — pendiente de confirmación.
- Duplicación viva detectada en `src/App.jsx` (líneas 297-305): `/v2/superadmin/servicios` (`ServicesListV2`) y `/v2/superadmin/saas-servicios` (`SaasServicesListV2`) están ambas activas en producción y ambas parecen cubrir REQ-013 (dominio `SVC`). El usuario no ha confirmado cuál es la fuente de verdad — se documenta en `domain-index.md` como decisión de producto abierta, sin tocar código ni rutas.

## 9. Dependencias

Esta rule depende de:

- `docs/_commons/rules/rules-01-document-authoring-standard.md`
- `docs/_commons/rules/rules-02-project-structure-and-addons.md`
- `docs/_commons/rules/rules-03-repository-file-placement.md`
- `docs/requirements/domain-index.md` (documento vivo que esta rule mantiene)

### Requirements relacionados

No aplica. Regla transversal de catalogación, no derivada de un requirement funcional específico — mismo tratamiento que `rules-01`, `rules-02` y `rules-03`.

## 10. Checklist de validación

- [ ] El dominio usado existe en la tabla de §4.1 (o se ha añadido antes de usarse)
- [ ] El REQ/carpeta/módulo nuevo tiene su fila correspondiente en `docs/requirements/domain-index.md`
- [ ] No se ha creado `docs/domains/` ni `src/domains/`
- [ ] Ninguna decisión de namespace pendiente (§8) se ha ejecutado sin confirmación explícita del usuario

## 11. Notas de control de cambios

Esta rule es transversal. Cambios en la tabla de dominios de §4.1 deben revisarse junto con `docs/requirements/domain-index.md`, `qa/README.md` (tabla de prefijos) y `docs/qa/TRACEABILITY-MATRIX.md` para mantener coherencia. En caso de conflicto entre esta rule y una práctica puntual del proyecto, prevalece esta rule salvo aprobación explícita de una excepción arquitectónica por el usuario.
