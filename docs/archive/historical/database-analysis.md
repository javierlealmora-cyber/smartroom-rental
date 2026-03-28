# 📊 Análisis del Esquema de Base de Datos - SmartRent Systems (DEV)

**Fecha:** 2026-01-22
**Entorno:** Desarrollo
**Proyecto Supabase:** Smart Rent Systems DataBase Dev

---

## ✅ TABLAS EXISTENTES

### 1. `companies` (3 registros)

**Columnas actuales:**
```
id                   uuid                 PRIMARY KEY
name                 text/varchar
plan                 text/varchar         (basic | investor | enterprise)
status               text/varchar         (active | inactive)
created_at           timestamp
slug                 text/varchar
start_date           date
theme_primary_color  text (color hex)     #111827
logo_url             text/varchar
```

**Datos de ejemplo:**
- SmartRent Software (plan: investor, status: inactive)
- Nueva empresa (plan: enterprise, status: active)
- otra empresa (plan: basic, status: active)

**Estado:** ✅ **Bien implementada**

**Pendientes:**
- Agregar `updated_at` timestamp
- Considerar agregar `deleted_at` para soft deletes
- Validar constraints de plan y status
- Agregar información de contacto (email, dirección)

---

### 2. `profiles` (2 registros)

**Columnas actuales:**
```
id          uuid                 PRIMARY KEY (FK a auth.users)
role        text/varchar         (superadmin | admin)
company_id  uuid                 NULL (FK a companies)
phone       text                 NULL
created_at  timestamp
full_name   text                 NULL
email       text                 NULL
```

**Datos de ejemplo:**
- Perfil 1: role=superadmin, company_id=null (sin datos personales)
- Perfil 2: role=admin, company_id=54dcd6e1..., full_name="Eva María", email="evamariagozalodiaz@gmail.com"

**Estado:** ⚠️ **Parcialmente implementada**

**Problemas:**
- Faltan campos necesarios: `updated_at`, `avatar_url`
- El email debería venir de `auth.users` (no duplicar)
- Falta rol `student` / `tenant`
- No hay validación de rol según company_id

**Recomendaciones:**
- Sincronizar email desde auth.users automáticamente
- Agregar trigger para mantener email actualizado
- Agregar constraint: superadmin debe tener company_id NULL
- Agregar constraint: admin/tenant deben tener company_id NOT NULL

---

## ❌ TABLAS FALTANTES (según CLAUDE.md)

### 3. `apartments` / `alojamientos`

**Estado:** ❌ **NO EXISTE** (error en schema cache)

**Campos requeridos (según CLAUDE.md):**
```sql
id                   uuid                 PRIMARY KEY
company_id           uuid                 NOT NULL (FK companies)
name                 text                 NOT NULL
total_rooms          integer
status               text                 (active | inactive)
address              text
city                 text
postal_code          text
country              text
deactivated_at       timestamp            NULL
created_at           timestamp            DEFAULT now()
updated_at           timestamp            DEFAULT now()
```

---

### 4. `rooms` / `habitaciones`

**Estado:** ❌ **NO EXISTE**

**Campos requeridos:**
```sql
id                   uuid                 PRIMARY KEY
apartment_id         uuid                 NOT NULL (FK apartments)
room_number          text                 NOT NULL
rent_price           numeric(10,2)        NOT NULL
electricity_cost     numeric(10,2)
square_meters        numeric(6,2)
bathroom_type        text                 (suite | private | shared)
kitchen_type         text                 (suite | private | shared)
lock_identifier      text
notes                text
created_at           timestamp            DEFAULT now()
updated_at           timestamp            DEFAULT now()
```

---

### 5. `tenants` / `inquilinos`

**Estado:** ❌ **NO EXISTE**

**Campos requeridos:**
```sql
id                   uuid                 PRIMARY KEY
profile_id           uuid                 NULL (FK profiles) - se crea después de invitación
first_name           text                 NOT NULL
last_name_1          text                 NOT NULL
last_name_2          text
email                text                 NOT NULL UNIQUE
phone                text
apartment_id         uuid                 NULL (FK apartments)
room_id              uuid                 NULL (FK rooms)
entry_date           date                 NOT NULL
exit_date            date                 NULL
status               text                 (active | pending_exit | inactive)
created_at           timestamp            DEFAULT now()
updated_at           timestamp            DEFAULT now()
```

**Nota importante:** El inquilino se da de alta ANTES de tener cuenta de usuario. El admin crea el tenant, asigna habitación, y luego invita por email. Al aceptar la invitación, se crea el profile_id.

---

### 6. `occupancy` / `ocupacion`

**Estado:** ❌ **NO EXISTE**

**Campos requeridos:**
```sql
id                   uuid                 PRIMARY KEY
apartment_id         uuid                 NOT NULL (FK apartments)
room_id              uuid                 NOT NULL (FK rooms)
tenant_id            uuid                 NOT NULL (FK tenants)
start_date           date                 NOT NULL
end_date             date                 NULL
created_at           timestamp            DEFAULT now()
```

**Propósito:** Histórico de ocupación por fechas (quién ocupó qué habitación y cuándo).

---

### 7. `daily_consumption_estimates` / `registros_consumo`

**Estado:** ❌ **NO EXISTE**

**Campos requeridos:**
```sql
id                   uuid                 PRIMARY KEY
date                 date                 NOT NULL
tenant_id            uuid                 NOT NULL (FK tenants)
estimated_kwh        numeric(10,3)        NOT NULL
created_at           timestamp            DEFAULT now()
updated_at           timestamp            DEFAULT now()

UNIQUE(date, tenant_id)
```

---

### 8. `invoices` / `facturas_electricas`

**Estado:** ❌ **NO EXISTE**

**Campos requeridos:**
```sql
id                   uuid                 PRIMARY KEY
apartment_id         uuid                 NOT NULL (FK apartments)
company_name         text                 NOT NULL
invoice_number       text                 NOT NULL
reference            text
issue_date           date                 NOT NULL
period_start         date                 NOT NULL
period_end           date                 NOT NULL
total_kwh            numeric(10,3)        NOT NULL
energy_cost          numeric(10,2)
power_cost           numeric(10,2)
meter_rental         numeric(10,2)
discounts            numeric(10,2)
other_costs          numeric(10,2)
taxes                numeric(10,2)
total_amount         numeric(10,2)        NOT NULL
file_url             text                 NULL (Storage reference)
scan_result          jsonb                NULL (datos del escaneo automático)
created_at           timestamp            DEFAULT now()
updated_at           timestamp            DEFAULT now()
```

---

### 9. `daily_charges` / `datos_diarios_facturables`

**Estado:** ❌ **NO EXISTE**

**Campos requeridos:**
```sql
id                   uuid                 PRIMARY KEY
invoice_id           uuid                 NOT NULL (FK invoices)
date                 date                 NOT NULL
tenant_id            uuid                 NOT NULL (FK tenants)
assigned_kwh         numeric(10,3)        NOT NULL
variable_cost        numeric(10,2)        NOT NULL
fixed_cost           numeric(10,2)        NOT NULL
created_at           timestamp            DEFAULT now()

UNIQUE(invoice_id, date, tenant_id)
```

**Propósito:** Resultado de la liquidación/reparto por día y persona.

---

### 10. `bulletins` / `boletines_energeticos`

**Estado:** ❌ **NO EXISTE**

**Campos requeridos:**
```sql
id                   uuid                 PRIMARY KEY
tenant_id            uuid                 NOT NULL (FK tenants)
invoice_id           uuid                 NULL (FK invoices) - referencia opcional
period_start         date                 NOT NULL
period_end           date                 NOT NULL
total_kwh            numeric(10,3)        NOT NULL
total_cost           numeric(10,2)        NOT NULL
fixed_cost           numeric(10,2)
variable_cost        numeric(10,2)
details_json         jsonb                NULL (desglose día a día)
generated_at         timestamp            DEFAULT now()
```

---

### 11. `energy_piggy_bank` / `hucha_energetica`

**Estado:** ❌ **NO EXISTE**

**Campos requeridos:**
```sql
id                   uuid                 PRIMARY KEY
tenant_id            uuid                 NOT NULL (FK tenants)
movement_date        date                 NOT NULL
concept              text                 NOT NULL
amount               numeric(10,2)        NOT NULL (+ ingreso, - cargo)
balance_after        numeric(10,2)        NOT NULL
created_at           timestamp            DEFAULT now()
```

---

### 12. `surveys` / `encuestas`

**Estado:** ❌ **NO EXISTE**

**Campos requeridos:**
```sql
id                   uuid                 PRIMARY KEY
company_id           uuid                 NOT NULL (FK companies)
title                text                 NOT NULL
description          text
questions_json       jsonb                NOT NULL
active               boolean              DEFAULT true
created_at           timestamp            DEFAULT now()
```

---

### 13. `survey_responses` / `respuestas_encuestas`

**Estado:** ❌ **NO EXISTE**

**Campos requeridos:**
```sql
id                   uuid                 PRIMARY KEY
survey_id            uuid                 NOT NULL (FK surveys)
tenant_id            uuid                 NOT NULL (FK tenants)
responses_json       jsonb                NOT NULL
submitted_at         timestamp            DEFAULT now()
```

---

### 14. `services` / `servicios`

**Estado:** ❌ **NO EXISTE**

**Campos requeridos:**
```sql
id                   uuid                 PRIMARY KEY
company_id           uuid                 NOT NULL (FK companies)
title                text                 NOT NULL
description          text
icon                 text                 NULL
active               boolean              DEFAULT true
created_at           timestamp            DEFAULT now()
updated_at           timestamp            DEFAULT now()
```

---

### 15. `incident_tickets` / `tickets_incidencias`

**Estado:** ❌ **NO EXISTE**

**Campos requeridos:**
```sql
id                   uuid                 PRIMARY KEY
tenant_id            uuid                 NOT NULL (FK tenants)
room_id              uuid                 NULL (FK rooms)
title                text                 NOT NULL
description          text                 NOT NULL
status               text                 (open | in_progress | resolved | closed)
priority             text                 (low | medium | high)
created_at           timestamp            DEFAULT now()
updated_at           timestamp            DEFAULT now()
resolved_at          timestamp            NULL
```

---

### 16. `system_settings` / `parametros_sistema`

**Estado:** ❌ **NO EXISTE**

**Campos requeridos:**
```sql
id                   uuid                 PRIMARY KEY
company_id           uuid                 NULL (NULL = global, UUID = por empresa)
key                  text                 NOT NULL
value                text                 NOT NULL
description          text
updated_at           timestamp            DEFAULT now()

UNIQUE(company_id, key)
```

---

## 🔒 ANÁLISIS RLS (Row Level Security)

**Estado:** ⚠️ **PROBLEMA CRÍTICO**

**Error detectado:** `stack depth limit exceeded`

**Diagnóstico:**
- Las políticas RLS en `companies` y `profiles` tienen recursión infinita
- Posiblemente hay políticas mal configuradas que se llaman a sí mismas
- Esto impedirá el acceso con `anon` key desde el frontend

**Acción requerida:**
1. Revisar políticas RLS actuales con query SQL directa
2. Eliminar políticas con recursión
3. Rediseñar políticas RLS correctamente según el modelo multi-tenant
4. Aplicar RLS a todas las tablas nuevas

---

## 📋 RESUMEN ESTADO ACTUAL

| Categoría | Total | Implementadas | Faltantes | % Completado |
|-----------|-------|---------------|-----------|--------------|
| **Tablas core** | 16 | 2 | 14 | 12.5% |
| **Columnas core** | ~150 | ~17 | ~133 | 11.3% |
| **Políticas RLS** | 16 | 2* | 14 | 12.5% |
| **Edge Functions** | 3 | 3 | 0 | 100% |

**(*) Con errores de recursión**

---

## 🎯 PRÓXIMOS PASOS RECOMENDADOS

### Prioridad 1: CRÍTICO
1. **Arreglar RLS** en `companies` y `profiles` (bloqueo actual)
2. **Crear migración completa** con todas las tablas faltantes
3. **Configurar RLS** correctamente en todas las tablas

### Prioridad 2: ALTA
4. **Completar tabla `profiles`** con campos faltantes
5. **Crear tablas operativas**: `apartments`, `rooms`, `tenants`, `occupancy`
6. **Implementar triggers** para mantener datos sincronizados

### Prioridad 3: MEDIA
7. **Crear tablas de energía**: `daily_consumption_estimates`, `invoices`, `daily_charges`, `bulletins`, `energy_piggy_bank`
8. **Crear tablas de servicios**: `services`, `incident_tickets`, `surveys`, `survey_responses`
9. **Crear tabla de configuración**: `system_settings`

### Prioridad 4: BAJA
10. **Optimizar indices** según queries frecuentes
11. **Agregar constraints** de validación de negocio
12. **Documentar esquema** con comentarios SQL

---

## 🔧 DECISIONES TÉCNICAS PENDIENTES

1. **¿Usar ENUM types o CHECK constraints?**
   - Para: status, plan, role, bathroom_type, etc.
   - Recomendación: CHECK constraints (más flexible para cambios)

2. **¿Soft deletes o hard deletes?**
   - Recomendación: Soft deletes con `deleted_at` para trazabilidad

3. **¿Triggers automáticos para `updated_at`?**
   - Recomendación: Sí, crear función reutilizable

4. **¿Particionamiento de tablas grandes?**
   - `daily_charges` y `daily_consumption_estimates` pueden crecer mucho
   - Recomendación: Evaluar después de 100k registros

---

**Generado automáticamente por:** Scripts de análisis
**Revisado por:** Claude Sonnet 4.5
