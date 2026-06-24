\# Contract — Estándar de Redacción de Documentos de Contrato



\## 1. Propósito



Este documento define la estructura obligatoria, la semántica y las reglas de validación que debe cumplir cualquier documento markdown creado dentro de `/docs/smart-conversations/contracts/`.



Su objetivo es garantizar que todos los contratos de SmartConversations sean consistentes, revisables y legibles tanto por desarrolladores humanos como por agentes de codificación.



\## 2. Cuándo se usa



Este estándar se aplica siempre que se cree un nuevo documento de contrato o se modifique de forma sustancial uno existente.



Aplica a todos los ficheros ubicados en:



\- `/docs/smart-conversations/contracts/\*.md`



Ejemplos:

\- `contract-normalized-message.md`

\- `contract-canonical-response.md`

\- `contract-identity-validation-result.md`

\- `contract-tenant-features-response.md`

\- `contract-case-state-machine.md`



\## 3. Productor



Este estándar es producido y gobernado por el conjunto de documentación de arquitectura de SmartConversations.



Debe ser utilizado por:

\- arquitectos

\- desarrolladores backend

\- desarrolladores frontend

\- desarrolladores de workflows

\- agentes de codificación que generen documentación

\- revisores que aprueben nuevos contratos



\## 4. Consumidor



Este estándar es consumido por cualquier persona o agente que cree o revise contratos técnicos de SmartConversations.



Es especialmente relevante para:

\- contratos de Integration API

\- payloads entre Edge Functions y n8n

\- esquemas de respuesta de servicios

\- contratos de sesión, identidad y estado

\- contratos de transición de estados



\## 5. Estructura



Todo documento de tipo `contract` debe seguir exactamente este orden de secciones:



1\. `# <Título>`

2\. `## 1. Propósito`

3\. `## 2. Cuándo se usa`

4\. `## 3. Productor`

5\. `## 4. Consumidor`

6\. `## 5. Estructura`

7\. `## 6. Campos obligatorios`

8\. `## 7. Campos opcionales`

9\. `## 8. Reglas de validación`

10\. `## 9. Ejemplos válidos`

11\. `## 10. Ejemplos inválidos`

12\. `## 11. Notas de versionado`



Ningún fichero de contrato puede omitir ni reordenar estas secciones.



\## 6. Campos obligatorios



Todo documento de contrato debe definir explícitamente sus campos obligatorios.



Para cada campo obligatorio debe especificarse:



\- nombre del campo

\- tipo de dato

\- significado semántico

\- si lo genera el sistema o lo aporta un consumidor externo

\- reglas de validación

\- si es inmutable tras su creación

\- si admite `null` o no



Formato recomendado:



| Campo | Tipo | Obligatorio | Descripción | Notas |

|------|------|-------------|-------------|------|



Si el contrato contiene estructuras anidadas, los campos obligatorios anidados también deben documentarse.



\## 7. Campos opcionales



Todo documento de contrato debe definir explícitamente sus campos opcionales.



Para cada campo opcional debe especificarse:



\- nombre del campo

\- tipo de dato

\- significado semántico

\- comportamiento por defecto si no aparece

\- si admite `null`

\- si puede ignorarse sin romper compatibilidad

\- dependencias condicionales si las hubiera



Un campo opcional nunca puede quedar ambiguo.



Si un campo opcional pasa a ser obligatorio bajo ciertas condiciones, esa regla debe documentarse en `Reglas de validación`.



\## 8. Reglas de validación



Todo contrato debe definir de forma explícita qué hace que una instancia del contrato sea válida o inválida.



Las reglas de validación deben cubrir, cuando aplique:



\- presencia de campos obligatorios

\- valores permitidos para enums

\- reglas de nulabilidad

\- formatos de cadenas

\- reglas de identificadores

\- reglas de timestamps

\- dependencias entre campos

\- condiciones de obligatoriedad

\- restricciones de seguridad o privacidad

\- expectativas de compatibilidad hacia atrás



Estas reglas deben expresarse con lenguaje normativo:

\- Debe

\- No debe

\- Solo si

\- Es inválido cuando

\- Es obligatorio cuando

\- Está prohibido cuando



Ejemplos:

\- `client\_account\_id` debe estar siempre presente.

\- `identity\_level` debe ser uno de los valores permitidos.

\- `profile\_id` no debe estar presente cuando `identity\_level = NO\_MATCH`.

\- `response\_text` debe estar presente cuando `response\_type = text`.



\## 9. Ejemplos válidos



Todo contrato debe incluir al menos un ejemplo válido.



Un buen ejemplo válido debe:

\- ser realista

\- usar nombres de campo reales

\- respetar las reglas de validación

\- reflejar un uso típico

\- evitar ejemplos vacíos cuando la estructura tenga relevancia



Si aporta valor, se recomienda incluir:

\- un ejemplo válido mínimo

\- un ejemplo válido completo



\## 10. Ejemplos inválidos



Todo contrato debe incluir al menos un ejemplo inválido.



Un ejemplo inválido debe:

\- infringir una regla clara de validación

\- explicar por qué es inválido

\- mostrar un error que el equipo de desarrollo debe evitar



Ejemplos de invalidez:

\- ausencia de campos obligatorios

\- enums no permitidos

\- combinaciones de estado contradictorias

\- `null` donde no está permitido

\- fuga de PII en un contrato que no debe transportarla



\## 11. Notas de versionado



Todo contrato debe incluir notas de versionado.



Debe indicar:



\- si el contrato es estable o evolutivo

\- si se permiten cambios aditivos

\- qué cambios se consideran breaking changes

\- cómo deben comportarse los consumidores ante campos opcionales desconocidos

\- cómo gestionar campos deprecados



Reglas generales:

\- se prefieren cambios aditivos en campos opcionales

\- eliminar campos obligatorios es un breaking change

\- cambiar el significado de un campo es un breaking change

\- cambiar la semántica de un enum es un breaking change

\- los contratos deben evolucionar de forma backward-compatible siempre que sea posible



\---



\## Reglas adicionales de redacción



\### A. Convención de nombres



Todos los ficheros de contrato deben seguir:



\- `contract-topic-name.md`



Ejemplos:

\- `contract-normalized-message.md`

\- `contract-canonical-response.md`



\### B. Límite de alcance



Un documento `contract` debe definir:

\- estructuras

\- campos

\- reglas de validación

\- ejemplos

\- notas de compatibilidad



Un documento `contract` no debe convertirse en:

\- un documento de reglas de negocio

\- un tutorial

\- una guía de implementación de workflows

\- una narrativa de arquitectura general



Esos contenidos pertenecen a:

\- `rules`

\- `skills`

\- `diagrams`



\### C. Idioma y tono



Los documentos `contracts` deben redactarse preferiblemente en español.



Reglas:

\- La explicación del contrato debe estar en español.

\- Las reglas de validación deben estar en español.

\- Las notas de versionado deben estar en español.

\- Los ejemplos narrativos y aclaraciones deben estar en español.



Se permite mantener en inglés:

\- nombres de campos

\- nombres de payloads

\- nombres de estructuras

\- enums

\- ejemplos JSON

\- nombres de endpoints

\- nombres de workflows



si forman parte del diseño técnico real y traducirlos pudiera romper la trazabilidad técnica.



El tono debe ser:

\- preciso

\- técnico

\- estable

\- explícito

\- sin ambigüedades

\- sin marketing

\- sin brainstorming de arquitectura



\### D. Prioridad y precedencia



Cuando existan conflictos entre documentos, el orden de precedencia es:



1\. `rules`

2\. `contracts`

3\. `skills`

4\. `diagrams`



Un `contract` nunca puede contradecir una `rule`.



Una `skill` debe implementar un `contract`, no redefinirlo.



Un `diagram` puede ilustrar un `contract`, pero nunca sustituirlo.



\### E. Privacidad y seguridad



Todo contrato debe indicar explícitamente si:

\- puede contener PII

\- no debe contener PII

\- ciertos campos deben ir enmascarados

\- deben usarse IDs en lugar de datos personales

\- el payload es seguro para enviarse a n8n

\- el payload es seguro para enviarse al proveedor de IA



Si el payload no debe contener datos personales, el contrato debe decirlo de forma explícita.



\### F. Checklist de revisión



Un documento de contrato solo es válido si:



\- \[ ] El fichero está en `/docs/smart-conversations/contracts/`

\- \[ ] El nombre sigue la convención `contract-\*.md`

\- \[ ] Se respeta el orden obligatorio de secciones

\- \[ ] Los campos obligatorios están claramente identificados

\- \[ ] Los campos opcionales están claramente identificados

\- \[ ] Las reglas de validación son explícitas

\- \[ ] Incluye al menos un ejemplo válido

\- \[ ] Incluye al menos un ejemplo inválido

\- \[ ] Incluye notas de versionado

\- \[ ] No contradice ninguna `rule`

\- \[ ] Las restricciones de privacidad están claramente documentadas



\### G. Control de cambios



Cualquier cambio en este estándar afecta a todos los futuros contratos de SmartConversations.



Los cambios deben ser poco frecuentes y revisarse con cuidado, porque redefinen cómo se documentan las interfaces y esquemas del sistema.

