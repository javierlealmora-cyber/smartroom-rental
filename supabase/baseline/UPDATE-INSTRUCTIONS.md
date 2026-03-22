# Instrucciones para Actualizar Baseline sin Docker

**Última actualización:** 2026-03-22  
**Versión del baseline:** 2.0  
**Estado:** ✅ Actualizado con esquema real de DEV

---

## 📋 Cambios en Esta Versión

- ✅ Tabla `payer_rental` con campos directos (sin `entity_id`)
- ✅ Campos de inquilino en tabla `profiles`
- ✅ Constraint `onboarding_status` actualizado
- ✅ Seeds actualizados para nueva estructura

Ver detalles completos en `CHANGELOG.md`

---

## Método 1: Desde Supabase Dashboard (Más Simple)

### Paso 1: Acceder al SQL Editor
1. Ir a: https://supabase.com/dashboard/project/lqwyyyttjamirccdtlvl/sql/new
2. Copiar y ejecutar el siguiente script:

```sql
-- Obtener CREATE TABLE de todas las tablas
SELECT 
    'CREATE TABLE public.' || table_name || ' (' || 
    string_agg(
        column_name || ' ' || 
        data_type || 
        CASE WHEN character_maximum_length IS NOT NULL 
            THEN '(' || character_maximum_length || ')' 
            ELSE '' 
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL 
            THEN ' DEFAULT ' || column_default 
            ELSE '' 
        END,
        ', '
    ) || ');' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
```

### Paso 2: Exportar Resultados
1. Ejecutar la consulta
2. Copiar los resultados
3. Pegar en `baseline/01_schema.sql`

### Paso 3: Obtener Constraints y Foreign Keys
```sql
-- Constraints
SELECT 
    'ALTER TABLE ' || tc.table_name || 
    ' ADD CONSTRAINT ' || tc.constraint_name || 
    ' ' || tc.constraint_type || 
    ' (' || kcu.column_name || ');' as constraint_statement
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name;
```

## Método 2: Exportar desde pgAdmin (Si está instalado)

1. Descargar pgAdmin: https://www.pgadmin.org/download/
2. Conectar a la base de datos:
   - Host: `aws-0-eu-central-1.pooler.supabase.com`
   - Port: `6543`
   - Database: `postgres`
   - Username: `postgres.lqwyyyttjamirccdtlvl`
   - Password: `Smartroom2024!`
3. Click derecho en schema `public` → Backup
4. Seleccionar "Plain" format
5. Guardar como `baseline/01_schema_new.sql`

## Método 3: Usar DBeaver (Alternativa gratuita)

1. Descargar DBeaver: https://dbeaver.io/download/
2. Crear nueva conexión PostgreSQL con los datos de arriba
3. Click derecho en database → Tools → Dump database
4. Seleccionar solo schema (sin datos)
5. Guardar en `baseline/01_schema_new.sql`

## Estado Actual de Tablas (22 Marzo 2026)

### Tablas Principales (18 total)
1. `plans_catalog` - Catálogo de planes
2. `client_accounts` - Cuentas de cliente
3. `entities` - Entidades (personas/empresas)
4. `profiles` - **ACTUALIZADA** con campos de inquilino
5. `accommodations` - Alojamientos
6. `rooms` - Habitaciones
7. `lodgers` - Inquilinos
8. `lodger_room_assignments` - Asignaciones habitación-inquilino
9. `payer_rental` - **NUEVA** - Pagadores
10. `services_catalog` - Catálogo de servicios
11. `lodger_services` - Servicios de inquilinos
12. `energy_bills` - Facturas energéticas
13. `bulletins` - Boletines
14. `incidents` - Incidencias
15. `payments` - Pagos
16. `invoices` - Facturas
17. `invoice_items` - Items de factura
18. `audit_logs` - Logs de auditoría

### Cambios Recientes No Reflejados en Baseline

#### Tabla `profiles` - Campos añadidos:
- `first_name` TEXT
- `last_name` TEXT
- `last_name2` TEXT
- `document_type` TEXT
- `document_id` TEXT
- `gender` TEXT
- `birth_date` DATE
- `nationality` TEXT
- `phone` TEXT
- `emergency_contact_name` TEXT
- `emergency_contact_phone` TEXT

#### Tabla `payer_rental` - Nueva tabla completa
```sql
CREATE TABLE public.payer_rental (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_account_id UUID NOT NULL REFERENCES client_accounts(id),
    lodger_id UUID NOT NULL REFERENCES lodgers(id),
    entity_id UUID REFERENCES entities(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Verificación Post-Actualización

Después de actualizar `baseline/01_schema.sql`:

1. Verificar que incluye todas las 18 tablas
2. Verificar campos nuevos en `profiles`
3. Verificar tabla `payer_rental` completa
4. Ejecutar en base de datos limpia para probar
5. Commit y push a GitHub

## Próximos Pasos

1. Elegir uno de los 3 métodos arriba
2. Exportar el esquema completo
3. Reemplazar `baseline/01_schema.sql`
4. Commit: `git commit -m "chore: Actualizar baseline con campos de inquilino y tabla payer_rental"`
5. Push: `git push origin develop`
