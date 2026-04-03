$repoRoot = $PSScriptRoot
$pythonPath = Join-Path $env:LOCALAPPDATA "Programs\Python\Python313\python.exe"
$tmpDir = Join-Path $repoRoot "apps\api\.tmp"
$localDataDir = Join-Path $repoRoot "apps\api\.local"
$apiEnvPath = Join-Path $repoRoot "apps\api\.env"
$defaultLaunchDatabaseUrl = "sqlite:///./.local/workspace.sqlite"
$defaultLaunchDatabasePath = Join-Path $repoRoot "apps\api\.local\workspace.sqlite"

function Import-DotEnvFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#")) {
            continue
        }
        $pair = $trimmed -split '=', 2
        if ($pair.Count -ne 2) {
            continue
        }
        $name = $pair[0].Trim()
        $value = $pair[1].Trim().Trim('"').Trim("'")
        if (-not [string]::IsNullOrWhiteSpace($name) -and -not (Test-Path "Env:$name")) {
            Set-Item -Path "Env:$name" -Value $value
        }
    }
}

if (-not (Test-Path $tmpDir)) {
    New-Item -ItemType Directory -Path $tmpDir | Out-Null
}
if (-not (Test-Path $localDataDir)) {
    New-Item -ItemType Directory -Path $localDataDir | Out-Null
}

Set-Location "$repoRoot\apps\api"
$env:PYTHONPATH = $repoRoot
Import-DotEnvFile -Path $apiEnvPath
if (-not $env:DATABASE_URL) { $env:DATABASE_URL = $defaultLaunchDatabaseUrl }
if (-not $env:AUTO_CREATE_SCHEMA) { $env:AUTO_CREATE_SCHEMA = "true" }
if (-not $env:AI_PROVIDER) { $env:AI_PROVIDER = "anthropic" }
if (-not $env:ALLOW_LOCAL_PASSWORD_AUTH) { $env:ALLOW_LOCAL_PASSWORD_AUTH = "true" }
if (-not $env:ALLOW_LEGACY_HEADER_AUTH) { $env:ALLOW_LEGACY_HEADER_AUTH = "false" }
if (-not $env:ALLOW_BOOTSTRAP_FALLBACK) { $env:ALLOW_BOOTSTRAP_FALLBACK = "false" }
if (-not $env:ENABLE_INPROCESS_SCHEDULER) { $env:ENABLE_INPROCESS_SCHEDULER = "false" }
if (-not $env:VOIS_LOCAL_OWNER_EMAIL) { $env:VOIS_LOCAL_OWNER_EMAIL = "owner@vois.local" }
if (-not $env:VOIS_LOCAL_OWNER_PASSWORD) { $env:VOIS_LOCAL_OWNER_PASSWORD = "vois-owner-2026" }
if (-not $env:VOIS_LOCAL_OWNER_NAME) { $env:VOIS_LOCAL_OWNER_NAME = "VOIS Owner" }

& $pythonPath -m app.scripts.prepare_local_workspace_db
& $pythonPath -m app.scripts.provision_local_owner

Write-Host "Local owner login: $env:VOIS_LOCAL_OWNER_EMAIL"
Write-Host "AI provider: $env:AI_PROVIDER"

& $pythonPath -m uvicorn app.main:app --host 127.0.0.1 --port 8001
