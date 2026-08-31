# ตั้งค่า PostgreSQL local สำหรับ Online Exam System
# ใช้: .\scripts\setup-local-db.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "=== Online Exam — Local PostgreSQL Setup ===" -ForegroundColor Cyan

function Test-PortOpen($Port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect("localhost", $Port)
        $tcp.Close()
        return $true
    } catch {
        return $false
    }
}

function Find-Psql {
    $paths = @(
        "psql",
        "C:\Program Files\PostgreSQL\18\bin\psql.exe",
        "C:\Program Files\PostgreSQL\17\bin\psql.exe",
        "C:\Program Files\PostgreSQL\16\bin\psql.exe"
    )
    foreach ($p in $paths) {
        if (Get-Command $p -ErrorAction SilentlyContinue) { return $p }
        if (Test-Path $p) { return $p }
    }
    return $null
}

# 1) ลอง Docker Compose ก่อน (แนะนำ)
$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
    Write-Host "`n[1/4] Starting PostgreSQL via Docker Compose..." -ForegroundColor Yellow
    Push-Location $Root
    docker compose up -d
    Pop-Location

    Write-Host "Waiting for PostgreSQL to be ready..."
    $retries = 30
    while ($retries -gt 0 -and -not (Test-PortOpen 5432)) {
        Start-Sleep -Seconds 2
        $retries--
    }
    if (-not (Test-PortOpen 5432)) {
        throw "PostgreSQL did not start on port 5432"
    }
    Write-Host "PostgreSQL is running (Docker)." -ForegroundColor Green
} else {
    Write-Host "`n[1/4] Docker not found — checking native PostgreSQL..." -ForegroundColor Yellow

    $psql = Find-Psql
    if (-not $psql) {
        Write-Host "PostgreSQL not installed. Installing via winget (PostgreSQL 17)..." -ForegroundColor Yellow
        winget install -e --id PostgreSQL.PostgreSQL.17 `
            --accept-package-agreements --accept-source-agreements `
            --override "--mode unattended --superpassword exam_local_dev --serverport 5432"

        $psql = Find-Psql
        if (-not $psql) {
            throw "PostgreSQL install finished but psql not found. Restart terminal and run this script again."
        }
    }

    if (-not (Test-PortOpen 5432)) {
        Write-Host "Starting PostgreSQL service..."
        $svc = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($svc) {
            if ($svc.Status -ne "Running") { Start-Service $svc.Name }
        } else {
            throw "PostgreSQL service not found. Install PostgreSQL or Docker Desktop first."
        }
    }

    Write-Host "Creating database and user (if not exists)..."
    $env:PGPASSWORD = "exam_local_dev"
    & $psql -U postgres -h localhost -p 5432 -tc "SELECT 1 FROM pg_roles WHERE rolname='exam_user'" | Out-Null
    $roleExists = & $psql -U postgres -h localhost -p 5432 -tAc "SELECT 1 FROM pg_roles WHERE rolname='exam_user'"
    if ($roleExists -ne "1") {
        & $psql -U postgres -h localhost -p 5432 -c "CREATE USER exam_user WITH PASSWORD 'exam_local_dev';"
    }
    $dbExists = & $psql -U postgres -h localhost -p 5432 -tAc "SELECT 1 FROM pg_database WHERE datname='online_exam'"
    if ($dbExists -ne "1") {
        & $psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE online_exam OWNER exam_user;"
    }
    & $psql -U postgres -h localhost -p 5432 -c "GRANT ALL PRIVILEGES ON DATABASE online_exam TO exam_user;"

    Write-Host "PostgreSQL is running (native)." -ForegroundColor Green
}

# 2) Copy .env if missing
Write-Host "`n[2/4] Checking environment files..." -ForegroundColor Yellow
$backendEnv = Join-Path $Root "backend\.env"
$frontendEnv = Join-Path $Root "frontend\.env"
if (-not (Test-Path $backendEnv)) {
    Copy-Item (Join-Path $Root "backend\.env.example") $backendEnv
    Write-Host "Created backend/.env from .env.example"
}
if (-not (Test-Path $frontendEnv)) {
    Copy-Item (Join-Path $Root "frontend\.env.example") $frontendEnv
    Write-Host "Created frontend/.env from .env.example"
}

# 3) Prisma migrate
Write-Host "`n[3/4] Running Prisma migrations..." -ForegroundColor Yellow
Push-Location (Join-Path $Root "backend")
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    npx prisma migrate dev --name init
}
Pop-Location

# 4) Seed
Write-Host "`n[4/4] Seeding database..." -ForegroundColor Yellow
Push-Location (Join-Path $Root "backend")
npm run db:seed
Pop-Location

Write-Host "`n=== Setup complete! ===" -ForegroundColor Green
Write-Host "Database: online_exam @ localhost:5432"
Write-Host "User:     exam_user / exam_local_dev"
Write-Host ""
Write-Host "Next steps:"
Write-Host "  cd backend  && npm run dev"
Write-Host "  cd frontend && npm run web"
