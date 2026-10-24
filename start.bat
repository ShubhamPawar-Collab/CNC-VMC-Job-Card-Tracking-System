@echo off
cd /d "%~dp0"
start "Backend" cmd /k "npm run server"
start "Frontend" cmd /k "npm run client"
timeout /t 5 >nul
start http://localhost:5173