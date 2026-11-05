@echo off
setlocal

echo =====================================================================
echo   TalentLens — Backend Service Launcher
echo =====================================================================

cd /d "%~dp0"

if not exist "%~dp0.venv\Scripts\python.exe" (
    where py >nul 2>&1
    if not errorlevel 1 (
        echo [INFO] Creating project virtual environment with Python 3.11...
        py -3.11 -m venv "%~dp0.venv"
    ) else (
        where python >nul 2>&1
        if errorlevel 1 (
            echo [ERROR] Python 3.11 is not installed or not found. Install Python 3.11+ and try again.
            pause
            exit /b 1
        )
        echo [INFO] Creating project virtual environment with Python from PATH...
        python -m venv "%~dp0.venv"
    )
    if errorlevel 1 (
        echo [ERROR] Could not create the virtual environment.
        pause
        exit /b 1
    )
)

if not exist "%~dp0.venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment setup did not create its Python executable.
    pause
    exit /b 1
)

echo [INFO] Checking backend dependencies...
"%~dp0.venv\Scripts\python.exe" -c "import fastapi, uvicorn, multipart, pypdf, docx, reportlab, pandas, numpy, sklearn" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing web app dependencies. This may take a few minutes...
    "%~dp0.venv\Scripts\python.exe" -m pip install -r "%~dp0requirements-app.txt"
    if errorlevel 1 (
        echo [ERROR] Backend dependency installation failed. Check the output above and try again.
        pause
        exit /b 1
    )
)

echo [INFO] Starting backend at http://127.0.0.1:8000 ...
"%~dp0.venv\Scripts\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
if errorlevel 1 echo [ERROR] Backend stopped with an error. Check the output above.
pause
