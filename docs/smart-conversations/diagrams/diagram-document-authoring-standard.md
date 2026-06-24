# Diagram — Estándar de Redacción de Documentos de Diagramas

## 1. Propósito

Este documento define la estructura obligatoria, la semántica y las reglas de uso para cualquier documento markdown de tipo diagrama creado dentro de `/docs/smart-conversations/diagrams/`.

Su objetivo es asegurar que los diagramas sean consistentes, legibles y útiles como apoyo visual de SmartConversations sin convertirse en la fuente principal de verdad frente a `rules` o `contracts`.

## 2. Alcance

Este estándar aplica a todos los ficheros ubicados en:

- `/docs/smart-conversations/diagrams/*.md`

Ejemplos:
- `diagram-system-context.md`
- `diagram-whatsapp-sequence.md`
- `diagram-identity-validation-sequence.md`
- `diagram-incidents-flow.md`

Aplica a:
- diagramas nuevos
- reescrituras importantes de diagramas existentes

## 3. Diagrama

Todo documento de tipo diagrama debe contener una representación visual expresada en un formato compatible con markdown.

Formatos permitidos:
- bloques de código con diagramas ASCII
- diagramas Mermaid
- secuencias estructuradas en bloques de código
- diagramas de arquitectura o flujo renderizados como texto markdown

Todo documento de diagrama debe incluir al menos un bloque real de diagrama.

Usos válidos:
- contexto de sistema
- diagramas de secuencia
- diagramas de flujo de estado
- mapas de interacción entre servicios
- visión de alto nivel de workflows

## 4. Notas de lectura

Todo documento de diagrama debe incluir una sección que explique cómo debe leerse el diagrama.

Esta sección debe aclarar:
- qué representan las cajas, actores o carriles
- qué representan las flechas
- cuál es el alcance del diagrama
- si el diagrama es:
  - conceptual
  - lógico
  - técnico
  - de runtime
  - de secuencia

También debe indicar de forma explícita que los diagramas son material explicativo y no sustituyen a `rules` o `contracts`.

## 5. Dependencias

Todo documento de diagrama debe listar los documentos que constituyen la fuente de verdad real detrás del diagrama.

Dependencias típicas:
- `rules` relacionados
- `contracts` relacionados
- `skills` relevantes

Si el diagrama representa un workflow, debe referenciar las `rules` y `contracts` correspondientes.

Si el diagrama representa un flujo de datos, debe referenciar los `contracts` correspondientes.

## 6. Limitaciones

Todo documento de diagrama debe indicar de forma explícita sus limitaciones.

Ejemplos:
- El diagrama es una simplificación y omite la lógica de reintentos.
- El diagrama no describe la estructura exacta del payload.
- El diagrama no sustituye a las reglas canónicas.
- El diagrama está centrado solo en el canal WhatsApp.
- El diagrama no modela el comportamiento del panel admin.

Esta sección es obligatoria porque un diagrama suele abstraer detalles que sí existen en `rules` o `contracts`.

---

## Reglas adicionales de redacción

### A. Convención de nombres

Todos los ficheros de diagrama deben seguir:

- `diagram-topic-name.md`

Ejemplos:
- `diagram-system-context.md`
- `diagram-whatsapp-sequence.md`

### B. Estructura obligatoria

Todo documento `diagram` debe seguir exactamente este orden de secciones:

1. `# <Título>`
2. `## 1. Propósito`
3. `## 2. Alcance`
4. `## 3. Diagrama`
5. `## 4. Notas de lectura`
6. `## 5. Dependencias`
7. `## 6. Limitaciones`

Ningún documento de diagrama puede omitir ni reordenar estas secciones.

### C. Límite de alcance

Un documento `diagram` puede:
- ilustrar arquitectura
- ilustrar flujo de mensajes
- ilustrar flujo de estados
- ilustrar reparto de responsabilidades

Un documento `diagram` no debe:
- definir reglas obligatorias de negocio
- definir payloads formales
- sustituir una skill de implementación
- ser la única documentación de una interacción crítica

Esos contenidos pertenecen a:
- `rules`
- `contracts`
- `skills`

### D. Prioridad y precedencia

Si existe cualquier conflicto, el orden de precedencia es siempre:

1. `rules`
2. `contracts`
3. `skills`
4. `diagrams`

Por tanto:
- un diagrama nunca puede sobreescribir una `rule`
- un diagrama nunca puede sobreescribir un `contract`
- un diagrama puede resumir una `skill`, pero no sustituirla

### E. Calidad del diagrama

Un diagrama válido debe ser:
- acotado en alcance
- legible
- etiquetado
- consistente con la terminología usada en el resto de la documentación

Un diagrama no debe:
- inventar nombres de componentes que no existan en `rules` o `contracts`
- omitir actores críticos cuando sean necesarios para entender el flujo
- mostrar una arquitectura alternativa no aprobada
- mezclar nivel conceptual y runtime sin indicarlo

### F. Idioma y tono

Los documentos de tipo `diagrams` deben redactarse en español en sus secciones explicativas.

Reglas:
- El propósito debe estar en español.
- Las notas de lectura deben estar en español.
- Las dependencias y limitaciones deben estar en español.

Se permite mantener en inglés:
- nombres de componentes técnicos
- nombres de workflows
- nombres de tablas
- nombres de campos
- nombres de payloads
- nombres de endpoints

si así existen en la arquitectura real.

### G. Privacidad y seguridad

Si un diagrama representa flujo de mensajes, validación de identidad o uso de IA, no debe implicar que los datos personales viajan a un componente a menos que eso esté explícitamente permitido por las `rules` y `contracts` correspondientes.

Si el diagrama abstrae el manejo de datos sensibles, eso debe indicarse en `Limitaciones`.

### H. Checklist de revisión

Un documento de diagrama solo es válido si:

- [ ] El fichero está en `/docs/smart-conversations/diagrams/`
- [ ] El nombre sigue la convención `diagram-*.md`
- [ ] Se respeta el orden obligatorio de secciones
- [ ] Incluye al menos un bloque real de diagrama
- [ ] Las notas de lectura explican el diagrama con claridad
- [ ] Referencia `rules`, `contracts` o `skills` relacionados
- [ ] Las limitaciones son explícitas
- [ ] El diagrama no contradice documentos de mayor precedencia

### I. Control de cambios

Los cambios en el estándar de diagramas afectan a todos los futuros diagramas de SmartConversations.

Deben revisarse con cuidado porque los diagramas suelen ser documentos de entrada rápida tanto para humanos como para agentes, y un mal estándar puede inducir interpretaciones arquitectónicas erróneas.