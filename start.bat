@echo off
echo FastAPI Audit Application Starter

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed. Please install Python and try again.
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js and try again.
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo npm is not installed. Please install npm and try again.
    exit /b 1
)

REM Create virtual environment if it doesn't exist
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install Python dependencies
echo Installing Python dependencies...
pip install -r backend\requirements.txt

REM Install Node.js dependencies
echo Installing Node.js dependencies...
npm install

REM Check if GROQ_API_KEY is set
if "%GROQ_API_KEY%"=="" (
    echo GROQ_API_KEY is not set. Please set your GROQ API key:
    set /p GROQ_API_KEY="GROQ API Key: "
    setx GROQ_API_KEY "%GROQ_API_KEY%"
)

REM Create recordings directory if it doesn't exist
if not exist recordings (
    echo Creating recordings directory...
    mkdir recordings
)

REM Start the application
echo Starting the application...
npm run dev
