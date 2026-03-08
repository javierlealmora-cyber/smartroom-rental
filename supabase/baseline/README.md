# Baseline Cero - SmartRoom Rental

## 🎯 Propósito

Este es el **punto cero** de la base de datos de SmartRoom Rental. No contiene historia ni migraciones previas. Es el estado actual y completo de la estructura de base de datos.

## 📁 Archivos Baseline

Ejecutar en este orden exacto:

1. **`00_extensions.sql`** - Extensiones PostgreSQL necesarias
2. **`01_schema.sql`** - 18 tablas completas
3. **`02_functions.sql`** - 3 funciones helper
4. **`03_rls_policies.sql`** - Políticas de seguridad (67 políticas)
5. **`04_triggers.sql`** - Triggers updated_at (15 triggers)
6. **`05_indexes.sql`** - Índices optimizados
7. **`06_storage.sql`** - Buckets de storage y políticas

## 🗄️ Estructura de Base de Datos

### 18 Tablas

**Core:**
1. `plans_catalog` - Planes de suscripción
2. `client_accounts` - Cuentas de cliente (multi-tenant)
3. `profiles` - Perfiles de usuario
4. `entities` - Entidades fiscales (payer/owner)

**Gestión de Alojamientos:**
5. `accommodations` - Alojamientos
6. `rooms` - Habitaciones
7. `lodgers` - Inquilinos
8. `lodger_room_assignments` - Historial de asignaciones

**Servicios:**
9. `services_catalog` - Catálogo de servicios
10. `accommodation_services` - Servicios por alojamiento
11. `lodger_services` - Servicios consumidos

**Energía:**
12. `energy_bills` - Facturas de energía
13. `energy_readings` - Lecturas de contadores
14. `energy_settlements` - Liquidaciones de energía
15. `bulletins` - Boletines para inquilinos

**Sistema:**
16. `audit_log` - Registro de auditoría
17. `incidents` - Sistema de incidencias
18. `stripe_events` - Webhooks de Stripe

### 2 Vistas

- `payer_entities_view` - Vista de entidades pagadoras
- `owner_entities_view` - Vista de entidades propietarias

## 🚀 Deployment

### Nuevo Ambiente (desde cero)

```bash
# Opción 1: Script automático
./supabase/scripts/deploy-baseline-staging.sh

# Opción 2: Manual vía Supabase CLI
supabase db reset
# Luego ejecutar cada script en orden
```

### Deployment vía MCP (Supabase)

```javascript
// Ejecutar cada script en orden usando mcp0_apply_migration
// Ver ejemplos en la documentación de deployment
```

## 📊 Datos Estáticos

Después de aplicar el baseline, insertar datos estáticos:

```bash
# Plans catalog (obligatorio)
psql < supabase/static-data/staging/01_plans_catalog.sql
```

## 🔒 Seguridad

- **RLS habilitado** en todas las tablas
- **67 políticas RLS** configuradas
- **Patrón de seguridad:**
  - `superadmin`: acceso total
  - `admin`/`agent`: acceso limitado a su `client_account_id`
  - `lodger`: sin acceso a tablas administrativas

## 🔄 Migraciones Futuras

A partir de este baseline, todas las migraciones deben:

1. Ser **incrementales** sobre este baseline
2. Usar formato: `YYYYMMDDHHMMSS_descripcion.sql`
3. Ser **idempotentes** (usar `IF NOT EXISTS`, `IF EXISTS`)
4. Documentarse claramente

## ⚠️ Importante

- **NO hay historia previa** - este es el punto de partida
- **NO hay migraciones legacy** - todo comienza aquí
- Las migraciones futuras se crearán en `supabase/migrations/`
- Este baseline es **inmutable** - no modificar estos archivos

## 📝 Notas

- Todos los scripts son idempotentes (pueden ejecutarse múltiples veces)
- El orden de ejecución es crítico (respeta las dependencias)
- Sincronizado con DEV y STAGING
