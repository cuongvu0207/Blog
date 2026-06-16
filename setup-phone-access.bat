@echo off
chcp 65001 >nul
title CTECH - Cau hinh truy cap tu dien thoai
cd /d "%~dp0"

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  Can quyen Administrator de mo Windows Firewall.
    echo  Nhan Yes tren hop thoai UAC...
    echo.
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo  [1/3] Mo cong 8080 tren Windows Firewall...
netsh advfirewall firewall delete rule name="CTECH Blog 8080" >nul 2>&1
netsh advfirewall firewall add rule name="CTECH Blog 8080" dir=in action=allow protocol=TCP localport=8080 profile=any
echo        OK

echo  [2/3] Doi mang sang che do Private (de cho phep ket noi noi bo)...
powershell -Command "Get-NetConnectionProfile | Where-Object { $_.IPv4Connectivity -eq 'Internet' -or $_.IPv4Connectivity -eq 'LocalNetwork' } | ForEach-Object { Set-NetConnectionProfile -InterfaceIndex $_.InterfaceIndex -NetworkCategory Private }" 2>nul
echo        OK

echo  [3/3] Khoi dong server...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "169.254"') do set LAN_IP=%%a
set LAN_IP=%LAN_IP: =%
echo.
echo  ============================================
echo   TRUY CAP TU DIEN THOAI (Wi-Fi cung router):
echo   http://%LAN_IP%:8080
echo.
echo   PC: LAN (day)  -  DT: Wi-Fi  ^(OK neu cung router^)
echo   IP dien thoai phai la 192.168.8.x ~ 11.x
echo  ============================================
echo.
set HOST=0.0.0.0
python server.py
pause