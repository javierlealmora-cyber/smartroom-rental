# Defectos Cerrados — SmartRent Tests
Historial de bugs resueltos
Última actualización: 2026-03-23

---

## Formato de Defecto Cerrado

```
## BUG-XXX [PRIORIDAD] — Título descriptivo
**Módulo:** ruta/al/archivo.js
**Fecha de detección:** YYYY-MM-DD
**Fecha de resolución:** YYYY-MM-DD
**Resuelto por:** Cascade / Manual

**Problema:** Descripción del bug
**Solución:** Descripción de la corrección aplicada
**Commit:** hash del commit (si aplica)
```

---

## Historial

## BUG-030 [ALTA] — Tests de integración `plans.service.edge-cases.test.js` fallan en suite completa
**Módulo:** `src/services/__tests__/plans.service.edge-cases.test.js`
**Fecha de detección:** 2026-03-23
**Fecha de resolución:** 2026-03-23
**Resuelto por:** Cascade

**Problema:** Los 19 tests de `plans.service.edge-cases.test.js` pasaban al ejecutarse solos pero 16 de ellos fallaban cuando se ejecutaba la suite completa (`npx vitest run`). El error era siempre el mismo patrón en `createTestPlan`: "Error al crear plan: <mensaje de BD>". Los tests son de integración real (llaman a Supabase remoto) y cuando Vitest los ejecutaba en paralelo con otros test files que usan `vi.mock('../../services/supabaseClient')`, el mock de otros archivos interfería con el cliente real que este archivo necesita.

**Solución:** Añadido `vi.unmock('../supabaseClient')` al inicio del archivo (después de los imports de vitest) para desactivar explícitamente cualquier mock de supabaseClient que otros tests hayan configurado. Esto asegura que este archivo de tests de integración siempre use el cliente real de Supabase.

**Resultado:** Los 19 tests ahora pasan tanto en ejecución aislada como en la suite completa.

---

## BUG-029 [MEDIA] — Campos `street_number`, `floor` y `door` no se persisten en AccommodationEdit
**Módulo:** `src/pages/v2/admin/accommodations/AccommodationEdit.jsx`
**Fecha de detección:** 2026-03-22
**Fecha de resolución:** 2026-03-23
**Resuelto por:** Cascade

**Problema:** El formulario "Datos del Alojamiento" en `AccommodationEdit.jsx` define tres campos de dirección —`street_number` (Número), `floor` (Piso) y `door` (Puerta)— que **no existían como columnas en la tabla `accommodations`**. La función `onSaveAccommodation` solo guardaba `address_line1`, `address_line2`, `postal_code`, `city`, `province`, `notes`, `status`, `name` y `owner_entity_id`. Los valores introducidos en `street_number`, `floor` y `door` se descartaban silenciosamente al pulsar "Guardar Alojamiento". Adicionalmente, la función `load()` no restauraba estos campos al editar.

**Solución:**
1. Creada migración `20260323_add_address_detail_fields_to_accommodations.sql` para añadir las 3 columnas a la tabla `accommodations`
2. Ejecutada migración en DEV con `mcp0_apply_migration`
3. Actualizada función `onSaveAccommodation` para incluir `street_number`, `floor` y `door` en el objeto de actualización (líneas 90-92)
4. Actualizada función `load()` para restaurar estos campos al editar (líneas 66-68)

**Resultado:** Los campos de dirección desglosada ahora se guardan y restauran correctamente en la base de datos.

---

## BUG-024 [MEDIA] — Test `belongsToCompany()` usa `company_id` obsoleto en lugar de `client_account_id`
**Módulo:** `src/tests/auth/auth.service.test.js`
**Fecha de detección:** 2026-03-18
**Fecha de resolución:** 2026-03-19
**Resuelto por:** Cascade

**Problema:** Los tests de `belongsToCompany()` fallaban porque usaban objetos de perfil con la propiedad `company_id` (obsoleta), mientras que la función en `auth.service.js` ya había sido migrada para usar `client_account_id`. Esto causaba que la función devolviera `false` porque `profile.client_account_id` era `undefined`.

**Solución:** Actualizado el archivo de test `auth.service.test.js` para usar `client_account_id` en lugar de `company_id` en los tres casos de prueba de `belongsToCompany()`. La función en `auth.service.js` ya estaba correctamente implementada con `client_account_id`.

---

## BUG-023 [ALTA] — `setEndDate()` no valida que end_date sea posterior a start_date
**Módulo:** `src/services/plans.service.js`
**Fecha de detección:** 2026-03-18
**Fecha de resolución:** 2026-03-19
**Resuelto por:** Cascade

**Problema:** La función `setEndDate()` aceptaba cualquier fecha sin validar que fuera posterior a `start_date`, permitiendo crear planes con fechas inválidas (ej: end_date='2025-12-31' cuando start_date='2026-01-01'). Aunque `validatePlanData()` tenía la validación, esta solo se ejecutaba si ambas fechas estaban presentes en el objeto, y `setEndDate()` solo pasaba `{ end_date: endDate }`.

**Solución:** Agregada validación explícita en `setEndDate()` que:
1. Obtiene el plan actual con `getPlanById(id)` para acceder a `start_date`
2. Valida que `endDate > plan.start_date` antes de actualizar
3. Lanza `Error('end_date debe ser posterior a start_date')` si la validación falla

---

## BUG-022 [CRÍTICO] — `reassignRoom()` causa error 401 y expulsa al usuario al login
**Módulo:** `src/services/lodgers.service.js`
**Fecha de detección:** 2026-03-18
**Fecha de resolución:** 2026-03-18
**Resuelto por:** Cascade

**Problema:** Al asignar un inquilino a una habitación desde `AccommodationDetail.jsx`, la función `reassignRoom()` llamaba a la Edge Function `manage_lodger` que devolvía error 401 (Unauthorized). Esto activaba el circuit breaker de `invokeWithAuth`, que expulsaba al usuario al login destruyendo su sesión.

**Solución:** Convertida la función `reassignRoom()` de usar Edge Function a ejecutar queries directas a Supabase:
1. Obtener asignación actual del inquilino
2. Cerrar asignación anterior (status: "inactive", move_out_date)
3. Liberar habitación anterior (status: "free")
4. Crear nueva asignación (lodger_room_assignments)
5. Marcar nueva habitación como ocupada (status: "occupied")
6. Activar inquilino si estaba en estado "invited"

Este patrón evita depender de la Edge Function y ejecuta las operaciones directamente con RLS, similar a como se hizo con `updateLodger` y `setLodgerStatus`.

---

## BUG-021 [ALTA] — Botón "Nueva entidad" sin tooltip explicativo cuando se alcanza límite del plan
**Módulo:** `src/pages/v2/admin/entities/EntitiesList.jsx`
**Fecha de detección:** 2026-03-18
**Fecha de resolución:** 2026-03-18
**Resuelto por:** Cascade

**Problema:** El botón "+ Nueva entidad" se deshabilitaba correctamente cuando el usuario alcanzaba el límite de su plan (ej: Plan Basic con max_owners=1), pero no mostraba ningún tooltip explicativo al hacer hover, dejando al usuario sin información sobre por qué el botón estaba deshabilitado.

**Solución:** Agregado componente `Tooltip` envolviendo el botón con mensaje dinámico que explica el límite alcanzado: "Has alcanzado el límite de tu plan (máx. X entidad/es). Actualiza tu plan para añadir más." El tooltip solo se muestra cuando `limitReached === true`.

---

## BUG-014 [CRÍTICA] — TenantsList no extrae `clientAccountId` de `useAdminLayout` → lista de inquilinos vacía
**Módulo:** `src/pages/v2/admin/tenants/TenantsList.jsx`
**Fecha de detección:** 2026-03-16
**Fecha de resolución:** 2026-03-16
**Resuelto por:** Cascade

**Problema:** La lista de inquilinos aparecía completamente vacía porque `clientAccountId` no se extraía del hook `useAdminLayout()`, causando que la query a `listLodgers` se ejecutara sin filtro de tenant y fuera bloqueada por RLS.

**Solución:** Agregado `clientAccountId` a la desestructuración del hook en línea 40:
```js
const { userName, companyBranding, clientAccountId } = useAdminLayout();
```

---

## BUG-015 [CRÍTICA] — AccommodationDetail no filtra inquilinos por tenant en modal de asignación
**Módulo:** `src/pages/v2/admin/accommodations/AccommodationDetail.jsx`
**Fecha de detección:** 2026-03-16
**Fecha de resolución:** 2026-03-16
**Resuelto por:** Cascade

**Problema:** El modal de asignación de inquilino mostraba lista vacía porque la query a `profiles` no incluía filtro `client_account_id` y RLS bloqueaba el acceso.

**Solución:** 
1. Agregado `clientAccountId` a la desestructuración del hook en línea 79
2. Agregado filtro `.eq("client_account_id", clientAccountId)` en la query de `openAssignModal` (línea 204)
3. Actualizado `useCallback` para depender de `clientAccountId`

---

## BUG-016 [CRÍTICA] — AccommodationDetail no muestra el nombre del inquilino en cards de habitaciones ocupadas
**Módulo:** `src/pages/v2/admin/accommodations/AccommodationDetail.jsx`
**Fecha de detección:** 2026-03-16
**Fecha de resolución:** 2026-03-16
**Resuelto por:** Cascade

**Problema:** Las habitaciones ocupadas mostraban el badge "Ocupada" correctamente pero debajo aparecía "Sin inquilino asignado" en lugar del nombre del inquilino. La query a `profiles` para obtener datos de inquilinos no incluía los filtros `.eq("role", "lodger")` y `.eq("client_account_id", clientAccountId)`, causando que RLS bloqueara el acceso y `lodgersData` llegara vacío.

**Solución:** 
1. Agregado filtros `.eq("role", "lodger")` y `.eq("client_account_id", clientAccountId)` en la query de profiles (líneas 140-141)
2. Actualizado dependencias del `useCallback` de `load` para incluir `clientAccountId` (línea 195)

---

## BUG-017 [CRÍTICA] — AccommodationDetail: query de 3 pasos ensamblada manualmente falla en RLS
**Módulo:** `src/pages/v2/admin/accommodations/AccommodationDetail.jsx`
**Fecha de detección:** 2026-03-16
**Fecha de resolución:** 2026-03-16
**Resuelto por:** Cascade

**Problema:** Las habitaciones ocupadas mostraban "Sin inquilino asignado" porque el enfoque de 3 queries separadas (rooms → assignments → profiles) + ensamblado manual fallaba silenciosamente en algún paso de la cadena. Los errores se logueaban a consola pero no se propagaban, dejando `lodger = null`.

**Solución:** 
1. Reemplazado 3 queries separadas por un único JOIN: `rooms → lodger_room_assignments → profiles`
2. Eliminada query separada de rooms del Promise.all inicial
3. Normalizado active_assignment de array a objeto en el procesamiento
4. Eliminados logs de depuración obsoletos

Este patrón de JOIN directo es el mismo que usa `listLodgers` y funciona correctamente con RLS.

---

## BUG-018 [CRÍTICA] — JOIN de profiles en AccommodationDetail selecciona columnas inexistentes
**Módulo:** `src/pages/v2/admin/accommodations/AccommodationDetail.jsx`
**Fecha de detección:** 2026-03-16
**Fecha de resolución:** 2026-03-16
**Resuelto por:** Cascade

**Problema:** El fix de BUG-017 introdujo un JOIN que seleccionaba columnas inexistentes de `profiles` (`phone`, `status`), causando el error "column profiles_2.status does not exist" y dejando la pantalla de habitaciones vacía.

**Solución:** 
1. Cambiado select de profiles en JOIN de `(id, full_name, email, phone, status)` a `(*)` para usar wildcard (más robusto)
2. Actualizado render de datos del inquilino: `lodger.status` → `lodger.onboarding_status`

La tabla `profiles` solo tiene: `id, email, full_name, avatar_url, role, client_account_id, onboarding_status, is_primary_admin, created_at, updated_at`

---

## BUG-019 [CRÍTICA] — Edge Function `manage_lodger` no existe en el codebase
**Módulo:** `supabase/functions/manage_lodger/index.ts` (creado)
**Fecha de detección:** 2026-03-16
**Fecha de resolución:** 2026-03-16
**Resuelto por:** Cascade

**Problema:** Todas las operaciones de escritura sobre inquilinos (createLodger, updateLodger, setLodgerStatus, inviteLodger, reassignRoom, scheduleCheckout) llamaban a la Edge Function `manage_lodger` que no existía en el codebase, causando el error "Lodger not found" al intentar guardar cambios.

**Solución:** 
1. Creado `supabase/functions/manage_lodger/index.ts` siguiendo el patrón de `manage_accommodation`
2. Implementadas 6 acciones: create, update, set_status, invite, reassign_room, schedule_checkout
3. Validación completa de JWT, rol admin/superadmin, tenant y límites de plan
4. Desplegada función a Supabase con `npx supabase functions deploy manage_lodger --project-ref lqwyyyttjamirccdtlvl`

La función ahora permite crear, editar, cambiar estado, invitar, reasignar habitación y programar checkout de inquilinos con validación completa de seguridad y multi-tenant.

---

## BUG-020 [CRÍTICA] — `manage_lodger` devuelve 401 por usar SERVICE_ROLE_KEY para validar JWT de usuario
**Módulo:** `supabase/functions/manage_lodger/index.ts`
**Fecha de detección:** 2026-03-17
**Fecha de resolución:** 2026-03-17
**Resuelto por:** Cascade

**Problema:** La Edge Function `manage_lodger` devolvía 401 Unauthorized al intentar validar el JWT del usuario usando un cliente de Supabase creado con `SUPABASE_SERVICE_ROLE_KEY`. Esto causaba que `invokeWithAuth` activara el circuit breaker, enviara evento "COOLDOWN" y expulsara al usuario al login.

**Causa raíz:** El Service Role Key no puede validar JWTs de usuarios - solo puede bypassear RLS. La función intentaba usar `auth.getUser(token)` con un cliente configurado con Service Role Key, lo cual siempre falla con 401.

**Solución:** 
1. Separar la autenticación en dos pasos:
   - Crear cliente con `SUPABASE_ANON_KEY` para validar el JWT del usuario
   - Crear cliente con `SUPABASE_SERVICE_ROLE_KEY` para operaciones de base de datos
2. Re-desplegada función con el fix aplicado

**Patrón correcto implementado:**
```typescript
// Validar JWT con ANON_KEY
const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { data: { user } } = await supabaseAuth.auth.getUser(token);

// Operaciones DB con SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
```

Ahora la función valida correctamente la identidad del usuario mientras mantiene acceso privilegiado para las operaciones de base de datos.

---

<!-- Cascade moverá bugs resueltos aquí desde OPEN-DEFECTS.md -->
