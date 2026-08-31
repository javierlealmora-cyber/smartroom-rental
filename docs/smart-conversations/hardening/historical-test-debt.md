# Historical Test Debt — SmartConversations
<!-- Fase 11A · Normalizado en microfix 2026-07-19 -->

> Inventario exacto de deuda de tests **preexistentes** al scope de SmartConversations.
> Ninguno de estos fallos fue introducido por las Fases 10E/10F/10G/11A.
> Fuente: ejecución de `npx vitest run` en 2026-07-19.

---

## Métricas canónicas

| Métrica | Valor |
|---|---|
| Archivos afectados | 7 |
| Suites afectadas | 7 |
| Casos de test individuales fallando (named) | 10 |
| Archivos con fallo de nivel archivo (no-runnable) | 5 |
| Total ítems de deuda | 15 (D-01..D-10 + D-F01..D-F05) |

> **Distinción importante**: Los D-01..D-10 son casos individuales con nombre que Vitest puede identificar y reportar con assertion errors. Los D-F01..D-F05 son archivos que Vitest no puede ni parsear ni ejecutar — el count de tests fallando dentro de ellos es desconocido.

---

## Tabla de deuda — Casos individuales (D-01..D-10)

| debt_id | Archivo | Test / descripción | Fallo | Clasificación |
|---|---|---|---|---|
| D-01 | `src/tests/alojamientos/accommodations.service.test.js` | `createAccommodation() > llama a invokeWithAuth con manage_accommodation y acción "create"` | `TypeError: Cannot read properties of undefined (reading 'insert')` | product_defect |
| D-02 | `src/tests/alojamientos/accommodations.service.test.js` | `createAccommodation() > incluye habitaciones cuando se proporcionan` | `TypeError: Cannot read properties of undefined (reading 'insert')` | product_defect |
| D-03 | `src/tests/alojamientos/accommodations.service.test.js` | `createAccommodation() > lanza error con mensaje cuando invokeWithAuth devuelve ok: false` | `AssertionError: expected function to throw error matching: 'Plan limit…'` | product_defect |
| D-04 | `src/tests/alojamientos/accommodations.service.test.js` | `createAccommodation() > lanza "Error desconocido" cuando invokeWithAuth no tiene mensaje de error` | `AssertionError` | product_defect |
| D-05 | `src/tests/alojamientos/accommodations.service.test.js` | `Validación de campos — Alojamiento > payload completo no genera errores` | `AssertionError` | product_defect |
| D-06 | `src/tests/alojamientos/accommodations.service.test.js` | `Validación de campos — Alojamiento > address_city es obligatorio` | `AssertionError` | product_defect |
| D-07 | `src/tests/alojamientos/accommodations.service.test.js` | `Validación de campos — Alojamiento > address_province es obligatorio` | `AssertionError` | product_defect |
| D-08 | `src/tests/entidades/entity-field-validation.test.js` | `Validación de campos — Entidad CRUD > persona_juridica > Integración — createEntity > llama a manage_entity con payload completo de persona jurídica` | `TypeError: Cannot read properties of undefined (reading 'insert')` | product_defect |
| D-09 | `src/tests/entidades/entity-field-validation.test.js` | (segundo caso failing de persona_juridica / manage_entity) | `TypeError: Cannot read properties of undefined (reading 'insert')` | product_defect |
| D-10 | `src/tests/entidades/entity-field-validation.test.js` | (tercer caso failing de persona_juridica / manage_entity) | `TypeError: Cannot read properties of undefined (reading 'insert')` | product_defect |

---

## Tabla de deuda — Fallos a nivel de archivo (D-F01..D-F05)

| debt_id | Archivo | Causa del fallo | Clasificación |
|---|---|---|---|
| D-F01 | `src/tests/entidades/entities.service.test.js` | Parse error: JSX en archivo `.js` sin configuración esbuild apropiada | obsolete_test |
| D-F02 | `src/tests/entidades/entity-plan-restrictions.test.js` | Parse error: JSX en archivo `.js` sin configuración esbuild apropiada | obsolete_test |
| D-F03 | `src/tests/inquilinos/lodger-creation.test.js` | Parse error / import error en `.js` | obsolete_test |
| D-F04 | `src/tests/rendimiento/concurrencia.test.js` | Parse error: JSX en archivo `.js` (test de rendimiento, no SC) | obsolete_test |
| D-F05 | `qa/unit/security/multi-tenant-isolation.test.js` | `ENOENT: no such file or directory` — ruta de migración faltante | environment_dependent |

---

## Clasificación por tipo

| Clasificación | Count | IDs | Descripción |
|---|---|---|---|
| `product_defect` | 10 | D-01..D-10 | Mock de Supabase `.insert()` incompleto o assertion de lanzamiento de error incorrecta |
| `obsolete_test` | 4 | D-F01, D-F02, D-F03, D-F04 | Archivos `.js` con sintaxis JSX sin conversión a `.jsx`; no se han mantenido al día con la configuración de Vitest |
| `environment_dependent` | 1 | D-F05 | Requiere archivo de migración local que no está en el repo o no se ha creado |
| **TOTAL** | **15** | D-01..D-10 + D-F01..D-F05 | — |

---

## Archivos afectados (7)

```
src/tests/alojamientos/accommodations.service.test.js     ← D-01..D-07 (7 casos named)
src/tests/entidades/entity-field-validation.test.js       ← D-08..D-10 (3 casos named)
src/tests/entidades/entities.service.test.js              ← D-F01 (file-level)
src/tests/entidades/entity-plan-restrictions.test.js      ← D-F02 (file-level)
src/tests/inquilinos/lodger-creation.test.js              ← D-F03 (file-level)
src/tests/rendimiento/concurrencia.test.js                ← D-F04 (file-level)
qa/unit/security/multi-tenant-isolation.test.js           ← D-F05 (file-level)
```

---

## Relación con SmartConversations

**Ninguno de estos archivos pertenece al scope de SmartConversations.**

- Todos son tests preexistentes en directorios de alojamientos, entidades, inquilinos, rendimiento o QA.
- Ninguno referencia `conv-*`, `webchat-*`, `SmartConversations`, ni features SC.
- Los fallos existían antes de Fase 10E y no fueron introducidos por las Fases 10E/10F/10G/11A.

---

## Estado en CI

El job `unit-tests` de `.github/workflows/pr-checks.yml` tiene `continue-on-error: true`. Esto significa que estos fallos no bloquean PRs actualmente. El riesgo R-08 del risk-register documenta este hecho.

El nuevo job `sc-hardening-baseline` (añadido en Fase 11A) **no incluye** estos tests — solo ejecuta suites SC que pasan 100%.

---

## Resolución

Estos ítems son responsabilidad de Cascade (no de Claude). Deben resolverse en una tarea de limpieza de deuda técnica separada del scope SmartConversations:

| Grupo | Acción propuesta |
|---|---|
| D-01..D-10 (`product_defect`) | Completar el mock de Supabase `.insert()` o actualizar las assertions |
| D-F01..D-F04 (`obsolete_test`) | Convertir archivos `.js` con JSX a `.jsx` o actualizar la config de Vitest |
| D-F05 (`environment_dependent`) | Crear el archivo de migración local requerido o actualizar la ruta en el test |

---

## Estado de GATE_0

La deuda histórica está completamente inventariada en este documento. No bloquea GATE_0.

**GATE_0: PASS_WITH_WARNINGS** — Deuda histórica inventariada, ningún ítem introducido por SC.
