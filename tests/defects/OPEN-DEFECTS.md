# Defectos Abiertos — SmartRent Tests
Última actualización: 2026-03-15

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

**✅ 8 de 9 bugs CORREGIDOS en esta sesión**

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
