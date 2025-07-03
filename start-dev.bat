@echo off
echo 🎨 Starting WatermarkPro Development Environment (No Docker)...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js ist nicht installiert. Bitte installieren Sie Node.js 18+ von https://nodejs.org
    pause
    exit /b 1
)

echo ✅ Node.js verfügbar
echo.

REM Install root dependencies
if not exist "node_modules" (
    echo 📦 Installing root dependencies...
    npm install
    echo.
)

REM Install shared dependencies and build
echo 📦 Setting up shared package...
cd shared
if not exist "node_modules" (
    npm install
)
npm run build
cd ..
echo.

REM Install frontend dependencies
if not exist "frontend\node_modules" (
    echo 📦 Installing frontend dependencies...
    cd frontend
    npm install
    cd ..
    echo.
)

REM Install backend dependencies
if not exist "backend\node_modules" (
    echo 📦 Installing backend dependencies...
    cd backend
    npm install
    cd ..
    echo.
)

REM Setup database
echo 🗄️ Setting up database...
cd backend
npm run prisma:generate >nul 2>&1
npm run prisma:migrate >nul 2>&1
cd ..
echo.

echo 🚀 Starting development servers...
echo.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:8000  
echo Health Check: http://localhost:8000/health
echo.
echo NOTE: No Docker required! Using SQLite for simplicity.
echo.

REM Start the development environment
npm run dev

pause 