# Changelog - Baseline Schema

## Versión 2.0 - 2026-03-22

### 🎯 Resumen
Actualización completa del baseline para reflejar el esquema real de la base de datos DEV, incluyendo campos de inquilino en `profiles` y nueva tabla `payer_rental` con estructura simplificada.

---

### ✨ Nuevas Tablas

#### `payer_rental` (TABLA 11)
Nueva tabla para gestionar pagadores de inquilinos con datos directos (sin usar tabla `entities`).

**Campos:**
- `id` - UUID primary key
- `client_account_id` - Referencia a client_accounts
- `lodger_id` - Referencia a profiles (inquilino)
- `payer_type` - Tipo: 'individual' o 'company'
- `first_name`, `last_name1`, `last_name2` - Datos de persona física
- `legal_name` - Razón social de empresa
- `notes` - Observaciones (ej: "Padre del inquilino")
- `is_active` - Estado del pagador
- `created_at`, `updated_at` - Auditoría

**Decisión de diseño:**
- Se optó por campos directos en lugar de usar `entity_id`
- Simplifica la gestión y consultas
- Evita complejidad innecesaria para este caso de uso

---

### 🔄 Tablas Modificadas

#### `profiles` (TABLA 3)

**Campos añadidos para inquilinos:**
- `first_name` - Nombre del inquilino
- `last_name1` - Primer apellido
- `last_name2` - Segundo apellido (opcional)
- `nickname` - Apodo o nombre preferido
- `document_type` - Tipo: 'dni', 'nie', 'passport', 'other'
- `document_id` - Número de documento
- `gender` - Género: 'male', 'female', 'other'
- `birth_date` - Fecha de nacimiento
- `nationality` - Nacionalidad
- `phone` - Teléfono de contacto
- `emergency_contact_name` - Nombre de contacto de emergencia
- `emergency_contact_phone` - Teléfono de emergencia

**Constraint actualizado:**
- `onboarding_status` ahora incluye:
  - Estados originales: 'none', 'in_progress', 'payment_pending', 'active'
  - Estados nuevos: 'invited', 'pending_checkout', 'inactive'
  - Refleja el ciclo de vida completo del inquilino

---

### 📋 Migraciones Aplicadas

1. **20260317_add_lodger_fields_to_profiles.sql**
   - Añade campos de inquilino a `profiles`
   - Actualiza constraint de `onboarding_status`
   - Migración ya aplicada en DEV

---

### 🌱 Seeds Actualizados

#### `08_payer_rental.sql`
- Actualizado para usar estructura con campos directos
- Ejemplos de pagadores:
  - Persona física (padre/madre del inquilino)
  - Empresa (empleadora)
- Datos idempotentes y coherentes

---

### ⚠️ Breaking Changes

#### Tabla `payer_rental`
**Antes (baseline anterior):**
```sql
CREATE TABLE public.payer_rental (
  id uuid,
  client_account_id uuid,
  lodger_id uuid,
  entity_id uuid,  -- ❌ Ya no se usa
  is_active boolean,
  UNIQUE (lodger_id, entity_id)
);
```

**Ahora (baseline actual):**
```sql
CREATE TABLE public.payer_rental (
  id uuid,
  client_account_id uuid,
  lodger_id uuid,
  payer_type text,  -- ✅ Nuevo
  first_name text,  -- ✅ Nuevo
  last_name1 text,  -- ✅ Nuevo
  last_name2 text,  -- ✅ Nuevo
  legal_name text,  -- ✅ Nuevo
  notes text,       -- ✅ Nuevo
  is_active boolean
);
```

**Impacto:**
- Si existe tabla `payer_rental` con estructura antigua, requiere migración
- Datos en `entity_id` deben migrarse a campos directos
- Constraint UNIQUE eliminado (ahora se permiten múltiples pagadores por inquilino)

---

### 📊 Estadísticas

- **Tablas totales:** 19
- **Tablas nuevas:** 1 (payer_rental)
- **Tablas modificadas:** 1 (profiles)
- **Campos nuevos en profiles:** 12
- **Migraciones aplicadas:** 1

---

### 🔍 Validación

Para validar que el baseline está correctamente aplicado:

```sql
-- Verificar campos de inquilino en profiles
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('first_name', 'last_name1', 'nickname', 'phone');

-- Verificar estructura de payer_rental
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payer_rental' 
ORDER BY ordinal_position;

-- Verificar constraint de onboarding_status
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass 
  AND conname LIKE '%onboarding%';
```

---

### 📝 Notas de Migración

#### Para aplicar en staging:

1. **Opción A: Baseline completo (recomendado para staging limpio)**
   ```bash
   psql -f supabase/baseline/01_schema.sql
   psql -f supabase/seeds/development/run-all-seeds.ps1
   ```

2. **Opción B: Migración incremental (si hay datos en staging)**
   - Aplicar migración `20260317_add_lodger_fields_to_profiles.sql`
   - Crear tabla `payer_rental` con nueva estructura
   - Migrar datos de `entity_id` a campos directos (si existen)

#### Rollback:
- Backup completo antes de aplicar
- Script de rollback disponible en `supabase/rollback/`

---

### 🚀 Próximos Pasos

1. ✅ Baseline actualizado y documentado
2. ✅ Seeds actualizados
3. ⏳ Validar en staging
4. ⏳ Ejecutar tests E2E
5. ⏳ Preparar para producción

---

### 👥 Contribuidores

- Actualización de baseline: 2026-03-22
- Migración de campos de inquilino: 2026-03-17
- Implementación de pagadores: 2026-03-22
