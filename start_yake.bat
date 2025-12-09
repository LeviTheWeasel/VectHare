@echo off
REM YAKE Server Quick Start Script (Windows)
REM =========================================
REM Sets up and starts the YAKE keyword extraction server

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "VENV_DIR=%SCRIPT_DIR%venv"
set "PYTHON_SCRIPT=%SCRIPT_DIR%yake_server.py"
if "%YAKE_PORT%"=="" set "PORT=5555"
if not "%YAKE_PORT%"=="" set "PORT=%YAKE_PORT%"

echo ===================================
echo YAKE Server Quick Start
echo ===================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python 3 is not installed
    echo Please install Python 3.8 or higher from python.org
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version') do set "PYTHON_VERSION=%%i"
echo Found Python %PYTHON_VERSION%

REM Create virtual environment if it doesn't exist
if not exist "%VENV_DIR%" (
    echo.
    echo Creating virtual environment...
    python -m venv "%VENV_DIR%"
    echo [OK] Virtual environment created
)

REM Activate virtual environment
echo.
echo Activating virtual environment...
call "%VENV_DIR%\Scripts\activate.bat"

REM Install/upgrade dependencies
echo.
echo Installing dependencies...
python -m pip install --upgrade pip >nul 2>&1
pip install -q -r "%SCRIPT_DIR%requirements.txt"
echo [OK] Dependencies installed

REM Check if server script exists
if not exist "%PYTHON_SCRIPT%" (
    echo.
    echo ERROR: yake_server.py not found at %PYTHON_SCRIPT%
    pause
    exit /b 1
)

REM Start server
echo.
echo ===================================
echo Starting YAKE server on port %PORT%
echo ===================================
echo.
echo Press Ctrl+C to stop the server
echo.

python "%PYTHON_SCRIPT%" --port %PORT%
