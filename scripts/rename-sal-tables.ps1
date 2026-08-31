# Script one-shot para Fase 1a: reemplaza referencias a nombres viejos de tablas SAL
# en el codebase por sus nuevos nombres con prefijo lock_*.
# Uso: pwsh scripts/rename-sal-tables.ps1

$ErrorActionPreference = "Stop"

$root = Join-Path $PSScriptRoot ".."
Set-Location $root

# Lista explicita de ficheros a modificar (identificados via grep).
$files = @(
    "src\pages\v2\superadmin\sal-shards\SalShardsList.jsx",
    "src\pages\v2\superadmin\client-sal\ClientSalActivation.jsx",
    "src\pages\v2\admin\services\smart-access\SalGestion.jsx",
    "src\pages\v2\admin\services\smart-access\tabs\SalGatewaysTab.jsx",
    "src\pages\v2\admin\services\smart-access\tabs\SmartAccessTab.jsx",
    "supabase\seeds\development\00_cleanup_client_data.sql",
    "supabase\seeds\development\09_sal_shard_seed.sql",
    "supabase\functions\sal-register-paired-lock\index.ts",
    "supabase\functions\sal-quarantine-lock\index.ts",
    "supabase\functions\sal-open-claim-session\index.ts",
    "supabase\functions\sal-offboard-lock\index.ts",
    "supabase\functions\sal-get-ble-session\index.ts",
    "supabase\functions\sal-execute-command\index.ts",
    "supabase\functions\sal-enqueue-command\index.ts",
    "supabase\functions\sal-connect-integration\index.ts",
    "supabase\functions\sal-confirm-claim-session\index.ts",
    "supabase\functions\sal-activate-lock\index.ts"
)

# Reemplazos ordenados: los mas largos primero para evitar sustituciones parciales.
# Cada patron se aplica dentro y fuera de comillas indistintamente.
$replacements = @(
    # Longer / more specific first
    @{ From = "provider_account_pools";       To = "lock_provider_pools" },
    @{ From = "provider_account_assignments"; To = "lock_provider_pool_assignments" },
    @{ From = "gateway_claim_sessions";       To = "lock_gateway_claim_sessions" },
    @{ From = "gateway_lock_links";           To = "lock_gateway_links" },
    # Shortest last — solo cuando aparece como table name literal 'gateways' / "gateways"
    @{ From = "'gateways'";                   To = "'lock_gateways'" },
    @{ From = '"gateways"';                   To = '"lock_gateways"' },
    # Igualmente para tablas usadas con FROM/JOIN/UPDATE en SQL en seeds
    @{ From = "public.gateways";              To = "public.lock_gateways" },
    @{ From = " gateways ";                   To = " lock_gateways " },
    @{ From = "`n  gateways`n";               To = "`n  lock_gateways`n" }
)

foreach ($f in $files) {
    $full = Join-Path $root $f
    if (-not (Test-Path $full)) {
        Write-Warning "No existe: $f"
        continue
    }
    $content = Get-Content -Raw -LiteralPath $full
    $original = $content
    foreach ($r in $replacements) {
        $content = $content.Replace($r.From, $r.To)
    }
    if ($content -ne $original) {
        Set-Content -LiteralPath $full -Value $content -NoNewline
        Write-Host "OK  $f"
    } else {
        Write-Host "--  $f (sin cambios)"
    }
}

Write-Host ""
Write-Host "Verificando que no quedan referencias antiguas..."
$leftover = Select-String -Path $files -Pattern "\b(gateways|gateway_lock_links|gateway_claim_sessions|provider_account_pools|provider_account_assignments)\b" `
    | Where-Object { $_.Line -notmatch "lock_(gateways|gateway_lock_links|gateway_claim_sessions|provider_account_pools|provider_account_assignments)" }
if ($leftover) {
    Write-Host ""
    Write-Warning "Quedan referencias por revisar manualmente:"
    $leftover | ForEach-Object { Write-Host "  $($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
} else {
    Write-Host "Sin referencias residuales."
}
