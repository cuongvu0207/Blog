@echo off
title Mo firewall cho CTECH Blog
cd /d "%~dp0"

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Can quyen Administrator. Chuot phai file nay ^> Run as administrator
  pause
  exit /b 1
)

netsh advfirewall firewall delete rule name="CTECH Blog 8080" >nul 2>&1
netsh advfirewall firewall add rule name="CTECH Blog 8080" dir=in action=allow protocol=TCP localport=8080
echo.
echo  Da mo cong 8080 tren Windows Firewall.
echo  Bay gio dien thoai cung Wi-Fi co the truy cap website.
echo.
pause