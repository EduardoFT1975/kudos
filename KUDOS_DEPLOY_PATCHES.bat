@echo off
cd /d C:\Users\efert\kudos_project

echo ============================================
echo KUDOS DEPLOY START
echo ============================================

echo.
echo STEP 1 - Install dependency
cd experience
call npm install maplibre-gl
if errorlevel 1 pause & exit /b 1

cd ..

echo.
echo STEP 2 - Git add
git add .
if errorlevel 1 pause & exit /b 1

echo.
echo STEP 3 - Commit
git commit -m "feat(kudos): deploy patches"
echo If nothing to commit, continue...

echo.
echo STEP 4 - Push
git push origin master
if errorlevel 1 pause & exit /b 1

echo.
echo STEP 5 - Done
echo Render will deploy automatically in a few minutes.

pause
