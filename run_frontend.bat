@echo off
setlocal
echo now for the frontend

cd /d "%~dp0frontend"
if not exist "package.json" (
    echo [ERROR] package aint there.
    pause
    exit /b 1
)

if not exist "node_modules\.bin\vite.cmd" (
    echo [INFO] installing.
    npm install
    if errorlevel 1 (
        echo [ERROR] failed installation.
        pause
        exit /b 1
    )
)

echo [INFO] vite.
npm run dev -- --open
if errorlevel 1 echo [ERROR] error.
pause
