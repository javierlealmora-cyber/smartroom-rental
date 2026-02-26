# ============================================================================
# Script de Configuración de PRODUCCIÓN (PowerShell)
# ============================================================================

$PROJECT_REF = "oeofdvkilcuidxainuow"
Write-Host "🚀 Configurando entorno PRODUCCIÓN de Supabase..." -ForegroundColor Green
Write-Host "Project ID: $PROJECT_REF"
Write-Host "URL: https://oeofdvkilcuidxainuow.supabase.co"
Write-Host ""

# ============================================================================
# 1. Link del proyecto
# ============================================================================
Write-Host "📌 Paso 1: Linking proyecto producción..." -ForegroundColor Cyan
npx supabase link --project-ref $PROJECT_REF

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al hacer link del proyecto" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Proyecto linked correctamente" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 2. Aplicar migraciones
# ============================================================================
Write-Host "📊 Paso 2: Aplicando migraciones..." -ForegroundColor Cyan
npx supabase db push

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al aplicar migraciones" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Migraciones aplicadas correctamente" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 3. Desplegar Edge Functions
# ============================================================================
Write-Host "⚡ Paso 3: Desplegando Edge Functions..." -ForegroundColor Cyan

$functions = @(
    "provision_company",
    "update_company",
    "delete_company",
    "manage_accommodation",
    "manage_lodger",
    "manage_entity",
    "wizard_submit",
    "whoami"
)

foreach ($func in $functions) {
    Write-Host "  Desplegando $func..." -ForegroundColor Yellow
    npx supabase functions deploy $func --project-ref $PROJECT_REF
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ⚠️  Error al desplegar $func (continuando...)" -ForegroundColor Yellow
    } else {
        Write-Host "  ✅ $func desplegado" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✅ Edge Functions desplegadas" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 4. Verificación
# ============================================================================
Write-Host "🔍 Paso 4: Verificando configuración..." -ForegroundColor Cyan

Write-Host "  Migraciones aplicadas:"
npx supabase migration list --project-ref $PROJECT_REF

Write-Host ""
Write-Host "  Edge Functions desplegadas:"
npx supabase functions list --project-ref $PROJECT_REF

Write-Host ""
Write-Host "  Secrets configurados:"
npx supabase secrets list --project-ref $PROJECT_REF

Write-Host ""
Write-Host "✅ Configuración de producción completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Próximos pasos manuales:" -ForegroundColor Yellow
Write-Host "  1. Configurar variables de entorno en Vercel Dashboard (Production)"
Write-Host "  2. Configurar Auth URLs en Supabase Dashboard"
Write-Host "  3. Configurar secrets con: npx supabase secrets set --project-ref $PROJECT_REF SUPABASE_SERVICE_ROLE_KEY=xxx"
Write-Host "  4. Configurar Stripe keys (producción - LIVE mode)"
Write-Host ""
