@echo off
setlocal

echo   we will now launch the backend

cd /d "%~dp0"

if not exist "%~dp0.venv\Scripts\python.exe" (
    where py >nul 2>&1
    if not errorlevel 1 (
        echo [INFO] wait, we're creating the project env.
        py -3.11 -m venv "%~dp0.venv"
    ) else (
        where python >nul 2>&1
        if errorlevel 1 (
            echo [ERROR] no python.
            pause
            exit /b 1
        )
        echo [INFO] creating env with py from PATH.
        python -m venv "%~dp0.venv"
    )
    if errorlevel 1 (
        echo [ERROR] nuh uh.
        pause
        exit /b 1
    )
)

if not exist "%~dp0.venv\Scripts\python.exe" (
    echo [ERROR] executable unformed.
    pause
    exit /b 1
)

echo [INFO] checking dependencies.
"%~dp0.venv\Scripts\python.exe" -c "import fastapi, uvicorn, multipart, pypdf, docx, reportlab, pandas, numpy, sklearn" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing dependencies.
    "%~dp0.venv\Scripts\python.exe" -m pip install -r "%~dp0requirements-app.txt"
    if errorlevel 1 (
        echo [ERROR] Installation failed.
        pause
        exit /b 1
    )
)

echo [INFO] Starting backend at http://127.0.0.1:8000 ...
"%~dp0.venv\Scripts\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
if errorlevel 1 echo [ERROR] backend error.
pause
