@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title CTECH - Truy cap tu moi noi (Internet)
cd /d "%~dp0"
set HOST=0.0.0.0

echo.
echo  ============================================
echo   CTECH - PUBLIC TUNNEL (Cloudflare)
echo  ============================================
echo.

set PUBLIC_URL=
for /f "usebackq delims=" %%u in (`powershell -NoProfile -Command "(Get-Content 'domain.json' -Raw | ConvertFrom-Json).publicUrl"`) do set PUBLIC_URL=%%u

if not "%PUBLIC_URL%"=="" (
  echo  Link hien tai (giu nguyen, khong doi):
  echo    %PUBLIC_URL%
  echo.
)

set SERVER_UP=0
for /f %%p in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess"') do set SERVER_UP=1

set TUNNEL_UP=0
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>nul | find /I "cloudflared.exe" >nul && set TUNNEL_UP=1

if %SERVER_UP%==1 if %TUNNEL_UP%==1 (
  echo  Server va tunnel DANG CHAY — khong khoi dong lai de giu link cu.
  echo.
  pause
  exit /b 0
)

if %SERVER_UP%==0 (
  echo  Dang bat server...
  call "%~dp0start-server.bat"
)

if %TUNNEL_UP%==1 (
  echo  Tunnel van chay — giu nguyen link cu.
  echo.
  pause
  exit /b 0
)

if not exist "tools\cloudflared.exe" (
  echo  Thieu tools\cloudflared.exe
  pause
  exit /b 1
)

echo.
echo  CANH BAO: Tunnel moi se tao link trycloudflare MOI.
echo  De giu link cu, KHONG tat may / KHONG dong cloudflared.
echo  Link co dinh that su: setup-domain.bat hoac start-free.bat
echo.
echo  Dang tao tunnel moi...
echo.
tools\cloudflared.exe tunnel --url http://127.0.0.1:8080

echo.
echo  Tunnel da dong. Server van chay o cua so khac.
pause