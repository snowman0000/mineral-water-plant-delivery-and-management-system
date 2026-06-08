@echo off
setlocal

REM One-click startup for Windows machines with Node.js installed.
REM Requirements: Node 18+ and npm must be available on PATH.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js not found.
  echo Install Node.js 18 LTS from https://nodejs.org/en/download/ and try again.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm not found.
  echo Install Node.js (npm is included) and try again.
  pause
  exit /b 1
)

echo Installing backend dependencies...
pushd "%~dp0backend"
npm install
if errorlevel 1 goto error
popd

echo Installing frontend dependencies...
pushd "%~dp0frontend"
npm install
if errorlevel 1 goto error
popd

echo Starting backend server...
start "Water Delivery Backend" cmd /k "cd /d "%~dp0backend" && npm start"

echo Waiting for backend to start...
timeout /t 4 >nul

echo Starting frontend dev server...
start "Water Delivery Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Waiting for frontend to start...
timeout /t 4 >nul

echo Opening browser to http://localhost:5173
start "" "http://localhost:5173"

echo Done. Close this window if you want.
exit /b 0

:error
echo.
echo There was a problem. Check the output above, then rerun this script.
pause
exit /b 1
