@echo off
REM ============================================================
REM  KUDOS · Parada limpia
REM  Cierra todas las ventanas del servidor y del autopiloto
REM ============================================================

title Detener Kudos
echo.
echo  Cerrando todas las ventanas de Kudos...

REM Cierra ventanas por su titulo
taskkill /FI "WindowTitle eq Kudos · Servidor web*" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq Kudos · Autopiloto IA*" /T /F >nul 2>&1

echo.
echo  Hecho. Kudos detenido.
echo.
timeout /t 3 /nobreak >nul
exit
