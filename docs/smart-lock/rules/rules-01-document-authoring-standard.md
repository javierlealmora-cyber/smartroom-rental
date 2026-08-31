# rules-01-document-authoring-standard.md — Estándar de Redacción de Documentos SmartLock

## 1. Propósito

Esta regla define la estructura obligatoria, las convenciones de nombres, el tono, el idioma y los criterios de validación que debe cumplir cualquier documento creado dentro de `/docs/smart-lock/`.

Su objetivo es asegurar que toda la documentación de SmartLock sea consistente, revisable y legible tanto por personas como por agentes de codificación.

Esta regla es una especialización del estándar global definido en `/docs/_commons/rules/rules-01-document-authoring-standard.md`. No lo sustituye ni lo contradice; únicamente aplica sus reglas al contexto concreto de este módulo. En caso de conflicto entre esta regla y el estándar global, prevalece siempre el estándar global.

Los requirements funcionales (`REQ-SL-*`, ubicados en `/docs/requirements/current/`) son la fuente funcional superior de este módulo. Las cinco categorías documentales (`rules`, `contracts`, `skills`, `tests`, `diagrams`) no sustituyen a los requirements; los desarrollan de forma normativa, contractual, operativa, verificable o visual respectivamente.

## 2. Alcance

Esta regla aplica a todos los documentos markdown creados dentro de:

- `/docs/smart-lock/rules/`
- `/docs/smart-lock/contracts/`
- `/docs/smart-lock/skills/`
- `/docs/smart-lock/tests/`
- `/docs/smart-lock/diagrams/`

Esta regla no aplica al formato de los requirements funcionales en `/docs/requirements/current/`, que siguen su propio formato descrito en `docs/requirements/README.md`. Sí exige que los documentos de las cinco categorías referencien los requirements de los que dependen.

## 3. Decisiones No Negociables

1. Todo documento debe pertenecer exactamente a una de estas categorías: `rules`, `contracts`, `skills`, `tests`, `diagrams`.
2. Todo documento debe respetar la estructura obligatoria de su categoría (idéntica a la definida en el estándar global, sección 4.4–4.8).
3. El orden de precedencia es siempre: `rules` > `contracts` > `skills` > `tests` > `diagrams`.
4. Ninguna `skill` puede contradecir una `rule`.
5. Ningún `test` puede redefinir una regla ni alterar un contrato.
6. Ningún `diagram` puede contradecir un `contract`.
7. Todos los documentos de tipo `rules`, `skills` y `tests` deben redactarse en español.
8. Los documentos `contracts` y `diagrams` deben redactarse preferiblemente en español en sus secciones explicativas.
9. Los requirements funcionales (`REQ-SL-*`) tienen precedencia funcional sobre las cinco categorías documentales.

## 4. Reglas Obligatorias

### 4.1 Convención de nombres

- `rules-XX-topic-name.md`
- `contract-topic-name.md`
- `skill-topic-name.md`
- `test-topic-name-spec.md`
- `diagram-topic-name.md`

Ejemplos:
- `rules-40-ttlock-cloud-provider.md`
- `contract-lock-provider-interface.md`
- `skill-implement-ble-provider.md`
- `test-core-isolation-spec.md`
- `diagram-three-layer-architecture.md`

### 4.2 Idioma y tono

Idéntico al estándar global (sección 4.2): prosa en español; identificadores técnicos, nombres de tablas, campos JSON y endpoints pueden mantenerse en inglés cuando forman parte del diseño técnico real (ej. `lock_integrations`, `ILockProvider`, `provider_lock_id`).

### 4.3 Límites entre categorías

Idénticos al estándar global: una `rule` no es un tutorial; una `skill` no redefine arquitectura; un `contract` no contiene guía de proceso; un `test` no fija reglas nuevas; un `diagram` no es la fuente principal de verdad.

### 4.4 Estructura obligatoria para `rules`

1. `# <Título>`
2. `## 1. Propósito`
3. `## 2. Alcance`
4. `## 3. Decisiones no negociables`
5. `## 4. Reglas obligatorias`
6. `## 5. Casos permitidos`
7. `## 6. Casos prohibidos`
8. `## 7. Impacto en diseño`
9. `## 8. Impacto en implementación`
10. `## 9. Dependencias` (con subsección obligatoria `### Requirements relacionados`)
11. `## 10. Checklist de validación`
12. `## 11. Notas de control de cambios`

Todo documento general del módulo debe citar como mínimo `REQ-SL-000-smart-lock-capability.md`.

### 4.5 Estructura obligatoria para `skills`

1. `# <Título>`
2. `## 1. Objetivo`
3. `## 2. Cuándo usar este skill`
4. `## 3. Preconditions`
5. `## 4. Restricciones de origen`
6. `## 5. Estrategia de implementación`
7. `## 6. Pasos recomendados`
8. `## 7. Datos / contratos involucrados`
9. `## 8. Errores comunes`
10. `## 9. Qué no debe hacerse`
11. `## 10. Escenarios mínimos de prueba`
12. `## 11. Criterio de done`
13. `## 12. Documentos relacionados` (con subsección `### Requirements relacionados`)

### 4.6 Estructura obligatoria para `contracts`

1. `# <Título>`
2. `## 1. Propósito`
3. `## 2. Cuándo se usa`
4. `## 3. Productor`
5. `## 4. Consumidor`
6. `## 5. Estructura`
7. `## 6. Campos obligatorios`
8. `## 7. Campos opcionales`
9. `## 8. Reglas de validación`
10. `## 9. Ejemplos válidos`
11. `## 10. Ejemplos inválidos`
12. `## 11. Notas de versionado`
13. `## 12. Requirements relacionados`

### 4.7 Estructura obligatoria para `tests`

1. `# <Título>`
2. `## 1. Objetivo`
3. `## 2. Alcance`
4. `## 3. Reglas y contratos cubiertos`
5. `## 4. Precondiciones`
6. `## 5. Escenarios de prueba`
7. `## 6. Resultados esperados`
8. `## 7. Casos negativos`
9. `## 8. Datos de prueba`
10. `## 9. Criterio de aceptación`
11. `## 10. Dependencias`

### 4.8 Estructura obligatoria para `diagrams`

1. `# <Título>`
2. `## 1. Propósito`
3. `## 2. Alcance`
4. `## 3. Diagrama`
5. `## 4. Notas de lectura`
6. `## 5. Dependencias`
7. `## 6. Limitaciones`

## 5. Casos Permitidos

- Añadir documentos nuevos respetando la plantilla de su categoría.
- Refinar un documento existente sin cambiar su categoría.
- Dividir un documento grande en varios más pequeños si el alcance crece.
- Citar más de un `REQ-SL-*` cuando el documento cubre varias capacidades del módulo.

## 6. Casos Prohibidos

- Mezclar reglas e implementación en un mismo fichero.
- Crear estructuras ad hoc que ignoren la plantilla estándar.
- Escribir una `skill` que cambie reglas de negocio ya fijadas por una `rule`.
- Crear ficheros con nombres inconsistentes.
- Omitir la subsección `Requirements relacionados` en un documento general del módulo.
- Publicar cualquier documento que contradiga `REQ-SL-000-smart-lock-capability.md`.

## 7. Impacto en Diseño

Este estándar asegura que toda la documentación de SmartLock pueda leerse, revisarse y trazarse de forma consistente, y que las decisiones arquitectónicas permanezcan estables durante la implementación.

## 8. Impacto en Implementación

Cualquier documentación nueva de SmartLock debe validarse contra esta regla antes de integrarse como documentación oficial. Un documento que no siga esta estructura se considera incompleto.

## 9. Dependencias

Esta regla depende de:
- `/docs/_commons/rules/rules-01-document-authoring-standard.md` — estándar global (fuente de verdad).
- La estructura de carpetas bajo `/docs/smart-lock/`.

Documentos relacionados: todos los ficheros bajo `/docs/smart-lock/{rules,contracts,skills,tests,diagrams}/*.md`.

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`

## 10. Checklist de Validación

- [ ] El fichero está en la carpeta correcta.
- [ ] El nombre sigue la convención adecuada.
- [ ] Se respeta el orden obligatorio de secciones.
- [ ] El tono coincide con la categoría del documento.
- [ ] No contradice documentos de mayor precedencia ni el requirement del que depende.
- [ ] Incluye la subsección `Requirements relacionados` cuando aplica.

## 11. Notas de Control de Cambios

Si el estándar global en `/docs/_commons/rules/rules-01-document-authoring-standard.md` se modifica, esta regla debe revisarse para mantener coherencia. En caso de conflicto no resuelto, prevalece el estándar global.
