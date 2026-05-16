# مركز داريا الطبي - تشغيل النظام
# Daraya Medical Center - System Launcher

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  مركز داريا الطبي - نظام إدارة الدور" -ForegroundColor Cyan
Write-Host "  Daraya Medical Center Queue System" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Check Node.js
try {
    $nodeVersion = & node --version 2>$null
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check npm
try {
    $npmVersion = & npm --version 2>$null
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: npm is not available" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install backend dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install backend dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Install frontend dependencies if needed
Set-Location "frontend"
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install frontend dependencies" -ForegroundColor Red
        Set-Location ".."
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Set-Location ".."

# Start backend server
Write-Host "Starting backend server..." -ForegroundColor Green
Start-Process -FilePath "cmd" -ArgumentList "/k npm run dev" -WindowStyle Normal

# Wait for backend to initialize
Write-Host "Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start desktop application
Write-Host "Starting desktop application..." -ForegroundColor Green
Set-Location "frontend"
& npm run tauri:dev

Set-Location ".."
Read-Host "Press Enter to exit"