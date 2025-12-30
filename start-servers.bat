@echo off
echo Starting Database Backup Manager...
echo.

REM Create logs directory if it doesn't exist
if not exist logs mkdir logs

REM Start backend server
echo [%date% %time%] Starting backend server... >> logs\servers.log
start "Backend Server" cmd /c "cd backend && npm run dev >> ..\logs\backend.log 2>&1"

REM Wait a moment
timeout /t 2 /nobreak > nul

REM Start frontend server
echo [%date% %time%] Starting frontend server... >> logs\servers.log
start "Frontend Server" cmd /c "npm run dev >> logs\frontend.log 2>&1"

echo.
echo ========================================
echo Backend Server: http://localhost:3005
echo Frontend Server: http://localhost:8080
echo ========================================
echo.
echo Backend logs: logs\backend.log
echo Frontend logs: logs\frontend.log
echo Combined logs: logs\servers.log
echo.
echo Press any key to stop all servers...
pause > nul

REM Stop all node processes (optional)
echo Stopping servers...
taskkill /F /IM node.exe /T > nul 2>&1
echo Servers stopped.
