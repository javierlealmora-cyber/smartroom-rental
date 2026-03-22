# Actualización de Línea Base y Seeds

## Estado Actual (22 Marzo 2026)

### Cambios Recientes en BBDD
- Añadidos campos de inquilino a tabla `profiles`
- Migración: `20260317_add_lodger_fields_to_profiles.sql`
- Edge Function actualizada: `manage_lodger` v4
- Nueva tabla/funcionalidad: `payer_rental` (pagadores)

### Archivos de Línea Base Actuales
- `baseline/01_schema.sql` - Última actualización: incluye 18 tablas base
- `baseline/05_indexes.sql` - Índices actualizados

### Seeds de Development
- `seeds/development/00_cleanup_client_data.sql` - Actualizado
- Todos los seeds numerados del 01 al 07

## Proceso de Actualización Manual

### Opción 1: Con Docker Desktop (Recomendado)
```powershell
# 1. Asegurarse de que Docker Desktop está corriendo
# 2. Generar dump del esquema
npx supabase db dump --db-url "postgresql://postgres.lqwyyyttjamirccdtlvl:Smartroom2024!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" --schema public --file supabase/baseline/01_schema.sql

# 3. Generar dump de datos para seeds
npx supabase db dump --db-url "postgresql://postgres.lqwyyyttjamirccdtlvl:Smartroom2024!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" --data-only --file supabase/seeds/development/08_current_data.sql
```

### Opción 2: Desde Supabase Dashboard (Alternativa)
1. Ir a: https://supabase.com/dashboard/project/lqwyyyttjamirccdtlvl/database/backups
2. Crear backup manual
3. Descargar SQL dump
4. Separar en archivos según estructura:
   - Schema → `baseline/01_schema.sql`
   - Functions → `baseline/02_functions.sql`
   - RLS → `baseline/03_rls_policies.sql`
   - Triggers → `baseline/04_triggers.sql`
   - Indexes → `baseline/05_indexes.sql`
   - Storage → `baseline/06_storage.sql`

### Opción 3: Usando pg_dump directamente
```powershell
# Requiere PostgreSQL client instalado
pg_dump "postgresql://postgres.lqwyyyttjamirccdtlvl:Smartroom2024!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" --schema=public --schema-only > supabase/baseline/01_schema_new.sql
```

## Estado de Migraciones Aplicadas

### Migraciones en Producción
- ✅ `20260317_add_lodger_fields_to_profiles.sql` - Aplicada

### Pendientes de Documentar en Baseline
- Campos de inquilino en `profiles`:
  - `first_name`, `last_name`, `last_name2`
  - `document_type`, `document_id`
  - `gender`, `birth_date`, `nationality`
  - `phone`, `emergency_contact_name`, `emergency_contact_phone`

## Verificación Post-Actualización

### Checklist
- [ ] Verificar que `baseline/01_schema.sql` incluye todos los campos nuevos
- [ ] Verificar que `seeds/development/` tiene datos de prueba actualizados
- [ ] Probar restauración desde baseline en entorno limpio
- [ ] Verificar que migraciones incrementales siguen funcionando

## Notas Importantes

### Por qué necesitamos Docker Desktop
El CLI de Supabase usa contenedores Docker para:
- Ejecutar PostgreSQL localmente
- Generar dumps de esquema
- Aplicar migraciones

### Alternativa sin Docker
Si no se puede usar Docker Desktop, la actualización debe hacerse manualmente:
1. Conectarse a la BBDD remota con un cliente SQL
2. Exportar esquema usando herramientas nativas de PostgreSQL
3. Actualizar archivos de baseline manualmente

## Estado Actual del Commit

### Último commit: `efa2b2a`
- ✅ Código actualizado y subido a GitHub
- ✅ Migraciones incluidas en el commit
- ⚠️ Baseline NO actualizado (requiere Docker Desktop)
- ⚠️ Seeds de development NO regenerados desde producción

## Acción Recomendada

Para completar la actualización de baseline y seeds:

1. **Instalar Docker Desktop** (si no está instalado)
2. **Ejecutar script de actualización:**
   ```powershell
   cd supabase/scripts
   ./update-baseline-and-seeds.ps1
   ```
3. **Commit y push de cambios:**
   ```powershell
   git add supabase/baseline/* supabase/seeds/development/*
   git commit -m "chore: Actualizar baseline y seeds desde BBDD producción"
   git push origin develop
   ```

## Fecha de Última Actualización
22 de Marzo de 2026 - 15:57 UTC+01:00
