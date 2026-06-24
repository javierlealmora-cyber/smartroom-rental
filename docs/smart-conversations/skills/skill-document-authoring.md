# Skill — Redacción de Documentación para SmartConversations

## 1. Objetivo

Este skill explica cómo crear nuevos documentos para SmartConversations de manera consistente con el modelo documental canónico.

Está pensado para desarrolladores humanos y agentes de codificación que deban generar nuevos `requirements`, `rules`, `contracts`, `skills`, `tests` o `diagrams`.

Este skill actúa como guía general de creación de cualquier tipo de documento SmartConversations. Para el estándar específico de los documentos de tipo `skill`, véase `skill-01-document-authoring-standard.md`.

## 2. Cuándo usar este skill

Usar este skill cuando se necesite:

- crear un nuevo documento `requirements` en `/docs/requirements/current/`
- crear un nuevo documento `rules`
- crear un nuevo documento `contracts`
- crear un nuevo documento `skills`
- crear un nuevo documento `tests` en `/docs/smart-conversations/tests/`
- crear un nuevo documento `diagrams`
- refactorizar o dividir un documento existente
- revisar si un documento generado cumple el estándar estructural

## 3. Preconditions

Antes de usar este skill, leer:

- Los `requirements` funcionales relevantes en `/docs/requirements/current/` — fuente funcional superior
- `/docs/smart-conversations/rules/rules-01-document-authoring-standard.md`
- `/docs/smart-conversations/contracts/contract-document-authoring-standard.md`
- `/docs/smart-conversations/diagrams/diagram-document-authoring-standard.md`

Además, leer los documentos de mayor precedencia que apliquen al tema que se va a documentar.

## 4. Restricciones de origen

Este skill debe respetar siempre:

- `requirements` tiene prioridad sobre todo lo demás — es la fuente funcional superior
- `rules` tiene prioridad sobre `contracts`
- `contracts` tiene prioridad sobre `skills`
- `skills` tiene prioridad sobre `tests`
- `tests` tiene prioridad sobre `diagrams`
- ningún documento puede contradecir una decisión ya cerrada en un `requirement` o una `rule`
- ningún documento puede reabrir una decisión de arquitectura ya fijada

### 4.1 Idioma obligatorio

Los documentos de tipo `rules` y `skills` deben redactarse en español.

Reglas de idioma:
- La prosa explicativa debe estar en español.
- Las instrucciones prácticas deben estar en español.
- Los ejemplos de negocio deben estar en español.
- Los nombres técnicos pueden mantenerse en inglés cuando formen parte del diseño técnico real:
  - `service_code`
  - `client_account_id`
  - `NormalizedMessage`
  - `identity_level`
  - `WF-10-CONVERSATION-ENGINE`

No debe traducirse:
- nombres de tablas
- nombres de campos
- nombres de payloads
- nombres de enums
- nombres de workflows
- nombres de endpoints

cuando hacerlo pudiera romper la trazabilidad técnica del sistema.

## 5. Estrategia de implementación

Cuando se cree un nuevo documento:

1. Identificar primero la categoría correcta:
   - ¿es un requisito funcional que el sistema debe cumplir? → `requirement` (en `/docs/requirements/current/`)
   - ¿es una decisión obligatoria de arquitectura o negocio? → `rule`
   - ¿es un payload, interfaz o esquema? → `contract`
   - ¿es una guía práctica de implementación? → `skill`
   - ¿es una especificación de verificación o escenario de prueba formal? → `test` (en `/docs/smart-conversations/tests/`)
   - ¿es apoyo visual? → `diagram`

2. Elegir el nombre correcto según la convención.

3. Aplicar la plantilla obligatoria de esa categoría.

4. Redactar el contenido usando el tono correcto.

5. Añadir dependencias relevantes.

6. Verificar que no contradice documentos de mayor precedencia.

## 6. Pasos recomendados

### Paso 1 — Determinar la categoría
No empezar a escribir hasta que la categoría sea inequívoca.

### Paso 2 — Verificar si el tema ya existe
Evitar documentos duplicados con alcance solapado.

### Paso 3 — Aplicar la plantilla correspondiente
Seguir exactamente el orden de secciones definido en los standards de authoring.

### Paso 4 — Escribir solo lo que pertenece a la categoría
Ejemplos:
- un `requirement` define qué debe hacer el sistema desde la perspectiva funcional del negocio
- una `rule` define lo que está permitido o prohibido en la implementación
- una `skill` explica cómo construirlo
- un `contract` define la forma de los datos
- un `test` especifica cómo verificar que el comportamiento es correcto

### Paso 5 — Añadir validaciones o ejemplos concretos
El documento debe servir para revisión, implementación o gobierno técnico.

### Paso 6 — Enlazar dependencias
Siempre mencionar `rules`, `contracts`, `skills` o `diagrams` relacionados.

### Paso 7 — Validar consistencia
Confirmar:
- que no contradice documentos de mayor precedencia
- que el tono es correcto
- que el nombre del fichero es correcto
- que el orden de secciones es correcto
- que el idioma es el exigido

## 7. Datos / contratos involucrados

Este skill no define payloads de negocio, pero depende de los contratos estructurales del sistema documental:

- estructura de documentos `rules`
- estructura de documentos `contracts`
- estructura de documentos `skills`
- estructura de documentos `diagrams`

## 8. Errores comunes

Evitar estos errores:

- redactar una `rule` como si fuera un tutorial
- redactar una `skill` que cambie restricciones de negocio
- crear un `contract` sin distinguir campos obligatorios y opcionales
- mezclar ejemplos y decisiones sin estructura
- usar encabezados inconsistentes
- inventar una convención distinta por documento
- olvidar dependencias
- redactar `rules` o `skills` en inglés cuando deben estar en español
- traducir nombres técnicos que deben permanecer exactos
- mezclar narrativa en inglés con reglas en español sin criterio

## 9. Qué no debe hacerse

No debe hacerse lo siguiente:

- crear un documento sin tener clara su categoría
- mezclar `rules`, `contracts` y `skills` en el mismo fichero
- cambiar una decisión cerrada dentro de una `skill`
- saltarse secciones obligatorias
- usar markdown libre cuando se espera un documento estructurado
- apoyarse en diagramas como única explicación de una lógica crítica
- crear documentos duplicados con alcance casi idéntico

## 10. Escenarios mínimos de prueba

Un nuevo documento debe pasar estas comprobaciones mínimas:

1. **Prueba de categoría**
   - ¿Está claro si es `rule`, `contract`, `skill` o `diagram`?

2. **Prueba de nombre**
   - ¿El fichero sigue la convención correcta?

3. **Prueba de estructura**
   - ¿Tiene todas las secciones obligatorias en el orden correcto?

4. **Prueba de consistencia**
   - ¿Respeta los documentos de mayor precedencia?

5. **Prueba de claridad**
   - ¿Otro desarrollador o agente podría usar este documento sin explicación adicional?

6. **Prueba de alcance**
   - ¿El documento cubre un único tema coherente?

7. **Prueba de idioma**
   - ¿Está redactado en español cuando su categoría lo exige?

## 11. Criterio de done

Un documento se considera correctamente redactado cuando:

- está en la carpeta correcta
- tiene el nombre correcto
- su estructura coincide con la plantilla de su categoría
- su tono coincide con su propósito
- no contradice documentos de mayor precedencia
- incluye criterios útiles de validación o revisión
- es suficientemente específico para implementarse o revisarse
- cumple la política de idioma aplicable

## 12. Documentos relacionados

- `/docs/requirements/current/` — requirements funcionales de SmartConversations
- `/docs/smart-conversations/rules/rules-01-document-authoring-standard.md`
- `/docs/smart-conversations/contracts/contract-document-authoring-standard.md`
- `/docs/smart-conversations/diagrams/diagram-document-authoring-standard.md`
- `/docs/smart-conversations/tests/` — test specs formales
- `skill-01-document-authoring-standard.md` — estándar específico para documentos de tipo `skill`
- todos los ficheros bajo `/docs/smart-conversations/rules/*.md`
- todos los ficheros bajo `/docs/smart-conversations/contracts/*.md`
- todos los ficheros bajo `/docs/smart-conversations/skills/*.md`
- todos los ficheros bajo `/docs/smart-conversations/tests/*.md`
- todos los ficheros bajo `/docs/smart-conversations/diagrams/*.md`

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`