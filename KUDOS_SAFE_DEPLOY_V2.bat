@echo off
REM ============================================================
REM  KUDOS · SAFE DEPLOY V2 (founder-protective)
REM
REM  Reglas estrictas:
REM    - NUNCA `git add .`
REM    - NUNCA `git add <carpeta>`
REM    - NUNCA `git push` automatico
REM    - NUNCA `npm install` automatico
REM    - SOLO stage de archivos MODIFICADOS YA TRACKED (git add -u)
REM    - Untracked listados pero NO staged automaticamente
REM    - Cada paso requiere confirmacion escrita "yes"
REM    - Push final manual · script solo imprime el comando
REM
REM  Founder: doble-click. Si dudas → escribe cualquier cosa
REM           distinta de "yes" → script aborta limpio sin tocar nada.
REM ============================================================

setlocal EnableDelayedExpansion
chcp 65001 >nul

set "ROOT=C:\Users\efert\kudos_project"
set "EXPERIENCE=%ROOT%\experience"
set "LOGDIR=%ROOT%\.kudos_deploy_logs"

cd /d "%ROOT%"
if errorlevel 1 (
    echo [ABORT] No se puede entrar en %ROOT%
    pause
    exit /b 1
)

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

echo.
echo ============================================================
echo  KUDOS SAFE DEPLOY V2
echo  CWD: %CD%
echo  Branch:
git branch --show-current
echo ============================================================

REM ------------------------------------------------------------
REM  STEP 1 - Mostrar estado del repo (read-only · cero side effects)
REM ------------------------------------------------------------
echo.
echo [STEP 1/7] Estado del working tree
echo ------------------------------------------------------------
echo.
echo === Archivos modificados (tracked) ===
git status --porcelain | findstr /B /R "^[ MAD] " > "%LOGDIR%\modified.txt"
if exist "%LOGDIR%\modified.txt" (
    type "%LOGDIR%\modified.txt"
    for /f %%A in ('type "%LOGDIR%\modified.txt" ^| find /c /v ""') do set "MOD_COUNT=%%A"
) else (
    set "MOD_COUNT=0"
)
echo.
echo Total modificados tracked: !MOD_COUNT!
echo.
echo === Archivos UNTRACKED (NO se stagearan automaticamente) ===
git status --porcelain | findstr /B /R "^??" > "%LOGDIR%\untracked.txt"
if exist "%LOGDIR%\untracked.txt" (
    type "%LOGDIR%\untracked.txt"
    for /f %%A in ('type "%LOGDIR%\untracked.txt" ^| find /c /v ""') do set "UNT_COUNT=%%A"
) else (
    set "UNT_COUNT=0"
)
echo.
echo Total untracked: !UNT_COUNT!

if "!MOD_COUNT!"=="0" (
    echo.
    echo [INFO] No hay archivos modificados tracked.
    echo        Nada que stagear. Si querias commit de archivos NUEVOS,
    echo        anyadelos manualmente con: git add ruta/exacta/al/archivo
    echo.
    pause
    exit /b 0
)

REM ------------------------------------------------------------
REM  STEP 2 - Confirmar stage de modificados
REM ------------------------------------------------------------
echo.
echo [STEP 2/7] Confirmar STAGE de !MOD_COUNT! archivos modificados
echo ------------------------------------------------------------
echo.
echo Vas a stagear SOLO los archivos modificados arriba.
echo Los untracked NO se tocan. Para anyadir untracked, hazlo a mano
echo despues de este script con: git add ruta/exacta/al/archivo
echo.
set "ANSWER="
set /p ANSWER="Confirmar stage modificados? (escribe yes para continuar): "
if /i not "!ANSWER!"=="yes" (
    echo Aborted by user. Nada se ha tocado.
    pause
    exit /b 0
)

REM `git add -u` stagea SOLO tracked-modificados (y deletes). NO untracked.
git add -u
if errorlevel 1 (
    echo [ABORT] git add -u fallo.
    pause
    exit /b 1
)

REM ------------------------------------------------------------
REM  STEP 3 - Mostrar staged set + verificar no haya junk
REM ------------------------------------------------------------
echo.
echo [STEP 3/7] Verificar staged set
echo ------------------------------------------------------------
echo.
echo === Diff stat de archivos staged ===
git diff --cached --stat
echo.

git diff --cached --name-only > "%LOGDIR%\staged.txt"
set "JUNK_FOUND=0"
for %%p in (ipfs ar_vr blockchain streamlit temp_dockerfiles kudos_app images clips translator capsulas_prueba) do (
    findstr /B /C:"%%p/" "%LOGDIR%\staged.txt" >nul 2>&1
    if not errorlevel 1 (
        echo [WARN] Path sospechoso staged: %%p/
        set "JUNK_FOUND=1"
    )
)
findstr /R /C:"\.exe$" /C:"\.mp4$" /C:"\.rdb$" /C:"\.dat$" /C:"dump\.rdb" "%LOGDIR%\staged.txt" >nul 2>&1
if not errorlevel 1 (
    echo [WARN] Binarios sospechosos staged.
    set "JUNK_FOUND=1"
)
findstr /B /C:"kudos_project/" "%LOGDIR%\staged.txt" >nul 2>&1
if not errorlevel 1 (
    echo [WARN] Carpeta anidada kudos_project/ staged - duplicacion.
    set "JUNK_FOUND=1"
)

if "!JUNK_FOUND!"=="1" (
    echo.
    echo ============================================================
    echo  ATENCION · STAGED SET CONTIENE PATHS SOSPECHOSOS
    echo ============================================================
    echo Si esto es intencional, escribe yes para continuar.
    echo Si NO, escribe cualquier otra cosa para abortar y resetear.
    echo.
    set "ANSWER="
    set /p ANSWER="Continuar con junk staged? (yes/no): "
    if /i not "!ANSWER!"=="yes" (
        git reset HEAD > nul 2>&1
        echo Stage reseteado. Nada commiteado.
        pause
        exit /b 0
    )
)

REM ------------------------------------------------------------
REM  STEP 4 - Build local opcional
REM ------------------------------------------------------------
echo.
echo [STEP 4/7] Build local (opcional · recomendado)
echo ------------------------------------------------------------
echo.
echo Correr `npm run build` localmente verifica que el commit no
echo rompe la build de Next antes de pushear. Tarda ~30-60s.
echo.
set "ANSWER="
set /p ANSWER="Correr next build? (yes para correr, otra cosa para skip): "
if /i "!ANSWER!"=="yes" (
    echo.
    echo Corriendo `npm run build` en experience\ ...
    pushd "%EXPERIENCE%"
    if errorlevel 1 (
        echo [ABORT] No existe %EXPERIENCE%
        popd
        pause
        exit /b 1
    )
    call npm run build > "%LOGDIR%\build.log" 2>&1
    set "BUILD_ERR=!errorlevel!"
    popd
    if not "!BUILD_ERR!"=="0" (
        echo.
        echo [ABORT] Build fallo. Ultimas 25 lineas:
        powershell -Command "Get-Content '%LOGDIR%\build.log' -Tail 25"
        echo.
        echo Log completo en %LOGDIR%\build.log
        echo Stage no se resetea · puedes inspeccionar con `git diff --cached`
        pause
        exit /b 1
    )
    echo Build OK.
) else (
    echo Build skipped por usuario.
)

REM ------------------------------------------------------------
REM  STEP 5 - Confirmar commit message
REM ------------------------------------------------------------
echo.
echo [STEP 5/7] Commit message
echo ------------------------------------------------------------
echo.
set "COMMIT_MSG="
set /p COMMIT_MSG="Escribe commit message (vacio cancela): "
if "!COMMIT_MSG!"=="" (
    echo Sin message. Stage queda intacto. Nada commiteado.
    pause
    exit /b 0
)

echo.
echo Vas a commitear con message:
echo   "!COMMIT_MSG!"
echo.
set "ANSWER="
set /p ANSWER="Confirmar commit? (escribe yes): "
if /i not "!ANSWER!"=="yes" (
    echo Commit cancelado. Stage intacto.
    pause
    exit /b 0
)

REM ------------------------------------------------------------
REM  STEP 6 - Commit
REM ------------------------------------------------------------
echo.
echo [STEP 6/7] git commit
echo ------------------------------------------------------------
git commit -m "!COMMIT_MSG!" > "%LOGDIR%\commit.log" 2>&1
set "COMMIT_ERR=!errorlevel!"
type "%LOGDIR%\commit.log"

if not "!COMMIT_ERR!"=="0" (
    findstr /C:"nothing to commit" "%LOGDIR%\commit.log" >nul
    if not errorlevel 1 (
        echo [SKIP] Nothing to commit - probablemente el stage estaba vacio.
        pause
        exit /b 0
    )
    echo.
    echo [ABORT] git commit fallo. Ver log: %LOGDIR%\commit.log
    pause
    exit /b 1
)
echo Commit OK. SHA:
git log -1 --pretty=format:"%%h %%s"
echo.

REM ------------------------------------------------------------
REM  STEP 7 - NO PUSH · solo imprimir comando
REM ------------------------------------------------------------
echo.
echo ============================================================
echo  READY TO PUSH
echo ============================================================
echo.
echo El commit ya esta hecho localmente. NO se ha pushed a GitHub.
echo.
echo Para pushear, copia y pega en otra PowerShell:
echo.
echo     cd %ROOT%
echo     git push origin master
echo.
echo Antes de pushear, puedes inspeccionar el commit con:
echo.
echo     git show --stat HEAD
echo.
echo Si te arrepientes ANTES del push, desharlo con:
echo.
echo     git reset --soft HEAD~1   (mantiene los cambios staged)
echo     git reset HEAD~1          (mantiene cambios working tree)
echo     git reset --hard HEAD~1   (DESTRUYE cambios · cuidado)
echo.
echo Post-push, verificar Render rebuild en:
echo     https://dashboard.render.com
echo.
echo URLs publicas para verificar tras deploy:
echo     https://kudos-frontend-rsi3.onrender.com/
echo     https://kudos-frontend-rsi3.onrender.com/mapa
echo     https://kudos-frontend-rsi3.onrender.com/aqui
echo     https://kudos-frontend-rsi3.onrender.com/mis-memorias
echo     https://kudos-frontend-rsi3.onrender.com/descubrir
echo.
echo ============================================================
pause
endlocal
exit /b 0
