@echo off
chcp 65001 >nul
title CTECH Server
cd /d "%~dp0"
set HOST=0.0.0.0

for /f %%p in ('powershell -NoProfile -Command "(Get-NetTCPConnection -LocalPort 8080 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess"') do (
  echo Server da chay tren port 8080.
  exit /b 0
)

echo Dang khoi dong server CTECH (tu dong bat lai neu tat)...
start "CTECH Server" "%~dp0keep-server.bat"
ping 127.0.0.1 -n 3 >nul