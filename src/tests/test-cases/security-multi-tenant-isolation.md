# Test Cases: Seguridad Multi-tenant - Aislamiento de Datos

**Fecha de creación:** 2026-03-26  
**Prioridad:** CRÍTICA  
**Relacionado con:** Correcciones C.1, C.2, C.3 del informe de auditoría

---

## Objetivo

Verificar que las correcciones implementadas para los hallazgos críticos de seguridad multi-tenant funcionan correctamente y previenen fugas de datos entre tenants.

---

## Pre-requisitos

- Base de datos con RLS habilitado
- Al menos 2 cuentas de tenant diferentes configuradas
- Usuarios de prueba para cada tenant
- Datos de prueba en las siguientes tablas:
  - `profiles` (inquilinos)
  - `lodger_room_assignments`
  - `energy_bills`
  - `energy_settlements`
  - `bulletins`

---

## TC-SEC-001: Query sin filtro client_account_id (C.1)

### Descripción
Verificar que la query en `TenantsList.jsx` incluye el filtro `client_account_id` y no permite acceso a asignaciones de otros tenants.

### Pre-condiciones
- Usuario autenticado como admin de Tenant A
- Existen asignaciones para inquilinos de Tenant A y Tenant B

### Pasos
1. Iniciar sesión como admin de Tenant A
2. Navegar a la página de lista de inquilinos (`/v2/admin/tenants`)
3. Inspeccionar las queries de red en DevTools
4. Verificar que la query a `lodger_room_assignments` incluye filtro `client_account_id`
5. Verificar que solo se muestran inquilinos de Tenant A

### Resultado esperado
- ✅ La query incluye `.eq("client_account_id", <tenant_a_id>)`
- ✅ Solo se muestran asignaciones de Tenant A
- ✅ No se muestran datos de Tenant B

### Criterios de aceptación
- La query debe incluir explícitamente el filtro `client_account_id`
- No debe ser posible ver asignaciones de otros tenants
- El código debe tener comentario `// ✅ SEGURIDAD: Filtro multi-tenant`

---

## TC-SEC-002: Bypass de RLS con query directa

### Descripción
Intentar acceder a asignaciones de otros tenants mediante query directa sin autenticación.

### Pre-condiciones
- Base de datos con RLS habilitado
- Existen asignaciones para múltiples tenants

### Pasos
1. Abrir consola de navegador sin autenticación
2. Ejecutar query directa a `lodger_room_assignments`:
   ```javascript
   const { data } = await supabase
     .from('lodger_room_assignments')
     .select('*');
   ```
3. Verificar respuesta

### Resultado esperado
- ✅ Query falla con error de RLS
- ✅ No se retornan datos
- ✅ Error indica política de seguridad

### Criterios de aceptación
- RLS debe bloquear acceso sin autenticación
- No debe ser posible obtener datos sin sesión válida

---

## TC-SEC-003: Query con OR en foreignTable (C.2)

### Descripción
Verificar que la función `listLodgers` no usa `.or()` en foreignTable y filtra asignaciones activas de forma segura.

### Pre-condiciones
- Usuario autenticado como admin
- Existen inquilinos con asignaciones activas e inactivas

### Pasos
1. Revisar código de `src/services/lodgers.service.js`
2. Verificar que no existe `.or()` con `foreignTable`
3. Ejecutar `listLodgers()` desde la aplicación
4. Verificar que solo retorna asignaciones activas
5. Verificar que el filtrado se hace en cliente

### Resultado esperado
- ✅ No existe `.or()` con `foreignTable` en el código
- ✅ El filtrado de asignaciones activas se hace en cliente
- ✅ Solo se retornan asignaciones sin `move_out_date` o con fecha futura
- ✅ Código tiene comentario `// ✅ SEGURIDAD: Query sin OR en foreignTable`

### Criterios de aceptación
- No debe haber queries con `.or()` en `foreignTable`
- El filtrado debe ser explícito y verificable
- No debe haber riesgo de bypass de RLS

---

## TC-SEC-004: Generación de contraseña en servidor (C.3)

### Descripción
Verificar que la creación de inquilinos usa Edge Function y no genera contraseñas en cliente.

### Pre-condiciones
- Usuario autenticado como admin
- Edge Function `manage_lodger` desplegada

### Pasos
1. Revisar código de `src/services/lodgers.service.js`
2. Verificar que `createLodger()` llama a Edge Function
3. Verificar que no existe `crypto.randomUUID()` en el código
4. Crear un nuevo inquilino desde la UI
5. Verificar en logs de Edge Function que se genera contraseña en servidor

### Resultado esperado
- ✅ `createLodger()` usa `invokeWithAuth("manage_lodger")`
- ✅ No existe generación de contraseña con `crypto.randomUUID()` en cliente
- ✅ Código tiene comentario `// ✅ SEGURIDAD: Usar Edge Function`
- ✅ Edge Function usa `admin.createUser()` sin contraseña explícita

### Criterios de aceptación
- No debe haber generación de contraseñas en código cliente
- Debe usar Edge Function para creación de usuarios
- Contraseñas deben generarse en servidor con alta entropía

---

## TC-SEC-005: RLS en lodger_room_assignments

### Descripción
Verificar que las políticas RLS en `lodger_room_assignments` previenen acceso no autorizado.

### Pre-condiciones
- RLS habilitado en tabla `lodger_room_assignments`
- Usuarios de Tenant A y Tenant B

### Pasos
1. Autenticarse como admin de Tenant A
2. Intentar insertar asignación con `client_account_id` de Tenant B:
   ```javascript
   const { error } = await supabase
     .from('lodger_room_assignments')
     .insert({
       client_account_id: '<tenant_b_id>',
       lodger_id: 'xxx',
       room_id: 'yyy',
       accommodation_id: 'zzz',
       move_in_date: '2026-01-01'
     });
   ```
3. Verificar que falla

### Resultado esperado
- ✅ Insert falla con error de política RLS
- ✅ No se crea registro en base de datos
- ✅ Error indica violación de política de seguridad

### Criterios de aceptación
- RLS debe prevenir inserción con `client_account_id` diferente
- Debe ser imposible crear datos para otros tenants

---

## TC-SEC-006: RLS en profiles

### Descripción
Verificar que las políticas RLS en `profiles` previenen acceso a perfiles de otros tenants.

### Pre-condiciones
- RLS habilitado en tabla `profiles`
- Perfiles de múltiples tenants en base de datos

### Pasos
1. Autenticarse como admin de Tenant A
2. Intentar query de todos los profiles:
   ```javascript
   const { data } = await supabase
     .from('profiles')
     .select('*')
     .eq('role', 'lodger');
   ```
3. Verificar que solo retorna profiles de Tenant A

### Resultado esperado
- ✅ Solo se retornan profiles con `client_account_id` de Tenant A
- ✅ No se exponen datos de otros tenants
- ✅ RLS filtra automáticamente por tenant

### Criterios de aceptación
- RLS debe filtrar automáticamente por `client_account_id`
- No debe ser posible ver perfiles de otros tenants

---

## TC-SEC-007: RLS en energy_bills

### Descripción
Verificar que las políticas RLS en `energy_bills` previenen acceso a facturas de otros tenants.

### Pre-condiciones
- RLS habilitado en tabla `energy_bills`
- Facturas de múltiples tenants

### Pasos
1. Autenticarse como admin de Tenant A
2. Intentar query de todas las facturas:
   ```javascript
   const { data } = await supabase
     .from('energy_bills')
     .select('*');
   ```
3. Verificar que solo retorna facturas de Tenant A

### Resultado esperado
- ✅ Solo se retornan facturas con `client_account_id` de Tenant A
- ✅ No se exponen facturas de otros tenants

### Criterios de aceptación
- RLS debe filtrar automáticamente por `client_account_id`
- Defensa en profundidad con filtros explícitos en queries

---

## TC-SEC-008: RLS en energy_settlements

### Descripción
Verificar que las políticas RLS en `energy_settlements` previenen acceso a liquidaciones de otros tenants.

### Pre-condiciones
- RLS habilitado en tabla `energy_settlements`
- Liquidaciones de múltiples tenants

### Pasos
1. Autenticarse como admin de Tenant A
2. Intentar query de todas las liquidaciones
3. Verificar que solo retorna liquidaciones de Tenant A

### Resultado esperado
- ✅ Solo se retornan liquidaciones de Tenant A
- ✅ No se exponen liquidaciones de otros tenants

---

## TC-SEC-009: RLS en bulletins

### Descripción
Verificar que las políticas RLS en `bulletins` previenen acceso a boletines de otros tenants.

### Pre-condiciones
- RLS habilitado en tabla `bulletins`
- Boletines de múltiples tenants

### Pasos
1. Autenticarse como admin de Tenant A
2. Intentar query de todos los boletines
3. Verificar que solo retorna boletines de Tenant A

### Resultado esperado
- ✅ Solo se retornan boletines de Tenant A
- ✅ No se exponen boletines de otros tenants

---

## TC-SEC-010: Defensa en profundidad - Filtros explícitos

### Descripción
Verificar que además de RLS, las queries incluyen filtros explícitos por `client_account_id`.

### Pre-condiciones
- Código fuente accesible

### Pasos
1. Revisar código de `TenantsList.jsx`
2. Buscar query a `lodger_room_assignments`
3. Verificar que incluye `.eq("client_account_id", clientAccountId)`
4. Verificar comentario de seguridad

### Resultado esperado
- ✅ Query incluye filtro explícito
- ✅ Comentario `// ✅ SEGURIDAD: Filtro multi-tenant` presente
- ✅ No se confía solo en RLS

### Criterios de aceptación
- Todas las queries críticas deben incluir filtros explícitos
- Defensa en profundidad implementada

---

## TC-SEC-011: Edge Functions para operaciones sensibles

### Descripción
Verificar que operaciones sensibles usan Edge Functions en lugar de queries directas.

### Pre-condiciones
- Edge Functions desplegadas

### Pasos
1. Revisar código de `lodgers.service.js`
2. Verificar que `createLodger` usa `invokeWithAuth("manage_lodger")`
3. Verificar que no hay operaciones sensibles en cliente

### Resultado esperado
- ✅ Creación de usuarios usa Edge Function
- ✅ Operaciones con service_role están en servidor
- ✅ Cliente solo usa queries con RLS

---

## TC-SEC-012: Test de integración - Flujo completo multi-tenant

### Descripción
Test E2E que verifica aislamiento completo entre dos tenants.

### Pre-condiciones
- 2 tenants configurados (A y B)
- Datos de prueba en ambos tenants

### Pasos
1. Crear inquilino en Tenant A
2. Crear asignación de habitación en Tenant A
3. Autenticarse como admin de Tenant B
4. Intentar acceder a datos de Tenant A
5. Verificar que no se puede acceder

### Resultado esperado
- ✅ Tenant B no puede ver inquilinos de Tenant A
- ✅ Tenant B no puede ver asignaciones de Tenant A
- ✅ Tenant B no puede modificar datos de Tenant A
- ✅ Aislamiento completo verificado

---

## Resumen de Ejecución

| Test Case | Estado | Notas |
|-----------|--------|-------|
| TC-SEC-001 | ⏳ Pendiente | Query con filtro client_account_id |
| TC-SEC-002 | ⏳ Pendiente | Bypass RLS sin autenticación |
| TC-SEC-003 | ⏳ Pendiente | Query sin OR en foreignTable |
| TC-SEC-004 | ⏳ Pendiente | Contraseña en servidor |
| TC-SEC-005 | ⏳ Pendiente | RLS lodger_room_assignments |
| TC-SEC-006 | ⏳ Pendiente | RLS profiles |
| TC-SEC-007 | ⏳ Pendiente | RLS energy_bills |
| TC-SEC-008 | ⏳ Pendiente | RLS energy_settlements |
| TC-SEC-009 | ⏳ Pendiente | RLS bulletins |
| TC-SEC-010 | ⏳ Pendiente | Defensa en profundidad |
| TC-SEC-011 | ⏳ Pendiente | Edge Functions |
| TC-SEC-012 | ⏳ Pendiente | Test E2E multi-tenant |

---

## Notas de Implementación

- Los tests TC-SEC-001 a TC-SEC-004 verifican las correcciones críticas C.1, C.2, C.3
- Los tests TC-SEC-005 a TC-SEC-009 verifican políticas RLS
- Los tests TC-SEC-010 a TC-SEC-012 verifican defensa en profundidad
- Se recomienda ejecutar en orden para verificación progresiva
- Algunos tests requieren configuración manual de usuarios de prueba

---

## Comandos de Ejecución

```bash
# Ejecutar tests de seguridad
npm run test src/tests/security/

# Ejecutar test específico
npm run test src/tests/security/multi-tenant-isolation.test.js

# Ejecutar con coverage
npm run test:coverage src/tests/security/
```
