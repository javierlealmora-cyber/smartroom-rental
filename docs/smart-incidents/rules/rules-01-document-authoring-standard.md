# rules-01-document-authoring-standard.md — smart-incidents: Estándar Documental del Módulo

## 1. Propósito

Este documento declara que el módulo `smart-incidents` hereda el estándar global de redacción documental del repositorio y añade exclusivamente las especializaciones mínimas propias del módulo.

La fuente de verdad del estándar global es:

```
docs/project-rules/rules-01-document-authoring-standard.md
```

Este documento no redefine, no sustituye ni contradice el estándar global. Únicamente:

- Confirma la herencia
- Declara las rutas canónicas del módulo
- Aclara que este módulo utiliza la categoría `tests/`, que no estaba activa en módulos anteriores como `smart-conversations`
- Confirma el orden de precedencia de las cinco categorías en el contexto de este módulo

---

## 2. Alcance

Este documento aplica a todos los documentos markdown creados bajo:

```
/docs/smart-incidents/
```

Aplica tanto a documentos nuevos como a reescrituras importantes de documentos existentes.

---

## 3. Decisiones no negociables

1. El estándar global (`docs/project-rules/rules-01-document-authoring-standard.md`) prevalece siempre en materia de clasificación, idioma, nomenclatura, precedencia y plantillas.

2. Ningún documento de este módulo puede redefinir plantillas, convenciones de nombres, política de idioma ni reglas transversales del estándar global.

3. El orden de precedencia documental es siempre: `rules` → `contracts` → `skills` → `tests` → `diagrams`.

4. Los documentos de este módulo usan las cinco categorías definidas en el estándar global. La categoría `tests/` está activa en este módulo.

5. Ningún documento puede pertenecer a más de una categoría.

---

## 4. Reglas obligatorias

### 4.1 Rutas canónicas del módulo

| Categoría | Ruta |
|---|---|
| `rules` | `/docs/smart-incidents/rules/` |
| `contracts` | `/docs/smart-incidents/contracts/` |
| `skills` | `/docs/smart-incidents/skills/` |
| `tests` | `/docs/smart-incidents/tests/` |
| `diagrams` | `/docs/smart-incidents/diagrams/` |

### 4.2 Convención de nombres

Se aplica íntegramente la convención del estándar global:

| Categoría | Patrón |
|---|---|
| `rules` | `rules-XX-topic-name.md` |
| `contracts` | `contract-topic-name.md` |
| `skills` | `skill-topic-name.md` |
| `tests` | `test-topic-name.md` |
| `diagrams` | `diagram-topic-name.md` |

No se introduce ninguna variación sobre estos patrones en este módulo.

### 4.3 Plantillas obligatorias

Se aplican íntegramente las plantillas del estándar global. No se definen plantillas alternativas en este módulo.

Las plantillas completas de las cinco categorías están definidas en el estándar global.

### 4.4 Política de idioma

Se aplica íntegramente la política del estándar global:

- Los documentos `rules`, `skills` y `tests` deben redactarse en español.
- Los documentos `contracts` y `diagrams` deben tener sus secciones explicativas en español.
- Se permiten en inglés los identificadores técnicos reales del sistema (nombres de tablas, campos, EFs, enums, endpoints, workflows).

### 4.5 Precedencia documental en este módulo

Cuando dos documentos del módulo entren en conflicto, se aplica este orden de resolución:

1. `rules` — restricciones y decisiones cerradas
2. `contracts` — estructura técnica formal
3. `skills` — guía de implementación
4. `tests` — verificación de lo definido
5. `diagrams` — material visual de apoyo

Un documento de categoría inferior no puede contradecir ni redefinir lo establecido en un documento de categoría superior. Esta regla se aplica también entre el estándar global y cualquier documento de módulo: el estándar global prevalece siempre.

---

## 5. Casos permitidos

- Añadir documentos nuevos bajo las rutas canónicas del módulo respetando la plantilla de su categoría.
- Añadir una sección de notas o criterios de validación adicionales sin cambiar la estructura obligatoria.
- Dividir un documento grande en varios más pequeños si el alcance crece, manteniendo la nomenclatura consistente.

---

## 6. Casos prohibidos

- Modificar la plantilla obligatoria de cualquier categoría.
- Alterar la política de idioma establecida en el estándar global.
- Usar una convención de nombres distinta a la fijada en el estándar global.
- Crear documentos que mezclen dos o más categorías.
- Escribir una `rule` como narrativa vaga sin restricciones explícitas.
- Introducir arquitectura nueva en una `skill` cuando una `rule` ya ha cerrado la decisión.
- Usar diagramas como única documentación de una interacción crítica.

---

## 7. Impacto en diseño

- Cualquier agente técnico que redacte o revise documentos de `smart-incidents` debe leer primero el estándar global y luego este documento.
- La separación estricta entre categorías permite que cada documento sea interpretado y revisado de forma independiente.

---

## 8. Impacto en implementación

- Un documento del módulo que no siga la plantilla de su categoría se considera incompleto y no debe aceptarse como documentación canónica.
- Un documento generado automáticamente debe validarse contra las plantillas del estándar global antes de aceptarse.

---

## 9. Dependencias

- `docs/project-rules/rules-01-document-authoring-standard.md` — estándar global (fuente de verdad); este documento lo hereda sin modificarlo

---

## 10. Checklist de validación

Antes de aceptar un documento nuevo en el módulo, verificar:

- [ ] El documento pertenece a una sola categoría
- [ ] Está ubicado bajo la ruta canónica correcta
- [ ] El nombre sigue la convención de su categoría según el estándar global
- [ ] Se respeta la política de idioma del estándar global
- [ ] Se usa la plantilla correcta de su categoría
- [ ] No contradice el estándar global ni ningún documento de mayor precedencia
- [ ] Si es `rules`, `skills` o `tests`, está redactado en español
- [ ] Si es `contract` o `diagram`, sus secciones explicativas están en español

---

## 11. Notas de control de cambios

Cualquier cambio en este documento debe ser compatible con el estándar global. En caso de conflicto, prevalece el estándar global.

Si el estándar global actualiza las plantillas, convenciones o política de idioma, este documento debe revisarse para garantizar coherencia.
