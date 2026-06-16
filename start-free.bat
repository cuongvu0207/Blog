@echo off
chcp 65001 >nul
title CTECH - Mien phi, link co dinh
cd /d "%~dp0"

echo.
echo  Phuong an MIEN PHI, link co dinh: Tailscale Funnel (*.ts.net)
echo.
call "%~dp0start-tailscale-funnel.bat"