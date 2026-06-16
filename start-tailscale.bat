@echo off
chcp 65001 >nul
title CTECH - Truy cap qua Tailscale (an toan)
cd /d "%~dp0"
set HOST=0.0.0.0

echo.
echo  ============================================
echo   CTECH - TAILSCALE (truy cap tu moi noi)
echo  ============================================
echo.
echo  BUOC 1: Dang nhap Tailscale tren may tinh (icon o khay he thong)
echo  BUOC 2: Cai app Tailscale tren dien thoai, dang nhap CUNG tai khoan
echo  BUOC 3: Chay script nay, mo link Tailscale IP ben duoi
echo.

where tailscale >nul 2>&1
if %errorlevel% neq 0 (
  echo  Chua cai Tailscale. Tai tai: https://tailscale.com/download
  pause
  exit /b 1
)

for /f %%i in ('tailscale ip -4 2^>nul') do set TS_IP=%%i
if "%TS_IP%"=="" (
  echo  Tailscale chua ket noi. Mo app Tailscale va dang nhap truoc.
  echo.
  tailscale status 2>nul
  pause
  exit /b 1
)

echo  IP Tailscale cua may tinh: %TS_IP%
echo  Truy cap tu DIEN THOAI (da cai Tailscale):
echo    http://%TS_IP%:8080
echo.
echo  Dang khoi dong server...
echo.

python server.py
pause