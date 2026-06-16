@echo off
chcp 65001 >nul
title CTECH Server (tu dong bat lai)
cd /d "%~dp0"
set HOST=0.0.0.0

:loop
echo [%date% %time%] Dang chay server...
python server.py
echo [%date% %time%] Server dung — bat lai sau 3 giay...
ping 127.0.0.1 -n 4 >nul
goto loop