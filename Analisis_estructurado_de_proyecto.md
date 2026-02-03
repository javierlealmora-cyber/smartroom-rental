# Análisis Estructurado del Proyecto SmartRent Systems

> **ANÁLISIS FUNCIONAL DE ESTRUCTURA DE PROYECTO**
> **SOLO PANTALLAS (NO HACER NADA DE BACKEND. AÑADIR DATOS MOQUEADOS)**

---

## NOTA CRÍTICA PARA IMPLEMENTACIÓN

> **NO TOCAR LO EXISTENTE:**
> Actualmente existe una rama ya implementada de "gestión de empresas" basada en las tablas `public.companies` y `public.profiles` y en Edge Functions como `provision_company` / `update_company` / `delete_company` y páginas tipo `CompaniesList` / `CompanyCreate`.
>
> Esa rama **NO se modifica**, **NO se renombra**, **NO se borra**, **NO se migra** ni se refactoriza.
>
> Lo nuevo se implementa como una **rama paralela totalmente independiente**, con tablas nuevas, Edge Functions nuevas y pantallas nuevas que usarán el tenant `client_account_id`.

---

## 1. Esquema Jerárquico Final (Operativa + Fiscal + Tenant)

> **Nota clave:** Todo cuelga de `client_account_id` (tenant SaaS). Los alojamientos/habitaciones **SOLO** cuelgan de Empresa Interna.

```
Admin
├── Cuenta Cliente (Basic)
│   ├── Empresa (Type = Cuenta Cliente) → (1) (Autónomo / Emp. Física / Emp. Jurídica)
│   └── Empresa (Type = Interna) → (1 oculta)
│       └── Alojamientos → (1..n)
│           └── Habitaciones → (1..n)
│
├── Cuenta Cliente (Investor)
│   ├── Empresa (Type = Cuenta Cliente) → (1) (Autónomo / Emp. Física / Emp. Jurídica)
│   ├── Empresa (Type = Fiscal) → (1..n) (Autónomo / Emp. Física / Emp. Jurídica)
│   └── Empresa (Type = Interna) → (1 oculta)
│       └── Alojamientos → (1..n)
│           └── Habitaciones → (1..n)
│
├── Cuenta Cliente (Business)
│   ├── Empresa (Type = Cuenta Cliente) → (1) (Autónomo / Emp. Física / Emp. Jurídica)
│   ├── Empresa (Type = Fiscal) → (1..n) (Autónomo / Emp. Física / Emp. Jurídica)
│   └── Empresa (Type = Interna) → (1 oculta)
│       └── Alojamientos → (1..n)
│           └── Habitaciones → (1..n)
│
└── Cuenta Cliente (Agencia)
    ├── Empresa (Type = Cuenta Cliente) → (1) (Autónomo / Emp. Física / Emp. Jurídica)
    ├── Empresa (Type = Fiscal) → (1..n) (Autónomo / Emp. Física / Emp. Jurídica)
    └── Empresa (Type = Interna) → (1..n visible por user viewer)
        └── Alojamientos → (1..n)
            └── Habitaciones → (1..n)
```

### Restricción Estructural

| Restricción | Descripción |
|-------------|-------------|
| `accommodations.internal_company_id` | **Obligatorio** |
| `accommodations.fiscal_company_id` | Nullable en Basic, obligatorio en Investor/Business/Agencia |
| Legal companies (account/fiscal) | **NO pueden** tener alojamientos colgando |

---

## 2. Modelo de Datos (Definición por Entidad)

### 2.1 `client_accounts` (Tenant SaaS)

**Propósito:** Contrato SaaS + branding + plan + estado.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid, PK | Identificador único |
| `name` | text | Nombre comercial del cliente/tenant ("Cuenta Cliente") |
| `plan` | enum | `basic` \| `investor` \| `business` \| `agency` |
| `status` | enum | `active` \| `suspended` \| `cancelled` |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de última actualización |
| `billing_start_date` | date | Fecha inicio facturación (opcional) |
| `theme_primary_color` | text | Color primario hex (branding) |
| `logo_url` | text | URL del logo |
| `theme_secondary_color` | text | Color secundario (opcional) |
| `favicon_url` | text | URL del favicon (opcional) |

**Reglas:**
- Un usuario puede pertenecer a 1 `client_account_id` (en modelo final)
- En "Agencia", la multi-operación se resuelve con múltiples `internal_companies`, no con múltiples tenants

---

### 2.2 `legal_companies` (Empresas Legales: Pagador SaaS y Fiscales)

**Propósito:** Identidad legal y fiscal (facturas, impuestos, asignación a alojamientos).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid, PK | Identificador único |
| `client_account_id` | uuid, FK | Referencia a `client_accounts` (obligatorio) |
| `type` | enum | `account` \| `fiscal` (obligatorio) |
| `legal_name` | text | Razón social / nombre |
| `legal_form` | enum | `persona_fisica` \| `autonomo` \| `persona_juridica` (opcional) |
| `tax_id` | text | NIF/CIF |
| `address_line1` | text | Dirección línea 1 |
| `address_line2` | text | Dirección línea 2 |
| `postal_code` | text | Código postal |
| `city` | text | Ciudad |
| `province` | text | Provincia |
| `country` | text | País |
| `contact_email` | text | Email de contacto |
| `contact_phone` | text | Teléfono de contacto |
| `status` | enum | `active` \| `inactive` |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de última actualización |

**Reglas:**
- Por cada `client_account_id` debe existir exactamente 1 `legal_companies.type='account'`
- `legal_companies.type='fiscal'` puede ser 0..N según plan
- Las fiscales se asignan a alojamientos vía `accommodations.fiscal_company_id`

---

### 2.3 `internal_companies` (Empresas Operativas)

**Propósito:** Unidad operativa "de gestión" (propietario/mandato/cartera), de la que cuelgan alojamientos y habitaciones.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid, PK | Identificador único |
| `client_account_id` | uuid, FK | Referencia a `client_accounts` (obligatorio) |
| `name` | text | Nombre operativo |
| `status` | enum | `active` \| `inactive` |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de última actualización |

**Reglas por Plan:**
| Plan | Empresas Internas |
|------|-------------------|
| Basic | Exactamente 1 (oculta en UI) |
| Investor | Exactamente 1 (oculta en UI) |
| Business | Exactamente 1 (oculta en UI) |
| Agency | 1..N (visibles en UI) |

---

### 2.4 `accommodations` (Alojamientos/Residencias)

**Propósito:** Residencia/piso con N habitaciones.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid, PK | Identificador único |
| `client_account_id` | uuid, FK | Referencia a `client_accounts` (obligatorio) |
| `internal_company_id` | uuid, FK | Referencia a `internal_companies` (obligatorio) |
| `fiscal_company_id` | uuid, FK | Referencia a `legal_companies` (nullable en Basic) |
| `name` | text | Nombre del alojamiento |
| `status` | enum | `active` \| `inactive` |
| `address_line1` | text | Dirección (opcional) |
| `address_line2` | text | Dirección línea 2 (opcional) |
| `postal_code` | text | Código postal (opcional) |
| `city` | text | Ciudad (opcional) |
| `province` | text | Provincia (opcional) |
| `country` | text | País (opcional) |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de última actualización |

**Reglas:**
- Un alojamiento siempre pertenece a una `internal_company`
- Un alojamiento puede tener una fiscal asignada (según plan)
- Se usa para reporting y filtros

---

### 2.5 `rooms` (Habitaciones)

**Propósito:** Habitación, estado, atributos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid, PK | Identificador único |
| `client_account_id` | uuid, FK | Referencia a `client_accounts` (obligatorio) |
| `accommodation_id` | uuid, FK | Referencia a `accommodations` (obligatorio) |
| `number` | text | Número/identificador (ej. "2A", "101") |
| `status` | enum | `free` \| `occupied` \| `pending_checkout` \| `inactive` |
| `monthly_rent` | decimal | Alquiler mensual (opcional) |
| `notes` | text | Notas (opcional) |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de última actualización |

---

### 2.6 `room_occupancies` (Ocupación/Contrato por Habitación)

**Propósito:** Trazabilidad de quién ocupa qué y cuándo.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid, PK | Identificador único |
| `client_account_id` | uuid, FK | Referencia a `client_accounts` (obligatorio) |
| `room_id` | uuid, FK | Referencia a `rooms` (obligatorio) |
| `tenant_id` | uuid, FK | Referencia a `tenants` (obligatorio) |
| `move_in_date` | date | Fecha real de entrada |
| `billing_start_date` | date | Fecha inicio facturación (default = move_in_date) |
| `move_out_date` | date | Fecha de salida (nullable) |
| `billing_end_date` | date | Fecha fin facturación (nullable, default = move_out_date) |
| `bill_services_during_gap` | boolean | Para "reactivar" / gaps |
| `status` | enum | `active` \| `pending_checkout` \| `ended` |

**Reglas:**
- No puede haber dos ocupaciones activas solapadas en la misma habitación
- Permite "pendiente de baja" y "baja efectiva"

---

### 2.7 `tenants` (Inquilinos/Estudiantes)

**Propósito:** Perfil del inquilino y onboarding.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid, PK | Identificador único |
| `client_account_id` | uuid, FK | Referencia a `client_accounts` (obligatorio) |
| `profile_user_id` | uuid, FK | Referencia a `auth.users` (nullable hasta onboarding) |
| `full_name` | text | Nombre completo |
| `email` | text | Email |
| `phone` | text | Teléfono |
| `status` | enum | `invited` \| `active` \| `inactive` \| `pending_checkout` |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de última actualización |

---

## 3. Reglas por Plan (Criterios de Aceptación)

### Plan Basic

| ID | Criterio de Aceptación |
|----|------------------------|
| CA-B01 | Al crear un `client_account` se crea automáticamente: 1 `legal_company` type=account + 1 `internal_company` (oculta) |
| CA-B02 | El admin NO puede crear ni ver `internal_companies` en UI |
| CA-B03 | El admin NO puede crear `legal_companies` type=fiscal |
| CA-B04 | Al crear un alojamiento, `accommodations.internal_company_id` se asigna a la interna oculta automáticamente |
| CA-B05 | `accommodations.fiscal_company_id` puede ser NULL. Si es NULL, la facturación usa por defecto la `legal_company` type=account |

---

### Plan Investor

| ID | Criterio de Aceptación |
|----|------------------------|
| CA-I01 | Al crear un `client_account` se crea automáticamente: 1 `legal_company` type=account + 1 `internal_company` (oculta) |
| CA-I02 | El admin puede crear/editar 1..N `legal_companies` type=fiscal |
| CA-I03 | El admin no ve ni gestiona `internal_companies` en UI |
| CA-I04 | Al crear alojamiento, se asigna `internal_company_id` a la interna oculta |
| CA-I05 | `accommodations.fiscal_company_id` es obligatorio si el alojamiento está en estado `active` |

---

### Plan Business

| ID | Criterio de Aceptación |
|----|------------------------|
| CA-BU01 | Igual que Investor en estructura (account + 1 interna oculta + N fiscales) |
| CA-BU02 | `accommodations.fiscal_company_id` obligatorio (o "obligatorio si active") |
| CA-BU03 | Business habilita features extra (tickets/encuestas/etc.) a nivel tenant |

---

### Plan Agency

| ID | Criterio de Aceptación |
|----|------------------------|
| CA-A01 | Al crear un `client_account` se crea automáticamente: 1 `legal_company` type=account + 1 `internal_company` inicial (visible) |
| CA-A02 | El admin puede crear 1..N `internal_companies` (visibles) |
| CA-A03 | El admin puede crear 1..N `legal_companies` type=fiscal |
| CA-A04 | Al crear un alojamiento, el admin debe seleccionar `internal_company_id` |
| CA-A05 | `accommodations.fiscal_company_id` obligatorio (o "obligatorio si active") |
| CA-A06 | Se habilita el rol `viewer` limitado a 1 `internal_company_id` |

---

## 4. Permisos por Rol

### Roles del Sistema

| Rol | Descripción |
|-----|-------------|
| `superadmin` | SmartRent Systems - Administra el SaaS completo |
| `admin` | Cliente - Gestiona la operativa del tenant |
| `api` | Operador del cliente para altas/asignaciones masivas |
| `student` | Inquilino - Ve su información personal |
| `viewer` | Solo Agencia - Lectura acotada a 1 empresa interna |

---

### Matriz de Permisos

#### Superadmin

**Puede:**
- Crear/editar/desactivar `client_accounts`
- Crear `legal_company(type=account)` del tenant (si no se autogenera)
- Forzar plan/status/branding
- Invitar/crear admin y api del tenant

**No debe:**
- Gestionar operativa diaria (alojamientos/rooms) salvo soporte

---

#### Admin (Cliente)

**Puede:**
- Crear/editar/desactivar `accommodations` y `rooms`
- Crear/editar `tenants` (o delegarlo al api)
- Configurar fiscalidad:
  - Basic: no fiscales (o 1 opcional)
  - Investor/Business/Agency: 1..N fiscales
- Agency: crear/editar `internal_companies` (en otros planes NO)
- Crear otros admin y api para su tenant

**No debe:**
- Cambiar plan/status del tenant
- Ver otros tenants

---

#### API (Operador)

**Puede:**
- Crear inquilinos (`tenants`) e invitar onboarding
- Asignar habitaciones (crear `room_occupancies`)
- Gestionar cambios de habitación y bajas programadas

**No debe:**
- Crear alojamientos/rooms
- Editar fiscalidad, plan, branding

---

#### Student (Inquilino)

**Puede:**
- Ver su perfil y su habitación actual
- Ver consumos/gráficas/boletines/encuestas según plan

**No debe:**
- Ver otros inquilinos ni alojamientos completos
- Crear entidades

---

#### Viewer (Solo Agencia)

**Puede:**
- Ver datos de 1 `internal_company_id` asignada (reporting + alojamientos/habitaciones)

**No debe:**
- Crear/editar entidades

---

## 5. Reglas Críticas Adicionales

### RLS / Seguridad

| Regla | Descripción |
|-------|-------------|
| Filtro por tenant | Todas las tablas incluyen `client_account_id`. Toda consulta "user-facing" debe filtrar por `client_account_id` |
| Acceso por rol | admin/api/viewer/student solo acceden a su `client_account_id` |
| Viewer restringido | Viewer además filtra por `internal_company_id` asignada |

### Integridad Fiscal

| Regla | Descripción |
|-------|-------------|
| Referencia fiscal | `accommodations.fiscal_company_id` debe referenciar una `legal_company` con `type='fiscal'` (en Investor/Business/Agency) |
| Default en Basic | Si `fiscal_company_id` es NULL, se usa `type='account'` por defecto |

### Ocultación de Interna en No-Agencia

- Aunque exista 1 `internal_company`, la UI nunca muestra CRUD de internas en Basic/Investor/Business

---

## 6. Resumen Operativo para Implementación

1. **Entidades y campos anteriores** (mínimo viable)
2. **Creación automática** de:
   - `legal_company(account)` + `internal_company` al crear tenant
3. **Reglas por plan (CA) en backend:**
   - Impedir crear más internas en no-Agencia
   - Exigir fiscal en alojamientos según plan
4. **Matriz de permisos por rol**

---

# PARTE 1: DISEÑO DE PANTALLAS POR ROL (UI-First)

## 1. Estrategia de Acceso SaaS (Una Sola URL + Branding por Tenant)

- **URL única para todos:** `https://www.smartrentsystems.com`
- **Login único** (email + password) para todos los roles

### Flujo Post-Login:

1. Se obtiene el perfil global del usuario (rol global) y la lista de tenants a los que pertenece (membresías)
2. **Si el usuario tiene 0 tenants:** mostrar error "Usuario sin acceso asignado"
3. **Si el usuario tiene 1 tenant:** se selecciona automáticamente ese tenant
4. **Si el usuario tiene >1 tenants** (caso futuro permitido SOLO para admin):
   - Mostrar selector de Cuenta Cliente (tenant selector) con el listado de `client_accounts.display_name`
   - El usuario elige uno y ese será el tenant activo

### Branding/Theming:

- El sistema aplica logo + color primario según el tenant activo
- El cambio de tenant re-renderiza la UI con el branding del nuevo tenant
- **El theming se aplica a:**
  - Header superior (logo + color)
  - Sidebar (color/estilo)
  - Botones principales (primary)
  - Badges/estados (si se parametriza)

---

## 2. Navegación Base (Estructura Común)

### Header Superior
- Branding + accesos comerciales futuros: "Inicio, Quiénes Somos, Servicios, Contacto" (opcional)

### Menú App (Área Privada)

```
├── Alojamientos
│   ├── Gestión de Alojamientos
│   ├── Gestión de Inquilinos
│   └── Histórico de Ocupación (visual por año)
├── Consumo (para inquilino y admin según permisos)
├── Configuración (depende del rol y plan)
└── Usuario (perfil + salir)
```

### Elementos Comunes en Todas las Pantallas:
- Breadcrumbs
- Indicador de tenant activo (nombre de la Cuenta Cliente)
- Si aplica: selector tenant (solo admin con múltiples tenants)

---

## 3. Roles Globales y Alcance

| Rol Global | Descripción |
|------------|-------------|
| `superadmin` | SmartRent Systems: administra el SaaS completo, crea Cuentas Cliente y usuarios iniciales |
| `admin` | Cliente: gestiona la operativa del tenant (alojamientos, habitaciones, inquilinos, consumos, fiscalidad, usuarios) |
| `api` | Cliente: rol operativo para altas/asignaciones (inquilinos/habitaciones) sin tocar configuración crítica |
| `student` | Inquilino: ve su información + consumo + boletines + encuestas si aplican |
| `viewer` | Solo para Agencia: solo lectura (reporting) restringido a una empresa interna concreta |

### Caso Especial - Múltiples Tenants:
- Permitido **SOLO para admin** (mismo rol global en todos sus tenants)
- Si un mismo email está asociado a varios tenants, tras login debe elegir tenant activo

---

## 4. Pantallas por Rol (Diseño Detallado)

### 4.1 Login (Todos los Roles)

#### Pantalla: Login

**Campos:**
- Email (obligatorio, formato email)
- Password (obligatorio)

**Acciones:**
- Iniciar sesión
- "He olvidado mi contraseña" (flujo reset)

**Validaciones:**
- Email válido
- Password no vacío

**Resultado:**
- Si login OK → cargar perfil y memberships → tenant selector si aplica

---

#### Pantalla: Reset Password

- Email → enviar enlace → confirmar

---

### 4.2 Superadmin (SmartRent Systems)

#### 4.2.1 Dashboard Superadmin

**KPIs:**
- Nº Cuentas Cliente activas/inactivas
- Nº tenants totales
- Nº alojamientos totales (si existe agregado)

**Accesos rápidos:**
- Crear Cuenta Cliente
- Listar Cuentas Cliente

---

#### 4.2.2 Gestión de Cuentas Cliente (CRUD Completo)

##### Pantalla: Listado de Cuentas Cliente

**Columnas:**
| Columna | Descripción |
|---------|-------------|
| Nombre Cuenta Cliente | Nombre comercial |
| Plan | Basic/Investor/Business/Agencia |
| Estado | active/suspended/canceled |
| Fecha alta | created_at |
| Fecha inicio | start_date |
| Fecha fin | end_date (si existe) |
| Branding | logo sí/no |
| Acciones | Ver / Editar / Suspender / Reactivar / (Borrar lógico) |

**Filtros:**
- Buscar por nombre
- Filtrar por plan
- Filtrar por estado

**Acciones:**
- Crear nueva Cuenta Cliente
- Entrar al detalle (ver + editar)

---

##### Pantalla: Crear Cuenta Cliente (Alta Superadmin)

**Sección A: Datos del Contrato SaaS (`client_accounts`)**
- Nombre comercial (obligatorio)
- Slug (obligatorio, único, auto-sugerido)
- Plan (obligatorio): Basic / Investor / Business / Agencia
- Estado (por defecto active)
- Fecha inicio (por defecto hoy)
- Fecha vigencia (opcional)

**Sección B: Branding (según plan)**
- Basic: Theme estándar (selector de temas predefinidos)
- Investor/Business/Agencia: Theme personalizable
  - Color primario (hex)
  - Logo URL (o upload futuro)

**Sección C: "Empresa Pagadora" (`legal_companies` type='account')**
- Tipo de entidad: Persona física / Autónomo / Jurídica
- Nombre fiscal
- CIF/NIF
- Dirección completa (país, provincia, ciudad, CP, calle, número)
- Email facturación
- Teléfono

**Sección D: Usuario Admin Inicial del Tenant**
- Email admin (obligatorio)
- Nombre completo (opcional)
- Teléfono (recomendado; futuro WhatsApp)

**Acciones:**
- Crear (submit)
- Cancelar

**Validaciones:**
- Slug único
- Email admin no duplicado si se crea usuario nuevo
- Plan coherente con reglas

---

##### Pantalla: Detalle/Edición Cuenta Cliente

**Permite editar:**
- Estado (suspend/active)
- Plan (con cuidado: si reduce límites, debe validar)
- Branding (según plan)
- Datos empresa pagadora (account)

**Acciones:**
- "Gestionar usuarios" (admins/api/viewers)
- "Gestionar empresas fiscales" (si aplica)
- "Ver actividad/auditoría" (opcional)

---

#### 4.2.3 Gestión de Usuarios del Tenant (Superadmin)

##### Pantalla: Usuarios de una Cuenta Cliente

**Tabla:**
| Columna | Descripción |
|---------|-------------|
| Email | Email del usuario |
| Rol global | admin/api/student/viewer |
| Estado | activo/invitado |
| Teléfono | Teléfono de contacto |
| Acciones | Invitar / Reset password / Desactivar acceso |

**Acciones:**
- Añadir Admin adicional (sí)
- Añadir API user (sí)
- Añadir Viewer (solo plan Agencia)

---

### 4.3 Admin Empresa (Cliente)

#### 4.3.1 Dashboard Admin (Dummy POC con Estructura)

**Bloques:**
- Alojamientos (nº total, ocupadas, libres, pendientes)
- Inquilinos (activos, pendientes baja)
- Consumo (último mes total)
- Accesos rápidos: crear alojamiento, crear inquilino

---

#### 4.3.2 Gestión de Alojamientos (Principal)

##### Pantalla: Lista de Alojamientos

**Columnas mínimas:**
| Columna | Descripción |
|---------|-------------|
| Nombre alojamiento | Nombre del alojamiento |
| Dirección | Resumen de dirección |
| Habitaciones totales | Total de habitaciones |
| Habitaciones ocupadas | Badge rojo |
| Habitaciones libres | Badge verde |
| Habitaciones pendiente de baja | Badge naranja |
| Estado alojamiento | activo/desactivado |
| Acciones | Ver detalle / Editar / Desactivar |

**Buscador:**
- Texto por nombre
- Toggle "ver desactivados"

**Acciones:**
1. Añadir Alojamiento
2. Ver detalle (estado/ocupación)
3. Editar alojamiento (incluye habitaciones)
4. Desactivar (borrado lógico)

---

##### Pantalla: Añadir Alojamiento (Creación Dinámica de Habitaciones)

**Paso 1:**
- Nombre alojamiento (obligatorio)
- Nº habitaciones (obligatorio, entero >0)

**Al pulsar enter/continuar:**
- Se generan dinámicamente filas de habitaciones:
  - Nº / identificador habitación (ej: 1A, 2B...)
  - (Opcional) m2, tipo, precio base, notas
  - Estado inicial: libre

**Sección Fiscal (según plan):**
- Selector "Empresa fiscal asignada" (obligatorio en Investor/Business/Agencia; opcional en Basic)
- El selector debe mostrar (ocupada/no seleccionable) si aplica

**Guardar:**
- Crea alojamiento + habitaciones

**Validaciones:**
- No exceder límites de plan (Basic/Investor)
- Habitación ID único dentro del alojamiento

---

##### Pantalla: Editar Alojamiento

**Edita:**
- Datos alojamiento
- Datos de habitaciones (renombrar, atributos)
- (Opcional) añadir habitación extra si plan lo permite

**Importante:** Cambios que afecten a ocupación deben respetar integridad (no borrar habitación ocupada; solo desactivar)

---

##### Pantalla: Ver Estado/Detalle de Alojamiento

Vista tipo "tarjetas de habitaciones" mostrando:
- Habitación: ocupada/libre/pendiente baja
- Inquilino actual (si existe)
- Fechas (entrada/salida)
- Acciones rápidas: ver inquilino, cambiar estado, etc.

---

#### 4.3.3 Gestión de Inquilinos (Lista + Operaciones)

##### Pantalla: Lista de Inquilinos

**Columnas:**
| Columna | Descripción |
|---------|-------------|
| Nombre y apellidos | Nombre completo |
| Email | Email del inquilino |
| Teléfono | Teléfono de contacto |
| Alojamiento / Habitación actual | Ubicación actual |
| Estado | Activo / Pendiente de baja / Baja |
| Fecha alta | Fecha de ocupación real |
| Fecha inicio facturación | billing start |
| Acciones | Editar, Dar baja, Enviar email onboarding, Ver consumo, Ver boletines |

**Filtros:**
- Buscar por nombre/email
- Estado (activo/baja/pendiente)
- Alojamiento
- Mostrar bajas (toggle)

---

##### Pantalla: Crear Inquilino

**Datos personales:**
- Nombre completo (obligatorio)
- Email (obligatorio)
- Teléfono (obligatorio ideal)
- Documento (opcional)

**Asignación:**
- Alojamiento (obligatorio)
- Habitación (obligatorio)
  - En desplegable de habitaciones: mostrar "(OCUPADA)" y deshabilitar selección si ocupada

**Fechas (muy importante):**
- Fecha alta ocupación (move-in real): puede ser cualquier día del mes
- Fecha inicio facturación (por defecto igual a alta ocupación)
- Checkbox: "Facturar desde fecha de alta" (si desmarcado, permite diferente billing start)

**Guardar:**
- Crea inquilino + ocupación + (si procede) usuario auth en modo invitación

**Acción adicional:**
- Botón "Enviar onboarding email" (o auto tras crear)

---

##### Pantalla: Editar Inquilino

**Permite:**
- Modificar datos personales
- Cambiar habitación (ver apartado "Cambiar habitación")
- Programar baja (pendiente)
- Reactivar (si estaba de baja)

**Validaciones:**
- No permitir asignar habitación ocupada
- Mantener historial de ocupación

---

#### 4.3.4 Cambiar Habitación

**Acción: "Cambiar habitación"**

**Reglas:**
- Al cambiar de habitación, el sistema debe:
  - Cerrar ocupación anterior con fecha fin (move-out)
  - Crear nueva ocupación desde fecha inicio (move-in)
- Facturación:
  - Se debe decidir cómo imputar costes de servicios
  - **Opción recomendada:** imputar por rango de fechas a la habitación donde estaba en cada día
  - Si hay prorrateo mensual, el motor calcula por días según ocupación

**UI - Form Modal:**
- Nueva habitación (solo libres)
- Fecha efectiva del cambio
- Fecha inicio facturación del nuevo tramo (por defecto igual)
- Confirmación con resumen:
  - "Del día X al Y se imputará a habitación antigua"
  - "Desde día Z a nueva habitación"

---

#### 4.3.5 Baja Programada y Facturación

**Acción: "Dar baja"**

**Campos:**
- Fecha baja ocupación (move-out)
- Fecha fin facturación (por defecto igual a baja ocupación)
- Checkbox "facturar hasta fecha de baja" (default sí)

**Estado:**
- Si fecha baja futura → estado "Pendiente de baja"
- Si fecha baja pasada/hoy → estado "Baja"

---

#### 4.3.6 Reactivar Inquilino

**Acción: "Reactivar"**

**Campos:**
- Fecha re-alta ocupación
- Fecha inicio facturación (default igual)
- Checkbox: "facturar periodo entre baja y alta":
  - Default NO (lo normal)
  - Si SÍ: se genera tramo facturable sin ocupación real

**Resultado:**
- Nuevo tramo de ocupación

---

### 4.4 API (Operador)

**Pantallas permitidas (simplificadas):**
- Lista Inquilinos + Crear + Cambiar habitación + Baja + Reactivar
- Asignación habitación (principal)

**NO puede:**
- Crear/editar alojamientos
- Cambiar plan/branding/empresas
- Gestionar usuarios admin

---

### 4.5 Estudiante / Inquilino (Portal)

#### Pantalla: Inicio Inquilino

**Tarjeta "Mi habitación":**
- Alojamiento, habitación, fechas (alta/baja si procede)

**Tarjeta "Mi consumo" (OBLIGATORIO siempre):**
- Gráfica coste diario (últimos 30 días / filtro por mes)
- Resumen mes actual: total

**"Boletines mensuales":**
- Lista de meses
- Ver detalle
- Descargar PDF

**"Encuestas" (solo si servicio activo en plan):**
- Listado + responder

**"Tickets incidencias" (si servicio activo):**
- Crear ticket / ver estado / historial

**"Perfil":**
- Datos básicos (nombre, email, teléfono)
- (Opcional) cambiar contraseña

---

## 5. Reglas por Plan (Criterios de Aceptación UI)

### Límites por Plan

| Plan | Alojamientos | Habitaciones | Theming | Empresas Fiscales | Empresas Internas |
|------|--------------|--------------|---------|-------------------|-------------------|
| Basic | 1-3 | Ilimitadas | Estándar (no custom) | Opcional/mínima | 1 (oculta) |
| Investor | 1-8 | Ilimitadas | Custom | 1..N | 1 (oculta) |
| Business | Ilimitados | Ilimitadas | Custom + servicios avanzados | 1..N | 1 (oculta) |
| Agencia | Ilimitados (o límite alto) | Ilimitadas | Custom | 1..N | 1..N (VISIBLES) + rol viewer |

---

### Criterios de Aceptación (Backend + UI)

| ID | Criterio |
|----|----------|
| CA-PLAN-01 | No se puede crear un alojamiento si excede el límite del plan |
| CA-PLAN-02 | Basic/Investor/Business no pueden crear más de 1 internal company |
| CA-PLAN-03 | Agencia puede crear múltiples internal companies y son visibles |
| CA-PLAN-04 | Las empresas fiscales nunca pueden tener alojamientos colgando |
| CA-PLAN-05 | En Investor/Business/Agencia, un alojamiento debe tener fiscal_company_id obligatorio |
| CA-PLAN-06 | El theming custom solo está disponible en Investor/Business/Agencia |
| CA-PLAN-07 | Servicios (encuestas/tickets/limpieza/lavandería/...) se activan según plan |

---

## 6. Diagrama "Qué Puede Crear Cada Rol"

### Superadmin

- Puede crear/editar/suspender `client_accounts`
- Puede crear `legal_company(type='account')` del cliente pagador
- Puede invitar/crear usuarios admin/api/viewer asociados al `client_account`

### Admin

- Puede crear alojamientos + habitaciones (respetando límites)
- Puede crear/editar inquilinos y asignaciones
- Puede crear empresas fiscales (si plan lo permite)
- Puede crear usuarios admin adicionales (mismo tenant)
- Puede crear usuarios api
- Puede ver consumos y boletines de todos

### API

- Puede crear/editar inquilinos
- Puede asignar/cambiar habitación
- Puede programar bajas/reactivar
- Puede enviar onboarding email

### Student

- Puede ver consumo (siempre)
- Puede ver/descargar boletines
- Puede responder encuestas (si activo)
- Puede crear/ver tickets (si activo)

### Viewer (Agencia)

- Solo lectura de alojamientos/inquilinos/ocupación/consumos
- Puede estar limitado a 1 `internal_company_id` si se decide

---

## Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-01-29 | Creación inicial del documento con estructura completa |
