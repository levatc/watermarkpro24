@echo off
echo 🚀 Starting WatermarkPro (Simple)...
echo.

REM Start Frontend and Backend in parallel
start "Frontend" cmd /k "cd frontend && npm run dev"
start "Backend" cmd /k "cd backend && npm run dev"

echo ✅ Frontend: http://localhost:3000
echo ✅ Backend: http://localhost:8000
echo.
echo Both servers are starting in separate windows...
echo Close this window to stop monitoring.

pause 