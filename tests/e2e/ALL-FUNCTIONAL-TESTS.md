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

| Usuario | Rol | Variable en `.env.e2e` | Estado |
|---------|-----|------------------------|--------|
| Gestor principal | `admin` | `TEST_MANAGER_EMAIL` / `TEST_MANAGER_PASSWORD` | ✅ Configurado |
| Viewer (solo lectura) | `viewer` | `TEST_VIEWER_EMAIL` / `TEST_VIEWER_PASSWORD` | 🚧 Pendiente crear |
| Inquilino activo | `lodger` | `TEST_LODGER_EMAIL` / `TEST_LODGER_PASSWORD` | 🚧 Pendiente crear |
| SuperAdmin | `superadmin` | `TEST_SUPERADMIN_EMAIL` / `TEST_SUPERADMIN_PASSWORD` | 🚧 Pendiente crear |

> Los tests de Gestor/Admin usan credenciales de staging con un tenant que tiene datos de ejemplo.

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

| # | Test | Rol mínimo | Estado |
|---|------|------------|--------|
| DB-01 | Dashboard gestor carga sin errores | viewer | 🚧 No implementado |
| DB-02 | KPIs globales del tenant visibles (Inquilinos, Alojamientos, Hab. Libres) | viewer | 🚧 No implementado |

### 3.2 Entidades Propietarias

| # | Test | Rol mínimo | Estado | Fichero |
|---|------|------------|--------|---------|
| E-01 | Lista de entidades carga con título y botón "Nueva entidad" | viewer | ⚠️ Pendiente | `entities.spec.js · 01` |
| E-02 | Crear entidad tipo Persona física con dirección | admin | ⚠️ Pendiente | `entities.spec.js · 02` |
| E-03 | Crear entidad tipo Persona jurídica (razón social) | admin | 🚧 No implementado | — |
| E-04 | Crear entidad tipo Autónomo | admin | 🚧 No implementado | — |
| E-05 | Navegar al detalle de entidad y obtener ID desde URL | viewer | ⚠️ Pendiente | `entities.spec.js · 03` |
| E-06 | Editar entidad: cambiar teléfono y verificar persistencia | admin | ⚠️ Pendiente | `entities.spec.js · 04` |
| E-07 | Ver detalle de la entidad (nombre visible en página) | viewer | ⚠️ Pendiente | `entities.spec.js · 05` |
| E-08 | KPIs de entidad visibles en lista (Aloj., Libres) | viewer | ⚠️ Pendiente | `entities.spec.js · 06` |
| E-09 | Buscar entidad por nombre en el buscador | viewer | 🚧 No implementado | — |
| E-10 | Viewer NO ve botón "Nueva entidad" (solo lectura) | viewer | 🚧 No implementado | — |

### 3.3 Alojamientos

| # | Test | Rol mínimo | Estado | Fichero |
|---|------|------------|--------|---------|
| A-01 | Lista de alojamientos carga con botón "Nuevo Alojamiento" | viewer | ⚠️ Pendiente | `accommodations.spec.js · 01` |
| A-02 | Crear alojamiento: wizard paso 1 (datos + entidad propietaria) | admin | ⚠️ Pendiente | `accommodations.spec.js · 02` |
| A-03 | Crear alojamiento: wizard paso 2 (configurar habitaciones) | admin | ⚠️ Pendiente | `accommodations.spec.js · 02` |
| A-04 | Obtener ID del alojamiento desde URL (navegación a Editar) | viewer | ⚠️ Pendiente | `accommodations.spec.js · 03` |
| A-05 | Ver habitaciones del alojamiento (AccommodationDetail) | viewer | ⚠️ Pendiente | `accommodations.spec.js · 04` |
| A-06 | Habitaciones muestran badge de estado (Libre / Ocupada) | viewer | ⚠️ Pendiente | `accommodations.spec.js · 04` |
| A-07 | Editar alojamiento: cambiar nombre | admin | ⚠️ Pendiente | `accommodations.spec.js · 05` |
| A-08 | Añadir habitación desde AccommodationEdit | admin | ⚠️ Pendiente | `accommodations.spec.js · 06` |
| A-09 | KPIs del alojamiento visibles (Total, Ocupado, Libres) | viewer | ⚠️ Pendiente | `accommodations.spec.js · 07` |
| A-10 | Asignar servicios a un alojamiento | admin | 🚧 No implementado | — |
| A-11 | Buscar alojamiento por nombre | viewer | 🚧 No implementado | — |

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

#### Campos del formulario

| Campo | Tipo | Oblig. | Máx | Validación extra |
|-------|------|:------:|:---:|-----------------|
| `legal_type` | `select` | ✅ | — | Valores: `persona_fisica`, `persona_juridica`, `autonomo` |
| `legal_name` | `text` | ✅ si jurídica | 200 | Solo visible si `legal_type = persona_juridica` |
| `first_name` | `text` | ✅ si física/autónomo | 100 | Oculto si `legal_type = persona_juridica` |
| `last_name1` | `text` | ✅ si física/autónomo | 100 | Oculto si `legal_type = persona_juridica` |
| `last_name2` | `text` | ❌ | 100 | — |
| `billing_email` | `email` | ❌ | 255 | Formato email válido si se rellena |
| `phone` | `text` | ❌ | 20 | Solo dígitos y `+`, `-`, espacios |
| `tax_id` | `text` | ❌ | 20 | NIF/CIF — sin validación de formato en E2E |
| `city` | `text` | ❌ | 100 | — |
| `province` | `select` | ❌ | — | Lista de 52 provincias españolas |
| `zip` | `text` | ❌ | 5 | Solo dígitos, exactamente 5 si se rellena |
| `street` | `text` | ❌ | 200 | — |
| `street_number` | `text` | ❌ | 10 | — |

#### Tests E2E

| # | Test | Estado |
|---|------|--------|
| FV-E01 | Enviar formulario vacío → errores en `legal_type`, `first_name`/`legal_name` | 🚧 No implementado |
| FV-E02 | `legal_type = persona_juridica` → campo `legal_name` es obligatorio | 🚧 No implementado |
| FV-E03 | `legal_type = persona_fisica` → campos `first_name` y `last_name1` obligatorios | 🚧 No implementado |
| FV-E04 | `billing_email` con formato inválido (`noesun@email`) → error visible | 🚧 No implementado |
| FV-E05 | `zip` con letras (`ABCDE`) → error visible | 🚧 No implementado |
| FV-E06 | `zip` con 4 dígitos (demasiado corto) → error visible | 🚧 No implementado |
| FV-E07 | Cambiar `legal_type` de jurídica a física → `legal_name` desaparece, `first_name` aparece | 🚧 No implementado |

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

### 8.3 Inquilino — `/v2/admin/inquilinos/nuevo`

#### Campos del formulario

| Campo | Tipo | Oblig. | Máx | Validación extra |
|-------|------|:------:|:---:|-----------------|
| `first_name` | `text` | ✅ | 100 | — |
| `last_name1` | `text` | ✅ | 100 | — |
| `email` | `email` | ✅ | 255 | Formato email válido, único en el tenant |
| `phone` | `text` | ❌ | 20 | Solo dígitos y separadores |
| `room_id` | `select` | ✅ | — | Solo habitaciones con estado "Libre" |
| `start_date` | `date` | ✅ | — | No puede ser en el pasado (o configurable) |
| `end_date` | `date` | ❌ | — | Debe ser posterior a `start_date` |

#### Tests E2E

| # | Test | Estado |
|---|------|--------|
| FV-T01 | Enviar formulario vacío → errores en `first_name`, `email`, `room_id` | 🚧 No implementado |
| FV-T02 | `email` con formato inválido → error visible | 🚧 No implementado |
| FV-T03 | `email` ya registrado en el tenant → error de duplicado | 🚧 No implementado |
| FV-T04 | Selector de habitación solo muestra las "Libres" (no las ocupadas) | 🚧 No implementado |
| FV-T05 | `end_date` anterior a `start_date` → error visible | 🚧 No implementado |
| FV-T06 | `phone` con letras (`abc123`) → campo rechaza o muestra error | 🚧 No implementado |

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

### 8.5 Servicio del Tenant — `/v2/admin/servicios/nuevo`

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

## Resumen de cobertura

| Módulo | Con spec .js | Pendiente (⚠️) | Sin spec (🚧) | Total |
|--------|:---:|:---:|:---:|:---:|
| Auth / Login | 0 | 7 | 6 | 13 |
| SuperAdmin | 0 | 0 | 11 | 11 |
| Admin — Dashboard | 0 | 0 | 2 | 2 |
| Admin — Entidades | 0 | 6 | 4 | 10 |
| Admin — Alojamientos | 0 | 8 | 3 | 11 |
| Admin — Inquilinos | 0 | 8 | 3 | 11 |
| Admin — Energía | 0 | 0 | 5 | 5 |
| Admin — Boletines | 0 | 0 | 3 | 3 |
| Admin — Servicios | 0 | 0 | 4 | 4 |
| Admin — Settings | 0 | 0 | 1 | 1 |
| Inquilino (lodger) | 0 | 0 | 9 | 9 |
| Web pública | 0 | 1 | 5 | 6 |
| Control de acceso | 0 | 0 | 8 | 8 |
| Reglas de negocio | 0 | 0 | 6 | 6 |
| Validaciones formulario | 0 | 0 | 73 | 73 |
| **Total** | **0** | **30** | **143** | **173** |

> **Columnas**: "Con spec .js" = fichero escrito y pasando en staging · "Pendiente" = spec escrito pero no verificado · "Sin spec" = solo en este catálogo

---

## Specs `.js` existentes

| Fichero | Tests que cubre |
|---------|-----------------|
| `smoke.spec.js` | PUB-01, AUTH-01, AUTH-04 (básico) |
| `entities.spec.js` | E-01 a E-08 |
| `accommodations.spec.js` | A-01 a A-09 |
| `tenants.spec.js` | T-01 a T-08 |
| `superadmin.spec.js` | SA-01 a SA-09 — 🚧 **Por escribir** |
| `lodger.spec.js` | LG-01 a LG-07 — 🚧 **Por escribir** |
| `energy.spec.js` | EN-01 a EN-05 — 🚧 **Por escribir** |
| `bulletins.spec.js` | BL-01 a BL-03 — 🚧 **Por escribir** |
| `services.spec.js` | SV-01 a SV-04 — 🚧 **Por escribir** |
| `access-control.spec.js` | AC-01 a AC-08 — 🚧 **Por escribir** |
| `business-rules.spec.js` | RN-01 a RN-06 — 🚧 **Por escribir** |
| `form-validations.spec.js` | FV-E01..07, FV-A01..07, FV-T01..06, FV-P01..38, FV-S01..04, FV-EN01..06 — 🚧 **Por escribir** |

---

## Comandos de ejecución

```bash
# Smoke (sin auth, básico — 3 tests)
npm run test:e2e:smoke

# Todos los regression con auth
npm run test:e2e:regression

# Por módulo (con auth)
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

# Con browser visible (debug)
npm run test:e2e:headed
```
