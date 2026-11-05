@echo off
setlocal
echo =====================================================================
echo   TalentLens — Frontend UI Launcher
echo =====================================================================

cd /d "%~dp0frontend"
if not exist "package.json" (
    echo [ERROR] Could not find frontend\package.json.
    pause
    exit /b 1
)

if not exist "node_modules\.bin\vite.cmd" (
    echo [INFO] Installing frontend dependencies with npm. This may take a few minutes...
    npm install
    if errorlevel 1 (
        echo [ERROR] Frontend dependency installation failed. Check the output above and try again.
        pause
        exit /b 1
    )
)

echo [INFO] Starting Vite and opening the app when it is ready...
npm run dev -- --open
if errorlevel 1 echo [ERROR] Frontend stopped with an error. Check the output above.
pause
