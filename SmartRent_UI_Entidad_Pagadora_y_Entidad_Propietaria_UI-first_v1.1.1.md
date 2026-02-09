# SmartRent Systems — Entidad Pagadora y Entidad Propietaria (UI-first)
Version: v1.1.1
Fecha: 2026-02-09

Documento de instrucciones para actualizar pantallas UI + documento funcional con la estrategia final de **Entidad Pagadora** (Payer) y **Entidad Propietaria** (Owner), eliminando los conceptos legacy de "Empresas Internas" y "Empresas Fiscales" del flujo principal.

---

## 0) Objetivo del cambio

Queremos alinear el sistema con la estrategia final:

- Todo cuelga de `client_account_id` (tenant).
- Existe **1 Entidad Pagadora** (payer) por `client_account_id`.
- Existen **Entidades Propietarias** (owners) `1..N` por `client_account_id` segun plan:
  - **Basic**: `max_owners = 1`
  - **Investor**: `max_owners = 2`
  - **Business**: `max_owners = 5`
  - **Agency**: `max_owners = ilimitado` (o un numero muy alto)
- Los **Alojamientos** cuelgan de una Entidad Propietaria (owner).
- **Regla clave**:
  - En **Agency** se permite cambiar el owner de un alojamiento (porque puede cambiarse de cartera/propietario en la agencia).
  - En **Basic/Investor/Business** NO se permite cambiar el owner de un alojamiento una vez creado (owner "inmutable" para ese alojamiento).
- Mantener pantallas existentes de "companies/empresas" como **LEGACY**: no se eliminan, no se refactorizan, pero no se usan en el flujo principal nuevo (pueden quedar ocultas o no navegables).

---

## 1) Cambios en el Documento Funcional/UI (sin backend aun)

Actualiza el documento UI-first para que:

### 1.1. Reemplace "Fiscal/Internal/Legal Companies" por "Entidades"

**Eliminar** menciones funcionales a:
- `internal_companies`
- `legal_companies` (type='account'/'fiscal')
- `accommodations.internal_company_id` / `fiscal_company_id`

**Sustituir por**:
- **Entidad Pagadora** (payer): datos fiscales del pagador del SaaS.
- **Entidad Propietaria** (owner): entidad fiscal propietaria/operadora del alojamiento (puede ser autonomo/persona fisica/juridica).

### 1.2. Definir claramente modelos UI (nombres de entidades)

| Entidad | Descripcion | Cardinalidad |
|---|---|---|
| ClientAccount | Contrato SaaS (tenant) | 1 por contrato |
| PayerEntity | Entidad Pagadora | 1:1 con ClientAccount |
| OwnerEntity | Entidad Propietaria | 1..N por ClientAccount (segun plan) |
| Accommodation | Alojamiento | Pertenece a 1 OwnerEntity |
| Room | Habitacion | Pertenece a 1 Accommodation |
| Tenant | Inquilino | Asociado a Occupancy/Room |
| Occupancy | Historico de ocupacion (opcional V2) | Room + Tenant + fechas |

---

## 2) Pantallas nuevas / modificadas por rol

### 2.1. Superadmin (gestion global)

#### A) Crear/Editar Cuenta Cliente (Wizard)

Mantener estructura Wizard (Seccion A-E). Ajustar secciones:

| Seccion | Contenido | Notas |
|---|---|---|
| A — Contrato | Sin cambios: nombre, email, telefono, plan, billing period, estado, fechas | — |
| B — Branding | Visible segun plan (NO obligatorio en Basic) | branding_enabled del plan |
| C — Entidad Pagadora | Obligatoria siempre (self-signup siempre; superadmin_create puede dejarlo incompleto si estado PENDING) | Reemplaza la seccion de "Entidad Pagadora" actual |
| D — Usuarios admin iniciales | Titular + asociados (max 3) | Sin cambios |
| E — Verificar | Resumen de todo | Sin cambios |

#### B) Gestion Entidades Propietarias (Owners) — Nueva seccion/tab

Dentro del detalle de Cuenta Cliente (ClientAccountDetail):

- **Nuevo tab "Propietarios"** (reemplaza el tab "Empresas"):
  - Lista de Owners del tenant (`client_account_id`)
  - Columnas: Nombre/Razon social, Tipo entidad (badge), NIF/CIF, Estado (badge), Fecha alta, Num. alojamientos, Acciones
  - **Acciones**: Ver / Editar / Desactivar (baja logica) / Reactivar
  - **Accion**: "+ Nuevo Owner" (solo si no excede `max_owners` del plan)
  - **Validacion**: no permitir superar `max_owners`
  - **Warning**: "Has alcanzado el maximo de Entidades Propietarias permitidas por el plan [nombre_plan]" si se alcanza el limite

### 2.2. Admin (tenant)

#### A) Configuracion → Gestion de Entidades Propietarias (Owners)

Pagina CRUD completa:

- **Listado** con filtros (busqueda por nombre, filtro por estado)
- **Alta/Edicion** con validaciones segun tipo de entidad
- **Baja logica** y **reactivacion**
- Reglas por plan:
  - **Basic**: permitir crear 1. Si ya existe, ocultar boton "+ nuevo" y mostrar mensaje "Tu plan solo permite 1 Entidad Propietaria"
  - **Investor**: permitir hasta 2
  - **Business**: permitir hasta 5
  - **Agency**: ilimitado (o limite muy alto)

#### B) Configuracion → Entidad Pagadora

- Pagina de solo **ver/editar** (no lista, no crear multiples)
- Siempre existe 1 por cuenta
- Campos editables: datos fiscales, direccion, contacto

#### C) Gestion Alojamientos — Modificaciones

**Alta de Alojamiento**:
- Campo obligatorio **Owner** (selector de OwnerEntity)
- En selector, mostrar: `OwnerName + Tipo (PF/Autonomo/Juridica)`
- Si no hay owners creados, **bloquear creacion** y mostrar CTA: "Debes crear al menos 1 Entidad Propietaria antes de crear alojamientos."

**Editar Alojamiento**:
- Campo Owner **bloqueado** (read-only) para Basic/Investor/Business
- Campo Owner **editable** solo si plan = Agency
- Si plan = Agency y se intenta cambiar: modal de confirmacion "Cambiar la Entidad Propietaria puede afectar al reporting e historico. ¿Continuar?"

#### D) Cualquier selector de Owner

- Mostrar estado al lado: "Activo" / "Desactivado"
- **No permitir seleccionar** owners desactivados
- Si no hay owners activos, forzar CTA de creacion

### 2.3. API user / Student / Viewer

- **Viewer** (si existe): puede ver "owner" como filtro si esta permitido por negocio
- **Student**: no gestiona owners
- **API user**: acceso a datos segun permisos configurados

---

## 3) Campos (plantilla) de Entidad Pagadora y Entidad Propietaria

### 3.1. Campos comunes de "Entidad" (payer/owner)

| Campo | Tipo | Obligatorio Payer | Obligatorio Owner | Descripcion |
|---|---|---|---|---|
| entity_type | enum | Si | Si | `persona_fisica`, `autonomo`, `persona_juridica` |
| legal_name | string | Si (si juridica) | Si (si juridica) | Razon social |
| first_name | string | Si (si PF/autonomo) | Si (si PF/autonomo) | Nombre |
| last_name_1 | string | Si (si PF/autonomo) | Si (si PF/autonomo) | Primer apellido |
| last_name_2 | string | No | No | Segundo apellido (opcional) |
| tax_id | string | Si | Si | CIF o NIF |
| billing_email | string | Si | Recomendado | Email de facturacion/contacto |
| phone | string | Si | Recomendado | Telefono de contacto |
| **Direccion** | | | | |
| country | string | Si | Si | Pais (default "Espana") |
| province | string | No | No | Provincia |
| city | string | Si | Si | Ciudad |
| postal_code | string | Si | Si | Codigo postal |
| street | string | Si | Si | Calle |
| street_number | string | No | No | Numero (opcional) |
| address_extra | string | No | No | Informacion adicional (planta, puerta, etc.) |
| **Estado y fechas** | | | | |
| status | enum | Si | Si | `active`, `suspended`, `disabled` |
| created_at | datetime | Auto | Auto | Fecha de creacion |
| start_date | date | No | No | Fecha inicio actividad (si aplica) |
| end_date | date (nullable) | No | No | Fecha fin actividad (si aplica) |
| deactivated_at | datetime (nullable) | No | No | Fecha de baja logica |

### 3.2. Diferencias payer vs owner

| Aspecto | Entidad Pagadora (Payer) | Entidad Propietaria (Owner) |
|---|---|---|
| Cardinalidad | Siempre 1 por client_account | 1..N segun plan (max_owners) |
| Proposito | Facturacion del SaaS | Propietaria/operadora de alojamientos |
| Obligatoriedad | Debe existir para activar cuenta | Al menos 1 para crear alojamientos |
| billing_email | Obligatorio | Recomendado |
| phone | Obligatorio | Recomendado |
| Relacion con alojamientos | No tiene relacion directa | Alojamientos cuelgan de un Owner |
| Cambio de propietario | N/A | Solo en Agency (regla de plan) |

---

## 4) Reglas por plan (UI: warnings + bloqueos)

### 4.1. Owners — Limites

| Plan | max_owners | Comportamiento UI |
|---|---|---|
| Basic | 1 | Si ya existe 1 owner: ocultar boton "+ Nuevo", mostrar mensaje |
| Investor | 2 | Si owners_count >= 2: bloquear creacion, mostrar warning |
| Business | 5 | Si owners_count >= 5: bloquear creacion, mostrar warning |
| Agency | -1 (ilimitado) | Sin limite visible |

**Bloqueo duro al crear**: si `owners_count >= plan.max_owners` → bloquear "Crear Owner"

**Warning en lista**: "Has alcanzado el maximo de Entidades Propietarias permitidas por tu plan ([plan_name])"

### 4.2. Alojamientos — Owner obligatorio y cambio de owner

| Accion | Regla |
|---|---|
| Crear alojamiento | Requiere `owner_id` valido y activo |
| Sin owners activos | Bloquear creacion, mostrar CTA: "Crea tu primera Entidad Propietaria" |
| Editar owner (Basic/Investor/Business) | Campo owner **read-only**, tooltip: "Tu plan no permite cambiar la Entidad Propietaria de un alojamiento" |
| Editar owner (Agency) | Campo editable, **modal de confirmacion**: "Cambiar la Entidad Propietaria puede afectar al reporting e historico. ¿Continuar?" |

### 4.3. Plan downgrade — Warnings

En edicion de plan (superadmin o admin segun aplique):

Warning/bloqueo si el uso actual excede limites del plan destino:
- `owners_count > max_owners` → "La cuenta tiene X Entidades Propietarias pero el plan destino solo permite Y"
- `accommodations_count > max_accommodations` → "La cuenta tiene X alojamientos pero el plan destino solo permite Y"
- `rooms_count > max_rooms` → "La cuenta tiene X habitaciones pero el plan destino solo permite Y"
- Similar para usuarios admin, API, viewer, etc.

---

## 5) Cambios de navegacion (menu y rutas)

### 5.1. Admin (tenant) — Menu recomendado

```
Dashboard
Configuracion
  ├─ Entidad Pagadora (solo ver/editar)
  ├─ Entidades Propietarias (Owners) (CRUD)
  ├─ Usuarios
  └─ Plan y Facturacion
Alojamientos (requiere >= 1 Owner)
Habitaciones
Inquilinos
(Servicios segun plan)
```

### 5.2. Superadmin — Menu recomendado

```
Dashboard
Cuentas Cliente
  └─ Detalle: Contrato + Payer + Owners + Usuarios + Branding + Suscripcion
Planes
Servicios
Config Global
Plantillas
Cobros
```

### 5.3. Rutas propuestas (v2)

| Ruta | Componente | Rol | Descripcion |
|---|---|---|---|
| `/v2/admin/configuracion/pagador` | PayerEntityEdit | Admin | Ver/editar Entidad Pagadora |
| `/v2/admin/configuracion/propietarios` | OwnerEntitiesList | Admin | Listado Owners |
| `/v2/admin/configuracion/propietarios/nuevo` | OwnerEntityCreate | Admin | Crear Owner |
| `/v2/admin/configuracion/propietarios/:id` | OwnerEntityDetail | Admin | Ver/editar Owner |
| `/v2/admin/configuracion/propietarios/:id/editar` | OwnerEntityEdit | Admin | Editar Owner |
| Tab en ClientAccountDetail | (tab "Propietarios") | Superadmin | Lista Owners en detalle de cuenta |

---

## 6) Entregables esperados

### 6.1. Documento UI-first actualizado con:
- [ ] Nuevas pantallas/secciones Owners
- [ ] Eliminacion del modelo fiscal/internal antiguo en el flujo principal
- [ ] Reglas por plan (owners y cambio de owner)
- [ ] Modelos de datos actualizados (PayerEntity, OwnerEntity)
- [ ] Rutas actualizadas

### 6.2. Pantallas actualizadas (solo UI, usando mocks si backend aun no existe):
- [ ] CRUD Owners (Admin): lista, crear, editar, desactivar/reactivar
- [ ] Payer edit (Admin): ver/editar entidad pagadora
- [ ] Integracion del selector Owner en alta/edicion de Alojamiento con bloqueo de cambio segun plan
- [ ] Superadmin: tab "Propietarios" en detalle de Cuenta Cliente (reemplaza tab "Empresas")
- [ ] Wizard: actualizar seccion Entidad Pagadora con nueva nomenclatura

### 6.3. Checklist de criterios de aceptacion:
- [ ] Por pantalla (lista/crear/editar) para Owners
- [ ] Para cambios en Alojamiento (selector Owner, bloqueo de cambio)
- [ ] Nota explicita: "No tocar la gestion legacy de empresas"

---

## 7) Criterios de aceptacion minimos

### 7.1. Gestion Owners (Admin) — Lista

- [ ] Debe listar owners del tenant actual
- [ ] Debe mostrar: nombre/razon social, tipo entidad, NIF/CIF, estado, fecha alta
- [ ] Debe permitir buscar por nombre y filtrar por estado
- [ ] Debe mostrar boton "+ Nuevo Owner" solo si `owners_count < max_owners` (salvo Agency)
- [ ] Si `owners_count >= max_owners`: mostrar warning y ocultar boton de creacion

### 7.2. Crear Owner (Admin)

- [ ] Debe validar campos obligatorios segun tipo entidad:
  - persona_fisica / autonomo: first_name, last_name_1, tax_id obligatorios
  - persona_juridica: legal_name, tax_id obligatorios
- [ ] Debe impedir crear si supera `max_owners`
- [ ] Debe crear con estado `active` por defecto
- [ ] Debe validar formato de tax_id (NIF/CIF)
- [ ] Campos de direccion: country, city, postal_code, street obligatorios

### 7.3. Editar Owner (Admin)

- [ ] Debe permitir editar datos fiscales/direccion/telefono/email
- [ ] Debe permitir desactivar (baja logica) y reactivar
- [ ] Al desactivar: confirmar con modal ("Este Owner tiene X alojamientos activos. ¿Desactivar?")
- [ ] No debe permitir seleccionar owners desactivados en formularios de alojamiento
- [ ] No debe permitir desactivar si es el unico owner activo de la cuenta

### 7.4. Entidad Pagadora (Admin)

- [ ] Debe mostrar los datos de la entidad pagadora actual
- [ ] Debe permitir editar todos los campos
- [ ] Debe validar campos obligatorios
- [ ] No debe permitir eliminar (siempre existe 1)

### 7.5. Alojamiento — Crear

- [ ] Debe exigir seleccionar Owner activo
- [ ] Si no hay owners, debe bloquear creacion y mostrar CTA con enlace a "Crear Owner"
- [ ] Selector muestra: nombre + tipo entidad + estado
- [ ] Solo muestra owners con status = active

### 7.6. Alojamiento — Editar owner

- [ ] Si plan != Agency → campo owner read-only con tooltip explicativo
- [ ] Si plan = Agency → campo editable con modal de confirmacion
- [ ] Texto del modal: "Cambiar la Entidad Propietaria puede afectar al reporting e historico. ¿Continuar?"

### 7.7. Superadmin — Tab Propietarios en Detalle Cuenta

- [ ] Debe reemplazar el tab "Empresas" existente por tab "Propietarios"
- [ ] Debe listar los owners de la cuenta con las mismas columnas que el Admin
- [ ] Debe mostrar max_owners del plan como referencia
- [ ] Debe permitir "+ Nuevo Owner" respetando limites del plan
- [ ] No debe mostrar el concepto de "Empresas Internas" ni "Empresas Fiscales"

---

## 8) Nota sobre gestion legacy (v1)

> **IMPORTANTE**: No tocar la gestion legacy de empresas de la **version v1** del sistema.
> Esto se refiere a las pantallas y rutas de la estructura v1 (`/clientes/empresas`, `CompaniesList.jsx`, `CompanyCreate.jsx`, etc.)
> que usan los conceptos de `internal_companies` y `legal_companies`.
>
> - Mantenerlas sin cambios y **fuera del flujo principal v2**.
> - Las pantallas v1 legacy pueden quedar ocultas o no navegables, pero NO se eliminan ni se refactorizan.
> - Esto permite compatibilidad hacia atras mientras se completa la migracion al nuevo modelo v2 con PayerEntity + OwnerEntity.
>
> **En la v2**, los conceptos de "Empresas Internas" y "Empresas Fiscales" se reemplazan completamente
> por **Entidad Pagadora** y **Entidades Propietarias** (ver seccion 10 — Mapeo antiguo → nuevo).

---

## 9) Resumen visual de la jerarquia final

```
SmartRent Systems (SaaS)
  └─ ClientAccount (Tenant / Contrato)
       ├─ PayerEntity (1:1) — Quien paga la suscripcion
       ├─ OwnerEntity (1..N) — Quien posee/opera los alojamientos
       │    └─ Accommodation (1..N por Owner)
       │         └─ Room (1..N por Accommodation)
       │              └─ Occupancy → Tenant
       ├─ Users (admin, api, viewer, student)
       ├─ Subscription (plan + billing_period)
       └─ Branding (colores, logo — segun plan)
```

---

## 10) Mapeo antiguo → nuevo

| Concepto antiguo | Concepto nuevo | Notas |
|---|---|---|
| `legal_companies` type=account | `PayerEntity` | 1:1 con ClientAccount |
| `legal_companies` type=fiscal | `OwnerEntity` | 1..N segun plan |
| `internal_companies` (is_hidden=true) | Se elimina del flujo | Era transparente al usuario |
| `internal_companies` (is_hidden=false, Agency) | `OwnerEntity` (visibles) | Las "carteras" pasan a ser Owners |
| `accommodations.internal_company_id` | `accommodations.owner_entity_id` | FK al Owner |
| `accommodations.fiscal_company_id` | Se elimina | El Owner YA es la entidad fiscal/propietaria |
| `users.internal_company_id` (viewer) | `users.owner_entity_id` (viewer) | Viewer restringido a un Owner |
| Tab "Empresas" en ClientAccountDetail | Tab "Propietarios" | Reemplaza con nueva funcionalidad |
