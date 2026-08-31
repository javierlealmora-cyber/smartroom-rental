# rules-30-schema-isolation.md — Aislamiento de Esquema de Base de Datos

## 1. Propósito

Fijar la regla de aislamiento estructural entre el schema de SmartLock y el schema del Core de SmartRoom Rental, incluyendo convención de nombres y dirección permitida de las relaciones.

## 2. Alcance

Aplica a todas las tablas, vistas, funciones y triggers relacionados con SmartLock en la base de datos Supabase.

## 3. Decisiones No Negociables

1. Toda tabla propia de SmartLock debe llevar el prefijo `lock_`. Sin excepciones.

2. Ninguna tabla del Core (`rooms`, `accommodations`, `common_areas`, `lodgers`, `lodger_room_assignments`, `entities`, `client_accounts`, etc.) puede tener una columna, FK, vista o trigger que referencie una tabla `lock_*`.

3. Cuando se necesite relacionar una cerradura con una entidad del Core (habitación, alojamiento, zona común), la relación se modela **siempre** en una tabla `lock_*` con FK hacia el Core, nunca al revés.

   - Correcto: `lock_placements.room_id → rooms.id`.
   - Prohibido: `rooms.default_lock_id → locks.id`.

4. Las tablas del SDK BLE local que vivan fuera de Supabase (cache SQLite del gateway físico) no están sujetas a esta regla de prefijo `lock_*` — son internas del gateway y no forman parte del schema de Supabase. Si en el futuro se decide persistir alguna de esas estructuras en Supabase, deben renombrarse con prefijo `lock_*` antes de aplicarse.

5. Borrar por completo el módulo SmartLock (`DROP` de todas las tablas `lock_*`) no debe requerir ninguna migración sobre tablas del Core.

## 4. Reglas Obligatorias

### 4.1 Inventario de tablas con prefijo obligatorio

| Tabla | Grupo |
|---|---|
| `lock_integrations` | Integración por cliente |
| `locks` *(excepción histórica, ver 4.2)* | Cerraduras |
| `lock_placements` | Ubicación cerradura ↔ Core |
| `lock_access_actors` | Actores |
| `lock_access_groups` | Grupos de acceso |
| `lock_access_group_members` | Miembros de grupo |
| `lock_access_group_scopes` | Scopes de grupo |
| `lock_access_grants` | Accesos otorgados |
| `lock_credentials` | Credenciales (PIN, tarjeta, huella) |
| `lock_records` | Auditoría de eventos del proveedor |
| `lock_sync_commands` | Cola de comandos |
| `lock_notifications` | Notificaciones enviadas |
| `lock_claim_sessions` | Sesiones de reclamación de cerradura |
| `lock_provider_pools` | Shards de proveedor cloud |
| `lock_provider_pool_assignments` | Asignación cliente ↔ shard |
| `lock_gateways` | Gateways físicos o G2 |
| `lock_gateway_links` | Vínculo gateway ↔ cerradura |
| `lock_gateway_claim_sessions` | Sesiones de reclamación de gateway |

### 4.2 Excepción documentada: tabla `locks`

La tabla principal de cerraduras se llama `locks` (sin prefijo `lock_` repetido) por legibilidad, dado que es la entidad central del módulo y su nombre ya es inequívoco dentro del namespace. Esta es la única excepción aceptada. Ninguna tabla nueva puede acogerse a esta excepción sin revisión explícita de Solution Architecture.

### 4.3 Renombrado obligatorio antes de desplegar a BBDD

Antes de aplicar el schema a cualquier entorno, deben aplicarse estos renombrados sobre el diseño original (`locks-final-schema.sql`):

| Nombre original | Nombre final obligatorio |
|---|---|
| `provider_account_pools` | `lock_provider_pools` |
| `provider_account_assignments` | `lock_provider_pool_assignments` |
| `gateways` | `lock_gateways` |
| `gateway_lock_links` | `lock_gateway_links` |
| `gateway_claim_sessions` | `lock_gateway_claim_sessions` |

### 4.4 RLS obligatoria

Toda tabla `lock_*` debe tener RLS activa, filtrando por `client_account_id`, siguiendo el mismo patrón que el resto del Core (`get_my_client_account_id()`).

## 5. Casos Permitidos

- Una tabla `lock_*` puede tener múltiples FKs hacia distintas tablas del Core (ej. `lock_placements` referencia `rooms`, `accommodations` y `common_areas`).
- Una vista de solo lectura dentro del namespace `lock_*` que haga JOIN con tablas del Core para presentar datos combinados en UI.

## 6. Casos Prohibidos

- Crear cualquier columna en una tabla del Core que referencie `lock_*`.
- Nombrar una tabla nueva del módulo sin el prefijo `lock_` (salvo la excepción documentada en 4.2).
- Omitir RLS en una tabla `lock_*`.
- Crear una FK `ON DELETE CASCADE` desde el Core hacia SAL (no debería existir ninguna FK en ese sentido, por lo que este caso ni siquiera debería plantearse).

## 7. Impacto en Diseño

- Cualquier nueva funcionalidad que requiera "saber si una habitación tiene cerradura" debe resolverse con una consulta desde `lock_placements` hacia `rooms`, nunca añadiendo un campo a `rooms`.

## 8. Impacto en Implementación

- La migración de creación de schema debe incluir un test de verificación automática (`test-core-isolation-spec.md`) que falle si detecta una FK en sentido Core → SAL.
- `NOTIFY pgrst, 'reload schema';` obligatorio tras cualquier DDL de este módulo, según regla global del proyecto.

## 9. Dependencias

Depende de:
- `rules-00-scope-and-principles.md`
- `/docs/_commons/rules/architecture.md` (regla de oro de tenant-first y RLS obligatoria).

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`

## 10. Checklist de Validación

- [ ] Todas las tablas nuevas usan prefijo `lock_*` (salvo `locks`).
- [ ] Cero FKs Core → `lock_*`.
- [ ] RLS activa en todas las tablas `lock_*`.
- [ ] El renombrado de la sección 4.3 se aplicó antes del primer despliegue a BBDD.

## 11. Notas de Control de Cambios

Si en el futuro se decide fusionar alguna tabla `lock_*` con una tabla del Core (desaconsejado), requiere una nueva ADR/rule específica y aprobación de Solution Architecture, dado que rompe el principio de aislamiento total.
