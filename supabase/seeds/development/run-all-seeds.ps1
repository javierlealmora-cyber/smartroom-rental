# =====================================================
# Script para ejecutar todos los seeds en DEV
# =====================================================

Write-Host "Iniciando proceso de seeds en DEV..." -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "supabase\seeds\development")) {
    Write-Host "Error: Debes ejecutar este script desde la raiz del proyecto" -ForegroundColor Red
    exit 1
}

# Cargar variables desde .env.local
Write-Host "Cargando variables desde .env.local..." -ForegroundColor Cyan
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"')
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "Variables cargadas desde .env.local" -ForegroundColor Green
} else {
    Write-Host "Error: .env.local no encontrado" -ForegroundColor Red
    exit 1
}

# Verificar DATABASE_URL
if (-not $env:DATABASE_URL) {
    Write-Host "Error: DATABASE_URL no encontrada en .env.local" -ForegroundColor Red
    Write-Host "Agrega DATABASE_URL a .env.local" -ForegroundColor Yellow
    exit 1
}

Write-Host "DATABASE_URL configurada correctamente" -ForegroundColor Green

# PASO 1: Limpiar datos de cuentas cliente
Write-Host "PASO 1: Limpiando datos de cuentas cliente..." -ForegroundColor Yellow
Write-Host "ADVERTENCIA: Esto eliminara TODOS los datos de cuentas cliente (preserva superadmin y datos estaticos)" -ForegroundColor Yellow
$confirm = Read-Host "Continuar? (s/n)"
if ($confirm -ne "s") {
    Write-Host "Operacion cancelada" -ForegroundColor Red
    exit 0
}

psql $env:DATABASE_URL -f "supabase\seeds\development\00_cleanup_client_data.sql"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error en la limpieza de datos" -ForegroundColor Red
    exit 1
}
Write-Host "Limpieza completada" -ForegroundColor Green
Write-Host ""

# PASO 2: Crear usuarios en auth.users
Write-Host "PASO 2: Creando usuarios en auth.users..." -ForegroundColor Yellow
Write-Host "Ejecutando script SQL con bcrypt (los usuarios apareceran en el dashboard)" -ForegroundColor Yellow

psql $env:DATABASE_URL -f "supabase\seeds\development\00_create_auth_users.sql"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error creando usuarios" -ForegroundColor Red
    exit 1
}
Write-Host "Usuarios creados exitosamente" -ForegroundColor Green
Write-Host ""

# PASO 3: Ejecutar seeds SQL en orden
Write-Host "PASO 3: Ejecutando seeds SQL..." -ForegroundColor Yellow

$sqlFiles = Get-ChildItem "supabase\seeds\development\*.sql" | 
    Where-Object { $_.Name -match '^\d+_' } | 
    Sort-Object Name

foreach ($file in $sqlFiles) {
    Write-Host "  Ejecutando $($file.Name)..." -ForegroundColor Cyan
    psql $env:DATABASE_URL -f $file.FullName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Error ejecutando $($file.Name)" -ForegroundColor Red
        exit 1
    }
    Write-Host "  $($file.Name) completado" -ForegroundColor Green
}

Write-Host ""
Write-Host ""
Write-Host "Proceso completado exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Verificacion de datos:" -ForegroundColor Cyan

$verifyQuery = @"
SELECT 'Cuentas Cliente' as tipo, COUNT(*) as total FROM client_accounts
UNION ALL
SELECT 'Entidades', COUNT(*) FROM entities
UNION ALL
SELECT 'Alojamientos', COUNT(*) FROM accommodations
UNION ALL
SELECT 'Habitaciones', COUNT(*) FROM rooms
UNION ALL
SELECT 'Lodgers (profiles)', COUNT(*) FROM profiles WHERE role = 'lodger'
UNION ALL
SELECT 'Asignaciones', COUNT(*) FROM lodger_room_assignments
UNION ALL
SELECT 'Pagadores', COUNT(*) FROM payer_rental;
"@

psql $env:DATABASE_URL -c $verifyQuery

Write-Host ""
Write-Host "Seeds de DEV ejecutados correctamente" -ForegroundColor Green
