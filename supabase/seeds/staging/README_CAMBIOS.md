# Cambios Realizados en Seeds de STAGING

## Fecha: 2026-03-08

## Resumen
Se han corregido todos los archivos de seeds para que coincidan con la estructura real de las tablas de la base de datos. Todos los seeds ahora usan **UUIDs fijos predecibles** para garantizar reproducibilidad.

---

## 📋 Archivos Corregidos

### 1. `01_profiles.sql` ✅
**Estado:** Correcto desde el inicio
- Usa la estructura correcta de la tabla `profiles`
- UUIDs fijos: `00000001-0000-0000-0000-000000000000` a `0000000e-0000-0000-0000-000000000000`
- 14 perfiles creados

### 2. `02_client_accounts.sql` ✅
**Estado:** Correcto desde el inicio
- Usa la estructura correcta de la tabla `client_accounts`
- UUIDs fijos: `10000000-0000-0000-0000-000000000001` a `10000000-0000-0000-0000-000000000008`
- 8 cuentas de cliente creadas

### 3. `03_entities.sql` ✅
**Estado:** Correcto desde el inicio
- Usa la estructura correcta de la tabla `entities`
- UUIDs fijos: `20000000-0000-0000-0000-000000000001` a `20000000-0000-0000-0000-00000000000e`
- 14 entidades creadas

### 4. `04_accommodations.sql` ✅ **CORREGIDO**
**Cambios realizados:**

#### Estructura de INSERT corregida:
**ANTES:**
```sql
INSERT INTO public.accommodations (
  id, client_account_id, owner_entity_id, name, 
  address_line1, city, province, postal_code, status,
  utilities_included, split_electricity, split_water, split_gas,
  split_mode_electricity, split_mode_water, split_mode_gas
)
```

**DESPUÉS:**
```sql
INSERT INTO public.accommodations (
  id, client_account_id, owner_entity_id, name, 
  address, city, province, zip, country, status,
  energy_distribution_type
)
```

#### Valores corregidos:
**ANTES:**
```sql
'Calle Alcalá 100', 'Madrid', 'Madrid', '28009', 'active',
true, true, true, true, 'equal', 'equal', 'equal'
```

**DESPUÉS:**
```sql
'Calle Alcalá 100', 'Madrid', 'Madrid', '28009', 'España', 'active', 'equal'
```

#### ON CONFLICT corregido:
**ANTES:**
```sql
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address_line1 = EXCLUDED.address_line1,
  city = EXCLUDED.city,
  province = EXCLUDED.province,
  postal_code = EXCLUDED.postal_code,
  status = EXCLUDED.status,
  utilities_included = EXCLUDED.utilities_included,
  split_electricity = EXCLUDED.split_electricity,
  split_water = EXCLUDED.split_water,
  split_gas = EXCLUDED.split_gas,
  split_mode_electricity = EXCLUDED.split_mode_electricity,
  split_mode_water = EXCLUDED.split_mode_water,
  split_mode_gas = EXCLUDED.split_mode_gas,
  updated_at = now();
```

**DESPUÉS:**
```sql
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  province = EXCLUDED.province,
  zip = EXCLUDED.zip,
  country = EXCLUDED.country,
  status = EXCLUDED.status,
  energy_distribution_type = EXCLUDED.energy_distribution_type,
  updated_at = now();
```

#### Valores de `energy_distribution_type`:
- `'prorated'` → `'by_consumption'` (valor válido según constraint)
- Valores válidos: `'equal'`, `'by_consumption'`, `'fixed_variable'`

**Resultado:**
- UUIDs fijos: `30000000-0000-0000-0000-000000000001` a `30000000-0000-0000-0000-00000000002a`
- 42 alojamientos creados (39 planificados + 3 extras)

### 5. `05_rooms.sql` ✅
**Estado:** Correcto - aplicado exitosamente
- Usa función SQL `create_rooms_for_accommodation()` que genera habitaciones dinámicamente
- La función ya usa la estructura correcta de la tabla `rooms`
- 210 habitaciones creadas

### 6. `06_lodgers.sql` ✅
**Estado:** Correcto - aplicado exitosamente
- Usa función SQL `create_lodgers_for_accommodation()` que genera inquilinos dinámicamente
- La función ya usa la estructura correcta de la tabla `lodgers`
- 173 inquilinos creados (168 asignados + 5 sin asignar)

---

## 📊 Resumen de Datos Cargados en STAGING

| Tabla | Total | Detalles |
|-------|-------|----------|
| **auth.users** | 14 | Usuarios con UUIDs fijos |
| **profiles** | 14 | Perfiles vinculados a auth.users |
| **client_accounts** | 8 | Cuentas de cliente (Basic, Investor, Business, Agency) |
| **entities** | 14 | Entidades (payer/owner) |
| **accommodations** | 42 | Alojamientos distribuidos por entidad |
| **rooms** | 210 | Habitaciones (4-6 por alojamiento) |
| **lodgers** | 173 | Inquilinos (168 asignados + 5 libres) |
| **rooms ocupadas** | 168 | Habitaciones con inquilino |
| **rooms libres** | 42 | Habitaciones disponibles |

---

## 🔑 Esquema de UUIDs Fijos

### Usuarios (auth.users + profiles)
- Rango: `00000001-0000-0000-0000-000000000000` a `0000000e-0000-0000-0000-000000000000`
- Total: 14 usuarios

### Client Accounts
- Rango: `10000000-0000-0000-0000-000000000001` a `10000000-0000-0000-0000-000000000008`
- Total: 8 cuentas

### Entities
- Rango: `20000000-0000-0000-0000-000000000001` a `20000000-0000-0000-0000-00000000000e`
- Total: 14 entidades

### Accommodations
- Rango: `30000000-0000-0000-0000-000000000001` a `30000000-0000-0000-0000-00000000002a`
- Total: 42 alojamientos

### Rooms y Lodgers
- Generados dinámicamente con `gen_random_uuid()` pero vinculados a UUIDs fijos de accommodations y client_accounts

---

## ✅ Validación

Todos los seeds son **idempotentes** gracias a las cláusulas `ON CONFLICT DO UPDATE SET` o `ON CONFLICT DO NOTHING`.

Puedes re-ejecutar los seeds sin problemas:
```bash
# Aplicar todos los seeds en orden
psql -h <host> -U <user> -d <database> -f supabase/seeds/staging/01_profiles.sql
psql -h <host> -U <user> -d <database> -f supabase/seeds/staging/02_client_accounts.sql
psql -h <host> -U <user> -d <database> -f supabase/seeds/staging/03_entities.sql
psql -h <host> -U <user> -d <database> -f supabase/seeds/staging/04_accommodations.sql
psql -h <host> -U <user> -d <database> -f supabase/seeds/staging/05_rooms.sql
psql -h <host> -U <user> -d <database> -f supabase/seeds/staging/06_lodgers.sql
```

O usando Supabase MCP:
```javascript
mcp0_apply_migration(project_id, name, query)
```

---

## 🎯 Próximos Pasos

1. ✅ **Baseline STAGING completado**
2. ✅ **Seeds corregidos con estructura real**
3. ⏳ **Ejecutar tests E2E para validar baseline**
4. ⏳ **Documentar proceso de deployment**

---

## 📝 Notas Importantes

### Diferencias entre estructura planificada vs real:

**Tabla `accommodations`:**
- ❌ No existe: `address_line1`, `postal_code`, `utilities_included`, `split_*` fields
- ✅ Existe: `address`, `zip`, `country`, `energy_distribution_type`

**Valores válidos para `energy_distribution_type`:**
- ✅ `'equal'` - Reparto equitativo
- ✅ `'by_consumption'` - Por consumo (antes llamado 'prorated')
- ✅ `'fixed_variable'` - Fijo + variable

### Script de creación de usuarios
El script `create-auth-users-staging.js` fue actualizado para incluir UUIDs fijos, pero debido a problemas con variables de entorno, los usuarios se crearon directamente con SQL usando el MCP de Supabase.

---

**Documento generado automáticamente el 2026-03-08**
