# E2E Functional Tests — SmartRent

> Organizado por **perfil de usuario** y **lo que puede/no puede hacer**.
> Estado: ✅ Pasa | ❌ Falla | ⚠️ Pendiente | 🚧 No implementado

---

## Perfiles de usuario

| Perfil | Rol | Portal de login | Descripción |
|--------|-----|-----------------|-------------|
| **SuperAdmin** | `superadmin` | `/v2/auth/login` | Gestiona la plataforma SaaS. Crea cuentas de cliente, planes, servicios globales |
| **Admin / Gestor** | `admin` | `/v2/admin/auth/login` | Opera su tenant: alojamientos, inquilinos, energía, facturas, boletines |
| **Viewer** | `viewer` | `/v2/admin/auth/login` | Solo lectura dentro del tenant. No puede crear ni editar |
| **Inquilino** | `lodger` | `/v2/lodger/auth/login` | Panel personal: habitación, consumo, servicios, boletines, incidencias |

---

## Usuarios de test necesarios

| Usuario | Rol | Plan | Variable en `.env.e2e` | Estado |
|---------|-----|------|------------------------|--------|
| Gestor principal | `admin` | — | `TEST_MANAGER_EMAIL` / `TEST_MANAGER_PASSWORD` | ✅ Configurado |
| Gestor plan Basic | `admin` | `basic` | `TEST_MANAGER_BASIC_EMAIL` / `TEST_MANAGER_BASIC_PASSWORD` | 🚧 Pendiente crear |
| Gestor plan Investor | `admin` | `investor` | `TEST_MANAGER_INVESTOR_EMAIL` / `TEST_MANAGER_INVESTOR_PASSWORD` | 🚧 Pendiente crear |
| Gestor plan Business | `admin` | `business` | `TEST_MANAGER_BUSINESS_EMAIL` / `TEST_MANAGER_BUSINESS_PASSWORD` | 🚧 Pendiente crear |
| Gestor plan Agency | `admin` | `agency` | `TEST_MANAGER_AGENCY_EMAIL` / `TEST_MANAGER_AGENCY_PASSWORD` | 🚧 Pendiente crear |
| Viewer (solo lectura) | `viewer` | — | `TEST_VIEWER_EMAIL` / `TEST_VIEWER_PASSWORD` | 🚧 Pendiente crear |
| Inquilino activo | `lodger` | — | `TEST_LODGER_EMAIL` / `TEST_LODGER_PASSWORD` | 🚧 Pendiente crear |
| SuperAdmin | `superadmin` | — | `TEST_SUPERADMIN_EMAIL` / `TEST_SUPERADMIN_PASSWORD` | 🚧 Pendiente crear |
| Gestor tenant B (aislamiento) | `admin` | — | `TEST_MANAGER_B_EMAIL` / `TEST_MANAGER_B_PASSWORD` | 🚧 Pendiente crear |

> Los tests de Gestor/Admin usan credenciales de staging con un tenant que tiene datos de ejemplo.
>
> **Casos de uso por plan:**
> - `basic` — max 1 entidad propietaria, 3 alojamientos, 20 habitaciones, sin branding, sin multi-owner. Botón "Nueva entidad" deshabilitado al tener 1 owner. Muestra payer como fallback si no hay owners.
> - `investor` — max 5 entidades, 8 alojamientos, 60 habitaciones, branding activo, permite multi-owner.
> - `business` — max 10 entidades, alojamientos y habitaciones ilimitados, branding activo, permite multi-owner.
> - `agency` — entidades, alojamientos y habitaciones ilimitados, branding activo, permite multi-owner y cambio de propietario (`allows_owner_change: true`).

---

## 1. ACCESO Y AUTENTICACIÓN

### 1.1 Portales de login

| # | Test | Perfil | URL | Estado |
|---|------|--------|-----|--------|
| AUTH-01 | Login comercial carga con formulario email/password | Público | `/v2/auth/login` | ⚠️ Pendiente |
| AUTH-02 | Login gestor carga con layout split-screen | Admin | `/v2/admin/auth/login` | ⚠️ Pendiente |
| AUTH-03 | Login inquilino carga con layout split-screen | Lodger | `/v2/lodger/auth/login` | ⚠️ Pendiente |
| AUTH-04 | Error visible con credenciales inválidas | Todos | todos | ⚠️ Pendiente |
| AUTH-05 | Admin logueado redirige a `/v2/admin/dashboard` | Admin | `/v2/admin/auth/login` | ⚠️ Pendiente |
| AUTH-06 | SuperAdmin logueado redirige a `/v2/superadmin` | SuperAdmin | `/v2/auth/login` | ⚠️ Pendiente |
| AUTH-07 | Inquilino logueado redirige a `/v2/lodger/dashboard` | Lodger | `/v2/lodger/auth/login` | ⚠️ Pendiente |

### 1.2 Validación de portal (acceso cruzado)

| # | Test | Perfil | Estado |
|---|------|--------|--------|
| AUTH-08 | Lodger en portal gestor → muestra "Acceso no permitido" | Lodger → Admin portal | 🚧 No implementado |
| AUTH-09 | Admin en portal inquilino → redirige al portal gestor | Admin → Lodger portal | 🚧 No implementado |
| AUTH-10 | Ruta protegida sin sesión → redirige al login correspondiente | Sin sesión | 🚧 No implementado |

### 1.3 Sesión y logout

| # | Test | Perfil | Estado |
|---|------|--------|--------|
| AUTH-11 | Logout desde portal gestor redirige a login gestor | Admin | 🚧 No implementado |
| AUTH-12 | Logout desde portal inquilino redirige a login inquilino | Lodger | 🚧 No implementado |
| AUTH-13 | Modal "Olvidé mi contraseña" acepta email y muestra confirmación | Todos | 🚧 No implementado |

---

## 2. SUPERADMIN — Gestión de plataforma

> Acceso: `/v2/superadmin` · Solo rol `superadmin`

### 2.1 Lo que PUEDE hacer

#### Dashboard

| # | Test | URL | Estado |
|---|------|-----|--------|
| SA-01 | Dashboard superadmin carga sin errores | `/v2/superadmin` | 🚧 No implementado |

#### Cuentas de Cliente

| # | Test | URL | Estado |
|---|------|-----|--------|
| SA-02 | Lista de cuentas de cliente carga con KPIs | `/v2/superadmin/cuentas` | 🚧 No implementado |
| SA-03 | Crear cuenta de cliente (wizard provisioning completo) | `/v2/superadmin/cuentas/nueva` | 🚧 No implementado |
| SA-04 | Ver detalle de cuenta de cliente | `/v2/superadmin/cuentas/:id` | 🚧 No implementado |
| SA-05 | Gestionar usuarios de una cuenta | `/v2/superadmin/cuentas/:id/usuarios` | 🚧 No implementado |

#### Planes del Catálogo

| # | Test | URL | Estado |
|---|------|-----|--------|
| SA-06 | Lista de planes carga con datos | `/v2/superadmin/planes` | 🚧 No implementado |
| SA-07 | Crear nuevo plan | `/v2/superadmin/planes/nuevo` | 🚧 No implementado |
| SA-08 | Ver detalle de plan | `/v2/superadmin/planes/:id` | 🚧 No implementado |

#### Servicios Globales

| # | Test | URL | Estado |
|---|------|-----|--------|
| SA-09 | Lista de servicios del catálogo global carga | `/v2/superadmin/servicios` | 🚧 No implementado |

### 2.2 Lo que NO puede hacer (acceso denegado)

| # | Test | Estado |
|---|------|--------|
| SA-N01 | No accede al portal inquilino `/v2/lodger/` | 🚧 No implementado |
| SA-N02 | No accede al panel gestor `/v2/admin/entidades` sin tenant asignado | 🚧 No implementado |

---

## 3. ADMIN / GESTOR — Operación del tenant

> Acceso: `/v2/admin/` · Roles `admin`, `agent`, `api`, `viewer`

### 3.1 Dashboard Gestor

| # | Test | Rol mínimo | Plan | Estado |
|---|------|------------|------|--------|
| DB-01 | Dashboard gestor carga sin errores | viewer | todos | 🚧 No implementado |
| DB-02 | KPIs globales del tenant visibles (Inquilinos, Alojamientos, Hab. Libres) | viewer | todos | 🚧 No implementado |
| DB-03 | Dashboard Basic: branding por defecto (sin logo personalizado) | viewer | `basic` | 🚧 No implementado |
| DB-04 | Dashboard Investor/Business/Agency: branding personalizado visible en header | viewer | `investor`, `business`, `agency` | 🚧 No implementado |

### 3.2 Entidades Propietarias

| # | Test | Rol mínimo | Plan | Estado | Fichero |
|---|------|------------|------|--------|---------|
| E-01 | Lista de entidades carga con título y botón "Nueva entidad" | viewer | todos | ⚠️ Pendiente | `entities.spec.js · 01` |
| E-02 | Crear entidad tipo Persona física con dirección | admin | todos | ⚠️ Pendiente | `entities.spec.js · 02` |
| E-03 | Crear entidad tipo Persona jurídica (razón social) | admin | todos | 🚧 No implementado | — |
| E-04 | Crear entidad tipo Autónomo | admin | todos | 🚧 No implementado | — |
| E-05 | Navegar al detalle de entidad y obtener ID desde URL | viewer | todos | ⚠️ Pendiente | `entities.spec.js · 03` |
| E-06 | Editar entidad: cambiar teléfono y verificar persistencia | admin | todos | ⚠️ Pendiente | `entities.spec.js · 04` |
| E-07 | Ver detalle de la entidad (nombre visible en página) | viewer | todos | ⚠️ Pendiente | `entities.spec.js · 05` |
| E-08 | KPIs de entidad visibles en lista (Aloj., Libres) | viewer | todos | ⚠️ Pendiente | `entities.spec.js · 06` |
| E-09 | Buscar entidad por nombre en el buscador | viewer | todos | 🚧 No implementado | — |
| E-10 | Viewer NO ve botón "Nueva entidad" (solo lectura) | viewer | todos | 🚧 No implementado | — |

#### 3.2.1 Plan BASIC — Restricciones de entidades

> Credencial: `TEST_MANAGER_BASIC_EMAIL` · max_owners: 1 · allows_multi_owner: false
> Spec: `admin-basic.spec.js` · Proyecto Playwright: `regression-basic`

| # | Test | Spec | Estado |
|---|------|------|--------|
| E-B01 | Sin owners: lista muestra la entidad payer como fallback | test 04 | ⚠️ Pendiente credencial |
| E-B02 | Con 1 owner: botón "Nueva entidad" aparece deshabilitado | test 05 + 31 | ⚠️ Pendiente credencial |
| E-B03 | Obtener ID de entidad owner existente (seed) | test 06 | ⚠️ Pendiente credencial |
| E-B04 | Ver detalle de entidad | test 07 | ⚠️ Pendiente credencial |
| E-B05 | Editar entidad: cambiar teléfono y verificar persistencia | test 08 | ⚠️ Pendiente credencial |
| E-B06 | KPIs de entidad visibles en lista | test 09 | ⚠️ Pendiente credencial |

#### 3.2.2 Plan INVESTOR — Restricciones de entidades

> Credencial: `TEST_MANAGER_INVESTOR_EMAIL` · max_owners: 5 · allows_multi_owner: true

| # | Test | Estado |
|---|------|--------|
| E-I01 | Lista muestra múltiples owners correctamente | 🚧 No implementado |
| E-I02 | Con 4 owners: botón "Nueva entidad" sigue habilitado | 🚧 No implementado |
| E-I03 | Con 5 owners: botón "Nueva entidad" aparece deshabilitado | 🚧 No implementado |
| E-I04 | Contador progresivo visible: "N / 5" | 🚧 No implementado |
| E-I05 | NO usa payer como fallback aunque no haya owners | 🚧 No implementado |

#### 3.2.3 Plan BUSINESS — Restricciones de entidades

> Credencial: `TEST_MANAGER_BUSINESS_EMAIL` · max_owners: 10 · allows_multi_owner: true

| # | Test | Estado |
|---|------|--------|
| E-BU01 | Lista muestra múltiples owners correctamente | 🚧 No implementado |
| E-BU02 | Con 9 owners: botón "Nueva entidad" sigue habilitado | 🚧 No implementado |
| E-BU03 | Con 10 owners: botón "Nueva entidad" aparece deshabilitado | 🚧 No implementado |
| E-BU04 | Contador muestra "N / 10" | 🚧 No implementado |

#### 3.2.4 Plan AGENCY — Restricciones de entidades

> Credencial: `TEST_MANAGER_AGENCY_EMAIL` · max_owners: ilimitado · allows_owner_change: true

| # | Test | Estado |
|---|------|--------|
| E-AG01 | Lista muestra múltiples owners sin límite | 🚧 No implementado |
| E-AG02 | Botón "Nueva entidad" siempre habilitado (sin límite) | 🚧 No implementado |
| E-AG03 | Contador muestra "Ilimitadas" en lugar de "N / X" | 🚧 No implementado |

### 3.3 Alojamientos

| # | Test | Rol mínimo | Plan | Estado | Fichero |
|---|------|------------|------|--------|---------|
| A-01 | Lista de alojamientos carga con botón "Nuevo Alojamiento" | viewer | todos | ⚠️ Pendiente | `accommodations.spec.js · 01` |
| A-02 | Crear alojamiento: wizard paso 1 (datos + entidad propietaria) | admin | todos | ⚠️ Pendiente | `accommodations.spec.js · 02` |
| A-03 | Crear alojamiento: wizard paso 2 (configurar habitaciones) | admin | todos | ⚠️ Pendiente | `accommodations.spec.js · 02` |
| A-04 | Obtener ID del alojamiento desde URL (navegación a Editar) | viewer | todos | ⚠️ Pendiente | `accommodations.spec.js · 03` |
| A-05 | Ver habitaciones del alojamiento (AccommodationDetail) | viewer | todos | ⚠️ Pendiente | `accommodations.spec.js · 04` |
| A-06 | Habitaciones muestran badge de estado (Libre / Ocupada) | viewer | todos | ⚠️ Pendiente | `accommodations.spec.js · 04` |
| A-07 | Editar alojamiento: cambiar nombre | admin | todos | ⚠️ Pendiente | `accommodations.spec.js · 05` |
| A-08 | Añadir habitación desde AccommodationEdit | admin | todos | ⚠️ Pendiente | `accommodations.spec.js · 06` |
| A-09 | KPIs del alojamiento visibles (Total, Ocupado, Libres) | viewer | todos | ⚠️ Pendiente | `accommodations.spec.js · 07` |
| A-10 | Asignar servicios a un alojamiento | admin | todos | 🚧 No implementado | — |
| A-11 | Buscar alojamiento por nombre | viewer | todos | 🚧 No implementado | — |

#### 3.3.1 Restricciones por plan — Alojamientos

| # | Test | Plan | Límite | Estado |
|---|------|------|--------|--------|
| A-B01 | Con 3 alojamientos: botón "Nuevo Alojamiento" deshabilitado | `basic` | max 3 | 🚧 No implementado |
| A-B02 | Contador muestra "N / 3" en la lista | `basic` | max 3 | 🚧 No implementado |
| A-I01 | Con 8 alojamientos: botón "Nuevo Alojamiento" deshabilitado | `investor` | max 8 | 🚧 No implementado |
| A-I02 | Con 7 alojamientos: botón sigue habilitado | `investor` | max 8 | 🚧 No implementado |
| A-BU01 | Botón "Nuevo Alojamiento" siempre habilitado | `business` | ilimitado | 🚧 No implementado |
| A-AG01 | Botón "Nuevo Alojamiento" siempre habilitado | `agency` | ilimitado | 🚧 No implementado |

#### 3.3.2 Estado de habitación — derivado de asignaciones

> **Cambio arquitectónico (2026-03-25):** `rooms.status` eliminado de la BD. El estado se calcula en tiempo real desde `lodger_room_assignments`:
> - `is_maintenance = true` → **Mantenimiento**
> - Sin asignación activa/futura → **Libre**
> - Asignación con `move_out_date IS NULL` → **Ocupada**
> - Asignación con `move_out_date > hoy` → **Pendiente baja**
> Spec: `room-status-and-checkout.spec.js` · Proyecto: `regression`

| # | Test | Condición | Estado | Spec |
|---|------|-----------|--------|------|
| HAB-01 | Habitación sin asignación muestra badge "Libre" | Sin filas en assignments | ⚠️ Pendiente | `room-status-and-checkout.spec.js · 00c` |
| HAB-02 | Tras crear inquilino con habitación → badge cambia a "Ocupada" | `move_out_date IS NULL` | 🔴 BUG-033 | `room-status-and-checkout.spec.js · 01` |
| HAB-03 | Tarjeta de inquilino muestra fecha de check-in | `move_in_date` visible | 🔴 BUG-033 | `room-status-and-checkout.spec.js · 02` |
| HAB-04 | Detalle de inquilino muestra fecha check-in correcta | `LodgerDetail` | 🔴 BUG-033 | `room-status-and-checkout.spec.js · 03` |
| HAB-05 | Programar baja futura → habitación cambia a "Pendiente baja" | `move_out_date > hoy` | 🔴 BUG-033 | `room-status-and-checkout.spec.js · 04` |
| HAB-06 | Tarjeta de inquilino muestra fecha de check-out programado | `move_out_date` visible | 🔴 BUG-033 | `room-status-and-checkout.spec.js · 05` |
| HAB-07 | Programar baja hoy → habitación queda "Libre" al día siguiente | `move_out_date ≤ hoy` | 🔴 BUG-033 | `room-status-and-checkout.spec.js · 06` |
| HAB-08 | Poner habitación en mantenimiento → badge "Mantenimiento" | `is_maintenance = true` | 🚧 No implementado | — |
| HAB-09 | Quitar mantenimiento → badge vuelve a "Libre" | `is_maintenance = false` | 🚧 No implementado | — |

> 🔴 HAB-02 a HAB-07 bloqueados por BUG-033 (`selectedRoomId is not defined` en `TenantCreate.onFinish`).

### 3.4 Inquilinos

| # | Test | Rol mínimo | Estado | Fichero |
|---|------|------------|--------|---------|
| T-01 | Lista de inquilinos carga con botón "Nuevo Inquilino" | viewer | ⚠️ Pendiente | `tenants.spec.js · 01` |
| T-02 | Crear inquilino + asignar habitación libre | admin | ⚠️ Pendiente | `tenants.spec.js · 02` |
| T-03 | Inquilino aparece en lista con estado "Invitado" tras creación | viewer | ⚠️ Pendiente | `tenants.spec.js · 03` |
| T-04 | Ver detalle del inquilino (nombre, email, habitación) | viewer | ⚠️ Pendiente | `tenants.spec.js · 04` |
| T-05 | Editar inquilino: actualizar teléfono y verificar persistencia | admin | ⚠️ Pendiente | `tenants.spec.js · 05` |
| T-06 | Cambiar habitación del inquilino (modal reasignación) | admin | ⚠️ Pendiente | `tenants.spec.js · 06` |
| T-07 | Verificar nueva habitación en detalle tras cambio | viewer | ⚠️ Pendiente | `tenants.spec.js · 07` |
| T-08 | Programar baja del inquilino (fecha futura) | admin | ⚠️ Pendiente | `tenants.spec.js · 08` |
| T-09 | Habitación queda "Libre" tras ejecutarse la baja | viewer | 🚧 No implementado | — |
| T-10 | Buscar inquilino por nombre en el buscador | viewer | 🚧 No implementado | — |
| T-11 | Asignar servicio a un inquilino desde su detalle | admin | 🚧 No implementado | — |

#### 3.4.1 Pagadores del Inquilino (`payer_rental`)

> Un inquilino puede tener múltiples pagadores activos simultáneamente (ej: padre y madre de un estudiante).
> Los pagadores son potenciales: cualquiera puede hacer la transferencia bancaria cada mes.
> Acceso: `TenantEdit` → sección "Pagadores" · Componente: `PayersList.jsx`

| # | Test | Tipo pagador | Estado |
|---|------|-------------|--------|
| PAY-01 | Abrir edición de inquilino → sección "Pagadores" visible con botón "Añadir Pagador" | — | 🚧 No implementado |
| PAY-02 | Inquilino sin pagadores → lista vacía con mensaje informativo | — | 🚧 No implementado |
| PAY-03 | Añadir pagador persona física (nombre + primer apellido) | `individual` | 🚧 No implementado |
| PAY-04 | Añadir pagador persona jurídica (razón social) | `company` | 🚧 No implementado |
| PAY-05 | Lista muestra 2 pagadores activos simultáneamente | `individual` x2 | 🚧 No implementado |
| PAY-06 | Lista muestra mix de persona física + empresa activos a la vez | `individual` + `company` | 🚧 No implementado |
| PAY-07 | Pagador activo muestra badge "Activo" en verde | — | 🚧 No implementado |
| PAY-08 | Desactivar pagador → badge cambia a "Inactivo" pero sigue visible en lista | — | 🚧 No implementado |
| PAY-09 | Reactivar pagador inactivo → badge vuelve a "Activo" | — | 🚧 No implementado |
| PAY-10 | Editar pagador existente → cambiar notas y verificar persistencia | — | 🚧 No implementado |
| PAY-11 | Formulario "Añadir Pagador": cambiar tipo `individual` → `company` → campos cambian | — | 🚧 No implementado |
| PAY-12 | Reasignar habitación → pagadores del inquilino se mantienen tras la reasignación | — | 🚧 No implementado |
| PAY-13 | Crear inquilino → muestra `PayersList` inline en la misma pantalla (commit `6b517d6`) | — | 🚧 No implementado |

#### 3.4.2 Regla de negocio: Habitación requerida para añadir pagadores

> Fuente: `tests/test-cases/PAYERS-ROOM-REQUIREMENT-VALIDATION.md` (2026-03-22)
> **Regla:** Un inquilino DEBE tener habitación asignada antes de poder añadir pagadores. Sin habitación: Alert warning visible, botón "Añadir Pagador" oculto.
> Componentes afectados: `TenantCreate.jsx` (pantalla post-creación) · `TenantEdit.jsx` / `PayersList.jsx`

| # | Test | Dónde | Estado |
|---|------|-------|--------|
| PAY-H01 | Crear inquilino SIN habitación → pantalla éxito muestra Alert warning "Sin habitación asignada", botón "Añadir Pagador" oculto | `TenantCreate` post-creación | 🚧 No implementado |
| PAY-H02 | Crear inquilino CON habitación → pantalla éxito muestra Alert info "Gestión de Pagadores" y botón "Añadir Pagador" visible | `TenantCreate` post-creación | 🚧 No implementado |
| PAY-H03 | Añadir pagador persona física en pantalla post-creación → pagador aparece en lista con badge "Activo" y tipo "Persona Física" | `TenantCreate` → `PayersList` | 🚧 No implementado |
| PAY-H04 | Editar inquilino sin habitación → sección "Pagadores" muestra Alert warning "Habitación requerida", botón "Añadir Pagador" oculto | `TenantEdit` | 🚧 No implementado |
| PAY-H05 | Editar inquilino con habitación → sección "Pagadores" muestra botón "Añadir Pagador" habilitado, sin Alert warning | `TenantEdit` | 🚧 No implementado |
| PAY-H06 | Inquilino sin habitación: asignar habitación → sección "Pagadores" habilita botón "Añadir Pagador", Alert warning desaparece | `TenantEdit` | 🚧 No implementado |
| PAY-H07 | Inquilino con habitación y pagadores: hacer checkout → botón "Añadir Pagador" desaparece, pagadores existentes siguen visibles (solo lectura) | `TenantEdit` | 🚧 No implementado |
| PAY-H08 | Doble click en botón "Añadir" del modal de pagador → botón se deshabilita, se crea UN solo pagador sin duplicados | `PayersList` modal | 🚧 No implementado |
| PAY-H09 | Modal "Añadir Pagador" tipo `individual` sin campos → errores "El nombre es obligatorio" y "El primer apellido es obligatorio" *(ver también FV-PAY01/02)* | `PayersList` modal | 🚧 No implementado |
| PAY-H10 | Modal "Añadir Pagador": cambiar tipo `individual` → `company` → campos nombre/apellidos desaparecen, "Nombre de la Empresa" aparece *(ver también FV-PAY04)* | `PayersList` modal | 🚧 No implementado |
| PAY-H11 | Editar pagador existente → modal se abre con datos pre-cargados, guardar cambio de observaciones → lista actualizada *(ver también PAY-10)* | `PayersList` | 🚧 No implementado |
| PAY-H12 | Toggle estado pagador: Desactivar → badge "Inactivo"; Activar → badge "Activo" *(ver también PAY-08/09)* | `PayersList` | 🚧 No implementado |

#### 3.4.3 Estado del inquilino — derivado de fechas

> **Cambio arquitectónico (2026-03-25):** El estado del inquilino se calcula desde `lodger_room_assignments` mediante `getLodgerStatus()`. No depende de `onboarding_status` para los badges.
>
> | Estado | Condición |
> |--------|-----------|
> | **Invitado** | Sin asignaciones o `move_in_date IS NULL` |
> | **Activo** | Asignación más reciente con `move_out_date IS NULL` |
> | **Pendiente baja** | Asignación más reciente con `move_out_date > hoy` |
> | **Inactivo** | Asignación más reciente con `move_out_date ≤ hoy` |

| # | Test | Estado |
|---|------|--------|
| TS-01 | Inquilino recién creado sin habitación → badge "Invitado" | 🚧 No implementado |
| TS-02 | Inquilino con habitación activa → badge "Activo" | 🚧 No implementado |
| TS-03 | Inquilino con baja programada futura → badge "Pendiente baja" | 🚧 No implementado |
| TS-04 | Inquilino con baja pasada → badge "Inactivo" | 🚧 No implementado |
| TS-05 | Filtro "Estado = Activo" en lista → solo muestra activos | 🚧 No implementado |
| TS-06 | Filtro "Estado = Pendiente baja" → solo muestra pendientes | 🚧 No implementado |
| TS-07 | Toggle "Mostrar inactivos" → incluye inquilinos con baja pasada | 🚧 No implementado |
| TS-08 | Tarjeta de inquilino pendiente baja muestra habitación asignada (move_out_date futuro) | 🚧 No implementado |

### 3.5 Energía y Facturas

| # | Test | Rol mínimo | URL | Estado |
|---|------|------------|-----|--------|
| EN-01 | Lista de facturas eléctricas carga | viewer | `/v2/admin/energia/facturas` | 🚧 No implementado |
| EN-02 | Crear nueva factura eléctrica (datos básicos) | admin | `/v2/admin/energia/facturas/nueva` | 🚧 No implementado |
| EN-03 | Ver detalle de factura (importes, fechas) | viewer | `/v2/admin/energia/facturas/:id` | 🚧 No implementado |
| EN-04 | Editar factura eléctrica | admin | `/v2/admin/energia/facturas/:id/editar` | 🚧 No implementado |
| EN-05 | Lista de liquidaciones carga | viewer | `/v2/admin/energia/liquidaciones` | 🚧 No implementado |

### 3.6 Boletines de Liquidación

| # | Test | Rol mínimo | URL | Estado |
|---|------|------------|-----|--------|
| BL-01 | Lista de boletines carga (borrador / publicado / reconocido) | viewer | `/v2/admin/boletines` | 🚧 No implementado |
| BL-02 | Crear boletín (seleccionar periodo + habitaciones) | admin | `/v2/admin/boletines/nuevo` | 🚧 No implementado |
| BL-03 | Publicar boletín (cambio de estado a "publicado") | admin | `/v2/admin/boletines/:id` | 🚧 No implementado |

### 3.7 Servicios del Tenant

| # | Test | Rol mínimo | URL | Estado |
|---|------|------------|-----|--------|
| SV-01 | Lista de servicios del tenant carga | viewer | `/v2/admin/servicios` | 🚧 No implementado |
| SV-02 | Crear nuevo servicio (nombre, precio) | admin | `/v2/admin/servicios/nuevo` | 🚧 No implementado |
| SV-03 | Editar servicio: cambiar precio | admin | `/v2/admin/servicios/:id/editar` | 🚧 No implementado |
| SV-04 | Asignar servicio a un inquilino | admin | `/v2/admin/inquilinos/:id` | 🚧 No implementado |

### 3.8 Configuración (Settings)

| # | Test | Rol mínimo | URL | Estado |
|---|------|------------|-----|--------|
| SET-01 | Página de configuración del tenant carga sin errores | admin | `/v2/admin/settings` | 🚧 No implementado |

### 3.9 Borrado y Desactivación

> Cubre operaciones de eliminación y desactivación disponibles para el rol `admin`.
> Soft delete = cambio de `status` a `inactive`. Hard delete = eliminación física con cascada.
> Spec: `admin-basic.spec.js` tests 36–43 · Proyecto: `regression-basic`

| # | Test | Operación | Entidad | Spec | Estado |
|---|------|-----------|---------|------|--------|
| BD-01 | Desactivar entidad: `status → inactive` desde formulario edición | Soft delete | Entidad propietaria | test 36 | ⚠️ Pendiente credencial |
| BD-02 | Reactivar entidad: `status → active` (restaurar para tests siguientes) | Soft restore | Entidad propietaria | test 37 | ⚠️ Pendiente credencial |
| BD-03 | Desactivar habitación libre (`set_room_status → inactive`, Popconfirm) | Soft delete | Habitación | test 38 | ⚠️ Pendiente credencial |
| BD-04 | Reactivar habitación desactivada (`set_room_status → active`) | Soft restore | Habitación | test 39 | ⚠️ Pendiente credencial |
| BD-05 | Desactivar inquilino: `status → inactive` desde `TenantEdit` | Soft delete | Inquilino | test 40 | ⚠️ Pendiente credencial |
| BD-06 | Eliminar factura eléctrica (hard delete con cascada a boletines y storage) | Hard delete | Factura + boletines + PDF | test 41 | ⚠️ Pendiente credencial |
| BD-07 | Desactivar servicio del catálogo (`StopOutlined` icon, `status → inactive`) | Soft delete | Servicio | test 42 | ⚠️ Pendiente credencial |
| BD-08 | Boletín NO tiene borrado propio — solo se elimina en cascada con su factura | Documentativo | Boletín | test 43 | ⚠️ Pendiente credencial |

> **Reglas de cascada en hard delete de Factura:**
> - Se eliminan todos los `energy_settlements` asociados
> - Se eliminan todos los `bulletins` del periodo
> - Se elimina el PDF del bucket de Supabase Storage

---

## 4. INQUILINO — Panel personal

> Acceso: `/v2/lodger/` · Solo rol `lodger`

### 4.1 Lo que PUEDE hacer

| # | Test | URL | Estado |
|---|------|-----|--------|
| LG-01 | Dashboard carga con nombre del inquilino y habitación asignada | `/v2/lodger/dashboard` | 🚧 No implementado |
| LG-02 | Sección "Mi Consumo" carga con datos de energía | `/v2/lodger/consumo` | 🚧 No implementado |
| LG-03 | Sección "Mis Boletines" carga y muestra boletín publicado | `/v2/lodger/boletines` | 🚧 No implementado |
| LG-04 | Sección "Servicios" carga con los servicios asignados | `/v2/lodger/servicios` | 🚧 No implementado |
| LG-05 | Sección "Incidencias" carga (puede crear incidencia) | `/v2/lodger/incidencias` | 🚧 No implementado |
| LG-06 | Sección "Encuestas" carga | `/v2/lodger/encuestas` | 🚧 No implementado |
| LG-07 | Perfil del inquilino: ver y actualizar datos personales | `/v2/lodger/perfil` | 🚧 No implementado |

### 4.2 Lo que NO puede hacer (acceso denegado)

| # | Test | Estado |
|---|------|--------|
| LG-N01 | Acceder a `/v2/admin/entidades` → redirige a login gestor | 🚧 No implementado |
| LG-N02 | Acceder a `/v2/superadmin` → redirige a login comercial | 🚧 No implementado |

---

## 5. WEB PÚBLICA

| # | Test | URL | Estado |
|---|------|-----|--------|
| PUB-01 | Home page carga con título SmartRoom | `/v2` | ⚠️ Pendiente |
| PUB-02 | Página de planes carga datos desde BD | `/v2/planes` | 🚧 No implementado |
| PUB-03 | Página de contacto carga con formulario | `/v2/contacto` | 🚧 No implementado |
| PUB-04 | Términos de servicio accesibles | `/v2/legal/terminos` | 🚧 No implementado |
| PUB-05 | Política de privacidad accesible | `/v2/legal/privacidad` | 🚧 No implementado |
| PUB-06 | Política de cookies accesible | `/v2/legal/cookies` | 🚧 No implementado |

---

## 6. CONTROL DE ACCESO — Por rol

> Valida que cada rol solo puede ver y hacer lo que le corresponde

| # | Test | Usuario | Acción | Resultado esperado | Estado |
|---|------|---------|--------|--------------------|--------|
| AC-01 | Viewer no puede crear entidad | viewer | Click "Nueva entidad" | Botón deshabilitado | 🚧 No implementado |
| AC-02 | Viewer no puede editar alojamiento | viewer | Ir a `/v2/admin/alojamientos/:id/editar` | Formulario read-only | 🚧 No implementado |
| AC-03 | Viewer no puede crear inquilino | viewer | Click "Nuevo Inquilino" | Botón deshabilitado | 🚧 No implementado |
| AC-04 | Lodger intenta iniciar sesión en portal gestor | lodger | Login en `/v2/admin/auth/login` | Mensaje "Acceso no permitido" | 🚧 No implementado |
| AC-05 | Admin intenta iniciar sesión en portal inquilino | admin | Login en `/v2/lodger/auth/login` | Redirige a portal gestor | 🚧 No implementado |
| AC-06 | Sin sesión intenta ruta protegida gestor | anon | Ir a `/v2/admin/dashboard` | Redirige a `/v2/admin/auth/login` | 🚧 No implementado |
| AC-07 | Sin sesión intenta ruta protegida inquilino | anon | Ir a `/v2/lodger/dashboard` | Redirige a `/v2/lodger/auth/login` | 🚧 No implementado |
| AC-08 | SuperAdmin intenta acceder al portal inquilino | superadmin | Ir a `/v2/lodger/` | Redirige o "Acceso no permitido" | 🚧 No implementado |

---

## 7. REGLAS DE NEGOCIO — Casos borde

> Valida la lógica de negocio que garantiza integridad de datos

| # | Test | Qué valida | Estado |
|---|------|------------|--------|
| RN-01 | No se puede asignar habitación ocupada a nuevo inquilino | Hab. con estado "Ocupada" no aparece en el selector o da error | 🚧 No implementado |
| RN-02 | Habitación queda "Libre" cuando el inquilino causa baja | Tras ejecutar la baja, el badge cambia a "Libre" | 🚧 No implementado |
| RN-03 | No se puede crear alojamiento sin seleccionar entidad propietaria | El wizard bloquea "Continuar" si falta entidad | 🚧 No implementado |
| RN-04 | Boletín publicado visible para el inquilino en su portal | Gestor publica → inquilino ve el boletín en `/v2/lodger/boletines` | 🚧 No implementado |
| RN-05 | No se puede guardar factura sin alojamiento seleccionado | Campo alojamiento requerido en formulario de factura | 🚧 No implementado |
| RN-06 | Cambio de habitación libera la anterior y ocupa la nueva | Tras reasignación: hab. anterior "Libre", hab. nueva "Ocupada" | 🚧 No implementado |

---

## 8. VALIDACIONES DE FORMULARIO — Por campo

> Tests que verifican que los formularios rechazan datos inválidos, incompletos o fuera de rango.
> Rol mínimo: `admin`. Spec: `form-validations.spec.js`

### Leyenda de tipos

| Tipo | Descripción |
|------|-------------|
| `text` | Cadena de texto libre |
| `email` | Texto con formato email válido |
| `select` | Desplegable con opciones predefinidas |
| `number` | Valor numérico |
| `integer` | Número entero (sin decimales) |
| `date` | Fecha (YYYY-MM-DD) |
| `boolean` | true / false |
| `jsonb` | Array JSON |

---

### 8.1 Entidad Propietaria — `/v2/admin/entidades/nueva`

> Fuente verificada: `EntityCreate.jsx` + `EntityFormFields.jsx` (2026-03-22)

#### Campos del formulario

**Selector de tipo (siempre visible)**

| Campo | Tipo | Oblig. | Validación extra |
|-------|------|:------:|-----------------|
| `legal_type` | `select` | ✅ | Valores: `persona_juridica` (default), `persona_fisica`, `autonomo` |

**Datos de nombre — condicional por tipo**

| Campo | Tipo | Oblig. | Mín | Máx | Validación extra |
|-------|------|:------:|:---:|:---:|-----------------|
| `legal_name` | `text` | ✅ solo jurídica | 2 | 200 | Oculto si `persona_fisica` o `autonomo` |
| `first_name` | `text` | ✅ física/autónomo | 2 | 50 | Pattern: solo letras y espacios (`/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/`) |
| `last_name1` | `text` | ✅ física/autónomo | 2 | 50 | Pattern: solo letras y espacios |
| `last_name2` | `text` | ❌ | — | 50 | Pattern: solo letras, espacios o vacío |
| `nickname` | `text` | ❌ | — | 50 | Sin restricciones adicionales |
| `gender` | `select` | ❌ | — | — | Solo para física/autónomo |

**Datos fiscales y contacto (todos los tipos)**

| Campo | Tipo | Oblig. | Mín | Máx | Validación extra |
|-------|------|:------:|:---:|:---:|-----------------|
| `tax_id` | `text` | ✅ | 9 | 9 (exacto) | Empresa: `/^[A-Z]\d{8}$\|^\d{8}[A-Z]$/`· Persona: `/^\d{8}[A-Z]$\|^[XYZ]\d{7}[A-Z]$/`. Campo en UPPERCASE |
| `billing_email` | `email` | ✅ | — | 100 | Formato email válido |
| `phone` | `text` | ❌ | — | 20 | Pattern: `/^\+?[0-9\s-]{9,15}$/` |

**Dirección (todos los tipos, todos obligatorios excepto floor/door/address_extra)**

| Campo | Tipo | Oblig. | Mín | Máx | Validación extra |
|-------|------|:------:|:---:|:---:|-----------------|
| `street` | `text` | ✅ | 3 | 200 | — |
| `street_number` | `text` | ✅ | — | — | — |
| `floor` | `text` | ❌ | — | — | — |
| `door` | `text` | ❌ | — | — | — |
| `zip` | `text` | ✅ | — | 5 (maxLength) | Pattern: `/^\d{5}$/` exactamente 5 dígitos |
| `city` | `text` | ✅ | 2 | 100 | — |
| `province` | `select` | ✅ | — | — | Lista de 52 provincias españolas |
| `country` | `text` | ✅ | — | — | Default: `"España"` |
| `address_extra` | `text` | ❌ | — | — | — |

#### Tests E2E

| # | Test | Estado |
|---|------|--------|
| FV-E01 | Enviar formulario vacío → errores en `legal_type`, `legal_name` (default jurídica), `tax_id`, `billing_email`, `street`, `zip`, `city`, `province` | 🚧 No implementado |
| FV-E02 | `legal_type = persona_juridica` → `legal_name` obligatorio; campos `first_name`/`last_name1` ocultos | 🚧 No implementado |
| FV-E03 | `legal_type = persona_fisica` → `first_name` y `last_name1` obligatorios; `legal_name` oculto | 🚧 No implementado |
| FV-E04 | `legal_type = autonomo` → mismos campos que `persona_fisica` | 🚧 No implementado |
| FV-E05 | `first_name` con dígitos (`"Juan1"`) → error de patrón "solo letras" | 🚧 No implementado |
| FV-E06 | `first_name` con 1 carácter → error "mínimo 2 caracteres" | 🚧 No implementado |
| FV-E07 | `tax_id` empresa con formato inválido (`"12345678"`, sin letra final) → error de patrón | 🚧 No implementado |
| FV-E08 | `tax_id` persona con 8 dígitos sin letra final → error de patrón | 🚧 No implementado |
| FV-E09 | `tax_id` con 8 caracteres (1 menos) → error "exactamente 9 caracteres" | 🚧 No implementado |
| FV-E10 | `billing_email` con formato inválido (`"noesun@email"`) → error visible | 🚧 No implementado |
| FV-E11 | `zip` con letras (`"ABCDE"`) → error de patrón | 🚧 No implementado |
| FV-E12 | `zip` con 4 dígitos → error "exactamente 5 dígitos" | 🚧 No implementado |
| FV-E13 | `street` con 2 caracteres → error "mínimo 3 caracteres" | 🚧 No implementado |
| FV-E14 | `city` con 1 carácter → error "mínimo 2 caracteres" | 🚧 No implementado |
| FV-E15 | Cambiar `legal_type` de jurídica a física → `legal_name` desaparece, `first_name`/`last_name1` aparecen | 🚧 No implementado |
| FV-E16 | `phone` con letras (`"abc-def"`) → error de patrón | 🚧 No implementado |

---

### 8.2 Alojamiento — `/v2/admin/alojamientos/nuevo` (wizard)

#### Campos del formulario — Paso 1

| Campo | Tipo | Oblig. | Máx | Validación extra |
|-------|------|:------:|:---:|-----------------|
| `owner_entity_id` | `select` | ✅ | — | Debe existir al menos una entidad propietaria |
| `name` | `text` | ✅ | 200 | — |
| `numRooms` | `integer` | ✅ | — | Entre 1 y 100 |
| `street` | `text` | ❌ | 200 | — |
| `street_number` | `text` | ❌ | 10 | — |
| `postal_code` | `text` | ❌ | 5 | Solo dígitos si se rellena |
| `city` | `text` | ❌ | 100 | — |
| `province` | `select` | ❌ | — | Lista de 52 provincias |

#### Campos del formulario — Paso 2 (habitaciones)

| Campo | Tipo | Oblig. | Máx | Validación extra |
|-------|------|:------:|:---:|-----------------|
| `room_number` | `text` | ✅ | 20 | Único dentro del alojamiento |
| `price` | `number` | ❌ | — | ≥ 0, máx 2 decimales |
| `floor` | `text` | ❌ | 10 | — |

#### Tests E2E

| # | Test | Estado |
|---|------|--------|
| FV-A01 | "Continuar" sin rellenar `name` ni `owner_entity_id` → errores visibles | 🚧 No implementado |
| FV-A02 | `numRooms = 0` → error "Mínimo 1 habitación" | 🚧 No implementado |
| FV-A03 | `numRooms = 101` → error "Máximo 100 habitaciones" | 🚧 No implementado |
| FV-A04 | `numRooms` con letras (`abc`) → campo rechaza el valor | 🚧 No implementado |
| FV-A05 | `postal_code` con letras → error visible | 🚧 No implementado |
| FV-A06 | Paso 2: precio de habitación negativo (`-10`) → error visible | 🚧 No implementado |
| FV-A07 | Sin entidades propietarias creadas → selector vacío, botón "Continuar" bloqueado | 🚧 No implementado |

---

### 8.2b Editar Alojamiento — `/v2/admin/alojamientos/:id/editar`

> Fuente verificada: `AccommodationEdit.jsx` (2026-03-22)
> ⚠️ **BUG-029 (pendiente Cascade):** Los campos `street_number`, `floor` y `door` del formulario **no se persisten en la BD** (no existen como columnas en la tabla `accommodations`). Sus valores se descartan silenciosamente al guardar.

#### Campos del formulario "Datos del Alojamiento"

| Campo | Nombre DB | Tipo | Oblig. | Máx | Validación extra |
|-------|-----------|------|:------:|:---:|-----------------|
| `name` | `name` NOT NULL | `text` | ✅ | 100 | — |
| `owner_entity_id` | `owner_entity_id` NOT NULL | `select` | ✅ | — | Entidades propietarias activas |
| `status` | `status` NOT NULL | `select` | ✅ (default) | — | `active` / `inactive` |
| `address_line1` | `address_line1` nullable | `text` | ❌ | 200 | — |
| `street_number` | **SIN COLUMNA DB** | `text` | ❌ | — | ⚠️ No se guarda (BUG-029) |
| `floor` | **SIN COLUMNA DB** | `text` | ❌ | — | ⚠️ No se guarda (BUG-029) |
| `door` | **SIN COLUMNA DB** | `text` | ❌ | — | ⚠️ No se guarda (BUG-029) |
| `address_line2` | `address_line2` nullable | `text` | ❌ | 200 | — |
| `postal_code` | `postal_code` nullable | `text` | ❌ | 5 | Solo dígitos si se rellena (patrón `/^\d{5}$/`) |
| `city` | `city` nullable | `text` | ❌ | 100 | — |
| `province` | `province` nullable | `select` | ❌ | — | Lista de 52 provincias, allow clear |
| `notes` | `notes` nullable | `textarea` | ❌ | 500 | — |

#### Tests E2E

| # | Test | Estado |
|---|------|--------|
| FV-AE01 | Guardar sin `name` → error "El nombre es obligatorio" visible bajo el campo | 🚧 No implementado |
| FV-AE02 | Guardar sin `owner_entity_id` → error "Selecciona una entidad" visible | 🚧 No implementado |
| FV-AE03 | `name` con 101 caracteres → error "Máximo 100 caracteres" visible | 🚧 No implementado |
| FV-AE04 | `name` con 100 caracteres → guarda correctamente sin error | 🚧 No implementado |
| FV-AE05 | `address_line1` con 201 caracteres → error "Máximo 200 caracteres" visible | 🚧 No implementado |
| FV-AE06 | `postal_code` = `"2800"` (4 dígitos) → error "Debe tener exactamente 5 dígitos" visible | 🚧 No implementado |
| FV-AE07 | `postal_code` = `"2800A"` (letras) → error "Debe tener exactamente 5 dígitos" visible | 🚧 No implementado |
| FV-AE08 | `postal_code` = `"28001"` (5 dígitos) → sin error, guarda correctamente | 🚧 No implementado |
| FV-AE09 | `postal_code` vacío → sin error (campo opcional) | 🚧 No implementado |
| FV-AE10 | `city` con 101 caracteres → error "Máximo 100 caracteres" visible | 🚧 No implementado |
| FV-AE11 | `notes` con 501 caracteres → error "Máximo 500 caracteres" visible | 🚧 No implementado |
| FV-AE12 | `notes` con 500 caracteres → contador muestra "500 / 500", sin error | 🚧 No implementado |
| FV-AE13 | `address_line2` con 201 caracteres → error "Máximo 200 caracteres" visible | 🚧 No implementado |
| FV-AE14 | Happy path: rellenar solo `name` + `owner_entity_id` → guarda correctamente, redirige a `/v2/admin/alojamientos` | 🚧 No implementado |
| FV-AE15 | Happy path completo: todos los campos opcionales rellenos con valores válidos → guarda sin errores | 🚧 No implementado |
| FV-AE16 | Seleccionar provincia → valor visible en select; "Limpiar" devuelve a vacío | 🚧 No implementado |

---

### 8.3 Inquilino — `/v2/admin/inquilinos/nuevo`

> Fuente verificada: `TenantCreate.jsx` + `LodgerFormFields.jsx` (2026-03-22)
> Actualizado: commit `6b517d6` — eliminado "Fecha de Inicio Cobro" (`billing_start_date`), añadido checkbox "Pago hasta fin de mes" + `end_of_month_amount`

#### Campos del formulario — Datos personales (`LodgerFormFields`)

| Campo | Tipo | Oblig. | Validación extra |
|-------|------|:------:|-----------------|
| `first_name` | `text` | ✅ | Sin restricción de longitud ni patrón |
| `last_name1` | `text` | ✅ | Sin restricción de longitud ni patrón |
| `last_name2` | `text` | ✅ | Sin restricción de longitud ni patrón |
| `nickname` | `text` | ❌ | Nombre preferido, sin restricciones |
| `email` | `email` | ✅ | Formato email válido (`type: "email"`) |
| `phone` | `text` | ✅ | Sin patrón — acepta cualquier texto |
| `document_id` | `text` | ✅ | DNI/NIE/Pasaporte — sin validación de formato |
| `gender` | `select` | ✅ | `male`, `female`, `other` |
| `send_onboarding` | `boolean` | ❌ | Default: `true`. Envía email de bienvenida |

#### Campos del formulario — Asignación de habitación (`TenantCreate`)

> **Estado actual (post commit `6b517d6`):** `billing_start_date` eliminado — ahora siempre es igual a `move_in_date`. Se añadió checkbox "Pago hasta fin de mes" con campo condicional `end_of_month_amount`.

| Campo | Tipo | Oblig. | Validación extra |
|-------|------|:------:|-----------------|
| `accommodation_id` | `select` | ❌ | Pre-cargado desde query param `?acc=`. Al deseleccionar con X → limpia todos los campos de asignación |
| `room_id` | grid de tarjetas | ⚠️ Condicional | **Obligatorio si `accommodation_id` seleccionado.** Solo habitaciones `status = "free"` son clickables |
| `move_in_date` | `date` | ⚠️ Condicional | **Obligatorio si `accommodation_id` seleccionado.** Default: hoy. `billing_start_date` siempre = este valor |
| `payUntilEndOfMonth` | `checkbox` | ❌ | "El inquilino va a pagar desde la fecha de Check-in hasta fin de mes". Estado React, no campo de BD |
| `end_of_month_amount` | `number` | ⚠️ Condicional | **Obligatorio si `payUntilEndOfMonth = true` y `accommodation_id` seleccionado.** Visible solo con checkbox marcado |
| `next_payment_date` | read-only | — | Campo de solo lectura. Calculado: 1º del mes siguiente a `move_in_date`. Visible solo con checkbox marcado |
| `deposit_amount` | `number` | ⚠️ Condicional | **Obligatorio si `accommodation_id` seleccionado.** ≥ 0, 2 decimales |
| `commission_amount` | `number` | ❌ | Comisión de agencia. Acepta 0 o null |
| `first_month_amount` | `number` | ❌ | Visible solo si `payUntilEndOfMonth = false`. Para entradas a mitad de mes |

> **Botón "Limpiar Asignación":** Visible solo cuando `accommodation_id` tiene valor. Icono `ClearOutlined`, estilo `danger`. Resetea: `accommodation_id`, `room_id`, `move_in_date` (→ hoy), `deposit_amount`, `commission_amount`, `first_month_amount`, `end_of_month_amount`, `payUntilEndOfMonth` (→ false).

> **Flujo post-creación (commit `6b517d6`):** Tras guardar, el inquilino NO redirige a edición. En su lugar se muestra la sección de pagadores (`PayersList`) en la misma pantalla.

#### Tests E2E — Datos personales

| # | Test | Estado |
|---|------|--------|
| FV-T01 | Enviar formulario vacío → errores en `first_name`, `last_name1`, `last_name2`, `email`, `phone`, `document_id`, `gender` | 🚧 No implementado |
| FV-T02 | `email` con formato inválido (`"usuario@"`) → error visible | 🚧 No implementado |
| FV-T03 | `email` ya registrado en el tenant → error de duplicado (validado en backend) | 🚧 No implementado |
| FV-T07 | `phone` con texto libre (`"abc-123"`) → se acepta (sin patrón en frontend) | 🚧 No implementado |
| FV-T08 | `gender` no seleccionado → error "Campo obligatorio" | 🚧 No implementado |

#### Tests E2E — Flujo de asignación de habitación

> Fuente: `tests/test-cases/TENANT-CREATE-ROOM-ASSIGNMENT-VALIDATION.md` (2026-03-22)

| # | Test | Descripción | Estado |
|---|------|-------------|--------|
| FV-TC01 | TEST-001 | Crear inquilino SIN asignación → `onboarding_status = 'invited'`, sin `room_id` | 🚧 No implementado |
| FV-TC02 | TEST-002 | Seleccionar alojamiento sin rellenar más campos → errores: habitación, fecha, fianza obligatorios | 🚧 No implementado |
| FV-TC03 | TEST-003 | Crear inquilino CON asignación completa → `onboarding_status = 'active'`, `move_in_date` correcto, `deposit_amount` y `monthly_rent` guardados | 🚧 No implementado |
| FV-TC04 | TEST-004 | Botón "Limpiar Asignación" oculto sin alojamiento, visible al seleccionar uno | 🚧 No implementado |
| FV-TC05 | TEST-005 | Click "Limpiar Asignación" → todos los campos de asignación quedan vacíos, datos personales no cambian | 🚧 No implementado |
| FV-TC06 | TEST-006 | Limpiar asignación con checkbox "Pago hasta fin de mes" marcado → checkbox se desmarca, campo `end_of_month_amount` desaparece | 🚧 No implementado |
| FV-TC07 | TEST-007 | Deseleccionar alojamiento con X del Select → misma limpieza que "Limpiar Asignación" | 🚧 No implementado |
| FV-TC08 | TEST-008 | Con alojamiento seleccionado y sin habitación → error "Debes seleccionar una habitación" | 🚧 No implementado |
| FV-TC09 | TEST-009 | Con alojamiento y habitación, sin fecha → error "La fecha de check-in es obligatoria" | 🚧 No implementado |
| FV-TC10 | TEST-010 | Con alojamiento y habitación, sin fianza → error "El importe de la fianza es obligatorio" | 🚧 No implementado |
| FV-TC11 | TEST-011 | Checkbox "Pago hasta fin de mes" marcado, sin importe → error "El importe es obligatorio" | 🚧 No implementado |
| FV-TC12 | TEST-012 | Cambiar de alojamiento → `room_id` se limpia, se cargan habitaciones del nuevo alojamiento | 🚧 No implementado |

---

### 8.4 Plan de Suscripción — `/v2/superadmin/planes`

> Cubre el CRUD completo de `plans_catalog`. Incluye cálculo de IVA y operaciones especiales (duplicar, desactivar).
>
> ⚠️ **Decisiones de negocio implementadas por Cascade (2026-03-09):**
> - `annual_discount_months` y `annual_price` **eliminados** del esquema
> - `code` se **normaliza automáticamente a UPPERCASE** (no se rechaza, se transforma)
> - `monthly_price` con más de 2 decimales → **redondeo automático**
> - Plan destacado (`is_featured=true`) con `visible=false` → **permitido** (no es error)
> - Cambiar precio con cuentas activas → **warning** (no bloqueo)

#### Campos del formulario

| Campo | Tipo | Oblig. | Máx | Default BD | Validación extra |
|-------|------|:------:|:---:|:----------:|-----------------|
| `name` | `text` | ✅ | 100 | — | No vacío, no solo espacios |
| `code` | `text` | ✅ | 50 | — | **UPPERCASE** automático. Solo `A-Z`, `0-9`, `_`. Único en BD |
| `monthly_price` | `number` | ✅ | — | — | > 0, redondeo automático a 2 decimales |
| `description` | `text` | ❌ | 1000 | `null` | — |
| `status` | `select` | ✅ | — | `active` | `draft`, `active`, `deprecated`, `expired`, `disabled` |
| `start_date` | `date` | ✅ | — | `CURRENT_DATE` | Por defecto hoy |
| `end_date` | `date` | ❌ | — | `null` | ≥ `start_date` si se rellena |
| `deactivated_at` | `date` | ❌ | — | `null` | **Solo si `status = disabled`** |
| `tax_percent` | `number` | ✅ | — | `21` | 0 – 100 (acepta 4, 10, 21) |
| `max_owners` | `integer` | ✅ | — | `1` | -1 (ilimitado) o ≥ 1 |
| `max_accommodations` | `integer` | ✅ | — | `3` | -1 (ilimitado) o ≥ 1 |
| `max_rooms` | `integer` | ✅ | — | `20` | -1 (ilimitado) o ≥ 1 |
| `max_admin_users` | `integer` | ✅ | — | `3` | -1 (ilimitado) o ≥ 1 |
| `max_associated_admins` | `integer` | ✅ | — | `2` | -1 (ilimitado) o ≥ 1 |
| `max_api_users` | `integer` | ✅ | — | `1` | -1 (ilimitado) o ≥ 1 |
| `max_viewer_users` | `integer` | ✅ | — | `0` | -1 (ilimitado) o ≥ 0 |
| `branding_enabled` | `boolean` | ✅ | — | `false` | — |
| `logo_allowed` | `boolean` | ✅ | — | `false` | — |
| `theme_editable` | `boolean` | ✅ | — | `false` | — |
| `allows_multi_owner` | `boolean` | ✅ | — | `false` | — |
| `allows_owner_change` | `boolean` | ✅ | — | `false` | — |
| `allows_receipt_upload` | `boolean` | ✅ | — | `false` | — |
| `services` | `jsonb` | ✅ | — | `[]` | Array JSON válido |
| `features` | `jsonb` | ✅ | — | `[]` | Array JSON válido |
| `visible_for_new_accounts` | `boolean` | ✅ | — | `true` | — |
| `is_featured` | `boolean` | ✅ | — | `false` | — |
| `stripe_price_monthly_id` | `text` | ❌ | 100 | `null` | Debe empezar por `price_` si se rellena |
| `stripe_price_annual_id` | `text` | ❌ | 100 | `null` | Debe empezar por `price_` si se rellena |

#### A — Campos requeridos y defaults

| # | Test | Estado |
|---|------|--------|
| FV-P01 | Enviar sin `name`, `code` ni `monthly_price` → 3 errores visibles | 🚧 No implementado |
| FV-P02 | Crear con solo los 3 campos mínimos → defaults de BD se establecen automáticamente | 🚧 No implementado |
| FV-P03 | Verificar que campos opcionales quedan a `null` si no se rellenan | 🚧 No implementado |

#### B — Validación de formato de `code`

| # | Test | Estado |
|---|------|--------|
| FV-P04 | `code` con espacios (`"plan basico"`) → error de formato | 🚧 No implementado |
| FV-P05 | `code` en minúsculas (`"basic"`) → se normaliza automáticamente a `"BASIC"` | 🚧 No implementado |
| FV-P06 | `code` con caracteres especiales (`"plan-básico!"`) → error | 🚧 No implementado |
| FV-P07 | `code` duplicado → error "El código ya existe" | 🚧 No implementado |
| FV-P08 | `code` con guión bajo (`"PLAN_BASICO_2026"`) → se acepta | 🚧 No implementado |

#### C — Validación de rangos numéricos

| # | Test | Estado |
|---|------|--------|
| FV-P09 | `monthly_price = 0` → error "Debe ser mayor que 0" | 🚧 No implementado |
| FV-P10 | `monthly_price` negativo → error visible | 🚧 No implementado |
| FV-P11 | `tax_percent = 101` → error "Máximo 100" | 🚧 No implementado |
| FV-P12 | `tax_percent` negativo → error visible | 🚧 No implementado |
| FV-P13 | `max_rooms = 0` → error "-1 o mayor que 0" | 🚧 No implementado |
| FV-P14 | `max_rooms = -1` → se acepta y la UI muestra "Ilimitado" | 🚧 No implementado |
| FV-P15 | `end_date` anterior a `start_date` → error visible | 🚧 No implementado |
| FV-P16 | `stripe_price_monthly_id` sin prefijo `price_` → error de formato | 🚧 No implementado |

#### D — Cálculo de IVA (precio final al cliente)

> `annual_discount_months` y `annual_price` **eliminados** — no hay precio anual. Solo precio mensual con IVA.

| # | Test | Fórmula | Estado |
|---|------|---------|--------|
| FV-P17 | Preview precio mensual con IVA 21%: `100 * 1.21 = 121 €` | `monthly * (1 + tax/100)` | 🚧 No implementado |
| FV-P18 | Preview precio mensual con IVA reducido 10%: `100 * 1.10 = 110 €` | — | 🚧 No implementado |
| FV-P19 | Preview precio mensual con IVA 0% (exento): igual que `monthly_price` | — | 🚧 No implementado |

#### E — Campos condicionales

| # | Test | Estado |
|---|------|--------|
| FV-P20 | `deactivated_at` con `status='active'` → error "Solo permitido con status=disabled" | 🚧 No implementado |
| FV-P21 | `status='expired'` + `end_date` futura → error (plan expirado requiere end_date pasada) | 🚧 No implementado |
| FV-P22 | `is_featured=true` + `visible_for_new_accounts=false` → se acepta (combinación válida) | 🚧 No implementado |

#### F — Listar y filtrar

| # | Test | Estado |
|---|------|--------|
| FV-P23 | Lista de planes carga con todos los campos correctamente | 🚧 No implementado |
| FV-P24 | Filtrar por `status='active'` → solo muestra activos | 🚧 No implementado |
| FV-P25 | Filtrar vigentes hoy (`validToday`) → excluye planes con `end_date` pasada | 🚧 No implementado |
| FV-P26 | Buscar por texto parcial (`search='prem'`) → encuentra "Premium", case-insensitive | 🚧 No implementado |
| FV-P27 | Combinar filtros: `status='active'` + `is_featured=true` | 🚧 No implementado |

#### G — Actualizar plan

| # | Test | Estado |
|---|------|--------|
| FV-P28 | Actualizar `name` → cambio persiste, `updated_at` se actualiza | 🚧 No implementado |
| FV-P29 | Actualizar `code` a uno ya existente → error de duplicado | 🚧 No implementado |
| FV-P30 | Actualizar `monthly_price` de plan con cuentas activas → UI muestra warning | 🚧 No implementado |

#### H — Operaciones especiales

| # | Test | Estado |
|---|------|--------|
| FV-P31 | Desactivar plan → `status='disabled'`, `deactivated_at` se establece automáticamente | 🚧 No implementado |
| FV-P32 | Duplicar plan → nuevo con `status='draft'`, `code='XXX_COPY_1'`, `stripe_*_id=null` | 🚧 No implementado |
| FV-P33 | Duplicar cuando ya existe `_COPY_1` → genera `_COPY_2` | 🚧 No implementado |
| FV-P34 | `toggleVisibility` → alterna `visible_for_new_accounts` true↔false | 🚧 No implementado |
| FV-P35 | `setEndDate` con fecha futura válida → se acepta | 🚧 No implementado |
| FV-P36 | `setEndDate` anterior a `start_date` → error visible | 🚧 No implementado |
| FV-P37 | Plan en uso → UI muestra aviso "X cuentas usan este plan" antes de modificar | 🚧 No implementado |
| FV-P38 | `isPlanActive`: `status='active'` pero `end_date` pasada → aparece como inactivo en UI | 🚧 No implementado |

---

### 8.5 Habitación — desde `AccommodationDetail` (tab "Datos del Alojamiento")

> Fuente verificada: `AccommodationDetail.jsx` formulario inline "Nueva Habitación" (2026-03-22)
> URL: `/v2/admin/alojamientos/:accId/habitaciones` → tab "Datos del Alojamiento"

#### Campos del formulario "Añadir habitación"

| Campo | Tipo | Oblig. | Mín | Máx | Default | Validación extra |
|-------|------|:------:|:---:|:---:|:-------:|-----------------|
| `number` | `text` | ✅ | — | 10 (maxLength + rule) | — | No puede estar vacío ni ser solo espacios (`whitespace: true`) |
| `monthly_rent` | `number` | ✅ | 0 | — | `0` | Debe ser ≥ 0. Precio negativo → error |
| `square_meters` | `number` | ❌ | 1 | 999 | — | Si se rellena debe ser entre 1 y 999 |
| `bathroom_type` | `select` | ✅ | — | — | `"shared"` (Compartido) | Valores: `shared`, `private`, `suite` |
| `kitchen_type` | `select` | ✅ | — | — | `"shared"` (Compartida) | Valores: `shared`, `private`, `suite` |

#### Campos del formulario "Editar habitación" (inline en tabla)

| Campo | Tipo | Oblig. | Mín | Validación extra |
|-------|------|:------:|:---:|-----------------|
| `number` | `text` | ✅ | — | Sin maxLength explícito en edición |
| `monthly_rent` | `number` | ❌ | 0 | Mín 0 |
| `square_meters` | `number` | ❌ | 1 | Mín 1 |

#### Tests E2E — "Añadir habitación"

| # | Test | Comportamiento esperado | Estado |
|---|------|------------------------|--------|
| FV-H01 | Enviar formulario sin `number` → error "El número es obligatorio" | Campo requerido + whitespace | 🚧 No implementado |
| FV-H02 | `number` con solo espacios → error "No puede estar vacío" | Regla `whitespace` | 🚧 No implementado |
| FV-H03 | `number` con 11 caracteres → truncado a 10 por `maxLength` | Bloqueado en input | 🚧 No implementado |
| FV-H04 | `monthly_rent` vacío → se acepta (tiene `initialValue=0`) | Precio por defecto 0 | 🚧 No implementado |
| FV-H05 | `monthly_rent` negativo (`-1`) → error "Debe ser mayor o igual a 0" | Regla `min: 0` | 🚧 No implementado |
| FV-H06 | `square_meters` vacío → se acepta (campo opcional) | No requerido | 🚧 No implementado |
| FV-H07 | `square_meters = 0` → error "Debe ser mayor a 0" | Regla `min: 1` | 🚧 No implementado |
| FV-H08 | `square_meters = 1000` → error "Máximo 999 m²" | Regla `max: 999` | 🚧 No implementado |
| FV-H09 | `bathroom_type` y `kitchen_type` ya tienen valor por defecto al abrir el formulario | `initialValue="shared"` | 🚧 No implementado |
| FV-H10 | Añadir habitación correctamente (Nº + precio) → aparece en tabla | Happy path | 🚧 No implementado |
| FV-H11 | Editar habitación: cambiar número → nuevo número visible en tabla | Edit inline | 🚧 No implementado |

---

### 8.6 Servicio del Tenant — `/v2/admin/servicios/nuevo`

#### Campos del formulario

| Campo | Tipo | Oblig. | Máx | Validación extra |
|-------|------|:------:|:---:|-----------------|
| `name` | `text` | ✅ | 100 | — |
| `price` | `number` | ✅ | — | ≥ 0, máx 2 decimales |
| `description` | `text` | ❌ | 500 | — |
| `billing_type` | `select` | ✅ | — | `monthly`, `one_time`, `annual` (según implementación) |

#### Tests E2E

| # | Test | Estado |
|---|------|--------|
| FV-S01 | Enviar sin `name` → error visible | 🚧 No implementado |
| FV-S02 | `price` negativo → error visible | 🚧 No implementado |
| FV-S03 | `price` con más de 2 decimales → error o redondeo visible | 🚧 No implementado |
| FV-S04 | `name` duplicado en el mismo tenant → warning o error | 🚧 No implementado |

---

### 8.6 Factura de Energía — `/v2/admin/energia/facturas/nueva`

#### Campos del formulario

| Campo | Tipo | Oblig. | Máx | Validación extra |
|-------|------|:------:|:---:|-----------------|
| `accommodation_id` | `select` | ✅ | — | Debe existir al menos un alojamiento |
| `issue_date` | `date` | ✅ | — | No futura |
| `period_start` | `date` | ✅ | — | — |
| `period_end` | `date` | ✅ | — | ≥ `period_start` |
| `total_kwh` | `number` | ✅ | — | > 0 |
| `total_amount` | `number` | ✅ | — | > 0, máx 2 decimales |
| `tax_percent` | `number` | ✅ | — | 0 – 100 (IVA) |

#### Tests E2E

| # | Test | Estado |
|---|------|--------|
| FV-EN01 | Enviar sin `accommodation_id` → error "Selecciona un alojamiento" | 🚧 No implementado |
| FV-EN02 | `period_end` anterior a `period_start` → error visible | 🚧 No implementado |
| FV-EN03 | `total_kwh = 0` o negativo → error visible | 🚧 No implementado |
| FV-EN04 | `total_amount` negativo → error visible | 🚧 No implementado |
| FV-EN05 | `tax_percent = 101` → error visible | 🚧 No implementado |
| FV-EN06 | Sin alojamientos creados → selector vacío, formulario bloqueado | 🚧 No implementado |

---

### 8.7 Pagadores del Inquilino — Formulario `PayersList` / `TenantEdit`

> Fuente: plan `mejoras-inquilino-asignacion-95e41a.md` + `tests/test-cases/PAYERS-ROOM-REQUIREMENT-VALIDATION.md` (2026-03-22)
> Componente: `PayersList.jsx` · Tabla BD: `payer_rental`

#### Campos del formulario "Añadir Pagador"

| Campo | Tipo | Oblig. | Condición | Validación extra |
|-------|------|:------:|-----------|-----------------|
| `payer_type` | `radio` | ✅ | Siempre | Valores: `individual` (default), `company` |
| `first_name` | `text` | ✅ | Solo si `individual` | Campo oculto si `company` |
| `last_name1` | `text` | ✅ | Solo si `individual` | Campo oculto si `company` |
| `last_name2` | `text` | ❌ | Solo si `individual` | Opcional |
| `legal_name` | `text` | ✅ | Solo si `company` | Campo oculto si `individual` |
| `notes` | `textarea` | ❌ | Siempre | Ej: "Padre del inquilino" |
| `is_active` | `boolean` | — | — | Default: `true`. Gestionado por botón toggle (no en alta) |

#### Constraint en BD (`payer_data_check`)

- Tipo `individual`: `first_name IS NOT NULL AND last_name1 IS NOT NULL`
- Tipo `company`: `legal_name IS NOT NULL`
- Violación → error visible en UI

#### Tests E2E

| # | Test | Estado |
|---|------|--------|
| FV-PAY01 | Añadir pagador `individual` sin `first_name` → error "El nombre es obligatorio" | 🚧 No implementado |
| FV-PAY02 | Añadir pagador `individual` sin `last_name1` → error "El primer apellido es obligatorio" | 🚧 No implementado |
| FV-PAY03 | Añadir pagador `company` sin `legal_name` → error "El nombre de la empresa es obligatorio" | 🚧 No implementado |
| FV-PAY04 | Cambiar tipo `individual` → `company` → campos `first_name`/`last_name1` desaparecen, `legal_name` aparece | 🚧 No implementado |
| FV-PAY05 | Cambiar tipo `company` → `individual` → `legal_name` desaparece, `first_name`/`last_name1` aparecen | 🚧 No implementado |
| FV-PAY06 | Añadir 2 pagadores individuales activos para el mismo inquilino → ambos aparecen en lista | 🚧 No implementado |
| FV-PAY07 | Añadir pagador persona física + empresa simultáneamente → ambos activos y visibles | 🚧 No implementado |
| FV-PAY08 | Desactivar pagador activo → `is_active = false`, badge cambia a "Inactivo" | 🚧 No implementado |
| FV-PAY09 | Reactivar pagador inactivo → `is_active = true`, badge "Activo" | 🚧 No implementado |
| FV-PAY10 | Editar pagador → modal se abre con datos existentes precargados | 🚧 No implementado |
| FV-PAY11 | Editar pagador → guardar cambios y verificar persistencia en lista | 🚧 No implementado |
| FV-PAY12 | `notes` vacío → se acepta (campo opcional) | 🚧 No implementado |
| FV-PAY13 | Doble click en "Añadir" del modal → botón se deshabilita tras el primer click, se crea UN solo pagador (sin duplicado) | 🚧 No implementado |

#### Regla de negocio: `hasRoomAssignment`

| # | Test | Estado |
|---|------|--------|
| FV-PAY14 | `PayersList` con `hasRoomAssignment=false` → renderiza Alert warning "Sin habitación asignada" / "Habitación requerida", botón "Añadir Pagador" oculto | 🚧 No implementado |
| FV-PAY15 | `PayersList` con `hasRoomAssignment=true` → renderiza botón "Añadir Pagador" visible, sin Alert warning | 🚧 No implementado |
| FV-PAY16 | `PayersList` con `hasRoomAssignment=false` → `loadPayers()` NO se ejecuta (sin llamada a BD innecesaria) | 🚧 No implementado |

---

### 8.8 Asignación de Habitación — Campos Financieros

> Fuente: plan `mejoras-inquilino-asignacion-95e41a.md` · Formulario: `TenantCreate.jsx` / `TenantEdit.jsx`
> Tabla BD: `lodger_room_assignments` — campos nuevos: `deposit_amount`, `commission_amount`, `first_month_amount`, `check_out_date`
> **Pendiente:** Requiere migración de BD previa

#### Campos y reglas

| Campo | Tipo | Oblig. | Regla de validación |
|-------|------|:------:|---------------------|
| `deposit_amount` | `number` | ✅ | ≥ 0. Default: 1 mes de renta. Calculado por selector "1 mes / 2 meses / 3 meses / Personalizado" |
| `commission_amount` | `number` | ❌ | Acepta 0 o null. Sin límite superior |
| `first_month_amount` | `number` | ❌ | ≤ `monthly_rent`. Para entradas a mitad de mes |
| `check_out_date` | `date` | ❌ | Solo visible en edición. Null al crear |

#### Cálculo automático de fianza

`deposit_amount = monthly_rent × N_meses` (N = 1, 2 o 3)

Cuando el usuario selecciona una habitación, el campo se pre-calcula y es editable manualmente.

#### Tests E2E

| # | Test | Fórmula/Regla | Estado |
|---|------|---------------|--------|
| FV-FIN01 | Enviar sin `deposit_amount` → error "La fianza es obligatoria" | Campo requerido | 🚧 No implementado |
| FV-FIN02 | `deposit_amount` negativo → error "Debe ser ≥ 0" | `min: 0` | 🚧 No implementado |
| FV-FIN03 | Seleccionar "1 mes" con renta 450 € → `deposit_amount = 450` (auto) | `450 × 1` | 🚧 No implementado |
| FV-FIN04 | Seleccionar "2 meses" con renta 450 € → `deposit_amount = 900` | `450 × 2` | 🚧 No implementado |
| FV-FIN05 | Seleccionar "3 meses" con renta 450 € → `deposit_amount = 1350` | `450 × 3` | 🚧 No implementado |
| FV-FIN06 | Cambiar habitación (renta diferente) → `deposit_amount` se recalcula automáticamente | `nueva_renta × months` | 🚧 No implementado |
| FV-FIN07 | Seleccionar "Personalizado" → campo editable manualmente | Manual override | 🚧 No implementado |
| FV-FIN08 | `commission_amount = 0` → se acepta | Campo opcional | 🚧 No implementado |
| FV-FIN09 | `commission_amount` vacío → se acepta (null) | Campo opcional | 🚧 No implementado |
| FV-FIN10 | `first_month_amount` vacío → se acepta (null) | Campo opcional | 🚧 No implementado |
| FV-FIN11 | `first_month_amount > monthly_rent` → error visible | `first_month ≤ rent` | 🚧 No implementado |
| FV-FIN12 | `check_out_date` no visible al crear inquilino | Solo en edición | 🚧 No implementado |
| FV-FIN13 | `check_out_date` visible en modo edición (`TenantEdit`) | Solo en edición | 🚧 No implementado |
| FV-FIN14 | `billing_start_date` por defecto igual a `check_in_date` | Default sincronizado | 🚧 No implementado |
| FV-FIN15 | `billing_start_date` puede ser diferente de `check_in_date` | Sin restricción | 🚧 No implementado |
| FV-FIN16 | Label renombrado: "Fecha de Check-In" (no "Fecha de entrada") | UI rename | 🚧 No implementado |
| FV-FIN17 | Label renombrado: "Fecha de Inicio Cobro" (no "Fecha inicio facturación") | UI rename | 🚧 No implementado |

---

### 8.9 Dirección del Inquilino — `LodgerFormFields` / `TenantCreate` / `TenantEdit`

> Fuente verificada: `tests/test-cases/ADDRESS-FIELDS-VALIDATION.md` (2026-03-23)
> Spec: `tenant-address-fields.spec.js` · Migraciones: `20260323_add_address_fields_to_profiles.sql` + `20260323_add_address_number_to_profiles.sql`
> **Todos los campos de dirección son OBLIGATORIOS.**

#### Campos del formulario

| Campo | Tipo | Oblig. | Validación extra |
|-------|------|:------:|-----------------|
| `address_street` | `text` | ✅ | Calle (sin número) |
| `address_number` | `text` | ✅ | Número de portal |
| `address_floor` | `text` | ✅ | Piso / Puerta |
| `address_postal_code` | `text` | ✅ | `maxLength=10` |
| `address_city` | `text` | ✅ | Localidad |
| `address_province` | `select` | ✅ | Lista de 52 provincias |
| `address_country` | `text` | ✅ | Default: `"España"` |

#### Tests E2E

| # | Test | Spec | Estado |
|---|------|------|--------|
| FV-ADDR01 | Crear inquilino con todos los campos de dirección completos → se guarda correctamente | TEST-ADDR-001 | ⚠️ Pendiente |
| FV-ADDR02 | Enviar formulario sin campos de dirección → errores en los 7 campos obligatorios | TEST-ADDR-002 | ⚠️ Pendiente |
| FV-ADDR03 | `address_postal_code` con 11 caracteres → truncado a 10 por `maxLength` | TEST-ADDR-003 | ⚠️ Pendiente |
| FV-ADDR04 | Cada campo de dirección muestra su mensaje de error específico | TEST-ADDR-004 | ⚠️ Pendiente |
| FV-ADDR05 | Campos de dirección también obligatorios en modo edición (`TenantEdit`) | TEST-ADDR-005 | ⚠️ Pendiente |
| FV-ADDR06 | Editar inquilino existente → modificar dirección → cambios persisten | TEST-ADDR-006 | ⚠️ Pendiente |
| FV-ADDR07 | Guardar edición con un campo de dirección vacío → error visible | TEST-ADDR-007 | ⚠️ Pendiente |
| FV-ADDR08 | Asterisco rojo (`*`) visible en todos los campos de dirección | TEST-ADDR-008B | ⚠️ Pendiente |
| FV-ADDR09 | Vista detalle muestra los 6 campos individuales en 2 columnas | TEST-ADDR-009 | ⚠️ Pendiente |
| FV-ADDR10 | Etiqueta "Dirección" visible con separador visual en detalle | TEST-ADDR-010 | ⚠️ Pendiente |
| FV-ADDR11 | Detalle con dirección parcial no muestra `null` ni `undefined` | TEST-ADDR-011 | ⚠️ Pendiente |

---

---

## 9. TESTS UNITARIOS E INTEGRACIÓN (Vitest) — Funcionalidad `payer_rental`

> Fuente: plan `mejoras-inquilino-asignacion-95e41a.md`
> Tipo: tests Vitest (no E2E). Requieren: migración de BD + `payers.service.js` + `PayersList.jsx`
> **Prerrequisito:** Todas las migraciones de BD del plan deben estar aplicadas en staging.

---

### 9.1 Migración de BD — Estructura `payer_rental` y `lodger_room_assignments`

| # | Test | Estado |
|---|------|--------|
| UT-DB01 | Tabla `payer_rental` existe y se puede consultar sin error | 🚧 No implementado |
| UT-DB02 | `payer_rental` tiene todas las columnas requeridas (`id`, `client_account_id`, `lodger_id`, `payer_type`, `first_name`, `last_name1`, `last_name2`, `legal_name`, `is_active`, `notes`, `created_at`, `updated_at`) | 🚧 No implementado |
| UT-DB03 | `lodger_room_assignments` tiene las nuevas columnas (`deposit_amount`, `commission_amount`, `first_month_amount`, `check_out_date`) | 🚧 No implementado |
| UT-DB04 | `deposit_amount` tiene valor por defecto `0` al insertar sin especificar el campo | 🚧 No implementado |
| UT-DB05 | Constraint `payer_data_check`: tipo `individual` sin `first_name` o `last_name1` → error de BD | 🚧 No implementado |
| UT-DB06 | Constraint `payer_data_check`: tipo `company` sin `legal_name` → error de BD | 🚧 No implementado |

---

### 9.2 Servicio `payers.service.js` — CRUD

| # | Test | Estado |
|---|------|--------|
| UT-SVC01 | `listPayers(lodgerId)` devuelve array vacío si no hay pagadores | 🚧 No implementado |
| UT-SVC02 | `listPayers(lodgerId)` devuelve los 3 pagadores creados (2 activos + 1 inactivo) | 🚧 No implementado |
| UT-SVC03 | `createPayer()` crea pagador `individual` con todos los campos | 🚧 No implementado |
| UT-SVC04 | `createPayer()` crea pagador `company` con `legal_name` | 🚧 No implementado |
| UT-SVC05 | `updatePayer()` actualiza el campo `notes` y mantiene el resto | 🚧 No implementado |
| UT-SVC06 | `togglePayerStatus()` cambia `is_active` de `true` a `false` | 🚧 No implementado |
| UT-SVC07 | `togglePayerStatus()` cambia `is_active` de `false` a `true` | 🚧 No implementado |
| UT-SVC08 | Crear 4 pagadores activos simultáneamente para el mismo `lodger_id` → todos activos en BD | 🚧 No implementado |
| UT-SVC09 | `listPayers` filtra por `lodger_id` (no mezcla pagadores de otros inquilinos) | 🚧 No implementado |

---

### 9.3 Servicio `lodgers.service.js` — Nuevos campos financieros

| # | Test | Estado |
|---|------|--------|
| UT-LDG01 | `createLodger()` con payload incluyendo `deposit_amount`, `commission_amount`, `first_month_amount` → asignación en BD tiene los valores correctos | 🚧 No implementado |
| UT-LDG02 | `assignRoomToLodger()` incluye nuevos campos financieros en el INSERT a `lodger_room_assignments` | 🚧 No implementado |
| UT-LDG03 | `reassignRoom()` incluye nuevos campos financieros en la nueva asignación | 🚧 No implementado |

---

### 9.4 Escenarios de múltiples pagadores simultáneos (integración)

| # | Escenario | Estado |
|---|-----------|--------|
| UT-INT01 | Inquilino estudiante con padre y madre como pagadores activos simultáneos → ambos se listan y están activos | 🚧 No implementado |
| UT-INT02 | Inquilino con beca (empresa) + padre (individual) activos a la vez → mix de tipos correcto | 🚧 No implementado |
| UT-INT03 | Desactivar un pagador → los otros 2 siguen activos; el desactivado queda en BD (historial) | 🚧 No implementado |
| UT-INT04 | Añadir nuevo pagador a inquilino que ya tiene 2 activos → 3 activos sin afectar los existentes | 🚧 No implementado |

---

### 9.5 Flujo completo con pagadores (integración)

| # | Test | Estado |
|---|------|--------|
| UT-INT05 | Crear inquilino + asignar habitación con campos financieros + añadir 3 pagadores → todo correcto en BD | 🚧 No implementado |
| UT-INT06 | Reasignar habitación con nuevos términos financieros → asignación anterior `status=ended`, nueva `status=active` con valores nuevos | 🚧 No implementado |
| UT-INT07 | Pagadores persisten al cambiar de habitación (no se borran al reasignar) | 🚧 No implementado |

---

### 9.6 Cálculo de fianza (unit puro)

| # | Test | Fórmula | Estado |
|---|------|---------|--------|
| UT-DEP01 | `monthly_rent=450` + 1 mes → `deposit_amount=450` | `450 × 1` | 🚧 No implementado |
| UT-DEP02 | `monthly_rent=450` + 2 meses → `deposit_amount=900` | `450 × 2` | 🚧 No implementado |
| UT-DEP03 | `monthly_rent=450` + 3 meses → `deposit_amount=1350` | `450 × 3` | 🚧 No implementado |
| UT-DEP04 | Modo "Personalizado" → acepta cualquier valor ≥ 0 | Manual | 🚧 No implementado |
| UT-DEP05 | Cambiar habitación de `rent=400` a `rent=500` con "2 meses" → `deposit_amount` recalcula de 800 a 1000 | `500 × 2` | 🚧 No implementado |

---

### 9.7 Componente `PayersList.jsx` (React Testing Library)

| # | Test | Estado |
|---|------|--------|
| UT-CMP01 | Renderiza con título "Pagadores" y botón "Añadir Pagador" | 🚧 No implementado |
| UT-CMP02 | Muestra 3 pagadores activos simultáneos con sus badges "Activo" y tipo | 🚧 No implementado |
| UT-CMP03 | Pagador inactivo muestra badge "Inactivo" con estilo diferente | 🚧 No implementado |
| UT-CMP04 | Click "Añadir Pagador" → modal abre con tipo `individual` por defecto | 🚧 No implementado |
| UT-CMP05 | Validación: enviar modal sin `first_name` → error visible | 🚧 No implementado |
| UT-CMP06 | Validación: enviar modal sin `last_name1` → error visible | 🚧 No implementado |
| UT-CMP07 | Validación empresa: enviar modal sin `legal_name` → error visible | 🚧 No implementado |
| UT-CMP08 | Crear pagador individual correctamente → llama a `createPayer()` con payload correcto | 🚧 No implementado |
| UT-CMP09 | Crear pagador empresa correctamente → `first_name`/`last_name1` = null en payload | 🚧 No implementado |
| UT-CMP10 | Click toggle "Desactivar" → llama a `togglePayerStatus()` con id correcto | 🚧 No implementado |
| UT-CMP11 | Click editar → modal abre con datos del pagador precargados | 🚧 No implementado |

---

## 10. SEGURIDAD — Aislamiento Multi-tenant

> Garantiza que **ningún tenant puede ver ni modificar datos de otro tenant**, ni accidentalmente ni intencionadamente.
> Mecanismo principal: columna `client_account_id` en todas las tablas + RLS en Postgres.
> Spec: `security-multi-tenant-isolation.spec.js` · Proyecto: `regression-security`
>
> **Prerrequisito:** Dos tenants con datos de ejemplo:
> - **Tenant A** = gestor principal (`TEST_MANAGER_EMAIL`) con entidades, alojamientos, inquilinos propios
> - **Tenant B** = segundo gestor (`TEST_MANAGER_B_EMAIL`) con datos distintos (IDs conocidos en seed)

---

### 10.1 Aislamiento por URL — IDOR (Insecure Direct Object Reference)

> Gestor autenticado de tenant A manipula el UUID en la URL para intentar acceder a recursos de tenant B.
> Resultado esperado en todos los casos: página vacía / "No encontrado" sin exponer datos ajenos.

| # | Test | Recurso de tenant B | URL atacada | Resultado esperado | Estado |
|---|------|---------------------|-------------|-------------------|--------|
| MT-01 | Gestor A navega a entidad de tenant B por UUID | Entidad propietaria | `/v2/admin/entidades/:id_B` | Página muestra "No encontrado" o datos vacíos sin exponer info de B | 🚧 No implementado |
| MT-02 | Gestor A navega al detalle de alojamiento de tenant B | Alojamiento | `/v2/admin/alojamientos/:id_B/habitaciones` | Habitaciones vacías o "No encontrado", sin nombre del alojamiento de B | 🚧 No implementado |
| MT-03 | Gestor A navega a edición de alojamiento de tenant B | Alojamiento | `/v2/admin/alojamientos/:id_B/editar` | Formulario vacío o error, sin datos del alojamiento de B | 🚧 No implementado |
| MT-04 | Gestor A navega a edición de inquilino de tenant B | Inquilino | `/v2/admin/inquilinos/:id_B/editar` | "Inquilino no encontrado" sin datos personales de B | 🚧 No implementado |
| MT-05 | Gestor A navega al detalle de consumo de inquilino de tenant B | Detalle inquilino | `/v2/admin/inquilinos/:id_B/detalle` | Error o página vacía sin consumos ni nombre del inquilino de B | 🚧 No implementado |
| MT-06 | Gestor A navega al detalle ampliado de inquilino de tenant B | Detalle inquilino | `/v2/admin/inquilinos/:id_B/detalle-inquilino` | Sin datos expuestos de B | 🚧 No implementado |
| MT-07 | Gestor A navega a servicios de alojamiento de tenant B | Servicios | `/v2/admin/alojamientos/:id_B/servicios` | Lista vacía o error, sin servicios del alojamiento de B | 🚧 No implementado |

---

### 10.2 Aislamiento en listados — Queries filtradas por RLS

> Los listados del gestor de tenant A solo deben contener registros de tenant A. El RLS filtra automáticamente por `client_account_id`.

| # | Test | Listado | Validación | Estado |
|---|------|---------|-----------|--------|
| MT-08 | Lista de entidades de tenant A no contiene entidades de tenant B | `/v2/admin/entidades` | Ningún nombre de entidad de B aparece en la tabla; contador solo cuenta entidades de A | 🚧 No implementado |
| MT-09 | Lista de alojamientos de tenant A no contiene alojamientos de tenant B | `/v2/admin/alojamientos` | Ningún nombre de alojamiento de B visible; KPIs correctos (solo A) | 🚧 No implementado |
| MT-10 | Lista de inquilinos de tenant A no contiene inquilinos de tenant B | `/v2/admin/inquilinos` | Ningún email ni nombre de inquilino de B visible en la tabla | 🚧 No implementado |
| MT-11 | Dashboard de tenant A muestra KPIs con conteos correctos (solo propios) | `/v2/admin/dashboard` | "Inquilinos activos", "Hab. libres" etc. coinciden con datos de A, sin inflar con datos de B | 🚧 No implementado |
| MT-12 | Selector de habitaciones libres en alta de inquilino — solo muestra habitaciones del propio tenant | `TenantCreate` → selector alojamiento/habitación | Ninguna habitación de alojamiento de B aparece en el selector | 🚧 No implementado |
| MT-13 | Selector de entidades propietarias en nuevo alojamiento — solo muestra entidades del propio tenant | `AccommodationCreate` → selector entidad | Sin entidades de B | 🚧 No implementado |

---

### 10.3 Aislamiento en escritura — RLS bloquea UPDATE/INSERT cruzados

> Intentar guardar cambios sobre recursos de tenant B falla a nivel de RLS en Supabase. La UI debe mostrar un error claro.

| # | Test | Operación intentada | Resultado esperado | Estado |
|---|------|---------------------|-------------------|--------|
| MT-14 | Gestor A edita entidad de B por URL → pulsa "Guardar" | `UPDATE entities SET ... WHERE id = :id_B AND client_account_id = :A` | 0 rows updated (RLS no permite): UI muestra error "No se pudo guardar" o no redirige | 🚧 No implementado |
| MT-15 | Gestor A edita alojamiento de B → pulsa "Guardar Alojamiento" | `UPDATE accommodations WHERE id = :id_B AND client_account_id = :A` | RLS rechaza: sin cambios en BD, UI muestra error | 🚧 No implementado |
| MT-16 | Gestor A intenta añadir habitación a alojamiento de B | `INSERT rooms (accommodation_id = :id_B, client_account_id = :A)` | RLS rechaza el INSERT: error visible en UI | 🚧 No implementado |
| MT-17 | Gestor A intenta crear inquilino asignado a habitación de B | `INSERT lodger_room_assignments (room_id = :room_B)` | RLS rechaza: `client_account_id` no coincide con `accommodation.client_account_id` | 🚧 No implementado |
| MT-18 | Gestor A pone en mantenimiento habitación de tenant B | `UPDATE rooms SET is_maintenance = true WHERE id = :room_B` | RLS rechaza: habitación no modificada, UI muestra error | 🚧 No implementado |

---

### 10.4 Aislamiento en Edge Functions

> Las Edge Functions leen el JWT del usuario autenticado y verifican el `client_account_id` antes de ejecutar. No aceptan parámetros que permitan actuar fuera del propio tenant.

| # | Test | Función Edge | Ataque | Resultado esperado | Estado |
|---|------|-------------|--------|-------------------|--------|
| MT-19 | `manage_lodger` con `lodger_id` de tenant B en el body → rechazada | `manage_lodger` | JWT de A + `lodger_id` de B | Error 400/403 o "lodger not found" — no se ejecuta la operación | 🚧 No implementado |
| MT-20 | `manage_accommodation` con `accommodation_id` de tenant B → rechazada | `manage_accommodation` | JWT de A + `accommodation_id` de B | Error devuelto, sin modificación en BD | 🚧 No implementado |
| MT-21 | `whoami` devuelve solo el `client_account_id` del JWT autenticado, sin datos de otros tenants | `whoami` | JWT de A | Respuesta contiene `client_account_id` de A, no de B | 🚧 No implementado |
| MT-22 | Token expirado o inválido en Edge Function → rechazado con 401 | Cualquier Edge Function | Token manipulado | HTTP 401, sin datos en respuesta | 🚧 No implementado |

---

### 10.5 Aislamiento en el portal del inquilino

> Un inquilino de tenant A solo puede ver sus propios datos. No puede acceder a datos de otro inquilino ni de otro tenant.

| # | Test | Recurso | URL | Resultado esperado | Estado |
|---|------|---------|-----|-------------------|--------|
| MT-23 | Inquilino A ve solo su habitación en el dashboard | Dashboard lodger | `/v2/lodger/dashboard` | Solo datos de su habitación y asignación, sin info de inquilinos de B | 🚧 No implementado |
| MT-24 | Inquilino A intenta acceder a boletín de inquilino B por UUID | Boletín ajeno | `/v2/lodger/boletines/:id_B` | RLS devuelve vacío: "Boletín no encontrado" sin datos de B | 🚧 No implementado |
| MT-25 | Inquilino A ve solo sus propios consumos de energía | Consumos | `/v2/lodger/consumo` | Sin liquidaciones de inquilinos de B ni de A-tenant-B | 🚧 No implementado |
| MT-26 | Inquilino A ve solo sus propios servicios asignados | Servicios | `/v2/lodger/servicios` | Sin servicios de inquilinos de B | 🚧 No implementado |
| MT-27 | Inquilino A no puede acceder al portal gestor | Portales cruzados | `/v2/admin/entidades` | Redirige a login del portal inquilino, sin datos del gestor expuestos | 🚧 No implementado |

---

### 10.6 Aislamiento entre roles dentro del mismo tenant

> Un viewer no puede escalar privilegios. Un admin no puede actuar como superadmin.

| # | Test | Actor | Acción | Resultado esperado | Estado |
|---|------|-------|--------|-------------------|--------|
| MT-28 | Viewer del tenant A intenta crear entidad (botón deshabilitado) | viewer | Click "Nueva entidad" | Botón deshabilitado o ruta protegida; sin acceso de escritura | 🚧 No implementado |
| MT-29 | Viewer del tenant A accede a URL de edición de entidad directamente | viewer | `/v2/admin/entidades/:id/editar` | Formulario read-only o redirige sin permitir guardar | 🚧 No implementado |
| MT-30 | Admin del tenant A intenta acceder al panel superadmin | admin | `/v2/superadmin` | Redirige a dashboard del gestor o muestra "Acceso denegado" | 🚧 No implementado |
| MT-31 | Admin del tenant A no ve cuentas de cliente de otros tenants en superadmin | admin | `/v2/superadmin/cuentas` | Sin acceso (redirigido) o lista vacía | 🚧 No implementado |

---

### 10.7 Datos globales — catálogo compartido (comportamiento correcto)

> Los recursos globales del catálogo (planes, servicios globales) SÍ son visibles para todos los tenants. Esto es comportamiento esperado, no una fuga.

| # | Test | Recurso global | Resultado esperado | Estado |
|---|------|---------------|-------------------|--------|
| MT-32 | Página de planes del catálogo visible para cualquier usuario autenticado | `/v2/planes` | Planes del catálogo global cargados sin `client_account_id` | 🚧 No implementado |
| MT-33 | Gestor A puede ver catálogo de servicios globales en selector de servicios | Servicios globales | Servicios del catálogo global visibles; servicios privados de tenant B NO visibles | 🚧 No implementado |
| MT-34 | SuperAdmin puede ver cuentas de cliente de todos los tenants (privilegio esperado) | `/v2/superadmin/cuentas` | Lista contiene tenant A y tenant B (acceso legítimo del superadmin) | 🚧 No implementado |

---

## Resumen de cobertura

| Módulo | Con spec .js | Pendiente (⚠️) | Sin spec (🚧) | Total |
|--------|:---:|:---:|:---:|:---:|
| Auth / Login | 0 | 7 | 6 | 13 |
| SuperAdmin | 0 | 0 | 11 | 11 |
| Admin — Dashboard | 0 | 2 | 0 | 2 |
| Admin — Entidades (general) | 0 | 6 | 4 | 10 |
| Admin — Entidades Basic (E-B) | 6 | 0 | 0 | 6 |
| Admin — Entidades Investor/Business/Agency | 0 | 0 | 12 | 12 |
| Admin — Alojamientos (general) | 0 | 8 | 3 | 11 |
| Admin — Alojamientos restricciones plan | 0 | 0 | 6 | 6 |
| Admin — HAB estado desde asignaciones | 1 | 1 | 7 | 9 |
| Admin — Inquilinos | 0 | 8 | 3 | 11 |
| Admin — Estado inquilino desde fechas | 0 | 0 | 8 | 8 |
| Admin — Pagadores (`payer_rental`) E2E | 0 | 0 | 25 | 25 |
| Admin — Energía | 4 | 0 | 1 | 5 |
| Admin — Boletines | 3 | 0 | 0 | 3 |
| Admin — Servicios | 2 | 0 | 2 | 4 |
| Admin — Borrado y desactivación | 8 | 0 | 0 | 8 |
| Admin — Settings | 0 | 0 | 1 | 1 |
| Admin — Restricciones plan Basic | 5 | 0 | 0 | 5 |
| Inquilino (lodger) | 0 | 0 | 9 | 9 |
| Web pública | 0 | 1 | 5 | 6 |
| Control de acceso | 0 | 0 | 8 | 8 |
| Reglas de negocio | 0 | 0 | 6 | 6 |
| Validaciones — Entidades, Alojamientos, Inquilinos | 0 | 0 | 69 | 69 |
| Validaciones — Editar Alojamiento (FV-AE) | 0 | 0 | 16 | 16 |
| Validaciones — Dirección del Inquilino (FV-ADDR) | 0 | 11 | 0 | 11 |
| Validaciones — Pagadores (FV-PAY) | 0 | 0 | 16 | 16 |
| Validaciones — Asignación financiera (FV-FIN) | 0 | 0 | 17 | 17 |
| Validaciones — Planes, Servicios, Energía, Habitaciones | 0 | 0 | 55 | 55 |
| Tests Vitest — BD Migración | 0 | 0 | 6 | 6 |
| Tests Vitest — `payers.service` | 0 | 0 | 9 | 9 |
| Tests Vitest — `lodgers.service` financiero | 0 | 0 | 3 | 3 |
| Tests Vitest — Escenarios pagadores múltiples | 0 | 0 | 7 | 7 |
| Tests Vitest — Cálculo fianza | 0 | 0 | 5 | 5 |
| Tests Vitest — `PayersList` componente | 0 | 0 | 11 | 11 |
| Seguridad — Multi-tenant (MT) | 0 | 0 | 34 | 34 |
| **Total** | **29** | **44** | **367** | **440** |

> **Specs activos:** `smoke.spec.js`, `entities.spec.js`, `accommodations.spec.js`, `tenants.spec.js`, `admin-basic.spec.js`, `room-status-and-checkout.spec.js`, `tenant-address-fields.spec.js`
>
> **Variable nueva requerida en `.env.e2e`:** `TEST_MANAGER_B_EMAIL` / `TEST_MANAGER_B_PASSWORD` — segundo gestor (tenant B) con datos de ejemplo distintos al gestor principal.

> **Columnas**: "Con spec .js" = fichero escrito (pendiente credenciales staging) · "Pendiente" = spec escrito, sin credenciales · "Sin spec" = solo en este catálogo
>
> **Specs escritos**: `smoke.spec.js`, `entities.spec.js`, `accommodations.spec.js`, `tenants.spec.js`, `admin-basic.spec.js` (43 tests)
>
> **Pendiente de implementar** (requiere plan Windsurf): `payers.service.js`, `PayersList.jsx`, migración BD `payer_rental` y campos financieros en `lodger_room_assignments`

---

## Specs `.js` existentes

| Fichero | Proyecto Playwright | Tests que cubre | Estado |
|---------|---------------------|-----------------|--------|
| `smoke.spec.js` | `chromium`, `firefox`, `webkit` | PUB-01, AUTH-01, AUTH-04 (básico) | ✅ Escrito |
| `entities.spec.js` | `regression` | E-01 a E-08 | ✅ Escrito |
| `accommodations.spec.js` | `regression` | A-01 a A-09 | ✅ Escrito |
| `tenants.spec.js` | `regression` | T-01 a T-08 | ✅ Escrito |
| `tenant-address-fields.spec.js` | `regression` | ADDR-001..011 (dirección completa, parcial, edición, detalle) | ✅ Escrito |
| `admin-basic.spec.js` | `regression-basic` | DB-01..03, E-B01..06, A-B (básico), T (Basic), EN-01..03, BL-01..03, SV-01..02, BD-01..08, Restricciones plan Basic | ✅ Escrito (43 tests) |
| `admin-investor.spec.js` | `regression-investor` | E-I01..05, A-I01..02, operativa Investor | 🚧 Por escribir |
| `admin-business.spec.js` | `regression-business` | E-BU01..04, operativa Business | 🚧 Por escribir |
| `admin-agency.spec.js` | `regression-agency` | E-AG01..03, operativa Agency | 🚧 Por escribir |
| `superadmin.spec.js` | `regression` | SA-01 a SA-09 | 🚧 Por escribir |
| `lodger.spec.js` | `regression` | LG-01 a LG-07 | 🚧 Por escribir |
| `energy.spec.js` | `regression` | EN-01 a EN-05 | 🚧 Por escribir |
| `bulletins.spec.js` | `regression` | BL-01 a BL-03 | 🚧 Por escribir |
| `services.spec.js` | `regression` | SV-01 a SV-04 | 🚧 Por escribir |
| `access-control.spec.js` | `regression` | AC-01 a AC-08 | 🚧 Por escribir |
| `business-rules.spec.js` | `regression` | RN-01 a RN-06 | 🚧 Por escribir |
| `security-multi-tenant-isolation.spec.js` | `regression-security` | MT-01 a MT-34 — IDOR por URL, listados RLS, escritura cruzada, Edge Functions, portal inquilino, roles, catálogo global | 🚧 Por escribir |
| `form-validations.spec.js` | `regression` | FV-E01..07, FV-A01..07, FV-T01..06, FV-P01..38, FV-S01..04, FV-EN01..06 | 🚧 Por escribir |

---

## Comandos de ejecución

```bash
# Smoke (sin auth, básico — 3 tests)
npm run test:e2e:smoke

# Todos los regression con auth
npm run test:e2e:regression

# Por módulo (con auth — gestor principal)
npx playwright test entities.spec.js --project=regression
npx playwright test accommodations.spec.js --project=regression
npx playwright test tenants.spec.js --project=regression
npx playwright test superadmin.spec.js --project=regression
npx playwright test lodger.spec.js --project=regression
npx playwright test energy.spec.js --project=regression
npx playwright test bulletins.spec.js --project=regression
npx playwright test services.spec.js --project=regression
npx playwright test access-control.spec.js --project=regression
npx playwright test business-rules.spec.js --project=regression
npx playwright test form-validations.spec.js --project=regression

# Por plan (requieren credenciales de plan específico en .env.e2e)
npx playwright test admin-basic.spec.js --project=regression-basic
npx playwright test admin-investor.spec.js --project=regression-investor
npx playwright test admin-business.spec.js --project=regression-business
npx playwright test admin-agency.spec.js --project=regression-agency

# Con browser visible (debug)
npm run test:e2e:headed

# Solo los tests de borrado y desactivación (Basic)
npx playwright test admin-basic.spec.js --project=regression-basic --grep "Borrado"
```
