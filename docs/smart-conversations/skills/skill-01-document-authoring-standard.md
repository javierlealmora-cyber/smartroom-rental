# Skill — Estándar de Redacción de Documentos de Skills

## 1. Objetivo

Este documento define la estructura obligatoria, el idioma, el tono, el alcance y los criterios de calidad que debe cumplir cualquier documento markdown de tipo `skill` creado dentro de `/docs/smart-conversations/skills/`.

Su propósito es asegurar que todos los `skills` de SmartConversations sean consistentes, accionables y utilizables tanto por desarrolladores humanos como por agentes de codificación, sin invadir el espacio de `requirements`, `rules`, `contracts`, `tests` o `diagrams`.

## 2. Cuándo usar este skill

Este estándar debe usarse siempre que:

- se cree un nuevo fichero dentro de `/docs/smart-conversations/skills/`
- se rehaga de forma importante un `skill` existente
- se revise si un `skill` cumple el estándar documental del proyecto
- un agente genere documentación técnica de implementación para SmartConversations

Aplica a todos los ficheros ubicados en:

- `/docs/smart-conversations/skills/*.md`

Ejemplos:
- `skill-whatsapp-wasender-integration.md`
- `skill-webchat-gateway.md`
- `skill-n8n-conversation-engine.md`
- `skill-identity-validation.md`

## 3. Preconditions

Antes de redactar un `skill`, deben leerse como mínimo:

- Los `requirements` funcionales relevantes en `/docs/requirements/current/`
- `/docs/smart-conversations/rules/rules-01-document-authoring-standard.md`
- Los `rules` y `contracts` específicos del tema que el `skill` va a implementar

Un `skill` no debe redactarse sin conocer previamente los documentos de mayor precedencia que gobiernan su ámbito.

## 4. Restricciones de origen

Todo `skill` debe respetar estas restricciones:

- Un `skill` implementa o guía la implementación de decisiones ya fijadas por `requirements`, `rules` y `contracts`.
- Un `skill` no puede redefinir reglas de negocio.
- Un `skill` no puede introducir una arquitectura alternativa si ya existe una decisión cerrada.
- Un `skill` no puede sustituir un `contract`.
- Un `skill` no puede actuar como documento de testing formal.
- Un `skill` no puede convertirse en una narrativa arquitectónica general.

Orden de precedencia obligatorio:

0. `requirements` — fuente funcional superior; define qué debe cumplir el sistema
1. `rules` — decisiones de arquitectura y restricciones obligatorias
2. `contracts` — estructuras formales de datos e interfaces
3. `skills` — guías de implementación
4. `tests` — especificaciones de verificación
5. `diagrams` — representaciones visuales de apoyo

Si un `skill` contradice un `requirement`, una `rule` o un `contract`, el `skill` es inválido y debe corregirse.

## 5. Estrategia de implementación

Cuando se redacte un nuevo `skill`, debe seguirse esta estrategia:

### Paso 1 — Verificar que realmente es un `skill`

Debe ser un `skill` solo si el documento responde a la pregunta:

- "¿Cómo debe implementarse esto respetando las reglas y contratos existentes?"

Si el documento responde mejor a:
- "¿Qué capacidad o comportamiento funcional exige el negocio?" → es `requirement`
- "¿Qué está permitido o prohibido?" → es `rule`
- "¿Cuál es la estructura formal del dato o interfaz?" → es `contract`
- "¿Cómo se comprueba?" → es `test`
- "¿Cómo se visualiza?" → es `diagram`

### Paso 2 — Identificar las dependencias

Antes de escribir el contenido, deben localizarse:
- `requirements` relevantes en `/docs/requirements/current/`
- `rules` relevantes
- `contracts` relevantes
- otros `skills` relacionados
- tests o diagramas existentes si aportan contexto

### Paso 3 — Redactar solo guía de implementación

El contenido debe centrarse en:
- cómo implementar
- qué secuencia seguir
- qué errores evitar
- qué pruebas mínimas ejecutar
- qué datos o contratos intervienen

### Paso 4 — Validar consistencia

Antes de aceptar el `skill`, debe comprobarse:
- que no contradice documentos de mayor precedencia
- que no redefine payloads
- que no introduce estados nuevos
- que no añade permisos no definidos
- que no inventa campos que no existan en los `contracts`

## 6. Pasos recomendados

Todo autor de un `skill` debe seguir estos pasos:

### Paso 1 — Elegir el nombre correcto

Todos los ficheros `skills` deben seguir esta convención:

- `skill-topic-name.md`

Ejemplos:
- `skill-whatsapp-wasender-integration.md`
- `skill-data-model-and-state.md`

Se permite además este documento especial de estándar:
- `skill-01-document-authoring-standard.md`

### Paso 2 — Usar el idioma correcto

Los documentos de tipo `skills` deben redactarse obligatoriamente en español.

Reglas:
- La prosa explicativa debe estar en español.
- Las instrucciones prácticas deben estar en español.
- Las notas, errores comunes, escenarios y criterios de done deben estar en español.
- Los nombres técnicos pueden mantenerse en inglés cuando formen parte del diseño técnico real:
  - nombres de tablas
  - nombres de campos
  - payloads
  - enums
  - workflows
  - endpoints
  - nombres de EFs
  - nombres de clases o funciones

No debe traducirse un identificador técnico exacto si hacerlo rompe la trazabilidad técnica del sistema.

### Paso 3 — Respetar la estructura obligatoria

Todo fichero `skill` debe seguir exactamente este orden:

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

No se pueden omitir ni reordenar estas secciones.

### Paso 4 — Escribir con tono práctico

Un `skill` debe usar tono operativo y accionable.

Verbología esperada:
- implementar
- validar
- persistir
- no propagar
- rechazar cuando
- llamar a
- almacenar en
- construir
- devolver
- escalar
- comprobar

Un `skill` no debe sonar como:
- una reflexión abstracta
- un documento comercial
- una lluvia de ideas
- una política genérica sin pasos prácticos

## 7. Datos / contratos involucrados

Todo `skill` debe incluir una sección donde identifique claramente los datos, contratos o estructuras que intervienen.

Ejemplos válidos:
- tablas (`conv_sessions`, `conv_cases`)
- contratos (`CanonicalResponse`, `IdentityValidationResult`)
- enums
- campos relevantes
- dependencias con otros `skills`

Un `skill` no debe redefinir esos contratos: debe referenciarlos y usarlos.

## 8. Errores comunes

Todo `skill` debe enumerar errores comunes reales de implementación.

Ejemplos típicos:
- mezclar lógica de negocio con lógica de transporte
- propagar PII a n8n o a la IA
- saltarse una validación obligatoria
- actualizar estados desde el componente equivocado
- usar nombres de campos distintos a los definidos en `contracts`
- describir flujos incompatibles con `rules`

Errores especialmente prohibidos:
- redactar el `skill` en inglés
- redefinir payloads contractuales
- introducir pasos no acordados en la arquitectura
- usar un `skill` para cerrar decisiones que deberían vivir en `rules`

## 9. Qué no debe hacerse

Está prohibido que un `skill`:

- cambie decisiones cerradas por `requirements` o `rules`
- redefina contratos
- introduzca nuevos estados no documentados
- añada permisos o accesos no definidos
- actúe como documento de pruebas formal
- sustituya la fuente de verdad arquitectónica
- mezcle en el mismo fichero implementación y nuevas decisiones de diseño

## 10. Escenarios mínimos de prueba

Todo `skill` debe incluir escenarios mínimos de prueba suficientes para validar que la implementación descrita es verificable.

Estos escenarios:
- no sustituyen a los documentos formales de `tests` en `/docs/smart-conversations/tests/`
- sirven para comprobar la implementación mínima
- deben derivarse de `requirements`, `rules` y `contracts`

Cada escenario debe ser:
- concreto
- verificable
- trazable al comportamiento descrito
- útil para revisar una implementación real

## 11. Criterio de done

Un `skill` se considera válido solo si:

- está ubicado en `/docs/smart-conversations/skills/`
- su nombre sigue la convención adecuada
- está redactado en español
- respeta la estructura obligatoria
- referencia `requirements`, `rules` y `contracts` relevantes
- no contradice documentos de mayor precedencia
- es realmente accionable para implementar
- incluye errores comunes reales
- incluye escenarios mínimos de prueba
- define con claridad qué no debe hacerse

## 12. Documentos relacionados

Este estándar se relaciona con:

- `/docs/requirements/current/` — requirements funcionales que gobiernan SmartConversations
- `/docs/smart-conversations/rules/rules-01-document-authoring-standard.md`
- `/docs/smart-conversations/tests/` — documentos de test spec formales
- todos los ficheros bajo `/docs/smart-conversations/rules/*.md`
- todos los ficheros bajo `/docs/smart-conversations/contracts/*.md`
- todos los ficheros bajo `/docs/smart-conversations/skills/*.md`
- todos los ficheros bajo `/docs/smart-conversations/tests/*.md`
- todos los ficheros bajo `/docs/smart-conversations/diagrams/*.md`

### Requirements relacionados

- `REQ-SC-000-smart-conversations-capability.md`
- `REQ-SC-010-whatsapp-channel.md`
- `REQ-SC-020-whatsapp-channel-integration.md`
