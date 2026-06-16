@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title CTECH - Tailscale Funnel (mien phi, link co dinh)
cd /d "%~dp0"
set HOST=0.0.0.0

echo.
echo  ============================================
echo   CTECH - TAILSCALE FUNNEL (MIEN PHI)
echo  ============================================
echo.
echo  Link HTTPS co dinh: https://....ts.net
echo  Khong can mua ten mien. On dinh hon trycloudflare.
echo.
echo  Yeu cau: Cai Tailscale, dang nhap cung tai khoan tren dien thoai
echo.

where tailscale >nul 2>&1
if %errorlevel% neq 0 (
  echo  Chua cai Tailscale. Tai tai: https://tailscale.com/download
  start https://tailscale.com/download
  pause
  exit /b 1
)

:check_ts
for /f %%i in ('tailscale ip -4 2^>nul') do set TS_IP=%%i
if not "%TS_IP%"=="" goto ts_ok

echo  Tailscale chua dang nhap. Dang mo trang dang nhap...
echo.
for /f "delims=" %%L in ('tailscale up 2^>^&1 ^| findstr /i "login.tailscale.com"') do set LOGIN_LINE=%%L
if defined LOGIN_LINE (
  for /f "tokens=2" %%u in ("!LOGIN_LINE!") do start "" %%u
) else (
  start https://login.tailscale.com
)

echo  Dang nhap Tailscale trong trinh duyet, roi quay lai day.
echo  (Cho toi da 3 phut...)
set /a WAIT=0
:wait_login
timeout /t 5 /nobreak >nul
set /a WAIT+=5
for /f %%i in ('tailscale ip -4 2^>nul') do set TS_IP=%%i
if not "%TS_IP%"=="" goto ts_ok
if %WAIT% lss 180 goto wait_login

echo  Het thoi gian cho. Thu lai sau khi dang nhap xong Tailscale.
pause
exit /b 1

:ts_ok
echo  IP Tailscale: %TS_IP%
echo.
echo  Dang bat server + Funnel cong 8080...
echo  Link HTTPS .ts.net se hien ben duoi.
echo  (Neu loi: Tailscale Admin ^> Settings ^> Funnel ^> bat)
echo.

start "CTECH Server" /MIN cmd /c "set HOST=0.0.0.0 && python server.py"
timeout /t 2 /nobreak >nul

tailscale funnel 8080

pause