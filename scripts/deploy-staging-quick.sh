#!/bin/bash

# ============================================================================
# Script de Configuración Rápida de Staging
# ============================================================================

PROJECT_REF="lopdwrsmkmtboeczxotj"
echo "🚀 Configurando entorno STAGING de Supabase..."
echo "Project ID: $PROJECT_REF"
echo ""

# ============================================================================
# 1. Link del proyecto
# ============================================================================
echo "📌 Paso 1: Linking proyecto staging..."
npx supabase link --project-ref $PROJECT_REF

if [ $? -ne 0 ]; then
    echo "❌ Error al hacer link del proyecto"
    exit 1
fi

echo "✅ Proyecto linked correctamente"
echo ""

# ============================================================================
# 2. Aplicar migraciones
# ============================================================================
echo "📊 Paso 2: Aplicando migraciones..."
npx supabase db push

if [ $? -ne 0 ]; then
    echo "❌ Error al aplicar migraciones"
    exit 1
fi

echo "✅ Migraciones aplicadas correctamente"
echo ""

# ============================================================================
# 3. Desplegar Edge Functions
# ============================================================================
echo "⚡ Paso 3: Desplegando Edge Functions..."

FUNCTIONS=(
    "provision_company"
    "update_company"
    "delete_company"
    "manage_accommodation"
    "manage_lodger"
    "manage_entity"
    "wizard_submit"
    "whoami"
)

for func in "${FUNCTIONS[@]}"; do
    echo "  Desplegando $func..."
    npx supabase functions deploy $func --project-ref $PROJECT_REF
    
    if [ $? -ne 0 ]; then
        echo "  ⚠️  Error al desplegar $func (continuando...)"
    else
        echo "  ✅ $func desplegado"
    fi
done

echo ""
echo "✅ Edge Functions desplegadas"
echo ""

# ============================================================================
# 4. Verificación
# ============================================================================
echo "🔍 Paso 4: Verificando configuración..."

echo "  Migraciones aplicadas:"
npx supabase migration list --project-ref $PROJECT_REF

echo ""
echo "  Edge Functions desplegadas:"
npx supabase functions list --project-ref $PROJECT_REF

echo ""
echo "  Secrets configurados:"
npx supabase secrets list --project-ref $PROJECT_REF

echo ""
echo "✅ Configuración de staging completada!"
echo ""
echo "📝 Próximos pasos manuales:"
echo "  1. Configurar variables de entorno en Vercel Dashboard"
echo "  2. Configurar Auth URLs en Supabase Dashboard"
echo "  3. Configurar secrets con: npx supabase secrets set --project-ref $PROJECT_REF SUPABASE_SERVICE_ROLE_KEY=xxx"
echo ""
