@echo off
REM Hatchmark Local Development Server Script
REM This script starts both the backend API and frontend development servers

echo Starting Hatchmark Digital Authenticity Service...
echo ==================================================

REM Check if virtual environment exists
if not exist ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Install backend dependencies
echo Installing backend dependencies...
cd backend\src
pip install -r requirements.txt
cd ..\..

REM Install frontend dependencies  
echo Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo Starting services...
echo Backend API will run on: http://localhost:3002
echo Frontend will run on: http://localhost:5173
echo.
echo Press Ctrl+C to stop services

REM Start backend
echo Starting backend server...
cd backend
start /B python local_dev_server.py
cd ..

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo Starting frontend server...
cd frontend
call npm run dev
