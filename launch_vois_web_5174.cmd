@echo off
set REPO_ROOT=%~dp0
cd /d "%REPO_ROOT%apps\web"
set CI=true
if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
npm run dev -- --host 127.0.0.1 --port 5174 --force
echo.
echo VOIS frontend stopped. Press any key to close this window.
pause >nul
