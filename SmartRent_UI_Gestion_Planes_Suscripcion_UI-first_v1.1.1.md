# SmartRent Systems — Gestion de Planes, Servicios, Cuentas Cliente y Autoregistro (UI-first)
Version: v1.4 (UI-first + modelo Payer/Owner para backend)
Fecha: 2026-02-10

Este documento refleja el **estado real implementado** en el frontend (React + Vite, inline styles, datos mock).
Sirve como base funcional para disenar las tablas de la base de datos y codificar el backend (Supabase Edge Functions).

---

## 1) Objetivo

El modulo cubre cuatro grandes bloques funcionales:

1. **Gestion de Planes de Suscripcion** (Superadmin) — CRUD completo de planes.
2. **Catalogo de Servicios** (Superadmin) — CRUD de servicios dinamicos asociables a planes.
3. **Gestion de Cuentas Cliente** (Superadmin) — Listado, detalle con tabs, creacion y edicion de cuentas cliente con sus entidades asociadas (Entidad Pagadora, Entidades Propietarias, alojamientos, usuarios).
4. **Autoregistro / Alta de Cuenta Cliente** — Wizard publico (self_signup) y wizard Superadmin (superadmin_create) para crear cuentas cliente con plan, usuarios admin, Entidad Pagadora, branding y metodo de pago.
5. **Gestion de Entidades Propietarias (Owners)** — CRUD de entidades propietarias/operadoras de alojamientos, con limites por plan y reglas de cambio de owner.

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

*Entidad Pagadora (PayerEntity — 1:1 con ClientAccount):*
| Campo wizard | Destino tabla | Descripcion |
|---|---|---|
| payer_type | payer_entities.entity_type | "persona_fisica", "autonomo", "persona_juridica" |
| payer_legal_name | payer_entities.legal_name | Razon social (si juridica) |
| payer_first_name | payer_entities.first_name | Nombre (si persona/autonomo) |
| payer_last_name_1 | payer_entities.last_name_1 | Primer apellido |
| payer_last_name_2 | payer_entities.last_name_2 | Segundo apellido (opcional) |
| payer_tax_id | payer_entities.tax_id | CIF/NIF |
| payer_address_line1 | payer_entities.street | Calle |
| payer_address_number | payer_entities.street_number | Numero (opcional) |
| payer_postal_code | payer_entities.postal_code | Codigo postal |
| payer_city | payer_entities.city | Ciudad |
| payer_province | payer_entities.province | Provincia (opcional) |
| payer_country | payer_entities.country | Pais (default "Espana") |
| payer_address_extra | payer_entities.address_extra | Informacion adicional (planta, puerta, etc.) |
| payer_billing_email | payer_entities.billing_email | Email facturacion |
| payer_billing_phone | payer_entities.phone | Telefono facturacion (opcional) |

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

### 4.5 Entidad Pagadora — PayerEntity (tabla `payer_entities`)

Representa la entidad fiscal que paga la suscripcion SaaS. Relacion **1:1** con ClientAccount.

| Campo | Tipo | Obligatorio | Descripcion |
|---|---|---|---|
| id | string | Auto | UUID |
| client_account_id | string (FK, unique) | Si | Cuenta cliente (relacion 1:1) |
| entity_type | enum | Si | `persona_fisica`, `autonomo`, `persona_juridica` |
| legal_name | string | Si (si juridica) | Razon social |
| first_name | string | Si (si PF/autonomo) | Nombre |
| last_name_1 | string | Si (si PF/autonomo) | Primer apellido |
| last_name_2 | string | No | Segundo apellido |
| tax_id | string | Si | CIF o NIF |
| billing_email | string | Si | Email de facturacion |
| phone | string | Si | Telefono de contacto |
| **Direccion** | | | |
| country | string | Si | Pais (default "Espana") |
| province | string | No | Provincia |
| city | string | Si | Ciudad |
| postal_code | string | Si | Codigo postal |
| street | string | Si | Calle |
| street_number | string | No | Numero |
| address_extra | string | No | Informacion adicional (planta, puerta, etc.) |
| **Estado** | | | |
| status | enum | Si | `active`, `suspended`, `disabled` |
| created_at | datetime | Auto | Fecha creacion |
| start_date | date | No | Fecha inicio actividad |
| end_date | date (nullable) | No | Fecha fin actividad |
| deactivated_at | datetime (nullable) | No | Fecha de baja logica |

Reglas:
- Cada cuenta tiene exactamente **1** PayerEntity (relacion 1:1 por `client_account_id` UNIQUE).
- Es obligatoria para activar la cuenta (en self_signup se crea junto con la cuenta; en superadmin_create puede quedar incompleta si estado=PENDING).
- **No se puede eliminar**, solo editar.
- **No tiene relacion directa con alojamientos** — su proposito es exclusivamente la facturacion del SaaS.

> **Mapeo legacy**: Reemplaza a `legal_companies` con `type='account'`.

### 4.6 Entidad Propietaria — OwnerEntity (tabla `owner_entities`)

Representa la entidad fiscal propietaria/operadora de alojamientos. Relacion **1..N** con ClientAccount segun plan.

| Campo | Tipo | Obligatorio | Descripcion |
|---|---|---|---|
| id | string | Auto | UUID |
| client_account_id | string (FK) | Si | Cuenta cliente a la que pertenece |
| entity_type | enum | Si | `persona_fisica`, `autonomo`, `persona_juridica` |
| legal_name | string | Si (si juridica) | Razon social |
| first_name | string | Si (si PF/autonomo) | Nombre |
| last_name_1 | string | Si (si PF/autonomo) | Primer apellido |
| last_name_2 | string | No | Segundo apellido |
| tax_id | string | Si | CIF o NIF |
| billing_email | string | Recomendado | Email de contacto/facturacion |
| phone | string | Recomendado | Telefono de contacto |
| **Direccion** | | | |
| country | string | Si | Pais (default "Espana") |
| province | string | No | Provincia |
| city | string | Si | Ciudad |
| postal_code | string | Si | Codigo postal |
| street | string | Si | Calle |
| street_number | string | No | Numero |
| address_extra | string | No | Informacion adicional (planta, puerta, etc.) |
| **Estado** | | | |
| status | enum | Si | `active`, `suspended`, `disabled` |
| created_at | datetime | Auto | Fecha creacion |
| start_date | date | No | Fecha inicio actividad |
| end_date | date (nullable) | No | Fecha fin actividad |
| deactivated_at | datetime (nullable) | No | Fecha de baja logica |

**Limites por plan (max_owners):**

| Plan | max_owners | Comportamiento UI |
|---|---|---|
| Basic | 1 | Si ya existe 1: ocultar boton "+ Nuevo", mostrar mensaje |
| Investor | 2 | Si owners_count >= 2: bloquear creacion, mostrar warning |
| Business | 5 | Si owners_count >= 5: bloquear creacion, mostrar warning |
| Agency | -1 (ilimitado) | Sin limite visible |

**Regla clave — Cambio de Owner en Alojamiento:**
- **Agency**: se permite cambiar el owner de un alojamiento (reasignar entre carteras/propietarios). Modal de confirmacion obligatorio.
- **Basic / Investor / Business**: **NO** se permite cambiar el owner de un alojamiento una vez creado (owner inmutable). Campo read-only con tooltip explicativo.

Reglas:
- Al menos 1 OwnerEntity activa es necesaria para poder crear alojamientos.
- Los alojamientos cuelgan de un OwnerEntity via `owner_entity_id`.
- Los usuarios viewer pueden restringirse a un OwnerEntity especifico (via `owner_entity_id`).
- No se puede desactivar el unico Owner activo de la cuenta.
- Al desactivar un Owner con alojamientos activos: modal de confirmacion obligatorio.

> **Mapeo legacy**: Reemplaza a `legal_companies` con `type='fiscal'` + `internal_companies` (las "carteras" de Agency pasan a ser OwnerEntities visibles).

### 4.7 Alojamiento (tabla `accommodations`)

| Campo | Tipo | Descripcion |
|---|---|---|
| id | string | UUID |
| client_account_id | string (FK) | Cuenta cliente |
| owner_entity_id | string (FK) | **Entidad Propietaria** a la que pertenece (OwnerEntity) |
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

Reglas:
- Requiere `owner_entity_id` valido y activo para crear.
- Si no hay OwnerEntities activas, se bloquea la creacion y se muestra CTA: "Crea tu primera Entidad Propietaria".
- **Cambio de owner**: solo permitido en plan Agency (con modal de confirmacion). En Basic/Investor/Business el campo es read-only.

> **Mapeo legacy**: `internal_company_id` y `fiscal_company_id` se eliminan y se sustituyen por `owner_entity_id`.

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

### 4.11 Usuario (tabla `profiles`)

| Campo | Tipo | Descripcion |
|---|---|---|
| id | string | UUID |
| email | string | Email (login) |
| full_name | string | Nombre completo |
| phone | string (nullable) | Telefono |
| role | enum | `superadmin`, `admin`, `api`, `student`, `viewer` |
| client_account_id | string (FK, nullable) | Cuenta cliente (null para superadmin) |
| owner_entity_id | string (FK, nullable) | **Entidad Propietaria** (solo para viewer restringido a un Owner) |
| status | enum | `active`, `suspended`, `cancelled`, `inactive` |

Reglas:
- Superadmin: client_account_id = null (no pertenece a ningun tenant).
- Admin: uno por cuenta como minimo (titular).
- Viewer: puede tener `owner_entity_id` para restringir vista a los alojamientos de un Owner especifico.
- API: usuario para integraciones automaticas.
- Student: usuario inquilino con acceso a su panel personal.

> **Mapeo legacy**: `internal_company_id` se sustituye por `owner_entity_id`.

### 4.12 Enums y constantes globales

| Enum | Valores | Uso |
|---|---|---|
| PLANS | basic, investor, business, agency | Codigos de planes asignables a cuentas |
| STATUS | active, suspended, cancelled, inactive | Estado general de entidades |
| ENTITY_TYPE | persona_fisica, autonomo, persona_juridica | Tipo de entidad (Payer y Owner) |
| ENTITY_STATUS | active, suspended, disabled | Estado de PayerEntity y OwnerEntity |
| ROOM_STATUS | free, occupied, pending_checkout, inactive | Estado de habitacion |
| TENANT_STATUS | invited, active, inactive, pending_checkout | Estado del inquilino |
| OCCUPANCY_STATUS | active, pending_checkout, ended | Estado de la ocupacion |
| ROLES | superadmin, admin, api, student, viewer | Roles de usuario |
| PLAN_STATUS | draft, active, inactive, deprecated, deactivated | Estado del plan |
| BILLING_PERIOD | monthly, annual | Periodo de facturacion |

> **Mapeo legacy**: `LEGAL_COMPANY_TYPES` (account, fiscal) y `LEGAL_FORMS` se eliminan del flujo v2. Se sustituyen por `ENTITY_TYPE` y `ENTITY_STATUS`.

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
  - Card "Entidad Pagadora": nombre fiscal, CIF/NIF, email, telefono (usa PayerEntity de la cuenta)

**Tab 2 — Propietarios (owners)** *(reemplaza el antiguo tab "Empresas")*:
- Card "Entidades Propietarias (Owners)":
  - Tabla con columnas: Nombre/Razon social, Tipo entidad (badge), NIF/CIF, Estado (badge), Fecha alta, Num. alojamientos, Acciones
  - **Acciones**: Ver / Editar / Desactivar (baja logica) / Reactivar
  - Boton "+ Nuevo Owner" (solo si `owners_count < max_owners` del plan, salvo Agency que es ilimitado)
  - **Warning**: "Has alcanzado el maximo de Entidades Propietarias permitidas por el plan [nombre_plan]" si se alcanza el limite
  - Indicador: "Propietarios: X / Y" (donde Y = max_owners del plan, o "ilimitado")

**Tab 3 — Alojamientos (accommodations)**:
- Card con tabla: nombre, **Owner** (nombre del OwnerEntity), direccion, habitaciones (ocupadas/total), ocupacion (barra progreso), estado. Badge con contador total.

**Tab 4 — Usuarios (users)**:
- Card con tabla: nombre, email, rol (badge uppercase), estado, acciones. Boton "Gestionar Usuarios"

**Tab 5 — Configuracion (settings)**:
- Items de configuracion (cards con borde):
  - Cambiar Plan (muestra plan actual)
  - Branding (personalizar logo y colores)
  - Entidad Pagadora (ver/editar datos fiscales del pagador)
  - Zona de Peligro (cancelar cuenta, con borde rojo)

Carga de datos:
- Busca account por id en `mockClientAccounts`
- Filtra `mockPayerEntities`, `mockOwnerEntities`, `mockAccommodations`, `mockUsers` por client_account_id
- Simula carga con setTimeout 300ms + estado loading

> **Mapeo legacy**: El tab "Empresas" con secciones "Empresas Fiscales" + "Empresas Internas (Carteras)" se reemplaza por tab "Propietarios" con la lista de OwnerEntities.

### 5.9 ClientAccountCreate (Crear Cuenta Cliente - Superadmin)

**Ruta**: `/v2/superadmin/cuentas/nueva`
**Archivo**: `src/pages/v2/superadmin/ClientAccountCreate.jsx`

Es un wrapper ligero que:
- Usa `V2Layout` con role="superadmin"
- Muestra header "Nueva Cuenta Cliente" con subtitulo
- Renderiza `ClientAccountWizard` en modo `superadmin_create`
- `onFinalize`: log + alert mock con nombre, plan y email admin → navega a `/v2/superadmin/cuentas`
- `onCancel`: confirm de cancelacion → navega a `/v2/superadmin/cuentas`

### 5.10 Pantallas planificadas — Gestion de Entidades Propietarias (Owner CRUD)

> **Estado**: PENDIENTE DE IMPLEMENTAR (UI-first, mock)

#### 5.10.1 OwnerEntitiesList (Admin — Listado Owners)

**Ruta propuesta**: `/v2/admin/configuracion/propietarios`

Elementos:
- Header con titulo "Entidades Propietarias" y contador (activas / max_owners del plan)
- **Toolbar**: "+ Nuevo Owner" (oculto si `owners_count >= max_owners` y plan != Agency)
- **Warning** (si limite alcanzado): "Has alcanzado el maximo de Entidades Propietarias permitidas por tu plan ([plan_name])"
- **Filtros**: busqueda por nombre/razon social, filtro por estado (active/suspended/disabled)
- **Tabla** con columnas: Nombre/Razon social, Tipo entidad (badge PF/Autonomo/Juridica), NIF/CIF, Estado (badge), Fecha alta, Num. alojamientos, Acciones
- **Acciones por fila**: Ver detalle, Editar, Desactivar (baja logica con confirm), Reactivar

#### 5.10.2 OwnerEntityCreate (Admin — Crear Owner)

**Ruta propuesta**: `/v2/admin/configuracion/propietarios/nuevo`

Formulario con secciones:
1. **Tipo de entidad**: selector entity_type (persona_fisica, autonomo, persona_juridica) — condiciona campos visibles
2. **Datos fiscales**: legal_name (si juridica), first_name + last_name_1 + last_name_2 (si PF/autonomo), tax_id
3. **Direccion**: country, province, city, postal_code, street, street_number, address_extra
4. **Contacto**: billing_email, phone
5. **Estado**: se crea con status=active por defecto

Validaciones:
- Bloquear si `owners_count >= max_owners` del plan
- tax_id: formato NIF/CIF
- Campos obligatorios segun entity_type (ver seccion 4.6)
- country, city, postal_code, street obligatorios

#### 5.10.3 OwnerEntityDetail / OwnerEntityEdit (Admin — Ver/Editar Owner)

**Rutas propuestas**: `/v2/admin/configuracion/propietarios/:id` (lectura) | `/v2/admin/configuracion/propietarios/:id/editar` (edicion)

Vista lectura: cards con datos fiscales, direccion, contacto, alojamientos vinculados
Vista edicion: mismo formulario que Create con datos cargados
Acciones: Desactivar (con modal si tiene alojamientos activos), Reactivar

### 5.11 Pantalla planificada — Entidad Pagadora (Admin — Ver/Editar)

> **Estado**: PENDIENTE DE IMPLEMENTAR (UI-first, mock)

**Ruta propuesta**: `/v2/admin/configuracion/pagador`

Pagina de solo **ver/editar** (no lista, no crear multiples):
- Card con datos actuales de la Entidad Pagadora
- Boton "Editar" para pasar a modo edicion
- Mismos campos que en el wizard (seccion 4.5)
- No se puede eliminar (siempre existe 1 por cuenta)
- Campos obligatorios: entity_type, tax_id, billing_email, phone, country, city, postal_code, street

### 5.12 Modificaciones planificadas — Gestion Alojamientos (Admin)

> **Estado**: PENDIENTE DE IMPLEMENTAR (UI-first, mock)

**Crear Alojamiento** — modificaciones:
- Nuevo campo obligatorio **Owner** (selector de OwnerEntity): muestra `Nombre + Tipo (PF/Autonomo/Juridica) + Estado`
- Solo muestra owners con status = active
- Si no hay owners activos: bloquear creacion, CTA "Debes crear al menos 1 Entidad Propietaria antes de crear alojamientos" con enlace
- No permitir seleccionar owners desactivados

**Editar Alojamiento** — modificaciones:
- Campo Owner **read-only** (tooltip: "Tu plan no permite cambiar la Entidad Propietaria de un alojamiento") para Basic/Investor/Business
- Campo Owner **editable** solo si plan = Agency, con modal de confirmacion: "Cambiar la Entidad Propietaria puede afectar al reporting e historico. ¿Continuar?"

---

## 6) Rutas implementadas y planificadas (App.jsx)

### 6.1 Rutas implementadas

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

### 6.2 Rutas planificadas (Payer/Owner — Admin)

| Ruta | Componente | Rol | Contexto |
|---|---|---|---|
| `/v2/admin/configuracion/pagador` | PayerEntityEdit | Admin | Ver/editar Entidad Pagadora (1:1) |
| `/v2/admin/configuracion/propietarios` | OwnerEntitiesList | Admin | Listado Entidades Propietarias |
| `/v2/admin/configuracion/propietarios/nuevo` | OwnerEntityCreate | Admin | Crear Owner |
| `/v2/admin/configuracion/propietarios/:id` | OwnerEntityDetail | Admin | Ver detalle Owner |
| `/v2/admin/configuracion/propietarios/:id/editar` | OwnerEntityEdit | Admin | Editar Owner |

### 6.3 Tabs internos actualizados (Superadmin)

| Contexto | Tab | Descripcion |
|---|---|---|
| ClientAccountDetail | Tab "Propietarios" | Lista OwnerEntities de la cuenta (reemplaza tab "Empresas") |
| ClientAccountDetail | Tab "Resumen" → Card "Entidad Pagadora" | Datos de la PayerEntity (reemplaza "Empresa Pagadora") |

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
    admin/                        # [PLANIFICADO] Area admin de empresa
      configuracion/
        PayerEntityEdit.jsx       # [PLANIFICADO] Ver/editar Entidad Pagadora (1:1)
        owners/
          OwnerEntitiesList.jsx   # [PLANIFICADO] Listado Entidades Propietarias
          OwnerEntityCreate.jsx   # [PLANIFICADO] Crear Owner
          OwnerEntityDetail.jsx   # [PLANIFICADO] Ver/editar Owner
    superadmin/
      DashboardSuperadmin.jsx     # Dashboard superadmin
      ClientAccountsList.jsx      # Listado cuentas cliente (11 columnas, sorting, filtros)
      ClientAccountCreate.jsx     # Wrapper wizard mode=superadmin_create
      ClientAccountDetail.jsx     # Detalle cuenta (5 tabs: resumen, propietarios, alojamientos, usuarios, config)
      plans/
        PlansList.jsx             # Listado de planes
        PlanCreate.jsx            # Crear plan (7 secciones)
        PlanDetail.jsx            # Detalle / edicion plan
      services/
        ServicesList.jsx          # Catalogo de servicios
  mocks/
    clientAccountsData.js         # Mock centralizado: plans, client_accounts, payer_entities,
                                  #   owner_entities, accommodations, rooms, tenants,
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

### 8.4 Entidades Pagadoras (mockPayerEntities — 1 por cuenta):

> **Mapeo**: Reemplaza a `mockLegalCompanies` con `type='account'`

- ca-001: 1 PayerEntity (persona_juridica, "Invesment Rent Rooms SL")
- ca-002: 1 PayerEntity (autonomo, "Roberto Garcia Lopez")
- ca-003: 1 PayerEntity (persona_fisica, "Ana Martinez Ruiz")
- ca-004: 1 PayerEntity (persona_juridica, "Agencia Gestion Integral SA")
- ca-005: 1 PayerEntity (persona_juridica, "Pisos Estudiantes BCN SL")

### 8.5 Entidades Propietarias (mockOwnerEntities — segun plan):

> **Mapeo**: Reemplaza a `mockLegalCompanies` con `type='fiscal'` + `mockInternalCompanies`

- ca-001 (Business, max_owners=5): 1 owner ("Invesment Rent Rooms SL", persona_juridica)
- ca-002 (Investor, max_owners=2): 1 owner ("Roberto Garcia Lopez", autonomo) + 1 owner fiscal adicional
- ca-003 (Basic, max_owners=1): 1 owner ("Ana Martinez Ruiz", persona_fisica)
- ca-004 (Agency, max_owners=ilimitado): 3 owners ("Cartera Zona Centro SL", "Cartera Zona Norte SL", "Cartera Estudiantes UAM SL")

### 8.6 Alojamientos (mockAccommodations — 10 registros):
- ca-001: 3 alojamientos → vinculados a 1 OwnerEntity
- ca-002: 2 alojamientos → vinculados a 1 OwnerEntity
- ca-003: 2 alojamientos → vinculados a 1 OwnerEntity
- ca-004: 3 alojamientos → vinculados a 3 OwnerEntities distintas (1 por cartera/owner)

> Cada alojamiento tiene `owner_entity_id` (FK a OwnerEntity) en lugar de `internal_company_id` + `fiscal_company_id`.

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
- getClientAccountById, getPayerEntityByClientAccount, getOwnerEntitiesByClientAccount
- getAccommodationsByClientAccount, getAccommodationsByOwnerEntity, getRoomsByAccommodation, getTenantsByClientAccount, getUsersByClientAccount
- getPlanById, getPlanByCode, getActivePlans, getPlanStatusLabel, getPlanStatusColor, formatLimit
- getPlanLabel, getPlanColor, getStatusLabel, getStatusColor
- getRoomStatusLabel, getRoomStatusColor, formatDate, formatCurrency
- getOwnerEntityById, getActiveOwnerEntities, getOwnerEntityDisplayName

> **Mapeo legacy**: `getLegalCompaniesByClientAccount` y `getInternalCompaniesByClientAccount` se reemplazan por `getPayerEntityByClientAccount` y `getOwnerEntitiesByClientAccount`.

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

Este documento sirve como base para disenar el backend con el **modelo Payer/Owner** (sin usar los conceptos legacy de empresas internas/fiscales).

### 10.1 Disenar las tablas en Supabase (Postgres)

| Tabla | Seccion ref. | Descripcion |
|---|---|---|
| `plans` | 4.1 | Planes de suscripcion con pricing, limites, branding, reglas |
| `services_catalog` | 4.2 | Catalogo de servicios disponibles |
| `plan_services` | — | Tabla pivot (plan_id, service_id) |
| `client_accounts` | 4.3 | Cuentas cliente (tenant) + plan_id FK |
| `subscriptions` | — | billing_period, status, start_date, end_date, plan_id, client_account_id |
| **`payer_entities`** | **4.5** | **Entidad Pagadora (1:1 con client_account, FK unique)** |
| **`owner_entities`** | **4.6** | **Entidades Propietarias (1..N por client_account segun plan)** |
| `accommodations` | 4.7 | Alojamientos — **FK `owner_entity_id`** (NO internal_company_id ni fiscal_company_id) |
| `rooms` | 4.8 | Habitaciones |
| `tenants` | 4.9 | Inquilinos |
| `room_occupancies` | 4.10 | Historico de ocupacion |
| `profiles` | 4.11 | Usuarios — **FK `owner_entity_id`** opcional (para viewer restringido) |
| `consumption_data` | — | Datos de consumo diario |
| `bulletins` | — | Boletines energeticos |
| `surveys` | — | Encuestas |
| `tickets` | — | Tickets de incidencias |

**Constraints importantes en `payer_entities`:**
- `UNIQUE(client_account_id)` — garantiza relacion 1:1
- `CHECK(status IN ('active', 'suspended', 'disabled'))`

**Constraints importantes en `owner_entities`:**
- `CHECK(status IN ('active', 'suspended', 'disabled'))`
- Validacion a nivel de app/Edge Function: `COUNT(*) < plan.max_owners` (o ilimitado si -1)

**Constraints importantes en `accommodations`:**
- `FK owner_entity_id REFERENCES owner_entities(id)` — obligatorio
- Validacion a nivel de app: owner_entity.status = 'active'
- Validacion a nivel de app: cambio de owner solo si plan.allows_owner_change = true (Agency)

### 10.2 Crear Edge Functions (Supabase)

| Edge Function | Descripcion |
|---|---|
| `provision_client_account` | Orquesta creacion de cuenta: crea client_account + **payer_entity** + **owner_entity** (1 por defecto) + invita admins + crea subscription |
| `manage_plans` | CRUD de planes con validaciones de negocio |
| `manage_services` | CRUD de catalogo de servicios |
| `manage_client_accounts` | Operaciones sobre cuentas (suspender, reactivar, cambiar plan, cancelar) |
| **`manage_payer_entities`** | Ver/editar Entidad Pagadora por cuenta (solo 1, no permite crear/eliminar) |
| **`manage_owner_entities`** | CRUD de Entidades Propietarias: crear (validando max_owners), editar, desactivar/reactivar |
| `manage_accommodations` | CRUD de alojamientos con validacion de `owner_entity_id` y regla de cambio de owner |

**Validaciones en Edge Functions:**
- `manage_owner_entities.create`: verificar `COUNT(owner_entities WHERE client_account_id = X AND status != 'disabled') < plan.max_owners`
- `manage_owner_entities.deactivate`: verificar que no es el unico owner activo de la cuenta
- `manage_accommodations.create`: verificar que `owner_entity_id` existe y esta activo
- `manage_accommodations.update_owner`: verificar que `plan.allows_owner_change = true` (solo Agency)
- `manage_client_accounts.change_plan`: validar que el uso actual no excede limites del plan destino (owners, accommodations, rooms, users)

### 10.3 Aplicar RLS

| Tabla | Regla |
|---|---|
| plans, services_catalog | Solo lectura publica (planes activos y visibles); escritura solo superadmin |
| client_accounts | Superadmin ve todas; admin solo su propia cuenta |
| **payer_entities** | Filtrada por client_account_id; superadmin ve todas; admin solo la de su cuenta |
| **owner_entities** | Filtrada por client_account_id; superadmin ve todas; admin ve las de su cuenta; viewer solo ve su owner_entity_id |
| accommodations | Filtrada por client_account_id; viewer filtrada ademas por owner_entity_id |
| rooms, tenants, room_occupancies | Filtrada por client_account_id; viewer por owner_entity_id (via accommodation) |
| profiles | Superadmin ve todos; admin ve usuarios de su cuenta; student ve solo su perfil |

### 10.4 Integrar pasarela de pago (Stripe u otra)

- Tokenizar tarjeta, NO almacenar datos sensibles
- Crear customer y subscription en pasarela
- Webhooks para confirmar pago

### 10.5 Reglas de negocio para plan downgrade

Al cambiar de plan (ej: Business → Investor):
- Verificar `owners_count <= new_plan.max_owners` → Warning: "La cuenta tiene X Entidades Propietarias pero el plan destino solo permite Y"
- Verificar `accommodations_count <= new_plan.max_accommodations`
- Verificar `rooms_count <= new_plan.max_rooms`
- Verificar limites de usuarios (admin, api, viewer)
- Si excede cualquier limite → bloquear cambio o exigir desactivar entidades excedentes primero

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
- [x] Detalle de cuenta con 5 tabs (Resumen, Propietarios, Alojamientos, Usuarios, Configuracion)
- [x] Header de detalle con logo/placeholder, nombre, slug, plan badge, estado badge
- [x] KPIs en tab Resumen (alojamientos, habitaciones, ocupadas, % ocupacion)
- [x] Tab Alojamientos con tabla y barras de progreso
- [x] Tab Usuarios con tabla y roles
- [x] Tab Configuracion con opciones de cambiar plan, branding, entidad pagadora y zona de peligro
- [x] Crear cuenta desde superadmin usando wizard mode=superadmin_create

### Entidades Propietarias (OwnerEntity) — PENDIENTE:
- [ ] Tab "Propietarios" en ClientAccountDetail reemplaza tab "Empresas"
- [ ] Lista Owners con columnas: nombre, tipo entidad, NIF/CIF, estado, fecha alta, num alojamientos
- [ ] Boton "+ Nuevo Owner" solo visible si `owners_count < max_owners` (o plan Agency)
- [ ] Warning si limite alcanzado: "Has alcanzado el maximo de Entidades Propietarias..."
- [ ] Indicador "Propietarios: X / Y" (Y = max_owners del plan)
- [ ] CRUD Owner (Admin): lista, crear, editar, desactivar/reactivar
- [ ] Validaciones al crear: campos obligatorios segun entity_type, formato tax_id
- [ ] Bloqueo si excede max_owners al crear
- [ ] Modal de confirmacion al desactivar Owner con alojamientos activos
- [ ] No permitir desactivar el unico Owner activo de la cuenta

### Entidad Pagadora (PayerEntity) — PENDIENTE:
- [ ] Pagina ver/editar Entidad Pagadora (Admin)
- [ ] No se puede eliminar (siempre existe 1)
- [ ] Validar campos obligatorios
- [ ] Card "Entidad Pagadora" en tab Resumen de ClientAccountDetail

### Alojamientos + Owner — PENDIENTE:
- [ ] Selector Owner obligatorio al crear alojamiento
- [ ] Solo muestra owners activos en selector
- [ ] CTA si no hay owners: "Crea tu primera Entidad Propietaria"
- [ ] Owner read-only al editar (Basic/Investor/Business) con tooltip
- [ ] Owner editable al editar (Agency) con modal de confirmacion
- [ ] Columna Owner en tab Alojamientos de ClientAccountDetail

### Pendientes de implementar en UI (otros):
- [ ] ServiceCreate, ServiceEdit, ServiceDetail (paginas individuales)
- [ ] Duplicar plan desde listado o edicion
- [ ] Archivar plan con modal (actualmente usa confirm)
- [ ] Integracion real del catalogo dinamico de servicios en PlanCreate (actualmente usa AVAILABLE_SERVICES estatico)
- [ ] Edicion inline de datos de cuenta (tab Configuracion actualmente muestra botones mock)
- [ ] Cambio de plan desde detalle de cuenta (actualmente mock) + validacion downgrade por limites de owners/accommodations/rooms
- [ ] Gestion real de usuarios desde detalle (actualmente navega a ruta sin componente dedicado)

---

## 12) Jerarquia final del modelo de datos

```
SmartRent Systems (SaaS)
  └─ ClientAccount (Tenant / Contrato)
       ├─ PayerEntity (1:1) — Quien paga la suscripcion SaaS
       ├─ OwnerEntity (1..N segun plan) — Quien posee/opera los alojamientos
       │    └─ Accommodation (1..N por Owner)
       │         └─ Room (1..N por Accommodation)
       │              └─ Occupancy → Tenant
       ├─ Users (admin, api, viewer [con owner_entity_id opcional], student)
       ├─ Subscription (plan + billing_period)
       └─ Branding (colores, logo — segun plan)
```

---

## 13) Mapeo antiguo → nuevo (referencia para migracion)

| Concepto antiguo (legacy v1) | Concepto nuevo (v2) | Notas |
|---|---|---|
| `legal_companies` type=account | `payer_entities` (PayerEntity) | 1:1 con ClientAccount |
| `legal_companies` type=fiscal | `owner_entities` (OwnerEntity) | 1..N segun plan |
| `internal_companies` (is_hidden=true) | Se elimina del flujo | Era transparente al usuario; ahora el Owner es explicito |
| `internal_companies` (is_hidden=false, Agency) | `owner_entities` (visibles) | Las "carteras" pasan a ser Owners |
| `accommodations.internal_company_id` | `accommodations.owner_entity_id` | FK al Owner |
| `accommodations.fiscal_company_id` | Se elimina | El Owner YA es la entidad fiscal/propietaria |
| `users.internal_company_id` (viewer) | `users.owner_entity_id` (viewer) | Viewer restringido a un Owner |
| Tab "Empresas" en ClientAccountDetail | Tab "Propietarios" | Reemplaza con nueva funcionalidad |
| `LEGAL_COMPANY_TYPES` (account, fiscal) | `ENTITY_TYPE` (persona_fisica, autonomo, persona_juridica) | Nuevo enum de tipo de entidad |
| `LEGAL_FORMS` | `ENTITY_TYPE` | Mismo concepto, distinto nombre |

---

## 14) Nota sobre gestion legacy (v1)

> **IMPORTANTE**: No tocar la gestion legacy de empresas de la **version v1** del sistema.
> Esto se refiere a las pantallas y rutas de la estructura v1 (`/clientes/empresas`, `CompaniesList.jsx`, `CompanyCreate.jsx`, etc.)
> que usan los conceptos de `internal_companies` y `legal_companies`.
>
> - Mantenerlas sin cambios y **fuera del flujo principal v2**.
> - Las pantallas v1 legacy pueden quedar ocultas o no navegables, pero NO se eliminan ni se refactorizan.
> - Esto permite compatibilidad hacia atras mientras se completa la migracion al nuevo modelo v2 con PayerEntity + OwnerEntity.
>
> **En la v2**, los conceptos de "Empresas Internas" y "Empresas Fiscales" se reemplazan completamente
> por **Entidad Pagadora** y **Entidades Propietarias** (ver seccion 13 — Mapeo antiguo → nuevo).
