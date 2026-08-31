# test-core-isolation-spec.md — Especificación de Pruebas: Aislamiento del Core

## 1. Objetivo

Verificar que ninguna tabla del Core de SmartRoom Rental tiene columnas, FKs o triggers que referencien tablas `lock_*`, y que todas las tablas del módulo SmartLock cumplen la convención de nombres, según `rules-30-schema-isolation.md`.

## 2. Alcance

| Incluye | Excluye |
|---|---|
| Verificación estática del schema (information_schema) | Pruebas funcionales de negocio de SmartLock |
| Convención de nombres `lock_*` | Rendimiento de queries |
| Dirección de FKs (SAL → Core, nunca Core → SAL) | |

## 3. Reglas y Contratos Cubiertos

| Documento | Sección | Qué se verifica |
|---|---|---|
| `rules-30-schema-isolation.md` | §3.2 | Cero FKs Core → `lock_*` |
| `rules-30-schema-isolation.md` | §4.1 | Todas las tablas del módulo usan prefijo `lock_*` (salvo excepción documentada) |
| `rules-30-schema-isolation.md` | §4.4 | RLS activa en todas las tablas `lock_*` |

## 4. Precondiciones

- Schema de SmartLock aplicado en el entorno de test (DEV).
- Acceso a `information_schema.table_constraints`, `information_schema.key_column_usage` y `information_schema.tables`.

## 5. Escenarios de Prueba

**ISO-01: Ninguna tabla del Core referencia `lock_*`**
- Acción: consultar todas las FKs del schema `public` cuyo `referenced_table_name` empiece por `lock_` o sea `locks`.
- Resultado esperado: la tabla de origen de cada una de esas FKs pertenece también al namespace `lock_*` (o `locks`). Ninguna FK de origen es una tabla del Core (`rooms`, `accommodations`, `lodgers`, `entities`, `client_accounts`, `common_areas`, etc.).

**ISO-02: Todas las tablas del módulo usan prefijo `lock_*`**
- Acción: listar todas las tablas creadas por la migración del módulo SmartLock.
- Resultado esperado: cada nombre empieza por `lock_`, con la única excepción de `locks` (documentada en `rules-30` §4.2).

**ISO-03: RLS activa en todas las tablas `lock_*`**
- Acción: consultar `pg_tables` / `pg_class.relrowsecurity` para cada tabla `lock_*`.
- Resultado esperado: `relrowsecurity = true` en todas.

**ISO-04: Ninguna columna del Core lleva nombre `lock_id` u otro que sugiera relación con SmartLock**
- Acción: buscar columnas con nombre `lock_id`, `default_lock_id`, `smart_lock_id` en tablas del Core.
- Resultado esperado: cero resultados.

**ISO-05: Eliminar el módulo SmartLock no requiere tocar el Core**
- Acción: ejecutar un `DROP TABLE ... CASCADE` de todas las tablas `lock_*` en un entorno de prueba aislado.
- Resultado esperado: ninguna tabla del Core se ve afectada ni genera error de FK huérfana.

## 6. Resultados Esperados

Todos los escenarios ISO-01 a ISO-05 deben pasar. Este test debe ejecutarse como parte del pipeline de CI cada vez que se modifique el schema de SmartLock o del Core.

## 7. Casos Negativos

| ID | Caso negativo | Resultado esperado |
|---|---|---|
| ISO-NEG-01 | Se añade `rooms.default_lock_id uuid REFERENCES locks(id)` | Debe fallar ISO-01 |
| ISO-NEG-02 | Se crea una tabla `gateways` sin prefijo `lock_` | Debe fallar ISO-02 |
| ISO-NEG-03 | Se crea `lock_new_table` sin RLS activa | Debe fallar ISO-03 |

## 8. Datos de Prueba

No requiere datos de negocio; es una prueba estructural sobre el catálogo de PostgreSQL (`information_schema`, `pg_catalog`).

## 9. Criterio de Aceptación

- [ ] ISO-01 a ISO-05 pasan en cada ejecución de CI tras cambios de schema.
- [ ] El pipeline bloquea el merge si ISO-01, ISO-02 o ISO-03 fallan.

## 10. Dependencias

- `rules-30-schema-isolation.md`
- `REQ-SL-000-smart-lock-capability.md`
