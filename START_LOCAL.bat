@echo off
setlocal
title Selamat ulang tahun - Local Server
cd /d "%~dp0"
echo ==========================================
echo       Selamat ulang tahun - LOCAL TEST
echo ==========================================
echo.
where py >nul 2>nul
if %errorlevel%==0 goto RUN_PY
where python >nul 2>nul
if %errorlevel%==0 goto RUN_PY
echo Python tidak ditemukan.
echo Install Python terlebih dahulu.
pause
exit /b

:RUN_PY
echo [1] Menjalankan server di semua koneksi komputer...
echo.
echo Komputer:
echo    http://localhost:8080/index.html
echo    http://127.0.0.1:8080/index.html
echo.
echo Untuk HP:
echo    Gunakan IP komputer yang tampil di bawah.
echo    Pastikan HP dan komputer berada di Wi-Fi yang sama.
echo.
echo IP komputer:
ipconfig | findstr /R /C:"IPv4 Address" /C:"Alamat IPv4"
echo.
echo ==========================================
echo JANGAN TUTUP JENDELA INI
echo ==========================================
echo.

start "" "http://localhost:8080/index.html"

py -m http.server 8080 --bind 0.0.0.0
if %errorlevel% neq 0 python -m http.server 8080 --bind 0.0.0.0

pause
endlocal
