# Modelo Estándar de Dirección

Documentación del modelo unificado de dirección utilizado en toda la aplicación SmartRoom Rental.

---

## 📋 Resumen

**Fecha de implementación:** 2026-04-12  
**Versión:** 1.0  
**Estado:** ✅ Implementado en DEV

---

## 🎯 Objetivo

Estandarizar los campos de dirección en todas las tablas de la base de datos y componentes frontend para:
- Mantener consistencia en nomenclatura
- Facilitar mantenimiento y desarrollo
- Permitir reutilización de componentes
- Mejorar validaciones y búsquedas

---

## 📐 Modelo de 7 Campos

Todas las direcciones en el sistema siguen este modelo estándar:

| Campo | Tipo | Descripción | Ejemplo | Requerido |
|-------|------|-------------|---------|-----------|
| `address_street` | TEXT | Calle o vía | "Calle Mayor", "Avda. de la Constitución" | Varía* |
| `address_number` | TEXT | Número de la vía | "12", "12B" | Varía* |
| `address_floor` | TEXT | Piso, puerta, escalera, bloque | "2º A", "Escalera B" | No |
| `address_postal_code` | TEXT | Código postal (5 dígitos) | "28001" | Varía* |
| `address_city` | TEXT | Ciudad o municipio | "Madrid" | Varía* |
| `address_province` | TEXT | Provincia | "Madrid" | Varía* |
| `address_country` | TEXT | País | "España" | Varía* |

\* Los campos requeridos varían según la tabla:
- **entities:** Todos los campos son requeridos excepto `address_floor`
- **accommodations:** Todos los campos son opcionales
- **profiles:** Todos los campos son opcionales

---

## 🗄️ Tablas Afectadas

### 1. `profiles` (Inquilinos)

**Estado:** ✅ Ya usaba el modelo correcto desde baseline

```sql
-- Columnas de dirección en profiles
address_street text,
address_number text,
address_floor text,
address_postal_code text,
address_city text,
address_province text,
address_country text DEFAULT 'España'
```

**Componentes frontend:**
- `src/pages/v2/admin/tenants/components/LodgerFormFields.jsx`
- `src/pages/v2/admin/tenants/TenantCreate.jsx`
- `src/pages/v2/admin/tenants/TenantDetail.jsx`

---

### 2. `entities` (Pagadores/Propietarios)

**Estado:** ✅ Migrado el 2026-04-12

**Antes:**
```sql
country text NOT NULL DEFAULT 'España',
province text NOT NULL,
city text NOT NULL,
zip text NOT NULL,
street text NOT NULL,
street_number text NOT NULL,
address_extra text
```

**Después:**
```sql
address_country text NOT NULL DEFAULT 'España',
address_province text NOT NULL,
address_city text NOT NULL,
address_postal_code text NOT NULL,
address_street text NOT NULL,
address_number text NOT NULL,
address_floor text
```

**Migración:** `20260412000001_standardize_entities_address.sql`

**Componentes frontend:**
- `src/pages/v2/admin/entities/EntityCreate.jsx`
- `src/pages/v2/admin/entities/EntityEdit.jsx`
- `src/pages/v2/admin/entities/EntityDetail.jsx`

**Edge Functions:**
- `supabase/functions/provision_client_account_superadmin/index.ts`
- `supabase/functions/wizard_submit/index.ts`

---

### 3. `accommodations` (Alojamientos)

**Estado:** ✅ Migrado el 2026-04-12

**Antes:**
```sql
address_line1 text,           -- Concatenación: calle + número + piso
address_line2 text,           -- Bloque, escalera
postal_code text,
city text,
province text,
country text DEFAULT 'España',
street_number text,           -- Añadido en migración previa
floor text,                   -- Añadido en migración previa
door text                     -- Añadido en migración previa
```

**Después:**
```sql
address_street text,          -- Nueva columna
address_number text,          -- Renombrado de street_number
address_floor text,           -- Renombrado de floor + migración de door y address_line2
address_postal_code text,     -- Renombrado de postal_code
address_city text,            -- Renombrado de city
address_province text,        -- Renombrado de province
address_country text DEFAULT 'España'  -- Renombrado de country
```

**Migración:** `20260412000002_standardize_accommodations_address.sql`

**Lógica de migración de datos:**
1. `address_line1` → `address_street` (solo si `address_number IS NULL`)
2. `door` → concatenado en `address_floor`
3. `address_line2` → concatenado en `address_floor`
4. Columnas antiguas eliminadas: `address_line1`, `address_line2`, `door`

**Componentes frontend:**
- `src/pages/v2/admin/accommodations/AccommodationCreate.jsx`
- `src/pages/v2/admin/accommodations/AccommodationEdit.jsx`
- `src/pages/v2/admin/accommodations/AccommodationDetail.jsx`
- `src/pages/v2/admin/accommodations/AccommodationsList.jsx`

---

## 🧩 Componente Reutilizable

### `AddressFormFields.jsx`

Componente React reutilizable que genera los 7 campos de dirección con validaciones estándar.

**Ubicación:** `src/components/AddressFormFields.jsx`

**Props:**
```jsx
{
  showDivider: boolean,          // Mostrar divider "Dirección" (default: true)
  dividerText: string,           // Texto del divider (default: "Dirección")
  requiredFields: {              // Configurar campos requeridos
    street: boolean,
    number: boolean,
    postal_code: boolean,
    city: boolean,
    province: boolean,
    country: boolean
  }
}
```

**Uso:**
```jsx
import AddressFormFields from '@/components/AddressFormFields';

// En el formulario
<AddressFormFields 
  requiredFields={{ 
    street: true, 
    number: true, 
    postal_code: true, 
    city: true, 
    province: true, 
    country: true 
  }} 
/>
```

**Validaciones incluidas:**
- `address_street`: min 3, max 200 caracteres
- `address_number`: max 10 caracteres
- `address_floor`: max 50 caracteres
- `address_postal_code`: patrón `/^\d{5}$/` (5 dígitos)
- `address_city`: min 2, max 100 caracteres
- `address_province`: select de provincias españolas
- `address_country`: max 100 caracteres

---

## 🔍 Búsquedas

Las búsquedas por dirección ahora usan `address_street` en lugar de `address_line1`:

**AccommodationsList.jsx:**
```jsx
a.address_street?.toLowerCase().includes(searchTerm)
```

**EntityDetail.jsx:**
```jsx
a.address_street?.toLowerCase().includes(searchTerm)
```

---

## 📊 Visualización

### Formato de visualización estándar

**Dirección completa:**
```javascript
const fullAddress = [
  [address_street, address_number].filter(Boolean).join(" "),
  address_floor,
  address_postal_code,
  address_city
].filter(Boolean).join(", ") || "Sin dirección";
```

**Ejemplo de salida:**
```
"Calle Mayor 12 2º A, 28001, Madrid"
```

---

## 🧪 Testing

### Verificación de migración

```sql
-- Verificar que no quedan columnas antiguas
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name IN ('entities', 'accommodations') 
  AND column_name IN ('street', 'street_number', 'address_extra', 'zip', 
                      'address_line1', 'address_line2', 'postal_code', 'floor', 'door');
-- Debe devolver 0 filas

-- Verificar nuevas columnas de entities
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'entities' 
  AND column_name LIKE 'address_%'
ORDER BY ordinal_position;
-- Debe devolver 7 filas

-- Verificar nuevas columnas de accommodations
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'accommodations' 
  AND column_name LIKE 'address_%'
ORDER BY ordinal_position;
-- Debe devolver 7 filas
```

### Testing funcional

**Checklist:**
- [ ] Crear entidad con dirección completa
- [ ] Editar entidad y modificar dirección
- [ ] Crear alojamiento con dirección completa
- [ ] Editar alojamiento y modificar dirección
- [ ] Buscar alojamientos por dirección
- [ ] Verificar visualización en listas y detalles
- [ ] Ejecutar Edge Functions (provision_client_account_superadmin, wizard_submit)

---

## 📝 Notas de Implementación

### Datos históricos

**Accommodations:**
- Registros con `address_line1` (concatenación) se migraron a `address_street` solo si no tenían datos desglosados
- Registros con datos desglosados (`street_number`, `floor`, `door`) mantienen su información en los campos separados
- Total de registros afectados: 10 de 25 alojamientos tenían `address_line1`

### Breaking Changes

**Edge Functions actualizadas:**
- `provision_client_account_superadmin/index.ts`
- `wizard_submit/index.ts`

Ambas funciones ahora usan los nuevos nombres de columnas al crear entidades.

### Vista Materializada

La vista `lodger_room_assignments_view` ya usaba el modelo correcto:
```sql
a.address_street as accommodation_street,
a.address_city as accommodation_city
```

No requirió cambios.

---

## 🔗 Referencias

- **Migraciones:** 
  - `supabase/migrations/schema/20260412000001_standardize_entities_address.sql`
  - `supabase/migrations/schema/20260412000002_standardize_accommodations_address.sql`
- **Índice de migraciones:** `docs/database/MIGRATION-INDEX.md`
- **Plan de análisis:** `C:\Users\javie\.windsurf\plans\standardize-address-fields-analysis-1fab90.md`
- **Issue:** FEATURE-060

---

## 📈 Estadísticas

- **Tablas migradas:** 2 (entities, accommodations)
- **Columnas renombradas:** 13 (7 en entities + 6 en accommodations)
- **Columnas añadidas:** 1 (address_street en accommodations)
- **Columnas eliminadas:** 3 (address_line1, address_line2, door en accommodations)
- **Componentes React actualizados:** 7
- **Componentes React creados:** 1 (AddressFormFields.jsx)
- **Edge Functions actualizadas:** 2
- **Líneas de código modificadas:** ~500
- **Líneas de código eliminadas:** ~200
- **Líneas de código nuevas:** ~150

---

**Última actualización:** 2026-04-12  
**Autor:** Sistema de migración automática  
**Revisión:** Pendiente
