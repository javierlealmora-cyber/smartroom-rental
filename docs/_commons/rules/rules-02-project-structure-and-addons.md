# Rule — Estructura de Proyecto para Add-ons y Módulos Funcionales

## 1. Propósito

Esta rule define cómo debe organizarse el código del proyecto cuando se implementan add-ons o módulos funcionales desacoplados del core.

Su objetivo es asegurar que cada add-on:

- esté claramente separado del core
- tenga una estructura predecible
- pueda evolucionar sin contaminar el resto del proyecto
- pueda activarse, desactivarse o eliminarse con impacto mínimo
- mantenga trazabilidad entre frontend, backend, base de datos, automatizaciones y documentación

## 2. Alcance

Esta rule aplica a cualquier desarrollo nuevo que introduzca funcionalidad desacoplada o parcialmente desacoplada del producto principal.

Aplica especialmente a:

- add-ons SaaS contratables por tenant
- módulos funcionales independientes
- integraciones multicanal
- flujos con backend propio, frontend propio o automatizaciones propias

Ejemplos de módulos a los que aplica:

- `smart-conversations`
- `smart-incidents`
- `smart-publications`
- módulos futuros equivalentes

Esta rule aplica a:

- frontend
- backend
- edge functions
- base de datos
- automatizaciones n8n
- documentación técnica del módulo

## 3. Decisiones no negociables

1. Todo add-on o módulo funcional desacoplado debe tener un namespace propio y reconocible.
2. El código de un add-on no debe dispersarse sin estructura por carpetas genéricas del core.
3. La organización preferida es por dominio funcional, no por tipo técnico aislado.
4. El nombre del add-on debe mantenerse consistente en:
   - frontend
   - backend
   - edge functions
   - migraciones de base de datos
   - automatizaciones n8n
   - documentación
5. El core no debe depender estructuralmente de detalles internos del add-on.
6. Un add-on debe exponer al core únicamente puntos mínimos de integración.
7. La estructura elegida debe facilitar:
   - desacoplamiento
   - mantenibilidad
   - testing
   - feature flags
   - evolución independiente
8. Cuando exista código específico de un add-on en frontend, debe vivir bajo una carpeta `addons`.
9. Los artefactos no frontend del add-on deben permanecer en sus carpetas técnicas naturales, conservando namespace coherente.
10. Cuando exista documentación específica de un add-on, debe vivir bajo una carpeta de documentación propia del módulo.
11. Los workflows del add-on deben organizarse bajo la carpeta `automation_n8n/`.
12. No deben existir estructuras ad hoc distintas para cada add-on sin justificación arquitectónica fuerte.

## 4. Reglas obligatorias

### 4.1 Regla de namespace

Todo add-on debe tener un identificador estable y consistente.

Ejemplos válidos:

- `smart-conversations`
- `smart-incidents`
- `smart-publications`

Ese identificador debe reutilizarse en:

- rutas de documentación
- rutas de frontend
- nombres de edge functions
- nombres de migraciones
- automatizaciones
- nombres de artefactos relacionados

### 4.2 Regla de separación en frontend

El código de frontend de un add-on no debe colocarse de forma suelta en carpetas globales como:

- `src/pages/`
- `src/services/`
- `src/hooks/`
- `src/components/`

sin namespace específico.

La estructura obligatoria recomendada para el frontend del add-on es:

- `src/addons/<addon-name>/pages/`
- `src/addons/<addon-name>/components/`
- `src/addons/<addon-name>/services/`
- `src/addons/<addon-name>/hooks/`
- `src/addons/<addon-name>/state/`
- `src/addons/<addon-name>/routes/`
- `src/addons/<addon-name>/utils/`
- `src/addons/<addon-name>/contracts/`
- `src/addons/<addon-name>/guards/`
- `src/addons/<addon-name>/constants/`
- `src/addons/<addon-name>/mappers/`

La carpeta `src/addons/<addon-name>/` contiene únicamente el frontend del add-on.

### 4.3 Regla de estructura completa del add-on

La estructura completa de un add-on no se limita al frontend. Debe repartirse por las carpetas técnicas naturales del proyecto, manteniendo siempre el mismo namespace funcional.

La estructura conceptual obligatoria de un add-on es:

- frontend: `src/addons/<addon-name>/...`
- edge functions: `supabase/functions/...`
- base de datos: `supabase/migrations/...`
- automatizaciones: `automation_n8n/<addon-name>/...`
- documentación: `docs/<addon-name>/...`

Por tanto, BBDD, Edge Functions y n8n no deben meterse dentro de `src/addons/<addon-name>/`, porque no pertenecen al runtime del frontend.

### 4.4 Regla de integración con el core

El core puede consumir un add-on, pero no debe absorber su estructura interna.

El core solo debe conocer, como máximo:

- rutas
- feature flags
- puntos de entrada
- guards
- adaptadores explícitos
- contratos de integración mínimos

Está prohibido que el core dependa de:

- utilidades internas del add-on
- componentes internos del add-on fuera de sus puntos públicos
- estructuras privadas del estado del add-on
- detalles internos de implementación del add-on

### 4.5 Regla para páginas, servicios y hooks

Si un add-on tiene:

- páginas
- servicios
- hooks
- componentes
- estado
- utilidades

deben mantenerse juntos dentro de su carpeta `src/addons/<addon-name>/`.

Está prohibido repartir esos ficheros entre carpetas globales del proyecto salvo en puntos explícitos de integración.

### 4.6 Regla para backend y edge functions

Las Edge Functions, handlers o servicios backend específicos de un add-on deben mantener también su namespace propio.

La convención concreta puede variar, pero debe:

- mantener un prefijo o namespace coherente
- evitar colisiones con otros módulos
- permitir identificar de forma inmediata a qué add-on pertenece cada función

Ejemplos válidos de naming:

- `conv-wa-webhook`
- `conv-web-session`
- `conv-web-message`
- `conv-send-wa`
- `conv-core-create-incident`
- `conv-core-validate-identity`

o, para otro módulo:

- `incidents-create`
- `incidents-assign`
- `incidents-close`

### 4.7 Regla para base de datos

Las migraciones y artefactos de base de datos de un add-on deben permanecer en la carpeta técnica correspondiente del proyecto.

Ubicación esperada:

- `supabase/migrations/`

Deben seguir un naming que permita identificar el add-on al que pertenecen.

Ejemplos válidos:

- `202606120001_smart_conversations_core.sql`
- `202606120002_smart_conversations_indexes.sql`
- `202606130001_smart_incidents_core.sql`

Está prohibido crear migraciones sin referencia clara al módulo funcional cuando afecten a un add-on concreto.

### 4.8 Regla para automatizaciones

Los workflows, automatizaciones y artefactos de orquestación del add-on deben vivir bajo:

- `automation_n8n/<addon-name>/`

Está prohibido:

- mezclar workflows de múltiples add-ons en una carpeta plana
- usar una carpeta genérica ambigua para automatizaciones del add-on
- guardar los workflows dentro de `src/`

La carpeta `automation_n8n/` se considera la ubicación oficial de workflows n8n del proyecto.

### 4.9 Regla para documentación

Todo add-on debe tener su propia carpeta documental.

Ejemplos válidos:

- `/docs/smart-conversations/`
- `/docs/smart-incidents/`

La documentación global y transversal debe vivir fuera del módulo, por ejemplo en:

- `/docs/_commons/`

### 4.10 Regla de puntos públicos

Si un add-on necesita exponer partes reutilizables al resto del proyecto, debe hacerlo mediante puntos públicos claramente definidos.

Ejemplos:

- `routes/`
- `guards/`
- `index.ts`
- `public-api.ts`

No debe asumirse que cualquier fichero interno del add-on es reutilizable por el resto del sistema.

### 4.11 Regla de crecimiento futuro

La estructura debe permitir que en el futuro existan múltiples add-ons sin colisiones ni desorden.

Por tanto:

- cualquier nuevo add-on debe seguir el mismo patrón
- no deben crearse excepciones sin una razón fuerte
- la estructura debe ser repetible y predecible

## 5. Casos permitidos

Se permite:

- crear `src/addons/<addon-name>/...` para cada add-on nuevo
- tener subcarpetas por tipo técnico dentro del frontend del add-on:
  - `pages`
  - `components`
  - `services`
  - `hooks`
  - `state`
  - `routes`
  - `utils`
  - `contracts`
  - `guards`
  - `constants`
  - `mappers`
- mantener edge functions en `supabase/functions/` con namespace coherente
- mantener migraciones en `supabase/migrations/` con naming del add-on
- mantener workflows en `automation_n8n/<addon-name>/`
- tener documentación específica del add-on en su carpeta propia
- exportar una API pública mínima del add-on si el core la necesita
- tener puntos mínimos de integración en el core

## 6. Casos prohibidos

Está prohibido:

- repartir el código de un add-on por `src/pages`, `src/services`, `src/hooks` y `src/components` sin namespace claro
- mezclar frontend, base de datos, edge functions y automatizaciones dentro de `src/addons/<addon-name>/`
- mezclar ficheros del core y del add-on en la misma carpeta sin separación
- usar nombres ambiguos que no indiquen a qué módulo pertenece un fichero
- hacer que el core dependa de utilidades internas del add-on
- usar una carpeta plana para workflows de múltiples módulos
- colocar documentación específica del add-on fuera de su carpeta de módulo
- definir estructuras distintas para cada add-on sin justificación fuerte
- guardar workflows n8n del add-on fuera de `automation_n8n/`

## 7. Impacto en diseño

Esta rule obliga a diseñar los add-ons como unidades funcionales reconocibles y relativamente desacopladas.

Esto mejora:

- el aislamiento del dominio
- la comprensión del sistema
- la claridad de ownership
- la evolución independiente
- la capacidad de activar o desactivar funcionalidad por tenant

También facilita la revisión arquitectónica, porque cada módulo conserva sus límites visibles entre frontend, backend, BBDD, automatizaciones y documentación.

## 8. Impacto en implementación

Cualquier implementación futura de add-ons debe crearse siguiendo esta estructura desde el inicio.

Si ya existe código de add-on disperso por carpetas globales, debe considerarse deuda técnica y planificarse su consolidación.

Cuando Claude, Devin u otros agentes generen código de un add-on, deben colocarlo en la capa correcta:

- frontend → `src/addons/<addon-name>/`
- edge functions → `supabase/functions/`
- migraciones → `supabase/migrations/`
- workflows → `automation_n8n/<addon-name>/`
- documentación → `docs/<addon-name>/`

salvo los puntos explícitos de integración global.

## 9. Dependencias

Esta rule depende de:

- la estrategia general de modularización del proyecto
- la documentación global de `_commons`
- las rules específicas de cada add-on

Documentos relacionados:

- `/docs/_commons/rules/rules-01-document-authoring-standard.md`
- documentación específica de cada módulo bajo `/docs/<module-name>/`

## 10. Checklist de validación

Antes de aceptar la estructura de un add-on, verificar:

- [ ] El add-on tiene un namespace propio y consistente
- [ ] El frontend específico vive bajo `src/addons/<addon-name>/`
- [ ] Las páginas del add-on no están dispersas en `src/pages/` sin namespace
- [ ] Los servicios del add-on no están dispersos en `src/services/` sin namespace
- [ ] Los hooks del add-on no están dispersos en `src/hooks/` sin namespace
- [ ] Las edge functions mantienen namespace coherente
- [ ] Las migraciones de BBDD mantienen naming del add-on
- [ ] Los workflows viven bajo `automation_n8n/<addon-name>/`
- [ ] La documentación del add-on está en su carpeta propia
- [ ] Existen puntos mínimos de integración con el core
- [ ] El core no depende de detalles internos del add-on
- [ ] La estructura es repetible para futuros módulos

## 11. Notas de control de cambios

Los cambios en esta rule afectan a todos los add-ons presentes y futuros del proyecto.

Cualquier excepción a esta estructura debe:

- justificarse explícitamente
- documentarse
- revisarse de forma arquitectónica
- y no convertirse en un precedente informal para otros módulos

En caso de conflicto entre una práctica puntual del proyecto y esta rule, prevalece esta rule salvo aprobación explícita de una excepción arquitectónica.