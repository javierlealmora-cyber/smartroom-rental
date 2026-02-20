# Estructura Lógica y Funcional del Sistema — SmartRent Systems

> Documento de referencia para diseño de BBDD, pantallas y lógica de negocio.
> Fuente: especificación del cliente (Feb 2026).

---

## Jerarquía del sistema

```
Cuenta Cliente (client_accounts)
│
├── Datos de Cuenta
│   ├── Nombre, email, teléfono, fecha inicio
│   ├── Plan contratado + límites (plans_catalog)
│   ├── Branding (logo + color primario)
│   ├── Entidad Pagadora (type: autonomo / persona_fisica / persona_juridica)
│   ├── Usuario Admin principal (profiles con is_primary_admin = true)
│   └── Métodos de Pago (Stripe)
│
├── Configuración de Cliente
│   ├── Gestión Entidades Propietarias (entities type=owner) ** límite por plan
│   ├── Storage por entidad: smartrent-systems/{nombre-entidad}/
│   ├── Contratación de Servicios adicionales
│   └── Cambio de Plan / Cancelación
│
└── Entidades Propietarias (entities type=owner) ** límite por plan
    │
    └── Alojamientos (accommodations) ** límite por plan
        │   FK: owner_entity_id → entities.id
        │   FK: client_account_id → client_accounts.id
        │
        └── Habitaciones (rooms) ** límite por plan
            │   FK: accommodation_id → accommodations.id
            │
            └── Ocupación
                ├── Inquilinos (lodgers + lodger_room_assignments)
                │   ├── Asignación de habitación
                │   └── Cambio de habitación (historial)
                ├── Consumo energético (energy_readings)
                ├── Servicios (services)
                └── Boletines (bulletins)
```

---

## Modelo de datos — Cadena de FK obligatoria

```
client_accounts
    └── entities (owner_entity_id)
            └── accommodations (owner_entity_id + client_account_id)
                    └── rooms (accommodation_id)
                            └── lodger_room_assignments (room_id + accommodation_id)
                                    └── lodgers (client_account_id)
```

### Tabla: `client_accounts`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | Identificador único |
| name | text | Nombre comercial de la cuenta |
| slug | text | Identificador URL |
| plan_code | text | Plan activo (starter / pro / enterprise) |
| billing_cycle | text | monthly / annual |
| status | text | active / suspended / cancelled |
| branding | jsonb | { logo_url, primary_color, company_name } |
| created_at | timestamptz | — |

### Tabla: `entities`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | — |
| client_account_id | uuid FK | → client_accounts.id |
| type | text | **owner** (propietaria) / **payer** (pagadora) |
| legal_name | text | Razón social |
| tax_id | text | NIF/CIF |
| entity_type | text | autonomo / persona_fisica / persona_juridica |
| status | text | active / inactive |

### Tabla: `accommodations`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | — |
| client_account_id | uuid FK | → client_accounts.id |
| **owner_entity_id** | uuid FK | → entities.id (type=owner) ⚠️ OBLIGATORIO |
| name | text | Nombre del alojamiento |
| address_line1 | text | Dirección |
| postal_code | text | — |
| city | text | — |
| province | text | — |
| country | text | Default: España |
| status | text | active / inactive / archived |

### Tabla: `rooms`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | — |
| accommodation_id | uuid FK | → accommodations.id |
| number | text | Número/identificador de habitación |
| monthly_rent | numeric | Precio mensual |
| square_meters | numeric | Superficie |
| bathroom_type | text | shared / private / suite |
| kitchen_type | text | shared / private / suite |
| status | text | free / occupied / pending_checkout / maintenance |
| notes | text | — |

### Tabla: `lodgers`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | — |
| client_account_id | uuid FK | → client_accounts.id |
| full_name | text | — |
| email | text | — |
| phone | text | — |
| document_id | text | DNI/NIE/Pasaporte |
| status | text | invited / active / pending_checkout / inactive |

### Tabla: `lodger_room_assignments`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid PK | — |
| lodger_id | uuid FK | → lodgers.id |
| room_id | uuid FK | → rooms.id |
| accommodation_id | uuid FK | → accommodations.id |
| move_in_date | date | Fecha de entrada |
| move_out_date | date | Fecha de salida (null si activo) |
| billing_start_date | date | Inicio de facturación |
| monthly_rent | numeric | Precio pactado en el momento del alta |
| status | text | active / ended |

---

## Límites por plan (plans_catalog)

| Límite | Starter | Pro | Enterprise |
|---|---|---|---|
| Entidades propietarias | 1 | 3 | ilimitado |
| Alojamientos por entidad | 1 | 5 | ilimitado |
| Habitaciones por alojamiento | 10 | 30 | ilimitado |
| Usuarios admin | 1 | 3 | ilimitado |

> Los límites se leen de `plans_catalog.features` (jsonb) y se aplican en UI y en Edge Functions.

---

## Implicaciones en pantallas

### AccommodationsList (`/v2/admin/alojamientos`)
- Mostrar columna/campo **Entidad Propietaria** en cada card de alojamiento
- Filtro por entidad propietaria (Select con las entities type=owner del tenant)
- Al crear alojamiento, el campo `owner_entity_id` es **obligatorio**

### AccommodationCreate (`/v2/admin/alojamientos/nuevo`)
- Paso 1: selector de **Entidad Propietaria** como primer campo (obligatorio)
- Si no hay entidades owner creadas → mostrar aviso y enlace a crear entidad
- El selector debe cargar solo entities con `type = 'owner'` del tenant

### TenantsList (`/v2/admin/inquilinos`)
- Mostrar columna **Entidad** (a través de accommodation → owner_entity_id)
- Filtro por entidad propietaria

### EntitiesList (`/v2/admin/entidades`)
- Mostrar contador de alojamientos asociados a cada entidad owner
- Acción rápida: "Ver alojamientos" → navega a AccommodationsList filtrado por entidad

### DashboardAdmin
- Resumen jerárquico: N entidades → N alojamientos → N habitaciones → N inquilinos

---

## Implicaciones en BBDD

### Verificaciones pendientes
1. **`accommodations.owner_entity_id`** — columna ya existe, verificar que tiene FK constraint y NOT NULL
2. **RLS en `accommodations`** — debe filtrar por `client_account_id` del usuario autenticado
3. **RLS en `rooms`** — debe filtrar via `accommodation_id → accommodations.client_account_id`
4. **`lodger_room_assignments.accommodation_id`** — redundante pero útil para queries directas, verificar consistencia

### Migraciones pendientes
- Añadir `NOT NULL` constraint a `accommodations.owner_entity_id` si no existe
- Añadir FK `accommodations.owner_entity_id → entities(id)` si no existe
- Verificar índices en `accommodations(client_account_id)`, `accommodations(owner_entity_id)`, `rooms(accommodation_id)`

---

## Storage por entidad propietaria

Estructura de paths en Supabase Storage:

```
smartrent-systems/
└── {client_account_id}/
    └── entities/
        └── {entity_id}/
            └── docs/
                └── {doc_id}        ← Documentos de la entidad (contratos, escrituras, etc.)
```

> El bucket `smartrent-systems` debe tener RLS que valide que el `client_account_id` del path
> coincide con el del usuario autenticado.

---

## Reglas de negocio derivadas de la jerarquía

1. **No se puede crear un alojamiento sin entidad propietaria** — el campo `owner_entity_id` es obligatorio
2. **Al desactivar una entidad propietaria**, sus alojamientos quedan en estado `inactive` automáticamente
3. **Al desactivar un alojamiento**, sus habitaciones no se pueden asignar a nuevos inquilinos
4. **Los límites del plan** se comprueban en cascada: primero entidades, luego alojamientos, luego habitaciones
5. **Un inquilino pertenece a un `client_account_id`**, no a una entidad ni a un alojamiento directamente — la asignación es via `lodger_room_assignments`
6. **El historial de ocupación** se mantiene siempre (nunca se borra `lodger_room_assignments`, solo se cierra con `move_out_date`)

---

## Decisiones de negocio confirmadas

### 1. Ciclo de vida del inquilino (lodger)
- Un inquilino pertenece a un `client_account_id` (no a una entidad ni alojamiento directamente).
- Puede tener **múltiples asignaciones a lo largo del tiempo**: distintas entidades, distintos alojamientos, distintas habitaciones — incluso volver al mismo alojamiento.
- El historial completo se mantiene en `lodger_room_assignments` (nunca se borra, solo se cierra con `move_out_date`).
- **Estados del inquilino**: `invited → active → pending_checkout → inactive` — puede volver a `active` en una nueva asignación.

```
lodger (1) ──< lodger_room_assignments (N)
                 ├── assignment 1: Entidad A / Aloj. 1 / Hab. 01  [ended]
                 ├── assignment 2: Entidad B / Aloj. 3 / Hab. 05  [ended]
                 ├── assignment 3: Entidad A / Aloj. 1 / Hab. 03  [ended]  ← cambio habitación
                 └── assignment 4: Entidad A / Aloj. 1 / Hab. 03  [active] ← activo ahora
```

### 2. Servicios (lavandería, limpieza, etc.)
- Se **definen por Entidad Propietaria** (catálogo de servicios disponibles de esa entidad).
- Se **aplican al Alojamiento** (qué servicios están activos en cada alojamiento).
- Un inquilino contrata/usa servicios del alojamiento donde reside.

```
entities (owner)
  └── services_catalog (servicios definidos por entidad)
        └── accommodation_services (servicios activos en cada alojamiento)
              └── lodger_services (consumo/contratación por inquilino)
```

### 3. Boletines energéticos
- Son **por habitación de cada alojamiento**.
- La factura eléctrica llega por dirección (alojamiento) → se prorratea entre habitaciones según consumo medido online cada día.
- Flujo: `Factura alojamiento → energy_readings diarios por habitación → liquidación → boletín por habitación`.

```
accommodations
  └── energy_bills (facturas del alojamiento)
        └── energy_readings (consumo diario por habitación — medido online)
              └── energy_settlements (liquidación del periodo)
                    └── bulletins (boletín por habitación/inquilino)
```

### 4. Storage — Estructura definitiva

```
smartrent-systems/
└── {client_account_id}/
    ├── entities/
    │   └── {entity_id}/
    │       └── docs/                    ← Documentos de la entidad (escrituras, poderes, etc.)
    │
    └── accommodations/
        └── {accommodation_id}/
            ├── bills/                   ← Facturas de consumo del alojamiento (luz, agua, gas)
            │   └── {bill_id}.pdf
            ├── docs/                    ← Documentos del alojamiento (licencias, seguros, etc.)
            └── rooms/
                └── {room_id}/
                    └── contracts/       ← Contratos de inquilinos por habitación
                        └── {lodger_id}_{date}.pdf
```

> **Regla de acceso (RLS Storage)**: el `client_account_id` del path debe coincidir con el del usuario autenticado.

### 5. Límite de usuarios admin
- El límite es **por cuenta** (`client_account_id`), no por entidad.
- Se define en `plans_catalog.features` al contratar el plan.
- Se verifica en la Edge Function al crear nuevos usuarios admin.

---

## Tablas pendientes de crear/verificar

| Tabla | Estado | Descripción |
|---|---|---|
| `accommodations` | ✅ Existe | owner_entity_id NOT NULL aplicado |
| `rooms` | ✅ Existe | — |
| `lodgers` | ✅ Existe | — |
| `lodger_room_assignments` | ✅ Existe | Historial completo de ocupación |
| `services_catalog` | ⏳ Pendiente | Catálogo de servicios por entidad |
| `accommodation_services` | ⏳ Pendiente | Servicios activos por alojamiento |
| `lodger_services` | ⏳ Pendiente | Consumo/contratación por inquilino |
| `energy_bills` | ⏳ Pendiente | Facturas de consumo por alojamiento |
| `energy_readings` | ⏳ Pendiente | Lecturas diarias por habitación |
| `energy_settlements` | ⏳ Pendiente | Liquidación de periodo |
| `bulletins` | ⏳ Pendiente | Boletín energético por habitación/inquilino |
