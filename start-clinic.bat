@echo off
echo ============================================
echo   مركز داريا الطبي - نظام إدارة الدور
echo   Daraya Medical Center Queue System
echo ============================================

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
cd /d %SCRIPT_DIR%

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    echo Press any key to continue with web version...
    pause >nul
    goto :web_version
)

echo Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available
    echo Press any key to continue with web version...
    pause >nul
    goto :web_version
)

echo Installing dependencies if needed...
if not exist "node_modules" (
    echo Installing backend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install backend dependencies
        echo Press any key to continue with web version...
        pause >nul
        goto :web_version
    )
)

cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install frontend dependencies
        cd ..
        echo Press any key to continue with web version...
        pause >nul
        goto :web_version
    )
)
cd ..

echo Starting backend server...
start "Clinic Backend Server" cmd /k "npm run dev"

echo Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

echo Starting desktop application...
echo Note: First run may take several minutes due to Rust compilation
cd frontend
npm run tauri:dev

cd ..
pause
exit /b 0

:web_version
echo ============================================
echo Starting WEB VERSION (no desktop app)
echo ============================================

if exist "node_modules" (
    echo Starting backend server...
    start "Clinic Backend Server" cmd /k "npm run dev"
    echo Waiting for backend...
    timeout /t 3 /nobreak > nul
)

cd frontend
if exist "node_modules" (
    echo Starting web application...
    start "Clinic Web App" http://localhost:3000
    npm run dev
) else (
    echo Opening browser to localhost:3000
    start http://localhost:3000
    echo Please run 'npm install' in frontend folder first
)

cd ..
pause