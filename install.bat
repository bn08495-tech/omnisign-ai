@echo off
REM ==============================================================================
REM  OmniSign AI - Windows Automated Installer & Launcher (CMD / Batch)
REM ==============================================================================

setlocal enabledelayedexpansion

echo ==============================================================================
echo   OmniSign AI: Windows Environment Installer & Setup Engine
echo ==============================================================================

cd /d "%~dp0"
echo [+] Working Directory: %CD%

REM 1. Check Python
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] Python not found in PATH.
    echo [*] Checking winget...
    winget --version >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [*] Installing Python 3.10 via winget...
        winget install Python.Python.3.10 --silent --accept-package-agreements --accept-source-agreements
    ) else (
        echo [X] Please download and install Python 3.10+ from https://www.python.org/downloads/
        pause
        exit /b 1
    )
)

echo [v] Python detected.

REM 2. Create Virtual Environment
if not exist ".venv" (
    echo [*] Creating isolated virtual environment in .venv...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

REM 3. Install requirements
echo [*] Upgrading pip...
python -m pip install --upgrade pip setuptools wheel --quiet

if exist "requirements.txt" (
    echo [*] Installing dependencies from requirements.txt...
    pip install -r requirements.txt
) else (
    echo [*] Installing base packages...
    pip install fastapi "uvicorn[standard]" pydantic gtts requests pytest pyinstaller
)

REM 4. Optional Build EXE
if "%1"=="--build-exe" (
    echo [*] Packaging standalone EXE with PyInstaller...
    python -m PyInstaller --name="OmniSignAI" --noconfirm --onedir --windowed --add-data="assets;assets" --add-data="static;static" --add-data="server;server" run.py
    echo [v] Standalone build created in dist\OmniSignAI\OmniSignAI.exe
)

REM 5. Run Verification
if exist "test_app.py" (
    echo [*] Running verification test suite...
    python test_app.py
)

echo ==============================================================================
echo   Installation Completed Successfully! Launching OmniSign AI...
echo ==============================================================================
echo   Web App: http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ==============================================================================

python run.py
pause
