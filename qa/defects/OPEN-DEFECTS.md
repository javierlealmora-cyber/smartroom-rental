# Defectos Abiertos — SmartRent
**Fuente autoritativa** | Última actualización: 2026-03-28

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

## BUG-033 [CRÍTICO] — `TenantCreate.jsx` referencia variables fuera de scope → ReferenceError en submit

**Módulo:** `src/pages/v2/admin/tenants/TenantCreate.jsx`
**Test que detecta:** `tests/e2e/specs/tenants.spec.js` (todos los tests TEN-05, TEN-06)
**Detectado:** 2026-03-24
**Bloqueante para:** TEN-05, TEN-06 (todos los E2E de creación/checkout de inquilinos)

**Comportamiento observado:**
Al hacer click en "Registrar Inquilino" aparece alerta roja:
`"selectedRoomId is not defined"` — el inquilino NUNCA se crea.

**Causa raíz:**
Durante un refactor, `selectedRoomId`, `availableRooms` y `payUntilEndOfMonth` se movieron
al estado interno de `RoomAssignmentForm` pero `onFinish` de `TenantCreate` las sigue
referenciando como locales (líneas ~95, 99, 100, 110, 117).

**Fix requerido:**
Opción A: añadir callbacks a `RoomAssignmentForm` (onRoomSelect, onRoomsChange, onPayUntilEomChange)
para exponer el estado al padre `TenantCreate`.

---

## BUG-036 [ALTA] — Habitación queda "Ocupada" tras checkout en `TenantsList`

**Módulo:** `src/pages/v2/admin/tenants/TenantsList.jsx` líneas 468-476
**Test que detecta:** qa/e2e (manual hasta que BUG-033 esté cerrado)
**Detectado:** 2026-03-25
**Bloqueante para:** ACC-02, ACC-03

**Comportamiento observado:**
Tras el checkout desde el modal, la habitación sigue mostrando badge "Ocupada" en
`AccommodationDetail` aunque no tenga ningún inquilino asignado.

**Causa raíz:**
El modal actualiza `lodger_room_assignments.move_out_date` pero nunca actualiza
`rooms.status`. No existe trigger que sincronice el campo.

**Fix requerido:**
Después del UPDATE de `lodger_room_assignments`, añadir UPDATE a `rooms`:
```js
const newRoomStatus = isToday ? 'free' : 'pending_checkout';
await supabase.from('rooms').update({ status: newRoomStatus }).eq('id', assignment.room?.id);
```

**Pasos para reproducir:**
1. Ir a `/v2/admin/inquilinos`
2. Checkout de un inquilino activo (icono LogoutOutlined → modal → Confirmar)
3. Ir al alojamiento → tab Habitaciones
4. Habitación muestra "Ocupada" aunque no tenga inquilino

---

## BUG-035 [BAJA] — `destroyOnClose` deprecado en AntD v5

**Módulo:** `src/pages/v2/admin/tenants/TenantsList.jsx` línea 440
**Test que detecta:** warning en consola (no hay test activo)
**Detectado:** 2026-03-25

**Error:** `Warning: [antd: Modal] 'destroyOnClose' is deprecated. Use 'destroyOnHidden'`

**Fix (1 línea):** cambiar `destroyOnClose` → `destroyOnHidden` en el `<Modal>`.

---

## GAP-ENE-10 [MEDIA] — Modo meter sin lecturas: fallo silencioso

**Módulo:** `supabase/functions/settle_energy_bill/index.ts` (~línea 130)
**Test que detecta:** `qa/e2e/specs/energy.spec.js` (marcado `test.fixme`)
**Detectado:** 2026-03-28

**Comportamiento observado:**
Si `split_mode = 'meter'` y no hay lecturas en `energy_readings`, `kwhTotal = 0`.
La función no devuelve error — todos los inquilinos reciben `variableShare = 0` silenciosamente.

**Fix requerido:**
Detectar `kwhTotal === 0 && splitMode === 'meter'` → devolver error 400 con mensaje claro,
o hacer fallback a `prorated` con un campo `warning` en la respuesta.

---

## BUG-032 [ALTA] — `EntityEdit.jsx` no pasa `clientAccountId` → UPDATE falla silenciosamente

**Módulo:** `src/pages/v2/admin/entities/EntityEdit.jsx` + `src/services/entities.service.js`
**Test que detecta:** `tests/e2e/specs/entities.spec.js` › 04 - editar entidad: actualizar teléfono
**Detectado:** 2026-03-24
**Bloqueante para:** flujo de edición de entidades

**Comportamiento observado:**
El UPDATE retorna error PostgREST (`client_account_id=eq.undefined` → invalid UUID syntax).
La excepción es capturada pero `navigate()` nunca se llama → la página no redirige.

**Causa raíz:**
`EntityEdit.jsx` línea 16 solo extrae `{ userName, companyBranding }` de `useAdminLayout()`,
omitiendo `clientAccountId`. La query recibe `undefined` → PostgREST lanza error 400.

**Fix requerido:**
```js
// EntityEdit.jsx línea 16
const { userName, companyBranding, clientAccountId } = useAdminLayout();
```

**Pasos para reproducir:**
1. Login como admin
2. Abrir cualquier entidad en `/v2/admin/entidades/{id}/editar`
3. Modificar cualquier campo → click "Guardar"
4. Observar: no hay redirección, error rojo en el formulario

---

## BUG-031 [ALTA] — `entities` tabla tiene `last_name2` y `gender` como NOT NULL → insert falla con 500

**Módulo:** `supabase/migrations/baseline/00000000000001_baseline_schema.sql` + `src/components/shared/EntityFormFields.jsx`
**Test que detecta:** `tests/e2e/specs/entities.spec.js` › 02 - crear nueva entidad (persona física)
**Detectado:** 2026-03-24
**Bloqueante para:** flujo de creación de entidades tipo persona física

**Comportamiento observado:**
Al crear entidad persona física sin rellenar "Apellido 2" y "Género" → alerta "Error creating entity" (HTTP 500).

**Causa raíz:**
En el schema `last_name2 text NOT NULL` y `gender text NOT NULL`.
En `EntityFormFields.jsx` ambos campos se muestran sin asterisco (opcionales).

**Fix requerido (dos opciones):**
- Opción A (preferida): Cambiar schema para admitir NULL: `last_name2 text`, `gender text`
- Opción B: Añadir `rules={[{ required: true }]}` en `EntityFormFields` para estos campos

**Pasos para reproducir:**
1. Navegar a `/v2/admin/entidades/nueva`
2. Seleccionar "Persona física"
3. Rellenar todos los campos EXCEPTO "Apellido 2" y "Género"
4. Click "Crear" → alerta roja "Error creating entity"
