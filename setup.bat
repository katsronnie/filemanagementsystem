@echo off
echo 🚀 Setting up File Management System...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js v16 or higher.
    pause
    exit /b 1
)

echo ✅ Node.js is installed

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install
cd ..

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
cd ..

echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Create a Supabase project at https://supabase.com
echo 2. Run the SQL schema from backend/supabase-schema.sql in your Supabase SQL Editor
echo 3. Update backend/config.env with your Supabase credentials
echo 4. Start the backend: cd backend ^&^& npm run dev
echo 5. Start the frontend: cd frontend ^&^& npm run dev
echo.
echo Backend will run on: http://localhost:5000
echo Frontend will run on: http://localhost:5173
pause 