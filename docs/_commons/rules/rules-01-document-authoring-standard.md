# Rule — Estándar Global de Redacción Documental

## 1. Propósito

Esta rule define el estándar único de redacción, clasificación, precedencia, nomenclatura, idioma y validación de toda la documentación funcional y técnica del repositorio.

Su objetivo es asegurar que cualquier documento markdown del proyecto sea:

- consistente
- revisable
- trazable
- comprensible por humanos
- interpretable de forma uniforme por agentes de codificación y revisión

Esta rule es global y transversal. No pertenece a un módulo funcional concreto. Aplica por igual a cualquier dominio del sistema, incluyendo, entre otros:

- SmartConversations
- SmartIncidents
- SmartPublications
- módulos futuros del producto

## 2. Alcance

Esta rule aplica a cualquier documento markdown de carácter funcional, técnico, contractual, operativo o visual que forme parte de la documentación estructurada del repositorio.

Aplica a documentos ubicados bajo rutas como:

- `/docs/**/rules/*.md`
- `/docs/**/contracts/*.md`
- `/docs/**/skills/*.md`
- `/docs/**/tests/*.md`
- `/docs/**/diagrams/*.md`

También aplica a cualquier nueva estructura documental equivalente que siga este modelo en el futuro.

Esta rule no aplica a:

- notas personales informales
- borradores no canónicos fuera del árbol documental estructurado
- documentación temporal de trabajo que no vaya a tratarse como fuente de verdad

## 3. Decisiones no negociables

1. Toda documentación canónica debe pertenecer exactamente a una de estas categorías:
   - `rules`
   - `contracts`
   - `skills`
   - `tests`
   - `diagrams`

2. Todo documento debe respetar la plantilla estructural obligatoria de su categoría.

3. El orden de precedencia obligatorio entre categorías es:
   1. `rules`
   2. `contracts`
   3. `skills`
   4. `tests`
   5. `diagrams`

4. Un documento de menor precedencia no puede contradecir uno de mayor precedencia.

5. Un documento no puede mezclar categorías.

6. Los documentos de tipo `rules`, `skills` y `tests` deben redactarse en español.

7. Los documentos de tipo `contracts` deben explicarse en español, aunque sus identificadores técnicos pueden mantenerse en inglés.

8. Los documentos de tipo `diagrams` deben tener sus secciones explicativas en español.

9. No debe traducirse un identificador técnico exacto si hacerlo rompe la trazabilidad técnica del sistema.

10. Ningún documento puede reabrir una decisión ya cerrada por una `rule`.

11. Los módulos funcionales no pueden redefinir este estándar global. Como máximo pueden referenciarlo y especializar reglas de su propio dominio.

## 4. Reglas obligatorias

### 4.1 Clasificación documental

Toda documentación canónica debe pertenecer a una sola categoría documental.

#### `rules`

Definen:

- restricciones obligatorias
- decisiones no negociables
- límites funcionales
- reglas arquitectónicas
- comportamientos permitidos y prohibidos

Una `rule` responde a la pregunta:

**“¿Qué debe cumplirse obligatoriamente?”**

#### `contracts`

Definen:

- payloads
- estructuras formales
- interfaces
- enums
- máquinas de estados
- validaciones de datos
- compatibilidad y versionado

Un `contract` responde a la pregunta:

**“¿Cuál es la forma exacta del dato o interfaz?”**

#### `skills`

Definen:

- guías de implementación
- pasos prácticos
- recomendaciones operativas
- errores comunes
- criterios mínimos de ejecución

Un `skill` responde a la pregunta:

**“¿Cómo debe implementarse esto respetando las rules y contracts existentes?”**

#### `tests`

Definen:

- especificaciones de prueba
- escenarios
- precondiciones
- resultados esperados
- casos negativos
- criterios de aceptación

Un documento `tests` responde a la pregunta:

**“¿Cómo se verifica que esto cumple las rules, contracts y expectativas funcionales?”**

#### `diagrams`

Definen:

- representaciones visuales
- flujos
- secuencias
- mapas de contexto
- esquemas de relaciones

Un `diagram` responde a la pregunta:

**“¿Cómo se visualiza esto de forma resumida?”**

### 4.2 Convención de nombres

Todos los documentos deben seguir una convención de nombres homogénea.

#### Reglas

- `rules-XX-topic-name.md`
- `contract-topic-name.md`
- `skill-topic-name.md`
- `test-topic-name.md`
- `diagram-topic-name.md`

#### Ejemplos válidos

- `rules-00-scope-and-principles.md`
- `rules-40-identity-validation.md`
- `contract-normalized-message.md`
- `skill-webchat-gateway.md`
- `test-activity-log-spec.md`
- `diagram-system-context.md`

#### Reglas adicionales

- usar minúsculas
- usar guiones `-` como separadores
- no usar espacios
- no usar nombres ambiguos
- el tema debe describir claramente el contenido

#### Numeración de `rules`

Solo los documentos de tipo `rules` usan prefijo numérico obligatorio porque expresan orden lógico y jerarquía de decisiones.

### 4.3 Política de idioma

La política de idioma es única para todo el repositorio.

#### Reglas generales

- Los documentos `rules` deben redactarse en español.
- Los documentos `skills` deben redactarse en español.
- Los documentos `tests` deben redactarse en español.
- Los documentos `contracts` deben explicarse en español.
- Los documentos `diagrams` deben tener sus secciones explicativas en español.

#### Identificadores técnicos

Se permite mantener en inglés:

- nombres de tablas
- nombres de campos
- payloads
- enums
- endpoints
- workflows
- Edge Functions
- nombres de clases o funciones
- nombres de servicios o códigos de servicio

#### Regla de no traducción

No debe traducirse un identificador técnico exacto si hacerlo rompe la trazabilidad técnica del sistema.

Ejemplos:

- `client_account_id`
- `conv_sessions`
- `identity_level`
- `WF-20-INCIDENCIA`
- `conv-core-create-incident`

### 4.4 Plantilla obligatoria para `rules`

Todo documento `rules` debe seguir exactamente este orden:

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

La sección `## 9. Dependencias` debe incluir, como subsección obligatoria, `### Requirements relacionados`, listando los requirements funcionales (`REQ-*`) de los que depende el documento. Como mínimo, todo documento general del módulo debe citar el requirement de tipo `capability` del que deriva.

### 4.5 Plantilla obligatoria para `contracts`

Todo documento `contracts` debe seguir exactamente este orden:

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

La sección `## 12. Requirements relacionados` es obligatoria y lista los requirements funcionales (`REQ-*`) de los que depende el contrato.

### 4.6 Plantilla obligatoria para `skills`

Todo documento `skills` debe seguir exactamente este orden:

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

La sección `## 12. Documentos relacionados` debe incluir, como subsección obligatoria, `### Requirements relacionados`, listando los requirements funcionales (`REQ-*`) de los que depende el skill.

### 4.7 Plantilla obligatoria para `tests`

Todo documento `tests` debe seguir exactamente este orden:

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

### 4.8 Plantilla obligatoria para `diagrams`

Todo documento `diagrams` debe seguir exactamente este orden:

1. `# <Título>`
2. `## 1. Propósito`
3. `## 2. Alcance`
4. `## 3. Diagrama`
5. `## 4. Notas de lectura`
6. `## 5. Dependencias`
7. `## 6. Limitaciones`

### 4.9 Reglas transversales de redacción

Estas reglas aplican a cualquier categoría.

#### No reabrir decisiones cerradas

Si una decisión ya está fijada en documentación de mayor precedencia:

- no debe reabrirse
- no debe proponerse una alternativa dentro de un documento de menor precedencia
- no debe reinterpretarse de forma incompatible

#### No inventar arquitectura fuera de `rules`

Las decisiones arquitectónicas o funcionales obligatorias deben vivir en `rules`.

#### No redefinir contratos fuera de `contracts`

Los payloads, enums, estructuras, estados y validaciones formales deben vivir en `contracts`.

#### No usar `tests` para decidir diseño

Los documentos de `tests` verifican el diseño existente. No deben utilizarse para fijar reglas nuevas.

#### No usar `diagrams` como fuente principal de verdad

Los diagramas son material de apoyo. Nunca deben sustituir un `rule` o un `contract`.

#### Coherencia terminológica

Todos los documentos deben usar la misma terminología para:

- entidades
- estados
- campos
- actores
- servicios
- eventos
- identificadores

## 5. Casos permitidos

Se permite:

- crear documentación canónica bajo una categoría única y clara
- referenciar documentos de mayor precedencia
- especializar reglas dentro de un módulo funcional sin redefinir el estándar global
- mantener identificadores técnicos en inglés
- crear nuevos documentos si respetan naming, idioma, precedencia y plantilla
- usar diagramas como apoyo visual
- usar tests como especificación verificable derivada de rules y contracts

## 6. Casos prohibidos

Está prohibido:

- mezclar varias categorías en un mismo documento
- contradecir una `rule` desde un `contract`, `skill`, `test` o `diagram`
- redefinir payloads o estados fuera de `contracts`
- introducir arquitectura nueva en `skills`, `tests` o `diagrams`
- reabrir decisiones cerradas
- usar documentación libre ignorando las plantillas obligatorias
- redactar `rules`, `skills` o `tests` en inglés
- usar diagrams como única documentación de un flujo crítico

## 7. Impacto en diseño

Esta rule obliga a que el diseño documental del proyecto sea:

- predecible
- modular
- trazable
- compatible con revisión humana y generación asistida por IA

También asegura que cada documento tenga una función clara y que las decisiones importantes vivan en la capa correcta.

## 8. Impacto en implementación

Cualquier nuevo documento generado por personas o agentes debe validarse contra esta rule antes de aceptarse como documentación canónica.

Esto afecta a:

- prompts de Claude
- prompts de Devin
- prompts de Cascade
- revisiones manuales
- creación de nueva documentación de módulo

Si un documento no cumple esta rule, debe corregirse antes de considerarse fuente de verdad.

## 9. Dependencias

Esta rule depende de:

- la estructura documental general del repositorio
- la organización por categorías documentales
- las carpetas comunes bajo `/docs/_commons/`
- las carpetas funcionales bajo `/docs/<module-name>/`

Documentos relacionados:

- cualquier documentación específica de módulo bajo `/docs/**/`
- futuras rules globales en `/docs/_commons/rules/`

## 10. Checklist de validación

Antes de aceptar cualquier documento nuevo, verificar:

- [ ] El documento pertenece a una sola categoría documental
- [ ] Está ubicado en la carpeta correcta
- [ ] El nombre sigue la convención correspondiente
- [ ] Se respeta el idioma exigido
- [ ] Se mantiene la trazabilidad de nombres técnicos
- [ ] No contradice documentos de mayor precedencia
- [ ] Usa la plantilla correcta de su categoría
- [ ] Tiene alcance claro
- [ ] Es coherente con la terminología existente
- [ ] Es suficientemente específico para revisión o implementación

### Checklist específico por categoría

#### `rules`

- [ ] Define decisiones no negociables
- [ ] Distingue casos permitidos y prohibidos
- [ ] Usa tono normativo
- [ ] No actúa como tutorial
- [ ] No redefine contracts

#### `contracts`

- [ ] La estructura formal está clara
- [ ] Los campos obligatorios están identificados
- [ ] Los campos opcionales están identificados
- [ ] Las validaciones son explícitas
- [ ] Incluye ejemplos válidos e inválidos
- [ ] Incluye versionado

#### `skills`

- [ ] Es accionable
- [ ] Está en español
- [ ] Referencia rules y contracts relevantes
- [ ] No redefine diseño ni contracts
- [ ] Incluye errores comunes
- [ ] Incluye criterio de done

#### `tests`

- [ ] Cubre rules y contracts concretos
- [ ] Define precondiciones
- [ ] Define escenarios y resultados esperados
- [ ] Incluye casos negativos
- [ ] Incluye criterio de aceptación

#### `diagrams`

- [ ] Incluye un diagrama real
- [ ] Las notas de lectura están claras
- [ ] Las dependencias están referenciadas
- [ ] Las limitaciones son explícitas
- [ ] No introduce reglas nuevas

## 11. Notas de control de cambios

Esta rule es única y global para todo el repositorio.

Cualquier cambio en este documento afecta a:

- la redacción futura de `rules`
- la redacción futura de `contracts`
- la redacción futura de `skills`
- la redacción futura de `tests`
- la redacción futura de `diagrams`

### Regla de modificación

Los cambios en esta rule deben ser:

- poco frecuentes
- deliberados
- revisados cuidadosamente
- compatibles con la documentación ya existente o acompañados de plan de migración documental

### Regla de impacto

Si se cambia la estructura obligatoria de una categoría, debe evaluarse:

- si los documentos existentes deben adaptarse
- si hay prompts de Claude/Devin/Cascade que deben actualizarse
- si las revisiones automáticas del repositorio deben cambiar

### Relación con documentación específica de módulo

Los módulos funcionales pueden tener documentación propia bajo rutas como:

- `/docs/smart-conversations/`
- `/docs/smart-incidents/`
- `/docs/smart-publications/`

Pero esos módulos no pueden redefinir esta rule global.

Si un documento específico de módulo entra en conflicto con esta rule en materia de:

- clasificación documental
- idioma
- nomenclatura
- precedencia
- plantillas estructurales
- reglas transversales de redacción

prevalece siempre esta rule global.