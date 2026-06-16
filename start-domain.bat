@echo off
chcp 65001 >nul
title CTECH - Ten mien co dinh
cd /d "%~dp0"
set HOST=0.0.0.0

echo.
echo  ============================================
echo   CTECH - TEN MIEN CO DINH (Cloudflare)
echo  ============================================
echo.

if not exist "config\tunnel.yml" (
  echo  Chua cau hinh ten mien co dinh.
  echo  Chay: setup-domain.bat
  echo.
  echo  Luu y: KHONG the dung ctech.trycloudflare.com
  echo  Can ten mien rieng (vd: ctech.vn, blog.ctech.vn)
  echo.
  pause
  exit /b 1
)

for /f "tokens=2 delims=:," %%a in ('findstr /i "hostname" config\tunnel.yml') do (
  set HOSTNAME=%%a
  goto :found
)
:found
set HOSTNAME=%HOSTNAME: =%

echo  Ten mien: https://%HOSTNAME%
echo  Dang khoi dong server + tunnel...
echo.

start "CTECH Server" /MIN cmd /c "set HOST=0.0.0.0 && python server.py"
timeout /t 2 /nobreak >nul

tools\cloudflared.exe tunnel --config config\tunnel.yml run ctech-blog

echo.
echo  Tunnel da dong. Server van chay o cua so khac.
pause