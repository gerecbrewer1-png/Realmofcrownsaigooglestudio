@echo off
set "PATH=C:\Program Files\Git\cmd;%PATH%"
cd /d "%~dp0"
echo ========================================================
echo Realm of Crowns - Push to GitHub
echo ========================================================
echo Remote: https://github.com/gerecbrewer1-png/realmofcrownsNew.git
echo Branch: main
echo.
git.exe push -u origin main
echo.
pause
