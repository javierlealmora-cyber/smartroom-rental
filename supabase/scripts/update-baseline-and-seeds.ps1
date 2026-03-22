# ============================================================================
# Script: Actualizar Baseline y Seeds desde BBDD Producción
# Descripción: Genera archivos de baseline y seeds desde la base de datos remota
# Requisito: Docker Desktop debe estar corriendo
# ============================================================================

$ErrorActionPreference = "Stop"

# Colores para output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

# Variables
$PROJECT_ROOT = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$DB_URL = "postgresql://postgres.lqwyyyttjamirccdtlvl:Smartroom2024!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
$BASELINE_DIR = Join-Path $PROJECT_ROOT "supabase\baseline"
$SEEDS_DIR = Join-Path $PROJECT_ROOT "supabase\seeds\development"

Write-Info "============================================================================"
Write-Info "Actualización de Baseline y Seeds - SmartRoom Rental"
Write-Info "============================================================================"
Write-Info ""

# Verificar que Docker Desktop está corriendo
Write-Info "1. Verificando Docker Desktop..."
try {
    docker ps | Out-Null
    Write-Success "   ✓ Docker Desktop está corriendo"
} catch {
    Write-Error "   ✗ Docker Desktop NO está corriendo o no está instalado"
    Write-Warning "   Por favor, inicia Docker Desktop e intenta de nuevo"
    exit 1
}

# Cambiar al directorio del proyecto
Set-Location $PROJECT_ROOT
Write-Success "   ✓ Directorio de trabajo: $PROJECT_ROOT"
Write-Info ""

# ============================================================================
# PASO 1: Actualizar Schema (01_schema.sql)
# ============================================================================
Write-Info "2. Actualizando schema (baseline/01_schema.sql)..."
try {
    $schemaFile = Join-Path $BASELINE_DIR "01_schema.sql"
    $schemaBackup = Join-Path $BASELINE_DIR "01_schema.sql.backup"
    
    # Backup del archivo actual
    if (Test-Path $schemaFile) {
        Copy-Item $schemaFile $schemaBackup
        Write-Info "   - Backup creado: 01_schema.sql.backup"
    }
    
    # Generar nuevo schema
    npx supabase db dump --db-url $DB_URL --schema public --file $schemaFile
    Write-Success "   ✓ Schema actualizado correctamente"
} catch {
    Write-Error "   ✗ Error al actualizar schema: $_"
    if (Test-Path $schemaBackup) {
        Copy-Item $schemaBackup $schemaFile -Force
        Write-Warning "   Restaurado desde backup"
    }
}
Write-Info ""

# ============================================================================
# PASO 2: Actualizar Functions (02_functions.sql)
# ============================================================================
Write-Info "3. Actualizando functions (baseline/02_functions.sql)..."
try {
    $functionsFile = Join-Path $BASELINE_DIR "02_functions.sql"
    $functionsBackup = Join-Path $BASELINE_DIR "02_functions.sql.backup"
    
    # Backup del archivo actual
    if (Test-Path $functionsFile) {
        Copy-Item $functionsFile $functionsBackup
    }
    
    # Generar dump de funciones
    npx supabase db dump --db-url $DB_URL --schema public --functions-only --file $functionsFile
    Write-Success "   ✓ Functions actualizadas correctamente"
} catch {
    Write-Warning "   ⚠ No se pudieron actualizar las functions (puede ser normal si no hay cambios)"
}
Write-Info ""

# ============================================================================
# PASO 3: Actualizar Indexes (05_indexes.sql)
# ============================================================================
Write-Info "4. Actualizando indexes (baseline/05_indexes.sql)..."
try {
    $indexesFile = Join-Path $BASELINE_DIR "05_indexes.sql"
    $indexesBackup = Join-Path $BASELINE_DIR "05_indexes.sql.backup"
    
    # Backup del archivo actual
    if (Test-Path $indexesFile) {
        Copy-Item $indexesFile $indexesBackup
    }
    
    # Generar dump de índices
    npx supabase db dump --db-url $DB_URL --schema public --indexes-only --file $indexesFile
    Write-Success "   ✓ Indexes actualizados correctamente"
} catch {
    Write-Warning "   ⚠ No se pudieron actualizar los indexes"
}
Write-Info ""

# ============================================================================
# PASO 4: Generar Seeds de Development (datos actuales)
# ============================================================================
Write-Info "5. Generando seeds de development..."
try {
    $seedsFile = Join-Path $SEEDS_DIR "08_current_data_snapshot.sql"
    
    # Generar dump de datos
    npx supabase db dump --db-url $DB_URL --data-only --file $seedsFile
    
    Write-Success "   ✓ Seeds generados: 08_current_data_snapshot.sql"
    Write-Warning "   ⚠ IMPORTANTE: Revisa este archivo antes de usarlo en development"
    Write-Warning "   ⚠ Puede contener datos sensibles de producción"
} catch {
    Write-Error "   ✗ Error al generar seeds: $_"
}
Write-Info ""

# ============================================================================
# RESUMEN
# ============================================================================
Write-Info "============================================================================"
Write-Success "Actualización completada"
Write-Info "============================================================================"
Write-Info ""
Write-Info "Archivos actualizados:"
Write-Info "  - baseline/01_schema.sql"
Write-Info "  - baseline/02_functions.sql (si aplica)"
Write-Info "  - baseline/05_indexes.sql (si aplica)"
Write-Info "  - seeds/development/08_current_data_snapshot.sql"
Write-Info ""
Write-Warning "PRÓXIMOS PASOS:"
Write-Info "1. Revisar los archivos generados"
Write-Info "2. Verificar que no hay datos sensibles en seeds"
Write-Info "3. Hacer commit de los cambios:"
Write-Info "   git add supabase/baseline/* supabase/seeds/development/*"
Write-Info "   git commit -m 'chore: Actualizar baseline y seeds desde BBDD producción'"
Write-Info "   git push origin develop"
Write-Info ""
Write-Info "Backups creados con extensión .backup (puedes eliminarlos si todo está OK)"
Write-Info "============================================================================"
