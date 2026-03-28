# REQ-002: Gestión de Tenants y Ciclo de Vida

**Estado:** ✅ Implementado y Consolidado  
**Última actualización:** 2026-03-28  
**Versión:** 1.0

---

## Objetivo

Gestionar el ciclo de vida completo de cuentas de cliente (tenants), alojamientos y habitaciones en un sistema multi-tenant con aislamiento total de datos.

---

## Alcance

### Incluye
- Creación y gestión de cuentas de cliente (tenants)
- Gestión de alojamientos (accommodations)
- Gestión de habitaciones (rooms)
- Aislamiento de datos por tenant (RLS)
- Activación/desactivación de recursos
- Historial de cambios

### No Incluye
- Facturación de suscripciones (Stripe)
- Gestión de planes (catálogo)
- Migración entre planes
- Eliminación física de datos (soft delete)

---

## Reglas Actuales

### Multi-Tenancy

#### Principio Fundamental
**Cada tenant es completamente independiente y sus datos están aislados de otros tenants.**

#### Implementación
- Todas las tablas principales incluyen `client_account_id`
- Row Level Security (RLS) habilitado en todas las tablas
- Políticas RLS filtran por `client_account_id`
- Usuario solo ve datos de su tenant

#### Roles por Tenant
- **Admin:** Acceso completo a su tenant
- **Agent:** Acceso limitado a su tenant
- **Lodger:** Sin acceso a gestión

### Client Accounts (Tenants)

#### Estados
- `active` - Cuenta activa y operativa
- `suspended` - Suspendida temporalmente
- `cancelled` - Cancelada (soft delete)

#### Campos Principales
```
- id (UUID)
- name (TEXT) - Nombre de la empresa/tenant
- plan_code (TEXT) - Plan de suscripción
- status (TEXT) - Estado actual
- created_at, updated_at
- deactivated_at - Fecha de desactivación
```

#### Reglas
- Un tenant puede tener múltiples alojamientos
- Un tenant puede tener múltiples usuarios (admin, agent)
- Límites según plan de suscripción:
  - max_accommodations
  - max_rooms
  - max_admin_users

### Accommodations (Alojamientos)

#### Estados
- `active` - Alojamiento operativo
- `inactive` - Desactivado temporalmente

#### Campos Principales
```
- id (UUID)
- client_account_id (UUID) - Tenant propietario
- name (TEXT) - Nombre del alojamiento
- address_street, address_number, address_floor, address_door
- address_city, address_state, address_postal_code
- status (TEXT)
- created_at, updated_at
- deactivated_at
```

#### Reglas
- Un alojamiento pertenece a un único tenant
- Un alojamiento puede tener múltiples habitaciones
- No se puede eliminar si tiene habitaciones activas
- Desactivación es soft delete (mantiene historial)

### Rooms (Habitaciones)

#### Estados Derivados
El estado de una habitación se calcula dinámicamente:
- `free` - Disponible para asignar
- `occupied` - Ocupada por inquilino
- `pending_checkout` - Inquilino con fecha de salida futura
- `maintenance` - En mantenimiento

#### Campos Principales
```
- id (UUID)
- accommodation_id (UUID)
- client_account_id (UUID)
- number (TEXT) - Número de habitación
- monthly_rent (DECIMAL)
- electricity_amount (DECIMAL)
- square_meters (DECIMAL)
- bathroom_type (TEXT) - suite/private/shared
- kitchen_type (TEXT) - suite/private/shared
- lock_code (TEXT)
- notes (TEXT)
- is_maintenance (BOOLEAN)
- created_at, updated_at
```

#### Reglas
- Una habitación pertenece a un único alojamiento
- Estado se deriva de:
  - `is_maintenance` = true → `maintenance`
  - Tiene asignación activa → `occupied`
  - Tiene asignación con move_out_date futura → `pending_checkout`
  - Sin asignación → `free`
- No se puede eliminar si tiene historial de asignaciones

---

## Casos Válidos

### CV-001: Crear Alojamiento
**Precondiciones:**
- Usuario con rol admin
- Tenant no ha alcanzado límite de alojamientos

**Flujo:**
1. Admin accede a "Alojamientos"
2. Click en "Nuevo Alojamiento"
3. Completa formulario (nombre, dirección)
4. Click en "Guardar"
5. Sistema crea alojamiento con status 'active'

**Resultado esperado:** Alojamiento creado y visible en listado

---

### CV-002: Crear Habitación
**Precondiciones:**
- Alojamiento existente y activo
- Usuario con rol admin

**Flujo:**
1. Admin accede a alojamiento
2. Click en "Nueva Habitación"
3. Completa formulario (número, precio, tipo baño/cocina)
4. Click en "Guardar"
5. Sistema crea habitación

**Resultado esperado:** Habitación creada con estado 'free'

---

### CV-003: Desactivar Alojamiento
**Precondiciones:**
- Alojamiento sin habitaciones ocupadas

**Flujo:**
1. Admin accede a alojamiento
2. Click en "Desactivar"
3. Confirma acción
4. Sistema marca status = 'inactive' y deactivated_at = NOW()

**Resultado esperado:** Alojamiento desactivado, no aparece en listados activos

---

### CV-004: Consultar Disponibilidad de Habitaciones
**Precondiciones:**
- Alojamiento con habitaciones

**Flujo:**
1. Admin accede a alojamiento
2. Sistema muestra listado de habitaciones
3. Cada habitación muestra estado derivado

**Resultado esperado:** Estados correctos según asignaciones

---

### CV-005: Aislamiento Multi-Tenant
**Precondiciones:**
- Dos tenants diferentes con datos

**Flujo:**
1. Usuario de Tenant A hace login
2. Accede a alojamientos
3. Sistema solo muestra alojamientos de Tenant A

**Resultado esperado:** Usuario no ve datos de otros tenants

---

## Casos Inválidos

### CI-001: Crear Alojamiento Excediendo Límite
**Flujo:**
1. Tenant con plan Basic (max 3 alojamientos)
2. Ya tiene 3 alojamientos
3. Intenta crear cuarto alojamiento

**Resultado esperado:** Error "Límite de alojamientos alcanzado"

---

### CI-002: Desactivar Alojamiento con Habitaciones Ocupadas
**Flujo:**
1. Admin intenta desactivar alojamiento
2. Alojamiento tiene habitaciones con inquilinos activos

**Resultado esperado:** Error "No se puede desactivar con habitaciones ocupadas"

---

### CI-003: Acceso Cross-Tenant
**Flujo:**
1. Usuario de Tenant A intenta acceder a alojamiento de Tenant B
2. Sistema valida client_account_id

**Resultado esperado:** Error 403 Forbidden o redirección

---

## Impacto Frontend

### Componentes Principales
- `src/pages/Accommodations.jsx` - Listado de alojamientos
- `src/pages/AccommodationDetail.jsx` - Detalle de alojamiento
- `src/pages/Rooms.jsx` - Gestión de habitaciones
- `src/components/Accommodation/AccommodationForm.jsx`
- `src/components/Room/RoomForm.jsx`
- `src/components/Room/RoomCard.jsx`

### Flujos de Usuario
1. **Gestión de Alojamientos:**
   - Listado con filtros
   - Crear/Editar
   - Activar/Desactivar
   - Ver detalle con habitaciones

2. **Gestión de Habitaciones:**
   - Listado por alojamiento
   - Crear/Editar
   - Ver estado derivado
   - Marcar en mantenimiento

### Estado Global
```javascript
// Alojamientos
accommodations: [
  {
    id, name, address, status,
    rooms_count, occupied_rooms_count
  }
]

// Habitaciones
rooms: [
  {
    id, number, monthly_rent,
    derived_status, current_lodger
  }
]
```

---

## Impacto Base de Datos

### Tablas Involucradas

#### client_accounts
```sql
- id (UUID, PK)
- name (TEXT)
- plan_code (TEXT, FK a plans_catalog)
- status (TEXT)
- created_at, updated_at
- deactivated_at (TIMESTAMPTZ)
```

#### accommodations
```sql
- id (UUID, PK)
- client_account_id (UUID, FK)
- name (TEXT)
- address_* (campos de dirección)
- status (TEXT)
- created_at, updated_at
- deactivated_at (TIMESTAMPTZ)
```

#### rooms
```sql
- id (UUID, PK)
- accommodation_id (UUID, FK)
- client_account_id (UUID, FK)
- number (TEXT)
- monthly_rent (DECIMAL)
- bathroom_type, kitchen_type (TEXT)
- is_maintenance (BOOLEAN)
- created_at, updated_at
```

### Funciones SQL

#### get_room_derived_status(room_id)
```sql
-- Calcula estado derivado de habitación
-- Retorna: 'free', 'occupied', 'pending_checkout', 'maintenance'
```

### Políticas RLS

#### Patrón Estándar (todas las tablas)
```sql
CREATE POLICY "table_select_by_tenant"
ON table_name FOR SELECT
USING (client_account_id = get_my_client_account_id());

CREATE POLICY "table_insert_by_tenant"
ON table_name FOR INSERT
WITH CHECK (client_account_id = get_my_client_account_id());

-- Similar para UPDATE y DELETE
```

**Total políticas:** 67 políticas RLS activas

### Migraciones Relacionadas
- `00000000000001_baseline_schema.sql` - Tablas iniciales
- `00000000000003_baseline_rls.sql` - Políticas RLS
- `20260323110000_add_address_detail_to_accommodations.sql` - Campos de dirección

---

## Tests Asociados

### Tests E2E
- 🟡 `tests/e2e/accommodation-crud.spec.js` - CRUD alojamientos (parcial)
- 🟡 `tests/e2e/room-crud.spec.js` - CRUD habitaciones (parcial)
- ❌ `tests/e2e/multi-tenant-isolation.spec.js` - Aislamiento (falta)

### Tests de Seguridad
- 📝 `tests/test-cases/security-multi-tenant-isolation.md` - Documentado
- ❌ Tests automatizados de RLS (falta - **CRÍTICO**)

### Cobertura
- **E2E:** 50% (mejorable)
- **Unitarios:** 0% (crítico)
- **Seguridad:** Documentado pero no automatizado (**CRÍTICO**)

---

## Issues Relacionados

- **CRÍTICO:** Automatizar tests de aislamiento multi-tenant
- Crear issue para mejorar validaciones de límites de plan
- Crear issue para implementar soft delete completo

---

## Observaciones

### Fortalezas
- RLS implementado correctamente en todas las tablas
- Aislamiento de datos robusto
- Estados derivados evitan inconsistencias
- Soft delete mantiene historial

### Limitaciones Conocidas
- No hay validación automática de límites de plan en BD
- Soft delete no está completamente implementado
- No hay auditoría de cambios de estado

### Mejoras Futuras
- Implementar validación de límites en triggers
- Añadir auditoría completa de cambios
- Implementar hard delete con confirmación
- Añadir métricas de uso por tenant

### Dependencias Críticas
- **RLS:** Sistema completo depende de políticas RLS
- **Función get_my_client_account_id():** Usada en todas las políticas
- **Función get_room_derived_status():** Cálculo de estados

### Riesgos
- **CRÍTICO:** Si RLS falla, hay fuga de datos cross-tenant
- **ALTO:** Sin tests automatizados de seguridad
- **MEDIO:** Límites de plan no validados en BD

---

## Referencias

- **Código:** `src/pages/Accommodations.jsx`, `src/pages/Rooms.jsx`
- **Migraciones:** `00000000000001_baseline_schema.sql`, `00000000000003_baseline_rls.sql`
- **Tests:** `tests/test-cases/security-multi-tenant-isolation.md`
- **Documentación:** `docs/arquitectura.md`

---

**Consolidado desde:**
- Baseline inicial del sistema
- Requisitos funcionales originales
- Análisis de seguridad multi-tenant
- Implementación actual en producción
