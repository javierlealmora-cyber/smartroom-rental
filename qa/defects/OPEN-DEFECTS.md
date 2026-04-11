# Defectos Abiertos — SmartRent
**Fuente autoritativa** | Última actualización: 2026-04-07

---

## ✅ CERRADOS RECIENTEMENTE (2026-04-07)

### BUG-056 [MEDIA] — Modal "Cambiar habitación" no diferenciaba Check-Out y Check-In, sin validación de fechas ✅ CERRADO
**Cerrado:** 2026-04-07  
**Síntoma:** El modal de reasignación no mostraba la información fija del inquilino/habitación actual, no tenía sección de Check-Out separada, no validaba que la fecha de checkout >= hoy ni que la fecha de check-in > checkout, y no incluía selector de entidad para el alojamiento destino.  
**Fix aplicado:** Rediseño completo del modal en dos secciones (Check-Out / Check-In):  
- Check-Out: info fija (entidad, apartamento, habitación, precio), datepicker con `disabledDate >= hoy`, badge "Pte. Baja" automático  
- Check-In: select entidad → alojamiento filtrado → habitaciones libres con precio; datepicker con validación `> move_out_date`; checkbox "pagar hasta fin de mes" + campo importe prorrateado; fianza obligatoria  
- Modal compacto (`size="small"`, `maxHeight: 82vh`) para evitar scroll  
**Archivos modificados:** `src/pages/v2/admin/accommodations/AccommodationDetail.jsx`  
**Migración:** No requerida.

### BUG-055 [ALTA] — Modal "Cambiar habitación" no carga alojamientos ni habitaciones disponibles ✅ CERRADO
**Cerrado:** 2026-04-07  
**Síntoma:** Al abrir el modal de reasignación de habitación desde `AccommodationDetail`, el selector de alojamiento solo mostraba el alojamiento actual (hardcodeado). Al seleccionar un alojamiento, el selector de habitación mostraba "No hay datos" porque filtraba el estado local `rooms` (solo habitaciones del alojamiento actual).  
**Causa raíz:** El select de alojamiento usaba `options={[{ value: accId, label: accommodation?.name }]}` hardcoded. El select de habitación usaba `rooms.filter(r => r.accommodation_id === selectedAccId)` sobre un array local que nunca contenía habitaciones de otros alojamientos.  
**Fix aplicado:**  
- Añadidos 3 estados: `reassignAccommodations`, `reassignFreeRooms`, `loadingReassignRooms`  
- `afterOpenChange`: carga todos los alojamientos con `listAccommodations()` al abrir el modal  
- `onChange` del select de alojamiento: consulta Supabase para obtener habitaciones libres del alojamiento seleccionado (excluye `is_maintenance` y habitaciones con asignaciones activas)  
- Label de habitación incluye precio: `Hab. ${r.number} — ${formatCurrency(r.monthly_rent)}/mes`  
- Al seleccionar habitación → auto-rellena campo `monthly_rent` del formulario  
**Archivos modificados:** `src/pages/v2/admin/accommodations/AccommodationDetail.jsx`  
**Migración:** No requerida.

### BUG-054 [ALTA] — TenantDetail muestra estado calculado desde `onboarding_status` (campo BD estático) en lugar de `getLodgerStatus()` ✅ CERRADO
**Cerrado:** 2026-04-07  
**Síntoma:** El badge de estado en el detalle del inquilino mostraba el valor del campo `profiles.onboarding_status` (estático, nunca actualizado automáticamente), mientras que la lista de inquilinos calculaba el estado dinámicamente desde las asignaciones (`getLodgerStatus()`). Resultado: un inquilino podía aparecer como "Activo" en el detalle y como "Invitado" en la lista simultáneamente.  
**Causa raíz:** Dos fuentes de verdad distintas para el mismo estado. `TenantDetail` usaba `lodger.onboarding_status`; `TenantsList` usaba `getLodgerStatus(t)` (correcto).  
**Fix aplicado:** `TenantDetail` ahora importa y usa `getLodgerStatus(lodger)` + `getLodgerStatusLabel()`. Eliminada la constante local `STATUS_LABEL` duplicada.  
**Archivos modificados:** `src/pages/v2/admin/tenants/TenantDetail.jsx`  
**Migración:** No requerida — `profiles.onboarding_status` sigue existiendo en BD pero ya no se usa para mostrar el estado en UI. La fuente canónica es `getLodgerStatus()` (calculado desde `lodger_room_assignments`).

### BUG-053 [MEDIA] — Icono "Ver Consumos" activo para inquilinos en estado "Invitado" ✅ CERRADO
**Cerrado:** 2026-04-07  
**Síntoma:** El botón "Ver Consumos" (LineChartOutlined) en la lista de inquilinos estaba habilitado aunque el inquilino tuviese estado `invited`, sin asignación ni consumos  
**Fix aplicado:** `disabled={getLodgerStatus(t) === "invited"}` + tooltip descriptivo "Sin consumos (inquilino invitado)"  
**Archivos modificados:** `src/pages/v2/admin/tenants/TenantsList.jsx`

### BUG-052 [BAJA] — TenantDetail muestra imagen de cama ocupada aunque el inquilino no tenga habitación asignada ✅ CERRADO
**Cerrado:** 2026-04-07  
**Síntoma:** La foto inferior en el detalle del inquilino (`/detalle-inquilino`) mostraba siempre la imagen con inquilino en la cama, aunque el perfil no tuviese asignación activa  
**Fix aplicado:** `photoBottom` ahora comprueba `activeAssignment`: si no hay asignación → usa `"Habitación sin Inquilino en la cama.png"`; si hay asignación → imagen por género  
**Archivos modificados:** `src/pages/v2/admin/tenants/TenantDetail.jsx`

---

## ✅ CERRADOS RECIENTEMENTE (2026-04-06)

### BUG-051 [MEDIA] — `RoomsSearch.jsx` referencia columna `rooms.size_sqm` que no existe en BD ✅ CERRADO
**Cerrado:** 2026-04-06  
**Síntoma:** Error "column rooms.size_sqm does not exist" al cargar `/v2/admin/habitaciones` — 0 habitaciones mostradas  
**Causa:** La query de rooms en `RoomsSearch.jsx` incluía `size_sqm` pero la columna real en la tabla `rooms` se llama `square_meters` (definida en baseline_schema.sql)  
**Fix aplicado:** Eliminado `size_sqm` del campo `.select(...)` de la query a la tabla `rooms`  
**Archivos modificados:** `src/pages/v2/admin/rooms/RoomsSearch.jsx`  
**Migración:** No requerida — la BD estaba correcta, era un error de código

---

## ✅ CERRADOS RECIENTEMENTE (2026-03-28)

### BUG-038 [ALTA] — `getLodgerStatus()` siempre devuelve `'invited'` ✅ CERRADO
**Cerrado:** 2026-03-28  
**Fix aplicado:** Modificado `getLodgerStatus()` y `getActiveAssignment()` para aceptar tanto `assignments` como `active_assignment`  
**Archivos modificados:** `src/utils/lodgerStatus.js`

### BUG-037 [ALTA] — KPI de habitaciones mostraba 0 en todos los contadores ✅ CERRADO
**Cerrado:** 2026-03-28
**Fix aplicado:** Modificado `listAccommodations()` para incluir `current_assignments` y calcular `derivedStatus`. Actualizado `getStats()` para usar `derivedStatus`. Mismo fix aplicado en `EntityDetail.jsx` (mismo bug, encontrado en revisión). Corregidos también `AccommodationDetail.jsx:1533` y `LodgerServiceCreate.jsx:60` que filtraban por `r.status` en vez de `r.derivedStatus`.
**Archivos modificados:**
- `src/services/accommodations.service.js`
- `src/pages/v2/admin/accommodations/AccommodationsList.jsx`
- `src/pages/v2/admin/entities/EntityDetail.jsx` ← fix añadido en revisión
- `src/pages/v2/admin/accommodations/AccommodationDetail.jsx` ← filtro modal reasignación
- `src/pages/v2/admin/tenants/LodgerServiceCreate.jsx` ← filtro selector habitación

### BUG-032 [ALTA] — `EntityEdit.jsx` no pasa `clientAccountId` ✅ CERRADO
**Cerrado:** 2026-03-28  
**Fix aplicado:** Añadido `clientAccountId` en destructuring de `useAdminLayout()`  
**Archivos modificados:** `src/pages/v2/admin/entities/EntityEdit.jsx`

### BUG-035 [BAJA] — `destroyOnClose` deprecado en AntD v5 ✅ CERRADO
**Cerrado:** 2026-03-28  
**Fix aplicado:** Ya estaba corregido - usando `destroyOnHidden`  
**Archivos:** `src/pages/v2/admin/tenants/TenantsList.jsx`, `src/pages/v2/admin/tenants/TenantEdit.jsx`

### BUG-033 [CRÍTICO] — `TenantCreate.jsx` referencia variables fuera de scope ✅ CERRADO
**Cerrado:** 2026-03-29  
**Fix aplicado:** Añadidos callbacks a `RoomAssignmentForm` (`onRoomSelect`, `onRoomsChange`, `onPayUntilEndOfMonthChange`) para exponer `selectedRoomId`, `availableRooms` y `payUntilEndOfMonth` al componente padre `TenantCreate`  
**Archivos modificados:** `src/pages/v2/admin/tenants/components/RoomAssignmentForm.jsx`, `src/pages/v2/admin/tenants/TenantCreate.jsx`

### BUG-031 [ALTA] — `entities` tabla tiene `last_name2` y `gender` como NOT NULL ✅ CERRADO
**Cerrado:** 2026-03-29  
**Fix aplicado:** Migración SQL creada para hacer nullable ambas columnas  
**Archivos creados:** `supabase/migrations/schema/20260329120000_fix_entities_nullable_fields.sql`  
**Pendiente:** Ejecutar migración en Supabase Dashboard

### BUG-036 [ALTA] — Habitación queda "Ocupada" tras checkout en `TenantsList` ✅ CERRADO
**Cerrado:** 2026-03-29  
**Fix aplicado:** Implementado sistema de eventos personalizados. `TenantsList` emite evento `lodger-checkout` tras actualizar `move_out_date`. `AccommodationDetail` escucha el evento y recarga habitaciones cuando el evento corresponde a su alojamiento  
**Archivos modificados:** `src/pages/v2/admin/tenants/TenantsList.jsx`, `src/pages/v2/admin/accommodations/AccommodationDetail.jsx`

---

## 🔴 DEFECTOS ABIERTOS

---

### BUG-050 [CRÍTICO] — AccommodationDetail: error al guardar — columna `prevision_fund_electricity` no existe en la BD ✅ CERRADO

**Cerrado:** 2026-04-05  
**Módulo:** `src/pages/v2/admin/accommodations/AccommodationDetail.jsx:353-358`  
**Detectado:** 2026-04-02  
**Bloqueante para:** Cualquier edición de datos de alojamiento (tab "Datos del Alojamiento")

**Comportamiento observado:**  
Al pulsar "Guardar" en el formulario de edición del alojamiento aparecía el error:
```
Could not find the 'prevision_fund_electricity' column of 'accommodations' in the schema cache
```
El alojamiento **no se guardaba**. El error aparecía en el banner rojo de la pantalla.

**Causa raíz:**  
La migración `20260329120000_add_prevision_fund_to_accommodations.sql` que añade las columnas `prevision_fund_electricity`, `prevision_fund_water` y `prevision_fund_gas` a la tabla `accommodations` **estaba pendiente de ejecutar** en la base de datos de desarrollo.

**Fix aplicado:**
1. ✅ Ejecutada migración SQL en DEV (`lqwyyyttjamirccdtlvl`):
   ```sql
   ALTER TABLE public.accommodations
     ADD COLUMN IF NOT EXISTS prevision_fund_electricity NUMERIC(10,2) NOT NULL DEFAULT 0,
     ADD COLUMN IF NOT EXISTS prevision_fund_water       NUMERIC(10,2) NOT NULL DEFAULT 0,
     ADD COLUMN IF NOT EXISTS prevision_fund_gas         NUMERIC(10,2) NOT NULL DEFAULT 0;
   ```
2. ✅ Recargada caché de PostgREST: `NOTIFY pgrst, 'reload schema';`
3. ✅ Verificadas las 3 columnas creadas correctamente
4. ✅ Restaurado código de guardado en `AccommodationDetail.jsx:353-358`:
   ```javascript
   // Prevision fund — migración BUG-050 aplicada
   await supabase.from("accommodations").update({
     prevision_fund_electricity: values.prevision_electricity || 0,
     prevision_fund_water:       values.prevision_water || 0,
     prevision_fund_gas:         values.prevision_gas || 0,
   }).eq("id", accId).eq("client_account_id", clientAccountId);
   ```

**Migración creada:** `supabase/migrations/schema/20260402120000_add_prevision_fund_to_accommodations.sql`  
**Archivos modificados:** `src/pages/v2/admin/accommodations/AccommodationDetail.jsx`

**Estado:** Resuelto en DEV. Pendiente aplicar en Staging cuando se requiera.

---

### BUG-049 [ALTA] — `createEntity()` usa edge function `manage_entity` → mismo patrón 401 que BUG-047 ✅ CERRADO

**Cerrado:** 2026-04-02
**Fix aplicado:** Eliminada llamada a `invokeWithAuth("manage_entity")` en `entities.service.js`. Reemplazada con INSERT directo a tabla `entities`. Eliminados `invokeWithAuth` y `extractEdgeError` del archivo.
**Impacto:** Crear entidades owner/payer desde Configuración ya no puede causar 401/circuit-breaker.
**Archivos modificados:** `src/services/entities.service.js`

---

### BUG-048 [MEDIA] — `callWizardInit()` usa edge function `wizard_init` → innecesaria para un simple UPDATE ✅ CERRADO

**Cerrado:** 2026-04-02
**Fix aplicado:** Eliminada llamada a `invokeWithAuth("wizard_init")` en `clientAccounts.service.js`. Reemplazada con UPDATE directo a `profiles.onboarding_status = 'in_progress'` via `supabase.auth.getUser()` + query directa. Eliminada variable `FN_WIZARD_INIT`.
**Impacto:** Inicio del wizard de onboarding ya no depende de edge function.
**Archivos modificados:** `src/services/clientAccounts.service.js`

---

### BUG-047 [CRÍTICO] — Crear alojamiento: `manage_accommodation` devuelve 401, circuit breaker abre y redirige al login ✅ CERRADO

**Módulo:** `src/pages/v2/admin/accommodations/AccommodationCreate.jsx` + `supabase/functions/manage_accommodation/index.ts`
**Detectado:** 2026-04-02
**Bloqueante para:** Creación de alojamientos — el flujo completo queda bloqueado y el usuario pierde la sesión

**Comportamiento observado:**
1. Admin rellena el formulario de nuevo alojamiento y pulsa "Guardar".
2. `handleSubmit` (AccommodationCreate.jsx:109) → `createAccommodation` (accommodations.service.js:77) → `invokeWithAuth("manage_accommodation", {action:"create", payload:{...}})` (supabaseInvoke.services.js:382)
3. La edge function devuelve **HTTP 401 Unauthorized** (attempt 1).
4. `invokeWithAuth` detecta el 401, obtiene el token actual e intenta `refreshSessionSingleFlight()`.
5. El refresh devuelve `{name:'n', httpError:false, httpStatus:200, code:403}` — Supabase Auth acepta la petición HTTP (200) pero rechaza el refresh token (code 403 = token inválido/caducado).
6. El catch del refresh llama a `bumpAuthFailureAndMaybeOpenBreaker()` → circuit breaker abre → `broadcast("COOLDOWN")`.
7. `RequireAuth` detecta ausencia de sesión válida → redirige a `/v2/admin/auth/login`.
8. El alojamiento **no se crea** y el usuario pierde todo lo escrito en el formulario.

**Errores en consola (captura 2026-04-02):**
```
AccommodationCreate.jsx:151  Warning: [antd: InputNumber] 'addonAfter' is deprecated
POST .../functions/v1/manage_accommodation  401  — attempt 1
[invokeWithAuth] manage_accommodation error { message:'Edge Function returned non-2xx', status:401, body:{...}, attempt:1 }
POST .../functions/v1/manage_accommodation  401  — attempt 2
[invokeWithAuth] manage_accommodation error { ..., attempt:2 }
AccommodationCreate.jsx:323  Warning: [antd: Alert] 'message' is deprecated
[RequireAuth] Redirecting to login (no user) × 2
Uncaught (in promise) { name:'n', httpError:false, httpStatus:200, code:403 } × 2
Navigated to .../v2/admin/auth/login
```

**Stack trace completo:**
```
handleSubmit         @ AccommodationCreate.jsx:109
createAccommodation  @ accommodations.service.js:77
invokeWithAuth       @ supabaseInvoke.services.js:382
```

**Causa raíz identificada:**

La edge function `manage_accommodation` valida el JWT en la línea 27-28:
```typescript
const { data: { user }, error: userError } = await supabase.auth.getUser(token);
if (userError || !user) return err(ERROR_CODES.UNAUTHORIZED, "Authentication failed", 401);
```
El 401 proviene de `supabase.auth.getUser(token)` fallando — el **access token JWT ha caducado server-side**.

La sesión de React (AuthContext / localStorage) dice "usuario logado" pero Supabase ya invalidó el token. Cuando `invokeWithAuth` intenta renovar con el refresh token, Supabase responde HTTP 200 con `code:403` → el **refresh token también está caducado o fue revocado**.

**Posibles causas del doble caducado:**
1. El usuario lleva la sesión abierta más de lo que permite la configuración de Supabase (`JWT expiry` + `refresh token reuse interval`).
2. Un cambio en Supabase (rotación de JWT secret, invalidación manual de sesiones desde el dashboard) revocó todos los tokens existentes.
3. La pestaña del navegador estuvo en background demasiado tiempo y el SDK no pudo renovar automáticamente antes de que expirara.

**Impacto en UX:**
- El usuario pierde el formulario completo (paso 1 + paso 2 con habitaciones).
- No hay aviso previo de "sesión próxima a caducar".
- El mensaje de error `saveError` del catch nunca llega a mostrarse porque el circuit breaker fuerza logout antes.

**Warnings adicionales (no bloqueantes):**
- `AccommodationCreate.jsx:151` — `addonAfter` de `InputNumber` deprecado → reemplazar por `Space.Compact`
- `AccommodationCreate.jsx:323` — prop `message` de `Alert` deprecado → usar `title`

**Pasos para reproducir:**
1. Login como `admin.basic1@housingspacesolutions...`
2. Esperar a que la sesión lleve abierta un tiempo (o forzar expiración desde Supabase Dashboard)
3. Navegar a `/v2/admin/alojamientos/nuevo`, rellenar formulario completo
4. Pulsar "Guardar alojamiento"
5. Observar: 401 en Network → redirect a login, formulario perdido

**Prueba rápida para confirmar causa:**
- Si el error ocurre **justo después de un login fresco** → es un bug de la edge function (validación incorrecta)
- Si el error ocurre **solo tras varios minutos/horas sin actividad** → es expiración de sesión (problema de UX/config)

**Cerrado:** 2026-04-02
**Fix aplicado:** Eliminada la llamada a la edge function `manage_accommodation`. `createAccommodation` en `accommodations.service.js` reemplazada con llamadas directas a Supabase:
1. `INSERT` directo en tabla `accommodations` con el payload completo
2. Si hay habitaciones → `INSERT` directo en tabla `rooms` con `accommodation_id` y `client_account_id`
3. Eliminados `invokeWithAuth` y `extractEdgeError` del import (ya no se usan en este servicio)

La autorización la gestiona el RLS de Supabase (políticas `client_account_id` + rol). No hay pérdida de seguridad respecto a la edge function ya que RLS ya validaba tenant y rol.

**Estrategia:** Eliminación progresiva de edge functions — reemplazar con llamadas directas a Supabase donde RLS es suficiente.

**Archivos modificados:**
- `src/services/accommodations.service.js`

---

### BUG-046 [ALTA] — Configuración: falta tab "Entidad Propietaria" y tab "Entidad Pagadora" no filtra por type ✅ CERRADO

**Cerrado:** 2026-04-02
**Fix aplicado:**
- `load()` divide la query en dos paralelas: una con `.eq("type","payer")` y otra con `.eq("type","owner")`
- `handleSaveEntity()` refactorizado con helper `buildEntityPatch()` — siempre incluye `type:"payer"` al guardar; soporta CREATE si no existe payer
- `handleSaveOwner()` — nuevo handler para guardar/crear entidad owner via `updateEntity`/`createEntity`
- Nuevo tab **"Entidad Propietaria"** (con `HomeOutlined`) añadido antes del tab Entidad Pagadora; muestra formulario vacío con aviso informativo si no existe owner, formulario pre-relleno si existe
- Ambos tabs soportan crear (botón "Crear entidad") o editar (botón "Guardar entidad")
- Importados `HomeOutlined` y `{ createEntity, updateEntity }` de entities.service.js

**Archivos modificados:**
- `src/pages/v2/admin/settings/AdminSettings.jsx`

---

### BUG-045 [MEDIA] — Pricing muestra "NaN €" en Gestión de Planes (superadmin) ✅ CERRADO

**Cerrado:** 2026-04-02
**Fix aplicado:** Corregidos nombres de campo en `PlansList.jsx` líneas 347 y 351:
- `plan.price_monthly` → `plan.monthly_price`
- `plan.price_annual` → `plan.annual_price`

**Archivos modificados:**
- `src/pages/v2/superadmin/plans/PlansList.jsx`

---

### BUG-044 [MEDIA] — Páginas duplicadas para crear facturas de energía ✅ CERRADO

**Cerrado:** 2026-03-31
**Fix aplicado:** Implementado modal de selección de alojamiento para unificar el flujo de creación de facturas
**Archivos modificados:** 
- `src/components/modals/AccommodationSelectorModal.jsx` (nuevo)
- `src/pages/v2/admin/DashboardAdmin.jsx`
- `src/pages/v2/admin/DashboardAdminV3.jsx`
- `src/pages/v2/admin/energy/EnergyBillsList.jsx`
- `src/pages/v2/admin/accommodations/AccommodationDetail.jsx` (fix navegación)

**Solución implementada (Opción B):**
Creado componente `AccommodationSelectorModal` que:
- Muestra lista de alojamientos activos con búsqueda
- Permite seleccionar alojamiento
- Redirige a `/v2/admin/alojamientos/:id/habitaciones?tab=facturas&subtab=carga`
- Se abre desde todos los botones "Nueva Factura" (Dashboard, Lista de Facturas)

**Cambios realizados:**
1. **AccommodationSelectorModal.jsx** — Modal reutilizable con:
   - Lista de alojamientos con stats (ocupación, habitaciones)
   - Búsqueda por nombre, calle o ciudad
   - Navegación directa al tab de Facturas del alojamiento seleccionado
   - **Fix:** Ruta corregida a `/v2/admin/alojamientos/${accId}/habitaciones?tab=facturas&subtab=carga`

2. **AccommodationDetail.jsx** — Líneas 159-163:
   - **Fix:** Añadida lectura de parámetro `subtab` de la URL
   - Ahora `initialSubTab = searchParams.get("subtab")` para abrir el subtab correcto

3. **DashboardAdmin.jsx** — Línea 266:
   - Cambiado `path: "/v2/admin/energia/facturas/nueva"` → `action: () => setShowAccommodationModal(true)`

4. **DashboardAdminV3.jsx** — Línea 444:
   - Cambiado `path: "/v2/admin/energia/facturas/nueva"` → `action: () => setShowAccommodationModal(true)`

5. **EnergyBillsList.jsx** — Líneas 165, 216:
   - Cambiado `navigate("/v2/admin/energia/facturas/nueva")` → `setShowAccommodationModal(true)`

**Página antigua:** `EnergyBillCreate.jsx` puede eliminarse en futuras limpiezas (ruta `/v2/admin/energia/facturas/nueva` ya no se usa)

**Problema detectado y corregido:**
- Error inicial: Navegación a ruta incorrecta causaba que la app se cerrara
- Causa: Ruta `/v2/admin/alojamientos/:id` no existe en `App.jsx`
- Solución: Usar ruta correcta `/v2/admin/alojamientos/:accId/habitaciones` + lectura de parámetros URL

---

### BUG-043 [MEDIA] — Botón "Entrada Manual" deshabilitado en Carga de Facturas ✅ CERRADO

**Cerrado:** 2026-03-31
**Fix aplicado:** Eliminado `disabled={!file}` del botón "Entrada Manual" para permitir entrada manual sin necesidad de cargar archivo
**Archivos modificados:** `src/pages/v2/admin/accommodations/tabs/FacturasTab.jsx`
**Cambio realizado:** Línea 296 - Botón "Entrada Manual" ahora siempre habilitado

**Descripción del problema:**
El botón "Entrada Manual" en la pestaña "Facturas → Carga de Facturas" estaba deshabilitado hasta que el usuario cargara un archivo. Esto impedía la entrada manual directa de facturas sin necesidad de escaneo con IA.

**Causa raíz:**
El botón tenía la prop `disabled={!file}`, lo que requería que hubiera un archivo cargado antes de poder usar la entrada manual. Esto contradice el propósito del botón, que es permitir entrada manual como alternativa al escaneo.

**Comportamiento esperado:**
El botón "Entrada Manual" debe estar siempre habilitado para permitir al usuario introducir datos de facturas manualmente sin necesidad de cargar un archivo primero.

---

## BUG-042 [ALTA] — Campos de dirección y teléfono marcados como obligatorios incorrectamente

**Módulo:** `entities` tabla — campos de dirección y teléfono
**Test que detecta:** Manual — crear/editar entidad en `/v2/admin/settings` → tab "Entidad Pagadora"
**Detectado:** 2026-03-30
**Bloqueante para:** Creación/edición de entidades sin dirección completa

**Comportamiento observado:**
Al intentar guardar una entidad pagadora, los siguientes campos aparecen como obligatorios (asterisco rojo) aunque no deberían serlo:
- Género
- Teléfono
- Calle
- Número
- C.P.
- Provincia
- País

**Causa raíz:**
Inconsistencia entre el schema de base de datos y las validaciones del frontend:
- **Base de datos** (`baseline_schema.sql` líneas 176-187): Campos marcados como `NOT NULL`:
  - `gender text NOT NULL`
  - `phone text NOT NULL`
  - `country text NOT NULL`
  - `province text NOT NULL`
  - `city text NOT NULL`
  - `zip text NOT NULL`
  - `street text NOT NULL`
  - `street_number text NOT NULL`
- **Frontend** (`EntityFormFields.jsx`): Ninguno de estos campos tiene validación `required`

Esta inconsistencia causa que Ant Design muestre el asterisco rojo (porque detecta el NOT NULL de la BD) pero el formulario no valida antes de enviar.

**Campos que SÍ deben ser obligatorios:**
- `tax_id` (DNI/NIE/CIF) — identificación fiscal
- `billing_email` — email de facturación

**Fix requerido:**
Migración SQL para hacer opcionales los campos no críticos:
```sql
ALTER TABLE public.entities 
  ALTER COLUMN phone DROP NOT NULL,
  ALTER COLUMN country DROP NOT NULL,
  ALTER COLUMN province DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN zip DROP NOT NULL,
  ALTER COLUMN street DROP NOT NULL,
  ALTER COLUMN street_number DROP NOT NULL;
```

**Migración creada:** `supabase/migrations/schema/20260330000000_fix_entities_optional_fields.sql`
**Pendiente:** Ejecutar migración en Supabase Dashboard

**Pasos para reproducir:**
1. Navegar a `/v2/admin/settings` → tab "Entidad Pagadora"
2. Seleccionar tipo "Autónomo" o "Persona física"
3. Observar asteriscos rojos en Género, Teléfono, Calle, C.P., Provincia, País
4. Intentar guardar sin rellenar esos campos → error de BD por NOT NULL constraint

---

### BUG-041 [ALTA] — Formulario "Entidad Pagadora" sin validaciones ni adaptación por tipo ✅ CERRADO

**Cerrado:** 2026-03-30
**Fix aplicado:** Reemplazado formulario manual por componente `EntityFormFields` con validaciones completas y adaptación por tipo de entidad
**Archivos modificados:** `src/pages/v2/admin/settings/AdminSettings.jsx`
**Cambios realizados:**
- Importados `EntityFormFields` y `PROVINCIAS_ES`
- Añadido estado `entityLegalType` para controlar tipo seleccionado
- Reemplazados campos hardcodeados por `<EntityFormFields legalType={entityLegalType} showLegalTypeSelector={false} />`
- Actualizado `handleSaveEntity` para incluir `nickname` y `gender`
- Campo provincia cambiado de Input a Select con opciones de `PROVINCIAS_ES`
**Migración SQL:** No requerida (campos `nickname` y `gender` ya existen en schema baseline)

---

## BUG-040 [CRÍTICO] — Botón "Repartir" devuelve 403 al insertar boletines ✅ CERRADO

**Cerrado:** 2026-03-29
**Fix aplicado:** Ejecutadas las tres migraciones en dev:
- `supabase/migrations/security/20260328120000_fix_energy_bulletins_rls.sql` — políticas INSERT/DELETE para admin en `bulletins` y `energy_settlements`
- `supabase/migrations/schema/20260329000000_energy_settlements_daily.sql` — nuevo esquema diario de `energy_settlements`
- `supabase/migrations/schema/20260329120000_fix_entities_nullable_fields.sql` — nullable en `last_name2` y `gender`

~~**Módulo:** `supabase/migrations/baseline/00000000000003_baseline_rls.sql` — tabla `bulletins` y `energy_settlements`~~
~~**Detectado:** 2026-03-29~~
~~**Bloqueante para:** REQ-007 (reparto de facturas de suministros)~~

**Comportamiento observado:**
Al pulsar "Repartir" en `FacturasTab`:
1. Los `energy_settlements` se insertan correctamente ✓
2. El INSERT en `bulletins` devuelve HTTP 403 con mensaje:
   `"new row violates row-level security policy for table 'bulletins'"`
3. El reparto falla y la factura queda sin liquidar

**Causa raíz:**
La política RLS `bulletins_insert_policy` no existe o está incorrecta en el DB **live**. Con RLS activado y sin política INSERT, Supabase deniega todo por defecto.

El archivo baseline `00000000000003_baseline_rls.sql` define la política correcta, pero **nunca se aplicó** al proyecto remoto (o se perdió en un reseteo de la BD). Las migraciones locales no se pushean automáticamente al DB remoto.

Problema secundario: las políticas DELETE de `bulletins` y `energy_settlements` solo permiten `superadmin`, bloqueando al `admin` cuando intenta borrar repartos ("Borrar reparto") o hacer el cleanup idempotente antes de reinsertar.

**Fix requerido:**
Ejecutar el siguiente SQL en el Supabase Dashboard → SQL Editor
(`https://supabase.com/dashboard/project/lqwyyyttjamirccdtlvl/sql/new`):

```sql
-- bulletins INSERT para admin
DROP POLICY IF EXISTS "bulletins_insert_policy" ON public.bulletins;
CREATE POLICY "bulletins_insert_policy"
ON public.bulletins FOR INSERT TO authenticated
WITH CHECK (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- bulletins DELETE para admin
DROP POLICY IF EXISTS "bulletins_delete_policy" ON public.bulletins;
CREATE POLICY "bulletins_delete_policy"
ON public.bulletins FOR DELETE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);

-- energy_settlements DELETE para admin
DROP POLICY IF EXISTS "energy_settlements_delete_policy" ON public.energy_settlements;
CREATE POLICY "energy_settlements_delete_policy"
ON public.energy_settlements FOR DELETE TO authenticated
USING (
  get_my_role() = 'superadmin'
  OR (get_my_role() IN ('admin', 'agent') AND client_account_id = get_my_client_account_id())
);
```

El mismo SQL ya está en `supabase/migrations/security/20260328120000_fix_energy_bulletins_rls.sql`.

**Archivos de código ya corregidos (no requieren más cambios):**
- `src/services/energy.service.js` — `settleEnergyBill` y `unsettleEnergyBill` correctos
- `src/pages/v2/admin/accommodations/tabs/FacturasTab.jsx` — botón "Borrar reparto" correcto
- `supabase/migrations/baseline/00000000000003_baseline_rls.sql` — baseline actualizado
- `supabase/migrations/security/20260328120000_fix_energy_bulletins_rls.sql` — migración lista

**Pasos para reproducir:**
1. Ir a un alojamiento → tab Facturas → Lista de Facturas
2. Pulsar "Repartir" en cualquier factura con estado "Validada"
3. Confirmar en el Popconfirm → aparece error rojo "Error al crear boletines: new row violates..."
4. En DevTools: POST a `/rest/v1/bulletins` → 403 Forbidden

---

## BUG-039 [CRÍTICO] — Botón "Repartir" devuelve 401 y expulsa al usuario de la aplicación

**Módulo:** `supabase/functions/settle_energy_bill/index.ts` + `src/services/energy.service.js`
**Test que detecta:** `qa/unit/services/energy.service.test.js` (nuevo test "propaga el error cuando invokeWithAuth lanza por sesión caducada")
**Detectado:** 2026-03-28
**Bloqueante para:** REQ-007 (reparto de facturas)

**Comportamiento observado:**
Al pulsar "Repartir" en `FacturasTab`:
1. La Edge Function `settle_energy_bill` devuelve HTTP 401 (Unauthorized)
2. `invokeWithAuth` intenta `refreshSession()` → falla con `exceptions.UserAuthError`
3. Supabase dispara evento `SIGNED_OUT` internamente
4. `RequireAuth` detecta "no user" → redirige al login con `returnUrl`
5. Usuario expulsado de la aplicación aunque su sesión era aparentemente válida

**Causa raíz (dos componentes):**
- **C1 - Edge Function:** `auth.getUser(token)` en la Edge Function falla con 401. Posibles causas: (a) JWT caducado en el momento exacto del click, (b) desajuste entre variables de entorno de la Edge Function (`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`) y el proyecto real.
- **C2 - Comportamiento correcto pero confuso:** Cuando la sesión está genuinamente caducada, el logout es el comportamiento esperado. El usuario ve la pantalla de login con `returnUrl` para volver al alojamiento tras re-autenticarse.

**Evidencia en consola:**
```
POST .../functions/v1/settle_energy_bill 401 (Unauthorized)  attempt: 1
POST .../functions/v1/settle_energy_bill 401 (Unauthorized)  attempt: 2
Uncaught: { code: 403, msg: 'permission error', error: 'exceptions.UserAuthError' }
[RequireAuth] Redirecting to login (no user)
```

**Por qué los tests NO detectaban este bug:**
`invokeWithAuth` estaba mockeado al 100% en `energy.service.test.js`. Los tests de error simulaban `mockResolvedValue({ ok: false })` (path que NUNCA ocurre en producción porque la Edge Function devuelve HTTP 4xx, no HTTP 200 con ok=false). El path real — `invokeWithAuth` **lanza** (rejects) — nunca se testaba.

**Fix requerido:**
1. Verificar variables de entorno de la Edge Function desplegada: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
2. Confirmar que el proyecto Supabase en producción coincide con el de la Edge Function
3. Si el JWT expira justo en el momento del click: es comportamiento correcto (usuario re-autentica y vuelve)

**Tests añadidos (2026-03-28):**
- `qa/unit/services/energy.service.test.js` — 5 nuevos tests que verifican que `settleEnergyBill` propaga errores lanzados por `invokeWithAuth` (sesión caducada, 409 ya liquidada, 400 sin inquilinos, red/CORS, circuit breaker)

---

## Formato

```
## BUG-XXX [PRIORIDAD] — Título

**Módulo:** ruta/al/archivo.js
**Test que detecta:** qa/unit/... o tests/e2e/...
**Detectado:** YYYY-MM-DD
**Bloqueante para:** IDs de requisito (TEN-xx, ENE-xx…)

**Comportamiento observado:** …
**Causa raíz:** …
**Fix requerido:** …
**Pasos para reproducir:** …
```

Prioridades: `[CRÍTICO]` | `[ALTA]` | `[MEDIA]` | `[BAJA]`

---
