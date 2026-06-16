@echo off
chcp 65001 >nul
title CTECH - Thiet lap ten mien co dinh
cd /d "%~dp0"
set HOST=0.0.0.0

echo.
echo  ============================================================
echo   TEN MIEN CO DINH cho CTECH (Cloudflare Tunnel)
echo  ============================================================
echo.
echo  KHONG THE dat: ctech.trycloudflare.com
echo  Link *.trycloudflare.com la NGẪU NHIÊN, doi moi lan chay start-public.bat
echo.
echo  DE CO TEN CO DINH (vd: ctech.vn hoac blog.ctech.vn):
echo    1. Co ten mien (mua tai tenten.vn, pa.vn, namecheap... ~150-300k/nam)
echo    2. Them ten mien vao Cloudflare (mien phi): dash.cloudflare.com
echo    3. Lam theo cac buoc ben duoi
echo.
echo  Ket qua: https://blog.ctech.vn  (hoac ten ban chon) — KHONG DOI
echo.
pause

if not exist "tools\cloudflared.exe" (
  echo  Thieu tools\cloudflared.exe
  pause
  exit /b 1
)

if not exist "config" mkdir config

echo.
echo  BUOC 1/4: Dang nhap Cloudflare (mo trinh duyet)...
echo.
tools\cloudflared.exe tunnel login
if %errorlevel% neq 0 (
  echo  Dang nhap that bai. Thu lai.
  pause
  exit /b 1
)

echo.
echo  BUOC 2/4: Tao tunnel "ctech-blog"...
echo.
tools\cloudflared.exe tunnel create ctech-blog
if %errorlevel% neq 0 (
  echo  Tunnel co the da ton tai — tiep tuc buoc 3.
)

echo.
set /p HOSTNAME="BUOC 3/4: Nhap ten mien cua ban (vd: blog.ctech.vn hoac ctech.vn): "
if "%HOSTNAME%"=="" (
  echo  Chua nhap ten mien.
  pause
  exit /b 1
)

echo.
echo  Gan DNS %HOSTNAME% vao tunnel...
tools\cloudflared.exe tunnel route dns ctech-blog %HOSTNAME%
if %errorlevel% neq 0 (
  echo  Loi gan DNS. Kiem tra ten mien da o Cloudflare chua.
  pause
  exit /b 1
)

echo.
echo  BUOC 4/4: Tao file cau hinh...
for /f "delims=" %%f in ('dir /b "%USERPROFILE%\.cloudflared\*.json" 2^>nul ^| findstr /v "cert"') do set CREDFILE=%%f
if "%CREDFILE%"=="" (
  echo  Khong tim thay file credentials trong %USERPROFILE%\.cloudflared\
  echo  Tim file *ctech-blog*.json va dat vao thu muc config\
  pause
  exit /b 1
)

for %%f in ("%USERPROFILE%\.cloudflared\%CREDFILE%") do set CREDPATH=%%~ff
for /f "tokens=*" %%a in ('tools\cloudflared.exe tunnel list ^| findstr ctech-blog') do set TUNNEL_LINE=%%a

echo tunnel: ctech-blog> config\tunnel.yml
echo credentials-file: %CREDPATH%>> config\tunnel.yml
echo.>> config\tunnel.yml
echo ingress:>> config\tunnel.yml
echo   - hostname: %HOSTNAME%>> config\tunnel.yml
echo     service: http://127.0.0.1:8080>> config\tunnel.yml
echo   - service: http_status:404>> config\tunnel.yml

powershell -NoProfile -Command ^
  "$d=Get-Content 'domain.json' -Raw | ConvertFrom-Json; $d.hostname='%HOSTNAME%'; $d.publicUrl='https://%HOSTNAME%'; $d.mode='named'; $d.tunnelName='ctech-blog'; $d | ConvertTo-Json | Set-Content 'domain.json' -Encoding UTF8"

echo.
echo  ============================================================
echo   XONG! Ten mien co dinh: https://%HOSTNAME%
echo  ============================================================
echo.
echo  Tu nay chay: start-domain.bat  (thay vi start-public.bat)
echo.
pause