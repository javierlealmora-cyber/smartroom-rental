# Defectos Abiertos — SmartRent Tests
Última actualización: 2026-03-22

---

## Instrucciones para Cascade

Este archivo contiene bugs detectados por Claude durante la ejecución de tests.
Cascade debe:
1. Leer este archivo para identificar bugs
2. Arreglar cada bug siguiendo el formato descrito
3. Mover el bug a CLOSED-DEFECTS.md cuando esté resuelto
4. Actualizar la fecha de "Última actualización"

---

## Formato de Defecto

```
## BUG-XXX [PRIORIDAD] — Título descriptivo
**Módulo:** ruta/al/archivo.js
**Test que falla:** nombre-del-test.test.js > describe > it
**Error obtenido:**
  Expected: valor esperado
  Received: valor recibido

**Comportamiento esperado:** Descripción clara del comportamiento correcto

**Pasos para reproducir:**
1. Paso 1
2. Paso 2
3. Observar error
```

---

## Defectos Pendientes

**0 bugs pendientes**

---

## BUG-026 [CERRADO] — Tests 38/39 (`admin-basic.spec.js`): el toggle de habitación no produce botón "Reactivar" → `AccommodationDetail` siempre muestra "Desactivar"

**Estado:** ✅ CORREGIDO (2026-03-22)
**Fix aplicado (Opción B):** Corregido `AccommodationDetail.jsx` líneas 329-333 para mostrar "Reactivar" cuando `status === "maintenance"` (además de `inactive`). El ciclo `free → maintenance → free` ahora muestra correctamente "Desactivar" → "Reactivar" → "Desactivar". Los tests 38 y 39 de `admin-basic.spec.js` ya funcionan con la nueva lógica.

**Módulo:** `tests/e2e/specs/admin-basic.spec.js` → tests 38 y 39
**Test que falla:**
- `38 - desactivar habitación libre (set_room_status → inactive)`
- `39 - reactivar habitación desactivada`
**Detectado:** 2026-03-22

**Error obtenido:**
```
Test 38 — línea 668:
  expect(page.getByRole('button', { name: /Reactivar/i })).toBeVisible()
  → TimeoutError: locator not found — el botón "Reactivar" nunca aparece

Test 39 — línea 683:
  const reactivarBtn = page.getByRole('button', { name: /Reactivar/i })
  → isVisible() === false → test se salta con anotación (false negative)
```

**Comportamiento esperado:**
El test cubre el ciclo completo desactivar ↔ reactivar de una habitación.

**Causa raíz:**
`AccommodationDetail.jsx` usa el ciclo de estados `free` ↔ `maintenance` (no `inactive`).
El botón de acción **siempre se llama "Desactivar"** independientemente del estado actual de la habitación — cuando una habitación está en mantenimiento, el botón sigue mostrando "Desactivar" para volver a `free`.
El nombre correcto del botón para la operación inversa en este componente es **"Desactivar"** también (toggle bidireccional con el mismo label), no "Reactivar".

**Fix sugerido:**
Opción A — Cambiar los tests para reflejar el comportamiento real:
```js
// Test 38: tras click "Desactivar", verificar que la habitación pasa a mantenimiento
// (verificar cambio visual de estado, no botón "Reactivar")
await expect(
  page.locator('text=/mantenimiento|maintenance/i').first()
).toBeVisible({ timeout: 10_000 });

// Test 39: buscar habitación en mantenimiento → click "Desactivar" de nuevo → vuelve a free
const desactivarBtn = page.getByRole('button', { name: /Desactivar/i }).first();
```

Opción B — Cambiar `AccommodationDetail.jsx` para que el botón muestre "Reactivar" cuando el estado es `maintenance`.

**Pasos para reproducir:**
1. `npx playwright test admin-basic.spec.js --project=regression-basic`
2. Tests 38 y 39 fallan/se saltan por `Reactivar` no encontrado

---

## BUG-028 [CERRADO] — `admin-basic.spec.js` carece de cobertura para CRUD de habitaciones desde la pestaña "Datos del Alojamiento" en `AccommodationDetail`

**Estado:** ✅ CORREGIDO (2026-03-22)
**Fix aplicado:** Añadidos 4 tests a `admin-basic.spec.js`:
- **Test 15b**: Añadir habitación desde pestaña "Datos del Alojamiento"
- **Test 15c**: Editar habitación (cambiar precio) desde pestaña "Datos del Alojamiento"
- **Test 18b**: Búsqueda de inquilinos filtra la lista y limpiar restaura resultados
- **Test 21b**: Asignar inquilino existente a habitación libre (modal "Buscar Inquilino Existente")

**Módulo:** `tests/e2e/specs/admin-basic.spec.js`
**Detectado:** 2026-03-22

**Descripción:**
El archivo `admin-basic.spec.js` cubre 43 tests pero le falta cobertura para tres flujos críticos que no están probados en ningún otro spec:

### Gap 1 — CRUD de habitaciones desde `AccommodationDetail` → pestaña "Datos del Alojamiento"
`AccommodationDetail` tiene un formulario inline para añadir/editar habitaciones (independiente de `AccommodationEdit`). No existe ningún test que:
- Añada una habitación desde el botón "+ Añadir Habitación" del sub-tab "Datos"
- Edite el nombre/precio de una habitación existente
- Verifique validaciones del formulario inline (campo `number` obligatorio, `monthly_rent` ≥ 0)

### Gap 2 — Búsqueda de inquilinos en `TenantsList`
El test 18 busca por `TENANT_LN` usando un input, pero no verifica que el resultado muestre solo los inquilinos coincidentes ni que borrar la búsqueda restaure la lista completa.

### Gap 3 — Reasignación de habitación (modal "Buscar Inquilino Existente")
`AccommodationDetail` tiene flujo de reasignación de habitación (modal de búsqueda de inquilino existente → formulario de nueva asignación). Este flujo crítico no está cubierto. El BUG-022 (cerrado) describe el 401 que ocurría; el fix ya está aplicado, pero no hay test de regresión.

**Comportamiento esperado:**
Estos tres flujos deben tener al menos un test happy-path para evitar regresiones.

**Fix sugerido:**
Añadir los siguientes tests al describe `Alojamientos` de `admin-basic.spec.js`:
- `'31b - añadir habitación desde pestaña Datos del alojamiento'`
- `'31c - editar habitación desde pestaña Datos del alojamiento'`
- `'31d - reasignar inquilino existente a habitación libre'`

Y en el describe `Inquilinos`:
- `'18b - búsqueda de inquilino filtra la lista correctamente'`

---

## BUG-023 [CERRADO] — `setEndDate` acepta `end_date` anterior a `start_date` sin validar

**Estado:** ✅ CORREGIDO (2026-03-19)
**Módulo:** `src/services/plans.service.js` → función `setEndDate()`
**Detectado:** 2026-03-18 — fallo en suite de tests automáticos
**Test que falla:** `src/services/__tests__/plans.service.edge-cases.test.js`
  → `Feature: Funciones setEndDate y toggleVisibility`
  → `Scenario: setEndDate rechaza fecha anterior a start_date`

**Error obtenido:**
```
AssertionError: promise resolved "{ …(33) }" instead of rejecting
Expected: [Error: 'end_date debe ser posterior a start_date']
Received: { end_date: "2025-12-31", start_date: "2026-01-01", ... }  ← escribe en DB sin validar
```

**Comportamiento esperado:**
`setEndDate(planId, '2025-12-31')` cuando el plan tiene `start_date = '2026-01-01'` debe lanzar:
```
throw new Error('end_date debe ser posterior a start_date')
```
antes de escribir en la base de datos.

**Comportamiento actual:**
La función escribe directamente en DB sin comprobar si `end_date >= start_date`. La DB tampoco tiene check constraint para esta regla, por lo que el update pasa sin error.

**Fix sugerido:**
En `setEndDate()` de `plans.service.js`, antes del `.update()`, añadir:
```js
// Obtener start_date del plan actual
const { data: plan } = await supabase
  .from('plans_catalog')
  .select('start_date')
  .eq('id', planId)
  .single();

if (plan?.start_date && endDate <= plan.start_date) {
  throw new Error('end_date debe ser posterior a start_date');
}
```

**Pasos para reproducir:**
1. `npx vitest run src/services/__tests__/plans.service.edge-cases.test.js`
2. Observar fallo en `setEndDate rechaza fecha anterior a start_date`

---

## BUG-024 [CERRADO] — `belongsToCompany()` devuelve `false` tras migrar `company_id` → `client_account_id`

**Estado:** ✅ CORREGIDO (2026-03-19)
**Módulo:** `src/tests/auth/auth.service.test.js` + `src/services/auth.service.js`
**Detectado:** 2026-03-18 — fallo en suite de tests automáticos
**Test que falla:** `src/tests/auth/auth.service.test.js`
  → `auth.service.js > belongsToCompany() > retorna true cuando el company_id del perfil coincide`

**Error obtenido:**
```
AssertionError: expected false to be true
  const profile = { id: 'u-1', company_id: 'comp-abc-123' }
  const result = await belongsToCompany('comp-abc-123', profile)
  expect(result).toBe(true)  ← recibe false
```

**Causa raíz:**
La columna `company_id` en `profiles` fue renombrada a `client_account_id` (commit `52d92aa`). La función `belongsToCompany()` en `auth.service.js` ahora compara contra `profile.client_account_id`, pero el test sigue pasando un objeto con `company_id`. La función devuelve `false` porque `profile.client_account_id` es `undefined`.

**Dos fixes necesarios (ambos):**

1. **Actualizar el test** en `src/tests/auth/auth.service.test.js`:
   ```js
   // Cambiar:
   const profile = { id: 'u-1', company_id: 'comp-abc-123' }
   // Por:
   const profile = { id: 'u-1', client_account_id: 'comp-abc-123' }
   ```

2. **Verificar la función** `belongsToCompany()` en `src/services/auth.service.js`:
   Confirmar que usa `profile.client_account_id` (no `profile.company_id`). Si aún usa `company_id`, actualizar.

**Pasos para reproducir:**
1. `npx vitest run src/tests/auth/auth.service.test.js`
2. Observar fallo en `belongsToCompany() > retorna true cuando el company_id del perfil coincide`

---

## BUG-021 [CERRADO] — Botón "Nueva entidad" activo para plan Basic cuando ya alcanzó el límite (max_owners=1)

**Estado:** ✅ CORREGIDO (2026-03-18)
**Módulo:** `src/pages/v2/admin/entities/EntitiesList.jsx`
**Detectado:** 2026-03-18

**Error observado:**
El botón "+ Nueva entidad" no mostraba tooltip explicativo cuando se alcanzaba el límite del plan.

**Fix aplicado:**
1. Verificado que la validación `limitReached` ya existía (líneas 64-66)
2. Verificado que el botón ya tenía `disabled={!canWrite || limitReached}` (línea 172)
3. Agregado `Tooltip` con mensaje explicativo cuando `limitReached === true`:
   ```jsx
   <Tooltip 
     title={limitReached ? `Has alcanzado el límite de tu plan (máx. ${maxOwners} entidad${maxOwners !== 1 ? 'es' : ''}). Actualiza tu plan para añadir más.` : undefined}
   >
     <Button type="primary" icon={<PlusOutlined />} disabled={!canWrite || limitReached}
       onClick={() => navigate("/v2/admin/entidades/nueva")}
       style={{ borderRadius: 20, fontWeight: 600, height: 38 }}>
       Nueva entidad
     </Button>
   </Tooltip>
   ```

**Resultado:** El botón ahora muestra un tooltip informativo al hacer hover cuando el usuario alcanza el límite de su plan.

---

## BUG-004 [CERRADO] — `cleanupTestPlans` no limpia todos los planes de prueba

**Estado:** ✅ CORREGIDO (2026-03-09 23:40)
**Fix aplicado:** Opción B - Lista explícita de códigos en `cleanupTestPlans()`

---

## BUG-005 [CERRADO] — Tests en paralelo se interfieren: `cleanupTestPlans` borra planes de otros tests

**Estado:** ✅ CORREGIDO (2026-03-09 23:52)
**Fix aplicado:** Opción B - Añadido `pool: 'forks', poolOptions: { forks: { singleFork: true } }` en `vitest.config.js` para forzar ejecución secuencial

---

## BUG-005-OLD [ALTA] — Tests en paralelo se interfieren (DESCRIPCIÓN ORIGINAL)

**Módulo:** `src/services/__tests__/plans.service.edge-cases.test.js`
**Test que falla:**
- `updated_at se actualiza automáticamente` → `Cannot coerce the result to a single JSON object`
- `toggleVisibility cambia de true a false` → `Cannot coerce the result to a single JSON object`
- `setEndDate rechaza fecha anterior a start_date` → mismo error
- `duplicatePlan cuando ya existe basic_copy_1` → `Plan no encontrado`
- `canModifyPlan retorna true si nadie usa el plan` → `Plan no encontrado`

**Error obtenido:**
```
Error al actualizar plan: Cannot coerce the result to a single JSON object
Error al duplicar plan: Plan no encontrado
Error al verificar uso del plan: Plan no encontrado
```

**Causa raíz:** Vitest ejecuta ambos ficheros de test (`plans.service.test.js` y `plans.service.edge-cases.test.js`) **en paralelo en workers separados**. El `afterEach(cleanupTestPlans)` de un fichero borra planes `TEST_*` que el otro fichero aún está usando. Al hacer `updatePlan(plan.id, ...)` sobre un plan ya borrado, Supabase retorna 0 filas y `.single()` lanza "Cannot coerce".

**Fix sugerido — elegir una opción:**
- **Opción A (recomendada):** Fusionar los dos ficheros en uno solo (`plans.service.test.js`) para eliminar el paralelismo entre ellos
- **Opción B:** Añadir al `vitest.config.js`: `pool: 'forks', poolOptions: { forks: { singleFork: true } }` para forzar ejecución secuencial
- **Opción C:** Añadir `describe.sequential(...)` en cada fichero, con `beforeAll/afterAll` en lugar de `afterEach`

**Pasos para reproducir:**
1. `npx vitest run plans.service.test.js plans.service.edge-cases.test.js` (ambos a la vez)
2. Los tests de edge-cases fallan aleatoriamente con "Plan no encontrado"

---

## BUG-006 [CERRADO] — `createPlan` con código duplicado no lanza excepción

**Estado:** ✅ CORREGIDO (2026-03-09 23:40)
**Fix aplicado:** Corregido `getPlanByCode` para buscar en UPPERCASE (`.toUpperCase()` en lugar de `.toLowerCase()`)

---

## BUG-007 [CERRADO] — `setEndDate` sigue envolviendo el error

**Estado:** ✅ CORREGIDO (2026-03-09 23:52)
**Fix aplicado:** BUG-005 resuelto (era el paralelismo de tests, no el wrapping). El fix original de `throw error` era correcto.

---

## BUG-008 [CERRADO] — `canModifyPlan` no incluye la propiedad `activeAccounts`

**Estado:** ✅ CORREGIDO (2026-03-09 23:40)
**Fix aplicado:** Renombrado `accountsCount` a `activeAccounts` en el objeto de retorno

---

## BUG-010 [CERRADO] — `getPlans({ search })` y `getPlans({ validToday })` no funcionan

**Estado:** ✅ CORREGIDO (2026-03-09 23:52)
**Fix aplicado:** Corregida sintaxis de query `.or()` en filtros `search` y `validToday`

---

## BUG-011 [CERRADO] — Formulario de edición envía `max_apt_users` en lugar de `max_accommodations`

**Estado:** ✅ CORREGIDO (2026-03-09 23:52)
**Fix aplicado:** Renombrado `max_apt_users` → `max_accommodations` en `PlanDetail.jsx` (líneas 91 y 172)

---

## BUG-012 [CERRADO] — Múltiples nombres de columna incorrectos en componentes de planes v2

**Estado:** ✅ CORREGIDO (2026-03-10 00:06)
**Fix aplicado:** Renombrado `max_associated_users` → `max_associated_admins` y eliminado `max_properties` en todos los componentes v2

---

## BUG-009 [CERRADO] — Validación de `max_*` rechaza `0`, bloqueando edición de planes

**Estado:** ✅ CORREGIDO (2026-03-09 23:40)
**Fix aplicado:** Separados campos `max_*` en dos grupos:
- `limitFieldsNoZero`: max_owners, max_accommodations, max_rooms, max_admin_users (valida `value !== -1 && value <= 0`)
- `limitFieldsAllowZero`: max_associated_admins, max_api_users, max_viewer_users (valida `value !== -1 && value < 0`)

---

## BUG-013 [CERRADO] — TenantProvider llama `whoami` sin token → 401 Unauthorized

**Módulo:** `src/providers/TenantProvider.jsx`
**Detectado:** 2026-03-15 — observado en consola del navegador en `/v2/admin/entidades`

**Error obtenido:**
```
POST https://<project>.supabase.co/functions/v1/whoami 401 (Unauthorized)  ×3
Uncaught (in promise) {name: 'n', httpError: false, httpStatus: 200, code: 403}
[RequireAuth] Redirecting to login (no user)
```

**Causa raíz:**
`TenantProvider.jsx:56` usaba `supabase.functions.invoke(fnName)` directamente, que no adjunta el header `Authorization: Bearer <token>` de forma explícita. La Edge Function `whoami` rechaza la petición con 401. La convención del proyecto exige usar `invokeWithAuth()` de `supabaseInvoke.services.js`, que obtiene un token fresco y lo inyecta en los headers.

**Comportamiento esperado:** `whoami` recibe el JWT y devuelve los datos del tenant correctamente.

**Estado:** ✅ CORREGIDO (2026-03-15)
**Fix aplicado:**
- Reemplazado `import { supabase }` por `import { invokeWithAuth }` en `TenantProvider.jsx`
- Reemplazado `supabase.functions.invoke(fnName)` por `invokeWithAuth(fnName)` en línea 56

---

## BUG-002 [CERRADO] — ESLint falla en create-auth-users-staging.js por env Node no declarado
**Módulo:** supabase/scripts/create-auth-users-staging.js
**Test que falla:** CI deploy-staging.yml > Comprehensive Tests > Lint code
**Error obtenido:**
  'console' is not defined (lines 14, 125, 149, 152, 156, 160, 166)
  'process' is not defined (lines 10, 11, 15)

**Comportamiento esperado:** El script es un Node.js script y debe tener acceso a `console` y `process`. El ESLint debe reconocerlo como entorno Node (env: node: true) ya sea via configuración global o via comentario `/* eslint-env node */` al inicio del archivo.

**Pasos para reproducir:**
1. `gh workflow run deploy-staging.yml --ref develop`
2. El job "Comprehensive Tests" falla en el step "Lint code"
3. Observar anotaciones: `'console' is not defined` y `'process' is not defined` en supabase/scripts/create-auth-users-staging.js

---

## BUG-003 [CERRADO] — npm audit encuentra vulnerabilidades high-severity bloqueando el deploy
**Módulo:** package.json / dependencias del proyecto
**Test que falla:** CI deploy-staging.yml > Security & Performance > Security audit
**Error obtenido:**
  `npm audit --audit-level=high` sale con exit code 1

**Comportamiento esperado:** Las dependencias no deben tener vulnerabilidades de severidad alta. Revisar con `npm audit` localmente e identificar qué paquete las introduce. Actualizar o reemplazar el paquete afectado.

**Pasos para reproducir:**
1. `npm audit --audit-level=high`
2. Observar la lista de vulnerabilidades high/critical
3. Resolver con `npm audit fix` o actualización manual de la dependencia afectada

<!-- Última ejecución: 2026-03-08 — workflow deploy-staging run #17 falló en lint + audit -->

---

## BUG-014 [CERRADO] — TenantsList no extrae `clientAccountId` de `useAdminLayout` → lista de inquilinos vacía

**Estado:** ✅ CORREGIDO (2026-03-16)
**Fix aplicado:** Agregado `clientAccountId` a la desestructuración del hook `useAdminLayout()` en línea 40

---

## BUG-015 [CERRADO] — AccommodationDetail no filtra inquilinos por tenant en modal de asignación

**Estado:** ✅ CORREGIDO (2026-03-16)
**Fix aplicado:**
1. Agregado `clientAccountId` a la desestructuración del hook en línea 79
2. Agregado filtro `.eq("client_account_id", clientAccountId)` en query de `openAssignModal`
3. Actualizado `useCallback` para depender de `clientAccountId`

---

## BUG-016 [CERRADO] — AccommodationDetail no muestra el nombre del inquilino en cards de habitaciones ocupadas

**Estado:** ✅ CORREGIDO (2026-03-16) — Fix parcial, ver BUG-017 para el problema raíz
**Fix aplicado:**
1. Agregado filtros `.eq("role", "lodger")` y `.eq("client_account_id", clientAccountId)` en query de profiles (líneas 140-141)
2. Actualizado dependencias del `useCallback` de `load` para incluir `clientAccountId` (línea 195)

---

## BUG-017 [CERRADO] — AccommodationDetail: query de 3 pasos ensamblada manualmente falla en RLS → rooms siguen mostrando "Sin inquilino asignado"

**Estado:** ✅ CORREGIDO (2026-03-16)
**Fix aplicado:**
1. Reemplazado 3 queries separadas (rooms + assignments + profiles) por un único JOIN en la query de rooms
2. Eliminada query separada de rooms del Promise.all inicial
3. Normalizado active_assignment de array a objeto en el procesamiento
4. Eliminados logs de depuración obsoletos

**Patrón usado:** JOIN directo `rooms → lodger_room_assignments → profiles` igual que en `listLodgers` (que funciona correctamente)

---

## BUG-018 [CERRADO] — JOIN de profiles en AccommodationDetail selecciona columnas inexistentes → crash "column profiles_2.status does not exist"

**Estado:** ✅ CORREGIDO (2026-03-16)
**Fix aplicado:**
1. Cambiado select de profiles en JOIN de `(id, full_name, email, phone, status)` a `(*)` para usar wildcard (línea 122)
2. Actualizado render de datos del inquilino: `lodger.status` → `lodger.onboarding_status` (líneas 798-799)

**Causa:** La tabla `profiles` no tiene columnas `status` ni `phone`. El wildcard `(*)` es más robusto y evita errores por columnas inexistentes.

---

## BUG-019 [CERRADO] — Edge Function `manage_lodger` no existe en el codebase → "Lodger not found" al guardar cambios de inquilino

**Estado:** ✅ CORREGIDO (2026-03-16)
**Fix aplicado:**
1. Creado `supabase/functions/manage_lodger/index.ts` con todas las acciones requeridas
2. Implementadas acciones: create, update, set_status, invite, reassign_room, schedule_checkout
3. Desplegada función a Supabase: `npx supabase functions deploy manage_lodger --project-ref lqwyyyttjamirccdtlvl`

**Patrón implementado:** Sigue el mismo patrón que `manage_accommodation` y `manage_entity` con validación de JWT, rol, tenant y límites de plan.

---

## BUG-020 [CERRADO] — `manage_lodger` devuelve 401 → `invokeWithAuth` dispara COOLDOWN → usuario expulsado al login

**Estado:** ✅ CORREGIDO (2026-03-17)
**Módulo:** `supabase/functions/manage_lodger/index.ts` (remote deploy)
**Detectado:** 2026-03-17 — al pulsar "Guardar Cambios" en edición de inquilino

**Síntomas observados en consola:**
```
POST https://lqwyyyttjamirccdtlvl.supabase.co/functions/v1/manage_lodger 401 (Unauthorized)
[invokeWithAuth] manage_lodger error {message: 'Edge Function returned non-2xx', status: 401, attempt: 1}
POST https://.../manage_lodger 401 (Unauthorized)
[invokeWithAuth] manage_lodger error {status: 401, attempt: 2}
[RequireAuth] Redirecting to login (no user)
```

**Cadena de fallos:**
1. `setLodgerStatus` → `invokeWithAuth("manage_lodger")` → HTTP 401
2. `invokeWithAuth` intenta `refreshSessionSingleFlight()` → también falla
3. `bumpAuthFailureAndMaybeOpenBreaker()` → `broadcast("COOLDOWN")` → circuit breaker abierto
4. `AuthProvider` escucha "COOLDOWN" → `supabase.auth.signOut()` → sesión destruida
5. `RequireAuth` detecta sin user → redirige a `/v2/admin/auth/login`

**Causa raíz:**
La Edge Function usaba `SUPABASE_SERVICE_ROLE_KEY` para crear el cliente de Supabase y luego intentaba validar el JWT del usuario con `auth.getUser(token)`. **El Service Role Key no puede validar JWTs de usuarios** - solo puede bypassear RLS.

**Solución aplicada:**
1. Separar la autenticación en dos pasos:
   - **Paso 1:** Usar `SUPABASE_ANON_KEY` para validar el JWT del usuario con `auth.getUser(token)`
   - **Paso 2:** Usar `SUPABASE_SERVICE_ROLE_KEY` para las operaciones de base de datos que requieren bypass de RLS
2. Re-desplegada función: `npx supabase functions deploy manage_lodger --project-ref lqwyyyttjamirccdtlvl`

**Patrón correcto:**
```typescript
// Validar JWT con ANON_KEY
const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { data: { user } } = await supabaseAuth.auth.getUser(token);

// Operaciones DB con SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
```

Este patrón permite validar correctamente la identidad del usuario mientras se mantiene acceso privilegiado para las operaciones de base de datos.

---

## BUG-022 [CERRADO] — `reassignRoom()` llama a `manage_lodger` via Edge Function → 401 → circuit breaker → expulsión al login

**Estado:** ✅ CORREGIDO (2026-03-18)
**Módulo:** `src/services/lodgers.service.js` → función `reassignRoom()`
**Detectado:** 2026-03-18 — captura de pantalla al guardar reasignación de habitación desde `AccommodationDetail.jsx`

**Síntomas observados en consola:**
```
POST https://lqwyyyttjamirccdtlvl.supabase.co/functions/v1/manage_lodger 401 (Unauthorized)
  at invokeWithAuth (supabaseInvoke.services.js:382)
  at onReassignFinish (AccommodationDetail.jsx:267)
[invokeWithAuth] manage_lodger error {status: 401, attempt: 1}
POST https://.../manage_lodger 401 (Unauthorized)
[invokeWithAuth] manage_lodger error {status: 401, attempt: 2}
[RequireAuth] Redirecting to login (no user)
```

**Flujo que falla:**
1. Admin asigna inquilino existente a habitación libre desde modal en `AccommodationDetail`
2. `onReassignFinish()` (línea 264) llama a `reassignRoom(lodgerId, { newRoomId, ... })`
3. `reassignRoom()` en `lodgers.service.js` invoca `invokeWithAuth("manage_lodger", { action: "reassign_room" })`
4. La Edge Function devuelve **401 Unauthorized**
5. `invokeWithAuth` dispara circuit breaker → `broadcast("COOLDOWN")` → `supabase.auth.signOut()`
6. `RequireAuth` detecta sin sesión → redirige a `/v2/admin/auth/login`

**Causa raíz:**
Mismo patrón que BUG-020: `manage_lodger` sigue devolviendo 401 para la acción `reassign_room`. Aunque BUG-020 documentó el fix de ANON_KEY/SERVICE_ROLE, la función `reassignRoom()` en `lodgers.service.js` aún llama a la Edge Function. Las funciones `updateLodger` y `setLodgerStatus` ya fueron migradas a queries directas como solución alternativa.

**Comportamiento esperado:**
Al confirmar la reasignación, el inquilino queda asignado a la nueva habitación y la UI se actualiza sin expulsar al usuario.

**Fix sugerido — convertir `reassignRoom` a queries directas (igual que `updateLodger`):**

La reasignación requiere 5 operaciones atómicas. Se sugiere usar una función RPC de Postgres o ejecutar las queries en secuencia:

```js
// En lodgers.service.js — reemplazar reassignRoom()
export async function reassignRoom(lodgerId, { newRoomId, newAccommodationId, moveInDate, billingStartDate, monthlyRent }) {
  // 1. Cerrar asignación activa actual
  const { error: e1 } = await supabase
    .from("lodger_room_assignments")
    .update({ move_out_date: moveInDate, status: "ended" })
    .eq("lodger_id", lodgerId)
    .eq("status", "active");
  if (e1) throw new Error(e1.message);

  // 2. Liberar habitación anterior (buscar cuál era)
  // (opcional: la habitación anterior pasará a 'free' cuando ya no tenga asignaciones activas)

  // 3. Crear nueva asignación
  const { error: e2 } = await supabase
    .from("lodger_room_assignments")
    .insert({
      lodger_id: lodgerId,
      room_id: newRoomId,
      accommodation_id: newAccommodationId,
      move_in_date: moveInDate,
      billing_start_date: billingStartDate || moveInDate,
      monthly_rent: monthlyRent || null,
      status: "active",
    });
  if (e2) throw new Error(e2.message);

  // 4. Marcar nueva habitación como ocupada
  const { error: e3 } = await supabase
    .from("rooms")
    .update({ status: "occupied" })
    .eq("id", newRoomId);
  if (e3) throw new Error(e3.message);

  // 5. Activar inquilino
  const { error: e4 } = await supabase
    .from("profiles")
    .update({ onboarding_status: "active" })
    .eq("id", lodgerId);
  if (e4) throw new Error(e4.message);
}
```

**Alternativa más robusta:** Crear una función RPC en Postgres (`reassign_lodger_room`) que ejecute las 5 operaciones en una única transacción, y llamarla con `supabase.rpc("reassign_lodger_room", { ... })`.

**Pasos para reproducir:**
1. Logarse como Admin Basic (`admin.basic1@housingspacesolutions.cc`)
2. Navegar a un alojamiento → pestaña Habitaciones
3. En una habitación libre, clicar "Buscar Inquilino Existente"
4. Seleccionar un inquilino existente → redirige a TenantEdit o abre modal de reasignación
5. Completar el formulario y pulsar "Confirmar reasignación"
6. Observar 401 en consola y redirección al login

---

## BUG-025 [CERRADO] — Test 17 (`admin-basic.spec.js`): campos obligatorios `last_name2`, `document_id`, `gender` no se rellenan → el formulario de creación de inquilino falla

**Estado:** ✅ CORREGIDO (2026-03-22 12:50)
**Módulo:** `tests/e2e/specs/admin-basic.spec.js` → test 17 (líneas 313-320)
**Detectado:** 2026-03-22

**Fix aplicado:**
Añadidos los campos obligatorios faltantes en el test:
```js
await page.locator('#last_name2').fill('ApellidoE2E');
await page.locator('#document_id').fill('12345678Z');
await antdSelect(page, 'gender', 'male');
```

---

## BUG-027 [CERRADO] — Test 41 (`admin-basic.spec.js`): selector `.ant-tabs-tab` obsoleto en AntD v6 → la pestaña "Facturas" no se encuentra

**Estado:** ✅ CORREGIDO (2026-03-22 12:50)
**Módulo:** `tests/e2e/specs/admin-basic.spec.js` → test 41 (línea 732)
**Detectado:** 2026-03-22

**Fix aplicado:**
Reemplazado selector obsoleto por API de roles de AntD v6:
```js
// Antes (AntD v5, obsoleto):
const facturasTab = page.locator('.ant-tabs-tab').filter({ hasText: /Factura/i });

// Después (AntD v6):
const facturasTab = page.getByRole('button', { name: /Factura/i });
```
