@echo off
REM ============================================================
REM  KUDOS · Lanzador automático
REM  Doble clic y se abren:
REM    1. Servidor web  (http://127.0.0.1:8000/)
REM    2. Autopiloto IA (importa cápsulas + agentes 24/7)
REM ============================================================

title Lanzador Kudos
echo.
echo  =============================================
echo   KUDOS  -  Iniciando ecosistema multidimensional
echo  =============================================
echo.

cd /d "%~dp0"

REM ---- 1. Servidor web ----------------------------------------
echo  [1/2] Arrancando el servidor web...
start "Kudos · Servidor web" cmd /k "cd /d %~dp0 && echo. && echo  KUDOS - Servidor web && echo  Abre http://127.0.0.1:8000/ en tu navegador && echo. && python manage.py runserver"

REM Esperar 5 segundos a que arranque Django
timeout /t 5 /nobreak >nul

REM ---- 2. Autopiloto ------------------------------------------
echo  [2/2] Arrancando el autopiloto de la IA interna...
start "Kudos · Autopiloto IA" cmd /k "cd /d %~dp0 && echo. && echo  KUDOS - Autopiloto 24/7 && echo  Importacion + 8 agentes MIND + 12 departamentos + multimedia && echo  Para detener: Ctrl+C en esta ventana && echo. && python manage.py full_autopilot"

echo.
echo  =============================================
echo   Listo. Se han abierto 2 ventanas:
echo     - Servidor web  (http://127.0.0.1:8000/)
echo     - Autopiloto    (creando cápsulas en bucle)
echo.
echo   Para detener todo: cierra ambas ventanas o pulsa Ctrl+C
echo  =============================================
echo.

REM Cerrar esta ventana de aviso a los 6 segundos
timeout /t 6 /nobreak >nul
exit
