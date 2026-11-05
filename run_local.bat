@echo off
setlocal

echo =====================================================================
echo   TalentLens — Resume Screening & Skill Gap Analysis System
echo   Starting Local Development Environment (FastAPI + Vite React)
echo =====================================================================
echo.

:: Check Node.js and npm before opening either service window.
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not found on PATH. Please install Node.js v18+.
    pause
    exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not found on PATH.
    pause
    exit /b 1
)

if not exist "%~dp0run_backend.bat" (
    echo [ERROR] Could not find run_backend.bat next to this launcher.
    pause
    exit /b 1
)
if not exist "%~dp0run_frontend.bat" (
    echo [ERROR] Could not find run_frontend.bat next to this launcher.
    pause
    exit /b 1
)

echo.
echo [INFO] Opening the backend and frontend in separate windows...
start "TalentLens Backend API" "%ComSpec%" /k ""%~dp0run_backend.bat""
start "TalentLens Frontend UI" "%ComSpec%" /k ""%~dp0run_frontend.bat""

echo.
echo Frontend:  http://127.0.0.1:5173
echo Backend:   http://127.0.0.1:8000
echo API Docs:  http://127.0.0.1:8000/docs
