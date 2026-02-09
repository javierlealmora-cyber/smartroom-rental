# SmartRent Systems — Gestion de Planes, Servicios, Cuentas Cliente y Autoregistro (UI-first)
Version: v1.3 (UI-first, estado actualizado post-implementacion)
Fecha: 2026-02-09

Este documento refleja el **estado real implementado** en el frontend (React + Vite, inline styles, datos mock).
Sirve como base funcional para disenar las tablas de la base de datos y codificar el backend (Supabase Edge Functions).

---

## 1) Objetivo

El modulo cubre cuatro grandes bloques funcionales:

1. **Gestion de Planes de Suscripcion** (Superadmin) — CRUD completo de planes.
2. **Catalogo de Servicios** (Superadmin) — CRUD de servicios dinamicos asociables a planes.
3. **Gestion de Cuentas Cliente** (Superadmin) — Listado, detalle con tabs, creacion y edicion de cuentas cliente con sus entidades asociadas (empresas legales, internas, alojamientos, usuarios).
4. **Autoregistro / Alta de Cuenta Cliente** — Wizard publico (self_signup) y wizard Superadmin (superadmin_create) para crear cuentas cliente con plan, usuarios admin, entidad pagadora, branding y metodo de pago.

---

## 2) Estado actual de la implementacion (UI-first, sin backend)

| Funcionalidad | Estado | Archivos |
|---|---|---|
| PlansList (listado + filtros + acciones) | IMPLEMENTADO (mock) | `src/pages/v2/superadmin/plans/PlansList.jsx` |
| PlanCreate (formulario 7 secciones) | IMPLEMENTADO (mock) | `src/pages/v2/superadmin/plans/PlanCreate.jsx` |
| PlanDetail (lectura + edicion) | IMPLEMENTADO (mock) | `src/pages/v2/superadmin/plans/PlanDetail.jsx` |
| ServicesList (listado + filtros + archivar/reactivar) | IMPLEMENTADO (mock) | `src/pages/v2/superadmin/services/ServicesList.jsx` |
| ServiceCreate / ServiceEdit / ServiceDetail | PENDIENTE | — |
| ClientAccountsList (listado + filtros + sorting + ocupacion) | IMPLEMENTADO (mock) | `src/pages/v2/superadmin/ClientAccountsList.jsx` |
| ClientAccountDetail (detalle con 5 tabs) | IMPLEMENTADO (mock) | `src/pages/v2/superadmin/ClientAccountDetail.jsx` |
| ClientAccountCreate (wrapper superadmin del wizard) | IMPLEMENTADO (mock) | `src/pages/v2/superadmin/ClientAccountCreate.jsx` |
| Wizard Autoregistro (self_signup) | IMPLEMENTADO (mock) | `src/pages/v2/autoregistro/SelfSignup.jsx` |
| Wizard Superadmin (superadmin_create) | IMPLEMENTADO (mock) | Reutiliza `ClientAccountWizard` con mode="superadmin_create" |
| Datos mock centralizados | IMPLEMENTADO | `src/mocks/clientAccountsData.js`, `src/mocks/services.mock.js` |
| Conexion a Supabase / Edge Functions | PENDIENTE | — |
| RLS / Permisos reales | PENDIENTE | — |

---

## 3) Roles y permisos (UI)

- **Superadmin**: acceso total a Planes, Servicios, y creacion de cuentas cliente.
- **Autoregistro (publico)**: acceso solo a `/registro` (wizard self_signup). No requiere login.
- **Admin de empresa**: NO accede a gestion de planes ni servicios.

---

## 4) Modelo de datos implementado (campos reales en mock)

### 4.1 Plan (`mockPlans` en `clientAccountsData.js`)

| Campo | Tipo | Descripcion |
|---|---|---|
| id | string | UUID del plan |
| name | string | Nombre visible (ej: "Business") |
| code | string (unico) | Codigo interno (ej: "business") |
| description | string | Descripcion del plan |
| status | enum | `draft`, `active`, `inactive`, `deprecated`, `deactivated` |
| visible_for_new_accounts | boolean | Si aparece en el selector de autoregistro |
| created_at | datetime | Fecha creacion |
| start_date | date | Inicio de vigencia |
| end_date | date (nullable) | Fin de vigencia (null = sin caducidad) |
| deactivated_at | datetime (nullable) | Fecha de desactivacion |
| deactivation_reason | string (nullable) | Motivo de desactivacion |
| **Pricing** | | |
| price_monthly | number | Precio mensual base (sin IVA) EUR |
| price_annual | number | Precio anual base (sin IVA) EUR |
| annual_discount_months | number | Meses gratis en pago anual (default 2) |
| vat_applicable | boolean | Si aplica IVA |
| vat_percentage | number | Porcentaje IVA (default 21) |
| **Limites** | | |
| max_owners | number | Max entidades propietarias (-1 = ilimitado) |
| max_accommodations | number | Max alojamientos (-1 = ilimitado) |
| max_rooms | number | Max habitaciones (-1 = ilimitado) |
| max_admin_users | number | Max usuarios admin (1-3) |
| max_associated_users | number | Max usuarios asociados (0-2) |
| max_api_users | number | Max usuarios API (-1 = ilimitado) |
| max_viewer_users | number | Max usuarios viewer (-1 = ilimitado) |
| **Branding** | | |
| branding_enabled | boolean | Permite personalizar colores/estilos |
| logo_allowed | boolean | Permite subir logo |
| theme_editable | boolean | Permite editar tema |
| **Servicios** | | |
| services_included | array(string) | Keys de servicios incluidos |
| **Reglas funcionales** | | |
| allows_multi_owner | boolean | Permite multiples entidades propietarias |
| allows_owner_change | boolean | Permite reasignar alojamientos entre owners |
| allows_receipt_upload | boolean | Permite subir resguardos de pago |

**Calculo de precio anual**: `price_annual = price_monthly * (12 - annual_discount_months)`

**Precio con IVA**: `total = base * (1 + vat_percentage / 100)`

### 4.2 Servicio (`services.mock.js`)

| Campo | Tipo | Descripcion |
|---|---|---|
| id | string | UUID |
| key | string (unico) | Identificador estable (ej: "lavanderia") |
| label | string | Nombre visible |
| description | string | Descripcion |
| status | enum | `active`, `archived` |
| category | string | Categoria: "operacion", "comunicacion", "analitica" |
| created_at | datetime | Fecha creacion |
| updated_at | datetime | Fecha ultima modificacion |

Servicios iniciales (seed):
- lavanderia, encuestas, limpieza, tickets_incidencias, whatsapp_soporte, informes_avanzados

Regla: los servicios archivados NO se pueden seleccionar en nuevos planes, pero se mantienen visibles como "archivados" en planes existentes.

### 4.3 Cuenta Cliente (`mockClientAccounts` en `clientAccountsData.js`)

| Campo | Tipo | Descripcion |
|---|---|---|
| id | string | UUID |
| name | string | Nombre de la cuenta (branding) |
| slug | string (unico) | Identificador URL |
| plan | string | Codigo del plan asignado |
| status | enum | `active`, `suspended`, `cancelled`, `inactive` |
| created_at | datetime | Fecha creacion |
| updated_at | datetime | Fecha actualizacion |
| billing_start_date | date | Inicio de facturacion |
| theme_primary_color | string (hex) | Color primario del branding |
| theme_secondary_color | string (hex, nullable) | Color secundario |
| logo_url | string (nullable) | URL del logo |

### 4.4 Wizard de creacion de cuenta (formData del `ClientAccountWizard`)

El wizard recoge datos que al persistirse en backend se distribuiran entre varias tablas:

**Paso 1 — Datos Cuenta:**
| Campo wizard | Destino tabla | Descripcion |
|---|---|---|
| full_name | client_accounts.name | Nombre del titular / cuenta |
| email | profiles (titular) | Email del titular |
| phone | profiles (titular) | Telefono del titular |
| start_date | client_accounts.billing_start_date | Fecha inicio |
| slug | client_accounts.slug | Identificador URL (auto-generado) |

**Paso 2 — Usuarios Admin (max 3):**
| Campo wizard | Destino tabla | Descripcion |
|---|---|---|
| admins[].email | profiles + auth.users | Email de cada admin |
| admins[].full_name | profiles.full_name | Nombre completo |
| admins[].phone | profiles.phone | Telefono |
| admins[].is_titular | profiles.is_titular | Flag admin titular |

Reglas:
- Admin titular (admins[0]) es obligatorio (email, nombre, telefono requeridos).
- Asociados (admins[1], admins[2]) son opcionales.
- Emails no pueden repetirse entre admins.
- Se envia invitacion por email a cada admin para que cree su contrasena.

**Paso 3 — Datos del Plan:**
| Campo wizard | Destino tabla | Descripcion |
|---|---|---|
| plan_code | client_accounts.plan | Codigo del plan elegido |
| payment_period | subscriptions.billing_period | "monthly" o "annual" |

Reglas:
- Solo se muestran planes con `status=active` y `visible_for_new_accounts=true`.
- En self_signup el periodo de pago es obligatorio.
- Se muestra desglose: base imponible + IVA + total.

**Paso 4 — Facturacion y Pago:**

*Entidad Pagadora:*
| Campo wizard | Destino tabla | Descripcion |
|---|---|---|
| payer_type | legal_companies.legal_form | "persona_fisica", "autonomo", "persona_juridica" |
| payer_legal_name | legal_companies.legal_name | Razon social (si juridica) |
| payer_first_name | legal_companies.first_name | Nombre (si persona/autonomo) |
| payer_last_name_1 | legal_companies.last_name_1 | Primer apellido |
| payer_last_name_2 | legal_companies.last_name_2 | Segundo apellido (opcional) |
| payer_tax_id | legal_companies.tax_id | CIF/NIF |
| payer_address_line1 | legal_companies.address_line1 | Calle |
| payer_address_number | legal_companies.address_number | Numero (opcional) |
| payer_postal_code | legal_companies.postal_code | Codigo postal |
| payer_city | legal_companies.city | Ciudad |
| payer_province | legal_companies.province | Provincia (opcional) |
| payer_country | legal_companies.country | Pais (default "Espana") |
| payer_billing_email | legal_companies.contact_email | Email facturacion |
| payer_billing_phone | legal_companies.contact_phone | Telefono facturacion (opcional) |

*Branding:*
| Campo wizard | Destino tabla | Descripcion |
|---|---|---|
| brand_name | client_accounts.name | Nombre de marca |
| primary_color | client_accounts.theme_primary_color | Color primario (#hex) |
| secondary_color | client_accounts.theme_secondary_color | Color secundario (opcional) |
| logo_url | client_accounts.logo_url | URL del logo (opcional) |

Regla: si el plan no tiene `branding_enabled`, los campos de branding se deshabilitan en UI.

*Tarjeta de pago:*
| Campo wizard | Destino | Descripcion |
|---|---|---|
| card_number | Pasarela de pago (NO almacenar) | Numero de tarjeta (13-16 digitos) |
| card_holder | Pasarela de pago | Titular |
| card_expiry | Pasarela de pago | Caducidad (MM/AA) |
| card_cvv | Pasarela de pago | CVV (3-4 digitos) |

Reglas:
- En self_signup la tarjeta es obligatoria.
- En superadmin_create la tarjeta es opcional ("El pago se gestionara fuera del wizard").
- NUNCA almacenar datos de tarjeta en base de datos propia.

**Paso 5 — Verificacion:**
- Resumen de todos los pasos con boton "Editar" para cada seccion.
- Banner de errores si hay campos pendientes.
- En superadmin_create: selector de estado inicial ("ACTIVA" o "PENDIENTE").
- Boton "Finalizar Registro" (self_signup) o "Crear Cuenta" (superadmin_create).

### 4.5 Empresa Legal (`mockLegalCompanies` en `clientAccountsData.js`)

Representa las entidades juridicas/fiscales asociadas a una cuenta cliente.

| Campo | Tipo | Descripcion |
|---|---|---|
| id | string | UUID |
| client_account_id | string (FK) | Cuenta cliente a la que pertenece |
| type | enum | `account` (pagadora principal) o `fiscal` (empresa fiscal adicional) |
| legal_name | string | Razon social o nombre completo |
| legal_form | enum | `persona_fisica`, `autonomo`, `persona_juridica` |
| tax_id | string | CIF o NIF |
| address_line1 | string | Direccion (calle y numero) |
| address_line2 | string (nullable) | Linea 2 de direccion |
| postal_code | string | Codigo postal |
| city | string | Ciudad |
| province | string | Provincia |
| country | string | Pais |
| contact_email | string | Email de contacto/facturacion |
| contact_phone | string (nullable) | Telefono de contacto |
| status | enum | `active`, `suspended`, `cancelled`, `inactive` |
| created_at | datetime | Fecha creacion |
| updated_at | datetime | Fecha actualizacion |

Reglas:
- Cada cuenta tiene exactamente 1 empresa de tipo `account` (pagadora principal).
- Puede tener 0 o mas empresas de tipo `fiscal` (adicionales).
- Las empresas fiscales se usan para vincular alojamientos a entidades fiscales especificas.

### 4.6 Empresa Interna (`mockInternalCompanies` en `clientAccountsData.js`)

Representa las unidades operativas (carteras) dentro de una cuenta cliente.

| Campo | Tipo | Descripcion |
|---|---|---|
| id | string | UUID |
| client_account_id | string (FK) | Cuenta cliente a la que pertenece |
| name | string | Nombre de la empresa interna / cartera |
| status | enum | `active`, `suspended`, `cancelled`, `inactive` |
| is_hidden | boolean | Si es oculta en la UI (true para Basic/Investor/Business, false para Agency) |
| created_at | datetime | Fecha creacion |
| updated_at | datetime | Fecha actualizacion |

Reglas:
- Para planes Basic, Investor y Business: se crea 1 empresa interna oculta automaticamente (is_hidden=true). El admin no la ve.
- Para plan Agency: se pueden crear multiples empresas internas visibles (is_hidden=false), llamadas "Carteras".
- Los alojamientos se vinculan a una empresa interna.
- Los usuarios viewer pueden restringirse a una empresa interna especifica.

### 4.7 Alojamiento (`mockAccommodations` en `clientAccountsData.js`)

| Campo | Tipo | Descripcion |
|---|---|---|
| id | string | UUID |
| client_account_id | string (FK) | Cuenta cliente |
| internal_company_id | string (FK) | Empresa interna a la que pertenece |
| fiscal_company_id | string (FK, nullable) | Empresa fiscal vinculada (null si plan Basic) |
| name | string | Nombre del alojamiento |
| status | enum | `active`, `suspended`, `cancelled`, `inactive` |
| address_line1 | string | Direccion |
| postal_code | string | Codigo postal |
| city | string | Ciudad |
| province | string | Provincia |
| country | string | Pais |
| created_at | datetime | Fecha creacion |
| updated_at | datetime | Fecha actualizacion |
| stats | object | Estadisticas calculadas: total_rooms, occupied, free, pending |

### 4.8 Habitacion (`mockRooms` en `clientAccountsData.js`)

| Campo | Tipo | Descripcion |
|---|---|---|
| id | string | UUID |
| client_account_id | string (FK) | Cuenta cliente |
| accommodation_id | string (FK) | Alojamiento al que pertenece |
| number | string | Numero/identificador de la habitacion |
| status | enum | `free`, `occupied`, `pending_checkout`, `inactive` |
| monthly_rent | number | Precio mensual de alquiler (EUR) |
| notes | string (nullable) | Notas adicionales |

### 4.9 Inquilino (`mockTenants` en `clientAccountsData.js`)

| Campo | Tipo | Descripcion |
|---|---|---|
| id | string | UUID |
| client_account_id | string (FK) | Cuenta cliente |
| profile_user_id | string (FK, nullable) | Referencia al usuario auth (null si invitado) |
| full_name | string | Nombre completo |
| email | string | Email |
| phone | string | Telefono |
| status | enum | `invited`, `active`, `inactive`, `pending_checkout` |
| created_at | datetime | Fecha creacion |
| updated_at | datetime | Fecha actualizacion |
| current_room | string (nullable) | Numero de habitacion actual (desnormalizado) |
| current_accommodation | string (nullable) | Nombre de alojamiento actual (desnormalizado) |

Reglas:
- Un inquilino en estado `invited` aun no ha creado su cuenta de usuario (profile_user_id=null).
- Al aceptar invitacion, se crea el perfil y pasa a `active`.

### 4.10 Ocupacion (`mockRoomOccupancies` en `clientAccountsData.js`)

| Campo | Tipo | Descripcion |
|---|---|---|
| id | string | UUID |
| client_account_id | string (FK) | Cuenta cliente |
| room_id | string (FK) | Habitacion |
| tenant_id | string (FK) | Inquilino |
| move_in_date | date | Fecha de entrada |
| billing_start_date | date | Fecha inicio de facturacion (puede diferir de move_in_date) |
| move_out_date | date (nullable) | Fecha de salida (null si sigue ocupando) |
| billing_end_date | date (nullable) | Fecha fin de facturacion |
| bill_services_during_gap | boolean | Si facturar servicios en el gap entre entrada y inicio facturacion |
| status | enum | `active`, `pending_checkout`, `ended` |

Regla clave: billing_start_date puede ser posterior a move_in_date (ej: entra el 15, facturacion desde el 1 del mes siguiente).

### 4.11 Usuario (`mockUsers` en `clientAccountsData.js`)

| Campo | Tipo | Descripcion |
|---|---|---|
| id | string | UUID |
| email | string | Email (login) |
| full_name | string | Nombre completo |
| phone | string (nullable) | Telefono |
| role | enum | `superadmin`, `admin`, `api`, `student`, `viewer` |
| client_account_id | string (FK, nullable) | Cuenta cliente (null para superadmin) |
| internal_company_id | string (FK, nullable) | Empresa interna (solo para viewer de Agencia) |
| status | enum | `active`, `suspended`, `cancelled`, `inactive` |

Reglas:
- Superadmin: client_account_id = null (no pertenece a ningun tenant).
- Admin: uno por cuenta como minimo (titular).
- Viewer: puede tener internal_company_id para restringir vista a una cartera (solo en Agency).
- API: usuario para integraciones automaticas.
- Student: usuario inquilino con acceso a su panel personal.

### 4.12 Enums y constantes globales

| Enum | Valores | Uso |
|---|---|---|
| PLANS | basic, investor, business, agency | Codigos de planes asignables a cuentas |
| STATUS | active, suspended, cancelled, inactive | Estado general de entidades |
| LEGAL_COMPANY_TYPES | account, fiscal | Tipo de empresa legal |
| LEGAL_FORMS | persona_fisica, autonomo, persona_juridica | Forma juridica de la empresa |
| ROOM_STATUS | free, occupied, pending_checkout, inactive | Estado de habitacion |
| TENANT_STATUS | invited, active, inactive, pending_checkout | Estado del inquilino |
| OCCUPANCY_STATUS | active, pending_checkout, ended | Estado de la ocupacion |
| ROLES | superadmin, admin, api, student, viewer | Roles de usuario |
| PLAN_STATUS | draft, active, inactive, deprecated, deactivated | Estado del plan |
| BILLING_PERIOD | monthly, annual | Periodo de facturacion |

---

## 5) Pantallas implementadas

### 5.1 PlansList

**Ruta**: `/v2/superadmin/planes`
**Archivo**: `src/pages/v2/superadmin/plans/PlansList.jsx`

Elementos:
- Header con titulo y contador
- **Toolbar**: "+ Nuevo Plan" | "Limpiar Filtros"
- **Filtros**: busqueda por nombre/codigo, estado (draft/active/inactive/deprecated/deactivated), visible para nuevas altas (si/no), vigente hoy (si/no)
- **Tabla** con columnas: Plan (nombre + codigo), Estado (badge), Visible (badge si/no), Vigencia (inicio/fin/baja), Pricing (mensual/anual + IVA), Limites (owners, aloj., hab., usuarios), Acciones
- **Acciones por fila**: Ver detalle, Editar, Toggle visibilidad, Programar caducidad, Desactivar

### 5.2 PlanCreate

**Ruta**: `/v2/superadmin/planes/nuevo`
**Archivo**: `src/pages/v2/superadmin/plans/PlanCreate.jsx`

Layout: sidebar de 7 secciones + formulario principal.

Secciones implementadas:
1. **Identidad** — name, code (auto-generado), description
2. **Estado y Vigencia** — status, visible_for_new_accounts, start_date, end_date
3. **Pricing** — price_monthly, annual_discount_months, price_annual (auto-calculado), vat_applicable, vat_percentage. Resumen con/sin IVA.
4. **Limites** — max_owners, max_accommodations, max_rooms, max_admin_users, max_associated_users, max_api_users, max_viewer_users. -1 = ilimitado.
5. **Branding** — branding_enabled, logo_allowed, theme_editable.
6. **Servicios** — multiselect de AVAILABLE_SERVICES con checkbox cards.
7. **Reglas** — allows_multi_owner, allows_owner_change, allows_receipt_upload. Con descripciones de cada regla.

Validaciones:
- name, code obligatorios; code solo minusculas/numeros/guiones bajos
- price_monthly obligatorio y >= 0
- max_owners: -1 o > 0; si !allows_multi_owner fuerza a 1
- start_date obligatorio si status = active

### 5.3 PlanDetail (lectura + edicion)

**Rutas**: `/v2/superadmin/planes/:id` (lectura) | `/v2/superadmin/planes/:id/editar` (edicion)
**Archivo**: `src/pages/v2/superadmin/plans/PlanDetail.jsx`

Vista lectura: grid 2 columnas con cards (Info General, Vigencia, Pricing, Limites, Branding, Servicios, Reglas).
Vista edicion: mismo sidebar de 7 secciones que PlanCreate, con datos cargados. Codigo no editable. Boton "Desactivar Plan".

Warning en limites: "No se permite bajar limites por debajo del uso actual" (placeholder para validacion backend).

### 5.4 ServicesList

**Ruta**: `/v2/superadmin/servicios`
**Archivo**: `src/pages/v2/superadmin/services/ServicesList.jsx`

Elementos:
- Header + KPIs rapidos (Total, Activos, Archivados, Categorias)
- **Toolbar**: "+ Nuevo Servicio" | "Limpiar Filtros"
- **Filtros**: busqueda por nombre/key, estado (active/archived), categoria
- **Tabla** con columnas: Key (code), Nombre, Descripcion, Categoria (badge color), Estado (badge), Acciones
- **Acciones**: Ver, Editar, Archivar/Reactivar (con modal de confirmacion)
- **Mock con CRUD real** en memoria (services.mock.js con funciones archiveService, reactivateService)

### 5.5 SelfSignup (Autoregistro)

**Ruta**: `/registro`
**Archivo**: `src/pages/v2/autoregistro/SelfSignup.jsx`

Pagina publica (sin login) con:
- Header con logo SmartRent + boton "Iniciar sesion"
- Titulo de bienvenida
- `ClientAccountWizard` en modo `self_signup`
- Footer con copyright

Al finalizar: alert mock + redireccion a `/auth/login`.

### 5.6 ClientAccountWizard (componente compartido)

**Archivo**: `src/components/wizards/ClientAccountWizard.jsx`
**Steps**: `src/components/wizards/steps/Step*.jsx`
**Stepper**: `src/components/wizards/WizardStepper.jsx`

Modos:
- `self_signup`: tarjeta obligatoria, periodo pago obligatorio, boton "Finalizar Registro"
- `superadmin_create`: tarjeta opcional, selector estado inicial (ACTIVA/PENDIENTE), boton "Crear Cuenta"

5 pasos:
1. StepDatosCuenta (full_name, email, phone, start_date, slug)
2. StepUsuariosAdmin (3 slots: titular obligatorio + 2 opcionales)
3. StepDatosPlan (selector plan + periodo + desglose IVA)
4. StepMetodoPago (entidad pagadora + branding + tarjeta)
5. StepVerificacion (resumen con edicion por seccion + banner errores)

Funcionalidades:
- Stepper visual con estados: current, complete, error, inactive
- Navegacion libre entre pasos (click en stepper)
- Validacion por paso y validacion global al finalizar
- Auto-generacion de slug desde nombre
- Auto-copia de email titular a email facturacion
- Vista previa de branding en tiempo real
- Boton "Guardar borrador" (mock)

### 5.7 ClientAccountsList (Listado de Cuentas Cliente)

**Ruta**: `/v2/superadmin/cuentas`
**Archivo**: `src/pages/v2/superadmin/ClientAccountsList.jsx`

Elementos:
- Header con titulo "Cuentas Cliente" y contador (filtradas / total)
- **Toolbar**: "+ Nuevo Cliente" | "Limpiar Filtros"
- **Filtros**: busqueda por nombre/slug, plan (Basic/Investor/Business/Agencia), estado (Activo/Suspendido/Cancelado)
- **Tabla con 11 columnas**:
  1. Cuenta Cliente (logo o placeholder con inicial + nombre + slug)
  2. Plan (badge con color por plan)
  3. Estado (badge con color por estado)
  4. Alojamientos (total)
  5. Habitaciones (ocupadas / total)
  6. Ocupacion (barra de progreso con % y color: >80% verde, >50% amarillo, <=50% rojo)
  7. Fecha Alta (created_at)
  8. Fecha Inicio (billing_start_date)
  9. Fecha Fin (end_date, o "-" si null)
  10. Branding (badge Si/No segun logo_url)
  11. Acciones
- **Sorting**: click en columnas Cuenta, Plan, Estado, Alojamientos, Habitaciones, Fecha Alta
- **Acciones por fila**:
  - Ver detalle (navega a `/v2/superadmin/cuentas/:id`)
  - Editar (navega a `/v2/superadmin/cuentas/:id/editar`)
  - Suspender (solo si estado = active, con confirm)
  - Reactivar (solo si estado = suspended, con confirm)
  - Gestionar usuarios (navega a `/v2/superadmin/cuentas/:id/usuarios`)

Datos mock:
- Usa `mockClientAccounts` de `clientAccountsData.js`
- Usa helpers: `getPlanLabel`, `getPlanColor`, `getStatusLabel`, `getStatusColor`, `formatDate`
- Usa enums: `PLANS`, `STATUS`

### 5.8 ClientAccountDetail (Detalle de Cuenta Cliente)

**Rutas**: `/v2/superadmin/cuentas/:id` (lectura) | `/v2/superadmin/cuentas/:id/editar` | `/v2/superadmin/cuentas/:id/usuarios`
**Archivo**: `src/pages/v2/superadmin/ClientAccountDetail.jsx`

**Header** (card blanca):
- Logo o placeholder con color primario e inicial
- Nombre de la cuenta (titulo)
- Slug + badge plan (con color) + badge estado (con color)
- Botones header: "Suspender" o "Reactivar" (segun estado) + "Editar Cuenta"

**Breadcrumbs**: Dashboard > Cuentas Cliente > [nombre cuenta]

**5 Tabs con navegacion**:

**Tab 1 — Resumen (overview)**:
- KPIs (grid 4 columnas): Alojamientos, Habitaciones, Ocupadas, Ocupacion (%)
- Layout 2 columnas:
  - Card "Informacion de la Cuenta": fecha alta, inicio facturacion, ultima actualizacion, color primario (con dot visual)
  - Card "Empresa Pagadora": nombre fiscal, CIF/NIF, email, telefono (usa legalCompanies type=account)

**Tab 2 — Empresas (companies)**:
- Card "Empresas Fiscales": tabla con nombre fiscal, CIF/NIF, email, estado, acciones. Boton "+ Anadir"
- Card "Empresas Internas (Carteras)": **solo visible si plan = agency**. Tabla con nombre, estado, num alojamientos. Boton "+ Anadir"

**Tab 3 — Alojamientos (accommodations)**:
- Card con tabla: nombre, direccion, habitaciones (ocupadas/total), ocupacion (barra progreso), estado. Badge con contador total.

**Tab 4 — Usuarios (users)**:
- Card con tabla: nombre, email, rol (badge uppercase), estado, acciones. Boton "Gestionar Usuarios"

**Tab 5 — Configuracion (settings)**:
- Items de configuracion (cards con borde):
  - Cambiar Plan (muestra plan actual)
  - Branding (personalizar logo y colores)
  - Datos Fiscales (empresa pagadora y facturacion)
  - Zona de Peligro (cancelar cuenta, con borde rojo)

Carga de datos:
- Busca account por id en `mockClientAccounts`
- Filtra `mockLegalCompanies`, `mockInternalCompanies`, `mockAccommodations`, `mockUsers` por client_account_id
- Simula carga con setTimeout 300ms + estado loading

### 5.9 ClientAccountCreate (Crear Cuenta Cliente - Superadmin)

**Ruta**: `/v2/superadmin/cuentas/nueva`
**Archivo**: `src/pages/v2/superadmin/ClientAccountCreate.jsx`

Es un wrapper ligero que:
- Usa `V2Layout` con role="superadmin"
- Muestra header "Nueva Cuenta Cliente" con subtitulo
- Renderiza `ClientAccountWizard` en modo `superadmin_create`
- `onFinalize`: log + alert mock con nombre, plan y email admin → navega a `/v2/superadmin/cuentas`
- `onCancel`: confirm de cancelacion → navega a `/v2/superadmin/cuentas`

---

## 6) Rutas implementadas (App.jsx)

| Ruta | Componente | Contexto |
|---|---|---|
| `/registro` | SelfSignupV2 | Publico (autoregistro) |
| `/v2/superadmin` | DashboardSuperadminV2 | Dashboard superadmin |
| `/v2/superadmin/cuentas` | ClientAccountsListV2 | Listado de cuentas cliente |
| `/v2/superadmin/cuentas/nueva` | ClientAccountCreateV2 | Crear cuenta (wizard mode=superadmin_create) |
| `/v2/superadmin/cuentas/:id` | ClientAccountDetailV2 | Detalle cuenta (tab overview) |
| `/v2/superadmin/cuentas/:id/editar` | ClientAccountDetailV2 | Detalle cuenta (mismo componente) |
| `/v2/superadmin/cuentas/:id/usuarios` | ClientAccountDetailV2 | Detalle cuenta (mismo componente) |
| `/v2/superadmin/planes` | PlansListV2 | Listado de planes |
| `/v2/superadmin/planes/nuevo` | PlanCreateV2 | Crear plan (7 secciones) |
| `/v2/superadmin/planes/:id` | PlanDetailV2 | Detalle plan (lectura) |
| `/v2/superadmin/planes/:id/editar` | PlanDetailV2 | Detalle plan (edicion) |
| `/v2/superadmin/servicios` | ServicesListV2 | Catalogo servicios |

---

## 7) Estructura de archivos implementada

```
src/
  components/wizards/
    ClientAccountWizard.jsx       # Wizard multi-paso (self_signup / superadmin_create)
    WizardStepper.jsx             # Componente stepper visual
    steps/
      StepDatosCuenta.jsx         # Paso 1: Datos de la cuenta
      StepUsuariosAdmin.jsx       # Paso 2: Usuarios admin (max 3)
      StepDatosPlan.jsx           # Paso 3: Seleccion plan + periodo + desglose IVA
      StepMetodoPago.jsx          # Paso 4: Entidad pagadora + branding + tarjeta
      StepVerificacion.jsx        # Paso 5: Resumen y verificacion
  pages/v2/
    autoregistro/
      SelfSignup.jsx              # Pagina publica /registro
    superadmin/
      DashboardSuperadmin.jsx     # Dashboard superadmin
      ClientAccountsList.jsx      # Listado cuentas cliente (11 columnas, sorting, filtros)
      ClientAccountCreate.jsx     # Wrapper wizard mode=superadmin_create
      ClientAccountDetail.jsx     # Detalle cuenta (5 tabs: resumen, empresas, alojamientos, usuarios, config)
      plans/
        PlansList.jsx             # Listado de planes
        PlanCreate.jsx            # Crear plan (7 secciones)
        PlanDetail.jsx            # Detalle / edicion plan
      services/
        ServicesList.jsx          # Catalogo de servicios
  mocks/
    clientAccountsData.js         # Mock centralizado: plans, client_accounts, legal_companies,
                                  #   internal_companies, accommodations, rooms, tenants,
                                  #   users, room_occupancies, consumption, bulletins,
                                  #   surveys, tickets + helpers + enums
    services.mock.js              # Mock: catalogo de servicios con CRUD en memoria
```

---

## 8) Datos mock existentes

### 8.1 Planes (mockPlans — 5 planes):
| Code | Nombre | Status | Precio/mes | Precio/ano | Max Aloj. | Max Hab. | Branding |
|---|---|---|---|---|---|---|---|
| basic | Basic | active | 29,99 | 299,90 | 3 | 20 | No |
| investor | Investor | active | 79,99 | 799,90 | 8 | 60 | Si |
| business | Business | active | 149,99 | 1.499,90 | Ilimitado | Ilimitado | Si |
| agency | Agencia | active | 299,99 | 2.999,90 | Ilimitado | Ilimitado | Si |
| basic_legacy | Basic Legacy | deprecated | 19,99 | 199,90 | 2 | 10 | No |

### 8.2 Servicios disponibles (AVAILABLE_SERVICES — 6 servicios):
- lavanderia, encuestas, limpieza, tickets_incidencias, whatsapp_soporte, informes_avanzados

### 8.3 Cuentas Cliente (mockClientAccounts — 5 cuentas):
| ID | Nombre | Slug | Plan | Estado | Aloj. | Hab. | Ocup. |
|---|---|---|---|---|---|---|---|
| ca-001 | Invesment Rent rooms SL. | residencias-madrid | business | active | 5 | 48 | 42 |
| ca-002 | Inversiones Inmobiliarias Garcia | inversiones-garcia | investor | active | 3 | 24 | 18 |
| ca-003 | Apartamentos Centro Historico | centro-historico | basic | active | 2 | 12 | 10 |
| ca-004 | Agencia Gestion Integral | agencia-gestion | agency | active | 15 | 120 | 98 |
| ca-005 | Pisos Estudiantes Barcelona | estudiantes-bcn | investor | suspended | 4 | 32 | 0 |

### 8.4 Empresas Legales (mockLegalCompanies — 8 registros):
- ca-001: 1 pagadora (persona_juridica) + 1 fiscal
- ca-002: 1 pagadora (autonomo) + 1 fiscal
- ca-003: 1 pagadora (persona_fisica)
- ca-004: 1 pagadora (persona_juridica) + 2 fiscales

### 8.5 Empresas Internas (mockInternalCompanies — 6 registros):
- ca-001: 1 interna oculta (is_hidden=true)
- ca-002: 1 interna oculta
- ca-003: 1 interna oculta
- ca-004: 3 internas visibles ("Cartera Zona Centro", "Cartera Zona Norte", "Cartera Estudiantes UAM")

### 8.6 Alojamientos (mockAccommodations — 10 registros):
- ca-001: 3 alojamientos (Residencia Central, Campus Norte, Moncloa)
- ca-002: 2 alojamientos (Salamanca, Chamberi)
- ca-003: 2 alojamientos (Sol, Opera)
- ca-004: 3 alojamientos vinculados a 3 carteras distintas

### 8.7 Otros datos mock:
- mockRooms: 13 habitaciones de muestra
- mockTenants: 7 inquilinos (invited, active, pending_checkout)
- mockRoomOccupancies: 6 ocupaciones
- mockUsers: 10 usuarios (1 superadmin, 4 admins, 1 api, 2 viewers)
- mockConsumptionData: datos diarios enero + resumen mensual
- mockBulletins: 3 boletines energeticos
- mockSurveys: 2 encuestas
- mockTickets: 3 tickets de incidencias

### 8.8 Helpers exportados:
- getClientAccountById, getLegalCompaniesByClientAccount, getInternalCompaniesByClientAccount
- getAccommodationsByClientAccount, getRoomsByAccommodation, getTenantsByClientAccount, getUsersByClientAccount
- getPlanById, getPlanByCode, getActivePlans, getPlanStatusLabel, getPlanStatusColor, formatLimit
- getPlanLabel, getPlanColor, getStatusLabel, getStatusColor
- getRoomStatusLabel, getRoomStatusColor, formatDate, formatCurrency

---

## 9) Validaciones UX implementadas

### Wizard (ClientAccountWizard):
- **Paso 0**: full_name (min 3 chars), email (regex), phone, start_date, slug (solo [a-z0-9-])
- **Paso 1**: admin titular (email, nombre, telefono) obligatorios; emails no duplicados entre admins
- **Paso 2**: plan_code obligatorio; payment_period obligatorio en self_signup
- **Paso 3**: payer_type, tax_id, direccion, ciudad, pais, billing_email obligatorios; tarjeta obligatoria en self_signup (13-16 digitos, caducidad MM/AA, CVV 3-4 digitos); colores en formato hex
- **Paso 4**: validacion global de todos los pasos; banner de errores

### PlanCreate:
- name, code obligatorios; code solo [a-z0-9_]
- price_monthly obligatorio >= 0
- max_owners: -1 o > 0
- start_date obligatorio si status = active
- Si !allows_multi_owner: max_owners forzado a 1

---

## 10) Proximos pasos para backend

Este documento sirve como base para:

1. **Disenar las tablas en Supabase** (Postgres):
   - `plans` — campos del punto 4.1
   - `services_catalog` — campos del punto 4.2
   - `plan_services` — tabla pivot (plan_id, service_id)
   - `client_accounts` — campos del punto 4.3 + plan_id FK
   - `subscriptions` — billing_period, status, start_date, end_date, plan_id, client_account_id
   - `legal_companies` — campos del punto 4.5 (pagadora + fiscales)
   - `internal_companies` — campos del punto 4.6 (empresas internas / carteras)
   - `accommodations` — campos del punto 4.7
   - `rooms` — campos del punto 4.8
   - `tenants` — campos del punto 4.9
   - `room_occupancies` — campos del punto 4.10
   - `profiles` (users) — campos del punto 4.11
   - Tablas adicionales existentes en mock: `consumption_data`, `bulletins`, `surveys`, `tickets`

2. **Crear Edge Functions** (Supabase):
   - `provision_client_account`: orquesta la creacion de cuenta (crea client_account + legal_company + internal_company oculta + invita admins + crea subscription)
   - `manage_plans`: CRUD de planes con validaciones de negocio
   - `manage_services`: CRUD de catalogo de servicios
   - `manage_client_accounts`: operaciones sobre cuentas (suspender, reactivar, cambiar plan, cancelar)
   - `manage_legal_companies`: CRUD de empresas legales por cuenta
   - `manage_internal_companies`: CRUD de empresas internas (solo visible para Agency)

3. **Aplicar RLS**:
   - Plans y Services: solo lectura publica (planes activos y visibles); escritura solo superadmin
   - Client Accounts: superadmin ve todas; admin solo su propia cuenta
   - Legal Companies: filtrada por client_account_id
   - Internal Companies: filtrada por client_account_id; viewer solo ve su internal_company_id
   - Accommodations, Rooms, Tenants, Occupancies: filtrada por client_account_id; viewer por internal_company_id
   - Profiles: superadmin ve todos; admin ve usuarios de su cuenta; student ve solo su perfil

4. **Integrar pasarela de pago** (Stripe u otra):
   - Tokenizar tarjeta, NO almacenar datos sensibles
   - Crear customer y subscription en pasarela
   - Webhooks para confirmar pago

---

## 11) Criterios de aceptacion (UI - cumplidos)

### Planes y Servicios:
- [x] Se puede crear un plan en modo mock y aparece en la lista
- [x] Se puede ver detalle y editar un plan existente
- [x] PlanCreate tiene 7 secciones con sidebar navegable
- [x] Se muestran precios base, IVA y total en create/edit y detalle
- [x] Se pueden filtrar planes por estado, visibilidad y vigencia
- [x] Catalogo de servicios con listado, filtros, archivar/reactivar con modal

### Wizard de Autoregistro / Alta de Cuenta:
- [x] Wizard de autoregistro (self_signup) funciona en `/registro`
- [x] Wizard tiene 5 pasos: datos cuenta, usuarios admin, plan, facturacion/pago, verificacion
- [x] Validaciones por paso y validacion global al finalizar
- [x] Vista previa de branding en tiempo real
- [x] Diferencias self_signup vs superadmin_create (tarjeta obligatoria, estado inicial)

### Cuentas Cliente:
- [x] Listado de cuentas cliente con 11 columnas y sorting
- [x] Filtros por nombre/slug, plan y estado
- [x] Barra de progreso de ocupacion con colores semanticos (verde/amarillo/rojo)
- [x] Logo o placeholder con inicial y color primario en la tabla
- [x] Badges de plan y estado con colores
- [x] Acciones por fila: ver detalle, editar, suspender/reactivar, gestionar usuarios
- [x] Detalle de cuenta con 5 tabs (Resumen, Empresas, Alojamientos, Usuarios, Configuracion)
- [x] Header de detalle con logo/placeholder, nombre, slug, plan badge, estado badge
- [x] KPIs en tab Resumen (alojamientos, habitaciones, ocupadas, % ocupacion)
- [x] Tab Empresas muestra fiscales + internas (internas solo si plan=agency)
- [x] Tab Alojamientos con tabla y barras de progreso
- [x] Tab Usuarios con tabla y roles
- [x] Tab Configuracion con opciones de cambiar plan, branding, datos fiscales y zona de peligro
- [x] Crear cuenta desde superadmin usando wizard mode=superadmin_create

### Pendientes de implementar en UI:
- [ ] ServiceCreate, ServiceEdit, ServiceDetail (paginas individuales)
- [ ] Duplicar plan desde listado o edicion
- [ ] Archivar plan con modal (actualmente usa confirm)
- [ ] Integracion real del catalogo dinamico de servicios en PlanCreate (actualmente usa AVAILABLE_SERVICES estatico)
- [ ] Edicion inline de datos de cuenta (tab Configuracion actualmente muestra botones mock)
- [ ] Cambio de plan desde detalle de cuenta (actualmente mock)
- [ ] Gestion real de usuarios desde detalle (actualmente navega a ruta sin componente dedicado)
