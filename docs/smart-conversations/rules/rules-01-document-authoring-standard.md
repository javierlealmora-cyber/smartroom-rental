# Rules — Estándar de Redacción de Documentos

## 1. Propósito

Esta regla define la estructura obligatoria, las convenciones de nombres, el tono, el idioma y los criterios de validación que debe cumplir cualquier documento creado dentro de `/docs/smart-conversations/`.

Su objetivo es asegurar que toda la documentación de SmartConversations sea consistente, revisable y legible tanto por personas como por agentes de codificación como Claude, Devin y Cascade.

Esta regla es una especialización del estándar global definido en `/docs/_commons/rules/rules-01-document-authoring-standard.md`. No lo sustituye ni lo contradice; únicamente aplica sus reglas al contexto concreto de este módulo. En caso de conflicto entre esta regla y el estándar global, prevalece siempre el estándar global.

Los requirements funcionales (`REQ-SC-*`, ubicados en `/docs/requirements/current/`) son la fuente funcional superior de este módulo: definen qué capacidad, canal o servicio debe existir y por qué. Las cinco categorías documentales de este módulo (`rules`, `contracts`, `skills`, `tests`, `diagrams`) no sustituyen a los requirements; los desarrollan de forma normativa, contractual, operativa, verificable o visual respectivamente. Ningún documento de estas cinco categorías puede contradecir un requirement vigente.

## 2. Alcance

Esta regla aplica a todos los documentos markdown creados dentro de:

- `/docs/smart-conversations/rules/`
- `/docs/smart-conversations/contracts/`
- `/docs/smart-conversations/skills/`
- `/docs/smart-conversations/tests/`
- `/docs/smart-conversations/diagrams/`

Esta regla no aplica al formato de los requirements funcionales en `/docs/requirements/current/`, que tienen su propio formato y ciclo de vida documentados en `docs/requirements/README.md`. Sí exige, en cambio, que los documentos de las cinco categorías anteriores referencien los requirements de los que dependen (véase Sección 4.4).

Aplica tanto a:
- nuevos documentos
- reescrituras importantes de documentos existentes

## 3. Decisiones no negociables

1. Todo documento debe pertenecer exactamente a una de estas categorías:
   - `rules`
   - `contracts`
   - `skills`
   - `tests`
   - `diagrams`

2. Todo documento debe respetar la estructura obligatoria de su categoría.

3. Las `rules` definen restricciones obligatorias.
4. Los `contracts` definen interfaces formales y esquemas.
5. Las `skills` definen guías de implementación.
6. Los `tests` definen escenarios verificables derivados de `rules` y `contracts`.
7. Los `diagrams` son material explicativo.

8. El orden de precedencia es siempre:
   1. `rules`
   2. `contracts`
   3. `skills`
   4. `tests`
   5. `diagrams`

9. Ninguna `skill` puede contradecir una `rule`.
10. Ningún `test` puede redefinir una regla ni alterar un contrato.
11. Ningún `diagram` puede contradecir un `contract`.
12. Ningún documento puede reabrir una decisión ya fijada por un documento de mayor precedencia.
13. Todos los documentos de tipo `rules`, `skills` y `tests` deben redactarse en español.
14. Los documentos `contracts` y `diagrams` deben redactarse preferiblemente en español en sus secciones explicativas.
15. Los requirements funcionales (`REQ-SC-*`) tienen precedencia funcional sobre las cinco categorías documentales: ninguna `rule`, `contract`, `skill`, `test` ni `diagram` puede contradecir un requirement vigente. Esta regla no redefine el formato de los requirements; solo fija la obligación de coherencia.

## 4. Reglas obligatorias

### 4.1 Convención de nombres

Los documentos deben usar estas convenciones:

- `rules-XX-topic-name.md`
- `contract-topic-name.md`
- `skill-topic-name.md`
- `test-topic-name.md`
- `diagram-topic-name.md`

Ejemplos:
- `rules-30-whatsapp-channel.md`
- `rules-40-identity-validation.md`
- `contract-normalized-message.md`
- `skill-n8n-conversation-engine.md`
- `test-activity-log-spec.md`

### 4.2 Idioma y tono

Todos los documentos de tipo `rules`, `skills` y `tests` deben estar redactados en español de forma obligatoria.

Reglas:
- El contenido explicativo y normativo debe escribirse en español.
- Los ejemplos narrativos, checklists, notas y aclaraciones deben escribirse en español.
- Los nombres técnicos, identificadores, nombres de tablas, nombres de endpoints, nombres de workflows, nombres de enums, nombres de campos JSON y nombres de ficheros pueden mantenerse en inglés cuando sean parte del diseño técnico real.
- No debe mezclarse español e inglés dentro de la prosa explicativa salvo cuando sea necesario para referenciar un identificador técnico exacto.

Las `rules` deben usar tono normativo:
- Debe
- No debe
- Siempre
- Nunca
- Solo si
- Se considera inválido cuando

Las `skills` deben usar tono práctico y orientado a implementación:
- Implementar
- Validar
- Persistir
- No propagar
- Probar con
- Rechazar cuando

Los `tests` deben usar tono verificable:
- Se considera válido cuando
- Se considera inválido cuando
- Debe verificarse que
- Precondición
- Resultado esperado

Los `contracts` pueden mantener:
- nombres de campos
- ejemplos JSON
- enums
- payloads

pero su explicación debe estar en español.

Los `diagrams` deben tener sus notas y secciones explicativas en español.

### 4.3 Límites entre categorías

Una `rule` no debe convertirse en un tutorial.

Una `skill` no debe redefinir arquitectura ni política de negocio.

Un `contract` no debe contener guía de proceso que pertenezca a una `skill`.

Un `test` no debe redefinir arquitectura ni fijar reglas nuevas; solo verifica lo ya definido en `rules` y `contracts`.

Un `diagram` no debe tratarse como la fuente principal de verdad cuando existan `rules` o `contracts`.

### 4.4 Estructura obligatoria para `rules`

Todo fichero `rules` debe contener estas secciones en este orden exacto:

1. `# <Título>`
2. `## 1. Propósito`
3. `## 2. Alcance`
4. `## 3. Decisiones no negociables`
5. `## 4. Reglas obligatorias`
6. `## 5. Casos permitidos`
7. `## 6. Casos prohibidos`
8. `## 7. Impacto en diseño`
9. `## 8. Impacto en implementación`
10. `## 9. Dependencias`
11. `## 10. Checklist de validación`
12. `## 11. Notas de control de cambios`

La Sección `## 9. Dependencias` debe incluir, como subsección obligatoria, `### Requirements relacionados`, listando los `REQ-SC-*` de los que depende el documento. Como mínimo, todo documento general del módulo debe citar `REQ-SC-000-smart-conversations-capability.md`.

### 4.5 Estructura obligatoria para `skills`

Todo fichero `skills` debe contener estas secciones en este orden exacto:

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
13. `## 12. Documentos relacionados`

La Sección `## 12. Documentos relacionados` debe incluir, como subsección obligatoria, `### Requirements relacionados`, listando los `REQ-SC-*` de los que depende el skill.

### 4.6 Estructura obligatoria para `contracts`

Todo fichero `contracts` debe contener estas secciones en este orden exacto:

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

La Sección `## 12. Requirements relacionados` es obligatoria y lista los `REQ-SC-*` de los que depende el contrato.

### 4.7 Estructura obligatoria para `tests`

Todo fichero `tests` debe contener estas secciones en este orden exacto:

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

La Sección `## 10. Dependencias` debe incluir, cuando proceda, los `REQ-SC-*` a los que se traza el documento, especialmente cuando el test cubre un servicio funcional completo (incidents, advertisement, help) en lugar de una sola `rule` o `contract`.

### 4.8 Estructura obligatoria para `diagrams`

Todo fichero `diagrams` debe contener:

1. `# <Título>`
2. `## 1. Propósito`
3. `## 2. Alcance`
4. `## 3. Diagrama`
5. `## 4. Notas de lectura`
6. `## 5. Dependencias`
7. `## 6. Limitaciones`

### 4.9 Diferencia entre requirements y las cinco categorías documentales

| Tipo de documento | Pregunta que responde | Ubicación |
|---|---|---|
| `requirement` (`REQ-SC-*`) | ¿Qué capacidad, canal, servicio o integración debe existir, para quién y por qué? | `/docs/requirements/current/` |
| `rules` | ¿Qué debe cumplirse obligatoriamente para que ese requirement se respete? | `/docs/smart-conversations/rules/` |
| `contracts` | ¿Cuál es la forma exacta del dato o la interfaz que implementa esa regla? | `/docs/smart-conversations/contracts/` |
| `skills` | ¿Cómo debe implementarse esto respetando las rules y los contracts existentes? | `/docs/smart-conversations/skills/` |
| `tests` | ¿Cómo se verifica que la implementación cumple las rules, los contracts y el requirement original? | `/docs/smart-conversations/tests/` |
| `diagrams` | ¿Cómo se visualiza esto de forma resumida? | `/docs/smart-conversations/diagrams/` |

Un requirement no es una categoría documental de este módulo: es la fuente funcional de la que derivan las cinco categorías. Por eso un requirement no sigue las plantillas de la Sección 4.4–4.8, sino el formato propio definido en `docs/requirements/README.md`.

## 5. Casos permitidos

Se permite:
- añadir documentos nuevos respetando la plantilla de su categoría
- refinar un documento existente sin cambiar su categoría
- añadir ejemplos, checklists y criterios de validación
- dividir un documento grande en varios más pequeños si el alcance crece, manteniendo una nomenclatura consistente
- citar más de un `REQ-SC-*` en `Requirements relacionados` cuando el documento cubre varios servicios o integraciones

## 6. Casos prohibidos

Está prohibido:
- mezclar reglas e implementación en un mismo fichero
- crear estructuras ad hoc que ignoren la plantilla estándar
- escribir una `skill` que cambie reglas de negocio
- escribir una `rule` como una narrativa vaga sin restricciones explícitas
- crear ficheros con nombres inconsistentes
- introducir una nueva alternativa arquitectónica en una `skill` cuando una `rule` ya ha cerrado la decisión
- usar diagramas como única documentación de una interacción crítica
- escribir un `test` que fije una regla nueva en lugar de verificar una ya existente
- publicar cualquier documento de las cinco categorías que contradiga un requirement vigente
- omitir la subsección `Requirements relacionados` en un documento general del módulo

## 7. Impacto en diseño

Este estándar asegura que:
- todos los agentes técnicos lean los documentos de forma consistente
- la documentación pueda analizarse con secciones predecibles
- la revisión técnica y de arquitectura sea más simple
- las decisiones arquitectónicas se mantengan estables durante la implementación
- cualquier documento técnico pueda trazarse hacia el requirement funcional que lo origina

## 8. Impacto en implementación

Cualquier documentación nueva creada para SmartConversations debe validarse contra esta regla antes de integrarse en el conjunto canónico.

Un documento que no siga esta estructura se considera incompleto.

Un fichero generado automáticamente debe corregirse antes de aceptarse como documentación oficial.

## 9. Dependencias

Esta regla depende de:
- `/docs/_commons/rules/rules-01-document-authoring-standard.md` — estándar global (fuente de verdad); esta regla lo hereda y lo especializa sin modificarlo
- la estructura de carpetas bajo `/docs/smart-conversations/`
- el modelo de precedencia entre `rules`, `contracts`, `skills`, `tests` y `diagrams`

Documentos relacionados:
- todos los ficheros bajo `/docs/smart-conversations/rules/*.md`
- todos los ficheros bajo `/docs/smart-conversations/contracts/*.md`
- todos los ficheros bajo `/docs/smart-conversations/skills/*.md`
- todos los ficheros bajo `/docs/smart-conversations/tests/*.md`
- todos los ficheros bajo `/docs/smart-conversations/diagrams/*.md`

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`

## 10. Checklist de validación

Antes de aceptar un nuevo documento, verificar:

- [ ] El fichero está en la carpeta correcta
- [ ] El nombre sigue la convención adecuada
- [ ] La categoría del documento está clara
- [ ] Se respeta el orden obligatorio de secciones
- [ ] El tono coincide con la categoría del documento
- [ ] No contradice documentos de mayor precedencia ni el requirement del que depende
- [ ] Incluye dependencias y criterios de validación
- [ ] Es suficientemente específico para guiar revisión o implementación
- [ ] Si es `rules`, `skills` o `tests`, está redactado en español
- [ ] Si es `contract` o `diagram`, sus secciones explicativas están en español
- [ ] Si es `rules`, `skills` o `contracts`, incluye la subsección `Requirements relacionados` con al menos un `REQ-SC-*`

## 11. Notas de control de cambios

Cualquier cambio en este estándar afecta a toda la documentación futura de SmartConversations.

Los cambios deben ser poco frecuentes y revisarse con cuidado, porque redefinen cómo se produce toda la documentación nueva del sistema.

Si el estándar global en `/docs/_commons/rules/rules-01-document-authoring-standard.md` se modifica, esta regla debe revisarse para mantener coherencia. En caso de conflicto no resuelto, prevalece el estándar global.
