# Modelo de Datos - SmartRoom Rental

**Consolidado desde:** `docs/estructura-sistema.md`  
**Última actualización:** 2026-03-28  
**Versión:** 1.0

---

## 🎯 Jerarquía del Sistema

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

## 🔗 Cadena de FK Obligatoria

```
client_accounts
    └── entities (owner_entity_id)
            └── accommodations (owner_entity_id + client_account_id)
                    └── rooms (accommodation_id)
                            └── lodger_room_assignments (room_id + accommodation_id)
                                    └── lodgers (client_account_id)
```

**Regla crítica:** Toda tabla tenant-owned debe tener `client_account_id UUID NOT NULL` con FK a `client_accounts(id)`.

---

## 📊 Tablas Principales

### Core / Tenancy

#### `client_accounts`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| name | text | Nombre comercial de la cuenta |
| slug | text | Identificador URL |
| plan_code | text | Plan activo (starter / pro / enterprise) |
| billing_cycle | text | monthly / annual |
| status | text | active / suspended / cancelled |
| branding | jsonb | { logo_url, primary_color, company_name } |
| created_at | timestamptz | Fecha de creación |

#### `entities`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| client_account_id | uuid FK | → client_accounts.id |
| type | text | **owner** (propietaria) / **payer** (pagadora) |
| legal_name | text | Razón social |
| tax_id | text | NIF/CIF |
| entity_type | text | autonomo / persona_fisica / persona_juridica |
| status | text | active / inactive |

#### `profiles`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | → auth.users.id |
| client_account_id | uuid FK | → client_accounts.id (NULL para superadmin) |
| role | text | superadmin / admin / lodger |
| full_name | text | Nombre completo |
| phone | text | Teléfono |
| onboarding_status | text | pending / active / completed |
| is_primary_admin | boolean | Admin principal de la cuenta |

#### `plans_catalog`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| code | text | starter / pro / enterprise |
| name | text | Nombre del plan |
| price_monthly | numeric | Precio mensual |
| price_annual | numeric | Precio anual |
| features | jsonb | Límites y características |
| status | text | active / inactive |

---

### Operación

#### `accommodations`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| client_account_id | uuid FK | → client_accounts.id |
| **owner_entity_id** | uuid FK | → entities.id (type=owner) ⚠️ OBLIGATORIO |
| name | text | Nombre del alojamiento |
| address_line1 | text | Dirección |
| postal_code | text | Código postal |
| city | text | Ciudad |
| province | text | Provincia |
| country | text | Default: España |
| status | text | active / inactive / archived |

#### `rooms`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| accommodation_id | uuid FK | → accommodations.id |
| number | text | Número/identificador de habitación |
| monthly_rent | numeric | Precio mensual |
| square_meters | numeric | Superficie |
| bathroom_type | text | shared / private / suite |
| kitchen_type | text | shared / private / suite |
| status | text | free / occupied / pending_checkout / maintenance |
| notes | text | Notas adicionales |

#### `lodgers`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| client_account_id | uuid FK | → client_accounts.id |
| full_name | text | Nombre completo |
| email | text | Email |
| phone | text | Teléfono |
| document_id | text | DNI/NIE/Pasaporte |
| status | text | invited / active / pending_checkout / inactive |

#### `lodger_room_assignments`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| lodger_id | uuid FK | → lodgers.id |
| room_id | uuid FK | → rooms.id |
| accommodation_id | uuid FK | → accommodations.id |
| move_in_date | date | Fecha de entrada |
| move_out_date | date | Fecha de salida (null si activo) |
| billing_start_date | date | Inicio de facturación |
| monthly_rent | numeric | Precio pactado en el momento del alta |
| status | text | active / ended |

**Regla:** Nunca se borra, solo se cierra con `move_out_date`. Historial completo de ocupación.

---

### Servicios

#### `services_catalog`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| entity_id | uuid FK | → entities.id (type=owner) |
| name | text | Nombre del servicio |
| description | text | Descripción |
| base_price | numeric | Precio base |
| billing_type | text | one_time / monthly / per_use |
| status | text | active / inactive |

#### `accommodation_services`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| accommodation_id | uuid FK | → accommodations.id |
| service_id | uuid FK | → services_catalog.id |
| custom_price | numeric | Precio personalizado (opcional) |
| status | text | active / inactive |

#### `lodger_services`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| lodger_id | uuid FK | → lodgers.id |
| service_id | uuid FK | → services_catalog.id |
| contracted_at | timestamptz | Fecha de contratación |
| quantity | numeric | Cantidad (para per_use) |
| status | text | active / cancelled |

---

### Energía y Boletines

#### `energy_bills`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| accommodation_id | uuid FK | → accommodations.id |
| company | text | Compañía eléctrica |
| bill_number | text | Número de factura |
| issue_date | date | Fecha de emisión |
| period_start | date | Inicio del periodo |
| period_end | date | Fin del periodo |
| total_consumption | numeric | Consumo total (kWh) |
| total_amount | numeric | Importe total |
| file_path | text | Path en Storage |
| status | text | draft / published |

#### `energy_readings`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| room_id | uuid FK | → rooms.id |
| reading_date | date | Fecha de lectura |
| consumption_kwh | numeric | Consumo en kWh |
| source | text | manual / automatic |

#### `consumptions`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| lodger_id | uuid FK | → lodgers.id |
| room_id | uuid FK | → rooms.id |
| consumption_type | text | electricity / water / gas |
| reading_date | date | Fecha de lectura |
| value | numeric | Valor del consumo |
| unit | text | kWh / m³ / etc |

#### `energy_settlements`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| energy_bill_id | uuid FK | → energy_bills.id |
| room_id | uuid FK | → rooms.id |
| lodger_id | uuid FK | → lodgers.id |
| fixed_cost | numeric | Coste fijo |
| variable_cost | numeric | Coste variable |
| total_cost | numeric | Coste total |
| consumption_assigned | numeric | Consumo asignado (kWh) |

#### `bulletins`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | uuid PK | Identificador único |
| room_id | uuid FK | → rooms.id |
| lodger_id | uuid FK | → lodgers.id |
| energy_bill_id | uuid FK | → energy_bills.id |
| period_start | date | Inicio del periodo |
| period_end | date | Fin del periodo |
| total_cost | numeric | Coste total |
| status | text | draft / published / acknowledged |

---

## 📏 Límites por Plan

| Límite | Starter | Pro | Enterprise |
|--------|---------|-----|------------|
| Entidades propietarias | 1 | 3 | ilimitado |
| Alojamientos por entidad | 1 | 5 | ilimitado |
| Habitaciones por alojamiento | 10 | 30 | ilimitado |
| Usuarios admin | 1 | 3 | ilimitado |

**Fuente:** `plans_catalog.features` (jsonb)

**Validación:** Edge Functions validan límites en cada operación de creación.

---

## 🎯 Reglas de Negocio

### 1. Ciclo de Vida del Inquilino

Un inquilino pertenece a un `client_account_id` (no a una entidad ni alojamiento directamente).

**Puede tener múltiples asignaciones:**
- Distintas entidades
- Distintos alojamientos
- Distintas habitaciones
- Incluso volver al mismo alojamiento

**Historial completo en `lodger_room_assignments`:**
```
lodger (1) ──< lodger_room_assignments (N)
                 ├── assignment 1: Entidad A / Aloj. 1 / Hab. 01  [ended]
                 ├── assignment 2: Entidad B / Aloj. 3 / Hab. 05  [ended]
                 ├── assignment 3: Entidad A / Aloj. 1 / Hab. 03  [ended]
                 └── assignment 4: Entidad A / Aloj. 1 / Hab. 03  [active]
```

**Estados:** `invited → active → pending_checkout → inactive` (puede volver a `active`)

---

### 2. Servicios

**Definición:** Por Entidad Propietaria (catálogo de servicios)  
**Aplicación:** Al Alojamiento (servicios activos)  
**Contratación:** Por Inquilino (consumo/uso)

```
entities (owner)
  └── services_catalog (servicios definidos por entidad)
        └── accommodation_services (servicios activos en alojamiento)
              └── lodger_services (consumo/contratación por inquilino)
```

---

### 3. Boletines Energéticos

**Por habitación de cada alojamiento.**

**Flujo:**
```
Factura alojamiento (energy_bills)
  → Lecturas diarias por habitación (energy_readings)
  → Liquidación del periodo (energy_settlements)
  → Boletín por habitación/inquilino (bulletins)
```

**Prorrateo:**
- Factura eléctrica llega por dirección (alojamiento)
- Se prorratea entre habitaciones según consumo medido online cada día
- Coste fijo + coste variable

---

### 4. Jerarquía de Datos Completa

```
client_accounts
  ├── entities (type=payer)          ← Entidad pagadora de la cuenta
  └── entities (type=owner)          ← Entidades propietarias
        └── accommodations            ← owner_entity_id NOT NULL
              ├── energy_bills        ← Facturas del alojamiento
              │     ├── energy_readings (por room)
              │     ├── energy_settlements (por room + lodger)
              │     └── bulletins (por room + lodger)
              ├── accommodation_services ← Servicios activos
              └── rooms
                    └── lodger_room_assignments
                          └── lodgers (client_account_id)
                                └── lodger_services
```

---

## 🔒 Reglas de Integridad

### 1. No se puede crear alojamiento sin entidad propietaria
**Campo obligatorio:** `accommodations.owner_entity_id NOT NULL`

### 2. Al desactivar entidad propietaria
**Efecto:** Sus alojamientos quedan en estado `inactive` automáticamente

### 3. Al desactivar alojamiento
**Efecto:** Sus habitaciones no se pueden asignar a nuevos inquilinos

### 4. Límites del plan
**Validación:** En cascada (primero entidades, luego alojamientos, luego habitaciones)

### 5. Inquilino pertenece a client_account_id
**No directamente a:** Entidad ni alojamiento (asignación via `lodger_room_assignments`)

### 6. Historial de ocupación
**Nunca se borra:** Solo se cierra con `move_out_date`

---

## 🎯 Decisiones de Negocio Confirmadas

### Storage - Estructura Definitiva

```
smartrent-systems/
└── {client_account_id}/
    ├── entities/
    │   └── {entity_id}/
    │       └── docs/                    ← Documentos de la entidad
    │
    └── accommodations/
        └── {accommodation_id}/
            ├── bills/                   ← Facturas de consumo
            │   └── {bill_id}.pdf
            ├── docs/                    ← Documentos del alojamiento
            └── rooms/
                └── {room_id}/
                    └── contracts/       ← Contratos de inquilinos
                        └── {lodger_id}_{date}.pdf
```

**Regla de acceso (RLS Storage):** El `client_account_id` del path debe coincidir con el del usuario autenticado.

---

### Límite de Usuarios Admin

**Por cuenta:** `client_account_id`, no por entidad  
**Definido en:** `plans_catalog.features`  
**Verificado en:** Edge Function al crear nuevos usuarios admin

---

## 📋 Estado de Tablas

| Tabla | Estado | Descripción |
|-------|--------|-------------|
| `client_accounts` | ✅ Existe | Core tenant |
| `entities` | ✅ Existe | Propietarias y pagadoras |
| `profiles` | ✅ Existe | Perfiles de usuario |
| `plans_catalog` | ✅ Existe | Catálogo de planes |
| `accommodations` | ✅ Existe | owner_entity_id NOT NULL |
| `rooms` | ✅ Existe | Habitaciones |
| `lodgers` | ✅ Existe | Inquilinos |
| `lodger_room_assignments` | ✅ Existe | Historial de ocupación |
| `services_catalog` | ✅ Existe | Catálogo de servicios |
| `accommodation_services` | ✅ Existe | Servicios por alojamiento |
| `lodger_services` | ✅ Existe | Servicios por inquilino |
| `energy_bills` | ✅ Existe | Facturas de energía |
| `energy_readings` | ✅ Existe | Lecturas diarias |
| `energy_settlements` | ✅ Existe | Liquidaciones |
| `bulletins` | ✅ Existe | Boletines energéticos |
| `consumptions` | ✅ Existe | Consumos por inquilino |

---

## 🔗 Referencias

- **Migraciones:** `docs/database/MIGRATION-INDEX.md`
- **RLS:** `docs/architecture/security.md`
- **Storage:** `docs/architecture/storage.md`
- **Arquitectura:** `docs/architecture/overview.md`

---

**Consolidado desde:** `docs/estructura-sistema.md`  
**Última actualización:** 2026-03-28  
**Versión:** 1.0
