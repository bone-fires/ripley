@echo off
setlocal

echo talentlens.
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] node.js not there.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm not there.
    pause
    exit /b 1
)

if not exist "%~dp0run_backend.bat" (
    echo [ERROR] backend not there.
    pause
    exit /b 1
)
if not exist "%~dp0run_frontend.bat" (
    echo [ERROR] frontend not there.
    pause
    exit /b 1
    pause
    exit /b 1
)

echo.
echo [INFO] opening.
start "TalentLens Backend API" "%ComSpec%" /k ""%~dp0run_backend.bat""
start "TalentLens Frontend UI" "%ComSpec%" /k ""%~dp0run_frontend.bat""

echo.
echo frontend:  http://127.0.0.1:5173
echo backend:   http://127.0.0.1:8000
echo API docs:  http://127.0.0.1:8000/docs
