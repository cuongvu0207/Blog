@echo off
chcp 65001 >nul
title CTECH Blog - Local Server
cd /d "%~dp0"
set HOST=0.0.0.0
echo.
echo  Dang khoi dong server...
echo.
echo  *** DIEN THOAI KHONG VAO DUOC? ***
echo  Chuot phai file "setup-phone-access.bat" ^> Run as administrator
echo.
python server.py
pause