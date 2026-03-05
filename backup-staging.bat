@echo off
REM ============================================================================
REM Script: backup-staging.bat
REM Descripción: Backup de Staging usando Supabase CLI
REM ============================================================================

echo ========================================
echo Backup de STAGING
echo ========================================
echo.
echo Proyecto: lopdwrsmkmtboeczxotj
echo.

REM Pedir password
set /p DB_PASSWORD="Ingresa el password de Supabase: "
echo.

REM Generar timestamp
set BACKUP_FILE=backup_staging_20260305.sql

echo Creando backup...
echo Archivo: %BACKUP_FILE%
echo.

REM Ejecutar backup con Supabase CLI (usando npx)
npx supabase@latest db dump --db-url "postgresql://postgres.lopdwrsmkmtboeczxotj:%DB_PASSWORD%@aws-0-us-west-1.pooler.supabase.com:6543/postgres" -f %BACKUP_FILE%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Backup completado exitosamente
    echo ========================================
    echo Archivo: %BACKUP_FILE%
    dir %BACKUP_FILE%
    echo.
    echo Tamaño del backup:
    for %%A in (%BACKUP_FILE%) do echo %%~zA bytes
) else (
    echo.
    echo ERROR: No se pudo crear el backup
    echo.
    echo Posibles causas:
    echo - Password incorrecto
    echo - Supabase CLI no instalado (npm install -g supabase)
    echo - Problemas de conexion
)

echo.
pause
