#!/bin/bash
# ============================================================================
# SCRIPT: Deploy Database Baseline to STAGING
# Fecha: 2026-03-08
# Descripción: Despliega la línea base completa de la base de datos a STAGING
# ============================================================================

set -e  # Exit on error

echo "🚀 Deploying Database Baseline to STAGING"
echo "=========================================="
echo ""

# ============================================================================
# Verificar variables de entorno
# ============================================================================
if [ -z "$STAGING_DATABASE_URL" ]; then
  echo "❌ Error: STAGING_DATABASE_URL no está configurada"
  echo "   Ejemplo: postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
  exit 1
fi

if [ -z "$STAGING_PROJECT_REF" ]; then
  echo "❌ Error: STAGING_PROJECT_REF no está configurada"
  echo "   Ejemplo: abcdefghijklmnop"
  exit 1
fi

if [ -z "$STAGING_SUPABASE_URL" ]; then
  echo "❌ Error: STAGING_SUPABASE_URL no está configurada"
  echo "   Ejemplo: https://[project-ref].supabase.co"
  exit 1
fi

if [ -z "$STAGING_SUPABASE_SERVICE_KEY" ]; then
  echo "❌ Error: STAGING_SUPABASE_SERVICE_KEY no está configurada"
  exit 1
fi

echo "✅ Variables de entorno verificadas"
echo ""

# ============================================================================
# PASO 1: Extensiones
# ============================================================================
echo "📦 1/10 - Aplicando extensiones..."
psql "$STAGING_DATABASE_URL" -f supabase/baseline/00_extensions.sql
echo "✅ Extensiones aplicadas"
echo ""

# ============================================================================
# PASO 2: Schema
# ============================================================================
echo "📝 2/10 - Creando schema (tablas)..."
psql "$STAGING_DATABASE_URL" -f supabase/baseline/01_schema.sql
echo "✅ Schema creado"
echo ""

# ============================================================================
# PASO 3: Funciones
# ============================================================================
echo "⚙️  3/10 - Creando funciones SQL..."
psql "$STAGING_DATABASE_URL" -f supabase/baseline/02_functions.sql
echo "✅ Funciones creadas"
echo ""

# ============================================================================
# PASO 4: RLS Policies
# ============================================================================
echo "🔒 4/10 - Aplicando políticas RLS..."
psql "$STAGING_DATABASE_URL" -f supabase/baseline/03_rls_policies.sql
echo "✅ Políticas RLS aplicadas"
echo ""

# ============================================================================
# PASO 5: Triggers
# ============================================================================
echo "⚡ 5/10 - Creando triggers..."
psql "$STAGING_DATABASE_URL" -f supabase/baseline/04_triggers.sql
echo "✅ Triggers creados"
echo ""

# ============================================================================
# PASO 6: Índices
# ============================================================================
echo "📊 6/10 - Creando índices..."
psql "$STAGING_DATABASE_URL" -f supabase/baseline/05_indexes.sql
echo "✅ Índices creados"
echo ""

# ============================================================================
# PASO 7: Storage
# ============================================================================
echo "💾 7/10 - Configurando storage..."
psql "$STAGING_DATABASE_URL" -f supabase/baseline/06_storage.sql
echo "✅ Storage configurado"
echo ""

# ============================================================================
# PASO 8: Datos estáticos
# ============================================================================
echo "📋 8/10 - Insertando datos estáticos..."
psql "$STAGING_DATABASE_URL" -f supabase/static-data/staging/01_plans_catalog.sql
echo "✅ Datos estáticos insertados"
echo ""

# ============================================================================
# PASO 8.5: Crear usuarios en auth.users
# ============================================================================
echo "👥 8.5/10 - Creando usuarios en auth.users..."
node supabase/scripts/create-auth-users-staging.js
if [ $? -ne 0 ]; then
  echo "⚠️  Advertencia: Algunos usuarios no pudieron crearse (pueden ya existir)"
fi
echo "✅ Usuarios procesados"
echo ""

# ============================================================================
# PASO 9: Seeds
# ============================================================================
echo "🌱 9/10 - Aplicando seeds..."
echo "  - Profiles..."
psql "$STAGING_DATABASE_URL" -f supabase/seeds/staging/01_profiles.sql
echo "  - Client accounts..."
psql "$STAGING_DATABASE_URL" -f supabase/seeds/staging/02_client_accounts.sql
echo "  - Entities..."
psql "$STAGING_DATABASE_URL" -f supabase/seeds/staging/03_entities.sql
echo "  - Accommodations..."
psql "$STAGING_DATABASE_URL" -f supabase/seeds/staging/04_accommodations.sql
echo "  - Rooms..."
psql "$STAGING_DATABASE_URL" -f supabase/seeds/staging/05_rooms.sql
echo "  - Lodgers..."
psql "$STAGING_DATABASE_URL" -f supabase/seeds/staging/06_lodgers.sql
echo "✅ Seeds aplicados"
echo ""

# ============================================================================
# PASO 10: Deploy Edge Functions
# ============================================================================
echo "⚡ 10/10 - Desplegando Edge Functions..."
supabase functions deploy --project-ref "$STAGING_PROJECT_REF"
echo "✅ Edge Functions desplegadas"
echo ""

# ============================================================================
# VERIFICACIÓN
# ============================================================================
echo "=========================================="
echo "📊 VERIFICACIÓN FINAL"
echo "=========================================="
echo ""

echo "Conteo de registros:"
psql "$STAGING_DATABASE_URL" -c "SELECT 'plans_catalog' as tabla, COUNT(*) as registros FROM public.plans_catalog
UNION ALL SELECT 'client_accounts', COUNT(*) FROM public.client_accounts
UNION ALL SELECT 'entities', COUNT(*) FROM public.entities
UNION ALL SELECT 'accommodations', COUNT(*) FROM public.accommodations
UNION ALL SELECT 'rooms', COUNT(*) FROM public.rooms
UNION ALL SELECT 'lodgers', COUNT(*) FROM public.lodgers
ORDER BY tabla;"

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETADO EXITOSAMENTE"
echo "=========================================="
echo ""
echo "Próximos pasos:"
echo "1. Ejecutar tests E2E: npm run test:e2e:regression"
echo "2. Validar manualmente en: $STAGING_SUPABASE_URL"
echo "3. Si todo OK, desplegar aplicación: gh workflow run deploy-staging.yml"
echo ""
