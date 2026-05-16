@echo off
echo ============================================
echo   مركز داريا الطبي - إصدار الويب
echo   Daraya Medical Center - Web Version
echo ============================================

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
cd /d %SCRIPT_DIR%

echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js مطلوب لتشغيل النظام
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Installing dependencies if needed...
if not exist "node_modules" (
    echo Installing backend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: فشل تثبيت dependencies
        pause
        exit /b 1
    )
)

cd frontend
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: فشل تثبيت frontend dependencies
        cd ..
        pause
        exit /b 1
    )
)
cd ..

echo Starting backend server...
start "Clinic Backend Server" cmd /k "npm run dev"

echo Waiting for server to start...
timeout /t 3 /nobreak > nul

echo Opening web application in browser...
start http://localhost:3000

echo Starting frontend development server...
cd frontend
npm run dev

cd ..
pause