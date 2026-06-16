@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title CTECH - Cau hinh Google (chi can Client ID)
cd /d "%~dp0"

echo.
echo  ============================================================
echo   DANG NHAP GOOGLE - CHI CAN CLIENT ID
echo  ============================================================
echo.

set PUBLIC_URL=
for /f "usebackq delims=" %%u in (`powershell -NoProfile -Command "(Get-Content 'domain.json' -Raw | ConvertFrom-Json).publicUrl"`) do set PUBLIC_URL=%%u
if "%PUBLIC_URL%"=="" set PUBLIC_URL=http://localhost:8080

echo  Tren Google Cloud, them Authorized JavaScript origins:
echo    http://localhost:8080
echo    %PUBLIC_URL%
echo.
echo  Dang mo Google Cloud...
start https://console.cloud.google.com/apis/credentials/oauthclient
echo.
pause

set /p CLIENT_ID="Dan Client ID: "
if "%CLIENT_ID%"=="" exit /b 1

powershell -NoProfile -Command ^
  "$cfg = Get-Content 'config.json' -Raw | ConvertFrom-Json;" ^
  "if (-not $cfg.googleOAuth) { $cfg | Add-Member -NotePropertyName googleOAuth -NotePropertyValue (@{}) };" ^
  "$cfg.googleOAuth.clientId = '%CLIENT_ID%';" ^
  "$cfg | ConvertTo-Json -Depth 5 | Set-Content 'config.json' -Encoding UTF8"

for /f %%p in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 8080 -State Listen -EA SilentlyContinue | Select-Object -First 1).OwningProcess"') do taskkill /PID %%p /F >nul 2>&1
timeout /t 1 /nobreak >nul
start "CTECH Server" /MIN cmd /c "set HOST=0.0.0.0 && python server.py"

echo.
echo  XONG! Thu tai: %PUBLIC_URL%/account.html
pause