@echo off
title NutriGen AI System Launcher
echo ==================================================
echo           Launching NutriGen AI System           
echo ==================================================
echo.
echo Initializing models and starting server on http://127.0.0.1:8000 ...
echo Please wait a few seconds for models to load...
echo.

:: Launch background browser opener that polls health check until server is ready
start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "$ready = $false; for ($i=0; $i -lt 30; $i++) { Start-Sleep -Seconds 1; try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch {} }; if ($ready) { Start-Process 'http://127.0.0.1:8000' }"

:: Start FastAPI / Uvicorn server in foreground
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
pause
